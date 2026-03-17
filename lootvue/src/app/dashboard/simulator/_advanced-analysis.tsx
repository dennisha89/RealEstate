"use client";

/**
 * Advanced Analysis Components — Simulator Page
 *
 * 8 standalone analytical panels that connect directly to simulator-store.ts
 * parameters. Each calculates its own derived values from raw store fields.
 *
 * Components:
 *   EquityPositionChart       — property value / mortgage balance / equity growth
 *   CashOnCashTimeline        — CoC % improvement year-by-year as rents grow
 *   AfterTaxReturns           — depreciation shelter + after-tax IRR vs pre-tax
 *   LeverageImpactAnalysis    — 4-column comparison: all cash vs 3 LTV scenarios
 *   InsuranceShockScenario    — insurance compounding + stress-test to 2x
 *   CashReserveAnalysis       — required reserves + 4 stress scenarios
 *   DealComparisonPanel       — current deal vs saved scenarios vs benchmarks
 *   TurnoverCostProjection    — turnover cost + vacancy loss over hold period
 */

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Info,
} from "lucide-react";
import { Term } from "@/components/shared/Term";
import {
  CHART_COLORS,
  AXIS_STYLE,
  GRID_STYLE,
  ChartTooltipContent,
  fmtChartCurrency,
  fmtChartPct,
} from "@/components/charts/ChartTheme";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import type { DCFResult } from "@/lib/engines/dcf-engine";
import type {
  TooltipProps,
} from "recharts";

// ─── Lazy-load Recharts ────────────────────────────────────────────────────────

const AreaChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.AreaChart })),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.BarChart })),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((m) => ({ default: m.Bar })),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((m) => ({ default: m.Area })),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((m) => ({ default: m.XAxis })),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((m) => ({ default: m.YAxis })),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => ({ default: m.CartesianGrid })),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => ({ default: m.Tooltip })),
  { ssr: false }
);
const ReferenceLine = dynamic(
  () => import("recharts").then((m) => ({ default: m.ReferenceLine })),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => ({ default: m.ResponsiveContainer })),
  { ssr: false }
);
const Legend = dynamic(
  () => import("recharts").then((m) => ({ default: m.Legend })),
  { ssr: false }
);

// ─── Shared Helpers ────────────────────────────────────────────────────────────

/** Standard monthly mortgage payment (principal + interest). */
function monthlyPayment(loanAmount: number, annualRatePct: number, termYears: number): number {
  if (annualRatePct <= 0) return loanAmount / (termYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** Remaining loan balance after `monthsPaid` payments. */
function loanBalanceAfterMonths(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  monthsPaid: number
): number {
  if (annualRatePct <= 0) return Math.max(0, loanAmount - (loanAmount / (termYears * 12)) * monthsPaid);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const pmt = monthlyPayment(loanAmount, annualRatePct, termYears);
  const balance = loanAmount * Math.pow(1 + r, monthsPaid) - pmt * ((Math.pow(1 + r, monthsPaid) - 1) / r);
  return Math.max(0, balance);
}

/** Skeleton placeholder while chart is loading. */
function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="skeleton rounded-lg w-full"
      style={{ height }}
      aria-label="Loading chart"
      role="status"
    />
  );
}

/** Section header shared across panels. */
function PanelHeader({
  title,
  insight,
  insightColor = "text-content-secondary",
}: {
  title: React.ReactNode;
  insight?: string;
  insightColor?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-[13px] font-semibold text-content-primary">{title}</h3>
      {insight && (
        <p className={`text-[12px] leading-relaxed mt-1 ${insightColor}`}>{insight}</p>
      )}
    </div>
  );
}

// ─── 1. EquityPositionChart ────────────────────────────────────────────────────

export interface EquityPositionChartProps {
  purchasePrice: number;
  loanAmount: number;
  rate: number;
  termYears: number;
  holdYears: number;
  appreciationPct: number;
}

interface EquityRow {
  year: number;
  label: string;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  ltv: number;
}

function buildEquityRows({
  purchasePrice,
  loanAmount,
  rate,
  termYears,
  holdYears,
  appreciationPct,
}: EquityPositionChartProps): EquityRow[] {
  const rows: EquityRow[] = [];
  for (let y = 0; y <= holdYears; y++) {
    const propertyValue = Math.round(purchasePrice * Math.pow(1 + appreciationPct / 100, y));
    const balance = Math.round(loanBalanceAfterMonths(loanAmount, rate, termYears, y * 12));
    const equity = propertyValue - balance;
    const ltv = propertyValue > 0 ? Math.round((balance / propertyValue) * 100) : 0;
    rows.push({
      year: y,
      label: `Yr ${y}`,
      propertyValue,
      loanBalance: balance,
      equity,
      ltv,
    });
  }
  return rows;
}

function EquityTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const items = [
    { name: "Property Value", value: fmtChartCurrency(payload[0]?.value ?? 0), color: CHART_COLORS.gold },
    { name: "Mortgage Balance", value: fmtChartCurrency(payload[1]?.value ?? 0), color: CHART_COLORS.rose },
    { name: "Your Equity", value: fmtChartCurrency(payload[2]?.value ?? 0), color: CHART_COLORS.emerald },
  ];
  return <ChartTooltipContent label={String(label)} items={items} />;
}

