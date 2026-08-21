import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Same cron-secret pattern as process-due-reminders — this has no user JWT
// either, it's a daily tick, not a response to anything the user did.
const CRON_SECRET = Deno.env.get("CRON_SECRET");

function isQuietHoursNow(prefs: { quiet_hours_enabled?: boolean; quiet_hours_start?: string; quiet_hours_end?: string } | null | undefined): boolean {
  if (!prefs?.quiet_hours_enabled) return false;
  const now = new Date();
  const current = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const start = prefs.quiet_hours_start || "23:00";
  const end = prefs.quiet_hours_end || "08:00";
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

function composeDigest(summary: { pending_calls?: number; todays_appointments?: number; hot_customer_name?: string | null } | null): string {
  if (!summary) return "وقتشه امروز رو مرور کنی — تماس‌ها، بازدیدها و کارهای معلق رو چک و ردیف کن.";
  const parts: string[] = [];
  if (summary.todays_appointments) parts.push(`امروز ${summary.todays_appointments} قرار بازدید داری`);
  if (summary.pending_calls) parts.push(`${summary.pending_calls} تماس پیگیری‌نشده مونده`);
  if (summary.hot_customer_name) parts.push(`مهم‌ترین مورد احتمالاً ${summary.hot_customer_name} است`);
  if (parts.length === 0) return "امروز کار معلقی نداری — وقت خوبیه برای پیدا کردن فایل یا مشتری جدید.";
  return parts.join("، ") + ".";
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
  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "push not configured" }), { status: 200 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // One notification per user who has at least one active device — not per
  // device row directly, since a user with 2 phones should still only see
  // this reasoned about once (per user_id), even though it goes out to
  // every one of their active subscriptions.
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("is_active", true);
  if (!subs?.length) return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no active devices" }), { status: 200 });

  const byUser = new Map<string, typeof subs>();
  for (const s of subs) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id)!.push(s);
  }

  const title = "Flora";

  let sent = 0;
  for (const [userId, userSubs] of byUser) {
    const { data: prefs } = await admin.from("notification_preferences").select("*").eq("user_id", userId).single();
    if (isQuietHoursNow(prefs)) continue; // a daily check-in isn't critical enough to override quiet hours

    const { data: summary } = await admin.from("digest_summary").select("*").eq("user_id", userId).single();
    const body = composeDigest(summary);

    await admin.from("notifications").insert({ user_id: userId, category: "general", title, body, url: "/" });

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

  return new Response(JSON.stringify({ ok: true, sent, users: byUser.size }), { status: 200 });
});
