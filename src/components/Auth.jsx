import React, { useState, useRef } from "react";
import { Mic, Home, Layers, Sparkles, CheckCircle2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { SP, RAD, FS, FW, glass, glassLite, glassSurface } from "../lib/theme.js";
import { Field, inputStyle } from "../lib/ui.jsx";
import floraBrandIcon from "../assets/flora-icon.webp";
import floraWordmark from "../assets/flora-wordmark-new.webp";

const formatPhoneDisplay = (digits) => {
  const d = digits.slice(0, 11);
  const p1 = d.slice(0, 4), p2 = d.slice(4, 7), p3 = d.slice(7, 11);
  return [p1, p2, p3].filter(Boolean).join("-");
};
const phoneToE164 = (digits) => "+98" + digits.replace(/^0/, "");

function AuthPhoneField({ c, value, onChange }) {
  return (
    <Field c={c} label="شماره موبایل">
      <input
        dir="ltr" inputMode="numeric" style={{ ...inputStyle(c), textAlign: "left", letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}
        value={formatPhoneDisplay(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
        placeholder="0912-000-0000"
      />
    </Field>
  );
}

function AuthLoadingScreen({ c }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: c.bg }}>
      <style>{`@keyframes floraBreathe { 0%,100% { opacity:.25; transform:scale(.94); } 50% { opacity:.5; transform:scale(1); } }`}</style>
      <div style={{ animation: "floraBreathe 1.8s ease-in-out infinite" }}><img src={floraBrandIcon} alt="" style={{ width: 56, height: "auto" }} /></div>
    </div>
  );
}

// Six boxes instead of one masked field: each character auto-advances focus
// and glows on fill, so typing a password reads as a small piece of
// feedback rather than a wall of dots — the same trick used for OTP entry
// elsewhere, just re-purposed here since this app has no SMS step at all.
function PasswordBoxes({ c, value, onChange, disabled }) {
  const refs = useRef([]);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const commit = (next) => onChange(next.join(""));
  const setChar = (i, ch) => {
    const next = chars.slice();
    next[i] = ch;
    commit(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
  };
  return (
    <div dir="ltr" className="flex justify-center" style={{ gap: 6 }}>
      <style>{`
        @keyframes pwGlow { 0% { box-shadow: 0 0 0 0 rgba(124,111,245,0.55); } 70% { box-shadow: 0 0 0 9px rgba(124,111,245,0); } 100% { box-shadow: 0 0 0 0 rgba(124,111,245,0); } }
        .pw-box-filled { animation: pwGlow .45s ease-out; }
      `}</style>
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          value={ch}
          disabled={disabled}
          onChange={(e) => setChar(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          maxLength={1}
          autoFocus={i === 0}
          className={ch ? "pw-box-filled" : ""}
          style={{ width: 38, height: 48, textAlign: "center", fontSize: FS.subtitle, fontWeight: FW.heavy, borderRadius: RAD.md, border: `1.5px solid ${ch ? c.primary : c.border}`, background: c.surface2, color: c.ink, outline: "none", flexShrink: 0 }}
        />
      ))}
    </div>
  );
}

// Phone + a 6-character password — no SMS, no email, no third-party sign-in.
// The concentric glow rings behind the card are pure CSS (a repeating radial
// gradient, gently breathing), so the screen feels alive without pulling in
// an animation library just for one screen.
function AuthScreen({ c, dark }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const say = (text, error) => setMsg({ text, error: !!error });
  const phoneOk = /^09\d{9}$/.test(phone);
  const passwordOk = password.length === 6;

  // One field set, one button: try signing in first; if there's no account
  // yet, Supabase's error is generic ("invalid credentials") on purpose for
  // security, so a sign-up attempt right after is how we actually find out
  // whether the number is new or the password was just wrong.
  const submit = async () => {
    if (!phoneOk) { say("شماره را کامل وارد کن", true); return; }
    if (!passwordOk) { say("رمز باید دقیقاً ۶ کاراکتر باشد", true); return; }
    setLoading(true); setMsg(null);
    const phoneE164 = phoneToE164(phone);

    const { error: loginErr } = await supabase.auth.signInWithPassword({ phone: phoneE164, password });
    if (!loginErr) { setLoading(false); return; } // signed in — the session listener above takes it from here

    const { error: signupErr } = await supabase.auth.signUp({ phone: phoneE164, password });
    setLoading(false);
    if (!signupErr) return; // brand-new account, signed in immediately
    say(/registered|exists/i.test(signupErr.message) ? "رمز اشتباه است" : signupErr.message, true);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto" style={{ background: c.bg, padding: SP.xl }}>
      <style>{`
        @keyframes floraRingBreathe { 0%,100% { opacity:.5; transform: scale(1); } 50% { opacity:.85; transform: scale(1.04); } }
        @keyframes floraCardIn { from { opacity:0; transform: translateY(14px) scale(.97); } to { opacity:1; transform: translateY(0) scale(1); } }
      `}</style>
      <div
        className="fixed inset-0"
        style={{
          background: `repeating-radial-gradient(circle at 50% 42%, ${c.primary}14 0px, ${c.primary}14 1px, transparent 1px, transparent 46px)`,
          animation: "floraRingBreathe 5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        className="w-full relative"
        style={{ maxWidth: 360, animation: "floraCardIn .5s cubic-bezier(.22,1,.36,1)", padding: SP.xl, borderRadius: RAD.lg + 6, ...glass(c, RAD.lg + 6), boxShadow: "0 24px 60px -20px rgba(0,0,0,0.5)" }}
      >
        <div className="flex flex-col items-center" style={{ marginBottom: SP.xl }}>
          <img src={floraBrandIcon} alt="" style={{ width: 84, height: "auto" }} />
          <img src={floraWordmark} alt="Flora" style={{ width: 150, height: "auto", marginTop: SP.md }} />
          <div style={{ width: 36, height: 1, background: c.primary, opacity: 0.6, margin: `${SP.lg}px 0 ${SP.md}px` }} />
          <p style={{ fontSize: FS.subtitle + 1, fontWeight: FW.heavy, textAlign: "center", color: "#fff" }}>هر معامله بزرگ</p>
          <p style={{ fontSize: FS.caption, color: "#fff", opacity: 0.7, marginTop: 4, textAlign: "center" }}>از یک قدم درست شروع می‌شود</p>
        </div>

        {msg && (
          <div style={{ padding: SP.md, borderRadius: RAD.md, marginBottom: SP.lg, background: msg.error ? c.dangerSoft : c.successSoft, color: msg.error ? c.danger : c.success, fontSize: FS.caption, fontWeight: FW.bold, lineHeight: 1.8, textAlign: "center" }}>
            {msg.text}
          </div>
        )}

        <AuthPhoneField c={c} value={phone} onChange={setPhone} />
        <div style={{ marginTop: SP.md, marginBottom: SP.lg }}>
          <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm, textAlign: "center" }}>رمز عبور (۶ کاراکتر)</p>
          <PasswordBoxes c={c} value={password} onChange={setPassword} disabled={loading} />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="press w-full"
          style={{ paddingBlock: SP.md, borderRadius: RAD.md, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, opacity: loading ? 0.5 : 1, boxShadow: "0 12px 28px -10px rgba(47,124,246,0.5)" }}
        >
          {loading ? "..." : "ورود / ساخت حساب"}
        </button>
      </div>
    </div>
  );
}

// Runs exactly once, right after the very first sign-in: how the app should
// address this consultant, and which city's map to center on when they add
// a new listing. Two taps and a text field — never shown again once saved.
// A light popup over the already-usable home screen, not a blocking screen
// before the app loads — city is nice-to-have for a couple of home-screen
// insights, not a hard requirement to start using Flora.
function CityPopup({ c, session, onDone }) {
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const saveAndFinish = async () => {
    if (!city.trim()) { setMsg("شهر را وارد کن"); return; }
    setBusy(true);
    // upsert, not update: a brand-new signup has no profiles row yet at
    // all, so update() would silently touch zero rows (no error, but
    // nothing saved) — the popup would then come back every single login
    // since the city was never actually persisted.
    const { error } = await supabase.from("profiles").upsert({ id: session.user.id, city: city.trim() });
    setBusy(false);
    if (error) { setMsg("ذخیره نشد، دوباره امتحان کن"); return; }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", padding: SP.xl }}>
      <div className="w-full" style={{ maxWidth: 320, ...glassSurface(c), borderRadius: RAD.lg, padding: SP.xl }}>
        <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, textAlign: "center", marginBottom: SP.xs }}>خوش اومدی 👋</p>
        <p style={{ fontSize: FS.caption, color: c.muted, textAlign: "center", marginBottom: SP.lg }}>تو کدوم شهر فعالیت می‌کنی؟</p>
        {msg && <p style={{ color: c.danger, fontSize: FS.caption, textAlign: "center", marginBottom: SP.md }}>{msg}</p>}
        <Field c={c} label="شهر"><input style={inputStyle(c)} value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثلاً تهران" autoFocus /></Field>
        <button onClick={saveAndFinish} disabled={busy || !city.trim()} className="press w-full" style={{ marginTop: SP.sm, paddingBlock: SP.md, borderRadius: RAD.md, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, opacity: busy || !city.trim() ? 0.5 : 1 }}>{busy ? "..." : "ثبت"}</button>
      </div>
    </div>
  );
}

