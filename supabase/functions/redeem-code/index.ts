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

  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  let body: { code?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "کد نامعتبر است" }), { status: 400, headers: cors }); }
  const code = (body.code || "").trim().toUpperCase();
  if (!code) return new Response(JSON.stringify({ error: "کد را وارد کن" }), { status: 400, headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await admin.from("feature_codes").select("*").eq("code", code).eq("active", true).maybeSingle();
  if (!row) return new Response(JSON.stringify({ error: "این کد معتبر نیست" }), { status: 404, headers: cors });

  const { error: upsertErr } = await admin.from("user_features").upsert({ user_id: userData.user.id, feature: row.feature });
  if (upsertErr) return new Response(JSON.stringify({ error: "فعال‌سازی ناموفق بود" }), { status: 500, headers: cors });

  return new Response(JSON.stringify({ ok: true, feature: row.feature }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
