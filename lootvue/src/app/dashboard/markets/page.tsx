"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  Minus,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Zap,
  BarChart2,
  GitBranch,
  Layers,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GeoBreadcrumb } from "@/components/charts/GeoBreadcrumb";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { useGeography } from "@/lib/hooks/useGeography";
import { useMultiMarketSignals } from "@/lib/hooks/useMarketSignals";
import { SAMPLE_MARKET_DATA, type MarketScore } from "@/components/charts/CapitalFlowMap";
import { Term } from "@/components/shared/Term";
import { StoryFlow, type StoryStep } from "@/components/shared/StoryFlow";
import { StoryChapter } from "@/components/shared/StoryChapter";
import { StoryAction } from "@/components/shared/StoryAction";
import { GuidedTour, TourReplayButton } from "@/components/shared/GuidedTour";
import { MARKETS_TOUR } from "@/lib/tours/page-tours";

// ─── Lazy-loaded charts ───────────────────────────────────────────────────────

// InteractiveMap replaces CapitalFlowMap — deck.gl + MapLibre, full drill-down
const InteractiveMap = dynamic(
  () =>
    import("@/components/charts/InteractiveMap").then((m) => ({ default: m.InteractiveMap })),
  {
    ssr: false,
    loading: () => <div className="skeleton w-full h-full min-h-[400px]" />,
  }
);

const HPIForecastChart = dynamic(
  () => import("@/components/charts/HPIForecastChart").then((m) => ({ default: m.HPIForecastChart })),
  { ssr: false, loading: () => <div className="skeleton w-full h-[300px]" /> }
);

const BubbleChart = dynamic(
  () => import("@/components/charts/BubbleChart").then((m) => ({ default: m.BubbleChart })),
  { ssr: false, loading: () => <div className="skeleton w-full h-[300px]" /> }
);

const ParallelCoordinatesChart = dynamic(
  () => import("@/components/charts/ParallelCoordinatesChart").then((m) => ({ default: m.ParallelCoordinatesChart })),
  { ssr: false, loading: () => <div className="skeleton w-full h-[300px]" /> }
);

