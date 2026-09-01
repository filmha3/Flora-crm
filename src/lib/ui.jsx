import React, { useState, useEffect, useRef } from "react";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import { SP, RAD, FS, glass } from "./theme.js";
import { isoToJalali, jalaliMonthLength, jalaliFirstWeekday, jalaliToIso, fmtJalali, faDigits, MONTHS_FA, WEEK_FA } from "./format.js";
import { getImageObjectUrl } from "./imageStore.js";

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

// onClose is optional — every full-screen sheet in the app renders through
// this one primitive, so wiring Escape-to-close and dialog semantics here
// once covers all of them instead of repeating it at each call site. Callers
// that don't pass onClose (rare) keep their previous behavior unchanged.
function BodyPortal({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!onClose) return;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, pointerEvents: "none" }}>
    <div
      ref={ref}
      role={onClose ? "dialog" : undefined}
      aria-modal={onClose ? "true" : undefined}
      tabIndex={onClose ? -1 : undefined}
      style={{ position: "absolute", inset: 0, pointerEvents: "auto", outline: "none" }}
    >
      {children}
    </div>
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

// ---------- Cloud-stored photos ----------
// A property.media item is either legacy ({ url: base64DataUrl }) or cloud
// ({ storagePath, thumbnailPath }) — every place in the app that renders a
// photo goes through MediaThumb/MediaFull instead of touching `.url`
// directly, so both shapes keep working side by side (old photos never
// silently break) and there's exactly one place that knows how to read a
// cloud photo, not one per call site.
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7";

// Downloads (RLS-authenticated) only once this <img> actually enters the
// viewport — requirement #7, "images outside the viewport are never
// loaded" — via IntersectionObserver on the element itself. `eager` skips
// that gate for the one context where the photo is already the reason the
// component mounted at all (the fullscreen lightbox).
function CloudImage({ path, alt = "", style, className, eager = false, kenBurns = false, onLoad }) {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (eager || visible) return;
    const el = imgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eager]); // eslint-disable-line

  useEffect(() => {
    if (!visible || !path) return;
    let cancelled = false;
    getImageObjectUrl(path).then((url) => { if (!cancelled) setSrc(url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [visible, path]); // eslint-disable-line

  // While the photo is still downloading, its own box carries a quiet
  // shimmer instead of a spinner; once it lands, it fades in — and only
  // where a caller explicitly opts in (the property hero, the lightbox —
  // never a scrolling grid of thumbnails) does it also get the barely-there
  // Ken Burns drift. See MOTION SYSTEM items 4 & 6.
  const classes = [className, "flora-img", src ? "flora-img-loaded" : "flora-skeleton", src && kenBurns ? "flora-kenburns" : ""].filter(Boolean).join(" ");
  return <img ref={imgRef} src={src || TRANSPARENT_PIXEL} alt={alt} loading="lazy" decoding="async" style={style} className={classes} onLoad={src ? onLoad : undefined} />;
}

// Small/list contexts — resolves to the thumbnail (falls back to the full
// image only if a legacy/partial item has no thumbnail yet).
// Small/list contexts — resolves to the thumbnail (falls back to the full
// image only if a legacy/partial item has no thumbnail yet). kenBurns
// defaults off; only the property hero's single large cover opts in.
function MediaThumb({ item, alt = "", style, className, onLoad, kenBurns = false }) {
  if (!item) return null;
  if (item.thumbnailPath || item.storagePath) return <CloudImage path={item.thumbnailPath || item.storagePath} alt={alt} style={style} className={className} onLoad={onLoad} kenBurns={kenBurns} />;
  return <img src={item.url} alt={alt} loading="lazy" decoding="async" style={style} className={className} onLoad={onLoad} />;
}
// Fullscreen/lightbox contexts — always the full-resolution image, loaded
// only once this component actually mounts (i.e. once the lightbox opens).
// kenBurns is opt-in per call site (the property hero cover, the lightbox) —
// never the default, so it's never accidentally applied somewhere it'd be
// one of several drifting photos on screen at once.
function MediaFull({ item, alt = "", style, className, kenBurns = false }) {
  if (!item) return null;
  if (item.storagePath) return <CloudImage path={item.storagePath} alt={alt} style={style} className={className} eager kenBurns={kenBurns} />;
  return <img src={item.url} alt={alt} style={style} className={className} />;
}

export { FLORA_GOLD, FloraMark, DivarMark, EmptyLine, BodyPortal, Field, inputStyle, JalaliDatePicker, MediaThumb, MediaFull, CloudImage };
