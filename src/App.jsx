import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, Building2, Users, Search, Plus, X, Moon, Sun, Sparkles, MapPin, Ruler,
  UserCircle2, PhoneCall, CheckCircle2, Loader2, Trash2, ImagePlus, Play,
  ChevronLeft, ChevronRight, Hammer, CalendarDays, Trees, Store, Briefcase,
  ArrowUpDown, BadgeCheck, Bell, MoreHorizontal, Calendar, ArrowRight,
  LayoutList, LayoutGrid, ChevronUp, Download, Upload, Building, Columns3, Edit3,
  MessageSquare, AlertTriangle, TrendingUp, Bot, RefreshCw, Send, Link2, Wand2, MessageCircle, Wallet,
  CreditCard, Banknote, Landmark, FileCheck, Award, TrendingDown, ChevronDown, Eye, FileText, Tag, StickyNote, Image as ImageIcon, Flame, Mic,
} from "lucide-react";

// ---------- Local persistence (IndexedDB) — keeps data on this device between visits ----------
const DB_NAME = "flora-crm-db", STORE = "kv", DATA_KEY = "flora-data", SETTINGS_KEY = "flora-settings", REMINDER_KEY = "flora-last-reminder", COPILOT_KEY = "flora-copilot", CHAT_KEY = "flora-ai-chat", FINANCE_AI_KEY = "flora-finance-ai", MISSION_KEY = "flora-mission", AUTOBACKUP_KEY = "flora-autobackup", NBA_KEY = "flora-nba-outcomes", STREAK_KEY = "flora-streak";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Jalali (Persian) calendar helpers ----------
const div = (a, b) => Math.floor(a / b);
// Latin digits read faster for money and phone numbers; Persian month names stay Persian.
const faDigits = (v) => String(v);
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
// Flora-branded icon per property type / deal, used where the brand icons shine.
const floraTypeIcon = (t, deal) => {
  if (deal === "پیش‌فروش") return "investment";
  if (t === "ویلا" || t === "زمین") return "villa";
  if (t === "مغازه" || t === "اداری") return "multiunit";
  return "residential";
};

const toEnDigits = (s) => String(s ?? "")
  .replace(/[۰-۹٠-٩]/g, (d) => {
    const p = "۰۱۲۳۴۵۶۷۸۹".indexOf(d); if (p > -1) return p;
    const a = "٠١٢٣٤٥٦٧٨٩".indexOf(d); return a > -1 ? a : d;
  });
// Persian users write decimals with ٫ or / (e.g. ۰/۵ = 0.5). Use this for any
// numeric input where a fraction is allowed, so "۰/۵" and "0.5" both mean 0.5.
const toDecimal = (v) => Number(toEnDigits(v).replace(/[٫،/]/g, ".").replace(/[^0-9.]/g, "")) || 0;
const toNum = (v) => Number(toEnDigits(v).replace(/[^0-9.]/g, "")) || 0;

// Parses key fields out of ad text the user pasted (Divar disallows automated fetching,
// so this works on text a human already copied from their own browser — not a scraper).
function parseDivarText(raw) {
  const norm = toEnDigits(raw || "");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || "";
  const areaMatch = norm.match(/(\d{2,4})\s*متر/);
  const roomsMatch = norm.match(/(\d)\s*(خواب|اتاق)/);
  const floorMatch = norm.match(/طبقه[:\s]*(\d{1,2})/);
  let deal = "فروش";
  if (/پیش[\s\u200c]?فروش/.test(raw)) deal = "پیش‌فروش";
  const priceMatches = [...norm.matchAll(/([\d,]{6,})\s*تومان/g)].map((m) => Number(m[1].replace(/,/g, "")));
  const price = priceMatches.length ? Math.max(...priceMatches) : 0;
  const area = areaMatch ? Number(areaMatch[1]) : 0;
  const pricePerMeter = price && area ? Math.round(price / area) : 0;
  const furnished = /با\s*لوازم|فول\s*مبله|مبله/.test(raw) ? "با لوازم" : "بدون لوازم";
  let type = "آپارتمان";
  if (/ویلا/.test(raw)) type = "ویلا"; else if (/زمین|کلنگی/.test(raw)) type = "زمین"; else if (/مغازه|تجاری/.test(raw)) type = "مغازه"; else if (/اداری|دفتر\s*کار/.test(raw)) type = "اداری";
  return { title, type, deal, area: area || "", pricePerMeter: pricePerMeter || "", rooms: roomsMatch ? roomsMatch[1] : "", floor: floorMatch ? floorMatch[1] : "1", furnished };
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtToman = (n) => (n ? Math.round(n).toLocaleString("en-US") : "0") + " تومان";
const todayISO = () => new Date().toISOString().slice(0, 10);
// Phone photos are 3-8MB each. Storing them raw made IndexedDB huge and every save slow,
// so images are downscaled to <=1280px and re-encoded as JPEG before they're ever saved.
const MAX_IMAGE_DIM = 1280, IMAGE_QUALITY = 0.72;
// iOS Safari accepts canvas.toDataURL("image/webp",...) without throwing, but silently
// returns a PNG instead of encoding — so testing once here is the only reliable way to
// know if WebP will actually work. When it won't, fall back to a tighter JPEG so photos
// still shrink instead of silently staying full-size.
let _webpOk = null;
const supportsWebp = () => {
  if (_webpOk !== null) return _webpOk;
  try {
    const c = document.createElement("canvas"); c.width = 1; c.height = 1;
    _webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { _webpOk = false; }
  return _webpOk;
};
const FALLBACK_DIM = 1280, FALLBACK_QUALITY = 0.78; // used only when WebP isn't actually supported
const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const webpOk = supportsWebp();
      const maxDim = webpOk ? MAX_IMAGE_DIM : FALLBACK_DIM;
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      try {
        resolve(webpOk ? canvas.toDataURL("image/webp", IMAGE_QUALITY) : canvas.toDataURL("image/jpeg", FALLBACK_QUALITY));
      }
      catch { resolve(reader.result); }
    };
    img.onerror = () => resolve(reader.result);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
// Re-encodes an image already stored as a data URL (jpeg/png) into WebP —
// used to bulk-shrink photos uploaded before WebP was the default.
// Re-shrinks a photo already stored as a data URL. Where WebP encoding actually
// works, it re-encodes to WebP. Where it doesn't (iOS Safari silently no-ops),
// it recompresses to a smaller, tighter JPEG instead — so the size drops either way.
const reencodeToWebp = (dataUrl) => new Promise((resolve) => {
  if (!dataUrl) return resolve(dataUrl);
  const webpOk = supportsWebp();
  if (webpOk && dataUrl.startsWith("data:image/webp")) return resolve(dataUrl); // already optimal
  const img = new Image();
  img.onload = () => {
    const maxDim = webpOk ? MAX_IMAGE_DIM : FALLBACK_DIM;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    try {
      resolve(webpOk ? canvas.toDataURL("image/webp", IMAGE_QUALITY) : canvas.toDataURL("image/jpeg", FALLBACK_QUALITY));
    } catch { resolve(dataUrl); }
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});
const filesToMedia = (fileList) => Promise.all(Array.from(fileList).map(async (file) => {
  const isVideo = file.type.startsWith("video");
  if (isVideo) {
    const url = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
    return { id: uid(), type: "video", url, name: file.name };
  }
  return { id: uid(), type: "image", url: await compressImage(file), name: file.name };
}));

const STAGES = ["فعال", "در حال مذاکره", "فروخته شد"];
// Where a buyer is in their journey — cleaned-up, agent-friendly labels.
const CUSTOMER_STAGES = ["در حال بررسی", "دنبال سرمایه‌گذاری", "دنبال پیش‌فروش", "خرید کرد", "بدون پیگیری"];
const CUSTOMER_STAGE_COLOR = (c) => ({
  "در حال بررسی": c.primary,
  "دنبال سرمایه‌گذاری": c.purple,
  "دنبال پیش‌فروش": c.attn,
  "خرید کرد": c.success,
  "بدون پیگیری": c.muted,
});
// Compact money for budgets: 10000000000 → "۱۰ میلیارد", 850000000 → "۸۵۰ میلیون".
const fmtBudgetShort = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e9) { const b = n / 1e9; return `${faDigits(Number.isInteger(b) ? b : b.toFixed(1))} میلیارد`; }
  if (n >= 1e6) { const m = Math.round(n / 1e6); return `${faDigits(m)} میلیون`; }
  if (n > 0) return fmtToman(n);
  return "—";
};
const BUILD_STAGES = ["گودبرداری", "فونداسیون", "اسکلت", "سفت‌کاری", "نازک‌کاری", "نما", "آماده تحویل"];
const DEAL_FILTERS = ["همه", "فروش", "پیش‌فروش"];
const TYPE_FILTERS = ["همه", "آپارتمان", "ویلا", "زمین", "مغازه", "اداری"];
const STAGE_FILTERS = ["همه", "فعال", "در حال مذاکره", "فروخته شد"];

// ---------- Glassmorphism tokens ----------
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
// Counts up to the value instead of popping in, which makes figures feel alive.
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function CountUpToman({ value, className, style }) {
  const v = useCountUp(value);
  return <span className={className} style={style}>{fmtToman(v)}</span>;
}

function CountUpNum({ value, style }) {
  const v = useCountUp(value, 700);
  return <span style={style}>{faDigits(v)}</span>;
}

// ── Design system ────────────────────────────────────────────
// One typographic scale (6 steps), one spacing scale (multiples of 4), and a
// small set of radii. Everything visual should pull from these, not magic numbers.
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

// ---------- Seed data ----------
const seedOwners = [{ id: "o1", name: "آقای رحیمی", phone: "09121234567" }, { id: "o2", name: "خانم صادقی", phone: "09351234567" }];
const seedBuilders = [{ id: "b1", name: "شرکت سازه پارس", phone: "02122223333" }];
const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString();
const seedProperties = [
  { id: "p1", title: "آپارتمان ۱۲۰ متری سعادت‌آباد", type: "آپارتمان", deal: "فروش", pricePerMeter: 70000000, price: 8400000000, area: 120, rooms: 2, floor: 3, furnished: "با لوازم", address: "سعادت‌آباد، خیابان سرو", ownerId: "o1", builderId: "", stage: "فعال", desc: "", media: [], createdAt: daysAgoISO(3) },
  { id: "p2", title: "ویلا دوبلکس لواسان", type: "ویلا", deal: "فروش", pricePerMeter: 150000000, price: 45000000000, area: 300, rooms: 4, floor: 1, furnished: "بدون لوازم", address: "لواسان، جاده امام‌زاده", ownerId: "o2", builderId: "", stage: "در حال مذاکره", desc: "", media: [], createdAt: daysAgoISO(52) },
  { id: "p3", title: "پیش‌فروش برج مروارید", type: "آپارتمان", deal: "پیش‌فروش", pricePerMeter: 55000000, price: 4950000000, area: 90, rooms: 2, floor: 7, furnished: "بدون لوازم", address: "پونک، بلوار گلستان", ownerId: "", builderId: "b1", stage: "فعال", desc: "", media: [], createdAt: daysAgoISO(10) },
];
const seedCustomers = [
  { id: "c1", name: "مهدی کریمی", phone: "09190001122", need: "خرید آپارتمان ۲ خواب سعادت‌آباد", budget: 9000000000 },
  { id: "c2", name: "سارا محمدی", phone: "09380002233", need: "اجاره ویلا شمال یا لواسان", budget: 50000000 },
];
const seedAppointments = [{ id: "a1", propertyId: "p1", customerId: "c1", customerName: "مهدی کریمی", date: todayISO(), time: "17:00", notes: "بازدید اول" }];
const seedCalls = [{ id: "cl1", customerId: "c2", customerName: "سارا محمدی", customerPhone: "09380002233", date: todayISO(), status: "در انتظار پاسخ", notes: "پیگیری قیمت ویلا" }];
const seedDeals = [
  { id: "d1", propertyId: "p1", propertyTitle: "آپارتمان ۱۲۰ متری سعادت‌آباد", sellerName: "آقای رحیمی", sellerPhone: "09121234567", buyerName: "مهدی کریمی", buyerPhone: "09190001122", price: 8400000000, sellerPct: 1, buyerPct: 0.5, advisor: "من", status: "تسویه شده", createdAt: daysAgoISO(20) },
  { id: "d2", propertyId: "p2", propertyTitle: "ویلا دوبلکس لواسان", sellerName: "خانم صادقی", sellerPhone: "09351234567", buyerName: "سارا محمدی", buyerPhone: "09380002233", price: 45000000, sellerPct: 5, buyerPct: 0, advisor: "من", status: "در انتظار پرداخت", createdAt: daysAgoISO(8) },
];
const seedPayments = [
  { id: "pay1", dealId: "d1", payerType: "seller", amount: 84000000, date: daysAgoISO(18).slice(0, 10), method: "transfer", tracking: "", note: "" },
];
const seedExpenses = [
  { id: "exp1", category: "تبلیغات دیوار", title: "شارژ آگهی دیوار", amount: 2500000, date: daysAgoISO(10).slice(0, 10), note: "" },
  { id: "exp2", category: "اجاره مغازه", title: "اجاره دفتر", amount: 15000000, date: daysAgoISO(15).slice(0, 10), note: "" },
];
const seedOfficeIncomes = [
  { id: "inc1", category: "حق مشاوره", title: "حق مشاوره قرارداد اجاره", amount: 5000000, date: daysAgoISO(5).slice(0, 10), note: "" },
];

