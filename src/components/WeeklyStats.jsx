import React from "react";
import { BarChart3, X, PhoneCall, Users, Building2 } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite } from "../lib/theme.js";
import { BodyPortal, FLORA_GOLD } from "../lib/ui.jsx";
import { faDigits } from "../lib/format.js";

const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------- Home dashboard entry point ----------
function WeeklyStatsTile({ ctx }) {
  const { c, setWeeklyStatsOpen } = ctx;
  return (
    <button onClick={() => setWeeklyStatsOpen(true)} className="press text-right flora-tile shrink-0" style={{ width: 148, padding: SP.lg, borderRadius: RAD.lg, ...glass(c) }}>
      <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: RAD.md, background: `${FLORA_GOLD}22`, marginBottom: SP.md }}><BarChart3 size={20} color={FLORA_GOLD} /></div>
      <p style={{ fontSize: FS.body, fontWeight: FW.bold }}>آمار هفته</p>
      <p style={{ fontSize: FS.caption, color: c.muted, marginTop: 2, lineHeight: 1.6 }}>یک نگاه به این هفته</p>
    </button>
  );
}

// ---------- Small chart primitives, all real-data-driven ----------

// A ring of dots, like a dosimeter — the first `pct`% of dots are lit.
function DotRing({ pct, color, size = 96, dots = 40 }) {
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const lit = Math.round((pct / 100) * dots);
  return (
    <svg width={size} height={size}>
      {Array.from({ length: dots }, (_, i) => {
        const angle = (i / dots) * 2 * Math.PI - Math.PI / 2;
        const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r={i < lit ? 2.4 : 1.6} fill={i < lit ? color : "rgba(120,120,130,0.28)"} />;
      })}
    </svg>
  );
}

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

// A vertical gauge — this week's level against last week's, marked with a tick.
function VerticalGauge({ value, compare, color, height = 78, width = 28 }) {
  const max = Math.max(1, value, compare) * 1.15;
  const fillH = Math.max(3, (value / max) * height);
  const markY = height - (compare / max) * height;
  return (
    <svg width={width} height={height + 4}>
      <rect x={0} y={0} width={width} height={height} rx={8} fill="rgba(120,120,130,0.16)" />
      <rect x={0} y={height - fillH} width={width} height={fillH} rx={8} fill={color} />
      <rect x={-3} y={markY - 1} width={width + 6} height={2} fill="rgba(255,255,255,0.75)" />
    </svg>
  );
}

