import React, { useState, useRef, useEffect } from "react";
import {
  Scale, Mic, Plus, Send, X, Trash2, FileText, Image as ImageIcon,
  AlertTriangle, Loader2, Copy, History, Square, Check,
} from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite, glassSurface } from "../lib/theme.js";
import { BodyPortal } from "../lib/ui.jsx";
import { uid, faDigits, fmtJalali } from "../lib/format.js";
import { supabase } from "../lib/supabaseClient.js";
import { uploadLegalImage, uploadLegalPdf, getLegalAttachmentUrl, deleteLegalConversationFiles } from "../lib/legalAttachments.js";

// ---------- Home dashboard entry point ----------
function LegalTile({ ctx }) {
  const { c, setLegalOpen } = ctx;
  return (
    <button onClick={() => setLegalOpen(true)} className="press text-right flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: RAD.md, background: c.dangerSoft, marginBottom: SP.md }}><Scale size={20} color={c.danger} /></div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>Flora Legal</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>دستیار حقوقی چت</p>
    </button>
  );
}

function newConversation() {
  const now = new Date().toISOString();
  return { id: uid(), title: "گفتگوی جدید", messages: [], createdAt: now, updatedAt: now };
}

// The one call every input (typed, voice-transcribed, or an image/PDF
// caption) funnels through — Frontend → this → the legal-chat Edge
// Function → the AI provider. The key is still the person's own (same
// bring-your-own-key model as the rest of the app) but it never leaves the
// browser in a request aimed at a third party; the fetch to the AI
// provider itself happens server-side.
async function askLegal({ provider, key, model, messages, attachment }) {
  const { data, error } = await supabase.functions.invoke("legal-chat", {
    body: {
      provider, key, model,
      messages: messages.map((m) => ({ role: m.role, content: m.text || (m.kind === "pdf" ? `[سند PDF: ${m.attachmentName || ""}]` : "[تصویر سند]") })),
      attachmentPath: attachment?.path, attachmentType: attachment?.kind,
    },
  });
  if (error) {
    // supabase-js puts the function's own JSON error body in error.context; a
    // 4xx/5xx from legal-chat is far more useful to show than the generic
    // "Edge Function returned a non-2xx status code" wrapper message.
    let msg = error.message;
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch (e) { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.text;
}

// ---------- Main screen ----------
function LegalHome({ ctx }) {
  const { c, canTranscribe, transcribeAudio, hasAiKey, aiProvider, avalaiKey, geminiKey, perplexityKey, avalaiModel, session, legalConversations, setLegalConversations, setLegalOpen } = ctx;
  const convos = legalConversations || [];
  const [activeId, setActiveId] = useState(() => convos[0]?.id || null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(null); // staged image/pdf awaiting send: { path, kind, name, previewUrl }
  const [sending, setSending] = useState(false);
  const [recState, setRecState] = useState("idle"); // idle | recording | transcribing
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [plusOpen, setPlusOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const silenceRef = useRef(0);
  const spokeRef = useRef(false);
  const secondsRef = useRef(0);

  // Chat-first: land directly in a conversation, never an empty form. If
  // nothing exists yet or the remembered one vanished, a fresh thread opens
  // automatically — there's no "start" screen to click through first.
  useEffect(() => {
    if (!convos.some((cv) => cv.id === activeId)) {
      if (convos.length) setActiveId(convos[0].id);
      else {
        const fresh = newConversation();
        setLegalConversations([fresh]);
        setActiveId(fresh.id);
      }
    }
  }, [convos.length]); // eslint-disable-line

  const active = convos.find((cv) => cv.id === activeId) || null;

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [active?.messages?.length, sending]);

  const updateConv = (id, updater) => {
    setLegalConversations((prev) => prev.map((cv) => (cv.id === id ? { ...updater(cv), updatedAt: new Date().toISOString() } : cv)));
  };

  const startNewChat = () => {
    const fresh = newConversation();
    setLegalConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setHistoryOpen(false);
  };

  const openFromHistory = (id) => { setActiveId(id); setHistoryOpen(false); };

  const deleteConv = async (id) => {
    setConfirmDeleteId(null);
    if (session?.user) deleteLegalConversationFiles({ userId: session.user.id, conversationId: id }).catch(() => {});
    const next = convos.filter((cv) => cv.id !== id);
    setLegalConversations(next);
    if (activeId === id) setActiveId(next[0]?.id || null);
  };

  // ---------- Sending ----------
  const providerKey = aiProvider === "avalai" ? avalaiKey : aiProvider === "gemini" ? geminiKey : perplexityKey;

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text && !pending) return;
    if (!hasAiKey) { setError("اول یک کلید هوش مصنوعی در تنظیمات وارد کن."); return; }
    setError("");

    const userMsg = {
      id: uid(), role: "user", createdAt: new Date().toISOString(),
      text, kind: pending?.kind || "text", attachmentPath: pending?.path, attachmentName: pending?.name,
    };
    const isFirstMessage = !active.messages.length;
    const history = [...active.messages, userMsg];
    updateConv(active.id, (cv) => ({
      ...cv, messages: history,
      title: isFirstMessage ? (text || (pending?.kind === "pdf" ? "بررسی سند PDF" : "بررسی تصویر سند")).slice(0, 42) : cv.title,
    }));
    setInput(""); setPending(null); setSending(true);

    try {
      const replyText = await askLegal({
        provider: aiProvider, key: providerKey, model: avalaiModel,
        messages: history,
        attachment: userMsg.attachmentPath ? { path: userMsg.attachmentPath, kind: userMsg.kind } : undefined,
      });
      const replyMsg = { id: uid(), role: "assistant", text: replyText.trim(), kind: "text", createdAt: new Date().toISOString() };
      updateConv(active.id, (cv) => ({ ...cv, messages: [...cv.messages, replyMsg] }));
    } catch (e) {
      updateConv(active.id, (cv) => ({ ...cv, messages: [...cv.messages, { id: uid(), role: "assistant", kind: "error", text: e.message || "خطای نامشخص", createdAt: new Date().toISOString() }] }));
    }
    setSending(false);
  };

  // ---------- Voice — identical downstream flow to typing: transcript
  // becomes the chat message text, same send() path, same response. ----------
  const cleanupAudioGraph = () => {
    cancelAnimationFrame(rafRef.current);
    try { audioCtxRef.current?.close(); } catch (e) { /* ignore */ }
    audioCtxRef.current = null; analyserRef.current = null; setLevel(0);
  };
  const vibrate = (ms) => { try { navigator.vibrate?.(ms); } catch (e) { /* ignore */ } };
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
    setError("");
    if (!canTranscribe) { setError("اول کلید AvalAI را در تنظیمات هوش مصنوعی وارد کن — صحبت صوتی به آن نیاز دارد."); return; }
    spokeRef.current = false; silenceRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { cleanupAudioGraph(); stream.getTracks().forEach((t) => t.stop()); handleRecordingDone(rec.mimeType || "audio/webm"); };
      mediaRef.current = rec;
      rec.start(); watchLevels(stream); vibrate(20);
      setRecState("recording"); setSeconds(0); secondsRef.current = 0;
      timerRef.current = setInterval(() => setSeconds((s) => { const next = s + 1; secondsRef.current = next; if (next >= 120) stopRecording(); return next; }), 1000);
    } catch (e) { setError("دسترسی به میکروفون داده نشد."); }
  };
  const stopRecording = () => { clearInterval(timerRef.current); if (mediaRef.current?.state === "recording") { vibrate(15); mediaRef.current.stop(); } };
  const handleRecordingDone = async (mimeType) => {
    setRecState("transcribing");
    // Original audio is never kept — not written to Storage, not written to
    // the database, not even held in state past this function. Only the
    // transcript (plain text, same as anything typed) survives.
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    try {
      const text = await transcribeAudio(blob);
      setRecState("idle");
      if (text?.trim()) await send(text.trim());
      else setError("چیزی شنیده نشد — دوباره امتحان کن.");
    } catch (e) { setError(e.message || "خطا در تبدیل صوت — دوباره امتحان کن."); setRecState("idle"); }
  };

  // ---------- Image / PDF upload — attach first, caption optional, then send ----------
  const pickImage = async (files) => {
    const file = files?.[0];
    if (!file || !session?.user || !active) return;
    setPlusOpen(false); setUploading(true); setError("");
    try {
      const up = await uploadLegalImage({ userId: session.user.id, conversationId: active.id, file });
      const previewUrl = await getLegalAttachmentUrl(up.path).catch(() => null);
      setPending({ path: up.path, kind: "image", name: up.name, previewUrl });
    } catch (e) { setError(e.message || "آپلود عکس ناموفق بود."); }
    setUploading(false);
  };
  const pickPdf = async (files) => {
    const file = files?.[0];
    if (!file || !session?.user || !active) return;
    setPlusOpen(false); setUploading(true); setError("");
    try {
      const up = await uploadLegalPdf({ userId: session.user.id, conversationId: active.id, file });
      setPending({ path: up.path, kind: "pdf", name: up.name });
    } catch (e) { setError(e.message || "آپلود PDF ناموفق بود."); }
    setUploading(false);
  };

  const copyMsg = (m) => { navigator.clipboard?.writeText(m.text).then(() => { setCopiedId(m.id); setTimeout(() => setCopiedId(null), 1500); }); };

  if (!active) return null; // one render tick while the auto-create effect above runs

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] flex flex-col" style={{ background: c.bg }}>
        {/* Header */}
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={() => setLegalOpen(false)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active.title}</p>
            <p style={{ fontSize: 11, color: c.muted }}>Flora Legal — دستیار حقوقی، نه وکیل واقعی</p>
          </div>
          <button onClick={startNewChat} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Plus size={17} color={c.ink} /></button>
          <button onClick={() => setHistoryOpen(true)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><History size={16} color={c.ink} /></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-2.5">
          {active.messages.length === 0 && (
            <div className="rounded-xl p-4 mt-2" style={glass(c)}>
              <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.9 }}>مشکلت را بگو، بنویس، عکس سند رو بفرست یا PDF قرارداد رو آپلود کن — مستقیم شروع کن، فرمی در کار نیست.</p>
            </div>
          )}
          {active.messages.map((m) => (
            <LegalBubble key={m.id} c={c} m={m} onCopy={() => copyMsg(m)} copied={copiedId === m.id} />
          ))}
          {sending && (
            <div className="self-start rounded-xl p-3 flex items-center" style={{ ...glassLite(c, 20), gap: 6 }}>
              <Loader2 size={14} className="animate-spin" color={c.danger} />
              <span style={{ fontSize: 12, color: c.muted }}>در حال بررسی...</span>
            </div>
          )}
          {error && (
            <div className="flex items-start self-stretch" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.dangerSoft }}>
              <AlertTriangle size={14} color={c.danger} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: c.danger, lineHeight: 1.8, flex: 1 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Staged attachment preview */}
        {pending && (
          <div className="flex items-center shrink-0 mx-4 mb-2" style={{ gap: SP.sm, padding: SP.sm, borderRadius: RAD.md, ...glassLite(c, RAD.md) }}>
            {pending.kind === "image"
              ? (pending.previewUrl ? <img src={pending.previewUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: RAD.sm }} /> : <ImageIcon size={18} color={c.muted} />)
              : <FileText size={18} color={c.danger} />}
            <span style={{ fontSize: 12, flex: 1, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pending.name}</span>
            <button onClick={() => setPending(null)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={12} color={c.muted} /></button>
          </div>
        )}

        {/* Recording overlay strip */}
        {recState !== "idle" ? (
          <div className="flex items-center shrink-0 mx-4 mb-3" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.lg, background: `rgba(230,57,70,${0.12 + level * 0.2})` }}>
            {recState === "recording" ? (
              <>
                <button onClick={stopRecording} className="press flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#c8102e,#e63946)" }}><Square size={14} color="#fff" fill="#fff" /></button>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: c.ink }}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
                <span style={{ fontSize: 11, color: c.muted, flex: 1 }}>در حال صحبت — با سکوت خودکار تموم می‌شه</span>
              </>
            ) : (
              <><Loader2 size={16} className="animate-spin" color={c.danger} /><span style={{ fontSize: 12, color: c.muted }}>در حال تبدیل صوت به متن...</span></>
            )}
          </div>
        ) : (
          /* Input bar */
          <div className="flex items-center shrink-0 mx-4 mb-4 relative" style={{ gap: SP.sm }}>
            {plusOpen && (
              <div className="absolute bottom-14 right-0 flex flex-col" style={{ gap: 6, padding: 6, borderRadius: RAD.md, ...glassSurface(c), boxShadow: "0 12px 30px -10px rgba(0,0,0,0.4)" }}>
                <label className="press flex items-center rounded-lg" style={{ gap: 8, padding: "9px 12px", cursor: "pointer" }}>
                  <ImageIcon size={15} color={c.ink} /><span style={{ fontSize: 12, fontWeight: 600 }}>عکس</span>
                  <input type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files)} />
                </label>
                <label className="press flex items-center rounded-lg" style={{ gap: 8, padding: "9px 12px", cursor: "pointer" }}>
                  <FileText size={15} color={c.ink} /><span style={{ fontSize: 12, fontWeight: 600 }}>PDF</span>
                  <input type="file" accept="application/pdf" hidden onChange={(e) => pickPdf(e.target.files)} />
                </label>
              </div>
            )}
            <button onClick={() => setPlusOpen((v) => !v)} disabled={uploading} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2, opacity: uploading ? 0.5 : 1 }}>
              {uploading ? <Loader2 size={16} className="animate-spin" color={c.muted} /> : <Plus size={18} color={c.ink} />}
            </button>
            <input
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="پیام..." dir="auto"
              style={{ flex: 1, height: 44, borderRadius: RAD.pill, border: `1px solid ${c.border}`, background: c.surface2, color: c.ink, fontSize: 13, padding: "0 16px", outline: "none" }}
            />
            {input.trim() || pending ? (
              <button onClick={() => send()} disabled={sending} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#c8102e,#e63946)", opacity: sending ? 0.5 : 1 }}><Send size={16} color="#fff" /></button>
            ) : (
              <button onClick={startRecording} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#c8102e,#e63946)" }}><Mic size={17} color="#fff" /></button>
            )}
          </div>
        )}
      </div>

      {historyOpen && (
        <LegalHistorySheet
          c={c} convos={convos} activeId={activeId}
          onOpen={openFromHistory} onNew={startNewChat} onClose={() => setHistoryOpen(false)}
          confirmDeleteId={confirmDeleteId} onAskDelete={setConfirmDeleteId} onDelete={deleteConv}
        />
      )}
    </BodyPortal>
  );
}

