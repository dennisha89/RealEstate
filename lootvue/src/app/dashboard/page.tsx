"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  ArrowUpRight, ArrowDownRight, ArrowRight, ChevronRight,
  RefreshCw, WifiOff, TrendingUp, TrendingDown,
  Search, Zap, Target, Clock, AlertTriangle,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { CHART_COLORS, generateTimeSeries } from "@/components/charts/ChartTheme";
import { SAMPLE_MARKET_DATA } from "@/components/charts/CapitalFlowMap";
import { SAMPLE_SIGNALS } from "@/components/charts/SignalConvergenceChart";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { Term } from "@/components/shared/Term";

/* ─── Lazy loads ─────────────────────────────────────────────────────────── */

const MultiDimensionalExplorer = dynamic(
  () => import("@/components/charts/MultiDimensionalExplorer").then(m => ({ default: m.MultiDimensionalExplorer })),
  { ssr: false, loading: () => <div className="skeleton h-[600px] rounded-xl" /> }
);

const RateEnvironmentAnalysis = dynamic(
  () => import("@/components/charts/RateEnvironmentAnalysis").then(m => ({ default: m.RateEnvironmentAnalysis })),
  { ssr: false, loading: () => <div className="skeleton h-[400px] rounded-xl" /> }
);

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("en-US", opts).format(n);
const fmtUSD = (n: number) =>
  fmt(n, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtCompact = (n: number) =>
  fmt(n, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

function scoreColor(n: number) {
  if (n >= 75) return "text-emerald-light";
  if (n >= 55) return "text-amber-light";
  return "text-rose-light";
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/* ─── Mock data ──────────────────────────────────────────────────────────── */

const PORTFOLIO = {
  totalValue: 1_200_000,
  valueYtdPct: 8.2,
  valueTrend: generateTimeSeries(12, 1_040_000, 18000, 0.025, 101),
  monthlyCF: 3_450,
  cfPrevMonth: 3_210,
  cfTrend: generateTimeSeries(12, 3_100, 320, 0.008, 202),
  totalEquity: 380_000,
  equityYoYPct: 12.0,
  equityTrend: generateTimeSeries(12, 338_000, 8000, 0.02, 303),
};

const RECENT_ANALYSES = [
  { address: "123 Main St, Austin TX",    verdict: "BUY"  as const, capRate: 7.2, cashFlow:  450, hoursAgo:  2 },
  { address: "456 Oak Ave, Tampa FL",     verdict: "PASS" as const, capRate: 4.1, cashFlow: -280, hoursAgo: 28 },
  { address: "789 Pine Rd, Nashville TN", verdict: "DIG"  as const, capRate: 5.8, cashFlow:  120, hoursAgo: 72 },
];

interface RateData {
  mortgage30yr: number | null;
  mortgage15yr: number | null;
  fedFunds: number | null;
  mortgage30yrChange: number | null;
  lastUpdated: string;
}

/* ─── Sparkline ──────────────────────────────────────────────────────────── */

function Sparkline({ data, color = CHART_COLORS.gold }: { data: { month: string; value: number }[]; color?: string }) {
  const id = `sg-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
          fill={`url(#${id})`} dot={false} activeDot={false} isAnimationActive={false} />
        <Tooltip content={() => null} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Portfolio metric card ──────────────────────────────────────────────── */

function MetricCard({ label, value, subLabel, subUp, sparkData, sparkColor, delay }: {
  label: string; value: string; subLabel: string; subUp: boolean;
  sparkData: { month: string; value: number }[]; sparkColor: string; delay: number;
}) {
  return (
    <motion.div
      className="glass p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.35, ease: "easeOut" }}
    >
      <p className="metric-label mb-1.5">{label}</p>
      <p className="font-mono text-[1.6rem] font-bold text-content-primary tabular-nums leading-none">{value}</p>
      <div className={`flex items-center gap-1 mt-1 text-[11px] font-mono ${subUp ? "metric-trend-up" : "metric-trend-down"}`}>
        {subUp ? <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> : <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
        <span>{subLabel}</span>
      </div>
      <div className="mt-2 -mx-1" aria-hidden="true">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </motion.div>
  );
}

/* ─── Rates card ─────────────────────────────────────────────────────────── */

function RatesCard() {
  const [rates, setRates] = useState<RateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rates/current");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRates(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to fetch");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const m30 = rates?.mortgage30yr;
  const m15 = rates?.mortgage15yr;
  const chg = rates?.mortgage30yrChange;
  const DSCR_RATE = 7.5;
  const HARD_MONEY = 11.2;

  // Context: buying-power change per +0.12% rate move on $400K loan
  const bpsBps = chg != null ? Math.abs(chg * 100).toFixed(0) : null;
  const buyingPowerPct = chg != null ? Math.abs(chg * 0.165).toFixed(1) : null; // ~0.165% buying power per 0.10% rate

  return (
    <div className="glass p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">
            Today&apos;s <span className="text-gold-light">Rates</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && <span className="status-pill status-pill-live" role="status">Live</span>}
          {error && <WifiOff className="w-3.5 h-3.5 text-content-disabled" aria-label="Offline" />}
          {!loading && (
            <button onClick={() => { setLoading(true); setError(null); fetch("/api/rates/current").then(r => r.json()).then(j => setRates(j.data)).catch(() => setError("fetch failed")).finally(() => setLoading(false)); }}
              className="p-1 rounded hover:bg-white/5 transition-colors" aria-label="Refresh rates">
              <RefreshCw className="w-3 h-3 text-content-disabled" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="space-y-1.5"><div className="skeleton h-3 w-16 rounded" /><div className="skeleton h-7 w-20 rounded" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: <Term id="mortgage-rates">30yr Fixed</Term>, value: m30 != null ? `${m30.toFixed(2)}%` : "N/A",
              sub: chg != null && chg !== 0 ? `${chg > 0 ? "+" : ""}${(chg * 100).toFixed(0)}bps vs last wk` : "flat vs last wk",
              up: chg != null ? chg <= 0 : true },
            { label: <Term id="mortgage-rates">15yr Fixed</Term>, value: m15 != null ? `${m15.toFixed(2)}%` : "N/A", sub: "conventional", up: true },
            { label: <Term id="dscr">DSCR</Term>, value: `${DSCR_RATE.toFixed(1)}%`, sub: "~typical", up: true },
            { label: "Hard Money",  value: `${HARD_MONEY.toFixed(1)}%`, sub: "~typical", up: true },
          ].map((r, i) => (
            <div key={i}>
              <p className="metric-label mb-1.5">{r.label}</p>
              <p className="font-mono text-[1.35rem] font-bold text-content-primary tabular-nums leading-none">{r.value}</p>
              <p className={`text-[10px] font-mono mt-1 ${r.up ? "text-emerald-light" : "text-rose-light"}`}>{r.sub}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && m30 != null && chg != null && chg !== 0 && (
        <div className="mt-3 pt-3 border-t border-surface-border">
          <p className="text-[12px] text-content-secondary">
            <span className="font-mono font-semibold text-content-primary">{m30.toFixed(2)}%</span>
            {" "}—{" "}
            <span className={chg < 0 ? "text-emerald-light" : "text-rose-light"}>
              {bpsBps}bps {chg < 0 ? "lower" : "higher"} than last week.
            </span>
            {" "}Your buying power {chg < 0 ? "improved" : "dropped"}{" "}
            <span className={chg < 0 ? "text-emerald-light" : "text-rose-light"}>
              ~{buyingPowerPct}%
            </span>
            .
          </p>
        </div>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-amber-light">
          {error.includes("FRED") ? "Add FRED_API_KEY to .env.local for live rates" : error}
        </p>
      )}
    </div>
  );
}

/* ─── Market pulse — BUY/SELL split from SAMPLE_MARKET_DATA ─────────────── */

const BUY_MARKETS  = [...SAMPLE_MARKET_DATA].sort((a, b) => b.score - a.score).slice(0, 3);
const SELL_MARKETS = [...SAMPLE_MARKET_DATA].sort((a, b) => a.score - b.score).slice(0, 3);

function MarketPulse() {
  return (
    <div className="glass p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">Market <span className="text-gold-light">Pulse</span></h2>
        </div>
        <Link href="/dashboard/markets" className="text-[11px] text-gold-light hover:text-gold flex items-center gap-0.5">
          Full map <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* BUY column */}
        <div>
          <p className="section-label mb-2 text-emerald-light">Top BUY</p>
          <div className="space-y-2">
            {BUY_MARKETS.map(m => (
              <Link key={m.stateCode} href={`/dashboard/markets?focus=${m.stateCode}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                aria-label={`${m.stateName}: score ${m.score}/100, ${m.convergence} bullish signals`}>
                <div>
                  <p className="text-[12px] font-semibold text-content-primary group-hover:text-gold-light transition-colors">{m.topMetro}</p>
                  <p className="text-[10px] text-content-disabled">{m.convergence}/5 bullish</p>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-[13px] font-bold tabular-nums ${scoreColor(m.score)}`}>{m.score}</span>
                  <p className={`text-[10px] font-mono ${m.yoyAppreciation >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                    {m.yoyAppreciation >= 0 ? "+" : ""}{m.yoyAppreciation}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* SELL / AVOID column */}
        <div>
          <p className="section-label mb-2 text-rose-light">Top AVOID</p>
          <div className="space-y-2">
            {SELL_MARKETS.map(m => (
              <Link key={m.stateCode} href={`/dashboard/markets?focus=${m.stateCode}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                aria-label={`${m.stateName}: score ${m.score}/100, avoid`}>
                <div>
                  <p className="text-[12px] font-semibold text-content-primary group-hover:text-gold-light transition-colors">{m.topMetro}</p>
                  <p className="text-[10px] text-content-disabled">{m.convergence}/5 bullish</p>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-[13px] font-bold tabular-nums ${scoreColor(m.score)}`}>{m.score}</span>
                  <p className={`text-[10px] font-mono ${m.yoyAppreciation >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                    {m.yoyAppreciation >= 0 ? "+" : ""}{m.yoyAppreciation}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Recent analyses ────────────────────────────────────────────────────── */

const BADGE: Record<"BUY"|"PASS"|"DIG", string> = {
  BUY: "badge-emerald", PASS: "badge-rose", DIG: "badge-amber",
};
const BADGE_LABEL: Record<"BUY"|"PASS"|"DIG", string> = {
  BUY: "BUY", PASS: "PASS", DIG: "DIG DEEPER",
};

function RecentAnalyses() {
  return (
    <div className="glass p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">Recent <span className="text-gold-light">Analyses</span></h2>
        </div>
        <Link href="/dashboard/analyze" className="text-[11px] text-gold-light hover:text-gold flex items-center gap-0.5">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {RECENT_ANALYSES.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Search className="w-8 h-8 text-content-disabled mb-2" aria-hidden="true" />
          <p className="text-sm text-content-tertiary mb-1">No analyses yet</p>
          <Link href="/dashboard/analyze" className="btn-primary btn-sm mt-3">Analyze a Property</Link>
        </div>
      ) : (
        <table className="table-premium w-full" aria-label="Recent property analyses">
          <thead>
            <tr>
              <th scope="col" className="text-left">Address</th>
              <th scope="col" className="text-center">Verdict</th>
              <th scope="col" className="text-right hidden sm:table-cell"><Term id="cap-rate">Cap Rate</Term></th>
              <th scope="col" className="text-right hidden sm:table-cell">Cash Flow</th>
              <th scope="col" className="text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ANALYSES.map(a => (
              <tr key={a.address} className="cursor-pointer"
                onClick={() => window.location.href = `/dashboard/analyze?address=${encodeURIComponent(a.address)}`}
                aria-label={`${a.address}: ${BADGE_LABEL[a.verdict]}`}>
                <td className="font-medium text-content-primary pr-4 max-w-[180px] truncate">{a.address}</td>
                <td className="text-center">
                  <span className={BADGE[a.verdict]}>{BADGE_LABEL[a.verdict]}</span>
                </td>
                <td className="text-right font-mono hidden sm:table-cell">{a.capRate.toFixed(1)}%</td>
                <td className={`text-right font-mono hidden sm:table-cell ${a.cashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                  {a.cashFlow < 0 ? `(${fmtUSD(Math.abs(a.cashFlow))})` : `+${fmtUSD(a.cashFlow)}`}
                </td>
                <td className="text-right text-content-disabled text-[11px] font-mono whitespace-nowrap">
                  {a.hoursAgo < 24 ? `${a.hoursAgo}h ago` : `${Math.floor(a.hoursAgo / 24)}d ago`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Signal convergence mini ────────────────────────────────────────────── */

function SignalMini() {
  return (
    <div className="glass p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-content-primary">Signal{" "}<span className="text-gold-light"><Term id="convergence">Convergence</Term></span></h2>
        <Link href="/dashboard/markets" className="text-[11px] text-gold-light hover:text-gold flex items-center gap-0.5">
          Detail <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2.5">
        {SAMPLE_SIGNALS.map(s => {
          const c = s.direction === "bullish" ? CHART_COLORS.emerald : s.direction === "bearish" ? CHART_COLORS.rose : CHART_COLORS.amber;
          const w = s.direction === "neutral" ? "45%" : `${Math.min(95, 50 + Math.abs(s.value) * 15)}%`;
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-content-secondary truncate pr-2">{s.name}</span>
                <span className={`text-[10px] font-mono font-medium uppercase tracking-wider ${
                  s.direction === "bullish" ? "text-emerald-light" : s.direction === "bearish" ? "text-rose-light" : "text-amber-light"
                }`}>{s.direction}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: w, backgroundColor: c }} />
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t border-surface-border flex items-center justify-between">
          <span className="text-[10px] text-content-disabled"><Term id="convergence">Confluence</Term></span>
          <span className="text-[11px] font-bold text-gold font-mono">3/5 bullish</span>
        </div>
      </div>
    </div>
  );
}

/* ─── PAGE ───────────────────────────────────────────────────────────────── */

const FADE_UP = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
});

export default function DashboardHome() {
  const cfDelta = PORTFOLIO.monthlyCF - PORTFOLIO.cfPrevMonth;

  return (
    <main className="bg-luxury min-h-screen" aria-label="LootVue Dashboard">
      <div className="space-y-4 pb-8">

        {/* 1. AI Greeting ── */}
        <motion.div {...FADE_UP(0)}>
          <h1 className="text-xl font-display font-semibold text-content-primary">
            {getGreeting()} — portfolio up{" "}
            <span className="text-emerald-light font-mono">+{PORTFOLIO.valueYtdPct}% YTD</span>
          </h1>
          <p className="text-[13px] text-content-secondary mt-0.5">
            Rates moved <span className="font-mono text-rose-light">+12bps</span> since your last visit.{" "}
            Your buying power dropped <span className="font-mono text-rose-light">~2%</span> — re-run 123 Main St before making an offer.
          </p>
        </motion.div>

        {/* 2. Portfolio row (3 cards) ── */}
        <section aria-labelledby="portfolio-heading">
          <h2 id="portfolio-heading" className="sr-only">Portfolio Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Portfolio Value"
              value={fmtCompact(PORTFOLIO.totalValue)}
              subLabel={`+${PORTFOLIO.valueYtdPct}% YTD`}
              subUp sparkData={PORTFOLIO.valueTrend} sparkColor={CHART_COLORS.gold} delay={60}
            />
            <MetricCard
              label="Monthly Cash Flow"
              value={`+${fmtUSD(PORTFOLIO.monthlyCF)}/mo`}
              subLabel={`${cfDelta >= 0 ? "+" : ""}${fmtUSD(cfDelta)} vs last mo`}
              subUp={cfDelta >= 0} sparkData={PORTFOLIO.cfTrend} sparkColor={CHART_COLORS.emerald} delay={120}
            />
            <MetricCard
              label="Total Equity"
              value={fmtCompact(PORTFOLIO.totalEquity)}
              subLabel={`+${PORTFOLIO.equityYoYPct}% YoY`}
              subUp sparkData={PORTFOLIO.equityTrend} sparkColor={CHART_COLORS.gold} delay={180}
            />
          </div>
        </section>

        {/* 3. AI portfolio strip ── */}
        <motion.div {...FADE_UP(4)}>
          <AiInsightStrip
            summary={`Portfolio up ${PORTFOLIO.valueYtdPct}% YTD, beating national avg 4.1%. Austin is your top performer at +12.3%. Concentration risk: 36% in Austin — consider diversifying next acquisition.`}
            detail="Cash flow improved $240/mo quarter-over-quarter driven by lease renewals at higher market rates. Equity growth is outpacing appreciation due to accelerated amortization on your 15yr note."
            factors={[
              { label: "Austin appreciation",     value:  12.3, unit: "%" },
              { label: "Rent growth (avg)",        value:   4.8, unit: "%" },
              { label: "Rate environment",         value:  -0.8, unit: "%" },
              { label: "Vacancy improvement",      value:   1.2, unit: "pp" },
            ]}
            confidence="high"
            sources={["Portfolio API", "FRED", "Census"]}
          />
        </motion.div>

        {/* 4. Rates (2/3) + Market Pulse (1/3) ── */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" {...FADE_UP(5)}>
          <section aria-labelledby="rates-h" className="lg:col-span-2">
            <h2 id="rates-h" className="sr-only">Today&apos;s Rates</h2>
            <RatesCard />
          </section>
          <section aria-labelledby="pulse-h">
            <h2 id="pulse-h" className="sr-only">Market Pulse</h2>
            <MarketPulse />
          </section>
        </motion.div>

        {/* 4b. Rate Environment Analysis — Should I buy now or wait? */}
        <motion.div {...FADE_UP(5.5)}>
          <div className="glass p-0 overflow-hidden">
            <div className="p-5 pb-2">
              <h2 className="text-sm font-semibold text-content-primary">
                Rate Environment <span className="text-gold-light">Analysis</span>
              </h2>
              <p className="text-[11px] text-content-tertiary mt-0.5">
                How today&apos;s rates affect your deal economics. Should you buy now or wait?
              </p>
            </div>
            <div className="px-3 pb-4">
              <RateEnvironmentAnalysis />
            </div>
          </div>
        </motion.div>

        {/* 5. Recent Analyses (2/3) + Signal Convergence (1/3) ── */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" {...FADE_UP(6)}>
          <section aria-labelledby="analyses-h" className="lg:col-span-2">
            <h2 id="analyses-h" className="sr-only">Recent Analyses</h2>
            <RecentAnalyses />
          </section>
          <SignalMini />
        </motion.div>

        {/* 6. Urgency strip ── */}
        <motion.div className="glass-gold p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" {...FADE_UP(7)}>
          <AlertTriangle className="w-4 h-4 text-amber-light shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <p className="text-[13px] text-content-secondary flex-1">
            <span className="text-amber-light font-semibold">3 properties in your buy box sold this week.</span>
            {" "}Avg time to close in Austin: <span className="font-mono text-content-primary">11 days</span>.
            Rates dropped <span className="font-mono text-emerald-light">0.10%</span> — 123 Main St cash flow moves{" "}
            <span className="font-mono text-emerald-light">$450 → $510/mo</span>.
          </p>
          <Link href="/dashboard/analyze" className="btn-primary btn-sm shrink-0 inline-flex items-center gap-1.5">
            Re-analyze now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* 7. Where the Smart Money is Moving — 4D Multi-Dimensional Explorer ── */}
        <motion.div
          className="glass p-0 overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54, duration: 0.35, ease: "easeOut" }}
        >
          <div className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-content-primary">
                  Where the Smart Money is{" "}
                  <span className="text-gold-light">Moving</span>
                </h2>
                <p className="text-[11px] text-content-tertiary mt-0.5">
                  4D quant view — pick dimensions, add cities, scrub time. See capital flow from any angle.
                </p>
              </div>
              <Link
                href="/dashboard/markets"
                className="text-[11px] text-gold-light hover:text-gold transition-colors flex items-center gap-0.5 shrink-0"
                aria-label="Full market intelligence"
              >
                Full view <ChevronRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div style={{ height: 600 }}>
            <MultiDimensionalExplorer defaultCities={["Austin TX", "Tampa FL", "Nashville TN", "Charlotte NC", "Phoenix AZ"]} />
          </div>
        </motion.div>

        {/* 9. Next action CTA ── */}
        <motion.div className="glass p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" {...FADE_UP(9)}>
          <div className="w-8 h-8 rounded-xl bg-gold-muted flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-gold-light" aria-hidden="true" />
          </div>
          <p className="text-[13px] text-content-secondary flex-1">
            You have <span className="text-content-primary font-semibold">2 deals in pipeline</span>. Austin market avg close time is{" "}
            <span className="font-mono text-content-primary">11 days</span> — review before window closes.
          </p>
          <Link href="/dashboard/pipeline" className="btn-secondary btn-sm shrink-0 inline-flex items-center gap-1.5">
            Review Pipeline <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

      </div>
    </main>
  );
}