export default function FloraCRM() {
  const [dark, setDark] = useState(true);
  // Simple mode hides advanced tools (finance, split, AI) behind "more", so a first-time
  // agent sees only the essentials. On by default; a switch in More restores everything.
  const [simpleMode, setSimpleMode] = useState(true);
  const c = dark ? T.dark : T.light;

  // The rubber-band overscroll shows the page background, not the app's — so paint it too.
  useEffect(() => {
    document.documentElement.style.background = c.bg;
    document.body.style.background = c.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", c.bg);
  }, [c.bg]);

  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null); // bottom-sheet forms
  const [detail, setDetail] = useState(null); // full-screen property/customer detail
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [focusQueue, setFocusQueue] = useState(null); // { actions, index } — Deal Coach focus mode
  const [mapPicker, setMapPicker] = useState(null); // separate overlay so it never closes the form underneath
  const [propStageHint, setPropStageHint] = useState("همه");

  const [properties, setProperties] = useState(seedProperties);
  const [owners, setOwners] = useState(seedOwners);
  const [builders, setBuilders] = useState(seedBuilders);
  const [customers, setCustomers] = useState(seedCustomers);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [calls, setCalls] = useState(seedCalls);
  const [deals, setDeals] = useState(seedDeals);
  const [payments, setPayments] = useState(seedPayments);
  const [expenses, setExpenses] = useState(seedExpenses);
  // The office splits every received commission three ways. Kept as settings (not baked into
  // each payment) so the whole ledger stays consistent if the ratio is ever corrected.
  const [splitShares, setSplitShares] = useState({ agent: 1, management: 1, rent: 1 });
  const [officeIncomes, setOfficeIncomes] = useState(seedOfficeIncomes);
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [avalaiKey, setAvalaiKey] = useState("");
  const [avalaiModel, setAvalaiModel] = useState("gpt-4o-mini");
  const [aiProvider, setAiProvider] = useState("avalai");
  const [agentName, setAgentName] = useState("");
  const [agencyName, setAgencyName] = useState("املاک گنجینه");
  const [agencyCity, setAgencyCity] = useState("سرعین");
  const [loaded, setLoaded] = useState(false);

  const [toast, setToast] = useState(null);
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), Math.min(6000, 2000 + msg.length * 40)); };

  useEffect(() => {
    (async () => {
      try {
        const saved = await dbGet(DATA_KEY);
        if (saved) {
          if (saved.properties) setProperties(saved.properties);
          if (saved.owners) setOwners(saved.owners);
          if (saved.builders) setBuilders(saved.builders);
          if (saved.customers) setCustomers(saved.customers);
          if (saved.appointments) setAppointments(saved.appointments);
          if (saved.calls) setCalls(saved.calls);
          if (saved.deals) setDeals(saved.deals);
          if (saved.payments) setPayments(saved.payments);
          if (saved.expenses) setExpenses(saved.expenses);
          if (saved.officeIncomes) setOfficeIncomes(saved.officeIncomes);
        }
        const settings = await dbGet(SETTINGS_KEY);
        if (settings?.geminiKey) setGeminiKey(settings.geminiKey);
        if (settings?.openaiKey) setOpenaiKey(settings.openaiKey);
        if (settings?.grokKey) setGrokKey(settings.grokKey);
        if (settings?.avalaiKey) setAvalaiKey(settings.avalaiKey);
        if (settings?.avalaiModel) setAvalaiModel(settings.avalaiModel);
        if (settings?.aiProvider) setAiProvider(settings.aiProvider);
        if (settings?.agentName) setAgentName(settings.agentName);
        if (settings?.agencyName) setAgencyName(settings.agencyName);
        if (settings?.agencyCity) setAgencyCity(settings.agencyCity);
        if (settings?.splitShares) setSplitShares(settings.splitShares);
        if (typeof settings?.simpleMode === "boolean") setSimpleMode(settings.simpleMode);
      } catch (e) { console.error("Flora: load failed", e); }
      setLoaded(true);
    })();
  }, []);
  // Debounced: writing the whole dataset on every keystroke was the main source of lag.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      dbSet(DATA_KEY, { properties, owners, builders, customers, appointments, calls, deals, payments, expenses, officeIncomes }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [loaded, properties, owners, builders, customers, appointments, calls, deals, payments, expenses, officeIncomes]);
  useEffect(() => { if (loaded) dbSet(SETTINGS_KEY, { geminiKey, openaiKey, grokKey, avalaiKey, avalaiModel, aiProvider, agentName, agencyName, agencyCity, splitShares, simpleMode }).catch(() => {}); }, [loaded, geminiKey, openaiKey, grokKey, avalaiKey, avalaiModel, aiProvider, agentName, agencyName, agencyCity, splitShares, simpleMode]);

  // Weekly auto-backup. Losing everything is the biggest risk with on-device storage,
  // so once a week the app downloads a fresh backup file automatically (and flags it),
  // rather than relying on the agent to remember.
  const [backupDue, setBackupDue] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      let meta = null;
      try { meta = await dbGet(AUTOBACKUP_KEY); } catch (e) {}
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      const last = meta?.lastDownload || 0;
      if (Date.now() - last >= WEEK) {
        // only auto-download if there's real data worth saving
        const hasData = properties.length || customers.length || deals.length;
        if (hasData) {
          downloadBackup(buildBackupPayload(), `auto-${todayISO()}`);
          dbSet(AUTOBACKUP_KEY, { lastDownload: Date.now(), snapshotAt: Date.now(), auto: true }).catch(() => {});
          setBackupDue(true);
          setTimeout(() => notify("بکاپ هفتگی خودکار دانلود شد — آن را جای امن نگه‌دار"), 800);
        }
      }
    })();
  }, [loaded]); // eslint-disable-line

  const hasAiKey = (aiProvider === "avalai" && avalaiKey) || (aiProvider === "gemini" && geminiKey) || (aiProvider === "openai" && openaiKey) || (aiProvider === "grok" && grokKey);
  // Voice-to-text uses AvalAI's Whisper proxy specifically — the other providers
  // aren't wired for audio, so voice notes need an AvalAI key regardless of which
  // provider is chosen for text (only real Whisper gets Persian numbers/names right).
  const canTranscribe = !!avalaiKey;
  const transcribeAudio = async (blob) => {
    if (!avalaiKey) throw new Error("برای یادداشت صوتی، کلید AvalAI را در تنظیمات وارد کن");
    const form = new FormData();
    form.append("file", blob, "voice.webm");
    form.append("model", "whisper-1");
    form.append("language", "fa");
    let res;
    try {
      res = await fetch("https://api.avalai.ir/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${avalaiKey}` }, body: form });
    } catch (netErr) { throw new Error("اتصال برقرار نشد — اینترنت را بررسی کن"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `خطای تبدیل صوت (کد ${res.status})`);
    if (!data?.text) throw new Error("چیزی شنیده نشد — دوباره امتحان کن");
    return data.text;
  };
  const callAI = async (prompt) => {
    // AvalAI — an Iranian gateway that's OpenAI-compatible and reachable from Iran
    // without a VPN, so it sidesteps the Gemini/OpenAI regional blocks.
    if (aiProvider === "avalai") {
      if (!avalaiKey) throw new Error("کلید AvalAI وارد نشده");
      let res, data;
      try {
        res = await fetch("https://api.avalai.ir/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${avalaiKey}` },
          body: JSON.stringify({ model: avalaiModel || "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
        });
      } catch (netErr) { throw new Error("اتصال به AvalAI برقرار نشد — اینترنت را بررسی کن"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطای AvalAI (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("پاسخ خالی از AvalAI");
      return text;
    }
    if (aiProvider === "openai") {
      if (!openaiKey) throw new Error("کلید OpenAI وارد نشده");
      let res, data;
      try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
        });
      } catch (netErr) { throw new Error("اتصال به OpenAI برقرار نشد (احتمالاً مرورگر درخواست مستقیم را مسدود کرده — CORS)"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطای OpenAI (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("پاسخ خالی از OpenAI");
      return text;
    }
    if (aiProvider === "grok") {
      if (!grokKey) throw new Error("کلید Grok وارد نشده");
      let res, data;
      try {
        res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${grokKey}` },
          body: JSON.stringify({ model: "grok-2-latest", messages: [{ role: "user", content: prompt }] }),
        });
      } catch (netErr) { throw new Error("اتصال به Grok برقرار نشد (احتمالاً مرورگر درخواست مستقیم را مسدود کرده — CORS)"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطای Grok (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("پاسخ خالی از Grok");
      return text;
    }
    if (!geminiKey) throw new Error("کلید Gemini وارد نشده");
    const models = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
    let lastErr = null;
    for (const model of models) {
      let res, data;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
      } catch (netErr) { throw new Error("اتصال به Gemini برقرار نشد — اینترنت یا CORS را بررسی کن"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || "";
        lastErr = msg || `خطای Gemini (کد ${res.status})`;
        if (res.status === 404 || /not found|no longer available|not supported/i.test(msg)) continue; // try next model
        throw new Error(lastErr);
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = data?.promptFeedback?.blockReason ? `مسدود شد: ${data.promptFeedback.blockReason}` : "پاسخ خالی از Gemini";
    }
    throw new Error(lastErr || "هیچ‌کدام از مدل‌های Gemini در دسترس نبود");
  };

  const scheduleReminder = (appt, propTitle) => {
    if (!("Notification" in window)) { notify("مرورگر از اعلان پشتیبانی نمی‌کند"); return; }
    Notification.requestPermission().then((perm) => {
      if (perm !== "granted") { notify("اجازه‌ی اعلان داده نشد"); return; }
      const target = new Date(`${appt.date}T${appt.time}:00`);
      const ms = target.getTime() - Date.now();
      if (ms <= 0) { notify("زمان این بازدید گذشته است"); return; }
      notify("یادآور تنظیم شد (تا وقتی این صفحه باز بماند فعال است)");
      setTimeout(() => { try { new Notification("یادآوری بازدید ملکی", { body: `${propTitle || "بازدید"} — ساعت ${appt.time}` }); } catch (e) {} }, ms);
    });
  };

  const buildBackupPayload = () => ({ version: 1, exportedAt: new Date().toISOString(), properties, owners, builders, customers, appointments, calls, deals, payments, expenses, officeIncomes });
  const downloadBackup = (payload, label) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `flora-backup-${label || todayISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const exportBackup = () => {
    downloadBackup(buildBackupPayload());
    dbSet(AUTOBACKUP_KEY, { lastDownload: Date.now(), snapshotAt: Date.now() }).catch(() => {});
    notify("فایل بکاپ کامل دانلود شد");
  };
  // Scoped backups — the import merges whatever it finds, so these restore cleanly too.
  const exportProperties = () => {
    downloadBackup({ version: 1, exportedAt: new Date().toISOString(), scope: "properties", properties, owners, builders, customers, appointments, calls }, `files-customers-${todayISO()}`);
    notify("بکاپ فایل‌ها و مشتری‌ها دانلود شد");
  };
  const exportFinance = () => {
    downloadBackup({ version: 1, exportedAt: new Date().toISOString(), scope: "finance", deals, payments, expenses, officeIncomes }, `finance-${todayISO()}`);
    notify("بکاپ مالی دانلود شد");
  };
  const importBackup = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.properties) setProperties(data.properties);
        if (data.owners) setOwners(data.owners);
        if (data.builders) setBuilders(data.builders);
        if (data.customers) setCustomers(data.customers);
        if (data.appointments) setAppointments(data.appointments);
        if (data.calls) setCalls(data.calls);
        if (data.deals) setDeals(data.deals);
        if (data.payments) setPayments(data.payments);
        if (data.expenses) setExpenses(data.expenses);
        if (data.officeIncomes) setOfficeIncomes(data.officeIncomes);
        notify("بکاپ با موفقیت بازیابی شد");
      } catch (e) { notify("فایل بکاپ نامعتبر است"); }
    };
    reader.readAsText(file);
  };

  const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  const todaysAppts = appointments.filter((a) => a.date === todayISO()).length;
  const activeProps = properties.filter((p) => p.stage !== "فروخته شد").length;

  const goProperties = (stageHint) => { setPropStageHint(stageHint || "همه"); setTab("properties"); };

  const ctx = {
    c, dark, properties, setProperties, owners, setOwners, builders, setBuilders,
    customers, setCustomers, appointments, setAppointments, calls, setCalls,
    deals, setDeals, payments, setPayments, expenses, setExpenses, officeIncomes, setOfficeIncomes, splitShares, setSplitShares, simpleMode, setSimpleMode,
    notify, setDetail, setTab, setSheet, setLightbox, setMapPicker, focusQueue, setFocusQueue, geminiKey, setGeminiKey,
    openaiKey, setOpenaiKey, grokKey, setGrokKey, avalaiKey, setAvalaiKey, avalaiModel, setAvalaiModel, aiProvider, setAiProvider, hasAiKey, callAI, canTranscribe, transcribeAudio, agentName, setAgentName, agencyName, setAgencyName, agencyCity, setAgencyCity,
    scheduleReminder, goProperties, exportBackup, importBackup, exportProperties, exportFinance,
  };

  if (!loaded) {
    return (
      <div dir="rtl" style={{ background: c.bg, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex flex-col items-center justify-center gap-3">
        <style>{`@keyframes floraFloat { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-6px);} }`}</style>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: c.primarySoft, animation: "floraFloat 1.8s ease-in-out infinite" }}>
          <FloraMark size={40} color={c.primary} stroke={1.4} />
        </div>
        <p style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}>Flora در حال آماده‌سازی...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: c.bg, color: c.ink, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex justify-center relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        .press { transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease, opacity .18s ease; }
        .press:active { transform: scale(0.955); opacity: .92; }
        @keyframes floraUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
        @keyframes floraSheet { from { transform: translateY(100%);} to { transform: translateY(0);} }
        @keyframes floraPop { from { opacity:0; transform: scale(.95);} to { opacity:1; transform: scale(1);} }
        @keyframes floraPulse { 0%,100% { opacity:1; transform:scale(1);} 50% { opacity:.4; transform:scale(.8);} }
        @keyframes floraFloat { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-5px);} }
        @keyframes floraKeyTurn { 0%,100% { transform: rotate(-8deg);} 50% { transform: rotate(8deg);} }
        @keyframes floraDoorOpen { from { opacity:0; transform: perspective(600px) rotateY(-12deg) scale(.97);} to { opacity:1; transform: perspective(600px) rotateY(0) scale(1);} }
        .flora-float { animation: floraFloat 2.6s ease-in-out infinite; }
        .flora-key { animation: floraKeyTurn 1.8s ease-in-out infinite; }
        .flora-door { animation: floraDoorOpen .4s cubic-bezier(.22,1,.36,1) both; }
        .flora-up { animation: floraUp .3s cubic-bezier(.22,1,.36,1) both; }
        .flora-sheet { animation: floraSheet .32s cubic-bezier(.22,1,.36,1) both; }
        .flora-pop { animation: floraPop .2s ease both; }
        .nba-blob { position:absolute; top:-30px; left:-20px; width:200px; height:200px; border-radius:50%; filter: blur(30px); opacity:.32; pointer-events:none; animation: liquidMove 4s ease-in-out infinite; }
        @keyframes liquidMove { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(60px,20px) scale(1.25);} 66% { transform: translate(20px,45px) scale(.85);} }
        .flora-pulse { animation: floraPulse 1.6s ease-in-out infinite; }
        @keyframes floraRipple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
        @keyframes floraOrb { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(20px,-16px) scale(1.05);} 66% { transform: translate(-14px,18px) scale(.95);} }
        .flora-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .4; animation: floraOrb 14s ease-in-out infinite; pointer-events: none; }

        /* Lists reveal one after another instead of snapping in all at once */
        @keyframes floraStagger { from { opacity:0; transform: translateY(14px) scale(.985);} to { opacity:1; transform: translateY(0) scale(1);} }
        .flora-stagger > * { animation: floraStagger .42s cubic-bezier(.22,1,.36,1) both; }
        .flora-stagger > *:nth-child(1) { animation-delay: .02s }
        .flora-stagger > *:nth-child(2) { animation-delay: .07s }
        .flora-stagger > *:nth-child(3) { animation-delay: .12s }
        .flora-stagger > *:nth-child(4) { animation-delay: .17s }
        .flora-stagger > *:nth-child(5) { animation-delay: .22s }
        .flora-stagger > *:nth-child(6) { animation-delay: .27s }
        .flora-stagger > *:nth-child(n+7) { animation-delay: .3s }

        /* Money values catch a slow sweep of light */
        @keyframes floraShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .flora-money {
          background: linear-gradient(100deg, currentColor 40%, rgba(255,255,255,.85) 50%, currentColor 60%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: floraShimmer 4.5s linear infinite;
        }
        @keyframes floraCoin { 0%,100% { transform: rotateY(0deg);} 50% { transform: rotateY(180deg);} }
        .flora-coin { animation: floraCoin 3.2s ease-in-out infinite; transform-style: preserve-3d; }
        @keyframes floraRise { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
        .flora-rise { animation: floraRise .5s cubic-bezier(.22,1,.36,1) both; }

        select { -webkit-appearance: none; appearance: none; }
      `}</style>

      <span className="flora-orb" style={{ width: 300, height: 300, background: c.orb1, top: -90, right: -70 }} />
      <span className="flora-orb" style={{ width: 260, height: 260, background: c.orb2, bottom: -50, left: -50, animationDelay: "-4s" }} />
      <span className="flora-orb" style={{ width: 220, height: 220, background: c.orb3, top: "42%", left: "48%", animationDelay: "-8s", opacity: .25 }} />

      {/* Faint Flora emblem watermark, drifting gently behind the whole app */}
      <div className="flora-float" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 0, opacity: dark ? 0.04 : 0.05 }}>
        <FloraMark size={320} color={c.ink} stroke={1} />
      </div>

      {/* iPhone 13 Pro sized frame (390 × 844 logical points) */}
      <div className="w-full relative flex flex-col" style={{ maxWidth: 390, minHeight: "100vh", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <TopBar c={c} dark={dark} setDark={setDark} tab={tab} pendingCalls={pendingCalls} setSheet={setSheet} setDetail={setDetail} setTab={setTab} />

        <div className="flex-1 overflow-y-auto pb-28 px-4 relative">
          <div key={detail ? `d-${detail.id}` : tab} className="flora-door">
            {detail ? (
              <DetailView detail={detail} ctx={ctx} onBack={() => setDetail(null)} />
            ) : tab === "home" ? (
              <HomeTab ctx={ctx} />
            ) : tab === "properties" ? (
              <PropertiesTab ctx={ctx} search={search} setSearch={setSearch} stageHint={propStageHint} />
            ) : tab === "customers" ? (
              <CustomersTab ctx={ctx} search={search} setSearch={setSearch} />
            ) : tab === "calendar" ? (
              <CalendarTab ctx={ctx} />
            ) : tab === "finance" ? (
              <FinanceCenterView ctx={ctx} />
            ) : (
              <MoreTab ctx={ctx} />
            )}
          </div>
        </div>

        {!detail && !focusQueue && (
          <button onClick={() => setSheet("add")} className="press fixed flex items-center justify-center"
            style={{ bottom: "calc(92px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 25, width: 54, height: 54, borderRadius: 18, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 12px 28px rgba(47,124,246,0.5)", position: "fixed" }}>
            <span style={{ position: "absolute", inset: -8, borderRadius: 22, border: "2px solid rgba(47,124,246,0.35)", animation: "floraRipple 2.2s infinite" }} />
            <Plus color="#fff" size={24} strokeWidth={2.5} />
          </button>
        )}

        {!detail && !focusQueue && <BottomNav c={c} tab={tab} setTab={setTab} pendingCalls={pendingCalls} todaysAppts={todaysAppts} simpleMode={simpleMode} />}

        {focusQueue && <FocusMode ctx={ctx} />}

        {sheet === "add" && <QuickAddSheet ctx={ctx} onClose={() => setSheet(null)} />}
        {sheet && sheet !== "add" && <FormSheet sheetVal={sheet} ctx={ctx} onClose={() => setSheet(null)} />}

        {mapPicker && <MapPickerModal c={c} onPick={mapPicker.onPick} initial={mapPicker.initial} onClose={() => setMapPicker(null)} />}
        {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-40 px-4 py-2.5 rounded-2xl text-sm flora-up z-40 text-center" style={{ ...glass(c, 20), color: c.ink, fontWeight: 600, maxWidth: 320, lineHeight: 1.7 }}>{toast}</div>
        )}
      </div>
    </div>
  );
}

// ---------- Top bar / search / nav ----------
function TopBar({ c, dark, setDark, tab, pendingCalls, setSheet, setDetail, setTab }) {
  const titles = { home: "داشبورد", properties: "فایل‌های ملکی", customers: "مشتریان", calendar: "تقویم بازدید", finance: "مرکز مالی", more: "بیشتر" };
  return (
    <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-10">
      <div>
        {tab !== "home" && (
          <>
            <p style={{ fontSize: 12, color: c.muted }}>خوش آمدی</p>
            <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.015em" }}>{titles[tab] || "Flora"}</h1>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pendingCalls > 0 && (
          <button onClick={() => setDetail({ type: "calls" })} className="press flex items-center gap-1.5 rounded-full px-2.5 py-2" style={{ background: c.attnSoft }}>
            <PhoneCall size={12} color={c.attn} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: c.attn }}>{faDigits(pendingCalls)}</span>
          </button>
        )}
        <button onClick={() => setDetail({ type: "ai-chat" })} className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c, 20)}><MessageCircle size={16} color={c.ink} /></button>
        <button onClick={() => setSheet("ai-settings")} className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c, 20)}><Sparkles size={16} color={c.ink} /></button>
        <button onClick={() => setDark(!dark)} className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c, 20)}>{dark ? <Sun size={16} color={c.ink} /> : <Moon size={16} color={c.ink} />}</button>
      </div>
    </div>
  );
}
function SearchBox({ c, value, setValue }) {
  return (
    <div className="flex items-center rounded-lg px-3.5 py-2.5" style={glass(c, 26)}>
      <Search size={16} color={c.muted} />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="جستجوی سریع..." style={{ background: "transparent", outline: "none", color: c.ink, width: "100%", marginRight: 8, fontSize: 13.5, fontFamily: "inherit" }} />
      {value && <button onClick={() => setValue("")}><X size={15} color={c.muted} /></button>}
    </div>
  );
}
function BottomNav({ c, tab, setTab, pendingCalls, todaysAppts, simpleMode }) {
  const items = simpleMode ? [
    { id: "home", label: "خانه", icon: Home },
    { id: "properties", label: "فایل‌ها", icon: Building2 },
    { id: "customers", label: "مشتریان", icon: Users },
    { id: "more", label: "بیشتر", icon: MoreHorizontal, dot: pendingCalls > 0 },
  ] : [
    { id: "home", label: "خانه", icon: Home },
    { id: "finance", label: "مالی", icon: Wallet },
    { id: "customers", label: "مشتریان", icon: Users },
    { id: "properties", label: "فایل‌ها", icon: Building2 },
    { id: "more", label: "بیشتر", icon: MoreHorizontal, dot: pendingCalls > 0 },
  ];
  const wrapRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const el = btnRefs.current[tab];
    if (el && wrapRef.current) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }
  };
  useEffect(() => { measure(); // eslint-disable-next-line
  }, [tab]);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="fixed px-3 pt-2" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, zIndex: 20, paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
      <div ref={wrapRef} className="relative flex justify-between items-center rounded-2xl px-2 py-2" style={glass(c)}>
        <div style={{
          position: "absolute", top: 6, bottom: 6, left: pill.left + 8, width: Math.max(0, pill.width - 16), borderRadius: 16,
          background: c.primarySoft, border: `1px solid ${c.primary}55`,
          transition: pill.ready ? "left .45s cubic-bezier(.34,1.3,.64,1), width .45s cubic-bezier(.34,1.3,.64,1)" : "none",
          opacity: pill.ready ? 1 : 0, pointerEvents: "none", zIndex: 0,
        }} />
        {items.map((it) => {
          const active = tab === it.id; const Icon = it.icon;
          return (
            <button key={it.id} ref={(el) => (btnRefs.current[it.id] = el)} onClick={() => setTab(it.id)}
              className="press relative flex flex-col items-center gap-1 flex-1 py-1.5 rounded-2xl" style={{ zIndex: 1 }}>
              <div className="relative">
                <Icon size={19} color={active ? c.primary : c.muted} strokeWidth={active ? 2.5 : 2}
                  style={{ transition: "transform .45s cubic-bezier(.34,1.56,.64,1)", transform: active ? "translateY(-2px) scale(1.08)" : "none" }} />
                {it.dot && <span className="flora-pulse" style={{ position: "absolute", top: -3, left: -3, width: 7, height: 7, borderRadius: 99, background: c.attn }} />}
              </div>
              <span style={{ fontSize: 10, color: active ? c.primary : c.muted, fontWeight: active ? 700 : 500, transition: "color .35s ease" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SectionHeader({ c, title, action }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2.5">
      <div className="flex items-center gap-1.5">
        <span style={{ opacity: 0.55 }}>{FloraIcons.sprig({ size: 15, color: c.muted })}</span>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.bold }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
// ============================================================
// Flora icon system — from the brand's flora-icon-set spec.
// Every icon: 64×64 canvas, 6px safe margin, stroke 1.6 on the main form,
// rounded caps/joins, and AT MOST ONE gold accent (#BA9358). Everything else
// is the stone line, which inherits the surrounding text colour.
// ============================================================
const FLORA_GOLD = "#BA9358";
function FIcon({ children, size = 26, color = "currentColor", gold = FLORA_GOLD, sw = 1.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {typeof children === "function" ? children(gold, color) : children}
    </svg>
  );
}
// pentagon "house" frame reused by most icons (apex 26w×23h ratio, per spec)
const HOUSE = "M32 8 L52 22 L52 54 L12 54 L12 22 Z";

const FloraIcons = {
  residential: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <path d="M28 54 L28 40 L36 40 L36 54" />
    <circle cx="34" cy="47" r="0.9" fill={g} stroke={g} />
  </>}</FIcon>,
  monogram: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <circle cx="32" cy="26" r="3.4" fill={g} stroke={g} />
    <path d="M32 29 L32 46" />
    <path d="M32 36 C27 33 24 35 22 40 M32 36 C37 33 40 35 42 40 M32 42 C28 40 25 42 24 46 M32 42 C36 40 39 42 40 46" stroke={g} />
  </>}</FIcon>,
  villa: (p) => <FIcon {...p}>{(g) => <>
    <path d="M32 12 L50 27 M32 12 L14 27" />
    <path d="M18 27 L18 46 L46 46 L46 27" />
    <path d="M22 46 L42 46" stroke={g} />
    <path d="M32 46 L32 38 M32 40 C29 38 27 39 26 42 M32 40 C35 38 37 39 38 42" stroke={g} />
  </>}</FIcon>,
  multiunit: (p) => <FIcon {...p}>{(g) => <>
    <path d="M40 14 L48 20 L48 54 L40 54 Z" />
    <path d="M16 30 L40 30 L40 54 L16 54 Z" />
    <path d="M20 36 L28 36 M20 42 L28 42" />
    <rect x="42" y="42" width="4" height="4" fill={g} stroke={g} />
  </>}</FIcon>,
  handover: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <circle cx="32" cy="28" r="4" stroke={g} />
    <path d="M32 32 L32 44 M32 38 L37 38 M32 41 L36 41" stroke={g} />
  </>}</FIcon>,
  deed: (p) => <FIcon {...p}>{(g) => <>
    <path d="M20 12 L38 12 L46 20 L46 54 L20 54 Z" />
    <path d="M26 26 L40 26 M26 32 L40 32 M26 38 L34 38" />
    <circle cx="40" cy="44" r="6" stroke={g} />
    <path d="M37 44 L39 46 L43 42" stroke={g} />
  </>}</FIcon>,
  window: (p) => <FIcon {...p}>{(g, col) => <>
    <path d="M21 32 C21 21 43 21 43 32 L43 50 L21 50 Z" fill={g} fillOpacity="0.85" stroke={g} />
    <path d="M32 23 L32 50 M22 39 L42 39" stroke={col} />
  </>}</FIcon>,
  investment: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <path d="M23 46 L23 39 M29 46 L29 35 M35 46 L35 41" />
    <path d="M42 46 L42 27 M38 32 L42 27 L46 32" stroke={g} />
  </>}</FIcon>,
  floorArea: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <path d="M20 38 L20 54 L44 54" />
    <path d="M22 30 L38 30" stroke={g} />
    <path d="M22 27 L19 30 L22 33 M38 27 L41 30 L38 33" stroke={g} />
  </>}</FIcon>,
  location: (p) => <FIcon {...p}>{(g) => <>
    <path d="M32 12 L46 26 L32 46 L18 26 Z" />
    <circle cx="32" cy="26" r="4.5" fill={g} stroke={g} />
    <path d="M24 54 L40 54" />
  </>}</FIcon>,
  // tiny leaf sprig — used as a section divider, per the spec
  sprig: (p) => <FIcon {...p} sw={1.2}>{(g) => <>
    <path d="M32 46 L32 26" />
    <path d="M32 34 C27 31 23 33 21 38 C26 40 30 38 32 34 Z" />
    <path d="M32 34 C37 31 41 33 43 38 C38 40 34 38 32 34 Z" />
    <path d="M32 28 C29 26 26 27 25 31 C29 32 31 31 32 28 Z" />
    <path d="M32 28 C35 26 38 27 39 31 C35 32 33 31 32 28 Z" />
  </>}</FIcon>,
};

// Safe lookup: falls back to the residential icon if a key is ever missing,
// so a bad icon name degrades gracefully instead of crashing the whole screen.
const floraIcon = (name, props) => (FloraIcons[name] || FloraIcons.residential)(props);

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

function LegacyFloraMark({ size = 120, color = "currentColor", opacity = 1, stroke = 1.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }} aria-hidden="true">
      {/* diamond house outline */}
      <path d="M50 6 L92 48 L82 92 L18 92 L8 48 Z" stroke={color} strokeWidth={stroke} strokeLinejoin="round" fill="none" />
      {/* keyhole / trunk */}
      <circle cx="50" cy="40" r="7" stroke={color} strokeWidth={stroke} fill="none" />
      <path d="M50 47 L50 78" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      {/* branching leaves, left */}
      <path d="M50 58 C40 54 33 58 28 68 C38 70 46 66 50 58 Z" stroke={color} strokeWidth={stroke * 0.8} fill="none" strokeLinejoin="round" />
      <path d="M50 68 C42 66 36 70 32 79 C41 80 47 76 50 68 Z" stroke={color} strokeWidth={stroke * 0.8} fill="none" strokeLinejoin="round" />
      {/* branching leaves, right */}
      <path d="M50 58 C60 54 67 58 72 68 C62 70 54 66 50 58 Z" stroke={color} strokeWidth={stroke * 0.8} fill="none" strokeLinejoin="round" />
      <path d="M50 68 C58 66 64 70 68 79 C59 80 53 76 50 68 Z" stroke={color} strokeWidth={stroke * 0.8} fill="none" strokeLinejoin="round" />
      {/* fine veins */}
      <path d="M50 58 L50 78 M34 66 L44 63 M56 63 L66 66 M38 76 L46 72 M54 72 L62 76" stroke={color} strokeWidth={stroke * 0.5} strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function EmptyLine({ c, text }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ padding: "18px 2px" }}>
      <div className="flora-float" style={{ opacity: 0.4, marginBottom: 8 }}><FloraMark size={44} color={c.muted} stroke={1.2} /></div>
      <p style={{ color: c.muted, fontSize: 12.5, textAlign: "center" }}>{text}</p>
    </div>
  );
}
function StageBadge({ c, stage }) {
  const badge = (color, soft, label) => <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color, background: soft, padding: `3px ${SP.sm + 2}px`, borderRadius: RAD.pill }}>{label}</span>;
  if (stage === "فروخته شد") return badge(c.danger, c.dangerSoft, "فروخته شد");
  if (stage === "در حال مذاکره") return badge(c.attn, c.attnSoft, "مذاکره");
  return badge(c.success, c.successSoft, "فعال");
}

// ---------- Dashboard ----------
// Live dollar + gold-gram, shown by the greeting because both drive property prices.
// Browsers often block cross-origin finance APIs (CORS), so this fails softly: if it
// can't fetch, it shows a tidy button to open chand.app instead of an error.
function MarketWidget({ c }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const CACHE = "flora-market";
    // show last known values instantly while refreshing
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (cached && Date.now() - cached.at < 6 * 3600 * 1000) setData(cached);
    } catch (e) {}

    (async () => {
      try {
        // BrsApi free endpoint returns { gold:[...], currency:[...] } as JSON
        const res = await fetch("https://brsapi.ir/Api/Market/Gold_Currency.php?key=BVjuQ6mYZMzT9usLPTVArBTNYbFegq8B", { signal: AbortSignal.timeout?.(6000) });
        if (!res.ok) throw new Error("bad status");
        const json = await res.json();
        const usd = (json.currency || []).find((x) => /USD|دلار/i.test(x.symbol || x.name || ""));
        const gram = (json.gold || []).find((x) => /18|هجده|گرم/i.test(x.name || x.symbol || ""));
        const parsed = {
          usd: usd ? Number(String(usd.price).replace(/[^\d]/g, "")) : null,
          gold: gram ? Number(String(gram.price).replace(/[^\d]/g, "")) : null,
          at: Date.now(),
        };
        if (!parsed.usd && !parsed.gold) throw new Error("no fields");
        if (!cancelled) { setData(parsed); try { localStorage.setItem(CACHE, JSON.stringify(parsed)); } catch (e) {} }
      } catch (e) {
        if (!cancelled && !data) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  const openChand = () => window.open("https://chand.app", "_blank");

  if (failed && !data) {
    return (
      <button onClick={openChand} className="press w-full flex items-center justify-between" style={{ padding: `${SP.md}px ${SP.lg}px`, borderRadius: RAD.md, ...glass(c, 18) }}>
        <div className="flex items-center" style={{ gap: SP.sm }}>
          <TrendingUp size={16} color={c.primary} />
          <span style={{ fontSize: FS.caption, color: c.muted, fontWeight: FW.medium }}>قیمت لحظه‌ای دلار و طلا</span>
        </div>
        <span style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>chand.app ›</span>
      </button>
    );
  }

  const Cell = ({ label, value, color }) => (
    <div className="flex items-center" style={{ gap: SP.sm }}>
      <span style={{ fontSize: FS.caption, color: c.muted }}>{label}</span>
      <span style={{ fontSize: FS.body, fontWeight: FW.heavy, color, direction: "ltr" }}>{value ? Number(value).toLocaleString("en-US") : "—"}</span>
    </div>
  );

  return (
    <button onClick={openChand} className="press w-full flex items-center justify-between" style={{ padding: `${SP.md}px ${SP.lg}px`, borderRadius: RAD.md, ...glass(c, 18) }}>
      <div className="flex items-center" style={{ gap: SP.xl }}>
        <Cell label="دلار" value={data?.usd} color={c.primary} />
        <span style={{ width: 1, height: 16, background: c.border }} />
        <Cell label="طلا" value={data?.gold} color={c.attn} />
      </div>
      <div className="flex items-center" style={{ gap: SP.xs }}>
        <span style={{ width: 5, height: 5, borderRadius: RAD.pill, background: data ? c.success : c.muted }} className={data ? "flora-pulse" : ""} />
        <span style={{ fontSize: 9.5, color: c.muted }}>تومان</span>
      </div>
    </button>
  );
}

// ── Deal Coach: Next Best Action ────────────────────────────
// Scores concrete, revenue-driving actions from the real data (no invented stats).
// Each action carries a title, a reason, and one execute button. Top 3 only.
function computeNextActions(ctx) {
  const { properties, customers, calls, appointments, deals } = ctx;
  const actions = [];
  const now = Date.now();

  // Overdue call follow-ups: — someone we said we'd call and haven't closed out.
  calls.filter((cl) => cl.status !== "انجام‌شد").forEach((cl) => {
    const d = daysSince(cl.date);
    actions.push({
      key: `call-${cl.id}`, icon: "phone", tint: "attn",
      title: `تماس با ${cl.customerName}`,
      reason: d > 0 ? `${faDigits(d)} روز پیگیری نشده${cl.notes ? ` · ${cl.notes}` : ""}` : `پیگیری امروز${cl.notes ? ` · ${cl.notes}` : ""}`,
      score: 60 + d * 4,
      action: cl.customerPhone ? { type: "call", phone: cl.customerPhone } : { type: "goCalls" },
    });
  });

  // Match a fresh listing to a customer whose need/budget fits.
  customers.forEach((cu) => {
    const budget = Number(cu.budget) || 0;
    const match = properties.find((p) => p.stage !== "فروخته شد" && budget > 0 && p.price <= budget * 1.05 && p.price >= budget * 0.6);
    if (match) {
      actions.push({
        key: `match-${cu.id}-${match.id}`, icon: "home", tint: "primary",
        title: `ارسال «${match.title}» به ${cu.name}`,
        reason: `قیمت با بودجه‌ی مشتری می‌خواند${cu.need ? ` · نیاز: ${cu.need}` : ""}`,
        score: 55,
        action: cu.phone ? { type: "wa", phone: cu.phone, text: `سلام، یک فایل مناسب پیدا کردم:\n${match.title}\n${fmtToman(match.price)}\n${match.area} متر` } : { type: "goCustomer", id: cu.id },
      });
    }
  });

  // Stale listings: — active for a while with no movement → suggest a price review.
  properties.filter((p) => p.stage === "فعال").forEach((p) => {
    const age = daysSince(p.createdAt);
    if (age >= 14) {
      actions.push({
        key: `stale-${p.id}`, icon: "tag", tint: "purple",
        title: `بازنگری قیمت «${p.title}»`,
        reason: `${faDigits(age)} روز فعال بوده و هنوز نفروخته — شاید وقت پیشنهاد قیمت جدید به مالک باشد`,
        score: 30 + age,
        action: { type: "goProperty", id: p.id },
      });
    }
  });

  // Deals awaiting payment: — chase the commission.
  deals.filter((d) => d.status === "در انتظار پرداخت").forEach((d) => {
    actions.push({
      key: `pay-${d.id}`, icon: "coin", tint: "success",
      title: `پیگیری کمیسیون «${d.propertyTitle}»`,
      reason: "قرارداد بسته شده ولی کمیسیونش کامل وصول نشده",
      score: 80,
      action: { type: "goFinance" },
    });
  });

  return actions.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Focus Mode — launched from "اجرا" on the Deal Coach card. Hides all navigation
// and shows exactly one task at a time. Complete it, log the result, get the AI's
// next step, and it auto-advances to the next task — like clearing levels in a game.
function FocusMode({ ctx }) {
  const { c, focusQueue, setFocusQueue, hasAiKey, callAI, notify } = ctx;
  const { actions, index } = focusQueue;
  const a = actions[index];
  const [step, setStep] = useState("act"); // act | outcome | result
  const [nextTip, setNextTip] = useState("");
  const [loading, setLoading] = useState(false);
  const ICONS = { phone: PhoneCall, home: Home, tag: Tag, coin: Landmark };
  const Icon = ICONS[a.icon] || Sparkles;

  useEffect(() => { setStep("act"); setNextTip(""); }, [index]); // eslint-disable-line

  const doCall = () => { if (a.action.type === "call") window.location.href = `tel:${a.action.phone}`; };
  const doWa = () => { if (a.action.type === "wa") window.open(waLink(a.action.phone, a.action.text), "_blank"); };

  const submitOutcome = async (result, note) => {
    setStep("result"); setLoading(true);
    const saveOutcome = async (next) => {
      try {
        const existing = await dbGet(NBA_KEY);
        const map = existing?.date === todayISO() ? { ...existing.map } : {};
        map[a.key] = { result, next };
        await dbSet(NBA_KEY, { date: todayISO(), map });
      } catch (e) {}
    };
    await saveOutcome("");
    if (!hasAiKey) { setNextTip("برای مرحله‌ی بعدی، کلید هوش مصنوعی را در تنظیمات وارد کن."); setLoading(false); return; }
    try {
      const prompt = `تو یک مدیر فروش باتجربه‌ی املاک در ایران هستی. یک مشاور این اقدام را انجام داد:
اقدام: «${a.title}» (${a.reason})
نتیجه‌ای که گزارش داد: «${result}»${note ? `\nتوضیح بیشتر مشاور: «${note}»` : ""}
در یک تا دو جمله‌ی کوتاه، بهترین «مرحله‌ی بعدی» را بگو. مستقیم، بدون مقدمه.`;
      const text = await callAI(prompt);
      setNextTip(text.trim());
      await saveOutcome(text.trim());
    } catch (e) {
      const msg = `خطا در دریافت پیشنهاد: ${e.message || "نامشخص"}`;
      setNextTip(msg); await saveOutcome(msg);
    }
    setLoading(false);
  };

  const advance = () => {
    if (index + 1 < actions.length) setFocusQueue({ actions, index: index + 1 });
    else setFocusQueue(null);
  };

  const accent = "#22d3ee";

  return (
    <div className="fixed inset-0 z-[95] flex flex-col flora-pop" style={{ background: c.bg }}>
      {/* ambient depth glow, echoes the Deal Coach card it came from */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <span style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22, transparent 70%)`, filter: "blur(10px)" }} />
      </div>

      {/* top: close + segmented progress (stories-style, not just a fraction) */}
      <div className="flex items-center shrink-0 relative" style={{ gap: SP.md, padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
        <button onClick={() => setFocusQueue(null)} className="press w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
        <div className="flex-1 flex" style={{ gap: SP.xs }}>
          {actions.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: RAD.pill, background: c.surface2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: i < index ? "100%" : i === index ? (step === "result" && !loading ? "100%" : "55%") : "0%", borderRadius: RAD.pill, background: i <= index ? c.primary : "transparent", transition: "width .5s cubic-bezier(.34,1.2,.5,1)" }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative" style={{ padding: SP.xl }}>
        {step !== "result" ? (
          <div key={`${index}-${step}`} className="w-full flora-rise" style={{ maxWidth: 340 }}>
            <div className="relative mx-auto" style={{ width: 84, height: 84, marginBottom: SP.xl }}>
              <span className="flora-pulse" style={{ position: "absolute", inset: 0, borderRadius: RAD.lg, background: c.primarySoft }} />
              <div className="flex items-center justify-center" style={{ position: "relative", width: 84, height: 84, borderRadius: RAD.lg, background: c.primarySoft, border: `1px solid ${c.primary}33` }}><Icon size={34} color={c.primary} /></div>
            </div>
            <h1 style={{ fontSize: FS.hero, fontWeight: FW.heavy, textAlign: "center", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{a.title}</h1>
            <p style={{ fontSize: FS.body, color: c.muted, textAlign: "center", marginTop: SP.md, lineHeight: 1.8 }}>{a.reason}</p>

            {step === "act" && (
              <div style={{ marginTop: SP.xxl }}>
                {a.action.type === "call" && (
                  <button onClick={doCall} className="press w-full flex items-center justify-center relative overflow-hidden" style={{ gap: SP.sm, paddingBlock: SP.lg, borderRadius: RAD.lg, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 16px 34px -10px rgba(47,124,246,0.5), inset 0 1px 0 rgba(255,255,255,0.22)", marginBottom: SP.md }}>
                    <PhoneCall size={18} color="#fff" /><span style={{ color: "#fff", fontWeight: FW.bold, fontSize: FS.subtitle }}>تماس بگیر</span>
                  </button>
                )}
                {a.action.type === "wa" && (
                  <button onClick={doWa} className="press w-full flex items-center justify-center relative overflow-hidden" style={{ gap: SP.sm, paddingBlock: SP.lg, borderRadius: RAD.lg, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 16px 34px -10px rgba(47,124,246,0.5), inset 0 1px 0 rgba(255,255,255,0.22)", marginBottom: SP.md }}>
                    <MessageCircle size={18} color="#fff" /><span style={{ color: "#fff", fontWeight: FW.bold, fontSize: FS.subtitle }}>ارسال واتساپ</span>
                  </button>
                )}
                <button onClick={() => setStep("outcome")} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.lg, background: c.surface2, color: c.ink, fontWeight: FW.bold, fontSize: FS.body + 1 }}>
                  {a.action.type === "call" || a.action.type === "wa" ? "انجام دادم، نتیجه رو بگو" : "انجامش دادم"}<ChevronLeft size={15} color={c.muted} />
                </button>
              </div>
            )}

            {step === "outcome" && (
              <div style={{ marginTop: SP.xxl, padding: SP.lg, borderRadius: RAD.lg, ...glass(c, RAD.lg) }}>
                <NbaOutcomePicker c={c} options={["جواب داد و علاقه‌مند بود", "جواب داد ولی فعلاً نه", "جواب نداد", "بازدید هماهنگ شد", "رد کرد"]} onSubmit={(res, note) => submitOutcome(res, note)} onCancel={() => setStep("act")} />
              </div>
            )}
          </div>
        ) : (
          <div key="result" className="w-full flora-rise" style={{ maxWidth: 340 }}>
            {loading ? (
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 56, height: 56, marginBottom: SP.lg }}>
                  <span className="flora-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.primarySoft }} />
                  <div className="flex items-center justify-center" style={{ position: "relative", width: 56, height: 56 }}><Loader2 size={26} className="animate-spin" color={c.primary} /></div>
                </div>
                <p style={{ fontSize: FS.body, color: c.muted }}>مدیر فروش در حال فکر کردن...</p>
              </div>
            ) : (
              <>
                <div className="relative mx-auto" style={{ width: 72, height: 72, marginBottom: SP.lg }}>
                  <span style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `2px solid ${c.success}44`, animation: "floraRipple 1.6s ease-out 1" }} />
                  <div className="flex items-center justify-center flora-pop" style={{ width: 72, height: 72, borderRadius: "50%", background: c.successSoft }}><CheckCircle2 size={34} color={c.success} /></div>
                </div>
                <p style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold, textAlign: "center", marginBottom: SP.sm, letterSpacing: "0.02em" }}>مرحله‌ی بعدی</p>
                <p style={{ fontSize: FS.subtitle, color: c.ink, textAlign: "center", lineHeight: 1.8, fontWeight: FW.medium }}>{nextTip}</p>
                <button onClick={advance} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.xxl, paddingBlock: SP.md, borderRadius: RAD.lg, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, boxShadow: "0 12px 28px -10px rgba(47,124,246,0.5)" }}>
                  {index + 1 < actions.length ? "بعدی" : "تمام برای امروز"}{index + 1 < actions.length && <ChevronLeft size={16} color="#fff" />}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Round mic-icon card on Home — the entry point to the voice assistant.
function VoiceAssistantCard({ ctx }) {
  const { c, setSheet } = ctx;
  return (
    <button onClick={() => setSheet("voice-note")} className="press w-full flex items-center relative overflow-hidden" style={{ gap: SP.md, padding: SP.lg, borderRadius: RAD.lg, marginTop: SP.md, ...glass(c, 24) }}>
      <div className="relative flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
        <span className="flora-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.primarySoft }} />
        <div className="flex items-center justify-center" style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", background: c.primarySoft, border: `1px solid ${c.primary}33` }}><Mic size={22} color={c.primary} /></div>
      </div>
      <div className="flex-1 text-right min-w-0">
        <p style={{ fontSize: FS.body + 1, fontWeight: FW.bold }}>یادداشت صوتی</p>
        <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>فقط تعریف کن چی شد — بقیه‌اش با هوش مصنوعی</p>
      </div>
      <ChevronLeft size={18} color={c.muted} />
    </button>
  );
}

// Voice → structured CRM entries. Records audio, transcribes with AvalAI's real
// Whisper proxy (not the browser's unreliable built-in recognizer), then asks the
// AI to pull out who/what/when as JSON. The agent reviews before anything saves —
// no silent writes, but no form-filling either.
function VoiceNoteSheet({ ctx, onClose }) {
  const { c, canTranscribe, transcribeAudio, hasAiKey, callAI, customers, properties, setCustomers, setCalls, setAppointments, notify, setSheet } = ctx;
  const [phase, setPhase] = useState("idle"); // idle | recording | transcribing | extracting | clarify | review | saving | done
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [error, setError] = useState("");
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => { clearInterval(timerRef.current); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()); }, []);

  const startRecording = async () => {
    setError("");
    if (!canTranscribe) { setError("اول کلید AvalAI را در تنظیمات هوش مصنوعی وارد کن — یادداشت صوتی به آن نیاز دارد."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); handleRecordingDone(rec.mimeType || "audio/webm"); };
      mediaRef.current = rec;
      rec.start();
      setPhase("recording"); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => { if (s >= 89) { stopRecording(); return s; } return s + 1; }), 1000);
    } catch (e) { setError("دسترسی به میکروفون داده نشد."); }
  };
  const stopRecording = () => { clearInterval(timerRef.current); if (mediaRef.current?.state === "recording") mediaRef.current.stop(); };

  const handleRecordingDone = async (mimeType) => {
    setPhase("transcribing");
    const blob = new Blob(chunksRef.current, { type: mimeType });
    try {
      const text = await transcribeAudio(blob);
      setTranscript(text);
      await extract(text);
    } catch (e) { setError(e.message || "خطا در تبدیل صوت"); setPhase("idle"); }
  };

  const extract = async (text, clarifyQA) => {
    setPhase("extracting");
    if (!hasAiKey) { setError("برای فهمیدن منظورت، کلید هوش مصنوعی لازم است."); setPhase("idle"); return; }
    const now = new Date();
    const [jy, jm, jd] = isoToJalali(todayISO());
    // Real app data so the AI matches against actual records instead of guessing —
    // existing customer names (avoid duplicate creation) and active listings (so a
    // "next step" suggestion can point at a real file, like the Deal Coach does).
    const knownCustomers = customers.slice(0, 80).map((cu) => cu.name).join("، ") || "هیچ‌کدام";
    const activeListings = properties.filter((p) => p.stage !== "فروخته شد").slice(0, 40)
      .map((p) => `${p.title} — ${fmtToman(p.price)} — ${p.area} متر${p.type ? ` — ${p.type}` : ""}`).join("\n") || "فایلی ثبت نشده";
    try {
      const prompt = `تو دستیار یک مشاور املاک ایرانی هستی و به داده‌های واقعی دفتر او دسترسی داری. مشاور این جمله را با صدا گفته (متن پیاده‌شده از صوت، ممکن است غلط تایپی داشته باشد):
«${text}»
${clarifyQA ? `\nسوال قبلی تو: «${clarifyQA.q}» — جواب مشاور: «${clarifyQA.a}»\n` : ""}
امروز میلادی ${todayISO()} و شمسی ${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)} است (روز هفته: ${["یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"][now.getDay()]}).

مشتریان موجود در سیستم (اگر اسم گفته‌شده به یکی از این‌ها نزدیک بود، همان اسم دقیق را در customerName بگذار تا با پروفایل موجود یکی شود): ${knownCustomers}

فایل‌های فعال دفتر (اگر نیاز مشتری با یکی از این‌ها می‌خواند، در nextAction دقیقاً به همان فایل با نامش اشاره کن، نه یک پیشنهاد کلی):
${activeListings}

اطلاعات را استخراج کن و دقیقاً همین JSON خام را برگردان (بدون توضیح، بدون markdown):
{
  "customerName": "اسم مشتری یا خالی",
  "phone": "شماره اگر گفته شده یا خالی",
  "callHappened": true,
  "meetingDate": "تاریخ میلادی YYYY-MM-DD قرار بازدید اگر گفته شده، وگرنه خالی — تاریخ‌های نسبی مثل سه‌روزدیگر یا شنبه را خودت با توجه به امروز حساب کن",
  "meetingTime": "HH:MM اگر گفته شده وگرنه خالی",
  "need": "خلاصه‌ی نیاز مشتری (نوع ملک، منطقه) یا خالی",
  "budget": 0,
  "area": "منطقه/محله اگر گفته شده یا خالی",
  "note": "خلاصه‌ی یک یا دو خطی از کل مکالمه به فارسی روان",
  "reminder": "اگر مشاور خواسته یادش بیفتد کاری بکند اینجا بنویس، وگرنه خالی",
  "nextAction": "یک پیشنهاد کوتاه برای قدم بعدی — اگر فایل مناسبی در لیست بالا هست، دقیقاً نامش را بیاور",
  "clarify": "فقط اگر یک نکته‌ی مهم و مبهم هست که باید از مشاور بپرسی، یک سوال کوتاه اینجا بنویس؛ وگرنه خالی بگذار"
}`;
      const raw = await callAI(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setExtracted(parsed);
      if (parsed.clarify && !clarifyQA) setPhase("clarify");
      else setPhase("review");
    } catch (e) {
      setError(e instanceof SyntaxError ? "پاسخ هوش مصنوعی قابل‌خواندن نبود — دوباره امتحان کن" : (e.message || "خطای نامشخص"));
      setPhase("idle");
    }
  };

  const confirmClarify = () => { extract(transcript, { q: extracted.clarify, a: clarifyAnswer }); };

  const save = () => {
    setPhase("saving");
    const name = (extracted.customerName || "").trim();
    let customerId = "";
    if (name) {
      const match = customers.find((cu) => cu.name.trim() === name || cu.name.includes(name) || name.includes(cu.name.trim()));
      if (match) {
        customerId = match.id;
        setCustomers((prev) => prev.map((x) => x.id === match.id ? {
          ...x,
          need: extracted.need || x.need,
          budget: extracted.budget > 0 ? extracted.budget : x.budget,
          lastCallNote: extracted.note || x.lastCallNote,
          lastContactAt: todayISO(),
        } : x));
      } else {
        customerId = uid();
        setCustomers((prev) => [{ id: customerId, name, phone: extracted.phone || "", need: extracted.need || "", budget: extracted.budget || 0, stage: "در حال بررسی", lastContactAt: todayISO(), lastCallNote: extracted.note || "" }, ...prev]);
      }
    }
    if (extracted.callHappened) {
      setCalls((prev) => [{ id: uid(), customerId, customerName: name || "بدون نام", customerPhone: extracted.phone || "", date: todayISO(), status: "انجام‌شد", notes: extracted.note || transcript }, ...prev]);
    }
    if (extracted.meetingDate) {
      setAppointments((prev) => [{ id: uid(), propertyId: "", customerId, customerName: name || "بدون نام", date: extracted.meetingDate, time: extracted.meetingTime || "10:00", notes: extracted.note || "" }, ...prev]);
    }
    notify("یادداشت صوتی ذخیره شد");
    setPhase("done");
  };

  const savedItems = extracted ? [
    extracted.callHappened && "تماس در تاریخچه ثبت شد",
    extracted.meetingDate && `بازدید در تقویم — ${fmtJalali(extracted.meetingDate)}`,
    (extracted.need || extracted.budget > 0) && "پروفایل مشتری به‌روزرسانی شد",
    extracted.reminder && `یادآوری: ${extracted.reminder}`,
  ].filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-[95] flex flex-col flora-pop" style={{ background: c.bg }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <span style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, #22d3ee22, transparent 70%)`, filter: "blur(10px)" }} />
      </div>
      <div className="flex items-center justify-between shrink-0 relative" style={{ padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
        <button onClick={onClose} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>یادداشت صوتی</h2>
        <div style={{ width: 36 }} />
      </div>
      <div className="flex-1 overflow-y-auto relative" style={{ padding: SP.xl }}>
      {error && <p style={{ fontSize: FS.caption, color: c.danger, background: c.dangerSoft, padding: SP.md, borderRadius: RAD.md, marginBottom: SP.md, lineHeight: 1.8 }}>{error}</p>}

      {phase === "idle" && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xl }}>
          <button onClick={startRecording} className="press relative flex items-center justify-center" style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 16px 34px -10px rgba(47,124,246,0.5)" }}>
            <Mic size={36} color="#fff" />
          </button>
          <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.lg, textAlign: "center", lineHeight: 1.8 }}>بزن و تعریف کن — مثلاً «با آقای محمودی صحبت کردم، سه روز دیگه ساعت ۵ بازدید داریم...»</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xl }}>
          <button onClick={stopRecording} className="press relative flex items-center justify-center" style={{ width: 96, height: 96, borderRadius: "50%", background: c.danger }}>
            <span style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `2px solid ${c.danger}55`, animation: "floraRipple 1.4s ease-out infinite" }} />
            <div style={{ width: 26, height: 26, borderRadius: RAD.sm, background: "#fff" }} />
          </button>
          <p style={{ fontSize: FS.title, fontWeight: FW.heavy, marginTop: SP.lg, direction: "ltr" }}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p>
          <p style={{ fontSize: FS.caption, color: c.muted, marginTop: SP.xs }}>در حال ضبط — برای پایان بزن</p>
        </div>
      )}

      {(phase === "transcribing" || phase === "extracting" || phase === "saving") && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xxl }}>
          <Loader2 size={30} className="animate-spin" color={c.primary} />
          <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.lg }}>
            {phase === "transcribing" ? "در حال گوش دادن..." : phase === "extracting" ? "در حال فهمیدن منظورت..." : "در حال ذخیره..."}
          </p>
        </div>
      )}

      {phase === "clarify" && extracted && (
        <div className="flora-rise">
          <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.attnSoft, marginBottom: SP.md }}>
            <Sparkles size={15} color={c.attn} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: FS.body, color: c.ink, lineHeight: 1.8 }}>{extracted.clarify}</p>
          </div>
          <input style={inputStyle(c)} value={clarifyAnswer} onChange={(e) => setClarifyAnswer(e.target.value)} placeholder="جواب کوتاه بده..." />
          <SubmitBtn c={c} label="تایید و ادامه" disabled={!clarifyAnswer.trim()} onClick={confirmClarify} />
        </div>
      )}

      {phase === "review" && extracted && (
        <div className="flora-rise">
          <p style={{ fontSize: FS.caption, color: c.muted, background: c.surface2, padding: SP.md, borderRadius: RAD.md, marginBottom: SP.lg, lineHeight: 1.9 }}>{transcript}</p>

          <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={extracted.customerName || ""} onChange={(e) => setExtracted({ ...extracted, customerName: e.target.value })} /></Field>
          <Field c={c} label="شماره تماس (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={extracted.phone || ""} onChange={(e) => setExtracted({ ...extracted, phone: e.target.value })} /></Field>

          <div className="flex" style={{ gap: SP.sm, marginBottom: SP.md }}>
            <button onClick={() => setExtracted({ ...extracted, callHappened: !extracted.callHappened })} className="press flex-1 rounded-xl flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.sm, background: extracted.callHappened ? c.primarySoft : c.surface2 }}>
              <PhoneCall size={13} color={extracted.callHappened ? c.primary : c.muted} /><span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: extracted.callHappened ? c.primary : c.muted }}>تماس ثبت شود</span>
            </button>
          </div>

          {(extracted.meetingDate || extracted.meetingTime) && (
            <div className="flex" style={{ gap: SP.sm }}>
              <div style={{ flex: 1 }}><Field c={c} label="تاریخ بازدید"><JalaliDatePicker c={c} value={extracted.meetingDate || todayISO()} onChange={(iso) => setExtracted({ ...extracted, meetingDate: iso })} /></Field></div>
              <div style={{ width: 110 }}><Field c={c} label="ساعت"><input type="time" style={inputStyle(c)} value={extracted.meetingTime || "10:00"} onChange={(e) => setExtracted({ ...extracted, meetingTime: e.target.value })} /></Field></div>
            </div>
          )}

          <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={extracted.need || ""} onChange={(e) => setExtracted({ ...extracted, need: e.target.value })} /></Field>
          <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={extracted.budget || ""} onChange={(e) => setExtracted({ ...extracted, budget: toNum(e.target.value) })} /></Field>
          <Field c={c} label="یادداشت"><textarea style={{ ...inputStyle(c), minHeight: 70, resize: "none", lineHeight: 1.8 }} value={extracted.note || ""} onChange={(e) => setExtracted({ ...extracted, note: e.target.value })} /></Field>

          {extracted.nextAction && (
            <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.primarySoft, marginBottom: SP.md }}>
              <Sparkles size={14} color={c.primary} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: FS.caption + 0.5, color: c.ink, lineHeight: 1.8 }}><b style={{ color: c.primary }}>پیشنهاد:</b> {extracted.nextAction}</p>
            </div>
          )}

          <SubmitBtn c={c} label="تایید و ذخیره" onClick={save} />
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center flora-rise" style={{ paddingBlock: SP.lg }}>
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: "50%", background: c.successSoft, marginBottom: SP.lg }}><CheckCircle2 size={30} color={c.success} /></div>
          <div className="flex flex-col w-full" style={{ gap: SP.sm, marginBottom: SP.xl }}>
            {savedItems.map((it, i) => (
              <div key={i} className="flex items-center" style={{ gap: SP.sm }}>
                <CheckCircle2 size={14} color={c.success} /><p style={{ fontSize: FS.caption + 0.5, color: c.ink }}>{it}</p>
              </div>
            ))}
            {savedItems.length === 0 && <p style={{ fontSize: FS.caption, color: c.muted, textAlign: "center" }}>یادداشت ثبت شد</p>}
          </div>
          <button onClick={onClose} className="press w-full" style={{ paddingBlock: SP.md, borderRadius: RAD.lg, background: c.primary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1 }}>باشه</button>
        </div>
      )}
      </div>
    </div>
  );
}

