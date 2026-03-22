"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ComposedChart,
  Line,
  Area,
  Bar,
  ReferenceLine,
  Legend,
  Brush,
} from "recharts";

// ============================================================
// Types
// ============================================================

interface MarketDataPoint {
  name: string;
  color: string;
  // Raw metrics
  medianPrice: number;
  medianRent: number;
  priceChange: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  dom: number;
  capRate: number;
  hyperScore: number;
  mortgageRate: number;
  priceCutPct: number;
  migration: number;
  permits: number;
  medianIncome: number;
  // Derived
  priceToRent: number;
  priceToIncome: number;
  rentYield: number;
  affordability: number;
}

interface CorrelationDashboardProps {
  markets: MarketDataPoint[];
  height?: number;
}

// ============================================================
// Correlation presets — what investors actually look at together
// ============================================================

const CORRELATION_VIEWS = [
  {
    id: "supply_demand",
    label: "Supply vs Demand Pressure",
    description: "When inventory falls + DOM drops + price cuts decrease → prices about to accelerate",
    metrics: [
      { key: "inventory", label: "Inventory (mo)", color: "#3b82f6", type: "bar" as const },
      { key: "dom", label: "Days on Market", color: "#f59e0b", type: "line" as const },
      { key: "priceCutPct", label: "Price Cuts %", color: "#ef4444", type: "line" as const },
      { key: "priceChange", label: "Price Change %", color: "#22c55e", type: "line" as const },
    ],
    insight: (d: MarketDataPoint) => {
      if (d.inventory < 3 && d.dom < 30 && d.priceCutPct < 15) return `${d.name}: Tight supply (${d.inventory.toFixed(1)} mo) + fast sales (${d.dom}d) + few price cuts (${d.priceCutPct}%) = seller's market. Prices likely to accelerate.`;
      if (d.inventory > 4 && d.dom > 45) return `${d.name}: Inventory building (${d.inventory.toFixed(1)} mo) + slow sales (${d.dom}d) = buyer's market forming. Negotiation leverage.`;
      return `${d.name}: Balanced supply/demand. ${d.inventory.toFixed(1)} months inventory, ${d.dom} DOM.`;
    },
  },
  {
    id: "growth_engine",
    label: "Growth Engine",
    description: "Jobs → Population → Housing Demand → Price Appreciation. The fundamental growth chain.",
    metrics: [
      { key: "jobGrowth", label: "Job Growth %", color: "#3b82f6", type: "bar" as const },
      { key: "popGrowth", label: "Pop Growth %", color: "#a855f7", type: "bar" as const },
      { key: "migration", label: "Net Migration (K)", color: "#06b6d4", type: "line" as const },
      { key: "priceChange", label: "Price Change %", color: "#22c55e", type: "line" as const },
    ],
    insight: (d: MarketDataPoint) => {
      if (d.jobGrowth > 3 && d.popGrowth > 2) return `${d.name}: Strong growth engine. ${d.jobGrowth}% job growth driving ${d.popGrowth}% population growth → sustained demand. Price appreciation of ${d.priceChange > 0 ? "+" : ""}${d.priceChange}% follows.`;
      if (d.jobGrowth > 2 && d.popGrowth < 1) return `${d.name}: Jobs growing (${d.jobGrowth}%) but population lagging (${d.popGrowth}%). Housing demand may be met by existing residents. Watch for migration uptick.`;
      return `${d.name}: Moderate growth. ${d.jobGrowth}% jobs, ${d.popGrowth}% population.`;
    },
  },
  {
    id: "value_yield",
    label: "Value vs Yield",
    description: "Price-to-Rent vs Cap Rate vs Cash Flow. Where is the best risk-adjusted return?",
    metrics: [
      { key: "priceToRent", label: "Price/Rent Ratio", color: "#f59e0b", type: "bar" as const },
      { key: "capRate", label: "Cap Rate %", color: "#22c55e", type: "line" as const },
      { key: "rentYield", label: "Rent Yield %", color: "#3b82f6", type: "line" as const },
    ],
    insight: (d: MarketDataPoint) => {
      if (d.priceToRent < 16 && d.capRate > 6) return `${d.name}: Strong value play. Price/Rent of ${d.priceToRent.toFixed(1)}x with ${d.capRate}% cap rate = buying is significantly cheaper than renting. Cash flow market.`;
      if (d.priceToRent > 22) return `${d.name}: Price/Rent ratio of ${d.priceToRent.toFixed(1)}x indicates renting is cheaper than buying. Appreciation-dependent play — need ${((d.priceToRent - 15) * 0.3).toFixed(1)}%+ annual growth to justify.`;
      return `${d.name}: Moderate value. ${d.priceToRent.toFixed(1)}x price/rent, ${d.capRate}% cap rate.`;
    },
  },
  {
    id: "affordability_stress",
    label: "Affordability Stress",
    description: "When mortgage payments consume too much income → buyer pool shrinks → price ceiling",
    metrics: [
      { key: "affordability", label: "Payment/Income %", color: "#ef4444", type: "bar" as const },
      { key: "priceToIncome", label: "Price/Income Ratio", color: "#f59e0b", type: "line" as const },
      { key: "priceChange", label: "Price Change %", color: "#22c55e", type: "line" as const },
    ],
    insight: (d: MarketDataPoint) => {
      if (d.affordability > 35) return `${d.name}: AFFORDABILITY CEILING. Mortgage payments consume ${d.affordability.toFixed(0)}% of income (>35% threshold). Buyer pool is shrinking. Prices at ${d.priceToIncome.toFixed(1)}x income face resistance.`;
      if (d.affordability > 28) return `${d.name}: Stretched affordability at ${d.affordability.toFixed(0)}% of income. Near the 28% conventional lending threshold. Rate increases will hurt.`;
      return `${d.name}: Affordable at ${d.affordability.toFixed(0)}% of income. Deep buyer pool supports continued demand.`;
    },
  },
  {
    id: "leading_signals",
    label: "Leading Indicators",
    description: "Permits + mortgage rates + migration predict what happens 6-24 months from now",
    metrics: [
      { key: "permits", label: "Permit Growth %", color: "#06b6d4", type: "bar" as const },
      { key: "migration", label: "Net Migration (K)", color: "#a855f7", type: "bar" as const },
      { key: "mortgageRate", label: "Mortgage Rate %", color: "#ef4444", type: "line" as const },
      { key: "priceChange", label: "Current Price Chg %", color: "#22c55e", type: "line" as const },
    ],
    insight: (d: MarketDataPoint) => {
      const signals: string[] = [];
      if (d.permits < 0) signals.push(`permits declining ${Math.abs(d.permits)}% (future supply shortage)`);
      if (d.migration > 2) signals.push(`strong migration inflow (${d.migration}K households/yr)`);
      if (d.mortgageRate < 6.5) signals.push("favorable rates expanding buyer pool");
      if (d.mortgageRate > 7.5) signals.push("elevated rates constraining demand");

      if (signals.length >= 2) return `${d.name}: Leading indicators: ${signals.join("; ")}. These factors predict price direction 6-24 months ahead.`;
      return `${d.name}: Mixed signals. ${signals[0] || "No strong directional signal from leading indicators."}`;
    },
  },
];

