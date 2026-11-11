import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, MapPin, Ruler, BedDouble, ArrowUpDown, Phone, MessageCircle, X,
  SlidersHorizontal, ChevronLeft, ChevronRight, Building2, Car, Warehouse, Home, Loader2,
  ArrowLeft, CalendarDays, Menu, Mail, Images, Maximize2, Layers, Sofa, Package, Wallet, Building, Satellite, User, Clock, Check, Navigation, Map as MapIcon,
} from "lucide-react";
import { FLORA_GOLD, FloraMark } from "../lib/ui.jsx";
import { faDigits, fmtToman, isoToJalali, MONTHS_FA, toEnDigits } from "../lib/format.js";
import { supabase } from "../lib/supabaseClient.js";
import { publicImageUrl } from "../lib/publicPropertiesApi.js";

// ---------- shared light "editorial" palette — deliberately not the CRM's
// own dark/glass interior. Warm neutrals, one accent (the brand gold),
// generous whitespace, almost no shadow. ----------
const pc = {
  bg: "#F9F8F5", surface: "#FFFFFF", border: "#E3DFD9", ink: "#0E1425", muted: "#868A98", inkSoft: "#555A6D",
  accent: FLORA_GOLD, accentSoft: "#EFF2FB", soft: "#F0EEEA",
  brand: "#223F99", brandDeep: "#162746",
};

const PUBLIC_CSS = `
.fp-shell{margin:0 auto;width:100%;max-width:1320px;padding-inline:20px}
@media(min-width:640px){.fp-shell{padding-inline:32px}}
@media(min-width:1024px){.fp-shell{padding-inline:48px}}
.fp-eyebrow{display:inline-flex;align-items:center;gap:12px;font-size:12px;font-weight:700;color:${pc.accent}}
.fp-eyebrow:before{content:"";display:block;height:1px;width:32px;background:currentColor;opacity:.5}
.fp-link{position:relative;padding:8px 16px;font-size:15px;font-weight:600;color:inherit;text-decoration:none;opacity:.82;transition:opacity .3s}
.fp-link:hover{opacity:1}
.fp-link:after{content:"";position:absolute;inset-inline:16px;bottom:4px;height:1px;background:currentColor;transform:scaleX(0);transition:transform .5s cubic-bezier(.16,1,.3,1)}
.fp-link:hover:after{transform:scaleX(1)}
.fp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 32px;font-size:14px;font-weight:700;border-radius:2px;text-decoration:none;cursor:pointer;transition:all .3s cubic-bezier(.16,1,.3,1)}
.fp-btn:hover{transform:translateY(-1px)}
.fp-btn-sm{height:44px;padding:0 20px;font-size:13px}
.fp-btn-brand{background:${pc.brand};color:#fff;box-shadow:0 1px 2px rgba(14,20,37,.12)}
.fp-btn-brand:hover{background:${pc.brandDeep};box-shadow:0 10px 24px -12px rgba(34,63,153,.7)}
.fp-btn-ghost{border:1px solid rgba(255,255,255,.25);color:#fff}
.fp-btn-ghost:hover{border-color:#fff;background:rgba(255,255,255,.1)}
.fp-btn-line{border:1px solid rgba(14,20,37,.2);color:${pc.ink}}
.fp-btn-line:hover{border-color:rgba(14,20,37,.6);background:rgba(14,20,37,.03)}
.fp-btn-soft{border:1px solid rgba(34,63,153,.15);background:linear-gradient(180deg,#fff,${pc.accentSoft});color:${pc.brand};box-shadow:0 10px 28px -14px rgba(34,63,153,.45)}
.fp-btn-soft:hover{border-color:rgba(34,63,153,.35)}
.fp-card{transition:transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s,border-color .5s}
.fp-card:hover{transform:translateY(-4px);border-color:rgba(34,63,153,.35)!important;box-shadow:0 24px 48px -24px rgba(14,20,37,.3)!important}
.fp-card img{transition:transform .7s cubic-bezier(.16,1,.3,1)}
.fp-card:hover img{transform:scale(1.03)}
.fp-card-title{transition:color .3s}
.fp-card:hover .fp-card-title{color:${pc.brand}!important}
.fp-cell{display:flex;flex-direction:column;gap:12px;height:100%;padding:32px;background:${pc.bg};text-decoration:none;color:inherit;transition:background .3s}
.fp-cell:hover{background:#fff}
.fp-cell h3{transition:color .3s}
.fp-cell:hover h3{color:${pc.brand}}
.fp-intent{position:relative;display:flex;flex-direction:column;min-height:248px;padding:28px;overflow:hidden;text-decoration:none;color:#fff;transition:transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s}
.fp-intent:hover{transform:translateY(-4px)}
@media(min-width:640px){.fp-intent{min-height:272px;padding:36px}}
.fp-flink{display:inline-block;color:rgba(255,255,255,.7);text-decoration:none;font-size:14px;transition:color .3s,transform .3s}
.fp-flink:hover{color:#fff;transform:translateX(-4px)}
.fp-grid2{display:grid;gap:20px}
@media(min-width:768px){.fp-grid2{grid-template-columns:1fr 1fr;gap:32px}}
.fp-grid4{display:grid;gap:1px;background:${pc.border};border:1px solid ${pc.border}}
@media(min-width:640px){.fp-grid4{grid-template-columns:1fr 1fr}}
@media(min-width:1024px){.fp-grid4{grid-template-columns:repeat(4,1fr)}}
.fp-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:24px}
.fp-fgrid{display:grid;gap:48px}
@media(min-width:640px){.fp-fgrid{grid-template-columns:1fr 1fr}}
@media(min-width:1024px){.fp-fgrid{grid-template-columns:1.4fr 1fr 1fr 1.2fr}}
.fp-head{display:flex;flex-direction:column;gap:24px}
@media(min-width:768px){.fp-head{flex-direction:row;align-items:flex-end;justify-content:space-between}}
.fp-h1{font-size:34px;font-weight:800;line-height:1.3;color:#fff}
@media(min-width:640px){.fp-h1{font-size:54px}}
@media(min-width:1024px){.fp-h1{font-size:64px}}
.fp-h2{font-size:28px;font-weight:800;line-height:1.4}
@media(min-width:640px){.fp-h2{font-size:36px}}
.fp-sec{padding-block:80px}
@media(min-width:1024px){.fp-sec{padding-block:112px}}
.fp-bar{height:88px;transition:height .5s cubic-bezier(.16,1,.3,1)}
.fp-nav{display:none;align-items:center;gap:4px}
.fp-burger{display:inline-flex}
.fp-login{display:none!important}
@media(min-width:640px){.fp-login{display:inline-flex!important}}
@media(min-width:1024px){.fp-nav{display:flex}.fp-burger,.fp-mobile{display:none!important}.fp-bar{height:104px}.fp-bar.fp-small{height:76px}}
.fp-cuewrap{display:none}
@media(min-width:1024px){.fp-cuewrap{display:block}}
.fp-up{animation:fp-up .7s cubic-bezier(.16,1,.3,1) both}
@keyframes fp-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.fp-zoom{animation:fp-zoom 2.6s cubic-bezier(.16,1,.3,1) both}
@keyframes fp-zoom{from{transform:scale(1.06)}to{transform:scale(1)}}
.fp-cue{animation:fp-cue 2.4s ease-in-out infinite}
@keyframes fp-cue{from{transform:translateY(-100%)}to{transform:translateY(400%)}}
`;

