"use client";

import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
}

interface GuidedStepsProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

/**
 * GuidedSteps — horizontal step progress indicator for guided workflows.
 * Used in Simple mode to walk first-time investors through an analysis flow.
 */
export function GuidedSteps({
  steps,
  currentStep,
  onStepChange,
}: GuidedStepsProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <nav
      aria-label="Guided workflow progress"
      className="w-full"
      role="navigation"
    >
      {/* Step dots + connecting lines */}
      <ol className="flex items-center w-full mb-6">
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          const future = index > currentStep;

          return (
            <li
              key={step.id}
              className="flex items-center flex-1 last:flex-none"
            >
              {/* Dot + label */}
              <button
                onClick={() => completed && onStepChange(index)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${completed ? " (completed)" : active ? " (current)" : ""}`}
                disabled={future}
                className="flex flex-col items-center gap-1.5 group focus-visible:outline-none"
              >
                {/* Circle */}
                <span
                  className={[
                    "relative flex items-center justify-center w-7 h-7 rounded-full border-2 text-[11px] font-bold transition-all duration-200 shrink-0",
                    completed
                      ? "bg-emerald border-emerald text-black"
                      : active
                        ? "bg-gold-muted border-gold text-gold-light"
                        : "bg-surface-secondary border-surface-border text-content-disabled",
                    completed
                      ? "cursor-pointer"
                      : future
                        ? "cursor-default"
                        : "",
                  ].join(" ")}
                >
                  {/* Pulsing ring on active */}
                  {active && (
                    <span className="absolute inset-0 rounded-full border-2 border-gold/40 animate-ping" />
                  )}
                  {completed ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Label — hidden below sm */}
                <span
                  className={[
                    "hidden sm:block text-[10px] font-medium text-center max-w-[72px] leading-tight transition-colors duration-200",
                    active
                      ? "text-gold-light"
                      : completed
                        ? "text-emerald-light"
                        : "text-content-disabled",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line — not after last step */}
              {index < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className={[
                    "flex-1 h-px mx-1.5 transition-colors duration-300",
                    completed ? "bg-emerald/60" : "bg-surface-border",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onStepChange(currentStep - 1)}
          disabled={isFirst}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <span className="text-[11px] text-content-disabled tabular-nums">
          {currentStep + 1} / {steps.length}
        </span>

        <button
          onClick={() => onStepChange(currentStep + 1)}
          disabled={isLast}
          className="btn-primary btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isLast ? "View Full Report" : "Next"}
        </button>
      </div>
    </nav>
  );
}
