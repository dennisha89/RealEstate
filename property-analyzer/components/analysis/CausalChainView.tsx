"use client";

import { ArrowRight, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, Pause } from "lucide-react";
import type { CausalChain, CausalLink } from "@/lib/engines/insight-engine";

interface CausalChainViewProps {
  chain: CausalChain;
}

const actionColors = {
  act_now: { bg: "bg-money-900/30 border-money-800/40", text: "text-money-400", icon: CheckCircle, label: "Act Now" },
  monitor: { bg: "bg-gold-900/30 border-gold-800/40", text: "text-gold-400", icon: Pause, label: "Monitor" },
  wait: { bg: "bg-red-900/30 border-red-800/40", text: "text-red-400", icon: AlertTriangle, label: "Wait" },
};

/**
 * Visualizes a causal chain — the WHY behind a market signal.
 * Shows: Cause → Effect → Cause → Effect → Conclusion
 * Each link has direction (bullish/bearish), confidence, and timeframe.
 */
export default function CausalChainView({ chain }: CausalChainViewProps) {
  const action = actionColors[chain.actionability];
  const ActionIcon = action.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-200">{chain.title}</h4>
          <p className="text-xs text-gray-500">{chain.summary}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${action.bg}`}>
          <ActionIcon className={`h-4 w-4 ${action.text}`} />
          <span className={`text-xs font-medium ${action.text}`}>{action.label}</span>
        </div>
      </div>

      {/* Chain links */}
      <div className="space-y-1">
        {chain.links.map((link, i) => (
          <div key={i} className="flex items-start gap-3">
            {/* Connector line */}
            <div className="flex flex-col items-center pt-1.5">
              <div className={`h-3 w-3 rounded-full flex items-center justify-center ${
                link.direction === "positive" ? "bg-money-900/50" : "bg-red-900/50"
              }`}>
                {link.direction === "positive"
                  ? <TrendingUp className="h-2 w-2 text-money-400" />
                  : <TrendingDown className="h-2 w-2 text-red-400" />
                }
              </div>
              {i < chain.links.length - 1 && (
                <div className="w-px h-8 bg-surface-border" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">{link.cause}</span>
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <ArrowRight className="h-3 w-3" />
                    {link.effect}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {link.timeframe}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    link.confidence === "high" ? "bg-money-900/30 text-money-400" :
                    link.confidence === "medium" ? "bg-gold-900/30 text-gold-400" :
                    "bg-surface-elevated text-gray-500"
                  }`}>
                    {link.confidence}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conclusion */}
      <div className={`p-4 rounded-lg border ${action.bg}`}>
        <p className="text-sm text-gray-300 leading-relaxed">{chain.conclusion}</p>
      </div>
    </div>
  );
}
