"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  TrendingDown,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Minus,
  Bell,
  BellRing,
  DollarSign,
  Activity,
  AlertTriangle,
  Calculator,
  Clock,
  Building2,
  Lock,
  RefreshCw,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

// --- Mock rate data (realistic March 2026 values) ---
const RATES = {
  mortgage30yr: 6.95,
  mortgage30yrChange: 0.03,
  mortgage15yr: 6.28,
  fedFunds: 4.75,
  treasury10yr: 4.28,
  treasury2yr: 4.15,
  sofr: 4.71,
  avgCapRate: 6.2,
};

const RATE_HISTORY = [
  { date: "Apr 2025", value: 7.22 },
  { date: "May 2025", value: 7.10, event: "Inflation report" },
  { date: "Jun 2025", value: 6.98 },
  { date: "Jul 2025", value: 7.05, event: "Fed hold" },
  { date: "Aug 2025", value: 6.88 },
  { date: "Sep 2025", value: 6.72, event: "Fed cut -0.25%" },
  { date: "Oct 2025", value: 6.65 },
  { date: "Nov 2025", value: 6.80 },
  { date: "Dec 2025", value: 6.90, event: "Fed hold" },
  { date: "Jan 2026", value: 7.02 },
  { date: "Feb 2026", value: 6.92 },
  { date: "Mar 2026", value: 6.95, event: "Current" },
];

const MOCK_PORTFOLIO = [
  { address: "1423 Cedar Ridge Dr, Austin TX", loanBalance: 280000, rate: 7.25, type: "fixed" as const },
  { address: "782 Oakwood Blvd, Nashville TN", loanBalance: 240000, rate: 6.50, type: "ARM" as const },
  { address: "3901 Pine Valley Ct, Tampa FL", loanBalance: 195000, rate: 7.10, type: "ARM" as const },
];

