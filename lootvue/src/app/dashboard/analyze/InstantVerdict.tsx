"use client";

import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Minus,
  Flame, Thermometer, Snowflake,
  Clock, CheckCircle2, XCircle,
  ShieldCheck, ShieldAlert, ShieldX,
  Layers, SlidersHorizontal, Save, FileText,
  ArrowRight,
} from "lucide-react";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Types ───────────────────────────────────────────────────────────────────

type VerdictLevel = "STRONG BUY" | "BUY" | "HOLD" | "PASS";
type SignalLevel = "HOT" | "WARM" | "COLD" | "BUY" | "WAIT" | "HOLD" | "LOW" | "MED" | "HIGH";

interface Signal {
  label: string;
  value: SignalLevel;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

interface Props {
  result: AnalysisResult;
  downPct: number;
  rate: number;
  onSave: () => void;
  saved: boolean;
}

// ─── Derivation helpers ───────────────────────────────────────────────────────

function deriveVerdict(score: number): VerdictLevel {
  if (score >= 80) return "STRONG BUY";
  if (score >= 60) return "BUY";
  if (score >= 40) return "HOLD";
  return "PASS";
}

function verdictStyles(v: VerdictLevel): { ring: string; text: string; badge: string } {
  switch (v) {
    case "STRONG BUY":
      return {
        ring: "border-emerald/50 shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)]",
        text: "text-emerald-light",
        badge: "bg-emerald-muted border border-emerald/30 text-emerald-light",
      };
    case "BUY":
      return {
        ring: "border-emerald/30 shadow-[0_0_30px_-8px_rgba(16,185,129,0.25)]",
        text: "text-emerald-light",
        badge: "bg-emerald-muted border border-emerald/25 text-emerald-light",
      };
    case "HOLD":
      return {
        ring: "border-amber/30 shadow-[0_0_30px_-8px_rgba(245,158,11,0.25)]",
        text: "text-amber-light",
        badge: "bg-amber-muted border border-amber/25 text-amber-light",
      };
    case "PASS":
      return {
        ring: "border-rose/30 shadow-[0_0_30px_-8px_rgba(239,68,68,0.2)]",
        text: "text-rose-light",
        badge: "bg-rose-muted border border-rose/25 text-rose-light",
      };
  }
}

function scoreGradient(score: number): string {
  if (score >= 75) return "conic-gradient(from 270deg, #10B981 0%, #34D399 " + (score) + "%, #1A1A1A " + (score) + "%, #1A1A1A 100%)";
  if (score >= 55) return "conic-gradient(from 270deg, #F59E0B 0%, #FBBF24 " + (score) + "%, #1A1A1A " + (score) + "%, #1A1A1A 100%)";
  return "conic-gradient(from 270deg, #EF4444 0%, #F87171 " + (score) + "%, #1A1A1A " + (score) + "%, #1A1A1A 100%)";
}

function resilienceLabel(r: string): string {
  switch (r) {
    case "fortress": return "Fortress";
    case "strong": return "Strong";
    case "adequate": return "Adequate";
    case "fragile": return "Fragile";
    default: return "Thin";
  }
}

function stressPassCount(result: AnalysisResult): { pass: number; total: number } {
  const pass = result.stress.scenarios.filter((s) => s.survives).length;
  return { pass, total: result.stress.scenarios.length };
}

function deriveSignals(result: AnalysisResult): Signal[] {
  // Market signal — based on cap rate vs benchmark
  const capVsBenchmark = result.capRate - 5.5;
  const marketValue: SignalLevel = capVsBenchmark > 1 ? "HOT" : capVsBenchmark > 0 ? "WARM" : "COLD";
  const marketIcon =
    marketValue === "HOT" ? <Flame className="w-3 h-3" /> :
    marketValue === "WARM" ? <Thermometer className="w-3 h-3" /> :
    <Snowflake className="w-3 h-3" />;
  const marketColor =
    marketValue === "HOT" ? "text-emerald-light" :
    marketValue === "WARM" ? "text-amber-light" : "text-rose-light";
  const marketBg =
    marketValue === "HOT" ? "bg-emerald-muted border-emerald/20" :
    marketValue === "WARM" ? "bg-amber-muted border-amber/20" : "bg-rose-muted border-rose/20";

  // Timing signal — based on verdict
  const timingValue: SignalLevel =
    result.score >= 70 ? "BUY" :
    result.score >= 50 ? "WAIT" : "HOLD";
  const timingIcon =
    timingValue === "BUY" ? <CheckCircle2 className="w-3 h-3" /> :
    timingValue === "WAIT" ? <Clock className="w-3 h-3" /> :
    <Minus className="w-3 h-3" />;
  const timingColor =
    timingValue === "BUY" ? "text-emerald-light" :
    timingValue === "WAIT" ? "text-amber-light" : "text-content-secondary";
  const timingBg =
    timingValue === "BUY" ? "bg-emerald-muted border-emerald/20" :
    timingValue === "WAIT" ? "bg-amber-muted border-amber/20" : "bg-surface-elevated border-surface-border";

  // Risk signal — based on resilience
  const res = result.stress.resilience;
  const riskValue: SignalLevel =
    res === "fortress" || res === "strong" ? "LOW" :
    res === "adequate" ? "MED" : "HIGH";
  const riskIcon =
    riskValue === "LOW" ? <ShieldCheck className="w-3 h-3" /> :
    riskValue === "MED" ? <ShieldAlert className="w-3 h-3" /> :
    <ShieldX className="w-3 h-3" />;
  const riskColor =
    riskValue === "LOW" ? "text-emerald-light" :
    riskValue === "MED" ? "text-amber-light" : "text-rose-light";
  const riskBg =
    riskValue === "LOW" ? "bg-emerald-muted border-emerald/20" :
    riskValue === "MED" ? "bg-amber-muted border-amber/20" : "bg-rose-muted border-rose/20";

  // Portfolio Fit signal — from institutional rules pass rate
  const passing = result.institutional.rules.filter((r) => r.passes).length;
  const passPct = passing / result.institutional.rules.length;
  const fitValue: SignalLevel = passPct >= 0.65 ? "HIGH" : passPct >= 0.45 ? "MED" : "LOW";
  const fitIcon = <Layers className="w-3 h-3" />;
  const fitColor =
    fitValue === "HIGH" ? "text-emerald-light" :
    fitValue === "MED" ? "text-amber-light" : "text-rose-light";
  const fitBg =
    fitValue === "HIGH" ? "bg-emerald-muted border-emerald/20" :
    fitValue === "MED" ? "bg-amber-muted border-amber/20" : "bg-rose-muted border-rose/20";

  return [
    { label: "Market", value: marketValue, icon: marketIcon, colorClass: marketColor, bgClass: marketBg },
    { label: "Timing", value: timingValue, icon: timingIcon, colorClass: timingColor, bgClass: timingBg },
    { label: "Risk", value: riskValue, icon: riskIcon, colorClass: riskColor, bgClass: riskBg },
    { label: "Portfolio Fit", value: fitValue, icon: fitIcon, colorClass: fitColor, bgClass: fitBg },
  ];
}

function deriveNarrative(result: AnalysisResult, verdict: VerdictLevel): string {
  const { pass, total } = stressPassCount(result);
  const cf = result.monthlyCashFlow;
  const cashDesc =
    cf > 500 ? "Strong cash flow" :
    cf > 200 ? "Positive cash flow" :
    cf > 0 ? "Thin cash flow" : "Negative cash flow";
  const capDesc = result.capRate > 7 ? "above-market cap rate" : result.capRate > 5.5 ? "market-rate cap rate" : "compressed cap rate";
  const probPct = result.confidence;

  if (verdict === "STRONG BUY") {
    return `${cashDesc} with ${capDesc} — ${probPct}% probability of positive returns across ${pass}/${total} stress scenarios.`;
  }
  if (verdict === "BUY") {
    return `Solid fundamentals with ${capDesc}. ${probPct}% probability of positive returns, surviving ${pass}/${total} stress tests.`;
  }
  if (verdict === "HOLD") {
    return `Marginal deal with ${capDesc}. Survives ${pass}/${total} stress scenarios — renegotiate price or wait for better entry.`;
  }
  return `${cashDesc} and ${capDesc}. Only ${pass}/${total} stress scenarios pass. Reconsider unless price drops significantly.`;
}

// ─── Key Metric Cell ─────────────────────────────────────────────────────────

interface MetricCellProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  accent?: "emerald" | "amber" | "rose" | "gold" | "default";
}

