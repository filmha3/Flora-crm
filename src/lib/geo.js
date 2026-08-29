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
// Real OpenStreetMap raster tiles (the standard "Standard" OSM style,
// tile.openstreetmap.org) — same source Snapp's map is built on, free, no
// key or signup, and it's also exactly what public/sw.js already caches for
// offline use (isMapTile() there matches this same host). There's no free
// pre-rendered dark OSM tile server, so dark mode reuses these same tiles
// with a CSS filter (invert + hue-rotate) applied to the tile layer — see
// LIGHT_TILE_URL/DARK_TILE_URL both pointing here, and the .leaflet-tile
// filter rule wherever the map container is styled for dark mode.
export const LIGHT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DARK_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Applied to the Leaflet tile pane only in dark mode (not the whole map,
// so markers/popups keep their real colors). Inverting then rotating hue
// back turns OSM's light basemap into a dark one without needing a paid
// tile provider.
export const DARK_TILE_FILTER = "invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9) saturate(0.6)";

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
