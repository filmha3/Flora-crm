import React, { useState, useMemo, useRef } from "react";
import {
  Home, Building2, Users, Search, Plus, X, Moon, Sun, Sparkles, MapPin, Ruler,
  UserCircle2, PhoneCall, CheckCircle2, Loader2, Trash2, ImagePlus, Play,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Hammer, LocateFixed,
  CalendarDays, Trees, Store, Briefcase, ArrowUpDown, BadgeCheck, RotateCcw,
  LayoutGrid, Table2, Menu, LayoutDashboard, Activity, Filter, Phone,
} from "lucide-react";

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
  jy += 33 * div(days, 12053); days %= 12053;
  jy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div(((jy % 33) + 3), 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097); days %= 146097;
  if (days > 36524) { gy += 100 * div(--days, 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * div(days, 1461); days %= 1461;
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

const TYPE_ICON = { "آپارتمان": Building2, "ویلا": Home, "زمین": Trees, "مغازه": Store, "اداری": Briefcase };
const typeIcon = (t) => TYPE_ICON[t] || Building2;

// ---------- Bitrix24-style business CRM tokens: crisp cards, real borders, corporate blue ----------
const T = {
  light: {
    bg: "#F4F6FB", sidebarBg: "#12172B", sidebarInk: "#D3D9E8", sidebarMuted: "#7C87A3",
    surface: "#FFFFFF", surfaceAlt: "#F0F2F7", border: "#E3E7EF",
    ink: "#1B2436", muted: "#6B7386",
    primary: "#0B84FF", primarySoft: "#E7F2FF",
    accent: "#FF9F43", accentSoft: "#FFF1E2",
    danger: "#E5484D", dangerSoft: "#FDEBEC", success: "#22C55E", successSoft: "#E8F9EF",
  },
  dark: {
    bg: "#0C1020", sidebarBg: "#080B17", sidebarInk: "#D7DDEB", sidebarMuted: "#68708A",
    surface: "#141A2E", surfaceAlt: "#1A2138", border: "#262D45",
    ink: "#EAEDF6", muted: "#8A93AC",
    primary: "#3AA0FF", primarySoft: "rgba(58,160,255,0.14)",
    accent: "#FFB35C", accentSoft: "rgba(255,179,92,0.14)",
    danger: "#FF6B6F", dangerSoft: "rgba(255,107,111,0.14)", success: "#34D399", successSoft: "rgba(52,211,153,0.14)",
  },
};
const card = (c) => ({ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" });

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtToman = (n) => (n ? Math.round(n).toLocaleString("fa-IR") : "۰") + " تومان";
const todayISO = () => new Date().toISOString().slice(0, 10);
const filesToMedia = (fileList) => Promise.all(Array.from(fileList).map((file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ id: uid(), type: file.type.startsWith("video") ? "video" : "image", url: reader.result, name: file.name });
  reader.readAsDataURL(file);
})));

const STAGES = ["فعال", "در حال مذاکره", "فروخته شد"];
const DEAL_FILTERS = ["همه", "فروش", "پیش‌فروش", "اجاره", "رهن کامل"];

// ---------- Seed data ----------
const seedOwners = [{ id: "o1", name: "آقای رحیمی", phone: "09121234567" }, { id: "o2", name: "خانم صادقی", phone: "09351234567" }];
const seedBuilders = [{ id: "b1", name: "شرکت سازه پارس", phone: "02122223333" }];
const seedProperties = [
  { id: "p1", title: "آپارتمان ۱۲۰ متری سعادت‌آباد", type: "آپارتمان", deal: "فروش", pricePerMeter: 70000000, price: 8400000000, area: 120, rooms: 2, address: "سعادت‌آباد، خیابان سرو", ownerId: "o1", builderId: "", stage: "فعال", desc: "", media: [] },
  { id: "p2", title: "ویلا دوبلکس لواسان", type: "ویلا", deal: "اجاره", pricePerMeter: 150000, price: 45000000, area: 300, rooms: 4, address: "لواسان، جاده امام‌زاده", ownerId: "o2", builderId: "", stage: "در حال مذاکره", desc: "", media: [] },
  { id: "p3", title: "پیش‌فروش برج مروارید", type: "آپارتمان", deal: "پیش‌فروش", pricePerMeter: 55000000, price: 4950000000, area: 90, rooms: 2, address: "پونک، بلوار گلستان", ownerId: "", builderId: "b1", stage: "فعال", desc: "", media: [] },
];
const seedCustomers = [
  { id: "c1", name: "مهدی کریمی", phone: "09190001122", need: "خرید آپارتمان ۲ خواب سعادت‌آباد", budget: 9000000000 },
  { id: "c2", name: "سارا محمدی", phone: "09380002233", need: "اجاره ویلا شمال یا لواسان", budget: 50000000 },
];
const seedAppointments = [{ id: "a1", propertyId: "p1", customerId: "c1", date: todayISO(), time: "17:00", notes: "بازدید اول" }];
const seedCalls = [{ id: "cl1", customerId: "c2", date: todayISO(), status: "در انتظار پاسخ", notes: "پیگیری قیمت ویلا" }];

const NAV = [
  { id: "dashboard", label: "داشبورد", icon: LayoutDashboard },
  { id: "properties", label: "فایل‌های ملکی", icon: Building2 },
  { id: "customers", label: "مشتریان", icon: Users },
  { id: "owners", label: "مالکین", icon: UserCircle2 },
  { id: "builders", label: "سازندگان", icon: Hammer },
  { id: "calendar", label: "تقویم بازدید", icon: CalendarDays },
  { id: "calls", label: "پیگیری تماس‌ها", icon: PhoneCall },
];

export default function FloraCRM() {
  const [dark, setDark] = useState(false);
  const c = dark ? T.dark : T.light;
  const [view, setView] = useState("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(null); // { kind, id? }
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const [properties, setProperties] = useState(seedProperties);
  const [owners, setOwners] = useState(seedOwners);
  const [builders, setBuilders] = useState(seedBuilders);
  const [customers, setCustomers] = useState(seedCustomers);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [calls, setCalls] = useState(seedCalls);

  const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  const todaysAppts = appointments.filter((a) => a.date === todayISO()).length;

  const ctx = {
    c, dark, properties, setProperties, owners, setOwners, builders, setBuilders,
    customers, setCustomers, appointments, setAppointments, calls, setCalls,
    notify, setModal, setLightbox, setView,
  };

  const titles = { dashboard: "داشبورد", properties: "فایل‌های ملکی", customers: "مشتریان", owners: "مالکین", builders: "سازندگان", calendar: "تقویم بازدید", calls: "پیگیری تماس‌ها" };

  return (
    <div dir="rtl" style={{ background: c.bg, color: c.ink, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 8px; }
        .press { transition: transform .12s ease, background .15s ease; }
        .press:active { transform: scale(0.97); }
        @keyframes floraUp { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform: translateY(0);} }
        @keyframes floraPop { from { opacity:0; transform: scale(.96);} to { opacity:1; transform: scale(1);} }
        .flora-up { animation: floraUp .25s ease both; }
        .flora-pop { animation: floraPop .18s ease both; }
        select { -webkit-appearance: none; appearance: none; }
        table { border-collapse: collapse; }
        .kanban-drop:hover { background: ${c.primarySoft} !important; }
      `}</style>

      {/* ---- Desktop sidebar (Bitrix-style dark rail) ---- */}
      <div className="hidden md:flex flex-col shrink-0" style={{ width: 236, background: c.sidebarBg, minHeight: "100vh" }}>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.accent})` }}>
            <span style={{ fontSize: 17 }}>🌿</span>
          </div>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Flora CRM</span>
        </div>
        <div className="flex flex-col gap-1 px-3 mt-2">
          {NAV.map((n) => {
            const active = view === n.id;
            const Icon = n.icon;
            return (
              <button key={n.id} onClick={() => setView(n.id)} className="press flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-right"
                style={{ background: active ? "rgba(255,255,255,0.08)" : "transparent" }}>
                <Icon size={17} color={active ? c.primary : c.sidebarMuted} />
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#fff" : c.sidebarInk }}>{n.label}</span>
                {n.id === "calls" && pendingCalls > 0 && <span className="mr-auto" style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: c.accent, borderRadius: 999, padding: "1px 7px" }}>{faDigits(pendingCalls)}</span>}
                {n.id === "calendar" && todaysAppts > 0 && <span className="mr-auto" style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: c.primary, borderRadius: 999, padding: "1px 7px" }}>{faDigits(todaysAppts)}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={() => setDark(!dark)} className="press mt-auto mx-3 mb-5 flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          {dark ? <Sun size={16} color={c.sidebarInk} /> : <Moon size={16} color={c.sidebarInk} />}
          <span style={{ fontSize: 12.5, color: c.sidebarInk, fontWeight: 600 }}>{dark ? "حالت روشن" : "حالت تیره"}</span>
        </button>
      </div>

      {/* ---- Mobile drawer ---- */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex md:hidden" onClick={() => setDrawer(false)}>
          <div style={{ background: "rgba(0,0,0,0.5)" }} className="flex-1" />
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col flora-up" style={{ width: 250, background: c.sidebarBg, minHeight: "100vh" }}>
            <div className="flex items-center justify-between px-5 py-5">
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>🌿 Flora CRM</span>
              <button onClick={() => setDrawer(false)}><X size={18} color="#fff" /></button>
            </div>
            <div className="flex flex-col gap-1 px-3">
              {NAV.map((n) => {
                const active = view === n.id; const Icon = n.icon;
                return (
                  <button key={n.id} onClick={() => { setView(n.id); setDrawer(false); }} className="press flex items-center gap-2.5 rounded-lg px-3 py-3 text-right" style={{ background: active ? "rgba(255,255,255,0.08)" : "transparent" }}>
                    <Icon size={17} color={active ? c.primary : c.sidebarMuted} />
                    <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? "#fff" : c.sidebarInk }}>{n.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- Main column ---- */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ minHeight: "100vh" }}>
        <div className="flex items-center gap-3 px-4 md:px-7 py-4 shrink-0" style={{ background: c.surface, borderBottom: `1px solid ${c.border}` }}>
          <button onClick={() => setDrawer(true)} className="press md:hidden w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.surfaceAlt }}>
            <Menu size={17} color={c.ink} />
          </button>
          <h1 style={{ fontSize: 17, fontWeight: 800 }}>{titles[view]}</h1>
          <div className="flex-1 max-w-md mr-auto hidden sm:flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
            <Search size={15} color={c.muted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی سریع..." style={{ background: "transparent", outline: "none", color: c.ink, width: "100%", fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <button onClick={() => setDark(!dark)} className="press md:hidden w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.surfaceAlt }}>
            {dark ? <Sun size={16} color={c.ink} /> : <Moon size={16} color={c.ink} />}
          </button>
          <button onClick={() => setModal({ kind: "quickadd" })} className="press flex items-center gap-1.5 rounded-lg px-3.5 py-2.5" style={{ background: c.primary }}>
            <Plus size={15} color="#fff" /> <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }} className="hidden sm:inline">افزودن</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-7">
          <div key={view} className="flora-up">
            {view === "dashboard" && <Dashboard ctx={ctx} />}
            {view === "properties" && <PropertiesView ctx={ctx} search={search} />}
            {view === "customers" && <CustomersView ctx={ctx} search={search} />}
            {view === "owners" && <OwnersView ctx={ctx} />}
            {view === "builders" && <BuildersView ctx={ctx} />}
            {view === "calendar" && <CalendarView ctx={ctx} />}
            {view === "calls" && <CallsView ctx={ctx} />}
          </div>
        </div>
      </div>

      {modal && <ModalRouter modal={modal} ctx={ctx} onClose={() => setModal(null)} />}
      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 px-4 py-2.5 rounded-xl text-sm z-50 flora-up" style={{ ...card(c), color: c.ink, fontWeight: 600 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- shared bits ----------
function SectionTitle({ c, title, action }) {
  return <div className="flex items-center justify-between mb-3"><h2 style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</h2>{action}</div>;
}
function EmptyLine({ c, text }) { return <p style={{ color: c.muted, fontSize: 12.5, padding: "16px 4px", textAlign: "center" }}>{text}</p>; }
function Badge({ c, color, bg, children }) { return <span style={{ fontSize: 10.5, fontWeight: 700, color, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{children}</span>; }

// ---------- Dashboard ----------
function Dashboard({ ctx }) {
  const { c, properties, customers, appointments, calls, setModal, setView } = ctx;
  const stats = [
    { label: "فایل فعال", value: properties.filter((p) => p.stage !== "فروخته شد").length, icon: Building2, color: c.primary },
    { label: "مشتری", value: customers.length, icon: Users, color: c.primary },
    { label: "بازدید امروز", value: appointments.filter((a) => a.date === todayISO()).length, icon: CalendarDays, color: c.accent },
    { label: "تماس در انتظار", value: calls.filter((cl) => cl.status !== "انجام‌شد").length, icon: PhoneCall, color: c.accent },
  ];
  const feed = [
    ...appointments.map((a) => ({ type: "appt", date: a.date, ...a })),
    ...calls.map((cl) => ({ type: "call", date: cl.date, ...cl })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="p-4" style={card(c)}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: s.color + "1A" }}><s.icon size={17} color={s.color} /></div>
            <p style={{ fontSize: 22, fontWeight: 800 }}>{faDigits(s.value)}</p>
            <p style={{ fontSize: 12, color: c.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SectionTitle c={c} title="آخرین فایل‌های ملکی" action={<button onClick={() => setView("properties")} style={{ fontSize: 12, color: c.primary, fontWeight: 700 }}>مشاهده همه</button>} />
          <div className="flex flex-col gap-2">
            {properties.slice(0, 5).map((p) => <PropertyListItem key={p.id} p={p} ctx={ctx} />)}
          </div>
        </div>
        <div>
          <SectionTitle c={c} title="فعالیت‌های اخیر" />
          <div style={card(c)} className="p-3">
            {feed.length === 0 && <EmptyLine c={c} text="فعالیتی ثبت نشده" />}
            <div className="flex flex-col">
              {feed.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: i < feed.length - 1 ? `1px solid ${c.border}` : "none" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: f.type === "appt" ? c.primarySoft : c.accentSoft }}>
                    {f.type === "appt" ? <CalendarDays size={13} color={c.primary} /> : <Phone size={13} color={c.accent} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.notes || (f.type === "appt" ? "بازدید" : "تماس")}</p>
                    <p style={{ fontSize: 10.5, color: c.muted }}>{fmtJalali(f.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setModal({ kind: "quickadd" })} className="press w-full mt-3 rounded-lg py-2.5 flex items-center justify-center gap-2" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12.5 }}>
            <Plus size={14} /> افزودن سریع
          </button>
        </div>
      </div>
    </div>
  );
}

function PropertyListItem({ p, ctx }) {
  const { c, setModal } = ctx;
  const Icon = typeIcon(p.type);
  const sold = p.stage === "فروخته شد";
  return (
    <button onClick={() => setModal({ kind: "property-detail", id: p.id })} className="press w-full text-right flex items-center gap-3 p-3" style={{ ...card(c), opacity: sold ? 0.65 : 1 }}>
      <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.primarySoft }}><Icon size={17} color={c.primary} /></div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: sold ? "line-through" : "none" }}>{p.title}</p>
        <p style={{ fontSize: 11, color: c.muted }}>{faDigits(p.area)} متر · {p.deal} · {fmtToman(p.price)}</p>
      </div>
      <StageBadge c={c} stage={p.stage} />
    </button>
  );
}
function StageBadge({ c, stage }) {
  if (stage === "فروخته شد") return <Badge c={c} color={c.danger} bg={c.dangerSoft}>فروخته شد</Badge>;
  if (stage === "در حال مذاکره") return <Badge c={c} color={c.accent} bg={c.accentSoft}>مذاکره</Badge>;
  return <Badge c={c} color={c.success} bg={c.successSoft}>فعال</Badge>;
}

