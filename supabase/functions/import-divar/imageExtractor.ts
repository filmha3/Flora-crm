// Collects every plausible listing-photo URL from the page, from as many
// sources as the page actually offers, then narrows that list down.
// This exists as its own module (separate from parser.ts's text-field
// extraction) because "only the first photo got saved" turned out to be a
// real bug: the previous code called a single-match og:image reader and
// took only the first array entry from a couple of JSON shapes. A listing
// page can carry the same photo set in five different places at once
// (JSON-LD, repeated <meta property="og:image">, hydration JSON, plain
// <img> tags, inline JSON strings) — missing any one of them silently
// under-collects, so every source below is additive, not a fallback chain.
import type { ExtractedImage } from "./types.ts";

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

// ---------- source 1: JSON-LD ----------
function fromJsonLd(html: string): string[] {
  const urls: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const blocks = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      for (const b of blocks) {
        const img = b?.image;
        if (!img) continue;
        if (Array.isArray(img)) urls.push(...img.filter((x) => typeof x === "string"));
        else if (typeof img === "string") urls.push(img);
        else if (typeof img?.url === "string") urls.push(img.url);
      }
    } catch { /* malformed block — skip it */ }
  }
  return urls;
}

// ---------- source 2: ALL Open Graph / meta image tags, not just the first ----------
function fromMetaTags(html: string): string[] {
  const urls: string[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']*)["']/gi,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image(?::url)?["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) urls.push(decodeEntities(m[1]));
  }
  return urls;
}

// ---------- source 3: embedded hydration JSON (broader than just
// __NEXT_DATA__ — any inline JSON blob), searched recursively for ANY key
// that looks image-related rather than requiring an exact "images" key. ----------
function extractEmbeddedJsonBlobs(html: string): any[] {
  const blobs: any[] = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    const body = m[1].trim();
    if (!body || (body[0] !== "{" && body[0] !== "[")) continue;
    if (body.length > 2_000_000) continue; // skip absurdly large blobs, not worth walking
    try { blobs.push(JSON.parse(body)); } catch { /* not a clean JSON script tag — skip */ }
  }
  // Also catches the common `window.__SOMETHING__ = {...};` inline-assignment
  // pattern frameworks other than Next.js use for hydration data.
  const assignRe = /window\.__[A-Z0-9_]+__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/g;
  while ((m = assignRe.exec(html))) {
    try { blobs.push(JSON.parse(m[1])); } catch { /* skip */ }
  }
  return blobs;
}

function walkForImageUrls(node: any, depth: number, out: string[]): void {
  if (!node || depth > 8 || out.length > 500) return;
  if (typeof node === "string") return;
  if (Array.isArray(node)) { for (const item of node) walkForImageUrls(item, depth + 1, out); return; }
  if (typeof node !== "object") return;
  for (const [key, val] of Object.entries(node)) {
    if (typeof val === "string" && /image|photo|picture|thumbnail/i.test(key) && /^https?:\/\//.test(val)) {
      out.push(val);
    } else if (typeof val === "object") {
      walkForImageUrls(val, depth + 1, out);
    }
  }
}
function fromEmbeddedJson(html: string): string[] {
  const out: string[] = [];
  for (const blob of extractEmbeddedJsonBlobs(html)) walkForImageUrls(blob, 0, out);
  return out;
}

// ---------- source 4: plain <img> tags anywhere in the rendered HTML ----------
function fromImgTags(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) urls.push(decodeEntities(m[1]));
  // srcset carries multiple resolutions of the same photo in one attribute
  const srcsetRe = /<img[^>]+srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html))) {
    for (const part of m[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url) urls.push(decodeEntities(url));
    }
  }
  return urls;
}

// ---------- source 5: bare CDN-looking URLs anywhere in the raw HTML text,
// as a last-resort net for image references JSON/tag parsing didn't catch. ----------
function fromBareUrls(html: string): string[] {
  const re = /https?:\/\/[^\s"'\\<>)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'\\<>)]*)?/gi;
  return html.match(re) || [];
}

// ---------- filtering: drop obvious non-listing assets (logos, icons,
// avatars, UI chrome) that a broad scan like fromBareUrls/fromImgTags will
// otherwise happily include. ----------
const NON_LISTING_PATTERN = /logo|favicon|icon-|sprite|avatar|placeholder|apple-touch|manifest|badge|button|social[-_]|share[-_]icon|loading|spinner/i;

function looksLikeListingPhoto(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (NON_LISTING_PATTERN.test(url)) return false;
  return true;
}

// Divar's own thumbnail service (and most image CDNs) encode the requested
// size either as a query param or a path segment; stripping the common ones
// collapses "thumb of X" and "original of X" down to the same URL, which
// both dedupes them and — per spec — prefers the fuller-size variant since
// what's left after stripping is normally the canonical asset path.
function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const p of ["w", "width", "h", "height", "size", "resize", "quality", "q"]) url.searchParams.delete(p);
    url.pathname = url.pathname
      .replace(/\/(?:thumb|thumbnail|small|preview)\//gi, "/")
      .replace(/\/\d{2,4}x\d{2,4}\//g, "/");
    return url.toString();
  } catch { return raw; }
}

export function collectImages(html: string): { images: ExtractedImage[]; debug: { candidates: number; unique: number; filtered: number } } {
  const raw = [
    ...fromJsonLd(html),
    ...fromMetaTags(html),
    ...fromEmbeddedJson(html),
    ...fromImgTags(html),
    ...fromBareUrls(html),
  ].filter(Boolean);

  const candidates = raw.length;

  const normalized = raw.map(normalizeUrl);
  const seen = new Set<string>();
  const uniqueOrdered: string[] = [];
  for (const url of normalized) {
    if (!seen.has(url)) { seen.add(url); uniqueOrdered.push(url); }
  }
  const unique = uniqueOrdered.length;

  const kept = uniqueOrdered.filter(looksLikeListingPhoto);
  const filtered = unique - kept.length;

  const images: ExtractedImage[] = kept.slice(0, 24).map((sourceUrl, position) => ({ sourceUrl, position }));
  return { images, debug: { candidates, unique, filtered } };
}
