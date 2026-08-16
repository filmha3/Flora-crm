// Extraction pipeline, in priority order:
//   1. Structured data   (JSON-LD, __NEXT_DATA__ hydration payload)
//   2. Page metadata     (OpenGraph / meta tags)
//   3. Known fields      (a labeled attributes row: "متراژ: ۱۲۰")
//   4. Text parser        (a bare number-unit pattern anywhere in title/body,
//                          e.g. "۱۲۰ متری" with no "متراژ:" label at all)
// Each stage only fills in what the previous stage left null. Area/rooms/
// yearBuilt additionally carry a confidence level — "high" for structured
// or clearly-labeled values, "medium" for values found by the bare-pattern
// text parser, "low" when multiple conflicting candidates were found and
// the parser had to pick one. The caller (index.ts / the frontend preview)
// decides what to do with "low" — this file never upgrades its own
// confidence just because a value would be convenient to trust.
//
// Honesty note for whoever maintains this: divar.ir's robots.txt disallows
// automated access, so this was written against general schema.org /
// OpenGraph / Next.js hydration conventions rather than a live listing page
// — no environment available while building this had a route to fetch one
// to confirm exact selectors. The structured-data and metadata stages are
// commodity web standards and should hold regardless of Divar-specific
// markup; the text-parser stage (section 9 below) is the part most likely
// to need real-world tuning against actual listing HTML.
import type { RawExtracted, Confidence } from "./types.ts";
import { collectImages } from "./imageExtractor.ts";

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();
}

// ---------- 1. Structured data ----------

function extractJsonLdBlocks(html: string): any[] {
  const blocks: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else if (Array.isArray(parsed?.["@graph"])) blocks.push(...parsed["@graph"]);
      else blocks.push(parsed);
    } catch { /* malformed block — skip it, don't fail the whole parse over one bad script tag */ }
  }
  return blocks;
}

function findListingNode(blocks: any[]): any | null {
  return blocks.find((b) => {
    const t = b?.["@type"];
    const types = Array.isArray(t) ? t : [t];
    return types.some((x) => typeof x === "string" && /Product|Offer|RealEstate|Residence|Place|Apartment|House|SingleFamilyResidence/i.test(x));
  }) || null;
}

function extractNextData(html: string): any | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// Walks an arbitrary object tree looking for a node that looks like a
// listing payload (has a title-ish + price-ish field together). Framework
// hydration payloads nest data unpredictably deep, so this is intentionally
// shape-based rather than path-based.
function findListingInNextData(node: any, depth = 0): any | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  const keys = Object.keys(node);
  const hasTitle = keys.some((k) => /title|name/i.test(k));
  const hasPrice = keys.some((k) => /price|amount/i.test(k));
  if (hasTitle && hasPrice) return node;
  for (const k of keys) {
    const found = findListingInNextData(node[k], depth + 1);
    if (found) return found;
  }
  return null;
}

// ---------- 2. Page metadata ----------

function extractMeta(html: string, prop: string): string | null {
  let m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"));
  if (!m) m = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, "i"));
  if (!m) m = html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

// ---------- shared digit/word normalization ----------

const FA_DIGITS: Record<string, string> = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9" };
function faToEnDigits(s: string): string { return s.replace(/[۰-۹]/g, (d) => FA_DIGITS[d] ?? d); }

const PERSIAN_NUMBER_WORDS: Record<string, number> = {
  "صفر": 0, "یک": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5, "شش": 6, "هفت": 7, "هشت": 8, "نه": 9, "ده": 10,
};

// ---------- 3 & 4. Known fields + text parser, per field ----------

