// Attachments for Legal Assistant chat — images and PDFs a person sends
// into a conversation. Compression reuses imageStore.js's helpers directly
// (same resize/webp/strip-metadata pipeline as property photos) instead of
// a second copy of that logic; only the bucket, path shape, and (for PDFs)
// "no compression, just upload" part are specific to this feature.
import { supabase } from "./supabaseClient.js";
import { loadImage, encodeCanvas, extFor } from "./imageStore.js";
import { uid } from "./format.js";

export const BUCKET = "legal-attachments";
const MAX_DIM = 1400, QUALITY = 0.8;
const MAX_PDF_BYTES = 12 * 1024 * 1024; // bucket allows 15MB; this leaves headroom

export async function uploadLegalImage({ userId, conversationId, file }) {
  const img = await loadImage(file);
  const { blob, width, height, mime } = await encodeCanvas(img, MAX_DIM, QUALITY);
  const path = `${userId}/${conversationId}/${uid()}.${extFor(mime)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false });
  if (error) throw error;
  return { path, width, height, name: file.name || "" };
}

export async function uploadLegalPdf({ userId, conversationId, file }) {
  if (file.size > MAX_PDF_BYTES) throw new Error("حجم PDF بیشتر از حد مجاز است (حداکثر ۱۲ مگابایت)");
  const path = `${userId}/${conversationId}/${uid()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return { path, name: file.name || "سند.pdf", size: file.size };
}

// For displaying an already-uploaded image back in the chat (RLS-authenticated,
// same download-then-object-URL approach as property photos).
const urlCache = new Map();
export async function getLegalAttachmentUrl(path) {
  if (!path) return null;
  if (urlCache.has(path)) return urlCache.get(path);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw error || new Error("download failed");
  const url = URL.createObjectURL(data);
  urlCache.set(path, url);
  return url;
}

export async function deleteLegalConversationFiles({ userId, conversationId }) {
  if (!userId || !conversationId) return;
  const prefix = `${userId}/${conversationId}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !data?.length) return;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  for (const p of paths) { if (urlCache.has(p)) { URL.revokeObjectURL(urlCache.get(p)); urlCache.delete(p); } }
  await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
}
