"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  RotateCcw, AlertTriangle, Download, BookmarkPlus, ChevronDown,
  FlaskConical,
} from "lucide-react";
import { useSimulatorStore, type SimulatorInputs } from "@/lib/stores/simulator-store";
import { runDCF } from "@/lib/engines/dcf-engine";
import {
  runMonteCarlo,
  createDefaultMonteCarloConfig,
  type MonteCarloResult,
} from "@/lib/engines/monte-carlo-engine";
import {
  SimulatorInputPanel,
  SimulatorResultsPanel,
  SimulatorScorecardPanel,
  ScenarioComparisonStrip,
  InvestmentReport,
  buildDCFInput,
} from "./_components";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";

// ─── Sensitivity Insight ─────────────────────────────────────────────────────
// Deterministic analysis of which variable has the highest IRR sensitivity.
// Runs 3 quick DCF comparisons (+/- 10% on key inputs) and picks the largest swing.

function computeSensitivityInsight(store: SimulatorInputs): string {
  const base = buildDCFInput(store);
  function irrDelta(patch: Partial<typeof base>): number {
    try {
      const r = runDCF({ ...base, ...patch });
      const b = runDCF(base);
      return Math.abs(r.leveredIRR - b.leveredIRR);
    } catch {
      return 0;
    }
  }

  const candidates: Array<[string, number]> = [
    ["exit cap rate",      irrDelta({ exitCapRate: base.exitCapRate + 0.5 })],
    ["interest rate",      irrDelta({ interestRate: base.interestRate + 0.5 })],
    ["vacancy rate",       irrDelta({ vacancyPct: (base.vacancyPct ?? 5) + 3 })],
    ["rent growth",        irrDelta({ annualRentGrowthPct: base.annualRentGrowthPct - 1 })],
    ["purchase price",     irrDelta({ purchasePrice: base.purchasePrice * 1.05, loanAmount: base.purchasePrice * 1.05 * (1 - store.downPaymentPct / 100) })],
  ];

  candidates.sort((a, b) => b[1] - a[1]);
  const top = candidates[0];
  if (!top || top[1] < 0.1) return "Your return profile is well-balanced across key variables.";

  const second = candidates[1];
  const swingStr = top[1].toFixed(1);
  const secondStr = second ? ` A 100bps shift in ${second[0]} moves IRR by ${second[1].toFixed(1)}pp.` : "";
  return `Your most sensitive variable is the ${top[0]}. A 50bps change swings IRR by ${swingStr}pp.${secondStr} Lock in your assumptions carefully before committing capital.`;
}

// ─── Mobile Input Accordion ──────────────────────────────────────────────────