// ---------- Office / brand (single place to edit) ----------
const SITE = "https://www.florapro.ir";
const OFFICE = {
  name: "Flora",
  agent: "آقای قبادی",
  tagline: "خرید و فروش املاک در سرعین",
  phone: "09300151579",
  phoneFa: "09300151579",
  wa: "989300151579",
  address: "سرعین، میدان دانش، جنب رستوران خاتای، سایت املاک گنجینه",
  lat: 38.14557, lng: 48.07265, // میدان دانش، سرعین
};
const ORG_LD = {
  "@context": "https://schema.org", "@type": "RealEstateAgent", "@id": SITE + "/#agency",
  name: OFFICE.name, description: "خرید واحد، آپارتمان و ویلا در سرعین — " + OFFICE.tagline,
  url: SITE + "/", telephone: "+98" + OFFICE.phone.slice(1), image: SITE + "/icon-512.png", priceRange: "$$",
  address: { "@type": "PostalAddress", streetAddress: "میدان دانش، جنب رستوران خاتای، سایت املاک گنجینه", addressLocality: "سرعین", addressRegion: "اردبیل", addressCountry: "IR" },
  geo: { "@type": "GeoCoordinates", latitude: 38.14557, longitude: 48.07265 },
  areaServed: { "@type": "City", name: "سرعین" },
  employee: { "@type": "Person", name: "قبادی", jobTitle: "مدیر املاک" },
};
const EXTRA_CSS = `
html,body,#root{background:${pc.bg}!important}
.fp-hphone{display:none!important}
@media(min-width:640px){.fp-hphone{display:inline-flex!important}.fp-hphone-sm{display:none!important}}
.fp-pin{display:block;width:30px;height:30px;border-radius:50% 50% 50% 0;background:${pc.brand};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 6px 16px rgba(14,20,37,.35)}
.fp-pin:after{content:"";position:absolute;inset:7px;border-radius:50%;background:#fff}
.fp-dl{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:${pc.border};border:1px solid ${pc.border}}
@media(min-width:640px){.fp-dl{grid-template-columns:repeat(3,1fr)}}
@media(min-width:1100px){.fp-dl{grid-template-columns:repeat(4,1fr)}}
.fp-price{display:grid;gap:1px;background:${pc.border};border:1px solid ${pc.border};grid-template-columns:1fr}
@media(min-width:640px){.fp-price{grid-template-columns:1.4fr 1fr 1fr}}
.fp-mbar{display:flex}
@media(min-width:860px){.fp-mbar{display:none!important}}
.fp-gbtn{display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:rgba(255,255,255,.92);color:${pc.ink};border-radius:2px;box-shadow:0 4px 14px rgba(14,20,37,.18);transition:background .3s}
.fp-gbtn:hover{background:#fff}
.fp-in{width:100%;height:48px;border:1px solid ${pc.border};background:#fff;padding:0 14px;font-size:14px;outline:none;border-radius:2px;font-family:inherit}
.fp-in:focus{border-color:${pc.brand}}
.fp-faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;padding:22px 0;font-size:16px;font-weight:700}
.fp-faq summary::-webkit-details-marker{display:none}
.fp-faq summary:after{content:"+";font-size:22px;color:${pc.brand};line-height:1}
.fp-faq[open] summary:after{content:"–"}
`;

const CATEGORIES = [
  { to: "/properties?q=" + encodeURIComponent("آپارتمان"), title: "خرید واحد و آپارتمان در سرعین", text: "واحدهای آپارتمانی فروشی سرعین که کارشناسان ما بازدید و ثبت کرده‌اند؛ هر فایل با قیمت، متراژ، تعداد خواب، عکس و موقعیت روی نقشه." },
  { to: "/properties?q=" + encodeURIComponent("ویلا"), title: "خرید ویلا در سرعین", text: "ویلاهای فروشی سرعین با متراژ، عکس و مشخصات کامل، مستقیم از دفتر مشاور." },
  { to: "/properties?deal=" + encodeURIComponent("رهن و اجاره"), title: "رهن و اجاره در سرعین", text: "فایل‌های رهن و اجاره‌ی به‌روز برای سکونت یا اقامت در سرعین." },
  { to: "/properties?deal=" + encodeURIComponent("پیش‌فروش"), title: "پیش‌فروش ملک در سرعین", text: "پروژه‌های پیش‌فروش سرعین برای خرید در مرحله‌ی ساخت با پرداخت مرحله‌ای." },
];

function upsertTag(selector, make) {
  let el = document.head.querySelector(selector);
  if (!el) { el = make(); document.head.appendChild(el); }
  return el;
}
function setMeta(title, description, { path, image, jsonLd } = {}) {
  document.title = title;
  const meta = (attr, key, val) => { if (val == null) return; upsertTag(`meta[${attr}="${key}"]`, () => { const m = document.createElement("meta"); m.setAttribute(attr, key); return m; }).setAttribute("content", val); };
  const url = SITE + (path || window.location.pathname);
  meta("name", "description", description);
  meta("name", "robots", "index, follow, max-image-preview:large");
  meta("property", "og:title", title); meta("property", "og:description", description);
  meta("property", "og:url", url); meta("property", "og:site_name", OFFICE.name);
  meta("property", "og:type", jsonLd ? "article" : "website");
  meta("property", "og:image", image || SITE + "/icon-512.png");
  meta("name", "twitter:card", image ? "summary_large_image" : "summary");
  meta("name", "twitter:title", title); meta("name", "twitter:description", description);
  upsertTag('link[rel="canonical"]', () => { const l = document.createElement("link"); l.rel = "canonical"; return l; }).href = url;
  // Replace the CRM's SoftwareApplication schema with the agency + page schema.
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((x) => x.remove());
  const ld = document.createElement("script"); ld.type = "application/ld+json";
  ld.textContent = JSON.stringify([ORG_LD, ...(jsonLd ? [].concat(jsonLd) : [])]);
  document.head.appendChild(ld);
}

