// Run with: deno test --allow-net supabase/functions/import-divar/
//
// Covers the fetcher's URL/SSRF validation and network-error mapping (pure
// logic + mocked fetch — divar.ir's robots.txt disallows automated access,
// so these never touch the real site), plus the 10 field-extraction
// scenarios from spec, run against the actual parser/normalizer.
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateListingUrl, fetchListingHtml } from "./fetcher.ts";
import { parseListingHtml } from "./parser.ts";
import { normalize } from "./normalizer.ts";
import { collectImages } from "./imageExtractor.ts";
import { ImportError } from "./types.ts";

function wrap(html: string, url = "https://divar.ir/v/apt/id1") {
  const raw = parseListingHtml(html, url);
  return raw ? normalize(raw, []) : null;
}

// ---------- URL validation / SSRF ----------
Deno.test("valid divar listing url passes validation", () => {
  assertEquals(validateListingUrl("https://divar.ir/v/apartment-in-tehran/AbCdEf12").hostname, "divar.ir");
});
Deno.test("non-divar url is rejected", () => {
  assertThrows(() => validateListingUrl("https://example.com/v/whatever"), ImportError, "LINK_INVALID");
});
Deno.test("malformed url string is rejected", () => {
  assertThrows(() => validateListingUrl("not a url"), ImportError, "LINK_INVALID");
});
Deno.test("divar url without /v/ path is rejected (search/home pages)", () => {
  assertThrows(() => validateListingUrl("https://divar.ir/s/tehran/buy-apartment"), ImportError, "LINK_INVALID");
});
Deno.test("bare private-IP host rejected (defense in depth)", () => {
  assertThrows(() => validateListingUrl("https://127.0.0.1/v/x"), ImportError, "LINK_INVALID");
  assertThrows(() => validateListingUrl("https://192.168.1.1/v/x"), ImportError, "LINK_INVALID");
});
Deno.test("lookalike host divar.ir.evil.com is rejected, not treated as a divar.ir subdomain", () => {
  assertThrows(() => validateListingUrl("https://divar.ir.evil.com/v/x"), ImportError, "LINK_INVALID");
});

// ---------- network error mapping (mocked fetch) ----------
Deno.test("fetch failure surfaces as PAGE_NOT_ACCESSIBLE, not a raw error", async () => {
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => { throw new TypeError("network down"); };
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals((caught as ImportError).code, "PAGE_NOT_ACCESSIBLE");
  } finally { globalThis.fetch = originalFetch; }
});
Deno.test("HTTP 404 -> PAGE_NOT_ACCESSIBLE", async () => {
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => Promise.resolve(new Response("gone", { status: 404 }));
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals((caught as ImportError).code, "PAGE_NOT_ACCESSIBLE");
  } finally { globalThis.fetch = originalFetch; }
});
Deno.test("HTTP 429 -> RATE_LIMITED", async () => {
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => Promise.resolve(new Response("slow down", { status: 429 }));
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals((caught as ImportError).code, "RATE_LIMITED");
  } finally { globalThis.fetch = originalFetch; }
});
Deno.test("redirect off-host is refused (SSRF via redirect)", async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => {
    call++;
    if (call === 1) return Promise.resolve(new Response(null, { status: 302, headers: { location: "https://evil.example.com/steal" } }));
    throw new Error("should not be called again");
  };
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals((caught as ImportError).code, "LINK_INVALID");
  } finally { globalThis.fetch = originalFetch; }
});

// ---------- duplicate detection (client-side matcher, mirrored as a pure function) ----------
function isDuplicate(existing: { sourceId?: string | null; sourceUrl?: string | null; title?: string | null; area?: number | null }[], candidate: { sourceId: string | null; sourceUrl: string; title: string | null; area: number | null }) {
  return existing.some((p) =>
    (candidate.sourceId && p.sourceId === candidate.sourceId) ||
    (p.sourceUrl && p.sourceUrl === candidate.sourceUrl) ||
    (candidate.title && p.title === candidate.title && candidate.area && p.area === candidate.area)
  );
}
Deno.test("duplicate detected by sourceId", () => {
  const existing = [{ sourceId: "abc123", sourceUrl: "https://divar.ir/v/x/abc123", title: "t", area: 80 }];
  assertEquals(isDuplicate(existing, { sourceId: "abc123", sourceUrl: "https://divar.ir/v/y/other", title: "different", area: 999 }), true);
});
Deno.test("no false positive for an unrelated listing", () => {
  const existing = [{ sourceId: "abc123", sourceUrl: "https://divar.ir/v/x/abc123", title: "t", area: 80 }];
  assertEquals(isDuplicate(existing, { sourceId: "zzz999", sourceUrl: "https://divar.ir/v/y/zzz999", title: "different", area: 55 }), false);
});

