// Owns the one and only network call to the outside world in this whole
// pipeline. The frontend never touches divar.ir directly — this is the sole
// chokepoint, so every safety rule lives in exactly one place.
import { ImportError } from "./types.ts";

const ALLOWED_HOST = "divar.ir";
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB — a listing page has no business being bigger than this

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h === "0.0.0.0") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata range
  }
  return false;
}

// Only https://divar.ir/v/... (or a subdomain) listing links are accepted —
// not search pages, not the homepage, not arbitrary hosts. This is the SSRF
// boundary: nothing downstream ever sees a URL that didn't pass this.
export function validateListingUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ImportError("LINK_INVALID", "malformed url"); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ImportError("LINK_INVALID", "bad protocol");
  const host = url.hostname.toLowerCase();
  if (host !== ALLOWED_HOST && !host.endsWith("." + ALLOWED_HOST)) throw new ImportError("LINK_INVALID", "host not allowed");
  if (isPrivateOrLocalHost(host)) throw new ImportError("LINK_INVALID", "private host");
  if (!/^\/v\//.test(url.pathname)) throw new ImportError("LINK_INVALID", "not a listing path");
  return url;
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

export async function fetchListingHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = validateListingUrl(rawUrl);
  let redirects = 0;

  // deno-lint-ignore no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Identifies the request honestly rather than spoofing a browser —
          // this is a single on-demand fetch triggered by a person importing
          // their own listing, not a crawler, and it should look like one.
          "User-Agent": "Mozilla/5.0 (compatible; FloraCRM-Importer/1.0; +https://flora-crm.app/bot)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.5",
        },
      });
    } catch (e) {
      clearTimeout(timer);
      throw new ImportError("PAGE_NOT_ACCESSIBLE", (e as Error).name === "AbortError" ? "timeout" : String(e));
    }
    clearTimeout(timer);

    if (res.status === 429) throw new ImportError("RATE_LIMITED", "429 from source");
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc || redirects >= MAX_REDIRECTS) throw new ImportError("PAGE_NOT_ACCESSIBLE", "too many redirects");
      let nextUrl: URL;
      try { nextUrl = new URL(loc, currentUrl); } catch { throw new ImportError("PAGE_NOT_ACCESSIBLE", "bad redirect target"); }
      // Re-validate after every hop — a redirect is exactly how naive SSRF
      // guards get bypassed (allow the first host, follow a 302 anywhere).
      currentUrl = validateListingUrl(nextUrl.toString());
      redirects++;
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new ImportError("PAGE_NOT_ACCESSIBLE", `blocked (${res.status})`);
    if (res.status === 404 || res.status === 410) throw new ImportError("PAGE_NOT_ACCESSIBLE", "listing gone");
    if (!res.ok) throw new ImportError("PAGE_NOT_ACCESSIBLE", `http ${res.status}`);

    const declaredLength = res.headers.get("content-length");
    if (declaredLength && Number(declaredLength) > MAX_BYTES) throw new ImportError("PAGE_NOT_ACCESSIBLE", "response too large");

    const reader = res.body?.getReader();
    if (!reader) throw new ImportError("PAGE_NOT_ACCESSIBLE", "no body");
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      // Hard cap enforced on the actual bytes read, not just the declared
      // header — a server can lie about content-length.
      if (received > MAX_BYTES) { reader.cancel(); throw new ImportError("PAGE_NOT_ACCESSIBLE", "response exceeded size limit"); }
      chunks.push(value);
    }
    const html = new TextDecoder("utf-8").decode(concatChunks(chunks));
    return { html, finalUrl: currentUrl.toString() };
  }
}
