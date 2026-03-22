"use client";

import { useRef, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Target,
  MapPin,
  DollarSign,
  Search,
  BarChart3,
  Shield,
  CheckCircle,
  Rocket,
  Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   JOURNEY DATA
   ═══════════════════════════════════════════════════════════════ */

export interface JourneyStep {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const JOURNEY_STEPS: JourneyStep[] = [
  { id: "goal",    label: "Goal",    description: "What are you trying to do?",    icon: Target       },
  { id: "market",  label: "Market",  description: "Where should you invest?",       icon: MapPin       },
  { id: "budget",  label: "Budget",  description: "What can you afford?",           icon: DollarSign   },
  { id: "find",    label: "Find",    description: "Browse available properties",    icon: Search       },
  { id: "analyze", label: "Analyze", description: "Is this deal good?",             icon: BarChart3    },
  { id: "risk",    label: "Risk",    description: "What could go wrong?",           icon: Shield       },
  { id: "decide",  label: "Decide",  description: "Make your decision",             icon: CheckCircle  },
  { id: "execute", label: "Execute", description: "Close the deal",                 icon: Rocket       },
];

export interface SubStep {
  id: string;
  label: string;
  /** If true, this sub-step auto-completes when the user first visits this section */
  auto?: boolean;
}

export const SUB_STEPS: Record<string, SubStep[]> = {
  goal: [
    { id: "choose-strategy",  label: "Choose investment strategy",     auto: true  },
    { id: "set-timeline",     label: "Set your timeline"                           },
    { id: "define-criteria",  label: "Define success criteria"                     },
  ],
  market: [
    { id: "view-heatmap",      label: "View national heatmap",        auto: true  },
    { id: "compare-markets",   label: "Compare 2+ markets"                        },
    { id: "review-ai",         label: "Review AI market summary"                  },
    { id: "confirm-market",    label: "Confirm market selection"                  },
  ],
  budget: [
    { id: "enter-income",      label: "Enter income & reserves",      auto: true  },
    { id: "set-down-payment",  label: "Set down payment target"                   },
    { id: "check-rates",       label: "Check current rate environment"             },
    { id: "confirm-budget",    label: "Confirm purchase budget"                   },
  ],
  find: [
    { id: "browse-listings",   label: "Browse available listings",    auto: true  },
    { id: "shortlist",         label: "Shortlist 3+ properties"                   },
    { id: "review-comps",      label: "Review comparable sales"                   },
  ],
  analyze: [
    { id: "enter-address",       label: "Enter property address",       auto: true },
    { id: "review-verdict",      label: "Review verdict"                           },
    { id: "check-expenses",      label: "Verify expense estimates"                 },
    { id: "review-stress",       label: "Review stress test results"               },
    { id: "check-market",        label: "Check market context"                     },
    { id: "compare-financing",   label: "Compare financing options"                },
  ],
  risk: [
    { id: "review-risk-score",   label: "Review 7-dimension risk score", auto: true },
    { id: "stress-test",         label: "Run stress test scenarios"                 },
    { id: "check-insurance",     label: "Verify insurance & reserves"              },
    { id: "confirm-risk",        label: "Confirm acceptable risk level"            },
  ],
  decide: [
    { id: "review-summary",      label: "Review full deal summary",    auto: true  },
    { id: "consult-advisor",     label: "Consult AI advisor"                        },
    { id: "record-decision",     label: "Record decision in journal"               },
  ],
  execute: [
    { id: "open-deal-room",      label: "Open deal room",             auto: true   },
    { id: "share-with-team",     label: "Share with partners"                      },
    { id: "secure-financing",    label: "Secure financing"                         },
    { id: "close-deal",          label: "Close the deal"                           },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface JourneyTrackerProps {
  /** The id of the currently active step */
  currentStep: string;
  /**
   * Map of step id → the user's choice label for that step.
   * A step is considered completed when it has an entry here.
   * e.g. { goal: "LTR", market: "Austin" }
   */
  completedSteps: Record<string, string>;
  /** Which sub-steps have been checked (step-id__substep-id) */
  completedSubSteps?: Set<string>;
  /** Called when the user clicks a completed step to navigate back */
  onStepClick: (stepId: string) => void;
  /** Called when the user toggles a sub-step checkbox */
  onSubStepToggle?: (stepId: string, subStepId: string, checked: boolean) => void;
  /** When true renders dots-only compact mode regardless of viewport */
  collapsed?: boolean;
  /** Hide the sub-step panel even when on a step that has sub-steps */
  hideSubSteps?: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function getStepIndex(id: string): number {
  return JOURNEY_STEPS.findIndex(s => s.id === id);
}

function isStepCompleted(id: string, completedSteps: Record<string, string>): boolean {
  return Object.prototype.hasOwnProperty.call(completedSteps, id);
}

function isStepAccessible(
  id: string,
  currentStep: string,
  completedSteps: Record<string, string>,
): boolean {
  if (isStepCompleted(id, completedSteps)) return true;
  if (id === currentStep) return false; // current — no action needed
  return false; // future — locked
}

/* ═══════════════════════════════════════════════════════════════
   SUB-STEP PANEL
   ═══════════════════════════════════════════════════════════════ */

interface SubStepPanelProps {
  stepId: string;
  completedSubSteps: Set<string>;
  onToggle: (stepId: string, subStepId: string, checked: boolean) => void;
}

function SubStepPanel({ stepId, completedSubSteps, onToggle }: SubStepPanelProps) {
  const subSteps = SUB_STEPS[stepId];
  if (!subSteps || subSteps.length === 0) return null;

  const completedCount = subSteps.filter(
    ss => completedSubSteps.has(`${stepId}__${ss.id}`)
  ).length;

  return (
    <div
      className="mt-3 pt-3 border-t border-surface-border"
      role="group"
      aria-label={`Checklist for current step`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Checklist</span>
        <span className="text-[11px] font-mono text-content-tertiary tabular-nums">
          {completedCount}/{subSteps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-[2px] rounded-full bg-surface-elevated mb-3 overflow-hidden"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={subSteps.length}
        aria-label={`${completedCount} of ${subSteps.length} sub-steps complete`}
      >
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${subSteps.length > 0 ? (completedCount / subSteps.length) * 100 : 0}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {subSteps.map(ss => {
          const key = `${stepId}__${ss.id}`;
          const checked = completedSubSteps.has(key);
          const inputId = `substep-${key}`;

          return (
            <li key={ss.id} className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  id={inputId}
                  checked={checked}
                  onChange={e => onToggle(stepId, ss.id, e.target.checked)}
                  className="sr-only peer"
                />
                <label
                  htmlFor={inputId}
                  className={[
                    "flex items-center justify-center w-4 h-4 rounded cursor-pointer",
                    "border transition-all duration-150",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-gold/50 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-surface",
                    checked
                      ? "bg-gold border-gold"
                      : "bg-surface-secondary border-surface-border hover:border-gold/40",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {checked && (
                    <Check className="w-2.5 h-2.5 text-black" aria-hidden="true" />
                  )}
                </label>
              </div>
              <label
                htmlFor={inputId}
                className={[
                  "text-[12px] cursor-pointer select-none transition-colors duration-150 leading-tight",
                  checked ? "text-content-tertiary line-through" : "text-content-secondary",
                  ss.auto ? "italic" : "",
                ].join(" ")}
              >
                {ss.label}
                {ss.auto && (
                  <span className="not-italic ml-1.5 text-[10px] text-content-disabled">(auto)</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function JourneyTracker({
  currentStep,
  completedSteps,
  completedSubSteps = new Set(),
  onStepClick,
  onSubStepToggle,
  collapsed = false,
  hideSubSteps = false,
}: JourneyTrackerProps) {
  const currentIdx = getStepIndex(currentStep);
  // noUncheckedIndexedAccess: currentIdx can be -1 if stepId is unrecognised
  const currentStepData = currentIdx >= 0 ? JOURNEY_STEPS[currentIdx] : undefined;
  const stepListRef = useRef<HTMLOListElement>(null);

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLOListElement>) => {
      const items = stepListRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!items || items.length === 0) return;

      const focused = document.activeElement as HTMLElement;
      const idx = Array.from(items).indexOf(focused);

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[idx + 1];
        if (next) next.focus();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = items[idx - 1];
        if (prev) prev.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    },
    [],
  );

  /* ── Scroll active step into view on mount / step change ── */
  useEffect(() => {
    const activeBtn = stepListRef.current?.querySelector<HTMLElement>(
      "[aria-current='step']",
    );
    activeBtn?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [currentStep]);

  const totalCompleted = Object.keys(completedSteps).length;

  /* ════════════════════════════════════════════════════════════
     COMPACT / COLLAPSED MODE (dots only + current label)
     Used on small screens or when `collapsed` prop is true
     ════════════════════════════════════════════════════════════ */
  if (collapsed) {
    return (
      <nav
        aria-label="Investment journey progress"
        className="w-full px-4 py-2.5 border-b border-surface-border bg-surface-secondary"
      >
        <div className="flex items-center gap-3">
          {/* Dot strip */}
          <ol
            className="flex items-center gap-1"
            aria-label="Journey steps"
          >
            {JOURNEY_STEPS.map((step, i) => {
              const completed = isStepCompleted(step.id, completedSteps);
              const active = step.id === currentStep;
              const future = !completed && !active;

              return (
                <li key={step.id}>
                  <button
                    onClick={() => isStepAccessible(step.id, currentStep, completedSteps) && onStepClick(step.id)}
                    disabled={future || active}
                    aria-current={active ? "step" : undefined}
                    aria-label={`${step.label}${completed ? ", completed" : active ? ", current step" : ", locked"}`}
                    className={[
                      "rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                      completed
                        ? "w-2 h-2 bg-gold cursor-pointer hover:bg-gold-light"
                        : active
                          ? "w-3 h-3 bg-gold"
                          : "w-2 h-2 bg-surface-elevated cursor-default",
                    ].join(" ")}
                  />
                </li>
              );
            })}
          </ol>

          {/* Current step label */}
          {currentStepData && (
            <span className="text-[12px] font-medium text-content-primary truncate">
              {currentStepData.label}
              <span className="text-content-disabled ml-1.5 font-normal">
                — {currentStepData.description}
              </span>
            </span>
          )}

          {/* Step count */}
          <span className="ml-auto text-[11px] font-mono text-content-disabled tabular-nums shrink-0">
            {currentIdx >= 0 ? currentIdx + 1 : "?"}/{JOURNEY_STEPS.length}
          </span>
        </div>
      </nav>
    );
  }

  /* ════════════════════════════════════════════════════════════
     FULL MODE — horizontal step bar + sub-steps
     ════════════════════════════════════════════════════════════ */
  return (
    <nav
      aria-label="Investment journey progress"
      className="w-full"
    >
      {/* ── Outer container ── */}
      <div className="border-b border-surface-border bg-gradient-to-r from-gold/[0.03] to-transparent">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">

          {/* ── Header row ── */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="section-label">Your Journey</span>
            </div>
            <span className="text-[11px] font-mono text-content-disabled tabular-nums">
              {totalCompleted} of {JOURNEY_STEPS.length} steps completed
            </span>
          </div>

          {/* ── Step rail ── */}
          <ol
            ref={stepListRef}
            className="flex items-start overflow-x-auto pb-1 scrollbar-hide gap-0"
            aria-label="Investment journey steps"
            onKeyDown={handleKeyDown}
          >
            {JOURNEY_STEPS.map((step, i) => {
              const completed = isStepCompleted(step.id, completedSteps);
              const active = step.id === currentStep;
              const future = !completed && !active;
              const isNextStep = i === currentIdx + 1;
              const canClick = completed && !active;
              const Icon = step.icon;
              const choiceLabel = completedSteps[step.id];
              const isLast = i === JOURNEY_STEPS.length - 1;

              return (
                <li
                  key={step.id}
                  className="flex items-center flex-1 min-w-0"
                >
                  {/* ── Step node + label ── */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 relative">
                    {/* Circle button */}
                    <button
                      onClick={() => canClick && onStepClick(step.id)}
                      disabled={future || active}
                      aria-current={active ? "step" : undefined}
                      aria-label={[
                        `Step ${i + 1}: ${step.label}`,
                        completed ? `Completed — ${choiceLabel ?? "done"}` : "",
                        active ? "Current step" : "",
                        future ? "Not yet reached" : "",
                      ].filter(Boolean).join(". ")}
                      aria-disabled={future || active ? "true" : undefined}
                      className={[
                        "relative flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                        completed
                          ? "bg-gold cursor-pointer hover:brightness-110"
                          : active
                            ? "bg-surface-secondary border-2 border-gold cursor-default"
                            : "bg-surface-secondary border border-surface-border cursor-default",
                      ].join(" ")}
                    >
                      {/* Active pulse ring */}
                      {active && (
                        <span
                          className="absolute inset-0 rounded-full border-2 border-gold/50 animate-ping"
                          aria-hidden="true"
                        />
                      )}

                      {completed ? (
                        <Check className="w-3.5 h-3.5 text-black" aria-hidden="true" />
                      ) : (
                        <Icon
                          className={[
                            "w-3.5 h-3.5",
                            active ? "text-gold-light" : "text-content-disabled",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    {/* Step label */}
                    <span
                      className={[
                        "text-[10px] font-medium text-center whitespace-nowrap transition-colors duration-200",
                        active
                          ? "text-content-primary"
                          : completed
                            ? "text-gold text-[10px]"
                            : "text-content-disabled",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {step.label}
                    </span>

                    {/* Sub-label: user's choice or "(next)" hint */}
                    <span
                      className={[
                        "text-[9px] text-center whitespace-nowrap max-w-[64px] truncate leading-none",
                        completed
                          ? "text-gold/70"
                          : isNextStep
                            ? "text-content-disabled italic"
                            : "opacity-0 select-none",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {completed
                        ? (choiceLabel ?? "done")
                        : isNextStep
                          ? "(next)"
                          : "·"}
                    </span>
                  </div>

                  {/* ── Connector line ── */}
                  {!isLast && (
                    <div
                      aria-hidden="true"
                      className={[
                        "flex-1 h-px mx-1.5 mt-[-20px] transition-colors duration-500",
                        completed ? "bg-gold/40" : "bg-surface-border",
                      ].join(" ")}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* ── Current step description bar ── */}
          {currentStepData && currentIdx >= 0 && (
            <div
              className="mt-3 flex items-center gap-2"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-[11px] font-mono text-content-disabled tabular-nums">
                Step {currentIdx + 1} of {JOURNEY_STEPS.length}
              </span>
              <span className="text-content-disabled text-[11px]">—</span>
              <span className="text-content-secondary text-[12px]">
                {currentStepData.description}
              </span>
            </div>
          )}

          {/* ── Sub-step panel ── */}
          {!hideSubSteps && currentStepData && SUB_STEPS[currentStep] && onSubStepToggle && (
            <SubStepPanel
              stepId={currentStep}
              completedSubSteps={completedSubSteps}
              onToggle={onSubStepToggle}
            />
          )}
        </div>
      </div>
    </nav>
  );
}
