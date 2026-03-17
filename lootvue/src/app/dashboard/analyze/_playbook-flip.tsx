"use client";

import { useMemo } from "react";
import {
  Hammer, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Clock, TrendingUp, TrendingDown, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { motion } from "motion/react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE } from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaybookProps {
  address?: string;
  result?: AnalysisResult | null;
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const FLIP_STEPS = [
  "Find Below-Market",
  "Estimate ARV",
  "Budget Rehab",
  "Calculate Profit",
  "Decide",
];

function StepBar({ steps, currentStep = 4 }: { steps: string[]; currentStep?: number }) {
  return (
    <div className="flex items-center gap-0" role="list" aria-label="Workflow steps">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0" role="listitem">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all",
                  done
                    ? "bg-emerald/20 border-emerald/40 text-emerald"
                    : active
                    ? "bg-gold/20 border-gold/50 text-gold"
                    : "bg-surface-elevated border-surface-border text-content-disabled",
                ].join(" ")}
                aria-label={`Step ${i + 1}: ${step}${done ? " (complete)" : active ? " (current)" : ""}`}
              >
                {done ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
              </div>
              <span
                className={[
                  "text-[9px] font-medium mt-1 text-center leading-tight hidden sm:block max-w-[72px]",
                  active ? "text-gold" : done ? "text-emerald" : "text-content-disabled",
                ].join(" ")}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={["h-px flex-1 mx-1 transition-all", done ? "bg-emerald/40" : "bg-surface-border"].join(" ")}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Seeded sample data ───────────────────────────────────────────────────────

function seedFrom(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface FlipData {
  address: string;
  purchasePrice: number;
  rehabBudget: number;
  holdingMonths: number;
  holdingCostPerMonth: number;
  holdingCostsTotal: number;
  financingCosts: number;
  sellingCostRate: number;
  sellingCosts: number;
  allIn: number;
  arv: number;
  profit: number;
  profitMargin: number;
  mao: number;
  maoCheck: boolean;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
}

function buildFlipData(address: string): FlipData {
  const seed = seedFrom(address || "sample");
  const rng = (min: number, max: number, offset = 0) => {
    const x = Math.sin(seed + min + max + offset) * 10000;
    return min + ((x - Math.floor(x)) * (max - min));
  };

  const purchasePrice = Math.round(rng(175000, 380000) / 1000) * 1000;
  const rehabBudget = Math.round(rng(28000, 75000) / 1000) * 1000;
  const holdingMonths = Math.round(rng(4, 7));
  const monthlyMortgage = Math.round(purchasePrice * 0.7 * (0.12 / 12)); // hard money ~12%
  const holdingCostPerMonth = monthlyMortgage + Math.round(purchasePrice * 0.0012 / 12 * 12) + 400 + 200; // insurance + tax + utils
  const holdingCostsTotal = holdingCostPerMonth * holdingMonths;
  const financingCosts = Math.round(purchasePrice * 0.03); // origination
  const arvMultiplier = rng(1.28, 1.55, 99);
  const arv = Math.round((purchasePrice + rehabBudget) * arvMultiplier / 1000) * 1000;
  const sellingCostRate = 0.06;
  const sellingCosts = Math.round(arv * sellingCostRate);
  const allIn = purchasePrice + rehabBudget + holdingCostsTotal + financingCosts + sellingCosts;
  const profit = arv - allIn;
  const profitMargin = (profit / arv) * 100;
  const mao = Math.round(arv * 0.70 - rehabBudget);

  return {
    address: address || "8820 Crimson Ridge, Phoenix AZ",
    purchasePrice, rehabBudget, holdingMonths, holdingCostPerMonth,
    holdingCostsTotal, financingCosts, sellingCostRate, sellingCosts,
    allIn, arv, profit, profitMargin: Math.round(profitMargin * 10) / 10,
    mao, maoCheck: purchasePrice <= mao,
    beds: Math.round(rng(2, 4)), baths: Math.round(rng(1, 3)),
    sqft: Math.round(rng(900, 2200) / 100) * 100,
    yearBuilt: Math.round(rng(1955, 2005)),
  };
}

// ─── The Numbers Waterfall ────────────────────────────────────────────────────

function NumbersWaterfall({ d }: { d: FlipData }) {
  const isProfit = d.profit >= 0;

  const bars = [
    { name: "Purchase", value: d.purchasePrice, fill: CHART_COLORS.rose },
    { name: "Rehab", value: d.rehabBudget, fill: CHART_COLORS.roseLight },
    { name: "Holding", value: d.holdingCostsTotal, fill: CHART_COLORS.amber },
    { name: "Financing", value: d.financingCosts, fill: CHART_COLORS.amberLight },
    { name: "Selling", value: d.sellingCosts, fill: CHART_COLORS.roseLight },
    { name: "ARV", value: d.arv, fill: CHART_COLORS.emerald },
    { name: "Profit", value: d.profit, fill: isProfit ? CHART_COLORS.gold : CHART_COLORS.rose },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        The Numbers — Full Deal Stack
      </h3>

      <div className="h-52" aria-label="Deal cost waterfall chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
            <XAxis
              dataKey="name"
              tick={{ ...AXIS_STYLE.tick, fontSize: 9 }}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              width={44}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatCurrency(v), "Amount"]}
              labelStyle={{ color: CHART_COLORS.text, fontSize: 10 }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <ReferenceLine y={d.allIn} stroke={CHART_COLORS.border} strokeDasharray="4 4" strokeWidth={1} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {bars.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5 font-mono text-[13px]">
        {[
          { label: "Purchase Price", value: formatCurrency(d.purchasePrice), color: "text-rose-light" },
          { label: `Rehab Budget`, value: formatCurrency(d.rehabBudget), color: "text-rose-light" },
          { label: `Holding Costs (${d.holdingMonths}mo)`, value: formatCurrency(d.holdingCostsTotal), color: "text-amber-light" },
          { label: "Financing Costs (3%)", value: formatCurrency(d.financingCosts), color: "text-amber-light" },
          { label: `Selling Costs (${(d.sellingCostRate * 100).toFixed(0)}%)`, value: formatCurrency(d.sellingCosts), color: "text-rose-light" },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center gap-2">
            <span className="text-content-tertiary font-sans text-[13px]">{row.label}</span>
            <span className={`${row.color} tabular-nums`}>{row.value}</span>
          </div>
        ))}
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-surface-border font-bold text-[14px]">
          <span className="text-content-primary font-sans">Total All-In Cost</span>
          <span className="text-content-primary tabular-nums" aria-label={`Total investment: ${formatCurrency(d.allIn)}`}>
            {formatCurrency(d.allIn)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2 pt-1">
          <span className="text-content-secondary font-sans font-semibold">
            <Term id="arv">ARV</Term> (After Repair Value)
          </span>
          <span className="text-emerald-light tabular-nums font-bold text-[14px]" aria-label={`ARV: ${formatCurrency(d.arv)}`}>
            {formatCurrency(d.arv)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-surface-border font-bold text-[15px]">
          <span className={isProfit ? "text-gold font-sans" : "text-rose-light font-sans"}>
            {isProfit ? "Estimated Profit" : "Estimated Loss"}
          </span>
          <span className={`${isProfit ? "text-gold" : "text-rose-light"} tabular-nums`} aria-label={`Profit: ${formatCurrency(d.profit)}, margin ${d.profitMargin}%`}>
            {formatCurrency(d.profit)} ({d.profitMargin.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 70% Rule Check ───────────────────────────────────────────────────────────

function RuleCheck({ d }: { d: FlipData }) {
  const gap = d.purchasePrice - d.mao;
  const passColor = d.maoCheck ? "text-emerald-light" : "text-rose-light";
  const pct = Math.min(100, Math.round((d.mao / d.purchasePrice) * 100));

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <Hammer className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        <Term id="mao">70% Rule</Term> Check
      </h3>

      <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border space-y-3">
        <div className="font-mono text-[13px] space-y-1.5">
          <div className="flex justify-between">
            <span className="text-content-tertiary font-sans">ARV × 70%</span>
            <span className="text-content-primary tabular-nums">{formatCurrency(Math.round(d.arv * 0.70))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-content-tertiary font-sans">Minus Rehab Budget</span>
            <span className="text-rose-light tabular-nums">({formatCurrency(d.rehabBudget)})</span>
          </div>
          <div className="flex justify-between font-bold text-[14px] pt-2 border-t border-surface-border">
            <span className="text-content-primary font-sans">
              <Term id="mao">Maximum Allowable Offer</Term>
            </span>
            <span className="text-gold tabular-nums">{formatCurrency(d.mao)}</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 space-y-2 ${d.maoCheck ? "border-emerald/20 bg-emerald/5" : "border-rose/20 bg-rose/5"}`}>
        <div className="flex items-center gap-2">
          {d.maoCheck
            ? <CheckCircle className="w-4 h-4 text-emerald shrink-0" aria-hidden="true" />
            : <XCircle className="w-4 h-4 text-rose-light shrink-0" aria-hidden="true" />}
          <p className={`text-[13px] font-semibold ${passColor}`}>
            {d.maoCheck
              ? `Your offer is BELOW the MAO — ${formatCurrency(Math.abs(gap))} of built-in cushion`
              : `Your offer is ABOVE the MAO by ${formatCurrency(Math.abs(gap))} — this is a tight deal`}
          </p>
        </div>
        <p className="text-[12px] text-content-secondary leading-relaxed">
          {d.maoCheck
            ? `Buying at ${formatCurrency(d.purchasePrice)} vs MAO of ${formatCurrency(d.mao)} gives you a ${formatCurrency(Math.abs(gap))} buffer for rehab surprises. Strong entry.`
            : `Buying at ${formatCurrency(d.purchasePrice)} is above the MAO of ${formatCurrency(d.mao)}. You need your ARV estimate to be accurate and your rehab to come in on budget. Negotiate harder or walk away.`}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-content-disabled mb-1.5">
          <span>Your offer</span>
          <span>MAO target</span>
        </div>
        <div className="relative h-2.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${d.maoCheck ? "bg-emerald/50" : "bg-rose/50"}`}
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Rehab Budget ─────────────────────────────────────────────────────────────

function RehabBudget({ d }: { d: FlipData }) {
  const age = new Date().getFullYear() - d.yearBuilt;
  const needsRoof = age > 20;
  const needsHVAC = age > 18;

  const items: { name: string; lo: number; hi: number; note?: string; warning?: boolean }[] = [
    { name: "Kitchen renovation", lo: 12000, hi: 18000 },
    { name: "Bathrooms (2)", lo: 8000, hi: 12000 },
    { name: `Flooring (${d.sqft} sqft)`, lo: 6000, hi: 9000 },
    { name: "Interior + exterior paint", lo: 4000, hi: 6000 },
    { name: "Roof replacement", lo: 8000, hi: 15000, warning: needsRoof, note: needsRoof ? `${age}yr old — likely needs replacement` : "Check condition before closing" },
    { name: "HVAC system", lo: 5000, hi: 8000, warning: needsHVAC, note: needsHVAC ? `${age}yr old — factor in replacement` : "Inspect before offer" },
    { name: "Landscaping + curb appeal", lo: 1500, hi: 3500 },
    { name: "Contingency (15%)", lo: Math.round(d.rehabBudget * 0.13), hi: Math.round(d.rehabBudget * 0.17), note: "Always budget this — something always surprises" },
  ];

  const totalLo = items.reduce((s, i) => s + i.lo, 0);
  const totalHi = items.reduce((s, i) => s + i.hi, 0);

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <Hammer className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Rehab Budget — Line-by-Line
      </h3>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className={`flex items-start gap-3 text-[12px] ${item.warning ? "p-2 rounded-lg bg-amber/5 border border-amber/15" : ""}`}>
            {item.warning && <AlertTriangle className="w-3.5 h-3.5 text-amber mt-0.5 shrink-0" aria-hidden="true" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className={item.warning ? "text-amber-light font-medium" : "text-content-secondary"}>{item.name}</span>
                <span className="font-mono tabular-nums text-content-primary shrink-0">
                  {formatCurrency(item.lo)}&ndash;{formatCurrency(item.hi)}
                </span>
              </div>
              {item.note && <p className="text-[10px] text-content-disabled mt-0.5">{item.note}</p>}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-2 text-[13px] pt-2 border-t border-surface-border font-bold">
          <span className="text-content-primary">Estimated Total Rehab</span>
          <span className="font-mono tabular-nums text-gold">
            {formatCurrency(totalLo)}&ndash;{formatCurrency(totalHi)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="text-content-tertiary">Your Budget Estimate</span>
          <span className="font-mono tabular-nums text-content-primary">{formatCurrency(d.rehabBudget)}</span>
        </div>
      </div>

      <p className="text-[11px] text-content-disabled bg-surface-secondary rounded-lg p-3 border border-surface-border">
        Pro tip: get 3 contractor bids. The spread between lowest and highest is usually 30-40%.
        Never pay more than 10% upfront. Pay per milestone: demo complete, rough-in complete, finish complete.
      </p>
    </div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

function Timeline({ d }: { d: FlipData }) {
  const events = [
    { day: 0, label: "Close on purchase", color: CHART_COLORS.gold },
    { day: 7, label: "Demo + permits", color: CHART_COLORS.amber },
    { day: Math.round(d.holdingMonths * 30 * 0.65), label: "Rehab complete", color: CHART_COLORS.emerald },
    { day: Math.round(d.holdingMonths * 30 * 0.68), label: "List for sale", color: CHART_COLORS.emeraldLight },
    { day: Math.round(d.holdingMonths * 30 * 0.85), label: "Under contract", color: CHART_COLORS.emerald },
    { day: d.holdingMonths * 30, label: "Close sale + collect profit", color: CHART_COLORS.gold },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Timeline — {d.holdingMonths}-Month Hold
      </h3>

      <div className="relative" aria-label="Flip project timeline">
        {/* Track line */}
        <div className="absolute top-3.5 left-3.5 right-3.5 h-px bg-surface-border" aria-hidden="true" />
        <div className="relative flex justify-between">
          {events.map((ev) => (
            <div key={ev.label} className="flex flex-col items-center max-w-[80px]">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center border-2 bg-surface-card shrink-0"
                style={{ borderColor: ev.color }}
                aria-label={`Day ${ev.day}: ${ev.label}`}
              >
                <span className="text-[9px] font-mono font-bold" style={{ color: ev.color }}>
                  {ev.day === 0 ? "0" : `D${ev.day}`}
                </span>
              </div>
              <p className="text-[9px] text-content-disabled text-center leading-tight mt-1.5">{ev.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-secondary rounded-xl p-3 text-center border border-surface-border">
          <p className="metric-label mb-1">Hold Duration</p>
          <p className="text-lg font-bold font-mono tabular-nums text-content-primary" aria-label={`Hold duration: ${d.holdingMonths} months`}>
            {d.holdingMonths} mo
          </p>
        </div>
        <div className="bg-surface-secondary rounded-xl p-3 text-center border border-surface-border">
          <p className="metric-label mb-1">Monthly Burn</p>
          <p className="text-lg font-bold font-mono tabular-nums text-rose-light" aria-label={`Monthly holding cost: ${formatCurrency(d.holdingCostPerMonth)}`}>
            {formatCurrency(d.holdingCostPerMonth)}
          </p>
        </div>
        <div className="bg-surface-secondary rounded-xl p-3 text-center border border-surface-border">
          <p className="metric-label mb-1">Total Holding</p>
          <p className="text-lg font-bold font-mono tabular-nums text-amber-light" aria-label={`Total holding costs: ${formatCurrency(d.holdingCostsTotal)}`}>
            {formatCurrency(d.holdingCostsTotal)}
          </p>
        </div>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed">
        Every month over budget costs you{" "}
        <strong className="font-mono text-rose-light">{formatCurrency(d.holdingCostPerMonth)}</strong>.
        A 2-month delay eats{" "}
        <strong className="font-mono text-rose-light">{formatCurrency(d.holdingCostPerMonth * 2)}</strong> of your profit.
        Holding cost discipline is where flip deals die.
      </p>
    </div>
  );
}

// ─── Profit Scenarios ─────────────────────────────────────────────────────────

function ProfitScenarios({ d }: { d: FlipData }) {
  const scenarios = [
    {
      name: "Bull",
      arv: Math.round(d.arv * 1.06 / 1000) * 1000,
      rehabOverrun: 0,
      color: CHART_COLORS.emerald,
      fillColor: "border-emerald/20 bg-emerald/5",
      labelColor: "text-emerald-light",
    },
    {
      name: "Base",
      arv: d.arv,
      rehabOverrun: 0.10,
      color: CHART_COLORS.gold,
      fillColor: "border-gold/20 bg-gold/5",
      labelColor: "text-gold",
    },
    {
      name: "Bear",
      arv: Math.round(d.arv * 0.94 / 1000) * 1000,
      rehabOverrun: 0.20,
      color: CHART_COLORS.rose,
      fillColor: "border-rose/20 bg-rose/5",
      labelColor: "text-rose-light",
    },
  ].map((s) => {
    const adjRehab = Math.round(d.rehabBudget * (1 + s.rehabOverrun));
    const adjAllIn = s.arv > 0
      ? d.purchasePrice + adjRehab + d.holdingCostsTotal + d.financingCosts + Math.round(s.arv * d.sellingCostRate)
      : d.allIn;
    const profit = s.arv - adjAllIn;
    const margin = s.arv > 0 ? (profit / s.arv) * 100 : 0;
    return { ...s, adjRehab, adjAllIn, profit, margin: Math.round(margin * 10) / 10 };
  });

  const barData = scenarios.map((s) => ({ name: s.name, profit: s.profit }));

  return (
    <div className="card space-y-4">
      <h3 className="section-label">Profit Scenarios</h3>

      <div className="h-44" aria-label="Profit scenarios bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <XAxis dataKey="name" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} />
            <YAxis
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              width={44}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatCurrency(v), "Profit"]}
              labelStyle={{ color: CHART_COLORS.text, fontSize: 10 }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <ReferenceLine y={0} stroke={CHART_COLORS.border} strokeWidth={1.5} />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {scenarios.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenarios.map((s) => (
          <div key={s.name} className={`rounded-xl border p-3 space-y-2 ${s.fillColor}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[12px] font-bold ${s.labelColor}`}>{s.name}</span>
              {s.name === "Bull" && <TrendingUp className="w-3.5 h-3.5 text-emerald" aria-hidden="true" />}
              {s.name === "Bear" && <TrendingDown className="w-3.5 h-3.5 text-rose-light" aria-hidden="true" />}
              {s.name === "Base" && <ArrowRight className="w-3.5 h-3.5 text-gold" aria-hidden="true" />}
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-content-disabled font-sans">ARV</span>
                <span className="text-content-primary tabular-nums">{formatCurrency(s.arv)}</span>
              </div>
              {s.rehabOverrun > 0 && (
                <div className="flex justify-between">
                  <span className="text-content-disabled font-sans">Rehab +{(s.rehabOverrun * 100).toFixed(0)}%</span>
                  <span className="text-amber-light tabular-nums">{formatCurrency(s.adjRehab)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-surface-border/50">
                <span className="text-content-secondary font-sans">Profit</span>
                <span className={`${s.labelColor} tabular-nums`}>{formatCurrency(s.profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-disabled font-sans">Margin</span>
                <span className={`${s.labelColor} tabular-nums`}>{s.margin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Verdict Banner ───────────────────────────────────────────────────────────

function VerdictBanner({ d }: { d: FlipData }) {
  const isProfit = d.profit >= 0;
  const isStrongDeal = d.profitMargin >= 15;
  const label = isStrongDeal ? "BUY" : d.profitMargin >= 8 ? "DIG DEEPER" : "PASS";
  const labelColor = isStrongDeal ? "text-emerald-light" : d.profitMargin >= 8 ? "text-amber-light" : "text-rose-light";
  const borderClass = isStrongDeal ? "border-emerald/20 bg-emerald/5" : d.profitMargin >= 8 ? "border-amber/20 bg-amber/5" : "border-rose/20 bg-rose/5";

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${borderClass}`}>
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-bold font-display tracking-tight ${labelColor}`} aria-label={`Flip verdict: ${label}`}>
          {label}
        </div>
        <div className="flex-1">
          <p className="text-[12px] text-content-secondary leading-relaxed">
            {isProfit
              ? `This flip projects ${formatCurrency(d.profit)} profit on a ${d.holdingMonths}-month hold`
              : `This flip projects a ${formatCurrency(Math.abs(d.profit))} LOSS — do not proceed`}
            {" "} ({d.profitMargin.toFixed(1)}% margin).{" "}
            {d.maoCheck
              ? `Offer is below MAO — ${formatCurrency(d.mao - d.purchasePrice)} of cushion.`
              : `Offer is ${formatCurrency(d.purchasePrice - d.mao)} ABOVE MAO — negotiate or walk.`}{" "}
            <span className={`font-semibold ${labelColor}`}>{label} for Fix & Flip strategy.</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="metric-label mb-0.5">Margin</p>
          <p className={`text-2xl font-bold font-mono tabular-nums ${labelColor}`} aria-label={`Profit margin: ${d.profitMargin}%`}>
            {d.profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border/50">
        {[
          { label: "15%+ Margin", ok: d.profitMargin >= 15 },
          { label: "Below MAO", ok: d.maoCheck },
          { label: "Positive Profit", ok: d.profit >= 0 },
        ].map((check) => (
          <div key={check.label} className="flex items-center gap-1.5 text-[11px]">
            {check.ok
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald shrink-0" aria-hidden="true" />
              : <XCircle className="w-3.5 h-3.5 text-rose-light shrink-0" aria-hidden="true" />}
            <span className={check.ok ? "text-emerald" : "text-rose-light"}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Playbook Export ─────────────────────────────────────────────────────

export function FlipPlaybook({ address, result }: PlaybookProps) {
  const d = useMemo(
    () => buildFlipData(address || result?.address || "8820 Crimson Ridge, Phoenix AZ"),
    [address, result]
  );

  const sections = [
    { delay: 0, component: <NumbersWaterfall d={d} /> },
    { delay: 0.07, component: <RuleCheck d={d} /> },
    { delay: 0.12, component: <RehabBudget d={d} /> },
    { delay: 0.17, component: <Timeline d={d} /> },
    { delay: 0.22, component: <ProfitScenarios d={d} /> },
    { delay: 0.27, component: <VerdictBanner d={d} /> },
  ];

  return (
    <div className="space-y-5">
      <Section delay={0}>
        <StepBar steps={FLIP_STEPS} currentStep={4} />
      </Section>
      {sections.map(({ delay, component }, i) => (
        <Section key={i} delay={delay}>
          {component}
        </Section>
      ))}
    </div>
  );
}
