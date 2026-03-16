"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  BarChart2,
  List,
  Map,
  ChevronRight,
} from "lucide-react";
import { CHART_COLORS } from "./ChartTheme";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface SignalValue {
  monthsOfSupply: "bullish" | "bearish" | "neutral";
  permits: "bullish" | "bearish" | "neutral";
  employment: "bullish" | "bearish" | "neutral";
  rates: "bullish" | "bearish" | "neutral";
  hpiMomentum: "bullish" | "bearish" | "neutral";
}

export interface MarketScore {
  stateCode: string;
  stateName: string;
  score: number;
  convergence: number; // 0-5 bullish signals
  signals: SignalValue;
  topMetro: string;
  medianHomePrice: number;
  yoyAppreciation: number;
}

/* ═══════════════════════════════════════════════════════════════
   SAMPLE DATA — replace with API call
   ═══════════════════════════════════════════════════════════════ */

export const SAMPLE_MARKET_DATA: MarketScore[] = [
  {
    stateCode: "TX",
    stateName: "Texas",
    score: 76,
    convergence: 4,
    signals: { monthsOfSupply: "bullish", permits: "bullish", employment: "bullish", rates: "neutral", hpiMomentum: "bullish" },
    topMetro: "Austin",
    medianHomePrice: 425000,
    yoyAppreciation: 4.8,
  },
  {
    stateCode: "FL",
    stateName: "Florida",
    score: 72,
    convergence: 3,
    signals: { monthsOfSupply: "bullish", permits: "bullish", employment: "bullish", rates: "bearish", hpiMomentum: "neutral" },
    topMetro: "Tampa",
    medianHomePrice: 389000,
    yoyAppreciation: 3.2,
  },
  {
    stateCode: "TN",
    stateName: "Tennessee",
    score: 70,
    convergence: 3,
    signals: { monthsOfSupply: "bullish", permits: "neutral", employment: "bullish", rates: "neutral", hpiMomentum: "bullish" },
    topMetro: "Nashville",
    medianHomePrice: 358000,
    yoyAppreciation: 5.1,
  },
  {
    stateCode: "NC",
    stateName: "North Carolina",
    score: 68,
    convergence: 3,
    signals: { monthsOfSupply: "bullish", permits: "bullish", employment: "bullish", rates: "neutral", hpiMomentum: "neutral" },
    topMetro: "Charlotte",
    medianHomePrice: 340000,
    yoyAppreciation: 4.4,
  },
  {
    stateCode: "AZ",
    stateName: "Arizona",
    score: 65,
    convergence: 3,
    signals: { monthsOfSupply: "bullish", permits: "neutral", employment: "bullish", rates: "neutral", hpiMomentum: "bullish" },
    topMetro: "Phoenix",
    medianHomePrice: 415000,
    yoyAppreciation: 2.9,
  },
  {
    stateCode: "GA",
    stateName: "Georgia",
    score: 64,
    convergence: 3,
    signals: { monthsOfSupply: "bullish", permits: "neutral", employment: "bullish", rates: "neutral", hpiMomentum: "bullish" },
    topMetro: "Atlanta",
    medianHomePrice: 362000,
    yoyAppreciation: 3.7,
  },
  {
    stateCode: "NV",
    stateName: "Nevada",
    score: 58,
    convergence: 3,
    signals: { monthsOfSupply: "neutral", permits: "bullish", employment: "bullish", rates: "neutral", hpiMomentum: "neutral" },
    topMetro: "Las Vegas",
    medianHomePrice: 395000,
    yoyAppreciation: 2.1,
  },
  {
    stateCode: "WA",
    stateName: "Washington",
    score: 55,
    convergence: 2,
    signals: { monthsOfSupply: "neutral", permits: "neutral", employment: "bullish", rates: "bearish", hpiMomentum: "bullish" },
    topMetro: "Seattle",
    medianHomePrice: 650000,
    yoyAppreciation: 1.8,
  },
  {
    stateCode: "OH",
    stateName: "Ohio",
    score: 50,
    convergence: 2,
    signals: { monthsOfSupply: "neutral", permits: "neutral", employment: "bullish", rates: "neutral", hpiMomentum: "neutral" },
    topMetro: "Columbus",
    medianHomePrice: 285000,
    yoyAppreciation: 2.4,
  },
  {
    stateCode: "ID",
    stateName: "Idaho",
    score: 52,
    convergence: 2,
    signals: { monthsOfSupply: "neutral", permits: "bullish", employment: "neutral", rates: "neutral", hpiMomentum: "neutral" },
    topMetro: "Boise",
    medianHomePrice: 425000,
    yoyAppreciation: 1.2,
  },
  {
    stateCode: "CO",
    stateName: "Colorado",
    score: 45,
    convergence: 2,
    signals: { monthsOfSupply: "bearish", permits: "neutral", employment: "bullish", rates: "bearish", hpiMomentum: "neutral" },
    topMetro: "Denver",
    medianHomePrice: 540000,
    yoyAppreciation: -0.8,
  },
  {
    stateCode: "OR",
    stateName: "Oregon",
    score: 42,
    convergence: 1,
    signals: { monthsOfSupply: "bearish", permits: "bearish", employment: "neutral", rates: "bearish", hpiMomentum: "neutral" },
    topMetro: "Portland",
    medianHomePrice: 489000,
    yoyAppreciation: -1.4,
  },
  {
    stateCode: "CA",
    stateName: "California",
    score: 40,
    convergence: 1,
    signals: { monthsOfSupply: "bearish", permits: "bearish", employment: "neutral", rates: "bearish", hpiMomentum: "neutral" },
    topMetro: "Los Angeles",
    medianHomePrice: 820000,
    yoyAppreciation: -0.5,
  },
  {
    stateCode: "NY",
    stateName: "New York",
    score: 38,
    convergence: 1,
    signals: { monthsOfSupply: "bearish", permits: "bearish", employment: "neutral", rates: "bearish", hpiMomentum: "neutral" },
    topMetro: "New York City",
    medianHomePrice: 545000,
    yoyAppreciation: -1.1,
  },
  {
    stateCode: "IL",
    stateName: "Illinois",
    score: 35,
    convergence: 1,
    signals: { monthsOfSupply: "bearish", permits: "bearish", employment: "bearish", rates: "bearish", hpiMomentum: "neutral" },
    topMetro: "Chicago",
    medianHomePrice: 310000,
    yoyAppreciation: -0.9,
  },
];