function NextBestActionCard({ ctx }) {
  const { c, setFocusQueue } = ctx;
  const actions = useMemo(() => computeNextActions(ctx), [ctx.properties, ctx.customers, ctx.calls, ctx.appointments, ctx.deals]);
  const ICONS = { phone: PhoneCall, home: Home, tag: Tag, coin: Landmark };
  const [outcomes, setOutcomes] = useState({}); // { [key]: { result, next } } — read-only display here; Focus Mode writes it

  useEffect(() => {
    (async () => { try { const saved = await dbGet(NBA_KEY); if (saved?.date === todayISO()) setOutcomes(saved.map || {}); } catch (e) {} })();
  }, [ctx.focusQueue]); // reload whenever focus mode closes, to reflect what was just logged

  if (actions.length === 0) return null;
  const accent = c.primary;

  return (
    <div style={{ marginTop: SP.md }}>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.md, paddingRight: 2 }}>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>بهترین اقدام امروز</h2>
        <span style={{ fontSize: FS.caption, color: c.muted }}>{faDigits(actions.length)} پیشنهاد</span>
      </div>
      <div className="relative overflow-hidden" style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c, 24) }}>
        <span className="nba-blob" style={{ background: `radial-gradient(circle, #22d3ee, transparent)` }} />
        <div className="flex flex-col relative" style={{ gap: SP.md }}>
          {actions.map((a, i) => {
            const Icon = ICONS[a.icon] || Sparkles;
            const oc = outcomes[a.key];
            return (
              <div key={a.key} style={{ paddingTop: i === 0 ? 0 : SP.md, borderTop: i === 0 ? "none" : `1px solid ${c.border}` }}>
                <div className="flex items-center" style={{ gap: SP.md }}>
                  <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: RAD.md, background: oc?.result ? c.successSoft : c.primarySoft }}>
                    {oc?.result ? <CheckCircle2 size={19} color={c.success} /> : <Icon size={19} color={accent} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: FS.body + 1, fontWeight: FW.bold, lineHeight: 1.4, textDecoration: oc?.result ? "line-through" : "none", opacity: oc?.result ? 0.7 : 1 }}>{a.title}</p>
                    <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.7 }}>{oc?.result || a.reason}</p>
                  </div>
                  <button onClick={() => setFocusQueue({ actions, index: i })} className="press shrink-0" style={{ paddingInline: SP.lg, paddingBlock: 8, borderRadius: RAD.md, background: oc?.result ? c.surface2 : accent, color: oc?.result ? c.muted : "#fff", fontSize: FS.caption + 1, fontWeight: FW.bold }}>{oc?.result ? "دوباره" : "اجرا"}</button>
                </div>
                {oc?.next && (
                  <div className="flex items-start" style={{ gap: SP.sm, marginTop: SP.sm, marginRight: 52 }}>
                    <Sparkles size={13} color={c.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontSize: FS.caption, color: c.ink, lineHeight: 1.8 }}>{oc.next}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NbaOutcomePicker({ c, options, onSubmit, onCancel }) {
  const [sel, setSel] = useState("");
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.sm }}>
        <p style={{ fontSize: FS.caption, fontWeight: FW.bold }}>نتیجه چه شد؟</p>
        <button onClick={onCancel} style={{ fontSize: FS.caption, color: c.muted }}>بعداً</button>
      </div>
      <div className="flex flex-wrap" style={{ gap: SP.xs, marginBottom: SP.sm }}>
        {options.map((o) => { const active = sel === o; return (
          <button key={o} onClick={() => setSel(o)} className="press rounded-full" style={{ padding: `5px ${SP.md - 2}px`, fontSize: FS.caption, fontWeight: FW.medium, background: active ? c.primary : c.surface, color: active ? "#fff" : c.muted, border: `1px solid ${active ? c.primary : c.border}` }}>{o}</button>
        ); })}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح بیشتر (اختیاری)..." style={{ ...inputStyle(c), fontSize: FS.caption + 1, paddingBlock: 8, marginBottom: SP.sm }} />
      <button onClick={() => sel && onSubmit(sel, note)} disabled={!sel} className="press w-full" style={{ paddingBlock: 9, borderRadius: RAD.md, background: sel ? c.primary : c.surface, color: sel ? "#fff" : c.muted, fontSize: FS.caption + 1, fontWeight: FW.bold }}>ثبت و دریافت مرحله‌ی بعدی</button>
    </div>
  );
}

function HomeTab({ ctx }) {
  const { c, properties, customers, appointments, calls, setDetail, setTab, goProperties, agentName, agencyName, agencyCity, simpleMode, setSheet } = ctx;
  const activeProps = properties.filter((p) => p.stage !== "فروخته شد").length;
  const todayAppts = appointments.filter((a) => a.date === todayISO());
  const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  const stats = [
    { label: "مشتری", value: customers.length, icon: Users, color: c.primary, onClick: () => setTab("customers") },
    { label: "فایل فعال", value: activeProps, icon: Building2, color: c.purple, onClick: () => goProperties("فعال") },
    { label: "تماس در انتظار", value: pendingCalls, icon: PhoneCall, color: c.attn, onClick: () => setTab("more") },
    { label: "بازدید امروز", value: todayAppts.length, icon: CalendarDays, color: c.success, onClick: () => setTab("calendar") },
  ];
  const feed = [
    ...appointments.map((a) => ({ type: "appt", date: a.date, ...a })),
    ...calls.map((cl) => ({ type: "call", date: cl.date, ...cl })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <div style={{ paddingTop: SP.xl }}>
      {/* Greeting */}
      <div style={{ marginBottom: SP.lg, paddingInline: SP.xs }}>
        <p style={{ fontSize: FS.caption, color: c.muted, letterSpacing: ".02em" }}>{fmtJalali(todayISO())}</p>
        <h1 style={{ fontSize: FS.hero, fontWeight: FW.heavy, letterSpacing: "-0.02em", marginTop: SP.xs, lineHeight: 1.15 }}>
          {greetingPhrase()}{agentName ? `، ${agentName}` : ""}
        </h1>
        <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.sm, lineHeight: 1.6 }}>
          {todayAppts.length > 0 || pendingCalls > 0
            ? <>امروز {todayAppts.length > 0 ? <b style={{ color: c.ink, fontWeight: FW.bold }}>{faDigits(todayAppts.length)} بازدید</b> : null}{todayAppts.length > 0 && pendingCalls > 0 ? " و " : ""}{pendingCalls > 0 ? <b style={{ color: c.ink, fontWeight: FW.bold }}>{faDigits(pendingCalls)} پیگیری</b> : null} داری</>
            : "امروز کار فوری‌ای نداری. وقت خوبیه برای گرفتن فایل جدید."}
        </p>
      </div>

      {/* Live market strip */}
      <div style={{ marginBottom: SP.xl }}><MarketWidget c={c} /></div>

      {/* Primary action — the ONLY place the accent gradient appears */}
      {simpleMode && (
        <button onClick={() => setSheet("property")} className="press w-full flex items-center relative overflow-hidden" style={{ gap: SP.lg, padding: SP.xl, borderRadius: RAD.lg, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 16px 40px -8px rgba(47,124,246,0.45), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
          <span style={{ position: "absolute", top: "-60%", left: "-10%", width: 200, height: 200, background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)", pointerEvents: "none" }} />
          <div className="flex items-center justify-center shrink-0" style={{ width: 54, height: 54, borderRadius: RAD.md, background: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}><Plus size={28} color="#fff" strokeWidth={2.5} /></div>
          <div className="text-right flex-1" style={{ position: "relative" }}>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: "#fff" }}>ثبت فایل جدید</p>
            <p style={{ fontSize: FS.caption, color: "rgba(255,255,255,0.88)", marginTop: 2 }}>یک ملک جدید اضافه کن</p>
          </div>
          <ChevronLeft size={20} color="rgba(255,255,255,0.7)" style={{ position: "relative" }} />
        </button>
      )}

      {!simpleMode && <PortfolioValueCard c={c} properties={properties} />}

      {/* Voice note — talk instead of filling a form; AI files it where it belongs */}
      <VoiceAssistantCard ctx={ctx} />

      {/* Deal Coach — the 3 highest-value actions for today */}
      <NextBestActionCard ctx={ctx} />

      {/* Today's focus — quiet action cards */}
      {(todayAppts.length > 0 || pendingCalls > 0) && (
        <>
          <div className="flex" style={{ gap: SP.md, marginTop: SP.xl }}>
          {todayAppts.length > 0 && (
            <button onClick={() => setTab("calendar")} className="press flex-1 text-right flex items-center" style={{ gap: SP.md, paddingInline: SP.lg, paddingBlock: SP.md, borderRadius: RAD.lg, ...glass(c, 20) }}>
              <span style={{ width: 4, height: 30, borderRadius: RAD.sm, background: c.success, flexShrink: 0 }} />
              <div className="min-w-0">
                <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{faDigits(todayAppts.length)} بازدید امروز</p>
                <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>اولین: {todayAppts.sort((a, b) => a.time.localeCompare(b.time))[0].time}</p>
              </div>
            </button>
          )}
          {pendingCalls > 0 && (
            <button onClick={() => setDetail({ type: "calls" })} className="press flex-1 text-right flex items-center" style={{ gap: SP.md, paddingInline: SP.lg, paddingBlock: SP.md, borderRadius: RAD.lg, ...glass(c, 20) }}>
              <span style={{ width: 4, height: 30, borderRadius: RAD.sm, background: c.attn, flexShrink: 0 }} />
              <div className="min-w-0">
                <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{faDigits(pendingCalls)} تماس معوق</p>
                <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>نیاز به پیگیری</p>
              </div>
            </button>
          )}
          </div>
        </>
      )}

      {/* AI copilot — neutral surface, not a competing gradient */}
      {!simpleMode && (
      <button onClick={() => setDetail({ type: "copilot" })} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.lg, marginTop: SP.md, borderRadius: RAD.lg, ...glass(c, 24) }}>
        <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: RAD.md, background: c.primarySoft }}><Bot size={21} color={c.primary} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>دستیار مدیر فروش</p>
          <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>ماموریت امروز و اولویت‌ها</p>
        </div>
        <ChevronLeft size={18} color={c.muted} />
      </button>
      )}

      {/* Stats */}
      {!simpleMode && <>
      <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em", marginTop: SP.xxl, marginBottom: SP.lg, paddingRight: 2 }}>یک نگاه</h2>
      <div className="grid grid-cols-2 flora-stagger" style={{ gap: SP.md }}>
        {stats.map((s, i) => (
          <button key={i} onClick={s.onClick} className="press text-right" style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c, 24) }}>
            <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: RAD.pill, background: s.color + "1f", marginBottom: SP.md }}><s.icon size={17} color={s.color} /></div>
            <p style={{ fontSize: FS.hero, fontWeight: FW.heavy, letterSpacing: "-0.02em" }}>{faDigits(s.value)}</p>
            <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{s.label}</p>
          </button>
        ))}
      </div>
      </>}

      {/* Activity */}
      {!simpleMode && <>
      <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em", marginTop: SP.xxl, marginBottom: SP.lg, paddingRight: 2 }}>فعالیت‌های اخیر</h2>
      <div className="flex flex-col" style={{ gap: SP.sm }}>
        {feed.map((f, i) => f.type === "appt" ? <ActivityApptRow key={i} a={f} ctx={ctx} /> : <ActivityCallRow key={i} cl={f} c={c} />)}
        {feed.length === 0 && <EmptyLine c={c} text="فعالیتی ثبت نشده" />}
      </div>
      </>}

      {/* Latest files */}
      <div className="flex items-baseline justify-between" style={{ marginTop: SP.xxl, marginBottom: SP.lg, paddingRight: 2 }}>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>جدیدترین فایل‌ها</h2>
        <button onClick={() => setTab("properties")} style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>همه ›</button>
      </div>
      <div className="flex flex-col" style={{ gap: SP.md, marginBottom: SP.xxl }}>
        {properties.slice(0, simpleMode ? 3 : 2).map((p) => <PropertyMiniCard key={p.id} p={p} c={c} onClick={() => setDetail({ type: "property", id: p.id })} />)}
        {properties.length === 0 && <EmptyLine c={c} text="فایلی ثبت نشده" />}
      </div>
    </div>
  );
}

function PortfolioValueCard({ c, properties }) {
  const active = properties.filter((p) => p.stage !== "فروخته شد");
  const total = active.reduce((sum, p) => sum + (p.price || 0), 0);
  const addedThisWeek = properties.filter((p) => p.createdAt && daysSince(p.createdAt) <= 7).length;
  return (
    <div className="rounded-2xl p-5" style={{ ...glass(c, 24), background: `linear-gradient(160deg, ${c.primarySoft}, ${c.surface} 55%)` }}>
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: 11.5, color: c.muted, marginBottom: 5, letterSpacing: ".02em" }}>ارزش کل فایل‌های فعال</p>
          <CountUpToman value={total} className="flora-money" style={{ fontSize: 22, fontWeight: 800, direction: "ltr", textAlign: "right", letterSpacing: "-0.02em", color: c.ink, display: "inline-block" }} />
        </div>
        <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: c.successSoft, color: c.success, fontSize: 11.5, fontWeight: 700 }}>
          <TrendingUp size={13} /> {addedThisWeek > 0 ? `+${faDigits(addedThisWeek)} این هفته` : "به‌روز"}
        </div>
      </div>
      <div style={{ height: 64, marginTop: 12 }}>
        <svg viewBox="0 0 300 80" preserveAspectRatio="none" width="100%" height="100%">
          <defs>
            <linearGradient id="floraChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c6ff5" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c6ff5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,60 C40,50 60,30 100,35 C140,40 160,15 200,20 C240,25 270,10 300,15 L300,80 L0,80 Z" fill="url(#floraChartGrad)" style={{ opacity: 0, animation: "floraChartFade 1s ease forwards 1.2s" }} />
          <path d="M0,60 C40,50 60,30 100,35 C140,40 160,15 200,20 C240,25 270,10 300,15" fill="none" stroke="#7c6ff5" strokeWidth="3" strokeLinecap="round"
            style={{ strokeDasharray: 600, strokeDashoffset: 600, animation: "floraChartDraw 1.8s ease forwards .4s" }} />
        </svg>
      </div>
      <style>{`@keyframes floraChartDraw { to { stroke-dashoffset: 0; } } @keyframes floraChartFade { to { opacity: 1; } }`}</style>
    </div>
  );
}


function ActivityApptRow({ a, ctx, showDelete }) {
  const { c, properties, setAppointments, scheduleReminder, notify } = ctx;
  const p = properties.find((x) => x.id === a.propertyId);
  return (
    <div className="rounded-lg p-3 flex items-center gap-2.5" style={glass(c, 22)}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><CalendarDays size={14} color={c.primary} /></div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.title || a.customerName || "بازدید"}</p>
        <p style={{ fontSize: 10.5, color: c.muted }}>{a.customerName ? `با ${a.customerName} · ` : ""}{fmtJalali(a.date)}</p>
      </div>
      <input type="time" value={a.time} onChange={(e) => setAppointments((prev) => prev.map((x) => x.id === a.id ? { ...x, time: e.target.value } : x))}
        style={{ background: c.surface2, border: "none", borderRadius: 8, padding: "5px 7px", fontSize: 11, color: c.ink, width: 72 }} />
      <button onClick={() => scheduleReminder(a, p?.title)} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.attnSoft }}><Bell size={14} color={c.attn} /></button>
      {showDelete && (
        <button onClick={() => { setAppointments((prev) => prev.filter((x) => x.id !== a.id)); notify("بازدید حذف شد"); }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={14} color={c.danger} /></button>
      )}
    </div>
  );
}
function ActivityCallRow({ cl, c }) {
  return (
    <div className="rounded-lg p-3 flex items-center gap-2.5" style={glass(c, 22)}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.attnSoft }}><PhoneCall size={14} color={c.attn} /></div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cl.customerName || "تماس"}</p>
        <p style={{ fontSize: 10.5, color: c.muted }}>{cl.notes || cl.status} · {fmtJalali(cl.date)}</p>
      </div>
    </div>
  );
}

function PropertyMiniCard({ p, c, onClick }) {
  const cover = p.media && p.media[0]; const Icon = typeIcon(p.type); const sold = p.stage === "فروخته شد";
  return (
    <button onClick={onClick} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, ...glass(c, 22), opacity: sold ? 0.55 : 1 }}>
      <div className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 56, height: 56, borderRadius: RAD.md, background: cover ? c.primarySoft : `linear-gradient(140deg, ${c.primarySoft}, ${c.purpleSoft})` }}>
        {cover ? (cover.type === "image" ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <Icon size={22} color={c.primary} />}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: FS.body, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: sold ? "line-through" : "none" }}>{p.title}</p>
        <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: c.primary, direction: "ltr", textAlign: "right", marginTop: 3, letterSpacing: "-0.01em" }}>{fmtToman(p.price)}</p>
        <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{faDigits(p.area)} متر{p.rooms ? ` · ${faDigits(p.rooms)} خواب` : ""}</p>
      </div>
      <StageBadge c={c} stage={p.stage} />
    </button>
  );
}

// ---------- Properties tab: big list + pipeline ----------
function PropertiesTab({ ctx, search, setSearch, stageHint }) {
  const { c, properties, setDetail } = ctx;
  const [mode, setMode] = useState("list");
  const [dealFilter, setDealFilter] = useState("همه");
  const [typeFilter, setTypeFilter] = useState("همه");
  const [stageFilter, setStageFilter] = useState(stageHint || "همه");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let out = properties;
    if (search) { const q = search.toLowerCase(); out = out.filter((p) => Object.values(p).some((v) => String(v).toLowerCase().includes(q))); }
    if (dealFilter !== "همه") out = out.filter((p) => p.deal === dealFilter);
    if (typeFilter !== "همه") out = out.filter((p) => p.type === typeFilter);
    if (stageFilter !== "همه") out = out.filter((p) => p.stage === stageFilter);
    return [...out].sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
  }, [properties, search, dealFilter, typeFilter, stageFilter, sortAsc]);

  return (
    <div className="pt-4">
      <SearchBox c={c} value={search} setValue={setSearch} />
      <div style={{ height: 14 }} />
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center rounded-full p-1 gap-1" style={glass(c, 20)}>
          <button onClick={() => setMode("list")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "list" ? c.primary : "transparent" }}><LayoutGrid size={13} color={mode === "list" ? "#fff" : c.muted} /></button>
          <button onClick={() => setMode("pipeline")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "pipeline" ? c.primary : "transparent" }}><Columns3 size={13} color={mode === "pipeline" ? "#fff" : c.muted} /></button>
          <button onClick={() => setMode("map")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "map" ? c.primary : "transparent" }}><MapPin size={13} color={mode === "map" ? "#fff" : c.muted} /></button>
        </div>
        <button onClick={() => setSortAsc((s) => !s)} className="press flex items-center gap-1.5 rounded-full px-3 py-2 mr-auto" style={glass(c, 20)}>
          <ArrowUpDown size={12} color={c.primary} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.primary, whiteSpace: "nowrap" }}>{sortAsc ? "ارزان‌ترین" : "گران‌ترین"}</span>
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {DEAL_FILTERS.map((d) => { const active = dealFilter === d; return <button key={d} onClick={() => setDealFilter(d)} className="press shrink-0 rounded-full px-3 py-1.5" style={active ? { background: c.primary } : glass(c, 18)}><span style={{ fontSize: 10.5, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{d}</span></button>; })}
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((t) => { const active = typeFilter === t; return <button key={t} onClick={() => setTypeFilter(t)} className="press shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1" style={active ? { background: c.purple } : glass(c, 18)}><span style={{ fontSize: 10.5, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{t}</span></button>; })}
      </div>

      {mode === "list" ? (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filtered.map((p) => <PropertyGridCard key={p.id} p={p} ctx={ctx} onClick={() => setDetail({ type: "property", id: p.id })} />)}
          {filtered.length === 0 && <div className="col-span-2"><EmptyLine c={c} text="فایلی پیدا نشد" /></div>}
        </div>
      ) : mode === "map" ? (
        <AllPropertiesMap c={c} rows={filtered} onOpen={(id) => setDetail({ type: "property", id })} />
      ) : (
        <PipelineBoard rows={filtered} ctx={ctx} />
      )}
    </div>
  );
}

// Every pinned property on one Sarein map. Markers are colour-coded by deal type and
// tapping one opens that file.
function AllPropertiesMap({ c, rows, onOpen }) {
  const ref = useRef(null); const objRef = useRef(null);
  const pinned = rows.filter((p) => p.lat && p.lng);
  const DEAL_COLOR = { "فروش": "#2f7cf6", "پیش‌فروش": "#7c6ff5" };

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      if (objRef.current) { objRef.current.remove(); objRef.current = null; }
      const map = L.map(ref.current, { zoomControl: false, attributionControl: false }).setView(SAREIN_CENTER, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "" }).addTo(map);

      pinned.forEach((p) => {
        const color = DEAL_COLOR[p.deal] || "#2f7cf6";
        const sold = p.stage === "فروخته شد";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 2px;transform:rotate(45deg);background:${sold ? "#6b7280" : color};box-shadow:0 3px 8px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.85);"></div>`,
          iconSize: [26, 26], iconAnchor: [13, 26],
        });
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(`<div style="font-family:Vazirmatn,sans-serif;direction:rtl;text-align:right;min-width:130px">
          <b style="font-size:12px">${p.title}</b><br/>
          <span style="font-size:11px;color:#2f7cf6;direction:ltr;display:inline-block">${(p.price || 0).toLocaleString("en-US")} تومان</span><br/>
          <span style="font-size:10px;color:#666">${p.deal} · ${p.area} متر</span>
        </div>`);
        m.on("popupopen", () => {
          const el = document.querySelector(".leaflet-popup-content");
          if (el) el.style.cursor = "pointer";
          if (el) el.onclick = () => onOpen(p.id);
        });
      });

      if (pinned.length > 1) map.fitBounds(pinned.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 16 });
      else if (pinned.length === 1) map.setView([pinned[0].lat, pinned[0].lng], 15);
      objRef.current = map;
      setTimeout(() => map.invalidateSize(), 120);
    });
    return () => { cancelled = true; if (objRef.current) { objRef.current.remove(); objRef.current = null; } };
  }, [rows.length, pinned.length]);

  return (
    <div className="pb-4">
      <div className="rounded-2xl overflow-hidden" style={glass(c, 22)}>
        <div ref={ref} style={{ width: "100%", height: 420, background: c.surface2 }} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {Object.entries(DEAL_COLOR).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: c.surface2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: v }} />
            <span style={{ fontSize: 9.5, color: c.muted }}>{k}</span>
          </span>
        ))}
      </div>
      {pinned.length < rows.length && (
        <p style={{ fontSize: 10.5, color: c.muted, marginTop: 10, lineHeight: 1.8 }}>
          {faDigits(rows.length - pinned.length)} فایل روی نقشه نیست، چون موقعیتشان ثبت نشده. برای افزودن، فایل را ویرایش کن و از دکمه‌ی نقشه استفاده کن.
        </p>
      )}
      {pinned.length === 0 && <EmptyLine c={c} text="هیچ فایلی موقعیت نقشه ندارد" />}
    </div>
  );
}

function PropertyGridCard({ p, ctx, onClick }) {
  const { c } = ctx;
  const cover = p.media && p.media[0]; const Icon = typeIcon(p.type); const sold = p.stage === "فروخته شد";
  const meta = [`${faDigits(p.area)} متر`, `${faDigits(p.rooms)} خواب`].join(" · ");
  return (
    <button onClick={onClick} className="press text-right overflow-hidden" style={{ borderRadius: RAD.md, ...glass(c) }}>
      <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: c.primarySoft }}>
        {cover ? (
          cover.type === "image" ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Icon size={30} color={c.primary} className="flora-float" style={{ opacity: 0.45 }} /></div>
        )}
        <span className="absolute top-2 right-2" style={{ fontSize: FS.caption, fontWeight: FW.bold, color: "#fff", background: "rgba(15,20,35,0.72)", padding: `3px ${SP.sm}px`, borderRadius: RAD.sm }}>{p.deal}</span>
        {sold && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(15,20,35,0.55)" }}>
            <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: "#fff", background: c.danger, padding: `4px ${SP.md - 2}px`, borderRadius: RAD.sm }}>فروخته شد</span>
          </div>
        )}
      </div>
      <div style={{ padding: SP.md }}>
        <p style={{ fontSize: FS.body + 1, fontWeight: FW.heavy, color: c.primary, direction: "ltr", textAlign: "right" }}>{fmtToman(p.price)}</p>
        <p style={{ fontSize: FS.body, fontWeight: FW.medium, marginTop: 3, color: c.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, minHeight: 30 }}>{p.title}</p>
        <p style={{ fontSize: FS.caption, color: c.muted, marginTop: SP.xs }}>{meta}</p>
      </div>
    </button>
  );
}

function PipelineBoard({ rows, ctx }) {
  const { c, setProperties, setDetail, notify } = ctx;
  const advance = (p) => {
    const idx = STAGES.indexOf(p.stage);
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    setProperties((prev) => prev.map((x) => x.id === p.id ? { ...x, stage: next } : x));
    notify(`مرحله به «${next}» تغییر کرد`);
  };
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollSnapType: "x proximity" }}>
      {STAGES.map((stage) => {
        const items = rows.filter((p) => p.stage === stage);
        return (
          <div key={stage} className="shrink-0 rounded-xl p-3" style={{ ...glass(c, 24), width: 260, scrollSnapAlign: "start" }}>
            <div className="flex items-center justify-between mb-3 px-1">
              <span style={{ fontSize: 13, fontWeight: 800 }}>{stage}</span>
              <span style={{ fontSize: 11, color: c.muted }}>{faDigits(items.length)}</span>
            </div>
            <div className="flex flex-col gap-3">
              {items.map((p) => {
                const cover = p.media && p.media[0]; const Icon = typeIcon(p.type);
                return (
                  <div key={p.id} className="rounded-lg overflow-hidden" style={glass(c, 22)}>
                    <button onClick={() => setDetail({ type: "property", id: p.id })} className="press w-full text-right">
                      <div className="w-full" style={{ height: 90, background: c.primarySoft }}>
                        {cover ? (cover.type === "image" ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <div className="w-full h-full flex items-center justify-center"><Icon size={26} color={c.primary} className="flora-float" style={{ opacity: 0.5 }} /></div>}
                      </div>
                      <div className="p-2.5">
                        <p style={{ fontSize: 12.5, fontWeight: 700 }}>{p.title}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: c.primary, marginTop: 2 }}>{fmtToman(p.price)}</p>
                      </div>
                    </button>
                    {stage !== "فروخته شد" && (
                      <button onClick={() => advance(p)} className="press w-full flex items-center justify-center gap-1.5 py-2" style={{ background: c.primarySoft, color: c.primary, fontSize: 11, fontWeight: 700 }}>
                        <ChevronLeft size={13} /> حرکت به مرحله بعد
                      </button>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && <p style={{ fontSize: 11, color: c.muted, textAlign: "center", padding: "14px 0" }}>خالی</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Customers tab ----------
function CustomersTab({ ctx, search, setSearch }) {
  const { c, customers, setDetail } = ctx;
  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((cu) => Object.values(cu).some((v) => String(v).toLowerCase().includes(q)));
  }, [customers, search]);
  return (
    <div style={{ paddingTop: SP.lg }}>
      <SearchBox c={c} value={search} setValue={setSearch} />
      <div style={{ height: SP.lg }} />
      <div className="flex flex-col" style={{ gap: SP.md }}>
      {filtered.map((cu) => {
        const stage = cu.stage || "در حال بررسی";
        const stageColor = CUSTOMER_STAGE_COLOR(c)[stage] || c.primary;
        // Neglect decay — a customer nobody has touched in a while visibly fades,
        // like a plant wilting. Closed-won customers never decay (no need to chase them).
        const idleDays = cu.lastContactAt ? daysSince(cu.lastContactAt) : 99; // never logged → treat as long overdue
        const decaying = stage !== "خرید کرد" && idleDays >= 2;
        const decay = decaying ? Math.min(1, (idleDays - 1) / 7) : 0; // full grey by ~day 8
        return (
        <button key={cu.id} onClick={() => setDetail({ type: "customer", id: cu.id })} className="press w-full text-right" style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c, 22), filter: decay > 0 ? `grayscale(${decay})` : "none", opacity: 1 - decay * 0.32, transition: "filter .6s ease, opacity .6s ease" }}>
          <div className="flex items-center" style={{ gap: SP.md }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 48, height: 48, background: c.primarySoft }}><UserCircle2 size={26} color={c.primary} /></div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.name}</p>
              <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.need || "بدون توضیح"}</p>
            </div>
            <div className="text-left shrink-0">
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: c.primary, direction: "rtl" }}>{fmtBudgetShort(cu.budget)}</p>
              <p style={{ fontSize: 9.5, color: c.muted, marginTop: 1 }}>بودجه</p>
            </div>
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: SP.md, paddingTop: SP.md, borderTop: `1px solid ${c.border}` }}>
            <span className="rounded-full" style={{ fontSize: FS.caption, fontWeight: FW.bold, color: stageColor, background: stageColor + "1f", padding: `4px ${SP.md}px` }}>{stage}</span>
            {decaying ? (
              <span className="flex items-center" style={{ gap: SP.xs, fontSize: FS.caption, color: c.attn, fontWeight: FW.bold }}><AlertTriangle size={12} color={c.attn} />{faDigits(idleDays)} روز بدون پیگیری</span>
            ) : (
              <span className="flex items-center" style={{ gap: SP.xs, fontSize: FS.caption, color: c.muted }}>مشاهده <ChevronLeft size={14} color={c.muted} /></span>
            )}
          </div>
          {cu.lastCallNote && (
            <div className="flex items-start" style={{ gap: SP.xs, marginTop: SP.sm }}>
              <StickyNote size={12} color={c.attn} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.lastCallNote}</p>
            </div>
          )}
        </button>
      ); })}
      {filtered.length === 0 && <EmptyLine c={c} text="مشتری‌ای پیدا نشد" />}
      </div>
    </div>
  );
}

// ---------- Calendar tab ----------
function CalendarTab({ ctx }) {
  const { c, appointments } = ctx;
  const todayJ = isoToJalali(todayISO());
  const [view, setView] = useState({ jy: todayJ[0], jm: todayJ[1] });
  const [selected, setSelected] = useState(todayISO());

  // Which days this month have visits (for the dots)
  const visitDays = useMemo(() => {
    const set = {};
    appointments.forEach((a) => { const [jy, jm, jd] = isoToJalali(a.date); if (jy === view.jy && jm === view.jm) set[jd] = (set[jd] || 0) + 1; });
    return set;
  }, [appointments, view]);

  const monthLen = jalaliMonthLength(view.jy, view.jm);
  const firstWd = jalaliFirstWeekday(view.jy, view.jm); // 0=شنبه
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= monthLen; d++) cells.push(d);

  const prevMonth = () => setView((v) => v.jm === 1 ? { jy: v.jy - 1, jm: 12 } : { jy: v.jy, jm: v.jm - 1 });
  const nextMonth = () => setView((v) => v.jm === 12 ? { jy: v.jy + 1, jm: 1 } : { jy: v.jy, jm: v.jm + 1 });

  const selectedAppts = appointments.filter((a) => a.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

  return (
    <div style={{ paddingTop: SP.lg }}>
      {/* Month header */}
      <div className="flex items-center justify-between" style={{ marginBottom: SP.lg, paddingInline: SP.xs }}>
        <button onClick={prevMonth} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ ...glass(c, 18) }}><ChevronRight size={18} color={c.ink} /></button>
        <h2 style={{ fontSize: FS.title, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>{MONTHS_FA[view.jm - 1]} {faDigits(view.jy)}</h2>
        <button onClick={nextMonth} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ ...glass(c, 18) }}><ChevronLeft size={18} color={c.ink} /></button>
      </div>

      {/* Calendar card */}
      <div style={{ padding: SP.md, borderRadius: RAD.lg, ...glass(c, 24) }}>
        <div className="grid grid-cols-7" style={{ marginBottom: SP.sm }}>
          {WEEK.map((w, i) => <div key={i} style={{ textAlign: "center", fontSize: FS.caption, color: c.muted, fontWeight: FW.bold }}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ gap: SP.xs }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const iso = jalaliToIso(view.jy, view.jm, d);
            const isToday = iso === todayISO();
            const isSel = iso === selected;
            const hasVisit = visitDays[d];
            return (
              <button key={i} onClick={() => setSelected(iso)} className="press flex flex-col items-center justify-center" style={{ aspectRatio: "1", borderRadius: RAD.md, background: isSel ? "linear-gradient(135deg,#2f7cf6,#7c6ff5)" : isToday ? c.primarySoft : "transparent", position: "relative" }}>
                <span style={{ fontSize: FS.body, fontWeight: isSel || isToday ? FW.heavy : FW.medium, color: isSel ? "#fff" : isToday ? c.primary : c.ink }}>{faDigits(d)}</span>
                {hasVisit && <span style={{ position: "absolute", bottom: 5, width: 5, height: 5, borderRadius: RAD.pill, background: isSel ? "#fff" : c.success }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day's appointments */}
      <div className="flex items-baseline justify-between" style={{ marginTop: SP.xl, marginBottom: SP.md, paddingRight: 2 }}>
        <h3 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{selected === todayISO() ? "بازدیدهای امروز" : `بازدیدهای ${fmtJalali(selected)}`}</h3>
        {selectedAppts.length > 0 && <span style={{ fontSize: FS.caption, color: c.muted }}>{faDigits(selectedAppts.length)} مورد</span>}
      </div>
      <div className="flex flex-col" style={{ gap: SP.sm }}>
        {selectedAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} showDelete />)}
        {selectedAppts.length === 0 && <EmptyLine c={c} text="این روز بازدیدی نداری" />}
      </div>
    </div>
  );
}

// ---------- More tab ----------
// Lets the agent download the whole Sarein area once, while online, so the maps
// then work with no connection at all.
// Re-encodes every photo already stored (properties' media) to WebP, in place —
// no re-upload needed. Runs one image at a time so the UI stays responsive.
function PhotoOptimizeButton({ ctx }) {
  const { c, properties, setProperties, notify } = ctx;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }

  const dataUrlBytes = (u) => (u ? Math.round((u.length - u.indexOf(",") - 1) * 0.75) : 0);
  const totalImages = properties.reduce((n, p) => n + (p.media || []).filter((m) => m.type === "image").length, 0);

  const run = async () => {
    if (totalImages === 0) { notify("فایلی با عکس پیدا نشد"); return; }
    setBusy(true);
    let done = 0, beforeBytes = 0, afterBytes = 0;
    const next = [];
    for (const p of properties) {
      if (!p.media || p.media.length === 0) { next.push(p); continue; }
      const media = [];
      for (const m of p.media) {
        if (m.type === "image") {
          const before = dataUrlBytes(m.url);
          const candidate = await reencodeToWebp(m.url);
          const after = dataUrlBytes(candidate);
          const url = after < before ? candidate : m.url; // keep original if re-encode didn't actually help
          beforeBytes += before; afterBytes += Math.min(before, after);
          media.push({ ...m, url });
          done++; setProgress({ done, total: totalImages });
        } else media.push(m);
      }
      next.push({ ...p, media });
    }
    setProperties(next);
    setBusy(false); setProgress(null);
    const savedMb = ((beforeBytes - afterBytes) / (1024 * 1024)).toFixed(1);
    const method = supportsWebp() ? "WebP" : "JPEG فشرده‌تر (مرورگرت WebP را واقعاً پشتیبانی نمی‌کند)";
    notify(afterBytes < beforeBytes ? `${faDigits(done)} عکس با ${method} بازفشرده شد — ${savedMb} مگابایت کمتر شد` : `${faDigits(done)} عکس بررسی شد — حجمشان از قبل کم بود`);
  };

  return (
    <button onClick={run} disabled={busy} className="press w-full rounded-xl py-3 flex items-center justify-center gap-2" style={{ background: c.attnSoft }}>
      {busy ? <Loader2 size={14} className="animate-spin" color={c.attn} /> : <ImageIcon size={14} color={c.attn} />}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: c.attn }}>
        {busy ? `در حال بهینه‌سازی... ${progress ? `${faDigits(progress.done)}/${faDigits(progress.total)}` : ""}` : totalImages > 0 ? `فشرده‌سازی ${faDigits(totalImages)} عکس موجود` : "عکسی برای فشرده‌سازی نیست"}
      </span>
    </button>
  );
}

