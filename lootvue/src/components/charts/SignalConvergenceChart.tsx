"use client";

/**
 * SignalConvergenceChart
 *
 * Renders 5 market signals as horizontal bars where bar direction and color
 * encode the signal direction (bullish = right/emerald, bearish = left/rose,
 * neutral = short/amber). A convergence summary row shows dot indicators and
 * historical context.
 *
 * The bars are built with a custom SVG layout rather than Recharts BarChart
 * because we need bidirectional bars that grow from a center axis, inline
 * plain-English annotations under each bar, and staggered CSS animations —
 * none of which Recharts horizontal BarChart handles cleanly at 24px bar height.
 * We still import CHART_COLORS and TOOLTIP_STYLE from ChartTheme for consistency.
 */

import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { CHART_COLORS, TOOLTIP_STYLE } from "./ChartTheme";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

export interface SignalDatum {
  /** Display name shown on the left rail — "Supply", "Permits", etc. */
  name: string;
  /** One-liner plain-English explanation shown below the bar */
  plainEnglish: string;
  /** z-score magnitude: positive = bullish, negative = bearish */
  value: number;
  /** Short label rendered at the right end of the bar — "2.1 months", "+34%" */
  label: string;
  direction: "bullish" | "bearish" | "neutral";
}

export interface SignalConvergenceChartProps {
  signals: SignalDatum[];
  /** How many signals are bullish (0-5) */
  convergenceCount: number;
  /** Historical context string shown in the convergence footer */
  historicalContext: string;
  /** Market identifier shown in the header — "Austin, TX" */
  market: string;
  /** Suppress plain-English annotations (collapses them by default) */
  defaultExpanded?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const BAR_HEIGHT = 24; // px — matches the spec
const MAX_Z = 3.5;     // clip z-score domain to ±3.5

const SIGNAL_COLOR: Record<SignalDatum["direction"], string> = {
  bullish: CHART_COLORS.emerald,
  bearish: CHART_COLORS.rose,
  neutral: CHART_COLORS.amber,
};

const SIGNAL_BG: Record<SignalDatum["direction"], string> = {
  bullish: "rgba(16,185,129,0.10)",
  bearish: "rgba(239,68,68,0.10)",
  neutral: "rgba(245,158,11,0.10)",
};

/* ─────────────────────────────────────────────────────────────
   HELPER — direction icon
───────────────────────────────────────────────────────────── */

function DirectionIcon({ direction }: { direction: SignalDatum["direction"] }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  if (direction === "bullish") return <TrendingUp className={cls} style={{ color: CHART_COLORS.emerald }} aria-hidden="true" />;
  if (direction === "bearish") return <TrendingDown className={cls} style={{ color: CHART_COLORS.rose }} aria-hidden="true" />;
  return <Minus className={cls} style={{ color: CHART_COLORS.amber }} aria-hidden="true" />;
}

/* ─────────────────────────────────────────────────────────────
   TOOLTIP
───────────────────────────────────────────────────────────── */

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  signal: SignalDatum | null;
}

/* ─────────────────────────────────────────────────────────────
   SINGLE SIGNAL ROW
───────────────────────────────────────────────────────────── */

interface SignalRowProps {
  signal: SignalDatum;
  index: number;
  expanded: boolean;
  animated: boolean;
  onHover: (e: React.MouseEvent, signal: SignalDatum | null) => void;
}

