"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, HelpCircle } from "lucide-react";
import {
  getSpotlightRect,
  computeTooltipPosition,
  arrowStyles,
  type Rect,
  type TooltipPosition,
} from "./guided-tour-geometry";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TourStep {
  /** CSS selector, e.g. '[data-tour="verdict"]' */
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface GuidedTourProps {
  steps: TourStep[];
  /** Unique key used for localStorage persistence */
  tourId: string;
  onComplete?: () => void;
}

// ─── Sub-component: spotlight ring ───────────────────────────────────────────

function TourSpotlight({ rect }: { rect: Rect }) {
  return (
    <motion.div
      aria-hidden="true"
      className="fixed z-[9991] pointer-events-none rounded-xl"
      animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      style={{
        // Single box-shadow creates the dim overlay AND the gold glow simultaneously:
        // Layer 1: 9999px spread at 80% black — covers entire viewport outside this element
        // Layer 2: 2px solid gold border ring
        // Layer 3: diffuse gold ambient glow
        boxShadow:
          "0 0 0 9999px rgba(0,0,0,0.80), 0 0 0 2px #C9A227, 0 0 24px 4px rgba(201,162,39,0.45)",
      }}
    />
  );
}

// ─── Sub-component: tooltip card ─────────────────────────────────────────────

interface TooltipCardProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  spotlight: Rect;
  pos: TooltipPosition;
  gotItRef: React.Ref<HTMLButtonElement>;
  descId: string;
  onAdvance: () => void;
  onSkip: () => void;
}

function TourTooltipCard({
  step, stepIndex, totalSteps, spotlight, pos, gotItRef, descId, onAdvance, onSkip,
}: TooltipCardProps) {
  const isLast = stepIndex === totalSteps - 1;
  const slideDir = pos.arrowSide === "top" ? -8 : 8;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepIndex}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
        aria-describedby={descId}
        aria-live="polite"
        className="fixed z-[9992] w-[300px] pointer-events-auto"
        style={{ top: pos.top, left: pos.left }}
        initial={{ opacity: 0, y: slideDir }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: slideDir }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {/* CSS triangle arrow pointing toward the target element */}
        <div
          aria-hidden="true"
          className="absolute w-0 h-0"
          style={arrowStyles(pos.arrowSide, spotlight, pos)}
        />

        {/* Card */}
        <div
          className="relative rounded-xl border overflow-hidden"
          style={{
            background: "#111111",
            borderColor: "rgba(201,162,39,0.30)",
            boxShadow: "0 0 0 1px rgba(201,162,39,0.08), 0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(201,162,39,0.12)",
          }}
        >
          {/* Gold gradient top accent line */}
          <div
            aria-hidden="true"
            className="h-[2px] w-full"
            style={{ background: "linear-gradient(90deg, transparent, #C9A227 30%, #E8C547 70%, transparent)" }}
          />

          <div className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-content-tertiary font-mono tabular-nums">
                Step {stepIndex + 1} of {totalSteps}
              </span>
              <button
                onClick={onSkip}
                aria-label="Skip tour"
                className="text-[11px] text-content-disabled hover:text-content-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 rounded px-1"
              >
                Skip tour
              </button>
            </div>

            <p className="text-[13px] font-semibold text-content-primary mb-1.5 font-display leading-snug">
              {step.title}
            </p>
            <p id={descId} className="text-[12px] text-content-secondary leading-relaxed mb-4">
              {step.description}
            </p>

            <div className="flex items-center justify-between gap-3">
              {/* Progress pill dots */}
              <div className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span
                    key={i}
                    className="block rounded-full transition-all duration-300"
                    style={{
                      width: i === stepIndex ? 16 : 5,
                      height: 5,
                      background: i === stepIndex ? "#C9A227" : i < stepIndex ? "rgba(201,162,39,0.4)" : "rgba(255,255,255,0.12)",
                    }}
                  />
                ))}
              </div>

              <button
                ref={gotItRef}
                onClick={onAdvance}
                className="btn-primary btn-sm flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
                aria-label={isLast ? "Finish tour" : `Got it, go to step ${stepIndex + 2}`}
              >
                {isLast ? "Done" : "Got it"}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── GuidedTour (orchestrator) ────────────────────────────────────────────────

export function GuidedTour({ steps, tourId, onComplete }: GuidedTourProps) {
  const storageKey = `${tourId}_completed`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const gotItRef = useRef<HTMLButtonElement>(null);
  const descId = useId();

  // Check localStorage once on mount
  useEffect(() => {
    try { if (!localStorage.getItem(storageKey)) setActive(true); } catch { /* SSR guard */ }
  }, [storageKey]);

  const positionForStep = useCallback((index: number, completeFn: () => void) => {
    const step = steps[index];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      // Target missing — skip to next step
      const next = index + 1;
      if (next >= steps.length) completeFn();
      else setStepIndex(next);
      return;
    }
    const spot = getSpotlightRect(el);
    setSpotlight(spot);
    const tw = tooltipRef.current?.offsetWidth ?? 300;
    const th = tooltipRef.current?.offsetHeight ?? 160;
    setTooltipPos(computeTooltipPosition(spot, step.position, tw, th, window.innerWidth, window.innerHeight));
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [steps]);

  function complete() {
    try { localStorage.setItem(storageKey, "true"); } catch { /* ignore */ }
    setActive(false);
    onComplete?.();
  }

  useEffect(() => { if (active) positionForStep(stepIndex, complete); }, [active, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) return;
    const onResize = () => positionForStep(stepIndex, complete);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, stepIndex, positionForStep]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") complete(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps — intentional: runs every render to always have fresh complete()
  useEffect(() => {
    if (active && tooltipPos) setTimeout(() => gotItRef.current?.focus(), 50);
  }, [active, stepIndex, tooltipPos]);

  if (!active || !spotlight || !tooltipPos) return null;

  return (
    <>
      <TourSpotlight rect={spotlight} />
      <TourTooltipCard
        step={steps[stepIndex]!}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        spotlight={spotlight}
        pos={tooltipPos}
        gotItRef={gotItRef}
        descId={descId}
        onAdvance={() => {
          const next = stepIndex + 1;
          if (next >= steps.length) complete();
          else setStepIndex(next);
        }}
        onSkip={complete}
      />
    </>
  );
}

// ─── TourReplayButton ─────────────────────────────────────────────────────────

interface TourReplayButtonProps {
  tourId: string;
  onReplay: () => void;
  className?: string;
}

/**
 * Small "?" button that clears the completed flag and triggers onReplay.
 * Mount near a page header. Parent re-mounts <GuidedTour> or resets its key.
 */
export function TourReplayButton({ tourId, onReplay, className = "" }: TourReplayButtonProps) {
  function handleReplay() {
    try { localStorage.removeItem(`${tourId}_completed`); } catch { /* ignore */ }
    onReplay();
  }
  return (
    <button
      onClick={handleReplay}
      aria-label="Replay guided tour"
      title="Replay tour"
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full border border-surface-border bg-surface-elevated hover:border-gold/30 hover:bg-surface-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
    </button>
  );
}
