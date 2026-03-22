"use client";

import { useState, useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutGrid, List, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronRight, MapPin, Clock,
  Zap, AlertTriangle, Landmark,
  ArrowRight,
} from "lucide-react";
import { CHART_COLORS, generateTimeSeries } from "@/components/charts/ChartTheme";
import { Term } from "@/components/shared/Term";
import { StoryFlow, type StoryStep } from "@/components/shared/StoryFlow";
import { StoryChapter } from "@/components/shared/StoryChapter";
import { StoryAction } from "@/components/shared/StoryAction";
import type {
  LineChart as LineChartType,
  Line as LineType,
  ResponsiveContainer as RCType,
} from "recharts";

// ─── Lazy-loaded charts ───────────────────────────────────────────────────────
const MultiDimensionalExplorer = dynamic(
  () => import("@/components/charts/MultiDimensionalExplorer").then(m => ({ default: m.MultiDimensionalExplorer })),
  { ssr: false, loading: () => <div className="skeleton h-[500px] rounded-xl" /> }
);

// ─── Lazy-loaded sparkline ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LineChart = dynamic(() => import("recharts").then((m) => ({ default: m.LineChart })) as any, { ssr: false }) as typeof LineChartType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Line = dynamic(() => import("recharts").then((m) => ({ default: m.Line })) as any, { ssr: false }) as typeof LineType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RC = dynamic(() => import("recharts").then((m) => ({ default: m.ResponsiveContainer })) as any, { ssr: false }) as typeof RCType;

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "Discovered" | "Analyzing" | "Offer" | "Contract" | "Closed" | "Passed";

interface Deal {
  id: string;
  address: string;
  city: string;
  state: string;
  stage: Stage;
  price: number;
  capRate: number;
  cashFlow: number;
  score: number;
  daysInStage: number;
  context: string;
}

interface CityGroup {
  city: string;
  state: string;
  marketScore: number;
  marketVerdict: "BUY" | "HOLD" | "AVOID";
  sparkData: { v: number }[];
  deals: Deal[];
}

// ─── Sample data ──────────────────────────────────────────────────────────────

// id / address / city / state / stage / price / capRate / cashFlow / score / daysInStage / context
type DealTuple = [string, string, string, string, Stage, number, number, number, number, number, string];
const RAW: DealTuple[] = [
  ["d1","4821 N 18th Ave","Phoenix","AZ","Analyzing",385000,7.2,620,81,3,"Cap rate 7.2% in a BUY market → strong position vs 5.8% MSA avg"],
  ["d2","1103 W Fillmore St","Phoenix","AZ","Offer",415000,6.8,490,74,7,"Offer pending — 6.8% cap beats market avg; monitor competing offers"],
  ["d3","7704 S 35th Ln","Phoenix","AZ","Discovered",298000,8.1,840,88,1,"8.1% cap rate + low supply → top-quintile signal convergence"],
  ["d4","3312 E Camelback Rd","Phoenix","AZ","Contract",525000,5.9,310,68,12,"Under contract — DSCR 1.28x; rate lock expires in 21 days"],
  ["d5","2240 Pecos St","Denver","CO","Analyzing",472000,5.4,185,62,5,"Mixed signal: strong employment but 9.1 months supply → caution"],
  ["d6","980 S Clarkson St","Denver","CO","Passed",610000,4.1,-240,38,2,"Passed — negative cash flow and price-to-rent above 2σ threshold"],
  ["d7","5519 E Colfax Ave","Denver","CO","Discovered",389000,6.3,410,71,2,"New listing — 6.3% cap in a tightening market; permits down 18% YoY"],
  ["d8","1602 Live Oak St","Dallas","TX","Closed",342000,7.8,710,85,0,"Closed Mar 3 — 7.8% cap, $710/mo cash flow. Beat pro forma by 6%"],
  ["d9","4401 Maple Ave","Dallas","TX","Offer",278000,8.4,890,91,4,"Top-scored deal in portfolio — 8.4% cap, 4 bullish signals converging"],
];
const SAMPLE_DEALS: Deal[] = RAW.map(([id,address,city,state,stage,price,capRate,cashFlow,score,daysInStage,context]) => ({
  id,address,city,state,stage,price,capRate,cashFlow,score,daysInStage,context,
}));

