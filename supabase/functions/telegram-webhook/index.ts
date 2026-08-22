import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// Telegram itself signs webhook calls with this header once it's set via
// setWebhook — without checking it, anyone who found this URL could forge
// a fake "/start <some-user-id>" and link their own Telegram chat to
// someone else's Flora account.
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

async function sendTelegramMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) return new Response("unauthorized", { status: 401 });
  }

  let update: any;
  try { update = await req.json(); } catch { return new Response("ok", { status: 200 }); }

  const message = update?.message;
  const text: string | undefined = message?.text;
  const chatId = message?.chat?.id;
  if (!text || !chatId) return new Response("ok", { status: 200 });

  // Only ever reacts to "/start <flora-user-id>" — the deep link Flora's
  // own "اتصال به تلگرام" button opens. Anything else the person types to
  // the bot is silently ignored; this isn't a chatbot, just a delivery pipe.
  const match = text.match(/^\/start\s+([a-zA-Z0-9-]+)$/);
  if (!match) {
    if (text.startsWith("/start")) {
      await sendTelegramMessage(chatId, "برای وصل‌کردن، از داخل اپ Flora روی «اتصال به تلگرام» بزن.");
    }
    return new Response("ok", { status: 200 });
  }

  const userId = match[1];
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Confirm this is a real Flora user id before linking anything to it —
  // a malformed or made-up id in the deep link should never silently create
  // a dangling row.
  const { data: userCheck } = await admin.auth.admin.getUserById(userId);
  if (!userCheck?.user) {
    await sendTelegramMessage(chatId, "این لینک معتبر نیست — دوباره از داخل اپ Flora امتحان کن.");
    return new Response("ok", { status: 200 });
  }

  await admin.from("telegram_links").upsert({ user_id: userId, chat_id: chatId, linked_at: new Date().toISOString() }, { onConflict: "user_id" });
  await sendTelegramMessage(chatId, "✅ Flora با موفقیت وصل شد — از این به بعد اعلان‌هات اینجا هم میان.");

  return new Response("ok", { status: 200 });
});
