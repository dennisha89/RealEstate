"use client";

import { useState, useId } from "react";
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useAiInsight } from "@/lib/hooks/useAiInsight";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FactorItem {
  label: string;
  /** Positive = pushes metric up, negative = pushes it down */
  value: number;
  /** e.g. 'pp', '%', '$' */
  unit?: string;
}

export interface AiInsightStripProps {
  /** The 1-line collapsed summary shown at all times */
  summary: string;
  /** The expanded multi-paragraph analysis */
  detail?: string;
  /** Factor attribution bars (what's driving the insight) */
  factors?: FactorItem[];
  /** Data source citations shown as bracketed tags */
  sources?: string[];
  /** Confidence level — controls the badge color */
  confidence?: "high" | "medium" | "low";
  /** Start in the expanded state */
  defaultExpanded?: boolean;
  /** Called when user clicks "Ask AI Coach" */
  onAskCoach?: () => void;
  /** Show loading skeleton when AI is generating */
  loading?: boolean;
  /**
   * If provided, fetch a live AI insight from /api/ai/coach.
   * The streamed response replaces `summary` when complete.
   * Falls back to `summary` on error or if API key is missing.
   */
  aiPrompt?: string;
  /** Grounding data passed to Claude as verified context. Only used when aiPrompt is set. */
  aiContext?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<
  NonNullable<AiInsightStripProps["confidence"]>,
  string
> = {
  high: "bg-emerald/10 text-emerald border border-emerald/20",
  medium: "bg-amber/10 text-amber border border-amber/20",
  low: "bg-rose/10 text-rose border border-rose/20",
};

const CONFIDENCE_LABEL: Record<
  NonNullable<AiInsightStripProps["confidence"]>,
  string
> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

/** Largest absolute value among all factors — used to scale bar widths */
function maxAbsolute(factors: FactorItem[]): number {
  return Math.max(...factors.map((f) => Math.abs(f.value)), 0.001);
}

/** Format a factor value for display. Always shows sign. */
function formatFactorValue(value: number, unit = ""): string {
  const sign = value >= 0 ? "+" : "−";
  const abs = Math.abs(value);
  const formatted =
    unit === "$"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(abs)
      : `${abs.toFixed(1)}${unit}`;
  return `${sign}${formatted}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({
  confidence,
}: {
  confidence: NonNullable<AiInsightStripProps["confidence"]>;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider ${CONFIDENCE_STYLES[confidence]}`}
      aria-label={`Confidence: ${confidence}`}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

function SourceTags({ sources }: { sources: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1" aria-label="Data sources">
      {sources.map((src) => (
        <span
          key={src}
          className="text-[10px] font-mono text-content-tertiary cursor-default select-none"
          title={`Data source: ${src}`}
        >
          [{src}]
        </span>
      ))}
    </span>
  );
}

function FactorBar({
  factor,
  maxVal,
  index,
}: {
  factor: FactorItem;
  maxVal: number;
  index: number;
}) {
  const isPositive = factor.value >= 0;
  const widthPct = Math.round((Math.abs(factor.value) / maxVal) * 100);
  const barColor = isPositive ? "bg-emerald" : "bg-rose";
  const valueColor = isPositive ? "text-emerald" : "text-rose";

  return (
    <div
      className="flex items-center gap-3"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Bar track */}
      <div
        className="relative h-1.5 rounded-full bg-surface-elevated overflow-hidden"
        style={{ width: 120 }}
        aria-hidden="true"
      >
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>

      {/* Value */}
      <span className={`w-14 text-right text-[11px] font-mono tabular-nums ${valueColor}`}>
        {formatFactorValue(factor.value, factor.unit)}
      </span>

      {/* Label */}
      <span className="text-[12px] text-content-secondary leading-tight flex-1">
        {factor.label}
      </span>
    </div>
  );
}

/**
 * Replaces only the summary area during loading — the "AI Analysis" label
 * is always rendered by the outer row, so this component never repeats it.
 */
