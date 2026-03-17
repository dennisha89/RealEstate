"use client";

/**
 * BubbleChart — 4-dimensional metro scatter
 *
 * Dimensions:
 *   X  — Permits Growth %       (supply pipeline strength)
 *   Y  — HPI Momentum %         (price trajectory)
 *   Z  — Employment Growth %    → bubble SIZE (larger = stronger job market)
 *   W  — Months of Supply score → bubble COLOR (emerald=tight, rose=oversupply)
 *
 * Quadrant lines at (0, 0) divide the canvas into 4 zones:
 *   Top-right  "Growth + Building"     — BEST signal convergence (emerald zone)
 *   Top-left   "Growing, Not Building" — supply-constrained
 *   Bottom-right "Building, Not Growing" — oversupply risk
 *   Bottom-left  "Declining"           — avoid (rose zone)
 *
 * Hover shows a rich tooltip with all 4 dimensions + composite score.
 * When geoKey matches a state code, markets in that state remain at full
 * opacity; all others dim to 20%.
 *
 * ECharts architecture:
 *   - One scatter series per market so each bubble can carry its own
 *     color, label, and tooltip independently.
 *   - symbolSize as callback: (val) => scale(val[2]) — maps employment
 *     growth 0–6% → radius 12–52px.
 *   - markLine on a dummy series draws the quadrant dividers.
 *   - markArea used for quadrant background tints.
 */

import { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { CHART_COLORS } from "./ChartTheme";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

export interface BubbleMarketDatum {
  market: string;
  state: string;
  /** Building permits YoY growth % */
  permitsGrowth: number;
  /** HPI momentum — trailing 12m price change % */
  hpiMomentum: number;
  /** Employment growth YoY % — drives bubble SIZE */
  employmentGrowth: number;
  /** Months of housing supply — drives bubble COLOR */
  monthsOfSupply: number;
  /** Composite signal score 0–100 */
  score: number;
}

export interface BubbleChartProps {
  data?: BubbleMarketDatum[];
  /** State code to highlight, e.g. "FL". Dims all other states. */
  geoKey?: string;
  className?: string;
  onMarketClick?: (market: string) => void;
}

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA — 15 metros with realistic multi-dimensional values
───────────────────────────────────────────────────────────── */

export const BUBBLE_SAMPLE_DATA: BubbleMarketDatum[] = [
  { market: "Austin",       state: "TX", permitsGrowth:  34.2, hpiMomentum:  6.1, employmentGrowth: 3.8, monthsOfSupply: 2.1, score: 82 },
  { market: "Tampa",        state: "FL", permitsGrowth:  22.7, hpiMomentum:  4.3, employmentGrowth: 2.9, monthsOfSupply: 2.4, score: 74 },
  { market: "Nashville",    state: "TN", permitsGrowth:  28.1, hpiMomentum:  5.8, employmentGrowth: 3.2, monthsOfSupply: 2.0, score: 79 },
  { market: "Charlotte",    state: "NC", permitsGrowth:  31.5, hpiMomentum:  7.2, employmentGrowth: 4.1, monthsOfSupply: 1.9, score: 86 },
  { market: "Phoenix",      state: "AZ", permitsGrowth:  12.4, hpiMomentum:  1.2, employmentGrowth: 2.1, monthsOfSupply: 3.8, score: 52 },
  { market: "Atlanta",      state: "GA", permitsGrowth:  19.8, hpiMomentum:  3.9, employmentGrowth: 2.7, monthsOfSupply: 2.6, score: 68 },
  { market: "Dallas",       state: "TX", permitsGrowth:  24.6, hpiMomentum:  2.4, employmentGrowth: 3.5, monthsOfSupply: 3.1, score: 65 },
  { market: "Denver",       state: "CO", permitsGrowth:   8.3, hpiMomentum: -0.5, employmentGrowth: 1.8, monthsOfSupply: 4.2, score: 38 },
  { market: "Portland",     state: "OR", permitsGrowth:  -4.1, hpiMomentum: -2.1, employmentGrowth: 0.6, monthsOfSupply: 5.1, score: 22 },
  { market: "Seattle",      state: "WA", permitsGrowth:  15.2, hpiMomentum:  4.8, employmentGrowth: 2.3, monthsOfSupply: 2.8, score: 71 },
  { market: "Las Vegas",    state: "NV", permitsGrowth:  18.9, hpiMomentum:  3.1, employmentGrowth: 2.5, monthsOfSupply: 3.4, score: 58 },
  { market: "Columbus",     state: "OH", permitsGrowth:  16.4, hpiMomentum:  5.4, employmentGrowth: 1.9, monthsOfSupply: 2.2, score: 69 },
  { market: "Boise",        state: "ID", permitsGrowth:  -2.8, hpiMomentum:  0.7, employmentGrowth: 1.4, monthsOfSupply: 3.0, score: 41 },
  { market: "San Antonio",  state: "TX", permitsGrowth:  26.3, hpiMomentum:  3.6, employmentGrowth: 3.0, monthsOfSupply: 2.9, score: 67 },
  { market: "Jacksonville", state: "FL", permitsGrowth:  20.5, hpiMomentum:  4.9, employmentGrowth: 2.6, monthsOfSupply: 2.3, score: 72 },
];

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

/** Map employment growth 0–5% → bubble radius 14–52px */
function employmentToRadius(empGrowth: number): number {
  const clamped = Math.max(0, Math.min(5, empGrowth));
  return Math.round(14 + (clamped / 5) * 38);
}

/** Map months of supply to a color — tight supply is bullish */
function supplyToColor(months: number): string {
  if (months <= 2.5) return CHART_COLORS.emerald;   // tight — bullish
  if (months <= 4.0) return CHART_COLORS.amber;     // balanced
  return CHART_COLORS.rose;                          // oversupply — bearish
}

function supplyLabel(months: number): string {
  if (months <= 2.5) return "Tight Supply";
  if (months <= 4.0) return "Balanced";
  return "Oversupplied";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "STRONG";
  if (score >= 50) return "MODERATE";
  return "WEAK";
}

function scoreColor(score: number): string {
  if (score >= 70) return CHART_COLORS.emerald;
  if (score >= 50) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

/** Build a rich HTML tooltip for a single market */
function buildMarketTooltip(d: BubbleMarketDatum): string {
  const sColor = supplyToColor(d.monthsOfSupply);
  const scColor = scoreColor(d.score);
  return `
    <div style="font-family: 'Inter', sans-serif; min-width: 220px;">
      <div style="font-size: 13px; font-weight: 700; color: #FAFAFA; margin-bottom: 6px;">
        ${d.market}, ${d.state}
      </div>
      <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: ${scColor}; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.08em;">
        SCORE ${d.score} — ${scoreLabel(d.score)}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="font-size: 10px; color: #666;">Permits Growth (X)</span>
          <span style="font-size: 11px; font-weight: 600; color: #E5E5E5; font-family: 'JetBrains Mono', monospace;">
            ${d.permitsGrowth > 0 ? "+" : ""}${d.permitsGrowth.toFixed(1)}%
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="font-size: 10px; color: #666;">HPI Momentum (Y)</span>
          <span style="font-size: 11px; font-weight: 600; color: ${d.hpiMomentum >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose}; font-family: 'JetBrains Mono', monospace;">
            ${d.hpiMomentum > 0 ? "+" : ""}${d.hpiMomentum.toFixed(1)}%
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="font-size: 10px; color: #666;">Employment Growth (size)</span>
          <span style="font-size: 11px; font-weight: 600; color: #E5E5E5; font-family: 'JetBrains Mono', monospace;">
            +${d.employmentGrowth.toFixed(1)}%
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="font-size: 10px; color: #666;">Months of Supply (color)</span>
          <span style="font-size: 11px; font-weight: 600; color: ${sColor}; font-family: 'JetBrains Mono', monospace;">
            ${d.monthsOfSupply.toFixed(1)} mo — ${supplyLabel(d.monthsOfSupply)}
          </span>
        </div>
      </div>
      <div style="font-size: 9px; color: #444; margin-top: 10px;">Click to open market detail</div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function BubbleChart({
  data = BUBBLE_SAMPLE_DATA,
  geoKey,
  className,
  onMarketClick,
}: BubbleChartProps) {
  const chartRef = useRef<ReactECharts>(null);

  const focusedMarkets = useMemo<Set<string>>(() => {
    if (!geoKey) return new Set();
    const upper = geoKey.toUpperCase();
    return new Set(data.filter((d) => d.state.toUpperCase() === upper).map((d) => d.market));
  }, [data, geoKey]);

  const hasFocus = focusedMarkets.size > 0;

  // Axis ranges with comfortable padding
  const xMin = useMemo(() => Math.floor(Math.min(...data.map((d) => d.permitsGrowth)) / 5) * 5 - 5, [data]);
  const xMax = useMemo(() => Math.ceil(Math.max(...data.map((d) => d.permitsGrowth)) / 5) * 5 + 5, [data]);
  const yMin = useMemo(() => Math.floor(Math.min(...data.map((d) => d.hpiMomentum)) / 2) * 2 - 1, [data]);
  const yMax = useMemo(() => Math.ceil(Math.max(...data.map((d) => d.hpiMomentum)) / 2) * 2 + 1, [data]);

  const option = useMemo(() => {
    // One series per market so each bubble owns its color and label independently
    const scatterSeries = data.map((d) => {
      const isFocused = !hasFocus || focusedMarkets.has(d.market);
      const bubbleColor = supplyToColor(d.monthsOfSupply);
      const opacity = isFocused ? 0.85 : 0.15;
      const radius = employmentToRadius(d.employmentGrowth);

      return {
        type: "scatter" as const,
        name: d.market,
        symbolSize: radius * 2,
        data: [[d.permitsGrowth, d.hpiMomentum]],
        itemStyle: {
          color: bubbleColor,
          opacity,
          borderColor: isFocused ? "rgba(255,255,255,0.25)" : "transparent",
          borderWidth: 1.5,
        },
        emphasis: {
          itemStyle: {
            color: bubbleColor,
            opacity: 1,
            borderColor: CHART_COLORS.gold,
            borderWidth: 2.5,
            shadowBlur: 16,
            shadowColor: bubbleColor + "60",
          },
          scale: 1.15,
        },
        label: {
          show: isFocused,
          formatter: d.market,
          position: "top" as const,
          distance: 6,
          fontSize: 10,
          fontFamily: "'Inter', sans-serif",
          color: isFocused ? "#CCCCCC" : "#444444",
          fontWeight: 500,
        },
        tooltip: {
          formatter: () => buildMarketTooltip(d),
        },
        // Attach market name for click handler
        id: d.market,
      };
    });

    // Quadrant background areas — subtle tints
    const quadrantArea = {
      type: "scatter" as const,
      name: "_quadrants",
      data: [],
      silent: true,
      markArea: {
        silent: true,
        data: [
          // Top-right: Growth + Building (subtle emerald tint)
          [
            { xAxis: 0, yAxis: 0, itemStyle: { color: "rgba(16,185,129,0.04)" } },
            { xAxis: xMax, yAxis: yMax },
          ],
          // Bottom-left: Declining (subtle rose tint)
          [
            { xAxis: xMin, yAxis: yMin, itemStyle: { color: "rgba(239,68,68,0.04)" } },
            { xAxis: 0, yAxis: 0 },
          ],
          // Top-left: Growing, Not Building (subtle amber tint)
          [
            { xAxis: xMin, yAxis: 0, itemStyle: { color: "rgba(245,158,11,0.03)" } },
            { xAxis: 0, yAxis: yMax },
          ],
          // Bottom-right: Building, Not Growing (subtle amber tint)
          [
            { xAxis: 0, yAxis: yMin, itemStyle: { color: "rgba(245,158,11,0.03)" } },
            { xAxis: xMax, yAxis: 0 },
          ],
        ],
      },
      // Quadrant dividers
      markLine: {
        silent: true,
        animation: false,
        symbol: ["none", "none"],
        lineStyle: { color: "#2A2A2A", type: "dashed" as const, width: 1 },
        label: { show: false },
        data: [
          { xAxis: 0 },
          { yAxis: 0 },
        ],
      },
    };

    return {
      backgroundColor: "transparent",

      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: "#1A1A1A",
        borderColor: "#1F1F1F",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#E5E5E5", fontSize: 12 },
        extraCssText: "box-shadow: 0 4px 24px rgba(0,0,0,0.6); border-radius: 8px; pointer-events: none;",
      },

      grid: {
        left: "8%",
        right: "5%",
        top: 32,
        bottom: 64,
        containLabel: true,
      },

      xAxis: {
        type: "value",
        name: "Permits Growth (%)",
        nameLocation: "middle",
        nameGap: 40,
        nameTextStyle: {
          color: "#666666",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        },
        min: xMin,
        max: xMax,
        axisLine: { lineStyle: { color: "#1F1F1F" } },
        axisTick: { lineStyle: { color: "#333333" } },
        splitLine: { lineStyle: { color: "#161616", type: "dashed" } },
        axisLabel: {
          color: "#666666",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (v: number) => `${v > 0 ? "+" : ""}${v}%`,
        },
      },

      yAxis: {
        type: "value",
        name: "HPI Momentum (%)",
        nameLocation: "middle",
        nameGap: 52,
        nameTextStyle: {
          color: "#666666",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        },
        min: yMin,
        max: yMax,
        axisLine: { lineStyle: { color: "#1F1F1F" } },
        axisTick: { lineStyle: { color: "#333333" } },
        splitLine: { lineStyle: { color: "#161616", type: "dashed" } },
        axisLabel: {
          color: "#666666",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (v: number) => `${v > 0 ? "+" : ""}${v}%`,
        },
      },

      // Quadrant labels rendered as graphic elements
      graphic: [
        {
          type: "text",
          right: "6%",
          top: 36,
          style: {
            text: "Growth + Building",
            fill: CHART_COLORS.emerald,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.5,
          },
          silent: true,
        },
        {
          type: "text",
          left: "8%",
          top: 36,
          style: {
            text: "Growing, Not Building",
            fill: CHART_COLORS.amber,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.5,
          },
          silent: true,
        },
        {
          type: "text",
          right: "6%",
          bottom: 68,
          style: {
            text: "Building, Not Growing",
            fill: CHART_COLORS.amber,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.5,
          },
          silent: true,
        },
        {
          type: "text",
          left: "8%",
          bottom: 68,
          style: {
            text: "Declining — Avoid",
            fill: CHART_COLORS.rose,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.5,
          },
          silent: true,
        },
      ],

      series: [quadrantArea, ...scatterSeries],
    } as unknown as EChartsOption;
  }, [data, hasFocus, focusedMarkets, xMin, xMax, yMin, yMax]);

  // Click handler
  const onEvents = useMemo(() => ({
    "click": (params: { seriesName?: string }) => {
      if (!params.seriesName || params.seriesName === "_quadrants") return;
      if (onMarketClick) onMarketClick(params.seriesName);
    },
  }), [onMarketClick]);

  // Empty state
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
          <p className="text-[11px] text-content-disabled">Select a region to load market profiles</p>
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
            Market{" "}
            <span className="text-gold-light">Signal Scatter</span>
          </h3>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            {data.length} markets · bubble size = job growth · color = supply tightness
            {hasFocus && (
              <span className="ml-2 text-gold font-medium">
                · {focusedMarkets.size} in {geoKey?.toUpperCase()} highlighted
              </span>
            )}
          </p>
        </div>

        {/* Dimension legends */}
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          {/* Color legend */}
          <div className="space-y-1">
            <p className="text-[9px] text-content-disabled uppercase tracking-widest">Supply Tightness</p>
            <div className="flex items-center gap-3">
              {[
                { color: CHART_COLORS.emerald, label: "Tight (≤2.5 mo)" },
                { color: CHART_COLORS.amber,   label: "Balanced" },
                { color: CHART_COLORS.rose,    label: "Oversupplied" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span
                    className="inline-block rounded-full shrink-0"
                    style={{ width: 9, height: 9, backgroundColor: color, opacity: 0.85 }}
                    aria-hidden="true"
                  />
                  <span className="text-[9px] text-content-tertiary">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Size legend */}
          <div className="space-y-1">
            <p className="text-[9px] text-content-disabled uppercase tracking-widest">Job Growth</p>
            <div className="flex items-center gap-2">
              {[
                { size: 14, label: "1%" },
                { size: 24, label: "3%" },
                { size: 34, label: "5%" },
              ].map(({ size, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span
                    className="inline-block rounded-full shrink-0"
                    style={{ width: size / 2, height: size / 2, backgroundColor: "#666666", opacity: 0.6 }}
                    aria-hidden="true"
                  />
                  <span className="text-[9px] text-content-tertiary">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        aria-label={`Scatter bubble chart showing ${data.length} markets across permits growth, HPI momentum, employment growth, and supply tightness`}
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

      {/* Quadrant key — bottom */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 px-2">
        {[
          { color: CHART_COLORS.emerald, zone: "Top-right", label: "Growth + Building — best signal convergence" },
          { color: CHART_COLORS.amber,   zone: "Top-left",  label: "Growing but not building — supply constraints" },
          { color: CHART_COLORS.amber,   zone: "Bottom-right", label: "Building but not growing — oversupply risk" },
          { color: CHART_COLORS.rose,    zone: "Bottom-left",  label: "Declining — avoid" },
        ].map(({ color, zone, label }) => (
          <div key={zone} className="flex items-center gap-2">
            <span
              className="inline-block rounded-sm shrink-0"
              style={{ width: 8, height: 8, backgroundColor: color, opacity: 0.5 }}
              aria-hidden="true"
            />
            <span className="text-[9px] text-content-disabled">
              <span className="font-semibold" style={{ color }}>{zone}:</span>
              {" "}{label}
            </span>
          </div>
        ))}
      </div>

      {/* Interaction hint */}
      <p className="text-center text-[9px] text-content-disabled mt-3">
        Hover a bubble for full detail · Click to open market
      </p>
    </div>
  );
}
