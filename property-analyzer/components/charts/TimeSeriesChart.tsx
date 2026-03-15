"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
  ReferenceArea,
  type TooltipProps,
} from "recharts";
import { formatCompact } from "@/lib/utils/format";

// --- Types ---

interface SeriesConfig {
  key: string;
  name: string;
  color: string;
  type: "line" | "area" | "bar";
  yAxisId?: "left" | "right";
  visible?: boolean;
}

interface ChartEvent {
  date: string;
  label: string;
  color?: string;
}

interface ChartHighlight {
  from: string;
  to: string;
  label?: string;
  color?: string;
}

interface TimeRange {
  label: string;
  days: number;
}

interface TimeSeriesChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<any>;
  series: SeriesConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  showTimeRanges?: boolean;
  showEvents?: boolean;
  syncId?: string;
  formatY?: (value: number) => string;
  formatYRight?: (value: number) => string;
  dualAxis?: boolean;
  events?: ChartEvent[];
  highlights?: ChartHighlight[];
  timeRanges?: TimeRange[];
}

const DEFAULT_TIME_RANGES: TimeRange[] = [
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "2Y", days: 730 },
  { label: "5Y", days: 1825 },
  { label: "All", days: Infinity },
];

// --- Custom Tooltip ---

function CustomTooltip(props: Record<string, unknown> & { seriesConfigs: SeriesConfig[] }) {
  const { active, payload, label, seriesConfigs } = props as {
    active?: boolean;
    payload?: Array<{ value?: number; name?: string; dataKey?: string; color?: string }>;
    label?: string;
    seriesConfigs: SeriesConfig[];
  };

  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#1a1d27] border border-[#2e3348] rounded-lg p-3 shadow-xl min-w-[160px]">
      <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-2">
        {String(label)}
      </p>
      <div className="space-y-1.5">
        {payload
          .filter((p: { value?: number }) => p.value != null)
          .map((entry: { value?: number; name?: string; dataKey?: string; color?: string }, i: number) => {
            const config = seriesConfigs.find(
              (s) => s.key === entry.dataKey || s.name === entry.name
            );
            return (
              <div key={i} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-300">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config?.color || entry.color || "#888" }}
                  />
                  {config?.name || String(entry.name)}
                </span>
                <span
                  className="text-xs font-mono font-medium"
                  style={{ color: config?.color || entry.color || "#e5e7eb" }}
                >
                  {formatCompact(Number(entry.value))}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function TimeSeriesChart({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  showTimeRanges = false,
  showEvents = false,
  syncId,
  formatY = (v) => formatCompact(v),
  formatYRight,
  dualAxis = false,
  events = [],
  highlights = [],
  timeRanges = DEFAULT_TIME_RANGES,
}: TimeSeriesChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(
    () => Object.fromEntries(series.map((s) => [s.key, s.visible !== false]))
  );
  const [activeRange, setActiveRange] = useState<string>("All");

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (activeRange === "All") return data;
    const range = timeRanges.find((r) => r.label === activeRange);
    if (!range || range.days === Infinity) return data;
    // Show last N data points (approximation: assume monthly data)
    const pointsToShow = Math.ceil(range.days / 30);
    return data.slice(-pointsToShow);
  }, [data, activeRange, timeRanges]);

  const handleLegendClick = useCallback((dataKey: string) => {
    setVisibleSeries((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);

  return (
    <div>
      {/* Time range selector */}
      {showTimeRanges && data.length > 12 && (
        <div className="flex items-center gap-1 mb-3">
          {timeRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => setActiveRange(range.label)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                activeRange === range.label
                  ? "bg-money-900/50 text-money-400 border border-money-700/50"
                  : "text-gray-500 hover:text-gray-300 hover:bg-surface-elevated border border-transparent"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={filteredData} syncId={syncId}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" vertical={false} />
          )}
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#2e3348" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatY}
            width={60}
          />
          {dualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYRight || formatY}
              width={60}
            />
          )}

          {/* Custom tooltip */}
          <Tooltip
            content={<CustomTooltip seriesConfigs={series} />}
            cursor={{ stroke: "#4b5563", strokeDasharray: "3 3" }}
          />

          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "11px", cursor: "pointer", paddingTop: "8px" }}
              onClick={(e) => {
                if (typeof e.dataKey === "string") handleLegendClick(e.dataKey);
              }}
              formatter={(value, entry) => {
                const key = typeof entry.dataKey === "string" ? entry.dataKey : "";
                const isHidden = !visibleSeries[key];
                return (
                  <span style={{ color: isHidden ? "#4b5563" : entry.color, textDecoration: isHidden ? "line-through" : "none" }}>
                    {value}
                  </span>
                );
              }}
            />
          )}

          {/* Event reference lines */}
          {showEvents &&
            events.map((evt, i) => (
              <ReferenceLine
                key={`evt-${i}`}
                x={evt.date}
                stroke={evt.color || "#6b7280"}
                strokeDasharray="3 3"
                yAxisId="left"
                label={{
                  value: evt.label,
                  position: "top",
                  fill: evt.color || "#6b7280",
                  fontSize: 9,
                }}
              />
            ))}

          {/* Highlight areas */}
          {highlights.map((h, i) => (
            <ReferenceArea
              key={`hl-${i}`}
              x1={h.from}
              x2={h.to}
              fill={h.color || "#ef4444"}
              fillOpacity={0.08}
              yAxisId="left"
              label={
                h.label
                  ? { value: h.label, position: "insideTop", fill: "#9ca3af", fontSize: 10 }
                  : undefined
              }
            />
          ))}

          {/* Data series */}
          {series.map((s) => {
            if (!visibleSeries[s.key]) return null;
            const yAxisId = s.yAxisId || "left";

            if (s.type === "area") {
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                  yAxisId={yAxisId}
                  connectNulls
                />
              );
            }
            if (s.type === "bar") {
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  fillOpacity={0.6}
                  radius={[2, 2, 0, 0]}
                  yAxisId={yAxisId}
                />
              );
            }
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                yAxisId={yAxisId}
                connectNulls
              />
            );
          })}

          {/* Brush for range selection */}
          {showBrush && filteredData.length > 12 && (
            <Brush
              dataKey="date"
              height={28}
              stroke="#374151"
              fill="#111318"
              travellerWidth={8}
              startIndex={Math.max(0, filteredData.length - 24)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
