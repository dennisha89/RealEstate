"use client";

/**
 * MonteCarloChart — IRR Probability Distribution
 *
 * Renders the histogram output of runMonteCarlo() as a bar chart with zone
 * coloring, percentile reference lines, and plain-English probability callouts.
 *
 * Data contract maps directly to the engine's native types:
 *   histogram  → MonteCarloResult.irrHistogram (HistogramBucket[])
 *   percentiles → MonteCarloResult.irr (DistributionStats subset)
 *
 * The component accepts both the engine's native types AND a convenience
 * sampleData export so pages can render it without wiring a full engine run.
 */

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  fmtChartPct,
} from "./ChartTheme";
import type { HistogramBucket, DistributionStats } from "@/lib/engines/monte-carlo-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonteCarloChartProps {
  /** irrHistogram from MonteCarloResult */
  histogram: HistogramBucket[];
  /** irr stats from MonteCarloResult (p10, median/p50, p90 used for reference lines) */
  percentiles: {
    p5: number; p10: number; p25: number;
    p50: number;  // mapped from DistributionStats.median by caller
    p75: number; p90: number; p95: number;
  };
  /** probabilityOfPositiveReturn from MonteCarloResult — e.g. 78.4 (not 0.784) */
  probabilityPositive: number;
  /** probabilityOfTargetIRR from MonteCarloResult — e.g. 62.1 */
  probabilityAboveTarget?: number;
  /** targetIRR used in the simulation (%), e.g. 12 */
  target?: number;
  /** numSimulations from MonteCarloResult */
  iterations: number;
  /** "IRR" | "Cash-on-Cash" | "Equity Multiple" */
  metric?: string;
  /** Show skeleton loading state */
  loading?: boolean;
  /** Optional height override. Default 280 */
  height?: number;
}

// ─── Zone Coloring ───────────────────────────────────────────────────────────

/**
 * Return the fill color for a histogram bar based on the bucket midpoint IRR.
 * Zone boundaries match the scenario labels in the engine's scenarioCounts.
 *   < 0%   : rose  (loss)
 *   0-5%   : amber (marginal)
 *   5-12%  : gold  (acceptable)
 *  > 12%   : emerald (good / excellent)
 */
function zoneColor(midIRR: number): string {
  if (midIRR < 0) return CHART_COLORS.rose;
  if (midIRR < 5) return CHART_COLORS.amber;
  if (midIRR < 12) return CHART_COLORS.gold;
  return CHART_COLORS.emerald;
}

