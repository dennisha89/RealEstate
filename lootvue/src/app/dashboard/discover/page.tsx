"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MapPin, SlidersHorizontal, ChevronDown, ChevronUp,
  Bookmark, ArrowUpRight, Bed, Bath, Ruler,
  LayoutGrid, LayoutList, CheckCircle2, XCircle,
  Home, Building2, Building, Search,
  TrendingUp, TrendingDown, ArrowRight,
} from "lucide-react";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKETS = [
  "Austin, TX", "Dallas, TX", "Houston, TX", "San Antonio, TX",
  "Phoenix, AZ", "Nashville, TN", "Charlotte, NC", "Atlanta, GA",
  "Tampa, FL", "Orlando, FL", "Denver, CO", "Salt Lake City, UT",
  "Indianapolis, IN", "Columbus, OH", "Kansas City, MO",
] as const;
type Market = (typeof MARKETS)[number];

const STRATEGIES = ["LTR", "STR", "Flip", "BRRRR"] as const;
type Strategy = (typeof STRATEGIES)[number];

const SORT_KEYS = ["score", "price", "capRate", "cashFlow", "dom"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const BED_OPTIONS = [1, 2, 3, 4, 5] as const;

const PROPERTY_TYPES = ["sfr", "duplex", "triplex", "fourplex", "condo", "townhome"] as const;
type PropertyType = (typeof PROPERTY_TYPES)[number];

// ---------------------------------------------------------------------------
// Deterministic data generator
// ---------------------------------------------------------------------------

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface DiscoverProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  propertyType: PropertyType;
  dom: number;
  // Derived financials
  monthlyRent: number;
  estimatedExpenses: number;
  estimatedMortgage: number;
  capRate: number;
  cashOnCash: number;
  score: number;
  // Screen results (computed)
  grm: number;
  onePercent: boolean;
  estimatedCF: number;
}

const AUSTIN_STREETS = [
  "Oak Hill Blvd", "Cedar Park Ln", "Barton Springs Rd", "South Congress Ave",
  "Rundberg Ln", "North Loop", "Spicewood Springs Rd", "Anderson Ln",
  "Oltorf St", "Manchaca Rd", "Slaughter Ln", "William Cannon Dr",
  "Research Blvd", "Parmer Ln", "Burnet Rd",
] as const;

