import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, Building2, Users, Search, Plus, X, Moon, Sun, Sparkles, MapPin, Ruler,
  UserCircle2, PhoneCall, CheckCircle2, Loader2, Trash2, ImagePlus, Play,
  ChevronLeft, ChevronRight, Hammer, CalendarDays, Trees, Store, Briefcase,
  ArrowUpDown, BadgeCheck, Bell, MoreHorizontal, Calendar, ArrowRight,
  LayoutList, LayoutGrid, ChevronUp, Download, Upload, Building, Columns3, Edit3,
  MessageSquare, AlertTriangle, TrendingUp, Bot, RefreshCw, Send, Link2, Wand2, MessageCircle,
} from "lucide-react";

// ---------- Local persistence (IndexedDB) — keeps data on this device between visits ----------
const DB_NAME = "flora-crm-db", STORE = "kv", DATA_KEY = "flora-data", SETTINGS_KEY = "flora-settings", REMINDER_KEY = "flora-last-reminder", COPILOT_KEY = "flora-copilot", CHAT_KEY = "flora-ai-chat";
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

const toEnDigits = (s) => String(s ?? "").replace(/[۰-۹٠-٩]/g, (d) => {
  const p = "۰۱۲۳۴۵۶۷۸۹".indexOf(d); if (p > -1) return p;
  const a = "٠١٢٣٤٥٦٧٨٩".indexOf(d); return a > -1 ? a : d;
});
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
  else if (/رهن/.test(raw) && /اجاره/.test(raw)) deal = "رهن کامل";
  else if (/اجاره/.test(raw)) deal = "اجاره";
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
const fmtToman = (n) => (n ? Math.round(n).toLocaleString("fa-IR") : "۰") + " تومان";
const todayISO = () => new Date().toISOString().slice(0, 10);
const filesToMedia = (fileList) => Promise.all(Array.from(fileList).map((file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ id: uid(), type: file.type.startsWith("video") ? "video" : "image", url: reader.result, name: file.name });
  reader.readAsDataURL(file);
})));

const STAGES = ["فعال", "در حال مذاکره", "فروخته شد"];
const DEAL_FILTERS = ["همه", "فروش", "پیش‌فروش", "اجاره", "رهن کامل"];
const STAGE_FILTERS = ["همه", "فعال", "در حال مذاکره", "فروخته شد"];

// ---------- Glassmorphism tokens ----------
const T = {
  dark: {
    bg: "#0B0F1C", orb1: "#0B0F1C", orb2: "#0B0F1C",
    surface: "#141A2E", surface2: "#1A2138",
    border: "#262D45", ink: "#EAEDF6", muted: "#8A93AC",
    primary: "#3AA0FF", primarySoft: "rgba(58,160,255,0.14)",
    attn: "#FFB35C", attnSoft: "rgba(255,179,92,0.14)",
    danger: "#FF6B6F", dangerSoft: "rgba(255,107,111,0.14)",
    success: "#34D399", successSoft: "rgba(52,211,153,0.14)",
  },
  light: {
    bg: "#F4F6FB", orb1: "#F4F6FB", orb2: "#F4F6FB",
    surface: "#FFFFFF", surface2: "#F0F2F7",
    border: "#E3E7EF", ink: "#1B2436", muted: "#6B7386",
    primary: "#0B84FF", primarySoft: "#E7F2FF",
    attn: "#FF9F43", attnSoft: "#FFF1E2",
    danger: "#E5484D", dangerSoft: "#FDEBEC",
    success: "#22C55E", successSoft: "#E8F9EF",
  },
};
const glass = (c) => ({
  background: c.surface,
  border: `1px solid ${c.border}`,
  boxShadow: "0 1px 3px rgba(16,24,40,0.08)",
});

// ---------- Seed data ----------
const seedOwners = [{ id: "o1", name: "آقای رحیمی", phone: "09121234567" }, { id: "o2", name: "خانم صادقی", phone: "09351234567" }];
const seedBuilders = [{ id: "b1", name: "شرکت سازه پارس", phone: "02122223333" }];
const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString();
const seedProperties = [
  { id: "p1", title: "آپارتمان ۱۲۰ متری سعادت‌آباد", type: "آپارتمان", deal: "فروش", pricePerMeter: 70000000, price: 8400000000, area: 120, rooms: 2, floor: 3, furnished: "با لوازم", address: "سعادت‌آباد، خیابان سرو", ownerId: "o1", builderId: "", stage: "فعال", desc: "", media: [], createdAt: daysAgoISO(3) },
  { id: "p2", title: "ویلا دوبلکس لواسان", type: "ویلا", deal: "اجاره", pricePerMeter: 150000, price: 45000000, area: 300, rooms: 4, floor: 1, furnished: "بدون لوازم", address: "لواسان، جاده امام‌زاده", ownerId: "o2", builderId: "", stage: "در حال مذاکره", desc: "", media: [], createdAt: daysAgoISO(52) },
  { id: "p3", title: "پیش‌فروش برج مروارید", type: "آپارتمان", deal: "پیش‌فروش", pricePerMeter: 55000000, price: 4950000000, area: 90, rooms: 2, floor: 7, furnished: "بدون لوازم", address: "پونک، بلوار گلستان", ownerId: "", builderId: "b1", stage: "فعال", desc: "", media: [], createdAt: daysAgoISO(10) },
];
const seedCustomers = [
  { id: "c1", name: "مهدی کریمی", phone: "09190001122", need: "خرید آپارتمان ۲ خواب سعادت‌آباد", budget: 9000000000 },
  { id: "c2", name: "سارا محمدی", phone: "09380002233", need: "اجاره ویلا شمال یا لواسان", budget: 50000000 },
];
const seedAppointments = [{ id: "a1", propertyId: "p1", customerId: "c1", customerName: "مهدی کریمی", date: todayISO(), time: "17:00", notes: "بازدید اول" }];
const seedCalls = [{ id: "cl1", customerId: "c2", customerName: "سارا محمدی", customerPhone: "09380002233", date: todayISO(), status: "در انتظار پاسخ", notes: "پیگیری قیمت ویلا" }];