// ---------- Properties view (table + kanban) ----------
function PropertiesView({ ctx, search }) {
  const { c, properties, setModal } = ctx;
  const [mode, setMode] = useState("table");
  const [dealFilter, setDealFilter] = useState("همه");
  const [sortAsc, setSortAsc] = useState(true);
  const [sortKey, setSortKey] = useState("price");

  const filtered = useMemo(() => {
    let out = properties;
    if (search) { const q = search.toLowerCase(); out = out.filter((p) => Object.values(p).some((v) => String(v).toLowerCase().includes(q))); }
    if (dealFilter !== "همه") out = out.filter((p) => p.deal === dealFilter);
    out = [...out].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [properties, search, dealFilter, sortAsc, sortKey]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center rounded-lg p-1 gap-1" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
          <button onClick={() => setMode("table")} className="press flex items-center gap-1.5 rounded-md px-3 py-1.5" style={{ background: mode === "table" ? c.surface : "transparent", boxShadow: mode === "table" ? "0 1px 2px rgba(16,24,40,0.08)" : "none" }}>
            <Table2 size={13} color={mode === "table" ? c.primary : c.muted} /> <span style={{ fontSize: 11.5, fontWeight: 700, color: mode === "table" ? c.primary : c.muted }}>جدول</span>
          </button>
          <button onClick={() => setMode("kanban")} className="press flex items-center gap-1.5 rounded-md px-3 py-1.5" style={{ background: mode === "kanban" ? c.surface : "transparent", boxShadow: mode === "kanban" ? "0 1px 2px rgba(16,24,40,0.08)" : "none" }}>
            <LayoutGrid size={13} color={mode === "kanban" ? c.primary : c.muted} /> <span style={{ fontSize: 11.5, fontWeight: 700, color: mode === "kanban" ? c.primary : c.muted }}>پایپ‌لاین</span>
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {DEAL_FILTERS.map((d) => {
            const active = dealFilter === d;
            return <button key={d} onClick={() => setDealFilter(d)} className="press shrink-0 rounded-full px-3 py-1.5" style={{ background: active ? c.primary : c.surfaceAlt, border: `1px solid ${active ? c.primary : c.border}` }}><span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : c.muted }}>{d}</span></button>;
          })}
        </div>
        <button onClick={() => { setSortKey("price"); setSortAsc((s) => !s); }} className="press flex items-center gap-1.5 rounded-full px-3 py-1.5 mr-auto" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
          <ArrowUpDown size={12} color={c.primary} /> <span style={{ fontSize: 11, fontWeight: 700, color: c.primary, whiteSpace: "nowrap" }}>{sortAsc ? "ارزان‌ترین اول" : "گران‌ترین اول"}</span>
        </button>
      </div>

      {mode === "table" ? <PropertiesTable rows={filtered} ctx={ctx} sortKey={sortKey} sortAsc={sortAsc} setSortKey={setSortKey} setSortAsc={setSortAsc} /> : <PropertiesKanban rows={filtered} ctx={ctx} />}
    </div>
  );
}