// ============================================================
// Component
// ============================================================

export default function CorrelationDashboard({ markets, height = 380 }: CorrelationDashboardProps) {
  const [activeView, setActiveView] = useState("supply_demand");

  const view = CORRELATION_VIEWS.find((v) => v.id === activeView)!;

  // Sort markets by hyperScore for consistent ordering
  const sortedMarkets = useMemo(() =>
    [...markets].sort((a, b) => b.hyperScore - a.hyperScore),
    [markets]
  );

  // Build chart data — each market is a data point
  const chartData = sortedMarkets.map((m) => ({
    name: m.name,
    ...Object.fromEntries(view.metrics.map((metric) => [metric.key, (m as unknown as Record<string, number>)[metric.key]])),
  }));

  return (
    <div className="space-y-4">
      {/* View selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 flex-nowrap">
        {CORRELATION_VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-3 py-1.5 text-[10px] font-medium rounded-md whitespace-nowrap flex-shrink-0 transition-all ${
              activeView === v.id
                ? "bg-money-900/50 text-money-400 border border-money-700/50"
                : "text-gray-500 hover:text-gray-300 bg-surface-elevated border border-transparent"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500">{view.description}</p>

      {/* Multi-metric bar+line chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#1e2030" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f1015",
              border: "1px solid #2a2d3a",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#e5e7eb",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />

          {view.metrics.map((metric) => {
            if (metric.type === "bar") {
              return (
                <Bar
                  key={metric.key}
                  dataKey={metric.key}
                  name={metric.label}
                  fill={metric.color}
                  fillOpacity={0.6}
                  radius={[3, 3, 0, 0]}
                />
              );
            }
            return (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: metric.color, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: metric.color, strokeWidth: 2, stroke: "#fff" }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Per-market insights */}
      <div className="space-y-2">
        {sortedMarkets.map((m) => (
          <div key={m.name} className="flex items-start gap-2 p-3 bg-surface-elevated/50 rounded-lg border border-surface-border/30">
            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: m.color }} />
            <p className="text-xs text-gray-400 leading-relaxed">{view.insight(m)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
