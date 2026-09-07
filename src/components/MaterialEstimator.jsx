import React, { useState, useMemo } from "react";
import { X, Settings2, Save, Copy, Check, Trash2, Layers, Calculator } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite, glassSurface } from "../lib/theme.js";
import { BodyPortal, Field, inputStyle, EmptyLine, MoneyField } from "../lib/ui.jsx";
import { uid, faDigits, fmtJalali, fmtToman, todayISO, toNum } from "../lib/format.js";
import { computeMaterialEstimate, mergeWithDefaults } from "../lib/materialEstimate.js";

// A material with no unit set (plaster/paint, by default — see
// materialEstimate.js) shows this instead of a blank space, and taps
// straight into settings for that one row instead of a generic screen.
function UnitLabel({ c, unit, onFix }) {
  if (unit) return <span style={{ fontSize: 11, color: c.muted }}>{unit}</span>;
  return (
    <button onClick={onFix} className="press" style={{ fontSize: 11, color: c.attn, fontWeight: 700 }}>واحد تعیین‌نشده — تنظیم کن</button>
  );
}

function MaterialCard({ c, m, onFixUnit }) {
  const qty = m.kind === "range" ? m.valueMax : m.value; // cost estimate uses the higher end for a range, so it reads as "at most"
  const cost = m.unitPrice ? qty * Number(m.unitPrice) : null;
  return (
    <div className="rounded-2xl p-4" style={glassLite(c, RAD.lg)}>
      <p style={{ fontSize: 12, color: c.muted, fontWeight: 700 }}>{m.name}</p>
      {m.kind === "range" ? (
        <p style={{ fontSize: 22, fontWeight: FW.heavy, marginTop: 4 }}>{faDigits(m.valueMin)}<span style={{ fontSize: 14, color: c.muted }}> تا </span>{faDigits(m.valueMax)}</p>
      ) : (
        <p style={{ fontSize: 22, fontWeight: FW.heavy, marginTop: 4 }}>{faDigits(m.value)}</p>
      )}
      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
        <UnitLabel c={c} unit={m.unit} onFix={() => onFixUnit(m.id)} />
        <span style={{ fontSize: 10.5, color: c.muted }}>ضریب: {faDigits(m.kind === "range" ? `${m.factorMin}–${m.factorMax}` : m.factor)}</span>
      </div>
      {cost != null && <p style={{ fontSize: 12, fontWeight: 700, color: c.success, marginTop: 6 }}>{fmtToman(cost)}</p>}
      {m.note && <p style={{ fontSize: 10, color: c.muted, marginTop: 4, lineHeight: 1.7 }}>{m.note}</p>}
    </div>
  );
}

