import { supabase } from "./supabaseClient.js";

// PostgREST caps a single response at 1000 rows — page through so big projects never truncate.
export async function fetchAll(table, cols, filter) {
  let all = [], from = 0;
  for (;;) {
    let q = supabase.from(table).select(cols).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}
export async function insertChunks(table, rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + 200));
    if (error) throw error;
  }
}
export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => { const r = (Math.random() * 16) | 0; return (ch === "x" ? r : (r & 3) | 8).toString(16); }));

// Downscale a picked photo to a small WebP/JPEG data URL (stored in the project row).
export const readImage = (file, max = 1200) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    let out;
    try { out = cv.toDataURL("image/webp", 0.78); if (!out.startsWith("data:image/webp")) out = cv.toDataURL("image/jpeg", 0.78); }
    catch { out = cv.toDataURL("image/jpeg", 0.78); }
    resolve(out);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
  img.src = url;
});
// Average color of a facade photo → used as the 3D wall color.
export const avgColor = (dataUrl) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement("canvas"); cv.width = 8; cv.height = 8;
      const g = cv.getContext("2d"); g.drawImage(img, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4, h = (v) => Math.round(v / n).toString(16).padStart(2, "0");
      resolve(`#${h(r)}${h(gg)}${h(b)}`);
    } catch { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = dataUrl;
});