function LegalBubble({ c, m, onCopy, copied }) {
  const isUser = m.role === "user";
  const [imgUrl, setImgUrl] = useState(null);
  useEffect(() => {
    if (m.kind === "image" && m.attachmentPath) getLegalAttachmentUrl(m.attachmentPath).then(setImgUrl).catch(() => {});
  }, [m.kind, m.attachmentPath]);

  if (m.kind === "error") {
    return (
      <div className="self-start flex items-start rounded-xl p-3" style={{ gap: 6, maxWidth: "88%", background: c.dangerSoft }}>
        <AlertTriangle size={13} color={c.danger} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: c.danger, lineHeight: 1.8 }}>{m.text}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-3 relative ${isUser ? "self-end" : "self-start"}`} style={{ ...glassLite(c, 20), maxWidth: "86%", background: isUser ? c.primary : c.surface2 }}>
      {m.kind === "image" && (imgUrl ? <img src={imgUrl} alt="" style={{ width: 180, maxWidth: "100%", borderRadius: RAD.sm, marginBottom: m.text ? 8 : 0 }} /> : <div className="flex items-center justify-center" style={{ width: 180, height: 120, borderRadius: RAD.sm, background: "rgba(0,0,0,0.15)" }}><Loader2 size={16} className="animate-spin" color={isUser ? "#fff" : c.muted} /></div>)}
      {m.kind === "pdf" && (
        <div className="flex items-center rounded-lg" style={{ gap: 8, padding: 8, background: "rgba(0,0,0,0.12)", marginBottom: m.text ? 8 : 0 }}>
          <FileText size={16} color={isUser ? "#fff" : c.danger} />
          <span style={{ fontSize: 12, color: isUser ? "#fff" : c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.attachmentName || "سند.pdf"}</span>
        </div>
      )}
      {m.text && <p style={{ fontSize: 13, lineHeight: 1.95, color: isUser ? "#fff" : c.ink, whiteSpace: "pre-wrap" }}>{m.text}</p>}
      {!isUser && m.text && (
        <button onClick={onCopy} className="press flex items-center" style={{ gap: 4, marginTop: 8, opacity: 0.65 }}>
          {copied ? <Check size={11} color={c.success} /> : <Copy size={11} color={c.muted} />}
          <span style={{ fontSize: 10, color: copied ? c.success : c.muted, fontWeight: 600 }}>{copied ? "کپی شد" : "کپی"}</span>
        </button>
      )}
    </div>
  );
}

function LegalHistorySheet({ c, convos, activeId, onOpen, onNew, onClose, confirmDeleteId, onAskDelete, onDelete }) {
  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[97] flex items-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full flora-sheet" style={{ ...glassSurface(c), borderTopLeftRadius: RAD.lg + 6, borderTopRightRadius: RAD.lg + 6, maxHeight: "75vh", display: "flex", flexDirection: "column" }}>
          <div className="flex items-center justify-between shrink-0" style={{ padding: SP.lg }}>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>تاریخچه‌ی گفتگوها</p>
            <button onClick={onClose} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <button onClick={onNew} className="press w-full flex items-center justify-center rounded-xl mb-3" style={{ gap: 6, paddingBlock: 12, background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 13 }}>
              <Plus size={14} /> گفتگوی جدید
            </button>
            {convos.length === 0 ? (
              <p style={{ fontSize: 12, color: c.muted, textAlign: "center", padding: SP.xl }}>هنوز گفتگویی نداری</p>
            ) : (
              <div className="flex flex-col" style={{ gap: 6 }}>
                {convos.map((cv) => (
                  <div key={cv.id} className="flex items-center rounded-xl" style={{ gap: SP.sm, ...glassLite(c, RAD.md), padding: SP.sm, opacity: cv.id === activeId ? 1 : 0.85, border: cv.id === activeId ? `1.5px solid ${c.primary}` : "1.5px solid transparent" }}>
                    <button onClick={() => onOpen(cv.id)} className="press flex-1 text-right min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cv.title}</p>
                      <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{cv.messages.length ? `${faDigits(cv.messages.length)} پیام` : "بدون پیام"} — {fmtJalali(cv.updatedAt.slice(0, 10))}</p>
                    </button>
                    {confirmDeleteId === cv.id ? (
                      <div className="flex items-center shrink-0" style={{ gap: 4 }}>
                        <button onClick={() => onDelete(cv.id)} className="press rounded-lg" style={{ padding: "6px 10px", background: c.danger, color: "#fff", fontSize: 11, fontWeight: 700 }}>حذف</button>
                        <button onClick={() => onAskDelete(null)} className="press rounded-lg" style={{ padding: "6px 10px", background: c.surface2, fontSize: 11, fontWeight: 700 }}>لغو</button>
                      </div>
                    ) : (
                      <button onClick={() => onAskDelete(cv.id)} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

export { LegalTile, LegalHome };
