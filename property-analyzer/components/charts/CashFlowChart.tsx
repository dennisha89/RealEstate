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
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface CashFlowData {
  month: string;
  income: number;
  mortgage: number;
  expenses: number;
  cashFlow: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#2e3348" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1d27",
            border: "1px solid #2e3348",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
          formatter={(value) => [
            formatCurrency(Number(value)),
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }}
        />
        <ReferenceLine y={0} stroke="#2e3348" />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="mortgage" name="Mortgage" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
