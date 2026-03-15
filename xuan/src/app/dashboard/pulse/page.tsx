"use client";

import { Activity, TrendingUp, TrendingDown, Target, BarChart3, Eye } from "lucide-react";

// --- MOCK DATA ---
type MarketSignal = {
  market: string;
  watchers: number;
  watcherChange: number;
  buyPct: number;
  avgCapTarget: number;
  timeAgo: string;
  hot: boolean;
};

const ACTIVITY_FEED: MarketSignal[] = [
  { market: "Austin, TX", watchers: 203, watcherChange: 18, buyPct: 73, avgCapTarget: 6.8, timeAgo: "2 min ago", hot: true },
  { market: "Raleigh, NC", watchers: 128, watcherChange: 22, buyPct: 81, avgCapTarget: 7.1, timeAgo: "15 min ago", hot: true },
  { market: "Nashville, TN", watchers: 94, watcherChange: 0, buyPct: 54, avgCapTarget: 6.5, timeAgo: "1 hr ago", hot: false },
  { market: "Charlotte, NC", watchers: 87, watcherChange: 9, buyPct: 68, avgCapTarget: 6.9, timeAgo: "2 hr ago", hot: false },
  { market: "Tampa, FL", watchers: 76, watcherChange: 5, buyPct: 45, avgCapTarget: 7.0, timeAgo: "3 hr ago", hot: false },
  { market: "Columbus, OH", watchers: 52, watcherChange: 31, buyPct: 72, avgCapTarget: 7.4, timeAgo: "4 hr ago", hot: true },
];

const COMPARISONS = [
  { pair: "Austin vs Raleigh", count: 89 },
  { pair: "Nashville vs Charlotte", count: 67 },
  { pair: "Tampa vs Jacksonville", count: 43 },
];

const COOLING = [
  { market: "Phoenix, AZ", change: -12 },
  { market: "Denver, CO", change: -8 },
  { market: "Boise, ID", change: -15 },
];

const YOUR_POSITION = {
  watchingCount: 3,
  avgCapTarget: 6.5,
  communityAvg: 6.7,
  aggressivePct: 62,
};

function consensusColor(pct: number) {
  if (pct >= 70) return "text-emerald-light";
  if (pct >= 50) return "text-amber-light";
  return "text-rose-light";
}

function consensusLabel(pct: number) {
  if (pct >= 70) return "badge-emerald";
  if (pct >= 50) return "badge-amber";
  return "badge-rose";
}

export default function PulsePage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
            Community Intelligence
          </div>
          <h1 className="text-lg font-semibold text-content-primary mt-1">Community Pulse</h1>
        </div>
        <span className="badge-emerald flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" /> Live
        </span>
      </div>

      {/* Activity Feed */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Market Activity Feed
        </div>
        <div className="space-y-2">
          {ACTIVITY_FEED.map((m) => (
            <div key={m.market} className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {m.hot && <span className="text-[11px]">*</span>}
                  <span className="text-[13px] font-semibold text-content-primary">{m.market}</span>
                </div>
                <span className="text-[11px] text-content-disabled font-mono">{m.timeAgo}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-content-secondary flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span className="font-mono">{m.watchers}</span> watching
                </span>
                {m.watcherChange !== 0 && (
                  <span className={`text-xs font-mono flex items-center gap-0.5 ${m.watcherChange > 0 ? "text-emerald-light" : "text-rose-light"}`}>
                    {m.watcherChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {m.watcherChange > 0 ? "+" : ""}{m.watcherChange}% this week
                  </span>
                )}
                <span className="text-content-disabled">|</span>
                <span className={`text-xs font-mono font-semibold ${consensusColor(m.buyPct)}`}>
                  {m.buyPct}% BUY
                </span>
                <span className="text-content-disabled">|</span>
                <span className="text-xs text-content-tertiary">
                  Cap target: <span className="font-mono text-content-secondary">{m.avgCapTarget.toFixed(1)}%</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Compared */}
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Most Compared This Week
          </div>
          <div className="space-y-2">
            {COMPARISONS.map((c, i) => (
              <div key={c.pair} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-content-disabled w-4">#{i + 1}</span>
                  <span className="text-[13px] text-content-primary">{c.pair}</span>
                </div>
                <span className="font-mono text-xs text-content-secondary">{c.count} comparisons</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border">
            <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Community Cap Rate Targets
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-content-primary">6.7%</span>
              <span className="text-xs text-content-tertiary">avg across all investors</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-content-tertiary">
              <span>Most aggressive: <span className="font-mono text-emerald-light">5.5%</span></span>
              <span>Most conservative: <span className="font-mono text-amber-light">8.2%</span></span>
            </div>
          </div>
        </section>

        {/* Cooling Markets + Your Position */}
        <div className="space-y-4">
          <section className="card">
            <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5" /> Cooling Markets
            </div>
            <p className="text-[11px] text-content-tertiary mb-2">Investor attention declining</p>
            <div className="space-y-2">
              {COOLING.map((c) => (
                <div key={c.market} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-[13px] text-content-primary">{c.market}</span>
                  <span className="font-mono text-xs text-rose-light">{c.change}% watchers</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card-accent">
            <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium">
              Your Position
            </div>
            <div className="space-y-2.5">
              <div className="text-[13px] text-content-secondary">
                You are watching <span className="font-mono font-semibold text-accent-light">{YOUR_POSITION.watchingCount}</span> markets
              </div>
              <div className="text-[13px] text-content-secondary">
                Your avg cap rate target: <span className="font-mono font-semibold text-content-primary">{YOUR_POSITION.avgCapTarget}%</span>
                <span className="text-content-tertiary ml-1">(community avg: {YOUR_POSITION.communityAvg}%)</span>
              </div>
              <div className="text-[13px] text-content-secondary">
                You&apos;re more aggressive than <span className="font-mono font-semibold text-emerald-light">{YOUR_POSITION.aggressivePct}%</span> of investors
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