const MultiDimensionalExplorer = dynamic(
  () => import("@/components/charts/MultiDimensionalExplorer").then((m) => ({ default: m.MultiDimensionalExplorer })),
  { ssr: false, loading: () => <div className="skeleton w-full h-[600px] rounded-xl" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "score" | "yoy" | "price" | "convergence";
type SortDir = "asc" | "desc";
type ChartTab = "hpi" | "scatter" | "parallel";

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKTEST_ROWS = [
  { signal: "Months Supply", termId: "months-of-supply",   rho: "0.33", spread: "9.22pp", wf: "82%",  weight: "0.30", isTop: true  },
  { signal: "Permits",       termId: "building-permits",   rho: "0.35", spread: "8-16pp", wf: "—",    weight: "0.25", isTop: true  },
  { signal: "HPI Momentum",  termId: "hpi-momentum",       rho: "0.33", spread: "—",      wf: "—",    weight: "0.20", isTop: false },
  { signal: "Employment",    termId: "employment-growth",  rho: "0.11", spread: "—",      wf: "79%",  weight: "0.15", isTop: false },
  { signal: "Rates",         termId: "mortgage-rates",     rho: "0.13", spread: "—",      wf: "—",    weight: "0.10", isTop: false },
  { signal: "CONVERGENCE",   termId: "convergence",        rho: "0.56", spread: "15.2pp", wf: "BEST", weight: "L1",   isTop: true  },
] as const;

const CHART_TABS: { id: ChartTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "hpi",      label: "HPI Forecast", Icon: TrendingUp },
  { id: "scatter",  label: "Scatter",      Icon: BarChart2  },
  { id: "parallel", label: "Parallel",     Icon: Layers     },
];

const SIGNAL_KEYS: Array<{ key: keyof MarketScore["signals"]; label: string; termId: string; weight: string; rho: string }> = [
  { key: "monthsOfSupply", label: "Supply",  termId: "months-of-supply",  weight: "0.30", rho: "0.33" },
  { key: "permits",        label: "Permits", termId: "building-permits",  weight: "0.25", rho: "0.35" },
  { key: "hpiMomentum",    label: "HPI Mom", termId: "hpi-momentum",      weight: "0.20", rho: "0.33" },
  { key: "employment",     label: "Employ",  termId: "employment-growth", weight: "0.15", rho: "0.11" },
  { key: "rates",          label: "Rates",   termId: "mortgage-rates",    weight: "0.10", rho: "0.13" },
];

/**
 * Approximate z-score from direction label for visual bar rendering.
 * This is a display approximation only — the real z-scores are computed in the
 * confluence engine from actual FRED/Redfin data. Used here because the
 * MarketScore type carries directions (bullish/bearish/neutral) but not raw z-scores.
 */
function approximateZScore(dir: "bullish" | "bearish" | "neutral"): number {
  return dir === "bullish" ? 1.6 : dir === "bearish" ? -1.4 : 0.1;
}

/** Plain English impact — what does this signal mean for YOUR money? */
function signalImpact(
  key: keyof MarketScore["signals"],
  dir: "bullish" | "bearish" | "neutral",
  market: MarketScore
): string {
  const impacts: Record<keyof MarketScore["signals"], Record<"bullish" | "bearish" | "neutral", string>> = {
    monthsOfSupply: {
      bullish: `Tight supply → sellers set the price. Properties in ${market.stateCode} likely appreciate 5-8% this year. List now for max leverage.`,
      bearish: `Inventory piling up → buyers negotiate. Expect 2-4% price cuts. If you own here, consider selling before competition floods in.`,
      neutral: `Balanced market — no strong pricing pressure either way. Good time to buy undervalued, bad time to overpay.`,
    },
    permits: {
      bullish: `Builders are betting real money on ${market.stateCode}. New construction means jobs, population growth, and rising rents in 12-18 months.`,
      bearish: `Builders pulling back — they see risk you don't. Rental demand may soften in 12-18 months as fewer jobs follow fewer projects.`,
      neutral: `Permit activity flat. No strong signal on future development. Focus on existing inventory deals.`,
    },
    hpiMomentum: {
      bullish: `Prices accelerating — your ${market.stateCode} equity is growing faster each month. YoY gain of ${market.yoyAppreciation >= 0 ? "+" : ""}${market.yoyAppreciation.toFixed(1)}% and climbing.`,
      bearish: `Momentum fading — the easy gains are over. Price growth decelerating. Lock in profits or renegotiate your entry price.`,
      neutral: `Prices moving sideways. No momentum to ride. Value-add strategies (rehab, STR conversion) matter more than market timing.`,
    },
    employment: {
      bullish: `Jobs growing → more renters, more buyers, higher rents. Your MoM rental income in ${market.stateCode} has upside. Vacancy risk LOW.`,
      bearish: `Job losses = tenant risk. Vacancy spikes eat your cash flow. If your DSCR is under 1.25, this is a warning sign for your monthly NOI.`,
      neutral: `Job market flat. Your rental income stays steady but don't expect rent increases above inflation.`,
    },
    rates: {
      bullish: `Rates falling → buyer pool expanding. More competition for your ${market.stateCode} properties drives prices up. Your equity grows.`,
      bearish: `Rates rising → each 25bp costs buyers ~3% purchasing power. Fewer qualified buyers = softer prices. Your refi options get worse.`,
      neutral: `Rates stable. No tailwind, no headwind. Focus on deal quality over timing.`,
    },
  };
  return impacts[key][dir];
}

/** What does the overall verdict mean for this market? */
function verdictContext(market: MarketScore): string {
  const sig = scoreSignal(market.score);
  if (sig === "BUY") {
    return `${market.convergence}/5 signals bullish. Markets with 4+ aligned signals averaged 8-13% appreciation over 18 months in backtesting. Your equity grows while you sleep.`;
  }
  if (sig === "SELL") {
    return `Only ${market.convergence}/5 signals bullish. Markets with 0-1 aligned signals averaged -2.1% in the same period. Every month you hold here costs you money.`;
  }
  return `Mixed signals — ${market.convergence}/5 bullish. Not enough agreement to act confidently. Wait for convergence or find a deal good enough to overcome the market headwinds.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreSignal(score: number): "BUY" | "HOLD" | "SELL" {
  if (score >= 70) return "BUY";
  if (score >= 45) return "HOLD";
  return "SELL";
}

function signalColor(sig: "BUY" | "HOLD" | "SELL"): string {
  return sig === "BUY" ? CHART_COLORS.emerald : sig === "HOLD" ? CHART_COLORS.amber : CHART_COLORS.rose;
}

function signalBadgeClass(sig: "BUY" | "HOLD" | "SELL"): string {
  return sig === "BUY" ? "badge-emerald" : sig === "HOLD" ? "badge-amber" : "badge-rose";
}

function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtYoy(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function rhoColor(rho: string): string {
  const v = parseFloat(rho);
  if (v >= 0.50) return CHART_COLORS.gold;
  if (v >= 0.30) return CHART_COLORS.emerald;
  return CHART_COLORS.textSecondary;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TickerChip({
  market,
  active,
  onClick,
}: {
  market: MarketScore;
  active: boolean;
  onClick: () => void;
}) {
  const sig = scoreSignal(market.score);
  const color = signalColor(sig);
  const Icon = sig === "BUY" ? ChevronUp : sig === "SELL" ? ChevronDown : Minus;

  return (
    <button
      onClick={onClick}
      aria-label={`${market.stateCode} score ${market.score} ${sig}`}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-md transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
      style={{
        background: active ? `${color}1A` : "transparent",
        border: `1px solid ${active ? `${color}50` : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <span className="font-mono font-semibold text-[12px] text-content-primary">{market.stateCode}</span>
      <span className="font-mono text-[12px] tabular-nums font-semibold" style={{ color }}>{market.score}</span>
      <Icon className="w-3 h-3" style={{ color }} aria-hidden="true" />
      <span className="text-[10px] font-bold tracking-wider" style={{ color }}>{sig}</span>
    </button>
  );
}

function ScoreBar({ score }: { score: number }) {
  const sig = scoreSignal(score);
  const color = signalColor(sig);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono font-bold text-[13px] tabular-nums text-content-primary w-6">{score}</span>
      <div className="w-14 h-1.5 rounded-full bg-surface-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ConvergenceDots({ signals }: { signals: MarketScore["signals"] }) {
  const dirs = [
    signals.monthsOfSupply,
    signals.permits,
    signals.hpiMomentum,
    signals.employment,
    signals.rates,
  ];
  return (
    <div className="flex items-center gap-0.5">
      {dirs.map((dir, i) => (
        <span
          key={i}
          className={`convergence-dot ${
            dir === "bullish"
              ? "convergence-dot-bullish"
              : dir === "bearish"
              ? "convergence-dot-bearish"
              : "convergence-dot-neutral"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function SignalBars({ market, showImpact = false }: { market: MarketScore; showImpact?: boolean }) {
  return (
    <div className="space-y-1.5">
      {SIGNAL_KEYS.map((sig, i) => {
        const dir = market.signals[sig.key];
        const color =
          dir === "bullish" ? CHART_COLORS.emerald :
          dir === "bearish" ? CHART_COLORS.rose :
          CHART_COLORS.amber;
        const z = approximateZScore(dir);
        const barPct = (Math.min(Math.abs(z), 3) / 3) * 45; // max 45% of half-bar

        return (
          <motion.div
            key={sig.key}
            className="group"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.055, duration: 0.22 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-content-tertiary w-14 shrink-0 uppercase tracking-wide font-medium">
                <Term id={sig.termId}>{sig.label}</Term>
              </span>
              {/* Bidirectional bar */}
              <div className="flex-1 relative h-1.5 flex items-center">
                <div className="absolute inset-0 rounded-full bg-surface-muted" />
                <div className="absolute inset-0 flex items-center">
                  <div
                    className="absolute w-px h-3 bg-surface-border"
                    style={{ left: "50%", transform: "translateX(-50%)" }}
                  />
                  {z >= 0 ? (
                    <motion.div
                      className="absolute h-full rounded-r"
                      style={{ left: "50%", width: `${barPct}%`, backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  ) : (
                    <motion.div
                      className="absolute h-full rounded-l"
                      style={{ right: "50%", width: `${barPct}%`, backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  )}
                </div>
              </div>
              <span className="font-mono text-[10px] tabular-nums w-10 text-right" style={{ color }}>
                {z > 0 ? "+" : ""}{z.toFixed(1)}σ
              </span>
              <span className="text-[9px] text-content-disabled w-6 text-right">{sig.weight}</span>
            </div>
            {/* Impact context — always visible in expanded mode, hover in compact */}
            {showImpact && (
              <motion.p
                className="text-[10px] text-content-tertiary leading-snug mt-0.5 ml-16 pr-6"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: i * 0.06 + 0.2, duration: 0.2 }}
              >
                {signalImpact(sig.key, dir, market)}
              </motion.p>
            )}
          </motion.div>
        );
      })}

      <div className="flex items-center justify-between pt-1.5 border-t border-surface-border">
        <span className="text-[10px] text-content-tertiary">
          <Term id="convergence">Convergence</Term>
        </span>
        <span
          className="font-mono text-[11px] font-bold"
          style={{
            color:
              market.convergence >= 4 ? CHART_COLORS.emerald :
              market.convergence >= 2 ? CHART_COLORS.amber :
              CHART_COLORS.rose,
          }}
        >
          {market.convergence}/5 {market.convergence >= 4 ? "BULLISH" : market.convergence >= 2 ? "MIXED" : "BEARISH"}
        </span>
        <span
          className="font-mono text-[10px] text-gold"
          title="Spearman rank correlation coefficient — measures how well this signal predicts price changes"
        >
          rho=0.56
        </span>
      </div>
    </div>
  );
}

function StateOverlay({
  market,
  onClose,
}: {
  market: MarketScore;
  onClose: () => void;
}) {
  const sig = scoreSignal(market.score);

  return (
    <motion.div
      key={market.stateCode}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-4 left-4 right-4 rounded-xl border border-surface-border"
      style={{
        background: "rgba(8,8,8,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        padding: "14px 16px",
      }}
      aria-label={`${market.stateName} market detail`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-content-primary">{market.stateName}</span>
          <span className="text-[11px] text-content-tertiary">· {market.topMetro}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge font-mono font-bold text-[11px] ${signalBadgeClass(sig)}`}>{sig}</span>
          <span className="font-mono text-[22px] font-bold tabular-nums" style={{ color: signalColor(sig) }}>
            {market.score}
          </span>
          <button
            onClick={onClose}
            className="ml-1 text-[18px] leading-none text-content-disabled hover:text-content-secondary transition-colors"
            aria-label="Close detail overlay"
          >
            ×
          </button>
        </div>
      </div>

      {/* Verdict context — why this matters to your money */}
      <p className="text-[11px] text-content-secondary leading-relaxed mb-3 border-l-2 pl-2.5"
        style={{ borderColor: signalColor(sig) }}>
        {verdictContext(market)}
      </p>

      {/* Compact metrics row */}
      <div className="flex items-center gap-4 mb-3 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="text-content-tertiary">Price</span>
          <span className="font-mono font-semibold tabular-nums text-content-primary">{fmtCompact(market.medianHomePrice)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-content-tertiary">
            <Term id="yoy-appreciation">YoY</Term>
          </span>
          <span className="font-mono font-semibold tabular-nums"
            style={{ color: market.yoyAppreciation >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose }}>
            {fmtYoy(market.yoyAppreciation)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ConvergenceDots signals={market.signals} />
          <span className="font-mono text-[11px] text-content-secondary">{market.convergence}/5</span>
        </div>
      </div>

      {/* Signal bars with impact context */}
      <SignalBars market={market} />
    </motion.div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS: StoryStep[] = [
  { id: "market-signal", label: "Market Signal" },
  { id: "explore",       label: "Explore" },
  { id: "evidence",      label: "Evidence" },
  { id: "find-deals",    label: "Find Deals" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const { geoKey, selectState } = useGeography();

  // Real FRED/Redfin market data — fetches supply + permits + HPI + rates for all 31 MSAs,
  // aggregates to state-level confluence scores. Falls back to SAMPLE_MARKET_DATA only if
  // the pipeline returns no data at all.
  const { mapData, status: dataStatus, signalCoverage } = useMultiMarketSignals();
  const usingRealData = (dataStatus === "success" || dataStatus === "partial") && mapData.length > 0;
  const marketData: MarketScore[] = usingRealData ? mapData : SAMPLE_MARKET_DATA;

  const [activeState, setActiveState] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [chartTab, setChartTab] = useState<ChartTab>("hpi");
  const [tourKey, setTourKey] = useState(0);

  const tickerRef = useRef<HTMLDivElement>(null);
  const tickerPaused = useRef(false);

  // Continuous ticker scroll — uses rAF, doubles the data for seamless loop
  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    let frame: number;
    let pos = 0;
    const speed = 0.35;

    const loop = () => {
      if (!tickerPaused.current) {
        pos += speed;
        // Reset when we've scrolled through the first copy
        if (pos >= el.scrollWidth / 2) pos = 0;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectedMarket = useMemo(
    () => marketData.find((m) => m.stateCode === activeState) ?? null,
    [activeState, marketData]
  );

  const sortedData = useMemo(() => {
    return [...marketData].sort((a, b) => {
      const val = (m: MarketScore) => {
        switch (sortKey) {
          case "score":       return m.score;
          case "yoy":         return m.yoyAppreciation;
          case "price":       return m.medianHomePrice;
          case "convergence": return m.convergence;
        }
      };
      return sortDir === "desc" ? val(b) - val(a) : val(a) - val(b);
    });
  }, [sortKey, sortDir, marketData]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return prev;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const handleStateClick = useCallback(
    (code: string, name: string) => {
      setActiveState(code);
      selectState(code, name);
    },
    [selectState]
  );

  // Doubled ticker data for seamless loop
  const tickerData = [...marketData, ...marketData];

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-25" aria-hidden="true" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 text-gold" aria-hidden="true" />
      : <ChevronUp className="w-3 h-3 text-gold" aria-hidden="true" />;
  }

  // ── National convergence summary (no market selected)
  const nationalBullish = Math.round(
    marketData.filter((m) => scoreSignal(m.score) === "BUY").length
  );

  // Top BUY market for the CTA
  const topBuyMarket = useMemo(
    () => [...marketData].sort((a, b) => b.score - a.score)[0],
    [marketData]
  );

  return (
    <div className="flex flex-col gap-4 p-4 min-h-full bg-surface">
      <StoryFlow
        steps={STEPS}
        narratorLine="5-signal confluence · rho=0.56 strongest predictor · each step narrows your edge."
      >

        {/* ── Chapter 0: Market Signal — AI narrator + ticker bar + map ── */}
        <StoryChapter
          index={0}
          id="market-signal"
          aiIntro={selectedMarket
            ? `${selectedMarket.stateName}: ${scoreSignal(selectedMarket.score)} signal with ${selectedMarket.convergence}/5 confluence. ${verdictContext(selectedMarket)}`
            : `${nationalBullish} markets are BUY signals right now. BUY markets outperform SELL markets by 15.2pp over 18 months — that's the difference between 13% gains and 2% losses on your equity. TX and FL lead. CA, NY, IL carry all 4 risk flags. Your broker profits from what you don't know.`
          }
        >
          {/* Page Header */}
          <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title">Markets</h1>
                <TourReplayButton
                  tourId="markets-v1"
                  onReplay={() => setTourKey((k) => k + 1)}
                />
              </div>
              <p className="page-subtitle">
                5-signal{" "}
                <Term id="convergence">confluence</Term>
                {" "}·{" "}
                <span
                  title="Spearman rank correlation coefficient — measures how well this signal predicts price changes"
                  className="font-mono"
                >
                  rho=0.56
                </span>
                {" "}strongest predictor · {marketData.length} tracked markets
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Live data status indicator */}
              <div className="flex items-center gap-1.5" aria-live="polite" aria-label={`Data status: ${dataStatus === "loading" ? "Loading live data" : usingRealData ? "Live FRED data" : "Sample data"}`}>
                {dataStatus === "loading" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" aria-hidden="true" />
                    <span className="text-[10px] text-amber font-mono">Loading live data...</span>
                  </>
                ) : usingRealData ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald" aria-hidden="true" />
                    <span className="text-[10px] text-emerald font-mono">
                      LIVE
                      {signalCoverage && (
                        <span className="text-content-disabled ml-1">
                          {signalCoverage.supply}S {signalCoverage.permits}P {signalCoverage.hpi}H {signalCoverage.rates ? "R" : ""}
                        </span>
                      )}
                    </span>
                  </>
                ) : dataStatus === "error" || dataStatus === "idle" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose" aria-hidden="true" />
                    <span className="text-[10px] text-content-tertiary font-mono">Sample data</span>
                  </>
                ) : null}
              </div>
              <GeoBreadcrumb />
            </div>
          </div>

          {/* AI Insight — contextual to selection */}
          <AiInsightStrip
            summary={selectedMarket
              ? `${selectedMarket.stateName}: ${scoreSignal(selectedMarket.score)} signal with ${selectedMarket.convergence}/5 confluence. ${verdictContext(selectedMarket)}`
              : `${nationalBullish} markets are BUY signals right now. BUY markets outperform SELL markets by 15.2pp over 18 months — that's the difference between 13% gains and 2% losses on your equity. TX and FL lead. CA, NY, IL carry all 4 risk flags. Your broker profits from what you don't know.`
            }
            detail={selectedMarket
              ? `${selectedMarket.stateName} signal breakdown — ${Object.entries(selectedMarket.signals).filter(([, v]) => v === "bullish").length} bullish, ${Object.entries(selectedMarket.signals).filter(([, v]) => v === "bearish").length} bearish. The strongest signal in this market is ${
                  selectedMarket.signals.monthsOfSupply === "bullish" ? "tight supply (weight 0.30, rho=0.33)" :
                  selectedMarket.signals.permits === "bullish" ? "building permits growth (weight 0.25, rho=0.35)" :
                  selectedMarket.signals.employment === "bullish" ? "job growth (weight 0.15, independent at 79% walk-forward)" :
                  "no dominant bullish signal — proceed with caution"
                }. When ${selectedMarket.convergence}+ signals agree at L1, predictive correlation jumps to rho=0.56 — the most powerful finding in our backtest.`
              : "The 5-signal model identifies top-quintile markets 18+ months before price inflection. L1 confluence (rho=0.56) is the product's analytical edge — it amplifies weak individual signals into a strong composite predictor. Dead signals removed: IRS AGI (rho=0.01), M2 velocity (rho=-0.008)."
            }
            aiPrompt={selectedMarket
              ? `Analyze ${selectedMarket.stateName} as a real estate market right now. Score: ${selectedMarket.score}/100. ${selectedMarket.convergence}/5 signals bullish. YoY appreciation: ${selectedMarket.yoyAppreciation}%. Should an investor buy here? Give the top 2 reasons for and against in 3 sentences.`
              : "Which US real estate markets have the strongest buy signals right now and why? Rank the top 3 markets and bottom 3 markets. Be specific about which signals drive each recommendation. Keep it under 4 sentences."
            }
            aiContext={`National market overview: ${nationalBullish} of ${marketData.length} markets are BUY signals. Top markets: ${sortedData.slice(0, 5).map(m => `${m.stateName} (score ${m.score}, ${m.convergence}/5 bullish, ${m.yoyAppreciation >= 0 ? "+" : ""}${m.yoyAppreciation}% YoY)`).join("; ")}. Bottom markets: ${[...sortedData].reverse().slice(0, 3).map(m => `${m.stateName} (score ${m.score})`).join("; ")}. Signal model: months-of-supply (weight 0.30, rho=0.33), permits (0.25, rho=0.35), HPI momentum (0.20, rho=0.33), employment (0.15, rho=0.11), rates (0.10, rho=0.13). L1 confluence rho=0.56.${selectedMarket ? ` Selected: ${selectedMarket.stateName} — supply=${selectedMarket.signals.monthsOfSupply}, permits=${selectedMarket.signals.permits}, employment=${selectedMarket.signals.employment}, rates=${selectedMarket.signals.rates}, hpiMomentum=${selectedMarket.signals.hpiMomentum}.` : ""}`}
          />

          {/* Sample data warning banner — only shown when falling back to hardcoded data */}
          {!usingRealData && dataStatus !== "loading" && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg mt-3"
              style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.15)" }}
              role="alert"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0" aria-hidden="true" />
              <span className="text-[11px] text-amber">
                Showing sample data — real market signals could not be loaded. Scores are illustrative, not computed from live FRED/Redfin data.
              </span>
            </div>
          )}

          {/* Ticker Bar */}
          <div
            className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-card mt-4"
            style={{ height: 42 }}
            aria-label="Live market signal ticker"
            onMouseEnter={() => { tickerPaused.current = true; }}
            onMouseLeave={() => { tickerPaused.current = false; }}
          >
            {/* Left fade */}
            <div
              className="absolute left-0 inset-y-0 w-10 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, #111111 30%, transparent)" }}
            />
            {/* Right fade */}
            <div
              className="absolute right-0 inset-y-0 w-10 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to left, #111111 30%, transparent)" }}
            />

            <div
              ref={tickerRef}
              className="flex items-center gap-1.5 h-full px-4"
              style={{ overflow: "hidden", userSelect: "none", whiteSpace: "nowrap" }}
            >
              {tickerData.map((m, i) => (
                <TickerChip
                  key={`${m.stateCode}-${i}`}
                  market={m}
                  active={activeState === m.stateCode}
                  onClick={() => handleStateClick(m.stateCode, m.stateName)}
                />
              ))}
            </div>
          </div>
        </StoryChapter>

        {/* ── Chapter 1: Explore — map (hero) + rankings table ── */}
        <StoryChapter
          index={1}
          id="explore"
          aiIntro="Click any state on the map to see its 5-signal breakdown and what it means for your money."
        >
          {/* Main Row: Map + Table */}
          <div className="flex gap-4" style={{ minHeight: 480 }}>

            {/* Map — 65% width */}
            <div
              data-tour="map"
              className="relative rounded-xl border border-surface-border bg-surface-card overflow-hidden"
              style={{ flex: "0 0 65%" }}
            >
              <InteractiveMap
                data={marketData}
                className="w-full h-full"
                onGeoSelect={(level, code) => {
                  if (level === "state") {
                    const found = marketData.find((m) => m.stateCode === code);
                    if (found) handleStateClick(code, found.stateName);
                  } else if (level === "national") {
                    setActiveState(null);
                  }
                }}
              />

              {/* State detail overlay */}
              <AnimatePresence>
                {selectedMarket && (
                  <StateOverlay
                    market={selectedMarket}
                    onClose={() => setActiveState(null)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Rankings Table — 35% width, COMPACT spacing */}
            <div className="flex-1 flex flex-col rounded-xl border border-surface-border bg-surface-card overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-border shrink-0">
                <span className="section-label">Rankings</span>
                <span className="font-mono text-[10px] text-content-disabled tabular-nums">
                  {marketData.length}
                </span>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-[11px]" aria-label="Market rankings">
                  <thead className="sticky top-0 bg-surface-card z-10">
                    <tr className="border-b border-surface-border">
                      <th className="pl-2 pr-1 py-1 text-left text-[9px] text-content-disabled font-mono">#</th>
                      <th className="px-1 py-1 text-left text-[9px] text-content-disabled">Mkt</th>
                      <th className="px-1 py-1 text-right text-[9px] text-content-disabled">
                        <button className="flex items-center gap-0.5 ml-auto hover:text-gold" onClick={() => handleSort("score")}>
                          Scr <SortIndicator col="score" />
                        </button>
                      </th>
                      <th className="px-1 py-1 text-right text-[9px] text-content-disabled">Sig</th>
                      <th className="px-1 py-1 text-right text-[9px] text-content-disabled">
                        <button className="flex items-center gap-0.5 ml-auto hover:text-gold" onClick={() => handleSort("yoy")}>
                          <Term id="yoy-appreciation">YoY</Term> <SortIndicator col="yoy" />
                        </button>
                      </th>
                      <th className="px-1 pr-2 py-1 text-right text-[9px] text-content-disabled">
                        <button className="flex items-center gap-0.5 ml-auto hover:text-gold" onClick={() => handleSort("price")}>
                          Price <SortIndicator col="price" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((market, idx) => {
                      const sig = scoreSignal(market.score);
                      const isActive = activeState === market.stateCode;
                      const color = signalColor(sig);
                      return (
                        <tr
                          key={market.stateCode}
                          onClick={() => handleStateClick(market.stateCode, market.stateName)}
                          className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                          style={{ background: isActive ? `${color}0C` : undefined }}
                          aria-selected={isActive}
                        >
                          <td className="pl-2 pr-1 py-1">
                            <span className="font-mono text-[10px] text-content-disabled">{idx + 1}</span>
                          </td>
                          <td className="px-1 py-1">
                            <span className="text-[11px] font-semibold" style={{ color: isActive ? "#FAFAFA" : "#999" }}>
                              {market.stateCode}
                            </span>
                          </td>
                          <td className="px-1 py-1 text-right">
                            <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>{market.score}</span>
                          </td>
                          <td className="px-1 py-1 text-right">
                            <span className="text-[9px] font-bold" style={{ color }}>{sig}</span>
                          </td>
                          <td className="px-1 py-1 text-right">
                            <span className="font-mono text-[10px] tabular-nums"
                              style={{ color: market.yoyAppreciation >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose }}>
                              {fmtYoy(market.yoyAppreciation)}
                            </span>
                          </td>
                          <td className="px-1 pr-2 py-1 text-right">
                            <span className="font-mono text-[10px] tabular-nums text-content-secondary">
                              {fmtCompact(market.medianHomePrice)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </StoryChapter>

        {/* ── Chapter 2: Evidence — signal convergence + backtest proof ── */}
        <StoryChapter
          index={2}
          id="evidence"
          aiIntro="These aren't vibes — they're backtested signals with measured predictive power. Here's the proof."
          advanced={
            <div className="card p-0 overflow-hidden">
              {/* Tab bar */}
              <div
                className="flex items-center border-b border-surface-border px-4"
                role="tablist"
                aria-label="Market chart views"
              >
                {CHART_TABS.map((tab) => {
                  const active = chartTab === tab.id;
                  const { Icon } = tab;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setChartTab(tab.id)}
                      className="relative flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
                      style={{ color: active ? CHART_COLORS.gold : "#666666" }}
                    >
                      <Icon className="w-3 h-3" aria-hidden="true" />
                      {tab.label}
                      {active && (
                        <motion.div
                          layoutId="chart-tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{ backgroundColor: CHART_COLORS.gold }}
                          transition={{ duration: 0.18 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Chart panel */}
              <div className="p-4" role="tabpanel">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={chartTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.16 }}
                  >
                    {chartTab === "hpi"      && <HPIForecastChart key={geoKey} geoKey={geoKey} />}
                    {chartTab === "scatter"  && <BubbleChart key={geoKey} />}
                    {chartTab === "parallel" && <ParallelCoordinatesChart key={geoKey} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          }
          advancedLabel="3 advanced chart views"
        >
          {/* Signal Proof Panel */}
          <div data-tour="signals" className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Signal Convergence */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
                  <span className="section-label">
                    Signal <Term id="convergence">Convergence</Term>
                  </span>
                </div>
                <span className="text-[10px] text-content-disabled">
                  {selectedMarket ? selectedMarket.stateName : "Select a market"}
                </span>
              </div>

              {selectedMarket ? (
                <>
                  {/* 5 signal tiles */}
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {SIGNAL_KEYS.map((sig, i) => {
                      const dir = selectedMarket.signals[sig.key];
                      const color =
                        dir === "bullish" ? CHART_COLORS.emerald :
                        dir === "bearish" ? CHART_COLORS.rose :
                        CHART_COLORS.amber;
                      const Icon = dir === "bullish" ? ChevronUp : dir === "bearish" ? ChevronDown : Minus;
                      return (
                        <motion.div
                          key={sig.key}
                          className="flex flex-col items-center gap-1 rounded-lg py-2 px-1"
                          style={{
                            background: `${color}12`,
                            border: `1px solid ${color}28`,
                          }}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06, duration: 0.2 }}
                        >
                          <Icon className="w-3 h-3" style={{ color }} aria-hidden="true" />
                          <span
                            className="text-[9px] uppercase tracking-wide font-semibold text-center leading-tight"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            <Term id={sig.termId}>{sig.label}</Term>
                          </span>
                          <span className="font-mono text-[9px] font-semibold" style={{ color }}>
                            {sig.weight}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Directional bars with impact explanations */}
                  <SignalBars market={selectedMarket} showImpact={true} />
                </>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="grid grid-cols-5 gap-1.5 w-full mb-2">
                    {SIGNAL_KEYS.map((sig) => (
                      <div
                        key={sig.key}
                        className="flex flex-col items-center gap-1 rounded-lg py-2 px-1"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <Minus className="w-3 h-3 text-content-disabled" aria-hidden="true" />
                        <span className="text-[9px] uppercase tracking-wide font-semibold text-content-disabled text-center">
                          <Term id={sig.termId}>{sig.label}</Term>
                        </span>
                        <span className="font-mono text-[9px] text-content-disabled">{sig.weight}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-content-disabled">Click any market to view convergence</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-surface-border mt-1">
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3 text-content-disabled" aria-hidden="true" />
                  <span className="text-[11px] text-content-tertiary">
                    {selectedMarket
                      ? `${selectedMarket.convergence}/5 bullish — ${selectedMarket.convergence >= 4 ? "+13.1pp" : selectedMarket.convergence === 0 ? "-2.1pp" : "±mixed"} hist. outperformance`
                      : "L1 confluence: agree=1.15×, disagree=0.85×"}
                  </span>
                </div>
                <span
                  className="font-mono text-[10px] text-gold font-semibold"
                  title="Spearman rank correlation coefficient — measures how well this signal predicts price changes"
                >
                  rho=0.56
                </span>
              </div>
            </div>

            {/* Backtest Proof */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
                <span className="section-label">Backtest Proof</span>
                <span className="text-[10px] text-content-disabled ml-auto">
                  Forward HPI · N≥120 obs
                </span>
              </div>

              <table className="w-full" aria-label="Signal backtest validation results">
                <thead>
                  <tr>
                    {["Signal", "rho", "Qntl Sprd", "Walk-Fwd", "Wt"].map((h) => (
                      <th
                        key={h}
                        className={`pb-2 text-[10px] font-semibold text-content-tertiary uppercase tracking-wide ${h === "Signal" ? "text-left" : "text-right"}`}
                        title={h === "rho" ? "Spearman rank correlation coefficient — measures how well this signal predicts price changes" : undefined}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BACKTEST_ROWS.map((row) => {
                    const isLast = row.termId === "convergence";
                    return (
                      <tr
                        key={row.signal}
                        className={isLast ? "border-t border-surface-border" : ""}
                      >
                        <td className={`py-1.5 ${isLast ? "pt-2.5" : ""}`}>
                          <span
                            className={`font-mono text-[12px] ${isLast ? "text-gold font-bold" : "text-content-secondary"}`}
                          >
                            <Term id={row.termId}>{row.signal}</Term>
                          </span>
                        </td>
                        <td className="py-1.5 text-right">
                          <span
                            className="font-mono text-[12px] tabular-nums font-bold"
                            style={{ color: rhoColor(row.rho) }}
                          >
                            {row.rho}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">
                          <span
                            className={`font-mono text-[11px] tabular-nums ${row.spread !== "—" ? "text-content-primary" : "text-content-disabled"}`}
                          >
                            {row.spread}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">
                          <span
                            className={`font-mono text-[11px] ${row.wf === "BEST" ? "text-gold font-bold" : row.wf !== "—" ? "text-content-primary" : "text-content-disabled"}`}
                          >
                            {row.wf}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">
                          <span className="font-mono text-[11px] text-content-disabled">{row.weight}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="text-[9px] text-content-disabled mt-2 leading-relaxed">
                Dead signals removed: IRS AGI migration (rho=0.01), M2 velocity (rho=-0.008). L2 meta-confluence degrades signal — not built.
              </p>
            </div>
          </div>

          {/* 4D Interactive Explorer */}
          <div className="card p-0 overflow-hidden mt-4">
            <div className="p-4 pb-2 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-content-primary">
                4D Market <span className="text-gold">Explorer</span>
              </h2>
              <p className="text-[11px] text-content-tertiary mt-0.5 leading-relaxed">
                Pick any 4 dimensions for X, Y, Size, and Color. Add/remove cities.
                Scrub through time to see how markets evolved. Hit Play to animate.
              </p>
            </div>
            <div style={{ height: 700 }}>
              <MultiDimensionalExplorer />
            </div>
          </div>
        </StoryChapter>

        {/* ── Chapter 3: Find Deals — StoryAction ── */}
        <StoryChapter
          index={3}
          id="find-deals"
          showConnector={false}
        >
          <div data-tour="action">
          <StoryAction
            intro="You've seen the signal. Now act on it:"
            recommendations={[
              `${topBuyMarket ? topBuyMarket.stateName : "Top BUY market"} has ${topBuyMarket?.convergence ?? 4}/5 bullish signals — properties here benefit from structural tailwinds.`,
              "Markets with 4+ signals averaged +13.1pp outperformance in backtesting over 18 months.",
              "Use Compare Markets to build conviction before committing capital.",
            ]}
            actions={[
              {
                label: `Find Properties in ${topBuyMarket?.topMetro ?? "Top Market"}`,
                href: `/dashboard/discover?city=${encodeURIComponent(topBuyMarket?.topMetro ?? "")}`,
                variant: "primary",
                icon: <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />,
              },
              {
                label: "Compare Markets",
                href: "/dashboard/markets",
                variant: "secondary",
              },
            ]}
          />
          </div>
        </StoryChapter>

      </StoryFlow>

      <GuidedTour key={tourKey} steps={MARKETS_TOUR} tourId="markets-v1" />
    </div>
  );
}
