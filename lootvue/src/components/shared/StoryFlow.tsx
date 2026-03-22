"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import { Check, ArrowDown } from "lucide-react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";

// ─── Public types ────────────────────────────────────────────────────────────

export interface StoryStep {
  id: string;
  label: string;
}

interface StoryFlowContextValue {
  activeStepId: string | null;
  /** Chapter panels call this on mount to register their scroll target. */
  registerChapter: (id: string, el: HTMLElement | null) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const StoryFlowContext = createContext<StoryFlowContextValue>({
  activeStepId: null,
  registerChapter: () => undefined,
});

export function useStoryFlow(): StoryFlowContextValue {
  return useContext(StoryFlowContext);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface StoryFlowProps {
  steps: StoryStep[];
  narratorLine?: string;
  children: React.ReactNode;
}

/**
 * StoryFlow — page-level wrapper that turns a dashboard into a narrative.
 *
 * Place <StoryChapter id="verdict"> … </StoryChapter> children inside.
 * The sticky bar auto-highlights the chapter filling most of the viewport.
 */
export function StoryFlow({ steps, narratorLine, children }: StoryFlowProps) {
  const [activeStepId, setActiveStepId] = useState<string | null>(
    steps[0]?.id ?? null,
  );
  const chapterRefs = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const registerChapter = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) {
        chapterRefs.current.set(id, el);
        observerRef.current?.observe(el);
      } else {
        const existing = chapterRefs.current.get(id);
        if (existing) observerRef.current?.unobserve(existing);
        chapterRefs.current.delete(id);
      }
    },
    [],
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pick the entry most visible in the trigger zone (highest ratio)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const first = visible[0];
        if (!first) return;
        const target = first.target as HTMLElement;
        const id = target.dataset.storyChapterId;
        if (id) setActiveStepId(id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    // Observe any already-registered chapters
    chapterRefs.current.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  function skipToAction() {
    const lastStep = steps[steps.length - 1];
    const el = lastStep ? chapterRefs.current.get(lastStep.id) : undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeIndex = steps.findIndex((s) => s.id === activeStepId);

  return (
    <StoryFlowContext.Provider value={{ activeStepId, registerChapter }}>
      {/* ── Sticky narrative bar ── */}
      <div
        className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-surface-border"
        role="navigation"
        aria-label="Story progress"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
          {/* Step indicator */}
          <ol className="flex items-center gap-0 flex-1 min-w-0">
            {steps.map((step, i) => {
              const completed = i < activeIndex;
              const active = i === activeIndex;
              return (
                <li key={step.id} className="flex items-center">
                  {/* Circle */}
                  <div className="flex flex-col items-center">
                    <motion.span
                      animate={active ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={[
                        "flex items-center justify-center w-6 h-6 rounded-full border text-[10px] font-bold shrink-0 transition-colors duration-300",
                        completed
                          ? "border-emerald bg-emerald/10 text-emerald"
                          : active
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-surface-border bg-surface text-content-disabled",
                      ].join(" ")}
                      aria-current={active ? "step" : undefined}
                      aria-label={`Step ${i + 1}: ${step.label}${completed ? ", completed" : active ? ", current" : ""}`}
                    >
                      {completed ? (
                        <Check
                          className="w-3 h-3"
                          style={{ color: CHART_COLORS.emerald }}
                          aria-hidden="true"
                        />
                      ) : (
                        <span aria-hidden="true">{i + 1}</span>
                      )}
                    </motion.span>

                    {/* Label — hidden on mobile */}
                    <span
                      className={[
                        "hidden sm:block text-[9px] font-medium mt-0.5 whitespace-nowrap transition-colors duration-200",
                        active
                          ? "text-gold"
                          : completed
                            ? "text-emerald/80"
                            : "text-content-disabled",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className={[
                        "w-8 sm:w-12 h-px mx-1 transition-colors duration-300 mb-3 sm:mb-0 self-start mt-3",
                        completed ? "bg-emerald/40" : "bg-surface-border",
                      ].join(" ")}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* Skip to action */}
          <button
            onClick={skipToAction}
            className="btn-ghost shrink-0 text-[11px] flex items-center gap-1 py-1 px-2"
            aria-label="Skip to action section"
          >
            <span className="hidden sm:inline">Skip to action</span>
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Narrator line */}
        {narratorLine && (
          <div className="max-w-7xl mx-auto px-4 pb-2">
            <p className="text-[11px] text-content-tertiary italic leading-snug">
              {narratorLine}
            </p>
          </div>
        )}
      </div>

      {/* Page content */}
      {children}
    </StoryFlowContext.Provider>
  );
}

// ─── StoryChapter ─────────────────────────────────────────────────────────────

interface StoryChapterProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * StoryChapter — wrap each narrative section with this.
 * Registers its DOM node with StoryFlow for scroll tracking.
 */
export function StoryChapter({ id, children, className }: StoryChapterProps) {
  const { registerChapter } = useStoryFlow();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerChapter(id, ref.current);
    return () => registerChapter(id, null);
  }, [id, registerChapter]);

  return (
    <div
      ref={ref}
      data-story-chapter-id={id}
      className={className}
    >
      {children}
    </div>
  );
}
