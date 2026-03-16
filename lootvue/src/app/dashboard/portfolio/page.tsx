"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Building2, DollarSign, TrendingUp, Percent, ChevronDown, ChevronUp,
  Target, BookOpen, Brain, CheckCircle2, XCircle, Minus,
} from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea,
} from "recharts";
import { useOracleStore } from "@/lib/stores/oracle-store";
import { useDecisionJournalStore } from "@/lib/stores/decision-journal-store";
import type { Prediction } from "@/lib/engines/oracle/prediction-tracker";
import type { DecisionEntry } from "@/lib/stores/decision-journal-store";
import {
  CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE,
  AiInsightCard, fmtChartCurrency, fmtChartPct, generateTimeSeries,
} from "@/components/charts/ChartTheme";

// --- MOCK DATA ---
type Status = "Performing" | "Watch" | "Underperforming";
type Property = {
  address: string;
  city: string;
  state: string;
  value: number;
  equity: number;
  monthlyCF: number;
  capRate: number;
  status: Status;
  breakdown: { rent: number; mortgage: number; taxes: number; insurance: number; maintenance: number; vacancy: number };
};

const PROPERTIES: Property[] = [
  { address: "1847 Oak Valley Dr", city: "Austin", state: "TX", value: 385_000, equity: 88_000, monthlyCF: 420, capRate: 7.1, status: "Performing",
    breakdown: { rent: 2_450, mortgage: 1_580, taxes: 180, insurance: 95, maintenance: 100, vacancy: 75 } },
  { address: "920 Magnolia Ln", city: "Raleigh", state: "NC", value: 312_000, equity: 72_000, monthlyCF: 340, capRate: 6.8, status: "Performing",
    breakdown: { rent: 1_950, mortgage: 1_280, taxes: 140, insurance: 80, maintenance: 70, vacancy: 40 } },
  { address: "4501 Bay Shore Blvd", city: "Tampa", state: "FL", value: 245_000, equity: 54_000, monthlyCF: 280, capRate: 6.2, status: "Watch",
    breakdown: { rent: 1_680, mortgage: 1_100, taxes: 120, insurance: 110, maintenance: 50, vacancy: 20 } },
  { address: "789 Elm Street", city: "Nashville", state: "TN", value: 118_000, equity: 28_000, monthlyCF: 100, capRate: 5.9, status: "Underperforming",
    breakdown: { rent: 980, mortgage: 680, taxes: 80, insurance: 60, maintenance: 40, vacancy: 20 } },
];

const KPI = [
  { label: "Total Value", value: "$1.06M", icon: Building2 },
  { label: "Total Equity", value: "$242K", icon: DollarSign },
  { label: "Monthly Cash Flow", value: "+$1,140", icon: TrendingUp },
  { label: "Avg Cap Rate", value: "6.5%", icon: Percent },
];

const WEALTH = { total: 4_230, appreciation: 2_480, debtPaydown: 890, cashFlow: 860 };
const GOAL = { target: 5_000, current: 1_140 };

const DONUT_DATA = [
  { name: "Appreciation", value: WEALTH.appreciation, color: CHART_COLORS.emerald },
  { name: "Debt Paydown", value: WEALTH.debtPaydown, color: CHART_COLORS.gold },
  { name: "Cash Flow", value: WEALTH.cashFlow, color: "#059669" },
];

const CASHFLOW_DATA = PROPERTIES.map((p) => ({
  address: p.address.length > 18 ? p.address.slice(0, 16) + "…" : p.address,
  cashFlow: p.monthlyCF,
  fill: p.monthlyCF >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose,
}));

// --- QUANT TIME-SERIES DATA ---

// Portfolio value (gold) + equity (emerald) + DSCR (amber) — merged by month index
const _valueTS = generateTimeSeries(12, 1_020_000, 12_000, 0.025, 301);
const _equityTS = generateTimeSeries(12, 220_000, 5_000, 0.03, 302);
const _dscrTS = generateTimeSeries(12, 1.28, 0.04, 0.005, 303);

const PERFORMANCE_DATA = _valueTS.map((pt, i) => ({
  month: pt.month,
  portfolioValue: pt.value,
  totalEquity: _equityTS[i]?.value ?? 0,
  dscr: parseFloat((_dscrTS[i]?.value ?? 1.28).toFixed(3)),
}));

// LTV progression — starts ~78%, trends down toward ~74%
const LTV_DATA = generateTimeSeries(12, 78, 0.5, -0.003, 304).map((pt) => ({
  month: pt.month,
  ltv: parseFloat(pt.value.toFixed(2)),
}));

// Monthly cash flow trend — starts ~$1,080, trends up
const CF_TREND_DATA = generateTimeSeries(12, 1_080, 80, 0.01, 305).map((pt) => ({
  month: pt.month,
  cashFlow: Math.round(pt.value),
}));

// Risk-Return scatter — one dot per property
const SCATTER_DATA = PROPERTIES.map((p) => ({
  capRate: p.capRate,
  cashFlow: p.monthlyCF,
  // ZAxis maps dot size; we normalize by value (min 118K → max 385K)
  z: Math.round(p.value / 10_000),
  name: p.address,
  status: p.status,
  color:
    p.status === "Performing"
      ? CHART_COLORS.emerald
      : p.status === "Watch"
      ? CHART_COLORS.amber
      : CHART_COLORS.rose,
}));

// --- FORMATTERS ---
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function statusBadge(s: Status) {
  return s === "Performing" ? "badge-emerald" : s === "Watch" ? "badge-amber" : "badge-rose";
}

function statusColor(s: Status) {
  return s === "Performing"
    ? CHART_COLORS.emerald
    : s === "Watch"
    ? CHART_COLORS.amber
    : CHART_COLORS.rose;
}

// --- TOOLTIP COMPONENTS ---

function DonutCenterLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" fontSize="10" fill={CHART_COLORS.text} fontFamily="JetBrains Mono, monospace">
        GROWTH
      </tspan>
      <tspan x={cx} dy="18" fontSize="14" fill={CHART_COLORS.white} fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {fmtChartCurrency(total)}
      </tspan>
    </text>
  );
}

function CashFlowTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const v = entry.value;
  return (
    <div style={TOOLTIP_STYLE}>
      <span style={{ fontSize: 12, color: v >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
        {fmt(v)}/mo
      </span>
    </div>
  );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.payload.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>{item.name}:</span>
        <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
          {fmt(item.value)}
        </span>
      </div>
    </div>
  );
}

function PerformanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 6, fontFamily: "JetBrains Mono, monospace" }}>
        {label}
      </p>
      {payload.map((item) => {
        const isDscr = item.name === "dscr";
        const formatted = isDscr
          ? `${item.value.toFixed(2)}x`
          : fmtChartCurrency(item.value);
        const label2 = isDscr ? "DSCR" : item.name === "portfolioValue" ? "Portfolio Value" : "Total Equity";
        return (
          <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>{label2}:</span>
            <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
              {formatted}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LtvTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  const zoneColor =
    v > 80 ? CHART_COLORS.rose : v > 60 ? CHART_COLORS.amber : CHART_COLORS.emerald;
  const zoneLabel = v > 80 ? "High Risk" : v > 60 ? "Moderate" : "Strong Equity";
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: zoneColor, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>LTV:</span>
        <span style={{ fontSize: 13, color: CHART_COLORS.white, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
          {fmtChartPct(v)}
        </span>
      </div>
      <p style={{ fontSize: 10, color: zoneColor, marginTop: 3, fontFamily: "JetBrains Mono, monospace" }}>
        {zoneLabel}
      </p>
    </div>
  );
}

function CfTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  const pct = Math.round((v / GOAL.target) * 100);
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: CHART_COLORS.gold, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>Cash Flow:</span>
        <span style={{ fontSize: 13, color: CHART_COLORS.white, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
          {fmt(v)}/mo
        </span>
      </div>
      <p style={{ fontSize: 10, color: CHART_COLORS.textSecondary, fontFamily: "JetBrains Mono, monospace" }}>
        {pct}% of ${GOAL.target.toLocaleString()} goal
      </p>
    </div>
  );
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; capRate: number; cashFlow: number; status: Status; z: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 11, color: CHART_COLORS.white, fontWeight: 600, marginBottom: 4 }}>
        {d.name}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary }}>Cap Rate:</span>
          <span style={{ fontSize: 11, color: CHART_COLORS.amber, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {d.capRate}%
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary }}>Cash Flow:</span>
          <span style={{ fontSize: 11, color: CHART_COLORS.emerald, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {fmt(d.cashFlow)}/mo
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary }}>Value:</span>
          <span style={{ fontSize: 11, color: CHART_COLORS.white, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {fmtChartCurrency(d.z * 10_000)}
          </span>
        </div>
        <span
          style={{
            marginTop: 3,
            fontSize: 10,
            color: statusColor(d.status),
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {d.status}
        </span>
      </div>
    </div>
  );
}

// Recharts custom dot for scatter — colored per property status
function ScatterDot(props: {
  cx?: number;
  cy?: number;
  payload?: { color: string };
  r?: number;
}) {
  const { cx = 0, cy = 0, payload, r = 8 } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={payload?.color ?? CHART_COLORS.gold}
      fillOpacity={0.85}
      stroke={CHART_COLORS.border}
      strokeWidth={1.5}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo seed data — 8 predictions (6 correct, 2 wrong = 75% accuracy)
// 5 journal decisions (3 agreed, 2 overrode — 1 override right, 1 override wrong)
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_PREDICTIONS: Omit<Prediction, "id" | "createdAt">[] = [
  {
    market: { zip: "78701", name: "Austin", state: "TX" },
    property: { address: "742 Evergreen Terrace", price: 385000 },
    predictions: { prismVerdict: "STRONG_BUY", convictionScore: 88, confidenceLevel: 90, harmonicLevel: "strong", predictedAppreciation1yr: 8.2, predictedCashFlow: 420, predictedCapRate: 7.1, timingVerdict: "buy_now", riskLevel: "low" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bullish", score: 84 },
      { engine: "economic-engine", vote: "bullish", score: 87 },
      { engine: "supply-demand-engine", vote: "bullish", score: 82 },
    ],
    outcomes: { recordedAt: "2025-09-01T00:00:00Z", actualAppreciation: 9.1, actualCashFlow: 450, actualCapRate: 7.3, userAction: "bought", wasCorrect: true },
  },
  {
    market: { zip: "37201", name: "Nashville", state: "TN" },
    property: { address: "1200 Broadway Ave", price: 295000 },
    predictions: { prismVerdict: "BUY", convictionScore: 81, confidenceLevel: 78, harmonicLevel: "moderate", predictedAppreciation1yr: 6.5, predictedCashFlow: 310, predictedCapRate: 6.5, timingVerdict: "buy_now", riskLevel: "low" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bullish", score: 76 },
      { engine: "economic-engine", vote: "bullish", score: 80 },
      { engine: "supply-demand-engine", vote: "neutral", score: 60 },
    ],
    outcomes: { recordedAt: "2025-09-15T00:00:00Z", actualAppreciation: 5.8, actualCashFlow: 290, actualCapRate: 6.3, userAction: "bought", wasCorrect: true },
  },
  {
    market: { zip: "27601", name: "Raleigh", state: "NC" },
    property: { address: "88 Innovation Way", price: 320000 },
    predictions: { prismVerdict: "STRONG_BUY", convictionScore: 90, confidenceLevel: 92, harmonicLevel: "strong", predictedAppreciation1yr: 7.8, predictedCashFlow: 380, predictedCapRate: 6.9, timingVerdict: "buy_now", riskLevel: "low" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bullish", score: 91 },
      { engine: "economic-engine", vote: "bullish", score: 88 },
      { engine: "supply-demand-engine", vote: "bullish", score: 86 },
    ],
    outcomes: { recordedAt: "2025-10-01T00:00:00Z", actualAppreciation: 8.4, actualCashFlow: 395, actualCapRate: 7.1, userAction: "bought", wasCorrect: true },
  },
  {
    market: { zip: "85001", name: "Phoenix", state: "AZ" },
    property: { address: "5500 Camelback Rd", price: 410000 },
    predictions: { prismVerdict: "PASS", convictionScore: 38, confidenceLevel: 72, harmonicLevel: "weak", predictedAppreciation1yr: -2.0, predictedCashFlow: -120, predictedCapRate: 4.1, timingVerdict: "wait", riskLevel: "high" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bearish", score: 35 },
      { engine: "economic-engine", vote: "bearish", score: 40 },
      { engine: "supply-demand-engine", vote: "bearish", score: 30 },
    ],
    outcomes: { recordedAt: "2025-10-15T00:00:00Z", actualAppreciation: -1.5, actualCashFlow: -90, actualCapRate: 4.3, userAction: "passed", wasCorrect: true },
  },
  {
    market: { zip: "30301", name: "Atlanta", state: "GA" },
    property: { address: "2100 Peachtree Rd", price: 275000 },
    predictions: { prismVerdict: "BUY", convictionScore: 74, confidenceLevel: 71, harmonicLevel: "moderate", predictedAppreciation1yr: 5.5, predictedCashFlow: 240, predictedCapRate: 6.2, timingVerdict: "buy_now", riskLevel: "moderate" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bullish", score: 72 },
      { engine: "economic-engine", vote: "neutral", score: 58 },
      { engine: "supply-demand-engine", vote: "bullish", score: 68 },
    ],
    outcomes: { recordedAt: "2025-11-01T00:00:00Z", actualAppreciation: 4.9, actualCashFlow: 210, actualCapRate: 6.0, userAction: "bought", wasCorrect: true },
  },
  {
    market: { zip: "28202", name: "Charlotte", state: "NC" },
    property: { address: "900 S Tryon St", price: 340000 },
    predictions: { prismVerdict: "LEAN_BUY", convictionScore: 65, confidenceLevel: 63, harmonicLevel: "moderate", predictedAppreciation1yr: 4.5, predictedCashFlow: 190, predictedCapRate: 5.8, timingVerdict: "buy_soon", riskLevel: "moderate" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bullish", score: 64 },
      { engine: "economic-engine", vote: "neutral", score: 55 },
      { engine: "supply-demand-engine", vote: "neutral", score: 52 },
    ],
    outcomes: { recordedAt: "2025-11-15T00:00:00Z", actualAppreciation: 3.2, actualCashFlow: 165, actualCapRate: 5.6, userAction: "bought", wasCorrect: true },
  },
  {
    market: { zip: "33601", name: "Tampa", state: "FL" },
    property: { address: "450 Palm Dr", price: 245000 },
    predictions: { prismVerdict: "BUY", convictionScore: 72, confidenceLevel: 75, harmonicLevel: "moderate", predictedAppreciation1yr: 6.0, predictedCashFlow: 280, predictedCapRate: 6.8, timingVerdict: "buy_now", riskLevel: "low" },
    engineVotes: [
      { engine: "demographic-engine", vote: "bullish", score: 70 },
      { engine: "economic-engine", vote: "bullish", score: 66 },
      { engine: "supply-demand-engine", vote: "neutral", score: 55 },
    ],
    outcomes: { recordedAt: "2025-12-01T00:00:00Z", actualAppreciation: -1.2, actualCashFlow: 220, actualCapRate: 6.1, userAction: "bought", wasCorrect: false },
  },
  {
    market: { zip: "77001", name: "Houston", state: "TX" },
    property: { address: "3300 Main St", price: 220000 },
    predictions: { prismVerdict: "LEAN_BUY", convictionScore: 61, confidenceLevel: 58, harmonicLevel: "weak", predictedAppreciation1yr: 3.8, predictedCashFlow: 150, predictedCapRate: 5.5, timingVerdict: "buy_soon", riskLevel: "moderate" },
    engineVotes: [
      { engine: "demographic-engine", vote: "neutral", score: 58 },
      { engine: "economic-engine", vote: "bearish", score: 45 },
      { engine: "supply-demand-engine", vote: "neutral", score: 52 },
    ],
    outcomes: { recordedAt: "2025-12-15T00:00:00Z", actualAppreciation: -2.1, actualCashFlow: 80, actualCapRate: 5.1, userAction: "bought", wasCorrect: false },
  },
];

const DEMO_JOURNAL_ENTRIES: Omit<DecisionEntry, "id" | "createdAt">[] = [
  {
    type: "buy",
    context: { address: "742 Evergreen Terrace", market: "Austin", zip: "78701", price: 385000, apexScore: 82, convictionScore: 88, prismVerdict: "STRONG BUY", mortgageRate: 6.95 },
    reasoning: "Strong fundamentals across all engines. Tech job growth and limited supply align with thesis.",
    keyFactors: ["tech employment", "low inventory", "population growth"],
    confidenceLevel: "very_confident",
    systemRecommendation: "STRONG_BUY",
    agreedWithSystem: true,
    outcome: { recordedAt: "2025-11-01T00:00:00Z", whatHappened: "Closed at $378K. Cashflow hitting $450/mo, appreciation tracking above projections.", wasRightDecision: true, financialImpact: 450 },
  },
  {
    type: "pass",
    context: { address: "5500 Camelback Rd", market: "Phoenix", zip: "85001", price: 410000, apexScore: 42, convictionScore: 38, prismVerdict: "AVOID", mortgageRate: 7.1 },
    reasoning: "Negative cash flow at current rates. Overpriced vs comparable properties in market.",
    keyFactors: ["negative cash flow", "overpriced comps", "high LTV"],
    confidenceLevel: "confident",
    systemRecommendation: "PASS",
    agreedWithSystem: true,
    outcome: { recordedAt: "2025-11-15T00:00:00Z", whatHappened: "Market dropped 1.5% over next 6 months. Avoided ~$18K loss.", wasRightDecision: true, financialImpact: 18000 },
  },
  {
    type: "buy",
    context: { address: "450 Palm Dr", market: "Tampa", zip: "33601", price: 245000, apexScore: 68, convictionScore: 72, prismVerdict: "HOLD", mortgageRate: 7.0 },
    reasoning: "My read on coastal Florida demand was bullish despite the system's hold recommendation.",
    keyFactors: ["coastal demand", "tourism economy", "gut instinct"],
    confidenceLevel: "uncertain",
    systemRecommendation: "HOLD",
    agreedWithSystem: false,
    outcome: { recordedAt: "2025-12-15T00:00:00Z", whatHappened: "Property declined 1.2% amid insurance cost surge. System was right.", wasRightDecision: false, financialImpact: -3100 },
  },
  {
    type: "buy",
    context: { address: "88 Innovation Way", market: "Raleigh", zip: "27601", price: 320000, apexScore: 84, convictionScore: 90, prismVerdict: "STRONG BUY", mortgageRate: 6.75 },
    reasoning: "Research Triangle job growth is structural, not cyclical. Doubled down on system signal.",
    keyFactors: ["biotech cluster", "university pipeline", "supply constraint"],
    confidenceLevel: "very_confident",
    systemRecommendation: "STRONG_BUY",
    agreedWithSystem: true,
    outcome: { recordedAt: "2025-12-01T00:00:00Z", whatHappened: "8.4% appreciation. Outperformed projection. Anchoring another deal in same zip.", wasRightDecision: true, financialImpact: 395 },
  },
  {
    type: "buy",
    context: { address: "3300 Main St", market: "Houston", zip: "77001", price: 220000, apexScore: 55, convictionScore: 61, prismVerdict: "LEAN_BUY", mortgageRate: 7.25 },
    reasoning: "Energy sector rebound thesis — overrode cautious signal based on private market intel.",
    keyFactors: ["energy sector", "private intel", "price basis"],
    confidenceLevel: "confident",
    systemRecommendation: "LEAN_BUY",
    agreedWithSystem: false,
    outcome: { recordedAt: "2026-01-10T00:00:00Z", whatHappened: "Declined 2.1%. Energy rebound thesis did not materialize in residential market.", wasRightDecision: false, financialImpact: -4620 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Oracle Accuracy Gauge (SVG semicircle)
// ─────────────────────────────────────────────────────────────────────────────

function AccuracyGauge({ accuracy }: { accuracy: number }) {
  const radius = 54;
  const cx = 80;
  const cy = 72;
  const startAngle = 180;
  const pct = Math.min(100, Math.max(0, accuracy));

  // Convert polar to cartesian
  function polar(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  // Track arc (full 180°, 0° = right, 180° = left)
  const arcStart = polar(startAngle, radius);
  const arcEnd = polar(0, radius);
  const trackD = `M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  // Fill arc — only to the percentage
  const fillAngle = startAngle - pct * 1.8; // 180° total span / 100
  const fillEnd = polar(fillAngle, radius);
  const largeArc = fillAngle < 90 ? 1 : 0;
  const fillD = `M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`;

  const arcColor =
    pct >= 70 ? CHART_COLORS.emerald : pct >= 50 ? CHART_COLORS.amber : CHART_COLORS.rose;
  const labelColor =
    pct >= 70 ? "text-emerald" : pct >= 50 ? "text-amber" : "text-rose";

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={88} aria-label={`Prediction accuracy: ${pct}%`}>
        {/* Track */}
        <path d={trackD} fill="none" stroke="#1F1F1F" strokeWidth={10} strokeLinecap="round" />
        {/* Fill */}
        {pct > 0 && (
          <path d={fillD} fill="none" stroke={arcColor} strokeWidth={10} strokeLinecap="round" />
        )}
        {/* Tick marks at 50% and 70% */}
        {[50, 70].map((mark) => {
          const tickAngle = startAngle - mark * 1.8;
          const inner = polar(tickAngle, radius - 14);
          const outer = polar(tickAngle, radius + 4);
          return (
            <line
              key={mark}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#2A2A2A"
              strokeWidth={1.5}
            />
          );
        })}
        {/* Labels */}
        <text x={cx - radius - 4} y={cy + 18} fontSize={9} fill="#444" fontFamily="JetBrains Mono, monospace" textAnchor="middle">0%</text>
        <text x={cx + radius + 4} y={cy + 18} fontSize={9} fill="#444" fontFamily="JetBrains Mono, monospace" textAnchor="middle">100%</text>
        <text x={cx} y={cy + 16} fontSize={9} fill="#444" fontFamily="JetBrains Mono, monospace" textAnchor="middle">50</text>
      </svg>
      <div className={`font-mono text-3xl font-bold tabular-nums -mt-6 ${labelColor}`}>
        {pct}%
      </div>
      <div className="text-[10px] text-content-disabled uppercase tracking-wider mt-1">Accuracy</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prediction accuracy tooltip
// ─────────────────────────────────────────────────────────────────────────────

function AccuracyTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  const color = v >= 70 ? CHART_COLORS.emerald : v >= 50 ? CHART_COLORS.amber : CHART_COLORS.rose;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {label}
      </p>
      <span style={{ fontSize: 13, color, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
        {v}%
      </span>
      <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary, marginLeft: 4 }}>rolling accuracy</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Oracle Performance Section
// ─────────────────────────────────────────────────────────────────────────────

function OraclePerformanceSection() {
  const predictions = useOracleStore((s) => s.predictions);
  const stats = useOracleStore((s) => s.getStats());

  // Rolling accuracy — for each prediction that has an outcome, compute accuracy
  // over the preceding N predictions (window = all settled predictions up to that point)
  const settled = predictions
    .filter((p) => p.outcomes?.wasCorrect !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const rollingAccuracy = settled.map((_, i) => {
    const window = settled.slice(0, i + 1);
    const correct = window.filter((p) => p.outcomes?.wasCorrect).length;
    const acc = Math.round((correct / window.length) * 100);
    const d = new Date(settled[i]!.createdAt);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, accuracy: acc };
  });

  // Best streak — consecutive correct from most recent backwards
  let bestStreak = 0;
  let currentStreak = 0;
  for (const p of [...settled].reverse()) {
    if (p.outcomes?.wasCorrect) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Avg confidence across all settled predictions
  const avgConfidence =
    settled.length > 0
      ? Math.round(settled.reduce((s, p) => s + p.predictions.confidenceLevel, 0) / settled.length)
      : 0;

  // Recent 8 predictions for table (newest first)
  const recentPredictions = [...predictions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const verdictLabel = (v: string) => {
    const map: Record<string, string> = {
      STRONG_BUY: "Strong Buy",
      BUY: "Buy",
      LEAN_BUY: "Lean Buy",
      NEUTRAL: "Neutral",
      LEAN_PASS: "Lean Pass",
      PASS: "Pass",
      STRONG_PASS: "Strong Pass",
    };
    return map[v] ?? v;
  };

  const verdictColor = (v: string) => {
    if (["STRONG_BUY", "BUY", "LEAN_BUY"].includes(v)) return CHART_COLORS.emerald;
    if (["PASS", "STRONG_PASS", "LEAN_PASS"].includes(v)) return CHART_COLORS.rose;
    return CHART_COLORS.amber;
  };

  const kpis = [
    { label: "Total Predictions", value: stats.totalPredictions, color: "text-content-primary" },
    { label: "Accuracy Rate", value: `${stats.accuracyRate}%`, color: stats.accuracyRate >= 70 ? "text-emerald" : stats.accuracyRate >= 50 ? "text-amber" : "text-rose" },
    { label: "Avg Confidence", value: `${avgConfidence}%`, color: "text-gold" },
    { label: "Best Streak", value: bestStreak.toString(), color: "text-content-primary" },
  ];

  return (
    <div className="space-y-5">
      {/* Gauge + KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
        {/* Gauge */}
        <div className="sm:col-span-2 flex justify-center">
          <AccuracyGauge accuracy={stats.accuracyRate} />
        </div>

        {/* KPIs */}
        <div className="sm:col-span-3 grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="p-3 rounded-lg bg-white/[0.02] border border-surface-border">
              <div className="metric-label mb-1">{k.label}</div>
              <div className={`metric-value text-xl ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Over Time */}
      {rollingAccuracy.length >= 2 ? (
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Prediction Accuracy Trend
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rollingAccuracy} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                dataKey="label"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                width={36}
              />
              <Tooltip content={<AccuracyTrendTooltip />} cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }} />
              <ReferenceLine
                y={50}
                stroke={CHART_COLORS.rose}
                strokeDasharray="5 3"
                strokeWidth={1}
                label={{ value: "Random chance 50%", position: "insideTopRight", fill: CHART_COLORS.rose, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
              />
              <ReferenceLine
                y={70}
                stroke={CHART_COLORS.emerald}
                strokeDasharray="5 3"
                strokeWidth={1}
                label={{ value: "Target 70%", position: "insideBottomRight", fill: CHART_COLORS.emerald, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.gold, stroke: "#000", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: CHART_COLORS.gold, stroke: "#000", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-8 text-center text-[13px] text-content-disabled">
          Not enough settled predictions to render trend. Log outcomes to track accuracy over time.
        </div>
      )}

      {/* Recent Predictions Table */}
      {recentPredictions.length > 0 && (
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium">
            Recent Predictions
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[12px]" role="table" aria-label="Recent oracle predictions">
              <thead>
                <tr className="text-content-disabled text-[10px] uppercase tracking-wider border-b border-surface-border">
                  <th scope="col" className="text-left font-medium pb-2 pr-3">Market</th>
                  <th scope="col" className="text-left font-medium pb-2 px-3 hidden sm:table-cell">Date</th>
                  <th scope="col" className="text-left font-medium pb-2 px-3">Verdict</th>
                  <th scope="col" className="text-right font-medium pb-2 pl-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {recentPredictions.map((p) => {
                  const hasOutcome = p.outcomes?.wasCorrect !== undefined;
                  const isCorrect = p.outcomes?.wasCorrect;
                  const dateStr = new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-content-primary">{p.market.name}, {p.market.state}</div>
                        {p.property?.address && (
                          <div className="text-[10px] text-content-disabled mt-0.5 truncate max-w-[140px]">{p.property.address}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-content-tertiary hidden sm:table-cell font-mono">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="font-mono text-[11px] font-semibold"
                          style={{ color: verdictColor(p.predictions.prismVerdict) }}
                        >
                          {verdictLabel(p.predictions.prismVerdict)}
                        </span>
                        <div className="text-[10px] text-content-disabled mt-0.5">
                          {p.predictions.confidenceLevel}% conf.
                        </div>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {hasOutcome ? (
                          <span
                            className="inline-flex items-center gap-1"
                            aria-label={isCorrect ? "Correct prediction" : "Incorrect prediction"}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald" aria-hidden="true" />
                                <span className="text-emerald font-mono text-[10px]">Correct</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose" aria-hidden="true" />
                                <span className="text-rose font-mono text-[10px]">Wrong</span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1" aria-label="Outcome pending">
                            <Minus className="w-3.5 h-3.5 text-content-disabled" aria-hidden="true" />
                            <span className="text-content-disabled font-mono text-[10px]">Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Journal Section
// ─────────────────────────────────────────────────────────────────────────────

function JournalDonutTooltip({
  active,
  payload,
  totalWithOutcome,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
  totalWithOutcome: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  const pct = totalWithOutcome > 0 ? Math.round((item.value / totalWithOutcome) * 100) : 0;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.payload.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>{item.name}</span>
      </div>
      <div style={{ marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
        <span style={{ fontSize: 14, color: CHART_COLORS.white, fontWeight: 700 }}>{item.value}</span>
        <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary, marginLeft: 4 }}>({pct}%)</span>
      </div>
    </div>
  );
}

function DecisionJournalSection() {
  const journalStats = useDecisionJournalStore((s) => s.getJournalStats());

  const {
    totalDecisions,
    agreedWithSystem,
    systemWasRight,
    systemWasWrong,
    userOverrideWasRight,
    userOverrideWasWrong,
  } = journalStats;

  const totalOverrides = userOverrideWasRight + userOverrideWasWrong;
  const overrideSuccessRate =
    totalOverrides > 0 ? Math.round((userOverrideWasRight / totalOverrides) * 100) : 0;

  const donutData = [
    { name: "Agreed + Right", value: systemWasRight, color: CHART_COLORS.emerald },
    { name: "Overrode + Right", value: userOverrideWasRight, color: CHART_COLORS.gold },
    { name: "Agreed + Wrong", value: systemWasWrong, color: CHART_COLORS.amber },
    { name: "Overrode + Wrong", value: userOverrideWasWrong, color: CHART_COLORS.rose },
  ].filter((d) => d.value > 0);

  const totalWithOutcome = systemWasRight + systemWasWrong + userOverrideWasRight + userOverrideWasWrong;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Decision Outcomes Donut */}
      <div>
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium">
          Decision Outcomes
        </div>
        {donutData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  aria-label="Decision outcome breakdown"
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<JournalDonutTooltip totalWithOutcome={totalWithOutcome} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-content-secondary">{d.name}</span>
                  </div>
                  <span className="font-mono text-content-primary">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-[12px] text-content-disabled">
            Record decision outcomes to see the breakdown.
          </div>
        )}
      </div>

      {/* Override Stats */}
      <div className="space-y-4">
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium">
            Override Success Rate
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-surface-border">
            <div
              className={`metric-value text-4xl font-bold mb-1 ${
                overrideSuccessRate >= 60
                  ? "text-gold"
                  : overrideSuccessRate >= 40
                  ? "text-amber"
                  : "text-rose"
              }`}
              aria-label={`Override success rate: ${overrideSuccessRate}%`}
            >
              {overrideSuccessRate}%
            </div>
            <div className="text-[12px] text-content-tertiary">
              {userOverrideWasRight}W / {userOverrideWasWrong}L on {totalOverrides} system overrides
            </div>
            {totalOverrides > 0 && (
              <div className="mt-3 text-[11px] text-content-secondary leading-relaxed">
                {overrideSuccessRate >= 60
                  ? "Your instincts are beating the algorithm. Trust the pattern."
                  : overrideSuccessRate >= 40
                  ? "Mixed override record. Lean on data — your gut is a coin flip."
                  : "System overrides are costing you. Let the engines lead."}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-surface-border">
            <div className="metric-label mb-1">Total Decisions</div>
            <div className="metric-value text-xl text-content-primary">{totalDecisions}</div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-surface-border">
            <div className="metric-label mb-1">Agreed with System</div>
            <div className="metric-value text-xl text-content-primary">
              {agreedWithSystem}
              <span className="text-[12px] text-content-disabled font-normal ml-1">
                ({totalDecisions > 0 ? Math.round((agreedWithSystem / totalDecisions) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Property Explorer — Interactive Multi-Axis Scatter Chart
// ─────────────────────────────────────────────────────────────────────────────

type ExplorerMetric = "value" | "monthlyCF" | "capRate" | "dscr" | "equity" | "monthlyRent";

interface ExplorerAxisConfig {
  key: ExplorerMetric;
  label: string;
  getValue: (p: Property) => number;
  format: (v: number) => string;
  axisLabel: string;
}

const EXPLORER_AXES: Record<ExplorerMetric, ExplorerAxisConfig> = {
  value: {
    key: "value",
    label: "Property Value",
    getValue: (p) => p.value,
    format: fmtChartCurrency,
    axisLabel: "Value ($)",
  },
  monthlyCF: {
    key: "monthlyCF",
    label: "Monthly Cash Flow",
    getValue: (p) => p.monthlyCF,
    format: (v) => `${fmt(v)}/mo`,
    axisLabel: "Cash Flow/mo ($)",
  },
  capRate: {
    key: "capRate",
    label: "Cap Rate",
    getValue: (p) => p.capRate,
    format: (v) => `${v.toFixed(1)}%`,
    axisLabel: "Cap Rate (%)",
  },
  dscr: {
    key: "dscr",
    label: "DSCR",
    // Approximated from breakdown: NOI = rent - vacancy; debt service = mortgage
    getValue: (p) => {
      const noi = (p.breakdown.rent - p.breakdown.vacancy - p.breakdown.taxes - p.breakdown.insurance - p.breakdown.maintenance) * 12;
      const ds = p.breakdown.mortgage * 12;
      return ds > 0 ? parseFloat((noi / ds).toFixed(2)) : 0;
    },
    format: (v) => `${v.toFixed(2)}x`,
    axisLabel: "DSCR",
  },
  equity: {
    key: "equity",
    label: "Equity",
    getValue: (p) => p.equity,
    format: fmtChartCurrency,
    axisLabel: "Equity ($)",
  },
  monthlyRent: {
    key: "monthlyRent",
    label: "Monthly Rent",
    getValue: (p) => p.breakdown.rent,
    format: (v) => `${fmt(v)}/mo`,
    axisLabel: "Monthly Rent ($)",
  },
};

const PRESETS: { label: string; x: ExplorerMetric; y: ExplorerMetric }[] = [
  { label: "Risk vs Return", x: "capRate", y: "monthlyCF" },
  { label: "Value vs Income", x: "value", y: "monthlyRent" },
  { label: "Leverage", x: "equity", y: "value" },
];

interface ExplorerTooltipProps {
  active?: boolean;
  payload?: { payload: Property & { xVal: number; yVal: number } }[];
  xConfig: ExplorerAxisConfig;
  yConfig: ExplorerAxisConfig;
}

function ExplorerTooltip({ active, payload, xConfig, yConfig }: ExplorerTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 11, color: CHART_COLORS.white, fontWeight: 600, marginBottom: 6 }}>
        {d.address}
      </p>
      <p style={{ fontSize: 10, color: CHART_COLORS.textSecondary, marginBottom: 4 }}>
        {d.city}, {d.state}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary }}>{xConfig.label}:</span>
          <span style={{ fontSize: 11, color: CHART_COLORS.gold, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {xConfig.format(d.xVal)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary }}>{yConfig.label}:</span>
          <span style={{ fontSize: 11, color: CHART_COLORS.emerald, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {yConfig.format(d.yVal)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, color: CHART_COLORS.textSecondary }}>Value:</span>
          <span style={{ fontSize: 11, color: CHART_COLORS.white, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            {fmtChartCurrency(d.value)}
          </span>
        </div>
        <span style={{ marginTop: 2, fontSize: 10, color: statusColor(d.status), fontFamily: "JetBrains Mono, monospace" }}>
          {d.status}
        </span>
      </div>
    </div>
  );
}

function ExplorerDot(props: {
  cx?: number;
  cy?: number;
  payload?: Property & { color: string };
  r?: number;
}) {
  const { cx = 0, cy = 0, payload, r = 8 } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={payload?.color ?? CHART_COLORS.gold}
      fillOpacity={0.9}
      stroke={CHART_COLORS.border}
      strokeWidth={1.5}
    />
  );
}

function PropertyExplorer() {
  const [xMetric, setXMetric] = useState<ExplorerMetric>("capRate");
  const [yMetric, setYMetric] = useState<ExplorerMetric>("monthlyCF");

  const xConfig = EXPLORER_AXES[xMetric];
  const yConfig = EXPLORER_AXES[yMetric];

  const scatterData = useMemo(
    () =>
      PROPERTIES.map((p) => ({
        ...p,
        xVal: xConfig.getValue(p),
        yVal: yConfig.getValue(p),
        // ZAxis: dot size proportional to property value
        z: Math.round(p.value / 10_000),
        color: statusColor(p.status),
      })),
    [xConfig, yConfig],
  );

  // Quadrant midpoints for reference lines
  const xVals = scatterData.map((d) => d.xVal);
  const yVals = scatterData.map((d) => d.yVal);
  const xMid = (Math.min(...xVals) + Math.max(...xVals)) / 2;
  const yMid = (Math.min(...yVals) + Math.max(...yVals)) / 2;

  const selectClass =
    "bg-surface-secondary border border-surface-border rounded-md px-2.5 py-1.5 text-[11px] " +
    "text-content-secondary focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/40 cursor-pointer";

  return (
    <section className="card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium flex items-center gap-2">
            <Percent className="w-3.5 h-3.5" /> Property Explorer — Adjust Axes
          </div>
          <p className="text-[12px] text-content-tertiary">
            Plot any two metrics. Dot size = property value.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex gap-1 flex-wrap">
          {PRESETS.map((preset) => {
            const isActive = xMetric === preset.x && yMetric === preset.y;
            return (
              <button
                key={preset.label}
                onClick={() => { setXMetric(preset.x); setYMetric(preset.y); }}
                aria-pressed={isActive}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                  isActive
                    ? "bg-gold-muted text-gold-light border-gold/30"
                    : "text-content-disabled hover:text-content-secondary border-surface-border"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Axis Selectors */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="space-y-1">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">X Axis</div>
          <select
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value as ExplorerMetric)}
            className={selectClass}
            aria-label="Select X axis metric"
          >
            {Object.values(EXPLORER_AXES).map((ax) => (
              <option key={ax.key} value={ax.key}>{ax.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Y Axis</div>
          <select
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value as ExplorerMetric)}
            className={selectClass}
            aria-label="Select Y axis metric"
          >
            {Object.values(EXPLORER_AXES).map((ax) => (
              <option key={ax.key} value={ax.key}>{ax.label}</option>
            ))}
          </select>
        </div>

        {/* Status Legend */}
        <div className="flex items-end gap-3 ml-auto flex-wrap">
          {(["Performing", "Watch", "Underperforming"] as Status[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: statusColor(s), opacity: 0.9 }}
              />
              <span className="text-[10px] text-content-tertiary">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
          <CartesianGrid {...GRID_STYLE} vertical={true} />
          <XAxis
            type="number"
            dataKey="xVal"
            name={xConfig.label}
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            tickFormatter={(v: number) => xConfig.format(v)}
            label={{
              value: xConfig.axisLabel,
              position: "insideBottom",
              offset: -16,
              fill: CHART_COLORS.text,
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <YAxis
            type="number"
            dataKey="yVal"
            name={yConfig.label}
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            tickFormatter={(v: number) => yConfig.format(v)}
            width={52}
            label={{
              value: yConfig.axisLabel,
              angle: -90,
              position: "insideLeft",
              offset: 12,
              fill: CHART_COLORS.text,
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 220]} />
          <Tooltip
            content={
              <ExplorerTooltip
                xConfig={xConfig}
                yConfig={yConfig}
                active={undefined}
                payload={undefined}
              />
            }
            cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }}
          />

          {/* Quadrant dividers */}
          <ReferenceLine
            x={xMid}
            stroke={CHART_COLORS.border}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <ReferenceLine
            y={yMid}
            stroke={CHART_COLORS.border}
            strokeDasharray="4 3"
            strokeWidth={1}
          />

          <Scatter
            data={scatterData}
            shape={(props: { cx?: number; cy?: number; payload?: Property & { color: string }; r?: number }) => (
              <ExplorerDot {...props} />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant labels — update dynamically */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-emerald/[0.04] border border-emerald/[0.08]">
          <p className="text-[10px] font-semibold text-emerald-light uppercase tracking-wider mb-0.5">Top Right</p>
          <p className="text-[11px] text-content-tertiary">
            High {xConfig.label} + High {yConfig.label}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-amber/[0.04] border border-amber/[0.08]">
          <p className="text-[10px] font-semibold text-amber-light uppercase tracking-wider mb-0.5">Top Left</p>
          <p className="text-[11px] text-content-tertiary">
            Low {xConfig.label} + High {yConfig.label}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-amber/[0.04] border border-amber/[0.08]">
          <p className="text-[10px] font-semibold text-amber-light uppercase tracking-wider mb-0.5">Bottom Right</p>
          <p className="text-[11px] text-content-tertiary">
            High {xConfig.label} + Low {yConfig.label}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-rose/[0.04] border border-rose/[0.08]">
          <p className="text-[10px] font-semibold text-rose-light uppercase tracking-wider mb-0.5">Bottom Left</p>
          <p className="text-[11px] text-content-tertiary">
            Low {xConfig.label} + Low {yConfig.label} — review or exit
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo seeder hook — seeds oracle + journal stores on first portfolio view
// Uses localStorage flag so it only runs once per browser session
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_SEED_FLAG = "lv_portfolio_demo_seeded_v1";

function usePortfolioDemoSeed() {
  const seeded = useRef(false);
  const predictions = useOracleStore((s) => s.predictions);
  const addPrediction = useOracleStore((s) => s.addPrediction);
  const recordOutcome = useOracleStore((s) => s.recordOutcome);
  const journalEntries = useDecisionJournalStore((s) => s.entries);
  const addEntry = useDecisionJournalStore((s) => s.addEntry);
  const addOutcome = useDecisionJournalStore((s) => s.addOutcome);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    // Already seeded in a prior session
    if (typeof window !== "undefined" && localStorage.getItem(DEMO_SEED_FLAG)) return;

    // Stores already have real data — don't overwrite
    if (predictions.length > 0 || journalEntries.length > 0) return;

    // Seed oracle predictions
    for (const predData of DEMO_PREDICTIONS) {
      const { outcomes, ...rest } = predData;
      const pred = addPrediction(rest);
      if (outcomes) {
        recordOutcome(pred.id, outcomes);
      }
    }

    // Seed decision journal
    for (const entryData of DEMO_JOURNAL_ENTRIES) {
      const { outcome, ...rest } = entryData;
      const id = addEntry(rest);
      if (outcome) {
        addOutcome(id, outcome);
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_SEED_FLAG, "1");
    }
  }, [predictions.length, journalEntries.length, addPrediction, recordOutcome, addEntry, addOutcome]);
}

export default function PortfolioPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Seed demo data on first load if stores are empty
  usePortfolioDemoSeed();

  const goalPct = Math.round((GOAL.current / GOAL.target) * 100);
  const avgCF = Math.round(GOAL.current / PROPERTIES.length);
  const propertiesNeeded = Math.ceil((GOAL.target - GOAL.current) / avgCF);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          Manage
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Portfolio</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          Track your properties, wealth attribution, and path to financial freedom.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI.map((k) => (
          <div key={k.label} className="card-glass">
            <div className="flex items-center gap-1.5 mb-1.5">
              <k.icon className="w-3.5 h-3.5 text-content-tertiary" />
              <span className="metric-label">{k.label}</span>
            </div>
            <div className="metric-value text-xl">{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── CHART 1 ── Portfolio Value + Equity + DSCR (Dual-Axis Area Chart) ── */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> Portfolio Performance — 12 Months
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: CHART_COLORS.gold }} />
            <span className="text-[11px] text-content-tertiary">Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} />
            <span className="text-[11px] text-content-tertiary">Total Equity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full border-b border-dashed" style={{ borderColor: CHART_COLORS.amber, borderWidth: 1.5, backgroundColor: "transparent", height: 0 }} />
            <span className="text-[11px] text-content-tertiary">DSCR (right axis)</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={PERFORMANCE_DATA} margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="gradPortfolioValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.18} />
                <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.14} />
                <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="month"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            {/* Left Y axis — value + equity */}
            <YAxis
              yAxisId="left"
              tickFormatter={fmtChartCurrency}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              width={52}
              domain={["auto", "auto"]}
            />
            {/* Right Y axis — DSCR */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => `${v.toFixed(2)}x`}
              tick={{ ...AXIS_STYLE.tick, fill: CHART_COLORS.amber }}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              width={44}
              domain={[1.0, 1.6]}
            />
            <Tooltip content={<PerformanceTooltip />} cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="portfolioValue"
              stroke={CHART_COLORS.gold}
              strokeWidth={2}
              fill="url(#gradPortfolioValue)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: "#000", strokeWidth: 2 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="totalEquity"
              stroke={CHART_COLORS.emerald}
              strokeWidth={2}
              fill="url(#gradEquity)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.emerald, stroke: "#000", strokeWidth: 2 }}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="dscr"
              stroke={CHART_COLORS.amber}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.amber, stroke: "#000", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Wealth Attribution + Goal Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wealth Attribution — Donut Chart */}
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Wealth Attribution
          </div>
          <p className="text-[15px] font-semibold text-content-primary mb-3">
            Your wealth grew <span className="font-mono text-emerald-light">{fmt(WEALTH.total)}</span> this month
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={DONUT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {DONUT_DATA.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
              <DonutCenterLabel cx={0} cy={0} total={WEALTH.total} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="space-y-1.5 mt-2">
            {DONUT_DATA.map((w) => (
              <div key={w.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                  <span className="text-content-secondary">{w.name}</span>
                </div>
                <span className="font-mono text-content-primary">{fmt(w.value)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Goal Tracker */}
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> Goal Tracker
          </div>
          <p className="text-[13px] text-content-secondary mb-2">
            <span className="font-mono text-content-primary font-semibold">{fmt(GOAL.target)}/mo</span> passive income target
          </p>
          <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden mb-2">
            <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-mono text-emerald-light">{fmt(GOAL.current)}/mo</span>
            <span className="font-mono text-content-tertiary">{goalPct}%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] text-[12px] text-content-tertiary leading-relaxed">
            Need <span className="font-mono text-content-primary font-medium">{propertiesNeeded}</span> more properties at your average.
            At current pace: <span className="font-mono text-content-primary font-medium">14 months</span>.
          </div>
        </section>
      </div>

      {/* AI Insight — Portfolio Health */}
      <AiInsightCard title="Portfolio Health">
        Your portfolio generates <span className="font-mono text-content-primary">$1,140/mo</span> across 4 properties — 23% of your $5,000 target.
        Nashville (789 Elm Street) at <span className="font-mono text-rose-light">$100/mo</span> is underperforming — consider refinancing at today&apos;s{" "}
        <span className="font-mono text-content-primary">6.95%</span> vs your current{" "}
        <span className="font-mono text-content-primary">7.50%</span> rate to gain ~$35/mo.
        Best performer: Austin at <span className="font-mono text-emerald-light">$420/mo</span> (37% of total cash flow).
        At current pace, you need 14 more months and ~10 more properties to hit your passive income goal.
      </AiInsightCard>

      {/* ── CHART 4 ── Risk-Return Scatter (Quant Centerpiece) ── */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium flex items-center gap-2">
          <Percent className="w-3.5 h-3.5" /> Risk-Return Map
        </div>
        <p className="text-[12px] text-content-tertiary mb-4">
          Each dot = one property. Size = value. Color = performance status.
        </p>

        {/* Scatter legend */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {[
            { label: "Performing", color: CHART_COLORS.emerald },
            { label: "Watch", color: CHART_COLORS.amber },
            { label: "Underperforming", color: CHART_COLORS.rose },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color, opacity: 0.85 }} />
              <span className="text-[11px] text-content-tertiary">{s.label}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid {...GRID_STYLE} vertical={true} />
            <XAxis
              type="number"
              dataKey="capRate"
              name="Cap Rate"
              domain={[5, 8]}
              tickFormatter={(v: number) => `${v}%`}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              label={{
                value: "Cap Rate (%)",
                position: "insideBottom",
                offset: -12,
                fill: CHART_COLORS.text,
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <YAxis
              type="number"
              dataKey="cashFlow"
              name="Monthly Cash Flow"
              domain={[50, 500]}
              tickFormatter={fmtChartCurrency}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              width={48}
              label={{
                value: "Cash Flow/mo",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: CHART_COLORS.text,
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            {/* ZAxis: maps z (value/10K) → dot radius 40-160px area (r ~7-14px) */}
            <ZAxis type="number" dataKey="z" range={[60, 200]} />
            <Tooltip content={<ScatterTooltip />} cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }} />

            {/* Quadrant reference lines */}
            <ReferenceLine
              x={6.5}
              stroke={CHART_COLORS.border}
              strokeDasharray="4 3"
              strokeWidth={1}
            />
            <ReferenceLine
              y={275}
              stroke={CHART_COLORS.border}
              strokeDasharray="4 3"
              strokeWidth={1}
            />

            {/* Single scatter series — dots colored individually via shape */}
            <Scatter
              data={SCATTER_DATA}
              shape={(props: { cx?: number; cy?: number; payload?: { color: string }; r?: number }) => (
                <ScatterDot {...props} />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant labels */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-emerald/[0.04] border border-emerald/[0.08]">
            <p className="text-[10px] font-semibold text-emerald-light uppercase tracking-wider mb-0.5">Top Right</p>
            <p className="text-[11px] text-content-tertiary">High Yield + High CF — best quadrant</p>
          </div>
          <div className="p-2 rounded-lg bg-rose/[0.04] border border-rose/[0.08]">
            <p className="text-[10px] font-semibold text-rose-light uppercase tracking-wider mb-0.5">Bottom Left</p>
            <p className="text-[11px] text-content-tertiary">Low Yield + Low CF — review or exit</p>
          </div>
        </div>
      </section>

      {/* ── Property Explorer — Interactive Multi-Axis Chart ── */}
      <PropertyExplorer />

      {/* Cash Flow by Property — Horizontal Bar Chart */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> Cash Flow by Property
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={CASHFLOW_DATA}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid {...GRID_STYLE} horizontal={false} vertical={true} />
            <XAxis
              type="number"
              tickFormatter={fmtChartCurrency}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <YAxis
              type="category"
              dataKey="address"
              width={110}
              tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="cashFlow" radius={[0, 4, 4, 0]}>
              {CASHFLOW_DATA.map((entry) => (
                <Cell key={entry.address} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── CHART 2 ── LTV Progression ── */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" /> Loan-to-Value Progression
        </div>
        <p className="text-[12px] text-content-tertiary mb-4">
          LTV declining as equity builds through paydown and appreciation.
        </p>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={LTV_DATA} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="gradLtv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.2} />
                <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />

            {/* Color zone backgrounds */}
            <ReferenceArea y1={80} y2={100} fill={CHART_COLORS.rose} fillOpacity={0.04} />
            <ReferenceArea y1={60} y2={80} fill={CHART_COLORS.amber} fillOpacity={0.04} />
            <ReferenceArea y1={0} y2={60} fill={CHART_COLORS.emerald} fillOpacity={0.04} />

            <XAxis
              dataKey="month"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <YAxis
              tickFormatter={fmtChartPct}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              width={44}
              domain={[70, 85]}
            />
            <Tooltip content={<LtvTooltip />} cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }} />

            {/* Reference lines */}
            <ReferenceLine
              y={80}
              stroke={CHART_COLORS.rose}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: "Danger Zone 80%",
                position: "insideTopRight",
                fill: CHART_COLORS.rose,
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <ReferenceLine
              y={60}
              stroke={CHART_COLORS.emerald}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: "Strong Equity 60%",
                position: "insideTopRight",
                fill: CHART_COLORS.emerald,
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />

            <Area
              type="monotone"
              dataKey="ltv"
              stroke={CHART_COLORS.amber}
              strokeWidth={2}
              fill="url(#gradLtv)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.amber, stroke: "#000", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* ── CHART 3 ── Monthly Cash Flow Trend vs Goal ── */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> Cash Flow Trajectory vs Goal
        </div>
        <p className="text-[12px] text-content-tertiary mb-4">
          Portfolio cash flow trending toward{" "}
          <span className="font-mono text-content-secondary">{fmt(GOAL.target)}/mo</span> target.
        </p>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={CF_TREND_DATA} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="gradCfTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.18} />
                <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="month"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            <YAxis
              tickFormatter={fmtChartCurrency}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              width={48}
              domain={[800, GOAL.target + 200]}
            />
            <Tooltip content={<CfTrendTooltip />} cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }} />

            {/* Goal target line */}
            <ReferenceLine
              y={GOAL.target}
              stroke={CHART_COLORS.emerald}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Goal ${fmt(GOAL.target)}/mo`,
                position: "insideTopRight",
                fill: CHART_COLORS.emerald,
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />

            <Area
              type="monotone"
              dataKey="cashFlow"
              stroke={CHART_COLORS.gold}
              strokeWidth={2}
              fill="url(#gradCfTrend)"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: "#000", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Properties Table */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" /> Properties
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider">
                <th className="text-left font-medium pb-2 pr-3">Property</th>
                <th className="text-right font-medium pb-2 px-3">Value</th>
                <th className="text-right font-medium pb-2 px-3 hidden sm:table-cell">Cash Flow</th>
                <th className="text-right font-medium pb-2 px-3 hidden sm:table-cell">Cap Rate</th>
                <th className="text-center font-medium pb-2 px-3">Status</th>
                <th className="w-8 pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {PROPERTIES.map((p) => {
                const isOpen = expanded.has(p.address);
                return (
                  <tr key={p.address} className="group">
                    <td colSpan={6} className="p-0">
                      <button
                        onClick={() => setExpanded(prev => {
                          const next = new Set(prev);
                          if (next.has(p.address)) next.delete(p.address);
                          else next.add(p.address);
                          return next;
                        })}
                        className="w-full flex items-center hover:bg-white/[0.02] transition-colors py-2.5"
                      >
                        <span className="flex-1 text-left pr-3">
                          <span className="font-medium text-content-primary">{p.address}</span>
                          <span className="text-xs text-content-disabled ml-2">{p.city}, {p.state}</span>
                        </span>
                        <span className="font-mono text-content-secondary px-3 text-right w-24">{fmt(p.value)}</span>
                        <span className="font-mono text-emerald-light px-3 text-right w-20 hidden sm:block">{fmt(p.monthlyCF)}</span>
                        <span className="font-mono text-content-secondary px-3 text-right w-16 hidden sm:block">{p.capRate}%</span>
                        <span className="px-3 text-center w-28"><span className={statusBadge(p.status)}>{p.status}</span></span>
                        <span className="w-8 flex justify-center text-content-disabled">
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="pb-3 pl-4 pr-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            {[
                              { label: "Rent", value: p.breakdown.rent },
                              { label: "Mortgage", value: -p.breakdown.mortgage },
                              { label: "Taxes", value: -p.breakdown.taxes },
                              { label: "Insurance", value: -p.breakdown.insurance },
                              { label: "Maintenance", value: -p.breakdown.maintenance },
                              { label: "Vacancy", value: -p.breakdown.vacancy },
                            ].map((b) => (
                              <div key={b.label} className="flex items-center justify-between">
                                <span className="text-[11px] text-content-tertiary">{b.label}</span>
                                <span className={`font-mono text-xs ${b.value >= 0 ? "text-emerald-light" : "text-content-secondary"}`}>
                                  {b.value >= 0 ? "+" : ""}{fmt(b.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Oracle Performance Dashboard ── */}
      <section className="card-gold space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" /> Oracle Track Record
            </div>
            <p className="text-[12px] text-content-tertiary">
              How well your predictions matched reality — calibrated against actual outcomes.
            </p>
          </div>
        </div>
        <OraclePerformanceSection />
      </section>

      {/* ── Decision Journal ── */}
      <section className="card space-y-4">
        <div>
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Decision Journal
          </div>
          <p className="text-[12px] text-content-tertiary">
            When did you beat the algorithm — and when did the algorithm beat you?
          </p>
        </div>
        <DecisionJournalSection />
      </section>
    </div>
  );
}
