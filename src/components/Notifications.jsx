import React, { useState, useEffect } from "react";
import { Bell, BellOff, Share2, Plus, Smartphone, Check, X, ChevronLeft, AlertTriangle, Loader2, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { SP, RAD, FS, FW, glass, glassLite } from "../lib/theme.js";
import { EmptyLine, BodyPortal } from "../lib/ui.jsx";
import { fmtJalali } from "../lib/format.js";
import { isPushSupported, isIos, isInStandaloneMode, enablePush, disablePush, getPushPermissionState } from "../lib/push.js";

// TODO: replace with your real bot's username once created via @BotFather
// (no @, e.g. "FloraCrmBot"). Nothing else needs to change — the deep link
// below carries the Flora user id, and telegram-webhook reads it from there.
const TELEGRAM_BOT_USERNAME = "FloraCrmBot";

const CATEGORIES = [
  { key: "visits", label: "بازدیدها" },
  { key: "followups", label: "پیگیری مشتری" },
  { key: "deals", label: "معاملات" },
  { key: "legal", label: "پرونده‌های حقوقی" },
  { key: "finance", label: "مالی" },
  { key: "new_properties", label: "فایل‌های جدید" },
];

const DEFAULT_PREFS = {
  visits: true, followups: true, deals: true, legal: true, finance: true, new_properties: true,
  quiet_hours_enabled: false, quiet_hours_start: "23:00", quiet_hours_end: "08:00", preview_level: "full",
};

function Toggle({ c, on, onChange }) {
  return (
    <button onClick={onChange} className="press shrink-0" style={{ width: 42, height: 24, borderRadius: 999, background: on ? c.primary : c.surface2, position: "relative", transition: "background .2s" }}>
      <div style={{ position: "absolute", top: 2, [on ? "left" : "right"]: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "all .2s" }} />
    </button>
  );
}

// ---------- iOS "Add to Home Screen" onboarding — Web Push on iOS only
// exists at all once the site is running as an installed Home Screen app
// (iOS 16.4+); a regular Safari tab can never receive it, no matter what
// permission is granted. This screen exists specifically so the person
// isn't left guessing why the enable button doesn't do anything in Safari.
function IosInstallOnboarding({ ctx, onClose }) {
  const { c } = ctx;
  const steps = [
    { title: "افزودن Flora به صفحه اصلی", desc: "توی سافاری، دکمه‌ی Share (مربع با فلش رو به بالا) رو بزن، بعد «Add to Home Screen» رو انتخاب کن.", icon: Share2 },
    { title: "باز کردن Flora از آیکون", desc: "از این به بعد Flora رو از آیکونش روی صفحه اصلی گوشی باز کن، نه از تب سافاری — اعلان‌ها فقط از همین حالت کار می‌کنن.", icon: Smartphone },
    { title: "فعال کردن اعلان‌ها", desc: "داخل همین اپِ نصب‌شده، دوباره روی «اعلان‌های Flora را فعال کن» بزن.", icon: Bell },
  ];
  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[400] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onClose} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>Flora را مثل یک اپ روی آیفون نصب کن</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex" style={{ gap: SP.md, marginBottom: SP.xl }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: "50%", background: c.primarySoft, fontWeight: 800, fontSize: 15, color: c.primary }}>{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><s.icon size={16} color={c.primary} /><p style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</p></div>
                <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.9 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BodyPortal>
  );
}

