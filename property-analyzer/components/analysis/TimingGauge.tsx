"use client";

import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import type { TimingResult } from "@/lib/engines/timing-engine";

interface TimingGaugeProps {
  result: TimingResult;
  compact?: boolean;
}

const SIGNAL_CONFIG: Record<
  TimingResult["signal"],
  { label: string; color: string; textClass: string; bgClass: string; borderClass: string; position: number }
> = {
  WAIT:           { label: "WAIT",           color: "#F87171", textClass: "text-red-400",    bgClass: "bg-red-900/20",    borderClass: "border-red-800/30",    position: 0.1 },
  NEUTRAL:        { label: "NEUTRAL",        color: "#FBBF24", textClass: "text-gold-400",   bgClass: "bg-gold-900/20",   borderClass: "border-gold-800/30",   position: 0.35 },
  FAVORABLE:      { label: "FAVORABLE",      color: "#34D399", textClass: "text-money-400",  bgClass: "bg-money-900/20",  borderClass: "border-money-800/30",  position: 0.6 },
  BUY_NOW:        { label: "BUY NOW",        color: "#10B981", textClass: "text-money-400",  bgClass: "bg-money-900/30",  borderClass: "border-money-800/40",  position: 0.85 },
  MARKET_PEAKING: { label: "PEAKING",        color: "#FB923C", textClass: "text-orange-400", bgClass: "bg-orange-900/20", borderClass: "border-orange-800/30", position: 0.9 },
};

const RATE_ICON_CLASS: Record<string, string> = {
  favorable: "text-money-400",
  neutral:   "text-gray-500",
  headwind:  "text-red-400",
};

const TrajectoryIcon = ({ direction }: { direction: TimingResult["trajectoryDirection"] }) => {
  if (direction === "improving")    return <TrendingUp className="h-3.5 w-3.5 text-money-400" />;
  if (direction === "deteriorating") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-gray-500" />;
};

/**
 * Semicircular SVG gauge showing entry timing signal.
 * Left = WAIT (red) -> Center = NEUTRAL (gold) -> Right = BUY_NOW (green)
 * Needle points to current position based on signal.
 */
export default function TimingGauge({ result, compact = false }: TimingGaugeProps) {
  const config = SIGNAL_CONFIG[result.signal];
  const needleAngle = -90 + config.position * 180; // -90 (left) to +90 (right)

  const WIDTH = 200;
  const HEIGHT = 115;
  const CX = WIDTH / 2;
  const CY = 100;
  const RADIUS = 80;
  const STROKE = 10;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG Gauge */}
      <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="overflow-visible">
          {/* Background arc segments: red -> gold -> green */}
          <path
            d={describeArc(CX, CY, RADIUS, -180, -120)}
            fill="none" stroke="#F87171" strokeWidth={STROKE} strokeLinecap="round" opacity={0.25}
          />
          <path
            d={describeArc(CX, CY, RADIUS, -120, -60)}
            fill="none" stroke="#FBBF24" strokeWidth={STROKE} opacity={0.25}
          />
          <path
            d={describeArc(CX, CY, RADIUS, -60, 0)}
            fill="none" stroke="#34D399" strokeWidth={STROKE} strokeLinecap="round" opacity={0.25}
          />

          {/* Active arc fill up to needle position */}
          <path
            d={describeArc(CX, CY, RADIUS, -180, -180 + config.position * 180)}
            fill="none" stroke={config.color} strokeWidth={STROKE} strokeLinecap="round"
            opacity={0.7}
            className="transition-all duration-700"
          />

          {/* Needle */}
          <g transform={`rotate(${needleAngle}, ${CX}, ${CY})`} className="transition-all duration-700">
            <line x1={CX} y1={CY} x2={CX} y2={CY - RADIUS + STROKE + 4} stroke={config.color} strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={4} fill={config.color} />
          </g>

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={2} fill="#2A2F45" />

          {/* Labels at edges */}
          <text x={CX - RADIUS - 4} y={CY + 14} textAnchor="middle" fill="#6B7094" fontSize="9" fontFamily="Inter, sans-serif">
            WAIT
          </text>
          <text x={CX + RADIUS + 4} y={CY + 14} textAnchor="middle" fill="#6B7094" fontSize="9" fontFamily="Inter, sans-serif">
            BUY
          </text>
        </svg>
      </div>

      {/* Signal label + confidence */}
      <div className="text-center -mt-1">
        <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-lg border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
          {config.label}
        </span>
        <p className="text-xs text-gray-500 mt-1.5">
          <span className="font-mono font-medium text-gray-300">{result.confidence}%</span> confidence
          {result.optimalWindowMonths > 0 && (
            <span className="ml-2 inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> wait ~{result.optimalWindowMonths}mo
            </span>
          )}
        </p>
      </div>

      {/* Trajectory + Rate impact row */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1 text-gray-500">
          <TrajectoryIcon direction={result.trajectoryDirection} />
          <span className="capitalize">{result.trajectoryDirection}</span>
        </span>
        <span className="text-gray-700">|</span>
        <span className={`flex items-center gap-1 ${RATE_ICON_CLASS[result.rateImpact.direction]}`}>
          Rates: {result.rateImpact.direction}
          <span className="text-gray-600 ml-0.5">({result.rateImpact.lagMonths}mo lag)</span>
        </span>
      </div>

      {/* Seasonal adjustment badge */}
      {result.seasonalAdjustment !== 0 && (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          result.seasonalAdjustment > 0
            ? "bg-money-900/20 text-money-400 border border-money-800/20"
            : "bg-red-900/20 text-red-400 border border-red-800/20"
        }`}>
          Seasonal: {result.seasonalAdjustment > 0 ? "+" : ""}{result.seasonalAdjustment} pts
        </span>
      )}

      {/* Reasoning bullets (hidden in compact mode) */}
      {!compact && result.reasoning.length > 0 && (
        <div className="w-full mt-1 p-3 bg-surface-elevated/50 rounded-lg border border-surface-border/50 space-y-1.5">
          {result.reasoning.map((r, i) => (
            <p key={i} className="text-[11px] text-gray-400 leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-gray-600">
              {r}
            </p>
          ))}
        </div>
      )}

      {/* Rate impact detail (hidden in compact mode) */}
      {!compact && (
        <div className="w-full p-3 rounded-lg border border-surface-border/50 bg-surface-card">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Rate Lag Impact</p>
          <p className="text-xs text-gray-400 leading-relaxed">{result.rateImpact.explanation}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SVG Arc Helper
// ============================================================

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
