"use client";

import { useState, useEffect } from "react";
import {
  ArrowDown, ArrowUp, Minus, TrendingDown, Bell, CheckCircle, Home, RefreshCw,
  Wallet, Tag, Info, ChevronRight, ArrowRight, Wifi, TrendingUp, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  CHART_COLORS, AXIS_STYLE, GRID_STYLE,
  AiInsightCard, generateTimeSeries, fmtChartPct,
  ChartTooltipContent,
} from "@/components/charts/ChartTheme";
import { AiInsight } from "@/components/shared/AiInsight";
import { Term } from "@/components/shared/Term";

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Dir = "down" | "up" | "flat";
type Signal = "favorable" | "neutral" | "unfavorable";
type Rate = { label: string; rate: number; change: number; dir: Dir; sparkline: number[] };
type Condition = { text: string; signal: Signal };
type Scenario = { title: string; icon: typeof Home; action: string; actionColor: string; lines: string[] };
type Spread = { title: string; current: number; baseline: number; baselineLabel: string; interpretation: string; signal: Signal };

// ─── FALLBACK DATA — overridden by live FRED data when available ────────────
const FALLBACK_MORTGAGE: Rate[] = [
  { label: "30-Year Fixed",  rate: 6.95,  change: -0.03, dir: "down",  sparkline: [7.20,7.18,7.15,7.12,7.10,7.08,7.05,7.02,7.00,6.98,6.97,6.95] },
  { label: "15-Year Fixed",  rate: 6.38,  change: -0.02, dir: "down",  sparkline: [6.55,6.52,6.50,6.48,6.45,6.42,6.40,6.40,6.39,6.38,6.38,6.38] },
  { label: "5/1 ARM",        rate: 6.12,  change: 0,     dir: "flat",  sparkline: [6.30,6.28,6.25,6.20,6.18,6.15,6.14,6.13,6.12,6.12,6.12,6.12] },
  { label: "FHA 30-Year",    rate: 6.65,  change: -0.03, dir: "down",  sparkline: [6.90,6.88,6.85,6.82,6.80,6.78,6.75,6.72,6.70,6.68,6.67,6.65] },
  { label: "VA 30-Year",     rate: 6.45,  change: -0.03, dir: "down",  sparkline: [6.70,6.68,6.65,6.62,6.60,6.58,6.55,6.52,6.50,6.48,6.47,6.45] },
  { label: "DSCR Loan",      rate: 7.85,  change: 0,     dir: "flat",  sparkline: [8.10,8.05,8.00,7.95,7.92,7.90,7.88,7.88,7.86,7.85,7.85,7.85] },
  { label: "Hard Money",     rate: 11.50, change: 0,     dir: "flat",  sparkline: [12.0,12.0,11.8,11.8,11.5,11.5,11.5,11.5,11.5,11.5,11.5,11.5] },
  { label: "Commercial",     rate: 7.25,  change: 0.05,  dir: "up",    sparkline: [7.10,7.10,7.12,7.15,7.15,7.18,7.20,7.20,7.22,7.22,7.25,7.25] },
];

const FALLBACK_MACRO: Rate[] = [
  { label: "Fed Funds",      rate: 4.75,  change: 0,     dir: "flat",  sparkline: [5.25,5.25,5.00,5.00,5.00,4.75,4.75,4.75,4.75,4.75,4.75,4.75] },
  { label: "CPI (YoY)",      rate: 3.10,  change: -0.10, dir: "down",  sparkline: [3.70,3.60,3.50,3.40,3.40,3.30,3.30,3.20,3.20,3.10,3.10,3.10] },
  { label: "10yr Treasury",  rate: 4.28,  change: -0.02, dir: "down",  sparkline: [4.50,4.48,4.45,4.42,4.40,4.38,4.35,4.32,4.30,4.30,4.28,4.28] },
  { label: "2yr Treasury",   rate: 4.15,  change: -0.01, dir: "down",  sparkline: [4.40,4.38,4.35,4.32,4.30,4.28,4.25,4.22,4.20,4.18,4.15,4.15] },
];

const CONDITIONS: Condition[] = [
  { text: "The Fed held rates steady at 4.75%. Markets price in 2 cuts over the next 12 months.", signal: "favorable" },
  { text: "Inflation at 3.1% \u2014 above the 2% target but declining. The Fed stays cautious.", signal: "neutral" },
  { text: "Yield curve is normal (10yr > 2yr by 13bps). Recession probability: LOW.", signal: "favorable" },
  { text: "Mortgage-to-Fed spread at 2.20% \u2014 NORMAL range. Banks are lending competitively.", signal: "neutral" },
];

