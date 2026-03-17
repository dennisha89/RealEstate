"use client";

import { useState, useMemo, useCallback } from "react";
import { SlidersHorizontal, AlertTriangle, TrendingDown, Lock } from "lucide-react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatIfOverrides {
  downPct: number;
  rate: number;
  rentMultiplier: number;
}

interface DerivedMetrics {
  monthlyPayment: number;
  monthlyCashFlow: number;
  capRate: number;
  dscr: number;
  cocReturn: number;
}

// ─── Mortgage calculation ─────────────────────────────────────────────────────

function calcMortgagePayment(principal: number, annualRatePct: number, years = 30): number {
  if (annualRatePct <= 0) return principal / (years * 12);
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function deriveMetrics(result: AnalysisResult, overrides: WhatIfOverrides): DerivedMetrics {
  const { downPct, rate, rentMultiplier } = overrides;
  const downPayment     = result.purchasePrice * (downPct / 100);
  const loanAmount      = result.purchasePrice - downPayment;
  const monthlyPayment  = calcMortgagePayment(loanAmount, rate);
  const monthlyRent     = result.monthlyRent * rentMultiplier;
  const annualRent      = monthlyRent * 12;
  const annualExpenses  = result.monthlyExpenses * 12;
  const noi             = annualRent - annualExpenses;
  const annualDebtSvc   = monthlyPayment * 12;
  const monthlyCashFlow = (noi - annualDebtSvc) / 12;
  const capRate         = (noi / result.purchasePrice) * 100;
  const dscr            = noi / annualDebtSvc;
  const cocReturn       = ((noi - annualDebtSvc) / (downPayment + result.purchasePrice * 0.03)) * 100;

  return {
    monthlyPayment: Math.round(monthlyPayment),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    capRate: Math.round(capRate * 100) / 100,
    dscr:    Math.round(dscr * 100)    / 100,
    cocReturn: Math.round(cocReturn * 100) / 100,
  };
}

// ─── Slider component ─────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  accentColor?: string;
  id: string;
}