function MetricCell({ label, value, sub, trend, accent = "default" }: MetricCellProps) {
  const valueColor =
    accent === "emerald" ? "text-emerald-light" :
    accent === "amber" ? "text-amber-light" :
    accent === "rose" ? "text-rose-light" :
    accent === "gold" ? "text-gold-light" :
    "text-content-primary";

  const TrendIcon =
    trend === "up" ? TrendingUp :
    trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-light" :
    trend === "down" ? "text-rose-light" : "text-content-disabled";

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
      <div className="metric-label whitespace-nowrap">{label}</div>
      <div className={`font-mono text-sm font-bold tabular-nums ${valueColor}`}>{value}</div>
      {(sub || trend) && (
        <div className={`flex items-center gap-0.5 text-[10px] ${trendColor}`}>
          {trend && <TrendIcon className="w-2.5 h-2.5" />}
          {sub && <span className="text-content-disabled">{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Signal Pill ─────────────────────────────────────────────────────────────

function SignalPill({ signal }: { signal: Signal }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${signal.bgClass}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-medium text-content-disabled uppercase tracking-wider leading-none mb-0.5">
          {signal.label}
        </span>
        <div className={`flex items-center gap-1 font-bold text-xs ${signal.colorClass}`}>
          {signal.icon}
          <span>{signal.value}</span>
        </div>
      </div>
    </div>
  );
}

// ─── InstantVerdict ───────────────────────────────────────────────────────────

export function InstantVerdict({ result, downPct, rate, onSave, saved }: Props) {
  const router = useRouter();
  const loadDeal = useSimulatorStore((s) => s.loadDeal);

  const verdict = deriveVerdict(result.score);
  const styles = verdictStyles(verdict);
  const signals = deriveSignals(result);
  const narrative = deriveNarrative(result, verdict);
  const { pass, total } = stressPassCount(result);
  const irr = result.institutional.leveredIRR;
  const irrAccent: MetricCellProps["accent"] = irr >= 15 ? "emerald" : irr >= 10 ? "amber" : "rose";
  const cfAccent: MetricCellProps["accent"] =
    result.monthlyCashFlow > 200 ? "emerald" :
    result.monthlyCashFlow > 0 ? "amber" : "rose";
  const dscrAccent: MetricCellProps["accent"] =
    result.dscr >= 1.25 ? "emerald" :
    result.dscr >= 1.0 ? "amber" : "rose";
  const stressAccent: MetricCellProps["accent"] =
    result.stress.resilience === "fortress" || result.stress.resilience === "strong" ? "emerald" :
    result.stress.resilience === "adequate" ? "amber" : "rose";

  const openInSimulator = () => {
    loadDeal({
      purchasePrice: result.purchasePrice,
      monthlyRent: result.monthlyRent,
      downPaymentPct: downPct,
      interestRate: rate,
    });
    router.push("/dashboard/simulator");
  };

  return (
    <div
      className={`card border-2 ${styles.ring} animate-scale-in`}
      role="region"
      aria-label="Instant deal verdict"
    >
      {/* ── Top strip: score + verdict + address ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">

        {/* Score circle */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: scoreGradient(result.score),
              padding: "3px",
            }}
            aria-label={`Score: ${result.score} out of 100`}
          >
            <div className="w-full h-full rounded-full bg-surface-card flex flex-col items-center justify-center">
              <span className={`font-mono text-2xl font-bold tabular-nums leading-none ${styles.text}`}>
                {result.score}
              </span>
              <span className="text-[8px] text-content-disabled uppercase tracking-wider mt-0.5">/ 100</span>
            </div>
          </div>

          {/* Verdict badge + address */}
          <div className="flex flex-col gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-lg text-sm font-bold tracking-wide ${styles.badge}`}
            >
              {verdict === "STRONG BUY" || verdict === "BUY" ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : verdict === "HOLD" ? (
                <Minus className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {verdict}
            </span>
            <p className="text-[11px] text-content-tertiary font-medium truncate max-w-[220px]">
              {result.address}
            </p>
            <p className="text-[10px] text-content-disabled">
              {result.beds}bd / {result.baths}ba &middot; {result.sqft.toLocaleString()} sqft &middot; {result.yearBuilt}
            </p>
          </div>
        </div>

        {/* Narrative + confidence */}
        <div className="flex-1 sm:border-l sm:border-surface-border sm:pl-5">
          <p className="text-sm text-content-secondary leading-relaxed">{narrative}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider">Confidence</span>
              <span className={`font-mono text-xs font-bold ${styles.text}`}>{result.confidence}%</span>
            </div>
            <div className="w-px h-3 bg-surface-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider">Stress</span>
              <span className={`font-mono text-xs font-bold ${stressAccent === "emerald" ? "text-emerald-light" : stressAccent === "amber" ? "text-amber-light" : "text-rose-light"}`}>
                {pass}/{total} pass
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Key Metrics strip ── */}
      <div className="mt-5 pt-4 border-t border-surface-border">
        <div
          className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
          role="list"
          aria-label="Key financial metrics"
        >
          {/* Metric 1: Cash Flow */}
          <div role="listitem" className="shrink-0">
            <MetricCell
              label="Cash Flow/mo"
              value={formatCurrency(result.monthlyCashFlow)}
              trend={result.monthlyCashFlow > 0 ? "up" : result.monthlyCashFlow < 0 ? "down" : "flat"}
              accent={cfAccent}
            />
          </div>

          <div className="w-px bg-surface-border shrink-0 self-stretch" role="separator" />

          {/* Metric 2: Cap Rate */}
          <div role="listitem" className="shrink-0">
            <MetricCell
              label="Cap Rate"
              value={`${result.capRate.toFixed(2)}%`}
              sub={result.capRate > 5.5 ? "above mkt" : "below mkt"}
              accent={result.capRate > 6.5 ? "emerald" : result.capRate > 5 ? "amber" : "rose"}
            />
          </div>

          <div className="w-px bg-surface-border shrink-0 self-stretch" role="separator" />

          {/* Metric 3: IRR */}
          <div role="listitem" className="shrink-0">
            <MetricCell
              label="Levered IRR"
              value={`${irr.toFixed(1)}%`}
              sub={irr >= 15 ? "clears hurdle" : "below 15%"}
              accent={irrAccent}
            />
          </div>

          <div className="w-px bg-surface-border shrink-0 self-stretch" role="separator" />

          {/* Metric 4: DSCR */}
          <div role="listitem" className="shrink-0">
            <MetricCell
              label="DSCR"
              value={`${result.dscr.toFixed(2)}x`}
              sub={result.dscr >= 1.25 ? "lender-safe" : result.dscr >= 1 ? "borderline" : "breaks coverage"}
              accent={dscrAccent}
            />
          </div>

          <div className="w-px bg-surface-border shrink-0 self-stretch" role="separator" />

          {/* Metric 5: P(Positive Return) */}
          <div role="listitem" className="shrink-0">
            <MetricCell
              label="P(Return+)"
              value={`${result.confidence}%`}
              sub="probability"
              accent={result.confidence >= 70 ? "emerald" : result.confidence >= 55 ? "amber" : "rose"}
            />
          </div>

          <div className="w-px bg-surface-border shrink-0 self-stretch" role="separator" />

          {/* Metric 6: Stress Resilience */}
          <div role="listitem" className="shrink-0">
            <MetricCell
              label="Stress Resilience"
              value={resilienceLabel(result.stress.resilience)}
              sub={`${pass}/${total} scenarios`}
              accent={stressAccent}
            />
          </div>
        </div>
      </div>

      {/* ── 4 Signal pills ── */}
      <div className="mt-4 pt-4 border-t border-surface-border">
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          role="list"
          aria-label="Deal signals"
        >
          {signals.map((signal) => (
            <div key={signal.label} role="listitem">
              <SignalPill signal={signal} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="mt-5 pt-4 border-t border-surface-border flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={openInSimulator}
          className="btn-primary flex-1 sm:flex-none"
          aria-label="Open this deal in the scenario simulator"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Open in Simulator
        </button>

        <button
          onClick={onSave}
          disabled={saved}
          className={`flex-1 sm:flex-none ${saved ? "btn-secondary opacity-60 cursor-default" : "btn-emerald"}`}
          aria-label={saved ? "Deal saved to pipeline" : "Save this deal to your pipeline"}
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved to Pipeline" : "Save to Pipeline"}
        </button>

        <button
          className="btn-secondary flex-1 sm:flex-none"
          aria-label="Generate full investment report"
        >
          <FileText className="w-4 h-4" />
          Full Report
        </button>

        <button
          onClick={() => document.getElementById("full-analysis")?.scrollIntoView({ behavior: "smooth" })}
          className="btn-ghost sm:ml-auto"
          aria-label="Scroll down to full analysis details"
        >
          <span>Full Analysis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
