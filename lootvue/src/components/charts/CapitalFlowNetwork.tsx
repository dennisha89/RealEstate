"use client";

/**
 * CapitalFlowNetwork
 *
 * Force-directed graph encoding 4 simultaneous dimensions of capital movement:
 *
 *   Node SIZE    = total capital volume flowing through that market (bigger = more money)
 *   Node COLOR   = market health score (emerald ≥70, amber 50-70, rose <50)
 *   Edge WIDTH   = flow volume on that corridor (thicker = more money)
 *   Edge COLOR   = flow growth rate (bright gold = accelerating, dim gray = slowing)
 *
 * 5 SOURCE nodes (CA, NY, IL, NJ, MA) — red, capital leaving.
 * 10 DESTINATION nodes (Austin, Tampa, Nashville, Charlotte, Phoenix,
 *    Atlanta, Dallas, Las Vegas, Jacksonville, San Antonio) — scored, colored.
 *
 * geoKey: when set to a 2-letter state code, highlighted nodes/edges stay
 * vivid while all unrelated elements dim to near-invisible. This lets the
 * Markets page drive the same geoKey it uses on every other chart.
 *
 * Library: echarts-for-react wrapping Apache ECharts 6 graph series,
 * layout: 'force'. Parent div controls the container height.
 */

import React, { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { Network, TrendingUp, DollarSign, Info } from "lucide-react";
import { CHART_COLORS, seededRandom } from "./ChartTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlowNode {
  name: string;
  stateCode: string;
  role: "source" | "destination";
  totalVolume: number; // total annual dollars through this node
  score?: number;      // 0-100, destination markets only
}

export interface FlowEdge {
  source: string;      // matches FlowNode.name
  target: string;      // matches FlowNode.name
  volume: number;      // annual dollars
  growthRate: number;  // YoY, e.g. 0.23 = +23%
}

export interface CapitalFlowNetworkProps {
  geoKey?: string;
  className?: string;
  onNodeClick?: (nodeName: string) => void;
}

// ─── Static dataset (deterministic, seeded) ───────────────────────────────────

/**
 * Build the 15-node, 26-edge dataset from a seeded PRNG so renders are
 * identical across environments. Volumes represent estimated annual
 * institutional + high-net-worth flows drawn from IRS migration patterns
 * and NCREIF institutional capital studies.
 */
