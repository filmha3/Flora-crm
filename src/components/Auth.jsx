import React, { useState, useRef } from "react";
import { Mic, Home, Layers, Sparkles, CheckCircle2, X, Loader2 } from "lucide-react";
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
        placeholder="0912*******"
      />
    </Field>
  );
}

function AuthEmailField({ c, value, onChange }) {
  return (
    <Field c={c} label="ایمیل">
      <input
        dir="ltr" type="email" inputMode="email" autoComplete="username" autoCapitalize="off" autoCorrect="off"
        style={{ ...inputStyle(c), textAlign: "left" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
      />
    </Field>
  );
}

// Official Google "G" mark — the standard, brand-guideline icon for a
// "Sign in with Google" button (not a reproduction of anything else).
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 35.7 27 36.7 24 36.7c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 40.6 16.2 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.5C41.4 35.6 45 30.4 45 24c0-1.4-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

// Small pill segment — Email | Phone. Local to this screen only; nothing
// else in the app needed a reusable version of it.
function AuthMethodSegment({ c, value, onChange }) {
  const options = [["email", "ایمیل"], ["phone", "موبایل"]];
  return (
    <div className="flex" style={{ padding: 3, borderRadius: RAD.md, background: c.surface2, marginBottom: SP.lg }}>
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className="press flex-1"
          style={{ paddingBlock: 9, borderRadius: RAD.md - 2, fontSize: FS.caption, fontWeight: FW.bold, background: value === val ? c.gradientPrimary : "transparent", color: value === val ? "#fff" : c.muted, transition: "background .2s ease, color .2s ease" }}
        >
          {label}
        </button>
      ))}
    </div>
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
// and glows on fill, so typing a PIN reads as a small piece of feedback
// rather than a wall of dots — the same trick used for OTP entry elsewhere.
// Digit-only, exactly 6 — this is also what's sent to Supabase as the
// account's real password, so the shape is enforced right at the source.
function PasswordBoxes({ c, value, onChange, disabled }) {
  const refs = useRef([]);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const commit = (next) => onChange(next.join(""));
  const setChar = (i, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1); // digits only — never a letter or symbol
    const next = chars.slice();
    next[i] = digit;
    commit(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
  };
  // A 6-digit code pasted or autofilled into any one box fills all six —
  // covers both a password manager suggestion and a person pasting a code
  // they copied from somewhere else.
  const handlePaste = (e) => {
    const digits = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (digits.length < 2) return; // a single-digit paste is just normal typing
    e.preventDefault();
    commit(Array.from({ length: 6 }, (_, i) => digits[i] || ""));
    refs.current[Math.min(digits.length, 5)]?.focus();
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
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          value={ch}
          disabled={disabled}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          maxLength={1}
          autoFocus={i === 0}
          className={ch ? "pw-box-filled" : ""}
          style={{ width: 38, height: 48, textAlign: "center", fontSize: FS.subtitle, fontWeight: FW.heavy, borderRadius: RAD.md, border: `1.5px solid ${ch ? c.primary : c.border}`, background: c.surface2, color: c.ink, outline: "none", flexShrink: 0 }}
        />
      ))}
    </div>
  );
}

