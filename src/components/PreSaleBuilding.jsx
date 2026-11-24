// Interactive building for one pre-sale project: CSS-3D model (no WebGL dependency, so it is light
// on iPhone), floor selector, schematic floor plan, unit sheet, filters, customer mode.
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronRight, Pencil, Eye, EyeOff, Layers, RotateCcw, Plus, Minus, SlidersHorizontal, X, Loader2, Box, LayoutList, ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { BodyPortal, inputStyle, JalaliDatePicker } from "../lib/ui.jsx";
import { glass, FS, FW, SP } from "../lib/theme.js";
import { todayISO, fmtJalali, humanizeToman } from "../lib/format.js";
import { STATUS, STATUS_KEYS, summarize, orderedUnits, planRows } from "../lib/presale.js";
import { fetchAll } from "../lib/presaleApi.js";

const money = (n) => (n > 0 ? `${Math.round(n).toLocaleString("en-US")} تومان` : "—");
const sc = (k) => STATUS[k]?.color || "#999";
const supports3d = () => { try { return typeof CSS !== "undefined" && CSS.supports("transform-style", "preserve-3d"); } catch { return false; } };

// ---------- 3D model ----------
function Building3D({ floors, byFloor, selId, onFloor, onUnit, exploded, wall, backImg, dim, rot, setRot, zoom, setZoom }) {
  const F = floors.length;
  const FH = Math.max(14, Math.min(34, Math.floor(260 / Math.max(F, 1))));
  const gap = exploded ? Math.round(FH * 0.9) : 2;
  const D = 120;
  const sums = floors.map((f) => (byFloor[f.id] || []).reduce((s, u) => s + +u.area, 0));
  const maxSum = Math.max(1, ...sums);
  const selIdx = floors.findIndex((f) => f.id === selId);
  const lift = selIdx >= 0 ? Math.round(FH * 1.8) : 0;
  const totalH = F * (FH + gap) + lift;
  const [dragging, setDragging] = useState(false);
  const ptrs = useRef(new Map());
  const st = useRef({ moved: false, rx: 0, ry: 0, x: 0, y: 0, d: 0, z: 1 });

  const down = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = st.current;
    if (ptrs.current.size === 1) { s.moved = false; s.x = e.clientX; s.y = e.clientY; s.rx = rot.rx; s.ry = rot.ry; setDragging(true); }
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; s.d = Math.hypot(a.x - b.x, a.y - b.y); s.z = zoom; s.moved = true; }
  };
  const move = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = st.current;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      setZoom(Math.max(0.5, Math.min(2.2, s.z * (Math.hypot(a.x - b.x, a.y - b.y) / (s.d || 1)))));
      return;
    }
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) s.moved = true;
    if (s.moved) setRot({ rx: Math.max(2, Math.min(78, s.rx + dy * 0.4)), ry: s.ry + dx * 0.5 });
  };
  const up = (e) => { ptrs.current.delete(e.pointerId); if (!ptrs.current.size) setDragging(false); };
  const wheel = (e) => setZoom((z) => Math.max(0.5, Math.min(2.2, z - e.deltaY * 0.001)));
  const guard = (fn) => (e) => { e.stopPropagation(); if (st.current.moved) return; fn(); };

  const face = { position: "absolute", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  const winGrad = "linear-gradient(90deg,transparent 0 14%,rgba(255,255,255,.7) 14% 40%,transparent 40% 60%,rgba(255,255,255,.7) 60% 86%,transparent 86%)";

  return (
    <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onWheel={wheel}
      style={{ height: 340, perspective: 1100, touchAction: "none", position: "relative", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none", cursor: dragging ? "grabbing" : "grab" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transformStyle: "preserve-3d", transform: `scale(${zoom}) rotateX(${-rot.rx}deg) rotateY(${rot.ry}deg)`, transition: dragging ? "none" : "transform .5s ease" }}>
        {/* ground */}
        <div style={{ position: "absolute", width: 360, height: 360, left: -180, top: -180, borderRadius: "50%", background: "radial-gradient(rgba(0,0,0,.22),transparent 65%)", transform: `translateY(${totalH / 2 + 4}px) rotateX(90deg)` }} />
        {floors.map((f, i) => {
          const list = orderedUnits(byFloor[f.id] || []);
          const w = Math.max(90, Math.round((sums[i] / maxSum) * 230));
          const y = totalH / 2 - (i + 1) * (FH + gap) - (selIdx >= 0 && i > selIdx ? lift : 0) - (i === selIdx ? 6 : 0);
          const isSel = f.id === selId;
          const fo = selId && !isSel ? 0.5 : 1;
          const hl = isSel ? "inset 0 0 0 2px #fff, 0 0 14px rgba(255,255,255,.7)" : "none";
          const rows = planRows(list);
          const tap = guard(() => onFloor(f.id));
          const unitTap = (u) => guard(() => (isSel ? onUnit(u.id) : onFloor(f.id)));
          return (
            <div key={f.id} onClick={tap} style={{ position: "absolute", left: -w / 2, top: 0, width: w, height: FH, transformStyle: "preserve-3d", transform: `translateY(${y}px)`, transition: "transform .5s cubic-bezier(.3,.7,.2,1)", cursor: "pointer" }}>
              {/* front: one segment per unit, colored by real status */}
              <div style={{ ...face, width: w, height: FH, transform: `translateZ(${D / 2}px)`, display: "flex", direction: "rtl", background: wall, opacity: fo, boxShadow: hl }}>
                {list.map((u) => (
                  <div key={u.id} onClick={unitTap(u)} style={{ flex: `${u.area} 1 0`, position: "relative", background: `${sc(u.status)}${dim(u) ? "D9" : "33"}`, borderInline: "1px solid rgba(255,255,255,.55)", opacity: dim(u) ? 1 : 0.35, overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: "20% 8% 26% 8%", background: winGrad }} />
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16%", background: "rgba(0,0,0,.22)" }} />
                    {FH >= 20 && <span style={{ position: "absolute", top: 1, right: 3, fontSize: 7.5, fontWeight: 800, color: "#fff", textShadow: "0 0 2px rgba(0,0,0,.6)" }}>{u.unit_number}</span>}
                  </div>
                ))}
              </div>
              <div style={{ ...face, width: w, height: FH, transform: `rotateY(180deg) translateZ(${D / 2}px)`, background: backImg ? `${wall} url(${backImg}) center/cover` : wall, opacity: fo, boxShadow: hl }}>
                {!backImg && <div style={{ position: "absolute", inset: "20% 6%", background: winGrad, opacity: 0.6 }} />}
              </div>
              {[-1, 1].map((sd) => (
                <div key={sd} style={{ ...face, width: D, height: FH, left: (w - D) / 2, background: `linear-gradient(rgba(0,0,0,.16),rgba(0,0,0,.16)),${wall}`, opacity: fo, boxShadow: hl, transform: `rotateY(${sd * 90}deg) translateZ(${w / 2}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.min(14, FH - 4), fontWeight: 900, color: "rgba(0,0,0,.45)" }}>{sd === 1 ? f.floor_number : ""}</div>
              ))}
              {/* roof/slab = schematic plan seen from above */}
              <div style={{ ...face, width: w, height: D, top: (FH - D) / 2, transform: `rotateX(90deg) translateZ(${FH / 2}px)`, background: "#EFECE5", padding: 4, opacity: fo, boxShadow: hl, display: "flex", flexDirection: "column", gap: 3, direction: "rtl" }}>
                {[rows[0], null, rows[1]].map((r, ri) => (r === null
                  ? <div key="core" style={{ height: 12, background: "rgba(0,0,0,.08)", flexShrink: 0 }} />
                  : r.length > 0 && (
                    <div key={ri} style={{ display: "flex", gap: 3, flex: 1 }}>
                      {r.map((u) => (
                        <div key={u.id} onClick={unitTap(u)} style={{ flex: `${u.area} 1 0`, background: sc(u.status), opacity: dim(u) ? 1 : 0.25, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>{u.unit_number}</div>
                      ))}
                    </div>
                  )))}
              </div>
              {/* balcony plate */}
              <div style={{ position: "absolute", width: w - 8, height: 12, left: 4, top: FH - 6, transform: `translateZ(${D / 2 + 6}px) rotateX(90deg)`, background: "#F7F5F0", opacity: fo, border: "1px solid rgba(0,0,0,.12)" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
function Shell({ c, onClose, children }) {
  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: c.bg, direction: "rtl" }}>{children}</div>
    </BodyPortal>
  );
}

export function PreSaleBuilding({ ctx, projectId, onBack, onEdit, onClose }) {
  const { c, notify } = ctx;
  const [project, setProject] = useState(null);
  const [floors, setFloors] = useState([]);
  const [units, setUnits] = useState([]);
  const [state, setState] = useState("loading");
  const [selId, setSelId] = useState(null);
  const [unitId, setUnitId] = useState(null);
  const [exploded, setExploded] = useState(false);
  const [rot, setRot] = useState({ rx: 20, ry: -30 });
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState(supports3d() ? "3d" : "2d");
  const [customer, setCustomer] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [fOpen, setFOpen] = useState(false);
  const [flt, setFlt] = useState({ floor: "", area: "", status: "", beds: "" });

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
  const filtering = !!(flt.floor || flt.area || flt.status || flt.beds);
  const floorNoOf = useMemo(() => { const m = {}; floors.forEach((f) => { m[f.id] = String(f.floor_number); }); return m; }, [floors]);
  const dim = useCallback((u) => (!flt.floor || floorNoOf[u.floor_id] === flt.floor) && (!flt.area || String(u.area) === flt.area) && (!flt.status || u.status === flt.status) && (!flt.beds || String(u.bedrooms) === flt.beds), [flt, floorNoOf]);
  const matches = useMemo(() => (filtering ? units.filter(dim) : []), [units, dim, filtering]);
  const areaOpts = useMemo(() => [...new Set(units.map((u) => String(u.area)))].sort((a, b) => a - b), [units]);
  const bedOpts = useMemo(() => [...new Set(units.map((u) => u.bedrooms).filter((b) => b != null))].sort(), [units]);

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
    if (kind === 0) { // toggle plan row
      const cur = u.position_configuration?.row ?? (list.length >= 4 && list.indexOf(u) >= Math.ceil(list.length / 2) ? 1 : 0);
      list.forEach((x, i) => { if (x.id !== u.id && x.position_configuration?.row == null) { /* freeze auto rows so only this unit moves */ patchUnit(x.id, { position_configuration: { ...x.position_configuration, order: i, row: list.length >= 4 && i >= Math.ceil(list.length / 2) ? 1 : 0 } }); } });
      patchUnit(u.id, { position_configuration: { ...u.position_configuration, order: list.indexOf(u), row: cur === 0 ? 1 : 0 } });
      return;
    }
    const i = list.indexOf(u), j = i + (kind < 0 ? -1 : 1);
    const k = j < 0 ? list.length - 1 : j >= list.length ? 0 : j; // wraps, so one button is enough
    if (list.length < 2 || k === i) return;
    const other = list[k];
    patchUnit(u.id, { position_configuration: { ...u.position_configuration, order: k } });
    patchUnit(other.id, { position_configuration: { ...other.position_configuration, order: i } });
  };

  const selFloor = floors.find((f) => f.id === selId) || null;
  const selUnits = selFloor ? byFloor[selFloor.id] || [] : [];
  const fs = selFloor ? summarize(selUnits) : null;
  const unit = units.find((u) => u.id === unitId) || null;
  const pickFloor = (id) => { setSelId((cur) => (cur === id ? null : id)); setRot((r) => ({ ...r, rx: Math.max(r.rx, 34) })); };
  const pickUnit = (id) => setUnitId(id);

  if (state !== "ok") return (
    <Shell c={c} onClose={onClose}>
      <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 12 }}>
        {state === "loading" ? <Loader2 className="animate-spin" color={c.muted} /> : <><p style={{ color: c.muted, fontSize: 13 }}>بارگذاری پروژه ممکن نشد.</p><button onClick={() => { setState("loading"); load(); }} className="press" style={{ padding: "10px 20px", borderRadius: 12, background: c.surface2 }}>تلاش دوباره</button></>}
        <button onClick={onBack} className="press" style={{ color: c.muted, fontSize: 12 }}>بازگشت</button>
      </div>
    </Shell>
  );
  const iconBtn = { background: c.surface2, width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" };
  const chip = (on) => ({ padding: "7px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: on ? c.ink : c.surface2, color: on ? c.bg : c.ink, whiteSpace: "nowrap" });
  const sel = { ...inputStyle(c), padding: "10px 12px", fontSize: 13 };

  return (
    <Shell c={c} onClose={onClose}>
      <div className="flex items-center shrink-0" style={{ gap: 8, padding: SP.lg, paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
        <button onClick={customer ? () => setCustomer(false) : onBack} className="press" style={iconBtn}>{customer ? <X size={16} color={c.ink} /> : <ChevronRight size={18} color={c.ink} />}</button>
        <p className="flex-1 min-w-0 truncate" style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{project.name}</p>
        {!customer && <button onClick={() => onEdit(project.id)} className="press" style={iconBtn} aria-label="ویرایش پروژه"><Pencil size={15} color={c.ink} /></button>}
        <button onClick={() => { setCustomer((v) => !v); setUnitId(null); }} className="press" style={{ ...iconBtn, width: "auto", padding: "0 14px", gap: 6, fontSize: 12, fontWeight: 800, background: customer ? c.ink : c.surface2, color: customer ? c.bg : c.ink }}>{customer ? <EyeOff size={14} /> : <Eye size={14} />}نمای مشتری</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {/* compact summary */}
        <div style={{ ...glass(c), padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
            {[["کل", sum.total, c.ink], ["موجود", sum.available, sc("available")], ["رزرو", sum.reserved, sc("reserved")], ["فروخته", sum.sold, sc("sold")]].map(([k, v, col]) => (
              <div key={k} style={{ flex: 1 }}><p style={{ fontSize: 20, fontWeight: 900, color: col }}>{v}</p><p style={{ fontSize: 10.5, color: c.muted }}>{k}</p></div>
            ))}
          </div>
          <div style={{ height: 6, borderRadius: 9, background: c.surface2, margin: "10px 0 6px", display: "flex", overflow: "hidden", direction: "rtl" }}>
            <div style={{ width: `${sum.total ? (sum.sold / sum.total) * 100 : 0}%`, background: sc("sold") }} />
            <div style={{ width: `${sum.total ? (sum.reserved / sum.total) * 100 : 0}%`, background: sc("reserved") }} />
          </div>
          <p style={{ fontSize: 11, color: c.muted }}>{sum.pct}٪ فروخته شده · {sum.available + sum.reserved} واحد باقی‌مانده</p>
          {!customer && sum.hasPrices && <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>ارزش فروخته‌شده: <b style={{ color: c.ink }}>{humanizeToman(sum.soldValue)}</b> · ارزش موجودی: <b style={{ color: c.ink }}>{humanizeToman(sum.remainingValue)}</b></p>}
          {customer && <label style={{ fontSize: 11, color: c.muted, display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}><input type="checkbox" checked={showPrices} onChange={(e) => setShowPrices(e.target.checked)} />نمایش قیمت واحدها</label>}
        </div>

        {/* controls */}
        <div style={{ display: "flex", gap: 8, margin: "12px 0 4px", overflowX: "auto" }}>
          {mode === "3d" && <button onClick={() => setExploded((v) => !v)} className="press" style={{ ...chip(exploded), display: "flex", gap: 6, alignItems: "center" }}><Layers size={13} />نمای تفکیک طبقات</button>}
          {mode === "3d" && <button onClick={() => { setRot({ rx: 20, ry: -30 }); setZoom(1); }} className="press" style={iconSm(c)} aria-label="بازنشانی"><RotateCcw size={14} color={c.ink} /></button>}
          {mode === "3d" && <><button onClick={() => setZoom((z) => Math.min(2.2, z + 0.2))} className="press" style={iconSm(c)} aria-label="بزرگ‌نمایی"><Plus size={14} color={c.ink} /></button><button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="press" style={iconSm(c)} aria-label="کوچک‌نمایی"><Minus size={14} color={c.ink} /></button></>}
          <button onClick={() => setMode((m) => (m === "3d" ? "2d" : "3d"))} className="press" style={{ ...chip(false), display: "flex", gap: 6, alignItems: "center" }}>{mode === "3d" ? <><LayoutList size={13} />نمای ۲بعدی</> : <><Box size={13} />نمای ۳بعدی</>}</button>
          <button onClick={() => setFOpen((v) => !v)} className="press" style={{ ...chip(filtering), display: "flex", gap: 6, alignItems: "center" }}><SlidersHorizontal size={13} />فیلتر</button>
        </div>

        {fOpen && (
          <div style={{ ...glass(c), padding: 12, margin: "8px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select style={sel} value={flt.floor} onChange={(e) => setFlt({ ...flt, floor: e.target.value })}><option value="">همه طبقات</option>{floors.map((f) => <option key={f.id} value={f.floor_number}>طبقه {f.floor_number}</option>)}</select>
            <select style={sel} value={flt.area} onChange={(e) => setFlt({ ...flt, area: e.target.value })}><option value="">همه متراژها</option>{areaOpts.map((a) => <option key={a} value={a}>{a} متر</option>)}</select>
            <select style={sel} value={flt.status} onChange={(e) => setFlt({ ...flt, status: e.target.value })}><option value="">همه وضعیت‌ها</option>{STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}</select>
            <select style={sel} value={flt.beds} onChange={(e) => setFlt({ ...flt, beds: e.target.value })} disabled={!bedOpts.length}><option value="">همه خواب‌ها</option>{bedOpts.map((b) => <option key={b} value={b}>{b} خواب</option>)}</select>
            {filtering && <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: 11, color: c.muted, marginBottom: 6 }}>{matches.length} واحد مطابق فیلتر <button onClick={() => setFlt({ floor: "", area: "", status: "", beds: "" })} style={{ color: c.primary, marginInlineStart: 8 }}>پاک کردن</button></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{matches.slice(0, 30).map((u) => <button key={u.id} onClick={() => { setSelId(u.floor_id); pickUnit(u.id); }} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800, color: "#fff", background: sc(u.status) }}>{u.unit_number}</button>)}</div>
            </div>}
          </div>
        )}

        {/* model */}
        <div style={{ ...glass(c), marginTop: 8, overflow: "hidden" }}>
          {mode === "3d"
            ? <Building3D floors={floors} byFloor={byFloor} selId={selId} onFloor={pickFloor} onUnit={pickUnit} exploded={exploded} wall={project.settings?.wall || "#D9D4CA"} backImg={project.facade_back_image} dim={dim} rot={rot} setRot={setRot} zoom={zoom} setZoom={setZoom} />
            : <Stack2D c={c} floors={floors} byFloor={byFloor} selId={selId} onFloor={pickFloor} onUnit={pickUnit} dim={dim} />}
        </div>
        {mode === "3d" && <p style={{ fontSize: 10.5, color: c.muted, textAlign: "center", marginTop: 6 }}>بکشید تا بچرخد · دو انگشت برای زوم · روی طبقه بزنید</p>}

        {/* floor selector */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 0" }}>
          {[...floors].reverse().map((f) => {
            const s = summarize(byFloor[f.id] || []);
            return (
              <button key={f.id} onClick={() => pickFloor(f.id)} className="press" style={{ minWidth: 52, padding: "8px 6px", borderRadius: 14, background: selId === f.id ? c.ink : c.surface2, color: selId === f.id ? c.bg : c.ink, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <b style={{ fontSize: 14 }}>{f.floor_number}</b>
                <span style={{ display: "flex", width: 30, height: 4, borderRadius: 4, overflow: "hidden" }}>
                  {[["available", s.available], ["reserved", s.reserved], ["sold", s.sold]].map(([k, n]) => n > 0 && <i key={k} style={{ flex: n, background: sc(k) }} />)}
                </span>
              </button>
            );
          })}
        </div>

        {/* selected floor */}
        {selFloor && (
          <div style={{ ...glass(c), padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <p style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>طبقه {selFloor.floor_number}</p>
              <p style={{ fontSize: 11, color: c.muted }}>
                <span style={{ color: sc("available") }}>{fs.available} موجود</span> · <span style={{ color: sc("reserved") }}>{fs.reserved} رزرو</span> · <span style={{ color: sc("sold") }}>{fs.sold} فروخته</span>
              </p>
            </div>
            <FloorPlan c={c} units={selUnits} onPick={pickUnit} dim={dim} />
          </div>
        )}
        {!selFloor && <p style={{ fontSize: 12, color: c.muted, textAlign: "center", padding: 12 }}>یک طبقه را انتخاب کنید تا پلان و واحدهایش باز شود.</p>}
      </div>

      {unit && <UnitSheet key={unit.id} c={c} unit={unit} floor={floors.find((f) => f.id === unit.floor_id)} byFloor={byFloor} customer={customer} showPrices={showPrices} onClose={() => setUnitId(null)} onPatch={patchUnit} onStatus={setStatus} onMove={moveUnit} />}
    </Shell>
  );
}
const iconSm = (c) => ({ background: c.surface2, width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 });