const SCENARIOS: Scenario[] = [
  {
    title: "Buying a new property?",
    icon: Home,
    action: "LOCK RATE",
    actionColor: "badge-emerald",
    lines: [
      "Rate environment: FAVORABLE \u2014 rates stable with downward bias.",
      "Lock your rate within 30 days of closing.",
      "Don't float \u2014 the savings from waiting are minimal.",
    ],
  },
  {
    title: "Refinancing existing property?",
    icon: RefreshCw,
    action: "WAIT",
    actionColor: "badge-amber",
    lines: [
      "Current avg portfolio rate: 7.25% | Today's best: 6.95%",
      "Savings: $52/mo per $100K of loan. Break-even: 14 months.",
      "Rates likely to drop further. Set alert at 6.50% for optimal refi window.",
    ],
  },
  {
    title: "Holding and cash flowing?",
    icon: Wallet,
    action: "HOLD",
    actionColor: "badge-emerald",
    lines: [
      "Underwritten at 7.5% avg \u2014 current rates are BELOW that.",
      "Your deals are performing BETTER than projected.",
      "Hold position. Cash flow has upside from rate spread.",
    ],
  },
  {
    title: "Selling a property?",
    icon: Tag,
    action: "LIST NOW",
    actionColor: "badge-gold",
    lines: [
      "Lower rates = more qualified buyers = higher sale price.",
      "Rate trend: Stable with downward bias.",
      "List now \u2014 the buyer pool is expanding.",
    ],
  },
];

const SPREADS: Spread[] = [
  {
    title: "Mortgage vs Fed Funds Spread",
    current: 2.20,
    baseline: 1.70,
    baselineLabel: "Historical Avg",
    interpretation: "Banks are adding extra margin. Rates can drop WITHOUT a Fed cut.",
    signal: "neutral",
  },
  {
    title: "Cap Rate vs Mortgage Rate",
    current: -0.45,
    baseline: 0,
    baselineLabel: "Breakeven",
    interpretation: "Negative leverage. Deals only work with appreciation or below-market pricing.",
    signal: "unfavorable",
  },
  {
    title: "Yield Curve (10yr - 2yr)",
    current: 0.13,
    baseline: 0,
    baselineLabel: "Inversion Line",
    interpretation: "Normal curve = economy expected to grow. No recession signal.",
    signal: "favorable",
  },
];

const TIMELINE = [
  { label: "6 months ago",  value: "7.20%", note: "30yr was 25bps higher" },
  { label: "Today",         value: "6.95%", note: "Dropped 0.25% over 6 months" },
  { label: "6-month fwd",   value: "6.60\u20136.80%", note: "Market expects continued easing" },
  { label: "12-month fwd",  value: "6.25\u20136.50%", note: "2 Fed cuts priced in" },
];

const ALERTS = [
  { label: "30yr drops below", placeholder: "6.50", type: "number" as const },
  { label: "Yield curve inverts", placeholder: "", type: "toggle" as const },
  { label: "Before FOMC meetings", placeholder: "", type: "toggle" as const },
  { label: "Refi makes sense for portfolio", placeholder: "", type: "toggle" as const },
];

const PORTFOLIO_PROPERTIES = [
  { address: "1847 Oak Valley Dr", loan: 308_000, currentRate: 7.25 },
  { address: "920 Magnolia Ln",    loan: 249_600, currentRate: 7.50 },
  { address: "4501 Bay Shore Blvd", loan: 356_000, currentRate: 6.88 },
];

// ─── CHART DATA ─────────────────────────────────────────────────────────────
const RATE_HISTORY_30YR = generateTimeSeries(24, 7.20, 0.08, -0.01, 201);
const RATE_HISTORY_15YR = generateTimeSeries(24, 6.55, 0.06, -0.01, 202);
const RATE_HISTORY_FED  = generateTimeSeries(24, 5.25, 0.05, -0.02, 203);

// Merge the three series into a single array keyed by month
const RATE_HISTORY_MERGED = RATE_HISTORY_30YR.map((d, i) => ({
  month: d.month,
  yr30: d.value,
  yr15: RATE_HISTORY_15YR[i]?.value ?? 0,
  fed:  RATE_HISTORY_FED[i]?.value ?? 0,
}));

const YIELD_CURVE_DATA = [
  { tenor: "1mo",  yield: 4.65 },
  { tenor: "3mo",  yield: 4.55 },
  { tenor: "6mo",  yield: 4.48 },
  { tenor: "1yr",  yield: 4.35 },
  { tenor: "2yr",  yield: 4.15 },
  { tenor: "5yr",  yield: 4.08 },
  { tenor: "10yr", yield: 4.28 },
  { tenor: "30yr", yield: 4.52 },
];

// ─── LEADING INDICATOR DATA ─────────────────────────────────────────────────
// Mock engine output from computeLeadingIndicatorComposite
// Values approximate US national conditions as of early 2026 (FRED-sourced estimates).
// TODO: Replace with live computeLeadingIndicatorComposite() call wired to FRED API.

type IndicatorSignal = "expansion" | "stable" | "contraction";
type IndicatorTrend = "up" | "down" | "flat";

interface IndicatorCard {
  seriesId: string;
  label: string;
  value: string;
  unit: string;
  historicalMean: string;
  zScore: number;
  signal: IndicatorSignal;
  trend: IndicatorTrend;
  leadTime: string;
  weight: number;
}