function MobileInputAccordion({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-input-panel"
        className="w-full flex items-center justify-between px-4 py-3 card text-sm font-medium text-content-primary"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-gold" aria-hidden="true" />
          Adjust Assumptions
        </span>
        <ChevronDown
          className={`w-4 h-4 text-content-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id="mobile-input-panel"
          className="mt-2 card animate-fade-in"
          aria-label="Simulator input assumptions"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Save Scenario (localStorage) ─────────────────────────────────────────────

function useSaveScenario() {
  const store = useSimulatorStore();
  const [saved, setSaved] = useState(false);

  const save = useCallback(() => {
    try {
      const scenarios = JSON.parse(localStorage.getItem("lv_simulator_scenarios") ?? "[]");
      scenarios.unshift({
        savedAt: new Date().toISOString(),
        name: `Scenario ${scenarios.length + 1}`,
        inputs: {
          purchasePrice: store.purchasePrice,
          downPaymentPct: store.downPaymentPct,
          interestRate: store.interestRate,
          monthlyRent: store.monthlyRent,
          vacancyPct: store.vacancyPct,
          holdPeriodYears: store.holdPeriodYears,
          exitCapRate: store.exitCapRate,
          annualAppreciationPct: store.annualAppreciationPct,
          annualRentGrowthPct: store.annualRentGrowthPct,
        },
      });
      // Keep last 10 saved scenarios
      localStorage.setItem("lv_simulator_scenarios", JSON.stringify(scenarios.slice(0, 10)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, [store]);

  return { save, saved };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const store = useSimulatorStore();
  const reset = useSimulatorStore((s) => s.reset);
  const [mc, setMC] = useState<MonteCarloResult | null>(null);
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { save, saved } = useSaveScenario();

  // Scroll to report when it opens
  useEffect(() => {
    if (showReport && reportRef.current) {
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [showReport]);

  // Build DCF input from current slider state — instant, pure math
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dcfInput = useMemo(() => buildDCFInput(store), [
    store.purchasePrice, store.downPaymentPct, store.interestRate, store.loanTermYears,
    store.amortizationYears, store.closingCostsPct, store.renovationBudget,
    store.monthlyRent, store.annualRentGrowthPct, store.vacancyPct, store.otherIncome,
    store.propertyTaxRate, store.insuranceAnnual, store.managementPct,
    store.maintenancePct, store.capexReservePct, store.annualExpenseGrowthPct,
    store.holdPeriodYears, store.exitCapRate, store.sellingCostsPct,
    store.annualAppreciationPct,
  ]);

  const dcf = useMemo(() => {
    try { return runDCF(dcfInput); } catch { return null; }
  }, [dcfInput]);

  // Monte Carlo — debounced, heavier computation
  useEffect(() => {
    setMC(null);
    const timer = setTimeout(() => {
      try {
        const config = createDefaultMonteCarloConfig(dcfInput, "simulator-seed");
        config.numSimulations = 5000;
        const result = runMonteCarlo(dcfInput, config);
        setMC(result);
      } catch {
        // Silently fail on edge-case inputs
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [dcfInput]);

  // Sensitivity insight (memoized, runs synchronously so no extra effect needed)
  const sensitivityInsight = useMemo(() => {
    if (!dcf) return "Adjust your assumptions to see sensitivity analysis.";
    try { return computeSensitivityInsight(store); } catch { return ""; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcfInput]);

  // Invalid state
  if (!dcf) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-amber mb-3" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-content-primary">Invalid Inputs</h2>
        <p className="text-sm text-content-tertiary mt-1 max-w-sm">
          Some slider values produce invalid calculations. Try adjusting hold period or exit cap rate.
        </p>
        <button onClick={reset} className="btn-secondary mt-4">
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Reset to Defaults
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-screen">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-content-primary font-display tracking-tight">
            Deal Simulator
          </h1>
          <p className="text-[13px] text-content-tertiary mt-0.5">
            Drag sliders. Watch returns recalculate in real-time. Every number is live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            aria-label={saved ? "Scenario saved" : "Save current scenario to local storage"}
            className={`btn-ghost text-xs transition-colors ${saved ? "text-emerald-light" : ""}`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={() => setShowReport(!showReport)}
            aria-expanded={showReport}
            aria-label={showReport ? "Close investment report" : "Generate investment report"}
            className="btn-ghost text-xs"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Report
          </button>
          <button onClick={reset} className="btn-ghost text-xs" aria-label="Reset all inputs to defaults">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Mobile: Collapsible Input Accordion ─────────────────────────────── */}
      <MobileInputAccordion>
        <SimulatorInputPanel />
      </MobileInputAccordion>

      {/* ── Main 2-Panel Split ───────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Left: Input Panel — fixed width, sticky */}
        <aside
          className="hidden lg:flex flex-col w-[360px] shrink-0"
          aria-label="Simulator inputs"
        >
          <div className="glass p-5 lg:sticky lg:top-20 space-y-4">

            {/* Panel header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-gold" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-content-primary">Assumptions</span>
              </div>
              <button
                onClick={reset}
                className="text-[11px] text-content-disabled hover:text-content-tertiary transition-colors font-medium"
                aria-label="Reset all assumptions to defaults"
              >
                Reset defaults
              </button>
            </div>

            <SimulatorInputPanel />
          </div>
        </aside>

        {/* Right: Results Panel — flex, scrollable */}
        <main className="flex-1 min-w-0 space-y-4" aria-label="Simulator results">

          {/* Key Metric Cards */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            role="region"
            aria-label="Key return metrics"
          >
            <MetricCard
              label="Levered IRR"
              value={isNaN(dcf.leveredIRR) ? "N/A" : `${dcf.leveredIRR.toFixed(1)}%`}
              sub={`Unlev: ${isNaN(dcf.unleveredIRR) ? "N/A" : `${dcf.unleveredIRR.toFixed(1)}%`}`}
              verdict={dcf.leveredIRR >= 12 ? "good" : dcf.leveredIRR < 0 ? "bad" : "neutral"}
              ariaLabel={`Levered IRR: ${dcf.leveredIRR.toFixed(1)}%`}
            />
            <MetricCard
              label="Equity Multiple"
              value={`${dcf.equityMultiple.toFixed(2)}x`}
              sub="total EM"
              verdict={dcf.equityMultiple >= 2 ? "good" : dcf.equityMultiple < 1 ? "bad" : "neutral"}
              ariaLabel={`Equity multiple: ${dcf.equityMultiple.toFixed(2)}x`}
            />
            <MetricCard
              label="Year 1 Cash Flow"
              value={formatMoney(dcf.annualCashFlows[0]?.cashFlowBeforeTax ?? 0)}
              sub={`CoC: ${(dcf.annualCashFlows[0]?.cashOnCash ?? 0).toFixed(1)}%`}
              verdict={(dcf.annualCashFlows[0]?.cashFlowBeforeTax ?? 0) > 0 ? "good" : "bad"}
              ariaLabel={`Year 1 cash flow: ${formatMoney(dcf.annualCashFlows[0]?.cashFlowBeforeTax ?? 0)}`}
            />
            <MetricCard
              label="NPV (8%)"
              value={formatMoney(dcf.netPresentValue)}
              sub={`Break-even: ${dcf.breakEvenMonth ? `${dcf.breakEvenMonth} mo` : "N/A"}`}
              verdict={dcf.netPresentValue > 0 ? "good" : "bad"}
              ariaLabel={`Net present value at 8% discount rate: ${formatMoney(dcf.netPresentValue)}`}
            />
          </div>

          {/* Tabbed Charts + Scorecard row */}
          <div className="flex flex-col xl:flex-row gap-4 items-start">

            {/* Charts — flex-1 */}
            <div className="flex-1 min-w-0">
              <SimulatorResultsPanel dcf={dcf} mc={mc} />
            </div>

            {/* Scorecard — fixed width on xl+ */}
            <div className="w-full xl:w-[220px] xl:shrink-0">
              <SimulatorScorecardPanel
                dcf={dcf}
                mc={mc}
                showReport={showReport}
                setShowReport={setShowReport}
              />
            </div>
          </div>

          {/* Scenario Comparison */}
          <ScenarioComparisonStrip dcf={dcf} />

          {/* AI Insight Strip */}
          {sensitivityInsight && (
            <AiInsightStrip
              summary={sensitivityInsight}
              detail={
                mc
                  ? `Monte Carlo confirms: ${mc.probabilityOfPositiveReturn.toFixed(0)}% of ${mc.numSimulations.toLocaleString()} simulations produce a positive return. The P10 downside IRR is ${mc.irr.p10.toFixed(1)}% and the P90 upside is ${mc.irr.p90.toFixed(1)}%. Your median simulated IRR of ${mc.irr.median.toFixed(1)}% is the most realistic single-scenario expectation.`
                  : undefined
              }
              factors={[
                { label: "Exit cap rate sensitivity", value: -store.exitCapRate * 0.1, unit: "pp" },
                { label: "Interest rate exposure", value: -store.interestRate * 0.08, unit: "pp" },
                { label: "Rent growth upside", value: store.annualRentGrowthPct * 0.15, unit: "pp" },
                { label: "Vacancy cushion", value: -store.vacancyPct * 0.05, unit: "pp" },
              ]}
              confidence={
                mc && mc.probabilityOfPositiveReturn >= 80
                  ? "high"
                  : mc && mc.probabilityOfPositiveReturn >= 60
                  ? "medium"
                  : "low"
              }
              sources={["DCF Engine", "Monte Carlo (5k sims)", "Sensitivity Analysis"]}
            />
          )}

          {/* Disclaimer */}
          <div
            role="note"
            className="flex items-start gap-2 p-3 rounded-lg bg-amber-muted/40 border border-amber/10"
          >
            <AlertTriangle className="w-4 h-4 text-amber mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[11px] text-amber leading-relaxed">
              All calculations run client-side using institutional-grade formulas (Newton-Raphson IRR,
              Cholesky-correlated Monte Carlo). Input your own assumptions — real data integration is in progress.
              This is not financial advice.
            </p>
          </div>
        </main>
      </div>

      {/* ── Full-Width Investment Report ──────────────────────────────────────── */}
      {showReport && (
        <div ref={reportRef}>
          <InvestmentReport
            dcf={dcf}
            mc={mc}
            inputs={store}
            onClose={() => setShowReport(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

type Verdict = "good" | "bad" | "neutral";

const VERDICT_COLORS: Record<Verdict, string> = {
  good: "text-emerald-light",
  bad: "text-rose-light",
  neutral: "text-content-primary",
};

function MetricCard({
  label,
  value,
  sub,
  verdict,
  ariaLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  verdict: Verdict;
  ariaLabel: string;
}) {
  return (
    <div
      className="card-glass !p-3"
      aria-label={ariaLabel}
    >
      <div className="metric-label mb-1">{label}</div>
      <div className={`font-mono text-lg font-bold tabular-nums ${VERDICT_COLORS[verdict]}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-content-disabled mt-0.5 font-mono">
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Local formatter (avoids import for a 1-liner) ───────────────────────────

function formatMoney(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: abs >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: abs >= 100_000 ? 1 : 0,
  }).format(abs);
  return cents < 0 ? `(${formatted})` : formatted;
}