/* ═══════════════════════════════════════════════════════════════
   COLOR SCALE — score 0-100 → hex color
   Pure inline interpolation, no d3-scale import.
   0-30: rose, 30-50: amber, 50-70: amber→gold, 70-100: gold→emerald
   ═══════════════════════════════════════════════════════════════ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function scoreToColor(score: number): string {
  if (score <= 30) {
    // deep rose → rose
    const t = score / 30;
    return lerpColor("#7F1D1D", "#EF4444", t);
  }
  if (score <= 50) {
    // rose → amber
    const t = (score - 30) / 20;
    return lerpColor("#EF4444", "#F59E0B", t);
  }
  if (score <= 70) {
    // amber → gold
    const t = (score - 50) / 20;
    return lerpColor("#F59E0B", "#C9A227", t);
  }
  // gold → emerald
  const t = (score - 70) / 30;
  return lerpColor("#C9A227", "#10B981", t);
}

/* ═══════════════════════════════════════════════════════════════
   FIPS → STATE CODE MAP
   The TopoJSON numeric FIPS IDs need to map to 2-letter codes.
   ═══════════════════════════════════════════════════════════════ */

const FIPS_TO_CODE: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

type ViewMode = "map" | "table" | "ranked";

const SIGNAL_LABELS: Record<keyof SignalValue, string> = {
  monthsOfSupply: "Supply",
  permits: "Permits",
  employment: "Employment",
  rates: "Rates",
  hpiMomentum: "HPI Momentum",
};

function SignalIcon({ value, size = 14 }: { value: "bullish" | "bearish" | "neutral"; size?: number }) {
  if (value === "bullish") {
    return <TrendingUp style={{ width: size, height: size }} className="text-emerald-light" aria-label="Bullish" />;
  }
  if (value === "bearish") {
    return <TrendingDown style={{ width: size, height: size }} className="text-rose-light" aria-label="Bearish" />;
  }
  return <Minus style={{ width: size, height: size }} className="text-amber-light" aria-label="Neutral" />;
}

