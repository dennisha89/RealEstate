"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ChevronRight,
  Flame,
  Snowflake,
  Landmark,
  Home,
  Hammer,
  RefreshCw,
  ArrowRight,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Mortgage helper ─────────────────────────────────────────────────────────

/** Standard 30-year fixed-rate mortgage payment (monthly P&I) */
function monthlyPI(principal: number, annualRatePct: number): number {
  const r = annualRatePct / 100 / 12;
  const n = 360;
  if (r === 0) return principal / n;
  return Math.round((principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1));
}

/** Monthly cash flow given rent, rate, price, downPct. Expenses = 45% of rent. */
function cashFlowAt(rent: number, annualRatePct: number, price: number, downPct: number): number {
  const loan = price * (1 - downPct / 100);
  const pi = monthlyPI(loan, annualRatePct);
  const expenses = Math.round(rent * 0.45);
  return rent - pi - expenses;
}

// ─── Offer price calculator ───────────────────────────────────────────────────

function suggestedOffer(listPrice: number, dom: number, avgDom: number): number {
  if (dom === 0 || avgDom === 0) return listPrice;
  const ratio = dom / avgDom;
  let discountPct: number;
  if (ratio >= 1.5) {
    discountPct = 0.065; // median of 5-8%
  } else if (ratio >= 1.0) {
    discountPct = 0.035; // median of 2-5%
  } else {
    discountPct = 0.02; // hot market: 2-3% below or ask
  }
  return Math.round(listPrice * (1 - discountPct) / 1000) * 1000;
}

function acceptanceProbability(dom: number, avgDom: number): number {
  if (avgDom === 0) return 65;
  const ratio = dom / avgDom;
  if (ratio >= 2.0) return 82;
  if (ratio >= 1.5) return 72;
  if (ratio >= 1.0) return 58;
  return 42; // seller has leverage
}

// ─── 1. NegotiationIntelligence ──────────────────────────────────────────────

interface NegotiationIntelligenceProps {
  dom: number;
  avgDomArea: number;
  listPrice: number;
  priceDrops: number;
}

