// Collects every plausible listing-photo URL from the page, from as many
// sources as the page actually offers, then groups variants of the SAME
// photo together and ranks them best-quality-first.
//
// Why grouping+ranking rather than plain dedupe: a listing page carries the
// same photo set in several places at once (JSON-LD, og:image meta tags,
// hydration JSON, <img> tags, srcset, inline JSON strings), and those
// sources do NOT agree on resolution. og:image typically only covers the
// first photo or two at full size, while the <img>/srcset sweep that finds
// photos 3..N tends to yield the small gallery thumbnails. The previous
// version deduped by "first URL seen wins," so photos 1–2 landed on the
// big og:image variant and everything after it silently locked in a
// thumbnail — the exact "first two are sharp, rest are tiny" symptom.
//
// Now: every variant is kept, keyed by a photo identity derived from the
// URL, and each group is sorted by a quality score. The fetcher gets the
// whole ranked list and walks it until one actually downloads, so a
// guessed-bigger URL that 404s falls back to a real one instead of
// producing a broken slot.
import type { ExtractedImage } from "./types.ts";

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

interface Candidate { url: string; sourceRank: number; width: number | null }

// Lower sourceRank = more trustworthy for full resolution.
const SRC_JSONLD = 0, SRC_META = 1, SRC_JSON = 2, SRC_IMG = 3, SRC_BARE = 4;

// ---------- source 1: JSON-LD ----------
function fromJsonLd(html: string): Candidate[] {
  const out: Candidate[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const blocks = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      for (const b of blocks) {
        const img = b?.image;
        if (!img) continue;
        const push = (u: string) => out.push({ url: u, sourceRank: SRC_JSONLD, width: null });
        if (Array.isArray(img)) {
          for (const x of img) {
            if (typeof x === "string") push(x);
            else if (typeof x?.url === "string") push(x.url);
          }
        } else if (typeof img === "string") push(img);
        else if (typeof img?.url === "string") push(img.url);
      }
    } catch { /* malformed block — skip it */ }
  }
  return out;
}

// ---------- source 2: ALL Open Graph / meta image tags ----------
function fromMetaTags(html: string): Candidate[] {
  const out: Candidate[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']*)["']/gi,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image(?::url)?["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) out.push({ url: decodeEntities(m[1]), sourceRank: SRC_META, width: null });
  }
  return out;
}

// ---------- source 3: embedded hydration JSON ----------
// deno-lint-ignore no-explicit-any
function extractEmbeddedJsonBlobs(html: string): any[] {
  // deno-lint-ignore no-explicit-any
  const blobs: any[] = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    const body = m[1].trim();
    if (!body || (body[0] !== "{" && body[0] !== "[")) continue;
    if (body.length > 2_000_000) continue;
    try { blobs.push(JSON.parse(body)); } catch { /* skip */ }
  }
  const assignRe = /window\.__[A-Z0-9_]+__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/g;
  while ((m = assignRe.exec(html))) {
    try { blobs.push(JSON.parse(m[1])); } catch { /* skip */ }
  }
  return blobs;
}

// deno-lint-ignore no-explicit-any
function walkForImageUrls(node: any, depth: number, out: Candidate[]): void {
  if (!node || depth > 8 || out.length > 800) return;
  if (typeof node === "string") return;
  if (Array.isArray(node)) { for (const item of node) walkForImageUrls(item, depth + 1, out); return; }
  if (typeof node !== "object") return;
  for (const [key, val] of Object.entries(node)) {
    if (typeof val === "string" && /image|photo|picture|thumbnail|src/i.test(key) && /^https?:\/\//.test(val)) {
      // A key literally named "thumbnail" is self-declaring low quality —
      // still collected (it may be the only variant that exists) but ranked
      // below anything else from the same blob.
      const isThumbKey = /thumb/i.test(key);
      out.push({ url: val, sourceRank: isThumbKey ? SRC_BARE : SRC_JSON, width: null });
    } else if (typeof val === "object") {
      walkForImageUrls(val, depth + 1, out);
    }
  }
}
function fromEmbeddedJson(html: string): Candidate[] {
  const out: Candidate[] = [];
  for (const blob of extractEmbeddedJsonBlobs(html)) walkForImageUrls(blob, 0, out);
  return out;
}

// ---------- source 4: <img> tags + srcset ----------
function fromImgTags(html: string): Candidate[] {
  const out: Candidate[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ url: decodeEntities(m[1]), sourceRank: SRC_IMG, width: null });

  // srcset carries multiple resolutions of the same photo, each tagged with
  // its width ("... 1080w"). That width is the single most reliable quality
  // signal on the whole page, so it's parsed and kept rather than discarded
  // as the previous version did.
  const srcsetRe = /<img[^>]+srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html))) {
    for (const part of m[1].split(",")) {
      const bits = part.trim().split(/\s+/);
      const url = bits[0];
      if (!url) continue;
      const wMatch = (bits[1] || "").match(/^(\d+)w$/);
      out.push({ url: decodeEntities(url), sourceRank: SRC_IMG, width: wMatch ? Number(wMatch[1]) : null });
    }
  }
  return out;
}

