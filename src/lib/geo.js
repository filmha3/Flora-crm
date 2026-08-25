// Shared by every "pick a point, tell me the street" map in Flora — the
// property-form address picker (App.jsx's MapPickerModal) and Flora
// Valuation's own inline quick-mode map both need the exact same loading
// and resolution logic, so it lives here once instead of being duplicated.

export const SAREIN_CENTER = [38.1465, 48.0043];
export const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
// The location picker specifically uses a light/day map — real streets and
// landmarks read far more clearly on a bright satellite-style basemap than
// on the app's own dark theme, even though every other map in Flora stays
// dark to match the rest of the UI.
export const LIGHT_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(link);
    const script = document.createElement("script"); script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; script.onload = () => resolve(window.L); document.body.appendChild(script);
  });
}

export async function reverseGeocodeAddress(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fa`);
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.neighbourhood || a.suburb || a.quarter,
      a.city || a.town || a.village || "سرعین",
    ].filter(Boolean);
    return parts.length ? parts.join("، ") : (data.display_name || "سرعین، آدرس دقیق یافت نشد");
  } catch { return "سرعین، آدرس دقیق یافت نشد"; }
}
