import React, { useState, useEffect, useMemo } from "react";
import {
  Search, MapPin, Ruler, BedDouble, ArrowUpDown, Phone, MessageCircle, X,
  SlidersHorizontal, ChevronLeft, ChevronRight, Building2, Car, Warehouse, Home, Loader2,
  ArrowLeft, CalendarDays,
} from "lucide-react";
import { FLORA_GOLD, FloraMark } from "../lib/ui.jsx";
import { faDigits, fmtToman, isoToJalali, MONTHS_FA } from "../lib/format.js";
import { supabase } from "../lib/supabaseClient.js";
import { publicImageUrl } from "../lib/publicPropertiesApi.js";

// ---------- shared light "editorial" palette — deliberately not the CRM's
// own dark/glass interior. Warm neutrals, one accent (the brand gold),
// generous whitespace, almost no shadow. ----------
const pc = {
  bg: "#FBFAF8", surface: "#FFFFFF", border: "#EDEAE3", ink: "#1C1A17", muted: "#8A8378",
  accent: FLORA_GOLD, accentSoft: "#F4EEE3",
};

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

function PublicHeader({ navigate, onSearchClick, dark }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Over a dark hero, header text starts white and switches to the normal
  // ink color once the header itself goes solid on scroll — the same
  // "transparent over image, solid once scrolled" pattern real estate
  // sites use so the hero photo isn't immediately covered by a bar.
  const overDark = dark && !scrolled;
  const textColor = overDark ? "#fff" : pc.ink;
  const mutedColor = overDark ? "rgba(255,255,255,0.75)" : pc.muted;
  return (
    <header style={{ position: overDark ? "absolute" : "sticky", top: 0, left: 0, right: 0, zIndex: 40, background: scrolled ? "rgba(251,250,248,0.92)" : "transparent", backdropFilter: scrolled ? "blur(10px)" : "none", borderBottom: scrolled ? `1px solid ${pc.border}` : "1px solid transparent", transition: "all 220ms ease" }}>
      <div className="flex items-center justify-between" style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px" }}>
        <NavLink to="/site" navigate={navigate} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <FloraMark size={26} color={textColor} stroke={1.5} />
          <span style={{ fontSize: 17, fontWeight: 800, color: textColor, letterSpacing: 0.5 }}>FLORA</span>
        </NavLink>
        <nav className="hidden md-flex" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <NavLink to="/properties" navigate={navigate} style={{ fontSize: 13, fontWeight: 600, color: textColor, textDecoration: "none" }}>فایل‌ها</NavLink>
          <NavLink to="/about" navigate={navigate} style={{ fontSize: 13, fontWeight: 600, color: textColor, textDecoration: "none" }}>درباره ما</NavLink>
          <NavLink to="/contact" navigate={navigate} style={{ fontSize: 13, fontWeight: 600, color: textColor, textDecoration: "none" }}>تماس</NavLink>
          {/* Deliberately a plain <a>, NOT routed through NavLink's
              client-side navigate() — this has to be a real, full page
              reload. The public site and the Agent CRM are rendered by two
              completely different branches of the same top-level component,
              and swapping between them without a full remount is the one
              transition that would actually change how many hooks that
              component calls mid-render. */}
          <a href="/" style={{ fontSize: 13, fontWeight: 600, color: mutedColor, textDecoration: "none" }}>ورود مشاوران</a>
        </nav>
        <button onClick={onSearchClick} aria-label="جستجو" style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${overDark ? "rgba(255,255,255,0.3)" : pc.border}`, background: overDark ? "transparent" : pc.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Search size={15} color={textColor} />
        </button>
      </div>
    </header>
  );
}

function PublicFooter({ navigate }) {
  return (
    <footer style={{ borderTop: `1px solid ${pc.border}`, marginTop: 80, padding: "40px 20px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 14 }}>
          <FloraMark size={20} color={pc.ink} stroke={1.5} />
          <span style={{ fontSize: 14, fontWeight: 800, color: pc.ink }}>FLORA</span>
        </div>
        <div className="flex flex-wrap items-center" style={{ gap: 20, marginBottom: 18 }}>
          <NavLink to="/properties" navigate={navigate} style={{ fontSize: 12, color: pc.muted, textDecoration: "none" }}>فایل‌ها</NavLink>
          <NavLink to="/about" navigate={navigate} style={{ fontSize: 12, color: pc.muted, textDecoration: "none" }}>درباره ما</NavLink>
          <NavLink to="/contact" navigate={navigate} style={{ fontSize: 12, color: pc.muted, textDecoration: "none" }}>تماس</NavLink>
          <a href="/?legal=privacy" style={{ fontSize: 12, color: pc.muted, textDecoration: "none" }}>حریم خصوصی</a>
          <a href="/?legal=terms" style={{ fontSize: 12, color: pc.muted, textDecoration: "none" }}>شرایط استفاده</a>
        </div>
        <p style={{ fontSize: 11, color: pc.muted }}>© {faDigits(1405)} Flora — همه‌ی فایل‌ها توسط مشاوران املاک ثبت و منتشر می‌شوند.</p>
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
  if (p.area) items.push({ label: "متراژ", value: `${faDigits(p.area)} متر` });
  if (p.rooms != null) items.push({ label: "خواب", value: `${faDigits(p.rooms)} خواب` });
  if (p.floor != null) items.push({ label: "طبقه", value: `طبقه ${faDigits(p.floor)}` });
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
      <div className="flex flex-col h-full" style={{ borderRadius: 4, overflow: "hidden", background: pc.surface, border: `1px solid ${pc.border}`, boxShadow: "0 1px 3px rgba(28,26,23,0.05)", transition: "box-shadow 300ms ease, transform 300ms ease" }}>
        <div style={{ width: "100%", aspectRatio: "4 / 3", background: pc.accentSoft, position: "relative" }}>
          {img ? <img src={img} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
            <div className="w-full h-full flex items-center justify-center"><Building2 size={26} color={pc.muted} /></div>
          )}
        </div>
        <div className="flex flex-1 flex-col" style={{ padding: "16px 18px 18px" }}>
          <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: pc.accent }}>{p.property_type || "ملک"}</span>
            <span style={{ fontSize: 10, color: pc.muted, background: pc.accentSoft, borderRadius: 3, padding: "2px 7px" }}>{p.deal}</span>
          </div>
          <p style={{ fontSize: 15.5, fontWeight: 700, color: pc.ink, lineHeight: 1.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
          {(p.city || p.address) && <p className="flex items-center" style={{ gap: 5, fontSize: 12, color: pc.muted, marginTop: 4 }}><MapPin size={12} className="shrink-0" style={{ opacity: 0.6 }} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.city || p.address}</span></p>}

          {specs.length > 0 && (
            <div className="grid" style={{ gridTemplateColumns: `repeat(${specs.length}, 1fr)`, gap: 1, marginTop: 14, borderRadius: 4, overflow: "hidden", background: pc.border }}>
              {specs.map((s) => (
                <div key={s.label} className="flex flex-col items-center" style={{ background: pc.accentSoft, padding: "9px 4px", textAlign: "center" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: pc.ink }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${pc.border}` }}>
            <div className="flex items-end justify-between">
              <div>
                <p style={{ fontSize: 10.5, color: pc.muted }}>قیمت</p>
                <p style={{ fontSize: 15.5, fontWeight: 800, color: pc.accent, marginTop: 2 }}>{p.price ? fmtToman(p.price) : "تماس بگیرید"}</p>
              </div>
              <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 3, background: pc.ink, color: "#fff" }}><ArrowLeft size={14} /></span>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
              {p.price_per_meter ? <span style={{ fontSize: 10.5, color: pc.muted }}>{fmtToman(p.price_per_meter)} در هر متر</span> : <span />}
              {p.updated_at && <span className="flex items-center" style={{ gap: 4, fontSize: 10, color: pc.muted }}><CalendarDays size={11} /> {jalaliShort(p.updated_at)}</span>}
            </div>
          </div>
        </div>
      </div>
    </NavLink>
  );
}

