import React, { useState, useRef, useEffect } from "react";
import {
  Car, ChevronLeft, Plus, UserCircle2, Check, ArrowUp, ArrowDown, AlertTriangle,
  X, ChevronRight, MapPin, Ruler, Home, PhoneCall, Navigation as NavigationIcon,
  StickyNote, CheckCircle2,
} from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite } from "../lib/theme.js";
import { Field, inputStyle, EmptyLine, BodyPortal } from "../lib/ui.jsx";
import { faDigits, fmtToman, uid, todayISO } from "../lib/format.js";
import { typeIcon } from "../lib/constants.js";
import { COORD_ORDER, coordMeta, KEY_ORDER, KEY_LABEL, DISLIKE_REASONS, RATING_ORDER, ratingMeta, mapsLink } from "../lib/tourMeta.js";

function TourEntryCard({ ctx }) {
  const { c, tours, setTourBuilder, setOpenTourId } = ctx;
  const active = tours.find((t) => t.status === "active" || t.status === "reviewing");

  if (!active) {
    return (
      <button
        onClick={() => setTourBuilder({ step: "customer", customerId: "", customerName: "", customerPhone: "", propertyIds: [] })}
        className="press w-full flex items-center relative overflow-hidden text-right"
        style={{ gap: SP.lg, padding: SP.lg, borderRadius: RAD.lg, ...glass(c), background: `linear-gradient(135deg, ${c.purpleSoft}, ${c.surface} 65%)` }}
      >
        <span style={{ position: "absolute", top: "-50%", left: "-10%", width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${c.purple}22, transparent 70%)`, pointerEvents: "none" }} />
        <div className="flex items-center justify-center shrink-0 relative" style={{ width: 48, height: 48, borderRadius: RAD.md, background: c.purpleSoft, border: `1px solid ${c.purple}33` }}>
          <Car size={22} color={c.purple} />
        </div>
        <div className="flex-1 relative">
          <p style={{ fontSize: FS.body, fontWeight: FW.heavy }}>تور بازدید جدید</p>
          <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>مشتری، چند فایل، مسیر — همه در یک صفحه</p>
        </div>
        <ChevronLeft size={18} color={c.muted} className="relative" />
      </button>
    );
  }

  const total = active.items.length;
  const doneCount = active.items.filter((it) => it.visited).length;
  const cur = Math.min(doneCount + 1, total);

  return (
    <button
      onClick={() => setOpenTourId(active.id)}
      className="press w-full text-right relative overflow-hidden"
      style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c), background: `linear-gradient(135deg, ${c.purpleSoft}, ${c.surface} 65%)` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: SP.md }}>
          <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: RAD.md, background: c.purpleSoft }}><Car size={18} color={c.purple} /></div>
          <div>
            <p style={{ fontSize: FS.body, fontWeight: FW.heavy }}>{active.status === "reviewing" ? "تور تمام شد — ثبت نتیجه" : `ادامه‌ی تور با ${active.customerName}`}</p>
            <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{active.status === "reviewing" ? "برای ثبت خودکار در پرونده‌ها بزن" : `ملک ${faDigits(cur)} از ${faDigits(total)}`}</p>
          </div>
        </div>
        <ChevronLeft size={18} color={c.muted} />
      </div>
      {active.status === "active" && (
        <div className="flex" style={{ gap: 4, marginTop: SP.md }}>
          {active.items.map((it) => <div key={it.id} style={{ flex: 1, height: 4, borderRadius: RAD.pill, background: it.visited ? c.purple : c.surface2 }} />)}
        </div>
      )}
    </button>
  );
}

// Full-screen 3-step wizard: pick customer → pick 3-6 files → reorder & check
// coordination/key readiness. Deliberately no drag-and-drop library — up/down
// buttons are just as fast with a thumb and never misfire on a moving list.
function TourWizard({ ctx }) {
  const { c, tourBuilder: b, setTourBuilder } = ctx;
  const patch = (obj) => setTourBuilder((prev) => ({ ...prev, ...obj }));
  const STEP_LABELS = { customer: "انتخاب مشتری", properties: "انتخاب فایل‌ها", review: "ترتیب و هماهنگی" };
  const STEP_ORDER = ["customer", "properties", "review"];
  const stepIdx = STEP_ORDER.indexOf(b.step);

  const goBack = () => { if (stepIdx === 0) { setTourBuilder(null); return; } patch({ step: STEP_ORDER[stepIdx - 1] }); };

  const startTour = () => {
    const tour = { id: uid(), customerId: b.customerId, customerName: b.customerName, customerPhone: b.customerPhone, status: "active", items: b.items, topPicks: [], notes: "", createdAt: new Date().toISOString(), completedAt: null };
    ctx.setTours((prev) => [tour, ...prev]);
    setTourBuilder(null);
    ctx.setOpenTourId(tour.id);
  };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] flex flex-col flora-focus-in" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
          <button onClick={goBack} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}>
            {stepIdx === 0 ? <X size={16} color={c.ink} /> : <ArrowRight size={16} color={c.ink} />}
          </button>
          <div className="flex-1">
            <p style={{ fontSize: FS.caption, color: c.muted }}>تور بازدید جدید</p>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{STEP_LABELS[b.step]}</p>
          </div>
          <div className="flex" style={{ gap: 4 }}>
            {STEP_ORDER.map((s, i) => <div key={s} style={{ width: i === stepIdx ? 18 : 6, height: 6, borderRadius: RAD.pill, background: i <= stepIdx ? c.purple : c.surface2, transition: "all .3s ease" }} />)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {b.step === "customer" && <TourStepCustomer ctx={ctx} b={b} patch={patch} />}
          {b.step === "properties" && <TourStepProperties ctx={ctx} b={b} patch={patch} />}
          {b.step === "review" && <TourStepReview ctx={ctx} b={b} patch={patch} onStart={startTour} />}
        </div>
      </div>
    </BodyPortal>
  );
}

function TourStepCustomer({ ctx, b, patch }) {
  const { c, customers, setCustomers } = ctx;
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const filtered = customers.filter((cu) => !q || cu.name.includes(q) || (cu.phone || "").includes(q));
  const pick = (cu) => patch({ customerId: cu.id, customerName: cu.name, customerPhone: cu.phone || "", step: "properties" });
  const addNew = () => { if (!name.trim()) return; const cu = { id: uid(), name: name.trim(), phone: phone.trim(), need: "", budget: 0 }; setCustomers((prev) => [cu, ...prev]); pick(cu); };

  return (
    <div className="pt-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی مشتری..." style={inputStyle(c)} />
      <div style={{ height: SP.md }} />
      <div className="flex flex-col" style={{ gap: SP.sm }}>
        {filtered.map((cu) => (
          <button key={cu.id} onClick={() => pick(cu)} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md) }}>
            <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.primarySoft }}><UserCircle2 size={20} color={c.primary} /></div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{cu.name}</p>
              <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }} dir="ltr">{cu.phone || "بدون شماره"}</p>
            </div>
            <ChevronLeft size={16} color={c.muted} />
          </button>
        ))}
        {filtered.length === 0 && !adding && <EmptyLine c={c} text="مشتری‌ای پیدا نشد" />}
      </div>
      <div style={{ marginTop: SP.lg }}>
        {!adding ? (
          <button onClick={() => setAdding(true)} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, padding: SP.md, borderRadius: RAD.md, background: c.primarySoft, color: c.primary, fontWeight: FW.bold, fontSize: FS.body }}>
            <Plus size={16} color={c.primary} /> مشتری جدید
          </button>
        ) : (
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
            <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
            <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <div className="flex" style={{ gap: SP.sm }}>
              <button onClick={() => setAdding(false)} className="press flex-1 rounded-xl" style={{ paddingBlock: SP.sm + 2, background: c.surface2, color: c.muted, fontWeight: FW.bold, fontSize: FS.caption + 1 }}>لغو</button>
              <button onClick={addNew} disabled={!name.trim()} className="press flex-1 rounded-xl" style={{ paddingBlock: SP.sm + 2, background: c.primary, color: "#fff", fontWeight: FW.bold, fontSize: FS.caption + 1, opacity: name.trim() ? 1 : 0.5 }}>ادامه</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TourStepProperties({ ctx, b, patch }) {
  const { c, properties, setProperties, setOwners } = ctx;
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [qa, setQa] = useState({ title: "", address: "", price: "", ownerPhone: "" });
  const selectable = properties.filter((p) => p.stage !== "فروخته شد");
  const filtered = selectable.filter((p) => !q || p.title.includes(q) || (p.address || "").includes(q));
  const selected = b.propertyIds || [];
  const toggle = (id) => { if (selected.includes(id)) { patch({ propertyIds: selected.filter((x) => x !== id) }); return; } if (selected.length >= 6) return; patch({ propertyIds: [...selected, id] }); };

  const addQuick = () => {
    if (!qa.title.trim()) return;
    let ownerId = "";
    if (qa.ownerPhone.trim()) { const owner = { id: uid(), name: `مالک ${qa.title.trim()}`, phone: qa.ownerPhone.trim() }; setOwners((prev) => [owner, ...prev]); ownerId = owner.id; }
    const p = { id: uid(), title: qa.title.trim(), type: "آپارتمان", deal: "فروش", price: toNum(qa.price), pricePerMeter: 0, area: 0, rooms: 0, floor: null, furnished: "", address: qa.address.trim(), ownerId, builderId: "", stage: "فعال", desc: "", media: [], createdAt: new Date().toISOString() };
    setProperties((prev) => [p, ...prev]);
    if (selected.length < 6) patch({ propertyIds: [...selected, p.id] });
    setQa({ title: "", address: "", price: "", ownerPhone: "" }); setAdding(false);
  };

  const proceed = () => {
    const items = selected.map((id) => ({ id: uid(), propertyId: id, coordinationStatus: "none", keyStatus: "none", visited: false, customerRating: null, customerReasons: [], notes: "", visitedAt: null }));
    patch({ items, step: "review" });
  };

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between" style={{ marginBottom: SP.sm }}>
        <p style={{ fontSize: FS.caption, color: c.muted }}>{faDigits(selected.length)} از ۶ فایل انتخاب شد</p>
        {selected.length > 0 && selected.length < 3 && <p style={{ fontSize: FS.caption, color: c.attn }}>پیشنهاد: حداقل ۳ فایل</p>}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی فایل..." style={inputStyle(c)} />
      <div style={{ height: SP.md }} />
      <div className="flex flex-col" style={{ gap: SP.sm }}>
        {filtered.map((p) => {
          const isSel = selected.includes(p.id); const cover = p.media && p.media[0]; const Icon = typeIcon(p.type);
          return (
            <button key={p.id} onClick={() => toggle(p.id)} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, background: isSel ? c.purpleSoft : c.surface2, border: `1.5px solid ${isSel ? c.purple : c.border}` }}>
              <div className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 44, height: 44, borderRadius: RAD.sm, background: cover ? c.primarySoft : `linear-gradient(140deg, ${c.primarySoft}, ${c.purpleSoft})` }}>
                {cover ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon size={18} color={c.primary} />}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: FS.body, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{fmtToman(p.price)}</p>
              </div>
              <div className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: "50%", background: isSel ? c.purple : "transparent", border: `1.5px solid ${isSel ? c.purple : c.border}` }}>
                {isSel && <Check size={13} color="#fff" />}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <EmptyLine c={c} text="فایلی پیدا نشد" />}
      </div>
      <div style={{ marginTop: SP.lg }}>
        {!adding ? (
          <button onClick={() => setAdding(true)} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, padding: SP.md, borderRadius: RAD.md, background: c.primarySoft, color: c.primary, fontWeight: FW.bold, fontSize: FS.body }}>
            <Plus size={16} color={c.primary} /> افزودن سریع فایل (خارج از CRM)
          </button>
        ) : (
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
            <Field c={c} label="نام/عنوان"><input style={inputStyle(c)} value={qa.title} onChange={(e) => setQa({ ...qa, title: e.target.value })} autoFocus /></Field>
            <Field c={c} label="آدرس"><input style={inputStyle(c)} value={qa.address} onChange={(e) => setQa({ ...qa, address: e.target.value })} /></Field>
            <Field c={c} label="قیمت (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={qa.price} onChange={(e) => setQa({ ...qa, price: e.target.value })} /></Field>
            <Field c={c} label="شماره مالک (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={qa.ownerPhone} onChange={(e) => setQa({ ...qa, ownerPhone: e.target.value })} /></Field>
            <div className="flex" style={{ gap: SP.sm }}>
              <button onClick={() => setAdding(false)} className="press flex-1 rounded-xl" style={{ paddingBlock: SP.sm + 2, background: c.surface2, color: c.muted, fontWeight: FW.bold, fontSize: FS.caption + 1 }}>لغو</button>
              <button onClick={addQuick} disabled={!qa.title.trim()} className="press flex-1 rounded-xl" style={{ paddingBlock: SP.sm + 2, background: c.primary, color: "#fff", fontWeight: FW.bold, fontSize: FS.caption + 1, opacity: qa.title.trim() ? 1 : 0.5 }}>افزودن</button>
            </div>
          </div>
        )}
      </div>
      <button onClick={proceed} disabled={selected.length === 0} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.xl, paddingBlock: SP.md, borderRadius: RAD.lg, background: selected.length ? "linear-gradient(135deg,#2f7cf6,#7c6ff5)" : c.surface2, color: selected.length ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.body + 1 }}>
        ادامه <ChevronLeft size={16} color={selected.length ? "#fff" : c.muted} />
      </button>
    </div>
  );
}

function TourStepReview({ ctx, b, patch, onStart }) {
  const { c, properties } = ctx;
  const items = b.items;
  const coord = coordMeta(c);
  const move = (idx, dir) => { const next = [...items]; const j = idx + dir; if (j < 0 || j >= next.length) return; [next[idx], next[j]] = [next[j], next[idx]]; patch({ items: next }); };
  const remove = (idx) => patch({ items: items.filter((_, i) => i !== idx) });
  const cycleCoord = (idx) => { const next = [...items]; const cur = COORD_ORDER.indexOf(next[idx].coordinationStatus); next[idx] = { ...next[idx], coordinationStatus: COORD_ORDER[(cur + 1) % COORD_ORDER.length] }; patch({ items: next }); };
  const cycleKey = (idx) => { const next = [...items]; const cur = KEY_ORDER.indexOf(next[idx].keyStatus); next[idx] = { ...next[idx], keyStatus: KEY_ORDER[(cur + 1) % KEY_ORDER.length] }; patch({ items: next }); };

  const confirmedCount = items.filter((it) => it.coordinationStatus === "confirmed").length;
  const pendingCount = items.filter((it) => it.coordinationStatus === "pending").length;
  const needsKeyCount = items.filter((it) => it.keyStatus !== "none").length;
  const notConfirmed = items.filter((it) => it.coordinationStatus !== "confirmed");

  return (
    <div className="pt-2">
      <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>{b.customerName} · {faDigits(items.length)} فایل — با فلش جابجا کن، با لمس وضعیت رو عوض کن</p>
      <div className="flex flex-col" style={{ gap: SP.sm }}>
        {items.map((it, idx) => {
          const p = properties.find((x) => x.id === it.propertyId); if (!p) return null;
          const cm = coord[it.coordinationStatus];
          return (
            <div key={it.id} style={{ padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md) }}>
              <div className="flex items-center" style={{ gap: SP.sm }}>
                <div className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 22, height: 22, background: c.purpleSoft, fontSize: 11, fontWeight: FW.heavy, color: c.purple }}>{faDigits(idx + 1)}</div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: FS.body, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                  <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 1 }}>{fmtToman(p.price)}</p>
                </div>
                <div className="flex flex-col items-center" style={{ gap: 2 }}>
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="press w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.surface2, opacity: idx === 0 ? 0.5 : 1 }}><ArrowUp size={12} color={c.muted} /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="press w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.surface2, opacity: idx === items.length - 1 ? 0.5 : 1 }}><ArrowDown size={12} color={c.muted} /></button>
                </div>
                <button onClick={() => remove(idx)} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><X size={13} color={c.danger} /></button>
              </div>
              <div className="flex" style={{ gap: SP.sm, marginTop: SP.sm }}>
                <button onClick={() => cycleCoord(idx)} className="press flex-1 flex items-center justify-center" style={{ gap: 4, padding: "6px 8px", borderRadius: RAD.sm, background: cm.soft }}>
                  <cm.icon size={12} color={cm.color} /><span style={{ fontSize: 11, fontWeight: FW.bold, color: cm.color }}>{cm.label}</span>
                </button>
                <button onClick={() => cycleKey(idx)} className="press flex-1 flex items-center justify-center" style={{ gap: 4, padding: "6px 8px", borderRadius: RAD.sm, background: c.surface2 }}>
                  <Key size={12} color={c.muted} /><span style={{ fontSize: 11, fontWeight: FW.bold, color: c.ink }}>{KEY_LABEL[it.keyStatus]}</span>
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <EmptyLine c={c} text="فایلی برای این تور نمانده" />}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: SP.lg, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
          <p style={{ fontSize: FS.body, fontWeight: FW.heavy, marginBottom: SP.md }}>آماده شروع</p>
          <div className="flex flex-col" style={{ gap: SP.xs + 2 }}>
            <div className="flex items-center justify-between"><span style={{ fontSize: FS.caption, color: c.muted }}>مشتری</span><span style={{ fontSize: FS.caption, fontWeight: FW.bold }}>{b.customerName}</span></div>
            <div className="flex items-center justify-between"><span style={{ fontSize: FS.caption, color: c.muted }}>تعداد فایل</span><span style={{ fontSize: FS.caption, fontWeight: FW.bold }}>{faDigits(items.length)}</span></div>
            <div className="flex items-center justify-between"><span style={{ fontSize: FS.caption, color: c.muted }}>هماهنگ‌شده</span><span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.success }}>{faDigits(confirmedCount)}</span></div>
            {pendingCount > 0 && <div className="flex items-center justify-between"><span style={{ fontSize: FS.caption, color: c.muted }}>منتظر تأیید</span><span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.attn }}>{faDigits(pendingCount)}</span></div>}
            {needsKeyCount > 0 && <div className="flex items-center justify-between"><span style={{ fontSize: FS.caption, color: c.muted }}>نیازمند کلید</span><span style={{ fontSize: FS.caption, fontWeight: FW.bold }}>{faDigits(needsKeyCount)}</span></div>}
          </div>
          {notConfirmed.length > 0 && (
            <div className="flex items-start" style={{ gap: SP.xs, marginTop: SP.md, padding: SP.sm, borderRadius: RAD.sm, background: c.attnSoft }}>
              <AlertTriangle size={13} color={c.attn} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: FS.caption, color: c.ink, lineHeight: 1.7 }}>{notConfirmed.length === items.length ? "هنوز هیچ فایلی تأیید نشده" : `${faDigits(notConfirmed.length)} فایل هنوز تأیید نشده`} — می‌تونی همینطوری هم شروع کنی</p>
            </div>
          )}
        </div>
      )}

      <button onClick={onStart} disabled={items.length === 0} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.lg, paddingBlock: SP.md, borderRadius: RAD.lg, background: items.length ? "linear-gradient(135deg,#2f7cf6,#7c6ff5)" : c.surface2, color: items.length ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.body + 1, boxShadow: items.length ? "0 12px 28px -10px rgba(47,124,246,0.5)" : "none" }}>
        <Car size={17} color={items.length ? "#fff" : c.muted} /> شروع تور
      </button>
    </div>
  );
}

// Routes an open tour to the right full-screen: still visiting → Focus Mode,
// all files seen → the completion/rating summary.
function TourSession({ ctx, tourId }) {
  const tour = ctx.tours.find((t) => t.id === tourId);
  if (!tour) return null;
  if (tour.status === "reviewing" || tour.status === "completed") return <TourCompleteScreen ctx={ctx} tour={tour} />;
  return <TourFocusMode ctx={ctx} tour={tour} />;
}

// One property per screen, nothing else. This is the screen the consultant
// actually looks at while standing in a doorway with the customer beside them.
function TourFocusMode({ ctx, tour }) {
  const { c, properties, owners, setTours } = ctx;
  const [index, setIndex] = useState(() => { const idx = tour.items.findIndex((it) => !it.visited); return idx < 0 ? 0 : idx; });
  const i = index;
  const item = tour.items[i];
  const [note, setNote] = useState(item?.notes || "");
  const [showNote, setShowNote] = useState(false);
  const [showReasons, setShowReasons] = useState(item?.customerRating === "dislike");

  useEffect(() => { setNote(item?.notes || ""); setShowNote(false); setShowReasons(item?.customerRating === "dislike"); }, [i]); // eslint-disable-line

  if (!item) return null;
  const p = properties.find((x) => x.id === item.propertyId);
  if (!p) return null;
  const owner = owners.find((o) => o.id === p.ownerId);
  const cover = p.media && p.media[0];
  const cm = coordMeta(c)[item.coordinationStatus];
  const rm = ratingMeta(c);

  const updateItem = (patchObj) => setTours((prev) => prev.map((t) => t.id !== tour.id ? t : { ...t, items: t.items.map((it) => it.id === item.id ? { ...it, ...patchObj } : it) }));
  const setRating = (key) => { updateItem({ customerRating: key }); setShowReasons(key === "dislike"); };
  const toggleReason = (r) => { const has = (item.customerReasons || []).includes(r); updateItem({ customerReasons: has ? item.customerReasons.filter((x) => x !== r) : [...(item.customerReasons || []), r] }); };
  const saveNote = () => { updateItem({ notes: note }); setShowNote(false); };

  const goNext = () => {
    updateItem({ visited: true, visitedAt: new Date().toISOString(), notes: note });
    const nextIdx = i + 1;
    if (nextIdx >= tour.items.length) setTours((prev) => prev.map((t) => t.id === tour.id ? { ...t, status: "reviewing" } : t));
    else setIndex(nextIdx);
  };
  const goPrev = () => { if (i > 0) setIndex(i - 1); };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] flex flex-col flora-focus-in" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
          <button onClick={() => ctx.setOpenTourId(null)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <div className="flex-1 flex" style={{ gap: SP.xs }}>
            {tour.items.map((it, idx) => <div key={it.id} style={{ flex: 1, height: 4, borderRadius: RAD.pill, background: it.visited ? c.purple : idx === i ? c.purpleSoft : c.surface2, border: idx === i ? `1px solid ${c.purple}` : "none" }} />)}
          </div>
          <span style={{ fontSize: FS.caption, color: c.muted, flexShrink: 0 }}>{faDigits(i + 1)}/{faDigits(tour.items.length)}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="rounded-2xl overflow-hidden mb-3" style={{ height: 180, background: cover ? c.primarySoft : `linear-gradient(140deg, ${c.primarySoft}, ${c.purpleSoft})` }}>
            {cover ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center">{React.createElement(typeIcon(p.type), { size: 44, color: c.primary })}</div>}
          </div>

          <h1 style={{ fontSize: FS.title, fontWeight: FW.heavy, lineHeight: 1.4 }}>{p.title}</h1>
          <div className="flex items-center" style={{ gap: SP.xs, marginTop: SP.xs, color: c.muted, fontSize: FS.caption }}><MapPin size={12} />{p.address || "بدون آدرس"}</div>
          <p style={{ fontSize: FS.title, fontWeight: FW.heavy, color: c.primary, marginTop: SP.md }}>{fmtToman(p.price)}</p>

          <div className="flex" style={{ gap: SP.sm, marginTop: SP.md, flexWrap: "wrap" }}>
            <span className="flex items-center rounded-full" style={{ gap: 4, padding: "5px 10px", background: c.surface2, fontSize: 11, fontWeight: FW.bold }}><Ruler size={11} color={c.muted} />{faDigits(p.area)} متر</span>
            {p.rooms > 0 && <span className="flex items-center rounded-full" style={{ gap: 4, padding: "5px 10px", background: c.surface2, fontSize: 11, fontWeight: FW.bold }}><Home size={11} color={c.muted} />{faDigits(p.rooms)} خواب</span>}
            <span className="flex items-center rounded-full" style={{ gap: 4, padding: "5px 10px", background: cm.soft, fontSize: 11, fontWeight: FW.bold, color: cm.color }}><cm.icon size={11} color={cm.color} />{cm.label}</span>
            {item.keyStatus !== "none" && <span className="flex items-center rounded-full" style={{ gap: 4, padding: "5px 10px", background: c.attnSoft, fontSize: 11, fontWeight: FW.bold, color: c.attn }}><Key size={11} color={c.attn} />{KEY_LABEL[item.keyStatus]}</span>}
          </div>

          <div className="flex" style={{ gap: SP.sm, marginTop: SP.lg }}>
            <a href={mapsLink(p)} target="_blank" rel="noreferrer" className="press flex-1 flex items-center justify-center" style={{ gap: 6, paddingBlock: SP.sm + 2, borderRadius: RAD.md, background: c.surface2 }}>
              <NavigationIcon size={14} color={c.primary} /><span style={{ fontSize: FS.caption, fontWeight: FW.bold }}>مسیریابی</span>
            </a>
            {owner?.phone && (
              <a href={`tel:${owner.phone}`} className="press flex-1 flex items-center justify-center" style={{ gap: 6, paddingBlock: SP.sm + 2, borderRadius: RAD.md, background: c.successSoft }}>
                <PhoneCall size={14} color={c.success} /><span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.success }}>تماس مالک</span>
              </a>
            )}
          </div>

          <div style={{ marginTop: SP.xl }}>
            <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>نظر مشتری؟</p>
            <div className="flex" style={{ gap: SP.sm }}>
              {RATING_ORDER.map((key) => { const r = rm[key]; const active = item.customerRating === key; return (
                <button key={key} onClick={() => setRating(key)} className="press flex-1 flex flex-col items-center" style={{ gap: 4, paddingBlock: SP.md, borderRadius: RAD.md, background: active ? r.soft : c.surface2, border: active ? `1.5px solid ${r.color}` : "1.5px solid transparent" }}>
                  <r.icon size={20} color={active ? r.color : c.muted} />
                  <span style={{ fontSize: 10, fontWeight: FW.bold, color: active ? r.color : c.muted }}>{r.label}</span>
                </button>
              ); })}
            </div>

            {showReasons && (
              <div className="flex flex-wrap" style={{ gap: 6, marginTop: SP.md }}>
                {DISLIKE_REASONS.map((r) => { const on = (item.customerReasons || []).includes(r); return (
                  <button key={r} onClick={() => toggleReason(r)} className="press rounded-full" style={{ padding: "5px 12px", background: on ? c.dangerSoft : c.surface2, color: on ? c.danger : c.muted, fontSize: 11, fontWeight: FW.bold }}>{r}</button>
                ); })}
              </div>
            )}

            {!showNote ? (
              <button onClick={() => setShowNote(true)} className="press flex items-center" style={{ gap: 4, marginTop: SP.md }}>
                <StickyNote size={12} color={c.muted} /><span style={{ fontSize: FS.caption, color: c.muted }}>{note ? "ویرایش یادداشت" : "افزودن یادداشت"}</span>
              </button>
            ) : (
              <div style={{ marginTop: SP.md }}>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: قیمت را بالا دانست" style={{ ...inputStyle(c), minHeight: 60, resize: "none", lineHeight: 1.8 }} />
                <button onClick={saveNote} className="press" style={{ marginTop: SP.xs, fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>ذخیره یادداشت</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0" style={{ gap: SP.sm, padding: SP.lg, paddingBottom: `calc(${SP.lg}px + env(safe-area-inset-bottom, 0px))` }}>
          {i > 0 && <button onClick={goPrev} className="press flex items-center justify-center shrink-0" style={{ width: 48, borderRadius: RAD.lg, background: c.surface2 }}><ChevronRight size={18} color={c.ink} /></button>}
          <button onClick={goNext} className="press flex-1 flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.lg, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, boxShadow: "0 12px 28px -10px rgba(47,124,246,0.5)" }}>
            {i + 1 < tour.items.length ? "ملک بعدی" : "پایان تور"}<ChevronLeft size={16} color="#fff" />
          </button>
        </div>
      </div>
    </BodyPortal>
  );
}

// After the last property: rate the tour, pick the customer's top file(s), and
// log everything into the customer's and each property's timeline in one tap —
// the consultant never re-types anything they already entered mid-tour.
function TourCompleteScreen({ ctx, tour }) {
  const { c, properties, setTours, setAppointments, setCalls, notify, celebrate } = ctx;
  const [topPicks, setTopPicks] = useState(tour.topPicks || []);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(tour.notes || "");
  const rm = ratingMeta(c);
  const visited = tour.items.filter((it) => it.visited);
  const tally = RATING_ORDER.reduce((acc, k) => ({ ...acc, [k]: visited.filter((it) => it.customerRating === k).length }), {});

  const togglePick = (id) => setTopPicks((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]);

  const quickAction = (kind) => {
    if (kind === "note") { setNoteOpen(true); return; }
    const NOTES = { followup: "پیگیری بعد از تور بازدید", second: "هماهنگی بازدید دوم", negotiate: "مذاکره قیمت بعد از تور" };
    setCalls((prev) => [{ id: uid(), customerId: tour.customerId, customerName: tour.customerName, customerPhone: tour.customerPhone, date: todayISO(), status: "در انتظار پاسخ", notes: NOTES[kind] }, ...prev]);
    notify("یادآوری پیگیری ثبت شد");
  };

  const finish = () => {
    const time = new Date().toTimeString().slice(0, 5);
    const newAppts = visited.map((it) => ({ id: uid(), propertyId: it.propertyId, customerId: tour.customerId, customerName: tour.customerName, date: todayISO(), time, notes: it.notes || "", tourId: tour.id, rating: it.customerRating || null, reasons: it.customerReasons || [] }));
    setAppointments((prev) => [...newAppts, ...prev]);
    setTours((prev) => prev.map((t) => t.id === tour.id ? { ...t, status: "completed", completedAt: new Date().toISOString(), topPicks, notes: note } : t));
    celebrate({ kind: "tour", label: "تور بازدید ثبت شد" });
    ctx.setOpenTourId(null);
  };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] flex flex-col flora-focus-in" style={{ background: c.bg }}>
        <div className="flex-1 overflow-y-auto px-4" style={{ paddingTop: `calc(${SP.xl}px + env(safe-area-inset-top, 0px))`, paddingBottom: SP.xl }}>
          <div className="flex flex-col items-center" style={{ marginBottom: SP.xl }}>
            <div className="flex items-center justify-center flora-bounce" style={{ width: 64, height: 64, borderRadius: "50%", background: c.successSoft, marginBottom: SP.md }}><CheckCircle2 size={30} color={c.success} /></div>
            <p style={{ fontSize: FS.title, fontWeight: FW.heavy }}>تور تمام شد</p>
            <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{tour.customerName} · {faDigits(visited.length)} ملک بازدید شد</p>
          </div>

          <div className="grid grid-cols-4" style={{ gap: SP.sm, marginBottom: SP.xl }}>
            {RATING_ORDER.map((k) => { const r = rm[k]; return (
              <div key={k} className="flex flex-col items-center" style={{ padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
                <r.icon size={17} color={r.color} />
                <span style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginTop: 4 }}>{faDigits(tally[k])}</span>
              </div>
            ); })}
          </div>

          <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>کدام فایل بیشتر مورد پسند مشتری بود؟ (تا ۳ ملک)</p>
          <div className="flex flex-col" style={{ gap: SP.sm, marginBottom: SP.xl }}>
            {visited.map((it) => {
              const p = properties.find((x) => x.id === it.propertyId); if (!p) return null;
              const on = topPicks.includes(it.propertyId); const rank = on ? topPicks.indexOf(it.propertyId) + 1 : null;
              return (
                <button key={it.id} onClick={() => togglePick(it.propertyId)} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, background: on ? c.attnSoft : c.surface2, border: `1.5px solid ${on ? c.attn : "transparent"}` }}>
                  <div className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: "50%", background: on ? c.attn : c.surface, fontSize: 11, fontWeight: FW.heavy, color: on ? "#fff" : c.muted }}>{on ? faDigits(rank) : ""}</div>
                  <div className="flex-1 min-w-0"><p style={{ fontSize: FS.body, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p></div>
                  {it.customerRating && React.createElement(rm[it.customerRating].icon, { size: 15, color: rm[it.customerRating].color })}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>اقدام بعدی (اختیاری)</p>
          <div className="flex flex-wrap" style={{ gap: SP.sm, marginBottom: SP.xl }}>
            {[["followup", "پیگیری مشتری"], ["second", "هماهنگی بازدید دوم"], ["negotiate", "مذاکره قیمت"], ["note", "ثبت یادداشت"]].map(([k, label]) => (
              <button key={k} onClick={() => quickAction(k)} className="press rounded-full" style={{ padding: "8px 14px", background: c.surface2, fontSize: FS.caption, fontWeight: FW.bold }}>{label}</button>
            ))}
          </div>
          {noteOpen && <div style={{ marginBottom: SP.xl }}><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت کلی تور..." style={{ ...inputStyle(c), minHeight: 70, resize: "none", lineHeight: 1.8 }} /></div>}
        </div>

        <div className="shrink-0" style={{ padding: SP.lg, paddingBottom: `calc(${SP.lg}px + env(safe-area-inset-bottom, 0px))` }}>
          <button onClick={finish} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.lg, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, boxShadow: "0 12px 28px -10px rgba(47,124,246,0.5)" }}>
            <Check size={17} color="#fff" /> پایان و ثبت در پرونده‌ها
          </button>
        </div>
      </div>
    </BodyPortal>
  );
}

// Two compact, equal-weight tiles — quick one-tap tools paired side by side.

export { TourEntryCard, TourWizard, TourStepCustomer, TourStepProperties, TourStepReview, TourSession, TourFocusMode, TourCompleteScreen };
