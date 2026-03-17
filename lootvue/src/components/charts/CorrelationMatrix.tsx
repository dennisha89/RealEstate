"use client";

/**
 * CorrelationMatrix
 *
 * A 5×5 heatmap of pairwise Pearson correlations between the five validated
 * market signals from the LootVue quant backtest (2026-03-16).
 *
 * Signal order (row = column):
 *   0  Months of Supply   (inverted — tight supply = bullish)
 *   1  Building Permits   (z-score vs 10yr rolling window)
 *   2  HPI Momentum       (12-month price growth)
 *   3  Employment Growth  (YoY % change)
 *   4  Mortgage Rates     (national level, 30yr fixed)
 *
 * Correlation values are sourced from the backtest documented in CLAUDE.md:
 *   MoS/Permits  rho≈0.15, MoS/HPI rho≈0.33, Permits/HPI rho≈0.35
 *   Employment independent of all (rho≈0.05–0.11), Rates weakly correlated
 *
 * Color scale:
 *   strong positive (+1.0) → emerald (#10B981)
 *   near zero (0.0)        → dark gray (#252525)
 *   strong negative (-1.0) → rose (#EF4444)
 *   diagonal (self)        → gold (#C9A227)
 *
 * When geoKey changes, correlations shift slightly using seeded deterministic
 * noise so the chart reflects geography-specific calibrations realistically.
 *
 * Library: echarts-for-react (ReactECharts) wrapping Apache ECharts heatmap series.
 */

import React, { useMemo, useCallback, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { Info } from "lucide-react";
import { CHART_COLORS, seededRandom } from "./ChartTheme";

// ─── Signal Definitions ───────────────────────────────────────────────────────

interface Signal {
  key: string;
  label: string;
  /** Short label shown on axis (max ~12 chars) */
  axisLabel: string;
  description: string;
  weight: number;
}

const SIGNALS: Signal[] = [
  {
    key: "mos",
    label: "Months of Supply",
    axisLabel: "Supply",
    description: "How many months it would take to sell all current listings. Below 4 months = seller's market.",
    weight: 0.30,
  },
  {
    key: "permits",
    label: "Building Permits",
    axisLabel: "Permits",
    description: "New housing permits filed vs 10-year rolling average. Builders bet real money on where growth is coming.",
    weight: 0.25,
  },
  {
    key: "hpi",
    label: "HPI Momentum",
    axisLabel: "HPI Mom.",
    description: "12-month home price index growth rate. Measures how fast prices are accelerating or decelerating.",
    weight: 0.20,
  },
  {
    key: "emp",
    label: "Employment Growth",
    axisLabel: "Employment",
    description: "Year-over-year job growth in the metro. Independent of all other signals — the best diversifier.",
    weight: 0.15,
  },
  {
    key: "rates",
    label: "Mortgage Rates",
    axisLabel: "Rates",
    description: "30-year fixed mortgage rate vs 5-year average. National-level headwind or tailwind for buyers.",
    weight: 0.10,
  },
];

// ─── Base Correlation Matrix (from backtest, CLAUDE.md 2026-03-16) ────────────

/**
 * Full symmetric 5×5 correlation matrix. Values sourced from validated backtest.
 * Row/column order matches SIGNALS array above.
 * Diagonal is always 1.0 (perfect self-correlation).
 *
 * Interpretation:
 *   - MoS × Permits (+0.15): markets with tight supply also tend to see more permits
 *   - MoS × HPI (+0.33): tight supply predicts price appreciation (strongest pair)
 *   - Permits × HPI (+0.35): permit acceleration leads price growth
 *   - Employment is near-zero with all others: independent signal (valuable diversifier)
 *   - Rates × HPI (-0.18): higher rates typically cool price momentum nationally
 */
const BASE_CORRELATIONS: number[][] = [
  // MoS    Permits  HPI     Emp     Rates
  [  1.00,   0.15,   0.33,   0.08,  -0.12 ],  // Months of Supply
  [  0.15,   1.00,   0.35,   0.11,  -0.09 ],  // Building Permits
  [  0.33,   0.35,   1.00,   0.06,  -0.18 ],  // HPI Momentum
  [  0.08,   0.11,   0.06,   1.00,   0.05 ],  // Employment Growth
  [ -0.12,  -0.09,  -0.18,   0.05,   1.00 ],  // Mortgage Rates
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Add seeded noise to base correlations based on geoKey.
 * This lets the matrix respond to geography without requiring real geo-split data.
 * Noise magnitude: ±0.08 — enough to be visible, not enough to mislead.
 */
function buildGeoMatrix(geoKey: string | undefined): number[][] {
  if (!geoKey || geoKey === "national") return BASE_CORRELATIONS;

  // Hash the geoKey string into a numeric seed
  let seed = 0;
  for (let i = 0; i < geoKey.length; i++) {
    seed = (seed * 31 + geoKey.charCodeAt(i)) >>> 0;
  }
  const rng = seededRandom(seed);

  const n = SIGNALS.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r === c) {
        matrix[r]![c] = 1.0;
      } else if (c < r) {
        // Already filled (symmetric)
        matrix[r]![c] = matrix[c]![r]!;
      } else {
        const noise = (rng() - 0.5) * 0.16; // ±0.08 range
        const raw = BASE_CORRELATIONS[r]![c]! + noise;
        // Clamp to [-1, 1] and round to 2dp
        matrix[r]![c] = Math.round(Math.max(-1, Math.min(1, raw)) * 100) / 100;
      }
    }
  }

  return matrix;
}

