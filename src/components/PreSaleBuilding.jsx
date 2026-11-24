// Immersive pre-sale building screen: real WebGL model (PreSale3D, lazy), floating summary,
// vertical floor selector, floor bottom sheet, unit actions, customer mode.
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, Pencil, Eye, EyeOff, Layers, Plus, X, Loader2, Box, Crosshair, Maximize2, Minimize2, ChevronUp, ChevronDown, Building2, Check, Clock, FileText, ArrowLeftRight, ArrowUpDown, BedDouble, Gem } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { BodyPortal, inputStyle, JalaliDatePicker } from "../lib/ui.jsx";
import { todayISO, humanizeToman } from "../lib/format.js";
import { STATUS, STATUS_KEYS, summarize, orderedUnits, planRows } from "../lib/presale.js";
import { fetchAll } from "../lib/presaleApi.js";

const Viewer3D = React.lazy(() => import("./PreSale3D.jsx"));
const money = (n) => (n > 0 ? `${Math.round(n).toLocaleString("en-US")} تومان` : "—");
const sc = (k) => STATUS[k]?.color || "#999";
const DK = { bg: "#101522", bg2: "#171E30", ivory: "#F4F0E9", ink: "#F8F8FA", muted: "#9299AA", border: "rgba(255,255,255,.12)", surface2: "rgba(255,255,255,.08)", glass: "rgba(23,30,48,.62)" };
const glassDark = { background: DK.glass, backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)", border: `1px solid ${DK.border}`, borderRadius: 24 };

