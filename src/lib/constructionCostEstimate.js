// Phase breakdown + full cost math for the Construction Cost Estimator.
// This file NEVER computes area × coefficient itself — every quantity
// comes from computeMaterialEstimate() in materialEstimate.js, the single
// existing source of truth. This file only groups those results into three
// phases and adds price × quantity on top.
import { computeMaterialEstimate } from "./materialEstimate.js";

// Which of the 10 existing material coefficients belongs to which phase —
// grouped exactly the way the person who wrote this feature's spec grouped
// them (phase 1 = foundation/structure materials, phase 2 = skeleton-to-
// plaster materials, phase 3 = finishing materials).
export const PHASE_DEFS = [
  { id: 1, name: "فاز ۱ — فونداسیون و اسکلت", materialIds: ["concrete", "rebar", "joist", "foam"] },
  { id: 2, name: "فاز ۲ — دیوارچینی تا سفیدکاری", materialIds: ["wall", "cement", "block", "cable25", "plaster"] },
  { id: 3, name: "فاز ۳ — نازک‌کاری تا تحویل", materialIds: ["ceramic", "paint"] },
];

// A starting checklist of the miscellaneous, non-material costs the spec
// calls out for each phase (site setup, plumbing, elevator, etc.) — these
// don't scale with area by a simple factor the way the 10 materials do, so
// they're plain name+amount rows the person fills in or removes, not a
// formula. Seeded with zero amounts purely so the phase doesn't start blank.
export const DEFAULT_SUNDRY_BY_PHASE = {
  1: ["تجهیز کارگاه", "خاک‌برداری و حمل خاک", "قالب‌بندی", "اجاره پمپ بتن و تجهیزات"],
  2: ["لوله‌کشی آب و فاضلاب", "برق‌کشی اولیه (کابل، قوطی، لوله)", "عایق‌کاری"],
  3: ["کف‌سازی، سنگ و کاشی", "درب و پنجره", "کابینت و کمد دیواری", "شیرآلات و سرویس بهداشتی", "تأسیسات گرمایشی و سرمایشی", "آسانسور", "روشنایی، کلید و پریز، آیفون", "محوطه‌سازی و نظافت نهایی"],
};

export function makeDefaultSundryRows() {
  const out = {};
  for (const [phaseId, names] of Object.entries(DEFAULT_SUNDRY_BY_PHASE)) {
    out[phaseId] = names.map((name) => ({ id: `${phaseId}-${name}`, name, amount: "" }));
  }
  return out;
}

const round = (n) => Math.round(n);

// The one place quantity × price happens for a material row. A range
// (ceramic) uses its higher end for cost, same convention as the simple
// Material Estimator — "at most" reads more usefully than "at least" when
// money is involved.
function materialQty(m) { return m.kind === "range" ? m.valueMax : m.value; }

// Per spec section 9: manual price always wins if present; otherwise an
// internet-sourced price is used if one was fetched; otherwise the item is
// left uncosted rather than guessed.
function effectivePrice(manual, internet) {
  if (manual !== undefined && manual !== null && manual !== "") return Number(manual);
  if (internet?.price) return Number(internet.price);
  return null;
}

// coefficients: the existing materialCoefficients array (each may carry
// unitPrice, unitPriceInternet, laborUnitPrice, laborUnitPriceInternet).
// sundryByPhase: { [phaseId]: [{ id, name, amount, amountInternet }] }
export function computePhaseBreakdown(area, coefficients, sundryByPhase) {
  const results = computeMaterialEstimate(area, coefficients);
  const byId = Object.fromEntries(results.map((m) => [m.id, m]));

  const phases = PHASE_DEFS.map((def) => {
    const rows = def.materialIds.map((id) => byId[id]).filter(Boolean).map((m) => {
      const qty = materialQty(m);
      const matPrice = effectivePrice(m.unitPrice, m.unitPriceInternet);
      const laborPrice = effectivePrice(m.laborUnitPrice, m.laborUnitPriceInternet);
      return {
        ...m,
        qty,
        materialCost: matPrice != null ? round(qty * matPrice) : null,
        laborCost: laborPrice != null ? round(qty * laborPrice) : null,
      };
    });
    const sundryRows = (sundryByPhase?.[def.id] || []).map((s) => ({
      ...s,
      cost: effectivePrice(s.amount, s.amountInternet),
    }));

    const materialTotal = rows.reduce((sum, r) => sum + (r.materialCost || 0), 0);
    const laborTotal = rows.reduce((sum, r) => sum + (r.laborCost || 0), 0);
    const sundryTotal = sundryRows.reduce((sum, r) => sum + (r.cost || 0), 0);
    const phaseTotal = materialTotal + laborTotal + sundryTotal;

    return { ...def, rows, sundryRows, materialTotal, laborTotal, sundryTotal, phaseTotal };
  });

  const grandTotal = phases.reduce((sum, p) => sum + p.phaseTotal, 0);
  const totalMaterial = phases.reduce((sum, p) => sum + p.materialTotal, 0);
  const totalLabor = phases.reduce((sum, p) => sum + p.laborTotal, 0);
  const totalSundry = phases.reduce((sum, p) => sum + p.sundryTotal, 0);
  const costPerArea = area > 0 ? round(grandTotal / area) : 0;

  return { phases, grandTotal, totalMaterial, totalLabor, totalSundry, costPerArea };
}