// ---------- Main screen ----------
function WeeklyStatsHome({ ctx }) {
  const { c, calls, appointments, deals, properties, setWeeklyStatsOpen } = ctx;

  const weekStart = daysAgoISO(new Date().getDay()).slice(0, 10);
  const prevWeekStart = daysAgoISO(new Date().getDay() + 7).slice(0, 10);

  const inThisWeek = (iso) => (iso || "") >= weekStart;
  const inPrevWeek = (iso) => (iso || "") >= prevWeekStart && (iso || "") < weekStart;

  const callsThisWeek = calls.filter((cl) => inThisWeek(cl.date));
  const visitsThisWeek = appointments.filter((a) => inThisWeek(a.date));
  const visitsPrevWeek = appointments.filter((a) => inPrevWeek(a.date));
  const filesThisWeek = properties.filter((p) => inThisWeek((p.createdAt || "").slice(0, 10)));
  const dealsThisWeek = deals.filter((d) => inThisWeek((d.createdAt || "").slice(0, 10)));

  // Same "daily activity" shape used elsewhere on the home screen (calls +
  // visits + new files per day) — reused here for the trend card instead of
  // a second, different definition of "activity."
  const countFor = (iso) =>
    appointments.filter((a) => a.date === iso).length +
    calls.filter((cl) => cl.date === iso).length +
    properties.filter((p) => p.createdAt && p.createdAt.slice(0, 10) === iso).length;
  const dayCounts = Array.from({ length: 7 }, (_, i) => countFor(daysAgoISO(6 - i).slice(0, 10)));
  const thisWeekTotal = dayCounts.reduce((a, b) => a + b, 0);
  const prevWeekTotal = Array.from({ length: 7 }, (_, i) => daysAgoISO(13 - i).slice(0, 10)).reduce((sum, iso) => sum + countFor(iso), 0);
  const pct = prevWeekTotal > 0 ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : (thisWeekTotal > 0 ? 100 : 0);
  const trendLabel = thisWeekTotal === 0 ? "بدون فعالیت" : pct >= 15 ? "عالی" : pct >= 0 ? "خوب" : "رو به کاهش";
  const trendColor = thisWeekTotal === 0 ? c.muted : pct >= 0 ? c.success : c.attn;

  const callsDone = callsThisWeek.filter((cl) => cl.status === "انجام‌شد").length;
  const answerRate = callsThisWeek.length ? Math.round((callsDone / callsThisWeek.length) * 100) : 0;

  const mix = [
    { label: "تماس", value: callsThisWeek.length, color: FLORA_GOLD },
    { label: "بازدید", value: visitsThisWeek.length, color: c.primary },
    { label: "فایل جدید", value: filesThisWeek.length, color: c.success },
  ];
  const mixTotal = Math.max(1, mix.reduce((s, m) => s + m.value, 0));

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: c.bg }}>
        <div className="flex items-center" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={() => setWeeklyStatsOpen(false)} className="press w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <div className="flex-1">
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>آمار هفته</p>
            <p style={{ fontSize: 11, color: c.muted }}>از شنبه تا امروز — {faDigits(todayISO().slice(8, 10))}</p>
          </div>
        </div>

        <div className="px-4 pb-10 flex flex-col" style={{ gap: SP.md }}>
          {/* Hero — total activity, big number, tiny sparkline. Flora's own
              brand gradient, not a generic dashboard orange. */}
          <div className="rounded-2xl relative overflow-hidden" style={{ padding: SP.xl, background: c.gradientPrimary }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>فعالیت این هفته</p>
            <div className="flex items-end justify-between" style={{ marginTop: 6 }}>
              <div className="flex items-baseline" style={{ gap: 6 }}>
                <span style={{ fontSize: 44, fontWeight: FW.heavy, color: "#fff", lineHeight: 1 }}>{faDigits(thisWeekTotal)}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>مورد</span>
              </div>
              <TrendZigzag values={dayCounts} color="#fff" width={110} height={40} />
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 8, lineHeight: 1.8 }}>
              تماس + بازدید + فایل جدید، نسبت به هفته‌ی قبل {pct >= 0 ? `${faDigits(Math.abs(pct))}٪ بیشتر` : `${faDigits(Math.abs(pct))}٪ کمتر`}
            </p>
          </div>

          {/* 2x2 grid */}
          <div className="grid grid-cols-2" style={{ gap: SP.md }}>
            <div className="rounded-2xl flex flex-col items-center justify-center" style={{ padding: SP.lg, ...glassLite(c, 20) }}>
              <p style={{ fontSize: 11, color: c.muted, fontWeight: 700, alignSelf: "flex-start" }}>نرخ پاسخ‌گویی تماس</p>
              <div className="relative flex items-center justify-center" style={{ marginTop: 6 }}>
                <DotRing pct={answerRate} color={FLORA_GOLD} size={92} />
                <div className="absolute flex flex-col items-center">
                  <span style={{ fontSize: 22, fontWeight: FW.heavy, color: c.ink }}>{faDigits(answerRate)}٪</span>
                  <span style={{ fontSize: 9, color: c.muted }}>{faDigits(callsDone)} از {faDigits(callsThisWeek.length)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl" style={{ padding: SP.lg, ...glassLite(c, 20) }}>
              <p style={{ fontSize: 11, color: c.muted, fontWeight: 700 }}>بازدیدهای این هفته</p>
              <div className="flex items-end justify-between" style={{ marginTop: 10 }}>
                <div>
                  <span style={{ fontSize: 26, fontWeight: FW.heavy, color: c.ink }}>{faDigits(visitsThisWeek.length)}</span>
                  <p style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>هفته‌ی قبل: {faDigits(visitsPrevWeek.length)}</p>
                </div>
                <VerticalGauge value={visitsThisWeek.length} compare={visitsPrevWeek.length} color={c.primary} />
              </div>
            </div>

            <div className="rounded-2xl" style={{ padding: SP.lg, ...glassLite(c, 20) }}>
              <p style={{ fontSize: 11, color: c.muted, fontWeight: 700 }}>روند فعالیت روزانه</p>
              <div style={{ marginTop: 8 }}><TrendZigzag values={dayCounts} color={trendColor} width={132} height={44} /></div>
              <p style={{ fontSize: 11, fontWeight: 700, color: trendColor, marginTop: 4 }}>{trendLabel}</p>
            </div>

            <div className="rounded-2xl" style={{ padding: SP.lg, ...glassLite(c, 20) }}>
              <p style={{ fontSize: 11, color: c.muted, fontWeight: 700 }}>ترکیب فعالیت</p>
              <div className="flex w-full rounded-full overflow-hidden" style={{ height: 10, marginTop: 12 }}>
                {mix.map((m, i) => <div key={i} style={{ width: `${(m.value / mixTotal) * 100}%`, background: m.color }} />)}
              </div>
              <div className="flex flex-col" style={{ gap: 4, marginTop: 10 }}>
                {mix.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center" style={{ gap: 5, fontSize: 10, color: c.muted }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color }} />{m.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.ink }}>{faDigits(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deals — a small footer line, not another big card; closing a
              deal is rarer than a call/visit and doesn't need equal visual weight. */}
          <div className="flex items-center rounded-xl" style={{ gap: SP.sm, padding: SP.md, ...glassLite(c, RAD.md) }}>
            <Building2 size={14} color={c.success} />
            <span style={{ fontSize: 12, color: c.ink }}>{faDigits(dealsThisWeek.length)} قرارداد این هفته</span>
            <span style={{ flex: 1 }} />
            <Users size={14} color={c.primary} />
            <span style={{ fontSize: 12, color: c.ink }}>{faDigits(filesThisWeek.length)} فایل جدید</span>
            <span style={{ flex: 1 }} />
            <PhoneCall size={14} color={FLORA_GOLD} />
            <span style={{ fontSize: 12, color: c.ink }}>{faDigits(callsThisWeek.length)} تماس</span>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

export { WeeklyStatsTile, WeeklyStatsHome };
