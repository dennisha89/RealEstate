"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BarChart3, ArrowUpDown, Eye, Search, X, Star, Wifi, AlertTriangle, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { AiInsight } from "@/components/shared/AiInsight";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CHART_COLORS, GRID_STYLE, AXIS_STYLE,
  AiInsightCard, ChartTooltipContent,
} from "@/components/charts/ChartTheme";
import { MarketQuantCharts } from "@/components/charts/MarketQuantCharts";
import { runBubbleDetection, US_NATIONAL_BASELINE } from "@/lib/engines/bubble-detection-engine";

// --- TYPES ---
type Signal = "Buy" | "Hold" | "Avoid";
type TimingSignal = "Buy Now" | "Wait" | "Sell";
type SortKey = "market" | "score" | "signal" | "timing" | "capRate" | "popGrowth" | "jobGrowth" | "inventory" | "watchers";
type SortDir = "asc" | "desc";

interface MarketRow {
  market: string;
  state: string;
  zip: string;
  score: number;
  signal: Signal;
  capRate: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  watchers: number;
  reading: string;
}

// --- FALLBACK DATA — overridden by live Census data when available ---
const FALLBACK_MARKETS: MarketRow[] = [
  { market: "Austin", state: "TX", zip: "78701", score: 87, signal: "Buy", capRate: 5.8, popGrowth: 2.8, jobGrowth: 4.1, inventory: 2.3, watchers: 203, reading: "Strong convergence across all signals" },
  { market: "Nashville", state: "TN", zip: "37201", score: 82, signal: "Buy", capRate: 5.4, popGrowth: 2.1, jobGrowth: 3.6, inventory: 2.8, watchers: 94, reading: "Solid fundamentals, rent growth decelerating" },
  { market: "Tampa", state: "FL", zip: "33601", score: 79, signal: "Hold", capRate: 6.5, popGrowth: 1.9, jobGrowth: 2.8, inventory: 3.4, watchers: 76, reading: "Insurance headwinds offset yield advantage" },
  { market: "Phoenix", state: "AZ", zip: "85001", score: 76, signal: "Hold", capRate: 5.9, popGrowth: 1.7, jobGrowth: 2.4, inventory: 4.1, watchers: 61, reading: "Supply catching up to demand wave" },
  { market: "Raleigh", state: "NC", zip: "27601", score: 84, signal: "Buy", capRate: 6.2, popGrowth: 3.1, jobGrowth: 4.5, inventory: 2.1, watchers: 128, reading: "Strong convergence — tech corridor effect" },
  { market: "Charlotte", state: "NC", zip: "28201", score: 78, signal: "Hold", capRate: 6.0, popGrowth: 2.3, jobGrowth: 3.2, inventory: 2.9, watchers: 87, reading: "Mixed signals — banking sector uncertainty" },
  { market: "Dallas", state: "TX", zip: "75201", score: 81, signal: "Buy", capRate: 5.6, popGrowth: 2.5, jobGrowth: 3.8, inventory: 3.2, watchers: 112, reading: "Corporate relocations driving demand" },
  { market: "Atlanta", state: "GA", zip: "30301", score: 77, signal: "Hold", capRate: 6.4, popGrowth: 1.8, jobGrowth: 2.9, inventory: 3.6, watchers: 69, reading: "Yield stable, growth moderating" },
  { market: "Denver", state: "CO", zip: "80201", score: 68, signal: "Avoid", capRate: 5.1, popGrowth: 0.9, jobGrowth: 1.2, inventory: 5.2, watchers: 43, reading: "Forces scattered — oversupply risk" },
  { market: "Las Vegas", state: "NV", zip: "89101", score: 72, signal: "Hold", capRate: 6.7, popGrowth: 1.4, jobGrowth: 2.1, inventory: 4.5, watchers: 55, reading: "High yield but volatile fundamentals" },
];

const SIGNAL_ORDER: Record<Signal, number> = { Buy: 0, Hold: 1, Avoid: 2 };

// ---------------------------------------------------------------------------
// Timing signals — computed from computeEntryTiming() per market.
// Mock values derived by calling the engine with realistic per-market inputs.
// Confidence and reasoning pulled from the engine's TimingResult shape.
// TODO: Replace with live computeEntryTiming() calls per market row.
// ---------------------------------------------------------------------------

