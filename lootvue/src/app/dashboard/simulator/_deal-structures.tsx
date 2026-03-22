"use client";

/**
 * Deal Structure Simulator — _deal-structures.tsx
 *
 * Two exported components:
 *   FundingQuestion      — 4 visual cards asking how the deal is funded
 *   StructureComparison  — ranked comparison table of all financing paths
 *
 * Consumed by: simulator/page.tsx
 */

import { useState, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Users,
  Wrench,
  Handshake,
  Wallet,
} from "lucide-react";
import { Term } from "@/components/shared/Term";
import { formatCurrency, formatCompact } from "@/lib/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StructureCategory = "solo" | "partner" | "investors" | "creative";
export type StructureStatus = "qualified" | "borderline" | "disqualified";
export type StructureSignal = "buy" | "hold" | "pass";

export interface StructureResult {
  id: string;
  name: string;
  category: StructureCategory;
  cashRequired: number;        // total cash out-of-pocket (cents avoided — stored as dollars here)
  downPaymentPct: number;      // % of purchase price
  interestRate: number;        // annual %
  monthlyPayment: number;      // P&I (or equivalent)
  monthlyCashFlow: number;     // NOI - debt service
  cashOnCash: number;          // annual CoC return %
  ltv: number;                 // loan-to-value %
  dscr: number;                // debt service coverage ratio
  status: StructureStatus;
  signal: StructureSignal;
  disqualReason?: string;      // if status === "disqualified"
  riskLevel: "low" | "moderate" | "high" | "very-high";
  plainEnglish: string;        // one-sentence summary
  riskFactors: string[];       // 2-4 bullet points
  legalNotes?: string;         // state-specific caveats
  pros: string[];
  cons: string[];
}

// ─── Sample Data (development / engine-not-yet-built fallback) ────────────────
//
// Assumes a $400,000 purchase, $2,800/mo gross rent, $1,260/mo expenses (45%).

