"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";

interface RiskDimension {
  dimension: string;
  score: number;
  fullMark: number;
}

interface RiskRadarChartProps {
  data: RiskDimension[];
}

export default function RiskRadarChart({ data }: RiskRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#2e3348" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1d27",
            border: "1px solid #2e3348",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          formatter={(value) => [`${value}/100`]}
        />
        <Radar
          name="Risk Score"
          dataKey="score"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
