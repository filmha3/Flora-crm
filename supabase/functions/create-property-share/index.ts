import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  let body: { propertyIds?: string[] };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid body" }), { status: 400, headers: cors }); }

  const propertyIds = Array.isArray(body.propertyIds) ? body.propertyIds.filter((id) => typeof id === "string") : [];
  if (propertyIds.length === 0) return new Response(JSON.stringify({ error: "حداقل یک فایل انتخاب کن" }), { status: 400, headers: cors });
  if (propertyIds.length > 5) return new Response(JSON.stringify({ error: "حداکثر ۵ فایل قابل ارجاع است" }), { status: 400, headers: cors });

  // A random, unguessable token — not the row's own uuid — is the whole
  // point here: nothing about it reveals the agent's account id or lets
  // someone enumerate other people's share links.
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  // Inserted with the user's own RLS-scoped client (own JWT still attached
  // via the client above), not the service role — created_by can only ever
  // be this user's own id, enforced by the same policy as everything else.
  const { error: insertErr } = await supabase.from("property_share_links").insert({
    token,
    property_ids: propertyIds,
    created_by: userData.user.id,
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), // 30 days
  });
  if (insertErr) return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: cors });

  return new Response(JSON.stringify({ token }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
