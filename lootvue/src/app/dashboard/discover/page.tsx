"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  MapPin, RefreshCw, SlidersHorizontal, Compass, ChevronDown, ChevronUp,
  Bookmark, ArrowUpRight, Users, Bed, Bath, Ruler, X,
  LayoutGrid, LayoutList, Map, Filter, TrendingUp, Calendar,
  DollarSign, Home, Building2, Building, AlertCircle,
} from "lucide-react";
import { useBuyBoxStore, type PropertyCandidate } from "@/lib/stores/buybox-store";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { AiInsightCard } from "@/components/charts/ChartTheme";

// ---------------------------------------------------------------------------
// Deterministic mock generator
// ---------------------------------------------------------------------------
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PROPERTY_TYPES = ["sfr", "duplex", "triplex", "fourplex", "condo", "townhome"] as const;
type PropertyTypeValue = (typeof PROPERTY_TYPES)[number];

interface MockProperty {
  id: string;
  address: string;
  price: number;
  capRate: number;
  cashFlow: number;
  score: number;
  distance: number;
  beds: number;
  baths: number;
  sqft: number;
  dscr: number;
  cashOnCash: number;
  yearBuilt: number;
  dom: number;
  propertyType: PropertyTypeValue;
  walkScore: number;
  schoolRating: number;
  crimeLevel: "low" | "medium" | "high";
  hasTransit: boolean;
  pricePerSqft: number;
}

const STREETS = [
  "Oak Valley Dr", "Magnolia Ln", "Cedar Ridge Ct", "Pine Creek Blvd",
  "Elm Park Ave", "Birch Hollow Way", "Walnut Springs Rd", "Cypress Point Dr",
  "Pecan Grove Ln", "Laurel Heights Pl", "Mesquite Canyon Rd", "Bluebonnet Trl",
  "River Oaks Dr", "Stonegate Blvd", "Heritage Oak Ct", "Creekside Dr",
  "Ridgeline Pkwy", "Mesa Verde Ln", "Sunrise Blvd", "Canyon Lake Rd",
  "Wildflower Cir", "Ironwood Pass", "Summit Ridge Dr", "Cliffwood Ave",
  "Greenfield Ct",
];

const CRIME_LEVELS: Array<"low" | "medium" | "high"> = ["low", "low", "medium", "high"];

function generateProperties(lat: number, lng: number, radius: number): MockProperty[] {
  const seed = Math.round(lat * 1000) + Math.round(Math.abs(lng) * 1000);
  const rand = seededRand(seed);
  const props: MockProperty[] = [];

  for (let i = 0; i < 25; i++) {
    const dist = +(rand() * radius).toFixed(1);
    const price = Math.round((150000 + rand() * 650000) / 1000) * 1000;
    const score = Math.round(45 + rand() * 47);
    const capRate = +(4 + rand() * 5).toFixed(1);
    const cashFlow = Math.round(-200 + rand() * 1000);
    const beds = 1 + Math.round(rand() * 4);
    const baths = 1 + Math.round(rand() * 2);
    const sqft = 800 + Math.round(rand() * 2700);
    const propertyType = PROPERTY_TYPES[Math.floor(rand() * PROPERTY_TYPES.length)] ?? "sfr" as const;
    const walkScore = Math.round(40 + rand() * 55);
    const schoolRating = Math.round(4 + rand() * 6);
    const crimeLevel = CRIME_LEVELS[Math.floor(rand() * CRIME_LEVELS.length)] ?? "low" as const;
    const hasTransit = rand() > 0.5;
    const yearBuilt = 1950 + Math.round(rand() * 75);
    const pricePerSqft = Math.round(price / sqft);

    props.push({
      id: `disc-${i}-${seed}`,
      address: `${100 + Math.round(rand() * 9800)} ${STREETS[i]}`,
      price,
      capRate,
      cashFlow,
      score,
      distance: dist,
      beds,
      baths,
      sqft,
      dscr: +(0.8 + rand() * 0.8).toFixed(2),
      cashOnCash: +(3 + rand() * 9).toFixed(1),
      yearBuilt,
      dom: Math.round(rand() * 115) + 5,
      propertyType,
      walkScore,
      schoolRating,
      crimeLevel,
      hasTransit,
      pricePerSqft,
    });
  }
  return props;
}