// A real <a>, intercepted only for a plain left-click on the same origin —
// cmd/ctrl-click and right-click still work exactly like a normal link,
// and crawlers still see a real href instead of an onClick-only button.
function NavLink({ to, navigate, className, style, children, onClick }) {
  return (
    <a
      href={to}
      className={className}
      style={style}
      onClick={(e) => {
        onClick?.();
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function PublicHeader({ navigate, dark }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Transparent (soft black gradient) over the hero photo, solid paper once
  // scrolled or when the mobile menu is open.
  const overDark = dark && !scrolled && !menu;
  const textColor = overDark ? "#fff" : pc.ink;
  const edge = overDark ? "rgba(255,255,255,0.3)" : pc.border;
  const links = [["/properties", "فایل‌ها"], ["/about", "درباره ما"], ["/contact", "ارتباط با ما"]];
  return (
    <header style={{ position: dark ? "fixed" : "sticky", top: 0, left: 0, right: 0, zIndex: 50, color: textColor, background: overDark ? "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0))" : "rgba(249,248,245,0.95)", backdropFilter: overDark ? "none" : "blur(12px)", borderBottom: `1px solid ${overDark ? "transparent" : pc.border}`, boxShadow: overDark ? "none" : "0 8px 24px -20px rgba(14,20,37,0.35)" }}>
      <style>{PUBLIC_CSS + EXTRA_CSS}</style>
      <div className={`fp-shell fp-bar flex items-center justify-between ${scrolled ? "fp-small" : ""}`}>
        <NavLink to="/" navigate={navigate} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <FloraMark size={34} color={textColor} stroke={1.5} />
          <span style={{ fontSize: 20, fontWeight: 800, color: textColor }}>{OFFICE.name}</span>
        </NavLink>
        <nav className="fp-nav">
          {links.map(([to, label]) => <NavLink key={to} to={to} navigate={navigate} className="fp-link">{label}</NavLink>)}
        </nav>
        <div className="flex items-center" style={{ gap: 8 }}>
          {/* Deliberately a plain <a>, NOT routed through NavLink's
              client-side navigate() — this has to be a real, full page
              reload. The public site and the Agent CRM are rendered by two
              completely different branches of the same top-level component,
              and swapping between them without a full remount is the one
              transition that would actually change how many hooks that
              component calls mid-render. */}
          <a href={`tel:${OFFICE.phone}`} className="fp-hphone items-center" style={{ gap: 10, height: 44, padding: "0 16px", border: `1px solid ${edge}`, borderRadius: 2, color: textColor, fontSize: 17, fontWeight: 800, textDecoration: "none" }}><Phone size={16} /> <span className="numeric">{OFFICE.phoneFa}</span></a>
          <a href={`tel:${OFFICE.phone}`} aria-label="تماس" className="fp-hphone-sm flex items-center justify-center" style={{ width: 44, height: 44, border: `1px solid ${edge}`, borderRadius: 2, color: textColor }}><Phone size={17} /></a>
          <button className="fp-burger items-center justify-center" onClick={() => setMenu((m) => !m)} aria-label="منو" style={{ width: 44, height: 44, border: `1px solid ${edge}`, borderRadius: 2, background: "transparent" }}>
            {menu ? <X size={18} color={textColor} /> : <Menu size={18} color={textColor} />}
          </button>
        </div>
      </div>
      {menu && (
        <div className="fp-mobile fp-shell flex flex-col" style={{ borderTop: `1px solid ${pc.border}`, paddingBlock: 12 }}>
          {links.map(([to, label]) => <NavLink key={to} to={to} navigate={navigate} onClick={() => setMenu(false)} style={{ padding: "14px 0", fontSize: 15, fontWeight: 700, color: pc.ink, textDecoration: "none", borderBottom: `1px solid ${pc.border}` }}>{label}</NavLink>)}
          <a href="/site" style={{ padding: "14px 0", fontSize: 15, fontWeight: 700, color: pc.brand, textDecoration: "none" }}>ورود مشاوران</a>
        </div>
      )}
    </header>
  );
}

function PublicFooter({ navigate, flush }) {
  const h = { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 18 };
  const col = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 };
  return (
    <footer style={{ marginTop: flush ? 0 : 80, background: pc.ink, color: "rgba(255,255,255,0.7)" }}>
      <div className="fp-shell" style={{ paddingBlock: 72 }}>
        <div className="fp-fgrid">
          <div style={{ maxWidth: 360 }}>
            <div className="flex items-center" style={{ gap: 10, marginBottom: 20 }}>
              <FloraMark size={30} color="#fff" stroke={1.5} />
              <span style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>{OFFICE.name}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 2.2, color: "rgba(255,255,255,0.6)" }}>{OFFICE.tagline} — خرید واحد، آپارتمان، ویلا و پیش‌فروش با بازدید کارشناس و همراهی تا پایان معامله.</p>
          </div>
          <nav>
            <h2 style={h}>دسترسی سریع</h2>
            <div style={col}>
              <NavLink to="/properties" navigate={navigate} className="fp-flink">فایل‌ها</NavLink>
              <NavLink to="/about" navigate={navigate} className="fp-flink">درباره ما</NavLink>
              <NavLink to="/contact" navigate={navigate} className="fp-flink">ارتباط با ما</NavLink>
              <a href="/site" className="fp-flink">ورود مشاوران</a>
            </div>
          </nav>
          <nav>
            <h2 style={h}>ملک در سرعین</h2>
            <div style={col}>
              {CATEGORIES.map((c) => <a key={c.to} href={c.to} className="fp-flink">{c.title}</a>)}
            </div>
          </nav>
          <div>
            <h2 style={h}>تماس</h2>
            <div style={col}>
              <a href={`tel:${OFFICE.phone}`} className="flex items-center" style={{ gap: 10, color: "#fff", fontSize: 17, fontWeight: 800, textDecoration: "none" }}><Phone size={15} /> <span className="numeric">{OFFICE.phoneFa}</span></a>
              <span className="flex items-center" style={{ gap: 10, fontSize: 14 }}><User size={15} /> {OFFICE.agent}</span>
              <span className="flex items-start" style={{ gap: 10, fontSize: 14, lineHeight: 1.9 }}><MapPin size={15} className="shrink-0" style={{ marginTop: 5 }} /> {OFFICE.address}</span>
              <a href="/?legal=privacy" className="fp-flink">حریم خصوصی</a>
              <a href="/?legal=terms" className="fp-flink">شرایط استفاده</a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 12, marginTop: 56, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <p>© {faDigits(1405)} {OFFICE.name} — تمامی حقوق محفوظ است.</p>
          <p>سرعین، استان اردبیل</p>
        </div>
      </div>
    </footer>
  );
}

function specLine(p) {
  const bits = [];
  if (p.area) bits.push(`${faDigits(p.area)} متر`);
  if (p.rooms != null) bits.push(`${faDigits(p.rooms)} خواب`);
  if (p.floor != null) bits.push(`طبقه ${faDigits(p.floor)}`);
  return bits.join(" · ");
}

function specGrid(p) {
  const items = [];
  if (p.area) items.push({ label: "متراژ", value: `${faDigits(p.area)} متر`, Icon: Ruler });
  if (p.rooms != null) items.push({ label: "خواب", value: `${faDigits(p.rooms)} خواب`, Icon: BedDouble });
  if (p.floor != null) items.push({ label: "طبقه", value: `طبقه ${faDigits(p.floor)}`, Icon: Building2 });
  return items;
}
// Price per meter: stored value, or computed from total price ÷ area (sales only).
function ppm(p) {
  if (p.price_per_meter) return p.price_per_meter;
  if (p.deal === "رهن و اجاره" || !p.price || !p.area) return null;
  return Math.round(p.price / p.area);
}
function jalaliShort(iso) {
  if (!iso) return "";
  try { const [jy, jm, jd] = isoToJalali(iso.slice(0, 10)); return `${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)}`; } catch (e) { return ""; }
}

function PropertyCardPublic({ p, navigate }) {
  const img = publicImageUrl(p.cover_thumb_path || p.cover_path);
  const specs = specGrid(p);
  return (
    <NavLink to={`/properties/${p.slug}`} navigate={navigate} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <div className="fp-card flex flex-col h-full" style={{ overflow: "hidden", background: pc.surface, border: "1px solid rgba(34,63,153,0.1)", boxShadow: "0 1px 3px rgba(14,20,37,0.05)" }}>
        <div style={{ width: "100%", aspectRatio: "4 / 3", background: pc.soft, position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(34,63,153,0.1)" }}>
          {img ? <img src={img} alt={`${p.title} — ${p.property_type || "ملک"} در سرعین`} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
            <div className="w-full h-full flex items-center justify-center"><Building2 size={26} color={pc.muted} /></div>
          )}
        </div>
        <div className="flex flex-1 flex-col" style={{ padding: "16px 18px 18px" }}>
          <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: pc.accent }}>{p.property_type || "ملک"}</span>
            <span style={{ fontSize: 10, color: pc.muted, background: pc.soft, padding: "2px 7px" }}>{p.deal}</span>
          </div>
          <p className="fp-card-title" style={{ fontSize: 17, fontWeight: 700, color: pc.ink, lineHeight: 1.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
          {(p.city || p.address) && <p className="flex items-center" style={{ gap: 5, fontSize: 12, color: pc.muted, marginTop: 4 }}><MapPin size={12} className="shrink-0" style={{ opacity: 0.6 }} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.city || p.address}</span></p>}

          {specs.length > 0 && (
            <div className="grid" style={{ gridTemplateColumns: `repeat(${specs.length}, 1fr)`, gap: 1, marginTop: 16, border: "1px solid rgba(34,63,153,0.1)", background: "rgba(34,63,153,0.1)" }}>
              {specs.map((s) => (
                <div key={s.label} className="flex flex-col items-center" style={{ gap: 5, background: pc.accentSoft, padding: "10px 4px", textAlign: "center" }}>
                  {s.Icon && <s.Icon size={15} color={pc.brand} strokeWidth={1.6} />}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: pc.ink }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 16 }}><div style={{ borderTop: "1px solid rgba(34,63,153,0.15)", paddingTop: 14 }}>
            <div className="flex items-end justify-between">
              <div>
                <p style={{ fontSize: 10.5, color: pc.muted }}>قیمت</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: pc.brandDeep, marginTop: 4 }}>{p.price ? fmtToman(p.price) : "تماس بگیرید"}</p>
              </div>
              <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 2, background: pc.brand, color: "#fff" }}><ArrowLeft size={15} /></span>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
              {ppm(p) ? <span style={{ fontSize: 10.5, color: pc.muted }}>{fmtToman(ppm(p))} در هر متر</span> : <span />}
              {p.updated_at && <span className="flex items-center" style={{ gap: 4, fontSize: 10, color: pc.muted }}><CalendarDays size={11} /> {jalaliShort(p.updated_at)}</span>}
            </div>
          </div></div>
        </div>
      </div>
    </NavLink>
  );
}

const FAQ = [
  ["قیمت خرید واحد در سرعین چقدر است؟", "قیمت هر متر آپارتمان در سرعین به موقعیت، ویو، سال ساخت و امکانات بستگی دارد. قیمت به‌روز هر فایل، همراه با قیمت هر متر، روی صفحه‌ی همان فایل درج شده است."],
  ["خرید واحد در سرعین برای سرمایه‌گذاری مناسب است؟", "سرعین به‌خاطر چشمه‌های آب گرم و گردشگری در تمام فصول، تقاضای بالایی برای اجاره‌ی کوتاه‌مدت دارد؛ واحدهای نزدیک به مرکز شهر و آب‌گرم‌ها معمولاً بازدهی اجاره‌ی بهتری دارند."],
  ["چطور برای بازدید ملک وقت بگیرم؟", `در صفحه‌ی هر فایل روی «درخواست بازدید» بزنید و شماره‌ی تماس خود را وارد کنید، یا مستقیم با ${OFFICE.agent} به شماره‌ی ${OFFICE.phoneFa} تماس بگیرید.`],
  [`دفتر ${OFFICE.name} کجاست؟`, `${OFFICE.address}. برای هماهنگی بازدید پیش از مراجعه تماس بگیرید.`],
];

