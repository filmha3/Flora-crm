import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Mic, Edit3, ChevronRight, HardHat, Check, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite, glassSurface } from "../lib/theme.js";
import { BodyPortal, EmptyLine, Field, inputStyle, JalaliDatePicker } from "../lib/ui.jsx";
import { toNum, uid, fmtToman, faDigits, fmtJalali, todayISO, toEnDigits, isoToJalali, MONTHS_FA } from "../lib/format.js";
import { CONSTRUCTION_CATEGORIES, fmtBudgetShort } from "../lib/constants.js";
import { computeProjectStats, computeMonthlyReport } from "../lib/construction.js";

// Construction & Building — a deliberately separate workspace from general
// Finance (per explicit instruction: "این حسابداری عمومی نیست"). Voice/text
// entry never stores the audio itself, only the extracted transcript text —
// every transaction is still fully confirmable/editable before it saves,
// matching the same "never finalize without the advisor seeing it" rule
// used everywhere else voice creates something.
function ConstructionHome({ ctx, onClose }) {
  const { c, constructionProjects, constructionTransactions, setConstructionProjects, notify } = ctx;
  const [openProjectId, setOpenProjectId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const project = openProjectId ? constructionProjects.find((p) => p.id === openProjectId) : null;
  if (project) {
    return <ConstructionProjectDetail ctx={ctx} project={project} onBack={() => setOpenProjectId(null)} onClose={onClose} />;
  }

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onClose} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>ساخت‌وساز و ساختمان</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {constructionProjects.length === 0 ? (
            <EmptyLine c={c} text="هنوز پروژه‌ای نداری — با «پروژه جدید» شروع کن" />
          ) : (
            <div className="flex flex-col gap-3 mb-4">
              {constructionProjects.map((p) => {
                const stats = computeProjectStats(constructionTransactions, p.id);
                const jNow = isoToJalali(todayISO());
                const monthly = computeMonthlyReport(constructionTransactions, p.id, jNow[0], jNow[1]);
                return (
                  <button key={p.id} onClick={() => setOpenProjectId(p.id)} className="press w-full text-right rounded-2xl p-4" style={glass(c)}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.attnSoft }}><HardHat size={17} color={c.attn} /></div>
                      <div className="min-w-0">
                        <p style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</p>
                        {p.buildingType && <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{p.buildingType}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ fontSize: 10.5, color: c.muted }}>هزینه تا امروز</p>
                        <p style={{ fontSize: 17, fontWeight: 800 }}>{fmtBudgetShort(stats.totalSpent)}</p>
                      </div>
                      <div className="text-left">
                        <p style={{ fontSize: 10.5, color: c.muted }}>این ماه</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>{fmtBudgetShort(monthly.total)}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 10.5, color: c.muted, marginTop: SP.sm }}>{faDigits(stats.count)} پرداخت</p>
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => setShowAdd(true)} className="press w-full flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
            <Plus size={15} /> پروژه جدید
          </button>
        </div>
      </div>
      {showAdd && (
        <ConstructionAddProject
          ctx={ctx}
          onClose={() => setShowAdd(false)}
          onCreated={(id) => { setShowAdd(false); setOpenProjectId(id); }}
        />
      )}
    </BodyPortal>
  );
}

function ConstructionAddProject({ ctx, onClose, onCreated }) {
  const { c, setConstructionProjects, notify } = ctx;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [showMore, setShowMore] = useState(false);

  const create = () => {
    if (!name.trim()) { notify("اسم پروژه رو وارد کن"); return; }
    const id = uid();
    setConstructionProjects((prev) => [{ id, name: name.trim(), address: address.trim() || null, buildingType: buildingType.trim() || null, status: "فعال", createdAt: new Date().toISOString() }, ...prev]);
    onCreated(id);
  };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[250] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390 }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.lg }}>پروژه جدید</p>
          <Field c={c} label="نام پروژه"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً پروژه آذرخش ۳" autoFocus /></Field>
          {!showMore ? (
            <button onClick={() => setShowMore(true)} className="press" style={{ fontSize: 12, color: c.primary, fontWeight: 700, marginBottom: SP.lg }}>+ جزئیات بیشتر (اختیاری)</button>
          ) : (
            <>
              <Field c={c} label="آدرس"><input style={inputStyle(c)} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثلاً سرعین، ..." /></Field>
              <Field c={c} label="نوع ساختمان"><input style={inputStyle(c)} value={buildingType} onChange={(e) => setBuildingType(e.target.value)} placeholder="مثلاً ساختمان ۶ طبقه" /></Field>
            </>
          )}
          <button onClick={create} disabled={!name.trim()} className="press w-full rounded-xl" style={{ paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13, opacity: name.trim() ? 1 : 0.5 }}>ایجاد پروژه</button>
        </div>
      </div>
    </BodyPortal>
  );
}

