"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCompact } from "@/lib/utils/format";
import type { CapitalFlowPoint } from "@/lib/types/time-series";

interface CapitalFlowTimelineProps {
  data: CapitalFlowPoint[];
  height?: number;
}

const series = [
  { key: "institutional", name: "Institutional", color: "#3b82f6" },
  { key: "retail", name: "Retail", color: "#22c55e" },
  { key: "foreign", name: "Foreign", color: "#a855f7" },
  { key: "exchange1031", name: "1031 Exchange", color: "#f59e0b" },
  { key: "crowdfunding", name: "Crowdfunding", color: "#ec4899" },
];

export default function CapitalFlowTimeline({
  data,
  height = 300,
}: CapitalFlowTimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`flow-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={{ stroke: "#2e3348" }}
          tickLine={false}
          interval="preserveStartEnd"
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
          formatter={(value, name) => [
            `$${formatCompact(Number(value))}`,
            String(name),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId="1"
            stroke={s.color}
            fill={`url(#flow-${s.key})`}
            strokeWidth={1.5}
          />
        ))}
        <Line
          type="monotone"
          dataKey="netFlow"
          name="Net Flow"
          stroke="#ffffff"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
