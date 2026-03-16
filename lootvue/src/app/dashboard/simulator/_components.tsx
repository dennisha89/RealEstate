"use client";

import React, { useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle, XCircle, Save, FileText,
  BarChart3, Table2, Zap, Layers, Grid3X3,
  Printer, X, ChevronDown, Shield, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from "@/components/charts/ChartTheme";
import { useSimulatorStore, type SimulatorInputs } from "@/lib/stores/simulator-store";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import { runDCF, type DCFInput, type AnnualCashFlow } from "@/lib/engines/dcf-engine";
import { type MonteCarloResult } from "@/lib/engines/monte-carlo-engine";
import {
  calculateWaterfall, createStandardWaterfall,
} from "@/lib/engines/waterfall-engine";
import { StressTestChart } from "@/components/charts/StressTestChart";
import { runMultiVariableStressTest, type StressTestResult } from "@/lib/engines/stress-test-engine";

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

  // Compute fill percentage for the gold-filled active track
  const fillPct = Math.round(((value - min) / (max - min)) * 100);

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
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{
          background: `linear-gradient(to right, #C9A227 0%, #C9A227 ${fillPct}%, #252525 ${fillPct}%, #252525 100%)`,
        }}
        className="w-full h-1 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black/20
          [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(201,162,39,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gold
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
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
    loanPointsPct: s.loanPointsPct,
    pmiMonthly: s.pmiMonthly,
    downPaymentPct: s.downPaymentPct,
    monthlyRent: s.monthlyRent,
    annualRentGrowthPct: s.annualRentGrowthPct,
    otherIncome: s.otherIncome,
    laundryIncome: s.laundryIncome,
    parkingIncome: s.parkingIncome,
    leaseEscalationPct: s.leaseEscalationPct,
    rentConcessionMonths: s.rentConcessionMonths,
    vacancyPct: s.vacancyPct,
    propertyTaxRate: s.propertyTaxRate,
    insuranceAnnual: s.insuranceAnnual,
    managementPct: s.managementPct,
    maintenancePct: s.maintenancePct,
    capexReservePct: s.capexReservePct,
    hoaMonthly: s.hoaMonthly,
    utilitiesMonthly: s.utilitiesMonthly,
    legalAccountingAnnual: s.legalAccountingAnnual,
    advertisingAnnual: s.advertisingAnnual,
    annualExpenseGrowthPct: s.annualExpenseGrowthPct,
    annualAppreciationPct: s.annualAppreciationPct,
    holdPeriodYears: s.holdPeriodYears,
    exitCapRate: s.exitCapRate,
    sellingCostsPct: s.sellingCostsPct,
    capitalGainsTaxRatePct: s.capitalGainsTaxRatePct,
    depreciationYears: s.depreciationYears,
    costSegBonus: s.costSegBonus,
    use1031Exchange: s.use1031Exchange,
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

// ─── Depreciation Schedule Button Group ─────────────────────────────────────

function DepreciationSelector() {
  const depreciationYears = useSimulatorStore((s) => s.depreciationYears);
  const setValue = useSimulatorStore((s) => s.setValue);

  const options = [
    { label: "None", value: 0 },
    { label: "Residential (27.5yr)", value: 27.5 },
    { label: "Commercial (39yr)", value: 39 },
  ] as const;

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium">
        Depreciation Schedule
      </div>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setValue("depreciationYears", opt.value)}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors border ${
              depreciationYears === opt.value
                ? "bg-gold-muted text-gold-light border-gold/30"
                : "text-content-disabled hover:text-content-secondary border-surface-border"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 1031 Toggle ─────────────────────────────────────────────────────────────

function Exchange1031Toggle() {
  const use1031Exchange = useSimulatorStore((s) => s.use1031Exchange);
  const setValue = useSimulatorStore((s) => s.setValue);

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium">
          1031 Exchange
        </div>
        <div className="text-[10px] text-content-disabled mt-0.5">
          Defer capital gains tax on exit
        </div>
      </div>
      <button
        onClick={() => setValue("use1031Exchange", !use1031Exchange)}
        aria-label={use1031Exchange ? "Disable 1031 exchange" : "Enable 1031 exchange"}
        className={`relative w-10 h-5 rounded-full transition-colors border ${
          use1031Exchange
            ? "bg-emerald/20 border-emerald/40"
            : "bg-surface-muted border-surface-border"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            use1031Exchange
              ? "left-5 bg-emerald"
              : "left-0.5 bg-content-disabled"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Annual Depreciation Benefit (read-only computed display) ────────────────

function DepreciationBenefitDisplay() {
  const purchasePrice = useSimulatorStore((s) => s.purchasePrice);
  const depreciationYears = useSimulatorStore((s) => s.depreciationYears);
  const costSegBonus = useSimulatorStore((s) => s.costSegBonus);

  const annualDeduction =
    depreciationYears > 0 ? (purchasePrice * 0.8) / depreciationYears : 0;
  const year1Total = annualDeduction + costSegBonus;

  return (
    <div className="card-glass !p-3 space-y-1">
      <div className="text-[10px] text-content-disabled uppercase tracking-wider">
        Annual Depreciation Deduction
      </div>
      <div className="font-mono text-sm font-semibold text-gold-light tabular-nums">
        {formatCurrency(annualDeduction)}/yr
      </div>
      {costSegBonus > 0 && (
        <div className="text-[10px] text-emerald-light">
          Year 1 bonus: {formatCurrency(year1Total)} (incl. cost seg)
        </div>
      )}
      {depreciationYears === 0 && (
        <div className="text-[10px] text-content-disabled">
          No depreciation schedule selected
        </div>
      )}
    </div>
  );
}

// ─── Input Panel (Left) ─────────────────────────────────────────────────────

export function SimulatorInputPanel() {
  const [section, setSection] = useState<"acquisition" | "income" | "expenses" | "exit" | "tax">("acquisition");

  const sections = [
    { key: "acquisition" as const, label: "Acquisition" },
    { key: "income" as const, label: "Income" },
    { key: "expenses" as const, label: "Expenses" },
    { key: "exit" as const, label: "Exit" },
    { key: "tax" as const, label: "Tax & Strategy" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
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
            <SliderControl label="Loan Points" field="loanPointsPct" min={0} max={4} step={0.5} suffix="%" />
            <SliderControl label="PMI (if down &lt; 20%)" field="pmiMonthly" min={0} max={500} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
          </>
        )}
        {section === "income" && (
          <>
            <SliderControl label="Monthly Rent" field="monthlyRent" min={500} max={10_000} step={50} format={(v) => formatCurrency(v)} />
            <SliderControl label="Annual Rent Growth" field="annualRentGrowthPct" min={-3} max={10} step={0.5} suffix="%" />
            <SliderControl label="Vacancy Rate" field="vacancyPct" min={0} max={20} step={1} suffix="%" />
            <SliderControl label="Other Income" field="otherIncome" min={0} max={1_000} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
            <SliderControl label="Laundry Income" field="laundryIncome" min={0} max={500} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
            <SliderControl label="Parking Income" field="parkingIncome" min={0} max={500} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
            <SliderControl label="Lease Escalation" field="leaseEscalationPct" min={0} max={5} step={0.5} suffix="%" />
            <SliderControl label="Rent Concession" field="rentConcessionMonths" min={0} max={3} step={1} suffix=" mo" />
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
            <SliderControl label="HOA / Condo Fee" field="hoaMonthly" min={0} max={800} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
            <SliderControl label="Utilities (Landlord)" field="utilitiesMonthly" min={0} max={500} step={25} format={(v) => formatCurrency(v)} suffix="/mo" />
            <SliderControl label="Legal & Accounting" field="legalAccountingAnnual" min={0} max={5_000} step={250} format={(v) => formatCurrency(v)} suffix="/yr" />
            <SliderControl label="Advertising / Leasing" field="advertisingAnnual" min={0} max={3_000} step={250} format={(v) => formatCurrency(v)} suffix="/yr" />
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
        {section === "tax" && (
          <>
            <SliderControl label="Capital Gains Tax Rate" field="capitalGainsTaxRatePct" min={0} max={40} step={1} suffix="%" />
            <Exchange1031Toggle />
            <DepreciationSelector />
            <DepreciationBenefitDisplay />
            <SliderControl label="Cost Seg Bonus (Year 1)" field="costSegBonus" min={0} max={100_000} step={5_000} format={(v) => formatCurrency(v)} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Hold Period Quick Selector ──────────────────────────────────────────────

const HOLD_PRESETS = [3, 5, 7, 10, 15] as const;

function HoldPeriodSelector() {
  const holdPeriodYears = useSimulatorStore((s) => s.holdPeriodYears);
  const setValue = useSimulatorStore((s) => s.setValue);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-content-disabled uppercase tracking-wider mr-1 whitespace-nowrap">Hold:</span>
      {HOLD_PRESETS.map((yr) => (
        <button
          key={yr}
          onClick={() => setValue("holdPeriodYears", yr)}
          aria-label={`Set hold period to ${yr} years`}
          className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
            holdPeriodYears === yr
              ? "bg-gold-muted text-gold-light border border-gold/30"
              : "text-content-disabled hover:text-content-secondary border border-transparent hover:border-surface-border"
          }`}
        >
          {yr}yr
        </button>
      ))}
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
    { key: "stresstest" as const, label: "Stress Test", icon: Shield },
    { key: "waterfall" as const, label: "Waterfall", icon: Layers },
    { key: "sensitivity" as const, label: "Sensitivity", icon: Grid3X3 },
  ];

  const y1 = dcf.annualCashFlows[0];

  return (
    <div className="space-y-4">
      {/* Hold period quick selector */}
      <div className="flex items-center justify-end">
        <HoldPeriodSelector />
      </div>

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
        {activeTab === "stresstest" && <StressTestTab dcf={dcf} />}
        {activeTab === "waterfall" && <WaterfallTab dcf={dcf} />}
        {activeTab === "sensitivity" && <SensitivityTab dcf={dcf} />}
      </div>
    </div>
  );
}

