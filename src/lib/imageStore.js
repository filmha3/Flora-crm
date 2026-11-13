// Central image storage service for property photos.
//
// Architecture: the database (flora_data's media[] entries) never holds
// pixel data — only { storagePath, thumbnailPath, width, height, sortOrder }.
// Actual bytes live in the private Supabase Storage bucket "property-photos",
// under {authUserId}/{propertyId}/{uuid}.webp — the same {uid}/... convention
// already used by the "backups" bucket, which is what its RLS policies key
// off (see the create_property_photos_bucket migration): a user can only
// ever read/write objects under their own uid folder, so one agent's photos
// are structurally invisible to any other account, full stop.
//
// Every property-photo upload, download, and delete in the app goes through
// this one file — nowhere else should call supabase.storage.from("property-photos")
// directly, so the path convention only ever has to be right in one place.
import { supabase } from "./supabaseClient.js";
import { uid } from "./format.js";

export const BUCKET = "property-photos";
// Two copies of every photo, each tuned for where it's shown:
//  • FULL  — what the public site shows edge-to-edge. 2048px WebP @0.86 is
//    visually identical to the old 2560px on phones/retina laptops but ~35%
//    smaller, so it uploads much faster.
//  • THUMB — what the agent CRM shows everywhere (lists, hero, lightbox
//    preview). Small and heavily compressed so the CRM stays fast.
const FULL_MAX_DIM = 2048, FULL_QUALITY = 0.86;
const THUMB_MAX_DIM = 720, THUMB_QUALITY = 0.7;
// How many photos are processed/uploaded at once. Decoding ten 12MP phone
// photos at the same time stalls a phone (memory + CPU); 3 in flight keeps
// the network busy without freezing the page.
const UPLOAD_CONCURRENCY = 3;

let _webpOk = null;
function supportsWebp() {
  if (_webpOk !== null) return _webpOk;
  try {
    const c = document.createElement("canvas"); c.width = 1; c.height = 1;
    _webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { _webpOk = false; }
  return _webpOk;
}

// Decodes a File/Blob/data-URL into something drawable, via an object URL —
// never the old FileReader → base64 round-trip, which tripled memory use and
// was the main reason big photos uploaded slowly. (A plain <img> is used on
// purpose rather than createImageBitmap: older iOS Safari ignores EXIF
// rotation in ImageBitmap, which would upload iPhone photos sideways.)
export async function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
    img.onload = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); resolve(img); };
    img.onerror = (e) => { if (objectUrl) URL.revokeObjectURL(objectUrl); reject(e); };
    img.src = objectUrl || source;
  });
}

function drawScaled(src, maxDim) {
  const sw = src.width, sh = src.height;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  const mime = supportsWebp() ? "image/webp" : "image/jpeg";
  const q = supportsWebp() ? quality : Math.min(0.92, quality + 0.06);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob, width: canvas.width, height: canvas.height, mime }), mime, q);
  });
}

// Canvas re-encode is also where EXIF/GPS metadata quietly disappears —
// canvas.drawImage only ever copies pixels, never the source's metadata.
export function encodeCanvas(img, maxDim, quality) {
  return canvasToBlob(drawScaled(img, maxDim), quality);
}

export function extFor(mime) { return mime === "image/webp" ? "webp" : "jpg"; }

// Uploads one photo (File, Blob, or legacy base64 data URL) as a full-size +
// thumbnail pair and returns the metadata row to store on the property —
// never the pixels themselves. Callers catch per-item so one bad photo in a
// multi-select doesn't take the rest of the upload down with it.
export async function uploadPropertyImage({ userId, propertyId, source, name, sortOrder }) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("برای آپلود عکس به اینترنت نیاز داری — دوباره وصل شو و امتحان کن.");
  if (!userId) throw new Error("uploadPropertyImage: missing userId");
  if (!propertyId) throw new Error("uploadPropertyImage: missing propertyId");
  const img = await loadImage(source);
  // Thumbnail is drawn from the already-downscaled full canvas, not the
  // original 12MP photo — much less work for the same result.
  const fullCanvas = drawScaled(img, FULL_MAX_DIM);
  const thumbCanvas = drawScaled(fullCanvas, THUMB_MAX_DIM);
  const [full, thumb] = await Promise.all([canvasToBlob(fullCanvas, FULL_QUALITY), canvasToBlob(thumbCanvas, THUMB_QUALITY)]);
  fullCanvas.width = fullCanvas.height = 0; thumbCanvas.width = thumbCanvas.height = 0;

  const fileId = uid();
  const base = `${userId}/${propertyId}/${fileId}`;
  const storagePath = `${base}.${extFor(full.mime)}`;
  const thumbnailPath = `${base}_thumb.${extFor(thumb.mime)}`;
  const store = supabase.storage.from(BUCKET);
  const opts = (mime) => ({ contentType: mime, upsert: false, cacheControl: "31536000" });

  // Both copies go up in parallel (they used to go one after the other).
  const [fullRes, thumbRes] = await Promise.all([
    store.upload(storagePath, full.blob, opts(full.mime)),
    store.upload(thumbnailPath, thumb.blob, opts(thumb.mime)),
  ]);
  if (fullRes.error || thumbRes.error) {
    // Never leave half a pair behind — roll back whichever one landed.
    const landed = [!fullRes.error && storagePath, !thumbRes.error && thumbnailPath].filter(Boolean);
    if (landed.length) await store.remove(landed).catch(() => {});
    throw fullRes.error || thumbRes.error;
  }
  // The agent's CRM shows the thumbnail — prime the cache with the bytes we
  // already have so the new photo appears instantly, no re-download.
  primeCache(thumbnailPath, thumb.blob);

  return {
    id: fileId, type: "image", storagePath, thumbnailPath,
    width: full.width, height: full.height, sortOrder: sortOrder ?? 0, name: name || "",
  };
}

