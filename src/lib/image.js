import { uid } from "./format.js";

// Phone photos are 3-8MB each. Storing them raw made IndexedDB huge and every save slow,
// so images are downscaled to <=1280px and re-encoded as JPEG before they're ever saved.
const MAX_IMAGE_DIM = 1280, IMAGE_QUALITY = 0.72;
// iOS Safari accepts canvas.toDataURL("image/webp",...) without throwing, but silently
// returns a PNG instead of encoding — so testing once here is the only reliable way to
// know if WebP will actually work. When it won't, fall back to a tighter JPEG so photos
// still shrink instead of silently staying full-size.
let _webpOk = null;
const supportsWebp = () => {
  if (_webpOk !== null) return _webpOk;
  try {
    const c = document.createElement("canvas"); c.width = 1; c.height = 1;
    _webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { _webpOk = false; }
  return _webpOk;
};
const FALLBACK_DIM = 1280, FALLBACK_QUALITY = 0.78; // used only when WebP isn't actually supported
const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const webpOk = supportsWebp();
      const maxDim = webpOk ? MAX_IMAGE_DIM : FALLBACK_DIM;
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      try {
        resolve(webpOk ? canvas.toDataURL("image/webp", IMAGE_QUALITY) : canvas.toDataURL("image/jpeg", FALLBACK_QUALITY));
      }
      catch { resolve(reader.result); }
    };
    img.onerror = () => resolve(reader.result);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
// Re-encodes an image already stored as a data URL (jpeg/png) into WebP —
// used to bulk-shrink photos uploaded before WebP was the default.
// Re-shrinks a photo already stored as a data URL. Where WebP encoding actually
// works, it re-encodes to WebP. Where it doesn't (iOS Safari silently no-ops),
// it recompresses to a smaller, tighter JPEG instead — so the size drops either way.
const reencodeToWebp = (dataUrl) => new Promise((resolve) => {
  if (!dataUrl) return resolve(dataUrl);
  const webpOk = supportsWebp();
  if (webpOk && dataUrl.startsWith("data:image/webp")) return resolve(dataUrl); // already optimal
  const img = new Image();
  img.onload = () => {
    const maxDim = webpOk ? MAX_IMAGE_DIM : FALLBACK_DIM;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    try {
      resolve(webpOk ? canvas.toDataURL("image/webp", IMAGE_QUALITY) : canvas.toDataURL("image/jpeg", FALLBACK_QUALITY));
    } catch { resolve(dataUrl); }
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});
const filesToMedia = (fileList) => Promise.all(Array.from(fileList).map(async (file) => {
  const isVideo = file.type.startsWith("video");
  const isImage = file.type.startsWith("image");
  if (isVideo) {
    const url = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
    return { id: uid(), type: "video", url, name: file.name };
  }
  if (isImage) return { id: uid(), type: "image", url: await compressImage(file), name: file.name };
  // Documents (PDF, Word, etc.) — stored as-is, no image compression pipeline applies.
  const url = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
  return { id: uid(), type: "file", url, name: file.name };
}));

export { MAX_IMAGE_DIM, IMAGE_QUALITY, supportsWebp, FALLBACK_DIM, FALLBACK_QUALITY, compressImage, reencodeToWebp, filesToMedia };