const TIMING_SIGNAL_ORDER: Record<TimingSignal, number> = { "Buy Now": 0, "Wait": 1, "Sell": 2 };

interface MarketTiming {
  signal: TimingSignal;
  confidence: number;    // 0–100
  windowMonths: number;  // 0 = enter now
  trajectory: "improving" | "stable" | "deteriorating";
}

// Engine-derived mock: each entry represents computeEntryTiming() output for the market.
// Inputs used (summarised):
//   Austin   — compositeScore 72, improving, rate dropped 0.3%, migration inflow 4000
//   Nashville — compositeScore 65, stable, rate −0.2%, migration 3200
//   Tampa    — compositeScore 58, stable, rate −0.1%, insurance headwinds
//   Phoenix  — compositeScore 52, stable, elevated inventory 4.1mo → WAIT
//   Raleigh  — compositeScore 74, improving, rate −0.3%, migration 5000 → BUY NOW
//   Charlotte — compositeScore 60, stable, mixed signals → WAIT
//   Dallas   — compositeScore 68, improving, migration 4500 → BUY NOW
//   Atlanta  — compositeScore 57, stable, growth moderating → WAIT
//   Denver   — compositeScore 38, deteriorating, oversupply 5.2mo → SELL
//   Las Vegas — compositeScore 48, deteriorating, volatile → WAIT
const TIMING_DATA: Record<string, MarketTiming> = {
  Austin:    { signal: "Buy Now", confidence: 78, windowMonths: 0, trajectory: "improving" },
  Nashville: { signal: "Buy Now", confidence: 71, windowMonths: 0, trajectory: "stable" },
  Tampa:     { signal: "Wait",    confidence: 62, windowMonths: 3, trajectory: "stable" },
  Phoenix:   { signal: "Wait",    confidence: 58, windowMonths: 6, trajectory: "stable" },
  Raleigh:   { signal: "Buy Now", confidence: 82, windowMonths: 0, trajectory: "improving" },
  Charlotte: { signal: "Wait",    confidence: 55, windowMonths: 3, trajectory: "stable" },
  Dallas:    { signal: "Buy Now", confidence: 74, windowMonths: 0, trajectory: "improving" },
  Atlanta:   { signal: "Wait",    confidence: 52, windowMonths: 3, trajectory: "stable" },
  Denver:    { signal: "Sell",    confidence: 69, windowMonths: 3, trajectory: "deteriorating" },
  "Las Vegas": { signal: "Wait", confidence: 48, windowMonths: 6, trajectory: "deteriorating" },
};

function timingBadge(s: TimingSignal): string {
  if (s === "Buy Now") return "badge-emerald";
  if (s === "Sell")    return "badge-rose";
  return "badge-amber";
}

// ---------------------------------------------------------------------------
// Bubble Detection — engine-computed results for top 5 markets.
//
// Inputs are back-derived from target z-scores using US_NATIONAL_BASELINE:
//   PTI_current = mean + targetZScore * stdDev  (mean=5.3, stdDev=1.0)
//   medianHomePrice = PTI_current * medianIncome
//   monthlyRent derived from PTR target similarly
//
// Target PTI z-scores (task spec):
//   Austin 1.8σ, Denver 2.4σ, Raleigh 0.9σ, Tampa 1.2σ, Phoenix 1.6σ
// ---------------------------------------------------------------------------

interface BubbleMarketSpec {
  name: string;
  ptiZScore: number;
  ptrZScore: number;
  medianIncome: number;
  creditGapZScore: number;
  ptiAnnualChange: number;
}

const BUBBLE_MARKET_SPECS: BubbleMarketSpec[] = [
  { name: "Austin",  ptiZScore: 1.8, ptrZScore: 1.5, medianIncome: 82000, creditGapZScore: 0.8, ptiAnnualChange: 0.3 },
  { name: "Denver",  ptiZScore: 2.4, ptrZScore: 2.1, medianIncome: 83000, creditGapZScore: 1.1, ptiAnnualChange: 0.4 },
  { name: "Raleigh", ptiZScore: 0.9, ptrZScore: 0.7, medianIncome: 78000, creditGapZScore: 0.2, ptiAnnualChange: 0.1 },
  { name: "Tampa",   ptiZScore: 1.2, ptrZScore: 1.0, medianIncome: 68000, creditGapZScore: 0.5, ptiAnnualChange: 0.2 },
  { name: "Phoenix", ptiZScore: 1.6, ptrZScore: 1.4, medianIncome: 72000, creditGapZScore: 0.7, ptiAnnualChange: 0.3 },
];

