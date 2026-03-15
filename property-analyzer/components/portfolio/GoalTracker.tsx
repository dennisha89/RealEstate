"use client";

import { useMemo } from "react";
import { Target, CheckCircle2, Circle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface GoalTrackerProps {
  currentMonthlyCashFlow: number;
  totalEquity: number;
  totalValue: number;
  propertyCount: number;
  avgCapRate: number;
}

const GOAL = 10_000;
const MILESTONES = [1_000, 2_500, 5_000, 10_000];

export default function GoalTracker({
  currentMonthlyCashFlow,
  totalEquity,
  totalValue,
  propertyCount,
  avgCapRate,
}: GoalTrackerProps) {
  const metrics = useMemo(() => {
    const progress = Math.max(0, Math.min((currentMonthlyCashFlow / GOAL) * 100, 100));
    const avgCashFlowPerProperty = propertyCount > 0 ? currentMonthlyCashFlow / propertyCount : 0;
    const remaining = GOAL - currentMonthlyCashFlow;
    const propertiesNeeded = avgCashFlowPerProperty > 0 ? Math.ceil(remaining / avgCashFlowPerProperty) : null;

    // Timeline: assume each property adds avg cash flow and takes ~4 months to acquire
    const monthsAtCurrentPace =
      avgCashFlowPerProperty > 0 && propertiesNeeded !== null
        ? propertiesNeeded * 4
        : null;
    const monthsIfAddNow =
      avgCashFlowPerProperty > 0 && propertiesNeeded !== null
        ? Math.max(0, propertiesNeeded - 1) * 4
        : null;

    return {
      progress,
      avgCashFlowPerProperty,
      remaining,
      propertiesNeeded,
      monthsAtCurrentPace,
      monthsIfAddNow,
    };
  }, [currentMonthlyCashFlow, propertyCount]);

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-[6px] bg-emerald-500/10 flex items-center justify-center">
          <Target className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-content-primary">Passive Income Goal</p>
          <p className="text-xs text-content-tertiary">{formatCurrency(GOAL)}/month target</p>
        </div>
      </div>

      {/* Current status */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className={`text-2xl font-bold font-mono ${currentMonthlyCashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
            {formatCurrency(Math.round(currentMonthlyCashFlow))}<span className="text-sm text-content-tertiary font-normal">/mo</span>
          </p>
          <span className="text-sm font-mono text-content-secondary">
            {Math.round(metrics.progress)}%
          </span>
        </div>

        {/* Progress bar with milestones */}
        <div className="relative">
          <div className="h-3 w-full rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-luxury"
              style={{
                width: `${metrics.progress}%`,
                background: "linear-gradient(90deg, #10B981, #047857)",
              }}
            />
          </div>

          {/* Milestone markers */}
          <div className="relative h-5 mt-1">
            {MILESTONES.map((m) => {
              const pct = (m / GOAL) * 100;
              const reached = currentMonthlyCashFlow >= m;
              return (
                <div
                  key={m}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                >
                  {reached ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-content-disabled" />
                  )}
                  <span className={`text-[9px] font-mono mt-0.5 ${reached ? "text-emerald-400" : "text-content-disabled"}`}>
                    {m >= 1000 ? `$${m / 1000}K` : `$${m}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projections */}
      <div className="space-y-3 pt-2 border-t border-border-subtle">
        {metrics.propertiesNeeded !== null && metrics.propertiesNeeded > 0 && (
          <div className="flex items-start justify-between">
            <p className="text-sm text-content-secondary">Properties needed</p>
            <p className="text-sm font-mono font-medium text-content-primary">
              {metrics.propertiesNeeded} more
            </p>
          </div>
        )}
        {metrics.monthsAtCurrentPace !== null && metrics.monthsAtCurrentPace > 0 && (
          <div className="flex items-start justify-between">
            <p className="text-sm text-content-secondary">At current pace</p>
            <p className="text-sm font-mono font-medium text-content-primary">
              {metrics.monthsAtCurrentPace} months
            </p>
          </div>
        )}
        {metrics.monthsIfAddNow !== null && metrics.monthsAtCurrentPace !== null && metrics.monthsAtCurrentPace > 0 && (
          <div className="flex items-start justify-between">
            <p className="text-sm text-content-secondary">If you add one now</p>
            <p className="text-sm font-mono font-medium text-emerald-400">
              {metrics.monthsIfAddNow} months
            </p>
          </div>
        )}
        {currentMonthlyCashFlow >= GOAL && (
          <p className="text-sm font-medium text-emerald-400 text-center pt-2">
            Goal reached. You are financially free.
          </p>
        )}
      </div>
    </div>
  );
}
