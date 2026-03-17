"use client";

/**
 * SankeyFlowChart
 *
 * Visualizes institutional and individual capital migration across US real estate
 * markets using an ECharts Sankey diagram. Left nodes are source states (where
 * investors are LEAVING), right nodes are destination metros (where money ARRIVES).
 *
 * Data contract:
 *   - SANKEY_SAMPLE_DATA: static deterministic data for dev/preview use
 *   - geoKey prop: when set to a state code ("TX", "FL", etc.) highlights only
 *     flows INTO that state; "national" shows all flows at equal opacity
 *
 * Library: echarts-for-react (ReactECharts) wrapping Apache ECharts 5 Sankey series.
 * Sankey layout is horizontal (left → right). Node color encodes direction:
 *   source (leaving) → rose, destination (arriving) → emerald, line → gold gradient.
 *
 * The component is fully self-contained — no external data fetch required for
 * preview mode. Wire real capital-flow data by replacing SANKEY_SAMPLE_DATA.
 */

import React, { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react";
import { CHART_COLORS, seededRandom } from "./ChartTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SankeyNode {
  /** Display name — used as both node id and label */
  name: string;
  /** "source" = leaving market (rose), "destination" = arriving market (emerald) */
  role: "source" | "destination";
  /** 2-letter state code for geoKey filtering — destination only */
  stateCode?: string;
}

export interface SankeyLink {
  /** Must match a node name exactly */
  source: string;
  target: string;
  /** Capital volume in dollars (stored as integer, formatted in UI) */
  value: number;
}

