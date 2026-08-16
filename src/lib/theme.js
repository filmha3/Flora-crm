// Color themes (light/dark) and the design-token scale (spacing, radius,
// font sizes/weights) every component pulls from instead of magic numbers.
//
// Brand palette: Deep Emerald (#062F22) + Muted Brass (#C5A880). Semantic
// colors (success/danger/attn) are deliberately NOT emerald-family — a
// "success" state needs to read as a distinct signal against an emerald
// background, not blend into it, so success is a brighter jade rather than
// reusing the brand green.
const T = {
  dark: {
    bg: "#050F0B", orb1: "#0F5132", orb2: "#C5A880", orb3: "#0F5132",
    surface: "rgba(197,168,128,0.06)", surface2: "rgba(197,168,128,0.09)",
    border: "rgba(197,168,128,0.14)", ink: "#F3EFE4", muted: "#8FA396",
    primary: "#C5A880", primarySoft: "rgba(197,168,128,0.16)",
    attn: "#E0B04D", attnSoft: "rgba(224,176,77,0.16)",
    danger: "#F2685C", dangerSoft: "rgba(242,104,92,0.15)",
    success: "#3DD68C", successSoft: "rgba(61,214,140,0.15)",
    purple: "#9C8AD1", purpleSoft: "rgba(156,138,209,0.15)",
    shadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  light: {
    bg: "#F6F3EA", orb1: "#0F5132", orb2: "#C5A880", orb3: "#0F5132",
    surface: "rgba(255,255,255,0.65)", surface2: "rgba(255,255,255,0.5)",
    border: "rgba(6,47,34,0.10)", ink: "#1C2B22", muted: "#5C6B60",
    primary: "#8A6D3F", primarySoft: "rgba(138,109,63,0.12)",
    attn: "#B8860B", attnSoft: "rgba(184,134,11,0.12)",
    danger: "#DC4C3F", dangerSoft: "rgba(220,76,63,0.12)",
    success: "#1E9E62", successSoft: "rgba(30,158,98,0.12)",
    purple: "#6B5B95", purpleSoft: "rgba(107,91,149,0.12)",
    shadow: "0 8px 28px rgba(6,47,34,0.10)",
  },
};

const FS = { caption: 11, body: 13, subtitle: 15, title: 20, hero: 28, display: 34 };
const FW = { regular: 500, medium: 600, bold: 700, heavy: 800 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const RAD = { sm: 8, md: 14, lg: 22, pill: 999 };

const glass = (c) => ({
  background: c.surface,
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: `1px solid ${c.border}`,
  boxShadow: c.shadow,
  borderRadius: 22,
});
// Same look, no backdrop-filter. Blur is one of the most expensive CSS effects
// on iOS Safari — fine for a hero card or a sheet, but ruinous once it's applied
// to every row in a long scrolling list (each blurred layer repaints on scroll).
// Repeated list items use this instead; the surface color already reads as glass.
const glassLite = (c, radius = 22) => ({
  background: c.surface2,
  border: `1px solid ${c.border}`,
  boxShadow: c.shadow,
  borderRadius: radius,
});

export { T, FS, FW, SP, RAD, glass, glassLite };
