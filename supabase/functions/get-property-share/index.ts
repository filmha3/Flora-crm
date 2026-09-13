import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Amenities were never a separate structured field on a property — they're
// baked into the free-text description as lines like "پارکینگ: دارد" (this
// is how the property form and the Divar importer both write them). Rather
// than exposing the whole description (which can carry the agent's own
// private notes), only these three known amenity lines are pulled out; the
// rest of the description never leaves the server.
function extractAmenities(desc: string | null | undefined): string[] {
  if (!desc) return [];
  const out: string[] = [];
  if (/پارکینگ:\s*دارد/.test(desc)) out.push("پارکینگ");
  if (/آسانسور:\s*دارد/.test(desc)) out.push("آسانسور");
  if (/انباری:\s*دارد/.test(desc)) out.push("انباری");
  return out;
}

interface RawProperty {
  id: string; title?: string; area?: number; rooms?: number; floor?: number | null;
  address?: string; price?: number; deal?: string; type?: string; desc?: string;
  media?: { type?: string; storagePath?: string; thumbnailPath?: string; url?: string }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: cors });

  let body: { token?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid body" }), { status: 400, headers: cors }); }
  const token = (body.token || "").trim();
  if (!token) return new Response(JSON.stringify({ error: "لینک نامعتبر است" }), { status: 400, headers: cors });

  // Service role — a colleague opening this link has no Flora account and
  // no JWT at all, so this is the one place in the whole feature that
  // deliberately bypasses RLS, and only to read the two things it needs:
  // the share link row itself, and the sharing agent's properties (which
  // get filtered and sanitized below before anything is returned).
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: link, error: linkErr } = await admin.from("property_share_links").select("*").eq("token", token).single();
  if (linkErr || !link) return new Response(JSON.stringify({ error: "لینک پیدا نشد یا حذف شده است" }), { status: 404, headers: cors });
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "این لینک منقضی شده است" }), { status: 410, headers: cors });
  }

  const { data: row } = await admin.from("flora_data").select("data").eq("user_id", link.created_by).single();
  const allProperties: RawProperty[] = Array.isArray(row?.data?.properties) ? row.data.properties : [];
  const wanted = new Set(link.property_ids as string[]);
  const chosen = allProperties.filter((p) => wanted.has(p.id)).slice(0, 5);

  const properties = await Promise.all(chosen.map(async (p) => {
    const cover = (p.media || []).find((m) => m.type === "image");
    let coverUrl: string | null = null;
    if (cover?.storagePath) {
      const { data: signed } = await admin.storage.from("property-photos").createSignedUrl(cover.storagePath, 3600);
      coverUrl = signed?.signedUrl || null;
    } else if (cover?.url) {
      coverUrl = cover.url; // legacy base64 item — already self-contained, no signing needed
    }
    return {
      id: p.id,
      title: p.title || "بدون عنوان",
      area: p.area || null,
      rooms: p.rooms ?? null,
      floor: p.floor ?? null,
      address: p.address || null,
      price: p.price || null,
      deal: p.deal || null,
      type: p.type || null,
      amenities: extractAmenities(p.desc),
      coverUrl,
    };
  }));

  return new Response(JSON.stringify({ properties }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