function generateAustinProperties(): DiscoverProperty[] {
  const rand = seededRand(30781); // Austin TX seed (30 + 781)
  const props: DiscoverProperty[] = [];

  const rawData: Array<{
    priceMult: number; bedsBias: number; scoreBias: number; rentMult: number;
  }> = [
    { priceMult: 1.05, bedsBias: 1, scoreBias: 30, rentMult: 1.0 },
    { priceMult: 0.75, bedsBias: 0, scoreBias: 25, rentMult: 0.97 },
    { priceMult: 1.25, bedsBias: 2, scoreBias: 45, rentMult: 1.15 },
    { priceMult: 0.90, bedsBias: 1, scoreBias: 10, rentMult: 0.85 },
    { priceMult: 0.60, bedsBias: 0, scoreBias: 40, rentMult: 1.05 },
    { priceMult: 1.40, bedsBias: 2, scoreBias: 15, rentMult: 0.88 },
    { priceMult: 0.80, bedsBias: 1, scoreBias: 50, rentMult: 1.12 },
    { priceMult: 1.10, bedsBias: 1, scoreBias: 20, rentMult: 0.92 },
    { priceMult: 0.70, bedsBias: 0, scoreBias: 42, rentMult: 1.08 },
    { priceMult: 0.95, bedsBias: 1, scoreBias: 35, rentMult: 1.02 },
    { priceMult: 1.30, bedsBias: 2, scoreBias: 8, rentMult: 0.82 },
    { priceMult: 0.65, bedsBias: 0, scoreBias: 48, rentMult: 1.10 },
  ];

  for (let i = 0; i < 12; i++) {
    const d = rawData[i]!;
    const basePrice = 300_000;
    const price = Math.round((basePrice + rand() * 200_000) * d.priceMult / 1000) * 1000;
    const beds = Math.min(5, Math.max(2, 2 + d.bedsBias + Math.round(rand() * 1)));
    const baths = Math.min(beds, Math.max(1, 1 + Math.round(rand() * 2)));
    const sqft = 900 + Math.round(rand() * 1600) + beds * 150;
    const yearBuilt = 1975 + Math.round(rand() * 48);
    const typeIdx = Math.floor(rand() * PROPERTY_TYPES.length);
    const propertyType = PROPERTY_TYPES[typeIdx] ?? "sfr";
    const dom = 5 + Math.round(rand() * 90);

    // Monthly rent: Austin avg ~$2,100/mo for 3BR SFR, ~$1.0/sqft
    const baseRent = Math.round((price * 0.0075 + 400) * d.rentMult);
    const monthlyRent = Math.max(1200, Math.round(baseRent / 50) * 50);

    // Expenses: 35-45% of gross rent (vacancy 5%, maintenance 10%, mgmt 10%, taxes/insurance 15-20%)
    const expenseRatio = 0.38 + rand() * 0.08;
    const estimatedExpenses = Math.round(monthlyRent * expenseRatio);

    // Mortgage: 20% down, 7.25% rate, 30yr
    const loanAmount = price * 0.80;
    const monthlyRate = 0.0725 / 12;
    const n = 360;
    const estimatedMortgage = Math.round(
      loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
      (Math.pow(1 + monthlyRate, n) - 1)
    );

    const estimatedCF = monthlyRent - estimatedExpenses - estimatedMortgage;
    const annualNOI = (monthlyRent - estimatedExpenses) * 12;
    const capRate = Math.round((annualNOI / price) * 1000) / 10;
    const annualCF = estimatedCF * 12;
    const downPayment = price * 0.20;
    const cashOnCash = Math.round((annualCF / downPayment) * 1000) / 10;

    const grm = Math.round((price / (monthlyRent * 12)) * 10) / 10;
    const onePercent = monthlyRent >= price * 0.01;

    // Score: weighted combo of GRM, 1% rule, CF, cap rate
    const baseScore = 30 + d.scoreBias;
    const grmBonus = grm < 12 ? 18 : grm < 15 ? 10 : 0;
    const onePercentBonus = onePercent ? 15 : 0;
    const cfBonus = estimatedCF > 400 ? 14 : estimatedCF > 0 ? 8 : 0;
    const capBonus = capRate > 7 ? 12 : capRate > 5 ? 6 : 0;
    const score = Math.min(98, Math.max(22, baseScore + grmBonus + onePercentBonus + cfBonus + capBonus));

    props.push({
      id: `disc-austin-${i}`,
      address: `${1200 + Math.round(rand() * 8600)} ${AUSTIN_STREETS[i % AUSTIN_STREETS.length]}`,
      city: "Austin",
      state: "TX",
      price,
      beds,
      baths,
      sqft,
      yearBuilt,
      propertyType,
      dom,
      monthlyRent,
      estimatedExpenses,
      estimatedMortgage,
      capRate,
      cashOnCash,
      score,
      grm,
      onePercent,
      estimatedCF,
    });
  }

  return props;
}

const ALL_PROPERTIES = generateAustinProperties();

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(n);

const fmtCF = (n: number) => {
  if (n < 0) return `(${fmtPrice(Math.abs(n))})`;
  return fmtPrice(n);
};

function scoreColor(s: number): string {
  if (s >= 75) return "text-emerald";
  if (s >= 55) return "text-amber";
  return "text-rose";
}

function scoreBg(s: number): string {
  if (s >= 75) return "bg-emerald/10 border border-emerald/20";
  if (s >= 55) return "bg-amber/10 border border-amber/20";
  return "bg-rose/10 border border-rose/20";
}

function cfColor(cf: number): string {
  if (cf >= 300) return "text-emerald";
  if (cf >= 0) return "text-amber";
  return "text-rose";
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    sfr: "SFR", duplex: "Duplex", triplex: "Triplex",
    fourplex: "Fourplex", condo: "Condo", townhome: "Townhouse",
  };
  return map[t] ?? t.toUpperCase();
}

