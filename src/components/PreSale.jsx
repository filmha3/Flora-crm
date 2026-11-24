// «پیش‌فروش پروژه‌ها» — project list + create/edit wizard. All data lives in Supabase
// (presale_projects → presale_floors → presale_units); see supabase/migrations/20261124_presale_projects.sql
import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Plus, Building2, ChevronRight, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { BodyPortal, inputStyle } from "../lib/ui.jsx";
import { glass, FS, FW, SP } from "../lib/theme.js";
import { STATUS, summarize, generateDraft, resizeDraft, unitNumber, tmpId } from "../lib/presale.js";
import { fetchAll, insertChunks, newId, readImage, avgColor } from "../lib/presaleApi.js";

const PreSaleBuilding = React.lazy(() => import("./PreSaleBuilding.jsx").then((m) => ({ default: m.PreSaleBuilding })));
const MIGRATION_HINT = "جدول‌های پیش‌فروش هنوز ساخته نشده‌اند. فایل supabase/migrations/20261124_presale_projects.sql را یک بار در Supabase → SQL Editor اجرا کنید.";

function Shell({ c, onClose, children }) {
  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: c.bg, direction: "rtl" }}>{children}</div>
    </BodyPortal>
  );
}
const Header = ({ c, title, onBack, icon }) => (
  <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
    <button onClick={onBack} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}>{icon || <ChevronRight size={18} color={c.ink} />}</button>
    <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{title}</p>
  </div>
);

