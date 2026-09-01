import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Same cron-secret pattern as the other scheduled functions.
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
async function sendTelegram(chatId: number, title: string, body: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `${title}\n${body}` }),
  }).catch(() => {});
}

function isQuietHoursNow(prefs: { quiet_hours_enabled?: boolean; quiet_hours_start?: string; quiet_hours_end?: string } | null | undefined): boolean {
  if (!prefs?.quiet_hours_enabled) return false;
  const now = new Date();
  const current = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const start = prefs.quiet_hours_start || "23:00";
  const end = prefs.quiet_hours_end || "08:00";
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

// Flora has no birthdate or zodiac sign on file for anyone, so this is
// deliberately NOT a per-person astrology reading — it's one shared,
// upbeat "today's line" for every user, picked deterministically by the
// day of the year so it's stable all day and doesn't repeat for months.
// If a real per-user horoscope is wanted later, it needs a birthdate field
// first — inventing a sign per person would just be wrong most of the time.
const DAILY_LINES = [
  "امروز روز خوبیه برای پیگیری همون مشتری که مدتیه معطلش گذاشتی.",
  "یک قدم کوچیک امروز، فردا یه فایل فروخته‌شده‌ست — شروع کن.",
  "امروز حرف‌زدن رو به فکرکردن ترجیح بده؛ یک تماس، از ده تا برنامه مؤثرتره.",
  "انرژی امروزت برای مذاکره خوبه — اگر قراری معلق مونده، همین امروز جوش بده.",
  "امروز روزیه که یک مشتری فراموش‌شده، دوباره یادت میفته — بهش زنگ بزن.",
  "صبر امروزت جواب می‌ده؛ عجله نکن، ولی هم عقب نمون.",
  "امروز حواست به جزئیات قرارداد باشه — یک نگاه دوباره ضرر نداره.",
  "بهترین معامله‌های امروز از یک پیام ساده شروع می‌شن — یکی رو همین الان بفرست.",
  "امروز روز خوبیه برای بازدید یک فایل جدید با چشم مشتری، نه چشم خودت.",
  "یک تشکر ساده از یک مشتری قدیمی، امروز در رو به یک معرفی جدید باز می‌کنه.",
  "امروز کمی سخت‌گیرتر باش روی قیمت — بازار امروز جای چانه‌زنیه.",
  "بهترین فرصت امروزت شاید همونی باشه که دیروز به تعویق انداختیش.",
];

function todaysLine(): string {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start) / 86400000);
  return DAILY_LINES[dayOfYear % DAILY_LINES.length];
}

Deno.serve(async (req: Request) => {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@flora-crm.app";
  const pushConfigured = !!(vapidPublic && vapidPrivate);
  if (pushConfigured) webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!);

  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("is_active", true);
  const { data: tgLinks } = await admin.from("telegram_links").select("user_id, chat_id");

  const byUser = new Map<string, typeof subs>();
  for (const s of subs || []) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id)!.push(s);
  }
  const tgByUser = new Map<string, number>();
  for (const t of tgLinks || []) tgByUser.set(t.user_id, t.chat_id);

  const allUserIds = new Set([...byUser.keys(), ...tgByUser.keys()]);
  if (allUserIds.size === 0) return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no reachable users" }), { status: 200 });

  const title = "Flora";
  const body = todaysLine();

  let sent = 0;
  for (const userId of allUserIds) {
    const userSubs = byUser.get(userId) || [];
    const { data: prefs } = await admin.from("notification_preferences").select("*").eq("user_id", userId).single();
    if (isQuietHoursNow(prefs)) continue;

    await admin.from("notifications").insert({ user_id: userId, category: "general", title, body, url: "/" });

    const chatId = tgByUser.get(userId);
    if (chatId) await sendTelegram(chatId, title, body);

    if (!pushConfigured) continue;
    const payload = JSON.stringify({ title, body, url: "/" });
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", sub.id);
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number; status?: number })?.statusCode ?? (e as { status?: number })?.status;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, users: allUserIds.size, line: body }), { status: 200 });
});
