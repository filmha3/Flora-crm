// «درخواست بازدید» — requests submitted from the public site's property pages
// (stored by the visit-request edge function in public.visit_requests, RLS:
// each agent only sees rows for their own published properties).
import React, { useEffect, useState, useCallback } from "react";
import { CalendarCheck, Phone, MessageCircle, ChevronDown, Check, Clock, Home, RefreshCw, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { faDigits, fmtJalali } from "../lib/format.js";
import { glass } from "../lib/theme.js";

const LAST_SEEN_KEY = "flora:visitRequests:lastSeen";

async function fetchRequests() {
  const { data, error } = await supabase.from("visit_requests").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  // "dismissed" = cleared by the agent (fallback when the DB delete policy
  // isn't installed yet) — never shown again.
  return (data || []).filter((r) => r.status !== "dismissed");
}
const timeOf = (iso) => { try { return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const waLink = (phone) => `https://wa.me/98${String(phone).replace(/^0/, "")}`;

// Background watcher for the whole CRM: polls every 60s (and on tab focus),
// and for each request newer than the last one seen shows a toast + a
// system notification (when permission was granted).
export function VisitRequestWatcher({ userId, notify }) {
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const { data } = await supabase.from("visit_requests").select("id, name, phone, property_title, created_at").eq("status", "new").order("created_at", { ascending: false }).limit(10);
        if (stopped || !data?.length) return;
        const last = localStorage.getItem(LAST_SEEN_KEY) || "";
        const fresh = data.filter((r) => r.created_at > last);
        if (!fresh.length) return;
        localStorage.setItem(LAST_SEEN_KEY, data[0].created_at);
        if (!last) return; // first run on this device: don't flood with old requests
        const r = fresh[0];
        const msg = `درخواست بازدید جدید: ${r.name || r.phone} — ${r.property_title || ""}`;
        notify?.(msg);
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("درخواست بازدید جدید", { body: `${r.name ? r.name + " — " : ""}${r.phone}\n${r.property_title || ""}`, icon: "/icon-192.png", tag: "visit-" + r.id });
          }
        } catch (e) { /* some browsers only allow notifications from the SW */ }
      } catch (e) { /* offline or table missing — try again next tick */ }
    };
    check();
    const t = setInterval(check, 60000);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);
    return () => { stopped = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [userId]);
  return null;
}

