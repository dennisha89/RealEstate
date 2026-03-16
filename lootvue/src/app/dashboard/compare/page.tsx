"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Scale, Plus, X, Trophy, ArrowUpRight, Database, ChevronDown } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CHART_COLORS, TOOLTIP_STYLE, AiInsightCard,
} from "@/components/charts/ChartTheme";
import { useDealPipelineStore, type DealEntry } from "@/lib/stores/deal-pipeline-store";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Source tag distinguishes real pipeline data from static sample properties */
type PropertySource = "sample" | "pipeline";

interface CompProperty {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  source: PropertySource;

  // Core return metrics
  score: number;       // 0-100 composite score (apexScore or synthetic)
  capRate: number;     // %
  cashFlow: number;    // $/mo net after all expenses + debt service
  cocReturn: number;   // % cash-on-cash return
  dscr: number;        // debt service coverage ratio
  appreciation: number; // % annual expected

  // Extended dimensions
  irr: number;             // % 5-year IRR estimate
  npv: number;             // $ net present value at 8% discount
  equityMultiple: number;  // total equity multiple over hold period

  // Deal quality signals
  dom: number;             // days on market
  valueDiscount: number;   // % below/above estimated value (negative = below ask = good for buyer)
  pricePerSqft: number;    // $ / sqft — computed: price / sqft
  grm: number;             // gross rent multiplier — price / (cashFlow * 12 est. gross)
  breakevenOccupancy: number; // % occupancy needed to break even
  monthlyMortgage: number; // $ monthly P&I
}

// ─── Static sample property pool ─────────────────────────────────────────────
// All monetary values in dollars; percentages as decimals where noted.
// IRR / NPV / equity multiple are conservative 5-year estimates assuming 20% down, 7% rate.
// GRM = price / (annualGrossRent). BreakevenOcc = (mortgage + fixed expenses) / monthlyRent.