// AREA — priority: structured field > "متراژ/زیربنا/مساحت: N" label > a bare
// "N متر/متری/مترمربع" anywhere (title gets first look, since Divar titles
// routinely read "... ۱۲۰ متری ..." with no separate label at all).
function findArea(plainText: string, title: string | null): { value: number | null; confidence: Confidence } {
  const labeled = plainText.match(/(?:متراژ|زیربنا|مساحت)[^\d۰-۹]{0,10}([\d۰-۹,٬]{1,9})/);
  if (labeled) return { value: Number(faToEnDigits(labeled[1]).replace(/[,٬]/g, "")), confidence: "high" };

  // Bare "number + متر" pattern. Deliberately excludes matches immediately
  // preceded by a price-ish word so "۲۵۰,۰۰۰,۰۰۰ تومان متری" (a per-meter
  // price, which does exist as a listing field) doesn't get read as area.
  const bareRe = /(?<!تومان[^۰-۹\d]{0,3})(\d{2,4}|[۰-۹]{2,4})\s*متر(?:ی|مربع)?(?!\s*قیمت)/g;
  const candidates: number[] = [];
  let m: RegExpExecArray | null;
  const searchIn = title ? title + " " + plainText : plainText;
  while ((m = bareRe.exec(searchIn))) {
    const n = Number(faToEnDigits(m[1]));
    if (n >= 15 && n <= 2000) candidates.push(n); // sane livable-area range — filters out stray unrelated numbers
  }
  if (candidates.length === 0) return { value: null, confidence: "low" };
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return { value: unique[0], confidence: "medium" };
  // Multiple different candidate areas found in the text — genuinely
  // ambiguous, per spec this must not be silently trusted.
  return { value: unique[0], confidence: "low" };
}

// ROOMS — priority: structured field > "بدون خواب"/"استودیو" (=0) >
// digit-or-word + "خواب/خوابه".
function findRooms(plainText: string): { value: number | null; confidence: Confidence } {
  if (/بدون\s*خواب|استودیو/.test(plainText)) return { value: 0, confidence: "high" };

  const digitMatch = plainText.match(/([\d۰-۹])\s*خواب(?:ه)?/);
  if (digitMatch) return { value: Number(faToEnDigits(digitMatch[1])), confidence: "high" };

  const wordsPattern = Object.keys(PERSIAN_NUMBER_WORDS).join("|");
  const wordMatch = plainText.match(new RegExp(`(${wordsPattern})\\s*خواب(?:ه)?`));
  if (wordMatch) return { value: PERSIAN_NUMBER_WORDS[wordMatch[1]], confidence: "high" };

  return { value: null, confidence: "low" };
}

// YEAR BUILT — priority: structured field > "سال ساخت/ساخت/سال بنا: YYYY" >
// "نوساز" alone (year unknown but the state is known). Publish/edit dates
// are never candidates here because this only ever looks near these three
// construction-specific labels, never at bare 4-digit numbers in general.
function findYearBuilt(plainText: string): { value: number | null; label: string | null; confidence: Confidence } {
  const labeled = plainText.match(/(?:سال\s*ساخت|سال\s*بنا|ساخت)\s*[:\s]{0,3}([\d۰-۹]{4})/);
  if (labeled) {
    const year = Number(faToEnDigits(labeled[1]));
    if (year >= 1300 && year <= 1420) return { value: year, label: null, confidence: "high" };
  }
  if (/نوساز/.test(plainText)) return { value: null, label: "نوساز", confidence: "high" };
  return { value: null, label: null, confidence: "low" };
}

function findLabeledBoolean(plainText: string, labels: string[]): boolean | null {
  for (const label of labels) {
    const re = new RegExp(label + "[^\\n]{0,20}(دارد|ندارد|بله|خیر)");
    const m = plainText.match(re);
    if (m) return m[1] === "دارد" || m[1] === "بله";
  }
  return null;
}

function findLabeledNumber(plainText: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(label + "[^\\d۰-۹]{0,15}([\\d۰-۹,٬]{1,24})");
    const m = plainText.match(re);
    if (m) return faToEnDigits(m[1]);
  }
  return null;
}

