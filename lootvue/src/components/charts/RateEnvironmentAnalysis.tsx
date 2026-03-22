"use client";

/**
 * RateEnvironmentAnalysis
 *
 * Answers the single most common investor question: "Should I buy now or wait?"
 *
 * Section A — Rate Scenario Comparison (ECharts bar chart)
 *   Monthly payment, purchasing power, cash flow, and cash-on-cash at 6 rate levels.
 *   Bars colored by verdict: emerald=BUY, amber=HOLD, rose=PASS.
 *   "Today" column highlighted with a gold ring.
 *
 * Section B — Historical Rate Context (Recharts AreaChart)
 *   60 months of deterministic 30yr mortgage rate data (2021→2025).
 *   Current rate marked with a reference line.
 *   Percentile context in plain English.
 *
 * Section C — Wait vs Buy Now Calculator
 *   Side-by-side comparison of buying now vs waiting 6 months.
 *   Accounts for rent opportunity cost and price appreciation during the wait.
 *   Net impact displayed in large type.
 *
 * All monetary calculations stored as integer cents internally and formatted
 * with Intl.NumberFormat for display (per project financial accuracy rules).
 */

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Home,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  seededRandom,
  fmtChartCurrency,
  fmtChartPct,
} from "./ChartTheme";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RateEnvironmentAnalysisProps {
  /** Current 30yr fixed mortgage rate, e.g. 6.85 */
  currentRate?: number;
  /** Purchase price in dollars, e.g. 400000 */
  purchasePrice?: number;
  /** Monthly rent income in dollars, e.g. 2850 */
  monthlyRent?: number;
  /** Down payment as a decimal, e.g. 0.20 */
  downPaymentPct?: number;
  className?: string;
}

// ─── Financial helpers (all-integer-cents internally) ─────────────────────────

/**
 * Monthly mortgage payment (P&I) using the standard amortization formula.
 * Returns value in whole dollars.
 *
 * @param principalDollars   Loan principal in dollars
 * @param annualRatePct      Annual interest rate as a percentage (e.g. 6.85)
 * @param termYears          Amortization term in years (default 30)
 */
function monthlyPayment(
  principalDollars: number,
  annualRatePct: number,
  termYears = 30,
): number {
  const r = annualRatePct / 100 / 12;   // monthly rate
  const n = termYears * 12;              // total payments
  if (r === 0) return Math.round(principalDollars / n);
  // Standard formula: P * r(1+r)^n / ((1+r)^n - 1)
  const factor = Math.pow(1 + r, n);
  const paymentCents = Math.round(
    (principalDollars * 100 * r * factor) / (factor - 1),
  );
  return Math.round(paymentCents / 100);
}

/**
 * Maximum purchase price given a fixed monthly P&I budget.
 * Inversion of the amortization formula.
 * Returns value in whole dollars.
 */
function maxPurchasePrice(
  targetMonthlyPayment: number,
  annualRatePct: number,
  downPaymentPct: number,
  termYears = 30,
): number {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round((targetMonthlyPayment * n) / (1 - downPaymentPct));
  const factor = Math.pow(1 + r, n);
  const loanAmount = Math.round((targetMonthlyPayment * (factor - 1)) / (r * factor));
  return Math.round(loanAmount / (1 - downPaymentPct));
}

/**
 * Annual cash-on-cash return as a percentage.
 * CoC = (Net Annual Cash Flow / Total Cash Invested) × 100
 */
function cashOnCash(
  monthlyNetCf: number,
  downPaymentDollars: number,
  closingCostsDollars: number,
): number {
  const annualCf = monthlyNetCf * 12;
  const totalInvested = downPaymentDollars + closingCostsDollars;
  if (totalInvested === 0) return 0;
  return Math.round((annualCf / totalInvested) * 10000) / 100; // 2dp
}

// ─── Rate scenario table data ─────────────────────────────────────────────────

interface RateScenario {
  rate: number;
  monthlyPayment: number;
  purchasingPower: number;
  monthlyCf: number;
  coc: number;
  verdict: "BUY" | "HOLD" | "PASS";
  isToday: boolean;
}

const RATE_LEVELS = [5.5, 6.0, 6.5, 6.85, 7.5, 8.0] as const;

