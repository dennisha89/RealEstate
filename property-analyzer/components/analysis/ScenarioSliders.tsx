"use client";

import { useState, useMemo } from "react";

interface ScenarioSlidersProps {
  basePrice: number;
  baseRent: number;
  baseDownPayment?: number;
  baseInterestRate?: number;
}

interface SliderDef {
  key: string; label: string; min: number; max: number; step: number; suffix: string;
}

const SLIDERS: SliderDef[] = [
  { key: "interestRate", label: "Interest Rate", min: 5, max: 10, step: 0.1, suffix: "%" },
  { key: "vacancyRate", label: "Vacancy Rate", min: 0, max: 20, step: 1, suffix: "%" },
  { key: "rentGrowth", label: "Rent Growth", min: -5, max: 10, step: 0.5, suffix: "%" },
  { key: "appreciation", label: "Appreciation", min: -5, max: 15, step: 0.5, suffix: "%" },
  { key: "holdPeriod", label: "Hold Period", min: 1, max: 30, step: 1, suffix: " yrs" },
  { key: "downPayment", label: "Down Payment", min: 5, max: 50, step: 5, suffix: "%" },
];

type Inputs = { interestRate: number; vacancyRate: number; rentGrowth: number; appreciation: number; holdPeriod: number; downPayment: number };

function calcMortgage(principal: number, annualRate: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = 360;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function compute(price: number, rent: number, v: Inputs) {
  const dp = price * (v.downPayment / 100);
  const loan = price - dp;
  const mortgage = calcMortgage(loan, v.interestRate);
  const adjRent = rent * (1 + v.rentGrowth / 100);
  const expenses = (price * 0.0125) / 12 + (price * 0.007) / 12 + adjRent * 0.1
    + (price * 0.01) / 12 + (price * 0.01) / 12 + adjRent * (v.vacancyRate / 100);
  const monthlyCF = adjRent - mortgage - expenses;
  const annualCF = monthlyCF * 12;
  const noi = (adjRent - expenses) * 12;
  const capRate = price > 0 ? (noi / price) * 100 : 0;
  const coc = dp > 0 ? (annualCF / dp) * 100 : 0;
  const totalCF = annualCF * v.holdPeriod;
  const appGain = price * Math.pow(1 + v.appreciation / 100, v.holdPeriod) - price;
  const r = v.interestRate / 100 / 12;
  let bal = loan;
  for (let m = 0; m < v.holdPeriod * 12; m++) {
    bal = Math.max(0, bal - (mortgage - bal * r));
  }
  const eqPaydown = loan - bal;
  const totalReturn = totalCF + appGain + eqPaydown;
  const equityEnd = dp + appGain + eqPaydown;
  let breakEven = -1;
  if (monthlyCF > 0) { let cum = 0; for (let m = 1; m <= v.holdPeriod * 12; m++) { cum += monthlyCF; if (cum > 0) { breakEven = m; break; } } }
  const irr = dp > 0 && dp + totalReturn > 0
    ? (Math.pow((dp + totalReturn) / dp, 1 / v.holdPeriod) - 1) * 100 : 0;
  return { monthlyCF, annualCF, capRate, coc, totalReturn, irr, breakEven, equityEnd };
}

function fmt(value: number): string {
  const abs = Math.abs(value);
  const s = value < 0 ? "-$" : "$";
  if (abs >= 1_000_000) return `${s}${(abs / 1_000_000).toFixed(1)}M`;
  return `${s}${Math.round(abs).toLocaleString()}`;
}

function MetricCell({ label, value, base, unit }: { label: string; value: number; base: number; unit: string }) {
  const diff = value - base;
  const isPct = unit === "%";
  const isMo = unit === "mo";
  const display = isNaN(value) ? "N/A" : isPct ? `${value.toFixed(2)}%` : isMo ? `${value} mo` : fmt(value);
  const diffStr = isNaN(diff) ? "" : isPct
    ? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`
    : isMo ? `${diff >= 0 ? "+" : ""}${Math.round(diff)} mo`
    : `${diff >= 0 ? "+" : ""}${fmt(diff)}`;
  const color = isNaN(value) ? "text-content-tertiary" : value >= 0 ? "text-money-400" : "text-red-400";
  const dColor = diff > 0.005 ? "text-money-400" : diff < -0.005 ? "text-red-400" : "text-content-tertiary";

  return (
    <div className="p-3 bg-surface-elevated rounded-lg border border-surface-border/50">
      <p className="text-[10px] text-content-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-mono font-bold ${color}`}>{display}</p>
      {!isNaN(diff) && Math.abs(diff) > 0.005 && (
        <p className={`text-[10px] font-mono font-medium mt-0.5 ${dColor}`}>vs base: {diffStr}</p>
      )}
    </div>
  );
}

export default function ScenarioSliders({
  basePrice, baseRent, baseDownPayment = 20, baseInterestRate = 7.5,
}: ScenarioSlidersProps) {
  const [values, setValues] = useState<Inputs>({
    interestRate: baseInterestRate, vacancyRate: 8, rentGrowth: 0,
    appreciation: 3, holdPeriod: 5, downPayment: baseDownPayment,
  });
  const update = (key: string, v: number) => setValues((p) => ({ ...p, [key]: v }));

  const baseInputs: Inputs = useMemo(() => ({
    interestRate: baseInterestRate, vacancyRate: 8, rentGrowth: 0,
    appreciation: 3, holdPeriod: 5, downPayment: baseDownPayment,
  }), [baseInterestRate, baseDownPayment]);

  const metrics = useMemo(() => compute(basePrice, baseRent, values), [basePrice, baseRent, values]);
  const base = useMemo(() => compute(basePrice, baseRent, baseInputs), [basePrice, baseRent, baseInputs]);

  const m = metrics;
  const b = base;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-content-primary mb-5">What-If Scenario Analysis</h3>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          {SLIDERS.map((s) => {
            const v = values[s.key as keyof Inputs];
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs text-content-secondary w-28 shrink-0">{s.label}</span>
                <input
                  type="range" min={s.min} max={s.max} step={s.step} value={v}
                  onChange={(e) => update(s.key, parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-surface-wash rounded-full appearance-none cursor-pointer
                    accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400
                    [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-glow-emerald"
                />
                <span className="text-xs font-mono text-content-primary w-16 text-right">
                  {s.step < 1 ? v.toFixed(1) : v}{s.suffix}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <MetricCell label="Monthly Cash Flow" value={m.monthlyCF} base={b.monthlyCF} unit="$" />
          <MetricCell label="Annual Cash Flow" value={m.annualCF} base={b.annualCF} unit="$" />
          <MetricCell label="Cap Rate" value={m.capRate} base={b.capRate} unit="%" />
          <MetricCell label="Cash-on-Cash" value={m.coc} base={b.coc} unit="%" />
          <MetricCell label="Total Return" value={m.totalReturn} base={b.totalReturn} unit="$" />
          <MetricCell label="IRR" value={m.irr} base={b.irr} unit="%" />
          <MetricCell label="Break-even" value={m.breakEven === -1 ? NaN : m.breakEven}
            base={b.breakEven === -1 ? NaN : b.breakEven} unit="mo" />
          <MetricCell label="Equity (End)" value={m.equityEnd} base={b.equityEnd} unit="$" />
        </div>
      </div>
    </div>
  );
}
