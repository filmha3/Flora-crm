import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchListingHtml } from "./fetcher.ts";
import { parseListingHtml } from "./parser.ts";
import { normalize } from "./normalizer.ts";
import { ImportError } from "./types.ts";

// Pipeline, exactly per spec: validate → fetch → parse → normalize. Duplicate
// check, preview, and save all stay client-side (they operate on the user's
// own local property list, which this function has no access to and
// shouldn't need). The frontend only ever sees { ok, data } or { ok, code }
// — raw error messages/stack traces never leave this function.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ ok: false, code }), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return errorResponse("LINK_INVALID", 405);

  let url: string;
  try {
    const body = await req.json();
    url = body?.url;
    if (!url || typeof url !== "string") return errorResponse("LINK_INVALID", 400);
  } catch {
    return errorResponse("LINK_INVALID", 400);
  }

  let html: string, finalUrl: string;
  try {
    const fetched = await fetchListingHtml(url);
    html = fetched.html; finalUrl = fetched.finalUrl;
  } catch (e) {
    if (e instanceof ImportError) {
      const status = e.code === "RATE_LIMITED" ? 429 : e.code === "LINK_INVALID" ? 400 : 502;
      return errorResponse(e.code, status);
    }
    return errorResponse("PAGE_NOT_ACCESSIBLE", 502);
  }

  let raw;
  try {
    raw = parseListingHtml(html, finalUrl);
  } catch {
    return errorResponse("PARSER_FAILED", 500);
  }
  if (!raw) return errorResponse("EXTRACTION_FAILED", 422);

  try {
    const normalized = normalize(raw);
    return new Response(JSON.stringify({ ok: true, data: normalized }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch {
    return errorResponse("PARSER_FAILED", 500);
  }
});
