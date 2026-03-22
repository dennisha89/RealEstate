"use client";

/**
 * ParallelCoordinatesChart
 *
 * Renders 15+ metro markets simultaneously across 5 signal dimensions using
 * ECharts parallel coordinates. Each vertical axis is one signal; each line
 * is one market. Line color encodes the market's composite score:
 *   emerald  ≥ 70  (strong)
 *   amber    ≥ 50  (moderate)
 *   rose     < 50  (weak)
 *
 * Hover interaction: the hovered line turns gold and thickens to 3px;
 * all other lines fade to 10% opacity. Click fires onMarketClick callback.
 *
 * When geoKey matches a state code (e.g. "TX"), markets in that state are
 * drawn at full opacity and all others start at 30% opacity.
 *
 * Architecture note: ECharts parallel series requires data items to carry
 * their own lineStyle when per-line color is needed. We build each data
 * item as { value: number[], lineStyle: { color, opacity, width } } and
 * update opacity on highlight/downplay events via getEchartsInstance().
 */

import { useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { CHART_COLORS } from "./ChartTheme";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

export interface ParallelMarketDatum {
  market: string;
  state: string;
  /** Months of supply (lower = tighter = bullish, e.g. 1.8) */
  monthsOfSupply: number;
  /** Building permits YoY growth % (e.g. 34.2) */
  permitsGrowth: number;
  /** HPI momentum — trailing 12m price change % (e.g. 6.1) */
  hpiMomentum: number;
  /** Employment growth YoY % (e.g. 2.8) */
  employmentGrowth: number;
  /** 30-year mortgage rate % (e.g. 6.85) */
  mortgageRate: number;
  /** Composite score 0–100 */
  score: number;
}

export interface ParallelCoordinatesChartProps {
  data?: ParallelMarketDatum[];
  /** State code to highlight, e.g. "TX". Highlights markets in that state. */
  geoKey?: string;
  className?: string;
  onMarketClick?: (market: string) => void;
}

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA — 15 metros with realistic signal values
───────────────────────────────────────────────────────────── */

export const PARALLEL_SAMPLE_DATA: ParallelMarketDatum[] = [
  { market: "Austin",      state: "TX", monthsOfSupply: 2.1, permitsGrowth:  34.2, hpiMomentum:  6.1, employmentGrowth: 3.8, mortgageRate: 6.85, score: 82 },
  { market: "Tampa",       state: "FL", monthsOfSupply: 2.4, permitsGrowth:  22.7, hpiMomentum:  4.3, employmentGrowth: 2.9, mortgageRate: 6.85, score: 74 },
  { market: "Nashville",   state: "TN", monthsOfSupply: 2.0, permitsGrowth:  28.1, hpiMomentum:  5.8, employmentGrowth: 3.2, mortgageRate: 6.85, score: 79 },
  { market: "Charlotte",   state: "NC", monthsOfSupply: 1.9, permitsGrowth:  31.5, hpiMomentum:  7.2, employmentGrowth: 4.1, mortgageRate: 6.85, score: 86 },
  { market: "Phoenix",     state: "AZ", monthsOfSupply: 3.8, permitsGrowth:  12.4, hpiMomentum:  1.2, employmentGrowth: 2.1, mortgageRate: 6.85, score: 52 },
  { market: "Atlanta",     state: "GA", monthsOfSupply: 2.6, permitsGrowth:  19.8, hpiMomentum:  3.9, employmentGrowth: 2.7, mortgageRate: 6.85, score: 68 },
  { market: "Dallas",      state: "TX", monthsOfSupply: 3.1, permitsGrowth:  24.6, hpiMomentum:  2.4, employmentGrowth: 3.5, mortgageRate: 6.85, score: 65 },
  { market: "Denver",      state: "CO", monthsOfSupply: 4.2, permitsGrowth:   8.3, hpiMomentum: -0.5, employmentGrowth: 1.8, mortgageRate: 6.85, score: 38 },
  { market: "Portland",    state: "OR", monthsOfSupply: 5.1, permitsGrowth:  -4.1, hpiMomentum: -2.1, employmentGrowth: 0.6, mortgageRate: 6.85, score: 22 },
  { market: "Seattle",     state: "WA", monthsOfSupply: 2.8, permitsGrowth:  15.2, hpiMomentum:  4.8, employmentGrowth: 2.3, mortgageRate: 6.85, score: 71 },
  { market: "Las Vegas",   state: "NV", monthsOfSupply: 3.4, permitsGrowth:  18.9, hpiMomentum:  3.1, employmentGrowth: 2.5, mortgageRate: 6.85, score: 58 },
  { market: "Columbus",    state: "OH", monthsOfSupply: 2.2, permitsGrowth:  16.4, hpiMomentum:  5.4, employmentGrowth: 1.9, mortgageRate: 6.85, score: 69 },
  { market: "Boise",       state: "ID", monthsOfSupply: 3.0, permitsGrowth:  -2.8, hpiMomentum:  0.7, employmentGrowth: 1.4, mortgageRate: 6.85, score: 41 },
  { market: "San Antonio", state: "TX", monthsOfSupply: 2.9, permitsGrowth:  26.3, hpiMomentum:  3.6, employmentGrowth: 3.0, mortgageRate: 6.85, score: 67 },
  { market: "Jacksonville",state: "FL", monthsOfSupply: 2.3, permitsGrowth:  20.5, hpiMomentum:  4.9, employmentGrowth: 2.6, mortgageRate: 6.85, score: 72 },
];

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 70) return CHART_COLORS.emerald;
  if (score >= 50) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

