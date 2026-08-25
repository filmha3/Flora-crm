import React, { useState } from "react";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import { SP, RAD, FS, glass } from "./theme.js";
import { isoToJalali, jalaliMonthLength, jalaliFirstWeekday, jalaliToIso, fmtJalali, faDigits, MONTHS_FA, WEEK_FA } from "./format.js";

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

// A generic listings/chat-bubble mark for the Divar entry card — deliberately
// not a reproduction of Divar's own trademarked logo, just a shape that
// reads as "marketplace / listings" at a glance.
function DivarMark({ size = 24, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 9h8M8 12.5h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
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

// Used across the property form, checks, and construction transactions —
// lives here (not in App.jsx) specifically so any component file can import
// it without creating a circular dependency back into App.jsx itself.
function JalaliDatePicker({ c, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selJ = isoToJalali(value);
  const [viewY, setViewY] = useState(selJ[0]);
  const [viewM, setViewM] = useState(selJ[1]);
  const monthLen = jalaliMonthLength(viewY, viewM);
  const firstDow = jalaliFirstWeekday(viewY, viewM);
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: monthLen }, (_, i) => i + 1)];
  const nav = (dir) => { let m = viewM + dir, y = viewY; if (m > 12) { m = 1; y++; } else if (m < 1) { m = 12; y--; } setViewM(m); setViewY(y); };
  const pick = (day) => { onChange(jalaliToIso(viewY, viewM, day)); setOpen(false); };
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="press w-full flex items-center gap-2" style={{ ...inputStyle(c), justifyContent: "flex-start" }}><CalendarDays size={15} color={c.primary} /><span>{fmtJalali(value)}</span></button>
      {open && (
        <div className="mt-2 rounded-xl p-3 flora-up" style={glass(c)}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => nav(-1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronRight size={14} color={c.ink} /></button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{MONTHS_FA[viewM - 1]} {faDigits(viewY)}</span>
            <button onClick={() => nav(1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronLeft size={14} color={c.ink} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">{WEEK_FA.map((w, i) => <div key={i} style={{ fontSize: 11, color: c.muted, textAlign: "center", fontWeight: 700 }}>{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => { const isSel = day && viewY === selJ[0] && viewM === selJ[1] && day === selJ[2]; return day ? <button key={i} onClick={() => pick(day)} className="press rounded-xl flex items-center justify-center" style={{ height: 30, fontSize: 13, fontWeight: isSel ? 800 : 500, color: isSel ? "#fff" : c.ink, background: isSel ? c.primary : "transparent" }}>{faDigits(day)}</button> : <div key={i} />; })}
          </div>
        </div>
      )}
    </div>
  );
}

export { FLORA_GOLD, FloraMark, DivarMark, EmptyLine, BodyPortal, Field, inputStyle, JalaliDatePicker };
