"use client";

/**
 * HPIForecastChart — Home Price Index Historical + Forecast with Confidence Bands
 *
 * Renders 5 years of historical HPI (solid gold line) plus a 2-year forward
 * forecast (dashed gold line) with shaded 80% and 95% confidence bands.
 *
 * A vertical dashed line marks "today." A secondary Y-axis overlays a
 * subtle bar chart showing YoY appreciation rate.
 *
 * When geoKey changes, different deterministic HPI series are generated so
 * the chart responds to geographic drill-down without an API call.
 *
 * Data contract follows MetricDisplay: value, plainEnglish, source, asOfDate.
 * All sample data is deterministic via a seeded PRNG — same inputs = same chart.
 */

import React, { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { CHART_COLORS, seededRandom } from "./ChartTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HPIDataPoint {
  /** ISO date string: "2021-01-01" */
  date: string;
  /** Display label: "Jan '21" */
  label: string;
  /** HPI value for historical months (null on forecast rows) */
  hpi: number | null;
  /**
   * HPI value for forecast months (null on historical rows).
   * Kept separate so ECharts can render solid vs dashed lines cleanly.
   */
  forecastHpi: number | null;
  /** YoY appreciation rate in percent, e.g. 7.2 */
  yoy: number | null;
  /** Lower bound of 80% confidence interval (forecast only) */
  ci80Lower: number | null;
  /** Upper bound of 80% confidence interval (forecast only) */
  ci80Upper: number | null;
  /** Lower bound of 95% confidence interval (forecast only) */
  ci95Lower: number | null;
  /** Upper bound of 95% confidence interval (forecast only) */
  ci95Upper: number | null;
  /** true = historical, false = forecast */
  isHistorical: boolean;
}

export interface HPIForecastChartProps {
  /** Geographic key: "national" | state code | metro slug */
  geoKey?: string;
  className?: string;
}

// ─── Data Generation ──────────────────────────────────────────────────────────

/**
 * Market-specific parameters so each geoKey produces a distinct, plausible series.
 * baseHPI: approximate HPI in Jan 2021 (FHFA Purchase-Only HPI scale).
 * annualTrend: long-run annual appreciation rate (fraction, e.g. 0.072 = 7.2%).
 * volatility: monthly HPI noise amplitude.
 * forecastTrend: expected forward appreciation (may differ from historical).
 */
const GEO_PARAMS: Record<string, { baseHPI: number; annualTrend: number; volatility: number; forecastTrend: number; seed: number }> = {
  national:      { baseHPI: 248,  annualTrend: 0.072, volatility: 1.8, forecastTrend: 0.038, seed: 1001 },
  TX:            { baseHPI: 225,  annualTrend: 0.095, volatility: 2.4, forecastTrend: 0.051, seed: 1002 },
  FL:            { baseHPI: 238,  annualTrend: 0.102, volatility: 2.8, forecastTrend: 0.044, seed: 1003 },
  CA:            { baseHPI: 310,  annualTrend: 0.041, volatility: 3.2, forecastTrend: 0.021, seed: 1004 },
  NC:            { baseHPI: 212,  annualTrend: 0.088, volatility: 2.1, forecastTrend: 0.058, seed: 1005 },
  AZ:            { baseHPI: 221,  annualTrend: 0.083, volatility: 3.0, forecastTrend: 0.029, seed: 1006 },
  GA:            { baseHPI: 218,  annualTrend: 0.079, volatility: 2.2, forecastTrend: 0.047, seed: 1007 },
  TN:            { baseHPI: 209,  annualTrend: 0.091, volatility: 2.0, forecastTrend: 0.053, seed: 1008 },
  CO:            { baseHPI: 295,  annualTrend: 0.048, volatility: 2.6, forecastTrend: 0.022, seed: 1009 },
  WA:            { baseHPI: 288,  annualTrend: 0.057, volatility: 2.9, forecastTrend: 0.031, seed: 1010 },
  austin:        { baseHPI: 232,  annualTrend: 0.118, volatility: 3.4, forecastTrend: 0.028, seed: 2001 },
  dallas:        { baseHPI: 219,  annualTrend: 0.093, volatility: 2.5, forecastTrend: 0.046, seed: 2002 },
  miami:         { baseHPI: 244,  annualTrend: 0.114, volatility: 3.1, forecastTrend: 0.039, seed: 2003 },
  raleigh:       { baseHPI: 208,  annualTrend: 0.107, volatility: 2.3, forecastTrend: 0.062, seed: 2004 },
  phoenix:       { baseHPI: 218,  annualTrend: 0.088, volatility: 3.2, forecastTrend: 0.024, seed: 2005 },
};

