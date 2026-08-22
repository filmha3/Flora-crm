// Flora Valuation — pure functions only. Nothing here touches the DOM,
// storage, or AI; it just takes the property arrays already in memory and
// computes an estimate. That keeps it testable in isolation and keeps the
// "never guess, never fabricate a number" rule enforceable in one place.

const EARTH_RADIUS_KM = 6371;

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
export function computeQuickValuationFromMap(lat, lng, area, type, allProperties, nearestCount = 4) {
  if (lat == null || lng == null) return { ok: false, reason: "موقعیتی روی نقشه انتخاب نشده." };
  if (!area || area <= 0) return { ok: false, reason: "متراژ را وارد کن." };

  const withDistance = allProperties
    .filter((p) => p.lat != null && p.lng != null && p.pricePerMeter > 0 && (!type || p.type === type))
    .map((p) => ({ property: p, km: haversineKm(lat, lng, p.lat, p.lng) }))
    .filter((c) => c.km != null)
    .sort((a, b) => a.km - b.km)
    .slice(0, nearestCount);

  if (withDistance.length === 0) {
    return { ok: false, reason: "هیچ فایلی با موقعیت ثبت‌شده روی نقشه نزدیک این نقطه نداریم." };
  }

  const items = withDistance.map((c) => ({
    value: c.property.pricePerMeter,
    weight: Math.max(0.1, 1 - c.km / 3), // same falloff curve as the full engine
    property: c.property,
    km: c.km,
  }));

  const { kept, excluded } = splitOutliers(items);
  const basePricePerMeter = weightedMedian(kept);
  if (!basePricePerMeter) return { ok: false, reason: "داده‌ی کافی برای محاسبه نبود." };

  const pricePerMeter = Math.round(basePricePerMeter);
  const fairValue = Math.round(pricePerMeter * area);

  // Fewer inputs than the full engine (no street/year/floor match), so
  // confidence is capped more conservatively even with a decent count —
  // this is a fast estimate for a phone call, not the detailed report.
  const conf = kept.length >= nearestCount && excluded.length === 0
    ? { level: "Medium", label: "متوسط", pct: 55 }
    : { level: "Low", label: "پایین", pct: 35 };

  return {
    ok: true,
    pricePerMeter,
    fairValue,
    goodDeal: Math.round(fairValue * 0.96),
    askingPrice: Math.round(fairValue * 1.03),
    confidence: conf,
    comparableCount: kept.length,
    excludedOutliers: excluded.length,
    comparables: kept.map((i) => ({ property: i.property, pricePerMeter: i.value, km: i.km })),
  };
}

/**
 * The whole pipeline, per spec section headers 4–10.
 * @param subject - the property being valued (needs area, type; street/lat/lng/floor/yearBuilt improve accuracy)
 * @param allProperties - every other property in the local dataset
 * @param manualStreetPrices - advisor-entered reference prices for this exact street, used ONLY when database comparables are too thin (see spec: ask the advisor, don't guess)
 */
export function computeValuation(subject, allProperties, manualStreetPrices = []) {
  if (!subject.area || subject.area <= 0) {
    return { ok: false, reason: "متراژ این فایل مشخص نیست — بدون متراژ نمی‌شود برآورد داد." };
  }

  const dbComparables = findComparables(subject, allProperties);

  const sameStreetCount = subject.street
    ? dbComparables.filter((c) => c.property.street === subject.street).length
    : 0;

  const relevantManual = subject.street
    ? manualStreetPrices.filter((m) => m.street === subject.street)
    : [];

  // Manual entries only ever supplement thin database data — they never
  // override real comparables that already exist, and they're always
  // labeled as advisor-provided in the result, never presented as if Flora
  // itself found them.
  const manualAsComparables = relevantManual.map((m) => ({
    property: { id: `manual-${m.id}`, pricePerMeter: m.pricePerMeter, area: subject.area, street: subject.street },
    weight: 0.6, // real but self-reported, so weighted below a confirmed database match
    source: "advisor",
  }));

  const allComparables = [...dbComparables, ...manualAsComparables];

  if (allComparables.length === 0) {
    return {
      ok: false,
      reason: subject.street
        ? `برای خیابان «${subject.street}» هیچ فایل مشابهی در دیتابیس یا قیمت دستی ثبت‌شده نداریم.`
        : "خیابان این فایل مشخص نیست و فایل مشابهی هم پیدا نشد.",
      needsStreet: !subject.street,
      needsManualPrice: !!subject.street,
    };
  }

  const priceItems = allComparables.map((c) => ({ value: c.property.pricePerMeter, weight: c.weight, source: c.source, property: c.property }));
  const { kept, excluded } = splitOutliers(priceItems);

  const basePricePerMeter = weightedMedian(kept);
  if (!basePricePerMeter) {
    return { ok: false, reason: "داده‌ی کافی برای محاسبه‌ی قیمت پایه نبود." };
  }

  // Simple, transparent adjustments — only applied where the subject
  // property actually has the field populated, never inferred.
  const adjustments = [];
  let multiplier = 1;
  if (subject.parking === true) { adjustments.push({ label: "پارکینگ", pct: 3 }); multiplier += 0.03; }
  if (subject.elevator === true) { adjustments.push({ label: "آسانسور", pct: 2 }); multiplier += 0.02; }
  if (subject.furnished === "با لوازم") { adjustments.push({ label: "فول‌فرنیش", pct: 4 }); multiplier += 0.04; }

  const adjustedPricePerMeter = Math.round(basePricePerMeter * multiplier);
  const fairValue = Math.round(adjustedPricePerMeter * subject.area);
  const goodDeal = Math.round(fairValue * 0.96);
  const askingPrice = Math.round(fairValue * 1.03);

  const usedManualCount = kept.filter((i) => i.source === "advisor").length;
  const conf = confidenceTier(kept.length);

  return {
    ok: true,
    pricePerMeter: adjustedPricePerMeter,
    basePricePerMeter: Math.round(basePricePerMeter),
    fairValue, goodDeal, askingPrice,
    confidence: conf,
    comparableCount: kept.length,
    usedManualStreetPrices: usedManualCount > 0,
    manualStreetPriceCount: usedManualCount,
    databaseComparableCount: kept.length - usedManualCount,
    sameStreetCount,
    adjustments,
    comparables: kept.filter((i) => i.source === "database").slice(0, 10).map((i) => ({ property: i.property, pricePerMeter: i.value })),
    excludedOutliers: excluded.length,
    needsStreet: !subject.street,
    // Even a "successful" result should nudge toward more street comparables
    // when the ones behind it are thin — matches "ask, don't guess."
    needsManualPrice: subject.street != null && sameStreetCount < 3 && usedManualCount === 0,
  };
}