function MaterialEstimatorHome({ ctx, onClose }) {
  const { c, notify, materialCoefficients, setMaterialCoefficients, materialEstimates, setMaterialEstimates } = ctx;
  const [inputMode, setInputMode] = useState("direct"); // "direct" | "fromLand"
  const [area, setArea] = useState("");
  const [landArea, setLandArea] = useState("");
  const [buildPercent, setBuildPercent] = useState("");
  const [floors, setFloors] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMaterialId, setFocusMaterialId] = useState(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [copied, setCopied] = useState(false);

  const coefficients = mergeWithDefaults(materialCoefficients);

  // "از متراژ زمین": مساحت ساخت = زمین × (درصد ساخت ÷ ۱۰۰) × تعداد طبقات —
  // e.g. a 300m² lot, 60% build permit, 3 floors → 300 × 0.6 × 3 = 540m².
  const derivedArea = useMemo(() => {
    const land = toNum(landArea), pct = toNum(buildPercent), fl = toNum(floors);
    if (!land || !pct || !fl) return 0;
    return Math.round(land * (pct / 100) * fl * 100) / 100;
  }, [landArea, buildPercent, floors]);

  const areaNum = inputMode === "fromLand" ? derivedArea : toNum(area);
  // The only place area × coefficient actually happens — everything below
  // just renders whatever this returns.
  const results = useMemo(() => (areaNum > 0 ? computeMaterialEstimate(areaNum, coefficients) : null), [areaNum, coefficients]);
  const totalCost = useMemo(() => {
    if (!results) return 0;
    return results.reduce((sum, m) => sum + (m.unitPrice ? (m.kind === "range" ? m.valueMax : m.value) * Number(m.unitPrice) : 0), 0);
  }, [results]);
  const anyPriced = results?.some((m) => m.unitPrice) || false;

  const resultsText = () => {
    if (!results) return "";
    const lines = results.map((m) => {
      const qty = m.kind === "range" ? `${m.valueMin} تا ${m.valueMax}` : m.value;
      const cost = m.unitPrice ? ` (~${Math.round((m.kind === "range" ? m.valueMax : m.value) * Number(m.unitPrice)).toLocaleString("de-DE")} تومان)` : "";
      return `${m.name}: ${qty}${m.unit ? " " + m.unit : ""}${cost}`;
    });
    const totalLine = anyPriced ? `\n\nهزینه‌ی تقریبی کل: ${fmtToman(totalCost)}` : "";
    return `برآورد مصالح — مساحت ${areaNum} مترمربع\n` + lines.join("\n") + totalLine + "\n\n(برآورد اولیه است، مقدار قطعی خرید نیست)";
  };

  const copyResults = () => {
    navigator.clipboard?.writeText(resultsText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const saveEstimate = () => {
    if (!results) return;
    setMaterialEstimates((prev) => [{ id: uid(), name: saveName.trim() || `برآورد ${faDigits(prev.length + 1)}`, area: areaNum, results, createdAt: new Date().toISOString() }, ...prev]);
    setSaveName("");
    notify("برآورد ذخیره شد");
  };

  const deleteEstimate = (id) => setMaterialEstimates((prev) => prev.filter((e) => e.id !== id));

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[210] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onClose} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <p style={{ flex: 1, fontSize: FS.subtitle, fontWeight: FW.heavy }}>برآورد مصالح پروژه</p>
          <button onClick={() => setSavedOpen(true)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Layers size={16} color={c.ink} /></button>
          <button onClick={() => setSettingsOpen(true)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Settings2 size={16} color={c.ink} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Two ways to get an area: type it directly, or let Flora work
              it out from the land — a lot of advisors think in lot size and
              floor count, not straight build area. */}
          <div className="flex" style={{ padding: 3, borderRadius: RAD.md, background: c.surface2, marginBottom: SP.lg }}>
            {[["direct", "مساحت ساخت"], ["fromLand", "از متراژ زمین"]].map(([val, label]) => (
              <button key={val} onClick={() => setInputMode(val)} className="press flex-1" style={{ paddingBlock: 9, borderRadius: RAD.md - 2, fontSize: 12, fontWeight: 700, background: inputMode === val ? c.gradientPrimary : "transparent", color: inputMode === val ? "#fff" : c.muted }}>{label}</button>
            ))}
          </div>

          {inputMode === "direct" ? (
            <Field c={c} label="مساحت ساخت (مترمربع)">
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

          {!results ? (
            <EmptyLine c={c} text={inputMode === "direct" ? "مساحت را وارد کن تا مصالح محاسبه شود" : "هر سه مقدار را وارد کن تا مساحت ساخت و مصالح محاسبه شود"} />
          ) : (
            <>
              <div className="rounded-xl p-3 mb-4 flex items-start" style={{ gap: 6, background: c.attnSoft }}>
                <span style={{ fontSize: 11, color: c.attn, lineHeight: 1.8 }}>این محاسبات برآورد اولیه است — مقدار قطعی خرید نیست.</span>
              </div>

              <div className="grid grid-cols-2" style={{ gap: SP.md, marginBottom: SP.lg }}>
                {results.map((m) => <MaterialCard key={m.id} c={c} m={m} onFixUnit={(id) => { setFocusMaterialId(id); setSettingsOpen(true); }} />)}
              </div>

              {anyPriced && (
                <div className="rounded-xl p-3 mb-4 flex items-center justify-between" style={{ background: c.successSoft }}>
                  <span style={{ fontSize: 12, color: c.success, fontWeight: 700 }}>هزینه‌ی تقریبی کل (با قیمت‌های واحدِ ثبت‌شده)</span>
                  <span style={{ fontSize: 15, color: c.success, fontWeight: 800 }}>{fmtToman(totalCost)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <input style={inputStyle(c)} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="نام پروژه برای ذخیره (اختیاری)" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEstimate} className="press flex-1 flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                  <Save size={14} /> ذخیره برآورد
                </button>
                <button onClick={copyResults} className="press flex-1 flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 13, background: c.surface2, fontWeight: 700, fontSize: 13 }}>
                  {copied ? <Check size={14} color={c.success} /> : <Copy size={14} />} {copied ? "کپی شد" : "کپی نتایج"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {settingsOpen && (
        <MaterialSettingsSheet
          c={c} coefficients={coefficients} focusId={focusMaterialId}
          onSave={(next) => { setMaterialCoefficients(next); setSettingsOpen(false); setFocusMaterialId(null); notify("ضرایب ذخیره شد"); }}
          onClose={() => { setSettingsOpen(false); setFocusMaterialId(null); }}
        />
      )}

      {savedOpen && (
        <BodyPortal onClose={() => setSavedOpen(false)}>
          <div className="fixed inset-0 z-[260] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSavedOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390, maxHeight: "75vh", overflowY: "auto" }}>
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.lg }}>برآوردهای ذخیره‌شده</p>
              {materialEstimates.length === 0 ? (
                <EmptyLine c={c} text="هنوز برآوردی ذخیره نشده" />
              ) : (
                <div className="flex flex-col gap-2">
                  {materialEstimates.map((e) => (
                    <div key={e.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{e.name}</p>
                        <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{faDigits(e.area)} مترمربع — {fmtJalali(e.createdAt.slice(0, 10))}</p>
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

// Every coefficient, its unit, and its note — editable, one place. This is
// the ONLY UI that ever changes materialCoefficients; the calc screen only
// reads it.
function MaterialSettingsSheet({ c, coefficients, focusId, onSave, onClose }) {
  const [rows, setRows] = useState(() => coefficients.map((m) => ({ ...m })));
  const update = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 z-[270] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ ...glassSurface(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, padding: SP.xl, maxWidth: 390, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: 4 }}>ضرایب مصالح</p>
          <p style={{ fontSize: 11, color: c.muted, marginBottom: SP.lg, lineHeight: 1.8 }}>ضریب × مساحت = مقدار. قیمت مصالح و دستمزد رو خودت طبق قیمت روز وارد کن — قیمت‌ها روزانه و بین شهرها فرق زیادی داره، Flora نمی‌تونه حدس بزنه.</p>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {rows.map((m) => (
              <div key={m.id} className="rounded-xl p-3" style={{ background: focusId === m.id ? c.attnSoft : c.surface2 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{m.name}</p>
                {m.kind === "range" ? (
                  <div className="flex gap-2 mb-2">
                    <input inputMode="decimal" style={{ ...inputStyle(c), fontSize: 13 }} value={m.factorMin} onChange={(e) => update(m.id, { factorMin: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ضریب حداقل" />
                    <input inputMode="decimal" style={{ ...inputStyle(c), fontSize: 13 }} value={m.factorMax} onChange={(e) => update(m.id, { factorMax: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ضریب حداکثر" />
                  </div>
                ) : (
                  <input inputMode="decimal" style={{ ...inputStyle(c), fontSize: 13, marginBottom: 8 }} value={m.factor} onChange={(e) => update(m.id, { factor: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ضریب" />
                )}
                <input style={{ ...inputStyle(c), fontSize: 13 }} value={m.unit} onChange={(e) => update(m.id, { unit: e.target.value })} placeholder="واحد (مثلاً کیسه، کیلوگرم...)" />
                <div className="flex gap-2" style={{ marginTop: 8 }}>
                  <div style={{ flex: 1 }}><MoneyField c={c} value={m.unitPrice || ""} onChange={(v) => update(m.id, { unitPrice: v })} placeholder="قیمت مصالح" style={{ fontSize: 13 }} /></div>
                  <div style={{ flex: 1 }}><MoneyField c={c} value={m.laborUnitPrice || ""} onChange={(v) => update(m.id, { laborUnitPrice: v })} placeholder="دستمزد واحد" style={{ fontSize: 13 }} /></div>
                </div>
                {m.note && <p style={{ fontSize: 10, color: c.muted, marginTop: 6 }}>{m.note}</p>}
              </div>
            ))}
          </div>
          <button onClick={() => onSave(rows)} className="press w-full rounded-xl mt-4" style={{ paddingBlock: 13, background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>ذخیره ضرایب</button>
        </div>
      </div>
    </BodyPortal>
  );
}

export { MaterialEstimatorHome, MaterialSettingsSheet };
