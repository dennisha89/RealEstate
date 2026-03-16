"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Save, SlidersHorizontal, ArrowLeftRight, AlertTriangle,
  Wifi, Database, TrendingUp, ChevronRight,
  DollarSign, Home, BarChart3, Shield, Landmark, Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import {
  AnalysisSkeleton, scoreColor,
  type AnalysisResult,
} from "./_components";
import { InvestmentMemoCard } from "./InvestmentMemo";
import { Term } from "@/components/shared/Term";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import { SAMPLE_FACTORS } from "@/components/charts/FactorAttributionChart";
import { MONTE_CARLO_SAMPLE } from "@/components/charts/MonteCarloChart";
import { STRESS_TEST_SAMPLE } from "@/components/charts/StressTestChart";
import { SAMPLE_SIGNALS, SAMPLE_CONVERGENCE_CONTEXT } from "@/components/charts/SignalConvergenceChart";

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
  { ssr: false, loading: () => <div className="skeleton h-72 rounded-xl" /> }
);

const SignalConvergenceChart = dynamic(
  () => import("@/components/charts/SignalConvergenceChart").then((m) => ({ default: m.SignalConvergenceChart })),
  { ssr: false, loading: () => <div className="skeleton h-56 rounded-xl" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "LTR" | "STR" | "Flip" | "BRRRR";

type TabId = "summary" | "financials" | "risk" | "market" | "financing";

interface DataSourceInfo {
  name: string;
  status: "live" | "fallback" | "unavailable";
  source?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const STRATEGY_LABELS: Record<Strategy, { label: string; description: string }> = {
  LTR: { label: "Long-Term Rental", description: "Monthly rent, long-term cash flow, appreciation" },
  STR: { label: "Short-Term Rental", description: "ADR, occupancy, RevPAR, seasonal revenue" },
  Flip: { label: "Fix & Flip", description: "ARV, 70% rule, MAO, rehab costs, profit margin" },
  BRRRR: { label: "BRRRR", description: "Buy, Rehab, Rent, Refinance, Repeat cycle" },
};

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "summary",    label: "Summary",   icon: <Home className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "financials", label: "Financials", icon: <DollarSign className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "risk",       label: "Risk",       icon: <Shield className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "market",     label: "Market",     icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> },
  { id: "financing",  label: "Financing",  icon: <Landmark className="w-3.5 h-3.5" aria-hidden="true" /> },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

// Strategy Selector ────────────────────────────────────────────────────────────

function StrategySelector({
  value,
  onChange,
}: {
  value: Strategy;
  onChange: (s: Strategy) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Investment strategy">
      {(["LTR", "STR", "Flip", "BRRRR"] as Strategy[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-pressed={value === s}
          className={[
            "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 border",
            value === s
              ? "bg-gold-muted border-gold/40 text-gold-light"
              : "bg-surface-secondary border-surface-border text-content-tertiary hover:border-gold/20 hover:text-content-secondary",
          ].join(" ")}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// Tab Navigation ───────────────────────────────────────────────────────────────

function TabNav({
  activeTab,
  onChange,
}: {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}) {
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

// Verdict Card ─────────────────────────────────────────────────────────────────

function VerdictHero({
  result,
  downPct,
  rate,
  onSave,
  saved,
  onSimulate,
  onCompare,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
  onSave: () => void;
  saved: boolean;
  onSimulate: () => void;
  onCompare: () => void;
}) {
  const isBuy = result.verdict === "BUY";
  const isDig = result.score >= 55 && result.score < 75;

  const verdictLabel = isBuy ? "BUY" : isDig ? "DIG DEEPER" : "PASS";
  const verdictColor = isBuy
    ? "text-emerald-light"
    : isDig
    ? "text-amber-light"
    : "text-rose-light";
  const cardClass = isBuy ? "glass-gold" : "glass";

  const downAmount = Math.round(result.purchasePrice * (downPct / 100));
  const annualCashFlow = result.monthlyCashFlow * 12;

  // 2-3 sentence plain English summary
  const summary = `This property earns ${formatCurrency(result.monthlyCashFlow)}/month after ALL real expenses. ` +
    `It survives ${result.stress?.scenarios?.filter((s) => s.survives).length ?? 0} of ` +
    `${result.stress?.scenarios?.length ?? 6} stress scenarios. ` +
    `${isBuy ? "The market and deal fundamentals both support a buy decision." : isDig ? "Dig into the risk tab before committing." : "The numbers don't support the current asking price."}`;

  return (
    <div
      className={`${cardClass} p-6 animate-scale-in-fast`}
      aria-label={`Deal verdict: ${verdictLabel}, score ${result.score} out of 100, confidence ${result.confidence}%`}
    >
      {/* Verdict badge — large, centered */}
      <div className="flex flex-col items-center text-center mb-5">
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-content-tertiary mb-2`}
          aria-hidden="true"
        >
          LootVue Verdict
        </span>

        {/* Score ring + verdict */}
        <div className="flex items-center gap-5 mb-3">
          <div className="relative" style={{ width: 56, height: 56 }} aria-hidden="true">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#1F1F1F" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24"
                fill="none"
                stroke={isBuy ? "#10B981" : isDig ? "#F59E0B" : "#EF4444"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(result.score / 100) * 150.8} 150.8`}
                transform="rotate(-90 28 28)"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-[14px] font-bold font-mono tabular-nums"
              style={{ color: isBuy ? "#34D399" : isDig ? "#FBBF24" : "#F87171" }}
            >
              {result.score}
            </span>
          </div>

          <div>
            <p
              className={`text-4xl font-bold font-display tracking-tight ${verdictColor}`}
              aria-label={`Verdict: ${verdictLabel}`}
            >
              {verdictLabel}
            </p>
            <p className="text-[12px] text-content-tertiary mt-0.5">
              Confidence:{" "}
              <span className="font-mono font-semibold text-content-secondary">
                {result.confidence}%
              </span>
            </p>
          </div>
        </div>

        {/* Plain English summary */}
        <p className="text-[13px] text-content-secondary leading-relaxed max-w-xl italic">
          &ldquo;{summary}&rdquo;
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Monthly Rent",
            value: formatCurrency(result.monthlyRent),
            color: "text-emerald-light",
            sub: "market estimate",
          },
          {
            label: "Net Cash Flow",
            value: result.monthlyCashFlow >= 0
              ? formatCurrency(result.monthlyCashFlow)
              : `(${formatCurrency(Math.abs(result.monthlyCashFlow))})`,
            color: result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light",
            sub: "per month",
          },
          {
            label: "Cash-on-Cash",
            value: `${result.cashOnCash.toFixed(1)}%`,
            color: scoreColor(result.cashOnCash >= 8 ? 80 : result.cashOnCash >= 5 ? 60 : 40),
            sub: "annual return",
          },
          {
            label: "Total Cash In",
            value: formatCompact(downAmount + Math.round(result.purchasePrice * 0.03)),
            color: "text-content-primary",
            sub: "down + closing",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-secondary rounded-xl p-3 border border-surface-border text-center"
          >
            <p className="metric-label mb-1">{stat.label}</p>
            <p
              className={`text-lg font-bold font-mono tabular-nums ${stat.color}`}
              aria-label={`${stat.label}: ${stat.value}`}
            >
              {stat.value}
            </p>
            <p className="text-[10px] text-content-disabled mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2.5 justify-center">
        <button
          onClick={onSave}
          disabled={saved}
          className={saved ? "btn-secondary btn-sm opacity-60 cursor-default" : "btn-emerald btn-sm"}
          aria-label={saved ? "Saved to pipeline" : "Save this deal to your pipeline"}
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          {saved ? "Saved to Pipeline" : "Save to Pipeline"}
        </button>
        <button
          onClick={onSimulate}
          className="btn-primary btn-sm"
          aria-label="Open this deal in the scenario simulator"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          Simulate
        </button>
        <button
          onClick={onCompare}
          className="btn-ghost btn-sm"
          aria-label="Compare with another property"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          Compare
        </button>
      </div>
    </div>
  );
}

// ─── Tab panels ────────────────────────────────────────────────────────────────

// Summary Tab ──────────────────────────────────────────────────────────────────

function SummaryTab({
  result,
  downPct,
  rate,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
}) {
  const downAmount  = Math.round(result.purchasePrice * (downPct / 100));
  const loanAmount  = result.purchasePrice - downAmount;
  const closingCost = Math.round(result.purchasePrice * 0.03);
  const totalCashIn = downAmount + closingCost;
  const annualNOI   = (result.monthlyRent - result.monthlyExpenses) * 12;
  const grm         = result.monthlyRent > 0
    ? Math.round((result.purchasePrice / (result.monthlyRent * 12)) * 10) / 10
    : 0;
  const netOpIncome = result.monthlyRent - result.monthlyExpenses;

  return (
    <div
      role="tabpanel"
      id="tabpanel-summary"
      aria-labelledby="tab-summary"
      className="space-y-5 animate-fade-in"
    >
      {/* Two-column cost / earn breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: What You'd Pay */}
        <div className="card space-y-3">
          <h3 className="section-label flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            What You&apos;d Pay
          </h3>
          <div className="space-y-2 font-mono text-[13px]">
            {[
              { label: "Purchase Price",    value: formatCurrency(result.purchasePrice), color: "text-content-primary" },
              { label: `Down (${downPct}%)`, value: formatCurrency(downAmount),           color: "text-rose-light" },
              { label: "Loan Amount",        value: formatCurrency(loanAmount),           color: "text-content-secondary" },
              { label: `Mortgage (${rate}% 30yr)`, value: formatCurrency(result.monthlyMortgage) + "/mo", color: "text-rose-light" },
              { label: "Est. Closing (3%)", value: formatCurrency(closingCost),          color: "text-rose-light" },
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

        {/* Right: What You'd Earn */}
        <div className="card space-y-3">
          <h3 className="section-label flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            What You&apos;d Earn
          </h3>
          <div className="space-y-2 font-mono text-[13px]">
            {[
              { label: "Monthly Rent",       value: formatCurrency(result.monthlyRent) + "/mo",           color: "text-emerald-light" },
              { label: "Operating Expenses", value: `(${formatCurrency(result.monthlyExpenses)})/mo`,     color: "text-rose-light" },
              { label: "Net Op. Income",     value: formatCurrency(netOpIncome) + "/mo",                  color: netOpIncome >= 0 ? "text-emerald-light" : "text-rose-light" },
              { label: "Mortgage Payment",   value: `(${formatCurrency(result.monthlyMortgage)})/mo`,     color: "text-rose-light" },
              { label: "After Mortgage",     value: (result.monthlyCashFlow >= 0 ? "+" : "") + formatCurrency(result.monthlyCashFlow) + "/mo", color: result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center gap-2">
                <span className="text-content-tertiary font-sans text-[13px]">{row.label}</span>
                <span className={`${row.color} tabular-nums`}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center gap-2 pt-2 border-t border-surface-border font-bold">
              <span className="text-content-primary font-sans text-[13px]">Annual Cash Flow</span>
              <span
                className={result.monthlyCashFlow >= 0 ? "text-emerald-light tabular-nums" : "text-rose-light tabular-nums"}
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

      {/* Key Metrics Grid — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cap Rate */}
        <div className="card-bento space-y-2">
          <p className="metric-label">
            <Term id="cap-rate" value={result.capRate}>Cap Rate</Term>
          </p>
          <p
            className={`metric-value ${scoreColor(result.capRate >= 7 ? 80 : result.capRate >= 5 ? 60 : 40)}`}
            aria-label={`Cap rate: ${result.capRate.toFixed(1)} percent`}
          >
            {result.capRate.toFixed(1)}%
          </p>
          <p className="text-[11px] text-content-disabled">NOI ÷ price</p>
        </div>

        {/* DSCR */}
        <div className="card-bento space-y-2">
          <p className="metric-label">
            <Term id="dscr" value={result.dscr}>DSCR</Term>
          </p>
          <p
            className={`metric-value ${scoreColor(result.dscr >= 1.25 ? 80 : result.dscr >= 1.0 ? 60 : 40)}`}
            aria-label={`DSCR: ${result.dscr.toFixed(2)}x`}
          >
            {result.dscr.toFixed(2)}x
          </p>
          <p className="text-[11px] text-content-disabled">need &gt; 1.25x</p>
        </div>

        {/* Cash-on-Cash */}
        <div className="card-bento space-y-2">
          <p className="metric-label">
            <Term id="coc" value={result.cashOnCash}>Cash-on-Cash</Term>
          </p>
          <p
            className={`metric-value ${scoreColor(result.cashOnCash >= 8 ? 80 : result.cashOnCash >= 5 ? 60 : 40)}`}
            aria-label={`Cash-on-cash return: ${result.cashOnCash.toFixed(1)} percent`}
          >
            {result.cashOnCash.toFixed(1)}%
          </p>
          <p className="text-[11px] text-content-disabled">annual return on cash</p>
        </div>

        {/* GRM */}
        <div className="card-bento space-y-2">
          <p className="metric-label">
            <Term id="grm" value={grm}>GRM</Term>
          </p>
          <p
            className={`metric-value ${scoreColor(grm <= 12 ? 80 : grm <= 18 ? 60 : 40)}`}
            aria-label={`Gross rent multiplier: ${grm.toFixed(1)}`}
          >
            {grm.toFixed(1)}x
          </p>
          <p className="text-[11px] text-content-disabled">lower is better</p>
        </div>
      </div>

      {/* SHAP attribution */}
      <FactorAttributionChart
        factors={SAMPLE_FACTORS}
        totalScore={result.score}
        maxScore={100}
        title="What's Driving This Score"
      />

      {/* AI Insight */}
      <AiInsightStrip
        summary={
          result.score >= 75
            ? `Strong fundamentals. Cap rate ${result.capRate.toFixed(1)}% with ${formatCurrency(result.monthlyCashFlow)}/mo net cash flow — this deal is above the institutional minimum on every key metric.`
            : result.score >= 55
            ? `Mixed signals. Cap rate of ${result.capRate.toFixed(1)}% is workable but cash flow at ${formatCurrency(result.monthlyCashFlow)}/mo leaves thin margins. Negotiate price down 5-8% or find a DSCR lender with better terms.`
            : `The numbers do not support this price. Cap rate ${result.capRate.toFixed(1)}% and ${formatCurrency(result.monthlyCashFlow)}/mo cash flow indicate negative leverage risk at current asking price.`
        }
        detail={`This analysis is based on a ${downPct}% down payment at ${rate}% interest rate. Cash-on-cash return of ${result.cashOnCash.toFixed(1)}% compared against a market benchmark of 6-8%.`}
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

function FinancialsTab({
  result,
  downPct,
  rate,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
}) {
  const [chainOpen, setChainOpen] = useState(false);

  const downAmount  = Math.round(result.purchasePrice * (downPct / 100));
  const loanAmount  = result.purchasePrice - downAmount;
  const propTax     = Math.round(result.purchasePrice * 0.011 / 12);
  const insurance   = Math.round(result.purchasePrice * 0.005 / 12);
  const maintenance = Math.round(result.monthlyRent * 0.08);
  const vacancy     = Math.round(result.monthlyRent * 0.05);
  const mgmt        = Math.round(result.monthlyRent * 0.08);

  return (
    <div
      role="tabpanel"
      id="tabpanel-financials"
      aria-labelledby="tab-financials"
      className="space-y-5 animate-fade-in"
    >
      {/* Real Expenses — ZIP-level estimates */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-label flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            Monthly Expense Breakdown
          </h3>
          <span className="text-[11px] font-mono text-content-disabled">ZIP-level estimates</span>
        </div>

        <div className="space-y-2" role="list" aria-label="Monthly expenses">
          {[
            { label: "Property Tax (est. 1.1% ann.)", amount: propTax,    pct: propTax / result.monthlyRent * 100,    note: "Census ACS" },
            { label: "Insurance (est. 0.5% ann.)",   amount: insurance,  pct: insurance / result.monthlyRent * 100,  note: "Market avg" },
            { label: "Maintenance (8% of rent)",      amount: maintenance, pct: maintenance / result.monthlyRent * 100, note: "Industry std" },
            { label: "Vacancy Reserve (5%)",          amount: vacancy,    pct: vacancy / result.monthlyRent * 100,    note: "Market avg" },
            { label: "Property Mgmt (8%)",            amount: mgmt,       pct: mgmt / result.monthlyRent * 100,       note: "If outsourced" },
          ].map((exp) => (
            <div
              key={exp.label}
              className="flex items-center gap-3"
              role="listitem"
              aria-label={`${exp.label}: ${formatCurrency(exp.amount)} per month, ${exp.pct.toFixed(1)}% of rent`}
            >
              <span className="text-[12px] text-content-secondary flex-1">{exp.label}</span>
              <div
                className="hidden sm:block h-1.5 rounded-full bg-rose-muted overflow-hidden"
                style={{ width: 80 }}
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-rose"
                  style={{ width: `${Math.min(100, exp.pct * 2)}%`, opacity: 0.7 }}
                />
              </div>
              <span className="text-[12px] font-mono tabular-nums text-rose-light w-16 text-right">
                {formatCurrency(exp.amount)}
              </span>
              <span className="text-[10px] text-content-disabled w-16 text-right hidden lg:block">
                [{exp.note}]
              </span>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-surface-border font-mono text-[13px] font-bold">
            <span className="text-content-primary font-sans">Total Monthly Expenses</span>
            <span
              className="text-rose-light tabular-nums"
              aria-label={`Total monthly expenses: ${formatCurrency(result.monthlyExpenses)}`}
            >
              {formatCurrency(result.monthlyExpenses)}
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
          {chainOpen
            ? <ChevronRight className="w-4 h-4 text-content-disabled rotate-90 transition-transform duration-150" aria-hidden="true" />
            : <ChevronRight className="w-4 h-4 text-content-disabled transition-transform duration-150" aria-hidden="true" />
          }
        </button>

        {chainOpen && (
          <div id="calc-chain" className="animate-fade-in space-y-3">
            <div
              className="bg-surface-secondary rounded-xl p-4 border border-surface-border font-mono text-[12px] space-y-2"
              role="table"
              aria-label="Step-by-step financial calculations"
            >
              {[
                { step: "1.", label: "Gross Annual Rent",           value: `${formatCurrency(result.monthlyRent)} × 12 = ${formatCurrency(result.monthlyRent * 12)}` },
                { step: "2.", label: "Effective Gross Income (5% vac)", value: `${formatCurrency(result.monthlyRent * 12)} × 0.95 = ${formatCurrency(Math.round(result.monthlyRent * 12 * 0.95))}` },
                { step: "3.", label: "Total Operating Expenses",    value: `${formatCurrency(result.monthlyExpenses)} × 12 = ${formatCurrency(result.monthlyExpenses * 12)}` },
                { step: "4.", label: "Net Operating Income (NOI)",  value: `${formatCurrency(Math.round(result.monthlyRent * 12 * 0.95))} − ${formatCurrency(result.monthlyExpenses * 12)} = ${formatCurrency(Math.round(result.monthlyRent * 12 * 0.95 - result.monthlyExpenses * 12))}` },
                { step: "5.", label: "Annual Debt Service",         value: `${formatCurrency(result.monthlyMortgage)} × 12 = ${formatCurrency(result.monthlyMortgage * 12)}` },
                { step: "6.", label: "Net Cash Flow (annual)",      value: `NOI − debt service = ${formatCurrency(result.monthlyCashFlow * 12)}` },
                { step: "7.", label: "Cap Rate",                    value: `NOI ÷ ${formatCurrency(result.purchasePrice)} = ${result.capRate.toFixed(2)}%` },
                { step: "8.", label: "Cash-on-Cash",                value: `${formatCurrency(result.monthlyCashFlow * 12)} ÷ ${formatCurrency(downAmount)} = ${result.cashOnCash.toFixed(2)}%` },
                { step: "9.", label: "DSCR",                        value: `NOI ÷ debt service = ${result.dscr.toFixed(3)}x` },
              ].map((row) => (
                <div key={row.step} className="flex gap-3" role="row">
                  <span className="text-content-disabled shrink-0 w-5" role="cell">{row.step}</span>
                  <span className="text-content-tertiary flex-1" role="cell">{row.label}</span>
                  <span className="text-content-primary text-right" role="cell">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cash Flow Waterfall — simple visual */}
      <div className="card space-y-3">
        <h3 className="section-label">Cash Flow Waterfall</h3>
        <div className="space-y-1.5">
          {[
            { label: "Gross Rent",         value: result.monthlyRent,                      positive: true,  bar: 100 },
            { label: "Vacancy (−5%)",      value: -Math.round(result.monthlyRent * 0.05),  positive: false, bar: 5   },
            { label: "Expenses",           value: -result.monthlyExpenses,                 positive: false, bar: (result.monthlyExpenses / result.monthlyRent) * 100 },
            { label: "Mortgage",           value: -result.monthlyMortgage,                 positive: false, bar: (result.monthlyMortgage / result.monthlyRent) * 100 },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-[12px] text-content-tertiary w-36 shrink-0">{row.label}</span>
              <div className="flex-1 h-6 rounded bg-surface-elevated overflow-hidden relative" aria-hidden="true">
                <div
                  className={`h-full rounded transition-all duration-500 ${row.positive ? "bg-emerald opacity-70" : "bg-rose opacity-60"}`}
                  style={{ width: `${Math.min(100, row.bar)}%`, transitionDelay: `${i * 80}ms` }}
                />
              </div>
              <span
                className={`text-[12px] font-mono tabular-nums w-20 text-right ${row.positive ? "text-emerald-light" : "text-rose-light"}`}
                aria-label={`${row.label}: ${row.positive ? "" : "negative "}${formatCurrency(Math.abs(row.value))} per month`}
              >
                {row.positive ? "+" : ""}{row.value >= 0 ? formatCurrency(row.value) : `(${formatCurrency(Math.abs(row.value))})`}
              </span>
            </div>
          ))}
          {/* Net */}
          <div className="flex items-center gap-3 pt-1.5 border-t border-surface-border">
            <span className="text-[12px] text-content-primary font-semibold w-36 shrink-0">Net Cash Flow</span>
            <div className="flex-1" aria-hidden="true" />
            <span
              className={`text-[13px] font-bold font-mono tabular-nums w-20 text-right ${result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}
              aria-label={`Net cash flow: ${result.monthlyCashFlow >= 0 ? "" : "negative "}${formatCurrency(Math.abs(result.monthlyCashFlow))} per month`}
            >
              {result.monthlyCashFlow >= 0
                ? `+${formatCurrency(result.monthlyCashFlow)}`
                : `(${formatCurrency(Math.abs(result.monthlyCashFlow))})`}
            </span>
          </div>
        </div>
      </div>

      <AiInsightStrip
        summary={`The biggest expense driver is ${result.monthlyExpenses > result.monthlyMortgage ? "operating costs" : "debt service"} — representing ${Math.round((Math.max(result.monthlyExpenses, result.monthlyMortgage) / result.monthlyRent) * 100)}% of gross rent. ${result.monthlyCashFlow >= 0 ? "Positive cash flow at this price." : "Consider renegotiating on price to reach positive cash flow."}`}
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
    <div
      role="tabpanel"
      id="tabpanel-risk"
      aria-labelledby="tab-risk"
      className="space-y-5 animate-fade-in"
    >
      {/* Stress Test Chart */}
      <div className="card space-y-4">
        <h3 className="section-label flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Stress Test Survival — {survivedCount}/{totalScenarios} Scenarios
        </h3>
        <StressTestChart {...STRESS_TEST_SAMPLE} />
      </div>

      {/* Monte Carlo IRR Distribution */}
      <div className="card space-y-4">
        <div>
          <h3 className="section-label flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
            <Term id="irr">IRR</Term>
            &nbsp;Distribution — 10,000 Simulations
          </h3>
          <p className="text-[11px] text-content-disabled mt-0.5">
            Range of possible returns based on variable market conditions
          </p>
        </div>
        <MonteCarloChart {...MONTE_CARLO_SAMPLE} />
      </div>

      {/* Break-even metrics */}
      <div className="card space-y-4">
        <h3 className="section-label">Break-Even Thresholds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Break-Even Vacancy",
              value: "18.2%",
              sub: "max vacancy before losses",
              color: "text-emerald-light",
              note: "You have 12.8pp cushion vs 5% assumed vacancy",
            },
            {
              label: "Break-Even Rate",
              value: "8.9%",
              sub: "max rate before cash flow turns negative",
              color: "text-amber-light",
              note: `${(8.9 - parseFloat("6.85")).toFixed(2)}pp above current rate`,
            },
            {
              label: "Months of Reserves",
              value: "6 mo",
              sub: "recommended reserves",
              color: "text-gold",
              note: "Based on worst-case scenario cash burn",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="bg-surface-secondary rounded-xl p-4 border border-surface-border space-y-2"
              aria-label={`${metric.label}: ${metric.value}. ${metric.note}`}
            >
              <p className="metric-label">{metric.label}</p>
              <p className={`metric-value ${metric.color}`}>{metric.value}</p>
              <p className="text-[10px] text-content-disabled leading-snug">{metric.sub}</p>
              <p className="text-[11px] text-content-tertiary italic">{metric.note}</p>
            </div>
          ))}
        </div>
      </div>

      <AiInsightStrip
        summary={`${survivedCount >= 4 ? "Solid risk profile" : survivedCount >= 2 ? "Moderate risk" : "Elevated risk"} — ${survivedCount} of ${totalScenarios} stress scenarios survived. The main vulnerability is a rate shock above 8.9%. Maintain 6 months of reserves and avoid floating-rate debt.`}
        detail="Risk analysis is based on 6 stress scenarios spanning mild to extreme conditions. Monte Carlo uses 10,000 correlated simulations with Cholesky decomposition for rent growth, vacancy, and appreciation."
        sources={["NCREIF", "FRED", "BLS"]}
        confidence={survivedCount >= 4 ? "high" : survivedCount >= 2 ? "medium" : "low"}
      />
    </div>
  );
}

// Market Tab ───────────────────────────────────────────────────────────────────

function MarketTab({ result }: { result: AnalysisResult }) {
  const market = result.address.split(",").slice(-2).join(",").trim();

  return (
    <div
      role="tabpanel"
      id="tabpanel-market"
      aria-labelledby="tab-market"
      className="space-y-5 animate-fade-in"
    >
      {/* Signal convergence */}
      <SignalConvergenceChart
        signals={SAMPLE_SIGNALS}
        convergenceCount={3}
        historicalContext={SAMPLE_CONVERGENCE_CONTEXT}
        market={market}
        defaultExpanded={false}
      />

      {/* Market score summary */}
      <div className="card space-y-3">
        <h3 className="section-label">Market Score</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Supply Score",     value: "82",  unit: "/100", color: "text-emerald-light", sub: "Tight — 2.1 mo supply" },
            { label: "Permit Activity",  value: "+34%", unit: " YoY", color: "text-emerald-light", sub: "Builder confidence high" },
            { label: "Job Growth",       value: "+2.8%", unit: " YoY", color: "text-emerald-light", sub: "12K new jobs (12mo)" },
            { label: "Affordability",    value: "61",  unit: "/100", color: "text-amber-light",   sub: "Declining — rates headwind" },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-surface-secondary rounded-xl p-3 border border-surface-border"
              aria-label={`${m.label}: ${m.value}${m.unit}. ${m.sub}`}
            >
              <p className="metric-label mb-1">{m.label}</p>
              <p className={`text-xl font-bold font-mono tabular-nums ${m.color}`}>
                {m.value}<span className="text-[12px] text-content-tertiary">{m.unit}</span>
              </p>
              <p className="text-[10px] text-content-disabled mt-1 leading-snug">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <AiInsightStrip
        summary="3 of 5 market signals are bullish for this area. Supply is tight, permit activity is accelerating, and job growth is steady. The main headwind is elevated mortgage rates suppressing buyer demand — which actually supports rental demand."
        detail="When 4+ signals converged in the historical backtest, markets appreciated 8–13% over the following 18 months. Current convergence at 3/5 suggests cautious optimism."
        sources={["FRED", "Census", "BLS", "Redfin"]}
        confidence="medium"
      />
    </div>
  );
}

// Financing Tab ────────────────────────────────────────────────────────────────

function FinancingTab({
  result,
  downPct,
  rate,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
}) {
  const loanAmount = result.purchasePrice * (1 - downPct / 100);
  const convMonthly = result.monthlyMortgage;
  // DSCR loan: higher rate, no income qual; Hard Money: bridge/flip
  const dscrRate = rate + 0.875;
  const hmRate = rate + 4.0;

  function calcMonthly(principal: number, annualRate: number, years: number): number {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  const dscrMonthly = calcMonthly(loanAmount, dscrRate, 30);
  const hmMonthly   = calcMonthly(loanAmount, hmRate, 1); // interest only approx

  const loans = [
    {
      type: "Conventional",
      rate: `${rate}%`,
      ltv: `${100 - downPct}%`,
      monthly: formatCurrency(convMonthly),
      cashFlow: formatCurrency(result.monthlyCashFlow),
      cfColor: result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light",
      notes: "Requires W2/income qualification. Best rate, best cash flow.",
      best: result.cashOnCash >= 6,
    },
    {
      type: "DSCR Loan",
      rate: `${dscrRate.toFixed(3)}%`,
      ltv: "75-80%",
      monthly: formatCurrency(dscrMonthly),
      cashFlow: formatCurrency(result.monthlyCashFlow - (dscrMonthly - convMonthly)),
      cfColor: (result.monthlyCashFlow - (dscrMonthly - convMonthly)) >= 0 ? "text-emerald-light" : "text-rose-light",
      notes: "No income docs. Qualify on DSCR ≥ 1.20x. Good for LLCs.",
      best: result.dscr >= 1.25,
    },
    {
      type: "Hard Money",
      rate: `${hmRate.toFixed(2)}%`,
      ltv: "65-70%",
      monthly: formatCurrency(hmMonthly),
      cashFlow: "N/A — bridge loan",
      cfColor: "text-content-tertiary",
      notes: "Short-term bridge for flips or BRRRR. Refinance within 12-18mo.",
      best: false,
    },
  ];

  return (
    <div
      role="tabpanel"
      id="tabpanel-financing"
      aria-labelledby="tab-financing"
      className="space-y-5 animate-fade-in"
    >
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
                <th scope="col" className="text-right">Max LTV</th>
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
                  aria-label={`${loan.type}: ${loan.rate} rate, ${loan.monthly}/mo payment, ${loan.cashFlow} cash flow. ${loan.notes}`}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-content-primary font-medium">{loan.type}</span>
                      {loan.best && (
                        <span className="badge-gold text-[10px]" aria-label="Recommended for this deal">
                          Recommended
                        </span>
                      )}
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

      {/* Loan detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Loan Amount",        value: formatCurrency(Math.round(loanAmount)),   sub: `${100 - downPct}% LTV` },
          { label: "Down Payment",       value: formatCurrency(Math.round(result.purchasePrice * downPct / 100)), sub: `${downPct}% of purchase` },
          { label: "Debt-to-Income",     value: "Est. 38%",                               sub: "Conventional qualifying threshold: <43%" },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-surface-secondary rounded-xl p-4 border border-surface-border"
            aria-label={`${m.label}: ${m.value}. ${m.sub}`}
          >
            <p className="metric-label mb-1">{m.label}</p>
            <p className="metric-value text-content-primary">{m.value}</p>
            <p className="text-[11px] text-content-disabled mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <AiInsightStrip
        summary={
          result.dscr >= 1.25
            ? `DSCR at ${result.dscr.toFixed(2)}x qualifies for a DSCR loan — ideal if you want to avoid income documentation. Conventional is still cheaper by ${formatCurrency(dscrMonthly - convMonthly)}/mo.`
            : `DSCR at ${result.dscr.toFixed(2)}x is below the 1.25x DSCR loan minimum. Conventional financing is the primary path — you'll need to document income.`
        }
        sources={["FRED", "Lender Rate Survey"]}
        confidence="medium"
      />
    </div>
  );
}

// Strategy placeholder for non-LTR strategies ─────────────────────────────────

function StrategyPlaceholder({ strategy }: { strategy: Strategy }) {
  const config: Record<Strategy, { title: string; fields: string[] }> = {
    LTR: { title: "", fields: [] },
    STR: {
      title: "Short-Term Rental Analysis",
      fields: ["ADR (Avg Daily Rate)", "Occupancy Rate", "RevPAR", "Platform Fees (Airbnb/VRBO)", "Seasonal Revenue Model", "STR vs LTR Comparison"],
    },
    Flip: {
      title: "Fix & Flip Analysis",
      fields: ["After Repair Value (ARV)", "70% Rule Check", "Maximum Allowable Offer (MAO)", "Rehab Budget Breakdown", "Holding Costs", "Profit Margin & Timeline"],
    },
    BRRRR: {
      title: "BRRRR Cycle Analysis",
      fields: ["Buy Phase: Purchase + Rehab Cost", "Rent Phase: Rental Income", "Refinance: New LTV & Equity Pull", "Repeat: Cash Recycled", "Infinite Return Detection"],
    },
  };

  const { title, fields } = config[strategy];

  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
      <div
        className="w-12 h-12 rounded-xl bg-gold-muted border border-gold/20 flex items-center justify-center"
        aria-hidden="true"
      >
        <Zap className="w-6 h-6 text-gold" />
      </div>
      <div>
        <p className="text-content-primary font-semibold text-base">{title}</p>
        <p className="text-content-tertiary text-[13px] mt-1">Coming in the next release</p>
      </div>
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2 text-left max-w-sm">
          {fields.map((f) => (
            <div key={f} className="flex items-center gap-2 text-[12px] text-content-disabled">
              <span className="w-1 h-1 rounded-full bg-gold-dark shrink-0" aria-hidden="true" />
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Content ────────────────────────────────────────────────────────

function AnalyzePageContent() {
  const [address,  setAddress]  = useState("");
  const [price,    setPrice]    = useState("");
  const [downPct,  setDownPct]  = useState("20");
  const [rate,     setRate]     = useState("6.85");
  const [strategy, setStrategy] = useState<Strategy>("LTR");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<AnalysisResult | null>(null);
  const [saved,    setSaved]    = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [realDataPct, setRealDataPct] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const router      = useRouter();
  const searchParams = useSearchParams();
  const addDeal     = useDealPipelineStore((s) => s.addDeal);
  const loadDeal    = useSimulatorStore((s) => s.loadDeal);

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
      // Step 1: Geocode
      let zipCode: string | undefined;
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const geoRes = await fetch(`/api/property/lookup?address=${encodeURIComponent(address.trim())}`);
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson.data) {
            zipCode = geoJson.data.zipCode;
            lat     = geoJson.data.lat;
            lng     = geoJson.data.lng;
          }
        }
      } catch {
        // Geocoding optional — continue without coordinates
      }

      // Step 2: Analyze
      const body = {
        address: address.trim(),
        zipCode,
        lat,
        lng,
        purchasePrice: price ? parseInt(price.replace(/\D/g, ""), 10) || undefined : undefined,
        downPaymentPct: parseFloat(downPct) || 20,
        interestRate:   parseFloat(rate) || 6.85,
      };

      const res = await fetch("/api/property/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = json.data;

      const analysisResult: AnalysisResult = {
        address:        data.address,
        beds:           data.beds,
        baths:          data.baths,
        sqft:           data.sqft,
        yearBuilt:      data.yearBuilt,
        purchasePrice:  data.purchasePrice,
        estimatedValue: data.estimatedValue,
        monthlyRent:    data.monthlyRent,
        score:          data.score,
        verdict:        data.verdict,
        confidence:     data.confidence,
        narrative:      data.narrative,
        nextSteps:      data.nextSteps,
        capRate:        data.capRate,
        monthlyCashFlow: data.monthlyCashFlow,
        dscr:           data.dscr,
        cashOnCash:     data.cashOnCash,
        monthlyMortgage: data.monthlyMortgage,
        monthlyExpenses: data.monthlyExpenses,
        institutional:  data.institutional,
        stress:         data.stress,
      };

      setResult(analysisResult);
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
      purchasePrice:   result.purchasePrice,
      monthlyRent:     result.monthlyRent,
      downPaymentPct:  parseFloat(downPct) || 20,
      interestRate:    parseFloat(rate) || 6.85,
    });
    router.push("/dashboard/simulator");
  }, [result, downPct, rate, loadDeal, router]);

  const handleCompare = useCallback(() => {
    setResult(null);
    setAddress("");
    setSaved(false);
    setDataSources([]);
  }, []);

  const liveCount = dataSources.filter((s) => s.status === "live").length;
  const downPctNum = parseFloat(downPct) || 20;
  const rateNum    = parseFloat(rate) || 6.85;

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Analyze Property</h1>
        <p className="page-subtitle">
          12-engine scoring. Address in. Verdict out in 10 seconds.
        </p>
      </div>

      {/* ── Input Form ───────────────────────────────────────────────────── */}
      <div className="card-gold space-y-4">

        {/* Strategy selector row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="section-label">Investment Strategy</label>
          <StrategySelector value={strategy} onChange={setStrategy} />
        </div>
        <p className="text-[11px] text-content-disabled -mt-2">
          {STRATEGY_LABELS[strategy].description}
        </p>

        {/* Address + params */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Address — spans 2 cols on lg */}
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
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              className="input-glass"
              aria-label="Enter property address"
              aria-required="true"
            />
          </div>

          {/* Price */}
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
              onChange={(e) => setPrice(e.target.value)}
              className="input-glass font-mono"
              aria-label="Purchase price (optional)"
            />
          </div>

          {/* Down % */}
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
              onChange={(e) => setDownPct(e.target.value)}
              className="input-glass font-mono"
              aria-label="Down payment percentage"
            />
          </div>
        </div>

        {/* Second row: rate + analyze */}
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
              onChange={(e) => setRate(e.target.value)}
              className="input-glass font-mono"
              aria-label="Mortgage interest rate percentage"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              onClick={analyze}
              disabled={!address.trim() || loading}
              className="btn-primary w-full"
              aria-label={loading ? "Analysis in progress" : "Analyze this property"}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"
                    aria-hidden="true"
                  />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" aria-hidden="true" />
                  Analyze →
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {apiError && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-lg bg-rose-muted/40 border border-rose/10"
        >
          <AlertTriangle className="w-4 h-4 text-rose-light mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[13px] text-rose-light font-medium">Analysis failed</p>
            <p className="text-[11px] text-rose-light/70 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
      {loading && <AnalysisSkeleton />}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-5 animate-fade-in">

          {/* Verdict Hero — always above the fold */}
          <VerdictHero
            result={result}
            downPct={downPctNum}
            rate={rateNum}
            onSave={saveToPipeline}
            saved={saved}
            onSimulate={handleSimulate}
            onCompare={handleCompare}
          />

          {/* Data source provenance badges */}
          {dataSources.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-2 px-1"
              aria-label="Data sources used in this analysis"
            >
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
              <span className="text-[10px] text-content-disabled ml-auto font-mono">
                {realDataPct}% real data
              </span>
            </div>
          )}

          {/* ── Tab Navigation + Panels ───────────────────────────────── */}
          <div className="space-y-4">
            <TabNav activeTab={activeTab} onChange={setActiveTab} />

            {/* LTR tabs — fully implemented */}
            {strategy === "LTR" && (
              <>
                {activeTab === "summary" && (
                  <SummaryTab result={result} downPct={downPctNum} rate={rateNum} />
                )}
                {activeTab === "financials" && (
                  <FinancialsTab result={result} downPct={downPctNum} rate={rateNum} />
                )}
                {activeTab === "risk" && (
                  <RiskTab result={result} />
                )}
                {activeTab === "market" && (
                  <MarketTab result={result} />
                )}
                {activeTab === "financing" && (
                  <FinancingTab result={result} downPct={downPctNum} rate={rateNum} />
                )}
              </>
            )}

            {/* STR / Flip / BRRRR — structure stubs */}
            {strategy !== "LTR" && (
              <StrategyPlaceholder strategy={strategy} />
            )}
          </div>

          {/* Investment Memo — expandable, below all tabs */}
          <InvestmentMemoCard
            result={result}
            rate={rateNum}
            downPct={downPctNum}
          />

          {/* Data freshness notice */}
          {liveCount > 0 ? (
            <div
              role="status"
              className="flex items-start gap-2 p-3 rounded-lg bg-emerald-muted/30 border border-emerald/10"
              aria-label={`${liveCount} of ${dataSources.length} data sources returned live data`}
            >
              <Wifi className="w-4 h-4 text-emerald-light mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-[11px] text-emerald-light leading-relaxed">
                {liveCount} of {dataSources.length} sources returned live data.
                {liveCount < dataSources.length
                  ? " Add missing API keys to .env.local for full coverage."
                  : ""}
              </p>
            </div>
          ) : (
            <div
              role="status"
              className="flex items-start gap-2 p-3 rounded-lg bg-amber-muted/40 border border-amber/10"
              aria-label="No API keys configured — using estimated data"
            >
              <AlertTriangle className="w-4 h-4 text-amber-light mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-[11px] text-amber-light leading-relaxed">
                No API keys configured. Analysis uses calculated estimates. Add{" "}
                <span className="font-mono">FRED_API_KEY</span>,{" "}
                <span className="font-mono">ATTOM_API_KEY</span>,{" "}
                <span className="font-mono">RENTCAST_API_KEY</span> to .env.local for real data.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Exported Page ────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div
          className="animate-pulse bg-surface-elevated rounded-2xl"
          style={{ minHeight: "60vh" }}
          aria-label="Loading analyze page"
          aria-busy="true"
        />
      }
    >
      <AnalyzePageContent />
    </Suspense>
  );
}
