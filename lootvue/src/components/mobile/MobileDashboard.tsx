"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Mic,
  TrendingUp,
  Zap,
  Target,
  Trophy,
  ChevronRight,
  RefreshCw,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import {
  useGamificationStore,
  getLevel,
  getLevelProgress,
  getNextLevel,
} from "@/lib/stores/gamification-store";
import { SAMPLE_MARKET_DATA } from "@/components/charts/CapitalFlowMap";
import { useTranslation } from "@/lib/i18n/useTranslation";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "dash.greeting.morning";
  if (h < 17) return "dash.greeting.afternoon";
  return "dash.greeting.evening";
}

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald-light";
  if (n >= 55) return "text-amber-light";
  return "text-rose-light";
}

function scoreLabel(n: number): string {
  if (n >= 75) return "BUY";
  if (n >= 55) return "HOLD";
  return "SELL";
}

function scoreBadgeClass(n: number): string {
  if (n >= 75) return "badge-emerald";
  if (n >= 55) return "badge-amber";
  return "badge-rose";
}

/* ─── Static sample data ────────────────────────────────────────────────── */

const PORTFOLIO = {
  totalValue: 1_200_000,
  valueYtdPct: 8.2,
  monthlyCF: 3_450,
  cfTrend: "up" as const,
  totalEquity: 380_000,
};

const PIPELINE_DEALS = [
  { id: "1", address: "123 Main St", city: "Austin TX", cashFlow: 450, stage: "Analyzing", daysIn: 3 },
  { id: "2", address: "456 Oak Ave", city: "Tampa FL",  cashFlow: 680, stage: "Offer",     daysIn: 1 },
  { id: "3", address: "789 Pine Rd", city: "Nashville TN", cashFlow: 300, stage: "Discovered", daysIn: 7 },
];

const TRENDING_DEALS = [
  { address: "4210 Brodie Ln, Austin TX 78745",  short: "Austin 78745",   verdict: "BUY"  as const, capRate: 7.1 },
  { address: "310 Harbour Island Blvd, Tampa FL 33602", short: "Tampa 33602",    verdict: "BUY"  as const, capRate: 6.8 },
  { address: "1400 McGavock St, Nashville TN 37203",    short: "Nashville 37203", verdict: "DIG" as const, capRate: 5.4 },
];