function LoadingSkeleton() {
  return (
    <div
      className="flex flex-1 items-center gap-3 py-0.5"
      aria-busy="true"
      aria-label="AI analysis loading"
    >
      <div className="flex-1 h-3.5 skeleton rounded" style={{ maxWidth: 320 }} />
      <span className="text-[11px] text-gold/60 font-mono flex-shrink-0">
        Analyzing…
      </span>
    </div>
  );
}

/**
 * Streaming indicator — gold pulsing dot with partial text.
 * Shows while the AI coach is actively streaming a response.
 */
function StreamingIndicator({ text }: { text: string }) {
  return (
    <div
      className="flex flex-1 items-start gap-2 py-0.5"
      aria-busy="true"
      aria-label="AI coach is generating insight"
      aria-live="polite"
    >
      {text ? (
        <p className="flex-1 text-[13px] text-content-secondary italic leading-snug min-w-0">
          &ldquo;{text}
          <span className="inline-block w-1.5 h-3.5 bg-gold/80 animate-pulse ml-0.5 align-middle rounded-sm" aria-hidden="true" />
          &rdquo;
        </p>
      ) : (
        <div className="flex flex-1 items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" aria-hidden="true" />
          <span className="text-[12px] text-gold/70 font-mono">
            AI analyzing...
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Small "LIVE" badge to distinguish AI-generated insights from static text.
 */
function LiveAiBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-gold/10 text-gold border border-gold/20"
      aria-label="Live AI-generated insight"
    >
      <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
      LIVE
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * AiInsightStrip — Surface 1 + Surface 2 AI analysis component.
 *
 * Surface 1 (collapsed): always visible. Shows the 1-line summary, source tags,
 * and the "Why?" toggle. Text label "AI Analysis" is always present per
 * EU AI Act Article 50 disclosure requirements.
 *
 * Surface 2 (expanded): full detail, factor attribution bars, sources, and
 * "Ask AI Coach" CTA.
 *
 * Place after any data section that has AI-generated commentary.
 * The gold left border is the visual signature for all AI content app-wide.
 */
export function AiInsightStrip({
  summary,
  detail,
  factors,
  sources,
  confidence,
  defaultExpanded = false,
  onAskCoach,
  loading = false,
  aiPrompt,
  aiContext,
}: AiInsightStripProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const disclaimerId = useId();
  const detailId = useId();

  // ── Live AI mode: fetch from /api/ai/coach when aiPrompt is provided ──
  const ai = useAiInsight({
    prompt: aiPrompt ?? "",
    context: aiContext,
    enabled: !!aiPrompt,
  });

  // Determine which text to display:
  // 1. If live AI returned text, use it
  // 2. If live AI is streaming, show streaming indicator (handled below)
  // 3. If live AI errored or no aiPrompt, fall back to static `summary`
  const isLiveMode = !!aiPrompt;
  const hasLiveText = isLiveMode && ai.text.length > 0;
  const displaySummary = hasLiveText ? ai.text : summary;
  const isActivelyStreaming = isLiveMode && ai.isStreaming;

  const hasExpanded = !!(detail || (factors && factors.length > 0));
  const maxVal = factors && factors.length > 0 ? maxAbsolute(factors) : 1;

  return (
    <section
      role="complementary"
      aria-label="AI Analysis"
      aria-describedby={disclaimerId}
      className={[
        // Container — card surface with gold left accent
        "bg-surface-card border border-gold/20 border-l-2 border-l-gold rounded-lg px-4 py-3",
        "transition-all duration-200 ease-out",
      ].join(" ")}
    >
      {/* ── Surface 1: Collapsed row ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        {/* AI label — always visible, required disclosure */}
        <div className="relative group flex-shrink-0">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider text-gold cursor-default select-none"
            aria-label="AI-generated content"
          >
            AI Analysis
          </span>
          {/* Disclaimer tooltip on label hover */}
          <div
            id={disclaimerId}
            role="tooltip"
            className={[
              "pointer-events-none absolute bottom-full left-0 mb-2 z-50",
              "w-64 rounded-lg bg-surface-elevated border border-surface-border",
              "px-3 py-2 text-[11px] text-content-secondary leading-relaxed",
              "shadow-elevated opacity-0 group-hover:opacity-100",
              "transition-opacity duration-150",
            ].join(" ")}
          >
            AI-generated analysis based on engine data. Not financial advice.
          </div>
        </div>

        {/* Live AI badge + refresh button */}
        {isLiveMode && !loading && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <LiveAiBadge />
            {!isActivelyStreaming && (
              <button
                onClick={ai.refresh}
                className="p-0.5 rounded hover:bg-white/5 transition-colors text-content-disabled hover:text-gold"
                aria-label="Refresh AI insight"
                title="Regenerate AI insight"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Loading state replaces summary */}
        {loading ? (
          <LoadingSkeleton />
        ) : isActivelyStreaming ? (
          <StreamingIndicator text={ai.text} />
        ) : (
          <>
            {/* Summary text */}
            <p className="flex-1 text-[13px] text-content-secondary italic leading-snug min-w-0">
              &ldquo;{displaySummary}&rdquo;
            </p>

            {/* AI error indicator — subtle, non-blocking */}
            {isLiveMode && ai.error && !hasLiveText && (
              <span className="text-[10px] text-content-disabled font-mono flex-shrink-0" title={ai.error}>
                (fallback)
              </span>
            )}

            {/* Source tags — collapsed row */}
            {sources && sources.length > 0 && !expanded && (
              <SourceTags sources={hasLiveText ? [...sources, "Claude AI"] : sources} />
            )}

            {/* Confidence badge when expanded */}
            {confidence && expanded && (
              <ConfidenceBadge confidence={confidence} />
            )}

            {/* Why? / Collapse toggle */}
            {hasExpanded && (
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={detailId}
                aria-label={expanded ? "Collapse AI analysis" : "Expand AI analysis — see reasoning"}
                className={[
                  "flex-shrink-0 flex items-center gap-0.5 text-[12px] font-medium",
                  "text-gold hover:text-gold-light transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded",
                  "cursor-pointer",
                ].join(" ")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded((v) => !v);
                  }
                }}
              >
                {expanded ? (
                  <>
                    Collapse
                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Why?
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Surface 2: Expanded panel ─────────────────────────────────────── */}
      {!loading && expanded && hasExpanded && (
        <div
          id={detailId}
          className="mt-3 pt-3 border-t border-surface-border animate-fade-in"
          aria-live="polite"
        >
          {/* Confidence row (top of expanded) */}
          {confidence && (
            <div className="flex items-center gap-2 mb-3">
              <span className="section-label">Confidence</span>
              <ConfidenceBadge confidence={confidence} />
            </div>
          )}

          {/* Full detail text */}
          {detail && (
            <p className="text-[13px] text-content-secondary leading-relaxed mb-4">
              {detail}
            </p>
          )}

          {/* Factor attribution bars */}
          {factors && factors.length > 0 && (
            <div className="mb-4">
              <p className="section-label mb-2.5">What&apos;s driving this</p>
              <div className="flex flex-col gap-2.5">
                {factors.map((factor, i) => (
                  <FactorBar
                    key={factor.label}
                    factor={factor}
                    maxVal={maxVal}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sources (expanded) */}
          {sources && sources.length > 0 && (
            <div className="mb-4">
              <p className="section-label mb-1.5">Sources</p>
              <SourceTags sources={sources} />
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-surface-border">
            {/* Ask AI Coach CTA */}
            {onAskCoach ? (
              <button
                onClick={onAskCoach}
                className={[
                  "flex items-center gap-1 text-[12px] text-gold hover:text-gold-light",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded",
                ].join(" ")}
                aria-label="Open AI Coach to discuss this analysis"
              >
                Ask AI Coach about this
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </button>
            ) : (
              <span />
            )}

            {/* Collapse */}
            <button
              onClick={() => setExpanded(false)}
              aria-label="Collapse AI analysis"
              className={[
                "flex items-center gap-0.5 text-[12px] font-medium",
                "text-gold hover:text-gold-light transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded",
              ].join(" ")}
            >
              Collapse
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
