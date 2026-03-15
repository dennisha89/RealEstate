"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle, XCircle, Save, FileText,
  BarChart3, Table2, Zap, Layers, Grid3X3,
} from "lucide-react";
import { useSimulatorStore, type SimulatorInputs } from "@/lib/stores/simulator-store";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import { runDCF, type DCFInput, type AnnualCashFlow } from "@/lib/engines/dcf-engine";
import { type MonteCarloResult } from "@/lib/engines/monte-carlo-engine";
import {
  calculateWaterfall, createStandardWaterfall,
} from "@/lib/engines/waterfall-engine";

// ─── Slider Control ───────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  field: keyof SimulatorInputs;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  format?: (v: number) => string;
}

export function SliderControl({ label, field, min, max, step, prefix, suffix, format }: SliderProps) {
  const value = useSimulatorStore((s) => s[field]) as number;
  const setValue = useSimulatorStore((s) => s.setValue);

  const display = format ? format(value) : `${prefix ?? ""}${value.toLocaleString()}${suffix ?? ""}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium">{label}</label>
        <span className="font-mono text-sm font-semibold text-content-primary tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(field, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-surface-muted cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-glow
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  );
}

// ─── Build DCF Input from Simulator State ─────────────────────────────────────

export function buildDCFInput(s: SimulatorInputs): DCFInput {
  const loanAmount = s.purchasePrice * (1 - s.downPaymentPct / 100);
  return {
    purchasePrice: s.purchasePrice,
    closingCostsPct: s.closingCostsPct,
    renovationBudget: s.renovationBudget,
    loanAmount,
    interestRate: s.interestRate,
    loanTermYears: s.loanTermYears,
    amortizationYears: s.amortizationYears,
    loanOriginationFeePct: 1,
    monthlyRent: s.monthlyRent,
    annualRentGrowthPct: s.annualRentGrowthPct,
    otherIncome: s.otherIncome,
    vacancyPct: s.vacancyPct,
    propertyTaxRate: s.propertyTaxRate,
    insuranceAnnual: s.insuranceAnnual,
    managementPct: s.managementPct,
    maintenancePct: s.maintenancePct,
    capexReservePct: s.capexReservePct,
    annualExpenseGrowthPct: s.annualExpenseGrowthPct,
    annualAppreciationPct: s.annualAppreciationPct,
    holdPeriodYears: s.holdPeriodYears,
    exitCapRate: s.exitCapRate,
    sellingCostsPct: s.sellingCostsPct,
  };
}

// ─── Deal Score Gauge (SVG) ──────────────────────────────────────────────────

export function DealGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 75 ? "#34D399" : clamped >= 55 ? "#FBBF24" : "#F87171";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="108" height="108" viewBox="0 0 108 108" className="-rotate-90">
        <circle cx="54" cy="54" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="54" cy="54" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-content-primary">{Math.round(clamped)}</span>
        <span className="text-[9px] text-content-disabled uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="card-glass !p-3">
      <div className="metric-label mb-1">{label}</div>
      <div className={`font-mono text-lg font-bold tabular-nums ${good === true ? "text-emerald-light" : good === false ? "text-rose-light" : "text-content-primary"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-content-disabled mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Input Panel (Left) ─────────────────────────────────────────────────────

export function SimulatorInputPanel() {
  const [section, setSection] = useState<"acquisition" | "income" | "expenses" | "exit">("acquisition");

  const sections = [
    { key: "acquisition" as const, label: "Acquisition" },
    { key: "income" as const, label: "Income" },
    { key: "expenses" as const, label: "Expenses" },
    { key: "exit" as const, label: "Exit" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              section === s.key ? "bg-gold-muted text-gold-light" : "text-content-disabled hover:text-content-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {section === "acquisition" && (
          <>
            <SliderControl label="Purchase Price" field="purchasePrice" min={50_000} max={2_000_000} step={5_000} format={(v) => formatCurrency(v)} />
            <SliderControl label="Down Payment" field="downPaymentPct" min={0} max={100} step={1} suffix="%" />
            <SliderControl label="Interest Rate" field="interestRate" min={2} max={12} step={0.125} suffix="%" />
            <SliderControl label="Loan Term" field="loanTermYears" min={5} max={30} step={5} suffix=" yrs" />
            <SliderControl label="Closing Costs" field="closingCostsPct" min={0} max={6} step={0.5} suffix="%" />
            <SliderControl label="Renovation Budget" field="renovationBudget" min={0} max={200_000} step={5_000} format={(v) => formatCurrency(v)} />
          </>
        )}
        {section === "income" && (
          <>
            <SliderControl label="Monthly Rent" field="monthlyRent" min={500} max={10_000} step={50} format={(v) => formatCurrency(v)} />
            <SliderControl label="Annual Rent Growth" field="annualRentGrowthPct" min={-3} max={10} step={0.5} suffix="%" />
            <SliderControl label="Vacancy Rate" field="vacancyPct" min={0} max={20} step={1} suffix="%" />
            <SliderControl label="Other Income" field="otherIncome" min={0} max={1_000} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
          </>
        )}
        {section === "expenses" && (
          <>
            <SliderControl label="Property Tax Rate" field="propertyTaxRate" min={0} max={4} step={0.1} suffix="%" />
            <SliderControl label="Annual Insurance" field="insuranceAnnual" min={600} max={12_000} step={100} format={(v) => formatCurrency(v)} />
            <SliderControl label="Management Fee" field="managementPct" min={0} max={15} step={1} suffix="%" />
            <SliderControl label="Maintenance Reserve" field="maintenancePct" min={0} max={3} step={0.25} suffix="%" />
            <SliderControl label="CapEx Reserve" field="capexReservePct" min={0} max={3} step={0.25} suffix="%" />
            <SliderControl label="Expense Growth" field="annualExpenseGrowthPct" min={0} max={8} step={0.5} suffix="%" />
          </>
        )}
        {section === "exit" && (
          <>
            <SliderControl label="Hold Period" field="holdPeriodYears" min={1} max={15} step={1} suffix=" yrs" />
            <SliderControl label="Exit Cap Rate" field="exitCapRate" min={3} max={12} step={0.25} suffix="%" />
            <SliderControl label="Selling Costs" field="sellingCostsPct" min={0} max={10} step={0.5} suffix="%" />
            <SliderControl label="Annual Appreciation" field="annualAppreciationPct" min={-5} max={15} step={0.5} suffix="%" />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Results Panel (Center) ─────────────────────────────────────────────────

export function SimulatorResultsPanel({ dcf, mc }: { dcf: ReturnType<typeof runDCF>; mc: MonteCarloResult | null }) {
  const activeTab = useSimulatorStore((s) => s.activeTab);
  const setActiveTab = useSimulatorStore((s) => s.setActiveTab);

  const tabs = [
    { key: "cashflow" as const, label: "Cash Flow", icon: BarChart3 },
    { key: "proforma" as const, label: "Pro Forma", icon: Table2 },
    { key: "montecarlo" as const, label: "Monte Carlo", icon: Zap },
    { key: "waterfall" as const, label: "Waterfall", icon: Layers },
    { key: "sensitivity" as const, label: "Sensitivity", icon: Grid3X3 },
  ];

  const y1 = dcf.annualCashFlows[0];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPICard
          label="Levered IRR"
          value={isNaN(dcf.leveredIRR) ? "N/A" : `${dcf.leveredIRR.toFixed(1)}%`}
          sub={`Unlevered: ${isNaN(dcf.unleveredIRR) ? "N/A" : `${dcf.unleveredIRR.toFixed(1)}%`}`}
          good={dcf.leveredIRR >= 12 ? true : dcf.leveredIRR < 0 ? false : undefined}
        />
        <KPICard
          label="Equity Multiple"
          value={`${dcf.equityMultiple.toFixed(2)}x`}
          sub={`${dcf.totalEquityInvested > 0 ? formatCompact(dcf.totalCashDistributed) : "$0"} total`}
          good={dcf.equityMultiple >= 2 ? true : dcf.equityMultiple < 1 ? false : undefined}
        />
        <KPICard
          label="Year 1 Cash Flow"
          value={formatCurrency(y1?.cashFlowBeforeTax ?? 0)}
          sub={`CoC: ${y1?.cashOnCash?.toFixed(1) ?? 0}%`}
          good={(y1?.cashFlowBeforeTax ?? 0) > 0}
        />
        <KPICard
          label="NPV (8%)"
          value={formatCurrency(dcf.netPresentValue)}
          sub={`Break-even: ${dcf.breakEvenMonth ? `${dcf.breakEvenMonth} mo` : "N/A"}`}
          good={dcf.netPresentValue > 0}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-surface-border pb-px overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-gold text-gold-light"
                : "border-transparent text-content-disabled hover:text-content-secondary"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === "cashflow" && <CashFlowTab flows={dcf.annualCashFlows} />}
        {activeTab === "proforma" && <ProFormaTab flows={dcf.annualCashFlows} exit={dcf.exitAnalysis} />}
        {activeTab === "montecarlo" && mc && <MonteCarloTab mc={mc} />}
        {activeTab === "montecarlo" && !mc && (
          <div className="card text-center py-8 text-content-tertiary text-sm">
            Running Monte Carlo simulation...
          </div>
        )}
        {activeTab === "waterfall" && <WaterfallTab dcf={dcf} />}
        {activeTab === "sensitivity" && <SensitivityTab dcf={dcf} />}
      </div>
    </div>
  );
}

// ─── Cash Flow Tab ───────────────────────────────────────────────────────────

function CashFlowTab({ flows }: { flows: AnnualCashFlow[] }) {
  return (
    <div className="card">
      <div className="section-label flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
        Annual Cash Flow Projection
      </div>

      {/* Bar chart using CSS */}
      <div className="space-y-2">
        {flows.map((f) => {
          const maxCF = Math.max(...flows.map((y) => Math.abs(y.cashFlowBeforeTax)), 1);
          const pct = Math.abs(f.cashFlowBeforeTax) / maxCF * 100;
          const positive = f.cashFlowBeforeTax >= 0;

          return (
            <div key={f.year} className="flex items-center gap-3">
              <span className="text-[11px] text-content-disabled font-mono w-6 shrink-0">Y{f.year}</span>
              <div className="flex-1 h-5 bg-surface-muted rounded overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all duration-300 ${positive ? "bg-emerald/60" : "bg-rose/60"}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className={`font-mono text-xs font-semibold tabular-nums w-20 text-right ${positive ? "text-emerald-light" : "text-rose-light"}`}>
                {formatCurrency(f.cashFlowBeforeTax)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
        <span className="text-content-tertiary">Total Operating Cash Flow</span>
        <span className="font-mono font-bold text-content-primary">
          {formatCurrency(flows.reduce((s, f) => s + f.cashFlowBeforeTax, 0))}
        </span>
      </div>
    </div>
  );
}

// ─── Pro Forma Tab ──────────────────────────────────────────────────────────

function ProFormaTab({ flows, exit }: { flows: AnnualCashFlow[]; exit: ReturnType<typeof runDCF>["exitAnalysis"] }) {
  return (
    <div className="card overflow-x-auto">
      <div className="section-label flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        {flows.length}-Year Pro Forma
      </div>

      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-content-disabled text-[10px] uppercase tracking-wider">
            <th className="text-left font-medium pb-2 pr-2 sticky left-0 bg-surface-card">Year</th>
            <th className="text-right font-medium pb-2 px-2">Gross Rent</th>
            <th className="text-right font-medium pb-2 px-2">NOI</th>
            <th className="text-right font-medium pb-2 px-2">Debt Svc</th>
            <th className="text-right font-medium pb-2 px-2">Cash Flow</th>
            <th className="text-right font-medium pb-2 px-2">CoC %</th>
            <th className="text-right font-medium pb-2 px-2">DSCR</th>
            <th className="text-right font-medium pb-2 px-2">Prop Value</th>
            <th className="text-right font-medium pb-2 pl-2">Equity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {flows.map((f) => (
            <tr key={f.year} className="hover:bg-white/[0.02]">
              <td className="py-1.5 pr-2 text-content-primary font-semibold sticky left-0 bg-surface-card">{f.year}</td>
              <td className="py-1.5 px-2 text-right text-content-secondary">{formatCompact(f.grossRent)}</td>
              <td className="py-1.5 px-2 text-right text-content-secondary">{formatCompact(f.netOperatingIncome)}</td>
              <td className="py-1.5 px-2 text-right text-rose-light">{formatCompact(f.debtService)}</td>
              <td className={`py-1.5 px-2 text-right font-semibold ${f.cashFlowBeforeTax >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                {formatCompact(f.cashFlowBeforeTax)}
              </td>
              <td className="py-1.5 px-2 text-right text-content-secondary">{f.cashOnCash.toFixed(1)}%</td>
              <td className={`py-1.5 px-2 text-right ${f.dscr >= 1.25 ? "text-emerald-light" : f.dscr >= 1 ? "text-amber-light" : "text-rose-light"}`}>
                {f.dscr.toFixed(2)}x
              </td>
              <td className="py-1.5 px-2 text-right text-content-secondary">{formatCompact(f.propertyValue)}</td>
              <td className="py-1.5 pl-2 text-right text-gold-light">{formatCompact(f.equity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Exit summary */}
      <div className="mt-4 pt-3 border-t border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Sale Price</div>
          <div className="font-mono text-sm font-semibold text-content-primary">{formatCurrency(exit.salePrice)}</div>
        </div>
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Net Proceeds</div>
          <div className="font-mono text-sm font-semibold text-emerald-light">{formatCurrency(exit.netProceedsFromSale)}</div>
        </div>
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Total Profit</div>
          <div className={`font-mono text-sm font-semibold ${exit.totalProfit >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
            {formatCurrency(exit.totalProfit)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Profit on Equity</div>
          <div className="font-mono text-sm font-semibold text-gold-light">{exit.profitOnEquity.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}

// ─── Monte Carlo Tab ────────────────────────────────────────────────────────

function MonteCarloTab({ mc }: { mc: MonteCarloResult }) {
  return (
    <div className="space-y-4">
      {/* Probability cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPICard label="P(Positive Return)" value={`${mc.probabilityOfPositiveReturn.toFixed(0)}%`} good={mc.probabilityOfPositiveReturn >= 80} />
        <KPICard label="P(IRR > 12%)" value={`${mc.probabilityOfTargetIRR.toFixed(0)}%`} good={mc.probabilityOfTargetIRR >= 50} />
        <KPICard label="Median IRR" value={`${mc.irr.median.toFixed(1)}%`} sub={`Range: ${mc.irr.p5.toFixed(1)}% — ${mc.irr.p95.toFixed(1)}%`} good={mc.irr.median >= 8} />
        <KPICard label="VaR (95%)" value={formatCurrency(mc.valueAtRisk95)} sub="Worst 5% scenario" good={mc.valueAtRisk95 >= 0} />
      </div>

      {/* IRR Histogram */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          IRR Distribution ({mc.numSimulations.toLocaleString()} simulations, {mc.executionTimeMs}ms)
        </div>

        <div className="flex items-end gap-px h-32">
          {mc.irrHistogram.map((bucket, i) => {
            const maxPct = Math.max(...mc.irrHistogram.map((b) => b.percentage), 1);
            const height = (bucket.percentage / maxPct) * 100;
            const isNeg = bucket.rangeEnd <= 0;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end" title={`${bucket.rangeStart.toFixed(1)}% — ${bucket.rangeEnd.toFixed(1)}%: ${bucket.count} (${bucket.percentage.toFixed(1)}%)`}>
                <div
                  className={`w-full rounded-t transition-all ${isNeg ? "bg-rose/50" : "bg-emerald/40"}`}
                  style={{ height: `${Math.max(height, 1)}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-1.5 text-[9px] font-mono text-content-disabled">
          <span>{mc.irr.min.toFixed(0)}%</span>
          <span>{mc.irr.median.toFixed(0)}% (median)</span>
          <span>{mc.irr.max.toFixed(0)}%</span>
        </div>
      </div>

      {/* Scenario breakdown */}
      <div className="card">
        <div className="section-label mb-3">Scenario Distribution</div>
        <div className="space-y-2">
          {[
            { label: "Excellent (IRR > 20%)", count: mc.scenarioCounts.excellent, color: "bg-emerald" },
            { label: "Good (12-20%)", count: mc.scenarioCounts.good, color: "bg-emerald/60" },
            { label: "Acceptable (8-12%)", count: mc.scenarioCounts.acceptable, color: "bg-amber/60" },
            { label: "Marginal (0-8%)", count: mc.scenarioCounts.marginal, color: "bg-amber/30" },
            { label: "Loss (< 0%)", count: mc.scenarioCounts.loss, color: "bg-rose/60" },
          ].map((s) => {
            const pct = (s.count / mc.numSimulations) * 100;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[11px] text-content-secondary w-32 shrink-0">{s.label}</span>
                <div className="flex-1 h-3 bg-surface-muted rounded overflow-hidden">
                  <div className={`h-full rounded ${s.color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-[11px] text-content-tertiary w-12 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Waterfall Tab ──────────────────────────────────────────────────────────

function WaterfallTab({ dcf }: { dcf: ReturnType<typeof runDCF> }) {
  const simState = useSimulatorStore();
  const totalEquity = dcf.totalEquityInvested;

  const waterfall = useMemo(() => {
    if (totalEquity <= 0) return null;
    const structure = createStandardWaterfall(totalEquity, 10);
    const opCFs = dcf.annualCashFlows.map((y) => y.cashFlowBeforeTax);
    return calculateWaterfall(totalEquity, opCFs, dcf.exitAnalysis.netProceedsFromSale, simState.holdPeriodYears, structure);
  }, [totalEquity, dcf, simState.holdPeriodYears]);

  if (!waterfall) {
    return <div className="card text-center py-8 text-content-tertiary text-sm">No equity to distribute.</div>;
  }

  return (
    <div className="space-y-4">
      {/* GP vs LP summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card border-gold/20">
          <div className="section-label mb-2">GP (Sponsor)</div>
          <div className="font-mono text-lg font-bold text-gold-light">{formatCurrency(waterfall.gp.totalDistributed)}</div>
          <div className="text-[11px] text-content-tertiary mt-1">
            {waterfall.gp.effectiveShare.toFixed(1)}% share · {waterfall.gp.equityMultiple.toFixed(2)}x EM · {waterfall.gp.irr.toFixed(1)}% IRR
          </div>
        </div>
        <div className="card border-emerald/20">
          <div className="section-label mb-2">LP (Investor)</div>
          <div className="font-mono text-lg font-bold text-emerald-light">{formatCurrency(waterfall.lp.totalDistributed)}</div>
          <div className="text-[11px] text-content-tertiary mt-1">
            {waterfall.lp.effectiveShare.toFixed(1)}% share · {waterfall.lp.equityMultiple.toFixed(2)}x EM · {waterfall.lp.irr.toFixed(1)}% IRR
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Distribution Waterfall (8% Pref / 20-30-40 Promote)
        </div>
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="text-content-disabled text-[10px] uppercase tracking-wider">
              <th className="text-left font-medium pb-2">Tier</th>
              <th className="text-right font-medium pb-2">Total</th>
              <th className="text-right font-medium pb-2">GP</th>
              <th className="text-right font-medium pb-2">LP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {waterfall.tiers.map((t) => (
              <tr key={t.label} className="hover:bg-white/[0.02]">
                <td className="py-1.5 text-content-primary">{t.label}</td>
                <td className="py-1.5 text-right text-content-secondary">{formatCurrency(t.distributedInTier)}</td>
                <td className="py-1.5 text-right text-gold-light">{formatCurrency(t.gpAmount)}</td>
                <td className="py-1.5 text-right text-emerald-light">{formatCurrency(t.lpAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sensitivity Tab ────────────────────────────────────────────────────────

function SensitivityTab({ dcf: _dcf }: { dcf: ReturnType<typeof runDCF> }) {
  const storeState = useSimulatorStore();
  const dcfInput = useMemo(() => buildDCFInput(storeState), [storeState]);

  // Compute a 5x5 sensitivity: Exit Cap vs Rent Growth
  const matrix = useMemo(() => {
    const baseCap = storeState.exitCapRate;
    const baseRent = storeState.annualRentGrowthPct;
    const capRates = [baseCap - 1, baseCap - 0.5, baseCap, baseCap + 0.5, baseCap + 1];
    const rentGrowths = [baseRent - 2, baseRent - 1, baseRent, baseRent + 1, baseRent + 2];

    const values: number[][] = [];
    for (const cap of capRates) {
      const row: number[] = [];
      for (const rg of rentGrowths) {
        try {
          const result = runDCF({ ...dcfInput, exitCapRate: cap, annualRentGrowthPct: rg });
          row.push(result.leveredIRR);
        } catch {
          row.push(NaN);
        }
      }
      values.push(row);
    }

    return { capRates, rentGrowths, values, baseCapIdx: 2, baseRentIdx: 2 };
  }, [dcfInput, storeState.exitCapRate, storeState.annualRentGrowthPct]);

  function cellColor(irr: number): string {
    if (isNaN(irr)) return "text-content-disabled";
    if (irr >= 20) return "text-emerald-light bg-emerald-muted";
    if (irr >= 12) return "text-emerald-light";
    if (irr >= 8) return "text-amber-light";
    if (irr >= 0) return "text-amber-light";
    return "text-rose-light bg-rose-muted";
  }

  return (
    <div className="card overflow-x-auto">
      <div className="section-label flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        Exit Cap Rate vs Rent Growth → Levered IRR
      </div>

      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr>
            <th className="text-left pb-2 pr-2 text-[10px] text-content-disabled uppercase tracking-wider">Cap \ Growth</th>
            {matrix.rentGrowths.map((rg, i) => (
              <th key={rg} className={`text-center pb-2 px-2 text-[10px] uppercase tracking-wider ${i === matrix.baseRentIdx ? "text-gold-light" : "text-content-disabled"}`}>
                {rg.toFixed(1)}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {matrix.capRates.map((cap, ri) => (
            <tr key={cap}>
              <td className={`py-1.5 pr-2 font-semibold ${ri === matrix.baseCapIdx ? "text-gold-light" : "text-content-primary"}`}>
                {cap.toFixed(1)}%
              </td>
              {matrix.values[ri].map((irr, ci) => (
                <td
                  key={ci}
                  className={`py-1.5 px-2 text-center font-semibold rounded ${cellColor(irr)} ${ri === matrix.baseCapIdx && ci === matrix.baseRentIdx ? "ring-1 ring-gold/40" : ""}`}
                >
                  {isNaN(irr) ? "N/A" : `${irr.toFixed(1)}%`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Scorecard Panel (Right) ────────────────────────────────────────────────

export function SimulatorScorecardPanel({ dcf, mc }: { dcf: ReturnType<typeof runDCF>; mc: MonteCarloResult | null }) {

  // Simple scoring based on key metrics
  const score = useMemo(() => {
    let s = 50;
    if (dcf.leveredIRR >= 20) s += 20;
    else if (dcf.leveredIRR >= 12) s += 10;
    else if (dcf.leveredIRR < 0) s -= 20;

    if (dcf.equityMultiple >= 2.5) s += 10;
    else if (dcf.equityMultiple >= 2) s += 5;
    else if (dcf.equityMultiple < 1) s -= 15;

    const y1 = dcf.annualCashFlows[0];
    if (y1 && y1.dscr >= 1.5) s += 10;
    else if (y1 && y1.dscr >= 1.25) s += 5;
    else if (y1 && y1.dscr < 1) s -= 10;

    if (dcf.netPresentValue > 0) s += 10;
    else s -= 5;

    if (mc && mc.probabilityOfPositiveReturn >= 90) s += 5;
    else if (mc && mc.probabilityOfPositiveReturn < 60) s -= 5;

    return Math.max(0, Math.min(100, s));
  }, [dcf, mc]);

  const verdict = score >= 75 ? "STRONG BUY" : score >= 60 ? "BUY" : score >= 45 ? "HOLD" : "PASS";
  const verdictColor = score >= 75 ? "text-emerald-light" : score >= 60 ? "text-emerald-light" : score >= 45 ? "text-amber-light" : "text-rose-light";
  const verdictBg = score >= 60 ? "bg-emerald-muted border-emerald/30" : score >= 45 ? "bg-amber-muted border-amber/30" : "bg-rose-muted border-rose/30";

  const y1 = dcf.annualCashFlows[0];

  // Checklist items
  const checks = [
    { label: "Positive cash flow Y1", pass: (y1?.cashFlowBeforeTax ?? 0) > 0 },
    { label: "DSCR ≥ 1.25x", pass: (y1?.dscr ?? 0) >= 1.25 },
    { label: "IRR ≥ 12%", pass: dcf.leveredIRR >= 12 },
    { label: "EM ≥ 2.0x", pass: dcf.equityMultiple >= 2 },
    { label: "NPV positive", pass: dcf.netPresentValue > 0 },
    { label: "Debt yield ≥ 8%", pass: dcf.debtYield >= 8 },
  ];

  const passing = checks.filter((c) => c.pass).length;

  return (
    <div className="space-y-4">
      {/* Gauge */}
      <div className="card flex flex-col items-center py-4">
        <DealGauge score={score} />
        <div className={`mt-3 px-3 py-1 rounded-md border text-sm font-bold ${verdictBg} ${verdictColor}`}>
          {verdict}
        </div>
        <div className="text-[10px] text-content-disabled mt-1.5">{passing}/{checks.length} metrics pass</div>
      </div>

      {/* Checklist */}
      <div className="card">
        <div className="section-label mb-3">Investment Checklist</div>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              {c.pass
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-light shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-rose-light shrink-0" />}
              <span className={`text-[12px] ${c.pass ? "text-content-secondary" : "text-content-tertiary"}`}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics summary */}
      <div className="card">
        <div className="section-label mb-3">Quick Numbers</div>
        <div className="space-y-2 text-[12px] font-mono">
          <div className="flex justify-between">
            <span className="text-content-tertiary">Total Equity In</span>
            <span className="text-content-primary">{formatCurrency(dcf.totalEquityInvested)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-content-tertiary">Total Returned</span>
            <span className="text-emerald-light">{formatCurrency(dcf.totalCashDistributed)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-content-tertiary">Appreciation</span>
            <span className="text-content-primary">{formatCurrency(dcf.totalAppreciation)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-content-tertiary">Debt Paydown</span>
            <span className="text-content-primary">{formatCurrency(dcf.totalDebtPaydown)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button className="btn-primary w-full">
          <Save className="w-4 h-4" />
          Save to Pipeline
        </button>
        <button className="btn-secondary w-full">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>
    </div>
  );
}
