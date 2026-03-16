"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, Shield, TrendingUp, ChevronDown, ChevronUp, Info, Database, Calculator,
  MapPin, Star, Activity, BarChart2, Gauge,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { analyzeComps } from "@/lib/engines/comps-engine";
import type { CompProperty } from "@/lib/engines/comps-engine";
import {
  AiInsightCard, CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE,
  fmtChartCurrency, ChartTooltipContent, seededRandom,
} from "@/components/charts/ChartTheme";
import type { InstitutionalMetrics } from "@/lib/engines/institutional-metrics";
import type { StressTestResult } from "@/lib/engines/stress-test-engine";
import { formatCurrency } from "@/lib/utils/format";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  purchasePrice: number;
  estimatedValue: number;
  monthlyRent: number;
  score: number;
  verdict: "BUY" | "PASS";
  confidence: number;
  narrative: string;
  nextSteps: string[];
  capRate: number;
  monthlyCashFlow: number;
  dscr: number;
  cashOnCash: number;
  monthlyMortgage: number;
  monthlyExpenses: number;
  institutional: InstitutionalMetrics;
  stress: StressTestResult;
}

// ─── Score / verdict helpers ─────────────────────────────────────────────────

export function scoreColor(n: number) {
  if (n >= 75) return "text-emerald-light";
  if (n >= 55) return "text-amber-light";
  return "text-rose-light";
}

export function scoreBg(n: number) {
  if (n >= 75) return "bg-emerald-muted border-emerald/30";
  if (n >= 55) return "bg-amber-muted border-amber/30";
  return "bg-rose-muted border-rose/30";
}

export function verdictBadge(v: "BUY" | "PASS") {
  return v === "BUY" ? "badge-emerald" : "badge-rose";
}

function severityBadge(s: string) {
  switch (s) {
    case "mild": return "badge-emerald";
    case "moderate": return "badge-amber";
    case "severe": return "badge-rose";
    case "extreme": return "bg-rose-muted text-rose-light border border-rose/30 px-2 py-0.5 text-[11px] font-medium rounded-md";
    default: return "badge-gold";
  }
}

function resilienceColor(r: string) {
  switch (r) {
    case "fortress": return "text-emerald-light";
    case "strong": return "text-emerald-light";
    case "adequate": return "text-amber-light";
    case "fragile": return "text-rose-light";
    default: return "text-rose-light";
  }
}

// ─── Skeleton Loading ────────────────────────────────────────────────────────

export function AnalysisSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-5 h-5 rounded-full bg-gold/30 animate-pulse" />
        <span className="text-sm text-content-tertiary italic">Running 12-engine analysis...</span>
      </div>
      {[160, 100, 80, 120, 60].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}

// ─── Source Citation Badge ───────────────────────────────────────────────────

function SourceBadge({ source, demo = true }: { source: string; demo?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-content-disabled">
      <Database className="w-2.5 h-2.5" />
      {demo ? <span className="text-amber/60">Demo</span> : null}
      <span>{source}</span>
    </span>
  );
}

// ─── Formula Tooltip ────────────────────────────────────────────────────────