export const SAMPLE_STRUCTURES: StructureResult[] = [
  {
    id: "conventional-20",
    name: "Conventional 30yr — 20% Down",
    category: "solo",
    cashRequired: 80_000,
    downPaymentPct: 20,
    interestRate: 7.25,
    monthlyPayment: 2_183,
    monthlyCashFlow: -643,
    cashOnCash: -9.6,
    ltv: 80,
    dscr: 0.73,
    status: "disqualified",
    signal: "pass",
    disqualReason: "Negative cash flow — property costs $643/mo to carry",
    riskLevel: "high",
    plainEnglish: "Standard bank loan. Most transparent, but today's rates kill the cash flow at this price.",
    riskFactors: ["Negative DSCR means out-of-pocket every month", "Rate lock expiry risk at refinance", "PMI not required at 20% — one positive"],
    pros: ["Clean financing, no investor complications", "30-year fixed protects from rate shock", "Easiest to qualify for"],
    cons: ["Cash flow negative at 7.25% + $400K price", "Large cash requirement", "No upside from leverage optimization"],
  },
  {
    id: "dscr-loan",
    name: "DSCR Loan — 25% Down",
    category: "solo",
    cashRequired: 100_000,
    downPaymentPct: 25,
    interestRate: 7.75,
    monthlyPayment: 2_157,
    monthlyCashFlow: -617,
    cashOnCash: -7.4,
    ltv: 75,
    dscr: 0.71,
    status: "disqualified",
    signal: "pass",
    disqualReason: "DSCR below 1.0 — most DSCR lenders require 1.25x",
    riskLevel: "high",
    plainEnglish: "Lenders qualify on property income, not your W2. Requires DSCR above 1.25x — this deal doesn't pass.",
    riskFactors: ["Property doesn't generate enough NOI to qualify", "Higher rate than conventional", "Requires seasoned reserves"],
    pros: ["No income verification needed", "Scales for portfolio investors", "Faster closing than conventional"],
    cons: ["Deal math disqualifies at current rent", "Rate premium over conventional", "Higher down payment requirement"],
  },
  {
    id: "hard-money-brrrr",
    name: "Hard Money + BRRRR Refinance",
    category: "creative",
    cashRequired: 30_000,
    downPaymentPct: 0,
    interestRate: 12.0,
    monthlyPayment: 4_000,
    monthlyCashFlow: -2_260,
    cashOnCash: 0,
    ltv: 90,
    dscr: 0.38,
    status: "qualified",
    signal: "hold",
    riskLevel: "very-high",
    plainEnglish: "Borrow everything short-term, renovate, refinance out. Recycle capital if ARV supports 75% LTV refi.",
    riskFactors: ["Highly sensitive to ARV — if value misses by 10% the refi fails", "12-month window before balloon payment", "Rehab cost overruns destroy the math"],
    legalNotes: "Hard money loans are regulated at state level — some states require a real estate attorney for closing.",
    pros: ["Near-zero cash to acquire", "Forces value-add renovation", "If refi works, capital fully recycled"],
    cons: ["Execution risk is very high", "Negative carry during rehab period", "Requires strong exit plan at close"],
  },
  {
    id: "seller-financing",
    name: "Seller Financing — 10% Down",
    category: "creative",
    cashRequired: 40_000,
    downPaymentPct: 10,
    interestRate: 6.0,
    monthlyPayment: 2_158,
    monthlyCashFlow: -618,
    cashOnCash: -18.5,
    ltv: 90,
    dscr: 0.72,
    status: "borderline",
    signal: "hold",
    riskLevel: "moderate",
    plainEnglish: "Seller acts as the bank. Negotiate the rate and term. Requires a motivated seller with no existing mortgage.",
    riskFactors: ["Seller must own property free-and-clear or have assumption clause", "Due-on-sale clause risk if lender discovers transfer", "Typically 5-10 year balloon"],
    legalNotes: "Dodd-Frank Act limits seller financing without NMLS license. Consult a real estate attorney before structuring.",
    pros: ["Below-market rate if negotiated well", "Flexible terms — interest-only possible", "No bank qualification required"],
    cons: ["Most sellers won't agree", "Balloon payment creates refinance risk", "Still cash flow negative at this rent"],
  },
  {
    id: "subject-to",
    name: "Subject-To Existing Mortgage",
    category: "creative",
    cashRequired: 15_000,
    downPaymentPct: 0,
    interestRate: 3.5,
    monthlyPayment: 1_347,
    monthlyCashFlow: 193,
    cashOnCash: 15.4,
    ltv: 85,
    dscr: 1.09,
    status: "qualified",
    signal: "buy",
    riskLevel: "high",
    plainEnglish: "Take over seller's existing low-rate mortgage. The pre-2022 rate makes this property cash flow positive immediately.",
    riskFactors: ["Due-on-sale clause — lender can call the note", "Mortgage stays in seller's name (credit risk for seller)", "Requires a motivated seller in financial distress"],
    legalNotes: "Subject-to is legal in all 50 states but ethically requires full disclosure to the seller. Requires a real estate attorney.",
    pros: ["Inherited 3.5% rate turns negative to positive cash flow", "Very low cash requirement", "No bank qualification"],
    cons: ["High legal and relationship risk", "Seller retains liability on the loan", "Lender can accelerate if discovered"],
  },
  {
    id: "jv-50-50",
    name: "JV Partnership — 50/50 Split",
    category: "partner",
    cashRequired: 40_000,
    downPaymentPct: 20,
    interestRate: 7.25,
    monthlyPayment: 2_183,
    monthlyCashFlow: -643,
    cashOnCash: -19.3,
    ltv: 80,
    dscr: 0.73,
    status: "borderline",
    signal: "hold",
    riskLevel: "moderate",
    plainEnglish: "Split everything 50/50 with a partner — capital, cash flow, decisions, and appreciation.",
    riskFactors: ["Partner disagreement risk — legal operating agreement required", "Cash flow still negative (your share: -$321/mo)", "Exit strategy misalignment risk"],
    pros: ["Halves your capital requirement to $40K", "Shared risk on negative cash flow", "Partner may bring deal flow or expertise"],
    cons: ["You give up 50% of appreciation", "Still cash flow negative per unit", "Partner conflicts are expensive"],
  },
  {
    id: "jv-equity-for-cash",
    name: "JV — Cash Partner + Active Partner",
    category: "partner",
    cashRequired: 0,
    downPaymentPct: 20,
    interestRate: 7.25,
    monthlyPayment: 2_183,
    monthlyCashFlow: -643,
    cashOnCash: 0,
    ltv: 80,
    dscr: 0.73,
    status: "qualified",
    signal: "hold",
    riskLevel: "moderate",
    plainEnglish: "Cash partner puts up 100% of capital. You manage. Profits split (typically 30/70 or pref return structure).",
    riskFactors: ["Cash partner typically wants preferred return — equity split is negotiated", "Management burden falls entirely on you", "Negative cash flow means partner funds shortfall"],
    pros: ["Zero cash out of pocket for the active partner", "Learn deal management on someone else's capital", "Scalable model for portfolio builders"],
    cons: ["Cash partner absorbs all downside risk initially", "Complex waterfall structures require legal docs", "Still a negative cash flow deal"],
  },
  {
    id: "lease-option",
    name: "Lease Option (Sandwich)",
    category: "creative",
    cashRequired: 5_000,
    downPaymentPct: 0,
    interestRate: 0,
    monthlyPayment: 2_200,
    monthlyCashFlow: 600,
    cashOnCash: 144.0,
    ltv: 0,
    dscr: 99,
    status: "qualified",
    signal: "buy",
    riskLevel: "moderate",
    plainEnglish: "Control the property with an option to buy. Sublease at a higher rent. Collect the spread.",
    riskFactors: ["Tenant-buyer must exercise their option or you lose the deal", "Seller can back out if contract isn't airtight", "Cash flow depends entirely on finding a quality tenant-buyer"],
    legalNotes: "Lease options require a separate option agreement and lease. Some states treat rent credits as mortgage payments — verify locally.",
    pros: ["Minimal capital required", "Positive cash flow from day one", "No mortgage qualification needed"],
    cons: ["No equity buildup unless option is exercised", "Highly dependent on tenant-buyer quality", "Legal complexity is high — attorney required"],
  },
  {
    id: "syndication-gp",
    name: "Syndication — GP Promote",
    category: "investors",
    cashRequired: 25_000,
    downPaymentPct: 30,
    interestRate: 7.25,
    monthlyPayment: 1_908,
    monthlyCashFlow: -368,
    cashOnCash: 22.1,
    ltv: 70,
    dscr: 0.85,
    status: "qualified",
    signal: "hold",
    riskLevel: "moderate",
    plainEnglish: "Raise capital from LPs. You put in 10% of the equity as GP, collect a 20-30% promote on profits.",
    riskFactors: ["Requires SEC compliance — 506(b) or 506(c) exemption", "GP must guarantee investor return before promote kicks in", "Syndication overhead: legal, reporting, investor relations"],
    legalNotes: "Syndications under Regulation D require an operating agreement, PPM, and subscription agreement. Consult a securities attorney.",
    pros: ["Massive leverage on your time and capital", "GP promote creates equity upside beyond your cash investment", "Scales to any size deal"],
    cons: ["High legal and compliance cost ($15-25K to launch)", "Single-family is rarely worth syndication overhead", "Investor relationships are long-term obligations"],
  },
  {
    id: "conventional-15",
    name: "Conventional 15yr — 20% Down",
    category: "solo",
    cashRequired: 80_000,
    downPaymentPct: 20,
    interestRate: 6.75,
    monthlyPayment: 2_833,
    monthlyCashFlow: -1_293,
    cashOnCash: -19.4,
    ltv: 80,
    dscr: 0.57,
    status: "disqualified",
    signal: "pass",
    disqualReason: "Higher monthly payment creates deeper negative cash flow than 30yr",
    riskLevel: "high",
    plainEnglish: "Faster payoff, lower rate, but the higher payment makes the monthly cash flow catastrophic.",
    riskFactors: ["Deepest negative cash flow of all structures", "Equity buildup faster but cash drain is severe", "No runway if vacancy hits"],
    pros: ["Fastest equity accumulation", "Lower rate than 30yr", "Property paid off in 15 years"],
    cons: ["Worst monthly cash flow", "Least flexibility if income drops", "Not viable for cash flow investing"],
  },
];