// ---------- source 5: bare CDN-looking URLs ----------
function fromBareUrls(html: string): Candidate[] {
  const re = /https?:\/\/[^\s"'\\<>)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'\\<>)]*)?/gi;
  return (html.match(re) || []).map((url) => ({ url, sourceRank: SRC_BARE, width: null }));
}

// ---------- filtering ----------
const NON_LISTING_PATTERN = /logo|favicon|icon-|sprite|avatar|placeholder|apple-touch|manifest|badge|button|social[-_]|share[-_]icon|loading|spinner/i;

function looksLikeListingPhoto(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (NON_LISTING_PATTERN.test(url)) return false;
  return true;
}

// Two URLs pointing at the same photo at different sizes must collapse to
// the same key so their variants compete instead of being treated as two
// separate photos. Size hints (query params, /400x300/ segments, /thumb/
// path parts, trailing _400 suffixes) are exactly what differs between
// those variants, so they're what gets stripped to form the key. The key is
// used ONLY for grouping — never as a URL to fetch, which is the mistake
// the previous version made when it rewrote paths that may not exist.
function identityKey(raw: string): string {
  try {
    const url = new URL(raw);
    for (const p of ["w", "width", "h", "height", "size", "resize", "quality", "q", "fit", "crop", "dpr"]) url.searchParams.delete(p);
    let path = url.pathname
      .replace(/\/(?:thumb|thumbs|thumbnail|thumbnails|small|medium|preview|resized?)\//gi, "/")
      .replace(/\/\d{2,4}x\d{2,4}\//g, "/")
      .replace(/[_-](?:thumb|small|medium|preview)(?=\.[a-z]{3,4}$)/i, "")
      .replace(/[_-]\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, "")
      .replace(/[_-]\d{3,4}(?=\.[a-z]{3,4}$)/i, "");
    // Host is deliberately excluded from the key: the same photo is commonly
    // served from numbered CDN shards (s100/s101/…) and those are the same
    // image, not two different ones.
    path = path.replace(/^\/+/, "");
    return path + url.search;
  } catch { return raw; }
}

// Explicit size markers in the URL are a strong quality signal even without
// a srcset width to read.
function pathQualityBonus(url: string): number {
  let s = 0;
  if (/\/(?:thumb|thumbs|thumbnail|thumbnails|small|preview)\//i.test(url)) s -= 40;
  if (/[_-](?:thumb|small|preview)\.[a-z]{3,4}(?:\?|$)/i.test(url)) s -= 40;
  if (/\/(?:original|full|large|hd)\//i.test(url)) s += 30;
  const dim = url.match(/\/(\d{2,4})x(\d{2,4})\//);
  if (dim) s += Math.min(Number(dim[1]), 2000) / 100;
  return s;
}

function score(c: Candidate): number {
  // srcset width, when present, outranks everything else — it's a fact the
  // page stated about this exact URL rather than an inference.
  const widthScore = c.width ? Math.min(c.width, 4000) / 10 : 0;
  const sourceScore = (SRC_BARE - c.sourceRank) * 12;
  return widthScore + sourceScore + pathQualityBonus(c.url);
}

export function collectImages(html: string): { images: ExtractedImage[]; debug: { candidates: number; unique: number; filtered: number } } {
  const raw = [
    ...fromJsonLd(html),
    ...fromMetaTags(html),
    ...fromEmbeddedJson(html),
    ...fromImgTags(html),
    ...fromBareUrls(html),
  ].filter((c) => c.url && looksLikeListingPhoto(c.url));

  const candidates = raw.length;

  // Group every variant under its photo identity, preserving the order each
  // distinct photo was first encountered so gallery order still matches the
  // page.
  const groups = new Map<string, Candidate[]>();
  const order: string[] = [];
  for (const c of raw) {
    const key = identityKey(c.url);
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(c);
  }

  const images: ExtractedImage[] = [];
  for (const key of order) {
    if (images.length >= 24) break;
    const variants = groups.get(key)!;
    // Best first, de-duplicating identical URLs within the group so the
    // fetcher never retries the exact same address twice.
    const ranked = [...variants].sort((a, b) => score(b) - score(a));
    const seenUrls = new Set<string>();
    const urls: string[] = [];
    for (const v of ranked) {
      if (seenUrls.has(v.url)) continue;
      seenUrls.add(v.url);
      urls.push(v.url);
      if (urls.length >= 4) break; // a handful of fallbacks is plenty
    }
    images.push({ sourceUrl: urls[0], candidates: urls, position: images.length });
  }

  return { images, debug: { candidates, unique: order.length, filtered: candidates - order.length } };
}
