// Coerces whatever the parser found (Persian digits, mixed strings) into
// clean numbers/booleans. A value the parser never found stays null here —
// normalization never invents data, only reshapes what already exists.
import type { RawExtracted, NormalizedProperty } from "./types.ts";

const FA_DIGITS: Record<string, string> = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };

export function toEnglishDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGITS[d] ?? d);
}

export function toNumberOrNull(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = toEnglishDigits(String(raw)).replace(/[,٬\s]/g, "").replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const DEAL_TYPES = new Set(["فروش", "رهن_و_اجاره", "پیش‌فروش"]);

export function normalize(raw: RawExtracted): NormalizedProperty {
  const price = toNumberOrNull(raw.price);
  const deposit = toNumberOrNull(raw.deposit);
  const rent = toNumberOrNull(raw.rent);
  return {
    sourceId: raw.sourceId || null,
    sourceUrl: raw.sourceUrl,
    title: raw.title || null,
    description: raw.description || null,
    dealType: (raw.dealType && DEAL_TYPES.has(raw.dealType) ? raw.dealType : null) as NormalizedProperty["dealType"] ?? (rent || deposit ? "رهن_و_اجاره" : price ? "فروش" : null),
    propertyType: raw.propertyType || null,
    price, deposit, rent,
    area: toNumberOrNull(raw.area),
    rooms: toNumberOrNull(raw.rooms),
    floor: toNumberOrNull(raw.floor),
    totalFloors: toNumberOrNull(raw.totalFloors),
    yearBuilt: toNumberOrNull(raw.yearBuilt),
    parking: typeof raw.parking === "boolean" ? raw.parking : null,
    elevator: typeof raw.elevator === "boolean" ? raw.elevator : null,
    storage: typeof raw.storage === "boolean" ? raw.storage : null,
    address: raw.address || null,
    location: raw.location || null,
    images: raw.images || [],
    publishedAt: raw.publishedAt || null,
    importedAt: new Date().toISOString(),
  };
}
