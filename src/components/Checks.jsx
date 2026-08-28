import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Mic, AlertTriangle, Loader2, ChevronDown, CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassSurface } from "../lib/theme.js";
import { BodyPortal, EmptyLine, Field, inputStyle, JalaliDatePicker } from "../lib/ui.jsx";
import { toNum, uid, fmtToman, faDigits, fmtJalali, todayISO, toEnDigits, isoToJalali, MONTHS_FA } from "../lib/format.js";
import { fmtBudgetShort } from "../lib/constants.js";
import { groupChecksByMonth } from "../lib/checks.js";

function ChecksVoiceCapture({ ctx, onExtracted, onClose }) {
  const { c, canTranscribe, transcribeAudio, hasAiKey, callAI } = ctx;
  const [phase, setPhase] = useState("idle"); // idle | recording | transcribing | extracting | error
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => { start(); return () => { clearInterval(timerRef.current); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()); }; }, []); // eslint-disable-line

  const start = async () => {
    if (!canTranscribe) { setError("اول کلید AvalAI را در تنظیمات وارد کن"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); done(rec.mimeType || "audio/webm"); };
      mediaRef.current = rec; rec.start();
      setPhase("recording"); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => { if (s + 1 >= 25) stop(); return s + 1; }), 1000);
    } catch (e) { setError("دسترسی به میکروفون داده نشد"); }
  };
  const stop = () => { clearInterval(timerRef.current); if (mediaRef.current?.state === "recording") mediaRef.current.stop(); };

  const done = async (mimeType) => {
    setPhase("transcribing");
    try {
      const text = await transcribeAudio(new Blob(chunksRef.current, { type: mimeType }));
      setPhase("extracting");
      if (!hasAiKey) throw new Error("کلید هوش مصنوعی لازم است");
      const [jy, jm, jd] = isoToJalali(todayISO());
      const prompt = `مشاور یک چک پرداختی را با صدا توصیف کرده. امروز شمسی ${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)} است.
متن: «${text}»

نکته‌ی مهم درباره‌ی اعداد فارسی محاوره‌ای — حتماً رعایت کن:
«هفت میلیارد» = 7000000000 — «7 میلیارد» = 7000000000 — «هفت میلیارد تومن» یا «۷ میلیارد تومان» هم همین‌طور.
«سه و نیم میلیارد» = 3500000000 — «صد و بیست میلیون» = 120000000 — «پونصد میلیون» = 500000000 — «سیصد میلیون» = 300000000.
هرگز میلیارد و میلیون را با هم اشتباه نگیر: «۱۲ میلیارد» یعنی 12000000000، نه 12000000.
«تومن» و «تومان» یکی هستند. اگر «ریال» گفته شد، برای تبدیل به تومان تقسیم بر ۱۰ کن.
اگر عدد و واحد هردو گفته شده، حتماً به عدد کامل تبدیلش کن، نصفه‌کاره نگذار.

این JSON خام را برگردان: {"recipient":"اسم گیرنده چک یا خالی","amount":0,"dueDateJalali":"تاریخ شمسی سررسید مثل ۲۵ مرداد ۱۴۰۵، اگر نسبی گفته (مثل دو هفته دیگه) خودت حساب کن، وگرنه خالی","notes":"هر توضیح اضافه یا خالی"}`;
      const raw = await callAI(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن");
      let parsed;
      try { parsed = JSON.parse(jsonMatch[0]); } catch { throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن"); }
      onExtracted(parsed);
    } catch (e) { setError(e.message || "خطا در پردازش"); setPhase("error"); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", padding: SP.xl }}>
      <div style={{ ...glassSurface(c), borderRadius: RAD.lg, padding: SP.xl, maxWidth: 300, width: "100%", textAlign: "center" }}>
        {phase === "recording" && (
          <>
            <div className="flex items-center justify-center" style={{ width: 70, height: 70, borderRadius: "50%", background: c.dangerSoft, margin: "0 auto" }}>
              <button onClick={stop} className="press flex items-center justify-center" style={{ width: 50, height: 50, borderRadius: "50%", background: c.danger }}><div style={{ width: 16, height: 16, borderRadius: 4, background: "#fff" }} /></button>
            </div>
            <p style={{ marginTop: SP.md, fontSize: 13, color: c.muted }}>بگو برای کی، چقدر، کِی — {faDigits(seconds)} ثانیه</p>
          </>
        )}
        {(phase === "transcribing" || phase === "extracting") && (<><Loader2 size={28} color={c.primary} className="animate-spin" style={{ margin: "0 auto" }} /><p style={{ marginTop: SP.md, fontSize: 13, color: c.muted }}>{phase === "transcribing" ? "در حال شنیدن..." : "در حال فهمیدن..."}</p></>)}
        {phase === "error" && (<><AlertTriangle size={26} color={c.danger} style={{ margin: "0 auto" }} /><p style={{ marginTop: SP.md, fontSize: 12, color: c.danger }}>{error}</p></>)}
        <button onClick={onClose} className="press w-full rounded-xl py-2.5 mt-4" style={{ background: c.surface2, fontSize: 12, fontWeight: 700 }}>لغو</button>
      </div>
    </div>
  );
}

// Checks — its own standalone home-screen section now, deliberately
// separate from Finance. Grouped into a single-open month accordion once
// the list gets long (same UX pattern as the size-category accordion on
// Files), with each month's header showing real received/paid totals, not
// just a count.
function ChecksHome({ ctx, onClose }) {
  const { c, checks, setChecks, notify } = ctx;
  const groups = groupChecksByMonth(checks);
  const [openMonthKey, setOpenMonthKey] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [editCheck, setEditCheck] = useState(null);

  useEffect(() => {
    if (groups.length > 0 && openMonthKey === null) {
      const [ty, tm] = isoToJalali(todayISO());
      const todayKey = `${ty}-${String(tm).padStart(2, "0")}`;
      const match = groups.find((g) => g.key === todayKey) || groups[0];
      setOpenMonthKey(match.key);
    }
  }, [groups.length]); // eslint-disable-line

  const unpaidTotal = checks.filter((ch) => !ch.paid && (ch.type || "پرداختی") === "پرداختی").reduce((s, ch) => s + ch.amount, 0);

  const handleVoiceExtracted = (parsed) => {
    setShowVoice(false);
    setEditCheck({
      id: null, recipient: parsed.recipient || "", amount: parsed.amount || "", dueDate: todayISO(),
      notes: parsed.notes || "", type: "پرداختی", checkNumber: "", paid: false,
      _dueDateHint: parsed.dueDateJalali || "",
    });
  };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center justify-between shrink-0" style={{ padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <div className="flex items-center" style={{ gap: SP.md }}>
            <button onClick={onClose} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
            <div>
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>چک‌ها</p>
              <p style={{ fontSize: 11, color: c.muted }}>مجموع پرداخت‌نشده: {fmtToman(unpaidTotal)}</p>
            </div>
          </div>
          <div className="flex" style={{ gap: 6 }}>
            {ctx.canTranscribe && <button onClick={() => setShowVoice(true)} className="press w-10 h-10 rounded-full flex items-center justify-center" style={{ background: c.primarySoft }}><Mic size={15} color={c.primary} /></button>}
            <button onClick={() => setEditCheck({ id: null, recipient: "", amount: "", dueDate: todayISO(), notes: "", type: "پرداختی", checkNumber: "", paid: false })} className="press w-10 h-10 rounded-full flex items-center justify-center" style={{ background: c.gradientPrimary }}><Plus size={16} color="#fff" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {showVoice && <ChecksVoiceCapture ctx={ctx} onExtracted={handleVoiceExtracted} onClose={() => setShowVoice(false)} />}

          {groups.length === 0 ? (
            <EmptyLine c={c} text="هنوز چکی ثبت نکردی — با دکمه‌ی + یا میکروفون بالا اضافه کن" />
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((g) => {
                const open = openMonthKey === g.key;
                return (
                  <div key={g.key} className="rounded-2xl overflow-hidden" style={glass(c)}>
                    <button onClick={() => setOpenMonthKey(open ? null : g.key)} className="press w-full text-right flex items-center justify-between px-4" style={{ paddingBlock: 13 }}>
                      <div className="flex items-center gap-2">
                        <ChevronDown size={15} color={c.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{g.label}</span>
                      </div>
                      <div className="text-left" style={{ fontSize: 10.5 }}>
                        {g.totalReceived > 0 && <span style={{ color: c.success, fontWeight: 700 }}>{fmtBudgetShort(g.totalReceived)} دریافتی</span>}
                        {g.totalReceived > 0 && g.totalPaid > 0 && <span style={{ color: c.muted }}> · </span>}
                        {g.totalPaid > 0 && <span style={{ color: c.danger, fontWeight: 700 }}>{fmtBudgetShort(g.totalPaid)} پرداختی</span>}
                      </div>
                    </button>
                    {open && (
                      <div className="flex flex-col gap-2 px-3" style={{ paddingBottom: SP.md }}>
                        {g.checks.map((ch) => {
                          const isReceived = (ch.type || "پرداختی") === "دریافتی";
                          return (
                            <button key={ch.id} onClick={() => setEditCheck({ ...ch, amount: String(ch.amount) })} className="press w-full text-right rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2, opacity: ch.paid ? 0.55 : 1 }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: isReceived ? c.successSoft : c.dangerSoft }}>
                                {isReceived ? <ArrowDownLeft size={14} color={c.success} /> : <ArrowUpRight size={14} color={c.danger} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 12.5, fontWeight: 700, textDecoration: ch.paid ? "line-through" : "none" }}>{ch.recipient}{ch.checkNumber ? ` · #${faDigits(ch.checkNumber)}` : ""}</p>
                                <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{fmtJalali(ch.dueDate)}{ch.notes ? ` · ${ch.notes}` : ""}</p>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: isReceived ? c.success : c.danger, flexShrink: 0 }}>{fmtToman(ch.amount)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {editCheck && <ChecksEditSheet ctx={ctx} check={editCheck} onClose={() => setEditCheck(null)} />}
    </BodyPortal>
  );
}

function ChecksEditSheet({ ctx, check, onClose }) {
  const { c, setChecks, notify } = ctx;
  const isNew = !check.id;
  const [recipient, setRecipient] = useState(check.recipient || "");
  const [amount, setAmount] = useState(check.amount || "");
  const [dueDate, setDueDate] = useState(check.dueDate || todayISO());
  const [notes, setNotes] = useState(check.notes || "");
  const [type, setType] = useState(check.type || "پرداختی");
  const [checkNumber, setCheckNumber] = useState(check.checkNumber || "");

  const save = () => {
    if (!recipient.trim() || !toNum(amount)) { notify("گیرنده و مبلغ لازم است"); return; }
    if (isNew) {
      setChecks((prev) => [{ id: uid(), recipient: recipient.trim(), amount: toNum(amount), dueDate, notes: notes.trim(), type, checkNumber: toEnDigits(checkNumber).trim(), createdAt: new Date().toISOString(), paid: false }, ...prev]);
      notify("چک ثبت شد");
    } else {
      setChecks((prev) => prev.map((ch) => ch.id === check.id ? { ...ch, recipient: recipient.trim(), amount: toNum(amount), dueDate, notes: notes.trim(), type, checkNumber: toEnDigits(checkNumber).trim() } : ch));
      notify("چک به‌روزرسانی شد");
    }
    onClose();
  };

  const togglePaid = () => { setChecks((prev) => prev.map((ch) => ch.id === check.id ? { ...ch, paid: !ch.paid } : ch)); onClose(); };
  const remove = () => { setChecks((prev) => prev.filter((ch) => ch.id !== check.id)); notify("چک حذف شد"); onClose(); };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[260] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390, maxHeight: "85vh", overflowY: "auto" }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.lg }}>{isNew ? "چک جدید" : "ویرایش چک"}</p>
          {check._dueDateHint && <p style={{ fontSize: 11, color: c.attn, marginBottom: SP.md }}>تاریخ گفته‌شده: {check._dueDateHint} — پایین تنظیم کن</p>}

          <Field c={c} label="نوع چک">
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("پرداختی")} className="press flex-1 rounded-lg" style={{ paddingBlock: 9, background: type === "پرداختی" ? c.danger : c.surface2, color: type === "پرداختی" ? "#fff" : c.muted, fontSize: 12, fontWeight: 700 }}>پرداختی</button>
              <button type="button" onClick={() => setType("دریافتی")} className="press flex-1 rounded-lg" style={{ paddingBlock: 9, background: type === "دریافتی" ? c.success : c.surface2, color: type === "دریافتی" ? "#fff" : c.muted, fontSize: 12, fontWeight: 700 }}>دریافتی</button>
            </div>
          </Field>
          <Field c={c} label={type === "دریافتی" ? "پرداخت‌کننده" : "گیرنده چک"}><input value={recipient} onChange={(e) => setRecipient(e.target.value)} style={inputStyle(c)} placeholder="مثلاً آقای احمدی" /></Field>
          <Field c={c} label="مبلغ (تومان)">
            <input value={amount} onChange={(e) => setAmount(toEnDigits(e.target.value).replace(/[^\d]/g, ""))} style={inputStyle(c)} inputMode="numeric" placeholder="100.000.000" dir="ltr" />
            <p style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>{fmtToman(toNum(amount))}</p>
          </Field>
          <Field c={c} label="شماره چک (اختیاری)"><input value={checkNumber} onChange={(e) => setCheckNumber(toEnDigits(e.target.value))} style={inputStyle(c)} placeholder="مثلاً 123456 یا ۱۲۳۴۵۶" dir="ltr" /></Field>
          <Field c={c} label="تاریخ سررسید"><JalaliDatePicker c={c} value={dueDate} onChange={setDueDate} /></Field>
          <Field c={c} label="توضیحات (اختیاری)"><input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle(c)} /></Field>

          {!isNew && (
            <button onClick={togglePaid} className="press w-full flex items-center justify-center rounded-xl mb-3" style={{ gap: 6, paddingBlock: 11, background: check.paid ? c.attnSoft : c.successSoft, color: check.paid ? c.attn : c.success, fontWeight: 700, fontSize: 12.5 }}>
              {check.paid ? <><Clock size={14} /> علامت‌گذاری به‌عنوان پرداخت‌نشده</> : <><CheckCircle2 size={14} /> علامت‌گذاری به‌عنوان پرداخت‌شده</>}
            </button>
          )}

          <div className="flex gap-2">
            {!isNew && <button onClick={remove} className="press rounded-xl" style={{ paddingInline: 16, paddingBlock: 13, background: c.dangerSoft, color: c.danger, fontWeight: 700, fontSize: 13 }}><Trash2 size={15} /></button>}
            <button onClick={onClose} className="press flex-1 rounded-xl" style={{ paddingBlock: 13, background: c.surface2, fontWeight: 700, fontSize: 13 }}>لغو</button>
            <button onClick={save} className="press flex-1 rounded-xl" style={{ paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>ذخیره</button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

export { ChecksHome };
