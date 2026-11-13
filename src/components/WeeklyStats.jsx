import React, { useEffect, useState } from "react";
import { BarChart3, X, Eye, Inbox, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { SP, RAD, FS, FW, glass, glassLite } from "../lib/theme.js";
import { BodyPortal, FLORA_GOLD } from "../lib/ui.jsx";
import { faDigits } from "../lib/format.js";


// ---------- Home dashboard entry point ----------
function WeeklyStatsTile({ ctx }) {
  const { c, setWeeklyStatsOpen } = ctx;
  return (
    <button onClick={() => setWeeklyStatsOpen(true)} className="press flex flex-col items-center" style={{ gap: 7, flex: 1 }}>
      <div className="flex items-center justify-center" style={{ width: 54, height: 54, borderRadius: 18, background: `${FLORA_GOLD}22` }}><BarChart3 size={22} color={FLORA_GOLD} /></div>
      <p style={{ fontSize: 11, fontWeight: FW.medium, color: c.muted, textAlign: "center" }}>آمار هفته</p>
    </button>
  );
}

// ---------- Small chart primitives, all real-data-driven ----------


// A zigzag polyline through 7 daily values, with a dot on the last point —
// same "trend at a glance" shape as the reference's HRV chart.
function TrendZigzag({ values, color, width = 130, height = 46 }) {
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 8) + 4;
    const y = height - 6 - ((v - min) / span) * (height - 14);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height}>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={4} fill={color} />
    </svg>
  );
}


// ---------- Main screen ----------
// Only two numbers, both from the public site: «ورودی» (visit requests that
// came in from the site) and «بازدید سایت» (views of the agent's published
// property pages). Fetched once when the screen opens — nothing else runs.
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
function startOfDay(daysAgo) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - daysAgo); return d; }

async function fetchCreatedAt(table, sinceIso) {
  const { data, error } = await supabase.from(table).select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return (data || []).map((r) => r.created_at);
}

function MetricCard({ c, title, icon: Icon, color, thisWeek, prevWeek, days, unavailable, note }) {
  const pct = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : (thisWeek > 0 ? 100 : 0);
  return (
    <div className="rounded-2xl" style={{ padding: SP.lg, ...glassLite(c, 20) }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 11, background: `${color}22` }}><Icon size={17} color={color} /></div>
        <p style={{ fontSize: 13, fontWeight: FW.heavy, flex: 1 }}>{title}</p>
      </div>
      {unavailable ? (
        <p style={{ fontSize: 11.5, color: c.muted, marginTop: 12, lineHeight: 1.9 }}>{note}</p>
      ) : (
        <div className="flex items-end justify-between" style={{ marginTop: 12 }}>
          <div>
            <span style={{ fontSize: 36, fontWeight: FW.heavy, color: c.ink, lineHeight: 1 }}>{faDigits(thisWeek)}</span>
            <p style={{ fontSize: 10.5, color: c.muted, marginTop: 6 }}>هفته‌ی قبل: {faDigits(prevWeek)}{thisWeek || prevWeek ? ` — ${pct >= 0 ? "▲" : "▼"} ${faDigits(Math.abs(pct))}٪` : ""}</p>
          </div>
          <TrendZigzag values={days} color={color} width={120} height={42} />
        </div>
      )}
    </div>
  );
}

function WeeklyStatsHome({ ctx }) {
  const { c, setWeeklyStatsOpen } = ctx;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Iranian week starts Saturday: JS getDay() Sat=6 → 0 days back.
    const sinceSat = (new Date().getDay() + 1) % 7;
    const weekStart = startOfDay(sinceSat), prevStart = startOfDay(sinceSat + 7);
    const since = startOfDay(Math.max(13, sinceSat + 7)).toISOString();
    const summarize = (list) => {
      const t = list.map((iso) => new Date(iso));
      const days = Array.from({ length: 7 }, (_, i) => { const k = dayKey(startOfDay(6 - i)); return t.filter((d) => dayKey(d) === k).length; });
      return { thisWeek: t.filter((d) => d >= weekStart).length, prevWeek: t.filter((d) => d >= prevStart && d < weekStart).length, days };
    };
    (async () => {
      const [req, views] = await Promise.allSettled([fetchCreatedAt("visit_requests", since), fetchCreatedAt("property_views", since)]);
      if (cancelled) return;
      setStats({
        requests: req.status === "fulfilled" ? summarize(req.value) : null,
        views: views.status === "fulfilled" ? summarize(views.value) : null,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const empty = { thisWeek: 0, prevWeek: 0, days: [0, 0, 0, 0, 0, 0, 0] };
  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: c.bg }}>
        <div className="flex items-center" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={() => setWeeklyStatsOpen(false)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <div className="flex-1">
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>آمار هفته</p>
            <p style={{ fontSize: 11, color: c.muted }}>از شنبه تا امروز — سایت عمومی</p>
          </div>
        </div>
        <div className="px-4 pb-10 flex flex-col" style={{ gap: SP.md }}>
          {!stats ? (
            <div className="flex items-center justify-center" style={{ padding: 40, gap: 8, color: c.muted, fontSize: 12 }}><Loader2 size={16} className="animate-spin" /> در حال بارگذاری…</div>
          ) : (
            <>
              <MetricCard c={c} title="ورودی (درخواست بازدید از سایت)" icon={Inbox} color={FLORA_GOLD} {...(stats.requests || empty)} unavailable={!stats.requests} note="آمار ورودی در دسترس نیست — اتصال اینترنت را بررسی کن." />
              <MetricCard c={c} title="بازدید از سایت" icon={Eye} color={c.primary} {...(stats.views || empty)} unavailable={!stats.views} note="شمارش بازدید سایت هنوز فعال نشده (فایل SQL «property_views» را یک بار در Supabase اجرا کن)." />
            </>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

export { WeeklyStatsTile, WeeklyStatsHome };
