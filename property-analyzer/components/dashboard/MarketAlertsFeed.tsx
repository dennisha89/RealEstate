"use client";

import { Zap, TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Signal {
  signal: string;
  source: string;
  strength: number;
  leadTime?: string;
  type: "bullish" | "bearish" | "neutral";
}

interface MarketAlertsFeedProps {
  signals: Signal[];
  maxItems?: number;
}

function typeIcon(type: string) {
  if (type === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-money-400" />;
  if (type === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Activity className="h-3.5 w-3.5 text-gray-500" />;
}

export default function MarketAlertsFeed({
  signals,
  maxItems = 10,
}: MarketAlertsFeedProps) {
  const items = signals.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-6 w-6 text-gray-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No signals detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-surface-elevated border border-surface-border hover:border-surface-muted transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1">
              {typeIcon(s.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">{s.signal}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-600">{s.source}</span>
                  {s.leadTime && (
                    <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {s.leadTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`h-3 w-1 rounded-full ${
                      n <= Math.ceil(s.strength / 20)
                        ? s.type === "bullish"
                          ? "bg-money-400"
                          : s.type === "bearish"
                          ? "bg-red-400"
                          : "bg-gray-500"
                        : "bg-surface-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
