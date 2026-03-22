"use client";

import { useState, useMemo, useId } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { Term } from "@/components/shared/Term";
import { formatCurrency } from "@/lib/utils/format";

// ─── Shared Formatting ────────────────────────────────────────────────────────

function fmt(n: number): string {
  const abs = Math.abs(n);
  const f = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: abs >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: abs >= 1_000_000 ? 1 : 0,
  }).format(abs);
  return n < 0 ? `(${f})` : f;
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`;
}

// ─── Core Mortgage Math ───────────────────────────────────────────────────────

/**
 * Standard amortization formula: P × r(1+r)^n / ((1+r)^n − 1)
 * r = monthly rate (annual / 12 / 100), n = total months
 */
function monthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  if (annualRatePct <= 0) return principal / (termYears * 12);
  const r = annualRatePct / 12 / 100;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

interface AmortRow {
  year: number;
  payment: number;       // annual
  principal: number;     // annual principal paid
  interest: number;      // annual interest paid
  balance: number;       // end-of-year balance
  equityPct: number;     // equity as % of original loan
}

function buildAmortSchedule(loanAmount: number, annualRatePct: number, termYears: number): AmortRow[] {
  const r = annualRatePct / 12 / 100;
  const n = termYears * 12;
  const mp = monthlyPayment(loanAmount, annualRatePct, termYears);

  let balance = loanAmount;
  const rows: AmortRow[] = [];

  for (let yr = 1; yr <= termYears; yr++) {
    let annualPrincipal = 0;
    let annualInterest = 0;

    for (let mo = 0; mo < 12; mo++) {
      const interestCharge = balance * r;
      const principalCharge = mp - interestCharge;
      annualInterest += interestCharge;
      annualPrincipal += principalCharge;
      balance = Math.max(0, balance - principalCharge);
    }

    rows.push({
      year: yr,
      payment: mp * 12,
      principal: annualPrincipal,
      interest: annualInterest,
      balance: Math.max(0, balance),
      equityPct: ((loanAmount - balance) / loanAmount) * 100,
    });
  }

  return rows;
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-content-tertiary mb-0.5">
      {children}
    </p>
  );
}

function InfoBox({ children, color = "amber" }: { children: React.ReactNode; color?: "amber" | "emerald" | "gold" | "rose" }) {
  const map: Record<string, string> = {
    amber: "bg-amber-muted/30 border-amber/15 text-amber",
    emerald: "bg-emerald-muted/30 border-emerald/15 text-emerald",
    gold: "bg-gold-muted/30 border-gold/15 text-gold",
    rose: "bg-rose-muted/30 border-rose/15 text-rose",
  };
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-[12px] leading-relaxed ${map[color]}`}>
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