// ---------- the 10 field-extraction scenarios from spec ----------
Deno.test("1) 120 متر / 2 خواب / ساخت 1402", () => {
  const n = wrap(`<html><body><h1>فروش آپارتمان 120 متر</h1><div>2 خواب</div><div>ساخت 1402</div></body></html>`)!;
  assertEquals(n.area, 120);
  assertEquals(n.areaConfidence, "medium");
  assertEquals(n.rooms, 2);
  assertEquals(n.roomsConfidence, "high");
  assertEquals(n.yearBuilt, 1402);
  assertEquals(n.yearBuiltConfidence, "high");
});
Deno.test("2) ۱۲۵ متر / سه خوابه / سال ساخت ۱۴۰۱", () => {
  const n = wrap(`<html><body><div>متراژ: ۱۲۵ متر</div><div>سه خوابه</div><div>سال ساخت ۱۴۰۱</div></body></html>`)!;
  assertEquals(n.area, 125);
  assertEquals(n.areaConfidence, "high");
  assertEquals(n.rooms, 3);
  assertEquals(n.yearBuilt, 1401);
});
Deno.test("3) ۱۱۰ متری / دو خواب", () => {
  const n = wrap(`<html><body><h1>واحد ۱۱۰ متری دو خواب</h1></body></html>`)!;
  assertEquals(n.area, 110);
  assertEquals(n.rooms, 2);
});
Deno.test("4) نوساز بدون سال مشخص", () => {
  const n = wrap(`<html><body><div>واحد نوساز فول امکانات</div><div>۹۰ متر</div></body></html>`)!;
  assertEquals(n.yearBuilt, null);
  assertEquals(n.yearBuiltLabel, "نوساز");
  assertEquals(n.yearBuiltConfidence, "high");
});
Deno.test("5a) بدون خواب", () => {
  const n = wrap(`<html><body><div>۴۰ متر</div><div>بدون خواب</div></body></html>`)!;
  assertEquals(n.rooms, 0);
  assertEquals(n.roomsConfidence, "high");
});
Deno.test("5b) استودیو", () => {
  const n = wrap(`<html><body><div>استودیو ۳۵ متری</div></body></html>`)!;
  assertEquals(n.rooms, 0);
});
Deno.test("6) متن شامل چند عدد مختلف -> area confidence low", () => {
  const n = wrap(`<html><body><div>این واحد ۱۲۰ متر است و همسایه ۹۵ متر</div></body></html>`)!;
  assertEquals(n.areaConfidence, "low");
});
Deno.test("7) آگهی بدون سال ساخت", () => {
  const n = wrap(`<html><body><div>۸۰ متر</div><div>۲ خواب</div></body></html>`)!;
  assertEquals(n.yearBuilt, null);
  assertEquals(n.yearBuiltLabel, null);
  assertEquals(n.yearBuiltConfidence, "low");
});
Deno.test("8) آگهی بدون تعداد خواب", () => {
  const n = wrap(`<html><body><div>۸۰ متر</div><div>ساخت ۱۳۹۸</div></body></html>`)!;
  assertEquals(n.rooms, null);
  assertEquals(n.roomsConfidence, "low");
});
Deno.test("9) آگهی بدون متراژ", () => {
  const raw = parseListingHtml(`<html><body><div>۲ خواب</div><div>قیمت ۵,۰۰۰,۰۰۰,۰۰۰ تومان</div></body></html>`, "https://divar.ir/v/x/y");
  const n = normalize(raw!, []);
  assertEquals(n.area, null);
});
Deno.test("10a) قیمت‌های بزرگ نباید متراژ تشخیص داده شوند", () => {
  const n = wrap(`<html><body><div>قیمت کل: ۵۰۰,۰۰۰,۰۰۰,۰۰۰ تومان</div><div>متراژ: ۸۵ متر</div></body></html>`)!;
  assertEquals(n.area, 85);
  assertEquals(n.price, 500000000000);
});
Deno.test("10b) عبارت «تومانی متری» نباید به‌عنوان متراژ خوانده شود", () => {
  const n = wrap(`<html><body><div>۲۵۰,۰۰۰,۰۰۰ تومان متری</div><div>متراژ ۹۰ متر</div></body></html>`)!;
  assertEquals(n.area, 90);
});

// ---------- images ----------
Deno.test("images keep position order and survive a failed download", () => {
  const raw = parseListingHtml(`<html><head><script type="application/ld+json">{"@type":"Product","name":"خانه","image":["https://cdn.divar.ir/a.jpg","https://cdn.divar.ir/b.jpg"]}</script></head><body></body></html>`, "https://divar.ir/v/x/y")!;
  const downloaded = [
    { sourceUrl: "https://cdn.divar.ir/a.jpg", position: 0, base64: "AAA", contentType: "image/jpeg" },
    { sourceUrl: "https://cdn.divar.ir/b.jpg", position: 1, base64: null, contentType: null },
  ];
  const n = normalize(raw, downloaded);
  assertEquals(n.images.length, 2);
  assertEquals(n.images[0].base64, "AAA");
  assertEquals(n.images[1].base64, null); // present but marked unavailable, not silently dropped
});