function OfflineMapButton({ c, notify }) {
  const [state, setState] = useState("idle"); // idle | working | done
  const [pct, setPct] = useState(0);
  const run = async () => {
    if (state === "working") return;
    setState("working"); setPct(0);
    try {
      await precacheSareinTiles((done, total) => setPct(Math.round((done / total) * 100)));
      setState("done"); notify("نقشه سرعین برای استفاده آفلاین ذخیره شد");
    } catch {
      setState("idle"); notify("ذخیره نقشه ناموفق بود، اتصال اینترنت را بررسی کن");
    }
  };
  return (
    <button onClick={run} disabled={state === "working"} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mt-2" style={{ background: c.primarySoft }}>
      <MapPin size={14} color={c.primary} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: c.primary }}>
        {state === "working" ? `در حال ذخیره نقشه… ${faDigits(pct)}%` : state === "done" ? "نقشه سرعین آفلاین شد ✓" : "ذخیره نقشه سرعین برای آفلاین"}
      </span>
    </button>
  );
}

function CollapsibleCard({ c, icon: Icon, tint, title, subtitle, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={glass(c, 22)}>
      <button onClick={() => setOpen((o) => !o)} className="press w-full text-right p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint + "22" }}><Icon size={18} color={tint} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</p>
          <p style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>{subtitle}</p>
        </div>
        {count != null && <span className="shrink-0" style={{ fontSize: 11, fontWeight: 800, color: tint, background: tint + "1f", padding: "3px 9px", borderRadius: 999 }}>{faDigits(count)}</span>}
        <ChevronDown size={16} color={c.muted} style={{ transition: "transform .3s cubic-bezier(.34,1.3,.64,1)", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }} />
      </button>
      {open && <div className="px-4 pb-4 flora-up">{children}</div>}
    </div>
  );
}

// Editable agency identity. Flora is meant to be published for any agent, so the
// name, city, and agent name aren't hardcoded — each office sets their own here.
function OfficeCard({ c, agencyName, setAgencyName, agencyCity, setAgencyCity, agentName, setAgentName, notify, properties, customers, owners }) {
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(agencyName);
  const [ct, setCt] = useState(agencyCity);
  const [ag, setAg] = useState(agentName);
  const save = () => {
    setAgencyName(n.trim() || "املاک");
    setAgencyCity(ct.trim());
    setAgentName(ag.trim());
    setEditing(false);
    notify("مشخصات دفتر ذخیره شد");
  };
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 12px 32px rgba(79,70,229,.32)", position: "relative", overflow: "hidden" }}>
      <span style={{ position: "absolute", top: "-55%", left: "-25%", width: 200, height: 200, background: "radial-gradient(circle,rgba(255,255,255,.15),transparent 70%)", animation: "floraFloat 5s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: -20, left: -14, opacity: 0.13, pointerEvents: "none" }}><FloraMark size={130} color="#fff" stroke={1.2} /></div>
      {!editing ? (
        <div style={{ position: "relative" }}>
          <div className="flex items-start justify-between">
            <div>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.8)" }}>{agencyName}{agencyCity ? ` — ${agencyCity}` : ""}</p>
              <p style={{ fontSize: 15.5, fontWeight: 800, color: "#fff", marginTop: 2 }}>مدیریت دفتر</p>
            </div>
            <button onClick={() => { setN(agencyName); setCt(agencyCity); setAg(agentName); setEditing(true); }} className="press rounded-lg px-2.5 py-1.5 flex items-center gap-1 shrink-0" style={{ background: "rgba(255,255,255,.18)" }}>
              <Edit3 size={11} color="#fff" /><span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>ویرایش نام</span>
            </button>
          </div>
          <div className="flex gap-2 mt-3.5">
            {[{ n: properties.length, l: "فایل" }, { n: customers.length, l: "مشتری" }, { n: owners.length, l: "مالک" }].map((s, i) => (
              <div key={i} className="flex-1 rounded-xl py-2 text-center" style={{ background: "rgba(255,255,255,.14)" }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{faDigits(s.n)}</p>
                <p style={{ fontSize: 9.5, color: "rgba(255,255,255,.8)" }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5" style={{ position: "relative" }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>ویرایش مشخصات دفتر</p>
          <input style={{ ...inputStyle(c), background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} value={n} onChange={(e) => setN(e.target.value)} placeholder="نام دفتر (مثلاً املاک گنجینه)" />
          <input style={{ ...inputStyle(c), background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} value={ct} onChange={(e) => setCt(e.target.value)} placeholder="شهر (مثلاً سرعین)" />
          <input style={{ ...inputStyle(c), background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} value={ag} onChange={(e) => setAg(e.target.value)} placeholder="نام شما (مثلاً قبادی)" />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="press flex-1 rounded-xl py-2.5" style={{ background: "rgba(255,255,255,.16)", fontSize: 12, fontWeight: 700, color: "#fff" }}>لغو</button>
            <button onClick={save} className="press flex-1 rounded-xl py-2.5" style={{ background: "#fff", fontSize: 12, fontWeight: 700, color: c.primary }}>ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreTab({ ctx }) {
  const { c, owners, setOwners, builders, setBuilders, calls, setCalls, setSheet, setDetail, setTab, exportBackup, importBackup, exportProperties, exportFinance, notify, properties, customers, simpleMode, setSimpleMode, agencyName, setAgencyName, agencyCity, setAgencyCity } = ctx;
  const importRef = useRef(null);
  const pending = calls.filter((cl) => cl.status !== "انجام‌شد").length;

  return (
    <div className="pt-3">
      {/* Simple / advanced mode switch — the master control for how busy the app feels */}
      <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={glass(c, 22)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: simpleMode ? c.successSoft : c.primarySoft }}>
          {simpleMode ? <Sparkles size={18} color={c.success} /> : <LayoutGrid size={18} color={c.primary} />}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>{simpleMode ? "حالت ساده" : "حالت حرفه‌ای"}</p>
          <p style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>{simpleMode ? "فقط فایل‌ها و مشتری‌ها — تمیز و بی‌شلوغی" : "همه‌ی امکانات: مالی، کمیسیون، گزارش و AI"}</p>
        </div>
        <button onClick={() => { setSimpleMode(!simpleMode); notify(simpleMode ? "حالت حرفه‌ای فعال شد" : "حالت ساده فعال شد"); }}
          className="press shrink-0" style={{ width: 52, height: 30, borderRadius: 999, background: simpleMode ? c.border : c.primary, position: "relative", transition: "background .3s ease" }}>
          <span style={{ position: "absolute", top: 3, right: simpleMode ? 3 : 25, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "right .3s cubic-bezier(.34,1.4,.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
        </button>
      </div>

      {/* Office management + editable agency identity, merged into one card */}
      <OfficeCard c={c} agencyName={agencyName} setAgencyName={setAgencyName} agencyCity={agencyCity} setAgencyCity={setAgencyCity} agentName={ctx.agentName} setAgentName={ctx.setAgentName} notify={notify} properties={properties} customers={customers} owners={owners} />

      {/* In simple mode, Finance isn't in the nav — give it a shortcut here */}
      {simpleMode && (
        <button onClick={() => setTab("finance")} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c, 22)}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><Wallet size={20} color={c.success} /></div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 700 }}>مالی و کمیسیون</p>
            <p style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>معاملات، پرداخت‌ها و تقسیم کمیسیون</p>
          </div>
          <ChevronLeft size={17} color={c.muted} />
        </button>
      )}

      {/* Two hero shortcuts */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={() => setTab("calendar")} className="press text-right rounded-2xl p-4" style={glass(c, 22)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.primarySoft }}><CalendarDays size={18} color={c.primary} /></div>
          <p style={{ fontSize: 12.5, fontWeight: 700 }}>تقویم بازدید</p>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>قرارهای امروز و آینده</p>
        </button>
        <button onClick={() => setSheet("messages")} className="press text-right rounded-2xl p-4" style={glass(c, 22)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.purpleSoft }}><MessageSquare size={18} color={c.purple} /></div>
          <p style={{ fontSize: 12.5, fontWeight: 700 }}>پیام‌های آماده</p>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>متن‌های جذب مشتری</p>
        </button>
      </div>

      {/* Collapsible: call follow-ups */}
      <CollapsibleCard c={c} icon={PhoneCall} tint={c.attn} title="پیگیری تماس‌ها" subtitle={pending > 0 ? `${faDigits(pending)} تماس در انتظار` : "همه پیگیری شده"} count={calls.length}>
        <div className="flex flex-col gap-2">
          {calls.map((cl) => {
            const done = cl.status === "انجام‌شد";
            return (
              <div key={cl.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
                <button onClick={() => setCalls((prev) => prev.map((x) => x.id === cl.id ? { ...x, status: done ? "در انتظار پاسخ" : "انجام‌شد" } : x))} className="shrink-0">
                  <CheckCircle2 size={20} color={done ? c.success : c.attn} fill={done ? c.success : "none"} />
                </button>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12.5, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? c.muted : c.ink }}>{cl.customerName}</p>
                  <p style={{ fontSize: 10, color: c.muted }}>{cl.notes} · {fmtJalali(cl.date)}</p>
                </div>
                <button onClick={() => setSheet({ kind: "call", editId: cl.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
                <button onClick={() => { setCalls((prev) => prev.filter((x) => x.id !== cl.id)); notify("تماس حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
              </div>
            );
          })}
          {calls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
          <AddLink c={c} label="ثبت تماس جدید" onClick={() => setSheet("call")} />
        </div>
      </CollapsibleCard>

      {/* Collapsible: owners */}
      <CollapsibleCard c={c} icon={UserCircle2} tint={c.primary} title="مالکین" subtitle="لیست مالکین و تماس سریع" count={owners.length}>
        <div className="flex flex-col gap-2">
          {owners.map((o) => (
            <div key={o.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: c.primarySoft }}><UserCircle2 size={17} color={c.primary} /></div>
              <div className="flex-1 min-w-0"><p style={{ fontSize: 12.5, fontWeight: 600 }}>{o.name}</p><p style={{ fontSize: 10.5, color: c.muted }} dir="ltr">{o.phone}</p></div>
              {o.phone && <a href={`tel:${o.phone}`} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={12} color={c.success} /></a>}
              <button onClick={() => setSheet({ kind: "owner", editId: o.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
              <button onClick={() => { setOwners((prev) => prev.filter((x) => x.id !== o.id)); notify("مالک حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
            </div>
          ))}
          {owners.length === 0 && <EmptyLine c={c} text="مالکی ثبت نشده" />}
          <AddLink c={c} label="ثبت مالک جدید" onClick={() => setSheet("owner")} />
        </div>
      </CollapsibleCard>

      {/* Collapsible: builders */}
      <CollapsibleCard c={c} icon={Hammer} tint={c.attn} title="سازندگان" subtitle="شرکت‌ها و سازنده‌های همکار" count={builders.length}>
        <div className="flex flex-col gap-2">
          {builders.length > 0 && (
            <button onClick={() => setSheet("builder-broadcast")} className="press w-full rounded-xl py-2.5 flex items-center justify-center gap-2 mb-1" style={{ background: c.primarySoft }}>
              <Send size={14} color={c.primary} /><span style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>پیام تبریک گروهی به همه‌ی سازنده‌ها</span>
            </button>
          )}
          {builders.map((b) => (
            <div key={b.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: c.attnSoft }}><Hammer size={15} color={c.attn} /></div>
              <div className="flex-1 min-w-0"><p style={{ fontSize: 12.5, fontWeight: 600 }}>{b.name}</p><p style={{ fontSize: 10.5, color: c.muted }} dir="ltr">{b.phone}</p></div>
              {b.phone && <a href={`tel:${b.phone}`} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={12} color={c.success} /></a>}
              <button onClick={() => setSheet({ kind: "builder", editId: b.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
              <button onClick={() => { setBuilders((prev) => prev.filter((x) => x.id !== b.id)); notify("سازنده حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
            </div>
          ))}
          {builders.length === 0 && <EmptyLine c={c} text="سازنده‌ای ثبت نشده" />}
          <AddLink c={c} label="ثبت سازنده جدید" onClick={() => setSheet("builder")} />
        </div>
      </CollapsibleCard>

      {/* Collapsible: settings & backup */}
      <CollapsibleCard c={c} icon={Wallet} tint={c.purple} title="پشتیبان‌گیری و تنظیمات" subtitle="بکاپ داده‌ها و هوش مصنوعی">
        <p style={{ fontSize: 10.5, color: c.muted, marginBottom: 8, lineHeight: 1.7 }}>بکاپ کامل همه‌چیز را ذخیره می‌کند. اگر فقط بخشی را می‌خواهی، از دکمه‌های جدا استفاده کن.</p>
        <button onClick={exportBackup} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-2" style={{ background: c.primarySoft }}>
          <Download size={14} color={c.primary} /><span style={{ fontSize: 11.5, fontWeight: 700, color: c.primary }}>بکاپ کامل</span>
        </button>
        <div className="flex gap-2 mb-2">
          <button onClick={exportProperties} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.surface2 }}>
            <Building2 size={13} color={c.ink} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.ink }}>فایل‌ها و مشتری‌ها</span>
          </button>
          <button onClick={exportFinance} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.surface2 }}>
            <Wallet size={13} color={c.ink} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.ink }}>مالی</span>
          </button>
        </div>
        <button onClick={() => importRef.current?.click()} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-2" style={{ background: c.attnSoft }}>
          <Upload size={14} color={c.attn} /><span style={{ fontSize: 11.5, fontWeight: 700, color: c.attn }}>بازیابی بکاپ (هر نوع)</span>
        </button>
        <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { if (e.target.files?.[0]) importBackup(e.target.files[0]); e.target.value = ""; }} />
        <button onClick={() => setSheet("ai-settings")} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.purpleSoft }}>
          <Sparkles size={14} color={c.purple} /><span style={{ fontSize: 11.5, fontWeight: 700, color: c.purple }}>تنظیمات هوش مصنوعی</span>
        </button>
        <OfflineMapButton c={c} notify={notify} />
        <PhotoOptimizeButton ctx={ctx} />
      </CollapsibleCard>

      <div style={{ height: 12 }} />
    </div>
  );
}

function AddLink({ c, label, onClick }) {
  return <button onClick={onClick} className="press flex items-center gap-1.5 mb-6" style={{ color: c.primary, fontSize: 12.5, fontWeight: 700 }}><Plus size={14} /> {label}</button>;
}

// ---------- Detail view (full screen) ----------
function DetailView({ detail, ctx, onBack }) {
  if (detail.type === "property") return <PropertyDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  if (detail.type === "customer") return <CustomerDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  if (detail.type === "copilot") return <CopilotView ctx={ctx} onBack={onBack} />;
  if (detail.type === "calls") return <CallsView ctx={ctx} onBack={onBack} />;
  if (detail.type === "ai-chat") return <AiChatView ctx={ctx} onBack={onBack} />;
  if (detail.type === "finance") return <FinanceCenterView ctx={ctx} onBack={onBack} />;
  return null;
}
function BackHeader({ c, title, onBack, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-4">
      <button onClick={onBack} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}><ArrowRight size={16} color={c.ink} /></button>
      <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.bold }}>{title}</h2>
      <div className="flex items-center gap-2">
        {onEdit && <button onClick={onEdit} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}><Edit3 size={15} color={c.primary} /></button>}
        {onDelete && <button onClick={onDelete} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}><Trash2 size={15} color={c.danger} /></button>}
        {!onEdit && !onDelete && <div style={{ width: 36 }} />}
      </div>
    </div>
  );
}

// Owner contact stays hidden by default so the file can be shown to a customer
// without exposing the owner's name and number. One tap reveals it for the agent.
function OwnerReveal({ c, owner }) {
  const [shown, setShown] = useState(false);
  if (!shown) {
    return (
      <button onClick={() => setShown(true)} className="press flex items-center gap-1.5 mt-3 rounded-lg px-3 py-2" style={{ background: c.surface2 }}>
        <Eye size={13} color={c.primary} />
        <span style={{ fontSize: 11.5, color: c.primary, fontWeight: 700 }}>نمایش اطلاعات مالک</span>
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: c.surface2 }}>
      <div className="flex items-center gap-1.5" style={{ color: c.ink, fontSize: 12.5, fontWeight: 600 }}>
        <UserCircle2 size={14} color={c.primary} /> {owner.name}
      </div>
      {owner.phone && (
        <div className="flex items-center justify-between mt-2">
          <span dir="ltr" style={{ fontSize: 12.5, color: c.muted }}>{owner.phone}</span>
          <a href={`tel:${owner.phone}`} className="press flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: c.successSoft }}>
            <PhoneCall size={12} color={c.success} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.success }}>تماس</span>
          </a>
        </div>
      )}
    </div>
  );
}

function MediaGallery({ c, media, onAdd, onRemove, onView, uploading }) {
  const inputRef = useRef(null);
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      <button onClick={() => inputRef.current?.click()} className="press shrink-0 rounded-lg flex flex-col items-center justify-center gap-1" style={{ width: 84, height: 84, ...glass(c, 20) }}>
        {uploading ? <Loader2 size={18} color={c.primary} className="animate-spin" /> : <ImagePlus size={18} color={c.primary} />}
        <span style={{ fontSize: 10, color: c.primary, fontWeight: 700 }}>افزودن</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
      {media.map((m, mi) => (
        <div key={m.id} className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 84, height: 84 }}>
          <button onClick={() => onView({ media, index: mi })} className="w-full h-full">
            {m.type === "image" ? <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <div className="relative w-full h-full"><video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}><Play size={18} color="#fff" fill="#fff" /></div></div>
            )}
          </button>
          <button onClick={() => onRemove(m.id)} className="press absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}><X size={11} color="#fff" /></button>
        </div>
      ))}
    </div>
  );
}
function Lightbox({ item, onClose }) {
  // item can be a single media object (legacy) or { media:[...], index }
  const media = item.media || [item];
  const [idx, setIdx] = useState(item.index || 0);
  const touch = useRef({ x: 0 });
  const cur = media[idx];
  const atStart = idx === 0, atEnd = idx === media.length - 1;
  const go = (d) => setIdx((i) => Math.max(0, Math.min(media.length - 1, i + d)));

  return (
    <div className="fixed inset-0 z-[90] flex flex-col flora-pop" style={{ background: "rgba(0,0,0,0.94)" }} onClick={onClose}>
      {/* top bar: close + counter, clear of the notch */}
      <div className="flex items-center justify-between px-5 shrink-0" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><X size={16} color="#fff" /></button>
        {media.length > 1 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, direction: "ltr" }}>{idx + 1} / {media.length}</span>}
      </div>

      {/* image area — centered, fills the middle */}
      <div
        className="flex-1 flex items-center justify-center relative px-4"
        style={{ minHeight: 0 }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touch.current.x = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touch.current.x;
          if (Math.abs(dx) > 45) go(dx > 0 ? -1 : 1); // RTL: swipe right = previous
        }}
      >
        {cur.type === "image"
          ? <img src={cur.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14, objectFit: "contain" }} />
          : <video src={cur.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14 }} />}

        {/* arrow buttons (RTL: right arrow = previous, left arrow = next) */}
        {media.length > 1 && !atStart && (
          <button onClick={() => go(-1)} className="press absolute top-1/2 right-3 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)", transform: "translateY(-50%)", backdropFilter: "blur(6px)" }}>
            <ChevronRight size={22} color="#fff" />
          </button>
        )}
        {media.length > 1 && !atEnd && (
          <button onClick={() => go(1)} className="press absolute top-1/2 left-3 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)", transform: "translateY(-50%)", backdropFilter: "blur(6px)" }}>
            <ChevronLeft size={22} color="#fff" />
          </button>
        )}
      </div>

      {/* dots */}
      {media.length > 1 && (
        <div className="flex items-center justify-center gap-2 shrink-0" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
          {media.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 99, background: i === idx ? "#fff" : "rgba(255,255,255,0.4)", transition: "all .25s ease" }} />
          ))}
        </div>
      )}
    </div>
  );
}
function InfoChip({ c, icon: Icon, label }) { return <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: c.surface2 }}><Icon size={12} color={c.muted} /><span style={{ fontSize: 11, color: c.ink }}>{label}</span></div>; }

// Read-only map preview shown on a property's detail page once a location has been pinned.
function PropertyMiniMap({ c, lat, lng, title }) {
  const ref = useRef(null); const objRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current || objRef.current) return;
      const map = L.map(ref.current, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false }).setView([lat, lng], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "" }).addTo(map);
      L.marker([lat, lng]).addTo(map);
      objRef.current = map;
    });
    return () => { cancelled = true; if (objRef.current) { objRef.current.remove(); objRef.current = null; } };
  }, [lat, lng]);
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={glass(c, 22)}>
      <div ref={ref} style={{ width: "100%", height: 160, background: c.surface2 }} />
      <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer"
        className="press flex items-center justify-center gap-1.5 py-3" style={{ background: c.primarySoft, color: c.primary, fontSize: 11.5, fontWeight: 700 }}>
        <MapPin size={13} /> مسیریابی به {title}
      </a>
    </div>
  );
}

function PropertyDetail({ id, ctx, onBack }) {
  const { c, properties, setProperties, owners, builders, appointments, setLightbox, notify, hasAiKey, callAI, setSheet } = ctx;
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
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    setAiLoading(true);
    try {
      const isPreSale = p.deal === "پیش‌فروش";
      const prompt = `تو یک مشاور املاک حرفه‌ای و خوش‌ذوق در سرعین هستی. یک متن معرفی گرم و جذاب برای این ملک بنویس — طوری که وقتی مشاور آن را برای مشتری می‌خواند، مشتری هیجان‌زده شود و بگوید «بریم ببینیمش». لحن صمیمی و تصویری باشد، نه خشک و فهرست‌وار. حس زندگی در آن ملک را منتقل کن (نور، فضا، آرامش، موقعیت خوب سرعین و نزدیکی به طبیعت و آب‌گرم). حداکثر ۵ خط. با یک جمله‌ی دعوت‌کننده تمام کن.
اطلاعات ملک:
عنوان: ${p.title}
نوع: ${p.type}${isPreSale ? " (پیش‌فروش)" : ""}
متراژ: ${p.area} متر
طبقه: ${p.floor || "-"}
اتاق خواب: ${p.rooms}
لوازم: ${p.furnished || "-"}
موقعیت: ${p.address}
قیمت: ${fmtToman(p.price)}
فقط خودِ متن معرفی را برگردان، بدون تیتر و توضیح اضافه.`;
      const text = await callAI(prompt);
      setAdText(text.trim());
      setProperties((prev) => prev.map((x) => x.id === id ? { ...x, desc: text.trim() } : x));
    } catch (e) { notify(`خطا در تولید آگهی: ${e.message || "نامشخص"}`); }
    setAiLoading(false);
  };

  return (
    <div className="pt-2">
      <BackHeader c={c} title="جزئیات فایل" onBack={onBack} onEdit={() => setSheet({ kind: "property", editId: id })} onDelete={() => { setProperties((prev) => prev.filter((x) => x.id !== id)); onBack(); notify("فایل حذف شد"); }} />
      <SectionHeader c={c} title="عکس و فیلم" />
      <div className="mb-4"><MediaGallery c={c} media={p.media || []} uploading={uploading} onAdd={addMedia} onRemove={removeMedia} onView={setLightbox} /></div>

      <div className="rounded-2xl p-4 mb-3" style={glass(c, 24)}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}>
              {floraIcon(floraTypeIcon(p.type, p.deal), { size: 26, color: c.primary })}
            </div>
            <span style={{ fontSize: 11, background: c.primarySoft, color: c.primary, padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>{p.deal}</span>
          </div>
          <StageBadge c={c} stage={p.stage} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 800, marginTop: 8, textDecoration: p.stage === "فروخته شد" ? "line-through" : "none" }}>{p.title}</h3>
        <p style={{ fontSize: 20, fontWeight: 800, color: c.primary, marginTop: 4 }}>{fmtToman(p.price)}</p>
        <p style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{fmtToman(p.pricePerMeter)} در هر متر · {faDigits(p.area)} متر</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <InfoChip c={c} icon={Ruler} label={`${faDigits(p.area)} متر`} />
          <InfoChip c={c} icon={typeIcon(p.type)} label={p.type} />
          <InfoChip c={c} icon={Home} label={`${faDigits(p.rooms)} خواب`} />
          {p.floor != null && <InfoChip c={c} icon={Building} label={`طبقه ${faDigits(p.floor)}`} />}
          {p.furnished && <InfoChip c={c} icon={BadgeCheck} label={p.furnished} />}
        </div>
        <div className="flex items-center gap-1.5 mt-3" style={{ color: c.muted, fontSize: 12.5 }}><MapPin size={13} /> {p.address}</div>
        {owner && <OwnerReveal c={c} owner={owner} />}
        {builder && <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}><Hammer size={13} /> سازنده: {builder.name} · <span dir="ltr">{builder.phone}</span></div>}

        <div className="flex gap-2 mt-4">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, stage: s } : x))} className="press flex-1 rounded-xl py-2.5" style={{ background: p.stage === s ? c.primary : c.surface2, color: p.stage === s ? "#fff" : c.muted, fontWeight: 700, fontSize: 10.5 }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={glass(c, 24)}>
        <div className="flex items-center justify-between mb-2.5">
          <p style={{ fontSize: 13, fontWeight: 700 }}>معرفی برای مشتری</p>
          <button onClick={generateAd} disabled={aiLoading} className="press flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontSize: 11.5, fontWeight: 700 }}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {aiLoading ? "در حال نوشتن..." : "نوشتن با AI"}
          </button>
        </div>
        <textarea value={adText} onChange={(e) => setAdText(e.target.value)} placeholder="یک متن گرم برای نشان‌دادن به مشتری بنویس، یا با دکمه‌ی بالا بگذار AI بنویسد..."
          rows={5} style={{ width: "100%", background: c.surface2, border: "none", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.9, color: c.ink, outline: "none", fontFamily: "inherit", resize: "vertical" }} />
        <button onClick={() => { setProperties((prev) => prev.map((x) => x.id === id ? { ...x, desc: adText } : x)); notify("آگهی ذخیره شد"); }}
          className="press w-full mt-2 rounded-xl py-2.5" style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 12.5 }}>ذخیره آگهی</button>
      </div>

      {p.deal === "پیش‌فروش" && (p.preDown || p.preDelivery || p.preDeed || p.preMonths) && (
        <div className="rounded-2xl p-4 mb-3" style={{ ...glass(c, 22), background: `linear-gradient(160deg, ${c.purpleSoft}, ${c.surface} 60%)` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Hammer size={14} color={c.purple} /><p style={{ fontSize: 12.5, fontWeight: 700 }}>شرایط پیش‌فروش</p></div>
            {p.buildStage && <span style={{ fontSize: 10, fontWeight: 700, color: c.purple, background: c.purpleSoft, padding: "3px 9px", borderRadius: 999 }}>{p.buildStage}</span>}
          </div>
          <Row c={c} label="پرداخت اولیه" value={`${fmtToman(p.preDown)}${p.price ? ` (${faDigits(Math.round((p.preDown / p.price) * 1000) / 10)}%)` : ""}`} color={c.success} />
          <Row c={c} label="موقع تحویل" value={`${fmtToman(p.preDelivery)}${p.price ? ` (${faDigits(Math.round((p.preDelivery / p.price) * 1000) / 10)}%)` : ""}`} color={c.primary} />
          <Row c={c} label="موقع سند" value={`${fmtToman(p.preDeed)}${p.price ? ` (${faDigits(Math.round((p.preDeed / p.price) * 1000) / 10)}%)` : ""}`} color={c.purple} />
          {p.preMonths > 0 && <Row c={c} label="زمان تحویل" value={`${faDigits(p.preMonths)} ماه`} />}
        </div>
      )}

      {p.lat && p.lng && <PropertyMiniMap c={c} lat={p.lat} lng={p.lng} title={p.title} />}

      <SectionHeader c={c} title="بازدیدهای این فایل" />
      <div className="flex flex-col gap-2 mb-6">
        {propAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} />)}
        {propAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

function CustomerNoteBox({ c, note, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(note || "");
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ ...glass(c, 24), border: `1px solid ${c.attn}33` }}>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.sm }}>
        <div className="flex items-center" style={{ gap: SP.xs }}><StickyNote size={14} color={c.attn} /><p style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.attn }}>یادداشت آخرین تماس</p></div>
        {!editing && <button onClick={() => { setVal(note || ""); setEditing(true); }} style={{ fontSize: FS.caption, color: c.muted }}>ویرایش</button>}
      </div>
      {editing ? (
        <>
          <textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder="آخرین بار چی بهش گفتیم..." style={{ ...inputStyle(c), minHeight: 70, resize: "none", lineHeight: 1.8 }} />
          <div className="flex" style={{ gap: SP.sm, marginTop: SP.sm }}>
            <button onClick={() => setEditing(false)} className="press flex-1 rounded-xl" style={{ paddingBlock: 8, background: c.surface2, fontSize: FS.caption, fontWeight: FW.bold, color: c.muted }}>لغو</button>
            <button onClick={() => { onSave(val.trim()); setEditing(false); }} className="press flex-1 rounded-xl" style={{ paddingBlock: 8, background: c.attn, fontSize: FS.caption, fontWeight: FW.bold, color: "#fff" }}>ذخیره</button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: FS.body, color: note ? c.ink : c.muted, lineHeight: 1.8 }}>{note || "یادداشتی ثبت نشده — بزن «ویرایش»"}</p>
      )}
    </div>
  );
}