function Slider({ label, value, min, max, step, format, onChange, accentColor = CHART_COLORS.gold, id }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[12px] text-content-secondary">{label}</label>
        <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: accentColor }}>
          {format(value)}
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-elevated"
          style={{
            background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, #1A1A1A ${pct}%, #1A1A1A 100%)`,
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
        />
      </div>
      <div className="flex justify-between text-[10px] text-content-disabled">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Metric comparison cell ───────────────────────────────────────────────────

function MetricCell({
  label,
  baseline,
  current,
  format,
  positiveIsGood = true,
}: {
  label: string;
  baseline: string;
  current: string;
  format?: string;
  positiveIsGood?: boolean;
}) {
  void format;
  const same = baseline === current;
  return (
    <div className="card-glass !p-3">
      <p className="metric-label mb-1">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-content-disabled">Baseline</span>
          <span className="font-mono text-[12px] tabular-nums text-content-secondary">{baseline}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-content-disabled">What-If</span>
          <span className={`font-mono text-[13px] font-bold tabular-nums ${same ? "text-content-primary" : positiveIsGood ? "text-emerald-light" : "text-amber-light"}`}>
            {current}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WhatIfTab({
  result,
  onRecalculate,
}: {
  result: AnalysisResult;
  onRecalculate: (overrides: WhatIfOverrides) => void;
}) {
  const baseRate = 6.87; // current market rate (would pull from FRED in production)

  const [downPct,        setDownPct]        = useState(20);
  const [rate,           setRate]           = useState(baseRate);
  const [rentMultiplier, setRentMultiplier] = useState(1.0);

  const baselineOverrides: WhatIfOverrides = useMemo(() => ({
    downPct: 20, rate: baseRate, rentMultiplier: 1.0,
  }), [baseRate]);

  const currentOverrides: WhatIfOverrides = useMemo(() => ({
    downPct, rate, rentMultiplier,
  }), [downPct, rate, rentMultiplier]);

  const baseline = useMemo(() => deriveMetrics(result, baselineOverrides), [result, baselineOverrides]);
  const current  = useMemo(() => deriveMetrics(result, currentOverrides),  [result, currentOverrides]);

  const handleRateChange = useCallback((v: number) => {
    setRate(v);
    onRecalculate({ downPct, rate: v, rentMultiplier });
  }, [downPct, rentMultiplier, onRecalculate]);

  const handleDownChange = useCallback((v: number) => {
    setDownPct(v);
    onRecalculate({ downPct: v, rate, rentMultiplier });
  }, [rate, rentMultiplier, onRecalculate]);

  const handleRentChange = useCallback((v: number) => {
    setRentMultiplier(v);
    onRecalculate({ downPct, rate, rentMultiplier: v });
  }, [downPct, rate, onRecalculate]);

  // Break-even rate: find rate at which CF = 0
  // Monthly expenses stay constant; we solve for rate where rent = payment + expenses
  const maxAffordablePayment  = result.monthlyRent - result.monthlyExpenses;
  let breakEvenRate = baseRate;
  for (let r = 3.0; r <= 15.0; r += 0.01) {
    const loan = result.purchasePrice * (1 - downPct / 100);
    const pmt  = calcMortgagePayment(loan, r);
    if (pmt >= maxAffordablePayment) { breakEvenRate = Math.round(r * 100) / 100; break; }
  }

  // Minimum rent for positive CF at current terms
  const minRent = Math.round(current.monthlyPayment + result.monthlyExpenses + 1);

  const cfNegativeAtCurrentRate = current.monthlyCashFlow < 0;

  return (
    <div className="space-y-4">

      {/* Sliders */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Adjust Assumptions — Live Recalculation
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Slider
            id="whatif-down-pct"
            label="Down Payment"
            value={downPct}
            min={5} max={30} step={1}
            format={(v) => `${v}%`}
            onChange={handleDownChange}
            accentColor={CHART_COLORS.gold}
          />
          <Slider
            id="whatif-rate"
            label="Interest Rate"
            value={rate}
            min={5.0} max={9.0} step={0.125}
            format={(v) => `${v.toFixed(3)}%`}
            onChange={handleRateChange}
            accentColor={rate > baseRate + 0.5 ? CHART_COLORS.rose : CHART_COLORS.emerald}
          />
          <Slider
            id="whatif-rent"
            label={`Monthly Rent (${rentMultiplier >= 1 ? "+" : ""}${Math.round((rentMultiplier - 1) * 100)}%)`}
            value={rentMultiplier}
            min={0.80} max={1.20} step={0.01}
            format={(v) => formatCurrency(Math.round(result.monthlyRent * v))}
            onChange={handleRentChange}
            accentColor={rentMultiplier >= 1 ? CHART_COLORS.emerald : CHART_COLORS.rose}
          />
        </div>
      </div>

      {/* Live metrics row */}
      <div className="card">
        <div className="section-label mb-3">Live Metrics</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            {
              label: "Cash Flow",
              value: current.monthlyCashFlow,
              formatted: `${current.monthlyCashFlow >= 0 ? "" : "("}${formatCurrency(Math.abs(current.monthlyCashFlow))}${current.monthlyCashFlow < 0 ? ")/mo" : "/mo"}`,
              color: current.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light",
            },
            {
              label: "Cap Rate",
              value: current.capRate,
              formatted: `${current.capRate.toFixed(2)}%`,
              color: current.capRate >= 6 ? "text-emerald-light" : current.capRate >= 4 ? "text-amber-light" : "text-rose-light",
            },
            {
              label: "DSCR",
              value: current.dscr,
              formatted: `${current.dscr.toFixed(2)}x`,
              color: current.dscr >= 1.25 ? "text-emerald-light" : current.dscr >= 1.0 ? "text-amber-light" : "text-rose-light",
            },
            {
              label: "CoC Return",
              value: current.cocReturn,
              formatted: `${current.cocReturn.toFixed(2)}%`,
              color: current.cocReturn >= 8 ? "text-emerald-light" : current.cocReturn >= 4 ? "text-amber-light" : "text-rose-light",
            },
            {
              label: "Mortgage",
              value: -current.monthlyPayment,
              formatted: `${formatCurrency(current.monthlyPayment)}/mo`,
              color: "text-content-primary",
            },
          ].map(({ label, formatted, color }) => (
            <div key={label} className="card-glass !p-3 text-center">
              <p className="metric-label mb-1">{label}</p>
              <p className={`font-mono text-base font-bold tabular-nums ${color}`}>{formatted}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="card">
        <div className="section-label mb-3">Baseline vs What-If</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricCell
            label="Monthly Cash Flow"
            baseline={`${baseline.monthlyCashFlow >= 0 ? "" : "("}${formatCurrency(Math.abs(baseline.monthlyCashFlow))}${baseline.monthlyCashFlow < 0 ? ")" : ""}/mo`}
            current={`${current.monthlyCashFlow >= 0 ? "" : "("}${formatCurrency(Math.abs(current.monthlyCashFlow))}${current.monthlyCashFlow < 0 ? ")" : ""}/mo`}
            positiveIsGood
          />
          <MetricCell
            label="Cap Rate"
            baseline={`${baseline.capRate.toFixed(2)}%`}
            current={`${current.capRate.toFixed(2)}%`}
            positiveIsGood
          />
          <MetricCell
            label="DSCR"
            baseline={`${baseline.dscr.toFixed(2)}x`}
            current={`${current.dscr.toFixed(2)}x`}
            positiveIsGood
          />
          <MetricCell
            label="CoC Return"
            baseline={`${baseline.cocReturn.toFixed(2)}%`}
            current={`${current.cocReturn.toFixed(2)}%`}
            positiveIsGood
          />
          <MetricCell
            label="Monthly Payment"
            baseline={`${formatCurrency(baseline.monthlyPayment)}/mo`}
            current={`${formatCurrency(current.monthlyPayment)}/mo`}
            positiveIsGood={false}
          />
          <MetricCell
            label="Monthly Rent"
            baseline={formatCurrency(result.monthlyRent)}
            current={formatCurrency(Math.round(result.monthlyRent * rentMultiplier))}
            positiveIsGood
          />
        </div>
      </div>

      {/* Break-Even + Minimum Rent + Rate Lock */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            <Term id="cap-rate">Break-Even Rate</Term>
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-amber-light">{breakEvenRate.toFixed(2)}%</p>
          <p className="text-[12px] text-content-secondary leading-relaxed mt-1">
            This deal breaks even (CF = $0) at{" "}
            <span className="font-mono text-content-primary tabular-nums">{breakEvenRate.toFixed(2)}%</span>.
            {rate < breakEvenRate
              ? ` You have ${(breakEvenRate - rate).toFixed(2)}pp of rate cushion at current terms.`
              : " You are already above break-even rate — adjust rent or down payment."}
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Minimum Rent
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-content-primary">{formatCurrency(minRent)}/mo</p>
          <p className="text-[12px] text-content-secondary leading-relaxed mt-1">
            You need at least{" "}
            <span className="font-mono text-content-primary tabular-nums">{formatCurrency(minRent)}/mo</span>{" "}
            rent for positive cash flow at{" "}
            <span className="font-mono tabular-nums text-amber-light">{rate.toFixed(3)}%</span>.
            {result.monthlyRent * rentMultiplier >= minRent
              ? " Current estimate clears this."
              : " Current estimate falls short — renegotiate or increase down payment."}
          </p>
        </div>

        <div className={`card border ${cfNegativeAtCurrentRate ? "border-rose/20" : "border-emerald/20"}`}>
          <div className="section-label flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Rate Lock Advice
          </div>
          <p className={`font-mono text-xl font-bold tabular-nums ${cfNegativeAtCurrentRate ? "text-rose-light" : "text-emerald-light"}`}>
            {rate.toFixed(3)}%
          </p>
          <p className="text-[12px] text-content-secondary leading-relaxed mt-1">
            At{" "}
            <span className="font-mono tabular-nums text-content-primary">{baseRate}%</span>,
            this deal{" "}
            {cfNegativeAtCurrentRate
              ? "does not cash flow. If rates drop to "
              : "works. If rates hit "}
            <span className="font-mono tabular-nums text-content-primary">{breakEvenRate.toFixed(2)}%</span>,
            cash flow goes{" "}
            {cfNegativeAtCurrentRate ? "positive" : "negative"}.{" "}
            {!cfNegativeAtCurrentRate ? "Lock your rate now." : "Consider more down payment to improve debt coverage."}
          </p>
        </div>

      </div>
    </div>
  );
}
