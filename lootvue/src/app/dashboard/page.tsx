"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight, ArrowDownRight, Search, SlidersHorizontal,
  TrendingDown, ChevronRight, Clock, Briefcase, RefreshCw, Wifi,
  WifiOff, Building2, Target, ArrowRight, Check,
  Compass, Globe, ChevronDown, ChevronUp, Info, ShieldCheck, TrendingUp,
  HelpCircle, Landmark, BarChart3,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE,
  AiInsightCard, generateTimeSeries, fmtChartCurrency,
} from "@/components/charts/ChartTheme";

/* ═══════════════════════════════════════════════════════════════
   TYPES & HELPERS
   ═══════════════════════════════════════════════════════════════ */

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric",
});

interface RateApiResponse {
  data: {
    mortgage30yr: number | null;
    mortgage15yr: number | null;
    fedFunds: number | null;
    treasury10yr: number | null;
    mortgage30yrChange: number | null;
    spread: number | null;
    yieldCurve: "normal" | "flat" | "inverted" | null;
    rateDirection: "rising" | "stable" | "falling" | null;
    lastUpdated: string;
    sources: string[];
  };
  meta: { cached: boolean; freshness: string };
}

const STATS = [
  { label: "Portfolio Value", value: "$1.06M", trend: "+2.3%", up: true },
  { label: "Monthly Cash Flow", value: "+$1,140", trend: "+$80", up: true },
  { label: "Avg Cap Rate", value: "6.5%", trend: "-0.1%", up: false },
  { label: "Active Deals", value: "3", trend: "in pipeline", up: null },
];

const MARKETS = [
  { name: "Austin, TX", score: 87, cap: "5.8%", signal: "Buy", trend: "Tech hiring +12% YoY" },
  { name: "Raleigh, NC", score: 84, cap: "6.2%", signal: "Buy", trend: "Pop growth top-5 metro" },
  { name: "Tampa, FL", score: 79, cap: "6.5%", signal: "Hold", trend: "Insurance costs rising" },
  { name: "Phoenix, AZ", score: 76, cap: "5.9%", signal: "Hold", trend: "Supply catching demand" },
  { name: "Nashville, TN", score: 74, cap: "5.4%", signal: "Hold", trend: "Rent growth slowing" },
  { name: "Detroit, MI", score: 71, cap: "8.1%", signal: "Watch", trend: "High yield, high risk" },
];

const PIPELINE = [
  { address: "1847 Oak Valley Dr, Austin", price: "$385,000", score: 82, status: "Analyzing", days: 2 },
  { address: "920 Magnolia Ln, Raleigh", price: "$312,000", score: 78, status: "Offer Pending", days: 7 },
  { address: "4501 Bay Shore Blvd, Tampa", price: "$445,000", score: 74, status: "Due Diligence", days: 12 },
];

/* ── Heatmap data — derived from MARKETS + mocked columns ──────────── */

function signalStrength(signal: string): number {
  return signal === "Buy" ? 85 : signal === "Hold" ? 60 : 40;
}
function momentumScore(trend: string): number {
  const lower = trend.toLowerCase();
  if (lower.includes("+") || lower.includes("top") || lower.includes("hiring") || lower.includes("growth")) return 75;
  if (lower.includes("rising") || lower.includes("catching") || lower.includes("slowing")) return 40;
  return 50;
}

interface HeatCell { value: number; label: string }
interface HeatRow { market: string; cols: HeatCell[] }

const HEATMAP_COLS = ["Score", "Cap Rate", "Signal", "Momentum", "Risk"];

const HEATMAP_ROWS: HeatRow[] = MARKETS.map(m => {
  const capNum = parseFloat(m.cap);
  // Normalise cap rate 4–9% → 0–100
  const capScore = Math.min(100, Math.max(0, Math.round(((capNum - 4) / 5) * 100)));
  const sig = signalStrength(m.signal);
  const mom = momentumScore(m.trend);
  const risk = 100 - m.score;
  return {
    market: m.name,
    cols: [
      { value: m.score,  label: String(m.score) },
      { value: capScore, label: m.cap },
      { value: sig,      label: sig >= 80 ? "Strong" : sig >= 55 ? "Mod" : "Weak" },
      { value: mom,      label: mom >= 70 ? "High" : mom >= 45 ? "Mid" : "Low" },
      // Risk cell: invert colour scale (high risk = rose)
      { value: risk,     label: risk <= 25 ? "Low" : risk <= 40 ? "Mod" : "High" },
    ],
  };
});

// value is a 0–100 score where higher = better, EXCEPT for the Risk column
// where the stored value is already the raw risk number (100 - score) — higher = worse.
// isRisk=true flips the colour scale so that a high risk number maps to rose.
function heatColor(value: number, isRisk: boolean): string {
  if (isRisk) {
    // risk ≤ 20 → low risk (emerald), 21–30 → moderate (amber), > 30 → high (rose)
    if (value <= 20) return "bg-emerald-muted text-emerald-light";
    if (value <= 30) return "bg-amber-muted text-amber-light";
    return "bg-rose-muted text-rose-light";
  }
  if (value >= 75) return "bg-emerald-muted text-emerald-light";
  if (value >= 55) return "bg-amber-muted text-amber-light";
  return "bg-rose-muted text-rose-light";
}

/* ── Rate sparkline data (last 12 months, oldest→newest) ────────────── */
const RATE_SPARKLINE = [7.20, 7.15, 7.10, 7.08, 7.05, 7.02, 7.00, 6.98, 6.97, 6.96, 6.95, 6.95];

function RateSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const W = 56, H = 20;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-label={`30yr rate trend: ${(data[0] ?? 0).toFixed(2)}% to ${(data[data.length - 1] ?? 0).toFixed(2)}%`}
      className="inline-block align-middle"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#10B981"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Portfolio DSCR gauge (SVG semicircle) ──────────────────────────── */
const DSCR_VALUE = 1.28;

function DscrGauge({ value }: { value: number }) {
  // Semicircle: range 0.75–2.0 mapped to 0–180 deg sweep
  const MIN = 0.75, MAX = 2.0;
  const pct = Math.min(1, Math.max(0, (value - MIN) / (MAX - MIN)));
  const angleDeg = pct * 180;
  const R = 46, cx = 56, cy = 56;
  // SVG arc helper: sweep from 180° (left) to 0° (right)
  function polarToXY(deg: number): { x: number; y: number } {
    const rad = ((180 - deg) * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy - R * Math.sin(rad) };
  }
  const start = polarToXY(0);
  const end = polarToXY(angleDeg);
  const largeArc = angleDeg > 90 ? 1 : 0;

  const zoneColor =
    value >= 1.25 ? "#10B981" : value >= 1.0 ? "#F59E0B" : "#EF4444";

  return (
    <svg
      viewBox="0 0 112 64"
      width={112}
      height={64}
      aria-label={`Portfolio DSCR: ${value.toFixed(2)}x — ${value >= 1.25 ? "healthy" : value >= 1.0 ? "caution" : "stress"}`}
      role="img"
    >
      {/* Background arc */}
      <path
        d={`M ${polarToXY(0).x} ${polarToXY(0).y} A ${R} ${R} 0 0 1 ${polarToXY(180).x} ${polarToXY(180).y}`}
        fill="none"
        stroke="#1F1F1F"
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Zone arcs: rose 0–40 deg, amber 40–70, emerald 70–180 */}
      {/* Value arc */}
      {angleDeg > 0 && (
        <path
          d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke={zoneColor}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}
      {/* Needle dot */}
      <circle cx={end.x} cy={end.y} r={3.5} fill={zoneColor} />
      {/* Value label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#FAFAFA" fontSize={14} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
        {value.toFixed(2)}x
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fill="#666666" fontSize={8} fontFamily="Inter, sans-serif">
        DSCR
      </text>
      {/* Zone labels */}
      <text x={12} y={62} textAnchor="middle" fill="#EF4444" fontSize={7} fontFamily="Inter, sans-serif">&lt;1.0</text>
      <text x={56} y={12} textAnchor="middle" fill="#F59E0B" fontSize={7} fontFamily="Inter, sans-serif">1.25</text>
      <text x={100} y={62} textAnchor="middle" fill="#10B981" fontSize={7} fontFamily="Inter, sans-serif">&gt;1.5</text>
    </svg>
  );
}

/* ── Stress survival ring (SVG circle progress) ─────────────────────── */
function StressSurvivalRing({ survived, total }: { survived: number; total: number }) {
  const pct = survived / total;
  const R = 28, cx = 36, cy = 36;
  const circ = 2 * Math.PI * R;
  const dash = circ * pct;
  const color = pct >= 0.8 ? "#10B981" : pct >= 0.6 ? "#F59E0B" : "#EF4444";

  return (
    <svg
      viewBox="0 0 72 72"
      width={72}
      height={72}
      aria-label={`Stress test survival: ${survived} of ${total} scenarios passed`}
      role="img"
    >
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1F1F1F" strokeWidth={6} />
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#FAFAFA" fontSize={13} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
        {survived}/{total}
      </text>
      <text x={cx} y={cx + 8} textAnchor="middle" fill="#666666" fontSize={8} fontFamily="Inter, sans-serif">
        passed
      </text>
    </svg>
  );
}

/* ── Geographic diversification bars ────────────────────────────────── */
const GEO_ALLOC = [
  { market: "Austin", pct: 36, color: "#C9A227" },
  { market: "Raleigh", pct: 29, color: "#E8C547" },
  { market: "Tampa", pct: 23, color: "#10B981" },
  { market: "Nashville", pct: 11, color: "#666666" },
] as const;

/* ── Chart data (mock — replace with real portfolio API) ─────────────── */

const PORTFOLIO_TREND = generateTimeSeries(12, 980000, 15000, 0.03, 101);

// Monthly cash flow: base $1,140 with small noise, one negative month for realism
const CASH_FLOW_DATA: { month: string; value: number }[] = (() => {
  const base = generateTimeSeries(12, 1140, 320, 0.01, 77);
  return base.map((d, i) => ({
    month: d.month,
    // month 3 simulates a vacancy/repair hit
    value: i === 3 ? -420 : Math.round(d.value),
  }));
})();

/* ─────────────────────────────────────────────────────────────────────── */

function signalBadge(s: string) {
  return s === "Buy" ? "badge-emerald" : s === "Hold" ? "badge-amber" : "badge-gold";
}
function scoreClr(n: number) {
  return n >= 80 ? "text-emerald-light" : n >= 70 ? "text-amber-light" : "text-rose-light";
}
function statusBadge(s: string) {
  return s === "Analyzing" ? "badge-gold" : s === "Offer Pending" ? "badge-amber" : "badge-emerald";
}

/* ═══════════════════════════════════════════════════════════════
   ONBOARDING JOURNEY
   ═══════════════════════════════════════════════════════════════ */

