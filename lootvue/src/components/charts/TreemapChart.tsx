"use client";

/**
 * TreemapChart — Capital Volume Treemap
 *
 * Visualizes where institutional capital is flowing by metro market.
 * Rectangle SIZE  = total capital volume (investment dollars)
 * Rectangle COLOR = market health score (emerald ≥70, amber 50-70, rose <50)
 *
 * Hierarchical: national view shows state blocks; clicking a state drills
 * into cities within that state. The geoKey prop drives which level renders.
 *
 * Built on ECharts treemap series via echarts-for-react. All colors follow
 * the LootVue dark theme — no white backgrounds anywhere.
 */

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { CHART_COLORS } from "./ChartTheme";

// ─── Score → Color ────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return CHART_COLORS.emerald;
  if (score >= 50) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

/** Semi-transparent fill derived from the score color */
function scoreFill(score: number, alpha = 0.55): string {
  if (score >= 70) return `rgba(16,185,129,${alpha})`;
  if (score >= 50) return `rgba(245,158,11,${alpha})`;
  return `rgba(239,68,68,${alpha})`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TreemapMarket {
  name: string;
  capitalVolume: number; // raw dollars
  score: number;        // 0-100
  children?: TreemapMarket[];
}

export interface TreemapChartProps {
  /** "national" shows state-level blocks; a state code (e.g. "TX") shows cities */
  geoKey?: string;
  className?: string;
  onSelect?: (market: string) => void;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

/**
 * Deterministic sample data covering 15 states with 3-5 cities each.
 * Capital volumes are in raw dollars. Replace with real API data in production.
 */
export const TREEMAP_SAMPLE_DATA: TreemapMarket[] = [
  {
    name: "TX",
    capitalVolume: 48_200_000_000,
    score: 76,
    children: [
      { name: "Austin", capitalVolume: 18_400_000_000, score: 81 },
      { name: "Dallas", capitalVolume: 14_200_000_000, score: 74 },
      { name: "Houston", capitalVolume: 9_800_000_000, score: 68 },
      { name: "San Antonio", capitalVolume: 3_900_000_000, score: 71 },
      { name: "Fort Worth", capitalVolume: 1_900_000_000, score: 65 },
    ],
  },
  {
    name: "FL",
    capitalVolume: 41_500_000_000,
    score: 72,
    children: [
      { name: "Miami", capitalVolume: 16_800_000_000, score: 69 },
      { name: "Tampa", capitalVolume: 11_200_000_000, score: 74 },
      { name: "Orlando", capitalVolume: 8_700_000_000, score: 77 },
      { name: "Jacksonville", capitalVolume: 3_200_000_000, score: 66 },
      { name: "Fort Lauderdale", capitalVolume: 1_600_000_000, score: 63 },
    ],
  },
  {
    name: "CA",
    capitalVolume: 38_900_000_000,
    score: 54,
    children: [
      { name: "Los Angeles", capitalVolume: 16_400_000_000, score: 51 },
      { name: "San Francisco", capitalVolume: 10_200_000_000, score: 48 },
      { name: "San Diego", capitalVolume: 7_300_000_000, score: 58 },
      { name: "Sacramento", capitalVolume: 3_100_000_000, score: 62 },
      { name: "San Jose", capitalVolume: 1_900_000_000, score: 55 },
    ],
  },
  {
    name: "AZ",
    capitalVolume: 22_100_000_000,
    score: 68,
    children: [
      { name: "Phoenix", capitalVolume: 14_800_000_000, score: 66 },
      { name: "Scottsdale", capitalVolume: 5_400_000_000, score: 73 },
      { name: "Tucson", capitalVolume: 1_900_000_000, score: 61 },
    ],
  },
  {
    name: "NC",
    capitalVolume: 19_400_000_000,
    score: 79,
    children: [
      { name: "Raleigh", capitalVolume: 10_200_000_000, score: 83 },
      { name: "Charlotte", capitalVolume: 6_800_000_000, score: 77 },
      { name: "Durham", capitalVolume: 1_700_000_000, score: 75 },
      { name: "Greensboro", capitalVolume: 700_000_000, score: 68 },
    ],
  },
  {
    name: "GA",
    capitalVolume: 17_800_000_000,
    score: 71,
    children: [
      { name: "Atlanta", capitalVolume: 14_200_000_000, score: 73 },
      { name: "Savannah", capitalVolume: 2_100_000_000, score: 67 },
      { name: "Augusta", capitalVolume: 1_500_000_000, score: 64 },
    ],
  },
  {
    name: "TN",
    capitalVolume: 15_300_000_000,
    score: 74,
    children: [
      { name: "Nashville", capitalVolume: 11_800_000_000, score: 78 },
      { name: "Memphis", capitalVolume: 2_400_000_000, score: 62 },
      { name: "Knoxville", capitalVolume: 1_100_000_000, score: 69 },
    ],
  },
  {
    name: "CO",
    capitalVolume: 14_700_000_000,
    score: 58,
    children: [
      { name: "Denver", capitalVolume: 10_400_000_000, score: 57 },
      { name: "Boulder", capitalVolume: 2_800_000_000, score: 61 },
      { name: "Colorado Springs", capitalVolume: 1_500_000_000, score: 55 },
    ],
  },
  {
    name: "OH",
    capitalVolume: 13_200_000_000,
    score: 66,
    children: [
      { name: "Columbus", capitalVolume: 7_800_000_000, score: 71 },
      { name: "Cleveland", capitalVolume: 3_200_000_000, score: 58 },
      { name: "Cincinnati", capitalVolume: 2_200_000_000, score: 65 },
    ],
  },
  {
    name: "WA",
    capitalVolume: 12_900_000_000,
    score: 61,
    children: [
      { name: "Seattle", capitalVolume: 9_600_000_000, score: 60 },
      { name: "Bellevue", capitalVolume: 2_200_000_000, score: 65 },
      { name: "Spokane", capitalVolume: 1_100_000_000, score: 59 },
    ],
  },
  {
    name: "NV",
    capitalVolume: 11_400_000_000,
    score: 63,
    children: [
      { name: "Las Vegas", capitalVolume: 8_900_000_000, score: 61 },
      { name: "Henderson", capitalVolume: 1_800_000_000, score: 67 },
      { name: "Reno", capitalVolume: 700_000_000, score: 63 },
    ],
  },
  {
    name: "IN",
    capitalVolume: 9_800_000_000,
    score: 70,
    children: [
      { name: "Indianapolis", capitalVolume: 7_400_000_000, score: 72 },
      { name: "Fort Wayne", capitalVolume: 1_500_000_000, score: 66 },
      { name: "Carmel", capitalVolume: 900_000_000, score: 71 },
    ],
  },
  {
    name: "MN",
    capitalVolume: 8_600_000_000,
    score: 62,
    children: [
      { name: "Minneapolis", capitalVolume: 6_200_000_000, score: 63 },
      { name: "St. Paul", capitalVolume: 1_800_000_000, score: 60 },
      { name: "Rochester", capitalVolume: 600_000_000, score: 66 },
    ],
  },
  {
    name: "PA",
    capitalVolume: 7_900_000_000,
    score: 46,
    children: [
      { name: "Philadelphia", capitalVolume: 4_800_000_000, score: 44 },
      { name: "Pittsburgh", capitalVolume: 2_400_000_000, score: 49 },
      { name: "Allentown", capitalVolume: 700_000_000, score: 47 },
    ],
  },
  {
    name: "SC",
    capitalVolume: 6_400_000_000,
    score: 73,
    children: [
      { name: "Charleston", capitalVolume: 3_800_000_000, score: 78 },
      { name: "Columbia", capitalVolume: 1_700_000_000, score: 68 },
      { name: "Greenville", capitalVolume: 900_000_000, score: 72 },
    ],
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmtCapital(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

function fmtCapitalLong(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);
}

// ─── ECharts Node Type ────────────────────────────────────────────────────────

interface EChartsTreeNode {
  name: string;
  value: number;
  score: number;
  rawVolume: number;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
    gapWidth: number;
  };
  label: {
    color: string;
    fontFamily: string;
  };
  children?: EChartsTreeNode[];
}

// ─── Option Builder ───────────────────────────────────────────────────────────

function buildOption(
  data: TreemapMarket[],
  totalCapital: number,
  _onSelect?: (market: string) => void,
) {
  /**
   * ECharts treemap data contract:
   *   - name: string           display label
   *   - value: number          determines rectangle size
   *   - itemStyle.color        fill color
   *   - children?: []          sub-nodes for drill-down
   *
   * We store score and rawVolume in each node so the tooltip formatter
   * can read them back via params.data.
   */
  const toEChartsNode = (market: TreemapMarket): EChartsTreeNode => ({
    name: market.name,
    value: market.capitalVolume,
    score: market.score,
    rawVolume: market.capitalVolume,
    itemStyle: {
      color: scoreFill(market.score, 0.60),
      borderColor: scoreColor(market.score),
      borderWidth: 1.5,
      gapWidth: 2,
    },
    label: {
      color: "#E5E5E5",
      fontFamily: "Inter, sans-serif",
    },
    children: market.children?.map(toEChartsNode),
  });

  const nodes = data.map(toEChartsNode);

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
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
      formatter: (params: {
        name: string;
        value: number;
        data: { score?: number; rawVolume?: number };
        treePathInfo?: Array<{ name: string; value: number }>;
      }) => {
        const score = params.data.score ?? 0;
        const vol = params.data.rawVolume ?? params.value;
        const pct = totalCapital > 0
          ? ((vol / totalCapital) * 100).toFixed(1)
          : "0.0";
        const color = scoreColor(score);
        const scoreLabel =
          score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Weak";

        return [
          `<span style="font-size:13px;font-weight:600;color:#FAFAFA">${params.name}</span>`,
          `<hr style="border:none;border-top:1px solid #2A2A2A;margin:6px 0"/>`,
          `<span style="color:#666">Capital Volume:</span> <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#E5E5E5">${fmtCapitalLong(vol)}</span>`,
          `<br/><span style="color:#666">Market Score:</span> <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${color}">${score} — ${scoreLabel}</span>`,
          `<br/><span style="color:#666">% of Total Capital:</span> <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#E5E5E5">${pct}%</span>`,
        ].join("");
      },
    },
    series: [
      {
        type: "treemap",
        data: nodes,
        // Breadcrumb — shows current drill level
        breadcrumb: {
          show: true,
          bottom: 0,
          left: "center",
          height: 28,
          emptyItemWidth: 25,
          itemStyle: {
            color: "#1A1A1A",
            borderColor: "#1F1F1F",
            borderWidth: 1,
            textStyle: {
              color: "#999",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
            },
          },
          emphasis: {
            itemStyle: {
              color: "#252525",
              textStyle: { color: CHART_COLORS.gold },
            },
          },
        },
        // Animate drill-down transitions
        animation: true,
        animationDuration: 300,
        animationEasing: "cubicInOut",
        // visibleMin prevents tiny slivers from rendering
        visibleMin: 300,
        // How labels appear at each level
        levels: [
          // Level 0 — state blocks
          {
            itemStyle: {
              borderWidth: 2,
              borderColor: "#0A0A0A",
              gapWidth: 3,
            },
            upperLabel: {
              show: false,
            },
            label: {
              show: true,
              position: "insideTopLeft",
              padding: [6, 8],
              formatter: (params: { name: string; value: number; data: { score?: number } }) => {
                const score = params.data.score ?? 0;
                const vol = fmtCapital(params.value);
                return `{name|${params.name}}\n{vol|${vol}}\n{score|Score ${score}}`;
              },
              rich: {
                name: {
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#FAFAFA",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  lineHeight: 18,
                },
                vol: {
                  fontSize: 11,
                  color: "#C9A227",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 16,
                },
                score: {
                  fontSize: 10,
                  color: "#999",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 15,
                },
              },
            },
          },
          // Level 1 — city blocks inside a state
          {
            itemStyle: {
              borderWidth: 1,
              borderColor: "#0A0A0A",
              gapWidth: 2,
            },
            label: {
              show: true,
              position: "inside",
              formatter: (params: { name: string; value: number }) => {
                return `{name|${params.name}}\n{vol|${fmtCapital(params.value)}}`;
              },
              rich: {
                name: {
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#FAFAFA",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 16,
                },
                vol: {
                  fontSize: 10,
                  color: "#C9A227",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 14,
                },
              },
            },
          },
        ],
        // Hover highlight
        emphasis: {
          itemStyle: {
            borderWidth: 2,
            borderColor: CHART_COLORS.gold,
            shadowBlur: 12,
            shadowColor: "rgba(201,162,39,0.25)",
          },
          label: {
            show: true,
          },
        },
        // Click handler — ECharts fires onClick from the chart's events prop
        // We call onSelect via the chart's events prop defined on ReactECharts.
      },
    ],
  };
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ScoreLegend() {
  const zones = [
    { label: "Strong market", color: CHART_COLORS.emerald, range: "Score 70+" },
    { label: "Moderate market", color: CHART_COLORS.amber, range: "Score 50-70" },
    { label: "Weak market", color: CHART_COLORS.rose, range: "Score <50" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {zones.map((z) => (
        <div key={z.label} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: z.color, opacity: 0.75 }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-mono text-content-tertiary">{z.range}</span>
          <span className="text-[10px] text-content-disabled">{z.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function TreemapSkeleton() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ height: 400 }}
      aria-busy="true"
      aria-label="Loading capital volume treemap"
    >
      <div className="grid grid-cols-4 grid-rows-3 gap-0.5 h-full">
        {/* Row 1: two large blocks */}
        <div className="skeleton col-span-2 row-span-2" />
        <div className="skeleton col-span-1 row-span-2" />
        <div className="skeleton col-span-1 row-span-1" />
        <div className="skeleton col-span-1 row-span-1" />
        {/* Row 3: four smaller blocks */}
        <div className="skeleton col-span-1" />
        <div className="skeleton col-span-1" />
        <div className="skeleton col-span-1" />
        <div className="skeleton col-span-1" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TreemapChart({
  geoKey = "national",
  className,
  onSelect,
}: TreemapChartProps) {
  // Derive which dataset to render from geoKey
  const displayData = useMemo<TreemapMarket[]>(() => {
    if (!geoKey || geoKey === "national") {
      return TREEMAP_SAMPLE_DATA;
    }
    const state = TREEMAP_SAMPLE_DATA.find(
      (s) => s.name.toLowerCase() === geoKey.toLowerCase(),
    );
    // If a specific state is requested and has children, show only its cities.
    // If not found, fall back to national view.
    return state?.children ?? TREEMAP_SAMPLE_DATA;
  }, [geoKey]);

  const totalCapital = useMemo(
    () => TREEMAP_SAMPLE_DATA.reduce((sum, s) => sum + s.capitalVolume, 0),
    [],
  );

  const option = useMemo(
    () => buildOption(displayData, totalCapital, onSelect),
    [displayData, totalCapital, onSelect],
  );

  // ECharts event bindings — route click events to onSelect prop
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const onEvents = useMemo((): Record<string, Function> => {
    if (!onSelect) return {};
    return {
      click: (params: { name: string; componentType: string }) => {
        if (params.componentType === "series") {
          onSelect(params.name);
        }
      },
    };
  }, [onSelect]);

  const isLoading = displayData.length === 0;

  if (isLoading) return <TreemapSkeleton />;

  const viewLabel =
    geoKey === "national" || !geoKey
      ? "All Markets — National View"
      : `${geoKey} — State Detail View`;

  return (
    <div
      className={className}
      role="img"
      aria-label={`Capital volume treemap: ${viewLabel}. Rectangle size represents capital volume, color represents market score.`}
    >
      {/* Chart */}
      <div style={{ height: 400 }}>
        <ReactECharts
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: "canvas" }}
          notMerge
          lazyUpdate={false}
        />
      </div>

      {/* Footer: legend + footnote */}
      <div className="mt-3 pt-3 border-t border-surface-border flex flex-col gap-2">
        <ScoreLegend />
        <p className="text-[10px] text-content-disabled">
          Rectangle size = capital volume. Color = market health score.
          Click any block to drill into cities. Click the breadcrumb to navigate back.
        </p>
      </div>
    </div>
  );
}
