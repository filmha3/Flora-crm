import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";
import {
  Home, Building2, Users, Search, Plus, X, Moon, Sun, Sparkles, MapPin, Ruler,
  UserCircle2, PhoneCall, CheckCircle2, Loader2, Trash2, ImagePlus, Play,
  ChevronLeft, ChevronRight, Hammer, CalendarDays, Trees, Store, Briefcase,
  ArrowUpDown, BadgeCheck, Bell, MoreHorizontal, Calendar, ArrowRight,
  LayoutList, LayoutGrid, ChevronUp, Download, Upload, Building, Columns3, Edit3,
  MessageSquare, AlertTriangle, TrendingUp, ShieldAlert, HardHat, ArrowUpRight, Bot, RefreshCw, Send, Link2, Wand2, MessageCircle, Wallet,
  CreditCard, Banknote, Landmark, FileCheck, Award, TrendingDown, ChevronDown, Eye, FileText, Tag, StickyNote, Image as ImageIcon, Flame, Mic, Copy, UserX, Trophy, Share2, Camera, Globe,
  Key, Heart, Meh, Car, Clock, Circle, ArrowUp, ArrowDown, Medal, Check, Navigation as NavigationIcon,
} from "lucide-react";

// ---------- Extracted modules (kept App.jsx from becoming a single
// unmanageable/unshippable file — see src/lib and src/components) ----------
import { DB_NAME, STORE, DATA_KEY, SETTINGS_KEY, REMINDER_KEY, COPILOT_KEY, CHAT_KEY, FINANCE_AI_KEY, MISSION_KEY, AUTOBACKUP_KEY, NBA_KEY, STREAK_KEY, MARKET_INSIGHT_KEY, DIVAR_CHAT_KEY, scopedKey, openDB, dbGet, dbSet, setActiveUid } from "./lib/db.js";
import { pullCloudData, pushCloudData, snapshotCloudData, subscribeCloudData } from "./lib/sync.js";
import { div, faDigits, MONTHS_FA, WEEK_FA, LEAP_CYCLE, isLeapJalali, gregorianToJalali, jalaliToGregorian, isoToJalali, jalaliToIso, fmtJalali, jalaliMonthLength, jalaliFirstWeekday, toEnDigits, toDecimal, toNum, parseDivarText, uid, fmtToman, todayISO } from "./lib/format.js";
import { TYPE_ICON, typeIcon, floraTypeIcon, STAGES, CUSTOMER_STAGES, INVESTMENT_STATUSES, INVESTMENT_TYPES, INVESTMENT_EXPENSE_CATEGORIES, INVESTMENT_PAYMENT_METHODS, CHECK_STATUSES, CUSTOMER_STAGE_COLOR, fmtBudgetShort, BUILD_STAGES, DEAL_FILTERS, TYPE_FILTERS, STAGE_FILTERS } from "./lib/constants.js";
import { MAX_IMAGE_DIM, IMAGE_QUALITY, supportsWebp, FALLBACK_DIM, FALLBACK_QUALITY, compressImage, reencodeToWebp, filesToMedia } from "./lib/image.js";
import { T, FS, FW, SP, RAD, glass, glassLite, glassSurface } from "./lib/theme.js";
import { COORD_ORDER, coordMeta, KEY_ORDER, KEY_LABEL, DISLIKE_REASONS, RATING_ORDER, ratingMeta, mapsLink } from "./lib/tourMeta.js";
import { useCountUp, CountUpToman, CountUpTomanSplit, CountUpNum } from "./lib/countup.jsx";
import { FLORA_GOLD, FloraMark, DivarMark, EmptyLine, BodyPortal, Field, inputStyle, JalaliDatePicker, MediaThumb, MediaFull } from "./lib/ui.jsx";
import { uploadPropertyImageBatch, migrateLegacyMediaItem, deletePropertyPhotoPaths, deletePropertyFolder } from "./lib/imageStore.js";
import { AuthPhoneField, AuthLoadingScreen, PasswordBoxes, AuthScreen, CityPopup, OnboardingTour, formatPhoneDisplay, phoneToE164 } from "./components/Auth.jsx";
import { TourEntryCard, TourWizard, TourStepCustomer, TourStepProperties, TourStepReview, TourSession, TourFocusMode, TourCompleteScreen } from "./components/Tour.jsx";
import { LegalTile, LegalHome } from "./components/Legal.jsx";
import { NotificationsView } from "./components/Notifications.jsx";
import { SIZE_CATEGORIES, sizeCategoryOf, getPriceForDisplay } from "./lib/customerMode.js";
import { SAREIN_CENTER, DARK_TILE_URL, LIGHT_TILE_URL, DARK_TILE_FILTER, loadLeaflet, reverseGeocodeAddress } from "./lib/geo.js";
import { FloraValuationSheet } from "./components/Valuation.jsx";
import { ConstructionHome } from "./components/Construction.jsx";
import { ChecksHome } from "./components/Checks.jsx";

// ---------- Local persistence (IndexedDB) — keeps data on this device between visits ----------




// Counts up to the value instead of popping in, which makes figures feel alive.



// CARTO's Dark Matter basemap — OSM data, but rendered dark by design. Chosen
// over filtering the standard light OSM tiles: filters that darken enough to
// ---------- Seed data ----------
const seedOwners = [{ id: "o1", name: "آقای رحیمی", phone: "09121234567" }, { id: "o2", name: "خانم صادقی", phone: "09351234567" }];
const seedBuilders = [{ id: "b1", name: "شرکت سازه پارس", phone: "02122223333" }];
const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString();
const seedProperties = [
  { id: "p1", title: "آپارتمان ۱۲۰ متری سعادت‌آباد", type: "آپارتمان", deal: "فروش", pricePerMeter: 70000000, price: 8400000000, area: 120, rooms: 2, floor: 3, furnished: "با لوازم", address: "سعادت‌آباد، خیابان سرو", ownerId: "o1", builderId: "", stage: "فعال", desc: "", media: [], createdAt: daysAgoISO(3) },
  { id: "p2", title: "ویلا دوبلکس لواسان", type: "ویلا", deal: "فروش", pricePerMeter: 150000000, price: 45000000000, area: 300, rooms: 4, floor: 1, furnished: "بدون لوازم", address: "لواسان، جاده امام‌زاده", ownerId: "o2", builderId: "", stage: "در حال مذاکره", desc: "", media: [], createdAt: daysAgoISO(52) },
  { id: "p3", title: "پیش‌فروش برج مروارید", type: "آپارتمان", deal: "پیش‌فروش", pricePerMeter: 55000000, price: 4950000000, area: 90, rooms: 2, floor: 7, furnished: "بدون لوازم", address: "پونک، بلوار گلستان", ownerId: "", builderId: "b1", stage: "فعال", desc: "", media: [], createdAt: daysAgoISO(10) },
];
const seedCustomers = [
  { id: "c1", name: "مهدی کریمی", phone: "09190001122", need: "خرید آپارتمان ۲ خواب سعادت‌آباد", budget: 9000000000 },
  { id: "c2", name: "سارا محمدی", phone: "09380002233", need: "اجاره ویلا شمال یا لواسان", budget: 50000000 },
];
const seedAppointments = [{ id: "a1", propertyId: "p1", customerId: "c1", customerName: "مهدی کریمی", date: todayISO(), time: "17:00", notes: "بازدید اول" }];
const seedCalls = [{ id: "cl1", customerId: "c2", customerName: "سارا محمدی", customerPhone: "09380002233", date: todayISO(), status: "در انتظار پاسخ", notes: "پیگیری قیمت ویلا" }];
const seedDeals = [
  { id: "d1", propertyId: "p1", propertyTitle: "آپارتمان ۱۲۰ متری سعادت‌آباد", sellerName: "آقای رحیمی", sellerPhone: "09121234567", buyerName: "مهدی کریمی", buyerPhone: "09190001122", price: 8400000000, sellerPct: 1, buyerPct: 0.5, advisor: "من", status: "تسویه شده", createdAt: daysAgoISO(20) },
  { id: "d2", propertyId: "p2", propertyTitle: "ویلا دوبلکس لواسان", sellerName: "خانم صادقی", sellerPhone: "09351234567", buyerName: "سارا محمدی", buyerPhone: "09380002233", price: 45000000, sellerPct: 5, buyerPct: 0, advisor: "من", status: "در انتظار پرداخت", createdAt: daysAgoISO(8) },
];
const seedPayments = [
  { id: "pay1", dealId: "d1", payerType: "seller", amount: 84000000, date: daysAgoISO(18).slice(0, 10), method: "transfer", tracking: "", note: "" },
];
const seedExpenses = [
  { id: "exp1", category: "تبلیغات دیوار", title: "شارژ آگهی دیوار", amount: 2500000, date: daysAgoISO(10).slice(0, 10), note: "" },
  { id: "exp2", category: "اجاره مغازه", title: "اجاره دفتر", amount: 15000000, date: daysAgoISO(15).slice(0, 10), note: "" },
];
const seedOfficeIncomes = [
  { id: "inc1", category: "حق مشاوره", title: "حق مشاوره قرارداد اجاره", amount: 5000000, date: daysAgoISO(5).slice(0, 10), note: "" },
];

// Six separate boxes instead of one text field: each digit auto-advances
// focus to the next box, backspace on an empty box steps back, and filling
// the last box auto-submits — no separate "confirm" tap needed, matching how
// native OTP autofill feels. A short glow on each filled box is the only
// motion cue; framer-motion isn't a dependency here, so it's a plain CSS
// keyframe instead of a spring.
// Auto-inserts the dashes as you type: 0912-000-0000. Internally the app
// only ever works with the raw digits / E.164 form — the dashes are purely
// a display convenience.

export default function FloraCRM() {
  const [dark, setDark] = useState(true);
  // Simple mode hides advanced tools (finance, split, AI) behind "more", so a first-time
  // agent sees only the essentials. On by default; a switch in More restores everything.
  const [simpleMode, setSimpleMode] = useState(true);
  const c = dark ? T.dark : T.light;

  // The rubber-band overscroll shows the page background, not the app's — so paint it too.
  useEffect(() => {
    document.documentElement.style.background = c.bg;
    document.body.style.background = c.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", c.bg);
  }, [c.bg]);

  // undefined = still checking on load, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    let resolved = false;

    supabase.auth.getSession().then(({ data }) => {
      resolved = true;
      setActiveUid(data.session?.user?.id || null);
      setSession(data.session);
      setBootProgress((p) => Math.max(p, 20));
    });

    // getSession() refreshes an expiring token over the network before it
    // resolves — with no timeout of its own, a network drop at exactly that
    // moment (airplane mode toggled, wifi/cellular handoff) hangs it
    // indefinitely, and since session stays `undefined` the whole app is
    // stuck on the loading screen forever. After 3s with no real answer,
    // fall back to whatever Supabase already persisted to localStorage on
    // the last successful login — written synchronously, no network
    // involved — so the app can proceed. This is provisional, not final:
    // the real getSession() call above still overwrites it the moment the
    // network actually answers, whether that confirms or invalidates it.
    const fallbackTimer = setTimeout(() => {
      if (resolved) return;
      try {
        const key = Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k));
        const raw = key ? JSON.parse(localStorage.getItem(key) || "null") : null;
        const cached = raw?.currentSession || raw || null;
        setActiveUid(cached?.user?.id || null);
        setSession(cached);
        setBootProgress((p) => Math.max(p, 20));
      } catch (e) { setSession(null); }
    }, 3000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      resolved = true;
      clearTimeout(fallbackTimer);
      setActiveUid(s?.user?.id || null);
      setSession(s);
    });
    return () => { clearTimeout(fallbackTimer); sub.subscription.unsubscribe(); };
  }, []);

  // A notification was tapped while the app was in the background/closed —
  // the service worker has no app state of its own to navigate with, so it
  // just posts what it knows and this decides where that actually goes once
  // a real window exists to route in.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event) => {
      if (event.data?.type !== "flora-notification-click") return;
      const data = event.data.data || {};
      if (data.type === "property" && data.id) setDetail({ type: "property", id: data.id });
      else if (data.type === "customer" && data.id) setDetail({ type: "customer", id: data.id });
      else if (data.type === "finance") setTab("finance");
      else if (data.type === "legal") setLegalOpen(true);
      else setTab("home");
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []); // eslint-disable-line

  // null = checking/not-yet-known, false = title+city missing (show onboarding),
  // true = profile complete
  const [profileReady, setProfileReady] = useState(null);
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!session) { setProfileReady(null); return; }
    let cancelled = false;
    (async () => {
      try {
        // A brand-new signup has no `profiles` row yet at all (it's only
        // created once onboarding is submitted) — .single() against zero
        // rows returns an error (PGRST116), which is the expected, normal
        // case here, not a failure. The race against a timeout is the real
        // fix: any genuine problem (RLS hiccup, dropped connection) used to
        // leave profileReady stuck at null forever, stranding the person on
        // the loading screen with no way forward. Now it always resolves to
        // a real boolean within 8s, worst case sending them to onboarding.
        const { data } = await Promise.race([
          supabase.from("profiles").select("title, city, tour_seen").eq("id", session.user.id).single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("profile check timed out")), 8000)),
        ]);
        if (!cancelled) {
          setProfileReady(!!data?.city);
          if (data?.city && !data?.tour_seen) setShowTour(true);
        }
      } catch (e) {
        if (!cancelled) setProfileReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]); // eslint-disable-line

  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null); // bottom-sheet forms
  const [detail, setDetail] = useState(null); // full-screen property/customer detail
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [focusQueue, setFocusQueue] = useState(null); // { actions, index } — Deal Coach focus mode
  const [celebration, setCelebration] = useState(null); // { kind, label } — app-wide win animation
  const celebrationTimer = useRef(null);
  const celebrate = (payload) => {
    clearTimeout(celebrationTimer.current);
    setCelebration(payload);
    celebrationTimer.current = setTimeout(() => setCelebration(null), 1600);
  };
  const [mapPicker, setMapPicker] = useState(null); // separate overlay so it never closes the form underneath
  const [propStageHint, setPropStageHint] = useState("همه");

  const [properties, setProperties] = useState(seedProperties);
  const [owners, setOwners] = useState(seedOwners);
  const [builders, setBuilders] = useState(seedBuilders);
  const [customers, setCustomers] = useState(seedCustomers);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [calls, setCalls] = useState(seedCalls);
  const [deals, setDeals] = useState(seedDeals);
  const [payments, setPayments] = useState(seedPayments);
  const [expenses, setExpenses] = useState(seedExpenses);
  // The office splits every received commission three ways. Kept as settings (not baked into
  // each payment) so the whole ledger stays consistent if the ratio is ever corrected.
  const [splitShares, setSplitShares] = useState({ agent: 1, management: 1, rent: 1 });
  const [officeIncomes, setOfficeIncomes] = useState(seedOfficeIncomes);
  const [investments, setInvestments] = useState([]); // Investment Center (Portfolio) — Phase 1
  // Manual reference prices an advisor enters for a street when Flora's own
  // comparable listings aren't enough. Never system-computed, never AI-
  // guessed — always the advisor's own real market knowledge, kept separate
  // from (and clearly labeled apart from) comparables actually in the
  // database, per the "no fake data" rule.
  const [streetPrices, setStreetPrices] = useState([]);
  // Construction & Building — deliberately its own space, not folded into
  // general Finance. Voice/text entries never store the audio itself (only
  // the extracted transcript text), per explicit instruction — keeps this
  // simple and avoids a storage-growth concern nobody asked to take on.
  const [constructionProjects, setConstructionProjects] = useState([]);
  const [constructionTransactions, setConstructionTransactions] = useState([]);
  const [legalConversations, setLegalConversations] = useState([]);
  const [checks, setChecks] = useState([]); // Checks to pay — recipient, amount, due date, voice-capable
  const [tours, setTours] = useState([]); // Showing / Tour Mode
  const [tourBuilder, setTourBuilder] = useState(null); // { step, customerId, customerName, customerPhone, propertyIds, items }
  const [openTourId, setOpenTourId] = useState(null); // active/reviewing tour currently on screen
  const [divarSearchOpen, setDivarSearchOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [quickValuationOpen, setQuickValuationOpen] = useState(false);
  const [constructionOpen, setConstructionOpen] = useState(false);
  const [checksOpen, setChecksOpen] = useState(false);
  // One-shot hand-off from Quick Valuation to the real property form, so
  // "ذخیره به‌عنوان فایل" never re-asks for location/area it already has.
  const [prefillNew, setPrefillNew] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Hoisted (not local to the Files tab) so the same mode carries through
  // into PropertyDetail when the agent taps into a file to actually show it
  // to the customer — not just on the grid.
  const [customerMode, setCustomerMode] = useState(false);
  const [showCustomerPrice, setShowCustomerPrice] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [perplexityKey, setPerplexityKey] = useState("");
  const [avalaiKey, setAvalaiKey] = useState("");
  const [avalaiModel, setAvalaiModel] = useState("gpt-4o-mini");
  const [aiProvider, setAiProvider] = useState("avalai");
  const [agentName, setAgentName] = useState("");
  const [agentPhoto, setAgentPhoto] = useState(""); // compressed base64, same pipeline as property photos
  const [agencyName, setAgencyName] = useState("املاک گنجینه");
  const [agencyCity, setAgencyCity] = useState("سرعین");
  const [loaded, setLoaded] = useState(false);
  const [bootProgress, setBootProgress] = useState(4);

  const [toast, setToast] = useState(null);
  // notify() is the one shared touchpoint every save/delete/error confirmation
  // in the app already passes through — a short haptic pulse here makes
  // tactile feedback consistent everywhere in one change, instead of the
  // previous state where only two unrelated recording features (each with
  // their own separate vibrate() copy) had any haptic feedback at all.
  const notify = (msg) => {
    try { navigator.vibrate?.(12); } catch (e) { /* not supported — silent, as it should be */ }
    setToast(msg); setTimeout(() => setToast(null), Math.min(6000, 2000 + msg.length * 40));
  };

  // Highest updated_at we've either pulled from or pushed to the cloud this
  // session — the save effect below waits for this before it's allowed to
  // push, so a first-launch device with an empty local store can never race
  // ahead and stomp real cloud data before the initial pull has even
  // resolved. Also gates the realtime handler against reacting to our own echo.
  const cloudSyncedAtRef = useRef(0);
  const [cloudReady, setCloudReady] = useState(false);

  // Any cloud call made during boot MUST resolve one way or another in
  // bounded time — a fetch that stalls mid-reconnect (wifi/cellular
  // handoff, airplane mode toggled) can otherwise hang with no timeout of
  // its own and leave the "Flora در حال آماده‌سازی..." screen up forever,
  // since setLoaded(true) below waits for this whole block to finish.
  const withTimeout = (promise, ms = 3000) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);

  const applyCoreData = (d) => {
    setProperties(d?.properties || []);
    setOwners(d?.owners || []);
    setBuilders(d?.builders || []);
    setCustomers(d?.customers || []);
    setAppointments(d?.appointments || []);
    setCalls(d?.calls || []);
    setDeals(d?.deals || []);
    setPayments(d?.payments || []);
    setExpenses(d?.expenses || []);
    setOfficeIncomes(d?.officeIncomes || []);
    setInvestments(d?.investments || []);
    setChecks(d?.checks || []);
    setStreetPrices(d?.streetPrices || []);
    setConstructionProjects(d?.constructionProjects || []);
    setConstructionTransactions(d?.constructionTransactions || []);
    setTours(d?.tours || []);
    setLegalConversations(d?.legalConversations || []);
  };

  useEffect(() => {
    if (session === undefined) return; // ACTIVE_UID isn't set yet — wait rather than read the wrong user's key
    (async () => {
      let core = null;
      try {
        const saved = await dbGet(DATA_KEY);
        core = saved || null;
        applyCoreData(core);
        setBootProgress((p) => Math.max(p, 45));

        // Cloud reconciliation: whichever side (this device's IndexedDB vs.
        // the flora_data row) has the newer updated_at wins and overwrites
        // the other — the whole point being that a fresh install, a cleared
        // browser, or a different phone still ends up with the real data,
        // not the empty seed state.
        if (session?.user) {
          try {
            const cloud = await withTimeout(pullCloudData(session.user.id));
            const localTs = core?.updatedAt || 0;
            const cloudTs = cloud?.updated_at ? new Date(cloud.updated_at).getTime() : 0;
            if (cloud && cloudTs > localTs) {
              core = { ...cloud.data, updatedAt: cloudTs };
              applyCoreData(core);
              dbSet(DATA_KEY, core).catch(() => {});
              cloudSyncedAtRef.current = cloudTs;
            } else if (core) {
              // Local is newer (or cloud row doesn't exist yet) — push it up
              // now instead of waiting for the next edit, so a device that's
              // only ever been read from still ends up backed up in the cloud.
              await withTimeout(pushCloudData(session.user.id, core));
              cloudSyncedAtRef.current = Date.now();
            }
          } catch (e) { console.warn("Flora: cloud sync unavailable, continuing offline-only", e); }
        }
        setCloudReady(true);
        setBootProgress((p) => Math.max(p, 80));

        const settings = await dbGet(SETTINGS_KEY);
        setGeminiKey(settings?.geminiKey || "");
        setPerplexityKey(settings?.perplexityKey || "");
        setAvalaiKey(settings?.avalaiKey || "");
        if (settings?.avalaiModel) setAvalaiModel(settings.avalaiModel);
        if (settings?.aiProvider) setAiProvider(settings.aiProvider);
        setAgentName(settings?.agentName || "");
        setAgentPhoto(settings?.agentPhoto || "");
        if (settings?.agencyName) setAgencyName(settings.agencyName);
        if (settings?.agencyCity) setAgencyCity(settings.agencyCity);
        if (settings?.splitShares) setSplitShares(settings.splitShares);
        setSimpleMode(typeof settings?.simpleMode === "boolean" ? settings.simpleMode : false);
      } catch (e) { console.error("Flora: load failed", e); }
      setBootProgress(100);
      setLoaded(true);
    })();
    // Deliberately keyed on the identity, not the session object: Supabase
    // fires new session objects on token refresh, and reloading from disk
    // every time would clobber any in-memory edit not yet flushed to IndexedDB.
  }, [session === undefined ? "pending" : session?.user?.id || "signed-out"]); // eslint-disable-line
  // Debounced: writing the whole dataset on every keystroke was the main source of lag.
  // Also pushes the same snapshot to the cloud (flora_data) once the initial
  // pull/reconcile above has finished — cloudReady is the guard that stops
  // an empty-on-launch device from racing ahead and overwriting real cloud
  // data with its own still-loading blank state.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      const now = Date.now();
      const core = { properties, owners, builders, customers, appointments, calls, deals, payments, expenses, officeIncomes, investments, tours, checks, streetPrices, constructionProjects, constructionTransactions, legalConversations, updatedAt: now };
      dbSet(DATA_KEY, core).catch(() => {});
      if (cloudReady && session?.user) {
        pushCloudData(session.user.id, core).then(() => { cloudSyncedAtRef.current = now; }).catch(() => {});
      }
    }, 400);
    return () => clearTimeout(t);
  }, [loaded, cloudReady, properties, owners, builders, customers, appointments, calls, deals, payments, expenses, officeIncomes, investments, tours, checks, streetPrices, constructionProjects, constructionTransactions, legalConversations]);

  // Live cross-device convergence: if a second signed-in device (or this
  // same account on the web) pushes a newer flora_data row while this tab
  // is open, pull it in immediately instead of waiting for next launch.
  useEffect(() => {
    if (!cloudReady || !session?.user) return;
    const unsubscribe = subscribeCloudData(session.user.id, (row) => {
      const incomingTs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (incomingTs <= cloudSyncedAtRef.current) return; // our own echo or stale
      const core = { ...row.data, updatedAt: incomingTs };
      applyCoreData(core);
      dbSet(DATA_KEY, core).catch(() => {});
      cloudSyncedAtRef.current = incomingTs;
      notify("داده‌ها از دستگاه دیگری به‌روزرسانی شد");
    });
    return unsubscribe;
  }, [cloudReady, session?.user?.id]); // eslint-disable-line
  useEffect(() => { if (loaded) dbSet(SETTINGS_KEY, { geminiKey, perplexityKey, avalaiKey, avalaiModel, aiProvider, agentName, agentPhoto, agencyName, agencyCity, splitShares, simpleMode }).catch(() => {}); }, [loaded, geminiKey, perplexityKey, avalaiKey, avalaiModel, aiProvider, agentName, agentPhoto, agencyName, agencyCity, splitShares, simpleMode]);

  // Appointments live only in this device's IndexedDB (local-first, like
  // everything else in Flora) — but a push notification still needs to fire
  // even if the app has been closed for hours, which nothing running only
  // in this tab can do. This mirrors two advance reminders per upcoming
  // appointment (1 hour before, 30 minutes before) out to Supabase, where a
  // cron job (see process-due-reminders) can act on them independent of
  // whether Flora is open anywhere. Deliberately omits `sent` from the
  // upsert payload — see below.
  const APPOINTMENT_OFFSETS = [
    { suffix: "60m", minutesBefore: 60, label: "۱ ساعت" },
    { suffix: "30m", minutesBefore: 30, label: "۳۰ دقیقه" },
  ];
  useEffect(() => {
    if (!loaded || !session?.user) return;
    const t = setTimeout(() => {
      (async () => {
        const now = Date.now();
        const withDueTime = appointments
          .map((a) => ({ a, dueAt: a.date ? new Date(`${a.date}T${(a.time || "09:00")}:00`) : null }))
          .filter(({ dueAt }) => dueAt && !isNaN(dueAt.getTime()));

        const scheduledIds = [];
        for (const { a, dueAt } of withDueTime) {
          for (const off of APPOINTMENT_OFFSETS) {
            const remindAt = new Date(dueAt.getTime() - off.minutesBefore * 60000);
            if (remindAt.getTime() <= now) continue; // that warning point has already passed
            const sourceId = `appt-${a.id}-${off.suffix}`;
            scheduledIds.push(sourceId);
            // `sent` is intentionally left out of this payload: on conflict,
            // Supabase's upsert only overwrites columns present in the
            // object, so an already-fired reminder's `sent: true` survives a
            // later resync instead of being reset back to false and firing
            // again every time this effect re-runs.
            await supabase.from("scheduled_reminders").upsert({
              user_id: session.user.id,
              source_id: sourceId,
              remind_at: remindAt.toISOString(),
              title: "Flora",
              body: `تا ${off.label} دیگر بازدید ${a.customerName || "مشتری"} دارید (ساعت ${a.time || "؟"}).`,
              category: "visits",
            }, { onConflict: "user_id,source_id" }).catch(() => {});
          }
        }

        // An appointment that got deleted, edited, or moved into the past
        // shouldn't leave a stale future-dated reminder behind to fire later.
        const stillValidIds = new Set(scheduledIds);
        const { data: existingRows } = await supabase.from("scheduled_reminders").select("id, source_id").eq("user_id", session.user.id).like("source_id", "appt-%").eq("sent", false);
        const toDelete = (existingRows || []).filter((r) => !stillValidIds.has(r.source_id)).map((r) => r.id);
        if (toDelete.length) await supabase.from("scheduled_reminders").delete().in("id", toDelete).catch(() => {});
      })();
    }, 1200);
    return () => clearTimeout(t);
  }, [loaded, appointments, session]);

  // Same pattern for checks: 2 days before and 1 day before the due date, at
  // 09:00 — a check due-date has no time-of-day of its own, so 9am is a
  // fixed, predictable point rather than guessing one.
  const CHECK_OFFSETS = [
    { suffix: "2d", daysBefore: 2, label: "۲ روز" },
    { suffix: "1d", daysBefore: 1, label: "۱ روز" },
  ];
  useEffect(() => {
    if (!loaded || !session?.user) return;
    const t = setTimeout(() => {
      (async () => {
        const now = Date.now();
        const unpaid = checks.filter((ch) => !ch.paid && ch.dueDate);

        const scheduledIds = [];
        for (const ch of unpaid) {
          const due9am = new Date(`${ch.dueDate}T09:00:00`);
          if (isNaN(due9am.getTime())) continue;
          for (const off of CHECK_OFFSETS) {
            const remindAt = new Date(due9am.getTime() - off.daysBefore * 86400000);
            if (remindAt.getTime() <= now) continue;
            const sourceId = `check-${ch.id}-${off.suffix}`;
            scheduledIds.push(sourceId);
            await supabase.from("scheduled_reminders").upsert({
              user_id: session.user.id,
              source_id: sourceId,
              remind_at: remindAt.toISOString(),
              title: "Flora",
              body: `${off.label} تا سررسید چک ${ch.recipient} به مبلغ ${fmtToman(ch.amount)}.`,
              category: "finance",
            }, { onConflict: "user_id,source_id" }).catch(() => {});
          }
        }

        // A check that got deleted, marked paid, or edited shouldn't leave a
        // stale reminder behind either.
        const stillValidIds = new Set(scheduledIds);
        const { data: existingRows } = await supabase.from("scheduled_reminders").select("id, source_id").eq("user_id", session.user.id).like("source_id", "check-%").eq("sent", false);
        const toDelete = (existingRows || []).filter((r) => !stillValidIds.has(r.source_id)).map((r) => r.id);
        if (toDelete.length) await supabase.from("scheduled_reminders").delete().in("id", toDelete).catch(() => {});
      })();
    }, 1200);
    return () => clearTimeout(t);
  }, [loaded, checks, session]);

  // The nightly digest used to be one fixed sentence for every user, every
  // night — the cron job had no way to know anything real, since Flora's
  // data lives only in this device's IndexedDB. This mirrors just the
  // handful of numbers already computed for the home screen anyway (not a
  // second copy of the whole data model) so the notification can actually
  // say something true about today. nearest_check_label wins the digest
  // when present (an unpaid check due within the next month is the most
  // time-sensitive thing Flora knows about); top_action_label — the same
  // #1 item "بهترین اقدام امروز" already shows — is the fallback when
  // there's no check to flag.
  useEffect(() => {
    if (!loaded || !session?.user) return;
    const t = setTimeout(() => {
      const activeCustomers = customers.filter((cu) => !["خرید کرد", "منصرف شد", "بدون پیگیری"].includes(cu.stage));
      const hot = [...activeCustomers].sort((a, b) => (b.lastContactTs || 0) - (a.lastContactTs || 0))[0];

      const now = Date.now();
      const ROLLING_MONTH = 31 * 86400000;
      const nearestCheck = checks
        .filter((ch) => !ch.paid && ch.dueDate)
        .map((ch) => ({ ch, dueTs: new Date(`${ch.dueDate}T00:00:00`).getTime() }))
        .filter(({ dueTs }) => !isNaN(dueTs) && dueTs - now <= ROLLING_MONTH)
        .sort((a, b) => a.dueTs - b.dueTs)[0]?.ch;
      const daysLeft = nearestCheck ? Math.ceil((new Date(`${nearestCheck.dueDate}T00:00:00`).getTime() - now) / 86400000) : null;
      const nearestCheckLabel = nearestCheck
        ? `${daysLeft <= 0 ? "امروز" : `${faDigits(daysLeft)} روز دیگر`} سررسید چک ${nearestCheck.recipient} به مبلغ ${fmtToman(nearestCheck.amount)} است.`
        : null;

      const topAction = computeNextActions({ properties, customers, calls, appointments, deals })[0];
      const topActionLabel = topAction ? `پیشنهاد امروز: ${topAction.title}${topAction.reason ? ` — ${topAction.reason}` : ""}` : null;

      supabase.from("digest_summary").upsert({
        user_id: session.user.id,
        pending_calls: calls.filter((cl) => cl.status !== "انجام‌شد").length,
        todays_appointments: appointments.filter((a) => a.date === todayISO()).length,
        hot_customer_name: hot?.name || null,
        nearest_check_label: nearestCheckLabel,
        top_action_label: topActionLabel,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [loaded, calls, appointments, customers, checks, properties, deals, session]);

  // Weekly auto-backup. Losing everything is the biggest risk with on-device storage,
  // Real auto-backup: every 3 days, push a snapshot to Supabase Storage via
  // the create-backup function (server-verified, recorded, emailed) rather
  // than just downloading a local file the agent has to remember to keep.
  const [backupDue, setBackupDue] = useState(false);
  useEffect(() => {
    if (!loaded || !session) return;
    (async () => {
      try {
        const { data: rows } = await supabase.from("backup_history").select("created_at").eq("status", "success").order("created_at", { ascending: false }).limit(1);
        const last = rows?.[0]?.created_at ? new Date(rows[0].created_at).getTime() : 0;
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - last >= THREE_DAYS) {
          const hasData = properties.length || customers.length || deals.length;
          if (hasData) {
            const { error } = await supabase.functions.invoke("create-backup", { body: { payload: buildBackupPayload(), kind: "auto" } });
            if (!error) { setBackupDue(true); setTimeout(() => notify("بکاپ خودکار ابری انجام شد"), 800); }
          }
        }
      } catch (e) {}
    })();
  }, [loaded, session]); // eslint-disable-line

  // Everything below this line (ctx, the CRM itself) only matters once we
  // know who's signed in — checked last so every hook above still runs on
  // every render, auth state or not.
  if (session === undefined) return <AuthLoadingScreen c={c} />;
  if (!session) return <AuthScreen c={c} dark={dark} />;
  // profileReady === false no longer blocks the whole app — see the
  // CityPopup rendered further down, alongside the other overlays.

  const hasAiKey = (aiProvider === "avalai" && avalaiKey) || (aiProvider === "gemini" && geminiKey) || (aiProvider === "perplexity" && perplexityKey);
  // Voice-to-text uses AvalAI's Whisper proxy specifically — the other providers
  // aren't wired for audio, so voice notes need an AvalAI key regardless of which
  // provider is chosen for text (only real Whisper gets Persian numbers/names right).
  const canTranscribe = !!avalaiKey;
  const transcribeWith = async (blob, model) => {
    const form = new FormData();
    form.append("file", blob, "voice.webm");
    form.append("model", model);
    form.append("language", "fa");
    let res;
    try {
      res = await fetch("https://api.avalai.ir/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${avalaiKey}` }, body: form });
    } catch (netErr) { throw new Error("اتصال برقرار نشد — اینترنت را بررسی کن"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `خطای تبدیل صوت (کد ${res.status})`);
    if (!data?.text) throw new Error("چیزی شنیده نشد — دوباره امتحان کن");
    return data.text;
  };
  const transcribeAudio = async (blob) => {
    if (!avalaiKey) throw new Error("برای یادداشت صوتی، کلید AvalAI را در تنظیمات وارد کن");
    // gpt-4o-transcribe has a meaningfully lower word-error-rate than the
    // older whisper-1, especially on accents and lower-quality audio — the
    // whole point here. If it ever fails for an unrelated reason (a
    // transient gateway hiccup, a model temporarily unavailable on the
    // account), whisper-1 is a real, working fallback rather than leaving
    // the person stuck with no transcript at all.
    try { return await transcribeWith(blob, "gpt-4o-transcribe"); }
    catch (e) { return await transcribeWith(blob, "whisper-1"); }
  };
  // canStage really means "has a vision-capable AvalAI key" — kept under this
  // name because Divar ad diagnosis (diagnoseAd/diagnoseAdFromLink below)
  // reuses it too, even after AI Virtual Staging itself was removed.
  const canStage = !!avalaiKey;
  const callAI = async (prompt) => {
    // AvalAI — an Iranian gateway that's OpenAI-compatible and reachable from Iran
    // without a VPN, so it sidesteps the Gemini/OpenAI regional blocks.
    if (aiProvider === "avalai") {
      if (!avalaiKey) throw new Error("کلید AvalAI وارد نشده");
      let res, data;
      try {
        res = await fetch("https://api.avalai.ir/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${avalaiKey}` },
          body: JSON.stringify({ model: avalaiModel || "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
        });
      } catch (netErr) { throw new Error("اتصال به AvalAI برقرار نشد — اینترنت را بررسی کن"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطای AvalAI (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("پاسخ خالی از AvalAI");
      return text;
    }
    if (aiProvider === "perplexity") {
      // Search-grounded answers with live web sources — useful for anything that
      // needs current information, unlike the other providers here which only
      // know their training data.
      if (!perplexityKey) throw new Error("کلید Perplexity وارد نشده");
      let res, data;
      try {
        res = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${perplexityKey}` },
          body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }] }),
        });
      } catch (netErr) { throw new Error("اتصال به Perplexity برقرار نشد (احتمالاً مرورگر درخواست مستقیم را مسدود کرده — CORS)"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطای Perplexity (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("پاسخ خالی از Perplexity");
      return text;
    }
    if (!geminiKey) throw new Error("کلید Gemini وارد نشده");
    const models = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
    let lastErr = null;
    for (const model of models) {
      let res, data;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
      } catch (netErr) { throw new Error("اتصال به Gemini برقرار نشد — اینترنت یا CORS را بررسی کن"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || "";
        lastErr = msg || `خطای Gemini (کد ${res.status})`;
        if (res.status === 404 || /not found|no longer available|not supported/i.test(msg)) continue; // try next model
        throw new Error(lastErr);
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = data?.promptFeedback?.blockReason ? `مسدود شد: ${data.promptFeedback.blockReason}` : "پاسخ خالی از Gemini";
    }
    throw new Error(lastErr || "هیچ‌کدام از مدل‌های Gemini در دسترس نبود");
  };

  const scheduleReminder = (appt, propTitle) => {
    if (!("Notification" in window)) { notify("مرورگر از اعلان پشتیبانی نمی‌کند"); return; }
    Notification.requestPermission().then((perm) => {
      if (perm !== "granted") { notify("اجازه‌ی اعلان داده نشد"); return; }
      const target = new Date(`${appt.date}T${appt.time}:00`);
      const ms = target.getTime() - Date.now();
      if (ms <= 0) { notify("زمان این بازدید گذشته است"); return; }
      notify("یادآور تنظیم شد (تا وقتی این صفحه باز بماند فعال است)");
      setTimeout(() => { try { new Notification("یادآوری بازدید ملکی", { body: `${propTitle || "بازدید"} — ساعت ${appt.time}` }); } catch (e) {} }, ms);
    });
  };

  // Persian (Jalali) date for filenames — e.g. "۶-مرداد-۱۴۰۵" instead of 2026-07-28.
  const jalaliFileDate = () => { const [jy, jm, jd] = isoToJalali(todayISO()); return `${faDigits(jd)}-${MONTHS_FA[jm - 1]}-${faDigits(jy)}`; };
  const buildBackupPayload = () => ({ version: 1, exportedAt: new Date().toISOString(), properties, owners, builders, customers, appointments, calls, deals, payments, expenses, officeIncomes, investments, tours, checks, streetPrices, constructionProjects, constructionTransactions });
  const downloadBackup = (payload, label) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `flora-backup-${label || jalaliFileDate()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  // Real device share sheet — Telegram, WhatsApp, Files, Mail, AirDrop all show
  // up as targets since we're sharing an actual file, not just a link. Falls
  // back to a plain download if the browser doesn't support file sharing.
  const shareBackup = async (payload, label, friendlyName) => {
    const filename = `flora-backup-${label || jalaliFileDate()}.json`;
    const file = new File([JSON.stringify(payload, null, 2)], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: friendlyName || "بکاپ فلورا" }); return; }
      catch (e) { if (e?.name === "AbortError") return; /* user cancelled — not an error */ }
    }
    notify("ارسال مستقیم پشتیبانی نشد — دانلود شد، خودت بفرست");
    downloadBackup(payload, label);
  };
  const exportBackup = () => {
    downloadBackup(buildBackupPayload());
    dbSet(AUTOBACKUP_KEY, { lastDownload: Date.now(), snapshotAt: Date.now() }).catch(() => {});
    notify("فایل بکاپ کامل دانلود شد");
  };
  // Cloud backup — goes through the create-backup Edge Function so the
  // upload, the history row, and the email are all written server-side with
  // the service role, never trusting the client's own account of what happened.
  const cloudBackupNow = async () => {
    const { data, error } = await supabase.functions.invoke("create-backup", { body: { payload: buildBackupPayload(), kind: "manual" } });
    if (error) { notify("بکاپ ابری ناموفق بود"); return { ok: false }; }
    // Also checkpoints the structured flora_data_snapshots row (best-effort,
    // never blocks the file backup which is the part the person is waiting on).
    if (session?.user) snapshotCloudData(session.user.id, buildBackupPayload()).catch(() => {});
    notify("بکاپ ابری ذخیره شد");
    return { ok: true, data };
  };
  const restoreFromCloud = async (storagePath) => {
    // A safety snapshot goes up first — restoring never destroys the only
    // copy of what was there before it.
    await cloudBackupNow();
    const { data: signed, error: signErr } = await supabase.storage.from("backups").createSignedUrl(storagePath, 60);
    if (signErr || !signed) { notify("لینک بازیابی ساخته نشد"); return false; }
    const res = await fetch(signed.signedUrl);
    const data = await res.json().catch(() => null);
    if (!data) { notify("فایل بکاپ خراب بود"); return false; }
    if (data.properties) setProperties(data.properties);
    if (data.owners) setOwners(data.owners);
    if (data.builders) setBuilders(data.builders);
    if (data.customers) setCustomers(data.customers);
    if (data.appointments) setAppointments(data.appointments);
    if (data.calls) setCalls(data.calls);
    if (data.deals) setDeals(data.deals);
    if (data.payments) setPayments(data.payments);
    if (data.expenses) setExpenses(data.expenses);
    if (data.officeIncomes) setOfficeIncomes(data.officeIncomes);
    if (data.investments) setInvestments(data.investments);
        if (data.checks) setChecks(data.checks);
        if (data.streetPrices) setStreetPrices(data.streetPrices);
        if (data.constructionProjects) setConstructionProjects(data.constructionProjects);
        if (data.constructionTransactions) setConstructionTransactions(data.constructionTransactions);
    if (data.tours) setTours(data.tours);
    notify("بازیابی انجام شد");
    return true;
  };
  const shareBackupNow = async () => {
    await shareBackup(buildBackupPayload(), null, "بکاپ کامل فلورا");
    dbSet(AUTOBACKUP_KEY, { lastDownload: Date.now(), snapshotAt: Date.now() }).catch(() => {});
  };
  // Scoped backups — the import merges whatever it finds, so these restore cleanly too.
  const exportProperties = () => {
    downloadBackup({ version: 1, exportedAt: new Date().toISOString(), scope: "properties", properties, owners, builders, customers, appointments, calls }, `files-customers-${jalaliFileDate()}`);
    notify("بکاپ فایل‌ها و مشتری‌ها دانلود شد");
  };
  const exportFinance = () => {
    downloadBackup({ version: 1, exportedAt: new Date().toISOString(), scope: "finance", deals, payments, expenses, officeIncomes }, `finance-${jalaliFileDate()}`);
    notify("بکاپ مالی دانلود شد");
  };
  const importBackup = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.properties) setProperties(data.properties);
        if (data.owners) setOwners(data.owners);
        if (data.builders) setBuilders(data.builders);
        if (data.customers) setCustomers(data.customers);
        if (data.appointments) setAppointments(data.appointments);
        if (data.calls) setCalls(data.calls);
        if (data.deals) setDeals(data.deals);
        if (data.payments) setPayments(data.payments);
        if (data.expenses) setExpenses(data.expenses);
        if (data.officeIncomes) setOfficeIncomes(data.officeIncomes);
        if (data.investments) setInvestments(data.investments);
        if (data.checks) setChecks(data.checks);
        if (data.streetPrices) setStreetPrices(data.streetPrices);
        if (data.constructionProjects) setConstructionProjects(data.constructionProjects);
        if (data.constructionTransactions) setConstructionTransactions(data.constructionTransactions);
        if (data.tours) setTours(data.tours);
        notify("بکاپ با موفقیت بازیابی شد");
      } catch (e) { notify("فایل بکاپ نامعتبر است"); }
    };
    reader.readAsText(file);
  };

  const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  const todaysAppts = appointments.filter((a) => a.date === todayISO()).length;
  const activeProps = properties.filter((p) => p.stage !== "فروخته شد").length;

  const goProperties = (stageHint) => { setPropStageHint(stageHint || "همه"); setTab("properties"); };

  const ctx = {
    c, dark, session, signOut: () => supabase.auth.signOut(),
    properties, setProperties, owners, setOwners, builders, setBuilders,
    customers, setCustomers, appointments, setAppointments, calls, setCalls,
    deals, setDeals, payments, setPayments, expenses, setExpenses, officeIncomes, setOfficeIncomes, investments, setInvestments, checks, setChecks, streetPrices, setStreetPrices, constructionProjects, setConstructionProjects, constructionTransactions, setConstructionTransactions, legalConversations, setLegalConversations, splitShares, setSplitShares, simpleMode, setSimpleMode,
    tours, setTours, tourBuilder, setTourBuilder, openTourId, setOpenTourId,
    divarSearchOpen, setDivarSearchOpen, legalOpen, setLegalOpen, notificationsOpen, setNotificationsOpen, customerMode, setCustomerMode, showCustomerPrice, setShowCustomerPrice, quickValuationOpen, setQuickValuationOpen, prefillNew, setPrefillNew, constructionOpen, setConstructionOpen, checksOpen, setChecksOpen,
    notify, setDetail, setTab, setSheet, setLightbox, setMapPicker, focusQueue, setFocusQueue, celebrate, geminiKey, setGeminiKey,
    perplexityKey, setPerplexityKey, avalaiKey, setAvalaiKey, avalaiModel, setAvalaiModel, aiProvider, setAiProvider, hasAiKey, callAI, canTranscribe, transcribeAudio, canStage, agentName, setAgentName, agentPhoto, setAgentPhoto, agencyName, setAgencyName, agencyCity, setAgencyCity,
    scheduleReminder, goProperties, exportBackup, importBackup, exportProperties, exportFinance, shareBackupNow,
    cloudBackupNow, restoreFromCloud,
  };

  if (!loaded) {
    return <FerrofluidLoader c={c} progress={bootProgress} />;
  }

  return (
    <div dir="rtl" style={{ background: c.bg, color: c.ink, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex justify-center relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        /* Single shared motion language — every interaction/transition tuned
           below (press, page, sheet, image fade, gallery, skeleton) draws its
           timing from these three tiers and one easing curve instead of each
           picking its own number. fast = a tap's own feedback, normal = a
           screen or element arriving, slow = a full sheet sliding into place. */
        :root { --flora-fast: 120ms; --flora-normal: 200ms; --flora-slow: 320ms; --flora-ease: cubic-bezier(0.22, 1, 0.36, 1); }
        .press { transition: transform var(--flora-fast) var(--flora-ease), opacity var(--flora-fast) ease; }
        .press:active { transform: scale(0.98); opacity: .92; }
        /* Map styling. Dark Matter renders near-monochrome grey on near-black;
           a warm hue-rotate pushes the roads gold and the base navy, matching
           the printed city-map look without touching any other part of the UI. */
        .leaflet-container { background: #0A1628 !important; }
        /* Real OpenStreetMap tiles are light by design (no free dark tile
           server exists) — .flora-dark-map inverts+hue-rotates just the
           tile layer to fake a dark basemap without touching markers,
           popups, or any other UI on top of it. */
        .flora-dark-map .leaflet-tile-pane { filter: ${DARK_TILE_FILTER}; }
        /* Tiles in the tool rail get a lift instead of a flat shrink — the card
           rises toward the finger, which reads as physical rather than "pressed
           into the screen". Snap keeps a tile edge-aligned after a flick. */
        .flora-tile { scroll-snap-align: start; transition: transform var(--flora-fast) var(--flora-ease), box-shadow var(--flora-fast) ease; }
        .flora-tile:active { transform: translateY(-4px) scale(1.02); box-shadow: 0 14px 28px -12px rgba(0,0,0,.55); opacity: 1; }
        @keyframes floraUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
        @keyframes floraSheet { from { transform: translateY(100%);} to { transform: translateY(0);} }
        @keyframes floraPop { from { opacity:0; transform: translateY(12px);} to {opacity:1; transform: translateY(0);} }
        @keyframes floraPulse { 0%,100% { opacity:1; transform:scale(1);} 50% { opacity:.4; transform:scale(.8);} }
        @keyframes floraFloat { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-5px);} }
        @keyframes floraKeyTurn { 0%,100% { transform: rotate(-8deg);} 50% { transform: rotate(8deg);} }
        /* Page/tab switches — a plain, calm arrival (opacity + a 6px rise),
           not the old 3D door-swing: a premium app changes screens quietly. */
        @keyframes floraDoorOpen { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .flora-float { animation: floraFloat 2.6s ease-in-out infinite; }
        .flora-key { animation: floraKeyTurn 1.8s ease-in-out infinite; }
        /* Uses "backwards" fill, not "both", on purpose: "both" leaves the final
           transform applied forever, and a lingering transform makes this element
           a containing block — which silently breaks position:fixed for every
           sheet/modal rendered inside it. "backwards" still prevents the entry
           flash but drops the transform once the animation ends. */
        .flora-door { animation: floraDoorOpen var(--flora-normal) var(--flora-ease) backwards; }
        .flora-up { animation: floraUp var(--flora-normal) var(--flora-ease) backwards; }
        .flora-sheet { animation: floraSheet var(--flora-slow) var(--flora-ease) backwards; }
        .flora-pop { animation: floraPop 220ms var(--flora-ease) backwards; }
        /* Full-screen focus panels. Deliberately NOT a slide: any translateY
           briefly uncovers an edge of the viewport, letting the screen behind
           show through mid-animation. Scaling from the center keeps all four
           edges pinned to the viewport on every frame, so it still feels like
           it "opens into place" without ever exposing what's underneath. */
        @keyframes floraFullscreenUp {
          from { opacity: 0; transform: scale(1.03); }
          to   { opacity: 1; transform: scale(1); }
        }
        .flora-focus-in { animation: floraFullscreenUp .3s cubic-bezier(.22,1,.36,1) backwards; }
        /* The two other prefers-reduced-motion blocks in this file only cover
           rare decorative moments (a celebration illustration, a glowing
           badge) — this one covers what actually matters: every tap
           (.press) and every screen navigation (.flora-door), plus every
           sheet/modal entrance. Content still appears instantly; it just
           doesn't move to get there. */
        @media (prefers-reduced-motion: reduce) {
          .press { transition: opacity .1s ease; }
          .press:active { transform: none; opacity: .8; }
          .flora-door, .flora-up, .flora-sheet, .flora-pop, .flora-focus-in,
          .flora-rise, .flora-stagger > *, .flora-gallery-fade, .flora-bounce {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .flora-img { transition: none !important; }
          .flora-kenburns, .flora-skeleton { animation: none !important; }
        }
        .nba-blob { position:absolute; top:-30px; left:-20px; width:200px; height:200px; border-radius:50%; filter: blur(30px); opacity:.32; pointer-events:none; animation: liquidMove 4s ease-in-out infinite; }
        @keyframes liquidMove { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(60px,20px) scale(1.25);} 66% { transform: translate(20px,45px) scale(.85);} }
        .flora-orb-breathe { animation: floraOrbBreathe 2.6s ease-in-out infinite; }
        @keyframes floraOrbBreathe { 0%,100% { transform: scale(1);} 50% { transform: scale(1.07);} }
        .flora-blob { position: absolute; border-radius: 50%; opacity: .9; }
        .flora-blob-a { width: 62px; height: 62px; top: 24px; left: 24px; animation: floraBlobA 5.2s ease-in-out infinite; }
        .flora-blob-b { width: 50px; height: 50px; top: 44px; left: 54px; animation: floraBlobB 6.4s ease-in-out infinite; }
        .flora-blob-c { width: 46px; height: 46px; top: 50px; left: 20px; animation: floraBlobC 7.1s ease-in-out infinite; }
        @keyframes floraBlobA { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(14px,-12px) scale(1.15);} }
        @keyframes floraBlobB { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-14px,14px) scale(.88);} }
        @keyframes floraBlobC { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(10px,16px) scale(1.1);} }
        .flora-pulse { animation: floraPulse 1.6s ease-in-out infinite; }
        @keyframes floraRipple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
        @keyframes floraOrb { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(20px,-16px) scale(1.05);} 66% { transform: translate(-14px,18px) scale(.95);} }
        .flora-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .4; animation: floraOrb 14s ease-in-out infinite; pointer-events: none; }

        /* Lists reveal one after another instead of snapping in all at once */
        @keyframes floraStagger { from { opacity:0; transform: translateY(14px) scale(.985);} to { opacity:1; transform: translateY(0) scale(1);} }
        .flora-stagger > * { animation: floraStagger .42s cubic-bezier(.22,1,.36,1) backwards; }
        .flora-stagger > *:nth-child(1) { animation-delay: .02s }
        .flora-stagger > *:nth-child(2) { animation-delay: .07s }
        .flora-stagger > *:nth-child(3) { animation-delay: .12s }
        .flora-stagger > *:nth-child(4) { animation-delay: .17s }
        .flora-stagger > *:nth-child(5) { animation-delay: .22s }
        .flora-stagger > *:nth-child(6) { animation-delay: .27s }
        .flora-stagger > *:nth-child(n+7) { animation-delay: .3s }

        /* Money values catch a slow sweep of light */
        @keyframes floraShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .flora-money {
          background: linear-gradient(100deg, currentColor 40%, rgba(255,255,255,.85) 50%, currentColor 60%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: floraShimmer 4.5s linear infinite;
        }
        @keyframes floraCoin { 0%,100% { transform: rotateY(0deg);} 50% { transform: rotateY(180deg);} }
        .flora-coin { animation: floraCoin 3.2s ease-in-out infinite; transform-style: preserve-3d; }

        /* Property photos (MOTION SYSTEM items 4–6): a soft opacity fade once
           decoded — never a hard pop-in — plus, only where a component opts
           in via kenBurns (the property hero cover and the lightbox's
           full-res image, nowhere in scrolling grids/thumbnails), a scale of
           at most 1.5% so slowly it reads as stillness with depth, not motion.
           While a photo is still downloading its own background carries a
           quiet shimmer instead of a spinner. */
        .flora-img { opacity: 0; transition: opacity var(--flora-normal) var(--flora-ease); }
        .flora-img-loaded { opacity: 1; }
        @keyframes floraKenBurns { from { transform: scale(1); } to { transform: scale(1.015); } }
        .flora-kenburns { animation: floraKenBurns 18s var(--flora-ease) forwards; }
        @keyframes floraSkeleton { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .flora-skeleton { background: linear-gradient(100deg, rgba(140,140,150,0.10) 25%, rgba(140,140,150,0.22) 50%, rgba(140,140,150,0.10) 75%); background-size: 200% 100%; animation: floraSkeleton 2.2s ease-in-out infinite; }
        /* Lightbox: switching photos fades + very slightly scales in — never
           a slide (see MOTION SYSTEM item 5). */
        @keyframes floraGalleryFade { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: scale(1); } }
        .flora-gallery-fade { animation: floraGalleryFade var(--flora-normal) var(--flora-ease) backwards; }

        @keyframes floraRise { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
        .flora-rise { animation: floraRise var(--flora-normal) var(--flora-ease) backwards; }

        /* A calm settle for "this just succeeded" moments (a checkmark
           landing, a checklist item completing) — no overshoot, no spring;
           see MOTION SYSTEM item 8. */
        @keyframes floraBounceIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        .flora-bounce { animation: floraBounceIn var(--flora-normal) var(--flora-ease) backwards; }

        select { -webkit-appearance: none; appearance: none; }
      `}</style>

      {c.isDark && (
        <>
          <span className="flora-orb" style={{ width: 300, height: 300, background: c.orb1, top: -90, right: -70 }} />
          <span className="flora-orb" style={{ width: 260, height: 260, background: c.orb2, bottom: -50, left: -50, animationDelay: "-4s" }} />
          <span className="flora-orb" style={{ width: 220, height: 220, background: c.orb3, top: "42%", left: "48%", animationDelay: "-8s", opacity: .25 }} />
        </>
      )}

      {/* Faint Flora emblem watermark, drifting gently behind the whole app */}
      <div className="flora-float" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 0, opacity: dark ? 0.04 : 0.05 }}>
        <FloraMark size={320} color={c.ink} stroke={1} />
      </div>

      {/* iPhone 13 Pro sized frame (390 × 844 logical points) */}
      <div className="w-full relative flex flex-col" style={{ maxWidth: 390, minHeight: "100vh", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        {/* Property detail owns the full screen — its photo hero replaces the top bar */}
        {detail?.type !== "property" && <TopBar c={c} dark={dark} setDark={setDark} tab={tab} pendingCalls={pendingCalls} setSheet={setSheet} setDetail={setDetail} setTab={setTab} />}

        <div className="flex-1 overflow-y-auto pb-28 px-4 relative">
          <div key={detail ? `d-${detail.id}` : tab} className="flora-door">
            {detail ? (
              <DetailView detail={detail} ctx={ctx} onBack={() => setDetail(null)} />
            ) : tab === "home" ? (
              <HomeTab ctx={ctx} />
            ) : tab === "properties" ? (
              <PropertiesTab ctx={ctx} search={search} setSearch={setSearch} stageHint={propStageHint} />
            ) : tab === "customers" ? (
              <CustomersTab ctx={ctx} search={search} setSearch={setSearch} />
            ) : tab === "calendar" ? (
              <CalendarTab ctx={ctx} />
            ) : tab === "finance" ? (
              <FinanceCenterView ctx={ctx} />
            ) : (
              <MoreTab ctx={ctx} />
            )}
          </div>
        </div>

        {!detail && !focusQueue && !tourBuilder && !openTourId && (
          <button onClick={() => setSheet("add")} className="press fixed flex items-center justify-center"
            style={{ bottom: "calc(92px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 25, width: 54, height: 54, borderRadius: 14, background: c.gradientPrimary, boxShadow: "0 12px 28px rgba(47,124,246,0.5)", position: "fixed" }}>
            <span style={{ position: "absolute", inset: -8, borderRadius: 22, border: "2px solid rgba(47,124,246,0.35)", animation: "floraRipple 2.2s infinite" }} />
            <Plus color="#fff" size={24} strokeWidth={2.5} />
          </button>
        )}

        {!detail && !focusQueue && !tourBuilder && !openTourId && <BottomNav c={c} tab={tab} setTab={setTab} pendingCalls={pendingCalls} todaysAppts={todaysAppts} simpleMode={simpleMode} />}

        {focusQueue && <FocusMode ctx={ctx} />}

        {tourBuilder && <TourWizard ctx={ctx} />}
        {openTourId && <TourSession ctx={ctx} tourId={openTourId} />}

        {/* Hoisted out of the quick-tools rail on purpose: that rail scrolls
            with -webkit-overflow-scrolling: touch, and on iOS Safari that
            turns any position:fixed descendant into "fixed relative to the
            rail" instead of the viewport — the sheet would render squeezed
            into the rail's own box instead of covering the screen. */}
        {divarSearchOpen && <DivarSearchSheet ctx={ctx} onClose={() => setDivarSearchOpen(false)} />}
        {legalOpen && <LegalHome ctx={ctx} />}
        {quickValuationOpen && <FloraValuationSheet ctx={ctx} onClose={() => setQuickValuationOpen(false)} />}
        {constructionOpen && <ConstructionHome ctx={ctx} onClose={() => setConstructionOpen(false)} />}
        {checksOpen && <ChecksHome ctx={ctx} onClose={() => setChecksOpen(false)} />}
        {notificationsOpen && <NotificationsView ctx={ctx} onBack={() => setNotificationsOpen(false)} />}
        {/* City is no longer a blocking gate before the app loads — this is
            a light popup that sits on top of the already-usable home
            screen, per explicit request to reach home first and ask city
            "like a popup" instead. */}
        {profileReady === false && <CityPopup c={c} session={session} onDone={() => { setProfileReady(true); setShowTour(true); }} />}
        {profileReady === true && showTour && session?.user && (
          <OnboardingTour c={c} onDone={() => {
            setShowTour(false);
            supabase.from("profiles").upsert({ id: session.user.id, tour_seen: true }).then(() => {});
          }} />
        )}

        {celebration && <CelebrationOverlay c={c} celebration={celebration} />}

        {sheet === "add" && <QuickAddSheet ctx={ctx} onClose={() => setSheet(null)} />}
        {sheet && sheet !== "add" && <FormSheet sheetVal={sheet} ctx={ctx} onClose={() => setSheet(null)} />}

        {mapPicker && <MapPickerModal c={c} onPick={mapPicker.onPick} initial={mapPicker.initial} onClose={() => setMapPicker(null)} />}
        {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-40 px-4 py-2.5 rounded-2xl text-sm flora-up z-40 text-center" style={{ ...glass(c), color: c.ink, fontWeight: 600, maxWidth: 320, lineHeight: 1.7 }}>{toast}</div>
        )}
      </div>
    </div>
  );
}

// ---------- Top bar / search / nav ----------
function TopBar({ c, dark, setDark, tab, pendingCalls, setSheet, setDetail, setTab }) {
  const titles = { home: "داشبورد", properties: "فایل‌های ملکی", customers: "مشتریان", calendar: "تقویم بازدید", finance: "مرکز مالی", more: "بیشتر" };
  return (
    <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-10">
      <div>
        {tab !== "home" && (
          <>
            <p style={{ fontSize: 13, color: c.muted }}>خوش آمدی</p>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em" }}>{titles[tab] || "Flora"}</h1>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pendingCalls > 0 && (
          <button onClick={() => setDetail({ type: "calls" })} aria-label={`${faDigits(pendingCalls)} تماس در انتظار پیگیری`} className="press flex items-center gap-1.5 rounded-full px-2.5 py-2" style={{ background: c.attnSoft }}>
            <PhoneCall size={12} color={c.attn} />
            <span style={{ fontSize: 11, fontWeight: 700, color: c.attn }}>{faDigits(pendingCalls)}</span>
          </button>
        )}
        <button onClick={() => setDetail({ type: "ai-chat" })} aria-label="گفتگو با دستیار هوش مصنوعی" className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c)}><MessageCircle size={16} color={c.ink} /></button>
        <button onClick={() => setSheet("ai-settings")} aria-label="تنظیمات هوش مصنوعی" className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c)}><Sparkles size={16} color={c.ink} /></button>
        <button onClick={() => setDark(!dark)} aria-label={dark ? "روشن کردن حالت روز" : "روشن کردن حالت شب"} className="press w-10 h-10 rounded-full flex items-center justify-center" style={glass(c)}>{dark ? <Sun size={16} color={c.ink} /> : <Moon size={16} color={c.ink} />}</button>
      </div>
    </div>
  );
}
function SearchBox({ c, value, setValue }) {
  return (
    <div className="flex items-center rounded-lg px-3.5 py-2.5" style={glass(c)}>
      <Search size={16} color={c.muted} />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="جستجوی سریع..." style={{ background: "transparent", outline: "none", color: c.ink, width: "100%", marginRight: 8, fontSize: 13, fontFamily: "inherit" }} />
      {value && <button onClick={() => setValue("")}><X size={15} color={c.muted} /></button>}
    </div>
  );
}
function BottomNav({ c, tab, setTab, pendingCalls, todaysAppts, simpleMode }) {
  const items = simpleMode ? [
    { id: "home", label: "خانه", icon: Home },
    { id: "properties", label: "فایل‌ها", icon: Building2 },
    { id: "customers", label: "مشتریان", icon: Users },
    { id: "more", label: "بیشتر", icon: MoreHorizontal, dot: pendingCalls > 0 },
  ] : [
    { id: "home", label: "خانه", icon: Home },
    { id: "finance", label: "مالی", icon: Wallet },
    { id: "customers", label: "مشتریان", icon: Users },
    { id: "properties", label: "فایل‌ها", icon: Building2 },
    { id: "more", label: "بیشتر", icon: MoreHorizontal, dot: pendingCalls > 0 },
  ];
  const wrapRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const el = btnRefs.current[tab];
    if (el && wrapRef.current) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }
  };
  useEffect(() => { measure(); // eslint-disable-next-line
  }, [tab]);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="fixed px-3 pt-2" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, zIndex: 20, paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
      <div ref={wrapRef} className="relative flex justify-between items-center rounded-2xl px-2 py-2" style={glass(c)}>
        <div style={{
          position: "absolute", top: 6, bottom: 6, left: pill.left + 8, width: Math.max(0, pill.width - 16), borderRadius: 14,
          background: c.primarySoft, border: `1px solid ${c.primary}55`,
          transition: pill.ready ? "left .45s cubic-bezier(.34,1.3,.64,1), width .45s cubic-bezier(.34,1.3,.64,1)" : "none",
          opacity: pill.ready ? 1 : 0, pointerEvents: "none", zIndex: 0,
        }} />
        {items.map((it) => {
          const active = tab === it.id; const Icon = it.icon;
          return (
            <button key={it.id} ref={(el) => (btnRefs.current[it.id] = el)} onClick={() => setTab(it.id)}
              className="press relative flex flex-col items-center gap-1 flex-1 py-1.5 rounded-2xl" style={{ zIndex: 1 }}>
              <div className="relative">
                <Icon size={19} color={active ? c.primary : c.muted} strokeWidth={active ? 2.5 : 2}
                  style={{ transition: "transform .45s cubic-bezier(.34,1.56,.64,1)", transform: active ? "translateY(-2px) scale(1.08)" : "none" }} />
                {it.dot && <span className="flora-pulse" style={{ position: "absolute", top: -3, left: -3, width: 7, height: 7, borderRadius: 999, background: c.attn }} />}
              </div>
              <span style={{ fontSize: 10, color: active ? c.primary : c.muted, fontWeight: active ? 700 : 500, transition: "color .35s ease" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SectionHeader({ c, title, action }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2.5">
      <div className="flex items-center gap-1.5">
        <span style={{ opacity: 0.55 }}>{FloraIcons.sprig({ size: 15, color: c.muted })}</span>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.bold }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
// ============================================================
// Flora icon system — from the brand's flora-icon-set spec.
// Every icon: 64×64 canvas, 6px safe margin, stroke 1.6 on the main form,
// rounded caps/joins, and AT MOST ONE gold accent (#BA9358). Everything else
// is the stone line, which inherits the surrounding text colour.
// ============================================================
// FLORA_GOLD imported from lib/ui.jsx
function FIcon({ children, size = 26, color = "currentColor", gold = FLORA_GOLD, sw = 1.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {typeof children === "function" ? children(gold, color) : children}
    </svg>
  );
}
// pentagon "house" frame reused by most icons (apex 26w×23h ratio, per spec)
const HOUSE = "M32 8 L52 22 L52 54 L12 54 L12 22 Z";

const FloraIcons = {
  residential: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <path d="M28 54 L28 40 L36 40 L36 54" />
    <circle cx="34" cy="47" r="0.9" fill={g} stroke={g} />
  </>}</FIcon>,
  monogram: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <circle cx="32" cy="26" r="3.4" fill={g} stroke={g} />
    <path d="M32 29 L32 46" />
    <path d="M32 36 C27 33 24 35 22 40 M32 36 C37 33 40 35 42 40 M32 42 C28 40 25 42 24 46 M32 42 C36 40 39 42 40 46" stroke={g} />
  </>}</FIcon>,
  villa: (p) => <FIcon {...p}>{(g) => <>
    <path d="M32 12 L50 27 M32 12 L14 27" />
    <path d="M18 27 L18 46 L46 46 L46 27" />
    <path d="M22 46 L42 46" stroke={g} />
    <path d="M32 46 L32 38 M32 40 C29 38 27 39 26 42 M32 40 C35 38 37 39 38 42" stroke={g} />
  </>}</FIcon>,
  multiunit: (p) => <FIcon {...p}>{(g) => <>
    <path d="M40 14 L48 20 L48 54 L40 54 Z" />
    <path d="M16 30 L40 30 L40 54 L16 54 Z" />
    <path d="M20 36 L28 36 M20 42 L28 42" />
    <rect x="42" y="42" width="4" height="4" fill={g} stroke={g} />
  </>}</FIcon>,
  handover: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <circle cx="32" cy="28" r="4" stroke={g} />
    <path d="M32 32 L32 44 M32 38 L37 38 M32 41 L36 41" stroke={g} />
  </>}</FIcon>,
  deed: (p) => <FIcon {...p}>{(g) => <>
    <path d="M20 12 L38 12 L46 20 L46 54 L20 54 Z" />
    <path d="M26 26 L40 26 M26 32 L40 32 M26 38 L34 38" />
    <circle cx="40" cy="44" r="6" stroke={g} />
    <path d="M37 44 L39 46 L43 42" stroke={g} />
  </>}</FIcon>,
  window: (p) => <FIcon {...p}>{(g, col) => <>
    <path d="M21 32 C21 21 43 21 43 32 L43 50 L21 50 Z" fill={g} fillOpacity="0.85" stroke={g} />
    <path d="M32 23 L32 50 M22 39 L42 39" stroke={col} />
  </>}</FIcon>,
  investment: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <path d="M23 46 L23 39 M29 46 L29 35 M35 46 L35 41" />
    <path d="M42 46 L42 27 M38 32 L42 27 L46 32" stroke={g} />
  </>}</FIcon>,
  floorArea: (p) => <FIcon {...p}>{(g) => <>
    <path d={HOUSE} />
    <path d="M20 38 L20 54 L44 54" />
    <path d="M22 30 L38 30" stroke={g} />
    <path d="M22 27 L19 30 L22 33 M38 27 L41 30 L38 33" stroke={g} />
  </>}</FIcon>,
  location: (p) => <FIcon {...p}>{(g) => <>
    <path d="M32 12 L46 26 L32 46 L18 26 Z" />
    <circle cx="32" cy="26" r="4.5" fill={g} stroke={g} />
    <path d="M24 54 L40 54" />
  </>}</FIcon>,
  // tiny leaf sprig — used as a section divider, per the spec
  sprig: (p) => <FIcon {...p} sw={1.2}>{(g) => <>
    <path d="M32 46 L32 26" />
    <path d="M32 34 C27 31 23 33 21 38 C26 40 30 38 32 34 Z" />
    <path d="M32 34 C37 31 41 33 43 38 C38 40 34 38 32 34 Z" />
    <path d="M32 28 C29 26 26 27 25 31 C29 32 31 31 32 28 Z" />
    <path d="M32 28 C35 26 38 27 39 31 C35 32 33 31 32 28 Z" />
  </>}</FIcon>,
};

// Safe lookup: falls back to the residential icon if a key is ever missing,
// so a bad icon name degrades gracefully instead of crashing the whole screen.
const floraIcon = (name, props) => (FloraIcons[name] || FloraIcons.residential)(props);

// ---------- Boot loader ----------
// A ferrofluid-style blob: several identical circles drift on independent,
// slightly-off-period paths under an SVG "goo" filter (blur + a sharpened
// alpha threshold), which is the standard trick for making separate shapes
// visually merge and split like magnetic liquid instead of just overlapping
// circles. Everything here is transform-only (translate/scale) plus one
// shared static filter — no per-frame layout, no JS animation loop.
// `progress` is real boot state (session → local data → cloud sync →
// settings), not decorative — the ring and the number both track it exactly.
function FerrofluidLoader({ c, progress }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const RING_R = 54;
  const RING_C = 2 * Math.PI * RING_R;
  const blobs = [
    { size: 74, dur: 5.2, delay: 0, radius: 10 },
    { size: 40, dur: 4.1, delay: -1.1, radius: 22 },
    { size: 34, dur: 4.8, delay: -2.4, radius: 24 },
    { size: 30, dur: 3.6, delay: -0.6, radius: 20 },
    { size: 26, dur: 5.6, delay: -3.2, radius: 26 },
    { size: 22, dur: 4.3, delay: -1.8, radius: 18 },
  ];
  return (
    <div dir="rtl" style={{ background: c.bg, fontFamily: "'Vazirmatn', sans-serif" }} className="min-h-screen w-full flex flex-col items-center justify-center gap-5">
      <style>{`
        @keyframes floraFerroDrift0 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(0,0) scale(1.06); } }
        ${blobs.slice(1).map((b, i) => `
        @keyframes floraFerroDrift${i + 1} {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(${b.radius}px, ${-b.radius * 0.6}px); }
          50%  { transform: translate(${b.radius * 0.3}px, ${b.radius}px); }
          75%  { transform: translate(${-b.radius}px, ${b.radius * 0.4}px); }
          100% { transform: translate(0, 0); }
        }`).join("\n")}
        .flora-ferro-blob { position: absolute; top: 50%; left: 50%; border-radius: 50%; background: ${c.isDark ? "#0b1220" : "#111827"}; }
        @media (prefers-reduced-motion: reduce) { .flora-ferro-blob { animation: none !important; } }
      `}</style>

      <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
        {/* Progress ring — real value, drawn independently of the goo blob so it stays crisp */}
        <svg width={128} height={128} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={64} cy={64} r={RING_R} fill="none" stroke={c.border} strokeWidth={2} opacity={0.5} />
          <circle
            cx={64} cy={64} r={RING_R} fill="none" stroke={c.primary} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset .3s ease" }}
          />
        </svg>

        {/* The ferrofluid blob itself, goo-merged */}
        <div style={{ width: 96, height: 96, filter: "url(#flora-goo)" }} className="relative">
          <svg width={0} height={0} style={{ position: "absolute" }}>
            <filter id="flora-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
          </svg>
          {blobs.map((b, i) => (
            <div
              key={i}
              className="flora-ferro-blob"
              style={{
                width: b.size, height: b.size, marginTop: -b.size / 2, marginLeft: -b.size / 2,
                animation: `floraFerroDrift${i} ${b.dur}s ease-in-out ${b.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* A thin gold rim-light on top of the goo group, unaffected by the
            blur filter, is what reads as "metallic liquid" instead of "dark
            circle" — Flora's existing gold accent, not a new color. */}
        <div style={{ position: "absolute", top: 16, left: 16, width: 96, height: 96, borderRadius: "50%", boxShadow: `inset 0 -6px 14px -4px ${FLORA_GOLD}55, inset 0 4px 10px -6px rgba(255,255,255,0.25)`, pointerEvents: "none" }} />

        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 22, fontWeight: FW.heavy, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{faDigits(pct)}٪</span>
      </div>

      <p style={{ fontSize: 13, color: c.muted, fontWeight: 600 }}>Flora در حال آماده‌سازی...</p>
    </div>
  );
}

function StageBadge({ c, stage }) {
  const badge = (color, soft, label) => <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color, background: soft, padding: `3px ${SP.sm + 2}px`, borderRadius: RAD.pill }}>{label}</span>;
  if (stage === "فروخته شد") return badge(c.danger, c.dangerSoft, "فروخته شد");
  if (stage === "در حال مذاکره") return badge(c.attn, c.attnSoft, "مذاکره");
  return badge(c.success, c.successSoft, "فعال");
}

// ---------- Dashboard ----------
// Live dollar + gold-gram, shown by the greeting because both drive property prices.
// Browsers often block cross-origin finance APIs (CORS), so this fails softly: if it
// can't fetch, it shows a tidy button to open chand.app instead of an error.
function MarketWidget({ c }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const CACHE = "flora-market";
    // show last known values instantly while refreshing
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (cached && Date.now() - cached.at < 6 * 3600 * 1000) setData(cached);
    } catch (e) {}

    (async () => {
      try {
        // BrsApi free endpoint returns { gold:[...], currency:[...] } as JSON.
        // Field names are matched defensively (symbol/name/name_en/title, price/value)
        // since the exact sample response couldn't be fetched here (site blocks bots).
        const res = await fetch("https://api.brsapi.ir/Market/Gold_Currency.php?key=BVjuQ6mYZMzT9usLPTVArBTNYbFegq8B", { signal: AbortSignal.timeout?.(6000) });
        if (!res.ok) throw new Error("bad status");
        const json = await res.json();
        const label = (x) => `${x.symbol || ""} ${x.name || ""} ${x.name_en || ""} ${x.title || ""}`;
        const priceOf = (x) => x.price ?? x.value ?? x.price_toman ?? x.close;
        const usd = (json.currency || []).find((x) => /USD|دلار امریکا|دلار آمریکا/i.test(label(x)));
        const gram = (json.gold || []).find((x) => /18|هجده|IR_GOLD_18K|geram18/i.test(label(x)));
        const parsed = {
          usd: usd ? Number(String(priceOf(usd)).replace(/[^\d]/g, "")) : null,
          gold: gram ? Number(String(priceOf(gram)).replace(/[^\d]/g, "")) : null,
          at: Date.now(),
        };
        if (!parsed.usd && !parsed.gold) { console.warn("Flora market widget: response shape unrecognized", json); throw new Error("no fields"); }
        if (!cancelled) { setData(parsed); try { localStorage.setItem(CACHE, JSON.stringify(parsed)); } catch (e) {} }
      } catch (e) {
        if (!cancelled && !data) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  const openChand = () => window.open("https://chand.app", "_blank");

  if (failed && !data) {
    return (
      <button onClick={openChand} className="press w-full flex items-center justify-between" style={{ padding: `${SP.md}px ${SP.lg}px`, borderRadius: RAD.md, ...glass(c) }}>
        <div className="flex items-center" style={{ gap: SP.sm }}>
          <TrendingUp size={16} color={c.primary} />
          <span style={{ fontSize: FS.caption, color: c.muted, fontWeight: FW.medium }}>قیمت لحظه‌ای دلار و طلا</span>
        </div>
        <span style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>chand.app ›</span>
      </button>
    );
  }

  const Cell = ({ label, value, color }) => (
    <div className="flex items-center" style={{ gap: SP.sm }}>
      <span style={{ fontSize: FS.caption, color: c.muted }}>{label}</span>
      <span style={{ fontSize: FS.body, fontWeight: FW.heavy, color, direction: "ltr" }}>{value ? Number(value).toLocaleString("de-DE") : "—"}</span>
    </div>
  );

  return (
    <button onClick={openChand} className="press w-full flex items-center justify-between" style={{ padding: `${SP.md}px ${SP.lg}px`, borderRadius: RAD.md, ...glass(c) }}>
      <div className="flex items-center" style={{ gap: SP.xl }}>
        <Cell label="دلار" value={data?.usd} color={c.primary} />
        <span style={{ width: 1, height: 16, background: c.border }} />
        <Cell label="طلا" value={data?.gold} color={c.attn} />
      </div>
      <div className="flex items-center" style={{ gap: SP.xs }}>
        <span style={{ width: 5, height: 5, borderRadius: RAD.pill, background: data ? c.success : c.muted }} className={data ? "flora-pulse" : ""} />
        <span style={{ fontSize: 10, color: c.muted }}>تومان</span>
      </div>
    </button>
  );
}

// ── Deal Coach: Next Best Action ────────────────────────────
// Scores concrete, revenue-driving actions from the real data (no invented stats).
// Each action carries a title, a reason, and one execute button. Top 3 only.
function computeNextActions(ctx) {
  const { properties, customers, calls, appointments, deals } = ctx;
  const actions = [];
  const now = Date.now();

  // Overdue call follow-ups: — someone we said we'd call and haven't closed out.
  calls.filter((cl) => cl.status !== "انجام‌شد").forEach((cl) => {
    const d = daysSince(cl.date);
    actions.push({
      key: `call-${cl.id}`, icon: "phone", tint: "attn",
      title: `تماس با ${cl.customerName}`,
      reason: d > 0 ? `${faDigits(d)} روز پیگیری نشده${cl.notes ? ` · ${cl.notes}` : ""}` : `پیگیری امروز${cl.notes ? ` · ${cl.notes}` : ""}`,
      score: 60 + d * 4,
      action: cl.customerPhone ? { type: "call", phone: cl.customerPhone } : { type: "goCalls" },
    });
  });

  // Match a fresh listing to a customer whose need/budget fits.
  customers.forEach((cu) => {
    const budget = Number(cu.budget) || 0;
    const match = properties.find((p) => p.stage !== "فروخته شد" && budget > 0 && p.price <= budget * 1.05 && p.price >= budget * 0.6);
    if (match) {
      actions.push({
        key: `match-${cu.id}-${match.id}`, icon: "home", tint: "primary",
        title: `ارسال «${match.title}» به ${cu.name}`,
        reason: `قیمت با بودجه‌ی مشتری می‌خواند${cu.need ? ` · نیاز: ${cu.need}` : ""}`,
        score: 55,
        action: cu.phone ? { type: "wa", phone: cu.phone, text: `سلام، یک فایل مناسب پیدا کردم:\n${match.title}\n${fmtToman(match.price)}\n${match.area} متر` } : { type: "goCustomer", id: cu.id },
      });
    }
  });

  // Stale listings: — active for a while with no movement → suggest a price review.
  properties.filter((p) => p.stage === "فعال").forEach((p) => {
    const age = daysSince(p.createdAt);
    if (age >= 14) {
      actions.push({
        key: `stale-${p.id}`, icon: "tag", tint: "purple",
        title: `بازنگری قیمت «${p.title}»`,
        reason: `${faDigits(age)} روز فعال بوده و هنوز نفروخته — شاید وقت پیشنهاد قیمت جدید به مالک باشد`,
        score: 30 + age,
        action: { type: "goProperty", id: p.id },
      });
    }
  });

  // Deals awaiting payment: — chase the commission.
  deals.filter((d) => d.status === "در انتظار پرداخت").forEach((d) => {
    actions.push({
      key: `pay-${d.id}`, icon: "coin", tint: "success",
      title: `پیگیری کمیسیون «${d.propertyTitle}»`,
      reason: "قرارداد بسته شده ولی کمیسیونش کامل وصول نشده",
      score: 80,
      action: { type: "goFinance" },
    });
  });

  return actions.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Focus Mode — launched from "اجرا" on the Deal Coach card. Hides all navigation
// and shows exactly one task at a time. Complete it, log the result, get the AI's
// next step, and it auto-advances to the next task — like clearing levels in a game.
// One robust, app-wide "win" animation — rendered at the true app root (like
// FocusMode) so it's never clipped or mispositioned by a screen's own layout.
// A calm, consistent acknowledgment for every kind of win — no confetti,
// no per-kind intensity tiers. The motion language stays the same whether
// it's a closed deal or a logged follow-up; only the icon/color changes.
function CelebrationOverlay({ c, celebration }) {
  const { kind, label } = celebration;
  const CONFIGS = {
    deal: { icon: Trophy, color: c.success, soft: c.successSoft },
    followup: { icon: CheckCircle2, color: c.primary, soft: c.primarySoft },
    file: { icon: Building2, color: c.purple, soft: c.purpleSoft },
    lost: { icon: UserX, color: c.danger, soft: c.dangerSoft },
    tour: { icon: Car, color: c.purple, soft: c.purpleSoft },
  };
  const cfg = CONFIGS[kind] || CONFIGS.followup;
  const Icon = cfg.icon;

  return (
    <BodyPortal>
    <div className="fixed inset-0 z-[99] flex items-center justify-center flora-pop" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="flex flex-col items-center" style={{ padding: SP.xl, borderRadius: RAD.lg, ...glass(c) }}>
        <div className="flex items-center justify-center flora-bounce" style={{ width: 72, height: 72, borderRadius: "50%", background: cfg.soft, marginBottom: SP.md }}>
          <Icon size={32} color={cfg.color} />
        </div>
        <p style={{ fontSize: FS.body, fontWeight: FW.bold, color: c.ink, textAlign: "center" }}>{label}</p>
      </div>
    </div>
    </BodyPortal>
  );
}

function FocusMode({ ctx }) {
  const { c, focusQueue, setFocusQueue, hasAiKey, callAI, notify } = ctx;
  const { actions, index } = focusQueue;
  const a = actions[index];
  const [step, setStep] = useState("act"); // act | outcome | result
  const [nextTip, setNextTip] = useState("");
  const [loading, setLoading] = useState(false);
  const ICONS = { phone: PhoneCall, home: Home, tag: Tag, coin: Landmark };
  const Icon = ICONS[a.icon] || Sparkles;

  useEffect(() => { setStep("act"); setNextTip(""); }, [index]); // eslint-disable-line

  const doCall = () => { if (a.action.type === "call") window.location.href = `tel:${a.action.phone}`; };
  const doWa = () => { if (a.action.type === "wa") window.open(waLink(a.action.phone, a.action.text), "_blank"); };

  const submitOutcome = async (result, note) => {
    setStep("result"); setLoading(true);
    const saveOutcome = async (next) => {
      try {
        const existing = await dbGet(NBA_KEY);
        const map = existing?.date === todayISO() ? { ...existing.map } : {};
        map[a.key] = { result, next };
        await dbSet(NBA_KEY, { date: todayISO(), map });
      } catch (e) {}
    };
    await saveOutcome("");
    if (!hasAiKey) { setNextTip("برای مرحله‌ی بعدی، کلید هوش مصنوعی را در تنظیمات وارد کن."); setLoading(false); return; }
    try {
      const prompt = `تو یک مدیر فروش باتجربه‌ی املاک در ایران هستی. یک مشاور این اقدام را انجام داد:
اقدام: «${a.title}» (${a.reason})
نتیجه‌ای که گزارش داد: «${result}»${note ? `\nتوضیح بیشتر مشاور: «${note}»` : ""}
در یک تا دو جمله‌ی کوتاه، بهترین «مرحله‌ی بعدی» را بگو. مستقیم، بدون مقدمه.`;
      const text = await callAI(prompt);
      setNextTip(text.trim());
      await saveOutcome(text.trim());
    } catch (e) {
      const msg = `خطا در دریافت پیشنهاد: ${e.message || "نامشخص"}`;
      setNextTip(msg); await saveOutcome(msg);
    }
    setLoading(false);
  };

  const advance = () => {
    if (index + 1 < actions.length) setFocusQueue({ actions, index: index + 1 });
    else setFocusQueue(null);
  };

  const accent = "#22d3ee";

  return (
    <BodyPortal>
    <div className="fixed inset-0 z-[95] flex flex-col flora-pop" style={{ background: c.bg }}>
      {/* ambient depth glow, echoes the Deal Coach card it came from */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <span style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22, transparent 70%)`, filter: "blur(10px)" }} />
      </div>

      {/* top: close + segmented progress (stories-style, not just a fraction) */}
      <div className="flex items-center shrink-0 relative" style={{ gap: SP.md, padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
        <button onClick={() => setFocusQueue(null)} aria-label="خروج از حالت تمرکز" className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
        <div className="flex-1 flex" style={{ gap: SP.xs }}>
          {actions.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: RAD.pill, background: c.surface2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: i < index ? "100%" : i === index ? (step === "result" && !loading ? "100%" : "55%") : "0%", borderRadius: RAD.pill, background: i <= index ? c.primary : "transparent", transition: "width .5s cubic-bezier(.34,1.2,.5,1)" }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative" style={{ padding: SP.xl }}>
        {step !== "result" ? (
          <div key={`${index}-${step}`} className="w-full flora-rise" style={{ maxWidth: 340 }}>
            <div className="relative mx-auto" style={{ width: 84, height: 84, marginBottom: SP.xl }}>
              <span className="flora-pulse" style={{ position: "absolute", inset: 0, borderRadius: RAD.lg, background: c.primarySoft }} />
              <div className="flex items-center justify-center" style={{ position: "relative", width: 84, height: 84, borderRadius: RAD.lg, background: c.primarySoft, border: `1px solid ${c.primary}33` }}><Icon size={34} color={c.primary} /></div>
            </div>
            <h1 style={{ fontSize: FS.hero, fontWeight: FW.heavy, textAlign: "center", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{a.title}</h1>
            <p style={{ fontSize: FS.body, color: c.muted, textAlign: "center", marginTop: SP.md, lineHeight: 1.8 }}>{a.reason}</p>

            {step === "act" && (
              <div style={{ marginTop: SP.xxl }}>
                {a.action.type === "call" && (
                  <button onClick={doCall} className="press w-full flex items-center justify-center relative overflow-hidden" style={{ gap: SP.sm, paddingBlock: SP.lg, borderRadius: RAD.lg, background: c.gradientPrimary, boxShadow: "0 16px 34px -10px rgba(47,124,246,0.5), inset 0 1px 0 rgba(255,255,255,0.22)", marginBottom: SP.md }}>
                    <PhoneCall size={18} color="#fff" /><span style={{ color: "#fff", fontWeight: FW.bold, fontSize: FS.subtitle }}>تماس بگیر</span>
                  </button>
                )}
                {a.action.type === "wa" && (
                  <button onClick={doWa} className="press w-full flex items-center justify-center relative overflow-hidden" style={{ gap: SP.sm, paddingBlock: SP.lg, borderRadius: RAD.lg, background: c.gradientPrimary, boxShadow: "0 16px 34px -10px rgba(47,124,246,0.5), inset 0 1px 0 rgba(255,255,255,0.22)", marginBottom: SP.md }}>
                    <MessageCircle size={18} color="#fff" /><span style={{ color: "#fff", fontWeight: FW.bold, fontSize: FS.subtitle }}>ارسال واتساپ</span>
                  </button>
                )}
                <button onClick={() => setStep("outcome")} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.lg, background: c.surface2, color: c.ink, fontWeight: FW.bold, fontSize: FS.body + 1 }}>
                  {a.action.type === "call" || a.action.type === "wa" ? "انجام دادم، نتیجه رو بگو" : "انجامش دادم"}<ChevronLeft size={15} color={c.muted} />
                </button>
              </div>
            )}

            {step === "outcome" && (
              <div style={{ marginTop: SP.xxl, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
                <NbaOutcomePicker c={c} options={["جواب داد و علاقه‌مند بود", "جواب داد ولی فعلاً نه", "جواب نداد", "بازدید هماهنگ شد", "رد کرد"]} onSubmit={(res, note) => submitOutcome(res, note)} onCancel={() => setStep("act")} />
              </div>
            )}
          </div>
        ) : (
          <div key="result" className="w-full flora-rise" style={{ maxWidth: 340 }}>
            {loading ? (
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 56, height: 56, marginBottom: SP.lg }}>
                  <span className="flora-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.primarySoft }} />
                  <div className="flex items-center justify-center" style={{ position: "relative", width: 56, height: 56 }}><Loader2 size={26} className="animate-spin" color={c.primary} /></div>
                </div>
                <p style={{ fontSize: FS.body, color: c.muted }}>مدیر فروش در حال فکر کردن...</p>
              </div>
            ) : (
              <>
                <div className="relative mx-auto" style={{ width: 72, height: 72, marginBottom: SP.lg }}>
                  <div className="flex items-center justify-center flora-bounce" style={{ width: 72, height: 72, borderRadius: "50%", background: c.successSoft }}><CheckCircle2 size={34} color={c.success} /></div>
                </div>
                <p style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold, textAlign: "center", marginBottom: SP.sm, letterSpacing: "0.02em" }}>مرحله‌ی بعدی</p>
                <p style={{ fontSize: FS.subtitle, color: c.ink, textAlign: "center", lineHeight: 1.8, fontWeight: FW.medium }}>{nextTip}</p>
                <button onClick={advance} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.xxl, paddingBlock: SP.md, borderRadius: RAD.lg, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, boxShadow: "0 12px 28px -10px rgba(47,124,246,0.5)" }}>
                  {index + 1 < actions.length ? "بعدی" : "تمام برای امروز"}{index + 1 < actions.length && <ChevronLeft size={16} color="#fff" />}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </BodyPortal>
  );
}

// ---------- Showing / Tour Mode ----------
// Home dashboard entry point: a door into a new tour, or — if one is already
// underway — a one-tap way back into it. Never buried behind the CRM tabs.
function VoiceAssistantTile({ ctx }) {
  const { c, setSheet } = ctx;
  return (
    <button onClick={() => setSheet("voice-note")} className="press text-right flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="relative flex items-center justify-center" style={{ width: 42, height: 42, marginBottom: SP.md }}>
        <span className="flora-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.primarySoft }} />
        <div className="flex items-center justify-center" style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", background: c.primarySoft, border: `1px solid ${c.primary}33` }}><Mic size={19} color={c.primary} /></div>
      </div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>یادداشت صوتی</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>فقط حرف بزن</p>
    </button>
  );
}
function SalesCoachTile({ ctx }) {
  const { c, setDetail } = ctx;
  return (
    <button onClick={() => setDetail({ type: "copilot" })} className="press text-right flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: RAD.md, background: c.purpleSoft, marginBottom: SP.md }}><Bot size={20} color={c.purple} /></div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>دستیار فروش</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>نگاه مدیر فروش</p>
    </button>
  );
}

// Standalone entry — no property attached, so the source photos never go
// through the app's own compression pipeline and results are just downloaded,
// not stored in the app's own (size-limited) data store.
// The document catalogue from the spec — nine categories an Iranian estate
// agent actually needs. The app supplies structure, auto-fill and printing;
// the wording of each contract is AI-drafted and then edited by the agent,
// because shipping ~55 pre-written legal texts would be irresponsible.
const DOC_CATEGORIES = [
  { id: "sale", label: "خرید و فروش", icon: FileText, tone: "primary", docs: ["مبایعه‌نامه", "قولنامه", "قرارداد پیش‌فروش", "قرارداد خرید آپارتمان", "قرارداد خرید زمین", "قرارداد خرید ویلا", "قرارداد خرید مغازه", "قرارداد خرید دفتر اداری"] },
  { id: "rent", label: "اجاره", icon: Home, tone: "success", docs: ["قرارداد اجاره مسکونی", "قرارداد اجاره تجاری", "قرارداد اجاره اداری", "تمدید اجاره", "فسخ اجاره", "تخلیه"] },
  { id: "build", label: "مشارکت در ساخت", icon: Building2, tone: "purple", docs: ["قرارداد مشارکت در ساخت", "الحاقیه", "تقسیم واحدها", "توافق‌نامه تغییرات", "صورت‌جلسه تحویل"] },
  { id: "contractor", label: "پیمانکاری", icon: Hammer, tone: "attn", docs: ["قرارداد پیمانکاری", "قرارداد بازسازی", "قرارداد دکوراسیون", "قرارداد برق", "قرارداد لوله‌کشی", "قرارداد کابینت", "قرارداد نما", "قرارداد نظارت"] },
  { id: "invest", label: "سرمایه‌گذاری و شراکت", icon: TrendingUp, tone: "purple", docs: ["قرارداد شراکت", "قرارداد سرمایه‌گذاری", "تقسیم سود", "تسویه شرکا", "مشارکت مالی"] },
  { id: "agency", label: "خدمات مشاور املاک", icon: Landmark, tone: "primary", docs: ["قرارداد حق‌الزحمه", "قرارداد انحصاری فروش", "قرارداد انحصاری اجاره", "قرارداد معرفی خریدار", "قرارداد معرفی مستأجر", "قرارداد بازاریابی ملک"] },
  { id: "admin", label: "فرم‌های اداری", icon: FileCheck, tone: "muted", docs: ["رسید دریافت وجه", "رسید دریافت چک", "رسید بیعانه", "تعهدنامه", "رضایت‌نامه", "اقرارنامه", "وکالت‌نامه عادی", "صورت‌جلسه", "استشهادیه"] },
  { id: "visit", label: "فرم‌های بازدید", icon: Eye, tone: "success", docs: ["فرم بازدید ملک", "تحویل کلید", "تحویل ملک", "تحویل پارکینگ", "تحویل انباری"] },
  { id: "pay", label: "پرداخت", icon: Wallet, tone: "attn", docs: ["برنامه اقساط", "تسویه حساب", "صورت‌حساب", "رسید پرداخت", "رسید چک"] },
];

// Entry tile. The stacked-paper effect isn't decoration for its own sake — it
// says "a pile of paperwork" at a glance, and the sheets lift apart on press.
function DocumentsTile({ ctx }) {
  const { c, setDetail } = ctx;
  const total = DOC_CATEGORIES.reduce((s, g) => s + g.docs.length, 0);
  return (
    <button onClick={() => setDetail({ type: "documents" })} className="press text-right relative overflow-hidden flora-docs-tile flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="relative" style={{ width: 42, height: 42, marginBottom: SP.md }}>
        <span className="flora-doc-sheet flora-doc-3" style={{ position: "absolute", inset: 0, borderRadius: RAD.sm, background: c.surface2, border: `1px solid ${c.border}` }} />
        <span className="flora-doc-sheet flora-doc-2" style={{ position: "absolute", inset: 0, borderRadius: RAD.sm, background: c.primarySoft, border: `1px solid ${c.primary}33` }} />
        <span className="flora-doc-sheet flora-doc-1 flex items-center justify-center" style={{ position: "absolute", inset: 0, borderRadius: RAD.sm, background: c.primarySoft, border: `1px solid ${c.primary}55` }}>
          <FileText size={19} color={c.primary} />
        </span>
      </div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>اسناد و قراردادها</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>{faDigits(total)} فرم آماده</p>
      <style>{`
        @keyframes floraDocFan1 { from { transform: translate(0,0) rotate(0deg); } to { transform: translate(0,-2px) rotate(0deg); } }
        .flora-doc-sheet { transition: transform .35s cubic-bezier(.34,1.4,.64,1); }
        .flora-doc-3 { transform: translate(5px, 5px) rotate(7deg); }
        .flora-doc-2 { transform: translate(2.5px, 2.5px) rotate(3.5deg); }
        .flora-docs-tile:active .flora-doc-3 { transform: translate(9px, 8px) rotate(12deg); }
        .flora-docs-tile:active .flora-doc-2 { transform: translate(4px, 4px) rotate(6deg); }
        .flora-docs-tile:active .flora-doc-1 { transform: translate(-1px, -2px); }
      `}</style>
    </button>
  );
}

// Entry tile for a real Perplexity-powered chat — search-grounded, so it can
// genuinely look things up on the web (including Divar listings), not just
// answer from training data like the app's other AI features.
function DivarSearchTile({ ctx }) {
  const { c, setDivarSearchOpen } = ctx;
  return (
    <button onClick={() => setDivarSearchOpen(true)} className="press text-right flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: RAD.md, background: c.primarySoft, marginBottom: SP.md }}><Search size={20} color={c.primary} /></div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>جستجوی دیوار</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>تحلیل آگهی‌ها با AI</p>
    </button>
  );
}

// Defined at the top level on purpose: an input row like this must NOT be
// declared inside DivarSearchSheet's own function body. If it were, every
// keystroke (which changes `input` state and re-renders the parent) would
// redefine this as a "new" component type, so React would unmount and
// remount the real <input> DOM node on every character — which is exactly
// what drops keyboard focus after a single letter.
function DivarSearchInputRow({ c, input, setInput, send, loading, style }) {
  // RTL fields can silently inject invisible bidi-control characters around
  // pasted LTR text (like a URL) — harmless to look at, but it breaks a plain
  // string match like /divar\.ir\/v\// against the value. Switching to ltr for
  // link-looking input avoids the browser inserting them in the first place;
  // stripping known bidi marks on top of that covers whatever's already there.
  const looksLikeLink = /^https?:\/\//i.test(input.trim()) || /divar\.ir/i.test(input);
  return (
    <div className="flex items-center" style={{ gap: SP.sm, width: "100%", ...style }}>
      <input value={input} dir={looksLikeLink ? "ltr" : "rtl"} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="هرچی می‌خوای بپرس..." style={{ ...inputStyle(c), flex: 1 }} />
      <button onClick={send} disabled={loading || !input.trim()} className="press flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: "50%", background: c.primary }}><Send size={17} color="#fff" /></button>
    </div>
  );
}

function DivarSearchSheet({ ctx, onClose }) {
  const { c, perplexityKey, agencyCity, notify, setSheet, canStage, avalaiKey, avalaiModel } = ctx;
  const [messages, setMessages] = useState([]);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adShots, setAdShots] = useState([]); // up to 3 screenshots for ad diagnosis
  const [linkForDiagnosis, setLinkForDiagnosis] = useState("");
  const [viewCountInput, setViewCountInput] = useState("");
  const scrollRef = useRef(null);
  const shotRef = useRef(null);
  const DIVAR_URL_RE = /https?:\/\/(www\.)?divar\.ir\/v\/\S+/g;

  // Chat survives closing the sheet — cleared only by the trash button.
  useEffect(() => {
    (async () => {
      try { const saved = await dbGet(DIVAR_CHAT_KEY); if (saved?.messages) setMessages(saved.messages); } catch (e) {}
      setLoadedHistory(true);
    })();
  }, []);
  useEffect(() => { if (loadedHistory) dbSet(DIVAR_CHAT_KEY, { messages }).catch(() => {}); }, [loadedHistory, messages]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const clearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    dbSet(DIVAR_CHAT_KEY, { messages: [] }).catch(() => {});
    notify("گفتگو پاک شد");
  };

  const addLinkToFiles = (url) => {
    onClose();
    setSheet({ kind: "property", prefillDivarLink: url });
  };

  const addShots = async (fileList) => {
    const room = 3 - adShots.length;
    if (room <= 0) { notify("حداکثر ۳ عکس"); return; }
    const files = Array.from(fileList).slice(0, room);
    const items = await Promise.all(files.map(async (f) => ({ id: uid(), url: await compressImage(f) })));
    setAdShots((prev) => [...prev, ...items]);
  };

  // Ad diagnosis runs on AvalAI's vision model, not Perplexity: Perplexity's
  // sonar models are search-grounded and don't accept image input, so sending
  // screenshots there would silently do nothing useful.
  const diagnoseAd = async () => {
    if (adShots.length === 0) return;
    if (!canStage) { notify("این قابلیت به کلید AvalAI نیاز دارد — در تنظیمات هوش مصنوعی واردش کن"); return; }
    setMessages((prev) => [...prev, { role: "user", text: `تحلیل آگهی از روی ${faDigits(adShots.length)} عکس`, shots: adShots.map((s) => s.url) }]);
    const shots = adShots;
    setAdShots([]);
    setLoading(true);
    try {
      const content = [
        { type: "text", text: `این تصاویر اسکرین‌شات یک آگهی ملکی در دیوار است (عنوان و قیمت، متن آگهی، و آمار بازدید/تماس). به‌عنوان یک متخصص فروش املاک تحلیل کن که چرا این آگهی با وجود بازدید، تماس کمی گرفته.

این آگهی را دقیقاً با این معیارها بسنج:
- قانون اوگیلوی: آیا کلمات توخالی («سوپرلوکس»، «سلطنتی»، «بی‌نظیر») دارد؟ هر ادعای بدون عدد یا جنس مشخص را نام ببر و جایگزین واقعی پیشنهاد بده.
- سه ترس خریدار ایرانی: آیا به واقعی‌بودن عکس‌ها، وضعیت سند، و شفافیت شرایط پرداخت اشاره شده؟ هرکدام که غایب است را بگو.
- قانون ۳ ثانیه: آیا با بولت و شکست خط در ۳ ثانیه اسکن می‌شود یا پاراگراف طولانی و خسته‌کننده است؟
- دعوت به اقدام: آیا دلیل مشخصی برای تماس داده (ویدیو، بررسی سند، بازدید) یا فقط شماره گذاشته؟

سپس دقیقاً به این موارد بپرداز:
۱. عنوان: آیا لوکیشن + مشخصه‌ی یکتا + قلاب مالی را دارد؟ عنوان بهتر را دقیقاً بنویس.
۲. قیمت: نسبت به بازار چطور به‌نظر می‌رسد؟
۳. متن آگهی: چه چیزی کم دارد، چه چیزی زیادی است، لحنش چطور است؟
۴. آمار: نسبت بازدید به تماس چه می‌گوید؟
۵. سه اقدام مشخص و فوری که همین امروز باید انجام دهد.
کوتاه، صریح و به فارسی جواب بده — بدون تعارف.` },
        ...shots.map((s) => ({ type: "image_url", image_url: { url: s.url } })),
      ];
      const res = await fetch("https://api.avalai.ir/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${avalaiKey}` },
        body: JSON.stringify({ model: avalaiModel && avalaiModel.startsWith("gpt-4o") ? avalaiModel : "gpt-4o", messages: [{ role: "user", content }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطا (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content || "پاسخی دریافت نشد";
      setMessages((prev) => [...prev, { role: "assistant", text }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `خطا: ${e.message || "نامشخص"}`, error: true }]);
    }
    setLoading(false);
  };

  // Same diagnostic questions as the screenshot version, but sourced from
  // real extracted data (via the already-hardened import-divar pipeline)
  // instead of asking the agent to screenshot three separate things. Real
  // photos get attached too when available, so the AI can still critique
  // them visually — this ends up more reliable than screenshots, not less,
  // since the text fields are exact extracted values, not an OCR guess off
  // a photo of a phone screen.
  const diagnoseAdFromLink = async () => {
    const url = linkForDiagnosis.trim();
    if (!/^https?:\/\/(www\.)?divar\.ir\/v\//i.test(url)) { notify("لینک آگهی دیوار معتبر نیست"); return; }
    if (!canStage) { notify("این قابلیت به کلید AvalAI نیاز دارد — در تنظیمات هوش مصنوعی واردش کن"); return; }
    const views = viewCountInput.trim();
    setMessages((prev) => [...prev, { role: "user", text: `تحلیل آگهی از روی لینک${views ? ` (بازدید: ${faDigits(views)})` : ""}` }]);
    setLinkForDiagnosis(""); setViewCountInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-divar", { body: { url } });
      if (error || !data?.ok) {
        const code = data?.code;
        const msg = code === "LINK_INVALID" ? "این لینک، لینک معتبر آگهی دیوار نیست."
          : code === "PAGE_NOT_ACCESSIBLE" ? "این آگهی الان در دسترس نیست — ممکنه حذف شده باشه."
          : code === "EXTRACTION_FAILED" ? "نتونستم اطلاعاتی از این آگهی استخراج کنم."
          : code === "RATE_LIMITED" ? "درخواست زیاده — چند لحظه صبر کن."
          : "خطا در دریافت اطلاعات آگهی.";
        throw new Error(msg);
      }
      const d = data.data;
      const facts = [
        `عنوان: ${d.title || "نامشخص"}`,
        d.price ? `قیمت کل: ${fmtToman(d.price)}` : null,
        d.area ? `متراژ: ${faDigits(d.area)} متر` : null,
        d.rooms != null ? `تعداد خواب: ${faDigits(d.rooms)}` : null,
        d.floor != null ? `طبقه: ${faDigits(d.floor)}` : null,
        d.parking != null ? `پارکینگ: ${d.parking ? "دارد" : "ندارد"}` : null,
        d.elevator != null ? `آسانسور: ${d.elevator ? "دارد" : "ندارد"}` : null,
        d.storage != null ? `انباری: ${d.storage ? "دارد" : "ندارد"}` : null,
        `تعداد عکس: ${faDigits(d.images?.length || 0)}`,
        d.description ? `متن آگهی: ${d.description}` : null,
        views ? `بازدید آگهی: ${faDigits(views)}` : null,
      ].filter(Boolean).join("\n");

      const availableImages = (d.images || []).filter((im) => im.base64).slice(0, 3);
      const content = [
        { type: "text", text: `این اطلاعات واقعی یک آگهی ملکی در دیوار است (استخراج‌شده مستقیم از خود آگهی، نه حدسی):
${facts}

به‌عنوان یک متخصص فروش املاک تحلیل کن که چرا این آگهی${views ? " با وجود این میزان بازدید" : ""} تماس کمی می‌گیرد.

این آگهی را دقیقاً با این معیارها بسنج:
- قانون اوگیلوی: آیا کلمات توخالی («سوپرلوکس»، «سلطنتی»، «بی‌نظیر») دارد؟ هر ادعای بدون عدد یا جنس مشخص را نام ببر و جایگزین واقعی پیشنهاد بده.
- سه ترس خریدار ایرانی: آیا به واقعی‌بودن عکس‌ها، وضعیت سند، و شفافیت شرایط پرداخت اشاره شده؟ هرکدام که غایب است را بگو.
- قانون ۳ ثانیه: آیا با بولت و شکست خط در ۳ ثانیه اسکن می‌شود یا پاراگراف طولانی و خسته‌کننده است؟
- دعوت به اقدام: آیا دلیل مشخصی برای تماس داده (ویدیو، بررسی سند، بازدید) یا فقط شماره گذاشته؟
- تعداد عکس: کم بودن عکس (کمتر از ۵) خودش یک دلیل رایج کم‌تماسی است — اگر کم است بگو.
${views ? "- نسبت بازدید به تماس: با توجه به بازدید داده‌شده، آیا این نرخ نرمال به‌نظر می‌رسد یا پایین است؟" : ""}

سپس دقیقاً به این موارد بپرداز:
۱. عنوان: آیا لوکیشن + مشخصه‌ی یکتا + قلاب مالی دارد؟ عنوان بهتر را دقیقاً بنویس.
۲. قیمت: نسبت به بازار چطور به‌نظر می‌رسد؟
۳. متن آگهی: چه چیزی کم دارد، چه چیزی زیادی است، لحنش چطور است؟
۴. عکس‌ها: بر اساس تعداد و آنچه در تصاویر پیوست‌شده می‌بینی چطورند؟
۵. سه اقدام مشخص و فوری که همین امروز باید انجام دهد.
کوتاه، صریح و به فارسی جواب بده — بدون تعارف. هیچ‌چیزی که در اطلاعات بالا نیامده را حدس نزن یا نساز.` },
        ...availableImages.map((im) => ({ type: "image_url", image_url: { url: `data:${im.contentType};base64,${im.base64}` } })),
      ];
      const res = await fetch("https://api.avalai.ir/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${avalaiKey}` },
        body: JSON.stringify({ model: avalaiModel && avalaiModel.startsWith("gpt-4o") ? avalaiModel : "gpt-4o", messages: [{ role: "user", content }] }),
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(respData?.error?.message || `خطا (کد ${res.status})`);
      const text = respData?.choices?.[0]?.message?.content || "پاسخی دریافت نشد";
      setMessages((prev) => [...prev, { role: "assistant", text }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `خطا: ${e.message || "نامشخص"}`, error: true }]);
    }
    setLoading(false);
  };

  const send = async () => {
    const q = input.trim().replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "");
    if (!q) return;
    if (!perplexityKey) { notify("اول کلید Perplexity را در تنظیمات هوش مصنوعی وارد کن"); return; }
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const isLink = /divar\.ir\/v\//.test(q);
      const prompt = isLink
        ? `این لینک یک آگهی ملکی در دیوار است: ${q}\nصفحه را باز کن و آگهی را برای یک مشاور املاک تحلیل کن: عنوان، قیمت، متراژ، تعداد اتاق، طبقه، آدرس، و یک جمع‌بندی کوتاه از اینکه این قیمت نسبت به بازار منطقه منصفانه به‌نظر می‌رسد یا نه. به فارسی و خلاصه جواب بده.`
        : `تو یه دستیار جستجوی املاک هستی که رو دیوار (divar.ir) جستجوی زنده انجام می‌دی. اگه شهرِ سوال کاربر مشخص نبود، فرض کن منظورش ${agencyCity || "سرعین"}ه. جواب رو دقیق، عملی و به فارسی بده — اگه آگهی‌های واقعی پیدا کردی، برای هرکدوم عنوان، قیمت تقریبی، و لینک مستقیم آگهی (divar.ir/v/...) رو بیار. سوال: ${q}`;
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${perplexityKey}` },
        body: JSON.stringify({ model: "sonar-pro", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `خطا (کد ${res.status})`);
      const text = data?.choices?.[0]?.message?.content || "پاسخی دریافت نشد";
      const citations = data?.citations || data?.search_results?.map((s) => s.url) || [];
      // Divar listing links found either in citations or written inline in the
      // answer itself — either way, surface them as one-tap "add to files".
      const inlineLinks = [...text.matchAll(DIVAR_URL_RE)].map((m) => m[0]);
      const listingLinks = [...new Set([...citations.filter((u) => /divar\.ir\/v\//.test(u)), ...inlineLinks])];
      setMessages((prev) => [...prev, { role: "assistant", text, citations, listingLinks }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `خطا: ${e.message || "نامشخص"}`, error: true }]);
    }
    setLoading(false);
  };

  return (
    <BodyPortal onClose={onClose}>
    <div className="fixed inset-0 z-[96] flex flex-col flora-focus-in" style={{ background: c.bg }}>
      <div className="flex items-center justify-between shrink-0" style={{ padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
        <button onClick={onClose} aria-label="بستن" className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>جستجوی دیوار با AI</h2>
        <button onClick={clearChat} disabled={messages.length === 0} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2, opacity: messages.length === 0 ? 0.5 : 1 }}><Trash2 size={16} color={messages.length === 0 ? c.muted : c.danger} /></button>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto" style={{ padding: SP.xl }}>
          {/* Big, obvious entry to Divar's own site */}
          <a href="https://divar.ir" target="_blank" rel="noreferrer" className="press flex items-center w-full" style={{ gap: SP.md, padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.xl, background: "linear-gradient(135deg,#0F5132,#1E7A4F)", boxShadow: "0 14px 30px -10px rgba(15,81,50,0.45)" }}>
            <div className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: RAD.md, background: "rgba(255,255,255,0.16)" }}><DivarMark size={22} color="#fff" /></div>
            <div className="flex-1 text-right">
              <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: "#fff" }}>ورود به وب دیوار</p>
              <p style={{ fontSize: FS.caption, color: "rgba(255,255,255,0.88)", marginTop: 2 }}>باز کردن سایت دیوار در مرورگر</p>
            </div>
            <ChevronLeft size={20} color="rgba(255,255,255,0.75)" />
          </a>

          {/* Ad diagnosis — 3 screenshots */}
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.xl, ...glass(c) }}>
            <p style={{ fontSize: FS.body, fontWeight: FW.bold, marginBottom: SP.xs }}>چرا آگهی‌ام زنگ نمی‌خوره؟</p>
            <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>سه اسکرین‌شات از آگهی دیوارت بفرست: ۱) عنوان و قیمت ۲) متن آگهی ۳) آمار بازدید — تحلیل می‌کنم چرا تماس نمی‌گیرن.</p>
            <input ref={shotRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) addShots(e.target.files); e.target.value = ""; }} />
            <div className="grid grid-cols-3" style={{ gap: SP.sm, marginBottom: SP.md }}>
              {[0, 1, 2].map((i) => {
                const shot = adShots[i];
                const labels = ["عنوان و قیمت", "متن آگهی", "آمار بازدید"];
                return shot ? (
                  <button key={i} onClick={() => setAdShots((prev) => prev.filter((s) => s.id !== shot.id))} className="press relative" style={{ aspectRatio: "1", borderRadius: RAD.md, overflow: "hidden", border: `1px solid ${c.border}` }}>
                    <img src={shot.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span className="absolute flex items-center justify-center" style={{ top: 4, left: 4, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)" }}><X size={10} color="#fff" /></span>
                  </button>
                ) : (
                  <button key={i} onClick={() => shotRef.current?.click()} className="press flex flex-col items-center justify-center" style={{ aspectRatio: "1", borderRadius: RAD.md, background: c.surface2, border: `1px dashed ${c.border}` }}>
                    <ImagePlus size={16} color={c.muted} />
                    <span style={{ fontSize: 10, color: c.muted, marginTop: 4, textAlign: "center", paddingInline: 2 }}>{labels[i]}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={diagnoseAd} disabled={adShots.length === 0 || loading} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.md, background: adShots.length ? c.primary : c.surface2, color: adShots.length ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.caption + 1 }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}تحلیل حرفه‌ای آگهی
            </button>
          </div>

          {/* Ad diagnosis — real listing link, no screenshots needed */}
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.xl, ...glass(c) }}>
            <p style={{ fontSize: FS.body, fontWeight: FW.bold, marginBottom: SP.xs }}>یا لینک آگهی رو بده</p>
            <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>خودم اطلاعات واقعی آگهی رو می‌گیرم و کامل تحلیل می‌کنم — نیازی به اسکرین‌شات نیست.</p>
            <input value={linkForDiagnosis} onChange={(e) => setLinkForDiagnosis(e.target.value)} dir="ltr" placeholder="https://divar.ir/v/..." style={{ width: "100%", background: c.surface2, border: "none", borderRadius: RAD.md, padding: "10px 14px", fontSize: FS.body, color: c.ink, marginBottom: SP.sm }} />
            <input value={viewCountInput} onChange={(e) => setViewCountInput(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="میزان بازدید آگهی (اختیاری)" style={{ width: "100%", background: c.surface2, border: "none", borderRadius: RAD.md, padding: "10px 14px", fontSize: FS.body, color: c.ink, marginBottom: SP.md }} />
            <button onClick={diagnoseAdFromLink} disabled={!linkForDiagnosis.trim() || loading} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.md, background: linkForDiagnosis.trim() ? c.primary : c.surface2, color: linkForDiagnosis.trim() ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.caption + 1 }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}تحلیل کامل آگهی
            </button>
          </div>

          {/* Search */}
          <div className="flex flex-col items-center" style={{ textAlign: "center" }}>
            <p style={{ fontSize: FS.body, color: c.muted, lineHeight: 1.9, maxWidth: 300, marginBottom: SP.md }}>یا بپرس، مثلاً «۵ تا فایل امروزیِ فروش آپارتمان سرعین رو بگو» — یا یه لینک آگهی پیست کن.</p>
            <DivarSearchInputRow c={c} input={input} setInput={setInput} send={send} loading={loading} />
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: SP.xl }}>
            <div className="flex flex-col" style={{ gap: SP.md }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div style={{ maxWidth: "88%", padding: SP.md, borderRadius: RAD.md, background: m.role === "user" ? c.primary : c.surface2, color: m.role === "user" ? "#fff" : c.ink }}>
                    {m.shots?.length > 0 && (
                      <div className="flex" style={{ gap: 4, marginBottom: SP.sm }}>
                        {m.shots.map((u, j) => <img key={j} src={u} alt="" style={{ width: 46, height: 46, borderRadius: RAD.sm, objectFit: "cover" }} />)}
                      </div>
                    )}
                    <p style={{ fontSize: FS.body, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{m.text}</p>
                    {m.citations?.length > 0 && (
                      <div className="flex flex-col" style={{ gap: 4, marginTop: SP.sm, paddingTop: SP.sm, borderTop: `1px solid ${c.border}` }}>
                        {m.citations.slice(0, 5).map((u, j) => (
                          <a key={j} href={u} target="_blank" rel="noreferrer" style={{ fontSize: FS.caption, color: c.primary, direction: "ltr", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u}</a>
                        ))}
                      </div>
                    )}
                    {m.listingLinks?.length > 0 && (
                      <div className="flex flex-col" style={{ gap: SP.xs, marginTop: SP.sm, paddingTop: SP.sm, borderTop: `1px solid ${c.border}` }}>
                        {m.listingLinks.slice(0, 5).map((u, j) => (
                          <button key={j} onClick={() => addLinkToFiles(u)} className="press flex items-center justify-center" style={{ gap: 4, paddingBlock: 8, borderRadius: RAD.sm, background: c.primarySoft }}>
                            <Plus size={12} color={c.primary} /><span style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>افزودن آگهی {faDigits(j + 1)} به فایل‌ها</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start"><div style={{ padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}><Loader2 size={16} className="animate-spin" color={c.primary} /></div></div>
              )}
            </div>
          </div>
          <div className="shrink-0" style={{ padding: SP.lg, paddingBottom: `calc(${SP.lg}px + env(safe-area-inset-bottom, 0px))`, borderTop: `1px solid ${c.border}` }}>
            <DivarSearchInputRow c={c} input={input} setInput={setInput} send={send} loading={loading} />
          </div>
        </>
      )}
    </div>
    </BodyPortal>
  );
}

// Voice → structured CRM entries. Records audio, transcribes with AvalAI's real
// Whisper proxy (not the browser's unreliable built-in recognizer), then asks the
// AI to pull out who/what/when as JSON. The agent reviews before anything saves —
// no silent writes, but no form-filling either.
// Rotates through example phrases while recording, so an agent who's never used
// this before knows what "just talk" actually sounds like.
function VoiceHintRotator({ c }) {
  const hints = [
    "با آقای محمودی صحبت کردم، سه روز دیگه ساعت ۵ بازدید داریم",
    "دنبال آپارتمان تک‌واحدی تا ۱۲ میلیارد توی سعادت‌آباد هست",
    "اگه فایل مناسب پیدا شد سریع بهش خبر بده",
    "فایل ۸۲ رو به رضایی نشون دادم، خوشش اومد ولی قیمتش زیاد بود",
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % hints.length), 3200); return () => clearInterval(t); }, []);
  return (
    <p key={i} className="flora-rise" style={{ fontSize: FS.caption, color: c.muted, marginTop: SP.lg, textAlign: "center", lineHeight: 1.8, maxWidth: 280 }}>مثلاً: «{hints[i]}»</p>
  );
}

// A soft, liquid, breathing orb — the ChatGPT-voice-mode look. This uses the actual
// "gooey" technique (independent circles + an SVG blur/threshold filter that fuses
// them into one smooth liquid shape) rather than blur-on-border-radius, which just
// smears into a soft square once the blur is strong enough to read as "liquid".
function VoiceOrb({ c, level = 0, state = "listening" }) {
  const palette = state === "thinking" ? [c.purple, "#22d3ee", c.purple] : state === "success" ? [c.success, "#22d3ee", c.success] : [c.primary, "#22d3ee", c.primary];
  const reactive = state === "listening";
  const boost = reactive ? 1 + Math.min(0.5, level * 0.6) : 1;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 176, height: 176 }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="flora-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
        </filter>
      </svg>
      {/* soft ambient halo behind the liquid shape */}
      <span className="flora-orb-breathe" style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle, ${palette[0]}33, transparent 70%)`, filter: "blur(6px)", transform: `scale(${boost})`, transition: "transform .15s ease-out, background 1s ease" }} />
      {/* the fused liquid blob — three circles, independently drifting, merged by the goo filter */}
      <div style={{ position: "absolute", width: 110, height: 110, filter: "url(#flora-goo)", transform: `scale(${boost})`, transition: "transform .12s ease-out" }}>
        <span className="flora-blob flora-blob-a" style={{ background: palette[0] }} />
        <span className="flora-blob flora-blob-b" style={{ background: palette[1] }} />
        <span className="flora-blob flora-blob-c" style={{ background: palette[2] }} />
      </div>
      {/* crisp glass core with the state icon */}
      <div className="flex items-center justify-center" style={{
        position: "relative", width: 88, height: 88, borderRadius: "50%", ...glassSurface(c),
        backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${palette[0]}40`, boxShadow: `0 8px 28px -8px ${palette[0]}55`,
        transform: `scale(${reactive ? 1 + Math.min(0.1, level * 0.14) : 1})`, transition: "transform .1s ease-out",
      }}>
        {state === "listening" && <Mic size={30} color={palette[0]} />}
        {state === "thinking" && <Loader2 size={28} className="animate-spin" color={palette[0]} />}
        {state === "success" && <CheckCircle2 size={32} color={c.success} />}
      </div>
    </div>
  );
}

function VoiceNoteSheet({ ctx, onClose }) {
  const { c, canTranscribe, transcribeAudio, hasAiKey, callAI, customers, properties, setCustomers, setCalls, setAppointments, setChecks, notify, setSheet } = ctx;
  const [phase, setPhase] = useState("idle"); // idle | recording | transcribing | extracting | clarify | review | saving | done
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0); // live smoothed 0..1 mic amplitude, drives the orb
  const [showFullEdit, setShowFullEdit] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const silenceRef = useRef(0); // consecutive low-volume frames, for auto-stop
  const spokeRef = useRef(false); // has real speech been heard yet this take
  const secondsRef = useRef(0); // mirrors `seconds` for the rAF loop (avoids a stale closure)

  const vibrate = (ms) => { try { navigator.vibrate?.(ms); } catch (e) {} };

  const cleanupAudioGraph = () => {
    cancelAnimationFrame(rafRef.current);
    try { audioCtxRef.current?.close(); } catch (e) {}
    audioCtxRef.current = null; analyserRef.current = null;
    setLevel(0);
  };

  useEffect(() => {
    startRecording(); // one voice note = tap and talk immediately, no extra step
    return () => { clearInterval(timerRef.current); cleanupAudioGraph(); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line

  const watchLevels = (stream) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctxA = new AC();
    const source = ctxA.createMediaStreamSource(stream);
    const analyser = ctxA.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    audioCtxRef.current = ctxA; analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length; // 0..255
      frame++;
      if (frame % 2 === 0) setLevel((prev) => prev + (Math.min(1, avg / 85) - prev) * 0.3); // smoothed, ~30fps
      // silence-based auto-stop: once real speech has happened, a long enough
      // pause means the agent is done talking — stop for them, like a voice memo.
      if (avg > 14) { spokeRef.current = true; silenceRef.current = 0; }
      else if (spokeRef.current) silenceRef.current += 1;
      if (silenceRef.current > 70 && secondsRef.current > 2) stopRecording(); // ~1.8s of quiet after speech
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const startRecording = async () => {
    setError(""); setTranscript(""); setExtracted(null); spokeRef.current = false; silenceRef.current = 0;
    if (!canTranscribe) { setError("اول کلید AvalAI را در تنظیمات هوش مصنوعی وارد کن — یادداشت صوتی به آن نیاز دارد."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => { cleanupAudioGraph(); stream.getTracks().forEach((t) => t.stop()); handleRecordingDone(rec.mimeType || "audio/webm"); };
      mediaRef.current = rec;
      rec.start();
      watchLevels(stream);
      vibrate(20);
      setPhase("recording"); setSeconds(0); secondsRef.current = 0;
      timerRef.current = setInterval(() => setSeconds((s) => { const next = s + 1; secondsRef.current = next; if (next >= 90) { stopRecording(); return next; } return next; }), 1000);
    } catch (e) { setError("دسترسی به میکروفون داده نشد."); }
  };
  const stopRecording = () => { clearInterval(timerRef.current); if (mediaRef.current?.state === "recording") { vibrate(15); mediaRef.current.stop(); } };

  const handleRecordingDone = async (mimeType) => {
    setPhase("transcribing");
    const blob = new Blob(chunksRef.current, { type: mimeType });
    try {
      const text = await transcribeAudio(blob);
      setTranscript(text);
      await extract(text);
    } catch (e) { setError(e.message || "خطا در تبدیل صوت"); setPhase("idle"); }
  };

  const extract = async (text, clarifyQA) => {
    setPhase("extracting");
    if (!hasAiKey) { setError("برای فهمیدن منظورت، کلید هوش مصنوعی لازم است."); setPhase("idle"); return; }
    const now = new Date();
    const [jy, jm, jd] = isoToJalali(todayISO());
    // Real app data so the AI matches against actual records instead of guessing —
    // existing customer names (avoid duplicate creation) and active listings (so a
    // "next step" suggestion can point at a real file, like the Deal Coach does).
    const knownCustomers = customers.slice(0, 80).map((cu) => cu.name).join("، ") || "هیچ‌کدام";
    const activeListings = properties.filter((p) => p.stage !== "فروخته شد").slice(0, 40)
      .map((p) => `${p.title} — ${fmtToman(p.price)} — ${p.area} متر${p.type ? ` — ${p.type}` : ""}`).join("\n") || "فایلی ثبت نشده";
    try {
      const prompt = `تو دستیار یک مشاور املاک ایرانی هستی و به داده‌های واقعی دفتر او دسترسی داری. مشاور این جمله را با صدا گفته (متن پیاده‌شده از صوت، ممکن است غلط تایپی داشته باشد) — می‌تواند درباره‌ی یک تماس/بازدید مشتری باشد یا درباره‌ی یک چک پرداختی:
«${text}»
${clarifyQA ? `\nسوال قبلی تو: «${clarifyQA.q}» — جواب مشاور: «${clarifyQA.a}»\n` : ""}
امروز میلادی ${todayISO()} و شمسی ${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)} است (روز هفته: ${["یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"][now.getDay()]}).

مشتریان موجود در سیستم (اگر اسم گفته‌شده به یکی از این‌ها نزدیک بود، همان اسم دقیق را در customerName بگذار تا با پروفایل موجود یکی شود): ${knownCustomers}

فایل‌های فعال دفتر (اگر نیاز مشتری با یکی از این‌ها می‌خواند، در nextAction دقیقاً به همان فایل با نامش اشاره کن، نه یک پیشنهاد کلی):
${activeListings}

نکته‌ی مهم درباره‌ی اعداد فارسی محاوره‌ای (برای checkAmount و budget حتماً رعایت کن):
«هفت میلیارد» = 7000000000 — «7 میلیارد» = 7000000000 — «هفت میلیارد تومن» یا «۷ میلیارد تومان» هم همین‌طور.
«سه و نیم میلیارد» = 3500000000 — «صد و بیست میلیون» = 120000000 — «پونصد میلیون» = 500000000 — «سیصد میلیون» = 300000000.
هرگز میلیارد و میلیون را با هم اشتباه نگیر: «۱۲ میلیارد» یعنی 12000000000، نه 12000000. «۱۲۰ متر» (متراژ) را هرگز با «۱۲۰ میلیون» (قیمت) قاطی نکن — این‌ها کاملاً جدا هستند.
«تومن» و «تومان» یکی هستند. اگر واحد «ریال» گفته شد، خودش را ده برابر بزرگ‌تر از تومان در نظر بگیر (یعنی برای تبدیل به تومان تقسیم بر ۱۰ کن).
اگر عدد را واقعاً نمی‌شود از جمله فهمید (نه اینکه فقط واحدش نامشخصه)، صفر بگذار — ولی اگر عدد و واحد هردو گفته شده، حتماً به عدد کامل تبدیلش کن، نصفه‌کاره نگذار.

اطلاعات را استخراج کن و دقیقاً همین JSON خام را برگردان (بدون توضیح، بدون markdown):
{
  "isCheck": true,
  "checkRecipient": "اسم گیرنده‌ی چک اگر این جمله درباره‌ی یک چک پرداختی است، وگرنه خالی",
  "checkAmount": 0,
  "checkDueDate": "تاریخ میلادی YYYY-MM-DD سررسید چک — تاریخ‌های نسبی مثل دو هفته‌دیگر را با توجه به امروز حساب کن، وگرنه خالی",
  "customerName": "اسم مشتری یا خالی",
  "phone": "شماره اگر گفته شده یا خالی",
  "callHappened": true,
  "meetingDate": "تاریخ میلادی YYYY-MM-DD قرار بازدید اگر گفته شده، وگرنه خالی — تاریخ‌های نسبی مثل سه‌روزدیگر یا شنبه را خودت با توجه به امروز حساب کن",
  "meetingTime": "HH:MM اگر گفته شده وگرنه خالی",
  "need": "خلاصه‌ی نیاز مشتری (نوع ملک، منطقه) یا خالی",
  "budget": 0,
  "area": "منطقه/محله اگر گفته شده یا خالی",
  "suggestedStage": "فقط اگر جمله به‌وضوح نشون می‌ده مرحله‌ی مشتری عوض شده، دقیقاً یکی از این مقادیر را بنویس: «خرید کرد» (قطعی خرید کرد) یا «منصرف شد» (به‌وضوح دیگر نمی‌خواهد) یا «دنبال سرمایه‌گذاری» یا «دنبال پیش‌فروش» — در غیر این صورت این فیلد را کاملاً خالی بگذار، مرحله‌ی فعلی مشتری را حدس نزن یا تغییر نده",
  "note": "خلاصه‌ی یک یا دو خطی از کل مکالمه به فارسی روان",
  "reminder": "اگر مشاور خواسته یادش بیفتد کاری بکند اینجا بنویس، وگرنه خالی",
  "nextAction": "یک پیشنهاد کوتاه برای قدم بعدی — اگر فایل مناسبی در لیست بالا هست، دقیقاً نامش را بیاور",
  "clarify": "فقط اگر یک نکته‌ی مهم و مبهم هست که باید از مشاور بپرسی، یک سوال کوتاه اینجا بنویس؛ وگرنه خالی بگذار"
}
اگر جمله فقط درباره‌ی یک چک است (نه تماس یا بازدید مشتری)، isCheck را true بگذار و فقط فیلدهای check* را پر کن — بقیه‌ی فیلدها (customerName، callHappened، meetingDate و...) را خالی/false بگذار.`;
      const raw = await callAI(prompt);
      const jsonMatch1 = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch1) throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن");
      const parsed = JSON.parse(jsonMatch1[0]);
      setExtracted(parsed);
      if (parsed.clarify && !clarifyQA) setPhase("clarify");
      else setPhase("review");
    } catch (e) {
      setError(e instanceof SyntaxError ? "پاسخ هوش مصنوعی قابل‌خواندن نبود — دوباره امتحان کن" : (e.message || "خطای نامشخص"));
      setPhase("idle");
    }
  };

  const confirmClarify = () => { extract(transcript, { q: extracted.clarify, a: clarifyAnswer }); };

  const save = () => {
    setPhase("saving");
    if (extracted.isCheck) {
      setChecks((prev) => [{
        id: uid(), recipient: (extracted.checkRecipient || "بدون نام").trim(), amount: toNum(extracted.checkAmount) || 0,
        dueDate: extracted.checkDueDate || todayISO(), notes: "", createdAt: new Date().toISOString(), paid: false,
      }, ...prev]);
      notify("چک از روی یادداشت صوتی ثبت شد");
      setPhase("done");
      return;
    }
    const name = (extracted.customerName || "").trim();
    // Only a real, known stage value is ever applied — anything else the
    // model might have written gets silently ignored rather than trusted,
    // matching the app's own "never hallucinate" rule from the master spec.
    const validStage = CUSTOMER_STAGES.includes(extracted.suggestedStage) ? extracted.suggestedStage : null;
    let customerId = "";
    if (name) {
      const match = customers.find((cu) => cu.name.trim() === name || cu.name.includes(name) || name.includes(cu.name.trim()));
      if (match) {
        customerId = match.id;
        setCustomers((prev) => prev.map((x) => x.id === match.id ? {
          ...x,
          need: extracted.need || x.need,
          budget: extracted.budget > 0 ? extracted.budget : x.budget,
          lastCallNote: extracted.note || x.lastCallNote,
          lastContactAt: todayISO(), lastContactTs: Date.now(),
          stage: validStage || x.stage, // never resets to a default — only moves on a real signal
        } : x));
      } else {
        customerId = uid();
        setCustomers((prev) => [{ id: customerId, name, phone: extracted.phone || "", need: extracted.need || "", budget: extracted.budget || 0, stage: validStage || "در حال بررسی", lastContactAt: todayISO(), lastContactTs: Date.now(), lastCallNote: extracted.note || "" }, ...prev]);
      }
    }
    if (extracted.callHappened) {
      setCalls((prev) => [{ id: uid(), customerId, customerName: name || "بدون نام", customerPhone: extracted.phone || "", date: todayISO(), status: "انجام‌شد", notes: extracted.note || transcript }, ...prev]);
    }
    if (extracted.meetingDate) {
      setAppointments((prev) => [{ id: uid(), propertyId: "", customerId, customerName: name || "بدون نام", date: extracted.meetingDate, time: extracted.meetingTime || "10:00", notes: extracted.note || "" }, ...prev]);
    }
    notify("یادداشت صوتی ذخیره شد");
    setPhase("done");
  };

  const savedItems = extracted ? (
    extracted.isCheck
      ? [`چک برای ${extracted.checkRecipient || "بدون نام"} — ${fmtToman(toNum(extracted.checkAmount) || 0)}`, extracted.checkDueDate && `سررسید: ${fmtJalali(extracted.checkDueDate)}`].filter(Boolean)
      : [
          extracted.callHappened && "تماس در تاریخچه ثبت شد",
          extracted.meetingDate && `بازدید در تقویم — ${fmtJalali(extracted.meetingDate)}`,
          extracted.suggestedStage && CUSTOMER_STAGES.includes(extracted.suggestedStage) && `مرحله‌ی مشتری تغییر کرد به «${extracted.suggestedStage}»`,
          (extracted.need || extracted.budget > 0) && "پروفایل مشتری به‌روزرسانی شد",
          extracted.reminder && `یادآوری: ${extracted.reminder}`,
        ].filter(Boolean)
  ) : [];

  return (
    <BodyPortal onClose={onClose}>
    <div className="fixed inset-0 z-[95] flex flex-col flora-pop" style={{ background: c.bg }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <span style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, #22d3ee22, transparent 70%)`, filter: "blur(10px)" }} />
      </div>
      <div className="flex items-center justify-between shrink-0 relative" style={{ padding: SP.lg, paddingTop: `calc(${SP.lg}px + env(safe-area-inset-top, 0px))` }}>
        <button onClick={onClose} aria-label="بستن" className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>یادداشت صوتی</h2>
        <div style={{ width: 36 }} />
      </div>
      <div className="flex-1 overflow-y-auto relative" style={{ padding: SP.xl }}>
      {error && <p style={{ fontSize: FS.caption, color: c.danger, background: c.dangerSoft, padding: SP.md, borderRadius: RAD.md, marginBottom: SP.md, lineHeight: 1.8 }}>{error}</p>}

      {phase === "idle" && !error && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xxl }}>
          <Loader2 size={26} className="animate-spin" color={c.primary} />
          <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.lg }}>در حال آماده‌سازی میکروفون...</p>
        </div>
      )}
      {phase === "idle" && error && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xl }}>
          <button onClick={startRecording} className="press relative flex items-center justify-center" style={{ width: 88, height: 88, borderRadius: "50%", background: c.gradientPrimary, boxShadow: "0 16px 34px -10px rgba(47,124,246,0.5)" }}>
            <Mic size={34} color="#fff" />
          </button>
          <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.lg, textAlign: "center" }}>بزن تا دوباره امتحان کنیم</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xl }}>
          <p style={{ fontSize: FS.display, fontWeight: FW.heavy, direction: "ltr", letterSpacing: "-0.02em" }}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p>

          <button onClick={stopRecording} className="press" style={{ marginTop: SP.lg, marginBottom: SP.lg, background: "none", border: "none", padding: 0 }}>
            <VoiceOrb c={c} level={level} state="listening" />
          </button>

          <p style={{ fontSize: FS.caption, color: c.muted }}>وقتی حرفت تموم شد، خودش می‌فهمه — یا روی دایره بزن تا تمومش کنی</p>
          <VoiceHintRotator c={c} />
        </div>
      )}

      {(phase === "transcribing" || phase === "extracting" || phase === "saving") && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xl }}>
          {transcript && phase !== "transcribing" && (
            <p className="flora-rise" style={{ fontSize: FS.body, color: c.ink, textAlign: "center", lineHeight: 1.9, marginBottom: SP.xl, opacity: 0.8 }}>«{transcript}»</p>
          )}
          <VoiceOrb c={c} state="thinking" />
          <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.lg }}>
            {phase === "transcribing" ? "در حال گوش دادن..." : phase === "extracting" ? "در حال فهمیدن منظورت..." : "در حال ذخیره..."}
          </p>
        </div>
      )}

      {phase === "clarify" && extracted && (
        <div className="flora-rise">
          <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.attnSoft, marginBottom: SP.md }}>
            <Sparkles size={15} color={c.attn} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: FS.body, color: c.ink, lineHeight: 1.8 }}>{extracted.clarify}</p>
          </div>
          <input style={inputStyle(c)} value={clarifyAnswer} onChange={(e) => setClarifyAnswer(e.target.value)} placeholder="جواب کوتاه بده..." />
          <SubmitBtn c={c} label="تایید و ادامه" disabled={!clarifyAnswer.trim()} onClick={confirmClarify} />
        </div>
      )}

      {phase === "review" && extracted && (
        <div className="flora-rise">
          <div className="flex items-start justify-between" style={{ gap: SP.sm, marginBottom: SP.lg }}>
            <p style={{ fontSize: FS.caption, color: c.muted, background: c.surface2, padding: SP.md, borderRadius: RAD.md, lineHeight: 1.9, flex: 1 }}>«{transcript}»</p>
            <button onClick={startRecording} className="press shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.surface2 }} title="دوباره ضبط کن"><Mic size={14} color={c.muted} /></button>
          </div>

          {/* quick-glance summary — everything at once, no scrolling through a form */}
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c), marginBottom: SP.lg }}>
            <div className="flex items-center" style={{ gap: SP.md, marginBottom: extracted.need || extracted.budget || extracted.meetingDate ? SP.md : 0 }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: "50%", background: c.primarySoft }}><UserCircle2 size={20} color={c.primary} /></div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: FS.subtitle, fontWeight: FW.bold }}>{extracted.customerName || "بدون نام"}</p>
                {extracted.callHappened && <p style={{ fontSize: FS.caption, color: c.success, marginTop: 1 }}>✓ تماس در تاریخچه ثبت می‌شود</p>}
              </div>
            </div>
            {extracted.meetingDate && (
              <div className="flex items-center" style={{ gap: SP.sm, marginTop: SP.sm, paddingTop: SP.sm, borderTop: `1px solid ${c.border}` }}>
                <CalendarDays size={15} color={c.attn} /><p style={{ fontSize: FS.caption + 0.5, color: c.ink }}>بازدید {fmtJalali(extracted.meetingDate)}{extracted.meetingTime ? ` — ساعت ${faDigits(extracted.meetingTime)}` : ""}</p>
              </div>
            )}
            {(extracted.need || extracted.budget > 0) && (
              <div className="flex items-center" style={{ gap: SP.sm, marginTop: SP.sm, paddingTop: extracted.meetingDate ? 0 : SP.sm, borderTop: extracted.meetingDate ? "none" : `1px solid ${c.border}` }}>
                <Tag size={15} color={c.purple} /><p style={{ fontSize: FS.caption + 0.5, color: c.ink }}>{[extracted.need, extracted.budget > 0 ? fmtBudgetShort(extracted.budget) : null].filter(Boolean).join(" · ")}</p>
              </div>
            )}
            {extracted.note && (
              <p style={{ fontSize: FS.caption, color: c.muted, marginTop: SP.md, lineHeight: 1.8 }}>{extracted.note}</p>
            )}
          </div>

          {extracted.nextAction && (
            <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.primarySoft, marginBottom: SP.lg }}>
              <Sparkles size={14} color={c.primary} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: FS.caption + 0.5, color: c.ink, lineHeight: 1.8 }}><b style={{ color: c.primary }}>پیشنهاد:</b> {extracted.nextAction}</p>
            </div>
          )}

          <SubmitBtn c={c} label="تایید و ذخیره" onClick={save} />
          <button onClick={() => setShowFullEdit((v) => !v)} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.md, paddingBlock: SP.sm }}>
            <span style={{ fontSize: FS.caption, color: c.muted, fontWeight: FW.medium }}>{showFullEdit ? "بستن ویرایش" : "چیزی اشتباه شنیده شد؟ ویرایش کن"}</span>
            <ChevronDown size={14} color={c.muted} style={{ transform: showFullEdit ? "rotate(180deg)" : "none", transition: "transform .3s" }} />
          </button>

          {showFullEdit && (
            <div className="flora-rise" style={{ marginTop: SP.md, padding: SP.lg, borderRadius: RAD.lg, background: c.surface2 }}>
              <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={extracted.customerName || ""} onChange={(e) => setExtracted({ ...extracted, customerName: e.target.value })} /></Field>
              <Field c={c} label="شماره تماس (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={extracted.phone || ""} onChange={(e) => setExtracted({ ...extracted, phone: e.target.value })} /></Field>
              <button onClick={() => setExtracted({ ...extracted, callHappened: !extracted.callHappened })} className="press w-full rounded-xl flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.sm, background: extracted.callHappened ? c.primarySoft : c.surface, marginBottom: SP.md }}>
                <PhoneCall size={13} color={extracted.callHappened ? c.primary : c.muted} /><span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: extracted.callHappened ? c.primary : c.muted }}>تماس ثبت شود</span>
              </button>
              <div className="flex" style={{ gap: SP.sm }}>
                <div style={{ flex: 1 }}><Field c={c} label="تاریخ بازدید"><JalaliDatePicker c={c} value={extracted.meetingDate || todayISO()} onChange={(iso) => setExtracted({ ...extracted, meetingDate: iso })} /></Field></div>
                <div style={{ width: 110 }}><Field c={c} label="ساعت"><input type="time" style={inputStyle(c)} value={extracted.meetingTime || "10:00"} onChange={(e) => setExtracted({ ...extracted, meetingTime: e.target.value })} /></Field></div>
              </div>
              <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={extracted.need || ""} onChange={(e) => setExtracted({ ...extracted, need: e.target.value })} /></Field>
              <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={extracted.budget || ""} onChange={(e) => setExtracted({ ...extracted, budget: toNum(e.target.value) })} /></Field>
              <Field c={c} label="یادداشت"><textarea style={{ ...inputStyle(c), minHeight: 70, resize: "none", lineHeight: 1.8 }} value={extracted.note || ""} onChange={(e) => setExtracted({ ...extracted, note: e.target.value })} /></Field>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center flora-rise" style={{ paddingBlock: SP.lg }}>
          <VoiceOrb c={c} state="success" />
          <div className="flex flex-col w-full" style={{ gap: SP.sm, marginTop: SP.xl, marginBottom: SP.xl }}>
            {savedItems.map((it, i) => (
              <div key={i} className="flex items-center" style={{ gap: SP.sm }}>
                <CheckCircle2 size={14} color={c.success} /><p style={{ fontSize: FS.caption + 0.5, color: c.ink }}>{it}</p>
              </div>
            ))}
            {savedItems.length === 0 && <p style={{ fontSize: FS.caption, color: c.muted, textAlign: "center" }}>یادداشت ثبت شد</p>}
          </div>
          <button onClick={() => { setShowFullEdit(false); setClarifyAnswer(""); startRecording(); }} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.lg, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1, marginBottom: SP.sm }}>
            <Mic size={16} color="#fff" />ویس بعدی
          </button>
          <button onClick={onClose} className="press w-full" style={{ paddingBlock: SP.md, borderRadius: RAD.lg, background: c.surface2, color: c.ink, fontWeight: FW.bold, fontSize: FS.body + 1 }}>تمام، برگرد به خانه</button>
        </div>
      )}
      </div>
    </div>
    </BodyPortal>
  );
}

function NextBestActionCard({ ctx }) {
  const { c, setFocusQueue } = ctx;
  const actions = useMemo(() => computeNextActions(ctx), [ctx.properties, ctx.customers, ctx.calls, ctx.appointments, ctx.deals]);
  const ICONS = { phone: PhoneCall, home: Home, tag: Tag, coin: Landmark };
  const [outcomes, setOutcomes] = useState({}); // { [key]: { result, next } } — read-only display here; Focus Mode writes it

  useEffect(() => {
    (async () => { try { const saved = await dbGet(NBA_KEY); if (saved?.date === todayISO()) setOutcomes(saved.map || {}); } catch (e) {} })();
  }, [ctx.focusQueue]); // reload whenever focus mode closes, to reflect what was just logged

  if (actions.length === 0) return null;
  const accent = c.primary;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.md, paddingRight: 2 }}>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>بهترین اقدام امروز</h2>
        <span style={{ fontSize: FS.caption, color: c.muted }}>{faDigits(actions.length)} پیشنهاد</span>
      </div>
      <div className="relative overflow-hidden" style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
        <span className="nba-blob" style={{ background: `radial-gradient(circle, #22d3ee, transparent)` }} />
        <div className="flex flex-col relative" style={{ gap: SP.md }}>
          {actions.map((a, i) => {
            const Icon = ICONS[a.icon] || Sparkles;
            const oc = outcomes[a.key];
            return (
              <div key={a.key} style={{ paddingTop: i === 0 ? 0 : SP.md, borderTop: i === 0 ? "none" : `1px solid ${c.border}` }}>
                <div className="flex items-center" style={{ gap: SP.md }}>
                  <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: RAD.md, background: oc?.result ? c.successSoft : c.primarySoft }}>
                    {oc?.result ? <CheckCircle2 size={19} color={c.success} /> : <Icon size={19} color={accent} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: FS.body + 1, fontWeight: FW.bold, lineHeight: 1.4, textDecoration: oc?.result ? "line-through" : "none", opacity: oc?.result ? 0.5 : 1 }}>{a.title}</p>
                    <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.7 }}>{oc?.result || a.reason}</p>
                  </div>
                  <button onClick={() => setFocusQueue({ actions, index: i })} className="press shrink-0" style={{ paddingInline: SP.lg, paddingBlock: 8, borderRadius: RAD.md, background: oc?.result ? c.surface2 : accent, color: oc?.result ? c.muted : "#fff", fontSize: FS.caption + 1, fontWeight: FW.bold }}>{oc?.result ? "دوباره" : "اجرا"}</button>
                </div>
                {oc?.next && (
                  <div className="flex items-start" style={{ gap: SP.sm, marginTop: SP.sm, marginRight: 52 }}>
                    <Sparkles size={13} color={c.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontSize: FS.caption, color: c.ink, lineHeight: 1.8 }}>{oc.next}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NbaOutcomePicker({ c, options, onSubmit, onCancel }) {
  const [sel, setSel] = useState("");
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.sm }}>
        <p style={{ fontSize: FS.caption, fontWeight: FW.bold }}>نتیجه چه شد؟</p>
        <button onClick={onCancel} style={{ fontSize: FS.caption, color: c.muted }}>بعداً</button>
      </div>
      <div className="flex flex-wrap" style={{ gap: SP.xs, marginBottom: SP.sm }}>
        {options.map((o) => { const active = sel === o; return (
          <button key={o} onClick={() => setSel(o)} className="press rounded-full" style={{ padding: `5px ${SP.md - 2}px`, fontSize: FS.caption, fontWeight: FW.medium, background: active ? c.primary : c.surface, color: active ? "#fff" : c.muted, border: `1px solid ${active ? c.primary : c.border}` }}>{o}</button>
        ); })}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح بیشتر (اختیاری)..." style={{ ...inputStyle(c), fontSize: FS.caption + 1, paddingBlock: 8, marginBottom: SP.sm }} />
      <button onClick={() => sel && onSubmit(sel, note)} disabled={!sel} className="press w-full" style={{ paddingBlock: 8, borderRadius: RAD.md, background: sel ? c.primary : c.surface, color: sel ? "#fff" : c.muted, fontSize: FS.caption + 1, fontWeight: FW.bold }}>ثبت و دریافت مرحله‌ی بعدی</button>
    </div>
  );
}

// Tappable profile photo — a shared default icon until the agent sets their own.
// Uses the same compressImage pipeline as property photos, since this one
// genuinely should stay small (it's rendered everywhere, not downloaded raw).
// Sarein's real street network, traced from an OpenStreetMap render of the town:
// the outer ring, the diamond of arterials inside it, and the north–south spine
// running down to the southern roundabout. It's used as a faint backdrop rather
// than a feature — the point is that an agent from Sarein recognises their own
// town without the app ever announcing it.
function SareinMap({ color, opacity = 1, strokeWidth = 1.1 }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" style={{ width: "100%", height: "100%", opacity }} aria-hidden="true">
      <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* western ring, running down the left flank */}
        <path d="M13 36 L10 40 L9 50 L10 62 L14 72 L20 82 L27 91 L34 97" />
        {/* northern arc into the north-east junction */}
        <path d="M13 36 L18 30 L26 25 L36 22 L46 24 L56 27 L66 26 L78 25 L90 28 L98 33" />
        {/* eastern flank coming back down to the southern roundabout */}
        <path d="M98 33 L92 40 L86 47 L84 56 L80 66 L72 76 L60 86 L46 94 L38 98" />
        {/* the central diamond — the arterials through town */}
        <path d="M30 44 L44 34 L58 40 L66 52 L58 66 L44 74 L32 64 L30 44 Z" />
        {/* north–south spine down to the roundabout */}
        <path d="M44 34 L46 20" />
        <path d="M44 74 L45 88 L46 94" />
        {/* eastern spur */}
        <path d="M66 52 L78 50 L86 47" />
        {/* western spur */}
        <path d="M30 44 L18 46 L9 50" />
      </g>
      {/* the roundabouts that anchor the network */}
      <g fill="none" stroke={color} strokeWidth={strokeWidth}>
        {[[44, 34], [66, 52], [44, 74], [46, 94], [13, 36], [98, 33]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" />
        ))}
      </g>
    </svg>
  );
}

function AgentAvatar({ ctx, size = 52 }) {
  const { c, agentPhoto, setAgentPhoto, notify } = ctx;
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setUploading(true);
    try { setAgentPhoto(await compressImage(file)); notify("عکس پروفایل ذخیره شد"); }
    catch (e) { notify("آپلود عکس با خطا مواجه شد"); }
    setUploading(false);
  };
  return (
    <button onClick={() => fileRef.current?.click()} className="press relative shrink-0" style={{ width: size, height: size, borderRadius: "50%" }}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {/* Neon pulse: a breathing glow ring sitting behind the photo. Uses the
          app's own accent instead of the reference's cyan so it reads as part
          of this product rather than a pasted-in effect. */}
      <span className="flora-neon-ring" style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `2px solid ${c.primary}`, pointerEvents: "none" }} />
      {agentPhoto ? (
        <img src={agentPhoto} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${c.border}`, position: "relative" }} />
      ) : (
        <div className="flex items-center justify-center relative" style={{ width: size, height: size, borderRadius: "50%", background: c.primarySoft, border: `2px solid ${c.border}` }}>
          <UserCircle2 size={Math.round(size * 0.6)} color={c.primary} />
        </div>
      )}
      <span className="flex items-center justify-center" style={{ position: "absolute", bottom: -2, left: -2, width: 20, height: 20, borderRadius: "50%", background: c.primary, border: `2px solid ${c.bg}`, zIndex: 2 }}>
        {uploading ? <Loader2 size={10} className="animate-spin" color="#fff" /> : <Camera size={10} color="#fff" />}
      </span>
      <style>{`
        @keyframes floraNeonPulse {
          0%, 100% { box-shadow: 0 0 4px ${c.primary}55, 0 0 8px ${c.primary}22; opacity: .55; }
          50%      { box-shadow: 0 0 14px ${c.primary}, 0 0 28px ${c.primary}88; opacity: 1; }
        }
        .flora-neon-ring { animation: floraNeonPulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .flora-neon-ring { animation: none; box-shadow: 0 0 10px ${c.primary}66; opacity: .8; }
        }
      `}</style>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Signature element: the agent's portfolio as a living skyline at dusk.
//
// Every tower is a real listing — height is its price relative to the largest,
// lit windows are its bedrooms, colour is its stage. The skyline's silhouette
// IS this agent's book of business, so it looks different for every user and
// changes as they work. That's what separates it from decoration.
//
// Triggered by IntersectionObserver (a one-shot "has it been seen" flag), then
// played entirely in CSS. Deliberately NOT scroll-position-linked: continuously
// mapping scroll offset to animation progress proved unreliable on iOS Safari
// inside this app's nested-scroll layout. A binary "is it visible" check is the
// one thing that works everywhere.
// ---------------------------------------------------------------------------
function BuildingScrollHero({ ctx }) {
  const { c, properties, customers, appointments, calls, setTab, goProperties, setDetail, agencyCity } = ctx;
  const wrapRef = useRef(null);
  const [seen, setSeen] = useState(false);

  const activeProps = properties.filter((p) => p.stage !== "فروخته شد").length;
  const todayAppts = appointments.filter((a) => a.date === todayISO()).length;
  const pendingCalls = calls.filter((cl) => cl.status !== "انجام‌شد").length;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // The card sits inside the app's own scrolling container, not the page.
    // IntersectionObserver watches the viewport by default, which either never
    // fires or fires wrongly in that setup — the root has to be that container.
    const findScrollRoot = (node) => {
      let n = node.parentElement;
      while (n && n !== document.body) {
        const oy = getComputedStyle(n).overflowY;
        if (oy === "auto" || oy === "scroll") return n;
        n = n.parentElement;
      }
      return null;
    };

    const isVisible = () => {
      const r = el.getBoundingClientRect();
      const root = findScrollRoot(el);
      const rb = root ? root.getBoundingClientRect() : null;
      // Clamp against BOTH the scroll container and the real screen. The
      // container can be taller than the viewport, so sitting inside it is not
      // the same as being on screen — checking only the container made this
      // fire while the card was still far below the fold.
      const top = Math.max(0, rb ? rb.top : 0);
      const bottom = Math.min(window.innerHeight, rb ? rb.bottom : window.innerHeight);
      return r.top < bottom - 40 && r.bottom > top;
    };

    if (isVisible()) { setSeen(true); return; }

    // A small poll rather than IntersectionObserver. The observer's root has to
    // be this app's scroll container, but that container is taller than the
    // screen — so it reports the card as "intersecting" while it's still far
    // below the fold, firing the animation before anyone can see it. Measuring
    // the rect against the real viewport is the only check that stays honest,
    // and at 200ms it costs nothing.
    const poll = setInterval(() => {
      if (isVisible()) { setSeen(true); clearInterval(poll); }
    }, 200);
    return () => clearInterval(poll);
  }, []);

  const towers = useMemo(() => {
    const src = properties.slice(0, 9);
    const maxPrice = Math.max(1, ...src.map((p) => p.price || 0));
    const built = src.map((p) => ({
      id: p.id,
      h: 30 + ((p.price || 0) / maxPrice) * 76,
      floors: Math.max(2, Math.min(5, p.rooms || 2)),
      tone: p.stage === "فروخته شد" ? c.success : p.stage === "در حال مذاکره" ? c.attn : c.primary,
    }));
    built.sort((a, b) => b.h - a.h);
    const arranged = [];
    built.forEach((t, i) => (i % 2 ? arranged.push(t) : arranged.unshift(t)));
    return arranged;
  }, [properties, c]);

  let winKey = 0;
  const on = seen ? " flora-sky-go" : "";

  return (
    <div ref={wrapRef} className="relative overflow-hidden" style={{ height: 212, borderRadius: RAD.lg, border: `1px solid ${c.border}`, background: c.surface }}>
      {/* dusk gradient */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${c.purple}26 0%, ${c.primary}16 46%, transparent 78%)` }} />

      {/* the town's own street map as the ground the towers stand on */}
      <div className="absolute" style={{ left: "8%", right: "8%", bottom: -14, height: 128, pointerEvents: "none", maskImage: "linear-gradient(0deg, #000 8%, transparent 78%)", WebkitMaskImage: "linear-gradient(0deg, #000 8%, transparent 78%)" }}>
        <SareinMap color={c.attn} opacity={0.2} strokeWidth={1.1} />
      </div>

      {/* stars — only meaningful once the sky darkens, so they fade in late */}
      {[[38,26],[92,18],[150,32],[232,22],[290,30],[330,16]].map(([x, y], i) => (
        <span key={i} className={"flora-sky-star" + on} style={{ position: "absolute", left: x, top: y, width: 2, height: 2, borderRadius: 999, background: "#fff", animationDelay: `${1.3 + i * 0.11}s` }} />
      ))}

      {/* sun, settling into the skyline */}
      <div className={"flora-sky-sun absolute" + on} style={{ top: 26, left: "50%", width: 44, height: 44, marginLeft: -22, borderRadius: "50%", background: `radial-gradient(circle, ${c.attn}cc, ${c.attn}22 62%, transparent 72%)` }} />

      {/* skyline — one tower per listing */}
      <div className="absolute flex items-end justify-center" style={{ left: 0, right: 0, bottom: 0, height: 152, gap: 4, paddingInline: SP.lg }}>
        {towers.map((t, i) => (
          <div key={t.id} className={"flora-sky-tower relative flex flex-col-reverse items-center" + on}
            style={{ width: 26, height: t.h, borderRadius: "3px 3px 0 0", background: `linear-gradient(180deg, ${t.tone}42, ${t.tone}14)`, borderTop: `2px solid ${t.tone}`, gap: 4, paddingBottom: 6, animationDelay: `${0.08 + i * 0.085}s` }}>
            {Array.from({ length: t.floors }).map((_, f) => (
              <span key={f} className={"flora-sky-win" + on} style={{ width: 12, height: 3.5, borderRadius: 1, background: c.attn, boxShadow: `0 0 6px ${c.attn}aa`, animationDelay: `${0.7 + winKey++ * 0.045}s` }} />
            ))}
          </div>
        ))}
        {towers.length === 0 && (
          <div className="flex items-end" style={{ gap: 4, opacity: 0.3 }}>
            {[32, 54, 42, 68, 46].map((h, i) => <div key={i} className={"flora-sky-tower" + on} style={{ width: 26, height: h, borderRadius: "3px 3px 0 0", background: c.surface2, borderTop: `2px solid ${c.border}`, animationDelay: `${0.08 + i * 0.085}s` }} />)}
          </div>
        )}
      </div>

      {/* reflection: a soft wash of the skyline's own colour on the ground */}
      <div className={"flora-sky-glow absolute" + on} style={{ left: SP.lg, right: SP.lg, bottom: 0, height: 26, background: `linear-gradient(0deg, ${c.primary}1f, transparent)` }} />
      <div className="absolute" style={{ left: SP.lg, right: SP.lg, bottom: 0, height: 1, background: c.border }} />

      {/* caption then figures — real HTML, so Persian shapes and joins correctly */}
      <div className={"flora-sky-caption absolute" + on} style={{ top: SP.lg, right: SP.lg }}>
        <p style={{ fontSize: 10, color: c.muted, letterSpacing: "0.14em" }}>{agencyCity || "سرعین"}</p>
        <p style={{ fontSize: FS.body, fontWeight: FW.bold, marginTop: 3 }}>{faDigits(towers.length)} فایل روی خط آسمان</p>
      </div>

      <div className={"flora-sky-stats absolute" + on} style={{ left: SP.lg, right: SP.lg, bottom: SP.lg }}>
        <div className="flex items-end justify-between">
          {[
            { v: activeProps, l: "فایل فعال", go: () => goProperties("فعال") },
            { v: customers.length, l: "مشتری", go: () => setTab("customers") },
            { v: todayAppts, l: "بازدید امروز", go: () => setTab("calendar") },
          ].map((s, i) => (
            <button key={i} onClick={s.go} className="press text-right">
              <p style={{ fontSize: 25, fontWeight: FW.heavy, letterSpacing: "-0.03em", lineHeight: 1, textShadow: `0 2px 12px ${c.bg}` }}>{faDigits(s.v)}</p>
              <p style={{ fontSize: 10, color: c.muted, marginTop: 3 }}>{s.l}</p>
            </button>
          ))}
          {pendingCalls > 0 && (
            <button onClick={() => setDetail({ type: "calls" })} className="press flex items-center" style={{ gap: 4 }}>
              <span className="flora-pulse" style={{ width: 5, height: 5, borderRadius: 999, background: c.attn }} />
              <span style={{ fontSize: 10, color: c.attn, fontWeight: FW.bold }}>{faDigits(pendingCalls)} تماس</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floraSkyRise { from { transform: scaleY(.06); opacity: .15; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes floraSkyWin  { from { opacity: 0; transform: scaleX(.4); } to { opacity: 1; transform: scaleX(1); } }
        @keyframes floraSkySun  { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes floraSkyFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floraSkyStar { from { opacity: 0; } to { opacity: .75; } }
        @keyframes floraSkyGlow { from { opacity: 0; } to { opacity: 1; } }
        /* Nothing animates until the card has actually been seen; before that
           every piece simply holds its start state. */
        .flora-sky-tower  { transform-origin: bottom; transform: scaleY(.06); opacity: .15; }
        .flora-sky-win    { opacity: 0; }
        .flora-sky-sun    { opacity: 0; }
        .flora-sky-star   { opacity: 0; }
        .flora-sky-glow   { opacity: 0; }
        .flora-sky-caption, .flora-sky-stats { opacity: 0; }
        .flora-sky-tower.flora-sky-go  { animation: floraSkyRise .8s cubic-bezier(.22,1,.36,1) both; }
        .flora-sky-win.flora-sky-go    { animation: floraSkyWin .4s ease both; }
        .flora-sky-sun.flora-sky-go    { animation: floraSkySun 1.1s cubic-bezier(.22,1,.36,1) both; }
        .flora-sky-star.flora-sky-go   { animation: floraSkyStar .8s ease both; }
        .flora-sky-glow.flora-sky-go   { animation: floraSkyGlow 1s ease .8s both; }
        .flora-sky-caption.flora-sky-go { animation: floraSkyFade .6s ease .15s both; }
        .flora-sky-stats.flora-sky-go   { animation: floraSkyFade .7s ease 1.1s both; }
        @media (prefers-reduced-motion: reduce) {
          .flora-sky-tower, .flora-sky-win, .flora-sky-sun, .flora-sky-star, .flora-sky-glow,
          .flora-sky-caption, .flora-sky-stats { animation: none !important; opacity: 1; transform: none; }
          .flora-sky-star { opacity: .75; }
        }
      `}</style>
    </div>
  );
}



// Big day number, small month name underneath — the "امروز" badge, sized to
// sit comfortably next to the avatar without crowding the greeting text.
// Big faded numeral + month, sitting on its own row above the greeting —
// reads as a soft date stamp rather than a bold focal element.
function DateBadge({ c }) {
  const [jy, jm, jd] = isoToJalali(todayISO());
  return (
    <div className="flex items-baseline justify-end" style={{ gap: SP.sm, opacity: 0.32 }}>
      <span style={{ fontSize: 15, fontWeight: FW.bold, color: c.ink }}>{MONTHS_FA[jm - 1]}</span>
      <span style={{ fontSize: 46, fontWeight: FW.heavy, color: c.ink, lineHeight: 1 }}>{faDigits(jd)}</span>
    </div>
  );
}


function HomeTab({ ctx }) {
  const { c, properties, setDetail, setTab, agentName, agencyCity, simpleMode, setSheet } = ctx;

  return (
    <div style={{ paddingTop: SP.xl }}>
      {/* Header. The city's own street map sits faintly behind it — an agent
          from Sarein recognises the shape without being told, and it turns dead
          space above the fold into something that belongs to them. */}
      <div className="relative" style={{ marginBottom: SP.xl, paddingInline: SP.xs }}>
        <div className="absolute" style={{ top: -18, left: -10, width: 150, height: 150, pointerEvents: "none", maskImage: "radial-gradient(circle at 40% 45%, #000 35%, transparent 72%)", WebkitMaskImage: "radial-gradient(circle at 40% 45%, #000 35%, transparent 72%)" }}>
          <SareinMap color={c.primary} opacity={0.16} strokeWidth={1.3} />
        </div>
        <div className="relative" style={{ marginBottom: SP.sm }}><DateBadge c={c} /></div>
        <div className="flex items-center justify-between relative">
          <div className="flex items-center" style={{ gap: SP.md }}>
            <AgentAvatar ctx={ctx} />
            <div>
              <p style={{ fontSize: FS.caption, color: c.muted }}>{greetingPhrase()}</p>
              <p style={{ fontSize: FS.hero, fontWeight: FW.heavy, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{agentName || "مشاور"}</p>
            </div>
          </div>
          <div className="text-left">
            <p style={{ fontSize: FS.caption, color: c.muted }}>موقعیت مکانی</p>
            <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{agencyCity || "سرعین"}</p>
          </div>
        </div>
      </div>

      {/* Live dollar/gold price — sits above Deal Coach so the day's market
          number is the very first thing the agent's eye lands on. */}
      <div><MarketWidget c={c} /></div>

      {/* Deal Coach — the single most personalized, data-driven "what do I
          do right now" on the page, right under the market glance. */}
      <div style={{ marginTop: SP.lg }}><NextBestActionCard ctx={ctx} /></div>

      {/* Ambient context — this week's obligations. */}
      <div style={{ marginTop: SP.sm }}><HomeInsightSlider ctx={ctx} /></div>

      {/* Quick tools — tour mode, Divar, and the AI rail used to be three
          separate full-width blocks stacked in a row, each shouting at the
          same volume. Grouping them under one heading (matching how every
          other screen in the app introduces a cluster of cards, e.g.
          FinanceCenterView) turns "a wall of cards" into "a section." */}
      <SectionHeader c={c} title="ابزارهای سریع" />
      <div className="flex flex-col" style={{ gap: SP.md }}>
        {/* Showing / Tour Mode entry point — the agent's most repeated
            real-world action (taking a customer to see several files) gets a
            one-tap door, right on the dashboard, instead of being buried
            inside a form. */}
        <TourEntryCard ctx={ctx} />

        {/* Direct door to divar.ir itself — same destination as the link
            inside the "جستجوی دیوار با AI" sheet, just promoted to the
            dashboard since it's the one agents reach for constantly, not only
            when diagnosing a specific ad. */}
        <a href="https://divar.ir" target="_blank" rel="noreferrer" className="press flex items-center w-full" style={{ gap: SP.md, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: RAD.md, background: "#1E7A4F1F" }}><DivarMark size={20} color="#1E7A4F" /></div>
          <div className="flex-1 text-right">
            <p style={{ fontSize: FS.body + 1, fontWeight: FW.bold, color: c.ink }}>ورود به وب دیوار</p>
            <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>باز کردن سایت دیوار در مرورگر</p>
          </div>
          <ChevronLeft size={18} color={c.muted} />
        </a>

        {/* Quick-launch tools. A horizontal rail rather than a grid: five tools
            in a 2-column grid leaves a lopsided half-empty last row, and the
            rail also means adding a sixth tool later doesn't reshuffle the
            layout. */}
        <div className="flex" style={{ gap: SP.md, overflowX: "auto", paddingBottom: SP.xs, scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}>
          <VoiceAssistantTile ctx={ctx} />
          <LegalTile ctx={ctx} />
          <DocumentsTile ctx={ctx} />
        </div>
      </div>

      {/* Primary action — the ONLY place the accent gradient appears */}
      {simpleMode && (
        <button onClick={() => setSheet("property")} className="press w-full flex items-center relative overflow-hidden" style={{ gap: SP.lg, padding: SP.xl, borderRadius: RAD.lg, marginTop: SP.xl, background: c.gradientPrimary, boxShadow: "0 16px 40px -8px rgba(47,124,246,0.45), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
          <span style={{ position: "absolute", top: "-60%", left: "-10%", width: 200, height: 200, background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)", pointerEvents: "none" }} />
          <div className="flex items-center justify-center shrink-0" style={{ width: 54, height: 54, borderRadius: RAD.md, background: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}><Plus size={28} color="#fff" strokeWidth={2.5} /></div>
          <div className="text-right flex-1" style={{ position: "relative" }}>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: "#fff" }}>ثبت فایل جدید</p>
            <p style={{ fontSize: FS.caption, color: "rgba(255,255,255,0.88)", marginTop: 2 }}>یک ملک جدید اضافه کن</p>
          </div>
          <ChevronLeft size={20} color="rgba(255,255,255,0.7)" style={{ position: "relative" }} />
        </button>
      )}

      {/* Portfolio — the skyline and the latest-files list are both "your
          files," so they're now one visual section (skyline leads into the
          list it's a picture of) instead of the skyline sitting between two
          unrelated blocks. */}
      <div style={{ marginTop: SP.xxl }}><BuildingScrollHero ctx={ctx} /></div>
      <div className="flex items-baseline justify-between" style={{ marginTop: SP.lg, marginBottom: SP.lg, paddingRight: 2 }}>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>جدیدترین فایل‌ها</h2>
        <button onClick={() => setTab("properties")} style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>همه ›</button>
      </div>
      <div className="flex flex-col" style={{ gap: SP.md, marginBottom: SP.xxl }}>
        {properties.slice(0, simpleMode ? 3 : 2).map((p) => <PropertyMiniCard key={p.id} p={p} c={c} onClick={() => setDetail({ type: "property", id: p.id })} />)}
        {properties.length === 0 && <EmptyLine c={c} text="هنوز فایلی ثبت نکردی — از تب «فایل‌ها» یا با صدات اضافه کن" />}
      </div>
    </div>
  );
}

// Compact, auto-rotating stat widget. Every face is either a live number from
// real data or a genuinely computed trend (own-portfolio price change, most-active
// streets) — never an invented market figure. A short AI caption is generated once
// a day (cached, not re-called on every rotation) to add color to the real numbers.
function MomentumCard({ ctx }) {
  const { c, properties, appointments, calls, agencyCity, hasAiKey, callAI } = ctx;
  const [streak, setStreak] = useState({ count: 0, lastDate: "" });
  const [face, setFace] = useState(0);
  const [aiCaption, setAiCaption] = useState("");
  useEffect(() => { (async () => { try { const s = await dbGet(STREAK_KEY); if (s) setStreak(s); } catch (e) {} })(); }, []);
  useEffect(() => { const t = setInterval(() => setFace((f) => (f + 1) % 4), 4500); return () => clearInterval(t); }, []);

  const countFor = (iso) =>
    appointments.filter((a) => a.date === iso).length +
    calls.filter((cl) => cl.date === iso).length +
    properties.filter((p) => p.createdAt && p.createdAt.slice(0, 10) === iso).length;
  const dayCounts = Array.from({ length: 7 }, (_, i) => countFor(daysAgoISO(6 - i).slice(0, 10)));
  const thisWeekTotal = dayCounts.reduce((a, b) => a + b, 0);
  const prevWeekTotal = Array.from({ length: 7 }, (_, i) => daysAgoISO(13 - i).slice(0, 10)).reduce((sum, iso) => sum + countFor(iso), 0);
  const maxCount = Math.max(1, ...dayCounts);
  const pct = prevWeekTotal > 0 ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : (thisWeekTotal > 0 ? 100 : 0);
  const weekTone = thisWeekTotal === 0 ? c.attn : pct >= 0 ? c.success : c.primary;

  const activeList = properties.filter((p) => p.stage !== "فروخته شد");
  const totalValue = activeList.reduce((s, p) => s + (p.price || 0), 0);

  // Real 3-month price trend from the agent's OWN listing history (not an
  // invented market index) — average price/m² of recently-added files vs files
  // added around three months ago.
  const priced = (from, to) => properties.filter((p) => p.pricePerMeter > 0 && p.createdAt && daysSince(p.createdAt) >= from && daysSince(p.createdAt) <= to);
  const recentSet = priced(0, 30), pastSet = priced(75, 120);
  const avg = (arr) => arr.length ? arr.reduce((s, p) => s + p.pricePerMeter, 0) / arr.length : 0;
  const recentAvg = avg(recentSet), pastAvg = avg(pastSet);
  const growthPct = pastAvg > 0 ? Math.round(((recentAvg - pastAvg) / pastAvg) * 100) : null;
  const growthTone = growthPct === null ? c.muted : growthPct >= 0 ? c.success : c.danger;

  // Which street/area has the most active listings right now — parsed from the
  // free-text address field, so it's a real read on where the agent's own
  // inventory is concentrated.
  const streetCounts = {};
  activeList.forEach((p) => {
    const seg = (p.address || "").split(/[،,]/)[0].trim();
    if (seg && seg.length > 2) streetCounts[seg] = (streetCounts[seg] || 0) + 1;
  });
  const topStreets = Object.entries(streetCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxStreet = Math.max(1, ...topStreets.map((s) => s[1]));

  // One AI caption per day, grounded in the real numbers above — cached so the
  // auto-rotating widget never fires repeated API calls on its own.
  useEffect(() => {
    (async () => {
      if (!hasAiKey) return;
      try {
        const cached = await dbGet(MARKET_INSIGHT_KEY);
        if (cached?.date === todayISO()) { setAiCaption(cached.text); return; }
      } catch (e) {}
      try {
        const prompt = `تو دستیار یک مشاور املاک در ${agencyCity || "سرعین"} هستی. بر اساس این داده‌ی واقعی از فایل‌های خودِ مشاور، یک جمله‌ی کوتاه (حداکثر ۱۲ کلمه)، طبیعی و مفید بنویس — نه تبلیغاتی:
تغییر میانگین قیمت هر متر نسبت به ۳ ماه پیش: ${growthPct === null ? "داده‌ی کافی نیست" : `${growthPct}%`}
پرتقاضاترین محله بر اساس تعداد فایل فعال: ${topStreets[0] ? topStreets[0][0] : "نامشخص"}
فقط همان یک جمله را برگردان، بدون گیومه و بدون توضیح اضافه.`;
        const text = await callAI(prompt);
        const clean = text.trim().replace(/^"|"$/g, "");
        setAiCaption(clean);
        dbSet(MARKET_INSIGHT_KEY, { date: todayISO(), text: clean }).catch(() => {});
      } catch (e) {}
    })();
  }, [hasAiKey]); // eslint-disable-line

  const FACES = [
    { label: "روند این هفته", icon: TrendingUp, tone: weekTone },
    { label: "ارزش فایل‌های فعال", icon: Building2, tone: c.purple },
    { label: `رشد قیمت ${agencyCity || "سرعین"} — ۳ ماه`, icon: growthTone === c.danger ? TrendingDown : TrendingUp, tone: growthTone },
    { label: "خیابان‌های داغ", icon: MapPin, tone: c.attn },
  ];
  const f = FACES[face];

  // compact sparkline geometry for face 0
  const W = 280, H = 32, PAD = 4;
  const pts = dayCounts.map((n, i) => [(i / 6) * W, H - PAD - (n / maxCount) * (H - PAD * 2)]);
  let linePath = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; linePath += ` Q ${x0} ${y0}, ${(x0 + x1) / 2} ${(y0 + y1) / 2}`; }
  linePath += ` T ${pts[6][0]} ${pts[6][1]}`;
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

  // ring gauge geometry for the growth face
  const R = 22, CIRC = 2 * Math.PI * R;
  const ringFrac = growthPct === null ? 0 : Math.min(1, Math.abs(growthPct) / 20); // 20%+ reads as "full"

  return (
    <div className="rounded-2xl relative overflow-hidden flora-rise" style={{ padding: SP.md + 2, ...glass(c), background: `linear-gradient(160deg, ${f.tone}1a, ${c.surface} 60%)` }}>
      <span style={{ position: "absolute", top: "-40%", left: "-15%", width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle, ${f.tone}22, transparent 70%)`, pointerEvents: "none" }} />
      <div className="flex items-center justify-between relative" style={{ marginBottom: 10 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <f.icon size={13} color={f.tone} />
          <span style={{ fontSize: 11, color: c.muted, letterSpacing: ".02em" }}>{f.label}</span>
        </div>
        {streak.count > 1 && (
          <div className="flex items-center" style={{ gap: 4, background: c.attnSoft, padding: "3px 8px", borderRadius: RAD.pill }}>
            <Flame size={11} color={c.attn} /><span style={{ fontSize: 11, fontWeight: FW.heavy, color: c.attn }}>{faDigits(streak.count)}</span>
          </div>
        )}
      </div>

      <div key={face} className="relative flora-rise" style={{ minHeight: 44 }}>
        {face === 0 && (
          <>
            <div className="flex items-baseline" style={{ gap: 8, marginBottom: 6 }}>
              <CountUpNum value={thisWeekTotal} style={{ fontSize: 20, fontWeight: FW.heavy, color: c.ink }} />
              <span style={{ fontSize: 11, color: c.muted }}>فعالیت</span>
              {prevWeekTotal > 0 && <span style={{ fontSize: 11, fontWeight: FW.bold, color: weekTone }}>{pct >= 0 ? "↑" : "↓"} {faDigits(Math.abs(pct))}٪</span>}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
              <defs><linearGradient id="momentumFillMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={weekTone} stopOpacity="0.3" /><stop offset="100%" stopColor={weekTone} stopOpacity="0" /></linearGradient></defs>
              <path d={areaPath} fill="url(#momentumFillMini)" style={{ opacity: 0, animation: "floraChartFade .9s ease forwards .5s" }} />
              <path d={linePath} fill="none" stroke={weekTone} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 400, strokeDashoffset: 400, animation: "floraChartDraw 1s cubic-bezier(.22,1,.36,1) forwards .1s" }} />
              <circle cx={pts[6][0]} cy={pts[6][1]} r="3.5" fill={weekTone} stroke={c.bg} strokeWidth="1.5" style={{ opacity: 0, animation: "floraChartFade .4s ease forwards 1s" }} />
            </svg>
          </>
        )}

        {face === 1 && (
          <div>
            <CountUpToman value={totalValue} style={{ fontSize: 20, fontWeight: FW.heavy, color: c.ink, direction: "ltr", display: "block", textAlign: "right" }} />
            <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{faDigits(activeList.length)} فایل فعال</p>
          </div>
        )}

        {face === 2 && (
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={R} fill="none" stroke={c.border} strokeWidth="5" />
                <circle cx="28" cy="28" r={R} fill="none" stroke={growthTone} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 28 28)"
                  style={{ animation: `floraRingFill 1.2s cubic-bezier(.22,1,.36,1) forwards .1s`, "--ring-target": CIRC * (1 - ringFrac) }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {growthPct === null ? <span style={{ fontSize: 10, color: c.muted }}>—</span> : <span style={{ fontSize: 13, fontWeight: FW.heavy, color: growthTone }}>{growthPct >= 0 ? "+" : ""}{faDigits(growthPct)}٪</span>}
              </div>
            </div>
            <p style={{ fontSize: 11, color: c.ink, lineHeight: 1.8, flex: 1 }}>{growthPct === null ? "هنوز داده‌ی سه‌ماه‌قبل کافی نیست" : aiCaption || `نسبت به ۳ ماه پیش، میانگین قیمت هر متر در فایل‌های تو ${growthPct >= 0 ? "رشد" : "افت"} کرده`}</p>
          </div>
        )}

        {face === 3 && (
          <div>
            {topStreets.length === 0 && <p style={{ fontSize: 11, color: c.muted }}>هنوز آدرسی برای مقایسه ثبت نشده</p>}
            <div className="flex flex-col" style={{ gap: 8 }}>
              {topStreets.map(([name, n], i) => (
                <div key={name} className="flex items-center" style={{ gap: 8 }}>
                  <span style={{ fontSize: 11, color: c.ink, width: 74, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>{name}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: c.surface2, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 999, background: c.attn, width: `${(n / maxStreet) * 100}%`, transform: "scaleX(0)", transformOrigin: "right", animation: `floraBarGrowX .6s cubic-bezier(.22,1,.36,1) forwards ${0.1 * i}s` }} />
                  </div>
                  <span style={{ fontSize: 10, color: c.muted, flexShrink: 0 }}>{faDigits(n)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center relative" style={{ gap: 4, marginTop: 12 }}>
        {FACES.map((_, i) => (
          <button key={i} onClick={() => setFace(i)} style={{ width: i === face ? 14 : 5, height: 5, borderRadius: 999, background: i === face ? f.tone : c.border, transition: "all .3s ease" }} />
        ))}
      </div>
      <style>{`
        @keyframes floraChartDraw { to { stroke-dashoffset: 0; } }
        @keyframes floraChartFade { to { opacity: 1; } }
        @keyframes floraRingFill { to { stroke-dashoffset: var(--ring-target); } }
        @keyframes floraBarGrowX { to { transform: scaleX(1); } }
      `}</style>
    </div>
  );
}


function ActivityApptRow({ a, ctx, showDelete }) {
  const { c, properties, setAppointments, scheduleReminder, notify } = ctx;
  const p = properties.find((x) => x.id === a.propertyId);
  const rm = a.rating ? ratingMeta(c)[a.rating] : null;
  return (
    <div className="rounded-lg p-3 flex items-center gap-2.5" style={glassLite(c, 22)}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: rm ? rm.soft : c.primarySoft }}>
        {rm ? <rm.icon size={14} color={rm.color} /> : <CalendarDays size={14} color={c.primary} />}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.title || a.customerName || "بازدید"}{a.tourId ? " · تور" : ""}</p>
        <p style={{ fontSize: 11, color: c.muted }}>{a.customerName ? `با ${a.customerName} · ` : ""}{fmtJalali(a.date)}{rm ? ` · ${rm.label}` : ""}</p>
        {a.notes && a.tourId && <p style={{ fontSize: 11, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>{a.notes}</p>}
      </div>
      <input type="time" value={a.time} onChange={(e) => setAppointments((prev) => prev.map((x) => x.id === a.id ? { ...x, time: e.target.value } : x))}
        style={{ background: c.surface2, border: "none", borderRadius: 8, padding: "5px 7px", fontSize: 11, color: c.ink, width: 72 }} />
      <button onClick={() => scheduleReminder(a, p?.title)} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.attnSoft }}><Bell size={14} color={c.attn} /></button>
      {showDelete && (
        <button onClick={() => { setAppointments((prev) => prev.filter((x) => x.id !== a.id)); notify("بازدید حذف شد"); }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={14} color={c.danger} /></button>
      )}
    </div>
  );
}
function PropertyMiniCard({ p, c, onClick }) {
  const cover = p.media && p.media[0]; const Icon = typeIcon(p.type); const sold = p.stage === "فروخته شد";
  return (
    <button onClick={onClick} className="press w-full text-right flex items-center" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, ...glassLite(c, RAD.md), opacity: sold ? 0.5 : 1 }}>
      <div className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 56, height: 56, borderRadius: RAD.md, background: cover ? c.primarySoft : `linear-gradient(140deg, ${c.primarySoft}, ${c.purpleSoft})` }}>
        {cover ? (cover.type === "image" ? <MediaThumb item={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <Icon size={22} color={c.primary} />}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: FS.body, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: sold ? "line-through" : "none" }}>{p.title}</p>
        <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: c.primary, direction: "ltr", textAlign: "right", marginTop: 3, letterSpacing: "-0.01em" }}>{fmtToman(p.price)}</p>
        <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{faDigits(p.area)} متر{p.rooms ? ` · ${faDigits(p.rooms)} خواب` : ""}</p>
      </div>
      <StageBadge c={c} stage={p.stage} />
    </button>
  );
}

// ---------- Properties tab: big list + pipeline ----------
const SORT_OPTIONS = [
  { key: "newest", label: "جدیدترین" },
  { key: "oldest", label: "قدیمی‌ترین" },
  { key: "cheapest", label: "ارزان‌ترین" },
  { key: "priciest", label: "گران‌ترین" },
  { key: "largest", label: "بیشترین متراژ" },
  { key: "smallest", label: "کمترین متراژ" },
];
function sortProperties(list, sortKey) {
  const sorted = [...list];
  switch (sortKey) {
    case "oldest": return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case "cheapest": return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    case "priciest": return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    case "largest": return sorted.sort((a, b) => (b.area || 0) - (a.area || 0));
    case "smallest": return sorted.sort((a, b) => (a.area || 0) - (b.area || 0));
    case "newest": default: return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

function PropertiesTab({ ctx, search, setSearch, stageHint }) {
  const { c, properties, owners, setDetail, customerMode, setCustomerMode, showCustomerPrice, setShowCustomerPrice } = ctx;
  const [mode, setMode] = useState("list");
  const [dealFilter, setDealFilter] = useState("همه");
  const [typeFilter, setTypeFilter] = useState("همه");
  const [stageFilter, setStageFilter] = useState(stageHint || "همه");
  const [sortKey, setSortKey] = useState("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState(null); // only one accordion section open at a time

  const filtered = useMemo(() => {
    let out = properties;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((p) => {
        if (Object.values(p).some((v) => String(v).toLowerCase().includes(q))) return true;
        const owner = owners.find((o) => o.id === p.ownerId);
        return owner && (owner.name?.toLowerCase().includes(q) || owner.phone?.includes(q));
      });
    }
    if (dealFilter !== "همه") out = out.filter((p) => p.deal === dealFilter);
    if (typeFilter !== "همه") out = out.filter((p) => p.type === typeFilter);
    if (stageFilter !== "همه") out = out.filter((p) => p.stage === stageFilter);
    return out;
  }, [properties, owners, search, dealFilter, typeFilter, stageFilter]);

  // Grouped by size category regardless of view mode — pipeline/map still
  // want the flat sorted list, only "list" mode renders as an accordion.
  const grouped = useMemo(() => {
    const byKey = Object.fromEntries(SIZE_CATEGORIES.map((cat) => [cat.key, []]));
    for (const p of filtered) byKey[sizeCategoryOf(p.area).key].push(p);
    for (const key of Object.keys(byKey)) byKey[key] = sortProperties(byKey[key], sortKey);
    return byKey;
  }, [filtered, sortKey]);

  const flatSorted = useMemo(() => sortProperties(filtered, sortKey), [filtered, sortKey]);

  return (
    <div className="pt-4">
      {/* Advisor / Customer mode switch — this is the ONLY difference
          Customer Mode makes: the exact same grid/accordion/detail screens,
          just with price hidden (or shown +3M/meter when revealed). No
          separate presentation screen, per explicit correction from the
          original spec. */}
      <div className="flex items-center rounded-full p-1 mb-2" style={glass(c)}>
        <button onClick={() => setCustomerMode(false)} className="press flex-1 flex items-center justify-center gap-1.5 rounded-full py-2" style={{ background: !customerMode ? c.primary : "transparent" }}>
          <UserCircle2 size={13} color={!customerMode ? "#fff" : c.muted} /><span style={{ fontSize: 12, fontWeight: 700, color: !customerMode ? "#fff" : c.muted }}>حالت مشاور</span>
        </button>
        <button onClick={() => setCustomerMode(true)} className="press flex-1 flex items-center justify-center gap-1.5 rounded-full py-2" style={{ background: customerMode ? c.primary : "transparent" }}>
          <Users size={13} color={customerMode ? "#fff" : c.muted} /><span style={{ fontSize: 12, fontWeight: 700, color: customerMode ? "#fff" : c.muted }}>حالت مشتری</span>
        </button>
      </div>
      {customerMode && (
        <button onClick={() => setShowCustomerPrice((v) => !v)} className="press flex items-center gap-1.5 mb-4" style={{ fontSize: 12, color: c.muted }}>
          <div style={{ width: 30, height: 17, borderRadius: 999, background: showCustomerPrice ? c.success : c.surface2, position: "relative", transition: "background .2s" }}>
            <div style={{ position: "absolute", top: 2, [showCustomerPrice ? "left" : "right"]: 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "all .2s" }} />
          </div>
          نمایش قیمت به مشتری
        </button>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center rounded-full p-1 gap-1" style={glass(c)}>
          <button onClick={() => setMode("list")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "list" ? c.primary : "transparent" }}><LayoutGrid size={13} color={mode === "list" ? "#fff" : c.muted} /></button>
          <button onClick={() => setMode("pipeline")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "pipeline" ? c.primary : "transparent" }}><Columns3 size={13} color={mode === "pipeline" ? "#fff" : c.muted} /></button>
          <button onClick={() => setMode("map")} className="press flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: mode === "map" ? c.primary : "transparent" }}><MapPin size={13} color={mode === "map" ? "#fff" : c.muted} /></button>
        </div>
        <div className="relative mr-auto">
          <button onClick={() => setSortMenuOpen((s) => !s)} className="press flex items-center gap-1.5 rounded-full px-3 py-2" style={glass(c)}>
            <ArrowUpDown size={12} color={c.primary} /><span style={{ fontSize: 11, fontWeight: 700, color: c.primary, whiteSpace: "nowrap" }}>{SORT_OPTIONS.find((s) => s.key === sortKey).label}</span>
          </button>
          {sortMenuOpen && (
            <div className="absolute left-0 z-20 rounded-xl overflow-hidden" style={{ top: "110%", minWidth: 150, ...glass(c), boxShadow: c.shadow }}>
              {SORT_OPTIONS.map((s) => (
                <button key={s.key} onClick={() => { setSortKey(s.key); setSortMenuOpen(false); }} className="press w-full text-right px-3 py-2.5" style={{ fontSize: 12, fontWeight: s.key === sortKey ? 700 : 500, color: s.key === sortKey ? c.primary : c.ink, background: s.key === sortKey ? c.primarySoft : "transparent" }}>{s.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {DEAL_FILTERS.map((d) => { const active = dealFilter === d; return <button key={d} onClick={() => setDealFilter(d)} className="press shrink-0 rounded-full px-3 py-1.5" style={active ? { background: c.primary } : glass(c)}><span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{d}</span></button>; })}
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((t) => { const active = typeFilter === t; return <button key={t} onClick={() => setTypeFilter(t)} className="press shrink-0 rounded-full px-3 py-1.5 flex items-center gap-1" style={active ? { background: c.purple } : glass(c)}><span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{t}</span></button>; })}
      </div>

      {mode === "list" ? (
        <div className="pb-4 flex flex-col gap-3">
          {(() => {
            const totalCount = properties.length || 1;
            const accentColors = [c.primary, c.purple, c.attn, c.success];
            const iconSizes = [17, 21, 25, 29];
            return SIZE_CATEGORIES.map((cat, idx) => {
              const items = grouped[cat.key];
              const isOpen = openCategory === cat.key;
              const accent = accentColors[idx % accentColors.length];
              const pct = Math.round((items.length / totalCount) * 100);
              return (
                <div key={cat.key} className="rounded-2xl overflow-hidden relative" style={{ ...glass(c), border: isOpen ? `1.5px solid ${accent}66` : "1px solid transparent", boxShadow: isOpen ? `0 8px 24px -12px ${accent}55` : "none", transition: "border .25s, box-shadow .25s" }}>
                  <button onClick={() => setOpenCategory(isOpen ? null : cat.key)} className="press w-full flex items-center justify-between px-4" style={{ paddingBlock: 15 }}>
                    <div className="flex items-center" style={{ gap: SP.md }}>
                      {/* Icon grows across the four tiers — a size metaphor
                          instead of a generic identical glyph on every card. */}
                      <div className="flex items-center justify-center shrink-0 relative" style={{ width: 44, height: 44, borderRadius: RAD.md, background: `linear-gradient(150deg, ${accent}2e, ${accent}14)` }}>
                        <Home size={iconSizes[idx]} color={accent} className={isOpen ? "flora-float" : ""} />
                      </div>
                      <div className="text-right">
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{cat.label}</span>
                        {/* Share of the total file count, filled in on open —
                            a quiet extra signal beyond the raw count. */}
                        <div style={{ width: 64, height: 3, borderRadius: 2, background: c.surface2, marginTop: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 2, transition: "width .7s cubic-bezier(.22,1,.36,1)" }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: 10 }}>
                      <CountUpNum value={items.length} style={{ fontSize: 24, fontWeight: 800, color: accent, fontVariantNumeric: "tabular-nums", minWidth: 20, textAlign: "center", display: "inline-block" }} />
                      <ChevronDown size={15} color={c.muted} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .25s" }} />
                    </div>
                  </button>
                  {/* A closed accordion never renders its (potentially long) card
                      list — only mounted once opened, matching the spec's own
                      performance requirement without needing a separate
                      virtualization library for what's normally a modest count
                      per size bracket. */}
                  {isOpen && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-3 flora-stagger" style={{ borderTop: `1px solid ${c.border}` }}>
                      {items.length === 0 ? (
                        <div className="col-span-2" style={{ paddingTop: 12 }}><EmptyLine c={c} text="فایلی در این دسته نیست" /></div>
                      ) : items.map((p) => <PropertyGridCard key={p.id} p={p} ctx={ctx} onClick={() => setDetail({ type: "property", id: p.id })} />)}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      ) : mode === "map" ? (
        <AllPropertiesMap c={c} rows={flatSorted} onOpen={(id) => setDetail({ type: "property", id })} />
      ) : (
        <PipelineBoard rows={flatSorted} ctx={ctx} />
      )}
    </div>
  );
}


// Every pinned property on one Sarein map. Markers are colour-coded by deal type and
// tapping one opens that file.
// Anything interpolated into raw HTML (like Leaflet's bindPopup below,
// which renders a plain string as markup, not React) has to be escaped —
// a property title isn't always agent-typed; Divar imports pull it from an
// external page, so it's untrusted text as far as this string goes.
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function AllPropertiesMap({ c, rows, onOpen }) {
  const ref = useRef(null); const objRef = useRef(null);
  const pinned = rows.filter((p) => p.lat && p.lng);
  const DEAL_COLOR = { "فروش": "#2f7cf6", "پیش‌فروش": "#7c6ff5" };

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      if (objRef.current) { objRef.current.remove(); objRef.current = null; }
      const map = L.map(ref.current, { zoomControl: false, attributionControl: false }).setView(SAREIN_CENTER, 14);
      L.tileLayer(DARK_TILE_URL, { attribution: "", maxZoom: 20, maxNativeZoom: 16 }).addTo(map);

      pinned.forEach((p) => {
        const color = DEAL_COLOR[p.deal] || "#2f7cf6";
        const sold = p.stage === "فروخته شد";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 2px;transform:rotate(45deg);background:${sold ? "#6b7280" : color};box-shadow:0 3px 8px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.85);"></div>`,
          iconSize: [26, 26], iconAnchor: [13, 26],
        });
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(`<div style="font-family:Vazirmatn,sans-serif;direction:rtl;text-align:right;min-width:130px">
          <b style="font-size:12px">${escapeHtml(p.title)}</b><br/>
          <span style="font-size:11px;color:#2f7cf6;direction:ltr;display:inline-block">${(p.price || 0).toLocaleString("de-DE")} تومان</span><br/>
          <span style="font-size:10px;color:#666">${escapeHtml(p.deal)} · ${escapeHtml(p.area)} متر</span>
        </div>`);
        m.on("popupopen", () => {
          const el = document.querySelector(".leaflet-popup-content");
          if (el) el.style.cursor = "pointer";
          if (el) el.onclick = () => onOpen(p.id);
        });
      });

      if (pinned.length > 1) map.fitBounds(pinned.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 16 });
      else if (pinned.length === 1) map.setView([pinned[0].lat, pinned[0].lng], 15);
      objRef.current = map;
      setTimeout(() => map.invalidateSize(), 120);
    });
    return () => { cancelled = true; if (objRef.current) { objRef.current.remove(); objRef.current = null; } };
  }, [rows.length, pinned.length]);

  return (
    <div className="pb-4">
      <div className="rounded-2xl overflow-hidden flora-dark-map" style={glass(c)}>
        <div ref={ref} style={{ width: "100%", height: 420, background: c.surface2 }} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {Object.entries(DEAL_COLOR).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: c.surface2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: v }} />
            <span style={{ fontSize: 10, color: c.muted }}>{k}</span>
          </span>
        ))}
      </div>
      {pinned.length < rows.length && (
        <p style={{ fontSize: 11, color: c.muted, marginTop: 10, lineHeight: 1.8 }}>
          {faDigits(rows.length - pinned.length)} فایل روی نقشه نیست، چون موقعیتشان ثبت نشده. برای افزودن، فایل را ویرایش کن و از دکمه‌ی نقشه استفاده کن.
        </p>
      )}
      {pinned.length === 0 && <EmptyLine c={c} text="هیچ فایلی موقعیت نقشه ندارد" />}
    </div>
  );
}

// Pulls the dominant color out of a cover photo so each card's bottom gradient is
// tinted by its own image (the signature look of the reference design). Samples
// directly from the <img> already on screen — a separate hidden Image() used to
// be created just for sampling, which meant every photo decoded twice.
const domColorCache = new Map();
function sampleDominantColor(imgEl, url) {
  if (domColorCache.has(url)) return domColorCache.get(url);
  try {
    const S = 12; // tiny sample — enough for an average, costs nothing
    const cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(imgEl, 0, 0, S, S);
    const d = cx.getImageData(0, 0, S, S).data;
    let r = 0, g = 0, b = 0, n = 0;
    // Sample the lower half — that's what sits behind the gradient/text.
    for (let i = Math.floor(d.length / 2); i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const out = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    domColorCache.set(url, out);
    return out;
  } catch (e) { return null; } // falls back to a neutral gradient
}

function PropertyGridCard({ p, ctx, onClick }) {
  const { c } = ctx;
  const cover = p.media && p.media[0];
  const Icon = typeIcon(p.type);
  const sold = p.stage === "فروخته شد";
  const url = cover && cover.type === "image" ? (cover.thumbnailPath || cover.storagePath || cover.url) : null;
  const [rgb, setRgb] = useState(() => (url ? domColorCache.get(url) : null) || null);
  useEffect(() => { if (url && domColorCache.has(url)) setRgb(domColorCache.get(url)); }, [url]);
  // Deepen the sampled color so white text always clears contrast, then fade it out.
  const tint = rgb ? `${Math.round(rgb[0] * 0.55)}, ${Math.round(rgb[1] * 0.55)}, ${Math.round(rgb[2] * 0.55)}` : "18, 24, 38";

  const Chip = ({ children }) => (
    <span className="flex items-center" style={{ gap: 4, fontSize: 11, fontWeight: FW.medium, color: "#fff", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "4px 9px", borderRadius: RAD.pill, whiteSpace: "nowrap" }}>{children}</span>
  );

  return (
    <button onClick={onClick} className="press text-right relative overflow-hidden" style={{ borderRadius: 22, aspectRatio: "3 / 4", background: c.surface2 }}>
      {/* full-bleed photo — lazy-loaded so offscreen cards don't decode until near view */}
      {cover ? (
        cover.type === "image"
          ? <MediaThumb item={cover} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onLoad={(e) => { if (url && !domColorCache.has(url)) setRgb(sampleDominantColor(e.currentTarget, url)); }} />
          : <video src={cover.url} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(150deg, ${c.primarySoft}, ${c.purpleSoft})` }}>
          <Icon size={34} color={c.primary} className="flora-float" style={{ opacity: 0.5 }} />
        </div>
      )}

      {/* bottom gradient, tinted by the photo's own dominant color */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(${tint},0.96) 0%, rgba(${tint},0.82) 26%, rgba(${tint},0.30) 52%, transparent 72%)`, transition: "background .5s ease" }} />

      {/* price pill (top-right in RTL) — hidden entirely in customer mode
          unless the agent has explicitly revealed it, and even then this is
          never the real number (see getPriceForDisplay). */}
      {(() => {
        const priceInfo = getPriceForDisplay({ realPrice: p.price, realPricePerMeter: p.pricePerMeter, area: p.area, customerMode: ctx.customerMode, showCustomerPrice: ctx.showCustomerPrice });
        if (!priceInfo.visible) return null;
        return <span className="absolute" style={{ top: 10, right: 10, fontSize: 11, fontWeight: FW.heavy, color: "#fff", background: "rgba(20,26,40,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", padding: "6px 12px", borderRadius: RAD.pill, direction: "ltr" }}>{fmtBudgetShort(priceInfo.price)}</span>;
      })()}

      {/* content over the gradient */}
      <div className="absolute" style={{ bottom: 0, right: 0, left: 0, padding: 12 }}>
        <p style={{ fontSize: 15, fontWeight: FW.heavy, color: "#fff", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</p>
        <div className="flex items-center" style={{ gap: 4, marginTop: 4 }}>
          <Ruler size={11} color="rgba(255,255,255,0.75)" />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.82)" }}>{faDigits(p.area)} متر{p.rooms ? ` · ${faDigits(p.rooms)} خواب` : ""}</span>
        </div>
        <div className="flex items-center" style={{ gap: 8, marginTop: 9 }}>
          <Chip><Icon size={11} color="#fff" />{p.type}</Chip>
          <Chip>{p.deal}</Chip>
        </div>
      </div>

      {sold && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(12,16,26,0.55)" }}>
          <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: "#fff", background: c.danger, padding: `5px ${SP.md}px`, borderRadius: RAD.pill }}>فروخته شد</span>
        </div>
      )}
    </button>
  );
}

function PipelineBoard({ rows, ctx }) {
  const { c, setProperties, setDetail, notify } = ctx;
  const advance = (p) => {
    const idx = STAGES.indexOf(p.stage);
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    setProperties((prev) => prev.map((x) => x.id === p.id ? { ...x, stage: next } : x));
    notify(`مرحله به «${next}» تغییر کرد`);
  };
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollSnapType: "x proximity" }}>
      {STAGES.map((stage) => {
        const items = rows.filter((p) => p.stage === stage);
        return (
          <div key={stage} className="shrink-0 rounded-xl p-3" style={{ ...glass(c), width: 260, scrollSnapAlign: "start" }}>
            <div className="flex items-center justify-between mb-3 px-1">
              <span style={{ fontSize: 13, fontWeight: 800 }}>{stage}</span>
              <span style={{ fontSize: 11, color: c.muted }}>{faDigits(items.length)}</span>
            </div>
            <div className="flex flex-col gap-3">
              {items.map((p) => {
                const cover = p.media && p.media[0]; const Icon = typeIcon(p.type);
                return (
                  <div key={p.id} className="rounded-lg overflow-hidden" style={glass(c)}>
                    <button onClick={() => setDetail({ type: "property", id: p.id })} className="press w-full text-right">
                      <div className="w-full" style={{ height: 90, background: c.primarySoft }}>
                        {cover ? (cover.type === "image" ? <MediaThumb item={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <div className="w-full h-full flex items-center justify-center"><Icon size={26} color={c.primary} className="flora-float" style={{ opacity: 0.5 }} /></div>}
                      </div>
                      <div className="p-2.5">
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: c.primary, marginTop: 2 }}>{fmtToman(p.price)}</p>
                      </div>
                    </button>
                    {stage !== "فروخته شد" && (
                      <button onClick={() => advance(p)} className="press w-full flex items-center justify-center gap-1.5 py-2" style={{ background: c.primarySoft, color: c.primary, fontSize: 11, fontWeight: 700 }}>
                        <ChevronLeft size={13} /> حرکت به مرحله بعد
                      </button>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && <p style={{ fontSize: 11, color: c.muted, textAlign: "center", padding: "14px 0" }}>خالی</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Customers tab ----------
function CustomerCard({ cu, c, onClick }) {
  const stage = cu.stage || "در حال بررسی";
  const stageColor = CUSTOMER_STAGE_COLOR(c)[stage] || c.primary;
  // Neglect decay — a customer nobody has touched in a while visibly fades,
  // like a plant wilting. Closed-won customers never decay (no need to chase them).
  const idleDays = cu.lastContactAt ? daysSince(cu.lastContactAt) : 99; // never logged → treat as long overdue
  const decaying = stage !== "خرید کرد" && idleDays >= 2;
  const decay = decaying ? Math.min(1, (idleDays - 1) / 7) : 0; // full grey by ~day 8
  return (
    <button onClick={onClick} className="press w-full text-right" style={{ padding: SP.lg, borderRadius: RAD.lg, ...glassLite(c, RAD.lg), filter: decay > 0 ? `grayscale(${decay})` : "none", opacity: 1 - decay * 0.32, transition: "filter .6s ease, opacity .6s ease" }}>
      <div className="flex items-center" style={{ gap: SP.md }}>
        <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 48, height: 48, background: c.primarySoft }}><UserCircle2 size={26} color={c.primary} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.name}</p>
          <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.need || "بدون توضیح"}</p>
        </div>
        <div className="text-left shrink-0">
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: c.primary, direction: "rtl" }}>{fmtBudgetShort(cu.budget)}</p>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 1 }}>بودجه</p>
        </div>
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: SP.md, paddingTop: SP.md, borderTop: `1px solid ${c.border}` }}>
        <span className="rounded-full" style={{ fontSize: FS.caption, fontWeight: FW.bold, color: stageColor, background: stageColor + "1f", padding: `4px ${SP.md}px` }}>{stage}</span>
        {decaying ? (
          <span className="flex items-center" style={{ gap: SP.xs, fontSize: FS.caption, color: c.attn, fontWeight: FW.bold }}><AlertTriangle size={12} color={c.attn} />{faDigits(idleDays)} روز بدون پیگیری</span>
        ) : (
          <span className="flex items-center" style={{ gap: SP.xs, fontSize: FS.caption, color: c.muted }}>مشاهده <ChevronLeft size={14} color={c.muted} /></span>
        )}
      </div>
      {cu.lastCallNote && (
        <div className="flex items-start" style={{ gap: SP.xs, marginTop: SP.sm }}>
          <StickyNote size={12} color={c.attn} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cu.lastCallNote}</p>
        </div>
      )}
    </button>
  );
}

function CustomersTab({ ctx, search, setSearch }) {
  const { c, customers, setDetail } = ctx;
  const [showWithdrawn, setShowWithdrawn] = useState(false);

  const withdrawn = useMemo(() => customers.filter((cu) => cu.stage === "منصرف شد"), [customers]);
  const activeCustomers = useMemo(() => customers.filter((cu) => cu.stage !== "منصرف شد"), [customers]);

  const filtered = useMemo(() => {
    const pool = showWithdrawn ? withdrawn : activeCustomers;
    if (!search) return pool;
    const q = search.toLowerCase();
    return pool.filter((cu) => Object.values(cu).some((v) => String(v).toLowerCase().includes(q)));
  }, [activeCustomers, withdrawn, showWithdrawn, search]);

  // Split into meaningful sections instead of one flat list — updated-today
  // customers float to the top automatically (ordered by exact touch time),
  // then customers who need attention, then everyone else.
  const { recent, needsFollowUp, rest } = useMemo(() => {
    const today = todayISO();
    const recent = [], needsFollowUp = [], rest = [];
    filtered.forEach((cu) => {
      if (cu.lastContactAt === today) recent.push(cu);
      else {
        const idleDays = cu.lastContactAt ? daysSince(cu.lastContactAt) : 99;
        if (cu.stage !== "خرید کرد" && idleDays >= 5) needsFollowUp.push(cu);
        else rest.push(cu);
      }
    });
    recent.sort((a, b) => (b.lastContactTs || 0) - (a.lastContactTs || 0));
    needsFollowUp.sort((a, b) => (b.lastContactAt ? daysSince(b.lastContactAt) : 99) - (a.lastContactAt ? daysSince(a.lastContactAt) : 99));
    return { recent, needsFollowUp, rest };
  }, [filtered]);

  const SectionLabel = ({ children, color, icon: Icon }) => (
    <div className="flex items-center" style={{ gap: SP.xs, marginBottom: SP.md, marginTop: SP.lg }}>
      {Icon && <Icon size={12} color={color || c.muted} />}
      <p style={{ fontSize: FS.caption, fontWeight: FW.bold, color: color || c.muted, letterSpacing: ".02em" }}>{children}</p>
    </div>
  );

  return (
    <div style={{ paddingTop: SP.lg }}>
      <SearchBox c={c} value={search} setValue={setSearch} />

      {showWithdrawn ? (
        <>
          <div className="flex items-center justify-between" style={{ marginTop: SP.lg }}>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>مشتریان منصرف‌شده</p>
            <button onClick={() => setShowWithdrawn(false)} className="press" style={{ fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>بازگشت</button>
          </div>
          <div className="flex flex-col flora-stagger" style={{ gap: SP.md, marginTop: SP.md }}>
            {filtered.map((cu) => <CustomerCard key={cu.id} cu={cu} c={c} onClick={() => setDetail({ type: "customer", id: cu.id })} />)}
            {filtered.length === 0 && <EmptyLine c={c} text="مشتری‌ای پیدا نشد" />}
          </div>
        </>
      ) : (
        <>
          {recent.length > 0 && (
            <>
              <SectionLabel color={c.success} icon={CheckCircle2}>به‌روزرسانی‌شده امروز</SectionLabel>
              <div className="flex flex-col flora-stagger" style={{ gap: SP.md }}>
                {recent.map((cu) => <CustomerCard key={cu.id} cu={cu} c={c} onClick={() => setDetail({ type: "customer", id: cu.id })} />)}
              </div>
            </>
          )}
          {needsFollowUp.length > 0 && (
            <>
              <SectionLabel color={c.attn} icon={AlertTriangle}>نیاز به پیگیری ({faDigits(needsFollowUp.length)})</SectionLabel>
              <div className="flex flex-col flora-stagger" style={{ gap: SP.md }}>
                {needsFollowUp.map((cu) => <CustomerCard key={cu.id} cu={cu} c={c} onClick={() => setDetail({ type: "customer", id: cu.id })} />)}
              </div>
            </>
          )}
          <SectionLabel>همه مشتریان ({faDigits(rest.length)})</SectionLabel>
          <div className="flex flex-col flora-stagger" style={{ gap: SP.md }}>
            {rest.map((cu) => <CustomerCard key={cu.id} cu={cu} c={c} onClick={() => setDetail({ type: "customer", id: cu.id })} />)}
            {filtered.length === 0 && <EmptyLine c={c} text="مشتری‌ای پیدا نشد" />}
          </div>
          {withdrawn.length > 0 && (
            <button onClick={() => setShowWithdrawn(true)} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.xl, paddingBlock: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
              <UserX size={13} color={c.muted} /><span style={{ fontSize: FS.caption, color: c.muted, fontWeight: FW.bold }}>{faDigits(withdrawn.length)} مشتری منصرف‌شده — مشاهده</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Calendar tab ----------
function CalendarTab({ ctx }) {
  const { c, appointments } = ctx;
  const todayJ = isoToJalali(todayISO());
  const [view, setView] = useState({ jy: todayJ[0], jm: todayJ[1] });
  const [selected, setSelected] = useState(todayISO());

  // Which days this month have visits (for the dots)
  const visitDays = useMemo(() => {
    const set = {};
    appointments.forEach((a) => { const [jy, jm, jd] = isoToJalali(a.date); if (jy === view.jy && jm === view.jm) set[jd] = (set[jd] || 0) + 1; });
    return set;
  }, [appointments, view]);

  const monthLen = jalaliMonthLength(view.jy, view.jm);
  const firstWd = jalaliFirstWeekday(view.jy, view.jm); // 0=شنبه
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= monthLen; d++) cells.push(d);

  const prevMonth = () => setView((v) => v.jm === 1 ? { jy: v.jy - 1, jm: 12 } : { jy: v.jy, jm: v.jm - 1 });
  const nextMonth = () => setView((v) => v.jm === 12 ? { jy: v.jy + 1, jm: 1 } : { jy: v.jy, jm: v.jm + 1 });

  const selectedAppts = appointments.filter((a) => a.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

  return (
    <div style={{ paddingTop: SP.lg }}>
      {/* Month header */}
      <div className="flex items-center justify-between" style={{ marginBottom: SP.lg, paddingInline: SP.xs }}>
        <button onClick={prevMonth} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ ...glass(c) }}><ChevronRight size={18} color={c.ink} /></button>
        <h2 style={{ fontSize: FS.title, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>{MONTHS_FA[view.jm - 1]} {faDigits(view.jy)}</h2>
        <button onClick={nextMonth} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ ...glass(c) }}><ChevronLeft size={18} color={c.ink} /></button>
      </div>

      {/* Calendar card */}
      <div style={{ padding: SP.md, borderRadius: RAD.lg, ...glass(c) }}>
        <div className="grid grid-cols-7" style={{ marginBottom: SP.sm }}>
          {WEEK.map((w, i) => <div key={i} style={{ textAlign: "center", fontSize: FS.caption, color: c.muted, fontWeight: FW.bold }}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ gap: SP.xs }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const iso = jalaliToIso(view.jy, view.jm, d);
            const isToday = iso === todayISO();
            const isSel = iso === selected;
            const hasVisit = visitDays[d];
            return (
              <button key={i} onClick={() => setSelected(iso)} className="press flex flex-col items-center justify-center" style={{ aspectRatio: "1", borderRadius: RAD.md, background: isSel ? c.gradientPrimary : isToday ? c.primarySoft : "transparent", position: "relative" }}>
                <span style={{ fontSize: FS.body, fontWeight: isSel || isToday ? FW.heavy : FW.medium, color: isSel ? "#fff" : isToday ? c.primary : c.ink }}>{faDigits(d)}</span>
                {hasVisit && <span style={{ position: "absolute", bottom: 5, width: 5, height: 5, borderRadius: RAD.pill, background: isSel ? "#fff" : c.success }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day's appointments */}
      <div className="flex items-baseline justify-between" style={{ marginTop: SP.xl, marginBottom: SP.md, paddingRight: 2 }}>
        <h3 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{selected === todayISO() ? "بازدیدهای امروز" : `بازدیدهای ${fmtJalali(selected)}`}</h3>
        {selectedAppts.length > 0 && <span style={{ fontSize: FS.caption, color: c.muted }}>{faDigits(selectedAppts.length)} مورد</span>}
      </div>
      <div className="flex flex-col" style={{ gap: SP.sm }}>
        {selectedAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} showDelete />)}
        {selectedAppts.length === 0 && <EmptyLine c={c} text="این روز بازدیدی نداری" />}
      </div>
    </div>
  );
}

// ---------- More tab ----------
// Lets the agent download the whole Sarein area once, while online, so the maps
// then work with no connection at all.
// Re-encodes every photo already stored (properties' media) to WebP, in place —
// no re-upload needed. Runs one image at a time so the UI stays responsive.
function PhotoOptimizeButton({ ctx }) {
  const { c, properties, setProperties, notify } = ctx;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }

  const dataUrlBytes = (u) => (u ? Math.round((u.length - u.indexOf(",") - 1) * 0.75) : 0);
  const totalImages = properties.reduce((n, p) => n + (p.media || []).filter((m) => m.type === "image").length, 0);

  const run = async () => {
    if (totalImages === 0) { notify("فایلی با عکس پیدا نشد"); return; }
    setBusy(true);
    let done = 0, beforeBytes = 0, afterBytes = 0;
    const next = [];
    for (const p of properties) {
      if (!p.media || p.media.length === 0) { next.push(p); continue; }
      const media = [];
      for (const m of p.media) {
        if (m.type === "image") {
          const before = dataUrlBytes(m.url);
          const candidate = await reencodeToWebp(m.url);
          const after = dataUrlBytes(candidate);
          const url = after < before ? candidate : m.url; // keep original if re-encode didn't actually help
          beforeBytes += before; afterBytes += Math.min(before, after);
          media.push({ ...m, url });
          done++; setProgress({ done, total: totalImages });
        } else media.push(m);
      }
      next.push({ ...p, media });
    }
    setProperties(next);
    setBusy(false); setProgress(null);
    const savedMb = ((beforeBytes - afterBytes) / (1024 * 1024)).toFixed(1);
    const method = supportsWebp() ? "WebP" : "JPEG فشرده‌تر (مرورگرت WebP را واقعاً پشتیبانی نمی‌کند)";
    notify(afterBytes < beforeBytes ? `${faDigits(done)} عکس با ${method} بازفشرده شد — ${savedMb} مگابایت کمتر شد` : `${faDigits(done)} عکس بررسی شد — حجمشان از قبل کم بود`);
  };

  return (
    <button onClick={run} disabled={busy} className="press w-full rounded-xl py-3 flex items-center justify-center gap-2" style={{ background: c.attnSoft }}>
      {busy ? <Loader2 size={14} className="animate-spin" color={c.attn} /> : <ImageIcon size={14} color={c.attn} />}
      <span style={{ fontSize: 11, fontWeight: 700, color: c.attn }}>
        {busy ? `در حال بهینه‌سازی... ${progress ? `${faDigits(progress.done)}/${faDigits(progress.total)}` : ""}` : totalImages > 0 ? `فشرده‌سازی ${faDigits(totalImages)} عکس موجود` : "عکسی برای فشرده‌سازی نیست"}
      </span>
    </button>
  );
}

function OfflineMapButton({ c, notify }) {
  const [state, setState] = useState("idle"); // idle | working | done
  const [pct, setPct] = useState(0);
  const run = async () => {
    if (state === "working") return;
    setState("working"); setPct(0);
    try {
      await precacheSareinTiles((done, total) => setPct(Math.round((done / total) * 100)));
      setState("done"); notify("نقشه سرعین برای استفاده آفلاین ذخیره شد");
    } catch {
      setState("idle"); notify("ذخیره نقشه ناموفق بود، اتصال اینترنت را بررسی کن");
    }
  };
  return (
    <button onClick={run} disabled={state === "working"} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mt-2" style={{ background: c.primarySoft }}>
      <MapPin size={14} color={c.primary} />
      <span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>
        {state === "working" ? `در حال ذخیره نقشه… ${faDigits(pct)}%` : state === "done" ? "نقشه سرعین آفلاین شد ✓" : "ذخیره نقشه سرعین برای آفلاین"}
      </span>
    </button>
  );
}

function CollapsibleCard({ c, icon: Icon, tint, title, subtitle, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={glass(c)}>
      <button onClick={() => setOpen((o) => !o)} className="press w-full text-right p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint + "22" }}><Icon size={18} color={tint} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>{title}</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{subtitle}</p>
        </div>
        {count != null && <span className="shrink-0" style={{ fontSize: 11, fontWeight: 800, color: tint, background: tint + "1f", padding: "3px 9px", borderRadius: 999 }}>{faDigits(count)}</span>}
        <ChevronDown size={16} color={c.muted} style={{ transition: "transform .3s cubic-bezier(.34,1.3,.64,1)", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }} />
      </button>
      {open && <div className="px-4 pb-4 flora-up">{children}</div>}
    </div>
  );
}

// Editable agency identity. Flora is meant to be published for any agent, so the
// name, city, and agent name aren't hardcoded — each office sets their own here.
function OfficeCard({ c, agencyName, setAgencyName, agencyCity, setAgencyCity, agentName, setAgentName, notify, properties, customers, owners }) {
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(agencyName);
  const [ct, setCt] = useState(agencyCity);
  const [ag, setAg] = useState(agentName);
  const save = () => {
    setAgencyName(n.trim() || "املاک");
    setAgencyCity(ct.trim());
    setAgentName(ag.trim());
    setEditing(false);
    notify("مشخصات دفتر ذخیره شد");
  };
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: c.gradientPrimary, boxShadow: "0 12px 32px rgba(79,70,229,.32)", position: "relative", overflow: "hidden" }}>
      <span style={{ position: "absolute", top: "-55%", left: "-25%", width: 200, height: 200, background: "radial-gradient(circle,rgba(255,255,255,.15),transparent 70%)", animation: "floraFloat 5s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: -20, left: -14, opacity: 0.13, pointerEvents: "none" }}><FloraMark size={130} color="#fff" stroke={1.2} /></div>
      {!editing ? (
        <div style={{ position: "relative" }}>
          <div className="flex items-start justify-between">
            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>{agencyName}{agencyCity ? ` — ${agencyCity}` : ""}</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2 }}>مدیریت دفتر</p>
            </div>
            <button onClick={() => { setN(agencyName); setCt(agencyCity); setAg(agentName); setEditing(true); }} className="press rounded-lg px-2.5 py-1.5 flex items-center gap-1 shrink-0" style={{ background: "rgba(255,255,255,.18)" }}>
              <Edit3 size={11} color="#fff" /><span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>ویرایش نام</span>
            </button>
          </div>
          <div className="flex gap-2 mt-3.5">
            {[{ n: properties.length, l: "فایل" }, { n: customers.length, l: "مشتری" }, { n: owners.length, l: "مالک" }].map((s, i) => (
              <div key={i} className="flex-1 rounded-xl py-2 text-center" style={{ background: "rgba(255,255,255,.14)" }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{faDigits(s.n)}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.8)" }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5" style={{ position: "relative" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>ویرایش مشخصات دفتر</p>
          <input style={{ ...inputStyle(c), background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} value={n} onChange={(e) => setN(e.target.value)} placeholder="نام دفتر (مثلاً املاک گنجینه)" />
          <input style={{ ...inputStyle(c), background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} value={ct} onChange={(e) => setCt(e.target.value)} placeholder="شهر (مثلاً سرعین)" />
          <input style={{ ...inputStyle(c), background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} value={ag} onChange={(e) => setAg(e.target.value)} placeholder="نام شما (مثلاً قبادی)" />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="press flex-1 rounded-xl py-2.5" style={{ background: "rgba(255,255,255,.16)", fontSize: 13, fontWeight: 700, color: "#fff" }}>لغو</button>
            <button onClick={save} className="press flex-1 rounded-xl py-2.5" style={{ background: "#fff", fontSize: 13, fontWeight: 700, color: c.primary }}>ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreTab({ ctx }) {
  const { c, owners, setOwners, builders, setBuilders, calls, setCalls, setSheet, setDetail, setTab, exportBackup, importBackup, exportProperties, exportFinance, shareBackupNow, notify, properties, customers, simpleMode, setSimpleMode, agencyName, setAgencyName, agencyCity, setAgencyCity } = ctx;
  const importRef = useRef(null);
  const pending = calls.filter((cl) => cl.status !== "انجام‌شد").length;

  return (
    <div className="pt-3">
      {/* Simple / advanced mode switch — the master control for how busy the app feels */}
      <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={glass(c)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: simpleMode ? c.successSoft : c.primarySoft }}>
          {simpleMode ? <Sparkles size={18} color={c.success} /> : <LayoutGrid size={18} color={c.primary} />}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>{simpleMode ? "حالت ساده" : "حالت حرفه‌ای"}</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{simpleMode ? "فقط فایل‌ها و مشتری‌ها — تمیز و بی‌شلوغی" : "همه‌ی امکانات: مالی، کمیسیون، گزارش و AI"}</p>
        </div>
        <button onClick={() => { setSimpleMode(!simpleMode); notify(simpleMode ? "حالت حرفه‌ای فعال شد" : "حالت ساده فعال شد"); }}
          className="press shrink-0" style={{ width: 52, height: 30, borderRadius: 999, background: simpleMode ? c.border : c.primary, position: "relative", transition: "background .3s ease" }}>
          <span style={{ position: "absolute", top: 3, right: simpleMode ? 3 : 25, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "right .3s cubic-bezier(.34,1.4,.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
        </button>
      </div>

      {/* Office management + editable agency identity, merged into one card */}
      <OfficeCard c={c} agencyName={agencyName} setAgencyName={setAgencyName} agencyCity={agencyCity} setAgencyCity={setAgencyCity} agentName={ctx.agentName} setAgentName={ctx.setAgentName} notify={notify} properties={properties} customers={customers} owners={owners} />

      {/* Quick-launch grid — calendar, messages, and (when relevant) finance/investment,
          all the same compact tile so this doesn't turn into a stack of mismatched rows */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={() => setTab("calendar")} className="press text-right rounded-2xl p-4" style={glass(c)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.primarySoft }}><CalendarDays size={18} color={c.primary} /></div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>تقویم بازدید</p>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>قرارهای امروز و آینده</p>
        </button>
        <button onClick={() => setSheet("messages")} className="press text-right rounded-2xl p-4" style={glass(c)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.purpleSoft }}><MessageSquare size={18} color={c.purple} /></div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>پیام‌های آماده</p>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>متن‌های جذب مشتری</p>
        </button>
        {simpleMode && (
          <button onClick={() => setTab("finance")} className="press text-right rounded-2xl p-4" style={glass(c)}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.successSoft }}><Wallet size={18} color={c.success} /></div>
            <p style={{ fontSize: 13, fontWeight: 700 }}>مالی و کمیسیون</p>
            <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>معاملات و پرداخت‌ها</p>
          </button>
        )}
        <button onClick={() => setDetail({ type: "investment-center" })} className="press text-right rounded-2xl p-4" style={glass(c)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.purpleSoft }}><TrendingUp size={18} color={c.purple} /></div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>سرمایه‌گذاری</p>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>پورتفولیو و سود شرکا</p>
        </button>
      </div>

      {/* Calls live in their own full screen (top-bar badge) — just a quick link here, not a second copy of the list */}
      <button onClick={() => setDetail({ type: "calls" })} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.attnSoft }}><PhoneCall size={20} color={c.attn} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>پیگیری تماس‌ها</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{pending > 0 ? `${faDigits(pending)} تماس در انتظار` : "همه پیگیری شده"}</p>
        </div>
        <ChevronLeft size={17} color={c.muted} />
      </button>

      <button onClick={() => ctx.setNotificationsOpen(true)} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Bell size={20} color={c.primary} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>اعلان‌ها</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>فعال‌سازی، دسته‌بندی، ساعات سکوت</p>
        </div>
        <ChevronLeft size={17} color={c.muted} />
      </button>

      <button onClick={() => ctx.setDivarSearchOpen(true)} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.purpleSoft }}><Sparkles size={20} color={c.purple} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>چرا آگهی‌ام زنگ نمی‌خوره؟</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>لینک آگهی دیوار رو بده، تحلیل کامل بگیر</p>
        </div>
        <ChevronLeft size={17} color={c.muted} />
      </button>

      <button onClick={() => ctx.setQuickValuationOpen(true)} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><TrendingUp size={20} color={c.primary} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>Flora Valuation — قیمت‌گذاری سریع</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>موقعیت رو روی نقشه بزن، فوری قیمت بگیر</p>
        </div>
        <ChevronLeft size={17} color={c.muted} />
      </button>

      <button onClick={() => ctx.setConstructionOpen(true)} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.attnSoft }}><HardHat size={20} color={c.attn} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>ساخت‌وساز و ساختمان</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>هزینه‌های پروژه رو با صدا ثبت کن</p>
        </div>
        <ChevronLeft size={17} color={c.muted} />
      </button>

      <button onClick={() => ctx.setChecksOpen(true)} className="press w-full text-right rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><ArrowUpRight size={20} color={c.danger} /></div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 700 }}>چک‌ها</p>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>دریافتی و پرداختی، دسته‌بندی بر اساس ماه</p>
        </div>
        <ChevronLeft size={17} color={c.muted} />
      </button>

      {/* Collapsible: owners */}
      <CollapsibleCard c={c} icon={UserCircle2} tint={c.primary} title="مالکین" subtitle="لیست مالکین و تماس سریع" count={owners.length}>
        <div className="flex flex-col gap-2">
          {owners.map((o) => (
            <div key={o.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: c.primarySoft }}><UserCircle2 size={17} color={c.primary} /></div>
              <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</p><p style={{ fontSize: 11, color: c.muted }} dir="ltr">{o.phone}</p></div>
              {o.phone && <a href={`tel:${o.phone}`} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={12} color={c.success} /></a>}
              <button onClick={() => setSheet({ kind: "owner", editId: o.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
              <button onClick={() => { setOwners((prev) => prev.filter((x) => x.id !== o.id)); notify("مالک حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
            </div>
          ))}
          {owners.length === 0 && <EmptyLine c={c} text="مالکی ثبت نشده" />}
          <AddLink c={c} label="ثبت مالک جدید" onClick={() => setSheet("owner")} />
        </div>
      </CollapsibleCard>

      {/* Collapsible: builders */}
      <CollapsibleCard c={c} icon={Hammer} tint={c.attn} title="سازندگان" subtitle="شرکت‌ها و سازنده‌های همکار" count={builders.length}>
        <div className="flex flex-col gap-2">
          {builders.length > 0 && (
            <button onClick={() => setSheet("builder-broadcast")} className="press w-full rounded-xl py-2.5 flex items-center justify-center gap-2 mb-1" style={{ background: c.primarySoft }}>
              <Send size={14} color={c.primary} /><span style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>پیام تبریک گروهی به همه‌ی سازنده‌ها</span>
            </button>
          )}
          {builders.map((b) => (
            <div key={b.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: c.surface2 }}>
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: c.attnSoft }}><Hammer size={15} color={c.attn} /></div>
              <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</p><p style={{ fontSize: 11, color: c.muted }} dir="ltr">{b.phone}</p></div>
              {b.phone && <a href={`tel:${b.phone}`} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={12} color={c.success} /></a>}
              <button onClick={() => setSheet({ kind: "builder", editId: b.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
              <button onClick={() => { setBuilders((prev) => prev.filter((x) => x.id !== b.id)); notify("سازنده حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
            </div>
          ))}
          {builders.length === 0 && <EmptyLine c={c} text="سازنده‌ای ثبت نشده" />}
          <AddLink c={c} label="ثبت سازنده جدید" onClick={() => setSheet("builder")} />
        </div>
      </CollapsibleCard>

      {/* Account + real cloud backup (Supabase) */}
      <AccountBackupCard ctx={ctx} />

      {/* Collapsible: settings & backup */}
      <CollapsibleCard c={c} icon={Wallet} tint={c.purple} title="پشتیبان‌گیری و تنظیمات" subtitle="بکاپ داده‌ها و هوش مصنوعی">
        <p style={{ fontSize: 11, color: c.muted, marginBottom: 8, lineHeight: 1.7 }}>بکاپ کامل همه‌چیز را ذخیره می‌کند. اگر فقط بخشی را می‌خواهی، از دکمه‌های جدا استفاده کن.</p>
        <button onClick={shareBackupNow} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-2" style={{ background: c.primary }}>
          <Send size={14} color="#fff" /><span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>ارسال بکاپ (تلگرام، واتساپ، ایمیل...)</span>
        </button>
        <button onClick={exportBackup} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-2" style={{ background: c.primarySoft }}>
          <Download size={14} color={c.primary} /><span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>دانلود بکاپ کامل</span>
        </button>
        <div className="flex gap-2 mb-2">
          <button onClick={exportProperties} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.surface2 }}>
            <Building2 size={13} color={c.ink} /><span style={{ fontSize: 11, fontWeight: 700, color: c.ink }}>فایل‌ها و مشتری‌ها</span>
          </button>
          <button onClick={exportFinance} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.surface2 }}>
            <Wallet size={13} color={c.ink} /><span style={{ fontSize: 11, fontWeight: 700, color: c.ink }}>مالی</span>
          </button>
        </div>
        <button onClick={() => importRef.current?.click()} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-2" style={{ background: c.attnSoft }}>
          <Upload size={14} color={c.attn} /><span style={{ fontSize: 11, fontWeight: 700, color: c.attn }}>بازیابی بکاپ (هر نوع)</span>
        </button>
        <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { if (e.target.files?.[0]) importBackup(e.target.files[0]); e.target.value = ""; }} />
        <button onClick={() => setSheet("ai-settings")} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.purpleSoft }}>
          <Sparkles size={14} color={c.purple} /><span style={{ fontSize: 11, fontWeight: 700, color: c.purple }}>تنظیمات هوش مصنوعی</span>
        </button>
        <OfflineMapButton c={c} notify={notify} />
        <PhotoOptimizeButton ctx={ctx} />
      </CollapsibleCard>

      <div style={{ height: 12 }} />
    </div>
  );
}

function AccountBackupCard({ ctx }) {
  const { c, notify, session, signOut, cloudBackupNow, restoreFromCloud, properties, setProperties } = ctx;
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null); // null = loading
  const [emailInput, setEmailInput] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null); // storage_path pending confirmation
  const [migrating, setMigrating] = useState(false);
  const [migrateProgress, setMigrateProgress] = useState(null); // {done, total}

  const user = session?.user;
  const googleLinked = (user?.app_metadata?.providers || []).includes("google");

  const loadAll = async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    setEmailInput(p?.backup_email || user.email || "");
    const { data: h } = await supabase.from("backup_history").select("*").order("created_at", { ascending: false }).limit(10);
    setHistory(h || []);
  };
  useEffect(() => { if (user) loadAll(); }, [user?.id]); // eslint-disable-line

  const saveBackupEmail = async () => {
    if (!emailInput.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ backup_email: emailInput.trim() }).eq("id", user.id);
    setBusy(false);
    if (error) { notify("ذخیره نشد"); return; }
    setEditingEmail(false);
    notify("ایمیل بکاپ ذخیره شد");
    loadAll();
  };

  const doBackupNow = async () => {
    setBusy(true);
    await cloudBackupNow();
    await loadAll();
    setBusy(false);
  };

  const doDownload = async (path) => {
    const { data, error } = await supabase.storage.from("backups").createSignedUrl(path, 60);
    if (error || !data) { notify("لینک دانلود ساخته نشد"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const doRestore = async (path) => {
    setConfirmRestore(null);
    setBusy(true);
    await restoreFromCloud(path);
    await loadAll();
    setBusy(false);
  };

  // One-time, explicit (never automatic) migration of old base64 photos to
  // cloud storage — requirement #11. Runs property by property; any photo
  // that fails to upload is simply left exactly as it was (still a working
  // base64 photo, still shows up fine) — nothing is ever deleted here.
  const legacyImageCount = properties.reduce((n, p) => n + (p.media || []).filter((m) => m.type === "image" && m.url && !m.storagePath && !m.external).length, 0);
  const doMigratePhotos = async () => {
    if (!user) return;
    setMigrating(true);
    const targets = properties.filter((p) => (p.media || []).some((m) => m.type === "image" && m.url && !m.storagePath && !m.external));
    const total = targets.reduce((n, p) => n + p.media.filter((m) => m.type === "image" && m.url && !m.storagePath && !m.external).length, 0);
    let done = 0;
    setMigrateProgress({ done: 0, total });
    for (const p of targets) {
      let changed = false;
      const newMedia = await Promise.all((p.media || []).map(async (m, i) => {
        if (m.type === "image" && m.url && !m.storagePath && !m.external) {
          const migrated = await migrateLegacyMediaItem({ userId: user.id, propertyId: p.id, item: m, sortOrder: i });
          done++; setMigrateProgress({ done, total });
          if (migrated !== m) changed = true;
          return migrated;
        }
        return m;
      }));
      if (changed) setProperties((prev) => prev.map((x) => x.id === p.id ? { ...x, media: newMedia } : x));
    }
    setMigrating(false);
    setMigrateProgress(null);
    notify("انتقال عکس‌ها به فضای ابری تمام شد");
  };

  return (
    <CollapsibleCard c={c} icon={UserCircle2} tint={c.primary} title="حساب کاربری و بکاپ ابری" subtitle={user?.email || user?.phone || ""}>
      {/* Account */}
      <div className="rounded-xl p-3 mb-3" style={{ background: c.surface2 }}>
        {(profile?.title || profile?.city) && <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{profile?.title ? `${profile.title} مشاور` : "مشاور"}{profile?.city ? ` — ${profile.city}` : ""}</p>}
        {user?.email && <p style={{ fontSize: 11, color: c.muted }} dir="ltr">{user.email}</p>}
        {(profile?.phone || user?.phone) && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }} dir="ltr">{profile?.phone || user?.phone}</p>}
        {googleLinked && (
          <div className="flex items-center gap-1 mt-1.5"><CheckCircle2 size={11} color={c.success} /><span style={{ fontSize: 11, color: c.success, fontWeight: 700 }}>Google Connected</span></div>
        )}
        <button onClick={() => signOut()} className="press mt-2" style={{ fontSize: 11, color: c.danger, fontWeight: 700 }}>خروج از حساب</button>
      </div>

      {/* Backup email */}
      <div className="rounded-xl p-3 mb-3" style={{ background: c.surface2 }}>
        <p style={{ fontSize: 11, color: c.muted, marginBottom: 6 }}>ایمیل دریافت‌کننده بکاپ</p>
        {editingEmail ? (
          <>
            <input dir="ltr" style={inputStyle(c)} value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <button onClick={() => setEditingEmail(false)} className="press flex-1 rounded-lg py-2" style={{ ...glassSurface(c), color: c.muted, fontSize: 11, fontWeight: 700 }}>لغو</button>
              <button onClick={saveBackupEmail} disabled={busy} className="press flex-1 rounded-lg py-2" style={{ background: c.primary, color: "#fff", fontSize: 11, fontWeight: 700 }}>ذخیره</button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 13, fontWeight: 600 }} dir="ltr">{profile?.backup_email || user?.email}</p>
            <button onClick={() => setEditingEmail(true)} className="press" style={{ fontSize: 11, color: c.primary, fontWeight: 700 }}>تغییر</button>
          </div>
        )}
      </div>

      <button onClick={doBackupNow} disabled={busy} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-3" style={{ background: c.primary, opacity: busy ? 0.5 : 1 }}>
        <RefreshCw size={14} color="#fff" /><span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{busy ? "در حال ذخیره..." : "ساخت بکاپ ابری الان"}</span>
      </button>

      {/* Legacy base64 photos → cloud storage, one-time and explicit */}
      {legacyImageCount > 0 && (
        <button onClick={doMigratePhotos} disabled={migrating} className="press w-full rounded-xl py-3 flex items-center justify-center gap-1.5 mb-3" style={{ ...glassSurface(c), opacity: migrating ? 0.6 : 1 }}>
          <ImagePlus size={14} color={c.primary} />
          <span style={{ fontSize: 11, fontWeight: 700, color: c.ink }}>
            {migrating ? `در حال انتقال عکس‌ها... ${migrateProgress ? `(${faDigits(migrateProgress.done)}/${faDigits(migrateProgress.total)})` : ""}` : `انتقال ${faDigits(legacyImageCount)} عکس قدیمی به فضای ابری`}
          </span>
        </button>
      )}

      {/* History */}
      <p style={{ fontSize: 11, color: c.muted, marginBottom: 6 }}>تاریخچه بکاپ</p>
      {history === null ? (
        <p style={{ fontSize: 11, color: c.muted }}>در حال بارگذاری...</p>
      ) : history.length === 0 ? (
        <EmptyLine c={c} text="هنوز بکاپی ثبت نشده" />
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((h) => (
            <div key={h.id} className="rounded-xl p-2.5" style={{ background: c.surface2 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {h.status === "success" ? <CheckCircle2 size={13} color={c.success} /> : <AlertTriangle size={13} color={c.danger} />}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtJalali(h.created_at.slice(0, 10))}</span>
                  <span style={{ fontSize: 10, color: c.muted }}>{h.kind === "manual" ? "دستی" : "خودکار"}</span>
                </div>
                {h.size_bytes ? <span style={{ fontSize: 10, color: c.muted }}>{(h.size_bytes / 1024).toFixed(1)} KB</span> : null}
              </div>
              {h.status === "success" && h.storage_path && (
                <div className="flex gap-2" style={{ marginTop: 6 }}>
                  <button onClick={() => doDownload(h.storage_path)} className="press flex-1 rounded-lg py-1.5 flex items-center justify-center gap-1" style={{ background: c.surface }}>
                    <Download size={11} color={c.ink} /><span style={{ fontSize: 10, fontWeight: 700 }}>دانلود</span>
                  </button>
                  <button onClick={() => setConfirmRestore(h.storage_path)} className="press flex-1 rounded-lg py-1.5 flex items-center justify-center gap-1" style={{ background: c.attnSoft }}>
                    <RefreshCw size={11} color={c.attn} /><span style={{ fontSize: 10, fontWeight: 700, color: c.attn }}>بازیابی</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmRestore && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", padding: SP.xl }}>
          <div style={{ ...glassSurface(c), borderRadius: RAD.lg, padding: SP.xl, maxWidth: 340 }}>
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} color={c.danger} /><p style={{ fontWeight: 800, fontSize: 14 }}>بازیابی بکاپ</p></div>
            <p style={{ fontSize: 12, color: c.muted, lineHeight: 1.8, marginBottom: SP.lg }}>بازیابی بکاپ می‌تواند اطلاعات فعلی را تغییر دهد. قبل از ادامه یک بکاپ ایمنی از وضعیت فعلی ساخته می‌شود.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRestore(null)} className="press flex-1 rounded-lg py-2.5" style={{ background: c.surface2, fontSize: 12, fontWeight: 700 }}>لغو</button>
              <button onClick={() => doRestore(confirmRestore)} className="press flex-1 rounded-lg py-2.5" style={{ background: c.danger, color: "#fff", fontSize: 12, fontWeight: 700 }}>ساخت بکاپ ایمنی و بازیابی</button>
            </div>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}

function AddLink({ c, label, onClick }) {
  return <button onClick={onClick} className="press flex items-center gap-1.5 mb-6" style={{ color: c.primary, fontSize: 13, fontWeight: 700 }}><Plus size={14} /> {label}</button>;
}

// ---------- Detail view (full screen) ----------
function DetailView({ detail, ctx, onBack }) {
  if (detail.type === "property") return <PropertyDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  if (detail.type === "customer") return <CustomerDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  if (detail.type === "copilot") return <CopilotView ctx={ctx} onBack={onBack} />;
  if (detail.type === "calls") return <CallsView ctx={ctx} onBack={onBack} />;
  if (detail.type === "ai-chat") return <AiChatView ctx={ctx} onBack={onBack} />;
  if (detail.type === "finance") return <FinanceCenterView ctx={ctx} onBack={onBack} />;
  if (detail.type === "investment-center") return <InvestmentCenterView ctx={ctx} onBack={onBack} />;
  if (detail.type === "documents") return <DocumentCenterView ctx={ctx} onBack={onBack} />;
  if (detail.type === "investment") return <InvestmentDetail id={detail.id} ctx={ctx} onBack={onBack} />;
  return null;
}
// ---------- Investment Center (Portfolio) — Phase 1 ----------
// Purchase price + all expenses = cost basis. Current value − cost basis = real
// profit. This is the one formula the whole module leans on; everything else
// (partner shares, cards, dashboards) is built from these three numbers so the
// agent never has to open a calculator, per the source spec's design philosophy.
function computeInvestmentStats(inv) {
  const totalExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const costBasis = (Number(inv.purchasePrice) || 0) + totalExpenses;
  const currentValue = Number(inv.currentValue) || 0;
  const profit = currentValue - costBasis;
  const profitPct = costBasis > 0 ? (profit / costBasis) * 100 : 0;
  const partnerPercentSum = (inv.partners || []).reduce((s, p) => s + (Number(p.percent) || 0), 0);
  const totalCapital = (inv.partners || []).reduce((s, p) => s + (Number(p.capital) || 0), 0);
  // Cash flow — money in (logged payments/partner contributions) vs money out
  // (project expenses). Pending checks are money committed but not yet cleared.
  const payments = inv.payments || [];
  const cashIn = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const cashOut = totalExpenses;
  const cashBalance = cashIn - cashOut;
  const pendingChecks = payments.filter((p) => p.method === "چک" && p.checkStatus === "در انتظار");
  const pendingChecksTotal = pendingChecks.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const nextDueCheck = pendingChecks.slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
  // ROI, annualized using actual holding period so a 3-month flip and a
  // 3-year hold aren't compared on the same footing.
  const holdDays = inv.purchaseDate ? Math.max(1, daysSince(inv.purchaseDate)) : 0;
  const annualizedRoi = holdDays > 0 ? profitPct * (365 / holdDays) : 0;
  return { totalExpenses, costBasis, currentValue, profit, profitPct, partnerPercentSum, totalCapital, cashIn, cashOut, cashBalance, pendingChecksTotal, pendingChecksCount: pendingChecks.length, nextDueCheck, holdDays, annualizedRoi };
}

function InvestmentCard({ c, inv, onClick }) {
  const stats = computeInvestmentStats(inv);
  const cover = inv.media && inv.media[0];
  const profitable = stats.profit >= 0;
  return (
    <button onClick={onClick} className="press w-full text-right" style={{ padding: SP.lg, borderRadius: RAD.lg, ...glassLite(c, RAD.lg) }}>
      <div className="flex items-center" style={{ gap: SP.md }}>
        <div className="rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 52, height: 52, background: c.purpleSoft }}>
          {cover ? <img src={cover.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Landmark size={24} color={c.purple} />}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: FS.body + 1, fontWeight: FW.bold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.title}</p>
          <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.address || "بدون آدرس"}</p>
        </div>
        <span className="rounded-full shrink-0" style={{ fontSize: 10, fontWeight: FW.bold, color: c.purple, background: c.purpleSoft, padding: "3px 9px" }}>{inv.status || INVESTMENT_STATUSES[0]}</span>
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: SP.md, paddingTop: SP.md, borderTop: `1px solid ${c.border}` }}>
        <div>
          <p style={{ fontSize: 10, color: c.muted }}>ارزش روز</p>
          <p style={{ fontSize: FS.body, fontWeight: FW.heavy, marginTop: 2 }}>{fmtBudgetShort(stats.currentValue)}</p>
        </div>
        <div className="text-left">
          <p style={{ fontSize: 10, color: c.muted }}>سود / زیان</p>
          <p style={{ fontSize: FS.body, fontWeight: FW.heavy, marginTop: 2, color: profitable ? c.success : c.danger, direction: "ltr" }}>
            {profitable ? "+" : ""}{fmtBudgetShort(stats.profit)} <span style={{ fontSize: FS.caption }}>({faDigits(Math.round(stats.profitPct))}٪)</span>
          </p>
        </div>
      </div>
      {(inv.partners?.length > 0 || stats.pendingChecksCount > 0) && (
        <div className="flex items-center" style={{ gap: SP.md, marginTop: SP.sm, color: c.muted, fontSize: FS.caption }}>
          {inv.partners?.length > 0 && <span className="flex items-center" style={{ gap: SP.xs }}><Users size={12} />{faDigits(inv.partners.length)} شریک</span>}
          {stats.pendingChecksCount > 0 && (
            <span className="flex items-center" style={{ gap: SP.xs, color: c.attn }}>
              <FileCheck size={12} color={c.attn} />{faDigits(stats.pendingChecksCount)} چک باز{stats.nextDueCheck ? ` · سررسید ${fmtJalali(stats.nextDueCheck.dueDate)}` : ""}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function DocumentCenterView({ ctx, onBack }) {
  const { c, properties, customers, owners, agencyName, agencyCity, agentName, hasAiKey, callAI, notify } = ctx;
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState(null);
  const [draft, setDraft] = useState(null); // { title, propertyId, customerId, text, loading }

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    const hits = [];
    DOC_CATEGORIES.forEach((g) => g.docs.forEach((d) => { if (d.includes(q)) hits.push({ cat: g, doc: d }); }));
    return hits;
  }, [query]);

  const startDraft = (doc) => setDraft({ title: doc, propertyId: "", customerId: "", text: "", loading: false, shots: [] });

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); return; }
    setDraft((d) => ({ ...d, loading: true }));
    try {
      const p = properties.find((x) => x.id === draft.propertyId);
      const owner = p ? owners.find((o) => o.id === p.ownerId) : null;
      const cu = customers.find((x) => x.id === draft.customerId);
      const facts = [
        p ? `ملک: ${p.title} — ${p.type}، ${faDigits(p.area)} متر، طبقه ${faDigits(p.floor || 1)}، آدرس: ${p.address || "—"}، قیمت: ${fmtToman(p.price)}` : "",
        owner ? `فروشنده/مالک: ${owner.name}${owner.phone ? ` — ${owner.phone}` : ""}` : "",
        cu ? `خریدار/مستأجر: ${cu.name}${cu.phone ? ` — ${cu.phone}` : ""}` : "",
        `دفتر: ${agencyName || "—"}${agencyCity ? `، ${agencyCity}` : ""}${agentName ? ` — مشاور: ${agentName}` : ""}`,
      ].filter(Boolean).join("\n");
      const prompt = `یک «${draft.title}» کامل و حرفه‌ای به فارسی بنویس، مطابق عرف قراردادهای املاک در ایران.
اطلاعات واقعی موجود (حتماً در متن استفاده کن):
${facts || "— اطلاعاتی انتخاب نشده —"}

قوانین:
- ساختار ماده‌بندی‌شده (ماده ۱، ماده ۲، ...) با عنوان هر ماده.
- برای هر اطلاعاتی که در بالا داده نشده، به‌جای حدس‌زدن، نقطه‌چین بگذار (مثل: ............) تا دستی پر شود. هرگز اطلاعات ساختگی ننویس.
- بندهای ضروری را بیاور: مشخصات طرفین، موضوع قرارداد، ثمن و نحوه پرداخت، تحویل، تعهدات طرفین، فسخ و خسارت، حل اختلاف، تعداد نسخ و امضا.
- در پایان یک خط بنویس: «این متن پیش‌نویس است و باید پیش از امضا توسط مشاور حقوقی بررسی شود.»
فقط خودِ متن قرارداد را برگردان، بدون توضیح اضافه.`;
      const text = await callAI(prompt);
      setDraft((d) => ({ ...d, text: text.trim(), loading: false }));
    } catch (e) {
      notify(`تولید ناموفق: ${e.message || "خطای نامشخص"}`);
      setDraft((d) => ({ ...d, loading: false }));
    }
  };

  const printDoc = () => {
    const w = window.open("", "_blank");
    if (!w) { notify("مرورگر پنجره‌ی چاپ را مسدود کرد"); return; }
    // Attached photos print on their own pages after the text — a signed copy
    // is what makes the printout a real record rather than just a draft.
    const shotPages = (draft.shots || []).map((s) => `<div class="shot"><img src="${s.url}" /></div>`).join("");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${draft.title}</title>
      <style>@page{size:A4;margin:2cm}body{font-family:Vazirmatn,Tahoma,sans-serif;line-height:2.1;font-size:12pt;color:#111}
      h1{font-size:15pt;text-align:center;margin-bottom:1.5em}pre{white-space:pre-wrap;font-family:inherit;font-size:inherit}
      .shot{page-break-before:always;text-align:center}.shot img{max-width:100%;max-height:25cm;object-fit:contain}</style>
      </head><body><h1>${draft.title}</h1><pre>${(draft.text || "").replace(/</g, "&lt;")}</pre>${shotPages}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const shareDoc = async () => {
    const payload = `${draft.title}\n\n${draft.text}`;
    if (navigator.share) { try { await navigator.share({ title: draft.title, text: payload }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    navigator.clipboard?.writeText(payload);
    notify("متن قرارداد کپی شد");
  };

  // ---- draft editor ----
  if (draft) {
    return (
      <div className="pt-2">
        <BackHeader c={c} title={draft.title} onBack={() => setDraft(null)} />
        <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
          <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>فایل و مشتری را انتخاب کن تا اطلاعات خودکار در قرارداد بنشیند.</p>
          <Field c={c} label="فایل ملک"><Select c={c} value={draft.propertyId} onChange={(e) => setDraft({ ...draft, propertyId: e.target.value })} placeholder="انتخاب فایل" options={properties.map((p) => ({ value: p.id, label: p.title }))} /></Field>
          <Field c={c} label="مشتری"><Select c={c} value={draft.customerId} onChange={(e) => setDraft({ ...draft, customerId: e.target.value })} placeholder="انتخاب مشتری" options={customers.map((x) => ({ value: x.id, label: x.name }))} /></Field>
          <button onClick={generate} disabled={draft.loading} className="press w-full flex items-center justify-center" style={{ gap: SP.sm, paddingBlock: SP.md, borderRadius: RAD.md, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body }}>
            {draft.loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{draft.loading ? "در حال نوشتن..." : draft.text ? "نوشتن دوباره" : "تنظیم قرارداد با AI"}
          </button>
        </div>

        {/* Scans of the signed contract. Kept separate from the AI draft on
            purpose: the photo is the legally meaningful artefact, the text is
            only a working draft. */}
        <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
          <p style={{ fontSize: FS.body, fontWeight: FW.bold, marginBottom: SP.xs }}>عکس قرارداد</p>
          <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>از نسخه‌ی امضاشده عکس بگیر — همراه متن چاپ و ذخیره می‌شود.</p>
          <MediaGallery c={c} media={draft.shots || []} uploading={false}
            onAdd={async (files) => { const items = await filesToMedia(files); setDraft((d) => ({ ...d, shots: [...(d.shots || []), ...items] })); }}
            onRemove={(id) => setDraft((d) => ({ ...d, shots: (d.shots || []).filter((x) => x.id !== id) }))}
            onView={ctx.setLightbox} accept="image/*,application/pdf" />
        </div>

        {draft.text && (
          <div className="flora-rise">
            <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
              <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>متن قرارداد — قبل از چاپ می‌توانی ویرایش کنی</p>
              <textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} rows={16}
                style={{ ...inputStyle(c), resize: "vertical", lineHeight: 2, fontSize: FS.caption + 1 }} />
            </div>
            <div className="grid grid-cols-2" style={{ gap: SP.md, marginBottom: SP.xxl }}>
              <button onClick={printDoc} className="press flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.md, background: c.ink, color: c.bg, fontWeight: FW.bold, fontSize: FS.body }}><FileText size={15} color={c.bg} />چاپ / PDF</button>
              <button onClick={shareDoc} className="press flex items-center justify-center" style={{ gap: SP.xs, paddingBlock: SP.md, borderRadius: RAD.md, background: c.surface2, color: c.ink, fontWeight: FW.bold, fontSize: FS.body }}><Share2 size={15} color={c.ink} />ارسال</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- catalogue ----
  return (
    <div className="pt-2">
      <BackHeader c={c} title="اسناد و قراردادها" onBack={onBack} />
      <SearchBox c={c} value={query} setValue={setQuery} />
      <div style={{ height: SP.lg }} />

      {results ? (
        <div className="flex flex-col flora-stagger" style={{ gap: SP.sm }}>
          {results.map(({ cat, doc }, i) => (
            <button key={i} onClick={() => startDraft(doc)} className="press w-full flex items-center text-right" style={{ gap: SP.md, padding: SP.lg, borderRadius: RAD.md, ...glassLite(c, RAD.md) }}>
              <cat.icon size={16} color={c[cat.tone] || c.muted} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{doc}</p>
                <p style={{ fontSize: 10, color: c.muted, marginTop: 1 }}>{cat.label}</p>
              </div>
              <ChevronLeft size={15} color={c.muted} />
            </button>
          ))}
          {results.length === 0 && <EmptyLine c={c} text="سندی با این نام پیدا نشد" />}
        </div>
      ) : (
        <div className="flex flex-col flora-stagger" style={{ gap: SP.md }}>
          {DOC_CATEGORIES.map((g) => {
            const open = openCat === g.id;
            const tone = c[g.tone] || c.muted;
            return (
              <div key={g.id} style={{ borderRadius: RAD.lg, overflow: "hidden", ...glass(c) }}>
                <button onClick={() => setOpenCat(open ? null : g.id)} className="press w-full flex items-center text-right" style={{ gap: SP.md, padding: SP.lg }}>
                  <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: RAD.md, background: tone + "1f" }}><g.icon size={18} color={tone} /></div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: FS.body + 1, fontWeight: FW.bold }}>{g.label}</p>
                    <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{faDigits(g.docs.length)} سند</p>
                  </div>
                  <ChevronDown size={16} color={c.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
                </button>
                {open && (
                  <div className="flora-rise" style={{ paddingInline: SP.lg, paddingBottom: SP.lg }}>
                    <div className="flex flex-col" style={{ gap: SP.sm }}>
                      {g.docs.map((d) => (
                        <button key={d} onClick={() => startDraft(d)} className="press w-full flex items-center justify-between text-right" style={{ padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
                          <span style={{ fontSize: FS.body, fontWeight: FW.medium }}>{d}</span>
                          <ChevronLeft size={14} color={c.muted} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: SP.xxl }} />
    </div>
  );
}

function InvestmentCenterView({ ctx, onBack }) {
  const { c, investments, setInvestments, setDetail, notify } = ctx;
  const [showForm, setShowForm] = useState(false);
  const allStats = investments.map((i) => computeInvestmentStats(i));
  const totalValue = allStats.reduce((s, x) => s + x.currentValue, 0);
  const totalProfit = allStats.reduce((s, x) => s + x.profit, 0);
  const totalCapital = allStats.reduce((s, x) => s + x.totalCapital, 0);
  const profitableCount = allStats.filter((x) => x.profit >= 0).length;
  const losingCount = allStats.length - profitableCount;

  return (
    <div className="pt-2">
      <BackHeader c={c} title="پورتفولیوی سرمایه‌گذاری" onBack={onBack} />

      {investments.length > 0 && (
        <div className="grid grid-cols-2" style={{ gap: SP.md, marginBottom: SP.lg }}>
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
            <p style={{ fontSize: FS.caption, color: c.muted }}>ارزش کل دارایی‌ها</p>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginTop: 4 }}>{fmtBudgetShort(totalValue)}</p>
          </div>
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
            <p style={{ fontSize: FS.caption, color: c.muted }}>سود کل</p>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginTop: 4, color: totalProfit >= 0 ? c.success : c.danger }}>{totalProfit >= 0 ? "+" : ""}{fmtBudgetShort(totalProfit)}</p>
          </div>
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
            <p style={{ fontSize: FS.caption, color: c.muted }}>سرمایه درگیر</p>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginTop: 4 }}>{fmtBudgetShort(totalCapital)}</p>
          </div>
          <div style={{ padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
            <p style={{ fontSize: FS.caption, color: c.muted }}>پروژه‌های سودده / زیان‌ده</p>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginTop: 4 }}><span style={{ color: c.success }}>{faDigits(profitableCount)}</span> / <span style={{ color: c.danger }}>{faDigits(losingCount)}</span></p>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(true)} className="press w-full flex items-center justify-center" style={{ gap: SP.sm, paddingBlock: SP.md, borderRadius: RAD.md, background: c.gradientPrimary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body, marginBottom: SP.lg }}>
        <Plus size={17} color="#fff" />ثبت پروژه‌ی جدید
      </button>

      <div className="flex flex-col flora-stagger" style={{ gap: SP.md }}>
        {investments.map((inv) => <InvestmentCard key={inv.id} c={c} inv={inv} onClick={() => setDetail({ type: "investment", id: inv.id })} />)}
        {investments.length === 0 && <EmptyLine c={c} text="هنوز پروژه‌ای ثبت نشده" />}
      </div>

      {showForm && <InvestmentForm ctx={ctx} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function InvestmentForm({ ctx, onClose, editId }) {
  const { c, investments, setInvestments, notify } = ctx;
  const editing = editId ? investments.find((x) => x.id === editId) : null;
  const [f, setF] = useState(editing ? {
    title: editing.title, propertyType: editing.propertyType || "آپارتمان", investmentType: editing.investmentType || INVESTMENT_TYPES[0],
    address: editing.address || "", area: String(editing.area || ""), floor: String(editing.floor || ""),
    purchaseDate: editing.purchaseDate || todayISO(),
    purchasePrice: String(editing.purchasePrice || ""), currentValue: String(editing.currentValue || editing.purchasePrice || ""), status: editing.status || INVESTMENT_STATUSES[0], desc: editing.desc || "",
  } : { title: "", propertyType: "آپارتمان", investmentType: INVESTMENT_TYPES[0], address: "", area: "", floor: "", purchaseDate: todayISO(), purchasePrice: "", currentValue: "", status: INVESTMENT_STATUSES[0], desc: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.title.trim() && f.purchasePrice;

  const save = () => {
    const payload = {
      title: f.title.trim(), propertyType: f.propertyType, investmentType: f.investmentType, address: f.address.trim(),
      area: toNum(f.area), floor: toNum(f.floor), purchaseDate: f.purchaseDate,
      purchasePrice: toNum(f.purchasePrice), currentValue: toNum(f.currentValue) || toNum(f.purchasePrice), status: f.status, desc: f.desc.trim(),
    };
    if (editing) {
      setInvestments((prev) => prev.map((x) => x.id === editId ? { ...x, ...payload } : x));
      notify("پروژه به‌روزرسانی شد");
    } else {
      setInvestments((prev) => [{ id: uid(), media: [], documents: [], partners: [], expenses: [], payments: [], createdAt: new Date().toISOString(), ...payload }, ...prev]);
      notify("پروژه ثبت شد");
    }
    onClose();
  };

  return (
    <SheetShell c={c} title={editing ? "ویرایش پروژه" : "ثبت پروژه‌ی سرمایه‌گذاری"} onClose={onClose}>
      <Field c={c} label="عنوان پروژه"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder="مثلاً برج مروارید — واحد ۱۲" /></Field>
      <div className="flex" style={{ gap: SP.sm }}>
        <div style={{ flex: 1 }}><Field c={c} label="نوع ملک"><Select c={c} value={f.propertyType} onChange={set("propertyType")} options={TYPE_FILTERS.slice(1).map((t) => ({ value: t, label: t }))} /></Field></div>
        <div style={{ flex: 1 }}><Field c={c} label="نوع سرمایه‌گذاری"><Select c={c} value={f.investmentType} onChange={set("investmentType")} options={INVESTMENT_TYPES.map((t) => ({ value: t, label: t }))} /></Field></div>
      </div>
      <Field c={c} label="آدرس"><input style={inputStyle(c)} value={f.address} onChange={set("address")} /></Field>
      <div className="flex" style={{ gap: SP.sm }}>
        <div style={{ flex: 1 }}><Field c={c} label="متراژ"><input style={inputStyle(c)} inputMode="numeric" value={f.area} onChange={set("area")} /></Field></div>
        <div style={{ flex: 1 }}><Field c={c} label="طبقه"><input style={inputStyle(c)} inputMode="numeric" value={f.floor} onChange={set("floor")} /></Field></div>
      </div>
      <Field c={c} label="تاریخ خرید"><JalaliDatePicker c={c} value={f.purchaseDate} onChange={(iso) => setF({ ...f, purchaseDate: iso })} /></Field>
      <div className="flex" style={{ gap: SP.sm }}>
        <div style={{ flex: 1 }}><Field c={c} label="قیمت خرید (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.purchasePrice} onChange={set("purchasePrice")} /></Field></div>
        <div style={{ flex: 1 }}><Field c={c} label="ارزش روز (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.currentValue} onChange={set("currentValue")} placeholder="اگر خالی، برابر قیمت خرید" /></Field></div>
      </div>
      <Field c={c} label="وضعیت پروژه"><Select c={c} value={f.status} onChange={set("status")} options={INVESTMENT_STATUSES.map((s) => ({ value: s, label: s }))} /></Field>
      <Field c={c} label="توضیحات"><input style={inputStyle(c)} value={f.desc} onChange={set("desc")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ثبت پروژه"} disabled={!valid} onClick={save} />
    </SheetShell>
  );
}

function PartnerForm({ c, onClose, onSave, editing }) {
  const [f, setF] = useState(editing || { name: "", percent: "", capital: "", account: "", card: "", sheba: "", phone: "", email: "", note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && f.percent;
  return (
    <SheetShell c={c} title={editing ? "ویرایش شریک" : "افزودن شریک"} onClose={onClose}>
      <Field c={c} label="نام"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <div className="flex" style={{ gap: SP.sm }}>
        <div style={{ flex: 1 }}><Field c={c} label="درصد مالکیت"><input style={inputStyle(c)} inputMode="numeric" value={f.percent} onChange={set("percent")} /></Field></div>
        <div style={{ flex: 1 }}><Field c={c} label="مبلغ سرمایه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.capital} onChange={set("capital")} /></Field></div>
      </div>
      <PhoneField c={c} label="تلفن" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} onPickContact={({ name, phone }) => setF((prev) => ({ ...prev, name: name || prev.name, phone: phone || prev.phone }))} />
      <Field c={c} label="ایمیل"><input style={inputStyle(c)} dir="ltr" value={f.email} onChange={set("email")} /></Field>
      <div className="flex" style={{ gap: SP.sm }}>
        <div style={{ flex: 1 }}><Field c={c} label="شماره حساب"><input style={inputStyle(c)} dir="ltr" value={f.account} onChange={set("account")} /></Field></div>
        <div style={{ flex: 1 }}><Field c={c} label="شماره کارت"><input style={inputStyle(c)} dir="ltr" value={f.card} onChange={set("card")} /></Field></div>
      </div>
      <Field c={c} label="شماره شبا"><input style={inputStyle(c)} dir="ltr" value={f.sheba} onChange={set("sheba")} /></Field>
      <Field c={c} label="یادداشت"><input style={inputStyle(c)} value={f.note} onChange={set("note")} /></Field>
      <SubmitBtn c={c} label="ذخیره شریک" disabled={!valid} onClick={() => { onSave({ id: editing?.id || uid(), ...f, percent: toNum(f.percent), capital: toNum(f.capital) }); onClose(); }} />
    </SheetShell>
  );
}

// Payments and checks, merged: pick a method, and if it's a check, two extra
// fields (bank + due date) and a status appear — one form, one ledger.
function InvestmentPaymentForm({ c, onClose, onSave, editing }) {
  const [f, setF] = useState(editing || { amount: "", date: todayISO(), desc: "", method: INVESTMENT_PAYMENT_METHODS[0], bank: "", dueDate: todayISO(), checkStatus: CHECK_STATUSES[0] });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isCheck = f.method === "چک";
  const valid = f.amount;
  return (
    <SheetShell c={c} title={editing ? "ویرایش پرداخت" : "ثبت پرداخت"} onClose={onClose}>
      <Field c={c} label="روش پرداخت">
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {INVESTMENT_PAYMENT_METHODS.map((m) => { const active = f.method === m; return (
            <button key={m} onClick={() => setF({ ...f, method: m })} className="press" style={{ paddingInline: SP.md, paddingBlock: SP.sm, borderRadius: RAD.md, background: active ? c.primary : c.surface2, color: active ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.caption }}>{m}</button>
          ); })}
        </div>
      </Field>
      <Field c={c} label="مبلغ (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.amount} onChange={set("amount")} />
        <p style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>{fmtToman(toNum(f.amount))}</p>
      </Field>
      <Field c={c} label="تاریخ"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      {isCheck && (
        <>
          <Field c={c} label="بانک"><input style={inputStyle(c)} value={f.bank} onChange={set("bank")} /></Field>
          <Field c={c} label="تاریخ سررسید"><JalaliDatePicker c={c} value={f.dueDate} onChange={(iso) => setF({ ...f, dueDate: iso })} /></Field>
          <Field c={c} label="وضعیت چک"><Select c={c} value={f.checkStatus} onChange={set("checkStatus")} options={CHECK_STATUSES.map((s) => ({ value: s, label: s }))} /></Field>
        </>
      )}
      <Field c={c} label="توضیح"><input style={inputStyle(c)} value={f.desc} onChange={set("desc")} /></Field>
      <SubmitBtn c={c} label="ذخیره" disabled={!valid} onClick={() => { onSave({ id: editing?.id || uid(), ...f, amount: toNum(f.amount) }); onClose(); }} />
    </SheetShell>
  );
}

function InvestmentExpenseForm({ c, onClose, onSave }) {
  const [f, setF] = useState({ amount: "", date: todayISO(), payer: "", desc: "", category: INVESTMENT_EXPENSE_CATEGORIES[0] });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.amount;
  return (
    <SheetShell c={c} title="ثبت هزینه" onClose={onClose}>
      <Field c={c} label="دسته‌بندی"><Select c={c} value={f.category} onChange={set("category")} options={INVESTMENT_EXPENSE_CATEGORIES.map((x) => ({ value: x, label: x }))} /></Field>
      <Field c={c} label="مبلغ (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.amount} onChange={set("amount")} />
        <p style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>{fmtToman(toNum(f.amount))}</p>
      </Field>
      <Field c={c} label="تاریخ"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="پرداخت‌کننده"><input style={inputStyle(c)} value={f.payer} onChange={set("payer")} /></Field>
      <Field c={c} label="توضیح"><input style={inputStyle(c)} value={f.desc} onChange={set("desc")} /></Field>
      <SubmitBtn c={c} label="ثبت هزینه" disabled={!valid} onClick={() => { onSave({ id: uid(), ...f, amount: toNum(f.amount) }); onClose(); }} />
    </SheetShell>
  );
}

// "اگر امروز بفروشم" — Exit Strategy and Partner Settlement merged into one
// calculator, since they're the same underlying math viewed from two angles:
// the project's net proceeds, and exactly who gets how much of them.
function ExitStrategyCard({ c, inv, onClose }) {
  const stats = computeInvestmentStats(inv);
  const [salePrice, setSalePrice] = useState(String(stats.currentValue || inv.purchasePrice || 0));
  const [taxPct, setTaxPct] = useState("5");
  const [commissionPct, setCommissionPct] = useState("2");

  const sp = toNum(salePrice);
  const tax = sp * (toNum(taxPct) / 100);
  const commission = sp * (toNum(commissionPct) / 100);
  const pendingChecks = stats.pendingChecksTotal;
  const netProceeds = sp - tax - commission - pendingChecks;
  const netProfit = netProceeds - stats.costBasis;

  return (
    <SheetShell c={c} title="اگر امروز بفروشم" onClose={onClose}>
      <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>مالیات و کمیسیون تخمینی است — عدد دقیق را خودت بر اساس شرایط معامله وارد کن.</p>
      <Field c={c} label="قیمت فروش فرضی (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} /></Field>
      <div className="flex" style={{ gap: SP.sm }}>
        <div style={{ flex: 1 }}><Field c={c} label="مالیات (٪ تخمینی)"><input style={inputStyle(c)} inputMode="numeric" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field c={c} label="کمیسیون (٪)"><input style={inputStyle(c)} inputMode="numeric" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} /></Field></div>
      </div>

      <div style={{ marginTop: SP.md, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
        <Row c={c} label="قیمت فروش" value={fmtToman(sp)} />
        <Row c={c} label="مالیات" value={`- ${fmtToman(tax)}`} color={c.danger} />
        <Row c={c} label="کمیسیون" value={`- ${fmtToman(commission)}`} color={c.danger} />
        {pendingChecks > 0 && <Row c={c} label="چک‌های باقی‌مانده" value={`- ${fmtToman(pendingChecks)}`} color={c.danger} />}
        <Row c={c} label="بهای تمام‌شده" value={`- ${fmtToman(stats.costBasis)}`} color={c.danger} />
        <div className="flex items-center justify-between" style={{ marginTop: SP.sm, paddingTop: SP.sm, borderTop: `1px solid ${c.border}` }}>
          <span style={{ fontSize: FS.body, fontWeight: FW.bold }}>سود خالص</span>
          <span style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: netProfit >= 0 ? c.success : c.danger, direction: "ltr" }}>{netProfit >= 0 ? "+" : ""}{fmtToman(netProfit)}</span>
        </div>
      </div>

      {inv.partners.length > 0 && (
        <div style={{ marginTop: SP.lg }}>
          <p style={{ fontSize: FS.body, fontWeight: FW.bold, marginBottom: SP.sm }}>سهم هر شریک (سرمایه + سود)</p>
          <div className="flex flex-col" style={{ gap: SP.sm }}>
            {inv.partners.map((p) => {
              const share = netProfit * ((Number(p.percent) || 0) / 100);
              const finalAmount = (Number(p.capital) || 0) + share;
              return (
                <div key={p.id} className="flex items-center justify-between" style={{ padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
                  <div>
                    <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{p.name}</p>
                    <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>سرمایه {fmtBudgetShort(p.capital)} + سهم سود {share >= 0 ? "+" : ""}{fmtBudgetShort(share)}</p>
                  </div>
                  <span style={{ fontSize: FS.body + 1, fontWeight: FW.heavy, color: c.primary, direction: "ltr" }}>{fmtBudgetShort(finalAmount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SheetShell>
  );
}

function InvestmentDetail({ id, ctx, onBack }) {
  const { c, investments, setInvestments, notify } = ctx;
  const inv = investments.find((x) => x.id === id);
  const [showEdit, setShowEdit] = useState(false);
  const [showPartner, setShowPartner] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [showExpense, setShowExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  if (!inv) return null;
  const stats = computeInvestmentStats(inv);
  const percentOk = inv.partners.length === 0 || Math.round(stats.partnerPercentSum) === 100;

  const update = (fn) => setInvestments((prev) => prev.map((x) => x.id === id ? fn(x) : x));
  const savePartner = (partner) => update((x) => ({ ...x, partners: x.partners.some((p) => p.id === partner.id) ? x.partners.map((p) => p.id === partner.id ? partner : p) : [...x.partners, partner] }));
  const removePartner = (pid) => update((x) => ({ ...x, partners: x.partners.filter((p) => p.id !== pid) }));
  const saveExpense = (exp) => update((x) => ({ ...x, expenses: [exp, ...x.expenses] }));
  const removeExpense = (eid) => update((x) => ({ ...x, expenses: x.expenses.filter((e) => e.id !== eid) }));
  const savePayment = (pay) => update((x) => ({ ...x, payments: (x.payments || []).some((p) => p.id === pay.id) ? x.payments.map((p) => p.id === pay.id ? pay : p) : [pay, ...(x.payments || [])] }));
  const removePayment = (pid) => update((x) => ({ ...x, payments: (x.payments || []).filter((p) => p.id !== pid) }));
  const addDocs = async (fileList) => { setUploadingDoc(true); const items = await filesToMedia(fileList); update((x) => ({ ...x, documents: [...(x.documents || []), ...items] })); setUploadingDoc(false); };
  const removeDoc = (did) => update((x) => ({ ...x, documents: (x.documents || []).filter((d) => d.id !== did) }));

  return (
    <div className="pt-2">
      <BackHeader c={c} title="جزئیات پروژه" onBack={onBack} onEdit={() => setShowEdit(true)} onDelete={() => { setInvestments((prev) => prev.filter((x) => x.id !== id)); onBack(); notify("پروژه حذف شد"); }} />

      <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 style={{ fontSize: FS.title, fontWeight: FW.heavy }}>{inv.title}</h3>
            <div className="flex items-center" style={{ gap: SP.xs, marginTop: SP.sm, color: c.muted, fontSize: FS.caption }}><MapPin size={13} />{inv.address || "بدون آدرس"}</div>
          </div>
          <span className="rounded-full shrink-0" style={{ fontSize: 11, fontWeight: FW.bold, color: c.purple, background: c.purpleSoft, padding: "4px 10px" }}>{inv.status}</span>
        </div>

        <div className="grid grid-cols-4" style={{ gap: SP.sm, marginTop: SP.lg, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
          {[
            { icon: Ruler, label: inv.area ? `${faDigits(inv.area)} متر` : "—" },
            { icon: Building, label: inv.floor ? `طبقه ${faDigits(inv.floor)}` : "—" },
            { icon: CalendarDays, label: inv.buildYear ? faDigits(inv.buildYear) : "—" },
            { icon: typeIcon(inv.propertyType), label: inv.propertyType },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center" style={{ gap: SP.xs + 1 }}>
              <s.icon size={18} color={c.muted} />
              <span style={{ fontSize: FS.caption, color: c.ink, fontWeight: FW.medium, textAlign: "center" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {inv.desc && <p style={{ fontSize: FS.caption, color: c.muted, marginTop: SP.md, lineHeight: 1.8 }}>{inv.desc}</p>}
      </div>

      {/* Auto profit calculation — the core promise of this module */}
      <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
        <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.md }}>محاسبه‌ی سود</p>
        <Row c={c} label="قیمت خرید" value={fmtToman(inv.purchasePrice)} />
        <Row c={c} label="جمع هزینه‌ها" value={fmtToman(stats.totalExpenses)} color={c.attn} />
        <Row c={c} label="بهای تمام‌شده" value={fmtToman(stats.costBasis)} />
        <Row c={c} label="ارزش روز" value={fmtToman(stats.currentValue)} color={c.primary} />
        <div className="flex items-center justify-between" style={{ marginTop: SP.md, paddingTop: SP.md, borderTop: `1px solid ${c.border}` }}>
          <span style={{ fontSize: FS.body, fontWeight: FW.bold }}>سود / زیان واقعی</span>
          <span style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, color: stats.profit >= 0 ? c.success : c.danger, direction: "ltr" }}>{stats.profit >= 0 ? "+" : ""}{fmtToman(stats.profit)} ({faDigits(Math.round(stats.profitPct))}٪)</span>
        </div>
        {stats.holdDays > 0 && (
          <div className="flex items-center justify-between" style={{ marginTop: SP.xs }}>
            <span style={{ fontSize: FS.caption, color: c.muted }}>ROI سالانه‌شده · {faDigits(Math.round(stats.holdDays / 30))} ماه نگهداری</span>
            <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.muted, direction: "ltr" }}>{faDigits(Math.round(stats.annualizedRoi))}٪ / سال</span>
          </div>
        )}
        <button onClick={() => setShowExit(true)} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.lg, paddingBlock: SP.sm + 2, borderRadius: RAD.md, background: c.ink, color: c.bg, fontWeight: FW.bold, fontSize: FS.caption + 1 }}>
          <TrendingUp size={14} color={c.bg} />اگر امروز بفروشم
        </button>
      </div>

      {/* Cash flow — money in vs out, and what's pending */}
      <div className="grid grid-cols-3" style={{ gap: SP.sm, marginBottom: SP.md }}>
        <div style={{ padding: SP.md, borderRadius: RAD.md, ...glass(c) }}>
          <p style={{ fontSize: 10, color: c.muted }}>ورود پول</p>
          <p style={{ fontSize: FS.caption + 1, fontWeight: FW.heavy, color: c.success, marginTop: 3 }}>{fmtBudgetShort(stats.cashIn)}</p>
        </div>
        <div style={{ padding: SP.md, borderRadius: RAD.md, ...glass(c) }}>
          <p style={{ fontSize: 10, color: c.muted }}>خروج پول</p>
          <p style={{ fontSize: FS.caption + 1, fontWeight: FW.heavy, color: c.danger, marginTop: 3 }}>{fmtBudgetShort(stats.cashOut)}</p>
        </div>
        <div style={{ padding: SP.md, borderRadius: RAD.md, ...glass(c) }}>
          <p style={{ fontSize: 10, color: c.muted }}>مانده</p>
          <p style={{ fontSize: FS.caption + 1, fontWeight: FW.heavy, marginTop: 3 }}>{fmtBudgetShort(stats.cashBalance)}</p>
        </div>
      </div>

      {/* Partners */}
      <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
        <div className="flex items-center justify-between" style={{ marginBottom: SP.md }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>شرکا</p>
          <button onClick={() => { setEditPartner(null); setShowPartner(true); }} className="press flex items-center" style={{ gap: 4, fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}><Plus size={13} color={c.primary} />افزودن</button>
        </div>
        {!percentOk && (
          <div className="flex items-center" style={{ gap: SP.xs, marginBottom: SP.md, padding: SP.sm, borderRadius: RAD.sm, background: c.dangerSoft, color: c.danger, fontSize: FS.caption }}>
            <AlertTriangle size={13} color={c.danger} />جمع درصدها {faDigits(Math.round(stats.partnerPercentSum))}٪ است، نه ۱۰۰٪
          </div>
        )}
        <div className="flex flex-col" style={{ gap: SP.sm }}>
          {inv.partners.map((p) => (
            <div key={p.id} className="flex items-center" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{p.name}</p>
                <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{faDigits(p.percent)}٪ · {fmtBudgetShort(p.capital)}</p>
              </div>
              <button onClick={() => { setEditPartner(p); setShowPartner(true); }} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface }}><Edit3 size={12} color={c.muted} /></button>
              <button onClick={() => removePartner(p.id)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c.surface }}><Trash2 size={12} color={c.danger} /></button>
            </div>
          ))}
          {inv.partners.length === 0 && <EmptyLine c={c} text="شریکی ثبت نشده" />}
        </div>
      </div>

      {/* Expenses */}
      <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
        <div className="flex items-center justify-between" style={{ marginBottom: SP.md }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>هزینه‌ها</p>
          <button onClick={() => setShowExpense(true)} className="press flex items-center" style={{ gap: 4, fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}><Plus size={13} color={c.primary} />ثبت هزینه</button>
        </div>
        <div className="flex flex-col" style={{ gap: SP.sm }}>
          {inv.expenses.map((e) => (
            <div key={e.id} className="flex items-center" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{e.category}{e.desc ? ` — ${e.desc}` : ""}</p>
                <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{fmtJalali(e.date)}{e.payer ? ` · ${e.payer}` : ""}</p>
              </div>
              <span style={{ fontSize: FS.body, fontWeight: FW.bold, color: c.attn, direction: "ltr" }}>{fmtBudgetShort(e.amount)}</span>
              <button onClick={() => removeExpense(e.id)} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface }}><Trash2 size={12} color={c.danger} /></button>
            </div>
          ))}
          {inv.expenses.length === 0 && <EmptyLine c={c} text="هزینه‌ای ثبت نشده" />}
        </div>
      </div>

      {/* Payments & checks — merged ledger */}
      <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
        <div className="flex items-center justify-between" style={{ marginBottom: SP.md }}>
          <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>پرداخت‌ها و چک‌ها</p>
          <button onClick={() => { setEditPayment(null); setShowPayment(true); }} className="press flex items-center" style={{ gap: 4, fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}><Plus size={13} color={c.primary} />ثبت پرداخت</button>
        </div>
        <div className="flex flex-col" style={{ gap: SP.sm }}>
          {(inv.payments || []).map((p) => {
            const isCheck = p.method === "چک";
            const checkTone = p.checkStatus === "پاس شده" ? c.success : p.checkStatus === "برگشت خورده" || p.checkStatus === "باطل شده" ? c.danger : c.attn;
            return (
              <div key={p.id} className="flex items-center" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{p.method}{p.desc ? ` — ${p.desc}` : ""}</p>
                  <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>
                    {isCheck ? `سررسید ${fmtJalali(p.dueDate)}${p.bank ? ` · ${p.bank}` : ""}` : fmtJalali(p.date)}
                  </p>
                </div>
                {isCheck && <span className="rounded-full shrink-0" style={{ fontSize: 10, fontWeight: FW.bold, color: checkTone, background: checkTone + "1f", padding: "3px 8px" }}>{p.checkStatus}</span>}
                <span style={{ fontSize: FS.body, fontWeight: FW.bold, color: c.success, direction: "ltr" }}>{fmtBudgetShort(p.amount)}</span>
                <button onClick={() => { setEditPayment(p); setShowPayment(true); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface }}><Edit3 size={12} color={c.muted} /></button>
                <button onClick={() => removePayment(p.id)} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface }}><Trash2 size={12} color={c.danger} /></button>
              </div>
            );
          })}
          {(inv.payments || []).length === 0 && <EmptyLine c={c} text="پرداختی ثبت نشده" />}
        </div>
      </div>

      {/* Documents — reuses the same media pipeline properties use */}
      <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.md, ...glass(c) }}>
        <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.md }}>اسناد و مدارک</p>
        <MediaGallery c={c} media={inv.documents || []} uploading={uploadingDoc} onAdd={addDocs} onRemove={removeDoc} onView={ctx.setLightbox} accept="image/*,video/*,application/pdf,.doc,.docx" />
      </div>

      {showEdit && <InvestmentForm ctx={ctx} editId={id} onClose={() => setShowEdit(false)} />}
      {showPartner && <PartnerForm c={c} editing={editPartner} onClose={() => setShowPartner(false)} onSave={savePartner} />}
      {showExpense && <InvestmentExpenseForm c={c} onClose={() => setShowExpense(false)} onSave={saveExpense} />}
      {showPayment && <InvestmentPaymentForm c={c} editing={editPayment} onClose={() => setShowPayment(false)} onSave={savePayment} />}
      {showExit && <ExitStrategyCard c={c} inv={inv} onClose={() => setShowExit(false)} />}
    </div>
  );
}

function BackHeader({ c, title, onBack, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-4">
      <button onClick={onBack} aria-label="بازگشت" className="press w-11 h-11 rounded-full flex items-center justify-center" style={glass(c)}><ArrowRight size={16} color={c.ink} /></button>
      <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.bold }}>{title}</h2>
      <div className="flex items-center gap-2">
        {onEdit && <button onClick={onEdit} aria-label="ویرایش" className="press w-11 h-11 rounded-full flex items-center justify-center" style={glass(c)}><Edit3 size={15} color={c.primary} /></button>}
        {onDelete && <button onClick={onDelete} aria-label="حذف" className="press w-11 h-11 rounded-full flex items-center justify-center" style={glass(c)}><Trash2 size={15} color={c.danger} /></button>}
        {!onEdit && !onDelete && <div style={{ width: 36 }} />}
      </div>
    </div>
  );
}

// Owner contact stays hidden by default so the file can be shown to a customer
// without exposing the owner's name and number. One tap reveals it for the agent.
function OwnerReveal({ c, owner }) {
  const [shown, setShown] = useState(false);
  if (!shown) {
    return (
      <button onClick={() => setShown(true)} className="press flex items-center gap-1.5 mt-3 rounded-lg px-3 py-2" style={{ background: c.surface2 }}>
        <Eye size={13} color={c.primary} />
        <span style={{ fontSize: 11, color: c.primary, fontWeight: 700 }}>نمایش اطلاعات مالک</span>
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: c.surface2 }}>
      <div className="flex items-center gap-1.5" style={{ color: c.ink, fontSize: 13, fontWeight: 600 }}>
        <UserCircle2 size={14} color={c.primary} /> {owner.name}
      </div>
      {owner.phone && (
        <div className="flex items-center justify-between mt-2">
          <span dir="ltr" style={{ fontSize: 13, color: c.muted }}>{owner.phone}</span>
          <a href={`tel:${owner.phone}`} className="press flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: c.successSoft }}>
            <PhoneCall size={12} color={c.success} /><span style={{ fontSize: 11, fontWeight: 700, color: c.success }}>تماس</span>
          </a>
        </div>
      )}
    </div>
  );
}

function MediaGallery({ c, media, onAdd, onRemove, onView, uploading, accept = "image/*,video/*" }) {
  const inputRef = useRef(null);
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      <button onClick={() => inputRef.current?.click()} className="press shrink-0 rounded-lg flex flex-col items-center justify-center gap-1" style={{ width: 84, height: 84, ...glass(c) }}>
        {uploading ? <Loader2 size={18} color={c.primary} className="animate-spin" /> : <ImagePlus size={18} color={c.primary} />}
        <span style={{ fontSize: 10, color: c.primary, fontWeight: 700 }}>افزودن</span>
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple hidden onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
      {media.map((m, mi) => (
        <div key={m.id} className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 84, height: 84 }}>
          <button onClick={() => onView({ media, index: mi })} className="w-full h-full">
            {m.type === "image" ? <MediaThumb item={m} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.type === "video" ? (
              <div className="relative w-full h-full"><video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /><div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}><Play size={18} color="#fff" fill="#fff" /></div></div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full" style={{ background: c.surface2, padding: 8 }}>
                <FileText size={22} color={c.muted} />
                <span style={{ fontSize: 10, color: c.muted, marginTop: 4, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{m.name || "فایل"}</span>
              </div>
            )}
          </button>
          <button onClick={() => onRemove(m.id)} className="press absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}><X size={11} color="#fff" /></button>
        </div>
      ))}
    </div>
  );
}
function Lightbox({ item, onClose }) {
  // item can be a single media object (legacy) or { media:[...], index }
  const media = item.media || [item];
  const [idx, setIdx] = useState(item.index || 0);
  const touch = useRef({ x: 0 });
  const cur = media[idx];
  const atStart = idx === 0, atEnd = idx === media.length - 1;
  const go = (d) => setIdx((i) => Math.max(0, Math.min(media.length - 1, i + d)));

  return (
    <BodyPortal onClose={onClose}>
    <div className="fixed inset-0 z-[90] flex flex-col flora-pop" style={{ background: "rgba(0,0,0,0.94)" }} onClick={onClose}>
      {/* top bar: close + counter, clear of the notch */}
      <div className="flex items-center justify-between px-5 shrink-0" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 12 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="بستن" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><X size={16} color="#fff" /></button>
        {media.length > 1 && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, direction: "ltr" }}>{idx + 1} / {media.length}</span>}
      </div>

      {/* image area — centered, fills the middle */}
      <div
        className="flex-1 flex items-center justify-center relative px-4"
        style={{ minHeight: 0 }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touch.current.x = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touch.current.x;
          if (Math.abs(dx) > 45) go(dx > 0 ? -1 : 1); // RTL: swipe right = previous
        }}
      >
        {/* key={cur.id} forces a fresh mount per photo, so switching images
            in the gallery re-triggers the fade+scale-in instead of one photo
            silently replacing another mid-frame (MOTION SYSTEM item 5). */}
        {cur.type === "image"
          ? <div key={cur.id} className="flora-gallery-fade" style={{ maxWidth: "100%", maxHeight: "100%" }}><MediaFull item={cur} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14, objectFit: "contain" }} kenBurns /></div>
          : cur.type === "video"
          ? <video src={cur.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14 }} />
          : (
            <div className="flex flex-col items-center" style={{ gap: 12 }}>
              <FileText size={48} color="rgba(255,255,255,0.7)" />
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{cur.name || "فایل"}</p>
              <a href={cur.url} download={cur.name || "file"} className="press" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", padding: "10px 20px", borderRadius: 999 }}>باز کردن / دانلود</a>
            </div>
          )}

        {/* arrow buttons (RTL: right arrow = previous, left arrow = next) */}
        {media.length > 1 && !atStart && (
          <button onClick={() => go(-1)} className="press absolute top-1/2 right-3 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)", transform: "translateY(-50%)", backdropFilter: "blur(6px)" }}>
            <ChevronRight size={22} color="#fff" />
          </button>
        )}
        {media.length > 1 && !atEnd && (
          <button onClick={() => go(1)} className="press absolute top-1/2 left-3 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)", transform: "translateY(-50%)", backdropFilter: "blur(6px)" }}>
            <ChevronLeft size={22} color="#fff" />
          </button>
        )}
      </div>

      {/* dots */}
      {media.length > 1 && (
        <div className="flex items-center justify-center gap-2 shrink-0" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
          {media.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 999, background: i === idx ? "#fff" : "rgba(255,255,255,0.4)", transition: "all .25s ease" }} />
          ))}
        </div>
      )}
    </div>
    </BodyPortal>
  );
}

// Read-only map preview shown on a property's detail page once a location has been pinned.
function PropertyMiniMap({ c, lat, lng, title }) {
  const ref = useRef(null); const objRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current || objRef.current) return;
      const map = L.map(ref.current, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false }).setView([lat, lng], 16);
      L.tileLayer(DARK_TILE_URL, { attribution: "", maxZoom: 20, maxNativeZoom: 16 }).addTo(map);
      L.marker([lat, lng]).addTo(map);
      objRef.current = map;
    });
    return () => { cancelled = true; if (objRef.current) { objRef.current.remove(); objRef.current = null; } };
  }, [lat, lng]);
  return (
    <div className="rounded-2xl overflow-hidden mb-3 flora-dark-map" style={glass(c)}>
      <div ref={ref} style={{ width: "100%", height: 160, background: c.surface2 }} />
      <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer"
        className="press flex items-center justify-center gap-1.5 py-3" style={{ background: c.primarySoft, color: c.primary, fontSize: 11, fontWeight: 700 }}>
        <MapPin size={13} /> مسیریابی به {title}
      </a>
    </div>
  );
}

// AI ad-copywriter for Divar/Sheypoor wall ads. Encodes the exact rules given:
// banned cliché headlines, mandatory headline structure, AIDA (luxury/new) and PAS
// (pre-sale/investment) body formulas, 5 sales-psychology principles, and a clear
// call to action. Produces 3 ready-to-paste variants as a swipeable cover carousel.
function DivarAdCard({ ctx, p }) {
  const { c, hasAiKey, callAI, notify, builders, agencyCity } = ctx;
  const [variants, setVariants] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); return; }
    setLoading(true);
    try {
      const builderName = builders.find((b) => b.id === p.builderId)?.name || "";
      const isPre = p.deal === "پیش‌فروش";
      const condition = isPre ? `پیش‌فروش — ${p.buildStage || "در حال ساخت"}` : (p.furnished || "کلید نخورده");
      const payment = isPre
        ? `پیش‌پرداخت ${fmtToman(p.preDown || 0)}، ${faDigits(p.preMonths || 0)} ماه قسط، تحویل ${faDigits(p.preDelivery || 0)} ماه دیگر`
        : "نقد و توافقی";
      const prompt = `تو برترین آگهی‌نویس ملک در دنیا هستی. هدف تو ساخت آگهی‌هایی است که بالاترین نرخ کلیک (View) و بیشترین زنگ‌خور (Call) را در پلتفرم‌هایی مثل دیوار و شیپور ایجاد کنند. برای این ملک باید یک آگهی بی‌نظیر بسازی — دقیقاً طبق این قوانین:

قانون اوگیلوی (بدون کلمات توخالی) — مهم‌ترین قانون:
- کلمات پوچ و تبلیغاتی مثل «سوپرلوکس»، «سلطنتی»، «شاهانه»، «الیت»، «بی‌نظیر»، «بی‌همتا»، «رویایی» اکیداً ممنوع است.
- به‌جای ادعا، همیشه از عدد دقیق، جنس مشخص و واقعیت قابل‌اندازه‌گیری استفاده کن. مثال: به‌جای «کف لوکس» بنویس «سرامیک پرسلان فوق‌پولیش ۱۲۰×۱۲۰».
- هر ادعایی که نمی‌توانی با عدد یا جنس پشتیبانی کنی، حذفش کن.

سه ترس اصلی خریدار ایرانی — هر سه باید در متن پاسخ داده شوند:
۱. ترس از آگهی فیک: این جمله را عیناً بیاور: «📸 تمام عکس‌ها ۱۰۰٪ واقعی، مربوط به همین ملک و بدون ادیت است.»
۲. ترس از مشکل سند: وضعیت سند را صریح بنویس (مثلاً «سند تک‌برگ شش‌دانگ، آماده‌ی انتقال فوری»). اگر سند در جریان است، همان را شفاف بگو — دروغ ننویس.
۳. ترس از قیمت بالا: شرایط پرداخت را شفاف کن و انعطاف (اقساط بلندمدت، معاوضه، تخفیف نقدی) را برجسته کن.

قوانین تیتر (Headline — ۸۰٪ موفقیت آگهی):
- ممنوعیت‌ها: کلمات شاعرانه، مبهم و کلیشه‌ای مثل «جلال و آرامش» یا «بهترین فایل منطقه» اکیداً ممنوع است.
- اجزای الزامی تیتر: لوکیشن/موقعیت + مشخصه‌ی یکتای اصلی (مثلاً حیاط ۱۲۰ متری) + قلاب مالی (مثلاً اقساط).
- کلمات کلیدی جذاب که در جای مناسب استفاده کن: اقساط بلندمدت، زیر فی، کلاب تفریحی، بدون ۱ ریال خرج، معاوضه، تحویل نزدیک، ویو ابدی، کلید نخورده.

قانون ۳ ثانیه (خوانایی موبایل):
- از بولت (✅) و شکست خط تمیز استفاده کن تا در ۳ ثانیه اسکن شود. پاراگراف طولانی ممنوع.
- نکات «بدون اصطکاک» را برجسته کن (مثل «بدون ۱ ریال خرج اضافه»، «نصب کامل برندها»).

قوانین بدنه (Body Text) — بسته به نوع ملک یکی از این دو فرمول را استفاده کن:
فرمول AIDA (برای املاک لوکس، نوساز و فرنیش‌شده): Attention با یک جمله‌ی چالش‌برانگیز یا حل یک دردسر بزرگ؛ Interest با مشخصات کلیدی (متراژ، خواب، طبقه، برند سازنده)؛ Desire با تصویرسازی ذهنی از کیفیت زندگی و امکانات خاص؛ Action با دعوت مستقیم به تماس با حس فوریت.
فرمول PAS (برای پیش‌فروش، سرمایه‌گذاری و شرایط بحرانی): Problem با دغدغه‌ی خریدار (تورم، کمبود نقدینگی)؛ Agitation با هشدار درباره‌ی سخت‌تر شدن خرید در آینده؛ Solution با معرفی ملک و شرایط پرداخت به‌عنوان تنها راه‌حل.

۵ اصل روان‌شناسی فروش که باید در متن رعایت شود:
۱. حذف اصطکاک: اگر فول‌فرنیش است روی «بدون ۱ ریال خرج» و «فقط با چمدان بیاورید» مانور بده.
۲. اعتمادسازی: به سوابق سازنده، واقعی‌بودن آگهی، یا درصد پیشرفت کار اشاره کن.
۳. مزیت مالی واضح: اعداد اقساط، پیش‌پرداخت یا درصد تخفیف را شفاف بنویس.
۴. کمیابی منطقی (روش کریس ووس): هشدار کمیابی باید دلیل منطقی داشته باشد، نه اغراق. مثال: «ملکی با حیاط اختصاصی ۱۲۰ متری روی میدان اصلی، زیاد در بازار نمی‌ماند.»
۵. دعوت به اقدام مشخص (روش جردن بلفورت): در پایان دقیقاً بگو برای چه کاری تماس بگیرند — «برای دریافت ویدیوی بدون ادیت، بررسی سند، یا هماهنگی بازدید اختصاصی همین حالا تماس بگیرید» — و ساعت پاسخگویی را ذکر کن.

مشخصات این ملک:
نوع ملک: ${p.type}
متراژ و طبقه: ${faDigits(p.area)} متر، طبقه ${faDigits(p.floor || 1)}
تعداد خواب: ${faDigits(p.rooms || 0)} خواب
لوکیشن: ${p.address || agencyCity || "نامشخص"}
وضعیت ملک: ${condition}
شرایط پرداخت: ${payment}
${builderName ? `نام سازنده: ${builderName}` : ""}
قیمت کل: ${fmtToman(p.price)}

نکته‌ی مهم: فقط از همین اطلاعات واقعی بالا استفاده کن. جزئیاتی که به تو داده نشده (مثل جنس کف، برند آسانسور یا متراژ حیاط) را از خودت نساز — اگر لازم بود، به‌جای عدد ساختگی بنویس که برای جزئیات تماس بگیرند.

سه مدل آگهی متفاوت بساز و دقیقاً همین JSON خام را برگردان (بدون توضیح، بدون markdown):
{"variants":[
{"label":"بمب زنگ‌خور","headline":"...","body":"..."},
{"label":"وی‌آی‌پی و احساسی","headline":"...","body":"..."},
{"label":"چکشی و کوتاه","headline":"...","body":"..."}
]}
گزینه‌ی اول با فرمول PAS روی شرایط پرداخت و اقساط تمرکز کند، گزینه‌ی دوم با فرمول AIDA روی پرستیژ و کیفیت زندگی، گزینه‌ی سوم کوتاه و پرقدرت برای خوانش سریع در دیوار یا استوری باشد. body هر کدام حداکثر ۶۰۰ کاراکتر و شامل پاراگراف‌بندی طبیعی با \\n باشد.`;
      const raw = await callAI(prompt);
      const jsonMatch2 = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch2) throw new Error("پاسخ قابل‌خواندن نبود — دوباره امتحان کن");
      const parsed = JSON.parse(jsonMatch2[0]);
      setVariants(parsed.variants || []);
      setActive(0);
    } catch (e) {
      notify(e instanceof SyntaxError ? "پاسخ هوش مصنوعی قابل‌خواندن نبود — دوباره امتحان کن" : `خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  const copyVariant = (v) => {
    const text = `${v.headline}\n\n${v.body}`;
    navigator.clipboard?.writeText(text).then(() => notify("متن آگهی کپی شد — آماده‌ی پیست در دیوار")).catch(() => notify("کپی نشد — دستی انتخاب کن"));
  };

  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(idx);
  };

  return (
    <div style={{ marginBottom: SP.lg }}>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.md, paddingRight: 2 }}>
        <h2 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, letterSpacing: "-0.01em" }}>آگهی برای دیوار</h2>
        {variants && !loading && (
          <button onClick={generate} className="press flex items-center" style={{ gap: 4, fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}><Sparkles size={12} color={c.primary} />دوباره بساز</button>
        )}
      </div>

      {!variants && !loading && (
        <button onClick={generate} className="press w-full flex items-center justify-center relative overflow-hidden" style={{ gap: SP.sm, paddingBlock: SP.lg, borderRadius: RAD.lg, background: c.gradientPrimary, boxShadow: "0 14px 30px -10px rgba(47,124,246,0.45)" }}>
          <Sparkles size={17} color="#fff" /><span style={{ color: "#fff", fontWeight: FW.bold, fontSize: FS.body + 1 }}>ساخت آگهی حرفه‌ای با هوش مصنوعی</span>
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center" style={{ paddingBlock: SP.xl, borderRadius: RAD.lg, ...glass(c) }}>
          <Loader2 size={26} className="animate-spin" color={c.primary} />
          <p style={{ fontSize: FS.caption, color: c.muted, marginTop: SP.md }}>در حال نوشتن ۳ مدل آگهی حرفه‌ای...</p>
        </div>
      )}

      {variants && !loading && (
        <div>
          {/* swipeable cover carousel — each card is a ready-to-paste Divar cover */}
          <div ref={scrollRef} onScroll={onScroll} className="flex" style={{ gap: SP.md, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: SP.sm, marginInline: -SP.xl, paddingInline: SP.xl }}>
            {variants.map((v, i) => (
              <div key={i} style={{ minWidth: "88%", scrollSnapAlign: "center", borderRadius: RAD.lg, padding: SP.lg, ...glass(c), position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", top: "-40%", left: "-20%", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${c.primary}22, transparent 70%)`, pointerEvents: "none" }} />
                <span className="rounded-full" style={{ fontSize: 10, fontWeight: FW.bold, color: c.primary, background: c.primarySoft, padding: "3px 10px", position: "relative" }}>{v.label}</span>
                <p style={{ fontSize: FS.title, fontWeight: FW.heavy, marginTop: SP.md, lineHeight: 1.4, position: "relative" }}>{v.headline}</p>
                <p style={{ fontSize: FS.caption + 0.5, color: c.muted, marginTop: SP.md, lineHeight: 2, whiteSpace: "pre-line", position: "relative" }}>{v.body}</p>
                <button onClick={() => copyVariant(v)} className="press w-full flex items-center justify-center" style={{ gap: SP.xs, marginTop: SP.lg, paddingBlock: SP.sm + 2, borderRadius: RAD.md, background: c.primarySoft, position: "relative" }}>
                  <Copy size={13} color={c.primary} /><span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.primary }}>کپی متن آگهی</span>
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center" style={{ gap: 4, marginTop: SP.md }}>
            {variants.map((_, i) => <span key={i} style={{ width: i === active ? 16 : 6, height: 6, borderRadius: 999, background: i === active ? c.primary : c.border, transition: "all .3s ease" }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// A full-bleed photo hero with floating glass controls and a glass filmstrip —
// matching the reference. The image itself reacts to scroll: it zooms slightly
// on pull-down (the classic iOS parallax bounce) and drifts/fades as the page
// scrolls past it, all driven by listening to the app's own scroll container
// (found via closest()) so no shared layout code needs to change.
function PropertyHero({ c, p, media, onBack, onEdit, uploading, addMedia, setLightbox }) {
  const heroRef = useRef(null);
  const imgWrapRef = useRef(null);
  const fileRef = useRef(null);

  // Scroll-driven parallax + pull-to-zoom. Measured from the element's own
  // rect rather than scrollTop — iOS Safari doesn't reliably report negative
  // scrollTop during rubber-band overscroll, but the rect always moves. Styles
  // are written straight to the node inside a rAF, so scrolling never triggers
  // a React re-render (that was the source of the jank).
  useEffect(() => {
    const heroEl = heroRef.current;
    const wrapEl = imgWrapRef.current;
    const scrollEl = heroEl?.closest(".overflow-y-auto");
    if (!heroEl || !wrapEl || !scrollEl) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const heroTop = heroEl.getBoundingClientRect().top;
      const containerTop = scrollEl.getBoundingClientRect().top;
      const offset = heroTop - containerTop; // >0 = pulled down, <0 = scrolled up past
      if (offset > 0) {
        // pull-down: grow from the top edge so the photo fills the stretched gap
        const grow = 1 + Math.min(0.4, offset / 300);
        wrapEl.style.transform = `scale(${grow})`;
        wrapEl.style.transformOrigin = "center top";
        wrapEl.style.opacity = "1";
      } else {
        // scrolling past: drift slower than the page and fade out
        const past = -offset;
        wrapEl.style.transform = `translateY(${past * 0.35}px) scale(1)`;
        wrapEl.style.transformOrigin = "center top";
        wrapEl.style.opacity = String(Math.max(0.25, 1 - past / 280));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => { scrollEl.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const cover = media[0];

  const share = async () => {
    const text = `${p.title} — ${fmtToman(p.price)}`;
    if (navigator.share) { try { await navigator.share({ title: p.title, text }); } catch (e) {} }
    else { navigator.clipboard?.writeText(text); }
  };

  return (
    <div ref={heroRef} className="relative overflow-hidden" style={{ margin: "0 -16px", height: 320 }}>
      <div ref={imgWrapRef} style={{ position: "absolute", inset: 0, willChange: "transform, opacity" }}>
        {cover ? (
          cover.type === "image"
            ? <MediaThumb item={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} kenBurns />
            : <video src={cover.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(150deg, ${c.primarySoft}, ${c.purpleSoft})` }}>
            <Building2 size={48} color={c.primary} style={{ opacity: 0.4 }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,14,26,.8) 0%, transparent 32%, rgba(10,14,26,.3) 100%)" }} />
      </div>

      {/* floating glass controls */}
      <div className="absolute flex items-center justify-between" style={{ top: 16, left: 16, right: 16 }}>
        <button onClick={onBack} className="press flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(14px) saturate(180%)", WebkitBackdropFilter: "blur(14px) saturate(180%)" }}><ArrowRight size={17} color="#fff" /></button>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button onClick={share} className="press flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(14px) saturate(180%)", WebkitBackdropFilter: "blur(14px) saturate(180%)" }}><Share2 size={16} color="#fff" /></button>
          <button onClick={onEdit} className="press flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(14px) saturate(180%)", WebkitBackdropFilter: "blur(14px) saturate(180%)" }}><Edit3 size={16} color="#fff" /></button>
        </div>
      </div>

      {/* glass filmstrip */}
      <div className="absolute flex items-center flora-rise" style={{ left: 16, right: 16, bottom: 16, gap: 8, padding: 8, borderRadius: 22, background: "rgba(255,255,255,.14)", backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", border: "1px solid rgba(255,255,255,.2)", overflowX: "auto" }}>
        {media.slice(0, 4).map((m, i) => (
          <button key={m.id} onClick={() => setLightbox({ media, index: i })} className="press shrink-0" style={{ width: 46, height: 46, borderRadius: 14, overflow: "hidden", border: i === 0 ? "2px solid #fff" : "1px solid rgba(255,255,255,.3)" }}>
            {m.type === "image" ? <MediaThumb item={m} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </button>
        ))}
        {media.length > 4 && (
          <button onClick={() => setLightbox({ media, index: 4 })} className="press shrink-0 flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(0,0,0,.5)" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>+{faDigits(media.length - 4)}</span>
          </button>
        )}
        <button onClick={() => fileRef.current?.click()} className="press shrink-0 flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,.16)" }}>
          {uploading ? <Loader2 size={16} className="animate-spin" color="#fff" /> : <Plus size={19} color="#fff" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { if (e.target.files?.length) addMedia(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
}

// Simple read-only "About" card with a read-more toggle — matches the reference.
function AboutPropertyCard({ c, desc }) {
  const [open, setOpen] = useState(false);
  const long = desc.length > 140;
  return (
    <div style={{ borderRadius: RAD.lg, padding: SP.lg, marginBottom: SP.md, ...glass(c) }}>
      <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.sm }}>درباره‌ی ملک</p>
      <p style={{ fontSize: FS.body, color: c.muted, lineHeight: 1.9, display: !open && long ? "-webkit-box" : "block", WebkitLineClamp: !open && long ? 3 : "unset", WebkitBoxOrient: "vertical", overflow: !open && long ? "hidden" : "visible" }}>{desc}</p>
      {long && (
        <button onClick={() => setOpen((v) => !v)} className="press flex items-center justify-center w-full" style={{ gap: SP.xs, marginTop: SP.sm, fontSize: FS.caption, color: c.primary, fontWeight: FW.bold }}>
          {open ? "بستن" : "بیشتر بخوان"}<ChevronDown size={13} color={c.primary} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
        </button>
      )}
    </div>
  );
}

// "Schedule a Visit" — a day strip for the coming week plus fixed time slots,
// booking directly onto the calendar from the file itself (matches the reference).
const VISIT_SLOTS = [{ time: "11:00", label: "۱۱ صبح" }, { time: "13:00", label: "۱ بعدازظهر" }, { time: "17:00", label: "۵ بعدازظهر" }, { time: "19:00", label: "۷ بعدازظهر" }];
function ScheduleVisitCard({ ctx, property }) {
  const { c, setAppointments, notify } = ctx;
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const iso = daysAgoISO(-i).slice(0, 10);
    const [jy, jm, jd] = isoToJalali(iso);
    const dow = new Date(iso).getDay(); // 0=Sun..6=Sat
    return { iso, dayName: ["ی", "د", "س", "چ", "پ", "ج", "ش"][dow], jd, jm };
  }), []);
  const [date, setDate] = useState(days[0].iso);
  const [time, setTime] = useState(null);
  const [customerName, setCustomerName] = useState("");

  const confirm = () => {
    if (!time || !customerName.trim()) { notify("نام مشتری و ساعت بازدید را مشخص کن"); return; }
    setAppointments((prev) => [{ id: uid(), propertyId: property.id, customerId: "", customerName: customerName.trim(), date, time, notes: "" }, ...prev]);
    notify("بازدید ثبت شد");
    setCustomerName(""); setTime(null);
  };

  return (
    <div style={{ borderRadius: RAD.lg, padding: SP.lg, marginBottom: SP.md, ...glass(c) }}>
      <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy, marginBottom: SP.lg }}>تعیین وقت بازدید</p>

      <div className="flex" style={{ gap: SP.sm, overflowX: "auto", paddingBottom: SP.xs, marginBottom: SP.md }}>
        {days.map((d) => { const active = date === d.iso; return (
          <button key={d.iso} onClick={() => setDate(d.iso)} className="press shrink-0 flex flex-col items-center" style={{ width: 52, paddingBlock: SP.sm + 2, borderRadius: RAD.md, gap: SP.xs, background: active ? c.ink : c.surface2 }}>
            <span style={{ fontSize: FS.caption, color: active ? c.bg : c.muted, fontWeight: FW.bold }}>{d.dayName}</span>
            <span style={{ fontSize: FS.body, color: active ? c.bg : c.ink, fontWeight: FW.heavy }}>{faDigits(d.jd)}</span>
          </button>
        ); })}
      </div>

      <div className="flex flex-wrap" style={{ gap: SP.sm, marginBottom: SP.lg }}>
        {VISIT_SLOTS.map((s) => { const active = time === s.time; return (
          <button key={s.time} onClick={() => setTime(s.time)} className="press" style={{ paddingInline: SP.md, paddingBlock: SP.sm + 2, borderRadius: RAD.md, background: active ? c.ink : c.surface2, color: active ? c.bg : c.ink, fontWeight: FW.bold, fontSize: FS.caption }}>{s.label}</button>
        ); })}
      </div>

      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="نام مشتری برای بازدید" style={inputStyle(c)} />
      <button onClick={confirm} className="press w-full" style={{ marginTop: SP.md, paddingBlock: SP.md, borderRadius: RAD.md, background: c.primary, color: "#fff", fontWeight: FW.bold, fontSize: FS.body }}>ثبت بازدید</button>
    </div>
  );
}

// Construction & Building — a deliberately separate workspace from general
// Finance (per explicit instruction: "این حسابداری عمومی نیست"). Voice/text
// entry never stores the audio itself, only the extracted transcript text —
// every transaction is still fully confirmable/editable before it saves,
// matching the same "never finalize without the advisor seeing it" rule
// used everywhere else voice creates something.
function PropertyDetail({ id, ctx, onBack }) {
  const { c, properties, setProperties, owners, builders, appointments, setLightbox, notify, setSheet, session } = ctx;
  const p = properties.find((x) => x.id === id);
  const owner = owners.find((o) => o.id === p?.ownerId);
  const builder = builders.find((b) => b.id === p?.builderId);
  const [uploading, setUploading] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);
  if (!p) return null;

  const addMedia = async (fileList) => {
    setUploading(true);
    const files = Array.from(fileList);
    const videosAndDocs = files.filter((f) => !f.type.startsWith("image"));
    const images = files.filter((f) => f.type.startsWith("image"));
    const startSortOrder = (p.media || []).length;
    // Videos/documents keep the old base64-inline path for now — only
    // photos move to Storage here. A failed image upload never corrupts
    // the property: it's simply skipped and reported, everything else
    // that succeeded is still appended.
    const [legacyItems, { items: cloudItems, failed }] = await Promise.all([
      videosAndDocs.length ? filesToMedia(videosAndDocs) : Promise.resolve([]),
      images.length && session?.user
        ? uploadPropertyImageBatch({ userId: session.user.id, propertyId: id, files: images, startSortOrder })
        : (images.length ? filesToMedia(images).then((items) => ({ items, failed: [] })) : Promise.resolve({ items: [], failed: [] })),
    ]);
    if (cloudItems.length || legacyItems.length) {
      setProperties((prev) => prev.map((x) => x.id === id ? { ...x, media: [...(x.media || []), ...cloudItems, ...legacyItems] } : x));
    }
    if (failed.length) notify(`${faDigits(failed.length)} عکس آپلود نشد — بقیه ذخیره شد`);
    setUploading(false);
  };
  const removeMedia = (mediaId) => {
    const target = (p.media || []).find((m) => m.id === mediaId);
    setProperties((prev) => prev.map((x) => x.id === id ? { ...x, media: x.media.filter((m) => m.id !== mediaId) } : x));
    if (target?.storagePath) deletePropertyPhotoPaths([target.storagePath, target.thumbnailPath]).catch(() => {});
  };
  const propAppts = appointments.filter((a) => a.propertyId === id);

  return (
    <div>
      <PropertyHero c={c} p={p} media={p.media || []} onBack={onBack} onEdit={() => setSheet({ kind: "property", editId: id })} uploading={uploading} addMedia={addMedia} setLightbox={setLightbox} />
      <div className="flex justify-end" style={{ marginTop: SP.md, marginBottom: SP.md }}>
        <button onClick={() => { setProperties((prev) => prev.filter((x) => x.id !== id)); if (session?.user) deletePropertyFolder({ userId: session.user.id, propertyId: id }).catch(() => {}); onBack(); notify("فایل حذف شد"); }} className="press flex items-center" style={{ gap: 4, fontSize: FS.caption, color: c.danger }}><Trash2 size={12} color={c.danger} />حذف فایل</button>
      </div>

      <div style={{ borderRadius: RAD.lg, padding: SP.lg, marginBottom: SP.md, ...glass(c) }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 style={{ fontSize: FS.title, fontWeight: FW.heavy, letterSpacing: "-0.01em", textDecoration: p.stage === "فروخته شد" ? "line-through" : "none" }}>{p.title}</h3>
            <div className="flex items-center" style={{ gap: SP.xs, marginTop: SP.sm, color: c.muted, fontSize: FS.caption }}><MapPin size={13} />{p.address || "بدون آدرس"}</div>
          </div>
          <StageBadge c={c} stage={p.stage} />
        </div>

        {/* spec grid — matches the reference's icon-over-label row */}
        <div className="grid grid-cols-4" style={{ gap: SP.sm, marginTop: SP.lg, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
          {[
            { icon: Ruler, label: `${faDigits(p.area)} متر` },
            { icon: Home, label: `${faDigits(p.rooms)} خواب` },
            { icon: Building, label: p.floor != null ? `طبقه ${faDigits(p.floor)}` : "—" },
            { icon: typeIcon(p.type), label: p.type },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center" style={{ gap: SP.xs + 1 }}>
              <s.icon size={18} color={c.muted} />
              <span style={{ fontSize: FS.caption, color: c.ink, fontWeight: FW.medium, textAlign: "center" }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: SP.lg }}>
          <p style={{ fontSize: FS.caption, color: c.muted }}>قیمت</p>
          {(() => {
            const priceInfo = getPriceForDisplay({ realPrice: p.price, realPricePerMeter: p.pricePerMeter, area: p.area, customerMode: ctx.customerMode, showCustomerPrice: ctx.showCustomerPrice });
            if (!priceInfo.visible) return <p style={{ fontSize: FS.body, color: c.muted, marginTop: SP.xs }}>—</p>;
            return (
              <>
                <p style={{ fontSize: FS.title, fontWeight: FW.heavy, color: c.primary, marginTop: SP.xs }}>{fmtToman(priceInfo.price)}</p>
                {priceInfo.pricePerMeter > 0 && <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>{fmtToman(priceInfo.pricePerMeter)} / متر</p>}
              </>
            );
          })()}
          {!ctx.customerMode && (
            <button onClick={() => setValuationOpen(true)} className="press w-full flex items-center justify-center rounded-xl" style={{ gap: 6, paddingBlock: 11, marginTop: SP.sm, background: c.primarySoft, color: c.primary, fontWeight: FW.bold, fontSize: 12.5 }}>
              <TrendingUp size={14} /> Flora Valuation — برآورد ارزش بازار
            </button>
          )}
          {valuationOpen && <FloraValuationSheet ctx={ctx} propertyId={p.id} onClose={() => setValuationOpen(false)} />}
        </div>

        {p.furnished && <div className="flex items-center" style={{ gap: SP.xs, marginTop: SP.md, color: c.muted, fontSize: FS.caption }}><BadgeCheck size={13} />{p.furnished}</div>}
        {owner && <OwnerReveal c={c} owner={owner} />}
        {builder && <div className="flex items-center" style={{ gap: SP.xs, marginTop: SP.sm, color: c.muted, fontSize: FS.caption }}><Hammer size={13} /> سازنده: {builder.name} · <span dir="ltr">{builder.phone}</span></div>}

        <div className="flex" style={{ gap: SP.sm, marginTop: SP.lg }}>
          {STAGES.map((s) => (
            <button key={s} onClick={() => setProperties((prev) => prev.map((x) => x.id === id ? { ...x, stage: s } : x))} className="press flex-1" style={{ borderRadius: RAD.md, paddingBlock: SP.sm + 2, background: p.stage === s ? c.primary : c.surface2, color: p.stage === s ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.caption }}>{s}</button>
          ))}
        </div>
      </div>

      {p.desc && <AboutPropertyCard c={c} desc={p.desc} />}

      <ScheduleVisitCard ctx={ctx} property={p} />

      {p.deal === "پیش‌فروش" && (p.preDown || p.preDelivery || p.preDeed || p.preMonths) && (
        <div className="rounded-2xl p-4 mb-3" style={{ ...glass(c), background: `linear-gradient(160deg, ${c.purpleSoft}, ${c.surface} 60%)` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Hammer size={14} color={c.purple} /><p style={{ fontSize: 13, fontWeight: 700 }}>شرایط پیش‌فروش</p></div>
            {p.buildStage && <span style={{ fontSize: 10, fontWeight: 700, color: c.purple, background: c.purpleSoft, padding: "3px 9px", borderRadius: 999 }}>{p.buildStage}</span>}
          </div>
          <Row c={c} label="پرداخت اولیه" value={`${fmtToman(p.preDown)}${p.price ? ` (${faDigits(Math.round((p.preDown / p.price) * 1000) / 10)}%)` : ""}`} color={c.success} />
          <Row c={c} label="موقع تحویل" value={`${fmtToman(p.preDelivery)}${p.price ? ` (${faDigits(Math.round((p.preDelivery / p.price) * 1000) / 10)}%)` : ""}`} color={c.primary} />
          <Row c={c} label="موقع سند" value={`${fmtToman(p.preDeed)}${p.price ? ` (${faDigits(Math.round((p.preDeed / p.price) * 1000) / 10)}%)` : ""}`} color={c.purple} />
          {p.preMonths > 0 && <Row c={c} label="زمان تحویل" value={`${faDigits(p.preMonths)} ماه`} />}
        </div>
      )}

      {p.lat && p.lng && <PropertyMiniMap c={c} lat={p.lat} lng={p.lng} title={p.title} />}

      <DivarAdCard ctx={ctx} p={p} />

      <SectionHeader c={c} title="بازدیدهای این فایل" />
      <div className="flex flex-col gap-2 mb-6">
        {propAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} />)}
        {propAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

function CustomerNoteBox({ c, note, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(note || "");
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ ...glass(c), border: `1px solid ${c.attn}33` }}>
      <div className="flex items-center justify-between" style={{ marginBottom: SP.sm }}>
        <div className="flex items-center" style={{ gap: SP.xs }}><StickyNote size={14} color={c.attn} /><p style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.attn }}>یادداشت آخرین تماس</p></div>
        {!editing && <button onClick={() => { setVal(note || ""); setEditing(true); }} style={{ fontSize: FS.caption, color: c.muted }}>ویرایش</button>}
      </div>
      {editing ? (
        <>
          <textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder="آخرین بار چی بهش گفتیم..." style={{ ...inputStyle(c), minHeight: 70, resize: "none", lineHeight: 1.8 }} />
          <div className="flex" style={{ gap: SP.sm, marginTop: SP.sm }}>
            <button onClick={() => setEditing(false)} className="press flex-1 rounded-xl" style={{ paddingBlock: 8, background: c.surface2, fontSize: FS.caption, fontWeight: FW.bold, color: c.muted }}>لغو</button>
            <button onClick={() => { onSave(val.trim()); setEditing(false); }} className="press flex-1 rounded-xl" style={{ paddingBlock: 8, background: c.attn, fontSize: FS.caption, fontWeight: FW.bold, color: "#fff" }}>ذخیره</button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: FS.body, color: note ? c.ink : c.muted, lineHeight: 1.8 }}>{note || "یادداشتی ثبت نشده — بزن «ویرایش»"}</p>
      )}
    </div>
  );
}

function CustomerDetail({ id, ctx, onBack }) {
  const { c, customers, calls, appointments, setSheet, celebrate } = ctx;
  const cu = customers.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(null);
  if (!cu) return null;
  const startEdit = () => { setF({ name: cu.name || "", phone: cu.phone || "", need: cu.need || "", budget: String(cu.budget || "") }); setEditing(true); };
  const save = () => {
    ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, name: f.name.trim() || x.name, phone: f.phone.trim(), need: f.need.trim(), budget: toNum(f.budget) } : x));
    setEditing(false); ctx.notify("مشخصات مشتری ذخیره شد");
  };
  const changeStage = (st) => {
    ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, stage: st } : x));
    if (st === "خرید کرد") { celebrate({ kind: "deal", label: "این معامله بسته شد" }); setTimeout(onBack, 1400); }
    else if (st === "منصرف شد") { celebrate({ kind: "lost", label: "از لیست فعال مشتریان جدا شد" }); setTimeout(onBack, 1400); }
  };
  const custCalls = calls.filter((cl) => cl.customerId === id || cl.customerName === cu.name);
  const custAppts = appointments.filter((a) => a.customerId === id || a.customerName === cu.name);
  return (
    <div className="pt-2">
      <BackHeader c={c} title="جزئیات مشتری" onBack={onBack} onDelete={() => { ctx.setCustomers((prev) => prev.filter((x) => x.id !== id)); onBack(); ctx.notify("مشتری حذف شد"); }} />

      {!editing ? (
        <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={glass(c)}>
          <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: c.primarySoft }}><UserCircle2 size={26} color={c.primary} /></div>
          <div className="flex-1"><p style={{ fontSize: 15, fontWeight: 800 }}>{cu.name}</p><p style={{ fontSize: 13, color: c.muted }} dir="ltr">{cu.phone || "بدون شماره"}</p></div>
          <button onClick={startEdit} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Edit3 size={14} color={c.muted} /></button>
          {cu.phone && (
            <a href={`tel:${cu.phone}`} onClick={() => ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, lastContactAt: todayISO(), lastContactTs: Date.now() } : x))} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={18} color={c.success} /></a>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-4 mb-3" style={glass(c)}>
          <Field c={c} label="نام"><input style={inputStyle(c)} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} /></Field>
          <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
          <div className="flex" style={{ gap: SP.sm }}>
            <button onClick={() => setEditing(false)} className="press flex-1 rounded-xl" style={{ paddingBlock: SP.sm + 2, background: c.surface2, color: c.muted, fontWeight: FW.bold, fontSize: FS.caption + 1 }}>لغو</button>
            <button onClick={save} className="press flex-1 rounded-xl" style={{ paddingBlock: SP.sm + 2, background: c.primary, color: "#fff", fontWeight: FW.bold, fontSize: FS.caption + 1 }}>ذخیره</button>
          </div>
        </div>
      )}

      {/* Stage — tap to change */}
      <div className="mb-3">
        <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm, paddingRight: 2 }}>مرحله مشتری</p>
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {CUSTOMER_STAGES.map((st) => { const active = (cu.stage || "در حال بررسی") === st; const col = CUSTOMER_STAGE_COLOR(c)[st]; return (
            <button key={st} onClick={() => changeStage(st)} className="press rounded-full" style={{ padding: `6px ${SP.md}px`, fontSize: FS.caption, fontWeight: FW.bold, background: active ? col : c.surface2, color: active ? "#fff" : c.muted }}>{st}</button>
          ); })}
        </div>
      </div>
      <button onClick={() => setSheet({ kind: "messages", customerId: id })} className="press w-full rounded-xl p-3.5 mb-3 flex items-center gap-2.5" style={{ background: c.primarySoft }}>
        <MessageSquare size={16} color={c.primary} /><span style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>پیام آماده برای این مشتری</span>
      </button>
      <CustomerNoteBox c={c} note={cu.lastCallNote} onSave={(text) => { ctx.setCustomers((prev) => prev.map((x) => x.id === id ? { ...x, lastCallNote: text, lastContactAt: todayISO(), lastContactTs: Date.now() } : x)); celebrate({ kind: "followup", label: "پیگیری ثبت شد" }); }} />
      {!editing && (
        <div className="rounded-2xl p-4 mb-3" style={glass(c)}>
          <div className="flex items-center justify-between">
            <div><p style={{ fontSize: 13, color: c.muted, marginBottom: 4 }}>نیاز مشتری</p><p style={{ fontSize: 13 }}>{cu.need || "—"}</p></div>
            <button onClick={startEdit} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><Edit3 size={11} color={c.muted} /></button>
          </div>
          <p style={{ fontSize: 13, color: c.muted, marginTop: 10, marginBottom: 4 }}>بودجه</p><p style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>{fmtToman(cu.budget)}</p>
        </div>
      )}
      <SectionHeader c={c} title="تاریخچه تماس" />
      <div className="flex flex-col gap-2 mb-4">
        {custCalls.map((cl) => <div key={cl.id} className="rounded-lg p-3 flex items-center justify-between" style={glassLite(c, 20)}><span style={{ fontSize: 13 }}>{cl.notes}</span><span style={{ fontSize: 11, color: c.muted }}>{fmtJalali(cl.date)}</span></div>)}
        {custCalls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <SectionHeader c={c} title="بازدیدهای برنامه‌ریزی‌شده" />
      <div className="flex flex-col gap-2 mb-6">
        {custAppts.map((a) => <ActivityApptRow key={a.id} a={a} ctx={ctx} />)}
        {custAppts.length === 0 && <EmptyLine c={c} text="بازدیدی ثبت نشده" />}
      </div>
    </div>
  );
}

// ---------- AI Sales Copilot ----------
const phoneOf = (customers, name) => { const m = customers.find((cu) => cu.name.trim() === String(name || "").trim()); return m?.phone || ""; };
const waLink = (phone, text) => { if (!phone) return null; const digits = phone.replace(/\D/g, "").replace(/^0/, "98"); return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`; };
const smsLink = (phone, text) => (phone ? `sms:${phone}${text ? `?body=${encodeURIComponent(text)}` : ""}` : null);
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

function greetingPhrase() {
  const h = new Date().getHours();
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  if (h < 20) return "عصر بخیر";
  return "شب بخیر";
}
const HEAT_STYLE = { hot: { label: "داغ" }, warm: { label: "متوسط" }, cold: { label: "سرد" } };

// The daily targets a real-estate agent works toward. Editable, and progress is
// saved per-day so ticking things off survives closing the app.
const DEFAULT_MISSION = [
  { id: "newfiles", icon: "residential", label: "ثبت فایل جدید", target: 2 },
  { id: "ownercalls", icon: "handover", label: "تماس با مالک", target: 12 },
  { id: "visits", icon: "location", label: "انجام بازدید", target: 2 },
  { id: "stories", icon: "window", label: "انتشار استوری", target: 3 },
  { id: "renew", icon: "investment", label: "تمدید آگهی دیوار", target: 4 },
  { id: "buyers", icon: "monogram", label: "پیگیری خریدار", target: 5 },
  { id: "contract", icon: "deed", label: "ثبت قرارداد", target: 1 },
];
const MISSION_ICONS = { newfiles: "residential", ownercalls: "handover", visits: "location", stories: "window", renew: "investment", buyers: "monogram", contract: "deed" };

// Builds today's targets from the agent's real numbers when AI isn't available,
// so the mission still adapts to their actual situation.
function smartMission(ctx) {
  const { customers, calls, appointments, properties } = ctx;
  const active = properties.filter((p) => p.stage !== "فروخته شد");
  const staleCustomers = customers.filter((cu) => {
    const last = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
    return !last || daysSince(last.date) >= 3;
  }).length;
  const sleeping = active.filter((p) => p.createdAt && daysSince(p.createdAt) >= 20).length;
  const visitsToday = appointments.filter((a) => a.date === todayISO()).length;
  return [
    { id: "newfiles", label: "ثبت فایل جدید", target: active.length < 10 ? 3 : 2 },
    { id: "ownercalls", label: "تماس با مالک", target: 12 },
    { id: "visits", label: "انجام بازدید", target: Math.max(1, visitsToday) },
    { id: "stories", label: "انتشار استوری", target: 3 },
    { id: "renew", label: "تمدید آگهی دیوار", target: Math.max(2, Math.min(6, sleeping)) },
    { id: "buyers", label: "پیگیری خریدار", target: Math.max(3, Math.min(8, staleCustomers)) },
    { id: "contract", label: "ثبت قرارداد", target: 1 },
  ].map((m) => ({ ...m, icon: MISSION_ICONS[m.id] || "residential" }));
}

function MissionOfTheDay({ ctx }) {
  const { c, notify, hasAiKey, callAI, agentName } = ctx;
  const [mission, setMission] = useState(null); // { date, items, coach, source }
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState({ count: 0, lastDate: "" });
  const [poppedId, setPoppedId] = useState(null); // brief bounce animation on the item just completed

  useEffect(() => { (async () => { try { const s = await dbGet(STREAK_KEY); if (s) setStreak(s); } catch (e) {} })(); }, []);

  useEffect(() => { (async () => {
    try {
      const saved = await dbGet(MISSION_KEY);
      if (saved?.date === todayISO()) { setMission(saved); return; }
    } catch (e) {}
    // fresh day: smart deterministic targets until AI is asked
    const items = smartMission(ctx).map((m) => ({ ...m, done: 0 }));
    setMission({ date: todayISO(), items, coach: "", source: "auto" });
  })(); }, []); // eslint-disable-line

  const persist = (next) => { setMission(next); dbSet(MISSION_KEY, next).catch(() => {}); };

  const askAI = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); return; }
    setLoading(true);
    try {
      const { customers, calls, appointments, properties, deals } = ctx;
      const active = properties.filter((p) => p.stage !== "فروخته شد");
      const staleCustomers = customers.filter((cu) => {
        const last = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
        return !last || daysSince(last.date) >= 3;
      }).length;
      const sleeping = active.filter((p) => p.createdAt && daysSince(p.createdAt) >= 20).length;
      const visitsToday = appointments.filter((a) => a.date === todayISO()).length;
      const newToday = properties.filter((p) => (p.createdAt || "").slice(0, 10) === todayISO()).length;
      const weekStart = daysAgoISO(new Date().getDay());
      const dealsThisWeek = (deals || []).filter((d) => (d.createdAt || "") >= weekStart).length;
      const filesThisWeek = properties.filter((p) => (p.createdAt || "") >= weekStart).length;

      const prompt = `تو مشاور و مدیر فروش شخصی یک مشاور املاک ایرانی به اسم ${agentName || "مشاور"} هستی. بر اساس وضعیت واقعی امروزِ او، «ماموریت امروز» را تعیین کن — یعنی برای هر کار، عدد هدفِ منطقی امروز را مشخص کن. لحن جمله‌ات صمیمی و انگیزشی است.
وضعیت واقعی:
- فایل‌های فعال: ${active.length}
- فایل ثبت‌شده امروز: ${newToday}
- مشتریان پیگیری‌نشده (۳+ روز): ${staleCustomers}
- فایل‌های خواب‌رفته (۲۰+ روز): ${sleeping}
- بازدید امروز: ${visitsToday}
- این هفته: ${filesThisWeek} فایل، ${dealsThisWeek} قرارداد

دقیقاً JSON خام برگردان (بدون توضیح، بدون markdown):
{"coach":"یک تا دو جمله‌ی صمیمی خطاب به ${agentName || "مشاور"} که بگوید امروز روی چه چیزی تمرکز کند و چرا","targets":{"newfiles":عدد,"ownercalls":عدد,"visits":عدد,"stories":عدد,"renew":عدد,"buyers":عدد,"contract":عدد}}
اعداد باید بر اساس وضعیت بالا واقع‌بینانه باشند (مثلاً اگر مشتری پیگیری‌نشده زیاد است، عدد پیگیری خریدار بیشتر شود). عددی خارج از توان یک روز نگذار.`;
      const text = await callAI(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const t = parsed.targets || {};
      const items = DEFAULT_MISSION.map((m) => ({
        id: m.id, icon: m.icon, label: m.label,
        target: Math.max(1, Number(t[m.id]) || m.target),
        done: mission?.items.find((x) => x.id === m.id)?.done || 0,
      }));
      persist({ date: todayISO(), items, coach: parsed.coach || "", source: "ai" });
      notify("ماموریت امروز توسط مشاور هوشمند تنظیم شد");
    } catch (e) {
      if (e instanceof SyntaxError) notify("پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن");
      else notify(`خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  if (!mission) return null;
  const totalTarget = mission.items.reduce((s, m) => s + m.target, 0);
  const totalDone = mission.items.reduce((s, m) => s + Math.min(m.done, m.target), 0);
  const pct = totalTarget ? Math.round((totalDone / totalTarget) * 100) : 0;

  const bump = (id, delta) => {
    const nextItems = mission.items.map((m) => m.id === id ? { ...m, done: Math.max(0, Math.min(m.target, m.done + delta)) } : m);
    persist({ ...mission, items: nextItems });
    const item = nextItems.find((m) => m.id === id);
    if (delta > 0) {
      setPoppedId(id); setTimeout(() => setPoppedId(null), 420);
      if (item.done >= item.target) notify(`${item.label} تکمیل شد`);
    }
    // whole-mission streak — counts once per day, only when every target is hit
    const allDone = nextItems.every((m) => m.done >= m.target);
    if (allDone && streak.lastDate !== todayISO()) {
      const yesterday = daysAgoISO(1).slice(0, 10);
      const nextCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
      const next = { count: nextCount, lastDate: todayISO() };
      setStreak(next); dbSet(STREAK_KEY, next).catch(() => {});
      notify(nextCount > 1 ? `${faDigits(nextCount)} روز متوالی — همه‌ی اهداف زده شد` : "همه‌ی اهداف امروز زده شد");
    }
  };
  const setTarget = (id, t) => persist({ ...mission, items: mission.items.map((m) => m.id === id ? { ...m, target: Math.max(1, Number(toEnDigits(String(t))) || 1) } : m) });

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c), position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -16, left: -12, opacity: 0.08, pointerEvents: "none" }}><FloraMark size={110} color={c.ink} /></div>
      <div className="flex items-center justify-between mb-3" style={{ position: "relative" }}>
        <div className="flex items-center gap-2">
          <span style={{ width: 9, height: 9, borderRadius: 999, background: pct >= 100 ? c.success : c.primary }} className={pct < 100 ? "flora-pulse" : ""} />
          <p style={{ fontSize: 15, fontWeight: 800 }}>ماموریت امروز</p>
          {streak.count > 1 && (
            <span className="flex items-center" style={{ gap: 4, fontSize: 11, fontWeight: 800, color: c.attn, background: c.attnSoft, padding: "2px 8px", borderRadius: RAD.pill }}>
              <Flame size={11} color={c.attn} />{faDigits(streak.count)} روز
            </span>
          )}
        </div>
        <button onClick={() => setEditing((e) => !e)} className="press rounded-lg px-2.5 py-1.5 flex items-center gap-1" style={{ background: c.surface2 }}>
          <Edit3 size={11} color={c.muted} /><span style={{ fontSize: 10, fontWeight: 700, color: c.muted }}>{editing ? "تمام" : "اهداف"}</span>
        </button>
      </div>

      {/* progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ flex: 1, height: 8, borderRadius: 8, background: c.surface2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 8, background: pct >= 100 ? c.success : c.gradientPrimary, transition: "width .5s cubic-bezier(.34,1.3,.64,1)" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: pct >= 100 ? c.success : c.primary }}>{faDigits(pct)}%</span>
      </div>
      {pct >= 100 && <p style={{ fontSize: 11, color: c.success, fontWeight: 700, marginBottom: 10 }}>آفرین! همه‌ی اهداف امروز را زدی</p>}

      {/* AI coach message */}
      {mission.coach && (
        <div className="rounded-xl p-3 mb-3 flex items-start gap-2.5" style={{ background: c.gradientPrimary }}>
          <Bot size={16} color="#fff" className="shrink-0" style={{ marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "#fff", lineHeight: 1.85, fontWeight: 500 }}>{mission.coach}</p>
        </div>
      )}

      {/* Ask the AI advisor to set today's targets */}
      <button onClick={askAI} disabled={loading} className="press w-full rounded-xl py-2.5 mb-3 flex items-center justify-center gap-1.5" style={{ background: mission.source === "ai" ? c.surface2 : c.primarySoft }}>
        {loading ? <Loader2 size={13} className="animate-spin" color={c.primary} /> : <Sparkles size={13} color={c.primary} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>{loading ? "مشاور در حال تنظیم ماموریت..." : mission.source === "ai" ? "به‌روزرسانی ماموریت با مشاور" : "بگذار مشاور هوشمند ماموریت امروزت را بچیند"}</span>
      </button>

      <div className="flex flex-col gap-2">
        {mission.items.map((m) => {
          const complete = m.done >= m.target;
          return (
            <div key={m.id} className={`rounded-xl p-3 flex items-center gap-3 ${poppedId === m.id ? "flora-pop" : ""}`} style={{ background: complete ? c.successSoft : c.surface2, transition: "background .4s ease" }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${poppedId === m.id ? "flora-bounce" : ""}`} style={{ background: complete ? c.successSoft : c.primarySoft }}>
                {floraIcon(m.icon, { size: 20, color: complete ? c.success : c.primary })}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 700, textDecoration: complete ? "line-through" : "none", color: complete ? c.muted : c.ink }}>{m.label}</p>
                {editing ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span style={{ fontSize: 10, color: c.muted }}>هدف:</span>
                    <input inputMode="numeric" value={m.target} onChange={(e) => setTarget(m.id, e.target.value)} style={{ width: 46, textAlign: "center", ...glassSurface(c), border: `1px solid ${c.border}`, borderRadius: 8, padding: "3px 4px", fontSize: 11, color: c.ink }} />
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: c.muted }}>{faDigits(Math.min(m.done, m.target))} از {faDigits(m.target)}</p>
                )}
              </div>
              {!editing && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => bump(m.id, -1)} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ ...glassSurface(c), color: c.muted, fontSize: 15, fontWeight: 700 }}>−</button>
                  <button onClick={() => { bump(m.id, +1); if (m.done + 1 >= m.target) notify(`${m.label} تکمیل شد ✓`); }} className="press w-7 h-7 rounded-full flex items-center justify-center" style={{ background: complete ? c.success : c.primary, color: "#fff", fontSize: 15, fontWeight: 700 }}>{complete ? "✓" : "+"}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Real, deterministic insights computed only from the agent's own CRM data.
// Deliberately avoids any Divar-style metrics (views/saves) that Flora can't see —
// those become "go check Divar" reminders instead of invented numbers.
function useSalesInsights(ctx) {
  const { customers, calls, appointments, properties, deals } = ctx;
  return useMemo(() => {
    const out = [];
    const today = todayISO();

    // Files registered today
    const newToday = properties.filter((p) => (p.createdAt || "").slice(0, 10) === today).length;
    if (newToday === 0) out.push({ tone: "warn", icon: "residential", text: "امروز هنوز هیچ فایل جدیدی ثبت نکرده‌ای." });

    // Customers not followed up in 3+ days
    const stale = customers.filter((cu) => {
      const last = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
      return !last || daysSince(last.date) >= 3;
    }).length;
    if (stale > 0) out.push({ tone: "warn", icon: "monogram", text: `${faDigits(stale)} مشتری بیش از ۳ روز پیگیری نشده‌اند.` });

    // Inventory gap in the 80–100m band
    const active = properties.filter((p) => p.stage !== "فروخته شد");
    const band = active.filter((p) => p.area >= 80 && p.area <= 100).length;
    if (band <= 1) out.push({ tone: "info", icon: "floorArea", text: "موجودی فایل‌های ۸۰ تا ۱۰۰ متر کم است؛ فایل جدید بگیر." });

    // Sleeping listings — remind to refresh the Divar ad (no fake view counts)
    const sleeping = active.filter((p) => p.createdAt && daysSince(p.createdAt) >= 20);
    if (sleeping.length > 0) out.push({ tone: "info", icon: "window", text: `${faDigits(sleeping.length)} فایل بیش از ۲۰ روز است تکان نخورده؛ آگهی دیوارشان را چک و در صورت نیاز تمدید کن.` });

    // This week vs recent weeks — contracts
    const weekStart = daysAgoISO(new Date().getDay());
    const dealsThisWeek = deals.filter((d) => (d.createdAt || "") >= weekStart).length;
    const prev = [];
    for (let w = 1; w <= 3; w++) {
      const s = daysAgoISO(new Date().getDay() + 7 * w);
      const e = daysAgoISO(new Date().getDay() + 7 * (w - 1));
      prev.push(deals.filter((d) => (d.createdAt || "") >= s && (d.createdAt || "") < e).length);
    }
    const avgPrev = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) : 0;
    if (dealsThisWeek === 0 && avgPrev > 0) out.push({ tone: "warn", icon: "deed", text: `این هفته هنوز قراردادی ثبت نشده، در حالی که میانگین هفته‌های اخیرت ${faDigits(avgPrev)} قرارداد بوده.` });

    // Today's visits — coordinate with owner
    const visits = appointments.filter((a) => a.date === today);
    if (visits.length > 0) {
      const first = [...visits].sort((a, b) => a.time.localeCompare(b.time))[0];
      out.push({ tone: "good", icon: "location", text: `امروز ${faDigits(visits.length)} بازدید داری؛ اولین ساعت ${first.time} — ۳۰ دقیقه قبل با مالک هماهنگ کن.` });
    }

    return out;
  }, [customers, calls, appointments, properties, deals]);
}

// Full-page call follow-up list, reached from the top-bar badge. Pending calls
// float to the top so the next action is always first.
function CallsView({ ctx, onBack }) {
  const { c, calls, setCalls, setSheet, notify, celebrate } = ctx;
  const sorted = [...calls].sort((a, b) => {
    const ap = a.status === "انجام‌شد" ? 1 : 0, bp = b.status === "انجام‌شد" ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return (b.date || "").localeCompare(a.date || "");
  });
  const pending = calls.filter((cl) => cl.status !== "انجام‌شد").length;
  return (
    <div className="pt-3 pb-6">
      <BackHeader c={c} title="پیگیری تماس‌ها" onBack={onBack} />
      <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: c.gradientPrimary }}>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}><PhoneCall size={20} color="#fff" /></div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{pending > 0 ? `${faDigits(pending)} تماس در انتظار پیگیری` : "همه پیگیری شده"}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 }}>{faDigits(calls.length)} تماس ثبت شده</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 flora-stagger">
        {sorted.map((cl) => {
          const done = cl.status === "انجام‌شد";
          return (
            <div key={cl.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glassLite(c, 20)}>
              <button onClick={() => { setCalls((prev) => prev.map((x) => x.id === cl.id ? { ...x, status: done ? "در انتظار پاسخ" : "انجام‌شد" } : x)); if (!done) celebrate({ kind: "followup", label: "پیگیری ثبت شد" }); }} className="press shrink-0">
                <CheckCircle2 size={22} color={done ? c.success : c.attn} fill={done ? c.success : "none"} />
              </button>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 700, textDecoration: done ? "line-through" : "none", color: done ? c.muted : c.ink }}>{cl.customerName}</p>
                <p style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{cl.notes ? `${cl.notes} · ` : ""}{fmtJalali(cl.date)}</p>
              </div>
              {cl.customerPhone && <a href={`tel:${cl.customerPhone}`} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.successSoft }}><PhoneCall size={13} color={c.success} /></a>}
              <button onClick={() => setSheet({ kind: "call", editId: cl.id })} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={13} color={c.primary} /></button>
              <button onClick={() => { setCalls((prev) => prev.filter((x) => x.id !== cl.id)); notify("تماس حذف شد"); }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
            </div>
          );
        })}
        {calls.length === 0 && <EmptyLine c={c} text="تماسی ثبت نشده" />}
      </div>
      <button onClick={() => setSheet("call")} className="press w-full rounded-2xl py-3.5 mt-4 flex items-center justify-center gap-2" style={{ background: c.primary }}>
        <Plus size={17} color="#fff" /><span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ثبت پیگیری تماس جدید</span>
      </button>
    </div>
  );
}

function CopilotView({ ctx, onBack }) {
  const { c, customers, calls, appointments, properties, hasAiKey, callAI, notify, setSheet, agentName } = ctx;
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const insights = useSalesInsights(ctx);

  useEffect(() => { (async () => {
    try { const cached = await dbGet(COPILOT_KEY); if (cached?.date === todayISO()) setPlan(cached.data); } catch (e) {}
  })(); }, []);

  // Real signals still feed the AI's synthesis — they're just not dumped on
  // screen as raw lists anymore. One coach reads them and writes one paragraph.
  const overdueCount = useMemo(() => customers.filter((cu) => {
    const lastCall = calls.filter((cl) => cl.customerId === cu.id || cl.customerName === cu.name).sort((a, b) => b.date.localeCompare(a.date))[0];
    const days = lastCall ? daysSince(lastCall.date) : null;
    return days === null || days >= 5;
  }).length, [customers, calls]);
  const sleepingCount = useMemo(() => properties.filter((p) => p.stage !== "فروخته شد" && p.createdAt && daysSince(p.createdAt) >= 30).length, [properties]);

  const generatePlan = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    setLoading(true);
    try {
      const weekStart = daysAgoISO(new Date().getDay()).slice(0, 10);
      const dealsThisWeek = (ctx.deals || []).filter((d) => (d.createdAt || "") >= weekStart).length;
      const filesThisWeek = properties.filter((p) => (p.createdAt || "") >= weekStart).length;
      const perfLine = `این هفته: ${faDigits(filesThisWeek)} فایل جدید، ${faDigits(dealsThisWeek)} قرارداد. ${faDigits(overdueCount)} مشتری بیش از ۵ روزه پیگیری نشده. ${faDigits(sleepingCount)} فایل بیش از یک ماهه فعاله و نفروخته.`;
      const insightLines = insights.map((it) => it.text).join(" | ") || "چیز خاصی نیست";
      const prompt = `تو مدیر فروش باتجربه و صمیمی یک مشاور املاک ایرانی به اسم ${agentName || "مشاور"} هستی. بر اساس این وضعیت واقعی، یک نگاه کوتاه و انسانی بده — نه گزارش رسمی، نه لیست بلند. دقیقاً همین JSON خام را برگردان (بدون توضیح، بدون markdown):
{"summary":"یک پاراگراف کوتاه (۲-۳ جمله) با لحن گرم و مستقیم، خطاب به ${agentName || "مشاور"}، درباره‌ی وضعیت کلی این هفته","risk":"مهم‌ترین نکته‌ای که باید مراقبش باشد، در یک جمله‌ی کوتاه، یا خالی اگر چیز نگران‌کننده‌ای نیست","tip":"یک توصیه‌ی عملی و مشخص برای همین امروز، در یک جمله"}

وضعیت واقعی:
${perfLine}
نکات دیگر: ${insightLines}`;
      const text = await callAI(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setPlan(parsed);
      dbSet(COPILOT_KEY, { date: todayISO(), data: parsed }).catch(() => {});
    } catch (e) {
      notify(e instanceof SyntaxError ? "پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن" : `خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  return (
    <div className="pt-2">
      <BackHeader c={c} title="برنامه‌ی امروز" onBack={onBack} />

      <div style={{ marginBottom: SP.lg, paddingInline: SP.xs }}>
        <h1 style={{ fontSize: FS.hero, fontWeight: FW.heavy, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{greetingPhrase()}{agentName ? `، ${agentName}` : ""}</h1>
      </div>

      <MissionOfTheDay ctx={ctx} />

      {/* One consolidated coach card — replaces the old sprawl of separate sections */}
      <div style={{ marginTop: SP.lg, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
        {!plan && !loading && (
          <div className="flex items-center" style={{ gap: SP.md }}>
            <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: RAD.md, background: c.purpleSoft }}><Bot size={21} color={c.purple} /></div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>نگاه مدیر فروش</p>
              <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2 }}>یک تحلیل کوتاه از وضعیت این هفته</p>
            </div>
            <button onClick={generatePlan} className="press shrink-0 rounded-full" style={{ padding: `8px ${SP.md}px`, background: c.purple, color: "#fff", fontSize: FS.caption, fontWeight: FW.bold }}>بگیر</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center" style={{ gap: SP.sm, paddingBlock: SP.md }}>
            <Loader2 size={17} className="animate-spin" color={c.purple} /><span style={{ fontSize: FS.caption, color: c.muted }}>در حال فکر کردن...</span>
          </div>
        )}

        {plan && !loading && (
          <div className="flora-rise">
            <div className="flex items-center justify-between" style={{ marginBottom: SP.md }}>
              <div className="flex items-center" style={{ gap: SP.sm }}><Bot size={16} color={c.purple} /><p style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.purple }}>نگاه مدیر فروش</p></div>
              <button onClick={generatePlan} className="press" style={{ fontSize: FS.caption, color: c.muted }}>به‌روزرسانی</button>
            </div>
            <p style={{ fontSize: FS.body, color: c.ink, lineHeight: 1.9 }}>{plan.summary}</p>
            {plan.risk && (
              <div className="flex items-start" style={{ gap: SP.sm, marginTop: SP.md, padding: SP.md, borderRadius: RAD.md, background: c.dangerSoft }}>
                <AlertTriangle size={14} color={c.danger} style={{ marginTop: 2, flexShrink: 0 }} /><p style={{ fontSize: FS.caption + 0.5, color: c.ink, lineHeight: 1.8 }}>{plan.risk}</p>
              </div>
            )}
            {plan.tip && (
              <div className="flex items-start" style={{ gap: SP.sm, marginTop: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.primarySoft }}>
                <Sparkles size={14} color={c.primary} style={{ marginTop: 2, flexShrink: 0 }} /><p style={{ fontSize: FS.caption + 0.5, color: c.ink, lineHeight: 1.8 }}>{plan.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

// ---------- AI Chat assistant ----------
function AiChatView({ ctx, onBack }) {
  const { c, hasAiKey, callAI, notify, setSheet, properties, customers, calls, appointments, deals } = ctx;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { (async () => {
    try { const saved = await dbGet(CHAT_KEY); if (saved?.messages) setMessages(saved.messages); } catch (e) {}
    setLoadedHistory(true);
  })(); }, []);
  useEffect(() => { if (loadedHistory) dbSet(CHAT_KEY, { messages }).catch(() => {}); }, [loadedHistory, messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    const history = [...messages, { role: "user", text: q }];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const transcript = history.slice(-12).map((m) => `${m.role === "user" ? "مشاور" : "دستیار"}: ${m.text}`).join("\n");
      // Real office context, so it can actually answer "چند فایل فعال دارم" or
      // "کدام مشتری بیشترین بودجه را دارد" — not just generic real-estate advice.
      const officeContext = `فایل‌های فعال: ${properties.filter((p) => p.stage !== "فروخته شد").length} | کل فایل‌ها: ${properties.length}
مشتریان: ${customers.length}
تماس‌های در انتظار پیگیری: ${calls.filter((cl) => cl.status !== "انجام‌شد").length}
بازدیدهای ثبت‌شده: ${appointments.length}
معاملات: ${deals?.length || 0}
چند فایل نمونه: ${properties.slice(0, 15).map((p) => `${p.title} (${fmtToman(p.price)}, ${p.stage})`).join(" | ") || "—"}
چند مشتری نمونه: ${customers.slice(0, 15).map((cu) => `${cu.name} (بودجه ${fmtBudgetShort(cu.budget)}, ${cu.stage || "نامشخص"})`).join(" | ") || "—"}`;
      const prompt = `تو یک دستیار متخصص و باتجربه در حوزه‌ی املاک و مستغلات هستی — هم آشنا با بازار مسکن ایران و هم اصول حرفه‌ای مشاوره‌ی املاک در سطح جهانی (قیمت‌گذاری، مذاکره، بازاریابی، حقوقی، سرمایه‌گذاری). به فارسی، دقیق، کاربردی و مختصر پاسخ بده. اگر سوال خارج از حوزه‌ی املاک بود هم به بهترین شکل کمک کن.

اطلاعات واقعی دفتر مشاور (اگر سوال درباره‌ی فایل‌ها، مشتری‌ها یا وضعیت خودش بود، از همین داده استفاده کن، حدس نزن):
${officeContext}

گفتگوی تا این لحظه:
${transcript}

فقط پاسخ دستیار به آخرین پیام را بنویس، بدون تکرار سوال.`;
      const reply = await callAI(prompt);
      setMessages((prev) => [...prev, { role: "assistant", text: reply.trim() }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `خطا: ${e.message || "نامشخص"}` }]);
    }
    setSending(false);
  };

  return (
    <div className="pt-2 flex flex-col" style={{ height: "calc(100vh - 90px)" }}>
      <BackHeader c={c} title="چت با دستیار املاک" onBack={onBack} onDelete={messages.length > 0 ? () => { setMessages([]); dbSet(CHAT_KEY, { messages: [] }).catch(() => {}); notify("تاریخچه‌ی گفتگو پاک شد"); } : undefined} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-3">
        {messages.length === 0 && (
          <div className="rounded-xl p-4" style={glass(c)}>
            <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.9 }}>هر سوالی درباره‌ی قیمت‌گذاری، مذاکره، بازاریابی فایل، یا هر موضوع دیگری در حوزه‌ی املاک بپرس.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 ${m.role === "user" ? "self-end" : "self-start"}`} style={{ ...glassLite(c, 20), maxWidth: "85%", background: m.role === "user" ? c.primary : c.surface2 }}>
            <p style={{ fontSize: 13, lineHeight: 1.9, color: m.role === "user" ? "#fff" : c.ink, whiteSpace: "pre-wrap" }}>{m.text}</p>
          </div>
        ))}
        {sending && <div className="self-start rounded-xl p-3" style={glass(c)}><Loader2 size={14} className="animate-spin" color={c.primary} /></div>}
      </div>
      <div className="flex items-center gap-2 pt-2 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="سوالت را بپرس..." style={{ ...inputStyle(c), flex: 1 }} />
        <button onClick={send} disabled={sending || !input.trim()} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primary, opacity: sending || !input.trim() ? 0.5 : 1 }}><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}

// ---------- Finance Center ----------
// Official Iranian real-estate commission formula (per the office's standard):
// first 1 billion toman → flat 10M; anything above → +0.5% of the excess; then +10% tax.
// Returns the full breakdown so the UI can show every line.
function officialCommission(price) {
  const BASE_CAP = 1_000_000_000;
  const BASE_FEE = 10_000_000;
  const p = Math.max(0, Math.round(price || 0));
  const excess = p > BASE_CAP ? p - BASE_CAP : 0;
  const commission = BASE_FEE + Math.round(excess * 0.005);
  const tax = Math.round(commission * 0.10);
  return { price: p, excess, commission, tax, final: commission + tax };
}

const dealCommission = (deal, side) => {
  const mode = side === "seller" ? deal.sellerMode : deal.buyerMode;
  if (mode === "official") return officialCommission(deal.price).final;
  if (mode === "fixed") return (side === "seller" ? deal.sellerFixed : deal.buyerFixed) || 0;
  return Math.round((deal.price || 0) * ((side === "seller" ? deal.sellerPct : deal.buyerPct) || 0) / 100);
};
const dealPaid = (deal, payments, side) => payments.filter((p) => p.dealId === deal.id && p.payerType === side).reduce((s, p) => s + (p.amount || 0), 0);
const dealRemaining = (deal, payments, side) => Math.max(0, dealCommission(deal, side) - dealPaid(deal, payments, side));
const dealTotalCommission = (deal) => dealCommission(deal, "seller") + dealCommission(deal, "buyer");
const dealTotalPaid = (deal, payments) => dealPaid(deal, payments, "seller") + dealPaid(deal, payments, "buyer");
const dealTotalRemaining = (deal, payments) => dealRemaining(deal, payments, "seller") + dealRemaining(deal, payments, "buyer");
const dealProgress = (deal, payments) => { const t = dealTotalCommission(deal); if (!t) return 100; return Math.min(100, Math.round((dealTotalPaid(deal, payments) / t) * 100)); };
const PAYMENT_METHODS = [{ id: "card", label: "کارت", icon: CreditCard }, { id: "cash", label: "نقد", icon: Banknote }, { id: "transfer", label: "حواله", icon: Landmark }, { id: "check", label: "چک", icon: FileCheck }];
const EXPENSE_CATEGORIES = ["تبلیغات دیوار", "تبلیغات اینستاگرام", "تبلیغات گوگل", "اجاره مغازه", "حقوق کارکنان", "قبوض و اینترنت", "مالیات", "تجهیزات", "پذیرایی", "سایر"];
const INCOME_CATEGORIES = ["حق مشاوره", "درآمد تبلیغات", "خدمات حقوقی", "قرارداد اجاره", "سایر"];
const EXPENSE_COLORS = ["#5b9dff", "#a78bfa", "#f59e0b", "#ec4899", "#22c55e", "#64748b", "#ef4444", "#06b6d4", "#f472b6", "#94a3b8"];
const FIN_TABS = [
  { id: "overview", label: "نمای کلی" },
  { id: "split", label: "تقسیم کمیسیون" },
  { id: "transactions", label: "معاملات" },
  { id: "office", label: "درآمد و هزینه" },
  { id: "debtors", label: "بدهکاران" },
  { id: "reports", label: "گزارشات" },
];

// The split is always DERIVED from money actually received — never stored per payment.
// That way the books can't drift: change the ratio and every figure recomputes from the
// same source of truth (the payments list).
const SPLIT_PARTIES = [
  { id: "agent", label: "سهم من", icon: UserCircle2, color: "#22c55e" },
  { id: "management", label: "سهم مدیریت", icon: Award, color: "#7c6ff5" },
  { id: "rent", label: "اجاره دفتر", icon: Home, color: "#f59e0b" },
];
function splitAmounts(total, shares) {
  const units = SPLIT_PARTIES.map((p) => Math.max(0, Number(shares?.[p.id]) || 0));
  const sum = units.reduce((a, b) => a + b, 0);
  if (!sum) return SPLIT_PARTIES.map(() => 0);
  // Give the remainder to the largest share so the parts always add back to the total exactly.
  const raw = units.map((u) => (total * u) / sum);
  const floored = raw.map(Math.floor);
  let rem = Math.round(total - floored.reduce((a, b) => a + b, 0));
  const order = raw.map((v, i) => [v - floored[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) floored[order[k % order.length][1]] += 1;
  return floored;
}

function DealStatusBadge({ c, status }) {
  if (status === "تسویه شده") return <span style={{ fontSize: 10, fontWeight: 700, color: c.success, background: c.successSoft, padding: "4px 10px", borderRadius: 8 }}>تسویه شده</span>;
  if (status === "در حال مذاکره") return <span style={{ fontSize: 10, fontWeight: 700, color: c.primary, background: c.primarySoft, padding: "4px 10px", borderRadius: 8 }}>در حال مذاکره</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, color: c.attn, background: c.attnSoft, padding: "4px 10px", borderRadius: 8 }}>در انتظار پرداخت</span>;
}

// The "total balance" wallet-card look: near-black surface, a quiet label, one
// huge white figure, and a tappable pill underneath for the secondary number —
// plus a pair of stacked accent cards peeking from the side, echoing the
// reference without pretending to be a literal payment card.
function BalanceCard({ c, label, value, pillIcon: PillIcon, pillLabel, pillValue, onPillClick }) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 22, padding: 24, background: "linear-gradient(160deg,#15181f 0%,#0c0e13 100%)", boxShadow: "0 16px 38px -14px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)" }}>
      {/* stacked decorative cards, peeking from the right edge */}
      <div className="absolute" style={{ top: 14, left: -10, width: 92, height: 118 }}>
        <div style={{ position: "absolute", top: 10, left: 18, width: 68, height: 96, borderRadius: 14, background: "linear-gradient(160deg,#3b5fd9,#22346e)", opacity: .9 }} />
        <div className="relative" style={{ position: "absolute", top: 0, left: 0, width: 74, height: 104, borderRadius: 14, background: "linear-gradient(150deg,#fb923c 0%,#ec4899 100%)", boxShadow: "0 10px 22px -8px rgba(236,72,153,.5)" }}>
          <span style={{ position: "absolute", top: 12, right: 10, width: 15, height: 15, borderRadius: "50%", background: "rgba(255,255,255,.55)" }} />
          <span style={{ position: "absolute", top: 12, right: 20, width: 15, height: 15, borderRadius: "50%", background: "rgba(255,255,255,.85)" }} />
          <span style={{ position: "absolute", bottom: 10, right: 10, left: 10, fontSize: 10, color: "rgba(255,255,255,.85)", letterSpacing: ".03em" }}>کمیسیون</span>
        </div>
      </div>

      <div className="relative" style={{ maxWidth: "62%" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.55)", letterSpacing: ".06em" }}>{label}</p>
        <div style={{ marginTop: 6 }}><CountUpTomanSplit value={value} size={25} /></div>
        <button onClick={onPillClick} className="press flex items-center" style={{ gap: 8, marginTop: 16, background: "rgba(255,255,255,.08)", borderRadius: RAD.pill, padding: "6px 8px 6px 12px" }}>
          <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.12)", flexShrink: 0 }}><PillIcon size={11} color="#fff" /></span>
          <span dir="ltr" style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{pillValue.replace(" تومان", "")}</span>
            {pillValue.includes("تومان") && <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.5)" }}> تومان</span>}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>{pillLabel}</span>
          <ChevronLeft size={13} color="rgba(255,255,255,.5)" />
        </button>
      </div>
    </div>
  );
}

// Compact statement-style tile, matching the balance card's dark language.
// A real bank-statement style feed: recent money in (commission received) and
// money out (office expenses), merged and sorted — the kind of thing you'd
// actually glance at, not a list you have to feel bad about.
function RecentActivityCard({ ctx, onSeeAll }) {
  const { c, payments, expenses, deals } = ctx;
  const txns = [
    ...payments.map((p) => ({ id: `p-${p.id}`, kind: "in", date: p.date, amount: p.amount, label: deals.find((d) => d.id === p.dealId)?.propertyTitle || "کمیسیون دریافتی" })),
    ...expenses.map((e) => ({ id: `e-${e.id}`, kind: "out", date: e.date, amount: e.amount, label: e.title || e.category || "هزینه‌ی دفتر" })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4);

  return (
    <div className="relative overflow-hidden flora-rise" style={{ borderRadius: RAD.lg, padding: SP.lg, background: "linear-gradient(160deg,#15181f 0%,#0c0e13 100%)", border: "1px solid rgba(255,255,255,.06)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: txns.length ? SP.md : 0 }}>
        <div className="flex items-center" style={{ gap: SP.sm }}>
          <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 8, background: `${c.primary}22` }}><Wallet size={13} color={c.primary} /></div>
          <span style={{ fontSize: 13, fontWeight: FW.bold, color: "#fff" }}>آخرین تراکنش‌ها</span>
        </div>
        {txns.length > 0 && <button onClick={onSeeAll} className="press" style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>همه ‹</button>}
      </div>
      {txns.length === 0 ? (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>هنوز تراکنشی ثبت نشده</p>
      ) : (
        <div className="flex flex-col flora-stagger" style={{ gap: SP.sm }}>
          {txns.map((t) => (
            <div key={t.id} className="flex items-center" style={{ gap: SP.sm }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: "50%", background: t.kind === "in" ? `${c.success}22` : `${c.danger}22` }}>
                {t.kind === "in" ? <TrendingUp size={13} color={c.success} /> : <TrendingDown size={13} color={c.danger} />}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 1 }}>{fmtJalali(t.date)}</p>
              </div>
              <p dir="ltr" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.kind === "in" ? c.success : c.danger }}>{t.kind === "in" ? "+" : "−"}{Math.round(t.amount).toLocaleString("de-DE")}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}> تومان</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Home dashboard — checks-due-this-week and the market insight card,
// combined into one auto-rotating slider (same 4.5s rotation + dot pattern
// already used by MomentumCard) instead of two separate static cards.
// Slides with nothing to say (no checks logged yet, not enough listing
// history for a trend) are left out of the rotation entirely rather than
// shown empty.
function HomeInsightSlider({ ctx }) {
  const { c, checks, properties, agencyCity, setTab } = ctx;
  const [face, setFace] = useState(0);

  const in7Days = Date.now() + 7 * 86400000;
  const dueThisWeek = checks.filter((ch) => !ch.paid && new Date(ch.dueDate).getTime() <= in7Days);
  const checksTotal = dueThisWeek.reduce((s, ch) => s + ch.amount, 0);
  const hasChecksSlide = checks.length > 0;

  const [cjy, cjm] = isoToJalali(todayISO());
  let py = cjy, pm = cjm - 1; if (pm <= 0) { pm = 12; py -= 1; }
  const inMonth = (p, y, m) => { const [jy, jm] = isoToJalali((p.createdAt || todayISO()).slice(0, 10)); return jy === y && jm === m; };
  const avgPPM = (list) => { const vals = list.map((p) => p.pricePerMeter).filter(Boolean); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; };
  const thisMonthAvg = avgPPM(properties.filter((p) => inMonth(p, cjy, cjm)));
  const lastMonthAvg = avgPPM(properties.filter((p) => inMonth(p, py, pm)));
  const pctChange = thisMonthAvg && lastMonthAvg ? Math.round(((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100) : null;
  const streetOf = (addr) => {
    if (!addr) return null;
    const m = addr.match(/(خیابان|بلوار|کوچه)\s+([^\،,]+)/);
    if (m) return `${m[1]} ${m[2].trim().split(" ").slice(0, 2).join(" ")}`;
    const first = addr.trim().split(/[\،,]/)[0].trim();
    return first ? first.slice(0, 24) : null;
  };
  const streetCounts = {};
  properties.forEach((p) => { const s = streetOf(p.address); if (s) streetCounts[s] = (streetCounts[s] || 0) + 1; });
  const topStreet = Object.entries(streetCounts).sort((a, b) => b[1] - a[1])[0];
  const hasMarketSlide = pctChange !== null || !!topStreet;

  const slides = [
    hasChecksSlide && "checks",
    hasMarketSlide && "market",
  ].filter(Boolean);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setFace((f) => (f + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const current = slides[face % slides.length];

  return (
    <button onClick={() => current === "checks" ? ctx.setChecksOpen(true) : setTab("finance")} className="press w-full text-right rounded-2xl relative overflow-hidden flora-rise" style={{ padding: SP.md + 2, ...glass(c), marginBottom: SP.xl }}>
      {current === "checks" && (
        <>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 12, fontWeight: 700, color: c.muted }}>چک‌های این هفته</p>
            <Clock size={14} color={c.attn} />
          </div>
          <p style={{ fontSize: 22, fontWeight: 800, color: dueThisWeek.length ? c.attn : c.success, marginTop: 4 }}>{dueThisWeek.length ? fmtToman(checksTotal) : "چکی سررسید ندارد"}</p>
          {dueThisWeek.length > 0 && <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{faDigits(dueThisWeek.length)} چک در ۷ روز آینده</p>}
        </>
      )}
      {current === "market" && (
        <>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 12, fontWeight: 700, color: c.muted }}>تحلیل بازار — بر اساس فایل‌های خودت</p>
            <TrendingUp size={14} color={c.primary} />
          </div>
          {pctChange !== null && (
            <p style={{ fontSize: 13, lineHeight: 1.9, marginTop: 6 }}>
              {agencyCity || "منطقه‌ی تو"} {faDigits(Math.abs(pctChange))}٪ {pctChange >= 0 ? "افزایش" : "کاهش"} قیمت هر متر نسبت به ماه قبل داشته
            </p>
          )}
          {topStreet && (
            <p style={{ fontSize: 13, color: c.muted, marginTop: pctChange !== null ? 4 : 6, lineHeight: 1.9 }}>
              بیشترین فایل فعال: <b style={{ color: c.ink }}>{topStreet[0]}</b> ({faDigits(topStreet[1])} فایل)
            </p>
          )}
        </>
      )}
      {slides.length > 1 && (
        <div className="flex items-center justify-center" style={{ gap: 4, marginTop: SP.md }}>
          {slides.map((_, i) => <div key={i} style={{ width: i === face % slides.length ? 14 : 5, height: 5, borderRadius: 3, background: i === face % slides.length ? c.primary : c.border, transition: "all .3s" }} />)}
        </div>
      )}
    </button>
  );
}

function FinanceCenterView({ ctx, onBack }) {
  const { c, deals, payments, setPayments, setSheet, simpleMode } = ctx;
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  // In simple mode, keep only the three tabs an agent needs daily.
  const visibleTabs = FIN_TABS;
  const [statusFilter, setStatusFilter] = useState("همه");

  const totalValue = deals.reduce((s, d) => s + (d.price || 0), 0);
  const totalCommission = deals.reduce((s, d) => s + dealTotalCommission(d), 0);
  const totalPaidAll = deals.reduce((s, d) => s + dealTotalPaid(d, payments), 0);
  const totalRemainingAll = deals.reduce((s, d) => s + dealTotalRemaining(d, payments), 0);
  const todayVal = deals.filter((d) => (d.createdAt || "").slice(0, 10) === todayISO()).reduce((s, d) => s + d.price, 0);
  const [cjy, cjm] = isoToJalali(todayISO());
  const monthVal = deals.filter((d) => { const [jy, jm] = isoToJalali((d.createdAt || todayISO()).slice(0, 10)); return jy === cjy && jm === cjm; }).reduce((s, d) => s + d.price, 0);
  const yearVal = deals.filter((d) => { const [jy] = isoToJalali((d.createdAt || todayISO()).slice(0, 10)); return jy === cjy; }).reduce((s, d) => s + d.price, 0);
  const avgDeal = deals.length ? Math.round(totalValue / deals.length) : 0;

  const filteredDeals = deals.filter((d) => {
    if (statusFilter !== "همه" && d.status !== statusFilter) return false;
    if (search) { const q = search.toLowerCase(); if (![d.propertyTitle, d.sellerName, d.buyerName].some((s) => (s || "").toLowerCase().includes(q))) return false; }
    return true;
  }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const debtors = deals.flatMap((d) => {
    const out = [];
    const sr = dealRemaining(d, payments, "seller");
    const br = dealRemaining(d, payments, "buyer");
    if (sr > 0) out.push({ name: d.sellerName, phone: d.sellerPhone, amount: sr, days: daysSince(d.createdAt || todayISO()), dealTitle: d.propertyTitle });
    if (br > 0) out.push({ name: d.buyerName, phone: d.buyerPhone, amount: br, days: daysSince(d.createdAt || todayISO()), dealTitle: d.propertyTitle });
    return out;
  }).sort((a, b) => b.amount - a.amount);

  const alerts = [
    ...debtors.filter((x) => x.days >= 10).slice(0, 2).map((x) => ({ type: "red", text: `کمیسیون ${x.name} پرداخت نشده — تماس بگیرید` })),
    ...debtors.filter((x) => x.days < 10).slice(0, 1).map((x) => ({ type: "yellow", text: `معامله «${x.dealTitle}» نزدیک به موعد پرداخت است` })),
    ...deals.filter((d) => dealTotalRemaining(d, payments) === 0).slice(-1).map((d) => ({ type: "green", text: `کمیسیون ${d.propertyTitle} به‌طور کامل دریافت شد` })),
  ];

  const monthlyTotals = Array.from({ length: 6 }, (_, i) => {
    let m = cjm - 5 + i, y = cjy; if (m <= 0) { m += 12; y -= 1; }
    const val = deals.filter((d) => { const [jy, jm] = isoToJalali((d.createdAt || todayISO()).slice(0, 10)); return jy === y && jm === m; }).length;
    return { label: MONTHS_FA[m - 1].slice(0, 3), value: val };
  });
  const maxMonthly = Math.max(1, ...monthlyTotals.map((m) => m.value));

  const advisorMap = {};
  deals.forEach((d) => {
    const key = d.advisor || "بدون نام";
    if (!advisorMap[key]) advisorMap[key] = { name: key, count: 0, value: 0, commission: 0, paid: 0 };
    advisorMap[key].count += 1; advisorMap[key].value += d.price || 0;
    advisorMap[key].commission += dealTotalCommission(d); advisorMap[key].paid += dealTotalPaid(d, payments);
  });
  const advisors = Object.values(advisorMap).sort((a, b) => b.value - a.value);

  const { expenses, setExpenses, officeIncomes, setOfficeIncomes, notify } = ctx;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalOfficeIncome = officeIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const netProfit = totalOfficeIncome - totalExpenses;
  const margin = totalOfficeIncome ? Math.round((netProfit / totalOfficeIncome) * 100) : 0;

  const officeTxns = [
    ...officeIncomes.map((i) => ({ ...i, kind: "in", label: i.title })),
    ...expenses.map((e) => ({ ...e, kind: "out", label: e.title, sub: e.category })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const expenseByCategory = EXPENSE_CATEGORIES.map((cat, i) => ({
    name: cat, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    value: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const expenseCatTotal = Math.max(1, expenseByCategory.reduce((s, x) => s + x.value, 0));

  const monthlyIncomeExpense = Array.from({ length: 6 }, (_, i) => {
    let m = cjm - 5 + i, y = cjy; if (m <= 0) { m += 12; y -= 1; }
    const income = officeIncomes.filter((x) => { const [jy, jm] = isoToJalali(x.date); return jy === y && jm === m; }).reduce((s, x) => s + x.amount, 0);
    const expense = expenses.filter((x) => { const [jy, jm] = isoToJalali(x.date); return jy === y && jm === m; }).reduce((s, x) => s + x.amount, 0);
    return { label: MONTHS_FA[m - 1].slice(0, 3), income, expense };
  });
  const maxIncExp = Math.max(1, ...monthlyIncomeExpense.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className={onBack ? "pt-2" : "pt-16"}>
      {onBack && <BackHeader c={c} title="مرکز مالی" onBack={onBack} />}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {visibleTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="press shrink-0 rounded-xl px-3.5 py-2" style={tab === t.id ? { background: c.gradientPrimary } : glass(c)}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tab === t.id ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {/* Total-balance hero — collected commission on the face, outstanding in the pill */}
          <div className="flora-rise" style={{ marginBottom: SP.lg }}>
            <BalanceCard
              c={c}
              label="کمیسیون دریافتی"
              value={totalPaidAll}
              pillIcon={Wallet}
              pillLabel="وصول‌نشده"
              pillValue={fmtToman(totalRemainingAll)}
              onPillClick={() => setTab("debtors")}
            />
          </div>

          <div className="flex items-center" style={{ gap: SP.sm, marginBottom: SP.lg }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: debtors.length > 0 ? c.danger : c.success }} className={debtors.length > 0 ? "flora-pulse" : ""} />
            <p style={{ fontSize: FS.caption, color: c.muted }}>{debtors.length > 0 ? `${faDigits(debtors.length)} نفر بدهکار نیاز به پیگیری دارند` : "همه‌ی حساب‌ها تسویه است"}</p>
          </div>

          {simpleMode && (
            <button onClick={() => setSheet("deal")} className="press w-full rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: c.gradientPrimary, boxShadow: "0 12px 30px rgba(47,124,246,0.32)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}><FileText size={24} color="#fff" /></div>
              <div className="text-right">
                <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>ثبت قرارداد جدید</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>معامله و کمیسیونش را ثبت کن</p>
              </div>
            </button>
          )}

          {/* One row, auto-scrolling — exactly the 6 figures requested */}
          <FinMarquee c={c} items={[
            { icon: TrendingUp, color: c.purple, value: fmtToman(yearVal), label: "فروش امسال" },
            { icon: CalendarDays, color: c.primary, value: fmtToman(monthVal), label: "فروش ماهیانه" },
            { icon: Landmark, color: c.primary, value: fmtToman(totalValue), label: "ارزش کل معاملات" },
            { icon: AlertTriangle, color: c.attn, value: fmtToman(totalRemainingAll), label: "کمیسیون وصول‌نشده" },
            { icon: Wallet, color: c.success, value: fmtToman(netProfit), label: "سود خالص" },
            { icon: TrendingDown, color: c.danger, value: fmtToman(totalExpenses), label: "کل هزینه" },
          ]} />

          <div style={{ height: SP.md }} />

          <MonthlyDealsChart c={c} data={monthlyTotals} max={maxMonthly} />

          {totalPaidAll > 0 && <MoneyIdeasCard ctx={ctx} received={totalPaidAll} />}

          <SectionHeader c={c} title="هشدارها" />
          <div className="flex flex-col gap-2 mb-4">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: a.type === "red" ? c.dangerSoft : a.type === "yellow" ? c.attnSoft : c.successSoft }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: a.type === "red" ? c.danger : a.type === "yellow" ? c.attn : c.success, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: c.ink }}>{a.text}</span>
              </div>
            ))}
            {alerts.length === 0 && <EmptyLine c={c} text="هشداری وجود ندارد" />}
          </div>
        </div>
      )}

      {tab === "split" && <SplitTab ctx={ctx} deals={deals} payments={payments} />}

      {tab === "transactions" && (
        <div>
          <SearchBox c={c} value={search} setValue={setSearch} />
          <div className="flex gap-2 overflow-x-auto pb-1 my-3">
            {["همه", "تسویه شده", "در انتظار پرداخت", "در حال مذاکره"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className="press shrink-0 rounded-full px-3 py-1.5" style={statusFilter === s ? { background: c.gradientPrimary } : glass(c)}>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusFilter === s ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{s}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setSheet("deal")} className="press w-full rounded-xl py-3 mb-3 flex items-center justify-center gap-2" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 13 }}><Plus size={14} /> ثبت قرارداد جدید</button>
          <div className="flex flex-col gap-3 flora-stagger">
            {filteredDeals.map((d) => (
              <button key={d.id} onClick={() => setSheet({ kind: "deal-detail", dealId: d.id })} className="press w-full text-right rounded-2xl p-4" style={glass(c)}>
                <div className="flex justify-between items-start mb-2.5">
                  <div><p style={{ fontSize: 15, fontWeight: 700 }}>{d.propertyTitle}</p></div>
                  <DealStatusBadge c={c} status={d.status} />
                </div>
                <div className="flex gap-4 mb-2.5">
                  <div className="flex-1"><p style={{ fontSize: 10, color: c.muted, marginBottom: 2 }}>فروشنده</p><p style={{ fontSize: 13, fontWeight: 600 }}>{d.sellerName || "—"}</p></div>
                  <div className="flex-1"><p style={{ fontSize: 10, color: c.muted, marginBottom: 2 }}>خریدار</p><p style={{ fontSize: 13, fontWeight: 600 }}>{d.buyerName || "—"}</p></div>
                </div>
                <div className="flex justify-between items-center pt-2.5" style={{ borderTop: `1px solid ${c.border}` }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#fde68a,#f59e0b)" }}><Banknote size={10} color="#7c2d12" /></div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: c.primary, direction: "ltr" }}>{fmtToman(d.price)}</p>
                  </div>
                  <p style={{ fontSize: 11, color: c.muted }}>{d.advisor}</p>
                </div>
                <div style={{ height: 5, borderRadius: 8, background: c.surface2, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${dealProgress(d, payments)}%`, borderRadius: 8, background: `linear-gradient(90deg, ${c.success}, #4ade80)` }} />
                </div>
              </button>
            ))}
            {filteredDeals.length === 0 && <EmptyLine c={c} text="معامله‌ای پیدا نشد" />}
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <div className="mt-4">
          <SectionHeader c={c} title="تاریخچه پرداخت‌ها" action={<button onClick={() => setSheet("payment")} className="press flex items-center gap-1 rounded-lg px-3 py-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 11 }}><Plus size={12} /> ثبت پرداخت</button>} />
          <div className="flex flex-col gap-2 flora-stagger">
            {[...payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
              const deal = deals.find((d) => d.id === p.dealId);
              const method = PAYMENT_METHODS.find((m) => m.id === p.method) || PAYMENT_METHODS[0];
              const payerName = deal ? (p.payerType === "seller" ? deal.sellerName : deal.buyerName) : "—";
              return (
                <div key={p.id} className="rounded-xl p-3.5 flex items-center gap-2.5" style={glass(c)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><method.icon size={17} color={c.primary} /></div>
                  <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{payerName}</p><p style={{ fontSize: 11, color: c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{method.label} · {deal?.propertyTitle}</p></div>
                  <div className="text-left shrink-0"><p style={{ fontSize: 13, fontWeight: 800, color: c.success }}>+{fmtToman(p.amount)}</p><p style={{ fontSize: 10, color: c.muted }}>{fmtJalali(p.date)}</p></div>
                  <button onClick={() => setSheet({ kind: "payment", editId: p.id })} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={12} color={c.primary} /></button>
                  <button onClick={() => { setPayments((prev) => prev.filter((x) => x.id !== p.id)); notify("پرداخت حذف شد"); }} className="press w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={12} color={c.danger} /></button>
                </div>
              );
            })}
            {payments.length === 0 && <EmptyLine c={c} text="پرداختی ثبت نشده" />}
          </div>
        </div>
      )}

      {/* چک‌ها moved out to its own home-screen section — see setChecksOpen */}

      {tab === "office" && (
        <div>
          <div className="grid grid-cols-2 gap-2.5 mb-3 flora-stagger">
            <FinStat c={c} icon={TrendingUp} color={c.success} value={fmtToman(totalOfficeIncome)} label="کل درآمد دفتر" />
            <FinStat c={c} icon={TrendingDown} color={c.danger} value={fmtToman(totalExpenses)} label="کل هزینه‌های دفتر" />
          </div>
          <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c), background: `linear-gradient(160deg, ${netProfit >= 0 ? c.successSoft : c.dangerSoft}, ${c.surface} 65%)`, position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", inset: 6, borderRadius: 14, border: `1px dashed ${(netProfit >= 0 ? c.success : c.danger)}33`, pointerEvents: "none" }} />
            <div className="flex items-center justify-between" style={{ position: "relative" }}>
              <div className="flex items-center gap-2">
                <div className="flora-coin w-7 h-7 rounded-full flex items-center justify-center" style={{ background: netProfit >= 0 ? "linear-gradient(135deg,#86efac,#22c55e)" : "linear-gradient(135deg,#fca5a5,#ef4444)" }}>
                  <Banknote size={13} color="#fff" />
                </div>
                <span style={{ fontSize: 13, color: c.muted, fontWeight: 700 }}>سود خالص دفتر</span>
              </div>
              <div className="text-left">
                <CountUpToman value={Math.abs(netProfit)} style={{ fontSize: 15, fontWeight: 800, color: netProfit >= 0 ? c.success : c.danger, direction: "ltr", display: "inline-block" }} />
                {netProfit < 0 && <p style={{ fontSize: 10, color: c.danger }}>زیان</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setSheet("income")} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.successSoft, color: c.success, fontWeight: 700, fontSize: 13 }}><Plus size={14} /> ثبت درآمد</button>
            <button onClick={() => setSheet("expense")} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.dangerSoft, color: c.danger, fontWeight: 700, fontSize: 13 }}><Plus size={14} /> ثبت هزینه</button>
          </div>

          <SectionHeader c={c} title="گردش مالی دفتر" />
          <div className="flex flex-col gap-2 flora-stagger">
            {officeTxns.map((t) => (
              <div key={t.kind + t.id} className="rounded-xl p-3.5 flex items-center gap-3" style={glass(c)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.kind === "in" ? c.successSoft : c.dangerSoft }}>
                  {t.kind === "in" ? <TrendingUp size={16} color={c.success} /> : <TrendingDown size={16} color={c.danger} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</p>
                  <p style={{ fontSize: 11, color: c.muted }}>{t.category || (t.kind === "in" ? "درآمد" : "هزینه")} · {fmtJalali(t.date)}</p>
                </div>
                <p className="shrink-0" style={{ fontSize: 13, fontWeight: 800, color: t.kind === "in" ? c.success : c.danger }}>{t.kind === "in" ? "+" : "−"}{fmtToman(t.amount)}</p>
                <button onClick={() => setSheet({ kind: t.kind === "in" ? "income" : "expense", editId: t.id })} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.primarySoft }}><Edit3 size={13} color={c.primary} /></button>
                <button onClick={() => {
                  if (t.kind === "in") setOfficeIncomes((prev) => prev.filter((x) => x.id !== t.id));
                  else setExpenses((prev) => prev.filter((x) => x.id !== t.id));
                  notify("حذف شد");
                }} className="press w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: c.dangerSoft }}><Trash2 size={13} color={c.danger} /></button>
              </div>
            ))}
            {officeTxns.length === 0 && <EmptyLine c={c} text="هنوز درآمد یا هزینه‌ای ثبت نشده" />}
          </div>
        </div>
      )}

      {tab === "debtors" && (
        <div>
          <SectionHeader c={c} title="بدهکاران" />
          <div className="flex flex-col gap-2.5 flora-stagger">
            {debtors.map((x, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ ...glassLite(c, 22), border: `1px solid ${c.dangerSoft}` }}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.dangerSoft }}><UserCircle2 size={17} color={c.danger} /></div>
                    <div><p style={{ fontSize: 13, fontWeight: 700 }}>{x.name}</p><p style={{ fontSize: 10, color: c.danger }}>{faDigits(x.days)} روز تأخیر</p></div>
                  </div>
                  <CountUpToman value={x.amount} style={{ fontSize: 15, fontWeight: 800, color: c.danger, direction: "ltr", display: "inline-block" }} />
                </div>
                <div className="flex gap-2">
                  <a href={x.phone ? `tel:${x.phone}` : "#"} className="press flex-1 rounded-xl py-2.5 flex items-center justify-center gap-1.5" style={{ background: c.successSoft, opacity: x.phone ? 1 : 0.5, pointerEvents: x.phone ? "auto" : "none" }}><PhoneCall size={13} color={c.success} /><span style={{ fontSize: 11, fontWeight: 700, color: c.success }}>تماس</span></a>
                  <a href={x.phone ? (smsLink(x.phone, `سلام ${x.name} عزیز، پیرو معامله‌ی ${x.dealTitle}، یادآوری کمیسیون باقی‌مانده به مبلغ ${fmtToman(x.amount)}.`) || "#") : "#"} className="press flex-1 rounded-xl py-2.5 flex items-center justify-center gap-1.5" style={{ background: c.primarySoft, opacity: x.phone ? 1 : 0.5, pointerEvents: x.phone ? "auto" : "none" }}><MessageSquare size={13} color={c.primary} /><span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>پیامک</span></a>
                </div>
              </div>
            ))}
            {debtors.length === 0 && <EmptyLine c={c} text="بدهکاری وجود ندارد" />}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="rounded-xl p-3.5 text-center" style={glass(c)}><p style={{ fontSize: 15, fontWeight: 800 }}>{faDigits(deals.length)}</p><p style={{ fontSize: 11, color: c.muted }}>تعداد قرارداد</p></div>
            <div className="rounded-xl p-3.5 text-center" style={glass(c)}><p style={{ fontSize: 15, fontWeight: 800 }}>{fmtToman(totalValue)}</p><p style={{ fontSize: 11, color: c.muted }}>مجموع ارزش معاملات</p></div>
            <div className="rounded-xl p-3.5 text-center" style={glass(c)}><p style={{ fontSize: 15, fontWeight: 800 }}>{fmtToman(totalCommission)}</p><p style={{ fontSize: 11, color: c.muted }}>مجموع کمیسیون</p></div>
            <div className="rounded-xl p-3.5 text-center" style={glass(c)}><p style={{ fontSize: 15, fontWeight: 800 }}>{fmtToman(avgDeal)}</p><p style={{ fontSize: 11, color: c.muted }}>میانگین معامله</p></div>
          </div>
          <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 4 }}>کل دریافت‌شده</p><p style={{ fontSize: 13, fontWeight: 700, color: c.success, marginBottom: 10 }}>{fmtToman(totalPaidAll)}</p>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 4 }}>مانده کل</p><p style={{ fontSize: 13, fontWeight: 700, color: c.attn, marginBottom: 10 }}>{fmtToman(totalRemainingAll)}</p>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 4 }}>درصد وصول</p><p style={{ fontSize: 13, fontWeight: 700, color: c.success }}>{faDigits(totalCommission ? Math.round((totalPaidAll / totalCommission) * 100) : 0)}٪</p>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 13, fontWeight: 700 }}>درآمد و هزینه ۶ ماه اخیر</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1" style={{ fontSize: 10, color: c.muted }}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.success }} /> درآمد</span>
                <span className="flex items-center gap-1" style={{ fontSize: 10, color: c.muted }}><span style={{ width: 8, height: 8, borderRadius: 3, background: c.danger }} /> هزینه</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2" style={{ height: 96 }}>
              {monthlyIncomeExpense.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center gap-1" style={{ height: 76 }}>
                    <div style={{ width: "42%", borderRadius: "5px 5px 0 0", background: `linear-gradient(180deg,#4ade80,${c.success})`, height: `${Math.max(3, (m.income / maxIncExp) * 72)}px`, transition: "height .7s cubic-bezier(.34,1.3,.64,1)" }} />
                    <div style={{ width: "42%", borderRadius: "5px 5px 0 0", background: `linear-gradient(180deg,#fca5a5,${c.danger})`, height: `${Math.max(3, (m.expense / maxIncExp) * 72)}px`, transition: "height .7s cubic-bezier(.34,1.3,.64,1)" }} />
                  </div>
                  <span style={{ fontSize: 10, color: c.muted }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>سود و زیان دفتر</p>
            <Row c={c} label="درآمد دفتر" value={fmtToman(totalOfficeIncome)} color={c.success} />
            <Row c={c} label="هزینه‌های دفتر" value={fmtToman(totalExpenses)} color={c.danger} />
            <Row c={c} label={netProfit >= 0 ? "سود خالص" : "زیان خالص"} value={fmtToman(Math.abs(netProfit))} color={netProfit >= 0 ? c.success : c.danger} />
            <Row c={c} label="حاشیه سود" value={`${faDigits(margin)}٪`} color={margin >= 0 ? c.success : c.danger} />
          </div>

          <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>هزینه‌ها به تفکیک دسته</p>
            {expenseByCategory.length === 0 ? <EmptyLine c={c} text="هزینه‌ای ثبت نشده" /> : (
              <div className="flex flex-col gap-2.5">
                {expenseByCategory.map((x) => {
                  const pct = Math.round((x.value / expenseCatTotal) * 100);
                  return (
                    <div key={x.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: c.ink }}><span style={{ width: 8, height: 8, borderRadius: 3, background: x.color }} /> {x.name}</span>
                        <span style={{ fontSize: 11, color: c.muted }}>{fmtToman(x.value)} · {faDigits(pct)}٪</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 8, background: c.surface2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 8, background: x.color, transition: "width .7s cubic-bezier(.34,1.3,.64,1)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div>
          <SectionHeader c={c} title="رتبه‌بندی مشاوران" />
          <div className="flex flex-col gap-2.5">
            {advisors.map((a, i) => (
              <div key={a.name} className="rounded-xl p-3.5 flex items-center gap-3" style={glass(c)}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: i === 0 ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : i === 1 ? "linear-gradient(135deg,#cbd5e1,#94a3b8)" : i === 2 ? "linear-gradient(135deg,#d97706,#92400e)" : c.surface2, color: i < 3 ? "#1a1a2e" : c.muted, fontWeight: 800, fontSize: 13 }}>{faDigits(i + 1)}</div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</p>
                  <p style={{ fontSize: 10, color: c.muted }}>معاملات: {faDigits(a.count)} · ارزش: {fmtToman(a.value)} · وصول: {faDigits(a.commission ? Math.round((a.paid / a.commission) * 100) : 0)}٪</p>
                </div>
              </div>
            ))}
            {advisors.length === 0 && <EmptyLine c={c} text="معامله‌ای ثبت نشده" />}
          </div>
        </div>
      )}

      {tab === "overview" && <RecentActivityCard ctx={ctx} onSeeAll={() => setTab("transactions")} />}
      <div style={{ height: 20 }} />
    </div>
  );
}

// Auto-drifts left, but is also a real scroller so it can be swiped by hand.
// A CSS animation can't be dragged, so instead this nudges scrollLeft each frame and lets
// native touch scrolling do the rest. The track is duplicated and wrapped at the halfway
// point, so the loop is seamless in either direction and after any manual fling.
function FinMarquee({ c, items }) {
  const scrollerRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(null);
  const doubled = [...items, ...items];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf;
    const SPEED = 0.35; // px per frame — slow enough to read while it moves

    const half = () => el.scrollWidth / 2;
    const wrap = () => {
      const h = half();
      if (h <= 0) return;
      if (el.scrollLeft >= h) el.scrollLeft -= h;
      else if (el.scrollLeft <= 0) el.scrollLeft += h;
    };
    const tick = () => {
      if (!pausedRef.current) {
        el.scrollLeft += SPEED;
        wrap();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    el.addEventListener("scroll", wrap, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", wrap); };
  }, [items.length]);

  const hold = () => { pausedRef.current = true; clearTimeout(resumeTimer.current); };
  // Wait a beat after release so a fling can coast before the drift takes over again.
  const release = () => { clearTimeout(resumeTimer.current); resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 1600); };

  return (
    // dir=ltr on the frame is deliberate: under RTL an over-wide track anchors to the RIGHT
    // and spills left, which broke the loop. LTR anchors it left and spills right.
    <div dir="ltr" className="mb-5" style={{ position: "relative", margin: "0 -16px" }}>
      <span style={{ position: "absolute", inset: "0 auto 0 0", width: 26, zIndex: 2, background: `linear-gradient(90deg, ${c.bg}, transparent)`, pointerEvents: "none" }} />
      <span style={{ position: "absolute", inset: "0 0 0 auto", width: 26, zIndex: 2, background: `linear-gradient(270deg, ${c.bg}, transparent)`, pointerEvents: "none" }} />
      <div
        ref={scrollerRef}
        onTouchStart={hold} onTouchEnd={release} onTouchCancel={release}
        onMouseEnter={hold} onMouseLeave={release}
        onWheel={() => { hold(); release(); }}
        style={{ display: "flex", gap: 8, overflowX: "auto", overflowY: "hidden", padding: "4px 16px", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {doubled.map((it, i) => (
          <div key={i} dir="rtl" className="relative overflow-hidden" style={{ borderRadius: 14, padding: 12, width: 122, flexShrink: 0, background: "linear-gradient(160deg,#15181f 0%,#0c0e13 100%)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 8, background: it.color + "22", marginBottom: 8 }}><it.icon size={11} color={it.color} /></div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 3 }}>{it.label}</p>
            <p dir="ltr" style={{ whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{it.value.replace(" تومان", "")}</span>
              {it.value.includes("تومان") && <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.45)" }}> تومان</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyDealsChart({ c, data, max }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);
  const best = data.reduce((m, x) => (x.value > m ? x.value : m), 0);
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c), background: `linear-gradient(160deg, ${c.primarySoft}, ${c.surface} 60%)` }}>
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: 13, fontWeight: 700 }}>تعداد معاملات ۶ ماه اخیر</p>
        <span style={{ fontSize: 10, color: c.muted, background: c.surface2, padding: "3px 8px", borderRadius: 999 }}>مجموع {faDigits(data.reduce((a, b) => a + b.value, 0))}</span>
      </div>
      <div className="flex items-end justify-between gap-2" style={{ height: 108, position: "relative" }}>
        {[0.33, 0.66, 1].map((g, i) => (
          <span key={i} style={{ position: "absolute", left: 0, right: 0, bottom: `${18 + g * 76}px`, height: 1, background: c.border, opacity: .5 }} />
        ))}
        {data.map((m, i) => {
          const h = Math.max(4, (m.value / max) * 76);
          const isBest = m.value === best && best > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5" style={{ zIndex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: isBest ? c.primary : c.muted, opacity: show ? 1 : 0, transition: "opacity .5s ease .5s" }}>{m.value ? faDigits(m.value) : ""}</span>
              <div style={{ width: "100%", position: "relative", display: "flex", justifyContent: "center" }}>
                <div style={{
                  width: "72%", borderRadius: "7px 7px 3px 3px",
                  background: isBest ? "linear-gradient(180deg,#7c6ff5,#2f7cf6)" : `linear-gradient(180deg,${c.primary}88,${c.primary}33)`,
                  boxShadow: isBest ? "0 6px 16px rgba(124,111,245,.45)" : "none",
                  height: show ? `${h}px` : "3px",
                  transition: `height .8s cubic-bezier(.34,1.3,.64,1) ${i * 0.07}s`,
                }} />
              </div>
              <span style={{ fontSize: 10, color: isBest ? c.primary : c.muted, fontWeight: isBest ? 700 : 400 }}>{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Commission split. Every number here is derived from payments already received, so the
// three shares always reconcile back to the money that actually came in.
function SplitTab({ ctx, deals, payments }) {
  const { c, splitShares, setSplitShares, notify } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(splitShares);

  const receivedTotal = deals.reduce((sum, d) => sum + dealTotalPaid(d, payments), 0);
  const pendingTotal = deals.reduce((sum, d) => sum + dealTotalRemaining(d, payments), 0);
  const parts = splitAmounts(receivedTotal, splitShares);
  const futureParts = splitAmounts(pendingTotal, splitShares);
  const unitSum = SPLIT_PARTIES.reduce((a, p) => a + (Number(splitShares?.[p.id]) || 0), 0);

  const perDeal = deals
    .map((d) => ({ deal: d, paid: dealTotalPaid(d, payments) }))
    .filter((x) => x.paid > 0)
    .sort((a, b) => b.paid - a.paid);

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4" style={{ background: c.gradientPrimary, position: "relative", overflow: "hidden", border: "1px solid rgba(251,191,36,.25)" }}>
        <span style={{ position: "absolute", top: "-45%", left: "-20%", width: 190, height: 190, background: "radial-gradient(circle,rgba(255,255,255,.12),transparent 70%)", animation: "floraFloat 5s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -18, right: -12, opacity: 0.1, pointerEvents: "none" }}><FloraMark size={120} color="#fbbf24" stroke={1.1} /></div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.7)", letterSpacing: ".04em" }}>کمیسیون دریافت‌شده (قابل تقسیم)</p>
        <CountUpToman value={receivedTotal} className="flora-money" style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24", display: "inline-block", marginTop: 3, direction: "ltr" }} />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 6, lineHeight: 1.8 }}>
          فقط پولی که واقعاً به دست‌مان رسیده تقسیم می‌شود؛ مانده‌ی وصول‌نشده پایین جدا آمده تا حساب‌ها قاطی نشود.
        </p>
      </div>

      {/* The ratio itself */}
      <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 13, fontWeight: 700 }}>نسبت تقسیم</p>
          {!editing ? (
            <button onClick={() => { setDraft(splitShares); setEditing(true); }} className="press flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: c.primarySoft }}>
              <Edit3 size={11} color={c.primary} /><span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>تغییر</span>
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(false)} className="press rounded-lg px-2.5 py-1.5" style={{ background: c.surface2, fontSize: 11, fontWeight: 700, color: c.muted }}>لغو</button>
              <button onClick={() => {
                const total = SPLIT_PARTIES.reduce((a, p) => a + (Number(toEnDigits(String(draft[p.id]))) || 0), 0);
                if (!total) { notify("حداقل یک سهم باید بزرگ‌تر از صفر باشد"); return; }
                setSplitShares({ agent: Number(toEnDigits(String(draft.agent))) || 0, management: Number(toEnDigits(String(draft.management))) || 0, rent: Number(toEnDigits(String(draft.rent))) || 0 });
                setEditing(false); notify("نسبت تقسیم ذخیره شد");
              }} className="press rounded-lg px-2.5 py-1.5" style={{ background: c.primary, fontSize: 11, fontWeight: 700, color: "#fff" }}>ذخیره</button>
            </div>
          )}
        </div>
        {editing ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {SPLIT_PARTIES.map((p) => (
                <div key={p.id}>
                  <p style={{ fontSize: 10, color: c.muted, marginBottom: 5 }}>{p.label}</p>
                  <input inputMode="numeric" value={draft[p.id]} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })} style={{ ...inputStyle(c), textAlign: "center", padding: "9px 6px" }} />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: c.muted, marginTop: 8, lineHeight: 1.8 }}>سهم‌ها نسبی‌اند: ۱-۱-۱ یعنی تقسیم مساوی سه‌نفره. مثلاً ۲-۱-۱ یعنی سهم تو دو برابر.</p>
          </>
        ) : (
          <div className="flex gap-2">
            {SPLIT_PARTIES.map((p, i) => {
              const units = Number(splitShares?.[p.id]) || 0;
              const pct = unitSum ? Math.round((units / unitSum) * 100) : 0;
              return (
                <div key={p.id} className="flex-1 rounded-xl p-2.5 text-center" style={{ background: p.color + "14", border: `1px solid ${p.color}2e` }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{faDigits(pct)}%</p>
                  <p style={{ fontSize: 10, color: c.muted, marginTop: 1 }}>{p.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The three shares */}
      <SectionHeader c={c} title="سهم هر طرف از دریافتی‌ها" />
      <div className="flex flex-col gap-2.5 mb-4 flora-stagger">
        {SPLIT_PARTIES.map((p, i) => (
          <div key={p.id} className="rounded-2xl p-4" style={{ ...glass(c), background: `linear-gradient(160deg, ${p.color}12, ${c.surface} 62%)`, position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", inset: 6, borderRadius: 14, border: `1px dashed ${p.color}2e`, pointerEvents: "none" }} />
            <div className="flex items-center justify-between" style={{ position: "relative" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: p.color + "22", boxShadow: `inset 0 0 0 1.5px ${p.color}44` }}><p.icon size={17} color={p.color} /></div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</p>
                  <p style={{ fontSize: 10, color: c.muted }}>سهم {faDigits(unitSum ? Math.round(((Number(splitShares?.[p.id]) || 0) / unitSum) * 100) : 0)}%</p>
                </div>
              </div>
              <CountUpToman value={parts[i]} style={{ fontSize: 15, fontWeight: 800, color: p.color, direction: "ltr", display: "inline-block" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Reconciliation — proves the three parts add back up */}
      <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>کنترل حساب</p>
        {SPLIT_PARTIES.map((p, i) => <Row key={p.id} c={c} label={p.label} value={fmtToman(parts[i])} color={p.color} />)}
        <div className="flex justify-between items-center" style={{ paddingTop: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>جمع سه سهم</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: parts.reduce((a, b) => a + b, 0) === receivedTotal ? c.success : c.danger, direction: "ltr" }}>{fmtToman(parts.reduce((a, b) => a + b, 0))}</span>
        </div>
        <p className="flex items-center gap-1.5" style={{ fontSize: 10, color: c.success, marginTop: 6 }}>
          <BadgeCheck size={11} /> برابر با کل دریافتی — ریالی کم و زیاد نشده
        </p>
      </div>

      {/* Not yet collected */}
      {pendingTotal > 0 && (
        <>
          <SectionHeader c={c} title="هنوز وصول نشده (سهم آینده)" />
          <div className="rounded-2xl p-4 mb-4" style={{ ...glass(c), border: `1px solid ${c.attnSoft}` }}>
            <p style={{ fontSize: 11, color: c.muted, marginBottom: 8, lineHeight: 1.8 }}>این مبالغ هنوز به دست‌مان نرسیده؛ فقط برای برنامه‌ریزی است و در حساب بالا لحاظ نشده.</p>
            {SPLIT_PARTIES.map((p, i) => <Row key={p.id} c={c} label={p.label} value={fmtToman(futureParts[i])} color={c.muted} />)}
            <div className="flex justify-between items-center" style={{ paddingTop: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: c.attn }}>جمع وصول‌نشده</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: c.attn, direction: "ltr" }}>{fmtToman(pendingTotal)}</span>
            </div>
          </div>
        </>
      )}

      {/* Per-deal breakdown */}
      <SectionHeader c={c} title="تفکیک به ازای هر معامله" />
      <div className="flex flex-col gap-2 mb-4 flora-stagger">
        {perDeal.map(({ deal, paid }) => {
          const dp = splitAmounts(paid, splitShares);
          return (
            <div key={deal.id} className="rounded-xl p-3.5" style={glass(c)}>
              <div className="flex items-center justify-between mb-2.5">
                <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deal.propertyTitle}</p>
                <span style={{ fontSize: 11, fontWeight: 800, color: c.success, direction: "ltr", flexShrink: 0, marginRight: 8 }}>{fmtToman(paid)}</span>
              </div>
              <div className="flex gap-1.5">
                {SPLIT_PARTIES.map((p, i) => (
                  <div key={p.id} className="flex-1 rounded-lg py-1.5 px-1 text-center" style={{ background: p.color + "14" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: p.color, direction: "ltr" }}>{dp[i].toLocaleString("de-DE")}</p>
                    <p style={{ fontSize: 10, color: c.muted, marginTop: 1 }}>{p.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {perDeal.length === 0 && <EmptyLine c={c} text="هنوز کمیسیونی دریافت نشده" />}
      </div>
    </div>
  );
}

function FinStat({ c, icon: Icon, color, value, label }) {
  return (
    <div className="rounded-xl p-3.5" style={{ ...glass(c), background: `linear-gradient(160deg, ${color}14, ${c.surface} 60%)`, position: "relative", overflow: "hidden" }}>
      {/* faint coin edge in the corner */}
      <span style={{ position: "absolute", top: -14, left: -14, width: 46, height: 46, borderRadius: "50%", border: `1.5px dashed ${color}33`, pointerEvents: "none" }} />
      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2.5" style={{ background: color + "22", boxShadow: `inset 0 0 0 1.5px ${color}33` }}><Icon size={15} color={color} /></div>
      <p style={{ fontSize: 13, fontWeight: 800, direction: "ltr", textAlign: "right" }}>{value}</p>
      <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{label}</p>
    </div>
  );
}

// Given the commission actually received, suggest ways to use/preserve it —
// grounded in today's Iranian market (dollar, gold, real-estate). The AI is told
// to reason about the current climate rather than give generic advice.
function MoneyIdeasCard({ ctx, received }) {
  const { c, hasAiKey, callAI, notify, setSheet } = ctx;
  const [ideas, setIdeas] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); setSheet("ai-settings"); return; }
    setLoading(true);
    try {
      // pull the cached market snapshot the home widget stores
      let market = "";
      try { const m = JSON.parse(localStorage.getItem("flora-market") || "null"); if (m) market = `دلار حدود ${m.usd} تومان، طلای گرمی حدود ${m.gold} تومان.`; } catch (e) {}
      const today = fmtJalali(todayISO());
      const prompt = `تو یک مشاور مالی باتجربه‌ی ایرانی هستی. یک مشاور املاک تازه ${fmtToman(received)} کمیسیون دریافت کرده. امروز ${today} است. ${market ? "وضعیت بازار امروز: " + market : ""}
با توجه به شرایط اقتصادی و تورمی ایران در همین مقطع، ۴ تا ۵ ایده‌ی کوتاه و عملی بده که با این پول چه کند تا ارزشش حفظ یا بیشتر شود (مثلاً بخشی طلا، بخشی دلار، سرمایه‌گذاری روی فایل ملکی، سپرده، و…). لحن ساده و رفیقانه. برای هر ایده یک مزیت کوتاه بگو.
دقیقاً JSON خام برگردان (بدون توضیح، بدون markdown):
{"climate":"یک جمله درباره‌ی فضای کلی بازار امروز و اینکه پول نقد نگه‌داشتن چه ریسکی دارد","ideas":[{"title":"عنوان کوتاه","detail":"توضیح یک‌خطی","share":"مثلاً ۳۰٪"}]}
اگر عددی از بازار نداری، حدس نزن و در climate صادقانه بگو قیمت روز را چک کند.`;
      const text = await callAI(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setIdeas(parsed);
    } catch (e) {
      if (e instanceof SyntaxError) notify("پاسخ AI قابل‌خواندن نبود — دوباره امتحان کن");
      else notify(`خطا: ${e.message || "نامشخص"}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.lg, ...glass(c) }}>
      <div className="flex items-center justify-between" style={{ marginBottom: ideas ? SP.md : 0 }}>
        <div className="flex items-center" style={{ gap: SP.sm }}>
          <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: RAD.md, background: c.successSoft }}><Landmark size={18} color={c.success} /></div>
          <div>
            <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>ایده برای کمیسیون دریافتی</p>
            <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 1 }}>متناسب با بازار امروز ایران</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="press rounded-full flex items-center" style={{ gap: SP.xs, padding: `6px ${SP.md}px`, background: c.primarySoft }}>
          {loading ? <Loader2 size={13} className="animate-spin" color={c.primary} /> : <Sparkles size={13} color={c.primary} />}
          <span style={{ fontSize: FS.caption, fontWeight: FW.bold, color: c.primary }}>{loading ? "..." : ideas ? "دوباره" : "ایده بده"}</span>
        </button>
      </div>
      {ideas && (
        <div className="flora-rise">
          {ideas.climate && <p style={{ fontSize: FS.caption, color: c.attn, lineHeight: 1.8, marginBottom: SP.md, background: c.attnSoft, padding: SP.md, borderRadius: RAD.md }}>{ideas.climate}</p>}
          <div className="flex flex-col" style={{ gap: SP.sm }}>
            {(ideas.ideas || []).map((it, i) => (
              <div key={i} className="flex items-start" style={{ gap: SP.md, padding: SP.md, borderRadius: RAD.md, background: c.surface2 }}>
                {it.share && <span className="shrink-0 rounded-full" style={{ fontSize: FS.caption, fontWeight: FW.heavy, color: c.primary, background: c.primarySoft, padding: `3px ${SP.sm}px` }}>{it.share}</span>}
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>{it.title}</p>
                  <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.7 }}>{it.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: c.muted, marginTop: SP.md, lineHeight: 1.7, textAlign: "center" }}>این‌ها پیشنهاد کلی‌اند، نه توصیه‌ی قطعی سرمایه‌گذاری. قبل از تصمیم، قیمت روز را چک کن.</p>
        </div>
      )}
    </div>
  );
}


// ---------- Sheet shell + fields ----------
function SheetShell({ c, title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    // `fixed` (not `absolute`) — the app shell uses minHeight:100vh, so it can be
    // taller than the screen; an absolutely-positioned sheet would anchor to the
    // bottom of the *document* instead of the viewport and render off-screen.
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()} className="w-full p-5 flora-sheet overflow-y-auto"
        style={{ ...glass(c), borderRadius: "26px 26px 0 0", maxWidth: 390, maxHeight: "92dvh", overscrollBehavior: "contain", outline: "none", paddingBottom: `calc(${SP.xxl}px + env(safe-area-inset-bottom, 0px))` }}>
        <div className="w-10 h-1.5 rounded-full mx-auto mb-4" style={{ background: c.surface2 }} />
        <div className="flex items-center justify-between mb-4"><h3 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>{title}</h3><button onClick={onClose} aria-label="بستن" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button></div>
        {children}
      </div>
    </div>
  );
}
function QuickAddSheet({ ctx, onClose }) {
  const { c, setSheet } = ctx;
  const options = [
    { id: "property", label: "فایل ملک جدید", icon: Building2 }, { id: "customer", label: "مشتری جدید", icon: Users },
    { id: "owner", label: "مالک جدید", icon: UserCircle2 }, { id: "builder", label: "سازنده جدید", icon: Hammer },
    { id: "appointment", label: "قرار بازدید جدید", icon: CalendarDays }, { id: "call", label: "پیگیری تماس جدید", icon: PhoneCall },
  ];
  return (
    <SheetShell c={c} title="افزودن سریع" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => setSheet(o.id)} className="press w-full flex items-center gap-3 rounded-xl p-3.5" style={glass(c)}>
            <div className="rounded-2xl flex items-center justify-center" style={{ width: 38, height: 38, background: c.primarySoft }}><o.icon size={17} color={c.primary} /></div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</span>
          </button>
        ))}
      </div>
    </SheetShell>
  );
}
function Select({ c, value, onChange, options, placeholder }) { return <select value={value} onChange={onChange} style={inputStyle(c)}><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; }
function SubmitBtn({ c, label, onClick, disabled }) { return <button onClick={onClick} disabled={disabled} className="press w-full" style={{ borderRadius: RAD.md, paddingBlock: SP.md + 2, marginTop: SP.sm, background: disabled ? c.surface2 : c.gradientPrimary, color: disabled ? c.muted : "#fff", fontWeight: FW.bold, fontSize: FS.subtitle }}>{label}</button>; }



// ---------- Map picker (Sarein) — separate overlay, never unmounts the form beneath it ----------

// Pre-download every map tile covering Sarein across the useful zoom levels, so the
// whole town is visible offline afterwards (the service worker keeps them forever).
// Covers roughly a 6km box around the centre — enough for the whole town + outskirts.
async function precacheSareinTiles(onProgress) {
  const [lat, lng] = SAREIN_CENTER;
  // Esri's Canvas Dark Gray Base (see geo.js — same switch away from CARTO's
  // now-key-gated CDN) only serves up to native zoom 16, so 17 is dropped;
  // it also has no @2x variant, so this is one URL per tile, not two.
  const zooms = [13, 14, 15, 16];
  const kmBox = 6; // half-width in km
  const lat2tile = (lat, z) => Math.floor(((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, z));
  const lng2tile = (lng, z) => Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  const dLat = kmBox / 111;
  const dLng = kmBox / (111 * Math.cos(lat * Math.PI / 180));

  const urls = [];
  for (const z of zooms) {
    const xMin = lng2tile(lng - dLng, z), xMax = lng2tile(lng + dLng, z);
    const yMin = lat2tile(lat + dLat, z), yMax = lat2tile(lat - dLat, z);
    for (let x = xMin; x <= xMax; x++)
      for (let y = yMin; y <= yMax; y++)
        urls.push(`https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`);
  }

  let done = 0;
  const total = urls.length;
  // Fetch in small batches so we don't hammer the tile server or the phone.
  const batch = 6;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.all(urls.slice(i, i + batch).map((u) =>
      fetch(u, { mode: "no-cors" }).then(() => {}).catch(() => {})
    ));
    done = Math.min(total, i + batch);
    onProgress && onProgress(done, total);
  }
  return total;
}

function MapPickerModal({ c, onPick, onClose, initial }) {
  const mapRef = useRef(null); const mapObjRef = useRef(null);
  const [address, setAddress] = useState(""); const [loadingAddr, setLoadingAddr] = useState(false);
  const [coords, setCoords] = useState(initial && initial.lat ? [initial.lat, initial.lng] : SAREIN_CENTER);
  const reverseGeocode = async (lat, lng) => {
    setCoords([lat, lng]);
    setLoadingAddr(true);
    setAddress(await reverseGeocodeAddress(lat, lng));
    setLoadingAddr(false);
  };
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapObjRef.current) return;
      const start = initial && initial.lat ? [initial.lat, initial.lng] : SAREIN_CENTER;
      const map = L.map(mapRef.current, { attributionControl: false }).setView(start, initial && initial.lat ? 16 : 14);
      L.tileLayer(LIGHT_TILE_URL, { attribution: "", maxZoom: 20, maxNativeZoom: 16 }).addTo(map);
      const marker = L.marker(start, { draggable: true }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); reverseGeocode(p.lat, p.lng); });
      map.on("click", (e) => { marker.setLatLng(e.latlng); reverseGeocode(e.latlng.lat, e.latlng.lng); });
      mapObjRef.current = map; reverseGeocode(start[0], start[1]);
      // The sheet this map sits in slides up via a CSS transform
      // (.flora-sheet, 320ms). Leaflet measures its container's real
      // screen position the instant it initializes — if that happens
      // while the parent is still mid-slide, every click coordinate it
      // computes afterward is permanently offset from where the map
      // visually ends up, even though the map LOOKS fine once settled.
      // invalidateSize() forces a fresh measurement after the animation
      // is done, which is the standard fix for this exact Leaflet issue.
      setTimeout(() => { if (!cancelled && mapObjRef.current) mapObjRef.current.invalidateSize(); }, 380);
    });
    return () => { cancelled = true; if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; } };
  }, []);
  return (
    <BodyPortal onClose={onClose}>
      <div className="fixed inset-0 flex items-end justify-center flora-pop" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full flora-sheet" style={{ ...glass(c), borderRadius: `${RAD.lg}px ${RAD.lg}px 0 0`, overflow: "hidden", maxWidth: 390 }}>
          <div className="flex items-center justify-between" style={{ paddingInline: SP.xl, paddingBlock: SP.md, borderBottom: `1px solid ${c.border}` }}>
            <h3 style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>انتخاب آدرس از نقشه سرعین</h3>
            <button onClick={onClose} aria-label="بستن" className="press w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={14} color={c.ink} /></button>
          </div>
          <div ref={mapRef} style={{ width: "100%", height: 300, background: c.surface2 }} />
          <div style={{ padding: SP.lg }} dir="rtl">
            <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.xs }}>روی نقشه لمس کن یا نشانگر را جابه‌جا کن</p>
            <p style={{ fontSize: FS.body, fontWeight: FW.medium, minHeight: 20, color: c.ink }}>{loadingAddr ? "در حال یافتن آدرس..." : address}</p>
            <button onClick={() => onPick({ address, lat: coords[0], lng: coords[1] })} disabled={!address || loadingAddr} className="press w-full" style={{ marginTop: SP.md, borderRadius: RAD.md, paddingBlock: SP.md, background: !address || loadingAddr ? c.surface2 : c.primary, color: !address || loadingAddr ? c.muted : "#fff", fontWeight: FW.bold, fontSize: FS.body + 1 }}>تایید این آدرس</button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

// ---------- Form sheet router ----------
function FormSheet({ sheetVal, ctx, onClose }) {
  const kind = typeof sheetVal === "string" ? sheetVal : sheetVal.kind;
  const editId = typeof sheetVal === "object" ? sheetVal.editId : null;
  const customerId = typeof sheetVal === "object" ? sheetVal.customerId : null;
  const dealId = typeof sheetVal === "object" ? sheetVal.dealId : null;
  const prefillDealId = typeof sheetVal === "object" ? sheetVal.prefillDealId : null;
  const prefillDivarLink = typeof sheetVal === "object" ? sheetVal.prefillDivarLink : null;
  if (kind === "property") return <PropertyForm ctx={ctx} onClose={onClose} editId={editId} prefillDivarLink={prefillDivarLink} />;
  if (kind === "customer") return <CustomerForm ctx={ctx} onClose={onClose} />;
  if (kind === "owner") return <OwnerForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "builder") return <BuilderForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "builder-broadcast") return <BuilderBroadcastSheet ctx={ctx} onClose={onClose} />;
  if (kind === "voice-note") return <VoiceNoteSheet ctx={ctx} onClose={onClose} />;
  if (kind === "appointment") return <AppointmentForm ctx={ctx} onClose={onClose} />;
  if (kind === "call") return <CallForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "ai-settings") return <AiSettingsSheet ctx={ctx} onClose={onClose} />;
  if (kind === "messages") return <MessageTemplatesSheet ctx={ctx} onClose={onClose} customerId={customerId} />;
  if (kind === "deal") return <DealForm ctx={ctx} onClose={onClose} editId={editId} />;
  if (kind === "payment") return <PaymentForm ctx={ctx} onClose={onClose} prefillDealId={prefillDealId} editId={editId} />;
  if (kind === "deal-detail") return <DealDetailSheet ctx={ctx} onClose={onClose} dealId={dealId} />;
  if (kind === "income") return <OfficeEntryForm ctx={ctx} onClose={onClose} editId={editId} mode="income" />;
  if (kind === "expense") return <OfficeEntryForm ctx={ctx} onClose={onClose} editId={editId} mode="expense" />;
  return null;
}

function AiSettingsSheet({ ctx, onClose }) {
  const { c, aiProvider, setAiProvider, geminiKey, setGeminiKey, perplexityKey, setPerplexityKey, avalaiKey, setAvalaiKey, avalaiModel, setAvalaiModel, agentName, setAgentName, notify } = ctx;
  const [provider, setProvider] = useState(aiProvider);
  const [gKey, setGKey] = useState(geminiKey || "");
  const [pKey, setPKey] = useState(perplexityKey || "");
  const [aKey, setAKey] = useState(avalaiKey || "");
  const [aModel, setAModel] = useState(avalaiModel || "gpt-4o-mini");
  const [name, setName] = useState(agentName || "");
  const providers = [
    { id: "avalai", label: "اول‌ای‌آی", hint: "درگاه ایرانی، از داخل ایران بدون فیلترشکن کار می‌کند و به همه‌ی مدل‌ها دسترسی دارد — کلید: avalai.ir" },
    { id: "gemini", label: "Gemini", hint: "کلید رایگان: aistudio.google.com — ممکن است از ایران بدون فیلترشکن کار نکند" },
    { id: "perplexity", label: "Perplexity", hint: "کلید: perplexity.ai/settings/api — جواب‌ها همراه با جستجوی زنده‌ی وب و منبع است، برای سوال‌های نیازمند اطلاعات به‌روز مناسب‌تر است" },
  ];
  const AVALAI_MODELS = [
    { value: "gpt-4o-mini", label: "GPT-4o mini (ارزان و سریع)" },
    { value: "gpt-4o", label: "GPT-4o (قوی‌تر)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "claude-3-5-sonnet-20240620-v1:0", label: "Claude 3.5 Sonnet" },
    { value: "deepseek-chat", label: "DeepSeek" },
  ];
  const keyByProvider = { avalai: aKey, gemini: gKey, perplexity: pKey };
  const setKeyByProvider = { avalai: setAKey, gemini: setGKey, perplexity: setPKey };
  const currentKey = keyByProvider[provider];
  const setCurrentKey = setKeyByProvider[provider];
  return (
    <SheetShell c={c} title="تنظیمات هوش مصنوعی" onClose={onClose}>
      <Field c={c} label="نام تو (برای خطاب دستیار، اختیاری)"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً مجید" /></Field>
      <Field c={c} label="ارائه‌دهنده">
        <div className="grid grid-cols-2" style={{ gap: SP.sm }}>
          {providers.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} className="press rounded-lg" style={{ paddingBlock: 8, background: provider === p.id ? c.primary : c.surface2, color: provider === p.id ? "#fff" : c.muted, fontWeight: FW.bold, fontSize: FS.caption, position: "relative" }}>
              {p.id === "avalai" && provider !== "avalai" && <span style={{ position: "absolute", top: -6, right: 6, fontSize: 10, background: c.success, color: "#fff", padding: "1px 6px", borderRadius: RAD.pill }}>پیشنهادی</span>}
              {p.label}
            </button>
          ))}
        </div>
      </Field>
      {provider === "avalai" && (
        <Field c={c} label="مدل">
          <Select c={c} value={aModel} onChange={(e) => setAModel(e.target.value)} placeholder="انتخاب مدل" options={AVALAI_MODELS} />
        </Field>
      )}
      <Field c={c} label="کلید API"><input style={inputStyle(c)} dir="ltr" value={currentKey} onChange={(e) => setCurrentKey(e.target.value)} placeholder="کلید را اینجا وارد کن" /></Field>
      <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.9, marginBottom: SP.md }}>{providers.find((p) => p.id === provider)?.hint} — کلید فقط روی همین گوشی ذخیره می‌شود.</p>
      {/* Only the API key is truly required (an empty key means "AI off" —
          fine, that's a valid state); the name field must be saveable on its
          own, so it doesn't gate on currentKey. Previously this button was
          disabled whenever the key field was empty, which silently blocked
          saving just the name too — the whole sheet looked broken for that. */}
      <SubmitBtn c={c} label="ذخیره" onClick={() => {
        setAiProvider(provider); setGeminiKey(gKey.trim()); setPerplexityKey(pKey.trim()); setAvalaiKey(aKey.trim()); setAvalaiModel(aModel); setAgentName(name.trim());
        notify("تنظیمات هوش مصنوعی ذخیره شد"); onClose();
      }} />
    </SheetShell>
  );
}

// ---------- Ready-made persuasive message templates ----------
const AGENCY_SIGNATURE = "قبادی – املاک گنجینه";
const AGENCY_ADDRESS = "سرعین، میدان دانش، روبه‌روی هتل قصر، سایت املاک گنجینه، جنب رستوران خاتای";
const MESSAGE_TEMPLATES = [
  {
    id: "appointment_set", label: "تنظیم قرار ملاقات", icon: CalendarDays,
    needsProperty: true, needsTime: false,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nوقت بخیر. برای بازدید از ${v.property || "فایل مورد نظر"} می‌تونیم قرار بذاریم. هر روز و ساعتی که براتون راحت‌تره بگید تا هماهنگ کنم؛ منتظر دیدارتون هستم.\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "appointment_reminder", label: "یادآوری ساعت قرار", icon: Bell,
    needsProperty: false, needsTime: true,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nیادآوری می‌کنم قرار بازدیدمون امروز ساعت ${v.time || "..."} است. منتظرتون هستم، خوشحال می‌شم سر وقت باشید تا با آرامش همه‌چیز رو با هم ببینیم.\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "followup_choice", label: "پیگیری از فایل‌های بازدیدشده", icon: Building2,
    needsProperty: false, needsTime: false,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nامیدوارم فایل‌هایی که با هم دیدیم پسندتون اومده باشه.${v.viewed ? ` (${v.viewed})` : ""} اگه سوالی هست یا خواستید مقایسه‌شون کنیم در خدمتم؛ فقط بگید کدوم بیشتر به دلتون نشسته تا کارهای بعدی رو شروع کنیم.\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "send_address", label: "ارسال آدرس دفتر", icon: MapPin,
    needsProperty: false, needsTime: false,
    build: (v) => `سلام ${v.name || "عزیز"} 🌿\nآدرس دفتر: ${AGENCY_ADDRESS}.\nمنتظر دیدارتون هستم 🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "deal_not_done", label: "وقتی معامله انجام نشد", icon: MessageSquare,
    needsProperty: false, needsTime: false,
    build: (v) => `${v.name ? `${v.name} عزیز 🌿\n` : ""}صادقانه خیلی دوست داشتم باهم همکاری کنیم، ناراحتم که این بار نشد که همکاری لازم رو داشته باشیم. بازم دوست دارم شماره‌تون رو هر لحظه رو گوشیم ببینم 🙏🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "invite_office", label: "دعوت گرم به دفتر", icon: Home,
    needsProperty: false, needsTime: false,
    build: (v) => `این چه حرفیه ${v.name || "دوست"} عزیز، شما تاج سرید و قدمتون روی چشم. بنده همه‌جوره در خدمتتون هستم.\nتشریف بیارید دفتر، دور هم یه چای بخوریم و گپ بزنیم، بعدش بریم چند تا فایل واقعاً تک و شکار رو ببینیم که وقت ارزشمندتون هم گرفته نشه. خیالتون راحت باشه، سیر تا پیاز کار رو راهنماییتون می‌کنم.\nان‌شاءالله شما هم بشید یکی از همشهری‌های خوب و همسایه‌های درجه‌یک خودمون. 🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "exclusive_files", label: "فایل‌های ویژه و محرمانه", icon: BadgeCheck,
    needsProperty: false, needsTime: false,
    build: (v) => `جناب ${v.name || "دوست"} عزیز، این فایل‌هایی که خدمتتون فرستادم، صرفاً برای آشنایی با حدود قیمت و متراژ بود.\nراستش ۲ فایل کاملاً منحصربه‌فرد و شخصی‌سازی‌شده دیگه دارم که به دلیل اصرار مالک، اجازه‌ی ارسال عکس و اطلاعاتشون رو در فضای مجازی ندارم. شرایط این موارد هم به‌شدت جذابه.\nاگه یه سر تشریف بیارید دفتر، از نزدیک کامل خدمتتون توضیح می‌دم. 🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "welcome_sarein", label: "خوش‌آمد به سرعین", icon: MapPin,
    needsProperty: false, needsTime: false,
    build: (v) => `${v.name || "دوست"} عزیز، خوش اومدید به سرعین 🌿\nهر وقت گذرتون به سرعین افتاد، بدون هیچ تعارفی یه زنگ به من بزنید؛ چه برای ملک، چه برای یه راهنمایی ساده یا حتی یه چای گرم در دفتر. من اینجا خدمتگزار شما هستم و دوست دارم اولین کسی باشم که بهش فکر می‌کنید. 🙏🌹\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "thanks_visit", label: "تشکر بعد از بازدید", icon: BadgeCheck,
    needsProperty: false, needsTime: false,
    build: (v) => `${v.name || "دوست"} عزیز، از اینکه وقت ارزشمندتون رو گذاشتید و تشریف آوردید، واقعاً ممنونم 🌹\nهر سوال یا تردیدی درباره‌ی فایل‌هایی که دیدیم داشتید، بی‌رودربایستی بگید. من اینجام که خیالتون از هر جهت راحت بشه، نه فقط تا یه معامله جوش بخوره.${v.viewed ? `\n(فایل‌های بازدیدشده: ${v.viewed})` : ""}\n${AGENCY_SIGNATURE}`,
  },
  {
    id: "special_opportunity", label: "فرصت ویژه و فوری", icon: TrendingUp,
    needsProperty: true, needsTime: false,
    build: (v) => `${v.name || "دوست"} عزیز، سلام 🌿\nیه مورد پیدا شد که اول از همه یاد شما افتادم: ${v.property || "یک فایل ویژه"}.\nشرایطش واقعاً استثناییه و صادقانه بگم، این‌جور موارد معمولاً خیلی زود جمع می‌شن. اگه دوست داشتید، هماهنگ کنم یه بازدید بذاریم؟ 🙏\n${AGENCY_SIGNATURE}`,
  },
];

function MessageTemplatesSheet({ ctx, onClose, customerId }) {
  const { c, customers, appointments, properties, notify } = ctx;
  const presetCu = customerId ? customers.find((cu) => cu.id === customerId) : null;
  const [name, setName] = useState(presetCu?.name || "");
  const [phone, setPhone] = useState(presetCu?.phone || "");
  const [activeId, setActiveId] = useState(MESSAGE_TEMPLATES[0].id);
  const [propertyId, setPropertyId] = useState("");
  const [time, setTime] = useState("");
  const [text, setText] = useState("");

  const viewedTitles = useMemo(() => {
    if (!presetCu) return "";
    const ids = appointments.filter((a) => a.customerId === presetCu.id || a.customerName === presetCu.name).map((a) => a.propertyId);
    const titles = properties.filter((p) => ids.includes(p.id)).map((p) => p.title);
    return titles.join(" و ");
  }, [presetCu, appointments, properties]);

  const active = MESSAGE_TEMPLATES.find((t) => t.id === activeId);
  useEffect(() => {
    const propTitle = properties.find((p) => p.id === propertyId)?.title || "";
    setText(active.build({ name, property: propTitle, time, viewed: viewedTitles }));
  }, [activeId, name, propertyId, time]);

  return (
    <SheetShell c={c} title="پیام‌های آماده" onClose={onClose}>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3.5">
        {MESSAGE_TEMPLATES.map((t) => {
          const isActive = activeId === t.id;
          return (
            <button key={t.id} onClick={() => setActiveId(t.id)} className="press shrink-0 flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5" style={isActive ? { background: c.primary } : glass(c)}>
              <t.icon size={16} color={isActive ? "#fff" : c.muted} />
              <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? "#fff" : c.muted, whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={name} onChange={(e) => setName(e.target.value)} placeholder="اختیاری" /></Field>
        <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="اختیاری" /></Field>
      </div>
      {active.needsProperty && <Field c={c} label="فایل ملک"><Select c={c} value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="انتخاب فایل" options={properties.map((p) => ({ value: p.id, label: p.title }))} /></Field>}
      {active.needsTime && <Field c={c} label="ساعت قرار"><input type="time" style={inputStyle(c)} value={time} onChange={(e) => setTime(e.target.value)} /></Field>}

      <Field c={c} label="متن پیام (قابل ویرایش)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} style={{ ...inputStyle(c), resize: "vertical", lineHeight: 1.9 }} />
      </Field>

      <div className="flex gap-2">
        <button onClick={() => { navigator.clipboard?.writeText(text); notify("متن کپی شد"); }} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.surface2, color: c.ink, fontWeight: 700, fontSize: 13 }}>کپی متن</button>
        <a href={smsLink(phone, text) || "#"} className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 13, opacity: phone ? 1 : 0.5, pointerEvents: phone ? "auto" : "none" }}><MessageSquare size={13} /> پیامک</a>
        <a href={waLink(phone, text) || "#"} target="_blank" rel="noreferrer" className="press flex-1 rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background: c.successSoft, color: c.success, fontWeight: 700, fontSize: 13, opacity: phone ? 1 : 0.5, pointerEvents: phone ? "auto" : "none" }}><Send size={13} /> واتساپ</a>
      </div>
    </SheetShell>
  );
}


// Pre-sale terms. Percentages are computed from the total price rather than typed, so the
// three instalments can't silently stop adding up to the deal.
function PreSaleFields({ c, f, setF, total }) {
  const down = toNum(f.preDown), delivery = toNum(f.preDelivery), deed = toNum(f.preDeed);
  const pct = (v) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  const sum = down + delivery + deed;
  const diff = total - sum;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="rounded-2xl p-3.5 mb-4" style={{ ...glass(c), background: `linear-gradient(160deg, ${c.purpleSoft}, ${c.surface} 60%)` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.purpleSoft }}><Hammer size={13} color={c.purple} /></div>
        <p style={{ fontSize: 13, fontWeight: 700 }}>شرایط پیش‌فروش</p>
      </div>

      <Field c={c} label="مبلغ پرداخت اولیه (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preDown} onChange={set("preDown")} placeholder="مثلاً 3000000000" />
        <p style={{ fontSize: 11, color: c.purple, fontWeight: 700, marginTop: 5 }}>{fmtToman(down)} {total ? `— ${faDigits(pct(down))}% کل` : ""}</p>
      </Field>

      <Field c={c} label="مبلغ موقع تحویل (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preDelivery} onChange={set("preDelivery")} placeholder="مبلغ پرداخت هنگام تحویل" />
        <p style={{ fontSize: 11, color: c.purple, fontWeight: 700, marginTop: 5 }}>{fmtToman(delivery)} {total ? `— ${faDigits(pct(delivery))}% کل` : ""}</p>
      </Field>

      <Field c={c} label="مبلغ موقع سند (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preDeed} onChange={set("preDeed")} placeholder="مبلغ پرداخت هنگام سند" />
        <p style={{ fontSize: 11, color: c.purple, fontWeight: 700, marginTop: 5 }}>{fmtToman(deed)} {total ? `— ${faDigits(pct(deed))}% کل` : ""}</p>
      </Field>

      <Field c={c} label="زمان تحویل پروژه (ماه)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.preMonths} onChange={set("preMonths")} placeholder="مثلاً 18" />
        {toNum(f.preMonths) > 0 && <p style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>تحویل حدود {faDigits(toNum(f.preMonths))} ماه دیگر</p>}
      </Field>

      <Field c={c} label="مرحله ساخت">
        <div className="flex flex-wrap gap-1.5">
          {BUILD_STAGES.map((st) => {
            const active = f.buildStage === st;
            return <button key={st} type="button" onClick={() => setF((p) => ({ ...p, buildStage: st }))} className="press rounded-lg px-2.5 py-1.5"
              style={{ background: active ? c.purple : c.surface2, color: active ? "#fff" : c.muted, fontWeight: 700, fontSize: 10 }}>{st}</button>;
          })}
        </div>
      </Field>

      {/* Reconciliation: the three instalments must equal the total price */}
      {total > 0 && (
        <div className="rounded-xl p-3" style={{ background: c.surface2 }}>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 11, color: c.muted }}>جمع سه پرداخت</span>
            <span style={{ fontSize: 11, fontWeight: 800, direction: "ltr" }}>{fmtToman(sum)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: 11, color: c.muted }}>قیمت کل فایل</span>
            <span style={{ fontSize: 11, fontWeight: 800, direction: "ltr" }}>{fmtToman(total)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 8, background: c.border, marginTop: 8, overflow: "hidden", display: "flex" }}>
            {[down, delivery, deed].map((v, i) => (
              <div key={i} style={{ width: `${total ? Math.min(100, (v / total) * 100) : 0}%`, background: [c.success, c.primary, c.purple][i], transition: "width .5s ease" }} />
            ))}
          </div>
          <p className="flex items-center gap-1.5" style={{ fontSize: 10, marginTop: 7, color: Math.abs(diff) < 1 ? c.success : c.attn, fontWeight: 700 }}>
            {Math.abs(diff) < 1 ? <><BadgeCheck size={11} /> جمع پرداخت‌ها با قیمت کل برابر است</> : <><AlertTriangle size={11} /> {diff > 0 ? `${fmtToman(diff)} کمتر از قیمت کل` : `${fmtToman(-diff)} بیشتر از قیمت کل`}</>}
          </p>
        </div>
      )}
    </div>
  );
}

function PropertyForm({ ctx, onClose, editId, prefillDivarLink }) {
  const { c, owners, setOwners, builders, properties, setProperties, notify, setMapPicker, celebrate, setDetail, prefillNew, setPrefillNew, session } = ctx;
  const editing = editId ? properties.find((x) => x.id === editId) : null;
  // A new property has no id yet, but photo uploads need one to build their
  // storage path — generated once up front and reused as the property's
  // real id at submit time, so uploaded-during-the-form photos already sit
  // under the same propertyId folder the saved property ends up with.
  const [formPropertyId] = useState(() => editing?.id || uid());
  const editOwner = editing ? owners.find((o) => o.id === editing.ownerId) : null;
  const [f, setF] = useState(editing ? {
    title: editing.title, type: editing.type, deal: editing.deal, pricePerMeter: String(editing.pricePerMeter), area: String(editing.area),
    rooms: String(editing.rooms), floor: String(editing.floor || 1), furnished: editing.furnished || "بدون لوازم", address: editing.address, street: editing.street || "",
    locationQuality: editing.locationQuality || "", viewCategory: editing.viewCategory || editing.view || "", floorCategory: editing.floorCategory || "", buildingQuality: editing.buildingQuality || "", furnishLevel: editing.furnishLevel || "",
    ownerName: editOwner?.name || "", ownerPhone: editOwner?.phone || "", builderId: editing.builderId || "", lat: editing.lat, lng: editing.lng,
    preDown: String(editing.preDown || ""), preMonths: String(editing.preMonths || ""), preDelivery: String(editing.preDelivery || ""), preDeed: String(editing.preDeed || ""), buildStage: editing.buildStage || BUILD_STAGES[0], desc: editing.desc || "",
  } : { title: "", type: prefillNew?.type || "آپارتمان", deal: "فروش", pricePerMeter: prefillNew?.pricePerMeter ? String(prefillNew.pricePerMeter) : "", area: prefillNew?.area ? String(prefillNew.area) : "", rooms: "", floor: prefillNew?.floor ? String(prefillNew.floor) : "1", furnished: "بدون لوازم", address: prefillNew?.address || "", street: "",
    locationQuality: "", viewCategory: prefillNew?.viewCategory || "", floorCategory: prefillNew?.floorCategory || "", buildingQuality: "", furnishLevel: "",
    ownerName: "", ownerPhone: "", builderId: "", lat: prefillNew?.lat ?? null, lng: prefillNew?.lng ?? null, preDown: "", preMonths: "", preDelivery: "", preDeed: "", buildStage: BUILD_STAGES[0], desc: "" });
  // One-shot: once its values have seeded the form above, the hand-off data
  // is cleared so it can't leak into some unrelated later "new property".
  useEffect(() => { if (prefillNew) setPrefillNew(null); }, []); // eslint-disable-line
  const [media, setMedia] = useState(editing?.media || []);
  const [uploading, setUploading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showDivar, setShowDivar] = useState(false);
  const [divarLink, setDivarLink] = useState("");
  const [divarText, setDivarText] = useState("");
  const [divarImg1, setDivarImg1] = useState("");
  const [divarImg2, setDivarImg2] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = toNum(f.pricePerMeter) * toNum(f.area);
  const valid = f.title && f.pricePerMeter && f.area;
  const isPreSale = f.deal === "پیش‌فروش";

  const addMedia = async (fileList) => {
    setUploading(true);
    const files = Array.from(fileList);
    const videosAndDocs = files.filter((f) => !f.type.startsWith("image"));
    const images = files.filter((f) => f.type.startsWith("image"));
    const startSortOrder = media.length;
    const [legacyItems, { items: cloudItems, failed }] = await Promise.all([
      videosAndDocs.length ? filesToMedia(videosAndDocs) : Promise.resolve([]),
      images.length && session?.user
        ? uploadPropertyImageBatch({ userId: session.user.id, propertyId: formPropertyId, files: images, startSortOrder })
        : (images.length ? filesToMedia(images).then((items) => ({ items, failed: [] })) : Promise.resolve({ items: [], failed: [] })),
    ]);
    if (cloudItems.length || legacyItems.length) setMedia((prev) => [...prev, ...cloudItems, ...legacyItems]);
    if (failed.length) notify(`${faDigits(failed.length)} عکس آپلود نشد — بقیه ذخیره شد`);
    setUploading(false);
  };
  const openMapPicker = () => setMapPicker({
    initial: { lat: f.lat, lng: f.lng },
    onPick: ({ address, lat, lng }) => { setF((prev) => ({ ...prev, address, lat, lng })); setMapPicker(null); },
  });

  const [importState, setImportState] = useState("idle"); // idle | extracting | parsing | normalizing | checking_duplicate | preview | error
  const [importData, setImportData] = useState(null); // normalized fields, shown in the preview
  const [importError, setImportError] = useState(null); // { message }
  const [dupMatch, setDupMatch] = useState(null); // existing property, if this link was already imported
  useEffect(() => {
    if (prefillDivarLink && !editing) {
      setDivarLink(prefillDivarLink);
      setShowDivar(true);
      extractFromDivarAI(prefillDivarLink);
    }
  }, []); // eslint-disable-line

  // Error codes the import-divar function can return, mapped to messages a
  // user can actually act on. The raw server/network error never reaches
  // the screen — per spec, only these five codes are user-facing.
  const IMPORT_ERROR_MESSAGES = {
    LINK_INVALID: "این لینک، لینک معتبر یک آگهی دیوار نیست.",
    PAGE_NOT_ACCESSIBLE: "این آگهی الان در دسترس نیست — ممکن است حذف شده باشد یا دیوار به این درخواست اجازه‌ی دسترسی نداده باشد.",
    EXTRACTION_FAILED: "از این صفحه هیچ اطلاعات قابل‌استفاده‌ای پیدا نشد.",
    RATE_LIMITED: "درخواست‌ها زیاد شده — چند لحظه صبر کن و دوباره امتحان کن.",
    PARSER_FAILED: "در پردازش اطلاعات این آگهی مشکلی پیش آمد.",
  };

  // Paste Link → (server) Fetch → Parse → Normalize → duplicate check
  // (client, against this device's own property list) → Preview → Save.
  // The frontend never fetches divar.ir itself — this only ever calls our
  // own Edge Function, which owns the real request and every safety rule
  // around it (SSRF guard, timeout, size cap, redirect control).
  const extractFromDivarAI = async (linkOverride) => {
    const link = (linkOverride || divarLink).trim();
    if (!link) { notify("اول لینک آگهی دیوار را وارد کن"); return; }
    if (!/^https?:\/\/(www\.)?divar\.ir\/v\//i.test(link)) { setImportState("error"); setImportError({ message: IMPORT_ERROR_MESSAGES.LINK_INVALID }); return; }
    setImportError(null); setDupMatch(null); setImportData(null);
    setImportState("extracting");
    try {
      const { data, error } = await supabase.functions.invoke("import-divar", { body: { url: link } });
      if (error || !data?.ok) {
        const code = data?.code || "PAGE_NOT_ACCESSIBLE";
        throw Object.assign(new Error(IMPORT_ERROR_MESSAGES[code] || IMPORT_ERROR_MESSAGES.EXTRACTION_FAILED), { code });
      }
      const raw = data.data;

      setImportState("normalizing");
      // Images arrive as base64 — the server downloaded them (no CORS issue
      // there), so this is just decoding bytes we already have, not a
      // second network hop to divar's CDN. A slot with base64:null (a
      // single image that failed server-side) is skipped, not fatal.
      //
      // One more gate here, deliberately redundant with the server's magic-
      // byte check: compressImage() is shared with the regular manual-photo-
      // upload flow, and by design it never rejects — if an image fails to
      // decode it falls back to resolving with the raw (uncompressed) data
      // anyway, since for a person's own uploaded photo that's the safer
      // default. That fallback is exactly wrong here: an imported photo that
      // doesn't actually decode should never end up in the property at all.
      // So each result gets a real Image() load test before being trusted —
      // if it doesn't load, it's dropped silently, not shown broken.
      const verifyImageLoads = (dataUrl) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
        img.onerror = () => resolve(false);
        img.src = dataUrl;
      });
      let extractedMedia = [];
      if (Array.isArray(raw.images) && raw.images.length) {
        const results = await Promise.allSettled(
          raw.images.filter((img) => img.base64).sort((a, b) => a.position - b.position).map(async (img) => {
            const byteChars = atob(img.base64);
            const bytes = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
            const file = new File([bytes], "divar.jpg", { type: img.contentType || "image/jpeg" });
            const url = await compressImage(file);
            const ok = await verifyImageLoads(url);
            if (!ok) throw new Error("image failed to decode");
            return { id: uid(), type: "image", url };
          })
        );
        extractedMedia = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      }
      const normalized = {
        ...raw, source: "divar", media: extractedMedia,
        skippedImageCount: (Array.isArray(raw.images) ? raw.images.length : 0) - extractedMedia.length,
        // The three fields with a confidence score double as the editable
        // "correction" values shown in preview — pre-filled when the parser
        // is reasonably sure, left blank ("نیاز به بررسی") when confidence
        // is low, per spec: never show a shaky guess as if it were certain.
        areaInput: raw.areaConfidence === "low" ? "" : String(raw.area ?? ""),
        roomsInput: raw.roomsConfidence === "low" ? "" : String(raw.rooms ?? ""),
        yearBuiltInput: raw.yearBuiltConfidence === "low" ? "" : String(raw.yearBuilt ?? ""),
      };

      setImportState("checking_duplicate");
      // Priority per spec: sourceId first, then sourceUrl, then a loose
      // title+area match as a last resort for links that carry no clean id.
      const dup = properties.find((p) =>
        (normalized.sourceId && p.sourceId === normalized.sourceId) ||
        (p.sourceUrl && p.sourceUrl === normalized.sourceUrl) ||
        (normalized.title && p.title === normalized.title && normalized.area && p.area === normalized.area)
      );
      if (dup) setDupMatch(dup);

      setImportData(normalized);
      setImportState("preview");
    } catch (e) {
      setImportError({ message: e.message || IMPORT_ERROR_MESSAGES.EXTRACTION_FAILED });
      setImportState("error");
    }
  };

  const setImportField = (key) => (e) => setImportData((prev) => ({ ...prev, [key]: e.target.value }));

  const saveImportedProperty = async () => {
    const d = importData;
    const area = toNum(d.areaInput) || null;
    const rooms = d.roomsInput !== "" ? toNum(d.roomsInput) : null;
    const yearBuilt = toNum(d.yearBuiltInput) || null;
    // Divar-imported photos arrive as base64 (downloaded + compressed
    // server-side) — moved to cloud storage right here, same as any other
    // upload, so an imported property never leaves the old inline-base64
    // shape behind in the database.
    let media = d.media || [];
    if (media.length && session?.user) {
      media = await Promise.all(media.map((m, i) => migrateLegacyMediaItem({ userId: session.user.id, propertyId: formPropertyId, item: m, sortOrder: i })));
    }
    const payload = {
      title: d.title || "بدون عنوان", type: d.propertyType || "آپارتمان", deal: d.dealType === "رهن_و_اجاره" ? "فروش" : (d.dealType || "فروش"),
      pricePerMeter: area ? Math.round((d.price || 0) / area) : 0, area: area || 0, rooms: rooms || 0, floor: d.floor || 1,
      furnished: "بدون لوازم", address: d.address || "", builderId: "", ownerId: "", media, lat: null, lng: null,
      preDown: 0, preMonths: 0, preDelivery: 0, preDeed: 0, buildStage: BUILD_STAGES[0],
      desc: [d.description, d.totalFloors ? `تعداد طبقات: ${faDigits(d.totalFloors)}` : "", yearBuilt ? `سال ساخت: ${faDigits(yearBuilt)}` : (d.yearBuiltLabel ? d.yearBuiltLabel : ""),
        d.parking != null ? `پارکینگ: ${d.parking ? "دارد" : "ندارد"}` : "", d.elevator != null ? `آسانسور: ${d.elevator ? "دارد" : "ندارد"}` : "",
        d.storage != null ? `انباری: ${d.storage ? "دارد" : "ندارد"}` : "", d.deposit ? `رهن: ${fmtToman(d.deposit)}` : "", d.rent ? `اجاره ماهانه: ${fmtToman(d.rent)}` : ""]
        .filter(Boolean).join("\n"),
      source: d.source, sourceUrl: d.sourceUrl, sourceId: d.sourceId, importedAt: d.importedAt,
      yearBuilt, yearBuiltLabel: d.yearBuiltLabel || null,
      // Kept for debugging a mis-read listing later — "Flora خواند متراژ اشتباه
      // بود" is answerable by looking at exactly what the parser saw, not
      // guessing after the fact.
      rawImportData: d.rawImportData || null,
    };
    setProperties((prev) => [{ id: formPropertyId, stage: "فعال", createdAt: new Date().toISOString(), ...payload }, ...prev]);
    celebrate({ kind: "file", label: "فایل از دیوار اضافه شد" });
    onClose();
  };

  const editImportedProperty = () => {
    const d = importData;
    setF((prev) => ({
      ...prev, title: d.title || prev.title, type: d.propertyType || prev.type, deal: d.dealType === "رهن_و_اجاره" ? "فروش" : (d.dealType || prev.deal),
      area: d.areaInput || prev.area, pricePerMeter: d.areaInput && d.price ? String(Math.round(d.price / toNum(d.areaInput))) : prev.pricePerMeter,
      rooms: d.roomsInput || prev.rooms, floor: d.floor != null ? String(d.floor) : prev.floor, address: d.address || prev.address,
      desc: d.description || prev.desc,
    }));
    if (d.media?.length) setMedia((prev) => [...prev, ...d.media]);
    setImportState("idle"); setShowDivar(false);
    notify("اطلاعات تو فرم پر شد — قبل از ثبت بررسی کن");
  };

  const extractFromDivar = () => {
    if (!divarText.trim()) { notify("متن آگهی را پیست کن"); return; }
    const parsed = parseDivarText(divarText);
    setF((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])), address: prev.address }));
    const imgs = [divarImg1, divarImg2].filter(Boolean).slice(0, 2).map((url) => ({ id: uid(), type: "image", url, external: true }));
    if (imgs.length) setMedia((prev) => [...prev, ...imgs]);
    setShowDivar(false);
    notify("اطلاعات استخراج شد — پایین فرم را برای تایید بررسی کن");
  };

  const submit = () => {
    let ownerId = editing?.ownerId || "";
    const nm = f.ownerName.trim(), ph = f.ownerPhone.trim();
    if (nm) {
      const existing = owners.find((o) => o.name.trim() === nm && (o.phone || "").trim() === ph);
      if (existing) ownerId = existing.id;
      else { const newOwner = { id: uid(), name: nm, phone: ph }; setOwners((prev) => [newOwner, ...prev]); ownerId = newOwner.id; }
    } else ownerId = "";
    const payload = {
      title: f.title, type: f.type, deal: f.deal, address: f.address, street: f.street.trim() || null, builderId: f.builderId, furnished: f.furnished, desc: f.desc.trim(),
      locationQuality: f.locationQuality || null, viewCategory: f.viewCategory || null, floorCategory: f.floorCategory || null, buildingQuality: f.buildingQuality || null, furnishLevel: f.furnishLevel || null,
      pricePerMeter: toNum(f.pricePerMeter), area: toNum(f.area), rooms: toNum(f.rooms), floor: toNum(f.floor), price: total, ownerId, media, lat: f.lat ?? null, lng: f.lng ?? null,
      preDown: toNum(f.preDown), preMonths: toNum(f.preMonths), preDelivery: toNum(f.preDelivery), preDeed: toNum(f.preDeed), buildStage: f.buildStage,
    };
    if (editing) {
      setProperties((prev) => prev.map((x) => x.id === editId ? { ...x, ...payload } : x));
      notify("تغییرات فایل ذخیره شد");
    } else {
      setProperties((prev) => [{ id: formPropertyId, stage: "فعال", createdAt: new Date().toISOString(), ...payload }, ...prev]);
      notify("فایل با موفقیت ثبت شد");
      celebrate({ kind: "file", label: "فایل جدید ثبت شد" });
    }
    onClose();
  };

  return (
    <SheetShell c={c} title={editing ? "ویرایش فایل ملک" : "ثبت فایل ملک"} onClose={onClose}>
      {!editing && (
        <button type="button" onClick={() => setShowDivar((s) => !s)} className="press w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-3.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 13 }}>
          <Link2 size={15} /> ورود از لینک دیوار
        </button>
      )}
      {showDivar && (
        <div className="rounded-xl p-3.5 mb-4" style={glass(c)}>
          {importState === "idle" && (
            <>
              <Field c={c} label="لینک آگهی دیوار"><input style={inputStyle(c)} dir="ltr" value={divarLink} onChange={(e) => setDivarLink(e.target.value)} placeholder="https://divar.ir/v/..." /></Field>
              <button type="button" onClick={() => extractFromDivarAI()} className="press w-full rounded-xl py-3 flex items-center justify-center gap-2 mb-3.5" style={{ background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                <Link2 size={15} /> دریافت اطلاعات آگهی
              </button>
              <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.9, marginBottom: 10 }}>
                اگر آگهی در دسترس نبود یا اطلاعاتی برنگشت، همین‌جا دستی هم می‌تونی پیستش کنی:
              </p>
              <Field c={c} label="متن کامل آگهی (اختیاری)">
                <textarea value={divarText} onChange={(e) => setDivarText(e.target.value)} rows={5} placeholder="متن آگهی را از صفحه‌ی دیوار کپی و اینجا پیست کن..." style={{ ...inputStyle(c), resize: "vertical" }} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field c={c} label="لینک تصویر ۱ (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={divarImg1} onChange={(e) => setDivarImg1(e.target.value)} placeholder="روی عکس نگه‌دار → کپی لینک تصویر" /></Field>
                <Field c={c} label="لینک تصویر ۲ (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={divarImg2} onChange={(e) => setDivarImg2(e.target.value)} placeholder="..." /></Field>
              </div>
              <button type="button" onClick={extractFromDivar} className="press w-full rounded-xl py-3 flex items-center justify-center gap-2" style={{ background: c.surface2, color: c.ink, fontWeight: 700, fontSize: 13 }}>
                <Wand2 size={15} /> استخراج دستی از متن پیست‌شده
              </button>
            </>
          )}

          {["extracting", "parsing", "normalizing", "checking_duplicate"].includes(importState) && (
            <div className="flora-rise" style={{ paddingBlock: SP.sm }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: SP.md }}>در حال دریافت آگهی...</p>
              {[
                { key: "extracting", label: "دریافت صفحه" },
                { key: "parsing", label: "استخراج اطلاعات" },
                { key: "normalizing", label: "آماده‌سازی مشخصات ملک" },
                { key: "checking_duplicate", label: "بررسی تکراری‌بودن فایل" },
              ].map((step) => {
                const order = ["extracting", "parsing", "normalizing", "checking_duplicate"];
                const cur = order.indexOf(importState), idx = order.indexOf(step.key);
                const st = idx < cur ? "done" : idx === cur ? "active" : "pending";
                return (
                  <div key={step.key} className="flex items-center" style={{ gap: SP.sm, marginBottom: SP.sm, opacity: st === "pending" ? 0.5 : 1 }}>
                    <div className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: "50%", background: st === "done" ? c.successSoft : st === "active" ? c.primarySoft : c.surface2 }}>
                      {st === "done" ? <CheckCircle2 size={12} color={c.success} /> : st === "active" ? <Loader2 size={11} className="animate-spin" color={c.primary} /> : <span style={{ width: 5, height: 5, borderRadius: 99, background: c.muted }} />}
                    </div>
                    <span style={{ fontSize: 12, color: st === "pending" ? c.muted : c.ink, fontWeight: st === "active" ? 700 : 500 }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {importState === "error" && (
            <div className="flora-rise">
              <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.dangerSoft, marginBottom: SP.md }}>
                <AlertTriangle size={16} color={c.danger} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: c.danger, lineHeight: 1.8 }}>{importError?.message}</p>
              </div>
              <button type="button" onClick={() => setImportState("idle")} className="press w-full rounded-xl py-3" style={{ background: c.surface2, color: c.ink, fontWeight: 700, fontSize: 13 }}>بازگشت</button>
            </div>
          )}

          {importState === "preview" && importData && (
            <div className="flora-rise">
              {dupMatch && (
                <div className="flex items-start" style={{ gap: SP.sm, padding: SP.md, borderRadius: RAD.md, background: c.attnSoft, marginBottom: SP.md }}>
                  <AlertTriangle size={16} color={c.attn} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-1">
                    <p style={{ fontSize: 13, color: c.attn, fontWeight: 700, lineHeight: 1.8 }}>این فایل احتمالاً قبلاً ثبت شده است.</p>
                    <button type="button" onClick={() => { setDetail({ type: "property", id: dupMatch.id }); onClose(); }} style={{ fontSize: 12, color: c.primary, fontWeight: 700, marginTop: 4 }}>مشاهده فایل قبلی ›</button>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: ".02em", marginBottom: SP.sm }}>پیش‌نمایش — قبل از ثبت بررسی کن</p>

              {importData.media?.[0] && <img src={importData.media[0].url} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: RAD.md, marginBottom: SP.sm }} />}
              {importData.media?.length > 1 && (
                <div className="flex" style={{ gap: 6, overflowX: "auto", marginBottom: SP.md, paddingBottom: 2 }}>
                  {importData.media.slice(1).map((m) => (
                    <img key={m.id} src={m.url} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: RAD.sm, flexShrink: 0 }} />
                  ))}
                </div>
              )}
              {importData.skippedImageCount > 0 && (
                <p style={{ fontSize: 11, color: c.muted, marginBottom: SP.md }}>
                  {faDigits(importData.skippedImageCount)} تصویر از این آگهی قابل دریافت نبود
                </p>
              )}

              <div className="flex flex-col" style={{ gap: 6, marginBottom: SP.md }}>
                {[["عنوان", importData.title], ["قیمت", importData.price ? fmtToman(importData.price) : null], ["آدرس", importData.address]].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between" style={{ paddingBlock: 4, borderBottom: `1px solid ${c.border}` }}>
                    <span style={{ fontSize: 12, color: c.muted }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: val ? c.ink : c.muted }}>{val || "نامشخص"}</span>
                  </div>
                ))}
              </div>

              {/* Area / rooms / year built are always editable, never just
                  displayed — a "medium"/"low" confidence field shows a
                  warning instead of quietly presenting a guess as fact. */}
              <div className="grid grid-cols-3" style={{ gap: SP.sm, marginBottom: SP.md }}>
                {[
                  { key: "areaInput", label: "متراژ", conf: importData.areaConfidence, suffix: "متر" },
                  { key: "roomsInput", label: "خواب", conf: importData.roomsConfidence, suffix: "" },
                  { key: "yearBuiltInput", label: "سال ساخت", conf: importData.yearBuiltConfidence, suffix: "" },
                ].map((f) => (
                  <div key={f.key}>
                    <div className="flex items-center" style={{ gap: 3, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: c.muted }}>{f.label}</span>
                      {f.conf === "low" && <AlertTriangle size={10} color={c.attn} />}
                    </div>
                    <input
                      value={importData[f.key]} onChange={setImportField(f.key)} inputMode="numeric"
                      placeholder={f.conf === "low" ? "نیاز به بررسی" : "—"}
                      style={{ ...inputStyle(c), padding: "8px 10px", fontSize: 13, textAlign: "center", border: f.conf === "low" ? `1.5px solid ${c.attn}` : "1.5px solid transparent" }}
                    />
                    {f.key === "yearBuiltInput" && importData.yearBuiltLabel && !importData.yearBuiltInput && (
                      <p style={{ fontSize: 10, color: c.attn, marginTop: 2, textAlign: "center" }}>{importData.yearBuiltLabel}</p>
                    )}
                  </div>
                ))}
              </div>
              {["areaConfidence", "roomsConfidence", "yearBuiltConfidence"].some((k) => importData[k] === "low") && (
                <div className="flex items-start" style={{ gap: SP.sm, padding: SP.sm, borderRadius: RAD.sm, background: c.attnSoft, marginBottom: SP.md }}>
                  <AlertTriangle size={12} color={c.attn} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11, color: c.attn, lineHeight: 1.7 }}>یکی یا چند مورد از متراژ/خواب/سال ساخت به‌طور مطمئن تشخیص داده نشد — قبل از ذخیره خودت وارد کن یا تأیید کن.</p>
                </div>
              )}

              <div className="flex flex-wrap" style={{ gap: 6, marginBottom: SP.md }}>
                {[["پارکینگ", importData.parking], ["آسانسور", importData.elevator], ["انباری", importData.storage]].filter(([, v]) => v === true).map(([label]) => (
                  <span key={label} className="flex items-center" style={{ gap: 4, fontSize: 11, fontWeight: 700, color: c.success, background: c.successSoft, padding: "4px 9px", borderRadius: 999 }}><CheckCircle2 size={11} color={c.success} />{label}</span>
                ))}
              </div>
              {importData.description && <p style={{ fontSize: 12, color: c.muted, lineHeight: 1.8, marginBottom: SP.lg }}>{importData.description}</p>}
              <div className="grid grid-cols-2" style={{ gap: SP.sm }}>
                <button type="button" onClick={editImportedProperty} className="press rounded-xl py-3" style={{ background: c.surface2, color: c.ink, fontWeight: 700, fontSize: 13 }}>ویرایش اطلاعات</button>
                <button type="button" onClick={saveImportedProperty} className="press rounded-xl py-3" style={{ background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>ذخیره در CRM</button>
              </div>
            </div>
          )}
        </div>
      )}
      <Field c={c} label="عکس و فیلم فایل"><MediaGallery c={c} media={media} uploading={uploading} onAdd={addMedia} onRemove={(mid) => { const t = media.find((m) => m.id === mid); setMedia((p) => p.filter((m) => m.id !== mid)); if (t?.storagePath) deletePropertyPhotoPaths([t.storagePath, t.thumbnailPath]).catch(() => {}); }} onView={() => {}} /></Field>
      <Field c={c} label="عنوان فایل"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder="مثلاً آپارتمان ۹۰ متری تهرانپارس" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="نوع ملک"><Select c={c} value={f.type} onChange={set("type")} placeholder="انتخاب کنید" options={["آپارتمان","ویلا","زمین","مغازه","اداری"].map(v=>({value:v,label:v}))} /></Field>
        <Field c={c} label="نوع معامله"><Select c={c} value={f.deal} onChange={set("deal")} placeholder="انتخاب کنید" options={["فروش","پیش‌فروش"].map(v=>({value:v,label:v}))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="متراژ (متر)"><input style={inputStyle(c)} inputMode="numeric" value={f.area} onChange={set("area")} placeholder="فارسی یا انگلیسی" /></Field>
        <Field c={c} label="قیمت هر متر (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.pricePerMeter} onChange={set("pricePerMeter")} placeholder="فارسی یا انگلیسی" /></Field>
      </div>
      <div className="rounded-2xl px-4 py-3 mb-3 flex items-center justify-between" style={{ background: c.primarySoft }}>
        <span style={{ fontSize: 13, color: c.primary, fontWeight: 700 }}>مبلغ کل (متراژ × قیمت هر متر)</span><span style={{ fontSize: 15, color: c.primary, fontWeight: 800 }}>{fmtToman(total)}</span>
      </div>
      <Field c={c} label="آدرس">
        <div className="flex gap-2">
          <input style={{ ...inputStyle(c), flex: 1 }} value={f.address} onChange={set("address")} placeholder="آدرس را بنویس یا از نقشه انتخاب کن" />
          <button type="button" onClick={openMapPicker} className="press shrink-0 rounded-2xl flex items-center justify-center gap-1.5 px-3" style={{ background: f.lat ? c.successSoft : c.primarySoft }}><MapPin size={16} color={f.lat ? c.success : c.primary} /></button>
        </div>
        {f.lat ? (
          <p className="flex items-center gap-1.5" style={{ fontSize: 11, color: c.success, fontWeight: 700, marginTop: 6 }}>
            <BadgeCheck size={12} /> موقعیت روی نقشه ثبت شد
          </p>
        ) : (
          <p style={{ fontSize: 11, color: c.muted, marginTop: 6 }}>برای ثبت موقعیت دقیق روی نقشه، دکمه‌ی کنار را بزن</p>
        )}
      </Field>
      {/* Street isn't collected here anymore — one field shorter on an
          already-long form. Flora Valuation (Valuation.jsx) already has its
          own street input (quickStreet) for exactly the case where a saved
          property has none, so nothing downstream breaks; it's asked for
          once, at the moment it's actually needed, instead of upfront. */}

      {/* The five quality-coefficient selectors (موقعیت/ویو/طبقه/کیفیت
          ساختمان/فرنیش) that used to live here were removed from this form.
          They're still valid fields on a property (state/submit payload
          below untouched) and Flora Valuation's formula still reads them
          when present — it already treats a missing one as "معمولی"/neutral
          rather than blocking the estimate, so nothing downstream breaks.
          The saved-property path in Valuation.jsx has no UI to set them
          after the fact, though (only quick-mode, phone-call estimates do)
          — so for every file created from now on, valuation runs on
          area/street/comparables alone. */}
      <button type="button" onClick={() => setShowMore((s) => !s)} className="press w-full flex items-center justify-between rounded-xl px-4 py-3 mb-3" style={{ background: c.surface2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>جزئیات بیشتر (اختیاری)</span>
        <ChevronDown size={16} color={c.muted} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
      </button>
      {showMore && (
        <div className="flora-rise">
          <div className="grid grid-cols-3 gap-3">
            <Field c={c} label="تعداد اتاق"><input style={inputStyle(c)} inputMode="numeric" value={f.rooms} onChange={set("rooms")} /></Field>
            <Field c={c} label="طبقه"><Select c={c} value={f.floor} onChange={set("floor")} placeholder="طبقه" options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: faDigits(i + 1) }))} /></Field>
            <Field c={c} label="لوازم"><Select c={c} value={f.furnished} onChange={set("furnished")} placeholder="وضعیت" options={["با لوازم","بدون لوازم"].map(v=>({value:v,label:v}))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field c={c} label="نام مالک"><input style={inputStyle(c)} value={f.ownerName} onChange={set("ownerName")} placeholder="اختیاری" /></Field>
            <Field c={c} label="شماره مالک"><input style={inputStyle(c)} dir="ltr" value={f.ownerPhone} inputMode="tel" onChange={set("ownerPhone")} placeholder="اختیاری" /></Field>
          </div>
          <Field c={c} label="توضیحات"><textarea value={f.desc} onChange={set("desc")} rows={3} placeholder="توضیح کوتاه درباره‌ی ملک..." style={{ ...inputStyle(c), resize: "vertical" }} /></Field>
        </div>
      )}
      {isPreSale && (
        <>
          <Field c={c} label="سازنده"><Select c={c} value={f.builderId} onChange={set("builderId")} placeholder="انتخاب سازنده" options={builders.map(b=>({value:b.id,label:b.name}))} /></Field>
          <PreSaleFields c={c} f={f} setF={setF} total={total} />
        </>
      )}
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره فایل"} disabled={!valid} onClick={submit} />
    </SheetShell>
  );
}

// The Contact Picker API works on Android Chrome but NOT iOS Safari. So the pick
// button only appears where it's actually supported — no dead button on iPhone.
const contactsSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
async function pickContact(onPick) {
  try {
    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (contacts && contacts[0]) {
      const cn = contacts[0];
      const phone = (cn.tel && cn.tel[0]) ? String(cn.tel[0]).replace(/\s/g, "") : "";
      const name = (cn.name && cn.name[0]) ? cn.name[0] : "";
      onPick({ name, phone });
    }
  } catch (e) { /* user cancelled or unsupported */ }
}

function PhoneField({ c, label, value, onChange, onPickContact }) {
  return (
    <Field c={c} label={label}>
      <div className="flex gap-2">
        <input style={{ ...inputStyle(c), flex: 1 }} dir="ltr" value={value} inputMode="tel" onChange={onChange} />
        {contactsSupported && (
          <button type="button" onClick={() => pickContact(onPickContact)} className="press shrink-0 rounded-2xl flex items-center justify-center px-3" style={{ background: c.primarySoft }}>
            <Users size={16} color={c.primary} />
          </button>
        )}
      </div>
    </Field>
  );
}

function CustomerForm({ ctx, onClose }) {
  const { c, setCustomers, notify } = ctx;
  const [f, setF] = useState({ name: "", phone: "", need: "", budget: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  const contactsSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
  const pickContact = async () => {
    if (!contactsSupported) { notify("مرورگر شما از انتخاب مستقیم مخاطب پشتیبانی نمی‌کند — شماره را دستی وارد کن"); return; }
    try {
      const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (contact) setF((prev) => ({ ...prev, name: contact.name?.[0] || prev.name, phone: contact.tel?.[0] || prev.phone }));
    } catch (e) { /* user cancelled */ }
  };
  return (
    <SheetShell c={c} title="ثبت مشتری" onClose={onClose}>
      {contactsSupported && (
        <button type="button" onClick={pickContact} className="press w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-3.5" style={{ background: c.primarySoft, color: c.primary, fontWeight: 700, fontSize: 13 }}>
          <UserCircle2 size={15} /> انتخاب از مخاطبین گوشی
        </button>
      )}
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" value={f.phone} inputMode="tel" onChange={set("phone")} /></Field>
      <Field c={c} label="نیاز مشتری"><input style={inputStyle(c)} value={f.need} onChange={set("need")} placeholder="مثلاً خرید آپارتمان ۲ خواب" /></Field>
      <Field c={c} label="بودجه (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.budget} onChange={set("budget")} /></Field>
      <Field c={c} label="مرحله مشتری">
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {CUSTOMER_STAGES.map((st) => { const active = f.stage === st; return (
            <button key={st} type="button" onClick={() => setF({ ...f, stage: st })} className="press rounded-full" style={{ padding: `6px ${SP.md}px`, fontSize: FS.caption, fontWeight: FW.bold, background: active ? c.primary : c.surface2, color: active ? "#fff" : c.muted }}>{st}</button>
          ); })}
        </div>
      </Field>
      <SubmitBtn c={c} label="ذخیره مشتری" disabled={!valid} onClick={() => { setCustomers((prev) => [{ id: uid(), ...f, budget: toNum(f.budget), stage: f.stage || "در حال بررسی", lastContactAt: todayISO(), lastContactTs: Date.now() }, ...prev]); notify("مشتری با موفقیت ثبت شد"); onClose(); }} />
    </SheetShell>
  );
}
function OwnerForm({ ctx, onClose, editId }) {
  const { c, owners, setOwners, notify } = ctx;
  const editing = editId ? owners.find((o) => o.id === editId) : null;
  const [f, setF] = useState(editing ? { name: editing.name, phone: editing.phone } : { name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title={editing ? "ویرایش مالک" : "ثبت مالک"} onClose={onClose}>
      <Field c={c} label="نام و نام‌خانوادگی"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره موبایل"><input style={inputStyle(c)} dir="ltr" value={f.phone} inputMode="tel" onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره مالک"} disabled={!valid} onClick={() => {
        if (editing) setOwners((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x));
        else setOwners((prev) => [{ id: uid(), ...f }, ...prev]);
        notify(editing ? "تغییرات مالک ذخیره شد" : "مالک با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}
function BuilderBroadcastSheet({ ctx, onClose }) {
  const { c, builders, hasAiKey, callAI, notify, agencyName, agentName } = ctx;
  const OCCASIONS = ["عید نوروز", "عید فطر", "عید قربان", "یلدا", "تبریک عمومی", "تشکر از همکاری"];
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!hasAiKey) { notify("اول یک کلید هوش مصنوعی در تنظیمات وارد کن"); return; }
    setLoading(true);
    try {
      const prompt = `یک پیام کوتاه و صمیمی و محترمانه به مناسبت «${occasion}» بنویس که یک مشاور املاک برای سازنده‌های همکارش می‌فرستد. از طرف ${agencyName || "دفتر املاک"}${agentName ? ` (${agentName})` : ""}. لحن گرم و حرفه‌ای، حداکثر ۳ خط، بدون جای خالی برای اسم (چون برای همه یکسان فرستاده می‌شود). فقط متن پیام را بده، بدون توضیح.`;
      const text = await callAI(prompt);
      setMsg(text.trim());
    } catch (e) { notify(`خطا: ${e.message || "نامشخص"}`); }
    setLoading(false);
  };

  const withPhone = builders.filter((b) => b.phone);
  return (
    <SheetShell c={c} title="پیام گروهی به سازنده‌ها" onClose={onClose}>
      <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>یک پیام بنویس یا با هوش مصنوعی بساز، بعد برای هر سازنده جدا با واتساپ یا پیامک بفرست.</p>
      <Field c={c} label="مناسبت">
        <div className="flex flex-wrap" style={{ gap: SP.sm }}>
          {OCCASIONS.map((o) => { const active = occasion === o; return (
            <button key={o} type="button" onClick={() => setOccasion(o)} className="press rounded-full" style={{ padding: `6px ${SP.md}px`, fontSize: FS.caption, fontWeight: FW.bold, background: active ? c.primary : c.surface2, color: active ? "#fff" : c.muted }}>{o}</button>
          ); })}
        </div>
      </Field>
      <button onClick={generate} disabled={loading} className="press w-full rounded-xl py-2.5 flex items-center justify-center gap-2 mb-3" style={{ background: c.primarySoft }}>
        {loading ? <Loader2 size={14} className="animate-spin" color={c.primary} /> : <Sparkles size={14} color={c.primary} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>{loading ? "در حال نوشتن..." : "ساخت پیام با هوش مصنوعی"}</span>
      </button>
      <Field c={c} label="متن پیام">
        <textarea style={{ ...inputStyle(c), minHeight: 90, resize: "none", lineHeight: 1.9 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="متن پیام تبریک..." />
      </Field>
      <p style={{ fontSize: FS.caption, color: c.muted, marginBottom: SP.sm }}>{faDigits(withPhone.length)} سازنده با شماره — برای هرکدام جدا بفرست:</p>
      <div className="flex flex-col gap-2" style={{ maxHeight: 220, overflowY: "auto" }}>
        {withPhone.map((b) => (
          <div key={b.id} className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: c.surface2 }}>
            <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 700 }}>{b.name}</p><p style={{ fontSize: 10, color: c.muted }} dir="ltr">{b.phone}</p></div>
            <a href={waLink(b.phone, msg) || "#"} target="_blank" rel="noreferrer" className={`press rounded-lg px-3 py-2 flex items-center gap-1 ${!msg ? "pointer-events-none opacity-40" : ""}`} style={{ background: c.successSoft }}><Send size={12} color={c.success} /><span style={{ fontSize: 11, fontWeight: 700, color: c.success }}>واتساپ</span></a>
            <a href={smsLink(b.phone, msg) || "#"} className={`press rounded-lg px-3 py-2 flex items-center gap-1 ${!msg ? "pointer-events-none opacity-40" : ""}`} style={{ background: c.primarySoft }}><MessageCircle size={12} color={c.primary} /><span style={{ fontSize: 11, fontWeight: 700, color: c.primary }}>پیامک</span></a>
          </div>
        ))}
        {withPhone.length === 0 && <EmptyLine c={c} text="هیچ سازنده‌ای شماره ندارد" />}
      </div>
    </SheetShell>
  );
}

function BuilderForm({ ctx, onClose, editId }) {
  const { c, builders, setBuilders, notify } = ctx;
  const editing = editId ? builders.find((b) => b.id === editId) : null;
  const [f, setF] = useState(editing ? { name: editing.name, phone: editing.phone } : { name: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && f.phone;
  return (
    <SheetShell c={c} title={editing ? "ویرایش سازنده" : "ثبت سازنده"} onClose={onClose}>
      <Field c={c} label="نام شرکت / سازنده"><input style={inputStyle(c)} value={f.name} onChange={set("name")} /></Field>
      <Field c={c} label="شماره تماس"><input style={inputStyle(c)} dir="ltr" value={f.phone} inputMode="tel" onChange={set("phone")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره سازنده"} disabled={!valid} onClick={() => {
        if (editing) setBuilders((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x));
        else setBuilders((prev) => [{ id: uid(), ...f }, ...prev]);
        notify(editing ? "تغییرات سازنده ذخیره شد" : "سازنده با موفقیت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}
function AppointmentForm({ ctx, onClose }) {
  const { c, properties, customers, setAppointments, notify } = ctx;
  const [f, setF] = useState({ propertyId: "", customerName: "", date: todayISO(), time: "10:00", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.propertyId && f.customerName.trim() && f.date && f.time;
  return (
    <SheetShell c={c} title="ثبت قرار بازدید" onClose={onClose}>
      <Field c={c} label="فایل ملک"><Select c={c} value={f.propertyId} onChange={set("propertyId")} placeholder="انتخاب فایل" options={properties.map(p=>({value:p.id,label:p.title}))} /></Field>
      <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={f.customerName} onChange={set("customerName")} placeholder="نام مشتری را تایپ کن" /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="ساعت"><input type="time" style={inputStyle(c)} value={f.time} onChange={set("time")} /></Field>
      <Field c={c} label="یادداشت"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} /></Field>
      <SubmitBtn c={c} label="ذخیره قرار بازدید" disabled={!valid} onClick={() => {
        const match = customers.find((cu) => cu.name.trim() === f.customerName.trim());
        setAppointments((prev) => [{ id: uid(), propertyId: f.propertyId, customerId: match ? match.id : "", customerName: f.customerName.trim(), date: f.date, time: f.time, notes: f.notes }, ...prev]);
        notify("بازدید ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}
function CallForm({ ctx, onClose, editId }) {
  const { c, customers, calls, setCalls, notify } = ctx;
  const editing = editId ? calls.find((cl) => cl.id === editId) : null;
  const [f, setF] = useState(editing
    ? { customerName: editing.customerName || "", customerPhone: editing.customerPhone || "", date: editing.date, status: editing.status, notes: editing.notes || "" }
    : { customerName: "", customerPhone: "", date: todayISO(), status: "در انتظار پاسخ", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.customerName.trim();
  return (
    <SheetShell c={c} title={editing ? "ویرایش پیگیری تماس" : "ثبت پیگیری تماس"} onClose={onClose}>
      <Field c={c} label="نام مشتری"><input style={inputStyle(c)} value={f.customerName} onChange={set("customerName")} placeholder="نام مشتری را تایپ کن" /></Field>
      <Field c={c} label="شماره تماس (اختیاری)"><input style={inputStyle(c)} dir="ltr" value={f.customerPhone} onChange={set("customerPhone")} /></Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="یادداشت تماس"><input style={inputStyle(c)} value={f.notes} onChange={set("notes")} placeholder="موضوع تماس..." /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره تماس"} disabled={!valid} onClick={() => {
        const match = customers.find((cu) => cu.name.trim() === f.customerName.trim());
        if (editing) {
          setCalls((prev) => prev.map((x) => x.id === editId ? { ...x, customerId: match ? match.id : "", customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), date: f.date, notes: f.notes } : x));
          notify("تغییرات تماس ذخیره شد");
        } else {
          setCalls((prev) => [{ id: uid(), customerId: match ? match.id : "", customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), date: f.date, status: f.status, notes: f.notes }, ...prev]);
          notify("تماس ثبت شد");
        }
        onClose();
      }} />
    </SheetShell>
  );
}

// Defined at module scope on purpose: nesting this inside DealForm made React treat it as a new
// component type on every keystroke, remounting the input and dropping focus after one character.
function CommissionField({ c, f, setF, side, label }) {
  const mode = side === "seller" ? f.sellerMode : f.buyerMode;
  const modeKey = side === "seller" ? "sellerMode" : "buyerMode";
  const pctKey = side === "seller" ? "sellerPct" : "buyerPct";
  const fixedKey = side === "seller" ? "sellerFixed" : "buyerFixed";
  const price = toNum(f.price);
  const breakdown = officialCommission(price);
  const previewAmount = mode === "official" ? breakdown.final
    : mode === "pct" ? Math.round(price * toDecimal(f[pctKey]) / 100)
    : toNum(f[fixedKey]);
  const modeBtn = (m, txt) => (
    <button type="button" onClick={() => setF((p) => ({ ...p, [modeKey]: m }))} className="press flex-1 rounded-lg py-1.5" style={{ background: mode === m ? c.primary : c.surface2, color: mode === m ? "#fff" : c.muted, fontWeight: 700, fontSize: 10 }}>{txt}</button>
  );
  return (
    <Field c={c} label={label}>
      <div className="flex gap-2 mb-2">
        {modeBtn("official", "فرمول رسمی")}
        {modeBtn("pct", "درصدی")}
        {modeBtn("fixed", "مبلغ ثابت")}
      </div>
      {mode === "official" ? (
        <div className="rounded-xl p-3" style={{ background: c.surface2 }}>
          <BreakdownRow c={c} label="ثمن معامله" value={breakdown.price} />
          {breakdown.excess > 0 && <BreakdownRow c={c} label="مبلغ مازاد (بالای ۱ میلیارد)" value={breakdown.excess} muted />}
          <BreakdownRow c={c} label="کمیسیون قبل از مالیات" value={breakdown.commission} />
          <BreakdownRow c={c} label="مالیات ۱۰٪" value={breakdown.tax} muted />
          <div className="flex items-center justify-between" style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${c.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: c.primary }}>مبلغ نهایی قابل پرداخت</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: c.primary, direction: "ltr" }}>{fmtToman(breakdown.final)}</span>
          </div>
          <p style={{ fontSize: 10, color: c.muted, marginTop: 8, lineHeight: 1.7 }}>۱ میلیارد اول: ۱۰ میلیون ثابت · مازاد: نیم درصد · سپس ۱۰٪ مالیات</p>
        </div>
      ) : mode === "pct"
        ? <input style={inputStyle(c)} inputMode="decimal" value={f[pctKey]} onChange={(e) => setF((p) => ({ ...p, [pctKey]: e.target.value }))} placeholder="مثلاً ۱" />
        : <input style={inputStyle(c)} inputMode="numeric" value={f[fixedKey]} onChange={(e) => setF((p) => ({ ...p, [fixedKey]: e.target.value }))} placeholder="مبلغ به تومان" />}
      {mode !== "official" && <p style={{ fontSize: 11, color: c.primary, fontWeight: 700, marginTop: 6 }}>{fmtToman(previewAmount)}</p>}
    </Field>
  );
}

function BreakdownRow({ c, label, value, muted }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: c.muted }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: muted ? c.muted : c.ink, direction: "ltr" }}>{fmtToman(value)}</span>
    </div>
  );
}

function DealForm({ ctx, onClose, editId }) {
  const { c, properties, owners, deals, setDeals, notify } = ctx;
  const editing = editId ? deals.find((d) => d.id === editId) : null;
  const [showMore, setShowMore] = useState(!!editing);
  const [f, setF] = useState(editing ? {
    propertyId: editing.propertyId || "", propertyTitle: editing.propertyTitle, sellerName: editing.sellerName || "", sellerPhone: editing.sellerPhone || "",
    buyerName: editing.buyerName || "", buyerPhone: editing.buyerPhone || "", price: String(editing.price),
    sellerMode: editing.sellerMode || "pct", sellerPct: String(editing.sellerPct || 0), sellerFixed: String(editing.sellerFixed || ""),
    buyerMode: editing.buyerMode || "pct", buyerPct: String(editing.buyerPct || 0), buyerFixed: String(editing.buyerFixed || ""),
    advisor: editing.advisor || "من", status: editing.status, dealDate: (editing.createdAt || todayISO()).slice(0, 10),
  } : { propertyId: "", propertyTitle: "", sellerName: "", sellerPhone: "", buyerName: "", buyerPhone: "", price: "", sellerMode: "official", sellerPct: "1", sellerFixed: "", buyerMode: "official", buyerPct: "0.5", buyerFixed: "", advisor: "من", status: "در حال مذاکره", dealDate: todayISO() });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onPickProperty = (e) => {
    const pid = e.target.value;
    const p = properties.find((x) => x.id === pid);
    const owner = p ? owners.find((o) => o.id === p.ownerId) : null;
    setF((prev) => ({ ...prev, propertyId: pid, propertyTitle: p?.title || prev.propertyTitle, price: p ? String(p.price) : prev.price, sellerName: owner?.name || prev.sellerName, sellerPhone: owner?.phone || prev.sellerPhone }));
  };
  const valid = f.propertyTitle.trim() && f.price;

  // Live total, so the number the agent actually cares about updates as they
  // type instead of only appearing after the form is submitted.
  const price = toNum(f.price);
  const sideAmount = (mode, pctKey, fixedKey) => mode === "official" ? officialCommission(price).final
    : mode === "pct" ? Math.round(price * toDecimal(f[pctKey]) / 100) : toNum(f[fixedKey]);
  const totalCommission = sideAmount(f.sellerMode, "sellerPct", "sellerFixed") + sideAmount(f.buyerMode, "buyerPct", "buyerFixed");

  return (
    <SheetShell c={c} title={editing ? "ویرایش قرارداد" : "ثبت قرارداد جدید"} onClose={onClose}>
      {!editing && <Field c={c} label="از روی کدام فایل؟"><Select c={c} value={f.propertyId} onChange={onPickProperty} placeholder="انتخاب کن تا خودکار پر شود" options={properties.map((p) => ({ value: p.id, label: p.title }))} /></Field>}
      <Field c={c} label="عنوان معامله"><input style={inputStyle(c)} value={f.propertyTitle} onChange={set("propertyTitle")} placeholder="مثلاً ویلا تانیا — لواسان" /></Field>
      <Field c={c} label="مبلغ معامله (تومان)"><input style={inputStyle(c)} inputMode="numeric" value={f.price} onChange={set("price")} placeholder="مثلاً ۵۰۰۰۰۰۰۰۰۰" /></Field>

      {/* The payoff card — big, and it animates the moment a price exists */}
      {price > 0 && (
        <div className="flora-pop" style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.lg, background: `linear-gradient(160deg, ${c.successSoft}, ${c.surface} 65%)`, border: `1px solid ${c.success}33` }}>
          <p style={{ fontSize: FS.caption, color: c.muted }}>کمیسیون کل این معامله</p>
          <CountUpTomanSplit value={totalCommission} size={26} color={c.success} tomanColor={c.muted} />
          <p style={{ fontSize: 11, color: c.muted, marginTop: SP.xs }}>فروشنده {fmtBudgetShort(sideAmount(f.sellerMode, "sellerPct", "sellerFixed"))} · خریدار {fmtBudgetShort(sideAmount(f.buyerMode, "buyerPct", "buyerFixed"))}</p>
        </div>
      )}

      <button type="button" onClick={() => setShowMore((v) => !v)} className="press w-full flex items-center justify-between" style={{ padding: SP.lg, borderRadius: RAD.md, marginBottom: SP.lg, background: c.surface2 }}>
        <span style={{ fontSize: FS.body, fontWeight: FW.bold }}>{showMore ? "بستن جزئیات" : "جزئیات بیشتر (اختیاری)"}</span>
        <ChevronDown size={16} color={c.muted} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
      </button>

      {showMore && (
        <div className="flora-rise">
          <div className="grid grid-cols-2 gap-3">
            <Field c={c} label="نام فروشنده"><input style={inputStyle(c)} value={f.sellerName} onChange={set("sellerName")} /></Field>
            <Field c={c} label="شماره فروشنده"><input style={inputStyle(c)} dir="ltr" value={f.sellerPhone} inputMode="tel" onChange={set("sellerPhone")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field c={c} label="نام خریدار"><input style={inputStyle(c)} value={f.buyerName} onChange={set("buyerName")} /></Field>
            <Field c={c} label="شماره خریدار"><input style={inputStyle(c)} dir="ltr" value={f.buyerPhone} inputMode="tel" onChange={set("buyerPhone")} /></Field>
          </div>
          <CommissionField c={c} f={f} setF={setF} side="seller" label="کمیسیون فروشنده" />
          <CommissionField c={c} f={f} setF={setF} side="buyer" label="کمیسیون خریدار" />
          <div className="grid grid-cols-2 gap-3">
            <Field c={c} label="مشاور"><input style={inputStyle(c)} value={f.advisor} onChange={set("advisor")} /></Field>
            <Field c={c} label="وضعیت"><Select c={c} value={f.status} onChange={set("status")} placeholder="انتخاب کنید" options={["در حال مذاکره", "در انتظار پرداخت", "تسویه شده"].map((v) => ({ value: v, label: v }))} /></Field>
          </div>
          <Field c={c} label="تاریخ قرارداد">
            <JalaliDatePicker c={c} value={f.dealDate} onChange={(iso) => setF((p) => ({ ...p, dealDate: iso }))} />
          </Field>
        </div>
      )}

      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره قرارداد"} disabled={!valid} onClick={() => {
        const payload = {
          propertyId: f.propertyId, propertyTitle: f.propertyTitle.trim(), sellerName: f.sellerName.trim(), sellerPhone: f.sellerPhone.trim(), buyerName: f.buyerName.trim(), buyerPhone: f.buyerPhone.trim(), price: toNum(f.price),
          sellerMode: f.sellerMode, sellerPct: toDecimal(f.sellerPct), sellerFixed: toNum(f.sellerFixed),
          buyerMode: f.buyerMode, buyerPct: toDecimal(f.buyerPct), buyerFixed: toNum(f.buyerFixed),
          advisor: f.advisor.trim() || "من", status: f.status,
        };
        const createdAt = new Date(`${f.dealDate}T12:00:00`).toISOString();
        if (editing) setDeals((prev) => prev.map((d) => d.id === editId ? { ...d, ...payload, createdAt } : d));
        else setDeals((prev) => [{ id: uid(), ...payload, createdAt }, ...prev]);
        notify(editing ? "تغییرات قرارداد ذخیره شد" : "قرارداد ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function PaymentForm({ ctx, onClose, prefillDealId, editId }) {
  const { c, deals, payments, setPayments, notify } = ctx;
  const editing = editId ? payments.find((p) => p.id === editId) : null;
  const [showMore, setShowMore] = useState(false);
  const [f, setF] = useState(editing
    ? { dealId: editing.dealId, payerType: editing.payerType, amount: String(editing.amount), date: editing.date, method: editing.method, tracking: editing.tracking || "", note: editing.note || "", shots: editing.shots || [] }
    : { dealId: prefillDealId || "", payerType: "seller", amount: "", date: todayISO(), method: "card", tracking: "", note: "", shots: [] });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.dealId && f.amount;
  return (
    <SheetShell c={c} title={editing ? "ویرایش پرداخت" : "ثبت پرداخت جدید"} onClose={onClose}>
      <Field c={c} label="انتخاب معامله"><Select c={c} value={f.dealId} onChange={set("dealId")} placeholder="انتخاب قرارداد" options={deals.map((d) => ({ value: d.id, label: d.propertyTitle }))} /></Field>
      <Field c={c} label="پرداخت‌کننده">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setF({ ...f, payerType: "seller" })} className="press rounded-xl py-2.5" style={{ background: f.payerType === "seller" ? c.primary : c.surface2, color: f.payerType === "seller" ? "#fff" : c.muted, fontWeight: 700, fontSize: 13 }}>فروشنده</button>
          <button type="button" onClick={() => setF({ ...f, payerType: "buyer" })} className="press rounded-xl py-2.5" style={{ background: f.payerType === "buyer" ? c.primary : c.surface2, color: f.payerType === "buyer" ? "#fff" : c.muted, fontWeight: 700, fontSize: 13 }}>خریدار</button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field c={c} label="مبلغ پرداختی (تومان)">
          <input style={inputStyle(c)} inputMode="numeric" value={f.amount} onChange={set("amount")} />
          <p style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>{fmtToman(toNum(f.amount))}</p>
        </Field>
        <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      </div>
      <Field c={c} label="روش پرداخت">
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.id} type="button" onClick={() => setF({ ...f, method: m.id })} className="press rounded-xl py-2.5 flex flex-col items-center gap-1" style={{ background: f.method === m.id ? c.primary : c.surface2 }}>
              <m.icon size={14} color={f.method === m.id ? "#fff" : c.muted} />
              <span style={{ fontSize: 10, fontWeight: 700, color: f.method === m.id ? "#fff" : c.muted }}>{m.label}</span>
            </button>
          ))}
        </div>
      </Field>

      {/* Live payoff: what this payment leaves outstanding — the number the
          agent is actually doing arithmetic about while typing. */}
      {(() => {
        const deal = deals.find((d) => d.id === f.dealId);
        if (!deal || !toNum(f.amount)) return null;
        const owed = dealRemaining(deal, payments, f.payerType);
        const after = Math.max(0, owed - toNum(f.amount));
        const settled = after === 0;
        return (
          <div className="flora-pop" style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.lg, background: `linear-gradient(160deg, ${settled ? c.successSoft : c.attnSoft}, ${c.surface} 65%)`, border: `1px solid ${(settled ? c.success : c.attn)}33` }}>
            <p style={{ fontSize: FS.caption, color: c.muted }}>{settled ? "با این پرداخت تسویه کامل می‌شود" : "مانده پس از این پرداخت"}</p>
            <CountUpTomanSplit value={after} size={24} color={settled ? c.success : c.attn} tomanColor={c.muted} />
          </div>
        );
      })()}

      {/* A cheque is the one payment method where the paper itself matters —
          due date, serial, bank, signature. So the capture field appears only
          for cheques rather than adding noise to cash or card payments. */}
      {f.method === "check" && (
        <div className="flora-rise" style={{ padding: SP.lg, borderRadius: RAD.lg, marginBottom: SP.lg, ...glassLite(c, RAD.lg) }}>
          <p style={{ fontSize: FS.body, fontWeight: FW.bold, marginBottom: SP.xs }}>عکس چک</p>
          <p style={{ fontSize: FS.caption, color: c.muted, lineHeight: 1.8, marginBottom: SP.md }}>از چک عکس بگیر تا تاریخ سررسید و شماره‌اش همیشه در دسترس باشد.</p>
          <MediaGallery c={c} media={f.shots || []} uploading={false}
            onAdd={async (files) => { const items = await filesToMedia(files); setF((prev) => ({ ...prev, shots: [...(prev.shots || []), ...items] })); }}
            onRemove={(id) => setF((prev) => ({ ...prev, shots: (prev.shots || []).filter((x) => x.id !== id) }))}
            onView={ctx.setLightbox} accept="image/*" />
        </div>
      )}

      <button type="button" onClick={() => setShowMore((v) => !v)} className="press w-full flex items-center justify-between" style={{ padding: SP.lg, borderRadius: RAD.md, marginBottom: SP.lg, background: c.surface2 }}>
        <span style={{ fontSize: FS.body, fontWeight: FW.bold }}>{showMore ? "بستن جزئیات" : "جزئیات بیشتر (اختیاری)"}</span>
        <ChevronDown size={16} color={c.muted} style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .25s ease" }} />
      </button>
      {showMore && (
        <div className="flora-rise">
          <Field c={c} label="شماره پیگیری"><input style={inputStyle(c)} value={f.tracking} onChange={set("tracking")} /></Field>
          <Field c={c} label="توضیحات"><input style={inputStyle(c)} value={f.note} onChange={set("note")} /></Field>
        </div>
      )}
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ثبت پرداخت"} disabled={!valid} onClick={() => {
        const payload = { dealId: f.dealId, payerType: f.payerType, amount: toNum(f.amount), date: f.date, method: f.method, tracking: f.tracking.trim(), note: f.note.trim(), shots: f.shots || [] };
        if (editing) setPayments((prev) => prev.map((p) => p.id === editId ? { ...p, ...payload } : p));
        else setPayments((prev) => [{ id: uid(), ...payload }, ...prev]);
        notify(editing ? "تغییرات پرداخت ذخیره شد" : "پرداخت ثبت شد"); onClose();
      }} />
    </SheetShell>
  );
}

function DealDetailSheet({ ctx, onClose, dealId }) {
  const { c, deals, payments, setSheet, setDeals, notify } = ctx;
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) return null;
  const Block = ({ title, icon: Icon, side }) => {
    const mode = side === "seller" ? deal.sellerMode : deal.buyerMode;
    const commission = dealCommission(deal, side);
    const paid = dealPaid(deal, payments, side);
    const remaining = dealRemaining(deal, payments, side);
    const done = remaining === 0;
    return (
      <div className="rounded-xl p-3.5 mb-3" style={{ background: c.surface2 }}>
        <div className="flex items-center gap-2 mb-2.5"><Icon size={15} color={c.primary} /><p style={{ fontSize: 13, fontWeight: 700 }}>{title}</p></div>
        <Row c={c} label={mode === "fixed" ? "نوع کمیسیون" : "درصد کمیسیون"} value={mode === "fixed" ? "مبلغ ثابت" : `${faDigits(side === "seller" ? deal.sellerPct : deal.buyerPct)}٪`} />
        <Row c={c} label="مبلغ کمیسیون" value={fmtToman(commission)} />
        <Row c={c} label="پرداخت شده" value={fmtToman(paid)} color={c.success} />
        <Row c={c} label="مانده بدهی" value={fmtToman(remaining)} color={done ? c.ink : c.attn} />
        <Row c={c} label="وضعیت" value={done ? "تسویه کامل" : "در انتظار تسویه"} color={done ? c.success : c.attn} />
      </div>
    );
  };
  return (
    <SheetShell c={c} title="جزئیات معامله" onClose={onClose}>
      <div className="flex items-start justify-between mb-1">
        <div><p style={{ fontSize: 15, fontWeight: 800 }}>{deal.propertyTitle}</p><p style={{ fontSize: 11, color: c.muted, marginTop: 3 }}>{fmtToman(deal.price)} · {deal.advisor}</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setSheet({ kind: "deal", editId: dealId })} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.primarySoft }}><Edit3 size={14} color={c.primary} /></button>
          <button onClick={() => { setDeals((prev) => prev.filter((d) => d.id !== dealId)); onClose(); notify("قرارداد حذف شد"); }} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.dangerSoft }}><Trash2 size={14} color={c.danger} /></button>
        </div>
      </div>
      <div style={{ height: 10 }} />
      <Block title="کمیسیون فروشنده" icon={UserCircle2} side="seller" />
      <Block title="کمیسیون خریدار" icon={Users} side="buyer" />
      <div className="flex gap-2 mt-2">
        {deal.status !== "تسویه شده" && (
          <button onClick={() => { setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, status: "تسویه شده" } : d)); notify("وضعیت به‌روزرسانی شد"); }} className="press flex-1 rounded-xl py-3" style={{ background: c.successSoft, color: c.success, fontWeight: 700, fontSize: 13 }}>علامت به‌عنوان تسویه‌شده</button>
        )}
        <button onClick={() => setSheet({ kind: "payment", prefillDealId: dealId })} className="press flex-1 rounded-xl py-3" style={{ background: c.gradientPrimary, color: "#fff", fontWeight: 700, fontSize: 13 }}>ثبت پرداخت</button>
      </div>
    </SheetShell>
  );
}
function Row({ c, label, value, color }) {
  return <div className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: `1px solid ${c.border}` }}><span style={{ fontSize: 11, color: c.muted }}>{label}</span><span style={{ fontSize: 13, fontWeight: 700, color: color || c.ink }}>{value}</span></div>;
}

// One form handles both office income and office expense — same shape, different list/colors.
function OfficeEntryForm({ ctx, onClose, editId, mode }) {
  const { c, expenses, setExpenses, officeIncomes, setOfficeIncomes, notify } = ctx;
  const isIncome = mode === "income";
  const list = isIncome ? officeIncomes : expenses;
  const setList = isIncome ? setOfficeIncomes : setExpenses;
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const accent = isIncome ? c.success : c.danger;
  const editing = editId ? list.find((x) => x.id === editId) : null;
  const [f, setF] = useState(editing
    ? { category: editing.category || categories[0], title: editing.title || "", amount: String(editing.amount), date: editing.date, note: editing.note || "" }
    : { category: categories[0], title: "", amount: "", date: todayISO(), note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.title.trim() && f.amount;
  const title = editing ? (isIncome ? "ویرایش درآمد" : "ویرایش هزینه") : (isIncome ? "ثبت درآمد دفتر" : "ثبت هزینه دفتر");

  return (
    <SheetShell c={c} title={title} onClose={onClose}>
      <Field c={c} label="دسته‌بندی">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = f.category === cat;
            return (
              <button key={cat} type="button" onClick={() => setF({ ...f, category: cat })} className="press rounded-lg px-3 py-2"
                style={{ background: active ? accent : c.surface2, color: active ? "#fff" : c.muted, fontWeight: 700, fontSize: 11 }}>{cat}</button>
            );
          })}
        </div>
      </Field>
      <Field c={c} label="عنوان"><input style={inputStyle(c)} value={f.title} onChange={set("title")} placeholder={isIncome ? "مثلاً حق مشاوره قرارداد" : "مثلاً شارژ آگهی دیوار"} /></Field>
      <Field c={c} label="مبلغ (تومان)">
        <input style={inputStyle(c)} inputMode="numeric" value={f.amount} onChange={set("amount")} placeholder="فارسی یا انگلیسی" />
        <p style={{ fontSize: 11, color: accent, fontWeight: 700, marginTop: 6 }}>{fmtToman(toNum(f.amount))}</p>
      </Field>
      <Field c={c} label="تاریخ (شمسی)"><JalaliDatePicker c={c} value={f.date} onChange={(iso) => setF({ ...f, date: iso })} /></Field>
      <Field c={c} label="توضیحات (اختیاری)"><input style={inputStyle(c)} value={f.note} onChange={set("note")} /></Field>
      <SubmitBtn c={c} label={editing ? "ذخیره تغییرات" : "ذخیره"} disabled={!valid} onClick={() => {
        const payload = { category: f.category, title: f.title.trim(), amount: toNum(f.amount), date: f.date, note: f.note.trim() };
        if (editing) setList((prev) => prev.map((x) => x.id === editId ? { ...x, ...payload } : x));
        else setList((prev) => [{ id: uid(), ...payload }, ...prev]);
        notify(editing ? "تغییرات ذخیره شد" : (isIncome ? "درآمد ثبت شد" : "هزینه ثبت شد"));
        onClose();
      }} />
    </SheetShell>
  );
}
