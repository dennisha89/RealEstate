"use client";

/**
 * FlowMatrixHeatmap
 *
 * A matrix heatmap grid — the Sankey blob made READABLE.
 *
 * Layout:
 *   Rows    (Y-axis) = 5 source states: California, New York, Illinois,
 *                      New Jersey, Massachusetts
 *   Columns (X-axis) = 10 destination markets: Austin, Tampa, Nashville,
 *                      Charlotte, Phoenix, Atlanta, Dallas, Las Vegas,
 *                      Jacksonville, San Antonio
 *   Each cell = annual dollar volume from that source to that destination.
 *
 * Color encoding: dark (#1A1A1A) → gold (#C9A227) → emerald (#10B981)
 *   as volume increases. The gradient makes the highest-traffic corridors
 *   immediately obvious.
 *
 * Row totals (right edge): total annual outflow per source state.
 * Column totals (bottom edge): total annual inflow per destination market.
 *
 * geoKey: when set to a state code, the matching row or column is highlighted;
 * the rest dim. This syncs with the same geoKey driving every other chart on
 * the Markets page.
 *
 * Library: echarts-for-react wrapping Apache ECharts 6 heatmap series.
 * Parent div controls container height.
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { Grid3X3, DollarSign } from "lucide-react";
import { CHART_COLORS, seededRandom } from "./ChartTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlowMatrixProps {
  geoKey?: string;
  className?: string;
}

// ─── Static dataset ──────────────────────────────────────────────────────────

interface MatrixEntry {
  source: string;      // full state name
  sourceCode: string;
  dest: string;        // destination city name (short label)
  destStateCode: string;
  volume: number;      // annual dollars
  growthRate: number;  // YoY decimal
}

function buildMatrixData(): MatrixEntry[] {
  const rng = seededRandom(4242);
  const noise = (base: number) =>
    Math.round(base * (0.85 + rng() * 0.30)) * 1_000_000;

  // [source, sourceCode, dest (short), destStateCode, baseMM, growth]
  const raw: [string, string, string, string, number, number][] = [
    ["California",    "CA", "Austin",       "TX",  1_850, 0.23],
    ["California",    "CA", "Tampa",         "FL",    520, 0.12],
    ["California",    "CA", "Nashville",     "TN",    340, 0.20],
    ["California",    "CA", "Charlotte",     "NC",    280, 0.14],
    ["California",    "CA", "Phoenix",       "AZ",  1_420, 0.18],
    ["California",    "CA", "Atlanta",       "GA",    640, 0.11],
    ["California",    "CA", "Dallas",        "TX",    980, 0.17],
    ["California",    "CA", "Las Vegas",     "NV",  1_100, 0.14],
    ["California",    "CA", "Jacksonville",  "FL",    190, 0.22],
    ["California",    "CA", "San Antonio",   "TX",    150, 0.28],

    ["New York",      "NY", "Austin",        "TX",    550, 0.19],
    ["New York",      "NY", "Tampa",         "FL",  1_650, 0.21],
    ["New York",      "NY", "Nashville",     "TN",    720, 0.22],
    ["New York",      "NY", "Charlotte",     "NC",    870, 0.16],
    ["New York",      "NY", "Phoenix",       "AZ",    380, 0.09],
    ["New York",      "NY", "Atlanta",       "GA",    490, 0.13],
    ["New York",      "NY", "Dallas",        "TX",    290, 0.09],
    ["New York",      "NY", "Las Vegas",     "NV",    210, 0.07],
    ["New York",      "NY", "Jacksonville",  "FL",    320, 0.18],
    ["New York",      "NY", "San Antonio",   "TX",    140, 0.24],

    ["Illinois",      "IL", "Austin",        "TX",    240, 0.16],
    ["Illinois",      "IL", "Tampa",         "FL",    690, 0.15],
    ["Illinois",      "IL", "Nashville",     "TN",    810, 0.25],
    ["Illinois",      "IL", "Charlotte",     "NC",    160, 0.08],
    ["Illinois",      "IL", "Phoenix",       "AZ",    420, 0.12],
    ["Illinois",      "IL", "Atlanta",       "GA",    270, 0.10],
    ["Illinois",      "IL", "Dallas",        "TX",    380, 0.10],
    ["Illinois",      "IL", "Las Vegas",     "NV",    120, 0.05],
    ["Illinois",      "IL", "Jacksonville",  "FL",    145, 0.20],
    ["Illinois",      "IL", "San Antonio",   "TX",     90, 0.15],

    ["New Jersey",    "NJ", "Austin",        "TX",    200, 0.17],
    ["New Jersey",    "NJ", "Tampa",         "FL",    760, 0.18],
    ["New Jersey",    "NJ", "Nashville",     "TN",    310, 0.19],
    ["New Jersey",    "NJ", "Charlotte",     "NC",    520, 0.14],
    ["New Jersey",    "NJ", "Phoenix",       "AZ",    170, 0.08],
    ["New Jersey",    "NJ", "Atlanta",       "GA",    310, 0.07],
    ["New Jersey",    "NJ", "Dallas",        "TX",    180, 0.11],
    ["New Jersey",    "NJ", "Las Vegas",     "NV",    115, 0.06],
    ["New Jersey",    "NJ", "Jacksonville",  "FL",    180, 0.28],
    ["New Jersey",    "NJ", "San Antonio",   "TX",     80, 0.21],

    ["Massachusetts", "MA", "Austin",        "TX",    260, 0.22],
    ["Massachusetts", "MA", "Tampa",         "FL",    280, 0.12],
    ["Massachusetts", "MA", "Nashville",     "TN",    440, 0.26],
    ["Massachusetts", "MA", "Charlotte",     "NC",    390, 0.17],
    ["Massachusetts", "MA", "Phoenix",       "AZ",    140, 0.10],
    ["Massachusetts", "MA", "Atlanta",       "GA",    170, 0.09],
    ["Massachusetts", "MA", "Dallas",        "TX",    190, 0.09],
    ["Massachusetts", "MA", "Las Vegas",     "NV",     90, 0.04],
    ["Massachusetts", "MA", "Jacksonville",  "FL",    110, 0.24],
    ["Massachusetts", "MA", "San Antonio",   "TX",    120, 0.31],
  ];

  return raw.map(([source, sourceCode, dest, destStateCode, baseMM, growthRate]) => ({
    source,
    sourceCode,
    dest,
    destStateCode,
    volume: noise(baseMM),
    growthRate,
  }));
}

const MATRIX_DATA = buildMatrixData();

// ─── Dimension arrays (order determines axis rendering) ───────────────────────

const SOURCES = ["California", "New York", "Illinois", "New Jersey", "Massachusetts"];
const SOURCE_CODES: Record<string, string> = {
  California: "CA",
  "New York": "NY",
  Illinois: "IL",
  "New Jersey": "NJ",
  Massachusetts: "MA",
};
const DESTS = [
  "Austin", "Tampa", "Nashville", "Charlotte", "Phoenix",
  "Atlanta", "Dallas", "Las Vegas", "Jacksonville", "San Antonio",
];
const DEST_STATE_CODES: Record<string, string> = {
  Austin: "TX", Tampa: "FL", Nashville: "TN", Charlotte: "NC",
  Phoenix: "AZ", Atlanta: "GA", Dallas: "TX", "Las Vegas": "NV",
  Jacksonville: "FL", "San Antonio": "TX",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCapital(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

/** Map 0-1 normalised value to the cell fill color. */
function normToColor(t: number): string {
  // 0-0.5: dark surface → gold; 0.5-1: gold → emerald
  function lerp(a: number, b: number, s: number) { return Math.round(a + (b - a) * s); }
  function hexToRgb(h: string): [number, number, number] {
    const c = h.replace("#", "");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  const [ar, ag, ab] = hexToRgb("#1A1A1A");
  const [mr, mg, mb] = hexToRgb(CHART_COLORS.gold);
  const [br, bg, bb] = hexToRgb(CHART_COLORS.emerald);
  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const s = t / 0.5;
    r = lerp(ar, mr, s); g = lerp(ag, mg, s); b = lerp(ab, mb, s);
  } else {
    const s = (t - 0.5) / 0.5;
    r = lerp(mr, br, s); g = lerp(mg, bg, s); b = lerp(mb, bb, s);
  }
  return `rgb(${r},${g},${b})`;
}