// ---------- Homepage ----------
function PublicHomeView({ navigate }) {
  const [latest, setLatest] = useState(null); // null = loading
  const [count, setCount] = useState(null);

  useEffect(() => { setMeta(`خرید واحد در سرعین | خرید آپارتمان و ویلا — ${OFFICE.name}`, `خرید واحد و آپارتمان در سرعین با ${OFFICE.name}: فایل‌های به‌روز فروش آپارتمان، ویلا و پیش‌فروش با قیمت، عکس و موقعیت روی نقشه. مشاوره و بازدید: ${OFFICE.phoneFa}`, { path: "/", jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } }); }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("public_properties").select("*").order("updated_at", { ascending: false }).limit(8);
      if (!cancelled) setLatest(data || []);
      const { count: c } = await supabase.from("public_properties").select("id", { count: "exact", head: true });
      if (!cancelled) setCount(c ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const heroCover = latest?.find((x) => x.cover_path)?.cover_path;
  const heroImg = heroCover ? publicImageUrl(heroCover) : null;
  const arrowDot = (bg, fg) => <span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 2, background: bg, color: fg }}><ArrowLeft size={15} /></span>;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} dark />

      {/* Hero — full-bleed, content pinned to the bottom. Uses the newest
          published cover photo as the backdrop; falls back to the brand
          mark when nothing is published yet. */}
      <section className="relative" style={{ minHeight: "92svh", display: "flex", alignItems: "flex-end", overflow: "hidden", background: pc.ink }}>
        {heroImg ? (
          <div className="fp-zoom" style={{ position: "absolute", inset: 0 }}><img src={heroImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
        ) : (
          <div style={{ position: "absolute", inset: 0, opacity: 0.35, display: "flex", alignItems: "center", justifyContent: "center" }}><FloraMark size={520} color="#fff" stroke={0.6} /></div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(14,20,37,0.92) 0%, rgba(14,20,37,0.5) 50%, rgba(14,20,37,0.22) 100%)" }} />
        <div className="fp-shell relative" style={{ paddingTop: 160, paddingBottom: 96 }}>
          <div style={{ maxWidth: 760 }}>
            <p className="fp-eyebrow fp-up" style={{ color: "rgba(255,255,255,0.7)" }}>سرعین، استان اردبیل</p>
            <h1 className="fp-h1 fp-up" style={{ marginTop: 24, animationDelay: "120ms" }}>خرید واحد در سرعین<span style={{ display: "block", fontSize: "0.45em", fontWeight: 700, marginTop: 14, color: "rgba(255,255,255,0.85)" }}>{OFFICE.name} — {OFFICE.tagline}</span></h1>
            <p className="fp-up" style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 2.2, marginTop: 24, maxWidth: 520, animationDelay: "240ms" }}>آپارتمان، ویلا و پروژه‌های پیش‌فروش سرعین؛ هر فایل پس از بازدید کارشناس با قیمت، عکس و موقعیت دقیق روی نقشه منتشر می‌شود.</p>
            <div className="flex flex-wrap items-center fp-up" style={{ gap: 12, marginTop: 40, animationDelay: "360ms" }}>
              <NavLink to="/properties" navigate={navigate} className="fp-btn fp-btn-brand">مشاهده فایل‌ها <ArrowLeft size={16} /></NavLink>
              <a href={`tel:${OFFICE.phone}`} className="fp-btn fp-btn-ghost"><Phone size={16} /> <span className="numeric">{OFFICE.phoneFa}</span></a>
            </div>
            {count != null && count > 0 && (
              <p className="fp-up" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 48, animationDelay: "480ms" }}><b className="numeric" style={{ color: "#fff", fontWeight: 800 }}>{faDigits(count)}</b> فایل فعال روی سایت</p>
            )}
          </div>
        </div>
        <div className="fp-cuewrap" style={{ position: "absolute", bottom: 32, left: "50%", height: 64, width: 1, overflow: "hidden", background: "rgba(255,255,255,0.2)" }}><span className="fp-cue" style={{ display: "block", height: 24, width: 1, background: "#fff" }} /></div>
      </section>

      {/* Intent cards — buyers / agents */}
      <section style={{ paddingTop: 72 }}>
        <div className="fp-shell fp-grid2">
          <NavLink to="/properties" navigate={navigate} className="fp-intent" style={{ background: `linear-gradient(270deg, ${pc.brand} 35%, ${pc.brandDeep})`, boxShadow: "0 18px 40px -24px rgba(34,63,153,0.9)" }}>
            <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}><Search size={20} /></span>
            <p style={{ marginTop: 28, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>برای خریداران و مستأجران</p>
            <h3 style={{ marginTop: 8, fontSize: 28, fontWeight: 800, lineHeight: 1.4 }}>جستجوی ملک</h3>
            <p style={{ marginTop: 12, maxWidth: 440, fontSize: 14, lineHeight: 2.2, color: "rgba(255,255,255,0.75)" }}>فایل‌های موجود سرعین را ببینید، بر اساس متراژ و قیمت فیلتر کنید و گزینه‌ی مناسب خود را پیدا کنید.</p>
            <span className="flex items-center" style={{ gap: 12, marginTop: "auto", paddingTop: 28, fontSize: 14, fontWeight: 800 }}>مشاهده‌ی فایل‌ها {arrowDot("#fff", pc.brand)}</span>
          </NavLink>
          <a href={`tel:${OFFICE.phone}`} className="fp-intent" style={{ background: pc.surface, color: pc.ink, border: `1px solid ${pc.border}`, boxShadow: "0 18px 40px -28px rgba(14,20,37,0.35)" }}>
            <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: pc.accentSoft, color: pc.brand, border: "1px solid rgba(34,63,153,0.15)" }}><Building2 size={20} /></span>
            <p style={{ marginTop: 28, fontSize: 12, fontWeight: 700, color: pc.accent }}>برای فروشندگان</p>
            <h3 style={{ marginTop: 8, fontSize: 28, fontWeight: 800, lineHeight: 1.4 }}>فروش ملک</h3>
            <p style={{ marginTop: 12, maxWidth: 440, fontSize: 14, lineHeight: 2.2, color: pc.inkSoft }}>ملک خود را به کارشناسان {OFFICE.name} بسپارید؛ از قیمت‌گذاری تا یافتن خریدار مناسب، در کنار شما هستیم.</p>
            <span className="flex items-center" style={{ gap: 12, marginTop: "auto", paddingTop: 28, fontSize: 14, fontWeight: 800 }}>تماس با ما {arrowDot(pc.brand, "#fff")}</span>
          </a>
        </div>
      </section>

      {/* Categories */}
      <section className="fp-sec" style={{ borderBottom: `1px solid ${pc.border}` }}>
        <div className="fp-shell">
          <div style={{ maxWidth: 760 }}>
            <p className="fp-eyebrow">املاک سرعین</p>
            <h2 className="fp-h2" style={{ marginTop: 20 }}>خرید واحد و ملک در سرعین</h2>
            <p style={{ marginTop: 20, fontSize: 15, lineHeight: 2.3, color: pc.inkSoft }}>سرعین با چشمه‌های آب گرم و دامنه‌های سبلان، از پرمسافرترین شهرهای ایران است و ملک در آن هم برای سکونت و هم برای سرمایه‌گذاری خواهان دارد. {OFFICE.name} فایل‌های فروش واحد آپارتمانی، ویلا و پروژه‌های پیش‌فروش سرعین را پس از بازدید کارشناس، با قیمت، عکس و موقعیت دقیق روی نقشه منتشر می‌کند و تا پایان معامله همراه خریدار است.</p>
          </div>
          <div className="fp-grid4" style={{ marginTop: 48 }}>
            {CATEGORIES.map((c) => (
              <NavLink key={c.to} to={c.to} navigate={navigate} className="fp-cell">
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{c.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 2, color: pc.inkSoft }}>{c.text}</p>
                <span className="flex items-center" style={{ gap: 6, marginTop: "auto", paddingTop: 8, fontSize: 13, fontWeight: 700, color: pc.brand }}>مشاهده <ArrowLeft size={14} /></span>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* Latest properties */}
      <section className="fp-sec" style={{ background: pc.surface, borderBottom: `1px solid ${pc.border}` }}>
        <div className="fp-shell">
          <div className="fp-head">
            <div style={{ maxWidth: 640 }}>
              <p className="fp-eyebrow">تازه‌ها</p>
              <h2 className="fp-h2" style={{ marginTop: 16 }}>جدیدترین فایل‌ها</h2>
              <p style={{ marginTop: 12, fontSize: 15, lineHeight: 2.2, color: pc.inkSoft }}>آخرین فایل‌هایی که روی سایت منتشر شده‌اند.</p>
            </div>
            <NavLink to="/properties" navigate={navigate} className="fp-btn fp-btn-sm fp-btn-soft" style={{ alignSelf: "flex-start" }}>مشاهده همه <ArrowLeft size={15} /></NavLink>
          </div>
          <div style={{ marginTop: 56 }}>
            {latest === null ? (
              <div className="flex items-center justify-center" style={{ padding: 60 }}><Loader2 size={20} className="animate-spin" color={pc.muted} /></div>
            ) : latest.length === 0 ? (
              <p style={{ fontSize: 14, color: pc.muted, textAlign: "center", padding: 60, border: `1px solid ${pc.border}` }}>هنوز فایلی منتشر نشده است.</p>
            ) : (
              <div className="fp-cards">
                {latest.map((p) => <PropertyCardPublic key={p.id} p={p} navigate={navigate} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dark band — about */}
      <section className="fp-sec relative" style={{ background: pc.ink, color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: -80, transform: "translateY(-50%)", opacity: 0.12 }}><FloraMark size={460} color="#fff" stroke={0.6} /></div>
        <div className="fp-shell relative">
          <div style={{ maxWidth: 640 }}>
            <p className="fp-eyebrow">درباره‌ی {OFFICE.name}</p>
            <h2 className="fp-h2" style={{ marginTop: 20 }}>مشاوره‌ی خرید واحد در سرعین، از بازدید تا قرارداد</h2>
            <p style={{ marginTop: 20, fontSize: 15, lineHeight: 2.3, color: "rgba(255,255,255,0.7)" }}>{OFFICE.name} با مدیریت {OFFICE.agent}، در میدان دانش سرعین فعالیت می‌کند. همه‌ی فایل‌ها پیش از انتشار بازدید می‌شوند تا قیمت، متراژ و عکس‌ها با واقعیت ملک یکی باشد.</p>
            <NavLink to="/about" navigate={navigate} className="fp-btn fp-btn-ghost" style={{ marginTop: 40 }}>بیشتر بدانید <ArrowLeft size={16} /></NavLink>
          </div>
        </div>
      </section>

      {/* FAQ — real content for the target query + FAQPage schema */}
      <section className="fp-sec" style={{ borderBottom: `1px solid ${pc.border}` }}>
        <div className="fp-shell" style={{ maxWidth: 900 }}>
          <p className="fp-eyebrow">سؤالات متداول</p>
          <h2 className="fp-h2" style={{ marginTop: 16, marginBottom: 24 }}>راهنمای خرید واحد در سرعین</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="fp-faq" style={{ borderBottom: `1px solid ${pc.border}` }}>
              <summary>{q}</summary>
              <p style={{ paddingBottom: 22, fontSize: 15, lineHeight: 2.3, color: pc.inkSoft }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="fp-sec" style={{ background: pc.surface }}>
        <div className="fp-shell">
          <div className="flex flex-col items-center" style={{ gap: 28, border: `1px solid ${pc.border}`, padding: "64px 24px", textAlign: "center" }}>
            <p className="fp-eyebrow" style={{ gap: 0 }}>مشاوره</p>
            <h2 className="fp-h2" style={{ maxWidth: 560 }}>ملک مورد نظرتان را پیدا نکردید؟</h2>
            <p style={{ maxWidth: 520, fontSize: 15, lineHeight: 2.3, color: pc.inkSoft }}>همه‌ی فایل‌ها را با فیلتر متراژ، قیمت و نوع معامله مرور کنید یا با ما در تماس باشید.</p>
            <div className="flex flex-wrap items-center justify-center" style={{ gap: 12 }}>
              <NavLink to="/properties" navigate={navigate} className="fp-btn fp-btn-brand">همه‌ی فایل‌ها <ArrowLeft size={16} /></NavLink>
              <a href={`tel:${OFFICE.phone}`} className="fp-btn fp-btn-line"><Phone size={16} /> <span className="numeric">{OFFICE.phoneFa}</span></a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter navigate={navigate} flush />
    </div>
  );
}

// ---------- Listing ----------
const DEAL_OPTIONS = ["همه", "فروش", "رهن و اجاره", "پیش‌فروش"];

function PublicPropertiesListView({ navigate }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [deal, setDeal] = useState(() => { const d = new URLSearchParams(window.location.search).get("deal"); return DEAL_OPTIONS.includes(d) ? d : "همه"; });
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { setMeta(`خرید واحد و آپارتمان در سرعین — فایل‌های فروش | ${OFFICE.name}`, `فهرست کامل فایل‌های فروش واحد، آپارتمان، ویلا، پیش‌فروش و رهن و اجاره در سرعین با قیمت، متراژ و عکس — ${OFFICE.name}`, { path: "/properties" }); }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("public_properties").select("*").order("updated_at", { ascending: false }).limit(200);
      if (!cancelled) setItems(data || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    return items.filter((p) => {
      if (deal !== "همه" && p.deal !== deal) return false;
      if (minArea && (!p.area || p.area < Number(minArea))) return false;
      if (maxArea && (!p.area || p.area > Number(maxArea))) return false;
      if (minPrice && (!p.price || p.price < Number(minPrice))) return false;
      if (maxPrice && (!p.price || p.price > Number(maxPrice))) return false;
      if (rooms && String(p.rooms) !== rooms) return false;
      if (q.trim()) {
        const hay = `${p.title || ""} ${p.address || ""} ${p.city || ""} ${p.property_type || ""}`;
        if (!hay.includes(q.trim())) return false;
      }
      return true;
    });
  }, [items, deal, minArea, maxArea, minPrice, maxPrice, rooms, q]);

  const FilterFields = (
    <>
      <div>
        <p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>نوع معامله</p>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {DEAL_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDeal(d)} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 2, border: `1px solid ${deal === d ? pc.brand : pc.border}`, background: deal === d ? pc.brand : "transparent", color: deal === d ? "#fff" : pc.ink }}>{d}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 14 }}>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداقل متراژ</p><input value={minArea} onChange={(e) => setMinArea(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداکثر متراژ</p><input value={maxArea} onChange={(e) => setMaxArea(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداقل قیمت</p><input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداکثر قیمت</p><input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>تعداد خواب</p><input value={rooms} onChange={(e) => setRooms(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
      </div>
    </>
  );

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => setFiltersOpen(true)} />
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 20px 0" }}>
        <p className="fp-eyebrow">املاک سرعین</p>
        <h1 className="fp-h2" style={{ marginTop: 14, marginBottom: 28 }}>خرید واحد و ملک در سرعین</h1>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 22 }}>
          <div className="flex-1 flex items-center" style={{ gap: 8, background: pc.surface, border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 14px" }}>
            <Search size={13} color={pc.muted} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5 }} />
          </div>
          <button onClick={() => setFiltersOpen(true)} className="flex items-center" style={{ gap: 6, border: `1px solid ${pc.border}`, borderRadius: 2, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
            <SlidersHorizontal size={13} /> فیلتر
          </button>
        </div>

        {/* Desktop-visible inline filters; on mobile this same block appears in the bottom sheet */}
        <div className="hidden md-block" style={{ marginBottom: 24 }}>{FilterFields}</div>

        {filtered === null ? (
          <div className="flex items-center justify-center" style={{ padding: 80 }}><Loader2 size={20} className="animate-spin" color={pc.muted} /></div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: pc.muted, marginBottom: 16 }}>{faDigits(filtered.length)} فایل</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 24, paddingBottom: 40 }}>
              {filtered.map((p) => <PropertyCardPublic key={p.id} p={p} navigate={navigate} />)}
            </div>
            {filtered.length === 0 && <p style={{ fontSize: 13, color: pc.muted, textAlign: "center", padding: 60 }}>فایلی با این مشخصات پیدا نشد.</p>}
          </>
        )}
      </div>
      <PublicFooter navigate={navigate} />

      {/* Mobile filter bottom sheet */}
      {filtersOpen && (
        <div className="md-hidden" style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(14,20,37,0.5)", display: "flex", alignItems: "flex-end" }} onClick={() => setFiltersOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: pc.surface, borderRadius: 0, padding: 20, maxHeight: "80vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 800 }}>فیلتر</p>
              <button onClick={() => setFiltersOpen(false)} style={{ width: 30, height: 30, borderRadius: "50%", background: pc.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
            </div>
            {FilterFields}
            <button onClick={() => setFiltersOpen(false)} style={{ width: "100%", marginTop: 20, padding: "13px", borderRadius: 2, background: pc.brand, color: "#fff", fontWeight: 700, fontSize: 13 }}>اعمال فیلتر</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Property detail (minaei-style) ----------
function detailSpecs(p) {
  const d = p.details || {};
  const yn = (v) => (v == null ? null : v ? "دارد" : "ندارد");
  return [
    [Ruler, "زیربنا", p.area ? `${faDigits(p.area)} متر مربع` : null],
    [BedDouble, "اتاق خواب", p.rooms != null ? `${faDigits(p.rooms)} خواب` : null],
    [Layers, "طبقه", p.floor != null ? faDigits(p.floor) : null],
    [Building2, "تعداد طبقات", d.total_floors ? faDigits(d.total_floors) : null],
    [CalendarDays, "سال ساخت", d.year_built ? faDigits(d.year_built) : null],
    [Sofa, "وضعیت فرنیش", d.furnished || null],
    [Car, "پارکینگ", yn(d.parking)],
    [ArrowUpDown, "آسانسور", yn(d.elevator)],
    [Warehouse, "انباری", yn(d.storage)],
    [Wallet, "نوع معامله", p.deal || null],
    [Building, "نوع ملک", p.property_type || null],
    [Clock, "زمان تحویل", d.pre_delivery ? `${faDigits(d.pre_delivery)} ماه` : null],
  ].filter((x) => x[2]);
}
const dealVerb = (deal) => (deal === "رهن و اجاره" ? "رهن و اجاره" : deal === "پیش‌فروش" ? "پیش‌فروش" : "خرید");
const propCode = (p) => p.details?.code || String(p.id || "").slice(0, 6).toUpperCase();
const sectionTitle = (t) => <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>{t}</h2>;

// Leaflet is loaded only when the map scrolls into view, so it never costs
// anything on first paint (it's ~150KB with its CSS).
function PropertyMap({ lat, lng }) {
  const box = useRef(null), mapRef = useRef(null), layerRef = useRef(null), LRef = useRef(null);
  const [sat, setSat] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const [{ default: L }] = await Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]);
      if (cancelled || !box.current || mapRef.current) return;
      LRef.current = L;
      const m = L.map(box.current, { scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], 16);
      L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<span class="fp-pin" style="position:relative"></span>', iconSize: [30, 40], iconAnchor: [15, 38] }) }).addTo(m);
      mapRef.current = m; setReady(true);
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); init(); } }, { rootMargin: "300px" });
    if (box.current) io.observe(box.current);
    return () => { cancelled = true; io.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
  }, [lat, lng]);
  useEffect(() => {
    const L = LRef.current, m = mapRef.current;
    if (!L || !m) return;
    layerRef.current?.remove();
    layerRef.current = sat
      ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri" })
      : L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
    layerRef.current.addTo(m);
  }, [sat, ready]);
  return (
    <div style={{ position: "relative", isolation: "isolate", zIndex: 0 }}>
      <div ref={box} dir="ltr" style={{ width: "100%", height: 380, background: pc.soft, border: `1px solid ${pc.border}` }} />
      <button type="button" onClick={() => setSat((v) => !v)} className="flex items-center" style={{ position: "absolute", top: 12, right: 12, zIndex: 500, gap: 8, height: 38, padding: "0 14px", background: "#fff", border: `1px solid ${pc.border}`, borderRadius: 2, fontSize: 13, fontWeight: 700, color: pc.ink, boxShadow: "0 4px 14px rgba(14,20,37,.15)" }}>
        {sat ? <MapIcon size={15} /> : <Satellite size={15} />} {sat ? "نقشه" : "ماهواره"}
      </button>
    </div>
  );
}

