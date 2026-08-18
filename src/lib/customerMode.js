// Customer Mode's entire security model lives in this one file: a pure
// price-display function that never touches the real price, and a
// whitelist transform that is the ONLY thing allowed to construct what the
// customer-facing screen renders.
//
// Deliberately a whitelist, not a blacklist. The spec's own section 17
// lists fields to hide (realPrice, ownerPhone, internalNotes, ...) — but a
// blacklist only protects against fields someone remembered to name. A
// property added a new field next year (say, "purchasePrice" for a flip)
// and nobody updates the hide-list, it leaks straight to a customer's
// screen. A whitelist can't leak a field it was never told to include,
// which is the stronger guarantee for something this sensitive.

/**
 * Pure function — computes a display price per meter for showing to a
 * customer. Never reads or writes anything beyond its two arguments; never
 * touches the database; the real price is untouched by calling this.
 */
export function calculateCustomerDisplayPrice(realPricePerMeter, markupPerMeter = 3000000) {
  const real = Number(realPricePerMeter) || 0;
  const markup = Number(markupPerMeter) || 0;
  return real + markup;
}

/**
 * The ONLY function allowed to build what a customer's screen receives.
 * Everything not explicitly copied here is inaccessible to the customer
 * view — not hidden by CSS, not omitted by convention, structurally absent
 * from the object that gets rendered.
 *
 * @param {object} property - the real, full property record
 * @param {object} opts - { showPrice: boolean, markupPerMeter?: number }
 */
export function toCustomerView(property, opts = {}) {
  const { showPrice = false, markupPerMeter = 3000000 } = opts;

  const view = {
    id: property.id,
    title: property.title || "",
    images: (property.media || []).filter((m) => m.type === "image").map((m) => m.url),
    size: property.area ?? null,
    bedrooms: property.rooms ?? null,
    floor: property.floor ?? null,
    features: [
      property.furnished === "با لوازم" ? "با لوازم" : null,
      property.type || null,
    ].filter(Boolean),
    description: property.desc || "",
  };

  // Real price only ever exists on the agent's own side. A customer view is
  // built with showPrice=false by default — the caller has to explicitly
  // opt in per spec section 24 (customerMode && showCustomerPrice both true).
  if (showPrice && property.pricePerMeter) {
    const displayPerMeter = calculateCustomerDisplayPrice(property.pricePerMeter, markupPerMeter);
    view.customerDisplayPricePerMeter = displayPerMeter;
    view.customerDisplayTotalPrice = property.area ? displayPerMeter * property.area : null;
  }

  return view;
}

// Size-category boundaries used by the Files accordion. A single source of
// truth so the grouping logic and any future filter/search UI agree on
// exactly the same cutoffs.
export const SIZE_CATEGORIES = [
  { key: "under100", label: "زیر ۱۰۰ متر", min: 0, max: 99 },
  { key: "100to150", label: "۱۰۰ تا ۱۵۰ متر", min: 100, max: 150 },
  { key: "150to250", label: "۱۵۰ تا ۲۵۰ متر", min: 151, max: 250 },
  { key: "over250", label: "بالای ۲۵۰ متر", min: 251, max: Infinity },
];

export function sizeCategoryOf(area) {
  const n = Number(area) || 0;
  return SIZE_CATEGORIES.find((cat) => n >= cat.min && n <= cat.max) || SIZE_CATEGORIES[0];
}