// Card in the «بیشتر» tab: header row with the count of new requests;
// expands to the full list with call / WhatsApp / mark-as-handled.
export function VisitRequestsCard({ c, notify }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchRequests()); } catch (e) { setItems([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("visit_requests").update({ status }).eq("id", id);
    if (error) { notify?.("ذخیره نشد — دوباره امتحان کن"); load(); }
  };
  // Clear a handled request from the list. Tries a real delete first; if the
  // delete policy isn't installed yet (0 rows removed), falls back to marking
  // it "dismissed" (allowed by the existing update policy) so it still disappears.
  const removeItem = async (id) => {
    const prev = items;
    setItems((list) => list.filter((r) => r.id !== id));
    try {
      const { data, error } = await supabase.from("visit_requests").delete().eq("id", id).select("id");
      if (error || !data?.length) {
        const { error: upErr } = await supabase.from("visit_requests").update({ status: "dismissed" }).eq("id", id);
        if (upErr) throw upErr;
      }
    } catch (e) { setItems(prev); notify?.("پاک نشد — دوباره امتحان کن"); }
  };
  const newCount = (items || []).filter((r) => r.status === "new").length;

  return (
    <div className="rounded-2xl mb-5" style={{ ...glass(c), overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} className="press w-full p-4 flex items-center gap-3" style={{ textAlign: "right" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: newCount ? c.successSoft : c.primarySoft, position: "relative" }}>
          <CalendarCheck size={18} color={newCount ? c.success : c.primary} />
          {newCount > 0 && <span style={{ position: "absolute", top: -5, left: -5, minWidth: 18, height: 18, borderRadius: 999, background: c.danger || "#E5484D", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{faDigits(newCount)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>درخواست بازدید</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>
            {items === null ? "در حال بارگذاری…" : items.length === 0 ? "هنوز درخواستی از سایت ثبت نشده" : newCount ? `${faDigits(newCount)} درخواست جدید از سایت` : `${faDigits(items.length)} درخواست — همه پیگیری شده`}
          </p>
        </div>
        <ChevronDown size={16} color={c.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${c.border}`, padding: 12 }}>
          <button onClick={load} className="press flex items-center" style={{ gap: 6, fontSize: 11, color: c.primary, fontWeight: 700, marginBottom: 10 }}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> به‌روزرسانی
          </button>
          {(items || []).length === 0 && !loading && <p style={{ fontSize: 12, color: c.muted, textAlign: "center", padding: 16 }}>درخواستی نیست.</p>}
          <div className="flex flex-col" style={{ gap: 10 }}>
            {(items || []).map((r) => {
              const isNew = r.status === "new";
              // Handled requests collapse to a single compact line with a
              // clear (×) button — only new ones keep the full card.
              if (!isNew) return (
                <div key={r.id} className="flex items-center" style={{ gap: 8, borderRadius: 12, padding: "7px 10px", border: `1px solid ${c.border}`, minHeight: 40 }}>
                  <Check size={13} color={c.success} style={{ flexShrink: 0 }} />
                  <p style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <b style={{ fontWeight: 700 }}>{r.name || "بدون نام"}</b>
                    <span dir="ltr" style={{ color: c.muted, margin: "0 6px" }}>{r.phone}</span>
                    {r.property_title && <span style={{ color: c.muted }}>— {r.property_title}</span>}
                  </p>
                  <button onClick={() => setStatus(r.id, "new")} className="press shrink-0" style={{ fontSize: 10.5, fontWeight: 700, color: c.primary, padding: "4px 6px" }}>جدید</button>
                  <button onClick={() => removeItem(r.id)} aria-label="پاک کردن" title="پاک کردن" className="press shrink-0 flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 999, background: c.surface2 || "rgba(127,127,127,0.12)" }}><X size={14} color={c.danger || "#E5484D"} /></button>
                </div>
              );
              return (
                <div key={r.id} style={{ borderRadius: 14, padding: 12, background: isNew ? c.primarySoft : "transparent", border: `1px solid ${isNew ? c.primary + "55" : c.border}` }}>
                  <div className="flex items-center justify-between" style={{ gap: 8 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 800 }}>{r.name || "بدون نام"}</p>
                    {isNew ? <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: c.primary, borderRadius: 999, padding: "2px 8px" }}>جدید</span>
                      : <span className="flex items-center" style={{ gap: 3, fontSize: 10, color: c.success, fontWeight: 700 }}><Check size={11} /> پیگیری شد</span>}
                  </div>
                  <a href={`tel:${r.phone}`} dir="ltr" style={{ display: "inline-block", fontSize: 15, fontWeight: 800, color: c.primary, marginTop: 4, textDecoration: "none" }}>{r.phone}</a>
                  {r.property_title && <p className="flex items-center" style={{ gap: 5, fontSize: 11.5, color: c.text || "inherit", marginTop: 6 }}><Home size={12} color={c.muted} /> {r.property_title}</p>}
                  {r.preferred_time && <p className="flex items-center" style={{ gap: 5, fontSize: 11.5, marginTop: 4 }}><Clock size={12} color={c.muted} /> زمان پیشنهادی: {r.preferred_time}</p>}
                  {r.note && <p style={{ fontSize: 11.5, color: c.muted, marginTop: 6, lineHeight: 1.8 }}>«{r.note}»</p>}
                  <p style={{ fontSize: 10, color: c.muted, marginTop: 6 }}>{fmtJalali(r.created_at.slice(0, 10))} — ساعت {timeOf(r.created_at)}</p>
                  <div className="flex" style={{ gap: 8, marginTop: 10 }}>
                    <a href={`tel:${r.phone}`} onClick={() => isNew && setStatus(r.id, "called")} className="press flex-1 flex items-center justify-center" style={{ gap: 5, height: 36, borderRadius: 10, background: c.primary, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}><Phone size={13} /> تماس</a>
                    <a href={waLink(r.phone)} target="_blank" rel="noreferrer" className="press flex-1 flex items-center justify-center" style={{ gap: 5, height: 36, borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}><MessageCircle size={13} /> واتس‌اپ</a>
                    <button onClick={() => setStatus(r.id, isNew ? "called" : "new")} className="press flex items-center justify-center" style={{ height: 36, padding: "0 10px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: 11, fontWeight: 700, color: c.muted }}>{isNew ? "پیگیری شد" : "جدید"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