const VISIT_TIMES = ["هر زمان", "امروز", "فردا", "همین هفته", "آخر هفته"];
function VisitRequestForm({ p, onDone, compact }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState(VISIT_TIMES[0]);
  const [part, setPart] = useState("صبح");
  const [note, setNote] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [err, setErr] = useState("");
  const clean = toEnDigits(phone).replace(/\D/g, "");
  const valid = /^09\d{9}$/.test(clean);
  const submit = async (e) => {
    e.preventDefault();
    if (!valid) { setErr("شماره موبایل را درست وارد کنید (مثل ۰۹۱۲۱۲۳۴۵۶۷)"); return; }
    setState("sending"); setErr("");
    const { data, error } = await supabase.functions.invoke("visit-request", { body: { property_id: p.id, name: name.trim(), phone: clean, preferred_time: `${when} — ${part}`, note: note.trim(), website: hp } });
    if (error || data?.error) { setState("error"); setErr(data?.error || "ارسال نشد. لطفاً تماس بگیرید."); return; }
    setState("done"); onDone?.();
  };
  if (state === "done") return (
    <div style={{ textAlign: "center", padding: "18px 4px" }}>
      <span className="flex items-center justify-center" style={{ width: 52, height: 52, margin: "0 auto", borderRadius: "50%", background: pc.accentSoft, color: pc.brand }}><Check size={24} /></span>
      <p style={{ fontSize: 16, fontWeight: 800, marginTop: 14 }}>درخواست بازدید ثبت شد</p>
      <p style={{ fontSize: 13, color: pc.inkSoft, lineHeight: 2, marginTop: 6 }}>{OFFICE.agent} به‌زودی برای هماهنگی زمان بازدید با شما تماس می‌گیرد.</p>
    </div>
  );
  const label = { fontSize: 12, fontWeight: 700, color: pc.inkSoft, marginBottom: 6, display: "block" };
  return (
    <form onSubmit={submit} className="flex flex-col" style={{ gap: compact ? 12 : 14 }}>
      <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      <label><span style={label}>نام و نام خانوادگی</span><input className="fp-in" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="اختیاری" /></label>
      <label><span style={label}>شماره موبایل <b style={{ color: "#B42318" }}>*</b></span><input className="fp-in" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(""); }} inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09xx xxx xxxx" required style={{ textAlign: "right", borderColor: err ? "#B42318" : undefined }} /></label>
      <div className="grid grid-cols-2" style={{ gap: 10 }}>
        <label><span style={label}>روز بازدید</span><select className="fp-in" value={when} onChange={(e) => setWhen(e.target.value)}>{VISIT_TIMES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label><span style={label}>ساعت</span><select className="fp-in" value={part} onChange={(e) => setPart(e.target.value)}><option>صبح</option><option>عصر</option></select></label>
      </div>
      {!compact && <label><span style={label}>توضیحات</span><textarea className="fp-in" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="اختیاری" style={{ height: "auto", padding: 12, resize: "vertical" }} /></label>}
      {err && <p style={{ fontSize: 12.5, color: "#B42318", lineHeight: 1.9 }}>{err}</p>}
      <button type="submit" disabled={state === "sending"} className="fp-btn fp-btn-brand" style={{ width: "100%", height: 52, opacity: state === "sending" ? 0.7 : 1, border: "none" }}>
        {state === "sending" ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />} ثبت درخواست بازدید
      </button>
    </form>
  );
}

