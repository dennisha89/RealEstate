"use client";

import Link from "next/link";
import { GitMerge, ArrowUpRight, Info } from "lucide-react";

// --- MOCK DATA ---
type MarketConsensus = {
  market: string;
  watchers: number;
  buyPct: number;
  sentiment: "Bullish" | "Mixed" | "Neutral" | "Bearish";
  userAgrees: boolean | null;
  slug: string;
};

const MARKETS: MarketConsensus[] = [
  { market: "Raleigh, NC", watchers: 128, buyPct: 81, sentiment: "Bullish", userAgrees: true, slug: "raleigh-nc" },
  { market: "Austin, TX", watchers: 203, buyPct: 73, sentiment: "Bullish", userAgrees: true, slug: "austin-tx" },
  { market: "Charlotte, NC", watchers: 87, buyPct: 68, sentiment: "Mixed", userAgrees: null, slug: "charlotte-nc" },
  { market: "Nashville, TN", watchers: 94, buyPct: 54, sentiment: "Mixed", userAgrees: null, slug: "nashville-tn" },
  { market: "Tampa, FL", watchers: 76, buyPct: 45, sentiment: "Neutral", userAgrees: null, slug: "tampa-fl" },
  { market: "Columbus, OH", watchers: 52, buyPct: 62, sentiment: "Mixed", userAgrees: true, slug: "columbus-oh" },
  { market: "Phoenix, AZ", watchers: 61, buyPct: 28, sentiment: "Bearish", userAgrees: true, slug: "phoenix-az" },
  { market: "Denver, CO", watchers: 43, buyPct: 35, sentiment: "Bearish", userAgrees: null, slug: "denver-co" },
  { market: "Detroit, MI", watchers: 38, buyPct: 55, sentiment: "Mixed", userAgrees: false, slug: "detroit-mi" },
];

const CONTRARIAN_SCORE = 12;
const AGREE_PCT = 88;

function sentimentDot(s: MarketConsensus["sentiment"]) {
  if (s === "Bullish") return "bg-emerald";
  if (s === "Bearish") return "bg-rose";
  return "bg-amber";
}

function sentimentBadge(s: MarketConsensus["sentiment"]) {
  if (s === "Bullish") return "badge-emerald";
  if (s === "Bearish") return "badge-rose";
  return "badge-amber";
}

function buyPctColor(pct: number) {
  if (pct >= 70) return "text-emerald-light";
  if (pct >= 50) return "text-amber-light";
  return "text-rose-light";
}

function agreeLabel(v: boolean | null) {
  if (v === true) return <span className="badge-accent">AGREE</span>;
  if (v === false) return <span className="badge-rose">DISAGREE</span>;
  return <span className="text-[11px] text-content-disabled font-mono">--</span>;
}

export default function ConsensusPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Community Intelligence
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Market Consensus</h1>
        <p className="text-[13px] text-content-tertiary mt-1">
          Where the crowd stands on each market — and where you diverge.
        </p>
      </div>

      {/* Consensus Table */}
      <section className="card">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider">
                <th className="text-left font-medium pb-3 pr-4">Market</th>
                <th className="text-right font-medium pb-3 px-3">Watchers</th>
                <th className="text-right font-medium pb-3 px-3">Consensus</th>
                <th className="text-center font-medium pb-3 px-3">Sentiment</th>
                <th className="text-center font-medium pb-3 pl-3">You</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {MARKETS.map((m) => (
                <tr key={m.market} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 pr-4">
                    <Link href={`/dashboard/markets/${m.slug}`}
                      className="flex items-center gap-1.5 font-medium text-content-primary group-hover:text-accent-light transition-colors">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${sentimentDot(m.sentiment)}`} />
                      {m.market}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-content-secondary">{m.watchers}</td>
                  <td className={`py-3 px-3 text-right font-mono font-semibold ${buyPctColor(m.buyPct)}`}>
                    {m.buyPct}% BUY
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={sentimentBadge(m.sentiment)}>{m.sentiment}</span>
                  </td>
                  <td className="py-3 pl-3 text-center">{agreeLabel(m.userAgrees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Consensus Bar Visualization */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium">
          Consensus Distribution
        </div>
        <div className="space-y-2.5">
          {MARKETS.map((m) => (
            <div key={m.market} className="flex items-center gap-3">
              <span className="text-[12px] text-content-secondary w-28 shrink-0 truncate">{m.market}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.buyPct >= 70 ? "bg-emerald" : m.buyPct >= 50 ? "bg-amber" : "bg-rose"}`}
                  style={{ width: `${m.buyPct}%` }}
                />
              </div>
              <span className={`font-mono text-[11px] w-12 text-right ${buyPctColor(m.buyPct)}`}>
                {m.buyPct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Contrarian Score */}
      <section className="card-accent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
            <GitMerge className="w-5 h-5 text-accent-light" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">Your Contrarian Score</span>
              <span className="font-mono text-lg font-bold text-accent-light">{CONTRARIAN_SCORE}%</span>
            </div>
            <p className="text-[13px] text-content-secondary">
              You agree with the crowd on <span className="font-mono font-semibold text-content-primary">{AGREE_PCT}%</span> of markets.
            </p>
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03]">
              <Info className="w-3.5 h-3.5 text-amber-light mt-0.5 shrink-0" />
              <p className="text-[11px] text-content-tertiary leading-relaxed">
                The best opportunities are often where you disagree with the majority — if your data supports it.
                High contrarian scores correlate with above-average returns when backed by rigorous analysis.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
