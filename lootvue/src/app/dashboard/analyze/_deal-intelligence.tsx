"use client";

import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Zap, Clock, DollarSign, Target, BarChart2, Flame } from "lucide-react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const mono = "font-mono tabular-nums";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label mb-3">{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}

function BarTrack({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
      {children}
    </div>
  );
}

// ─── 1. OpportunityRank ────────────────────────────────────────────────────────

interface OpportunityRankProps {
  score: number;
  totalListings?: number;
}

export function OpportunityRank({ score, totalListings = 847 }: OpportunityRankProps) {
  // Map score (0–100) to percentile rank: score 80 → top 12%, score 60 → top 40%
  const topPct = Math.round(Math.max(1, 100 - score * 0.88));
  const rank = Math.round((topPct / 100) * totalListings);

  const ctx =
    topPct <= 10 ? { label: "Exceptional deal", color: CHART_COLORS.emerald, cls: "text-emerald-light" }
    : topPct <= 25 ? { label: "Above average", color: CHART_COLORS.gold, cls: "text-gold" }
    : { label: "Keep looking", color: CHART_COLORS.rose, cls: "text-rose-light" };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-gold" aria-hidden="true" />
          <SectionLabel>Opportunity Rank</SectionLabel>
        </div>

        <p className="text-[13px] text-content-secondary mb-3">
          This property ranks{" "}
          <span className={`${mono} font-bold text-content-primary`}>#{rank.toLocaleString()}</span>
          {" "}out of{" "}
          <span className={`${mono} text-content-primary`}>{totalListings.toLocaleString()}</span>
          {" "}active listings in this market.
        </p>

        <BarTrack>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: "100%", background: `linear-gradient(to right, ${CHART_COLORS.emerald}, ${CHART_COLORS.amber}, ${CHART_COLORS.rose})` }}
          />
          {/* Gold marker at property's position */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-surface bg-gold shadow-lg transition-all duration-500"
            style={{ left: `calc(${topPct}% - 6px)` }}
            aria-label={`Property is in top ${topPct}%`}
          />
        </BarTrack>

        <div className="flex justify-between mt-1 mb-3">
          <span className="text-[10px] text-emerald-light">Best</span>
          <span className="text-[10px] text-rose-light">Worst</span>
        </div>

        <p className={`text-[12px] font-semibold ${ctx.cls}`}>
          Top {topPct}% — {ctx.label}
        </p>
      </Card>
    </motion.div>
  );
}

// ─── 2. MoneyLeftOnTable ───────────────────────────────────────────────────────

interface MoneyLeftOnTableProps {
  listPrice: number;
  compMedian: number;
  suggestedOffer: number;
}

