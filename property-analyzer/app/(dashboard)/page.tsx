"use client";

import { useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight, Building2, Search, Zap, Shield, AlertTriangle, Compass, Waves } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CommunityPulse from "@/components/dashboard/CommunityPulse";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { formatCurrency } from "@/lib/utils/format";

type MarketDef = { name: string; state: string; zip: string; medianPrice: number; priceChange: number; capRate: number; popGrowth: number; jobGrowth: number; inventory: number; hyperScore: number; signal: "bullish" | "bearish" | "neutral" };
const ALL_MARKETS: MarketDef[] = [
  { name: "Austin", state: "TX", zip: "78701", medianPrice: 425000, priceChange: 5.2, capRate: 7.1, popGrowth: 3.8, jobGrowth: 4.2, inventory: 1.8, hyperScore: 82, signal: "bullish" },
  { name: "Nashville", state: "TN", zip: "37201", medianPrice: 385000, priceChange: 4.8, capRate: 6.5, popGrowth: 2.9, jobGrowth: 3.5, inventory: 2.1, hyperScore: 76, signal: "bullish" },
  { name: "Tampa", state: "FL", zip: "33601", medianPrice: 315000, priceChange: 3.1, capRate: 6.8, popGrowth: 2.5, jobGrowth: 2.8, inventory: 2.4, hyperScore: 68, signal: "neutral" },
  { name: "Phoenix", state: "AZ", zip: "85001", medianPrice: 365000, priceChange: -1.2, capRate: 5.8, popGrowth: 1.8, jobGrowth: 2.1, inventory: 3.2, hyperScore: 52, signal: "bearish" },
  { name: "Denver", state: "CO", zip: "80201", medianPrice: 520000, priceChange: 1.5, capRate: 5.2, popGrowth: 1.5, jobGrowth: 2.4, inventory: 2.8, hyperScore: 58, signal: "neutral" },
  { name: "Raleigh", state: "NC", zip: "27601", medianPrice: 380000, priceChange: 6.1, capRate: 6.9, popGrowth: 3.2, jobGrowth: 4.5, inventory: 1.6, hyperScore: 84, signal: "bullish" },
  { name: "Charlotte", state: "NC", zip: "28202", medianPrice: 355000, priceChange: 4.5, capRate: 6.3, popGrowth: 2.8, jobGrowth: 3.8, inventory: 2.0, hyperScore: 74, signal: "bullish" },
  { name: "Dallas", state: "TX", zip: "75201", medianPrice: 395000, priceChange: 3.8, capRate: 6.0, popGrowth: 2.4, jobGrowth: 3.2, inventory: 2.3, hyperScore: 70, signal: "neutral" },
  { name: "Atlanta", state: "GA", zip: "30301", medianPrice: 340000, priceChange: 4.0, capRate: 6.5, popGrowth: 2.6, jobGrowth: 3.0, inventory: 2.2, hyperScore: 72, signal: "bullish" },
  { name: "Las Vegas", state: "NV", zip: "89101", medianPrice: 385000, priceChange: 1.8, capRate: 5.5, popGrowth: 2.0, jobGrowth: 2.5, inventory: 2.9, hyperScore: 55, signal: "neutral" },
];
const confluenceScore = (m: MarketDef) => m.hyperScore * 0.35 + m.capRate * 5 * 0.25 + m.jobGrowth * 8 * 0.20 + m.popGrowth * 8 * 0.10 + (5 - m.inventory) * 10 * 0.10;
const sampleProperties = [
  { id: "1", city: "Austin", state: "TX", currentValue: 312000, monthlyRent: 2100, monthlyExpenses: 450, mortgage: 1180, capRate: 7.2 },
  { id: "2", city: "Nashville", state: "TN", currentValue: 241000, monthlyRent: 1750, monthlyExpenses: 380, mortgage: 980, capRate: 6.5 },
  { id: "3", city: "Tampa", state: "FL", currentValue: 205000, monthlyRent: 1450, monthlyExpenses: 320, mortgage: 850, capRate: 5.8 },
  { id: "4", city: "Raleigh", state: "NC", currentValue: 298000, monthlyRent: 1900, monthlyExpenses: 480, mortgage: 1320, capRate: 4.2 },
];
const RATE_ENV = { mortgageRate: 6.95, delta: -0.12, fedFunds: 4.75, yieldCurve: "normal" as const };
const QUICK_ACTIONS = [
  { label: "\u5929\u6A5F Pathway", href: "/workflow", icon: Zap, desc: "Run full analysis", primary: true },
  { label: "\u7389\u77F3 Analyze", href: "/analyze", icon: Search, desc: "Single property", primary: false },
  { label: "\u9F8D\u7A74 Discover", href: "/discover", icon: Compass, desc: "Find markets", primary: false },
  { label: "\u5929\u6CB3 Rates", href: "/rates", icon: Waves, desc: "Rate monitor", primary: false },
];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const fmtDate = () => new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const sigVar = (s: "bullish"|"bearish"|"neutral") => s === "bullish" ? "success" as const : s === "bearish" ? "danger" as const : "neutral" as const;
const scoreClr = (n: number) => n >= 70 ? "text-money-400" : n >= 50 ? "text-gold-400" : "text-red-400";
const STATUS_CFG: Record<string, { label: string; color: string }> = { discovered: { label: "Discovered", color: "text-gray-400" }, analyzing: { label: "Analyzing", color: "text-blue-400" }, offer_pending: { label: "Offer Pending", color: "text-gold-400" }, under_contract: { label: "Under Contract", color: "text-emerald-400" }, closed: { label: "Closed", color: "text-emerald-400" }, passed: { label: "Passed", color: "text-gray-500" }, lost: { label: "Lost", color: "text-red-400" } };
export default function DashboardPage() {
  const topMarkets = useMemo(() => [...ALL_MARKETS].sort((a, b) => confluenceScore(b) - confluenceScore(a)).slice(0, 3), []);
  const portfolio = useMemo(() => {
    const tv = sampleProperties.reduce((s, p) => s + p.currentValue, 0);
    const cf = sampleProperties.reduce((s, p) => s + (p.monthlyRent - p.monthlyExpenses - p.mortgage), 0);
    const ac = sampleProperties.reduce((s, p) => s + p.capRate, 0) / sampleProperties.length;
    const gt = 1500000;
    return { totalValue: tv, cashFlow: cf, avgCap: ac, goalTarget: gt, goalPct: Math.min(100, Math.round((tv / gt) * 100)) };
  }, []);
  const bearish = useMemo(() => ALL_MARKETS.filter((m) => m.signal === "bearish"), []);
  const recentDeals = useDealPipelineStore((s) => s.getRecentDeals(3));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1: Hero */}
      <div className="pt-2">
        <span className="text-2xl text-gold-400 font-serif">{"\u7384"}</span>
        <h1 className="text-xl font-semibold text-gray-100 mt-1">{greeting()}. Here is today&apos;s reading.</h1>
        <p className="text-sm text-gray-500 mt-0.5">{fmtDate()}</p>
      </div>

      {/* 2: 天 Heaven — Rates */}
      <div className="bg-surface-card border border-blue-900/40 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gold-400">{"\u5929"}</span>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Heaven — Rate & Timing</h2>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">30yr Fixed</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-gray-100">{RATE_ENV.mortgageRate}%</span>
                <span className={`text-xs font-mono flex items-center gap-0.5 ${RATE_ENV.delta <= 0 ? "text-money-400" : "text-red-400"}`}>
                  {RATE_ENV.delta <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {RATE_ENV.delta > 0 ? "+" : ""}{RATE_ENV.delta}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Fed Funds</p>
              <p className="text-lg font-bold font-mono text-gray-200">{RATE_ENV.fedFunds}%</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Yield Curve</p>
              <Badge variant={RATE_ENV.yieldCurve === "normal" ? "success" : RATE_ENV.yieldCurve === "inverted" ? "danger" : "warning"}>
                {RATE_ENV.yieldCurve === "normal" ? "Normal" : RATE_ENV.yieldCurve === "inverted" ? "Inverted" : "Flat"}
              </Badge>
            </div>
          </div>
          <div className="flex items-start gap-2 md:max-w-sm">
            <Shield className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="text-gold-400">{"\u5929\u6642"} Heaven&apos;s Timing:</span> Rates stable — focus on deal quality
            </p>
          </div>
        </div>
      </div>

      {/* 3: 地 Earth — Dragon's Lairs + Guardian */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gold-400">{"\u5730"}</span>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{"\u9F8D\u7A74"} Dragon&apos;s Lairs</h3>
            </div>
            <div className="space-y-3">
              {topMarkets.map((m, i) => {
                const sc = Math.round(confluenceScore(m));
                return (
                  <Link key={m.zip} href={`/analysis/${m.zip}`} className="flex items-center gap-4 p-4 rounded-lg bg-surface-elevated border border-surface-border hover:border-money-700/50 transition-colors group">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-300">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{m.name}, {m.state}</span>
                        <Badge variant={sigVar(m.signal)} size="sm">{m.signal}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Cap <span className="font-mono text-money-400">{m.capRate}%</span></span>
                        <span>Jobs <span className="font-mono text-blue-400">+{m.jobGrowth}%</span></span>
                        <span className="hidden sm:inline">Inv <span className={`font-mono ${m.inventory <= 2 ? "text-money-400" : "text-gold-400"}`}>{m.inventory} mo</span></span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-lg font-bold font-mono ${scoreClr(sc)}`}>{sc}</p>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Score</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-money-400 transition-colors flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 text-right">
              <Link href="/markets" className="text-xs text-money-400 hover:text-money-300 transition-colors inline-flex items-center gap-1">
                View all {ALL_MARKETS.length} markets <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-gold-400" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{"\u8B77\u6CD5"} Guardian</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Red Flags</p>
              {bearish.length > 0 ? bearish.map((m) => (
                <div key={m.zip} className="flex items-center gap-2 p-2.5 rounded-lg bg-red-900/10 border border-red-900/20 mb-2 last:mb-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-gray-300">{m.name}, {m.state}</span>
                  <span className="text-xs font-mono text-red-400 ml-auto">{m.priceChange}%</span>
                </div>
              )) : <p className="text-xs text-gray-500">No red flags across watched markets</p>}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Model Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-money-400">78%</span>
                <span className="text-xs text-gray-500">last 90 days</span>
              </div>
              <div className="mt-2 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div className="h-full bg-money-500 rounded-full" style={{ width: "78%" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center p-2.5 rounded-lg bg-surface-elevated">
                <p className="text-lg font-bold font-mono text-money-400">{ALL_MARKETS.filter((m) => m.signal === "bullish").length}</p>
                <p className="text-[10px] text-gray-500">Bullish</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-surface-elevated">
                <p className="text-lg font-bold font-mono text-red-400">{bearish.length}</p>
                <p className="text-[10px] text-gray-500">Bearish</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4: 人 Human — Empire + Collective Vision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gold-400">{"\u4EBA"}</span>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{"\u5BB6\u696D"} Your Empire</h3>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
                <p className="text-lg font-bold font-mono text-gray-100">{formatCurrency(portfolio.totalValue)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cash Flow</p>
                <p className={`text-lg font-bold font-mono ${portfolio.cashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
                  {formatCurrency(portfolio.cashFlow)}<span className="text-xs text-gray-500 font-sans">/mo</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Cap</p>
                <p className="text-lg font-bold font-mono text-gold-400">{portfolio.avgCap.toFixed(1)}%</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Goal Progress</p>
                <span className="text-xs font-mono text-gray-400">{portfolio.goalPct}%</span>
              </div>
              <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-money-600 to-money-400 rounded-full transition-all" style={{ width: `${portfolio.goalPct}%` }} />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">{formatCurrency(portfolio.totalValue)} of {formatCurrency(portfolio.goalTarget)} target</p>
            </div>
            <div className="space-y-1.5">
              {sampleProperties.map((p) => {
                const cf = p.monthlyRent - p.monthlyExpenses - p.mortgage;
                return (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{p.city}, {p.state}</span>
                    </div>
                    <span className={`text-xs font-mono flex-shrink-0 ${cf >= 0 ? "text-money-400" : "text-red-400"}`}>
                      {cf >= 0 ? "+" : ""}{formatCurrency(cf)}/mo
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-right">
              <Link href="/portfolio" className="text-xs text-money-400 hover:text-money-300 transition-colors inline-flex items-center gap-1">
                Full portfolio <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Card>
        <CommunityPulse />
      </div>

      {/* 5: 聚寶盆 Pipeline */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gold-400">{"\u805A\u5BF6\u76C6"}</span>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pipeline</h3>
          </div>
          <Link href="/deals" className="text-xs text-money-400 hover:text-money-300 transition-colors inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {recentDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentDeals.map((d) => {
              const c = STATUS_CFG[d.status] ?? { label: d.status, color: "text-gray-400" };
              return (
                <div key={d.id} className="p-3 rounded-lg bg-surface-elevated border border-surface-border">
                  <p className="text-sm text-gray-200 truncate">{d.address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.market}, {d.state}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-mono font-semibold text-gray-100">{formatCurrency(d.price)}</span>
                    <span className={`text-[10px] font-semibold ${c.color}`}>{c.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">Your <span className="text-gold-400">{"\u805A\u5BF6\u76C6"}</span> Treasure Basin is empty. Start analyzing to fill it.</p>
          </div>
        )}
      </div>

      {/* 6: Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className={`flex items-center gap-3 p-4 bg-surface-card rounded-xl transition-colors group ${a.primary ? "border-2 border-emerald-700/50 hover:border-emerald-500/60 hover:bg-surface-elevated" : "border border-surface-border hover:border-money-700/50 hover:bg-surface-elevated"}`}>
              <div className="p-2 rounded-lg bg-money-900/30 group-hover:bg-money-900/50 transition-colors">
                <Icon className="h-4 w-4 text-money-500 group-hover:text-money-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{a.label}</p>
                <p className="text-xs text-gray-600">{a.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
