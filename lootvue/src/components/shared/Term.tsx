"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ValueSentiment = "good" | "bad" | "neutral";

interface TermDefinition {
  fullName: string;
  plainEnglish: string;
  formula?: string;
  goodRange?: string;
  badRange?: string;
  example?: string;
  /** Numeric threshold at or above which the value is "good" */
  goodThreshold?: number;
  /** Numeric threshold at or below which the value is "bad" */
  badThreshold?: number;
  /** Set to true when a LOWER value is better (e.g. GRM, vacancy, LTV) */
  invertedScale?: boolean;
}

export interface TermProps {
  /** Unique term identifier — must match a key in TERM_DICTIONARY */
  id: string;
  /** Current metric value for contextual sentiment coloring */
  value?: number;
  /** Market average for comparison text in expanded panel */
  benchmark?: number;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Dictionary — 20 terms with numeric thresholds for value sentiment
// ---------------------------------------------------------------------------

const TERM_DICTIONARY: Record<string, TermDefinition> = {
  "cap-rate": {
    fullName: "Capitalization Rate",
    plainEnglish:
      "How much the property earns relative to its price. Higher means better cash flow.",
    formula: "NOI / Purchase Price × 100",
    goodRange: "Above 6% for cash flow markets",
    badRange: "Below 4% — may not cash flow",
    example:
      "A $500K property earning $35K/year NOI has a 7% cap rate.",
    goodThreshold: 6,
    badThreshold: 4,
  },
  dscr: {
    fullName: "Debt Service Coverage Ratio",
    plainEnglish:
      "How easily the property's income covers the loan payment. Lenders want at least 1.25x.",
    formula: "NOI / Annual Debt Service",
    goodRange: "Above 1.25x — comfortable cushion",
    badRange: "Below 1.0x — you're losing money each month",
    example: "DSCR of 1.35x means income is 35% more than the loan payment.",
    goodThreshold: 1.25,
    badThreshold: 1.0,
  },
  noi: {
    fullName: "Net Operating Income",
    plainEnglish:
      "What the property earns after all operating costs, but before your mortgage payment.",
    formula: "Gross Rent - Vacancy - Operating Expenses",
    goodRange: "Positive — the property makes money before financing",
    badRange: "Negative — the property loses money even without a mortgage",
    goodThreshold: 0,
    badThreshold: 0,
  },
  coc: {
    fullName: "Cash-on-Cash Return",
    plainEnglish:
      "How much cash you earn back each year relative to how much cash you put in.",
    formula: "Annual Cash Flow / Total Cash Invested × 100",
    goodRange: "Above 8% — better than most stock dividends",
    badRange: "Below 4% — a savings account might beat this",
    goodThreshold: 8,
    badThreshold: 4,
  },
  grm: {
    fullName: "Gross Rent Multiplier",
    plainEnglish:
      "How many years of rent it takes to equal the purchase price. Lower is better.",
    formula: "Purchase Price / Annual Gross Rent",
    goodRange: "Below 12 — property pays for itself relatively fast",
    badRange: "Above 20 — very expensive relative to rent",
    goodThreshold: 12,
    badThreshold: 20,
    invertedScale: true,
  },
  irr: {
    fullName: "Internal Rate of Return",
    plainEnglish:
      "Your total annual return including cash flow, appreciation, and equity buildup. The one number that captures everything.",
    formula: "Discount rate that makes NPV of all cash flows equal zero",
    goodRange: "Above 12% — strong investment",
    badRange: "Below 6% — barely beats inflation",
    goodThreshold: 12,
    badThreshold: 6,
  },
  npv: {
    fullName: "Net Present Value",
    plainEnglish:
      "How much this investment is worth in today's dollars, accounting for the time value of money.",
    formula: "Sum of discounted future cash flows - initial investment",
    goodRange: "Positive — the investment creates value",
    badRange: "Negative — you'd be better off putting the money elsewhere",
    goodThreshold: 0,
    badThreshold: 0,
  },
  ltv: {
    fullName: "Loan-to-Value Ratio",
    plainEnglish:
      "How much of the property's value you're borrowing. Lower means more equity, less risk.",
    formula: "Loan Amount / Property Value × 100",
    goodRange: "Below 75% — strong equity position",
    badRange: "Above 90% — very leveraged, PMI required",
    goodThreshold: 75,
    badThreshold: 90,
    invertedScale: true,
  },
  arv: {
    fullName: "After Repair Value",
    plainEnglish:
      "What the property will be worth AFTER renovations. This is what flippers and BRRRR investors care about most.",
    formula: "Estimated value based on comparable sales of renovated properties",
    goodRange: "ARV minus all costs leaves 15%+ profit margin",
    badRange: "ARV barely covers purchase + rehab = too thin",
  },
  mao: {
    fullName: "Maximum Allowable Offer",
    plainEnglish:
      "The most you should pay for a flip property to guarantee a profit.",
    formula: "ARV × 70% - Rehab Costs",
    goodRange: "Purchase price below MAO — built-in profit margin",
    badRange: "Purchase price above MAO — risk of losing money",
  },
  piti: {
    fullName: "Principal, Interest, Taxes, Insurance",
    plainEnglish:
      "Your total monthly housing payment — everything rolled together.",
    formula: "Mortgage P&I + Property Tax/12 + Insurance/12 + PMI (if applicable)",
  },
  adr: {
    fullName: "Average Daily Rate",
    plainEnglish: "The average nightly price you charge on Airbnb/VRBO.",
    formula: "Total Nightly Revenue / Number of Nights Booked",
    goodRange: "Above local market average — you can charge premium",
    badRange: "Below local average — may need better photos/amenities",
  },
  revpar: {
    fullName: "Revenue Per Available Room",
    plainEnglish:
      "How much you earn per night including empty nights. The true measure of STR performance.",
    formula: "ADR × Occupancy Rate",
    goodRange: "RevPAR > monthly rent equivalent — STR wins over LTR",
    badRange: "RevPAR < monthly rent equivalent — stick with long-term rental",
  },
  vacancy: {
    fullName: "Vacancy Rate",
    plainEnglish:
      "How often the property sits empty with no tenant paying rent.",
    goodRange: "Below 5% — high demand area, tenants are easy to find",
    badRange: "Above 10% — tenant turnover or weak demand",
    goodThreshold: 5,
    badThreshold: 10,
    invertedScale: true,
  },
  "equity-multiple": {
    fullName: "Equity Multiple",
    plainEnglish:
      "How many times you get your money back. 2.0x means you doubled your investment.",
    formula: "Total Distributions / Total Equity Invested",
    goodRange: "Above 2.0x over 5 years — strong return",
    badRange: "Below 1.0x — you lost money",
    goodThreshold: 2.0,
    badThreshold: 1.0,
  },
  "debt-yield": {
    fullName: "Debt Yield",
    plainEnglish:
      "How much income the property generates relative to the loan amount. Lenders use this to measure their risk.",
    formula: "NOI / Loan Amount × 100",
    goodRange: "Above 10% — lender is comfortable",
    badRange: "Below 8% — may struggle to get financing",
    goodThreshold: 10,
    badThreshold: 8,
  },
  "break-even-occupancy": {
    fullName: "Break-Even Occupancy",
    plainEnglish:
      "The minimum occupancy rate needed to cover all costs. Below this, you lose money.",
    formula:
      "(Debt Service + Operating Expenses) / Gross Potential Income × 100",
    goodRange: "Below 75% — big cushion before you lose money",
    badRange: "Above 90% — very little room for vacancy",
    goodThreshold: 75,
    badThreshold: 90,
    invertedScale: true,
  },
  "months-of-supply": {
    fullName: "Months of Supply",
    plainEnglish:
      "How long it would take to sell every home on the market at the current pace. Low supply = seller's market = prices rising.",
    goodRange: "Below 4 months — seller's market, prices likely rising",
    badRange: "Above 6 months — buyer's market, prices may fall",
    goodThreshold: 4,
    badThreshold: 6,
    invertedScale: true,
  },
  pmi: {
    fullName: "Private Mortgage Insurance",
    plainEnglish:
      "Extra monthly cost when your down payment is less than 20%. Protects the lender, not you.",
    formula: "Typically 0.5–1% of loan amount per year",
    goodRange: "None — you put 20%+ down",
    badRange: "$100–300/month — eating into cash flow",
  },
  appreciation: {
    fullName: "Property Appreciation",
    plainEnglish:
      "How much the property value grows each year. This is your equity gain beyond what you paid.",
    goodRange: "Above 3% — outpacing inflation",
    badRange: "Negative — property losing value",
    goodThreshold: 3,
    badThreshold: 0,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getValueSentiment(
  def: TermDefinition,
  value: number
): ValueSentiment {
  const { goodThreshold, badThreshold, invertedScale } = def;
  if (goodThreshold === undefined && badThreshold === undefined) return "neutral";

  if (!invertedScale) {
    if (goodThreshold !== undefined && value >= goodThreshold) return "good";
    if (badThreshold !== undefined && value <= badThreshold) return "bad";
    return "neutral";
  } else {
    // Lower is better: good when at or below goodThreshold, bad when at or above badThreshold
    if (goodThreshold !== undefined && value <= goodThreshold) return "good";
    if (badThreshold !== undefined && value >= badThreshold) return "bad";
    return "neutral";
  }
}

const SENTIMENT_CLASSES: Record<ValueSentiment, string> = {
  good: "text-emerald-light",
  bad: "text-rose-light",
  neutral: "text-amber-light",
};

const SENTIMENT_ICONS: Record<ValueSentiment, ReactNode> = {
  good: <TrendingUp className="w-3 h-3 shrink-0" aria-hidden="true" />,
  bad: <TrendingDown className="w-3 h-3 shrink-0" aria-hidden="true" />,
  neutral: <Minus className="w-3 h-3 shrink-0" aria-hidden="true" />,
};

const SENTIMENT_LABELS: Record<ValueSentiment, string> = {
  good: "Good range",
  bad: "Below target",
  neutral: "Watch range",
};

// ---------------------------------------------------------------------------
// Portal tooltip — renders outside overflow:hidden parents
// ---------------------------------------------------------------------------

interface TooltipPortalProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  visible: boolean;
  def: TermDefinition;
  sentiment: ValueSentiment | null;
  tooltipId: string;
}

function TooltipPortal({
  anchorRef,
  visible,
  def,
  sentiment,
  tooltipId,
}: TooltipPortalProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible || !anchorRef.current) {
      setCoords(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY - 8, // 8px above anchor
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, [visible, anchorRef]);

  if (!mounted || !visible || !coords) return null;

  return createPortal(
    <div
      id={tooltipId}
      role="tooltip"
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
      }}
      className="w-64 pointer-events-none"
    >
      <div className="rounded-lg bg-surface-elevated border border-surface-border shadow-elevated p-3 animate-fade-in">
        {/* Full name */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gold mb-1">
          {def.fullName}
        </p>
        {/* Plain English */}
        <p className="text-[12px] text-content-primary leading-relaxed">
          {def.plainEnglish}
        </p>
        {/* Sentiment indicator when value is present */}
        {sentiment && (
          <div
            className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${SENTIMENT_CLASSES[sentiment]}`}
          >
            {SENTIMENT_ICONS[sentiment]}
            <span>{SENTIMENT_LABELS[sentiment]}</span>
          </div>
        )}
        {/* Caret */}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-elevated border-r border-b border-surface-border rotate-45 -mt-[5px]"
          aria-hidden="true"
        />
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Expanded panel — inline, slides down beneath the term
// ---------------------------------------------------------------------------

interface ExpandedPanelProps {
  def: TermDefinition;
  value?: number;
  benchmark?: number;
  sentiment: ValueSentiment | null;
  panelId: string;
}

function ExpandedPanel({
  def,
  value,
  benchmark,
  sentiment,
  panelId,
}: ExpandedPanelProps) {
  return (
    <div
      id={panelId}
      className="mt-2 rounded-lg bg-surface-card border border-surface-border p-4 text-[12px] animate-slide-up"
      role="region"
      aria-label={`Full explanation: ${def.fullName}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
          {def.fullName}
        </p>
        {sentiment && (
          <div
            className={`flex items-center gap-1 shrink-0 text-[10px] font-medium ${SENTIMENT_CLASSES[sentiment]}`}
          >
            {SENTIMENT_ICONS[sentiment]}
            <span>{SENTIMENT_LABELS[sentiment]}</span>
          </div>
        )}
      </div>

      {/* Plain English */}
      <p className="text-content-secondary leading-relaxed mb-3">
        {def.plainEnglish}
      </p>

      {/* Value + benchmark comparison */}
      {(value !== undefined || benchmark !== undefined) && (
        <div className="flex items-center gap-4 mb-3">
          {value !== undefined && (
            <div>
              <p className="metric-label mb-0.5">Your value</p>
              <p
                className={`font-mono tabular-nums text-sm font-semibold ${sentiment ? SENTIMENT_CLASSES[sentiment] : "text-content-primary"}`}
              >
                {value}
              </p>
            </div>
          )}
          {benchmark !== undefined && (
            <div>
              <p className="metric-label mb-0.5">Market avg</p>
              <p className="font-mono tabular-nums text-sm font-semibold text-content-secondary">
                {benchmark}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="divider mb-3" />

      {/* Good / Bad ranges */}
      <div className="space-y-1.5">
        {def.goodRange && (
          <div className="flex items-start gap-2">
            <TrendingUp
              className="w-3 h-3 text-emerald-light mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <p className="text-content-secondary">
              <span className="text-emerald-light font-medium">Good: </span>
              {def.goodRange}
            </p>
          </div>
        )}
        {def.badRange && (
          <div className="flex items-start gap-2">
            <TrendingDown
              className="w-3 h-3 text-rose-light mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <p className="text-content-secondary">
              <span className="text-rose-light font-medium">Warning: </span>
              {def.badRange}
            </p>
          </div>
        )}
      </div>

      {/* Formula */}
      {def.formula && (
        <div className="mt-3 pt-3 border-t border-surface-border">
          <p className="section-label mb-1">Formula</p>
          <p className="font-mono text-[11px] text-content-tertiary leading-relaxed">
            {def.formula}
          </p>
        </div>
      )}

      {/* Example */}
      {def.example && (
        <div className="mt-3 pt-3 border-t border-surface-border">
          <p className="section-label mb-1">Example</p>
          <p className="text-[11px] text-content-tertiary leading-relaxed italic">
            {def.example}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-content-disabled mt-3 pt-3 border-t border-surface-border">
        Definitions are informational, not financial advice.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Term component
// ---------------------------------------------------------------------------

export function Term({ id, value, benchmark, children }: TermProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // containerRef wraps both the button and the expanded panel so outside-click
  // detection correctly ignores clicks anywhere within the component.
  const containerRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const tooltipId = `term-tooltip-${uid}`;
  const panelId = `term-panel-${uid}`;

  const def = TERM_DICTIONARY[id];

  // Sentiment calculation
  const sentiment: ValueSentiment | null =
    def && value !== undefined ? getValueSentiment(def, value) : null;

  // Close tooltip on scroll to prevent stale positioning
  useEffect(() => {
    const onScroll = () => setIsHovered(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close expanded panel on outside click — listens on the container span,
  // so clicks inside the panel don't accidentally close it.
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isExpanded]);

  const handleClick = useCallback(() => {
    setIsHovered(false);
    setIsExpanded((v) => !v);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
      if (e.key === "Escape") {
        setIsExpanded(false);
        setIsHovered(false);
      }
    },
    [handleClick]
  );

  // Unknown term — render plain, no interaction
  if (!def) {
    return <span>{children}</span>;
  }

  const ariaLabel = `${String(children)}: ${def.fullName}. ${def.plainEnglish}${sentiment ? ` Status: ${SENTIMENT_LABELS[sentiment]}.` : ""} Press Enter to expand full explanation.`;

  return (
    // containerRef wraps the entire component so outside-click covers both
    // the button and the expanded panel. inline-block keeps it in text flow.
    <span ref={containerRef} className="inline-block">
      {/* Term trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => !isExpanded && setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        aria-describedby={isHovered ? tooltipId : undefined}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        aria-label={ariaLabel}
        className={[
          // Base: inline, cursor pointer, reset button styles
          "inline-flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 font-[inherit] text-[inherit]",
          // Gold dotted underline — the visual signal this is interactive
          "border-b border-dashed border-gold/60",
          // Focus ring — never outline:none without replacement
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 focus-visible:rounded-sm",
          // Hover: slightly brighter underline
          "hover:border-gold transition-colors duration-150",
          // Expanded state: solid underline
          isExpanded ? "border-solid border-gold" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
        {/* Expand/collapse chevron — only shown when value prop is present for richer context signaling */}
        {isExpanded ? (
          <ChevronUp
            className="w-3 h-3 text-gold/60 ml-0.5"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="w-3 h-3 text-content-disabled ml-0.5 group-hover:text-gold/60"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Portal tooltip — hover/focus only, disappears on expand */}
      <TooltipPortal
        anchorRef={buttonRef}
        visible={isHovered && !isExpanded}
        def={def}
        sentiment={sentiment}
        tooltipId={tooltipId}
      />

      {/* Inline expanded panel — slides in below */}
      {isExpanded && (
        <ExpandedPanel
          def={def}
          value={value}
          benchmark={benchmark}
          sentiment={sentiment}
          panelId={panelId}
        />
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Re-export dictionary for consumers that need to enumerate terms
// ---------------------------------------------------------------------------

export { TERM_DICTIONARY };
export type { TermDefinition, ValueSentiment };
