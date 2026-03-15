"use client";

import { CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface Comparison {
  label: string;
  yourValue: number;
  benchmark: number;
  benchmarkLabel: string;
  higherIsBetter: boolean;
  format?: (v: number) => string;
}

interface DecisionRuleProps {
  metric: string;
  value: number;
  format?: (v: number) => string;
  comparisons: Comparison[];
  rule: string;
  action: string;
  compact?: boolean;
}

function formatDefault(v: number): string {
  return v.toLocaleString();
}

export default function DecisionRule({ metric, value, format = formatDefault, comparisons, rule, action, compact }: DecisionRuleProps) {
  const passing = comparisons.filter((c) =>
    c.higherIsBetter ? c.yourValue >= c.benchmark : c.yourValue <= c.benchmark
  ).length;
  const total = comparisons.length;
  const allPass = passing === total;
  const anyFail = passing < total;

  return (
    <div className={`rounded-lg border ${allPass ? "border-money-800/40 bg-money-950/20" : anyFail && passing === 0 ? "border-red-800/40 bg-red-950/20" : "border-gold-800/40 bg-gold-950/20"} ${compact ? "p-3" : "p-4"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{metric}</span>
        <span className={`text-lg font-mono font-bold ${allPass ? "text-money-400" : passing === 0 ? "text-red-400" : "text-gold-400"}`}>
          {format(value)}
        </span>
      </div>

      {/* Comparisons */}
      <div className={`space-y-1.5 ${compact ? "text-xs" : "text-sm"}`}>
        {comparisons.map((c, i) => {
          const fmt = c.format ?? format;
          const passes = c.higherIsBetter ? c.yourValue >= c.benchmark : c.yourValue <= c.benchmark;
          const diff = c.yourValue - c.benchmark;
          const diffAbs = Math.abs(diff);

          return (
            <div key={i} className="flex items-center gap-2">
              {passes ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-money-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              )}
              <span className="text-gray-400 flex-1">
                vs {c.benchmarkLabel}: <span className="font-mono text-gray-300">{fmt(c.benchmark)}</span>
              </span>
              <span className={`font-mono font-medium ${passes ? "text-money-400" : "text-red-400"}`}>
                {passes
                  ? (c.higherIsBetter ? "YOURS HIGHER" : "YOURS LOWER")
                  : (c.higherIsBetter ? `${fmt(diffAbs)} SHORT` : `${fmt(diffAbs)} OVER`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rule + Action */}
      <div className={`mt-3 pt-3 border-t ${allPass ? "border-money-800/30" : "border-surface-border"}`}>
        <div className="flex items-start gap-2 text-xs">
          <span className="text-gray-600 font-medium uppercase flex-shrink-0">RULE:</span>
          <span className="text-gray-400">{rule}</span>
        </div>
        <div className="flex items-start gap-2 text-xs mt-1.5">
          <span className={`font-medium uppercase flex-shrink-0 ${allPass ? "text-money-500" : "text-gold-500"}`}>ACTION:</span>
          <span className={allPass ? "text-money-400" : "text-gold-400"}>{action}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-built decision rule configurations for common RE metrics
// ---------------------------------------------------------------------------

const pct = (v: number) => `${v.toFixed(1)}%`;
const usd = (v: number) => `$${Math.round(v).toLocaleString()}`;
const ratio = (v: number) => `${v.toFixed(1)}x`;

export function capRateRule(value: number, marketAvg: number, portfolioAvg?: number) {
  const comparisons: Comparison[] = [
    { label: "Market Avg", yourValue: value, benchmark: marketAvg, benchmarkLabel: "Market Avg", higherIsBetter: true, format: pct },
    { label: "Investor Threshold", yourValue: value, benchmark: 6, benchmarkLabel: "6% Threshold", higherIsBetter: true, format: pct },
  ];
  if (portfolioAvg !== undefined) {
    comparisons.push({ label: "Portfolio Avg", yourValue: value, benchmark: portfolioAvg, benchmarkLabel: "Your Portfolio Avg", higherIsBetter: true, format: pct });
  }

  const aboveMarket = value > marketAvg;
  const aboveThreshold = value > 6;

  return {
    metric: "Cap Rate",
    value,
    format: pct,
    comparisons,
    rule: aboveMarket && aboveThreshold
      ? "Cap Rate > 6% AND > Market Avg = PROCEED"
      : !aboveThreshold
        ? "Cap Rate < 6% = Below investor threshold"
        : "Cap Rate < Market Avg = Below-market yield",
    action: aboveMarket && aboveThreshold
      ? "This property yields above market — proceed to stress test"
      : portfolioAvg && value < portfolioAvg
        ? `Negotiate price down ${usd(Math.round((portfolioAvg - value) / portfolioAvg * 100))}% to match your portfolio avg of ${pct(portfolioAvg)}`
        : "Consider negotiating or look for higher-yield properties",
  };
}

export function dscrRule(value: number) {
  return {
    metric: "DSCR (Debt Service Coverage)",
    value,
    format: (v: number) => v.toFixed(2),
    comparisons: [
      { label: "Breakeven", yourValue: value, benchmark: 1.0, benchmarkLabel: "1.0 Breakeven", higherIsBetter: true, format: (v: number) => v.toFixed(2) },
      { label: "Strong", yourValue: value, benchmark: 1.25, benchmarkLabel: "1.25 Strong", higherIsBetter: true, format: (v: number) => v.toFixed(2) },
    ],
    rule: value >= 1.25
      ? "DSCR ≥ 1.25 = Strong debt coverage — rent covers mortgage + 25% buffer"
      : value >= 1.0
        ? "DSCR 1.0-1.25 = Marginal — one vacancy or repair could flip to negative"
        : "DSCR < 1.0 = DANGER — rent doesn't cover mortgage",
    action: value >= 1.25
      ? "Debt is well covered — proceed"
      : value >= 1.0
        ? `Increase down payment by ${Math.round((1.25 - value) * 20)}% or negotiate price down to bring DSCR to 1.25`
        : "DO NOT proceed — this property loses money from day one at current terms",
  };
}

export function cashFlowRule(value: number) {
  return {
    metric: "Monthly Cash Flow",
    value,
    format: usd,
    comparisons: [
      { label: "Breakeven", yourValue: value, benchmark: 0, benchmarkLabel: "$0 Breakeven", higherIsBetter: true, format: usd },
      { label: "Good", yourValue: value, benchmark: 300, benchmarkLabel: "$300 Good", higherIsBetter: true, format: usd },
      { label: "Strong", yourValue: value, benchmark: 500, benchmarkLabel: "$500 Strong", higherIsBetter: true, format: usd },
    ],
    rule: value >= 500
      ? "Cash flow > $500/mo = Strong — property pays for itself with buffer"
      : value >= 300
        ? "Cash flow $300-500/mo = Good — comfortable margin for repairs"
        : value > 0
          ? "Cash flow < $300/mo = Thin — any expense wipes profit"
          : "Negative cash flow = You're paying to own this property",
    action: value >= 300
      ? "Healthy cash flow — this property contributes to your passive income goal"
      : value > 0
        ? "Raise rent or reduce expenses to improve margin"
        : "Increase down payment, negotiate price, or pass on this deal",
  };
}

export function priceVsCompsRule(askingPrice: number, impliedValue: number) {
  const discount = ((impliedValue - askingPrice) / impliedValue) * 100;
  return {
    metric: "Price vs Comps",
    value: askingPrice,
    format: usd,
    comparisons: [
      { label: "Comp-implied value", yourValue: impliedValue, benchmark: askingPrice, benchmarkLabel: "Asking Price", higherIsBetter: true, format: usd },
    ],
    rule: discount > 10
      ? `Asking ${discount.toFixed(0)}% BELOW comp value = Instant equity on close`
      : discount > 0
        ? `Asking ${discount.toFixed(0)}% below comps = Fair deal, room to negotiate`
        : `Asking ${Math.abs(discount).toFixed(0)}% ABOVE comp value = Overpaying`,
    action: discount > 10
      ? "Strong value play — submit offer quickly before another buyer catches it"
      : discount > 0
        ? `Offer at ${usd(Math.round(impliedValue * 0.95))} (5% below comps) for optimal entry`
        : `Negotiate down to at least ${usd(impliedValue)} or walk away`,
  };
}

export function domRule(value: number, marketAvg: number) {
  return {
    metric: "Days on Market",
    value,
    format: (v: number) => `${Math.round(v)} days`,
    comparisons: [
      { label: "Quick Sale", yourValue: value, benchmark: 30, benchmarkLabel: "30 days (fast)", higherIsBetter: false, format: (v: number) => `${Math.round(v)}d` },
      { label: "Market Avg", yourValue: value, benchmark: marketAvg, benchmarkLabel: "Market Avg", higherIsBetter: false, format: (v: number) => `${Math.round(v)}d` },
    ],
    rule: value < 30
      ? "DOM < 30 = Hot property — act fast, expect competition"
      : value > 60
        ? "DOM > 60 = Seller motivated — negotiate aggressively"
        : "DOM 30-60 = Normal — standard negotiation leverage",
    action: value < 30
      ? "Submit strong offer within 48 hours — waive minor contingencies if comfortable"
      : value > 60
        ? `Property sitting ${value - 30} days above market avg — offer 8-12% below ask`
        : "Standard process — offer 3-5% below ask with inspection contingency",
  };
}