// ---------- wizard ----------
function Wizard({ ctx, projectId, onBack, onSaved }) {
  const { c, session, notify } = ctx;
  const uidv = session?.user?.id;
  const edit = !!projectId;
  const [loading, setLoading] = useState(edit);
  const [orig, setOrig] = useState(null); // { floors, units } as loaded
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [imgs, setImgs] = useState({ cover: null, front: null, back: null, sides: [] });
  const [wall, setWall] = useState(null);
  const [nFloors, setNFloors] = useState("8");
  const [perFloor, setPerFloor] = useState("3");
  const [areas, setAreas] = useState(["120", "135", "170"]);
  const [ppsqm, setPpsqm] = useState("");
  const [draft, setDraft] = useState([]);
  const sig = useRef("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!edit) return;
    (async () => {
      try {
        const [p, f, u] = await Promise.all([
          supabase.from("presale_projects").select("*").eq("id", projectId).single(),
          supabase.from("presale_floors").select("*").eq("project_id", projectId).order("floor_order"),
          fetchAll("presale_units", "*", (q) => q.eq("project_id", projectId)),
        ]);
        if (p.error) throw p.error; if (f.error) throw f.error;
        const P = p.data;
        setName(P.name); setImgs({ cover: P.cover_image, front: P.facade_front_image, back: P.facade_back_image, sides: P.facade_side_images || [] });
        setWall(P.settings?.wall || null); setNFloors(String(P.total_floors)); setPpsqm(P.settings?.ppsqm ? String(P.settings.ppsqm) : "");
        if (P.settings?.areas?.length) setAreas(P.settings.areas.map(String));
        const d = f.data.map((fl) => ({ floor_number: fl.floor_number, id: fl.id, units: u.filter((x) => x.floor_id === fl.id).sort((a, b) => (a.position_configuration?.order ?? 0) - (b.position_configuration?.order ?? 0)).map((x) => ({ key: x.id, id: x.id, unit_number: x.unit_number, area: x.area, price: x.price, status: x.status, buyer_name: x.buyer_name })) }));
        setDraft(d); setOrig({ floors: f.data, units: u, project: P });
        sig.current = "edit";
      } catch (e) { setErr("بارگذاری پروژه ممکن نشد."); }
      setLoading(false);
    })();
  }, [edit, projectId]);

  const pick = async (key, file, multi) => {
    if (!file) return;
    const url = await readImage(file);
    if (!url) return setErr("تصویر خوانده نشد.");
    setImgs((i) => (multi ? { ...i, sides: [...i.sides, url].slice(0, 4) } : { ...i, [key]: url }));
    if (key === "front") { const col = await avgColor(url); if (col) setWall(col); }
  };
  const Img = ({ k, label, optional }) => (
    <label className="press" style={{ flex: 1, aspectRatio: "4/3", borderRadius: 14, background: c.surface2, border: `1px dashed ${c.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden", position: "relative", fontSize: 11, color: c.muted, cursor: "pointer" }}>
      {imgs[k] ? <img src={imgs[k]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <><ImagePlus size={18} />{label}{optional && <span style={{ fontSize: 9.5 }}>(اختیاری)</span>}</>}
      <input type="file" accept="image/*" hidden onChange={(e) => { pick(k, e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );

  const lab = { fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: 6, display: "block" };
  const numAreas = areas.map(Number).filter((a) => a > 0);

  const next = () => {
    setErr("");
    const F = parseInt(nFloors, 10), U = parseInt(perFloor, 10);
    if (!name.trim()) return setErr("نام پروژه را وارد کنید.");
    if (!(F >= 1 && F <= 60)) return setErr("تعداد طبقات باید بین ۱ تا ۶۰ باشد.");
    if (!edit && !(U >= 1 && U <= 12)) return setErr("تعداد واحد هر طبقه باید بین ۱ تا ۱۲ باشد.");
    if (!numAreas.length) return setErr("حداقل یک متراژ وارد کنید.");
    const pp = +ppsqm || 0;
    if (edit) {
      setDraft((d) => {
        const out = d.filter((x) => x.floor_number <= F);
        for (let n = out.length + 1; n <= F; n++) out.push(...generateDraft(n, U > 0 ? U : 1, numAreas, pp).slice(n - 1));
        return out;
      });
      // generateDraft(n, …) returns n floors; slice(n-1) keeps only the new floor n
    } else {
      const s = [F, U, numAreas.join(","), pp].join("|");
      if (s !== sig.current) { setDraft(generateDraft(F, U, numAreas, pp)); sig.current = s; }
    }
    setStep(2);
  };

  const upd = (fn, num, key, patch) => setDraft((d) => d.map((f) => (f.floor_number !== num ? f : { ...f, units: f.units.map((u) => (u.key === key ? { ...u, ...patch } : u)) })));
  const addUnit = (num) => setDraft((d) => d.map((f) => {
    if (f.floor_number !== num) return f;
    const used = new Set(f.units.map((u) => u.unit_number));
    let i = 0; while (used.has(unitNumber(num, i))) i++;
    return { ...f, units: [...f.units, { key: tmpId(), unit_number: unitNumber(num, i), area: numAreas[f.units.length % numAreas.length] || 100, price: null }] };
  }));
  const delUnit = (num, key) => setDraft((d) => d.map((f) => (f.floor_number !== num ? f : { ...f, units: f.units.filter((u) => u.key !== key) })));
  const copyTo = (num) => setDraft((d) => { const src = d.find((f) => f.floor_number === num); return d.map((f) => (f.floor_number === num ? f : { ...f, units: src.units.map((u, i) => ({ key: tmpId(), unit_number: unitNumber(f.floor_number, i), area: u.area, price: null })) })); });

  const validate = () => {
    const all = draft.flatMap((f) => f.units.map((u) => ({ ...u, f: f.floor_number })));
    if (!all.length) return "حداقل یک واحد لازم است.";
    for (const u of all) { if (!String(u.unit_number).trim()) return "شماره همه واحدها را وارد کنید."; if (!(+u.area > 0)) return `متراژ واحد ${u.unit_number} معتبر نیست.`; }
    const seen = new Set();
    for (const u of all) { const n = String(u.unit_number).trim(); if (seen.has(n)) return `شماره واحد ${n} تکراری است.`; seen.add(n); }
    if (orig) {
      const keep = new Set(all.map((u) => u.id).filter(Boolean));
      const locked = orig.units.find((u) => !keep.has(u.id) && (u.status !== "available" || u.buyer_name));
      if (locked) return `واحد ${locked.unit_number} ${STATUS[locked.status].label} است و حذف نمی‌شود؛ ابتدا وضعیتش را به «موجود» برگردانید.`;
    }
    return "";
  };

  const save = async () => {
    const v = validate(); if (v) return setErr(v);
    if (!uidv) return setErr("ابتدا وارد حساب شوید.");
    setErr(""); setSaving(true);
    const F = parseInt(nFloors, 10);
    const settings = { ...(orig?.project.settings || {}), wall, areas: numAreas, ppsqm: +ppsqm || null };
    const pfields = { name: name.trim(), cover_image: imgs.cover, facade_front_image: imgs.front, facade_back_image: imgs.back, facade_side_images: imgs.sides, total_floors: F, settings };
    try {
      let pid = projectId;
      if (!edit) {
        pid = newId();
        const { error } = await supabase.from("presale_projects").insert({ id: pid, user_id: uidv, ...pfields });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("presale_projects").update(pfields).eq("id", pid);
        if (error) throw error;
      }
      const oldFloors = orig?.floors || [];
      const floorRows = [], unitRows = [], updates = [];
      draft.forEach((f) => {
        let fid = oldFloors.find((o) => o.floor_number === f.floor_number)?.id;
        if (!fid) { fid = newId(); floorRows.push({ id: fid, user_id: uidv, project_id: pid, floor_number: f.floor_number, floor_order: f.floor_number, unit_count: f.units.length }); }
        else { const o = oldFloors.find((x) => x.id === fid); if (o.unit_count !== f.units.length) updates.push(supabase.from("presale_floors").update({ unit_count: f.units.length }).eq("id", fid)); }
        f.units.forEach((u, i) => {
          const price = +u.price > 0 ? +u.price : null, area = +u.area, num = String(u.unit_number).trim();
          if (u.id) {
            const o = orig.units.find((x) => x.id === u.id);
            if (o.unit_number !== num || +o.area !== area) updates.push(supabase.from("presale_units").update({ unit_number: num, area, price_per_sqm: o.price > 0 ? Math.round(o.price / area) : null }).eq("id", u.id));
          } else unitRows.push({ id: newId(), user_id: uidv, project_id: pid, floor_id: fid, unit_number: num, area, price, price_per_sqm: price ? Math.round(price / area) : null, status: "available", position_configuration: { order: i } });
        });
      });
      if (orig) {
        const keepU = new Set(draft.flatMap((f) => f.units.map((u) => u.id)).filter(Boolean));
        const delU = orig.units.filter((u) => !keepU.has(u.id)).map((u) => u.id);
        for (let i = 0; i < delU.length; i += 100) { const { error } = await supabase.from("presale_units").delete().in("id", delU.slice(i, i + 100)); if (error) throw error; }
        const keepF = new Set(draft.map((f) => f.floor_number));
        const delF = oldFloors.filter((f) => !keepF.has(f.floor_number)).map((f) => f.id);
        if (delF.length) { const { error } = await supabase.from("presale_floors").delete().in("id", delF); if (error) throw error; }
      }
      await insertChunks("presale_floors", floorRows);
      await insertChunks("presale_units", unitRows);
      for (const r of await Promise.all(updates)) if (r.error) throw r.error;
      onSaved(pid);
    } catch (e) {
      console.warn("presale save", e);
      setErr(/relation .* does not exist|schema cache/i.test(e.message || "") ? MIGRATION_HINT : "ذخیره نشد: " + (e.message || "خطای ناشناخته"));
      setSaving(false);
    }
  };

  const del = async () => {
    if (!window.confirm("این پروژه با همه طبقات و واحدهایش حذف شود؟ این کار قابل بازگشت نیست.")) return;
    const { error } = await supabase.from("presale_projects").delete().eq("id", projectId);
    if (error) return setErr("حذف نشد: " + error.message);
    notify?.("پروژه حذف شد"); onSaved(null);
  };

  if (loading) return <Shell c={c} onClose={onBack}><div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" color={c.muted} /></div></Shell>;
  const field = inputStyle(c);
  return (
    <Shell c={c} onClose={onBack}>
      <Header c={c} title={edit ? "ویرایش پروژه" : "پروژه پیش‌فروش جدید"} onBack={step === 2 ? () => setStep(1) : onBack} />
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {step === 1 ? (
          <div style={{ display: "grid", gap: 16 }}>
            <label><span style={lab}>نام پروژه</span><input style={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <div><span style={lab}>تصاویر</span>
              <div style={{ display: "flex", gap: 8 }}>{Img({ k: "cover", label: "کاور پروژه" })}{Img({ k: "front", label: "نمای جلو", optional: true })}{Img({ k: "back", label: "نمای عقب", optional: true })}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {imgs.sides.map((s, i) => <div key={i} style={{ width: 64, height: 48, borderRadius: 10, overflow: "hidden", position: "relative" }}><img src={s} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /><button onClick={() => setImgs((x) => ({ ...x, sides: x.sides.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 2, left: 2, background: "rgba(0,0,0,.6)", borderRadius: 99, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={10} color="#fff" /></button></div>)}
                {imgs.sides.length < 4 && <label className="press" style={{ height: 48, padding: "0 14px", borderRadius: 10, background: c.surface2, fontSize: 11, color: c.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><Plus size={13} />نمای کناری<input type="file" accept="image/*" hidden onChange={(e) => { pick("sides", e.target.files?.[0], true); e.target.value = ""; }} /></label>}
              </div>
              <p style={{ fontSize: 10.5, color: c.muted, marginTop: 6 }}>از نمای جلو فقط رنگ اصلی نما برای مدل سه‌بعدی گرفته می‌شود؛ مدل، یک تقریب پارامتریک است نه بازسازی دقیق عکس.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: edit ? "1fr" : "1fr 1fr", gap: 10 }}>
              <label><span style={lab}>تعداد طبقات مسکونی</span><input style={field} inputMode="numeric" value={nFloors} onChange={(e) => setNFloors(e.target.value.replace(/\D/g, ""))} /></label>
              {!edit && <label><span style={lab}>واحد در هر طبقه</span><input style={field} inputMode="numeric" value={perFloor} onChange={(e) => setPerFloor(e.target.value.replace(/\D/g, ""))} /></label>}
            </div>
            <div><span style={lab}>متراژ واحدها (متر مربع)</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {areas.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", background: c.surface2, borderRadius: 12, paddingInlineStart: 4 }}>
                    <input inputMode="decimal" value={a} onChange={(e) => setAreas((l) => l.map((x, j) => (j === i ? e.target.value.replace(/[^\d.]/g, "") : x)))} style={{ width: 64, background: "transparent", border: "none", outline: "none", padding: "12px 8px", fontSize: 14, color: c.ink, textAlign: "center" }} />
                    <button onClick={() => setAreas((l) => l.filter((_, j) => j !== i))} aria-label="حذف متراژ" style={{ padding: 8 }}><X size={13} color={c.muted} /></button>
                  </div>
                ))}
                <button onClick={() => setAreas((l) => [...l, ""])} className="press" style={{ width: 44, height: 44, borderRadius: 12, background: c.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} color={c.ink} /></button>
              </div>
              <p style={{ fontSize: 10.5, color: c.muted, marginTop: 6 }}>متراژها به‌ترتیب بین واحدهای هر طبقه تکرار می‌شوند؛ در مرحله بعد هر طبقه را جدا ویرایش کنید.</p>
            </div>
            {!edit && <label><span style={lab}>قیمت هر متر (تومان) — اختیاری</span><input style={field} inputMode="numeric" value={ppsqm} onChange={(e) => setPpsqm(e.target.value.replace(/\D/g, ""))} /></label>}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ fontSize: 11.5, color: c.muted }}>شماره و متراژ هر واحد را ویرایش کنید. {edit && "واحدهای دارای وضعیت فروش/رزرو حذف نمی‌شوند."}</p>
            {[...draft].reverse().map((f) => (
              <div key={f.floor_number} style={{ ...glass(c), padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  <b style={{ flex: 1, fontSize: 14 }}>طبقه {f.floor_number}</b>
                  {!edit && <button onClick={() => copyTo(f.floor_number)} className="press" style={{ fontSize: 11, color: c.primary }}>کپی به همه طبقات</button>}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {f.units.map((u) => (
                    <div key={u.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input aria-label="شماره واحد" value={u.unit_number} onChange={(e) => upd(null, f.floor_number, u.key, { unit_number: e.target.value })} style={{ ...field, flex: 1, padding: "12px 10px", textAlign: "center" }} />
                      <input aria-label="متراژ" inputMode="decimal" value={u.area} onChange={(e) => upd(null, f.floor_number, u.key, { area: e.target.value.replace(/[^\d.]/g, "") })} style={{ ...field, flex: 1, padding: "12px 10px", textAlign: "center" }} />
                      <span style={{ fontSize: 10.5, color: c.muted }}>متر</span>
                      {u.status && u.status !== "available" ? <span style={{ width: 34, textAlign: "center", fontSize: 9, fontWeight: 800, color: STATUS[u.status].color }}>{STATUS[u.status].label}</span>
                        : <button onClick={() => delUnit(f.floor_number, u.key)} aria-label="حذف واحد" className="press" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} color={c.muted} /></button>}
                    </div>
                  ))}
                </div>
                <button onClick={() => addUnit(f.floor_number)} className="press" style={{ marginTop: 8, fontSize: 12, color: c.primary, display: "flex", alignItems: "center", gap: 4 }}><Plus size={13} />افزودن واحد</button>
              </div>
            ))}
          </div>
        )}
        {err && <p role="alert" style={{ color: "#B42318", fontSize: 12.5, marginTop: 12, lineHeight: 1.9 }}>{err}</p>}
        <button onClick={step === 1 ? next : save} disabled={saving} className="press" style={{ width: "100%", height: 56, marginTop: 16, borderRadius: 16, background: c.gradientPrimary, color: "#fff", fontWeight: 800, fontSize: 15, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <><Loader2 size={16} className="animate-spin" />در حال ساخت…</> : step === 1 ? "ادامه — پیکربندی طبقات" : edit ? "ذخیره تغییرات" : "ساخت مدل ساختمان"}
        </button>
        {edit && <button onClick={del} className="press" style={{ width: "100%", marginTop: 12, padding: 12, fontSize: 12, color: "#B42318" }}>حذف پروژه</button>}
      </div>
    </Shell>
  );
}

// ---------- home ----------
export function PreSaleHome({ ctx, onClose }) {
  const { c } = ctx;
  const [view, setView] = useState({ name: "list" }); // list | wizard{id} | building{id}
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [state, setState] = useState("loading");

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("presale_projects").select("id,name,cover_image,total_floors,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setProjects(data || []);
      setUnits(await fetchAll("presale_units", "project_id,status"));
      setState("ok");
    } catch (e) { console.warn("presale list", e); setState(/relation .* does not exist|schema cache/i.test(e.message || "") ? "nomigration" : "error"); }
  }, []);
  useEffect(() => { if (view.name === "list") load(); }, [view.name, load]);

  if (view.name === "wizard") return <Wizard ctx={ctx} projectId={view.id} onBack={() => setView(view.id ? { name: "building", id: view.id } : { name: "list" })} onSaved={(id) => setView(id ? { name: "building", id } : { name: "list" })} />;
  if (view.name === "building") return (
    <React.Suspense fallback={<Shell c={c} onClose={onClose}><div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" color={c.muted} /></div></Shell>}>
      <PreSaleBuilding ctx={ctx} projectId={view.id} onBack={() => setView({ name: "list" })} onEdit={(id) => setView({ name: "wizard", id })} onClose={onClose} />
    </React.Suspense>
  );

  return (
    <Shell c={c} onClose={onClose}>
      <Header c={c} title="پیش‌فروش پروژه‌ها" onBack={onClose} icon={<X size={16} color={c.ink} />} />
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <button onClick={() => setView({ name: "wizard" })} className="press" style={{ width: "100%", height: 52, borderRadius: 16, background: c.gradientPrimary, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}><Plus size={17} />پروژه جدید</button>
        {state === "loading" && <div style={{ textAlign: "center", padding: 40 }}><Loader2 className="animate-spin" color={c.muted} style={{ margin: "0 auto" }} /></div>}
        {state === "nomigration" && <p style={{ fontSize: 12.5, color: c.muted, lineHeight: 2 }}>{MIGRATION_HINT}</p>}
        {state === "error" && <p style={{ fontSize: 12.5, color: c.muted }}>بارگذاری ممکن نشد. <button onClick={() => { setState("loading"); load(); }} style={{ color: c.primary }}>تلاش دوباره</button></p>}
        {state === "ok" && !projects.length && <p style={{ fontSize: 13, color: c.muted, textAlign: "center", padding: 40 }}>هنوز پروژه‌ای ثبت نشده است.</p>}
        {state === "ok" && projects.map((p) => {
          const s = summarize(units.filter((u) => u.project_id === p.id));
          return (
            <div key={p.id} style={{ ...glass(c), overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: 130, background: p.cover_image ? `url(${p.cover_image}) center/cover` : c.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>{!p.cover_image && <Building2 size={34} color={c.muted} />}</div>
              <div style={{ padding: 14 }}>
                <p style={{ fontSize: 15, fontWeight: 900 }}>{p.name}</p>
                <p style={{ fontSize: 11.5, color: c.muted, margin: "4px 0 10px" }}>{p.total_floors} طبقه · {s.total} واحد</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700 }}>
                  <span style={{ color: STATUS.available.color }}>{s.available} موجود</span><span style={{ color: STATUS.reserved.color }}>{s.reserved} رزرو</span><span style={{ color: STATUS.sold.color }}>{s.sold} فروخته</span>
                </div>
                <div style={{ height: 6, borderRadius: 9, background: c.surface2, margin: "8px 0 4px", overflow: "hidden" }}><div style={{ width: `${s.pct}%`, height: "100%", background: STATUS.sold.color }} /></div>
                <p style={{ fontSize: 10.5, color: c.muted }}>پیشرفت فروش: {s.pct}٪</p>
                <button onClick={() => setView({ name: "building", id: p.id })} className="press" style={{ width: "100%", height: 46, marginTop: 10, borderRadius: 14, background: c.ink, color: c.bg, fontWeight: 800, fontSize: 13 }}>مشاهده ساختمان</button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
