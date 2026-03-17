"use client";

/**
 * DimensionControls
 *
 * A compact horizontal control strip for the Markets page.
 * Two interactive groups:
 *
 *   Metric pills   — what dimension is rendered across all charts
 *   Time range     — trailing window for all time-series charts
 *
 * Both groups broadcast their selection up to the parent via callbacks.
 * The active state is controlled (props-driven) so the parent owns truth.
 *
 * Design: single row, dense, dark theme. Active pill: gold tint + border.
 * Fits inside a card header without overflowing on 375px+ viewports
 * (stacks to two rows on very narrow screens via flex-wrap).
 */

import { useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  BarChart2,
  Layers,
  Briefcase,
  Building2,
} from "lucide-react";

// ─── Metric definitions ───────────────────────────────────────────────────────

export type MetricId =
  | "market-score"
  | "capital-volume"
  | "hpi-momentum"
  | "supply-months"
  | "employment-growth"
  | "permit-activity";

export type TimeRangeId = "1Y" | "3Y" | "5Y" | "10Y" | "Max";

interface MetricOption {
  id: MetricId;
  label: string;
  shortLabel: string; // for narrow screens
  Icon: React.ElementType;
  plainEnglish: string; // tooltip / screen reader description
}

const METRICS: MetricOption[] = [
  {
    id: "market-score",
    label: "Market Score",
    shortLabel: "Score",
    Icon: BarChart2,
    plainEnglish: "Composite 0-100 score from 5 signals: supply, permits, employment, rates, HPI momentum",
  },
  {
    id: "capital-volume",
    label: "Capital Volume",
    shortLabel: "Capital",
    Icon: DollarSign,
    plainEnglish: "Estimated annual institutional and high-net-worth capital flowing into each market",
  },
  {
    id: "hpi-momentum",
    label: "Price Momentum",
    shortLabel: "HPI",
    Icon: TrendingUp,
    plainEnglish: "Home Price Index year-over-year appreciation rate — how fast prices are moving",
  },
  {
    id: "supply-months",
    label: "Supply (Months)",
    shortLabel: "Supply",
    Icon: Layers,
    plainEnglish: "Months of housing supply on the market — lower is tighter, which typically favors sellers",
  },
  {
    id: "employment-growth",
    label: "Employment Growth",
    shortLabel: "Jobs",
    Icon: Briefcase,
    plainEnglish: "Year-over-year job growth rate — strong jobs attract renters and buyers",
  },
  {
    id: "permit-activity",
    label: "Permit Activity",
    shortLabel: "Permits",
    Icon: Building2,
    plainEnglish: "New residential building permits z-score — builders betting their money on growth",
  },
];

const TIME_RANGES: TimeRangeId[] = ["1Y", "3Y", "5Y", "10Y", "Max"];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DimensionControlsProps {
  activeMetric: MetricId;
  onMetricChange: (metric: MetricId) => void;
  activeTimeRange: TimeRangeId;
  onTimeRangeChange: (range: TimeRangeId) => void;
  className?: string;
}

// ─── Sub-component: Metric pill ───────────────────────────────────────────────

function MetricPill({
  option,
  isActive,
  onClick,
}: {
  option: MetricOption;
  isActive: boolean;
  onClick: () => void;
}) {
  const { Icon, label, shortLabel, plainEnglish } = option;

  return (
    <button
      onClick={onClick}
      title={plainEnglish}
      aria-pressed={isActive}
      aria-label={`${label}: ${plainEnglish}`}
      className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
      style={{
        background: isActive ? "rgba(201,162,39,0.08)" : "transparent",
        border: `1px solid ${isActive ? "rgba(201,162,39,0.28)" : "rgba(255,255,255,0.07)"}`,
        color: isActive ? "#C9A227" : "#666666",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
          (e.currentTarget as HTMLButtonElement).style.color = "#999999";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLButtonElement).style.color = "#666666";
        }
      }}
    >
      <Icon
        className="w-3 h-3 shrink-0"
        aria-hidden="true"
        style={{ color: isActive ? "#C9A227" : "#555555" }}
      />
      {/* Show full label on sm+, short label on mobile */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>

      {/* Active underline accent */}
      {isActive && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px rounded-full"
          style={{ background: "rgba(201,162,39,0.5)" }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── Sub-component: Time range button ────────────────────────────────────────

function TimeRangeButton({
  range,
  isActive,
  onClick,
}: {
  range: TimeRangeId;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`Time range: ${range === "Max" ? "Maximum available history" : `Trailing ${range}`}`}
      className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
      style={{
        background: isActive ? "rgba(201,162,39,0.10)" : "transparent",
        color: isActive ? "#C9A227" : "#555555",
        border: `1px solid ${isActive ? "rgba(201,162,39,0.25)" : "transparent"}`,
        minWidth: 32,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.color = "#888888";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.color = "#555555";
        }
      }}
    >
      {range}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DimensionControls({
  activeMetric,
  onMetricChange,
  activeTimeRange,
  onTimeRangeChange,
  className,
}: DimensionControlsProps) {
  // Active metric description — shown as a subtle subtitle
  const activeMetricInfo = useMemo(
    () => METRICS.find((m) => m.id === activeMetric),
    [activeMetric],
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}
      role="toolbar"
      aria-label="Chart dimension and time range controls"
    >
      {/* ── Metric pills group ── */}
      <div
        className="flex items-center gap-1 flex-wrap"
        role="group"
        aria-label="Select metric dimension"
      >
        {/* Section label — only visible on sm+ to avoid crowding */}
        <span
          className="hidden sm:block text-[9px] font-semibold uppercase tracking-widest mr-1 shrink-0"
          style={{ color: "#3A3A3A" }}
          aria-hidden="true"
        >
          View
        </span>

        {METRICS.map((option) => (
          <MetricPill
            key={option.id}
            option={option}
            isActive={activeMetric === option.id}
            onClick={() => onMetricChange(option.id)}
          />
        ))}
      </div>

      {/* ── Divider ── */}
      <div
        className="hidden sm:block w-px h-5 shrink-0 mx-1"
        style={{ background: "rgba(255,255,255,0.06)" }}
        aria-hidden="true"
      />

      {/* ── Time range toggle group ── */}
      <div
        className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        role="group"
        aria-label="Select time range"
      >
        {TIME_RANGES.map((range) => (
          <TimeRangeButton
            key={range}
            range={range}
            isActive={activeTimeRange === range}
            onClick={() => onTimeRangeChange(range)}
          />
        ))}
      </div>

      {/* ── Active metric plain-English hint — hidden on very small screens ── */}
      {activeMetricInfo && (
        <p
          className="hidden lg:block text-[10px] italic ml-1"
          style={{ color: "#3D3D3D" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {activeMetricInfo.plainEnglish}
        </p>
      )}
    </div>
  );
}
