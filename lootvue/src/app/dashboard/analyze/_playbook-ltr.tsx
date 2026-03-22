"use client";

import { useMemo } from "react";
import {
  Home, TrendingUp, TrendingDown, CheckCircle, XCircle,
  AlertTriangle, DollarSign, Shield, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { motion } from "motion/react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from "@/components/charts/ChartTheme";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";
import {
  NegotiationIntelligence, DueDiligenceChecklist, SensitivityHeatmap,
  RedGreenFlags, FinancingMatrix, OfferToCloseTimeline, SimilarDeals,
} from "./_playbook-shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaybookProps {
  address?: string;
  result?: AnalysisResult | null;
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const LTR_STEPS = [
  "Find Property",
  "Analyze Cash Flow",
  "Finance It",
  "Assess Risk",
  "Decide",
];

function StepBar({ steps, currentStep = 4 }: { steps: string[]; currentStep?: number }) {
  return (
    <div className="flex items-center gap-0" role="list" aria-label="Workflow steps">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0" role="listitem">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all",
                  done
                    ? "bg-emerald/20 border-emerald/40 text-emerald"
                    : active
                    ? "bg-gold/20 border-gold/50 text-gold"
                    : "bg-surface-elevated border-surface-border text-content-disabled",
                ].join(" ")}
                aria-label={`Step ${i + 1}: ${step}${done ? " (complete)" : active ? " (current)" : ""}`}
              >
                {done ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
              </div>
              <span
                className={[
                  "text-[9px] font-medium mt-1 text-center leading-tight hidden sm:block max-w-[72px]",
                  active ? "text-gold" : done ? "text-emerald" : "text-content-disabled",
                ].join(" ")}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "h-px flex-1 mx-1 transition-all",
                  done ? "bg-emerald/40" : "bg-surface-border",
                ].join(" ")}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Seeded sample data generator ────────────────────────────────────────────

