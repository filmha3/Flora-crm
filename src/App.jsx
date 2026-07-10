import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Home, Building2, Users, Calendar, Search, Plus, X,
  Moon, Sun, Sparkles, MapPin, Ruler, UserCircle2, PhoneCall,
  CheckCircle2, Loader2, MoreHorizontal, Trash2, ArrowRight,
  ImagePlus, Play, ChevronLeft as ChevL, ChevronRight as ChevR,
  Hammer, LocateFixed, CalendarDays, Trees, Store, Briefcase,
  ArrowUpDown, BadgeCheck, RotateCcw
} from "lucide-react";

// Property type -> icon, so cards feel purpose-built instead of generic
const TYPE_ICON = { "آپارتمان": Building2, "ویلا": Home, "زمین": Trees, "مغازه": Store, "اداری": Briefcase };
const typeIcon = (t) => TYPE_ICON[t] || Building2;

// ---------- Jalali (Persian) calendar helpers ----------
const div = (a, b) => Math.floor(a / b);
const faDigits = (v) => String(v).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const MONTHS_FA = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const WEEK_FA = ["ش","ی","د","س","چ","پ","ج"];
const LEAP_CYCLE = [1, 5, 9, 13, 17, 22, 26, 30];
const isLeapJalali = (jy) => LEAP_CYCLE.includes(((jy % 33) + 33) % 33);

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div(((jy % 33) + 3), 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
  const gd0 = days + 1;
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, isLeapG ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0, gd = gd0;
  for (gm = 1; gm <= 12; gm++) { if (gd <= sal[gm]) break; gd -= sal[gm]; }
  return [gy, gm, gd];
}
const isoToJalali = (iso) => { const [gy, gm, gd] = iso.split("-").map(Number); return gregorianToJalali(gy, gm, gd); };
const jalaliToIso = (jy, jm, jd) => { const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd); return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`; };
const fmtJalali = (iso) => { const [jy, jm, jd] = isoToJalali(iso); return `${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)}`; };
const jalaliMonthLength = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJalali(jy) ? 30 : 29);
const jalaliFirstWeekday = (jy, jm) => { const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1); return (new Date(gy, gm - 1, gd).getDay() + 1) % 7; };

// ---------- iOS-style dark-blue liquid-glass tokens (borderless, shadow-based) ----------
const T = {
  dark: {
    bg: "#070B14",
    orb1: "#1D4ED8", orb2: "#0EA5E9",
    surface: "rgba(21,28,46,0.62)", surface2: "rgba(255,255,255,0.06)",
    ink: "#EAF1FF", muted: "#8A93A8",
    primary: "#3B82F6", primarySoft: "rgba(59,130,246,0.18)",
    attn: "#FFB020", attnSoft: "rgba(255,176,32,0.16)",
    danger: "#FF5A52",
    shadow: "0 14px 34px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  light: {
    bg: "#EEF2FA",
    orb1: "#3B82F6", orb2: "#38BDF8",
    surface: "rgba(255,255,255,0.7)", surface2: "rgba(255,255,255,0.5)",
    ink: "#0B1220", muted: "#5B6472",
    primary: "#2563EB", primarySoft: "rgba(37,99,235,0.12)",
    attn: "#E8960B", attnSoft: "rgba(232,150,11,0.14)",
    danger: "#DC3D2E",
    shadow: "0 14px 30px -14px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.6)",
  },
};
const glass = (c, blur = 26) => ({
  background: c.surface,
  backdropFilter: `blur(${blur}px) saturate(180%)`,
  WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
  boxShadow: c.shadow,
});

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtToman = (n) => (n ? Math.round(n).toLocaleString("fa-IR") : "۰") + " تومان";
const todayISO = () => new Date().toISOString().slice(0, 10);
const filesToMedia = (fileList) =>
  Promise.all(
    Array.from(fileList).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ id: uid(), type: file.type.startsWith("video") ? "video" : "image", url: reader.result, name: file.name });
          reader.readAsDataURL(file);
        })
    )
  );

// ---------- Seed data ----------
const seedOwners = [
  { id: "o1", name: "آقای رحیمی", phone: "09121234567" },
  { id: "o2", name: "خانم صادقی", phone: "09351234567" },
];
const seedBuilders = [{ id: "b1", name: "شرکت سازه پارس", phone: "02122223333" }];
const seedProperties = [
  { id: "p1", title: "آپارتمان ۱۲۰ متری سعادت‌آباد", type: "آپارتمان", deal: "فروش", pricePerMeter: 70000000, price: 8400000000, area: 120, rooms: 2, address: "سعادت‌آباد، خیابان سرو", ownerId: "o1", builderId: "", status: "فعال", desc: "", media: [] },
  { id: "p2", title: "ویلا دوبلکس لواسان", type: "ویلا", deal: "اجاره", pricePerMeter: 150000, price: 45000000, area: 300, rooms: 4, address: "لواسان، جاده امام‌زاده", ownerId: "o2", builderId: "", status: "فعال", desc: "", media: [] },
];
const seedCustomers = [
  { id: "c1", name: "مهدی کریمی", phone: "09190001122", need: "خرید آپارتمان ۲ خواب سعادت‌آباد", budget: 9000000000 },
  { id: "c2", name: "سارا محمدی", phone: "09380002233", need: "اجاره ویلا شمال یا لواسان", budget: 50000000 },
];
const seedAppointments = [{ id: "a1", propertyId: "p1", customerId: "c1", date: todayISO(), time: "17:00", notes: "بازدید اول" }];
const seedCalls = [{ id: "cl1", customerId: "c2", date: todayISO(), status: "در انتظار پاسخ", notes: "پیگیری قیمت ویلا" }];

export default function FloraCRM() {
  const [dark, setDark] = useState(true); // blue-dark is the default look
  const c = dark ? T.dark : T.light;

  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const [properties, setProperties] = useState(seedProperties);
  const [owners, setOwners] = useState(seedOwners);
  const [builders, setBuilders] = useState(seedBuilders);
  const [customers, setCustomers] = useState(seedCustomers);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [calls, setCalls] = useState(seedCalls);

  const [toast, setToast] = useState(null);
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  const todaysAppts = appointments.filter((a) => a.date === todayISO()).length;

  const ctx = {
    c, dark, properties, setProperties, owners, setOwners, builders, setBuilders,
    customers, setCustomers, appointments, setAppointments, calls, setCalls,
    notify, setDetail, setTab, setSheet, setLightbox,
  };

  return (
    <div dir="rtl" style={{ background: c.bg, color: c.ink, fontFamily: "'Vazirmatn', sans-serif" }}
      className="min-h-screen w-full flex justify-center relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        .press { transition: transform .18s cubic-bezier(.34,1.56,.64,1); }
        .press:active { transform: scale(0.95); }
        @keyframes floraUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
        @keyframes floraSheet { from { transform: translateY(100%);} to { transform: translateY(0);} }
        @keyframes floraPop { from { opacity:0; transform: scale(.94);} to { opacity:1; transform: scale(1);} }
        @keyframes floraPulse { 0%,100% { opacity:1; transform:scale(1);} 50% { opacity:.45; transform:scale(.82);} }
        @keyframes floraFloat { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-6px);} }
        .flora-up { animation: floraUp .35s cubic-bezier(.22,1,.36,1) both; }
        .flora-sheet { animation: floraSheet .36s cubic-bezier(.22,1,.36,1) both; }
        .flora-pop { animation: floraPop .22s ease both; }
        .flora-pulse { animation: floraPulse 1.6s ease-in-out infinite; }
        .flora-tab-enter { animation: floraUp .28s cubic-bezier(.22,1,.36,1) both; }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>

      <div style={{ position: "absolute", top: -90, left: -60, width: 280, height: 280, borderRadius: "50%", background: c.orb1, filter: "blur(110px)", opacity: dark ? 0.28 : 0.22, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 40, right: -70, width: 260, height: 260, borderRadius: "50%", background: c.orb2, filter: "blur(110px)", opacity: dark ? 0.22 : 0.18, pointerEvents: "none" }} />

      <div className="w-full max-w-[430px] min-h-screen relative flex flex-col">
        <TopBar c={c} dark={dark} setDark={setDark} tab={tab} pendingCalls={pendingCalls} />

        <div className="flex-1 overflow-y-auto pb-28 px-4 relative">
          <div key={detail ? `d-${detail.id}` : tab} className="flora-tab-enter">
            {detail ? (
              <DetailView detail={detail} ctx={ctx} onBack={() => setDetail(null)} />
            ) : tab === "home" ? (
              <HomeTab ctx={ctx} />
            ) : tab === "properties" ? (
              <ListTab kind="property" ctx={ctx} search={search} />
            ) : tab === "customers" ? (
              <ListTab kind="customer" ctx={ctx} search={search} />
            ) : tab === "calendar" ? (
              <CalendarTab ctx={ctx} />
            ) : (
              <MoreTab ctx={ctx} />
            )}
          </div>
        </div>

        {tab !== "home" && !detail && (
          <div className="absolute left-0 right-0 px-4" style={{ top: 66 }}>
            <SearchBox c={c} value={search} setValue={setSearch} />
          </div>
        )}

        {!detail && (
          <button onClick={() => setSheet("add")}
            className="press absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center"
            style={{ width: 60, height: 60, background: `linear-gradient(135deg, ${c.primary}, ${c.orb2})`, boxShadow: `0 14px 30px -8px ${c.primary}90` }}>
            <Plus color="#fff" size={27} strokeWidth={2.4} />
          </button>
        )}

        {!detail && <BottomNav c={c} tab={tab} setTab={setTab} pendingCalls={pendingCalls} todaysAppts={todaysAppts} />}

        {sheet === "add" && <QuickAddSheet ctx={ctx} onClose={() => setSheet(null)} />}
        {sheet && sheet !== "add" && <FormSheet kind={sheet} ctx={ctx} onClose={() => setSheet(null)} />}

        {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-40 px-4 py-2.5 rounded-2xl text-sm flora-up z-40" style={{ ...glass(c, 20), color: c.ink, fontWeight: 600 }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Top bar ----------
function TopBar({ c, dark, setDark, tab, pendingCalls }) {
  const titles = { home: "داشبورد", properties: "فایل‌های ملکی", customers: "مشتریان", calendar: "تقویم بازدید", more: "بیشتر" };
  return (
    <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-10">
      <div>
        <p style={{ fontSize: 12, color: c.muted }}>خوش آمدی 👋</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em" }}>{titles[tab] || "Flora"}</h1>
      </div>
      <div className="flex items-center gap-2">
        {pendingCalls > 0 && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-2" style={{ background: c.attnSoft }}>
            <span className="flora-pulse" style={{ width: 7, height: 7, borderRadius: 99, background: c.attn, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: c.attn }}>{faDigits(pendingCalls)} تماس</span>
          </div>
        )}
        <button onClick={() => setDark(!dark)} className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c, 20)}>
          {dark ? <Sun size={17} color={c.ink} /> : <Moon size={17} color={c.ink} />}
        </button>
      </div>
    </div>
  );
}

function SearchBox({ c, value, setValue }) {
  return (
    <div className="flex items-center rounded-[18px] px-3.5 py-2.5" style={glass(c, 24)}>
      <Search size={16} color={c.muted} />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="جستجوی هوشمند در فایل‌ها، مشتریان..."
        style={{ background: "transparent", outline: "none", color: c.ink, width: "100%", marginRight: 8, fontSize: 13.5, fontFamily: "inherit" }} />
      {value && <button onClick={() => setValue("")}><X size={15} color={c.muted} /></button>}
    </div>
  );
}

// ---------- Bottom nav ----------
function BottomNav({ c, tab, setTab, pendingCalls, todaysAppts }) {
  const items = [
    { id: "home", label: "خانه", icon: Home },
    { id: "properties", label: "فایل‌ها", icon: Building2 },
    { id: "customers", label: "مشتریان", icon: Users },
    { id: "calendar", label: "تقویم", icon: Calendar, dot: todaysAppts > 0 },
    { id: "more", label: "بیشتر", icon: MoreHorizontal, dot: pendingCalls > 0 },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2 z-20">
      <div className="flex justify-between items-center rounded-[26px] px-2 py-2" style={glass(c, 32)}>
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => setTab(it.id)} className="press relative flex flex-col items-center gap-1 flex-1 py-1.5 rounded-2xl"
              style={{ background: active ? c.primarySoft : "transparent" }}>
              <div className="relative">
                <Icon size={20} color={active ? c.primary : c.muted} strokeWidth={active ? 2.5 : 2} />
                {it.dot && <span className="flora-pulse" style={{ position: "absolute", top: -3, left: -3, width: 7, height: 7, borderRadius: 99, background: c.attn }} />}
              </div>
              <span style={{ fontSize: 10.5, color: active ? c.primary : c.muted, fontWeight: active ? 700 : 500 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Home ----------
function HomeTab({ ctx }) {
  const { c, properties, customers, appointments, calls, setDetail } = ctx;
  const stats = [
    { label: "فایل فعال", value: properties.length, icon: Building2, color: c.primary },
    { label: "مشتری", value: customers.length, icon: Users, color: c.primary },
    { label: "بازدید امروز", value: appointments.filter((a) => a.date === todayISO()).length, icon: Calendar, color: c.attn },
    { label: "تماس در انتظار", value: calls.filter((c2) => c2.status !== "انجام‌شد").length, icon: PhoneCall, color: c.attn },
  ];
  return (
    <div className="pt-3">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-[24px] p-4" style={{ ...glass(c, 24), animationDelay: `${i * 0.04}s` }}>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3" style={{ background: s.color + "22" }}>
              <s.icon size={17} color={s.color} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 800 }}>{faDigits(s.value)}</p>
            <p style={{ fontSize: 12, color: c.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      <SectionHeader c={c} title="بازدیدهای پیش‌رو" />
      <div className="flex flex-col gap-2">
        {appointments.slice(0, 3).map((a) => <AppointmentRow key={a.id} a={a} ctx={ctx} />)}
        {appointments.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>

      <SectionHeader c={c} title="جدیدترین فایل‌ها" />
      <div className="flex flex-col gap-2 mb-6">
        {properties.slice(0, 3).map((p) => <PropertyRow key={p.id} p={p} c={c} onClick={() => setDetail({ type: "property", id: p.id })} />)}
      </div>
    </div>
  );
}

function SectionHeader({ c, title }) {
  return <div className="flex items-center justify-between mt-6 mb-2.5"><h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2></div>;
}
function EmptyLine({ c, text }) {
  return <p style={{ color: c.muted, fontSize: 12.5, padding: "10px 2px" }}>{text}</p>;
}

function AppointmentRow({ a, ctx }) {
  const { c, properties, customers } = ctx;
  const p = properties.find((x) => x.id === a.propertyId);
  const cu = customers.find((x) => x.id === a.customerId);
  const isToday = a.date === todayISO();
  return (
    <div className="rounded-[20px] p-3.5 flex items-center gap-3" style={glass(c, 22)}>
      <div className="rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ width: 48, height: 48, background: isToday ? c.attnSoft : c.primarySoft }}>
        <span style={{ fontSize: 10, color: isToday ? c.attn : c.primary, fontWeight: 700 }}>{a.time}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.title || "فایل حذف‌شده"}</p>
        <p style={{ fontSize: 11.5, color: c.muted }}>با {cu?.name || "—"} · {fmtJalali(a.date)}</p>
      </div>
      {isToday && <span style={{ fontSize: 10, fontWeight: 700, color: c.attn, background: c.attnSoft, padding: "3px 8px", borderRadius: 999 }}>امروز</span>}
    </div>
  );
}

function PropertyRow({ p, c, onClick }) {
  const cover = p.media && p.media[0];
  const Icon = typeIcon(p.type);
  const sold = p.status === "فروخته شد";
  return (
    <button onClick={onClick} className="press w-full text-right rounded-[20px] p-3 flex items-center gap-3" style={{ ...glass(c, 22), opacity: sold ? 0.6 : 1 }}>
      <div className="relative rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 50, height: 50, background: c.primarySoft }}>
        {cover ? (
          cover.type === "image"
            ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : <Icon size={19} color={c.primary} />}
        {sold && <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}><BadgeCheck size={16} color="#fff" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: sold ? "line-through" : "none" }}>{p.title}</p>
        <p style={{ fontSize: 11.5, color: c.muted }}>{faDigits(p.area)} متر · {p.deal} · {fmtToman(p.price)}</p>
      </div>
      {sold && <span style={{ fontSize: 9.5, fontWeight: 700, color: c.danger, background: c.danger + "1E", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>فروخته شد</span>}
      <ChevL size={16} color={c.muted} />
    </button>
  );
}

// ---------- List tabs ----------
const DEAL_FILTERS = ["همه", "فروش", "پیش‌فروش", "اجاره", "رهن کامل"];

function ListTab({ kind, ctx, search }) {
  const { c, properties, customers, setDetail } = ctx;
  const [dealFilter, setDealFilter] = useState("همه");
  const [sortAsc, setSortAsc] = useState(true);
  const list = kind === "property" ? properties : customers;

  const filtered = useMemo(() => {
    let out = list;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((it) => Object.values(it).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (kind === "property") {
      if (dealFilter !== "همه") out = out.filter((p) => p.deal === dealFilter);
      out = [...out].sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
    }
    return out;
  }, [list, search, dealFilter, sortAsc, kind]);

  return (
    <div className="pt-16">
      {kind === "property" && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <button onClick={() => setSortAsc((s) => !s)} className="press shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2" style={glass(c, 20)}>
            <ArrowUpDown size={13} color={c.primary} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: c.primary, whiteSpace: "nowrap" }}>{sortAsc ? "ارزان‌ترین اول" : "گران‌ترین اول"}</span>
          </button>
          {DEAL_FILTERS.map((d) => {
            const active = dealFilter === d;
            return (
              <button key={d} onClick={() => setDealFilter(d)} className="press shrink-0 rounded-full px-3.5 py-2"
                style={active ? { background: c.primary, boxShadow: c.shadow } : glass(c, 20)}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{d}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {filtered.map((it) =>
          kind === "property"
            ? <PropertyRow key={it.id} p={it} c={c} onClick={() => setDetail({ type: "property", id: it.id })} />
            : <CustomerRow key={it.id} cu={it} c={c} onClick={() => setDetail({ type: "customer", id: it.id })} />
        )}
        {filtered.length === 0 && <EmptyLine c={c} text="چیزی پیدا نشد" />}
      </div>
    </div>
  );
}

function CustomerRow({ cu, c, onClick }) {
  return (
    <button onClick={onClick} className="press w-full text-right rounded-[20px] p-3.5 flex items-center gap-3" style={glass(c, 22)}>
      <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: c.primarySoft }}>
        <UserCircle2 size={22} color={c.primary} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13.5, fontWeight: 600 }}>{cu.name}</p>
        <p style={{ fontSize: 11.5, color: c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.need}</p>
      </div>
      <ChevL size={16} color={c.muted} />
    </button>
  );
}

// ---------- Calendar (Jalali) ----------
function CalendarTab({ ctx }) {
  const { c, appointments } = ctx;
  const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const grouped = sorted.reduce((acc, a) => { (acc[a.date] ||= []).push(a); return acc; }, {});
  return (
    <div className="pt-16">
      {Object.keys(grouped).length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-4">
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 8, fontWeight: 600 }}>{date === todayISO() ? "امروز" : fmtJalali(date)}</p>
          <div className="flex flex-col gap-2">{items.map((a) => <AppointmentRow key={a.id} a={a} ctx={ctx} />)}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- More ----------
function MoreTab({ ctx }) {
  const { c, owners, builders, calls, setSheet } = ctx;
  return (
    <div className="pt-3">
      <SectionHeader c={c} title="پیگیری تماس‌ها" />
      <div className="flex flex-col gap-2 mb-2">
        {calls.map((cl) => <CallRow key={cl.id} cl={cl} ctx={ctx} />)}
        {calls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <AddLink c={c} label="ثبت تماس جدید" onClick={() => setSheet("call")} />

      <SectionHeader c={c} title="مالکین" />
      <div className="flex flex-col gap-2 mb-2">
        {owners.map((o) => (
          <div key={o.id} className="rounded-[20px] p-3.5 flex items-center gap-3" style={glass(c, 22)}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.primarySoft }}>
              <UserCircle2 size={19} color={c.primary} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 13.5, fontWeight: 600 }}>{o.name}</p>
              <p style={{ fontSize: 11.5, color: c.muted }} dir="ltr">{o.phone}</p>
            </div>
          </div>
        ))}
      </div>
      <AddLink c={c} label="ثبت مالک جدید" onClick={() => setSheet("owner")} />

      <SectionHeader c={c} title="سازندگان" />
      <div className="flex flex-col gap-2 mb-2">
        {builders.map((b) => (
          <div key={b.id} className="rounded-[20px] p-3.5 flex items-center gap-3" style={glass(c, 22)}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.attnSoft }}>
              <Hammer size={17} color={c.attn} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 13.5, fontWeight: 600 }}>{b.name}</p>
              <p style={{ fontSize: 11.5, color: c.muted }} dir="ltr">{b.phone}</p>
            </div>
          </div>
        ))}
        {builders.length === 0 && <EmptyLine c={c} text="سازنده‌ای ثبت نشده" />}
      </div>
      <AddLink c={c} label="ثبت سازنده جدید" onClick={() => setSheet("builder")} />

      <SectionHeader c={c} title="ابزار هوش مصنوعی" />
      <button onClick={() => setSheet("ai-standalone")} className="press w-full rounded-[22px] p-4 flex items-center gap-3 mb-8"
        style={{ ...glass(c, 24), background: `linear-gradient(135deg, ${c.primarySoft}, ${c.attnSoft})` }}>
        <Sparkles size={19} color={c.primary} />
        <div className="text-right flex-1">
          <p style={{ fontSize: 13.5, fontWeight: 700 }}>تولید متن آگهی با هوش مصنوعی</p>
          <p style={{ fontSize: 11, color: c.muted }}>از روی مشخصات یک فایل، آگهی حرفه‌ای بساز</p>
        </div>
      </button>
    </div>
  );
}

function AddLink({ c, label, onClick }) {
  return (
    <button onClick={onClick} className="press flex items-center gap-1.5 mb-6" style={{ color: c.primary, fontSize: 12.5, fontWeight: 700 }}>
      <Plus size={14} /> {label}
    </button>
  );
}

function CallRow({ cl, ctx }) {
  const { c, customers, setCalls } = ctx;
  const cu = customers.find((x) => x.id === cl.customerId);
  const done = cl.status === "انجام‌شد";
  return (
    <div className="rounded-[20px] p-3.5 flex items-center gap-3" style={glass(c, 22)}>
      <button onClick={() => setCalls((prev) => prev.map((x) => x.id === cl.id ? { ...x, status: done ? "در انتظار پاسخ" : "انجام‌شد" } : x))}>
        <CheckCircle2 size={22} color={done ? c.primary : c.attn} fill={done ? c.primary : "none"} />
      </button>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? c.muted : c.ink }}>{cu?.name || "—"}</p>
        <p style={{ fontSize: 11.5, color: c.muted }}>{cl.notes}</p>
      </div>
      <span style={{ fontSize: 10.5, color: done ? c.muted : c.attn, fontWeight: done ? 400 : 700 }}>{fmtJalali(cl.date)}</span>
    </div>
  );
}

// ---------- Detail view ----------
function DetailView({ detail, ctx, onBack }) {
  if (detail.type === "property") return <PropertyDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  if (detail.type === "customer") return <CustomerDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  return null;
}

function BackHeader({ c, title, onBack, onDelete }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-4">
      <button onClick={onBack} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}>
        <ArrowRight size={16} color={c.ink} />
      </button>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
      {onDelete ? (
        <button onClick={onDelete} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}>
          <Trash2 size={15} color={c.danger} />
        </button>
      ) : <div style={{ width: 36 }} />}
    </div>
  );
}

// ---------- Media gallery ----------
function MediaGallery({ c, media, onAdd, onRemove, onView, uploading }) {
  const inputRef = useRef(null);
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollSnapType: "x proximity" }}>
      <button onClick={() => inputRef.current?.click()} className="press shrink-0 rounded-[18px] flex flex-col items-center justify-center gap-1"
        style={{ width: 84, height: 84, ...glass(c, 20) }}>
        {uploading ? <Loader2 size={18} color={c.primary} className="animate-spin" /> : <ImagePlus size={18} color={c.primary} />}
        <span style={{ fontSize: 10, color: c.primary, fontWeight: 700 }}>افزودن</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden
        onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
      {media.map((m) => (
        <div key={m.id} className="relative shrink-0 rounded-[18px] overflow-hidden" style={{ width: 84, height: 84 }}>
          <button onClick={() => onView(m)} className="w-full h-full">
            {m.type === "image" ? (
              <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="relative w-full h-full">
                <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                  <Play size={18} color="#fff" fill="#fff" />
                </div>
              </div>
            )}
          </button>
          <button onClick={() => onRemove(m.id)} className="press absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
            <X size={11} color="#fff" />
          </button>
        </div>
      ))}
    </div>
  );
}

function Lightbox({ item, onClose }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center flora-pop" style={{ background: "rgba(0,0,0,0.9)" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 left-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
        <X size={16} color="#fff" />
      </button>
      {item.type === "image" ? (
        <img src={item.url} alt="" style={{ maxWidth: "92%", maxHeight: "80%", borderRadius: 18, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
      ) : (
        <video src={item.url} controls autoPlay style={{ maxWidth: "92%", maxHeight: "80%", borderRadius: 18 }} onClick={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}

function PropertyDetail({ id, ctx, onBack }) {
  const { c, properties, setProperties, owners, builders, appointments, setLightbox } = ctx;
  const p = properties.find((x) => x.id === id);
  const owner = owners.find((o) => o.id === p?.ownerId);
  const builder = builders.find((b) => b.id === p?.builderId);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adText, setAdText] = useState(p?.desc || "");

  if (!p) return null;

  const addMedia = async (fileList) => {
    setUploading(true);
    const items = await filesToMedia(fileList);
    setProperties((prev) => prev.map((x) => x.id === id ? { ...x, media: [...(x.media || []), ...items] } : x));
    setUploading(false);
  };
  const removeMedia = (mediaId) => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, media: x.media.filter((m) => m.id !== mediaId) } : x));

  const generateAd = async () => {
    setAiLoading(true);
    try {
      const prompt = `یک آگهی ملکی حرفه‌ای، جذاب و کوتاه (حداکثر ۵ خط) به زبان فارسی برای این فایل ملکی بنویس. لحن باید حرفه‌ای و متقاعدکننده باشد، بدون شعار اضافه:
عنوان: ${p.title}
نوع: ${p.type}
نوع معامله: ${p.deal}
متراژ: ${p.area} متر
تعداد اتاق: ${p.rooms}
آدرس: ${p.address}
قیمت هر متر: ${fmtToman(p.pricePerMeter)}
قیمت کل: ${fmtToman(p.price)}
فقط متن آگهی را برگردان، بدون مقدمه.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = data?.content?.find((b2) => b2.type === "text")?.text || "";
      setAdText(text.trim());
      setProperties((prev) => prev.map((x) => x.id === id ? { ...x, desc: text.trim() } : x));
    } catch (e) {
      ctx.notify("خطا در تولید آگهی");
    }
    setAiLoading(false);
  };

  const propAppts = appointments.filter((a) => a.propertyId === id);

  return (
    <div className="pt-2">
      <BackHeader c={c} title="جزئیات فایل" onBack={onBack}
        onDelete={() => { setProperties((prev) => prev.filter((x) => x.id !== id)); onBack(); ctx.notify("فایل حذف شد"); }} />

      <SectionHeader c={c} title="عکس و فیلم" />
      <div className="mb-4">
        <MediaGallery c={c} media={p.media || []} uploading={uploading} onAdd={addMedia} onRemove={removeMedia} onView={setLightbox} />
      </div>

      <div className="rounded-[24px] p-4 mb-3" style={glass(c, 24)}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 11, background: c.primarySoft, color: c.primary, padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>{p.deal}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: p.status === "فروخته شد" ? c.danger : c.attn, background: (p.status === "فروخته شد" ? c.danger : c.attn) + "1E", padding: "3px 10px", borderRadius: 999 }}>{p.status}</span>
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, marginTop: 8, letterSpacing: "-0.01em", textDecoration: p.status === "فروخته شد" ? "line-through" : "none" }}>{p.title}</h3>
        <p style={{ fontSize: 20, fontWeight: 800, color: c.primary, marginTop: 4 }}>{fmtToman(p.price)}</p>
        <p style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{fmtToman(p.pricePerMeter)} در هر متر · {faDigits(p.area)} متر</p>

        <div className="flex gap-2 mt-3">
          <InfoChip c={c} icon={Ruler} label={`${faDigits(p.area)} متر`} />
          <InfoChip c={c} icon={typeIcon(p.type)} label={p.type} />
          <InfoChip c={c} icon={Home} label={`${faDigits(p.rooms)} خواب`} />
        </div>
        <div className="flex items-center gap-1.5 mt-3" style={{ color: c.muted, fontSize: 12.5 }}>
          <MapPin size={13} /> {p.address}
        </div>
        {owner && (
          <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}>
            <UserCircle2 size={13} /> مالک: {owner.name} · <span dir="ltr">{owner.phone}</span>
          </div>
        )}
        {builder && (
          <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}>
            <Hammer size={13} /> سازنده: {builder.name} · <span dir="ltr">{builder.phone}</span>
          </div>
        )}

        <button onClick={() => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, status: x.status === "فروخته شد" ? "فعال" : "فروخته شد" } : x))}
          className="press w-full mt-4 rounded-[18px] py-3 flex items-center justify-center gap-2"
          style={{ background: p.status === "فروخته شد" ? c.surface2 : c.attnSoft, color: p.status === "فروخته شد" ? c.muted : c.attn, fontWeight: 700, fontSize: 13.5 }}>
          {p.status === "فروخته شد" ? <RotateCcw size={16} /> : <BadgeCheck size={16} />}
          {p.status === "فروخته شد" ? "بازگرداندن به فایل فعال" : "علامت‌گذاری به‌عنوان فروخته‌شده"}
        </button>
      </div>

      <div className="rounded-[24px] p-4 mb-3" style={glass(c, 24)}>
        <div className="flex items-center justify-between mb-2.5">
          <p style={{ fontSize: 13, fontWeight: 700 }}>آگهی</p>
          <button onClick={generateAd} disabled={aiLoading} className="press flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontSize: 11.5, fontWeight: 700 }}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {aiLoading ? "در حال تولید..." : "تولید با AI"}
          </button>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.9, color: adText ? c.ink : c.muted }}>
          {adText || "هنوز آگهی‌ای برای این فایل تولید نشده. روی «تولید با AI» بزن."}
        </p>
      </div>

      <SectionHeader c={c} title="بازدیدهای این فایل" />
      <div className="flex flex-col gap-2 mb-6">
        {propAppts.map((a) => <AppointmentRow key={a.id} a={a} ctx={ctx} />)}
        {propAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

function InfoChip({ c, icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: c.surface2 }}>
      <Icon size={12} color={c.muted} />
      <span style={{ fontSize: 11, color: c.ink }}>{label}</span>
    </div>
  );
}