function Th({ c, label, active, dir, onClick }) {
  return (
    <th onClick={onClick} style={{ padding: "10px 14px", fontSize: 11.5, color: active ? c.primary : c.muted, fontWeight: 700, textAlign: "right", cursor: "pointer", whiteSpace: "nowrap" }}>
      <span className="flex items-center gap-1">{label} {active && (dir ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}</span>
    </th>
  );
}

function PropertiesTable({ rows, ctx, sortKey, sortAsc, setSortKey, setSortAsc }) {
  const { c, setModal } = ctx;
  const setSort = (k) => { if (sortKey === k) setSortAsc((s) => !s); else { setSortKey(k); setSortAsc(true); } };
  return (
    <div style={{ ...card(c), overflow: "hidden" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ background: c.surfaceAlt, borderBottom: `1px solid ${c.border}` }}>
            <tr>
              <Th c={c} label="عنوان" active={sortKey === "title"} dir={sortAsc} onClick={() => setSort("title")} />
              <Th c={c} label="نوع معامله" active={sortKey === "deal"} dir={sortAsc} onClick={() => setSort("deal")} />
              <Th c={c} label="متراژ" active={sortKey === "area"} dir={sortAsc} onClick={() => setSort("area")} />
              <Th c={c} label="قیمت کل" active={sortKey === "price"} dir={sortAsc} onClick={() => setSort("price")} />
              <Th c={c} label="وضعیت" active={sortKey === "stage"} dir={sortAsc} onClick={() => setSort("stage")} />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const Icon = typeIcon(p.type);
              return (
                <tr key={p.id} onClick={() => setModal({ kind: "property-detail", id: p.id })} className="press" style={{ borderBottom: `1px solid ${c.border}`, cursor: "pointer" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Icon size={14} color={c.primary} /></div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, textDecoration: p.stage === "فروخته شد" ? "line-through" : "none" }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: c.muted, whiteSpace: "nowrap" }}>{p.deal}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: c.muted, whiteSpace: "nowrap" }}>{faDigits(p.area)} متر</td>
                  <td style={{ padding: "12px 14px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtToman(p.price)}</td>
                  <td style={{ padding: "12px 14px" }}><StageBadge c={c} stage={p.stage} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyLine c={c} text="فایلی پیدا نشد" />}
      </div>
    </div>
  );
}