const CITY_META: Record<string, { score: number; verdict: "BUY"|"HOLD"|"AVOID"; seed: number }> = {
  Phoenix: { score: 82, verdict: "BUY",  seed: 10 },
  Denver:  { score: 63, verdict: "HOLD", seed: 20 },
  Dallas:  { score: 88, verdict: "BUY",  seed: 30 },
};

function buildCityGroups(deals: Deal[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const deal of deals) {
    const key = `${deal.city},${deal.state}`;
    if (!map.has(key)) {
      const meta = CITY_META[deal.city] ?? { score: 70, verdict: "HOLD" as const, seed: 42 };
      map.set(key, {
        city: deal.city, state: deal.state,
        marketScore: meta.score, marketVerdict: meta.verdict,
        sparkData: generateTimeSeries(12, 100, 4, 0.03, meta.seed).map((d) => ({ v: d.value })),
        deals: [],
      });
    }
    map.get(key)!.deals.push(deal);
  }
  return Array.from(map.values());
}

const STAGES: Stage[] = ["Discovered", "Analyzing", "Offer", "Contract", "Closed", "Passed"];

const STAGE_META: Record<Stage, { color: string; bg: string; border: string }> = {
  Discovered: { color: "text-content-secondary", bg: "bg-surface-elevated", border: "border-surface-border" },
  Analyzing:  { color: "text-amber",             bg: "bg-amber/10",          border: "border-amber/20" },
  Offer:      { color: "text-gold",              bg: "bg-gold/10",           border: "border-gold/20" },
  Contract:   { color: "text-emerald",           bg: "bg-emerald/10",        border: "border-emerald/20" },
  Closed:     { color: "text-emerald",           bg: "bg-emerald/15",        border: "border-emerald/30" },
  Passed:     { color: "text-rose",              bg: "bg-rose/10",           border: "border-rose/20" },
};

const VERDICT_META: Record<"BUY" | "HOLD" | "AVOID", { cls: string }> = {
  BUY:   { cls: "badge-emerald" },
  HOLD:  { cls: "badge-amber" },
  AVOID: { cls: "badge-rose" },
};

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
const fmtFull = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald";
  if (n >= 55) return "text-amber";
  return "text-rose";
}

function cashFlowColor(n: number): string {
  return n >= 0 ? "text-emerald" : "text-rose";
}

