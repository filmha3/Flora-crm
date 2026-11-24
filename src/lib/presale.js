// Pure logic for «پیش‌فروش پروژه‌ها»: draft generation, numbering, layout, summary.
// No DOM / no Supabase here — everything is derived from structured project data.
export const STATUS = {
  available: { label: "موجود", color: "#22A06B" },
  sold: { label: "فروخته شده", color: "#E5484D" },
  reserved: { label: "رزرو شده", color: "#F5A524" },
};
export const STATUS_KEYS = ["available", "reserved", "sold"];

export const unitNumber = (floor, i) => String(floor * 100 + i + 1);
let _k = 0;
export const tmpId = () => `new-${Date.now().toString(36)}-${_k++}`;

// Default draft: `floors` floors × `unitsPerFloor` units, areas cycling through `areas`.
export function generateDraft(floors, unitsPerFloor, areas, pricePerSqm) {
  const list = areas.filter((a) => a > 0);
  return Array.from({ length: floors }, (_, f) => ({
    floor_number: f + 1,
    units: Array.from({ length: unitsPerFloor }, (_, i) => {
      const area = list.length ? list[i % list.length] : 100;
      return { key: tmpId(), unit_number: unitNumber(f + 1, i), area, price: pricePerSqm > 0 ? Math.round(area * pricePerSqm) : null };
    }),
  }));
}

// Resize a draft after the floor count / units-per-floor changed, keeping existing floors & units.
export function resizeDraft(draft, floors, unitsPerFloor, areas, pricePerSqm) {
  const fresh = generateDraft(floors, unitsPerFloor, areas, pricePerSqm);
  return fresh.map((fl) => {
    const old = draft.find((d) => d.floor_number === fl.floor_number);
    if (!old) return fl;
    const units = old.units.slice(0, unitsPerFloor);
    for (let i = units.length; i < unitsPerFloor; i++) units.push(fl.units[i]);
    return { ...fl, units };
  });
}

export const summarize = (units) => {
  const s = { total: units.length, available: 0, sold: 0, reserved: 0, soldValue: 0, remainingValue: 0, hasPrices: false };
  units.forEach((u) => {
    s[u.status] = (s[u.status] || 0) + 1;
    if (u.price > 0) { s.hasPrices = true; if (u.status === "sold") s.soldValue += +u.price; if (u.status === "available") s.remainingValue += +u.price; }
  });
  s.pct = s.total ? Math.round((s.sold / s.total) * 100) : 0;
  return s;
};

// Order units inside a floor by position_configuration.order (falls back to unit number).
export const orderedUnits = (units) =>
  [...units].sort((a, b) => (a.position_configuration?.order ?? 1e6) - (b.position_configuration?.order ?? 1e6) || String(a.unit_number).localeCompare(String(b.unit_number), "en", { numeric: true }));

// Schematic plan: rows of units (flex-grow ∝ area) around a shared core. Honors manual `row` (0 top / 1 bottom).
export function planRows(units) {
  const list = orderedUnits(units);
  const manual = list.some((u) => u.position_configuration?.row != null);
  if (manual) return [list.filter((u) => (u.position_configuration?.row ?? 0) === 0), list.filter((u) => u.position_configuration?.row === 1)];
  if (list.length >= 4) { const h = Math.ceil(list.length / 2); return [list.slice(0, h), list.slice(h)]; }
  return [list, []];
}

export const floorStats = (units) => summarize(units);