/** Resolve a geoKey to a 2-letter code, or null for national. */
function resolveGeoCode(geoKey: string | undefined): string | null {
  if (!geoKey || geoKey === "national") return null;
  return geoKey.toUpperCase().slice(0, 2);
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function HeatmapSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading flow matrix heatmap">
      {/* Header row of column labels */}
      <div className="flex gap-1.5 pl-24">
        {DESTS.map((_, i) => (
          <div key={i} className="skeleton h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Data rows */}
      {SOURCES.map((_, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <div className="skeleton h-8 w-24 rounded shrink-0" />
          {DESTS.map((__, j) => (
            <div key={j} className="skeleton h-8 flex-1 rounded" />
          ))}
          <div className="skeleton h-8 w-16 rounded shrink-0" />
        </div>
      ))}
      {/* Footer totals row */}
      <div className="flex gap-1.5 pl-24">
        {DESTS.map((_, i) => (
          <div key={i} className="skeleton h-6 flex-1 rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlowMatrixHeatmap({ geoKey, className }: FlowMatrixProps) {
  const highlightCode = resolveGeoCode(geoKey);

  // Build lookup: "Source|Dest" → MatrixEntry
  const lookup = useMemo(() => {
    const map = new Map<string, MatrixEntry>();
    for (const e of MATRIX_DATA) {
      map.set(`${e.source}|${e.dest}`, e);
    }
    return map;
  }, []);

  // Row totals (per source) and column totals (per dest)
  const rowTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of MATRIX_DATA) {
      t[e.source] = (t[e.source] ?? 0) + e.volume;
    }
    return t;
  }, []);

  const colTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const e of MATRIX_DATA) {
      t[e.dest] = (t[e.dest] ?? 0) + e.volume;
    }
    return t;
  }, []);

  const grandTotal = useMemo(
    () => MATRIX_DATA.reduce((a, e) => a + e.volume, 0),
    [],
  );

  // Volume range for normalisation
  const [minVol, maxVol] = useMemo(() => {
    const vols = MATRIX_DATA.map((e) => e.volume);
    return [Math.min(...vols), Math.max(...vols)];
  }, []);

  // Which source-state codes and dest-state codes are highlighted?
  const highlightedSources = useMemo(() => {
    if (!highlightCode) return new Set<string>();
    return new Set(
      SOURCES.filter((s) => SOURCE_CODES[s] === highlightCode),
    );
  }, [highlightCode]);

  const highlightedDests = useMemo(() => {
    if (!highlightCode) return new Set<string>();
    return new Set(
      DESTS.filter((d) => DEST_STATE_CODES[d] === highlightCode),
    );
  }, [highlightCode]);

  // Is ANY highlight active (row or column)?
  const anyHighlight = highlightedSources.size > 0 || highlightedDests.size > 0;

  // Build the flat data array for ECharts heatmap
  // ECharts heatmap data: [colIndex, rowIndex, value]
  const heatmapData = useMemo(() => {
    return SOURCES.flatMap((src, rowIdx) =>
      DESTS.map((dst, colIdx) => {
        const entry = lookup.get(`${src}|${dst}`);
        const vol = entry?.volume ?? 0;
        const norm = maxVol > minVol ? (vol - minVol) / (maxVol - minVol) : 0;
        const isHighlighted =
          !anyHighlight ||
          highlightedSources.has(src) ||
          highlightedDests.has(dst);
        return {
          value: [colIdx, rowIdx, vol, norm, isHighlighted ? 1 : 0],
          _src: src,
          _dst: dst,
          _vol: vol,
          _growth: entry?.growthRate ?? 0,
          _srcCode: SOURCE_CODES[src],
          _dstCode: DEST_STATE_CODES[dst],
        };
      }),
    );
  }, [lookup, minVol, maxVol, anyHighlight, highlightedSources, highlightedDests]);

  // Row total entries for the right-side "total" column (rendered as a separate series)
  const rowTotalData = useMemo(() =>
    SOURCES.map((src, rowIdx) => ({
      value: [DESTS.length, rowIdx, rowTotals[src] ?? 0],
      _src: src,
      _isTotal: true,
    })),
  [rowTotals]);

  // Column total entries for the bottom "total" row
  const colTotalData = useMemo(() =>
    DESTS.map((dst, colIdx) => ({
      value: [colIdx, SOURCES.length, colTotals[dst] ?? 0],
      _dst: dst,
      _isTotal: true,
    })),
  [colTotals]);

  const option = useMemo(() => {
    // Total volume range for row/col total normalisation (separate color scale)
    const rowTotalVols = SOURCES.map((s) => rowTotals[s] ?? 0);
    const colTotalVols = DESTS.map((d) => colTotals[d] ?? 0);
    const totalMax = Math.max(...rowTotalVols, ...colTotalVols);
    const totalMin = Math.min(...rowTotalVols, ...colTotalVols);

    const optionObj = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 600,
      grid: {
        // Leave room for axis labels; right/bottom for total column/row
        top: 56,
        right: 96,
        bottom: 64,
        left: 120,
        containLabel: false,
      },
      xAxis: {
        type: "category" as const,
        data: [...DESTS, "TOTAL"],
        position: "top" as const,
        axisLine: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        axisLabel: {
          color: "#6B7280",
          fontSize: 10,
          fontFamily: "JetBrains Mono, monospace",
          rotate: 30,
          interval: 0,
          formatter: (val: string) => {
            // Highlight labels that match geoKey
            const dstCode = DEST_STATE_CODES[val];
            if (highlightCode && dstCode === highlightCode) {
              return `{hl|${val}}`;
            }
            if (val === "TOTAL") return `{total|TOTAL}`;
            return val;
          },
          rich: {
            hl: {
              color: CHART_COLORS.gold,
              fontWeight: "bold",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            },
            total: {
              color: CHART_COLORS.amber,
              fontWeight: "bold",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            },
          },
        },
      },
      yAxis: {
        type: "category" as const,
        data: [...SOURCES, "TOTAL"],
        inverse: false,
        axisLine: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        axisLabel: {
          color: "#6B7280",
          fontSize: 10,
          fontFamily: "JetBrains Mono, monospace",
          formatter: (val: string) => {
            const code = SOURCE_CODES[val];
            if (highlightCode && code === highlightCode) {
              return `{hl|${val}}`;
            }
            if (val === "TOTAL") return `{total|${val}}`;
            return val;
          },
          rich: {
            hl: {
              color: CHART_COLORS.gold,
              fontWeight: "bold",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            },
            total: {
              color: CHART_COLORS.amber,
              fontWeight: "bold",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            },
          },
        },
      },
      tooltip: {
        trigger: "item" as const,
        confine: true,
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#111111", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as {
            data?: {
              _src?: string;
              _dst?: string;
              _vol?: number;
              _growth?: number;
              _srcCode?: string;
              _dstCode?: string;
              _isTotal?: boolean;
            };
          };
          if (!p.data) return "";
          const d = p.data;

          if (d._isTotal) {
            if (d._src) {
              // Row total
              const code = SOURCE_CODES[d._src];
              const pct = grandTotal > 0 ? ((d._vol ?? 0) / grandTotal * 100).toFixed(1) : "0";
              return [
                `<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Source State Total</div>`,
                `<div style="font-size:13px;font-weight:700;color:#F87171;margin-bottom:6px">${d._src} <span style="color:#666;font-size:10px">${code}</span></div>`,
                `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px">`,
                `  <span style="color:#999;font-size:11px">Total outflow</span>`,
                `  <span style="font-weight:700;font-size:14px;color:${CHART_COLORS.gold};font-family:JetBrains Mono">${fmtCapital(d._vol ?? 0)}</span>`,
                `</div>`,
                `<div style="display:flex;justify-content:space-between;gap:16px">`,
                `  <span style="color:#999;font-size:11px">Share of total</span>`,
                `  <span style="font-size:12px;color:#999;font-family:JetBrains Mono">${pct}%</span>`,
                `</div>`,
              ].join("");
            }
            if (d._dst) {
              // Col total
              const code = DEST_STATE_CODES[d._dst];
              const pct = grandTotal > 0 ? ((d._vol ?? 0) / grandTotal * 100).toFixed(1) : "0";
              return [
                `<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Destination Total</div>`,
                `<div style="font-size:13px;font-weight:700;color:#34D399;margin-bottom:6px">${d._dst} <span style="color:#666;font-size:10px">${code}</span></div>`,
                `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px">`,
                `  <span style="color:#999;font-size:11px">Total inflow</span>`,
                `  <span style="font-weight:700;font-size:14px;color:${CHART_COLORS.gold};font-family:JetBrains Mono">${fmtCapital(d._vol ?? 0)}</span>`,
                `</div>`,
                `<div style="display:flex;justify-content:space-between;gap:16px">`,
                `  <span style="color:#999;font-size:11px">Share of total</span>`,
                `  <span style="font-size:12px;color:#999;font-family:JetBrains Mono">${pct}%</span>`,
                `</div>`,
              ].join("");
            }
            return "";
          }

          const vol = d._vol ?? 0;
          const growth = d._growth ?? 0;
          const srcTotal = rowTotals[d._src ?? ""] ?? 1;
          const pctOfSrc = srcTotal > 0 ? ((vol / srcTotal) * 100).toFixed(1) : "0";
          const growthPct = (growth * 100).toFixed(1);
          const growthSign = growth >= 0 ? "+" : "";
          const growthColor = growth >= 0.15 ? CHART_COLORS.gold : growth >= 0 ? CHART_COLORS.amber : CHART_COLORS.rose;
          return [
            `<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Capital Flow</div>`,
            `<div style="font-size:12px;font-weight:600;margin-bottom:6px">`,
            `  <span style="color:#F87171">${d._src}</span>`,
            `  <span style="color:#555;margin:0 4px">→</span>`,
            `  <span style="color:#34D399">${d._dst} <span style="color:#666;font-size:10px">${d._dstCode}</span></span>`,
            `</div>`,
            `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px">`,
            `  <span style="font-size:11px;color:#999">Annual flow</span>`,
            `  <span style="font-weight:700;font-size:14px;color:${CHART_COLORS.gold};font-family:JetBrains Mono">${fmtCapital(vol)}</span>`,
            `</div>`,
            `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px">`,
            `  <span style="font-size:11px;color:#999">YoY growth</span>`,
            `  <span style="font-weight:600;font-size:12px;color:${growthColor};font-family:JetBrains Mono">${growthSign}${growthPct}%</span>`,
            `</div>`,
            `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:8px">`,
            `  <span style="font-size:11px;color:#999">% of ${SOURCE_CODES[d._src ?? ""]} total</span>`,
            `  <span style="font-size:11px;color:#999;font-family:JetBrains Mono">${pctOfSrc}%</span>`,
            `</div>`,
            `<div style="font-size:11px;color:#999;border-top:1px solid #252525;padding-top:6px;line-height:1.5;font-style:italic">`,
            `  ${d._src} investors put ${fmtCapital(vol)} into ${d._dst} last year — that's ${pctOfSrc}% of ${SOURCE_CODES[d._src ?? ""]}'s total outflow.`,
            `</div>`,
          ].join("");
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: 2500000000,
        inRange: {
          color: ["#1A1A1A", "#C9A227", "#10B981"],
        },
      },
      series: [
        // ── Main cell series ──────────────────────────────────────────────
        {
          type: "heatmap" as const,
          data: heatmapData.map((item) => {
            const vals = item.value as number[];
            const colIdx = vals[0] ?? 0;
            const rowIdx = vals[1] ?? 0;
            const vol = vals[2] ?? 0;
            const norm = vals[3] ?? 0;
            const inScope = vals[4] ?? 0;
            const cellColor = inScope ? normToColor(norm) : "#161616";
            return {
              value: [colIdx, rowIdx, vol],
              itemStyle: {
                color: cellColor,
                borderColor: "#111",
                borderWidth: 1,
                opacity: inScope ? 1 : 0.3,
              },
              emphasis: {
                itemStyle: {
                  borderColor: CHART_COLORS.gold,
                  borderWidth: 2,
                  shadowBlur: 8,
                  shadowColor: "rgba(201,162,39,0.4)",
                },
              },
              label: {
                show: true,
                color: inScope ? (norm > 0.6 ? "#000" : "#111111") : "#9CA3AF",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: norm > 0.7 ? "bold" : "normal",
                formatter: () => fmtCapital(vol),
              },
              // Carry raw data for tooltip
              _src: item._src,
              _dst: item._dst,
              _vol: item._vol,
              _growth: item._growth,
              _srcCode: item._srcCode,
              _dstCode: item._dstCode,
            };
          }),
          coordinateSystem: "cartesian2d" as const,
          xAxisIndex: 0,
          yAxisIndex: 0,
        },

        // ── Row total series (rightmost column) ───────────────────────────
        {
          type: "heatmap" as const,
          data: rowTotalData.map((item) => {
            const vol = (item.value as number[])[2] ?? 0;
            const norm = totalMax > totalMin ? (vol - totalMin) / (totalMax - totalMin) : 0;
            return {
              value: item.value,
              itemStyle: {
                color: `rgba(${parseInt(CHART_COLORS.amber.slice(1, 3), 16)},${parseInt(CHART_COLORS.amber.slice(3, 5), 16)},${parseInt(CHART_COLORS.amber.slice(5, 7), 16)},${0.15 + norm * 0.55})`,
                borderColor: "#252525",
                borderWidth: 1,
              },
              emphasis: {
                itemStyle: {
                  borderColor: CHART_COLORS.amber,
                  borderWidth: 2,
                },
              },
              label: {
                show: true,
                color: "#111111",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: "bold",
                formatter: () => fmtCapital(vol),
              },
              _src: item._src,
              _vol: vol,
              _isTotal: true,
            };
          }),
          coordinateSystem: "cartesian2d" as const,
          xAxisIndex: 0,
          yAxisIndex: 0,
        },

        // ── Column total series (bottom row) ──────────────────────────────
        {
          type: "heatmap" as const,
          data: colTotalData.map((item) => {
            const vol = (item.value as number[])[2] ?? 0;
            const norm = totalMax > totalMin ? (vol - totalMin) / (totalMax - totalMin) : 0;
            return {
              value: item.value,
              itemStyle: {
                color: `rgba(${parseInt(CHART_COLORS.emerald.slice(1, 3), 16)},${parseInt(CHART_COLORS.emerald.slice(3, 5), 16)},${parseInt(CHART_COLORS.emerald.slice(5, 7), 16)},${0.12 + norm * 0.5})`,
                borderColor: "#252525",
                borderWidth: 1,
              },
              emphasis: {
                itemStyle: {
                  borderColor: CHART_COLORS.emerald,
                  borderWidth: 2,
                },
              },
              label: {
                show: true,
                color: "#111111",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: "bold",
                formatter: () => fmtCapital(vol),
              },
              _dst: item._dst,
              _vol: vol,
              _isTotal: true,
            };
          }),
          coordinateSystem: "cartesian2d" as const,
          xAxisIndex: 0,
          yAxisIndex: 0,
        },
      ],
    };

    return optionObj as unknown as EChartsOption;
  }, [heatmapData, rowTotalData, colTotalData, rowTotals, colTotals, grandTotal, highlightCode]);

  // Header summary metrics
  const topSource = useMemo(() => {
    let best = { name: "", vol: 0 };
    for (const [name, vol] of Object.entries(rowTotals)) {
      if (vol > best.vol) best = { name, vol };
    }
    return best;
  }, [rowTotals]);

  const topDest = useMemo(() => {
    let best = { name: "", vol: 0 };
    for (const [name, vol] of Object.entries(colTotals)) {
      if (vol > best.vol) best = { name, vol };
    }
    return best;
  }, [colTotals]);

  return (
    <div className={className}>
      {/* ── Header metrics ── */}
      <div className="flex flex-wrap items-start gap-4 mb-4">
        {/* Grand total */}
        <div>
          <p className="section-label mb-0.5">Total Cross-Market Flow</p>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono tabular-nums text-2xl font-bold"
              style={{ color: CHART_COLORS.gold }}
              aria-label={`${fmtCapital(grandTotal)} total capital flow`}
            >
              {fmtCapital(grandTotal)}
            </span>
            <span className="text-[11px] text-content-disabled">/ yr est.</span>
          </div>
        </div>

        {/* Top exporter */}
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <span
            className="w-2 h-2 rounded-full bg-rose shrink-0"
            style={{ opacity: 0.85 }}
            aria-hidden="true"
          />
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">Biggest Exporter</p>
            <p className="text-[12px] font-medium text-content-primary">{topSource.name}</p>
            <p className="text-[11px] font-mono tabular-nums" style={{ color: CHART_COLORS.rose }}>
              {fmtCapital(topSource.vol)} out
            </p>
          </div>
        </div>

        {/* Top importer */}
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <span
            className="w-2 h-2 rounded-full bg-emerald shrink-0"
            style={{ opacity: 0.85 }}
            aria-hidden="true"
          />
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">Biggest Importer</p>
            <p className="text-[12px] font-medium text-content-primary">{topDest.name}</p>
            <p className="text-[11px] font-mono tabular-nums text-emerald">
              {fmtCapital(topDest.vol)} in
            </p>
          </div>
        </div>
      </div>

      {/* ── geoKey highlight badge ── */}
      {highlightCode && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
            style={{
              color: CHART_COLORS.gold,
              borderColor: "rgba(201,162,39,0.3)",
              backgroundColor: "rgba(201,162,39,0.06)",
            }}
          >
            <DollarSign className="w-3 h-3" aria-hidden="true" />
            {highlightCode} rows/columns highlighted — hover cells for details
          </span>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-5 mb-3 text-[11px]">
        <div className="flex items-center gap-2">
          <div
            className="w-24 h-3 rounded"
            style={{
              background: `linear-gradient(to right, #E5E7EB, ${CHART_COLORS.gold}, ${CHART_COLORS.emerald})`,
            }}
            aria-hidden="true"
          />
          <span className="text-content-secondary">Low → High volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-amber opacity-50" aria-hidden="true" />
          <span className="text-content-secondary">Row total (outflow)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-emerald opacity-40" aria-hidden="true" />
          <span className="text-content-secondary">Col total (inflow)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Grid3X3 className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          <span className="text-content-secondary">Hover any cell for corridor details</span>
        </div>
      </div>

      {/* ── ECharts heatmap ── */}
      <div
        role="img"
        aria-label={`Matrix heatmap showing capital flows from ${SOURCES.join(", ")} to ${DESTS.join(", ")}. Each cell shows annual dollar volume. Total flow: ${fmtCapital(grandTotal)}.`}
        style={{ height: "100%", minHeight: 380, width: "100%" }}
      >
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge
          lazyUpdate={false}
          opts={{ renderer: "canvas" }}
        />
      </div>

      {/* ── Plain English footer ── */}
      <p
        className="text-[12px] text-content-tertiary italic leading-relaxed mt-3 px-1 border-l-2 pl-3"
        style={{ borderLeftColor: "#1F1F1F" }}
      >
        Each cell shows how much money flows from that source state (rows) to that destination market (columns).
        Brighter = more capital. The right column and bottom row show totals.
      </p>
      <p className="text-[10px] text-content-disabled mt-1">
        Estimated flows · IRS migration + NCREIF institutional capital patterns · Not financial advice
      </p>
    </div>
  );
}