export function MoneyLeftOnTable({ listPrice, compMedian, suggestedOffer }: MoneyLeftOnTableProps) {
  const overPay = listPrice - suggestedOffer;
  const vsComps = listPrice - compMedian;
  const isBelowMarket = vsComps < 0;
  const max = Math.max(listPrice, compMedian, suggestedOffer);

  const bars = [
    { label: "List Price", val: listPrice, color: CHART_COLORS.amber },
    { label: "Comp Median", val: compMedian, color: CHART_COLORS.gold },
    { label: "Suggested Offer", val: suggestedOffer, color: CHART_COLORS.emerald },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-gold" aria-hidden="true" />
          <SectionLabel>Money Left on Table</SectionLabel>
        </div>

        <p className="text-[13px] text-content-secondary mb-4">
          {isBelowMarket ? (
            <span>
              Already{" "}
              <span className="text-emerald-light font-semibold">{formatCurrency(Math.abs(vsComps))} below market</span>
              {" "}— move fast before another investor notices.
            </span>
          ) : (
            <span>
              Offering asking price = overpaying{" "}
              <span className="text-rose-light font-semibold">{formatCurrency(overPay)}</span>.
              {" "}That's{" "}
              <span className={`${mono} text-rose-light`}>{Math.round((overPay / suggestedOffer) * 100)}%</span>
              {" "}of your next down payment.
            </span>
          )}
        </p>

        <div className="space-y-2.5">
          {bars.map(({ label, val, color }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-content-tertiary">{label}</span>
                <span className={`${mono} text-[12px] text-content-primary`}>{formatCurrency(val)}</span>
              </div>
              <BarTrack>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${(val / max) * 100}%`, backgroundColor: color }}
                />
              </BarTrack>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── 3. DealSpeedScore ────────────────────────────────────────────────────────

interface DealSpeedScoreProps {
  dom: number;
  avgDomArea: number;
  priceDropCount: number;
}

export function DealSpeedScore({ dom, avgDomArea, priceDropCount }: DealSpeedScoreProps) {
  const ratio = dom / avgDomArea;

  const signal =
    ratio < 0.8
      ? { emoji: "HOT", icon: <Flame className="w-4 h-4 text-rose-light" aria-hidden="true" />, color: "text-rose-light", border: "border-rose/20", msg: `Properties like this sell in ${avgDomArea} days. This one listed ${dom} days ago. ACT NOW.` }
      : ratio > 1.5
      ? { emoji: "STALE", icon: <Clock className="w-4 h-4 text-amber-light" aria-hidden="true" />, color: "text-amber-light", border: "border-amber/20", msg: `Listed ${dom} days, avg is ${avgDomArea}. Seller is getting desperate — negotiate hard.` }
      : { emoji: "NORMAL", icon: <Zap className="w-4 h-4 text-content-secondary" aria-hidden="true" />, color: "text-content-secondary", border: "border-surface-border", msg: `Moving at market pace (${dom}d vs ${avgDomArea}d avg). Standard negotiation applies.` };

  // Gauge: 0% = very hot, 100% = very stale. 50% = market pace.
  const gaugePos = Math.min(100, Math.max(0, (ratio - 0.5) * 67));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {signal.icon}
            <SectionLabel>
              <Term id="dom">Deal Speed</Term>
            </SectionLabel>
          </div>
          <span className={`badge-gold text-[10px] font-bold tracking-widest ${signal.border} ${signal.color}`}>{signal.emoji}</span>
        </div>

        {/* Gauge bar — Hot on left, Stale on right */}
        <div className="relative h-3 w-full rounded-full mb-1 overflow-hidden" style={{ background: `linear-gradient(to right, ${CHART_COLORS.rose}, ${CHART_COLORS.amber}, ${CHART_COLORS.emerald})` }}>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-white/80 shadow-lg transition-all duration-500"
            style={{ left: `calc(${gaugePos}% - 7px)` }}
            aria-label={`${dom} days on market vs ${avgDomArea} day average`}
          />
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-[10px] text-rose-light">Hot</span>
          <span className="text-[10px] text-emerald-light">Stale</span>
        </div>

        <p className="text-[13px] text-content-secondary">{signal.msg}</p>
        {priceDropCount > 0 && (
          <p className="text-[12px] text-amber-light mt-2">
            {priceDropCount} price {priceDropCount === 1 ? "drop" : "drops"} — seller is motivated.
          </p>
        )}
      </Card>
    </motion.div>
  );
}

// ─── 4. CostOfWaiting ─────────────────────────────────────────────────────────

interface CostOfWaitingProps {
  monthlyRent: number;
  expenses: number;
  mortgage: number;
  appreciation: number;
  purchasePrice: number;
  downPayment: number;
}

export function CostOfWaiting({ monthlyRent, expenses, mortgage, appreciation, purchasePrice, downPayment }: CostOfWaitingProps) {
  const cashFlow = monthlyRent - expenses - mortgage;
  const equity = mortgage * 0.28; // ~28% of P&I is principal in first years
  const apprecMonth = Math.round((purchasePrice * (appreciation / 100)) / 12);
  const taxBenefit = Math.round(((purchasePrice * 0.8) / 27.5 / 12) * 0.24);
  const total = Math.round(cashFlow + equity + apprecMonth + taxBenefit);

  const components = [
    { label: "Cash Flow", val: cashFlow, color: cashFlow >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose },
    { label: "Equity Buildup", val: equity, color: CHART_COLORS.gold },
    { label: "Appreciation", val: apprecMonth, color: CHART_COLORS.goldLight },
    { label: "Tax Benefit", val: taxBenefit, color: CHART_COLORS.amber },
  ];

  const maxComponent = Math.max(...components.map(c => Math.abs(c.val)), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-rose-light" aria-hidden="true" />
          <SectionLabel>Cost of Waiting</SectionLabel>
        </div>

        <div className="space-y-2 mb-4">
          {components.map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[11px] text-content-tertiary w-28 shrink-0">{label}</span>
              <div className="flex-1">
                <BarTrack>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${(Math.abs(val) / maxComponent) * 100}%`, backgroundColor: color }}
                  />
                </BarTrack>
              </div>
              <span className={`${mono} text-[12px] w-16 text-right`} style={{ color }}>
                {formatCurrency(Math.round(val))}/mo
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-surface-border pt-3">
          <p className="text-[13px] text-content-secondary">
            Every month of inaction costs you{" "}
            <span className={`${mono} font-bold text-rose-light`}>{formatCurrency(total)}</span>
            {" "}in wealth that could have been yours.
          </p>
          <p className="text-[12px] text-content-tertiary mt-1">
            In 6 months of deliberation: <span className={`${mono} text-rose-light`}>{formatCurrency(total * 6)}</span> lost.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── 5. PassiveIncomeCalculator ────────────────────────────────────────────────

interface PassiveIncomeCalculatorProps {
  monthlyCashFlow: number;
  targetIncome?: number;
}

export function PassiveIncomeCalculator({ monthlyCashFlow, targetIncome = 7000 }: PassiveIncomeCalculatorProps) {
  const propertiesNeeded = monthlyCashFlow > 0 ? Math.ceil(targetIncome / monthlyCashFlow) : 99;
  const yearsAt2PerYear = Math.ceil(propertiesNeeded / 2);
  const pctProgress = Math.min(100, Math.round((1 / propertiesNeeded) * 100));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }}>
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-light" aria-hidden="true" />
          <SectionLabel>Passive Income Path</SectionLabel>
        </div>

        <p className="text-[13px] text-content-secondary mb-1">
          To replace a <span className={`${mono} text-content-primary`}>$85K salary</span> with rental cash flow:
        </p>

        <div className="flex items-baseline gap-1 mb-3">
          <span className={`${mono} text-3xl font-bold text-content-primary`}>{propertiesNeeded}</span>
          <span className="text-[13px] text-content-secondary">
            properties at <span className={`${mono} text-gold`}>{formatCurrency(monthlyCashFlow)}/mo</span> each
          </span>
        </div>

        <BarTrack>
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald transition-all duration-700"
            style={{ width: `${pctProgress}%` }}
          />
        </BarTrack>
        <p className={`${mono} text-[11px] text-content-tertiary mt-1 mb-3`}>{pctProgress}% to financial freedom</p>

        <p className="text-[12px] text-content-secondary">
          At 2 deals/year:{" "}
          <span className="text-emerald-light font-semibold">{yearsAt2PerYear} years to replace your income.</span>
        </p>
        <p className="text-[11px] text-content-tertiary mt-1">
          The first deal is the hardest. Each one after funds the next down payment.
        </p>
      </Card>
    </motion.div>
  );
}

