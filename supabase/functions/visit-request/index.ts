import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Public (no auth) endpoint for the site's «درخواست بازدید» form.
// Validates input, stores the request, and notifies the listing's agent
// in-app + on Telegram (if linked). Deploy with: supabase functions deploy visit-request --no-verify-jwt
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const toEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  if (clip(body.website, 50)) return json({ ok: true }); // honeypot

  const propertyId = clip(body.property_id, 80);
  const phone = toEn(clip(body.phone, 20)).replace(/\D/g, "").replace(/^98/, "0").replace(/^9/, "09");
  if (!propertyId) return json({ error: "property_id required" }, 400);
  if (!/^09\d{9}$/.test(phone)) return json({ error: "شماره موبایل معتبر نیست" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prop } = await admin.from("public_properties").select("id, user_id, title, slug").eq("id", propertyId).maybeSingle();
  if (!prop) return json({ error: "فایل پیدا نشد" }, 404);

  // Light abuse guard: same phone + property only once per 10 minutes.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await admin.from("visit_requests").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) > 0) return json({ ok: true, duplicate: true });

  const row = {
    property_id: propertyId, user_id: prop.user_id, property_title: prop.title,
    name: clip(body.name, 80) || null, phone, preferred_time: clip(body.preferred_time, 80) || null, note: clip(body.note, 500) || null,
  };
  const { error } = await admin.from("visit_requests").insert(row);
  if (error) return json({ error: "ثبت درخواست ناموفق بود" }, 500);

  const title = "درخواست بازدید جدید";
  const text = `«${prop.title}»\n${row.name ? row.name + " — " : ""}${phone}${row.preferred_time ? "\nزمان: " + row.preferred_time : ""}${row.note ? "\n" + row.note : ""}`;
  await admin.from("notifications").insert({ user_id: prop.user_id, category: "general", title, body: text, url: null, data: { type: "visit_request", property_id: propertyId, phone } }).then(() => {}, () => {});
  if (BOT_TOKEN) {
    const { data: tg } = await admin.from("telegram_links").select("chat_id").eq("user_id", prop.user_id).maybeSingle();
    if (tg?.chat_id) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tg.chat_id, text: `🏠 ${title}\n${text}\nhttps://www.florapro.ir/properties/${encodeURIComponent(prop.slug)}` }),
      }).catch(() => {});
    }
  }
  return json({ ok: true });
});