function ConvergenceDots({ count, total = 5 }: { count: number; total?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${count} of ${total} bullish signals`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full border ${
            i < count
              ? "bg-gold border-gold"
              : "bg-transparent border-content-disabled"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ScoreLabel({ score }: { score: number }) {
  if (score >= 70) return <span className="text-emerald-light font-semibold">{score}</span>;
  if (score >= 50) return <span className="text-amber-light font-semibold">{score}</span>;
  return <span className="text-rose-light font-semibold">{score}</span>;
}

function SignalPanel({ market }: { market: MarketScore }) {
  const signalKeys = Object.keys(market.signals) as (keyof SignalValue)[];
  const bullishCount = signalKeys.filter(k => market.signals[k] === "bullish").length;
  const overallLabel = bullishCount >= 4 ? "BULLISH" : bullishCount >= 3 ? "MIXED" : bullishCount >= 2 ? "NEUTRAL" : "BEARISH";
  const overallColor =
    bullishCount >= 4 ? "text-emerald-light" :
    bullishCount >= 3 ? "text-amber-light" :
    "text-rose-light";

  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
  const priceFmt = fmt.format(market.medianHomePrice);
  const yoySign = market.yoyAppreciation >= 0 ? "+" : "";

  return (
    <div className="space-y-4">
      {/* State header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-content-primary">{market.stateName}</h3>
          </div>
          <p className="text-[11px] text-content-tertiary mt-0.5">{market.topMetro}</p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold font-mono tabular-nums"
            style={{ color: scoreToColor(market.score) }}
            aria-label={`Market score ${market.score} out of 100`}
          >
            {market.score}
          </div>
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">score</div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-elevated rounded-lg p-2.5">
          <div className="metric-label mb-1">Median Price</div>
          <div className="text-sm font-bold font-mono text-content-primary">{priceFmt}</div>
        </div>
        <div className="bg-surface-elevated rounded-lg p-2.5">
          <div className="metric-label mb-1">YoY Apprec.</div>
          <div className={`text-sm font-bold font-mono ${market.yoyAppreciation >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
            {yoySign}{market.yoyAppreciation.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Signal bars */}
      <div className="space-y-2">
        <div className="section-label mb-2">Signal Breakdown</div>
        {signalKeys.map((key) => {
          const val = market.signals[key];
          const barWidth = val === "bullish" ? "75%" : val === "neutral" ? "45%" : "20%";
          const barColor = val === "bullish" ? CHART_COLORS.emerald : val === "bearish" ? CHART_COLORS.rose : CHART_COLORS.amber;
          const labelColor = val === "bullish" ? "text-emerald-light" : val === "bearish" ? "text-rose-light" : "text-amber-light";
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-content-secondary">{SIGNAL_LABELS[key]}</span>
                <div className="flex items-center gap-1.5">
                  <SignalIcon value={val} size={12} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${labelColor}`}>
                    {val}
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: barWidth, backgroundColor: barColor }}
                  role="progressbar"
                  aria-valuenow={val === "bullish" ? 75 : val === "neutral" ? 45 : 20}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${SIGNAL_LABELS[key]}: ${val}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Convergence summary */}
      <div className="pt-3 border-t border-surface-border">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-content-tertiary">Convergence</span>
            <span className="text-[11px] text-content-disabled ml-1">{bullishCount}/5 bullish</span>
          </div>
          <div className="flex items-center gap-2">
            <ConvergenceDots count={bullishCount} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${overallColor}`}>
              {overallLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TABLE VIEW
   ═══════════════════════════════════════════════════════════════ */

function TableView({
  data,
  onSelect,
  selected,
}: {
  data: MarketScore[];
  onSelect: (code: string) => void;
  selected: string | null;
}) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.score - a.score), [data]);
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" aria-label="Market scores by state">
        <thead>
          <tr className="border-b border-surface-border">
            <th scope="col" className="text-left py-2 px-3 section-label font-semibold">#</th>
            <th scope="col" className="text-left py-2 px-3 section-label font-semibold">State</th>
            <th scope="col" className="text-right py-2 px-3 section-label font-semibold">Score</th>
            <th scope="col" className="text-right py-2 px-3 section-label font-semibold">Signals</th>
            <th scope="col" className="text-right py-2 px-3 section-label font-semibold hidden sm:table-cell">Median Price</th>
            <th scope="col" className="text-right py-2 px-3 section-label font-semibold hidden sm:table-cell">YoY</th>
            <th scope="col" className="text-left py-2 px-3 section-label font-semibold hidden md:table-cell">Top Metro</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((market, idx) => {
            const isSelected = selected === market.stateCode;
            return (
              <tr
                key={market.stateCode}
                onClick={() => onSelect(market.stateCode)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(market.stateCode); }}
                tabIndex={0}
                role="row"
                aria-selected={isSelected}
                className={`border-b border-surface-border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 ${
                  isSelected
                    ? "bg-gold-muted"
                    : "hover:bg-surface-elevated"
                }`}
              >
                <td className="py-2 px-3 text-content-disabled font-mono">{idx + 1}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: scoreToColor(market.score) }}
                      aria-hidden="true"
                    />
                    <span className="text-content-primary font-medium">{market.stateName}</span>
                    <span className="text-content-disabled text-[10px] font-mono">{market.stateCode}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: scoreToColor(market.score) }}>
                  {market.score}
                </td>
                <td className="py-2 px-3 text-right">
                  <ConvergenceDots count={market.convergence} />
                </td>
                <td className="py-2 px-3 text-right font-mono text-content-secondary hidden sm:table-cell">
                  {fmt.format(market.medianHomePrice)}
                </td>
                <td className={`py-2 px-3 text-right font-mono hidden sm:table-cell ${market.yoyAppreciation >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                  {market.yoyAppreciation >= 0 ? "+" : ""}{market.yoyAppreciation.toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-content-tertiary hidden md:table-cell">
                  {market.topMetro}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RANKED LIST VIEW
   ═══════════════════════════════════════════════════════════════ */

function RankedView({
  data,
  onSelect,
  selected,
}: {
  data: MarketScore[];
  onSelect: (code: string) => void;
  selected: string | null;
}) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.score - a.score), [data]);

  return (
    <div className="space-y-1.5">
      {sorted.map((market, idx) => {
        const isSelected = selected === market.stateCode;
        const scoreColor = scoreToColor(market.score);
        return (
          <button
            key={market.stateCode}
            onClick={() => onSelect(market.stateCode)}
            aria-pressed={isSelected}
            aria-label={`${market.stateName}, score ${market.score}, ${market.convergence} of 5 bullish signals`}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 text-left ${
              isSelected
                ? "bg-gold-muted border-gold/30"
                : "bg-transparent border-transparent hover:bg-surface-elevated hover:border-surface-border"
            }`}
          >
            <span className="text-[11px] font-mono text-content-disabled w-4 shrink-0">{idx + 1}</span>
            {/* Score bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-content-primary truncate pr-2">
                  {market.stateName}
                  <span className="text-content-disabled ml-1.5 text-[10px] font-mono">{market.stateCode}</span>
                </span>
                <span className="text-[12px] font-bold font-mono shrink-0" style={{ color: scoreColor }}>
                  {market.score}
                </span>
              </div>
              <div className="h-1 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${market.score}%`, backgroundColor: scoreColor }}
                  role="progressbar"
                  aria-valuenow={market.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
            <ConvergenceDots count={market.convergence} />
            <ChevronRight className="w-3 h-3 text-content-disabled shrink-0" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEGEND
   ═══════════════════════════════════════════════════════════════ */

function ColorLegend() {
  const stops = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return (
    <div className="space-y-1.5" aria-label="Score color legend">
      <div
        className="h-3 rounded-full"
        style={{
          background: `linear-gradient(to right, ${stops.map(s => scoreToColor(s)).join(", ")})`,
        }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-rose-light font-mono">0 — Avoid</span>
        <span className="text-[10px] text-amber-light font-mono">50 — Neutral</span>
        <span className="text-[10px] text-emerald-light font-mono">100 — Buy</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════════════════════════ */

interface TooltipState {
  x: number;
  y: number;
  market: MarketScore;
}

function MapTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { market } = tooltip;
  const scoreColor = scoreToColor(market.score);
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
  const yoySign = market.yoyAppreciation >= 0 ? "+" : "";
  const yoyColor = market.yoyAppreciation >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose;

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[180px] rounded-lg border border-surface-border shadow-elevated"
      style={{
        left: tooltip.x + 16,
        top: tooltip.y - 8,
        backgroundColor: "#1A1A1A",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(31,31,31,1)",
        transform: "translateY(-50%)",
      }}
      role="tooltip"
    >
      <div className="p-3">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-[12px] font-semibold text-content-primary">{market.stateName}</span>
          <span className="text-[16px] font-bold font-mono" style={{ color: scoreColor }}>
            {market.score}
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-content-disabled">Top Metro</span>
            <span className="text-content-secondary">{market.topMetro}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-content-disabled">Median Price</span>
            <span className="font-mono text-content-primary">{fmt.format(market.medianHomePrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-content-disabled">YoY</span>
            <span className="font-mono font-semibold" style={{ color: yoyColor }}>
              {yoySign}{market.yoyAppreciation.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-surface-border">
            <span className="text-content-disabled">Convergence</span>
            <div className="flex items-center gap-1.5">
              <ConvergenceDots count={market.convergence} />
              <span className="text-content-secondary">{market.convergence}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */

export function CapitalFlowMapSkeleton() {
  return (
    <div className="card space-y-4" aria-busy="true" aria-label="Loading capital flow map">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-3 w-72" />
        </div>
        <div className="flex gap-1">
          <div className="skeleton h-7 w-14 rounded-lg" />
          <div className="skeleton h-7 w-14 rounded-lg" />
          <div className="skeleton h-7 w-14 rounded-lg" />
        </div>
      </div>
      {/* Map skeleton */}
      <div className="skeleton h-72 w-full rounded-xl" />
      {/* Legend skeleton */}
      <div className="skeleton h-5 w-full rounded-full" />
      {/* Panel skeleton */}
      <div className="skeleton h-48 w-full rounded-xl" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export interface CapitalFlowMapProps {
  data?: MarketScore[];
  onStateSelect?: (stateCode: string | null) => void;
  className?: string;
}

export function CapitalFlowMap({
  data = SAMPLE_MARKET_DATA,
  onStateSelect,
  className = "",
}: CapitalFlowMapProps) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");

  // Build lookup map from stateCode → MarketScore
  const scoreMap = useMemo<Record<string, MarketScore>>(() => {
    const map: Record<string, MarketScore> = {};
    for (const market of data) {
      map[market.stateCode] = market;
    }
    return map;
  }, [data]);

  const selectedMarket = selectedState ? (scoreMap[selectedState] ?? null) : null;

  const handleStateClick = useCallback(
    (stateCode: string) => {
      const next = selectedState === stateCode ? null : stateCode;
      setSelectedState(next);
      onStateSelect?.(next);
    },
    [selectedState, onStateSelect],
  );

  const handleMouseEnter = useCallback(
    (stateCode: string, e: React.MouseEvent<SVGPathElement>) => {
      setHoveredState(stateCode);
      const market = scoreMap[stateCode];
      if (market) {
        setTooltip({ x: e.clientX, y: e.clientY, market });
      }
    },
    [scoreMap],
  );

  const handleMouseMove = useCallback(
    (stateCode: string, e: React.MouseEvent<SVGPathElement>) => {
      const market = scoreMap[stateCode];
      if (market) {
        setTooltip({ x: e.clientX, y: e.clientY, market });
      }
    },
    [scoreMap],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredState(null);
    setTooltip(null);
  }, []);

  const VIEW_TABS: { key: ViewMode; label: string; Icon: typeof Map }[] = [
    { key: "map", label: "Map", Icon: Map },
    { key: "table", label: "Table", Icon: BarChart2 },
    { key: "ranked", label: "Ranked", Icon: List },
  ];

  return (
    <div className={`card space-y-4 ${className}`}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-content-primary">
            Capital Flow <span className="text-gold-light">Heatmap</span>
          </h2>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            State-level market scores · 5-signal convergence model · {data.length} markets tracked
          </p>
        </div>

        {/* View toggle */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-elevated border border-surface-border"
          role="tablist"
          aria-label="View mode"
        >
          {VIEW_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={viewMode === key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 ${
                viewMode === key
                  ? "bg-gold-muted text-gold-light"
                  : "text-content-disabled hover:text-content-tertiary"
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Left: Map / Table / Ranked ── */}
        <div className="flex-1 min-w-0">
          {viewMode === "map" && (
            <div
              className="relative rounded-xl overflow-hidden border border-surface-border"
              style={{ backgroundColor: "#000000" }}
            >
              <ComposableMap
                projection="geoAlbersUsa"
                style={{ width: "100%", height: "auto" }}
                aria-label="US capital flow heatmap by state"
              >
                <ZoomableGroup zoom={1}>
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        // The us-atlas TopoJSON encodes FIPS as the id field (numeric string)
                        const fips = String(geo.id ?? "").padStart(2, "0");
                        const code = FIPS_TO_CODE[fips] ?? "";
                        const market = scoreMap[code];
                        const isSelected = selectedState === code;
                        const isHovered = hoveredState === code;
                        const fillColor = market
                          ? scoreToColor(market.score)
                          : "#1A1A1A";
                        const fillOpacity = market ? (isSelected ? 1 : isHovered ? 0.9 : 0.75) : 0.3;

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor}
                            fillOpacity={fillOpacity}
                            stroke={isSelected ? CHART_COLORS.gold : "#1F1F1F"}
                            strokeWidth={isSelected ? 2 : 0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { outline: "none", cursor: market ? "pointer" : "default" },
                              pressed: { outline: "none" },
                            }}
                            onClick={market ? () => handleStateClick(code) : undefined}
                            onMouseEnter={market ? (e: React.MouseEvent<SVGPathElement>) => handleMouseEnter(code, e) : undefined}
                            onMouseMove={market ? (e: React.MouseEvent<SVGPathElement>) => handleMouseMove(code, e) : undefined}
                            onMouseLeave={market ? () => handleMouseLeave() : undefined}
                            tabIndex={market ? 0 : -1}
                            onKeyDown={
                              market
                                ? (e: React.KeyboardEvent<SVGPathElement>) => {
                                    if (e.key === "Enter" || e.key === " ") handleStateClick(code);
                                  }
                                : undefined
                            }
                            aria-label={
                              market
                                ? `${market.stateName}: score ${market.score}, ${market.convergence} of 5 bullish signals`
                                : undefined
                            }
                            role={market ? "button" : undefined}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>

              {/* No-data hint overlay */}
              {data.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[13px] text-content-disabled">No market data available</p>
                </div>
              )}
            </div>
          )}

          {viewMode === "table" && (
            <TableView
              data={data}
              onSelect={handleStateClick}
              selected={selectedState}
            />
          )}

          {viewMode === "ranked" && (
            <RankedView
              data={data}
              onSelect={handleStateClick}
              selected={selectedState}
            />
          )}

          {/* Color legend (map view only) */}
          {viewMode === "map" && (
            <div className="mt-3">
              <ColorLegend />
            </div>
          )}
        </div>

        {/* ── Right: Signal panel ── */}
        <div className="lg:w-64 shrink-0">
          {selectedMarket ? (
            <div className="card-glass border-gold/[0.08] p-4 h-full">
              <SignalPanel market={selectedMarket} />
            </div>
          ) : (
            <div className="card-glass border-surface-border p-4 h-full flex flex-col items-center justify-center text-center min-h-[200px]">
              <MapPin className="w-8 h-8 text-content-disabled mb-3" aria-hidden="true" />
              <p className="text-[12px] text-content-secondary font-medium mb-1">
                Select a state
              </p>
              <p className="text-[11px] text-content-disabled leading-relaxed">
                Click any highlighted state on the map to view signal breakdown and market metrics
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-surface-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald" aria-hidden="true" />
            <span className="text-[10px] text-content-disabled">Score 70-100: Buy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-[10px] text-content-disabled">50-70: Hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose" aria-hidden="true" />
            <span className="text-[10px] text-content-disabled">0-50: Avoid</span>
          </div>
        </div>
        <span className="text-[9px] text-content-disabled">
          Sample data · 5-signal model: Supply, Permits, Employment, Rates, HPI
        </span>
      </div>

      {/* Tooltip portal — rendered at viewport level */}
      {tooltip && <MapTooltip tooltip={tooltip} />}
    </div>
  );
}
