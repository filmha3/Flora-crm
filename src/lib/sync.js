// Cloud sync for Flora's core dataset (properties, customers, deals, checks,
// etc.) — everything that used to live ONLY in this device's IndexedDB.
//
// Model: one row per user in `flora_data` (data jsonb, updated_at, device id)
// — already exists in Supabase with RLS scoping every row to its own
// user_id. Whole-blob upsert, last-write-wins by `updated_at`. Not a CRDT —
// if two devices edit while both offline, the one that reconnects and saves
// last wins. Good enough for one agent working across a phone + a desktop,
// not designed for simultaneous multi-editor collaboration.
//
// flora_data_snapshots is an append-only history of the same blob (see
// snapshotCloudData) — the "restore from N days ago" safety net, separate
// from the single live row in flora_data. Both are covered by the same RLS
// as flora_data itself.
import { supabase } from "./supabaseClient.js";

const DEVICE_ID_KEY = "flora-device-id";
export function getDeviceId() {
  let id;
  try { id = localStorage.getItem(DEVICE_ID_KEY); } catch (e) { /* ignore */ }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try { localStorage.setItem(DEVICE_ID_KEY, id); } catch (e) { /* ignore */ }
  }
  return id;
}

// Returns { data, updated_at, updated_by_device } or null if this user has
// never synced before (brand new account / never-migrated device).
export async function pullCloudData(userId) {
  const { data, error } = await supabase.from("flora_data").select("data, updated_at, updated_by_device").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function pushCloudData(userId, payload) {
  return supabase.from("flora_data").upsert(
    { user_id: userId, data: payload, updated_at: new Date().toISOString(), updated_by_device: getDeviceId() },
    { onConflict: "user_id" },
  );
}

// A dated checkpoint, not the live row — lets "بازیابی نسخه قدیمی‌تر" (should
// it ever be built as a UI) restore to a specific point instead of only ever
// having the single latest state.
export async function snapshotCloudData(userId, payload) {
  return supabase.from("flora_data_snapshots").insert({ user_id: userId, data: payload });
}

// Fires `onRemoteChange(row)` when a DIFFERENT device pushes new data for
// this same user while this tab is open — so two open devices converge
// live instead of only reconciling on next app launch. Returns an
// unsubscribe function.
export function subscribeCloudData(userId, onRemoteChange) {
  const thisDevice = getDeviceId();
  const channel = supabase
    .channel(`flora_data_${userId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "flora_data", filter: `user_id=eq.${userId}` }, (payload) => {
      if (payload.new && payload.new.updated_by_device !== thisDevice) onRemoteChange(payload.new);
    })
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch (e) { /* ignore */ } };
}
