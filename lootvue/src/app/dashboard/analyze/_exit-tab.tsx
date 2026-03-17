"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, ArrowRightLeft, RefreshCw, CalendarClock } from "lucide-react";
import { Term } from "@/components/shared/Term";
import {
  CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE,
  fmtChartCurrency,
} from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Amortization ─────────────────────────────────────────────────────────────

function calcMonthlyPayment(principal: number, annualRatePct: number, years = 30): number {
  if (annualRatePct <= 0) return principal / (years * 12);
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function mortgageBalance(principal: number, annualRatePct: number, monthsPaid: number, years = 30): number {
  if (annualRatePct <= 0) return Math.max(0, principal - (principal / (years * 12)) * monthsPaid);
  const r  = annualRatePct / 100 / 12;
  const n  = years * 12;
  const pmt = calcMonthlyPayment(principal, annualRatePct, years);
  return principal * Math.pow(1 + r, monthsPaid) - pmt * ((Math.pow(1 + r, monthsPaid) - 1) / r);
}

// ─── Exit Scenario ────────────────────────────────────────────────────────────

interface ExitScenario {
  label: string;
  years: number;
  salePrice: number;
  mortgagePayoff: number;
  sellingCosts: number;
  totalCashFlow: number;
  totalAppreciation: number;
  equityGain: number;
  netProfit: number;
  annualizedReturn: number;
}

function buildScenarios(result: AnalysisResult, downPct: number, rate: number): ExitScenario[] {
  const downPayment   = result.purchasePrice * (downPct / 100);
  const loanAmount    = result.purchasePrice - downPayment;
  const appreciation  = 0.04; // 4% annual default
  const SELLING_COST_PCT = 0.06;

  return [3, 5, 10].map((years) => {
    const salePrice       = result.purchasePrice * Math.pow(1 + appreciation, years);
    const monthsPaid      = years * 12;
    const mortgagePayoff  = mortgageBalance(loanAmount, rate, monthsPaid);
    const sellingCosts    = salePrice * SELLING_COST_PCT;
    const totalCashFlow   = result.monthlyCashFlow * monthsPaid;
    const totalAppreciation = salePrice - result.purchasePrice;
    const equityGain      = salePrice - mortgagePayoff;
    const netProfit       = Math.round(salePrice - mortgagePayoff - sellingCosts + totalCashFlow - downPayment);
    const totalReturn     = netProfit / downPayment;
    const annualizedReturn = (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;

    return {
      label: `${years}yr`,
      years,
      salePrice:         Math.round(salePrice),
      mortgagePayoff:    Math.round(mortgagePayoff),
      sellingCosts:      Math.round(sellingCosts),
      totalCashFlow:     Math.round(totalCashFlow),
      totalAppreciation: Math.round(totalAppreciation),
      equityGain:        Math.round(equityGain),
      netProfit,
      annualizedReturn:  Math.round(annualizedReturn * 100) / 100,
    };
  });
}

// ─── Bar tooltip ──────────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        Hold {label}
      </p>
      <p style={{ fontSize: 13, color: v >= 0 ? CHART_COLORS.emeraldLight : CHART_COLORS.roseLight, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
        {fmtChartCurrency(v)} net profit
      </p>
    </div>
  );
}

// ─── Scenario column ─────────────────────────────────────────────────────────

function ScenarioColumn({ s, isMiddle }: { s: ExitScenario; isMiddle: boolean }) {
  const retColor = s.annualizedReturn >= 12 ? "text-emerald-light" : s.annualizedReturn >= 7 ? "text-amber-light" : "text-rose-light";
  const profitColor = s.netProfit >= 0 ? "text-emerald-light" : "text-rose-light";

  return (
    <div className={`card flex-1 ${isMiddle ? "border-gold/20 bg-gold/[0.02]" : ""}`}>
      <div className="section-label text-center mb-3">Hold {s.label}</div>
      <div className="space-y-2.5">
        {[
          { label: "Sale Price",       value: formatCurrency(s.salePrice),       color: "text-content-primary" },
          { label: "Appreciation",     value: `+${formatCurrency(s.totalAppreciation)}`, color: "text-emerald-light" },
          { label: "Cash Flow Collected", value: s.totalCashFlow >= 0 ? `+${formatCurrency(s.totalCashFlow)}` : `(${formatCurrency(Math.abs(s.totalCashFlow))})`, color: s.totalCashFlow >= 0 ? "text-emerald-light" : "text-rose-light" },
          { label: "Mortgage Payoff",  value: `(${formatCurrency(s.mortgagePayoff)})`, color: "text-rose-light" },
          { label: "Selling Costs 6%", value: `(${formatCurrency(s.sellingCosts)})`, color: "text-rose-light" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center text-[12px] border-b border-surface-border/30 pb-1.5 last:border-0">
            <span className="text-content-secondary">{label}</span>
            <span className={`font-mono tabular-nums font-semibold ${color}`}>{value}</span>
          </div>
        ))}
        <div className="pt-1">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-content-primary font-semibold">Net Profit</span>
            <span className={`font-mono text-lg font-bold tabular-nums ${profitColor}`}>
              {s.netProfit >= 0 ? formatCurrency(s.netProfit) : `(${formatCurrency(Math.abs(s.netProfit))})`}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[11px] text-content-disabled">
              <Term id="irr">Ann. Return</Term>
            </span>
            <span className={`font-mono text-[13px] font-bold tabular-nums ${retColor}`}>
              {s.annualizedReturn.toFixed(1)}%/yr
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExitTab({
  result,
  downPct,
  rate,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
}) {
  const scenarios     = buildScenarios(result, downPct, rate);
  const downPayment   = result.purchasePrice * (downPct / 100);
  const loanAmount    = result.purchasePrice - downPayment;

  // Break-even: months until cumulative CF + equity built covers closing costs
  const closingCosts = result.purchasePrice * 0.03;
  let breakEvenMonths = 0;
  for (let m = 1; m <= 360; m++) {
    const equityBuilt = loanAmount - mortgageBalance(loanAmount, rate, m);
    const cf          = result.monthlyCashFlow * m;
    if (equityBuilt + cf >= closingCosts) { breakEvenMonths = m; break; }
  }

  // Sell-now analysis
  const currentMortgagePayoff = Math.round(mortgageBalance(loanAmount, rate, 0)); // just bought
  const saleNowProceeds       = Math.round(result.purchasePrice - currentMortgagePayoff - result.purchasePrice * 0.06);

  // 1031 deferred tax (5yr scenario, 20% cap gains on appreciation)
  const s5yr            = scenarios[1];
  const taxIfSell       = Math.round((s5yr.salePrice - result.purchasePrice) * 0.20);
  const deprecRecapture = Math.round((result.purchasePrice * 0.80 / 27.5) * 5 * 0.25);
  const total1031Save   = taxIfSell + deprecRecapture;

  // Refinance trigger: how much rate drop saves per month
  const currentPmt    = calcMonthlyPayment(loanAmount, rate);
  const refinanceRate = Math.max(3.0, rate - 1.5);
  const newPmt        = calcMonthlyPayment(loanAmount, refinanceRate);
  const mthSavings    = Math.round(currentPmt - newPmt);
  const refiCosts     = 5000; // typical
  const refiBreakEven = Math.ceil(refiCosts / Math.max(1, mthSavings));

  const chartData = scenarios.map((s) => ({ label: s.label, value: s.netProfit }));

  return (
    <div className="space-y-4">

      {/* 3-column hold comparison */}
      <div className="flex flex-col sm:flex-row gap-3">
        {scenarios.map((s, i) => (
          <ScenarioColumn key={s.label} s={s} isMiddle={i === 1} />
        ))}
      </div>

      {/* Net profit bar chart */}
      <div className="card">
        <div className="section-label mb-3">Net Profit by Hold Period</div>
        <ResponsiveContainer width="100%" height={130} aria-label="Net profit by hold period bar chart">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ ...AXIS_STYLE.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => fmtChartCurrency(v)} tick={AXIS_STYLE.tick} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((d) => (
                <Cell
                  key={d.label}
                  fill={d.value >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Break-Even + Sell Now + 1031 + Refi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <CalendarClock className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Break-Even Hold Period
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-content-primary">
            {breakEvenMonths > 0 ? `${breakEvenMonths} months` : "Day 1"}
          </p>
          <p className="text-[12px] text-content-secondary leading-relaxed mt-1">
            You need to hold at least{" "}
            <span className="font-mono text-content-primary tabular-nums">{breakEvenMonths} months</span>{" "}
            ({(breakEvenMonths / 12).toFixed(1)} years) to break even after{" "}
            <span className="font-mono tabular-nums">{formatCurrency(Math.round(closingCosts))}</span>{" "}
            in closing costs.
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Sell Now Analysis
          </div>
          <p className={`font-mono text-xl font-bold tabular-nums ${saleNowProceeds >= 0 ? "text-content-primary" : "text-rose-light"}`}>
            {saleNowProceeds >= 0 ? formatCurrency(saleNowProceeds) : `(${formatCurrency(Math.abs(saleNowProceeds))})`}
          </p>
          <p className="text-[12px] text-content-secondary leading-relaxed mt-1">
            If sold today:{" "}
            <span className="font-mono tabular-nums text-content-primary">{formatCurrency(result.purchasePrice)}</span> sale
            {" · "}less mortgage{" "}
            <span className="font-mono tabular-nums text-content-primary">{formatCurrency(currentMortgagePayoff)}</span>
            {" · "}less{" "}
            <span className="font-mono tabular-nums text-content-primary">{formatCurrency(Math.round(result.purchasePrice * 0.06))}</span>{" "}
            selling costs
            {" = "}
            <span className={`font-mono font-bold tabular-nums ${saleNowProceeds >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
              {saleNowProceeds >= 0 ? formatCurrency(saleNowProceeds) : `(${formatCurrency(Math.abs(saleNowProceeds))})`}
            </span> net.
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            1031 vs Cash-Out (5yr)
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-gold">{formatCurrency(total1031Save)}</p>
          <p className="text-[10px] text-content-disabled mb-1">total tax deferred via 1031</p>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            A <Term id="irr">1031 exchange</Term> saves{" "}
            <span className="font-mono text-gold tabular-nums">{formatCurrency(total1031Save)}</span>{" "}
            in taxes vs cash-out sale after 5 years
            ({formatCurrency(taxIfSell)} cap gains + {formatCurrency(deprecRecapture)} recapture),
            but requires reinvestment within 180 days.
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <RefreshCw className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Refinance Trigger
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-emerald-light">{refinanceRate.toFixed(2)}%</p>
          <p className="text-[10px] text-content-disabled mb-1">trigger refinance rate</p>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            If rates drop to{" "}
            <span className="font-mono text-emerald-light tabular-nums">{refinanceRate.toFixed(2)}%</span>,
            refinancing saves{" "}
            <span className="font-mono text-emerald-light tabular-nums">{formatCurrency(mthSavings)}/mo</span>.
            At{" "}
            <span className="font-mono tabular-nums text-content-primary">{formatCurrency(refiCosts)}</span>{" "}
            closing costs, break-even is{" "}
            <span className="font-mono text-content-primary tabular-nums">{refiBreakEven} months</span>.
          </p>
        </div>

      </div>

    </div>
  );
}