function FormulaTooltip({ formula, inputs }: { formula: string; inputs: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
      >
        <Info className="w-2.5 h-2.5 text-content-disabled" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-lg bg-surface-elevated border border-surface-border shadow-elevated z-20 animate-fade-in">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-1.5">Formula</div>
          <div className="font-mono text-xs text-gold-light mb-2">{formula}</div>
          <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-1">Inputs</div>
          <ul className="space-y-0.5">
            {inputs.map((inp) => (
              <li key={inp} className="text-[10px] text-content-tertiary flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-content-disabled" />
                {inp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

// ─── Calculation Chain (Show Your Work) ─────────────────────────────────────

export function CalculationChain({ r }: { r: AnalysisResult }) {
  const [expanded, setExpanded] = useState(false);

  const annualRent = r.monthlyRent * 12;
  const annualExpenses = r.monthlyExpenses * 12;
  const noi = annualRent - annualExpenses;
  const downPayment = r.purchasePrice * 0.2;
  const annualDebtService = r.monthlyMortgage * 12;
  const annualCashFlow = noi - annualDebtService;

  return (
    <div className="card border-gold/10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-gold-light" />
          <span className="section-label !text-gold-light">Show the math</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-content-tertiary" /> : <ChevronDown className="w-4 h-4 text-content-tertiary" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Income */}
          <div>
            <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Income</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-content-secondary">Monthly Rent</span>
                <span className="text-content-primary">{formatCurrency(r.monthlyRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">× 12 months</span>
                <span className="text-content-primary">{formatCurrency(annualRent)}/yr</span>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div>
            <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Operating Expenses</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-content-secondary">Monthly Expenses (tax + ins + maint + capex + vacancy)</span>
                <span className="text-content-primary">{formatCurrency(r.monthlyExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">× 12 months</span>
                <span className="text-rose-light">{formatCurrency(annualExpenses)}/yr</span>
              </div>
            </div>
          </div>

          {/* NOI */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-content-primary font-medium">Net Operating Income (NOI)</span>
              <span className="text-gold-light font-bold">{formatCurrency(noi)}/yr</span>
            </div>
            <div className="text-[10px] text-content-disabled mt-1">= Annual Rent − Annual Expenses</div>
          </div>

          {/* Cap Rate */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-content-primary font-medium flex items-center gap-1.5">
                Cap Rate
                <FormulaTooltip formula="NOI / Purchase Price" inputs={["NOI", "Purchase Price"]} />
              </span>
              <span className="text-gold-light font-bold">{r.capRate.toFixed(2)}%</span>
            </div>
            <div className="text-[10px] text-content-disabled mt-1">= {formatCurrency(noi)} / {formatCurrency(r.purchasePrice)}</div>
          </div>

          {/* Debt Service */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Debt Service</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-content-secondary">Loan Amount (80% LTV)</span>
                <span className="text-content-primary">{formatCurrency(r.purchasePrice - downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Monthly Mortgage (P&I)</span>
                <span className="text-rose-light">{formatCurrency(r.monthlyMortgage)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Annual Debt Service</span>
                <span className="text-rose-light">{formatCurrency(annualDebtService)}/yr</span>
              </div>
            </div>
          </div>

          {/* DSCR */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-content-primary font-medium flex items-center gap-1.5">
                DSCR
                <FormulaTooltip formula="NOI / Annual Debt Service" inputs={["Net Operating Income", "Annual Mortgage Payments"]} />
              </span>
              <span className={`font-bold ${r.dscr >= 1.25 ? "text-emerald-light" : r.dscr >= 1 ? "text-amber-light" : "text-rose-light"}`}>
                {r.dscr.toFixed(2)}x
              </span>
            </div>
            <div className="text-[10px] text-content-disabled mt-1">= {formatCurrency(noi)} / {formatCurrency(annualDebtService)}</div>
            <div className="text-[10px] text-content-tertiary mt-0.5">
              {r.dscr >= 1.25 ? "Lender threshold (1.25x) met" : r.dscr >= 1.0 ? "Below lender threshold (1.25x)" : "Debt service not covered — negative cash flow"}
            </div>
          </div>

          {/* Cash on Cash */}
          <div className="pt-2 border-t border-white/[0.04]">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-content-primary font-medium flex items-center gap-1.5">
                Cash-on-Cash Return
                <FormulaTooltip formula="Annual Cash Flow / Total Cash Invested" inputs={["Annual Cash Flow after debt service", "Down Payment + Closing Costs"]} />
              </span>
              <span className="text-gold-light font-bold">{r.cashOnCash.toFixed(2)}%</span>
            </div>
            <div className="text-[10px] text-content-disabled mt-1">= {formatCurrency(annualCashFlow)} / {formatCurrency(downPayment)}</div>
          </div>

          {/* Data sources */}
          <div className="pt-3 border-t border-white/[0.04]">
            <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Data Sources</div>
            <div className="flex flex-wrap gap-2">
              <SourceBadge source="Property: ATTOM Data" />
              <SourceBadge source="Rent: RentCast" />
              <SourceBadge source="Rates: FRED" />
              <SourceBadge source="Schools: GreatSchools" />
              <SourceBadge source="Walk: WalkScore" />
            </div>
            <p className="text-[9px] text-amber/50 mt-2">
              Demo mode — calculations are real but input data is simulated. Production will pull from live APIs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metrics Grid ────────────────────────────────────────────────────────────

export function MetricsGrid({ r }: { r: AnalysisResult }) {
  const items = [
    { label: "Purchase Price", value: formatCurrency(r.purchasePrice), source: "User input", formula: null },
    { label: "Est. Value", value: formatCurrency(r.estimatedValue), source: "ATTOM AVM", formula: { f: "Automated Valuation Model", i: ["Comparable sales", "Property attributes", "Market trends"] } },
    { label: "Cap Rate", value: `${r.capRate.toFixed(2)}%`, source: "Calculated", formula: { f: "NOI / Purchase Price", i: ["Annual Rent", "Operating Expenses", "Purchase Price"] } },
    { label: "Cash Flow", value: `${formatCurrency(r.monthlyCashFlow)}/mo`, accent: r.monthlyCashFlow > 0, source: "Calculated", formula: { f: "Rent − Mortgage − Expenses", i: ["Gross Rent", "P&I Payment", "Operating Expenses"] } },
    { label: "DSCR", value: `${r.dscr.toFixed(2)}x`, source: "Calculated", formula: { f: "NOI / Debt Service", i: ["Net Operating Income", "Annual Mortgage"] } },
    { label: "Cash-on-Cash", value: `${r.cashOnCash.toFixed(2)}%`, source: "Calculated", formula: { f: "Annual CF / Cash Invested", i: ["Annual Cash Flow", "Down Payment"] } },
    { label: "Monthly Mortgage", value: formatCurrency(r.monthlyMortgage), source: "Calculated", formula: { f: "P×[r(1+r)^n]/[(1+r)^n−1]", i: ["Loan Amount", "Rate", "Term"] } },
    { label: "Monthly Expenses", value: formatCurrency(r.monthlyExpenses), source: "Calculated", formula: { f: "Tax + Ins + Maint + CapEx + Vacancy", i: ["Property Tax", "Insurance", "Maintenance 1%", "CapEx 5%", "Vacancy 5%"] } },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((m) => (
        <div key={m.label} className="card-glass !p-3">
          <div className="flex items-center gap-1 mb-1">
            <div className="metric-label">{m.label}</div>
            {m.formula && <FormulaTooltip formula={m.formula.f} inputs={m.formula.i} />}
          </div>
          <div className={`font-mono text-base font-bold tabular-nums ${m.accent ? "text-emerald-light" : "text-content-primary"}`}>
            {m.value}
          </div>
          <SourceBadge source={m.source} demo={m.source !== "User input" && m.source !== "Calculated"} />
        </div>
      ))}
    </div>
  );
}

// ─── Institutional Metrics Card ──────────────────────────────────────────────

export function InstitutionalCard({ inst }: { inst: InstitutionalMetrics }) {
  const rows = inst.rules.slice(0, 6).map((r) => ({
    metric: r.metric,
    value: r.metric.includes("Discount") ? `${r.value.toFixed(1)}%` :
           r.metric.includes("Multiple") ? `${r.value.toFixed(2)}x` :
           r.metric.includes("Rent") ? `${r.value.toFixed(2)}%` :
           `${r.value.toFixed(1)}%`,
    benchmark: r.metric.includes("Multiple") ? `${r.benchmark}x` : `${r.benchmark}%`,
    passes: r.passes,
  }));

  return (
    <div className="card">
      <div className="section-label flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        Institutional Metrics
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        {rows.map((r) => (
          <div key={r.metric} className="flex items-start gap-2">
            {r.passes
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-light mt-0.5 shrink-0" />
              : <XCircle className="w-3.5 h-3.5 text-rose-light mt-0.5 shrink-0" />}
            <div>
              <div className="text-[11px] text-content-tertiary">{r.metric}</div>
              <div className="font-mono text-sm font-semibold text-content-primary">{r.value}</div>
              <div className="text-[10px] text-content-disabled">vs {r.benchmark}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stress Test Bar Chart ────────────────────────────────────────────────────

interface StressChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function StressChartTooltip({ active, payload, label }: StressChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const dscrEntry = payload.find((p) => p.name === "dscr");
  const cfEntry = payload.find((p) => p.name === "cashFlow");

  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 6, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      {dscrEntry && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: CHART_COLORS.gold, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>DSCR:</span>
          <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
            {dscrEntry.value.toFixed(2)}x
          </span>
        </div>
      )}
      {cfEntry && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfEntry.value >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>Cash Flow:</span>
          <span style={{ fontSize: 12, color: cfEntry.value >= 0 ? CHART_COLORS.emeraldLight : CHART_COLORS.roseLight, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
            {fmtChartCurrency(cfEntry.value)}/mo
          </span>
        </div>
      )}
    </div>
  );
}

// Short display names that fit the X-axis at 280px height
const SCENARIO_SHORT_LABELS: Record<string, string> = {
  "Mild Recession": "Mild",
  "Rate Shock": "Rate+",
  "2008-Style Correction": "2008",
  "Insurance Crisis (FL/LA)": "Insur.",
  "Perfect Storm": "Storm",
  "Inflationary Boom": "Boom",
};

// ─── Stress Test Card ────────────────────────────────────────────────────────

export function StressTestCard({ stress }: { stress: StressTestResult }) {
  // Build chart data from engine output
  const chartData = stress.scenarios.map((s) => ({
    name: SCENARIO_SHORT_LABELS[s.scenario.name] ?? s.scenario.name.slice(0, 6),
    fullName: s.scenario.name,
    dscr: s.results.dscr,
    cashFlow: s.results.monthlyCashFlow,
    survives: s.survives,
  }));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Stress Test
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-content-tertiary" />
          <span className={`text-xs font-semibold uppercase tracking-wider ${resilienceColor(stress.resilience)}`}>
            {stress.resilience}
          </span>
        </div>
      </div>

      {/* ── Grouped Bar Chart ── */}
      <div aria-label={`Stress test chart showing DSCR and cash flow across ${stress.scenarios.length} scenarios`}>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.gold }} />
            <span className="text-[10px] text-content-tertiary">DSCR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.emerald }} />
            <span className="text-[10px] text-content-tertiary">Cash Flow (pos)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.rose }} />
            <span className="text-[10px] text-content-tertiary">Cash Flow (neg)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-5 h-px" style={{ borderTop: `1px dashed ${CHART_COLORS.rose}` }} />
            <span className="text-[10px] text-content-tertiary">DSCR 1.0 min</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="name"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
            />
            {/* Left Y axis — DSCR values */}
            <YAxis
              yAxisId="dscr"
              orientation="left"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v: number) => `${v.toFixed(1)}x`}
              domain={[0, "auto"]}
              width={36}
            />
            {/* Right Y axis — Cash Flow in $ */}
            <YAxis
              yAxisId="cf"
              orientation="right"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={fmtChartCurrency}
              width={52}
            />
            <Tooltip content={<StressChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            {/* DSCR 1.0 reference line — institutional minimum */}
            <ReferenceLine
              yAxisId="dscr"
              y={1.0}
              stroke={CHART_COLORS.rose}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "1.0x",
                position: "insideTopRight",
                fill: CHART_COLORS.rose,
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            {/* DSCR bars — gold, one per scenario */}
            <Bar yAxisId="dscr" dataKey="dscr" name="dscr" maxBarSize={18} radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`dscr-${index}`}
                  fill={entry.dscr >= 1.25 ? CHART_COLORS.gold : entry.dscr >= 1.0 ? CHART_COLORS.amber : CHART_COLORS.rose}
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
            {/* Cash Flow bars — emerald if positive, rose if negative */}
            <Bar yAxisId="cf" dataKey="cashFlow" name="cashFlow" maxBarSize={18} radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cf-${index}`}
                  fill={entry.cashFlow >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Existing scenario detail table (kept as-is) ── */}
      <div className="overflow-x-auto -mx-5 px-5 mt-4">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-content-disabled text-[10px] uppercase tracking-wider">
              <th className="text-left font-medium pb-2 pr-3">Scenario</th>
              <th className="text-center font-medium pb-2 px-2">Severity</th>
              <th className="text-center font-medium pb-2 px-2">Survives</th>
              <th className="text-right font-medium pb-2 px-2">Cash Flow</th>
              <th className="text-right font-medium pb-2 pl-2">DSCR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {stress.scenarios.map((s) => (
              <tr key={s.scenario.name} className="hover:bg-white/[0.02]">
                <td className="py-2 pr-3 text-content-primary font-medium whitespace-nowrap">{s.scenario.name}</td>
                <td className="py-2 px-2 text-center"><span className={severityBadge(s.scenario.severity)}>{s.scenario.severity}</span></td>
                <td className="py-2 px-2 text-center">
                  {s.survives
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-light mx-auto" aria-label="Survives" />
                    : <XCircle className="w-3.5 h-3.5 text-rose-light mx-auto" aria-label="Fails" />}
                </td>
                <td className={`py-2 px-2 text-right font-mono ${s.comparison.cashFlowChange < 0 ? "text-rose-light" : "text-emerald-light"}`}>
                  {s.comparison.cashFlowChange >= 0 ? "+" : ""}{formatCurrency(s.comparison.cashFlowChange)}
                </td>
                <td className="py-2 pl-2 text-right font-mono text-content-secondary">{s.results.dscr.toFixed(2)}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-xs text-content-secondary leading-relaxed">{stress.thesis}</p>
      </div>
    </div>
  );
}

// ─── Exit Cap Sensitivity Heatmap ────────────────────────────────────────────

/**
 * Maps a return value to a background color on a rose → amber → emerald gradient.
 * Thresholds: <0% = pure rose, 0-10% = amber zone, >=20% = full emerald.
 */
function exitReturnBg(totalReturn: number, irr: number): string {
  // Use IRR as the primary signal (it accounts for hold period and leverage)
  if (irr >= 20) return "rgba(16,185,129,0.22)";   // strong emerald
  if (irr >= 15) return "rgba(16,185,129,0.12)";   // light emerald
  if (irr >= 10) return "rgba(245,158,11,0.18)";   // amber
  if (irr >= 5) return "rgba(245,158,11,0.09)";    // light amber
  if (totalReturn >= 0) return "rgba(239,68,68,0.10)"; // faint rose — positive total return but low IRR
  return "rgba(239,68,68,0.22)";                    // rose — negative total return
}

function exitReturnTextColor(irr: number): string {
  if (irr >= 15) return CHART_COLORS.emeraldLight;
  if (irr >= 10) return CHART_COLORS.amberLight;
  return CHART_COLORS.roseLight;
}

export function ExitCapTable({
  sens,
  currentExitCap,
}: {
  sens: InstitutionalMetrics["exitCapRateSensitivity"];
  /** The deal's baseline exit cap rate — used to highlight the current-deal row */
  currentExitCap?: number;
}) {
  // Find the row closest to the deal's exit cap rate
  const currentIdx = currentExitCap != null
    ? sens.reduce((best, row, idx) =>
        Math.abs(row.exitCap - currentExitCap) < Math.abs((sens[best]?.exitCap ?? 0) - currentExitCap) ? idx : best
      , 0)
    : Math.floor(sens.length / 2); // default to middle row

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          Exit Cap Sensitivity
        </div>
        <div className="flex items-center gap-3 text-[10px] text-content-disabled">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(16,185,129,0.22)" }} />
            Strong (&gt;=20% IRR)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(245,158,11,0.18)" }} />
            Acceptable (10-15%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(239,68,68,0.22)" }} />
            Weak (&lt;10%)
          </span>
        </div>
      </div>

      <div
        className="overflow-x-auto -mx-5 px-5"
        role="table"
        aria-label="Exit cap rate sensitivity table — rows show IRR and total return at different exit cap rates"
      >
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-content-disabled text-[10px] uppercase tracking-wider">
              <th className="text-left font-medium pb-2 pr-3" scope="col">Exit Cap</th>
              <th className="text-right font-medium pb-2 px-3" scope="col">Exit Price</th>
              <th className="text-right font-medium pb-2 px-3" scope="col">Total Return</th>
              <th className="text-right font-medium pb-2 pl-3" scope="col">Levered IRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sens.map((row, idx) => {
              const isCurrentDeal = idx === currentIdx;
              const bg = exitReturnBg(row.totalReturn, row.irr);
              const irrColor = exitReturnTextColor(row.irr);

              return (
                <tr
                  key={row.exitCap}
                  style={{ backgroundColor: bg }}
                  className={`transition-colors ${isCurrentDeal ? "ring-1 ring-inset ring-gold/40" : ""}`}
                >
                  <td className="py-2 pr-3 font-mono font-medium text-content-primary">
                    <span className="flex items-center gap-1.5">
                      {isCurrentDeal && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-gold shrink-0"
                          title="Current deal's exit cap rate"
                        />
                      )}
                      {row.exitCap.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-content-secondary">
                    {formatCurrency(row.exitPrice)}
                  </td>
                  <td
                    className="py-2 px-3 text-right font-mono"
                    style={{ color: row.totalReturn >= 0 ? CHART_COLORS.emeraldLight : CHART_COLORS.roseLight }}
                  >
                    {row.totalReturn >= 0 ? "+" : ""}{row.totalReturn.toFixed(1)}%
                  </td>
                  <td className="py-2 pl-3 text-right font-mono font-semibold" style={{ color: irrColor }}>
                    {row.irr.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Cash Flow Waterfall Chart ────────────────────────────────────────────────

interface WaterfallBar {
  label: string;
  value: number;      // actual dollar amount
  base: number;       // Y offset (for stacked positioning)
  isNet: boolean;
  isExpense: boolean;
}

interface WaterfallTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WaterfallBar }>;
  label?: string;
}

function WaterfallTooltip({ active, payload, label }: WaterfallTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const bar = entry.payload;

  let color: string = CHART_COLORS.gold;
  if (bar.isNet) color = bar.value >= 0 ? CHART_COLORS.gold : CHART_COLORS.rose;
  else if (bar.isExpense) color = CHART_COLORS.rose;
  else color = CHART_COLORS.emerald;

  return (
    <ChartTooltipContent
      label={label ?? bar.label}
      items={[{
        name: bar.isExpense ? "Cost" : bar.isNet ? "Net Cash Flow" : "Income",
        value: fmtChartCurrency(bar.isExpense ? -bar.value : bar.value) + "/mo",
        color,
      }]}
    />
  );
}

export function CashFlowWaterfall({ r }: { r: AnalysisResult }) {
  // Estimate expense breakdown (matches MetricsGrid formula note)
  const vacancy = Math.round(r.monthlyRent * 0.08);
  const taxes = Math.round((r.purchasePrice * 0.012) / 12);
  const insurance = Math.round((r.purchasePrice * 0.007) / 12);
  const management = Math.round(r.monthlyRent * 0.10);
  const maintenance = Math.round((r.purchasePrice * 0.01) / 12);

  // Running total for waterfall base positioning
  let running = r.monthlyRent;
  const bars: WaterfallBar[] = [];

  // Gross Rent — positive start
  bars.push({ label: "Gross Rent", value: r.monthlyRent, base: 0, isNet: false, isExpense: false });

  // Each deduction lowers the running total
  const deductions: Array<{ label: string; amount: number }> = [
    { label: "Vacancy (8%)", amount: vacancy },
    { label: "Mortgage", amount: r.monthlyMortgage },
    { label: "Taxes", amount: taxes },
    { label: "Insurance", amount: insurance },
    { label: "Management", amount: management },
    { label: "Maintenance", amount: maintenance },
  ];

  for (const d of deductions) {
    bars.push({ label: d.label, value: d.amount, base: running - d.amount, isNet: false, isExpense: true });
    running -= d.amount;
  }

  // Net Cash Flow bar (gold) — starts at 0
  bars.push({ label: "Net Cash Flow", value: r.monthlyCashFlow, base: 0, isNet: true, isExpense: false });

  // For Recharts BarChart we use a stacked approach: invisible "base" bar + visible "value" bar
  const chartData = bars.map((b) => ({
    ...b,
    stackBase: b.isNet ? 0 : Math.min(b.base, b.base + (b.isExpense ? -b.value : b.value)),
    stackValue: b.isExpense ? b.value : b.isNet ? Math.abs(r.monthlyCashFlow) : b.value,
    // For display sign
    displayValue: b.isExpense ? -b.value : b.value,
  }));

  return (
    <div className="card">
      <div className="section-label flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        Monthly Cash Flow Bridge
      </div>

      <div
        aria-label={`Cash flow waterfall showing breakdown from gross rent ${formatCurrency(r.monthlyRent)} to net cash flow ${formatCurrency(r.monthlyCashFlow)} per month`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData}
            margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="15%"
          >
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="label"
              tick={{ ...AXIS_STYLE.tick, fontSize: 9 }}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={46}
            />
            <YAxis
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={fmtChartCurrency}
              width={52}
            />
            <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            {/* Invisible spacer bar for floating waterfall */}
            <Bar dataKey="stackBase" stackId="wf" fill="transparent" />
            {/* Visible value bar */}
            <Bar dataKey="stackValue" stackId="wf" maxBarSize={32} radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => {
                let fill: string;
                if (entry.isNet) fill = r.monthlyCashFlow >= 0 ? CHART_COLORS.gold : CHART_COLORS.rose;
                else if (entry.isExpense) fill = CHART_COLORS.rose;
                else fill = CHART_COLORS.emerald;
                return <Cell key={`wf-${index}`} fill={fill} fillOpacity={entry.isNet ? 1 : 0.8} />;
              })}
              <LabelList
                dataKey="displayValue"
                position="top"
                formatter={fmtChartCurrency}
                style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: CHART_COLORS.textSecondary }}
              />
            </Bar>
            {/* Zero reference line */}
            <ReferenceLine y={0} stroke={CHART_COLORS.border} strokeWidth={1} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.emerald }} />
          <span className="text-[10px] text-content-tertiary">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.rose, opacity: 0.8 }} />
          <span className="text-[10px] text-content-tertiary">Expenses</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.gold }} />
          <span className="text-[10px] text-content-tertiary">Net Cash Flow</span>
        </div>
        <span className="text-[9px] text-content-disabled ml-auto">Expense estimates based on property price &amp; rent</span>
      </div>
    </div>
  );
}

// ─── Risk Gauge — SVG Semicircle ──────────────────────────────────────────────

/**
 * Compute a 0-100 risk score from available deal metrics.
 *
 * Risk drivers (higher = riskier):
 *  - Low DSCR: DSCR < 1.0 is maximum risk, DSCR >= 1.5 is low risk
 *  - Stress test failure rate: % of scenarios that fail
 *  - Cap rate spread vs 5% benchmark: negative spread adds risk
 */
function computeRiskScore(r: AnalysisResult): number {
  // DSCR component (40% weight): DSCR 0→100 risk, 1.5x→0 risk
  const dscrRisk = Math.min(100, Math.max(0, (1.5 - r.dscr) / 1.5 * 100));

  // Stress survival component (40% weight): all fail = 100 risk, all survive = 0 risk
  const total = r.stress.scenarios.length;
  const failed = r.stress.scenarios.filter((s) => !s.survives).length;
  const survivalRisk = total > 0 ? (failed / total) * 100 : 50;

  // Cap rate spread component (20% weight): below 4% adds risk
  const capRateRisk = Math.min(100, Math.max(0, (4.0 - r.capRate) / 4.0 * 100));

  return Math.round(dscrRisk * 0.4 + survivalRisk * 0.4 + capRateRisk * 0.2);
}

function riskLabel(score: number): string {
  if (score < 30) return "Low Risk";
  if (score < 60) return "Moderate";
  return "High Risk";
}

function riskLabelColor(score: number): string {
  if (score < 30) return CHART_COLORS.emeraldLight;
  if (score < 60) return CHART_COLORS.amberLight;
  return CHART_COLORS.roseLight;
}

export function RiskGauge({ r }: { r: AnalysisResult }) {
  const score = computeRiskScore(r);

  // SVG semicircle geometry
  const cx = 80;
  const cy = 76;
  const radius = 58;
  const strokeWidth = 14;

  // Arc spans 180 degrees (from 180° to 0° = left to right)
  // We draw three colored arc segments: emerald 0-30, amber 30-60, rose 60-100
  function arcPath(startPct: number, endPct: number): string {
    const startAngle = Math.PI + (startPct / 100) * Math.PI; // 180° + offset
    const endAngle = Math.PI + (endPct / 100) * Math.PI;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endPct - startPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Needle angle: 0% → 180° (left), 100% → 0° (right), pointing upward at midpoint
  const needleAngle = Math.PI + (score / 100) * Math.PI;
  const needleLen = radius - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  return (
    <div
      className="card flex flex-col items-center"
      aria-label={`Risk gauge: ${score} out of 100 — ${riskLabel(score)}`}
    >
      <div className="section-label flex items-center gap-2 mb-3 self-start">
        <span className="w-1.5 h-1.5 rounded-full bg-rose" />
        Risk Assessment
      </div>

      <svg
        width={160}
        height={90}
        viewBox="0 0 160 90"
        role="img"
        aria-label={`Semicircular risk gauge at ${score}%`}
      >
        {/* Track background */}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke={CHART_COLORS.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Emerald zone 0-30 */}
        <path
          d={arcPath(0, 30)}
          fill="none"
          stroke={CHART_COLORS.emerald}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.7}
        />
        {/* Amber zone 30-60 */}
        <path
          d={arcPath(30, 60)}
          fill="none"
          stroke={CHART_COLORS.amber}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.7}
        />
        {/* Rose zone 60-100 */}
        <path
          d={arcPath(60, 100)}
          fill="none"
          stroke={CHART_COLORS.rose}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.7}
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={CHART_COLORS.white}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r={4} fill={CHART_COLORS.white} />

        {/* Zone labels */}
        <text x={10} y={82} fontSize={8} fill={CHART_COLORS.emerald} fontFamily="JetBrains Mono, monospace">Low</text>
        <text x={69} y={22} fontSize={8} fill={CHART_COLORS.amber} fontFamily="JetBrains Mono, monospace" textAnchor="middle">Med</text>
        <text x={132} y={82} fontSize={8} fill={CHART_COLORS.rose} fontFamily="JetBrains Mono, monospace" textAnchor="end">High</text>
      </svg>

      {/* Score display */}
      <div className="mt-1 text-center">
        <div
          className="font-mono text-2xl font-bold tabular-nums"
          style={{ color: riskLabelColor(score) }}
          aria-label={`Risk score: ${score}`}
        >
          {score}
        </div>
        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: riskLabelColor(score) }}>
          {riskLabel(score)}
        </div>
      </div>

      {/* Risk factor breakdown */}
      <div className="w-full mt-3 space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-content-tertiary">DSCR ({r.dscr.toFixed(2)}x)</span>
          <span className="font-mono" style={{ color: r.dscr >= 1.25 ? CHART_COLORS.emeraldLight : r.dscr >= 1.0 ? CHART_COLORS.amberLight : CHART_COLORS.roseLight }}>
            {r.dscr >= 1.25 ? "Safe" : r.dscr >= 1.0 ? "Marginal" : "Unsafe"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-content-tertiary">Scenarios passed</span>
          <span className="font-mono text-content-secondary">
            {r.stress.scenarios.filter((s) => s.survives).length}/{r.stress.scenarios.length}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-content-tertiary">Cap rate ({r.capRate.toFixed(1)}%)</span>
          <span className="font-mono" style={{ color: r.capRate >= 6 ? CHART_COLORS.emeraldLight : r.capRate >= 4 ? CHART_COLORS.amberLight : CHART_COLORS.roseLight }}>
            {r.capRate >= 6 ? "Strong" : r.capRate >= 4 ? "Acceptable" : "Weak"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Comparable Sales Section ────────────────────────────────────────────────

/** Deterministic integer hash from a string — same logic as page.tsx hashCode */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Street prefixes and suffixes for plausible generated addresses */
const STREET_NAMES = [
  "Oak", "Maple", "Cedar", "Pine", "Elm", "Birch", "Walnut", "Chestnut",
  "Willow", "Spruce", "Ash", "Magnolia", "Poplar", "Sycamore", "Aspen",
];
const STREET_SUFFIXES = ["St", "Ave", "Dr", "Ln", "Blvd", "Ct", "Way", "Pl", "Rd", "Cir"];

/** Build the street portion of a comp address from the city (last segment) */
function buildCompAddress(rng: () => number, city: string): string {
  const num = Math.floor(rng() * 9000) + 1000;
  const name = STREET_NAMES[Math.floor(rng() * STREET_NAMES.length)];
  const suffix = STREET_SUFFIXES[Math.floor(rng() * STREET_SUFFIXES.length)];
  return `${num} ${name} ${suffix}, ${city}`;
}

/** Generate 5-6 deterministic mock comps seeded from the subject property */
function generateMockComps(r: AnalysisResult): { comps: CompProperty[]; distances: number[] } {
  const seed = hashStr(r.address);
  const rng = seededRandom(seed);

  // Derive city from last comma-separated segment of address
  const parts = r.address.split(",");
  const city = parts.length >= 2 ? parts.slice(-2).join(",").trim() : r.address;

  const count = 5 + (seed % 2); // 5 or 6 comps
  const comps: CompProperty[] = [];
  const distances: number[] = [];

  for (let i = 0; i < count; i++) {
    // Price: ±20% of subject price
    const priceFactor = 0.80 + rng() * 0.40; // 0.80 → 1.20
    const price = Math.round(r.purchasePrice * priceFactor / 1000) * 1000;

    // Sqft: ±500 of subject
    const sqftDelta = Math.round((rng() - 0.5) * 1000);
    const sqft = Math.max(600, r.sqft + sqftDelta);

    // Beds: ±1
    const bedDelta = Math.round((rng() - 0.5) * 2);
    const beds = Math.max(1, Math.min(6, r.beds + bedDelta));

    // Baths: ±1 (in 0.5 increments)
    const bathDelta = Math.round((rng() - 0.5) * 2) * 0.5;
    const baths = Math.max(1, Math.min(5, r.baths + bathDelta));

    // Year built: ±10 years
    const yearDelta = Math.round((rng() - 0.5) * 20);
    const yearBuilt = Math.max(1900, Math.min(2024, r.yearBuilt + yearDelta));

    // Sale date: within past 6 months
    const daysAgo = Math.floor(rng() * 180) + 5;
    const saleDate = new Date(Date.now() - daysAgo * 86400_000)
      .toISOString()
      .slice(0, 10);

    // Days on market: 5-60
    const daysOnMarket = Math.floor(rng() * 55) + 5;

    // Distance: 0.1–2.5 miles
    const distance = Math.round((0.1 + rng() * 2.4) * 10) / 10;

    comps.push({
      address: buildCompAddress(rng, city),
      price,
      sqft,
      pricePerSqft: Math.round(price / sqft),
      bedrooms: beds,
      bathrooms: baths,
      yearBuilt,
      daysOnMarket,
      saleDate,
    });
    distances.push(distance);
  }

  return { comps, distances };
}

interface CompsPriceTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { isSubject?: boolean } }>;
  label?: string;
}

function CompsPriceTooltip({ active, payload, label }: CompsPriceTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const isSubject = entry.payload.isSubject;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          backgroundColor: isSubject ? CHART_COLORS.gold : CHART_COLORS.textSecondary,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>
          {isSubject ? "Subject" : "Comp"} $/sqft:
        </span>
        <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
          ${entry.value.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

export function CompsSection({ r }: { r: AnalysisResult }) {
  const { comps, distances } = generateMockComps(r);

  const subject: CompProperty = {
    address: r.address,
    price: r.purchasePrice,
    sqft: r.sqft,
    pricePerSqft: Math.round(r.purchasePrice / r.sqft),
    bedrooms: r.beds,
    bathrooms: r.baths,
    yearBuilt: r.yearBuilt,
  };

  const analysis = analyzeComps(
    { subject, radiusMiles: 2, maxComps: comps.length },
    comps,
    distances,
  );

  const { summary, comparables } = analysis;
  const subjectPsf = Math.round(r.purchasePrice / r.sqft);

  // Guard: should never be empty given mock generation always produces 5-6 comps
  if (comparables.length === 0) return null;

  // priceVsComps: positive = subject is above comps (expensive), negative = below (discount)
  const priceDelta = summary.priceVsComps; // already in %
  const isDealPriced = priceDelta <= 0; // at or below comps = good

  // Best comp = highest similarity score (analyzeComps sorts by similarity desc)
  // comparables.length > 0 is guaranteed above
  const bestComp = comparables[0]!;

  // Chart data: subject first (gold), then comps sorted by similarity (best first)
  const chartData = [
    { name: "Subject", psf: subjectPsf, isSubject: true },
    ...comparables.map((c, i) => ({
      name: `Comp ${i + 1}`,
      psf: Math.round(c.pricePerSqft),
      isSubject: false,
    })),
  ];

  // Short address label for the comps table (first part before first comma)
  function shortAddr(addr: string): string {
    return addr.split(",")[0] ?? addr;
  }

  // Format sale date as "MMM 'YY"
  function formatSaleDate(date?: string): string {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }

  const aiInsightText = (() => {
    const closestComp = bestComp;
    const closestPsf = Math.round(closestComp.adjustedPricePerSqft);
    const impliedFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(summary.impliedValue);
    const absBasis = Math.abs(priceDelta).toFixed(1);
    const dirText = isDealPriced ? "below" : "above";
    const assessment = isDealPriced
      ? "Purchasing below comp-implied value — strong entry point relative to the market."
      : "Purchase price exceeds comparable values. Negotiate down or identify unique features that justify the premium before committing.";
    return `Based on ${comparables.length} comparable sales within 2 miles, the comp-implied value is ${impliedFmt} — ${absBasis}% ${dirText} your purchase price. The closest comp at ${shortAddr(closestComp.address)} shows an adjusted $/sqft of $${closestPsf} vs your $${subjectPsf}/sqft. ${assessment}`;
  })();

  return (
    <div className="space-y-4">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gold-light" />
        <span className="section-label !text-gold-light">Comparable Sales</span>
        <span className="text-[10px] text-content-disabled ml-1">
          {comparables.length} comps · demo data
        </span>
      </div>

      {/* ── Row 1: Implied Value card + Subject vs Comps chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Implied Value Card */}
        <div className="card lg:col-span-2 flex flex-col gap-3">
          <div className="metric-label">Comp-Implied Value</div>
          <div
            className="font-mono text-3xl font-bold tabular-nums text-content-primary"
            aria-label={`Comp-implied value: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(summary.impliedValue)}`}
          >
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(summary.impliedValue)}
          </div>

          <div className="h-px bg-surface-border" />

          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-content-secondary">Purchase Price</span>
              <span className="font-mono text-content-primary tabular-nums">
                {formatCurrency(r.purchasePrice)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-content-secondary">vs Comps</span>
              <span
                className={`font-mono font-bold tabular-nums ${isDealPriced ? "text-emerald-light" : "text-rose-light"}`}
                aria-label={`${Math.abs(priceDelta).toFixed(1)}% ${isDealPriced ? "below" : "above"} comp-implied value`}
              >
                {isDealPriced ? "" : "+"}
                {priceDelta.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className={`mt-1 text-[11px] px-2 py-1.5 rounded-md font-medium ${isDealPriced ? "bg-emerald-muted text-emerald-light" : "bg-rose-muted text-rose-light"}`}>
            {isDealPriced
              ? `${Math.abs(priceDelta).toFixed(1)}% below market — buying at a discount`
              : `${priceDelta.toFixed(1)}% above market — negotiate or verify`}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
            <div>
              <div className="metric-label">Median $/sqft</div>
              <div className="font-mono text-sm font-semibold text-content-primary tabular-nums">
                ${summary.medianPricePerSqft}
              </div>
            </div>
            <div>
              <div className="metric-label">Subject $/sqft</div>
              <div className="font-mono text-sm font-semibold text-content-primary tabular-nums">
                ${subjectPsf}
              </div>
            </div>
          </div>
        </div>

        {/* $/sqft Horizontal Bar Chart */}
        <div
          className="card lg:col-span-3"
          aria-label={`Price per square foot comparison chart: subject property vs ${comparables.length} comparable sales`}
        >
          <div className="section-label flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            $/sqft vs Comps
          </div>

          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.gold }} />
              <span className="text-[10px] text-content-tertiary">Subject</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.textSecondary, opacity: 0.5 }} />
              <span className="text-[10px] text-content-tertiary">Comparable</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 4, bottom: 0 }}
              barCategoryGap="18%"
            >
              <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
              <XAxis
                type="number"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={(v: number) => `$${v}`}
                domain={[0, "auto"]}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                width={50}
              />
              <Tooltip content={<CompsPriceTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="psf" maxBarSize={18} radius={[0, 2, 2, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={`psf-${i}`}
                    fill={entry.isSubject ? CHART_COLORS.gold : CHART_COLORS.textSecondary}
                    fillOpacity={entry.isSubject ? 1 : 0.5}
                  />
                ))}
                <LabelList
                  dataKey="psf"
                  position="right"
                  formatter={(v: number) => `$${v}`}
                  style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: CHART_COLORS.textSecondary }}
                />
              </Bar>
              {/* Market median reference line */}
              <ReferenceLine
                x={summary.medianPricePerSqft}
                stroke={CHART_COLORS.amber}
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: "Median",
                  position: "insideTopRight",
                  fill: CHART_COLORS.amber,
                  fontSize: 9,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Comps Table ── */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Comparable Sales Detail
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table
            className="w-full text-[12px]"
            aria-label="Comparable sales table sorted by similarity score"
          >
            <thead>
              <tr className="text-content-disabled text-[10px] uppercase tracking-wider">
                <th className="text-left font-medium pb-2 pr-3" scope="col">Address</th>
                <th className="text-right font-medium pb-2 px-2" scope="col">Price</th>
                <th className="text-right font-medium pb-2 px-2" scope="col">$/sqft</th>
                <th className="text-center font-medium pb-2 px-2" scope="col">Bed/Bath</th>
                <th className="text-center font-medium pb-2 px-2" scope="col">Year</th>
                <th className="text-center font-medium pb-2 px-2" scope="col">Sold</th>
                <th className="text-center font-medium pb-2 px-2" scope="col">Dist.</th>
                <th className="text-right font-medium pb-2 pl-2" scope="col">Adj. Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {comparables.map((comp, idx) => {
                const isBest = idx === 0;
                return (
                  <tr
                    key={comp.address}
                    className={`hover:bg-white/[0.02] transition-colors ${isBest ? "ring-1 ring-inset ring-gold/25" : ""}`}
                  >
                    <td className="py-2 pr-3 max-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        {isBest && (
                          <Star
                            className="w-3 h-3 text-gold shrink-0"
                            aria-label="Best comparable"
                          />
                        )}
                        <span
                          className="text-content-primary font-medium truncate"
                          title={comp.address}
                        >
                          {shortAddr(comp.address)}
                        </span>
                      </div>
                      <div className="text-[10px] text-content-disabled mt-0.5">
                        {comp.similarity}% match
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-content-primary tabular-nums">
                      {fmtChartCurrency(comp.price)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-content-secondary tabular-nums">
                      ${comp.pricePerSqft}
                    </td>
                    <td className="py-2 px-2 text-center text-content-secondary">
                      {comp.bedrooms}bd/{comp.bathrooms}ba
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-content-secondary">
                      {comp.yearBuilt}
                    </td>
                    <td className="py-2 px-2 text-center text-content-secondary">
                      {formatSaleDate(comp.saleDate)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-content-disabled">
                      {comp.distance.toFixed(1)}mi
                    </td>
                    <td className="py-2 pl-2 text-right font-mono font-semibold text-gold-light tabular-nums">
                      {fmtChartCurrency(comp.adjustedPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[9px] text-content-disabled mt-3">
          Adjusted values apply $150/sqft, $15K/bed, $10K/bath, $500/yr-built corrections to each comp.
          Demo data generated deterministically from address.
        </p>
      </div>

      {/* ── AI Insight ── */}
      <AiInsightCard title="Comp Analysis">
        {aiInsightText}
      </AiInsightCard>
    </div>
  );
}

// ─── Deal Dimensions Chart ────────────────────────────────────────────────────

const DIM_CONFIG = {
  capRate:  { label: "Cap Rate",             color: CHART_COLORS.gold,       unit: "%",   rawFmt: (v: number) => `${v.toFixed(2)}%`    },
  cashFlow: { label: "Cash Flow",            color: CHART_COLORS.emerald,    unit: "$/mo",rawFmt: (v: number) => `$${v.toFixed(0)}/mo` },
  dscr:     { label: "DSCR",                color: CHART_COLORS.amber,       unit: "x",   rawFmt: (v: number) => `${v.toFixed(2)}x`    },
  coc:      { label: "Cash-on-Cash",         color: CHART_COLORS.roseLight,  unit: "%",   rawFmt: (v: number) => `${v.toFixed(2)}%`    },
  score:    { label: "Score",                color: "#8B5CF6",               unit: "",    rawFmt: (v: number) => `${v.toFixed(0)}`     },
  stress:   { label: "Stress Survival",      color: "#06B6D4",               unit: "%",   rawFmt: (v: number) => `${v.toFixed(0)}%`    },
  discount: { label: "Comp Discount",        color: CHART_COLORS.goldLight,  unit: "%",   rawFmt: (v: number) => `${v.toFixed(1)}%`    },
} as const;

type DimKey = keyof typeof DIM_CONFIG;
const ALL_DIMS = Object.keys(DIM_CONFIG) as DimKey[];

/** Normalize each dimension to 0–100 for radar rendering */
function normalizeDim(key: DimKey, value: number): number {
  switch (key) {
    case "capRate":  return Math.min(100, Math.max(0, value / 10 * 100));       // 10% cap rate = 100
    case "cashFlow": return Math.min(100, Math.max(0, (value + 500) / 2500 * 100)); // -500→0, 2000→100
    case "dscr":     return Math.min(100, Math.max(0, value / 2.0 * 100));      // 2.0x = 100
    case "coc":      return Math.min(100, Math.max(0, value / 12 * 100));       // 12% CoC = 100
    case "score":    return Math.min(100, Math.max(0, value));                   // already 0–100
    case "stress":   return Math.min(100, Math.max(0, value));                   // already 0–100
    case "discount": return Math.min(100, Math.max(0, (value + 20) / 40 * 100)); // -20% → 0, +20% → 100 (inverted: discount is good)
    default:         return 0;
  }
}

/** Extract raw values from AnalysisResult for each dimension */
function extractDimValues(r: AnalysisResult): Record<DimKey, number> {
  const survived = r.stress.scenarios.filter(s => s.survives).length;
  const total = r.stress.scenarios.length;
  // Comp discount: negative = subject below comps (good), positive = above (bad)
  // We invert: compDiscount > 0 means subject is cheaper than market
  const compDiscount = r.institutional.rules.find(ru => ru.metric.toLowerCase().includes("discount"))?.value ?? 0;
  return {
    capRate:  r.capRate,
    cashFlow: r.monthlyCashFlow,
    dscr:     r.dscr,
    coc:      r.cashOnCash,
    score:    r.score,
    stress:   total > 0 ? Math.round((survived / total) * 100) : 0,
    discount: compDiscount,
  };
}

interface RadarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { subject: string; normalized: number; raw: string } }>;
}

function DimRadarTooltip({ active, payload }: RadarTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {d.subject}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: CHART_COLORS.gold, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
          {d.raw}
        </span>
        <span style={{ fontSize: 10, color: CHART_COLORS.text }}>
          ({d.normalized.toFixed(0)}/100 normalized)
        </span>
      </div>
    </div>
  );
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { dimKey: DimKey; raw: number } }>;
  label?: string;
}

function DimBarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const cfg = DIM_CONFIG[entry.payload.dimKey];
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>{cfg.label}:</span>
        <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
          {cfg.rawFmt(entry.payload.raw)}
        </span>
      </div>
    </div>
  );
}

/** Mini SVG gauge for Gauge view */
function MiniGauge({ value, color, label, rawLabel }: { value: number; color: string; label: string; rawLabel: string }) {
  const MIN_A = 210, MAX_A = -30; // degrees: 210° start, sweep to -30° (300° total arc)
  const SWEEP = 240;
  const R = 30, cx = 36, cy = 38;

  function polar(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  function arcD(startDeg: number, endDeg: number) {
    const s = polar(startDeg);
    const e = polar(endDeg);
    const sweep = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${sweep} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const filledEnd = MIN_A - (value / 100) * SWEEP;
  const trackEnd = MIN_A - SWEEP;
  const clampedVal = Math.max(0, Math.min(100, value));
  const gaugeColor = clampedVal >= 70 ? CHART_COLORS.emerald : clampedVal >= 40 ? CHART_COLORS.amber : CHART_COLORS.rose;

  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 72 }}>
      <svg width={72} height={72} viewBox="0 0 72 72" role="img" aria-label={`${label}: ${rawLabel}`}>
        {/* Track */}
        <path d={arcD(MIN_A, trackEnd)} fill="none" stroke={CHART_COLORS.border} strokeWidth={7} strokeLinecap="round" />
        {/* Value arc */}
        {clampedVal > 0 && (
          <path d={arcD(MIN_A, filledEnd)} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
        )}
        {/* Center value */}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight={700} fill={gaugeColor}>
          {clampedVal.toFixed(0)}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize={7} fontFamily="Inter, sans-serif" fill={CHART_COLORS.text}>
          /100
        </text>
      </svg>
      <span className="text-[10px] text-content-tertiary text-center leading-tight px-1">{label}</span>
      <span className="text-[9px] font-mono text-content-disabled">{rawLabel}</span>
    </div>
  );
}

type ViewMode = "radar" | "bar" | "gauge";

export function DealDimensionsChart({ r }: { r: AnalysisResult }) {
  const [activeView, setActiveView] = useState<ViewMode>("radar");
  const [visibleDims, setVisibleDims] = useState<Set<DimKey>>(
    new Set<DimKey>(["capRate", "cashFlow", "dscr", "score", "stress"])
  );

  const rawValues = extractDimValues(r);

  function toggleDim(key: DimKey) {
    setVisibleDims(prev => {
      // Prevent collapsing to zero dimensions
      if (prev.has(key) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Build radar data: one point per visible dimension
  const radarData = ALL_DIMS
    .filter(k => visibleDims.has(k))
    .map(k => ({
      subject: DIM_CONFIG[k].label,
      normalized: normalizeDim(k, rawValues[k]),
      raw: DIM_CONFIG[k].rawFmt(rawValues[k]),
      dimKey: k,
    }));

  // Build bar data: one bar per visible dimension, grouped with a single series
  const barData = ALL_DIMS
    .filter(k => visibleDims.has(k))
    .map(k => ({
      name: DIM_CONFIG[k].label,
      normalized: normalizeDim(k, rawValues[k]),
      raw: rawValues[k],
      dimKey: k,
      color: DIM_CONFIG[k].color,
    }));

  const VIEW_BUTTONS: { mode: ViewMode; icon: typeof Activity; label: string }[] = [
    { mode: "radar", icon: Activity,  label: "Radar" },
    { mode: "bar",   icon: BarChart2, label: "Bar"   },
    { mode: "gauge", icon: Gauge,     label: "Gauge" },
  ];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-content-primary">
            Deal Analysis — <span className="text-gold-light">Multi-Dimensional View</span>
          </h3>
          <p className="text-[11px] text-content-tertiary mt-0.5">Toggle dimensions and switch visualization modes</p>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-elevated border border-surface-border">
          {VIEW_BUTTONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setActiveView(mode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                activeView === mode
                  ? "bg-gold-muted text-gold-light"
                  : "text-content-tertiary hover:text-content-secondary"
              }`}
              aria-pressed={activeView === mode}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dimension toggle pills */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Toggle chart dimensions">
        {ALL_DIMS.map(key => {
          const cfg = DIM_CONFIG[key];
          const active = visibleDims.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleDim(key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                active
                  ? "border-transparent text-black"
                  : "border-surface-border text-content-disabled bg-transparent hover:border-white/20 hover:text-content-tertiary"
              }`}
              style={active ? { backgroundColor: cfg.color } : {}}
              aria-pressed={active}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? "rgba(0,0,0,0.4)" : cfg.color }}
                aria-hidden="true"
              />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Radar View ── */}
      {activeView === "radar" && (
        <div aria-label={`Radar chart showing ${radarData.length} deal dimensions`}>
          {radarData.length < 3 ? (
            <div className="flex items-center justify-center h-40 text-content-tertiary text-sm">
              Enable at least 3 dimensions for radar view
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData} margin={{ top: 16, right: 32, left: 32, bottom: 16 }}>
                <PolarGrid
                  stroke={CHART_COLORS.border}
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: CHART_COLORS.textSecondary, fontSize: 11, fontFamily: "Inter, sans-serif" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: CHART_COLORS.text, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                  tickCount={5}
                />
                <Radar
                  name="Deal Dimensions"
                  dataKey="normalized"
                  stroke={CHART_COLORS.gold}
                  fill={CHART_COLORS.gold}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART_COLORS.gold, stroke: CHART_COLORS.surface }}
                  activeDot={{ r: 5, fill: CHART_COLORS.gold }}
                />
                <Tooltip content={<DimRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
          <p className="text-[9px] text-content-disabled mt-1 text-center">
            All dimensions normalized 0–100. Higher is better for each metric.
          </p>
        </div>
      )}

      {/* ── Bar View ── */}
      {activeView === "bar" && (
        <div aria-label={`Bar chart showing ${barData.length} deal dimensions`}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={barData}
              margin={{ top: 8, right: 8, left: 0, bottom: 32 }}
              barCategoryGap="28%"
            >
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                angle={-30}
                textAnchor="end"
                height={52}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={(v: number) => `${v}`}
                width={32}
                label={{ value: "Score (0–100)", angle: -90, position: "insideLeft", fill: CHART_COLORS.text, fontSize: 9, fontFamily: "JetBrains Mono, monospace", dy: 52 }}
              />
              <Tooltip content={<DimBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="normalized" maxBarSize={40} radius={[3, 3, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={`dim-bar-${i}`} fill={entry.color} fillOpacity={0.85} />
                ))}
                <LabelList
                  dataKey="normalized"
                  position="top"
                  formatter={(v: number) => v.toFixed(0)}
                  style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: CHART_COLORS.textSecondary }}
                />
              </Bar>
              {/* Thresholds */}
              <ReferenceLine y={75} stroke={CHART_COLORS.emerald} strokeDasharray="3 3" strokeOpacity={0.5}
                label={{ value: "Strong", position: "insideTopRight", fill: CHART_COLORS.emerald, fontSize: 8, fontFamily: "JetBrains Mono, monospace" }}
              />
              <ReferenceLine y={50} stroke={CHART_COLORS.amber} strokeDasharray="3 3" strokeOpacity={0.4}
                label={{ value: "Acceptable", position: "insideTopRight", fill: CHART_COLORS.amber, fontSize: 8, fontFamily: "JetBrains Mono, monospace" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Gauge View ── */}
      {activeView === "gauge" && (
        <div
          className="flex flex-wrap justify-center gap-4 py-4"
          aria-label={`Mini gauges for ${visibleDims.size} deal dimensions`}
        >
          {ALL_DIMS
            .filter(k => visibleDims.has(k))
            .map(key => {
              const cfg = DIM_CONFIG[key];
              const raw = rawValues[key];
              const norm = normalizeDim(key, raw);
              return (
                <MiniGauge
                  key={key}
                  value={norm}
                  color={cfg.color}
                  label={cfg.label}
                  rawLabel={cfg.rawFmt(raw)}
                />
              );
            })
          }
        </div>
      )}

      {/* Benchmark legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-surface-border">
        <span className="section-label">Benchmarks</span>
        {[
          { color: CHART_COLORS.emerald, label: "Strong (75+)" },
          { color: CHART_COLORS.amber,   label: "Acceptable (50–74)" },
          { color: CHART_COLORS.rose,    label: "Weak (<50)" },
        ].map(b => (
          <div key={b.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color, opacity: 0.7 }} aria-hidden="true" />
            <span className="text-[10px] text-content-tertiary">{b.label}</span>
          </div>
        ))}
        <span className="ml-auto text-[9px] text-content-disabled">Normalized to 0–100 scale</span>
      </div>
    </div>
  );
}

// ─── Verdict Card ────────────────────────────────────────────────────────────

export function VerdictCard({ r }: { r: AnalysisResult }) {
  const passing = r.institutional.rules.filter((rule) => rule.passes).length;
  const total = r.institutional.rules.length;
  const consensusPct = Math.round((passing / total) * 100);

  return (
    <div className={`card ${r.verdict === "BUY" ? "border-emerald/25" : "border-rose/25"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Verdict display */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold font-display ${
            r.verdict === "BUY"
              ? "bg-emerald-muted text-emerald-light border border-emerald/30"
              : "bg-rose-muted text-rose-light border border-rose/30"
          }`}>
            {r.verdict}
          </div>
          <div>
            <div className="text-[11px] text-content-tertiary uppercase tracking-wider mb-0.5">Confidence</div>
            <div className="font-mono text-2xl font-bold text-content-primary">{r.confidence}%</div>
          </div>
        </div>

        {/* Consensus bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-content-tertiary">Engine Consensus</span>
            <span className="font-mono text-xs text-content-secondary">{passing}/{total} pass</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${consensusPct >= 60 ? "bg-emerald" : "bg-rose"}`}
              style={{ width: `${consensusPct}%` }}
            />
          </div>
          <p className="text-xs text-content-secondary mt-2 leading-relaxed">{r.narrative}</p>
        </div>
      </div>

      {/* Next steps */}
      <div className="mt-4 pt-3 border-t border-surface-border">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium">Next Steps</div>
        <div className="space-y-1.5">
          {r.nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-content-secondary">
              <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-gold-light" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