function scoreLabel(score: number): string {
  if (score >= 70) return "STRONG";
  if (score >= 50) return "MODERATE";
  return "WEAK";
}

/* ─────────────────────────────────────────────────────────────
   AXES DEFINITION
   Axis 0: Months of Supply (inverted — lower is bullish)
   Axis 1: Permits Growth %
   Axis 2: HPI Momentum %
   Axis 3: Employment Growth %
   Axis 4: Mortgage Rate % (inverted — lower is bullish)
───────────────────────────────────────────────────────────── */

const PARALLEL_AXES = [
  { dim: 0, name: "Months of Supply", inverse: true,  min: 0,   max: 7,  nameGap: 28 },
  { dim: 1, name: "Permits Growth %", inverse: false, min: -10, max: 50, nameGap: 28 },
  { dim: 2, name: "HPI Momentum %",   inverse: false, min: -5,  max: 10, nameGap: 28 },
  { dim: 3, name: "Employment Grw %", inverse: false, min: 0,   max: 5,  nameGap: 28 },
  { dim: 4, name: "Mortgage Rate %",  inverse: true,  min: 5,   max: 8,  nameGap: 28 },
];

/* ─────────────────────────────────────────────────────────────
   TOOLTIP FORMATTER
───────────────────────────────────────────────────────────── */

