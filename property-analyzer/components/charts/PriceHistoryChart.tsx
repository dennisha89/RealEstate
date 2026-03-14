"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCompact } from "@/lib/utils/format";

interface PricePoint {
  date: string;
  price: number;
  upperBound?: number;
  lowerBound?: number;
}

interface PriceHistoryChartProps {
  data: PricePoint[];
  showConfidenceBand?: boolean;
}

export default function PriceHistoryChart({
  data,
  showConfidenceBand = false,
}: PriceHistoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={{ stroke: "#2e3348" }}
          tickLine={false}
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
          formatter={(value) => [`$${formatCompact(Number(value))}`]}
        />
        {showConfidenceBand && (
          <>
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="url(#bandGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="transparent"
              dot={false}
            />
          </>
        )}
        <Area
          type="monotone"
          dataKey="price"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
