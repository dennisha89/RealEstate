"use client";

import { useMemo, useState, useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import { runDCF } from "@/lib/engines/dcf-engine";
import { runMonteCarlo, createDefaultMonteCarloConfig, type MonteCarloResult } from "@/lib/engines/monte-carlo-engine";
import {
  SimulatorInputPanel,
  SimulatorResultsPanel,
  SimulatorScorecardPanel,
  buildDCFInput,
} from "./_components";

export default function SimulatorPage() {
  const store = useSimulatorStore();
  const reset = useSimulatorStore((s) => s.reset);
  const [mc, setMC] = useState<MonteCarloResult | null>(null);

  // Build DCF input from current slider state
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

  // Run DCF on every slider change (instant — pure math, no network)
  const dcf = useMemo(() => {
    try {
      return runDCF(dcfInput);
    } catch {
      return null;
    }
  }, [dcfInput]);

  // Run Monte Carlo debounced (heavier computation)
  useEffect(() => {
    setMC(null);
    const timer = setTimeout(() => {
      try {
        const config = createDefaultMonteCarloConfig(dcfInput, "simulator-seed");
        // Use 5000 sims for responsiveness (still statistically robust)
        config.numSimulations = 5000;
        const result = runMonteCarlo(dcfInput, config);
        setMC(result);
      } catch {
        // Silently fail for edge-case inputs
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [dcfInput]);

  if (!dcf) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-light mb-3" />
        <h2 className="text-lg font-semibold text-content-primary">Invalid Inputs</h2>
        <p className="text-sm text-content-tertiary mt-1 max-w-sm">
          Some slider values produce invalid calculations. Try adjusting hold period or exit cap rate.
        </p>
        <button onClick={reset} className="btn-secondary mt-4">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-content-primary">Deal Simulator</h1>
          <p className="text-[13px] text-content-tertiary mt-0.5">
            Drag sliders. Watch returns update in real-time. Every number recalculates instantly.
          </p>
        </div>
        <button onClick={reset} className="btn-ghost text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Three-panel layout: desktop side-by-side, mobile stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left — Input Sliders */}
        <div className="lg:col-span-3">
          <div className="card lg:sticky lg:top-20">
            <div className="section-label mb-3">Assumptions</div>
            <SimulatorInputPanel />
          </div>
        </div>

        {/* Center — Results */}
        <div className="lg:col-span-6">
          <SimulatorResultsPanel dcf={dcf} mc={mc} />
        </div>

        {/* Right — Scorecard */}
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-20">
            <SimulatorScorecardPanel dcf={dcf} mc={mc} />
          </div>
        </div>
      </div>

      {/* Demo disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-muted/40 border border-amber/10 mt-6">
        <AlertTriangle className="w-4 h-4 text-amber-light mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-light leading-relaxed">
          All calculations run client-side using institutional-grade formulas (Newton-Raphson IRR, Cholesky-correlated Monte Carlo).
          Input your own assumptions — real data integration is in progress.
        </p>
      </div>
    </div>
  );
}
