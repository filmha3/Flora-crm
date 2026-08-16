import React from "react";
import { SP, RAD, FS } from "./theme.js";

const FLORA_GOLD = "#BA9358";

function FloraMark({ size = 120, color = "currentColor", opacity = 1, stroke = 1.6, gold = FLORA_GOLD }) {
  // Brand mark: gold arched window with white/stone mullions, plus a gold key
  // whose bow carries a checkmark — the "verified handover" emblem.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ opacity }} aria-hidden="true">
      {/* arched window, gold fill */}
      <path d="M16 32 A12 12 0 0 1 40 32 L40 55 L16 55 Z" fill={gold} fillOpacity="0.9" />
      {/* window outline + mullions in stone */}
      <path d="M16 32 A12 12 0 0 1 40 32 L40 55 L16 55 Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" fill="none" />
      <path d="M28 21 L28 55 M16 43 L40 43" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      {/* gold key */}
      <path d="M50 18 L50 43" stroke={gold} strokeWidth={stroke * 1.3} strokeLinecap="round" />
      <path d="M50 36 L54 36 M50 40 L53 40" stroke={gold} strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="50" cy="49.5" r="6.5" stroke={gold} strokeWidth={stroke * 1.1} fill="none" />
      <path d="M47 49.6 L49 52 L52.5 47.6" stroke={gold} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function EmptyLine({ c, text }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ padding: "18px 2px" }}>
      <div className="flora-float" style={{ opacity: 0.4, marginBottom: 8 }}><FloraMark size={44} color={c.muted} stroke={1.2} /></div>
      <p style={{ color: c.muted, fontSize: 13, textAlign: "center" }}>{text}</p>
    </div>
  );
}

function BodyPortal({ children }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, pointerEvents: "none" }}>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>{children}</div>
  </div>;
}

function Field({ c, label, children }) { return <div style={{ marginBottom: SP.md }}><label style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm, display: "block" }}>{label}</label>{children}</div>; }
function inputStyle(c) { return { width: "100%", background: c.surface2, border: "none", borderRadius: RAD.md, padding: `${SP.md}px ${SP.md + 2}px`, fontSize: FS.body + 1, color: c.ink, outline: "none", fontFamily: "inherit" }; }

export { FLORA_GOLD, FloraMark, EmptyLine, BodyPortal, Field, inputStyle };