// Google, Email, or Phone — one shared 6-digit PIN field for the latter two
// (Google needs none, it's a full OAuth redirect). Same "try sign-in, fall
// back to sign-up" pattern as before for email/phone, now shared across
// both identifiers instead of hardcoded to phone. The concentric glow rings
// behind the card are pure CSS (a repeating radial gradient, gently
// breathing), so the screen feels alive without pulling in an animation
// library just for one screen.
function AuthScreen({ c, dark }) {
  const [method, setMethod] = useState("phone"); // "email" | "phone" — Google is its own button below, not a third tab
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const say = (text, error) => setMsg({ text, error: !!error });
  const phoneOk = /^09\d{9}$/.test(phone);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  // Exactly 6 digits, nothing else — enforced again here even though
  // PasswordBoxes already filters keystrokes to digits, since validation
  // has to hold regardless of how the value got into state (paste,
  // autofill, a future caller).
  const pinOk = /^\d{6}$/.test(pin);

  const submit = async () => {
    if (method === "phone" && !phone) { say("شماره موبایل را وارد کن", true); return; }
    if (method === "phone" && !phoneOk) { say("شماره موبایل معتبر نیست", true); return; }
    if (method === "email" && !email.trim()) { say("ایمیل را وارد کن", true); return; }
    if (method === "email" && !emailOk) { say("ایمیل معتبر نیست", true); return; }
    if (!pin) { say("رمز را وارد کن", true); return; }
    if (!pinOk) { say("رمز باید دقیقاً ۶ رقم باشد", true); return; }

    setLoading(true); setMsg(null);
    // Whatever the identifier, the PIN goes straight into Supabase Auth's
    // own password field — it's never written to any table Flora controls,
    // Supabase hashes and stores it itself.
    const credentials = method === "phone" ? { phone: phoneToE164(phone), password: pin } : { email: email.trim(), password: pin };

    const { error: loginErr } = await supabase.auth.signInWithPassword(credentials);
    if (!loginErr) { setLoading(false); return; } // signed in — the session listener elsewhere takes it from here

    const { error: signupErr } = await supabase.auth.signUp(credentials);
    setLoading(false);
    if (!signupErr) return; // brand-new account, signed in immediately
    say(/registered|exists/i.test(signupErr.message) ? "رمز اشتباه است" : signupErr.message, true);
  };

  const submitGoogle = async () => {
    setGoogleLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    // On success the browser is redirected away to Google immediately, so
    // there's nothing to reset here — only a same-tab failure reaches this line.
    if (error) { setGoogleLoading(false); say("ورود با Google ممکن نشد", true); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto" style={{ background: c.bg, padding: SP.xl }}>
      <style>{`
        @keyframes floraRingBreathe { 0%,100% { opacity:.4; transform: scale(1); } 50% { opacity:.6; transform: scale(1.015); } }
        @keyframes floraCardIn { from { opacity:0; transform: translateY(14px) scale(.97); } to { opacity:1; transform: translateY(0) scale(1); } }
        .flora-auth-ring { animation: floraRingBreathe 8s cubic-bezier(.45,0,.55,1) infinite; }
        .flora-auth-card { animation: floraCardIn .5s cubic-bezier(.22,1,.36,1) backwards; }
        @media (prefers-reduced-motion: reduce) {
          .flora-auth-ring { animation: none; opacity: .5; }
          .flora-auth-card { animation: none; }
        }
      `}</style>
      {/* A very slow, low-amplitude breathe — restrained on purpose. This is
          ambient texture behind a login form, not something that should
          compete for attention; if it's noticeable as "moving," it's doing
          too much. */}
      <div
        className="fixed inset-0 flora-auth-ring"
        style={{
          background: `repeating-radial-gradient(circle at 50% 42%, ${c.primary}14 0px, ${c.primary}14 1px, transparent 1px, transparent 46px)`,
          pointerEvents: "none",
        }}
      />
      <div
        className="w-full relative flora-auth-card"
        style={{ maxWidth: 360, padding: SP.xl, ...glass(c), borderRadius: RAD.lg + 6, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.5)" }}
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

        {/* Google — its own button, deliberately outside the Email/Phone
            segment since it needs no PIN and no tab of its own. */}
        <button
          onClick={submitGoogle}
          disabled={googleLoading || loading}
          className="press w-full flex items-center justify-center"
          style={{ gap: 10, paddingBlock: SP.md, borderRadius: RAD.md, background: "#fff", color: "#1f1f1f", fontWeight: FW.bold, fontSize: FS.body, marginBottom: SP.lg, opacity: googleLoading ? 0.7 : 1, border: "1px solid rgba(0,0,0,0.08)" }}
        >
          {googleLoading ? <Loader2 size={17} className="animate-spin" /> : <GoogleIcon size={17} />}
          ورود با Google
        </button>

        <div className="flex items-center" style={{ gap: SP.sm, marginBottom: SP.lg }}>
          <div style={{ flex: 1, height: 1, background: c.border }} />
          <span style={{ fontSize: 11, color: c.muted, fontWeight: 700 }}>یا</span>
          <div style={{ flex: 1, height: 1, background: c.border }} />
        </div>

        <AuthMethodSegment c={c} value={method} onChange={(m) => { setMethod(m); setMsg(null); }} />

        {method === "phone" ? <AuthPhoneField c={c} value={phone} onChange={setPhone} /> : <AuthEmailField c={c} value={email} onChange={setEmail} />}

        <div style={{ marginTop: SP.md, marginBottom: SP.lg }}>
          <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm, textAlign: "center" }}>رمز عبور (۶ رقم)</p>
          <PasswordBoxes c={c} value={pin} onChange={setPin} disabled={loading} />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="press w-full flex items-center justify-center"
          style={{ gap: 8, paddingBlock: SP.md, borderRadius: RAD.md, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, opacity: loading ? 0.7 : 1, boxShadow: "0 12px 28px -10px rgba(47,124,246,0.5)" }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "در حال ورود..." : "ورود / ساخت حساب"}
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

export { AuthPhoneField, AuthEmailField, AuthLoadingScreen, PasswordBoxes, AuthMethodSegment, GoogleIcon, AuthScreen, CityPopup, OnboardingTour, formatPhoneDisplay, phoneToE164 };
