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
const FULL_MAX_DIM = 1600, FULL_QUALITY = 0.78;
const THUMB_MAX_DIM = 360, THUMB_QUALITY = 0.68;

let _webpOk = null;
function supportsWebp() {
  if (_webpOk !== null) return _webpOk;
  try {
    const c = document.createElement("canvas"); c.width = 1; c.height = 1;
    _webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { _webpOk = false; }
  return _webpOk;
}

// Loads a File/Blob/base64-data-URL into an <img>, regardless of which of
// those three shapes it arrived as — new uploads from an <input> are
// File objects, legacy property.media items being migrated are data URLs.
export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (typeof source === "string") { img.src = source; return; }
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    reader.readAsDataURL(source);
  });
}

// Canvas re-encode is also where EXIF/GPS metadata quietly disappears —
// canvas.drawImage only ever copies pixels, never the source's metadata
// blocks, so this step doubles as "strip unnecessary metadata" for free.
export function encodeCanvas(img, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  const mime = supportsWebp() ? "image/webp" : "image/jpeg";
  const q = supportsWebp() ? quality : Math.min(0.85, quality + 0.1);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob, width, height, mime }), mime, q);
  });
}

export function extFor(mime) { return mime === "image/webp" ? "webp" : "jpg"; }

// Uploads one photo (File, Blob, or legacy base64 data URL) as a full-size +
// thumbnail pair and returns the metadata row to store on the property —
// never the pixels themselves. Never throws into the caller's batch loop
// silently: callers should catch per-item so one bad photo in a multi-select
// doesn't take the rest of the upload down with it (requirement: a failed
// upload must not corrupt the property).
export async function uploadPropertyImage({ userId, propertyId, source, name, sortOrder }) {
  if (!userId) throw new Error("uploadPropertyImage: missing userId");
  if (!propertyId) throw new Error("uploadPropertyImage: missing propertyId");
  const img = await loadImage(source);
  const [full, thumb] = await Promise.all([
    encodeCanvas(img, FULL_MAX_DIM, FULL_QUALITY),
    encodeCanvas(img, THUMB_MAX_DIM, THUMB_QUALITY),
  ]);
  const fileId = uid();
  const base = `${userId}/${propertyId}/${fileId}`;
  const storagePath = `${base}.${extFor(full.mime)}`;
  const thumbnailPath = `${base}_thumb.${extFor(thumb.mime)}`;

  const { error: fullErr } = await supabase.storage.from(BUCKET).upload(storagePath, full.blob, { contentType: full.mime, upsert: false });
  if (fullErr) throw fullErr;
  const { error: thumbErr } = await supabase.storage.from(BUCKET).upload(thumbnailPath, thumb.blob, { contentType: thumb.mime, upsert: false });
  if (thumbErr) {
    // Full image made it up but the thumbnail didn't — don't leave an
    // orphaned full-res object with no matching thumb; roll it back and
    // surface the failure so the caller can retry/skip cleanly.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw thumbErr;
  }

  return {
    id: fileId, type: "image", storagePath, thumbnailPath,
    width: full.width, height: full.height, sortOrder: sortOrder ?? 0, name: name || "",
  };
}

// Uploads a batch of new File objects (from a multi-select <input>).
// Per-item failures are swallowed and reported back in `failed` instead of
// rejecting the whole batch — an interrupted/failed upload must never take
// down the ones that already succeeded, nor corrupt the property being edited.
export async function uploadPropertyImageBatch({ userId, propertyId, files, startSortOrder = 0 }) {
  const items = [];
  const failed = [];
  const list = Array.from(files);
  await Promise.all(list.map(async (file, i) => {
    try {
      items.push(await uploadPropertyImage({ userId, propertyId, source: file, name: file.name, sortOrder: startSortOrder + i }));
    } catch (e) {
      failed.push({ name: file.name, error: e?.message || String(e) });
    }
  }));
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
export async function getImageObjectUrl(path) {
  if (!path) return null;
  if (urlCache.has(path)) return urlCache.get(path);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw error || new Error("download failed");
  const objectUrl = URL.createObjectURL(data);
  if (urlCache.size >= CACHE_CAP) {
    const oldestKey = urlCache.keys().next().value;
    URL.revokeObjectURL(urlCache.get(oldestKey));
    urlCache.delete(oldestKey);
  }
  urlCache.set(path, objectUrl);
  return objectUrl;
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
