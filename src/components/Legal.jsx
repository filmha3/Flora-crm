import React, { useState, useRef, useEffect } from "react";
import {
  Scale, Mic, Type, Camera, FolderOpen, X, ChevronLeft, AlertTriangle, CheckCircle2,
  Clock, Plus, Trash2, FileText, Send, Loader2, ShieldAlert, Sparkles,
} from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite, glassSurface } from "../lib/theme.js";
import { Field, inputStyle, EmptyLine, BodyPortal, FloraMark } from "../lib/ui.jsx";
import { dbGet, dbSet } from "../lib/db.js";
import { uid, todayISO, faDigits, fmtJalali, isoToJalali, MONTHS_FA } from "../lib/format.js";
import { compressImage, filesToMedia } from "../lib/image.js";

// Everything lives under one local key, same pattern as the rest of the app
// (no server round-trip, matches the "local storage, like the rest of the
// app" decision). A "case" bundles facts + timeline + actions + documents +
// voice notes so nothing about one legal matter is scattered across tables.
const LEGAL_KEY = "flora-legal-cases";

const FACT_LABELS = {
  buyer: "خریدار", seller: "فروشنده", property: "ملک", totalAmount: "مبلغ معامله",
  secondStageAmount: "مبلغ مرحله دوم", dueDateJalali: "سررسید", paymentMethod: "نحوه پرداخت",
  penaltyClause: "وجه التزام", terminationTerms: "شرایط فسخ", obligations: "تعهدات طرفین",
};
const CONTRACT_REQUIRED = ["buyer", "seller", "property", "totalAmount", "paymentMethod"];

const newCase = (title) => ({
  id: uid(), title, status: "open", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  facts: {}, timeline: [], actions: [], documents: [], voiceNotes: [], legalAnalysis: null,
});

// ---------- Home dashboard entry point ----------
function LegalTile({ ctx }) {
  const { c, setLegalOpen } = ctx;
  return (
    <button onClick={() => setLegalOpen(true)} className="press text-right flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: RAD.md, background: c.dangerSoft, marginBottom: SP.md }}><Scale size={20} color={c.danger} /></div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>Flora Legal</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>دستیار حقوقی صوتی</p>
    </button>
  );
}

// ---------- AI helpers — thin wrappers around ctx.callAI / the AvalAI vision
// endpoint already used elsewhere (virtual staging), so Legal doesn't need
// its own provider plumbing or a new key the person has to go set up. ----------

function buildCaseMatchPrompt(text, openCases, clarifyQA) {
  const casesSummary = openCases.length
    ? openCases.map((cs) => `id:${cs.id} — «${cs.title}» — طرفین: ${cs.facts.buyer || "؟"}/${cs.facts.seller || "؟"} — آخرین رویداد: ${cs.timeline[cs.timeline.length - 1]?.title || "—"}`).join("\n")
    : "هیچ پرونده‌ی بازی وجود ندارد.";
  return `تو FLORA LEGAL هستی، دستیار حقوقی یک مشاور املاک ایرانی. این را گفته یا نوشته:
«${text}»
${clarifyQA ? `\nسؤال قبلی تو: «${clarifyQA.q}» — جواب مشاور: «${clarifyQA.a}»\n` : ""}
پرونده‌های باز فعلی:
${casesSummary}

این JSON خام را برگردان (بدون توضیح، بدون markdown). هیچ‌چیزی را حدس نزن — هر فیلدی که از همین متن معلوم نیست، از JSON خروجی حذفش کن یا null بگذار:
{
  "matchedCaseId": "id یکی از پرونده‌های بالا اگر این متن ادامه‌ی همان پرونده است، وگرنه null",
  "matchConfidence": "high یا low یا none",
  "clarifyQuestion": "فقط اگر matchConfidence پایین است و چند پرونده محتمل‌اند، یک سؤال کوتاه برای تأیید — وگرنه null",
  "caseTitle": "عنوان کوتاه پرونده، فقط اگر پرونده‌ی جدیدی باید ساخته شود",
  "timelineTitle": "خلاصه‌ی این رویداد در حداکثر ۶ کلمه",
  "timelineNote": "توضیح این رویداد در یک جمله",
  "facts": { "buyer":null,"seller":null,"property":null,"totalAmount":null,"secondStageAmount":null,"dueDateJalali":null,"paymentMethod":null,"penaltyClause":null,"terminationTerms":null,"obligations":null },
  "suggestedAction": { "title":"...", "dueDateOffsetDays": 3, "type":"Legal Follow-up" },
  "needsDocument": false
}
suggestedAction را فقط بگذار اگر مشاور واقعاً درخواست یادآوری یا اقدام کرده. facts فقط شامل چیزی باشد که همین متن گفته، چیزی که نگفته را null بگذار نه حدس.`;
}