function SignalRow({ signal, index, expanded, animated, onHover }: SignalRowProps) {
  const color = SIGNAL_COLOR[signal.direction];
  const bg = SIGNAL_BG[signal.direction];
  const clipped = Math.min(Math.abs(signal.value), MAX_Z);
  const pct = (clipped / MAX_Z) * 100;

  // Bar grows from center (50%) toward right for bullish, left for bearish
  const barLeft = signal.direction === "bullish" ? 50 : 50 - pct / 2;
  const barWidth = pct / 2;

  const animatedWidth = animated ? barWidth : 0;
  const animDelay = `${index * 60}ms`;

  return (
    <div
      className="group"
      style={{ animationDelay: animDelay }}
    >
      {/* Label row */}
      <div
        className="flex items-center gap-2 cursor-default select-none"
        onMouseEnter={(e) => onHover(e, signal)}
        onMouseLeave={(e) => onHover(e, null)}
        role="listitem"
        aria-label={`${signal.name}: ${signal.direction}, ${signal.label}`}
      >
        {/* Signal name — fixed 80px column */}
        <div className="flex items-center gap-1.5 shrink-0" style={{ width: 88 }}>
          <DirectionIcon direction={signal.direction} />
          <span
            className="text-[12px] font-medium truncate"
            style={{ color: "#FAFAFA" }}
          >
            {signal.name}
          </span>
        </div>

        {/* Bar track */}
        <div className="relative flex-1 rounded-sm overflow-hidden" style={{ height: BAR_HEIGHT }}>
          {/* Track background */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            aria-hidden="true"
          />
          {/* Center line */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: "50%", backgroundColor: "#1F1F1F" }}
            aria-hidden="true"
          />
          {/* Signal bar */}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-sm"
            style={{
              left: `${barLeft}%`,
              width: `${animatedWidth}%`,
              backgroundColor: color,
              opacity: 0.85,
              transition: animated ? `width 300ms cubic-bezier(0.16,1,0.3,1) ${animDelay}, left 300ms cubic-bezier(0.16,1,0.3,1) ${animDelay}` : undefined,
            }}
            aria-hidden="true"
          />
          {/* Subtle fill tint across full half */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: signal.direction === "bullish" ? "50%" : `${50 - pct / 2}%`,
              width: `${pct / 2}%`,
              backgroundColor: bg,
              transition: animated ? `width 300ms cubic-bezier(0.16,1,0.3,1) ${animDelay}` : undefined,
            }}
            aria-hidden="true"
          />
        </div>

        {/* Value label — fixed 72px column, right-aligned mono */}
        <div className="shrink-0 text-right" style={{ width: 72 }}>
          <span
            className="text-[11px] font-mono font-semibold tabular-nums"
            style={{ color }}
          >
            {signal.label}
          </span>
        </div>
      </div>

      {/* Plain-English annotation — collapsible */}
      {expanded && (
        <div
          className="ml-[96px] mr-[80px] mt-0.5 mb-1"
          style={{ paddingLeft: 4 }}
        >
          <p
            className="text-[11px] italic leading-snug"
            style={{ color: CHART_COLORS.text }}
          >
            {signal.plainEnglish}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CONVERGENCE DOTS
───────────────────────────────────────────────────────────── */

function ConvergenceDots({
  count,
  total,
}: {
  count: number;
  total: number;
}) {
  const confidence =
    count >= total - 1 ? "HIGH" :
    count >= Math.ceil(total / 2) ? "MODERATE" :
    "LOW";

  const confColor =
    confidence === "HIGH" ? CHART_COLORS.emerald :
    confidence === "MODERATE" ? CHART_COLORS.amber :
    CHART_COLORS.rose;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1.5"
        role="img"
        aria-label={`${count} of ${total} signals bullish`}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: 10,
              height: 10,
              backgroundColor: i < count ? CHART_COLORS.emerald : "#1F1F1F",
              border: `1.5px solid ${i < count ? CHART_COLORS.emerald : "#333"}`,
              boxShadow: i < count ? `0 0 6px ${CHART_COLORS.emerald}40` : undefined,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span
        className="text-[11px] font-semibold font-mono tracking-wider"
        style={{ color: confColor }}
      >
        {count}/{total} — {confidence} CONFIDENCE
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────── */

function SignalSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading signals..." aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="skeleton shrink-0 rounded" style={{ width: 88, height: 16 }} />
          <div className="skeleton flex-1 rounded" style={{ height: BAR_HEIGHT }} />
          <div className="skeleton shrink-0 rounded" style={{ width: 64, height: 14 }} />
        </div>
      ))}
      <div className="skeleton rounded mt-4" style={{ height: 48 }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function SignalConvergenceChart({
  signals,
  convergenceCount,
  historicalContext,
  market,
  defaultExpanded = false,
}: SignalConvergenceChartProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animated, setAnimated] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, signal: null });
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger bar grow animation once on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Re-animate when signals change
  useEffect(() => {
    setAnimated(false);
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [signals]);

  function handleHover(e: React.MouseEvent, signal: SignalDatum | null) {
    if (!signal) {
      setTooltip((t) => ({ ...t, visible: false, signal: null }));
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 8,
      signal,
    });
  }

  // Guard states
  if (!signals || signals.length === 0) {
    return (
      <div className="card">
        <div className="flex items-start gap-2 mb-4">
          <h3 className="text-[13px] font-semibold text-content-primary flex-1">
            Market Signals — <span className="text-gold-light">{market || "—"}</span>
          </h3>
        </div>
        <SignalSkeleton />
      </div>
    );
  }

  const bullishCount = signals.filter((s) => s.direction === "bullish").length;
  const headerBullish =
    bullishCount === signals.length
      ? "ALL BULLISH"
      : `${bullishCount}/${signals.length} BULLISH`;

  const headerColor =
    bullishCount >= signals.length - 1
      ? CHART_COLORS.emerald
      : bullishCount >= Math.ceil(signals.length / 2)
      ? CHART_COLORS.amber
      : CHART_COLORS.rose;

  return (
    <div ref={containerRef} className="card relative space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="section-label">Market Signals</span>
          {market && (
            <>
              <span className="text-content-disabled text-[11px]">—</span>
              <span className="text-[11px] font-medium text-gold-light truncate">{market}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] font-semibold font-mono tracking-wider"
            style={{ color: headerColor }}
          >
            {headerBullish}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] text-content-disabled hover:text-content-secondary transition-colors px-2 py-0.5 rounded border border-surface-border hover:border-white/10"
            aria-expanded={expanded}
            aria-controls="signal-annotations"
          >
            {expanded ? "Hide detail" : "Show detail"}
          </button>
        </div>
      </div>

      {/* Axis legend */}
      <div className="flex items-center justify-center gap-1 text-[10px]" style={{ color: CHART_COLORS.text }}>
        <span>◀ BEARISH</span>
        <div className="flex-1 border-t border-dashed" style={{ borderColor: "#1F1F1F" }} aria-hidden="true" />
        <span>CENTER</span>
        <div className="flex-1 border-t border-dashed" style={{ borderColor: "#1F1F1F" }} aria-hidden="true" />
        <span>BULLISH ▶</span>
      </div>

      {/* Signal rows */}
      <div
        id="signal-annotations"
        className="space-y-1"
        role="list"
        aria-label={`Market signals for ${market}`}
      >
        {signals.map((signal, i) => (
          <SignalRow
            key={signal.name}
            signal={signal}
            index={i}
            expanded={expanded}
            animated={animated}
            onHover={handleHover}
          />
        ))}
      </div>

      {/* Missing signals notice */}
      {signals.length < 5 && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: CHART_COLORS.amber }}>
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{5 - signals.length} signal{5 - signals.length !== 1 ? "s" : ""} still loading</span>
        </div>
      )}

      {/* Convergence footer */}
      <div
        className="pt-3 border-t space-y-2"
        style={{ borderColor: "#1F1F1F" }}
      >
        <ConvergenceDots count={convergenceCount} total={signals.length} />
        {historicalContext && (
          <p
            className="text-[11px] italic leading-snug"
            style={{ color: CHART_COLORS.textSecondary }}
          >
            {historicalContext}
          </p>
        )}
      </div>

      {/* Floating tooltip */}
      {tooltip.visible && tooltip.signal && (
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
            {tooltip.signal.name}
          </p>
          <p style={{ fontSize: 11, color: SIGNAL_COLOR[tooltip.signal.direction], fontFamily: "JetBrains Mono, monospace", fontWeight: 600, marginBottom: 4 }}>
            {tooltip.signal.label} · {tooltip.signal.direction.toUpperCase()}
          </p>
          <p style={{ fontSize: 11, color: CHART_COLORS.textSecondary, lineHeight: 1.5 }}>
            {tooltip.signal.plainEnglish}
          </p>
          <p style={{ fontSize: 9, color: CHART_COLORS.text, marginTop: 6 }}>
            z-score: {tooltip.signal.value.toFixed(2)} (±{MAX_Z.toFixed(1)} max)
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA — dev/storybook use only
───────────────────────────────────────────────────────────── */

export const SAMPLE_SIGNALS: SignalDatum[] = [
  {
    name: "Supply",
    plainEnglish: "Only 2.1 months of homes for sale — a seller's market where prices typically rise.",
    value: -2.4,          // negative z = tight supply = bullish (inverted axis)
    label: "2.1 mo",
    direction: "bullish",
  },
  {
    name: "Permits",
    plainEnglish: "Builders are filing 34% more permits than last year — they're betting on this market.",
    value: 2.1,
    label: "+34% YoY",
    direction: "bullish",
  },
  {
    name: "Employment",
    plainEnglish: "12,000 new jobs in the past 12 months — steady demand pressure on housing.",
    value: 1.6,
    label: "+2.8% YoY",
    direction: "bullish",
  },
  {
    name: "Rates",
    plainEnglish: "Mortgage rates at 6.85% remain above the 5-year average — a headwind for buyers.",
    value: -1.1,
    label: "6.85%",
    direction: "bearish",
  },
  {
    name: "Momentum",
    plainEnglish: "Price growth is slowing from 8% to 3.2% — the rally is maturing.",
    value: 0.4,
    label: "+3.2% YoY",
    direction: "neutral",
  },
];

export const SAMPLE_CONVERGENCE_CONTEXT =
  "When 4+ signals aligned in the 20-year backtest, markets appreciated 8–13% on average over 18 months.";