export function parseListingHtml(html: string, sourceUrl: string): RawExtracted | null {
  const ldBlocks = extractJsonLdBlocks(html);
  const ld = findListingNode(ldBlocks);
  const nextData = extractNextData(html);
  const nextListing = nextData ? findListingInNextData(nextData) : null;
  const plainText = stripTags(html);

  const title = ld?.name || nextListing?.title || nextListing?.name || extractMeta(html, "og:title") || null;
  const description = ld?.description || nextListing?.description || extractMeta(html, "og:description") || null;

  const priceRaw = ld?.offers?.price ?? ld?.price ?? nextListing?.price ?? nextListing?.amount ?? null;

  // ---- images: source URLs + position only; bytes are fetched separately
  // (see imageFetcher.ts) so a slow/broken image never blocks text parsing.
  // See imageExtractor.ts for why this is its own module — collecting from
  // one source (previously just the first og:image tag) was the actual bug
  // behind "only one photo gets saved."
  const { images, debug: imageDebug } = collectImages(html);
  // deno-lint-ignore no-console
  console.log(`[import-divar] image candidates: ${imageDebug.candidates}, unique: ${imageDebug.unique}, filtered: ${imageDebug.filtered}, kept: ${images.length}`);

  const idFromUrl = sourceUrl.match(/\/v\/[^/]+\/([a-zA-Z0-9-]+)\/?(?:[?#].*)?$/) || sourceUrl.match(/\/v\/([a-zA-Z0-9-]+)\/?(?:[?#].*)?$/);
  const sourceId = ld?.sku || ld?.productID || nextListing?.token || nextListing?.id || (idFromUrl ? idFromUrl[idFromUrl.length - 1] : null);

  // ---- area ----
  let area: number | null = null, areaConfidence: Confidence = "low";
  if (nextListing?.area != null) { area = Number(nextListing.area); areaConfidence = "high"; }
  else { const r = findArea(plainText, title); area = r.value; areaConfidence = r.confidence; }

  // ---- rooms ----
  let rooms: number | null = null, roomsConfidence: Confidence = "low";
  if (typeof nextListing?.rooms === "number") { rooms = nextListing.rooms; roomsConfidence = "high"; }
  else { const r = findRooms(plainText); rooms = r.value; roomsConfidence = r.confidence; }

  // ---- year built ----
  let yearBuilt: number | null = null, yearBuiltLabel: string | null = null, yearBuiltConfidence: Confidence = "low";
  if (typeof nextListing?.yearBuilt === "number") { yearBuilt = nextListing.yearBuilt; yearBuiltConfidence = "high"; }
  else { const r = findYearBuilt(plainText); yearBuilt = r.value; yearBuiltLabel = r.label; yearBuiltConfidence = r.confidence; }

  const floor = nextListing?.floor ?? findLabeledNumber(plainText, ["طبقه"]);
  const totalFloors = findLabeledNumber(plainText, ["تعداد\\s*طبقات"]);
  const parking = typeof nextListing?.parking === "boolean" ? nextListing.parking : findLabeledBoolean(plainText, ["پارکینگ"]);
  const elevator = typeof nextListing?.elevator === "boolean" ? nextListing.elevator : findLabeledBoolean(plainText, ["آسانسور"]);
  const storage = typeof nextListing?.storage === "boolean" ? nextListing.storage : findLabeledBoolean(plainText, ["انباری"]);
  const deposit = nextListing?.deposit ?? findLabeledNumber(plainText, ["ودیعه", "رهن"]);
  const rent = nextListing?.rent ?? findLabeledNumber(plainText, ["اجاره"]);
  const price = priceRaw != null ? String(priceRaw) : findLabeledNumber(plainText, ["قیمت\\s*کل", "قیمت"]);

  // Nothing usable at all — not a partial listing, just genuinely empty.
  // Distinguishing this from PAGE_NOT_ACCESSIBLE matters: the fetch
  // succeeded, the page just didn't contain recognizable listing data.
  if (!title && !price && !area) return null;

  return {
    title, description, price, deposit, rent,
    area, areaConfidence, rooms, roomsConfidence,
    floor, totalFloors, yearBuilt, yearBuiltLabel, yearBuiltConfidence,
    parking, elevator, storage, location: null, images, publishedAt: null,
    sourceId: sourceId ? String(sourceId) : null, sourceUrl, dealType: null, propertyType: null, address: null,
  };
}