// ─── Cash Flow Tab ───────────────────────────────────────────────────────────

interface CashFlowChartDatum {
  name: string;
  value: number;
}

interface CashFlowTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CashFlowTooltip({ active, payload, label }: CashFlowTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const v = entry.value;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>{label}</p>
      <p style={{ fontSize: 12, color: v >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
        {formatCurrency(v)}
      </p>
    </div>
  );
}

function CashFlowTab({ flows }: { flows: AnnualCashFlow[] }) {
  const chartData: CashFlowChartDatum[] = flows.map((f) => ({
    name: `Y${f.year}`,
    value: f.cashFlowBeforeTax,
  }));

  // Force Recharts to fully remount when the data shape or values change.
  // Recharts' internal reconciler sometimes reuses bar DOM nodes when only
  // values change (same array length, same keys), causing stale renders.
  // A stable key derived from the data signature guarantees a fresh mount.
  const chartKey = `cf-${flows.length}-${flows[0]?.cashFlowBeforeTax?.toFixed(0) ?? 0}-${flows[flows.length - 1]?.cashFlowBeforeTax?.toFixed(0) ?? 0}`;

  return (
    <div className="card">
      <div className="section-label flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
        Annual Cash Flow Projection
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart key={chartKey} data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" {...AXIS_STYLE} />
          <YAxis
            tickFormatter={(v: number) => formatCompact(v)}
            {...AXIS_STYLE}
            width={60}
          />
          <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke={CHART_COLORS.border} strokeWidth={1} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose}
                fillOpacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary row */}
      <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
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
        {exit.capitalGainsTax > 0 && (
          <div className="col-span-2 sm:col-span-4 pt-2 border-t border-surface-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-content-tertiary">Capital Gains Tax</span>
              <span className="font-mono font-semibold text-rose-light">({formatCurrency(exit.capitalGainsTax)})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Monte Carlo Tab ────────────────────────────────────────────────────────

interface HistogramDatum {
  label: string;
  count: number;
  percentage: number;
  rangeStart: number;
  rangeEnd: number;
}

interface HistogramTooltipProps {
  active?: boolean;
  payload?: { payload: HistogramDatum }[];
}

function HistogramTooltip({ active, payload }: HistogramTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const d = entry.payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {d.rangeStart.toFixed(1)}% — {d.rangeEnd.toFixed(1)}%
      </p>
      <p style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
        {d.count.toLocaleString()} simulations
      </p>
      <p style={{ fontSize: 11, color: CHART_COLORS.textSecondary, fontFamily: "JetBrains Mono, monospace" }}>
        {d.percentage.toFixed(1)}% of runs
      </p>
    </div>
  );
}

function bucketColor(rangeStart: number, rangeEnd: number): string {
  if (rangeEnd <= 0) return CHART_COLORS.rose;
  if (rangeStart >= 12) return CHART_COLORS.emerald;
  return CHART_COLORS.amber;
}

function MonteCarloTab({ mc }: { mc: MonteCarloResult }) {
  const histogramData: HistogramDatum[] = mc.irrHistogram.map((bucket) => ({
    label: `${bucket.rangeStart.toFixed(0)}%`,
    count: bucket.count,
    percentage: bucket.percentage,
    rangeStart: bucket.rangeStart,
    rangeEnd: bucket.rangeEnd,
  }));

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

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={histogramData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="label" {...AXIS_STYLE} interval="preserveStartEnd" />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              {...AXIS_STYLE}
              width={36}
            />
            <Tooltip content={<HistogramTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            {/* P10, P50, P90 reference lines */}
            <ReferenceLine
              x={`${Math.round(mc.irr.p10)}%`}
              stroke={CHART_COLORS.rose}
              strokeDasharray="3 3"
              label={{ value: "P10", position: "insideTopRight", fill: CHART_COLORS.rose, fontSize: 9 }}
            />
            <ReferenceLine
              x={`${Math.round(mc.irr.median)}%`}
              stroke={CHART_COLORS.gold}
              strokeDasharray="3 3"
              label={{ value: "P50", position: "insideTopRight", fill: CHART_COLORS.gold, fontSize: 9 }}
            />
            <ReferenceLine
              x={`${Math.round(mc.irr.p90)}%`}
              stroke={CHART_COLORS.emerald}
              strokeDasharray="3 3"
              label={{ value: "P90", position: "insideTopRight", fill: CHART_COLORS.emerald, fontSize: 9 }}
            />
            <Bar dataKey="percentage" radius={[2, 2, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={bucketColor(entry.rangeStart, entry.rangeEnd)}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex justify-between mt-1.5 text-[9px] font-mono text-content-disabled">
          <span className="text-rose-light">P10: {mc.irr.p10.toFixed(1)}%</span>
          <span className="text-gold-light">P50: {mc.irr.median.toFixed(1)}%</span>
          <span className="text-emerald-light">P90: {mc.irr.p90.toFixed(1)}%</span>
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

// ─── Stress Test Tab ────────────────────────────────────────────────────────

function buildStressInput(dcf: ReturnType<typeof runDCF>, s: SimulatorInputs) {
  const loanAmount = s.purchasePrice * (1 - s.downPaymentPct / 100);
  const downPayment = s.purchasePrice * (s.downPaymentPct / 100);
  const y1 = dcf.annualCashFlows[0];
  // Y1 operatingExpenses already includes all opex; subtract insurance to isolate
  // non-insurance monthly expenses (stress engine applies insurance change separately)
  const monthlyInsurance = s.insuranceAnnual / 12;
  const monthlyExpenses = y1
    ? Math.max(0, (y1.operatingExpenses - s.insuranceAnnual) / 12)
    : Math.max(0,
        (s.purchasePrice * (s.propertyTaxRate / 100 + s.maintenancePct / 100 + s.capexReservePct / 100)) / 12 +
        s.monthlyRent * (s.managementPct / 100),
      );

  return {
    monthlyRent: s.monthlyRent,
    vacancy: s.vacancyPct,
    mortgageRate: s.interestRate,
    loanAmount,
    monthlyExpenses,
    propertyValue: s.purchasePrice,
    monthlyInsurance,
    downPayment,
    totalCashInvested: dcf.totalEquityInvested,
  };
}

function StressTestTab({ dcf }: { dcf: ReturnType<typeof runDCF> }) {
  const s = useSimulatorStore();

  const stressResult: StressTestResult | null = useMemo(() => {
    try {
      const input = buildStressInput(dcf, s);
      return runMultiVariableStressTest(input);
    } catch {
      return null;
    }
  }, [dcf, s]);

  if (!stressResult) {
    return (
      <div className="card text-center py-8 text-content-tertiary text-sm">
        <Shield className="w-8 h-8 opacity-30 mx-auto mb-2" aria-hidden="true" />
        Unable to compute stress scenarios.
      </div>
    );
  }

  const y1 = dcf.annualCashFlows[0];
  const baselineCashFlow = y1 ? Math.round(y1.cashFlowBeforeTax / 12) : 0;
  const baselineDscr = y1?.dscr ?? 1.0;

  return (
    <div className="card">
      <div className="section-label flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-amber" />
        Multi-Variable Stress Scenarios
      </div>
      <StressTestChart
        scenarios={stressResult.scenarios}
        baselineCashFlow={baselineCashFlow}
        baselineDscr={baselineDscr}
        resilience={stressResult.resilience}
        breakEvenVacancy={undefined}
        breakEvenRate={undefined}
        survivalCount={stressResult.scenarios.filter((sc) => sc.survives).length}
        summary={stressResult.thesis}
        height={260}
      />
    </div>
  );
}

// ─── Scenario Comparison Strip ───────────────────────────────────────────────

interface ScenarioBand {
  label: string;
  irrMod: number;  // additive pp change from base
  capRateMod: number;
  rentMod: number;
  color: string;
  textColor: string;
  borderColor: string;
}

const SCENARIO_BANDS: ScenarioBand[] = [
  { label: "Bull",  irrMod: +5, capRateMod: -1, rentMod: +8,  color: "bg-emerald/10", textColor: "text-emerald-light", borderColor: "border-emerald/20" },
  { label: "Base",  irrMod:  0, capRateMod:  0, rentMod:  0,  color: "bg-gold/5",     textColor: "text-gold-light",    borderColor: "border-gold/20" },
  { label: "Bear",  irrMod: -6, capRateMod: +2, rentMod: -8,  color: "bg-rose/10",    textColor: "text-rose-light",    borderColor: "border-rose/20" },
];

function scenarioIcon(label: string) {
  if (label === "Bull") return <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />;
  if (label === "Bear") return <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />;
  return <Minus className="w-3.5 h-3.5" aria-hidden="true" />;
}

export function ScenarioComparisonStrip({ dcf }: { dcf: ReturnType<typeof runDCF> }) {
  const baseIRR = isNaN(dcf.leveredIRR) ? 0 : dcf.leveredIRR;
  const y1 = dcf.annualCashFlows[0];
  const baseCoC = y1?.cashOnCash ?? 0;

  return (
    <div className="card-glass">
      <div className="section-label mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        Scenario Comparison
      </div>
      <div
        className="grid grid-cols-3 gap-2"
        role="list"
        aria-label="Bull, base, and bear case scenario comparison"
      >
        {SCENARIO_BANDS.map((sc) => {
          const irr = baseIRR + sc.irrMod;
          const coc = baseCoC + sc.irrMod * 0.4;
          const isBase = sc.label === "Base";
          return (
            <div
              key={sc.label}
              role="listitem"
              aria-label={`${sc.label} case: IRR ${irr.toFixed(1)}%`}
              className={`rounded-xl p-3 border ${sc.color} ${sc.borderColor} ${isBase ? "ring-1 ring-gold/30" : ""}`}
            >
              <div className={`flex items-center gap-1.5 mb-2 ${sc.textColor}`}>
                {scenarioIcon(sc.label)}
                <span className="text-[10px] font-bold uppercase tracking-wider">{sc.label}</span>
              </div>
              <div className={`font-mono text-lg font-bold tabular-nums ${sc.textColor}`}>
                {irr.toFixed(1)}%
              </div>
              <div className="text-[10px] text-content-disabled mt-0.5">Levered IRR</div>
              <div className={`font-mono text-xs font-semibold tabular-nums mt-1.5 ${coc >= 0 ? "text-content-secondary" : "text-rose-light"}`}>
                CoC: {coc.toFixed(1)}%
              </div>
              <div className="text-[9px] text-content-disabled mt-0.5">
                {sc.irrMod > 0 ? `Rent +${sc.rentMod}%, cap −${Math.abs(sc.capRateMod)}%` :
                 sc.irrMod < 0 ? `Rent ${sc.rentMod}%, cap +${sc.capRateMod}%` :
                 "Base assumptions"}
              </div>
            </div>
          );
        })}
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

type SensOutputMetric = "irr" | "npv" | "coc" | "dscr" | "em";
type SensRange = "narrow" | "default" | "wide";

interface VarConfig {
  field: keyof DCFInput;
  label: string;
  baseValue: (s: SimulatorInputs) => number;
  format: (v: number) => string;
  /** When this var changes, also update loanAmount via downPaymentPct */
  updateLoan?: boolean;
}

const VAR_MAP: Record<string, VarConfig> = {
  exitCapRate: {
    field: "exitCapRate",
    label: "Exit Cap Rate",
    baseValue: (s) => s.exitCapRate,
    format: (v) => `${v.toFixed(2)}%`,
  },
  interestRate: {
    field: "interestRate",
    label: "Interest Rate",
    baseValue: (s) => s.interestRate,
    format: (v) => `${v.toFixed(2)}%`,
  },
  vacancyPct: {
    field: "vacancyPct",
    label: "Vacancy %",
    baseValue: (s) => s.vacancyPct,
    format: (v) => `${v.toFixed(1)}%`,
  },
  annualRentGrowthPct: {
    field: "annualRentGrowthPct",
    label: "Rent Growth",
    baseValue: (s) => s.annualRentGrowthPct,
    format: (v) => `${v.toFixed(1)}%`,
  },
  annualAppreciationPct: {
    field: "annualAppreciationPct",
    label: "Appreciation",
    baseValue: (s) => s.annualAppreciationPct,
    format: (v) => `${v.toFixed(1)}%`,
  },
  managementPct: {
    field: "managementPct",
    label: "Management %",
    baseValue: (s) => s.managementPct,
    format: (v) => `${v.toFixed(1)}%`,
  },
  holdPeriodYears: {
    field: "holdPeriodYears",
    label: "Hold Period",
    baseValue: (s) => s.holdPeriodYears,
    format: (v) => `${v}yr`,
  },
  purchasePrice: {
    field: "purchasePrice",
    label: "Purchase Price",
    baseValue: (s) => s.purchasePrice,
    format: (v) => formatCompact(v),
    updateLoan: true,
  },
};

const RANGE_MULTIPLIER: Record<SensRange, number> = {
  narrow: 0.5,
  default: 1.0,
  wide: 2.0,
};

const OUTPUT_LABELS: Record<SensOutputMetric, string> = {
  irr: "IRR (Levered)",
  npv: "NPV",
  coc: "Cash-on-Cash Y1",
  dscr: "DSCR Y1",
  em: "Equity Multiple",
};

/** Generate 5 evenly-spaced values centred on base, width = ±range */
function makeSteps(base: number, range: number): number[] {
  const step = range / 2;
  return [base - range, base - step, base, base + step, base + range];
}

/** Extract the selected output metric from a DCF result */
function extractMetric(result: ReturnType<typeof runDCF>, metric: SensOutputMetric): number {
  switch (metric) {
    case "irr":  return result.leveredIRR;
    case "npv":  return result.netPresentValue;
    case "coc":  return result.annualCashFlows[0]?.cashOnCash ?? NaN;
    case "dscr": return result.annualCashFlows[0]?.dscr ?? NaN;
    case "em":   return result.equityMultiple;
  }
}

/** Format a cell value based on the selected output metric */
function formatCellValue(v: number, metric: SensOutputMetric): string {
  if (isNaN(v) || !isFinite(v)) return "N/A";
  switch (metric) {
    case "irr":  return `${v.toFixed(1)}%`;
    case "npv":  return formatCompact(v);
    case "coc":  return `${v.toFixed(1)}%`;
    case "dscr": return `${v.toFixed(2)}x`;
    case "em":   return `${v.toFixed(2)}x`;
  }
}

/** Interpolate background + text colour based on position 0→1 across the value range */
function gradientCellStyle(
  value: number,
  min: number,
  max: number,
  metric: SensOutputMetric,
): React.CSSProperties {
  if (isNaN(value) || !isFinite(value)) return {};
  const range = max - min;
  if (range === 0) return {};

  // For DSCR / EM higher is better; for NPV higher is better; for all others higher is better.
  // Special case: vacancy — lower is "better" but we don't special-case here; the position
  // in the grid row header already conveys direction. Color always maps higher value → green.
  const pos = Math.max(0, Math.min(1, (value - min) / range));

  // Interpolate: 0 = rose, 0.5 = amber, 1 = emerald
  let r: number, g: number, b: number;
  if (pos < 0.5) {
    const t = pos * 2; // 0→1 from rose to amber
    r = Math.round(239 + t * (245 - 239)); // rose 239 → amber 245
    g = Math.round(68  + t * (158 - 68));  // rose 68  → amber 158
    b = Math.round(68  + t * (11  - 68));  // rose 68  → amber 11
  } else {
    const t = (pos - 0.5) * 2; // 0→1 from amber to emerald
    r = Math.round(245 + t * (16  - 245)); // amber 245 → emerald 16
    g = Math.round(158 + t * (185 - 158)); // amber 158 → emerald 185
    b = Math.round(11  + t * (129 - 11));  // amber 11  → emerald 129
  }

  const bgOpacity = 0.08 + pos * 0.14; // 0.08 → 0.22
  const textColor = pos >= 0.6 ? `rgb(52,211,153)` : pos >= 0.35 ? `rgb(251,191,36)` : `rgb(248,113,113)`;

  // For NPV the magnitude matters more — just clamp display
  void metric;

  return {
    backgroundColor: `rgba(${r},${g},${b},${bgOpacity})`,
    color: textColor,
  };
}

function SensitivityTab({ dcf: _dcf }: { dcf: ReturnType<typeof runDCF> }) {
  const storeState = useSimulatorStore();
  const dcfInput = useMemo(() => buildDCFInput(storeState), [storeState]);

  const [rowVarKey, setRowVarKey] = useState<string>("exitCapRate");
  const [colVarKey, setColVarKey] = useState<string>("annualRentGrowthPct");
  const [outputMetric, setOutputMetric] = useState<SensOutputMetric>("irr");
  const [range, setRange] = useState<SensRange>("default");

  const rowConfig = VAR_MAP[rowVarKey]!;
  const colConfig = VAR_MAP[colVarKey]!;

  const rowBase = rowConfig.baseValue(storeState);
  const colBase = colConfig.baseValue(storeState);

  const rangeMult = RANGE_MULTIPLIER[range];

  const rowValues = useMemo(() => {
    if (rowVarKey === "holdPeriodYears") {
      const base = Math.round(rowBase);
      const steps = Math.round(2 * rangeMult);
      return Array.from({ length: 5 }, (_, i) => Math.max(1, base - steps * 2 + i * steps));
    }
    if (rowVarKey === "purchasePrice") {
      const step = rowBase * 0.05 * rangeMult;
      return Array.from({ length: 5 }, (_, i) => Math.round(rowBase - step * 2 + i * step));
    }
    return makeSteps(rowBase, rangeMult);
  }, [rowVarKey, rowBase, rangeMult]);

  const colValues = useMemo(() => {
    if (colVarKey === "holdPeriodYears") {
      const base = Math.round(colBase);
      const steps = Math.round(2 * rangeMult);
      return Array.from({ length: 5 }, (_, i) => Math.max(1, base - steps * 2 + i * steps));
    }
    if (colVarKey === "purchasePrice") {
      const step = colBase * 0.05 * rangeMult;
      return Array.from({ length: 5 }, (_, i) => Math.round(colBase - step * 2 + i * step));
    }
    return makeSteps(colBase, rangeMult);
  }, [colVarKey, colBase, rangeMult]);

  const { grid, baseRowIdx, baseColIdx } = useMemo(() => {
    const baseRowIdx = 2;
    const baseColIdx = 2;
    const grid: number[][] = [];

    for (const rv of rowValues) {
      const row: number[] = [];
      for (const cv of colValues) {
        try {
          const patch: Partial<DCFInput> = {
            [rowConfig.field]: rv,
            [colConfig.field]: cv,
          };
          // When purchasePrice changes, recompute loanAmount from downPaymentPct
          if (rowConfig.updateLoan) {
            patch.loanAmount = rv * (1 - storeState.downPaymentPct / 100);
          }
          if (colConfig.updateLoan) {
            patch.loanAmount = cv * (1 - storeState.downPaymentPct / 100);
          }
          const result = runDCF({ ...dcfInput, ...patch });
          row.push(extractMetric(result, outputMetric));
        } catch {
          row.push(NaN);
        }
      }
      grid.push(row);
    }

    return { grid, baseRowIdx, baseColIdx };
  }, [rowValues, colValues, rowConfig, colConfig, dcfInput, outputMetric, storeState.downPaymentPct]);

  // Compute min/max across the full grid for gradient scaling
  const { gridMin, gridMax } = useMemo(() => {
    const flat = grid.flat().filter((v) => !isNaN(v) && isFinite(v));
    return { gridMin: Math.min(...flat), gridMax: Math.max(...flat) };
  }, [grid]);

  // Prevent selecting same variable on both axes
  const availableForCol = Object.keys(VAR_MAP).filter((k) => k !== rowVarKey);
  const availableForRow = Object.keys(VAR_MAP).filter((k) => k !== colVarKey);

  const selectClass =
    "bg-surface-secondary border border-surface-border rounded-md px-2.5 py-1.5 text-[11px] text-content-secondary " +
    "focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/40 cursor-pointer";

  return (
    <div className="card space-y-4">
      {/* ── Controls Row ── */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Row Variable */}
        <div className="space-y-1">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Row Variable</div>
          <select
            value={rowVarKey}
            onChange={(e) => setRowVarKey(e.target.value)}
            className={selectClass}
            aria-label="Select row variable for sensitivity analysis"
          >
            {availableForRow.map((k) => (
              <option key={k} value={k}>{VAR_MAP[k]!.label}</option>
            ))}
          </select>
        </div>

        {/* Col Variable */}
        <div className="space-y-1">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Column Variable</div>
          <select
            value={colVarKey}
            onChange={(e) => setColVarKey(e.target.value)}
            className={selectClass}
            aria-label="Select column variable for sensitivity analysis"
          >
            {availableForCol.map((k) => (
              <option key={k} value={k}>{VAR_MAP[k]!.label}</option>
            ))}
          </select>
        </div>

        {/* Output Metric */}
        <div className="space-y-1">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Output Metric</div>
          <div className="flex gap-1">
            {(["irr", "npv", "coc", "dscr", "em"] as SensOutputMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => setOutputMetric(m)}
                aria-pressed={outputMetric === m}
                className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors border ${
                  outputMetric === m
                    ? "bg-gold-muted text-gold-light border-gold/30"
                    : "text-content-disabled hover:text-content-secondary border-surface-border"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Range */}
        <div className="space-y-1">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Range</div>
          <div className="flex gap-1">
            {(["narrow", "default", "wide"] as SensRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`px-2.5 py-1 rounded text-[10px] font-medium capitalize transition-colors border ${
                  range === r
                    ? "bg-gold-muted text-gold-light border-gold/30"
                    : "text-content-disabled hover:text-content-secondary border-surface-border"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Heatmap Table ── */}
      <div className="overflow-x-auto">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          {rowConfig.label} (rows) vs {colConfig.label} (cols) → {OUTPUT_LABELS[outputMetric]}
        </div>

        <table className="w-full text-[11px] font-mono border-separate border-spacing-0.5">
          <thead>
            <tr>
              <th className="text-left pb-1.5 pr-2 text-[10px] text-content-disabled uppercase tracking-wider whitespace-nowrap">
                {rowConfig.label.slice(0, 8)} \ {colConfig.label.slice(0, 8)}
              </th>
              {colValues.map((cv, ci) => (
                <th
                  key={ci}
                  className={`text-center pb-1.5 px-1.5 text-[10px] uppercase tracking-wider whitespace-nowrap ${
                    ci === baseColIdx ? "text-gold-light" : "text-content-disabled"
                  }`}
                >
                  {colConfig.format(cv)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowValues.map((rv, ri) => (
              <tr key={ri}>
                <td
                  className={`py-1 pr-2 font-semibold whitespace-nowrap ${
                    ri === baseRowIdx ? "text-gold-light" : "text-content-primary"
                  }`}
                >
                  {rowConfig.format(rv)}
                </td>
                {(grid[ri] ?? []).map((val, ci) => {
                  const isBase = ri === baseRowIdx && ci === baseColIdx;
                  const cellStyle = gradientCellStyle(val, gridMin, gridMax, outputMetric);
                  return (
                    <td
                      key={ci}
                      style={cellStyle}
                      className={`py-1.5 px-2 text-center font-semibold rounded tabular-nums transition-colors ${
                        isBase ? "ring-1 ring-gold/50" : ""
                      } ${isNaN(val) ? "text-content-disabled" : ""}`}
                      title={
                        isBase
                          ? `Base case: ${rowConfig.label}=${rowConfig.format(rv)}, ${colConfig.label}=${colConfig.format(colValues[ci]!)}`
                          : undefined
                      }
                    >
                      {formatCellValue(val, outputMetric)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 pt-1 border-t border-surface-border">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(16,185,129,0.22)" }} />
          <span className="text-[10px] text-content-tertiary">Best</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(245,158,11,0.12)" }} />
          <span className="text-[10px] text-content-tertiary">Mid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.12)" }} />
          <span className="text-[10px] text-content-tertiary">Worst</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-3 h-3 rounded-sm ring-1 ring-gold/50" />
          <span className="text-[10px] text-content-tertiary">Base case</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scorecard Panel (Right) ────────────────────────────────────────────────

interface ScorecardPanelProps {
  dcf: ReturnType<typeof runDCF>;
  mc: MonteCarloResult | null;
  showReport: boolean;
  setShowReport: (v: boolean) => void;
}

export function SimulatorScorecardPanel({ dcf, mc, showReport, setShowReport }: ScorecardPanelProps) {

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
        <button
          className="btn-secondary w-full"
          onClick={() => setShowReport(!showReport)}
          aria-expanded={showReport}
          aria-label={showReport ? "Close investment report" : "Generate investment report"}
        >
          {showReport ? (
            <>
              <X className="w-4 h-4" />
              Close Report
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Report
            </>
          )}
          {!showReport && <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-50" />}
        </button>
      </div>
    </div>
  );
}

// ─── Investment Report ───────────────────────────────────────────────────────

interface InvestmentReportProps {
  dcf: ReturnType<typeof runDCF>;
  mc: MonteCarloResult | null;
  inputs: SimulatorInputs;
  onClose: () => void;
}

function ReportRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
      <span className="text-[12px] text-content-tertiary">{label}</span>
      <span className={`font-mono text-[12px] font-semibold tabular-nums ${valueClass ?? "text-content-primary"}`}>
        {value}
      </span>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-content-disabled mb-3 pb-1.5 border-b border-surface-border">
        {title}
      </div>
      {children}
    </div>
  );
}

export function InvestmentReport({ dcf, mc, inputs, onClose }: InvestmentReportProps) {
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const y1 = dcf.annualCashFlows[0];
  const loanAmount = inputs.purchasePrice * (1 - inputs.downPaymentPct / 100);
  const downPaymentAmt = inputs.purchasePrice * (inputs.downPaymentPct / 100);

  const score = (() => {
    let s = 50;
    if (dcf.leveredIRR >= 20) s += 20;
    else if (dcf.leveredIRR >= 12) s += 10;
    else if (dcf.leveredIRR < 0) s -= 20;
    if (dcf.equityMultiple >= 2.5) s += 10;
    else if (dcf.equityMultiple >= 2) s += 5;
    else if (dcf.equityMultiple < 1) s -= 15;
    if (y1 && y1.dscr >= 1.5) s += 10;
    else if (y1 && y1.dscr >= 1.25) s += 5;
    else if (y1 && y1.dscr < 1) s -= 10;
    if (dcf.netPresentValue > 0) s += 10;
    else s -= 5;
    if (mc && mc.probabilityOfPositiveReturn >= 90) s += 5;
    else if (mc && mc.probabilityOfPositiveReturn < 60) s -= 5;
    return Math.max(0, Math.min(100, s));
  })();

  const verdict = score >= 75 ? "STRONG BUY" : score >= 60 ? "BUY" : score >= 45 ? "HOLD" : "PASS";
  const verdictColor =
    score >= 75 ? "text-emerald-light" :
    score >= 60 ? "text-emerald-light" :
    score >= 45 ? "text-amber-light" :
    "text-rose-light";
  const verdictBorder =
    score >= 60 ? "border-emerald/30 bg-emerald/[0.06]" :
    score >= 45 ? "border-amber/30 bg-amber/[0.06]" :
    "border-rose/30 bg-rose/[0.06]";

  const checks = [
    { label: "Positive cash flow Y1", pass: (y1?.cashFlowBeforeTax ?? 0) > 0 },
    { label: "DSCR ≥ 1.25x", pass: (y1?.dscr ?? 0) >= 1.25 },
    { label: "IRR ≥ 12%", pass: dcf.leveredIRR >= 12 },
    { label: "Equity Multiple ≥ 2.0x", pass: dcf.equityMultiple >= 2 },
    { label: "NPV positive (8% hurdle)", pass: dcf.netPresentValue > 0 },
    { label: "Debt yield ≥ 8%", pass: dcf.debtYield >= 8 },
  ];
  const passing = checks.filter((c) => c.pass).length;

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="mt-6 rounded-xl border border-surface-border bg-surface-card overflow-hidden print:rounded-none print:border-0"
      id="investment-report"
      aria-label="Investment memo report"
    >
      {/* Report header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-elevated print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-gold" aria-hidden="true" />
          <span className="text-sm font-semibold text-content-primary">Investment Memo</span>
          <span className="badge-gold text-[10px]">AI Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn-ghost text-xs"
            aria-label="Print this report"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
          <button
            onClick={onClose}
            className="btn-ghost text-xs"
            aria-label="Close report"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* Report body — two-column on large screens */}
      <div className="p-6 sm:p-8">

        {/* Memo masthead */}
        <div className="mb-8 pb-6 border-b border-surface-border">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.2em] mb-1">Investment Memo</div>
          <h2 className="text-xl font-bold text-content-primary font-display mb-1">
            Deal Analysis Report
          </h2>
          <div className="text-[12px] text-content-tertiary">
            Generated by LootVue Deal Simulator &middot; {generatedDate}
          </div>

          {/* Verdict banner */}
          <div className={`mt-5 inline-flex items-center gap-4 px-5 py-3 rounded-lg border ${verdictBorder}`}>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-content-disabled mb-0.5">Verdict</div>
              <div className={`text-2xl font-black font-mono tracking-tight ${verdictColor}`}>{verdict}</div>
            </div>
            <div className="w-px h-10 bg-surface-border" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-content-disabled mb-0.5">Score</div>
              <div className="text-2xl font-black font-mono text-content-primary">{score}<span className="text-sm font-normal text-content-disabled">/100</span></div>
            </div>
            <div className="w-px h-10 bg-surface-border" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-content-disabled mb-0.5">Criteria</div>
              <div className="text-2xl font-black font-mono text-content-primary">{passing}<span className="text-sm font-normal text-content-disabled">/{checks.length} pass</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left column */}
          <div>
            <ReportSection title="Deal Summary">
              <ReportRow label="Purchase Price" value={formatCurrency(inputs.purchasePrice)} />
              <ReportRow
                label={`Down Payment (${inputs.downPaymentPct}%)`}
                value={formatCurrency(downPaymentAmt)}
              />
              <ReportRow
                label={`Loan Amount @ ${inputs.interestRate}%`}
                value={formatCurrency(loanAmount)}
              />
              <ReportRow label="Loan Term" value={`${inputs.loanTermYears} years`} />
              <ReportRow label="Hold Period" value={`${inputs.holdPeriodYears} years`} />
              <ReportRow label="Exit Cap Rate" value={`${inputs.exitCapRate.toFixed(2)}%`} />
              <ReportRow label="Monthly Rent" value={formatCurrency(inputs.monthlyRent)} />
              <ReportRow
                label={`Total Equity Invested`}
                value={formatCurrency(dcf.totalEquityInvested)}
                valueClass="text-gold-light"
              />
            </ReportSection>

            <ReportSection title="Key Return Metrics">
              <ReportRow
                label="Levered IRR"
                value={isNaN(dcf.leveredIRR) ? "N/A" : `${dcf.leveredIRR.toFixed(1)}%`}
                valueClass={dcf.leveredIRR >= 12 ? "text-emerald-light" : dcf.leveredIRR < 0 ? "text-rose-light" : "text-amber-light"}
              />
              <ReportRow
                label="Unlevered IRR"
                value={isNaN(dcf.unleveredIRR) ? "N/A" : `${dcf.unleveredIRR.toFixed(1)}%`}
                valueClass="text-content-secondary"
              />
              <ReportRow
                label="Equity Multiple"
                value={`${dcf.equityMultiple.toFixed(2)}x`}
                valueClass={dcf.equityMultiple >= 2 ? "text-emerald-light" : dcf.equityMultiple < 1 ? "text-rose-light" : "text-amber-light"}
              />
              <ReportRow
                label="NPV (8% discount)"
                value={formatCurrency(dcf.netPresentValue)}
                valueClass={dcf.netPresentValue > 0 ? "text-emerald-light" : "text-rose-light"}
              />
              <ReportRow
                label="Year 1 Cash Flow"
                value={formatCurrency(y1?.cashFlowBeforeTax ?? 0)}
                valueClass={(y1?.cashFlowBeforeTax ?? 0) > 0 ? "text-emerald-light" : "text-rose-light"}
              />
              <ReportRow
                label="Year 1 Cash-on-Cash"
                value={`${y1?.cashOnCash?.toFixed(1) ?? "0.0"}%`}
                valueClass={(y1?.cashOnCash ?? 0) > 0 ? "text-emerald-light" : "text-rose-light"}
              />
              <ReportRow
                label="DSCR (Year 1)"
                value={`${y1?.dscr?.toFixed(2) ?? "0.00"}x`}
                valueClass={(y1?.dscr ?? 0) >= 1.25 ? "text-emerald-light" : (y1?.dscr ?? 0) >= 1 ? "text-amber-light" : "text-rose-light"}
              />
              <ReportRow
                label="Debt Yield"
                value={`${dcf.debtYield.toFixed(1)}%`}
                valueClass={dcf.debtYield >= 8 ? "text-emerald-light" : "text-amber-light"}
              />
              <ReportRow
                label="Break-even"
                value={dcf.breakEvenMonth ? `${dcf.breakEvenMonth} months` : "Not within hold period"}
                valueClass={dcf.breakEvenMonth ? "text-content-primary" : "text-rose-light"}
              />
            </ReportSection>

            <ReportSection title="Wealth Creation">
              <ReportRow label="Total Cash Distributed" value={formatCurrency(dcf.totalCashDistributed)} valueClass="text-emerald-light" />
              <ReportRow label="Total Appreciation" value={formatCurrency(dcf.totalAppreciation)} />
              <ReportRow label="Total Debt Paydown" value={formatCurrency(dcf.totalDebtPaydown)} />
              <ReportRow
                label="Exit Sale Price"
                value={formatCurrency(dcf.exitAnalysis.salePrice)}
                valueClass="text-gold-light"
              />
              <ReportRow
                label="Net Proceeds from Sale"
                value={formatCurrency(dcf.exitAnalysis.netProceedsFromSale)}
                valueClass="text-emerald-light"
              />
              <ReportRow
                label="Total Profit"
                value={formatCurrency(dcf.exitAnalysis.totalProfit)}
                valueClass={dcf.exitAnalysis.totalProfit >= 0 ? "text-emerald-light" : "text-rose-light"}
              />
            </ReportSection>

            {/* Investment Checklist */}
            <ReportSection title="Investment Checklist">
              <div className="space-y-2">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2.5">
                    {c.pass
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-light shrink-0" aria-hidden="true" />
                      : <XCircle className="w-3.5 h-3.5 text-rose-light shrink-0" aria-hidden="true" />}
                    <span
                      className={`text-[12px] ${c.pass ? "text-content-secondary" : "text-content-tertiary"}`}
                      aria-label={`${c.label}: ${c.pass ? "pass" : "fail"}`}
                    >
                      {c.label}
                    </span>
                    <span className={`ml-auto text-[10px] font-mono font-bold ${c.pass ? "text-emerald-light" : "text-rose-light"}`}>
                      {c.pass ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            </ReportSection>
          </div>

          {/* Right column */}
          <div>

            {/* Annual Pro Forma */}
            <ReportSection title="Annual Pro Forma">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono" aria-label="Annual pro forma table">
                  <thead>
                    <tr className="text-[10px] text-content-disabled uppercase tracking-wider">
                      <th className="text-left font-medium pb-2 pr-2">Yr</th>
                      <th className="text-right font-medium pb-2 px-1.5">NOI</th>
                      <th className="text-right font-medium pb-2 px-1.5">Cash Flow</th>
                      <th className="text-right font-medium pb-2 px-1.5">CoC%</th>
                      <th className="text-right font-medium pb-2 px-1.5">DSCR</th>
                      <th className="text-right font-medium pb-2 pl-1.5">Equity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {dcf.annualCashFlows.map((f) => (
                      <tr key={f.year} className="hover:bg-white/[0.02]">
                        <td className="py-1.5 pr-2 text-content-primary font-semibold">{f.year}</td>
                        <td className="py-1.5 px-1.5 text-right text-content-secondary">{formatCompact(f.netOperatingIncome)}</td>
                        <td className={`py-1.5 px-1.5 text-right font-semibold ${f.cashFlowBeforeTax >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                          {formatCompact(f.cashFlowBeforeTax)}
                        </td>
                        <td className={`py-1.5 px-1.5 text-right ${f.cashOnCash >= 0 ? "text-content-secondary" : "text-rose-light"}`}>
                          {f.cashOnCash.toFixed(1)}%
                        </td>
                        <td className={`py-1.5 px-1.5 text-right ${f.dscr >= 1.25 ? "text-emerald-light" : f.dscr >= 1 ? "text-amber-light" : "text-rose-light"}`}>
                          {f.dscr.toFixed(2)}x
                        </td>
                        <td className="py-1.5 pl-1.5 text-right text-gold-light">{formatCompact(f.equity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>

            {/* Monte Carlo Results */}
            {mc ? (
              <ReportSection title="Monte Carlo Results">
                <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border mb-3">
                  <div className="text-[10px] text-content-disabled mb-2">
                    {mc.numSimulations.toLocaleString()} simulations &middot; Cholesky-correlated variables
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <ReportRow
                      label="P(Positive Return)"
                      value={`${mc.probabilityOfPositiveReturn.toFixed(0)}%`}
                      valueClass={mc.probabilityOfPositiveReturn >= 80 ? "text-emerald-light" : "text-amber-light"}
                    />
                    <ReportRow
                      label="P(IRR > 12%)"
                      value={`${mc.probabilityOfTargetIRR.toFixed(0)}%`}
                      valueClass={mc.probabilityOfTargetIRR >= 50 ? "text-emerald-light" : "text-amber-light"}
                    />
                  </div>
                </div>
                <ReportRow
                  label="Median IRR (P50)"
                  value={`${mc.irr.median.toFixed(1)}%`}
                  valueClass="text-gold-light"
                />
                <ReportRow
                  label="IRR Range (P10 — P90)"
                  value={`${mc.irr.p10.toFixed(1)}% — ${mc.irr.p90.toFixed(1)}%`}
                  valueClass="text-content-secondary"
                />
                <ReportRow
                  label="Median Equity Multiple"
                  value={`${mc.equityMultiple.median.toFixed(2)}x`}
                  valueClass="text-content-secondary"
                />
                <ReportRow
                  label="Value at Risk (95%)"
                  value={formatCurrency(mc.valueAtRisk95)}
                  valueClass={mc.valueAtRisk95 >= 0 ? "text-content-secondary" : "text-rose-light"}
                />
                <div className="mt-3 space-y-1.5">
                  <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Scenario Distribution</div>
                  {[
                    { label: "Excellent (IRR > 20%)", count: mc.scenarioCounts.excellent, colorClass: "bg-emerald" },
                    { label: "Good (12 — 20%)", count: mc.scenarioCounts.good, colorClass: "bg-emerald/60" },
                    { label: "Acceptable (8 — 12%)", count: mc.scenarioCounts.acceptable, colorClass: "bg-amber/60" },
                    { label: "Marginal (0 — 8%)", count: mc.scenarioCounts.marginal, colorClass: "bg-amber/30" },
                    { label: "Loss (< 0%)", count: mc.scenarioCounts.loss, colorClass: "bg-rose/60" },
                  ].map((s) => {
                    const pct = (s.count / mc.numSimulations) * 100;
                    return (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-[11px] text-content-secondary w-36 shrink-0">{s.label}</span>
                        <div className="flex-1 h-2 bg-surface-muted rounded overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <div className={`h-full rounded ${s.colorClass}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-[11px] text-content-disabled w-10 text-right tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </ReportSection>
            ) : (
              <ReportSection title="Monte Carlo Results">
                <div className="text-[12px] text-content-tertiary italic">
                  Monte Carlo simulation not available for this configuration.
                </div>
              </ReportSection>
            )}

            {/* Assumptions */}
            <ReportSection title="Key Assumptions">
              <ReportRow label="Rent Growth (annual)" value={`${inputs.annualRentGrowthPct.toFixed(1)}%`} />
              <ReportRow label="Vacancy Rate" value={`${inputs.vacancyPct.toFixed(1)}%`} />
              <ReportRow label="Expense Growth (annual)" value={`${inputs.annualExpenseGrowthPct.toFixed(1)}%`} />
              <ReportRow label="Appreciation (annual)" value={`${inputs.annualAppreciationPct.toFixed(1)}%`} />
              <ReportRow label="Selling Costs" value={`${inputs.sellingCostsPct.toFixed(1)}%`} />
              <ReportRow label="Closing Costs" value={`${inputs.closingCostsPct.toFixed(1)}%`} />
              {inputs.renovationBudget > 0 && (
                <ReportRow label="Renovation Budget" value={formatCurrency(inputs.renovationBudget)} />
              )}
            </ReportSection>

          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-4 border-t border-surface-border">
          <p className="text-[10px] text-content-disabled leading-relaxed">
            <span className="font-semibold text-content-tertiary">Disclaimer:</span> This analysis is generated by LootVue for informational purposes only and does not constitute financial advice.
            All projections are based on the assumptions entered above and should not be taken as guarantees of future performance.
            Consult a qualified real estate professional, CPA, or financial advisor before making any investment decision.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}
