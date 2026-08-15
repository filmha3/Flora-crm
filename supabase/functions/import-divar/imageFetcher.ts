// Downloads each listing image server-side and hands back base64 bytes.
// This exists specifically because a client-side fetch() straight to
// Divar's image CDN is a cross-origin request Divar has no reason to send
// CORS headers for — the browser silently can't read the response body,
// which is why images previously never made it into the saved property.
// A server-to-server fetch has no such restriction, and it keeps the "never
// let the frontend touch divar.ir directly" rule consistent for images too,
// not just the listing page itself.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB per image
const MAX_TOTAL_BYTES = 18 * 1024 * 1024; // overall response budget across all images
const IMAGE_TIMEOUT_MS = 6000;

export interface DownloadedImage {
  sourceUrl: string;
  position: number;
  base64: string | null;
  contentType: string | null;
}

async function downloadOne(sourceUrl: string, position: number): Promise<DownloadedImage> {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad protocol");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FloraCRM-Importer/1.0; +https://flora-crm.app/bot)" },
      });
    } finally { clearTimeout(timer); }

    if (!res.ok) return { sourceUrl, position, base64: null, contentType: null };
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return { sourceUrl, position, base64: null, contentType: null };

    const declared = res.headers.get("content-length");
    if (declared && Number(declared) > MAX_IMAGE_BYTES) return { sourceUrl, position, base64: null, contentType: null };

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) return { sourceUrl, position, base64: null, contentType: null };

    // btoa needs a binary string; chunk the conversion so large arrays don't
    // blow the call stack on String.fromCharCode(...spread).
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    return { sourceUrl, position, base64: btoa(binary), contentType };
  } catch {
    // One bad image (timeout, DNS failure, non-image content) never fails
    // the whole import — it just comes back with base64: null and the
    // client shows that single slot as unavailable.
    return { sourceUrl, position, base64: null, contentType: null };
  }
}

export async function downloadImages(sourceUrls: { sourceUrl: string; position: number }[]): Promise<DownloadedImage[]> {
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
    const img = await downloadOne(sourceUrl, position);
    if (img.base64) totalBytes += img.base64.length * 0.75; // rough decoded-byte estimate
    results.push(img);
  }
  return results;
}