const INDICATOR_CARDS: IndicatorCard[] = [
  {
    seriesId: "PERMIT1",
    label: "Building Permits",
    value: "877",
    unit: "K SAAR",
    historicalMean: "820K",
    zScore: 0.38,
    signal: "expansion",
    trend: "down",
    leadTime: "9–12 mo lead",
    weight: 30,
  },
  {
    seriesId: "HOUST1F",
    label: "Housing Starts",
    value: "961",
    unit: "K SAAR",
    historicalMean: "830K",
    zScore: 0.82,
    signal: "expansion",
    trend: "flat",
    leadTime: "6–9 mo lead",
    weight: 25,
  },
  {
    seriesId: "HSN1F",
    label: "New Home Sales",
    value: "634",
    unit: "K SAAR",
    historicalMean: "620K",
    zScore: 0.11,
    signal: "stable",
    trend: "down",
    leadTime: "3–6 mo lead",
    weight: 20,
  },
  {
    seriesId: "ASPNHSUS",
    label: "Median Sale Price",
    value: "$518K",
    unit: "USD",
    historicalMean: "$380K",
    zScore: 1.73,
    signal: "expansion",
    trend: "flat",
    leadTime: "Lagging confirmation",
    weight: 15,
  },
  {
    seriesId: "MORTGAGE30US",
    label: "Mortgage Rate",
    value: "6.95",
    unit: "%",
    historicalMean: "4.20%",
    zScore: -1.53,   // inverted: high rate = bearish signal
    signal: "contraction",
    trend: "down",
    leadTime: "Immediate–6 mo",
    weight: 10,
  },
];

// Composite index: 50 + (weighted sum of z-scores) * 10
// = 50 + (0.38*0.30 + 0.82*0.25 + 0.11*0.20 + 1.73*0.15 + (-1.53)*0.10) * 10
// = 50 + (0.114 + 0.205 + 0.022 + 0.260 - 0.153) * 10 = 50 + 0.448*10 = 54.5 → 55
const COMPOSITE_INDEX = 55;
const COMPOSITE_SIGNAL: IndicatorSignal = "stable";   // 40–60 = stable
const COMPOSITE_CONFIDENCE = 64;                       // 4/5 components expansion/contraction with moderate extremity
const LEAD_TIME_MONTHS = 6;

// 18-month composite index history (mock, seeded for reproducibility)
// generateTimeSeries uses LCG seed; we post-process to clamp 0–100 range
const COMPOSITE_HISTORY_RAW = generateTimeSeries(18, 58, 6, -0.3, 501);
const COMPOSITE_HISTORY = COMPOSITE_HISTORY_RAW.map((d) => ({
  month: d.month,
  index: Math.round(Math.max(10, Math.min(90, d.value))),
}));

