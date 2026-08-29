import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// This function is NOT user-triggered — it's called on a schedule by
// pg_cron (via pg_net), so there's no user JWT to authenticate with. In
// place of that, it requires a shared secret header that only the cron job
// itself knows, set once as both a Postgres cron-job header and this
// function's own secret. Without a valid header, it does nothing.
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

function applyPreviewLevel(n: { title: string; body: string; url?: string }, level: string) {
  if (level === "summary") return { ...n, body: n.body.length > 40 ? n.body.slice(0, 40) + "…" : n.body };
  if (level === "generic") return { title: "Flora", body: "یک اعلان جدید از Flora", url: n.url };
  return n;
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

  // A batch cap per run — this fires every few minutes, so anything beyond
  // this just gets picked up on the next tick rather than one run trying to
  // process an unbounded backlog.
  const { data: due } = await admin
    .from("scheduled_reminders")
    .select("*")
    .eq("sent", false)
    .lte("remind_at", new Date().toISOString())
    .order("remind_at", { ascending: true })
    .limit(200);

  if (!due?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });

  let processed = 0;
  for (const reminder of due) {
    const { data: prefs } = await admin.from("notification_preferences").select("*").eq("user_id", reminder.user_id).single();
    const categoryEnabled = !reminder.category || !prefs || prefs[reminder.category] !== false;
    const inQuietHours = reminder.category === "test" ? false : isQuietHoursNow(prefs);

    await admin.from("notifications").insert({
      user_id: reminder.user_id, category: reminder.category || "general",
      title: reminder.title, body: reminder.body, url: reminder.url || null,
    });

    if (categoryEnabled && !inQuietHours) {
      // Check due-date reminders (category "finance") carry the amount and
      // recipient — the whole point of the notification — so they're never
      // summarized or genericized, regardless of the user's own preview
      // preference. Every other category still respects it.
      const effectiveLevel = reminder.category === "finance" ? "full" : (prefs?.preview_level || "full");
      const { data: tgLink } = await admin.from("telegram_links").select("chat_id").eq("user_id", reminder.user_id).single();
      if (tgLink?.chat_id) {
        const tgBody = applyPreviewLevel({ title: reminder.title, body: reminder.body }, effectiveLevel);
        await sendTelegram(tgLink.chat_id, tgBody.title, tgBody.body);
      }

      const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", reminder.user_id).eq("is_active", true);
      const payload = JSON.stringify(applyPreviewLevel({ title: reminder.title, body: reminder.body, url: reminder.url || "/" }, effectiveLevel));
      if (pushConfigured) {
        for (const sub of subs || []) {
          try {
            const result = await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
            await admin.from("push_subscriptions").update({
              last_used_at: new Date().toISOString(),
              last_send_status: String(result?.statusCode ?? "ok"),
              last_send_error: null,
            }).eq("id", sub.id);
          } catch (e: unknown) {
            const err = e as { statusCode?: number; status?: number; body?: string; message?: string };
            const status = err?.statusCode ?? err?.status;
            await admin.from("push_subscriptions").update({
              last_send_status: String(status ?? "error"),
              last_send_error: (err?.body || err?.message || "unknown error").slice(0, 300),
            }).eq("id", sub.id);
            if (status === 404 || status === 410) await admin.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
          }
        }
      }
    }

    await admin.from("scheduled_reminders").update({ sent: true }).eq("id", reminder.id);
    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), { status: 200 });
});