// ─── Funding Category Config ──────────────────────────────────────────────────

interface CategoryConfig {
  id: StructureCategory;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lucide icons are ForwardRefExoticComponent with wider props
  Icon: React.ComponentType<any>;
  tagline: string;
  description: string;
  borderClass: string;
  iconClass: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "solo",
    label: "Solo",
    Icon: Wallet,
    tagline: "Just me and a lender",
    description: "Conventional, DSCR, hard money, FHA — traditional bank financing paths.",
    borderClass: "border-gold/20 hover:border-gold/40",
    iconClass: "text-gold",
  },
  {
    id: "partner",
    label: "Partner",
    Icon: Handshake,
    tagline: "Me + one partner splitting",
    description: "50/50 JV, cash partner + active partner, equity-for-expertise arrangements.",
    borderClass: "border-emerald/20 hover:border-emerald/40",
    iconClass: "text-emerald",
  },
  {
    id: "investors",
    label: "Investors",
    Icon: Users,
    tagline: "Raising capital from LPs",
    description: "Syndication with GP promote, Reg D offerings, crowdfunding structures.",
    borderClass: "border-amber/20 hover:border-amber/40",
    iconClass: "text-amber",
  },
  {
    id: "creative",
    label: "Creative",
    Icon: Wrench,
    tagline: "Seller financing, sub-to, lease opt",
    description: "Subject-to, seller carry, lease option, BRRRR, and non-bank structures.",
    borderClass: "border-rose/20 hover:border-rose/40",
    iconClass: "text-rose",
  },
];

