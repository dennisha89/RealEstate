"use client";

import Link from "next/link";
import {
  ArrowUpRight, ArrowDownRight, Search, Workflow, Scale, TrendingDown,
  ChevronRight, Clock, Briefcase,
} from "lucide-react";

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric",
});

const STATS = [
  { label: "Portfolio Value", value: "$1.06M", trend: "+2.3%", up: true },
  { label: "Monthly Cash Flow", value: "+$1,140", trend: "+$80", up: true },
  { label: "Avg Cap Rate", value: "6.5%", trend: "-0.1%", up: false },
  { label: "Active Deals", value: "3", trend: "in pipeline", up: null },
];

const MARKETS = [
  { name: "Austin, TX", score: 87, cap: "5.8%", signal: "Buy", trend: "Tech hiring +12% YoY" },
  { name: "Raleigh, NC", score: 84, cap: "6.2%", signal: "Buy", trend: "Pop growth top-5 metro" },
  { name: "Tampa, FL", score: 79, cap: "6.5%", signal: "Hold", trend: "Insurance costs rising" },
  { name: "Phoenix, AZ", score: 76, cap: "5.9%", signal: "Hold", trend: "Supply catching demand" },
  { name: "Nashville, TN", score: 74, cap: "5.4%", signal: "Hold", trend: "Rent growth slowing" },
  { name: "Detroit, MI", score: 71, cap: "8.1%", signal: "Watch", trend: "High yield, high risk" },
];

const PIPELINE = [
  { address: "1847 Oak Valley Dr, Austin", price: "$385,000", score: 82, status: "Analyzing", days: 2 },
  { address: "920 Magnolia Ln, Raleigh", price: "$312,000", score: 78, status: "Offer Pending", days: 7 },
  { address: "4501 Bay Shore Blvd, Tampa", price: "$445,000", score: 74, status: "Due Diligence", days: 12 },
];

const ACTIONS = [
  { label: "Analyze Property", desc: "Run 12-engine scoring", href: "/dashboard/analyze", icon: Search },
  { label: "Start Workflow", desc: "Guided investment path", href: "/dashboard/pathway", icon: Workflow },
  { label: "Compare Deals", desc: "Side-by-side analysis", href: "/dashboard/compare", icon: Scale },
  { label: "Check Rates", desc: "Live rate environment", href: "/dashboard/rates", icon: TrendingDown },
];

function signalBadge(s: string) {
  return s === "Buy" ? "badge-emerald" : s === "Hold" ? "badge-amber" : "badge-accent";
}
function scoreClr(n: number) {
  return n >= 80 ? "text-emerald-light" : n >= 70 ? "text-amber-light" : "text-rose-light";
}
function statusBadge(s: string) {
  return s === "Analyzing" ? "badge-accent" : s === "Offer Pending" ? "badge-amber" : "badge-emerald";
}

export default function DashboardHome() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-content-primary">{getGreeting()}</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">{today}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="card-glass">
            <div className="metric-label mb-1.5">{s.label}</div>
            <div className="metric-value text-xl">{s.value}</div>
            {s.up !== null ? (
              <div className={`flex items-center gap-1 mt-1 ${s.up ? "metric-trend-up" : "metric-trend-down"}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{s.trend}</span>
              </div>
            ) : (
              <div className="text-xs text-content-tertiary mt-1 font-mono">{s.trend}</div>
            )}
          </div>
        ))}
      </div>

      {/* Market Rankings + Rate Environment */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-content-primary">Market Rankings</h2>
            <Link href="/dashboard/markets" className="text-xs text-accent-light hover:text-accent transition-colors flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-content-disabled text-[11px] uppercase tracking-wider">
                  <th className="text-left font-medium pb-2 pr-4">Market</th>
                  <th className="text-right font-medium pb-2 px-3">Score</th>
                  <th className="text-right font-medium pb-2 px-3">Cap Rate</th>
                  <th className="text-center font-medium pb-2 px-3">Signal</th>
                  <th className="text-left font-medium pb-2 pl-3 hidden sm:table-cell">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {MARKETS.map((m) => (
                  <tr key={m.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-content-primary whitespace-nowrap">{m.name}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-semibold ${scoreClr(m.score)}`}>{m.score}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary">{m.cap}</td>
                    <td className="py-2.5 px-3 text-center"><span className={signalBadge(m.signal)}>{m.signal}</span></td>
                    <td className="py-2.5 pl-3 text-content-tertiary text-xs hidden sm:table-cell">{m.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-content-primary">Rate Environment</h2>
            <Link href="/dashboard/rates" className="text-xs text-accent-light hover:text-accent transition-colors flex items-center gap-0.5">
              View Analysis <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-content-secondary">30yr Fixed</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-content-primary text-[15px]">6.95%</span>
                <span className="metric-trend-down flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" />-0.03</span>
              </div>
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-content-secondary">Fed Funds</span>
              <span className="font-mono font-semibold text-content-primary text-[15px]">4.75%</span>
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-content-secondary">Yield Curve</span>
              <span className="badge-emerald">Normal</span>
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-content-secondary">Spread</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-content-primary text-[15px]">2.20%</span>
                <span className="badge-amber">Wide</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border">
            <p className="text-xs text-content-tertiary leading-relaxed">
              Rates stable — focus on deal quality over rate timing.
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-content-primary">Recent Pipeline</h2>
            <Link href="/dashboard/pipeline" className="text-xs text-accent-light hover:text-accent transition-colors flex items-center gap-0.5">
              View Pipeline <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {PIPELINE.length > 0 ? (
            <div className="space-y-2">
              {PIPELINE.map((d) => (
                <div key={d.address} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-content-primary truncate">{d.address}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-content-secondary">{d.price}</span>
                      <span className="text-content-disabled">·</span>
                      <span className={`font-mono text-xs font-semibold ${scoreClr(d.score)}`}>{d.score}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={statusBadge(d.status)}>{d.status}</span>
                    <span className="text-[11px] text-content-disabled flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />{d.days}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase className="w-8 h-8 text-content-disabled mb-2" />
              <p className="text-sm text-content-tertiary">Start analyzing to build your pipeline</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <h2 className="text-sm font-semibold text-content-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map((a) => (
              <Link key={a.href} href={a.href}
                className="flex flex-col gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-accent/20 transition-all group">
                <a.icon className="w-4 h-4 text-content-tertiary group-hover:text-accent-light transition-colors" />
                <div>
                  <div className="text-[13px] font-medium text-content-primary">{a.label}</div>
                  <div className="text-[11px] text-content-disabled mt-0.5">{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
