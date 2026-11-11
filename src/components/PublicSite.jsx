import React, { useState, useEffect, useMemo } from "react";
import {
  Search, MapPin, Ruler, BedDouble, ArrowUpDown, Phone, MessageCircle, X,
  SlidersHorizontal, ChevronLeft, ChevronRight, Building2, Car, Warehouse, Home, Loader2,
  ArrowLeft, CalendarDays, Menu, Mail,
} from "lucide-react";
import { FLORA_GOLD, FloraMark } from "../lib/ui.jsx";
import { faDigits, fmtToman, isoToJalali, MONTHS_FA } from "../lib/format.js";
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

const CATEGORIES = [
  { to: "/properties?q=" + encodeURIComponent("آپارتمان"), title: "خرید آپارتمان در سرعین", text: "آپارتمان‌های سرعین که مشاوران ثبت کرده‌اند؛ هر فایل با قیمت، متراژ، تعداد خواب و عکس." },
  { to: "/properties?q=" + encodeURIComponent("ویلا"), title: "خرید ویلا در سرعین", text: "ویلاهای فروشی سرعین با متراژ، عکس و مشخصات کامل، مستقیم از دفتر مشاور." },
  { to: "/properties?deal=" + encodeURIComponent("رهن و اجاره"), title: "رهن و اجاره در سرعین", text: "فایل‌های رهن و اجاره‌ی به‌روز برای سکونت یا اقامت در سرعین." },
  { to: "/properties?deal=" + encodeURIComponent("پیش‌فروش"), title: "پیش‌فروش ملک در سرعین", text: "پروژه‌های پیش‌فروش سرعین برای خرید در مرحله‌ی ساخت با پرداخت مرحله‌ای." },
];