const STATIC_POOL: CompProperty[] = [
  {
    id: "c1", source: "sample",
    address: "1847 Oak Valley Dr, Austin TX",
    price: 385_000, beds: 4, baths: 2, sqft: 2_100,
    score: 82, capRate: 6.8, cashFlow: 420, cocReturn: 7.1, dscr: 1.32,
    appreciation: 4.8, dom: 18, valueDiscount: -3.2,
    pricePerSqft: Math.round(385_000 / 2_100),
    grm: parseFloat((385_000 / ((420 + 385_000 * 0.068 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 74,
    monthlyMortgage: 2_055,
    irr: 13.2, npv: 28_400, equityMultiple: 1.68,
  },
  {
    id: "c2", source: "sample",
    address: "920 Magnolia Ln, Raleigh NC",
    price: 312_000, beds: 3, baths: 2, sqft: 1_650,
    score: 78, capRate: 7.1, cashFlow: 380, cocReturn: 7.8, dscr: 1.25,
    appreciation: 5.2, dom: 24, valueDiscount: -1.8,
    pricePerSqft: Math.round(312_000 / 1_650),
    grm: parseFloat((312_000 / ((380 + 312_000 * 0.071 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 76,
    monthlyMortgage: 1_664,
    irr: 14.1, npv: 31_200, equityMultiple: 1.74,
  },
  {
    id: "c3", source: "sample",
    address: "4501 Bay Shore Blvd, Tampa FL",
    price: 445_000, beds: 4, baths: 3, sqft: 2_400,
    score: 74, capRate: 5.9, cashFlow: 210, cocReturn: 3.8, dscr: 1.12,
    appreciation: 3.5, dom: 32, valueDiscount: 1.2,
    pricePerSqft: Math.round(445_000 / 2_400),
    grm: parseFloat((445_000 / ((210 + 445_000 * 0.059 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 88,
    monthlyMortgage: 2_374,
    irr: 9.4, npv: 8_900, equityMultiple: 1.41,
  },
  {
    id: "c4", source: "sample",
    address: "2280 Cedar Ridge Ct, Nashville TN",
    price: 358_000, beds: 3, baths: 2, sqft: 1_800,
    score: 76, capRate: 6.5, cashFlow: 340, cocReturn: 6.1, dscr: 1.22,
    appreciation: 4.1, dom: 28, valueDiscount: -2.5,
    pricePerSqft: Math.round(358_000 / 1_800),
    grm: parseFloat((358_000 / ((340 + 358_000 * 0.065 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 80,
    monthlyMortgage: 1_909,
    irr: 11.8, npv: 21_600, equityMultiple: 1.58,
  },
  {
    id: "c5", source: "sample",
    address: "6739 Pine Creek Dr, Charlotte NC",
    price: 295_000, beds: 3, baths: 2, sqft: 1_550,
    score: 80, capRate: 7.4, cashFlow: 460, cocReturn: 10.0, dscr: 1.38,
    appreciation: 4.5, dom: 15, valueDiscount: -4.1,
    pricePerSqft: Math.round(295_000 / 1_550),
    grm: parseFloat((295_000 / ((460 + 295_000 * 0.074 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 70,
    monthlyMortgage: 1_573,
    irr: 15.6, npv: 38_700, equityMultiple: 1.83,
  },
  {
    id: "c6", source: "sample",
    address: "1105 Elm Park Ave, Phoenix AZ",
    price: 275_000, beds: 3, baths: 2, sqft: 1_400,
    score: 62, capRate: 5.2, cashFlow: 85, cocReturn: 1.9, dscr: 1.05,
    appreciation: 2.1, dom: 52, valueDiscount: 2.8,
    pricePerSqft: Math.round(275_000 / 1_400),
    grm: parseFloat((275_000 / ((85 + 275_000 * 0.052 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 94,
    monthlyMortgage: 1_466,
    irr: 6.2, npv: -4_200, equityMultiple: 1.18,
  },
  {
    id: "c7", source: "sample",
    address: "3344 Birch Hollow Way, Austin TX",
    price: 410_000, beds: 4, baths: 3, sqft: 2_250,
    score: 85, capRate: 7.0, cashFlow: 520, cocReturn: 8.1, dscr: 1.41,
    appreciation: 5.5, dom: 12, valueDiscount: -5.0,
    pricePerSqft: Math.round(410_000 / 2_250),
    grm: parseFloat((410_000 / ((520 + 410_000 * 0.070 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 71,
    monthlyMortgage: 2_188,
    irr: 16.3, npv: 44_100, equityMultiple: 1.89,
  },
  {
    id: "c8", source: "sample",
    address: "880 Walnut Springs Rd, Raleigh NC",
    price: 268_000, beds: 2, baths: 1, sqft: 1_200,
    score: 72, capRate: 6.3, cashFlow: 290, cocReturn: 6.9, dscr: 1.18,
    appreciation: 3.8, dom: 35, valueDiscount: -0.5,
    pricePerSqft: Math.round(268_000 / 1_200),
    grm: parseFloat((268_000 / ((290 + 268_000 * 0.063 / 12) * 12)).toFixed(1)),
    breakevenOccupancy: 82,
    monthlyMortgage: 1_429,
    irr: 10.9, npv: 14_800, equityMultiple: 1.52,
  },
];

// ─── Convert pipeline DealEntry into CompProperty ────────────────────────────
// Only deals with analysis data (capRate, monthlyCashFlow, cashOnCash) are eligible.
// IRR/NPV/equityMultiple fall back to lightweight 5-year estimates when not stored.
// Mortgage is approximated via pipeline financing if present, otherwise 20% / 7% default.

function dealToCompProperty(deal: DealEntry): CompProperty | null {
  if (!deal.analysis) return null;
  const { capRate, monthlyCashFlow, cashOnCash, apexScore } = deal.analysis;
  const price = deal.price;

  // Financing: use stored financing if present, else 20% down at 7%
  const rate = deal.financing?.interestRate ?? 7.0;
  const downPct = deal.financing
    ? (deal.financing.downPayment / price) * 100
    : 20;
  const loanAmount = price * (1 - downPct / 100);
  const r = rate / 100 / 12;
  const n = 30 * 12;
  const monthlyMortgage = r > 0
    ? Math.round(loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : Math.round(loanAmount / n);

  // GRM needs gross annual rent — back-calculate from cap rate and cash flow
  // NOI = price * capRate / 100 → gross rent ≈ NOI / 0.65 (35% expense ratio typical)
  const annualNOI = price * (capRate / 100);
  const estimatedAnnualGrossRent = annualNOI / 0.65;
  const grm = estimatedAnnualGrossRent > 0
    ? parseFloat((price / estimatedAnnualGrossRent).toFixed(1))
    : 0;

  // Breakeven occupancy = (monthlyMortgage + fixed monthly expenses) / monthly gross rent
  const estimatedMonthlyRent = estimatedAnnualGrossRent / 12;
  const fixedMonthlyExpenses = Math.round((price * 0.0125) / 12) + Math.round((price * 0.007) / 12);
  const breakevenOccupancy = estimatedMonthlyRent > 0
    ? Math.round(((monthlyMortgage + fixedMonthlyExpenses) / estimatedMonthlyRent) * 100)
    : 100;

  // Conservative 5-year IRR approximation:
  // IRR ≈ (CoC + annual appreciation) adjusted for equity paydown
  const approxAppreciation = 3.5; // conservative default when unknown
  const estimatedIRR = parseFloat((cashOnCash * 0.6 + approxAppreciation * 1.4).toFixed(1));

  // Simplified NPV at 8% hurdle: PV of 5yr cash flows + terminal equity - initial equity
  const downPayment = price * (downPct / 100);
  const annualCashFlow = monthlyCashFlow * 12;
  const terminalValue = price * Math.pow(1 + approxAppreciation / 100, 5);
  const loanBalance5yr = loanAmount * Math.pow(1 + r, 60) - (monthlyMortgage * (Math.pow(1 + r, 60) - 1) / r);
  const terminalEquity = terminalValue - loanBalance5yr - price * 0.06; // selling costs
  const pvCashFlows = [1, 2, 3, 4, 5].reduce((sum, yr) => sum + annualCashFlow / Math.pow(1.08, yr), 0);
  const pvTerminal = terminalEquity / Math.pow(1.08, 5);
  const npv = Math.round(pvCashFlows + pvTerminal - downPayment);

  const equityMultiple = downPayment > 0
    ? parseFloat(((pvCashFlows + pvTerminal) / downPayment).toFixed(2))
    : 1;

  // sqft is not stored in DealEntry — use 0 to indicate unavailable; pricePerSqft will show "N/A"
  const sqft = 0;

  return {
    id: deal.id,
    source: "pipeline",
    address: deal.address,
    price,
    beds: 0,
    baths: 0,
    sqft,
    score: apexScore,
    capRate,
    cashFlow: monthlyCashFlow,
    cocReturn: cashOnCash,
    dscr: annualNOI / (monthlyMortgage * 12) || 1.0,
    appreciation: approxAppreciation,
    dom: 0,
    valueDiscount: 0,
    pricePerSqft: 0,
    grm,
    breakevenOccupancy,
    monthlyMortgage,
    irr: estimatedIRR,
    npv,
    equityMultiple,
  };
}

// ─── Metric definitions ───────────────────────────────────────────────────────

type MetricDef = {
  key: string;
  label: string;
  format: (p: CompProperty) => string;
  best: "high" | "low";
  raw: (p: CompProperty) => number;
  /** If true, show "N/A" when the raw value is 0 */
  zeroMeansNA?: boolean;
};

const METRICS: MetricDef[] = [
  {
    key: "price", label: "Price",
    format: (p) => `$${(p.price / 1_000).toFixed(0)}K`,
    best: "low", raw: (p) => p.price,
  },
  {
    key: "score", label: "Score",
    format: (p) => `${p.score}`,
    best: "high", raw: (p) => p.score,
  },
  {
    key: "capRate", label: "Cap Rate",
    format: (p) => `${p.capRate.toFixed(1)}%`,
    best: "high", raw: (p) => p.capRate,
  },
  {
    key: "cashFlow", label: "Cash Flow",
    format: (p) => `$${p.cashFlow.toLocaleString()}/mo`,
    best: "high", raw: (p) => p.cashFlow,
  },
  {
    key: "cocReturn", label: "Cash-on-Cash",
    format: (p) => `${p.cocReturn.toFixed(1)}%`,
    best: "high", raw: (p) => p.cocReturn,
  },
  {
    key: "dscr", label: "DSCR",
    format: (p) => p.dscr.toFixed(2) + "x",
    best: "high", raw: (p) => p.dscr,
  },
  {
    key: "irr", label: "5-Yr IRR",
    format: (p) => `${p.irr.toFixed(1)}%`,
    best: "high", raw: (p) => p.irr,
  },
  {
    key: "npv", label: "NPV (8%)",
    format: (p) =>
      p.npv >= 0
        ? `$${(p.npv / 1_000).toFixed(0)}K`
        : `($${(Math.abs(p.npv) / 1_000).toFixed(0)}K)`,
    best: "high", raw: (p) => p.npv,
  },
  {
    key: "equityMultiple", label: "Equity Multiple",
    format: (p) => `${p.equityMultiple.toFixed(2)}x`,
    best: "high", raw: (p) => p.equityMultiple,
  },
  {
    key: "monthlyMortgage", label: "Monthly Mortgage",
    format: (p) => `$${p.monthlyMortgage.toLocaleString()}`,
    best: "low", raw: (p) => p.monthlyMortgage,
  },
  {
    key: "pricePerSqft", label: "Price / Sqft",
    format: (p) => p.pricePerSqft > 0 ? `$${p.pricePerSqft}` : "N/A",
    best: "low", raw: (p) => p.pricePerSqft, zeroMeansNA: true,
  },
  {
    key: "grm", label: "GRM",
    format: (p) => p.grm > 0 ? p.grm.toFixed(1) + "x" : "N/A",
    best: "low", raw: (p) => p.grm, zeroMeansNA: true,
  },
  {
    key: "breakevenOccupancy", label: "Breakeven Occ.",
    format: (p) => `${p.breakevenOccupancy}%`,
    best: "low", raw: (p) => p.breakevenOccupancy,
  },
  {
    key: "appreciation", label: "Appreciation",
    format: (p) => `${p.appreciation.toFixed(1)}%/yr`,
    best: "high", raw: (p) => p.appreciation,
  },
  {
    key: "dom", label: "Days on Market",
    format: (p) => p.dom > 0 ? `${p.dom}d` : "N/A",
    best: "low", raw: (p) => p.dom, zeroMeansNA: true,
  },
  {
    key: "valueDiscount", label: "Value vs Ask",
    format: (p) => p.dom > 0 || p.source === "sample"
      ? `${p.valueDiscount > 0 ? "+" : ""}${p.valueDiscount.toFixed(1)}%`
      : "N/A",
    best: "low", raw: (p) => p.valueDiscount,
  },
  {
    key: "beds", label: "Beds / Baths",
    format: (p) => p.beds > 0 ? `${p.beds}bd / ${p.baths}ba` : "N/A",
    best: "high", raw: (p) => p.beds, zeroMeansNA: true,
  },
  {
    key: "sqft", label: "Sqft",
    format: (p) => p.sqft > 0 ? p.sqft.toLocaleString() : "N/A",
    best: "high", raw: (p) => p.sqft, zeroMeansNA: true,
  },
];

// ─── Radar chart configuration ────────────────────────────────────────────────

type RadarDim = { subject: string; [key: string]: number | string };

const RADAR_DIMS: {
  key: keyof CompProperty;
  label: string;
  invert: boolean;
  min: number;
  max: number;
}[] = [
  { key: "score",              label: "Score",        invert: false, min: 50, max: 100 },
  { key: "capRate",            label: "Cap Rate",     invert: false, min: 4,  max: 9   },
  { key: "cashFlow",           label: "Cash Flow",    invert: false, min: 0,  max: 600 },
  { key: "dscr",               label: "DSCR",         invert: false, min: 1.0, max: 1.6 },
  { key: "cocReturn",          label: "CoC Return",   invert: false, min: 0, max: 15  },
  { key: "breakevenOccupancy", label: "Breakeven",    invert: true,  min: 65, max: 100 },
  { key: "appreciation",       label: "Appreciation", invert: false, min: 1, max: 7   },
  { key: "valueDiscount",      label: "Value Disc.",  invert: true,  min: -6, max: 4  },
];

const PROPERTY_COLORS = [
  CHART_COLORS.gold,
  CHART_COLORS.emerald,
  CHART_COLORS.rose,
  CHART_COLORS.amber,
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function normalize(value: number, min: number, max: number, invert: boolean): number {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);
  const normalized = invert ? (1 - pct) * 100 : pct * 100;
  return Math.round(normalized);
}

function buildRadarData(selected: CompProperty[]): RadarDim[] {
  return RADAR_DIMS.map((dim) => {
    const row: RadarDim = { subject: dim.label };
    for (const p of selected) {
      const raw = p[dim.key] as number;
      row[p.id] = normalize(raw, dim.min, dim.max, dim.invert);
    }
    return row;
  });
}

function isWinner(metric: MetricDef, value: number, all: number[]): boolean {
  if (all.length < 2) return false;
  if (metric.zeroMeansNA && value === 0) return false;
  const eligible = metric.zeroMeansNA ? all.filter((v) => v !== 0) : all;
  if (eligible.length < 2) return false;
  return metric.best === "high"
    ? value === Math.max(...eligible)
    : value === Math.min(...eligible);
}

function bestOverall(selected: CompProperty[]): { property: CompProperty; wins: number } | null {
  if (selected.length < 2) return null;
  const scores = new Map<string, number>();
  for (const p of selected) scores.set(p.id, 0);
  for (const m of METRICS) {
    const vals = selected.map((p) => m.raw(p));
    for (let i = 0; i < selected.length; i++) {
      const val = vals[i];
      const prop = selected[i];
      if (val !== undefined && prop !== undefined && isWinner(m, val, vals)) {
        scores.set(prop.id, (scores.get(prop.id) ?? 0) + 1);
      }
    }
  }
  let best: CompProperty | null = null;
  let max = -1;
  for (const p of selected) {
    const s = scores.get(p.id) ?? 0;
    if (s > max) { max = s; best = p; }
  }
  if (!best) return null;
  return { property: best, wins: scores.get(best.id) ?? 0 };
}

/** Find the metric with the largest absolute gap between winner and the worst performer */
function largestGap(selected: CompProperty[], metric: MetricDef): { winner: CompProperty; loser: CompProperty; gapLabel: string } | null {
  if (selected.length < 2) return null;
  const vals = selected.map((p) => ({ p, v: metric.raw(p) }));
  const valid = metric.zeroMeansNA ? vals.filter((x) => x.v !== 0) : vals;
  if (valid.length < 2) return null;
  const sorted = [...valid].sort((a, b) => metric.best === "high" ? b.v - a.v : a.v - b.v);
  const winner = sorted[0]!;
  const loser = sorted[sorted.length - 1]!;
  const delta = Math.abs(winner.v - loser.v);
  const pctGap = loser.v !== 0 ? (delta / Math.abs(loser.v)) * 100 : 0;
  return {
    winner: winner.p,
    loser: loser.p,
    gapLabel: pctGap > 0
      ? `${pctGap.toFixed(0)}% edge`
      : `${delta.toFixed(1)} pt edge`,
  };
}

// ─── Radar tooltip ────────────────────────────────────────────────────────────

function RadarTooltip({
  active, payload, label, allProps,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  allProps: CompProperty[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {label && (
        <p style={{ fontSize: 10, color: "#666666", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>{label}</p>
      )}
      {payload.map((item) => {
        const prop = allProps.find((p) => p.id === item.dataKey);
        return (
          <div key={item.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#999999" }}>{prop?.address.split(",")[0] ?? item.dataKey}:</span>
            <span style={{ fontSize: 12, color: "#E5E5E5", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: PropertySource }) {
  return source === "pipeline" ? (
    <span className="badge badge-emerald flex items-center gap-1 text-[9px]">
      <Database className="w-2.5 h-2.5" aria-hidden="true" />
      Pipeline
    </span>
  ) : (
    <span className="badge text-[9px] text-content-disabled border border-white/[0.06] bg-transparent">
      Sample
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PickerTab = "sample" | "pipeline";

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab>("sample");
  const [expandMetrics, setExpandMetrics] = useState(false);

  // Pull active deals from the pipeline store
  const pipelineDeals = useDealPipelineStore((state) => state.deals);

  // Convert eligible pipeline deals into CompProperty objects (memoized)
  const pipelinePool: CompProperty[] = useMemo(() => {
    return pipelineDeals
      .filter((d) => d.analysis != null)
      .map(dealToCompProperty)
      .filter((p): p is CompProperty => p !== null);
  }, [pipelineDeals]);

  // Combined pool: pipeline first (real data takes priority), then static samples
  const POOL: CompProperty[] = useMemo(() => {
    const pipelineIds = new Set(pipelinePool.map((p) => p.id));
    const staticFiltered = STATIC_POOL.filter((p) => !pipelineIds.has(p.id));
    return [...pipelinePool, ...staticFiltered];
  }, [pipelinePool]);

  const selected = useMemo(
    () => selectedIds.map((id) => POOL.find((p) => p.id === id)).filter((p): p is CompProperty => p != null),
    [selectedIds, POOL]
  );

  const sampleAvailable = STATIC_POOL.filter((p) => !selectedIds.includes(p.id));
  const pipelineAvailable = pipelinePool.filter((p) => !selectedIds.includes(p.id));

  const bestResult = bestOverall(selected);
  const winner = bestResult?.property ?? null;
  const winnerWins = bestResult?.wins ?? 0;

  function addProperty(id: string) {
    if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
      setShowPicker(false);
    }
  }
  function removeProperty(id: string) {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  }

  const radarData = selected.length >= 2 ? buildRadarData(selected) : [];

  // For the AI verdict — find the metric with the biggest gap across all selected
  const irrGap = winner && selected.length >= 2
    ? largestGap(selected, METRICS.find((m) => m.key === "irr")!)
    : null;

  const cashFlowGap = winner && selected.length >= 2
    ? largestGap(selected, METRICS.find((m) => m.key === "cashFlow")!)
    : null;

  // Show a slice of metrics unless expanded
  const INITIAL_METRIC_COUNT = 10;
  const visibleMetrics = expandMetrics ? METRICS : METRICS.slice(0, INITIAL_METRIC_COUNT);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <Scale className="w-3.5 h-3.5" aria-hidden="true" /> Deal Comparison
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Compare Properties</h1>
        <p className="text-[13px] text-content-tertiary mt-1">
          Select up to 4 properties for side-by-side analysis across {METRICS.length} dimensions.
          {pipelinePool.length > 0 && (
            <span className="text-emerald-light ml-1">
              {pipelinePool.length} pipeline deal{pipelinePool.length !== 1 ? "s" : ""} available.
            </span>
          )}
        </p>
      </div>

      {/* Property slots */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => {
          const p = selected[i];
          return p ? (
            <div key={p.id} className="card-glass !p-3 relative group">
              <button
                onClick={() => removeProperty(p.id)}
                aria-label={`Remove ${p.address.split(",")[0]} from comparison`}
                className="absolute top-2 right-2 p-1 rounded-md bg-white/[0.04] text-content-disabled hover:text-rose-light hover:bg-rose-muted transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className={`badge font-mono font-bold ${p.score >= 75 ? "badge-emerald" : p.score >= 55 ? "badge-amber" : "badge-rose"}`}
                  aria-label={`Score: ${p.score}`}
                >
                  {p.score}
                </div>
                <SourceBadge source={p.source} />
              </div>
              <div className="text-[12px] font-medium text-content-primary leading-snug truncate">{p.address}</div>
              <div className="font-mono text-sm font-bold text-content-primary mt-1">${(p.price / 1_000).toFixed(0)}K</div>
              <div className="flex gap-2 mt-1 text-[10px] text-content-disabled font-mono">
                <span className="text-emerald-light">${p.cashFlow}/mo</span>
                <span>{p.capRate.toFixed(1)}% cap</span>
              </div>
            </div>
          ) : (
            <button
              key={i}
              onClick={() => setShowPicker(true)}
              aria-label="Add property to comparison"
              className="card-glass !p-3 flex flex-col items-center justify-center gap-2 min-h-[100px] border-dashed !border-white/[0.1] hover:!border-gold/30 transition-colors"
            >
              <Plus className="w-5 h-5 text-content-disabled" aria-hidden="true" />
              <span className="text-[11px] text-content-disabled">Add Property</span>
            </button>
          );
        })}
      </div>

      {/* Property picker */}
      {showPicker && (
        <div className="card space-y-3" role="dialog" aria-label="Select a property to compare">
          {/* Picker header */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-content-primary">Select a Property</span>
            <button
              onClick={() => setShowPicker(false)}
              aria-label="Close property picker"
              className="text-content-disabled hover:text-content-primary transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-0.5 bg-surface-elevated rounded-lg w-fit">
            <button
              onClick={() => setPickerTab("sample")}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                pickerTab === "sample"
                  ? "bg-surface-card text-content-primary"
                  : "text-content-disabled hover:text-content-secondary"
              }`}
            >
              Sample Data ({sampleAvailable.length})
            </button>
            <button
              onClick={() => setPickerTab("pipeline")}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                pickerTab === "pipeline"
                  ? "bg-surface-card text-content-primary"
                  : "text-content-disabled hover:text-content-secondary"
              }`}
            >
              <Database className="w-3 h-3" aria-hidden="true" />
              Pipeline ({pipelineAvailable.length})
            </button>
          </div>

          {/* Sample list */}
          {pickerTab === "sample" && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {sampleAvailable.length === 0 ? (
                <p className="text-[12px] text-content-disabled py-3 text-center">All sample properties are in the comparison.</p>
              ) : (
                sampleAvailable.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProperty(p.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-gold/20 transition-all text-left"
                  >
                    <div>
                      <div className="text-[12px] font-medium text-content-primary">{p.address}</div>
                      <div className="text-[11px] text-content-tertiary font-mono mt-0.5">
                        ${(p.price / 1_000).toFixed(0)}K | Cap {p.capRate.toFixed(1)}% | IRR {p.irr.toFixed(1)}% | Score {p.score}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-content-disabled shrink-0" aria-hidden="true" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Pipeline list */}
          {pickerTab === "pipeline" && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {pipelineAvailable.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <Database className="w-8 h-8 text-content-disabled mx-auto" aria-hidden="true" />
                  <p className="text-[12px] text-content-disabled">
                    {pipelinePool.length === 0
                      ? "No analyzed pipeline deals yet. Analyze a property first, then add it to the pipeline."
                      : "All pipeline deals are already in the comparison."}
                  </p>
                  {pipelinePool.length === 0 && (
                    <Link href="/dashboard/analyze" className="btn-primary btn-sm inline-flex">
                      <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> Analyze a Deal
                    </Link>
                  )}
                </div>
              ) : (
                pipelineAvailable.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProperty(p.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-emerald/[0.08] hover:border-emerald/20 transition-all text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-content-primary">{p.address}</span>
                        <span className="badge badge-emerald text-[9px]">Pipeline</span>
                      </div>
                      <div className="text-[11px] text-content-tertiary font-mono mt-0.5">
                        ${(p.price / 1_000).toFixed(0)}K | Cap {p.capRate.toFixed(1)}% | CoC {p.cocReturn.toFixed(1)}% | Score {p.score}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-content-disabled shrink-0" aria-hidden="true" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Comparison table */}
      {selected.length >= 2 && (
        <section className="card overflow-x-auto" aria-label="Side-by-side metric comparison table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider">
                <th className="text-left font-medium pb-3 pr-4 sticky left-0 bg-surface-card z-10">Metric</th>
                {selected.map((p, idx) => (
                  <th key={p.id} className="text-right font-medium pb-3 px-3 min-w-[130px]">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-content-secondary normal-case tracking-normal">{p.address.split(",")[0]}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: PROPERTY_COLORS[idx % PROPERTY_COLORS.length] }}
                          aria-hidden="true"
                        />
                        <SourceBadge source={p.source} />
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {visibleMetrics.map((m) => {
                const vals = selected.map((p) => m.raw(p));
                return (
                  <tr key={m.key} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 text-content-secondary sticky left-0 bg-surface-card z-10 whitespace-nowrap">
                      {m.label}
                    </td>
                    {selected.map((p, i) => {
                      const val = vals[i] ?? 0;
                      const win = isWinner(m, val, vals);
                      const isNA = m.zeroMeansNA && val === 0;
                      return (
                        <td
                          key={p.id}
                          className={`py-2.5 px-3 text-right font-mono ${
                            isNA
                              ? "text-content-disabled"
                              : win
                              ? "text-emerald-light font-semibold"
                              : "text-content-tertiary"
                          }`}
                          aria-label={`${m.label} for ${p.address.split(",")[0]}: ${m.format(p)}${win ? " (best)" : ""}`}
                        >
                          {m.format(p)}
                          {win && !isNA && (
                            <span
                              className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald"
                              aria-hidden="true"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Show more / show less toggle */}
          <button
            onClick={() => setExpandMetrics(!expandMetrics)}
            className="mt-3 flex items-center gap-1.5 text-[11px] text-content-disabled hover:text-gold-light transition-colors mx-auto"
            aria-expanded={expandMetrics}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expandMetrics ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {expandMetrics
              ? "Show fewer metrics"
              : `Show ${METRICS.length - INITIAL_METRIC_COUNT} more metrics`}
          </button>
        </section>
      )}

      {/* Multi-Dimensional Radar */}
      {selected.length >= 2 && (
        <section className="card" aria-label="Multi-dimensional radar comparison chart">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium flex items-center gap-2">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" /> Multi-Dimensional Comparison
          </div>
          <p className="text-[11px] text-content-disabled mb-4">
            8 dimensions normalized 0–100. All axes: higher = better.
            Breakeven Occupancy and Value Discount are inverted — lower raw values score higher.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
              <PolarGrid stroke="#1F1F1F" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#666666", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#444444", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                tickCount={4}
              />
              {selected.map((p, idx) => (
                <Radar
                  key={p.id}
                  name={p.address.split(",")[0]}
                  dataKey={p.id}
                  stroke={PROPERTY_COLORS[idx % PROPERTY_COLORS.length]}
                  fill={PROPERTY_COLORS[idx % PROPERTY_COLORS.length]}
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                />
              ))}
              <Tooltip content={<RadarTooltip allProps={selected} />} />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#999999",
                  paddingTop: 8,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* AI Comparison Verdict */}
      {winner && selected.length >= 2 && (
        <AiInsightCard title="Comparison Verdict" aria-label="AI comparison verdict">
          <span className="font-mono text-content-primary">{winner.address.split(",")[0]}</span> leads
          on <span className="font-mono text-emerald-light">{winnerWins}</span> of {METRICS.length} metrics.

          {irrGap && irrGap.winner.id === winner.id && (
            <> IRR advantage is the clearest signal:{" "}
              <span className="font-mono text-content-primary">{winner.irr.toFixed(1)}%</span> projected 5-year IRR
              versus <span className="font-mono text-rose-light">{irrGap.loser.irr.toFixed(1)}%</span> for{" "}
              {irrGap.loser.address.split(",")[0]} — a <span className="font-mono text-emerald-light">{irrGap.gapLabel}</span>.
            </>
          )}

          {cashFlowGap && cashFlowGap.winner.id === winner.id && (
            <> Cash flow gap is material: <span className="font-mono text-emerald-light">${winner.cashFlow}/mo</span>{" "}
              vs <span className="font-mono text-rose-light">${cashFlowGap.loser.cashFlow}/mo</span>{" "}
              for {cashFlowGap.loser.address.split(",")[0]}
              {" "}— a <span className="font-mono">${Math.abs(winner.cashFlow - cashFlowGap.loser.cashFlow).toLocaleString()}/mo</span> difference
              that compounds to <span className="font-mono text-emerald-light">
                ${(Math.abs(winner.cashFlow - cashFlowGap.loser.cashFlow) * 60 / 1000).toFixed(0)}K
              </span> over 5 years.
            </>
          )}

          {" "}Breakeven occupancy of{" "}
          <span className="font-mono text-content-primary">{winner.breakevenOccupancy}%</span> means{" "}
          {winner.breakevenOccupancy <= 75 ? (
            <span>strong downside protection — only needs {winner.breakevenOccupancy}% occupancy to cover all costs.</span>
          ) : (
            <span>thin margin for vacancy — model downside scenarios carefully.</span>
          )}

          {selected.some((p) => p.source === "pipeline") && (
            <> Pipeline deals use live analysis data; sample properties use modeled estimates.
              Treat IRR, NPV, and equity multiple for sample data as directional guidance only.
            </>
          )}

          {winner.address.includes("FL") && (
            <> Risk factor: verify insurance costs for Florida properties before proceeding — hurricane and flood exposure can materially reduce modeled cash flows.</>
          )}
        </AiInsightCard>
      )}

      {/* Best Overall card */}
      {winner && (
        <section className="card-gold" aria-label={`Best overall deal: ${winner.address}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-muted flex items-center justify-center shrink-0" aria-hidden="true">
              <Trophy className="w-5 h-5 text-gold-light" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-content-disabled uppercase tracking-wider font-medium mb-1">Best Overall</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-[15px] font-semibold text-content-primary">{winner.address}</div>
                <SourceBadge source={winner.source} />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-content-secondary font-mono">
                <span>${(winner.price / 1_000).toFixed(0)}K</span>
                <span className="text-emerald-light font-semibold">Score {winner.score}</span>
                <span>{winner.capRate.toFixed(1)}% cap</span>
                <span className="text-emerald-light">{winner.irr.toFixed(1)}% IRR</span>
                <span>NPV {winner.npv >= 0 ? `$${(winner.npv / 1_000).toFixed(0)}K` : `($${(Math.abs(winner.npv) / 1_000).toFixed(0)}K)`}</span>
              </div>
              <Link href="/dashboard/analyze" className="btn-primary btn-sm mt-3 inline-flex">
                <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> Full Analysis
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
