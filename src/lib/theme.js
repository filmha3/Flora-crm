// Color themes (light/dark) and the design-token scale (spacing, radius,
// font sizes/weights) every component pulls from instead of magic numbers.
const T = {
  dark: {
    isDark: true,
    bg: "#0A0E1A", orb1: "#2f7cf6", orb2: "#7c6ff5", orb3: "#2f7cf6",
    surface: "rgba(255,255,255,0.04)", surface2: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)", ink: "#F0F2F8", muted: "#8B92A8",
    primary: "#5B9DFF", primarySoft: "rgba(47,124,246,0.15)",
    info: "#5B9DFF", infoSoft: "rgba(47,124,246,0.15)",
    attn: "#F59E0B", attnSoft: "rgba(245,158,11,0.15)",
    danger: "#EF4444", dangerSoft: "rgba(239,68,68,0.14)",
    success: "#22C55E", successSoft: "rgba(34,197,94,0.15)",
    purple: "#A78BFA", purpleSoft: "rgba(124,111,245,0.15)",
    shadow: "0 8px 32px rgba(0,0,0,0.3)",
    gradientPrimary: "linear-gradient(135deg,#2f7cf6,#7c6ff5)",
  },
  // Flat black/white/gray — no glass blur, no blue-as-primary. Black is
  // the primary action color here (buttons, active nav, hero cards);
  // "info" is its own separate light-blue token for status badges like
  // "In Transit," since that meaning is distinct from "this is the main
  // action" once black takes over that role.
  light: {
    isDark: false,
    bg: "#F0F0F2", orb1: "#2f7cf6", orb2: "#7c6ff5", orb3: "#2f7cf6",
    surface: "#FFFFFF", surface2: "#F5F5F7",
    border: "rgba(10,10,10,0.05)", ink: "#0A0A0A", muted: "#8E8E93",
    primary: "#0A0A0A", primarySoft: "#F0F0F0",
    info: "#2F7CF6", infoSoft: "rgba(47,124,246,0.10)",
    attn: "#F59E0B", attnSoft: "rgba(245,158,11,0.12)",
    danger: "#EF4444", dangerSoft: "rgba(239,68,68,0.10)",
    success: "#22C55E", successSoft: "rgba(34,197,94,0.10)",
    purple: "#0A0A0A", purpleSoft: "#F0F0F0",
    shadow: "0 4px 16px rgba(10,10,10,0.08)",
    gradientPrimary: "#0A0A0A",
  },
};

// micro/small formalize two sizes that were already in heavy use ad hoc
// (75 and 18 call sites respectively) without ever being added as real
// scale steps — this documents what the app actually does rather than
// leaving a gap between caption and body that every screen quietly filled
// in on its own.
const FS = { micro: 10, small: 12, caption: 11, body: 13, subtitle: 15, title: 20, hero: 28, display: 34 };
const FW = { regular: 500, medium: 600, bold: 700, heavy: 800 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const RAD = { sm: 8, md: 14, lg: 22, pill: 999 };

// Every large card in the app shares one radius (22) by design — a real
// design-system decision, not a limitation. Cards used to be built with
// glass(c, 20), glass(c, 24), etc., which looked like per-card
// customization but silently did nothing (this function never accepted a
// second argument); every one of those cards was already rendering at 22.
// That's now made explicit instead of implied by a no-op argument.
const glass = (c) => c.isDark ? {
  background: c.surface,
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: `1px solid ${c.border}`,
  boxShadow: c.shadow,
  borderRadius: 22,
} : {
  background: c.surface,
  border: `1px solid ${c.border}`,
  boxShadow: c.shadow,
  borderRadius: 22,
};
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
