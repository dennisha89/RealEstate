"use client";

import { useMemo } from "react";
import {
  RefreshCw, DollarSign, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, Home, Hammer, Key, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "motion/react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaybookProps {
  address?: string;
  result?: AnalysisResult | null;
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const BRRRR_STEPS = ["Buy", "Rehab", "Rent", "Refinance", "Repeat"];

function StepBar({ steps, currentStep = 4 }: { steps: string[]; currentStep?: number }) {
  return (
    <div className="flex items-center gap-0" role="list" aria-label="BRRRR workflow steps">
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
                  "text-[9px] font-medium mt-1 text-center leading-tight hidden sm:block max-w-[60px]",
                  active ? "text-gold" : done ? "text-emerald" : "text-content-disabled",
                ].join(" ")}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={["h-px flex-1 mx-1 transition-all", done ? "bg-emerald/40" : "bg-surface-border"].join(" ")}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── Seeded sample data ───────────────────────────────────────────────────────

function seedFrom(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface BRRRRData {
  address: string;
  purchasePrice: number;
  downPayment: number;
  hardMoneyLoan: number;
  hardMoneyRate: number;
  rehabBudget: number;
  rehabMonths: number;
  holdingCosts: number;
  totalInvested: number;
  monthlyRent: number;
  arv: number;
  refiLTV: number;
  refiLoanAmount: number;
  refiRate: number;
  refiPayment: number;
  hardMoneyPayoff: number;
  cashReturned: number;
  cashLeftInDeal: number;
  infiniteReturn: boolean;
  monthlyExpenses: number;
  dscr: number;
  monthlyCashFlow: number;
  beds: number;
  baths: number;
}

function buildBRRRRData(address: string): BRRRRData {
  const seed = seedFrom(address || "sample");
  const rng = (min: number, max: number, offset = 0) => {
    const x = Math.sin(seed + min + max + offset) * 10000;
    return min + ((x - Math.floor(x)) * (max - min));
  };

  const purchasePrice = Math.round(rng(180000, 360000) / 1000) * 1000;
  const downPct = rng(0.10, 0.20);
  const downPayment = Math.round(purchasePrice * downPct / 1000) * 1000;
  const hardMoneyLoan = purchasePrice - downPayment;
  const hardMoneyRate = rng(0.11, 0.14);

  const rehabBudget = Math.round(rng(25000, 60000) / 1000) * 1000;
  const rehabMonths = Math.round(rng(2, 5));
  const holdingCosts = Math.round(
    (hardMoneyLoan * (hardMoneyRate / 12) + purchasePrice * 0.0012 / 12 + 300) * rehabMonths
  );
  const totalInvested = downPayment + rehabBudget + holdingCosts;

  const arvMultiplier = rng(1.30, 1.60);
  const arv = Math.round((purchasePrice + rehabBudget) * arvMultiplier / 1000) * 1000;
  const refiLTV = 0.75;
  const refiLoanAmount = Math.round(arv * refiLTV / 1000) * 1000;
  const refiRate = 0.0725;
  const refiPayment = Math.round(refiLoanAmount * (refiRate / 12) / (1 - Math.pow(1 + refiRate / 12, -360)));

  const hardMoneyPayoff = hardMoneyLoan;
  const cashReturned = refiLoanAmount - hardMoneyPayoff - rehabBudget;
  const cashLeftInDeal = Math.max(0, totalInvested - Math.max(0, cashReturned));
  const infiniteReturn = cashReturned >= totalInvested;

  const monthlyRent = Math.round(rng(1400, 2800) / 50) * 50;
  const monthlyExpenses = Math.round(monthlyRent * 0.36);
  const noi = (monthlyRent - monthlyExpenses) * 12;
  const dscr = refiPayment > 0 ? (noi / (refiPayment * 12)) : 0;
  const monthlyCashFlow = monthlyRent - refiPayment - monthlyExpenses;

  return {
    address: address || "1102 River Bend Rd, Charlotte NC",
    purchasePrice, downPayment, hardMoneyLoan,
    hardMoneyRate: Math.round(hardMoneyRate * 1000) / 1000,
    rehabBudget, rehabMonths, holdingCosts, totalInvested,
    monthlyRent, arv, refiLTV, refiLoanAmount,
    refiRate, refiPayment: Math.round(refiPayment),
    hardMoneyPayoff, cashReturned, cashLeftInDeal,
    infiniteReturn, monthlyExpenses,
    dscr: Math.round(dscr * 100) / 100,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    beds: Math.round(rng(2, 4)), baths: Math.round(rng(1, 3)),
  };
}

// ─── BRRRR Cycle Diagram ──────────────────────────────────────────────────────

function BRRRRCycle({ d }: { d: BRRRRData }) {
  const steps = [
    {
      icon: <Home className="w-4 h-4" aria-hidden="true" />,
      letter: "B",
      label: "BUY",
      color: CHART_COLORS.gold,
      detail: `${formatCurrency(d.purchasePrice)} purchase. ${formatCurrency(d.downPayment)} down (${Math.round(d.downPayment / d.purchasePrice * 100)}%). Hard money: ${formatCurrency(d.hardMoneyLoan)} @ ${(d.hardMoneyRate * 100).toFixed(1)}%`,
    },
    {
      icon: <Hammer className="w-4 h-4" aria-hidden="true" />,
      letter: "R",
      label: "REHAB",
      color: CHART_COLORS.amber,
      detail: `${formatCurrency(d.rehabBudget)} budget. ${d.rehabMonths} months. ${formatCurrency(d.holdingCosts)} holding costs during rehab.`,
    },
    {
      icon: <Key className="w-4 h-4" aria-hidden="true" />,
      letter: "R",
      label: "RENT",
      color: CHART_COLORS.emerald,
      detail: `${formatCurrency(d.monthlyRent)}/mo market rent. Tenant placed after stabilization. ${d.beds}bd/${d.baths}ba unit.`,
    },
    {
      icon: <DollarSign className="w-4 h-4" aria-hidden="true" />,
      letter: "R",
      label: "REFINANCE",
      color: CHART_COLORS.goldLight,
      detail: `ARV ${formatCurrency(d.arv)}. 75% LTV refi = ${formatCurrency(d.refiLoanAmount)} new loan. Pay off hard money + rehab. Cash returned: ${formatCurrency(Math.max(0, d.cashReturned))}.`,
    },
    {
      icon: <RefreshCw className="w-4 h-4" aria-hidden="true" />,
      letter: "R",
      label: "REPEAT",
      color: CHART_COLORS.emeraldLight,
      detail: d.infiniteReturn
        ? `All cash returned. INFINITE RETURN — property costs you nothing to own. Deploy capital into next deal immediately.`
        : `${formatCurrency(d.cashLeftInDeal)} left in deal. Recover over ${Math.ceil(d.cashLeftInDeal / Math.max(1, d.monthlyCashFlow))} months of cash flow, then BRRRR again.`,
    },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        The BRRRR Cycle — Buy, Rehab, Rent, Refinance, Repeat
      </h3>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.label + i} className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
              style={{ background: `${step.color}18`, borderColor: `${step.color}30`, color: step.color }}
            >
              {step.icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider font-mono"
                  style={{ color: step.color }}
                >
                  {step.letter}
                </span>
                <span className="text-[12px] font-semibold text-content-primary">{step.label}</span>
                {i < steps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-content-disabled ml-auto shrink-0" aria-hidden="true" />
                )}
              </div>
              <p className="text-[12px] text-content-secondary leading-relaxed">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {d.infiniteReturn && (
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-gold shrink-0 animate-spin" style={{ animationDuration: "3s" }} aria-hidden="true" />
          <p className="text-[13px] font-semibold text-gold">
            INFINITE RETURN achieved — all invested capital returned. This property is free to own.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Cash Left in Deal Calculator ────────────────────────────────────────────

function CashLeftCalculator({ d }: { d: BRRRRData }) {
  const rows = [
    { label: "Down Payment", value: d.downPayment, color: "text-rose-light" },
    { label: `Rehab Budget`, value: d.rehabBudget, color: "text-rose-light" },
    { label: "Holding Costs During Rehab", value: d.holdingCosts, color: "text-amber-light" },
    { label: "TOTAL INVESTED", value: d.totalInvested, color: "text-content-primary", bold: true },
    { label: `Cash-Out Refi (${d.refiLTV * 100}% of ARV ${formatCurrency(d.arv)})`, value: d.refiLoanAmount, color: "text-emerald-light" },
    { label: "Pay Off Hard Money Loan", value: -d.hardMoneyPayoff, color: "text-rose-light" },
    { label: "Pay Off Rehab Costs", value: -d.rehabBudget, color: "text-rose-light" },
    { label: "NET CASH RETURNED TO YOU", value: d.cashReturned, color: d.cashReturned >= 0 ? "text-emerald-light" : "text-rose-light", bold: true },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Cash Left in Deal Calculator
      </h3>

      <div className="space-y-2 font-mono text-[13px]">
        {rows.map((row) => (
          <div
            key={row.label}
            className={[
              "flex justify-between items-center gap-2",
              row.bold ? "pt-2 border-t border-surface-border font-bold" : "",
            ].join(" ")}
          >
            <span className={`${row.bold ? "text-content-primary" : "text-content-tertiary"} font-sans text-[12px]`}>
              {row.label}
            </span>
            <span className={`${row.color} tabular-nums`} aria-label={`${row.label}: ${formatCurrency(row.value)}`}>
              {row.value >= 0 ? "" : "("}{formatCurrency(Math.abs(row.value))}{row.value < 0 ? ")" : ""}
            </span>
          </div>
        ))}

        <div className="pt-3 border-t-2 border-surface-border">
          <div className="flex justify-between items-center gap-2 font-bold text-[14px]">
            <span className="font-sans text-content-primary">Cash Left in Deal</span>
            <span
              className={`tabular-nums ${d.cashLeftInDeal === 0 || d.infiniteReturn ? "text-gold" : "text-content-primary"}`}
              aria-label={`Cash left in deal: ${d.infiniteReturn ? "Zero — infinite return" : formatCurrency(d.cashLeftInDeal)}`}
            >
              {d.infiniteReturn ? "$0 (INFINITE RETURN)" : formatCurrency(d.cashLeftInDeal)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
        {d.infiniteReturn
          ? `You recovered ALL ${formatCurrency(d.totalInvested)} invested. The property now generates ${formatCurrency(d.monthlyCashFlow)}/mo with ZERO of your capital at risk. This is the power of BRRRR — infinite return.`
          : `You have ${formatCurrency(d.cashLeftInDeal)} left in the deal after the refinance. At ${formatCurrency(d.monthlyCashFlow)}/mo cash flow, you recover it in ${Math.ceil(d.cashLeftInDeal / Math.max(1, d.monthlyCashFlow))} months. Then your effective cash-on-cash approaches infinity.`}
      </p>
    </div>
  );
}

// ─── Refinance Qualification ──────────────────────────────────────────────────

function RefiQualification({ d }: { d: BRRRRData }) {
  const dscrOk = d.dscr >= 1.2;
  const arvMargin = ((d.arv - d.purchasePrice - d.rehabBudget) / d.arv * 100).toFixed(1);
  const arvMarginOk = parseFloat(arvMargin) >= 15;

  const checks = [
    {
      label: "6-Month Seasoning Period",
      detail: "Most lenders require the property to be owned 6 months before cash-out refi. Some have 12-month requirements — verify before closing.",
      ok: true,
      note: "Factor this into your hold timeline",
    },
    {
      label: `ARV Appraisal Target: ${formatCurrency(d.arv)}`,
      detail: `Your deal requires appraisal to hit ${formatCurrency(d.arv)} to return planned capital. That is a ${arvMargin}% increase over all-in cost. ${arvMarginOk ? "Reasonable uplift for this rehab scope." : "Aggressive target — verify with 3 recent comparable sales before committing."}`,
      ok: arvMarginOk,
    },
    {
      label: `DSCR at New Terms: ${d.dscr.toFixed(2)}x`,
      detail: `At ${formatCurrency(d.refiLoanAmount)} refi loan, ${(d.refiRate * 100).toFixed(2)}% rate, payment is ${formatCurrency(d.refiPayment)}/mo. With ${formatCurrency(d.monthlyRent)} rent and ${formatCurrency(d.monthlyExpenses)} expenses, DSCR = ${d.dscr.toFixed(2)}x. ${dscrOk ? "Meets most lender requirements (1.20x min)." : "Below common 1.20x threshold — consider reducing loan to " + formatCurrency(Math.round(d.refiLoanAmount * 0.92 / 1000) * 1000) + "."}`,
      ok: dscrOk,
    },
    {
      label: "Lender Seasoning Variance",
      detail: "Portfolio lenders (local banks, credit unions) often have flexible seasoning. Conventional lenders (Fannie/Freddie) require 12 months. DSCR loans available at 6 months.",
      ok: true,
      note: "Build lender relationships BEFORE you need the refi",
    },
  ];

  return (
    <div className="card space-y-3">
      <h3 className="section-label flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Refinance Qualification Checklist
      </h3>

      <div className="space-y-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary border border-surface-border"
          >
            <div className="shrink-0 mt-0.5">
              {check.ok
                ? <CheckCircle className="w-4 h-4 text-emerald" aria-hidden="true" />
                : <XCircle className="w-4 h-4 text-rose-light" aria-hidden="true" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[13px] font-semibold text-content-primary">{check.label}</p>
              <p className="text-[12px] text-content-secondary leading-relaxed">{check.detail}</p>
              {check.note && (
                <p className="text-[11px] text-amber-light italic">{check.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── The Repeat Math ──────────────────────────────────────────────────────────

function RepeatMath({ d }: { d: BRRRRData }) {
  const portfolioRows = [
    { year: 1, properties: 2, monthlyCF: d.monthlyCashFlow * 2 },
    { year: 2, properties: 4, monthlyCF: d.monthlyCashFlow * 4 },
    { year: 3, properties: 6, monthlyCF: d.monthlyCashFlow * 6 },
    { year: 5, properties: 10, monthlyCF: d.monthlyCashFlow * 10 },
  ];

  const barData = portfolioRows.map((r) => ({
    year: `Yr ${r.year}`,
    properties: r.properties,
    cashFlow: r.monthlyCF,
  }));

  const capitalRecovered = Math.max(0, d.cashReturned);
  const recycleMonths = capitalRecovered > 0
    ? Math.ceil(d.totalInvested / capitalRecovered * 4)
    : 6;

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        The Repeat Math — Portfolio Scaling
      </h3>

      <div className="h-44" aria-label="Portfolio scaling bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="year" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} />
            <YAxis
              yAxisId="props"
              orientation="left"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              label={{ value: "Properties", angle: -90, position: "insideLeft", fill: CHART_COLORS.text, fontSize: 9 }}
              width={50}
            />
            <YAxis
              yAxisId="cf"
              orientation="right"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              width={44}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, name: string) =>
                name === "properties"
                  ? [`${v} properties`, "Portfolio Size"]
                  : [formatCurrency(v) + "/mo", "Monthly Cash Flow"]
              }
              labelStyle={{ color: CHART_COLORS.text, fontSize: 10 }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar yAxisId="props" dataKey="properties" name="properties" radius={[3, 3, 0, 0]}>
              {barData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS.gold} opacity={0.6 + i * 0.1} />
              ))}
            </Bar>
            <Bar yAxisId="cf" dataKey="cashFlow" name="cashFlow" radius={[3, 3, 0, 0]}>
              {barData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS.emerald} opacity={0.6 + i * 0.1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th scope="col" className="text-left py-2 pr-4 metric-label font-medium">Year</th>
              <th scope="col" className="text-right py-2 pr-4 metric-label font-medium">Properties</th>
              <th scope="col" className="text-right py-2 pr-4 metric-label font-medium">Monthly CF</th>
              <th scope="col" className="text-right py-2 metric-label font-medium text-gold">Annual CF</th>
            </tr>
          </thead>
          <tbody>
            {portfolioRows.map((row) => (
              <tr key={row.year} className="border-b border-surface-border/50 hover:bg-surface-elevated/30 transition-colors">
                <td className="py-2.5 pr-4 font-mono text-content-secondary">Year {row.year}</td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-right text-content-primary">{row.properties}</td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-right text-emerald-light">
                  {formatCurrency(row.monthlyCF)}/mo
                </td>
                <td className="py-2.5 font-mono tabular-nums text-right font-bold text-gold">
                  {formatCurrency(row.monthlyCF * 12)}/yr
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
        If you recover{" "}
        <strong className="font-mono text-content-primary">{formatCurrency(capitalRecovered)}</strong> from this refi,
        you can BRRRR the next property in{" "}
        <strong className="text-gold">{recycleMonths}-{recycleMonths + 2} months</strong>.
        Over 5 years, this scales to{" "}
        <strong className="text-content-primary">8-12 properties</strong> from one initial investment.
        Portfolio cash flow at 10 properties:{" "}
        <strong className="font-mono text-gold">{formatCurrency(d.monthlyCashFlow * 10)}/mo</strong> passive income.
      </p>
    </div>
  );
}

// ─── BRRRR-Specific Risks ─────────────────────────────────────────────────────

function BRRRRRisks({ d }: { d: BRRRRData }) {
  const risks = [
    {
      icon: <AlertTriangle className="w-4 h-4 text-rose-light" aria-hidden="true" />,
      title: "Appraisal Comes In Low",
      body: `Your plan requires ARV of ${formatCurrency(d.arv)}. If the appraisal hits only ${formatCurrency(Math.round(d.arv * 0.88 / 1000) * 1000)}, your refi drops to ${formatCurrency(Math.round(d.arv * 0.88 * 0.75 / 1000) * 1000)}. Result: more cash stays trapped in the deal. Order a drive-by BPO before committing to the project.`,
      severity: "high",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />,
      title: "Hard Money Carrying Costs",
      body: `Hard money at ${(d.hardMoneyRate * 100).toFixed(1)}% eats ${formatCurrency(Math.round(d.hardMoneyLoan * d.hardMoneyRate / 12))}/mo. Every extra month of rehab costs ${formatCurrency(Math.round(d.hardMoneyLoan * d.hardMoneyRate / 12 + 400))} in carrying costs. Budget contractor delays at 30% longer than quoted.`,
      severity: "medium",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />,
      title: "Seasoning Requirement Varies",
      body: `Lenders require 3-12 months of ownership before cash-out refi. DSCR loans offer 6-month seasoning. Conventional loans require 12 months. Know which lender you are using BEFORE you buy. Build that relationship first.`,
      severity: "medium",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-rose-light" aria-hidden="true" />,
      title: "Market Dip Between Buy and Refi",
      body: `If prices decline 8-10% before your refi, the appraisal misses target and your <Term id="ltv">LTV</Term> limits how much you can pull out. BRRRR works best in stable or appreciating markets — not late-cycle bull markets where downside risk is elevated.`,
      severity: "high",
    },
  ];

  const badgeClass = (s: string) =>
    s === "high" ? "badge-rose" : s === "medium" ? "badge-amber" : "badge-emerald";

  return (
    <div className="card space-y-3">
      <h3 className="section-label flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        BRRRR-Specific Risks
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

function VerdictBanner({ d }: { d: BRRRRData }) {
  const recapitalPct = d.totalInvested > 0 ? Math.round((Math.max(0, d.cashReturned) / d.totalInvested) * 100) : 0;
  const isStrong = recapitalPct >= 80 && d.dscr >= 1.2;
  const isDig = (recapitalPct >= 50 || d.dscr >= 1.0) && !isStrong;
  const label = isStrong ? "BUY" : isDig ? "DIG DEEPER" : "PASS";
  const labelColor = isStrong ? "text-emerald-light" : isDig ? "text-amber-light" : "text-rose-light";
  const borderClass = isStrong ? "border-emerald/20 bg-emerald/5" : isDig ? "border-amber/20 bg-amber/5" : "border-rose/20 bg-rose/5";

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${borderClass}`}>
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-bold font-display tracking-tight ${labelColor}`} aria-label={`BRRRR verdict: ${label}`}>
          {label}
        </div>
        <div className="flex-1">
          <p className="text-[12px] text-content-secondary leading-relaxed">
            {d.infiniteReturn
              ? `INFINITE RETURN deal — all ${formatCurrency(d.totalInvested)} recovered through refi. Cash flow of ${formatCurrency(d.monthlyCashFlow)}/mo with zero equity at risk.`
              : `Recovers ${recapitalPct}% of invested capital (${formatCurrency(Math.max(0, d.cashReturned))} of ${formatCurrency(d.totalInvested)}) through refi.`}{" "}
            DSCR at new terms:{" "}
            <span className={`font-mono font-semibold ${d.dscr >= 1.2 ? "text-emerald-light" : "text-rose-light"}`}>
              {d.dscr.toFixed(2)}x
            </span>
            {d.dscr < 1.2 ? " — below 1.20x lender threshold" : " — meets lender requirements"}.{" "}
            <span className={`font-semibold ${labelColor}`}>{label} for BRRRR strategy.</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="metric-label mb-0.5">Capital Recovered</p>
          <p className={`text-2xl font-bold font-mono tabular-nums ${labelColor}`} aria-label={`Capital recovered: ${recapitalPct}%`}>
            {recapitalPct}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border/50">
        {[
          { label: d.infiniteReturn ? "Infinite Return" : "80%+ Recapitalized", ok: d.infiniteReturn || recapitalPct >= 80 },
          { label: "DSCR 1.20x+", ok: d.dscr >= 1.2 },
          { label: "Positive CF", ok: d.monthlyCashFlow >= 0 },
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

export function BRRRRPlaybook({ address, result }: PlaybookProps) {
  const d = useMemo(
    () => buildBRRRRData(address || result?.address || "1102 River Bend Rd, Charlotte NC"),
    [address, result]
  );

  const sections = [
    { delay: 0, component: <BRRRRCycle d={d} /> },
    { delay: 0.07, component: <CashLeftCalculator d={d} /> },
    { delay: 0.12, component: <RefiQualification d={d} /> },
    { delay: 0.17, component: <RepeatMath d={d} /> },
    { delay: 0.22, component: <BRRRRRisks d={d} /> },
    { delay: 0.27, component: <VerdictBanner d={d} /> },
  ];

  return (
    <div className="space-y-5">
      <Section delay={0}>
        <StepBar steps={BRRRR_STEPS} currentStep={4} />
      </Section>
      {sections.map(({ delay, component }, i) => (
        <Section key={i} delay={delay}>
          {component}
        </Section>
      ))}
    </div>
  );
}
