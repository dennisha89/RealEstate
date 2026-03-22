"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, X, Bell, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";

/**
 * Deterministic mock scores derived from zip code.
 * Produces consistent values per zip so the UI is stable across renders.
 */
function getMockScores(zip: string) {
  // Simple hash from zip string
  let hash = 0;
  for (let i = 0; i < zip.length; i++) {
    hash = (hash * 31 + zip.charCodeAt(i)) & 0x7fffffff;
  }
  const seed = (n: number) => ((hash * (n + 1) * 2654435761) >>> 0) / 4294967296;

  const hyperScore = Math.round(40 + seed(1) * 55); // 40–95
  const capRate = +(3.5 + seed(2) * 7.5).toFixed(1); // 3.5–11.0%
  const priceChange = +(-8 + seed(3) * 20).toFixed(1); // -8% to +12%
  const signalType: "bullish" | "bearish" | "neutral" =
    hyperScore >= 70 ? "bullish" : hyperScore <= 45 ? "bearish" : "neutral";

  // Mini sparkline: 8 deterministic data points normalized 0–1
  const sparkline = Array.from({ length: 8 }, (_, i) => seed(10 + i));

  return { hyperScore, capRate, priceChange, signalType, sparkline };
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const width = 64;
  const height = 20;
  const padding = 1;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((v - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="flex-shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignalBadge({ type }: { type: "bullish" | "bearish" | "neutral" }) {
  if (type === "bullish") {
    return (
      <Badge variant="success" size="sm">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        Buy
      </Badge>
    );
  }
  if (type === "bearish") {
    return (
      <Badge variant="danger" size="sm">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        Avoid
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm">
      <Minus className="h-3 w-3 mr-0.5" />
      Hold
    </Badge>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-money-400";
  if (score >= 50) return "text-gold-400";
  return "text-red-400";
}

function sparklineStroke(score: number): string {
  if (score >= 70) return "#34D399";
  if (score >= 50) return "#FFC71A";
  return "#F87171";
}

export default function Watchlist() {
  const { watchedMarkets, alerts, removeMarket } = useWatchlistStore();
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);

  const alertCountForZip = (zip: string) =>
    alerts.filter((a) => a.zip === zip && a.enabled).length;

  if (watchedMarkets.length === 0) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-xl">
        <div className="px-6 py-4 border-b border-surface-border flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Watchlist
          </h3>
          <span className="ml-auto text-xs text-gray-600 font-mono">0</span>
        </div>
        <div className="p-8 text-center">
          <Eye className="h-8 w-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No markets watched yet.</p>
          <Link
            href="/markets"
            className="text-xs text-money-400 hover:text-money-300 transition-colors"
          >
            Add markets from the Markets page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-border flex items-center gap-2">
        <Eye className="h-4 w-4 text-money-500" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Watchlist
        </h3>
        <span className="ml-1 px-1.5 py-0.5 rounded bg-money-900/50 text-money-400 text-[10px] font-bold font-mono">
          {watchedMarkets.length}
        </span>
      </div>

      {/* Market rows */}
      <div className="divide-y divide-surface-border">
        {watchedMarkets.map((market) => {
          const scores = getMockScores(market.zip);
          const alertCount = alertCountForZip(market.zip);
          const isHovered = hoveredZip === market.zip;

          return (
            <div
              key={market.zip}
              className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface-elevated transition-colors group relative"
              onMouseEnter={() => setHoveredZip(market.zip)}
              onMouseLeave={() => setHoveredZip(null)}
            >
              {/* Market name + state */}
              <Link
                href={`/markets?zip=${market.zip}`}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                  {market.name}
                </p>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">
                  {market.state} {market.zip}
                </p>
              </Link>

              {/* HyperScore */}
              <div className="text-right flex-shrink-0 w-10">
                <p className={`text-sm font-bold font-mono ${scoreColor(scores.hyperScore)}`}>
                  {scores.hyperScore}
                </p>
                <p className="text-[10px] text-gray-600">HS</p>
              </div>

              {/* Cap Rate */}
              <div className="text-right flex-shrink-0 w-12 hidden sm:block">
                <p className="text-sm font-mono text-gray-300">
                  {scores.capRate}%
                </p>
                <p className="text-[10px] text-gray-600">Cap</p>
              </div>

              {/* Signal badge */}
              <div className="flex-shrink-0 hidden md:block">
                <SignalBadge type={scores.signalType} />
              </div>

              {/* Mini sparkline */}
              <div className="flex-shrink-0 hidden lg:block">
                <MiniSparkline
                  data={scores.sparkline}
                  color={sparklineStroke(scores.hyperScore)}
                />
              </div>

              {/* Alert count */}
              {alertCount > 0 && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Bell className="h-3 w-3 text-gold-400" />
                  <span className="text-[10px] font-mono text-gold-400">
                    {alertCount}
                  </span>
                </div>
              )}

              {/* Remove button — visible on hover */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeMarket(market.zip);
                }}
                className={`flex-shrink-0 h-6 w-6 rounded flex items-center justify-center transition-all
                  ${
                    isHovered
                      ? "opacity-100 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "opacity-0"
                  }`}
                title="Remove from watchlist"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