// ─── Sort config ──────────────────────────────────────────────────────────────

type SortKey = "cashOnCash" | "cashRequired" | "monthlyPayment" | "monthlyCashFlow" | "dscr";

const SORT_LABELS: Record<SortKey, string> = {
  cashOnCash: "CoC%",
  cashRequired: "Cash Needed",
  monthlyPayment: "Monthly Pmt",
  monthlyCashFlow: "Monthly CF",
  dscr: "DSCR",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signalBadge(signal: StructureSignal) {
  if (signal === "buy")  return <span className="badge-emerald">BUY</span>;
  if (signal === "hold") return <span className="badge-amber">HOLD</span>;
  return <span className="badge-rose">PASS</span>;
}

function riskBadge(level: StructureResult["riskLevel"]) {
  const map: Record<typeof level, string> = {
    low: "badge-emerald",
    moderate: "badge-gold",
    high: "badge-amber",
    "very-high": "badge-rose",
  };
  const labels: Record<typeof level, string> = {
    low: "Low Risk",
    moderate: "Moderate",
    high: "High Risk",
    "very-high": "Very High",
  };
  return <span className={map[level]}>{labels[level]}</span>;
}

function cocColor(coc: number): string {
  if (coc >= 8) return "text-emerald";
  if (coc >= 4) return "text-amber";
  return "text-rose";
}

function cfColor(cf: number): string {
  if (cf > 0) return "text-emerald";
  if (cf > -200) return "text-amber";
  return "text-rose";
}

// ─── FundingQuestion ──────────────────────────────────────────────────────────

export interface FundingQuestionProps {
  onSelect: (category: StructureCategory | null) => void;
  selected?: StructureCategory | null;
}

export function FundingQuestion({ onSelect, selected }: FundingQuestionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-content-primary font-display">
          How are you funding this deal?
        </h2>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          Pick a path to filter structures by category — or compare all at once.
        </p>
      </div>

      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        role="radiogroup"
        aria-label="Funding category"
      >
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(isActive ? null : cat.id)}
              className={[
                "card text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                "hover:bg-surface-elevated cursor-pointer",
                isActive
                  ? `${cat.borderClass} bg-surface-elevated`
                  : "border-surface-border",
              ].join(" ")}
            >
              <cat.Icon
                className={`w-5 h-5 mb-2 ${isActive ? cat.iconClass : "text-content-tertiary"}`}
                aria-hidden={true}
              />
              <p className={`text-[13px] font-semibold mb-0.5 ${isActive ? "text-content-primary" : "text-content-secondary"}`}>
                {cat.label}
              </p>
              <p className="text-[11px] text-content-tertiary leading-snug">
                {cat.tagline}
              </p>
              <p className="text-[11px] text-content-disabled mt-1.5 leading-snug hidden sm:block">
                {cat.description}
              </p>
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="btn-ghost text-xs"
          aria-label="Show all structures"
        >
          Show all structures
        </button>
      )}
    </div>
  );
}

// ─── Detail Panel (expanded row) ─────────────────────────────────────────────

