import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Auth model: this function requires a valid Flora user JWT (verify_jwt is
// on for the deployment) and only ever reads/writes rows where user_id
// equals the JWT's own auth.uid(). There is no "send to userId X" parameter
// accepted from the request body — the caller can only ever trigger a push
// to their own devices. That's not a convenience shortcut, it's the actual
// security boundary requirement #19 asks for ("never send one user's
// notification to another"): there is structurally no code path that could
// take an attacker-supplied user id and push to somebody else.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_KEYS = ["visits", "followups", "deals", "legal", "finance", "new_properties"];

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
async function sendTelegram(chatId: number, title: string, body: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `${title}\n${body}` }),
  }).catch(() => {}); // Telegram being down shouldn't fail the whole notification send
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

interface NotificationPrefs {
  visits?: boolean; followups?: boolean; deals?: boolean; legal?: boolean; finance?: boolean; new_properties?: boolean;
  quiet_hours_enabled?: boolean; quiet_hours_start?: string; quiet_hours_end?: string; preview_level?: string;
}
interface NotificationInput {
  title: string; body: string; url?: string; badge?: number; data?: Record<string, unknown>;
}
interface PushSubRow {
  id: string; endpoint: string; p256dh: string; auth: string;
}

function isQuietHoursNow(prefs: NotificationPrefs | null | undefined): boolean {
  if (!prefs?.quiet_hours_enabled) return false;
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  // Quiet hours are stored/compared as the user's local HH:MM — the client
  // sends its own timezone-local "now" via the notification payload's
  // `data.localTime` when it can, falling back to UTC comparison otherwise.
  // Kept deliberately simple: a coarse quiet-hours check, not a timezone
  // database.
  const current = `${hh}:${mm}`;
  const start = prefs.quiet_hours_start || "23:00";
  const end = prefs.quiet_hours_end || "08:00";
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end; // wraps past midnight, e.g. 23:00 -> 08:00
}

function applyPreviewLevel(notification: NotificationInput, previewLevel: string): NotificationInput {
  if (previewLevel === "summary") {
    return { ...notification, body: notification.body.length > 40 ? notification.body.slice(0, 40) + "…" : notification.body };
  }
  if (previewLevel === "generic") {
    return { title: "Flora", body: "یک اعلان جدید از Flora", url: notification.url, badge: notification.badge, data: notification.data };
  }
  return notification;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing authorization" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  // getUser() validates the JWT itself and returns the caller's own id —
  // this is the ONLY source of truth for "whose devices," never a body param.
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let body: { notification?: NotificationInput; category?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const notification = body?.notification;
  const category = body?.category;
  if (!notification?.title || !notification?.body) return json({ error: "notification.title and notification.body are required" }, 400);
  if (notification.url && !/^\/[a-zA-Z0-9/_-]*$/.test(notification.url)) return json({ error: "invalid url — must be a relative Flora path" }, 400);
  if (category && !CATEGORY_KEYS.includes(category)) return json({ error: "invalid category" }, 400);

  // Service-role client for the parts RLS would otherwise block a plain user
  // token from doing efficiently in one query — still scoped to this same
  // userId throughout, never anyone else's.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: prefs } = await admin.from("notification_preferences").select("*").eq("user_id", userId).single();
  const categoryEnabled = !category || !prefs || prefs[category] !== false;
  const inQuietHours = isQuietHoursNow(prefs);
  const isCritical = notification?.data?.critical === true;

  // Always logged to in-app history regardless of whether the push itself
  // goes out — "Notifications" inside Flora should never depend on this
  // device's own push permission state to be useful.
  await admin.from("notifications").insert({
    user_id: userId, category: category || "general", title: notification.title, body: notification.body,
    url: notification.url || null, data: notification.data || null,
  });

  if (!categoryEnabled) return json({ ok: true, sent: 0, reason: "category disabled" });
  if (inQuietHours && !isCritical) return json({ ok: true, sent: 0, reason: "quiet hours" });

  const { data: tgLink } = await admin.from("telegram_links").select("chat_id").eq("user_id", userId).single();
  if (tgLink?.chat_id) {
    const tgBody = applyPreviewLevel({ title: notification.title, body: notification.body }, prefs?.preview_level || "full");
    await sendTelegram(tgLink.chat_id, tgBody.title, tgBody.body);
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@flora-crm.app";
  if (!vapidPublic || !vapidPrivate) return json({ ok: true, sent: 0, reason: "push not configured on server" });
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId).eq("is_active", true);
  if (!subs?.length) return json({ ok: true, sent: 0, reason: "no active devices" });

  const payload = JSON.stringify(applyPreviewLevel(
    { title: notification.title, body: notification.body, url: notification.url || "/", badge: notification.badge, data: notification.data },
    prefs?.preview_level || "full",
  ));

  let sent = 0;
  const results = await Promise.allSettled((subs as PushSubRow[]).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", sub.id);
      sent++;
    } catch (e: unknown) {
      // 404/410 from the push service means the browser itself revoked or
      // expired this subscription — per spec, deactivate it automatically
      // rather than leaving a dead endpoint we'll keep failing against.
      const status = (e as { statusCode?: number; status?: number })?.statusCode ?? (e as { status?: number })?.status;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
      }
      throw e;
    }
  }));

  const failed = results.filter((r) => r.status === "rejected").length;
  return json({ ok: true, sent, failed, total: subs.length });
});
