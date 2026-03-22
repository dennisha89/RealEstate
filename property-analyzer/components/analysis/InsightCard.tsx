"use client";

import { TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { MetricContext } from "@/lib/engines/insight-engine";

interface InsightCardProps {
  context: MetricContext;
  showBenchmark?: boolean;
  compact?: boolean;
}

const ratingColors = {
  excellent: "text-money-400",
  strong: "text-money-400",
  average: "text-gold-400",
  weak: "text-red-400",
  poor: "text-red-400",
};

const ratingBg = {
  excellent: "bg-money-900/20 border-money-800/30",
  strong: "bg-money-900/15 border-money-800/20",
  average: "bg-gold-900/15 border-gold-800/20",
  weak: "bg-red-900/15 border-red-800/20",
  poor: "bg-red-900/20 border-red-800/30",
};

/**
 * A metric card that shows the number + context + explanation.
 * NOT just "Cap Rate: 7.2%" — instead:
 * "Cap Rate: 7.2% — Excellent (top 10% nationally)"
 * "At 7.2%, this property generates exceptional income..."
 */
export default function InsightCard({ context, showBenchmark = true, compact = false }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${ratingBg[context.rating]}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{context.label}</span>
          <span className={`text-[10px] font-medium ${ratingColors[context.rating]}`}>
            {context.rating}
          </span>
        </div>
        <p className={`text-lg font-mono font-bold ${ratingColors[context.rating]}`}>
          {context.formatted}
        </p>
        {showBenchmark && (
          <p className="text-[10px] text-gray-600 mt-0.5">{context.benchmark}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${ratingBg[context.rating]} overflow-hidden`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">{context.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-mono font-bold ${ratingColors[context.rating]}`}>
                {context.formatted}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                context.rating === "excellent" || context.rating === "strong"
                  ? "bg-money-900/40 text-money-400"
                  : context.rating === "average"
                  ? "bg-gold-900/40 text-gold-400"
                  : "bg-red-900/40 text-red-400"
              }`}>
                {context.rating.charAt(0).toUpperCase() + context.rating.slice(1)}
              </span>
            </div>
          </div>

          {/* Percentile indicator */}
          <div className="text-right">
            <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  context.percentile >= 70 ? "bg-money-500" : context.percentile >= 40 ? "bg-gold-500" : "bg-red-500"
                }`}
                style={{ width: `${context.percentile}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-600 mt-0.5 block">
              Top {100 - context.percentile}%
            </span>
          </div>
        </div>

        {/* Benchmark */}
        {showBenchmark && (
          <p className="text-[10px] text-gray-600 mb-2">{context.benchmark}</p>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Info className="h-3 w-3" />
          {expanded ? "Hide analysis" : "What does this mean?"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Insight text */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <p className="text-sm text-gray-400 leading-relaxed border-t border-surface-border/50 pt-3">
            {context.insight}
          </p>
        </div>
      )}
    </div>
  );
}
