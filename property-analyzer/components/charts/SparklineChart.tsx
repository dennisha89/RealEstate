"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  YAxis,
  Tooltip,
} from "recharts";
import { formatCompact } from "@/lib/utils/format";

interface SparklineChartProps {
  data: number[];
  height?: number;
  color?: string;
  showArea?: boolean;
}

export default function SparklineChart({
  data,
  height = 60,
  color = "#22c55e",
  showArea = false,
}: SparklineChartProps) {
  const chartData = data.map((value, index) => ({ index, value }));
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const padding = (maxValue - minValue) * 0.1;

  if (showArea) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis domain={[minValue - padding, maxValue + padding]} hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1d27",
              border: "1px solid #2e3348",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e5e7eb",
            }}
            formatter={(value) => [formatCompact(Number(value))]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <YAxis domain={[minValue - padding, maxValue + padding]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
