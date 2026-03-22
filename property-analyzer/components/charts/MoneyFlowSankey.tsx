"use client";

import type { SankeyNode, SankeyLink } from "@/lib/types/time-series";

interface MoneyFlowSankeyProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  height?: number;
}

const sourceColors: Record<string, string> = {
  "1031 Exchange": "#22c55e",
  "Institutional": "#3b82f6",
  "Foreign Capital": "#a855f7",
  "Tax Migration": "#f59e0b",
  "Retail/Organic": "#06b6d4",
  "Crowdfunding": "#ec4899",
};

const targetColors: Record<string, string> = {
  "Residential": "#22c55e",
  "Commercial": "#3b82f6",
  "Mixed-Use": "#f59e0b",
  "Land": "#6b7280",
};

/**
 * Simplified Sankey-style visualization using SVG bars + flow arrows.
 * Recharts Sankey requires a different data format; this custom SVG
 * gives full control over the money-flow aesthetic.
 */
export default function MoneyFlowSankey({
  nodes,
  links,
  height = 400,
}: MoneyFlowSankeyProps) {
  const sources = nodes.filter((n) => links.some((l) => l.source === n.name));
  const targets = nodes.filter(
    (n) => links.some((l) => l.target === n.name) && !links.some((l) => l.source === n.name)
  );

  const totalFlow = links.reduce((s, l) => s + l.value, 0);

  // Compute source totals
  const sourceTotals = sources.map((s) => ({
    name: s.name,
    total: links.filter((l) => l.source === s.name).reduce((sum, l) => sum + l.value, 0),
  }));

  // Compute target totals
  const targetTotals = targets.map((t) => ({
    name: t.name,
    total: links.filter((l) => l.target === t.name).reduce((sum, l) => sum + l.value, 0),
  }));

  const barHeight = 32;
  const gap = 8;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {/* Sources */}
        <div className="col-span-2 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
            Capital Sources
          </p>
          {sourceTotals.map((s) => {
            const pct = totalFlow > 0 ? (s.total / totalFlow) * 100 : 0;
            const color = sourceColors[s.name] || "#6b7280";
            return (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{s.name}</span>
                  <span className="text-xs font-mono text-gray-300">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-6 bg-surface-elevated rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow arrows */}
        <div className="col-span-1 flex items-center justify-center">
          <div className="space-y-2 text-gray-600">
            <svg width="60" height="120" viewBox="0 0 60 120">
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    x1="5"
                    y1={10 + i * 22}
                    x2="45"
                    y2={10 + i * 22}
                    stroke="#4b5563"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <polygon
                    points={`45,${5 + i * 22} 55,${10 + i * 22} 45,${15 + i * 22}`}
                    fill="#4b5563"
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Targets */}
        <div className="col-span-2 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
            Destinations
          </p>
          {targetTotals.map((t) => {
            const pct = totalFlow > 0 ? (t.total / totalFlow) * 100 : 0;
            const color = targetColors[t.name] || "#6b7280";
            return (
              <div key={t.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t.name}</span>
                  <span className="text-xs font-mono text-gray-300">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-6 bg-surface-elevated rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total flow */}
      <div className="text-center pt-2 border-t border-surface-border">
        <span className="text-xs text-gray-500">
          Total estimated capital flow:{" "}
          <span className="text-money-400 font-mono font-medium">
            ${(totalFlow).toLocaleString()}M
          </span>
        </span>
      </div>
    </div>
  );
}
