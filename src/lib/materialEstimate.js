// Central material-estimate calculation — every coefficient lives here as
// the shipped default, and the one function below is the only place area×
// factor math happens. The estimator UI never computes a material amount
// itself; it always goes through computeMaterialEstimate.
//
// Units for گچ (plaster) and رنگ (paint) are intentionally left empty —
// the person who wrote the spec for this feature was explicit that these
// two units aren't actually known and shouldn't be guessed. They show as
// "تعیین نشده" in the UI until someone sets a real unit in settings.
export const DEFAULT_MATERIAL_COEFFICIENTS = [
  { id: "concrete", name: "بتن", kind: "single", factor: 0.4, unit: "مترمکعب", note: "" },
  { id: "rebar", name: "میلگرد", kind: "single", factor: 0.45, unit: "تن", note: "" },
  { id: "joist", name: "تیرچه", kind: "single", factor: 1.5, unit: "متر", note: "" },
  { id: "foam", name: "یونولیت", kind: "single", factor: 0.68, unit: "عدد", note: "" },
  { id: "ceramic", name: "سرامیک", kind: "range", factorMin: 1, factorMax: 1.1, unit: "مترمربع", note: "بازه‌ی حداقل تا حداکثر" },
  { id: "cable25", name: "کابل ۲.۵", kind: "single", factor: 3, unit: "متر", note: "" },
  { id: "plaster", name: "گچ", kind: "single", factor: 15, unit: "", note: "ضخامت ۲ سانتی‌متر" },
  { id: "wall", name: "دیوارچینی", kind: "single", factor: 1.7, unit: "مترمربع", note: "" },
  { id: "block", name: "بلوک", kind: "single", factor: 12.5, unit: "عدد", note: "" },
  { id: "paint", name: "رنگ", kind: "single", factor: 0.5, unit: "", note: "معادل مساحت ÷ ۲" },
];

const round = (n) => Math.round(n * 100) / 100;

// coefficients defaults to the shipped list, but always accepts whatever
// the person has edited in settings — this is the only function that reads
// a coefficient and multiplies it by area, anywhere in the app.
export function computeMaterialEstimate(area, coefficients = DEFAULT_MATERIAL_COEFFICIENTS) {
  const a = Number(area) || 0;
  return coefficients.map((m) => {
    if (m.kind === "range") {
      return { ...m, valueMin: round(a * (Number(m.factorMin) || 0)), valueMax: round(a * (Number(m.factorMax) || 0)) };
    }
    return { ...m, value: round(a * (Number(m.factor) || 0)) };
  });
}
