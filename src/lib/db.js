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
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), 3000)),
  ]);
}

// ONE shared connection for the whole app. Before, every dbGet/dbSet opened
// a brand-new IndexedDB connection and never closed it — on iPhone they
// piled up until Safari ran out of memory and reloaded the page.
const DB_VERSION = 2, BLOB_STORE = "blobs";
let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  const p = withDbTimeout(new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { try { db.close(); } catch (e) { /* ignore */ } _dbPromise = null; };
      db.onclose = () => { _dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("indexeddb blocked"));
  }), "openDB");
  _dbPromise = p;
  p.catch(() => { if (_dbPromise === p) _dbPromise = null; });
  return p;
}
// iOS sometimes closes the connection silently — drop it and retry once.
async function withStore(storeName, mode, fn) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const db = await openDB();
    try {
      return await withDbTimeout(new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const res = fn(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(res && "result" in res ? res.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("tx aborted"));
      }), storeName + ":" + mode);
    } catch (e) {
      if (attempt === 0 && (e?.name === "InvalidStateError" || /closing|closed/i.test(e?.message || ""))) { _dbPromise = null; continue; }
      throw e;
    }
  }
}
async function dbGet(key) { return withStore(STORE, "readonly", (st) => st.get(scopedKey(key))); }
async function dbSet(key, value) { return withStore(STORE, "readwrite", (st) => { st.put(value, scopedKey(key)); }); }
// Raw File/Blob storage for videos & documents — kept OUT of the main data.
async function blobSet(id, blob) { return withStore(BLOB_STORE, "readwrite", (st) => { st.put(blob, id); }); }
async function blobGet(id) { return withStore(BLOB_STORE, "readonly", (st) => st.get(id)); }
async function blobDelete(id) { return withStore(BLOB_STORE, "readwrite", (st) => { st.delete(id); }); }

export { DB_NAME, STORE, DATA_KEY, SETTINGS_KEY, REMINDER_KEY, COPILOT_KEY, CHAT_KEY, FINANCE_AI_KEY, MISSION_KEY, AUTOBACKUP_KEY, NBA_KEY, STREAK_KEY, MARKET_INSIGHT_KEY, DIVAR_CHAT_KEY, scopedKey, openDB, dbGet, dbSet, blobSet, blobGet, blobDelete };
export function setActiveUid(uid) { ACTIVE_UID = uid; }