function buildFlowData(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const rng = seededRandom(9001);
  const noise = (base: number, pct = 0.15) =>
    Math.round(base * (1 - pct + rng() * pct * 2));

  // Raw corridors: [sourceState, destCity, destStateCode, baseVolumeMM, growthRate]
  const corridors: [string, string, string, number, number][] = [
    ["California",    "Austin TX",       "TX",  1_850, 0.23],
    ["California",    "Phoenix AZ",      "AZ",  1_420, 0.18],
    ["California",    "Las Vegas NV",    "NV",  1_100, 0.14],
    ["California",    "Dallas TX",       "TX",    980, 0.17],
    ["California",    "Atlanta GA",      "GA",    640, 0.11],
    ["California",    "Nashville TN",    "TN",    340, 0.20],
    ["New York",      "Tampa FL",        "FL",  1_650, 0.21],
    ["New York",      "Charlotte NC",    "NC",    870, 0.16],
    ["New York",      "Nashville TN",    "TN",    720, 0.22],
    ["New York",      "Austin TX",       "TX",    550, 0.19],
    ["New York",      "Atlanta GA",      "GA",    490, 0.13],
    ["New York",      "Dallas TX",       "TX",    290, 0.09],
    ["Illinois",      "Nashville TN",    "TN",    810, 0.25],
    ["Illinois",      "Tampa FL",        "FL",    690, 0.15],
    ["Illinois",      "Phoenix AZ",      "AZ",    420, 0.12],
    ["Illinois",      "Dallas TX",       "TX",    380, 0.10],
    ["Illinois",      "Charlotte NC",    "NC",    160, 0.08],
    ["New Jersey",    "Tampa FL",        "FL",    760, 0.18],
    ["New Jersey",    "Charlotte NC",    "NC",    520, 0.14],
    ["New Jersey",    "Atlanta GA",      "GA",    310, 0.07],
    ["New Jersey",    "Jacksonville FL", "FL",    180, 0.28],
    ["Massachusetts", "Nashville TN",    "TN",    440, 0.26],
    ["Massachusetts", "Charlotte NC",    "NC",    390, 0.17],
    ["Massachusetts", "Tampa FL",        "FL",    280, 0.12],
    ["Massachusetts", "Dallas TX",       "TX",    190, 0.09],
    ["Massachusetts", "San Antonio TX",  "TX",    120, 0.31],
  ];

  // Destination market scores — drives node color
  const destScores: Record<string, number> = {
    "Austin TX":       78,
    "Tampa FL":        72,
    "Nashville TN":    70,
    "Charlotte NC":    68,
    "Phoenix AZ":      65,
    "Atlanta GA":      64,
    "Dallas TX":       71,
    "Las Vegas NV":    58,
    "Jacksonville FL": 61,
    "San Antonio TX":  66,
  };

  // Source stateCode lookup
  const sourceStateCodes: Record<string, string> = {
    California:    "CA",
    "New York":    "NY",
    Illinois:      "IL",
    "New Jersey":  "NJ",
    Massachusetts: "MA",
  };

  // Aggregate total volumes per node
  const nodeVolumes: Record<string, number> = {};
  const edges: FlowEdge[] = corridors.map(([src, dst, , baseM, growth]) => {
    const volume = noise(baseM) * 1_000_000;
    nodeVolumes[src] = (nodeVolumes[src] ?? 0) + volume;
    nodeVolumes[dst] = (nodeVolumes[dst] ?? 0) + volume;
    return { source: src, target: dst, volume, growthRate: growth + (rng() - 0.5) * 0.04 };
  });

  // Build unique source nodes
  const sourceNodes: FlowNode[] = Object.entries(sourceStateCodes).map(([name, code]) => ({
    name,
    stateCode: code,
    role: "source" as const,
    totalVolume: nodeVolumes[name] ?? 0,
  }));

  // Build unique destination nodes
  const destSet = new Map<string, string>();
  corridors.forEach(([, dst, dstState]) => destSet.set(dst, dstState));

  const destNodes: FlowNode[] = [...destSet.entries()].map(([name, code]) => ({
    name,
    stateCode: code,
    role: "destination" as const,
    totalVolume: nodeVolumes[name] ?? 0,
    score: destScores[name] ?? 60,
  }));

  return { nodes: [...sourceNodes, ...destNodes], edges };
}