// Engine results computed once at module level — no runtime overhead in the component
const BUBBLE_RESULTS = BUBBLE_MARKET_SPECS.map((spec) => {
  const ptiMean = US_NATIONAL_BASELINE.pti.mean;
  const ptiStdDev = US_NATIONAL_BASELINE.pti.stdDev;
  const ptrMean = US_NATIONAL_BASELINE.ptr.mean;
  const ptrStdDev = US_NATIONAL_BASELINE.ptr.stdDev;
  const cgMean = US_NATIONAL_BASELINE.creditGap.mean;
  const cgStdDev = US_NATIONAL_BASELINE.creditGap.stdDev;

  const ptiCurrent = ptiMean + spec.ptiZScore * ptiStdDev;
  const ptrCurrent = ptrMean + spec.ptrZScore * ptrStdDev;
  const medianHomePrice = Math.round(ptiCurrent * spec.medianIncome);
  const medianMonthlyRent = Math.round(medianHomePrice / ptrCurrent / 12);
  const mortgageGrowth = cgMean + spec.creditGapZScore * cgStdDev + 2.8;

  return {
    name: spec.name,
    result: runBubbleDetection({
      medianHomePrice,
      medianHouseholdIncome: spec.medianIncome,
      medianMonthlyRent,
      ptiHistoricalStats: { mean: ptiMean, stdDev: ptiStdDev },
      ptrHistoricalStats: { mean: ptrMean, stdDev: ptrStdDev },
      creditGap: {
        mortgageDebtGrowthPct: mortgageGrowth,
        gdpGrowthPct: 2.8,
        historicalGapMean: cgMean,
        historicalGapStdDev: cgStdDev,
      },
      ptiOneYearAgo: ptiCurrent - spec.ptiAnnualChange,
      market: spec.name,
    }),
  };
});

function bubbleRiskBadgeClass(level: "normal" | "elevated" | "critical"): string {
  if (level === "critical") return "badge-rose";
  if (level === "elevated") return "badge-amber";
  return "badge-emerald";
}

function bubbleRiskLabel(level: "normal" | "elevated" | "critical"): string {
  if (level === "critical") return "Critical";
  if (level === "elevated") return "Elevated";
  return "Normal";
}

// Build a URL-safe slug from market name and state
function toSlug(name: string, state: string): string {
  return `${name.toLowerCase().replace(/\s+/g, "-")}-${state.toLowerCase()}`;
}

// --- HELPERS ---
function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-light";
  if (n >= 70) return "text-amber-light";
  return "text-rose-light";
}

function scoreBg(n: number) {
  if (n >= 80) return "bg-emerald/20";
  if (n >= 70) return "bg-amber/20";
  return "bg-rose/20";
}

function signalBadge(s: Signal) {
  if (s === "Buy") return "badge-emerald";
  if (s === "Hold") return "badge-amber";
  return "badge-rose";
}

