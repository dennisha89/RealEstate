"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import {
  getMetricInsight,
  getVerdictBadgeClass,
  getVerdictBorderColor,
} from "@/lib/data/ai-insights";
import { METRIC_GLOSSARY } from "@/lib/data/metric-glossary";

interface AiInsightProps {
  /** Key from METRIC_GLOSSARY */
  metric: string;
  value: number;
  /** Additional numeric context (e.g. market_avg_cap_rate) */
  context?: Record<string, number>;
  /** compact = sparkle icon only + small tooltip; full = inline summary + expandable panel */
  compact?: boolean;
}

/**
 * AiInsight — wraps any metric with a plain-English AI-generated explanation.
 * Click the sparkle icon to reveal an insight panel with a verdict, explanation, and action.
 *
 * Does NOT call the Claude API — insights are deterministic, based on value thresholds
 * calibrated to institutional benchmarks. For full AI advisory, use ai-advisor-engine.
 */
export function AiInsight({
  metric,
  value,
  context,
  compact = false,
}: AiInsightProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const definition = METRIC_GLOSSARY[metric];
  const insight = getMetricInsight(metric, value, context);
  const borderColor = getVerdictBorderColor(insight.verdict);
  const badgeClass = getVerdictBadgeClass(insight.verdict);
  const verdictLabel = insight.verdictLabel;

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const triggerButton = (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      aria-label={`AI insight for ${definition?.name ?? metric}`}
      className="inline-flex items-center gap-0.5 text-gold/60 hover:text-gold-light transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded"
    >
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );

  const insightPanel = open && (
    <div
      className="mt-2 rounded-lg bg-surface-elevated border-l-2 p-3 text-[12px] animate-fade-in"
      style={{ borderLeftColor: borderColor }}
      role="region"
      aria-label="AI Insight panel"
    >
      {/* Panel header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-gold-light" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-gold-light uppercase tracking-wider">
          AI Insight
        </span>
        <span className="text-content-disabled text-[10px]">·</span>
        <span className="text-[10px] text-content-tertiary">
          Deterministic
        </span>
        <div className="ml-auto">
          <span className={badgeClass}>{verdictLabel}</span>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-content-secondary leading-relaxed mb-2">
        {insight.explanation}
      </p>

      {/* Action recommendation */}
      <p className="text-content-tertiary italic">{insight.action}</p>

      {/* Disclaimer */}
      <p className="text-[9px] text-content-disabled mt-2 pt-2 border-t border-surface-border">
        AI analysis is informational, not financial advice.
      </p>
    </div>
  );

  if (compact) {
    return (
      <span ref={ref} className="relative inline-flex items-center">
        {triggerButton}
        {open && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72">
            <div
              className="rounded-lg bg-surface-elevated border border-surface-border border-l-2 p-3 text-[12px] shadow-elevated animate-fade-in"
              style={{ borderLeftColor: borderColor }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-gold-light" aria-hidden="true" />
                <span className="text-[10px] font-semibold text-gold-light uppercase tracking-wider">
                  AI Insight
                </span>
                <div className="ml-auto">
                  <span className={badgeClass}>{verdictLabel}</span>
                </div>
              </div>
              <p className="text-content-secondary leading-relaxed text-[11px]">
                {insight.explanation}
              </p>
              <p className="text-content-tertiary italic text-[11px] mt-1">
                {insight.action}
              </p>
              <p className="text-[9px] text-content-disabled mt-2">
                Not financial advice.
              </p>
              {/* Caret */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-elevated border-r border-b border-surface-border rotate-45 -mt-1" />
            </div>
          </div>
        )}
      </span>
    );
  }

  // Full (non-compact) mode
  return (
    <div ref={ref} className="w-full">
      <div className="flex items-center gap-1.5">
        {triggerButton}
        {!open && definition && (
          <span className="text-[11px] text-content-tertiary truncate">
            {definition.name}
          </span>
        )}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="text-[11px] text-content-disabled hover:text-content-secondary transition-colors"
          >
            Why this matters
          </button>
        )}
      </div>
      {insightPanel}
    </div>
  );
}
