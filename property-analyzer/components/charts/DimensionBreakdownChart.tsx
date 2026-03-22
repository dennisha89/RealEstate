"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SubMetric {
  name: string;
  score: number;
  impact: string;
}

interface DimensionData {
  dimension: string;
  score: number;
  weight: number;
  weightedScore: number;
  color: string;
  subMetrics: SubMetric[];
}

interface DimensionBreakdownChartProps {
  dimensions: DimensionData[];
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Fair";
  if (score >= 30) return "Weak";
  return "Poor";
}

export default function DimensionBreakdownChart({
  dimensions,
}: DimensionBreakdownChartProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {dimensions.map((dim) => {
        const isExpanded = expanded === dim.dimension;
        return (
          <div key={dim.dimension}>
            <button
              onClick={() => setExpanded(isExpanded ? null : dim.dimension)}
              className="w-full group"
            >
              <div className="flex items-center gap-3 py-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: dim.color }}
                      />
                      <span className="text-sm text-gray-300">
                        {dim.dimension}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        w:{(dim.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {scoreLabel(dim.score)}
                      </span>
                      <span
                        className="text-sm font-mono font-medium"
                        style={{ color: dim.color }}
                      >
                        {dim.score}
                      </span>
                    </div>
                  </div>
                  <div className="h-4 bg-surface-elevated rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-500 group-hover:opacity-100 opacity-80"
                      style={{
                        width: `${dim.score}%`,
                        backgroundColor: dim.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Sub-metrics */}
            {isExpanded && (
              <div className="ml-9 pl-4 border-l border-surface-border space-y-2 pb-2 animate-fade-in">
                {dim.subMetrics.map((sub) => (
                  <div key={sub.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 truncate">
                      {sub.name}
                    </span>
                    <div className="flex-1 h-3 bg-surface-elevated rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${sub.score}%`,
                          backgroundColor: dim.color,
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-8 text-right">
                      {sub.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
