"use client";

import { useState, useCallback, useEffect, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Save, SlidersHorizontal, ArrowLeftRight, AlertTriangle,
  Wifi, Database, TrendingUp, ChevronRight, Home, Calendar,
  Hammer, RefreshCw, DollarSign, BarChart3, Shield, Landmark,
  Zap, MapPin, ArrowUpRight, ArrowDownRight,
  GitCompare, Receipt, LogOut,
} from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import {
  AnalysisSkeleton, scoreColor,
  type AnalysisResult,
} from "./_components";
import { InvestmentMemoCard } from "./InvestmentMemo";
import { NeighborhoodTab } from "./_neighborhood-tab";
import { CompsTab } from "./_comps-tab";
import { TaxTab } from "./_tax-tab";
import { WhatIfTab } from "./_whatif-tab";
import { ExitTab } from "./_exit-tab";
import { Term } from "@/components/shared/Term";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import { SAMPLE_FACTORS } from "@/components/charts/FactorAttributionChart";
import { MONTE_CARLO_SAMPLE } from "@/components/charts/MonteCarloChart";
import { STRESS_TEST_SAMPLE } from "@/components/charts/StressTestChart";
import { SAMPLE_SIGNALS, SAMPLE_CONVERGENCE_CONTEXT } from "@/components/charts/SignalConvergenceChart";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { LTRPlaybook } from "./_playbook-ltr";
import { STRPlaybook } from "./_playbook-str";
import { FlipPlaybook } from "./_playbook-flip";
import { BRRRRPlaybook } from "./_playbook-brrrr";

// ─── Lazy-loaded charts ────────────────────────────────────────────────────────

const FactorAttributionChart = dynamic(
  () => import("@/components/charts/FactorAttributionChart").then((m) => ({ default: m.FactorAttributionChart })),
  { ssr: false, loading: () => <div className="skeleton h-64 rounded-xl" /> }
);

const MonteCarloChart = dynamic(
  () => import("@/components/charts/MonteCarloChart").then((m) => ({ default: m.MonteCarloChart })),
  { ssr: false, loading: () => <div className="skeleton h-80 rounded-xl" /> }
);

const StressTestChart = dynamic(
  () => import("@/components/charts/StressTestChart").then((m) => ({ default: m.StressTestChart })),
  { ssr: false, loading: () => <div className="skeleton h-[350px] rounded-xl" /> }
);

const BubbleChart = dynamic(
  () => import("@/components/charts/BubbleChart").then((m) => ({ default: m.BubbleChart })),
  { ssr: false, loading: () => <div className="skeleton h-[450px] rounded-xl" /> }
);

const GeoBreadcrumb = dynamic(
  () => import("@/components/charts/GeoBreadcrumb").then((m) => ({ default: m.GeoBreadcrumb })),
  { ssr: false, loading: () => <div className="skeleton h-9 rounded-lg" /> }
);

const HPIForecastChart = dynamic(
  () => import("@/components/charts/HPIForecastChart").then((m) => ({ default: m.HPIForecastChart })),
  { ssr: false, loading: () => <div className="skeleton h-72 rounded-xl" /> }
);

const SignalConvergenceChart = dynamic(
  () => import("@/components/charts/SignalConvergenceChart").then((m) => ({ default: m.SignalConvergenceChart })),
  { ssr: false, loading: () => <div className="skeleton h-[350px] rounded-xl" /> }
);