function buildTooltipFormatter(data: ParallelMarketDatum[]) {
  // ECharts passes seriesIndex + dataIndex when hovering a parallel line
  return function (params: { seriesIndex?: number; dataIndex?: number } | Array<{ seriesIndex?: number; dataIndex?: number }>) {
    const p = Array.isArray(params) ? params[0] : params;
    if (p?.dataIndex == null) return "";
    const d = data[p.dataIndex];
    if (!d) return "";
    const color = scoreColor(d.score);
    const label = scoreLabel(d.score);
    return `
      <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
        <div style="font-size: 13px; font-weight: 700; color: #FAFAFA; margin-bottom: 8px;">
          ${d.market}, ${d.state}
        </div>
        <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: ${color}; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.08em;">
          SCORE ${d.score} — ${label}
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${[
            ["Months of Supply", `${d.monthsOfSupply.toFixed(1)} mo`],
            ["Permits Growth",   `${d.permitsGrowth > 0 ? "+" : ""}${d.permitsGrowth.toFixed(1)}%`],
            ["HPI Momentum",     `${d.hpiMomentum > 0 ? "+" : ""}${d.hpiMomentum.toFixed(1)}%`],
            ["Employment Grw",   `+${d.employmentGrowth.toFixed(1)}%`],
            ["Mortgage Rate",    `${d.mortgageRate.toFixed(2)}%`],
          ].map(([k, v]) => `
            <div style="display: flex; justify-content: space-between; gap: 12px;">
              <span style="font-size: 10px; color: #666666;">${k}</span>
              <span style="font-size: 11px; font-weight: 600; color: #E5E5E5; font-family: 'JetBrains Mono', monospace;">${v}</span>
            </div>
          `).join("")}
        </div>
        <div style="font-size: 9px; color: #444444; margin-top: 8px;">Click to open market detail</div>
      </div>
    `;
  };
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function ParallelCoordinatesChart({
  data = PARALLEL_SAMPLE_DATA,
  geoKey,
  className,
  onMarketClick,
}: ParallelCoordinatesChartProps) {
  const chartRef = useRef<ReactECharts>(null);

  // Determine which markets are "in focus" based on geoKey
  const focusedMarkets = useMemo<Set<string>>(() => {
    if (!geoKey) return new Set();
    const upper = geoKey.toUpperCase();
    return new Set(data.filter((d) => d.state.toUpperCase() === upper).map((d) => d.market));
  }, [data, geoKey]);

  const hasFocus = focusedMarkets.size > 0;

  // Build series data items with per-line color + base opacity
  const seriesData = useMemo(() => {
    return data.map((d) => {
      const baseOpacity = hasFocus
        ? focusedMarkets.has(d.market) ? 1 : 0.08
        : 0.7;

      const isFocused = hasFocus && focusedMarkets.has(d.market);
      return {
        value: [
          d.monthsOfSupply,
          d.permitsGrowth,
          d.hpiMomentum,
          d.employmentGrowth,
          d.mortgageRate,
        ],
        lineStyle: {
          color: isFocused ? CHART_COLORS.gold : scoreColor(d.score),
          opacity: baseOpacity,
          width: isFocused ? 3 : 1.5,
        },
      };
    });
  }, [data, hasFocus, focusedMarkets]);

  // Build ECharts option
  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: "transparent",

    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: "#1A1A1A",
      borderColor: "#1F1F1F",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: "#E5E5E5", fontSize: 12 },
      extraCssText: "box-shadow: 0 4px 24px rgba(0,0,0,0.6); border-radius: 8px;",
      formatter: buildTooltipFormatter(data) as unknown as string,
    },

    // Parallel coordinate system — sits inside the canvas area
    parallel: {
      left: "6%",
      right: "6%",
      top: 48,
      bottom: 80,
      parallelAxisDefault: {
        type: "value",
        nameLocation: "end",
        nameTextStyle: {
          color: "#999999",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          padding: [0, 0, 6, 0],
        },
        nameGap: 28,
        axisLine: { lineStyle: { color: "#1F1F1F" } },
        axisTick: { lineStyle: { color: "#333333" } },
        splitLine: { show: false },
        axisLabel: {
          color: "#666666",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
        },
      },
    },

    parallelAxis: PARALLEL_AXES.map((ax) => ({
      dim: ax.dim,
      name: ax.name,
      inverse: ax.inverse,
      min: ax.min,
      max: ax.max,
    })),

    series: [
      {
        type: "parallel",
        smooth: true,
        lineStyle: {
          width: 1.5,
          opacity: 1,
        },
        emphasis: {
          lineStyle: {
            color: CHART_COLORS.gold,
            width: 3,
            opacity: 1,
          },
        },
        data: seriesData,
      },
    ],
  }), [data, seriesData]);

  // Event handlers — highlight row and fire callback
  const onEvents = useMemo(() => ({
    "mouseover": (params: { dataIndex?: number }) => {
      const instance = chartRef.current?.getEchartsInstance();
      if (!instance || params.dataIndex == null) return;

      // Fade all lines to 10%, then highlight the hovered one gold
      const newData = data.map((d, i) => ({
        value: [
          d.monthsOfSupply,
          d.permitsGrowth,
          d.hpiMomentum,
          d.employmentGrowth,
          d.mortgageRate,
        ],
        lineStyle: {
          color: i === params.dataIndex ? CHART_COLORS.gold : scoreColor(d.score),
          opacity: i === params.dataIndex ? 1 : 0.1,
          width: i === params.dataIndex ? 3 : 1.5,
        },
      }));

      instance.setOption({
        series: [{ type: "parallel", data: newData }],
      });
    },

    "mouseout": () => {
      const instance = chartRef.current?.getEchartsInstance();
      if (!instance) return;

      // Restore original appearance
      instance.setOption({
        series: [{ type: "parallel", data: seriesData }],
      });
    },

    "click": (params: { dataIndex?: number }) => {
      if (params.dataIndex == null) return;
      const d = data[params.dataIndex];
      if (d && onMarketClick) onMarketClick(d.market);
    },
  }), [data, seriesData, onMarketClick]);

  // Loading skeleton
  if (!data || data.length === 0) {
    return (
      <div
        className={`card flex items-center justify-center ${className ?? ""}`}
        style={{ height: 450 }}
        aria-label="No market data available"
        role="img"
      >
        <div className="text-center space-y-2">
          <p className="text-[13px] text-content-secondary">No market data</p>
          <p className="text-[11px] text-content-disabled">Select a region to load signal profiles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-content-primary">
            Signal Profile{" "}
            <span className="text-gold-light">Parallel View</span>
          </h3>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            {data.length} markets · 5 signal dimensions simultaneously
            {hasFocus && (
              <span className="ml-2 text-gold font-medium">
                · {focusedMarkets.size} in {geoKey?.toUpperCase()} highlighted
              </span>
            )}
          </p>
        </div>

        {/* Score legend */}
        <div className="flex items-center gap-4 shrink-0" aria-label="Score legend">
          {[
            { color: CHART_COLORS.emerald, label: "Strong (70+)" },
            { color: CHART_COLORS.amber,   label: "Moderate (50–69)" },
            { color: CHART_COLORS.rose,    label: "Weak (<50)" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full"
                style={{ width: 20, height: 3, backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-content-tertiary font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div
        aria-label={`Parallel coordinates chart showing ${data.length} markets across 5 signal dimensions`}
        role="img"
        style={{ height: 450 }}
      >
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={onEvents}
          notMerge={false}
          lazyUpdate={true}
          opts={{ renderer: "canvas" }}
        />
      </div>

      {/* Axes guide */}
      <div
        className="flex justify-between px-[6%] -mt-2"
        aria-hidden="true"
      >
        {PARALLEL_AXES.map((ax) => (
          <div key={ax.dim} className="text-center" style={{ flex: 1 }}>
            <p className="text-[9px] text-content-disabled font-mono leading-tight">
              {ax.inverse ? "↑ Better" : "↑ Higher"}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom caption */}
      <p
        className="text-center text-[10px] text-content-disabled mt-4 italic"
        aria-label="Chart description"
      >
        Every line is a market. Trace it across dimensions to see its full signal profile.
      </p>

      {/* Interaction hint */}
      <p className="text-center text-[9px] text-content-disabled mt-1">
        Hover a line to isolate · Click to open market detail
      </p>
    </div>
  );
}