// ---------- Homepage ----------
function PublicHomeView({ navigate }) {
  const [latest, setLatest] = useState(null); // null = loading
  const [count, setCount] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => { setMeta("Flora — فایل‌های ملکی سرعین", "خرید و رهن‌واجاره‌ی آپارتمان و ویلا در سرعین — فایل‌های به‌روز از مشاوران املاک."); }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("public_properties").select("*").order("updated_at", { ascending: false }).limit(6);
      if (!cancelled) setLatest(data || []);
      const { count: c } = await supabase.from("public_properties").select("id", { count: "exact", head: true });
      if (!cancelled) setCount(c ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/properties?q=${encodeURIComponent(q.trim())}` : "/properties");
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} dark />

      {/* Hero — full-bleed dark, generous vertical rhythm, one clear CTA
          pair. The brand mark stands in for a location photograph rather
          than reaching for a generic stock image. */}
      <div className="relative" style={{ minHeight: "78vh", display: "flex", alignItems: "flex-end", overflow: "hidden", background: pc.ink }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FloraMark size={520} color="#fff" stroke={0.6} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(28,26,23,0.96) 10%, rgba(28,26,23,0.55) 55%, rgba(28,26,23,0.25) 100%)" }} />
        <div className="relative" style={{ maxWidth: 1100, margin: "0 auto", padding: "160px 20px 72px", width: "100%" }}>
          <div style={{ maxWidth: 620 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: pc.accent, letterSpacing: 2, marginBottom: 18 }}>سرعین، استان اردبیل</p>
            <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.4, color: "#fff" }}>فایل ملکی بعدی‌ات<br />را این‌جا پیدا کن</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 2, marginTop: 20, maxWidth: 440 }}>فایل‌های به‌روز آپارتمان و ویلا در سرعین، مستقیم از مشاوران املاک — بدون واسطه.</p>
            <form onSubmit={submitSearch} className="flex items-center" style={{ maxWidth: 440, marginTop: 32, gap: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 4, padding: 6, backdropFilter: "blur(6px)" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی محله، نوع ملک..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "9px 14px", fontSize: 13, color: "#fff" }} />
              <button type="submit" className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 3, background: pc.accent }}><Search size={14} color="#1C1A17" /></button>
            </form>
            {count != null && count > 0 && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 28 }}><b className="numeric" style={{ color: "#fff", fontWeight: 800 }}>{faDigits(count)}</b> فایل فعال روی سایت</p>
            )}
          </div>
        </div>
      </div>

      {/* Latest properties */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>جدیدترین فایل‌ها</h2>
          <NavLink to="/properties" navigate={navigate} style={{ fontSize: 12, color: pc.accent, fontWeight: 700, textDecoration: "none" }}>مشاهده همه ‹</NavLink>
        </div>
        {latest === null ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}><Loader2 size={20} className="animate-spin" color={pc.muted} /></div>
        ) : latest.length === 0 ? (
          <p style={{ fontSize: 13, color: pc.muted, textAlign: "center", padding: 60 }}>هنوز فایلی منتشر نشده است.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {latest.map((p) => <PropertyCardPublic key={p.id} p={p} navigate={navigate} />)}
          </div>
        )}
      </div>

      {/* About blurb */}
      <div style={{ maxWidth: 640, margin: "80px auto 0", padding: "0 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>درباره‌ی Flora</h2>
        <p style={{ fontSize: 13, color: pc.muted, lineHeight: 2.1 }}>Flora ابزار مدیریتی مشاوران املاک است — فایل‌هایی که اینجا می‌بینی، مستقیم از دفتر همان مشاور منتشر شده و به‌روز نگه داشته می‌شود.</p>
      </div>

      <PublicFooter navigate={navigate} />
    </div>
  );
}

// ---------- Listing ----------
const DEAL_OPTIONS = ["همه", "فروش", "رهن و اجاره", "پیش‌فروش"];

function PublicPropertiesListView({ navigate }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [deal, setDeal] = useState("همه");
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
        const hay = `${p.title || ""} ${p.address || ""} ${p.city || ""}`;
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
            <button key={d} onClick={() => setDeal(d)} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 999, border: `1px solid ${deal === d ? pc.ink : pc.border}`, background: deal === d ? pc.ink : "transparent", color: deal === d ? "#fff" : pc.ink }}>{d}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 14 }}>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداقل متراژ</p><input value={minArea} onChange={(e) => setMinArea(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداکثر متراژ</p><input value={maxArea} onChange={(e) => setMaxArea(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداقل قیمت</p><input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>حداکثر قیمت</p><input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
        <div><p style={{ fontSize: 11, color: pc.muted, marginBottom: 6 }}>تعداد خواب</p><input value={rooms} onChange={(e) => setRooms(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", border: `1px solid ${pc.border}`, borderRadius: 10, padding: "9px 10px", fontSize: 12, outline: "none" }} /></div>
      </div>
    </>
  );

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink }}>
      <PublicHeader navigate={navigate} onSearchClick={() => setFiltersOpen(true)} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 0" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>فایل‌های ملکی</h1>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 22 }}>
          <div className="flex-1 flex items-center" style={{ gap: 8, background: pc.surface, border: `1px solid ${pc.border}`, borderRadius: 999, padding: "9px 14px" }}>
            <Search size={13} color={pc.muted} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5 }} />
          </div>
          <button onClick={() => setFiltersOpen(true)} className="flex items-center" style={{ gap: 6, border: `1px solid ${pc.border}`, borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18, paddingBottom: 40 }}>
              {filtered.map((p) => <PropertyCardPublic key={p.id} p={p} navigate={navigate} />)}
            </div>
            {filtered.length === 0 && <p style={{ fontSize: 13, color: pc.muted, textAlign: "center", padding: 60 }}>فایلی با این مشخصات پیدا نشد.</p>}
          </>
        )}
      </div>
      <PublicFooter navigate={navigate} />

      {/* Mobile filter bottom sheet */}
      {filtersOpen && (
        <div className="md-hidden" style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(28,26,23,0.45)", display: "flex", alignItems: "flex-end" }} onClick={() => setFiltersOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: pc.surface, borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "80vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 800 }}>فیلتر</p>
              <button onClick={() => setFiltersOpen(false)} style={{ width: 30, height: 30, borderRadius: "50%", background: pc.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
            </div>
            {FilterFields}
            <button onClick={() => setFiltersOpen(false)} style={{ width: "100%", marginTop: 20, padding: "13px", borderRadius: 999, background: pc.ink, color: "#fff", fontWeight: 700, fontSize: 13 }}>اعمال فیلتر</button>
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        <div onClick={() => setFullscreen(true)} style={{ width: "100%", aspectRatio: "16 / 10", borderRadius: 20, overflow: "hidden", background: pc.accentSoft, cursor: "zoom-in", position: "relative" }}>
          {images[activeImg] ? <img src={images[activeImg]} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
            <div className="w-full h-full flex items-center justify-center"><Building2 size={40} color={pc.muted} /></div>
          )}
          {images.length > 1 && (
            <span style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(28,26,23,0.65)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px" }}>{faDigits(activeImg + 1)} / {faDigits(images.length)}</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex" style={{ gap: 8, marginTop: 10, overflowX: "auto" }}>
            {images.map((src, i) => (
              <button key={i} onClick={() => setActiveImg(i)} style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: i === activeImg ? `2px solid ${pc.accent}` : `1px solid ${pc.border}`, padding: 0 }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        <nav className="flex items-center flex-wrap" style={{ gap: 6, fontSize: 11, color: pc.muted }}>
          <NavLink to="/site" navigate={navigate} style={{ color: pc.muted, textDecoration: "none" }}>خانه</NavLink>
          <span>/</span>
          <NavLink to="/properties" navigate={navigate} style={{ color: pc.muted, textDecoration: "none" }}>فایل‌ها</NavLink>
          <span>/</span>
          <span style={{ color: pc.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{p.title}</span>
        </nav>
      </div>

      {/* Two-column body: content + sticky agent sidebar (desktop) */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        <style>{`@media (min-width: 860px) { .flora-pd-grid { grid-template-columns: 1fr 320px !important; align-items: start; } .flora-pd-aside { position: sticky; top: 96px; } }`}</style>
        <div className="flora-pd-grid" style={{ display: "grid", gap: 32, gridTemplateColumns: "1fr" }}>
          {/* Main column */}
          <div>
            <div className="flex flex-wrap items-center" style={{ gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: pc.accent, background: pc.accentSoft, borderRadius: 3, padding: "4px 10px" }}>{p.deal}</span>
              {p.property_type && <span style={{ fontSize: 10.5, fontWeight: 600, color: pc.muted }}>{p.property_type}</span>}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.6 }}>{p.title}</h1>
            {p.address && <p className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: pc.muted, marginTop: 8 }}><MapPin size={12} /> {p.address}</p>}

            {/* Price block */}
            <div className="flex flex-wrap items-end" style={{ gap: 28, marginTop: 20, paddingBlock: 20, borderBlock: `1px solid ${pc.border}` }}>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: pc.muted, letterSpacing: 1 }}>قیمت</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: pc.ink, marginTop: 6 }}>{p.price ? fmtToman(p.price) : "تماس بگیرید"}</p>
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
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 1, background: pc.border, borderRadius: 4, overflow: "hidden" }}>
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
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: pc.accent, flexShrink: 0 }} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Agent sidebar */}
          <aside className="flora-pd-aside">
            <div style={{ border: `1px solid ${pc.border}`, borderRadius: 6, padding: 22, background: pc.surface }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: pc.accent, letterSpacing: 1, marginBottom: 14 }}>تماس با مشاور</p>
              <p style={{ fontSize: 16, fontWeight: 800 }}>{p.agent_name || "مشاور Flora"}</p>
              {p.agency_name && <p style={{ fontSize: 12, color: pc.muted, marginTop: 3 }}>{p.agency_name}</p>}
              <div className="flex flex-col" style={{ gap: 10, marginTop: 18 }}>
                {p.agent_phone && <a href={`tel:${p.agent_phone}`} className="flex items-center justify-center" style={{ gap: 6, padding: "13px", borderRadius: 6, background: pc.ink, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><Phone size={14} /> تماس</a>}
                {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center" style={{ gap: 6, padding: "13px", borderRadius: 6, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><MessageCircle size={14} /> گفتگو در واتساپ</a>}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px 0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>فایل‌های مشابه</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
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
