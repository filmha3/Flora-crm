// Flora Valuation — pure functions only. Nothing here touches the DOM,
// storage, or AI; it just takes the property arrays already in memory and
// computes an estimate. That keeps it testable in isolation and keeps the
// "never guess, never fabricate a number" rule enforceable in one place.

import { gregorianToJalali } from "./format.js";

const EARTH_RADIUS_KM = 6371;

// ---------- Full multiplicative formula ----------
// قیمت نهایی هر متر = قیمت پایه منطقه × ضریب سن × ضریب موقعیت × ضریب ویو ×
// ضریب طبقه × ضریب کیفیت ساختمان × ضریب فرنیش
// Every table below is copied exactly from the spec — nothing rounded or
// re-derived. A factor that wasn't specified for a property defaults to its
// "معمولی" (neutral, ×1.00) tier rather than blocking the calculation —
// that's a real, standard appraisal convention ("assume average" when
// something genuinely isn't known), not a guessed number. Which factors
// were defaulted vs. actually provided is tracked and surfaced, never
// silently hidden.

const AGE_TIERS = [
  { maxYears: 2, coef: 1.00, label: "0 تا 2 سال" },
  { maxYears: 5, coef: 0.96, label: "3 تا 5 سال" },
  { maxYears: 8, coef: 0.92, label: "6 تا 8 سال" },
  { maxYears: 12, coef: 0.87, label: "9 تا 12 سال" },
  { maxYears: 17, coef: 0.82, label: "13 تا 17 سال" },
  { maxYears: 25, coef: 0.75, label: "18 تا 25 سال" },
  { maxYears: Infinity, coef: 0.68, label: "بیش از 25 سال" },
];

export const LOCATION_QUALITY_COEF = { "ضعیف": 0.90, "معمولی": 1.00, "خوب": 1.07, "ممتاز": 1.15 };
export const VIEW_CATEGORY_COEF = {
  "بدون ویو": 0.90, "حیاط معمولی": 0.97, "کوچه معمولی": 1.00,
  "خیابان خوب": 1.05, "ویوی باز": 1.08, "ویوی ممتاز": 1.15,
};
export const FLOOR_CATEGORY_COEF = { "همکف نامطلوب": 0.93, "طبقه میانی": 1.00, "طبقه بالا با ویو": 1.05, "طبقه آخر": 1.00 };
export const BUILDING_QUALITY_COEF = { "ضعیف": 0.92, "معمولی": 1.00, "خوب": 1.05, "خیلی خوب": 1.10, "لوکس": 1.15 };
export const FURNISH_LEVEL_COEF = { "خالی": 1.00, "نیمه‌فرنیش": 1.03, "فول‌فرنیش معمولی": 1.07, "فول‌فرنیش خوب": 1.12, "فول‌فرنیش لوکس": 1.18 };

export function currentJalaliYear() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())[0];
}

function ageCoefficientFromYearBuilt(yearBuiltJalali) {
  if (!yearBuiltJalali) return null;
  const age = currentJalaliYear() - yearBuiltJalali;
  if (age < 0) return null; // a future build year isn't real data — treat as unknown, don't guess
  for (const tier of AGE_TIERS) if (age <= tier.maxYears) return { coef: tier.coef, label: tier.label, age };
  return null;
}

/**
 * Base area price: the mean price/meter of at least 3 real comparable
 * properties — an explicit, hard minimum per spec (not just a confidence
 * signal). Reuses the same comparable-finding logic as the rest of the
 * engine (same street prioritized, geography as fallback, outliers
 * removed) but averages rather than weight-medians, since the formula
 * calls for a straightforward mean of similar units.
 */
export function computeBaseAreaPrice(subject, allProperties, manualStreetPrices = []) {
  const dbComparables = findComparables(subject, allProperties);
  const relevantManual = subject.street ? manualStreetPrices.filter((m) => m.street === subject.street) : [];
  const manualAsComparables = relevantManual.map((m) => ({ property: { id: `manual-${m.id}`, pricePerMeter: m.pricePerMeter }, weight: 1, source: "advisor" }));
  const all = [...dbComparables, ...manualAsComparables];

  const priceItems = all.map((c) => ({ value: c.property.pricePerMeter, weight: c.weight, source: c.source, property: c.property }));
  const { kept, excluded } = splitOutliers(priceItems);

  if (kept.length < 3) {
    return {
      ok: false,
      count: kept.length,
      reason: subject.street
        ? `برای «${subject.street}» فقط ${kept.length} فایل مشابه داریم — حداقل ۳ فایل لازم است. قیمت واحدهای بیشتری از این خیابان وارد کن.`
        : "حداقل ۳ فایل مشابه لازم است — خیابان را مشخص کن یا قیمت واحدهای بیشتری وارد کن.",
      needsStreet: !subject.street,
      needsManualPrice: true,
    };
  }

  const mean = kept.reduce((s, i) => s + i.value, 0) / kept.length;
  return {
    ok: true,
    basePricePerMeter: Math.round(mean),
    count: kept.length,
    excludedOutliers: excluded.length,
    usedManualStreetPrices: kept.some((i) => i.source === "advisor"),
    comparables: kept.filter((i) => i.source === "database").map((i) => ({ property: i.property, pricePerMeter: i.value })),
  };
}

