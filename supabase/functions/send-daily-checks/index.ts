import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Cron-secret pattern, same as the other scheduled functions — no user JWT,
// pg_cron's net.http_post only sends x-cron-secret.
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

// ---------- Jalali calendar — same algorithm as src/lib/format.js, ported
// here since an edge function can't import the client bundle. "این ماه"
// for an Iranian real-estate CRM means the Jalali month, not the Gregorian
// one, so this is what actually decides which checks count as "due this
// month," not just a date-string prefix match. ----------
const div = (a: number, b: number) => Math.floor(a / b);
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * div(days, 12053); days %= 12053;
  jy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}
function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div(((jy % 33) + 3), 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097); days %= 146097;
  if (days > 36524) { gy += 100 * div(--days, 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
  const gd0 = days + 1;
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, isLeapG ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0, gd = gd0;
  for (gm = 1; gm <= 12; gm++) { if (gd <= sal[gm]) break; gd -= sal[gm]; }
  return [gy, gm, gd];
}
const LEAP_CYCLE = [1, 5, 9, 13, 17, 22, 26, 30];
const isLeapJalali = (jy: number) => LEAP_CYCLE.includes(((jy % 33) + 33) % 33);
const jalaliMonthLength = (jy: number, jm: number) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJalali(jy) ? 30 : 29);
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (gy: number, gm: number, gd: number) => `${gy}-${pad(gm)}-${pad(gd)}`;

function currentJalaliMonthRange(): { startIso: string; endIso: string } {
  const now = new Date();
  const [jy, jm] = gregorianToJalali(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  const [sgy, sgm, sgd] = jalaliToGregorian(jy, jm, 1);
  const [egy, egm, egd] = jalaliToGregorian(jy, jm, jalaliMonthLength(jy, jm));
  return { startIso: toIso(sgy, sgm, sgd), endIso: toIso(egy, egm, egd) };
}

interface CheckItem { recipient?: string; amount?: number; dueDate?: string; paid?: boolean }

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

  const { startIso, endIso } = currentJalaliMonthRange();

  // Checks live inside each user's single flora_data JSONB blob (the same
  // place properties/customers/etc. live) — there's no separate checks
  // table, so this reads that blob directly rather than requiring a second,
  // parallel mirror just for this one notification.
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
    const checks: CheckItem[] = Array.isArray(row.data?.checks) ? row.data.checks : [];
    const due = checks
      .filter((ch) => !ch.paid && ch.dueDate && ch.dueDate >= startIso && ch.dueDate <= endIso)
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    if (due.length === 0) continue;

    const userSubs = subsByUser.get(row.user_id) || [];
    const chatId = tgByUser.get(row.user_id);
    if (userSubs.length === 0 && !chatId) continue;

    const { data: prefs } = await admin.from("notification_preferences").select("*").eq("user_id", row.user_id).single();
    if (isQuietHoursNow(prefs)) continue;

    const total = due.reduce((sum, ch) => sum + (Number(ch.amount) || 0), 0);
    const totalFmt = total ? Math.round(total).toLocaleString("de-DE") + " تومان" : "";
    const first = due[0];
    const body = due.length === 1
      ? `این ماه ۱ چک داری: ${first.recipient || "بدون نام"} به مبلغ ${totalFmt}، سررسید ${first.dueDate}.`
      : `این ماه ${due.length} چک داری، مجموعاً ${totalFmt}. نزدیک‌ترین: ${first.recipient || "بدون نام"} در ${first.dueDate}.`;

    await admin.from("notifications").insert({ user_id: row.user_id, category: "finance", title, body, url: "/" });
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

  return new Response(JSON.stringify({ ok: true, notified, sent, range: { startIso, endIso } }), { status: 200 });
});
