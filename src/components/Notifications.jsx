import React, { useState, useEffect } from "react";
import { Bell, BellOff, Share2, Plus, Smartphone, Check, X, ChevronLeft, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { SP, RAD, FS, FW, glass, glassLite } from "../lib/theme.js";
import { EmptyLine, BodyPortal } from "../lib/ui.jsx";
import { fmtJalali } from "../lib/format.js";
import { isPushSupported, isIos, isInStandaloneMode, enablePush, disablePush, getPushPermissionState } from "../lib/push.js";

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
          <button onClick={onClose} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>Flora را مثل یک اپ روی آیفون نصب کن</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex" style={{ gap: SP.md, marginBottom: SP.xl }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: "50%", background: c.primarySoft, fontWeight: 800, fontSize: 15, color: c.primary }}>{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><s.icon size={16} color={c.primary} /><p style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</p></div>
                <p style={{ fontSize: 12.5, color: c.muted, lineHeight: 1.9 }}>{s.desc}</p>
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
            <button key={n.id} onClick={() => !n.read && markRead(n.id)} className="press w-full text-right" style={{ padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md), opacity: n.read ? 0.6 : 1 }}>
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

  const supported = isPushSupported();
  const ios = isIos();
  const standalone = isInStandaloneMode();
  // On iOS specifically, "supported" (PushManager exists) already implies
  // standalone — iOS never exposes it to a plain Safari tab. This flag is
  // for the explicit guidance message, not the enable button's own gating.
  const needsIosInstall = ios && !standalone;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).single();
      setPrefs(data || { ...DEFAULT_PREFS, user_id: user.id });
      setPermState(await getPushPermissionState());
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

  if (!prefs) return null;

  return (
    <div>
      {showIosOnboarding && <IosInstallOnboarding ctx={ctx} onClose={() => setShowIosOnboarding(false)} />}

      {/* Enable/disable */}
      <div className="rounded-2xl p-4 mb-5" style={glass(c, 22)}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: RAD.md, background: permState === "granted" ? c.successSoft : c.primarySoft }}>
            {permState === "granted" ? <Bell size={20} color={c.success} /> : <BellOff size={20} color={c.primary} />}
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 14, fontWeight: 700 }}>{permState === "granted" ? "اعلان‌ها فعال است" : "اعلان‌های Flora را فعال کن"}</p>
            <p style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>
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
          style={{ gap: 6, paddingBlock: 11, background: permState === "granted" ? c.surface2 : "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: permState === "granted" ? c.ink : "#fff", fontSize: 13, fontWeight: 700, opacity: (!supported && !needsIosInstall) ? 0.5 : 1 }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : permState === "granted" ? <BellOff size={14} /> : <Bell size={14} />}
          {permState === "granted" ? "غیرفعال کردن اعلان‌ها" : needsIosInstall ? "راهنمای نصب روی آیفون" : "اعلان‌های Flora را فعال کن"}
        </button>
      </div>

      {/* Categories */}
      <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>دسته‌بندی اعلان‌ها</p>
      <div className="rounded-2xl p-1 mb-5" style={glass(c, 22)}>
        {CATEGORIES.map((cat, i) => (
          <div key={cat.key} className="flex items-center justify-between px-3" style={{ paddingBlock: 12, borderTop: i > 0 ? `1px solid ${c.border}` : "none" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</span>
            <Toggle c={c} on={prefs[cat.key] !== false} onChange={() => savePrefs({ ...prefs, [cat.key]: !prefs[cat.key] })} />
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>ساعات سکوت</p>
      <div className="rounded-2xl p-4 mb-5" style={glass(c, 22)}>
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
      <div className="rounded-2xl p-1 mb-5" style={glass(c, 22)}>
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
          <p style={{ fontSize: 10.5, color: c.attn, lineHeight: 1.7 }}>با پیش‌نمایش «کامل»، جزئیات حساس حقوقی/مالی هم روی صفحه‌ی قفل گوشی نشون داده می‌شه.</p>
        </div>
      )}
    </div>
  );
}

function NotificationsView({ ctx, onBack }) {
  const { c } = ctx;
  const [tab, setTab] = useState("settings"); // settings | history

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onBack} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronLeft size={16} color={c.ink} /></button>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>اعلان‌ها</p>
        </div>
        <div className="flex px-4 mb-4" style={{ gap: 6 }}>
          {[["settings", "تنظیمات"], ["history", "تاریخچه"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className="press rounded-lg" style={{ padding: "8px 16px", fontSize: 12.5, fontWeight: 700, background: tab === k ? c.primary : c.surface2, color: tab === k ? "#fff" : c.ink }}>{label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {tab === "settings" ? <NotificationsSettings ctx={ctx} /> : <NotificationHistory ctx={ctx} />}
        </div>
      </div>
    </BodyPortal>
  );
}

export { NotificationsView };