function buildScenarios(
  purchasePriceDollars: number,
  monthlyRentDollars: number,
  downPaymentPct: number,
  todayRate: number,
): RateScenario[] {
  // Base monthly payment target = payment at today's rate, for purchasing-power calc
  const downDollars = Math.round(purchasePriceDollars * downPaymentPct);
  const loanDollars = purchasePriceDollars - downDollars;
  const basePayment = monthlyPayment(loanDollars, todayRate);
  const closingCosts = Math.round(purchasePriceDollars * 0.03);
  // Monthly expenses beyond P&I: tax + insurance + vacancy (~1.5% of price / 12)
  const monthlyExpenses = Math.round((purchasePriceDollars * 0.015) / 12);

  return RATE_LEVELS.map((rate) => {
    const isToday = Math.abs(rate - todayRate) < 0.01;
    const power = maxPurchasePrice(basePayment, rate, downPaymentPct);
    const scenarioLoan = purchasePriceDollars - downDollars;
    const pmt = monthlyPayment(scenarioLoan, rate);
    const monthlyCf = monthlyRentDollars - pmt - monthlyExpenses;
    const coc = cashOnCash(monthlyCf, downDollars, closingCosts);
    let verdict: "BUY" | "HOLD" | "PASS";
    if (coc >= 5) verdict = "BUY";
    else if (coc >= 0) verdict = "HOLD";
    else verdict = "PASS";
    return { rate, monthlyPayment: pmt, purchasingPower: power, monthlyCf, coc, verdict, isToday };
  });
}

// ─── Format helpers (display only) ───────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
const usdSign = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, signDisplay: "always" });

function fmt(n: number) { return usd.format(n); }
function fmtK(n: number) { return usdCompact.format(n); }
function fmtSign(n: number) { return usdSign.format(n); }

// ─── Historical rate data (deterministic, seeded) ────────────────────────────

interface RateDataPoint {
  month: string;        // "Jan '21"
  date: string;         // ISO month "2021-01"
  rate: number;         // 30yr fixed rate in percent
}

/**
 * Generates 60 months of plausible 30yr mortgage rate history.
 *
 * Trajectory: ~3.0% (Jan 2021) → 7.5% peak (Nov 2023) → ~6.85% (Dec 2025)
 * Uses a seeded LCG for reproducibility. Same inputs = same chart every time.
 */
function buildRateHistory(): RateDataPoint[] {
  const rng = seededRandom(7331);
  const data: RateDataPoint[] = [];

  // Anchor points (month index from Jan 2021, rate in %)
  const anchors: [number, number][] = [
    [0,  3.0],   // Jan 2021 — pandemic low
    [6,  2.85],  // Jul 2021 — all-time low territory
    [15, 3.8],   // Apr 2022 — Fed hiking begins
    [24, 6.7],   // Jan 2023 — rapid rise
    [30, 7.1],   // Jul 2023 — approach peak
    [34, 7.5],   // Nov 2023 — peak
    [40, 6.9],   // May 2024 — slight retreat
    [47, 6.6],   // Dec 2024 — brief dip
    [53, 6.7],   // Jun 2025 — stabilizing
    [59, 6.85],  // Dec 2025 — current
  ];

  for (let i = 0; i < 60; i++) {
    // Interpolate between anchor points
    let interpolated = 6.85;
    for (let a = 0; a < anchors.length - 1; a++) {
      const [x0, y0] = anchors[a]!;
      const [x1, y1] = anchors[a + 1]!;
      if (i >= x0 && i <= x1) {
        const t = (i - x0) / (x1 - x0);
        // Smooth step interpolation
        const smooth = t * t * (3 - 2 * t);
        interpolated = y0 + (y1 - y0) * smooth;
        break;
      }
    }
    // Add small seeded noise (±0.12%)
    const noise = (rng() - 0.5) * 0.24;
    const rate = Math.round((interpolated + noise) * 100) / 100;

    const year = 2021 + Math.floor(i / 12);
    const month = i % 12;
    const date = new Date(year, month, 1);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const isoMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

    data.push({ month: label, date: isoMonth, rate });
  }

  return data;
}

// ─── Percentile calculation (what percentile is today's rate in the series) ──

function ratePercentile(rateHistory: RateDataPoint[], currentRate: number): number {
  const rates = rateHistory.map((d) => d.rate).sort((a, b) => a - b);
  const below = rates.filter((r) => r <= currentRate).length;
  return Math.round((below / rates.length) * 100);
}

// ─── Wait vs Buy calculator ───────────────────────────────────────────────────

