"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";

interface Dimension {
  dimension: string;
  score: number;
  fullMark: number;
}

interface HyperScoreRadarProps {
  dimensions: Record<string, { score: number; keyFactors?: string[] }>;
  size?: number;
}

const dimensionLabels: Record<string, string> = {
  financial: "Financial",
  comps: "Comps",
  demographic: "Demo",
  economic: "Economy",
  infrastructure: "Infra",
  qualityOfLife: "QoL",
  supplyDemand: "Supply",
  macroRisk: "Macro",
};

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export default function HyperScoreRadar({
  dimensions,
  size = 300,
}: HyperScoreRadarProps) {
  const data: Dimension[] = Object.entries(dimensions).map(([key, dim]) => ({
    dimension: dimensionLabels[key] || key,
    score: dim.score,
    fullMark: 100,
  }));

  const avgScore =
    data.reduce((sum, d) => sum + d.score, 0) / data.length;
  const color = scoreColor(avgScore);

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#2e3348" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          tick={{ fill: "#4b5563", fontSize: 9 }}
          axisLine={false}
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
          name="Score"
          dataKey="score"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
