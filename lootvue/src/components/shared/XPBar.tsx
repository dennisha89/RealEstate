"use client";

import { Flame } from "lucide-react";
import {
  useGamificationStore,
  getLevel,
  getNextLevel,
  getLevelProgress,
} from "@/lib/stores/gamification-store";

interface XPBarProps {
  /** compact = sidebar-width pill; expanded = full-width bar with more detail */
  variant?: "compact" | "expanded";
  className?: string;
}

/**
 * XPBar — displays the user's current level, XP progress, and active streak.
 * Designed to fit in the dashboard sidebar (32px tall in compact mode).
 */
export function XPBar({ variant = "compact", className = "" }: XPBarProps) {
  const totalXP = useGamificationStore((s) => s.totalXP);
  const currentStreak = useGamificationStore((s) => s.currentStreak);

  const current = getLevel(totalXP);
  const next = getNextLevel(totalXP);
  const progress = getLevelProgress(totalXP);

  const xpToNext = next ? next.minXP - totalXP : 0;
  const isMaxLevel = next === null;

  // Percentage string for the aria-valuenow
  const progressPct = Math.round(progress * 100);

  if (variant === "expanded") {
    return (
      <div className={`w-full space-y-2 ${className}`}>
        {/* Level header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-base leading-none"
              role="img"
              aria-label={current.name}
            >
              {current.icon}
            </span>
            <div>
              <p className="text-[11px] font-semibold text-content-primary">
                {current.name}
              </p>
              <p className="text-[10px] text-content-tertiary font-mono tabular-nums">
                {totalXP.toLocaleString()} XP total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentStreak > 0 && (
              <span
                className="flex items-center gap-1 text-[11px] font-semibold"
                aria-label={`${currentStreak}-day streak`}
                title={`${currentStreak}-day streak`}
              >
                <Flame
                  className="w-3.5 h-3.5 text-amber"
                  aria-hidden="true"
                />
                <span className="font-mono tabular-nums text-amber">
                  {currentStreak}d
                </span>
              </span>
            )}

            {next && (
              <p className="text-[10px] text-content-tertiary font-mono tabular-nums">
                {xpToNext.toLocaleString()} to{" "}
                <span className="text-content-secondary">{next.name}</span>
              </p>
            )}
            {isMaxLevel && (
              <p className="text-[10px] text-gold font-semibold">Max Level</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level progress: ${progressPct}%`}
          className="relative h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: "rgba(201,162,39,0.1)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background:
                "linear-gradient(90deg, #9A7B1A 0%, #C9A227 60%, #E8C547 100%)",
              boxShadow:
                progressPct > 5
                  ? "0 0 8px rgba(201,162,39,0.4)"
                  : "none",
            }}
          />
        </div>
      </div>
    );
  }

  // ── Compact variant ────────────────────────────────────────────────────────
  return (
    <div
      className={`flex items-center gap-2 h-8 px-2 rounded-lg ${className}`}
      style={{ background: "rgba(201,162,39,0.05)" }}
    >
      {/* Level icon */}
      <span
        className="text-sm leading-none flex-shrink-0"
        role="img"
        aria-label={`Level ${current.level}: ${current.name}`}
      >
        {current.icon}
      </span>

      {/* Bar + label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-semibold text-content-secondary truncate">
            {current.name}
          </span>
          {!isMaxLevel && (
            <span className="text-[9px] font-mono tabular-nums text-content-disabled ml-1 flex-shrink-0">
              {xpToNext}xp
            </span>
          )}
          {isMaxLevel && (
            <span className="text-[9px] font-semibold text-gold flex-shrink-0">
              MAX
            </span>
          )}
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`XP progress: ${progressPct}% to ${next?.name ?? "max level"}`}
          className="relative h-1 w-full rounded-full overflow-hidden"
          style={{ background: "rgba(201,162,39,0.1)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background:
                "linear-gradient(90deg, #9A7B1A 0%, #C9A227 60%, #E8C547 100%)",
            }}
          />
        </div>
      </div>

      {/* Streak badge */}
      {currentStreak > 0 && (
        <span
          className="flex items-center gap-0.5 flex-shrink-0"
          aria-label={`Active streak: ${currentStreak} days`}
          title={`${currentStreak}-day streak`}
        >
          <Flame
            className="w-3 h-3 text-amber"
            aria-hidden="true"
          />
          <span className="text-[10px] font-bold font-mono tabular-nums text-amber">
            {currentStreak}
          </span>
        </span>
      )}
    </div>
  );
}