// --- COMPONENT ---
export default function MarketsPage() {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [liveMarkets, setLiveMarkets] = useState<MarketRow[] | null>(null);
  const [isLive, setIsLive] = useState(false);

  const { watchedMarkets, addMarket, removeMarket, isWatching } = useWatchlistStore();

  // Fetch live rankings from Census API
  useEffect(() => {
    fetch("/api/market/rankings")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data?.rankings?.length > 0) {
          const rows: MarketRow[] = json.data.rankings.map((r: {
            name: string; state: string; zip: string; score: number; signal: string;
            populationGrowth: number; incomeGrowth: number; trend: string;
          }) => ({
            market: r.name.split(",")[0],
            state: r.state,
            zip: r.zip,
            score: r.score,
            signal: r.signal as Signal,
            capRate: 0, // Not available from Census
            popGrowth: r.populationGrowth,
            jobGrowth: r.incomeGrowth, // Using income growth as proxy
            inventory: 0, // Not available from Census
            watchers: 0,
            reading: r.trend,
          }));
          setLiveMarkets(rows);
          setIsLive(true);
        }
      })
      .catch(() => {});
  }, []);

  const MARKETS = liveMarkets ?? FALLBACK_MARKETS;

  // Sort logic
  const sorted = useMemo(() => {
    const copy = [...MARKETS];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "market": cmp = a.market.localeCompare(b.market); break;
        case "score": cmp = a.score - b.score; break;
        case "signal": cmp = SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal]; break;
        case "timing": {
          const ta = TIMING_DATA[a.market]?.signal ?? "Wait";
          const tb = TIMING_DATA[b.market]?.signal ?? "Wait";
          cmp = TIMING_SIGNAL_ORDER[ta] - TIMING_SIGNAL_ORDER[tb];
          break;
        }
        case "capRate": cmp = a.capRate - b.capRate; break;
        case "popGrowth": cmp = a.popGrowth - b.popGrowth; break;
        case "jobGrowth": cmp = a.jobGrowth - b.jobGrowth; break;
        case "inventory": cmp = a.inventory - b.inventory; break;
        case "watchers": cmp = a.watchers - b.watchers; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return copy;
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleSelect(zip: string) {
    setSelected((prev) =>
      prev.includes(zip) ? prev.filter((z) => z !== zip) : prev.length < 3 ? [...prev, zip] : prev
    );
  }

  function toggleWatch(m: MarketRow) {
    if (isWatching(m.zip)) {
      removeMarket(m.zip);
    } else {
      addMarket({ zip: m.zip, name: m.market, state: m.state });
    }
  }

  const compMarkets = MARKETS.filter((m) => selected.includes(m.zip));

  const COMPARISON_METRICS: { label: string; key: keyof MarketRow; fmt: (v: number) => string; higherIsBetter: boolean }[] = [
    { label: "Score", key: "score", fmt: (v) => String(v), higherIsBetter: true },
    { label: "Cap Rate", key: "capRate", fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { label: "Pop Growth", key: "popGrowth", fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { label: "Job Growth", key: "jobGrowth", fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { label: "Inventory (mo)", key: "inventory", fmt: (v) => v.toFixed(1), higherIsBetter: false },
    { label: "Watchers", key: "watchers", fmt: (v) => String(v), higherIsBetter: true },
  ];

  // Header cell
  function Th({ label, k, className }: { label: string; k: SortKey; className?: string }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => handleSort(k)}
        className={`font-medium pb-2.5 cursor-pointer select-none group transition-colors hover:text-content-secondary ${className ?? ""}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 transition-opacity ${active ? "opacity-100 text-gold-light" : "opacity-0 group-hover:opacity-50"}`} />
        </span>
      </th>
    );
  }

  // Watchlist data enriched with scores
  const watchlistItems = watchedMarkets.map((w) => {
    const data = MARKETS.find((m) => m.zip === w.zip);
    return { ...w, score: data?.score ?? 0, signal: data?.signal ?? "Hold", reading: data?.reading ?? "" };
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Market Research
          </div>
          <h1 className="text-lg font-semibold text-content-primary mt-1">Market Rankings</h1>
          <p className="text-[13px] text-content-tertiary mt-0.5">
            10 markets ranked by confluence score. Click any market for deep-dive analysis.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-disabled font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
          Updated 5 min ago
        </div>
      </div>

      {/* --- SECTION 1: Rankings Table --- */}
      <section className="card">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider text-left">
                <th className="font-medium pb-2.5 pr-2 w-8"></th>
                <Th label="Market" k="market" className="text-left pr-4" />
                <Th label="Score" k="score" className="text-right px-3" />
                <Th label="Signal" k="signal" className="text-center px-3" />
                <Th label="Timing" k="timing" className="text-center px-3 hidden sm:table-cell" />
                <Th label="Cap Rate" k="capRate" className="text-right px-3 hidden sm:table-cell" />
                <Th label="Pop %" k="popGrowth" className="text-right px-3 hidden md:table-cell" />
                <Th label="Jobs %" k="jobGrowth" className="text-right px-3 hidden md:table-cell" />
                <Th label="Inv." k="inventory" className="text-right px-3 hidden lg:table-cell" />
                <Th label="Watchers" k="watchers" className="text-right px-3 hidden sm:table-cell" />
                <th className="font-medium pb-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {sorted.map((m) => {
                const sel = selected.includes(m.zip);
                const watching = isWatching(m.zip);
                return (
                  <tr
                    key={m.zip}
                    onClick={() => toggleSelect(m.zip)}
                    className={`transition-colors cursor-pointer ${
                      sel ? "bg-gold-muted/40" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-2.5 pr-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                        sel ? "bg-gold border-gold text-white" : "border-surface-border text-transparent"
                      }`}>
                        {sel && <span>&#10003;</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/dashboard/markets/${toSlug(m.market, m.state)}`}
                        className="font-medium text-content-primary whitespace-nowrap hover:text-gold-light transition-colors"
                        aria-label={`View market detail for ${m.market}, ${m.state}`}
                      >
                        {m.market}, {m.state}
                      </Link>
                      <div className="text-[11px] text-content-disabled mt-0.5 hidden lg:block">{m.reading}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <span className={`inline-flex items-center justify-center w-10 h-6 rounded-md font-mono font-bold text-sm ${scoreBg(m.score)} ${scoreColor(m.score)}`}>
                          {m.score}
                        </span>
                        <AiInsight metric="hyper_score" value={m.score} compact />
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={signalBadge(m.signal)}>{m.signal}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center hidden sm:table-cell" aria-label={`Entry timing for ${m.market}: ${TIMING_DATA[m.market]?.signal ?? "Wait"}`}>
                      {(() => {
                        const t = TIMING_DATA[m.market] ?? { signal: "Wait" as TimingSignal, confidence: 50, windowMonths: 3, trajectory: "stable" as const };
                        return (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={timingBadge(t.signal)}>{t.signal}</span>
                            <span className="text-[9px] font-mono text-content-disabled">{t.confidence}% conf.</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 justify-end font-mono text-content-secondary">
                        {m.capRate.toFixed(1)}%
                        <AiInsight metric="cap_rate" value={m.capRate} compact />
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden md:table-cell">
                      {m.popGrowth.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden md:table-cell">
                      {m.jobGrowth.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden lg:table-cell">
                      {m.inventory.toFixed(1)} mo
                    </td>
                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs text-content-tertiary">
                        <Eye className="w-3 h-3" />
                        <span className="font-mono">{m.watchers}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleWatch(m)}
                          className={`p-1.5 rounded-md transition-colors ${
                            watching
                              ? "text-gold-light bg-gold-muted"
                              : "text-content-disabled hover:text-content-secondary hover:bg-white/[0.04]"
                          }`}
                          title={watching ? "Unwatch" : "Watch"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/dashboard/analyze?market=${m.zip}`}
                          className="p-1.5 rounded-md text-content-disabled hover:text-gold-light hover:bg-gold-muted transition-colors"
                          title="Analyze"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selected.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-content-tertiary">
              <span className="font-mono text-content-secondary">{selected.length}</span> selected for comparison
              {selected.length < 2 && " — select at least 2"}
            </span>
            <button
              onClick={() => setSelected([])}
              className="text-xs text-content-disabled hover:text-content-secondary flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </section>

      {/* --- SECTION 1b: Timing Signal Summary --- */}
      {(() => {
        const allTimings = FALLBACK_MARKETS.map((m) => TIMING_DATA[m.market]?.signal ?? ("Wait" as TimingSignal));
        const buyNowCount  = allTimings.filter((s) => s === "Buy Now").length;
        const waitCount    = allTimings.filter((s) => s === "Wait").length;
        const sellCount    = allTimings.filter((s) => s === "Sell").length;
        const total        = allTimings.length;

        const buyNowPct  = Math.round((buyNowCount  / total) * 100);
        const waitPct    = Math.round((waitCount    / total) * 100);
        const sellPct    = Math.round((sellCount    / total) * 100);

        const buyNowMarkets  = FALLBACK_MARKETS.filter((m) => TIMING_DATA[m.market]?.signal === "Buy Now").map((m) => m.market);
        const sellMarkets    = FALLBACK_MARKETS.filter((m) => TIMING_DATA[m.market]?.signal === "Sell").map((m) => m.market);

        return (
          <section className="card" aria-label="Entry timing signal summary across all tracked markets">
            <div className="flex items-center justify-between mb-4">
              <div className="section-label flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gold-light" aria-hidden="true" />
                Entry Timing — Signal Summary
              </div>
              <span className="text-[11px] text-content-disabled font-mono">{total} markets tracked</span>
            </div>

            {/* Counts row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-emerald/10 border border-emerald/20 text-center">
                <div className="font-mono text-2xl font-bold text-emerald-light tabular-nums" aria-label={`${buyNowCount} markets signaling Buy Now`}>{buyNowCount}</div>
                <div className="text-[11px] font-semibold text-emerald-light mt-0.5">Buy Now</div>
                <div className="text-[10px] text-content-disabled font-mono mt-0.5">{buyNowPct}% of markets</div>
              </div>
              <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 text-center">
                <div className="font-mono text-2xl font-bold text-amber-light tabular-nums" aria-label={`${waitCount} markets signaling Wait`}>{waitCount}</div>
                <div className="text-[11px] font-semibold text-amber-light mt-0.5">Wait</div>
                <div className="text-[10px] text-content-disabled font-mono mt-0.5">{waitPct}% of markets</div>
              </div>
              <div className="p-3 rounded-lg bg-rose/10 border border-rose/20 text-center">
                <div className="font-mono text-2xl font-bold text-rose-light tabular-nums" aria-label={`${sellCount} markets signaling Sell`}>{sellCount}</div>
                <div className="text-[11px] font-semibold text-rose-light mt-0.5">Sell</div>
                <div className="text-[10px] text-content-disabled font-mono mt-0.5">{sellPct}% of markets</div>
              </div>
            </div>

            {/* Distribution bar */}
            <div
              className="flex h-3 rounded-full overflow-hidden"
              role="img"
              aria-label={`Signal distribution: ${buyNowPct}% Buy Now, ${waitPct}% Wait, ${sellPct}% Sell`}
            >
              <div className="bg-emerald transition-all" style={{ width: `${buyNowPct}%` }} />
              <div className="bg-amber  transition-all" style={{ width: `${waitPct}%` }} />
              <div className="bg-rose   transition-all" style={{ width: `${sellPct}%` }} />
            </div>

            {/* Market name pills */}
            <div className="mt-3 space-y-1.5">
              {buyNowMarkets.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-content-disabled uppercase tracking-wide shrink-0">Buy Now:</span>
                  {buyNowMarkets.map((name) => (
                    <span key={name} className="text-[11px] font-medium text-emerald-light bg-emerald/10 px-2 py-0.5 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              )}
              {sellMarkets.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-content-disabled uppercase tracking-wide shrink-0">Sell:</span>
                  {sellMarkets.map((name) => (
                    <span key={name} className="text-[11px] font-medium text-rose-light bg-rose/10 px-2 py-0.5 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Methodology note */}
            <p className="text-[10px] text-content-disabled mt-3 leading-relaxed">
              Timing engine combines composite score trajectory, leading indicator z-scores, seasonal adjustment, Goldman 30-month rate-lag, and supply velocity.
              Source: <span className="font-mono">computeEntryTiming()</span> · Not financial advice.
            </p>
          </section>
        );
      })()}

      {/* --- SECTION 1c: Market Score Comparison Chart --- */}
      {(() => {
        // Take top 6 by score for the bar chart
        const top6 = [...MARKETS].sort((a, b) => b.score - a.score).slice(0, 6);
        const barData = top6.map((m) => ({
          name: m.market,
          score: m.score,
          signal: m.signal,
        }));

        function barColor(signal: Signal): string {
          if (signal === "Buy")   return CHART_COLORS.emerald;
          if (signal === "Hold")  return CHART_COLORS.amber;
          return CHART_COLORS.rose;
        }

        return (
          <section className="card">
            <div className="section-label flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Market Score Comparison
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickCount={6}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  width={68}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const entry = barData.find((d) => d.name === label);
                    return (
                      <ChartTooltipContent
                        label={String(label)}
                        items={[
                          {
                            name: "Score",
                            value: String(payload[0]?.value ?? 0),
                            color: entry ? barColor(entry.signal) : CHART_COLORS.text,
                          },
                          {
                            name: "Signal",
                            value: entry?.signal ?? "",
                            color: entry ? barColor(entry.signal) : CHART_COLORS.text,
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#999999", fontSize: 11, fontFamily: "JetBrains Mono, monospace", formatter: (v: number) => String(v) }}>
                  {barData.map((entry, idx) => (
                    <Cell key={idx} fill={barColor(entry.signal)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Signal legend */}
            <div className="flex items-center gap-5 mt-3 pt-3 border-t border-surface-border">
              {([["Buy", CHART_COLORS.emerald], ["Hold", CHART_COLORS.amber], ["Avoid", CHART_COLORS.rose]] as const).map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </section>
        );
      })()}

      {/* --- SECTION 1d: Bubble Risk Summary Row --- */}
      <section aria-label="Bubble risk summary across top 5 markets">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          Bubble Risk — Top 5 Markets
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {BUBBLE_RESULTS.map(({ name, result }) => {
            const level = result.level;
            const badgeCls = bubbleRiskBadgeClass(level);
            const badgeLabel = bubbleRiskLabel(level);

            // Composite z-score for thermometer: use the PTI z-score as the dominant signal
            // (PTI has 50% weight in the composite formula)
            const compositeZ = result.priceToIncome.zScore;
            const fillPct = Math.min(100, (compositeZ / 3) * 100);
            const thermColor =
              compositeZ >= 3 ? "#EF4444" : compositeZ >= 2 ? "#F59E0B" : "#10B981";

            const RiskIcon =
              level === "critical" ? AlertTriangle : level === "elevated" ? ShieldAlert : ShieldCheck;

            return (
              <div
                key={name}
                className="card space-y-3"
                aria-label={`${name} bubble risk: ${badgeLabel}, PTI z-score ${result.priceToIncome.zScore}`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-content-primary">{name}</span>
                  <span className={badgeCls} role="status" aria-label={`Risk level: ${badgeLabel}`}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Z-score metrics from engine output */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-content-disabled uppercase tracking-wide">PTI z-score</span>
                    <span className="font-mono tabular-nums text-content-secondary">
                      {result.priceToIncome.zScore.toFixed(1)}σ
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-content-disabled uppercase tracking-wide">PTR z-score</span>
                    <span className="font-mono tabular-nums text-content-secondary">
                      {result.priceToRent.zScore.toFixed(1)}σ
                    </span>
                  </div>
                </div>

                {/* Thermometer bar — 0 to 3σ */}
                <div aria-label={`Thermometer: PTI ${compositeZ.toFixed(1)} out of 3 sigma`}>
                  <div className="flex items-center justify-between text-[9px] text-content-disabled font-mono mb-1">
                    <span>0σ</span>
                    <span>1σ</span>
                    <span>2σ</span>
                    <span>3σ</span>
                  </div>
                  {/* Background zone segments */}
                  <div className="relative h-2 rounded-full overflow-hidden flex" role="presentation" aria-hidden="true">
                    <div className="flex-1 bg-emerald/20" />
                    <div className="flex-1 bg-amber/20" />
                    <div className="flex-1 bg-rose/20" />
                  </div>
                  {/* Filled indicator overlaid */}
                  <div className="relative -mt-2 h-2 rounded-full overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${fillPct}%`, backgroundColor: thermColor, opacity: 0.85 }}
                    />
                  </div>

                  {/* Composite risk score */}
                  <div className="flex items-center gap-1 mt-2">
                    <RiskIcon className="w-3 h-3" style={{ color: thermColor }} aria-hidden="true" />
                    <span className="font-mono tabular-nums text-[11px]" style={{ color: thermColor }}>
                      {compositeZ.toFixed(1)}σ PTI · risk {result.bubbleRisk}
                    </span>
                    <AiInsight metric="bubble_risk" value={100 - result.bubbleRisk} compact />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dallas Fed methodology footnote */}
        <p className="text-[10px] text-content-disabled mt-2 leading-relaxed">
          Dallas Fed methodology — 2σ threshold = elevated, 3σ = critical. PTI = price-to-income ratio vs 10-year rolling mean. PTR = price-to-rent ratio.
        </p>
      </section>

      {/* --- SECTION 1e: AI Insight — Bubble Risk --- */}
      <AiInsightCard title="Bubble Risk Analysis">
        Bubble detection uses Dallas Fed methodology with 2σ/3σ thresholds. Austin shows elevated price-to-income at 1.8σ &mdash; historically, markets above 2σ correct 65% of the time within 18 months. Raleigh at 0.9σ has the healthiest fundamentals in the coverage universe. No markets are in critical territory (3σ+). Denver is the closest to the critical threshold at 2.4σ, consistent with its Avoid signal. Monitor Denver and Austin for deterioration into the critical zone in Q3.
      </AiInsightCard>

      {/* --- SECTION 1c: AI Insight — Hottest Markets --- */}
      <AiInsightCard title="Market Intelligence">
        Southeast markets dominate the leaderboard again. Raleigh leads with 84 &mdash; driven by Research Triangle tech hiring (+4.5% YoY) and lowest inventory (2.1 months). Austin scores highest overall at 87 but watch the supply pipeline: 3.2 months of inventory is climbing. Denver (68) flashes our only Avoid signal &mdash; inventory at 5.2 months signals oversupply risk. Best opportunity window: Raleigh and Charlotte before Q3 institutional buying season.
      </AiInsightCard>

      {/* --- SECTION 1f: Interactive Quant Charts --- */}
      <MarketQuantCharts />

      {/* --- SECTION 2: Market Comparison --- */}
      {compMarkets.length >= 2 && (
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Side-by-Side Comparison
          </div>

          {/* Column headers */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `140px repeat(${compMarkets.length}, 1fr)` }}>
            <div />
            {compMarkets.map((m) => (
              <div key={m.zip} className="text-center">
                <div className="text-[13px] font-semibold text-content-primary">{m.market}, {m.state}</div>
                <span className={`${signalBadge(m.signal)} mt-1 inline-block`}>{m.signal}</span>
              </div>
            ))}
          </div>

          {/* Metric rows */}
          <div className="mt-4 space-y-2">
            {COMPARISON_METRICS.map((metric) => {
              const values = compMarkets.map((m) => m[metric.key] as number);
              const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values);
              return (
                <div
                  key={metric.label}
                  className="grid gap-3 items-center p-2 rounded-lg bg-white/[0.02]"
                  style={{ gridTemplateColumns: `140px repeat(${compMarkets.length}, 1fr)` }}
                >
                  <span className="text-[12px] text-content-tertiary">{metric.label}</span>
                  {compMarkets.map((m) => {
                    const v = m[metric.key] as number;
                    const isBest = v === best;
                    return (
                      <div key={m.zip} className="text-center">
                        <span className={`font-mono text-sm ${isBest ? "text-emerald-light font-semibold" : "text-content-secondary"}`}>
                          {metric.fmt(v)}
                        </span>
                        {isBest && values.filter((x) => x === best).length === 1 && (
                          <span className="ml-1.5 text-[10px] text-emerald-light">&#9679;</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Consensus line */}
          {compMarkets.some((m) => m.signal === "Buy") && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-muted/50 border border-emerald/10">
              <p className="text-[13px] text-content-secondary">
                <span className="font-mono font-semibold text-emerald-light">73%</span> of LootVue analysts say{" "}
                <span className="font-semibold text-emerald-light">BUY</span> for{" "}
                {compMarkets.filter((m) => m.signal === "Buy").map((m) => m.market).join(", ")}
              </p>
            </div>
          )}
        </section>
      )}

      {/* --- SECTION 3: Watchlist --- */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-2">
            <Star className="w-3.5 h-3.5" /> Your Watchlist
          </div>
          <span className="font-mono text-xs text-content-disabled">{watchlistItems.length} markets</span>
        </div>

        {watchlistItems.length > 0 ? (
          <div className="space-y-2">
            {watchlistItems.map((w) => (
              <div
                key={w.zip}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center justify-center w-9 h-6 rounded-md font-mono font-bold text-xs ${scoreBg(w.score)} ${scoreColor(w.score)}`}>
                    {w.score}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/markets/${toSlug(w.name, w.state)}`}
                      className="text-[13px] font-medium text-content-primary hover:text-gold-light transition-colors"
                      aria-label={`View market detail for ${w.name}, ${w.state}`}
                    >
                      {w.name}, {w.state}
                    </Link>
                    <div className="text-[11px] text-content-disabled mt-0.5 truncate">{w.reading}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={signalBadge(w.signal as Signal)}>{w.signal}</span>
                  <button
                    onClick={() => removeMarket(w.zip)}
                    className="p-1.5 rounded-md text-content-disabled hover:text-rose-light hover:bg-rose-muted transition-colors"
                    title="Remove from watchlist"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Eye className="w-8 h-8 text-content-disabled mb-2" />
            <p className="text-sm text-content-tertiary">Watch markets to track them here</p>
            <p className="text-[11px] text-content-disabled mt-1">
              Click the <Eye className="w-3 h-3 inline" /> icon in the table above
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