export function EquityPositionChart(props: EquityPositionChartProps) {
  const rows = useMemo(() => buildEquityRows(props), [
    props.purchasePrice,
    props.loanAmount,
    props.rate,
    props.termYears,
    props.holdYears,
    props.appreciationPct,
  ]);

  const yr0 = rows[0];
  const yrN = rows[rows.length - 1];
  const equityGain = (yrN?.equity ?? 0) - (yr0?.equity ?? 0);
  const ltvFinal = yrN?.ltv ?? 0;

  const insight = yr0 && yrN
    ? `Your equity grows from ${formatCompact(yr0.equity)} (Year 0) to ${formatCompact(yrN.equity)} (Year ${props.holdYears}) — a ${formatCompact(equityGain)} gain from just holding. LTV drops to ${ltvFinal}%.`
    : "";

  return (
    <div className="card p-5" aria-label="Equity position over hold period">
      <PanelHeader
        title={<><Term id="ltv">Equity</Term> Position Over Time</>}
        insight={insight}
        insightColor="text-emerald"
      />

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPropertyValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.15} />
              <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="label" {...AXIS_STYLE} />
          <YAxis tickFormatter={fmtChartCurrency} {...AXIS_STYLE} width={64} />
          <Tooltip content={<EquityTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: CHART_COLORS.text, paddingTop: 8 }}
          />
          <Area
            type="monotone"
            dataKey="propertyValue"
            name="Property Value"
            stroke={CHART_COLORS.gold}
            strokeWidth={2}
            fill="url(#gradPropertyValue)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="loanBalance"
            name="Mortgage Balance"
            stroke={CHART_COLORS.rose}
            strokeWidth={2}
            fill="none"
            strokeDasharray="4 3"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="equity"
            name="Your Equity"
            stroke={CHART_COLORS.emerald}
            strokeWidth={2.5}
            fill="url(#gradEquity)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* LTV annotation row */}
      <div className="flex gap-2 mt-3 flex-wrap" aria-label="Loan-to-value by year">
        {rows.map((r) => (
          <div key={r.year} className="text-center min-w-[36px]">
            <div className="text-[9px] text-content-disabled font-mono">Yr {r.year}</div>
            <div
              className={`text-[10px] font-mono font-bold tabular-nums ${
                r.ltv <= 75 ? "text-emerald" : r.ltv <= 90 ? "text-amber" : "text-rose"
              }`}
              aria-label={`Year ${r.year} LTV ${r.ltv}%`}
            >
              {r.ltv}%
            </div>
            <div className="text-[8px] text-content-disabled">LTV</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. CashOnCashTimeline ─────────────────────────────────────────────────────

export interface CashOnCashTimelineProps {
  dcfCashFlows: Array<{ year: number; cashFlowBeforeTax: number; cashOnCash: number }>;
  totalEquityInvested: number;
}

function CocTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const cf = payload[0]?.payload?.cashFlowBeforeTax ?? 0;
  return (
    <ChartTooltipContent
      label={`Year ${label}`}
      items={[
        {
          name: "Cash-on-Cash",
          value: fmtChartPct(payload[0]?.value ?? 0),
          color: CHART_COLORS.emerald,
        },
        {
          name: "Annual Cash Flow",
          value: fmtChartCurrency(cf),
          color: CHART_COLORS.goldLight,
        },
      ]}
    />
  );
}

export function CashOnCashTimeline({ dcfCashFlows, totalEquityInvested }: CashOnCashTimelineProps) {
  const data = useMemo(
    () =>
      dcfCashFlows.map((r) => ({
        year: r.year,
        coc: Math.round(r.cashOnCash * 10) / 10,
        cashFlowBeforeTax: r.cashFlowBeforeTax,
      })),
    [dcfCashFlows]
  );

  const y1 = data[0];
  const yN = data[data.length - 1];
  const insight =
    y1 && yN
      ? `Cash-on-cash ${y1.coc >= 0 ? "starts at" : "is"} ${y1.coc.toFixed(1)}% in Year 1 and ${
          yN.coc > y1.coc ? "improves" : "changes"
        } to ${yN.coc.toFixed(1)}% by Year ${yN.year} as rents grow but your fixed mortgage stays flat.`
      : "";

  if (!data.length) {
    return (
      <div className="card p-5">
        <PanelHeader title="Cash-on-Cash Timeline" />
        <p className="text-[12px] text-content-disabled text-center py-8">No cash flow data available.</p>
      </div>
    );
  }

  return (
    <div className="card p-5" aria-label="Cash-on-cash return by year">
      <PanelHeader
        title={<><Term id="coc">Cash-on-Cash</Term> Return by Year</>}
        insight={insight}
        insightColor={yN && y1 && yN.coc > y1.coc ? "text-emerald" : "text-amber"}
      />

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} {...AXIS_STYLE} />
          <YAxis tickFormatter={fmtChartPct} {...AXIS_STYLE} width={44} />
          <Tooltip content={<CocTooltip />} />
          <ReferenceLine y={8} stroke={CHART_COLORS.emerald} strokeDasharray="4 2" strokeOpacity={0.5} />
          <ReferenceLine y={4} stroke={CHART_COLORS.amber} strokeDasharray="4 2" strokeOpacity={0.5} />
          <Bar
            dataKey="coc"
            name="CoC Return"
            fill={CHART_COLORS.emerald}
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2 text-[10px] text-content-disabled">
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 inline-block bg-emerald/50" />
          8% target
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 inline-block bg-amber/50" />
          4% floor
        </span>
        <span className="ml-auto font-mono tabular-nums text-content-tertiary">
          Equity invested: {formatCompact(totalEquityInvested)}
        </span>
      </div>
    </div>
  );
}

// ─── 3. AfterTaxReturns ────────────────────────────────────────────────────────

export interface AfterTaxReturnsProps {
  annualIncomeTax: number;        // marginal bracket %
  depreciationYears: number;      // 27.5 or 39 or 0
  costSegBonus: number;           // year-1 bonus depreciation $
  use1031Exchange: boolean;
  capitalGainsTaxRatePct: number;
  purchasePrice: number;
  dcf: DCFResult;
}

export function AfterTaxReturns({
  annualIncomeTax,
  depreciationYears,
  costSegBonus,
  use1031Exchange,
  capitalGainsTaxRatePct,
  purchasePrice,
  dcf,
}: AfterTaxReturnsProps) {
  // Building value = 80% of purchase price (land is non-depreciable)
  const buildingValue = purchasePrice * 0.8;
  const annualDepreciation = depreciationYears > 0 ? buildingValue / depreciationYears : 0;
  const taxRate = annualIncomeTax / 100;
  const annualTaxSavings = annualDepreciation * taxRate;

  // Year-1 bonus from cost segregation
  const bonusTaxSavings = costSegBonus * taxRate;

  // After-tax CF = pre-tax CF + annual tax savings (depreciation is a paper deduction)
  const y1 = dcf.annualCashFlows[0];
  const preTaxCF = y1?.cashFlowBeforeTax ?? 0;
  const afterTaxCF = preTaxCF + annualTaxSavings;

  // CoC comparison
  const equity = dcf.totalEquityInvested;
  const preTaxCoC = equity > 0 ? (preTaxCF / equity) * 100 : 0;
  const afterTaxCoC = equity > 0 ? (afterTaxCF / equity) * 100 : 0;

  // Pre-tax IRR = leveredIRR
  const preTaxIRR = isNaN(dcf.leveredIRR) ? 0 : dcf.leveredIRR;

  // Simplified after-tax IRR: increase exit proceeds by deferred gains if 1031
  const capitalGainsTax = dcf.exitAnalysis.capitalGainsTax;
  const deferredGains = use1031Exchange ? capitalGainsTax : 0;
  const totalAfterTaxOut = dcf.totalCashDistributed + deferredGains + annualTaxSavings * dcf.annualCashFlows.length;
  const afterTaxEquityMultiple = equity > 0 ? totalAfterTaxOut / equity : 0;
  // Approximate after-tax IRR via equity multiple over hold
  const hold = dcf.annualCashFlows.length || 1;
  const afterTaxIRR = equity > 0 ? (Math.pow(afterTaxEquityMultiple, 1 / hold) - 1) * 100 : 0;

  const totalDepreciationBenefit = annualTaxSavings * hold + bonusTaxSavings;

  const metrics: Array<{ label: string; preTax: string; afterTax: string; better: "after" | "same" }> = [
    {
      label: "IRR",
      preTax: `${preTaxIRR.toFixed(1)}%`,
      afterTax: `${afterTaxIRR.toFixed(1)}%`,
      better: "after",
    },
    {
      label: "Year 1 Cash Flow",
      preTax: preTaxCF < 0 ? `(${formatCurrency(Math.abs(preTaxCF))})` : formatCurrency(preTaxCF),
      afterTax: afterTaxCF < 0 ? `(${formatCurrency(Math.abs(afterTaxCF))})` : formatCurrency(afterTaxCF),
      better: "after",
    },
    {
      label: "Cash-on-Cash Y1",
      preTax: `${preTaxCoC.toFixed(1)}%`,
      afterTax: `${afterTaxCoC.toFixed(1)}%`,
      better: "after",
    },
    {
      label: "Equity Multiple",
      preTax: `${dcf.equityMultiple.toFixed(2)}x`,
      afterTax: `${afterTaxEquityMultiple.toFixed(2)}x`,
      better: "after",
    },
  ];

  const insightParts: string[] = [];
  if (annualDepreciation > 0) {
    insightParts.push(
      `Depreciation saves you ${formatCurrency(annualTaxSavings)}/yr in taxes.`
    );
  }
  if (costSegBonus > 0) {
    insightParts.push(`Cost seg adds ${formatCurrency(bonusTaxSavings)} in Year 1 savings.`);
  }
  if (use1031Exchange) {
    insightParts.push(`1031 exchange defers ${formatCurrency(capitalGainsTax)} in capital gains tax on exit.`);
  }
  insightParts.push(
    `Your real after-tax return is ${afterTaxIRR.toFixed(1)}%, not ${preTaxIRR.toFixed(1)}%.`
  );

  return (
    <div className="card p-5" aria-label="After-tax returns comparison">
      <PanelHeader
        title="After-Tax Returns"
        insight={insightParts.join(" ")}
        insightColor="text-emerald"
      />

      {/* Comparison table */}
      <table className="w-full text-[12px]" aria-label="Pre-tax vs after-tax return comparison">
        <thead>
          <tr>
            <th className="text-left py-1.5 text-content-disabled font-medium section-label w-1/3">Metric</th>
            <th className="text-right py-1.5 text-content-disabled font-medium section-label">Pre-Tax</th>
            <th className="text-right py-1.5 text-emerald font-medium section-label">After-Tax</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label} className="border-t border-surface-border">
              <td className="py-2 text-content-secondary">{m.label}</td>
              <td className="py-2 text-right font-mono tabular-nums text-content-tertiary">{m.preTax}</td>
              <td className="py-2 text-right font-mono tabular-nums text-emerald font-semibold">{m.afterTax}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Depreciation summary */}
      {annualDepreciation > 0 && (
        <div className="mt-4 rounded-lg bg-emerald/5 border border-emerald/10 p-3 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-content-secondary">Building value (depreciable, 80%)</span>
            <span className="font-mono tabular-nums text-content-primary">{formatCurrency(buildingValue)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-content-secondary">Annual depreciation deduction</span>
            <span className="font-mono tabular-nums text-content-primary">{formatCurrency(annualDepreciation)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-content-secondary">Annual tax savings @ {annualIncomeTax}% bracket</span>
            <span className="font-mono tabular-nums text-emerald font-semibold">{formatCurrency(annualTaxSavings)}</span>
          </div>
          <div className="flex justify-between text-[11px] border-t border-emerald/10 pt-1">
            <span className="text-content-secondary">Total depreciation benefit over {hold} yrs</span>
            <span className="font-mono tabular-nums text-emerald font-bold">{formatCurrency(totalDepreciationBenefit)}</span>
          </div>
        </div>
      )}

      {use1031Exchange && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-gold/5 border border-gold/10 p-3">
          <Info className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] text-content-secondary">
            <Term id="irr">1031 exchange</Term> defers {formatCurrency(capitalGainsTax)} in capital gains tax.
            You keep that capital working in the next deal instead of paying the IRS.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 4. LeverageImpactAnalysis ─────────────────────────────────────────────────

export interface LeverageImpactAnalysisProps {
  purchasePrice: number;
  monthlyRent: number;
  rate: number;
  holdYears: number;
  appreciationPct: number;
}

interface LeverageScenario {
  label: string;
  downPct: number;
  downAmount: number;
  loanAmount: number;
  monthlyPayment: number;
  monthlyCF: number;
  annualCF: number;
  coc: number;
  irr: number;
  totalReturn: number;
  cashRequired: number;
}

function buildLeverageScenarios({
  purchasePrice,
  monthlyRent,
  rate,
  holdYears,
  appreciationPct,
}: LeverageImpactAnalysisProps): LeverageScenario[] {
  const scenarios = [
    { label: "All Cash", downPct: 100 },
    { label: "25% Down", downPct: 25 },
    { label: "20% Down", downPct: 20 },
    { label: "10% Down", downPct: 10 },
  ];

  // Approximate annual operating expenses = 45% of gross rent (tax + ins + mgmt + maint + capex)
  const annualExpenses = monthlyRent * 12 * 0.45;
  const exitValue = purchasePrice * Math.pow(1 + appreciationPct / 100, holdYears);
  const sellingCosts = exitValue * 0.06;

  return scenarios.map(({ label, downPct }) => {
    const down = purchasePrice * (downPct / 100);
    const loan = purchasePrice - down;
    const pmt = loan > 0 ? monthlyPayment(loan, rate, 30) : 0;
    const annualDebtService = pmt * 12;
    const annualNOI = monthlyRent * 12 - annualExpenses;
    const annualCF = annualNOI - annualDebtService;
    const monthlyCF = Math.round(annualCF / 12);
    const coc = down > 0 ? (annualCF / down) * 100 : 0;

    // IRR approximation: (equity at exit + cumulative CF) vs initial equity
    const finalBalance = loan > 0 ? loanBalanceAfterMonths(loan, rate, 30, holdYears * 12) : 0;
    const netProceeds = exitValue - sellingCosts - finalBalance;
    const totalOut = netProceeds + annualCF * holdYears;
    const irr = down > 0 ? (Math.pow(Math.max(totalOut / down, 0.01), 1 / holdYears) - 1) * 100 : 0;

    return {
      label,
      downPct,
      downAmount: down,
      loanAmount: loan,
      monthlyPayment: Math.round(pmt),
      monthlyCF,
      annualCF: Math.round(annualCF),
      coc: Math.round(coc * 10) / 10,
      irr: Math.round(irr * 10) / 10,
      totalReturn: Math.round(totalOut),
      cashRequired: Math.round(down * 1.03), // +3% closing costs
    };
  });
}

export function LeverageImpactAnalysis(props: LeverageImpactAnalysisProps) {
  const scenarios = useMemo(() => buildLeverageScenarios(props), [
    props.purchasePrice,
    props.monthlyRent,
    props.rate,
    props.holdYears,
    props.appreciationPct,
  ]);

  const allCash = scenarios[0];
  const twentyPct = scenarios[2];
  const insight =
    allCash && twentyPct
      ? `20% down turns a ${allCash.irr.toFixed(1)}% all-cash return into ${twentyPct.irr.toFixed(1)}% leveraged IRR — but means ${formatCurrency(Math.abs(twentyPct.monthlyCF - allCash.monthlyCF))}/mo less cash flow.`
      : "";

  const cols = ["label", "irr", "coc", "totalReturn", "cashRequired", "monthlyCF"] as const;

  const rowDefs: Array<{ key: typeof cols[number]; header: string; fmt: (s: LeverageScenario) => string; color?: (s: LeverageScenario) => string }> = [
    {
      key: "irr",
      header: "IRR",
      fmt: (s) => `${s.irr.toFixed(1)}%`,
      color: (s) => s.irr >= 12 ? "text-emerald" : s.irr >= 6 ? "text-amber" : "text-rose",
    },
    {
      key: "coc",
      header: "Cash-on-Cash",
      fmt: (s) => `${s.coc.toFixed(1)}%`,
      color: (s) => s.coc >= 8 ? "text-emerald" : s.coc >= 4 ? "text-amber" : "text-rose",
    },
    {
      key: "totalReturn",
      header: "Total Return",
      fmt: (s) => formatCompact(s.totalReturn),
      color: (s) => s.totalReturn > 0 ? "text-content-primary" : "text-rose",
    },
    {
      key: "cashRequired",
      header: "Cash Required",
      fmt: (s) => formatCompact(s.cashRequired),
      color: () => "text-content-secondary",
    },
    {
      key: "monthlyCF",
      header: "Monthly CF",
      fmt: (s) => s.monthlyCF < 0 ? `(${formatCurrency(Math.abs(s.monthlyCF))})` : formatCurrency(s.monthlyCF),
      color: (s) => s.monthlyCF > 0 ? "text-emerald" : "text-rose",
    },
  ];

  return (
    <div className="card p-5" aria-label="Leverage impact analysis">
      <PanelHeader
        title={<><Term id="irr">Leverage</Term> Impact Analysis</>}
        insight={insight}
        insightColor="text-gold"
      />

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[12px] min-w-[480px]" aria-label="Leverage scenarios comparison">
          <thead>
            <tr>
              <th className="text-left py-1.5 text-content-disabled font-medium section-label">Metric</th>
              {scenarios.map((s) => (
                <th
                  key={s.label}
                  className={`text-right py-1.5 font-medium section-label ${s.downPct === 20 ? "text-gold" : "text-content-disabled"}`}
                >
                  {s.label}
                  {s.downPct === 20 && <span className="ml-1 text-[9px] text-gold">★</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowDefs.map((row) => (
              <tr key={row.key} className="border-t border-surface-border">
                <td className="py-2 text-content-secondary pr-2">{row.header}</td>
                {scenarios.map((s) => (
                  <td
                    key={s.label}
                    className={`py-2 text-right font-mono tabular-nums font-semibold ${row.color ? row.color(s) : "text-content-primary"}`}
                  >
                    {row.fmt(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-content-disabled mt-3 leading-relaxed">
        Expenses assumed at 45% of gross rent. IRR is approximate — use DCF tab for full model.
        Cash required includes 3% closing costs.
      </p>
    </div>
  );
}

// ─── 5. InsuranceShockScenario ─────────────────────────────────────────────────

export interface InsuranceShockScenarioProps {
  insuranceAnnual: number;
  insuranceAnnualIncreasePct: number;
  monthlyRent: number;
  mortgage: number;         // monthly mortgage payment
  expenses: number;         // monthly operating expenses (excl. insurance)
  holdYears: number;
}

interface InsuranceRow {
  year: number;
  insurance: number;
  monthlyInsurance: number;
  monthlyImpact: number;   // increase vs Year 1
  cashFlow: number;
}

function buildInsuranceRows({
  insuranceAnnual,
  insuranceAnnualIncreasePct,
  monthlyRent,
  mortgage,
  expenses,
  holdYears,
}: InsuranceShockScenarioProps): InsuranceRow[] {
  const rows: InsuranceRow[] = [];
  const baseMonthly = insuranceAnnual / 12;
  // Monthly cash flow at year 0 (before any insurance increase)
  const baseCF = monthlyRent - mortgage - expenses - baseMonthly;

  for (let y = 1; y <= holdYears; y++) {
    const annual = insuranceAnnual * Math.pow(1 + insuranceAnnualIncreasePct / 100, y - 1);
    const monthly = annual / 12;
    rows.push({
      year: y,
      insurance: Math.round(annual),
      monthlyInsurance: Math.round(monthly),
      monthlyImpact: Math.round(monthly - baseMonthly),
      cashFlow: Math.round(baseCF - (monthly - baseMonthly)),
    });
  }
  return rows;
}

export function InsuranceShockScenario(props: InsuranceShockScenarioProps) {
  const rows = useMemo(() => buildInsuranceRows(props), [
    props.insuranceAnnual,
    props.insuranceAnnualIncreasePct,
    props.monthlyRent,
    props.mortgage,
    props.expenses,
    props.holdYears,
  ]);

  const r1 = rows[0];
  const rN = rows[rows.length - 1];

  // Stress test: insurance doubles from Year 1
  const baseMonthly = props.insuranceAnnual / 12;
  const doubledMonthly = baseMonthly * 2;
  const baseCF = props.monthlyRent - props.mortgage - props.expenses - baseMonthly;
  const stressedCF = baseCF - doubledMonthly + baseMonthly; // remove base, add doubled

  const insight =
    r1 && rN
      ? `At ${props.insuranceAnnualIncreasePct}% annual increase, insurance goes from ${formatCurrency(r1.insurance)} to ${formatCurrency(rN.insurance)} by Year ${props.holdYears}.`
      : "";

  const stressInsight = `If insurance doubles, your cash flow drops from ${formatCurrency(Math.round(baseCF))}/mo to ${
    stressedCF < 0
      ? `(${formatCurrency(Math.abs(Math.round(stressedCF)))})/mo — deal goes negative.`
      : `${formatCurrency(Math.round(stressedCF))}/mo — still positive.`
  }`;

  return (
    <div className="card p-5" aria-label="Insurance cost projection">
      <PanelHeader
        title="Insurance Cost Projection"
        insight={`${insight} ${stressInsight}`}
        insightColor={stressedCF < 0 ? "text-rose" : "text-amber"}
      />

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[12px] min-w-[400px]" aria-label="Insurance by year table">
          <thead>
            <tr>
              <th className="text-left py-1.5 text-content-disabled font-medium section-label">Year</th>
              <th className="text-right py-1.5 text-content-disabled font-medium section-label">Annual Insurance</th>
              <th className="text-right py-1.5 text-content-disabled font-medium section-label">Monthly</th>
              <th className="text-right py-1.5 text-content-disabled font-medium section-label">vs Year 1</th>
              <th className="text-right py-1.5 text-content-disabled font-medium section-label">Cash Flow</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-t border-surface-border">
                <td className="py-2 font-mono tabular-nums text-content-secondary">Yr {r.year}</td>
                <td className="py-2 text-right font-mono tabular-nums text-content-primary">{formatCurrency(r.insurance)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-content-secondary">{formatCurrency(r.monthlyInsurance)}</td>
                <td className={`py-2 text-right font-mono tabular-nums font-semibold ${r.monthlyImpact > 0 ? "text-rose" : "text-content-disabled"}`}>
                  {r.monthlyImpact > 0 ? `+${formatCurrency(r.monthlyImpact)}` : "—"}
                </td>
                <td className={`py-2 text-right font-mono tabular-nums font-semibold ${r.cashFlow > 0 ? "text-emerald" : "text-rose"}`}>
                  {r.cashFlow < 0 ? `(${formatCurrency(Math.abs(r.cashFlow))})` : formatCurrency(r.cashFlow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stress test callout */}
      <div className={`mt-4 rounded-lg p-3 border flex items-start gap-2 ${stressedCF < 0 ? "bg-rose/5 border-rose/15" : "bg-amber/5 border-amber/15"}`}>
        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${stressedCF < 0 ? "text-rose" : "text-amber"}`} aria-hidden="true" />
        <div>
          <p className={`text-[11px] font-semibold mb-0.5 ${stressedCF < 0 ? "text-rose" : "text-amber"}`}>
            Stress Test: Insurance doubles
          </p>
          <p className="text-[11px] text-content-secondary">
            At 2x insurance ({formatCurrency(doubledMonthly)}/mo), cash flow becomes{" "}
            <span className={`font-mono tabular-nums font-semibold ${stressedCF < 0 ? "text-rose" : "text-emerald"}`}>
              {stressedCF < 0 ? `(${formatCurrency(Math.abs(Math.round(stressedCF)))})` : formatCurrency(Math.round(stressedCF))}
            </span>
            {stressedCF < 0 ? " — deal goes cash-flow negative." : " — deal survives the shock."}
          </p>
          {props.insuranceAnnual > 4000 && (
            <p className="text-[10px] text-content-disabled mt-1">
              High insurance may indicate FL/TX coastal exposure — verify flood + wind coverage separately.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 6. CashReserveAnalysis ────────────────────────────────────────────────────

export interface CashReserveAnalysisProps {
  monthlyExpenses: number;
  monthlyMortgage: number;
  reserveMonths: number;
  cashFlow: number;
}

interface StressCheck {
  label: string;
  cost: number;
  covered: boolean;
}

export function CashReserveAnalysis({
  monthlyExpenses,
  monthlyMortgage,
  reserveMonths,
  cashFlow,
}: CashReserveAnalysisProps) {
  const monthlyBurn = monthlyExpenses + monthlyMortgage;
  const requiredReserve = monthlyBurn * reserveMonths;
  const majorRepairCost = 8_000;
  const oneMonthVacancy = monthlyExpenses + monthlyMortgage; // all costs, no rent
  const threeMonthVacancy = oneMonthVacancy * 3;
  const allAtOnce = threeMonthVacancy + majorRepairCost;

  const monthsToFill = cashFlow > 0 ? Math.ceil(requiredReserve / cashFlow) : Infinity;
  const runway = cashFlow < 0 ? Math.floor(requiredReserve / Math.abs(cashFlow)) : Infinity;

  const stressChecks: StressCheck[] = [
    { label: "1 month vacant", cost: oneMonthVacancy, covered: requiredReserve >= oneMonthVacancy },
    { label: "3 months vacant", cost: threeMonthVacancy, covered: requiredReserve >= threeMonthVacancy },
    { label: `Major repair ($${(majorRepairCost / 1000).toFixed(0)}K)`, cost: majorRepairCost, covered: requiredReserve >= majorRepairCost },
    { label: "All three at once", cost: allAtOnce, covered: requiredReserve >= allAtOnce },
  ];

  const coverageScore = stressChecks.filter((s) => s.covered).length;

  return (
    <div className="card p-5" aria-label="Cash reserve adequacy analysis">
      <PanelHeader
        title={<><Term id="dscr">Cash Reserve</Term> Adequacy</>}
      />

      {/* Required vs available */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-surface-elevated border border-surface-border p-3">
          <div className="metric-label mb-1">Required Reserve</div>
          <div className="font-mono text-[16px] font-bold tabular-nums text-content-primary">
            {formatCompact(requiredReserve)}
          </div>
          <div className="text-[10px] text-content-disabled mt-0.5">{reserveMonths} months × {formatCurrency(monthlyBurn)}/mo</div>
        </div>
        <div className="rounded-lg bg-surface-elevated border border-surface-border p-3">
          <div className="metric-label mb-1">Monthly Cash Flow</div>
          <div className={`font-mono text-[16px] font-bold tabular-nums ${cashFlow > 0 ? "text-emerald" : "text-rose"}`}>
            {cashFlow < 0 ? `(${formatCurrency(Math.abs(cashFlow))})` : formatCurrency(cashFlow)}
          </div>
          <div className="text-[10px] text-content-disabled mt-0.5">
            {cashFlow > 0
              ? `${monthsToFill < Infinity ? `Builds reserve in ${monthsToFill} months` : "—"}`
              : "Negative — reserve depleting"}
          </div>
        </div>
        <div className="rounded-lg bg-surface-elevated border border-surface-border p-3 col-span-2 sm:col-span-1">
          <div className="metric-label mb-1">Reserve Runway</div>
          <div className={`font-mono text-[16px] font-bold tabular-nums ${runway >= 12 ? "text-emerald" : runway >= 6 ? "text-amber" : "text-rose"}`}>
            {runway === Infinity ? "∞" : `${runway} mo`}
          </div>
          <div className="text-[10px] text-content-disabled mt-0.5">
            {runway === Infinity ? "CF positive — reserves not depleting" : `Months of zero-income survival`}
          </div>
        </div>
      </div>

      {/* Stress scenarios */}
      <div className="space-y-2" role="list" aria-label="Stress test scenarios">
        {stressChecks.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
            role="listitem"
          >
            <div className="flex items-center gap-2">
              {s.covered ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald shrink-0" aria-label="Covered" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose shrink-0" aria-label="Not covered" />
              )}
              <span className="text-[12px] text-content-secondary">{s.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-[12px] text-content-tertiary">{formatCurrency(s.cost)}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.covered ? "text-emerald bg-emerald/10" : "text-rose bg-rose/10"}`}>
                {s.covered ? "OK" : "SHORT"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Coverage score */}
      <div className={`mt-3 text-[11px] font-medium ${coverageScore === 4 ? "text-emerald" : coverageScore >= 2 ? "text-amber" : "text-rose"}`}>
        {coverageScore === 4 && "Reserves cover all stress scenarios — well protected."}
        {coverageScore === 3 && "Reserves cover most scenarios. Build toward the 'all three at once' buffer."}
        {coverageScore === 2 && "Reserves are thin. One bad month + a repair could wipe you out."}
        {coverageScore <= 1 && "Reserves are dangerously low. Do not close without 6+ months of expenses in the bank."}
      </div>
    </div>
  );
}

// ─── 7. DealComparisonPanel ────────────────────────────────────────────────────

export interface CurrentDealMetrics {
  irr: number;
  coc: number;
  cashFlow: number;
  npv: number;
  equityMultiple: number;
  dscr: number;
}

export interface DealComparisonPanelProps {
  currentDeal: CurrentDealMetrics;
}

interface CompScenario {
  name: string;
  irr: number;
  coc: number;
  cashFlow: number | null;
  npv: number | null;
  equityMultiple: number;
  dscr: number | null;
  isCurrentDeal?: boolean;
}

const BENCHMARK_SCENARIOS: CompScenario[] = [
  {
    name: "Typical Good Deal",
    irr: 12,
    coc: 8,
    cashFlow: null,
    npv: null,
    equityMultiple: 2.0,
    dscr: 1.25,
  },
  {
    name: "Average Deal",
    irr: 8,
    coc: 5,
    cashFlow: null,
    npv: null,
    equityMultiple: 1.5,
    dscr: 1.1,
  },
  {
    name: "S&P 500 (10yr avg)",
    irr: 10,
    coc: 10,
    cashFlow: null,
    npv: null,
    equityMultiple: 1.61,
    dscr: null,
  },
];

type CompScenarioNumericKey = "irr" | "coc" | "cashFlow" | "npv" | "equityMultiple" | "dscr";

type MetricDef = {
  key: CompScenarioNumericKey;
  header: string;
  fmt: (v: number | null) => string;
  better: "higher" | "lower";
};

const METRIC_DEFS: MetricDef[] = [
  { key: "irr", header: "IRR", fmt: (v) => v === null ? "—" : `${v.toFixed(1)}%`, better: "higher" },
  { key: "coc", header: "Cash-on-Cash", fmt: (v) => v === null ? "—" : `${v.toFixed(1)}%`, better: "higher" },
  { key: "equityMultiple", header: "Equity Multiple", fmt: (v) => v === null ? "—" : `${v.toFixed(2)}x`, better: "higher" },
  {
    key: "dscr",
    header: "DSCR",
    fmt: (v) => v === null ? "N/A" : `${v.toFixed(2)}x`,
    better: "higher",
  },
];

export function DealComparisonPanel({ currentDeal }: DealComparisonPanelProps) {
  // Load saved scenarios from localStorage
  const [savedScenarios] = useState<CompScenario[]>(() => {
    try {
      const raw = localStorage.getItem("lv_simulator_scenarios");
      if (!raw) return [];
      const parsed: Array<{ name?: string; inputs?: { annualAppreciationPct?: number; holdPeriodYears?: number } & Record<string, number | boolean> }> = JSON.parse(raw);
      return parsed.slice(0, 2).map((s) => ({
        name: s.name ?? "Saved Scenario",
        irr: 0,     // saved scenarios don't store computed IRR
        coc: 0,
        cashFlow: null,
        npv: null,
        equityMultiple: 0,
        dscr: null,
      }));
    } catch {
      return [];
    }
  });

  const current: CompScenario = {
    name: "This Deal",
    ...currentDeal,
    isCurrentDeal: true,
  };

  const comparisons: CompScenario[] = savedScenarios.length > 0
    ? [current, ...savedScenarios.slice(0, 2)]
    : [current, ...BENCHMARK_SCENARIOS];

  // How many metrics does current deal beat each benchmark on?
  const currentBeats = BENCHMARK_SCENARIOS.map((bench) => {
    const metricKeys: CompScenarioNumericKey[] = ["irr", "coc", "equityMultiple", "dscr"];
    return metricKeys.filter((k) => {
      const cv = current[k] as number | null;
      const bv = bench[k] as number | null;
      if (cv === null || bv === null) return false;
      return cv > bv;
    }).length;
  });

  const avgBeats = Math.round(currentBeats.reduce((a, b) => a + b, 0) / currentBeats.length);

  const insight = `This deal outperforms the average on ${avgBeats} of ${METRIC_DEFS.length} metrics.${
    currentDeal.dscr < 1.15 ? ` Weakness: DSCR is tight at ${currentDeal.dscr.toFixed(2)}x.` : ""
  }`;

  return (
    <div className="card p-5" aria-label="Deal comparison panel">
      <PanelHeader
        title="Deal Comparison"
        insight={insight}
        insightColor={avgBeats >= 3 ? "text-emerald" : avgBeats >= 2 ? "text-amber" : "text-rose"}
      />

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[12px] min-w-[440px]" aria-label="Deal metrics comparison table">
          <thead>
            <tr>
              <th className="text-left py-1.5 text-content-disabled font-medium section-label">Metric</th>
              {comparisons.map((s) => (
                <th
                  key={s.name}
                  className={`text-right py-1.5 font-medium section-label ${s.isCurrentDeal ? "text-gold" : "text-content-disabled"}`}
                >
                  {s.name}
                  {s.isCurrentDeal && <span className="ml-1 text-[9px] text-gold">★</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_DEFS.map((def) => (
              <tr key={def.key} className="border-t border-surface-border">
                <td className="py-2 text-content-secondary pr-2">{def.header}</td>
                {comparisons.map((s) => {
                  const raw = s[def.key] as number | null;
                  const formatted = def.fmt(raw);
                  // Determine if this is the best value in the row
                  const allVals = comparisons
                    .map((c) => c[def.key] as number | null)
                    .filter((v): v is number => v !== null);
                  const best = allVals.length ? Math.max(...allVals) : null;
                  const isBest = raw !== null && best !== null && raw === best && allVals.length > 1;
                  return (
                    <td
                      key={s.name}
                      className={`py-2 text-right font-mono tabular-nums font-semibold ${
                        s.isCurrentDeal
                          ? isBest
                            ? "text-emerald"
                            : "text-content-primary"
                          : isBest
                          ? "text-emerald"
                          : "text-content-tertiary"
                      }`}
                      aria-label={`${s.name} ${def.header}: ${formatted}${isBest ? " (best)" : ""}`}
                    >
                      {formatted}
                      {isBest && (
                        <TrendingUp
                          className="inline w-3 h-3 ml-0.5 text-emerald"
                          aria-hidden="true"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {savedScenarios.length === 0 && (
        <p className="text-[10px] text-content-disabled mt-3">
          Save scenarios with the bookmark button to compare real alternatives side-by-side.
          Showing benchmarks until saved scenarios are available.
        </p>
      )}
    </div>
  );
}

// ─── 8. TurnoverCostProjection ─────────────────────────────────────────────────

export interface TurnoverCostProjectionProps {
  turnoverCost: number;        // $ per turnover event
  avgStayYears: number;        // avg tenant tenure
  holdYears: number;
  monthlyRent: number;
}

interface TurnoverEvent {
  eventNumber: number;
  yearOccurs: number;
  turnoverCost: number;
  vacancyCost: number;
  totalEventCost: number;
}

export function TurnoverCostProjection({
  turnoverCost,
  avgStayYears,
  holdYears,
  monthlyRent,
}: TurnoverCostProjectionProps) {
  const safeStay = Math.max(avgStayYears, 0.5);
  // Number of turnovers during hold = floor(holdYears / avgStayYears) - 1 (first tenant is free)
  // Conservative: count turnovers at each tenant boundary, excluding start
  const turnovers: TurnoverEvent[] = [];
  let yr = safeStay;
  let idx = 1;
  while (yr < holdYears) {
    const vacancyCost = monthlyRent; // 1 month vacancy per turnover
    turnovers.push({
      eventNumber: idx,
      yearOccurs: Math.round(yr * 10) / 10,
      turnoverCost,
      vacancyCost,
      totalEventCost: turnoverCost + vacancyCost,
    });
    yr += safeStay;
    idx++;
  }

  const totalTurnoverCosts = turnovers.reduce((a, t) => a + t.turnoverCost, 0);
  const totalVacancyCosts = turnovers.reduce((a, t) => a + t.vacancyCost, 0);
  const grandTotal = totalTurnoverCosts + totalVacancyCosts;
  const annualizedCost = holdYears > 0 ? grandTotal / holdYears : 0;
  const monthlyImpact = annualizedCost / 12;

  const insight =
    turnovers.length === 0
      ? `With ${avgStayYears}-year avg stays, no turnovers expected in a ${holdYears}-year hold — ideal scenario.`
      : `Over ${holdYears} years with ${safeStay}-year avg tenant stays, expect ${turnovers.length} turnover${turnovers.length !== 1 ? "s" : ""} costing ${formatCurrency(totalTurnoverCosts)} + ${formatCurrency(totalVacancyCosts)} vacancy = ${formatCurrency(grandTotal)} total. That's ${formatCurrency(Math.round(annualizedCost))}/yr or ${formatCurrency(Math.round(monthlyImpact))}/mo off your cash flow. Most investors forget this.`;

  return (
    <div className="card p-5" aria-label="Tenant turnover cost projection">
      <PanelHeader
        title="Tenant Turnover Costs"
        insight={insight}
        insightColor={turnovers.length > 2 ? "text-rose" : turnovers.length > 0 ? "text-amber" : "text-emerald"}
      />

      {turnovers.length === 0 ? (
        <div className="rounded-lg bg-emerald/5 border border-emerald/10 p-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald shrink-0" aria-hidden="true" />
          <p className="text-[12px] text-content-secondary">
            No turnovers projected in the {holdYears}-year hold period at {avgStayYears}-year avg tenancy.
          </p>
        </div>
      ) : (
        <>
          {/* Events table */}
          <div className="overflow-x-auto -mx-1 mb-4">
            <table className="w-full text-[12px]" aria-label="Turnover events table">
              <thead>
                <tr>
                  <th className="text-left py-1.5 text-content-disabled font-medium section-label">Event</th>
                  <th className="text-right py-1.5 text-content-disabled font-medium section-label">Year</th>
                  <th className="text-right py-1.5 text-content-disabled font-medium section-label">Turnover Cost</th>
                  <th className="text-right py-1.5 text-content-disabled font-medium section-label">Vacancy Loss</th>
                  <th className="text-right py-1.5 text-content-disabled font-medium section-label">Total</th>
                </tr>
              </thead>
              <tbody>
                {turnovers.map((t) => (
                  <tr key={t.eventNumber} className="border-t border-surface-border">
                    <td className="py-2 text-content-secondary">Turnover {t.eventNumber}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-content-secondary">Yr {t.yearOccurs}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-rose">{formatCurrency(t.turnoverCost)}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-amber">{formatCurrency(t.vacancyCost)}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-content-primary font-semibold">{formatCurrency(t.totalEventCost)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-surface-border">
                  <td className="py-2 text-content-primary font-semibold" colSpan={2}>Total (all {turnovers.length} events)</td>
                  <td className="py-2 text-right font-mono tabular-nums text-rose font-semibold">{formatCurrency(totalTurnoverCosts)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-amber font-semibold">{formatCurrency(totalVacancyCosts)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-content-primary font-bold">{formatCurrency(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Monthly impact callout */}
          <div className="rounded-lg bg-surface-elevated border border-surface-border p-3 flex items-center gap-4">
            <div>
              <div className="metric-label mb-0.5">Amortized Monthly Impact</div>
              <div className={`font-mono text-[18px] font-bold tabular-nums ${monthlyImpact > 200 ? "text-rose" : "text-amber"}`}>
                -{formatCurrency(Math.round(monthlyImpact))}
                <span className="text-[11px] font-normal text-content-disabled">/mo</span>
              </div>
            </div>
            <div className="h-10 w-px bg-surface-border" aria-hidden="true" />
            <div>
              <div className="metric-label mb-0.5">Annualized Drag</div>
              <div className="font-mono text-[18px] font-bold tabular-nums text-content-primary">
                -{formatCurrency(Math.round(annualizedCost))}
                <span className="text-[11px] font-normal text-content-disabled">/yr</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-content-disabled shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[10px] text-content-disabled leading-relaxed">
              Turnover costs include: paint, carpet clean, re-listing, screening. Vacancy is 1 month lost rent per event.
              To reduce impact: offer renewal incentives, keep rent competitive, respond to maintenance fast.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