const JOURNEY_STEPS = [
  {
    step: 1,
    title: "Analyze your first property",
    desc: "Paste any US address and get a full 12-engine analysis with AI verdict",
    icon: Search,
    href: "/dashboard/analyze",
    cta: "Analyze a Property",
    time: "10 seconds",
  },
  {
    step: 2,
    title: "Simulate different scenarios",
    desc: "Adjust hold period, rates, vacancy — see how each variable impacts your return",
    icon: SlidersHorizontal,
    href: "/dashboard/simulator",
    cta: "Open Simulator",
    time: "2 minutes",
  },
  {
    step: 3,
    title: "Explore a market",
    desc: "See which cities have the best cap rates, growth, and investment signals",
    icon: Globe,
    href: "/dashboard/markets",
    cta: "Explore Markets",
    time: "1 minute",
  },
  {
    step: 4,
    title: "Track your portfolio",
    desc: "Add properties you own or are watching to see performance and benchmarks",
    icon: Building2,
    href: "/dashboard/portfolio",
    cta: "Set Up Portfolio",
    time: "5 minutes",
  },
];

const QUICK_START_ACTIONS = [
  {
    label: "Analyze Property",
    stat: "12 engines, instant verdict",
    desc: "Paste an address, get a verdict in 10 seconds",
    icon: Search,
    href: "/dashboard/analyze",
    accent: "gold" as const,
  },
  {
    label: "Explore Markets",
    stat: "10 markets ranked live",
    desc: "Find the best cities for your investment goals",
    icon: Compass,
    href: "/dashboard/markets",
    accent: "emerald" as const,
  },
  {
    label: "Model a Deal",
    stat: "Monte Carlo, 10K+ iterations",
    desc: "DCF simulation with 20+ variables",
    icon: SlidersHorizontal,
    href: "/dashboard/simulator",
    accent: "gold" as const,
  },
  {
    label: "Check Rates",
    stat: "30yr at 6.95%, -0.03 today",
    desc: "Live rate environment from the Federal Reserve",
    icon: TrendingDown,
    href: "/dashboard/rates",
    accent: "emerald" as const,
  },
];

const ACCENT_BG = { gold: "bg-gold-muted", emerald: "bg-emerald-muted" };
const ACCENT_TEXT = { gold: "text-gold-light", emerald: "text-emerald-light" };

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO INTELLIGENCE CHART
   ═══════════════════════════════════════════════════════════════ */

const PI_METRIC_CONFIG = {
  value:     { label: "Portfolio Value",     color: "#C9A227",  unit: "$",   yAxis: "left",  fmt: (v: number) => `$${(v/1000).toFixed(0)}K`  },
  cashFlow:  { label: "Total Cash Flow",     color: "#10B981",  unit: "$/mo",yAxis: "left",  fmt: (v: number) => `$${v.toFixed(0)}/mo`        },
  capRate:   { label: "Avg Cap Rate",        color: "#F59E0B",  unit: "%",   yAxis: "right", fmt: (v: number) => `${v.toFixed(2)}%`           },
  dscr:      { label: "Avg DSCR",            color: "#8B5CF6",  unit: "x",   yAxis: "right", fmt: (v: number) => `${v.toFixed(2)}x`           },
  deals:     { label: "Active Deals",        color: "#06B6D4",  unit: "",    yAxis: "right", fmt: (v: number) => `${v.toFixed(0)}`            },
} as const;

type PiMetricKey = keyof typeof PI_METRIC_CONFIG;
const ALL_PI_METRICS = Object.keys(PI_METRIC_CONFIG) as PiMetricKey[];

type TimeFrame = "1m" | "3m" | "6m" | "1y" | "2y";

const TF_CONFIG: Record<TimeFrame, { label: string; months: number }> = {
  "1m": { label: "1M",  months: 1  },
  "3m": { label: "3M",  months: 3  },
  "6m": { label: "6M",  months: 6  },
  "1y": { label: "1Y",  months: 12 },
  "2y": { label: "2Y",  months: 24 },
};

/** Generate 24 months of deterministic multi-series portfolio data */
function generatePortfolioIntelligenceData() {
  const valueSeries   = generateTimeSeries(24, 920000,  14000, 0.025, 201);
  const cashFlowSeries= generateTimeSeries(24, 1020,    180,   0.005, 303);
  const capRateSeries = generateTimeSeries(24, 6.3,     0.08,  0.001, 404);
  const dscrSeries    = generateTimeSeries(24, 1.22,    0.03,  0.001, 505);
  const dealsSeries   = generateTimeSeries(24, 2,       0.3,   0.01,  606);

  return valueSeries.map((d, i) => ({
    month:    d.month,
    value:    Math.round(d.value),
    cashFlow: Math.round(cashFlowSeries[i]?.value ?? 1020),
    capRate:  Math.max(3, Math.round((capRateSeries[i]?.value ?? 6.3) * 100) / 100),
    dscr:     Math.max(0.8, Math.round((dscrSeries[i]?.value ?? 1.22) * 100) / 100),
    deals:    Math.max(1, Math.round(Math.abs(dealsSeries[i]?.value ?? 2))),
  }));
}

const ALL_PI_DATA = generatePortfolioIntelligenceData();

interface PiTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  visible: Set<PiMetricKey>;
}