function setMeta(title, description) {
  document.title = title;
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
  m.content = description;
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
      <style>{PUBLIC_CSS}</style>
      <div className={`fp-shell fp-bar flex items-center justify-between ${scrolled ? "fp-small" : ""}`}>
        <NavLink to="/site" navigate={navigate} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <FloraMark size={34} color={textColor} stroke={1.5} />
          <span style={{ fontSize: 21, fontWeight: 800, color: textColor, letterSpacing: 1 }}>FLORA</span>
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
          <a href="/" className="fp-login items-center" style={{ height: 44, padding: "0 18px", border: `1px solid ${edge}`, borderRadius: 2, color: textColor, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>ورود مشاوران</a>
          <button className="fp-burger items-center justify-center" onClick={() => setMenu((m) => !m)} aria-label="منو" style={{ width: 44, height: 44, border: `1px solid ${edge}`, borderRadius: 2, background: "transparent" }}>
            {menu ? <X size={18} color={textColor} /> : <Menu size={18} color={textColor} />}
          </button>
        </div>
      </div>
      {menu && (
        <div className="fp-mobile fp-shell flex flex-col" style={{ borderTop: `1px solid ${pc.border}`, paddingBlock: 12 }}>
          {links.map(([to, label]) => <NavLink key={to} to={to} navigate={navigate} onClick={() => setMenu(false)} style={{ padding: "14px 0", fontSize: 15, fontWeight: 700, color: pc.ink, textDecoration: "none", borderBottom: `1px solid ${pc.border}` }}>{label}</NavLink>)}
          <a href="/" style={{ padding: "14px 0", fontSize: 15, fontWeight: 700, color: pc.brand, textDecoration: "none" }}>ورود مشاوران</a>
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
              <span style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>FLORA</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 2.2, color: "rgba(255,255,255,0.6)" }}>فایل‌های به‌روز خرید، رهن و اجاره‌ی ملک در سرعین — مستقیم از مشاوران املاک.</p>
          </div>
          <nav>
            <h2 style={h}>دسترسی سریع</h2>
            <div style={col}>
              <NavLink to="/properties" navigate={navigate} className="fp-flink">فایل‌ها</NavLink>
              <NavLink to="/about" navigate={navigate} className="fp-flink">درباره ما</NavLink>
              <NavLink to="/contact" navigate={navigate} className="fp-flink">ارتباط با ما</NavLink>
              <a href="/" className="fp-flink">ورود مشاوران</a>
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
              <a href="mailto:support@flora-crm.app" className="flex items-center" style={{ gap: 10, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}><Mail size={15} /> <span dir="ltr">support@flora-crm.app</span></a>
              <span className="flex items-center" style={{ gap: 10, fontSize: 14 }}><MapPin size={15} /> سرعین، استان اردبیل</span>
              <a href="/?legal=privacy" className="fp-flink">حریم خصوصی</a>
              <a href="/?legal=terms" className="fp-flink">شرایط استفاده</a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 12, marginTop: 56, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <p>© {faDigits(1405)} Flora — تمامی حقوق محفوظ است.</p>
          <p>همه‌ی فایل‌ها توسط مشاوران املاک ثبت و منتشر می‌شوند.</p>
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
function jalaliShort(iso) {
  if (!iso) return "";
  try { const [jy, jm, jd] = isoToJalali(iso.slice(0, 10)); return `${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)}`; } catch (e) { return ""; }
}

function PropertyCardPublic({ p, navigate }) {
  const img = publicImageUrl(p.cover_path);
  const specs = specGrid(p);
  return (
    <NavLink to={`/properties/${p.slug}`} navigate={navigate} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <div className="fp-card flex flex-col h-full" style={{ overflow: "hidden", background: pc.surface, border: "1px solid rgba(34,63,153,0.1)", boxShadow: "0 1px 3px rgba(14,20,37,0.05)" }}>
        <div style={{ width: "100%", aspectRatio: "4 / 3", background: pc.soft, position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(34,63,153,0.1)" }}>
          {img ? <img src={img} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
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
              {p.price_per_meter ? <span style={{ fontSize: 10.5, color: pc.muted }}>{fmtToman(p.price_per_meter)} در هر متر</span> : <span />}
              {p.updated_at && <span className="flex items-center" style={{ gap: 4, fontSize: 10, color: pc.muted }}><CalendarDays size={11} /> {jalaliShort(p.updated_at)}</span>}
            </div>
          </div></div>
        </div>
      </div>
    </NavLink>
  );
}

// ---------- Homepage ----------
function PublicHomeView({ navigate }) {
  const [latest, setLatest] = useState(null); // null = loading
  const [count, setCount] = useState(null);

  useEffect(() => { setMeta("Flora — فایل‌های ملکی سرعین", "خرید و رهن‌واجاره‌ی آپارتمان و ویلا در سرعین — فایل‌های به‌روز از مشاوران املاک."); }, []);
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
            <h1 className="fp-h1 fp-up" style={{ marginTop: 24, animationDelay: "120ms" }}>فایل ملکی بعدی‌ات<br />را این‌جا پیدا کن</h1>
            <p className="fp-up" style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 2.2, marginTop: 24, maxWidth: 520, animationDelay: "240ms" }}>فایل‌های به‌روز آپارتمان و ویلا در سرعین، مستقیم از مشاوران املاک — بدون واسطه.</p>
            <div className="flex flex-wrap items-center fp-up" style={{ gap: 12, marginTop: 40, animationDelay: "360ms" }}>
              <NavLink to="/properties" navigate={navigate} className="fp-btn fp-btn-brand">مشاهده فایل‌ها <ArrowLeft size={16} /></NavLink>
              <NavLink to="/contact" navigate={navigate} className="fp-btn fp-btn-ghost">ارتباط با ما</NavLink>
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
          <a href="/" className="fp-intent" style={{ background: pc.surface, color: pc.ink, border: `1px solid ${pc.border}`, boxShadow: "0 18px 40px -28px rgba(14,20,37,0.35)" }}>
            <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: pc.accentSoft, color: pc.brand, border: "1px solid rgba(34,63,153,0.15)" }}><Building2 size={20} /></span>
            <p style={{ marginTop: 28, fontSize: 12, fontWeight: 700, color: pc.accent }}>برای مشاوران املاک</p>
            <h3 style={{ marginTop: 8, fontSize: 28, fontWeight: 800, lineHeight: 1.4 }}>انتشار فایل</h3>
            <p style={{ marginTop: 12, maxWidth: 440, fontSize: 14, lineHeight: 2.2, color: pc.inkSoft }}>فایل‌ها، مشتریان و قراردادهایتان را در Flora مدیریت کنید و هر فایل را با یک دکمه روی سایت منتشر کنید.</p>
            <span className="flex items-center" style={{ gap: 12, marginTop: "auto", paddingTop: 28, fontSize: 14, fontWeight: 800 }}>ورود مشاوران {arrowDot(pc.brand, "#fff")}</span>
          </a>
        </div>
      </section>

      {/* Categories */}
      <section className="fp-sec" style={{ borderBottom: `1px solid ${pc.border}` }}>
        <div className="fp-shell">
          <div style={{ maxWidth: 760 }}>
            <p className="fp-eyebrow">املاک سرعین</p>
            <h2 className="fp-h2" style={{ marginTop: 20 }}>خرید و اجاره‌ی ملک در سرعین</h2>
            <p style={{ marginTop: 20, fontSize: 15, lineHeight: 2.3, color: pc.inkSoft }}>سرعین با چشمه‌های آب گرم و دامنه‌های سبلان، از پرمسافرترین شهرهای ایران است و ملک در آن هم برای سکونت و هم برای سرمایه‌گذاری خواهان دارد. فایل‌هایی که این‌جا می‌بینید مستقیم از دفتر مشاوران املاک منتشر و به‌روز نگه داشته می‌شوند.</p>
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
            <p className="fp-eyebrow">درباره‌ی Flora</p>
            <h2 className="fp-h2" style={{ marginTop: 20 }}>فایل‌ها را از خودِ مشاور ببینید، نه دست چندم</h2>
            <p style={{ marginTop: 20, fontSize: 15, lineHeight: 2.3, color: "rgba(255,255,255,0.7)" }}>Flora ابزار مدیریتی مشاوران املاک است — فایل‌هایی که این‌جا می‌بینید، مستقیم از دفتر همان مشاور منتشر شده و به‌روز نگه داشته می‌شود.</p>
            <NavLink to="/about" navigate={navigate} className="fp-btn fp-btn-ghost" style={{ marginTop: 40 }}>بیشتر بدانید <ArrowLeft size={16} /></NavLink>
          </div>
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
              <NavLink to="/contact" navigate={navigate} className="fp-btn fp-btn-line">راه‌های ارتباط با ما</NavLink>
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

  useEffect(() => { setMeta("فایل‌های ملکی — Flora", "فهرست فایل‌های آپارتمان و ویلای منتشرشده در Flora."); }, []);
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
        <h1 className="fp-h2" style={{ marginTop: 14, marginBottom: 28 }}>فایل‌های ملکی</h1>
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

// ---------- Property detail ----------
function PublicPropertyDetailView({ slug, navigate }) {
  const [state, setState] = useState("loading");
  const [p, setP] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("public_properties").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (error || !data) { setState("error"); return; }
      setP(data);
      setState("ready");
      setMeta(`${data.title} — Flora`, `${specLine(data)}${data.address ? " — " + data.address : ""}`.trim() || "فایل ملکی در Flora");
      let mOg = document.querySelector('meta[property="og:image"]');
      if (mOg && data.cover_path) mOg.setAttribute("content", publicImageUrl(data.cover_path));
      const { data: sim } = await supabase.from("public_properties").select("*").eq("deal", data.deal).neq("id", data.id).limit(4);
      if (!cancelled) setSimilar(sim || []);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === "loading") return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div className="flex items-center justify-center" style={{ padding: 100 }}><Loader2 size={22} className="animate-spin" color={pc.muted} /></div>
    </div>
  );
  if (state === "error" || !p) return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif" }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div style={{ textAlign: "center", padding: 100 }}>
        <p style={{ fontSize: 14, color: pc.muted, marginBottom: 16 }}>این فایل پیدا نشد یا دیگر منتشر نیست.</p>
        <NavLink to="/properties" navigate={navigate} style={{ fontSize: 13, color: pc.accent, fontWeight: 700, textDecoration: "none" }}>بازگشت به فایل‌ها</NavLink>
      </div>
    </div>
  );

  const images = [p.cover_path, ...(p.gallery_paths || []).filter((g) => g !== p.cover_path)].filter(Boolean).map(publicImageUrl);
  const waLink = p.agent_phone ? `https://wa.me/${p.agent_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`سلام، درباره‌ی «${p.title}» توی Flora سؤال داشتم.`)}` : null;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />

      {/* Gallery */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 20px 0" }}>
        <div onClick={() => setFullscreen(true)} style={{ width: "100%", aspectRatio: "16 / 10", overflow: "hidden", background: pc.accentSoft, cursor: "zoom-in", position: "relative" }}>
          {images[activeImg] ? <img src={images[activeImg]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
            <div className="w-full h-full flex items-center justify-center"><Building2 size={40} color={pc.muted} /></div>
          )}
          {images.length > 1 && (
            <span style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(14,20,37,0.65)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 2, padding: "4px 10px" }}>{faDigits(activeImg + 1)} / {faDigits(images.length)}</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex" style={{ gap: 8, marginTop: 10, overflowX: "auto" }}>
            {images.map((src, i) => (
              <button key={i} onClick={() => setActiveImg(i)} style={{ width: 64, height: 64, borderRadius: 2, overflow: "hidden", flexShrink: 0, border: i === activeImg ? `2px solid ${pc.accent}` : `1px solid ${pc.border}`, padding: 0 }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 20px 0" }}>
        <nav className="flex items-center flex-wrap" style={{ gap: 6, fontSize: 11, color: pc.muted }}>
          <NavLink to="/site" navigate={navigate} style={{ color: pc.muted, textDecoration: "none" }}>خانه</NavLink>
          <span>/</span>
          <NavLink to="/properties" navigate={navigate} style={{ color: pc.muted, textDecoration: "none" }}>فایل‌ها</NavLink>
          <span>/</span>
          <span style={{ color: pc.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{p.title}</span>
        </nav>
      </div>

      {/* Two-column body: content + sticky agent sidebar (desktop) */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 20px 0" }}>
        <style>{`@media (min-width: 860px) { .flora-pd-grid { grid-template-columns: 1fr 320px !important; align-items: start; } .flora-pd-aside { position: sticky; top: 96px; } }`}</style>
        <div className="flora-pd-grid" style={{ display: "grid", gap: 32, gridTemplateColumns: "1fr" }}>
          {/* Main column */}
          <div>
            <div className="flex flex-wrap items-center" style={{ gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: pc.accent, background: pc.accentSoft, borderRadius: 2, padding: "4px 10px" }}>{p.deal}</span>
              {p.property_type && <span style={{ fontSize: 10.5, fontWeight: 600, color: pc.muted }}>{p.property_type}</span>}
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.6 }}>{p.title}</h1>
            {p.address && <p className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: pc.muted, marginTop: 8 }}><MapPin size={12} /> {p.address}</p>}

            {/* Price block */}
            <div className="flex flex-wrap items-end" style={{ gap: 28, marginTop: 20, paddingBlock: 20, borderBlock: `1px solid ${pc.border}` }}>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: pc.muted, letterSpacing: 1 }}>قیمت</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: pc.brandDeep, marginTop: 6 }}>{p.price ? fmtToman(p.price) : "تماس بگیرید"}</p>
              </div>
              {p.price_per_meter ? (
                <div>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: pc.muted, letterSpacing: 1 }}>قیمت هر متر</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: pc.ink, marginTop: 6 }}>{fmtToman(p.price_per_meter)}</p>
                </div>
              ) : null}
            </div>

            {/* Spec grid — same dt/dd pattern as the reference, filled only
                with fields Flora's property model actually has. Nothing
                invented to fill empty cells. */}
            {specGrid(p).length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>مشخصات ملک</h2>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 1, background: pc.border, borderRadius: 0, overflow: "hidden" }}>
                  {specGrid(p).map((s) => (
                    <div key={s.label} style={{ background: pc.surface, padding: 16 }}>
                      <p style={{ fontSize: 10.5, color: pc.muted }}>{s.label}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: pc.ink, marginTop: 6 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {p.amenities?.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>امکانات</h2>
                <ul className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                  {p.amenities.map((a) => (
                    <li key={a} className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: pc.ink }}>
                      <span style={{ width: 5, height: 5, borderRadius: 2, background: pc.accent, flexShrink: 0 }} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Agent sidebar */}
          <aside className="flora-pd-aside">
            <div style={{ border: `1px solid ${pc.border}`, borderRadius: 2, padding: 22, background: pc.surface }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: pc.accent, letterSpacing: 1, marginBottom: 14 }}>تماس با مشاور</p>
              <p style={{ fontSize: 16, fontWeight: 800 }}>{p.agent_name || "مشاور Flora"}</p>
              {p.agency_name && <p style={{ fontSize: 12, color: pc.muted, marginTop: 3 }}>{p.agency_name}</p>}
              <div className="flex flex-col" style={{ gap: 10, marginTop: 18 }}>
                {p.agent_phone && <a href={`tel:${p.agent_phone}`} className="flex items-center justify-center" style={{ gap: 6, padding: "13px", borderRadius: 2, background: pc.brand, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><Phone size={14} /> تماس</a>}
                {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center" style={{ gap: 6, padding: "13px", borderRadius: 2, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><MessageCircle size={14} /> گفتگو در واتساپ</a>}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "56px 20px 0" }}>
          <p className="fp-eyebrow">پیشنهاد</p>
          <h2 className="fp-h2" style={{ marginTop: 12, marginBottom: 28, fontSize: 26 }}>فایل‌های مشابه</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 24 }}>
            {similar.map((s) => <PropertyCardPublic key={s.id} p={s} navigate={navigate} />)}
          </div>
        </div>
      )}

      <PublicFooter navigate={navigate} />

      {fullscreen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setFullscreen(false)}>
          <button onClick={() => setFullscreen(false)} style={{ position: "absolute", top: 16, left: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color="#fff" /></button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i - 1 + images.length) % images.length); }} style={{ position: "absolute", right: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={18} color="#fff" /></button>
              <button onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i + 1) % images.length); }} style={{ position: "absolute", left: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={18} color="#fff" /></button>
            </>
          )}
          <img src={images[activeImg]} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "94%", maxHeight: "88%", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