function CustomerDetail({ id, ctx, onBack }) {
  const { c, customers, calls, appointments } = ctx;
  const cu = customers.find((x) => x.id === id);
  if (!cu) return null;
  const custCalls = calls.filter((cl) => cl.customerId === id);
  const custAppts = appointments.filter((a) => a.customerId === id);

  return (
    <div className="pt-2">
      <BackHeader c={c} title="جزئیات مشتری" onBack={onBack}
        onDelete={() => { ctx.setCustomers((prev) => prev.filter((x) => x.id !== id)); onBack(); ctx.notify("مشتری حذف شد"); }} />

      <div className="rounded-[24px] p-4 mb-3 flex items-center gap-3" style={glass(c, 24)}>
        <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: c.primarySoft }}>
          <UserCircle2 size={26} color={c.primary} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800 }}>{cu.name}</p>
          <p style={{ fontSize: 12.5, color: c.muted }} dir="ltr">{cu.phone}</p>
        </div>
      </div>

      <div className="rounded-[24px] p-4 mb-3" style={glass(c, 24)}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>نیاز مشتری</p>
        <p style={{ fontSize: 13.5 }}>{cu.need}</p>
        <p style={{ fontSize: 12, color: c.muted, marginTop: 10, marginBottom: 4 }}>بودجه</p>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: c.primary }}>{fmtToman(cu.budget)}</p>
      </div>

      <SectionHeader c={c} title="تاریخچه تماس" />
      <div className="flex flex-col gap-2 mb-4">
        {custCalls.map((cl) => <CallRow key={cl.id} cl={cl} ctx={ctx} />)}
        {custCalls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>

      <SectionHeader c={c} title="بازدیدهای برنامه‌ریزی‌شده" />
      <div className="flex flex-col gap-2 mb-6">
        {custAppts.map((a) => <AppointmentRow key={a.id} a={a} ctx={ctx} />)}
        {custAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

// ---------- Quick add sheet ----------
function SheetShell({ c, title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-[32px] p-5 flora-sheet max-h-[85%] overflow-y-auto" style={glass(c, 36)}>
        <div className="w-10 h-1.5 rounded-full mx-auto mb-4" style={{ background: c.surface2 }} />
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}>
            <X size={14} color={c.ink} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QuickAddSheet({ ctx, onClose }) {
  const { c, setSheet } = ctx;
  const options = [
    { id: "property", label: "فایل ملک جدید", icon: Building2 },
    { id: "customer", label: "مشتری جدید", icon: Users },
    { id: "owner", label: "مالک جدید", icon: UserCircle2 },
    { id: "builder", label: "سازنده جدید", icon: Hammer },
    { id: "appointment", label: "قرار بازدید جدید", icon: Calendar },
    { id: "call", label: "پیگیری تماس جدید", icon: PhoneCall },
  ];
  return (
    <SheetShell c={c} title="افزودن سریع" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((o, i) => (
          <button key={o.id} onClick={() => setSheet(o.id)} className="press w-full flex items-center gap-3 rounded-[20px] p-3.5 flora-up" style={{ ...glass(c, 20), animationDelay: `${i * 0.03}s` }}>
            <div className="rounded-2xl flex items-center justify-center" style={{ width: 38, height: 38, background: c.primarySoft }}>
              <o.icon size={17} color={c.primary} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{o.label}</span>
          </button>
        ))}
      </div>
    </SheetShell>
  );
}

// ---------- Field helpers ----------
function Field({ c, label, children }) {
  return (
    <div className="mb-3">
      <label style={{ fontSize: 12, color: c.muted, marginBottom: 6, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}
function inputStyle(c) {
  return { width: "100%", background: c.surface2, boxShadow: "none", border: "none", borderRadius: 16, padding: "12px 14px", fontSize: 14, color: c.ink, outline: "none", fontFamily: "inherit" };
}
function Select({ c, value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={onChange} style={inputStyle(c)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function SubmitBtn({ c, label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="press w-full rounded-[18px] py-3.5 mt-2"
      style={{ background: disabled ? c.surface2 : `linear-gradient(135deg, ${c.primary}, ${c.orb2})`, color: disabled ? c.muted : "#fff", fontWeight: 700, fontSize: 14.5 }}>
      {label}
    </button>
  );
}

// ---------- Jalali date picker (replaces native date input) ----------
function JalaliDatePicker({ c, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [jy, jm] = isoToJalali(value);
  const [viewY, setViewY] = useState(jy);
  const [viewM, setViewM] = useState(jm);
  const selJ = isoToJalali(value);

  const monthLen = jalaliMonthLength(viewY, viewM);
  const firstDow = jalaliFirstWeekday(viewY, viewM);
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: monthLen }, (_, i) => i + 1)];

  const nav = (dir) => {
    let m = viewM + dir, y = viewY;
    if (m > 12) { m = 1; y++; } else if (m < 1) { m = 12; y--; }
    setViewM(m); setViewY(y);
  };
  const pick = (day) => { onChange(jalaliToIso(viewY, viewM, day)); setOpen(false); };

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="press w-full flex items-center gap-2" style={{ ...inputStyle(c), justifyContent: "flex-start" }}>
        <CalendarDays size={15} color={c.primary} />
        <span>{fmtJalali(value)}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-[20px] p-3 flora-up" style={glass(c, 24)}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => nav(-1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevR size={14} color={c.ink} /></button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{MONTHS_FA[viewM - 1]} {faDigits(viewY)}</span>
            <button onClick={() => nav(1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevL size={14} color={c.ink} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_FA.map((w, i) => <div key={i} style={{ fontSize: 10.5, color: c.muted, textAlign: "center", fontWeight: 700 }}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const isSel = day && viewY === selJ[0] && viewM === selJ[1] && day === selJ[2];
              return day ? (
                <button key={i} onClick={() => pick(day)} className="press rounded-xl flex items-center justify-center"
                  style={{ height: 32, fontSize: 12, fontWeight: isSel ? 800 : 500, color: isSel ? "#fff" : c.ink, background: isSel ? c.primary : "transparent" }}>
                  {faDigits(day)}
                </button>
              ) : <div key={i} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Form sheet router ----------
function FormSheet({ kind, ctx, onClose }) {
  if (kind === "property") return <PropertyForm ctx={ctx} onClose={onClose} />;
  if (kind === "customer") return <CustomerForm ctx={ctx} onClose={onClose} />;
  if (kind === "owner") return <OwnerForm ctx={ctx} onClose={onClose} />;
  if (kind === "builder") return <BuilderForm ctx={ctx} onClose={onClose} />;
  if (kind === "appointment") return <AppointmentForm ctx={ctx} onClose={onClose} />;
  if (kind === "call") return <CallForm ctx={ctx} onClose={onClose} />;
  if (kind === "ai-standalone") return <StandaloneAiSheet ctx={ctx} onClose={onClose} />;
  return null;
}

function PropertyForm({ ctx, onClose }) {
  const { c, owners, builders, setProperties, notify } = ctx;
  const [f, setF] = useState({ title: "", type: "آپارتمان", deal: "فروش", pricePerMeter: "", area: "", rooms: "", address: "", ownerId: "", builderId: "" });
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = (Number(f.pricePerMeter) || 0) * (Number(f.area) || 0);
  const valid = f.title && f.pricePerMeter && f.area;
  const isPreSale = f.deal === "پیش‌فروش";

  const addMedia = async (fileList) => {
    setUploading(true);
    const items = await filesToMedia(fileList);
    setMedia((prev) => [...prev, ...items]);
    setUploading(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { notify("موقعیت مکانی در این دستگاه در دسترس نیست"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fa`);
          const data = await res.json();
          setF((prev) => ({ ...prev, address: data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
          notify("آدرس از موقعیت مکانی دریافت شد");
        } catch { notify("خطا در دریافت آدرس"); }
        setLocating(false);
      },
      () => { notify("دسترسی به موقعیت مکانی رد شد"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <SheetShell c={c} title="ثبت فایل ملک" onClose={onClose}>
      <Field c={c} label="عکس و فیلم فایل">
        <MediaGallery c={c} media={media} uploading={uploading} onAdd={addMedia} onRemove={(mid) => setMedia((p) => p.filter((m) => m.id !== mid))} onView={() => {}} />
      </Field>
      <Field c={c} label="عنوان فایل"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder="مثلاً آپارتمان ۹۰ متری تهرانپارس" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نوع ملک"><Select c={c} value={f.type} onChange={set("type")} placeholder="انتخاب کنید" options={["آپارتمان","ویلا","زمین","مغازه","اداری"].map(v=>({value:v,label:v}))} /></Field>
        <Field c={c} label="نوع معامله"><Select c={c} value={f.deal} onChange={set("deal")} placeholder="انتخاب کنید" options={["فروش","پیش‌فروش","اجاره","رهن کامل"].map(v=>({value:v,label:v}))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="متراژ (متر)"><input style={inputStyle(c)} inputMode="numeric" value={f.area} onChange={set("area")} /></Field>
        <Field c={c} label="قیمت هر متر (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.pricePerMeter} onChange={set("pricePerMeter")} /></Field>
      </div>
      <div className="rounded-2xl px-4 py-3 mb-3 flex items-center justify-between" style={{ background: c.primarySoft }}>
        <span style={{ fontSize: 12.5, color: c.primary, fontWeight: 600 }}>مبلغ کل (خودکار)</span>
        <span style={{ fontSize: 15, color: c.primary, fontWeight: 800 }}>{fmtToman(total)}</span>
      </div>
      <Field c={c} label="تعداد اتاق"><input style={inputStyle(c)} inputMode="numeric" value={f.rooms} onChange={set("rooms")} /></Field>

      <Field c={c} label="آدرس">
        <div className="flex gap-2">
          <input style={{ ...inputStyle(c), flex: 1 }} value={f.address} onChange={set("address")} placeholder="آدرس را بنویس یا از موقعیت مکانی بگیر" />
          <button onClick={useMyLocation} disabled={locating} className="press shrink-0 rounded-2xl flex items-center justify-center" style={{ width: 46, background: c.primarySoft }}>
            {locating ? <Loader2 size={16} color={c.primary} className="animate-spin" /> : <LocateFixed size={16} color={c.primary} />}
          </button>
        </div>
      </Field>

      <Field c={c} label="مالک"><Select c={c} value={f.ownerId} onChange={set("ownerId")} placeholder="انتخاب مالک (اختیاری)" options={owners.map(o=>({value:o.id,label:o.name}))} /></Field>
      {isPreSale && (
        <Field c={c} label="سازنده"><Select c={c} value={f.builderId} onChange={set("builderId")} placeholder="انتخاب سازنده" options={builders.map(b=>({value:b.id,label:b.name}))} /></Field>
      )}

      <SubmitBtn c={c} label="ذخیره فایل" disabled={!valid} onClick={() => {
        setProperties((prev) => [{
          id: uid(), status: "فعال", desc: "", media,
          ...f, pricePerMeter: Number(f.pricePerMeter), area: Number(f.area), rooms: Number(f.rooms) || 0, price: total,
        }, ...prev]);
        notify("فایل با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function CustomerForm({ ctx, onClose }) {
  const { c, setCustomers, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "", need: "", budget: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title="ثبت مشتری" onClose={onClose}>
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" inputMode="numeric" value={f.phone} onChange={set("phone")} /></Field>
      <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={f.need} onChange={set("need")} placeholder="مثلاً خرید آپارتمان ۲ خواب" /></Field>
      <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.budget} onChange={set("budget")} /></Field>
      <SubmitBtn c={c} label="ذخیره مشتری" disabled={!valid} onClick={() => {
        setCustomers((prev) => [{ id: uid(), ...f, budget: Number(f.budget) || 0 }, ...prev]);
        notify("مشتری با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function OwnerForm({ ctx, onClose }) {
  const { c, setOwners, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title="ثبت مالک" onClose={onClose}>
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" inputMode="numeric" value={f.phone} onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label="ذخیره مالک" disabled={!valid} onClick={() => {
        setOwners((prev) => [{ id: uid(), ...f }, ...prev]);
        notify("مالک با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function BuilderForm({ ctx, onClose }) {
  const { c, setBuilders, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title="ثبت سازنده" onClose={onClose}>
      <Field c={c} label="نام شرکت / سازنده"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" inputMode="numeric" value={f.phone} onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label="ذخیره سازنده" disabled={!valid} onClick={() => {
        setBuilders((prev) => [{ id: uid(), ...f }, ...prev]);
        notify("سازنده با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function AppointmentForm({ ctx, onClose }) {
  const { c, properties, customers, setAppointments, notify } = ctx;
  const [f, setF] = useState({ propertyId: "", customerId: "", date: todayISO(), time: "10:00", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.propertyId && f.customerId && f.date && f.time;
  return (
    <SheetShell c={c} title="ثبت قرار بازدید" onClose={onClose}>
      <Field c={c} label="فایل ملک"><Select c={c} value={f.propertyId} onChange={set("propertyId")} placeholder="انتخاب فایل" options={properties.map(p=>({value:p.id,label:p.title}))} /></Field>
      <Field c={c} label="مشتری"><Select c={c} value={f.customerId} onChange={set("customerId")} placeholder="انتخاب مشتری" options={customers.map(cu=>({value:cu.id,label:cu.name}))} /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="ساعت"><input type="time" style={inputStyle(c)} value={f.time} onChange={set("time")} /></Field>
      <Field c={c} label="یادداشت"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} /></Field>
      <SubmitBtn c={c} label="ذخیره قرار بازدید" disabled={!valid} onClick={() => {
        setAppointments((prev) => [{ id: uid(), ...f }, ...prev]);
        notify("بازدید در تقویم ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function CallForm({ ctx, onClose }) {
  const { c, customers, setCalls, notify } = ctx;
  const [f, setF] = useState({ customerId: "", date: todayISO(), status: "در انتظار پاسخ", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.customerId;
  return (
    <SheetShell c={c} title="ثبت پیگیری تماس" onClose={onClose}>
      <Field c={c} label="مشتری"><Select c={c} value={f.customerId} onChange={set("customerId")} placeholder="انتخاب مشتری" options={customers.map(cu=>({value:cu.id,label:cu.name}))} /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="یادداشت تماس"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} placeholder="موضوع تماس..." /></Field>
      <SubmitBtn c={c} label="ذخیره تماس" disabled={!valid} onClick={() => {
        setCalls((prev) => [{ id: uid(), ...f }, ...prev]);
        notify("تماس ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function StandaloneAiSheet({ ctx, onClose }) {
  const { c, properties, setDetail } = ctx;
  const [propertyId, setPropertyId] = useState("");
  return (
    <SheetShell c={c} title="تولید آگهی با هوش مصنوعی" onClose={onClose}>
      <Field c={c} label="یک فایل ملک انتخاب کن">
        <Select c={c} value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="انتخاب فایل" options={properties.map(p=>({value:p.id,label:p.title}))} />
      </Field>
      <p style={{ fontSize: 11.5, color: c.muted, lineHeight: 1.8, marginBottom: 8 }}>
        بعد از انتخاب فایل، وارد صفحه جزئیات آن می‌شوی و از همان‌جا می‌توانی آگهی را با یک لمس تولید کنی.
      </p>
      <SubmitBtn c={c} label="برو به صفحه فایل" disabled={!propertyId} onClick={() => { setDetail({ type: "property", id: propertyId }); onClose(); }} />
    </SheetShell>
  );
}