async function analyzeContractImages(avalaiKey, imageUrls) {
  if (!avalaiKey) throw new Error("کلید AvalAI وارد نشده");
  const content = [
    { type: "text", text: `این تصویر یا تصاویر از یک قرارداد ملکی (مبایعه‌نامه/اجاره‌نامه) است. این JSON خام را با اطلاعات واقعی که در سند می‌بینی پر کن. هر فیلدی که در سند پیدا نشد، دقیقاً null بگذار — هرگز حدس نزن:
{"buyer":null,"seller":null,"property":null,"totalAmount":null,"secondStageAmount":null,"dueDateJalali":null,"paymentMethod":null,"penaltyClause":null,"terminationTerms":null,"obligations":null}
فقط همین JSON خام را برگردان.` },
    ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
  ];
  const res = await fetch("https://api.avalai.ir/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${avalaiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content } ]}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `خطای تحلیل سند (کد ${res.status})`);
  const text = data?.choices?.[0]?.message?.content;
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { throw new Error("پاسخ تحلیل سند قابل‌خواندن نبود"); }
}

function buildLegalAnalysisPrompt(facts) {
  return `تو FLORA LEGAL هستی — یک دستیار حقوقی هوش‌مصنوعی، نه وکیل واقعی. بر اساس این اطلاعات پرونده، یک تحلیل کوتاه به سبک ASD-STE100 بده: نتیجه اول، جمله‌های کوتاه، بدون تکرار، بدون پاراگراف طولانی.
اطلاعات پرونده: ${JSON.stringify(facts)}
این JSON خام را برگردان:
{"summary":"نتیجه‌ی کوتاه در ۲ تا ۳ جمله، فقط بر اساس همین اطلاعات","nextSteps":["اقدام ۱","اقدام ۲","اقدام ۳"],"legalSourceNote":"اگر منبع قانونی مشخصی مطمئنی، بگو؛ وگرنه دقیقاً بنویس: منبع قانونی قابل تأیید پیدا نشد."}
هیچ ماده‌ی قانونی را حدس نزن.`;
}

function buildContractDraftPrompt(facts) {
  return `بر اساس این اطلاعات پرونده، یک پیش‌نویس (نه نهایی) مبایعه‌نامه‌ی ساده به فارسی بنویس. هرجا اطلاعات نداری، دقیقاً بنویس [نامشخص] — چیزی نساز:
${JSON.stringify(facts)}
فقط متن قرارداد را برگردان، بدون توضیح اضافه، بدون markdown.`;
}

// ---------- Main screen ----------
function LegalHome({ ctx }) {
  const { c, notify, canTranscribe, transcribeAudio, hasAiKey, callAI, avalaiKey, setLegalOpen } = ctx;
  const [cases, setCases] = useState(null); // null = loading
  const [openCaseId, setOpenCaseId] = useState(null);
  const [mode, setMode] = useState("home"); // home | text | recording | transcribing | thinking | clarify
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [clarify, setClarify] = useState(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const silenceRef = useRef(0);
  const spokeRef = useRef(false);
  const secondsRef = useRef(0);

  useEffect(() => { dbGet(LEGAL_KEY).then((saved) => setCases(saved?.cases || [])).catch(() => setCases([])); }, []);
  const persist = (next) => { setCases(next); dbSet(LEGAL_KEY, { cases: next }).catch(() => {}); };

  const openCases = (cases || []).filter((cs) => cs.status === "open");

  const cleanupAudioGraph = () => {
    cancelAnimationFrame(rafRef.current);
    try { audioCtxRef.current?.close(); } catch (e) {}
    audioCtxRef.current = null; analyserRef.current = null; setLevel(0);
  };
  const vibrate = (ms) => { try { navigator.vibrate?.(ms); } catch (e) {} };

  const watchLevels = (stream) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctxA = new AC(); const source = ctxA.createMediaStreamSource(stream); const analyser = ctxA.createAnalyser();
    analyser.fftSize = 64; source.connect(analyser);
    audioCtxRef.current = ctxA; analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      frame++;
      if (frame % 2 === 0) setLevel((prev) => prev + (Math.min(1, avg / 85) - prev) * 0.3);
      if (avg > 14) { spokeRef.current = true; silenceRef.current = 0; }
      else if (spokeRef.current) silenceRef.current += 1;
      if (silenceRef.current > 70 && secondsRef.current > 2) stopRecording();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const startRecording = async () => {
    setError(""); setTranscript(""); spokeRef.current = false; silenceRef.current = 0;
    if (!canTranscribe) { setError("اول کلید AvalAI را در تنظیمات هوش مصنوعی وارد کن — صحبت صوتی به آن نیاز دارد."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { cleanupAudioGraph(); stream.getTracks().forEach((t) => t.stop()); handleRecordingDone(rec.mimeType || "audio/webm"); };
      mediaRef.current = rec;
      rec.start(); watchLevels(stream); vibrate(20);
      setMode("recording"); setSeconds(0); secondsRef.current = 0;
      timerRef.current = setInterval(() => setSeconds((s) => { const next = s + 1; secondsRef.current = next; if (next >= 120) stopRecording(); return next; }), 1000);
    } catch (e) { setError("دسترسی به میکروفون داده نشد."); }
  };
  const stopRecording = () => { clearInterval(timerRef.current); if (mediaRef.current?.state === "recording") { vibrate(15); mediaRef.current.stop(); } };

  const handleRecordingDone = async (mimeType) => {
    setMode("transcribing");
    const blob = new Blob(chunksRef.current, { type: mimeType });
    try {
      const text = await transcribeAudio(blob);
      setTranscript(text);
      await process(text);
    } catch (e) { setError(e.message || "خطا در تبدیل صوت"); setMode("home"); }
  };

  // The one pipeline every input (voice or typed) funnels through: match to
  // an existing case (or start a new one), pull out any facts/timeline/
  // action the sentence actually contained, and — only if genuinely
  // ambiguous which case this continues — ask, rather than guess.
  const process = async (text, clarifyQA) => {
    setMode("thinking");
    if (!hasAiKey) { setError("برای فهمیدن منظورت، یک کلید هوش مصنوعی در تنظیمات لازم است."); setMode("home"); return; }
    try {
      const raw = await callAI(buildCaseMatchPrompt(text, openCases, clarifyQA));
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new SyntaxError("no JSON found");
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.clarifyQuestion && !clarifyQA) { setClarify({ q: parsed.clarifyQuestion, parsed, text }); setMode("clarify"); return; }
      applyResult(parsed, text);
    } catch (e) {
      setError(e instanceof SyntaxError ? "پاسخ هوش مصنوعی قابل‌خواندن نبود — دوباره امتحان کن" : (e.message || "خطای نامشخص"));
      setMode("home");
    }
  };

  const applyResult = (parsed, text) => {
    const list = cases || [];
    let target = parsed.matchedCaseId ? list.find((cs) => cs.id === parsed.matchedCaseId) : null;
    const isNew = !target;
    if (!target) target = newCase(parsed.caseTitle || "پرونده جدید");
    const cleanFacts = Object.fromEntries(Object.entries(parsed.facts || {}).filter(([, v]) => v));
    const updated = {
      ...target,
      facts: { ...target.facts, ...cleanFacts },
      updatedAt: new Date().toISOString(),
      timeline: [...target.timeline, { id: uid(), at: new Date().toISOString(), title: parsed.timelineTitle || "به‌روزرسانی", note: parsed.timelineNote || text }],
      voiceNotes: transcript ? [...target.voiceNotes, { id: uid(), transcript, at: new Date().toISOString() }] : target.voiceNotes,
      actions: parsed.suggestedAction
        ? [...target.actions, { id: uid(), title: parsed.suggestedAction.title, dueDateJalali: null, dueAt: Date.now() + (parsed.suggestedAction.dueDateOffsetDays || 1) * 86400000, type: parsed.suggestedAction.type || "Legal Follow-up", done: false }]
        : target.actions,
    };
    const next = isNew ? [updated, ...list] : list.map((cs) => (cs.id === updated.id ? updated : cs));
    persist(next);
    notify(isNew ? "پرونده جدید ساخته شد" : "پرونده به‌روزرسانی شد");
    setTextInput(""); setTranscript(""); setClarify(null); setMode("home");
    setOpenCaseId(updated.id);
  };

  const confirmClarify = () => { process(clarify.text, { q: clarify.q, a: clarifyAnswer }); setClarifyAnswer(""); };

  if (openCaseId) {
    const activeCase = (cases || []).find((cs) => cs.id === openCaseId);
    if (activeCase) return <LegalCaseView ctx={ctx} legalCase={activeCase} onUpdate={(updated) => persist((cases || []).map((cs) => (cs.id === updated.id ? updated : cs)))} onDelete={() => { persist((cases || []).filter((cs) => cs.id !== openCaseId)); setOpenCaseId(null); }} onBack={() => setOpenCaseId(null)} />;
  }

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={() => setLegalOpen(false)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <div className="flex-1">
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>FLORA LEGAL</p>
            <p style={{ fontSize: FS.caption, color: c.muted }}>دستیار حقوقی، نه وکیل واقعی</p>
          </div>
          <Scale size={20} color={c.danger} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {mode === "home" && (
            <>
              <p style={{ textAlign: "center", fontSize: FS.title, fontWeight: FW.heavy, marginTop: SP.xl, marginBottom: SP.xs }}>مشکل حقوقی خود را بگو</p>
              <p style={{ textAlign: "center", fontSize: FS.caption, color: c.muted, marginBottom: SP.xxl }}>برای صحبت‌کردن روی میکروفون بزن</p>

              <div className="flex justify-center" style={{ marginBottom: SP.xxl }}>
                <button onClick={startRecording} className="press flex items-center justify-center" style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#c8102e,#e63946)", boxShadow: "0 16px 34px -10px rgba(200,16,46,0.5)" }}>
                  <Mic size={38} color="#fff" />
                </button>
              </div>

              {error && (
                <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.dangerSoft, marginBottom: SP.lg }}>
                  <AlertTriangle size={14} color={c.danger} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: c.danger, lineHeight: 1.8 }}>{error}</p>
                </div>
              )}

              <div className="flex" style={{ gap: SP.sm, marginBottom: SP.xl }}>
                <button onClick={() => setMode("text")} className="press flex-1 flex flex-col items-center" style={{ gap: 6, padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md) }}>
                  <Type size={18} color={c.ink} /><span style={{ fontSize: 11, fontWeight: 700 }}>نوشتن</span>
                </button>
                <label className="press flex-1 flex flex-col items-center" style={{ gap: 6, padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md), cursor: "pointer" }}>
                  <Camera size={18} color={c.ink} /><span style={{ fontSize: 11, fontWeight: 700 }}>آپلود سند</span>
                  <input type="file" accept="image/*" multiple hidden onChange={async (e) => {
                    const files = Array.from(e.target.files || []); if (!files.length) return;
                    const media = await filesToMedia(files);
                    const draft = newCase("پرونده جدید — سند آپلودی");
                    draft.documents = [{ id: uid(), name: "قرارداد", images: media.map((m) => m.url), extractedFields: {}, uploadedAt: new Date().toISOString() }];
                    persist([draft, ...(cases || [])]);
                    setOpenCaseId(draft.id);
                  }} />
                </label>
              </div>

              <p style={{ fontSize: 12, color: c.muted, fontWeight: 700, marginBottom: SP.sm }}>پرونده‌های من {openCases.length > 0 && `(${faDigits(openCases.length)})`}</p>
              {cases === null ? (
                <p style={{ fontSize: 12, color: c.muted }}>در حال بارگذاری...</p>
              ) : openCases.length === 0 ? (
                <EmptyLine c={c} text="هنوز پرونده‌ای نداری — روی میکروفون بزن و بگو چی شده" />
              ) : (
                <div className="flex flex-col" style={{ gap: SP.sm }}>
                  {openCases.map((cs) => (
                    <button key={cs.id} onClick={() => setOpenCaseId(cs.id)} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md) }}>
                      <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: RAD.sm, background: c.dangerSoft }}><FileText size={16} color={c.danger} /></div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cs.title}</p>
                        <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{cs.timeline[cs.timeline.length - 1]?.title || "بدون رویداد"}</p>
                      </div>
                      {cs.actions.some((a) => !a.done) && <Clock size={14} color={c.attn} />}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === "text" && (
            <div style={{ marginTop: SP.xl }}>
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.md }}>چی شده؟</p>
              <textarea autoFocus value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="مثلاً: مشتری پول مرحله دوم رو نداده..." style={{ ...inputStyle(c), minHeight: 120, resize: "none", lineHeight: 1.9 }} />
              <div className="flex" style={{ gap: SP.sm, marginTop: SP.md }}>
                <button onClick={() => setMode("home")} className="press flex-1 rounded-xl py-3" style={{ background: c.surface2, fontWeight: 700, fontSize: 13 }}>لغو</button>
                <button onClick={() => { setTranscript(""); process(textInput); }} disabled={!textInput.trim()} className="press flex-1 rounded-xl py-3" style={{ background: "linear-gradient(135deg,#c8102e,#e63946)", color: "#fff", fontWeight: 700, fontSize: 13, opacity: textInput.trim() ? 1 : 0.5 }}>ثبت</button>
              </div>
            </div>
          )}

          {mode === "recording" && (
            <div className="flex flex-col items-center" style={{ marginTop: 80 }}>
              <div className="flex items-center justify-center" style={{ width: 130, height: 130, borderRadius: "50%", background: `rgba(230,57,70,${0.15 + level * 0.25})`, transition: "background .1s" }}>
                <button onClick={stopRecording} className="press flex items-center justify-center" style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg,#c8102e,#e63946)" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fff" }} />
                </button>
              </div>
              <p style={{ marginTop: SP.lg, fontSize: FS.title, fontWeight: FW.heavy, fontVariantNumeric: "tabular-nums" }}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p>
              <p style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>برای پایان بزن، یا با سکوت خودکار تموم می‌شه</p>
            </div>
          )}

          {(mode === "transcribing" || mode === "thinking") && (
            <div className="flex flex-col items-center" style={{ marginTop: 100 }}>
              <Loader2 size={32} color={c.danger} className="animate-spin" />
              <p style={{ marginTop: SP.md, fontSize: 13, color: c.muted }}>{mode === "transcribing" ? "در حال تحلیل ویس..." : "در حال فهمیدن پرونده..."}</p>
              {transcript && <p style={{ marginTop: SP.lg, fontSize: 12, color: c.ink, lineHeight: 1.9, textAlign: "center", padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>{transcript}</p>}
            </div>
          )}

          {mode === "clarify" && clarify && (
            <div style={{ marginTop: SP.xl }}>
              <p style={{ fontSize: 13, color: c.ink, lineHeight: 1.9, marginBottom: SP.md }}>{clarify.q}</p>
              <input autoFocus value={clarifyAnswer} onChange={(e) => setClarifyAnswer(e.target.value)} style={inputStyle(c)} placeholder="پاسخ..." />
              <button onClick={confirmClarify} disabled={!clarifyAnswer.trim()} className="press w-full rounded-xl py-3 mt-3" style={{ background: "linear-gradient(135deg,#c8102e,#e63946)", color: "#fff", fontWeight: 700, fontSize: 13, opacity: clarifyAnswer.trim() ? 1 : 0.5 }}>ادامه</button>
            </div>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

// ---------- Case detail ----------
function LegalCaseView({ ctx, legalCase, onUpdate, onDelete, onBack }) {
  const { c, notify, hasAiKey, callAI, avalaiKey } = ctx;
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [factEdits, setFactEdits] = useState(null); // { key: value } while editing

  const runLegalAnalysis = async () => {
    if (!hasAiKey) { notify("کلید هوش مصنوعی لازم است"); return; }
    setBusy(true);
    try {
      const raw = await callAI(buildLegalAnalysisPrompt(legalCase.facts));
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new SyntaxError("no JSON found");
      const parsed = JSON.parse(jsonMatch[0]);
      onUpdate({ ...legalCase, legalAnalysis: parsed, updatedAt: new Date().toISOString() });
    } catch (e) { notify(e.message || "تحلیل حقوقی ناموفق بود"); }
    setBusy(false);
  };

  const uploadDocument = async (files) => {
    setBusy(true);
    try {
      const media = await filesToMedia(files);
      const imageUrls = media.map((m) => m.url);
      let extractedFields = {};
      if (avalaiKey) {
        try { extractedFields = await analyzeContractImages(avalaiKey, imageUrls); } catch (e) { notify(e.message || "تحلیل سند ناموفق بود، ولی عکس ذخیره شد"); }
      }
      const cleanFields = Object.fromEntries(Object.entries(extractedFields || {}).filter(([, v]) => v));
      const doc = { id: uid(), name: "قرارداد", images: imageUrls, extractedFields: cleanFields, uploadedAt: new Date().toISOString() };
      onUpdate({
        ...legalCase, documents: [...legalCase.documents, doc], facts: { ...legalCase.facts, ...cleanFields },
        timeline: [...legalCase.timeline, { id: uid(), at: new Date().toISOString(), title: "سند آپلود شد", note: Object.keys(cleanFields).length ? `${faDigits(Object.keys(cleanFields).length)} فیلد از سند استخراج شد` : "فیلدی از سند پیدا نشد" }],
        updatedAt: new Date().toISOString(),
      });
      notify("سند بررسی شد");
    } catch (e) { notify("خطا در بارگذاری سند"); }
    setBusy(false);
  };

  const draftContract = async () => {
    const missing = CONTRACT_REQUIRED.filter((k) => !legalCase.facts[k]);
    if (missing.length) { notify(`برای پیش‌نویس، اول این‌ها را کامل کن: ${missing.map((k) => FACT_LABELS[k]).join("، ")}`); return; }
    if (!hasAiKey) { notify("کلید هوش مصنوعی لازم است"); return; }
    setBusy(true);
    try {
      const text = await callAI(buildContractDraftPrompt(legalCase.facts));
      const draft = { id: uid(), createdAt: new Date().toISOString(), text: text.trim() };
      onUpdate({ ...legalCase, contractDrafts: [...(legalCase.contractDrafts || []), draft], timeline: [...legalCase.timeline, { id: uid(), at: new Date().toISOString(), title: "پیش‌نویس قرارداد ساخته شد", note: "" }], updatedAt: new Date().toISOString() });
      notify("پیش‌نویس ساخته شد");
    } catch (e) { notify(e.message || "ساخت پیش‌نویس ناموفق بود"); }
    setBusy(false);
  };

  const toggleAction = (actionId) => onUpdate({ ...legalCase, actions: legalCase.actions.map((a) => a.id === actionId ? { ...a, done: !a.done } : a) });
  const saveFacts = () => { onUpdate({ ...legalCase, facts: { ...legalCase.facts, ...factEdits }, updatedAt: new Date().toISOString() }); setFactEdits(null); };

  const factKeys = Object.keys(FACT_LABELS);

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[96] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onBack} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><ChevronLeft size={16} color={c.ink} /></button>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{legalCase.title}</p>
          </div>
          <button onClick={() => setConfirmDelete(true)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={15} color={c.danger} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Facts */}
          <div className="flex items-center justify-between" style={{ marginTop: SP.md, marginBottom: SP.sm }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: c.muted }}>اطلاعات پرونده</p>
            {!factEdits ? (
              <button onClick={() => setFactEdits({ ...legalCase.facts })} style={{ fontSize: 11, color: c.primary, fontWeight: 700 }}>ویرایش</button>
            ) : (
              <button onClick={saveFacts} style={{ fontSize: 11, color: c.success, fontWeight: 700 }}>ذخیره</button>
            )}
          </div>
          <div className="flex flex-col" style={{ gap: 6, marginBottom: SP.xl }}>
            {factKeys.map((k) => (
              <div key={k} className="flex items-center justify-between" style={{ padding: "8px 10px", borderRadius: RAD.sm, background: c.surface2 }}>
                <span style={{ fontSize: 12, color: c.muted, flexShrink: 0 }}>{FACT_LABELS[k]}</span>
                {factEdits ? (
                  <input value={factEdits[k] || ""} onChange={(e) => setFactEdits({ ...factEdits, [k]: e.target.value })} style={{ background: "transparent", border: "none", outline: "none", textAlign: "left", fontSize: 12, color: c.ink, flex: 1, marginRight: 8 }} dir="auto" />
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: legalCase.facts[k] ? c.ink : c.muted }}>{legalCase.facts[k] || "این مورد در سند پیدا نشد"}</span>
                )}
              </div>
            ))}
          </div>

          {/* Legal analysis */}
          {legalCase.legalAnalysis ? (
            <div style={{ padding: SP.md, borderRadius: RAD.md, background: c.dangerSoft, marginBottom: SP.lg }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>نتیجه کوتاه</p>
              <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: SP.sm }}>{legalCase.legalAnalysis.summary}</p>
              {legalCase.legalAnalysis.nextSteps?.length > 0 && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 700, marginTop: SP.sm, marginBottom: 6 }}>اقدام بعدی</p>
                  <ol style={{ paddingRight: 18, fontSize: 12, lineHeight: 2 }}>{legalCase.legalAnalysis.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                </>
              )}
              <div className="flex items-start" style={{ gap: 6, marginTop: SP.md, paddingTop: SP.sm, borderTop: `1px solid ${c.border}` }}>
                <ShieldAlert size={12} color={c.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: c.danger, lineHeight: 1.7 }}>این پاسخ جایگزین بررسی وکیل دادگستری نیست.</p>
              </div>
            </div>
          ) : (
            <button onClick={runLegalAnalysis} disabled={busy} className="press w-full flex items-center justify-center rounded-xl mb-5" style={{ gap: 6, paddingBlock: 12, background: c.surface2, fontSize: 13, fontWeight: 700 }}>
              <Sparkles size={13} color={c.danger} /> تحلیل حقوقی بگیر
            </button>
          )}

          {/* Timeline */}
          <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>Timeline</p>
          <div className="flex flex-col" style={{ gap: 8, marginBottom: SP.xl }}>
            {legalCase.timeline.slice().reverse().map((t) => (
              <div key={t.id} style={{ paddingRight: 12, borderRight: `2px solid ${c.border}` }}>
                <p style={{ fontSize: 12, fontWeight: 700 }}>{t.title}</p>
                {t.note && <p style={{ fontSize: 11, color: c.muted, marginTop: 2, lineHeight: 1.7 }}>{t.note}</p>}
                <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{fmtJalali(t.at.slice(0, 10))}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          {legalCase.actions.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>اقدام‌ها</p>
              <div className="flex flex-col" style={{ gap: 6, marginBottom: SP.xl }}>
                {legalCase.actions.map((a) => (
                  <button key={a.id} onClick={() => toggleAction(a.id)} className="press w-full text-right flex items-center" style={{ gap: SP.sm, padding: SP.sm, borderRadius: RAD.sm, background: c.surface2, opacity: a.done ? 0.5 : 1 }}>
                    <CheckCircle2 size={15} color={a.done ? c.success : c.muted} />
                    <span style={{ fontSize: 12, fontWeight: 600, textDecoration: a.done ? "line-through" : "none", flex: 1 }}>{a.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Documents */}
          <p style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: SP.sm }}>اسناد</p>
          <div className="flex flex-wrap" style={{ gap: 8, marginBottom: SP.md }}>
            {legalCase.documents.map((d) => (
              <img key={d.id} src={d.images[0]} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: RAD.sm }} />
            ))}
            <label className="flex items-center justify-center press" style={{ width: 64, height: 64, borderRadius: RAD.sm, background: c.surface2, cursor: "pointer" }}>
              <Plus size={18} color={c.muted} />
              <input type="file" accept="image/*" multiple hidden onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) uploadDocument(files); }} />
            </label>
          </div>

          {/* Contract drafts */}
          {(legalCase.contractDrafts || []).map((d) => (
            <div key={d.id} style={{ padding: SP.md, borderRadius: RAD.md, background: c.surface2, marginBottom: SP.sm }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: c.attn, marginBottom: 6 }}>پیش‌نویس قرارداد — {fmtJalali(d.createdAt.slice(0, 10))}</p>
              <p style={{ fontSize: 12, lineHeight: 2, whiteSpace: "pre-wrap" }}>{d.text}</p>
            </div>
          ))}
          <button onClick={draftContract} disabled={busy} className="press w-full flex items-center justify-center rounded-xl mt-3" style={{ gap: 6, paddingBlock: 12, background: "linear-gradient(135deg,#c8102e,#e63946)", color: "#fff", fontSize: 13, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
            <FileText size={14} color="#fff" /> پیش‌نویس قرارداد بساز
          </button>
        </div>

        {confirmDelete && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", padding: SP.xl }}>
            <div style={{ ...glassSurface(c), borderRadius: RAD.lg, padding: SP.xl, maxWidth: 320 }}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>حذف این پرونده</p>
              <p style={{ fontSize: 12, color: c.muted, lineHeight: 1.8, marginBottom: SP.lg }}>این اطلاعات برای همیشه حذف می‌شود. این عملیات قابل بازگشت نیست.</p>
              <div className="flex" style={{ gap: SP.sm }}>
                <button onClick={() => setConfirmDelete(false)} className="press flex-1 rounded-lg py-2.5" style={{ background: c.surface2, fontSize: 12, fontWeight: 700 }}>لغو</button>
                <button onClick={onDelete} className="press flex-1 rounded-lg py-2.5" style={{ background: c.danger, color: "#fff", fontSize: 12, fontWeight: 700 }}>حذف</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BodyPortal>
  );
}

export { LegalTile, LegalHome };
