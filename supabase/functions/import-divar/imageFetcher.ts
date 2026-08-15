// Downloads each listing image server-side and hands back base64 bytes.
// This exists specifically because a client-side fetch() straight to
// Divar's image CDN is a cross-origin request Divar has no reason to send
// CORS headers for — the browser silently can't read the response body,
// which is why images previously never made it into the saved property.
// A server-to-server fetch has no such restriction, and it keeps the "never
// let the frontend touch divar.ir directly" rule consistent for images too,
// not just the listing page itself.
//
// Two failure modes turned up in real testing (broken "?" icons in the
// saved property) that weren't visible from parser-only unit tests:
//   1. Image CDNs commonly refuse hotlinked requests that don't look like a
//      real browser loading the referring page — a custom bot User-Agent
//      with no Referer got something back (200 OK), but not the photo.
//   2. Whatever came back was then trusted as-is. A non-image response
//      (an HTML error page, a 1x1 tracking pixel, a CDN placeholder) still
//      produced *some* bytes, which still base64-encoded fine, and only
//      broke once the browser tried to actually decode it as a photo.
// Fixed here: request with headers a real browser would send when loading
// that image from that listing page, and verify the response's own magic
// bytes match a real image format before ever calling it a success.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB per image
const MAX_TOTAL_BYTES = 18 * 1024 * 1024; // overall response budget across all images
const IMAGE_TIMEOUT_MS = 6000;
const MIN_IMAGE_BYTES = 512; // a real photo is never this small — catches 1x1 pixels / empty placeholders

export interface DownloadedImage {
  sourceUrl: string;
  position: number;
  base64: string | null;
  contentType: string | null;
}

// Checks the file's own header bytes rather than trusting a Content-Type
// header, which a misconfigured or deliberately-obstructive CDN can lie
// about just as easily as it can serve the wrong bytes.
function sniffImageType(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  return null;
}

async function downloadOne(sourceUrl: string, position: number, referer: string): Promise<DownloadedImage> {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad protocol");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          // A real browser's User-Agent, and — critically — a Referer
          // pointing back at the listing page itself. Most image CDNs'
          // hotlink protection keys off exactly this pair; without it the
          // request can succeed (200 OK) while returning a placeholder
          // instead of the actual photo.
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept": "image/webp,image/avif,image/jpeg,image/png,image/*,*/*;q=0.8",
          "Referer": referer,
        },
      });
    } finally { clearTimeout(timer); }

    if (!res.ok) return { sourceUrl, position, base64: null, contentType: null };

    const declared = res.headers.get("content-length");
    if (declared && Number(declared) > MAX_IMAGE_BYTES) return { sourceUrl, position, base64: null, contentType: null };

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES || buf.byteLength < MIN_IMAGE_BYTES) return { sourceUrl, position, base64: null, contentType: null };

    // Trust the bytes, not the header — this is what actually catches a
    // mislabeled error page or placeholder before it reaches the client.
    const sniffed = sniffImageType(buf);
    if (!sniffed) return { sourceUrl, position, base64: null, contentType: null };

    // btoa needs a binary string; chunk the conversion so large arrays don't
    // blow the call stack on String.fromCharCode(...spread).
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    return { sourceUrl, position, base64: btoa(binary), contentType: sniffed };
  } catch {
    // One bad image (timeout, DNS failure, non-image content) never fails
    // the whole import — it just comes back with base64: null and the
    // client shows that single slot as unavailable.
    return { sourceUrl, position, base64: null, contentType: null };
  }
}

export async function downloadImages(sourceUrls: { sourceUrl: string; position: number }[], listingUrl: string): Promise<DownloadedImage[]> {
  const results: DownloadedImage[] = [];
  let totalBytes = 0;
  // Sequential, not Promise.all: keeps a hard cap on total response size
  // predictable, and keeps this function from opening a dozen outbound
  // connections at once for a single import click.
  for (const { sourceUrl, position } of sourceUrls) {
    if (totalBytes >= MAX_TOTAL_BYTES) {
      results.push({ sourceUrl, position, base64: null, contentType: null });
      continue;
    }
    const img = await downloadOne(sourceUrl, position, listingUrl);
    if (img.base64) totalBytes += img.base64.length * 0.75; // rough decoded-byte estimate
    results.push(img);
  }
  return results;
}
