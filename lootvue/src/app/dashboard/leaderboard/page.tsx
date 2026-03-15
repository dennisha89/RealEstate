"use client";

import { Trophy, Target, ArrowUpRight, ChevronRight, Zap } from "lucide-react";

// --- MOCK DATA ---
const YOUR_RANK = 847;
const TOTAL_INVESTORS = 5_640;
const YOUR_PERCENTILE = Math.round((1 - YOUR_RANK / TOTAL_INVESTORS) * 100);

type Stat = { label: string; value: string; percentile: number };
const YOUR_STATS: Stat[] = [
  { label: "Avg Cap Rate", value: "6.8%", percentile: 78 },
  { label: "Cash Flow / Door", value: "$380", percentile: 69 },
  { label: "Portfolio Growth", value: "+14%", percentile: 82 },
  { label: "Decision Accuracy", value: "73%", percentile: 75 },
  { label: "Deals Analyzed", value: "47", percentile: 88 },
];

type Tier = { name: string; icon: string; range: string; avgCap: string; avgCashFlow: string; color: string };
const TIERS: Tier[] = [
  { name: "Diamond", icon: "D", range: "Top 5%", avgCap: "8.1%", avgCashFlow: "$520/door", color: "text-gold-light bg-gold-muted" },
  { name: "Gold", icon: "G", range: "Top 15%", avgCap: "7.2%", avgCashFlow: "$410/door", color: "text-gold-light bg-gold-muted" },
  { name: "Silver", icon: "S", range: "Top 30%", avgCap: "6.5%", avgCashFlow: "$340/door", color: "text-content-primary bg-surface-muted" },
  { name: "Bronze", icon: "B", range: "Top 50%", avgCap: "5.8%", avgCashFlow: "$280/door", color: "text-amber-light bg-amber-muted" },
  { name: "Rising", icon: "R", range: "Top 75%", avgCap: "5.2%", avgCashFlow: "$210/door", color: "text-content-tertiary bg-white/[0.04]" },
];

const LEVEL_UP = [
  { text: "Analyze 10 more deals to reach Gold tier", metric: "Deals: 47 / 57" },
  { text: "Improve cap rate by 0.4% on next acquisition", metric: "Target: 7.2%" },
  { text: "Build prediction accuracy above 75%", metric: "Current: 73%" },
];

function getCurrentTier(): Tier {
  if (YOUR_PERCENTILE >= 95) return TIERS[0];
  if (YOUR_PERCENTILE >= 85) return TIERS[1];
  if (YOUR_PERCENTILE >= 70) return TIERS[2];
  if (YOUR_PERCENTILE >= 50) return TIERS[3];
  return TIERS[4];
}

function percentileColor(p: number) {
  if (p >= 80) return "text-emerald-light";
  if (p >= 60) return "text-amber-light";
  return "text-content-secondary";
}

export default function LeaderboardPage() {
  const tier = getCurrentTier();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Community Intelligence
          </div>
          <h1 className="text-lg font-semibold text-content-primary mt-1">Investor Rankings</h1>
        </div>
        <div className="card-glass !p-3 flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-content-disabled uppercase tracking-wider">Your Rank</div>
            <div className="font-mono text-lg font-bold text-content-primary">#{YOUR_RANK.toLocaleString()}</div>
          </div>
          <div className="w-px h-8 bg-surface-border" />
          <div>
            <div className="text-[10px] text-content-disabled uppercase tracking-wider">Percentile</div>
            <div className="font-mono text-lg font-bold text-emerald-light">Top {100 - YOUR_PERCENTILE}%</div>
          </div>
        </div>
      </div>

      {/* Your Stats */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Your Stats
        </div>
        <div className="space-y-3">
          {YOUR_STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <span className="text-[13px] text-content-secondary w-36 shrink-0">{s.label}</span>
              <span className="font-mono text-sm font-semibold text-content-primary w-16 shrink-0">{s.value}</span>
              <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.percentile >= 80 ? "bg-emerald" : s.percentile >= 60 ? "bg-amber" : "bg-surface-elevated"}`}
                  style={{ width: `${s.percentile}%` }}
                />
              </div>
              <span className={`font-mono text-xs w-20 text-right ${percentileColor(s.percentile)}`}>
                Top {100 - s.percentile}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Investor Tiers */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" /> Investor Tiers
        </div>
        <div className="space-y-2">
          {TIERS.map((t) => {
            const isCurrent = t.name === tier.name;
            return (
              <div
                key={t.name}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrent ? "bg-gold-muted/50 border border-gold/20" : "bg-white/[0.02] border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${t.color}`}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-content-primary">{t.name}</span>
                    <span className="text-[11px] text-content-disabled font-mono">{t.range}</span>
                    {isCurrent && <span className="badge-gold">YOU</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-content-tertiary">
                    <span>Avg <span className="font-mono text-content-secondary">{t.avgCap}</span> cap</span>
                    <span className="text-content-disabled">|</span>
                    <span>Avg <span className="font-mono text-content-secondary">{t.avgCashFlow}</span></span>
                  </div>
                </div>
                {isCurrent && <ArrowUpRight className="w-4 h-4 text-gold-light shrink-0" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* How To Level Up */}
      <section className="card-gold">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-gold-light" /> How To Level Up
        </div>
        <div className="space-y-2.5">
          {LEVEL_UP.map((l) => (
            <div key={l.text} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.03]">
              <ChevronRight className="w-3.5 h-3.5 text-gold-light mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] text-content-secondary">{l.text}</p>
                <p className="text-[11px] text-content-disabled font-mono mt-0.5">{l.metric}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-content-tertiary mt-3 leading-relaxed">
          All rankings are anonymous. You see your percentile — never other investors&apos; identities or specific portfolio details.
        </p>
      </section>
    </div>
  );
}