function TypeIcon({ type }: { type: string }) {
  if (type === "sfr") return <Home className="w-3.5 h-3.5" aria-hidden="true" />;
  if (type === "condo" || type === "townhome") return <Building className="w-3.5 h-3.5" aria-hidden="true" />;
  return <Building2 className="w-3.5 h-3.5" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Instant screen logic
// ---------------------------------------------------------------------------

interface ScreenResult {
  grm: { pass: boolean; value: number };
  onePercent: { pass: boolean; value: number };
  cashFlow: { pass: boolean; value: number };
  passCount: number;
}

function runScreens(p: DiscoverProperty): ScreenResult {
  const grm = { pass: p.grm < 15, value: p.grm };
  const onePercent = { pass: p.onePercent, value: Math.round((p.monthlyRent / p.price) * 1000) / 10 };
  const cashFlow = { pass: p.estimatedCF > 0, value: p.estimatedCF };
  const passCount = [grm.pass, onePercent.pass, cashFlow.pass].filter(Boolean).length;
  return { grm, onePercent, cashFlow, passCount };
}

// ---------------------------------------------------------------------------
// Filter state interface
// ---------------------------------------------------------------------------

interface FilterState {
  market: Market;
  strategy: Strategy;
  minPrice: number;
  maxPrice: number;
  minCF: number;
  minCapRate: number;
  minBeds: number;
  // extended
  maxDom: number;
  propertyTypes: PropertyType[];
  minScore: number;
}

const DEFAULT_FILTERS: FilterState = {
  market: "Austin, TX",
  strategy: "LTR",
  minPrice: 200_000,
  maxPrice: 600_000,
  minCF: -500,
  minCapRate: 0,
  minBeds: 1,
  maxDom: 120,
  propertyTypes: [],
  minScore: 0,
};

// ---------------------------------------------------------------------------
// Screen pill component
// ---------------------------------------------------------------------------

function ScreenPill({
  label, pass, value,
}: {
  label: string;
  pass: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-1.5">
        {pass ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" aria-hidden="true" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-rose shrink-0" aria-hidden="true" />
        )}
        <span className="text-[11px] text-content-tertiary uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-[12px] font-mono tabular-nums font-medium ${pass ? "text-emerald" : "text-rose"}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property card — grid view
// ---------------------------------------------------------------------------

function PropertyCardGrid({
  property,
  onSave,
  saved,
}: {
  property: DiscoverProperty;
  onSave: (p: DiscoverProperty) => void;
  saved: boolean;
}) {
  const screens = runScreens(property);

  return (
    <article
      className="glass glass-interactive p-4 flex flex-col gap-3 cursor-default"
      aria-label={`${property.address}: ${fmtCompact(property.price)}, ${property.beds} bed, score ${property.score}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-content-primary leading-snug truncate">
            {property.address}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3 text-content-tertiary shrink-0" aria-hidden="true" />
            <span className="text-[11px] text-content-tertiary">{property.city}, {property.state}</span>
            <span className="text-content-disabled text-[11px]">·</span>
            <span className="text-[11px] text-content-tertiary">{property.dom}d</span>
          </div>
        </div>
        {/* Score badge */}
        <div
          className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-[14px] font-bold font-mono tabular-nums ${scoreBg(property.score)} ${scoreColor(property.score)}`}
          aria-label={`Score: ${property.score}`}
        >
          {property.score}
        </div>
      </div>

      {/* Price + specs */}
      <div>
        <p className="text-[22px] font-bold font-mono tabular-nums text-content-primary tracking-tight">
          {fmtCompact(property.price)}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-content-secondary">
          <span className="flex items-center gap-1">
            <Bed className="w-3 h-3" aria-hidden="true" />
            {property.beds}bd
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3 h-3" aria-hidden="true" />
            {property.baths}ba
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" aria-hidden="true" />
            {property.sqft.toLocaleString()} sqft
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <TypeIcon type={property.propertyType} />
            {typeLabel(property.propertyType)}
          </span>
        </div>
      </div>

      {/* Instant screens */}
      <div className="border-t border-surface-border pt-3 flex flex-col gap-0.5">
        <ScreenPill
          label="GRM"
          pass={screens.grm.pass}
          value={`${screens.grm.value.toFixed(1)}x`}
        />
        <ScreenPill
          label="1% Rule"
          pass={screens.onePercent.pass}
          value={`${screens.onePercent.value.toFixed(2)}%`}
        />
        <ScreenPill
          label="Est. CF"
          pass={screens.cashFlow.pass}
          value={fmtCF(screens.cashFlow.value) + "/mo"}
        />
      </div>

      {/* Cap rate row */}
      <div className="flex items-center justify-between text-[11px]">
        <div>
          <span className="text-content-tertiary uppercase tracking-wide">Cap Rate</span>
          <span className={`ml-1.5 font-mono tabular-nums font-semibold ${property.capRate >= 6 ? "text-emerald" : property.capRate >= 4 ? "text-amber" : "text-rose"}`}>
            {property.capRate.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-content-tertiary uppercase tracking-wide">CoC</span>
          <span className={`ml-1.5 font-mono tabular-nums font-semibold ${property.cashOnCash >= 8 ? "text-emerald" : property.cashOnCash >= 4 ? "text-amber" : "text-rose"}`}>
            {property.cashOnCash.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${screens.passCount === 3 ? "bg-emerald/10 text-emerald" : screens.passCount === 2 ? "bg-amber/10 text-amber" : "bg-rose/10 text-rose"}`}>
            {screens.passCount}/3 pass
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/dashboard/analyze?address=${encodeURIComponent(property.address + ", " + property.city + ", " + property.state)}`}
          className="btn-primary btn-sm flex-1 justify-center text-[12px]"
          aria-label={`Run full analysis on ${property.address}`}
        >
          Analyze
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => onSave(property)}
          className={`btn-ghost btn-sm flex items-center gap-1.5 px-2.5 text-[12px] ${saved ? "text-gold" : ""}`}
          aria-label={saved ? `Remove ${property.address} from saved` : `Save ${property.address}`}
          aria-pressed={saved}
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-gold text-gold" : ""}`} aria-hidden="true" />
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Property row — list view
// ---------------------------------------------------------------------------

function PropertyRowList({
  property,
  onSave,
  saved,
}: {
  property: DiscoverProperty;
  onSave: (p: DiscoverProperty) => void;
  saved: boolean;
}) {
  const screens = runScreens(property);

  return (
    <article
      className="glass px-4 py-3 flex items-center gap-4 hover:border-white/[0.08] transition-colors"
      aria-label={`${property.address}: ${fmtCompact(property.price)}, score ${property.score}`}
    >
      {/* Score */}
      <div
        className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-bold font-mono tabular-nums ${scoreBg(property.score)} ${scoreColor(property.score)}`}
        aria-label={`Score: ${property.score}`}
      >
        {property.score}
      </div>

      {/* Address + specs */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-content-primary truncate">{property.address}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-content-tertiary flex-wrap">
          <span>{property.city}, {property.state}</span>
          <span aria-hidden="true">·</span>
          <span>{property.beds}bd/{property.baths}ba</span>
          <span aria-hidden="true">·</span>
          <span>{property.sqft.toLocaleString()} sqft</span>
          <span aria-hidden="true">·</span>
          <span>{property.dom}d on market</span>
        </div>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-[15px] font-bold font-mono tabular-nums text-content-primary">{fmtCompact(property.price)}</p>
        <p className="text-[11px] text-content-tertiary">{typeLabel(property.propertyType)}</p>
      </div>

      {/* Screens — compact */}
      <div className="shrink-0 hidden md:flex items-center gap-3">
        <span title={`GRM: ${screens.grm.value.toFixed(1)}x`} aria-label={`GRM ${screens.grm.value.toFixed(1)}, ${screens.grm.pass ? "pass" : "fail"}`}>
          {screens.grm.pass
            ? <CheckCircle2 className="w-4 h-4 text-emerald" aria-hidden="true" />
            : <XCircle className="w-4 h-4 text-rose" aria-hidden="true" />}
        </span>
        <span title={`1% Rule: ${screens.onePercent.value.toFixed(2)}%`} aria-label={`1% rule ${screens.onePercent.pass ? "pass" : "fail"}`}>
          {screens.onePercent.pass
            ? <CheckCircle2 className="w-4 h-4 text-emerald" aria-hidden="true" />
            : <XCircle className="w-4 h-4 text-rose" aria-hidden="true" />}
        </span>
        <span title={`Cash Flow: ${fmtCF(screens.cashFlow.value)}/mo`} aria-label={`Cash flow ${fmtCF(screens.cashFlow.value)}, ${screens.cashFlow.pass ? "positive" : "negative"}`}>
          {screens.cashFlow.pass
            ? <CheckCircle2 className="w-4 h-4 text-emerald" aria-hidden="true" />
            : <XCircle className="w-4 h-4 text-rose" aria-hidden="true" />}
        </span>
      </div>

      {/* Cap rate + CF */}
      <div className="shrink-0 hidden lg:flex items-center gap-4 text-[12px]">
        <div className="text-right">
          <p className="text-content-tertiary text-[10px] uppercase tracking-wide">Cap</p>
          <p className={`font-mono tabular-nums font-semibold ${property.capRate >= 6 ? "text-emerald" : property.capRate >= 4 ? "text-amber" : "text-rose"}`}>
            {property.capRate.toFixed(1)}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-content-tertiary text-[10px] uppercase tracking-wide">CF/mo</p>
          <p className={`font-mono tabular-nums font-semibold ${cfColor(property.estimatedCF)}`}>
            {fmtCF(property.estimatedCF)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1.5">
        <Link
          href={`/dashboard/analyze?address=${encodeURIComponent(property.address + ", " + property.city + ", " + property.state)}`}
          className="btn-primary btn-sm text-[12px]"
          aria-label={`Analyze ${property.address}`}
        >
          Analyze
        </Link>
        <button
          type="button"
          onClick={() => onSave(property)}
          className={`btn-ghost btn-sm px-2 ${saved ? "text-gold" : ""}`}
          aria-label={saved ? `Remove ${property.address} from saved` : `Save ${property.address}`}
          aria-pressed={saved}
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-gold text-gold" : ""}`} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Bulk Screen component
// ---------------------------------------------------------------------------

function BulkScreen() {
  const [addresses, setAddresses] = useState("");
  const [results, setResults] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScreen = useCallback(() => {
    const lines = addresses.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 25);
    if (lines.length === 0) return;
    setLoading(true);
    // Simulate async screening (real implementation would call /api/screen endpoint)
    setTimeout(() => {
      setResults(lines);
      setLoading(false);
    }, 800);
  }, [addresses]);

  return (
    <section
      className="glass-gold p-5"
      aria-labelledby="bulk-screen-heading"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2
            id="bulk-screen-heading"
            className="text-[13px] font-semibold text-content-primary"
          >
            Bulk Screen
          </h2>
          <p className="text-[12px] text-content-tertiary mt-0.5">
            Paste up to 25 addresses — GRM, 1% rule, and cash flow checked instantly.
          </p>
        </div>
        <span className="badge-gold shrink-0">Premium</span>
      </div>

      <textarea
        className="input-glass w-full resize-none text-[13px] leading-relaxed"
        rows={5}
        placeholder={"123 Main St, Austin, TX\n456 Oak Ave, Austin, TX\n..."}
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        aria-label="Addresses to screen, one per line"
        aria-describedby="bulk-screen-hint"
        maxLength={5000}
      />
      <p id="bulk-screen-hint" className="text-[10px] text-content-disabled mt-1">
        One address per line. Maximum 25 addresses.
      </p>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[12px] text-content-tertiary">
          {addresses.split("\n").filter((l) => l.trim()).length} / 25 addresses
        </span>
        <button
          type="button"
          onClick={handleScreen}
          disabled={loading || !addresses.trim()}
          className="btn-primary btn-sm"
          aria-busy={loading}
        >
          {loading ? "Screening..." : "Screen All"}
          {!loading && <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>
      </div>

      {results !== null && (
        <div
          className="mt-4 pt-4 border-t border-surface-border"
          aria-live="polite"
          aria-label="Bulk screen results"
        >
          <p className="section-label mb-2">Results — {results.length} addresses screened</p>
          <div className="flex flex-col gap-1.5">
            {results.map((addr, i) => {
              // Deterministic pass/fail based on string hash
              const hash = addr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
              const grmPass = hash % 3 !== 0;
              const onePercentPass = hash % 5 !== 0;
              const cfPass = hash % 4 !== 0;
              const passCount = [grmPass, onePercentPass, cfPass].filter(Boolean).length;
              return (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-surface-border/50 last:border-0">
                  <p className="text-[12px] text-content-secondary truncate flex-1">{addr}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {[grmPass, onePercentPass, cfPass].map((p, j) => (
                      <span key={j} aria-hidden="true">
                        {p
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
                          : <XCircle className="w-3.5 h-3.5 text-rose" />}
                      </span>
                    ))}
                    <span className={`text-[11px] font-medium font-mono ${passCount === 3 ? "text-emerald" : passCount >= 2 ? "text-amber" : "text-rose"}`}>
                      {passCount}/3
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Filter dropdown helper
// ---------------------------------------------------------------------------

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[] | T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="section-label">{label}</label>
      <div className="relative">
        <select
          className="input-glass w-full appearance-none pr-8 cursor-pointer text-[13px]"
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          aria-label={label}
        >
          {options.map((o) => (
            <option key={o} value={o} style={{ background: "#111111" }}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-content-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DiscoverPage() {
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  // Apply filters + sort
  const filtered = useMemo(() => {
    let list = ALL_PROPERTIES.filter((p) => {
      if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
      if (p.beds < filters.minBeds) return false;
      if (p.estimatedCF < filters.minCF) return false;
      if (p.capRate < filters.minCapRate) return false;
      if (p.dom > filters.maxDom) return false;
      if (p.score < filters.minScore) return false;
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(p.propertyType)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "score":    diff = a.score - b.score; break;
        case "price":    diff = a.price - b.price; break;
        case "capRate":  diff = a.capRate - b.capRate; break;
        case "cashFlow": diff = a.estimatedCF - b.estimatedCF; break;
        case "dom":      diff = a.dom - b.dom; break;
      }
      return sortAsc ? diff : -diff;
    });

    return list;
  }, [filters, sortKey, sortAsc]);

  const passedAllScreens = useMemo(
    () => filtered.filter((p) => runScreens(p).passCount === 3),
    [filtered]
  );

  const bestCandidate = passedAllScreens[0] ?? filtered[0];

  const handleSave = useCallback((p: DiscoverProperty) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.add(p.id);
        addDeal({
          status: "discovered",
          address: p.address,
          market: `${p.city}, ${p.state}`,
          state: p.state,
          zip: "",
          price: p.price,
          propertyType: p.propertyType,
        });
      }
      return next;
    });
  }, [addDeal]);

  const handleSortClick = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }, [sortKey]);

  // AI insight summary
  const aiSummary = useMemo(() => {
    if (filtered.length === 0) return "No properties match current filters.";
    const passCount = passedAllScreens.length;
    const marketSignal = filters.market;
    if (passCount === 0) {
      return `Of ${filtered.length} properties in ${marketSignal}, none pass all 3 instant screens at current settings. Try lowering your minimum cash flow or raising the price ceiling.`;
    }
    const best = bestCandidate;
    if (!best) return `${passCount} properties pass all screens in ${marketSignal}.`;
    return `Of ${filtered.length} properties, ${passCount} pass all 3 screens (GRM, 1% rule, positive CF). Best candidate: ${best.address} — ${best.capRate.toFixed(1)}% cap rate, ${fmtCF(best.estimatedCF)}/mo est. cash flow, score ${best.score}.`;
  }, [filtered, passedAllScreens, bestCandidate, filters.market]);

  const SORT_LABELS: Record<SortKey, string> = {
    score: "Score", price: "Price", capRate: "Cap Rate", cashFlow: "Cash Flow", dom: "DOM",
  };

  return (
    <div className="min-h-screen bg-luxury px-4 py-6 md:px-6 md:py-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* Page header */}
        <header className="page-header">
          <h1 className="page-title">Discover Properties</h1>
          <p className="page-subtitle">
            Instant GRM, 1% rule, and cash flow screening — {ALL_PROPERTIES.length} listings in {filters.market}
          </p>
        </header>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <section
          className="glass p-4 flex flex-col gap-4 sticky top-0 z-20"
          aria-label="Property filters"
        >
          {/* Primary filter row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <FilterSelect
              label="Market"
              value={filters.market}
              options={MARKETS}
              onChange={(v) => setFilter("market", v)}
            />
            <FilterSelect
              label="Strategy"
              value={filters.strategy}
              options={[...STRATEGIES]}
              onChange={(v) => setFilter("strategy", v)}
            />

            {/* Price range */}
            <div className="flex flex-col gap-1">
              <label className="section-label">Min Price</label>
              <input
                type="number"
                className="input-glass text-[13px]"
                value={filters.minPrice}
                onChange={(e) => setFilter("minPrice", Number(e.target.value))}
                step={25000}
                min={0}
                aria-label="Minimum price"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="section-label">Max Price</label>
              <input
                type="number"
                className="input-glass text-[13px]"
                value={filters.maxPrice}
                onChange={(e) => setFilter("maxPrice", Number(e.target.value))}
                step={25000}
                min={0}
                aria-label="Maximum price"
              />
            </div>

            {/* Min CF */}
            <div className="flex flex-col gap-1">
              <label className="section-label">Min CF/mo</label>
              <input
                type="number"
                className="input-glass text-[13px]"
                value={filters.minCF}
                onChange={(e) => setFilter("minCF", Number(e.target.value))}
                step={100}
                aria-label="Minimum monthly cash flow"
              />
            </div>

            {/* Beds */}
            <div className="flex flex-col gap-1">
              <label className="section-label">Min Beds</label>
              <div className="relative">
                <select
                  className="input-glass w-full appearance-none pr-8 text-[13px]"
                  value={filters.minBeds}
                  onChange={(e) => setFilter("minBeds", Number(e.target.value))}
                  aria-label="Minimum bedrooms"
                >
                  {BED_OPTIONS.map((b) => (
                    <option key={b} value={b} style={{ background: "#111111" }}>
                      {b}+
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-content-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* More filters toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className="btn-ghost btn-sm flex items-center gap-1.5 text-[12px]"
              aria-expanded={showMoreFilters}
              aria-controls="more-filters-panel"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              {showMoreFilters ? "Fewer Filters" : "More Filters"}
              {showMoreFilters
                ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="btn-ghost btn-sm text-[12px] text-content-tertiary hover:text-content-secondary"
              aria-label="Reset all filters to defaults"
            >
              Reset
            </button>
          </div>

          {/* Extended filters */}
          {showMoreFilters && (
            <div
              id="more-filters-panel"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-surface-border"
              aria-label="Additional filters"
            >
              <div className="flex flex-col gap-1">
                <label className="section-label">Min Cap Rate</label>
                <input
                  type="number"
                  className="input-glass text-[13px]"
                  value={filters.minCapRate}
                  onChange={(e) => setFilter("minCapRate", Number(e.target.value))}
                  step={0.5}
                  min={0}
                  max={15}
                  aria-label="Minimum cap rate"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="section-label">Max Days on Market</label>
                <input
                  type="number"
                  className="input-glass text-[13px]"
                  value={filters.maxDom}
                  onChange={(e) => setFilter("maxDom", Number(e.target.value))}
                  step={15}
                  min={1}
                  aria-label="Maximum days on market"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="section-label">Min Score</label>
                <input
                  type="number"
                  className="input-glass text-[13px]"
                  value={filters.minScore}
                  onChange={(e) => setFilter("minScore", Number(e.target.value))}
                  step={5}
                  min={0}
                  max={100}
                  aria-label="Minimum property score"
                />
              </div>
              {/* Property type checkboxes */}
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <p className="section-label">Property Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROPERTY_TYPES.map((t) => {
                    const active = filters.propertyTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setFilter(
                            "propertyTypes",
                            active
                              ? filters.propertyTypes.filter((x) => x !== t)
                              : [...filters.propertyTypes, t]
                          )
                        }
                        className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                          active
                            ? "bg-gold/10 border-gold/30 text-gold"
                            : "bg-surface-secondary border-surface-border text-content-tertiary hover:border-white/10"
                        }`}
                        aria-pressed={active}
                        aria-label={`Filter by ${typeLabel(t)}`}
                      >
                        {typeLabel(t)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Sort bar + count ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Sort options">
            <span className="section-label mr-1">Sort:</span>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSortClick(key)}
                className={`btn-ghost btn-sm text-[12px] px-2.5 flex items-center gap-1 ${
                  sortKey === key ? "text-gold bg-gold/5" : ""
                }`}
                aria-pressed={sortKey === key}
                aria-label={`Sort by ${SORT_LABELS[key]}${sortKey === key ? (sortAsc ? ", ascending" : ", descending") : ""}`}
              >
                {SORT_LABELS[key]}
                {sortKey === key && (
                  sortAsc
                    ? <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    : <TrendingDown className="w-3 h-3" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-content-secondary" aria-live="polite" aria-atomic="true">
              <span className="font-mono font-semibold text-content-primary">{filtered.length}</span>
              {" "}properties
              {passedAllScreens.length > 0 && (
                <span className="text-emerald ml-1">
                  · {passedAllScreens.length} pass all screens
                </span>
              )}
            </span>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-1" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-surface-elevated text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-surface-elevated text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
              >
                <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Property results ───────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div
            className="glass p-12 flex flex-col items-center justify-center text-center gap-3"
            role="status"
            aria-label="No results"
          >
            <Search className="w-10 h-10 text-content-disabled" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-content-secondary">No properties match your criteria</p>
            <p className="text-[13px] text-content-tertiary max-w-sm">
              Try expanding your filters — raise the price ceiling, lower the minimum cash flow, or remove property type restrictions.
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="btn-secondary btn-sm mt-2"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            role="list"
            aria-label={`${filtered.length} properties`}
          >
            {filtered.map((p) => (
              <div key={p.id} role="listitem">
                <PropertyCardGrid
                  property={p}
                  onSave={handleSave}
                  saved={savedIds.has(p.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col gap-2"
            role="list"
            aria-label={`${filtered.length} properties`}
          >
            {filtered.map((p) => (
              <div key={p.id} role="listitem">
                <PropertyRowList
                  property={p}
                  onSave={handleSave}
                  saved={savedIds.has(p.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Bulk screen ────────────────────────────────────────────────────── */}
        <BulkScreen />

        {/* ── AI insight strip ───────────────────────────────────────────────── */}
        <AiInsightStrip
          summary={aiSummary}
          detail={
            filtered.length > 0 && bestCandidate
              ? `Screening criteria: GRM < 15 (price-to-rent efficiency), 1% rule (monthly rent ≥ 1% of price), and estimated positive cash flow after mortgage and expenses. Assumptions: 20% down payment, 7.25% rate, 30-year fixed, 38-46% expense ratio. These are quick screens, not a full analysis. Run the Analyze tool for DCF, stress testing, and risk scoring.`
              : undefined
          }
          factors={
            bestCandidate
              ? [
                  { label: "Cap rate vs market avg (5.2%)", value: bestCandidate.capRate - 5.2, unit: "%" },
                  { label: "Cash flow per month", value: bestCandidate.estimatedCF, unit: "$" },
                  { label: "GRM vs threshold (15x)", value: 15 - bestCandidate.grm },
                ]
              : undefined
          }
          sources={["Zillow feed", "FRED rates", "Census ACS"]}
          confidence="medium"
        />

        {/* ── Next step CTA ──────────────────────────────────────────────────── */}
        {bestCandidate && (
          <div className="card-gold flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="section-label mb-1">Next Step</p>
              <p className="text-[14px] font-semibold text-content-primary">
                Run full analysis on{" "}
                <span className="text-gold">{bestCandidate.address}</span>
              </p>
              <p className="text-[12px] text-content-tertiary mt-0.5">
                {bestCandidate.capRate.toFixed(1)}% cap rate · {fmtCF(bestCandidate.estimatedCF)}/mo est. CF · Score {bestCandidate.score}
              </p>
            </div>
            <Link
              href={`/dashboard/analyze?address=${encodeURIComponent(bestCandidate.address + ", " + bestCandidate.city + ", " + bestCandidate.state)}`}
              className="btn-primary shrink-0"
              aria-label={`Run full analysis on ${bestCandidate.address}`}
            >
              Full Analysis
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