function OfficeCard({ p, onVisit }) {
  const wa = `https://wa.me/${OFFICE.wa}?text=${encodeURIComponent(`سلام، درباره‌ی فایل «${p.title}» در سایت Flora سؤال داشتم.`)}`;
  return (
    <div style={{ border: `1px solid ${pc.border}`, background: pc.surface, boxShadow: "0 18px 40px -30px rgba(14,20,37,0.35)" }}>
      <div style={{ padding: 24 }}>
        <p className="fp-eyebrow">تماس با دفتر</p>
        <div className="flex items-center" style={{ gap: 14, marginTop: 18 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: "50%", background: pc.accentSoft, color: pc.brand }}><User size={22} /></span>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800 }}>{OFFICE.name}</p>
            <p style={{ fontSize: 13, color: pc.inkSoft, marginTop: 2 }}>{OFFICE.tagline}</p>
            <p style={{ fontSize: 13, color: pc.ink, fontWeight: 700, marginTop: 2 }}>{OFFICE.agent}</p>
          </div>
        </div>
        <div className="flex flex-col" style={{ gap: 10, marginTop: 20 }}>
          <a href={`tel:${OFFICE.phone}`} className="fp-btn fp-btn-brand" style={{ height: 52, fontSize: 17 }}><Phone size={16} /> <span className="numeric">{OFFICE.phoneFa}</span></a>
          <a href={wa} target="_blank" rel="noreferrer" className="fp-btn fp-btn-line" style={{ height: 52 }}><MessageCircle size={16} /> گفتگو در واتس‌اپ</a>
          <button type="button" onClick={onVisit} className="fp-btn fp-btn-soft" style={{ height: 52 }}><CalendarDays size={16} /> درخواست بازدید</button>
        </div>
      </div>
      <div className="flex items-start" style={{ gap: 10, padding: "16px 24px", borderTop: `1px solid ${pc.border}`, background: pc.bg, fontSize: 13, color: pc.inkSoft, lineHeight: 2 }}>
        <MapPin size={15} color={pc.brand} className="shrink-0" style={{ marginTop: 6 }} />
        <span><b style={{ color: pc.ink }}>آدرس دفتر:</b> {OFFICE.address} — <a href={`https://www.google.com/maps/dir/?api=1&destination=${OFFICE.lat},${OFFICE.lng}`} target="_blank" rel="noreferrer" style={{ color: pc.brand, fontWeight: 700 }}>مسیریابی</a></span>
      </div>
    </div>
  );
}

