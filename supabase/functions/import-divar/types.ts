// Shared types for the Divar importer pipeline.
// RawExtracted = whatever the parser could read off the page, still in
// whatever shape/units the source used (Persian digits, strings, etc).
// NormalizedProperty = the same data coerced into the types Flora's own
// property form expects. Nothing here is ever guessed — a field the parser
// didn't find stays null all the way through.

export type ErrorCode =
  | "LINK_INVALID"
  | "PAGE_NOT_ACCESSIBLE"
  | "EXTRACTION_FAILED"
  | "RATE_LIMITED"
  | "PARSER_FAILED";

export interface RawExtracted {
  title: string | null;
  description: string | null;
  price: string | number | null;
  deposit: string | number | null;
  rent: string | number | null;
  area: string | number | null;
  rooms: string | number | null;
  floor: string | number | null;
  totalFloors: string | number | null;
  yearBuilt: string | number | null;
  parking: boolean | null;
  elevator: boolean | null;
  storage: boolean | null;
  location: { lat: number; lng: number } | null;
  images: string[];
  publishedAt: string | null;
  sourceId: string | null;
  sourceUrl: string;
  dealType: string | null;
  propertyType: string | null;
  address: string | null;
}

export interface NormalizedProperty {
  sourceId: string | null;
  sourceUrl: string;
  title: string | null;
  description: string | null;
  dealType: "فروش" | "رهن_و_اجاره" | "پیش‌فروش" | null;
  propertyType: string | null;
  price: number | null;
  deposit: number | null;
  rent: number | null;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  parking: boolean | null;
  elevator: boolean | null;
  storage: boolean | null;
  address: string | null;
  location: { lat: number; lng: number } | null;
  images: string[];
  publishedAt: string | null;
  importedAt: string;
}

export class ImportError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}
