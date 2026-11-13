// Videos & documents attached to properties.
//
// They used to be turned into base64 strings and stored INSIDE the main CRM
// data object — so every save (IndexedDB) and every cloud sync re-copied
// megabytes of video, which is what made iPhone run out of memory and
// reload the page. Now only a small reference lives in the data:
//   • cloud:  { storagePath }   (uploaded to the property-photos bucket)
//   • local:  { localBlobId }   (raw File kept in IndexedDB "blobs" store)
import { supabase } from "./supabaseClient.js";
import { uid } from "./format.js";
import { BUCKET } from "./imageStore.js";
import { blobSet, blobGet, blobDelete } from "./db.js";

const extOf = (file) => {
  const fromName = (file.name || "").split(".").pop();
  if (fromName && fromName.length <= 5 && fromName !== file.name) return fromName.toLowerCase();
  return (file.type || "application/octet-stream").split("/").pop().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
};

// One file → one small media reference. Tries the cloud first (so it's on
// every device); if that fails (offline, bucket refuses the type/size) the
// file is kept on this device instead of being lost.
export async function storeMediaFile({ userId, propertyId, file, sortOrder }) {
  const id = uid();
  const type = file.type?.startsWith("video") ? "video" : "file";
  const base = { id, type, name: file.name || "", mime: file.type || "", size: file.size || 0, sortOrder: sortOrder ?? 0 };
  if (userId && propertyId && navigator.onLine !== false) {
    const storagePath = `${userId}/${propertyId}/${id}.${extOf(file)}`;
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false, cacheControl: "31536000" });
      if (!error) return { ...base, storagePath };
    } catch (e) { /* fall through to local */ }
  }
  await blobSet(id, file);
  return { ...base, localBlobId: id };
}

// Sequential on purpose: one big video in memory at a time.
export async function storeMediaFiles({ userId, propertyId, files, startSortOrder = 0 }) {
  const items = [], failed = [];
  let i = 0;
  for (const file of Array.from(files)) {
    try { items.push(await storeMediaFile({ userId, propertyId, file, sortOrder: startSortOrder + i })); }
    catch (e) { failed.push({ name: file.name, error: e?.message || String(e) }); }
    i++;
  }
  return { items, failed };
}

// ---------- Reading ----------
const urlCache = new Map(); // key -> url (signed URL or objectURL)
export async function getMediaUrl(item) {
  if (!item) return null;
  if (item.url) return item.url; // legacy inline / external
  if (item.storagePath) {
    const key = "s:" + item.storagePath;
    const hit = urlCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.url;
    // Signed URL — the video streams instead of being downloaded into memory.
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.storagePath, 3600);
    if (error || !data?.signedUrl) throw error || new Error("no url");
    urlCache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  }
  if (item.localBlobId) {
    const key = "b:" + item.localBlobId;
    if (urlCache.has(key)) return urlCache.get(key).url;
    const blob = await blobGet(item.localBlobId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    if (urlCache.size > 30) { // cap: drop oldest local object URL
      for (const [k, v] of urlCache) { if (k.startsWith("b:")) { URL.revokeObjectURL(v.url); urlCache.delete(k); break; } }
    }
    urlCache.set(key, { url, exp: Infinity });
    return url;
  }
  return null;
}

export async function deleteMediaItem(item) {
  if (!item) return;
  if (item.localBlobId) {
    const key = "b:" + item.localBlobId;
    if (urlCache.has(key)) { URL.revokeObjectURL(urlCache.get(key).url); urlCache.delete(key); }
    await blobDelete(item.localBlobId).catch(() => {});
  }
  if (item.storagePath && item.type !== "image") {
    urlCache.delete("s:" + item.storagePath);
    await supabase.storage.from(BUCKET).remove([item.storagePath]).catch(() => {});
  }
}

// One-time clean-up of old data: moves base64 videos/documents that are
// still sitting inside property.media out into the blob store, one at a
// time. Returns the new properties array, or null when nothing changed.
const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();
export async function extractInlineMedia(properties) {
  let changed = false;
  const out = [];
  for (const p of properties || []) {
    const media = p.media || [];
    if (!media.some((m) => m.type !== "image" && typeof m.url === "string" && m.url.startsWith("data:"))) { out.push(p); continue; }
    const next = [];
    for (const m of media) {
      if (m.type !== "image" && typeof m.url === "string" && m.url.startsWith("data:")) {
        try {
          const blob = await dataUrlToBlob(m.url);
          await blobSet(m.id, blob);
          const { url, ...rest } = m; // eslint-disable-line no-unused-vars
          next.push({ ...rest, localBlobId: m.id, mime: blob.type, size: blob.size });
          changed = true;
          continue;
        } catch (e) { /* keep original */ }
      }
      next.push(m);
    }
    out.push({ ...p, media: next });
  }
  return changed ? out : null;
}
