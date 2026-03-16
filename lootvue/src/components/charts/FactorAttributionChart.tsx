"use client";

/**
 * FactorAttributionChart
 *
 * SHAP-style waterfall visualization showing which factors push a score up
 * (emerald) or down (rose). Bars are horizontal, sorted positive-first then
 * negative, with a net-contribution row and base score label.
 *
 * Built with a fully custom SVG/div layout rather than Recharts BarChart
 * because:
 *  1. We need a waterfall anchor (running total) that Recharts doesn't support
 *     natively for horizontal charts.
 *  2. We need rich inline labels (name + value) that Recharts clips on small
 *     viewports.
 *  3. We need per-bar enter animations with stagger.
 *
 * CHART_COLORS and TOOLTIP_STYLE from ChartTheme are used for all palette
 * references to stay consistent with the rest of the design system.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { CHART_COLORS, TOOLTIP_STYLE } from "./ChartTheme";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

export interface FactorDatum {
  /** Factor name — "Months of supply (tight)" */
  name: string;
  /** Contribution value — positive pushes score up, negative pulls it down */
  value: number;
  /** Optional domain tag for grouping — "market" | "deal" | "risk" */
  category?: string;
}

export interface FactorAttributionChartProps {
  factors: FactorDatum[];
  /** Final composite score (e.g., 74) */
  totalScore: number;
  /** Score ceiling for the progress arc label (e.g., 100) */
  maxScore: number;
  /** Card heading override */
  title?: string;
  /** Max bars to display before "show more" toggle (default: 8) */
  initialVisible?: number;
}

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const BAR_HEIGHT = 24;
const LABEL_COL = 180;  // px reserved for factor name on left
const VALUE_COL = 52;   // px reserved for ±XX.X on right

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 75) return CHART_COLORS.emerald;
  if (score >= 55) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