const MultiDimensionalExplorer = dynamic(
  () => import("@/components/charts/MultiDimensionalExplorer").then((m) => ({ default: m.MultiDimensionalExplorer })),
  { ssr: false, loading: () => <div className="skeleton h-[500px] rounded-xl" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "LTR" | "STR" | "Flip" | "BRRRR";
type TabId = "summary" | "financials" | "risk" | "market" | "financing" | "neighborhood" | "comps" | "tax" | "whatif" | "exit";

interface DataSourceInfo {
  name: string;
  status: "live" | "fallback" | "unavailable";
  source?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const STRATEGY_CONFIG: Record<Strategy, {
  label: string;
  tagline: string;
  icon: ReactNode;
  accent: string;
}> = {
  LTR: {
    label: "Monthly Rental Income",
    tagline: "Buy, rent out, collect monthly cash flow",
    icon: <Home className="w-5 h-5" aria-hidden="true" />,
    accent: CHART_COLORS.emerald,
  },
  STR: {
    label: "Short-Term Rentals",
    tagline: "Airbnb/VRBO, higher returns, more work",
    icon: <Calendar className="w-5 h-5" aria-hidden="true" />,
    accent: CHART_COLORS.gold,
  },
  Flip: {
    label: "Fix & Flip",
    tagline: "Buy cheap, renovate, sell for profit in 3-6 months",
    icon: <Hammer className="w-5 h-5" aria-hidden="true" />,
    accent: CHART_COLORS.amber,
  },
  BRRRR: {
    label: "BRRRR Method",
    tagline: "Buy, Rehab, Rent, Refinance, Repeat — build a portfolio",
    icon: <RefreshCw className="w-5 h-5" aria-hidden="true" />,
    accent: CHART_COLORS.goldLight,
  },
};

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "summary",      label: "Summary",       icon: <Home className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "financials",   label: "Financials",    icon: <DollarSign className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "risk",         label: "Risk",          icon: <Shield className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "market",       label: "Market",        icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "financing",    label: "Financing",     icon: <Landmark className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "neighborhood", label: "Neighborhood",  icon: <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "comps",        label: "Comps",         icon: <GitCompare className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "tax",          label: "Tax Impact",    icon: <Receipt className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "whatif",       label: "What-If",       icon: <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "exit",         label: "Exit Strategy", icon: <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> },
];

// Sample trending deals shown before any analysis
const TRENDING_DEALS = [
  { address: "214 Oak Hollow Dr, Nashville TN", price: 342000, rent: 2450, cashFlow: 287, score: 81, verdict: "BUY" as const },
  { address: "5901 Bergamo Way, Austin TX", price: 418000, rent: 2900, cashFlow: 142, score: 68, verdict: "BUY" as const },
  { address: "8820 Crimson Ridge, Phoenix AZ", price: 295000, rent: 2100, cashFlow: 318, score: 84, verdict: "BUY" as const },
  { address: "330 Waverly Ave, Tampa FL", price: 389000, rent: 2650, cashFlow: -84, score: 51, verdict: "PASS" as const },
  { address: "1102 River Bend Rd, Charlotte NC", price: 312000, rent: 2280, cashFlow: 224, score: 77, verdict: "BUY" as const },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

// Strategy Cards ───────────────────────────────────────────────────────────────

function StrategyCards({
  value,
  onChange,
}: {
  value: Strategy;
  onChange: (s: Strategy) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      role="group"
      aria-label="Select investment strategy"
    >
      {(["LTR", "STR", "Flip", "BRRRR"] as Strategy[]).map((s, i) => {
        const cfg = STRATEGY_CONFIG[s];
        const active = value === s;
        return (
          <motion.button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className={[
              "relative text-left p-4 rounded-xl border transition-all duration-150 group",
              active
                ? "bg-surface-card border-gold/30 shadow-[0_0_20px_-4px_rgba(201,162,39,0.15)]"
                : "bg-surface-secondary border-surface-border hover:border-white/10",
            ].join(" ")}
          >
            {active && (
              <span
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold"
                aria-hidden="true"
              />
            )}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{
                background: active ? `${cfg.accent}22` : "rgba(255,255,255,0.04)",
                color: active ? cfg.accent : "#666666",
              }}
              aria-hidden="true"
            >
              {cfg.icon}
            </div>
            <p className={`text-[13px] font-semibold leading-tight mb-1 ${active ? "text-content-primary" : "text-content-secondary"}`}>
              {cfg.label}
            </p>
            <p className="text-[11px] text-content-disabled leading-snug">
              {cfg.tagline}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

// Trending Deals ───────────────────────────────────────────────────────────────

function TrendingDeals({
  onSelect,
}: {
  onSelect: (address: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
        <span className="section-label text-content-tertiary">Trending Deals This Week</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {TRENDING_DEALS.map((deal, i) => {
          const isBuy = deal.verdict === "BUY";
          const scoreCol = scoreColor(deal.score);
          return (
            <motion.button
              key={deal.address}
              type="button"
              onClick={() => onSelect(deal.address)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="card-hover text-left p-3 space-y-2 group"
              aria-label={`Analyze ${deal.address} — score ${deal.score}, ${deal.verdict}`}
            >
              <div className="flex items-start justify-between gap-1">
                <MapPin className="w-3 h-3 text-content-disabled mt-0.5 shrink-0" aria-hidden="true" />
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isBuy ? "bg-emerald/10 text-emerald border border-emerald/20" : "bg-rose/10 text-rose-light border border-rose/20"}`}>
                  {deal.verdict}
                </span>
              </div>
              <p className="text-[11px] text-content-secondary leading-tight">
                {deal.address.split(",")[0]}
                <span className="block text-content-disabled">{deal.address.split(",").slice(1).join(",").trim()}</span>
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-content-disabled">Score</p>
                  <p className={`text-base font-bold font-mono tabular-nums ${scoreCol}`}>{deal.score}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-content-disabled">Cash Flow</p>
                  <div className={`flex items-center gap-0.5 text-[12px] font-mono tabular-nums font-semibold ${deal.cashFlow >= 0 ? "text-emerald" : "text-rose-light"}`}>
                    {deal.cashFlow >= 0
                      ? <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                      : <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
                    {formatCurrency(Math.abs(deal.cashFlow))}/mo
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Search Bar ───────────────────────────────────────────────────────────────────

function SearchBar({
  address,
  price,
  downPct,
  rate,
  loading,
  onAddressChange,
  onPriceChange,
  onDownPctChange,
  onRateChange,
  onAnalyze,
}: {
  address: string;
  price: string;
  downPct: string;
  rate: string;
  loading: boolean;
  onAddressChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onDownPctChange: (v: string) => void;
  onRateChange: (v: string) => void;
  onAnalyze: () => void;
}) {
  return (
    <div className="card-gold space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-2 lg:col-span-2">
          <label
            htmlFor="property-address"
            className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5"
          >
            Property Address
          </label>
          <input
            id="property-address"
            type="text"
            placeholder="123 Main St, Austin TX 78701"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
            className="input-glass"
            aria-label="Enter property address"
            aria-required="true"
          />
        </div>
        <div>
          <label
            htmlFor="purchase-price"
            className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5"
          >
            Price <span className="text-content-disabled normal-case">(optional)</span>
          </label>
          <input
            id="purchase-price"
            type="text"
            placeholder="$385,000"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            className="input-glass font-mono"
            aria-label="Purchase price (optional)"
          />
        </div>
        <div>
          <label
            htmlFor="down-pct"
            className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5"
          >
            Down Payment %
          </label>
          <input
            id="down-pct"
            type="number"
            min="3"
            max="100"
            value={downPct}
            onChange={(e) => onDownPctChange(e.target.value)}
            className="input-glass font-mono"
            aria-label="Down payment percentage"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor="interest-rate"
            className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5"
          >
            Interest Rate %
          </label>
          <input
            id="interest-rate"
            type="number"
            step="0.125"
            min="1"
            max="20"
            value={rate}
            onChange={(e) => onRateChange(e.target.value)}
            className="input-glass font-mono"
            aria-label="Mortgage interest rate percentage"
          />
        </div>
        <div className="sm:col-span-2 flex items-end">
          <button
            onClick={onAnalyze}
            disabled={!address.trim() || loading}
            className="btn-primary w-full"
            aria-label={loading ? "Analysis in progress" : "Analyze this property"}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" aria-hidden="true" />
                Get the Verdict
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tab Nav ──────────────────────────────────────────────────────────────────────

function TabNav({ activeTab, onChange }: { activeTab: TabId; onChange: (t: TabId) => void }) {
  return (
    <div
      className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-surface-border pb-px"
      role="tablist"
      aria-label="Analysis tabs"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={[
              "flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[12px] font-medium",
              "transition-all duration-150 border-b-2 -mb-px shrink-0",
              isActive
                ? "border-gold text-gold"
                : "border-transparent text-content-tertiary hover:text-content-secondary hover:border-white/10",
            ].join(" ")}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Verdict Hero ─────────────────────────────────────────────────────────────────

function VerdictHero({
  result,
  downPct,
  onSave,
  saved,
  onSimulate,
  onCompare,
}: {
  result: AnalysisResult;
  downPct: number;
  onSave: () => void;
  saved: boolean;
  onSimulate: () => void;
  onCompare: () => void;
}) {
  const isBuy = result.verdict === "BUY";
  const isDig = result.score >= 55 && result.score < 75;
  const verdictLabel = isBuy ? "BUY" : isDig ? "DIG DEEPER" : "PASS";
  const verdictColor = isBuy ? "text-emerald-light" : isDig ? "text-amber-light" : "text-rose-light";
  const cardClass = isBuy ? "glass-gold" : "glass";
  const downAmount = Math.round(result.purchasePrice * (downPct / 100));

  return (
    <div
      className={`${cardClass} p-6`}
      aria-label={`Deal verdict: ${verdictLabel}, score ${result.score} out of 100, confidence ${result.confidence}%`}
    >
      {/* Verdict row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: 56, height: 56 }} aria-hidden="true">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#1F1F1F" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24"
                fill="none"
                stroke={isBuy ? CHART_COLORS.emerald : isDig ? CHART_COLORS.amber : CHART_COLORS.rose}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(result.score / 100) * 150.8} 150.8`}
                transform="rotate(-90 28 28)"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-[14px] font-bold font-mono tabular-nums"
              style={{ color: isBuy ? CHART_COLORS.emeraldLight : isDig ? CHART_COLORS.amberLight : CHART_COLORS.roseLight }}
            >
              {result.score}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-content-tertiary mb-0.5">
              LootVue Verdict
            </p>
            <p className={`text-4xl font-bold font-display tracking-tight ${verdictColor}`} aria-label={`Verdict: ${verdictLabel}`}>
              {verdictLabel}
            </p>
            <p className="text-[12px] text-content-tertiary mt-0.5">
              Confidence:{" "}
              <span className="font-mono font-semibold text-content-secondary">{result.confidence}%</span>
            </p>
          </div>
        </div>
        {/* Action buttons — pushed right on sm+ */}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            onClick={onSave}
            disabled={saved}
            className={saved ? "btn-secondary btn-sm opacity-60 cursor-default" : "btn-emerald btn-sm"}
            aria-label={saved ? "Saved to pipeline" : "Save this deal to your pipeline"}
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            {saved ? "Saved" : "Save to Pipeline"}
          </button>
          <button onClick={onSimulate} className="btn-primary btn-sm" aria-label="Open in scenario simulator">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Simulate
          </button>
          <button onClick={onCompare} className="btn-ghost btn-sm" aria-label="Compare with another property">
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            Compare
          </button>
        </div>
      </div>

      {/* Compact metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Monthly Rent",
            termId: null as string | null,
            value: formatCurrency(result.monthlyRent),
            sub: "market estimate",
            color: "text-emerald-light",
          },
          {
            label: "Net Cash Flow",
            termId: null as string | null,
            value: result.monthlyCashFlow >= 0
              ? `+${formatCurrency(result.monthlyCashFlow)}`
              : `(${formatCurrency(Math.abs(result.monthlyCashFlow))})`,
            sub: `${formatCurrency(result.monthlyCashFlow * 12)}/yr in your pocket`,
            color: result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light",
          },
          {
            label: "Cash-on-Cash",
            termId: "coc" as string | null,
            value: `${result.cashOnCash.toFixed(1)}%`,
            sub: "annual return on cash",
            color: scoreColor(result.cashOnCash >= 8 ? 80 : result.cashOnCash >= 5 ? 60 : 40),
          },
          {
            label: "Total Cash In",
            termId: null as string | null,
            value: formatCompact(downAmount + Math.round(result.purchasePrice * 0.03)),
            sub: "down + closing costs",
            color: "text-content-primary",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-secondary rounded-xl p-3 border border-surface-border text-center"
          >
            <p className="metric-label mb-1">
              {stat.termId ? <Term id={stat.termId}>{stat.label}</Term> : stat.label}
            </p>
            <p
              className={`text-lg font-bold font-mono tabular-nums ${stat.color}`}
              aria-label={`${stat.label}: ${stat.value}`}
            >
              {stat.value}
            </p>
            <p className="text-[10px] text-content-disabled mt-0.5 leading-snug">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Summary Tab ──────────────────────────────────────────────────────────────────

function SummaryTab({ result, downPct, rate }: { result: AnalysisResult; downPct: number; rate: number }) {
  const downAmount  = Math.round(result.purchasePrice * (downPct / 100));
  const loanAmount  = result.purchasePrice - downAmount;
  const closingCost = Math.round(result.purchasePrice * 0.03);
  const totalCashIn = downAmount + closingCost;
  const netOpIncome = result.monthlyRent - result.monthlyExpenses;
  const grm = result.monthlyRent > 0
    ? Math.round((result.purchasePrice / (result.monthlyRent * 12)) * 10) / 10
    : 0;

  return (
    <div role="tabpanel" id="tabpanel-summary" aria-labelledby="tab-summary" className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <h3 className="section-label flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            What You&apos;d Pay
          </h3>
          <div className="space-y-2 font-mono text-[13px]">
            {[
              { label: "Purchase Price",          value: formatCurrency(result.purchasePrice),  color: "text-content-primary" },
              { label: `Down (${downPct}%)`,       value: formatCurrency(downAmount),            color: "text-rose-light" },
              { label: "Loan Amount",             value: formatCurrency(loanAmount),             color: "text-content-secondary" },
              { label: `Mortgage (${rate}% 30yr)`, value: `${formatCurrency(result.monthlyMortgage)}/mo`, color: "text-rose-light" },
              { label: "Est. Closing (3%)",       value: formatCurrency(closingCost),            color: "text-rose-light" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center gap-2">
                <span className="text-content-tertiary font-sans text-[13px]">{row.label}</span>
                <span className={`${row.color} tabular-nums`}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center gap-2 pt-2 border-t border-surface-border font-bold">
              <span className="text-content-primary font-sans text-[13px]">Total Cash In</span>
              <span className="text-content-primary tabular-nums" aria-label={`Total cash required: ${formatCurrency(totalCashIn)}`}>
                {formatCurrency(totalCashIn)}
              </span>
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="section-label flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            What You&apos;d Earn
          </h3>
          <div className="space-y-2 font-mono text-[13px]">
            {[
              { label: "Monthly Rent",       value: `${formatCurrency(result.monthlyRent)}/mo`,  color: "text-emerald-light" },
              { label: "Operating Expenses", value: `(${formatCurrency(result.monthlyExpenses)})/mo`, color: "text-rose-light" },
              { label: "Net Op. Income",     value: `${formatCurrency(netOpIncome)}/mo`,          color: netOpIncome >= 0 ? "text-emerald-light" : "text-rose-light" },
              { label: "Mortgage Payment",   value: `(${formatCurrency(result.monthlyMortgage)})/mo`, color: "text-rose-light" },
              { label: "After Mortgage",     value: `${result.monthlyCashFlow >= 0 ? "+" : ""}${formatCurrency(result.monthlyCashFlow)}/mo`, color: result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center gap-2">
                <span className="text-content-tertiary font-sans text-[13px]">{row.label}</span>
                <span className={`${row.color} tabular-nums`}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center gap-2 pt-2 border-t border-surface-border font-bold">
              <span className="text-content-primary font-sans text-[13px]">Annual Cash Flow</span>
              <span
                className={`${result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"} tabular-nums`}
                aria-label={`Annual cash flow: ${formatCurrency(result.monthlyCashFlow * 12)}`}
              >
                {result.monthlyCashFlow >= 0
                  ? formatCurrency(result.monthlyCashFlow * 12)
                  : `(${formatCurrency(Math.abs(result.monthlyCashFlow * 12))})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: "cap-rate",
            label: "Cap Rate",
            value: `${result.capRate.toFixed(1)}%`,
            context: `NOI ÷ price. Market avg ~5.8% — you&apos;re ${result.capRate >= 5.8 ? "above" : "below"} average.`,
            color: scoreColor(result.capRate >= 7 ? 80 : result.capRate >= 5 ? 60 : 40),
          },
          {
            id: "dscr",
            label: "DSCR",
            value: `${result.dscr.toFixed(2)}x`,
            context: `Income covers debt ${result.dscr.toFixed(2)}x. Lenders need ≥ 1.25x to qualify.`,
            color: scoreColor(result.dscr >= 1.25 ? 80 : result.dscr >= 1.0 ? 60 : 40),
          },
          {
            id: "coc",
            label: "Cash-on-Cash",
            value: `${result.cashOnCash.toFixed(1)}%`,
            context: `You put in ${formatCompact(downAmount + Math.round(result.purchasePrice * 0.03))}. Getting ${formatCurrency(result.monthlyCashFlow * 12)}/yr back.`,
            color: scoreColor(result.cashOnCash >= 8 ? 80 : result.cashOnCash >= 5 ? 60 : 40),
          },
          {
            id: "grm",
            label: "Gross Rent Mult.",
            value: `${grm.toFixed(1)}x`,
            context: `At this price, rent covers cost in ${grm.toFixed(1)} years. Under 12x is strong.`,
            color: scoreColor(grm <= 12 ? 80 : grm <= 18 ? 60 : 40),
          },
        ].map((m) => (
          <div key={m.id} className="card-bento space-y-1.5">
            <p className="metric-label">
              <Term id={m.id} value={m.id === "cap-rate" ? result.capRate : m.id === "dscr" ? result.dscr : m.id === "coc" ? result.cashOnCash : grm}>
                {m.label}
              </Term>
            </p>
            <p className={`metric-value ${m.color}`} aria-label={`${m.label}: ${m.value}`}>{m.value}</p>
            <p className="text-[11px] text-content-disabled leading-snug">{m.context}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl">
        <FactorAttributionChart factors={SAMPLE_FACTORS} totalScore={result.score} maxScore={100} title="What's Driving This Score" />
      </div>

      <AiInsightStrip
        summary={
          result.score >= 75
            ? `Strong fundamentals. Cap rate ${result.capRate.toFixed(1)}% with ${formatCurrency(result.monthlyCashFlow)}/mo net — above institutional minimum on every metric.`
            : result.score >= 55
            ? `Mixed signals. Cap rate ${result.capRate.toFixed(1)}% is workable but ${formatCurrency(result.monthlyCashFlow)}/mo leaves thin margins. Negotiate price down 5-8%.`
            : `The numbers don't support this price. Cap rate ${result.capRate.toFixed(1)}% and ${formatCurrency(result.monthlyCashFlow)}/mo signal negative leverage risk.`
        }
        factors={[
          { label: "Cap rate vs market", value: result.capRate - 5.8, unit: "pp" },
          { label: "Cash flow cushion",  value: result.monthlyCashFlow / 100, unit: "%" },
          { label: "DSCR margin",        value: result.dscr - 1.0, unit: "x" },
        ]}
        sources={["Census ACS", "FRED", "RentCast"]}
        confidence={result.score >= 70 ? "high" : result.score >= 50 ? "medium" : "low"}
      />
    </div>
  );
}

// Financials Tab ───────────────────────────────────────────────────────────────

function FinancialsTab({ result, downPct, rate }: { result: AnalysisResult; downPct: number; rate: number }) {
  const [chainOpen, setChainOpen] = useState(false);
  const downAmount  = Math.round(result.purchasePrice * (downPct / 100));
  const propTax     = Math.round(result.purchasePrice * 0.011 / 12);
  const insurance   = Math.round(result.purchasePrice * 0.005 / 12);
  const maintenance = Math.round(result.monthlyRent * 0.08);
  const vacancy     = Math.round(result.monthlyRent * 0.05);
  const mgmt        = Math.round(result.monthlyRent * 0.08);

  const expenses: { label: string; termId?: string; amount: number; note: string }[] = [
    { label: "Property Tax (1.1% ann.)", amount: propTax,     note: "Census ACS" },
    { label: "Insurance (0.5% ann.)",    amount: insurance,   note: "Market avg" },
    { label: "Maintenance (8% of rent)", amount: maintenance, note: "Industry std" },
    { label: "Vacancy Reserve (5%)",     termId: "vacancy",   amount: vacancy,     note: "Market avg" },
    { label: "Property Mgmt (8%)",       amount: mgmt,        note: "If outsourced" },
  ];

  return (
    <div role="tabpanel" id="tabpanel-financials" aria-labelledby="tab-financials" className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-label flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            Monthly Expense Breakdown
          </h3>
          <span className="text-[11px] font-mono text-content-disabled">ZIP-level estimates</span>
        </div>
        <div className="space-y-2" role="list" aria-label="Monthly expenses">
          {expenses.map((exp) => {
            const pct = exp.amount / result.monthlyRent * 100;
            return (
              <div key={exp.label} className="flex items-center gap-3" role="listitem"
                aria-label={`${exp.label}: ${formatCurrency(exp.amount)}/mo`}>
                <span className="text-[12px] text-content-secondary flex-1">
                  {exp.termId ? <Term id={exp.termId}>{exp.label}</Term> : exp.label}
                </span>
                <div className="hidden sm:block h-1.5 rounded-full bg-rose-muted overflow-hidden" style={{ width: 80 }} aria-hidden="true">
                  <div className="h-full rounded-full bg-rose opacity-70" style={{ width: `${Math.min(100, pct * 2)}%` }} />
                </div>
                <span className="text-[12px] font-mono tabular-nums text-rose-light w-16 text-right">{formatCurrency(exp.amount)}</span>
                <span className="text-[10px] text-content-disabled w-14 text-right hidden lg:block">[{exp.note}]</span>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2 border-t border-surface-border font-mono text-[13px] font-bold">
            <span className="text-content-primary font-sans">Total Monthly Expenses</span>
            <span className="text-rose-light tabular-nums" aria-label={`Total: ${formatCurrency(result.monthlyExpenses)}`}>
              {formatCurrency(result.monthlyExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Flow Waterfall */}
      <div className="card space-y-3">
        <h3 className="section-label">Cash Flow Waterfall</h3>
        <div className="space-y-1.5">
          {[
            { label: "Gross Rent",    termId: null as string | null, value: result.monthlyRent,                    positive: true,  bar: 100 },
            { label: "Vacancy (−5%)", termId: "vacancy" as string | null, value: -Math.round(result.monthlyRent * 0.05), positive: false, bar: 5 },
            { label: "Expenses",      termId: null as string | null, value: -result.monthlyExpenses,               positive: false, bar: (result.monthlyExpenses / result.monthlyRent) * 100 },
            { label: "Mortgage",      termId: null as string | null, value: -result.monthlyMortgage,               positive: false, bar: (result.monthlyMortgage / result.monthlyRent) * 100 },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-[12px] text-content-tertiary w-32 shrink-0">
                {row.termId ? <Term id={row.termId}>{row.label}</Term> : row.label}
              </span>
              <div className="flex-1 h-6 rounded bg-surface-elevated overflow-hidden relative" aria-hidden="true">
                <div
                  className={`h-full rounded transition-all duration-500 ${row.positive ? "bg-emerald opacity-70" : "bg-rose opacity-60"}`}
                  style={{ width: `${Math.min(100, row.bar)}%`, transitionDelay: `${i * 80}ms` }}
                />
              </div>
              <span className={`text-[12px] font-mono tabular-nums w-20 text-right ${row.positive ? "text-emerald-light" : "text-rose-light"}`}
                aria-label={`${row.label}: ${formatCurrency(Math.abs(row.value))}`}>
                {row.positive ? "+" : ""}{row.value >= 0 ? formatCurrency(row.value) : `(${formatCurrency(Math.abs(row.value))})`}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1.5 border-t border-surface-border">
            <span className="text-[12px] text-content-primary font-semibold w-32 shrink-0">Net Cash Flow</span>
            <div className="flex-1" aria-hidden="true" />
            <span className={`text-[13px] font-bold font-mono tabular-nums w-20 text-right ${result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}
              aria-label={`Net cash flow: ${formatCurrency(Math.abs(result.monthlyCashFlow))}/mo`}>
              {result.monthlyCashFlow >= 0
                ? `+${formatCurrency(result.monthlyCashFlow)}`
                : `(${formatCurrency(Math.abs(result.monthlyCashFlow))})`}
            </span>
          </div>
        </div>
      </div>

      {/* Calculation Chain */}
      <div className="card space-y-3">
        <button
          onClick={() => setChainOpen((v) => !v)}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={chainOpen}
          aria-controls="calc-chain"
        >
          <h3 className="section-label flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            Calculation Chain — Show Your Work
          </h3>
          <ChevronRight className={`w-4 h-4 text-content-disabled transition-transform duration-150 ${chainOpen ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
        {chainOpen && (
          <div id="calc-chain" className="animate-fade-in space-y-3">
            <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border font-mono text-[12px] space-y-2">
              {[
                { step: "1.", termId: null as string | null, label: "Gross Annual Rent",           value: `${formatCurrency(result.monthlyRent)} × 12 = ${formatCurrency(result.monthlyRent * 12)}` },
                { step: "2.", termId: null as string | null, label: "Effective Gross Income (5%)", value: `${formatCurrency(result.monthlyRent * 12)} × 0.95 = ${formatCurrency(Math.round(result.monthlyRent * 12 * 0.95))}` },
                { step: "3.", termId: null as string | null, label: "Total Operating Expenses",    value: `${formatCurrency(result.monthlyExpenses)} × 12 = ${formatCurrency(result.monthlyExpenses * 12)}` },
                { step: "4.", termId: "noi" as string | null, label: "Net Operating Income (NOI)",  value: `= ${formatCurrency(Math.round(result.monthlyRent * 12 * 0.95 - result.monthlyExpenses * 12))}` },
                { step: "5.", termId: null as string | null, label: "Annual Debt Service",         value: `${formatCurrency(result.monthlyMortgage)} × 12 = ${formatCurrency(result.monthlyMortgage * 12)}` },
                { step: "6.", termId: null as string | null, label: "Net Cash Flow (annual)",      value: `NOI − debt = ${formatCurrency(result.monthlyCashFlow * 12)}` },
                { step: "7.", termId: "cap-rate" as string | null, label: "Cap Rate",              value: `NOI ÷ ${formatCurrency(result.purchasePrice)} = ${result.capRate.toFixed(2)}%` },
                { step: "8.", termId: "coc" as string | null, label: "Cash-on-Cash",               value: `${formatCurrency(result.monthlyCashFlow * 12)} ÷ ${formatCurrency(downAmount)} = ${result.cashOnCash.toFixed(2)}%` },
                { step: "9.", termId: "dscr" as string | null, label: "DSCR",                      value: `NOI ÷ debt = ${result.dscr.toFixed(3)}x` },
              ].map((row) => (
                <div key={row.step} className="flex gap-3">
                  <span className="text-content-disabled shrink-0 w-5">{row.step}</span>
                  <span className="text-content-tertiary flex-1">
                    {row.termId ? <Term id={row.termId}>{row.label}</Term> : row.label}
                  </span>
                  <span className="text-content-primary text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AiInsightStrip
        summary={`The biggest expense driver is ${result.monthlyExpenses > result.monthlyMortgage ? "operating costs" : "debt service"} — ${Math.round((Math.max(result.monthlyExpenses, result.monthlyMortgage) / result.monthlyRent) * 100)}% of gross rent. ${result.monthlyCashFlow >= 0 ? "Positive cash flow at current price." : "Renegotiating price 5% down would flip this to positive."}`}
        sources={["Census ACS", "BLS", "FRED"]}
        confidence="medium"
      />
    </div>
  );
}

// Risk Tab ─────────────────────────────────────────────────────────────────────

function RiskTab({ result }: { result: AnalysisResult }) {
  const survivedCount = result.stress?.scenarios?.filter((s) => s.survives).length ?? 0;
  const totalScenarios = result.stress?.scenarios?.length ?? 6;

  return (
    <div role="tabpanel" id="tabpanel-risk" aria-labelledby="tab-risk" className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <h3 className="section-label flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Stress Test Survival — {survivedCount}/{totalScenarios} Scenarios
        </h3>
        <div className="overflow-hidden rounded-xl">
          <StressTestChart {...STRESS_TEST_SAMPLE} />
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h3 className="section-label flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            <Term id="irr">IRR</Term>
            &nbsp;Distribution — 10,000 Simulations
          </h3>
          <p className="text-[11px] text-content-disabled mt-0.5">Range of possible returns under variable market conditions</p>
        </div>
        <div className="overflow-hidden rounded-xl">
          <MonteCarloChart {...MONTE_CARLO_SAMPLE} />
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="section-label">Break-Even Thresholds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Break-Even Vacancy", termId: "vacancy" as string | null, value: "18.2%", note: "12.8pp cushion vs 5% assumed", color: "text-emerald-light" },
            { label: "Break-Even Rate",    termId: null as string | null,      value: "8.9%",  note: "2.05pp above current market rate", color: "text-amber-light" },
            { label: "Reserves Needed",    termId: null as string | null,      value: "6 mo",  note: "Worst-case scenario cash burn", color: "text-gold" },
          ].map((m) => (
            <div key={m.label} className="bg-surface-secondary rounded-xl p-4 border border-surface-border space-y-2"
              aria-label={`${m.label}: ${m.value}. ${m.note}`}>
              <p className="metric-label">
                {m.termId ? <Term id={m.termId}>{m.label}</Term> : m.label}
              </p>
              <p className={`metric-value ${m.color}`}>{m.value}</p>
              <p className="text-[11px] text-content-tertiary italic">{m.note}</p>
            </div>
          ))}
        </div>
      </div>

      <AiInsightStrip
        summary={`${survivedCount >= 4 ? "Solid risk profile" : survivedCount >= 2 ? "Moderate risk" : "Elevated risk"} — ${survivedCount} of ${totalScenarios} stress scenarios survived. Main vulnerability: rate shock above 8.9%. Hold 6 months reserves.`}
        sources={["NCREIF", "FRED", "BLS"]}
        confidence={survivedCount >= 4 ? "high" : survivedCount >= 2 ? "medium" : "low"}
      />
    </div>
  );
}

// Market Tab ───────────────────────────────────────────────────────────────────

function MarketTab({ result }: { result: AnalysisResult }) {
  const market = result.address.split(",").slice(-2).join(",").trim();
  const stateMatch = result.address.match(/\b([A-Z]{2})\b/);
  const stateCode = stateMatch ? stateMatch[1] : "national";

  return (
    <div role="tabpanel" id="tabpanel-market" aria-labelledby="tab-market" className="space-y-5 animate-fade-in">
      <div className="card p-3">
        <GeoBreadcrumb />
      </div>

      <div className="overflow-hidden rounded-xl">
        <SignalConvergenceChart
          signals={SAMPLE_SIGNALS}
          convergenceCount={3}
          historicalContext={SAMPLE_CONVERGENCE_CONTEXT}
          market={market}
          defaultExpanded={false}
        />
      </div>

      <div className="card space-y-3">
        <h3 className="section-label">Market Score</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Supply Score",    labelTermId: null as string | null, value: "82",   unit: "/100", unitTermId: null as string | null, color: "text-emerald-light", sub: "Tight — 2.1 mo supply" },
            { label: "Permit Activity", labelTermId: "building-permits" as string | null, value: "+34%", unit: " YoY", unitTermId: "yoy-appreciation" as string | null, color: "text-emerald-light", sub: "Builder confidence high" },
            { label: "Job Growth",      labelTermId: "employment-growth" as string | null, value: "+2.8%", unit: " YoY", unitTermId: "yoy-appreciation" as string | null, color: "text-emerald-light", sub: "12K new jobs (12mo)" },
            { label: "Affordability",   labelTermId: null as string | null, value: "61",   unit: "/100", unitTermId: null as string | null, color: "text-amber-light",   sub: "Declining — rates headwind" },
          ].map((m) => (
            <div key={m.label} className="bg-surface-secondary rounded-xl p-3 border border-surface-border"
              aria-label={`${m.label}: ${m.value}${m.unit}. ${m.sub}`}>
              <p className="metric-label mb-1">
                {m.labelTermId ? <Term id={m.labelTermId}>{m.label}</Term> : m.label}
              </p>
              <p className={`text-xl font-bold font-mono tabular-nums ${m.color}`}>
                {m.value}
                <span className="text-[12px] text-content-tertiary">
                  {m.unitTermId ? <Term id={m.unitTermId}>{m.unit}</Term> : m.unit}
                </span>
              </p>
              <p className="text-[10px] text-content-disabled mt-1 leading-snug">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <h3 className="section-label flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            <Term id="hpi-momentum">Home Price Index</Term> — Historical &amp; Forecast
          </h3>
          <p className="text-[11px] text-content-disabled mt-0.5">5-year history + 2-year forward with 80% and 95% confidence bands</p>
        </div>
        <div className="overflow-hidden rounded-xl">
          <HPIForecastChart geoKey={stateCode} />
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <h3 className="section-label flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            Metro Comparison — Signal <Term id="convergence">Convergence</Term> Map
          </h3>
          <p className="text-[11px] text-content-disabled mt-0.5">
            X = permits growth, Y = <Term id="hpi-momentum">HPI</Term> momentum, size = job growth, color = supply tightness
          </p>
        </div>
        <div className="overflow-hidden rounded-xl">
          <BubbleChart geoKey={stateCode} />
        </div>
      </div>

      {/* 4D Explorer — slice and dice the property's market context */}
      <div className="card overflow-hidden">
        <div className="p-5 pb-2">
          <h3 className="text-sm font-semibold text-content-primary">
            Market <span className="text-gold-light">Deep Dive</span>
          </h3>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            Compare this property&apos;s market against others. Change dimensions to see different angles.
          </p>
        </div>
        <div className="overflow-hidden" style={{ height: 550 }}>
          <MultiDimensionalExplorer defaultCities={["Austin TX", "Tampa FL", "Nashville TN", "Charlotte NC", "Phoenix AZ"]} />
        </div>
      </div>

      <AiInsightStrip
        summary="3 of 5 market signals are bullish. Supply is tight, permit activity is accelerating, job growth is steady. Rate headwind actually supports rental demand — fewer buyers means more renters."
        sources={["FRED", "Census", "BLS", "Redfin"]}
        confidence="medium"
      />
    </div>
  );
}

// Financing Tab ────────────────────────────────────────────────────────────────

function FinancingTab({ result, downPct, rate }: { result: AnalysisResult; downPct: number; rate: number }) {
  const loanAmount = result.purchasePrice * (1 - downPct / 100);
  const convMonthly = result.monthlyMortgage;
  const dscrRate = rate + 0.875;
  const hmRate   = rate + 4.0;

  function calcMonthly(principal: number, annualRate: number, years: number): number {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  const dscrMonthly = calcMonthly(loanAmount, dscrRate, 30);
  const hmMonthly   = calcMonthly(loanAmount, hmRate, 1);

  const loans = [
    { type: "Conventional", rate: `${rate}%`, ltv: `${100 - downPct}%`, monthly: formatCurrency(convMonthly), cashFlow: formatCurrency(result.monthlyCashFlow), cfColor: result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light", notes: "Requires W2 income. Best rate, best cash flow.", best: result.cashOnCash >= 6 },
    { type: "DSCR Loan", rate: `${dscrRate.toFixed(3)}%`, ltv: "75-80%", monthly: formatCurrency(dscrMonthly), cashFlow: formatCurrency(result.monthlyCashFlow - (dscrMonthly - convMonthly)), cfColor: (result.monthlyCashFlow - (dscrMonthly - convMonthly)) >= 0 ? "text-emerald-light" : "text-rose-light", notes: "No income docs. Qualify on DSCR ≥ 1.20x. Good for LLCs.", best: result.dscr >= 1.25 },
    { type: "Hard Money",   rate: `${hmRate.toFixed(2)}%`, ltv: "65-70%", monthly: formatCurrency(hmMonthly), cashFlow: "N/A — bridge loan", cfColor: "text-content-tertiary", notes: "Short-term for flips or BRRRR. Refi within 12-18mo.", best: false },
  ];

  return (
    <div role="tabpanel" id="tabpanel-financing" aria-labelledby="tab-financing" className="space-y-5 animate-fade-in">
      <div className="card space-y-4">
        <h3 className="section-label flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Loan Comparison
        </h3>
        <div className="overflow-x-auto -mx-1">
          <table className="table-premium w-full min-w-[480px]" aria-label="Loan type comparison">
            <thead>
              <tr>
                <th scope="col" className="text-left">Loan Type</th>
                <th scope="col" className="text-right">Rate</th>
                <th scope="col" className="text-right">Max <Term id="ltv">LTV</Term></th>
                <th scope="col" className="text-right">Payment/mo</th>
                <th scope="col" className="text-right">Cash Flow</th>
                <th scope="col" className="text-left pl-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr
                  key={loan.type}
                  className={loan.best ? "bg-gold-muted/10" : ""}
                  aria-label={`${loan.type}: ${loan.rate} rate, ${loan.monthly}/mo, ${loan.cashFlow} cash flow`}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-content-primary font-medium">
                        {loan.type === "DSCR Loan"
                          ? <><Term id="dscr">DSCR</Term> Loan</>
                          : loan.type}
                      </span>
                      {loan.best && <span className="badge-gold text-[10px]" aria-label="Recommended">Recommended</span>}
                    </div>
                  </td>
                  <td className="text-right font-mono tabular-nums text-content-primary">{loan.rate}</td>
                  <td className="text-right font-mono tabular-nums text-content-secondary">{loan.ltv}</td>
                  <td className="text-right font-mono tabular-nums text-content-primary">{loan.monthly}</td>
                  <td className={`text-right font-mono tabular-nums font-semibold ${loan.cfColor}`}>{loan.cashFlow}</td>
                  <td className="text-[11px] text-content-disabled pl-3 max-w-[200px] leading-snug">{loan.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Loan Amount",    value: formatCurrency(Math.round(loanAmount)),                               sub: `${100 - downPct}% `, subSuffix: <Term id="ltv">LTV</Term> as ReactNode },
          { label: "Down Payment",   value: formatCurrency(Math.round(result.purchasePrice * downPct / 100)),      sub: `${downPct}% of purchase`, subSuffix: null as ReactNode },
          { label: "Debt-to-Income", value: "Est. 38%",                                                           sub: "Conventional threshold: <43%", subSuffix: null as ReactNode },
        ].map((m) => (
          <div key={m.label} className="bg-surface-secondary rounded-xl p-4 border border-surface-border"
            aria-label={`${m.label}: ${m.value}. ${m.sub}`}>
            <p className="metric-label mb-1">{m.label}</p>
            <p className="metric-value text-content-primary">{m.value}</p>
            <p className="text-[11px] text-content-disabled mt-1">{m.sub}{m.subSuffix}</p>
          </div>
        ))}
      </div>

      <AiInsightStrip
        summary={
          result.dscr >= 1.25
            ? `DSCR at ${result.dscr.toFixed(2)}x qualifies for a DSCR loan. Conventional is cheaper by ${formatCurrency(dscrMonthly - convMonthly)}/mo — but DSCR avoids income documentation.`
            : `DSCR at ${result.dscr.toFixed(2)}x is below the 1.25x minimum. Conventional financing is the primary path — income documentation required.`
        }
        sources={["FRED", "Lender Rate Survey"]}
        confidence="medium"
      />
    </div>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────────

function AnalyzePageContent() {
  const [address,   setAddress]   = useState("");
  const [price,     setPrice]     = useState("");
  const [downPct,   setDownPct]   = useState("20");
  const [rate,      setRate]      = useState("6.85");
  const [strategy,  setStrategy]  = useState<Strategy>("LTR");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<AnalysisResult | null>(null);
  const [saved,     setSaved]     = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [realDataPct, setRealDataPct] = useState(0);
  const [apiError,  setApiError]  = useState<string | null>(null);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const addDeal      = useDealPipelineStore((s) => s.addDeal);
  const loadDeal     = useSimulatorStore((s) => s.loadDeal);

  // Auto-fill from query params (Discover → Analyze)
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);
  useEffect(() => {
    const qAddress = searchParams.get("address");
    const qPrice   = searchParams.get("price");
    if (qAddress && !autoAnalyzed) {
      setAddress(qAddress);
      if (qPrice) setPrice(qPrice);
      setAutoAnalyzed(true);
    }
  }, [searchParams, autoAnalyzed]);

  const analyze = useCallback(async () => {
    if (!address.trim()) return;
    setLoading(true);
    setSaved(false);
    setResult(null);
    setApiError(null);
    setDataSources([]);
    setActiveTab("summary");

    try {
      let zipCode: string | undefined;
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const geoRes = await fetch(`/api/property/lookup?address=${encodeURIComponent(address.trim())}`);
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson.data) { zipCode = geoJson.data.zipCode; lat = geoJson.data.lat; lng = geoJson.data.lng; }
        }
      } catch { /* geocoding optional */ }

      const res = await fetch("/api/property/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          zipCode, lat, lng,
          purchasePrice: price ? parseInt(price.replace(/\D/g, ""), 10) || undefined : undefined,
          downPaymentPct: parseFloat(downPct) || 20,
          interestRate:   parseFloat(rate) || 6.85,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = json.data;

      setResult({
        address: data.address, beds: data.beds, baths: data.baths, sqft: data.sqft,
        yearBuilt: data.yearBuilt, purchasePrice: data.purchasePrice,
        estimatedValue: data.estimatedValue, monthlyRent: data.monthlyRent,
        score: data.score, verdict: data.verdict, confidence: data.confidence,
        narrative: data.narrative, nextSteps: data.nextSteps,
        capRate: data.capRate, monthlyCashFlow: data.monthlyCashFlow,
        dscr: data.dscr, cashOnCash: data.cashOnCash,
        monthlyMortgage: data.monthlyMortgage, monthlyExpenses: data.monthlyExpenses,
        institutional: data.institutional, stress: data.stress,
      });
      setDataSources(data.dataSources ?? []);
      setRealDataPct(data.realDataPct ?? 0);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [address, price, downPct, rate]);

  const saveToPipeline = useCallback(() => {
    if (!result) return;
    addDeal({
      status: "analyzing",
      address: result.address,
      market:  result.address.split(",").pop()?.trim() || "Unknown",
      state:   result.address.split(",").pop()?.trim().split(" ")[0] || "",
      zip:     String(hashCode(result.address) % 90000 + 10000),
      price:   result.purchasePrice,
      propertyType: "Single Family",
      analysis: {
        apexScore:       result.score,
        convictionScore: result.confidence,
        prismVerdict:    result.verdict,
        capRate:         result.capRate,
        monthlyCashFlow: result.monthlyCashFlow,
        cashOnCash:      result.cashOnCash,
      },
    });
    setSaved(true);
  }, [result, addDeal]);

  const handleSimulate = useCallback(() => {
    if (!result) return;
    loadDeal({
      purchasePrice:  result.purchasePrice,
      monthlyRent:    result.monthlyRent,
      downPaymentPct: parseFloat(downPct) || 20,
      interestRate:   parseFloat(rate) || 6.85,
    });
    router.push("/dashboard/simulator");
  }, [result, downPct, rate, loadDeal, router]);

  const handleCompare = useCallback(() => {
    setResult(null);
    setAddress("");
    setSaved(false);
    setDataSources([]);
  }, []);

  const downPctNum = parseFloat(downPct) || 20;
  const rateNum    = parseFloat(rate) || 6.85;
  const liveCount  = dataSources.filter((s) => s.status === "live").length;

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Coach Greeting ─────────────────────────────────────────────── */}
      {!result && !loading && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div>
            <h1 className="page-title">What are you looking to invest in?</h1>
            <p className="page-subtitle">
              Pick a strategy. Paste an address. Get an institutional-grade verdict in 10 seconds.
            </p>
          </div>

          {/* Strategy Cards */}
          <StrategyCards value={strategy} onChange={setStrategy} />

          {/* Search Bar */}
          <SearchBar
            address={address}
            price={price}
            downPct={downPct}
            rate={rate}
            loading={loading}
            onAddressChange={setAddress}
            onPriceChange={setPrice}
            onDownPctChange={setDownPct}
            onRateChange={setRate}
            onAnalyze={analyze}
          />

          {/* Trending Deals */}
          <TrendingDeals
            onSelect={(addr) => {
              setAddress(addr);
            }}
          />

          {/* Strategy Preview — show playbook with sample data for selected strategy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="section-label text-content-tertiary">
                {STRATEGY_CONFIG[strategy].label} — Sample Analysis
              </span>
              <span className="badge-gold text-[10px]">Demo Data</span>
            </div>
            {strategy === "LTR"   && <LTRPlaybook address={address || undefined} />}
            {strategy === "STR"   && <STRPlaybook address={address || undefined} />}
            {strategy === "Flip"  && <FlipPlaybook address={address || undefined} />}
            {strategy === "BRRRR" && <BRRRRPlaybook address={address || undefined} />}
          </div>
        </motion.div>
      )}

      {/* ── Compact header when result exists ─────────────────────────── */}
      {(result || loading) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Deal Analyzer</h1>
            {result && (
              <p className="text-[12px] text-content-tertiary mt-0.5 font-mono">{result.address}</p>
            )}
          </div>
          <button
            onClick={handleCompare}
            className="btn-ghost btn-sm shrink-0"
            aria-label="Analyze a different property"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            New Analysis
          </button>
        </div>
      )}

      {/* ── Strategy selector when result exists ───────────────────────── */}
      {(result || loading) && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Investment strategy">
          {(["LTR", "STR", "Flip", "BRRRR"] as Strategy[]).map((s) => {
            const cfg = STRATEGY_CONFIG[s];
            const active = strategy === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStrategy(s)}
                aria-pressed={active}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 border",
                  active
                    ? "bg-gold-muted border-gold/40 text-gold-light"
                    : "bg-surface-secondary border-surface-border text-content-tertiary hover:border-gold/20 hover:text-content-secondary",
                ].join(" ")}
              >
                {cfg.icon}
                <span className="hidden sm:inline">{cfg.label}</span>
                <span className="sm:hidden">{s}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────────────── */}
      {apiError && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-muted/40 border border-rose/10">
          <AlertTriangle className="w-4 h-4 text-rose-light mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[13px] text-rose-light font-medium">Analysis failed</p>
            <p className="text-[11px] text-rose-light/70 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ───────────────────────────────────────────── */}
      {loading && <AnalysisSkeleton />}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-5 animate-fade-in">

          {/* Verdict */}
          <VerdictHero
            result={result}
            downPct={downPctNum}
            onSave={saveToPipeline}
            saved={saved}
            onSimulate={handleSimulate}
            onCompare={handleCompare}
          />

          {/* Data source badges */}
          {dataSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-1" aria-label="Data sources">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider font-medium flex items-center gap-1">
                <Database className="w-3 h-3" aria-hidden="true" />
                Sources
              </span>
              {dataSources.map((ds) => (
                <span
                  key={ds.name}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    ds.status === "live"
                      ? "bg-emerald-muted text-emerald-light border border-emerald/20"
                      : ds.status === "fallback"
                      ? "bg-amber-muted text-amber-light border border-amber/20"
                      : "bg-surface-elevated text-content-disabled border border-surface-border"
                  }`}
                  title={ds.source ?? ds.name}
                  aria-label={`${ds.name}: ${ds.status}`}
                >
                  {ds.status === "live" && <Wifi className="w-2.5 h-2.5 inline mr-1" aria-hidden="true" />}
                  {ds.name}
                </span>
              ))}
              {realDataPct > 0 && (
                <span className="text-[10px] text-content-disabled ml-1">
                  {realDataPct}% real data / {100 - realDataPct}% estimated
                </span>
              )}
            </div>
          )}

          {/* Tabs / Playbooks */}
          {strategy === "LTR" ? (
            <div className="space-y-4">
              <TabNav activeTab={activeTab} onChange={setActiveTab} />
              {activeTab === "summary"      && <SummaryTab      result={result} downPct={downPctNum} rate={rateNum} />}
              {activeTab === "financials"   && <FinancialsTab   result={result} downPct={downPctNum} rate={rateNum} />}
              {activeTab === "risk"         && <RiskTab         result={result} />}
              {activeTab === "market"       && <MarketTab       result={result} />}
              {activeTab === "financing"    && <FinancingTab    result={result} downPct={downPctNum} rate={rateNum} />}
              {activeTab === "neighborhood" && <NeighborhoodTab result={result} />}
              {activeTab === "comps"        && <CompsTab        result={result} />}
              {activeTab === "tax"          && <TaxTab          result={result} downPct={downPctNum} rate={rateNum} />}
              {activeTab === "whatif"       && <WhatIfTab       result={result} onRecalculate={(_overrides) => { /* future: recalc */ }} />}
              {activeTab === "exit"         && <ExitTab         result={result} downPct={downPctNum} rate={rateNum} />}
            </div>
          ) : strategy === "STR" ? (
            <STRPlaybook address={result.address} result={result} />
          ) : strategy === "Flip" ? (
            <FlipPlaybook address={result.address} result={result} />
          ) : (
            <BRRRRPlaybook address={result.address} result={result} />
          )}

          {/* Investment Memo */}
          {strategy === "LTR" && (
            <InvestmentMemoCard result={result} rate={rateNum} downPct={downPctNum} />
          )}
        </div>
      )}

      {/* ── Search bar shown below trending deals (second entry point) ── */}
      {!result && !loading && (
        <div className="pt-2 border-t border-surface-border">
          <p className="text-[11px] text-content-disabled mb-3 uppercase tracking-wider">
            Or paste any address directly
          </p>
          <SearchBar
            address={address}
            price={price}
            downPct={downPct}
            rate={rate}
            loading={loading}
            onAddressChange={setAddress}
            onPriceChange={setPrice}
            onDownPctChange={setDownPct}
            onRateChange={setRate}
            onAnalyze={analyze}
          />
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="animate-fade-in space-y-6"><div className="skeleton h-10 rounded-xl w-1/3" /><div className="skeleton h-40 rounded-xl" /></div>}>
      <AnalyzePageContent />
    </Suspense>
  );
}