function CustomerDetail({ id, ctx, onBack }) {
  const { c, customers, calls, appointments, setSheet } = ctx;
  const cu = customers.find((x) => x.id === id);
  if (!cu) return null;
  const custCalls = calls.filter((cl) => cl.customerId === id || cl.customerName === cu.name);
  const custAppts = appointments.filter((a) => a.customerId === id || a.customerName === cu.name);
  return (
    <div className="pt-2">
      <BackHeader c={c} title="جزئیات مشتری" onBack={onBack} onDelete={() => { ctx.setCustomers((prev) => prev.filter((x) => x.id !== id)); onBack(); ctx.notify("مشتری حذف شد"); }} />
      <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c, 24)}>
        <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: c.primarySoft }}><UserCircle2 size={26} color={c.primary} /></div>
        <div className="flex-1"><p style={{ fontSize: 16, fontWeight: 800 }}>{cu.name}</p><p style={{ fontSize: 12.5, color: c.muted }} dir="ltr">{cu.phone}</p></div>
        {cu.phone && (
          <a href={`tel:${cu.phone}`} onClick={() => ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, lastContactAt: todayISO() } : x))} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={18} color={c.success} /></a>
        )}
      </div>

      {/* Stage — tap to change */}
      <div className="mb-3">
        <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm, paddingRight: 2 }}>مرحله مشتری</p>
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {CUSTOMER_STAGES.map((st) => { const active = (cu.stage || "در حال بررسی") === st; const col = CUSTOMER_STAGE_COLOR(c)[st]; return (
            <button key={st} onClick={() => ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, stage: st } : x))} className="press rounded-full" style={{ padding: `6px ${SP.md}px`, fontSize: FS.caption, fontWeight: FW.bold, background: active ? col : c.surface2, color: active ? "#fff" : c.muted }}>{st}</button>
          ); })}
        </div>
      </div>
      <button onClick={() => setSheet({ kind: "messages", customerId: id })} className="press w-full rounded-xl p-3.5 mb-3 flex items-center gap-2.5" style={{ background: c.primarySoft }}>
        <MessageSquare size={16} color={c.primary} /><span style={{ fontSize: 12.5, fontWeight: 700, color: c.primary }}>پیام آماده برای این مشتری</span>
      </button>
      <CustomerNoteBox c={c} note={cu.lastCallNote} onSave={(text) => ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, lastCallNote: text, lastContactAt: todayISO() } : x))} />
      <div className="rounded-2xl p-4 mb-3" style={glass(c, 24)}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>نیاز مشتری</p><p style={{ fontSize: 13.5 }}>{cu.need}</p>
        <p style={{ fontSize: 12, color: c.muted, marginTop: 10, marginBottom: 4 }}>بودجه</p><p style={{ fontSize: 13.5, fontWeight: 700, color: c.primary }}>{fmtToman(cu.budget)}</p>
      </div>
      <SectionHeader c={c} title="تاریخچه تماس" />
      <div className="flex flex-col gap-2 mb-4">
        {custCalls.map((cl) => <div key={cl.id} className="rounded-lg p-3 flex items-center justify-between" style={glass(c, 20)}><span style={{ fontSize: 12 }}>{cl.notes}</span><span style={{ fontSize: 11, color: c.muted }}>{fmtJalali(cl.date)}</span></div>)}
        {custCalls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <SectionHeader c={c} title="بازدیدهای برنامه‌ریزی‌شده" />
      <div className="flex flex-col gap-2 mb-6">
        {custAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} />)}
        {custAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

// ---------- AI Sales Copilot ----------
const phoneOf = (customers, name) => { const m = customers.find((cu) => cu.name.trim() === String(name || "").trim()); return m?.phone || ""; };
const waLink = (phone, text) => { if (!phone) return null; const digits = phone.replace(/\D/g, "").replace(/^0/, "98"); return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`; };
const smsLink = (phone, text) => (phone ? `sms:${phone}${text ? `?body=${encodeURIComponent(text)}` : ""}` : null);
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

function QuickContactRow({ c, name, phone, note }) {
  return (
    <div className="rounded-lg p-3 flex items-center gap-2.5" style={glass(c, 22)}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><UserCircle2 size={15} color={c.primary} /></div>
      <div className="flex-1 min-w-0"><p style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</p>{note && <p style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>{note}</p>}</div>
      {phone && (
        <div className="flex items-center gap-1.5 shrink-0">
          <a href={`tel:${phone}`} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.successSoft }}><PhoneCall size={12} color={c.success} /></a>
          <a href={waLink(phone, note)} target="_blank" rel="noreferrer" className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.primarySoft }}><MessageSquare size={12} color={c.primary} /></a>
        </div>
      )}
    </div>
  );
}

function greetingPhrase() {
  const h = new Date().getHours();
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  if (h < 20) return "عصر بخیر";
  return "شب بخیر";
}
const HEAT_STYLE = { hot: { label: "داغ" }, warm: { label: "متوسط" }, cold: { label: "سرد" } };

// The daily targets a real-estate agent works toward. Editable, and progress is
// saved per-day so ticking things off survives closing the app.
const DEFAULT_MISSION = [
  { id: "newfiles", icon: "residential", label: "ثبت فایل جدید", target: 2 },
  { id: "ownercalls", icon: "handover", label: "تماس با مالک", target: 12 },
  { id: "visits", icon: "location", label: "انجام بازدید", target: 2 },
  { id: "stories", icon: "window", label: "انتشار استوری", target: 3 },
  { id: "renew", icon: "investment", label: "تمدید آگهی دیوار", target: 4 },
  { id: "buyers", icon: "monogram", label: "پیگیری خریدار", target: 5 },
  { id: "contract", icon: "deed", label: "ثبت قرارداد", target: 1 },
];
const MISSION_ICONS = { newfiles: "residential", ownercalls: "handover", visits: "location", stories: "window", renew: "investment", buyers: "monogram", contract: "deed" };

// Builds today's targets from the agent's real numbers when AI isn't available,
// so the mission still adapts to their actual situation.
function smartMission(ctx) {
  const { customers, calls, appointments, properties } = ctx;
  const active = properties.filter((p) => p.stage !== "فروخته شد");
  const staleCustomers = customers.filter((cu) => {
    const last = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
    return !last || daysSince(last.date) >= 3;
  }).length;
  const sleeping = active.filter((p) => p.createdAt && daysSince(p.createdAt) >= 20).length;
  const visitsToday = appointments.filter((a) => a.date === todayISO()).length;
  return [
    { id: "newfiles", label: "ثبت فایل جدید", target: active.length < 10 ? 3 : 2 },
    { id: "ownercalls", label: "تماس با مالک", target: 12 },
    { id: "visits", label: "انجام بازدید", target: Math.max(1, visitsToday) },
    { id: "stories", label: "انتشار استوری", target: 3 },
    { id: "renew", label: "تمدید آگهی دیوار", target: Math.max(2, Math.min(6, sleeping)) },
    { id: "buyers", label: "پیگیری خریدار", target: Math.max(3, Math.min(8, staleCustomers)) },
    { id: "contract", label: "ثبت قرارداد", target: 1 },
  ].map((m) => ({ ...m, icon: MISSION_ICONS[m.id] || "residential" }));
}

function MissionOfTheDay({ ctx }) {
  const { c, notify, hasAiKey, callAI, agentName } = ctx;
  const [mission, setMission] = useState(null); // { date, items, coach, source }
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState({ count: 0, lastDate: "" });
  const [poppedId, setPoppedId] = useState(null); // brief bounce animation on the item just completed

  useEffect(() => { (async () => { try { const s = await dbGet(STREAK_KEY); if (s) setStreak(s); } catch (e) {} })(); }, []);

  useEffect(() => { (async () => {
    try {
      const saved = await dbGet(MISSION_KEY);
      if (saved?.date === todayISO()) { setMission(saved); return; }
    } catch (e) {}
    // fresh day: smart deterministic targets until AI is asked
    const items = smartMission(ctx).map((m) => ({ ...m, done: 0 }));
    setMission({ date: todayISO(), items, coach: "", source: "auto" });
  })(); }, []); // eslint-disable-line

  const persist = (next) => { setMission(next); dbSet(MISSION_KEY, next).catch(() => {}); };

  const askAI = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); return; }
    setLoading(true);
    try {
      const { customers, calls, appointments, properties, deals } = ctx;
      const active = properties.filter((p) => p.stage !== "فروخته شد");
      const staleCustomers = customers.filter((cu) => {
        const last = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
        return !last || daysSince(last.date) >= 3;
      }).length;
      const sleeping = active.filter((p) => p.createdAt && daysSince(p.createdAt) >= 20).length;
      const visitsToday = appointments.filter((a) => a.date === todayISO()).length;
      const newToday = properties.filter((p) => (p.createdAt || "").slice(0, 10) === todayISO()).length;
      const weekStart = daysAgoISO(new Date().getDay());
      const dealsThisWeek = (deals || []).filter((d) => (d.createdAt || "") >= weekStart).length;
      const filesThisWeek = properties.filter((p) => (p.createdAt || "") >= weekStart).length;

      const prompt = `تو مشاور و مدیر فروش شخصی یک مشاور املاک ایرانی به اسم ${agentName || "مشاور"} هستی. بر اساس وضعیت واقعی امروزِ او، «ماموریت امروز» را تعیین کن — یعنی برای هر کار، عدد هدفِ منطقی امروز را مشخص کن. لحن جمله‌ات صمیمی و انگیزشی است.
وضعیت واقعی:
- فایل‌های فعال: ${active.length}
- فایل ثبت‌شده امروز: ${newToday}
- مشتریان پیگیری‌نشده (۳+ روز): ${staleCustomers}
- فایل‌های خواب‌رفته (۲۰+ روز): ${sleeping}
- بازدید امروز: ${visitsToday}
- این هفته: ${filesThisWeek} فایل، ${dealsThisWeek} قرارداد

دقیقاً JSON خام برگردان (بدون توضیح، بدون markdown):
{"coach":"یک تا دو جمله‌ی صمیمی خطاب به ${agentName || "مشاور"} که بگوید امروز روی چه چیزی تمرکز کند و چرا","targets":{"newfiles":عدد,"ownercalls":عدد,"visits":عدد,"stories":عدد,"renew":عدد,"buyers":عدد,"contract":عدد}}
اعداد باید بر اساس وضعیت بالا واقع‌بینانه باشند (مثلاً اگر مشتری پیگیری‌نشده زیاد است، عدد پیگیری خریدار بیشتر شود). عددی خارج از توان یک روز نگذار.`;
      const text = await callAI(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const t = parsed.targets || {};
      const items = DEFAULT_MISSION.map((m) => ({
        id: m.id, icon: m.icon, label: m.label,
        target: Math.max(1, Number(t[m.id]) || m.target),
        done: mission?.items.find((x) => x.id === m.id)?.done || 0,
      }));
      persist({ date: todayISO(), items, coach: parsed.coach || "", source: "ai" });
      notify("ماموریت امروز توسط مشاور هوشمند تنظیم شد");
    } catch (e) {
      if (e instanceof SyntaxError) notify("پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن");
      else notify(`خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  if (!mission) return null;
  const totalTarget = mission.items.reduce((s, m) => s + m.target, 0);
  const totalDone = mission.items.reduce((s, m) => s + Math.min(m.done, m.target), 0);
  const pct = totalTarget ? Math.round((totalDone / totalTarget) * 100) : 0;

  const bump = (id, delta) => {
    const nextItems = mission.items.map((m) => m.id === id ? { ...m, done: Math.max(0, Math.min(m.target, m.done + delta)) } : m);
    persist({ ...mission, items: nextItems });
    const item = nextItems.find((m) => m.id === id);
    if (delta > 0) {
      setPoppedId(id); setTimeout(() => setPoppedId(null), 420);
      if (item.done >= item.target) notify(`${item.label} تکمیل شد`);
    }
    // whole-mission streak — counts once per day, only when every target is hit
    const allDone = nextItems.every((m) => m.done >= m.target);
    if (allDone && streak.lastDate !== todayISO()) {
      const yesterday = daysAgoISO(1).slice(0, 10);
      const nextCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
      const next = { count: nextCount, lastDate: todayISO() };
      setStreak(next); dbSet(STREAK_KEY, next).catch(() => {});
      notify(nextCount > 1 ? `${faDigits(nextCount)} روز متوالی — همه‌ی اهداف زده شد` : "همه‌ی اهداف امروز زده شد");
    }
  };
  const setTarget = (id, t) => persist({ ...mission, items: mission.items.map((m) => m.id === id ? { ...m, target: Math.max(1, Number(toEnDigits(String(t))) || 1) } : m) });

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c, 24), position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -16, left: -12, opacity: 0.08, pointerEvents: "none" }}><FloraMark size={110} color={c.ink} /></div>
      <div className="flex items-center justify-between mb-3" style={{ position: "relative" }}>
        <div className="flex items-center gap-2">
          <span style={{ width: 9, height: 9, borderRadius: 99, background: pct >= 100 ? c.success : c.primary }} className={pct < 100 ? "flora-pulse" : ""} />
          <p style={{ fontSize: 14, fontWeight: 800 }}>ماموریت امروز</p>
          {streak.count > 1 && (
            <span className="flex items-center" style={{ gap: 3, fontSize: 10.5, fontWeight: 800, color: c.attn, background: c.attnSoft, padding: "2px 8px", borderRadius: RAD.pill }}>
              <Flame size={11} color={c.attn} />{faDigits(streak.count)} روز
            </span>
          )}
        </div>
        <button onClick={() => setEditing((e) => !e)} className="press rounded-lg px-2.5 py-1.5 flex items-center gap-1" style={{ background: c.surface2 }}>
          <Edit3 size={11} color={c.muted} /><span style={{ fontSize: 10, fontWeight: 700, color: c.muted }}>{editing ? "تمام" : "اهداف"}</span>
        </button>
      </div>

      {/* progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ flex: 1, height: 8, borderRadius: 6, background: c.surface2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 6, background: pct >= 100 ? c.success : "linear-gradient(90deg,#2f7cf6,#7c6ff5)", transition: "width .5s cubic-bezier(.34,1.3,.64,1)" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: pct >= 100 ? c.success : c.primary }}>{faDigits(pct)}%</span>
      </div>
      {pct >= 100 && <p style={{ fontSize: 11, color: c.success, fontWeight: 700, marginBottom: 10 }}>آفرین! همه‌ی اهداف امروز را زدی</p>}

      {/* AI coach message */}
      {mission.coach && (
        <div className="rounded-xl p-3 mb-3 flex items-start gap-2.5" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)" }}>
          <Bot size={16} color="#fff" className="shrink-0" style={{ marginTop: 1 }} />
          <p style={{ fontSize: 11.5, color: "#fff", lineHeight: 1.85, fontWeight: 500 }}>{mission.coach}</p>
        </div>
      )}

      {/* Ask the AI advisor to set today's targets */}
      <button onClick={askAI} disabled={loading} className="press w-full rounded-xl py-2.5 mb-3 flex items-center justify-center gap-1.5" style={{ background: mission.source === "ai" ? c.surface2 : c.primarySoft }}>
        {loading ? <Loader2 size={13} className="animate-spin" color={c.primary} /> : <Sparkles size={13} color={c.primary} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>{loading ? "مشاور در حال تنظیم ماموریت..." : mission.source === "ai" ? "به‌روزرسانی ماموریت با مشاور" : "بگذار مشاور هوشمند ماموریت امروزت را بچیند"}</span>
      </button>

      <div className="flex flex-col gap-2">
        {mission.items.map((m) => {
          const complete = m.done >= m.target;
          return (
            <div key={m.id} className={`rounded-xl p-3 flex items-center gap-3 ${poppedId === m.id ? "flora-pop" : ""}`} style={{ background: complete ? c.successSoft : c.surface2, transition: "background .4s ease" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: complete ? c.successSoft : c.primarySoft }}>
                {floraIcon(m.icon, { size: 20, color: complete ? c.success : c.primary })}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12.5, fontWeight: 700, textDecoration: complete ? "line-through" : "none", color: complete ? c.muted : c.ink }}>{m.label}</p>
                {editing ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span style={{ fontSize: 10, color: c.muted }}>هدف:</span>
                    <input inputMode="numeric" value={m.target} onChange={(e) => setTarget(m.id, e.target.value)} style={{ width: 46, textAlign: "center", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: "3px 4px", fontSize: 11, color: c.ink }} />
                  </div>
                ) : (
                  <p style={{ fontSize: 10.5, color: c.muted }}>{faDigits(Math.min(m.done, m.target))} از {faDigits(m.target)}</p>
                )}
              </div>
              {!editing && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => bump(m.id, -1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface, color: c.muted, fontSize: 15, fontWeight: 700 }}>−</button>
                  <button onClick={() => { bump(m.id, +1); if (m.done + 1 >= m.target) notify(`${m.label} تکمیل شد ✓`); }} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: complete ? c.success : c.primary, color: "#fff", fontSize: 15, fontWeight: 700 }}>{complete ? "✓" : "+"}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Real, deterministic insights computed only from the agent's own CRM data.
// Deliberately avoids any Divar-style metrics (views/saves) that Flora can't see —
// those become "go check Divar" reminders instead of invented numbers.
function useSalesInsights(ctx) {
  const { customers, calls, appointments, properties, deals } = ctx;
  return useMemo(() => {
    const out = [];
    const today = todayISO();

    // Files registered today
    const newToday = properties.filter((p) => (p.createdAt || "").slice(0, 10) === today).length;
    if (newToday === 0) out.push({ tone: "warn", icon: "residential", text: "امروز هنوز هیچ فایل جدیدی ثبت نکرده‌ای." });

    // Customers not followed up in 3+ days
    const stale = customers.filter((cu) => {
      const last = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
      return !last || daysSince(last.date) >= 3;
    }).length;
    if (stale > 0) out.push({ tone: "warn", icon: "monogram", text: `${faDigits(stale)} مشتری بیش از ۳ روز پیگیری نشده‌اند.` });

    // Inventory gap in the 80–100m band
    const active = properties.filter((p) => p.stage !== "فروخته شد");
    const band = active.filter((p) => p.area >= 80 && p.area <= 100).length;
    if (band <= 1) out.push({ tone: "info", icon: "floorArea", text: "موجودی فایل‌های ۸۰ تا ۱۰۰ متر کم است؛ فایل جدید بگیر." });

    // Sleeping listings — remind to refresh the Divar ad (no fake view counts)
    const sleeping = active.filter((p) => p.createdAt && daysSince(p.createdAt) >= 20);
    if (sleeping.length > 0) out.push({ tone: "info", icon: "window", text: `${faDigits(sleeping.length)} فایل بیش از ۲۰ روز است تکان نخورده؛ آگهی دیوارشان را چک و در صورت نیاز تمدید کن.` });

    // This week vs recent weeks — contracts
    const weekStart = daysAgoISO(new Date().getDay());
    const dealsThisWeek = deals.filter((d) => (d.createdAt || "") >= weekStart).length;
    const prev = [];
    for (let w = 1; w <= 3; w++) {
      const s = daysAgoISO(new Date().getDay() + 7 * w);
      const e = daysAgoISO(new Date().getDay() + 7 * (w - 1));
      prev.push(deals.filter((d) => (d.createdAt || "") >= s && (d.createdAt || "") < e).length);
    }
    const avgPrev = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) : 0;
    if (dealsThisWeek === 0 && avgPrev > 0) out.push({ tone: "warn", icon: "deed", text: `این هفته هنوز قراردادی ثبت نشده، در حالی که میانگین هفته‌های اخیرت ${faDigits(avgPrev)} قرارداد بوده.` });

    // Today's visits — coordinate with owner
    const visits = appointments.filter((a) => a.date === today);
    if (visits.length > 0) {
      const first = [...visits].sort((a, b) => a.time.localeCompare(b.time))[0];
      out.push({ tone: "good", icon: "location", text: `امروز ${faDigits(visits.length)} بازدید داری؛ اولین ساعت ${first.time} — ۳۰ دقیقه قبل با مالک هماهنگ کن.` });
    }

    return out;
  }, [customers, calls, appointments, properties, deals]);
}

// Full-page call follow-up list, reached from the top-bar badge. Pending calls
// float to the top so the next action is always first.
function CallsView({ ctx, onBack }) {
  const { c, calls, setCalls, setSheet, notify } = ctx;
  const sorted = [...calls].sort((a, b) => {
    const ap = a.status === "انجام‌شد" ? 1 : 0, bp = b.status === "انجام‌شد" ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return (b.date || "").localeCompare(a.date || "");
  });
  const pending = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  return (
    <div className="pt-3 pb-6">
      <BackHeader c={c} title="پیگیری تماس‌ها" onBack={onBack} />
      <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)" }}>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}><PhoneCall size={20} color="#fff" /></div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{pending > 0 ? `${faDigits(pending)} تماس در انتظار پیگیری` : "همه پیگیری شده"}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>{faDigits(calls.length)} تماس ثبت شده</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 flora-stagger">
        {sorted.map((cl) => {
          const done = cl.status === "انجام‌شد";
          return (
            <div key={cl.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glass(c, 20)}>
              <button onClick={() => setCalls((prev) => prev.map((x) => x.id === cl.id ? { ...x, status: done ? "در انتظار پاسخ" : "انجام‌شد" } : x))} className="press shrink-0">
                <CheckCircle2 size={22} color={done ? c.success : c.attn} fill={done ? c.success : "none"} />
              </button>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 700, textDecoration: done ? "line-through" : "none", color: done ? c.muted : c.ink }}>{cl.customerName}</p>
                <p style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>{cl.notes ? `${cl.notes} · ` : ""}{fmtJalali(cl.date)}</p>
              </div>
              {cl.customerPhone && <a href={`tel:${cl.customerPhone}`} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={13} color={c.success} /></a>}
              <button onClick={() => setSheet({ kind: "call", editId: cl.id })} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={13} color={c.primary} /></button>
              <button onClick={() => { setCalls((prev) => prev.filter((x) => x.id !== cl.id)); notify("تماس حذف شد"); }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
            </div>
          );
        })}
        {calls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <button onClick={() => setSheet("call")} className="press w-full rounded-2xl py-3.5 mt-4 flex items-center justify-center gap-2" style={{ background: c.primary }}>
        <Plus size={17} color="#fff" /><span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ثبت پیگیری تماس جدید</span>
      </button>
    </div>
  );
}

function CopilotView({ ctx, onBack }) {
  const { c, customers, calls, appointments, properties, hasAiKey, callAI, notify, setSheet, agentName } = ctx;
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const insights = useSalesInsights(ctx);

  useEffect(() => { (async () => {
    try { const cached = await dbGet(COPILOT_KEY); if (cached?.date === todayISO()) setPlan(cached.data); } catch (e) {}
  })(); }, []);

  const overdue = useMemo(() => {
    return customers.map((cu) => {
      const lastCall = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
      const days = lastCall ? daysSince(lastCall.date) : null;
      return { cu, days };
    }).filter((x) => x.days === null || x.days >= 5).sort((a, b) => (b.days ?? 999) - (a.days ?? 999));
  }, [customers, calls]);

  const sleeping = useMemo(() => {
    return properties.filter((p) => p.stage !== "فروخته شد" && p.createdAt && daysSince(p.createdAt) >= 30).sort((a, b) => daysSince(b.createdAt) - daysSince(a.createdAt));
  }, [properties]);

  const todayTimeline = useMemo(() => {
    const items = [
      ...appointments.filter((a) => a.date === todayISO()).map((a) => ({ time: a.time, label: `بازدید: ${properties.find((p) => p.id === a.propertyId)?.title || a.customerName || ""}`, sub: a.customerName })),
    ];
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, properties]);

  const generatePlan = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    setLoading(true);
    try {
      const custSummary = customers.slice(0, 30).map((cu) => {
        const lastCall = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
        return `- ${cu.name} | نیاز: ${cu.need || "-"} | بودجه: ${cu.budget || 0} تومان | آخرین تماس: ${lastCall ? `${lastCall.date} (${lastCall.status}) یادداشت: ${lastCall.notes || "-"}` : "هرگز"}`;
      }).join("\n");
      const propSummary = properties.filter((p) => p.stage !== "فروخته شد").slice(0, 30).map((p) => `- ${p.title} | ${p.deal} | ${p.price} تومان | ${p.area} متر | ${p.createdAt ? `${daysSince(p.createdAt)} روز از ثبتش گذشته` : "تاریخ ثبت نامشخص"}`).join("\n");
      const recentNotes = calls.slice(0, 8).map((cl) => `- ${cl.customerName}: ${cl.notes || "-"}`).join("\n");
      const newTodayCount = properties.filter((p) => (p.createdAt || "").slice(0, 10) === todayISO()).length;
      const weekStart = daysAgoISO(new Date().getDay());
      const dealsThisWeek = (ctx.deals || []).filter((d) => (d.createdAt || "") >= weekStart).length;
      const filesThisWeek = properties.filter((p) => (p.createdAt || "") >= weekStart).length;
      const perfLine = `این هفته تا الان: ${filesThisWeek} فایل جدید، ${dealsThisWeek} قرارداد. امروز ${newTodayCount} فایل ثبت شده.`;
      const prompt = `تو دستیار و مربی فروش شخصی یک مشاور املاک ایرانی به اسم ${agentName || "مشاور"} هستی — مثل یک مدیر فروش باتجربه که هم برنامه می‌دهد هم انگیزه. لحنت صمیمی و مستقیم است، نه رسمی و رباتیک. بر اساس اطلاعات زیر یک برنامه‌ی عملیاتی امروز بساز و دقیقاً به‌صورت JSON خام (بدون توضیح، بدون markdown fence) با این ساختار برگردان:
{"greeting":"یک جمله‌ی کوتاه و انگیزشی درباره‌ی وضعیت امروز و این هفته، خطاب به ${agentName || "مشاور"}","biggestRisk":"مهم‌ترین ریسک امروز در یک جمله، یا خالی","priorities":[{"rank":1,"customer":"نام دقیق از لیست","action":"چیکار بکنه","reason":"چرا","suggestedTime":"HH:MM","message":"پیام پیشنهادی کوتاه فارسی"}],"sleepingSuggestions":[{"property":"عنوان دقیق از لیست","suggestion":"چه کاری بکنه"}],"hotLeads":[{"customer":"نام","heat":"hot یا warm","reason":"چرا"}],"atRiskLeads":[{"customer":"نام","reason":"چرا"}],"coachTip":"یک نکته‌ی مربی‌گری کوتاه؛ اگر عملکرد این هفته از میانگین کمتر است، با لحن انگیزشی تشویق به جبران کن"}
هر آرایه حداکثر ۴ مورد. اعداد بازدید/ذخیره/احتمال دقیق اختراع نکن (این داده‌ها را نداری). نام مشتری/عنوان فایل را دقیقاً از لیست‌های زیر انتخاب کن.

عملکرد: ${perfLine}

مشتریان:
${custSummary || "موردی ثبت نشده"}

فایل‌های فعال:
${propSummary || "موردی ثبت نشده"}

یادداشت‌های چند تماس اخیر:
${recentNotes || "موردی ثبت نشده"}`;
      const text = await callAI(prompt);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setPlan(parsed);
      dbSet(COPILOT_KEY, { date: todayISO(), data: parsed }).catch(() => {});
    } catch (e) {
      if (e instanceof SyntaxError) notify("پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن");
      else notify(`خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  const Section = ({ icon: Icon, color, title, items, render }) => items && items.length > 0 && (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2"><Icon size={15} color={color} /><p style={{ fontSize: 13, fontWeight: 700 }}>{title}</p></div>
      <div className="flex flex-col gap-2">{items.map((it, i) => render(it, i))}</div>
    </div>
  );

  return (
    <div className="pt-2">
      <BackHeader c={c} title="برنامه‌ی امروز" onBack={onBack} />

      <div style={{ marginBottom: SP.lg, paddingInline: SP.xs }}>
        <h1 style={{ fontSize: FS.hero, fontWeight: FW.heavy, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{greetingPhrase()}{agentName ? `، ${agentName}` : ""}</h1>
        <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.sm, lineHeight: 1.6 }}>
          {plan?.greeting || `${faDigits(overdue.length)} پیگیری و ${faDigits(sleeping.length)} فایل خواب‌رفته داری.`}
        </p>
      </div>

      <MissionOfTheDay ctx={ctx} />

      {insights.length > 0 && (
        <div style={{ marginBottom: SP.lg }}>
          <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em", marginBottom: SP.md, paddingRight: 2 }}>نگاه مدیر فروش</h2>
          <div className="flex flex-col flora-stagger" style={{ gap: SP.sm }}>
            {insights.map((it, i) => {
              const tint = it.tone === "warn" ? c.attn : it.tone === "good" ? c.success : c.primary;
              const soft = it.tone === "warn" ? c.attnSoft : it.tone === "good" ? c.successSoft : c.primarySoft;
              return (
                <div key={i} className="flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, ...glass(c, 20) }}>
                  <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: RAD.sm, background: soft }}>
                    {floraIcon(it.icon, { size: 19, color: tint })}
                  </div>
                  <p style={{ fontSize: FS.caption + 0.5, color: c.ink, lineHeight: 1.8, fontWeight: FW.regular }}>{it.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {plan?.biggestRisk && (
        <div className="rounded-xl p-3.5 mb-4 flex items-center gap-2.5" style={{ background: c.dangerSoft }}>
          <AlertTriangle size={16} color={c.danger} className="shrink-0" />
          <p style={{ fontSize: 12, color: c.danger, fontWeight: 600, lineHeight: 1.8 }}>{plan.biggestRisk}</p>
        </div>
      )}

      {todayTimeline.length > 0 && (
        <>
          <SectionHeader c={c} title="برنامه‌ی زمانی امروز" />
          <div className="flex flex-col gap-2 mb-2">
            {todayTimeline.map((it, i) => (
              <div key={i} className="rounded-lg p-3 flex items-center gap-2.5" style={glass(c, 22)}>
                <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 44, height: 32, background: c.primarySoft }}><span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>{it.time}</span></div>
                <p style={{ fontSize: 12, fontWeight: 600 }}>{it.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeader c={c} title="پیگیری‌های عقب‌افتاده" />
      <div className="flex flex-col gap-2 mb-2">
        {overdue.slice(0, 6).map(({ cu, days }) => (
          <QuickContactRow key={cu.id} c={c} name={cu.name} phone={cu.phone} note={days === null ? "هنوز هیچ تماسی ثبت نشده" : `${faDigits(days)} روز از آخرین تماس گذشته`} />
        ))}
        {overdue.length === 0 && <EmptyLine c={c} text="همه‌ی مشتریان اخیراً پیگیری شده‌اند" />}
      </div>

      <button onClick={generatePlan} disabled={loading} className="press w-full rounded-xl py-3 my-4 flex items-center justify-center gap-2" style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {loading ? "در حال تحلیل..." : plan ? "به‌روزرسانی برنامه" : "ساخت برنامه‌ی امروز با AI"}
      </button>

      {plan && (
        <>
          <Section icon={TrendingUp} color={c.primary} title="اولویت‌های امروز" items={plan.priorities} render={(it, i) => {
            const phone = phoneOf(customers, it.customer);
            return (
              <div key={i} className="rounded-lg p-3" style={glass(c, 22)}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: c.primary, color: "#fff", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{faDigits(it.rank || i + 1)}</span>
                  <p style={{ fontSize: 12.5, fontWeight: 700 }}>{it.customer}</p>
                  {it.suggestedTime && <span style={{ fontSize: 10, color: c.muted, marginRight: "auto" }}>⏱ {it.suggestedTime}</span>}
                </div>
                <p style={{ fontSize: 11.5, color: c.ink, marginBottom: 2 }}>{it.action}</p>
                <p style={{ fontSize: 10.5, color: c.muted, marginBottom: 8 }}>{it.reason}</p>
                {phone && (
                  <div className="flex gap-2">
                    <a href={`tel:${phone}`} className="press flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5" style={{ background: c.successSoft }}><PhoneCall size={12} color={c.success} /><span style={{ fontSize: 11, fontWeight: 700, color: c.success }}>تماس</span></a>
                    <a href={waLink(phone, it.message) || "#"} target="_blank" rel="noreferrer" className="press flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5" style={{ background: c.primarySoft }}><Send size={12} color={c.primary} /><span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>پیام</span></a>
                  </div>
                )}
              </div>
            );
          }} />

          <Section icon={Building2} color={c.attn} title="فایل‌های خواب‌رفته" items={sleeping.slice(0, 6)} render={(p, i) => {
            const sug = plan.sleepingSuggestions?.find((s) => s.property === p.title);
            return (
              <div key={p.id} className="rounded-lg p-3" style={glass(c, 22)}>
                <p style={{ fontSize: 12.5, fontWeight: 700 }}>{p.title}</p>
                <p style={{ fontSize: 10.5, color: c.attn, fontWeight: 700, marginTop: 2 }}>{faDigits(daysSince(p.createdAt))} روز است فروش/اجاره نرفته</p>
                {sug && <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{sug.suggestion}</p>}
              </div>
            );
          }} />

          <Section icon={TrendingUp} color={c.success} title="مشتریان داغ" items={plan.hotLeads} render={(it, i) => (
            <div key={i} className="rounded-lg p-3 flex items-center justify-between" style={glass(c, 22)}>
              <div><p style={{ fontSize: 12.5, fontWeight: 700 }}>{it.customer}</p><p style={{ fontSize: 10.5, color: c.muted, marginTop: 2 }}>{it.reason}</p></div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: c.success, background: c.successSoft, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{HEAT_STYLE[it.heat]?.label || HEAT_STYLE.warm.label}</span>
            </div>
          )} />
          <Section icon={AlertTriangle} color={c.danger} title="در خطر از دست رفتن" items={plan.atRiskLeads} render={(it, i) => (
            <div key={i} className="rounded-lg p-3" style={glass(c, 22)}><p style={{ fontSize: 12.5, fontWeight: 700, color: c.danger }}>{it.customer}</p><p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{it.reason}</p></div>
          )} />

          {plan.coachTip && (
            <div className="rounded-xl p-3.5 mb-4" style={{ background: c.primarySoft }}>
              <div className="flex items-center gap-2 mb-1.5"><Bot size={14} color={c.primary} /><p style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>نکته‌ی مربی فروش</p></div>
              <p style={{ fontSize: 11.5, color: c.ink, lineHeight: 1.9 }}>{plan.coachTip}</p>
            </div>
          )}
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

// ---------- AI Chat assistant ----------
function AiChatView({ ctx, onBack }) {
  const { c, hasAiKey, callAI, notify, setSheet, properties, customers, calls, appointments, deals } = ctx;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { (async () => {
    try { const saved = await dbGet(CHAT_KEY); if (saved?.messages) setMessages(saved.messages); } catch (e) {}
    setLoadedHistory(true);
  })(); }, []);
  useEffect(() => { if (loadedHistory) dbSet(CHAT_KEY, { messages }).catch(() => {}); }, [loadedHistory, messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    const history = [...messages, { role: "user", text: q }];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const transcript = history.slice(-12).map((m) => `${m.role === "user" ? "مشاور" : "دستیار"}: ${m.text}`).join("\n");
      // Real office context, so it can actually answer "چند فایل فعال دارم" or
      // "کدام مشتری بیشترین بودجه را دارد" — not just generic real-estate advice.
      const officeContext = `فایل‌های فعال: ${properties.filter((p) => p.stage !== "فروخته شد").length} | کل فایل‌ها: ${properties.length}
مشتریان: ${customers.length}
تماس‌های در انتظار پیگیری: ${calls.filter((cl) => cl.status !== "انجام‌شد").length}
بازدیدهای ثبت‌شده: ${appointments.length}
معاملات: ${deals?.length || 0}
چند فایل نمونه: ${properties.slice(0, 15).map((p) => `${p.title} (${fmtToman(p.price)}, ${p.stage})`).join(" | ") || "—"}
چند مشتری نمونه: ${customers.slice(0, 15).map((cu) => `${cu.name} (بودجه ${fmtBudgetShort(cu.budget)}, ${cu.stage || "نامشخص"})`).join(" | ") || "—"}`;
      const prompt = `تو یک دستیار متخصص و باتجربه در حوزه‌ی املاک و مستغلات هستی — هم آشنا با بازار مسکن ایران و هم اصول حرفه‌ای مشاوره‌ی املاک در سطح جهانی (قیمت‌گذاری، مذاکره، بازاریابی، حقوقی، سرمایه‌گذاری). به فارسی، دقیق، کاربردی و مختصر پاسخ بده. اگر سوال خارج از حوزه‌ی املاک بود هم به بهترین شکل کمک کن.

اطلاعات واقعی دفتر مشاور (اگر سوال درباره‌ی فایل‌ها، مشتری‌ها یا وضعیت خودش بود، از همین داده استفاده کن، حدس نزن):
${officeContext}

گفتگوی تا این لحظه:
${transcript}

فقط پاسخ دستیار به آخرین پیام را بنویس، بدون تکرار سوال.`;
      const reply = await callAI(prompt);
      setMessages((prev) => [...prev, { role: "assistant", text: reply.trim() }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `خطا: ${e.message || "نامشخص"}` }]);
    }
    setSending(false);
  };

  return (
    <div className="pt-2 flex flex-col" style={{ height: "calc(100vh - 90px)" }}>
      <BackHeader c={c} title="چت با دستیار املاک" onBack={onBack} onDelete={messages.length > 0 ? () => { setMessages([]); dbSet(CHAT_KEY, { messages: [] }).catch(() => {}); notify("تاریخچه‌ی گفتگو پاک شد"); } : undefined} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-3">
        {messages.length === 0 && (
          <div className="rounded-xl p-4" style={glass(c, 22)}>
            <p style={{ fontSize: 12.5, color: c.muted, lineHeight: 1.9 }}>هر سوالی درباره‌ی قیمت‌گذاری، مذاکره، بازاریابی فایل، یا هر موضوع دیگری در حوزه‌ی املاک بپرس.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 ${m.role === "user" ? "self-end" : "self-start"}`} style={{ ...glass(c, 20), maxWidth: "85%", background: m.role === "user" ? c.primary : c.surface }}>
            <p style={{ fontSize: 12.5, lineHeight: 1.9, color: m.role === "user" ? "#fff" : c.ink, whiteSpace: "pre-wrap" }}>{m.text}</p>
          </div>
        ))}
        {sending && <div className="self-start rounded-xl p-3" style={glass(c, 20)}><Loader2 size={14} className="animate-spin" color={c.primary} /></div>}
      </div>
      <div className="flex items-center gap-2 pt-2 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="سوالت را بپرس..." style={{ ...inputStyle(c), flex: 1 }} />
        <button onClick={send} disabled={sending || !input.trim()} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primary, opacity: sending || !input.trim() ? 0.5 : 1 }}><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}

// ---------- Finance Center ----------
// Official Iranian real-estate commission formula (per the office's standard):
// first 1 billion toman → flat 10M; anything above → +0.5% of the excess; then +10% tax.
// Returns the full breakdown so the UI can show every line.
function officialCommission(price) {
  const BASE_CAP = 1_000_000_000;
  const BASE_FEE = 10_000_000;
  const p = Math.max(0, Math.round(price || 0));
  const excess = p > BASE_CAP ? p - BASE_CAP : 0;
  const commission = BASE_FEE + Math.round(excess * 0.005);
  const tax = Math.round(commission * 0.10);
  return { price: p, excess, commission, tax, final: commission + tax };
}

const dealCommission = (deal, side) => {
  const mode = side === "seller" ? deal.sellerMode : deal.buyerMode;
  if (mode === "official") return officialCommission(deal.price).final;
  if (mode === "fixed") return (side === "seller" ? deal.sellerFixed : deal.buyerFixed) || 0;
  return Math.round((deal.price || 0) * ((side === "seller" ? deal.sellerPct : deal.buyerPct) || 0) / 100);
};
const dealPaid = (deal, payments, side) => payments.filter((p) => p.dealId === deal.id && p.payerType === side).reduce((s, p) => s + (p.amount || 0), 0);
const dealRemaining = (deal, payments, side) => Math.max(0, dealCommission(deal, side) - dealPaid(deal, payments, side));
const dealTotalCommission = (deal) => dealCommission(deal, "seller") + dealCommission(deal, "buyer");
const dealTotalPaid = (deal, payments) => dealPaid(deal, payments, "seller") + dealPaid(deal, payments, "buyer");
const dealTotalRemaining = (deal, payments) => dealRemaining(deal, payments, "seller") + dealRemaining(deal, payments, "buyer");
const dealProgress = (deal, payments) => { const t = dealTotalCommission(deal); if (!t) return 100; return Math.min(100, Math.round((dealTotalPaid(deal, payments) / t) * 100)); };
const PAYMENT_METHODS = [{ id: "card", label: "کارت", icon: CreditCard }, { id: "cash", label: "نقد", icon: Banknote }, { id: "transfer", label: "حواله", icon: Landmark }, { id: "check", label: "چک", icon: FileCheck }];
const EXPENSE_CATEGORIES = ["تبلیغات دیوار", "تبلیغات اینستاگرام", "تبلیغات گوگل", "اجاره مغازه", "حقوق کارکنان", "قبوض و اینترنت", "مالیات", "تجهیزات", "پذیرایی", "سایر"];
const INCOME_CATEGORIES = ["حق مشاوره", "درآمد تبلیغات", "خدمات حقوقی", "قرارداد اجاره", "سایر"];
const EXPENSE_COLORS = ["#5b9dff", "#a78bfa", "#f59e0b", "#ec4899", "#22c55e", "#64748b", "#ef4444", "#06b6d4", "#f472b6", "#94a3b8"];
const FIN_TABS = [
  { id: "overview", label: "نمای کلی" },
  { id: "split", label: "تقسیم کمیسیون" },
  { id: "transactions", label: "معاملات" },
  { id: "office", label: "درآمد و هزینه" },
  { id: "debtors", label: "بدهکاران" },
  { id: "reports", label: "گزارشات" },
];

// The split is always DERIVED from money actually received — never stored per payment.
// That way the books can't drift: change the ratio and every figure recomputes from the
// same source of truth (the payments list).
const SPLIT_PARTIES = [
  { id: "agent", label: "سهم من", icon: UserCircle2, color: "#22c55e" },
  { id: "management", label: "سهم مدیریت", icon: Award, color: "#7c6ff5" },
  { id: "rent", label: "اجاره دفتر", icon: Home, color: "#f59e0b" },
];
function splitAmounts(total, shares) {
  const units = SPLIT_PARTIES.map((p) => Math.max(0, Number(shares?.[p.id]) || 0));
  const sum = units.reduce((a, b) => a + b, 0);
  if (!sum) return SPLIT_PARTIES.map(() => 0);
  // Give the remainder to the largest share so the parts always add back to the total exactly.
  const raw = units.map((u) => (total * u) / sum);
  const floored = raw.map(Math.floor);
  let rem = Math.round(total - floored.reduce((a, b) => a + b, 0));
  const order = raw.map((v, i) => [v - floored[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) floored[order[k % order.length][1]] += 1;
  return floored;
}

function DealStatusBadge({ c, status }) {
  if (status === "تسویه شده") return <span style={{ fontSize: 10, fontWeight: 700, color: c.success, background: c.successSoft, padding: "4px 10px", borderRadius: 10 }}>تسویه شده</span>;
  if (status === "در حال مذاکره") return <span style={{ fontSize: 10, fontWeight: 700, color: c.primary, background: c.primarySoft, padding: "4px 10px", borderRadius: 10 }}>در حال مذاکره</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, color: c.attn, background: c.attnSoft, padding: "4px 10px", borderRadius: 10 }}>در انتظار پرداخت</span>;
}