function PropertiesKanban({ rows, ctx }) {
  const { c, setProperties, setModal, notify } = ctx;
  const dragId = useRef(null);
  const onDrop = (stage) => {
    if (!dragId.current) return;
    setProperties((prev) => prev.map((p) => p.id === dragId.current ? { ...p, stage } : p));
    notify("مرحله فایل بروزرسانی شد");
    dragId.current = null;
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STAGES.map((stage) => (
        <div key={stage} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(stage)} className="kanban-drop rounded-xl p-3" style={{ background: c.surfaceAlt, border: `1px dashed ${c.border}`, minHeight: 160 }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{stage}</span>
            <span style={{ fontSize: 11, color: c.muted }}>{faDigits(rows.filter((p) => p.stage === stage).length)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {rows.filter((p) => p.stage === stage).map((p) => {
              const Icon = typeIcon(p.type);
              return (
                <div key={p.id} draggable onDragStart={() => (dragId.current = p.id)} onClick={() => setModal({ kind: "property-detail", id: p.id })}
                  className="press p-3 cursor-grab" style={card(c)}>
                  <div className="flex items-center gap-2 mb-1.5"><Icon size={14} color={c.primary} /><span style={{ fontSize: 12, fontWeight: 700 }}>{p.title}</span></div>
                  <p style={{ fontSize: 11, color: c.muted }}>{p.deal} · {faDigits(p.area)} متر</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: c.primary, marginTop: 4 }}>{fmtToman(p.price)}</p>
                </div>
              );
            })}
            {rows.filter((p) => p.stage === stage).length === 0 && <p style={{ fontSize: 11, color: c.muted, textAlign: "center", padding: "10px 0" }}>خالی</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Customers view ----------
function CustomersView({ ctx, search }) {
  const { c, customers, setModal } = ctx;
  const [sortKey, setSortKey] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const rows = useMemo(() => {
    let out = customers;
    if (search) { const q = search.toLowerCase(); out = out.filter((cu) => Object.values(cu).some((v) => String(v).toLowerCase().includes(q))); }
    return [...out].sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv)); return sortAsc ? cmp : -cmp; });
  }, [customers, search, sortKey, sortAsc]);
  const setSort = (k) => { if (sortKey === k) setSortAsc((s) => !s); else { setSortKey(k); setSortAsc(true); } };

  return (
    <div style={{ ...card(c), overflow: "hidden" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ background: c.surfaceAlt, borderBottom: `1px solid ${c.border}` }}>
            <tr>
              <Th c={c} label="نام" active={sortKey === "name"} dir={sortAsc} onClick={() => setSort("name")} />
              <Th c={c} label="موبایل" active={sortKey === "phone"} dir={sortAsc} onClick={() => setSort("phone")} />
              <Th c={c} label="نیاز" active={false} dir={true} onClick={() => {}} />
              <Th c={c} label="بودجه" active={sortKey === "budget"} dir={sortAsc} onClick={() => setSort("budget")} />
            </tr>
          </thead>
          <tbody>
            {rows.map((cu) => (
              <tr key={cu.id} onClick={() => setModal({ kind: "customer-detail", id: cu.id })} className="press" style={{ borderBottom: `1px solid ${c.border}`, cursor: "pointer" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><UserCircle2 size={16} color={c.primary} /></div>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cu.name}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: c.muted }} dir="ltr">{cu.phone}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: c.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cu.need}</td>
                <td style={{ padding: "12px 14px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtToman(cu.budget)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyLine c={c} text="مشتری‌ای پیدا نشد" />}
      </div>
    </div>
  );
}

// ---------- Owners / Builders ----------
function OwnersView({ ctx }) {
  const { c, owners, setModal } = ctx;
  return (
    <div>
      <SectionTitle c={c} title="مالکین" action={<button onClick={() => setModal({ kind: "owner-form" })} className="press flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12 }}><Plus size={13} /> مالک جدید</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {owners.map((o) => (
          <div key={o.id} className="p-4 flex items-center gap-3" style={card(c)}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><UserCircle2 size={19} color={c.primary} /></div>
            <div><p style={{ fontSize: 13, fontWeight: 700 }}>{o.name}</p><p style={{ fontSize: 11.5, color: c.muted }} dir="ltr">{o.phone}</p></div>
          </div>
        ))}
        {owners.length === 0 && <EmptyLine c={c} text="مالکی ثبت نشده" />}
      </div>
    </div>
  );
}
function BuildersView({ ctx }) {
  const { c, builders, setModal } = ctx;
  return (
    <div>
      <SectionTitle c={c} title="سازندگان" action={<button onClick={() => setModal({ kind: "builder-form" })} className="press flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ background: c.accentSoft, color: c.accent, fontWeight: 700, fontSize: 12 }}><Plus size={13} /> سازنده جدید</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {builders.map((b) => (
          <div key={b.id} className="p-4 flex items-center gap-3" style={card(c)}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: c.accentSoft }}><Hammer size={17} color={c.accent} /></div>
            <div><p style={{ fontSize: 13, fontWeight: 700 }}>{b.name}</p><p style={{ fontSize: 11.5, color: c.muted }} dir="ltr">{b.phone}</p></div>
          </div>
        ))}
        {builders.length === 0 && <EmptyLine c={c} text="سازنده‌ای ثبت نشده" />}
      </div>
    </div>
  );
}