// Th/Td helpers keep table markup concise and consistent
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`section-label py-2 px-3 font-semibold whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({ children, right, mono, color }: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  color?: string;
}) {
  return (
    <td
      className={[
        "py-2 px-3 text-[12px] whitespace-nowrap",
        right ? "text-right" : "text-left",
        mono ? "font-mono tabular-nums" : "",
        color ?? "text-content-secondary",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </td>
  );
}

// ─── 1. AmortizationTable ─────────────────────────────────────────────────────

export interface AmortizationTableProps {
  loanAmount: number;
  rate: number;
  termYears: number;
  holdYears: number;
}

export function AmortizationTable({ loanAmount, rate, termYears, holdYears }: AmortizationTableProps) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => buildAmortSchedule(loanAmount, rate, termYears), [loanAmount, rate, termYears]);

  // Years to show in collapsed state: first 5 + hold year + last year
  const keyYears = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];
    [1, 2, 3, 4, 5, holdYears, termYears].forEach((y) => {
      const clamped = Math.min(y, termYears);
      if (!seen.has(clamped)) { seen.add(clamped); out.push(clamped); }
    });
    return out.sort((a, b) => a - b);
  }, [holdYears, termYears]);

  const displayRows = expanded ? rows : rows.filter((r) => keyYears.includes(r.year));

  // Aggregate totals over hold period
  const holdRows = rows.slice(0, holdYears);
  const holdInterest = holdRows.reduce((s, r) => s + r.interest, 0);
  const holdPrincipal = holdRows.reduce((s, r) => s + r.principal, 0);
  const lifeInterest = rows.reduce((s, r) => s + r.interest, 0);

  // Year-1 interest-to-principal ratio
  const yr1 = rows[0];
  const interestPerDollar = yr1 ? (yr1.interest / yr1.principal).toFixed(2) : "N/A";

  return (
    <div className="space-y-3">

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="card !p-3">
          <SectionLabel>Interest over hold period</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-rose-light">{fmt(holdInterest)}</p>
          <p className="text-[10px] text-content-disabled mt-0.5">Years 1–{holdYears}</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Interest over loan life</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-rose-light">{fmt(lifeInterest)}</p>
          <p className="text-[10px] text-content-disabled mt-0.5">{termYears}-year total</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Interest per $1 principal (Yr 1)</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-amber">${interestPerDollar}</p>
          <p className="text-[10px] text-content-disabled mt-0.5">Bank's share early on</p>
        </div>
      </div>

      <InfoBox color="amber">
        You pay {fmt(holdInterest)} in interest over your {holdYears}-year hold —
        that&apos;s {fmtPct((holdInterest / (holdInterest + holdPrincipal)) * 100, 0)} of every payment going
        to the bank. Principal repaid in the same period: {fmt(holdPrincipal)}.
      </InfoBox>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Amortization schedule by year">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Year</Th>
              <Th right>Annual Payment</Th>
              <Th right>Principal</Th>
              <Th right>Interest</Th>
              <Th right>Balance</Th>
              <Th right>Equity %</Th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const isHold = row.year === holdYears;
              const isGap =
                !expanded &&
                displayRows.indexOf(row) > 0 &&
                row.year - displayRows[displayRows.indexOf(row) - 1]!.year > 1;

              return (
                <>
                  {isGap && (
                    <tr key={`gap-${row.year}`} aria-hidden="true">
                      <td colSpan={6} className="py-1 px-3 text-center text-[10px] text-content-disabled">
                        · · ·
                      </td>
                    </tr>
                  )}
                  <tr
                    key={row.year}
                    className={[
                      "border-b border-surface-border/50 transition-colors",
                      isHold ? "outline outline-1 outline-gold/40 bg-gold-muted/10" : "hover:bg-surface-elevated",
                    ].join(" ")}
                    aria-label={isHold ? `Year ${row.year} — your planned exit year` : undefined}
                  >
                    <Td>
                      <span className="font-mono tabular-nums text-content-primary">{row.year}</span>
                      {isHold && (
                        <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-gold bg-gold-muted/40 px-1.5 py-0.5 rounded-full">
                          Exit
                        </span>
                      )}
                    </Td>
                    <Td right mono>{fmt(row.payment)}</Td>
                    <Td right mono color="text-emerald-light">{fmt(row.principal)}</Td>
                    <Td right mono color="text-rose-light">{fmt(row.interest)}</Td>
                    <Td right mono>{fmt(row.balance)}</Td>
                    <Td right mono color={row.equityPct >= 20 ? "text-emerald-light" : "text-content-secondary"}>
                      {fmtPct(row.equityPct, 1)}
                    </Td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expand / collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="btn-ghost text-xs w-full justify-center"
      >
        {expanded ? (
          <><ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> Show key years only</>
        ) : (
          <><ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /> Show all {termYears} years</>
        )}
      </button>

      <p className="text-[10px] text-content-disabled">
        Emerald = principal (building your equity). Rose = interest (bank&apos;s profit).
        Gold row = your planned exit year.
      </p>
    </div>
  );
}

// ─── 2. LoanComparison ────────────────────────────────────────────────────────

export interface LoanComparisonProps {
  purchasePrice: number;
  downPct: number;
  currentRate: number;
}

interface LoanProduct {
  label: string;
  rate: number;
  term: number;
  noteColor: string;
  note: string;
}

export function LoanComparison({ purchasePrice, downPct, currentRate }: LoanComparisonProps) {
  const loanAmount = purchasePrice * (1 - downPct / 100);

  const products: LoanProduct[] = useMemo(() => [
    { label: "30yr Fixed", rate: currentRate,           term: 30, noteColor: "text-content-secondary", note: "Certainty. Predictable payment forever." },
    { label: "15yr Fixed", rate: currentRate - 0.57,    term: 15, noteColor: "text-emerald-light",     note: "Lower rate, higher payment, half the interest." },
    { label: "5/1 ARM",    rate: currentRate - 0.83,    term: 30, noteColor: "text-amber",             note: "Fixed 5 years, then adjusts annually." },
    { label: "7/1 ARM",    rate: currentRate - 0.60,    term: 30, noteColor: "text-amber",             note: "Fixed 7 years. Good if holding 5–7 years." },
  ], [currentRate]);

  const holdYears = 5; // reference hold for comparison
  const holdMonths = holdYears * 12;

  const rows = useMemo(() => products.map((p) => {
    const mp = monthlyPayment(loanAmount, p.rate, p.term);
    // Total interest over hold period
    const r = p.rate / 12 / 100;
    const n = p.term * 12;
    let bal = loanAmount;
    let holdInterest = 0;
    for (let i = 0; i < Math.min(holdMonths, n); i++) {
      const int = bal * r;
      holdInterest += int;
      bal -= (mp - int);
    }
    const lifeInterest = mp * n - loanAmount;
    return { ...p, mp, holdInterest, lifeInterest };
  }), [products, loanAmount, holdMonths]);

  const base = rows[0];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Loan product comparison">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Product</Th>
              <Th right>Rate</Th>
              <Th right>Monthly P&amp;I</Th>
              <Th right>Interest ({holdYears}yr hold)</Th>
              <Th right>Interest (life)</Th>
              <Th right>vs 30yr Fixed</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const mthSavings = base!.mp - row.mp;
              const is30 = i === 0;
              return (
                <tr
                  key={row.label}
                  className="border-b border-surface-border/50 hover:bg-surface-elevated transition-colors"
                >
                  <Td>
                    <div>
                      <span className="text-content-primary font-semibold text-[12px]">{row.label}</span>
                      <p className={`text-[10px] mt-0.5 ${row.noteColor}`}>{row.note}</p>
                    </div>
                  </Td>
                  <Td right mono color="text-content-primary">{fmtPct(row.rate)}</Td>
                  <Td right mono color="text-content-primary">{fmt(row.mp)}/mo</Td>
                  <Td right mono color="text-rose-light">{fmt(row.holdInterest)}</Td>
                  <Td right mono color="text-rose-light">{fmt(row.lifeInterest)}</Td>
                  <Td right mono color={is30 ? "text-content-disabled" : mthSavings > 0 ? "text-emerald-light" : "text-rose-light"}>
                    {is30 ? "—" : mthSavings > 0 ? `+${fmt(mthSavings)}/mo` : `(${fmt(Math.abs(mthSavings))})/mo`}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Plain-English verdict */}
      <InfoBox color="gold">
        If you&apos;re holding {holdYears}+ years and want certainty, go 30yr fixed — your payment
        never changes. If you plan to sell or refinance within 5 years, the 5/1 ARM
        saves {fmt((base!.mp - rows[2]!.mp) * holdMonths)} over your hold period.
        The 15yr fixed saves the most total interest ({fmt(base!.lifeInterest - rows[1]!.lifeInterest)})
        but your monthly payment is {fmt(rows[1]!.mp - base!.mp)} higher.
      </InfoBox>
    </div>
  );
}

// ─── 3. DownPaymentScenarios ───────────────────────────────────────────────────

export interface DownPaymentScenariosProps {
  purchasePrice: number;
  rate: number;
  monthlyRent: number;
  expenses: number; // monthly non-PITI expenses
}

export function DownPaymentScenarios({ purchasePrice, rate, monthlyRent, expenses }: DownPaymentScenariosProps) {
  const PMI_RATE = 0.007; // 0.7% annually

  const scenarios = useMemo(() => {
    return [5, 10, 15, 20, 25].map((downPct) => {
      const downDollars = purchasePrice * (downPct / 100);
      const loan = purchasePrice - downDollars;
      const mp = monthlyPayment(loan, rate, 30);
      const pmiMonthly = downPct < 20 ? (loan * PMI_RATE) / 12 : 0;
      const totalPayment = mp + pmiMonthly;
      const cashFlow = monthlyRent - totalPayment - expenses;
      return { downPct, downDollars, loan, mp, pmiMonthly, totalPayment, cashFlow };
    });
  }, [purchasePrice, rate, monthlyRent, expenses]);

  // Breakeven: cost of going from 15% to 20%
  const s15 = scenarios[2]; // 15%
  const s20 = scenarios[3]; // 20%
  const extraDown = s20!.downDollars - s15!.downDollars;
  const monthlySavings = s15!.pmiMonthly; // PMI eliminated
  const breakevenMonths = monthlySavings > 0 ? Math.round(extraDown / monthlySavings) : 0;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Down payment scenarios comparison">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Down %</Th>
              <Th right>Down $</Th>
              <Th right>Loan</Th>
              <Th right>Monthly P&amp;I</Th>
              <Th right><Term id="pmi">PMI</Term>/mo</Th>
              <Th right>Total Payment</Th>
              <Th right>Cash Flow</Th>
              <Th right>Cash Needed</Th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const is20 = s.downPct === 20;
              const cfColor = s.cashFlow >= 0 ? "text-emerald-light" : "text-rose-light";
              return (
                <tr
                  key={s.downPct}
                  className={[
                    "border-b border-surface-border/50 transition-colors",
                    is20 ? "outline outline-1 outline-gold/40 bg-gold-muted/10" : "hover:bg-surface-elevated",
                  ].join(" ")}
                  aria-label={is20 ? `${s.downPct}% down — PMI elimination threshold` : undefined}
                >
                  <Td>
                    <span className="font-mono tabular-nums text-content-primary font-semibold">{s.downPct}%</span>
                    {is20 && (
                      <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-gold bg-gold-muted/40 px-1.5 py-0.5 rounded-full">
                        No PMI
                      </span>
                    )}
                  </Td>
                  <Td right mono>{fmt(s.downDollars)}</Td>
                  <Td right mono>{fmt(s.loan)}</Td>
                  <Td right mono>{fmt(s.mp)}</Td>
                  <Td right mono color={s.pmiMonthly > 0 ? "text-rose-light" : "text-content-disabled"}>
                    {s.pmiMonthly > 0 ? fmt(s.pmiMonthly) : "—"}
                  </Td>
                  <Td right mono>{fmt(s.totalPayment)}</Td>
                  <Td right mono color={cfColor}>
                    {s.cashFlow >= 0 ? fmt(s.cashFlow) : `(${fmt(Math.abs(s.cashFlow))})`}
                  </Td>
                  <Td right mono>{fmt(s.downDollars)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InfoBox color="gold">
        Going from 15% to 20% down costs {fmt(extraDown)} more upfront but eliminates{" "}
        {fmt(monthlySavings)}/mo in <Term id="pmi">PMI</Term>.
        {breakevenMonths > 0 && ` Breakeven: ${breakevenMonths} months.`}
      </InfoBox>
    </div>
  );
}

// ─── 4. PointsAnalysis ────────────────────────────────────────────────────────

export interface PointsAnalysisProps {
  loanAmount: number;
  rate: number;
  termYears: number;
  holdYears: number;
}

export function PointsAnalysis({ loanAmount, rate, termYears, holdYears }: PointsAnalysisProps) {
  const RATE_REDUCTION_PER_POINT = 0.25; // typical market assumption

  const rows = useMemo(() => [0, 1, 2].map((points) => {
    const newRate = Math.max(0.01, rate - points * RATE_REDUCTION_PER_POINT);
    const cost = points * (loanAmount / 100);
    const mp = monthlyPayment(loanAmount, newRate, termYears);
    const baseMP = monthlyPayment(loanAmount, rate, termYears);
    const monthlySavings = baseMP - mp;
    const breakevenMonths = cost > 0 && monthlySavings > 0 ? Math.ceil(cost / monthlySavings) : 0;
    const holdSavings = monthlySavings * holdYears * 12 - cost;
    return { points, cost, newRate, mp, monthlySavings, breakevenMonths, holdSavings };
  }), [loanAmount, rate, termYears, holdYears]);

  const row1 = rows[1];
  const worthIt1 = row1 && row1.holdSavings > 0 && row1.breakevenMonths <= holdYears * 12;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Mortgage points buy-down analysis">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Points</Th>
              <Th right>Upfront Cost</Th>
              <Th right>New Rate</Th>
              <Th right>Monthly P&amp;I</Th>
              <Th right>Monthly Savings</Th>
              <Th right>Breakeven</Th>
              <Th right>Net Savings ({holdYears}yr hold)</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isBase = row.points === 0;
              const worthIt = !isBase && row.holdSavings > 0 && row.breakevenMonths <= holdYears * 12;
              return (
                <tr
                  key={row.points}
                  className="border-b border-surface-border/50 hover:bg-surface-elevated transition-colors"
                >
                  <Td>
                    <span className="font-mono tabular-nums text-content-primary font-semibold">{row.points} pt{row.points !== 1 ? "s" : ""}</span>
                  </Td>
                  <Td right mono color={isBase ? "text-content-disabled" : "text-rose-light"}>
                    {isBase ? "—" : fmt(row.cost)}
                  </Td>
                  <Td right mono color="text-content-primary">{fmtPct(row.newRate)}</Td>
                  <Td right mono>{fmt(row.mp)}</Td>
                  <Td right mono color={isBase ? "text-content-disabled" : "text-emerald-light"}>
                    {isBase ? "—" : `+${fmt(row.monthlySavings)}/mo`}
                  </Td>
                  <Td right mono color={isBase ? "text-content-disabled" : worthIt ? "text-emerald-light" : "text-amber"}>
                    {isBase ? "—" : `Month ${row.breakevenMonths}`}
                  </Td>
                  <Td right mono color={isBase ? "text-content-disabled" : row.holdSavings >= 0 ? "text-emerald-light" : "text-rose-light"}>
                    {isBase ? "—" : row.holdSavings >= 0 ? fmt(row.holdSavings) : `(${fmt(Math.abs(row.holdSavings))})`}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {row1 && (
        <InfoBox color={worthIt1 ? "emerald" : "amber"}>
          {worthIt1
            ? `Buying 1 point saves ${fmt(row1.holdSavings)} net over your ${holdYears}-year hold. Worth it — you break even at month ${row1.breakevenMonths}, well before your planned exit.`
            : `Buying 1 point costs ${fmt(row1.cost)} upfront. You break even at month ${row1.breakevenMonths} — after your ${holdYears}-year hold. Not worth it unless you plan to hold longer.`
          }
        </InfoBox>
      )}
    </div>
  );
}

// ─── 5. RefinanceAnalysis ─────────────────────────────────────────────────────

export interface RefinanceAnalysisProps {
  currentLoan: number;
  currentRate: number;
  currentPayment: number;
  monthsRemaining: number;
}

export function RefinanceAnalysis({ currentLoan, currentRate, currentPayment, monthsRemaining }: RefinanceAnalysisProps) {
  // Estimate closing costs: 1-2% of loan, floor $4k ceiling $6k
  const estimatedClosing = Math.min(6_000, Math.max(4_000, currentLoan * 0.015));

  const targets = useMemo(() => [-0.5, -1.0, -1.5].map((delta) => {
    const newRate = Math.max(0.01, currentRate + delta);
    const yearsRemaining = monthsRemaining / 12;
    const newPayment = monthlyPayment(currentLoan, newRate, yearsRemaining);
    const monthlySavings = currentPayment - newPayment;
    const breakevenMonths = monthlySavings > 0 ? Math.ceil(estimatedClosing / monthlySavings) : 9999;
    const netSavings = monthlySavings * monthsRemaining - estimatedClosing;
    return { rate: newRate, delta, newPayment, monthlySavings, breakevenMonths, netSavings };
  }), [currentLoan, currentRate, currentPayment, monthsRemaining, estimatedClosing]);

  // Optimal trigger: first rate where breakeven < 24 months
  const optimal = targets.find((t) => t.breakevenMonths <= 24 && t.monthlySavings > 0);
  const triggerRate = optimal?.rate ?? targets[0]!.rate;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Refinance analysis at target rates">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Target Rate</Th>
              <Th right>New Payment</Th>
              <Th right>Savings/mo</Th>
              <Th right>Closing Cost</Th>
              <Th right>Breakeven</Th>
              <Th right>Net Savings (life)</Th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => {
              const worthIt = t.breakevenMonths <= 24;
              return (
                <tr
                  key={t.rate}
                  className="border-b border-surface-border/50 hover:bg-surface-elevated transition-colors"
                >
                  <Td>
                    <div>
                      <span className="font-mono tabular-nums text-content-primary font-semibold">{fmtPct(t.rate)}</span>
                      <span className="ml-1.5 text-[10px] text-content-disabled">({t.delta > 0 ? "+" : ""}{t.delta}%)</span>
                    </div>
                  </Td>
                  <Td right mono color="text-content-primary">{fmt(t.newPayment)}/mo</Td>
                  <Td right mono color={t.monthlySavings > 0 ? "text-emerald-light" : "text-rose-light"}>
                    {t.monthlySavings > 0 ? `+${fmt(t.monthlySavings)}/mo` : `(${fmt(Math.abs(t.monthlySavings))})/mo`}
                  </Td>
                  <Td right mono color="text-rose-light">{fmt(estimatedClosing)}</Td>
                  <Td right mono color={worthIt ? "text-emerald-light" : "text-amber"}>
                    {t.breakevenMonths < 9999 ? `${t.breakevenMonths} mo` : "Never"}
                  </Td>
                  <Td right mono color={t.netSavings >= 0 ? "text-emerald-light" : "text-rose-light"}>
                    {t.netSavings >= 0 ? fmt(t.netSavings) : `(${fmt(Math.abs(t.netSavings))})`}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InfoBox color="gold">
        Set a rate alert at {fmtPct(triggerRate)} — that&apos;s your optimal refi trigger.
        At that rate, you break even on closing costs within 24 months and save{" "}
        {fmt(optimal?.netSavings ?? 0)} over the remaining loan term.
      </InfoBox>
    </div>
  );
}

// ─── 6. ClosingCostBreakdown ───────────────────────────────────────────────────

export interface ClosingCostBreakdownProps {
  purchasePrice: number;
  loanAmount: number;
  isNewPurchase: boolean;
}

interface CostLineItem {
  label: string;
  low: number;
  high: number;
  note?: string;
}

export function ClosingCostBreakdown({ purchasePrice, loanAmount, isNewPurchase }: ClosingCostBreakdownProps) {
  // Estimated monthly taxes: assume 1.25% annual rate
  const monthlyTax = (purchasePrice * 0.0125) / 12;
  // Estimated monthly insurance: assume $2,400/yr
  const monthlyIns = 200;

  const items: CostLineItem[] = useMemo(() => [
    { label: "Origination fee (1% of loan)",         low: loanAmount * 0.01,  high: loanAmount * 0.01,   note: "Lender's processing fee" },
    { label: "Appraisal",                             low: 450,                high: 600,                  note: "Required by lender" },
    { label: "Title insurance",                       low: Math.max(1_000, purchasePrice * 0.003), high: Math.min(2_000, purchasePrice * 0.005), note: "Protects against title defects" },
    { label: "Title search",                          low: 200,                high: 400,                  note: "Public records research" },
    { label: "Recording fees",                        low: 100,                high: 250,                  note: "County deed recording" },
    { label: "Survey",                                low: 350,                high: 500,                  note: "Property boundary confirmation" },
    { label: "Attorney / settlement",                 low: 500,                high: 1_500,                note: "Legal closing services" },
    { label: "Prepaid taxes (3 months)",              low: monthlyTax * 3,     high: monthlyTax * 3,       note: "Escrowed at closing" },
    { label: "Prepaid insurance (12 months)",         low: monthlyIns * 12,    high: monthlyIns * 12,      note: "First year premium" },
    { label: "Escrow reserves (taxes + ins)",         low: (monthlyTax + monthlyIns) * 2, high: (monthlyTax + monthlyIns) * 2, note: "2-month buffer" },
  ], [loanAmount, purchasePrice, monthlyTax, monthlyIns]);

  const totalLow  = items.reduce((s, i) => s + i.low, 0);
  const totalHigh = items.reduce((s, i) => s + i.high, 0);
  const midpoint  = (totalLow + totalHigh) / 2;
  const pctOfPrice = (midpoint / purchasePrice) * 100;

  // Seller concessions (2-3%) would save:
  const concession2 = purchasePrice * 0.02;
  const concession3 = purchasePrice * 0.03;

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card !p-3">
          <SectionLabel>Est. Low</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-content-primary">{fmt(totalLow)}</p>
        </div>
        <div className="card !p-3 border-gold/20">
          <SectionLabel>Est. Midpoint</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-gold">{fmt(midpoint)}</p>
          <p className="text-[10px] text-content-disabled">{fmtPct(pctOfPrice, 1)} of price</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Est. High</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-content-primary">{fmt(totalHigh)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Closing cost itemization">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Item</Th>
              <Th right>Low Est.</Th>
              <Th right>High Est.</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.label}
                className="border-b border-surface-border/50 hover:bg-surface-elevated transition-colors"
              >
                <Td>
                  <div>
                    <span className="text-content-primary text-[12px]">{item.label}</span>
                    {item.note && <p className="text-[10px] text-content-disabled mt-0.5">{item.note}</p>}
                  </div>
                </Td>
                <Td right mono>{fmt(item.low)}</Td>
                <Td right mono>{fmt(item.high)}</Td>
              </tr>
            ))}
            <tr className="bg-surface-elevated border-t-2 border-surface-border">
              <td className="py-2.5 px-3 text-[12px] font-semibold text-content-primary">Total</td>
              <Td right mono color="text-content-primary">{fmt(totalLow)}</Td>
              <Td right mono color="text-content-primary">{fmt(totalHigh)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {isNewPurchase && (
        <InfoBox color="gold">
          Pro tip: negotiate seller concessions of 2–3% to offset closing costs.
          A 2% concession saves you {fmt(concession2)} cash at closing.
          A 3% concession saves {fmt(concession3)} — nearly covering your entire closing cost.
        </InfoBox>
      )}
    </div>
  );
}

// ─── 7. AffordabilityCalculator ───────────────────────────────────────────────

export interface AffordabilityCalculatorProps {
  rate: number;
}

export function AffordabilityCalculator({ rate }: AffordabilityCalculatorProps) {
  const inputId = useId();
  const [annualIncome, setAnnualIncome] = useState(85_000);

  // 28% front-end DTI rule
  const maxMonthlyPayment = (annualIncome * 0.28) / 12;

  // Reverse mortgage: given payment, find principal
  // P = payment × ((1+r)^n − 1) / (r × (1+r)^n)
  function maxLoanForPayment(payment: number, annualRatePct: number, termYears: number): number {
    if (annualRatePct <= 0) return payment * termYears * 12;
    const r = annualRatePct / 12 / 100;
    const n = termYears * 12;
    return payment * ((Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
  }

  // Assume 20% down → max purchase = max loan / 0.80
  const maxLoan = maxLoanForPayment(maxMonthlyPayment, rate, 30);
  const maxPurchase = maxLoan / 0.80;

  // Rate sensitivity table: current rate ± steps
  const rateSensitivity = useMemo(() => {
    return [-1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0].map((delta) => {
      const r = Math.max(0.01, rate + delta);
      const loan = maxLoanForPayment(maxMonthlyPayment, r, 30);
      const purchase = loan / 0.80;
      return { rate: r, delta, purchase };
    });
  }, [rate, maxMonthlyPayment]);

  // How much each 25bps drop adds
  const bps25 = rateSensitivity.find((r) => r.delta === -0.25);
  const addedPer25bps = bps25 ? bps25.purchase - maxPurchase : 0;

  return (
    <div className="space-y-4">
      {/* Income input */}
      <div>
        <label
          htmlFor={inputId}
          className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary block mb-2"
        >
          Annual Household Income
        </label>
        <div className="relative flex items-center">
          <DollarSign className="absolute left-3 w-3.5 h-3.5 text-content-disabled" aria-hidden="true" />
          <input
            id={inputId}
            type="number"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="input pl-8 w-full sm:w-56 font-mono tabular-nums"
            aria-label="Annual household income in dollars"
            min={0}
            step={5000}
          />
        </div>
      </div>

      {/* Key outputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="card !p-3">
          <SectionLabel>Max monthly payment (28% rule)</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-content-primary">{fmt(maxMonthlyPayment)}/mo</p>
        </div>
        <div className="card !p-3 border-gold/20">
          <SectionLabel>Max purchase price</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-gold">{fmt(maxPurchase)}</p>
          <p className="text-[10px] text-content-disabled">at {fmtPct(rate)} with 20% down</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Each 25bps rate drop adds</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-emerald-light">{fmt(Math.abs(addedPer25bps))}</p>
          <p className="text-[10px] text-content-disabled">to buying power</p>
        </div>
      </div>

      {/* Plain English summary */}
      <p className="text-[13px] text-content-secondary leading-relaxed">
        At {fmtFull(annualIncome)} income and {fmtPct(rate)} rate, you qualify for up to{" "}
        <span className="text-content-primary font-semibold font-mono">{fmt(maxPurchase)}</span>.
        Every 25bps rate drop adds roughly{" "}
        <span className="text-emerald-light font-semibold font-mono">{fmt(Math.abs(addedPer25bps))}</span> to your limit.
      </p>

      {/* Rate sensitivity table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="Rate vs max purchase price sensitivity">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Rate</Th>
              <Th right>Max Purchase Price</Th>
              <Th right>vs Current</Th>
            </tr>
          </thead>
          <tbody>
            {rateSensitivity.map((r) => {
              const isCurrent = r.delta === 0;
              const diff = r.purchase - maxPurchase;
              return (
                <tr
                  key={r.rate}
                  className={[
                    "border-b border-surface-border/50 transition-colors",
                    isCurrent ? "bg-gold-muted/10 outline outline-1 outline-gold/30" : "hover:bg-surface-elevated",
                  ].join(" ")}
                >
                  <Td>
                    <span className="font-mono tabular-nums text-content-primary">{fmtPct(r.rate)}</span>
                    {isCurrent && (
                      <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-gold bg-gold-muted/40 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </Td>
                  <Td right mono color="text-content-primary">{fmt(r.purchase)}</Td>
                  <Td right mono color={isCurrent ? "text-content-disabled" : diff > 0 ? "text-emerald-light" : "text-rose-light"}>
                    {isCurrent ? "—" : diff > 0 ? `+${fmt(diff)}` : `(${fmt(Math.abs(diff))})`}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 8. PMICalculator ─────────────────────────────────────────────────────────

export interface PMICalculatorProps {
  purchasePrice: number;
  downPct: number;
  rate: number;
  loanAmount: number;
}

export function PMICalculator({ purchasePrice, downPct, rate, loanAmount }: PMICalculatorProps) {
  const PMI_RATE = 0.007; // 0.7% annual default
  const monthlyPMI = (loanAmount * PMI_RATE) / 12;
  const noPMI = downPct >= 20;

  // Months until LTV reaches 80% (by request) and 78% (automatic)
  const pmiMonths80 = useMemo(() => {
    if (noPMI) return 0;
    const r = rate / 12 / 100;
    const n = 30 * 12;
    const mp = monthlyPayment(loanAmount, rate, 30);
    let bal = loanAmount;
    const target80 = purchasePrice * 0.80;
    for (let mo = 1; mo <= n; mo++) {
      const int = bal * r;
      bal -= (mp - int);
      if (bal <= target80) return mo;
    }
    return n;
  }, [loanAmount, rate, purchasePrice, noPMI]);

  const pmiMonths78 = useMemo(() => {
    if (noPMI) return 0;
    const r = rate / 12 / 100;
    const n = 30 * 12;
    const mp = monthlyPayment(loanAmount, rate, 30);
    let bal = loanAmount;
    const target78 = purchasePrice * 0.78;
    for (let mo = 1; mo <= n; mo++) {
      const int = bal * r;
      bal -= (mp - int);
      if (bal <= target78) return mo;
    }
    return n;
  }, [loanAmount, rate, purchasePrice, noPMI]);

  const totalPMIPaid = monthlyPMI * pmiMonths78;

  // Cost vs a 10% down buyer at current price
  const loan10 = purchasePrice * 0.90;
  const pmi10Monthly = (loan10 * PMI_RATE) / 12;
  const savings = noPMI ? pmi10Monthly : 0;

  // Extra down needed to avoid PMI
  const currentDown = purchasePrice * (downPct / 100);
  const requiredDown20 = purchasePrice * 0.20;
  const extraNeeded = Math.max(0, requiredDown20 - currentDown);

  if (noPMI) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-muted/20 border border-emerald/20">
          <CheckCircle className="w-5 h-5 text-emerald shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-emerald-light">No PMI — you put enough down.</p>
            <p className="text-[12px] text-content-secondary mt-1">
              This saves you{" "}
              <span className="font-mono font-semibold text-content-primary">{fmt(pmi10Monthly)}/mo</span>{" "}
              compared to a 10% down buyer on the same property.
              Over 5 years that&apos;s{" "}
              <span className="font-mono font-semibold text-emerald-light">{fmt(pmi10Monthly * 60)}</span> in PMI you never pay.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="card !p-3">
          <SectionLabel><Term id="pmi">PMI</Term> monthly</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-rose-light">{fmt(monthlyPMI)}/mo</p>
          <p className="text-[10px] text-content-disabled">0.7% of loan/yr</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Drops at 80% <Term id="ltv">LTV</Term> (request)</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-amber">Month {pmiMonths80}</p>
          <p className="text-[10px] text-content-disabled">You must request removal</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Auto-cancels at 78% LTV</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-content-primary">Month {pmiMonths78}</p>
          <p className="text-[10px] text-content-disabled">Federal law (HPA 1998)</p>
        </div>
        <div className="card !p-3">
          <SectionLabel>Total PMI paid</SectionLabel>
          <p className="font-mono tabular-nums text-base font-bold text-rose-light">{fmt(totalPMIPaid)}</p>
          <p className="text-[10px] text-content-disabled">Before auto-cancel</p>
        </div>
      </div>

      {/* Rate breakdown */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full" aria-label="PMI cost timeline">
          <thead className="bg-surface-elevated border-b border-surface-border">
            <tr>
              <Th>Milestone</Th>
              <Th right>Month</Th>
              <Th right>LTV at That Point</Th>
              <Th right>PMI Paid to Date</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-surface-border/50 hover:bg-surface-elevated transition-colors">
              <Td><span className="text-content-primary">You can request removal</span></Td>
              <Td right mono color="text-amber">Month {pmiMonths80}</Td>
              <Td right mono color="text-amber">80.0%</Td>
              <Td right mono color="text-rose-light">{fmt(monthlyPMI * pmiMonths80)}</Td>
            </tr>
            <tr className="border-b border-surface-border/50 hover:bg-surface-elevated transition-colors">
              <Td><span className="text-content-primary">Automatic cancellation</span></Td>
              <Td right mono color="text-emerald-light">Month {pmiMonths78}</Td>
              <Td right mono color="text-emerald-light">78.0%</Td>
              <Td right mono color="text-rose-light">{fmt(totalPMIPaid)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {extraNeeded > 0 && (
        <InfoBox color="rose">
          <Term id="pmi">PMI</Term> costs you {fmt(monthlyPMI)}/mo ({fmt(totalPMIPaid)} total before
          it drops off at month {pmiMonths78}). To avoid PMI entirely, you need{" "}
          <span className="font-semibold font-mono">{fmt(extraNeeded)}</span> more in down payment
          to reach 20%.
        </InfoBox>
      )}
    </div>
  );
}