function FinanceCenterView({ ctx, onBack }) {
  const { c, deals, payments, setPayments, setSheet, simpleMode } = ctx;
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  // In simple mode, keep only the three tabs an agent needs daily.
  const visibleTabs = FIN_TABS;
  const [statusFilter, setStatusFilter] = useState("همه");

  const totalValue = deals.reduce((s, d) => s + (d.price || 0), 0);
  const totalCommission = deals.reduce((s, d) => s + dealTotalCommission(d), 0);
  const totalPaidAll = deals.reduce((s, d) => s + dealTotalPaid(d, payments), 0);
  const totalRemainingAll = deals.reduce((s, d) => s + dealTotalRemaining(d, payments), 0);
  const todayVal = deals.filter((d) => (d.createdAt || "").slice(0, 10) === todayISO()).reduce((s, d) => s + d.price, 0);
  const [cjy, cjm] = isoToJalali(todayISO());
  const monthVal = deals.filter((d) => { const [jy, jm] = isoToJalali((d.createdAt || todayISO()).slice(0, 10)); return jy === cjy && jm === cjm; }).reduce((s, d) => s + d.price, 0);
  const yearVal = deals.filter((d) => { const [jy] = isoToJalali((d.createdAt || todayISO()).slice(0, 10)); return jy === cjy; }).reduce((s, d) => s + d.price, 0);
  const avgDeal = deals.length ? Math.round(totalValue / deals.length) : 0;

  const filteredDeals = deals.filter((d) => {
    if (statusFilter !== "همه" && d.status !== statusFilter) return false;
    if (search) { const q = search.toLowerCase(); if (![d.propertyTitle, d.sellerName, d.buyerName].some((s) => (s || "").toLowerCase().includes(q))) return false; }
    return true;
  }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const debtors = deals.flatMap((d) => {
    const out = [];
    const sr = dealRemaining(d, payments, "seller");
    const br = dealRemaining(d, payments, "buyer");
    if (sr > 0) out.push({ name: d.sellerName, phone: d.sellerPhone, amount: sr, days: daysSince(d.createdAt || todayISO()), dealTitle: d.propertyTitle });
    if (br > 0) out.push({ name: d.buyerName, phone: d.buyerPhone, amount: br, days: daysSince(d.createdAt || todayISO()), dealTitle: d.propertyTitle });
    return out;
  }).sort((a, b) => b.amount - a.amount);

  const alerts = [
    ...debtors.filter((x) => x.days >= 10).slice(0, 2).map((x) => ({ type: "red", text: `کمیسیون ${x.name} پرداخت نشده — تماس بگیرید` })),
    ...debtors.filter((x) => x.days < 10).slice(0, 1).map((x) => ({ type: "yellow", text: `معامله «${x.dealTitle}» نزدیک به موعد پرداخت است` })),
    ...deals.filter((d) => dealTotalRemaining(d, payments) === 0).slice(-1).map((d) => ({ type: "green", text: `کمیسیون ${d.propertyTitle} به‌طور کامل دریافت شد` })),
  ];

  const monthlyTotals = Array.from({ length: 6 }, (_, i) => {
    let m = cjm - 5 + i, y = cjy; if (m <= 0) { m += 12; y -= 1; }
    const val = deals.filter((d) => { const [jy, jm] = isoToJalali((d.createdAt || todayISO()).slice(0, 10)); return jy === y && jm === m; }).length;
    return { label: MONTHS_FA[m - 1].slice(0, 3), value: val };
  });
  const maxMonthly = Math.max(1, ...monthlyTotals.map((m) => m.value));

  const advisorMap = {};
  deals.forEach((d) => {
    const key = d.advisor || "بدون نام";
    if (!advisorMap[key]) advisorMap[key] = { name: key, count: 0, value: 0, commission: 0, paid: 0 };
    advisorMap[key].count += 1; advisorMap[key].value += d.price || 0;
    advisorMap[key].commission += dealTotalCommission(d); advisorMap[key].paid += dealTotalPaid(d, payments);
  });
  const advisors = Object.values(advisorMap).sort((a, b) => b.value - a.value);

  const { expenses, setExpenses, officeIncomes, setOfficeIncomes, notify } = ctx;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalOfficeIncome = officeIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const netProfit = totalOfficeIncome - totalExpenses;
  const margin = totalOfficeIncome ? Math.round((netProfit / totalOfficeIncome) * 100) : 0;

  const officeTxns = [
    ...officeIncomes.map((i) => ({ ...i, kind: "in", label: i.title })),
    ...expenses.map((e) => ({ ...e, kind: "out", label: e.title, sub: e.category })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const expenseByCategory = EXPENSE_CATEGORIES.map((cat, i) => ({
    name: cat, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const expenseCatTotal = Math.max(1, expenseByCategory.reduce((s, x) => s + x.value, 0));

  const monthlyIncomeExpense = Array.from({ length: 6 }, (_, i) => {
    let m = cjm - 5 + i, y = cjy; if (m <= 0) { m += 12; y -= 1; }
    const income = officeIncomes.filter((x) => { const [jy, jm] = isoToJalali(x.date); return jy === y && jm === m; }).reduce((s, x) => s + x.amount, 0);
    const expense = expenses.filter((x) => { const [jy, jm] = isoToJalali(x.date); return jy === y && jm === m; }).reduce((s, x) => s + x.amount, 0);
    return { label: MONTHS_FA[m - 1].slice(0, 3), income, expense };
  });
  const maxIncExp = Math.max(1, ...monthlyIncomeExpense.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className={onBack ? "pt-2" : "pt-16"}>
      {onBack && <BackHeader c={c} title="مرکز مالی" onBack={onBack} />}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {visibleTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="press shrink-0 rounded-xl px-3.5 py-2" style={tab === t.id ? { background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)" } : glass(c, 18)}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: tab === t.id ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {/* Banknote-styled hero: guilloche lines, gold seal, engraved figures */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", position: "relative", overflow: "hidden", border: "1px solid rgba(251,191,36,.25)", boxShadow: "0 14px 34px rgba(30,58,138,.4)" }}>
            {/* Engraved guilloche lines, like the back of a banknote */}
            <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, opacity: 0.14, pointerEvents: "none" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M-20,${30 + i * 22} C60,${5 + i * 22} 120,${60 + i * 22} 200,${28 + i * 22} C260,${8 + i * 22} 300,${45 + i * 22} 340,${25 + i * 22}`} fill="none" stroke="#fbbf24" strokeWidth="0.8" />
              ))}
            </svg>
            <span style={{ position: "absolute", top: "-40%", left: "-20%", width: 180, height: 180, background: "radial-gradient(circle,rgba(255,255,255,.12),transparent 70%)", animation: "floraFloat 5s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -18, right: -12, opacity: 0.1, pointerEvents: "none" }}><FloraMark size={120} color="#fbbf24" stroke={1.1} /></div>

            <div className="flex items-center justify-between mb-3" style={{ position: "relative" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}><Sparkles size={15} color="#fff" /></div>
                <strong style={{ fontSize: 13.5, color: "#fff" }}>خلاصه هوشمند</strong>
              </div>
              {/* Gold seal, the way a note carries its denomination stamp */}
              <div className="flora-coin w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#fde68a,#f59e0b)", boxShadow: "0 3px 10px rgba(245,158,11,.5), inset 0 0 0 1.5px rgba(255,255,255,.35)" }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#7c2d12" }}>ت</span>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.7)", letterSpacing: ".04em" }}>مانده‌ی کل کمیسیون‌های وصول‌نشده</p>
              <CountUpToman value={totalRemainingAll} className="flora-money" style={{ fontSize: 21, fontWeight: 800, color: "#fbbf24", display: "inline-block", marginTop: 3, direction: "ltr" }} />
              <div className="flex items-center gap-1.5 mt-2.5">
                <span style={{ width: 6, height: 6, borderRadius: 99, background: debtors.length > 0 ? "#f87171" : "#4ade80" }} className={debtors.length > 0 ? "flora-pulse" : ""} />
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.85)" }}>{debtors.length > 0 ? `${faDigits(debtors.length)} نفر بدهکار نیاز به پیگیری دارند` : "همه‌ی حساب‌ها تسویه است"}</p>
              </div>
            </div>
          </div>

          {simpleMode && (
            <button onClick={() => setSheet("deal")} className="press w-full rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", boxShadow: "0 12px 30px rgba(47,124,246,0.32)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}><FileText size={24} color="#fff" /></div>
              <div className="text-right">
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>ثبت قرارداد جدید</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>معامله و کمیسیونش را ثبت کن</p>
              </div>
            </button>
          )}

          <FinMarquee c={c} items={[
            { icon: CalendarDays, color: c.primary, value: fmtToman(monthVal), label: "فروش این ماه" },
            { icon: TrendingUp, color: c.purple, value: fmtToman(yearVal), label: "فروش امسال" },
            { icon: Landmark, color: c.primary, value: fmtToman(totalValue), label: "کل ارزش معاملات" },
            { icon: Wallet, color: c.success, value: fmtToman(totalPaidAll), label: "کمیسیون دریافتی" },
            { icon: AlertTriangle, color: c.attn, value: fmtToman(totalRemainingAll), label: "کمیسیون وصول‌نشده" },
            { icon: FileCheck, color: c.purple, value: faDigits(deals.length), label: "تعداد معاملات" },
            { icon: TrendingDown, color: c.danger, value: fmtToman(totalExpenses), label: "کل هزینه‌های دفتر" },
            { icon: Wallet, color: c.success, value: fmtToman(netProfit), label: "سود خالص دفتر" },
          ]} />

          <div style={{ height: 14 }} />

          <MonthlyDealsChart c={c} data={monthlyTotals} max={maxMonthly} />

          {totalPaidAll > 0 && <MoneyIdeasCard ctx={ctx} received={totalPaidAll} />}

          <SectionHeader c={c} title="هشدارها" />
          <div className="flex flex-col gap-2 mb-4">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: a.type === "red" ? c.dangerSoft : a.type === "yellow" ? c.attnSoft : c.successSoft }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: a.type === "red" ? c.danger : a.type === "yellow" ? c.attn : c.success, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: c.ink }}>{a.text}</span>
              </div>
            ))}
            {alerts.length === 0 && <EmptyLine c={c} text="هشداری وجود ندارد" />}
          </div>
        </div>
      )}

      {tab === "split" && <SplitTab ctx={ctx} deals={deals} payments={payments} />}

      {tab === "transactions" && (
        <div>
          <SearchBox c={c} value={search} setValue={setSearch} />
          <div className="flex gap-2 overflow-x-auto pb-1 my-3">
            {["همه", "تسویه شده", "در انتظار پرداخت", "در حال مذاکره"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className="press shrink-0 rounded-full px-3 py-1.5" style={statusFilter === s ? { background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)" } : glass(c, 18)}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: statusFilter === s ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{s}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setSheet("deal")} className="press w-full rounded-xl py-3 mb-3 flex items-center justify-center gap-2" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12.5 }}><Plus size={14} /> ثبت قرارداد جدید</button>
          <div className="flex flex-col gap-3 flora-stagger">
            {filteredDeals.map((d) => (
              <button key={d.id} onClick={() => setSheet({ kind: "deal-detail", dealId: d.id })} className="press w-full text-right rounded-2xl p-4" style={glass(c, 22)}>
                <div className="flex justify-between items-start mb-2.5">
                  <div><p style={{ fontSize: 14, fontWeight: 700 }}>{d.propertyTitle}</p></div>
                  <DealStatusBadge c={c} status={d.status} />
                </div>
                <div className="flex gap-4 mb-2.5">
                  <div className="flex-1"><p style={{ fontSize: 10, color: c.muted, marginBottom: 2 }}>فروشنده</p><p style={{ fontSize: 12, fontWeight: 600 }}>{d.sellerName || "—"}</p></div>
                  <div className="flex-1"><p style={{ fontSize: 10, color: c.muted, marginBottom: 2 }}>خریدار</p><p style={{ fontSize: 12, fontWeight: 600 }}>{d.buyerName || "—"}</p></div>
                </div>
                <div className="flex justify-between items-center pt-2.5" style={{ borderTop: `1px solid ${c.border}` }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#fde68a,#f59e0b)" }}><Banknote size={10} color="#7c2d12" /></div>
                    <p style={{ fontSize: 13.5, fontWeight: 800, color: c.primary, direction: "ltr" }}>{fmtToman(d.price)}</p>
                  </div>
                  <p style={{ fontSize: 10.5, color: c.muted }}>{d.advisor}</p>
                </div>
                <div style={{ height: 5, borderRadius: 6, background: c.surface2, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${dealProgress(d, payments)}%`, borderRadius: 6, background: `linear-gradient(90deg, ${c.success}, #4ade80)` }} />
                </div>
              </button>
            ))}
            {filteredDeals.length === 0 && <EmptyLine c={c} text="معامله‌ای پیدا نشد" />}
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <div className="mt-4">
          <SectionHeader c={c} title="تاریخچه پرداخت‌ها" action={<button onClick={() => setSheet("payment")} className="press flex items-center gap-1 rounded-lg px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 11.5 }}><Plus size={12} /> ثبت پرداخت</button>} />
          <div className="flex flex-col gap-2 flora-stagger">
            {[...payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
              const deal = deals.find((d) => d.id === p.dealId);
              const method = PAYMENT_METHODS.find((m) => m.id === p.method) || PAYMENT_METHODS[0];
              const payerName = deal ? (p.payerType === "seller" ? deal.sellerName : deal.buyerName) : "—";
              return (
                <div key={p.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glass(c, 20)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><method.icon size={17} color={c.primary} /></div>
                  <div className="flex-1 min-w-0"><p style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{payerName}</p><p style={{ fontSize: 10.5, color: c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{method.label} · {deal?.propertyTitle}</p></div>
                  <div className="text-left shrink-0"><p style={{ fontSize: 12, fontWeight: 800, color: c.success }}>+{fmtToman(p.amount)}</p><p style={{ fontSize: 10, color: c.muted }}>{fmtJalali(p.date)}</p></div>
                  <button onClick={() => setSheet({ kind: "payment", editId: p.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
                  <button onClick={() => { setPayments((prev) => prev.filter((x) => x.id !== p.id)); notify("پرداخت حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
                </div>
              );
            })}
            {payments.length === 0 && <EmptyLine c={c} text="پرداختی ثبت نشده" />}
          </div>
        </div>
      )}

      {tab === "office" && (
        <div>
          <div className="grid grid-cols-2 gap-2.5 mb-3 flora-stagger">
            <FinStat c={c} icon={TrendingUp} color={c.success} value={fmtToman(totalOfficeIncome)} label="کل درآمد دفتر" />
            <FinStat c={c} icon={TrendingDown} color={c.danger} value={fmtToman(totalExpenses)} label="کل هزینه‌های دفتر" />
          </div>
          <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c, 22), background: `linear-gradient(160deg, ${netProfit >= 0 ? c.successSoft : c.dangerSoft}, ${c.surface} 65%)`, position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", inset: 6, borderRadius: 16, border: `1px dashed ${(netProfit >= 0 ? c.success : c.danger)}33`, pointerEvents: "none" }} />
            <div className="flex items-center justify-between" style={{ position: "relative" }}>
              <div className="flex items-center gap-2">
                <div className="flora-coin w-7 h-7 rounded-full flex items-center justify-center" style={{ background: netProfit >= 0 ? "linear-gradient(135deg,#86efac,#22c55e)" : "linear-gradient(135deg,#fca5a5,#ef4444)" }}>
                  <Banknote size={13} color="#fff" />
                </div>
                <span style={{ fontSize: 12.5, color: c.muted, fontWeight: 700 }}>سود خالص دفتر</span>
              </div>
              <div className="text-left">
                <CountUpToman value={Math.abs(netProfit)} style={{ fontSize: 15.5, fontWeight: 800, color: netProfit >= 0 ? c.success : c.danger, direction: "ltr", display: "inline-block" }} />
                {netProfit < 0 && <p style={{ fontSize: 9.5, color: c.danger }}>زیان</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setSheet("income")} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.successSoft, color: c.success, fontWeight: 700, fontSize: 12 }}><Plus size={14} /> ثبت درآمد</button>
            <button onClick={() => setSheet("expense")} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.dangerSoft, color: c.danger, fontWeight: 700, fontSize: 12 }}><Plus size={14} /> ثبت هزینه</button>
          </div>

          <SectionHeader c={c} title="گردش مالی دفتر" />
          <div className="flex flex-col gap-2 flora-stagger">
            {officeTxns.map((t) => (
              <div key={t.kind + t.id} className="rounded-xl p-3.5 flex items-center gap-3" style={glass(c, 20)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.kind === "in" ? c.successSoft : c.dangerSoft }}>
                  {t.kind === "in" ? <TrendingUp size={16} color={c.success} /> : <TrendingDown size={16} color={c.danger} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</p>
                  <p style={{ fontSize: 10.5, color: c.muted }}>{t.category || (t.kind === "in" ? "درآمد" : "هزینه")} · {fmtJalali(t.date)}</p>
                </div>
                <p className="shrink-0" style={{ fontSize: 12.5, fontWeight: 800, color: t.kind === "in" ? c.success : c.danger }}>{t.kind === "in" ? "+" : "−"}{fmtToman(t.amount)}</p>
                <button onClick={() => setSheet({ kind: t.kind === "in" ? "income" : "expense", editId: t.id })} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={13} color={c.primary} /></button>
                <button onClick={() => {
                  if (t.kind === "in") setOfficeIncomes((prev) => prev.filter((x) => x.id !== t.id));
                  else setExpenses((prev) => prev.filter((x) => x.id !== t.id));
                  notify("حذف شد");
                }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
              </div>
            ))}
            {officeTxns.length === 0 && <EmptyLine c={c} text="هنوز درآمد یا هزینه‌ای ثبت نشده" />}
          </div>
        </div>
      )}

      {tab === "debtors" && (
        <div>
          <SectionHeader c={c} title="بدهکاران" />
          <div className="flex flex-col gap-2.5 flora-stagger">
            {debtors.map((x, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ ...glass(c, 22), border: `1px solid ${c.dangerSoft}` }}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.dangerSoft }}><UserCircle2 size={17} color={c.danger} /></div>
                    <div><p style={{ fontSize: 13, fontWeight: 700 }}>{x.name}</p><p style={{ fontSize: 10, color: c.danger }}>{faDigits(x.days)} روز تأخیر</p></div>
                  </div>
                  <CountUpToman value={x.amount} style={{ fontSize: 14.5, fontWeight: 800, color: c.danger, direction: "ltr", display: "inline-block" }} />
                </div>
                <div className="flex gap-2">
                  <a href={x.phone ? `tel:${x.phone}` : "#"} className="press flex-1 rounded-xl py-2.5 flex items-center justify-center gap-1.5" style={{ background: c.successSoft, opacity: x.phone ? 1 : 0.5, pointerEvents: x.phone ? "auto" : "none" }}><PhoneCall size={13} color={c.success} /><span style={{ fontSize: 11.5, fontWeight: 700, color: c.success }}>تماس</span></a>
                  <a href={x.phone ? (smsLink(x.phone, `سلام ${x.name} عزیز، پیرو معامله‌ی ${x.dealTitle}، یادآوری کمیسیون باقی‌مانده به مبلغ ${fmtToman(x.amount)}.`) || "#") : "#"} className="press flex-1 rounded-xl py-2.5 flex items-center justify-center gap-1.5" style={{ background: c.primarySoft, opacity: x.phone ? 1 : 0.5, pointerEvents: x.phone ? "auto" : "none" }}><MessageSquare size={13} color={c.primary} /><span style={{ fontSize: 11.5, fontWeight: 700, color: c.primary }}>پیامک</span></a>
                </div>
              </div>
            ))}
            {debtors.length === 0 && <EmptyLine c={c} text="بدهکاری وجود ندارد" />}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="rounded-xl p-3.5 text-center" style={glass(c, 20)}><p style={{ fontSize: 16, fontWeight: 800 }}>{faDigits(deals.length)}</p><p style={{ fontSize: 10.5, color: c.muted }}>تعداد قرارداد</p></div>
            <div className="rounded-xl p-3.5 text-center" style={glass(c, 20)}><p style={{ fontSize: 16, fontWeight: 800 }}>{fmtToman(totalValue)}</p><p style={{ fontSize: 10.5, color: c.muted }}>مجموع ارزش معاملات</p></div>
            <div className="rounded-xl p-3.5 text-center" style={glass(c, 20)}><p style={{ fontSize: 16, fontWeight: 800 }}>{fmtToman(totalCommission)}</p><p style={{ fontSize: 10.5, color: c.muted }}>مجموع کمیسیون</p></div>
            <div className="rounded-xl p-3.5 text-center" style={glass(c, 20)}><p style={{ fontSize: 16, fontWeight: 800 }}>{fmtToman(avgDeal)}</p><p style={{ fontSize: 10.5, color: c.muted }}>میانگین معامله</p></div>
          </div>
          <div className="rounded-2xl p-4 mb-4" style={glass(c, 22)}>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>کل دریافت‌شده</p><p style={{ fontSize: 13.5, fontWeight: 700, color: c.success, marginBottom: 10 }}>{fmtToman(totalPaidAll)}</p>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>مانده کل</p><p style={{ fontSize: 13.5, fontWeight: 700, color: c.attn, marginBottom: 10 }}>{fmtToman(totalRemainingAll)}</p>
            <p style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>درصد وصول</p><p style={{ fontSize: 13.5, fontWeight: 700, color: c.success }}>{faDigits(totalCommission ? Math.round((totalPaidAll / totalCommission) * 100) : 0)}٪</p>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={glass(c, 22)}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 13, fontWeight: 700 }}>درآمد و هزینه ۶ ماه اخیر</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1" style={{ fontSize: 9.5, color: c.muted }}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.success }} /> درآمد</span>
                <span className="flex items-center gap-1" style={{ fontSize: 9.5, color: c.muted }}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.danger }} /> هزینه</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2" style={{ height: 96 }}>
              {monthlyIncomeExpense.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center gap-1" style={{ height: 76 }}>
                    <div style={{ width: "42%", borderRadius: "5px 5px 0 0", background: `linear-gradient(180deg,#4ade80,${c.success})`, height: `${Math.max(3, (m.income / maxIncExp) * 72)}px`, transition: "height .7s cubic-bezier(.34,1.3,.64,1)" }} />
                    <div style={{ width: "42%", borderRadius: "5px 5px 0 0", background: `linear-gradient(180deg,#fca5a5,${c.danger})`, height: `${Math.max(3, (m.expense / maxIncExp) * 72)}px`, transition: "height .7s cubic-bezier(.34,1.3,.64,1)" }} />
                  </div>
                  <span style={{ fontSize: 9, color: c.muted }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={glass(c, 22)}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>سود و زیان دفتر</p>
            <Row c={c} label="درآمد دفتر" value={fmtToman(totalOfficeIncome)} color={c.success} />
            <Row c={c} label="هزینه‌های دفتر" value={fmtToman(totalExpenses)} color={c.danger} />
            <Row c={c} label={netProfit >= 0 ? "سود خالص" : "زیان خالص"} value={fmtToman(Math.abs(netProfit))} color={netProfit >= 0 ? c.success : c.danger} />
            <Row c={c} label="حاشیه سود" value={`${faDigits(margin)}٪`} color={margin >= 0 ? c.success : c.danger} />
          </div>

          <div className="rounded-2xl p-4 mb-4" style={glass(c, 22)}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>هزینه‌ها به تفکیک دسته</p>
            {expenseByCategory.length === 0 ? <EmptyLine c={c} text="هزینه‌ای ثبت نشده" /> : (
              <div className="flex flex-col gap-2.5">
                {expenseByCategory.map((x) => {
                  const pct = Math.round((x.value / expenseCatTotal) * 100);
                  return (
                    <div key={x.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: c.ink }}><span style={{ width: 8, height: 8, borderRadius: 3, background: x.color }} /> {x.name}</span>
                        <span style={{ fontSize: 10.5, color: c.muted }}>{fmtToman(x.value)} · {faDigits(pct)}٪</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 6, background: c.surface2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 6, background: x.color, transition: "width .7s cubic-bezier(.34,1.3,.64,1)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div>
          <SectionHeader c={c} title="رتبه‌بندی مشاوران" />
          <div className="flex flex-col gap-2.5">
            {advisors.map((a, i) => (
              <div key={a.name} className="rounded-xl p-3.5 flex items-center gap-3" style={glass(c, 20)}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: i === 0 ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : i === 1 ? "linear-gradient(135deg,#cbd5e1,#94a3b8)" : i === 2 ? "linear-gradient(135deg,#d97706,#92400e)" : c.surface2, color: i < 3 ? "#1a1a2e" : c.muted, fontWeight: 800, fontSize: 13 }}>{faDigits(i + 1)}</div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</p>
                  <p style={{ fontSize: 10, color: c.muted }}>معاملات: {faDigits(a.count)} · ارزش: {fmtToman(a.value)} · وصول: {faDigits(a.commission ? Math.round((a.paid / a.commission) * 100) : 0)}٪</p>
                </div>
              </div>
            ))}
            {advisors.length === 0 && <EmptyLine c={c} text="معامله‌ای ثبت نشده" />}
          </div>
        </div>
      )}

      {tab === "overview" && <FinanceAiTab ctx={ctx} stats={{ totalValue, totalCommission, totalPaidAll, totalRemainingAll, deals, debtors }} />}
      <div style={{ height: 20 }} />
    </div>
  );
}

// Auto-drifts left, but is also a real scroller so it can be swiped by hand.
// A CSS animation can't be dragged, so instead this nudges scrollLeft each frame and lets
// native touch scrolling do the rest. The track is duplicated and wrapped at the halfway
// point, so the loop is seamless in either direction and after any manual fling.
function FinMarquee({ c, items }) {
  const scrollerRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(null);
  const doubled = [...items, ...items];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf;
    const SPEED = 0.35; // px per frame — slow enough to read while it moves

    const half = () => el.scrollWidth / 2;
    const wrap = () => {
      const h = half();
      if (h <= 0) return;
      if (el.scrollLeft >= h) el.scrollLeft -= h;
      else if (el.scrollLeft <= 0) el.scrollLeft += h;
    };
    const tick = () => {
      if (!pausedRef.current) {
        el.scrollLeft += SPEED;
        wrap();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    el.addEventListener("scroll", wrap, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", wrap); };
  }, [items.length]);

  const hold = () => { pausedRef.current = true; clearTimeout(resumeTimer.current); };
  // Wait a beat after release so a fling can coast before the drift takes over again.
  const release = () => { clearTimeout(resumeTimer.current); resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 1600); };

  return (
    // dir=ltr on the frame is deliberate: under RTL an over-wide track anchors to the RIGHT
    // and spills left, which broke the loop. LTR anchors it left and spills right.
    <div dir="ltr" className="mb-5" style={{ position: "relative", margin: "0 -16px" }}>
      <span style={{ position: "absolute", inset: "0 auto 0 0", width: 26, zIndex: 2, background: `linear-gradient(90deg, ${c.bg}, transparent)`, pointerEvents: "none" }} />
      <span style={{ position: "absolute", inset: "0 0 0 auto", width: 26, zIndex: 2, background: `linear-gradient(270deg, ${c.bg}, transparent)`, pointerEvents: "none" }} />
      <div
        ref={scrollerRef}
        onTouchStart={hold} onTouchEnd={release} onTouchCancel={release}
        onMouseEnter={hold} onMouseLeave={release}
        onWheel={() => { hold(); release(); }}
        style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", padding: "4px 16px", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {doubled.map((it, i) => (
          <div key={i} dir="rtl" className="rounded-xl p-3" style={{ ...glass(c, 18), width: 150, flexShrink: 0, background: `linear-gradient(160deg, ${it.color}14, ${c.surface} 60%)` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: it.color + "22", boxShadow: `inset 0 0 0 1.2px ${it.color}33` }}><it.icon size={12} color={it.color} /></div>
              <p style={{ fontSize: 9.5, color: c.muted }}>{it.label}</p>
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 800, direction: "ltr", textAlign: "right", whiteSpace: "nowrap" }}>{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyDealsChart({ c, data, max }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);
  const best = data.reduce((m, x) => (x.value > m ? x.value : m), 0);
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c, 22), background: `linear-gradient(160deg, ${c.primarySoft}, ${c.surface} 60%)` }}>
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: 13, fontWeight: 700 }}>تعداد معاملات ۶ ماه اخیر</p>
        <span style={{ fontSize: 9.5, color: c.muted, background: c.surface2, padding: "3px 8px", borderRadius: 999 }}>مجموع {faDigits(data.reduce((a, b) => a + b.value, 0))}</span>
      </div>
      <div className="flex items-end justify-between gap-2" style={{ height: 108, position: "relative" }}>
        {[0.33, 0.66, 1].map((g, i) => (
          <span key={i} style={{ position: "absolute", left: 0, right: 0, bottom: `${18 + g * 76}px`, height: 1, background: c.border, opacity: .5 }} />
        ))}
        {data.map((m, i) => {
          const h = Math.max(4, (m.value / max) * 76);
          const isBest = m.value === best && best > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5" style={{ zIndex: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: isBest ? c.primary : c.muted, opacity: show ? 1 : 0, transition: "opacity .5s ease .5s" }}>{m.value ? faDigits(m.value) : ""}</span>
              <div style={{ width: "100%", position: "relative", display: "flex", justifyContent: "center" }}>
                <div style={{
                  width: "72%", borderRadius: "7px 7px 3px 3px",
                  background: isBest ? "linear-gradient(180deg,#7c6ff5,#2f7cf6)" : `linear-gradient(180deg,${c.primary}88,${c.primary}33)`,
                  boxShadow: isBest ? "0 6px 16px rgba(124,111,245,.45)" : "none",
                  height: show ? `${h}px` : "3px",
                  transition: `height .8s cubic-bezier(.34,1.3,.64,1) ${i * 0.07}s`,
                }} />
              </div>
              <span style={{ fontSize: 9, color: isBest ? c.primary : c.muted, fontWeight: isBest ? 700 : 400 }}>{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Commission split. Every number here is derived from payments already received, so the
// three shares always reconcile back to the money that actually came in.
function SplitTab({ ctx, deals, payments }) {
  const { c, splitShares, setSplitShares, notify } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(splitShares);

  const receivedTotal = deals.reduce((sum, d) => sum + dealTotalPaid(d, payments), 0);
  const pendingTotal = deals.reduce((sum, d) => sum + dealTotalRemaining(d, payments), 0);
  const parts = splitAmounts(receivedTotal, splitShares);
  const futureParts = splitAmounts(pendingTotal, splitShares);
  const unitSum = SPLIT_PARTIES.reduce((a, p) => a + (Number(splitShares?.[p.id]) || 0), 0);

  const perDeal = deals
    .map((d) => ({ deal: d, paid: dealTotalPaid(d, payments) }))
    .filter((x) => x.paid > 0)
    .sort((a, b) => b.paid - a.paid);

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", position: "relative", overflow: "hidden", border: "1px solid rgba(251,191,36,.25)" }}>
        <span style={{ position: "absolute", top: "-45%", left: "-20%", width: 190, height: 190, background: "radial-gradient(circle,rgba(255,255,255,.12),transparent 70%)", animation: "floraFloat 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -18, right: -12, opacity: 0.1, pointerEvents: "none" }}><FloraMark size={120} color="#fbbf24" stroke={1.1} /></div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.7)", letterSpacing: ".04em" }}>کمیسیون دریافت‌شده (قابل تقسیم)</p>
        <CountUpToman value={receivedTotal} className="flora-money" style={{ fontSize: 21, fontWeight: 800, color: "#fbbf24", display: "inline-block", marginTop: 3, direction: "ltr" }} />
        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.65)", marginTop: 6, lineHeight: 1.8 }}>
          فقط پولی که واقعاً به دست‌مان رسیده تقسیم می‌شود؛ مانده‌ی وصول‌نشده پایین جدا آمده تا حساب‌ها قاطی نشود.
        </p>
      </div>

      {/* The ratio itself */}
      <div className="rounded-2xl p-4 mb-4" style={glass(c, 22)}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 12.5, fontWeight: 700 }}>نسبت تقسیم</p>
          {!editing ? (
            <button onClick={() => { setDraft(splitShares); setEditing(true); }} className="press flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: c.primarySoft }}>
              <Edit3 size={11} color={c.primary} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.primary }}>تغییر</span>
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(false)} className="press rounded-lg px-2.5 py-1.5" style={{ background: c.surface2, fontSize: 10.5, fontWeight: 700, color: c.muted }}>لغو</button>
              <button onClick={() => {
                const total = SPLIT_PARTIES.reduce((a, p) => a + (Number(toEnDigits(String(draft[p.id]))) || 0), 0);
                if (!total) { notify("حداقل یک سهم باید بزرگ‌تر از صفر باشد"); return; }
                setSplitShares({ agent: Number(toEnDigits(String(draft.agent))) || 0, management: Number(toEnDigits(String(draft.management))) || 0, rent: Number(toEnDigits(String(draft.rent))) || 0 });
                setEditing(false); notify("نسبت تقسیم ذخیره شد");
              }} className="press rounded-lg px-2.5 py-1.5" style={{ background: c.primary, fontSize: 10.5, fontWeight: 700, color: "#fff" }}>ذخیره</button>
            </div>
          )}
        </div>
        {editing ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {SPLIT_PARTIES.map((p) => (
                <div key={p.id}>
                  <p style={{ fontSize: 10, color: c.muted, marginBottom: 5 }}>{p.label}</p>
                  <input inputMode="numeric" value={draft[p.id]} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })} style={{ ...inputStyle(c), textAlign: "center", padding: "9px 6px" }} />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: c.muted, marginTop: 8, lineHeight: 1.8 }}>سهم‌ها نسبی‌اند: ۱-۱-۱ یعنی تقسیم مساوی سه‌نفره. مثلاً ۲-۱-۱ یعنی سهم تو دو برابر.</p>
          </>
        ) : (
          <div className="flex gap-2">
            {SPLIT_PARTIES.map((p, i) => {
              const units = Number(splitShares?.[p.id]) || 0;
              const pct = unitSum ? Math.round((units / unitSum) * 100) : 0;
              return (
                <div key={p.id} className="flex-1 rounded-xl p-2.5 text-center" style={{ background: p.color + "14", border: `1px solid ${p.color}2e` }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{faDigits(pct)}%</p>
                  <p style={{ fontSize: 9.5, color: c.muted, marginTop: 1 }}>{p.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The three shares */}
      <SectionHeader c={c} title="سهم هر طرف از دریافتی‌ها" />
      <div className="flex flex-col gap-2.5 mb-4 flora-stagger">
        {SPLIT_PARTIES.map((p, i) => (
          <div key={p.id} className="rounded-2xl p-4" style={{ ...glass(c, 22), background: `linear-gradient(160deg, ${p.color}12, ${c.surface} 62%)`, position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", inset: 6, borderRadius: 16, border: `1px dashed ${p.color}2e`, pointerEvents: "none" }} />
            <div className="flex items-center justify-between" style={{ position: "relative" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: p.color + "22", boxShadow: `inset 0 0 0 1.5px ${p.color}44` }}><p.icon size={17} color={p.color} /></div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</p>
                  <p style={{ fontSize: 9.5, color: c.muted }}>سهم {faDigits(unitSum ? Math.round(((Number(splitShares?.[p.id]) || 0) / unitSum) * 100) : 0)}%</p>
                </div>
              </div>
              <CountUpToman value={parts[i]} style={{ fontSize: 15, fontWeight: 800, color: p.color, direction: "ltr", display: "inline-block" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Reconciliation — proves the three parts add back up */}
      <div className="rounded-2xl p-4 mb-4" style={glass(c, 22)}>
        <p style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>کنترل حساب</p>
        {SPLIT_PARTIES.map((p, i) => <Row key={p.id} c={c} label={p.label} value={fmtToman(parts[i])} color={p.color} />)}
        <div className="flex justify-between items-center" style={{ paddingTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>جمع سه سهم</span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: parts.reduce((a, b) => a + b, 0) === receivedTotal ? c.success : c.danger, direction: "ltr" }}>{fmtToman(parts.reduce((a, b) => a + b, 0))}</span>
        </div>
        <p className="flex items-center gap-1.5" style={{ fontSize: 10, color: c.success, marginTop: 6 }}>
          <BadgeCheck size={11} /> برابر با کل دریافتی — ریالی کم و زیاد نشده
        </p>
      </div>

      {/* Not yet collected */}
      {pendingTotal > 0 && (
        <>
          <SectionHeader c={c} title="هنوز وصول نشده (سهم آینده)" />
          <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c, 22), border: `1px solid ${c.attnSoft}` }}>
            <p style={{ fontSize: 11, color: c.muted, marginBottom: 8, lineHeight: 1.8 }}>این مبالغ هنوز به دست‌مان نرسیده؛ فقط برای برنامه‌ریزی است و در حساب بالا لحاظ نشده.</p>
            {SPLIT_PARTIES.map((p, i) => <Row key={p.id} c={c} label={p.label} value={fmtToman(futureParts[i])} color={c.muted} />)}
            <div className="flex justify-between items-center" style={{ paddingTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: c.attn }}>جمع وصول‌نشده</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: c.attn, direction: "ltr" }}>{fmtToman(pendingTotal)}</span>
            </div>
          </div>
        </>
      )}

      {/* Per-deal breakdown */}
      <SectionHeader c={c} title="تفکیک به ازای هر معامله" />
      <div className="flex flex-col gap-2 mb-4 flora-stagger">
        {perDeal.map(({ deal, paid }) => {
          const dp = splitAmounts(paid, splitShares);
          return (
            <div key={deal.id} className="rounded-xl p-3.5" style={glass(c, 20)}>
              <div className="flex items-center justify-between mb-2.5">
                <p style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deal.propertyTitle}</p>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: c.success, direction: "ltr", flexShrink: 0, marginRight: 8 }}>{fmtToman(paid)}</span>
              </div>
              <div className="flex gap-1.5">
                {SPLIT_PARTIES.map((p, i) => (
                  <div key={p.id} className="flex-1 rounded-lg py-1.5 px-1 text-center" style={{ background: p.color + "14" }}>
                    <p style={{ fontSize: 10.5, fontWeight: 800, color: p.color, direction: "ltr" }}>{dp[i].toLocaleString("en-US")}</p>
                    <p style={{ fontSize: 8.5, color: c.muted, marginTop: 1 }}>{p.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {perDeal.length === 0 && <EmptyLine c={c} text="هنوز کمیسیونی دریافت نشده" />}
      </div>
    </div>
  );
}

function FinStat({ c, icon: Icon, color, value, label }) {
  return (
    <div className="rounded-xl p-3.5" style={{ ...glass(c, 20), background: `linear-gradient(160deg, ${color}14, ${c.surface} 60%)`, position: "relative", overflow: "hidden" }}>
      {/* faint coin edge in the corner */}
      <span style={{ position: "absolute", top: -14, left: -14, width: 46, height: 46, borderRadius: "50%", border: `1.5px dashed ${color}33`, pointerEvents: "none" }} />
      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2.5" style={{ background: color + "22", boxShadow: `inset 0 0 0 1.5px ${color}33` }}><Icon size={15} color={color} /></div>
      <p style={{ fontSize: 13.5, fontWeight: 800, direction: "ltr", textAlign: "right" }}>{value}</p>
      <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{label}</p>
    </div>
  );
}

// Given the commission actually received, suggest ways to use/preserve it —
// grounded in today's Iranian market (dollar, gold, real-estate). The AI is told
// to reason about the current climate rather than give generic advice.
function MoneyIdeasCard({ ctx, received }) {
  const { c, hasAiKey, callAI, notify, setSheet } = ctx;
  const [ideas, setIdeas] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    setLoading(true);
    try {
      // pull the cached market snapshot the home widget stores
      let market = "";
      try { const m = JSON.parse(localStorage.getItem("flora-market") || "null"); if (m) market = `دلار حدود ${m.usd} تومان، طلای گرمی حدود ${m.gold} تومان.`; } catch (e) {}
      const today = fmtJalali(todayISO());
      const prompt = `تو یک مشاور مالی باتجربه‌ی ایرانی هستی. یک مشاور املاک تازه ${fmtToman(received)} کمیسیون دریافت کرده. امروز ${today} است. ${market ? "وضعیت بازار امروز: " + market : ""}
با توجه به شرایط اقتصادی و تورمی ایران در همین مقطع، ۴ تا ۵ ایده‌ی کوتاه و عملی بده که با این پول چه کند تا ارزشش حفظ یا بیشتر شود (مثلاً بخشی طلا، بخشی دلار، سرمایه‌گذاری روی فایل ملکی، سپرده، و…). لحن ساده و رفیقانه. برای هر ایده یک مزیت کوتاه بگو.
دقیقاً JSON خام برگردان (بدون توضیح، بدون markdown):
{"climate":"یک جمله درباره‌ی فضای کلی بازار امروز و اینکه پول نقد نگه‌داشتن چه ریسکی دارد","ideas":[{"title":"عنوان کوتاه","detail":"توضیح یک‌خطی","share":"مثلاً ۳۰٪"}]}
اگر عددی از بازار نداری، حدس نزن و در climate صادقانه بگو قیمت روز را چک کند.`;
      const text = await callAI(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setIdeas(parsed);
    } catch (e) {
      if (e instanceof SyntaxError) notify("پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن");
      else notify(`خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.lg, ...glass(c, 24) }}>
      <div className="flex items-center justify-between" style={{ marginBottom: ideas ? SP.md : 0 }}>
        <div className="flex items-center" style={{ gap: SP.sm }}>
          <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: RAD.md, background: c.successSoft }}><Landmark size={18} color={c.success} /></div>
          <div>
            <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>ایده برای کمیسیون دریافتی</p>
            <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 1 }}>متناسب با بازار امروز ایران</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="press rounded-full flex items-center" style={{ gap: SP.xs, padding: `6px ${SP.md}px`, background: c.primarySoft }}>
          {loading ? <Loader2 size={13} className="animate-spin" color={c.primary} /> : <Sparkles size={13} color={c.primary} />}
          <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.primary }}>{loading ? "..." : ideas ? "دوباره" : "ایده بده"}</span>
        </button>
      </div>
      {ideas && (
        <div className="flora-rise">
          {ideas.climate && <p style={{ fontSize: FS.caption, color: c.attn, lineHeight: 1.8, marginBottom: SP.md, background: c.attnSoft, padding: SP.md, borderRadius: RAD.md }}>{ideas.climate}</p>}
          <div className="flex flex-col" style={{ gap: SP.sm }}>
            {(ideas.ideas || []).map((it, i) => (
              <div key={i} className="flex items-start" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
                {it.share && <span className="shrink-0 rounded-full" style={{ fontSize: FS.caption, fontWeight: FW.heavy, color: c.primary, background: c.primarySoft, padding: `3px ${SP.sm}px` }}>{it.share}</span>}
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{it.title}</p>
                  <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.7 }}>{it.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 9.5, color: c.muted, marginTop: SP.md, lineHeight: 1.7, textAlign: "center" }}>این‌ها پیشنهاد کلی‌اند، نه توصیه‌ی قطعی سرمایه‌گذاری. قبل از تصمیم، قیمت روز را چک کن.</p>
        </div>
      )}
    </div>
  );
}

function FinanceAiTab({ ctx, stats }) {
  const { c, hasAiKey, callAI, notify, setSheet, agentName } = ctx;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => { try { const cached = await dbGet(FINANCE_AI_KEY); if (cached?.date === todayISO()) setReport(cached.data); } catch (e) {} })(); }, []);

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    setLoading(true);
    try {
      const debtorsSummary = stats.debtors.slice(0, 8).map((x) => `- ${x.name}: ${x.amount} تومان، ${x.days} روز تأخیر`).join("\n");
      const prompt = `تو مدیر مالی هوشمند یک دفتر مشاور املاک به اسم ${agentName || "مشاور"} هستی. بر اساس اطلاعات مالی زیر، دقیقاً یک JSON خام (بدون توضیح، بدون markdown) با این ساختار برگردان:
{"report":["۵ خط خلاصه‌ی وضعیت مالی امروز، هرکدام یک رشته کوتاه فارسی"],"suggestions":[{"text":"یک پیشنهاد یا بینش مالی کوتاه فارسی"}]}
report حداکثر ۵ آیتم، suggestions حداکثر ۵ آیتم.

کل ارزش معاملات: ${stats.totalValue} تومان
کل کمیسیون: ${stats.totalCommission} تومان
دریافت‌شده: ${stats.totalPaidAll} تومان
مانده: ${stats.totalRemainingAll} تومان
تعداد معاملات: ${stats.deals.length}
بدهکاران:
${debtorsSummary || "بدهکاری وجود ندارد"}`;
      const text = await callAI(prompt);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setReport(parsed);
      dbSet(FINANCE_AI_KEY, { date: todayISO(), data: parsed }).catch(() => {});
    } catch (e) {
      if (e instanceof SyntaxError) notify("پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن");
      else notify(`خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: `1px solid ${c.primarySoft}` }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)" }}><Bot size={16} color="#fff" /></div>
          <div><strong style={{ fontSize: 13, color: c.ink, display: "block" }}>گزارش صبحگاهی مدیر مالی</strong><span style={{ fontSize: 10, color: c.muted }}>{report ? "به‌روزرسانی شده امروز" : "هنوز تولید نشده"}</span></div>
        </div>
        {report?.report ? (
          <ul style={{ listStyle: "none" }}>
            {report.report.map((line, i) => (
              <li key={i} className="flex gap-2 items-start" style={{ fontSize: 12, color: c.muted, marginBottom: 9, lineHeight: 1.8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, background: c.primarySoft, color: c.primary, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{faDigits(i + 1)}</span>
                {line}
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: 11.5, color: c.muted }}>روی دکمه‌ی پایین بزن تا گزارش امروز ساخته شود.</p>}
      </div>

      <button onClick={generate} disabled={loading} className="press w-full rounded-xl py-3 mb-4 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: "#fff", fontWeight: 700, fontSize: 13 }}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {loading ? "در حال تحلیل..." : report ? "به‌روزرسانی گزارش" : "تولید گزارش امروز"}
      </button>

      {report?.suggestions?.length > 0 && (
        <>
          <SectionHeader c={c} title="پیشنهادهای هوشمند" />
          <div className="flex flex-col gap-2.5">
            {report.suggestions.map((s, i) => (
              <div key={i} className="rounded-xl p-3.5 flex gap-2.5" style={glass(c, 20)}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Sparkles size={15} color={c.primary} /></div>
                <p style={{ fontSize: 12, color: c.ink, lineHeight: 1.8 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Sheet shell + fields ----------
function SheetShell({ c, title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full p-5 flora-sheet max-h-[85%] overflow-y-auto" style={{ ...glass(c), borderRadius: "26px 26px 0 0" }}>
        <div className="w-10 h-1.5 rounded-full mx-auto mb-4" style={{ background: c.surface2 }} />
        <div className="flex items-center justify-between mb-4"><h3 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{title}</h3><button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button></div>
        {children}
      </div>
    </div>
  );
}
function QuickAddSheet({ ctx, onClose }) {
  const { c, setSheet } = ctx;
  const options = [
    { id: "property", label: "فایل ملک جدید", icon: Building2 }, { id: "customer", label: "مشتری جدید", icon: Users },
    { id: "owner", label: "مالک جدید", icon: UserCircle2 }, { id: "builder", label: "سازنده جدید", icon: Hammer },
    { id: "appointment", label: "قرار بازدید جدید", icon: CalendarDays }, { id: "call", label: "پیگیری تماس جدید", icon: PhoneCall },
  ];
  return (
    <SheetShell c={c} title="افزودن سریع" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => setSheet(o.id)} className="press w-full flex items-center gap-3 rounded-xl p-3.5" style={glass(c, 20)}>
            <div className="rounded-2xl flex items-center justify-center" style={{ width: 38, height: 38, background: c.primarySoft }}><o.icon size={17} color={c.primary} /></div>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{o.label}</span>
          </button>
        ))}
      </div>
    </SheetShell>
  );
}
function Field({ c, label, children }) { return <div style={{ marginBottom: SP.md }}><label style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm, display: "block" }}>{label}</label>{children}</div>; }
function inputStyle(c) { return { width: "100%", background: c.surface2, border: "none", borderRadius: RAD.md, padding: `${SP.md}px ${SP.md + 2}px`, fontSize: FS.body + 1, color: c.ink, outline: "none", fontFamily: "inherit" }; }
function Select({ c, value, onChange, options, placeholder }) { return <select value={value} onChange={onChange} style={inputStyle(c)}><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; }
function SubmitBtn({ c, label, onClick, disabled }) { return <button onClick={onClick} disabled={disabled} className="press w-full" style={{ borderRadius: RAD.md, paddingBlock: SP.md + 2, marginTop: SP.sm, background: disabled ? c.surface2 : "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: disabled ? c.muted : "#fff", fontWeight: FW.bold, fontSize: FS.subtitle }}>{label}</button>; }

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
        <div className="mt-2 rounded-xl p-3 flora-up" style={glass(c, 24)}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => nav(-1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronRight size={14} color={c.ink} /></button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{MONTHS_FA[viewM - 1]} {faDigits(viewY)}</span>
            <button onClick={() => nav(1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronLeft size={14} color={c.ink} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">{WEEK_FA.map((w, i) => <div key={i} style={{ fontSize: 10.5, color: c.muted, textAlign: "center", fontWeight: 700 }}>{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => { const isSel = day && viewY === selJ[0] && viewM === selJ[1] && day === selJ[2]; return day ? <button key={i} onClick={() => pick(day)} className="press rounded-xl flex items-center justify-center" style={{ height: 30, fontSize: 12, fontWeight: isSel ? 800 : 500, color: isSel ? "#fff" : c.ink, background: isSel ? c.primary : "transparent" }}>{faDigits(day)}</button> : <div key={i} />; })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Map picker (Sarein) — separate overlay, never unmounts the form beneath it ----------
const SAREIN_CENTER = [38.1465, 48.0043];

// Pre-download every map tile covering Sarein across the useful zoom levels, so the
// whole town is visible offline afterwards (the service worker keeps them forever).
// Covers roughly a 6km box around the centre — enough for the whole town + outskirts.
async function precacheSareinTiles(onProgress) {
  const [lat, lng] = SAREIN_CENTER;
  const zooms = [13, 14, 15, 16, 17];
  const kmBox = 6; // half-width in km
  const lat2tile = (lat, z) => Math.floor(((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, z));
  const lng2tile = (lng, z) => Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  const dLat = kmBox / 111;
  const dLng = kmBox / (111 * Math.cos(lat * Math.PI / 180));

  const urls = [];
  for (const z of zooms) {
    const xMin = lng2tile(lng - dLng, z), xMax = lng2tile(lng + dLng, z);
    const yMin = lat2tile(lat + dLat, z), yMax = lat2tile(lat - dLat, z);
    for (let x = xMin; x <= xMax; x++)
      for (let y = yMin; y <= yMax; y++)
        urls.push(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
  }

  let done = 0;
  const total = urls.length;
  // Fetch in small batches so we don't hammer the tile server or the phone.
  const batch = 6;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.all(urls.slice(i, i + batch).map((u) =>
      fetch(u, { mode: "no-cors" }).then(() => {}).catch(() => {})
    ));
    done = Math.min(total, i + batch);
    onProgress && onProgress(done, total);
  }
  return total;
}

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(link);
    const script = document.createElement("script"); script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; script.onload = () => resolve(window.L); document.body.appendChild(script);
  });
}
function MapPickerModal({ c, onPick, onClose, initial }) {
  const mapRef = useRef(null); const mapObjRef = useRef(null);
  const [address, setAddress] = useState(""); const [loadingAddr, setLoadingAddr] = useState(false);
  const [coords, setCoords] = useState(initial && initial.lat ? [initial.lat, initial.lng] : SAREIN_CENTER);
  const reverseGeocode = async (lat, lng) => {
    setCoords([lat, lng]);
    setLoadingAddr(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fa`);
      const data = await res.json();
      const a = data.address || {};
      const parts = [
        a.road || a.pedestrian || a.footway,
        a.neighbourhood || a.suburb || a.quarter,
        a.city || a.town || a.village || "سرعین",
      ].filter(Boolean);
      setAddress(parts.length ? parts.join("، ") : (data.display_name || "سرعین، آدرس دقیق یافت نشد"));
    } catch { setAddress("سرعین، آدرس دقیق یافت نشد"); }
    setLoadingAddr(false);
  };
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapObjRef.current) return;
      const start = initial && initial.lat ? [initial.lat, initial.lng] : SAREIN_CENTER;
      const map = L.map(mapRef.current, { attributionControl: false }).setView(start, initial && initial.lat ? 16 : 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "" }).addTo(map);
      const marker = L.marker(start, { draggable: true }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); reverseGeocode(p.lat, p.lng); });
      map.on("click", (e) => { marker.setLatLng(e.latlng); reverseGeocode(e.latlng.lat, e.latlng.lng); });
      mapObjRef.current = map; reverseGeocode(start[0], start[1]);
    });
    return () => { cancelled = true; if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; } };
  }, []);
  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center flora-pop" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full flora-sheet" style={{ ...glass(c, RAD.lg), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ paddingInline: SP.xl, paddingBlock: SP.md, borderBottom: `1px solid ${c.border}` }}>
          <h3 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>انتخاب آدرس از نقشه سرعین</h3>
          <button onClick={onClose} className="press w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button>
        </div>
        <div ref={mapRef} style={{ width: "100%", height: 300, background: c.surface2 }} />
        <div style={{ padding: SP.lg }} dir="rtl">
          <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.xs }}>روی نقشه لمس کن یا نشانگر را جابه‌جا کن</p>
          <p style={{ fontSize: FS.body, fontWeight: FW.medium, minHeight: 20, color: c.ink }}>{loadingAddr ? "در حال یافتن آدرس..." : address}</p>
          <button onClick={() => onPick({ address, lat: coords[0], lng: coords[1] })} disabled={!address || loadingAddr} className="press w-full" style={{ marginTop: SP.md, borderRadius: RAD.md, paddingBlock: SP.md, background: !address || loadingAddr ? c.surface2 : c.primary, color: !address || loadingAddr ? c.muted : "#fff", fontWeight: FW.bold, fontSize: FS.body + 1 }}>تایید این آدرس</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Form sheet router ----------
function FormSheet({ sheetVal, ctx, onClose }) {
  const kind = typeof sheetVal === "string" ? sheetVal : sheetVal.kind;
  const editId = typeof sheetVal === "object" ? sheetVal.editId : null;
  const customerId = typeof sheetVal === "object" ? sheetVal.customerId : null;
  const dealId = typeof sheetVal === "object" ? sheetVal.dealId : null;
  const prefillDealId = typeof sheetVal === "object" ? sheetVal.prefillDealId : null;
  if (kind === "property") return <PropertyForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "customer") return <CustomerForm ctx={ctx} onClose={onClose} />;
  if (kind === "owner") return <OwnerForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "builder") return <BuilderForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "builder-broadcast") return <BuilderBroadcastSheet ctx={ctx} onClose={onClose} />;
  if (kind === "voice-note") return <VoiceNoteSheet ctx={ctx} onClose={onClose} />;
  if (kind === "appointment") return <AppointmentForm ctx={ctx} onClose={onClose} />;
  if (kind === "call") return <CallForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "ai-settings") return <AiSettingsSheet ctx={ctx} onClose={onClose} />;
  if (kind === "messages") return <MessageTemplatesSheet ctx={ctx} onClose={onClose} customerId={customerId} />;
  if (kind === "deal") return <DealForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "payment") return <PaymentForm ctx={ctx} onClose={onClose} prefillDealId={prefillDealId} editId={editId} />;
  if (kind === "deal-detail") return <DealDetailSheet ctx={ctx} onClose={onClose} dealId={dealId} />;
  if (kind === "income") return <OfficeEntryForm ctx={ctx} onClose={onClose} editId={editId} mode="income" />;
  if (kind === "expense") return <OfficeEntryForm ctx={ctx} onClose={onClose} editId={editId} mode="expense" />;
  return null;
}

function AiSettingsSheet({ ctx, onClose }) {
  const { c, aiProvider, setAiProvider, geminiKey, setGeminiKey, openaiKey, setOpenaiKey, grokKey, setGrokKey, avalaiKey, setAvalaiKey, avalaiModel, setAvalaiModel, agentName, setAgentName, notify } = ctx;
  const [provider, setProvider] = useState(aiProvider);
  const [gKey, setGKey] = useState(geminiKey || "");
  const [oKey, setOKey] = useState(openaiKey || "");
  const [xKey, setXKey] = useState(grokKey || "");
  const [aKey, setAKey] = useState(avalaiKey || "");
  const [aModel, setAModel] = useState(avalaiModel || "gpt-4o-mini");
  const [name, setName] = useState(agentName || "");
  const providers = [
    { id: "avalai", label: "اول‌ای‌آی", hint: "درگاه ایرانی، از داخل ایران بدون فیلترشکن کار می‌کند و به همه‌ی مدل‌ها دسترسی دارد — کلید: avalai.ir" },
    { id: "gemini", label: "Gemini", hint: "کلید رایگان: aistudio.google.com — ممکن است از ایران بدون فیلترشکن کار نکند" },
    { id: "openai", label: "GPT", hint: "کلید: platform.openai.com — ممکن است مرورگر تماس مستقیم را مسدود کند (CORS)" },
    { id: "grok", label: "Grok", hint: "کلید: console.x.ai — ممکن است مرورگر تماس مستقیم را مسدود کند" },
  ];
  const AVALAI_MODELS = [
    { value: "gpt-4o-mini", label: "GPT-4o mini (ارزان و سریع)" },
    { value: "gpt-4o", label: "GPT-4o (قوی‌تر)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "claude-3-5-sonnet-20240620-v1:0", label: "Claude 3.5 Sonnet" },
    { value: "deepseek-chat", label: "DeepSeek" },
  ];
  const keyByProvider = { avalai: aKey, openai: oKey, grok: xKey, gemini: gKey };
  const setKeyByProvider = { avalai: setAKey, openai: setOKey, grok: setXKey, gemini: setGKey };
  const currentKey = keyByProvider[provider];
  const setCurrentKey = setKeyByProvider[provider];
  return (
    <SheetShell c={c} title="تنظیمات هوش مصنوعی" onClose={onClose}>
      <Field c={c} label="نام تو (برای خطاب دستیار، اختیاری)"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً مجید" /></Field>
      <Field c={c} label="ارائه‌دهنده">
        <div className="grid grid-cols-2" style={{ gap: SP.sm }}>
          {providers.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} className="press rounded-lg" style={{ paddingBlock: 10, background: provider === p.id ? c.primary : c.surface2, color: provider === p.id ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.caption, position: "relative" }}>
              {p.id === "avalai" && provider !== "avalai" && <span style={{ position: "absolute", top: -6, right: 6, fontSize: 8, background: c.success, color: "#fff", padding: "1px 6px", borderRadius: RAD.pill }}>پیشنهادی</span>}
              {p.label}
            </button>
          ))}
        </div>
      </Field>
      {provider === "avalai" && (
        <Field c={c} label="مدل">
          <Select c={c} value={aModel} onChange={(e) => setAModel(e.target.value)} placeholder="انتخاب مدل" options={AVALAI_MODELS} />
        </Field>
      )}
      <Field c={c} label="کلید API"><input style={inputStyle(c)} dir="ltr" value={currentKey} onChange={(e) => setCurrentKey(e.target.value)} placeholder="کلید را اینجا وارد کن" /></Field>
      <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.9, marginBottom: SP.md }}>{providers.find((p) => p.id === provider)?.hint} — کلید فقط روی همین گوشی ذخیره می‌شود.</p>
      <SubmitBtn c={c} label="ذخیره" disabled={!currentKey.trim()} onClick={() => {
        setAiProvider(provider); setGeminiKey(gKey.trim()); setOpenaiKey(oKey.trim()); setGrokKey(xKey.trim()); setAvalaiKey(aKey.trim()); setAvalaiModel(aModel); setAgentName(name.trim());
        notify("تنظیمات هوش مصنوعی ذخیره شد"); onClose();
      }} />
    </SheetShell>
  );
}

// ---------- Ready-made persuasive message templates ----------
const AGENCY_SIGNATURE = "قبادی – املاک گنجینه";
const AGENCY_ADDRESS = "سرعین، میدان دانش، روبه‌روی هتل قصر، سایت املاک گنجینه، جنب رستوران خاتای";
const MESSAGE_TEMPLATES = [
  {
    id: "appointment_set", label: "تنظیم قرار ملاقات", icon: CalendarDays,
    needsProperty: true, needsTime: false,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nوقت بخیر. برای بازدید از ${v.property || "فایل مورد نظر"} می‌تونیم قرار بذاریم. هر روز و ساعتی که براتون راحت‌تره بگید تا هماهنگ کنم؛ منتظر دیدارتون هستم.\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "appointment_reminder", label: "یادآوری ساعت قرار", icon: Bell,
    needsProperty: false, needsTime: true,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nیادآوری می‌کنم قرار بازدیدمون امروز ساعت ${v.time || "..."} است. منتظرتون هستم، خوشحال می‌شم سر وقت باشید تا با آرامش همه‌چیز رو با هم ببینیم.\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "followup_choice", label: "پیگیری از فایل‌های بازدیدشده", icon: Building2,
    needsProperty: false, needsTime: false,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nامیدوارم فایل‌هایی که با هم دیدیم پسندتون اومده باشه.${v.viewed ? ` (${v.viewed})` : ""} اگه سوالی هست یا خواستید مقایسه‌شون کنیم در خدمتم؛ فقط بگید کدوم بیشتر به دلتون نشسته تا کارهای بعدی رو شروع کنیم.\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "send_address", label: "ارسال آدرس دفتر", icon: MapPin,
    needsProperty: false, needsTime: false,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nآدرس دفتر: ${AGENCY_ADDRESS}.\nمنتظر دیدارتون هستم 🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "deal_not_done", label: "وقتی معامله انجام نشد", icon: MessageSquare,
    needsProperty: false, needsTime: false,
    build: (v) => `${v.name ? `${v.name} عزیز 🌿\n` : ""}صادقانه خیلی دوست داشتم باهم همکاری کنیم، ناراحتم که این بار نشد که همکاری لازم رو داشته باشیم. بازم دوست دارم شماره‌تون رو هر لحظه رو گوشیم ببینم 🙏🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "invite_office", label: "دعوت گرم به دفتر", icon: Home,
    needsProperty: false, needsTime: false,
    build: (v) => `این چه حرفیه ${v.name || "دوست"} عزیز، شما تاج سرید و قدمتون روی چشم. بنده همه‌جوره در خدمتتون هستم.\nتشریف بیارید دفتر، دور هم یه چای بخوریم و گپ بزنیم، بعدش بریم چند تا فایل واقعاً تک و شکار رو ببینیم که وقت ارزشمندتون هم گرفته نشه. خیالتون راحت باشه، سیر تا پیاز کار رو راهنماییتون می‌کنم.\nان‌شاءالله شما هم بشید یکی از همشهری‌های خوب و همسایه‌های درجه‌یک خودمون. 🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "exclusive_files", label: "فایل‌های ویژه و محرمانه", icon: BadgeCheck,
    needsProperty: false, needsTime: false,
    build: (v) => `جناب ${v.name || "دوست"} عزیز، این فایل‌هایی که خدمتتون فرستادم، صرفاً برای آشنایی با حدود قیمت و متراژ بود.\nراستش ۲ فایل کاملاً منحصربه‌فرد و شخصی‌سازی‌شده دیگه دارم که به دلیل اصرار مالک، اجازه‌ی ارسال عکس و اطلاعاتشون رو در فضای مجازی ندارم. شرایط این موارد هم به‌شدت جذابه.\nاگه یه سر تشریف بیارید دفتر، از نزدیک کامل خدمتتون توضیح می‌دم. 🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "welcome_sarein", label: "خوش‌آمد به سرعین", icon: MapPin,
    needsProperty: false, needsTime: false,
    build: (v) => `${v.name || "دوست"} عزیز، خوش اومدید به سرعین 🌿\nهر وقت گذرتون به سرعین افتاد، بدون هیچ تعارفی یه زنگ به من بزنید؛ چه برای ملک، چه برای یه راهنمایی ساده یا حتی یه چای گرم در دفتر. من اینجا خدمتگزار شما هستم و دوست دارم اولین کسی باشم که بهش فکر می‌کنید. 🙏🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "thanks_visit", label: "تشکر بعد از بازدید", icon: BadgeCheck,
    needsProperty: false, needsTime: false,
    build: (v) => `${v.name || "دوست"} عزیز، از اینکه وقت ارزشمندتون رو گذاشتید و تشریف آوردید، واقعاً ممنونم 🌹\nهر سوال یا تردیدی درباره‌ی فایل‌هایی که دیدیم داشتید، بی‌رودربایستی بگید. من اینجام که خیالتون از هر جهت راحت بشه، نه فقط تا یه معامله جوش بخوره.${v.viewed ? `\n(فایل‌های بازدیدشده: ${v.viewed})` : ""}\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "special_opportunity", label: "فرصت ویژه و فوری", icon: TrendingUp,
    needsProperty: true, needsTime: false,
    build: (v) => `${v.name || "دوست"} عزیز، سلام 🌿\nیه مورد پیدا شد که اول از همه یاد شما افتادم: ${v.property || "یک فایل ویژه"}.\nشرایطش واقعاً استثناییه و صادقانه بگم، این‌جور موارد معمولاً خیلی زود جمع می‌شن. اگه دوست داشتید، هماهنگ کنم یه بازدید بذاریم؟ 🙏\n${AGENCY_SIGNATURE}`,
  },
];

function MessageTemplatesSheet({ ctx, onClose, customerId }) {
  const { c, customers, appointments, properties, notify } = ctx;
  const presetCu = customerId ? customers.find((cu) => cu.id === customerId) : null;
  const [name, setName] = useState(presetCu?.name || "");
  const [phone, setPhone] = useState(presetCu?.phone || "");
  const [activeId, setActiveId] = useState(MESSAGE_TEMPLATES[0].id);
  const [propertyId, setPropertyId] = useState("");
  const [time, setTime] = useState("");
  const [text, setText] = useState("");

  const viewedTitles = useMemo(() => {
    if (!presetCu) return "";
    const ids = appointments.filter((a) => a.customerId === presetCu.id || a.customerName === presetCu.name).map((a) => a.propertyId);
    const titles = properties.filter((p) => ids.includes(p.id)).map((p) => p.title);
    return titles.join(" و ");
  }, [presetCu, appointments, properties]);

  const active = MESSAGE_TEMPLATES.find((t) => t.id === activeId);
  useEffect(() => {
    const propTitle = properties.find((p) => p.id === propertyId)?.title || "";
    setText(active.build({ name, property: propTitle, time, viewed: viewedTitles }));
  }, [activeId, name, propertyId, time]);

  return (
    <SheetShell c={c} title="پیام‌های آماده" onClose={onClose}>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3.5">
        {MESSAGE_TEMPLATES.map((t) => {
          const isActive = activeId === t.id;
          return (
            <button key={t.id} onClick={() => setActiveId(t.id)} className="press shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5" style={isActive ? { background: c.primary } : glass(c, 20)}>
              <t.icon size={16} color={isActive ? "#fff" : c.muted} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} placeholder="اختیاری" /></Field>
        <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="اختیاری" /></Field>
      </div>
      {active.needsProperty && <Field c={c} label="فایل ملک"><Select c={c} value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="انتخاب فایل" options={properties.map((p) => ({ value: p.id, label: p.title }))} /></Field>}
      {active.needsTime && <Field c={c} label="ساعت قرار"><input type="time" style={inputStyle(c)} value={time} onChange={(e) => setTime(e.target.value)} /></Field>}

      <Field c={c} label="متن پیام (قابل ویرایش)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} style={{ ...inputStyle(c), resize: "vertical", lineHeight: 1.9 }} />
      </Field>

      <div className="flex gap-2">
        <button onClick={() => { navigator.clipboard?.writeText(text); notify("متن کپی شد"); }} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.surface2, color: c.ink, fontWeight: 700, fontSize: 12 }}>کپی متن</button>
        <a href={smsLink(phone, text) || "#"} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12, opacity: phone ? 1 : 0.5, pointerEvents: phone ? "auto" : "none" }}><MessageSquare size={13} /> پیامک</a>
        <a href={waLink(phone, text) || "#"} target="_blank" rel="noreferrer" className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.successSoft, color: c.success, fontWeight: 700, fontSize: 12, opacity: phone ? 1 : 0.5, pointerEvents: phone ? "auto" : "none" }}><Send size={13} /> واتساپ</a>
      </div>
    </SheetShell>
  );
}


// Pre-sale terms. Percentages are computed from the total price rather than typed, so the
// three instalments can't silently stop adding up to the deal.
function PreSaleFields({ c, f, setF, total }) {
  const down = toNum(f.preDown), delivery = toNum(f.preDelivery), deed = toNum(f.preDeed);
  const pct = (v) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  const sum = down + delivery + deed;
  const diff = total - sum;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="rounded-2xl p-3.5 mb-4" style={{ ...glass(c, 22), background: `linear-gradient(160deg, ${c.purpleSoft}, ${c.surface} 60%)` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.purpleSoft }}><Hammer size={13} color={c.purple} /></div>
        <p style={{ fontSize: 12.5, fontWeight: 700 }}>شرایط پیش‌فروش</p>
      </div>

      <Field c={c} label="مبلغ پرداخت اولیه (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preDown} onChange={set("preDown")} placeholder="مثلاً 3000000000" />
        <p style={{ fontSize: 10.5, color: c.purple, fontWeight: 700, marginTop: 5 }}>{fmtToman(down)} {total ? `— ${faDigits(pct(down))}% کل` : ""}</p>
      </Field>

      <Field c={c} label="مبلغ موقع تحویل (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preDelivery} onChange={set("preDelivery")} placeholder="مبلغ پرداخت هنگام تحویل" />
        <p style={{ fontSize: 10.5, color: c.purple, fontWeight: 700, marginTop: 5 }}>{fmtToman(delivery)} {total ? `— ${faDigits(pct(delivery))}% کل` : ""}</p>
      </Field>

      <Field c={c} label="مبلغ موقع سند (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preDeed} onChange={set("preDeed")} placeholder="مبلغ پرداخت هنگام سند" />
        <p style={{ fontSize: 10.5, color: c.purple, fontWeight: 700, marginTop: 5 }}>{fmtToman(deed)} {total ? `— ${faDigits(pct(deed))}% کل` : ""}</p>
      </Field>

      <Field c={c} label="زمان تحویل پروژه (ماه)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preMonths} onChange={set("preMonths")} placeholder="مثلاً 18" />
        {toNum(f.preMonths) > 0 && <p style={{ fontSize: 10.5, color: c.muted, marginTop: 5 }}>تحویل حدود {faDigits(toNum(f.preMonths))} ماه دیگر</p>}
      </Field>

      <Field c={c} label="مرحله ساخت">
        <div className="flex flex-wrap gap-1.5">
          {BUILD_STAGES.map((st) => {
            const active = f.buildStage === st;
            return <button key={st} type="button" onClick={() => setF((p) => ({ ...p, buildStage: st }))} className="press rounded-lg px-2.5 py-1.5"
              style={{ background: active ? c.purple : c.surface2, color: active ? "#fff" : c.muted, fontWeight: 700, fontSize: 10 }}>{st}</button>;
          })}
        </div>
      </Field>

      {/* Reconciliation: the three instalments must equal the total price */}
      {total > 0 && (
        <div className="rounded-xl p-3" style={{ background: c.surface2 }}>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 10.5, color: c.muted }}>جمع سه پرداخت</span>
            <span style={{ fontSize: 11, fontWeight: 800, direction: "ltr" }}>{fmtToman(sum)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: 10.5, color: c.muted }}>قیمت کل فایل</span>
            <span style={{ fontSize: 11, fontWeight: 800, direction: "ltr" }}>{fmtToman(total)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: c.border, marginTop: 8, overflow: "hidden", display: "flex" }}>
            {[down, delivery, deed].map((v, i) => (
              <div key={i} style={{ width: `${total ? Math.min(100, (v / total) * 100) : 0}%`, background: [c.success, c.primary, c.purple][i], transition: "width .5s ease" }} />
            ))}
          </div>
          <p className="flex items-center gap-1.5" style={{ fontSize: 10, marginTop: 7, color: Math.abs(diff) < 1 ? c.success : c.attn, fontWeight: 700 }}>
            {Math.abs(diff) < 1 ? <><BadgeCheck size={11} /> جمع پرداخت‌ها با قیمت کل برابر است</> : <><AlertTriangle size={11} /> {diff > 0 ? `${fmtToman(diff)} کمتر از قیمت کل` : `${fmtToman(-diff)} بیشتر از قیمت کل`}</>}
          </p>
        </div>
      )}
    </div>
  );
}

function PropertyForm({ ctx, onClose, editId }) {
  const { c, owners, setOwners, builders, properties, setProperties, notify, setMapPicker } = ctx;
  const editing = editId ? properties.find((x) => x.id === editId) : null;
  const editOwner = editing ? owners.find((o) => o.id === editing.ownerId) : null;
  const [f, setF] = useState(editing ? {
    title: editing.title, type: editing.type, deal: editing.deal, pricePerMeter: String(editing.pricePerMeter), area: String(editing.area),
    rooms: String(editing.rooms), floor: String(editing.floor || 1), furnished: editing.furnished || "بدون لوازم", address: editing.address,
    ownerName: editOwner?.name || "", ownerPhone: editOwner?.phone || "", builderId: editing.builderId || "", lat: editing.lat, lng: editing.lng,
    preDown: String(editing.preDown || ""), preMonths: String(editing.preMonths || ""), preDelivery: String(editing.preDelivery || ""), preDeed: String(editing.preDeed || ""), buildStage: editing.buildStage || BUILD_STAGES[0],
  } : { title: "", type: "آپارتمان", deal: "فروش", pricePerMeter: "", area: "", rooms: "", floor: "1", furnished: "بدون لوازم", address: "", ownerName: "", ownerPhone: "", builderId: "", lat: null, lng: null, preDown: "", preMonths: "", preDelivery: "", preDeed: "", buildStage: BUILD_STAGES[0] });
  const [media, setMedia] = useState(editing?.media || []);
  const [uploading, setUploading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showDivar, setShowDivar] = useState(false);
  const [divarLink, setDivarLink] = useState("");
  const [divarText, setDivarText] = useState("");
  const [divarImg1, setDivarImg1] = useState("");
  const [divarImg2, setDivarImg2] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = toNum(f.pricePerMeter) * toNum(f.area);
  const valid = f.title && f.pricePerMeter && f.area;
  const isPreSale = f.deal === "پیش‌فروش";

  const addMedia = async (fileList) => { setUploading(true); const items = await filesToMedia(fileList); setMedia((prev) => [...prev, ...items]); setUploading(false); };
  const openMapPicker = () => setMapPicker({
    initial: { lat: f.lat, lng: f.lng },
    onPick: ({ address, lat, lng }) => { setF((prev) => ({ ...prev, address, lat, lng })); setMapPicker(null); },
  });

  const extractFromDivar = () => {
    if (!divarText.trim()) { notify("متن آگهی را پیست کن"); return; }
    const parsed = parseDivarText(divarText);
    setF((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])), address: prev.address }));
    const imgs = [divarImg1, divarImg2].filter(Boolean).slice(0, 2).map((url) => ({ id: uid(), type: "image", url, external: true }));
    if (imgs.length) setMedia((prev) => [...prev, ...imgs]);
    setShowDivar(false);
    notify("اطلاعات استخراج شد — پایین فرم را برای تایید بررسی کن");
  };

  const submit = () => {
    let ownerId = editing?.ownerId || "";
    const nm = f.ownerName.trim(), ph = f.ownerPhone.trim();
    if (nm) {
      const existing = owners.find((o) => o.name.trim() === nm && (o.phone || "").trim() === ph);
      if (existing) ownerId = existing.id;
      else { const newOwner = { id: uid(), name: nm, phone: ph }; setOwners((prev) => [newOwner, ...prev]); ownerId = newOwner.id; }
    } else ownerId = "";
    const payload = {
      title: f.title, type: f.type, deal: f.deal, address: f.address, builderId: f.builderId, furnished: f.furnished,
      pricePerMeter: toNum(f.pricePerMeter), area: toNum(f.area), rooms: toNum(f.rooms), floor: toNum(f.floor), price: total, ownerId, media, lat: f.lat ?? null, lng: f.lng ?? null,
      preDown: toNum(f.preDown), preMonths: toNum(f.preMonths), preDelivery: toNum(f.preDelivery), preDeed: toNum(f.preDeed), buildStage: f.buildStage,
    };
    if (editing) {
      setProperties((prev) => prev.map((x) => x.id === editId ? { ...x, ...payload } : x));
      notify("تغییرات فایل ذخیره شد");
    } else {
      setProperties((prev) => [{ id: uid(), stage: "فعال", desc: "", createdAt: new Date().toISOString(), ...payload }, ...prev]);
      notify("فایل با موفقیت ثبت شد");
    }
    onClose();
  };

  return (
    <SheetShell c={c} title={editing ? "ویرایش فایل ملک" : "ثبت فایل ملک"} onClose={onClose}>
      {!editing && (
        <button type="button" onClick={() => setShowDivar((s) => !s)} className="press w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-3.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12.5 }}>
          <Link2 size={15} /> ورود از لینک دیوار
        </button>
      )}
      {showDivar && (
        <div className="rounded-xl p-3.5 mb-4" style={glass(c, 22)}>
          <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.9, marginBottom: 10 }}>
            دیوار اجازه‌ی دریافت خودکار اطلاعات را نمی‌دهد، پس این بخش را خودت باید پر کنی: صفحه‌ی آگهی را در دیوار باز کن، همه‌ی متنش را کپی کن و اینجا پیست کن.
          </p>
          <Field c={c} label="لینک دیوار (فقط یادداشت)"><input style={inputStyle(c)} dir="ltr" value={divarLink} onChange={(e) => setDivarLink(e.target.value)} placeholder="https://divar.ir/v/..." /></Field>
          <Field c={c} label="متن کامل آگهی">
            <textarea value={divarText} onChange={(e) => setDivarText(e.target.value)} rows={5} placeholder="متن آگهی را از صفحه‌ی دیوار کپی و اینجا پیست کن..." style={{ ...inputStyle(c), resize: "vertical" }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field c={c} label="لینک تصویر ۱ (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={divarImg1} onChange={(e) => setDivarImg1(e.target.value)} placeholder="روی عکس نگه‌دار → کپی لینک تصویر" /></Field>
            <Field c={c} label="لینک تصویر ۲ (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={divarImg2} onChange={(e) => setDivarImg2(e.target.value)} placeholder="..." /></Field>
          </div>
          <button type="button" onClick={extractFromDivar} className="press w-full rounded-xl py-3 flex items-center justify-center gap-2" style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
            <Wand2 size={15} /> استخراج اطلاعات
          </button>
        </div>
      )}
      <Field c={c} label="عکس و فیلم فایل"><MediaGallery c={c} media={media} uploading={uploading} onAdd={addMedia} onRemove={(mid) => setMedia((p) => p.filter((m) => m.id !== mid))} onView={() => {}} /></Field>
      <Field c={c} label="عنوان فایل"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder="مثلاً آپارتمان ۹۰ متری تهرانپارس" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نوع ملک"><Select c={c} value={f.type} onChange={set("type")} placeholder="انتخاب کنید" options={["آپارتمان","ویلا","زمین","مغازه","اداری"].map(v=>({value:v,label:v}))} /></Field>
        <Field c={c} label="نوع معامله"><Select c={c} value={f.deal} onChange={set("deal")} placeholder="انتخاب کنید" options={["فروش","پیش‌فروش"].map(v=>({value:v,label:v}))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="متراژ (متر)"><input style={inputStyle(c)} inputMode="numeric" value={f.area} onChange={set("area")} placeholder="فارسی یا انگلیسی" /></Field>
        <Field c={c} label="قیمت هر متر (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.pricePerMeter} onChange={set("pricePerMeter")} placeholder="فارسی یا انگلیسی" /></Field>
      </div>
      <div className="rounded-2xl px-4 py-3 mb-3 flex items-center justify-between" style={{ background: c.primarySoft }}>
        <span style={{ fontSize: 12.5, color: c.primary, fontWeight: 700 }}>مبلغ کل (متراژ × قیمت هر متر)</span><span style={{ fontSize: 15, color: c.primary, fontWeight: 800 }}>{fmtToman(total)}</span>
      </div>
      <Field c={c} label="آدرس">
        <div className="flex gap-2">
          <input style={{ ...inputStyle(c), flex: 1 }} value={f.address} onChange={set("address")} placeholder="آدرس را بنویس یا از نقشه انتخاب کن" />
          <button type="button" onClick={openMapPicker} className="press shrink-0 rounded-2xl flex items-center justify-center gap-1.5 px-3" style={{ background: f.lat ? c.successSoft : c.primarySoft }}><MapPin size={16} color={f.lat ? c.success : c.primary} /></button>
        </div>
        {f.lat ? (
          <p className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: c.success, fontWeight: 700, marginTop: 6 }}>
            <BadgeCheck size={12} /> موقعیت روی نقشه ثبت شد
          </p>
        ) : (
          <p style={{ fontSize: 10.5, color: c.muted, marginTop: 6 }}>برای ثبت موقعیت دقیق روی نقشه، دکمه‌ی کنار را بزن</p>
        )}
      </Field>
      <button type="button" onClick={() => setShowMore((s) => !s)} className="press w-full flex items-center justify-between rounded-xl px-4 py-3 mb-3" style={{ background: c.surface2 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: c.ink }}>جزئیات بیشتر (اختیاری)</span>
        <ChevronDown size={16} color={c.muted} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
      </button>
      {showMore && (
        <div className="flora-rise">
          <div className="grid grid-cols-3 gap-3">
            <Field c={c} label="تعداد اتاق"><input style={inputStyle(c)} inputMode="numeric" value={f.rooms} onChange={set("rooms")} /></Field>
            <Field c={c} label="طبقه"><Select c={c} value={f.floor} onChange={set("floor")} placeholder="طبقه" options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: faDigits(i + 1) }))} /></Field>
            <Field c={c} label="لوازم"><Select c={c} value={f.furnished} onChange={set("furnished")} placeholder="وضعیت" options={["با لوازم","بدون لوازم"].map(v=>({value:v,label:v}))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field c={c} label="نام مالک"><input style={inputStyle(c)} value={f.ownerName} onChange={set("ownerName")} placeholder="اختیاری" /></Field>
            <Field c={c} label="شماره مالک"><input style={inputStyle(c)} dir="ltr" value={f.ownerPhone} inputMode="tel" onChange={set("ownerPhone")} placeholder="اختیاری" /></Field>
          </div>
        </div>
      )}
      {isPreSale && (
        <>
          <Field c={c} label="سازنده"><Select c={c} value={f.builderId} onChange={set("builderId")} placeholder="انتخاب سازنده" options={builders.map(b=>({value:b.id,label:b.name}))} /></Field>
          <PreSaleFields c={c} f={f} setF={setF} total={total} />
        </>
      )}
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره فایل"} disabled={!valid} onClick={submit} />
    </SheetShell>
  );
}

// The Contact Picker API works on Android Chrome but NOT iOS Safari. So the pick
// button only appears where it's actually supported — no dead button on iPhone.
const contactsSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
async function pickContact(onPick) {
  try {
    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (contacts && contacts[0]) {
      const cn = contacts[0];
      const phone = (cn.tel && cn.tel[0]) ? String(cn.tel[0]).replace(/\s/g, "") : "";
      const name = (cn.name && cn.name[0]) ? cn.name[0] : "";
      onPick({ name, phone });
    }
  } catch (e) { /* user cancelled or unsupported */ }
}

function PhoneField({ c, label, value, onChange, onPickContact }) {
  return (
    <Field c={c} label={label}>
      <div className="flex gap-2">
        <input style={{ ...inputStyle(c), flex: 1 }} dir="ltr" value={value} inputMode="tel" onChange={onChange} />
        {contactsSupported && (
          <button type="button" onClick={() => pickContact(onPickContact)} className="press shrink-0 rounded-2xl flex items-center justify-center px-3" style={{ background: c.primarySoft }}>
            <Users size={16} color={c.primary} />
          </button>
        )}
      </div>
    </Field>
  );
}

function CustomerForm({ ctx, onClose }) {
  const { c, setCustomers, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "", need: "", budget: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  const contactsSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
  const pickContact = async () => {
    if (!contactsSupported) { notify("مرورگر شما از انتخاب مستقیم مخاطب پشتیبانی نمی‌کند — شماره را دستی وارد کن"); return; }
    try {
      const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (contact) setF((prev) => ({ ...prev, name: contact.name?.[0] || prev.name, phone: contact.tel?.[0] || prev.phone }));
    } catch (e) { /* user cancelled */ }
  };
  return (
    <SheetShell c={c} title="ثبت مشتری" onClose={onClose}>
      {contactsSupported && (
        <button type="button" onClick={pickContact} className="press w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-3.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 12.5 }}>
          <UserCircle2 size={15} /> انتخاب از مخاطبین گوشی
        </button>
      )}
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" value={f.phone} inputMode="tel" onChange={set("phone")} /></Field>
      <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={f.need} onChange={set("need")} placeholder="مثلاً خرید آپارتمان ۲ خواب" /></Field>
      <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.budget} onChange={set("budget")} /></Field>
      <Field c={c} label="مرحله مشتری">
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {CUSTOMER_STAGES.map((st) => { const active = f.stage === st; return (
            <button key={st} type="button" onClick={() => setF({ ...f, stage: st })} className="press rounded-full" style={{ padding: `6px ${SP.md}px`, fontSize: FS.caption, fontWeight: FW.bold, background: active ? c.primary : c.surface2, color: active ? "#fff" : c.muted }}>{st}</button>
          ); })}
        </div>
      </Field>
      <SubmitBtn c={c} label="ذخیره مشتری" disabled={!valid} onClick={() => { setCustomers((prev) => [{ id: uid(), ...f, budget: toNum(f.budget), stage: f.stage || "در حال بررسی", lastContactAt: todayISO() }, ...prev]); notify("مشتری با موفقیت ثبت شد"); onClose(); }} />
    </SheetShell>
  );
}
function OwnerForm({ ctx, onClose, editId }) {
  const { c, owners, setOwners, notify } = ctx;
  const editing = editId ? owners.find((o) => o.id === editId) : null;
  const [f, setF] = useState(editing ? { name: editing.name, phone: editing.phone } : { name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title={editing ? "ویرایش مالک" : "ثبت مالک"} onClose={onClose}>
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" value={f.phone} inputMode="tel" onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره مالک"} disabled={!valid} onClick={() => {
        if (editing) setOwners((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x));
        else setOwners((prev) => [{ id: uid(), ...f }, ...prev]);
        notify(editing ? "تغییرات مالک ذخیره شد" : "مالک با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}
function BuilderBroadcastSheet({ ctx, onClose }) {
  const { c, builders, hasAiKey, callAI, notify, agencyName, agentName } = ctx;
  const OCCASIONS = ["عید نوروز", "عید فطر", "عید قربان", "یلدا", "تبریک عمومی", "تشکر از همکاری"];
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); return; }
    setLoading(true);
    try {
      const prompt = `یک پیام کوتاه و صمیمی و محترمانه به مناسبت «${occasion}» بنویس که یک مشاور املاک برای سازنده‌های همکارش می‌فرستد. از طرف ${agencyName || "دفتر املاک"}${agentName ? ` (${agentName})` : ""}. لحن گرم و حرفه‌ای، حداکثر ۳ خط، بدون جای خالی برای اسم (چون برای همه یکسان فرستاده می‌شود). فقط متن پیام را بده، بدون توضیح.`;
      const text = await callAI(prompt);
      setMsg(text.trim());
    } catch (e) { notify(`خطا: ${e.message || "نامشخص"}`); }
    setLoading(false);
  };

  const withPhone = builders.filter((b) => b.phone);
  return (
    <SheetShell c={c} title="پیام گروهی به سازنده‌ها" onClose={onClose}>
      <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>یک پیام بنویس یا با هوش مصنوعی بساز، بعد برای هر سازنده جدا با واتساپ یا پیامک بفرست.</p>
      <Field c={c} label="مناسبت">
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {OCCASIONS.map((o) => { const active = occasion === o; return (
            <button key={o} type="button" onClick={() => setOccasion(o)} className="press rounded-full" style={{ padding: `6px ${SP.md}px`, fontSize: FS.caption, fontWeight: FW.bold, background: active ? c.primary : c.surface2, color: active ? "#fff" : c.muted }}>{o}</button>
          ); })}
        </div>
      </Field>
      <button onClick={generate} disabled={loading} className="press w-full rounded-xl py-2.5 flex items-center justify-center gap-2 mb-3" style={{ background: c.primarySoft }}>
        {loading ? <Loader2 size={14} className="animate-spin" color={c.primary} /> : <Sparkles size={14} color={c.primary} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>{loading ? "در حال نوشتن..." : "ساخت پیام با هوش مصنوعی"}</span>
      </button>
      <Field c={c} label="متن پیام">
        <textarea style={{ ...inputStyle(c), minHeight: 90, resize: "none", lineHeight: 1.9 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="متن پیام تبریک..." />
      </Field>
      <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>{faDigits(withPhone.length)} سازنده با شماره — برای هرکدام جدا بفرست:</p>
      <div className="flex flex-col gap-2" style={{ maxHeight: 220, overflowY: "auto" }}>
        {withPhone.map((b) => (
          <div key={b.id} className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: c.surface2 }}>
            <div className="flex-1 min-w-0"><p style={{ fontSize: 12.5, fontWeight: 700 }}>{b.name}</p><p style={{ fontSize: 10, color: c.muted }} dir="ltr">{b.phone}</p></div>
            <a href={waLink(b.phone, msg) || "#"} target="_blank" rel="noreferrer" className={`press rounded-lg px-3 py-2 flex items-center gap-1 ${!msg ? "pointer-events-none opacity-40" : ""}`} style={{ background: c.successSoft }}><Send size={12} color={c.success} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.success }}>واتساپ</span></a>
            <a href={smsLink(b.phone, msg) || "#"} className={`press rounded-lg px-3 py-2 flex items-center gap-1 ${!msg ? "pointer-events-none opacity-40" : ""}`} style={{ background: c.primarySoft }}><MessageCircle size={12} color={c.primary} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.primary }}>پیامک</span></a>
          </div>
        ))}
        {withPhone.length === 0 && <EmptyLine c={c} text="هیچ سازنده‌ای شماره ندارد" />}
      </div>
    </SheetShell>
  );
}

function BuilderForm({ ctx, onClose, editId }) {
  const { c, builders, setBuilders, notify } = ctx;
  const editing = editId ? builders.find((b) => b.id === editId) : null;
  const [f, setF] = useState(editing ? { name: editing.name, phone: editing.phone } : { name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title={editing ? "ویرایش سازنده" : "ثبت سازنده"} onClose={onClose}>
      <Field c={c} label="نام شرکت / سازنده"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" value={f.phone} inputMode="tel" onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره سازنده"} disabled={!valid} onClick={() => {
        if (editing) setBuilders((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x));
        else setBuilders((prev) => [{ id: uid(), ...f }, ...prev]);
        notify(editing ? "تغییرات سازنده ذخیره شد" : "سازنده با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}
function AppointmentForm({ ctx, onClose }) {
  const { c, properties, customers, setAppointments, notify } = ctx;
  const [f, setF] = useState({ propertyId: "", customerName: "", date: todayISO(), time: "10:00", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.propertyId && f.customerName.trim() && f.date && f.time;
  return (
    <SheetShell c={c} title="ثبت قرار بازدید" onClose={onClose}>
      <Field c={c} label="فایل ملک"><Select c={c} value={f.propertyId} onChange={set("propertyId")} placeholder="انتخاب فایل" options={properties.map(p=>({value:p.id,label:p.title}))} /></Field>
      <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={f.customerName} onChange={set("customerName")} placeholder="نام مشتری را تایپ کن" /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="ساعت"><input type="time" style={inputStyle(c)} value={f.time} onChange={set("time")} /></Field>
      <Field c={c} label="یادداشت"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} /></Field>
      <SubmitBtn c={c} label="ذخیره قرار بازدید" disabled={!valid} onClick={() => {
        const match = customers.find((cu) => cu.name.trim() === f.customerName.trim());
        setAppointments((prev) => [{ id: uid(), propertyId: f.propertyId, customerId: match ? match.id : "", customerName: f.customerName.trim(), date: f.date, time: f.time, notes: f.notes }, ...prev]);
        notify("بازدید ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}
function CallForm({ ctx, onClose, editId }) {
  const { c, customers, calls, setCalls, notify } = ctx;
  const editing = editId ? calls.find((cl) => cl.id === editId) : null;
  const [f, setF] = useState(editing
    ? { customerName: editing.customerName || "", customerPhone: editing.customerPhone || "", date: editing.date, status: editing.status, notes: editing.notes || "" }
    : { customerName: "", customerPhone: "", date: todayISO(), status: "در انتظار پاسخ", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.customerName.trim();
  return (
    <SheetShell c={c} title={editing ? "ویرایش پیگیری تماس" : "ثبت پیگیری تماس"} onClose={onClose}>
      <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={f.customerName} onChange={set("customerName")} placeholder="نام مشتری را تایپ کن" /></Field>
      <Field c={c} label="شماره تماس (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={f.customerPhone} onChange={set("customerPhone")} /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="یادداشت تماس"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} placeholder="موضوع تماس..." /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره تماس"} disabled={!valid} onClick={() => {
        const match = customers.find((cu) => cu.name.trim() === f.customerName.trim());
        if (editing) {
          setCalls((prev) => prev.map((x) => x.id === editId ? { ...x, customerId: match ? match.id : "", customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), date: f.date, notes: f.notes } : x));
          notify("تغییرات تماس ذخیره شد");
        } else {
          setCalls((prev) => [{ id: uid(), customerId: match ? match.id : "", customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), date: f.date, status: f.status, notes: f.notes }, ...prev]);
          notify("تماس ثبت شد");
        }
        onClose();
      }} />
    </SheetShell>
  );
}

// Defined at module scope on purpose: nesting this inside DealForm made React treat it as a new
// component type on every keystroke, remounting the input and dropping focus after one character.
function CommissionField({ c, f, setF, side, label }) {
  const mode = side === "seller" ? f.sellerMode : f.buyerMode;
  const modeKey = side === "seller" ? "sellerMode" : "buyerMode";
  const pctKey = side === "seller" ? "sellerPct" : "buyerPct";
  const fixedKey = side === "seller" ? "sellerFixed" : "buyerFixed";
  const price = toNum(f.price);
  const breakdown = officialCommission(price);
  const previewAmount = mode === "official" ? breakdown.final
    : mode === "pct" ? Math.round(price * toDecimal(f[pctKey]) / 100)
    : toNum(f[fixedKey]);
  const modeBtn = (m, txt) => (
    <button type="button" onClick={() => setF((p) => ({ ...p, [modeKey]: m }))} className="press flex-1 rounded-lg py-1.5" style={{ background: mode === m ? c.primary : c.surface2, color: mode === m ? "#fff" : c.muted, fontWeight: 700, fontSize: 10 }}>{txt}</button>
  );
  return (
    <Field c={c} label={label}>
      <div className="flex gap-2 mb-2">
        {modeBtn("official", "فرمول رسمی")}
        {modeBtn("pct", "درصدی")}
        {modeBtn("fixed", "مبلغ ثابت")}
      </div>
      {mode === "official" ? (
        <div className="rounded-xl p-3" style={{ background: c.surface2 }}>
          <BreakdownRow c={c} label="ثمن معامله" value={breakdown.price} />
          {breakdown.excess > 0 && <BreakdownRow c={c} label="مبلغ مازاد (بالای ۱ میلیارد)" value={breakdown.excess} muted />}
          <BreakdownRow c={c} label="کمیسیون قبل از مالیات" value={breakdown.commission} />
          <BreakdownRow c={c} label="مالیات ۱۰٪" value={breakdown.tax} muted />
          <div className="flex items-center justify-between" style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${c.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: c.primary }}>مبلغ نهایی قابل پرداخت</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: c.primary, direction: "ltr" }}>{fmtToman(breakdown.final)}</span>
          </div>
          <p style={{ fontSize: 9.5, color: c.muted, marginTop: 8, lineHeight: 1.7 }}>۱ میلیارد اول: ۱۰ میلیون ثابت · مازاد: نیم درصد · سپس ۱۰٪ مالیات</p>
        </div>
      ) : mode === "pct"
        ? <input style={inputStyle(c)} inputMode="decimal" value={f[pctKey]} onChange={(e) => setF((p) => ({ ...p, [pctKey]: e.target.value }))} placeholder="مثلاً ۱" />
        : <input style={inputStyle(c)} inputMode="numeric" value={f[fixedKey]} onChange={(e) => setF((p) => ({ ...p, [fixedKey]: e.target.value }))} placeholder="مبلغ به تومان" />}
      {mode !== "official" && <p style={{ fontSize: 11, color: c.primary, fontWeight: 700, marginTop: 6 }}>{fmtToman(previewAmount)}</p>}
    </Field>
  );
}

function BreakdownRow({ c, label, value, muted }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: c.muted }}>{label}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: muted ? c.muted : c.ink, direction: "ltr" }}>{fmtToman(value)}</span>
    </div>
  );
}

function DealForm({ ctx, onClose, editId }) {
  const { c, properties, owners, deals, setDeals, notify } = ctx;
  const editing = editId ? deals.find((d) => d.id === editId) : null;
  const [f, setF] = useState(editing ? {
    propertyId: editing.propertyId || "", propertyTitle: editing.propertyTitle, sellerName: editing.sellerName || "", sellerPhone: editing.sellerPhone || "",
    buyerName: editing.buyerName || "", buyerPhone: editing.buyerPhone || "", price: String(editing.price),
    sellerMode: editing.sellerMode || "pct", sellerPct: String(editing.sellerPct || 0), sellerFixed: String(editing.sellerFixed || ""),
    buyerMode: editing.buyerMode || "pct", buyerPct: String(editing.buyerPct || 0), buyerFixed: String(editing.buyerFixed || ""),
    advisor: editing.advisor || "من", status: editing.status, dealDate: (editing.createdAt || todayISO()).slice(0, 10),
  } : { propertyId: "", propertyTitle: "", sellerName: "", sellerPhone: "", buyerName: "", buyerPhone: "", price: "", sellerMode: "official", sellerPct: "1", sellerFixed: "", buyerMode: "official", buyerPct: "0.5", buyerFixed: "", advisor: "من", status: "در حال مذاکره", dealDate: todayISO() });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onPickProperty = (e) => {
    const pid = e.target.value;
    const p = properties.find((x) => x.id === pid);
    const owner = p ? owners.find((o) => o.id === p.ownerId) : null;
    setF((prev) => ({ ...prev, propertyId: pid, propertyTitle: p?.title || prev.propertyTitle, price: p ? String(p.price) : prev.price, sellerName: owner?.name || prev.sellerName, sellerPhone: owner?.phone || prev.sellerPhone }));
  };
  const valid = f.propertyTitle.trim() && f.price;

  return (
    <SheetShell c={c} title={editing ? "ویرایش قرارداد" : "ثبت قرارداد جدید"} onClose={onClose}>
      {!editing && <Field c={c} label="فایل ملک (اختیاری)"><Select c={c} value={f.propertyId} onChange={onPickProperty} placeholder="انتخاب فایل برای پرکردن خودکار" options={properties.map((p) => ({ value: p.id, label: p.title }))} /></Field>}
      <Field c={c} label="عنوان معامله (می‌توانی مستقیم تایپ کنی)"><input style={inputStyle(c)} value={f.propertyTitle} onChange={set("propertyTitle")} placeholder="مثلاً ویلا تانیا — لواسان" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نام فروشنده"><input style={inputStyle(c)} value={f.sellerName} onChange={set("sellerName")} /></Field>
        <Field c={c} label="شماره فروشنده"><input style={inputStyle(c)} dir="ltr" value={f.sellerPhone} inputMode="tel" onChange={set("sellerPhone")} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نام خریدار"><input style={inputStyle(c)} value={f.buyerName} onChange={set("buyerName")} /></Field>
        <Field c={c} label="شماره خریدار"><input style={inputStyle(c)} dir="ltr" value={f.buyerPhone} inputMode="tel" onChange={set("buyerPhone")} /></Field>
      </div>
      <Field c={c} label="مبلغ معامله (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.price} onChange={set("price")} />
        <p style={{ fontSize: 11, color: c.muted, marginTop: 6 }}>{fmtToman(toNum(f.price))}</p>
      </Field>
      <CommissionField c={c} f={f} setF={setF} side="seller" label="کمیسیون فروشنده" />
      <CommissionField c={c} f={f} setF={setF} side="buyer" label="کمیسیون خریدار" />
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="مشاور"><input style={inputStyle(c)} value={f.advisor} onChange={set("advisor")} /></Field>
        <Field c={c} label="وضعیت"><Select c={c} value={f.status} onChange={set("status")} placeholder="انتخاب کنید" options={["در حال مذاکره", "در انتظار پرداخت", "تسویه شده"].map((v) => ({ value: v, label: v }))} /></Field>
      </div>
      <Field c={c} label="تاریخ قرارداد (برای ماه‌های قبل هم می‌توانی عقب ببری)">
        <JalaliDatePicker c={c} value={f.dealDate} onChange={(iso) => setF((p) => ({ ...p, dealDate: iso }))} />
      </Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره قرارداد"} disabled={!valid} onClick={() => {
        const payload = {
          propertyId: f.propertyId, propertyTitle: f.propertyTitle.trim(), sellerName: f.sellerName.trim(), sellerPhone: f.sellerPhone.trim(), buyerName: f.buyerName.trim(), buyerPhone: f.buyerPhone.trim(), price: toNum(f.price),
          sellerMode: f.sellerMode, sellerPct: toDecimal(f.sellerPct), sellerFixed: toNum(f.sellerFixed),
          buyerMode: f.buyerMode, buyerPct: toDecimal(f.buyerPct), buyerFixed: toNum(f.buyerFixed),
          advisor: f.advisor.trim() || "من", status: f.status,
        };
        const createdAt = new Date(`${f.dealDate}T12:00:00`).toISOString();
        if (editing) setDeals((prev) => prev.map((d) => d.id === editId ? { ...d, ...payload, createdAt } : d));
        else setDeals((prev) => [{ id: uid(), ...payload, createdAt }, ...prev]);
        notify(editing ? "تغییرات قرارداد ذخیره شد" : "قرارداد ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function PaymentForm({ ctx, onClose, prefillDealId, editId }) {
  const { c, deals, payments, setPayments, notify } = ctx;
  const editing = editId ? payments.find((p) => p.id === editId) : null;
  const [f, setF] = useState(editing
    ? { dealId: editing.dealId, payerType: editing.payerType, amount: String(editing.amount), date: editing.date, method: editing.method, tracking: editing.tracking || "", note: editing.note || "" }
    : { dealId: prefillDealId || "", payerType: "seller", amount: "", date: todayISO(), method: "card", tracking: "", note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.dealId && f.amount;
  return (
    <SheetShell c={c} title={editing ? "ویرایش پرداخت" : "ثبت پرداخت جدید"} onClose={onClose}>
      <Field c={c} label="انتخاب معامله"><Select c={c} value={f.dealId} onChange={set("dealId")} placeholder="انتخاب قرارداد" options={deals.map((d) => ({ value: d.id, label: d.propertyTitle }))} /></Field>
      <Field c={c} label="پرداخت‌کننده">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setF({ ...f, payerType: "seller" })} className="press rounded-xl py-2.5" style={{ background: f.payerType === "seller" ? c.primary : c.surface2, color: f.payerType === "seller" ? "#fff" : c.muted, fontWeight: 700, fontSize: 12 }}>فروشنده</button>
          <button type="button" onClick={() => setF({ ...f, payerType: "buyer" })} className="press rounded-xl py-2.5" style={{ background: f.payerType === "buyer" ? c.primary : c.surface2, color: f.payerType === "buyer" ? "#fff" : c.muted, fontWeight: 700, fontSize: 12 }}>خریدار</button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="مبلغ پرداختی (تومان)">
          <input style={inputStyle(c)} inputMode="numeric" value={f.amount} onChange={set("amount")} />
          <p style={{ fontSize: 10.5, color: c.muted, marginTop: 5 }}>{fmtToman(toNum(f.amount))}</p>
        </Field>
        <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      </div>
      <Field c={c} label="روش پرداخت">
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.id} type="button" onClick={() => setF({ ...f, method: m.id })} className="press rounded-xl py-2.5 flex flex-col items-center gap-1" style={{ background: f.method === m.id ? c.primary : c.surface2 }}>
              <m.icon size={14} color={f.method === m.id ? "#fff" : c.muted} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: f.method === m.id ? "#fff" : c.muted }}>{m.label}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field c={c} label="شماره پیگیری (اختیاری)"><input style={inputStyle(c)} value={f.tracking} onChange={set("tracking")} /></Field>
      <Field c={c} label="توضیحات (اختیاری)"><input style={inputStyle(c)} value={f.note} onChange={set("note")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ثبت پرداخت"} disabled={!valid} onClick={() => {
        const payload = { dealId: f.dealId, payerType: f.payerType, amount: toNum(f.amount), date: f.date, method: f.method, tracking: f.tracking.trim(), note: f.note.trim() };
        if (editing) setPayments((prev) => prev.map((p) => p.id === editId ? { ...p, ...payload } : p));
        else setPayments((prev) => [{ id: uid(), ...payload }, ...prev]);
        notify(editing ? "تغییرات پرداخت ذخیره شد" : "پرداخت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function DealDetailSheet({ ctx, onClose, dealId }) {
  const { c, deals, payments, setSheet, setDeals, notify } = ctx;
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) return null;
  const Block = ({ title, icon: Icon, side }) => {
    const mode = side === "seller" ? deal.sellerMode : deal.buyerMode;
    const commission = dealCommission(deal, side);
    const paid = dealPaid(deal, payments, side);
    const remaining = dealRemaining(deal, payments, side);
    const done = remaining === 0;
    return (
      <div className="rounded-xl p-3.5 mb-3" style={{ background: c.surface2 }}>
        <div className="flex items-center gap-2 mb-2.5"><Icon size={15} color={c.primary} /><p style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</p></div>
        <Row c={c} label={mode === "fixed" ? "نوع کمیسیون" : "درصد کمیسیون"} value={mode === "fixed" ? "مبلغ ثابت" : `${faDigits(side === "seller" ? deal.sellerPct : deal.buyerPct)}٪`} />
        <Row c={c} label="مبلغ کمیسیون" value={fmtToman(commission)} />
        <Row c={c} label="پرداخت شده" value={fmtToman(paid)} color={c.success} />
        <Row c={c} label="مانده بدهی" value={fmtToman(remaining)} color={done ? c.ink : c.attn} />
        <Row c={c} label="وضعیت" value={done ? "تسویه کامل" : "در انتظار تسویه"} color={done ? c.success : c.attn} />
      </div>
    );
  };
  return (
    <SheetShell c={c} title="جزئیات معامله" onClose={onClose}>
      <div className="flex items-start justify-between mb-1">
        <div><p style={{ fontSize: 14, fontWeight: 800 }}>{deal.propertyTitle}</p><p style={{ fontSize: 11.5, color: c.muted, marginTop: 3 }}>{fmtToman(deal.price)} · {deal.advisor}</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setSheet({ kind: "deal", editId: dealId })} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.primarySoft }}><Edit3 size={14} color={c.primary} /></button>
          <button onClick={() => { setDeals((prev) => prev.filter((d) => d.id !== dealId)); onClose(); notify("قرارداد حذف شد"); }} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.dangerSoft }}><Trash2 size={14} color={c.danger} /></button>
        </div>
      </div>
      <div style={{ height: 10 }} />
      <Block title="کمیسیون فروشنده" icon={UserCircle2} side="seller" />
      <Block title="کمیسیون خریدار" icon={Users} side="buyer" />
      <div className="flex gap-2 mt-2">
        {deal.status !== "تسویه شده" && (
          <button onClick={() => { setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, status: "تسویه شده" } : d)); notify("وضعیت به‌روزرسانی شد"); }} className="press flex-1 rounded-xl py-3" style={{ background: c.successSoft, color: c.success, fontWeight: 700, fontSize: 12.5 }}>علامت به‌عنوان تسویه‌شده</button>
        )}
        <button onClick={() => setSheet({ kind: "payment", prefillDealId: dealId })} className="press flex-1 rounded-xl py-3" style={{ background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: "#fff", fontWeight: 700, fontSize: 12.5 }}>ثبت پرداخت</button>
      </div>
    </SheetShell>
  );
}
function Row({ c, label, value, color }) {
  return <div className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: `1px solid ${c.border}` }}><span style={{ fontSize: 11.5, color: c.muted }}>{label}</span><span style={{ fontSize: 12, fontWeight: 700, color: color || c.ink }}>{value}</span></div>;
}