/** Muted (translucent) version of the zone color for the bar fill */
function zoneFill(midIRR: number): string {
  if (midIRR < 0) return "rgba(239,68,68,0.55)";
  if (midIRR < 5) return "rgba(245,158,11,0.55)";
  if (midIRR < 12) return "rgba(201,162,39,0.55)";
  return "rgba(16,185,129,0.55)";
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface BucketDatum {
  label: string;
  mid: number;
  count: number;
  percentage: number;
}

function MonteCarloTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as BucketDatum | undefined;
  if (!d) return null;

  const color = zoneColor(d.mid);
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 160 }}>
      <p style={{ fontSize: 11, color: CHART_COLORS.text, marginBottom: 6, fontFamily: "JetBrains Mono, monospace" }}>
        {d.label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>Simulations:</span>
        <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
          {d.count.toLocaleString()}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "transparent", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>Frequency:</span>
        <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
          {d.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─── Legend / Zone Key ───────────────────────────────────────────────────────

function ZoneLegend() {
  const zones = [
    { label: "Loss", color: CHART_COLORS.rose, range: "< 0%" },
    { label: "Marginal", color: CHART_COLORS.amber, range: "0 – 5%" },
    { label: "Acceptable", color: CHART_COLORS.gold, range: "5 – 12%" },
    { label: "Strong", color: CHART_COLORS.emerald, range: "> 12%" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
      {zones.map((z) => (
        <div key={z.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: z.color, opacity: 0.75 }}
          />
          <span className="text-[10px] font-mono text-content-tertiary">
            {z.range}
          </span>
          <span className="text-[10px] text-content-disabled">{z.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Probability Callout ─────────────────────────────────────────────────────

interface CalloutProps {
  probabilityPositive: number;
  probabilityAboveTarget?: number;
  target?: number;
  p50: number;
  p10: number;
  metric: string;
}

function ProbabilityCallout({
  probabilityPositive,
  probabilityAboveTarget,
  target,
  p50,
  p10,
  metric,
}: CalloutProps) {
  const positiveIsGood = probabilityPositive >= 75;
  const positiveIsOk = probabilityPositive >= 50;

  const TrendIcon = positiveIsGood
    ? TrendingUp
    : positiveIsOk
    ? Minus
    : TrendingDown;
  const trendColor = positiveIsGood
    ? CHART_COLORS.emerald
    : positiveIsOk
    ? CHART_COLORS.amber
    : CHART_COLORS.rose;

  return (
    <div className="grid grid-cols-2 gap-2 mt-3 sm:grid-cols-3">
      {/* Probability positive */}
      <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendIcon
            className="w-3.5 h-3.5"
            style={{ color: trendColor }}
            aria-hidden="true"
          />
          <span className="section-label">Positive Return</span>
        </div>
        <p
          className="font-mono tabular-nums text-xl font-bold"
          style={{ color: trendColor }}
          aria-label={`${probabilityPositive.toFixed(1)}% chance of positive ${metric}`}
        >
          {probabilityPositive.toFixed(1)}%
        </p>
        <p className="text-[10px] text-content-disabled mt-0.5">of simulations</p>
      </div>

      {/* Most likely outcome (P50) */}
      <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border">
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          <span className="section-label">Median {metric}</span>
        </div>
        <p
          className="font-mono tabular-nums text-xl font-bold text-gold"
          aria-label={`Median ${metric}: ${p50.toFixed(1)}%`}
        >
          {p50 >= 0 ? "" : "-"}{Math.abs(p50).toFixed(1)}%
        </p>
        <p className="text-[10px] text-content-disabled mt-0.5">most likely outcome</p>
      </div>

      {/* Above target or worst-case P10 */}
      {probabilityAboveTarget !== undefined && target !== undefined ? (
        <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: CHART_COLORS.goldLight }}
              aria-hidden="true"
            />
            <span className="section-label">Above {target}% Target</span>
          </div>
          <p
            className="font-mono tabular-nums text-xl font-bold"
            style={{ color: CHART_COLORS.goldLight }}
            aria-label={`${probabilityAboveTarget.toFixed(1)}% chance of exceeding ${target}% target ${metric}`}
          >
            {probabilityAboveTarget.toFixed(1)}%
          </p>
          <p className="text-[10px] text-content-disabled mt-0.5">of simulations</p>
        </div>
      ) : (
        <div className="bg-surface-elevated rounded-lg p-3 border border-surface-border col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: CHART_COLORS.roseLight }}
              aria-hidden="true"
            />
            <span className="section-label">Worst Realistic (P10)</span>
          </div>
          <p
            className="font-mono tabular-nums text-xl font-bold"
            style={{ color: p10 >= 0 ? CHART_COLORS.amber : CHART_COLORS.rose }}
            aria-label={`Worst 10% of outcomes: ${p10.toFixed(1)}% ${metric}`}
          >
            {p10 >= 0 ? "" : "-"}{Math.abs(p10).toFixed(1)}%
          </p>
          <p className="text-[10px] text-content-disabled mt-0.5">10th percentile</p>
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function MonteCarloSkeleton({ height }: { height: number }) {
  return (
    <div style={{ height }} className="flex flex-col gap-3" aria-busy="true" aria-label="Loading Monte Carlo distribution">
      {/* Fake bar chart */}
      <div className="flex items-end gap-0.5 flex-1 px-2">
        {Array.from({ length: 24 }).map((_, i) => {
          // Simulate a rough bell-curve shape for the skeleton
          const dist = Math.abs(i - 12);
          const heightPct = Math.max(8, 100 - dist * dist * 2.5);
          return (
            <div
              key={i}
              className="skeleton flex-1 rounded-sm"
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
      {/* X-axis */}
      <div className="skeleton h-3 w-3/4 mx-auto rounded" />
      {/* Callout cards */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MonteCarloChart({
  histogram,
  percentiles,
  probabilityPositive,
  probabilityAboveTarget,
  target,
  iterations,
  metric = "IRR",
  loading = false,
  height = 280,
}: MonteCarloChartProps) {
  // Transform engine HistogramBucket[] into Recharts datum format.
  // Each bucket's midpoint determines zone color.
  const data = useMemo<BucketDatum[]>(() => {
    if (!histogram?.length) return [];
    return histogram.map((b) => ({
      label: `${fmtChartPct(b.rangeStart)} to ${fmtChartPct(b.rangeEnd)}`,
      mid: (b.rangeStart + b.rangeEnd) / 2,
      count: b.count,
      percentage: b.percentage,
    }));
  }, [histogram]);

  if (loading) return <MonteCarloSkeleton height={height + 130} />;

  if (!data.length) {
    return (
      <div
        className="flex flex-col items-center justify-center text-content-tertiary gap-2"
        style={{ height }}
        role="status"
        aria-label="No Monte Carlo data available"
      >
        <Target className="w-8 h-8 opacity-30" aria-hidden="true" />
        <p className="text-sm">No simulation data available</p>
        <p className="text-[11px] text-content-disabled">Run an analysis to generate the distribution</p>
      </div>
    );
  }

  const axisTickStyle = AXIS_STYLE.tick;
  const gridProps = GRID_STYLE;

  return (
    <div className="flex flex-col gap-1" aria-label={`${metric} distribution from ${iterations.toLocaleString()} simulations`}>
      {/* Header meta */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-content-tertiary font-mono">
          {iterations.toLocaleString()} simulations · {data.length} buckets
        </p>
        <div className="flex items-center gap-3 text-[11px] font-mono text-content-tertiary">
          <span>
            P10:{" "}
            <span style={{ color: CHART_COLORS.text }}>
              {fmtChartPct(percentiles.p10)}
            </span>
          </span>
          <span>
            P50:{" "}
            <span style={{ color: CHART_COLORS.gold }}>
              {fmtChartPct(percentiles.p50)}
            </span>
          </span>
          <span>
            P90:{" "}
            <span style={{ color: CHART_COLORS.text }}>
              {fmtChartPct(percentiles.p90)}
            </span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          barCategoryGap={1}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        >
          <defs>
            {/* Subtle gradient for each zone — applied via Cell */}
            <linearGradient id="mc-bar-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopOpacity={0.9} />
              <stop offset="100%" stopOpacity={0.45} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray={gridProps.strokeDasharray}
            stroke={gridProps.stroke}
            vertical={gridProps.vertical}
          />

          <XAxis
            dataKey="mid"
            tickFormatter={(v: number) => fmtChartPct(v)}
            tick={axisTickStyle}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            interval="preserveStartEnd"
            minTickGap={28}
          />

          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={axisTickStyle}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            width={38}
            domain={[0, "auto"]}
            label={{
              value: "% of sims",
              angle: -90,
              position: "insideLeft",
              offset: 8,
              style: { fill: CHART_COLORS.text, fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
            }}
          />

          <Tooltip
            content={<MonteCarloTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />

          {/* P10 reference line — dashed, muted */}
          <ReferenceLine
            x={percentiles.p10}
            stroke={CHART_COLORS.text}
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{
              value: `P10 ${fmtChartPct(percentiles.p10)}`,
              position: "top",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fill: CHART_COLORS.text,
            }}
          />

          {/* P50 reference line — solid, gold, thicker */}
          <ReferenceLine
            x={percentiles.p50}
            stroke={CHART_COLORS.gold}
            strokeDasharray="0"
            strokeWidth={2}
            label={{
              value: `P50 ${fmtChartPct(percentiles.p50)}`,
              position: "top",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fill: CHART_COLORS.gold,
            }}
          />

          {/* P90 reference line — dashed, muted */}
          <ReferenceLine
            x={percentiles.p90}
            stroke={CHART_COLORS.text}
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{
              value: `P90 ${fmtChartPct(percentiles.p90)}`,
              position: "top",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fill: CHART_COLORS.text,
            }}
          />

          {/* Target reference line (optional) */}
          {target !== undefined && (
            <ReferenceLine
              x={target}
              stroke={CHART_COLORS.goldLight}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Target ${fmtChartPct(target)}`,
                position: "insideTopRight",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                fill: CHART_COLORS.goldLight,
              }}
            />
          )}

          {/* Zero baseline */}
          <ReferenceLine
            x={0}
            stroke={CHART_COLORS.rose}
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{
              value: "Break-even",
              position: "insideBottomLeft",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fill: CHART_COLORS.rose,
              opacity: 0.7,
            }}
          />

          <Bar
            dataKey="percentage"
            radius={[2, 2, 0, 0]}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`mc-cell-${index}`}
                fill={zoneFill(entry.mid)}
                stroke={zoneColor(entry.mid)}
                strokeWidth={0.5}
                strokeOpacity={0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Zone legend */}
      <ZoneLegend />

      {/* Probability callout cards */}
      <ProbabilityCallout
        probabilityPositive={probabilityPositive}
        probabilityAboveTarget={probabilityAboveTarget}
        target={target}
        p50={percentiles.p50}
        p10={percentiles.p10}
        metric={metric}
      />

      {/* Plain English summary */}
      <p
        className="text-[12px] text-content-tertiary italic leading-relaxed mt-2 px-1 border-l-2 pl-3"
        style={{ borderLeftColor: CHART_COLORS.border }}
        aria-live="polite"
      >
        {buildSummary(probabilityPositive, percentiles.p10, percentiles.p50, percentiles.p90, metric)}
      </p>
    </div>
  );
}

// ─── Summary Generator ────────────────────────────────────────────────────────

function buildSummary(
  probPositive: number,
  p10: number,
  p50: number,
  p90: number,
  metric: string,
): string {
  const p50Str = `${p50 >= 0 ? "" : "-"}${Math.abs(p50).toFixed(1)}%`;
  const p10Str = `${p10 >= 0 ? "" : "-"}${Math.abs(p10).toFixed(1)}%`;
  const p90Str = `${p90 >= 0 ? "" : "-"}${Math.abs(p90).toFixed(1)}%`;

  if (probPositive >= 90) {
    return `Highly favorable distribution. ${probPositive.toFixed(0)}% of simulations produce a positive ${metric}. Most likely outcome: ${p50Str}. Even the bottom 10% of scenarios still deliver ${p10Str}.`;
  }
  if (probPositive >= 70) {
    return `Solid risk profile. ${probPositive.toFixed(0)}% chance of a positive ${metric}. Median outcome is ${p50Str}. The realistic downside (P10) is ${p10Str} and the upside case (P90) reaches ${p90Str}.`;
  }
  if (probPositive >= 50) {
    return `Moderate risk. ${probPositive.toFixed(0)}% chance of a positive ${metric}, but meaningful downside exists. Median: ${p50Str}. Stress-test reserves carefully against the P10 scenario of ${p10Str}.`;
  }
  return `Elevated risk. Only ${probPositive.toFixed(0)}% of simulations produce a positive ${metric}. The median outcome of ${p50Str} is below break-even in many runs. Consider restructuring or adding more equity.`;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

/**
 * Development/demo data. Generates a realistic-looking IRR distribution
 * centered around ~9.4% with a slight right skew.
 * Does NOT use seededRandom — this is purely static for Storybook / page previews.
 */
export const MONTE_CARLO_SAMPLE: MonteCarloChartProps = (() => {
  // 30 buckets from -5% to 25% (1% wide each)
  const buckets: HistogramBucket[] = [];
  const totalSims = 10000;

  // Gaussian-ish distribution centered at ~9.5%, stdDev ~4%
  const mean = 9.5;
  const stdDev = 4.0;

  let totalCount = 0;
  for (let i = 0; i < 30; i++) {
    const start = -5 + i;
    const end = start + 1;
    const mid = start + 0.5;
    // Use a normal PDF approximation for counts
    const z = (mid - mean) / stdDev;
    const pdf = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
    // 1% bucket width
    const count = Math.round(pdf * 1 * totalSims);
    totalCount += count;
    buckets.push({ rangeStart: start, rangeEnd: end, count, percentage: 0 });
  }

  // Fix percentages with actual total (rounding may cause drift)
  for (const b of buckets) {
    b.percentage = Math.round((b.count / totalCount) * 10000) / 100;
  }

  return {
    histogram: buckets,
    percentiles: {
      p5: 2.8,
      p10: 3.9,
      p25: 6.8,
      p50: 9.4,
      p75: 12.1,
      p90: 15.2,
      p95: 17.1,
    },
    probabilityPositive: 78.3,
    probabilityAboveTarget: 62.1,
    target: 8,
    iterations: 10000,
    metric: "IRR",
  };
})();