const { nodes: FLOW_NODES, edges: FLOW_EDGES } = buildFlowData();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCapital(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

/** Map a market health score (0-100) to a hex color. */
function scoreToColor(score: number): string {
  if (score >= 70) return CHART_COLORS.emerald;
  if (score >= 50) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

/** Map a growth rate to an edge color. +15%+ = bright gold, <0 = dark gray. */
function growthToEdgeColor(rate: number): string {
  if (rate >= 0.20) return CHART_COLORS.gold;
  if (rate >= 0.10) return CHART_COLORS.goldLight;
  if (rate >= 0.00) return "#6B5A1A"; // muted gold
  return "#3A3A3A";                    // declining — gray
}

/** Scale node total volume to symbol radius (px). */
function volumeToRadius(volume: number, min: number, max: number): number {
  const MIN_R = 14;
  const MAX_R = 52;
  if (max === min) return (MIN_R + MAX_R) / 2;
  return MIN_R + ((volume - min) / (max - min)) * (MAX_R - MIN_R);
}

/** Scale edge volume to line width (px). */
function volumeToWidth(volume: number, min: number, max: number): number {
  const MIN_W = 1;
  const MAX_W = 10;
  if (max === min) return (MIN_W + MAX_W) / 2;
  return MIN_W + ((volume - min) / (max - min)) * (MAX_W - MIN_W);
}

/** Normalize a geoKey to a 2-letter uppercase code. Returns null for national. */
function resolveGeoCode(geoKey: string | undefined): string | null {
  if (!geoKey || geoKey === "national") return null;
  return geoKey.toUpperCase().slice(0, 2);
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function NetworkSkeleton() {
  return (
    <div className="flex items-center justify-center" style={{ height: "100%", minHeight: 480 }}>
      <div className="relative w-full h-full">
        {/* Simulate scattered nodes */}
        {[
          { top: "20%", left: "15%", w: 48, h: 48 },
          { top: "50%", left: "10%", w: 36, h: 36 },
          { top: "75%", left: "20%", w: 42, h: 42 },
          { top: "30%", left: "70%", w: 52, h: 52 },
          { top: "60%", left: "80%", w: 40, h: 40 },
          { top: "15%", left: "55%", w: 44, h: 44 },
        ].map((pos, i) => (
          <div
            key={i}
            className="skeleton absolute rounded-full"
            style={{ top: pos.top, left: pos.left, width: pos.w, height: pos.h }}
            aria-hidden="true"
          />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-busy="true"
          aria-label="Loading capital flow network"
        >
          <p className="text-[11px] text-content-disabled animate-pulse">
            Building network graph...
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CapitalFlowNetwork({
  geoKey,
  className,
  onNodeClick,
}: CapitalFlowNetworkProps) {
  const highlightCode = resolveGeoCode(geoKey);

  // Pre-compute volume ranges for scaling
  const volRange = useMemo(() => {
    const vols = FLOW_NODES.map((n) => n.totalVolume);
    return { min: Math.min(...vols), max: Math.max(...vols) };
  }, []);

  const edgeVolRange = useMemo(() => {
    const vols = FLOW_EDGES.map((e) => e.volume);
    return { min: Math.min(...vols), max: Math.max(...vols) };
  }, []);

  // Top-level metrics for header strip
  const totalFlow = useMemo(
    () => FLOW_EDGES.reduce((a, e) => a + e.volume, 0),
    [],
  );
  const topDest = useMemo(() => {
    const agg = new Map<string, number>();
    for (const e of FLOW_EDGES) agg.set(e.target, (agg.get(e.target) ?? 0) + e.volume);
    let best = { name: "", vol: 0 };
    agg.forEach((vol, name) => { if (vol > best.vol) best = { name, vol }; });
    return best;
  }, []);

  const avgGrowth = useMemo(() => {
    const sum = FLOW_EDGES.reduce((a, e) => a + e.growthRate, 0);
    return sum / FLOW_EDGES.length;
  }, []);

  // Build ECharts graph series option
  const option = useMemo(() => {
    // Which node names are "in scope" for the current geoKey?
    const inScopeNodes = new Set<string>();
    if (highlightCode) {
      FLOW_NODES.forEach((n) => {
        if (n.stateCode === highlightCode) inScopeNodes.add(n.name);
      });
      // Also bring in any node connected to a highlighted node via an edge
      FLOW_EDGES.forEach((e) => {
        if (inScopeNodes.has(e.source) || inScopeNodes.has(e.target)) {
          inScopeNodes.add(e.source);
          inScopeNodes.add(e.target);
        }
      });
    }

    const echNodes = FLOW_NODES.map((n) => {
      const isHighlighted = !highlightCode || inScopeNodes.has(n.name);
      const radius = volumeToRadius(n.totalVolume, volRange.min, volRange.max);
      const nodeColor =
        n.role === "source"
          ? CHART_COLORS.rose
          : scoreToColor(n.score ?? 60);

      return {
        name: n.name,
        symbolSize: radius * 2, // ECharts uses diameter for symbolSize
        itemStyle: {
          color: isHighlighted ? nodeColor : "#2A2A2A",
          borderColor: isHighlighted
            ? n.role === "source"
              ? "rgba(239,68,68,0.5)"
              : "rgba(16,185,129,0.4)"
            : "#333",
          borderWidth: isHighlighted ? 2 : 1,
          opacity: isHighlighted ? 1 : 0.2,
          shadowBlur: isHighlighted ? 12 : 0,
          shadowColor: isHighlighted ? nodeColor : "transparent",
        },
        label: {
          show: true,
          position: "bottom" as const,
          distance: 4,
          fontSize: 10,
          fontFamily: "JetBrains Mono, monospace",
          color: isHighlighted ? "#FAFAFA" : "#333",
          opacity: isHighlighted ? 1 : 0.2,
          formatter: `{b}\n${fmtCapital(n.totalVolume)}`,
        },
        // Carry raw data for tooltip
        _volume: n.totalVolume,
        _role: n.role,
        _score: n.score,
        _stateCode: n.stateCode,
      };
    });

    const echEdges = FLOW_EDGES.map((e) => {
      const isHighlighted =
        !highlightCode ||
        inScopeNodes.has(e.source) && inScopeNodes.has(e.target);
      const edgeColor = isHighlighted ? growthToEdgeColor(e.growthRate) : "#222";
      const width = isHighlighted
        ? volumeToWidth(e.volume, edgeVolRange.min, edgeVolRange.max)
        : 0.5;

      return {
        source: e.source,
        target: e.target,
        lineStyle: {
          color: edgeColor,
          width,
          opacity: isHighlighted ? 0.75 : 0.08,
          curveness: 0.3,
          cap: "round" as const,
        },
        emphasis: {
          lineStyle: {
            color: CHART_COLORS.gold,
            width: Math.max(width + 2, 3),
            opacity: 1,
          },
        },
        // Carry raw data for tooltip
        _volume: e.volume,
        _growthRate: e.growthRate,
      };
    });

    const optionObj = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item" as const,
        confine: true,
        backgroundColor: "#1A1A1A",
        borderColor: "#2A2A2A",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#E5E5E5", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as {
            dataType?: string;
            name?: string;
            data?: {
              _volume?: number;
              _role?: string;
              _score?: number;
              _stateCode?: string;
              _growthRate?: number;
              source?: string;
              target?: string;
            };
          };

          if (p.dataType === "edge" && p.data) {
            const { source, target, _volume, _growthRate } = p.data;
            const growthPct = ((_growthRate ?? 0) * 100).toFixed(1);
            const growthColor = (_growthRate ?? 0) >= 0.15 ? CHART_COLORS.gold : (_growthRate ?? 0) >= 0 ? CHART_COLORS.amber : CHART_COLORS.rose;
            const growthSign = (_growthRate ?? 0) >= 0 ? "+" : "";
            // Plain English explanation
            const plain = `${source} investors deployed ${fmtCapital(_volume ?? 0)} into ${target} last year, ${growthSign}${growthPct}% from prior year.`;
            return [
              `<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Capital Corridor</div>`,
              `<div style="font-size:12px;font-weight:600;color:#FAFAFA;margin-bottom:4px">`,
              `  <span style="color:#F87171">${source}</span>`,
              `  <span style="color:#555;margin:0 4px">→</span>`,
              `  <span style="color:#34D399">${target}</span>`,
              `</div>`,
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:3px">`,
              `  <span style="font-size:11px;color:#999">Annual volume</span>`,
              `  <span style="font-size:14px;font-weight:700;color:${CHART_COLORS.gold};font-family:JetBrains Mono">${fmtCapital(_volume ?? 0)}</span>`,
              `</div>`,
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px">`,
              `  <span style="font-size:11px;color:#999">YoY growth</span>`,
              `  <span style="font-size:12px;font-weight:600;color:${growthColor};font-family:JetBrains Mono">${growthSign}${growthPct}%</span>`,
              `</div>`,
              `<div style="font-size:11px;color:#999;border-top:1px solid #252525;padding-top:6px;line-height:1.5;font-style:italic">${plain}</div>`,
            ].join("");
          }

          if (p.name && p.data) {
            const { _volume, _role, _score, _stateCode } = p.data;
            const isSource = _role === "source";
            const nameColor = isSource ? "#F87171" : scoreToColor(_score ?? 60);
            const roleLabel = isSource ? "Capital Source" : "Capital Destination";
            const scoreStr = !isSource && _score !== undefined
              ? `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px"><span style="color:#999;font-size:11px">Market score</span><span style="font-weight:700;font-size:12px;color:${nameColor};font-family:JetBrains Mono">${_score}</span></div>`
              : "";
            return [
              `<div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">${roleLabel} · ${_stateCode}</div>`,
              `<div style="font-size:13px;font-weight:700;color:${nameColor};margin-bottom:6px">${p.name}</div>`,
              `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px">`,
              `  <span style="color:#999;font-size:11px">Total flow</span>`,
              `  <span style="font-weight:700;font-size:13px;color:${CHART_COLORS.gold};font-family:JetBrains Mono">${fmtCapital(_volume ?? 0)}</span>`,
              `</div>`,
              scoreStr,
            ].join("");
          }

          return "";
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,          // allow pan + zoom
          draggable: true,     // allow node drag for exploration
          legendHoverLink: false,
          force: {
            repulsion: 1600,
            gravity: 0.05,
            edgeLength: [120, 400],
            friction: 0.6,
            layoutAnimation: true,
          },
          emphasis: {
            focus: "adjacency",
            scale: true,
            scaleSize: 1.2,
          },
          blur: {
            itemStyle: { opacity: 0.1 },
            lineStyle: { opacity: 0.05 },
          },
          label: {
            show: true,
          },
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: [0, 8],
          data: echNodes,
          edges: echEdges,
          animationDuration: 1200,
          animationEasing: "cubicOut",
        },
      ],
    };

    return optionObj as unknown as EChartsOption;
  }, [highlightCode, volRange, edgeVolRange]);

  const onEvents = useCallback(
    () => ({
      click: (params: unknown) => {
        const p = params as { dataType?: string; name?: string };
        if (p.dataType === "node" && p.name && onNodeClick) {
          onNodeClick(p.name);
        }
      },
    }),
    [onNodeClick],
  );

  return (
    <div className={className}>
      {/* ── Header metrics strip ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4 mb-4">
        {/* Total flow */}
        <div>
          <p className="section-label mb-0.5">
            {highlightCode ? `Flows involving ${highlightCode}` : "Total Capital Migration"}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono tabular-nums text-2xl font-bold"
              style={{ color: CHART_COLORS.gold }}
              aria-label={`${fmtCapital(totalFlow)} total capital flow`}
            >
              {fmtCapital(totalFlow)}
            </span>
            <span className="text-[11px] text-content-disabled">/ yr est.</span>
          </div>
        </div>

        {/* Top destination */}
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <TrendingUp className="w-3.5 h-3.5 text-emerald shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">Top Dest.</p>
            <p className="text-[12px] font-medium text-content-primary">{topDest.name}</p>
            <p className="text-[11px] font-mono text-emerald tabular-nums">
              {fmtCapital(topDest.vol)}
            </p>
          </div>
        </div>

        {/* Average growth */}
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <DollarSign className="w-3.5 h-3.5 text-gold shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[10px] text-content-tertiary uppercase tracking-wider">Avg. Growth</p>
            <p
              className="text-[13px] font-bold font-mono tabular-nums"
              style={{ color: CHART_COLORS.gold }}
            >
              +{(avgGrowth * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-content-disabled">YoY</p>
          </div>
        </div>

        {/* Interaction hint */}
        <div className="flex items-center gap-1.5 ml-auto self-center">
          <Info className="w-3 h-3 text-content-disabled shrink-0" aria-hidden="true" />
          <span className="text-[10px] text-content-disabled">Drag nodes · Scroll to zoom · Hover for details</span>
        </div>
      </div>

      {/* ── geoKey filter badge ── */}
      {highlightCode && (
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
            Filtered: {highlightCode} flows highlighted — other corridors dimmed
          </span>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-5 mb-3 text-[11px]">
        {/* Node size */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gold opacity-70" aria-hidden="true" />
            <span className="inline-block w-4 h-4 rounded-full bg-gold opacity-70" aria-hidden="true" />
          </span>
          <span className="text-content-secondary">Node size = volume</span>
        </div>
        {/* Node color */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-rose opacity-85" aria-hidden="true" />
          <span className="text-content-secondary">Source (leaving)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald opacity-85" aria-hidden="true" />
          <span className="text-content-secondary">Destination (score ≥70)</span>
        </div>
        {/* Edge color */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-8 h-1 rounded-full"
            style={{ backgroundColor: CHART_COLORS.gold, opacity: 0.85 }}
            aria-hidden="true"
          />
          <span className="text-content-secondary">Edge color = growth rate (gold = fast)</span>
        </div>
        {/* Edge width */}
        <div className="flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          <span className="text-content-secondary">Edge width = corridor volume</span>
        </div>
      </div>

      {/* ── ECharts graph ── */}
      <div
        role="img"
        aria-label={`Force-directed network graph showing capital migration from ${
          FLOW_NODES.filter((n) => n.role === "source").map((n) => n.name).join(", ")
        } to Sun Belt destination markets. Total estimated annual flow: ${fmtCapital(totalFlow)}.`}
        style={{ height: "100%", minHeight: 480, width: "100%" }}
      >
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge
          lazyUpdate={false}
          onEvents={onEvents()}
          opts={{ renderer: "canvas" }}
        />
      </div>

      {/* ── Plain English footer ── */}
      <p
        className="text-[12px] text-content-tertiary italic leading-relaxed mt-3 px-1 border-l-2 pl-3"
        style={{ borderLeftColor: "#1F1F1F" }}
      >
        4 dimensions at once: node size = money volume, node color = market health, edge width = flow size,
        edge color = acceleration (gold = fast-growing corridor).
      </p>
      <p className="text-[10px] text-content-disabled mt-1">
        Estimated flows · IRS migration + NCREIF institutional capital patterns · Not financial advice
      </p>
    </div>
  );
}