function NotificationHistory({ ctx }) {
  const { c } = ctx;
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all"); // all | unread

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const visible = (items || []).filter((n) => filter === "all" || !n.read);

  return (
    <div>
      <div className="flex" style={{ gap: 6, marginBottom: SP.md }}>
        {[["all", "همه"], ["unread", "خوانده‌نشده"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="press rounded-lg" style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, background: filter === k ? c.primary : c.surface2, color: filter === k ? "#fff" : c.ink }}>{label}</button>
        ))}
      </div>
      {items === null ? (
        <p style={{ fontSize: 12, color: c.muted, textAlign: "center", padding: 20 }}>در حال بارگذاری...</p>
      ) : visible.length === 0 ? (
        <EmptyLine c={c} text={filter === "unread" ? "اعلان خوانده‌نشده‌ای نداری" : "هنوز اعلانی نداری"} />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((n) => (
            <button key={n.id} onClick={() => !n.read && markRead(n.id)} className="press w-full text-right" style={{ padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md), opacity: n.read ? 0.5 : 1 }}>
              <div className="flex items-start justify-between gap-2">
                <p style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</p>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.primary, marginTop: 4, flexShrink: 0 }} />}
              </div>
              <p style={{ fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 1.8 }}>{n.body}</p>
              <p style={{ fontSize: 10, color: c.muted, marginTop: 4 }}>{fmtJalali(n.created_at.slice(0, 10))}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsSettings({ ctx }) {
  const { c, notify } = ctx;
  const [prefs, setPrefs] = useState(null);
  const [permState, setPermState] = useState("default");
  const [busy, setBusy] = useState(false);
  const [showIosOnboarding, setShowIosOnboarding] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(undefined); // undefined = loading, null = not linked, number = linked
  const [userId, setUserId] = useState(null);

  const supported = isPushSupported();
  const ios = isIos();
  const standalone = isInStandaloneMode();
  // On iOS specifically, "supported" (PushManager exists) already implies
  // standalone — iOS never exposes it to a plain Safari tab. This flag is
  // for the explicit guidance message, not the enable button's own gating.
  const needsIosInstall = ios && !standalone;

  const loadTelegramStatus = async (uid) => {
    const { data } = await supabase.from("telegram_links").select("chat_id").eq("user_id", uid).single().catch(() => ({ data: null }));
    setTelegramChatId(data?.chat_id ?? null);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).single();
      setPrefs(data || { ...DEFAULT_PREFS, user_id: user.id });
      setPermState(await getPushPermissionState());
      loadTelegramStatus(user.id);
    })();
  }, []);

  const savePrefs = async (next) => {
    setPrefs(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notification_preferences").upsert({ ...next, user_id: user.id, updated_at: new Date().toISOString() });
  };

  const handleEnable = async () => {
    if (needsIosInstall) { setShowIosOnboarding(true); return; }
    if (!supported) { notify("اعلان‌های این دستگاه در این حالت در دسترس نیست."); return; }
    setBusy(true);
    try {
      await enablePush();
      setPermState("granted");
      notify("اعلان‌های Flora فعال شد");
    } catch (e) {
      if (e.message === "PERMISSION_DENIED") notify("اجازه‌ی اعلان داده نشد — از تنظیمات گوشی قابل تغییره");
      else if (e.message === "NOT_SUPPORTED") notify("اعلان‌های این دستگاه در این حالت در دسترس نیست.");
      else notify("فعال‌سازی اعلان‌ها ناموفق بود");
    }
    setBusy(false);
  };

  const handleDisable = async () => {
    setBusy(true);
    await disablePush().catch(() => {});
    setPermState(await getPushPermissionState());
    notify("اعلان‌ها غیرفعال شد");
    setBusy(false);
  };

  const connectTelegram = () => {
    if (!userId) return;
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${userId}`, "_blank");
  };

  // Linking happens inside Telegram itself (the person taps /start there,
  // never comes back through any code Flora controls) — re-checking when
  // they return to this tab is the only way to notice it actually worked.
  useEffect(() => {
    const onFocus = () => { if (userId) loadTelegramStatus(userId); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId]);

  if (!prefs) return null;

  return (
    <div>
      {showIosOnboarding && <IosInstallOnboarding ctx={ctx} onClose={() => setShowIosOnboarding(false)} />}

      {/* Enable/disable */}
      <div className="rounded-2xl p-4 mb-5" style={glass(c)}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: RAD.md, background: permState === "granted" ? c.successSoft : c.primarySoft }}>
            {permState === "granted" ? <Bell size={20} color={c.success} /> : <BellOff size={20} color={c.primary} />}
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 14, fontWeight: 700 }}>{permState === "granted" ? "اعلان‌ها فعال است" : "اعلان‌های Flora را فعال کن"}</p>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {!supported && !ios ? "اعلان‌های این دستگاه در این حالت در دسترس نیست." :
                needsIosInstall ? "روی آیفون، اول باید Flora رو به صفحه اصلی اضافه کنی" :
                  permState === "granted" ? "روی این دستگاه اعلان دریافت می‌کنی" : "برای دریافت اعلان، اول اجازه بده"}
            </p>
          </div>
        </div>
        <button
          onClick={permState === "granted" ? handleDisable : handleEnable}
          disabled={busy || (!supported && !needsIosInstall)}
          className="press w-full flex items-center justify-center rounded-xl mt-3.5"
          style={{ gap: 6, paddingBlock: 11, background: permState === "granted" ? c.surface2 : c.gradientPrimary, color: permState === "granted" ? c.ink : "#fff", fontSize: 13, fontWeight: 700, opacity: (!supported && !needsIosInstall) ? 0.5 : 1 }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : permState === "granted" ? <BellOff size={14} /> : <Bell size={14} />}
          {permState === "granted" ? "غیرفعال کردن اعلان‌ها" : needsIosInstall ? "راهنمای نصب روی آیفون" : "اعلان‌های Flora را فعال کن"}
        </button>
      </div>

      {/* Telegram — a second, independent delivery path. Doesn't need iOS
          Home Screen install, doesn't depend on Apple's push gateway at
          all; just a chat message the moment the person taps /start once. */}
      <div className="rounded-2xl p-4 mb-5" style={glass(c)}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: RAD.md, background: telegramChatId ? c.successSoft : c.primarySoft }}>
            <Send size={19} color={telegramChatId ? c.success : c.primary} />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 14, fontWeight: 700 }}>{telegramChatId ? "تلگرام وصل است" : "اعلان از طریق تلگرام"}</p>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {telegramChatId ? "اعلان‌ها اینجا هم می‌رسند — مستقل از این دستگاه" : "مطمئن‌تر از اعلان روی آیفون — یک بار /start بزن"}
            </p>
          </div>
        </div>
        {!telegramChatId && (
          <button onClick={connectTelegram} className="press w-full flex items-center justify-center rounded-xl mt-3.5" style={{ gap: 6, paddingBlock: 11, background: "linear-gradient(135deg,#2AABEE,#229ED9)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
            <Send size={14} /> اتصال به تلگرام
          </button>
        )}
      </div>

      {/* Categories */}
      <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>دسته‌بندی اعلان‌ها</p>
      <div className="rounded-2xl p-1 mb-5" style={glass(c)}>
        {CATEGORIES.map((cat, i) => (
          <div key={cat.key} className="flex items-center justify-between px-3" style={{ paddingBlock: 12, borderTop: i > 0 ? `1px solid ${c.border}` : "none" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</span>
            <Toggle c={c} on={prefs[cat.key] !== false} onChange={() => savePrefs({ ...prefs, [cat.key]: !prefs[cat.key] })} />
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>ساعات سکوت</p>
      <div className="rounded-2xl p-4 mb-5" style={glass(c)}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 13, fontWeight: 600 }}>در ساعات سکوت اعلان نفرست</span>
          <Toggle c={c} on={prefs.quiet_hours_enabled} onChange={() => savePrefs({ ...prefs, quiet_hours_enabled: !prefs.quiet_hours_enabled })} />
        </div>
        {prefs.quiet_hours_enabled && (
          <div className="flex items-center gap-2">
            <input type="time" value={prefs.quiet_hours_start} onChange={(e) => savePrefs({ ...prefs, quiet_hours_start: e.target.value })} style={{ flex: 1, background: c.surface2, border: "none", borderRadius: RAD.sm, padding: "8px 10px", fontSize: 13, color: c.ink }} />
            <span style={{ fontSize: 12, color: c.muted }}>تا</span>
            <input type="time" value={prefs.quiet_hours_end} onChange={(e) => savePrefs({ ...prefs, quiet_hours_end: e.target.value })} style={{ flex: 1, background: c.surface2, border: "none", borderRadius: RAD.sm, padding: "8px 10px", fontSize: 13, color: c.ink }} />
          </div>
        )}
      </div>

      {/* Preview level */}
      <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>پیش‌نمایش اعلان</p>
      <div className="rounded-2xl p-1 mb-5" style={glass(c)}>
        {[["full", "کامل"], ["summary", "خلاصه"], ["generic", "فقط «یک اعلان جدید از Flora»"]].map(([val, label], i) => (
          <button key={val} onClick={() => savePrefs({ ...prefs, preview_level: val })} className="press w-full flex items-center justify-between px-3" style={{ paddingBlock: 12, borderTop: i > 0 ? `1px solid ${c.border}` : "none" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${prefs.preview_level === val ? c.primary : c.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {prefs.preview_level === val && <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.primary }} />}
            </div>
          </button>
        ))}
      </div>
      {(prefs.preview_level === "full") && (
        <div className="flex items-start gap-2 mb-5" style={{ padding: SP.sm, borderRadius: RAD.sm, background: c.attnSoft }}>
          <AlertTriangle size={12} color={c.attn} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: c.attn, lineHeight: 1.7 }}>با پیش‌نمایش «کامل»، جزئیات حساس حقوقی/مالی هم روی صفحه‌ی قفل گوشی نشون داده می‌شه.</p>
        </div>
      )}
    </div>
  );
}

// ---------- Test panel — lets the person schedule one real reminder for a
// time they pick, with a message they write, and watch it move from
// pending to sent. This exists specifically because "notifications aren't
// arriving" is otherwise impossible to debug from inside the app — this
// runs the exact same pipeline a real appointment/check reminder would
// (insert into scheduled_reminders → picked up by the cron job → sent via
// the same send path), so if this doesn't arrive, nothing else would either.
function NotificationTestPanel({ ctx }) {
  const { c, notify } = ctx;
  const [time, setTime] = useState(() => {
    const soon = new Date(Date.now() + 2 * 60000); // default: 2 minutes from now
    return soon.toTimeString().slice(0, 5);
  });
  const [message, setMessage] = useState("پیام تستی از Flora");
  const [busy, setBusy] = useState(false);
  const [activeDeviceCount, setActiveDeviceCount] = useState(null);
  const [devices, setDevices] = useState([]);
  const [testReminders, setTestReminders] = useState([]);

  const loadStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: subs } = await supabase.from("push_subscriptions").select("id, device_name, is_active, last_used_at, last_send_status, last_send_error").eq("user_id", user.id).order("created_at", { ascending: false });
    setDevices(subs || []);
    setActiveDeviceCount((subs || []).filter((s) => s.is_active).length);
    const { data: reminders } = await supabase.from("scheduled_reminders").select("*").eq("user_id", user.id).eq("category", "test").order("remind_at", { ascending: false }).limit(10);
    setTestReminders(reminders || []);
  };

  useEffect(() => {
    loadStatus();
    // Poll every 10s while this panel is open, so "pending → sent" updates
    // on screen without the person needing to back out and back in.
    const t = setInterval(loadStatus, 10000);
    return () => clearInterval(t);
  }, []);

  const scheduleTest = async () => {
    if (!message.trim()) { notify("یه پیام بنویس"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ابتدا وارد حساب شو");
      const today = new Date().toISOString().slice(0, 10);
      const remindAt = new Date(`${today}T${time}:00`);
      // If the picked time already passed today, this still submits it —
      // remind_at will already be <= now(), so the next cron tick (within 5
      // minutes) picks it up right away instead of waiting until tomorrow.
      // category:"test" bypasses quiet hours (see process-due-reminders) so
      // a test at any hour still actually fires.
      await supabase.from("scheduled_reminders").insert({
        user_id: user.id, remind_at: remindAt.toISOString(),
        title: "Flora (تست)", body: message.trim(), category: "test",
      });
      notify("تست ثبت شد — حداکثر تا ۵ دقیقه بعد از ساعتی که زدی باید برسه");
      setMessage("پیام تستی از Flora");
      loadStatus();
    } catch (e) { notify(e.message || "ثبت تست ناموفق بود"); }
    setBusy(false);
  };

  return (
    <div>
      <div className="rounded-2xl p-4 mb-5" style={glass(c)}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 13, fontWeight: 700 }}>دستگاه‌های فعال برای دریافت اعلان</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: activeDeviceCount > 0 ? c.success : c.danger }}>{activeDeviceCount === null ? "..." : activeDeviceCount}</span>
        </div>
        {activeDeviceCount === 0 && (
          <div className="flex items-start gap-2 mt-2" style={{ padding: SP.sm, borderRadius: RAD.sm, background: c.dangerSoft }}>
            <AlertTriangle size={12} color={c.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: c.danger, lineHeight: 1.8 }}>هیچ دستگاه فعالی نداری — حتی اگه تست رو ثبت کنی، جایی برای فرستادن نیست. برو تب «تنظیمات» و دوباره «اعلان‌های Flora را فعال کن» رو بزن.</p>
          </div>
        )}
        {devices.length > 0 && (
          <div className="flex flex-col gap-2 mt-3" style={{ paddingTop: 10, borderTop: `1px solid ${c.border}` }}>
            {devices.map((d) => (
              <div key={d.id}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.is_active ? c.ink : c.muted }}>{d.device_name || "دستگاه"}{!d.is_active && " (غیرفعال)"}</span>
                  {d.last_send_status && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: d.last_send_error ? c.danger : c.success }}>
                      {d.last_send_error ? `خطا (${d.last_send_status})` : `پذیرفته شد توسط سرور Apple/Google (${d.last_send_status})`}
                    </span>
                  )}
                </div>
                {d.last_send_error && <p style={{ fontSize: 10, color: c.danger, marginTop: 2, lineHeight: 1.7 }}>{d.last_send_error}</p>}
                {d.last_used_at && !d.last_send_error && <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>آخرین ارسال موفق: {new Date(d.last_used_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>ارسال یک اعلان تستی</p>
      <div className="rounded-2xl p-4 mb-5" style={glass(c)}>
        <div className="mb-3">
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>ساعت ارسال (امروز)</p>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: "100%", background: c.surface2, border: "none", borderRadius: RAD.sm, padding: "10px 12px", fontSize: 14, color: c.ink }} />
        </div>
        <div className="mb-3">
          <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>متن پیام</p>
          <input value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: "100%", background: c.surface2, border: "none", borderRadius: RAD.sm, padding: "10px 12px", fontSize: 13, color: c.ink }} />
        </div>
        <button onClick={scheduleTest} disabled={busy} className="press w-full flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 11, background: c.gradientPrimary, color: "#fff", fontSize: 13, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} ارسال تست
        </button>
      </div>

      {testReminders.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>تست‌های اخیر</p>
          <div className="flex flex-col gap-2">
            {testReminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl px-3.5" style={{ paddingBlock: 10, ...glassLite(c, RAD.md) }}>
                <div className="min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.body}</p>
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{new Date(r.remind_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: r.sent ? c.successSoft : c.attnSoft, color: r.sent ? c.success : c.attn, flexShrink: 0 }}>{r.sent ? "ارسال شد" : "در انتظار"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationsView({ ctx, onBack }) {
  const { c } = ctx;
  const [tab, setTab] = useState("settings"); // settings | history | test

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onBack} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronLeft size={16} color={c.ink} /></button>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>اعلان‌ها</p>
        </div>
        <div className="flex px-4 mb-4" style={{ gap: 6 }}>
          {[["settings", "تنظیمات"], ["history", "تاریخچه"], ["test", "تست"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className="press rounded-lg" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, background: tab === k ? c.primary : c.surface2, color: tab === k ? "#fff" : c.ink }}>{label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {tab === "settings" ? <NotificationsSettings ctx={ctx} /> : tab === "history" ? <NotificationHistory ctx={ctx} /> : <NotificationTestPanel ctx={ctx} />}
        </div>
      </div>
    </BodyPortal>
  );
}

export { NotificationsView };