const TOP_MARKETS = [...SAMPLE_MARKET_DATA]
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface RateSnapshot {
  mortgage30yr: number | null;
  mortgage30yrChange: number | null;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Tappable card with active-state scale feedback */
function MobileCard({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={[
        "glass p-4 select-none",
        onClick
          ? "cursor-pointer transition-transform duration-100 active:scale-[0.98] active:opacity-90"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* 1 — Portfolio header ─────────────────────────────────────────────────────── */

function PortfolioHeader() {
  const { t } = useTranslation();

  return (
    <div className="px-1 pt-2 pb-1">
      <p className="text-[15px] font-display font-semibold text-content-primary">
        {t(getGreetingKey())}
      </p>

      {/* Three inline metrics */}
      <div className="flex items-start gap-4 mt-3">
        <div className="flex-1 min-w-0">
          <p className="metric-label text-[10px]">{t("metric.portfolio")}</p>
          <p className="font-mono text-[1.25rem] font-bold text-content-primary tabular-nums leading-tight">
            {fmtCompact(PORTFOLIO.totalValue)}
          </p>
          <div className="flex items-center gap-0.5 metric-trend-up mt-0.5">
            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
            <span className="text-[11px]">+{PORTFOLIO.valueYtdPct}% {t("dash.ytd")}</span>
          </div>
        </div>

        <div className="w-px h-10 bg-surface-border self-center" aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <p className="metric-label text-[10px]">{t("metric.cash_flow")}</p>
          <p className="font-mono text-[1.25rem] font-bold text-emerald-light tabular-nums leading-tight">
            +{fmtUSD(PORTFOLIO.monthlyCF)}
          </p>
          <p className="text-[11px] text-content-tertiary mt-0.5">{t("metric.per_month")}</p>
        </div>

        <div className="w-px h-10 bg-surface-border self-center" aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <p className="metric-label text-[10px]">{t("metric.equity")}</p>
          <p className="font-mono text-[1.25rem] font-bold text-gold tabular-nums leading-tight">
            {fmtCompact(PORTFOLIO.totalEquity)}
          </p>
          <p className="text-[11px] text-content-tertiary mt-0.5">{t("metric.total")}</p>
        </div>
      </div>
    </div>
  );
}

/* 2 — Next Move card ─────────────────────────────────────────────────────── */

function NextMoveCard() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <MobileCard className="glass-gold border-gold/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg bg-gold-muted flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Target className="w-3.5 h-3.5 text-gold-light" />
        </div>
        <p className="text-[11px] font-semibold text-gold-light uppercase tracking-wider">
          {t("dash.next_move")}
        </p>
      </div>

      {/* AI recommendation */}
      <div className="flex items-start gap-2 mb-1">
        <AlertTriangle
          className="w-3.5 h-3.5 text-amber-light shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="text-[14px] text-content-primary leading-snug font-medium">
          123 Main St has been in pipeline{" "}
          <span className="text-amber-light font-mono">3 days</span>.
        </p>
      </div>
      <p className="text-[13px] text-content-secondary mb-4 pl-5 leading-relaxed">
        Austin market closes in{" "}
        <span className="font-mono text-content-primary">11 days</span> avg.
        Rates dropped{" "}
        <span className="font-mono text-emerald-light">10bps</span> — cash flow
        improves{" "}
        <span className="font-mono text-emerald-light">$450 → $510/mo</span>.
      </p>

      <button
        onClick={() => router.push("/dashboard/analyze?address=123+Main+St%2C+Austin+TX")}
        className="btn-primary btn-sm w-full justify-center min-h-[44px]"
        aria-label="Re-analyze 123 Main St"
      >
        {t("common.re_analyze")}
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </MobileCard>
  );
}

/* 3 — Quick Analyze card ─────────────────────────────────────────────────── */

function QuickAnalyzeCard() {
  const [address, setAddress] = useState("");
  const router = useRouter();
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    router.push(`/dashboard/analyze?address=${encodeURIComponent(trimmed)}`);
  }

  const BADGE_CLASS: Record<"BUY" | "PASS" | "DIG", string> = {
    BUY: "badge-emerald",
    PASS: "badge-rose",
    DIG: "badge-amber",
  };
  const BADGE_LABEL: Record<"BUY" | "PASS" | "DIG", string> = {
    BUY: t("common.buy"),
    PASS: t("common.pass"),
    DIG: t("common.dig_deeper"),
  };

  return (
    <MobileCard>
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-gold-light" aria-hidden="true" />
        <p className="text-[13px] font-semibold text-content-primary">
          {t("dash.quick_analyze")}
        </p>
      </div>

      {/* Address input */}
      <form onSubmit={handleSubmit} role="search" className="flex items-center gap-2 mb-4">
        <label htmlFor="mobile-analyze-input" className="sr-only">
          Enter property address
        </label>
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-disabled pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="mobile-analyze-input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("dash.enter_address")}
            className="input pl-9 pr-10 text-[14px] min-h-[44px]"
            autoComplete="street-address"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-disabled hover:text-gold transition-colors"
            aria-label="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!address.trim()}
          className="btn-primary btn-sm min-h-[44px] px-4 shrink-0 disabled:opacity-40"
          aria-label="Analyze address"
        >
          Go
        </button>
      </form>

      {/* Trending deals */}
      <p className="section-label mb-2">{t("common.trending_now")}</p>
      <div className="space-y-1" role="list" aria-label="Trending deals">
        {TRENDING_DEALS.map((deal) => (
          <Link
            key={deal.address}
            href={`/dashboard/analyze?address=${encodeURIComponent(deal.address)}`}
            role="listitem"
            className="flex items-center justify-between py-2.5 px-1 rounded-lg transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] min-h-[44px]"
            aria-label={`${deal.short}: ${BADGE_LABEL[deal.verdict]}, cap rate ${deal.capRate}%`}
          >
            <span className="text-[13px] text-content-secondary">{deal.short}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] text-content-tertiary">
                {deal.capRate.toFixed(1)}%
              </span>
              <span className={BADGE_CLASS[deal.verdict]}>
                {BADGE_LABEL[deal.verdict]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </MobileCard>
  );
}

/* 4 — Rates Today card ───────────────────────────────────────────────────── */

function RatesTodayCard() {
  const [rates, setRates] = useState<RateSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function fetchRates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rates/current");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRates({
        mortgage30yr: json.data?.mortgage30yr ?? null,
        mortgage30yrChange: json.data?.mortgage30yrChange ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to fetch rates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRates();
  }, []);

  const m30 = rates?.mortgage30yr;
  const chg = rates?.mortgage30yrChange;
  const isDown = chg != null && chg < 0;
  const isUp = chg != null && chg > 0;

  return (
    <MobileCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <p className="text-[13px] font-semibold text-content-primary">
            {t("dash.rates_today")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <span className="status-pill status-pill-live" role="status">
              {t("common.live")}
            </span>
          )}
          {error && (
            <WifiOff className="w-3.5 h-3.5 text-content-disabled" aria-label="Offline" />
          )}
          <button
            onClick={fetchRates}
            className="p-1.5 rounded-md hover:bg-white/[0.05] transition-colors"
            aria-label="Refresh rates"
            disabled={loading}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-content-disabled ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
      ) : (
        <>
          {/* Big rate number */}
          <div
            className="flex items-baseline gap-2 mb-1"
            aria-label={`30-year fixed rate: ${m30 != null ? m30.toFixed(2) : "unavailable"} percent`}
          >
            <span className="font-mono text-[2rem] font-bold text-content-primary tabular-nums leading-none">
              {m30 != null ? `${m30.toFixed(2)}%` : "N/A"}
            </span>
            {chg != null && chg !== 0 && (
              <div
                className={`flex items-center gap-0.5 font-mono text-[13px] ${
                  isDown ? "text-emerald-light" : "text-rose-light"
                }`}
                aria-label={`${Math.abs(chg * 100).toFixed(0)} basis points ${isDown ? "lower" : "higher"} than last week`}
              >
                {isDown ? (
                  <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {Math.abs(chg * 100).toFixed(0)}bps
              </div>
            )}
          </div>
          <p className="text-[11px] text-content-tertiary mb-3">{t("metric.30yr_fixed")}</p>

          {/* One-liner context */}
          {chg != null && (
            <div className="bg-surface-elevated rounded-lg px-3 py-2.5 border border-surface-border">
              <p className="text-[13px] text-content-secondary leading-snug">
                {isDown
                  ? `Good time to lock — rates down ${Math.abs(chg * 100).toFixed(0)}bps this week. Your buying power improved ~${Math.abs(chg * 0.165).toFixed(1)}%.`
                  : isUp
                  ? `Rates rose ${(chg * 100).toFixed(0)}bps this week. Re-run your pipeline deals — buying power dropped ~${(chg * 0.165).toFixed(1)}%.`
                  : "Rates flat this week — good time to analyze deals."}
              </p>
            </div>
          )}

          {error && (
            <p className="text-[11px] text-amber-light mt-2">
              {error.includes("FRED")
                ? "Add FRED_API_KEY to .env.local for live rates"
                : error}
            </p>
          )}
        </>
      )}
    </MobileCard>
  );
}

/* 5 — Market Signals card ────────────────────────────────────────────────── */

function MarketSignalsCard() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <MobileCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <p className="text-[13px] font-semibold text-content-primary">
            {t("dash.market_signals")}
          </p>
        </div>
        <Link
          href="/dashboard/markets"
          className="text-[11px] text-gold-light flex items-center gap-0.5 hover:text-gold transition-colors"
          aria-label="Explore all markets"
        >
          {t("common.all_markets")} <ChevronRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="space-y-1" role="list" aria-label="Market signals by state">
        {TOP_MARKETS.map((market) => {
          const label = scoreLabel(market.score);
          const dotCount = market.convergence;

          return (
            <Link
              key={market.stateCode}
              href={`/dashboard/markets?focus=${market.stateCode}`}
              role="listitem"
              className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors min-h-[44px]"
              aria-label={`${market.stateName}: score ${market.score}, ${label}, ${dotCount} of 5 bullish signals`}
            >
              {/* State code */}
              <span className="font-mono text-[11px] font-bold text-content-tertiary w-7 shrink-0">
                {market.stateCode}
              </span>

              {/* Metro name */}
              <span className="text-[13px] text-content-primary flex-1 truncate">
                {market.topMetro}
              </span>

              {/* Score */}
              <span
                className={`font-mono text-[14px] font-bold tabular-nums shrink-0 ${scoreColor(market.score)}`}
              >
                {market.score}
              </span>

              {/* Badge */}
              <span className={`shrink-0 ${scoreBadgeClass(market.score)}`}>
                {label}
              </span>

              {/* Convergence dots */}
              <div className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < dotCount
                        ? "bg-gold"
                        : "bg-surface-muted"
                    }`}
                  />
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <button
        onClick={() => router.push("/dashboard/markets")}
        className="btn-secondary btn-sm w-full justify-center mt-3 min-h-[44px]"
        aria-label="Explore all markets"
      >
        {t("dash.explore_markets")}
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </MobileCard>
  );
}

/* 6 — Pipeline card ──────────────────────────────────────────────────────── */

const STAGE_COLOR: Record<string, string> = {
  Discovered: "bg-content-disabled",
  Analyzing:  "bg-amber-light",
  Offer:      "bg-gold",
  Contract:   "bg-emerald-light",
  Closed:     "bg-emerald",
  Passed:     "bg-rose-light",
};

function PipelineCard() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <MobileCard>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-content-primary">
          {t("nav.pipeline")}{" "}
          <span className="text-gold-light">({PIPELINE_DEALS.length})</span>
        </p>
        <Link
          href="/dashboard/pipeline"
          className="text-[11px] text-gold-light flex items-center gap-0.5 hover:text-gold transition-colors"
        >
          {t("common.view_all_pipeline")} <ChevronRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="space-y-1" role="list" aria-label="Pipeline deals">
        {PIPELINE_DEALS.map((deal) => (
          <Link
            key={deal.id}
            href={`/dashboard/pipeline?deal=${deal.id}`}
            role="listitem"
            className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors min-h-[44px]"
            aria-label={`${deal.address}, ${deal.city}: ${fmtUSD(deal.cashFlow)} cash flow per month, stage ${deal.stage}`}
          >
            {/* Stage dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${STAGE_COLOR[deal.stage] ?? "bg-content-disabled"}`}
              aria-hidden="true"
            />

            {/* Address */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-content-primary font-medium truncate">
                {deal.address}
              </p>
              <p className="text-[11px] text-content-tertiary truncate">{deal.city}</p>
            </div>

            {/* Cash flow */}
            <div className="text-right shrink-0">
              <p className="font-mono text-[13px] text-emerald-light font-semibold tabular-nums">
                +{fmtUSD(deal.cashFlow)}/mo
              </p>
              <p className="text-[10px] text-content-disabled">{deal.stage}</p>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-content-disabled shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => router.push("/dashboard/pipeline")}
        className="btn-secondary btn-sm w-full justify-center mt-3 min-h-[44px]"
        aria-label="View full pipeline"
      >
        {t("pipeline.view_pipeline")}
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </MobileCard>
  );
}

/* 7 — Gamification card ──────────────────────────────────────────────────── */

function GamificationCard() {
  const totalXP = useGamificationStore((s) => s.totalXP);
  const currentStreak = useGamificationStore((s) => s.currentStreak);
  const { t } = useTranslation();

  const level = getLevel(totalXP);
  const nextLevel = getNextLevel(totalXP);
  const progress = getLevelProgress(totalXP);
  const progressPct = Math.round(progress * 100);

  const xpToNext = nextLevel ? nextLevel.minXP - totalXP : 0;
  const nextAchievement = "Analyze 5 deals";

  return (
    <MobileCard>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-gold-light" aria-hidden="true" />
        <p className="text-[13px] font-semibold text-content-primary">
          <span className="text-gold-light">
            Level {level.level}: {level.name}
          </span>{" "}
          {level.icon}
        </p>
      </div>

      {/* XP bar */}
      <div
        className="h-2.5 bg-surface-muted rounded-full overflow-hidden mb-1.5"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progressPct}% progress to next level`}
      >
        <div
          className="h-full bg-gradient-to-r from-gold to-gold/70 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[11px] text-content-tertiary tabular-nums">
          {totalXP.toLocaleString()} XP
        </p>
        {nextLevel && (
          <p className="font-mono text-[11px] text-content-disabled tabular-nums">
            {xpToNext} XP to {nextLevel.name}
          </p>
        )}
      </div>

      {/* Streak + next achievement */}
      <div className="flex items-center gap-3">
        {currentStreak > 0 && (
          <div
            className="flex items-center gap-1.5 bg-amber-muted rounded-lg px-2.5 py-1.5 border border-amber/10"
            aria-label={`${currentStreak}-${t("game.day_streak")}`}
          >
            <span aria-hidden="true" className="text-sm">🔥</span>
            <span className="font-mono text-[12px] text-amber-light font-semibold">
              {currentStreak}-{t("game.day_streak")}
            </span>
          </div>
        )}
        <p className="text-[11px] text-content-secondary flex-1">
          Next: {nextAchievement}
        </p>
      </div>
    </MobileCard>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────── */

export function MobileDashboard() {
  const { t } = useTranslation();

  return (
    <div
      className="overscroll-y-contain pb-6 space-y-3 px-3 pt-3"
      style={{ overscrollBehavior: "contain" }}
      aria-label="LootVue Mobile Dashboard"
    >
      {/* Section: greeting + portfolio summary */}
      <PortfolioHeader />

      {/* Section: AI next move */}
      <section aria-labelledby="next-move-heading">
        <h2 id="next-move-heading" className="sr-only">{t("dash.next_move")}</h2>
        <NextMoveCard />
      </section>

      {/* Section: quick analyze */}
      <section aria-labelledby="quick-analyze-heading">
        <h2 id="quick-analyze-heading" className="sr-only">{t("dash.quick_analyze")}</h2>
        <QuickAnalyzeCard />
      </section>

      {/* Section: rates */}
      <section aria-labelledby="rates-heading">
        <h2 id="rates-heading" className="sr-only">{t("dash.rates_today")}</h2>
        <RatesTodayCard />
      </section>

      {/* Section: market signals */}
      <section aria-labelledby="signals-heading">
        <h2 id="signals-heading" className="sr-only">{t("dash.market_signals")}</h2>
        <MarketSignalsCard />
      </section>

      {/* Section: pipeline */}
      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="sr-only">{t("nav.pipeline")}</h2>
        <PipelineCard />
      </section>

      {/* Section: gamification */}
      <section aria-labelledby="level-heading">
        <h2 id="level-heading" className="sr-only">{t("game.level_progress")}</h2>
        <GamificationCard />
      </section>
    </div>
  );
}