function getGeoParams(geoKey: string) {
  const key = geoKey.toLowerCase().replace(/\s+/g, "");
  // Check exact match first, then try uppercase (state codes)
  return (
    GEO_PARAMS[key] ??
    GEO_PARAMS[geoKey.toUpperCase()] ??
    GEO_PARAMS["national"]!
  );
}

/**
 * Generates 5 years historical (60 months) + 2 years forecast (24 months).
 * "Today" is 2026-03, so history starts 2021-01 and forecast ends 2027-12.
 *
 * The confidence bands widen over time: stdErr grows with sqrt(months ahead).
 * 80% CI: ±1.28 σ, 95% CI: ±1.96 σ.
 */
export function generateHPIData(geoKey: string = "national"): HPIDataPoint[] {
  const params = getGeoParams(geoKey);
  const rng = seededRandom(params.seed);

  const HISTORY_MONTHS = 62; // Jan 2021 through Feb 2026 inclusive
  const FORECAST_MONTHS = 22; // Mar 2026 through Dec 2027
  const START_YEAR = 2021;
  const START_MONTH = 0; // January (0-indexed)

  const points: HPIDataPoint[] = [];
  let hpi = params.baseHPI;
  const monthlyTrend = params.annualTrend / 12;

  // ── Historical phase ──────────────────────────────────────────────────────
  const historicalHPIs: number[] = [];

  for (let m = 0; m < HISTORY_MONTHS; m++) {
    const totalMonth = START_MONTH + m;
    const year = START_YEAR + Math.floor(totalMonth / 12);
    const month = totalMonth % 12;
    const date = new Date(year, month, 1);
    const dateStr = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    // Random walk with upward drift
    const noise = (rng() - 0.5) * 2 * params.volatility;
    hpi = hpi * (1 + monthlyTrend) + noise;
    hpi = Math.round(hpi * 10) / 10;

    historicalHPIs.push(hpi);

    // YoY: compare to 12 months ago
    const yoy =
      historicalHPIs.length >= 13
        ? ((hpi / historicalHPIs[historicalHPIs.length - 13]!) - 1) * 100
        : null;

    points.push({
      date: dateStr,
      label,
      hpi,
      forecastHpi: null,
      yoy: yoy !== null ? Math.round(yoy * 10) / 10 : null,
      ci80Lower: null,
      ci80Upper: null,
      ci95Lower: null,
      ci95Upper: null,
      isHistorical: true,
    });
  }

  // ── Forecast phase ────────────────────────────────────────────────────────
  const forecastMonthlyTrend = params.forecastTrend / 12;
  // Monthly std error — scales with square root of month ahead (random walk uncertainty)
  const baseMonthlyStdErr = params.volatility * 0.8;
  const lastHistoricalHPI = hpi;

  // Forecast YoY baseline: last known YoY with mean-reversion toward 3.5%
  const lastKnownYoY =
    historicalHPIs.length >= 13
      ? ((historicalHPIs[historicalHPIs.length - 1]! / historicalHPIs[historicalHPIs.length - 13]!) - 1) * 100
      : params.forecastTrend * 100;

  let forecastHPI = hpi;

  for (let m = 0; m < FORECAST_MONTHS; m++) {
    const totalMonth = START_MONTH + HISTORY_MONTHS + m;
    const year = START_YEAR + Math.floor(totalMonth / 12);
    const month = totalMonth % 12;
    const date = new Date(year, month, 1);
    const dateStr = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    forecastHPI = forecastHPI * (1 + forecastMonthlyTrend);
    forecastHPI = Math.round(forecastHPI * 10) / 10;

    // Uncertainty grows with sqrt(t) — standard random-walk diffusion
    const monthsAhead = m + 1;
    const stdErr = baseMonthlyStdErr * Math.sqrt(monthsAhead);

    const ci80Lower = Math.round((forecastHPI - 1.28 * stdErr) * 10) / 10;
    const ci80Upper = Math.round((forecastHPI + 1.28 * stdErr) * 10) / 10;
    const ci95Lower = Math.round((forecastHPI - 1.96 * stdErr) * 10) / 10;
    const ci95Upper = Math.round((forecastHPI + 1.96 * stdErr) * 10) / 10;

    // YoY for forecast: mean-revert from last known toward forecast trend
    const revertWeight = Math.min(1, m / 12);
    const forecastYoY =
      lastKnownYoY * (1 - revertWeight) + params.forecastTrend * 100 * revertWeight;

    // hpi is null on forecast rows; forecastHpi carries the value.
    // This lets ECharts render them as two separate series (solid vs dashed).
    points.push({
      date: dateStr,
      label,
      hpi: null,
      // Bridge the first forecast point to the last historical value so the
      // dashed line connects seamlessly from the solid line.
      forecastHpi: m === 0 ? lastHistoricalHPI : forecastHPI,
      yoy: Math.round(forecastYoY * 10) / 10,
      ci80Lower,
      ci80Upper,
      ci95Lower,
      ci95Upper,
      isHistorical: false,
    });
  }

  return points;
}