// ---------- image extraction — "only the first photo got saved" was a real
// bug (single-match og:image reader); these cover the fix. ----------
Deno.test("images: single og:image extracted", () => {
  const html = `<html><head><meta property="og:image" content="https://cdn.divar.ir/photo1.jpg"></head><body></body></html>`;
  assertEquals(collectImages(html).images.length, 1);
});
Deno.test("images: all 5 og:image tags collected, not just the first", () => {
  const html = `<html><head>${[1, 2, 3, 4, 5].map((i) => `<meta property="og:image" content="https://cdn.divar.ir/p${i}.jpg">`).join("\n")}</head><body></body></html>`;
  const { images } = collectImages(html);
  assertEquals(images.length, 5);
  assertEquals(images.map((i) => i.position), [0, 1, 2, 3, 4]);
});
Deno.test("images: 10+ images from a JSON-LD array all collected", () => {
  const urls = Array.from({ length: 12 }, (_, i) => `https://cdn.divar.ir/gallery/${i}.jpg`);
  const html = `<html><head><script type="application/ld+json">{"@type":"Product","name":"x","image":${JSON.stringify(urls)}}</script></head><body></body></html>`;
  assertEquals(collectImages(html).images.length, 12);
});
Deno.test("images: exact duplicates across sources collapse to one", () => {
  const html = `<html><head><meta property="og:image" content="https://cdn.divar.ir/a.jpg"><script type="application/ld+json">{"@type":"Product","image":["https://cdn.divar.ir/a.jpg","https://cdn.divar.ir/b.jpg"]}</script></head><body><img src="https://cdn.divar.ir/a.jpg"></body></html>`;
  assertEquals(collectImages(html).images.length, 2);
});
Deno.test("images: thumbnail (query-param sized) and original normalize to the same URL", () => {
  const html = `<html><body><img src="https://cdn.divar.ir/photo1.jpg?w=200&h=150"><img src="https://cdn.divar.ir/photo1.jpg"></body></html>`;
  assertEquals(collectImages(html).images.length, 1);
});
Deno.test("images: thumbnail path segment and original normalize to the same URL", () => {
  const html = `<html><body><img src="https://cdn.divar.ir/thumb/photo2.jpg"><img src="https://cdn.divar.ir/photo2.jpg"></body></html>`;
  assertEquals(collectImages(html).images.length, 1);
});
Deno.test("images: listing with no images returns zero, not an error", () => {
  const html = `<html><head></head><body><p>هیچ عکسی نیست</p></body></html>`;
  assertEquals(collectImages(html).images.length, 0);
});
Deno.test("images: logo/favicon/avatar/icon URLs are excluded", () => {
  const html = `<html><head><link rel="icon" href="https://divar.ir/favicon.ico"></head><body><img src="https://divar.ir/static/logo.png"><img src="https://divar.ir/static/avatar-icon.png"><img src="https://cdn.divar.ir/real-photo.jpg"></body></html>`;
  const { images } = collectImages(html);
  assertEquals(images.length, 1);
  assertEquals(images[0].sourceUrl, "https://cdn.divar.ir/real-photo.jpg");
});
Deno.test("images: nested under a non-standard key name (e.g. 'photos') are still found", () => {
  const html = `<html><body><script>window.__INITIAL_STATE__ = {"post":{"title":"x","photos":["https://cdn.divar.ir/x1.jpg","https://cdn.divar.ir/x2.jpg"]}};</script></body></html>`;
  assertEquals(collectImages(html).images.length, 2);
});
Deno.test("images: more than 24 candidates still cap at 24, order preserved", () => {
  const many = Array.from({ length: 30 }, (_, i) => `<meta property="og:image" content="https://cdn.divar.ir/m${i}.jpg">`).join("\n");
  const { images } = collectImages(`<html><head>${many}</head><body></body></html>`);
  assertEquals(images.length, 24);
  assertEquals(images[0].sourceUrl, "https://cdn.divar.ir/m0.jpg");
});
Deno.test("images: multiple photos flow through the full parseListingHtml result", () => {
  const html = `<html><head>${[1, 2, 3].map((i) => `<meta property="og:image" content="https://cdn.divar.ir/p${i}.jpg">`).join("\n")}</head><body><div>۸۰ متر</div></body></html>`;
  const raw = parseListingHtml(html, "https://divar.ir/v/x/y");
  assertEquals(raw!.images.length, 3);
});

// ---------- rawImportData ----------
Deno.test("rawImportData is attached for debugging a mis-parsed listing", () => {
  const n = wrap(`<html><body><div>۸۰ متر</div></body></html>`)!;
  assertEquals(n.rawImportData.area, 80);
});
