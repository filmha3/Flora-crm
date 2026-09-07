import React, { useState, useMemo } from "react";
import { X, ChevronDown, Wifi, Loader2, Plus, Trash2, Save, Layers, Settings2, AlertTriangle } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassSurface } from "../lib/theme.js";
import { BodyPortal, Field, inputStyle, EmptyLine, MoneyField } from "../lib/ui.jsx";
import { uid, faDigits, fmtToman, fmtJalali, toNum, todayISO } from "../lib/format.js";
import { mergeWithDefaults } from "../lib/materialEstimate.js";
import { computePhaseBreakdown, makeDefaultSundryRows } from "../lib/constructionCostEstimate.js";
import { MaterialSettingsSheet } from "./MaterialEstimator.jsx";

// Perplexity is the only provider wired into this app with live web
// access (see callAI in App.jsx) — Gemini/AvalAI only know their training
// data, so asking them for "today's price" would just be a guess wearing a
// confident tone. If the model itself isn't confident, it's instructed to
// say so, and that's honored here: a null price is "not found," never
// coerced into a number.
async function fetchInternetPrice(callAI, itemName, unit, city) {
  const prompt = `قیمت روز «${itemName}»${unit ? ` (واحد: ${unit})` : ""} در بازار مصالح/دستمزد ساختمانی ایران${city ? ` در شهر ${city}` : ""} چقدره؟
فقط این JSON خام رو برگردون، بدون هیچ توضیح اضافه، بدون Markdown:
{"price": عدد به تومان یا null اگر مطمئن نیستی, "unit": "واحد واقعی که قیمت رو براش دادی", "city": "شهر یا خالی", "source": "نام سایت یا منبع یا خالی"}
اگر به قیمت قابل‌اطمینانی دسترسی نداری، price را null بگذار — هیچ‌وقت عدد حدسی نساز.`;
  const raw = await callAI(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن");
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch { throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن"); }
  if (parsed.price == null) return null; // model itself said "not confident" — respected, not overridden
  return { price: Number(parsed.price) || 0, unit: parsed.unit || unit || "", city: parsed.city || city || "", source: parsed.source || "", date: todayISO() };
}

function PriceBadge({ c, internet }) {
  if (!internet) return null;
  return (
    <span style={{ fontSize: 9, color: c.primary, background: c.primarySoft, borderRadius: RAD.pill, padding: "2px 6px", display: "inline-block" }}>
      اینترنتی — {fmtJalali(internet.date)}{internet.source ? ` — ${internet.source}` : ""}
    </span>
  );
}

function MaterialRow({ c, m, onChange, onFetchPrice, fetching, canFetch }) {
  const [showLabor, setShowLabor] = useState(!!m.laborUnitPrice);
  const cost = (m.materialCost || 0) + (m.laborCost || 0);
  return (
    <div className="rounded-xl p-3 mb-2" style={{ background: c.surface2 }}>
      <div className="flex items-center justify-between mb-2">
        <p style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</p>
        <span style={{ fontSize: 11, color: c.muted }}>{faDigits(m.qty)} {m.unit || "—"}</span>
      </div>
      <MoneyField c={c} value={m.unitPrice || ""} onChange={(v) => onChange({ unitPrice: v })} placeholder="قیمت مصالح (تومان)" style={{ fontSize: 12 }} />
      {m.unitPriceInternet && !m.unitPrice && <div style={{ marginTop: 4 }}><PriceBadge c={c} internet={m.unitPriceInternet} /></div>}

      {!showLabor ? (
        <button onClick={() => setShowLabor(true)} className="press" style={{ fontSize: 10.5, color: c.primary, fontWeight: 700, marginTop: 6 }}>+ دستمزد جدا</button>
      ) : (
        <div style={{ marginTop: 6 }}>
          <MoneyField c={c} value={m.laborUnitPrice || ""} onChange={(v) => onChange({ laborUnitPrice: v })} placeholder="دستمزد واحد (تومان)" style={{ fontSize: 12 }} />
        </div>
      )}

      <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
        <button onClick={onFetchPrice} disabled={!canFetch || fetching} className="press flex items-center" style={{ gap: 4, fontSize: 10, color: canFetch ? c.primary : c.muted, fontWeight: 700, opacity: canFetch || fetching ? 1 : 0.5 }}>
          {fetching ? <Loader2 size={11} className="animate-spin" /> : <Wifi size={11} />} قیمت اینترنتی
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: cost ? c.success : c.muted }}>{cost ? fmtToman(cost) : "قیمت وارد نشده"}</span>
      </div>
    </div>
  );
}