// ─── Pre-compute national sample for export ───────────────────────────────────

export const HPI_SAMPLE_DATA: HPIDataPoint[] = generateHPIData("national");

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function fmtHPI(v: number): string {
  return v.toFixed(1);
}

function fmtYoY(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// ─── Option Builder ───────────────────────────────────────────────────────────

function buildOption(data: HPIDataPoint[]) {
  const labels = data.map((d) => d.label);
  const _todayIndex = data.findLastIndex((d) => d.isHistorical);

  // Series arrays
  const historicalHPI: (number | null)[] = data.map((d) => d.hpi);
  const forecastHPI: (number | null)[] = data.map((d) => d.forecastHpi);

  const ci80Lower: (number | null)[] = data.map((d) => d.ci80Lower);
  const ci80Upper: (number | null)[] = data.map((d) => d.ci80Upper);
  const ci95Lower: (number | null)[] = data.map((d) => d.ci95Lower);
  const ci95Upper: (number | null)[] = data.map((d) => d.ci95Upper);

  // YoY bars — all points (some null for missing early history)
  const yoyBars: (number | null)[] = data.map((d) => d.yoy);

  // Min/max for Y axis domain with padding
  const allHPI = data.flatMap((d) => {
    const vals: number[] = [];
    if (d.hpi !== null) vals.push(d.hpi);
    if (d.forecastHpi !== null) vals.push(d.forecastHpi);
    if (d.ci95Lower !== null) vals.push(d.ci95Lower);
    if (d.ci95Upper !== null) vals.push(d.ci95Upper);
    return vals;
  });
  const hpiMin = Math.floor(Math.min(...allHPI) - 5);
  const hpiMax = Math.ceil(Math.max(...allHPI) + 5);

  return {
    backgroundColor: "transparent",
    grid: {
      top: 32,
      right: 56,
      bottom: 60,
      left: 56,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "#1A1A1A",
      borderColor: "#1F1F1F",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        color: "#E5E5E5",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
      },
      axisPointer: {
        type: "cross",
        lineStyle: { color: "#333", width: 1, type: "dashed" },
        crossStyle: { color: "#333" },
        label: {
          backgroundColor: "#1A1A1A",
          borderColor: "#1F1F1F",
          color: "#999",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
        },
      },
      formatter: (
        paramsArr: Array<{
          seriesName: string;
          value: number | null;
          dataIndex: number;
          color: string;
        }>,
      ) => {
        if (!Array.isArray(paramsArr) || paramsArr.length === 0) return "";

        const idx = paramsArr[0]!.dataIndex;
        const point = data[idx];
        if (!point) return "";

        const hpiVal = point.hpi ?? (point as { forecastHpi?: number }).forecastHpi;
        const hpiStr = hpiVal !== undefined && hpiVal !== null ? fmtHPI(hpiVal) : "—";
        const yoyStr = point.yoy !== null ? fmtYoY(point.yoy) : "—";

        const isForecast = !point.isHistorical;
        const typeLabel = isForecast
          ? `<span style="color:#666;font-size:10px">FORECAST</span>`
          : `<span style="color:#444;font-size:10px">ACTUAL</span>`;

        const lines = [
          `<span style="font-size:12px;font-weight:600;color:#FAFAFA">${point.label}</span> ${typeLabel}`,
          `<hr style="border:none;border-top:1px solid #2A2A2A;margin:5px 0"/>`,
          `<span style="color:#666">HPI:</span> <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${CHART_COLORS.gold}">${hpiStr}</span>`,
          `<br/><span style="color:#666">YoY Change:</span> <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${
            point.yoy !== null && point.yoy >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose
          }">${yoyStr}</span>`,
        ];

        if (isForecast && point.ci80Lower !== null && point.ci80Upper !== null) {
          lines.push(
            `<br/><span style="color:#666">80% CI:</span> <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#999">${fmtHPI(point.ci80Lower)} – ${fmtHPI(point.ci80Upper)}</span>`,
          );
        }
        if (isForecast && point.ci95Lower !== null && point.ci95Upper !== null) {
          lines.push(
            `<br/><span style="color:#666">95% CI:</span> <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#666">${fmtHPI(point.ci95Lower)} – ${fmtHPI(point.ci95Upper)}</span>`,
          );
        }

        return lines.join("");
      },
    },
    legend: {
      show: true,
      top: 4,
      right: 8,
      itemWidth: 20,
      itemHeight: 3,
      textStyle: {
        color: "#666",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
      },
      data: [
        { name: "HPI (Actual)", icon: "rect" },
        { name: "HPI (Forecast)", icon: "rect" },
      ],
    },
    xAxis: [
      {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#1F1F1F" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#666",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          interval: 5, // show every 6th label ≈ semi-annual
          rotate: 0,
        },
        splitLine: { show: false },
      },
    ],
    yAxis: [
      // Primary: HPI values
      {
        type: "value",
        name: "HPI",
        nameTextStyle: {
          color: "#666",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          align: "right",
        },
        min: hpiMin,
        max: hpiMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#666",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          formatter: (v: number) => v.toFixed(0),
        },
        splitLine: {
          lineStyle: { color: "#1F1F1F", type: "solid" },
        },
      },
      // Secondary: YoY %
      {
        type: "value",
        name: "YoY %",
        nameTextStyle: {
          color: "#444",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          align: "left",
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#444",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          formatter: (v: number) => `${v.toFixed(0)}%`,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      // ── 95% confidence band — rendered as stacked area (lower + band width) ──
      {
        name: "CI95 Lower (hidden)",
        type: "line",
        yAxisIndex: 0,
        data: ci95Lower,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        symbol: "none",
        stack: "ci95",
        silent: true,
        legendHoverLink: false,
        tooltip: { show: false },
        z: 1,
      },
      {
        name: "95% Confidence",
        type: "line",
        yAxisIndex: 0,
        data: ci95Upper.map((upper, i) => {
          if (upper === null || ci95Lower[i] === null) return null;
          return upper - ci95Lower[i]!;
        }),
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: CHART_COLORS.gold,
          opacity: 0.08,
        },
        symbol: "none",
        stack: "ci95",
        silent: true,
        legendHoverLink: false,
        tooltip: { show: false },
        z: 2,
      },
      // ── 80% confidence band ───────────────────────────────────────────────
      {
        name: "CI80 Lower (hidden)",
        type: "line",
        yAxisIndex: 0,
        data: ci80Lower,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        symbol: "none",
        stack: "ci80",
        silent: true,
        legendHoverLink: false,
        tooltip: { show: false },
        z: 3,
      },
      {
        name: "80% Confidence",
        type: "line",
        yAxisIndex: 0,
        data: ci80Upper.map((upper, i) => {
          if (upper === null || ci80Lower[i] === null) return null;
          return upper - ci80Lower[i]!;
        }),
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: CHART_COLORS.gold,
          opacity: 0.15,
        },
        symbol: "none",
        stack: "ci80",
        silent: true,
        legendHoverLink: false,
        tooltip: { show: false },
        z: 4,
      },
      // ── YoY bars (secondary axis, very subtle) ────────────────────────────
      {
        name: "YoY Appreciation",
        type: "bar",
        yAxisIndex: 1,
        data: yoyBars,
        barMaxWidth: 6,
        itemStyle: {
          color: (params: { value: number }) =>
            params.value >= 0
              ? "rgba(16,185,129,0.20)"
              : "rgba(239,68,68,0.20)",
          borderRadius: [2, 2, 0, 0],
        },
        z: 2,
        tooltip: { show: false },
        legendHoverLink: false,
        silent: true,
      },
      // ── Historical HPI line ────────────────────────────────────────────────
      {
        name: "HPI (Actual)",
        type: "line",
        yAxisIndex: 0,
        data: historicalHPI,
        lineStyle: {
          color: CHART_COLORS.gold,
          width: 2.5,
          type: "solid",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(201,162,39,0.18)" },
              { offset: 1, color: "rgba(201,162,39,0.02)" },
            ],
          },
        },
        symbol: "none",
        emphasis: {
          scale: false,
        },
        z: 8,
        connectNulls: false,
      },
      // ── Forecast HPI line ─────────────────────────────────────────────────
      {
        name: "HPI (Forecast)",
        type: "line",
        yAxisIndex: 0,
        data: forecastHPI,
        lineStyle: {
          color: CHART_COLORS.gold,
          width: 2,
          type: "dashed",
          dashOffset: 0,
        },
        areaStyle: { opacity: 0 },
        symbol: "none",
        z: 9,
        connectNulls: false,
      },
    ],
    dataZoom: [],
    // "TODAY" line is injected imperatively by addTodayLine() inside
    // onChartReady, which uses convertToPixel for exact pixel placement.
    graphic: [],
  };
}

