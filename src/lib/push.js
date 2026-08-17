// Web Push helpers. Deliberately does nothing on import — permission is
// only ever requested from an explicit user tap (see Notifications.jsx),
// never automatically, per spec.
import { supabase } from "./supabaseClient.js";

// The VAPID public key is safe to ship in frontend code by design — it's
// how a push service verifies which server is allowed to send to a given
// subscription, not a secret. The private key never leaves Supabase's
// function secrets.
export const VAPID_PUBLIC_KEY = "BJD8bAkPRn57CTs0hJ7ZjyUdkKMdmXcGoADvr2ORteS_g1tv_sY_zkdcWaXjUijN7eLIxmZGl5H6w00ovP7fBQ0";

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// iOS only fires PushManager into existence for a page running as an
// installed Home Screen web app (iOS 16.4+) — a normal Safari tab reports
// no PushManager at all, which isPushSupported() above already catches.
// This just narrows down *why*, for the onboarding copy.
export function isIos() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
}
export function isInStandaloneMode() {
  return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (isIos()) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  return "other";
}
function detectDeviceName() {
  const platform = detectPlatform();
  const label = { ios: "آیفون", android: "اندروید", mac: "مک", windows: "ویندوز", other: "دستگاه" }[platform];
  const browser = /CriOS/.test(navigator.userAgent) ? "کروم" : /FxiOS/.test(navigator.userAgent) ? "فایرفاکس" : /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? "سافاری" : "مرورگر";
  return `${label} · ${browser}`;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// The one function the "اعلان‌های Flora را فعال کن" button calls. Everything
// upstream of this (permission prompt, subscribe call) only ever runs from
// that explicit tap — never on page load.
export async function enablePush() {
  if (!isPushSupported()) throw new Error("NOT_SUPPORTED");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("PERMISSION_DENIED");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("NOT_SIGNED_IN");

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    device_name: detectDeviceName(),
    platform: detectPlatform(),
    last_used_at: new Date().toISOString(),
    is_active: true,
  }, { onConflict: "user_id,endpoint" });
  if (error) throw error;

  return sub;
}

export async function disablePush() {
  const sub = await getExistingSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("push_subscriptions").update({ is_active: false }).eq("user_id", user.id).eq("endpoint", endpoint);
    }
  }
}

export async function getPushPermissionState() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}
