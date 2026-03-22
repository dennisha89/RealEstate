"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Eye, TrendingUp, GitCompare, Target, Flame, Activity } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface Signal {
  zip: string; marketName: string; watcherCount: number; watcherChange7d: number;
  searchVolume: number; searchVolumeChange7d: number; comparisonCount: number;
  avgAlertThreshold: { capRate: number; hyperScore: number };
  sentiment: "bullish" | "neutral" | "bearish"; hotness: number;
}
interface Agg { totalWatchers: number; totalSearches: number; avgCapRateTarget: number; topComparedMarkets: string[]; hotMarkets: number }
interface Item { icon: ReactNode; text: ReactNode; time: string; isHot: boolean }

const Dir = ({ v, abs }: { v: boolean; abs: number }) => (
  <span className={v ? "text-money-400" : "text-red-400"}>{v ? "up" : "down"} {abs}%</span>
);
const M = ({ children }: { children: ReactNode }) => <span className="font-mono text-gray-200">{children}</span>;
const N = ({ children }: { children: ReactNode }) => <span className="text-gray-200">{children}</span>;

function buildFeed(signals: Signal[], agg: Agg): Item[] {
  const items: Item[] = [];
  const top = signals[0];
  if (top) {
    items.push({
      icon: <Eye className="h-3.5 w-3.5 text-blue-400" />,
      text: <><M>{top.watcherCount}</M> investors watching <N>{top.zip}</N> ({top.marketName}) — <Dir v={top.watcherChange7d >= 0} abs={Math.abs(top.watcherChange7d)} /> this week</>,
      time: "2h ago", isHot: top.hotness > 70,
    });
  }
  const topSearch = [...signals].sort((a, b) => b.searchVolumeChange7d - a.searchVolumeChange7d)[0];
  if (topSearch) {
    items.push({
      icon: <TrendingUp className="h-3.5 w-3.5 text-money-400" />,
      text: <>Search volume for <N>{topSearch.marketName.split(",")[0]}</N> <Dir v={topSearch.searchVolumeChange7d >= 0} abs={Math.abs(topSearch.searchVolumeChange7d)} /></>,
      time: "5h ago", isHot: topSearch.hotness > 70,
    });
  }
  if (agg.topComparedMarkets.length >= 2) {
    items.push({
      icon: <GitCompare className="h-3.5 w-3.5 text-purple-400" />,
      text: <>Most compared: <N>{agg.topComparedMarkets.join(" vs ")}</N></>,
      time: "8h ago", isHot: false,
    });
  }
  items.push({
    icon: <Target className="h-3.5 w-3.5 text-gold-400" />,
    text: <>Average cap rate target: <span className="font-mono text-gold-400">{agg.avgCapRateTarget}%</span> across all investors</>,
    time: "12h ago", isHot: false,
  });
  const second = signals[1];
  if (second) {
    items.push({
      icon: <Eye className="h-3.5 w-3.5 text-blue-400" />,
      text: <><M>{second.watcherCount}</M> investors watching <N>{second.marketName.split(",")[0]}</N> — <Dir v={second.watcherChange7d >= 0} abs={Math.abs(second.watcherChange7d)} /></>,
      time: "14h ago", isHot: second.hotness > 70,
    });
  }
  if (agg.hotMarkets > 0) {
    items.push({
      icon: <Flame className="h-3.5 w-3.5 text-orange-400" />,
      text: <><M>{agg.hotMarkets}</M> markets are trending hot right now</>,
      time: "1d ago", isHot: true,
    });
  }
  return items;
}

export default function CommunityPulse() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [aggregate, setAggregate] = useState<Agg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/community-signals");
        if (!res.ok) throw new Error("Failed to fetch community signals");
        const data = await res.json();
        if (cancelled) return;
        setSignals(data.signals ?? []);
        setAggregate(data.aggregate ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const feed = signals.length > 0 && aggregate ? buildFeed(signals, aggregate) : [];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-money-400" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{"\u773E\u671B"} Collective Vision</h3>
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-money-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-money-500" />
        </span>
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-elevated animate-pulse">
              <div className="flex items-start gap-2">
                <div className="h-3.5 w-3.5 rounded bg-surface-border flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-border rounded w-3/4" />
                  <div className="h-2.5 bg-surface-border rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400 py-4 text-center">{error}</p>}

      {!loading && !error && feed.length === 0 && (
        <div className="text-center py-8">
          <Activity className="h-6 w-6 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No collective signals yet</p>
        </div>
      )}

      {!loading && !error && feed.length > 0 && (
        <div className="space-y-2">
          {feed.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-elevated border border-surface-border hover:border-surface-muted transition-colors">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400 leading-relaxed">{item.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-600">{item.time}</span>
                    {item.isHot && (
                      <Badge variant="warning" size="sm"><Flame className="h-2.5 w-2.5 mr-0.5" />hot</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