function PublicPropertyDetailView({ slug, navigate }) {
  const [state, setState] = useState("loading");
  const [p, setP] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("public_properties").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (error || !data) { setState("error"); return; }
      setP(data); setActiveImg(0);
      setState("ready");
      const type = data.property_type || "ملک";
      const verb = dealVerb(data.deal);
      const path = `/properties/${encodeURIComponent(data.slug)}`;
      const imgs = [data.cover_path, ...(data.gallery_paths || [])].filter(Boolean).map(publicImageUrl);
      const bits = [data.area && `${faDigits(data.area)} متری`, data.rooms != null && `${faDigits(data.rooms)} خوابه`, data.address].filter(Boolean).join("، ");
      const desc = `${verb} ${type} در سرعین: ${bits}${data.price ? `، قیمت ${fmtToman(data.price)}` : ""}. عکس‌ها، موقعیت روی نقشه و درخواست بازدید — ${OFFICE.name}`;
      setMeta(`${data.title} | ${verb} ${type} در سرعین — ${OFFICE.name}`, desc, {
        path, image: imgs[0],
        jsonLd: [
          {
            "@context": "https://schema.org", "@type": "RealEstateListing", name: data.title, description: desc, url: SITE + path,
            identifier: propCode(data), inLanguage: "fa-IR", datePosted: data.updated_at, image: imgs,
            about: {
              "@type": type === "ویلا" ? "House" : "Apartment", name: data.title,
              ...(data.area ? { floorSize: { "@type": "QuantitativeValue", value: Number(data.area), unitCode: "MTK" } } : {}),
              ...(data.rooms != null ? { numberOfRooms: Number(data.rooms) } : {}),
              address: { "@type": "PostalAddress", addressCountry: "IR", addressRegion: "اردبیل", addressLocality: "سرعین", streetAddress: data.address || "" },
              ...(data.lat && data.lng ? { geo: { "@type": "GeoCoordinates", latitude: data.lat, longitude: data.lng } } : {}),
            },
            ...(data.price ? { offers: { "@type": "Offer", price: Number(data.price) * 10, priceCurrency: "IRR", availability: "https://schema.org/InStock", seller: { "@id": ORG_LD["@id"] } } } : {}),
          },
          {
            "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
              { "@type": "ListItem", position: 1, name: OFFICE.name, item: SITE + "/" },
              { "@type": "ListItem", position: 2, name: "خرید واحد در سرعین", item: SITE + "/properties" },
              { "@type": "ListItem", position: 3, name: data.title, item: SITE + path },
            ],
          },
        ],
      });
      const { data: sim } = await supabase.from("public_properties").select("*").eq("deal", data.deal).neq("id", data.id).order("updated_at", { ascending: false }).limit(3);
      if (!cancelled) setSimilar(sim || []);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const shell = (children) => (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} />
      {children}
    </div>
  );
  if (state === "loading") return shell(<div className="flex items-center justify-center" style={{ padding: 120 }}><Loader2 size={22} className="animate-spin" color={pc.muted} /></div>);
  if (state === "error" || !p) return shell(
    <div style={{ textAlign: "center", padding: 100 }}>
      <p style={{ fontSize: 15, color: pc.muted, marginBottom: 20 }}>این فایل پیدا نشد یا دیگر منتشر نیست.</p>
      <NavLink to="/properties" navigate={navigate} className="fp-btn fp-btn-brand">بازگشت به فایل‌ها</NavLink>
    </div>
  );

  const images = [p.cover_path, ...(p.gallery_paths || []).filter((g) => g !== p.cover_path)].filter(Boolean).map(publicImageUrl);
  const go = (d) => setActiveImg((i) => (i + d + images.length) % images.length);
  const specs = detailSpecs(p);
  const hasGeo = Number.isFinite(p.lat) && Number.isFinite(p.lng);
  const exact = p.price ? `${Number(p.price).toLocaleString("fa-IR")} تومان` : null;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink, paddingBottom: 0 }}>
      <PublicHeader navigate={navigate} />

      {/* Breadcrumb */}
      <div className="fp-shell" style={{ paddingTop: 20 }}>
        <nav aria-label="مسیر" className="flex items-center flex-wrap" style={{ gap: 8, fontSize: 12.5, color: pc.muted }}>
          <NavLink to="/" navigate={navigate} style={{ color: pc.muted, textDecoration: "none" }}>خانه</NavLink>
          <ChevronLeft size={13} />
          <NavLink to="/properties" navigate={navigate} style={{ color: pc.muted, textDecoration: "none" }}>خرید واحد در سرعین</NavLink>
          <ChevronLeft size={13} />
          <span style={{ color: pc.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>{p.title}</span>
        </nav>
      </div>

      {/* Gallery */}
      <section className="fp-shell" style={{ paddingTop: 16 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", maxHeight: 640, overflow: "hidden", background: pc.soft }}>
          {images[activeImg] ? (
            <img src={images[activeImg]} alt={`${p.title} — تصویر ${faDigits(activeImg + 1)}`} fetchpriority={activeImg === 0 ? "high" : "auto"} decoding="async" onClick={() => setFullscreen(true)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Building2 size={44} color={pc.muted} /></div>
          )}
          {images.length > 0 && (
            <span className="flex items-center" style={{ position: "absolute", top: 14, right: 14, gap: 8, height: 38, padding: "0 14px", background: "rgba(14,20,37,0.7)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 2 }}><Images size={15} /> تصاویر {faDigits(images.length)} مورد</span>
          )}
          {images.length > 0 && <button type="button" aria-label="تمام‌صفحه" onClick={() => setFullscreen(true)} className="fp-gbtn" style={{ position: "absolute", top: 14, left: 14 }}><Maximize2 size={17} /></button>}
          {images.length > 1 && (
            <>
              <button type="button" aria-label="قبلی" onClick={() => go(-1)} className="fp-gbtn" style={{ position: "absolute", top: "50%", right: 14, transform: "translateY(-50%)" }}><ChevronRight size={20} /></button>
              <button type="button" aria-label="بعدی" onClick={() => go(1)} className="fp-gbtn" style={{ position: "absolute", top: "50%", left: 14, transform: "translateY(-50%)" }}><ChevronLeft size={20} /></button>
              <span className="numeric" style={{ position: "absolute", bottom: 14, left: 14, background: "rgba(14,20,37,0.7)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 2 }}>{faDigits(activeImg + 1)} / {faDigits(images.length)}</span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <ul className="flex" style={{ gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
            {images.map((src, i) => (
              <li key={i} className="shrink-0"><button type="button" onClick={() => setActiveImg(i)} style={{ width: 96, height: 68, overflow: "hidden", padding: 0, borderRadius: 2, border: i === activeImg ? `2px solid ${pc.brand}` : `1px solid ${pc.border}`, opacity: i === activeImg ? 1 : 0.75 }}>
                <img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button></li>
            ))}
          </ul>
        )}
      </section>

      <div className="fp-shell" style={{ paddingTop: 32 }}>
        <style>{`@media (min-width: 860px) { .flora-pd-grid { grid-template-columns: 1fr 360px !important; align-items: start; } .flora-pd-aside { position: sticky; top: 100px; } }`}</style>
        <div className="flora-pd-grid" style={{ display: "grid", gap: 40, gridTemplateColumns: "1fr" }}>
          <div style={{ minWidth: 0 }}>
            {/* Title block */}
            <header>
              <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                {p.deal && <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: pc.brand, padding: "5px 12px", borderRadius: 2 }}>{p.deal}</span>}
                {p.property_type && <span style={{ fontSize: 12, fontWeight: 700, color: pc.brand, background: pc.accentSoft, padding: "5px 12px", borderRadius: 2 }}>{p.property_type}</span>}
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.6, marginTop: 14 }}>{p.title}</h1>
              {p.address && <p className="flex items-center" style={{ gap: 6, fontSize: 14, color: pc.inkSoft, marginTop: 8 }}><MapPin size={15} color={pc.brand} /> اردبیل، سرعین، {p.address}</p>}
              <div className="fp-price" style={{ marginTop: 24 }}>
                <div style={{ background: pc.surface, padding: 20 }}>
                  <p style={{ fontSize: 12, color: pc.muted }}>{p.deal === "رهن و اجاره" ? "مبلغ" : "قیمت فروش"}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: pc.brandDeep, marginTop: 6 }}>{p.price ? fmtToman(p.price) : "تماس بگیرید"}</p>
                  {exact && <p style={{ fontSize: 12, color: pc.muted, marginTop: 4 }}>{exact}</p>}
                </div>
                <div style={{ background: pc.surface, padding: 20 }}>
                  <p style={{ fontSize: 12, color: pc.muted }}>قیمت هر متر</p>
                  <p style={{ fontSize: 17, fontWeight: 800, marginTop: 8 }}>{ppm(p) ? fmtToman(ppm(p)) : "—"}</p>
                </div>
                <div style={{ background: pc.surface, padding: 20 }}>
                  <p style={{ fontSize: 12, color: pc.muted }}>تاریخ انتشار</p>
                  <p style={{ fontSize: 17, fontWeight: 800, marginTop: 8 }}>{jalaliShort(p.updated_at) || "—"}</p>
                </div>
              </div>
            </header>

            {/* Specs */}
            {specs.length > 0 && (
              <section style={{ marginTop: 44 }}>
                {sectionTitle("مشخصات ملک")}
                <dl className="fp-dl">
                  {specs.map(([Icon, label, value]) => (
                    <div key={label} style={{ background: pc.surface, padding: "18px 18px" }}>
                      <dt className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: pc.muted }}><Icon size={17} color={pc.brand} strokeWidth={1.7} /> {label}</dt>
                      <dd style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* Amenities */}
            {p.amenities?.length > 0 && (
              <section style={{ marginTop: 44 }}>
                {sectionTitle("امکانات")}
                <ul className="flex flex-wrap" style={{ gap: 10 }}>
                  {p.amenities.map((a) => (
                    <li key={a} className="flex items-center" style={{ gap: 8, fontSize: 14, fontWeight: 600, padding: "10px 16px", background: pc.surface, border: `1px solid ${pc.border}`, borderRadius: 2 }}>
                      <Check size={15} color={pc.brand} /> {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Map */}
            <section style={{ marginTop: 44 }}>
              {sectionTitle("موقعیت روی نقشه")}
              {p.address && <p className="flex items-center" style={{ gap: 6, fontSize: 14, color: pc.inkSoft, marginBottom: 14 }}><MapPin size={15} color={pc.brand} /> {p.address}</p>}
              {hasGeo ? (
                <>
                  <PropertyMap lat={p.lat} lng={p.lng} />
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="fp-btn fp-btn-sm fp-btn-line" style={{ marginTop: 12 }}><Navigation size={15} /> مسیریابی</a>
                </>
              ) : (
                <>
                  <PropertyMap lat={OFFICE.lat} lng={OFFICE.lng} />
                  <p className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 12, fontSize: 13.5, color: pc.inkSoft, lineHeight: 2 }}><MapIcon size={16} color={pc.brand} /> نقشه موقعیت دفتر را نشان می‌دهد؛ موقعیت دقیق این ملک را از {OFFICE.agent} بپرسید: <a href={`tel:${OFFICE.phone}`} className="numeric" style={{ color: pc.brand, fontWeight: 800, textDecoration: "none" }}>{OFFICE.phoneFa}</a></p>
                </>
              )}
            </section>

            {/* Visit request (inline, desktop + mobile) */}
            <section id="visit" style={{ marginTop: 44, padding: 24, background: pc.surface, border: `1px solid ${pc.border}` }}>
              {sectionTitle("درخواست بازدید")}
              <p style={{ fontSize: 14, color: pc.inkSoft, lineHeight: 2, marginTop: -8, marginBottom: 18 }}>شماره‌ی خود را بگذارید تا برای هماهنگی زمان بازدید با شما تماس بگیریم.</p>
              <VisitRequestForm p={p} />
            </section>
          </div>

          <aside className="flora-pd-aside"><OfficeCard p={p} onVisit={() => setVisitOpen(true)} /></aside>
        </div>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="fp-shell" style={{ paddingTop: 72 }}>
          <p className="fp-eyebrow">پیشنهاد</p>
          <h2 className="fp-h2" style={{ marginTop: 12, marginBottom: 28, fontSize: 26 }}>املاک مشابه</h2>
          <div className="fp-cards">{similar.map((s) => <PropertyCardPublic key={s.id} p={s} navigate={navigate} />)}</div>
        </section>
      )}

      <PublicFooter navigate={navigate} />
      <div className="fp-mbar" style={{ height: 76 }} />

      {/* Mobile sticky action bar */}
      <div className="fp-mbar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 45, gap: 8, padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: "rgba(255,255,255,0.97)", borderTop: `1px solid ${pc.border}`, boxShadow: "0 -8px 24px -16px rgba(14,20,37,.3)" }}>
        <a href={`tel:${OFFICE.phone}`} className="fp-btn fp-btn-brand" style={{ flex: 1, height: 50, padding: 0 }}><Phone size={16} /> تماس</a>
        <button type="button" onClick={() => setVisitOpen(true)} className="fp-btn fp-btn-soft" style={{ flex: 1.4, height: 50, padding: 0 }}><CalendarDays size={16} /> درخواست بازدید</button>
      </div>

      {visitOpen && (
        <div onClick={() => setVisitOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(14,20,37,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", background: pc.surface, padding: 24, position: "relative" }}>
            <button type="button" aria-label="بستن" onClick={() => setVisitOpen(false)} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: pc.soft, borderRadius: 2 }}><X size={16} /></button>
            <p style={{ fontSize: 18, fontWeight: 800 }}>درخواست بازدید</p>
            <p style={{ fontSize: 13, color: pc.inkSoft, marginTop: 4, marginBottom: 18, lineHeight: 1.9 }}>{p.title}</p>
            <VisitRequestForm p={p} compact />
          </div>
        </div>
      )}

      {fullscreen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setFullscreen(false)}>
          <button aria-label="بستن" onClick={() => setFullscreen(false)} style={{ position: "absolute", top: 16, left: 16, width: 40, height: 40, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2 }}><X size={18} color="#fff" /></button>
          {images.length > 1 && (
            <>
              <button aria-label="قبلی" onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ position: "absolute", right: 16, width: 44, height: 44, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2 }}><ChevronRight size={20} color="#fff" /></button>
              <button aria-label="بعدی" onClick={(e) => { e.stopPropagation(); go(1); }} style={{ position: "absolute", left: 16, width: 44, height: 44, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2 }}><ChevronLeft size={20} color="#fff" /></button>
            </>
          )}
          <img src={images[activeImg]} alt={p.title} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "96%", maxHeight: "90%", objectFit: "contain" }} />
          <span className="numeric" style={{ position: "absolute", bottom: 20, color: "#fff", fontSize: 13 }}>{faDigits(activeImg + 1)} / {faDigits(images.length)}</span>
        </div>
      )}
    </div>
  );
}