// ---------- 2D fallback / alt view ----------
function Stack2D({ c, floors, byFloor, selId, onFloor, onUnit, dim }) {
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      {[...floors].reverse().map((f) => (
        <div key={f.id} onClick={() => onFloor(f.id)} className="press" style={{ display: "flex", alignItems: "center", gap: 8, direction: "rtl", opacity: selId && selId !== f.id ? 0.55 : 1 }}>
          <span style={{ width: 22, fontSize: 11, fontWeight: 800, color: c.muted, textAlign: "center" }}>{f.floor_number}</span>
          <div style={{ flex: 1, display: "flex", gap: 3, height: 28 }}>
            {orderedUnits(byFloor[f.id] || []).map((u) => (
              <div key={u.id} onClick={(e) => { if (selId === f.id) { e.stopPropagation(); onUnit(u.id); } }} style={{ flex: `${u.area} 1 0`, background: sc(u.status), opacity: dim(u) ? 1 : 0.25, borderRadius: 5, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", outline: selId === f.id ? "2px solid " + c.ink : "none" }}>{u.unit_number}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- schematic floor plan ----------
function FloorPlan({ c, units, onPick, dim }) {
  const rows = planRows(units);
  const maxA = Math.max(1, ...units.map((u) => +u.area));
  const block = (u) => (
    <button key={u.id} onClick={() => onPick(u.id)} className="press" style={{ flex: `${u.area} 1 0`, minWidth: 0, height: 74 + (u.area / maxA) * 22, borderRadius: 12, border: `2px solid ${sc(u.status)}`, background: `${sc(u.status)}26`, opacity: dim(u) ? 1 : 0.3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: c.ink }}>
      <span style={{ fontSize: 15, fontWeight: 900 }}>{u.unit_number}</span>
      <span style={{ fontSize: 11, color: c.muted }}>{u.area} متر</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: sc(u.status) }}>{STATUS[u.status].label}</span>
    </button>
  );
  const core = <div style={{ height: 30, borderRadius: 8, border: `1.5px dashed ${c.border}`, color: c.muted, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>راه‌پله و آسانسور</div>;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, direction: "rtl" }}>
        <div style={{ display: "flex", gap: 8 }}>{rows[0].map(block)}</div>
        {core}
        {rows[1].length > 0 && <div style={{ display: "flex", gap: 8 }}>{rows[1].map(block)}</div>}
      </div>
      <p style={{ fontSize: 10.5, color: c.muted, textAlign: "center", marginTop: 8 }}>پلان شماتیک — چیدمان تقریبی</p>
    </div>
  );
}

// ---------- unit bottom sheet ----------
function UnitSheet({ c, unit, floor, byFloor, customer, showPrices, onClose, onPatch, onStatus, onMove }) {
  const [d, setD] = useState(() => ({ unit_number: unit.unit_number, area: String(unit.area), bedrooms: unit.bedrooms ?? "", price: unit.price ?? "", buyer_name: unit.buyer_name || "", sale_date: unit.sale_date || "", payment_terms: unit.payment_terms || "", notes: unit.notes || "" }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const ppsqm = +d.price > 0 && +d.area > 0 ? Math.round(+d.price / +d.area) : null;
  const lab = { fontSize: 11, color: c.muted, marginBottom: 4, display: "block" };
  const row = (k, v) => <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}`, fontSize: 13 }}><span style={{ color: c.muted }}>{k}</span><b>{v}</b></div>;
  const save = async () => {
    setErr("");
    const area = +d.area;
    if (!(area > 0)) return setErr("متراژ معتبر نیست");
    const num = String(d.unit_number).trim();
    if (!num) return setErr("شماره واحد را وارد کنید");
    const dup = Object.values(byFloor).flat().some((x) => x.id !== unit.id && x.unit_number === num);
    if (dup) return setErr("این شماره واحد قبلاً استفاده شده");
    setBusy(true);
    const ok = await onPatch(unit.id, { unit_number: num, area, bedrooms: d.bedrooms === "" ? null : +d.bedrooms, price: +d.price > 0 ? +d.price : null, price_per_sqm: ppsqm, buyer_name: d.buyer_name.trim() || null, sale_date: d.sale_date || null, payment_terms: d.payment_terms.trim() || null, notes: d.notes.trim() || null });
    setBusy(false);
    if (ok) onClose(); else setErr("ذخیره نشد. اتصال را بررسی کنید.");
  };
  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[260]" style={{ background: "rgba(0,0,0,.45)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="flora-up" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88vh", overflowY: "auto", background: c.bg, borderRadius: "24px 24px 0 0", padding: 20, paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", maxWidth: 430, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 900 }}>واحد {unit.unit_number}</p>
              <p style={{ fontSize: 12, color: c.muted }}>طبقه {floor?.floor_number} · {unit.area} متر</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: sc(unit.status), padding: "5px 12px", borderRadius: 99 }}>{STATUS[unit.status].label}</span>
            <button onClick={onClose} className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={15} color={c.ink} /></button>
          </div>
          {customer ? (
            <div>
              {row("طبقه", floor?.floor_number)}{row("متراژ", `${unit.area} متر`)}
              {unit.bedrooms != null && row("خواب", unit.bedrooms)}
              {showPrices && unit.price > 0 && <>{row("قیمت کل", money(unit.price))}{row("قیمت هر متر", money(unit.price_per_sqm))}</>}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {STATUS_KEYS.map((k) => (
                  <button key={k} onClick={() => onStatus(unit, k)} className="press" style={{ flex: 1, height: 46, borderRadius: 14, fontSize: 13, fontWeight: 800, border: `2px solid ${sc(k)}`, background: unit.status === k ? sc(k) : "transparent", color: unit.status === k ? "#fff" : sc(k) }}>{STATUS[k].label}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label><span style={lab}>شماره واحد</span><input style={inputStyle(c)} value={d.unit_number} onChange={(e) => set("unit_number", e.target.value)} /></label>
                <label><span style={lab}>متراژ</span><input style={inputStyle(c)} inputMode="decimal" value={d.area} onChange={(e) => set("area", e.target.value.replace(/[^\d.]/g, ""))} /></label>
                <label><span style={lab}>تعداد خواب</span><input style={inputStyle(c)} inputMode="numeric" value={d.bedrooms} onChange={(e) => set("bedrooms", e.target.value.replace(/\D/g, ""))} /></label>
                <label><span style={lab}>قیمت کل (تومان)</span><input style={inputStyle(c)} inputMode="numeric" value={d.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} /></label>
              </div>
              {ppsqm && <p style={{ fontSize: 11, color: c.muted, margin: "6px 2px" }}>قیمت هر متر: {money(ppsqm)}{+d.price > 0 ? ` · ${humanizeToman(d.price)}` : ""}</p>}
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <label><span style={lab}>نام خریدار (خصوصی)</span><input style={inputStyle(c)} value={d.buyer_name} onChange={(e) => set("buyer_name", e.target.value)} /></label>
                <div><span style={lab}>تاریخ فروش</span>
                  {d.sale_date ? <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><div style={{ flex: 1 }}><JalaliDatePicker c={c} value={d.sale_date} onChange={(v) => set("sale_date", v)} /></div><button onClick={() => set("sale_date", "")} className="press w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.muted} /></button></div>
                    : <button onClick={() => set("sale_date", todayISO())} className="press" style={{ ...inputStyle(c), textAlign: "right", color: c.muted }}>ثبت تاریخ امروز</button>}
                </div>
                <label><span style={lab}>شرایط پرداخت</span><textarea rows={2} style={{ ...inputStyle(c), resize: "none" }} value={d.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} /></label>
                <label><span style={lab}>یادداشت</span><textarea rows={2} style={{ ...inputStyle(c), resize: "none" }} value={d.notes} onChange={(e) => set("notes", e.target.value)} /></label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => onMove(unit, -1)} className="press" style={{ flex: 1, height: 40, borderRadius: 12, background: c.surface2, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><ArrowLeftRight size={13} /> جابه‌جایی در پلان</button>
                <button onClick={() => onMove(unit, 0)} className="press" style={{ flex: 1, height: 40, borderRadius: 12, background: c.surface2, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><ArrowUpDown size={13} /> ردیف بالا/پایین</button>
              </div>
              {err && <p role="alert" style={{ color: "#B42318", fontSize: 12, marginTop: 8 }}>{err}</p>}
              <button onClick={save} disabled={busy} className="press" style={{ width: "100%", height: 52, marginTop: 14, borderRadius: 14, background: c.gradientPrimary, color: "#fff", fontWeight: 800, fontSize: 14, opacity: busy ? 0.7 : 1 }}>{busy ? "در حال ذخیره…" : "ذخیره اطلاعات واحد"}</button>
            </>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

// ---------- main building screen ----------
export function PreSaleBuilding({ ctx, projectId, onBack, onEdit, onClose }) {
  const { c, notify } = ctx;
  const [project, setProject] = useState(null);
  const [floors, setFloors] = useState([]);
  const [units, setUnits] = useState([]);
  const [state, setState] = useState("loading");
  const [selId, setSelId] = useState(null);
  const [unitId, setUnitId] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [exploded, setExploded] = useState(false);
  const [mode, setMode] = useState("3d"); // 3d | plan
  const [noGL, setNoGL] = useState(false);
  const [customer, setCustomer] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [focus, setFocus] = useState(false);
  const [sheet, setSheet] = useState("peek"); // peek | full
  const [drag, setDrag] = useState(0);
  const [viewCmd, setViewCmd] = useState(null);
  const [backSide, setBackSide] = useState(false);
  const selRef = useRef(null);
  const dragRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [p, f, u] = await Promise.all([
        supabase.from("presale_projects").select("*").eq("id", projectId).single(),
        supabase.from("presale_floors").select("*").eq("project_id", projectId).order("floor_order"),
        fetchAll("presale_units", "*", (q) => q.eq("project_id", projectId)),
      ]);
      if (p.error) throw p.error; if (f.error) throw f.error;
      setProject(p.data); setFloors(f.data || []); setUnits(u); setState("ok");
    } catch (e) { console.warn("presale load", e); setState("error"); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const byFloor = useMemo(() => { const m = {}; floors.forEach((f) => { m[f.id] = []; }); units.forEach((u) => { (m[u.floor_id] ||= []).push(u); }); return m; }, [floors, units]);
  const sum = useMemo(() => summarize(units), [units]);
  const dim = useCallback(() => true, []);

  const patchUnit = async (id, patch) => {
    const prev = units.find((u) => u.id === id);
    if (!prev) return false;
    const old = {}; Object.keys(patch).forEach((k) => { old[k] = prev[k]; });
    setUnits((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    const { error } = await supabase.from("presale_units").update(patch).eq("id", id);
    if (error) { setUnits((l) => l.map((u) => (u.id === id ? { ...u, ...old } : u))); notify?.("ذخیره نشد: " + error.message); return false; }
    return true;
  };
  const setStatus = (u, status) => {
    if (u.status === status) return;
    const patch = { status };
    if (status === "sold" && !u.sale_date) patch.sale_date = todayISO();
    patchUnit(u.id, patch);
  };
  const moveUnit = (u, kind) => {
    const list = orderedUnits(byFloor[u.floor_id] || []);
    if (kind === 0) {
      const cur = u.position_configuration?.row ?? (list.length >= 4 && list.indexOf(u) >= Math.ceil(list.length / 2) ? 1 : 0);
      list.forEach((x, i) => { if (x.id !== u.id && x.position_configuration?.row == null) patchUnit(x.id, { position_configuration: { ...x.position_configuration, order: i, row: list.length >= 4 && i >= Math.ceil(list.length / 2) ? 1 : 0 } }); });
      patchUnit(u.id, { position_configuration: { ...u.position_configuration, order: list.indexOf(u), row: cur === 0 ? 1 : 0 } });
      return;
    }
    const i = list.indexOf(u), j = i + (kind < 0 ? -1 : 1), k = j < 0 ? list.length - 1 : j >= list.length ? 0 : j;
    if (list.length < 2 || k === i) return;
    const other = list[k];
    patchUnit(u.id, { position_configuration: { ...u.position_configuration, order: k } });
    patchUnit(other.id, { position_configuration: { ...other.position_configuration, order: i } });
  };

  const pickFloor = (id) => { setSelId((cur) => (cur === id ? null : id)); setUnitId(null); setSheet("peek"); };
  const pickUnit = (id) => { const u = units.find((x) => x.id === id); if (!u) return; setSelId(u.floor_id); setUnitId(id); setSheet("full"); };
  const cmd = (name) => setViewCmd({ name, n: Date.now() });
  const closeSheet = () => { setSelId(null); setUnitId(null); };

  const selFloor = floors.find((f) => f.id === selId) || null;
  const selUnits = selFloor ? orderedUnits(byFloor[selFloor.id] || []) : [];
  const fs = selFloor ? summarize(selUnits) : null;
  const unit = units.find((u) => u.id === unitId) || null;
  const detailUnit = units.find((u) => u.id === detailsId) || null;
  const cfg = useMemo(() => ({ depth: +project?.settings?.depth || 0, height: +project?.settings?.floor_height || 0, width: +project?.settings?.width || 0 }), [project]);
  const sheetOpen = !!selFloor && !focus;
  const insets = useMemo(() => ({ top: focus ? 70 : 215, bottom: focus ? 40 : sheetOpen ? (sheet === "full" && unit ? 470 : 250) : 90 }), [focus, sheetOpen, sheet, unit]);

  // floor selector scroll
  useEffect(() => { selRef.current?.querySelector("[data-sel='1']")?.scrollIntoView({ block: "nearest" }); }, [selId]);

  if (state !== "ok") return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: DK.bg, direction: "rtl", color: DK.ink, gap: 12 }}>
        {state === "loading" ? <Loader2 className="animate-spin" color={DK.muted} /> : <><p style={{ color: DK.muted, fontSize: 13 }}>بارگذاری پروژه ممکن نشد.</p><button onClick={() => { setState("loading"); load(); }} className="press" style={{ padding: "10px 20px", borderRadius: 12, background: DK.surface2 }}>تلاش دوباره</button></>}
        <button onClick={onBack} className="press" style={{ color: DK.muted, fontSize: 12 }}>بازگشت</button>
      </div>
    </BodyPortal>
  );

  const glassBtn = { ...glassDark, width: 48, height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: DK.ink, flexShrink: 0 };
  const dkC = { ...c, ink: DK.ink, muted: DK.muted, border: DK.border, surface2: DK.surface2, bg: DK.bg };
  const use3d = mode === "3d" && !noGL;
  const floorsDesc = [...floors].reverse();
  const ud = (u) => ({ price: u.price, pps: u.price_per_sqm || (u.price > 0 && u.area > 0 ? Math.round(u.price / u.area) : null) });

  // sheet swipe
  const onSheetDown = (e) => { dragRef.current = { y: e.clientY }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onSheetMove = (e) => { if (dragRef.current) setDrag(e.clientY - dragRef.current.y); };
  const onSheetUp = () => {
    const d = drag; dragRef.current = null; setDrag(0);
    if (d > 70) { if (sheet === "full") setSheet("peek"); else closeSheet(); } else if (d < -50) setSheet("full");
  };

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[200] overflow-hidden" style={{ background: DK.bg, direction: "rtl", color: DK.ink }}>
        {/* scene */}
        {use3d ? (
          <React.Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin" color={DK.muted} /></div>}>
            <Viewer3D floors={floors} byFloor={byFloor} cfg={cfg} wall={project.settings?.wall} frontImg={project.facade_front_image} backImg={project.facade_back_image}
              selId={selId} unitId={unitId} exploded={exploded} units={units} filtering={false} hi={dim} viewCmd={viewCmd} insets={insets} onFloor={pickFloor} onUnit={pickUnit} onFail={() => setNoGL(true)} />
          </React.Suspense>
        ) : (
          <div className="absolute inset-0 overflow-y-auto" style={{ paddingTop: 215, paddingBottom: sheetOpen ? 270 : 100 }}>
            {noGL && mode === "3d" && <p style={{ fontSize: 11, color: DK.muted, textAlign: "center", marginBottom: 8 }}>نمایش سه‌بعدی در این دستگاه پشتیبانی نمی‌شود؛ نمای ۲بعدی فعال است.</p>}
            <Stack2D c={dkC} floors={floors} byFloor={byFloor} selId={selId} onFloor={pickFloor} onUnit={pickUnit} dim={dim} />
            {selFloor && <div style={{ margin: "12px 16px", padding: 14, borderRadius: 22, background: DK.ivory, color: "#1b2233" }}><FloorPlan c={{ ...c, ink: "#1b2233", muted: "#6b7385", border: "#d8d2c6" }} units={selUnits} onPick={pickUnit} dim={dim} /></div>}
          </div>
        )}

        {/* header + summary */}
        {!focus && (
          <div className="absolute left-0 right-0" style={{ top: 0, padding: "calc(10px + env(safe-area-inset-top, 0px)) 14px 0", pointerEvents: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, direction: "ltr", pointerEvents: "auto" }}>
              <button onClick={customer ? () => setCustomer(false) : onBack} className="press" style={glassBtn} aria-label="بازگشت">{customer ? <X size={18} /> : <ChevronLeft size={20} />}</button>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: "right", direction: "rtl", minWidth: 0 }}>
                <p className="truncate" style={{ fontSize: 18, fontWeight: 900, textShadow: "0 1px 8px rgba(0,0,0,.5)" }}>{project.name}</p>
                <p style={{ fontSize: 11, color: DK.muted }}>{customer ? "نمای مشتری" : "پروژه پیش‌فروش"}</p>
              </div>
              <button onClick={() => { setCustomer((v) => !v); setDetailsId(null); }} className="press" style={{ ...glassBtn, background: customer ? DK.ivory : DK.glass, color: customer ? "#1b2233" : DK.ink }} aria-label="نمای مشتری">{customer ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              {!customer && <button onClick={() => onEdit(project.id)} className="press" style={glassBtn} aria-label="ویرایش پروژه"><Pencil size={16} /></button>}
            </div>
            <div style={{ ...glassDark, marginTop: 10, padding: "12px 10px 10px", pointerEvents: "auto" }}>
              <div style={{ display: "flex", textAlign: "center" }}>
                {[["کل واحدها", sum.total, DK.ink], ["موجود", sum.available, sc("available")], ["رزرو", sum.reserved, sc("reserved")], ["فروخته", sum.sold, sc("sold")]].map(([k, v, col], i) => (
                  <div key={k} style={{ flex: 1, borderInlineStart: i ? `1px solid ${DK.border}` : "none" }}><p style={{ fontSize: 20, fontWeight: 900, color: col, lineHeight: 1.2 }}>{v}</p><p style={{ fontSize: 10.5, color: DK.muted }}>{k}</p></div>
                ))}
              </div>
              <div style={{ height: 4, borderRadius: 9, background: "rgba(255,255,255,.1)", margin: "9px 4px 6px", display: "flex", overflow: "hidden" }}>
                <div style={{ width: `${sum.total ? (sum.sold / sum.total) * 100 : 0}%`, background: sc("sold") }} /><div style={{ width: `${sum.total ? (sum.reserved / sum.total) * 100 : 0}%`, background: sc("reserved") }} />
              </div>
              {!customer && sum.hasPrices
                ? <p style={{ fontSize: 10.5, color: DK.muted, textAlign: "center" }}>پیشرفت {sum.pct}٪ · فروش رفته <b style={{ color: DK.ink }}>{humanizeToman(sum.soldValue)}</b> · موجودی <b style={{ color: DK.ink }}>{humanizeToman(sum.remainingValue)}</b></p>
                : <p style={{ fontSize: 10.5, color: DK.muted, textAlign: "center" }}>پیشرفت فروش {sum.pct}٪{customer ? "" : ""}</p>}
              {customer && <label style={{ fontSize: 11, color: DK.muted, display: "flex", gap: 6, marginTop: 6, justifyContent: "center", alignItems: "center" }}><input type="checkbox" checked={showPrices} onChange={(e) => setShowPrices(e.target.checked)} />نمایش قیمت واحدها</label>}
            </div>
            <div style={{ display: "inline-flex", marginTop: 10, padding: 3, borderRadius: 99, ...{ background: DK.glass, border: `1px solid ${DK.border}`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }, direction: "rtl", pointerEvents: "auto", float: "right" }}>
              {[["3d", "نمای سه‌بعدی"], ["plan", "پلان طبقات"]].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className="press" style={{ padding: "8px 16px", borderRadius: 99, fontSize: 12.5, fontWeight: 800, background: mode === k ? DK.ivory : "transparent", color: mode === k ? "#1b2233" : DK.ink }}>{l}</button>)}
            </div>
          </div>
        )}

        {/* vertical floor selector (right) */}
        {!focus && (
          <div style={{ position: "absolute", right: 12, top: 262, bottom: insets.bottom + 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, maxHeight: 520, justifyContent: "center" }}>
            {floors.length > 6 && <button onClick={() => selRef.current?.scrollBy({ top: -140, behavior: "smooth" })} className="press" style={{ ...glassBtn, width: 52, height: 40, borderRadius: 14 }} aria-label="طبقات بالاتر"><ChevronUp size={18} /></button>}
            <div ref={selRef} style={{ overflowY: "auto", scrollbarWidth: "none", display: "flex", flexDirection: "column", gap: 6, maxHeight: "100%" }}>
              {floorsDesc.map((f) => {
                const on = f.id === selId, n = (byFloor[f.id] || []).length;
                return (
                  <div key={f.id} data-sel={on ? "1" : "0"} style={{ position: "relative" }}>
                    {on && <div style={{ position: "absolute", right: 58, top: 4, whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 14, background: DK.glass, border: "1px solid #F3C26B", fontSize: 11.5, fontWeight: 800, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>طبقه {f.floor_number}<br /><span style={{ color: DK.muted, fontWeight: 600 }}>{n} واحد</span></div>}
                    <button onClick={() => pickFloor(f.id)} className="press" style={{ width: 52, height: 52, borderRadius: 16, fontSize: 19, fontWeight: 900, background: on ? "linear-gradient(180deg,#F9D58A,#E9A93C)" : DK.glass, color: on ? "#2a1c05" : DK.ink, border: `1px solid ${on ? "#F3C26B" : DK.border}`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: on ? "0 6px 20px rgba(235,163,59,.45)" : "none" }}>{f.floor_number}</button>
                  </div>
                );
              })}
            </div>
            {floors.length > 6 && <button onClick={() => selRef.current?.scrollBy({ top: 140, behavior: "smooth" })} className="press" style={{ ...glassBtn, width: 52, height: 40, borderRadius: 14 }} aria-label="طبقات پایین‌تر"><ChevronDown size={18} /></button>}
          </div>
        )}

        {/* left controls + explode */}
        {use3d && (
          <div style={{ position: "absolute", left: 12, bottom: insets.bottom + 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => cmd("default")} className="press" style={{ ...glassBtn, flexDirection: "column", fontSize: 10, fontWeight: 900, gap: 1 }} aria-label="نمای سه‌بعدی"><Box size={18} />3D</button>
            <button onClick={() => { const b = !backSide; setBackSide(b); cmd(b ? "back" : "front"); }} className="press" style={{ ...glassBtn, fontSize: 11, fontWeight: 800 }}>{backSide ? "پشت" : "جلو"}</button>
            <button onClick={() => cmd("default")} className="press" style={glassBtn} aria-label="بازنشانی دوربین"><Crosshair size={20} /></button>
            <button onClick={() => setFocus((v) => !v)} className="press" style={glassBtn} aria-label="تمام‌صفحه">{focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          </div>
        )}
        {use3d && (
          <button onClick={() => setExploded((v) => !v)} className="press" style={{ ...glassDark, position: "absolute", right: 12, bottom: insets.bottom + 12, height: 48, padding: "0 16px", borderRadius: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, background: exploded ? DK.ivory : DK.glass, color: exploded ? "#1b2233" : DK.ink }}>نمای تفکیک طبقات<Layers size={18} /></button>
        )}
        {focus && <button onClick={() => setFocus(false)} className="press" style={{ ...glassBtn, position: "absolute", top: "calc(12px + env(safe-area-inset-top, 0px))", left: 12 }} aria-label="خروج از تمام‌صفحه"><X size={18} /></button>}

        {/* floor bottom sheet */}
        {sheetOpen && (
          <div className="flora-up" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "62vh", overflowY: "auto", background: "rgba(244,240,233,.94)", color: "#1b2233", backdropFilter: "blur(22px) saturate(160%)", WebkitBackdropFilter: "blur(22px) saturate(160%)", borderRadius: "30px 30px 0 0", boxShadow: "0 -12px 40px rgba(0,0,0,.35)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))", transform: `translateY(${Math.max(0, drag)}px)`, transition: dragRef.current ? "none" : "transform .25s ease", maxWidth: 520, margin: "0 auto" }}>
            <div onPointerDown={onSheetDown} onPointerMove={onSheetMove} onPointerUp={onSheetUp} onPointerCancel={onSheetUp} style={{ touchAction: "none", padding: "8px 16px 4px", cursor: "grab" }}>
              <div style={{ width: 44, height: 4, borderRadius: 4, background: "rgba(0,0,0,.18)", margin: "0 auto 10px" }} />
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={closeSheet} className="press" style={{ width: 38, height: 38, borderRadius: 99, background: "rgba(0,0,0,.07)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="بستن"><X size={17} /></button>
                <p style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Building2 size={18} />طبقه {selFloor.floor_number}</p>
                <button onClick={() => setSheet((s) => (s === "full" ? "peek" : "full"))} className="press" style={{ width: 38, height: 38, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="باز/بسته">{sheet === "full" ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button>
              </div>
              <p style={{ fontSize: 11, color: "#6b7385", textAlign: "center", margin: "2px 0 8px" }}>{fs.available} موجود · {fs.reserved} رزرو · {fs.sold} فروخته</p>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "4px 16px 12px", overflowX: "auto", direction: "rtl" }}>
              {selUnits.map((u) => {
                const on = u.id === unitId, col = sc(u.status);
                return (
                  <button key={u.id} onClick={() => { setUnitId(u.id); setSheet("full"); }} className="press" style={{ flex: "1 0 104px", minWidth: 104, padding: "12px 8px", borderRadius: 20, background: `${col}22`, border: `${on ? 2.5 : 1.5}px solid ${col}`, textAlign: "center", boxShadow: on ? `0 6px 18px ${col}55` : "none" }}>
                    <p style={{ fontSize: 15, fontWeight: 900 }}>واحد {u.unit_number}</p>
                    <p style={{ fontSize: 12, color: "#4d5568", margin: "3px 0 8px" }}>{u.area} مترمربع</p>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, color: col, background: `${col}26` }}><i style={{ width: 8, height: 8, borderRadius: 9, background: col }} />{STATUS[u.status].label}</span>
                  </button>
                );
              })}
            </div>
            {unit && unit.floor_id === selId && sheet === "full" && (
              <div style={{ padding: "0 16px" }}>
                <div style={{ display: "flex", gap: 12, padding: 10, borderRadius: 22, background: "rgba(255,255,255,.65)", border: "1px solid rgba(0,0,0,.06)", alignItems: "stretch" }}>
                  <div style={{ width: 104, minHeight: 104, borderRadius: 16, background: project.cover_image ? `url(${project.cover_image}) center/cover` : "rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{!project.cover_image && <Building2 size={26} color="#9299AA" />}</div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 17, fontWeight: 900 }}>واحد {unit.unit_number}</p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, color: sc(unit.status), background: `${sc(unit.status)}26` }}><i style={{ width: 8, height: 8, borderRadius: 9, background: sc(unit.status) }} />{STATUS[unit.status].label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#6b7385" }}>{unit.area} مترمربع · طبقه {selFloor.floor_number}{unit.bedrooms != null ? ` · ${unit.bedrooms} خواب` : ""}</p>
                    {(!customer || showPrices) && ud(unit).pps && <p style={{ fontSize: 11.5, color: "#4d5568" }}>قیمت هر متر: {money(ud(unit).pps)}</p>}
                    {(!customer || showPrices) && unit.price > 0 && <p style={{ fontSize: 15, fontWeight: 900 }}>{humanizeToman(unit.price)} تومان</p>}
                    {!customer && unit.status === "sold" && unit.buyer_name && <p style={{ fontSize: 11.5, color: "#6b7385" }}>خریدار: {unit.buyer_name}</p>}
                  </div>
                </div>
                {!customer && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={unit.status === "sold"} onClick={() => setStatus(unit, "sold")} className="press" style={{ flex: 1.2, height: 50, borderRadius: 16, background: "#1b2233", color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: unit.status === "sold" ? 0.4 : 1 }}>ثبت فروش<Check size={16} /></button>
                    <button disabled={unit.status === "reserved"} onClick={() => setStatus(unit, "reserved")} className="press" style={{ flex: 1.1, height: 50, borderRadius: 16, background: "#F8DFAE", color: "#9a5b00", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: unit.status === "reserved" ? 0.4 : 1 }}>رزرو کردن<Clock size={16} /></button>
                    <button onClick={() => setDetailsId(unit.id)} className="press" style={{ flex: 1, height: 50, borderRadius: 16, background: "rgba(0,0,0,.07)", fontWeight: 800, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>جزئیات بیشتر<FileText size={15} /></button>
                  </div>
                )}
                {!customer && unit.status !== "available" && <button onClick={() => setStatus(unit, "available")} className="press" style={{ width: "100%", marginTop: 8, height: 42, borderRadius: 14, background: `${sc("available")}22`, color: sc("available"), fontWeight: 800, fontSize: 12.5 }}>بازگرداندن به «موجود»</button>}
              </div>
            )}
          </div>
        )}
        {!selFloor && !focus && use3d && <p style={{ position: "absolute", left: 0, right: 0, bottom: "calc(24px + env(safe-area-inset-bottom, 0px))", textAlign: "center", fontSize: 11, color: DK.muted, pointerEvents: "none" }}>بکشید تا بچرخد · دو انگشت برای زوم · طبقه را لمس کنید</p>}

        {detailUnit && <UnitSheet key={detailUnit.id} c={c} unit={detailUnit} floor={floors.find((f) => f.id === detailUnit.floor_id)} byFloor={byFloor} customer={customer} showPrices={showPrices} onClose={() => setDetailsId(null)} onPatch={patchUnit} onStatus={setStatus} onMove={moveUnit} />}
      </div>
    </BodyPortal>
  );
}