// ─── 6. WhatWouldAProDo ────────────────────────────────────────────────────────

interface WhatWouldAProDoProps {
  dom: number;
  avgDom: number;
  listPrice: number;
  compMedian: number;
  rate: number;
  score: number;
  marketSignal: string;
}

export function WhatWouldAProDo({ dom, avgDom, listPrice, compMedian, rate }: WhatWouldAProDoProps) {
  const sellerHasLeverage = dom < avgDom;
  const offerPct = sellerHasLeverage ? 0.97 : 0.94;
  const offerPrice = Math.round(listPrice * offerPct);
  const concession = Math.round(listPrice * 0.025);
  const negotiationSavings = (listPrice - offerPrice) + concession;
  const dailyVacancyCost = Math.round((compMedian * 0.008) / 30);
  const rateLabel = rate < 6.5 ? "favorable" : rate < 7.5 ? "elevated but workable" : "unfavorable — consider points";

  const steps = [
    { n: 1, action: "OFFER", detail: `Offer ${formatCurrency(offerPrice)} (${Math.round((1 - offerPct) * 100)}% below asking). DOM is ${dom} — ${sellerHasLeverage ? "seller has leverage, stay close" : "you have leverage, push harder"}.` },
    { n: 2, action: "NEGOTIATE", detail: `Request ${formatCurrency(concession)} seller concession toward closing costs. Standard in this market.` },
    { n: 3, action: "INSPECT", detail: `Budget $450–600 for inspection. Use findings to negotiate ${formatCurrency(Math.round(negotiationSavings * 0.3))}–${formatCurrency(Math.round(negotiationSavings * 0.5))} more off price.` },
    { n: 4, action: "FINANCE", detail: `Lock rate within 48hrs of accepted offer. Today's ${rate.toFixed(2)}% is ${rateLabel}.` },
    { n: 5, action: "CLOSE", detail: `Target 30-day close. Fast close = negotiating leverage with seller.` },
    { n: 6, action: "POST-CLOSE", detail: `List for rent within 7 days. Target move-in by Day 45. Every vacant day costs ${formatCurrency(dailyVacancyCost)}.` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.14 }}>
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-gold" aria-hidden="true" />
          <SectionLabel>Expert Playbook</SectionLabel>
        </div>

        <div className="space-y-3">
          {steps.map(({ n, action, detail }) => (
            <div key={n} className="flex gap-3">
              <div
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${mono}`}
                style={{ backgroundColor: `${CHART_COLORS.gold}18`, color: CHART_COLORS.gold, border: `1px solid ${CHART_COLORS.gold}30` }}
                aria-label={`Step ${n}`}
              >
                {n}
              </div>
              <div>
                <span className="text-[11px] font-bold text-content-primary tracking-wide">{action} — </span>
                <span className="text-[12px] text-content-secondary">{detail}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── 7. WealthTrajectory ───────────────────────────────────────────────────────

interface WealthTrajectoryProps {
  cashFlowPerDeal: number;
  equityPerDeal: number;
  dealsPerYear?: number;
}

export function WealthTrajectory({ cashFlowPerDeal, equityPerDeal, dealsPerYear = 2 }: WealthTrajectoryProps) {
  const APPRECIATION = 0.03;
  const RENT_GROWTH = 0.02;
  const AVG_PRICE = equityPerDeal / 0.25; // infer price from 25% down payment

  const rows: { year: number; props: number; moCF: number; equity: number; netWorth: number }[] = [];
  let cumEquity = 0;
  let cfPerProp = cashFlowPerDeal;

  for (let yr = 1; yr <= 10; yr++) {
    const numProps = yr * dealsPerYear;
    cfPerProp = cashFlowPerDeal * Math.pow(1 + RENT_GROWTH, yr - 1);
    const moCF = Math.round(numProps * cfPerProp);
    cumEquity += numProps * AVG_PRICE * APPRECIATION + equityPerDeal * dealsPerYear;
    const netWorth = Math.round(cumEquity);
    rows.push({ year: yr, props: numProps, moCF, equity: Math.round(cumEquity), netWorth });
  }

  const maxNW = rows[rows.length - 1]!.netWorth;
  const highlight = [rows[2]!, rows[4]!, rows[9]!]; // yr 3, 5, 10

  // Inline SVG path — no chart library needed
  const w = 280;
  const h = 60;
  const points = rows.map((r, i) => {
    const x = (i / (rows.length - 1)) * w;
    const y = h - (r.netWorth / maxNW) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.16 }}>
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gold" aria-hidden="true" />
          <SectionLabel>Wealth Trajectory</SectionLabel>
        </div>

        {/* Inline SVG sparkline */}
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full mb-3"
          style={{ height: 60 }}
          aria-label="Net worth growth curve over 10 years"
          role="img"
        >
          <defs>
            <linearGradient id="wt-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity="0.4" />
              <stop offset="100%" stopColor={CHART_COLORS.goldLight} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d={points} fill="none" stroke="url(#wt-grad)" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Milestone callouts */}
        <div className="flex gap-3 mb-4">
          {highlight.map(r => (
            <div key={r.year} className="flex-1 rounded-lg bg-surface-elevated p-2 text-center">
              <p className={`${mono} text-[13px] font-bold text-content-primary`}>
                {r.netWorth >= 1_000_000
                  ? `$${(r.netWorth / 1_000_000).toFixed(1)}M`
                  : `$${Math.round(r.netWorth / 1000)}K`}
              </p>
              <p className="text-[10px] text-content-tertiary">Year {r.year}</p>
            </div>
          ))}
        </div>

        {/* Table — motion NOT on tr/td */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" aria-label="Wealth trajectory by year">
            <thead>
              <tr className="border-b border-surface-border">
                {["Yr", "Props", "Mo CF", "Net Worth"].map(col => (
                  <th key={col} scope="col" className="text-left text-content-tertiary pb-1.5 pr-3 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.filter((_, i) => [0, 1, 2, 4, 6, 9].includes(i)).map(r => (
                <tr key={r.year} className="border-b border-surface-border/40">
                  <td className={`${mono} py-1.5 pr-3 text-content-tertiary`}>{r.year}</td>
                  <td className={`${mono} py-1.5 pr-3 text-content-secondary`}>{r.props}</td>
                  <td className={`${mono} py-1.5 pr-3 text-emerald-light`}>{formatCurrency(r.moCF)}</td>
                  <td className={`${mono} py-1.5 font-semibold text-content-primary`}>
                    {r.netWorth >= 1_000_000 ? `$${(r.netWorth / 1_000_000).toFixed(1)}M` : `$${Math.round(r.netWorth / 1000)}K`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-content-disabled mt-3">
          Assumes {(APPRECIATION * 100).toFixed(0)}% annual appreciation, {(RENT_GROWTH * 100).toFixed(0)}% rent growth, consistent deal quality. Not a guarantee.
        </p>
      </Card>
    </motion.div>
  );
}

// ─── 8. OpportunityCost ────────────────────────────────────────────────────────

interface OpportunityCostProps {
  downPayment: number;
  totalReturn5yr: number;
  holdYears?: number;
}

export function OpportunityCost({ downPayment, totalReturn5yr, holdYears = 5 }: OpportunityCostProps) {
  const sp500 = Math.round(downPayment * Math.pow(1.10, holdYears));
  const hysa = Math.round(downPayment * Math.pow(1.045, holdYears));
  const inflation = Math.round(downPayment * Math.pow(0.97, holdYears));
  const thisDeal = Math.round(downPayment + totalReturn5yr);

  const annualizedRE = (Math.pow(thisDeal / downPayment, 1 / holdYears) - 1) * 100;

  const winVsSP = thisDeal - sp500;
  const winVsHYSA = thisDeal - hysa;

  const rows = [
    { label: "This Deal", yr5: thisDeal, ann: annualizedRE, tax: "Depreciation", color: CHART_COLORS.gold },
    { label: "S&P 500 (10%)", yr5: sp500, ann: 10, tax: "Capital gains", color: CHART_COLORS.emerald },
    { label: "HYSA (4.5%)", yr5: hysa, ann: 4.5, tax: "Ordinary income", color: CHART_COLORS.amber },
    { label: "Doing Nothing", yr5: inflation, ann: -3, tax: "None", color: CHART_COLORS.rose },
  ];

  const maxVal = Math.max(...rows.map(r => r.yr5));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.18 }}>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-light" aria-hidden="true" />
            <SectionLabel>Opportunity Cost</SectionLabel>
          </div>
          <span className="text-[10px] text-content-tertiary">{holdYears}-yr comparison</span>
        </div>

        {/* Bar comparison */}
        <div className="space-y-2.5 mb-4">
          {rows.map(({ label, yr5, color }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-content-tertiary">{label}</span>
                <span className={`${mono} text-[12px] font-semibold`} style={{ color }}>
                  {yr5 >= 1_000_000 ? `$${(yr5 / 1_000_000).toFixed(2)}M` : `$${Math.round(yr5 / 1000)}K`}
                </span>
              </div>
              <BarTrack>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${(yr5 / maxVal) * 100}%`, backgroundColor: color }}
                />
              </BarTrack>
            </div>
          ))}
        </div>

        {/* Table — motion NOT on tr/td */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-[11px]" aria-label="Investment comparison table">
            <thead>
              <tr className="border-b border-surface-border">
                {["", `Year ${holdYears}`, "Annual", "Tax"].map((h, i) => (
                  <th key={i} scope="col" className="text-left text-content-tertiary pb-1.5 pr-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className="border-b border-surface-border/40">
                  <td className="py-1.5 pr-2 text-content-secondary text-[11px]">{r.label}</td>
                  <td className={`${mono} py-1.5 pr-2 font-semibold`} style={{ color: r.color }}>
                    {r.yr5 >= 1_000_000 ? `$${(r.yr5 / 1_000_000).toFixed(2)}M` : `$${Math.round(r.yr5 / 1000)}K`}
                  </td>
                  <td className={`${mono} py-1.5 pr-2`} style={{ color: r.ann >= 0 ? r.color : CHART_COLORS.rose }}>
                    {r.ann > 0 ? "+" : ""}{r.ann.toFixed(1)}%
                  </td>
                  <td className="py-1.5 text-content-tertiary text-[10px]">{r.tax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[12px] text-content-secondary">
          Real estate wins by{" "}
          <span className={`${mono} font-bold text-emerald-light`}>{formatCurrency(winVsSP)}</span>
          {" "}over index funds and{" "}
          <span className={`${mono} font-bold text-emerald-light`}>{formatCurrency(winVsHYSA)}</span>
          {" "}over savings — plus tax benefits stocks don't offer.
        </p>
      </Card>
    </motion.div>
  );
}
