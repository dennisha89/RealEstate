"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight, ArrowDownRight, ArrowRight, ChevronRight,
  RefreshCw, WifiOff, Clock, AlertTriangle,
  TrendingUp, TrendingDown, Search, Globe, SlidersHorizontal,
  Building2, Landmark, BarChart3, HelpCircle,
  Zap, Target, ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, Tooltip,
} from "recharts";
import {
  CHART_COLORS, generateTimeSeries,
} from "@/components/charts/ChartTheme";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { Term } from "@/components/shared/Term";
import { useUIStore } from "@/lib/stores/ui-store";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("en-US", opts).format(n);

const fmtUSD = (n: number) =>
  fmt(n, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtCompact = (n: number) =>
  fmt(n, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald-light";
  if (n >= 55) return "text-amber-light";
  return "text-rose-light";
}

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — replace with real API calls in data-wiring phase
   ═══════════════════════════════════════════════════════════════ */

// Portfolio summary
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

// Recent analyses
const RECENT_ANALYSES = [
  {
    address: "123 Main St, Austin TX",
    verdict: "BUY" as const,
    capRate: 7.2,
    cashFlow: 450,
    hoursAgo: 2,
    slug: "123-main-st-austin-tx",
  },
  {
    address: "456 Oak Ave, Tampa FL",
    verdict: "PASS" as const,
    capRate: 4.1,
    cashFlow: -280,
    hoursAgo: 28,
    slug: "456-oak-ave-tampa-fl",
  },
  {
    address: "789 Pine Rd, Nashville TN",
    verdict: "DIG" as const,
    capRate: 5.8,
    cashFlow: 120,
    hoursAgo: 72,
    slug: "789-pine-rd-nashville-tn",
  },
];

// Market pulse
const MARKET_PULSE = [
  {
    name: "Austin",
    slug: "austin",
    score: 74,
    bullishCount: 4,
    totalSignals: 5,
    sentiment: "bullish" as const,
    headline: "Supply tight",
  },
  {
    name: "Tampa",
    slug: "tampa",
    score: 71,
    bullishCount: 3,
    totalSignals: 5,
    sentiment: "bullish" as const,
    headline: "Jobs growing",
  },
  {
    name: "Denver",
    slug: "denver",
    score: 42,
    bullishCount: 1,
    totalSignals: 5,
    sentiment: "bearish" as const,
    headline: "Inventory up",
  },
];

// "What You're Missing" urgency items
const URGENCY_ITEMS = [
  {
    id: "missed-properties",
    icon: AlertTriangle,
    text: "While you've been analyzing, 3 properties in your buy box sold. Average time to close in Austin: 11 days.",
    accent: "amber" as const,
  },
  {
    id: "rate-impact",
    icon: TrendingDown,
    text: "Rates dropped 0.10% since your last analysis. That changes 123 Main St cash flow from $450 to $510/mo.",
    accent: "emerald" as const,
  },
];

// Rates API type
interface RateData {
  mortgage30yr: number | null;
  mortgage15yr: number | null;
  fedFunds: number | null;
  mortgage30yrChange: number | null;
  lastUpdated: string;
}

interface RateApiResponse {
  data: RateData;
  meta: { cached: boolean; freshness: string };
}

// Simple mode workflow missions (preserved from original)
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

/* ═══════════════════════════════════════════════════════════════
   SPARKLINE — 50px tall, no axes, no labels
   ═══════════════════════════════════════════════════════════════ */

function Sparkline({
  data,
  color = CHART_COLORS.gold,
  height = 50,
}: {
  data: { month: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const gradId = `spark-grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={() => null}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONVERGENCE DOTS
   ═══════════════════════════════════════════════════════════════ */

function ConvergenceDots({
  bullishCount,
  total,
}: {
  bullishCount: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`${bullishCount} of ${total} signals bullish`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`convergence-dot ${i < bullishCount ? "convergence-dot-bullish" : "convergence-dot-empty"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO SUMMARY CARD
   ═══════════════════════════════════════════════════════════════ */

function PortfolioSummaryCard({
  label,
  value,
  trendText,
  trendUp,
  sparkData,
  sparkColor,
  delay,
}: {
  label: string;
  value: string;
  trendText: string;
  trendUp: boolean;
  sparkData: { month: string; value: number }[];
  sparkColor: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="glass p-5 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        boxShadow: "0 0 30px -8px rgba(201,162,39,0.12), inset 0 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      <p className="metric-label mb-2">{label}</p>
      <p
        className="metric-value-lg metric-animated"
        aria-label={`${label}: ${value}`}
      >
        {value}
      </p>

      {/* Trend indicator */}
      <div
        className={`flex items-center gap-1 mt-1.5 text-[12px] font-mono ${
          trendUp ? "metric-trend-up" : "metric-trend-down"
        }`}
        aria-label={`Trend: ${trendText}`}
      >
        {trendUp ? (
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>{trendText}</span>
      </div>

      {/* Sparkline */}
      <div className="mt-3 -mx-1" aria-hidden="true">
        <Sparkline data={sparkData} color={sparkColor} height={50} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RATES CARD — fetches from FRED API
   ═══════════════════════════════════════════════════════════════ */

// Static DSCR / Hard Money rates (no public live source)
const STATIC_RATES = {
  dscr: 7.5,
  hardMoney: 11.2,
};

function RatesCard() {
  const [rates, setRates] = useState<RateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rates/current");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to fetch rates" }));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const json: RateApiResponse = await res.json();
      setRates(json.data);
      if (json.data.lastUpdated) {
        const diff = Date.now() - new Date(json.data.lastUpdated).getTime();
        const mins = Math.floor(diff / 60000);
        setUpdatedLabel(mins < 2 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const isLive = !error && rates !== null;
  const m30 = rates?.mortgage30yr;
  const m15 = rates?.mortgage15yr;
  const change30 = rates?.mortgage30yrChange;

  return (
    <div
      className="glass p-5"
      style={{ boxShadow: "0 0 24px -6px rgba(201,162,39,0.08), inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">
            Today&apos;s <span className="text-gold-light">Rates</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="status-pill status-pill-live" role="status" aria-label="Rates are live">
              Live
            </span>
          ) : error ? (
            <span className="flex items-center gap-1 text-[10px] text-content-disabled">
              <WifiOff className="w-3 h-3" aria-hidden="true" /> Offline
            </span>
          ) : null}
          {!loading && (
            <button
              onClick={fetchRates}
              className="p-1 rounded hover:bg-white/[0.05] transition-colors"
              aria-label="Refresh rates"
            >
              <RefreshCw className="w-3 h-3 text-content-disabled" aria-hidden="true" />
            </button>
          )}
          <Link
            href="/dashboard/rates"
            className="text-[11px] text-gold-light hover:text-gold transition-colors flex items-center gap-0.5"
            aria-label="View full rate details"
          >
            Details <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Rate grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 skeleton rounded" />
              <div className="h-7 w-20 skeleton rounded" />
              <div className="h-3 w-12 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 30yr Fixed */}
          <div>
            <p className="metric-label mb-1.5">30yr Fixed</p>
            <p className="font-mono text-[22px] font-bold text-content-primary tabular-nums leading-none">
              {m30 != null ? `${m30.toFixed(2)}%` : "N/A"}
            </p>
            {change30 != null && change30 !== 0 && (
              <div
                className={`flex items-center gap-0.5 mt-1.5 text-[11px] font-mono ${
                  change30 < 0 ? "metric-trend-down" : "metric-trend-up"
                }`}
                aria-label={`30yr rate ${change30 < 0 ? "down" : "up"} ${Math.abs(change30).toFixed(2)}%`}
              >
                {change30 < 0 ? (
                  <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                )}
                {change30 > 0 ? "+" : ""}{change30.toFixed(2)}
              </div>
            )}
          </div>

          {/* 15yr Fixed */}
          <div>
            <p className="metric-label mb-1.5">15yr Fixed</p>
            <p className="font-mono text-[22px] font-bold text-content-primary tabular-nums leading-none">
              {m15 != null ? `${m15.toFixed(2)}%` : "N/A"}
            </p>
            <p className="text-[11px] text-content-disabled mt-1.5 font-mono">—</p>
          </div>

          {/* DSCR Loan */}
          <div>
            <p className="metric-label mb-1.5">
              <Term id="dscr">DSCR</Term> Loan
            </p>
            <p className="font-mono text-[22px] font-bold text-content-primary tabular-nums leading-none">
              {STATIC_RATES.dscr.toFixed(2)}%
            </p>
            <p className="text-[11px] text-content-disabled mt-1.5 font-mono">~typical</p>
          </div>

          {/* Hard Money */}
          <div>
            <p className="metric-label mb-1.5">Hard Money</p>
            <p className="font-mono text-[22px] font-bold text-content-primary tabular-nums leading-none">
              {STATIC_RATES.hardMoney.toFixed(1)}%
            </p>
            <p className="text-[11px] text-content-disabled mt-1.5 font-mono">~typical</p>
          </div>
        </div>
      )}

      {/* AI rate commentary */}
      {!loading && !error && m30 != null && change30 != null && (
        <div className="mt-4 pt-3 border-t border-surface-border">
          <AiInsightStrip
            summary={
              change30 < 0
                ? `Rates dropped ${Math.abs(change30).toFixed(2)}% this week. That saves ${fmtUSD(Math.abs(change30 / 100) * 300000 / 12 * 12)}/yr on a $300K loan. Good time to lock if you have a deal under contract.`
                : change30 > 0
                ? `Rates rose ${change30.toFixed(2)}% this week. That adds $${Math.round((change30 / 100) * 300000 / 12)}/mo on a $300K loan. Price carefully on any offers you're planning.`
                : "Rates held flat this week. Focus on deal quality over rate timing."
            }
            confidence="medium"
            sources={["FRED"]}
          />
          {updatedLabel && (
            <p className="text-[10px] text-content-disabled mt-2">
              Source: FRED &middot; Updated {updatedLabel}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[11px] text-amber-light">
          {error.includes("FRED_API_KEY")
            ? "Add FRED_API_KEY to .env.local for live rates"
            : error}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RECENT ANALYSES ROW
   ═══════════════════════════════════════════════════════════════ */

const VERDICT_BADGE: Record<"BUY" | "PASS" | "DIG", string> = {
  BUY: "badge-emerald",
  PASS: "badge-rose",
  DIG: "badge-amber",
};

const VERDICT_LABEL: Record<"BUY" | "PASS" | "DIG", string> = {
  BUY: "BUY",
  PASS: "PASS",
  DIG: "DIG DEEPER",
};

function RecentAnalyses() {
  return (
    <div
      className="glass p-5"
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">
            Recent <span className="text-gold-light">Analyses</span>
          </h2>
        </div>
        <Link
          href="/dashboard/analyze"
          className="text-[11px] text-gold-light hover:text-gold transition-colors flex items-center gap-0.5"
          aria-label="See all analyses"
        >
          See all <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      {RECENT_ANALYSES.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Search className="w-8 h-8 text-content-disabled mb-2" aria-hidden="true" />
          <p className="text-sm text-content-tertiary mb-1">No analyses yet</p>
          <p className="text-xs text-content-disabled mb-3">Analyze any US address to get started</p>
          <Link href="/dashboard/analyze" className="btn-primary btn-sm">
            Analyze a Property
          </Link>
        </div>
      ) : (
        <table className="table-premium w-full" aria-label="Recent property analyses">
          <thead>
            <tr>
              <th scope="col" className="text-left">Address</th>
              <th scope="col" className="text-center">Verdict</th>
              <th scope="col" className="text-right hidden sm:table-cell">
                <Term id="cap-rate">Cap Rate</Term>
              </th>
              <th scope="col" className="text-right hidden sm:table-cell">Cash Flow</th>
              <th scope="col" className="text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ANALYSES.map(a => {
              const timeLabel =
                a.hoursAgo < 24
                  ? `${a.hoursAgo}h ago`
                  : `${Math.floor(a.hoursAgo / 24)}d ago`;
              return (
                <tr
                  key={a.slug}
                  className="cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/dashboard/analyze?address=${encodeURIComponent(a.address)}`)
                  }
                  aria-label={`Analyze ${a.address}: ${VERDICT_LABEL[a.verdict]}, cap rate ${a.capRate}%`}
                >
                  <td className="font-medium text-content-primary pr-4 max-w-[180px] truncate">
                    {a.address}
                  </td>
                  <td className="text-center">
                    <span className={VERDICT_BADGE[a.verdict]} role="img" aria-label={`Verdict: ${VERDICT_LABEL[a.verdict]}`}>
                      {VERDICT_LABEL[a.verdict]}
                    </span>
                  </td>
                  <td className="text-right font-mono hidden sm:table-cell">
                    {a.capRate.toFixed(1)}%
                  </td>
                  <td
                    className={`text-right font-mono hidden sm:table-cell ${
                      a.cashFlow >= 0 ? "text-emerald-light" : "text-rose-light"
                    }`}
                    aria-label={`Cash flow: ${a.cashFlow >= 0 ? "+" : ""}${fmtUSD(a.cashFlow)}/mo`}
                  >
                    {a.cashFlow < 0
                      ? `(${fmtUSD(Math.abs(a.cashFlow))})`
                      : `+${fmtUSD(a.cashFlow)}`}
                  </td>
                  <td className="text-right text-content-disabled text-[11px] font-mono whitespace-nowrap">
                    {timeLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARKET PULSE
   ═══════════════════════════════════════════════════════════════ */

function MarketPulse() {
  return (
    <div
      className="glass p-5"
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-content-primary">
            Market <span className="text-gold-light">Pulse</span>
          </h2>
        </div>
        <Link
          href="/dashboard/markets"
          className="text-[11px] text-gold-light hover:text-gold transition-colors flex items-center gap-0.5"
          aria-label="View all markets"
        >
          View all markets <ChevronRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="space-y-3" role="list" aria-label="Top market signals">
        {MARKET_PULSE.map(m => (
          <Link
            key={m.slug}
            href={`/dashboard/markets?focus=${m.slug}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
            role="listitem"
            aria-label={`${m.name}: score ${m.score}/100, ${m.bullishCount} of ${m.totalSignals} signals bullish. ${m.headline}`}
          >
            {/* Market name */}
            <span className="text-[13px] font-semibold text-content-primary group-hover:text-gold-light transition-colors w-16 shrink-0">
              {m.name}
            </span>

            {/* Score */}
            <span
              className={`font-mono text-[13px] font-bold tabular-nums w-14 shrink-0 ${scoreColor(m.score)}`}
            >
              {m.score}/100
            </span>

            {/* Convergence dots */}
            <ConvergenceDots bullishCount={m.bullishCount} total={m.totalSignals} />

            {/* Signal count */}
            <span className="text-[11px] text-content-disabled font-mono w-16 shrink-0 hidden sm:block">
              {m.bullishCount}/{m.totalSignals} bullish
            </span>

            {/* Headline */}
            <span className="text-[12px] text-content-secondary italic flex-1 truncate hidden md:block">
              &ldquo;{m.headline}&rdquo;
            </span>

            <ChevronRight className="w-3 h-3 text-content-disabled group-hover:text-gold-light transition-colors shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <AiInsightStrip
          summary="The strongest signal cluster is in the Southeast. Tampa and Jacksonville show tight supply with permits accelerating, while Denver faces headwinds from elevated inventory."
          confidence="high"
          sources={["FRED", "Census"]}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHAT YOU'RE MISSING — urgency card
   ═══════════════════════════════════════════════════════════════ */

function WhatYoureMissing() {
  return (
    <div
      className="glass-gold p-5"
      style={{
        boxShadow: "0 0 32px -8px rgba(201,162,39,0.15), inset 0 1px 0 0 rgba(201,162,39,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-gold-light" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-content-primary">
          What You&apos;re <span className="text-gold-light">Missing</span>
        </h2>
      </div>

      <div className="space-y-3">
        {URGENCY_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  item.accent === "amber" ? "bg-amber-muted" : "bg-emerald-muted"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    item.accent === "amber" ? "text-amber-light" : "text-emerald-light"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <p className="text-[13px] text-content-secondary leading-relaxed">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gold/10">
        <Link
          href="/dashboard/analyze"
          className="btn-primary btn-sm inline-flex"
          aria-label="Re-analyze your deals with current rates"
        >
          Re-analyze now
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEXT STEP CTA — personalized
   ═══════════════════════════════════════════════════════════════ */

function NextStepCta() {
  return (
    <div
      className="glass p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
    >
      <div className="w-9 h-9 rounded-xl bg-gold-muted flex items-center justify-center shrink-0">
        <Target className="w-4 h-4 text-gold-light" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-content-secondary leading-relaxed">
          You have <span className="text-content-primary font-semibold">2 deals in your pipeline</span>. Review them before the Austin market shifts — average time to close in this market is 11 days.
        </p>
      </div>
      <Link
        href="/dashboard/pipeline"
        className="btn-secondary btn-sm shrink-0 inline-flex items-center gap-1.5"
        aria-label="Review your deal pipeline"
      >
        Review Pipeline
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIMPLE MODE (preserved from original)
   ═══════════════════════════════════════════════════════════════ */

function SimpleModeDashboard() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-content-primary">{getGreeting()}</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          What do you want to figure out today? Pick a mission below.
        </p>
      </div>

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
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    m.accent === "gold" ? "bg-gold-muted" : "bg-emerald-muted"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${m.accent === "gold" ? "text-gold-light" : "text-emerald-light"}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-content-primary group-hover:text-gold-light transition-colors leading-snug">
                    {m.question}
                  </h3>
                  <p className="text-[12px] text-content-tertiary mt-1 leading-relaxed">{m.desc}</p>
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

      <div className="card border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-gold-light" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-content-primary">New to real estate investing?</h3>
            <p className="text-[12px] text-content-tertiary mt-1 leading-relaxed">
              Start with &quot;Is This Property Worth It?&quot; — paste any US address and we&apos;ll break down
              the numbers in plain English. No jargon, no spreadsheets.
            </p>
            <Link
              href="/dashboard/analyze"
              className="inline-flex items-center gap-1 mt-2 text-[12px] text-gold-light hover:text-gold transition-colors"
            >
              Analyze your first property <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardHome() {
  const appMode = useUIStore((state) => state.appMode);

  if (appMode === "simple") {
    return <SimpleModeDashboard />;
  }

  return (
    <main
      className="bg-luxury min-h-screen"
      aria-label="LootVue Dashboard — portfolio overview"
    >
      <div className="space-y-5 pb-8">

        {/* ── Greeting ── */}
        <div
          className="animate-fade-in"
          style={{ animationDelay: "0ms" }}
        >
          <h1 className="text-xl font-display font-semibold text-content-primary">
            {getGreeting()}
          </h1>
          <p className="text-[13px] text-content-tertiary mt-0.5">
            Your portfolio is up{" "}
            <span className="text-emerald-light font-medium font-mono">
              {PORTFOLIO.valueYtdPct}%
            </span>{" "}
            this year. Here&apos;s what needs attention today.
          </p>
        </div>

        {/* ── 1. Portfolio Summary Row ── */}
        <section aria-labelledby="portfolio-summary-heading">
          <h2 id="portfolio-summary-heading" className="sr-only">Portfolio Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PortfolioSummaryCard
              label="Portfolio Value"
              value={fmtCompact(PORTFOLIO.totalValue)}
              trendText={`+${PORTFOLIO.valueYtdPct}% YTD`}
              trendUp={true}
              sparkData={PORTFOLIO.valueTrend}
              sparkColor={CHART_COLORS.gold}
              delay={60}
            />
            <PortfolioSummaryCard
              label="Monthly Cash Flow"
              value={`+${fmtUSD(PORTFOLIO.monthlyCF)}/mo`}
              trendText={`+${fmtUSD(PORTFOLIO.monthlyCF - PORTFOLIO.cfPrevMonth)} vs last mo`}
              trendUp={true}
              sparkData={PORTFOLIO.cfTrend}
              sparkColor={CHART_COLORS.emerald}
              delay={120}
            />
            <PortfolioSummaryCard
              label="Total Equity"
              value={fmtCompact(PORTFOLIO.totalEquity)}
              trendText={`+${PORTFOLIO.equityYoYPct}% YoY`}
              trendUp={true}
              sparkData={PORTFOLIO.equityTrend}
              sparkColor={CHART_COLORS.gold}
              delay={180}
            />
          </div>
        </section>

        {/* ── 2. AI Portfolio Insight Strip ── */}
        <div
          className="animate-slide-up"
          style={{ animationDelay: "240ms", animationFillMode: "both" }}
        >
          <AiInsightStrip
            summary={`Your portfolio is up ${PORTFOLIO.valueYtdPct}% this year, outperforming the national average of 4.1%. Austin is your top performer at +12.3%.`}
            detail="Portfolio concentration is 36% in Austin — consider diversifying on your next acquisition to reduce single-market exposure. Cash flow improved $240/mo quarter-over-quarter, driven by lease renewals at higher market rates."
            factors={[
              { label: "Austin appreciation", value: 12.3, unit: "%" },
              { label: "Rent growth (portfolio avg)", value: 4.8, unit: "%" },
              { label: "Rate environment", value: -0.8, unit: "%" },
              { label: "Vacancy improvement", value: 1.2, unit: "pp" },
            ]}
            confidence="high"
            sources={["Portfolio API", "FRED", "Census"]}
          />
        </div>

        {/* ── 3. Today's Rates ── */}
        <section
          aria-labelledby="rates-heading"
          className="animate-slide-up"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <h2 id="rates-heading" className="sr-only">Today&apos;s Rates</h2>
          <RatesCard />
        </section>

        {/* ── 4. Recent Analyses ── */}
        <section
          aria-labelledby="recent-analyses-heading"
          className="animate-slide-up"
          style={{ animationDelay: "360ms", animationFillMode: "both" }}
        >
          <h2 id="recent-analyses-heading" className="sr-only">Recent Analyses</h2>
          <RecentAnalyses />
        </section>

        {/* ── 5. Market Pulse ── */}
        <section
          aria-labelledby="market-pulse-heading"
          className="animate-slide-up"
          style={{ animationDelay: "420ms", animationFillMode: "both" }}
        >
          <h2 id="market-pulse-heading" className="sr-only">Market Pulse</h2>
          <MarketPulse />
        </section>

        {/* ── 6 + 7. Two-column: What You're Missing + Portfolio detail link ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up"
          style={{ animationDelay: "480ms", animationFillMode: "both" }}
        >
          <WhatYoureMissing />

          {/* Portfolio deep-dive teaser */}
          <div
            className="glass p-5 flex flex-col justify-between"
            style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)" }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-content-primary">
                  Portfolio <span className="text-gold-light">Deep Dive</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {([
                  { label: "Properties", value: "4", sub: "across 3 markets" },
                  { label: "Avg DSCR", value: "1.28x", sub: "healthy coverage" },
                  { label: "Avg Cap Rate", value: "6.5%", sub: "above market avg 5.8%" },
                  { label: "Stress tested", value: "4/6", sub: "scenarios passed" },
                ] as { label: string; value: string; sub: string }[]).map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="metric-label mb-1">{item.label}</p>
                    <p className="font-mono font-bold text-[15px] text-content-primary tabular-nums">
                      {item.value}
                    </p>
                    <p className="text-[10px] text-content-disabled mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/dashboard/portfolio"
              className="btn-secondary btn-sm inline-flex items-center gap-1.5 self-start"
              aria-label="View full portfolio analysis"
            >
              Full Portfolio Analysis
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── 8. Next Step CTA ── */}
        <div
          className="animate-slide-up"
          style={{ animationDelay: "540ms", animationFillMode: "both" }}
        >
          <NextStepCta />
        </div>

      </div>
    </main>
  );
}