function PiTooltip({ active, payload, label, visible }: PiTooltipProps) {
  if (!active || !payload?.length) return null;
  const filtered = payload.filter(p => visible.has(p.dataKey as PiMetricKey));
  if (!filtered.length) return null;

  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 6, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      {filtered.map(p => {
        const cfg = PI_METRIC_CONFIG[p.dataKey as PiMetricKey];
        if (!cfg) return null;
        return (
          <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>{cfg.label}:</span>
            <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
              {cfg.fmt(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PortfolioIntelligenceChart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1y");
  const [visibleMetrics, setVisibleMetrics] = useState<Set<PiMetricKey>>(
    new Set<PiMetricKey>(["value", "cashFlow", "capRate"])
  );

  function toggleMetric(key: PiMetricKey) {
    setVisibleMetrics(prev => {
      if (prev.has(key) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const { months } = TF_CONFIG[timeFrame];
  const slicedData = ALL_PI_DATA.slice(-months);

  // Determine which Y-axes are needed
  const needsLeft  = ALL_PI_METRICS.some(k => visibleMetrics.has(k) && PI_METRIC_CONFIG[k].yAxis === "left");
  const needsRight = ALL_PI_METRICS.some(k => visibleMetrics.has(k) && PI_METRIC_CONFIG[k].yAxis === "right");

  // Compute delta for each visible metric (last vs first in the slice)
  function metricDelta(key: PiMetricKey): { pct: number; up: boolean } | null {
    const first = slicedData[0]?.[key] as number | undefined;
    const last  = slicedData[slicedData.length - 1]?.[key] as number | undefined;
    if (first == null || last == null || first === 0) return null;
    const pct = ((last - first) / Math.abs(first)) * 100;
    return { pct: Math.abs(pct), up: pct >= 0 };
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-content-primary">
              Portfolio <span className="text-gold-light">Intelligence</span>
            </h2>
            <p className="text-[11px] text-content-tertiary mt-0.5">Multi-metric view across time</p>
          </div>
        </div>

        {/* Time frame selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-elevated border border-surface-border">
          {(Object.keys(TF_CONFIG) as TimeFrame[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                timeFrame === tf
                  ? "bg-gold-muted text-gold-light"
                  : "text-content-disabled hover:text-content-tertiary"
              }`}
              aria-pressed={timeFrame === tf}
            >
              {TF_CONFIG[tf].label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric toggle pills + delta badges */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Toggle portfolio metrics">
        {ALL_PI_METRICS.map(key => {
          const cfg = PI_METRIC_CONFIG[key];
          const active = visibleMetrics.has(key);
          const delta = metricDelta(key);
          return (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                active
                  ? "border-transparent text-black"
                  : "border-surface-border text-content-disabled bg-transparent hover:border-white/20 hover:text-content-tertiary"
              }`}
              style={active ? { backgroundColor: cfg.color } : {}}
              aria-pressed={active}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? "rgba(0,0,0,0.35)" : cfg.color }}
                aria-hidden="true"
              />
              {cfg.label}
              {active && delta && (
                <span className="ml-0.5 text-[9px] font-mono opacity-75">
                  {delta.up ? "+" : "-"}{delta.pct.toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {slicedData.length === 0 ? (
        <div className="flex items-center justify-center h-[350px] text-content-tertiary text-sm">
          No data for selected time frame
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={slicedData} margin={{ top: 8, right: needsRight ? 56 : 8, left: needsLeft ? 0 : 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={false} />
            <XAxis
              dataKey="month"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              interval={Math.max(0, Math.floor(slicedData.length / 8) - 1)}
            />
            {/* Left Y-axis: $ metrics */}
            {needsLeft && (
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`}
                width={56}
              />
            )}
            {/* Right Y-axis: % and ratio metrics */}
            {needsRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                width={40}
              />
            )}
            <Tooltip
              content={(props) => (
                <PiTooltip
                  active={props.active}
                  payload={props.payload as PiTooltipProps["payload"]}
                  label={props.label as string}
                  visible={visibleMetrics}
                />
              )}
            />
            {ALL_PI_METRICS.map(key => {
              if (!visibleMetrics.has(key)) return null;
              const cfg = PI_METRIC_CONFIG[key];
              const yAxisId = cfg.yAxis === "left" ? (needsLeft ? "left" : "right") : (needsRight ? "right" : "left");
              return (
                <Line
                  key={key}
                  yAxisId={yAxisId}
                  type="monotone"
                  dataKey={key}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: cfg.color, stroke: "#111111" }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-surface-border">
        {ALL_PI_METRICS.filter(k => visibleMetrics.has(k)).map(key => {
          const cfg = PI_METRIC_CONFIG[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-6 h-px" style={{ backgroundColor: cfg.color, display: "inline-block" }} aria-hidden="true" />
              <span className="text-[10px] text-content-tertiary">{cfg.label}</span>
            </div>
          );
        })}
        <span className="ml-auto text-[9px] text-content-disabled">Mock data · replace with portfolio API</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RATE ENVIRONMENT (real data from FRED)
   ═══════════════════════════════════════════════════════════════ */

function RateEnvironment() {
  const [rates, setRates] = useState<RateApiResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rates/current");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to fetch rates" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: RateApiResponse = await res.json();
      setRates(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const m30 = rates?.mortgage30yr ?? null;
  const ff = rates?.fedFunds ?? null;
  const spread = rates?.spread ?? null;
  const yieldCurve = rates?.yieldCurve ?? null;
  const rateChange = rates?.mortgage30yrChange ?? null;
  const isLive = !error && rates !== null;

  const yieldCurveLabel = yieldCurve === "inverted" ? "Inverted" : yieldCurve === "flat" ? "Flat" : "Normal";
  const yieldCurveBadge = yieldCurve === "inverted" ? "badge-rose" : yieldCurve === "flat" ? "badge-amber" : "badge-emerald";
  const spreadLabel = spread != null && spread > 2.5 ? "Wide" : spread != null && spread < 1.5 ? "Tight" : "Normal";
  const spreadBadge = spreadLabel === "Wide" ? "badge-amber" : spreadLabel === "Tight" ? "badge-emerald" : "badge-gold";
  const lastUpdatedLabel = rates?.lastUpdated
    ? (() => {
        const diff = Date.now() - new Date(rates.lastUpdated).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "just now";
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
      })()
    : null;

  return (
    <div className="lg:col-span-2 card flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-content-primary">
          Rate <span className="text-gold-light">Environment</span>
        </h2>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-light"><Wifi className="w-3 h-3" /> Live</span>
          ) : error ? (
            <span className="flex items-center gap-1 text-[10px] text-content-disabled"><WifiOff className="w-3 h-3" /> Offline</span>
          ) : null}
          <Link href="/dashboard/rates" className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5">
            Details <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-20 skeleton" />
              <div className="h-4 w-16 skeleton" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">30yr Fixed</span>
            <div className="flex items-center gap-2">
              <RateSparkline data={RATE_SPARKLINE} />
              <span className="font-mono font-semibold text-content-primary text-[15px]">
                {m30 !== null ? `${m30.toFixed(2)}%` : "N/A"}
              </span>
              {rateChange !== null && rateChange !== 0 && (
                <span className={`flex items-center gap-0.5 ${rateChange < 0 ? "metric-trend-down" : "metric-trend-up"}`}>
                  {rateChange < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {rateChange > 0 ? "+" : ""}{rateChange.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Fed Funds</span>
            <span className="font-mono font-semibold text-content-primary text-[15px]">
              {ff !== null ? `${ff.toFixed(2)}%` : "N/A"}
            </span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Yield Curve</span>
            <span className={yieldCurve ? yieldCurveBadge : "text-content-disabled text-xs"}>
              {yieldCurve ? yieldCurveLabel : "N/A"}
            </span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Spread</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-content-primary text-[15px]">
                {spread !== null ? `${spread.toFixed(2)}%` : "N/A"}
              </span>
              {spread !== null && <span className={spreadBadge}>{spreadLabel}</span>}
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
        {isLive && lastUpdatedLabel ? (
          <p className="text-[10px] text-content-disabled flex items-center gap-1">Source: FRED &middot; Updated {lastUpdatedLabel}</p>
        ) : error ? (
          <p className="text-[10px] text-amber-light">{error.includes("FRED_API_KEY") ? "Add FRED_API_KEY to .env.local for live rates" : error}</p>
        ) : (
          <p className="text-xs text-content-tertiary">Rates stable — focus on deal quality over rate timing.</p>
        )}
        {!loading && (
          <button onClick={fetchRates} className="p-1 rounded hover:bg-white/[0.05] transition-colors" title="Refresh rates">
            <RefreshCw className="w-3 h-3 text-content-disabled" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   SIMPLE MODE — Guided Workflow Cards
   ═══════════════════════════════════════════════════════════════ */

const WORKFLOW_MISSIONS = [
  {
    question: "Is This Property Worth It?",
    desc: "Enter any address and get a plain English verdict with actionable next steps.",
    href: "/dashboard/analyze",
    icon: Search,
    accent: "gold" as const,
    time: "30 seconds",
  },
  {
    question: "Where Should I Invest?",
    desc: "See which cities have the strongest fundamentals for your strategy.",
    href: "/dashboard/markets",
    icon: Globe,
    accent: "emerald" as const,
    time: "2 minutes",
  },
  {
    question: "Compare My Options",
    desc: "Put deals side-by-side and see which one wins on the numbers.",
    href: "/dashboard/compare",
    icon: BarChart3,
    accent: "gold" as const,
    time: "1 minute",
  },
  {
    question: "Will This Deal Survive?",
    desc: "Stress test with rate shocks, vacancy spikes, and rent declines.",
    href: "/dashboard/simulator",
    icon: SlidersHorizontal,
    accent: "emerald" as const,
    time: "3 minutes",
  },
  {
    question: "How Do I Pay For This?",
    desc: "Match with lenders and see what your monthly payment looks like.",
    href: "/dashboard/lending",
    icon: Landmark,
    accent: "gold" as const,
    time: "2 minutes",
  },
  {
    question: "Track My Portfolio",
    desc: "Monitor performance, cash flow, and risk across all your properties.",
    href: "/dashboard/portfolio",
    icon: Building2,
    accent: "emerald" as const,
    time: "5 minutes",
  },
];

function SimpleModeDashboard() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-content-primary">{getGreeting()}</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          What do you want to figure out today? Pick a mission below.
        </p>
      </div>

      {/* Workflow mission cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKFLOW_MISSIONS.map(m => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="card-glass group relative overflow-hidden transition-all duration-300 hover:border-gold/20 hover:shadow-[0_0_30px_-8px_rgba(201,162,39,0.15)]"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  m.accent === "gold" ? "bg-gold-muted" : "bg-emerald-muted"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    m.accent === "gold" ? "text-gold-light" : "text-emerald-light"
                  }`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-content-primary group-hover:text-gold-light transition-colors leading-snug">
                    {m.question}
                  </h3>
                  <p className="text-[12px] text-content-tertiary mt-1 leading-relaxed">
                    {m.desc}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-[11px] text-content-disabled">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    <span>{m.time}</span>
                    <ArrowRight className="w-3 h-3 ml-auto text-gold/40 group-hover:text-gold-light group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick tip */}
      <div className="card border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-gold-light" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-content-primary">New to real estate investing?</h3>
            <p className="text-[12px] text-content-tertiary mt-1 leading-relaxed">
              Start with &quot;Is This Property Worth It?&quot; — paste any US address and we&apos;ll break down
              the numbers in plain English. No jargon, no spreadsheets. Every metric includes a &quot;so what?&quot; explanation.
            </p>
            <Link
              href="/dashboard/analyze"
              className="inline-flex items-center gap-1 mt-2 text-[12px] text-gold-light hover:text-gold transition-colors"
            >
              Analyze your first property <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const appMode = useUIStore((state) => state.appMode);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showWhatIsLootVue, setShowWhatIsLootVue] = useState(false);

  // Check onboarding state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lootvue-onboarding");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCompletedSteps(parsed.completed || []);
        setShowOnboarding(!parsed.dismissed);
      } catch {
        // ignore
      }
    }
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("lootvue-onboarding", JSON.stringify({ completed: completedSteps, dismissed: true }));
  };

  const isNewUser = completedSteps.length === 0;

  /* ── Simple mode: show guided workflow cards ── */
  if (appMode === "simple") {
    return <SimpleModeDashboard />;
  }

  /* ── Advanced mode: full dashboard (existing) ── */
  return (
    <div className="animate-fade-in space-y-6">

      {/* ──── Greeting ──── */}
      <div>
        <h1 className="text-xl font-semibold text-content-primary">{getGreeting()}</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          {today} &mdash; You have <span className="text-content-primary font-medium">3 deals</span> in your pipeline and <span className="text-emerald-light font-medium">2 markets trending up</span>. Here&apos;s what needs attention.
        </p>
      </div>

      {/* ──── Onboarding Journey (new users) ──── */}
      {showOnboarding && (
        <div className="card-gold relative">
          <button
            onClick={dismissOnboarding}
            className="absolute top-4 right-4 text-[11px] text-content-disabled hover:text-content-secondary transition-colors"
          >
            Dismiss
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isNewUser ? "Your investment journey starts here" : "Continue your journey"}
              </h2>
              <p className="text-xs text-content-tertiary mt-0.5">
                {completedSteps.length} of {JOURNEY_STEPS.length} steps complete
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/[0.06] rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-gold rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps.length / JOURNEY_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {JOURNEY_STEPS.map(s => {
              const completed = completedSteps.includes(s.step);
              const Icon = s.icon;
              return (
                <Link
                  key={s.step}
                  href={s.href}
                  className={`relative p-4 rounded-xl border transition-all group ${
                    completed
                      ? "border-emerald/20 bg-emerald-muted/20"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-gold/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      completed ? "bg-emerald-muted" : "bg-gold-muted"
                    }`}>
                      {completed ? (
                        <Check className="w-4 h-4 text-emerald-light" />
                      ) : (
                        <Icon className="w-4 h-4 text-gold-light" />
                      )}
                    </div>
                    <span className="text-[10px] text-content-disabled font-mono">{s.time}</span>
                  </div>
                  <h3 className={`text-[13px] font-semibold mb-1 ${completed ? "text-emerald-light" : "text-white"}`}>
                    {completed ? `\u2713 ${s.title}` : s.title}
                  </h3>
                  <p className="text-[11px] text-content-tertiary leading-relaxed">{s.desc}</p>
                  {!completed && (
                    <div className="flex items-center gap-1 mt-3 text-[11px] text-gold-light opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{s.cta}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ──── Quick Actions ──── */}
      <div>
        <h2 className="text-sm font-semibold text-content-primary mb-3">
          {isNewUser ? "Start here" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_START_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="card-hover flex flex-col gap-3 p-4 group"
              >
                <div className={`w-9 h-9 rounded-lg ${ACCENT_BG[a.accent]} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${ACCENT_TEXT[a.accent]}`} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-content-primary group-hover:text-gold-light transition-colors">{a.label}</div>
                  <div className={`text-[11px] font-mono font-medium mt-0.5 ${ACCENT_TEXT[a.accent]}`}>{a.stat}</div>
                  <div className="text-[11px] text-content-disabled mt-0.5 leading-relaxed">{a.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ──── What is LootVue? (first-time users) ──── */}
      {isNewUser && (
        <div className="card border-white/[0.06]">
          <button
            onClick={() => setShowWhatIsLootVue(v => !v)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={showWhatIsLootVue}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-content-primary">What is LootVue?</span>
            </div>
            {showWhatIsLootVue
              ? <ChevronUp className="w-4 h-4 text-content-tertiary shrink-0" aria-hidden="true" />
              : <ChevronDown className="w-4 h-4 text-content-tertiary shrink-0" aria-hidden="true" />
            }
          </button>
          {showWhatIsLootVue && (
            <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
              <p className="text-[13px] text-content-secondary leading-relaxed">
                LootVue is your institutional-grade real estate intelligence platform. It runs{" "}
                <span className="text-content-primary font-medium">12 analysis engines</span>,{" "}
                <span className="text-content-primary font-medium">Monte Carlo simulations</span>, and{" "}
                <span className="text-content-primary font-medium">AI-powered market research</span>{" "}
                on any US property &mdash; the same depth Wall Street firms pay $24K/year for, at a fraction of the cost.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "12 Engines", desc: "Financial, risk, market, comps, DCF, Monte Carlo — all at once" },
                  { label: "Institutional Depth", desc: "Same signals Blackstone and Starwood use to underwrite deals" },
                  { label: "Same Depth. Fraction of the Cost.", desc: "CoStar costs $15K/yr. Bloomberg $24K/yr. LootVue doesn't." },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[12px] font-semibold text-gold-light mb-1">{item.label}</div>
                    <div className="text-[11px] text-content-tertiary leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-content-disabled">
                Start by analyzing a property below. You&apos;ll get a score, a verdict, and a breakdown of every engine&apos;s output in under 10 seconds.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ──── Portfolio Stats (returning users) ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s, i) => (
          <div key={s.label} className={`card-glass ${i === 0 ? "glow-gold" : i === 1 ? "glow-emerald" : ""}`}>
            <div className="metric-label mb-1.5">{s.label}</div>
            <div className="metric-value text-xl">{s.value}</div>
            {s.up !== null ? (
              <div className={`flex items-center gap-1 mt-1 ${s.up ? "metric-trend-up" : "metric-trend-down"}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{s.trend}</span>
              </div>
            ) : (
              <div className="text-xs text-content-tertiary mt-1 font-mono">{s.trend}</div>
            )}
          </div>
        ))}
      </div>

      {/* ──── Portfolio Trend + Cash Flow Charts ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Portfolio Value Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-content-primary">
                Portfolio <span className="text-gold-light">Value Trend</span>
              </h2>
              <p className="text-[11px] text-content-tertiary mt-0.5">12-month history</p>
            </div>
            <Link
              href="/dashboard/portfolio"
              className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5"
            >
              Details <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={PORTFOLIO_TREND} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray={GRID_STYLE.strokeDasharray}
                stroke={GRID_STYLE.stroke}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={2}
              />
              <YAxis
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={fmtChartCurrency}
                width={56}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: CHART_COLORS.text, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                formatter={(v: number) => [
                  <span key="v" style={{ color: CHART_COLORS.gold, fontFamily: "JetBrains Mono, monospace", fontWeight: 600, fontSize: 13 }}>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)}
                  </span>,
                  "Portfolio Value",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                fill="url(#portfolioGradient)"
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: CHART_COLORS.surface }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Cash Flow */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-content-primary">
                Monthly <span className="text-emerald-light">Cash Flow</span>
              </h2>
              <p className="text-[11px] text-content-tertiary mt-0.5">Net cash flow per month</p>
            </div>
            <Link
              href="/dashboard/portfolio"
              className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5"
            >
              Details <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CASH_FLOW_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray={GRID_STYLE.strokeDasharray}
                stroke={GRID_STYLE.stroke}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={2}
              />
              <YAxis
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={fmtChartCurrency}
                width={56}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: CHART_COLORS.text, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                formatter={(v: number) => {
                  const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(Math.abs(v));
                  const display = v < 0 ? `(${formatted})` : formatted;
                  const color = v < 0 ? CHART_COLORS.rose : CHART_COLORS.emerald;
                  return [
                    <span key="v" style={{ color, fontFamily: "JetBrains Mono, monospace", fontWeight: 600, fontSize: 13 }}>
                      {display}
                    </span>,
                    "Net Cash Flow",
                  ];
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {CASH_FLOW_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value < 0 ? CHART_COLORS.rose : CHART_COLORS.emerald}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ──── Portfolio Intelligence ──── */}
      <PortfolioIntelligenceChart />

      {/* ──── Market Rankings + Rate Environment ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-content-primary">
              Market <span className="text-gold-light">Rankings</span>
            </h2>
            <Link href="/dashboard/markets" className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-gold-dark text-[11px] uppercase tracking-wider">
                  <th className="text-left font-medium pb-2 pr-4">Market</th>
                  <th className="text-right font-medium pb-2 px-3">Score</th>
                  <th className="text-right font-medium pb-2 px-3">Cap Rate</th>
                  <th className="text-center font-medium pb-2 px-3">Signal</th>
                  <th className="text-left font-medium pb-2 pl-3 hidden sm:table-cell">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {MARKETS.map(m => (
                  <tr key={m.name} className="hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="py-2.5 pr-4 font-medium text-content-primary whitespace-nowrap">{m.name}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-semibold ${scoreClr(m.score)}`}>{m.score}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary">{m.cap}</td>
                    <td className="py-2.5 px-3 text-center"><span className={signalBadge(m.signal)}>{m.signal}</span></td>
                    <td className="py-2.5 pl-3 text-content-tertiary text-xs hidden sm:table-cell">{m.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <RateEnvironment />
      </div>

      {/* ──── Market Momentum Matrix ──── */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-content-primary">
              Market <span className="text-gold-light">Momentum Matrix</span>
            </h2>
            <p className="text-[11px] text-content-tertiary mt-0.5">6 markets × 5 signals — color coded by strength</p>
          </div>
          <Link href="/dashboard/markets" className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5">
            Full Report <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="min-w-[480px]">
          {/* Header row */}
          <div className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: "140px repeat(5, 1fr)" }}>
            <div />
            {HEATMAP_COLS.map(col => (
              <div key={col} className="section-label text-center px-1">{col}</div>
            ))}
          </div>

          {/* Data rows */}
          <div className="space-y-1.5">
            {HEATMAP_ROWS.map(row => (
              <div
                key={row.market}
                className="grid gap-1.5 items-center"
                style={{ gridTemplateColumns: "140px repeat(5, 1fr)" }}
              >
                <span className="text-[12px] text-content-secondary font-medium truncate pr-2">{row.market}</span>
                {row.cols.map((cell, ci) => (
                  <div
                    key={ci}
                    className={`rounded-md text-center py-1.5 text-[11px] font-mono font-semibold ${heatColor(cell.value, ci === 4)}`}
                    title={`${HEATMAP_COLS[ci]}: ${cell.label} (raw score ${cell.value})`}
                  >
                    {cell.label}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-border">
            <span className="section-label">Legend</span>
            {[
              { cls: "bg-emerald-muted text-emerald-light", label: "Strong" },
              { cls: "bg-amber-muted text-amber-light",  label: "Neutral" },
              { cls: "bg-rose-muted text-rose-light",    label: "Weak" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${l.cls.split(" ")[0]}`} />
                <span className="text-[11px] text-content-tertiary">{l.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] text-content-disabled">Risk column: lower is better</span>
          </div>
        </div>
      </div>

      {/* ──── Pipeline + AI Insight ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-content-primary">
              Recent <span className="text-gold-light">Pipeline</span>
            </h2>
            <Link href="/dashboard/pipeline" className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5">
              View Pipeline <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {PIPELINE.length > 0 ? (
            <div className="space-y-2">
              {PIPELINE.map(d => (
                <div key={d.address} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-content-primary truncate">{d.address}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-content-secondary">{d.price}</span>
                      <span className="text-content-disabled">&middot;</span>
                      <span className={`font-mono text-xs font-semibold ${scoreClr(d.score)}`}>{d.score}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={statusBadge(d.status)}>{d.status}</span>
                    <span className="text-[11px] text-content-disabled flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />{d.days}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase className="w-8 h-8 text-content-disabled mb-2" />
              <p className="text-sm text-content-tertiary mb-1">No deals in your pipeline yet</p>
              <p className="text-xs text-content-disabled mb-3">Analyze a property to start building your pipeline</p>
              <Link href="/dashboard/analyze" className="btn-primary btn-sm">
                Analyze Your First Deal <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* AI Insight card */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <AiInsightCard title="Today's Briefing" className="flex-1">
            <p className="mb-3">
              The 30yr fixed rate has held{" "}
              <span className="text-emerald-light font-medium">stable</span> this week,
              compressing the mortgage-Treasury spread to 2.1% — historically favorable for acquisition financing.
              Cap rate expansion in Sun Belt metros continues to outpace the national average.
            </p>
            <p className="mb-3">
              <span className="text-gold-light font-medium">Austin</span> and{" "}
              <span className="text-gold-light font-medium">Raleigh</span> carry the strongest
              consensus scores (87 and 84) driven by tech-sector hiring momentum. Insurance
              headwinds in <span className="text-amber-light font-medium">Tampa</span> are
              compressing effective yields — underwrite carefully.
            </p>
            <p>
              <span className="text-white font-medium">Portfolio signal:</span> Your 3 active
              pipeline deals average a score of <span className="text-emerald-light font-medium">78</span>.
              The offer-pending deal in Raleigh is approaching a 7-day decision window —
              prioritize your due diligence checklist.
            </p>
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <Link
                href="/dashboard/analyze"
                className="text-xs text-gold-light hover:text-gold transition-colors flex items-center gap-0.5"
              >
                Act on this <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </AiInsightCard>
        </div>
      </div>

      {/* ──── Risk Dashboard ──── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">Risk Dashboard</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Card 1: DSCR Gauge */}
          <div className="card flex flex-col items-center py-4">
            <span className="section-label mb-3">Portfolio DSCR</span>
            <DscrGauge value={DSCR_VALUE} />
            <div className="mt-3 flex gap-3 text-[10px] text-center">
              <div>
                <div className="text-rose-light font-mono font-semibold">&lt;1.0</div>
                <div className="text-content-disabled mt-0.5">Stress</div>
              </div>
              <div>
                <div className="text-amber-light font-mono font-semibold">1.0–1.25</div>
                <div className="text-content-disabled mt-0.5">Caution</div>
              </div>
              <div>
                <div className="text-emerald-light font-mono font-semibold">&gt;1.25</div>
                <div className="text-content-disabled mt-0.5">Healthy</div>
              </div>
            </div>
            <p className="text-[10px] text-content-disabled mt-2 text-center">
              Weighted avg across 4 properties
            </p>
          </div>

          {/* Card 2: Stress Test Survival */}
          <div className="card flex flex-col items-center py-4">
            <span className="section-label mb-3">Stress Test Survival</span>
            <StressSurvivalRing survived={4} total={6} />
            <div className="mt-3 w-full space-y-1.5 px-2">
              {[
                { scenario: "+200bps rate shock", passed: true },
                { scenario: "2× vacancy spike", passed: true },
                { scenario: "Rent −10%", passed: true },
                { scenario: "Rent −20%", passed: true },
                { scenario: "Rate +200bps + vacancy", passed: false },
                { scenario: "Severe downturn", passed: false },
              ].map(s => (
                <div key={s.scenario} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.passed ? "bg-emerald-light" : "bg-rose-light"}`} aria-hidden="true" />
                  <span className="text-[11px] text-content-secondary flex-1 truncate">{s.scenario}</span>
                  <span className={`text-[10px] font-mono font-semibold ${s.passed ? "text-emerald-light" : "text-rose-light"}`}>
                    {s.passed ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Geographic Diversification */}
          <div className="card flex flex-col py-4">
            <span className="section-label mb-3">Geographic Diversification</span>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-4">
                <div className="metric-value text-xl">{GEO_ALLOC.length}</div>
                <div className="text-[11px] text-content-tertiary mt-0.5">markets · 4 properties</div>
              </div>
              <div className="space-y-2.5 px-1">
                {GEO_ALLOC.map(g => (
                  <div key={g.market}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-content-secondary">{g.market}</span>
                      <span className="text-[11px] font-mono font-semibold text-content-primary">{g.pct}%</span>
                    </div>
                    <div
                      className="h-1.5 bg-surface-elevated rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={g.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${g.market}: ${g.pct}%`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${g.pct}%`, backgroundColor: g.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-content-disabled mt-4 text-center">
                By portfolio value allocation
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