function DetailPanel({ structure }: { structure: StructureResult }) {
  const panelId = useId();

  return (
    <motion.div
      key={panelId}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-surface-secondary border-t border-surface-border px-4 py-4 space-y-4">

        {/* Number breakdown row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Cash Required", value: formatCurrency(structure.cashRequired), sub: `${structure.downPaymentPct}% down` },
            { label: <Term id="ltv" value={structure.ltv}>LTV</Term>, value: `${structure.ltv}%`, sub: `${100 - structure.ltv}% equity at close` },
            { label: <Term id="dscr" value={structure.dscr}>DSCR</Term>, value: structure.dscr >= 99 ? "N/A" : `${structure.dscr.toFixed(2)}x`, sub: structure.dscr >= 1.25 ? "Lender-qualified" : structure.dscr >= 1.0 ? "Tight coverage" : "Below 1.0x" },
            { label: <Term id="coc" value={structure.cashOnCash}>Cash-on-Cash</Term>, value: structure.cashOnCash === 0 ? "N/A" : `${structure.cashOnCash.toFixed(1)}%`, sub: "Annual, Year 1" },
          ].map((item, i) => (
            <div key={i} className="card-glass !p-3">
              <div className="metric-label mb-1 text-[10px]">{item.label}</div>
              <div className="font-mono text-[15px] font-bold tabular-nums text-content-primary">
                {item.value}
              </div>
              <div className="text-[10px] text-content-disabled mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Disqualification reason */}
        {structure.status === "disqualified" && structure.disqualReason && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-rose/5 border border-rose/15">
            <XCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-rose leading-relaxed">{structure.disqualReason}</p>
          </div>
        )}

        {/* Plain English */}
        <div className="flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[13px] text-content-secondary leading-relaxed">
            {structure.plainEnglish}
          </p>
        </div>

        {/* Pros / Cons / Risks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="section-label mb-2">Pros</p>
            <ul className="space-y-1.5" role="list">
              {structure.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px]">
                  <CheckCircle className="w-3 h-3 text-emerald shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-content-secondary">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="section-label mb-2">Cons</p>
            <ul className="space-y-1.5" role="list">
              {structure.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px]">
                  <XCircle className="w-3 h-3 text-rose shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-content-secondary">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="section-label mb-2">Risk Factors</p>
            <ul className="space-y-1.5" role="list">
              {structure.riskFactors.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px]">
                  <AlertTriangle className="w-3 h-3 text-amber shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-content-secondary">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal note */}
        {structure.legalNotes && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber/5 border border-amber/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] text-amber leading-relaxed">{structure.legalNotes}</p>
          </div>
        )}

      </div>
    </motion.div>
  );
}

// ─── StructureComparison ──────────────────────────────────────────────────────

export interface StructureComparisonProps {
  results?: StructureResult[];
  selectedCategory?: StructureCategory | null;
  onSelectStructure?: (id: string) => void;
}

