"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Brush,
} from "recharts";
import type { DerivedMetricPoint } from "@/lib/engines/derived-metrics-engine";
import { RATIO_DESCRIPTIONS } from "@/lib/engines/derived-metrics-engine";

interface RatioSeries {
  key: string;
  label: string;
  data: DerivedMetricPoint[];
  color: string;
  benchmark?: number;
}

interface MultiRatioChartProps {
  ratios: RatioSeries[];
  height?: number;
  showBrush?: boolean;
  showBenchmarks?: boolean;
}

/**
 * Multi-ratio overlay chart — shows RELATIONSHIPS not raw numbers.
 * E.g., Price-to-Rent + Rent Yield + Affordability Index on ONE chart.
 * Each ratio has its own Y-axis scale (normalized).
 * Benchmarks shown as horizontal reference lines.
 */
export default function MultiRatioChart({
  ratios,
  height = 400,
  showBrush = true,
  showBenchmarks = true,
}: MultiRatioChartProps) {
  const [activeRatios, setActiveRatios] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ratios.map((r) => [r.key, true]))
  );
  const [hoveredRatio, setHoveredRatio] = useState<string | null>(null);

  // Merge all ratio data by date
  const mergedData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();
    for (const ratio of ratios) {
      for (const point of ratio.data) {
        const existing = dateMap.get(point.date) || { date: point.date };
        existing[ratio.key] = point.value;
        // Also store components for tooltip
        if (point.components) {
          for (const [ck, cv] of Object.entries(point.components)) {
            existing[`${ratio.key}_${ck}`] = cv;
          }
        }
        dateMap.set(point.date, existing);
      }
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [ratios]);

  const toggleRatio = (key: string) => {
    setActiveRatios((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Custom tooltip showing the ratio + its components
  const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;
    const data = (payload[0] as { payload: Record<string, unknown> })?.payload;
    if (!data) return null;

    return (
      <div className="bg-[#0f1015] border border-[#2a2d3a] rounded-lg p-3 shadow-2xl max-w-[280px]">
        <p className="text-[10px] text-gray-500 uppercase mb-2">{String(label)}</p>
        {ratios
          .filter((r) => activeRatios[r.key])
          .map((r) => {
            const val = data[r.key];
            if (val == null) return null;
            const desc = RATIO_DESCRIPTIONS[r.key];
            const components = r.data.find((p) => p.date === String(label))?.components;

            return (
              <div key={r.key} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-gray-400">{r.label}</span>
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: r.color }}>
                    {Number(val).toFixed(1)}{desc?.unit || ""}
                  </span>
                </div>
                {components && (
                  <p className="text-[9px] text-gray-600 ml-3.5 mt-0.5">
                    {Object.entries(components)
                      .map(([k, v]) => `${k}: ${typeof v === "number" && v > 1000 ? `$${(v / 1000).toFixed(0)}K` : v}`)
                      .join(" ÷ ")}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Ratio selector pills */}
      <div className="flex flex-wrap gap-1.5">
        {ratios.map((r) => {
          const desc = RATIO_DESCRIPTIONS[r.key];
          return (
            <button
              key={r.key}
              onClick={() => toggleRatio(r.key)}
              onMouseEnter={() => setHoveredRatio(r.key)}
              onMouseLeave={() => setHoveredRatio(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
                activeRatios[r.key]
                  ? "border border-opacity-50 text-gray-200"
                  : "border border-transparent text-gray-600 hover:text-gray-400"
              }`}
              style={{
                borderColor: activeRatios[r.key] ? r.color + "80" : "transparent",
                backgroundColor: activeRatios[r.key] ? r.color + "15" : "transparent",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeRatios[r.key] ? r.color : "#4b5563" }} />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Hovered ratio description */}
      {hoveredRatio && RATIO_DESCRIPTIONS[hoveredRatio] && (
        <div className="p-3 bg-surface-elevated/50 rounded-lg border border-surface-border/50 animate-fade-in">
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-300">{RATIO_DESCRIPTIONS[hoveredRatio].name}</span>
            {" = "}{RATIO_DESCRIPTIONS[hoveredRatio].formula}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">{RATIO_DESCRIPTIONS[hoveredRatio].interpretation}</p>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#1e2030" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#374151", strokeDasharray: "3 3" }} />

          {/* Benchmark reference lines */}
          {showBenchmarks && ratios
            .filter((r) => activeRatios[r.key] && r.benchmark != null)
            .map((r) => (
              <ReferenceLine
                key={`bench-${r.key}`}
                y={r.benchmark}
                stroke={r.color}
                strokeDasharray="6 4"
                strokeOpacity={0.3}
                label={{
                  value: `${r.label} avg`,
                  position: "right",
                  fill: r.color,
                  fontSize: 9,
                  opacity: 0.5,
                }}
              />
            ))}

          {/* Ratio lines */}
          {ratios
            .filter((r) => activeRatios[r.key])
            .map((r) => (
              <Line
                key={r.key}
                type="monotone"
                dataKey={r.key}
                name={r.label}
                stroke={r.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: r.color, strokeWidth: 0 }}
                connectNulls
              />
            ))}

          {showBrush && mergedData.length > 12 && (
            <Brush
              dataKey="date"
              height={24}
              stroke="#374151"
              fill="#0f1015"
              travellerWidth={8}
              startIndex={Math.max(0, mergedData.length - 24)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
