"use client";

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
} from "recharts";
import { formatCompact } from "@/lib/utils/format";
import type { ScenarioSeries } from "@/lib/types/time-series";

interface ScenarioChartProps {
  scenarios: ScenarioSeries[];
  currentPrice?: number;
  height?: number;
}

export default function ScenarioChart({
  scenarios,
  currentPrice,
  height = 300,
}: ScenarioChartProps) {
  // Merge all scenarios into single data array
  const mergedData: Array<Record<string, unknown>> = [];
  const maxLen = Math.max(...scenarios.map((s) => s.data.length));

  for (let i = 0; i < maxLen; i++) {
    const point: Record<string, unknown> = {};
    for (const scenario of scenarios) {
      if (i < scenario.data.length) {
        point.date = scenario.data[i].date;
        point[`${scenario.name}`] = scenario.data[i].value;
        point[`${scenario.name}Upper`] = scenario.data[i].upper;
        point[`${scenario.name}Lower`] = scenario.data[i].lower;
      }
    }
    mergedData.push(point);
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={mergedData}>
        <defs>
          {scenarios.map((s) => (
            <linearGradient
              key={s.name}
              id={`scenario-${s.name}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={{ stroke: "#2e3348" }}
          tickLine={false}
          interval={11}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${formatCompact(v)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1d27",
            border: "1px solid #2e3348",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          formatter={(value, name) => {
            const n = String(name);
            if (n.includes("Upper") || n.includes("Lower")) return [null, null];
            return [`$${formatCompact(Number(value))}`, n.charAt(0).toUpperCase() + n.slice(1)];
          }}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {currentPrice && (
          <ReferenceLine
            y={currentPrice}
            stroke="#6b7280"
            strokeDasharray="3 3"
            label={{
              value: "Current",
              fill: "#6b7280",
              fontSize: 10,
              position: "left",
            }}
          />
        )}
        {/* Confidence areas (rendered first, behind lines) */}
        {scenarios.map((s) => (
          <Area
            key={`${s.name}-band`}
            type="monotone"
            dataKey={`${s.name}Upper`}
            stroke="none"
            fill={`url(#scenario-${s.name})`}
            dot={false}
            legendType="none"
            name={`${s.name}Upper`}
          />
        ))}
        {/* Main lines */}
        {scenarios.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
