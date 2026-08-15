// Extraction priority, per spec: JSON-LD > meta/OpenGraph > embedded page
// data > labeled HTML text. Every strategy is additive — later ones only
// fill in fields the earlier ones left null, never overwrite a value a
// higher-priority source already provided.
//
// Honesty note for whoever maintains this: divar.ir's robots.txt disallows
// automated access, which also means this parser was written against
// general schema.org/OpenGraph/Next.js conventions rather than a page this
// function was tested against directly — no environment available while
// building this had a route to fetch a live listing page to confirm exact
// selectors. Treat the label-based fallback regexes as the part most likely
// to need real-world tuning; everything else (JSON-LD types, OG props) is
// commodity web standard and should hold regardless of Divar-specific markup.
import type { RawExtracted } from "./types.ts";

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();
}

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

function extractMeta(html: string, prop: string): string | null {
  let m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"));
  if (!m) m = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, "i"));
  if (!m) m = html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"));
  return m ? decodeEntities(m[1]) : null;
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

const FA_DIGITS: Record<string, string> = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9" };
function faToEnDigits(s: string): string { return s.replace(/[۰-۹]/g, (d) => FA_DIGITS[d] ?? d); }

// Reads the nearest number that follows a Persian label in the page's
// visible text — resilient to class-name/markup churn, since it only
// depends on the label wording staying put.
function findLabeledNumber(plainText: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(label + "[^\\d۰-۹]{0,15}([\\d۰-۹,٬]{1,24})");
    const m = plainText.match(re);
    if (m) return faToEnDigits(m[1]);
  }
  return null;
}

function findLabeledBoolean(plainText: string, labels: string[]): boolean | null {
  for (const label of labels) {
    const re = new RegExp(label + "[^\\n]{0,20}(دارد|ندارد|بله|خیر)");
    const m = plainText.match(re);
    if (m) return m[1] === "دارد" || m[1] === "بله";
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

  const ogImage = extractMeta(html, "og:image");
  const ldImage = ld?.image ? (Array.isArray(ld.image) ? ld.image : [ld.image]) : [];
  const nextImages: string[] = Array.isArray(nextListing?.images) ? nextListing.images.filter((x: unknown) => typeof x === "string") : [];
  const images = [...new Set([...ldImage, ...nextImages, ...(ogImage ? [ogImage] : [])])].slice(0, 12);

  const idFromUrl = sourceUrl.match(/\/v\/[^/]+\/([a-zA-Z0-9-]+)\/?(?:[?#].*)?$/) || sourceUrl.match(/\/v\/([a-zA-Z0-9-]+)\/?(?:[?#].*)?$/);
  const sourceId = ld?.sku || ld?.productID || nextListing?.token || nextListing?.id || (idFromUrl ? idFromUrl[idFromUrl.length - 1] : null);

  const area = nextListing?.area ?? findLabeledNumber(plainText, ["متراژ", "زیربنا"]);
  const rooms = nextListing?.rooms ?? findLabeledNumber(plainText, ["اتاق"]);
  const floor = nextListing?.floor ?? findLabeledNumber(plainText, ["طبقه"]);
  const totalFloors = findLabeledNumber(plainText, ["تعداد\\s*طبقات"]);
  const yearBuilt = nextListing?.yearBuilt ?? findLabeledNumber(plainText, ["سال\\s*ساخت"]);
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
    title, description, price, deposit, rent, area, rooms, floor, totalFloors, yearBuilt,
    parking, elevator, storage, location: null, images, publishedAt: null,
    sourceId: sourceId ? String(sourceId) : null, sourceUrl, dealType: null, propertyType: null, address: null,
  };
}
