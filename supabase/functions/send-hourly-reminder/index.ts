import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

function todayIsoUTCPlusIran(): string {
  // Iran is UTC+3:30 — a date comparison done in raw UTC would flip to
  // "tomorrow" mid-afternoon Iran time, marking today's own appointments as
  // already past. Shifting by the offset first keeps "today" meaning the
  // same thing here as it does on the person's phone.
  const now = new Date(Date.now() + (3.5 * 60 + 0) * 60000);
  return now.toISOString().slice(0, 10);
}

interface CallItem { status?: string }
interface CheckItem { paid?: boolean; dueDate?: string }
interface ApptItem { date?: string; time?: string }

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

  const today = todayIsoUTCPlusIran();
  const in7Days = Date.now() + 7 * 86400000;

  const { data: rows } = await admin.from("flora_data").select("user_id, data");
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("is_active", true);
  const { data: tgLinks } = await admin.from("telegram_links").select("user_id, chat_id");

  const subsByUser = new Map<string, typeof subs>();
  for (const s of subs || []) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id)!.push(s);
  }
  const tgByUser = new Map<string, number>();
  for (const t of tgLinks || []) tgByUser.set(t.user_id, t.chat_id);

  const title = "Flora";
  let sent = 0, notified = 0;

  for (const row of rows || []) {
    const userSubs = subsByUser.get(row.user_id) || [];
    const chatId = tgByUser.get(row.user_id);
    if (userSubs.length === 0 && !chatId) continue;

    const { data: prefs } = await admin.from("notification_preferences").select("*").eq("user_id", row.user_id).single();
    if (isQuietHoursNow(prefs)) continue;

    const calls: CallItem[] = Array.isArray(row.data?.calls) ? row.data.calls : [];
    const checks: CheckItem[] = Array.isArray(row.data?.checks) ? row.data.checks : [];
    const appts: ApptItem[] = Array.isArray(row.data?.appointments) ? row.data.appointments : [];

    const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;
    const dueChecks = checks.filter((ch) => !ch.paid && ch.dueDate && new Date(ch.dueDate).getTime() <= in7Days).length;
    const todaysAppts = appts.filter((a) => a.date === today).length;

    // Nothing actionable this hour — skip entirely rather than send an
    // empty "everything's at zero" ping every single hour. An hourly
    // cadence is only tolerable if it's never noise.
    if (pendingCalls === 0 && dueChecks === 0 && todaysAppts === 0) continue;

    const parts: string[] = [];
    if (pendingCalls) parts.push(`${pendingCalls} تماس پیگیری‌نشده`);
    if (todaysAppts) parts.push(`${todaysAppts} قرار بازدید امروز`);
    if (dueChecks) parts.push(`${dueChecks} چک تا ۷ روز آینده`);
    const body = parts.join(" · ") + ".";

    await admin.from("notifications").insert({ user_id: row.user_id, category: "general", title, body, url: "/" });
    notified++;

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

  return new Response(JSON.stringify({ ok: true, notified, sent }), { status: 200 });
});