function ConstructionProjectDetail({ ctx, project, onBack, onClose }) {
  const { c, constructionTransactions } = ctx;
  const [entryMode, setEntryMode] = useState(null); // "voice" | "text" | null
  const [editTx, setEditTx] = useState(null);
  const stats = computeProjectStats(constructionTransactions, project.id);
  const jNow = isoToJalali(todayISO());
  const monthly = computeMonthlyReport(constructionTransactions, project.id, jNow[0], jNow[1]);
  const recent = constructionTransactions.filter((t) => t.projectId === project.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[210] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onBack} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><ChevronRight size={16} color={c.ink} /></button>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{project.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-2xl p-4" style={glass(c)}>
              <p style={{ fontSize: 10.5, color: c.muted }}>هزینه کل</p>
              <p style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{fmtBudgetShort(stats.totalSpent)}</p>
            </div>
            <div className="rounded-2xl p-4" style={glass(c)}>
              <p style={{ fontSize: 10.5, color: c.muted }}>این ماه</p>
              <p style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: c.primary }}>{fmtBudgetShort(monthly.total)}</p>
              {monthly.comparisonPct != null && (
                <p style={{ fontSize: 10, color: monthly.comparisonPct > 0 ? c.danger : c.success, marginTop: 2 }}>
                  {monthly.comparisonPct > 0 ? "↑" : "↓"} {faDigits(Math.abs(monthly.comparisonPct))}٪ نسبت به ماه قبل
                </p>
              )}
            </div>
            <div className="rounded-2xl p-4" style={glass(c)}>
              <p style={{ fontSize: 10.5, color: c.muted }}>بدهی</p>
              <p style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: c.danger }}>{fmtBudgetShort(stats.totalPayable)}</p>
            </div>
            <div className="rounded-2xl p-4" style={glass(c)}>
              <p style={{ fontSize: 10.5, color: c.muted }}>طلب</p>
              <p style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: c.success }}>{fmtBudgetShort(stats.totalReceivable)}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setEntryMode("voice")} className="press flex-1 flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
              <Mic size={15} /> ثبت هزینه
            </button>
            <button onClick={() => setEntryMode("text")} className="press flex-1 flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 13, background: c.surface2, fontWeight: 700, fontSize: 13 }}>
              <Edit3 size={15} /> ثبت با متن
            </button>
          </div>

          {monthly.topCategory && (
            <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: SP.sm }}>بیشترین هزینه‌ی این ماه</p>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 700 }}>{monthly.topCategory.category}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: c.primary }}>{fmtBudgetShort(monthly.topCategory.amount)}</span>
              </div>
            </div>
          )}

          <p style={{ fontSize: 12.5, fontWeight: 700, marginBottom: SP.sm }}>تراکنش‌های اخیر</p>
          {recent.length === 0 ? (
            <EmptyLine c={c} text="هنوز پرداختی ثبت نشده" />
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((t) => (
                <button key={t.id} onClick={() => setEditTx(t)} className="press w-full text-right flex items-center justify-between rounded-xl px-3.5" style={{ paddingBlock: 11, ...glassLite(c) }}>
                  <div className="min-w-0">
                    <p style={{ fontSize: 12.5, fontWeight: 700 }}>{t.category}{t.recipient ? ` — ${t.recipient}` : ""}</p>
                    <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{fmtJalali(t.date)}{t.type !== "payment" ? ` · ${t.type === "payable" ? "بدهی" : "طلب"}` : ""}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: t.type === "receivable" ? c.success : c.ink, flexShrink: 0 }}>{fmtBudgetShort(t.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {editTx && (
        <ConstructionEditTransaction
          ctx={ctx}
          transaction={editTx}
          onClose={() => setEditTx(null)}
        />
      )}
      {entryMode && (
        <ConstructionEntrySheet
          ctx={ctx}
          projectId={project.id}
          mode={entryMode}
          onClose={() => setEntryMode(null)}
        />
      )}
    </BodyPortal>
  );
}

// Direct answer to "voice sometimes gets it wrong" — every field extracted
// by voice or text is fully editable here after the fact, and deleting a
// wrongly-created transaction is just as available as fixing it.
function ConstructionEditTransaction({ ctx, transaction, onClose }) {
  const { c, setConstructionTransactions, notify } = ctx;
  const [amount, setAmount] = useState(String(transaction.amount || ""));
  const [recipient, setRecipient] = useState(transaction.recipient || "");
  const [category, setCategory] = useState(transaction.category || "سایر");
  const [type, setType] = useState(transaction.type || "payment");
  const [date, setDate] = useState(transaction.date || todayISO());
  const [description, setDescription] = useState(transaction.description || "");

  const save = () => {
    if (!toNum(amount)) { notify("مبلغ را وارد کن"); return; }
    setConstructionTransactions((prev) => prev.map((t) => t.id === transaction.id ? {
      ...t, amount: toNum(amount), recipient: recipient.trim(), category, type, date, description: description.trim(),
    } : t));
    notify("تراکنش به‌روزرسانی شد");
    onClose();
  };

  const remove = () => {
    setConstructionTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
    notify("تراکنش حذف شد");
    onClose();
  };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[260] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390, maxHeight: "85vh", overflowY: "auto" }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.lg }}>ویرایش تراکنش</p>
          <Field c={c} label="مبلغ (تومان)">
            <input value={amount} onChange={(e) => setAmount(toEnDigits(e.target.value).replace(/[^\d]/g, ""))} inputMode="numeric" style={inputStyle(c)} dir="ltr" />
            <p style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>{fmtToman(toNum(amount))}</p>
          </Field>
          <Field c={c} label="به / از"><input style={inputStyle(c)} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></Field>
          <Field c={c} label="نوع">
            <div className="flex gap-2">
              {[["payment", "پرداخت"], ["payable", "بدهکاریم"], ["receivable", "طلبکارم"]].map(([v, label]) => (
                <button key={v} type="button" onClick={() => setType(v)} className="press flex-1 rounded-lg" style={{ paddingBlock: 9, background: type === v ? c.gradientPrimary : c.surface2, color: type === v ? "#fff" : c.muted, fontSize: 11.5, fontWeight: 700 }}>{label}</button>
              ))}
            </div>
          </Field>
          <Field c={c} label="دسته">
            <div className="flex flex-wrap gap-1.5">
              {CONSTRUCTION_CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} className="press rounded-lg" style={{ paddingInline: 9, paddingBlock: 7, background: category === cat ? c.gradientPrimary : c.surface2, color: category === cat ? "#fff" : c.muted, fontSize: 10.5, fontWeight: 700 }}>{cat}</button>
              ))}
            </div>
          </Field>
          <Field c={c} label="تاریخ"><JalaliDatePicker c={c} value={date} onChange={setDate} /></Field>
          <Field c={c} label="توضیح"><input style={inputStyle(c)} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>

          <div className="flex gap-2 mt-2">
            <button onClick={remove} className="press rounded-xl" style={{ paddingInline: 16, paddingBlock: 13, background: c.dangerSoft, color: c.danger, fontWeight: 700, fontSize: 13 }}><Trash2 size={15} /></button>
            <button onClick={onClose} className="press flex-1 rounded-xl" style={{ paddingBlock: 13, background: c.surface2, fontWeight: 700, fontSize: 13 }}>لغو</button>
            <button onClick={save} className="press flex-1 rounded-xl" style={{ paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>ذخیره</button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

function ConstructionEntrySheet({ ctx, projectId, mode, onClose }) {
  const { c, canTranscribe, transcribeAudio, hasAiKey, callAI, setConstructionTransactions, notify } = ctx;
  const [phase, setPhase] = useState(mode === "voice" ? "recording" : "typing"); // recording | transcribing | extracting | review | typing | error
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [extracted, setExtracted] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (mode === "voice") start();
    return () => { clearInterval(timerRef.current); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line

  const start = async () => {
    if (!canTranscribe) { setError("اول کلید AvalAI را در تنظیمات وارد کن"); setPhase("error"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      // The recorded blob is only ever used locally to get a transcript —
      // it's discarded right after transcription, never saved to the
      // transaction or anywhere else, per explicit instruction.
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); handleAudioReady(rec.mimeType || "audio/webm"); };
      mediaRef.current = rec; rec.start();
      setPhase("recording"); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => { if (s + 1 >= 30) stopRecording(); return s + 1; }), 1000);
    } catch (e) { setError("دسترسی به میکروفون داده نشد"); setPhase("error"); }
  };
  const stopRecording = () => { clearInterval(timerRef.current); if (mediaRef.current?.state === "recording") mediaRef.current.stop(); };

  const extractFromText = async (text) => {
    setPhase("extracting");
    try {
      if (!hasAiKey) throw new Error("کلید هوش مصنوعی لازم است");
      const [jy, jm, jd] = isoToJalali(todayISO());
      const prompt = `مشاور یه هزینه یا بدهی/طلب مربوط به یک پروژه‌ی ساخت‌وساز رو توصیف کرده. امروز شمسی ${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)} است.
متن: «${text}»

دسته‌های مجاز (یکی از این‌ها رو دقیقاً انتخاب کن، نزدیک‌ترین مورد): ${CONSTRUCTION_CATEGORIES.join("، ")}

نکته‌ی مهم درباره‌ی اعداد فارسی محاوره‌ای — حتماً رعایت کن:
«هفت میلیارد» = 7000000000 — «7 میلیارد» = 7000000000 — «هفت میلیارد تومن» یا «۷ میلیارد تومان» هم همین‌طور.
«سه و نیم میلیارد» = 3500000000 — «صد و بیست میلیون» = 120000000 — «پونصد میلیون» = 500000000 — «سیصد میلیون» = 300000000.
هرگز میلیارد و میلیون را با هم اشتباه نگیر. «تومن» و «تومان» یکی هستند. اگر «ریال» گفته شد، تقسیم بر ۱۰ کن.

نوع تراکنش را هم دقیق تشخیص بده:
اگر «پرداخت کردم / دادم / پول دادم» → type="payment"
اگر «بدهکارم / باید بدم / هنوز پرداخت نکردم» → type="payable"
اگر «طلبکارم / باید بهم بده / از فلانی طلب دارم» → type="receivable"

این JSON خام را برگردان: {"amount":0,"recipient":"اسم گیرنده یا خالی","category":"یکی از دسته‌های بالا","type":"payment یا payable یا receivable","date":"تاریخ میلادی YYYY-MM-DD — اگر نسبی گفته (دیروز، دو روز پیش) خودت حساب کن، وگرنه امروز","description":"خلاصه‌ی یک‌خطی"}`;
      const raw = await callAI(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن");
      let parsed;
      try { parsed = JSON.parse(jsonMatch[0]); } catch { throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن"); }
      setExtracted({ ...parsed, transcript: text });
      setPhase("review");
    } catch (e) { setError(e.message || "خطا در پردازش"); setPhase("error"); }
  };

  const handleAudioReady = async (mimeType) => {
    setPhase("transcribing");
    try {
      const text = await transcribeAudio(new Blob(chunksRef.current, { type: mimeType }));
      chunksRef.current = []; // discard immediately — nothing beyond this point ever touches the audio again
      await extractFromText(text);
    } catch (e) { setError(e.message || "خطا در پردازش"); setPhase("error"); }
  };

  const save = () => {
    setConstructionTransactions((prev) => [{
      id: uid(), projectId,
      amount: toNum(extracted.amount) || 0,
      recipient: (extracted.recipient || "").trim(),
      category: CONSTRUCTION_CATEGORIES.includes(extracted.category) ? extracted.category : "سایر",
      type: ["payment", "payable", "receivable"].includes(extracted.type) ? extracted.type : "payment",
      date: extracted.date || todayISO(),
      description: extracted.description || "",
      transcript: extracted.transcript || textInput || "",
      attachments: [],
      createdAt: new Date().toISOString(),
    }, ...prev]);
    notify("تراکنش ثبت شد");
    onClose();
  };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[260] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", padding: SP.xl }}>
        <div style={{ ...glassSurface(c), borderRadius: RAD.lg, padding: SP.xl, maxWidth: 340, width: "100%" }}>
          {phase === "recording" && (
            <div className="text-center">
              <div className="flex items-center justify-center" style={{ width: 70, height: 70, borderRadius: "50%", background: c.dangerSoft, margin: "0 auto" }}>
                <button onClick={stopRecording} className="press flex items-center justify-center" style={{ width: 50, height: 50, borderRadius: "50%", background: c.danger }}><div style={{ width: 16, height: 16, borderRadius: 4, background: "#fff" }} /></button>
              </div>
              <p style={{ marginTop: SP.md, fontSize: 13, color: c.muted }}>بگو برای چی، چقدر، به کی — {faDigits(seconds)} ثانیه</p>
            </div>
          )}
          {(phase === "transcribing" || phase === "extracting") && (
            <div className="text-center"><Loader2 size={28} color={c.primary} className="animate-spin" style={{ margin: "0 auto" }} /><p style={{ marginTop: SP.md, fontSize: 13, color: c.muted }}>{phase === "transcribing" ? "در حال شنیدن..." : "در حال فهمیدن..."}</p></div>
          )}
          {phase === "typing" && (
            <>
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.md }}>ثبت با متن</p>
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="مثلاً: ۱۰ میلیارد به بتن آماده احمدی پرداخت کردم" style={{ ...inputStyle(c), minHeight: 90, resize: "none", marginBottom: SP.md }} />
              <div className="flex gap-2">
                <button onClick={onClose} className="press flex-1 rounded-xl" style={{ paddingBlock: 12, background: c.surface2, fontWeight: 700, fontSize: 13 }}>لغو</button>
                <button onClick={() => extractFromText(textInput)} disabled={!textInput.trim()} className="press flex-1 rounded-xl" style={{ paddingBlock: 12, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13, opacity: textInput.trim() ? 1 : 0.5 }}>ادامه</button>
              </div>
            </>
          )}
          {phase === "review" && extracted && (
            <>
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.md }}>تأیید تراکنش</p>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center justify-between"><span style={{ fontSize: 12, color: c.muted }}>مبلغ</span><span style={{ fontSize: 15, fontWeight: 800 }}>{fmtToman(toNum(extracted.amount) || 0)}</span></div>
                <div className="flex items-center justify-between"><span style={{ fontSize: 12, color: c.muted }}>نوع</span><span style={{ fontSize: 13, fontWeight: 700 }}>{extracted.type === "payable" ? "بدهکاریم" : extracted.type === "receivable" ? "طلبکارم" : "پرداخت"}</span></div>
                <div className="flex items-center justify-between"><span style={{ fontSize: 12, color: c.muted }}>به / از</span><span style={{ fontSize: 13, fontWeight: 700 }}>{extracted.recipient || "—"}</span></div>
                <div className="flex items-center justify-between"><span style={{ fontSize: 12, color: c.muted }}>دسته</span><span style={{ fontSize: 13, fontWeight: 700 }}>{extracted.category}</span></div>
                <div className="flex items-center justify-between"><span style={{ fontSize: 12, color: c.muted }}>تاریخ</span><span style={{ fontSize: 13, fontWeight: 700 }}>{fmtJalali(extracted.date)}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="press flex-1 rounded-xl" style={{ paddingBlock: 12, background: c.surface2, fontWeight: 700, fontSize: 13 }}>لغو</button>
                <button onClick={save} className="press flex-1 flex items-center justify-center rounded-xl" style={{ gap: 5, paddingBlock: 12, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}><Check size={14} /> تأیید</button>
              </div>
            </>
          )}
          {phase === "error" && (
            <div className="text-center">
              <AlertTriangle size={26} color={c.danger} style={{ margin: "0 auto" }} />
              <p style={{ marginTop: SP.md, fontSize: 12, color: c.danger }}>{error}</p>
              <button onClick={onClose} className="press w-full rounded-xl mt-4" style={{ paddingBlock: 11, background: c.surface2, fontWeight: 700, fontSize: 12 }}>بستن</button>
            </div>
          )}
          {phase !== "review" && phase !== "error" && phase !== "typing" && (
            <button onClick={onClose} className="press w-full rounded-xl mt-4" style={{ paddingBlock: 11, background: c.surface2, fontWeight: 700, fontSize: 12 }}>لغو</button>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

export { ConstructionHome };