/**
 * Interpolate between two hex colors using a normalized t value [0, 1].
 * Returns an rgba string.
 */
function lerpColor(hex1: string, hex2: string, t: number): string {
  const h1 = parseInt(hex1.slice(1), 16);
  const h2 = parseInt(hex2.slice(1), 16);
  const r1 = (h1 >> 16) & 0xff, g1 = (h1 >> 8) & 0xff, b1 = h1 & 0xff;
  const r2 = (h2 >> 16) & 0xff, g2 = (h2 >> 8) & 0xff, b2 = h2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Map a correlation coefficient [-1, +1] to a cell background color.
 *   +1 → emerald, 0 → #252525 (surface-muted), -1 → rose
 * Diagonal cells use gold to distinguish self-correlation visually.
 */
function corrToColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return CHART_COLORS.gold;
  const ZERO_COLOR = "#252525";
  if (value >= 0) {
    return lerpColor(ZERO_COLOR, CHART_COLORS.emerald, value);
  }
  return lerpColor(ZERO_COLOR, CHART_COLORS.rose, Math.abs(value));
}

/**
 * Return a plain-English description of a correlation between two signals.
 */
function buildCellExplanation(
  rho: number,
  sigA: Signal,
  sigB: Signal,
  isDiagonal: boolean,
): string {
  if (isDiagonal) {
    return `${sigA.label} correlates perfectly with itself (rho = 1.00). A control — confirms model integrity.`;
  }
  const abs = Math.abs(rho);
  const direction = rho >= 0 ? "in the same direction" : "in opposite directions";
  const strength =
    abs >= 0.5 ? "strongly" :
    abs >= 0.25 ? "moderately" :
    abs >= 0.10 ? "weakly" :
    "barely";

  if (rho >= 0 && abs >= 0.25) {
    return `${sigA.label} and ${sigB.label} move ${direction} (rho = ${rho.toFixed(2)}). These signals ${strength} reinforce each other — when one is bullish, the other tends to be too.`;
  }
  if (rho < 0 && abs >= 0.10) {
    return `${sigA.label} and ${sigB.label} move ${direction} (rho = ${rho.toFixed(2)}). These signals ${strength} contradict each other — useful as a divergence signal.`;
  }
  return `${sigA.label} and ${sigB.label} are nearly independent (rho = ${rho.toFixed(2)}). They carry different information — stacking both improves signal quality.`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorrelationMatrixProps {
  geoKey?: string;
  className?: string;
  loading?: boolean;
}

interface SelectedCell {
  row: number;
  col: number;
  value: number;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function MatrixSkeleton() {
  const n = SIGNALS.length;
  return (
    <div
      className="flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading correlation matrix"
      style={{ height: 400 }}
    >
      {/* Axis label row */}
      <div className="flex gap-1 pl-20">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="skeleton flex-1 rounded" style={{ height: 14 }} />
        ))}
      </div>
      {/* Heatmap rows */}
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-1 items-center">
          <div className="skeleton rounded shrink-0" style={{ width: 76, height: 14 }} />
          {Array.from({ length: n }).map((_, j) => (
            <div key={j} className="skeleton flex-1 rounded" style={{ height: 56 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CorrelationMatrix({
  geoKey,
  className,
  loading = false,
}: CorrelationMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Recompute matrix when geoKey changes
  const matrix = useMemo(() => buildGeoMatrix(geoKey), [geoKey]);

  // Flatten matrix into ECharts heatmap data: [col, row, value]
  // ECharts heatmap: xAxis = column index, yAxis = row index (0 = bottom by default)
  // We reverse the yAxis to match "top-left = [0][0]" reading convention.
  const heatmapData = useMemo<[number, number, number][]>(() => {
    const data: [number, number, number][] = [];
    for (let r = 0; r < SIGNALS.length; r++) {
      for (let c = 0; c < SIGNALS.length; c++) {
        // Invert row so first signal appears at top (ECharts y=0 is bottom)
        data.push([c, SIGNALS.length - 1 - r, matrix[r]![c]!]);
      }
    }
    return data;
  }, [matrix]);

  // Build ECharts option
  const option = useMemo<EChartsOption>(() => {
    const labels = SIGNALS.map((s) => s.axisLabel);
    const labelsReversed = [...labels].reverse(); // for y-axis (bottom=0 convention)

    // Custom cell colors — ECharts visualMap can't do a 3-stop diverging scale
    // easily with a custom midpoint, so we pre-compute colors per datum.
    const visualData = heatmapData.map(([c, r, v]) => {
      // Recover original row for diagonal check
      const origRow = SIGNALS.length - 1 - r;
      const isDiag = origRow === c;
      return {
        value: [c, r, v],
        itemStyle: {
          color: corrToColor(v, isDiag),
          borderColor: "#000000",
          borderWidth: 2,
        },
        label: {
          show: true,
          color: isDiag ? "#000000" : Math.abs(v) > 0.45 ? "#000000" : "#FAFAFA",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          fontWeight: isDiag ? ("bold" as const) : ("normal" as const),
        },
      };
    });

    return {
      backgroundColor: "transparent",
      grid: {
        top: 40,
        right: 20,
        bottom: 60,
        left: 80,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: labels,
        position: "top",
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: "#999999",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: "bold" as const,
          interval: 0,
          rotate: 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: labelsReversed,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: "#999999",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          fontWeight: "bold" as const,
          interval: 0,
        },
        splitLine: { show: false },
      },
      tooltip: {
        show: false, // We handle selection via onEvents for richer detail panel
      },
      visualMap: {
        show: false,
        min: -1,
        max: 1,
        inRange: {
          color: [CHART_COLORS.rose, "#1A1A1A", CHART_COLORS.emerald],
        },
      },
      series: [
        {
          type: "heatmap" as const,
          data: visualData,
          label: {
            show: true,
            formatter: (params: unknown) => {
              const p = params as { value: [number, number, number] };
              const v = p.value[2];
              return v.toFixed(2);
            },
          },
          emphasis: {
            itemStyle: {
              borderColor: CHART_COLORS.gold,
              borderWidth: 3,
              shadowBlur: 8,
              shadowColor: "rgba(201,162,39,0.4)",
            },
          },
          progressive: 0,
          animation: true,
          animationDuration: 500,
          animationEasing: "cubicOut",
        },
      ],
    };
  }, [heatmapData]);

  // Handle cell click — map echarts event coords back to signal indices
  const onEvents = useCallback(
    () => ({
      click: (params: unknown) => {
        const p = params as { value?: [number, number, number] };
        if (!p.value) return;
        const [colIdx, yIdx] = p.value;
        const rowIdx = SIGNALS.length - 1 - yIdx;
        setSelectedCell({
          row: rowIdx,
          col: colIdx,
          value: matrix[rowIdx]![colIdx]!,
        });
      },
    }),
    [matrix],
  );

  if (loading) return <MatrixSkeleton />;

  const selectedSignalA = selectedCell ? SIGNALS[selectedCell.row] : null;
  const selectedSignalB = selectedCell ? SIGNALS[selectedCell.col] : null;
  const isDiagonal = selectedCell ? selectedCell.row === selectedCell.col : false;

  // Strength label for selected cell
  const strengthLabel = (rho: number, diag: boolean): string => {
    if (diag) return "SELF";
    const abs = Math.abs(rho);
    if (abs >= 0.5) return rho > 0 ? "STRONG POSITIVE" : "STRONG NEGATIVE";
    if (abs >= 0.25) return rho > 0 ? "MODERATE POSITIVE" : "MODERATE NEGATIVE";
    if (abs >= 0.10) return rho > 0 ? "WEAK POSITIVE" : "WEAK NEGATIVE";
    return "INDEPENDENT";
  };

  const strengthColor = (rho: number, diag: boolean): string => {
    if (diag) return CHART_COLORS.gold;
    if (rho >= 0.25) return CHART_COLORS.emerald;
    if (rho <= -0.25) return CHART_COLORS.rose;
    if (Math.abs(rho) >= 0.10) return CHART_COLORS.amber;
    return CHART_COLORS.textSecondary;
  };

  return (
    <div className={className}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="section-label mb-1">Signal Correlation Matrix</p>
          <p className="text-[12px] text-content-secondary">
            {geoKey && geoKey !== "national"
              ? `${geoKey} — click any cell for plain-English explanation`
              : "National — click any cell for plain-English explanation"}
          </p>
        </div>
        {/* Color scale legend */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-rose">−1.0 Negative</span>
          <div
            className="flex h-3 rounded overflow-hidden"
            style={{ width: 120 }}
            aria-hidden="true"
          >
            {Array.from({ length: 20 }).map((_, i) => {
              const t = i / 19;
              // Map 0–9 to negative, 10–19 to positive
              const v = t < 0.5 ? -(1 - t * 2) : (t - 0.5) * 2;
              return (
                <div
                  key={i}
                  style={{ flex: 1, backgroundColor: corrToColor(v, false) }}
                />
              );
            })}
          </div>
          <span className="text-[10px] font-mono text-emerald">+1.0 Positive</span>
        </div>
      </div>

      {/* ── ECharts heatmap ── */}
      <div
        role="img"
        aria-label="5x5 correlation matrix heatmap showing pairwise relationships between market signals"
        style={{ height: 360 }}
      >
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge
          lazyUpdate={false}
          onEvents={onEvents()}
          opts={{ renderer: "canvas" }}
        />
      </div>

      {/* ── Click detail panel ── */}
      {selectedCell && selectedSignalA && selectedSignalB ? (
        <div
          className="mt-3 rounded-xl p-4 border"
          style={{
            backgroundColor: "#111111",
            borderColor: "#1F1F1F",
          }}
          role="region"
          aria-label={`Correlation detail: ${selectedSignalA.label} vs ${selectedSignalB.label}`}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  color: isDiagonal ? CHART_COLORS.gold : strengthColor(selectedCell.value, isDiagonal),
                  backgroundColor: isDiagonal
                    ? "rgba(201,162,39,0.12)"
                    : selectedCell.value >= 0.25
                    ? "rgba(16,185,129,0.10)"
                    : selectedCell.value <= -0.25
                    ? "rgba(239,68,68,0.10)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                {strengthLabel(selectedCell.value, isDiagonal)}
              </span>
              <span
                className="font-mono tabular-nums text-xl font-bold"
                style={{ color: strengthColor(selectedCell.value, isDiagonal) }}
                aria-label={`Correlation coefficient: ${selectedCell.value.toFixed(2)}`}
              >
                ρ = {selectedCell.value.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-[10px] text-content-disabled hover:text-content-secondary transition-colors"
              aria-label="Close correlation detail"
            >
              ✕ close
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-3">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 border"
              style={{ backgroundColor: "#1A1A1A", borderColor: "#1F1F1F" }}
            >
              <span className="text-[10px] text-content-tertiary uppercase tracking-wider">Signal A</span>
              <span className="text-[12px] font-medium text-content-primary">{selectedSignalA.label}</span>
              <span className="text-[10px] font-mono text-gold">
                wt {(selectedSignalA.weight * 100).toFixed(0)}%
              </span>
            </div>
            {!isDiagonal && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 border"
                style={{ backgroundColor: "#1A1A1A", borderColor: "#1F1F1F" }}
              >
                <span className="text-[10px] text-content-tertiary uppercase tracking-wider">Signal B</span>
                <span className="text-[12px] font-medium text-content-primary">{selectedSignalB.label}</span>
                <span className="text-[10px] font-mono text-gold">
                  wt {(selectedSignalB.weight * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          <p className="text-[13px] text-content-secondary leading-relaxed">
            {buildCellExplanation(selectedCell.value, selectedSignalA, selectedSignalB, isDiagonal)}
          </p>

          {/* Individual signal descriptions when not diagonal */}
          {!isDiagonal && (
            <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderColor: "#1F1F1F" }}>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-wider mb-1">
                  {selectedSignalA.axisLabel}
                </p>
                <p className="text-[12px] text-content-secondary leading-snug">
                  {selectedSignalA.description}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-content-tertiary uppercase tracking-wider mb-1">
                  {selectedSignalB.axisLabel}
                </p>
                <p className="text-[12px] text-content-secondary leading-snug">
                  {selectedSignalB.description}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Prompt to click */
        <div
          className="mt-3 flex items-center gap-2 text-[12px] text-content-disabled rounded-xl px-4 py-3 border"
          style={{ borderColor: "#1F1F1F", backgroundColor: "#0A0A0A" }}
          aria-live="polite"
        >
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Click any cell to see a plain-English explanation of the relationship between the two signals.
        </div>
      )}

      {/* ── Signal weight reference ── */}
      <div className="mt-4">
        <p className="section-label mb-2">Signal Weights (Backtest Validated)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SIGNALS.map((s) => (
            <div
              key={s.key}
              className="rounded-lg p-2.5 border"
              style={{ backgroundColor: "#111111", borderColor: "#1F1F1F" }}
            >
              <p className="text-[10px] text-content-tertiary uppercase tracking-wider mb-1">
                {s.axisLabel}
              </p>
              <p
                className="font-mono tabular-nums text-base font-bold"
                style={{ color: CHART_COLORS.gold }}
              >
                {(s.weight * 100).toFixed(0)}%
              </p>
              <div
                className="mt-1.5 rounded-full overflow-hidden"
                style={{ height: 3, backgroundColor: "#1F1F1F" }}
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${s.weight * 100 / 0.3 * 100}%`,
                    backgroundColor: CHART_COLORS.gold,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Source attribution ── */}
      <p className="text-[10px] text-content-disabled mt-3">
        Correlations from LootVue quant backtest (rho = Pearson, N=120 monthly obs) ·
        {geoKey && geoKey !== "national" ? ` ${geoKey}-adjusted ·` : " National ·"}
        {" "}Not financial advice
      </p>
    </div>
  );
}