// One form handles both office income and office expense — same shape, different list/colors.
function OfficeEntryForm({ ctx, onClose, editId, mode }) {
  const { c, expenses, setExpenses, officeIncomes, setOfficeIncomes, notify } = ctx;
  const isIncome = mode === "income";
  const list = isIncome ? officeIncomes : expenses;
  const setList = isIncome ? setOfficeIncomes : setExpenses;
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const accent = isIncome ? c.success : c.danger;
  const editing = editId ? list.find((x) => x.id === editId) : null;
  const [f, setF] = useState(editing
    ? { category: editing.category || categories[0], title: editing.title || "", amount: String(editing.amount), date: editing.date, note: editing.note || "" }
    : { category: categories[0], title: "", amount: "", date: todayISO(), note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.title.trim() && f.amount;
  const title = editing ? (isIncome ? "ویرایش درآمد" : "ویرایش هزینه") : (isIncome ? "ثبت درآمد دفتر" : "ثبت هزینه دفتر");

  return (
    <SheetShell c={c} title={title} onClose={onClose}>
      <Field c={c} label="دسته‌بندی">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = f.category === cat;
            return (
              <button key={cat} type="button" onClick={() => setF({ ...f, category: cat })} className="press rounded-lg px-3 py-2"
                style={{ background: active ? accent : c.surface2, color: active ? "#fff" : c.muted, fontWeight: 700, fontSize: 10.5 }}>{cat}</button>
            );
          })}
        </div>
      </Field>
      <Field c={c} label="عنوان"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder={isIncome ? "مثلاً حق مشاوره قرارداد" : "مثلاً شارژ آگهی دیوار"} /></Field>
      <Field c={c} label="مبلغ (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.amount} onChange={set("amount")} placeholder="فارسی یا انگلیسی" />
        <p style={{ fontSize: 11, color: accent, fontWeight: 700, marginTop: 6 }}>{fmtToman(toNum(f.amount))}</p>
      </Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="توضیحات (اختیاری)"><input style={inputStyle(c)} value={f.note} onChange={set("note")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره"} disabled={!valid} onClick={() => {
        const payload = { category: f.category, title: f.title.trim(), amount: toNum(f.amount), date: f.date, note: f.note.trim() };
        if (editing) setList((prev) => prev.map((x) => x.id === editId ? { ...x, ...payload } : x));
        else setList((prev) => [{ id: uid(), ...payload }, ...prev]);
        notify(editing ? "تغییرات ذخیره شد" : (isIncome ? "درآمد ثبت شد" : "هزینه ثبت شد"));
        onClose();
      }} />
    </SheetShell>
  );
}