// 1σ reference bands: σ ≈ 10 index points (empirical from Dallas Fed methodology)
const COMPOSITE_MEAN = 50;
const COMPOSITE_SIGMA = 10;

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n: number, decimals = 2) => n.toFixed(decimals);
const fmtDollar = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function dirIcon(dir: Dir) {
  if (dir === "down") return <ArrowDown className="w-3 h-3" />;
  if (dir === "up")   return <ArrowUp className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function dirColor(dir: Dir) {
  if (dir === "down") return "text-emerald-light";
  if (dir === "up")   return "text-rose-light";
  return "text-content-tertiary";
}

function signalDot(s: Signal) {
  if (s === "favorable")   return "bg-emerald";
  if (s === "unfavorable") return "bg-rose";
  return "bg-amber";
}

function monthlyPayment(principal: number, annualRate: number, years = 30): number {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / (years * 12);
  return principal * (r * Math.pow(1 + r, years * 12)) / (Math.pow(1 + r, years * 12) - 1);
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 20;
  const w = 48;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export default function RatesPage() {
  const [simRate, setSimRate] = useState(6.95);
  const [alertValues, setAlertValues] = useState<Record<number, string>>({});
  const [alertToggles, setAlertToggles] = useState<Record<number, boolean>>({});
  const [liveRates, setLiveRates] = useState<{
    mortgage30yr: number | null;
    mortgage15yr: number | null;
    fedFunds: number | null;
    treasury10yr: number | null;
    mortgage30yrChange: number | null;
    spread: number | null;
    yieldCurve: string | null;
  } | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [timeSeries, setTimeSeries] = useState<Record<string, { date: string; value: number }[]>>({});

  // Fetch live rates + time series on mount
  useEffect(() => {
    fetch("/api/rates/current")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data) {
          setLiveRates(json.data);
          setIsLive(true);
          // Update sim rate to real current rate
          if (json.data.mortgage30yr) setSimRate(json.data.mortgage30yr);
        }
      })
      .catch(() => {});

    // Fetch time series for sparklines
    fetch("/api/market/time-series?series=MORTGAGE30US,MORTGAGE15US,FEDFUNDS,DGS10&period=1y")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data?.series) setTimeSeries(json.data.series);
      })
      .catch(() => {});
  }, []);

  // Merge live data into rate cards
  const toSparkline = (data: { date: string; value: number }[] | undefined): number[] => {
    if (!data || data.length < 2) return [];
    // Take last 12 data points for sparkline
    const recent = data.slice(-12);
    return recent.map((d) => d.value);
  };

  const deriveDir = (change: number): Dir => change < -0.01 ? "down" : change > 0.01 ? "up" : "flat";

  const MORTGAGE_RATES: Rate[] = (() => {
    const rates = [...FALLBACK_MORTGAGE];
    if (liveRates?.mortgage30yr != null) {
      const spark = toSparkline(timeSeries.MORTGAGE30US);
      const base = rates[0]!;
      rates[0] = {
        ...base,
        rate: liveRates.mortgage30yr,
        change: liveRates.mortgage30yrChange ?? 0,
        dir: deriveDir(liveRates.mortgage30yrChange ?? 0),
        ...(spark.length >= 2 ? { sparkline: spark } : {}),
      };
    }
    if (liveRates?.mortgage15yr != null) {
      const spark = toSparkline(timeSeries.MORTGAGE15US);
      const base = rates[1]!;
      rates[1] = { ...base, rate: liveRates.mortgage15yr, ...(spark.length >= 2 ? { sparkline: spark } : {}) };
    }
    return rates;
  })();

  const MACRO_RATES: Rate[] = (() => {
    const rates = [...FALLBACK_MACRO];
    if (liveRates?.fedFunds != null) {
      const spark = toSparkline(timeSeries.FEDFUNDS);
      const base = rates[0]!;
      rates[0] = { ...base, rate: liveRates.fedFunds, ...(spark.length >= 2 ? { sparkline: spark } : {}) };
    }
    if (liveRates?.treasury10yr != null) {
      const spark = toSparkline(timeSeries.DGS10);
      const base = rates[2]!;
      rates[2] = { ...base, rate: liveRates.treasury10yr, ...(spark.length >= 2 ? { sparkline: spark } : {}) };
    }
    return rates;
  })();

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── SECTION 1: Rate Dashboard ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              Today&apos;s Rates
            </div>
            <h1 className="text-lg font-semibold text-content-primary mt-1">Rate Environment</h1>
            <p className="text-[13px] text-content-tertiary mt-0.5">
              Live rates from the Federal Reserve. See how they impact your deals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLive && <span className="flex items-center gap-1 text-[10px] text-emerald-light"><Wifi className="w-3 h-3" />Live FRED</span>}
            <span className="text-xs text-content-tertiary font-mono">{today}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MORTGAGE_RATES.map((r) => (
            <div key={r.label} className="card-glass !p-3">
              <div className="text-[11px] text-content-tertiary font-medium truncate">{r.label}</div>
              <div className="flex items-end justify-between mt-1">
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono text-lg font-bold text-content-primary tabular-nums">{fmt(r.rate)}%</span>
                  {r.label === "30-Year Fixed" && (
                    <AiInsight metric="spread" value={r.rate} compact />
                  )}
                </span>
                <Sparkline data={r.sparkline} color={r.dir === "down" ? "#34D399" : r.dir === "up" ? "#F87171" : "#5C6478"} />
              </div>
              <div className={`flex items-center gap-1 mt-1 font-mono text-xs ${dirColor(r.dir)}`}>
                {dirIcon(r.dir)}
                <span>{r.change === 0 ? "0.00" : (r.change > 0 ? "+" : "") + fmt(r.change)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Macro drivers */}
        <div className="mt-3 card-glass !p-3">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium">Driving Forces</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MACRO_RATES.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-content-tertiary">{r.label}</div>
                  <div className="inline-flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold text-content-primary tabular-nums">{fmt(r.rate)}%</span>
                    {r.label === "Fed Funds" && (
                      <AiInsight metric="yield_curve" value={r.rate} compact />
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-0.5 font-mono text-[11px] ${dirColor(r.dir)}`}>
                  {dirIcon(r.dir)}
                  {r.change !== 0 && <span>{(r.change > 0 ? "+" : "") + fmt(r.change)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 1b: Rate Trends — 24 Months ──────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Trends &mdash; 24 Months
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-3">
          {[
            { label: "30yr Fixed", color: CHART_COLORS.gold },
            { label: "15yr Fixed", color: CHART_COLORS.emerald },
            { label: "Fed Funds",  color: CHART_COLORS.rose },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={RATE_HISTORY_MERGED} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="grad30yr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.gold}    stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.gold}    stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="grad15yr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.emerald} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gradFed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.rose}    stopOpacity={0.10} />
                <stop offset="95%" stopColor={CHART_COLORS.rose}    stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="month"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              interval={3}
            />
            <YAxis
              tickFormatter={fmtChartPct}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              domain={["auto", "auto"]}
              width={44}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltipContent
                    label={String(label)}
                    items={[
                      { name: "30yr Fixed", value: fmtChartPct(payload[0]?.value as number ?? 0), color: CHART_COLORS.gold },
                      { name: "15yr Fixed", value: fmtChartPct(payload[1]?.value as number ?? 0), color: CHART_COLORS.emerald },
                      { name: "Fed Funds",  value: fmtChartPct(payload[2]?.value as number ?? 0), color: CHART_COLORS.rose },
                    ]}
                  />
                );
              }}
            />
            <Area type="monotone" dataKey="yr30" stroke={CHART_COLORS.gold}    strokeWidth={2} fill="url(#grad30yr)" dot={false} />
            <Area type="monotone" dataKey="yr15" stroke={CHART_COLORS.emerald} strokeWidth={2} fill="url(#grad15yr)" dot={false} />
            <Area type="monotone" dataKey="fed"  stroke={CHART_COLORS.rose}    strokeWidth={2} fill="url(#gradFed)"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* ── SECTION 1c: AI Insight — Rate Impact ─────────────────────────── */}
      <AiInsightCard title="Rate Impact Analysis">
        The 30-year fixed has dropped 25bps over 6 months while the Fed holds steady. The mortgage-Fed spread at 2.20% suggests banks have room to compress margins further &mdash; rates could drop without a Fed cut. For your portfolio: your weighted average rate of 7.21% is 26bps above market. Set a refi alert at 6.50% &mdash; break-even is 14 months.
      </AiInsightCard>

      {/* ── SECTION 2: Market Conditions ──────────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          What&apos;s Happening Right Now
        </div>
        <div className="space-y-2.5">
          {CONDITIONS.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${signalDot(c.signal)}`} />
              <p className="text-[13px] text-content-secondary leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: Decision Matrix ────────────────────────────────────── */}
      <section>
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          What This Means For You
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <div key={s.title} className="card group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4 text-content-tertiary" />
                  <span className="text-[13px] font-semibold text-content-primary">{s.title}</span>
                </div>
                <span className={s.actionColor}>{s.action}</span>
              </div>
              <div className="space-y-1.5">
                {s.lines.map((l, i) => (
                  <p key={i} className="text-xs text-content-secondary leading-relaxed flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-content-disabled" />
                    {l}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: Rate Impact Calculator ─────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Impact Calculator
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <label className="text-[13px] text-content-secondary shrink-0">What if rates move to</label>
          <div className="flex items-center gap-3 flex-1">
            <input
              type="range"
              min={4.0}
              max={10.0}
              step={0.125}
              value={simRate}
              onChange={(e) => setSimRate(parseFloat(e.target.value))}
              className="flex-1 accent-gold h-1.5 bg-surface-muted rounded-full cursor-pointer"
            />
            <span className="font-mono text-lg font-bold text-gold-light tabular-nums w-[72px] text-right">{fmt(simRate)}%</span>
          </div>
        </div>

        {/* Standard scenarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { label: "$350K property, 20% down", principal: 280_000 },
            { label: "$500K property, 25% down", principal: 375_000 },
          ].map((s) => {
            const currentPmt = monthlyPayment(s.principal, 6.95);
            const newPmt = monthlyPayment(s.principal, simRate);
            const diff = newPmt - currentPmt;
            return (
              <div key={s.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[11px] text-content-tertiary mb-1">{s.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-content-primary">{fmtDollar(Math.round(newPmt))}/mo</span>
                  <span className={`font-mono text-xs ${diff > 0 ? "text-rose-light" : diff < 0 ? "text-emerald-light" : "text-content-tertiary"}`}>
                    {diff > 0 ? "+" : ""}{fmtDollar(Math.round(diff))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Portfolio impact */}
        <div className="text-[11px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium">Your Portfolio Impact</div>
        <div className="space-y-2">
          {PORTFOLIO_PROPERTIES.map((p) => {
            const currentPmt = monthlyPayment(p.loan, p.currentRate);
            const newPmt = monthlyPayment(p.loan, simRate);
            const diff = newPmt - currentPmt;
            return (
              <div key={p.address} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <div>
                  <span className="text-[13px] text-content-primary">{p.address}</span>
                  <span className="text-xs text-content-disabled ml-2 font-mono">{fmt(p.currentRate)}% now</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-content-secondary">{fmtDollar(Math.round(currentPmt))}</span>
                  <ArrowRight className="w-3 h-3 text-content-disabled" />
                  <span className="font-mono text-xs font-semibold text-content-primary">{fmtDollar(Math.round(newPmt))}</span>
                  <span className={`font-mono text-[11px] ${diff > 0 ? "text-rose-light" : diff < 0 ? "text-emerald-light" : "text-content-tertiary"}`}>
                    {diff >= 0 ? "+" : ""}{fmtDollar(Math.round(diff))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-muted/50">
          <Info className="w-3.5 h-3.5 text-amber-light mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-light">Every 1% rate increase removes ~10% of qualified buyers from the market.</p>
        </div>
      </section>

      {/* ── SECTION 4b: Rate Sensitivity Heatmap ────────────────────────── */}
      <section className="card overflow-x-auto">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          <Term id="mortgage-rates">Rate Sensitivity</Term> Heatmap
          <span className="text-[9px] text-content-disabled ml-auto">Monthly P&I payment · 30yr fixed · 20% down</span>
        </div>
        <p className="text-[10px] text-content-tertiary mb-3">
          Find your purchase price on the left, read across to see how each rate changes your monthly payment.
          Gold column = today&apos;s rate. Green = affordable (&lt;$2,500/mo). Red = stretched (&gt;$4,000/mo).
        </p>
        <table className="w-full text-[11px] font-mono tabular-nums">
          <thead>
            <tr>
              <th className="text-left text-[9px] text-content-disabled font-medium pb-2 pr-3 uppercase tracking-wider">Price</th>
              {[5.5, 6.0, 6.5, 6.87, 7.0, 7.5, 8.0, 8.5].map(rate => (
                <th key={rate} className={`text-center text-[9px] font-medium pb-2 px-1 ${Math.abs(rate - 6.87) < 0.02 ? "text-gold font-bold" : "text-content-disabled"}`}>
                  {rate.toFixed(rate === 6.87 ? 2 : 1)}%
                  {Math.abs(rate - 6.87) < 0.02 && <span className="block text-[7px] text-gold">TODAY</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[200_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000].map(price => (
              <tr key={price} className="border-t border-surface-border/50 hover:bg-white/[0.02]">
                <td className="py-1.5 pr-3 text-content-secondary font-semibold">{fmtDollar(price)}</td>
                {[5.5, 6.0, 6.5, 6.87, 7.0, 7.5, 8.0, 8.5].map(rate => {
                  const loan = price * 0.8;
                  const pmt = Math.round(monthlyPayment(loan, rate));
                  const isToday = Math.abs(rate - 6.87) < 0.02;
                  const color = pmt < 2000 ? "text-emerald" : pmt < 3000 ? "text-content-primary" : pmt < 4000 ? "text-amber" : "text-rose";
                  return (
                    <td key={rate} className={`py-1.5 px-1 text-center ${color} ${isToday ? "bg-gold/[0.06] font-bold" : ""}`}>
                      {fmtDollar(pmt)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-4 mt-2 text-[9px] text-content-disabled">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald/30" /> &lt;$2K/mo</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber/30" /> $3-4K/mo</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose/30" /> &gt;$4K/mo</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gold/20" /> Today&apos;s rate</span>
        </div>
      </section>

      {/* ── SECTION 4c: ARM vs Fixed Comparison ─────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          ARM vs Fixed — Which Saves You More?
        </div>
        <p className="text-[10px] text-content-tertiary mb-3">
          ARMs start lower but adjust after the fixed period. The question: will rates drop enough before your ARM resets?
        </p>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] text-content-disabled uppercase tracking-wider">
              <th className="text-left pb-2 font-medium">Loan Type</th>
              <th className="text-right pb-2 font-medium">Rate</th>
              <th className="text-right pb-2 font-medium">Monthly P&I</th>
              <th className="text-right pb-2 font-medium">5yr Interest</th>
              <th className="text-right pb-2 font-medium">10yr Interest</th>
              <th className="text-right pb-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const loan = 400_000;
              const products = [
                { name: "30yr Fixed", rate: 6.95, years: 30 },
                { name: "15yr Fixed", rate: 6.38, years: 15 },
                { name: "5/1 ARM", rate: 6.12, years: 30 },
                { name: "7/1 ARM", rate: 6.35, years: 30 },
              ];
              return products.map(p => {
                const pmt = monthlyPayment(loan, p.rate, p.years);
                const int5 = pmt * 60 - (loan / (p.years * 12) * 60); // approximate
                const int10 = pmt * 120 - (loan / (p.years * 12) * 120);
                const isLowest = p.rate === Math.min(...products.map(x => x.rate));
                return (
                  <tr key={p.name} className="border-t border-surface-border/50 hover:bg-white/[0.02]">
                    <td className="py-2 font-semibold text-content-primary">{p.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums" style={{ color: isLowest ? CHART_COLORS.emerald : CHART_COLORS.textSecondary }}>
                      {p.rate.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-content-primary">{fmtDollar(Math.round(pmt))}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-content-secondary">{fmtDollar(Math.round(Math.max(0, int5)))}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-content-secondary">{fmtDollar(Math.round(Math.max(0, int10)))}</td>
                    <td className="py-2 text-right">
                      {p.name.includes("ARM") ? (
                        <span className="text-[10px] text-amber font-semibold">
                          Saves {fmtDollar(Math.round(monthlyPayment(loan, 6.95) - pmt))}/mo for {p.name === "5/1 ARM" ? "5" : "7"}yr
                        </span>
                      ) : p.name === "15yr Fixed" ? (
                        <span className="text-[10px] text-emerald font-semibold">Fastest payoff</span>
                      ) : (
                        <span className="text-[10px] text-content-tertiary">Safest</span>
                      )}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        <div className="mt-3 text-[10px] text-content-tertiary border-t border-surface-border pt-2">
          Based on $400K loan. ARM rates assume no adjustment during fixed period.
          If you plan to sell or refi within 5 years, the 5/1 ARM saves the most.
          If you&apos;re holding long-term, the 30yr fixed eliminates rate risk.
        </div>
      </section>

      {/* ── SECTION 5: Rate Spreads ───────────────────────────────────────── */}
      <section>
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          Rate Spreads &mdash; Hidden Signals
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPREADS.map((s) => {
            const barMax = Math.max(Math.abs(s.current), Math.abs(s.baseline), 3);
            const currentPct = Math.min(Math.abs(s.current) / barMax * 100, 100);
            const baselinePct = Math.min(Math.abs(s.baseline) / barMax * 100, 100);
            return (
              <div key={s.title} className="card">
                <div className="text-[13px] font-semibold text-content-primary mb-3">{s.title}</div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-lg font-bold text-content-primary tabular-nums">
                      {s.current >= 0 ? "+" : ""}{fmt(s.current)}%
                    </span>
                    {s.title === "Yield Curve (10yr - 2yr)" && (
                      <AiInsight metric="yield_curve" value={s.current} compact />
                    )}
                    {s.title === "Mortgage vs Fed Funds Spread" && (
                      <AiInsight metric="spread" value={s.current} compact />
                    )}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${signalDot(s.signal)}`} />
                </div>
                {/* Bar visualization */}
                <div className="space-y-1.5 mb-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-content-disabled mb-0.5">
                      <span>Current</span>
                      <span>{fmt(s.current)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.signal === "favorable" ? "bg-emerald" : s.signal === "unfavorable" ? "bg-rose" : "bg-amber"}`}
                        style={{ width: `${currentPct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-content-disabled mb-0.5">
                      <span>{s.baselineLabel}</span>
                      <span>{fmt(s.baseline)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full rounded-full bg-content-disabled" style={{ width: `${baselinePct}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-content-tertiary leading-relaxed">{s.interpretation}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 5b: Yield Curve — Current Shape ──────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Yield Curve &mdash; Current Shape
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={YIELD_CURVE_DATA} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradYield" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.gold} stopOpacity={0.20} />
                <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="tenor"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <YAxis
              tickFormatter={fmtChartPct}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              domain={[3.8, 5.0]}
              width={44}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltipContent
                    label={String(label)}
                    items={[
                      { name: "Yield", value: fmtChartPct(payload[0]?.value as number ?? 0), color: CHART_COLORS.gold },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="yield"
              stroke={CHART_COLORS.gold}
              strokeWidth={2}
              fill="url(#gradYield)"
              dot={{ fill: CHART_COLORS.gold, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: CHART_COLORS.goldLight }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* ── SECTION 5c: Leading Indicators — Where Markets Are Headed ────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              Leading Indicators — Where Markets Are Headed
            </div>
            <p className="text-[12px] text-content-tertiary mt-1">
              Dallas Fed–style composite · r = 0.86 vs FHFA HPI · {LEAD_TIME_MONTHS}-month lead time
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full ${
              COMPOSITE_SIGNAL === "expansion"
                ? "bg-emerald/20 text-emerald-light"
                : COMPOSITE_SIGNAL === "contraction"
                ? "bg-rose/20 text-rose-light"
                : "bg-amber/20 text-amber-light"
            }`}>
              {COMPOSITE_SIGNAL === "expansion" ? "Expansion" : COMPOSITE_SIGNAL === "contraction" ? "Contraction" : "Stable"}
            </span>
            <span className="text-[11px] text-content-disabled font-mono">{COMPOSITE_CONFIDENCE}% conf.</span>
          </div>
        </div>

        {/* 5 indicator cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {INDICATOR_CARDS.map((card) => {
            const signalColor =
              card.signal === "expansion" ? "text-emerald-light" :
              card.signal === "contraction" ? "text-rose-light" :
              "text-amber-light";
            const signalBg =
              card.signal === "expansion" ? "bg-emerald/10 border-emerald/20" :
              card.signal === "contraction" ? "bg-rose/10 border-rose/20" :
              "bg-amber/10 border-amber/20";
            const trendIcon =
              card.trend === "up"   ? <TrendingUp  className="w-3 h-3" aria-hidden="true" /> :
              card.trend === "down" ? <TrendingDown className="w-3 h-3" aria-hidden="true" /> :
              <Activity className="w-3 h-3" aria-hidden="true" />;
            const trendColor =
              card.trend === "up"   ? "text-emerald-light" :
              card.trend === "down" ? "text-rose-light" :
              "text-content-tertiary";

            return (
              <div
                key={card.seriesId}
                className={`card border ${signalBg} !p-3`}
                aria-label={`${card.label}: ${card.value} ${card.unit}, signal ${card.signal}, trend ${card.trend}`}
              >
                {/* Series label */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-content-disabled uppercase tracking-[0.08em]">{card.seriesId}</span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${signalColor}`}>
                    {card.signal === "expansion" ? "Bullish" : card.signal === "contraction" ? "Bearish" : "Neutral"}
                  </span>
                </div>

                {/* Human label */}
                <div className="text-[11px] text-content-tertiary font-medium mb-1 leading-tight">{card.label}</div>

                {/* Value + trend */}
                <div className="flex items-end justify-between">
                  <span className="font-mono text-base font-bold text-content-primary tabular-nums leading-none">
                    {card.value}
                    <span className="text-[10px] text-content-disabled font-normal ml-0.5">{card.unit}</span>
                  </span>
                  <span className={`flex items-center gap-0.5 ${trendColor}`} title={`3-month trend: ${card.trend}`}>
                    {trendIcon}
                  </span>
                </div>

                {/* Historical mean + z-score */}
                <div className="mt-2 pt-2 border-t border-surface-border grid grid-cols-2 gap-x-2">
                  <div>
                    <div className="text-[9px] text-content-disabled mb-0.5">10yr avg</div>
                    <div className="text-[10px] font-mono text-content-tertiary">{card.historicalMean}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-content-disabled mb-0.5">z-score</div>
                    <div className={`text-[10px] font-mono font-semibold ${signalColor}`}>
                      {card.zScore >= 0 ? "+" : ""}{card.zScore.toFixed(2)}σ
                    </div>
                  </div>
                </div>

                {/* Weight pill */}
                <div className="mt-1.5">
                  <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        card.signal === "expansion" ? "bg-emerald" :
                        card.signal === "contraction" ? "bg-rose" : "bg-amber"
                      }`}
                      style={{ width: `${card.weight * 3.33}%` }}   // max weight 30% → 100% bar
                    />
                  </div>
                  <div className="text-[9px] text-content-disabled mt-0.5 text-right font-mono">{card.weight}% wt · {card.leadTime}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composite index chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-label flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Composite Leading Index — 18 Months
            </div>
            <div className="flex items-center gap-4">
              {[
                { label: "Bullish zone", color: CHART_COLORS.emerald },
                { label: "Neutral zone", color: CHART_COLORS.amber },
                { label: "Bearish zone", color: CHART_COLORS.rose },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1 text-[10px] text-content-disabled">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color, opacity: 0.7 }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Composite index value */}
          <div className="flex items-baseline gap-2 mb-3">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                COMPOSITE_INDEX > COMPOSITE_MEAN + COMPOSITE_SIGMA ? "text-emerald-light" :
                COMPOSITE_INDEX < COMPOSITE_MEAN - COMPOSITE_SIGMA ? "text-rose-light" :
                "text-amber-light"
              }`}
              aria-label={`Composite leading index: ${COMPOSITE_INDEX} out of 100`}
            >
              {COMPOSITE_INDEX}
            </span>
            <span className="text-[12px] text-content-tertiary">/ 100</span>
            <span className="text-[12px] text-content-disabled ml-1">
              ({COMPOSITE_INDEX > 60 ? "Expansion signal" : COMPOSITE_INDEX < 40 ? "Contraction signal" : "Stable / neutral"})
            </span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={COMPOSITE_HISTORY} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <defs>
                {/* Emerald gradient for the area fill */}
                <linearGradient id="gradComposite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.gold} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="month"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={2}
              />
              <YAxis
                domain={[20, 80]}
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                width={36}
                tickCount={5}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const val = payload[0]?.value as number ?? 0;
                  const sig =
                    val > COMPOSITE_MEAN + COMPOSITE_SIGMA ? "Bullish zone" :
                    val < COMPOSITE_MEAN - COMPOSITE_SIGMA ? "Bearish zone" :
                    "Neutral zone";
                  return (
                    <ChartTooltipContent
                      label={String(label)}
                      items={[
                        {
                          name: "Composite Index",
                          value: `${val} (${sig})`,
                          color:
                            val > COMPOSITE_MEAN + COMPOSITE_SIGMA ? CHART_COLORS.emerald :
                            val < COMPOSITE_MEAN - COMPOSITE_SIGMA ? CHART_COLORS.rose :
                            CHART_COLORS.amber,
                        },
                      ]}
                    />
                  );
                }}
              />
              {/* +1σ line — bullish boundary */}
              <ReferenceLine
                y={COMPOSITE_MEAN + COMPOSITE_SIGMA}
                stroke={CHART_COLORS.emerald}
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{ value: "+1σ (Bullish)", fill: CHART_COLORS.emerald, fontSize: 9, position: "right" }}
              />
              {/* −1σ line — bearish boundary */}
              <ReferenceLine
                y={COMPOSITE_MEAN - COMPOSITE_SIGMA}
                stroke={CHART_COLORS.rose}
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{ value: "−1σ (Bearish)", fill: CHART_COLORS.rose, fontSize: 9, position: "right" }}
              />
              {/* Neutral 50 midline */}
              <ReferenceLine
                y={COMPOSITE_MEAN}
                stroke={CHART_COLORS.text}
                strokeDasharray="2 4"
                strokeOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="index"
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                fill="url(#gradComposite)"
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.goldLight }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Methodology note */}
          <p className="text-[10px] text-content-disabled mt-3 leading-relaxed">
            Composite = weighted average of 5 FRED z-scores (PERMIT1 30%, HOUST1F 25%, HSN1F 20%, ASPNHSUS 15%, MORTGAGE30US 10% inverted).
            Scaled to 0–100 centered at 50. Source: Dallas Fed Working Paper No. 2201 · r = 0.86 vs FHFA HPI (1991–2023).
          </p>
        </div>
      </section>

      {/* ── SECTION 6: Rate Forecast Timeline ─────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Forecast &amp; Timeline
        </div>
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-border" />
          {TIMELINE.map((t, i) => {
            const isToday = i === 1;
            return (
              <div key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">
                <div className={`absolute left-[-17px] top-1.5 w-3 h-3 rounded-full border-2 ${
                  isToday ? "bg-gold border-gold-light" : "bg-surface-card border-surface-border"
                }`} />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[12px] font-medium ${isToday ? "text-gold-light" : "text-content-secondary"}`}>{t.label}</span>
                    <span className="font-mono text-sm font-bold text-content-primary tabular-nums">{t.value}</span>
                  </div>
                  <p className="text-[11px] text-content-tertiary mt-0.5">{t.note}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-gold-muted/50 flex items-start gap-2">
          <TrendingDown className="w-4 h-4 text-gold-light mt-0.5 shrink-0" />
          <div>
            <div className="text-[12px] font-medium text-gold-light">The Goldman Lag</div>
            <p className="text-[11px] text-content-secondary mt-0.5">
              Price impact of recent rate drops: ~20% transmitted. The remaining 80% feeds into home prices over the next 24 months.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: Rate Alerts ────────────────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Alerts
        </div>
        <div className="space-y-3">
          {ALERTS.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Bell className="w-3.5 h-3.5 text-content-tertiary shrink-0" />
                <span className="text-[13px] text-content-secondary truncate">{a.label}</span>
              </div>
              {a.type === "number" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={a.placeholder}
                    value={alertValues[i] ?? ""}
                    onChange={(e) => setAlertValues((p) => ({ ...p, [i]: e.target.value }))}
                    className="input !w-20 !py-1.5 !text-xs font-mono text-right"
                  />
                  <span className="text-xs text-content-disabled">%</span>
                </div>
              ) : (
                <button
                  onClick={() => setAlertToggles((p) => ({ ...p, [i]: !p[i] }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${alertToggles[i] ? "bg-gold" : "bg-surface-muted"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${alertToggles[i] ? "left-[18px]" : "left-0.5"}`} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="btn-primary btn-sm mt-4 w-full sm:w-auto">
          <CheckCircle className="w-3.5 h-3.5" />
          Save Alerts
        </button>
      </section>
    </div>
  );
}
