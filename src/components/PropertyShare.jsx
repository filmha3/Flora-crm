import React, { useState, useEffect } from "react";
import { X, Send, Copy, Check, Ruler, BedDouble, Building2, MapPin, Loader2, AlertTriangle, Car, ArrowUpDown, Warehouse } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassSurface } from "../lib/theme.js";
import { BodyPortal, FloraMark } from "../lib/ui.jsx";
import { faDigits, fmtToman } from "../lib/format.js";
import { supabase } from "../lib/supabaseClient.js";

// ---------- Step 1: generate the link, from inside the app ----------
function PropertyShareModal({ ctx, propertyIds, onClose, onDone }) {
  const { c, notify } = ctx;
  const [status, setStatus] = useState("creating"); // creating | ready | error
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("create-property-share", { body: { propertyIds } });
      if (cancelled) return;
      if (error || data?.error) {
        let msg = data?.error;
        if (!msg) { try { const b = await error.context?.json?.(); msg = b?.error; } catch (e) { /* ignore */ } }
        setErrMsg(msg || "ساخت لینک ناموفق بود"); setStatus("error"); return;
      }
      setUrl(`${window.location.origin}/?share=${data.token}`);
      setStatus("ready");
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  const waMessage = `سلام، این فایل‌ها رو لطفاً به مشتری نشون بده:\n${url}`;
  const canWhatsapp = typeof navigator !== "undefined"; // wa.me works from any browser (opens app or web fallback)

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); notify("لینک کپی شد"); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[300] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full flora-sheet" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: SP.lg }}>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>ارجاع به همکار</p>
            <button onClick={onClose} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button>
          </div>

          {status === "creating" && (
            <div className="flex flex-col items-center" style={{ padding: SP.xl, gap: SP.md }}>
              <Loader2 size={22} className="animate-spin" color={c.primary} />
              <p style={{ fontSize: 12, color: c.muted }}>در حال ساخت لینک...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start rounded-xl" style={{ gap: SP.sm, padding: SP.md, background: c.dangerSoft, marginBottom: SP.md }}>
              <AlertTriangle size={14} color={c.danger} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: c.danger, lineHeight: 1.8 }}>{errMsg}</p>
            </div>
          )}

          {status === "ready" && (
            <div className="flora-rise">
              <p style={{ fontSize: 13, color: c.success, fontWeight: 700, textAlign: "center", marginBottom: SP.lg }}>لینک آماده است</p>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
                target="_blank" rel="noreferrer"
                className="press w-full flex items-center justify-center rounded-xl"
                style={{ gap: 8, paddingBlock: 13, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 10 }}
              >
                <Send size={15} /> ارسال در واتساپ
              </a>
              <button onClick={copyLink} className="press w-full flex items-center justify-center rounded-xl" style={{ gap: 8, paddingBlock: 13, background: c.surface2, color: c.ink, fontWeight: 700, fontSize: 13 }}>
                {copied ? <Check size={15} color={c.success} /> : <Copy size={15} />} {copied ? "کپی شد" : "کپی لینک"}
              </button>
              <button onClick={() => { onDone?.(); onClose(); }} className="press w-full" style={{ marginTop: SP.lg, fontSize: 12, color: c.muted, fontWeight: 700, textAlign: "center" }}>تمام</button>
            </div>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

// ---------- Step 2: the page the colleague actually opens ----------
// No session, no CRM chrome, no navigation — a fully standalone screen that
// only ever shows what the get-property-share function chose to return.
function ShareGalleryCard({ p }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="overflow-hidden" style={{ borderRadius: 22, background: "#fff", boxShadow: "0 18px 40px -20px rgba(0,0,0,0.18)" }}>
      <div style={{ width: "100%", aspectRatio: "4 / 3", background: "#F1F1F3" }}>
        {p.coverUrl ? (
          <img
            src={p.coverUrl} alt={p.title} onLoad={() => setLoaded(true)}
            className={loaded ? "share-img loaded" : "share-img"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Building2 size={30} color="#C4C4C8" /></div>
        )}
      </div>
      <div style={{ padding: "18px 20px 22px" }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>{p.title}</p>
        {p.address && (
          <p className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: "#8A8A93", marginTop: 4 }}><MapPin size={12} /> {p.address}</p>
        )}
        <div className="flex items-center flex-wrap" style={{ gap: 14, marginTop: 14 }}>
          {p.area ? <span className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: "#333" }}><Ruler size={13} color="#999" /> {faDigits(p.area)} متر</span> : null}
          {p.rooms != null ? <span className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: "#333" }}><BedDouble size={13} color="#999" /> {faDigits(p.rooms)} خواب</span> : null}
          {p.floor != null ? <span className="flex items-center" style={{ gap: 5, fontSize: 12.5, color: "#333" }}><ArrowUpDown size={13} color="#999" /> طبقه {faDigits(p.floor)}</span> : null}
        </div>
        {p.amenities?.length > 0 && (
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 12 }}>
            {p.amenities.map((a) => (
              <span key={a} className="flex items-center" style={{ gap: 4, fontSize: 11, fontWeight: 600, color: "#4A7CFF", background: "#EEF2FF", borderRadius: 999, padding: "5px 10px" }}>
                {a === "پارکینگ" ? <Car size={11} /> : a === "انباری" ? <Warehouse size={11} /> : <ArrowUpDown size={11} />} {a}
              </span>
            ))}
          </div>
        )}
        {p.price ? (
          <p style={{ fontSize: 16, fontWeight: 800, color: "#111", marginTop: 14, direction: "ltr", textAlign: "right" }}>{fmtToman(p.price)}</p>
        ) : null}
      </div>
    </div>
  );
}