// --- Helpers ---
function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// --- Sparkline SVG ---
function Sparkline({ data, events }: { data: typeof RATE_HISTORY; events?: boolean }) {
  const w = 600, h = 120, pad = 24;
  const values = data.map((d) => d.value);
  const min = Math.min(...values) - 0.1;
  const max = Math.max(...values) + 0.1;
  const xStep = (w - pad * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: pad + i * xStep,
    y: pad + (1 - (d.value - min) / (max - min)) * (h - pad * 2),
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[min, (min + max) / 2, max].map((v, i) => {
        const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
        return (
          <g key={i}>
            <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="#374151" strokeWidth={0.5} strokeDasharray="4 4" />
            <text x={pad - 4} y={y + 3} textAnchor="end" fill="#6b7280" fontSize={9} fontFamily="monospace">
              {v.toFixed(1)}%
            </text>
          </g>
        );
      })}
      {/* Line */}
      <path d={pathD} fill="none" stroke="#22c55e" strokeWidth={2} />
      {/* Dots and events */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.event ? 4 : 2} fill={p.event ? "#f59e0b" : "#22c55e"} />
          {events && p.event && (
            <>
              <line x1={p.x} y1={p.y + 6} x2={p.x} y2={h - 4} stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2 2" />
              <text x={p.x} y={h - 1} textAnchor="middle" fill="#f59e0b" fontSize={7} fontFamily="sans-serif">
                {p.event}
              </text>
            </>
          )}
          {/* X-axis labels every 3 months */}
          {i % 3 === 0 && (
            <text x={p.x} y={h + 10} textAnchor="middle" fill="#6b7280" fontSize={8} fontFamily="sans-serif">
              {p.date}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// --- Confluence Bar ---
function ConfluenceBar({
  label1,
  value1,
  label2,
  value2,
  maxVal,
}: {
  label1: string;
  value1: number;
  label2: string;
  value2: number;
  maxVal: number;
}) {
  const pct1 = (value1 / maxVal) * 100;
  const pct2 = (value2 / maxVal) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label1}</span>
        <div className="flex-1 h-4 bg-surface-elevated rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-blue-500/60 rounded-full" style={{ width: `${clamp(pct1, 2, 100)}%` }} />
          <span className="absolute inset-y-0 right-2 text-[10px] font-mono text-gray-300 flex items-center">{value1.toFixed(2)}%</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label2}</span>
        <div className="flex-1 h-4 bg-surface-elevated rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-money-500/60 rounded-full" style={{ width: `${clamp(pct2, 2, 100)}%` }} />
          <span className="absolute inset-y-0 right-2 text-[10px] font-mono text-gray-300 flex items-center">{value2.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

// --- Goldman Lag Timeline Milestones ---
const LAG_MILESTONES = [
  { month: 0, label: "Rate change occurs", pct: 0 },
  { month: 6, label: "Mortgage apps respond", pct: 20 },
  { month: 12, label: "Inventory adjusts", pct: 40 },
  { month: 18, label: "Prices begin moving", pct: 65 },
  { month: 30, label: "Full price impact realized", pct: 100 },
];

// ============================================================
// Main Page
// ============================================================
export default function RatesPage() {
  const [sliderRate, setSliderRate] = useState(RATES.mortgage30yr);
  const [alertRate, setAlertRate] = useState("6.50");
  const [alertYieldCurve, setAlertYieldCurve] = useState(false);
  const [alertFed, setAlertFed] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  const { capture } = useEventCapture();

  // Capture page view on mount
  useEffect(() => {
    capture("session.page_viewed", { page: "rates" });
  }, [capture]);

  // Wrapper for slider changes that also captures the event
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setSliderRate(value);
      capture("rate.checked");
    },
    [capture],
  );

  // Derived calculations
  const yieldSpread = RATES.treasury10yr - RATES.treasury2yr;
  const isInverted = yieldSpread < 0;
  const fedMortgageSpread = RATES.mortgage30yr - RATES.fedFunds;
  const capRateSpread = RATES.avgCapRate - RATES.mortgage30yr;

  // Rate impact calculator
  const propertyPrice = 350000;
  const downPct = 0.2;
  const loanAmount = propertyPrice * (1 - downPct);

  const currentPayment = useMemo(() => calcMonthlyPayment(loanAmount, RATES.mortgage30yr, 30), [loanAmount]);
  const newPayment = useMemo(() => calcMonthlyPayment(loanAmount, sliderRate, 30), [loanAmount, sliderRate]);
  const paymentDiff = newPayment - currentPayment;

  // Buyer pool impact: rough heuristic (1% rate change = ~10% buyer pool change)
  const rateDelta = sliderRate - RATES.mortgage30yr;
  const buyerPoolChange = -rateDelta * 10;

  // Portfolio impact (aggregate)
  const portfolioImpact = useMemo(() => {
    return MOCK_PORTFOLIO.reduce((total, prop) => {
      const currentP = calcMonthlyPayment(prop.loanBalance, prop.rate, 30);
      const refiP = calcMonthlyPayment(prop.loanBalance, sliderRate, 30);
      return total + (refiP - currentP);
    }, 0);
  }, [sliderRate]);

  // Portfolio impact (per-property detail)
  const portfolioDetails = useMemo(() => {
    return MOCK_PORTFOLIO.map((prop) => {
      const currentPayment = calcMonthlyPayment(prop.loanBalance, prop.rate, 30);
      const newPayment = calcMonthlyPayment(prop.loanBalance, sliderRate, 30);
      const diff = newPayment - currentPayment;
      return { ...prop, currentPayment, newPayment, diff };
    });
  }, [sliderRate]);

  const armCount = MOCK_PORTFOLIO.filter((p) => p.type === "ARM").length;
  const netArmImpact = portfolioDetails
    .filter((p) => p.type === "ARM")
    .reduce((s, p) => s + p.diff, 0);

  // Break-even refinance rate (simplified: refi makes sense when savings > closing costs over 5 years)
  const avgCurrentRate = MOCK_PORTFOLIO.reduce((s, p) => s + p.rate, 0) / MOCK_PORTFOLIO.length;
  const breakEvenRate = Math.max(avgCurrentRate - 0.75, 4.0);

  // Spread classification
  const spreadLabel = (spread: number, low: number, high: number): "TIGHT" | "NORMAL" | "WIDE" => {
    if (spread < low) return "TIGHT";
    if (spread > high) return "WIDE";
    return "NORMAL";
  };

  const fedSpreadStatus = spreadLabel(fedMortgageSpread, 1.5, 2.5);

  // Rate direction (last 6 months)
  const sixMonthsAgo = RATE_HISTORY[RATE_HISTORY.length - 7]?.value ?? RATES.mortgage30yr;
  const rateDirection = RATES.mortgage30yr - sixMonthsAgo;

  const handleSaveAlerts = useCallback(() => {
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 2000);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Interest Rates</h1>
        <p className="text-sm text-gray-500 mt-1">
          {"\u5929\u6CB3"} Celestial River — The flow of capital from policy to property
        </p>
      </div>

      {/* Section 1: Rate Dashboard Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main rate - large display */}
        <Card className="lg:col-span-1">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">30-Year Fixed</p>
            <p className="text-5xl font-bold font-mono text-money-400">{RATES.mortgage30yr.toFixed(2)}%</p>
            <div className={`flex items-center justify-center gap-1 mt-2 ${RATES.mortgage30yrChange >= 0 ? "text-red-400" : "text-money-400"}`}>
              {RATES.mortgage30yrChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="text-sm font-mono font-semibold">
                {RATES.mortgage30yrChange >= 0 ? "+" : ""}{RATES.mortgage30yrChange.toFixed(2)}% today
              </span>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">15-Year Fixed: <span className="font-mono text-gray-400">{RATES.mortgage15yr.toFixed(2)}%</span></p>
          </div>
        </Card>

        {/* Secondary rates */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Fed Funds" value={`${RATES.fedFunds.toFixed(2)}%`} color="blue" icon={Activity} />
          <MetricCard label="10-Year Treasury" value={`${RATES.treasury10yr.toFixed(2)}%`} color="gold" icon={TrendingUp} />
          <MetricCard label="2-Year Treasury" value={`${RATES.treasury2yr.toFixed(2)}%`} color="gray" icon={TrendingDown} />
          <MetricCard label="SOFR Rate" value={`${RATES.sofr.toFixed(2)}%`} color="green" icon={DollarSign} />
        </div>
      </div>

      {/* Yield curve spread badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500">Yield Curve Spread (10yr - 2yr):</span>
        <span className={`font-mono font-bold text-sm ${isInverted ? "text-red-400" : "text-money-400"}`}>
          {yieldSpread >= 0 ? "+" : ""}{yieldSpread.toFixed(2)}%
        </span>
        <Badge variant={isInverted ? "danger" : "success"} size="sm">
          {isInverted ? "INVERTED" : "NORMAL"}
        </Badge>
      </div>

      {/* Section 2: Rate Impact Calculator */}
      <Card header="Rate Impact Calculator">
        <div className="space-y-6">
          {/* Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">If 30-year rate moves to:</label>
              <span className="text-2xl font-bold font-mono text-money-400">{sliderRate.toFixed(3)}%</span>
            </div>
            <input
              type="range"
              min={4.0}
              max={10.0}
              step={0.125}
              value={sliderRate}
              onChange={handleSliderChange}
              className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-money-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-1">
              <span>4.000%</span>
              <span>7.000%</span>
              <span>10.000%</span>
            </div>
          </div>

          {/* Impact grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Payment</p>
              </div>
              <p className="text-sm text-gray-300">
                On a <span className="font-mono text-gray-100">{formatCurrency(propertyPrice)}</span> property at 20% down:
              </p>
              <p className="text-lg font-mono mt-1">
                <span className="text-gray-400">{formatCurrency(Math.round(currentPayment))}/mo</span>
                <span className="text-gray-600 mx-2">&rarr;</span>
                <span className="text-gray-100">{formatCurrency(Math.round(newPayment))}/mo</span>
                <span className={`ml-2 text-sm ${paymentDiff > 0 ? "text-red-400" : paymentDiff < 0 ? "text-money-400" : "text-gray-500"}`}>
                  ({paymentDiff >= 0 ? "+" : ""}{formatCurrency(Math.round(paymentDiff))})
                </span>
              </p>
            </div>

            <div className="bg-surface-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Buyer Pool Impact</p>
              </div>
              <p className={`text-lg font-mono ${buyerPoolChange > 0 ? "text-money-400" : buyerPoolChange < 0 ? "text-red-400" : "text-gray-400"}`}>
                {buyerPoolChange > 0 ? "+" : ""}{buyerPoolChange.toFixed(0)}%
                <span className="text-sm text-gray-400 font-sans ml-2">
                  {buyerPoolChange > 0 ? "more" : "fewer"} qualified buyers
                </span>
              </p>
            </div>

            <div className="bg-surface-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Portfolio Impact</p>
              </div>
              <p className={`text-lg font-mono ${portfolioImpact < 0 ? "text-money-400" : portfolioImpact > 0 ? "text-red-400" : "text-gray-400"}`}>
                {portfolioImpact >= 0 ? "+" : ""}{formatCurrency(Math.round(portfolioImpact))}/mo
                <span className="text-sm text-gray-400 font-sans ml-2">
                  across {MOCK_PORTFOLIO.length} properties
                </span>
              </p>
            </div>

            <div className="bg-surface-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Break-even Refinance</p>
              </div>
              <p className="text-sm text-gray-300">
                Rates need to hit <span className="font-mono text-money-400 text-lg">{breakEvenRate.toFixed(2)}%</span> for refi to make sense
              </p>
              <p className="text-[10px] text-gray-600 mt-1">Based on avg current rate {avgCurrentRate.toFixed(2)}% minus 0.75% savings threshold</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2.5: Portfolio Impact — 家業 Empire Impact */}
      <Card header={"\u5BB6\u696D Empire Impact \u2014 How rates affect YOUR properties"}>
        <div className="space-y-4">
          {portfolioDetails.map((prop, i) => {
            const isFixed = prop.type === "fixed";
            return (
              <div key={i} className="bg-surface-elevated rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-surface-muted flex-shrink-0">
                      <Building2 className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{prop.address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isFixed ? "info" : "warning"} size="sm">
                          {isFixed ? (
                            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Fixed {prop.rate.toFixed(2)}%</span>
                          ) : (
                            <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> ARM {prop.rate.toFixed(2)}%</span>
                          )}
                        </Badge>
                        <span className="text-[10px] text-gray-600 font-mono">
                          Balance: {formatCurrency(prop.loanBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {isFixed ? (
                      <div>
                        <p className="text-sm font-mono text-gray-300">{formatCurrency(Math.round(prop.currentPayment))}/mo</p>
                        <p className="text-xs text-blue-400 mt-1 flex items-center justify-end gap-1">
                          <Lock className="h-3 w-3" />
                          No impact — locked at {prop.rate.toFixed(2)}%
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-300">
                          <span className="font-mono">{formatCurrency(Math.round(prop.currentPayment))}</span>
                          <span className="text-gray-600 mx-1">&rarr;</span>
                          <span className="font-mono text-gray-100">{formatCurrency(Math.round(prop.newPayment))}</span>
                          <span className="text-xs text-gray-500">/mo</span>
                        </p>
                        <p className={`text-xs mt-1 font-mono ${prop.diff > 0 ? "text-red-400" : prop.diff < 0 ? "text-money-400" : "text-gray-500"}`}>
                          Payment changes by {prop.diff >= 0 ? "+" : ""}{formatCurrency(Math.round(prop.diff))}/month
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total portfolio impact */}
          <div className="border-t border-surface-border pt-4 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">Total Portfolio Impact</p>
            <div className="text-right">
              <p className={`text-lg font-mono font-bold ${netArmImpact > 0 ? "text-red-400" : netArmImpact < 0 ? "text-money-400" : "text-gray-400"}`}>
                Net change: {netArmImpact >= 0 ? "+" : ""}{formatCurrency(Math.round(netArmImpact))}/month
              </p>
              <p className="text-[10px] text-gray-600">
                across {armCount} ARM {armCount === 1 ? "property" : "properties"} ({MOCK_PORTFOLIO.length - armCount} fixed — unaffected)
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Rate Confluence Pairs */}
      <Card header={"\u5929\u6CB3 Flow Analysis"}>
        <p className="text-xs text-gray-500 mb-6">
          Rate relationships that signal buying/selling opportunities. Each pair reveals a different market dynamic.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Fed Funds vs Mortgage Rate */}
          <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-200">Fed Funds vs Mortgage Rate</h4>
              <Badge
                variant={fedSpreadStatus === "WIDE" ? "warning" : fedSpreadStatus === "TIGHT" ? "info" : "success"}
                size="sm"
              >
                {fedSpreadStatus}
              </Badge>
            </div>
            <ConfluenceBar label1="Fed Funds Rate" value1={RATES.fedFunds} label2="30yr Mortgage" value2={RATES.mortgage30yr} maxVal={10} />
            <p className="text-xs text-gray-500">
              Spread: <span className="font-mono text-gray-300">{fedMortgageSpread.toFixed(2)}%</span> | Normal range: 1.5-2.5%
            </p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              {fedSpreadStatus === "WIDE"
                ? "Wide spread = banks tightening beyond Fed. Rates may drop even without Fed cuts."
                : fedSpreadStatus === "TIGHT"
                  ? "Tight spread = banks passing through cuts aggressively. Mortgage rates tracking Fed closely."
                  : "Normal spread = mortgage market pricing in line with Fed policy."}
            </p>
          </div>

          {/* 2. Yield Curve */}
          <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-200">Yield Curve (2yr vs 10yr)</h4>
              <Badge variant={isInverted ? "danger" : "success"} size="sm">
                {isInverted ? "INVERTED" : "NORMAL"}
              </Badge>
            </div>
            <ConfluenceBar label1="2-Year Treasury" value1={RATES.treasury2yr} label2="10-Year Treasury" value2={RATES.treasury10yr} maxVal={8} />
            <p className="text-xs text-gray-500">
              Spread: <span className={`font-mono ${isInverted ? "text-red-400" : "text-money-400"}`}>{yieldSpread >= 0 ? "+" : ""}{yieldSpread.toFixed(2)}%</span>
            </p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              {isInverted
                ? "INVERTED -- recession probability elevated (60-80%). Historically precedes recession by 12-18 months."
                : "Normal curve -- expansion continues. Long-term rates exceed short-term, signaling economic confidence."}
            </p>
          </div>

          {/* 3. Mortgage Rate vs Cap Rate */}
          <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-200">Mortgage Rate vs Cap Rate</h4>
              <Badge variant={capRateSpread > 0 ? "success" : "danger"} size="sm">
                {capRateSpread > 0 ? "POSITIVE" : "NEGATIVE"}
              </Badge>
            </div>
            <ConfluenceBar label1="30yr Mortgage" value1={RATES.mortgage30yr} label2="Avg Cap Rate" value2={RATES.avgCapRate} maxVal={10} />
            <p className="text-xs text-gray-500">
              Spread: <span className={`font-mono ${capRateSpread > 0 ? "text-money-400" : "text-red-400"}`}>
                {capRateSpread >= 0 ? "+" : ""}{capRateSpread.toFixed(2)}%
              </span>
            </p>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              {capRateSpread > 0
                ? "Positive spread = leveraged returns exceed borrowing cost = GO. Deals can cash-flow at current rates."
                : "Negative spread = borrowing costs more than property yields = CAUTION. Need value-add or rate drop to pencil."}
            </p>
          </div>

          {/* 4. Rate Direction vs Home Prices */}
          <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-200">Rate Direction vs Home Prices</h4>
              <Badge
                variant={rateDirection < -0.25 ? "success" : rateDirection > 0.25 ? "warning" : "neutral"}
                size="sm"
              >
                {rateDirection < -0.25 ? "FALLING" : rateDirection > 0.25 ? "RISING" : "FLAT"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 py-2">
              <span className="text-xs text-gray-500 w-32 flex-shrink-0">6-month direction</span>
              <div className="flex items-center gap-2">
                {rateDirection < -0.1 ? (
                  <ArrowDown className="h-5 w-5 text-money-400" />
                ) : rateDirection > 0.1 ? (
                  <ArrowUp className="h-5 w-5 text-red-400" />
                ) : (
                  <Minus className="h-5 w-5 text-gray-400" />
                )}
                <span className={`font-mono text-sm ${rateDirection < 0 ? "text-money-400" : rateDirection > 0 ? "text-red-400" : "text-gray-400"}`}>
                  {rateDirection >= 0 ? "+" : ""}{rateDirection.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-gold-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Rate changes take ~30 months to fully impact home prices (Goldman research).
                {rateDirection < -0.25
                  ? ` Rates dropped ${Math.abs(rateDirection).toFixed(1)}% in last 6 months. Price impact hasn't arrived yet. BUY BEFORE the wave.`
                  : rateDirection > 0.25
                    ? ` Rates rose ${rateDirection.toFixed(1)}% in last 6 months. Price correction may not have started yet. WAIT for softening.`
                    : " Rates relatively flat. Market in equilibrium -- focus on deal-level fundamentals."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3.5: Goldman Lag — 天時 Rate Transmission */}
      <Card header={"\u5929\u6642 Rate Transmission \u2014 The 30-Month Lag"}>
        <p className="text-xs text-gray-500 mb-6">
          Goldman research shows rate changes take ~30 months to fully impact home prices. Here&apos;s where we stand.
        </p>

        {/* Horizontal timeline */}
        <div className="relative px-2">
          {/* Background track */}
          <div className="h-2 bg-surface-elevated rounded-full w-full relative">
            {/* Filled portion — 20% transmitted based on 6 months since last cut */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-money-600 to-money-400 rounded-full transition-all"
              style={{ width: "20%" }}
            />
          </div>

          {/* Milestone markers */}
          <div className="relative mt-1">
            {LAG_MILESTONES.map((m, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${(m.month / 30) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {/* Tick mark */}
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    m.pct <= 20
                      ? "bg-money-500 border-money-400"
                      : "bg-surface-elevated border-gray-600"
                  }`}
                />
                {/* Month label */}
                <span className="text-[10px] font-mono text-gray-500 mt-1 whitespace-nowrap">
                  {m.month === 0 ? "Now" : `${m.month}mo`}
                </span>
                {/* Description */}
                <span className={`text-[9px] mt-0.5 text-center leading-tight max-w-[90px] ${
                  m.pct <= 20 ? "text-money-400" : "text-gray-600"
                }`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current position narrative */}
        <div className="mt-16 bg-surface-elevated rounded-lg p-4 flex items-start gap-3">
          <Clock className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-300">
              Current position: Rates dropped <span className="font-mono text-money-400">0.25%</span> six months ago.
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Price impact: <span className="font-mono text-money-400">20% transmitted</span>.{" "}
              <span className="font-mono text-gold-400">80% still coming</span>.
            </p>
            <p className="text-[10px] text-gray-600 mt-2">
              Based on Goldman Sachs research on mortgage rate transmission to home prices (1975-2024 dataset).
            </p>
          </div>
        </div>
      </Card>

      {/* Section 4: Rate History Sparkline */}
      <Card header="30-Year Mortgage Rate — 12 Month History">
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <Sparkline data={RATE_HISTORY} events />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-money-500" /> Rate
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gold-400" /> Key event
          </span>
        </div>
      </Card>

      {/* Section 5: Rate Alert Setup */}
      <Card header="Rate Alerts">
        <div className="space-y-4">
          {/* Rate threshold alert */}
          <div className="flex items-center gap-4 flex-wrap">
            <Bell className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-300">Alert me when 30-year rate crosses</span>
            <input
              type="number"
              step="0.125"
              min="3"
              max="12"
              value={alertRate}
              onChange={(e) => setAlertRate(e.target.value)}
              className="w-24 bg-surface-elevated border border-surface-border rounded-lg px-3 py-1.5 text-sm font-mono text-gray-200 focus:outline-none focus:border-money-600"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>

          {/* Yield curve inversion alert */}
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-300 flex-1">Alert me when yield curve inverts</span>
            <button
              onClick={() => setAlertYieldCurve(!alertYieldCurve)}
              className={`relative w-11 h-6 rounded-full transition-colors ${alertYieldCurve ? "bg-money-600" : "bg-surface-elevated border border-surface-border"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${alertYieldCurve ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          {/* Fed decision alert */}
          <div className="flex items-center gap-4">
            <BellRing className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-300 flex-1">Alert me when Fed announces rate decision</span>
            <button
              onClick={() => setAlertFed(!alertFed)}
              className={`relative w-11 h-6 rounded-full transition-colors ${alertFed ? "bg-money-600" : "bg-surface-elevated border border-surface-border"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${alertFed ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" size="sm" onClick={handleSaveAlerts}>
              Save Alerts
            </Button>
            {alertSaved && (
              <span className="text-xs text-money-400 animate-fade-in">Alerts saved</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
