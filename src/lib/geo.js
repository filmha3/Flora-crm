// Shared by every "pick a point, tell me the street" map in Flora — the
// property-form address picker (App.jsx's MapPickerModal) and Flora
// Valuation's own inline quick-mode map both need the exact same loading
// and resolution logic, so it lives here once instead of being duplicated.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker icon is loaded as three separate image requests
// pointed at the CDN's own relative path — meaningless once Leaflet is
// bundled instead. Every marker in the app that doesn't pass a custom
// `icon` (the map picker, Valuation's map, the tour map) falls back to this
// default, so it has to be repointed at Vite's bundled asset URLs once,
// here, rather than at each call site.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

export const SAREIN_CENTER = [38.1465, 48.0043];
// CARTO's free dark_all/light_all CDN (basemaps.cartocdn.com) started
// requiring an API key and every map in the app was showing "API key
// required" tiles as a result. Esri's Canvas Dark/Light Gray Base tile
// service is the closest visual match (same muted, label-forward minimal
// basemap look) that's still genuinely free with no key or signup. Note the
// tile order is {z}/{y}/{x} here, not {z}/{x}/{y} — and there's no {s}
// subdomain or {r} retina variant, unlike the CARTO tiles this replaces.
export const DARK_TILE_URL = "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const LIGHT_TILE_URL = "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

// Used to load Leaflet from cdnjs.cloudflare.com at runtime — a render-
// blocking third-party script fetched fresh on every first map open, on top
// of whatever DNS/TLS latency that CDN has from wherever the agent actually
// is. Leaflet is now a bundled dependency (imported above) like the rest of
// the app's code, so this only exists to keep every existing call site
// (`loadLeaflet().then((L) => ...)`) working unchanged.
export function loadLeaflet() {
  return Promise.resolve(L);
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