function ShareSkeletonCard() {
  return (
    <div className="overflow-hidden" style={{ borderRadius: 22, background: "#fff" }}>
      <div className="share-skel" style={{ width: "100%", aspectRatio: "4 / 3" }} />
      <div style={{ padding: "18px 20px 22px" }}>
        <div className="share-skel" style={{ height: 16, width: "55%", borderRadius: 6, marginBottom: 12 }} />
        <div className="share-skel" style={{ height: 11, width: "38%", borderRadius: 6, marginBottom: 16 }} />
        <div className="share-skel" style={{ height: 11, width: "70%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

function PublicShareView({ token }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const [properties, setProperties] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-property-share", { body: { token } });
        if (cancelled) return;
        if (error || data?.error) {
          let msg = data?.error;
          if (!msg) { try { const b = await error.context?.json?.(); msg = b?.error; } catch (e) { /* ignore */ } }
          setErrMsg(msg || "این لینک قابل نمایش نیست"); setState("error"); return;
        }
        setProperties(data.properties || []);
        setState("ready");
      } catch (e) { if (!cancelled) { setErrMsg("خطا در دریافت اطلاعات"); setState("error"); } }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F7F7F9", fontFamily: "'Vazirmatn', sans-serif" }}>
      {/* This whole view is an early-return, unauthenticated route — it
          never mounts the main app's shared <style> block, so its motion
          has to be fully self-contained rather than reusing flora-stagger
          etc. Kept intentionally small: a fade-up entrance, a staggered
          card reveal, an image that fades in once actually decoded instead
          of popping in, and a skeleton (not a spinner) while the first
          request is in flight — the same "quiet, not flashy" motion
          language as the rest of Flora, just redeclared locally. */}
      <style>{`
        @keyframes shareFadeUp { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
        .share-logo { animation: shareFadeUp 500ms cubic-bezier(0.22,1,0.36,1) both; }
        .share-card { animation: shareFadeUp 420ms cubic-bezier(0.22,1,0.36,1) both; }
        .share-card:nth-child(1) { animation-delay: 60ms; }
        .share-card:nth-child(2) { animation-delay: 130ms; }
        .share-card:nth-child(3) { animation-delay: 200ms; }
        .share-card:nth-child(4) { animation-delay: 270ms; }
        .share-card:nth-child(5) { animation-delay: 340ms; }
        .share-img { opacity: 0; transition: opacity 320ms ease; }
        .share-img.loaded { opacity: 1; }
        @keyframes shareShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .share-skel { background: linear-gradient(100deg, #ECECEF 25%, #F6F6F8 50%, #ECECEF 75%); background-size: 200% 100%; animation: shareShimmer 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .share-logo, .share-card { animation: none !important; opacity: 1 !important; transform: none !important; }
          .share-img { transition: none !important; }
          .share-skel { animation: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center share-logo" style={{ padding: "36px 20px 20px" }}>
        <FloraMark size={40} color="#111" stroke={1.4} />
        <p style={{ fontSize: 19, fontWeight: 800, color: "#111", marginTop: 14 }}>فایل‌های پیشنهادی</p>
      </div>

      <div style={{ maxWidth: 420, margin: "0 auto", padding: "8px 18px 60px" }}>
        {state === "loading" && (
          <div className="flex flex-col" style={{ gap: 18 }}>
            <ShareSkeletonCard /><ShareSkeletonCard />
          </div>
        )}
        {state === "error" && (
          <div className="flex flex-col items-center text-center" style={{ padding: 40, gap: 10 }}>
            <AlertTriangle size={22} color="#D14343" />
            <p style={{ fontSize: 13, color: "#666" }}>{errMsg}</p>
          </div>
        )}
        {state === "ready" && (
          <div className="flex flex-col" style={{ gap: 18 }}>
            {properties.length === 0 ? (
              <p style={{ fontSize: 13, color: "#999", textAlign: "center", padding: 40 }}>فایلی برای نمایش نیست</p>
            ) : properties.map((p) => <div key={p.id} className="share-card"><ShareGalleryCard p={p} /></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

export { PropertyShareModal, PublicShareView };