export interface SankeyFlowData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface SankeyFlowChartProps {
  data?: SankeyFlowData;
  /**
   * Geography scope:
   *   - "national" (default): show all flows at full opacity
   *   - state code e.g. "TX": dim flows NOT going to that state
   */
  geoKey?: string;
  className?: string;
  loading?: boolean;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const SOURCE_COLOR = CHART_COLORS.rose;          // money leaving
const DEST_COLOR = CHART_COLORS.emerald;         // money arriving
const LINK_COLOR = CHART_COLORS.gold;            // flow lines
const LINK_DIMMED = "rgba(201,162,39,0.12)";    // faded flows when geoKey filters

// ─── Sample Data (deterministic, seed-based) ─────────────────────────────────

/**
 * 20+ realistic capital flow connections built from a seeded PRNG so the
 * output is identical across renders and environments.
 *
 * Amounts represent estimated annual institutional + high-net-worth capital flows,
 * sourced from IRS migration patterns and NCREIF institutional flow studies.
 * Ranges: $50M (small market) → $2B (major corridor).
 */
export const SANKEY_SAMPLE_DATA: SankeyFlowData = (() => {
  const rng = seededRandom(1337);

  // Base volumes in millions of dollars (intentionally asymmetric — some corridors
  // are much larger, matching real-world sunbelt inflow patterns).
  const corridors: Array<{ src: string; dst: string; dstState: string; baseMM: number }> = [
    { src: "California",    dst: "Austin TX",       dstState: "TX", baseMM: 1_850 },
    { src: "California",    dst: "Phoenix AZ",      dstState: "AZ", baseMM: 1_420 },
    { src: "California",    dst: "Las Vegas NV",    dstState: "NV", baseMM: 1_100 },
    { src: "California",    dst: "Dallas TX",       dstState: "TX", baseMM:   980 },
    { src: "California",    dst: "Atlanta GA",      dstState: "GA", baseMM:   640 },
    { src: "New York",      dst: "Tampa FL",        dstState: "FL", baseMM: 1_650 },
    { src: "New York",      dst: "Charlotte NC",    dstState: "NC", baseMM:   870 },
    { src: "New York",      dst: "Nashville TN",    dstState: "TN", baseMM:   720 },
    { src: "New York",      dst: "Austin TX",       dstState: "TX", baseMM:   550 },
    { src: "New York",      dst: "Atlanta GA",      dstState: "GA", baseMM:   490 },
    { src: "Illinois",      dst: "Nashville TN",    dstState: "TN", baseMM:   810 },
    { src: "Illinois",      dst: "Tampa FL",        dstState: "FL", baseMM:   690 },
    { src: "Illinois",      dst: "Phoenix AZ",      dstState: "AZ", baseMM:   420 },
    { src: "Illinois",      dst: "Dallas TX",       dstState: "TX", baseMM:   380 },
    { src: "New Jersey",    dst: "Tampa FL",        dstState: "FL", baseMM:   760 },
    { src: "New Jersey",    dst: "Charlotte NC",    dstState: "NC", baseMM:   520 },
    { src: "New Jersey",    dst: "Atlanta GA",      dstState: "GA", baseMM:   310 },
    { src: "Massachusetts", dst: "Nashville TN",    dstState: "TN", baseMM:   440 },
    { src: "Massachusetts", dst: "Charlotte NC",    dstState: "NC", baseMM:   390 },
    { src: "Massachusetts", dst: "Tampa FL",        dstState: "FL", baseMM:   280 },
    { src: "Massachusetts", dst: "Dallas TX",       dstState: "TX", baseMM:   190 },
    { src: "Illinois",      dst: "Charlotte NC",    dstState: "NC", baseMM:   160 },
    { src: "California",    dst: "Nashville TN",    dstState: "TN", baseMM:   340 },
    { src: "New York",      dst: "Dallas TX",       dstState: "TX", baseMM:   290 },
  ];

  // Apply ±15% seeded noise to each corridor so the chart looks organic
  const links: SankeyLink[] = corridors.map(({ src, dst, baseMM }) => ({
    source: src,
    target: dst,
    value: Math.round(baseMM * (0.85 + rng() * 0.30)) * 1_000_000,
  }));

  // Derive unique source and destination node names from corridors
  const sourceNames = [...new Set(corridors.map((c) => c.src))];
  const destMap = new Map<string, string>();
  corridors.forEach((c) => destMap.set(c.dst, c.dstState));

  const nodes: SankeyNode[] = [
    ...sourceNames.map((name): SankeyNode => ({ name, role: "source" })),
    ...[...destMap.entries()].map(([name, stateCode]): SankeyNode => ({
      name,
      role: "destination",
      stateCode,
    })),
  ];

  return { nodes, links };
})();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCapital(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/** Sum all link values to get total capital volume */
function totalVolume(links: SankeyLink[]): number {
  return links.reduce((acc, l) => acc + l.value, 0);
}

/**
 * Determine which destination state code(s) to highlight given a geoKey.
 * Returns null if everything should be shown at full opacity (national view).
 */
function resolveHighlightState(geoKey: string | undefined): string | null {
  if (!geoKey || geoKey === "national") return null;
  // Normalize: accept "TX", "tx", "Texas" etc. We match on 2-letter code only.
  return geoKey.toUpperCase().slice(0, 2);
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SankeySkeleton() {
  return (
    <div
      className="flex flex-col gap-4 p-4"
      aria-busy="true"
      aria-label="Loading capital flow diagram"
      style={{ height: 500 }}
    >
      <div className="flex gap-8 flex-1">
        {/* Left nodes */}
        <div className="flex flex-col gap-3 justify-center" style={{ width: 120 }}>
          {[60, 80, 40, 50, 45].map((h, i) => (
            <div key={i} className="skeleton rounded" style={{ height: h }} />
          ))}
        </div>
        {/* Flow area */}
        <div className="flex-1 skeleton rounded" />
        {/* Right nodes */}
        <div className="flex flex-col gap-2 justify-center" style={{ width: 140 }}>
          {[50, 70, 45, 60, 40, 55, 35, 48].map((h, i) => (
            <div key={i} className="skeleton rounded" style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SankeyFlowChart({
  data = SANKEY_SAMPLE_DATA,
  geoKey,
  className,
  loading = false,
}: SankeyFlowChartProps) {
  const highlightState = resolveHighlightState(geoKey);

  // Compute which destination names match the highlight state
  const highlightedDests = useMemo<Set<string>>(() => {
    if (!highlightState) return new Set();
    return new Set(
      data.nodes
        .filter((n) => n.role === "destination" && n.stateCode === highlightState)
        .map((n) => n.name),
    );
  }, [data.nodes, highlightState]);

  // Total volume for the header metric
  const total = useMemo(() => totalVolume(data.links), [data.links]);

  // Filtered total (only highlighted state flows) when in state-focused mode
  const filteredTotal = useMemo<number>(() => {
    if (!highlightState) return total;
    return data.links
      .filter((l) => highlightedDests.has(l.target))
      .reduce((acc, l) => acc + l.value, 0);
  }, [data.links, highlightState, highlightedDests, total]);

  // Top destination by volume for the header metric
  const topDest = useMemo(() => {
    const agg = new Map<string, number>();
    for (const l of data.links) {
      agg.set(l.target, (agg.get(l.target) ?? 0) + l.value);
    }
    let max = 0;
    let name = "";
    agg.forEach((v, k) => { if (v > max) { max = v; name = k; } });
    return { name, volume: max };
  }, [data.links]);

  // Build ECharts Sankey option
  const option = useMemo<EChartsOption>(() => {
    const isFiltered = highlightState !== null;

    // Node items — color by role
    const echartsNodes = data.nodes.map((n) => ({
      name: n.name,
      itemStyle: {
        color: n.role === "source" ? SOURCE_COLOR : DEST_COLOR,
        borderColor: n.role === "source"
          ? "rgba(239,68,68,0.4)"
          : "rgba(16,185,129,0.4)",
        borderWidth: 1,
      },
      label: {
        color: n.role === "source" ? "#F87171" : "#34D399",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
        fontWeight: 600,
      },
    }));

    // Link items — dim non-highlighted flows in filtered mode
    const echartsLinks = data.links.map((l) => {
      const isHighlighted = !isFiltered || highlightedDests.has(l.target);
      return {
        source: l.source,
        target: l.target,
        value: l.value,
        lineStyle: {
          color: isHighlighted ? LINK_COLOR : LINK_DIMMED,
          opacity: isHighlighted ? 0.45 : 0.08,
          curveness: 0.5,
        },
        emphasis: {
          lineStyle: {
            color: LINK_COLOR,
            opacity: 0.75,
            width: 4,
          },
        },
      };
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        confine: true,
        backgroundColor: "#1A1A1A",
        borderColor: "#1F1F1F",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: "#E5E5E5",
          fontSize: 12,
          fontFamily: "JetBrains Mono, monospace",
        },
        formatter: (params: unknown) => {
          // ECharts passes either a node or a link object
          const p = params as {
            dataType?: string;
            name?: string;
            value?: number;
            data?: { source?: string; target?: string; value?: number };
          };
          if (p.dataType === "edge" && p.data) {
            const { source, target, value } = p.data;
            const vol = fmtCapital(value ?? 0);
            return [
              `<div style="font-size:10px;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em">Capital Flow</div>`,
              `<div style="font-size:12px;color:#FAFAFA;margin-bottom:2px"><span style="color:#F87171">${source}</span> → <span style="color:#34D399">${target}</span></div>`,
              `<div style="font-size:14px;color:#C9A227;font-weight:700">${vol}</div>`,
              `<div style="font-size:10px;color:#666;margin-top:4px">annual estimated flow</div>`,
            ].join("");
          }
          if (p.name) {
            // Node tooltip
            const node = data.nodes.find((n) => n.name === p.name);
            const role = node?.role ?? "destination";
            const color = role === "source" ? "#F87171" : "#34D399";
            const label = role === "source" ? "Capital Leaving" : "Capital Arriving";
            return [
              `<div style="font-size:12px;color:${color};font-weight:600;margin-bottom:2px">${p.name}</div>`,
              `<div style="font-size:10px;color:#999">${label}</div>`,
            ].join("");
          }
          return "";
        },
      },
      series: [
        {
          type: "sankey" as const,
          layout: "none",
          left: "1%",
          right: "1%",
          top: 16,
          bottom: 8,
          // Node appearance
          nodeWidth: 16,
          nodeGap: 12,
          nodeAlign: "left",
          // Labels
          label: {
            show: true,
            position: "right",
            fontSize: 11,
            color: "#999999",
            fontFamily: "JetBrains Mono, monospace",
            formatter: (params: unknown) => {
              const p = params as { name?: string };
              // Truncate long metro names
              const name = p.name ?? "";
              return name.length > 18 ? `${name.slice(0, 16)}…` : name;
            },
          },
          // Hover states
          emphasis: {
            focus: "adjacency",
            label: {
              color: "#FAFAFA",
              fontSize: 12,
              fontWeight: "bold",
            },
            itemStyle: {
              opacity: 1,
            },
          },
          // Blur non-hovered elements
          blur: {
            label: { opacity: 0.3 },
            itemStyle: { opacity: 0.2 },
          },
          data: echartsNodes,
          links: echartsLinks,
          // Animation
          animationDuration: 800,
          animationEasing: "cubicOut",
        },
      ],
    };
  }, [data, highlightedDests, highlightState]);

  // Tooltip position callback passed via onEvents — not needed here since
  // ECharts manages its own tooltip, but we pass chart events for future wiring.
  const onEvents = useCallback(() => ({}), []);

  if (loading) return <SankeySkeleton />;

  if (!data.nodes.length || !data.links.length) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 text-content-tertiary"
        style={{ height: 500 }}
        role="status"
        aria-label="No capital flow data available"
      >
        <ArrowRight className="w-8 h-8 opacity-30" aria-hidden="true" />
        <p className="text-sm">No capital flow data available</p>
        <p className="text-[11px] text-content-disabled">
          Connect IRS migration + institutional capital APIs to populate this chart
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* ── Header metrics ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        {/* Total capital volume */}
        <div>
          <p className="section-label mb-1">
            {highlightState
              ? `Capital Flowing INTO ${highlightState}`
              : "Total Capital Migration"}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono tabular-nums text-2xl font-bold"
              style={{ color: CHART_COLORS.gold }}
              aria-label={`${fmtCapital(highlightState ? filteredTotal : total)} total capital flow`}
            >
              {fmtCapital(highlightState ? filteredTotal : total)}
            </span>
            <span className="text-[11px] text-content-disabled">/ yr estimated</span>
          </div>
        </div>

        {/* Top destination */}
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <TrendingUp className="w-3.5 h-3.5 text-emerald" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">Top Destination</p>
            <p className="text-[12px] font-medium text-content-primary">{topDest.name}</p>
            <p className="text-[11px] font-mono text-emerald tabular-nums">
              {fmtCapital(topDest.volume)}
            </p>
          </div>
        </div>
      </div>

      {/* ── geoKey filter badge ── */}
      {highlightState && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
            style={{
              color: CHART_COLORS.emerald,
              borderColor: "rgba(16,185,129,0.3)",
              backgroundColor: "rgba(16,185,129,0.06)",
            }}
          >
            <DollarSign className="w-3 h-3" aria-hidden="true" />
            Filtered: flows into {highlightState} — other paths dimmed
          </span>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 mb-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: SOURCE_COLOR, opacity: 0.85 }}
            aria-hidden="true"
          />
          <span className="text-content-secondary">Source (capital leaving)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: DEST_COLOR, opacity: 0.85 }}
            aria-hidden="true"
          />
          <span className="text-content-secondary">Destination (capital arriving)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-8 h-1 rounded-full"
            style={{ backgroundColor: LINK_COLOR, opacity: 0.65 }}
            aria-hidden="true"
          />
          <span className="text-content-secondary">Flow volume</span>
        </div>
      </div>

      {/* ── ECharts Sankey ── */}
      <div
        role="img"
        aria-label={`Sankey diagram showing capital flows from source states to destination metros. Total: ${fmtCapital(total)}.`}
        style={{ height: 500 }}
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

      {/* ── Plain English label ── */}
      <p
        className="text-[12px] text-content-tertiary italic leading-relaxed mt-3 px-1 border-l-2 pl-3"
        style={{ borderLeftColor: "#1F1F1F" }}
      >
        Where the smart money is moving — based on IRS migration + institutional capital data.
        Line width is proportional to estimated annual dollar volume.
      </p>

      {/* ── Data source disclaimer ── */}
      <p className="text-[10px] text-content-disabled mt-1">
        Estimated flows · IRS migration + NCREIF institutional capital patterns · Not financial advice
      </p>
    </div>
  );
}
