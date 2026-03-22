"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { useStoryFlow } from "./StoryFlow";

interface StoryChapterProps {
  /** Numeric position (0-based) — used for the connector animation only. */
  index: number;
  /**
   * String step id matching the corresponding StoryStep.id in StoryFlow.
   * Defaults to String(index) when omitted.
   */
  id?: string;
  aiIntro?: string;
  children: ReactNode;
  advanced?: ReactNode;
  advancedLabel?: string;
  showConnector?: boolean;
  className?: string;
}

export function StoryChapter({
  index,
  id,
  aiIntro,
  children,
  advanced,
  advancedLabel = "Advanced analysis",
  showConnector = true,
  className = "",
}: StoryChapterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerChapter, activeStepId } = useStoryFlow();
  const [expanded, setExpanded] = useState(false);
  const chapterId = id ?? String(index);
  const isActive = activeStepId === chapterId;

  useEffect(() => {
    registerChapter(chapterId, ref.current);
    return () => registerChapter(chapterId, null);
  }, [chapterId, registerChapter]);

  return (
    <div
      ref={ref}
      data-story-chapter-id={chapterId}
      data-story-index={index}
      className={`relative ${className}`}
    >
      {/* Chapter body — fades in on scroll */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* AI intro line */}
        {aiIntro && (
          <div className="flex items-start gap-2 mb-4">
            <span
              className="mt-[3px] w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: CHART_COLORS.gold }}
              aria-hidden="true"
            />
            <p className="text-[13px] italic text-content-secondary leading-relaxed">
              {aiIntro}
            </p>
          </div>
        )}

        {/* Main content */}
        {children}

        {/* Progressive disclosure expander */}
        {advanced && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? `Hide ${advancedLabel}` : `Show ${advancedLabel}`}
              className="inline-flex items-center gap-1.5 text-[12px] text-content-tertiary hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded"
            >
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                style={{ display: "flex" }}
              >
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              </motion.span>
              {expanded ? `Hide ${advancedLabel}` : `Show ${advancedLabel} \u25b8`}
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="advanced"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="pt-4">{advanced}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Flow connector */}
      {showConnector && (
        <div
          className="flex flex-col items-center mt-6 mb-2 mx-auto w-fit"
          aria-hidden="true"
        >
          <div
            className="w-px h-8 transition-colors duration-300"
            style={{
              backgroundColor: isActive
                ? CHART_COLORS.gold
                : CHART_COLORS.border,
            }}
          />
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className="transition-colors duration-300"
          >
            <path
              d="M0 0L5 6L10 0"
              fill={isActive ? CHART_COLORS.gold : CHART_COLORS.border}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
