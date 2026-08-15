// Run with: deno test --allow-net supabase/functions/import-divar/
//
// These exercise the pure logic (URL validation, parsing, normalization)
// without hitting the real divar.ir — the fetcher's actual network path is
// covered separately by mocking global fetch, since divar.ir's robots.txt
// disallows automated requests and CI shouldn't depend on a live site anyway.
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateListingUrl } from "./fetcher.ts";
import { parseListingHtml } from "./parser.ts";
import { normalize, toNumberOrNull } from "./normalizer.ts";
import { ImportError } from "./types.ts";

// ---------- 1. valid Divar URL ----------
Deno.test("valid divar listing url passes validation", () => {
  const url = validateListingUrl("https://divar.ir/v/apartment-in-tehran/AbCdEf12");
  assertEquals(url.hostname, "divar.ir");
});

// ---------- 2. invalid URL ----------
Deno.test("non-divar url is rejected as LINK_INVALID", () => {
  assertThrows(() => validateListingUrl("https://example.com/v/whatever"), ImportError, "LINK_INVALID");
});
Deno.test("malformed url string is rejected as LINK_INVALID", () => {
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

// ---------- 3. inaccessible URL (mocked network failure) ----------
Deno.test("fetch failure surfaces as PAGE_NOT_ACCESSIBLE, not a raw error", async () => {
  const { fetchListingHtml } = await import("./fetcher.ts");
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => { throw new TypeError("network down"); };
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals(caught instanceof ImportError, true);
    assertEquals((caught as ImportError).code, "PAGE_NOT_ACCESSIBLE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
Deno.test("HTTP 404 from source surfaces as PAGE_NOT_ACCESSIBLE", async () => {
  const { fetchListingHtml } = await import("./fetcher.ts");
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => Promise.resolve(new Response("gone", { status: 404 }));
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals((caught as ImportError).code, "PAGE_NOT_ACCESSIBLE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
Deno.test("HTTP 429 from source surfaces as RATE_LIMITED", async () => {
  const { fetchListingHtml } = await import("./fetcher.ts");
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = () => Promise.resolve(new Response("slow down", { status: 429 }));
  try {
    let caught: unknown;
    try { await fetchListingHtml("https://divar.ir/v/x/y"); } catch (e) { caught = e; }
    assertEquals((caught as ImportError).code, "RATE_LIMITED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------- 4. duplicate listing (client-side matcher, mirrored here as a pure function) ----------
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
Deno.test("duplicate detected by sourceUrl when sourceId is missing", () => {
  const existing = [{ sourceId: null, sourceUrl: "https://divar.ir/v/x/abc123", title: "t", area: 80 }];
  assertEquals(isDuplicate(existing, { sourceId: null, sourceUrl: "https://divar.ir/v/x/abc123", title: "different", area: 999 }), true);
});
Deno.test("no false positive for an unrelated listing", () => {
  const existing = [{ sourceId: "abc123", sourceUrl: "https://divar.ir/v/x/abc123", title: "t", area: 80 }];
  assertEquals(isDuplicate(existing, { sourceId: "zzz999", sourceUrl: "https://divar.ir/v/y/zzz999", title: "different", area: 55 }), false);
});

// ---------- 5. missing fields ----------
Deno.test("missing fields stay null through parse + normalize, never guessed", () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@type":"Product","name":"آپارتمان نوساز"}</script>
  </head><body>قیمت کل ۲۵۰۰۰۰۰۰۰۰ تومان</body></html>`;
  const raw = parseListingHtml(html, "https://divar.ir/v/apartment/xyz1");
  const n = normalize(raw!);
  assertEquals(n.title, "آپارتمان نوساز");
  assertEquals(n.area, null);
  assertEquals(n.rooms, null);
  assertEquals(n.parking, null);
  assertEquals(n.yearBuilt, null);
});
Deno.test("page with no recognizable listing data returns null (EXTRACTION_FAILED upstream)", () => {
  const raw = parseListingHtml("<html><body>این یک صفحه خالی است</body></html>", "https://divar.ir/v/x/y");
  assertEquals(raw, null);
});

// ---------- 6. Persian numbers ----------
Deno.test("Persian digits normalize to a real number", () => {
  assertEquals(toNumberOrNull("۱۲۵"), 125);
  assertEquals(toNumberOrNull("۲۵۰,۰۰۰,۰۰۰"), 250000000);
  assertEquals(toNumberOrNull("متراژ ۸۵ متر"), 85);
});
Deno.test("Persian-number labeled fields are extracted and normalized end to end", () => {
  const html = `<html><body>
    <div>متراژ: ۸۵ متر</div>
    <div>اتاق: ۲</div>
    <div>طبقه: ۳</div>
    <div>قیمت کل: ۲,۵۰۰,۰۰۰,۰۰۰</div>
  </body></html>`;
  const raw = parseListingHtml(html, "https://divar.ir/v/apt/id1");
  const n = normalize(raw!);
  assertEquals(n.area, 85);
  assertEquals(n.rooms, 2);
  assertEquals(n.floor, 3);
  assertEquals(n.price, 2500000000);
});

// ---------- 7. listing with multiple images ----------
Deno.test("multiple images from JSON-LD are all collected", () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@type":"Product","name":"ویلا","image":["https://cdn.divar.ir/a.jpg","https://cdn.divar.ir/b.jpg","https://cdn.divar.ir/c.jpg"]}</script>
  </head><body></body></html>`;
  const raw = parseListingHtml(html, "https://divar.ir/v/villa/id2");
  assertEquals(raw!.images.length, 3);
  assertEquals(raw!.images.includes("https://cdn.divar.ir/b.jpg"), true);
});
Deno.test("duplicate image URLs across JSON-LD/OG are de-duplicated", () => {
  const html = `<html><head>
    <meta property="og:image" content="https://cdn.divar.ir/a.jpg" />
    <script type="application/ld+json">{"@type":"Product","name":"خانه","image":["https://cdn.divar.ir/a.jpg","https://cdn.divar.ir/b.jpg"]}</script>
  </head><body></body></html>`;
  const raw = parseListingHtml(html, "https://divar.ir/v/x/id3");
  assertEquals(raw!.images.length, 2);
});
