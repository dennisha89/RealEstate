"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Lock, CheckCircle, Zap, Flame } from "lucide-react";
import {
  useGamificationStore,
  ACHIEVEMENTS,
  getLevel,
  getNextLevel,
  getLevelProgress,
  type AchievementCategory,
} from "@/lib/stores/gamification-store";

// ─── Category tab config ──────────────────────────────────────────────────────

type TabValue = "all" | AchievementCategory;

interface Tab {
  value: TabValue;
  label: string;
}

const TABS: Tab[] = [
  { value: "all",      label: "All"      },
  { value: "analyze",  label: "Analyze"  },
  { value: "market",   label: "Market"   },
  { value: "pipeline", label: "Pipeline" },
  { value: "simulate", label: "Simulate" },
  { value: "explore",  label: "Explore"  },
  { value: "streak",   label: "Streaks"  },
];

// ─── Achievement card ─────────────────────────────────────────────────────────

interface AchievementCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  category: AchievementCategory;
  unlocked: boolean;
  unlockedAt?: string;
}

function AchievementCard({
  name,
  description,
  icon,
  xp,
  unlocked,
  unlockedAt,
}: AchievementCardProps) {
  const formattedDate = unlockedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(unlockedAt))
    : null;

  return (
    <div
      className="relative flex flex-col gap-2 rounded-xl p-3.5 transition-all duration-200"
      style={
        unlocked
          ? {
              background: "rgba(17,17,17,0.8)",
              border: "1px solid rgba(201,162,39,0.25)",
              boxShadow: "0 0 20px -6px rgba(201,162,39,0.15)",
            }
          : {
              background: "rgba(10,10,10,0.5)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }
      }
      aria-label={`${name}: ${description}. ${xp} XP. ${unlocked ? `Unlocked ${formattedDate ?? ""}` : "Locked"}`}
    >
      {/* Icon + lock overlay */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{
            background: unlocked
              ? "rgba(201,162,39,0.12)"
              : "rgba(255,255,255,0.04)",
            filter: unlocked ? "none" : "grayscale(1) opacity(0.4)",
          }}
          aria-hidden="true"
        >
          <span role="img" aria-hidden="true">
            {icon}
          </span>
        </div>

        {/* Unlocked badge */}
        {unlocked && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "#10B981" }}
            aria-hidden="true"
          >
            <CheckCircle className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Locked icon */}
        {!unlocked && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
            aria-hidden="true"
          >
            <Lock className="w-2.5 h-2.5 text-content-disabled" />
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="space-y-0.5 flex-1">
        <p
          className="text-[12px] font-semibold leading-tight"
          style={{ color: unlocked ? "#FAFAFA" : "#666666" }}
        >
          {name}
        </p>
        <p
          className="text-[10px] leading-snug"
          style={{ color: unlocked ? "#999999" : "#444444" }}
        >
          {description}
        </p>
      </div>

      {/* Footer: XP + date */}
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-0.5 text-[10px] font-bold font-mono tabular-nums"
          style={{ color: unlocked ? "#C9A227" : "#444444" }}
          aria-label={`${xp} XP`}
        >
          <Zap className="w-2.5 h-2.5" aria-hidden="true" />
          {xp} XP
        </span>

        {unlocked && formattedDate && (
          <span className="text-[9px] text-content-disabled">
            {formattedDate}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Panel component ──────────────────────────────────────────────────────────

interface AchievementPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * AchievementPanel — full achievement browser modal.
 * Trigger it from anywhere with `open={true}`.
 */
export function AchievementPanel({ open, onClose }: AchievementPanelProps) {
  const totalXP = useGamificationStore((s) => s.totalXP);
  const unlockedAchievements = useGamificationStore(
    (s) => s.unlockedAchievements
  );
  const achievementUnlockDates = useGamificationStore(
    (s) => s.achievementUnlockDates
  );
  const currentStreak = useGamificationStore((s) => s.currentStreak);

  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const current = getLevel(totalXP);
  const next = getNextLevel(totalXP);
  const progress = getLevelProgress(totalXP);
  const progressPct = Math.round(progress * 100);
  const isMaxLevel = next === null;

  // Keyboard escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const unlockedSet = new Set(unlockedAchievements);
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;

  const filteredAchievements =
    activeTab === "all"
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter((a) => a.category === activeTab);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9990]"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Achievements"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-[9991] flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: "rgba(11,11,11,0.98)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(201,162,39,0.2)",
                boxShadow:
                  "0 0 60px -10px rgba(201,162,39,0.15), 0 24px 80px rgba(0,0,0,0.8)",
                pointerEvents: "auto",
              }}
            >
              {/* Top shimmer line */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(201,162,39,0.5) 50%, transparent 100%)",
                }}
                aria-hidden="true"
              />

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-surface-border">
                <div className="flex items-start justify-between gap-4 mb-4">
                  {/* Title + progress count */}
                  <div>
                    <h2 className="font-display text-[18px] font-bold text-content-primary tracking-tight">
                      Achievements
                    </h2>
                    <p className="text-[12px] text-content-tertiary mt-0.5">
                      <span className="font-semibold text-gold font-mono tabular-nums">
                        {unlockedCount}
                      </span>
                      <span className="text-content-disabled">
                        /{totalCount}
                      </span>{" "}
                      unlocked
                    </p>
                  </div>

                  {/* Level block */}
                  <div className="flex items-center gap-3">
                    {currentStreak > 0 && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                        style={{ background: "rgba(245,158,11,0.1)" }}
                        title={`${currentStreak}-day active streak`}
                      >
                        <Flame
                          className="w-3.5 h-3.5 text-amber"
                          aria-hidden="true"
                        />
                        <span className="text-[12px] font-bold font-mono tabular-nums text-amber">
                          {currentStreak}d
                        </span>
                      </div>
                    )}

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span
                          className="text-base leading-none"
                          role="img"
                          aria-label={current.name}
                        >
                          {current.icon}
                        </span>
                        <span className="text-[13px] font-semibold text-content-primary">
                          {current.name}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono tabular-nums text-content-tertiary mt-0.5">
                        {totalXP.toLocaleString()} XP total
                      </p>
                    </div>
                  </div>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    aria-label="Close achievements panel"
                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-content-disabled hover:text-content-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* XP progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-content-disabled">
                      Lv {current.level}
                    </span>
                    {!isMaxLevel && next && (
                      <span className="text-content-disabled font-mono tabular-nums">
                        {(next.minXP - totalXP).toLocaleString()} XP to{" "}
                        {next.name}
                      </span>
                    )}
                    {isMaxLevel && (
                      <span className="text-gold text-[10px] font-semibold">
                        Max Level Reached
                      </span>
                    )}
                    {!isMaxLevel && next && (
                      <span className="text-content-disabled">
                        Lv {next.level}
                      </span>
                    )}
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Level progress ${progressPct}%`}
                    className="relative h-2 w-full rounded-full overflow-hidden"
                    style={{ background: "rgba(201,162,39,0.1)" }}
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, #9A7B1A 0%, #C9A227 60%, #E8C547 100%)",
                        boxShadow:
                          progressPct > 5
                            ? "0 0 10px rgba(201,162,39,0.4)"
                            : "none",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Category tabs ────────────────────────────────────────── */}
              <div
                className="flex-shrink-0 flex items-center gap-1 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-surface-border"
                role="tablist"
                aria-label="Achievement categories"
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  const tabAchievements =
                    tab.value === "all"
                      ? ACHIEVEMENTS
                      : ACHIEVEMENTS.filter((a) => a.category === tab.value);
                  const tabUnlocked = tabAchievements.filter((a) =>
                    unlockedSet.has(a.id)
                  ).length;

                  return (
                    <button
                      key={tab.value}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`tab-panel-${tab.value}`}
                      onClick={() => setActiveTab(tab.value)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
                      style={
                        isActive
                          ? {
                              background: "rgba(201,162,39,0.12)",
                              color: "#C9A227",
                              border: "1px solid rgba(201,162,39,0.25)",
                            }
                          : {
                              background: "rgba(255,255,255,0.03)",
                              color: "#666666",
                              border: "1px solid transparent",
                            }
                      }
                    >
                      {tab.label}
                      <span
                        className="font-mono tabular-nums text-[9px]"
                        style={{ color: isActive ? "#C9A227" : "#444444" }}
                      >
                        {tabUnlocked}/{tabAchievements.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Achievement grid ─────────────────────────────────────── */}
              <div
                id={`tab-panel-${activeTab}`}
                role="tabpanel"
                aria-label={`${activeTab} achievements`}
                className="flex-1 overflow-y-auto p-5 scrollbar-hide"
              >
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {filteredAchievements.map((achievement) => {
                    const isUnlocked = unlockedSet.has(achievement.id);
                    return (
                      <AchievementCard
                        key={achievement.id}
                        id={achievement.id}
                        name={achievement.name}
                        description={achievement.description}
                        icon={achievement.icon}
                        xp={achievement.xp}
                        category={achievement.category}
                        unlocked={isUnlocked}
                        unlockedAt={achievementUnlockDates[achievement.id]}
                      />
                    );
                  })}
                </motion.div>

                {filteredAchievements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-3xl mb-3" aria-hidden="true">
                      🔒
                    </span>
                    <p className="text-[13px] text-content-tertiary">
                      No achievements in this category yet.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer ──────────────────────────────────────────────── */}
              <div
                className="flex-shrink-0 px-5 py-3 border-t border-surface-border flex items-center justify-between"
                style={{ background: "rgba(0,0,0,0.4)" }}
              >
                <p className="text-[10px] text-content-disabled">
                  Earn XP by analyzing deals, exploring markets, and building
                  your pipeline.
                </p>
                <div className="flex items-center gap-1 text-[11px] font-bold font-mono tabular-nums text-gold">
                  <Zap className="w-3 h-3" aria-hidden="true" />
                  {totalXP.toLocaleString()} XP
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