/**
 * The full spec'd formula. Every coefficient applied is returned in
/**
 * Applies all 6 formula factors to a base price/meter — shared by the
 * street-based full engine and the map-based quick engine, so both compute
 * identically once they have a base price, whatever method got them there.
 */
export function applyFormulaFactors(basePricePerMeter, subject) {
  const factors = [];
  let multiplier = 1;

  const ageResult = ageCoefficientFromYearBuilt(subject.yearBuilt);
  if (ageResult) { factors.push({ name: "سن بنا", label: ageResult.label, coef: ageResult.coef, provided: true }); multiplier *= ageResult.coef; }
  else factors.push({ name: "سن بنا", label: "نامشخص (فرض متوسط)", coef: 1, provided: false });

  const pushCoef = (name, table, value, neutralLabel) => {
    if (value && table[value] != null) { factors.push({ name, label: value, coef: table[value], provided: true }); multiplier *= table[value]; }
    else factors.push({ name, label: `نامشخص (فرض ${neutralLabel})`, coef: 1, provided: false });
  };
  pushCoef("موقعیت", LOCATION_QUALITY_COEF, subject.locationQuality, "معمولی");
  pushCoef("ویو/جهت", VIEW_CATEGORY_COEF, subject.viewCategory, "کوچه معمولی");
  pushCoef("طبقه", FLOOR_CATEGORY_COEF, subject.floorCategory, "طبقه میانی");
  pushCoef("کیفیت ساختمان", BUILDING_QUALITY_COEF, subject.buildingQuality, "معمولی");
  pushCoef("فرنیش", FURNISH_LEVEL_COEF, subject.furnishLevel, "خالی");

  return { pricePerMeter: Math.round(basePricePerMeter * multiplier), multiplier, factors };
}

/**
 * `factors` with whether it was provided or defaulted, so the caller can
 * be honest about what actually went into the number.
 */
export function computeFormulaValuation(subject, allProperties, manualStreetPrices = []) {
  if (!subject.area || subject.area <= 0) return { ok: false, reason: "متراژ این فایل مشخص نیست." };

  const base = computeBaseAreaPrice(subject, allProperties, manualStreetPrices);
  if (!base.ok) return base;

  const { pricePerMeter, multiplier, factors } = applyFormulaFactors(base.basePricePerMeter, subject);
  const fairValue = Math.round(pricePerMeter * subject.area);

  return {
    ok: true,
    basePricePerMeter: base.basePricePerMeter,
    pricePerMeter,
    multiplier,
    factors,
    fairValue,
    quickSale: Math.round(fairValue * 0.95),      // قیمت فروش سریع
    fairPrice: fairValue,                          // قیمت منصفانه
    askingPrice: Math.round(fairValue * 1.075),    // وسط بازه‌ی ۱.۰۵ تا ۱.۱۰
    comparableCount: base.count,
    excludedOutliers: base.excludedOutliers,
    usedManualStreetPrices: base.usedManualStreetPrices,
    comparables: base.comparables,
    needsStreet: !subject.street,
  };
}

/**
 * One sentence built from the formula's own factor list — only the ones
 * actually provided (not defaulted to neutral), so it never claims a
 * property is "طبقه بالا با ویو" or any other category nobody confirmed.
 */