function seedFromAddress(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildSampleResult(address: string): AnalysisResult & {
  vacancyRate: number;
  areaVacancyRate: number;
  yearBuilt: number;
} {
  const seed = seedFromAddress(address || "sample");
  const rng = (min: number, max: number) => {
    const x = Math.sin(seed + min + max) * 10000;
    return min + ((x - Math.floor(x)) * (max - min));
  };

  const purchasePrice = Math.round(rng(240000, 480000) / 1000) * 1000;
  const monthlyRent = Math.round(rng(1500, 3200) / 50) * 50;
  const monthlyMortgage = Math.round(purchasePrice * 0.8 * (0.07 / 12) / (1 - Math.pow(1 + 0.07 / 12, -360)));
  const monthlyExpenses = Math.round(monthlyRent * 0.38);
  const monthlyCashFlow = monthlyRent - monthlyMortgage - monthlyExpenses;
  const annualNOI = (monthlyRent - monthlyExpenses) * 12;
  const capRate = (annualNOI / purchasePrice) * 100;
  const dscr = annualNOI / (monthlyMortgage * 12);
  const downAmt = purchasePrice * 0.2;
  const cashOnCash = (monthlyCashFlow * 12) / (downAmt + purchasePrice * 0.03) * 100;
  const score = Math.min(95, Math.max(35, Math.round(capRate * 8 + dscr * 15 + 20)));

  return {
    address: address || "214 Oak Hollow Dr, Nashville TN",
    beds: Math.round(rng(2, 4)),
    baths: Math.round(rng(1, 3)),
    sqft: Math.round(rng(900, 2400) / 100) * 100,
    yearBuilt: Math.round(rng(1960, 2018)),
    purchasePrice,
    estimatedValue: Math.round(purchasePrice * rng(0.97, 1.08)),
    monthlyRent,
    score,
    verdict: score >= 60 ? "BUY" : "PASS",
    confidence: Math.round(rng(62, 91)),
    narrative: "",
    nextSteps: [],
    capRate: Math.round(capRate * 10) / 10,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    dscr: Math.round(dscr * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 10) / 10,
    monthlyMortgage: Math.round(monthlyMortgage),
    monthlyExpenses: Math.round(monthlyExpenses),
    vacancyRate: Math.round(rng(4, 9)),
    areaVacancyRate: Math.round(rng(5, 11)),
    institutional: {} as never,
    stress: {} as never,
  };
}

// ─── Metric Cell ──────────────────────────────────────────────────────────────

function MetricCell({
  termId,
  label,
  value,
  context,
  color,
}: {
  termId: string;
  label: string;
  value: string;
  context: string;
  color: string;
}) {
  return (
    <div className="card-bento space-y-1.5">
      <p className="metric-label">
        <Term id={termId}>{label}</Term>
      </p>
      <p className={`metric-value ${color}`} aria-label={`${label}: ${value}`}>
        {value}
      </p>
      <p className="text-[11px] text-content-disabled leading-snug">{context}</p>
    </div>
  );
}

// ─── Section wrapper with fade-up animation ───────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Cash Flow Waterfall ──────────────────────────────────────────────────────

function CashFlowWaterfall({ r }: { r: ReturnType<typeof buildSampleResult> }) {
  const vacancy = Math.round(r.monthlyRent * 0.06);
  const otherIncome = Math.round(r.monthlyRent * 0.02);
  const grossRent = r.monthlyRent;
  const effectiveIncome = grossRent - vacancy + otherIncome;
  const mgmt = Math.round(effectiveIncome * 0.09);
  const maintenance = Math.round(r.monthlyRent * 0.05);
  const capex = Math.round(r.monthlyRent * 0.05);
  const tax = Math.round(r.purchasePrice * 0.012 / 12);
  const insurance = Math.round(r.purchasePrice * 0.004 / 12);

  const bars = [
    { name: "Gross Rent", value: grossRent, fill: CHART_COLORS.emerald },
    { name: "Vacancy (6%)", value: -vacancy, fill: CHART_COLORS.rose },
    { name: "Other Income", value: otherIncome, fill: CHART_COLORS.emeraldLight },
    { name: "Management", value: -mgmt, fill: CHART_COLORS.roseLight },
    { name: "Tax+Insurance", value: -(tax + insurance), fill: CHART_COLORS.roseLight },
    { name: "Maintenance+CapEx", value: -(maintenance + capex), fill: CHART_COLORS.roseLight },
    { name: "Mortgage P&I", value: -r.monthlyMortgage, fill: CHART_COLORS.rose },
    { name: "Net CF", value: r.monthlyCashFlow, fill: r.monthlyCashFlow >= 0 ? CHART_COLORS.gold : CHART_COLORS.rose },
  ];

  const annualCF = r.monthlyCashFlow * 12;
  const downAmt = r.purchasePrice * 0.2;
  const totalIn = downAmt + r.purchasePrice * 0.03;
  const cocReturn = (annualCF / totalIn * 100).toFixed(1);

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Cash Flow Breakdown
      </h3>

      <div className="h-52" aria-label="Cash flow waterfall chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="name"
              tick={{ ...AXIS_STYLE.tick, fontSize: 9 }}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v) => `$${Math.abs(v)}`}
              width={48}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatCurrency(v), "Amount"]}
              labelStyle={{ color: CHART_COLORS.text, fontSize: 10 }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <ReferenceLine y={0} stroke={CHART_COLORS.border} strokeWidth={1.5} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {bars.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1 border-t border-surface-border">
        <div className="text-center">
          <p className="metric-label mb-1">Monthly Net CF</p>
          <p
            className={`text-lg font-bold font-mono tabular-nums ${r.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}
            aria-label={`Monthly net cash flow: ${formatCurrency(r.monthlyCashFlow)}`}
          >
            {r.monthlyCashFlow >= 0 ? "+" : ""}{formatCurrency(r.monthlyCashFlow)}
          </p>
        </div>
        <div className="text-center">
          <p className="metric-label mb-1">Annual CF</p>
          <p
            className={`text-lg font-bold font-mono tabular-nums ${annualCF >= 0 ? "text-emerald-light" : "text-rose-light"}`}
            aria-label={`Annual cash flow: ${formatCurrency(annualCF)}`}
          >
            {annualCF >= 0 ? "+" : ""}{formatCurrency(annualCF)}
          </p>
        </div>
        <div className="text-center">
          <p className="metric-label mb-1">
            <Term id="coc">Cash-on-Cash</Term>
          </p>
          <p
            className={`text-lg font-bold font-mono tabular-nums ${parseFloat(cocReturn) >= 6 ? "text-emerald-light" : parseFloat(cocReturn) >= 3 ? "text-amber-light" : "text-rose-light"}`}
            aria-label={`Cash-on-cash return: ${cocReturn}%`}
          >
            {cocReturn}%
          </p>
        </div>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
        After all expenses, this property puts{" "}
        <span className={`font-mono font-semibold ${r.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
          {formatCurrency(Math.abs(r.monthlyCashFlow))}/mo
        </span>{" "}
        {r.monthlyCashFlow >= 0 ? "in your pocket" : "out of your pocket"}. That is{" "}
        <span className="font-mono font-semibold text-content-primary">{formatCurrency(Math.abs(annualCF))}/yr</span>{" "}
        on a{" "}
        <span className="font-mono font-semibold text-content-primary">{formatCompact(r.purchasePrice * 0.2 + r.purchasePrice * 0.03)}</span>{" "}
        investment = <span className="font-mono font-semibold text-gold">{cocReturn}%</span>{" "}
        <Term id="coc">cash-on-cash return</Term>.
      </p>
    </div>
  );
}

// ─── Key Metrics Grid ─────────────────────────────────────────────────────────

function KeyMetricsGrid({ r }: { r: ReturnType<typeof buildSampleResult> }) {
  const downAmt = r.purchasePrice * 0.2;
  const loanAmt = r.purchasePrice - downAmt;
  const ltv = (loanAmt / r.purchasePrice * 100);
  const grm = r.monthlyRent > 0 ? r.purchasePrice / (r.monthlyRent * 12) : 0;
  const onePercentTest = ((r.monthlyRent / r.purchasePrice) * 100).toFixed(2);
  const onePercentPass = r.monthlyRent >= r.purchasePrice * 0.01;

  const metrics = [
    {
      termId: "cap-rate",
      label: "Cap Rate",
      value: `${r.capRate.toFixed(1)}%`,
      context: `Market avg ~5.8%. You are ${r.capRate >= 5.8 ? "above" : "below"} average.`,
      color: r.capRate >= 7 ? "text-emerald-light" : r.capRate >= 5 ? "text-amber-light" : "text-rose-light",
    },
    {
      termId: "dscr",
      label: "DSCR",
      value: `${r.dscr.toFixed(2)}x`,
      context: `Income covers debt ${r.dscr.toFixed(2)}x. Lenders need 1.25x minimum.`,
      color: r.dscr >= 1.25 ? "text-emerald-light" : r.dscr >= 1.0 ? "text-amber-light" : "text-rose-light",
    },
    {
      termId: "coc",
      label: "Cash-on-Cash",
      value: `${r.cashOnCash.toFixed(1)}%`,
      context: "Annual return on your cash invested including down + closing.",
      color: r.cashOnCash >= 8 ? "text-emerald-light" : r.cashOnCash >= 4 ? "text-amber-light" : "text-rose-light",
    },
    {
      termId: "grm",
      label: "GRM",
      value: `${grm.toFixed(1)}x`,
      context: `Rent covers price in ${grm.toFixed(1)} years. Under 12x is strong.`,
      color: grm <= 12 ? "text-emerald-light" : grm <= 18 ? "text-amber-light" : "text-rose-light",
    },
    {
      termId: "ltv",
      label: "LTV",
      value: `${ltv.toFixed(0)}%`,
      context: "Loan vs property value. Lower = more equity, less risk.",
      color: ltv <= 75 ? "text-emerald-light" : ltv <= 85 ? "text-amber-light" : "text-rose-light",
    },
    {
      termId: "vacancy",
      label: "1% Test",
      value: `${onePercentTest}%`,
      context: onePercentPass ? "Passes the 1% rule — rent covers 1% of price monthly." : "Fails the 1% rule — rent below 1% of price.",
      color: onePercentPass ? "text-emerald-light" : "text-rose-light",
    },
    {
      termId: "noi",
      label: "Monthly CF",
      value: `${r.monthlyCashFlow >= 0 ? "+" : ""}${formatCurrency(r.monthlyCashFlow)}`,
      context: "Net after mortgage, expenses, management, maintenance, CapEx.",
      color: r.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light",
    },
    {
      termId: "noi",
      label: "Annual CF",
      value: formatCurrency(r.monthlyCashFlow * 12),
      context: "Total cash you collect minus all costs over 12 months.",
      color: r.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light",
    },
  ];

  return (
    <div className="card space-y-3">
      <h3 className="section-label">Key Metrics — 8 Numbers That Matter</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <MetricCell key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}

// ─── Rent Analysis ────────────────────────────────────────────────────────────

function RentAnalysis({ r }: { r: ReturnType<typeof buildSampleResult> }) {
  const seed = seedFromAddress(r.address);
  const rng = (base: number, variance: number) => Math.round((base + (Math.sin(seed + base) * 0.5 + 0.5) * variance) / 50) * 50;

  const comp1 = rng(r.monthlyRent, r.monthlyRent * 0.15);
  const comp2 = rng(r.monthlyRent, r.monthlyRent * 0.12);
  const comp3 = rng(r.monthlyRent, r.monthlyRent * 0.18);
  const lo = Math.min(comp1, comp2, comp3);
  const hi = Math.max(comp1, comp2, comp3);
  const avg = Math.round((comp1 + comp2 + comp3) / 3 / 25) * 25;
  const positionPct = hi > lo ? Math.round(((r.monthlyRent - lo) / (hi - lo)) * 100) : 50;

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <Home className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Rent Analysis
      </h3>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Comp 1", value: comp1, desc: `${r.beds}bd/${r.baths}ba, 0.3mi away` },
          { label: "Comp 2", value: comp2, desc: `${r.beds}bd/${r.baths}ba, 0.6mi away` },
          { label: "Comp 3", value: comp3, desc: `${r.beds}bd/${r.baths}ba, 0.8mi away` },
          { label: "Your Estimate", value: r.monthlyRent, desc: "Based on comps + condition", highlight: true },
        ].map((comp) => (
          <div
            key={comp.label}
            className={[
              "rounded-xl p-3 text-center space-y-1 border",
              comp.highlight ? "bg-gold/5 border-gold/20" : "bg-surface-secondary border-surface-border",
            ].join(" ")}
          >
            <p className="metric-label">{comp.label}</p>
            <p
              className={`text-base font-bold font-mono tabular-nums ${comp.highlight ? "text-gold" : "text-content-primary"}`}
              aria-label={`${comp.label}: ${formatCurrency(comp.value)} per month`}
            >
              {formatCurrency(comp.value)}/mo
            </p>
            <p className="text-[10px] text-content-disabled">{comp.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-content-disabled">
          <span>{formatCurrency(lo)}/mo</span>
          <span>Comparable range</span>
          <span>{formatCurrency(hi)}/mo</span>
        </div>
        <div className="relative h-2.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-surface-muted rounded-full"
            style={{ width: "100%" }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-gold rounded-full border-2 border-black shadow"
            style={{ left: `calc(${positionPct}% - 7px)` }}
            aria-label={`Your estimate at ${positionPct}% of comparable range`}
          />
        </div>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed">
        Similar <strong className="text-content-primary">{r.beds}bd/{r.baths}ba</strong> units within 1mi rent for{" "}
        <strong className="text-content-primary font-mono">{formatCurrency(lo)}&ndash;{formatCurrency(hi)}/mo</strong>.
        Your estimate of{" "}
        <strong className="text-gold font-mono">{formatCurrency(r.monthlyRent)}/mo</strong> is{" "}
        {r.monthlyRent <= avg ? "at or below" : "above"} the local average of{" "}
        <strong className="text-content-primary font-mono">{formatCurrency(avg)}/mo</strong> —{" "}
        {r.monthlyRent <= avg
          ? "conservative and achievable"
          : "achievable with premium condition or updates"}.
      </p>
    </div>
  );
}

// ─── Long-Term Wealth Builder ─────────────────────────────────────────────────

function WealthBuilder({ r }: { r: ReturnType<typeof buildSampleResult> }) {
  const appreciationRate = 0.04;
  const years = [1, 3, 5, 10];

  const rows = years.map((yr) => {
    const cashFlow = r.monthlyCashFlow * 12 * yr;
    // Principal paydown approximation: simplified for display
    const annualPrincipal = r.monthlyMortgage * 12 * 0.22 * yr;
    const appreciation = r.purchasePrice * (Math.pow(1 + appreciationRate, yr) - 1);
    const total = cashFlow + annualPrincipal + appreciation;
    return { yr, cashFlow, principal: annualPrincipal, appreciation, total };
  });

  const downAmt = r.purchasePrice * 0.2;
  const totalCashIn = downAmt + r.purchasePrice * 0.03;
  const yr10 = rows[3]!;

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Long-Term Wealth Builder — 4% Annual Appreciation
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th scope="col" className="text-left py-2 pr-4 metric-label font-medium">Year</th>
              <th scope="col" className="text-right py-2 pr-4 metric-label font-medium">
                <Term id="coc">Cash Flow</Term>
              </th>
              <th scope="col" className="text-right py-2 pr-4 metric-label font-medium">Principal Paydown</th>
              <th scope="col" className="text-right py-2 pr-4 metric-label font-medium">
                <Term id="appreciation">Appreciation</Term>
              </th>
              <th scope="col" className="text-right py-2 metric-label font-medium text-gold">Total Wealth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.yr} className="border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors">
                <td className="py-2.5 pr-4 font-mono text-content-secondary">Yr {row.yr}</td>
                <td className={`py-2.5 pr-4 font-mono tabular-nums text-right ${row.cashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                  {row.cashFlow >= 0 ? "+" : ""}{formatCurrency(row.cashFlow)}
                </td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-right text-emerald-light">
                  +{formatCurrency(row.principal)}
                </td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-right text-emerald-light">
                  +{formatCurrency(row.appreciation)}
                </td>
                <td className="py-2.5 font-mono tabular-nums text-right font-bold text-gold">
                  {formatCurrency(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
        In 10 years:{" "}
        <span className="font-mono font-semibold text-content-primary">{formatCurrency(yr10.cashFlow)}</span> cash flow
        collected +{" "}
        <span className="font-mono font-semibold text-content-primary">{formatCurrency(yr10.principal)}</span> equity from loan paydown +{" "}
        <span className="font-mono font-semibold text-content-primary">{formatCurrency(yr10.appreciation)}</span> from appreciation ={" "}
        <span className="font-mono font-bold text-gold">{formatCurrency(yr10.total)}</span> total wealth created
        from a{" "}
        <span className="font-mono font-semibold text-content-primary">{formatCurrency(totalCashIn)}</span> investment.
      </p>
    </div>
  );
}

// ─── Risks Panel ──────────────────────────────────────────────────────────────

function RisksPanel({ r }: { r: ReturnType<typeof buildSampleResult> }) {
  const age = new Date().getFullYear() - r.yearBuilt;
  const roofRisk = age > 20;
  const hvacRisk = age > 15;

  const risks = [
    {
      icon: roofRisk ? <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" /> : <CheckCircle className="w-4 h-4 text-emerald" aria-hidden="true" />,
      title: "Vacancy Risk",
      body: `Area <Term id="vacancy">vacancy rate</Term> is ${r.areaVacancyRate}%. ${r.areaVacancyRate <= 6 ? "Strong demand — tenants are easy to find here." : "Above average vacancy — budget for 2-3 months empty per year."}`,
      severity: r.areaVacancyRate <= 6 ? "low" : "medium",
    },
    {
      icon: (roofRisk || hvacRisk)
        ? <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />
        : <CheckCircle className="w-4 h-4 text-emerald" aria-hidden="true" />,
      title: "Maintenance Surprises",
      body: `Built ${r.yearBuilt} (${age} years old). ${roofRisk ? "Roof likely needs replacement within 5-10 years ($8,000-15,000)." : "Roof likely has 10+ years left."} ${hvacRisk ? "HVAC is aging — budget $5,000-8,000 reserve." : "HVAC should be fine."}`,
      severity: roofRisk || hvacRisk ? "medium" : "low",
    },
    {
      icon: <Shield className="w-4 h-4 text-content-tertiary" aria-hidden="true" />,
      title: "Tenant Risk",
      body: "Always run credit + background checks. Eviction takes 30-90 days depending on state. Screen for income 3x rent minimum.",
      severity: "info",
    },
    {
      icon: r.dscr < 1.1
        ? <XCircle className="w-4 h-4 text-rose-light" aria-hidden="true" />
        : <CheckCircle className="w-4 h-4 text-emerald" aria-hidden="true" />,
      title: "Rate Risk",
      body: r.dscr < 1.1
        ? `Thin DSCR of ${r.dscr.toFixed(2)}x — a +1% rate increase would push you into negative territory. Consider buying points or a shorter hold.`
        : `Healthy DSCR of ${r.dscr.toFixed(2)}x. A +1% rate shock at refinance increases payment ~${formatCurrency(r.monthlyMortgage * 0.08)}/mo — manageable.`,
      severity: r.dscr < 1.1 ? "high" : "low",
    },
  ];

  const badgeClass = (sev: string) => {
    switch (sev) {
      case "low": return "badge-emerald";
      case "medium": return "badge-amber";
      case "high": return "badge-rose";
      default: return "badge-gold";
    }
  };

  return (
    <div className="card space-y-3">
      <h3 className="section-label flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Risks to Watch
      </h3>
      <div className="space-y-3">
        {risks.map((risk) => (
          <div
            key={risk.title}
            className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary border border-surface-border"
          >
            <div className="shrink-0 mt-0.5">{risk.icon}</div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-content-primary">{risk.title}</p>
                <span className={badgeClass(risk.severity)}>{risk.severity.toUpperCase()}</span>
              </div>
              <p className="text-[12px] text-content-secondary leading-relaxed">{risk.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Verdict Banner ───────────────────────────────────────────────────────────

function VerdictBanner({ r }: { r: ReturnType<typeof buildSampleResult> }) {
  const isBuy = r.verdict === "BUY";
  const isDig = r.score >= 55 && r.score < 75;
  const label = isBuy ? "BUY" : isDig ? "DIG DEEPER" : "PASS";
  const labelColor = isBuy ? "text-emerald-light" : isDig ? "text-amber-light" : "text-rose-light";
  const borderClass = isBuy ? "border-emerald/20 bg-emerald/5" : isDig ? "border-amber/20 bg-amber/5" : "border-rose/20 bg-rose/5";
  const bullishSignals = Math.round(r.score / 20);

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${borderClass}`}>
      <div className="flex items-center gap-4">
        <div
          className={`text-4xl font-bold font-display tracking-tight ${labelColor}`}
          aria-label={`Strategy verdict: ${label}`}
        >
          {label}
        </div>
        <div className="flex-1">
          <p className="text-[12px] text-content-secondary leading-relaxed">
            This property generates{" "}
            <span className={`font-mono font-semibold ${r.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
              {formatCurrency(Math.abs(r.monthlyCashFlow))}/mo
            </span>{" "}
            {r.monthlyCashFlow >= 0 ? "positive" : "negative"} cash flow in a{" "}
            <span className={labelColor}>{label}</span> market with{" "}
            <strong className="text-content-primary">{bullishSignals}/5 bullish signals</strong>.{" "}
            The <Term id="dscr">DSCR</Term> of{" "}
            <span className="font-mono font-semibold text-content-primary">{r.dscr.toFixed(2)}x</span>{" "}
            {r.dscr >= 1.25 ? "gives you comfortable debt coverage." : "is below the lender comfort threshold of 1.25x."}{" "}
            <span className={`font-semibold ${labelColor}`}>{label} recommendation for Monthly Rental Income strategy.</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="metric-label mb-0.5">Score</p>
          <p className={`text-2xl font-bold font-mono tabular-nums ${labelColor}`} aria-label={`Score: ${r.score} out of 100`}>
            {r.score}
          </p>
          <p className="text-[10px] text-content-disabled">/100</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border/50">
        {[
          { icon: <ArrowUpRight className="w-3 h-3 text-emerald" aria-hidden="true" />, label: "Cash Flow", ok: r.monthlyCashFlow >= 0 },
          { icon: <ArrowUpRight className="w-3 h-3 text-emerald" aria-hidden="true" />, label: "DSCR 1.25x+", ok: r.dscr >= 1.25 },
          { icon: <ArrowUpRight className="w-3 h-3 text-emerald" aria-hidden="true" />, label: "Cap Rate 6%+", ok: r.capRate >= 6 },
        ].map((check) => (
          <div key={check.label} className="flex items-center gap-1.5 text-[11px]">
            {check.ok
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald shrink-0" aria-hidden="true" />
              : <XCircle className="w-3.5 h-3.5 text-rose-light shrink-0" aria-hidden="true" />}
            <span className={check.ok ? "text-emerald" : "text-rose-light"}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Playbook Export ─────────────────────────────────────────────────────

export function LTRPlaybook({ address, result }: PlaybookProps) {
  const r = useMemo(() => {
    if (result) return { ...result, vacancyRate: 6, areaVacancyRate: 7 };
    return buildSampleResult(address || "214 Oak Hollow Dr, Nashville TN");
  }, [address, result]);

  // Build a minimal AnalysisResult-compatible object for shared components
  const resultForShared: AnalysisResult = {
    address: r.address,
    beds: r.beds,
    baths: r.baths,
    sqft: r.sqft,
    yearBuilt: r.yearBuilt,
    purchasePrice: r.purchasePrice,
    estimatedValue: r.estimatedValue ?? r.purchasePrice,
    monthlyRent: r.monthlyRent,
    score: r.score,
    verdict: r.verdict,
    confidence: 75,
    narrative: "",
    nextSteps: [],
    capRate: r.capRate,
    monthlyCashFlow: r.monthlyCashFlow,
    dscr: r.dscr,
    cashOnCash: r.cashOnCash,
    monthlyMortgage: r.monthlyMortgage,
    monthlyExpenses: r.monthlyExpenses,
    institutional: {} as never,
    stress: {} as never,
  };

  const annualNOI = (r.monthlyRent - r.monthlyExpenses) * 12;

  const sections = [
    { delay: 0, component: <CashFlowWaterfall r={r} /> },
    { delay: 0.07, component: <KeyMetricsGrid r={r} /> },
    { delay: 0.12, component: <RentAnalysis r={r} /> },
    { delay: 0.17, component: <WealthBuilder r={r} /> },
    { delay: 0.22, component: <RisksPanel r={r} /> },
    { delay: 0.27, component: <VerdictBanner r={r} /> },
    { delay: 0.32, component: <NegotiationIntelligence dom={28} avgDomArea={22} listPrice={r.purchasePrice} priceDrops={1} /> },
    { delay: 0.35, component: <RedGreenFlags result={resultForShared} propertyAge={new Date().getFullYear() - r.yearBuilt} /> },
    { delay: 0.38, component: <SensitivityHeatmap price={r.purchasePrice} rent={r.monthlyRent} rate={7.0} downPct={20} /> },
    { delay: 0.41, component: <FinancingMatrix price={r.purchasePrice} rent={r.monthlyRent} noi={annualNOI} /> },
    { delay: 0.44, component: <DueDiligenceChecklist strategy="LTR" /> },
    { delay: 0.47, component: <OfferToCloseTimeline strategy="LTR" /> },
    { delay: 0.50, component: <SimilarDeals address={r.address} price={r.purchasePrice} strategy="LTR" /> },
  ];

  return (
    <div className="space-y-5">
      <Section delay={0}>
        <StepBar steps={LTR_STEPS} currentStep={4} />
      </Section>

      {sections.map(({ delay, component }, i) => (
        <Section key={i} delay={delay}>
          {component}
        </Section>
      ))}
    </div>
  );
}