function SundryRow({ c, row, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <input style={{ ...inputStyle(c), fontSize: 12, flex: 1.4 }} value={row.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="نام هزینه" />
      <div style={{ flex: 1 }}><MoneyField c={c} value={row.amount} onChange={(v) => onChange({ amount: v })} placeholder="مبلغ" style={{ fontSize: 12 }} /></div>
      <button onClick={onRemove} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
    </div>
  );
}

function PhaseCard({ c, phase, open, onToggle, onChangeMaterial, onFetchMaterialPrice, fetchingId, canFetch, onChangeSundry, onAddSundry, onRemoveSundry }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={glass(c)}>
      <button onClick={onToggle} className="press w-full flex items-center justify-between p-4">
        <div className="text-right">
          <p style={{ fontSize: 13, fontWeight: 800 }}>{phase.name}</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{phase.phaseTotal ? fmtToman(phase.phaseTotal) : "هنوز قیمتی ثبت نشده"}</p>
        </div>
        <ChevronDown size={16} color={c.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
      </button>
      {open && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${c.border}`, paddingTop: SP.md }}>
          <p style={{ fontSize: 11, color: c.muted, fontWeight: 700, marginBottom: 8 }}>مصالح و دستمزد</p>
          {phase.rows.map((m) => (
            <MaterialRow key={m.id} c={c} m={m}
              onChange={(patch) => onChangeMaterial(m.id, patch)}
              onFetchPrice={() => onFetchMaterialPrice(phase.id, m)}
              fetching={fetchingId === `${phase.id}-${m.id}`}
              canFetch={canFetch}
            />
          ))}
          <p style={{ fontSize: 11, color: c.muted, fontWeight: 700, margin: "12px 0 8px" }}>هزینه‌های جانبی</p>
          {phase.sundryRows.map((row) => (
            <SundryRow key={row.id} c={c} row={row} onChange={(patch) => onChangeSundry(phase.id, row.id, patch)} onRemove={() => onRemoveSundry(phase.id, row.id)} />
          ))}
          <button onClick={() => onAddSundry(phase.id)} className="press flex items-center" style={{ gap: 4, fontSize: 11, color: c.primary, fontWeight: 700 }}><Plus size={12} /> افزودن هزینه</button>

          <div className="flex flex-col gap-1 mt-3" style={{ borderTop: `1px solid ${c.border}`, paddingTop: SP.sm }}>
            <div className="flex justify-between"><span style={{ fontSize: 11, color: c.muted }}>مصالح</span><span style={{ fontSize: 12, fontWeight: 700 }}>{fmtToman(phase.materialTotal)}</span></div>
            <div className="flex justify-between"><span style={{ fontSize: 11, color: c.muted }}>دستمزد</span><span style={{ fontSize: 12, fontWeight: 700 }}>{fmtToman(phase.laborTotal)}</span></div>
            <div className="flex justify-between"><span style={{ fontSize: 11, color: c.muted }}>جانبی</span><span style={{ fontSize: 12, fontWeight: 700 }}>{fmtToman(phase.sundryTotal)}</span></div>
            <div className="flex justify-between" style={{ marginTop: 4 }}><span style={{ fontSize: 12, fontWeight: 800 }}>جمع فاز</span><span style={{ fontSize: 14, fontWeight: 800, color: c.primary }}>{fmtToman(phase.phaseTotal)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConstructionCostEstimatorHome({ ctx, onClose }) {
  const { c, notify, materialCoefficients, setMaterialCoefficients, constructionCostEstimates, setConstructionCostEstimates, aiProvider, hasAiKey, callAI } = ctx;
  const baseCoefficients = mergeWithDefaults(materialCoefficients);

  const [inputMode, setInputMode] = useState("direct"); // "direct" | "fromLand"
  const [area, setArea] = useState("");
  const [landArea, setLandArea] = useState("");
  const [buildPercent, setBuildPercent] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [units, setUnits] = useState("");
  const [floors, setFloors] = useState("");
  const [city, setCity] = useState("");
  const [projectNote, setProjectNote] = useState(""); // free-form: structure type, quality level, roof, facade — one field instead of four

  // Prices are edited here as a LOCAL, per-estimate draft — never written
  // straight to the shared ctx.materialCoefficients on every keystroke.
  // Committing each price change to app-wide state immediately (the first
  // version of this screen did that) re-renders the entire app on every
  // digit typed, which on a real phone is exactly what makes the on-screen
  // keyboard appear to "close" mid-typing. Structural edits (factor/unit)
  // still go through the shared settings sheet, unaffected.
  const [priceOverrides, setPriceOverrides] = useState({}); // { [materialId]: { unitPrice, laborUnitPrice, unitPriceInternet } }
  const coefficients = useMemo(() => baseCoefficients.map((m) => ({ ...m, ...priceOverrides[m.id] })), [baseCoefficients, priceOverrides]);

  const [sundryByPhase, setSundryByPhase] = useState(() => makeDefaultSundryRows());
  const [openPhaseId, setOpenPhaseId] = useState(1);
  const [fetchingId, setFetchingId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Same "از متراژ زمین" derivation as the simple Material Estimator —
  // مساحت ساخت = زمین × (درصد ساخت ÷ ۱۰۰) × تعداد طبقات.
  const derivedArea = useMemo(() => {
    const land = toNum(landArea), pct = toNum(buildPercent), fl = toNum(floors);
    if (!land || !pct || !fl) return 0;
    return Math.round(land * (pct / 100) * fl * 100) / 100;
  }, [landArea, buildPercent, floors]);

  const areaNum = inputMode === "fromLand" ? derivedArea : toNum(area);
  const canFetchPrice = hasAiKey && aiProvider === "perplexity";

  const breakdown = useMemo(() => (areaNum > 0 ? computePhaseBreakdown(areaNum, coefficients, sundryByPhase) : null), [areaNum, coefficients, sundryByPhase]);

  const updateMaterial = (id, patch) => setPriceOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const fetchMaterialPrice = async (phaseId, m) => {
    if (!canFetchPrice) { notify("قیمت اینترنتی فقط با ارائه‌دهنده‌ی Perplexity کار می‌کند — از تنظیمات هوش مصنوعی عوضش کن."); return; }
    const key = `${phaseId}-${m.id}`;
    setFetchingId(key);
    try {
      const result = await fetchInternetPrice(callAI, m.name, m.unit, city);
      if (!result) { notify("قیمت مطمئنی برای این مورد پیدا نشد"); return; }
      updateMaterial(m.id, { unitPriceInternet: result });
      notify(`قیمت ${m.name} به‌روزرسانی شد (اینترنتی)`);
    } catch (e) { notify(e.message || "خطا در دریافت قیمت اینترنتی"); }
    setFetchingId(null);
  };

  const changeSundry = (phaseId, rowId, patch) => setSundryByPhase((prev) => ({ ...prev, [phaseId]: prev[phaseId].map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));
  const addSundry = (phaseId) => setSundryByPhase((prev) => ({ ...prev, [phaseId]: [...prev[phaseId], { id: uid(), name: "", amount: "" }] }));
  const removeSundry = (phaseId, rowId) => setSundryByPhase((prev) => ({ ...prev, [phaseId]: prev[phaseId].filter((r) => r.id !== rowId) }));

  const unitsNum = toNum(units);
  const costPerUnit = breakdown && unitsNum > 0 ? Math.round(breakdown.grandTotal / unitsNum) : null;

  const saveEstimate = () => {
    if (!breakdown) return;
    setConstructionCostEstimates((prev) => [{
      id: uid(),
      name: saveName.trim() || `پروژه ${faDigits(prev.length + 1)}`,
      area: areaNum, units: unitsNum || null, floors: toNum(floors) || null, city: city || null, note: projectNote || null,
      phases: breakdown.phases, grandTotal: breakdown.grandTotal, totalMaterial: breakdown.totalMaterial, totalLabor: breakdown.totalLabor, totalSundry: breakdown.totalSundry,
      costPerArea: breakdown.costPerArea, costPerUnit,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setSaveName("");
    notify("برآورد ذخیره شد");
  };

  const deleteEstimate = (id) => setConstructionCostEstimates((prev) => prev.filter((e) => e.id !== id));

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[215] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onClose} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <p style={{ flex: 1, fontSize: FS.subtitle, fontWeight: FW.heavy }}>برآورد هزینه کامل ساخت</p>
          <button onClick={() => setSavedOpen(true)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Layers size={16} color={c.ink} /></button>
          <button onClick={() => setSettingsOpen(true)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Settings2 size={16} color={c.ink} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="flex" style={{ padding: 3, borderRadius: RAD.md, background: c.surface2, marginBottom: SP.lg }}>
            {[["direct", "مساحت ساخت"], ["fromLand", "از متراژ زمین"]].map(([val, label]) => (
              <button key={val} onClick={() => setInputMode(val)} className="press flex-1" style={{ paddingBlock: 9, borderRadius: RAD.md - 2, fontSize: 12, fontWeight: 700, background: inputMode === val ? c.gradientPrimary : "transparent", color: inputMode === val ? "#fff" : c.muted }}>{label}</button>
            ))}
          </div>

          {inputMode === "direct" ? (
            <Field c={c} label="مساحت کل ساخت (مترمربع)">
              <input inputMode="decimal" style={{ ...inputStyle(c), fontSize: 18, fontWeight: 800 }} value={area} onChange={(e) => setArea(e.target.value.replace(/[^\d.]/g, ""))} placeholder="مثلاً ۱۰۰۰" autoFocus />
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-3" style={{ gap: 8 }}>
                <Field c={c} label="زمین (م²)"><input inputMode="decimal" style={inputStyle(c)} value={landArea} onChange={(e) => setLandArea(e.target.value.replace(/[^\d.]/g, ""))} placeholder="۳۰۰" /></Field>
                <Field c={c} label="درصد ساخت"><input inputMode="decimal" style={inputStyle(c)} value={buildPercent} onChange={(e) => setBuildPercent(e.target.value.replace(/[^\d.]/g, ""))} placeholder="۶۰" /></Field>
                <Field c={c} label="طبقات"><input inputMode="decimal" style={inputStyle(c)} value={floors} onChange={(e) => setFloors(e.target.value.replace(/[^\d.]/g, ""))} placeholder="۳" /></Field>
              </div>
              {derivedArea > 0 && (
                <div className="rounded-xl p-3 mb-4 flex items-center justify-between" style={{ background: c.primarySoft }}>
                  <span style={{ fontSize: 12, color: c.primary, fontWeight: 700 }}>مساحت ساخت محاسبه‌شده</span>
                  <span style={{ fontSize: 15, color: c.primary, fontWeight: 800 }}>{faDigits(derivedArea)} مترمربع</span>
                </div>
              )}
            </>
          )}

          {/* Trimmed from 7 optional fields to 3 + one free-text note —
              the four label-only fields (structure type, quality, roof,
              facade) don't feed any calculation, so they don't need their
              own inputs. */}
          {!showMore ? (
            <button onClick={() => setShowMore(true)} className="press" style={{ fontSize: 12, color: c.primary, fontWeight: 700, marginBottom: SP.lg }}>+ اطلاعات تکمیلی (اختیاری)</button>
          ) : (
            <div style={{ marginBottom: SP.lg }}>
              <div className="grid grid-cols-2" style={{ gap: 8, marginBottom: 8 }}>
                {inputMode === "direct" && <Field c={c} label="تعداد طبقات"><input inputMode="decimal" style={inputStyle(c)} value={floors} onChange={(e) => setFloors(e.target.value.replace(/[^\d.]/g, ""))} placeholder="مثلاً ۴" /></Field>}
                <Field c={c} label="تعداد واحد"><input inputMode="decimal" style={inputStyle(c)} value={units} onChange={(e) => setUnits(e.target.value.replace(/[^\d.]/g, ""))} placeholder="مثلاً ۵" /></Field>
                <Field c={c} label="شهر / منطقه"><input style={inputStyle(c)} value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثلاً سرعین" /></Field>
              </div>
              <Field c={c} label="توضیحات (نوع سازه، کیفیت، سقف، نما...)"><input style={inputStyle(c)} value={projectNote} onChange={(e) => setProjectNote(e.target.value)} placeholder="اختیاری، فقط برای یادداشت" /></Field>
            </div>
          )}

          {!breakdown ? (
            <EmptyLine c={c} text={inputMode === "direct" ? "مساحت را وارد کن تا برآورد اولیه نمایش داده شود" : "زمین، درصد ساخت و طبقات را وارد کن"} />
          ) : (
            <>
              <div className="rounded-xl p-3 mb-4 flex items-start" style={{ gap: 6, background: c.attnSoft }}>
                <AlertTriangle size={13} color={c.attn} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: c.attn, lineHeight: 1.8 }}>این برآورد اولیه است، نه قیمت قطعی. قیمت مصالح و دستمزد را خودت یا از دکمه‌ی «قیمت اینترنتی» به‌روز کن.</span>
              </div>

              {!canFetchPrice && (
                <p style={{ fontSize: 10.5, color: c.muted, marginBottom: SP.md, lineHeight: 1.8 }}>برای دریافت قیمت اینترنتی، ارائه‌دهنده‌ی هوش مصنوعی را در تنظیمات روی Perplexity بگذار — فقط این یکی به اینترنت زنده دسترسی دارد.</p>
              )}

              {breakdown.phases.map((phase) => (
                <PhaseCard
                  key={phase.id} c={c} phase={phase} open={openPhaseId === phase.id} onToggle={() => setOpenPhaseId(openPhaseId === phase.id ? null : phase.id)}
                  onChangeMaterial={updateMaterial} onFetchMaterialPrice={fetchMaterialPrice} fetchingId={fetchingId} canFetch={canFetchPrice}
                  onChangeSundry={changeSundry} onAddSundry={addSundry} onRemoveSundry={removeSundry}
                />
              ))}

              {/* Project summary */}
              <div className="rounded-2xl p-4 mb-4" style={{ background: c.gradientPrimary }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 700, marginBottom: 8 }}>برآورد کل پروژه</p>
                {breakdown.phases.map((p) => (
                  <div key={p.id} className="flex justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{fmtToman(p.phaseTotal)}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "rgba(255,255,255,0.25)", margin: "8px 0" }} />
                <div className="flex justify-between" style={{ marginBottom: 4 }}><span style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>جمع کل</span><span style={{ fontSize: 18, color: "#fff", fontWeight: 800 }}>{fmtToman(breakdown.grandTotal)}</span></div>
                <div className="flex justify-between"><span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>هزینه هر مترمربع</span><span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{fmtToman(breakdown.costPerArea)}</span></div>
                {costPerUnit != null && (
                  <div className="flex justify-between" style={{ marginTop: 4 }}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>هزینه تقریبی هر واحد ({faDigits(unitsNum)} واحد)</span><span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{fmtToman(costPerUnit)}</span></div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input style={inputStyle(c)} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="نام پروژه برای ذخیره (اختیاری)" />
              </div>
              <button onClick={saveEstimate} className="press w-full flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                <Save size={14} /> ذخیره برآورد کامل
              </button>
            </>
          )}
        </div>
      </div>

      {settingsOpen && (
        <MaterialSettingsSheet
          c={c} coefficients={coefficients} focusId={null}
          onSave={(next) => { setMaterialCoefficients(next); setSettingsOpen(false); notify("ضرایب ذخیره شد"); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {savedOpen && (
        <BodyPortal onClose={() => setSavedOpen(false)}>
          <div className="fixed inset-0 z-[280] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSavedOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390, maxHeight: "75vh", overflowY: "auto" }}>
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.lg }}>برآوردهای ذخیره‌شده</p>
              {constructionCostEstimates.length === 0 ? (
                <EmptyLine c={c} text="هنوز برآوردی ذخیره نشده" />
              ) : (
                <div className="flex flex-col gap-2">
                  {constructionCostEstimates.map((e) => (
                    <div key={e.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{e.name}</p>
                        <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{faDigits(e.area)} م² — {fmtToman(e.grandTotal)} — {fmtJalali(e.createdAt.slice(0, 10))}</p>
                      </div>
                      <button onClick={() => deleteEstimate(e.id)} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </BodyPortal>
      )}
    </BodyPortal>
  );
}

export { ConstructionCostEstimatorHome };