function sparkTrend(data: { v: number }[]): "up" | "down" | "flat" {
  if (data.length < 2) return "flat";
  const delta = data[data.length - 1]!.v - data[0]!.v;
  if (delta > 1) return "up";
  if (delta < -1) return "down";
  return "flat";
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CitySparkline({ data }: { data: { v: number }[] }) {
  const trend = sparkTrend(data);
  const color = trend === "up" ? CHART_COLORS.emerald : trend === "down" ? CHART_COLORS.rose : CHART_COLORS.text;
  return (
    <div className="w-16 h-8 flex-shrink-0" aria-hidden="true">
      <RC width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </RC>
    </div>
  );
}

function StagePill({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${m.bg} ${m.color} ${m.border} whitespace-nowrap`}>
      {stage}
    </span>
  );
}

function DealRow({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        role="row"
        className="grid items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-elevated/60 cursor-pointer transition-colors duration-150 text-[12px]"
        style={{ gridTemplateColumns: "1fr 90px 72px 68px 72px 40px 48px 16px" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {/* Address */}
        <span className="text-content-primary font-medium truncate">{deal.address}</span>
        {/* Stage */}
        <span><StagePill stage={deal.stage} /></span>
        {/* Price */}
        <span className="font-mono tabular-nums text-content-secondary text-right">{fmt.format(deal.price)}</span>
        {/* Cap Rate */}
        <span className="font-mono tabular-nums text-content-primary text-right">{deal.capRate.toFixed(1)}%</span>
        {/* Cash Flow */}
        <span className={`font-mono tabular-nums text-right ${cashFlowColor(deal.cashFlow)}`}>
          {deal.cashFlow >= 0 ? "+" : ""}{fmt.format(deal.cashFlow)}/mo
        </span>
        {/* Score */}
        <span className={`font-mono tabular-nums font-bold text-right ${scoreColor(deal.score)}`}>{deal.score}</span>
        {/* Days */}
        <span className="text-content-tertiary text-right flex items-center justify-end gap-0.5">
          <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {deal.daysInStage}d
        </span>
        {/* Expand */}
        <ChevronRight className={`w-3.5 h-3.5 text-content-tertiary transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-2.5 pt-0.5 text-[11px] text-content-secondary italic border-l-2 border-gold/30 ml-3">
              {deal.context}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CityGroupCard({ group }: { group: CityGroup }) {
  const [collapsed, setCollapsed] = useState(false);
  const trend = sparkTrend(group.sparkData);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald" : trend === "down" ? "text-rose" : "text-content-tertiary";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="card mb-3"
    >
      {/* City header */}
      <button className="w-full flex items-center gap-3 cursor-pointer" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed}>
        <MapPin className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0" aria-hidden="true" />
        <span className="text-[14px] font-semibold text-content-primary">{group.city}</span>
        <span className="text-[11px] text-content-tertiary">{group.state}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${VERDICT_META[group.marketVerdict].cls}`}
          title="Market signal based on 5-signal convergence model"
        >
          {group.marketVerdict}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-content-secondary">
          <Term id="convergence" value={group.marketScore}>Score</Term>{" "}
          <span className={scoreColor(group.marketScore)}>{group.marketScore}</span>
        </span>
        <span className="text-[11px] text-content-tertiary">{group.deals.length} deal{group.deals.length !== 1 ? "s" : ""}</span>
        <TrendIcon className={`w-3.5 h-3.5 ${trendColor} ml-auto flex-shrink-0`} aria-hidden="true" />
        <CitySparkline data={group.sparkData} />
        <ChevronDown className={`w-3.5 h-3.5 text-content-tertiary flex-shrink-0 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} aria-hidden="true" />
      </button>

      {/* Deal rows */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Column headers */}
            <div
              className="grid px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-content-tertiary border-t border-surface-border mt-3 gap-2"
              style={{ gridTemplateColumns: "1fr 90px 72px 68px 72px 40px 48px 16px" }}
              role="rowgroup"
              aria-label="Column headers"
            >
              <span>Address</span>
              <span>Stage</span>
              <span className="text-right">Price</span>
              <span className="text-right">
                <Term id="cap-rate">Cap Rate</Term>
              </span>
              <span className="text-right">
                <Term id="coc">Cash Flow</Term>
              </span>
              <span className="text-right">
                <Term id="convergence">Score</Term>
              </span>
              <span className="text-right">Age</span>
              <span />
            </div>

            <div role="table" aria-label={`Deals in ${group.city}`} className="flex flex-col gap-0.5">
              {group.deals.map((deal) => (
                <DealRow key={deal.id} deal={deal} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ stage, deals }: { stage: Stage; deals: Deal[] }) {
  const m = STAGE_META[stage];
  return (
    <div className="flex flex-col min-w-[192px] flex-1">
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border ${m.bg} ${m.border}`}>
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${m.color}`}>{stage}</span>
        <span className={`text-[10px] font-mono tabular-nums ${m.color} opacity-70`}>{deals.length}</span>
      </div>
      <div className={`flex flex-col gap-2 p-2 rounded-b-xl bg-surface-card border-x border-b ${m.border} min-h-[120px]`}>
        {deals.length === 0 && <p className="text-[11px] text-content-disabled text-center py-4">No deals</p>}
        {deals.map((d) => (
          <motion.div key={d.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}
            className="rounded-lg bg-surface-elevated border border-surface-border p-2.5 cursor-pointer hover:border-gold/20 transition-colors duration-150">
            <p className="text-[12px] text-content-primary font-medium truncate mb-1">{d.address}</p>
            <p className="text-[10px] text-content-tertiary mb-2">{d.city}, {d.state}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tabular-nums text-content-secondary">{fmt.format(d.price)}</span>
              <span className="text-[11px] font-mono tabular-nums text-gold">{d.capRate.toFixed(1)}%</span>
              <span className={`text-[11px] font-mono tabular-nums font-bold ml-auto ${scoreColor(d.score)}`}>{d.score}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ deals }: { deals: Deal[] }) {
  const TH = "section-label text-left py-2 px-2 first:pl-0 last:pr-0 whitespace-nowrap";
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-[12px]" aria-label="All pipeline deals">
        <thead>
          <tr className="border-b border-surface-border">
            {(["Address","City","Stage"] as const).map((h) => (
              <th key={h} scope="col" className={TH}>{h}</th>
            ))}
            <th scope="col" className={TH}>Price</th>
            <th scope="col" className={TH}>
              <Term id="cap-rate">Cap Rate</Term>
            </th>
            <th scope="col" className={TH}>
              <Term id="coc">Cash Flow</Term>
            </th>
            <th scope="col" className={TH}>
              <Term id="convergence">Score</Term>
            </th>
            <th scope="col" className={TH}>Days</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d) => (
            <tr key={d.id} className="border-b border-surface-border/50 hover:bg-surface-elevated/40 transition-colors duration-100">
              <td className="py-2 px-2 pl-0 text-content-primary font-medium whitespace-nowrap">{d.address}</td>
              <td className="py-2 px-2 text-content-secondary whitespace-nowrap">{d.city}, {d.state}</td>
              <td className="py-2 px-2"><StagePill stage={d.stage} /></td>
              <td className="py-2 px-2 font-mono tabular-nums text-content-secondary text-right" aria-label={fmtFull.format(d.price)}>{fmt.format(d.price)}</td>
              <td className="py-2 px-2 font-mono tabular-nums text-content-primary text-right">{d.capRate.toFixed(1)}%</td>
              <td className={`py-2 px-2 font-mono tabular-nums text-right ${cashFlowColor(d.cashFlow)}`}>{d.cashFlow >= 0 ? "+" : ""}{fmt.format(d.cashFlow)}/mo</td>
              <td className={`py-2 px-2 font-mono tabular-nums font-bold text-right ${scoreColor(d.score)}`} aria-label={`Score ${d.score} of 100`}>{d.score}</td>
              <td className="py-2 px-2 pr-0 font-mono tabular-nums text-content-tertiary text-right">{d.daysInStage}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Deal Velocity Dashboard ──────────────────────────────────────────────────

const MARKET_DOM: Record<string, number> = {
  Phoenix: 15, Denver: 22, Dallas: 12, Austin: 11, Tampa: 14,
  Nashville: 9, Charlotte: 13, Atlanta: 16, default: 14,
};

function DealVelocityDashboard({ deals }: { deals: Deal[] }) {
  const activeDealData = deals
    .filter(d => d.stage !== "Closed" && d.stage !== "Passed")
    .map(d => {
      const marketAvg = MARKET_DOM[d.city] ?? MARKET_DOM.default ?? 14;
      return {
        address: d.address,
        city: d.city,
        daysInStage: d.daysInStage,
        marketAvg,
        overdue: d.daysInStage > marketAvg,
      };
    });

  if (activeDealData.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-gold" aria-hidden="true" />
          <span className="section-label">Deal Velocity</span>
        </div>
        <p className="text-[12px] text-content-disabled text-center py-6">No active deals to track.</p>
      </div>
    );
  }

  const maxBar = Math.max(...activeDealData.map(d => Math.max(d.daysInStage, d.marketAvg) * 1.5));

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-gold" aria-hidden="true" />
        <span className="section-label">Deal Velocity</span>
        <span className="text-[10px] text-content-disabled ml-auto">
          Your time vs market average <Term id="dom">DOM</Term>
        </span>
      </div>
      <div className="space-y-3">
        {activeDealData.map(d => (
          <div key={d.address} className="flex items-center gap-3">
            <span
              className="text-[11px] text-content-secondary w-24 truncate shrink-0"
              title={d.address}
            >
              {d.address}
            </span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-content-disabled w-16 shrink-0">You: {d.daysInStage}d</span>
                <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (d.daysInStage / maxBar) * 100)}%`,
                      backgroundColor: d.overdue ? "#EF4444" : "#C9A227",
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-content-disabled w-16 shrink-0">Avg: {d.marketAvg}d</span>
                <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/10"
                    style={{ width: `${Math.min(100, (d.marketAvg / maxBar) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${d.overdue ? "text-rose bg-rose/10" : "text-emerald bg-emerald/10"}`}
              aria-label={d.overdue ? "Overdue" : "On track"}
            >
              {d.overdue ? "LATE" : "OK"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-content-disabled mt-3 pt-3 border-t border-surface-border italic">
        Based on median days-on-market by metro. Deals that exceed the market average face increased competition risk.
      </p>
    </div>
  );
}

// ─── Opportunity Cost Tracker ─────────────────────────────────────────────────

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});

function OpportunityCostTracker({ deals }: { deals: Deal[] }) {
  const actionableDeals = deals.filter(d =>
    d.cashFlow > 0 &&
    d.stage !== "Offer" &&
    d.stage !== "Contract" &&
    d.stage !== "Closed"
  );

  const totalDailyLoss = actionableDeals.reduce((sum, d) =>
    sum + Math.round(d.cashFlow / 30), 0
  );

  if (actionableDeals.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />
          <span className="section-label">Opportunity Cost</span>
        </div>
        <p className="text-[12px] text-content-disabled text-center py-6">
          No cash-flow-positive deals sitting idle.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />
        <span className="section-label">Opportunity Cost</span>
      </div>

      {/* Big number */}
      <div className="text-center mb-4">
        <p
          className="font-mono text-3xl font-bold text-amber tabular-nums"
          aria-label={`${fmtMoney.format(totalDailyLoss)} per day in potential income`}
        >
          {fmtMoney.format(totalDailyLoss)}/day
        </p>
        <p className="text-[11px] text-content-tertiary mt-1">
          potential income sitting in your pipeline
        </p>
      </div>

      <div className="space-y-2">
        {actionableDeals.map(d => {
          const daily = Math.round(d.cashFlow / 30);
          const missed = daily * d.daysInStage;
          return (
            <div key={d.id} className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-content-secondary truncate w-28" title={d.address}>{d.address}</span>
              <span className="font-mono text-amber tabular-nums shrink-0">{fmtMoney.format(daily)}/d</span>
              <span className="font-mono text-rose tabular-nums shrink-0">({fmtMoney.format(missed)})</span>
              <span className="text-content-disabled shrink-0">{d.daysInStage}d</span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-content-disabled mt-3 pt-3 border-t border-surface-border italic">
        Every day a cash-flow-positive deal sits in your pipeline is a day of rental income you&apos;re not collecting.
      </p>
    </div>
  );
}

// ─── Portfolio Impact Preview ─────────────────────────────────────────────────

function PortfolioImpactPreview({ deals }: { deals: Deal[] }) {
  const bestDeal = deals
    .filter(d => d.stage !== "Closed" && d.stage !== "Passed")
    .sort((a, b) => b.score - a.score)[0];

  if (!bestDeal) return null;

  const before = { cf: 3450, dscr: 1.28, properties: 4, markets: 3 };
  const after = {
    cf: before.cf + bestDeal.cashFlow,
    dscr: parseFloat((before.dscr + 0.03).toFixed(2)),
    properties: before.properties + 1,
    markets: ["Phoenix", "Denver", "Dallas"].includes(bestDeal.city) ? before.markets : before.markets + 1,
  };

  const metrics: { label: string | ReactNode; before: string; after: string; positive: boolean }[] = [
    {
      label: <><Term id="coc">Monthly CF</Term></>,
      before: fmtMoney.format(before.cf),
      after: fmtMoney.format(after.cf),
      positive: after.cf > before.cf,
    },
    {
      label: <>Portfolio <Term id="dscr" value={after.dscr}>DSCR</Term></>,
      before: `${before.dscr.toFixed(2)}x`,
      after: `${after.dscr.toFixed(2)}x`,
      positive: true,
    },
    {
      label: "Properties",
      before: String(before.properties),
      after: String(after.properties),
      positive: true,
    },
    {
      label: "Markets",
      before: String(before.markets),
      after: String(after.markets),
      positive: after.markets > before.markets,
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald" aria-hidden="true" />
        <span className="section-label truncate" title={`If You Close ${bestDeal.address}`}>
          If You Close {bestDeal.address}
        </span>
      </div>
      <div className="space-y-2">
        {metrics.map((m, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-[11px] text-content-tertiary">{m.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-content-disabled tabular-nums">{m.before}</span>
              <span className="text-[10px] text-content-disabled" aria-hidden="true">→</span>
              <span
                className={`font-mono text-[11px] font-bold tabular-nums ${m.positive ? "text-emerald" : "text-content-primary"}`}
                aria-label={`was ${m.before}, will be ${m.after}`}
              >
                {m.after}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-content-disabled mt-3 pt-3 border-t border-surface-border italic">
        Portfolio impact preview based on current holdings + this acquisition.
      </p>
    </div>
  );
}

// ─── Financing Window ─────────────────────────────────────────────────────────

function FinancingWindow({ deals }: { deals: Deal[] }) {
  const currentRate = 6.85;
  const perBps = 14.5; // ~$14.50/mo per 25bps on a $300K loan
  const basePayment = 2040;

  const scenarios = [
    { label: "-25bp", rate: currentRate - 0.25, delta: -0.25 },
    { label: "Today", rate: currentRate, delta: 0 },
    { label: "+25bp", rate: currentRate + 0.25, delta: 0.25 },
    { label: "+50bp", rate: currentRate + 0.50, delta: 0.50 },
  ];

  const topDeal = deals.find(d => d.cashFlow > 0 && d.stage !== "Closed" && d.stage !== "Passed");
  if (!topDeal) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="w-4 h-4 text-gold" aria-hidden="true" />
        <span className="section-label truncate" title={`Rate Sensitivity — ${topDeal.address}`}>
          Rate Sensitivity — {topDeal.address}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {scenarios.map(s => {
          const payment = Math.round(basePayment + (s.delta / 0.25) * perBps);
          const cf = Math.round(topDeal.cashFlow - (s.delta / 0.25) * perBps);
          const isToday = s.delta === 0;
          return (
            <div
              key={s.label}
              className={`p-2 rounded-lg border text-center ${isToday ? "border-gold/30 bg-gold/5" : "border-surface-border"}`}
            >
              <p className="text-[10px] text-content-disabled mb-1">{s.label}</p>
              <p className="font-mono text-[13px] font-bold text-content-primary tabular-nums">{s.rate.toFixed(2)}%</p>
              <p className="font-mono text-[10px] text-content-tertiary">${payment.toLocaleString()}/mo</p>
              <p
                className={`font-mono text-[10px] font-bold tabular-nums ${cf >= 0 ? "text-emerald" : "text-rose"}`}
                aria-label={`Cash flow at ${s.rate.toFixed(2)} percent: ${fmtMoney.format(cf)} per month`}
              >
                <Term id="coc">CF</Term>: {cf >= 0 ? "" : "-"}${Math.abs(cf).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-content-disabled mt-3 pt-3 border-t border-surface-border italic">
        Each 25bp rate increase costs ~${Math.round(perBps)}/mo on a $300K loan. Lock your rate before the next Fed meeting.
      </p>
    </div>
  );
}

// ─── AI Insight Strip ─────────────────────────────────────────────────────────

function AiInsightStrip({ summary, confidence, sources }: {
  summary: string;
  confidence: "high" | "medium" | "low";
  sources: string[];
}) {
  const confidenceColor = confidence === "high"
    ? "text-emerald"
    : confidence === "medium"
    ? "text-amber"
    : "text-rose";

  return (
    <div
      className="card-glass border border-gold/10 rounded-xl p-4 flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold">AI Analysis</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${confidenceColor}`}>
          {confidence} confidence
        </span>
        <span className="text-[10px] text-content-disabled ml-auto italic">
          {sources.join(" · ")}
        </span>
      </div>
      <p className="text-[12px] text-content-secondary leading-relaxed">{summary}</p>
      <p className="text-[10px] text-content-disabled italic">
        AI analysis is informational only — not financial advice.
      </p>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS: StoryStep[] = [
  { id: "portfolio-health", label: "Portfolio Health" },
  { id: "active-deals",     label: "Active Deals" },
  { id: "next-steps",       label: "Next Steps" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "city" | "kanban" | "table";

export default function PipelinePage() {
  const [view, setView] = useState<ViewMode>("city");
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");

  const cityGroups = useMemo(() => buildCityGroups(SAMPLE_DEALS), []);

  const filteredDeals = useMemo(
    () => stageFilter === "All" ? SAMPLE_DEALS : SAMPLE_DEALS.filter((d) => d.stage === stageFilter),
    [stageFilter],
  );

  const filteredGroups = useMemo(() => {
    if (stageFilter === "All") return cityGroups;
    return cityGroups.map((g) => ({ ...g, deals: g.deals.filter((d) => d.stage === stageFilter) }))
                     .filter((g) => g.deals.length > 0);
  }, [cityGroups, stageFilter]);

  const stats = useMemo(() => {
    const active = SAMPLE_DEALS.filter((d) => d.stage !== "Closed" && d.stage !== "Passed");
    return {
      active: active.length,
      totalValue: active.reduce((s, d) => s + d.price, 0),
      avgScore: Math.round(SAMPLE_DEALS.reduce((s, d) => s + d.score, 0) / SAMPLE_DEALS.length),
      avgCap: (active.reduce((s, d) => s + d.capRate, 0) / active.length).toFixed(1),
    };
  }, []);

  const activeDeals = SAMPLE_DEALS.filter(d => d.stage !== "Closed" && d.stage !== "Passed");
  const overdueCount = activeDeals.filter(d => d.daysInStage > (MARKET_DOM[d.city] ?? MARKET_DOM.default ?? 14)).length;
  const cashFlowPositive = activeDeals.filter(d => d.cashFlow > 0).length;
  const uniqueMarkets = new Set(activeDeals.map(d => d.city)).size;

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6">
      <StoryFlow
        steps={STEPS}
        narratorLine="Track deals from discovery to close. Every day you wait is cash flow you're not collecting."
      >

        {/* ── Chapter 0: Portfolio Health — summary stats ── */}
        <StoryChapter
          index={0}
          id="portfolio-health"
          aiIntro={`Your pipeline has ${activeDeals.length} active deals across ${uniqueMarkets} market${uniqueMarkets !== 1 ? "s" : ""}. ${overdueCount > 0 ? `${overdueCount} deal${overdueCount !== 1 ? "s have" : " has"} been sitting longer than the market average — the market doesn't wait.` : "All deals are moving at market pace."} ${cashFlowPositive} deal${cashFlowPositive !== 1 ? "s are" : " is"} cash-flow positive and ready to advance.`}
        >
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-[22px] font-bold text-content-primary font-display">Pipeline</h1>
              <p className="text-[13px] text-content-secondary mt-0.5">Track deals by city — from discovery to close</p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4">
              {([
                ["Active", String(stats.active), "text-content-primary"],
                ["Pipeline Value", fmt.format(stats.totalValue), "text-content-primary"],
                ["Avg Score", String(stats.avgScore), scoreColor(stats.avgScore)],
                ["Avg Cap Rate", `${stats.avgCap}%`, "text-content-primary"],
              ] as const).map(([label, value, color]) => (
                <div key={label} className="flex flex-col items-end">
                  <span className={`text-[15px] font-semibold font-mono tabular-nums ${color}`}>{value}</span>
                  <span className="section-label">
                    {label === "Avg Cap Rate" ? (
                      <><Term id="cap-rate">Avg Cap Rate</Term></>
                    ) : label === "Avg Score" ? (
                      <><Term id="convergence">Avg Score</Term></>
                    ) : (
                      label
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Predictive Intelligence row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <DealVelocityDashboard deals={SAMPLE_DEALS} />
            <OpportunityCostTracker deals={SAMPLE_DEALS} />
          </div>

          {/* Predictive Intelligence row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <PortfolioImpactPreview deals={SAMPLE_DEALS} />
            <FinancingWindow deals={SAMPLE_DEALS} />
          </div>

          {/* AI Insight Strip */}
          <AiInsightStrip
            summary={`Your pipeline has ${activeDeals.length} active deals across ${uniqueMarkets} market${uniqueMarkets !== 1 ? "s" : ""}. ${overdueCount > 0 ? `${overdueCount} deal${overdueCount !== 1 ? "s have" : " has"} been sitting longer than the market average — the market doesn't wait.` : "All deals are moving at market pace."} ${cashFlowPositive} deal${cashFlowPositive !== 1 ? "s are" : " is"} cash-flow positive and ready to advance.`}
            confidence="high"
            sources={["Pipeline Engine", "Market Velocity Data"]}
          />
        </StoryChapter>

        {/* ── Chapter 1: Active Deals — deal list ── */}
        <StoryChapter
          index={1}
          id="active-deals"
          aiIntro="Your deals by city and stage. Click any deal row to see its AI analysis context."
        >
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-lg p-1">
              {([["city","By City",MapPin],["kanban","Kanban",LayoutGrid],["table","Table",List]] as const).map(([id,label,Icon]) => (
                <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-150 ${view===id?"bg-surface-elevated text-content-primary":"text-content-tertiary hover:text-content-secondary"}`}>
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["All",...STAGES] as const).map((s) => (
                <button key={s} onClick={() => setStageFilter(s)} aria-pressed={stageFilter===s}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 border ${stageFilter===s?"bg-gold/10 text-gold border-gold/30":"text-content-tertiary border-surface-border hover:text-content-secondary"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Views */}
          <AnimatePresence mode="wait">
            {view === "city" && (
              <motion.div key="city" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {filteredGroups.length === 0 ? (
                  <div className="card text-center py-12 text-content-tertiary text-[13px]">No deals match this filter.</div>
                ) : (
                  filteredGroups.map((g) => <CityGroupCard key={`${g.city}-${g.state}`} group={g} />)
                )}
              </motion.div>
            )}

            {view === "kanban" && (
              <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {STAGES.map((stage) => (
                    <KanbanColumn
                      key={stage}
                      stage={stage}
                      deals={filteredDeals.filter((d) => d.stage === stage)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {view === "table" && (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <TableView deals={filteredDeals} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Market Context — 4D Explorer for pipeline markets */}
          <div className="mt-6 card p-0 overflow-hidden">
            <div className="p-5 pb-2">
              <h2 className="text-sm font-semibold text-content-primary">
                Pipeline Market <span className="text-gold-light">Context</span>
              </h2>
              <p className="text-[11px] text-content-tertiary mt-0.5">
                Compare markets where your pipeline deals are located. See how they stack up across any 4 dimensions.
              </p>
            </div>
            <div className="overflow-hidden" style={{ height: 550 }}>
              <MultiDimensionalExplorer
                defaultCities={["Austin TX", "Tampa FL", "Nashville TN"]}
              />
            </div>
          </div>
        </StoryChapter>

        {/* ── Chapter 2: Next Steps — StoryAction ── */}
        <StoryChapter
          index={2}
          id="next-steps"
          showConnector={false}
        >
          <StoryAction
            intro="Based on your pipeline status:"
            recommendations={[
              overdueCount > 0
                ? `${overdueCount} deal${overdueCount !== 1 ? "s are" : " is"} overdue vs market pace — act before window closes.`
                : "All deals are moving at market pace. Keep momentum.",
              "Analyze new deals to keep your pipeline full — top markets are seeing 11-day close windows.",
              "Markets are signaling opportunity — explore before inventory tightens.",
            ]}
            actions={[
              {
                label: "Analyze a New Deal",
                href: "/dashboard/analyze",
                variant: "primary",
                icon: <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />,
              },
              {
                label: "Explore Markets",
                href: "/dashboard/markets",
                variant: "secondary",
              },
            ]}
          />
        </StoryChapter>

      </StoryFlow>
    </div>
  );
}