export function buildFormulaExplanation(result) {
  if (!result?.ok || !result.factors) return null;
  const parts = result.factors.filter((f) => f.provided).map((f) => f.name === "سن بنا" ? `سن بنا ${f.label}` : f.label);
  if (parts.length === 0) return null;
  return `بر اساس ${parts.join("، ")}.`;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Confidence tiers as specified — realistic data volume for a single agent
// will often land in Low/Medium, and that's shown honestly rather than
// inflated.
export function confidenceTier(comparableCount) {
  if (comparableCount >= 20) return { level: "High", label: "بالا", pct: 90 };
  if (comparableCount >= 11) return { level: "Good", label: "خوب", pct: 75 };
  if (comparableCount >= 6) return { level: "Medium", label: "متوسط", pct: 55 };
  if (comparableCount >= 3) return { level: "Low", label: "پایین", pct: 35 };
  return { level: "VeryLow", label: "خیلی پایین", pct: 15 };
}

// A comparable's weight: closer, more similar, and more recent all count
// for more. Each factor is 0..1 and multiplied together rather than summed,
// so a comparable that's wildly different on even one dimension (e.g. a
// property 3km away) can't be rescued by being similar on the others.
function similarityWeight(subject, candidate) {
  let distanceFactor;
  if (subject.lat != null && subject.lng != null && candidate.lat != null && candidate.lng != null) {
    const km = haversineKm(subject.lat, subject.lng, candidate.lat, candidate.lng);
    distanceFactor = km == null ? 0.02 : Math.max(0.05, 1 - km / 3); // ~0 weight past 3km
  } else if (subject.street && candidate.street && subject.street === candidate.street) {
    distanceFactor = 1; // no coordinates, but confirmed same street
  } else {
    // Neither real coordinates nor a confirmed street match — there is no
    // honest basis to call this a comparable at all. A property from a
    // completely unrelated street must not silently influence the result
    // just because it's the same property type; below the findComparables
    // 0.05 cutoff, so it gets filtered out entirely rather than weakly
    // included.
    distanceFactor = 0.02;
  }

  const areaFactor = subject.area && candidate.area
    ? Math.max(0.1, 1 - Math.abs(subject.area - candidate.area) / Math.max(subject.area, 40))
    : 0.6;

  const yearFactor = subject.yearBuilt && candidate.yearBuilt
    ? Math.max(0.3, 1 - Math.abs(subject.yearBuilt - candidate.yearBuilt) / 15)
    : 0.7; // unknown year on either side — don't let it zero out the comparable

  const floorFactor = subject.floor != null && candidate.floor != null
    ? Math.max(0.5, 1 - Math.abs(subject.floor - candidate.floor) / 10)
    : 0.8;

  // Newer listings reflect the current market better than year-old ones.
  const daysOld = candidate.createdAt ? (Date.now() - new Date(candidate.createdAt).getTime()) / 86400000 : 180;
  const freshnessFactor = Math.max(0.3, 1 - daysOld / 365);

  return distanceFactor * areaFactor * yearFactor * floorFactor * freshnessFactor;
}

// Same-street match first, then same type/deal, excluding the subject
// itself and anything without a usable price/meter.
export function findComparables(subject, allProperties) {
  return allProperties
    .filter((p) => p.id !== subject.id && p.pricePerMeter > 0 && p.type === subject.type)
    .map((p) => ({ property: p, weight: similarityWeight(subject, p), source: "database" }))
    .filter((c) => c.weight > 0.05)
    .sort((a, b) => b.weight - a.weight);
}

// Median of a weighted set — sort by value, walk weight-mass until the
// midpoint is crossed. More robust to a handful of odd listings than a
// weighted mean would be, per the "don't let one outlier skew everything" rule.
export function weightedMedian(items) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) return null;
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= totalWeight / 2) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

// IQR-based outlier flagging — never removes anything silently; the caller
// gets both the kept set and the excluded list so it can be shown in the UI
// ("Excluded Outlier"), per spec.
export function splitOutliers(items) {
  if (items.length < 4) return { kept: items, excluded: [] };
  const values = [...items].map((i) => i.value).sort((a, b) => a - b);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const kept = items.filter((i) => i.value >= lower && i.value <= upper);
  const excluded = items.filter((i) => i.value < lower || i.value > upper);
  return { kept, excluded };
}

/**
 * Quick, map-first valuation for a phone-call moment — no saved property
 * needed yet. Uses exactly the N nearest real properties by geographic
 * distance (default 4, per the requested "4 nearest from the map"), not the
 * full weighted engine across the whole dataset. Distance is still the
 * weighting factor among those N, so the closest of the four still counts
 * for more than the farthest.
 */
/**
 * Quick, map-first valuation for a phone-call moment — no saved property
 * needed yet. Uses exactly the N nearest real properties by geographic
 * distance (default 4, per "4 nearest from the map"). Same hard minimum of
 * 3 comparables and the same mean-based base price as the full engine —
 * one formula, two ways of finding the comparable set.
 */
export function computeQuickValuationFromMap(lat, lng, area, type, allProperties, nearestCount = 4, extras = {}) {
  if (lat == null || lng == null) return { ok: false, reason: "موقعیتی روی نقشه انتخاب نشده." };
  if (!area || area <= 0) return { ok: false, reason: "متراژ را وارد کن." };

  const withDistance = allProperties
    .filter((p) => p.lat != null && p.lng != null && p.pricePerMeter > 0 && (!type || p.type === type))
    .map((p) => ({ property: p, km: haversineKm(lat, lng, p.lat, p.lng) }))
    .filter((c) => c.km != null)
    .sort((a, b) => a.km - b.km)
    .slice(0, nearestCount);

  const items = withDistance.map((c) => ({ value: c.property.pricePerMeter, property: c.property, km: c.km }));
  const { kept, excluded } = splitOutliers(items);

  if (kept.length < 3) {
    return { ok: false, reason: `فقط ${kept.length} فایل نزدیک این نقطه پیدا شد — حداقل ۳ فایل لازم است.`, count: kept.length };
  }

  const basePricePerMeter = kept.reduce((s, i) => s + i.value, 0) / kept.length;
  const { pricePerMeter, multiplier, factors } = applyFormulaFactors(basePricePerMeter, extras);
  const fairValue = Math.round(pricePerMeter * area);

  return {
    ok: true,
    pricePerMeter,
    basePricePerMeter: Math.round(basePricePerMeter),
    multiplier,
    factors,
    fairValue,
    quickSale: Math.round(fairValue * 0.95),
    fairPrice: fairValue,
    askingPrice: Math.round(fairValue * 1.075),
    comparableCount: kept.length,
    excludedOutliers: excluded.length,
    comparables: kept.map((i) => ({ property: i.property, pricePerMeter: i.value, km: i.km })),
  };
}