// ─── Today Line via onChartReady ──────────────────────────────────────────────

type EChartsInstance = {
  convertToPixel: (
    coord: { seriesIndex: number },
    value: [number, number],
  ) => [number, number];
  getDom: () => HTMLElement;
  getOption: () => { grid?: Array<{ top?: number; bottom?: number }> };
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: () => void;
};

function addTodayLine(chart: EChartsInstance, todayIndex: number) {
  try {
    // convertToPixel maps [dataIndex, dataValue] to canvas [x, y]
    const pixel = chart.convertToPixel({ seriesIndex: 4 }, [todayIndex, 0]);
    if (!pixel) return;
    const x = pixel[0];
    const dom = chart.getDom();
    const height = dom.clientHeight;
    const option = chart.getOption();
    const gridTop = (option.grid as Array<{ top?: number }>)[0]?.top ?? 32;
    const gridBottom = (option.grid as Array<{ bottom?: number }>)[0]?.bottom ?? 60;

    chart.setOption(
      {
        graphic: [
          {
            type: "group",
            id: "todayLine",
            children: [
              {
                type: "line",
                shape: {
                  x1: x,
                  y1: gridTop,
                  x2: x,
                  y2: height - gridBottom,
                },
                style: {
                  stroke: "#444",
                  lineWidth: 1,
                  lineDash: [4, 4],
                },
                z: 12,
              },
              {
                type: "text",
                x: x + 4,
                y: gridTop + 4,
                style: {
                  text: "TODAY",
                  font: "bold 9px 'JetBrains Mono', monospace",
                  fill: "#555",
                  textAlign: "left",
                },
                z: 13,
              },
            ],
          },
        ],
      },
      false,
    );
  } catch {
    // Fail silently if chart dimensions aren't ready yet
  }
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function HPISkeleton() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden flex flex-col gap-3"
      style={{ height: 350 }}
      aria-busy="true"
      aria-label="Loading HPI forecast chart"
    >
      <div className="skeleton h-4 w-48 rounded" />
      <div className="skeleton flex-1 rounded-xl" />
      <div className="skeleton h-3 w-full rounded" />
    </div>
  );
}

