"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, Shield, TrendingUp, ChevronDown, ChevronUp, Info, Database, Calculator,
} from "lucide-react";
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

// ─── Stress Test Card ────────────────────────────────────────────────────────

export function StressTestCard({ stress }: { stress: StressTestResult }) {
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

      <div className="overflow-x-auto -mx-5 px-5">
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
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-light mx-auto" />
                    : <XCircle className="w-3.5 h-3.5 text-rose-light mx-auto" />}
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

// ─── Exit Cap Sensitivity ────────────────────────────────────────────────────

export function ExitCapTable({ sens }: { sens: InstitutionalMetrics["exitCapRateSensitivity"] }) {
  return (
    <div className="card">
      <div className="section-label flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
        Exit Cap Sensitivity
      </div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-content-disabled text-[10px] uppercase tracking-wider">
              <th className="text-left font-medium pb-2 pr-3">Exit Cap</th>
              <th className="text-right font-medium pb-2 px-3">Exit Price</th>
              <th className="text-right font-medium pb-2 px-3">Total Return</th>
              <th className="text-right font-medium pb-2 pl-3">Levered IRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sens.map((row) => (
              <tr key={row.exitCap} className="hover:bg-white/[0.02]">
                <td className="py-2 pr-3 font-mono font-medium text-content-primary">{row.exitCap.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right font-mono text-content-secondary">{formatCurrency(row.exitPrice)}</td>
                <td className={`py-2 px-3 text-right font-mono ${row.totalReturn >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                  {row.totalReturn >= 0 ? "+" : ""}{row.totalReturn.toFixed(1)}%
                </td>
                <td className={`py-2 pl-3 text-right font-mono font-semibold ${row.irr >= 15 ? "text-emerald-light" : row.irr >= 10 ? "text-amber-light" : "text-rose-light"}`}>
                  {row.irr.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
