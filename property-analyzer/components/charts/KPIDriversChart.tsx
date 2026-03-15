"use client";

import type { KPIDriverBar } from "@/lib/types/time-series";

interface KPIDriversChartProps {
  drivers: KPIDriverBar[];
  maxDrivers?: number;
}

export default function KPIDriversChart({
  drivers,
  maxDrivers = 10,
}: KPIDriversChartProps) {
  const sorted = [...drivers]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, maxDrivers);

  const maxImpact = Math.max(...sorted.map((d) => Math.abs(d.impact)));

  return (
    <div className="space-y-3">
      {sorted.map((driver) => {
        const isPositive = driver.impact > 0;
        const widthPct = maxImpact > 0 ? (Math.abs(driver.impact) / maxImpact) * 100 : 0;

        return (
          <div key={driver.name} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">{driver.name}</span>
                <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-surface-elevated rounded">
                  {driver.dimension}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{driver.value}</span>
                <span
                  className={`text-xs font-mono font-medium ${
                    isPositive ? "text-money-400" : "text-red-400"
                  }`}
                >
                  {isPositive ? "+" : ""}{driver.impact.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="h-5 bg-surface-elevated rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500 group-hover:opacity-100 opacity-80"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: isPositive ? "#22c55e" : "#ef4444",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