// ─── Stat Callouts ────────────────────────────────────────────────────────────

interface HPIStatsProps {
  data: HPIDataPoint[];
}

function HPIStats({ data }: HPIStatsProps) {
  const historicalPoints = data.filter((d) => d.isHistorical && d.hpi !== null);
  const forecastPoints = data.filter((d) => !d.isHistorical && d.forecastHpi !== null);

  const firstHPI = historicalPoints[0]?.hpi ?? 0;
  const lastHPI = historicalPoints[historicalPoints.length - 1]?.hpi ?? 0;
  const lastForecast = forecastPoints[forecastPoints.length - 1]?.forecastHpi ?? 0;

  const historicalGain = firstHPI > 0 ? ((lastHPI / firstHPI) - 1) * 100 : 0;
  const forecastGain = lastHPI > 0 ? ((lastForecast / lastHPI) - 1) * 100 : 0;

  const lastYoY =
    historicalPoints[historicalPoints.length - 1]?.yoy ?? null;

  const yoyColor =
    lastYoY !== null && lastYoY >= 5
      ? CHART_COLORS.emerald
      : lastYoY !== null && lastYoY >= 0
      ? CHART_COLORS.amber
      : CHART_COLORS.rose;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border">
        <p className="section-label mb-1">5-Year Gain</p>
        <p
          className="font-mono tabular-nums text-lg font-bold"
          style={{ color: historicalGain >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose }}
          aria-label={`5-year HPI gain: ${historicalGain.toFixed(1)}%`}
        >
          {historicalGain >= 0 ? "+" : ""}
          {historicalGain.toFixed(1)}%
        </p>
        <p className="text-[10px] text-content-disabled mt-0.5">Jan 2021 → Now</p>
      </div>
      <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border">
        <p className="section-label mb-1">Current YoY</p>
        <p
          className="font-mono tabular-nums text-lg font-bold"
          style={{ color: yoyColor }}
          aria-label={`Current year-over-year change: ${lastYoY !== null ? fmtYoY(lastYoY) : "N/A"}`}
        >
          {lastYoY !== null ? fmtYoY(lastYoY) : "—"}
        </p>
        <p className="text-[10px] text-content-disabled mt-0.5">Trailing 12 months</p>
      </div>
      <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border">
        <p className="section-label mb-1">2-Year Forecast</p>
        <p
          className="font-mono tabular-nums text-lg font-bold"
          style={{ color: forecastGain >= 0 ? CHART_COLORS.gold : CHART_COLORS.rose }}
          aria-label={`2-year HPI forecast: ${forecastGain.toFixed(1)}%`}
        >
          {forecastGain >= 0 ? "+" : ""}
          {forecastGain.toFixed(1)}%
        </p>
        <p className="text-[10px] text-content-disabled mt-0.5">Mar 2026 → Dec 2027</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HPIForecastChart({
  geoKey = "national",
  className,
}: HPIForecastChartProps) {
  const data = useMemo(() => generateHPIData(geoKey), [geoKey]);

  const todayIndex = useMemo(
    () => data.findLastIndex((d) => d.isHistorical),
    [data],
  );

  const option = useMemo(() => buildOption(data), [data]);

  const onChartReady = useCallback(
    (chart: unknown) => {
      addTodayLine(chart as EChartsInstance, todayIndex);
    },
    [todayIndex],
  );

  if (data.length === 0) return <HPISkeleton />;

  const geoLabel =
    geoKey === "national" || !geoKey
      ? "National"
      : geoKey.toUpperCase();

  return (
    <div
      className={className}
      role="img"
      aria-label={`HPI forecast chart for ${geoLabel}. Gold solid line shows historical values; dashed line shows 2-year forecast with confidence intervals.`}
    >
      {/* Stat callouts */}
      <HPIStats data={data} />

      {/* Chart */}
      <div className="mt-4" style={{ height: 350 }}>
        <ReactECharts
          option={option}
          onChartReady={onChartReady}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: "canvas" }}
          notMerge
          lazyUpdate={false}
        />
      </div>

      {/* Legend + footnote */}
      <div className="mt-3 pt-3 border-t border-surface-border flex flex-col gap-2">
        {/* Visual legend */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-6 h-0.5 rounded"
              style={{ backgroundColor: CHART_COLORS.gold }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono text-content-tertiary">Actual HPI</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="2" aria-hidden="true">
              <line
                x1="0" y1="1" x2="24" y2="1"
                stroke={CHART_COLORS.gold}
                strokeWidth="2"
                strokeDasharray="5 3"
              />
            </svg>
            <span className="text-[10px] font-mono text-content-tertiary">Forecast</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-6 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(201,162,39,0.22)` }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono text-content-tertiary">80% CI</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-6 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(201,162,39,0.10)` }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono text-content-tertiary">95% CI</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-0.5 h-3"
              style={{ backgroundColor: "#444", borderStyle: "dashed" }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono text-content-tertiary">Today</span>
          </div>
        </div>
        <p className="text-[10px] text-content-disabled">
          Gold line = actual. Dashed = forecast. Bands = confidence intervals.
          Source: FHFA Purchase-Only HPI methodology · Forecast: LootVue signal engine
        </p>
      </div>
    </div>
  );
}