export function NegotiationIntelligence({
  dom,
  avgDomArea,
  listPrice,
  priceDrops,
}: NegotiationIntelligenceProps) {
  const offer = suggestedOffer(listPrice, dom, avgDomArea);
  const savingsAmt = listPrice - offer;
  const savingsPct = ((savingsAmt / listPrice) * 100).toFixed(1);
  const acceptance = acceptanceProbability(dom, avgDomArea);
  const domRatio = avgDomArea > 0 ? dom / avgDomArea : 1;

  const domStatus =
    domRatio >= 1.5
      ? { label: "Stale listing — seller is motivated", color: "text-emerald-light", icon: <Flame className="w-3.5 h-3.5" aria-hidden="true" /> }
      : domRatio >= 1.0
      ? { label: "Sitting at market pace", color: "text-amber-light", icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" /> }
      : { label: "Moving faster than market — low leverage", color: "text-rose-light", icon: <Snowflake className="w-3.5 h-3.5" aria-hidden="true" /> };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card space-y-4"
    >
      <div className="flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-gold" aria-hidden="true" />
        <h3 className="section-label !text-gold">Negotiation Intelligence</h3>
      </div>

      {/* DOM comparison */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="metric-label mb-1">
            <Term id="dom">DOM</Term>
          </p>
          <p className="metric-value text-content-primary">{dom}</p>
          <p className="text-[10px] text-content-disabled mt-0.5">days listed</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="metric-label mb-1">Area Avg</p>
          <p className="metric-value text-content-secondary">{avgDomArea}</p>
          <p className="text-[10px] text-content-disabled mt-0.5">days avg</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="metric-label mb-1">vs Average</p>
          <p className={`metric-value ${domStatus.color}`}>
            {domRatio >= 1 ? "+" : ""}{((domRatio - 1) * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-content-disabled mt-0.5">longer</p>
        </div>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 text-[13px] font-medium ${domStatus.color}`}>
        {domStatus.icon}
        <span>{domStatus.label}</span>
      </div>

      {/* Price drop history */}
      {priceDrops > 0 && (
        <div className="flex items-start gap-2 bg-emerald-muted border border-emerald/20 rounded-lg px-3 py-2.5">
          <TrendingDown className="w-3.5 h-3.5 text-emerald-light mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[12px] text-emerald-light">
            Seller has already cut price{" "}
            <span className="font-mono font-semibold">{priceDrops}x</span>. They are motivated.
          </p>
        </div>
      )}

      {/* Offer suggestion */}
      <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
        <p className="section-label">Suggested Offer Strategy</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-content-tertiary mb-1">Offer at</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-gold">
              {formatCurrency(offer)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-content-tertiary mb-1">Saves</p>
            <p className="text-[15px] font-mono tabular-nums text-emerald-light">
              {formatCurrency(savingsAmt)} ({savingsPct}%)
            </p>
          </div>
        </div>
        <p className="text-[12px] text-content-secondary leading-relaxed">
          Properties listed{" "}
          <span className="text-content-primary font-medium">{dom} days</span> in this area
          accept offers {savingsPct}% below asking. Acceptance probability:{" "}
          <span className="font-mono font-semibold text-gold">{acceptance}%</span>.
        </p>
      </div>

      {/* Acceptance probability bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="metric-label">Acceptance Probability</p>
          <p className="font-mono text-[12px] text-gold">{acceptance}%</p>
        </div>
        <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold"
            style={{ width: `${acceptance}%` }}
            role="progressbar"
            aria-valuenow={acceptance}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Acceptance probability: ${acceptance}%`}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── 2. DueDiligenceChecklist ─────────────────────────────────────────────────

const BASE_ITEMS = [
  { id: "title", label: "Title search", why: "Reveals liens, encumbrances, or ownership disputes that could cost you the property." },
  { id: "inspection", label: "Home inspection", why: "A $400 inspection can surface $40,000 in hidden problems. Non-negotiable." },
  { id: "appraisal", label: "Appraisal", why: "Required by lenders. Confirms the property is worth what you're paying." },
  { id: "insurance", label: "Insurance quote", why: "Get quotes before you close. Some properties are uninsurable or cost-prohibitive to insure." },
  { id: "survey", label: "Survey", why: "Confirms property boundaries. Prevents neighbor disputes over encroachments." },
  { id: "hoa", label: "HOA review", why: "Review CC&Rs, financials, and meeting minutes. Look for special assessments coming." },
  { id: "tax", label: "Tax verification", why: "Verify current tax amounts. Reassessment after purchase can spike your costs significantly." },
];

const STRATEGY_ITEMS: Record<string, { id: string; label: string; why: string }[]> = {
  LTR: [
    { id: "rental-comps", label: "Rental comp verification", why: "Confirm rent estimates against actual recent leases — not Zillow estimates." },
    { id: "pm-interview", label: "Property management interview", why: "Get 3 quotes. A good PM is worth 8-10% of rent. A bad one costs far more." },
    { id: "tenant-setup", label: "Tenant screening setup", why: "Establish your screening criteria before you need them. Fair Housing compliance is mandatory." },
  ],
  STR: [
    { id: "str-regs", label: "STR regulation check", why: "Over 150 cities have banned or severely restricted short-term rentals. Check before you buy." },
    { id: "zoning", label: "Zoning verification", why: "STR use must be permitted in the specific zone. Check with the city planning department directly." },
    { id: "hoa-str", label: "HOA STR policy", why: "Many HOAs ban short-term rentals entirely. Violating this can result in fines and forced long-term tenancy." },
    { id: "furnishing", label: "Furnishing quote", why: "Budget $8,000-25,000 to furnish. Get an itemized quote before closing to confirm your numbers." },
  ],
  FLIP: [
    { id: "contractor-bids", label: "Contractor bids (3 minimum)", why: "One bid is not a number. Three bids reveal the real market rate and expose scope gaps." },
    { id: "scope", label: "Scope of work document", why: "Written scope prevents 'that wasn't included' disputes that kill flip profit margins." },
    { id: "permits", label: "Permit requirements", why: "Unpermitted work kills resale. Know what requires permits before you start — not after." },
    { id: "draws", label: "Draw schedule agreement", why: "Never pay a contractor 100% upfront. Draw schedules tied to milestones protect your capital." },
  ],
  BRRRR: [
    { id: "hard-money", label: "Hard money terms confirmed", why: "Lock in your acquisition financing before you make an offer. Rates and LTV vary wildly." },
    { id: "seasoning", label: "Seasoning period check", why: "Most conventional lenders require 6-12 months of ownership before a cash-out refi. Plan accordingly." },
    { id: "refi-preapproval", label: "Refi lender pre-approval", why: "Get a lender to underwrite your refi scenario based on the ARV. Don't assume you'll qualify." },
    { id: "arv-appraisal", label: "ARV appraisal prep", why: "Prepare a comp package for the appraiser. A well-supported ARV means a higher refi amount." },
  ],
};

interface DueDiligenceChecklistProps {
  strategy: string;
}

export function DueDiligenceChecklist({ strategy }: DueDiligenceChecklistProps) {
  const strategyKey = strategy.toUpperCase() as keyof typeof STRATEGY_ITEMS;
  const allItems = [...BASE_ITEMS, ...(STRATEGY_ITEMS[strategyKey] ?? [])];
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const progress = Math.round((checked.size / allItems.length) * 100);
  const strategyExtras = STRATEGY_ITEMS[strategyKey]?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="card space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCheck className="w-4 h-4 text-gold" aria-hidden="true" />
          <h3 className="section-label !text-gold">Due Diligence Checklist</h3>
        </div>
        <span className="font-mono text-[12px] text-content-secondary">
          {checked.size}/{allItems.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? CHART_COLORS.emerald : CHART_COLORS.gold,
            }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Due diligence ${progress}% complete`}
          />
        </div>
      </div>

      {/* Base items */}
      <div className="space-y-1">
        <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">
          All Strategies
        </p>
        {BASE_ITEMS.map((item) => (
          <CheckItem
            key={item.id}
            item={item}
            checked={checked.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>

      {/* Strategy-specific items */}
      {strategyExtras > 0 && (
        <div className="space-y-1 pt-2 border-t border-surface-border">
          <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">
            {strategyKey} — Specific
          </p>
          {(STRATEGY_ITEMS[strategyKey] ?? []).map((item) => (
            <CheckItem
              key={item.id}
              item={item}
              checked={checked.has(item.id)}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CheckItem({
  item,
  checked,
  onToggle,
}: {
  item: { id: string; label: string; why: string };
  checked: boolean;
  onToggle: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="group">
      <div className="flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-surface-elevated transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 rounded"
          aria-checked={checked}
          role="checkbox"
          aria-label={item.label}
        >
          {checked ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-light" aria-hidden="true" />
          ) : (
            <Circle className="w-4 h-4 text-content-disabled group-hover:text-content-tertiary" aria-hidden="true" />
          )}
        </button>
        <span
          className={`text-[13px] flex-1 ${checked ? "line-through text-content-disabled" : "text-content-secondary"}`}
        >
          {item.label}
        </span>
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="opacity-0 group-hover:opacity-100 text-content-disabled hover:text-content-tertiary transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 rounded"
          aria-label={`Why: ${item.label}`}
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      {showWhy && (
        <div className="ml-6 mr-2 mb-1 px-3 py-2 rounded-md bg-surface-secondary border border-surface-border">
          <p className="text-[11px] text-content-secondary leading-relaxed">{item.why}</p>
        </div>
      )}
    </div>
  );
}

// ─── 3. SensitivityHeatmap ────────────────────────────────────────────────────

interface SensitivityHeatmapProps {
  price: number;
  rent: number;
  rate: number;
  downPct: number;
}

export function SensitivityHeatmap({ price, rent, rate, downPct }: SensitivityHeatmapProps) {
  // 7 rate rows: rate-1.0 to rate+1.5 in 0.5 steps
  const rateSteps = [-1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0].map((d) =>
    Math.max(0.5, rate + d)
  );

  // 7 rent cols: rent*0.8 to rent*1.2 in roughly equal steps
  const rentSteps = useMemo(() => {
    const lo = Math.round(rent * 0.8);
    const hi = Math.round(rent * 1.2);
    const step = Math.round((hi - lo) / 6);
    return Array.from({ length: 7 }, (_, i) => lo + i * step);
  }, [rent]);

  // Pre-compute entire grid
  const grid = useMemo(
    () =>
      rateSteps.map((r) =>
        rentSteps.map((rentVal) => cashFlowAt(rentVal, r, price, downPct))
      ),
    [rateSteps, rentSteps, price, downPct]
  );

  // Find current cell (rate ≈ rate param, rent ≈ rent param)
  const currentRateIdx = rateSteps.findIndex((r) => Math.abs(r - rate) < 0.001);
  const currentRentIdx = rentSteps.findIndex((rv) => Math.abs(rv - rent) < 50);

  function cellColor(cf: number) {
    if (cf > 200) return CHART_COLORS.emerald;
    if (cf >= 0) return CHART_COLORS.gold;
    return CHART_COLORS.rose;
  }

  function cellBg(cf: number) {
    if (cf > 200) return "rgba(16,185,129,0.15)";
    if (cf >= 0) return "rgba(201,162,39,0.12)";
    return "rgba(239,68,68,0.15)";
  }

  // Break-even stats
  const breakEvenRate = rateSteps.find((r) => cashFlowAt(rent, r, price, downPct) < 0);
  const currentCF = cashFlowAt(rent, rate, price, downPct);
  const marginPct = breakEvenRate
    ? (((breakEvenRate - rate) / rate) * 100).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="card space-y-4"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-gold" aria-hidden="true" />
        <h3 className="section-label !text-gold">Sensitivity Heatmap</h3>
        <span className="text-[10px] text-content-disabled ml-auto">
          Rate vs Rent — monthly cash flow
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-content-tertiary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(16,185,129,0.3)" }} />
          <span>&gt;$200/mo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(201,162,39,0.25)" }} />
          <span>$0–200/mo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.3)" }} />
          <span>Negative</span>
        </div>
      </div>

      {/* Grid */}
      <div
        role="table"
        aria-label="Cash flow sensitivity grid: rows are interest rates, columns are monthly rent"
        className="overflow-x-auto"
      >
        <div className="min-w-[480px]">
          {/* Column headers */}
          <div role="row" className="flex items-center mb-1 pl-12">
            {rentSteps.map((rv) => (
              <div
                key={rv}
                role="columnheader"
                className="flex-1 text-center text-[9px] font-mono text-content-disabled"
              >
                {formatCompact(rv)}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {rateSteps.map((r, ri) => (
            <div key={ri} role="row" className="flex items-center mb-0.5">
              {/* Row header */}
              <div
                role="rowheader"
                className="w-12 shrink-0 text-[9px] font-mono text-content-disabled text-right pr-2"
              >
                {r.toFixed(1)}%
              </div>
              {rentSteps.map((rv, ci) => {
                const cf = grid[ri][ci];
                const isCurrent = ri === currentRateIdx && ci === currentRentIdx;
                return (
                  <div
                    key={ci}
                    role="cell"
                    className="flex-1 text-center py-1.5 rounded-sm mx-px text-[10px] font-mono tabular-nums transition-all"
                    style={{
                      backgroundColor: cellBg(cf),
                      color: cellColor(cf),
                      outline: isCurrent ? `2px solid ${CHART_COLORS.gold}` : "none",
                      outlineOffset: isCurrent ? "-1px" : "0",
                      fontWeight: isCurrent ? 700 : 400,
                    }}
                    aria-label={`Rate ${r.toFixed(1)}%, Rent ${formatCurrency(rv)}: cash flow ${cf >= 0 ? "+" : ""}${formatCurrency(cf)}/mo${isCurrent ? " (current)" : ""}`}
                  >
                    {cf >= 0 ? "+" : ""}{cf >= 1000 || cf <= -1000 ? formatCompact(cf) : cf.toFixed(0)}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Axis labels */}
          <div className="flex items-center mt-2 pl-12">
            <p className="flex-1 text-center text-[9px] text-content-disabled uppercase tracking-wider">
              Monthly Rent
            </p>
          </div>
        </div>
      </div>

      {/* Insight strip */}
      <div className="bg-surface-secondary rounded-lg px-3 py-2.5 space-y-1">
        <p className="text-[12px] text-content-secondary leading-relaxed">
          At <span className="font-mono font-semibold text-content-primary">{rate.toFixed(2)}%</span> rate
          and <span className="font-mono font-semibold text-content-primary">{formatCurrency(rent)}/mo</span> rent,
          cash flow is{" "}
          <span
            className={`font-mono font-semibold ${currentCF >= 200 ? "text-emerald-light" : currentCF >= 0 ? "text-amber-light" : "text-rose-light"}`}
          >
            {currentCF >= 0 ? "+" : ""}{formatCurrency(currentCF)}/mo
          </span>.
        </p>
        {breakEvenRate && marginPct && (
          <p className="text-[12px] text-content-secondary">
            Deal breaks even at{" "}
            <span className="font-mono font-semibold text-amber-light">{breakEvenRate.toFixed(1)}%</span> rate.
            You have <span className="font-mono font-semibold text-gold">{marginPct}% margin</span> before cash flow goes negative.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── 4. RedGreenFlags ─────────────────────────────────────────────────────────

interface RedGreenFlagsProps {
  result: AnalysisResult;
  floodZone?: boolean;
  crimeRisk?: string;
  hoaMonthly?: number;
  propertyAge?: number;
}

interface Flag {
  text: string;
  detail?: string;
}

export function RedGreenFlags({
  result,
  floodZone,
  crimeRisk,
  hoaMonthly = 0,
  propertyAge = 0,
}: RedGreenFlagsProps) {
  const cf = result.monthlyCashFlow;
  const dscr = result.dscr;
  const capRate = result.capRate;
  const grm = result.purchasePrice / (result.monthlyRent * 12);
  const onePercent = result.monthlyRent >= result.purchasePrice * 0.01;

  const green: Flag[] = [];
  const red: Flag[] = [];

  // Green
  if (cf > 0) green.push({ text: `Positive cash flow: ${formatCurrency(cf)}/mo`, detail: "Income exceeds all costs." });
  if (dscr > 1.25) green.push({ text: `DSCR ${dscr.toFixed(2)}x — comfortable debt coverage`, detail: "Lenders consider 1.25x the safe minimum." });
  if (capRate > 5.5) green.push({ text: `Cap rate ${capRate.toFixed(1)}% above market average`, detail: "Most institutional targets are 5-7%." });
  if (grm < 15) green.push({ text: `GRM ${grm.toFixed(1)} — passes quick screen`, detail: "Below 15 GRM is generally investor-friendly." });
  if (onePercent) green.push({ text: "1% rule passed", detail: `Rent (${formatCurrency(result.monthlyRent)}) ≥ 1% of price (${formatCurrency(result.purchasePrice * 0.01)}).` });
  if (result.verdict === "BUY") green.push({ text: "BUY signal — market signals bullish", detail: "Market structure and deal quality both aligned." });

  // Red
  if (floodZone) red.push({ text: "Flood zone — insurance +$1,200–2,400/yr", detail: "Flood insurance is separate from homeowners and required by lenders in high-risk zones." });
  if (crimeRisk === "high" || crimeRisk === "very high") red.push({ text: `${crimeRisk === "very high" ? "Very high" : "High"} crime area — affects tenant quality`, detail: "High crime correlates with higher vacancy, lower rents, and greater property damage." });
  if (hoaMonthly > 200) red.push({ text: `HOA $${hoaMonthly}/mo — eats into cash flow`, detail: "HOA fees reduce effective cash flow dollar-for-dollar. Budget these in your underwriting." });
  if (cf < 0) red.push({ text: `Negative cash flow: ${formatCurrency(cf)}/mo`, detail: "You pay to hold this property every month. Factor in vacancy and it gets worse." });
  if (dscr < 1.0) red.push({ text: `DSCR ${dscr.toFixed(2)}x — income doesn't cover debt`, detail: "Below 1.0x means rental income is insufficient to service the loan." });
  if (propertyAge > 30) red.push({ text: `Property ${propertyAge} yrs old — expect major repairs`, detail: "Roof (20-25yr), HVAC (15-20yr), plumbing, and electrical may need imminent replacement." });

  const totalFlags = green.length + red.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="card space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gold" aria-hidden="true" />
          <h3 className="section-label !text-gold">Deal Flags</h3>
        </div>
        <span className="text-[11px] text-content-disabled font-mono">
          <span className="text-emerald-light">{green.length} green</span>
          {" · "}
          <span className="text-rose-light">{red.length} red</span>
          {totalFlags > 0 ? ` · ${totalFlags} total` : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Green flags */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-light">
            Confirms the Deal
          </p>
          {green.length === 0 && (
            <p className="text-[12px] text-content-disabled italic">No green flags identified.</p>
          )}
          {green.map((flag, i) => (
            <FlagRow key={i} flag={flag} variant="green" />
          ))}
        </div>

        {/* Red flags */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-light">
            Risks &amp; Deal Breakers
          </p>
          {red.length === 0 && (
            <p className="text-[12px] text-content-disabled italic">No red flags identified.</p>
          )}
          {red.map((flag, i) => (
            <FlagRow key={i} flag={flag} variant="red" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function FlagRow({ flag, variant }: { flag: Flag; variant: "green" | "red" }) {
  const [open, setOpen] = useState(false);
  const isGreen = variant === "green";

  return (
    <div
      className={`rounded-lg px-3 py-2 border ${
        isGreen
          ? "bg-emerald-muted border-emerald/20"
          : "bg-rose-muted border-rose/20"
      }`}
    >
      <button
        type="button"
        className="w-full flex items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 rounded"
        onClick={() => flag.detail && setOpen((v) => !v)}
        aria-expanded={flag.detail ? open : undefined}
      >
        {isGreen ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-light mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-light mt-0.5 shrink-0" aria-hidden="true" />
        )}
        <span className={`text-[12px] font-medium ${isGreen ? "text-emerald-light" : "text-rose-light"}`}>
          {flag.text}
        </span>
      </button>
      {open && flag.detail && (
        <p className="mt-1.5 ml-5 text-[11px] text-content-secondary leading-relaxed">
          {flag.detail}
        </p>
      )}
    </div>
  );
}

// ─── 5. FinancingMatrix ───────────────────────────────────────────────────────

interface FinancingMatrixProps {
  price: number;
  rent: number;
  noi: number;
}

interface LoanProduct {
  name: string;
  ratePct: number;
  downPct: number;
  ownerOccupied?: boolean;
  veteran?: boolean;
  minDscr?: number;
  maxTermMonths?: number;
  note?: string;
}

const LOAN_PRODUCTS: LoanProduct[] = [
  { name: "Conventional", ratePct: 6.95, downPct: 20 },
  { name: "FHA", ratePct: 6.65, downPct: 3.5, ownerOccupied: true },
  { name: "VA", ratePct: 6.45, downPct: 0, veteran: true },
  { name: "DSCR", ratePct: 7.85, downPct: 25, minDscr: 1.2 },
  { name: "Hard Money", ratePct: 11.5, downPct: 20, maxTermMonths: 18, note: "12-18mo term, refi required" },
];

export function FinancingMatrix({ price, rent, noi }: FinancingMatrixProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="card space-y-4"
    >
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-gold" aria-hidden="true" />
        <h3 className="section-label !text-gold">Financing Matrix</h3>
        <span className="text-[10px] text-content-disabled ml-auto">Representative rates · verify with lender</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[540px]" aria-label="Financing product comparison">
          <thead>
            <tr className="border-b border-surface-border">
              {["Product", "Rate", "Down", "Max Loan", "Mo. P&I", "Qualifies", "Why / Why Not"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="pb-2 text-left text-[10px] uppercase tracking-wider text-content-disabled font-medium pr-3 last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOAN_PRODUCTS.map((product) => {
              const loanAmt = Math.round(price * (1 - product.downPct / 100));
              const pi = monthlyPI(loanAmt, product.ratePct);
              const annualDebtService = pi * 12;
              const dscrCalc = annualDebtService > 0 ? noi / annualDebtService : 0;

              let qualifies: "yes" | "no" | "maybe" = "yes";
              let reason = "Standard qualification";

              if (product.ownerOccupied) {
                qualifies = "no";
                reason = "Owner-occupied only — not for investment";
              } else if (product.veteran) {
                qualifies = "maybe";
                reason = "Must be eligible veteran — confirm status";
              } else if (product.minDscr && dscrCalc < product.minDscr) {
                qualifies = "no";
                reason = `DSCR ${dscrCalc.toFixed(2)}x — need ${product.minDscr.toFixed(2)}x minimum`;
              } else if (product.maxTermMonths) {
                qualifies = "yes";
                reason = product.note ?? "Short-term bridge — plan your exit";
              }

              return (
                <tr key={product.name} className="border-b border-surface-border/50 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-content-primary">{product.name}</td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-content-secondary">
                    {product.ratePct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-content-secondary">
                    {product.downPct}%
                  </td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-content-secondary">
                    {formatCompact(loanAmt)}
                  </td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-content-secondary">
                    {formatCurrency(pi)}/mo
                  </td>
                  <td className="py-2.5 pr-3">
                    {qualifies === "yes" && (
                      <span className="badge-emerald flex items-center gap-1 w-fit" aria-label="Qualifies">
                        <TrendingUp className="w-3 h-3" aria-hidden="true" />
                        Yes
                      </span>
                    )}
                    {qualifies === "no" && (
                      <span className="badge-rose flex items-center gap-1 w-fit" aria-label="Does not qualify">
                        <TrendingDown className="w-3 h-3" aria-hidden="true" />
                        No
                      </span>
                    )}
                    {qualifies === "maybe" && (
                      <span className="badge-amber flex items-center gap-1 w-fit" aria-label="Eligibility varies">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        Check
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-[11px] text-content-tertiary leading-tight max-w-[180px]">
                    {reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DSCR callout */}
      <div className="text-[11px] text-content-disabled bg-surface-secondary rounded-lg px-3 py-2">
        DSCR = <span className="font-mono">NOI ÷ Annual Debt Service</span>. NOI used here: {formatCurrency(noi)}/yr.
        Rates are illustrative — lock with your lender before making offers.
      </div>
    </motion.div>
  );
}

// ─── 6. OfferToCloseTimeline ──────────────────────────────────────────────────

interface Milestone {
  label: string;
  dayRange: string;
  note: string;
  strategy?: string[];
}

const BASE_MILESTONES: Milestone[] = [
  { label: "Submit Offer", dayRange: "Day 0", note: "Include earnest money amount and contingencies." },
  { label: "Negotiation", dayRange: "Day 1–3", note: "Counter-offers, inspection contingency, closing date." },
  { label: "Under Contract", dayRange: "Day 5–7", note: "Earnest money wired. Due diligence clock starts." },
  { label: "Home Inspection", dayRange: "Day 7–10", note: "Hire an independent inspector. Never skip this." },
  { label: "Appraisal", dayRange: "Day 14–21", note: "Lender orders appraisal. Required for all financed purchases." },
  { label: "Loan Processing", dayRange: "Day 21–28", note: "Underwriting reviews docs. Expect document requests." },
  { label: "Clear to Close", dayRange: "Day 30–35", note: "Final walkthrough. Wire transfer instructions verified." },
  { label: "Close + Keys", dayRange: "Day 35–45", note: "Sign docs. Fund. You own it." },
];

const STRATEGY_MILESTONES: Record<string, Milestone[]> = {
  FLIP: [
    { label: "Rehab Begins", dayRange: "Day 45", note: "Scope locked. GC mobilizes. Permits pulled.", strategy: ["FLIP"] },
    { label: "Rehab Complete", dayRange: "Day 100–135", note: "Final walkthrough. Stage for photos.", strategy: ["FLIP"] },
    { label: "List for Sale", dayRange: "Day 140", note: "MLS live. Marketing launched.", strategy: ["FLIP"] },
    { label: "Flip Close", dayRange: "Day 165–175", note: "Buyer closes. Profit realized.", strategy: ["FLIP"] },
  ],
  BRRRR: [
    { label: "Rehab Begins", dayRange: "Day 45", note: "Scope locked. Hard money funds draw schedule.", strategy: ["BRRRR"] },
    { label: "Rehab Complete", dayRange: "Day 100–135", note: "Property stabilized. Tenant marketing starts.", strategy: ["BRRRR"] },
    { label: "Tenant Placed", dayRange: "Day 140", note: "Lease signed. Rent collections begin.", strategy: ["BRRRR"] },
    { label: "Refinance", dayRange: "Day 180+", note: "6-12mo seasoning required. Cash-out refi based on ARV.", strategy: ["BRRRR"] },
  ],
};

interface OfferToCloseTimelineProps {
  strategy: string;
}

export function OfferToCloseTimeline({ strategy }: OfferToCloseTimelineProps) {
  const strategyKey = strategy.toUpperCase() as keyof typeof STRATEGY_MILESTONES;
  const allMilestones = [
    ...BASE_MILESTONES,
    ...(STRATEGY_MILESTONES[strategyKey] ?? []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="card space-y-4"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gold" aria-hidden="true" />
        <h3 className="section-label !text-gold">Offer-to-Close Timeline</h3>
        {strategyKey in STRATEGY_MILESTONES && (
          <span className="badge-gold ml-auto">{strategyKey}</span>
        )}
      </div>

      {/* Desktop: horizontal */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="flex items-start gap-0 min-w-max pb-2">
          {allMilestones.map((m, i) => {
            const isStrategyMilestone = !!m.strategy;
            const isLast = i === allMilestones.length - 1;
            return (
              <div key={i} className="flex items-start">
                <div className="flex flex-col items-center w-28">
                  {/* Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                      isStrategyMilestone
                        ? "bg-gold-muted border-gold/60"
                        : "bg-surface-secondary border-surface-border"
                    }`}
                    aria-hidden="true"
                  >
                    <span className={`text-[9px] font-bold ${isStrategyMilestone ? "text-gold" : "text-content-tertiary"}`}>
                      {i + 1}
                    </span>
                  </div>
                  {/* Label */}
                  <p className={`text-[10px] font-semibold text-center mt-1.5 leading-tight ${isStrategyMilestone ? "text-gold" : "text-content-primary"}`}>
                    {m.label}
                  </p>
                  <p className="text-[9px] font-mono text-content-disabled text-center mt-0.5">
                    {m.dayRange}
                  </p>
                  <p className="text-[9px] text-content-tertiary text-center mt-1 leading-tight max-w-[104px]">
                    {m.note}
                  </p>
                </div>
                {/* Connector */}
                {!isLast && (
                  <div className="flex items-center mt-4 -mx-1">
                    <ArrowRight
                      className={`w-3.5 h-3.5 shrink-0 ${isStrategyMilestone ? "text-gold/60" : "text-content-disabled"}`}
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical */}
      <ol className="sm:hidden space-y-3" aria-label="Offer-to-close timeline">
        {allMilestones.map((m, i) => {
          const isStrategyMilestone = !!m.strategy;
          return (
            <li key={i} className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                  isStrategyMilestone
                    ? "bg-gold-muted border-gold/60"
                    : "bg-surface-secondary border-surface-border"
                }`}
                aria-hidden="true"
              >
                <span className={`text-[8px] font-bold ${isStrategyMilestone ? "text-gold" : "text-content-tertiary"}`}>
                  {i + 1}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <p className={`text-[12px] font-semibold ${isStrategyMilestone ? "text-gold" : "text-content-primary"}`}>
                    {m.label}
                  </p>
                  <p className="text-[9px] font-mono text-content-disabled">{m.dayRange}</p>
                </div>
                <p className="text-[11px] text-content-tertiary leading-snug mt-0.5">{m.note}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}

// ─── 7. SimilarDeals ──────────────────────────────────────────────────────────

interface SimilarDealsProps {
  address: string;
  price: number;
  strategy: string;
}

interface SimilarDeal {
  address: string;
  closeDate: string;
  purchasePrice: number;
  currentValue: number;
  returnPct: number;
  strategy: string;
}

/** Deterministic PRNG — same seed always produces the same sequence */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const STREET_NAMES = ["Maple", "Oak", "Elm", "Cedar", "Pine", "Birch", "Walnut", "Ash", "Willow", "Laurel"];
const STREET_TYPES = ["St", "Ave", "Dr", "Ln", "Blvd", "Ct"];

function generateSimilarDeals(address: string, price: number, strategy: string): SimilarDeal[] {
  const rng = mulberry32(hashString(address + strategy));
  const now = new Date();
  const results: SimilarDeal[] = [];

  for (let i = 0; i < 3; i++) {
    const streetNum = Math.floor(rng() * 9900) + 100;
    const streetName = STREET_NAMES[Math.floor(rng() * STREET_NAMES.length)];
    const streetType = STREET_TYPES[Math.floor(rng() * STREET_TYPES.length)];

    const monthsAgo = Math.floor(rng() * 18) + 3;
    const closeDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(rng() * 28) + 1);
    const closeDateStr = closeDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    const priceDelta = (rng() - 0.35) * 0.25; // -8.75% to +16.25% of price
    const purchasePrice = Math.round((price * (1 + priceDelta)) / 5000) * 5000;

    const annualAppreciation = 0.04 + rng() * 0.08; // 4-12% annual
    const yearsHeld = monthsAgo / 12;
    const currentValue = Math.round((purchasePrice * Math.pow(1 + annualAppreciation, yearsHeld)) / 1000) * 1000;
    const returnPct = parseFloat((((currentValue - purchasePrice) / purchasePrice) * 100).toFixed(1));

    results.push({
      address: `${streetNum} ${streetName} ${streetType}`,
      closeDate: closeDateStr,
      purchasePrice,
      currentValue,
      returnPct,
      strategy,
    });
  }

  return results;
}

export function SimilarDeals({ address, price, strategy }: SimilarDealsProps) {
  const deals = useMemo(
    () => generateSimilarDeals(address, price, strategy),
    [address, price, strategy]
  );

  const avgReturn = parseFloat(
    (deals.reduce((sum, d) => sum + d.returnPct, 0) / deals.length).toFixed(1)
  );
  const strategyUpper = strategy.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="card space-y-4"
    >
      <div className="flex items-center gap-2">
        <Home className="w-4 h-4 text-gold" aria-hidden="true" />
        <h3 className="section-label !text-gold">Similar Deals in Area</h3>
        <span className="ml-auto text-[10px] text-content-disabled">Demo data · illustrative</span>
      </div>

      {/* Summary bar */}
      <div className="bg-surface-secondary rounded-lg px-3 py-2.5">
        <p className="text-[12px] text-content-secondary">
          3 similar{" "}
          <span className="font-medium text-content-primary">{strategyUpper}</span> deals in this ZIP averaged{" "}
          <span className="font-mono font-semibold text-emerald-light">{avgReturn}% total return</span> over the past 18 months.
        </p>
      </div>

      {/* Deals table */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-[12px] min-w-[440px]"
          aria-label="Similar deals closed in the area"
        >
          <thead>
            <tr className="border-b border-surface-border">
              {["Address", "Closed", "Bought", "Est. Now", "Return"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="pb-2 text-left text-[10px] uppercase tracking-wider text-content-disabled font-medium pr-4 last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => (
              <tr key={i} className="border-b border-surface-border/50 last:border-0">
                <td className="py-2.5 pr-4 text-content-primary font-medium truncate max-w-[140px]">
                  {deal.address}
                </td>
                <td className="py-2.5 pr-4 text-content-secondary font-mono tabular-nums">
                  {deal.closeDate}
                </td>
                <td className="py-2.5 pr-4 text-content-secondary font-mono tabular-nums">
                  {formatCompact(deal.purchasePrice)}
                </td>
                <td className="py-2.5 pr-4 text-content-secondary font-mono tabular-nums">
                  {formatCompact(deal.currentValue)}
                </td>
                <td className="py-2.5">
                  <span
                    className={`font-mono tabular-nums font-semibold flex items-center gap-1 ${
                      deal.returnPct > 0 ? "text-emerald-light" : "text-rose-light"
                    }`}
                    aria-label={`${deal.returnPct > 0 ? "positive" : "negative"} return of ${deal.returnPct}%`}
                  >
                    {deal.returnPct > 0 ? (
                      <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3 h-3" aria-hidden="true" />
                    )}
                    {deal.returnPct > 0 ? "+" : ""}{deal.returnPct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-content-disabled leading-relaxed">
        Addresses are illustrative. Real comps powered by ATTOM Data in production.
      </p>
    </motion.div>
  );
}