// ---------- Calendar / Calls ----------
function CalendarView({ ctx }) {
  const { c, appointments, properties, customers, setModal } = ctx;
  const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const grouped = sorted.reduce((acc, a) => { (acc[a.date] ||= []).push(a); return acc; }, {});
  return (
    <div>
      <SectionTitle c={c} title="بازدیدهای برنامه‌ریزی‌شده" action={<button onClick={() => setModal({ kind: "appointment-form" })} className="press flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12 }}><Plus size={13} /> بازدید جدید</button>} />
      {Object.keys(grouped).length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-4">
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 8, fontWeight: 700 }}>{date === todayISO() ? "امروز" : fmtJalali(date)}</p>
          <div className="flex flex-col gap-2">
            {items.map((a) => {
              const p = properties.find((x) => x.id === a.propertyId); const cu = customers.find((x) => x.id === a.customerId);
              return (
                <div key={a.id} className="p-3.5 flex items-center gap-3" style={card(c)}>
                  <div className="rounded-lg flex flex-col items-center justify-center shrink-0" style={{ width: 44, height: 44, background: c.primarySoft }}><span style={{ fontSize: 10, color: c.primary, fontWeight: 700 }}>{a.time}</span></div>
                  <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.title || "فایل حذف‌شده"}</p><p style={{ fontSize: 11.5, color: c.muted }}>با {cu?.name || "—"} {a.notes ? `· ${a.notes}` : ""}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CallsView({ ctx }) {
  const { c, calls, customers, setCalls, setModal } = ctx;
  return (
    <div>
      <SectionTitle c={c} title="پیگیری تماس‌ها" action={<button onClick={() => setModal({ kind: "call-form" })} className="press flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12 }}><Plus size={13} /> تماس جدید</button>} />
      <div className="flex flex-col gap-2">
        {calls.map((cl) => {
          const cu = customers.find((x) => x.id === cl.customerId);
          const done = cl.status === "انجام‌شد";
          return (
            <div key={cl.id} className="p-3.5 flex items-center gap-3" style={card(c)}>
              <button onClick={() => setCalls((prev) => prev.map((x) => x.id === cl.id ? { ...x, status: done ? "در انتظار پاسخ" : "انجام‌شد" } : x))}>
                <CheckCircle2 size={22} color={done ? c.success : c.accent} fill={done ? c.success : "none"} />
              </button>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? c.muted : c.ink }}>{cu?.name || "—"}</p>
                <p style={{ fontSize: 11.5, color: c.muted }}>{cl.notes}</p>
              </div>
              <span style={{ fontSize: 10.5, color: done ? c.muted : c.accent, fontWeight: done ? 400 : 700 }}>{fmtJalali(cl.date)}</span>
            </div>
          );
        })}
        {calls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
    </div>
  );
}

// ---------- Media gallery & lightbox ----------
function MediaGallery({ c, media, onAdd, onRemove, onView, uploading }) {
  const inputRef = useRef(null);
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      <button onClick={() => inputRef.current?.click()} className="press shrink-0 rounded-xl flex flex-col items-center justify-center gap-1" style={{ width: 80, height: 80, ...card(c) }}>
        {uploading ? <Loader2 size={17} color={c.primary} className="animate-spin" /> : <ImagePlus size={17} color={c.primary} />}
        <span style={{ fontSize: 9.5, color: c.primary, fontWeight: 700 }}>افزودن</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
      {media.map((m) => (
        <div key={m.id} className="relative shrink-0 rounded-xl overflow-hidden" style={{ width: 80, height: 80, border: `1px solid ${c.border}` }}>
          <button onClick={() => onView(m)} className="w-full h-full">
            {m.type === "image" ? <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <div className="relative w-full h-full">
                <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}><Play size={16} color="#fff" fill="#fff" /></div>
              </div>
            )}
          </button>
          <button onClick={() => onRemove(m.id)} className="press absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}><X size={11} color="#fff" /></button>
        </div>
      ))}
    </div>
  );
}
function Lightbox({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center flora-pop" style={{ background: "rgba(0,0,0,0.9)" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 left-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><X size={16} color="#fff" /></button>
      {item.type === "image" ? <img src={item.url} alt="" style={{ maxWidth: "92%", maxHeight: "85%", borderRadius: 10, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} /> : <video src={item.url} controls autoPlay style={{ maxWidth: "92%", maxHeight: "85%", borderRadius: 10 }} onClick={(e) => e.stopPropagation()} />}
    </div>
  );
}

// ---------- Modal shell ----------
function Modal({ c, title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5" style={{ background: "rgba(15,20,35,0.5)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full flora-pop overflow-y-auto" style={{ ...card(c), maxWidth: wide ? 620 : 460, maxHeight: "88vh", borderRadius: "18px 18px 0 0" }}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ background: c.surface, borderBottom: `1px solid ${c.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surfaceAlt }}><X size={14} color={c.ink} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ c, label, children }) { return <div className="mb-3.5"><label style={{ fontSize: 12, color: c.muted, marginBottom: 6, display: "block", fontWeight: 600 }}>{label}</label>{children}</div>; }
function inputStyle(c) { return { width: "100%", background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 10, padding: "11px 13px", fontSize: 13.5, color: c.ink, outline: "none", fontFamily: "inherit" }; }
function Select({ c, value, onChange, options, placeholder }) {
  return <select value={value} onChange={onChange} style={inputStyle(c)}><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function SubmitBtn({ c, label, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} className="press w-full rounded-lg py-3 mt-1" style={{ background: disabled ? c.surfaceAlt : c.primary, color: disabled ? c.muted : "#fff", fontWeight: 700, fontSize: 13.5 }}>{label}</button>;
}

// ---------- Jalali date picker ----------
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
      <button type="button" onClick={() => setOpen((o) => !o)} className="press w-full flex items-center gap-2" style={{ ...inputStyle(c), justifyContent: "flex-start" }}>
        <CalendarDays size={15} color={c.primary} /><span>{fmtJalali(value)}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl p-3 flora-up" style={card(c)}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => nav(-1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surfaceAlt }}><ChevronRight size={14} color={c.ink} /></button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{MONTHS_FA[viewM - 1]} {faDigits(viewY)}</span>
            <button onClick={() => nav(1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surfaceAlt }}><ChevronLeft size={14} color={c.ink} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">{WEEK_FA.map((w, i) => <div key={i} style={{ fontSize: 10.5, color: c.muted, textAlign: "center", fontWeight: 700 }}>{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const isSel = day && viewY === selJ[0] && viewM === selJ[1] && day === selJ[2];
              return day ? <button key={i} onClick={() => pick(day)} className="press rounded-lg flex items-center justify-center" style={{ height: 30, fontSize: 12, fontWeight: isSel ? 800 : 500, color: isSel ? "#fff" : c.ink, background: isSel ? c.primary : "transparent" }}>{faDigits(day)}</button> : <div key={i} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Modal router ----------
function ModalRouter({ modal, ctx, onClose }) {
  const { kind, id } = modal;
  if (kind === "quickadd") return <QuickAddModal ctx={ctx} onClose={onClose} />;
  if (kind === "property-detail") return <PropertyDetailModal id={id} ctx={ctx} onClose={onClose} />;
  if (kind === "customer-detail") return <CustomerDetailModal id={id} ctx={ctx} onClose={onClose} />;
  if (kind === "property-form") return <PropertyForm ctx={ctx} onClose={onClose} />;
  if (kind === "customer-form") return <CustomerForm ctx={ctx} onClose={onClose} />;
  if (kind === "owner-form") return <OwnerForm ctx={ctx} onClose={onClose} />;
  if (kind === "builder-form") return <BuilderForm ctx={ctx} onClose={onClose} />;
  if (kind === "appointment-form") return <AppointmentForm ctx={ctx} onClose={onClose} />;
  if (kind === "call-form") return <CallForm ctx={ctx} onClose={onClose} />;
  return null;
}

function QuickAddModal({ ctx, onClose }) {
  const { c, setModal } = ctx;
  const options = [
    { id: "property-form", label: "فایل ملک جدید", icon: Building2 },
    { id: "customer-form", label: "مشتری جدید", icon: Users },
    { id: "owner-form", label: "مالک جدید", icon: UserCircle2 },
    { id: "builder-form", label: "سازنده جدید", icon: Hammer },
    { id: "appointment-form", label: "قرار بازدید جدید", icon: CalendarDays },
    { id: "call-form", label: "پیگیری تماس جدید", icon: PhoneCall },
  ];
  return (
    <Modal c={c} title="افزودن سریع" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => setModal({ kind: o.id })} className="press w-full flex items-center gap-3 rounded-lg p-3" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
            <div className="rounded-lg flex items-center justify-center" style={{ width: 34, height: 34, background: c.primarySoft }}><o.icon size={16} color={c.primary} /></div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function InfoChip({ c, icon: Icon, label }) {
  return <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}><Icon size={12} color={c.muted} /><span style={{ fontSize: 11, color: c.ink }}>{label}</span></div>;
}

function PropertyDetailModal({ id, ctx, onClose }) {
  const { c, properties, setProperties, owners, builders, appointments, customers, setLightbox, notify } = ctx;
  const p = properties.find((x) => x.id === id);
  const owner = owners.find((o) => o.id === p?.ownerId);
  const builder = builders.find((b) => b.id === p?.builderId);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adText, setAdText] = useState(p?.desc || "");
  if (!p) return null;

  const addMedia = async (fileList) => { setUploading(true); const items = await filesToMedia(fileList); setProperties((prev) => prev.map((x) => x.id === id ? { ...x, media: [...(x.media || []), ...items] } : x)); setUploading(false); };
  const removeMedia = (mediaId) => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, media: x.media.filter((m) => m.id !== mediaId) } : x));
  const propAppts = appointments.filter((a) => a.propertyId === id);

  const generateAd = async () => {
    setAiLoading(true);
    try {
      const prompt = `یک آگهی ملکی حرفه‌ای، جذاب و کوتاه (حداکثر ۵ خط) به زبان فارسی برای این فایل ملکی بنویس:
عنوان: ${p.title}\nنوع: ${p.type}\nنوع معامله: ${p.deal}\nمتراژ: ${p.area} متر\nتعداد اتاق: ${p.rooms}\nآدرس: ${p.address}\nقیمت کل: ${fmtToman(p.price)}\nفقط متن آگهی را برگردان.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const text = data?.content?.find((b2) => b2.type === "text")?.text || "";
      setAdText(text.trim());
      setProperties((prev) => prev.map((x) => x.id === id ? { ...x, desc: text.trim() } : x));
    } catch { notify("خطا در تولید آگهی"); }
    setAiLoading(false);
  };

  return (
    <Modal c={c} title="جزئیات فایل" onClose={onClose} wide>
      <MediaGallery c={c} media={p.media || []} uploading={uploading} onAdd={addMedia} onRemove={removeMedia} onView={setLightbox} />
      <div className="mt-4 flex items-center justify-between">
        <Badge c={c} color={c.primary} bg={c.primarySoft}>{p.deal}</Badge>
        <StageBadge c={c} stage={p.stage} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, marginTop: 10 }}>{p.title}</h3>
      <p style={{ fontSize: 20, fontWeight: 800, color: c.primary, marginTop: 4 }}>{fmtToman(p.price)}</p>
      <p style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{fmtToman(p.pricePerMeter)} در هر متر · {faDigits(p.area)} متر</p>
      <div className="flex gap-2 mt-3 flex-wrap">
        <InfoChip c={c} icon={Ruler} label={`${faDigits(p.area)} متر`} />
        <InfoChip c={c} icon={typeIcon(p.type)} label={p.type} />
        <InfoChip c={c} icon={Home} label={`${faDigits(p.rooms)} خواب`} />
      </div>
      <div className="flex items-center gap-1.5 mt-3" style={{ color: c.muted, fontSize: 12.5 }}><MapPin size={13} /> {p.address}</div>
      {owner && <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}><UserCircle2 size={13} /> مالک: {owner.name} · <span dir="ltr">{owner.phone}</span></div>}
      {builder && <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}><Hammer size={13} /> سازنده: {builder.name} · <span dir="ltr">{builder.phone}</span></div>}

      <div className="flex gap-2 mt-4">
        {STAGES.map((s) => (
          <button key={s} onClick={() => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, stage: s } : x))} className="press flex-1 rounded-lg py-2.5 flex items-center justify-center gap-1.5"
            style={{ background: p.stage === s ? c.primary : c.surfaceAlt, color: p.stage === s ? "#fff" : c.muted, fontWeight: 700, fontSize: 11.5 }}>
            {s === "فروخته شد" && <BadgeCheck size={13} />} {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-4 mt-4" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-between mb-2.5">
          <p style={{ fontSize: 13, fontWeight: 700 }}>آگهی</p>
          <button onClick={generateAd} disabled={aiLoading} className="press flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontSize: 11.5, fontWeight: 700 }}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {aiLoading ? "در حال تولید..." : "تولید با AI"}
          </button>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.9, color: adText ? c.ink : c.muted }}>{adText || "هنوز آگهی‌ای تولید نشده."}</p>
      </div>

      <SectionTitle c={c} title="بازدیدهای این فایل" />
      <div className="flex flex-col gap-2">
        {propAppts.map((a) => { const cu = customers.find((x) => x.id === a.customerId); return (
          <div key={a.id} className="p-3 flex items-center gap-3" style={{ background: c.surfaceAlt, borderRadius: 10, border: `1px solid ${c.border}` }}>
            <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: c.primarySoft }}><span style={{ fontSize: 9.5, color: c.primary, fontWeight: 700 }}>{a.time}</span></div>
            <p style={{ fontSize: 12, color: c.ink }}>با {cu?.name || "—"} · {fmtJalali(a.date)}</p>
          </div>
        ); })}
        {propAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>

      <button onClick={() => { setProperties((prev) => prev.filter((x) => x.id !== id)); onClose(); notify("فایل حذف شد"); }} className="press w-full mt-5 rounded-lg py-2.5 flex items-center justify-center gap-2" style={{ background: c.dangerSoft, color: c.danger, fontWeight: 700, fontSize: 12.5 }}>
        <Trash2 size={14} /> حذف فایل
      </button>
    </Modal>
  );
}

function CustomerDetailModal({ id, ctx, onClose }) {
  const { c, customers, calls, appointments, properties, setCustomers, notify } = ctx;
  const cu = customers.find((x) => x.id === id);
  if (!cu) return null;
  const custCalls = calls.filter((cl) => cl.customerId === id);
  const custAppts = appointments.filter((a) => a.customerId === id);
  return (
    <Modal c={c} title="جزئیات مشتری" onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><UserCircle2 size={24} color={c.primary} /></div>
        <div><p style={{ fontSize: 15, fontWeight: 800 }}>{cu.name}</p><p style={{ fontSize: 12, color: c.muted }} dir="ltr">{cu.phone}</p></div>
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>نیاز مشتری</p><p style={{ fontSize: 13 }}>{cu.need}</p>
        <p style={{ fontSize: 12, color: c.muted, marginTop: 10, marginBottom: 4 }}>بودجه</p><p style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>{fmtToman(cu.budget)}</p>
      </div>
      <SectionTitle c={c} title="تاریخچه تماس" />
      <div className="flex flex-col gap-2 mb-4">
        {custCalls.map((cl) => <div key={cl.id} className="p-3 flex items-center justify-between" style={{ background: c.surfaceAlt, borderRadius: 10, border: `1px solid ${c.border}` }}><span style={{ fontSize: 12 }}>{cl.notes}</span><span style={{ fontSize: 11, color: c.muted }}>{fmtJalali(cl.date)}</span></div>)}
        {custCalls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <SectionTitle c={c} title="بازدیدهای برنامه‌ریزی‌شده" />
      <div className="flex flex-col gap-2 mb-4">
        {custAppts.map((a) => { const p = properties.find((x) => x.id === a.propertyId); return <div key={a.id} className="p-3 flex items-center justify-between" style={{ background: c.surfaceAlt, borderRadius: 10, border: `1px solid ${c.border}` }}><span style={{ fontSize: 12 }}>{p?.title}</span><span style={{ fontSize: 11, color: c.muted }}>{fmtJalali(a.date)}</span></div>; })}
        {custAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
      <button onClick={() => { setCustomers((prev) => prev.filter((x) => x.id !== id)); onClose(); notify("مشتری حذف شد"); }} className="press w-full rounded-lg py-2.5 flex items-center justify-center gap-2" style={{ background: c.dangerSoft, color: c.danger, fontWeight: 700, fontSize: 12.5 }}>
        <Trash2 size={14} /> حذف مشتری
      </button>
    </Modal>
  );
}

// ---------- Forms ----------
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

  const addMedia = async (fileList) => { setUploading(true); const items = await filesToMedia(fileList); setMedia((prev) => [...prev, ...items]); setUploading(false); };
  const useMyLocation = () => {
    if (!navigator.geolocation) { notify("موقعیت مکانی در این دستگاه در دسترس نیست"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fa`);
        const data = await res.json();
        setF((prev) => ({ ...prev, address: data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        notify("آدرس از موقعیت مکانی دریافت شد");
      } catch { notify("خطا در دریافت آدرس"); }
      setLocating(false);
    }, () => { notify("دسترسی به موقعیت مکانی رد شد"); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <Modal c={c} title="ثبت فایل ملک" onClose={onClose} wide>
      <Field c={c} label="عکس و فیلم فایل"><MediaGallery c={c} media={media} uploading={uploading} onAdd={addMedia} onRemove={(mid) => setMedia((p) => p.filter((m) => m.id !== mid))} onView={() => {}} /></Field>
      <Field c={c} label="عنوان فایل"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder="مثلاً آپارتمان ۹۰ متری تهرانپارس" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نوع ملک"><Select c={c} value={f.type} onChange={set("type")} placeholder="انتخاب کنید" options={["آپارتمان","ویلا","زمین","مغازه","اداری"].map(v=>({value:v,label:v}))} /></Field>
        <Field c={c} label="نوع معامله"><Select c={c} value={f.deal} onChange={set("deal")} placeholder="انتخاب کنید" options={["فروش","پیش‌فروش","اجاره","رهن کامل"].map(v=>({value:v,label:v}))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="متراژ (متر)"><input style={inputStyle(c)} inputMode="numeric" value={f.area} onChange={set("area")} /></Field>
        <Field c={c} label="قیمت هر متر (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.pricePerMeter} onChange={set("pricePerMeter")} /></Field>
      </div>
      <div className="rounded-lg px-4 py-3 mb-3.5 flex items-center justify-between" style={{ background: c.primarySoft }}>
        <span style={{ fontSize: 12.5, color: c.primary, fontWeight: 700 }}>مبلغ کل (خودکار)</span><span style={{ fontSize: 15, color: c.primary, fontWeight: 800 }}>{fmtToman(total)}</span>
      </div>
      <Field c={c} label="تعداد اتاق"><input style={inputStyle(c)} inputMode="numeric" value={f.rooms} onChange={set("rooms")} /></Field>
      <Field c={c} label="آدرس">
        <div className="flex gap-2">
          <input style={{ ...inputStyle(c), flex: 1 }} value={f.address} onChange={set("address")} placeholder="آدرس را بنویس یا از موقعیت مکانی بگیر" />
          <button onClick={useMyLocation} disabled={locating} className="press shrink-0 rounded-lg flex items-center justify-center" style={{ width: 44, background: c.primarySoft }}>{locating ? <Loader2 size={16} color={c.primary} className="animate-spin" /> : <LocateFixed size={16} color={c.primary} />}</button>
        </div>
      </Field>
      <Field c={c} label="مالک"><Select c={c} value={f.ownerId} onChange={set("ownerId")} placeholder="انتخاب مالک (اختیاری)" options={owners.map(o=>({value:o.id,label:o.name}))} /></Field>
      {isPreSale && <Field c={c} label="سازنده"><Select c={c} value={f.builderId} onChange={set("builderId")} placeholder="انتخاب سازنده" options={builders.map(b=>({value:b.id,label:b.name}))} /></Field>}
      <SubmitBtn c={c} label="ذخیره فایل" disabled={!valid} onClick={() => {
        setProperties((prev) => [{ id: uid(), stage: "فعال", desc: "", media, ...f, pricePerMeter: Number(f.pricePerMeter), area: Number(f.area), rooms: Number(f.rooms) || 0, price: total }, ...prev]);
        notify("فایل با موفقیت ثبت شد"); onClose();
      }} />
    </Modal>
  );
}

function CustomerForm({ ctx, onClose }) {
  const { c, setCustomers, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "", need: "", budget: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <Modal c={c} title="ثبت مشتری" onClose={onClose}>
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" inputMode="numeric" value={f.phone} onChange={set("phone")} /></Field>
      <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={f.need} onChange={set("need")} placeholder="مثلاً خرید آپارتمان ۲ خواب" /></Field>
      <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.budget} onChange={set("budget")} /></Field>
      <SubmitBtn c={c} label="ذخیره مشتری" disabled={!valid} onClick={() => { setCustomers((prev) => [{ id: uid(), ...f, budget: Number(f.budget) || 0 }, ...prev]); notify("مشتری با موفقیت ثبت شد"); onClose(); }} />
    </Modal>
  );
}

function OwnerForm({ ctx, onClose }) {
  const { c, setOwners, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <Modal c={c} title="ثبت مالک" onClose={onClose}>
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" inputMode="numeric" value={f.phone} onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label="ذخیره مالک" disabled={!valid} onClick={() => { setOwners((prev) => [{ id: uid(), ...f }, ...prev]); notify("مالک با موفقیت ثبت شد"); onClose(); }} />
    </Modal>
  );
}

function BuilderForm({ ctx, onClose }) {
  const { c, setBuilders, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <Modal c={c} title="ثبت سازنده" onClose={onClose}>
      <Field c={c} label="نام شرکت / سازنده"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" inputMode="numeric" value={f.phone} onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label="ذخیره سازنده" disabled={!valid} onClick={() => { setBuilders((prev) => [{ id: uid(), ...f }, ...prev]); notify("سازنده با موفقیت ثبت شد"); onClose(); }} />
    </Modal>
  );
}

function AppointmentForm({ ctx, onClose }) {
  const { c, properties, customers, setAppointments, notify } = ctx;
  const [f, setF] = useState({ propertyId: "", customerId: "", date: todayISO(), time: "10:00", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.propertyId && f.customerId && f.date && f.time;
  return (
    <Modal c={c} title="ثبت قرار بازدید" onClose={onClose}>
      <Field c={c} label="فایل ملک"><Select c={c} value={f.propertyId} onChange={set("propertyId")} placeholder="انتخاب فایل" options={properties.map(p=>({value:p.id,label:p.title}))} /></Field>
      <Field c={c} label="مشتری"><Select c={c} value={f.customerId} onChange={set("customerId")} placeholder="انتخاب مشتری" options={customers.map(cu=>({value:cu.id,label:cu.name}))} /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="ساعت"><input type="time" style={inputStyle(c)} value={f.time} onChange={set("time")} /></Field>
      <Field c={c} label="یادداشت"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} /></Field>
      <SubmitBtn c={c} label="ذخیره قرار بازدید" disabled={!valid} onClick={() => { setAppointments((prev) => [{ id: uid(), ...f }, ...prev]); notify("بازدید ثبت شد"); onClose(); }} />
    </Modal>
  );
}

function CallForm({ ctx, onClose }) {
  const { c, customers, setCalls, notify } = ctx;
  const [f, setF] = useState({ customerId: "", date: todayISO(), status: "در انتظار پاسخ", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.customerId;
  return (
    <Modal c={c} title="ثبت پیگیری تماس" onClose={onClose}>
      <Field c={c} label="مشتری"><Select c={c} value={f.customerId} onChange={set("customerId")} placeholder="انتخاب مشتری" options={customers.map(cu=>({value:cu.id,label:cu.name}))} /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="یادداشت تماس"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} placeholder="موضوع تماس..." /></Field>
      <SubmitBtn c={c} label="ذخیره تماس" disabled={!valid} onClick={() => { setCalls((prev) => [{ id: uid(), ...f }, ...prev]); notify("تماس ثبت شد"); onClose(); }} />
    </Modal>
  );
}