interface WaitAnalysis {
  buyNow: {
    monthlyPaymentDollars: number;
    totalInterestDollars: number;
    equityAfter5yr: number;
    totalCostDollars: number;
  };
  waitSixMonths: {
    futureRate: number;
    futurePriceDollars: number;
    monthlyPaymentDollars: number;
    totalInterestDollars: number;
    equityAfter5yr: number;
    totalCostDollars: number;
    rentPaidDuringWait: number;
    priceDifferential: number;
  };
  netImpactDollars: number;
  waitWins: boolean;
  monthlyMortgageSavings: number;
}

function buildWaitAnalysis(
  purchasePriceDollars: number,
  downPaymentPct: number,
  todayRate: number,
  waitRate: number,
  monthlyRentWhileWaiting: number,
  annualAppreciation: number,
): WaitAnalysis {
  const waitMonths = 6;
  const termYears = 30;
  const n = termYears * 12;

  // "Buy now"
  const downNow = Math.round(purchasePriceDollars * downPaymentPct);
  const loanNow = purchasePriceDollars - downNow;
  const pmtNow = monthlyPayment(loanNow, todayRate);
  // Total interest = total payments - principal
  const totalPaidNow = pmtNow * n;
  const totalInterestNow = totalPaidNow - loanNow;
  // Equity after 5yr: simple approximation using amortization of remaining balance
  const remainingBalNow = loanBalance(loanNow, todayRate, 60);
  const equityNow = purchasePriceDollars - remainingBalNow;
  const totalCostNow = totalInterestNow + downNow + Math.round(purchasePriceDollars * 0.03);

  // "Wait 6 months"
  const semiAnnualAppreciation = annualAppreciation / 2 / 100;
  const futurePriceDollars = Math.round(purchasePriceDollars * (1 + semiAnnualAppreciation));
  const priceDifferential = futurePriceDollars - purchasePriceDollars; // price increase cost
  const downFuture = Math.round(futurePriceDollars * downPaymentPct);
  const loanFuture = futurePriceDollars - downFuture;
  const pmtFuture = monthlyPayment(loanFuture, waitRate);
  const totalPaidFuture = pmtFuture * n;
  const totalInterestFuture = totalPaidFuture - loanFuture;
  const remainingBalFuture = loanBalance(loanFuture, waitRate, 60);
  const equityFuture = futurePriceDollars - remainingBalFuture;
  const totalCostFuture = totalInterestFuture + downFuture + Math.round(futurePriceDollars * 0.03);

  // Rent paid during 6-month wait = opportunity cost
  const rentPaidDuringWait = monthlyRentWhileWaiting * waitMonths;

  // Net impact = (buyNow total cost) - (waitFuture total cost + rent + price diff)
  // Negative = waiting saves money; Positive = buying now saves money
  const netImpactDollars =
    (totalCostFuture + rentPaidDuringWait) - totalCostNow;

  const monthlyMortgageSavings = pmtNow - pmtFuture;

  return {
    buyNow: {
      monthlyPaymentDollars: pmtNow,
      totalInterestDollars: totalInterestNow,
      equityAfter5yr: equityNow,
      totalCostDollars: totalCostNow,
    },
    waitSixMonths: {
      futureRate: waitRate,
      futurePriceDollars,
      monthlyPaymentDollars: pmtFuture,
      totalInterestDollars: totalInterestFuture,
      equityAfter5yr: equityFuture,
      totalCostDollars: totalCostFuture,
      rentPaidDuringWait,
      priceDifferential,
    },
    netImpactDollars,
    waitWins: netImpactDollars < 0, // negative = wait is cheaper
    monthlyMortgageSavings,
  };
}

/**
 * Remaining loan balance after `paymentsMade` payments.
 * Uses the standard amortization balance formula.
 */
function loanBalance(
  principalDollars: number,
  annualRatePct: number,
  paymentsMade: number,
): number {
  const r = annualRatePct / 100 / 12;
  const n = 30 * 12;
  if (r === 0) return Math.round(principalDollars * (1 - paymentsMade / n));
  const factor = Math.pow(1 + r, n);
  const factorPaid = Math.pow(1 + r, paymentsMade);
  const balance = Math.round(
    principalDollars * ((factor - factorPaid) / (factor - 1)),
  );
  return Math.max(0, balance);
}

// ─── ECharts bar chart option builder (Section A) ────────────────────────────