const TOUR_SLIDES = [
  { icon: Sparkles, title: "خوش اومدی به Flora", body: "دستیار هوشمند دفتر املاکت — بیشتر کارها رو با صدا انجام می‌دی، نه فرم پرکردن." },
  { icon: Mic, title: "صدا مهم‌ترین ابزارته", body: "هرجا میکروفون دیدی، بگو چی شده — مشتری جدید، تماس، چک، هزینه‌ی پروژه. Flora خودش ثبتش می‌کنه." },
  { icon: Home, title: "فایل‌ها و مشتری‌ها", body: "فایل‌ها خودشون بر اساس متراژ دسته‌بندی می‌شن. مشتری‌ها هم مرحله‌به‌مرحله پیگیری می‌شن." },
  { icon: Layers, title: "ابزارهای تخصصی", body: "Flora Legal، Flora Valuation، ساخت‌وساز و چک‌ها — همه زیر «بیشتر» و صفحه‌ی اصلی در دسترسن." },
];

// A short, skippable slide-through shown once per account — not a
// positional spotlight tour (too fragile to keep in sync as the app
// changes), just a fast, honest introduction to the handful of ideas that
// actually matter on day one. Skip is always reachable, on every slide.
function OnboardingTour({ c, onDone }) {
  const [step, setStep] = useState(0);
  const last = step === TOUR_SLIDES.length - 1;
  const slide = TOUR_SLIDES[step];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", padding: SP.xl }}>
      <div className="w-full" style={{ maxWidth: 340, ...glassSurface(c), borderRadius: RAD.lg, padding: SP.xl, position: "relative" }}>
        <button onClick={onDone} className="press" style={{ position: "absolute", top: SP.lg, left: SP.lg, fontSize: 12, color: c.muted, fontWeight: 700 }}>رد شدن</button>

        <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: "50%", background: c.primarySoft, margin: "36px auto 20px" }}>
          <Icon size={28} color={c.primary} />
        </div>
        <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, textAlign: "center", marginBottom: SP.sm }}>{slide.title}</p>
        <p style={{ fontSize: FS.body, color: c.muted, textAlign: "center", lineHeight: 1.9, marginBottom: SP.xl }}>{slide.body}</p>

        <div className="flex items-center justify-center" style={{ gap: 6, marginBottom: SP.lg }}>
          {TOUR_SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 999, background: i === step ? c.primary : c.border, transition: "all .25s" }} />
          ))}
        </div>

        <button
          onClick={() => last ? onDone() : setStep((s) => s + 1)}
          className="press w-full"
          style={{ paddingBlock: SP.md, borderRadius: RAD.md, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1 }}
        >
          {last ? "بزن بریم 🚀" : "بعدی"}
        </button>
      </div>
    </div>
  );
}

export { AuthPhoneField, AuthLoadingScreen, PasswordBoxes, AuthScreen, CityPopup, OnboardingTour, formatPhoneDisplay, phoneToE164 };
