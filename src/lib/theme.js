// Color themes (light/dark) and the design-token scale (spacing, radius,
// font sizes/weights) every component pulls from instead of magic numbers.
const T = {
  dark: {
    bg: "#0A0E1A", orb1: "#2f7cf6", orb2: "#7c6ff5", orb3: "#2f7cf6",
    surface: "rgba(255,255,255,0.04)", surface2: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)", ink: "#F0F2F8", muted: "#8B92A8",
    primary: "#5B9DFF", primarySoft: "rgba(47,124,246,0.15)",
    attn: "#F59E0B", attnSoft: "rgba(245,158,11,0.15)",
    danger: "#EF4444", dangerSoft: "rgba(239,68,68,0.14)",
    success: "#22C55E", successSoft: "rgba(34,197,94,0.15)",
    purple: "#A78BFA", purpleSoft: "rgba(124,111,245,0.15)",
    shadow: "0 8px 32px rgba(0,0,0,0.3)",
  },
  light: {
    bg: "#F3F5FA", orb1: "#2f7cf6", orb2: "#7c6ff5", orb3: "#2f7cf6",
    surface: "rgba(255,255,255,0.6)", surface2: "rgba(255,255,255,0.45)",
    border: "rgba(255,255,255,0.7)", ink: "#1B2436", muted: "#6B7386",
    primary: "#2F7CF6", primarySoft: "rgba(47,124,246,0.12)",
    attn: "#F59E0B", attnSoft: "rgba(245,158,11,0.13)",
    danger: "#EF4444", dangerSoft: "rgba(239,68,68,0.12)",
    success: "#22C55E", successSoft: "rgba(34,197,94,0.12)",
    purple: "#7C6FF5", purpleSoft: "rgba(124,111,245,0.12)",
    shadow: "0 8px 28px rgba(47,124,246,0.1)",
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