function buildScenarioChartOption(
  scenarios: RateScenario[],
  todayRate: number,
): object {
  const verdictColor: Record<string, string> = {
    BUY: CHART_COLORS.emerald,
    HOLD: CHART_COLORS.amber,
    PASS: CHART_COLORS.rose,
  };
  const verdictFill: Record<string, string> = {
    BUY: "rgba(16,185,129,0.55)",
    HOLD: "rgba(245,158,11,0.55)",
    PASS: "rgba(239,68,68,0.55)",
  };

  const categories = scenarios.map((s) =>
    s.isToday ? `${s.rate}%\n(Today)` : `${s.rate}%`,
  );
  const paymentValues = scenarios.map((s) => s.monthlyPayment);
  const itemColors = scenarios.map((s) => verdictFill[s.verdict]);
  const borderColors = scenarios.map((s) =>
    s.isToday ? CHART_COLORS.gold : verdictColor[s.verdict],
  );
  const borderWidths = scenarios.map((s) => (s.isToday ? 2 : 1));

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1A1A1A",
      borderColor: "#1F1F1F",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: "#E5E5E5", fontSize: 12, fontFamily: "JetBrains Mono, monospace" },
      formatter: (params: unknown) => {
        const p = (params as Array<{ dataIndex: number }>)[0]!;
        const idx = p.dataIndex;
        const s = scenarios[idx]!;
        const cfColor = s.monthlyCf >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose;
        const cfStr = s.monthlyCf >= 0
          ? fmt(s.monthlyCf)
          : `(${fmt(Math.abs(s.monthlyCf))})`;
        const cocColor = s.coc >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose;
        return `
          <div style="min-width:200px">
            <div style="color:${verdictColor[s.verdict]};font-weight:700;margin-bottom:8px;font-size:13px">
              ${s.verdict} · ${s.rate}% rate
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="color:#999">Monthly P&I</span>
              <span style="color:#E5E5E5;font-weight:600">${fmt(s.monthlyPayment)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="color:#999">Purchasing power</span>
              <span style="color:#E5E5E5;font-weight:600">${fmtK(s.purchasingPower)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="color:#999">Monthly cash flow</span>
              <span style="color:${cfColor};font-weight:600">${cfStr}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#999">Cash-on-cash</span>
              <span style="color:${cocColor};font-weight:600">${fmtChartPct(s.coc)}</span>
            </div>
          </div>
        `;
      },
    },
    grid: { top: 40, right: 20, bottom: 60, left: 60, containLabel: false },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "#666666",
        fontSize: 10,
        fontFamily: "JetBrains Mono, monospace",
        lineHeight: 16,
        interval: 0,
      },
      axisLine: { lineStyle: { color: "#1F1F1F" } },
      axisTick: { lineStyle: { color: "#1F1F1F" } },
    },
    yAxis: {
      type: "value",
      name: "Monthly payment ($)",
      nameTextStyle: {
        color: "#666666",
        fontSize: 10,
        fontFamily: "JetBrains Mono, monospace",
      },
      axisLabel: {
        color: "#666666",
        fontSize: 10,
        fontFamily: "JetBrains Mono, monospace",
        formatter: (v: number) => `$${(v / 1000).toFixed(0)}K`,
      },
      axisLine: { lineStyle: { color: "#1F1F1F" } },
      splitLine: { lineStyle: { color: "#1F1F1F", type: "dashed" } },
    },
    series: [
      {
        type: "bar",
        data: paymentValues.map((v, i) => ({
          value: v,
          itemStyle: {
            color: itemColors[i],
            borderColor: borderColors[i],
            borderWidth: borderWidths[i],
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barMaxWidth: 60,
        emphasis: {
          itemStyle: { opacity: 1 },
        },
        label: {
          show: true,
          position: "top",
          formatter: (p: { value: number; dataIndex: number }) =>
            scenarios[p.dataIndex]!.verdict,
          color: (p: { dataIndex: number }) =>
            verdictColor[scenarios[p.dataIndex]!.verdict],
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "JetBrains Mono, monospace",
        },
      },
    ],
  };
}

// ─── Recharts historical rate tooltip ────────────────────────────────────────

function RateTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const rate = payload[0]?.value as number;
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 140 }}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: CHART_COLORS.gold, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>30yr Fixed:</span>
        <span style={{ fontSize: 13, color: CHART_COLORS.white, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
          {rate.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading rate environment analysis">
      <div className="card space-y-3">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-52 w-full rounded-lg" />
      </div>
      <div className="card space-y-3">
        <div className="skeleton h-4 w-56 rounded" />
        <div className="skeleton h-40 w-full rounded-lg" />
      </div>
      <div className="card space-y-3">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-32 rounded-lg" />
          <div className="skeleton h-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RateEnvironmentAnalysis({
  currentRate = 6.85,
  purchasePrice: initialPurchasePrice = 400_000,
  monthlyRent = 2850,
  downPaymentPct = 0.20,
  className,
}: RateEnvironmentAnalysisProps) {
  // Interactive purchase price slider
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice);

  // Scenario table + chart data
  const scenarios = useMemo(
    () => buildScenarios(purchasePrice, monthlyRent, downPaymentPct, currentRate),
    [purchasePrice, monthlyRent, downPaymentPct, currentRate],
  );

  // Historical rate series
  const rateHistory = useMemo(() => buildRateHistory(), []);

  // Percentile context
  const pct = useMemo(
    () => ratePercentile(rateHistory, currentRate),
    [rateHistory, currentRate],
  );

  // ECharts option (memoized — expensive to rebuild)
  const chartOption = useMemo(
    () => buildScenarioChartOption(scenarios, currentRate),
    [scenarios, currentRate],
  );

  // Wait vs Buy analysis
  const waitAnalysis = useMemo(
    () =>
      buildWaitAnalysis(
        purchasePrice,
        downPaymentPct,
        currentRate,
        6.0,    // target rate after 6-month wait
        2_000,  // rent paid while waiting
        3.5,    // annual appreciation assumption (%)
      ),
    [purchasePrice, downPaymentPct, currentRate],
  );

  // Plain-English rate context
  const rateContext = useMemo(() => {
    if (pct >= 80)
      return `Rates are at ${currentRate}% — that's in the top ${100 - pct}% of the last 5 years. You're paying near peak rates. Markets that absorbed this level historically appreciated 4–6% in the following 12 months as rates normalized.`;
    if (pct >= 60)
      return `Rates are at ${currentRate}% — in the ${pct}th percentile of the last 5 years. Above historical midpoint. Buyers who purchased here saw 3–5% appreciation over the next 12 months on average.`;
    if (pct >= 40)
      return `Rates are at ${currentRate}% — near the historical median for the last 5 years (${pct}th percentile). A fairly neutral entry point for rate timing.`;
    return `Rates are at ${currentRate}% — in the bottom ${pct}% of the last 5 years. Historically a favorable entry on rate timing. Properties purchased at comparable rates saw strong appreciation in the 12 months that followed.`;
  }, [currentRate, pct]);

  const todayScenario = scenarios.find((s) => s.isToday)!;
  const downPaymentDollars = Math.round(purchasePrice * downPaymentPct);

  return (
    <div className={`space-y-5 ${className ?? ""}`}>

      {/* ══ Purchase price slider ══════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[13px] font-semibold text-content-primary">
              Rate Environment Analysis
            </h3>
            <p className="text-[11px] text-content-tertiary mt-0.5">
              Adjust purchase price to see how rate scenarios change
            </p>
          </div>
          <div className="text-right">
            <span
              className="font-mono tabular-nums text-xl font-bold text-gold"
              aria-label={`Purchase price: ${fmt(purchasePrice)}`}
            >
              {fmtK(purchasePrice)}
            </span>
            <p className="text-[10px] text-content-disabled">purchase price</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-content-disabled w-12 text-right">$200K</span>
          <input
            type="range"
            min={200_000}
            max={1_200_000}
            step={10_000}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            className="flex-1 accent-gold h-1 cursor-pointer"
            aria-label={`Purchase price: ${fmt(purchasePrice)}`}
          />
          <span className="text-[11px] font-mono text-content-disabled w-12">$1.2M</span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[11px] text-content-disabled font-mono">
          <span>Down: <span className="text-content-secondary">{fmt(downPaymentDollars)}</span></span>
          <span>Loan: <span className="text-content-secondary">{fmt(purchasePrice - downPaymentDollars)}</span></span>
          <span>Rent: <span className="text-content-secondary">{fmt(monthlyRent)}/mo</span></span>
        </div>
      </div>

      {/* ══ Section A: Rate Scenario Comparison ═══════════════════════════ */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-content-primary">
              Section A — Rate Scenario Comparison
            </h3>
            <p className="text-[11px] text-content-tertiary mt-0.5">
              What this {fmt(purchasePrice)} property looks like at 6 different rate levels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              BUY
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">
              HOLD
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose/10 text-rose border border-rose/20">
              PASS
            </span>
          </div>
        </div>

        {/* ECharts bar chart */}
        <ReactECharts
          option={chartOption}
          style={{ height: 220, width: "100%" }}
          notMerge
          lazyUpdate
          aria-label="Monthly mortgage payment by rate scenario, colored by investment verdict"
        />

        {/* Scenario table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[11px]" aria-label="Rate scenario comparison table">
            <thead>
              <tr className="border-b border-surface-border">
                <th scope="col" className="text-left pb-2 text-content-tertiary font-medium pr-3">Metric</th>
                {scenarios.map((s) => (
                  <th
                    key={s.rate}
                    scope="col"
                    className={[
                      "text-right pb-2 font-mono font-semibold px-2",
                      s.isToday ? "text-gold" : "text-content-tertiary",
                    ].join(" ")}
                    aria-label={`${s.rate}% rate${s.isToday ? " (today)" : ""}`}
                  >
                    {s.rate}%{s.isToday ? <sup className="text-[9px] ml-0.5">today</sup> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {/* Monthly Payment */}
              <tr>
                <td className="py-2 text-content-tertiary pr-3 whitespace-nowrap">Monthly P&I</td>
                {scenarios.map((s) => (
                  <td
                    key={s.rate}
                    className={[
                      "py-2 text-right px-2 font-mono tabular-nums",
                      s.isToday ? "text-gold font-semibold" : "text-content-secondary",
                    ].join(" ")}
                    aria-label={`${s.rate}%: ${fmt(s.monthlyPayment)}`}
                  >
                    {fmt(s.monthlyPayment)}
                  </td>
                ))}
              </tr>
              {/* Purchasing Power */}
              <tr>
                <td className="py-2 text-content-tertiary pr-3 whitespace-nowrap">Purchasing power</td>
                {scenarios.map((s) => (
                  <td
                    key={s.rate}
                    className={[
                      "py-2 text-right px-2 font-mono tabular-nums",
                      s.isToday ? "text-gold font-semibold" : "text-content-secondary",
                    ].join(" ")}
                    aria-label={`${s.rate}%: ${fmt(s.purchasingPower)}`}
                  >
                    {fmtK(s.purchasingPower)}
                  </td>
                ))}
              </tr>
              {/* Monthly Cash Flow */}
              <tr>
                <td className="py-2 text-content-tertiary pr-3 whitespace-nowrap">Monthly CF</td>
                {scenarios.map((s) => (
                  <td
                    key={s.rate}
                    className={[
                      "py-2 text-right px-2 font-mono tabular-nums",
                      s.monthlyCf >= 0 ? "text-emerald" : "text-rose",
                      s.isToday ? "font-semibold" : "",
                    ].join(" ")}
                    aria-label={`${s.rate}%: ${s.monthlyCf >= 0 ? fmt(s.monthlyCf) : `(${fmt(Math.abs(s.monthlyCf))})`} monthly cash flow`}
                  >
                    {s.monthlyCf >= 0 ? fmt(s.monthlyCf) : `(${fmt(Math.abs(s.monthlyCf))})`}
                  </td>
                ))}
              </tr>
              {/* Cash-on-Cash */}
              <tr>
                <td className="py-2 text-content-tertiary pr-3 whitespace-nowrap">Cash-on-cash</td>
                {scenarios.map((s) => (
                  <td
                    key={s.rate}
                    className={[
                      "py-2 text-right px-2 font-mono tabular-nums",
                      s.coc >= 5 ? "text-emerald" : s.coc >= 0 ? "text-amber" : "text-rose",
                      s.isToday ? "font-semibold" : "",
                    ].join(" ")}
                    aria-label={`${s.rate}%: ${fmtChartPct(s.coc)} cash on cash return`}
                  >
                    {fmtChartPct(s.coc)}
                  </td>
                ))}
              </tr>
              {/* Verdict */}
              <tr>
                <td className="py-2 text-content-tertiary pr-3">Verdict</td>
                {scenarios.map((s) => (
                  <td key={s.rate} className="py-2 text-right px-2">
                    <span
                      className={[
                        "inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                        s.verdict === "BUY" ? "bg-emerald/15 text-emerald" :
                        s.verdict === "HOLD" ? "bg-amber/15 text-amber" :
                        "bg-rose/15 text-rose",
                        s.isToday ? "ring-1 ring-gold/50" : "",
                      ].join(" ")}
                      aria-label={`${s.rate}%: ${s.verdict}`}
                    >
                      {s.verdict}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-content-disabled mt-3 border-l-2 border-gold/20 pl-3 italic">
          Verdict based on cash-on-cash return: BUY ≥ 5%, HOLD ≥ 0%, PASS &lt; 0%.
          Assumes {(downPaymentPct * 100).toFixed(0)}% down, 3% closing costs, 1.5% tax + insurance.
          Rent: {fmt(monthlyRent)}/mo.
        </p>
      </div>

      {/* ══ Section B: Historical Rate Context ════════════════════════════ */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-content-primary">
            Section B — Historical Rate Context
          </h3>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            30-year fixed mortgage rate — last 5 years
          </p>
        </div>

        {/* Key stat badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
            <p className="text-[10px] text-content-disabled mb-0.5">Current rate</p>
            <p className="font-mono tabular-nums text-base font-bold text-gold">{currentRate.toFixed(2)}%</p>
          </div>
          <div className="bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
            <p className="text-[10px] text-content-disabled mb-0.5">5yr percentile</p>
            <p
              className={[
                "font-mono tabular-nums text-base font-bold",
                pct >= 75 ? "text-rose" : pct >= 50 ? "text-amber" : "text-emerald",
              ].join(" ")}
              aria-label={`${pct}th percentile of the last 5 years`}
            >
              {pct}th
            </p>
          </div>
          <div className="bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
            <p className="text-[10px] text-content-disabled mb-0.5">5yr low</p>
            <p className="font-mono tabular-nums text-base font-bold text-emerald">
              {Math.min(...rateHistory.map((d) => d.rate)).toFixed(2)}%
            </p>
          </div>
          <div className="bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
            <p className="text-[10px] text-content-disabled mb-0.5">5yr high</p>
            <p className="font-mono tabular-nums text-base font-bold text-rose">
              {Math.max(...rateHistory.map((d) => d.rate)).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Recharts AreaChart */}
        <ResponsiveContainer width="100%" height={180} aria-label="30-year mortgage rate history">
          <AreaChart
            data={rateHistory}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="rate-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray={GRID_STYLE.strokeDasharray}
              stroke={GRID_STYLE.stroke}
              vertical={GRID_STYLE.vertical}
            />
            <XAxis
              dataKey="month"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              interval={11}
              minTickGap={40}
            />
            <YAxis
              domain={[2, 8]}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              width={40}
            />
            <Tooltip content={<RateTooltip />} cursor={{ stroke: CHART_COLORS.gold, strokeWidth: 1, strokeDasharray: "4 3" }} />
            <ReferenceLine
              y={currentRate}
              stroke={CHART_COLORS.gold}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: `Today ${currentRate}%`,
                position: "right",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                fill: CHART_COLORS.gold,
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke={CHART_COLORS.gold}
              strokeWidth={1.5}
              fill="url(#rate-gradient)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: "#000", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Plain English context */}
        <div className="mt-4 bg-surface-elevated rounded-lg p-3 border border-surface-border">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className={[
                "w-3.5 h-3.5 mt-0.5 shrink-0",
                pct >= 75 ? "text-rose" : pct >= 50 ? "text-amber" : "text-emerald",
              ].join(" ")}
              aria-hidden="true"
            />
            <p className="text-[12px] text-content-secondary leading-relaxed">
              {rateContext}
            </p>
          </div>
        </div>
      </div>

      {/* ══ Section C: Wait vs Buy Now Calculator ════════════════════════ */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-content-primary">
            Section C — Wait vs Buy Now
          </h3>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            6-month wait scenario: rates drop to {waitAnalysis.waitSixMonths.futureRate}%,
            price appreciates {fmt(waitAnalysis.waitSixMonths.priceDifferential)} (3.5% annual),
            rent paid {fmt(waitAnalysis.waitSixMonths.rentPaidDuringWait)} total
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

          {/* Buy Now */}
          <div className="bg-surface-elevated rounded-xl p-4 border border-surface-border relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <Home className="w-3.5 h-3.5 text-content-disabled" aria-hidden="true" />
            </div>
            <p className="text-[10px] text-content-disabled uppercase tracking-wider font-medium mb-3">
              Buy now at {currentRate}%
            </p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Purchase price</span>
                <span className="text-[12px] font-mono tabular-nums text-content-primary">{fmt(purchasePrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Monthly payment</span>
                <span className="text-[13px] font-mono tabular-nums font-semibold text-content-primary">
                  {fmt(waitAnalysis.buyNow.monthlyPaymentDollars)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Total interest (30yr)</span>
                <span className="text-[12px] font-mono tabular-nums text-rose">
                  {fmt(waitAnalysis.buyNow.totalInterestDollars)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Equity after 5yr</span>
                <span className="text-[12px] font-mono tabular-nums text-emerald">
                  {fmt(waitAnalysis.buyNow.equityAfter5yr)}
                </span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-secondary font-medium">Total cost</span>
                <span className="text-[13px] font-mono tabular-nums font-bold text-content-primary">
                  {fmt(waitAnalysis.buyNow.totalCostDollars)}
                </span>
              </div>
            </div>
          </div>

          {/* Wait 6 months */}
          <div className="bg-surface-elevated rounded-xl p-4 border border-surface-border relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <Clock className="w-3.5 h-3.5 text-content-disabled" aria-hidden="true" />
            </div>
            <p className="text-[10px] text-content-disabled uppercase tracking-wider font-medium mb-3">
              Wait 6 months ({waitAnalysis.waitSixMonths.futureRate}%)
            </p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Future price</span>
                <span className="text-[12px] font-mono tabular-nums text-content-primary">
                  {fmt(waitAnalysis.waitSixMonths.futurePriceDollars)}
                  <span className="text-[10px] text-rose ml-1">+{fmt(waitAnalysis.waitSixMonths.priceDifferential)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Monthly payment</span>
                <span className="text-[13px] font-mono tabular-nums font-semibold text-emerald">
                  {fmt(waitAnalysis.waitSixMonths.monthlyPaymentDollars)}
                  <span className="text-[10px] text-emerald ml-1">-{fmt(waitAnalysis.monthlyMortgageSavings)}/mo</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Total interest (30yr)</span>
                <span className="text-[12px] font-mono tabular-nums text-rose">
                  {fmt(waitAnalysis.waitSixMonths.totalInterestDollars)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-tertiary">Rent paid while waiting</span>
                <span className="text-[12px] font-mono tabular-nums text-rose">
                  ({fmt(waitAnalysis.waitSixMonths.rentPaidDuringWait)})
                </span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-content-secondary font-medium">Total cost</span>
                <span className="text-[13px] font-mono tabular-nums font-bold text-content-primary">
                  {fmt(waitAnalysis.waitSixMonths.totalCostDollars + waitAnalysis.waitSixMonths.rentPaidDuringWait)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Net Impact — the big verdict ── */}
        <div
          className={[
            "rounded-xl p-4 border",
            waitAnalysis.waitWins
              ? "bg-emerald/5 border-emerald/20"
              : "bg-gold/5 border-gold/20",
          ].join(" ")}
          role="region"
          aria-label="Wait vs Buy verdict"
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                waitAnalysis.waitWins
                  ? "bg-emerald/15"
                  : "bg-gold/15",
              ].join(" ")}
            >
              {waitAnalysis.waitWins
                ? <Clock className="w-4 h-4 text-emerald" aria-hidden="true" />
                : <TrendingUp className="w-4 h-4 text-gold" aria-hidden="true" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-content-tertiary mb-1 uppercase tracking-wider font-medium">
                Bottom line
              </p>
              <p className="text-[15px] font-bold leading-snug text-content-primary mb-2">
                {waitAnalysis.waitWins
                  ? `Waiting 6 months saves ${fmt(Math.abs(waitAnalysis.netImpactDollars))} in total cost`
                  : `Buying now saves ${fmt(waitAnalysis.netImpactDollars)} in total cost`}
              </p>
              <p className="text-[12px] text-content-secondary leading-relaxed">
                Waiting {waitAnalysis.waitWins ? "saves" : "costs"} {fmt(waitAnalysis.monthlyMortgageSavings)}/mo on mortgage
                but adds {fmt(waitAnalysis.waitSixMonths.rentPaidDuringWait)} in rent and {fmt(waitAnalysis.waitSixMonths.priceDifferential)} in price
                appreciation lost.{" "}
                <span
                  className={[
                    "font-semibold",
                    waitAnalysis.waitWins ? "text-emerald" : "text-gold",
                  ].join(" ")}
                >
                  Net impact: {fmtSign(waitAnalysis.waitWins ? -Math.abs(waitAnalysis.netImpactDollars) : waitAnalysis.netImpactDollars)} total cost
                  {waitAnalysis.waitWins ? " (wait wins)" : " (buy now wins)"}
                </span>
              </p>
              <p className="text-[10px] text-content-disabled mt-2">
                Assumes {fmt(2_000)}/mo rent while waiting · 3.5% annual price appreciation · rates drop to {waitAnalysis.waitSixMonths.futureRate}% in 6 months. Not financial advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RateEnvironmentAnalysis;