function fmtContrib(v: number): string {
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(1)}`;
}

/** Sort: positive contributions descending, then negative descending by magnitude */
function sortFactors(factors: FactorDatum[]): FactorDatum[] {
  const pos = factors.filter((f) => f.value >= 0).sort((a, b) => b.value - a.value);
  const neg = factors.filter((f) => f.value < 0).sort((a, b) => a.value - b.value);
  return [...pos, ...neg];
}

/* ─────────────────────────────────────────────────────────────
   SCORE BADGE
───────────────────────────────────────────────────────────── */

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const color = scoreColor(score);
  const pct = Math.min(100, Math.max(0, (score / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: 48, height: 48 }} aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48">
          {/* Track */}
          <circle cx="24" cy="24" r="20" fill="none" stroke="#1F1F1F" strokeWidth="4" />
          {/* Progress */}
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 125.66} 125.66`}
            transform="rotate(-90 24 24)"
            style={{ opacity: 0.85 }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <div>
        <p className="text-[11px] text-content-tertiary uppercase tracking-wider">Score</p>
        <p className="text-[11px] font-mono text-content-secondary">out of {max}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SINGLE FACTOR ROW
───────────────────────────────────────────────────────────── */

interface FactorRowProps {
  factor: FactorDatum;
  maxAbsValue: number;
  index: number;
  animated: boolean;
  onHover: (e: React.MouseEvent, factor: FactorDatum | null) => void;
}

function FactorRow({ factor, maxAbsValue, index, animated, onHover }: FactorRowProps) {
  const isPositive = factor.value >= 0;
  const color = isPositive ? CHART_COLORS.emerald : CHART_COLORS.rose;
  const bgColor = isPositive
    ? "rgba(16,185,129,0.08)"
    : "rgba(239,68,68,0.08)";

  // Bar width proportional to absolute value vs the largest factor
  const proportion = maxAbsValue > 0 ? Math.abs(factor.value) / maxAbsValue : 0;
  const barWidthPct = proportion * 100;
  const animDelay = `${index * 50}ms`;

  return (
    <div
      className="flex items-center gap-2 group cursor-default"
      role="listitem"
      aria-label={`${factor.name}: ${fmtContrib(factor.value)} contribution`}
      onMouseEnter={(e) => onHover(e, factor)}
      onMouseLeave={(e) => onHover(e, null)}
    >
      {/* Factor name column */}
      <div
        className="shrink-0 flex items-center gap-1.5"
        style={{ width: LABEL_COL }}
      >
        {isPositive
          ? <TrendingUp className="w-3 h-3 shrink-0" style={{ color: CHART_COLORS.emerald }} aria-hidden="true" />
          : <TrendingDown className="w-3 h-3 shrink-0" style={{ color: CHART_COLORS.rose }} aria-hidden="true" />
        }
        <span
          className="text-[11px] truncate leading-tight"
          style={{ color: "#999999" }}
          title={factor.name}
        >
          {factor.name}
        </span>
      </div>

      {/* Bar track */}
      <div
        className="relative flex-1 rounded-sm overflow-hidden"
        style={{ height: BAR_HEIGHT }}
        aria-hidden="true"
      >
        {/* Track fill */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
        />
        {/* Signal bar */}
        <div
          className="absolute inset-y-2 left-0 rounded-sm"
          style={{
            width: animated ? `${barWidthPct}%` : "0%",
            backgroundColor: color,
            opacity: 0.8,
            transition: animated
              ? `width 300ms cubic-bezier(0.16,1,0.3,1) ${animDelay}`
              : undefined,
          }}
        />
        {/* Tint fill */}
        <div
          className="absolute inset-0"
          style={{
            width: animated ? `${barWidthPct}%` : "0%",
            backgroundColor: bgColor,
            transition: animated
              ? `width 300ms cubic-bezier(0.16,1,0.3,1) ${animDelay}`
              : undefined,
          }}
        />
      </div>

      {/* Value column */}
      <div
        className="shrink-0 text-right"
        style={{ width: VALUE_COL }}
      >
        <span
          className="text-[11px] font-mono font-semibold tabular-nums"
          style={{ color }}
        >
          {fmtContrib(factor.value)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NET CONTRIBUTION ROW
───────────────────────────────────────────────────────────── */

function NetRow({ positive, negative, total }: { positive: number; negative: number; total: number }) {
  const netColor = total >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose;
  return (
    <div
      className="flex items-center gap-2 pt-2 border-t"
      style={{ borderColor: "#1F1F1F" }}
      role="row"
      aria-label={`Net contribution: ${fmtContrib(total)}`}
    >
      <div className="shrink-0 flex items-center gap-1.5" style={{ width: LABEL_COL }}>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: CHART_COLORS.text }}>Net</span>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[11px] font-mono text-content-disabled">
          +{positive.toFixed(1)}
        </span>
        <span className="text-[10px]" style={{ color: CHART_COLORS.text }}>−</span>
        <span className="text-[11px] font-mono text-content-disabled">
          {Math.abs(negative).toFixed(1)}
        </span>
        <span className="text-[10px]" style={{ color: CHART_COLORS.text }}>=</span>
        <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: netColor }}>
          {fmtContrib(total)}
        </span>
      </div>
      <div className="shrink-0" style={{ width: VALUE_COL }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────── */

function AttributionSkeleton() {
  return (
    <div className="space-y-2.5" aria-label="Loading factors..." aria-busy="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="skeleton shrink-0 rounded" style={{ width: LABEL_COL, height: 14 }} />
          <div className="skeleton flex-1 rounded" style={{ height: BAR_HEIGHT }} />
          <div className="skeleton shrink-0 rounded" style={{ width: VALUE_COL, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function FactorAttributionChart({
  factors,
  totalScore,
  maxScore,
  title,
  initialVisible = 8,
}: FactorAttributionChartProps) {
  const [animated, setAnimated] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    factor: FactorDatum | null;
  }>({ visible: false, x: 0, y: 0, factor: null });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setAnimated(false);
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [factors]);

  const sorted = useMemo(() => sortFactors(factors), [factors]);
  const visible = showAll ? sorted : sorted.slice(0, initialVisible);
  const hasMore = sorted.length > initialVisible;

  const maxAbsValue = useMemo(
    () => Math.max(...factors.map((f) => Math.abs(f.value)), 1),
    [factors],
  );

  const positiveSum = useMemo(
    () => factors.filter((f) => f.value >= 0).reduce((acc, f) => acc + f.value, 0),
    [factors],
  );
  const negativeSum = useMemo(
    () => factors.filter((f) => f.value < 0).reduce((acc, f) => acc + f.value, 0),
    [factors],
  );
  const netSum = positiveSum + negativeSum;

  function handleHover(e: React.MouseEvent, factor: FactorDatum | null) {
    if (!factor) {
      setTooltip((t) => ({ ...t, visible: false, factor: null }));
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 8,
      factor,
    });
  }

  // Empty state
  if (!factors || factors.length === 0) {
    return (
      <div className="card">
        <p className="section-label mb-4">
          {title ?? "What's Driving This Score"}
        </p>
        <AttributionSkeleton />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="card relative space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">{title ?? "What's Driving This Score"}</p>
          <p className="text-[11px] text-content-disabled mt-0.5">
            Factors sorted by contribution magnitude
          </p>
        </div>
        <ScoreBadge score={totalScore} max={maxScore} />
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: "#1F1F1F" }}>
        <span
          className="shrink-0 text-[10px] uppercase tracking-wider"
          style={{ width: LABEL_COL, color: CHART_COLORS.text }}
        >
          Factor
        </span>
        <span
          className="flex-1 text-[10px] uppercase tracking-wider"
          style={{ color: CHART_COLORS.text }}
        >
          Impact
        </span>
        <span
          className="shrink-0 text-[10px] uppercase tracking-wider text-right"
          style={{ width: VALUE_COL, color: CHART_COLORS.text }}
        >
          Pts
        </span>
      </div>

      {/* Factor rows */}
      <div
        className="space-y-1"
        role="list"
        aria-label="Factor contributions"
      >
        {visible.map((factor, i) => (
          <FactorRow
            key={`${factor.name}-${i}`}
            factor={factor}
            maxAbsValue={maxAbsValue}
            index={i}
            animated={animated}
            onHover={handleHover}
          />
        ))}
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] text-content-disabled hover:text-content-secondary transition-colors flex items-center gap-1"
          aria-expanded={showAll}
        >
          {showAll
            ? `↑ Show fewer factors`
            : `↓ Show ${sorted.length - initialVisible} more factor${sorted.length - initialVisible !== 1 ? "s" : ""}`}
        </button>
      )}

      {/* Missing factors notice */}
      {factors.length < 3 && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: CHART_COLORS.amber }}>
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Limited data — score may shift as more factors load</span>
        </div>
      )}

      {/* Net row */}
      <NetRow positive={positiveSum} negative={negativeSum} total={netSum} />

      {/* Floating tooltip */}
      {tooltip.visible && tooltip.factor && (
        <div
          role="tooltip"
          style={{
            ...TOOLTIP_STYLE,
            position: "absolute",
            top: tooltip.y,
            left: tooltip.x,
            pointerEvents: "none",
            zIndex: 50,
            maxWidth: 240,
          }}
        >
          <p style={{ fontSize: 11, color: "#FAFAFA", fontWeight: 600, marginBottom: 4 }}>
            {tooltip.factor.name}
          </p>
          <p
            style={{
              fontSize: 13,
              color: tooltip.factor.value >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose,
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            {fmtContrib(tooltip.factor.value)} pts
          </p>
          {tooltip.factor.category && (
            <p style={{ fontSize: 10, color: CHART_COLORS.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {tooltip.factor.category}
            </p>
          )}
          <p style={{ fontSize: 10, color: CHART_COLORS.text, marginTop: 4 }}>
            {Math.abs(tooltip.factor.value / maxAbsValue * 100).toFixed(0)}% of max factor impact
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA — dev/storybook use only
───────────────────────────────────────────────────────────── */

export const SAMPLE_FACTORS: FactorDatum[] = [
  { name: "Months of supply (tight)",   value: 12.4, category: "market" },
  { name: "Permits accelerating",        value: 10.2, category: "market" },
  { name: "Employment growing",          value:  6.8, category: "market" },
  { name: "HPI momentum positive",       value:  3.1, category: "market" },
  { name: "Rates above average",         value: -4.2, category: "market" },
  { name: "Affordability declining",     value: -3.3, category: "deal"   },
  { name: "Insurance costs rising",      value: -1.8, category: "risk"   },
];