// ---------------------------------------------------------------------------
// Formatting & color helpers
// ---------------------------------------------------------------------------
type SortKey = "score" | "price" | "capRate" | "distance" | "cashFlow" | "dom";

function scoreBadgeClass(s: number) {
  if (s >= 75) return "badge-emerald";
  if (s >= 55) return "badge-amber";
  return "badge-rose";
}

function cashFlowColor(cf: number) {
  if (cf >= 300) return "text-emerald-light";
  if (cf >= 0) return "text-amber-light";
  return "text-rose-light";
}

function dscrColor(d: number) {
  if (d >= 1.25) return "text-emerald-light";
  if (d >= 1.0) return "text-amber-light";
  return "text-rose-light";
}

function domColor(dom: number) {
  if (dom <= 30) return "text-emerald-light";
  if (dom <= 60) return "text-amber-light";
  return "text-rose-light";
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

function typeLabel(t: string) {
  const map: Record<string, string> = {
    sfr: "SFR",
    duplex: "Duplex",
    triplex: "Triplex",
    fourplex: "Fourplex",
    condo: "Condo",
    townhome: "Townhouse",
  };
  return map[t] ?? t.toUpperCase();
}

function TypeIcon({ type }: { type: string }) {
  if (type === "sfr") return <Home className="w-3 h-3" aria-hidden="true" />;
  if (type === "condo" || type === "townhome") return <Building className="w-3 h-3" aria-hidden="true" />;
  return <Building2 className="w-3 h-3" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------
interface AdvancedFilters {
  propertyTypes: PropertyTypeValue[];
  minPrice: number;
  maxPrice: number;
  minBeds: number;
  minBaths: number;
  minSqft: number;
  maxSqft: number;
  minYearBuilt: number;
  maxYearBuilt: number;
  minCapRate: number;
  minCashFlow: number;
  minScore: number;
  maxDom: number;
  maxPricePerSqft: number;
  schoolRating7Plus: boolean;
  walkScore70Plus: boolean;
  lowCrimeOnly: boolean;
  nearTransit: boolean;
}

const DEFAULT_FILTERS: AdvancedFilters = {
  propertyTypes: [],
  minPrice: 50000,
  maxPrice: 2000000,
  minBeds: 0,
  minBaths: 0,
  minSqft: 500,
  maxSqft: 5000,
  minYearBuilt: 1950,
  maxYearBuilt: 2025,
  minCapRate: 0,
  minCashFlow: 0,
  minScore: 0,
  maxDom: 180,
  maxPricePerSqft: 500,
  schoolRating7Plus: false,
  walkScore70Plus: false,
  lowCrimeOnly: false,
  nearTransit: false,
};

function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.propertyTypes.length > 0) n++;
  if (f.minPrice > DEFAULT_FILTERS.minPrice || f.maxPrice < DEFAULT_FILTERS.maxPrice) n++;
  if (f.minBeds > 0) n++;
  if (f.minBaths > 0) n++;
  if (f.minSqft > DEFAULT_FILTERS.minSqft || f.maxSqft < DEFAULT_FILTERS.maxSqft) n++;
  if (f.minYearBuilt > DEFAULT_FILTERS.minYearBuilt || f.maxYearBuilt < DEFAULT_FILTERS.maxYearBuilt) n++;
  if (f.minCapRate > 0) n++;
  if (f.minCashFlow > 0) n++;
  if (f.minScore > 0) n++;
  if (f.maxDom < DEFAULT_FILTERS.maxDom) n++;
  if (f.maxPricePerSqft < DEFAULT_FILTERS.maxPricePerSqft) n++;
  if (f.schoolRating7Plus) n++;
  if (f.walkScore70Plus) n++;
  if (f.lowCrimeOnly) n++;
  if (f.nearTransit) n++;
  return n;
}