// Uploads a batch of new File objects (from a multi-select <input>), at most
// UPLOAD_CONCURRENCY at a time. Per-item failures are reported back in
// `failed` instead of rejecting the whole batch.
export async function uploadPropertyImageBatch({ userId, propertyId, files, startSortOrder = 0, onProgress }) {
  const items = [];
  const failed = [];
  const list = Array.from(files);
  let next = 0, done = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      const file = list[i];
      try {
        items.push(await uploadPropertyImage({ userId, propertyId, source: file, name: file.name, sortOrder: startSortOrder + i }));
      } catch (e) {
        failed.push({ name: file.name, error: e?.message || String(e) });
      }
      done++;
      try { onProgress?.(done, list.length); } catch (e) { /* ignore */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, list.length) }, worker));
  items.sort((a, b) => a.sortOrder - b.sortOrder);
  return { items, failed };
}

// One-time migration path for photos saved before this architecture existed
// (property.media items whose `.url` is a base64 data URL). Leaves the
// original item completely untouched on any failure — the old base64 photo
// keeps showing exactly as it did before, nothing is ever deleted here.
export async function migrateLegacyMediaItem({ userId, propertyId, item, sortOrder }) {
  if (item.type !== "image" || item.external || item.storagePath || !item.url) return item;
  try {
    const uploaded = await uploadPropertyImage({ userId, propertyId, source: item.url, name: item.name, sortOrder: sortOrder ?? item.sortOrder ?? 0 });
    return uploaded;
  } catch (e) {
    return item; // unchanged — still displays via its base64 url as before
  }
}

// ---------- Reading ----------
// The bucket is private, so a plain public URL won't work — .download()
// goes through the same RLS-checked, authenticated request as any other
// Supabase call and hands back real bytes. Object URLs are cached so the
// same path isn't re-downloaded every time a component re-renders; capped
// so a long scrolling session doesn't leak memory indefinitely.
const urlCache = new Map(); // path -> objectURL
const CACHE_CAP = 120;
function primeCache(path, blob) {
  if (!path || !blob || urlCache.has(path)) return;
  if (urlCache.size >= CACHE_CAP) {
    const oldestKey = urlCache.keys().next().value;
    URL.revokeObjectURL(urlCache.get(oldestKey));
    urlCache.delete(oldestKey);
  }
  urlCache.set(path, URL.createObjectURL(blob));
}
// De-duplicates simultaneous requests for the same photo (e.g. the same
// thumbnail rendered in a list and in the hero at once).
const inflight = new Map();
export async function getImageObjectUrl(path) {
  if (!path) return null;
  if (urlCache.has(path)) return urlCache.get(path);
  if (inflight.has(path)) return inflight.get(path);
  const job = (async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) throw error || new Error("download failed");
    primeCache(path, data);
    return urlCache.get(path);
  })().finally(() => inflight.delete(path));
  inflight.set(path, job);
  return job;
}

// ---------- Deleting ----------
export async function deletePropertyPhotoPaths(paths) {
  const clean = paths.filter(Boolean);
  if (!clean.length) return;
  for (const p of clean) { if (urlCache.has(p)) { URL.revokeObjectURL(urlCache.get(p)); urlCache.delete(p); } }
  await supabase.storage.from(BUCKET).remove(clean).catch(() => {});
}

// Removing a property should take its whole photo folder with it — listing
// then removing, since Storage has no "delete by prefix" call of its own.
export async function deletePropertyFolder({ userId, propertyId }) {
  if (!userId || !propertyId) return;
  const prefix = `${userId}/${propertyId}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !data?.length) return;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  await deletePropertyPhotoPaths(paths);
}
