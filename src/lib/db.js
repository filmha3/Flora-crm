// IndexedDB persistence layer — every dbGet/dbSet call is scoped to the
// signed-in user via ACTIVE_UID, set once a Supabase session resolves.
const DB_NAME = "flora-crm-db", STORE = "kv", DATA_KEY = "flora-data", SETTINGS_KEY = "flora-settings", REMINDER_KEY = "flora-last-reminder", COPILOT_KEY = "flora-copilot", CHAT_KEY = "flora-ai-chat", FINANCE_AI_KEY = "flora-finance-ai", MISSION_KEY = "flora-mission", AUTOBACKUP_KEY = "flora-autobackup", NBA_KEY = "flora-nba-outcomes", STREAK_KEY = "flora-streak", MARKET_INSIGHT_KEY = "flora-market-insight", DIVAR_CHAT_KEY = "flora-divar-chat";
// Every dbGet/dbSet call goes through this same IndexedDB store, so a single
// device can (and did, before this) end up showing one account's CRM data to
// whoever else logs in on that device. ACTIVE_UID gets set the moment a
// session resolves (see the auth effect in FloraCRM) and every key is
// silently suffixed with it — old code that calls dbGet(DATA_KEY) doesn't
// need to change at all, it's just reading a different physical row per user.
let ACTIVE_UID = null;
const scopedKey = (key) => (ACTIVE_UID ? `${key}:${ACTIVE_UID}` : key);

// iOS Safari (especially in home-screen/PWA mode, after the app was
// backgrounded or the device locked and resumed) has a known, documented
// tendency to leave an IndexedDB request permanently pending — no error, no
// success, just silence forever, with nothing network-related involved at
// all. Every IndexedDB call in this file is wrapped so a stuck request can
// never again hang the whole app on the loading screen indefinitely.
function withDbTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), 4000)),
  ]);
}

function openDB() {
  return withDbTimeout(new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // Fires when an older connection (e.g. a stale tab) is holding the
    // upgrade open — without this handler the request just sits pending,
    // which is exactly the kind of silent hang this whole wrapper exists to
    // catch.
    req.onblocked = () => reject(new Error("indexeddb blocked"));
  }), "openDB");
}
async function dbGet(key) {
  const db = await openDB();
  return withDbTimeout(new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(scopedKey(key));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }), "dbGet");
}
async function dbSet(key, value) {
  const db = await openDB();
  return withDbTimeout(new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, scopedKey(key));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }), "dbSet");
}

export { DB_NAME, STORE, DATA_KEY, SETTINGS_KEY, REMINDER_KEY, COPILOT_KEY, CHAT_KEY, FINANCE_AI_KEY, MISSION_KEY, AUTOBACKUP_KEY, NBA_KEY, STREAK_KEY, MARKET_INSIGHT_KEY, DIVAR_CHAT_KEY, scopedKey, openDB, dbGet, dbSet };
export function setActiveUid(uid) { ACTIVE_UID = uid; }