function PublicAboutView({ navigate }) {
  useEffect(() => { setMeta(`درباره ما — ${OFFICE.name}`, `${OFFICE.name}، ${OFFICE.tagline} با مدیریت ${OFFICE.agent}.`, { path: "/about" }); }, []);
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>درباره‌ی {OFFICE.name}</h1>
        <p style={{ fontSize: 14, color: pc.muted, lineHeight: 2.2 }}>
          {OFFICE.name} با مدیریت {OFFICE.agent}، در زمینه‌ی خرید و فروش واحد آپارتمانی، ویلا، زمین و پروژه‌های پیش‌فروش در سرعین فعالیت می‌کند. همه‌ی فایل‌ها پیش از انتشار بازدید می‌شوند و تا پایان معامله کنار خریدار و فروشنده هستیم. آدرس دفتر: {OFFICE.address}.
        </p>
      </div>
      <PublicFooter navigate={navigate} />
    </div>
  );
}

function PublicContactView({ navigate }) {
  useEffect(() => { setMeta(`تماس با ما — ${OFFICE.name}`, `تماس با ${OFFICE.name}: ${OFFICE.phoneFa} — ${OFFICE.address}`, { path: "/contact" }); }, []);
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>تماس با ما</h1>
        <div style={{ border: `1px solid ${pc.border}`, background: pc.surface, padding: 28 }}>
          <p style={{ fontSize: 18, fontWeight: 800 }}>{OFFICE.name}</p>
          <p style={{ fontSize: 14, color: pc.inkSoft, marginTop: 4 }}>{OFFICE.tagline}</p>
          <p className="flex items-center" style={{ gap: 10, fontSize: 15, marginTop: 22 }}><User size={16} color={pc.brand} /> {OFFICE.agent}</p>
          <p className="flex items-start" style={{ gap: 10, fontSize: 15, marginTop: 14, lineHeight: 2 }}><MapPin size={16} color={pc.brand} className="shrink-0" style={{ marginTop: 6 }} /> {OFFICE.address}</p>
          <div className="flex flex-wrap" style={{ gap: 10, marginTop: 24 }}>
            <a href={`tel:${OFFICE.phone}`} className="fp-btn fp-btn-brand"><Phone size={16} /> <span className="numeric">{OFFICE.phoneFa}</span></a>
            <a href={`https://wa.me/${OFFICE.wa}`} target="_blank" rel="noreferrer" className="fp-btn fp-btn-line"><MessageCircle size={16} /> واتس‌اپ</a>
          </div>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "36px 0 14px" }}>موقعیت دفتر روی نقشه</h2>
        <PropertyMap lat={OFFICE.lat} lng={OFFICE.lng} />
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${OFFICE.lat},${OFFICE.lng}`} target="_blank" rel="noreferrer" className="fp-btn fp-btn-sm fp-btn-line" style={{ marginTop: 12 }}><Navigation size={15} /> مسیریابی تا دفتر</a>
      </div>
      <PublicFooter navigate={navigate} />
    </div>
  );
}

export { PublicHomeView, PublicPropertiesListView, PublicPropertyDetailView, PublicAboutView, PublicContactView };