export function StructureComparison({
  results = SAMPLE_STRUCTURES,
  selectedCategory,
  onSelectStructure,
}: StructureComparisonProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("cashOnCash");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = selectedCategory
    ? results.filter((r) => r.category === selectedCategory)
    : results;

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * dir;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(key === "cashRequired" || key === "monthlyPayment");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    onSelectStructure?.(id);
  }

  function rowBg(status: StructureStatus): string {
    if (status === "qualified") return "hover:bg-emerald/[0.03]";
    if (status === "borderline") return "hover:bg-amber/[0.04]";
    return "opacity-60 hover:opacity-80 hover:bg-rose/[0.03]";
  }

  function SortButton({ col }: { col: SortKey }) {
    const active = sortKey === col;
    return (
      <button
        type="button"
        onClick={() => toggleSort(col)}
        aria-label={`Sort by ${SORT_LABELS[col]} ${active && !sortAsc ? "ascending" : "descending"}`}
        className="flex items-center gap-1 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded"
      >
        <span className={`section-label ${active ? "text-gold" : ""}`}>
          {SORT_LABELS[col]}
        </span>
        <ArrowUpDown
          className={`w-3 h-3 transition-colors ${active ? "text-gold" : "text-content-disabled group-hover:text-content-tertiary"}`}
          aria-hidden="true"
        />
      </button>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="card py-12 flex flex-col items-center gap-3 text-center">
        <Minus className="w-6 h-6 text-content-disabled" aria-hidden="true" />
        <p className="text-[13px] text-content-tertiary">No structures match this filter.</p>
        <p className="text-[12px] text-content-disabled">Select a different category or clear the filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="region" aria-label="Financing structure comparison">

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 pb-1">
        <div className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
          <div className="w-2 h-2 rounded-full bg-emerald" aria-hidden="true" />
          Qualified
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
          <div className="w-2 h-2 rounded-full bg-amber" aria-hidden="true" />
          Borderline
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
          <div className="w-2 h-2 rounded-full bg-rose" aria-hidden="true" />
          Disqualified
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden" role="table" aria-label="Financing structures ranked by return">

        {/* Header */}
        <div
          role="row"
          className="grid items-center gap-2 px-4 py-3 border-b border-surface-border bg-surface-secondary"
          style={{ gridTemplateColumns: "1fr 90px 100px 100px 70px 100px 80px 24px" }}
        >
          <div role="columnheader" className="section-label">Structure</div>
          <div role="columnheader"><SortButton col="cashRequired" /></div>
          <div role="columnheader"><SortButton col="monthlyPayment" /></div>
          <div role="columnheader"><SortButton col="monthlyCashFlow" /></div>
          <div role="columnheader"><SortButton col="cashOnCash" /></div>
          <div role="columnheader"><SortButton col="dscr" /></div>
          <div role="columnheader" className="section-label">Signal</div>
          <div role="columnheader" aria-label="Expand row" />
        </div>

        {/* Rows */}
        {sorted.map((s) => {
          const isExpanded = expandedId === s.id;
          const statusDot = s.status === "qualified"
            ? "bg-emerald"
            : s.status === "borderline"
            ? "bg-amber"
            : "bg-rose";

          return (
            <div key={s.id} role="rowgroup">
              <button
                type="button"
                role="row"
                aria-expanded={isExpanded}
                aria-label={`${s.name}. ${s.status}. Cash-on-cash: ${s.cashOnCash.toFixed(1)}%. Click to ${isExpanded ? "collapse" : "expand"} details.`}
                onClick={() => toggleExpand(s.id)}
                className={[
                  "w-full grid items-center gap-2 px-4 py-3 border-b border-surface-border/50 text-left",
                  "transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-gold/40",
                  rowBg(s.status),
                  isExpanded ? "bg-surface-secondary" : "",
                ].join(" ")}
                style={{ gridTemplateColumns: "1fr 90px 100px 100px 70px 100px 80px 24px" }}
              >
                {/* Name + status dot */}
                <div role="cell" className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`}
                    aria-hidden="true"
                  />
                  <span className="text-[12px] font-medium text-content-primary truncate">
                    {s.name}
                  </span>
                </div>

                {/* Cash required */}
                <div role="cell" className="font-mono text-[12px] tabular-nums text-content-secondary">
                  {formatCompact(s.cashRequired)}
                </div>

                {/* Monthly payment */}
                <div role="cell" className="font-mono text-[12px] tabular-nums text-content-secondary">
                  {formatCurrency(s.monthlyPayment)}
                </div>

                {/* Monthly CF */}
                <div
                  role="cell"
                  className={`font-mono text-[12px] tabular-nums font-semibold ${cfColor(s.monthlyCashFlow)}`}
                >
                  {s.monthlyCashFlow < 0
                    ? `(${formatCurrency(Math.abs(s.monthlyCashFlow))})`
                    : formatCurrency(s.monthlyCashFlow)
                  }
                </div>

                {/* CoC */}
                <div
                  role="cell"
                  className={`font-mono text-[12px] tabular-nums font-semibold ${cocColor(s.cashOnCash)}`}
                >
                  {s.cashOnCash === 0 ? "—" : `${s.cashOnCash.toFixed(1)}%`}
                </div>

                {/* DSCR */}
                <div role="cell">
                  {riskBadge(s.riskLevel)}
                </div>

                {/* Signal badge */}
                <div role="cell">
                  {signalBadge(s.signal)}
                </div>

                {/* Chevron */}
                <div role="cell" className="flex items-center justify-center" aria-hidden="true">
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-gold" />
                    : <ChevronDown className="w-3.5 h-3.5 text-content-disabled" />
                  }
                </div>
              </button>

              {/* Detail panel — AnimatePresence on the div wrapper, not tr/td */}
              <AnimatePresence>
                {isExpanded && <DetailPanel structure={s} />}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-2 pt-1 px-1">
        <Info className="w-3 h-3 text-content-disabled shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-content-disabled leading-relaxed">
          Sample data based on $400K purchase, $2,800/mo rent, 45% expense ratio.
          Connect real deal assumptions via the Simulator sliders.
          Not financial or legal advice.
        </p>
      </div>
    </div>
  );
}