function PublicAboutView({ navigate }) {
  useEffect(() => { setMeta("درباره ما — Flora", "Flora ابزار مدیریت فایل ملکی برای مشاوران املاک سرعین."); }, []);
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>درباره‌ی Flora</h1>
        <p style={{ fontSize: 14, color: pc.muted, lineHeight: 2.2 }}>
          Flora ابزاری‌ست که مشاوران املاک با آن فایل‌های ملکی، مشتریان و قراردادهایشان را مدیریت می‌کنند. این صفحه، فایل‌هایی رو نشون می‌ده که خودِ مشاور تصمیم گرفته عمومی و قابل‌مشاهده باشن — مستقیم از همون دفتری که فایل رو ثبت کرده.
        </p>
      </div>
      <PublicFooter navigate={navigate} />
    </div>
  );
}

function PublicContactView({ navigate }) {
  useEffect(() => { setMeta("تماس با ما — Flora", "راه‌های ارتباط با Flora."); }, []);
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>تماس با ما</h1>
        <p style={{ fontSize: 14, color: pc.muted, lineHeight: 2.2, marginBottom: 20 }}>برای هر فایل، اطلاعات تماس همون مشاوری که فایل رو منتشر کرده، پایین صفحه‌ی همون فایل هست.</p>
        <p style={{ fontSize: 13, color: pc.ink }}>ایمیل: <span dir="ltr">support@flora-crm.app</span></p>
      </div>
      <PublicFooter navigate={navigate} />
    </div>
  );
}

export { PublicHomeView, PublicPropertiesListView, PublicPropertyDetailView, PublicAboutView, PublicContactView };
