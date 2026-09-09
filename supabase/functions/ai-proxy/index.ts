import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// The shared, app-owned AI key lives ONLY here, in Supabase's encrypted
// function secrets — never in the bundle, never in a request the browser
// makes to a third party. This is what lets a normal user open Flora and
// have the AI features just work, instead of being told to go create a
// Gemini account first.
//
// Set with: Supabase Dashboard → Edge Functions → Secrets
//   FLORA_GEMINI_KEY = <the key>
// (optionally FLORA_AVALAI_KEY for the Iran-reachable gateway)
const GEMINI_KEY = Deno.env.get("FLORA_GEMINI_KEY");
const AVALAI_KEY = Deno.env.get("FLORA_AVALAI_KEY");

// A rough ceiling so one account can't burn the owner's whole quota. Not
// billing-grade accounting — just a guardrail against a runaway loop or one
// person hammering it. Resets daily per user.
const DAILY_LIMIT = Number(Deno.env.get("FLORA_AI_DAILY_LIMIT") || "80");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callGemini(prompt: string) {
  const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
  let lastErr = "";
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `کد ${res.status}`;
      lastErr = msg;
      if (res.status === 404 || /not found|not supported/i.test(msg)) continue;
      throw new Error(msg);
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    lastErr = data?.promptFeedback?.blockReason ? `مسدود شد: ${data.promptFeedback.blockReason}` : "پاسخ خالی";
  }
  throw new Error(lastErr || "هیچ مدلی در دسترس نبود");
}

async function callAvalai(prompt: string) {
  const res = await fetch("https://api.avalai.ir/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AVALAI_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `خطای AvalAI (کد ${res.status})`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("پاسخ خالی از AvalAI");
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: cors });

  // Signed-in users only — an open proxy to a paid API key would be
  // scraped within days.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
  const userId = userData.user.id;

  let body: { prompt?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid body" }), { status: 400, headers: cors }); }
  if (!body.prompt) return new Response(JSON.stringify({ error: "پیام خالی است" }), { status: 400, headers: cors });

  if (!GEMINI_KEY && !AVALAI_KEY) {
    return new Response(JSON.stringify({ error: "کلید هوش مصنوعی روی سرور تنظیم نشده" }), { status: 503, headers: cors });
  }

  // Quota check + increment, with the service role since the counter table
  // is deliberately not user-writable (a user must not be able to reset
  // their own usage).
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin.from("ai_usage").select("count").eq("user_id", userId).eq("day", today).maybeSingle();
  const used = usage?.count || 0;
  if (used >= DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: "سقف استفاده‌ی روزانه‌ی هوش مصنوعی پر شده — فردا دوباره امتحان کن یا کلید شخصی خودت را در تنظیمات وارد کن." }), { status: 429, headers: cors });
  }

  try {
    const text = GEMINI_KEY ? await callGemini(body.prompt) : await callAvalai(body.prompt);
    await admin.from("ai_usage").upsert({ user_id: userId, day: today, count: used + 1 }, { onConflict: "user_id,day" });
    return new Response(JSON.stringify({ text, remaining: DAILY_LIMIT - used - 1 }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "خطای نامشخص" }), { status: 502, headers: cors });
  }
});
