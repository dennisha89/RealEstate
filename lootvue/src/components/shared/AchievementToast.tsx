"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap } from "lucide-react";
import {
  useGamificationStore,
  type Achievement,
} from "@/lib/stores/gamification-store";

// ─── Single toast card ────────────────────────────────────────────────────────

interface ToastCardProps {
  achievement: Achievement;
  onDismiss: () => void;
}

function ToastCard({ achievement, onDismiss }: ToastCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Achievement unlocked: ${achievement.name}. ${achievement.description}. Plus ${achievement.xp} XP.`}
      initial={{ opacity: 0, x: 64, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 64, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="relative flex items-start gap-3 w-80 rounded-xl overflow-hidden shadow-elevated"
      style={{
        background: "rgba(17, 17, 17, 0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(201, 162, 39, 0.3)",
        borderLeft: "3px solid #C9A227",
        boxShadow:
          "0 0 40px -8px rgba(201,162,39,0.25), 0 4px 24px rgba(0,0,0,0.6)",
      }}
    >
      {/* Subtle gold shimmer stripe at top */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,162,39,0.5) 50%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg mt-3 ml-3"
        style={{ background: "rgba(201,162,39,0.1)" }}
        aria-hidden="true"
      >
        <span className="text-xl leading-none" role="img" aria-hidden="true">
          {achievement.icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 py-3 pr-8 min-w-0">
        {/* Header label */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold mb-0.5">
          Achievement Unlocked
        </p>

        {/* Name */}
        <p className="text-[13px] font-semibold text-content-primary truncate">
          {achievement.name}
        </p>

        {/* Description */}
        <p className="text-[11px] text-content-tertiary leading-snug mt-0.5 line-clamp-2">
          {achievement.description}
        </p>

        {/* XP pill */}
        <div className="flex items-center gap-1 mt-1.5">
          <Zap
            className="w-3 h-3 text-gold"
            aria-hidden="true"
          />
          <span
            className="text-[11px] font-bold font-mono tabular-nums text-gold"
            aria-label={`Plus ${achievement.xp} XP`}
          >
            +{achievement.xp} XP
          </span>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss achievement notification"
        className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded text-content-disabled hover:text-content-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </button>

      {/* Auto-dismiss progress bar */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-0.5"
        style={{ background: "rgba(201,162,39,0.4)", transformOrigin: "left" }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: "linear" }}
        aria-hidden="true"
      />
    </motion.div>
  );
}

// ─── Container — renders from the gamification store ─────────────────────────

/**
 * AchievementToast — mount once in the root layout.
 * Reads `recentUnlock` from the gamification store and renders a slide-in toast.
 */
export function AchievementToast() {
  const recentUnlock = useGamificationStore((s) => s.recentUnlock);
  const dismissRecentUnlock = useGamificationStore((s) => s.dismissRecentUnlock);

  return (
    // Fixed portal anchored to bottom-right
    <div
      className="fixed bottom-6 right-6 z-[9999] pointer-events-none"
      aria-live="polite"
      aria-label="Achievement notifications"
    >
      <AnimatePresence mode="wait">
        {recentUnlock && (
          <div className="pointer-events-auto" key={recentUnlock.id}>
            <ToastCard
              achievement={recentUnlock}
              onDismiss={dismissRecentUnlock}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
