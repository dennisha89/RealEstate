"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface MarketData {
  market: string;
  capRate: number;
  appreciation: number;
  cashFlow: number;
}

interface MarketComparisonChartProps {
  data: MarketData[];
}

export default function MarketComparisonChart({ data }: MarketComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" vertical={false} />
        <XAxis
          dataKey="market"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={{ stroke: "#2e3348" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1d27",
            border: "1px solid #2e3348",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          formatter={(value) => [`${value}%`]}
        />
        <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }} />
        <Bar dataKey="capRate" name="Cap Rate" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="appreciation" name="Appreciation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cashFlow" name="Cash Flow %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