export default function FloraCRM() {
  const [dark, setDark] = useState(true);
  const c = dark ? T.dark : T.light;

  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null); // bottom-sheet forms
  const [detail, setDetail] = useState(null); // full-screen property/customer detail
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [mapPicker, setMapPicker] = useState(null); // separate overlay so it never closes the form underneath
  const [propStageHint, setPropStageHint] = useState("همه");

  const [properties, setProperties] = useState(seedProperties);
  const [owners, setOwners] = useState(seedOwners);
  const [builders, setBuilders] = useState(seedBuilders);
  const [customers, setCustomers] = useState(seedCustomers);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [calls, setCalls] = useState(seedCalls);
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [aiProvider, setAiProvider] = useState("gemini");
  const [agentName, setAgentName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showDailyReminder, setShowDailyReminder] = useState(false);

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
        }
        const settings = await dbGet(SETTINGS_KEY);
        if (settings?.geminiKey) setGeminiKey(settings.geminiKey);
        if (settings?.openaiKey) setOpenaiKey(settings.openaiKey);
        if (settings?.grokKey) setGrokKey(settings.grokKey);
        if (settings?.aiProvider) setAiProvider(settings.aiProvider);
        if (settings?.agentName) setAgentName(settings.agentName);
        const lastReminder = await dbGet(REMINDER_KEY);
        const today = todayISO();
        if (lastReminder !== today) { setShowDailyReminder(true); dbSet(REMINDER_KEY, today).catch(() => {}); }
      } catch (e) { console.error("Flora: load failed", e); }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (loaded) dbSet(DATA_KEY, { properties, owners, builders, customers, appointments, calls }).catch(() => {}); }, [loaded, properties, owners, builders, customers, appointments, calls]);
  useEffect(() => { if (loaded) dbSet(SETTINGS_KEY, { geminiKey, openaiKey, grokKey, aiProvider, agentName }).catch(() => {}); }, [loaded, geminiKey, openaiKey, grokKey, aiProvider, agentName]);

  const hasAiKey = (aiProvider === "gemini" && geminiKey) || (aiProvider === "openai" && openaiKey) || (aiProvider === "grok" && grokKey);
  const callAI = async (prompt) => {
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

  const exportBackup = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), properties, owners, builders, customers, appointments, calls };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `flora-backup-${todayISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify("فایل بکاپ دانلود شد");
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
    notify, setDetail, setTab, setSheet, setLightbox, setMapPicker, geminiKey, setGeminiKey,
    openaiKey, setOpenaiKey, grokKey, setGrokKey, aiProvider, setAiProvider, hasAiKey, callAI, agentName, setAgentName,
    scheduleReminder, goProperties, exportBackup, importBackup,
  };

  if (!loaded) {
    return (
      <div dir="rtl" style={{ background: c.bg, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex items-center justify-center">
        <Loader2 size={22} className="animate-spin" color={c.primary} />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: c.bg, color: c.ink, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex justify-center relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        .press { transition: transform .16s cubic-bezier(.34,1.56,.64,1); }
        .press:active { transform: scale(0.96); }
        @keyframes floraUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
        @keyframes floraSheet { from { transform: translateY(100%);} to { transform: translateY(0);} }
        @keyframes floraPop { from { opacity:0; transform: scale(.95);} to { opacity:1; transform: scale(1);} }
        @keyframes floraPulse { 0%,100% { opacity:1; transform:scale(1);} 50% { opacity:.4; transform:scale(.8);} }
        .flora-up { animation: floraUp .3s cubic-bezier(.22,1,.36,1) both; }
        .flora-sheet { animation: floraSheet .32s cubic-bezier(.22,1,.36,1) both; }
        .flora-pop { animation: floraPop .2s ease both; }
        .flora-pulse { animation: floraPulse 1.6s ease-in-out infinite; }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>


      {/* iPhone 13 Pro sized frame (390 × 844 logical points) */}
      <div className="w-full relative flex flex-col" style={{ maxWidth: 390, minHeight: "100vh" }}>
        <TopBar c={c} dark={dark} setDark={setDark} tab={tab} pendingCalls={pendingCalls} setSheet={setSheet} setDetail={setDetail} />

        <div className="flex-1 overflow-y-auto pb-28 px-4 relative">
          <div key={detail ? `d-${detail.id}` : tab} className="flora-up">
            {detail ? (
              <DetailView detail={detail} ctx={ctx} onBack={() => setDetail(null)} />
            ) : tab === "home" ? (
              <HomeTab ctx={ctx} />
            ) : tab === "properties" ? (
              <PropertiesTab ctx={ctx} search={search} stageHint={propStageHint} />
            ) : tab === "customers" ? (
              <CustomersTab ctx={ctx} search={search} />
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
          <button onClick={() => setSheet("add")} className="press fixed rounded-full flex items-center justify-center"
            style={{ bottom: 92, left: "50%", transform: "translateX(-50%)", zIndex: 25, width: 58, height: 58, background: c.primary, boxShadow: `0 8px 20px -6px ${c.primary}90` }}>
            <Plus color="#fff" size={26} strokeWidth={2.4} />
          </button>
        )}

        {!detail && <BottomNav c={c} tab={tab} setTab={setTab} pendingCalls={pendingCalls} todaysAppts={todaysAppts} />}

        {sheet === "add" && <QuickAddSheet ctx={ctx} onClose={() => setSheet(null)} />}
        {sheet && sheet !== "add" && <FormSheet sheetVal={sheet} ctx={ctx} onClose={() => setSheet(null)} />}

        {mapPicker && <MapPickerModal c={c} onPick={mapPicker.onPick} onClose={() => setMapPicker(null)} />}
        {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
        {showDailyReminder && (
          <DailyReminderPopup c={c} property={properties.find((p) => p.stage !== "فروخته شد")}
            onGo={() => { setShowDailyReminder(false); goProperties("فعال"); }}
            onClose={() => setShowDailyReminder(false)} />
        )}

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-40 px-4 py-2.5 rounded-2xl text-sm flora-up z-40 text-center" style={{ ...glass(c, 20), color: c.ink, fontWeight: 600, maxWidth: 320, lineHeight: 1.7 }}>{toast}</div>
        )}
      </div>
    </div>
  );
}

// ---------- Top bar / search / nav ----------
function TopBar({ c, dark, setDark, tab, pendingCalls, setSheet, setDetail }) {
  const titles = { home: "داشبورد", properties: "فایل‌های ملکی", customers: "مشتریان", calendar: "تقویم بازدید", more: "بیشتر" };
  return (
    <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-10">
      <div>
        <p style={{ fontSize: 12, color: c.muted }}>خوش آمدی 👋</p>
        <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.015em" }}>{titles[tab] || "Flora"}</h1>
      </div>
      <div className="flex items-center gap-2">
        {pendingCalls > 0 && (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-2" style={{ background: c.attnSoft }}>
            <span className="flora-pulse" style={{ width: 7, height: 7, borderRadius: 99, background: c.attn, display: "inline-block" }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: c.attn }}>{faDigits(pendingCalls)}</span>
          </div>
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
function BottomNav({ c, tab, setTab, pendingCalls, todaysAppts }) {
  const items = [
    { id: "home", label: "خانه", icon: Home },
    { id: "properties", label: "فایل‌ها", icon: Building2 },
    { id: "customers", label: "مشتریان", icon: Users },
    { id: "calendar", label: "تقویم", icon: CalendarDays, dot: todaysAppts > 0 },
    { id: "more", label: "بیشتر", icon: MoreHorizontal, dot: pendingCalls > 0 },
  ];
  return (
    <div className="fixed px-3 pb-3 pt-2" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, zIndex: 20 }}>
      <div className="flex justify-between items-center rounded-2xl px-2 py-2" style={glass(c)}>
        {items.map((it) => {
          const active = tab === it.id; const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => setTab(it.id)} className="press relative flex flex-col items-center gap-1 flex-1 py-1.5 rounded-2xl" style={{ background: active ? c.primarySoft : "transparent" }}>
              <div className="relative">
                <Icon size={19} color={active ? c.primary : c.muted} strokeWidth={active ? 2.5 : 2} />
                {it.dot && <span className="flora-pulse" style={{ position: "absolute", top: -3, left: -3, width: 7, height: 7, borderRadius: 99, background: c.attn }} />}
              </div>
              <span style={{ fontSize: 10, color: active ? c.primary : c.muted, fontWeight: active ? 700 : 500 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SectionHeader({ c, title }) { return <div className="flex items-center justify-between mt-6 mb-2.5"><h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2></div>; }
function EmptyLine({ c, text }) { return <p style={{ color: c.muted, fontSize: 12.5, padding: "10px 2px" }}>{text}</p>; }
function StageBadge({ c, stage }) {
  if (stage === "فروخته شد") return <span style={{ fontSize: 10, fontWeight: 700, color: c.danger, background: c.dangerSoft, padding: "3px 9px", borderRadius: 999 }}>فروخته شد</span>;
  if (stage === "در حال مذاکره") return <span style={{ fontSize: 10, fontWeight: 700, color: c.attn, background: c.attnSoft, padding: "3px 9px", borderRadius: 999 }}>مذاکره</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, color: c.success, background: c.successSoft, padding: "3px 9px", borderRadius: 999 }}>فعال</span>;
}

// ---------- Dashboard ----------
function HomeTab({ ctx }) {
  const { c, properties, customers, appointments, calls, setDetail, setTab, goProperties } = ctx;
  const activeProps = properties.filter((p) => p.stage !== "فروخته شد").length;
  const stats = [
    { label: "فایل فعال", value: activeProps, icon: Building2, color: c.primary, onClick: () => goProperties("فعال") },
    { label: "مشتری", value: customers.length, icon: Users, color: c.primary, onClick: () => setTab("customers") },
    { label: "بازدید امروز", value: appointments.filter((a) => a.date === todayISO()).length, icon: CalendarDays, color: c.attn, onClick: () => setTab("calendar") },
    { label: "تماس در انتظار", value: calls.filter((cl) => cl.status !== "انجام‌شد").length, icon: PhoneCall, color: c.attn, onClick: () => setTab("more") },
  ];
  const feed = [
    ...appointments.map((a) => ({ type: "appt", date: a.date, ...a })),
    ...calls.map((cl) => ({ type: "call", date: cl.date, ...cl })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="pt-3">
      <button onClick={() => setDetail({ type: "copilot" })} className="press w-full text-right rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: c.primary }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}><Bot size={22} color="#fff" /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>دستیار فروش هوش مصنوعی</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>پیگیری‌های امروز، فایل پیشنهادی و مشتریان داغ</p>
        </div>
        <ChevronLeft size={18} color="#fff" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <button key={i} onClick={s.onClick} className="press text-right rounded-xl p-4" style={glass(c, 24)}>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3" style={{ background: s.color + "22" }}><s.icon size={17} color={s.color} /></div>
            <p style={{ fontSize: 22, fontWeight: 800 }}>{faDigits(s.value)}</p>
            <p style={{ fontSize: 12, color: c.muted }}>{s.label}</p>
          </button>
        ))}
      </div>

      <SectionHeader c={c} title="فعالیت‌های اخیر" />
      <div className="flex flex-col gap-2">
        {feed.map((f, i) => f.type === "appt" ? <ActivityApptRow key={i} a={f} ctx={ctx} /> : <ActivityCallRow key={i} cl={f} c={c} />)}
        {feed.length === 0 && <EmptyLine c={c} text="فعالیتی ثبت نشده" />}
      </div>

      <SectionHeader c={c} title="جدیدترین فایل‌ها" />
      <div className="flex flex-col gap-2 mb-6">
        {properties.slice(0, 2).map((p) => <PropertyMiniCard key={p.id} p={p} c={c} onClick={() => setDetail({ type: "property", id: p.id })} />)}
      </div>
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
    <button onClick={onClick} className="press w-full text-right rounded-xl p-3 flex items-center gap-3" style={{ ...glass(c, 22), opacity: sold ? 0.6 : 1 }}>
      <div className="rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 52, height: 52, background: c.primarySoft }}>
        {cover ? (cover.type === "image" ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <Icon size={20} color={c.primary} />}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: sold ? "line-through" : "none" }}>{p.title}</p>
        <p style={{ fontSize: 11, color: c.muted }}>{faDigits(p.area)} متر · {fmtToman(p.price)}</p>
      </div>
      <StageBadge c={c} stage={p.stage} />
    </button>
  );
}

// ---------- Properties tab: big list + pipeline ----------
function PropertiesTab({ ctx, search, stageHint }) {
  const { c, properties, setDetail } = ctx;
  const [mode, setMode] = useState("list");
  const [dealFilter, setDealFilter] = useState("همه");
  const [stageFilter, setStageFilter] = useState(stageHint || "همه");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let out = properties;
    if (search) { const q = search.toLowerCase(); out = out.filter((p) => Object.values(p).some((v) => String(v).toLowerCase().includes(q))); }
    if (dealFilter !== "همه") out = out.filter((p) => p.deal === dealFilter);
    if (stageFilter !== "همه") out = out.filter((p) => p.stage === stageFilter);
    return [...out].sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
  }, [properties, search, dealFilter, stageFilter, sortAsc]);

  return (
    <div className="pt-16">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center rounded-full p-1 gap-1" style={glass(c, 20)}>
          <button onClick={() => setMode("list")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "list" ? c.primary : "transparent" }}><LayoutGrid size={13} color={mode === "list" ? "#fff" : c.muted} /></button>
          <button onClick={() => setMode("pipeline")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "pipeline" ? c.primary : "transparent" }}><Columns3 size={13} color={mode === "pipeline" ? "#fff" : c.muted} /></button>
        </div>
        <button onClick={() => setSortAsc((s) => !s)} className="press flex items-center gap-1.5 rounded-full px-3 py-2 mr-auto" style={glass(c, 20)}>
          <ArrowUpDown size={12} color={c.primary} /><span style={{ fontSize: 10.5, fontWeight: 700, color: c.primary, whiteSpace: "nowrap" }}>{sortAsc ? "ارزان‌ترین" : "گران‌ترین"}</span>
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
        {STAGE_FILTERS.map((s) => { const active = stageFilter === s; return <button key={s} onClick={() => setStageFilter(s)} className="press shrink-0 rounded-full px-3 py-1.5" style={active ? { background: c.attn } : glass(c, 18)}><span style={{ fontSize: 10.5, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{s}</span></button>; })}
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {DEAL_FILTERS.map((d) => { const active = dealFilter === d; return <button key={d} onClick={() => setDealFilter(d)} className="press shrink-0 rounded-full px-3 py-1.5" style={active ? { background: c.primary } : glass(c, 18)}><span style={{ fontSize: 10.5, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{d}</span></button>; })}
      </div>

      {mode === "list" ? (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filtered.map((p) => <PropertyGridCard key={p.id} p={p} ctx={ctx} onClick={() => setDetail({ type: "property", id: p.id })} />)}
          {filtered.length === 0 && <div className="col-span-2"><EmptyLine c={c} text="فایلی پیدا نشد" /></div>}
        </div>
      ) : (
        <PipelineBoard rows={filtered} ctx={ctx} />
      )}
    </div>
  );
}

function PropertyGridCard({ p, ctx, onClick }) {
  const { c } = ctx;
  const cover = p.media && p.media[0]; const Icon = typeIcon(p.type); const sold = p.stage === "فروخته شد";
  const meta = [`${faDigits(p.area)} متر`, `${faDigits(p.rooms)} خواب`].join(" · ");
  return (
    <button onClick={onClick} className="press text-right rounded-xl overflow-hidden" style={glass(c)}>
      <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: c.primarySoft }}>
        {cover ? (
          cover.type === "image" ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Icon size={30} color={c.primary} style={{ opacity: 0.45 }} /></div>
        )}
        <span className="absolute top-2 right-2" style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", background: "rgba(15,20,35,0.72)", padding: "3px 8px", borderRadius: 6 }}>{p.deal}</span>
        {sold && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(15,20,35,0.55)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: c.danger, padding: "4px 10px", borderRadius: 6 }}>فروخته شد</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p style={{ fontSize: 13.5, fontWeight: 800, color: c.primary }}>{fmtToman(p.price)}</p>
        <p style={{ fontSize: 11.5, fontWeight: 600, marginTop: 3, color: c.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, minHeight: 30 }}>{p.title}</p>
        <p style={{ fontSize: 10.5, color: c.muted, marginTop: 4 }}>{meta}</p>
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
                        {cover ? (cover.type === "image" ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <div className="w-full h-full flex items-center justify-center"><Icon size={26} color={c.primary} style={{ opacity: 0.5 }} /></div>}
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
function CustomersTab({ ctx, search }) {
  const { c, customers, setDetail } = ctx;
  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((cu) => Object.values(cu).some((v) => String(v).toLowerCase().includes(q)));
  }, [customers, search]);
  return (
    <div className="pt-16 flex flex-col gap-2">
      {filtered.map((cu) => (
        <button key={cu.id} onClick={() => setDetail({ type: "customer", id: cu.id })} className="press w-full text-right rounded-xl p-3.5 flex items-center gap-3" style={glass(c, 22)}>
          <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: c.primarySoft }}><UserCircle2 size={22} color={c.primary} /></div>
          <div className="flex-1 min-w-0"><p style={{ fontSize: 13.5, fontWeight: 600 }}>{cu.name}</p><p style={{ fontSize: 11.5, color: c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.need}</p></div>
          <ChevronLeft size={16} color={c.muted} />
        </button>
      ))}
      {filtered.length === 0 && <EmptyLine c={c} text="مشتری‌ای پیدا نشد" />}
    </div>
  );
}

// ---------- Calendar tab ----------
function CalendarTab({ ctx }) {
  const { c, appointments } = ctx;
  const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const grouped = sorted.reduce((acc, a) => { (acc[a.date] ||= []).push(a); return acc; }, {});
  return (
    <div className="pt-16">
      {Object.keys(grouped).length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-4">
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 8, fontWeight: 700 }}>{date === todayISO() ? "امروز" : fmtJalali(date)}</p>
          <div className="flex flex-col gap-2">{items.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} showDelete />)}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- More tab ----------
function MoreTab({ ctx }) {
  const { c, owners, setOwners, builders, calls, setCalls, setSheet, exportBackup, importBackup, notify } = ctx;
  const importRef = useRef(null);
  return (
    <div className="pt-3">
      <SectionHeader c={c} title="پیگیری تماس‌ها" />
      <div className="flex flex-col gap-2 mb-2">
        {calls.map((cl) => {
          const done = cl.status === "انجام‌شد";
          return (
            <div key={cl.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glass(c, 22)}>
              <button onClick={() => setCalls((prev) => prev.map((x) => x.id === cl.id ? { ...x, status: done ? "در انتظار پاسخ" : "انجام‌شد" } : x))} className="shrink-0">
                <CheckCircle2 size={22} color={done ? c.success : c.attn} fill={done ? c.success : "none"} />
              </button>
              <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? c.muted : c.ink }}>{cl.customerName}</p><p style={{ fontSize: 11, color: c.muted }}>{cl.notes} · {fmtJalali(cl.date)}</p></div>
              <button onClick={() => setSheet({ kind: "call", editId: cl.id })} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={13} color={c.primary} /></button>
              <button onClick={() => { setCalls((prev) => prev.filter((x) => x.id !== cl.id)); notify("تماس حذف شد"); }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
            </div>
          );
        })}
        {calls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <AddLink c={c} label="ثبت تماس جدید" onClick={() => setSheet("call")} />

      <SectionHeader c={c} title="مالکین" />
      <div className="flex flex-col gap-2 mb-2">
        {owners.map((o) => (
          <div key={o.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glass(c, 22)}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.primarySoft }}><UserCircle2 size={19} color={c.primary} /></div>
            <div className="flex-1 min-w-0"><p style={{ fontSize: 13.5, fontWeight: 600 }}>{o.name}</p><p style={{ fontSize: 11.5, color: c.muted }} dir="ltr">{o.phone}</p></div>
            {o.phone && <a href={`tel:${o.phone}`} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={13} color={c.success} /></a>}
            <button onClick={() => setSheet({ kind: "owner", editId: o.id })} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={13} color={c.primary} /></button>
            <button onClick={() => { setOwners((prev) => prev.filter((x) => x.id !== o.id)); notify("مالک حذف شد"); }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
          </div>
        ))}
        {owners.length === 0 && <EmptyLine c={c} text="مالکی ثبت نشده" />}
      </div>
      <AddLink c={c} label="ثبت مالک جدید" onClick={() => setSheet("owner")} />

      <SectionHeader c={c} title="سازندگان" />
      <div className="flex flex-col gap-2 mb-2">
        {builders.map((b) => (
          <div key={b.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glass(c, 22)}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.attnSoft }}><Hammer size={17} color={c.attn} /></div>
            <div className="flex-1 min-w-0"><p style={{ fontSize: 13.5, fontWeight: 600 }}>{b.name}</p><p style={{ fontSize: 11.5, color: c.muted }} dir="ltr">{b.phone}</p></div>
            {b.phone && <a href={`tel:${b.phone}`} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={13} color={c.success} /></a>}
          </div>
        ))}
        {builders.length === 0 && <EmptyLine c={c} text="سازنده‌ای ثبت نشده" />}
      </div>
      <AddLink c={c} label="ثبت سازنده جدید" onClick={() => setSheet("builder")} />

      <SectionHeader c={c} title="پشتیبان‌گیری" />
      <div className="flex gap-2 mb-8">
        <button onClick={exportBackup} className="press flex-1 rounded-lg py-3 flex items-center justify-center gap-2" style={glass(c, 22)}>
          <Download size={15} color={c.primary} /><span style={{ fontSize: 12.5, fontWeight: 700, color: c.primary }}>دانلود بکاپ</span>
        </button>
        <button onClick={() => importRef.current?.click()} className="press flex-1 rounded-lg py-3 flex items-center justify-center gap-2" style={glass(c, 22)}>
          <Upload size={15} color={c.attn} /><span style={{ fontSize: 12.5, fontWeight: 700, color: c.attn }}>بازیابی بکاپ</span>
        </button>
        <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { if (e.target.files?.[0]) importBackup(e.target.files[0]); e.target.value = ""; }} />
      </div>
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
  if (detail.type === "ai-chat") return <AiChatView ctx={ctx} onBack={onBack} />;
  return null;
}
function BackHeader({ c, title, onBack, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-4">
      <button onClick={onBack} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}><ArrowRight size={16} color={c.ink} /></button>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
      <div className="flex items-center gap-2">
        {onEdit && <button onClick={onEdit} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}><Edit3 size={15} color={c.primary} /></button>}
        {onDelete && <button onClick={onDelete} className="press w-9 h-9 rounded-full flex items-center justify-center" style={glass(c, 20)}><Trash2 size={15} color={c.danger} /></button>}
        {!onEdit && !onDelete && <div style={{ width: 36 }} />}
      </div>
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
      {media.map((m) => (
        <div key={m.id} className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 84, height: 84 }}>
          <button onClick={() => onView(m)} className="w-full h-full">
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
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center flora-pop" style={{ background: "rgba(0,0,0,0.9)" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 left-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><X size={16} color="#fff" /></button>
      {item.type === "image" ? <img src={item.url} alt="" style={{ maxWidth: "92%", maxHeight: "80%", borderRadius: 18, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} /> : <video src={item.url} controls autoPlay style={{ maxWidth: "92%", maxHeight: "80%", borderRadius: 18 }} onClick={(e) => e.stopPropagation()} />}
    </div>
  );
}
function DailyReminderPopup({ c, property, onGo, onClose }) {
  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center p-6 flora-pop" style={{ background: "rgba(15,20,35,0.55)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl p-5" style={{ ...glass(c), maxWidth: 320 }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: c.attnSoft }}><Sparkles size={20} color={c.attn} /></div>
        <p style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>یادآوری روزانه</p>
        <p style={{ fontSize: 12.5, color: c.muted, lineHeight: 1.9, marginBottom: 16 }}>
          {property ? `امروز یک سر به «${property.title}» بزن و کارشناسی‌اش کن.` : "امروز یکی از فایل‌هایت را کارشناسی کن تا اطلاعاتش به‌روز بماند."}
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="press flex-1 rounded-xl py-2.5" style={{ background: c.surface2, color: c.muted, fontWeight: 700, fontSize: 12.5 }}>بعداً</button>
          <button onClick={onGo} className="press flex-1 rounded-xl py-2.5" style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 12.5 }}>مشاهده فایل‌ها</button>
        </div>
      </div>
    </div>
  );
}
function InfoChip({ c, icon: Icon, label }) { return <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ background: c.surface2 }}><Icon size={12} color={c.muted} /><span style={{ fontSize: 11, color: c.ink }}>{label}</span></div>; }

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
      const prompt = `یک آگهی ملکی حرفه‌ای، جذاب و کوتاه (حداکثر ۵ خط) به زبان فارسی برای این فایل ملکی بنویس:
عنوان: ${p.title}\nنوع: ${p.type}\nنوع معامله: ${p.deal}\nمتراژ: ${p.area} متر\nطبقه: ${p.floor || "-"}\nتعداد اتاق: ${p.rooms}\nوضعیت لوازم: ${p.furnished || "-"}\nآدرس: ${p.address}\nقیمت کل: ${fmtToman(p.price)}\nفقط متن آگهی را برگردان.`;
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
          <span style={{ fontSize: 11, background: c.primarySoft, color: c.primary, padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>{p.deal}</span>
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
        {owner && <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}><UserCircle2 size={13} /> مالک: {owner.name} · <span dir="ltr">{owner.phone}</span></div>}
        {builder && <div className="flex items-center gap-1.5 mt-2" style={{ color: c.muted, fontSize: 12.5 }}><Hammer size={13} /> سازنده: {builder.name} · <span dir="ltr">{builder.phone}</span></div>}

        <div className="flex gap-2 mt-4">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, stage: s } : x))} className="press flex-1 rounded-xl py-2.5" style={{ background: p.stage === s ? c.primary : c.surface2, color: p.stage === s ? "#fff" : c.muted, fontWeight: 700, fontSize: 10.5 }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-3" style={glass(c, 24)}>
        <div className="flex items-center justify-between mb-2.5">
          <p style={{ fontSize: 13, fontWeight: 700 }}>آگهی</p>
          <button onClick={generateAd} disabled={aiLoading} className="press flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontSize: 11.5, fontWeight: 700 }}>
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {aiLoading ? "در حال تولید..." : "تولید با AI"}
          </button>
        </div>
        <textarea value={adText} onChange={(e) => setAdText(e.target.value)} placeholder="متن آگهی را اینجا بنویس، یا از دکمه‌ی بالا با Gemini بساز..."
          rows={5} style={{ width: "100%", background: c.surface2, border: "none", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.9, color: c.ink, outline: "none", fontFamily: "inherit", resize: "vertical" }} />
        <button onClick={() => { setProperties((prev) => prev.map((x) => x.id === id ? { ...x, desc: adText } : x)); notify("آگهی ذخیره شد"); }}
          className="press w-full mt-2 rounded-xl py-2.5" style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 12.5 }}>ذخیره آگهی</button>
      </div>

      <SectionHeader c={c} title="بازدیدهای این فایل" />
      <div className="flex flex-col gap-2 mb-6">
        {propAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} />)}
        {propAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

function CustomerDetail({ id, ctx, onBack }) {
  const { c, customers, calls, appointments } = ctx;
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
          <a href={`tel:${cu.phone}`} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={18} color={c.success} /></a>
        )}
      </div>
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
const HEAT_STYLE = { hot: { label: "🔥 داغ", }, warm: { label: "🟡 متوسط" }, cold: { label: "❄️ سرد" } };

function CopilotView({ ctx, onBack }) {
  const { c, customers, calls, appointments, properties, hasAiKey, callAI, notify, setSheet, agentName } = ctx;
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

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
      const prompt = `تو دستیار فروش شخصی یک مشاور املاک ایرانی به اسم ${agentName || "مشاور"} هستی. لحنت مثل یک همکار باتجربه و صمیمی است، نه یک ربات رسمی. بر اساس اطلاعات زیر یک برنامه‌ی عملیاتی امروز بساز و دقیقاً به‌صورت JSON خام (بدون توضیح، بدون markdown fence) با این ساختار برگردان:
{"greeting":"یک جمله‌ی کوتاه صمیمی درباره‌ی وضعیت کلی امروز، خطاب به ${agentName || "مشاور"}","biggestRisk":"مهم‌ترین ریسک امروز در یک جمله، یا خالی اگر چیز خاصی نیست","priorities":[{"rank":1,"customer":"نام دقیق از لیست","action":"چیکار بکنه","reason":"چرا","suggestedTime":"HH:MM","message":"پیام پیشنهادی کوتاه فارسی برای ارسال"}],"sleepingSuggestions":[{"property":"عنوان دقیق از لیست فایل‌ها","suggestion":"چه کاری برای این فایل بکنه"}],"hotLeads":[{"customer":"نام","heat":"hot یا warm","reason":"چرا"}],"atRiskLeads":[{"customer":"نام","reason":"چرا"}],"coachTip":"یک نکته‌ی مربی‌گری کوتاه بر اساس یادداشت‌های تماس اخیر، یا خالی"}
هر آرایه حداکثر ۴ مورد. اعداد درصد یا احتمال دقیق اختراع نکن. نام مشتری/عنوان فایل را دقیقاً از لیست‌های زیر انتخاب کن.

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

      <div className="rounded-2xl p-4 mb-4" style={{ background: c.primary }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{greetingPhrase()}{agentName ? ` ${agentName}` : ""} 👋</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4, lineHeight: 1.9 }}>
          {plan?.greeting || `${faDigits(overdue.length)} مشتری نیاز به پیگیری دارند و ${faDigits(sleeping.length)} فایل مدتی است تکون نخورده. برای برنامه‌ی کامل امروز، پایین را بزن.`}
        </p>
      </div>

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
        {overdue.length === 0 && <EmptyLine c={c} text="همه‌ی مشتریان اخیراً پیگیری شده‌اند 👌" />}
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
  const { c, hasAiKey, callAI, notify, setSheet } = ctx;
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
      const prompt = `تو یک دستیار متخصص و باتجربه در حوزه‌ی املاک و مستغلات هستی — هم آشنا با بازار مسکن ایران و هم اصول حرفه‌ای مشاوره‌ی املاک در سطح جهانی (قیمت‌گذاری، مذاکره، بازاریابی، حقوقی، سرمایه‌گذاری). به فارسی، دقیق، کاربردی و مختصر پاسخ بده. اگر سوال خارج از حوزه‌ی املاک بود هم به بهترین شکل کمک کن.

گفتگوی تا این لحظه:
${transcript}

فقط پاسخ دستیار به آخرین پیام را بنویس، بدون تکرار سوال.`;
      const reply = await callAI(prompt);
      setMessages((prev) => [...prev, { role: "assistant", text: reply.trim() }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ خطا: ${e.message || "نامشخص"}` }]);
    }
    setSending(false);
  };

  return (
    <div className="pt-2 flex flex-col" style={{ height: "calc(100vh - 90px)" }}>
      <BackHeader c={c} title="چت با دستیار املاک" onBack={onBack} />
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

// ---------- Sheet shell + fields ----------
function SheetShell({ c, title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-2xl p-5 flora-sheet max-h-[85%] overflow-y-auto" style={glass(c, 36)}>
        <div className="w-10 h-1.5 rounded-full mx-auto mb-4" style={{ background: c.surface2 }} />
        <div className="flex items-center justify-between mb-4"><h3 style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</h3><button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button></div>
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
function Field({ c, label, children }) { return <div className="mb-3"><label style={{ fontSize: 12, color: c.muted, marginBottom: 6, display: "block" }}>{label}</label>{children}</div>; }
function inputStyle(c) { return { width: "100%", background: c.surface2, border: "none", borderRadius: 16, padding: "12px 14px", fontSize: 14, color: c.ink, outline: "none", fontFamily: "inherit" }; }
function Select({ c, value, onChange, options, placeholder }) { return <select value={value} onChange={onChange} style={inputStyle(c)}><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; }
function SubmitBtn({ c, label, onClick, disabled }) { return <button onClick={onClick} disabled={disabled} className="press w-full rounded-xl py-3.5 mt-2" style={{ background: disabled ? c.surface2 : c.primary, color: disabled ? c.muted : "#fff", fontWeight: 700, fontSize: 14.5 }}>{label}</button>; }

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
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(link);
    const script = document.createElement("script"); script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; script.onload = () => resolve(window.L); document.body.appendChild(script);
  });
}
function MapPickerModal({ c, onPick, onClose }) {
  const mapRef = useRef(null); const mapObjRef = useRef(null);
  const [address, setAddress] = useState(""); const [loadingAddr, setLoadingAddr] = useState(false);
  const reverseGeocode = async (lat, lng) => {
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
      const map = L.map(mapRef.current).setView(SAREIN_CENTER, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      const marker = L.marker(SAREIN_CENTER, { draggable: true }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); reverseGeocode(p.lat, p.lng); });
      map.on("click", (e) => { marker.setLatLng(e.latlng); reverseGeocode(e.latlng.lat, e.latlng.lng); });
      mapObjRef.current = map; reverseGeocode(SAREIN_CENTER[0], SAREIN_CENTER[1]);
    });
    return () => { cancelled = true; if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; } };
  }, []);
  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center flora-pop" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full flora-sheet" style={{ background: "#fff", borderRadius: "24px 24px 0 0", overflow: "hidden" }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #E3E7EF" }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 800, fontFamily: "'Vazirmatn', sans-serif" }}>انتخاب آدرس از نقشه سرعین</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0F2F7" }}><X size={14} /></button>
        </div>
        <div ref={mapRef} style={{ width: "100%", height: 300, background: "#eee" }} />
        <div className="p-4" style={{ fontFamily: "'Vazirmatn', sans-serif" }} dir="rtl">
          <p style={{ fontSize: 11.5, color: "#6B7386", marginBottom: 4 }}>روی نقشه لمس کن یا نشانگر را جابه‌جا کن</p>
          <p style={{ fontSize: 13, fontWeight: 600, minHeight: 20 }}>{loadingAddr ? "در حال یافتن آدرس..." : address}</p>
          <button onClick={() => onPick(address)} disabled={!address || loadingAddr} className="press w-full mt-3 rounded-xl py-3" style={{ background: !address || loadingAddr ? "#F0F2F7" : "#0B84FF", color: !address || loadingAddr ? "#6B7386" : "#fff", fontWeight: 700, fontSize: 13.5 }}>تایید این آدرس</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Form sheet router ----------
function FormSheet({ sheetVal, ctx, onClose }) {
  const kind = typeof sheetVal === "string" ? sheetVal : sheetVal.kind;
  const editId = typeof sheetVal === "object" ? sheetVal.editId : null;
  if (kind === "property") return <PropertyForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "customer") return <CustomerForm ctx={ctx} onClose={onClose} />;
  if (kind === "owner") return <OwnerForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "builder") return <BuilderForm ctx={ctx} onClose={onClose} />;
  if (kind === "appointment") return <AppointmentForm ctx={ctx} onClose={onClose} />;
  if (kind === "call") return <CallForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "ai-settings") return <AiSettingsSheet ctx={ctx} onClose={onClose} />;
  return null;
}

function AiSettingsSheet({ ctx, onClose }) {
  const { c, aiProvider, setAiProvider, geminiKey, setGeminiKey, openaiKey, setOpenaiKey, grokKey, setGrokKey, agentName, setAgentName, notify } = ctx;
  const [provider, setProvider] = useState(aiProvider);
  const [gKey, setGKey] = useState(geminiKey || "");
  const [oKey, setOKey] = useState(openaiKey || "");
  const [xKey, setXKey] = useState(grokKey || "");
  const [name, setName] = useState(agentName || "");
  const providers = [
    { id: "gemini", label: "Gemini (Google)", hint: "کلید رایگان: aistudio.google.com — چون این اپ بک‌اند ندارد، این پایدارترین گزینه است" },
    { id: "openai", label: "GPT (OpenAI)", hint: "کلید: platform.openai.com — ممکن است مرورگر تماس مستقیم را مسدود کند (CORS)" },
    { id: "grok", label: "Grok (xAI)", hint: "کلید: console.x.ai — ممکن است مرورگر تماس مستقیم را مسدود کند (CORS)" },
  ];
  const currentKey = provider === "openai" ? oKey : provider === "grok" ? xKey : gKey;
  const setCurrentKey = provider === "openai" ? setOKey : provider === "grok" ? setXKey : setGKey;
  return (
    <SheetShell c={c} title="تنظیمات هوش مصنوعی" onClose={onClose}>
      <Field c={c} label="نام تو (برای خطاب دستیار، اختیاری)"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً مجید" /></Field>
      <Field c={c} label="ارائه‌دهنده">
        <div className="flex gap-2">
          {providers.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} className="press flex-1 rounded-lg py-2.5" style={{ background: provider === p.id ? c.primary : c.surface2, color: provider === p.id ? "#fff" : c.muted, fontWeight: 700, fontSize: 11.5 }}>{p.label}</button>
          ))}
        </div>
      </Field>
      <Field c={c} label="کلید API"><input style={inputStyle(c)} dir="ltr" value={currentKey} onChange={(e) => setCurrentKey(e.target.value)} placeholder="کلید را اینجا وارد کن" /></Field>
      <p style={{ fontSize: 11.5, color: c.muted, lineHeight: 1.9, marginBottom: 10 }}>{providers.find((p) => p.id === provider)?.hint} — کلید فقط روی همین گوشی ذخیره می‌شود.</p>
      <SubmitBtn c={c} label="ذخیره" disabled={!currentKey.trim()} onClick={() => {
        setAiProvider(provider); setGeminiKey(gKey.trim()); setOpenaiKey(oKey.trim()); setGrokKey(xKey.trim()); setAgentName(name.trim());
        notify("تنظیمات هوش مصنوعی ذخیره شد"); onClose();
      }} />
    </SheetShell>
  );
}

function PropertyForm({ ctx, onClose, editId }) {
  const { c, owners, setOwners, builders, properties, setProperties, notify, setMapPicker } = ctx;
  const editing = editId ? properties.find((x) => x.id === editId) : null;
  const editOwner = editing ? owners.find((o) => o.id === editing.ownerId) : null;
  const [f, setF] = useState(editing ? {
    title: editing.title, type: editing.type, deal: editing.deal, pricePerMeter: String(editing.pricePerMeter), area: String(editing.area),
    rooms: String(editing.rooms), floor: String(editing.floor || 1), furnished: editing.furnished || "بدون لوازم", address: editing.address,
    ownerName: editOwner?.name || "", ownerPhone: editOwner?.phone || "", builderId: editing.builderId || "",
  } : { title: "", type: "آپارتمان", deal: "فروش", pricePerMeter: "", area: "", rooms: "", floor: "1", furnished: "بدون لوازم", address: "", ownerName: "", ownerPhone: "", builderId: "" });
  const [media, setMedia] = useState(editing?.media || []);
  const [uploading, setUploading] = useState(false);
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
  const openMapPicker = () => setMapPicker({ onPick: (addr) => { setF((prev) => ({ ...prev, address: addr })); setMapPicker(null); } });

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
      pricePerMeter: toNum(f.pricePerMeter), area: toNum(f.area), rooms: toNum(f.rooms), floor: toNum(f.floor), price: total, ownerId, media,
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
        <Field c={c} label="نوع معامله"><Select c={c} value={f.deal} onChange={set("deal")} placeholder="انتخاب کنید" options={["فروش","پیش‌فروش","اجاره","رهن کامل"].map(v=>({value:v,label:v}))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="متراژ (متر)"><input style={inputStyle(c)} inputMode="numeric" value={f.area} onChange={set("area")} placeholder="فارسی یا انگلیسی" /></Field>
        <Field c={c} label="قیمت هر متر (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.pricePerMeter} onChange={set("pricePerMeter")} placeholder="فارسی یا انگلیسی" /></Field>
      </div>
      <div className="rounded-2xl px-4 py-3 mb-3 flex items-center justify-between" style={{ background: c.primarySoft }}>
        <span style={{ fontSize: 12.5, color: c.primary, fontWeight: 700 }}>مبلغ کل (متراژ × قیمت هر متر)</span><span style={{ fontSize: 15, color: c.primary, fontWeight: 800 }}>{fmtToman(total)}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field c={c} label="تعداد اتاق"><input style={inputStyle(c)} inputMode="numeric" value={f.rooms} onChange={set("rooms")} /></Field>
        <Field c={c} label="طبقه"><Select c={c} value={f.floor} onChange={set("floor")} placeholder="طبقه" options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: faDigits(i + 1) }))} /></Field>
        <Field c={c} label="لوازم"><Select c={c} value={f.furnished} onChange={set("furnished")} placeholder="وضعیت" options={["با لوازم","بدون لوازم"].map(v=>({value:v,label:v}))} /></Field>
      </div>
      <Field c={c} label="آدرس">
        <div className="flex gap-2">
          <input style={{ ...inputStyle(c), flex: 1 }} value={f.address} onChange={set("address")} placeholder="آدرس را بنویس یا از نقشه انتخاب کن" />
          <button type="button" onClick={openMapPicker} className="press shrink-0 rounded-2xl flex items-center justify-center gap-1.5 px-3" style={{ background: c.primarySoft }}><MapPin size={16} color={c.primary} /></button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نام مالک"><input style={inputStyle(c)} value={f.ownerName} onChange={set("ownerName")} placeholder="اختیاری" /></Field>
        <Field c={c} label="شماره مالک"><input style={inputStyle(c)} dir="ltr" value={f.ownerPhone} onChange={set("ownerPhone")} placeholder="اختیاری" /></Field>
      </div>
      {isPreSale && <Field c={c} label="سازنده"><Select c={c} value={f.builderId} onChange={set("builderId")} placeholder="انتخاب سازنده" options={builders.map(b=>({value:b.id,label:b.name}))} /></Field>}
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره فایل"} disabled={!valid} onClick={submit} />
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
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" value={f.phone} onChange={set("phone")} /></Field>
      <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={f.need} onChange={set("need")} placeholder="مثلاً خرید آپارتمان ۲ خواب" /></Field>
      <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.budget} onChange={set("budget")} /></Field>
      <SubmitBtn c={c} label="ذخیره مشتری" disabled={!valid} onClick={() => { setCustomers((prev) => [{ id: uid(), ...f, budget: toNum(f.budget) }, ...prev]); notify("مشتری با موفقیت ثبت شد"); onClose(); }} />
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
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" value={f.phone} onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره مالک"} disabled={!valid} onClick={() => {
        if (editing) setOwners((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x));
        else setOwners((prev) => [{ id: uid(), ...f }, ...prev]);
        notify(editing ? "تغییرات مالک ذخیره شد" : "مالک با موفقیت ثبت شد"); onClose();
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
      <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" value={f.phone} onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label="ذخیره سازنده" disabled={!valid} onClick={() => { setBuilders((prev) => [{ id: uid(), ...f }, ...prev]); notify("سازنده با موفقیت ثبت شد"); onClose(); }} />
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