function applyFilters(properties: MockProperty[], f: AdvancedFilters): MockProperty[] {
  return properties.filter((p) => {
    if (f.propertyTypes.length > 0 && !f.propertyTypes.includes(p.propertyType)) return false;
    if (p.price < f.minPrice || p.price > f.maxPrice) return false;
    if (f.minBeds > 0 && p.beds < f.minBeds) return false;
    if (f.minBaths > 0 && p.baths < f.minBaths) return false;
    if (p.sqft < f.minSqft || p.sqft > f.maxSqft) return false;
    if (p.yearBuilt < f.minYearBuilt || p.yearBuilt > f.maxYearBuilt) return false;
    if (p.capRate < f.minCapRate) return false;
    if (p.cashFlow < f.minCashFlow) return false;
    if (p.score < f.minScore) return false;
    if (p.dom > f.maxDom) return false;
    if (p.pricePerSqft > f.maxPricePerSqft) return false;
    if (f.schoolRating7Plus && p.schoolRating < 7) return false;
    if (f.walkScore70Plus && p.walkScore < 70) return false;
    if (f.lowCrimeOnly && p.crimeLevel !== "low") return false;
    if (f.nearTransit && !p.hasTransit) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Reusable UI atoms
// ---------------------------------------------------------------------------
function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md border font-medium transition-all duration-150 ${
        active
          ? "bg-gold-muted border-gold/40 text-gold-light"
          : "bg-white/[0.03] border-white/[0.08] text-content-secondary hover:border-gold/20 hover:text-content-primary"
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">
          {label}
        </label>
        <span className="font-mono text-xs text-gold-light font-semibold" aria-live="polite">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1 appearance-none bg-surface-elevated rounded-full cursor-pointer accent-gold
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-glow-gold"
        aria-label={label}
        aria-valuetext={format(value)}
      />
      <div className="flex justify-between text-[10px] text-content-disabled font-mono">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] text-content-primary font-medium">{label}</div>
        <div className="text-[11px] text-content-disabled">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full border transition-all duration-200 shrink-0 ${
          value ? "bg-gold border-gold/60" : "bg-surface-elevated border-surface-border"
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
            value ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property card — grid view
// ---------------------------------------------------------------------------
function PropertyCardGrid({
  p,
  isExpanded,
  match,
  onToggle,
  onSave,
}: {
  p: MockProperty;
  isExpanded: boolean;
  match: { passes: boolean; failedCriteria: string[]; matchScore: number } | null;
  onToggle: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className={`card-hover !p-0 overflow-hidden ${isExpanded ? "ring-1 ring-gold/30" : ""}`}
      aria-label={`${p.address}, ${fmtCurrency(p.price)}, score ${p.score}`}
    >
      <button className="w-full text-left p-4" onClick={onToggle} aria-expanded={isExpanded}>
        {/* Score + type + match */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`badge font-mono font-bold ${scoreBadgeClass(p.score)}`}
              aria-label={`Score ${p.score}`}
            >
              {p.score}
            </span>
            <span className="badge bg-white/[0.06] text-content-disabled gap-1">
              <TypeIcon type={p.propertyType} />
              {typeLabel(p.propertyType)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {match && (
              <span className="badge-gold font-mono" aria-label={`${match.matchScore}% buy box match`}>
                {match.matchScore}%
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-content-disabled" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-content-disabled" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Address + price */}
        <div className="text-[13px] font-medium text-content-primary truncate">{p.address}</div>
        <div className="font-mono text-lg font-bold text-content-primary mt-1">
          {fmtCurrency(p.price)}
        </div>

        {/* Key metrics */}
        <div className="flex items-center gap-3 mt-2 text-xs text-content-secondary flex-wrap">
          <span className="font-mono">Cap {p.capRate}%</span>
          <span className={`font-mono font-semibold ${cashFlowColor(p.cashFlow)}`}>
            {p.cashFlow >= 0 ? "+" : ""}
            {fmtCurrency(p.cashFlow)}/mo
          </span>
          <span className="text-content-disabled">{p.distance} mi</span>
        </div>

        {/* Bed/bath/sqft/$/sqft */}
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-content-tertiary flex-wrap">
          <span className="flex items-center gap-1">
            <Bed className="w-3 h-3" aria-hidden="true" />
            {p.beds}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3 h-3" aria-hidden="true" />
            {p.baths}
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" aria-hidden="true" />
            {p.sqft.toLocaleString()} sqft
          </span>
          <span className="font-mono">${p.pricePerSqft}/sqft</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-surface-border px-4 py-3 bg-white/[0.01] space-y-3 animate-fade-in">
          {/* DSCR / CoC / DOM */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "DSCR", value: p.dscr.toFixed(2), color: dscrColor(p.dscr) },
              { label: "CoC", value: `${p.cashOnCash}%`, color: "text-content-primary" },
              { label: "DOM", value: `${p.dom}d`, color: domColor(p.dom) },
            ].map((m) => (
              <div key={m.label} className="p-2 rounded-lg bg-white/[0.02]" aria-label={`${m.label}: ${m.value}`}>
                <div className="text-[10px] text-content-disabled uppercase tracking-wider">{m.label}</div>
                <div className={`font-mono text-sm font-semibold mt-0.5 ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Quality indicators */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <span className={p.walkScore >= 70 ? "text-emerald-light" : "text-content-disabled"}>
              Walk {p.walkScore}
            </span>
            <span className={p.schoolRating >= 7 ? "text-emerald-light" : "text-content-disabled"}>
              School {p.schoolRating}/10
            </span>
            <span
              className={
                p.crimeLevel === "low"
                  ? "text-emerald-light"
                  : p.crimeLevel === "medium"
                  ? "text-amber-light"
                  : "text-rose-light"
              }
            >
              Crime: {p.crimeLevel}
            </span>
            <span className="text-content-tertiary">Built {p.yearBuilt}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="btn-emerald btn-sm flex-1"
              aria-label={`Save ${p.address} to pipeline`}
            >
              <Bookmark className="w-3 h-3" aria-hidden="true" /> Save
            </button>
            <Link
              href={`/dashboard/analyze?address=${encodeURIComponent(p.address)}&price=${p.price}`}
              className="btn-primary btn-sm flex-1 text-center"
              aria-label={`Full analysis for ${p.address}`}
            >
              <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> Analyze
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property row — list view
// ---------------------------------------------------------------------------
function PropertyRowList({
  p,
  match,
  onSave,
}: {
  p: MockProperty;
  match: { passes: boolean; failedCriteria: string[]; matchScore: number } | null;
  onSave: () => void;
}) {
  return (
    <div
      className="card-hover !py-3 !px-4 flex items-center gap-3 flex-wrap md:flex-nowrap"
      aria-label={`${p.address}, ${fmtCurrency(p.price)}`}
    >
      {/* Score */}
      <span className={`badge font-mono font-bold shrink-0 ${scoreBadgeClass(p.score)}`} aria-label={`Score ${p.score}`}>
        {p.score}
      </span>

      {/* Address + meta */}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-content-primary truncate">{p.address}</div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-content-tertiary flex-wrap">
          <TypeIcon type={p.propertyType} />
          <span>{typeLabel(p.propertyType)}</span>
          <span className="text-content-disabled">{p.beds}bd / {p.baths}ba</span>
          <span className="text-content-disabled">{p.sqft.toLocaleString()} sqft</span>
          <span className="font-mono text-content-disabled">${p.pricePerSqft}/sqft</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 text-xs font-mono shrink-0 flex-wrap">
        {[
          { label: "Price", value: fmtCompact(p.price), color: "text-content-primary" },
          { label: "Cap", value: `${p.capRate}%`, color: "text-content-primary" },
          { label: "CF/mo", value: `${p.cashFlow >= 0 ? "+" : ""}${fmtCurrency(p.cashFlow)}`, color: cashFlowColor(p.cashFlow) },
          { label: "DSCR", value: p.dscr.toFixed(2), color: dscrColor(p.dscr) },
          { label: "DOM", value: `${p.dom}d`, color: domColor(p.dom) },
          { label: "Dist", value: `${p.distance} mi`, color: "text-content-secondary" },
        ].map((m) => (
          <div key={m.label} className="text-center" aria-label={`${m.label}: ${m.value}`}>
            <div className="text-[10px] text-content-disabled uppercase tracking-wider">{m.label}</div>
            <div className={`font-semibold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Match + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {match && (
          <span className="badge-gold font-mono text-[10px]" aria-label={`${match.matchScore}% buy box match`}>
            {match.matchScore}%
          </span>
        )}
        <button
          type="button"
          onClick={onSave}
          className="btn-ghost btn-sm !px-2 !py-1"
          aria-label={`Save ${p.address} to pipeline`}
        >
          <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <Link
          href={`/dashboard/analyze?address=${encodeURIComponent(p.address)}&price=${p.price}`}
          className="btn-primary btn-sm"
          aria-label={`Analyze ${p.address}`}
        >
          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
type ViewMode = "grid" | "list" | "map";

export default function DiscoverPage() {
  const [lat] = useState(30.27);
  const [lng] = useState(-97.74);
  const [radius, setRadius] = useState(15);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [buyBoxActive, setBuyBoxActive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({ ...DEFAULT_FILTERS });

  const matchesBox = useBuyBoxStore((s) => s.matchesBox);
  const addDeal = useDealPipelineStore((s) => s.addDeal);

  const allProperties = useMemo(
    () => generateProperties(lat, lng, radius),
    [lat, lng, radius]
  );

  const filtered = useMemo(() => applyFilters(allProperties, filters), [allProperties, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "score") list.sort((a, b) => b.score - a.score);
    else if (sortBy === "price") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "capRate") list.sort((a, b) => b.capRate - a.capRate);
    else if (sortBy === "cashFlow") list.sort((a, b) => b.cashFlow - a.cashFlow);
    else if (sortBy === "dom") list.sort((a, b) => a.dom - b.dom);
    else list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [filtered, sortBy]);

  const topPick = useMemo(
    () => [...allProperties].sort((a, b) => b.score - a.score)[0],
    [allProperties]
  );

  const buyBoxMatches = useMemo(
    () => allProperties.filter((p) => matchesBox(toBuyBoxCandidate(p)).passes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProperties, matchesBox]
  );

  const avgDom = useMemo(
    () => Math.round(allProperties.reduce((acc, p) => acc + p.dom, 0) / allProperties.length),
    [allProperties]
  );

  const fastCloseThreshold = topPick ? Math.round(topPick.score * 0.85) : 75;
  const activeFilterCount = countActiveFilters(filters);
  const investorsToday = 12 + Math.round(Math.abs(lat * 3) % 20);

  function toBuyBoxCandidate(p: MockProperty): PropertyCandidate {
    return {
      price: p.price,
      capRate: p.capRate,
      monthlyCashFlow: p.cashFlow,
      cashOnCash: +p.cashOnCash,
      dscr: p.dscr,
      propertyType: p.propertyType,
      bedrooms: p.beds,
      yearBuilt: p.yearBuilt,
      hyperScore: p.score,
      daysOnMarket: p.dom,
    };
  }

  function handleSave(p: MockProperty) {
    addDeal({
      status: "discovered",
      address: p.address,
      market: "Austin",
      state: "TX",
      zip: "78701",
      price: p.price,
      propertyType: p.propertyType,
    });
  }

  function setFilter<K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function togglePropertyType(t: PropertyTypeValue) {
    setFilters((prev) => {
      const has = prev.propertyTypes.includes(t);
      return {
        ...prev,
        propertyTypes: has
          ? prev.propertyTypes.filter((x) => x !== t)
          : [...prev.propertyTypes, t],
      };
    });
  }

  function clearAllFilters() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <Compass className="w-3.5 h-3.5" aria-hidden="true" />
          Property Discovery
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Discover Properties</h1>
      </div>

      {/* Location bar */}
      <div className="card-glass !p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[13px] text-content-secondary">
          <MapPin className="w-4 h-4 text-gold-light" aria-hidden="true" />
          <span>Properties near</span>
          <span className="font-mono font-semibold text-content-primary">
            {lat.toFixed(2)}, {lng.toFixed(2)}
          </span>
          <span className="text-content-disabled">(Austin, TX)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-content-disabled flex items-center gap-1">
            <Users className="w-3 h-3" aria-hidden="true" />
            {investorsToday} investors analyzed this area today
          </span>
          <button type="button" className="btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {/* AI Insight */}
      {topPick && (
        <AiInsightCard title="Discovery Insight">
          Scanning{" "}
          <span className="text-content-primary font-semibold">{allProperties.length} properties</span>{" "}
          within{" "}
          <span className="text-content-primary font-semibold">{radius} mi</span>{" "}
          of Austin, TX.{" "}
          <span className="text-gold-light font-semibold">{buyBoxMatches.length}</span>{" "}
          match your buy box criteria. Top pick:{" "}
          <span className="text-content-primary font-semibold">{topPick.address}</span> at{" "}
          <span className="font-mono text-content-primary">{fmtCurrency(topPick.price)}</span> with{" "}
          <span className="text-content-primary font-semibold">{topPick.capRate}%</span> cap rate and{" "}
          <span className={`font-mono font-semibold ${cashFlowColor(topPick.cashFlow)}`}>
            {topPick.cashFlow >= 0 ? "+" : ""}
            {fmtCurrency(topPick.cashFlow)}/mo
          </span>{" "}
          cash flow. Average DOM in this area is{" "}
          <span className="text-content-primary font-semibold">{avgDom} days</span> — deals scoring{" "}
          <span className="text-content-primary font-semibold">{fastCloseThreshold}+</span> typically
          close within 11 days.
        </AiInsightCard>
      )}

      {/* Primary filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Radius */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          <label htmlFor="radius-select" className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">
            Radius
          </label>
          <select
            id="radius-select"
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            className="input !w-24 !py-1.5 !text-xs font-mono"
          >
            {[1, 5, 10, 15, 25, 50].map((r) => (
              <option key={r} value={r}>{r} mi</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">
            Sort
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="input !w-36 !py-1.5 !text-xs font-mono"
          >
            <option value="score">Score</option>
            <option value="price">Price (Low)</option>
            <option value="capRate">Cap Rate (High)</option>
            <option value="cashFlow">Cash Flow (High)</option>
            <option value="dom">Days on Market</option>
            <option value="distance">Distance</option>
          </select>
        </div>

        {/* Buy box */}
        <button
          type="button"
          onClick={() => setBuyBoxActive(!buyBoxActive)}
          className={`btn btn-sm text-xs ${
            buyBoxActive
              ? "bg-gold-muted text-gold-light border border-gold/30"
              : "bg-white/[0.04] text-content-secondary border border-white/[0.06]"
          }`}
          aria-pressed={buyBoxActive}
        >
          Buy Box {buyBoxActive ? "ON" : "OFF"}
        </button>

        {/* Advanced filters */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`btn btn-sm text-xs flex items-center gap-1.5 ${
            showAdvanced || activeFilterCount > 0
              ? "bg-gold-muted text-gold-light border border-gold/30"
              : "bg-white/[0.04] text-content-secondary border border-white/[0.06]"
          }`}
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters"
        >
          <Filter className="w-3 h-3" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none" aria-label={`${activeFilterCount} active filters`}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="btn-ghost btn-sm flex items-center gap-1 text-rose-light hover:text-rose"
          >
            <X className="w-3 h-3" aria-hidden="true" /> Clear
          </button>
        )}

        <div className="flex-1" />

        {/* View toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="flex items-center gap-1 p-1 rounded-lg bg-surface-elevated border border-surface-border"
        >
          {(
            [
              { mode: "grid" as ViewMode, Icon: LayoutGrid, label: "Grid view" },
              { mode: "list" as ViewMode, Icon: LayoutList, label: "List view" },
              { mode: "map" as ViewMode, Icon: Map, label: "Map view (coming soon)" },
            ] as const
          ).map(({ mode, Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={mode === "map" ? "Map view requires Mapbox API key" : label}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === mode ? "bg-gold-muted text-gold-light" : "text-content-disabled hover:text-content-secondary"
              }`}
              aria-label={label}
              aria-pressed={viewMode === mode}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* Result count */}
        <span
          className="text-[11px] text-content-disabled font-mono tabular-nums"
          aria-live="polite"
          aria-label={`Showing ${sorted.length} of ${allProperties.length} properties`}
        >
          <span className="text-content-secondary font-semibold">{sorted.length}</span>
          {" / "}
          <span className="text-content-secondary font-semibold">{allProperties.length}</span>
          {" shown"}
        </span>
      </div>

      {/* Advanced filter panel */}
      {showAdvanced && (
        <div id="advanced-filters" className="card border-gold/[0.08] space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gold-light uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Advanced Filters
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] text-rose-light hover:text-rose flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" aria-hidden="true" /> Clear all
              </button>
            )}
          </div>

          {/* --- Property --- */}
          <div className="space-y-4">
            <div className="section-label flex items-center gap-2">
              <Home className="w-3.5 h-3.5" aria-hidden="true" /> Property
            </div>

            {/* Type pills */}
            <div className="space-y-2">
              <span className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">
                Property Type
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Property type filter">
                <PillButton
                  active={filters.propertyTypes.length === 0}
                  onClick={() => setFilter("propertyTypes", [])}
                >
                  All
                </PillButton>
                {(["sfr", "duplex", "triplex", "fourplex", "condo", "townhome"] as PropertyTypeValue[]).map((t) => (
                  <PillButton
                    key={t}
                    active={filters.propertyTypes.includes(t)}
                    onClick={() => togglePropertyType(t)}
                  >
                    {typeLabel(t)}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SliderRow
                label="Min Price"
                value={filters.minPrice}
                min={50000}
                max={2000000}
                step={10000}
                format={fmtCompact}
                onChange={(v) => setFilter("minPrice", v)}
              />
              <SliderRow
                label="Max Price"
                value={filters.maxPrice}
                min={50000}
                max={2000000}
                step={10000}
                format={fmtCompact}
                onChange={(v) => setFilter("maxPrice", v)}
              />
            </div>

            {/* Beds */}
            <div className="space-y-2">
              <span className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">
                Minimum Bedrooms
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum bedrooms filter">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <PillButton
                    key={n}
                    active={filters.minBeds === n}
                    onClick={() => setFilter("minBeds", n)}
                  >
                    {n === 0 ? "Any" : n === 5 ? "5+" : String(n)}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Baths */}
            <div className="space-y-2">
              <span className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">
                Minimum Bathrooms
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum bathrooms filter">
                {[0, 1, 2, 3].map((n) => (
                  <PillButton
                    key={n}
                    active={filters.minBaths === n}
                    onClick={() => setFilter("minBaths", n)}
                  >
                    {n === 0 ? "Any" : n === 3 ? "3+" : String(n)}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Sqft range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SliderRow
                label="Min Sqft"
                value={filters.minSqft}
                min={500}
                max={5000}
                step={100}
                format={(v) => `${v.toLocaleString()} sqft`}
                onChange={(v) => setFilter("minSqft", v)}
              />
              <SliderRow
                label="Max Sqft"
                value={filters.maxSqft}
                min={500}
                max={5000}
                step={100}
                format={(v) => `${v.toLocaleString()} sqft`}
                onChange={(v) => setFilter("maxSqft", v)}
              />
            </div>

            {/* Year built range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SliderRow
                label="Min Year Built"
                value={filters.minYearBuilt}
                min={1950}
                max={2025}
                step={5}
                format={String}
                onChange={(v) => setFilter("minYearBuilt", v)}
              />
              <SliderRow
                label="Max Year Built"
                value={filters.maxYearBuilt}
                min={1950}
                max={2025}
                step={5}
                format={String}
                onChange={(v) => setFilter("maxYearBuilt", v)}
              />
            </div>
          </div>

          <div className="divider" />

          {/* --- Investment criteria --- */}
          <div className="space-y-4">
            <div className="section-label flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Investment Criteria
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SliderRow
                label="Min Cap Rate"
                value={filters.minCapRate}
                min={0}
                max={15}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%`}
                onChange={(v) => setFilter("minCapRate", v)}
              />
              <SliderRow
                label="Min Cash Flow / mo"
                value={filters.minCashFlow}
                min={0}
                max={2000}
                step={50}
                format={fmtCurrency}
                onChange={(v) => setFilter("minCashFlow", v)}
              />
              <SliderRow
                label="Min Score"
                value={filters.minScore}
                min={0}
                max={100}
                step={5}
                format={String}
                onChange={(v) => setFilter("minScore", v)}
              />
              <SliderRow
                label="Max Days on Market"
                value={filters.maxDom}
                min={0}
                max={180}
                step={10}
                format={(v) => `${v}d`}
                onChange={(v) => setFilter("maxDom", v)}
              />
              <SliderRow
                label="Max Price per Sqft"
                value={filters.maxPricePerSqft}
                min={50}
                max={500}
                step={10}
                format={(v) => `$${v}`}
                onChange={(v) => setFilter("maxPricePerSqft", v)}
              />
            </div>
          </div>

          <div className="divider" />

          {/* --- Quality signals --- */}
          <div className="space-y-4">
            <div className="section-label flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" aria-hidden="true" /> Quality Signals
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleRow
                label="School Rating 7+"
                description="Only show properties in high-rated school districts"
                value={filters.schoolRating7Plus}
                onChange={(v) => setFilter("schoolRating7Plus", v)}
              />
              <ToggleRow
                label="Walkability 70+"
                description="Car-optional neighborhoods"
                value={filters.walkScore70Plus}
                onChange={(v) => setFilter("walkScore70Plus", v)}
              />
              <ToggleRow
                label="Low Crime Area"
                description="Filter out medium and high-crime areas"
                value={filters.lowCrimeOnly}
                onChange={(v) => setFilter("lowCrimeOnly", v)}
              />
              <ToggleRow
                label="Near Public Transit"
                description="Properties within walking distance of transit"
                value={filters.nearTransit}
                onChange={(v) => setFilter("nearTransit", v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Map placeholder */}
      {viewMode === "map" && (
        <div className="card border-dashed border-surface-border flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Map className="w-8 h-8 text-content-disabled" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-medium text-content-primary">
              Map view requires Mapbox API key
            </p>
            <p className="text-[11px] text-content-disabled mt-1">
              Add{" "}
              <code className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded text-content-secondary">
                MAPBOX_TOKEN
              </code>{" "}
              to{" "}
              <code className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded text-content-secondary">
                .env.local
              </code>
            </p>
          </div>
          <span className="badge-amber flex items-center gap-1">
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
            Map integration coming soon
          </span>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className="btn-ghost btn-sm mt-1"
          >
            Back to Grid
          </button>
        </div>
      )}

      {/* Empty state */}
      {viewMode !== "map" && sorted.length === 0 && (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center" role="status">
          <Filter className="w-8 h-8 text-content-disabled" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-medium text-content-primary">
              No properties match your filters
            </p>
            <p className="text-[11px] text-content-disabled mt-1">
              {allProperties.length} properties found in this area — try relaxing your criteria
            </p>
          </div>
          <button type="button" onClick={clearAllFilters} className="btn-secondary btn-sm flex items-center gap-1.5">
            <X className="w-3 h-3" aria-hidden="true" /> Clear all filters
          </button>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && sorted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((p) => (
            <PropertyCardGrid
              key={p.id}
              p={p}
              isExpanded={expanded === p.id}
              match={buyBoxActive ? matchesBox(toBuyBoxCandidate(p)) : null}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onSave={() => handleSave(p)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((p) => (
            <PropertyRowList
              key={p.id}
              p={p}
              match={buyBoxActive ? matchesBox(toBuyBoxCandidate(p)) : null}
              onSave={() => handleSave(p)}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      {sorted.length > 0 && viewMode !== "map" && (
        <div className="flex items-center justify-between pt-2 text-[11px] text-content-disabled">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" aria-hidden="true" />
            Mock data — replace with RentCast / ATTOM API
          </span>
          <span className="font-mono tabular-nums">
            {sorted.length} of {allProperties.length} shown
          </span>
        </div>
      )}
    </div>
  );
}
