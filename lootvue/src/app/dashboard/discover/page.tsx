"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin, Bookmark, ArrowUpRight, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Home, Building2, Building,
  ChevronDown, SlidersHorizontal, AlertTriangle, Droplets,
  Clock, Sparkles, BarChart2, Zap, DollarSign, Target,
  Percent, Activity, ShieldAlert, Star,
} from "lucide-react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { Term } from "@/components/shared/Term";

// ─── Types ────────────────────────────────────────────────────────────────────

const STRATEGIES = ["All", "Rental", "STR", "Flip", "BRRRR"] as const;
type Strategy = (typeof STRATEGIES)[number];
type SortKey = "score" | "price" | "capRate" | "cashFlow" | "belowComps" | "dom";

interface DiscoverProperty {
  id: string; address: string; city: string; state: string; zip: string;
  price: number; beds: number; baths: number; sqft: number;
  propertyType: string; dom: number; monthlyRent: number;
  estimatedExpenses: number; estimatedMortgage: number;
  capRate: number; score: number; grm: number;
  onePercent: boolean; estimatedCF: number; strategy: string;
  // Intelligence fields
  compMedian: number;       // median comp price
  belowComps: number;       // % below/above comps (negative = below = good)
  avgDomArea: number;       // average DOM for this area
  priceDropPct: number;     // recent price drop %
  priceDropAmt: number;     // recent price drop $
  priceDropDate: string;    // when it dropped
  walkScore: number;
  schoolScore: number;      // 1-10
  crimeRisk: "low" | "medium" | "high";
  floodZone: boolean;
  hoaMonthly: number;       // 0 = no HOA
  marketSignal: "BUY" | "HOLD" | "SELL";
  aiPick: boolean;          // top AI recommendation
  aiReason: string;         // why AI picked it
  rentGrowthYoY: number;    // rent growth %
  neighAppreciation: number; // neighborhood appreciation %
}

// ─── Data generation ──────────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const CITIES = [
  { city: "Austin", state: "TX", zip: "78745", signal: "BUY" as const, avgDom: 28, avgCap: 5.8, medianPrice: 425000 },
  { city: "Austin", state: "TX", zip: "78704", signal: "BUY" as const, avgDom: 22, avgCap: 5.2, medianPrice: 510000 },
  { city: "Tampa", state: "FL", zip: "33609", signal: "BUY" as const, avgDom: 35, avgCap: 6.1, medianPrice: 385000 },
  { city: "Nashville", state: "TN", zip: "37206", signal: "HOLD" as const, avgDom: 31, avgCap: 5.5, medianPrice: 430000 },
  { city: "Phoenix", state: "AZ", zip: "85008", signal: "HOLD" as const, avgDom: 42, avgCap: 5.9, medianPrice: 375000 },
  { city: "Raleigh", state: "NC", zip: "27604", signal: "HOLD" as const, avgDom: 26, avgCap: 5.6, medianPrice: 370000 },
];

const STREETS = [
  "Oak Hill Blvd", "Cedar Park Ln", "Barton Springs Rd", "South Congress Ave",
  "Rundberg Ln", "Spicewood Springs Rd", "Anderson Ln", "Oltorf St",
  "Manchaca Rd", "Slaughter Ln", "William Cannon Dr", "Research Blvd",
  "Parmer Ln", "Burnet Rd", "S Lamar Blvd", "E Riverside Dr",
  "Stassney Ln", "Ben White Blvd", "Airport Blvd", "Manor Rd",
];

const STRATEGIES_MAP: Record<string, string> = {
  sfr: "Rental", duplex: "BRRRR", triplex: "BRRRR",
  fourplex: "Rental", condo: "STR", townhome: "Rental",
};

const AI_REASONS = [
  "8% below comps + positive cash flow in a BUY market. Price dropped $18K last week — seller is motivated.",
  "Highest cap rate in ZIP 78745 this month. DOM is 2x the area average — negotiate hard.",
  "Duplex in a BUY zone with 1% rule pass. Rent growth 8.2% YoY means cash flow increases every year.",
];

function buildProperties(): DiscoverProperty[] {
  const rand = seededRand(30781);
  const types = ["sfr", "duplex", "triplex", "fourplex", "condo", "townhome"];
  const props: DiscoverProperty[] = [];

  for (let i = 0; i < 20; i++) {
    const loc = CITIES[i % CITIES.length]!;
    const priceMult = 0.6 + rand() * 0.9;
    const price = Math.round((loc.medianPrice * priceMult) / 1000) * 1000;
    const beds = Math.min(5, Math.max(2, 2 + Math.round(rand() * 2)));
    const baths = Math.min(beds, Math.max(1, 1 + Math.round(rand() * 2)));
    const sqft = 900 + Math.round(rand() * 1600) + beds * 150;
    const dom = 3 + Math.round(rand() * 80);
    const propertyType = types[Math.floor(rand() * types.length)]!;
    const rentMult = 0.85 + rand() * 0.35;
    const monthlyRent = Math.max(1200, Math.round((price * 0.0075 + 400) * rentMult / 50) * 50);
    const estimatedExpenses = Math.round(monthlyRent * (0.38 + rand() * 0.08));
    const mr = 0.0725 / 12; const n = 360; const loanAmt = price * 0.80;
    const estimatedMortgage = Math.round(loanAmt * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1));
    const estimatedCF = monthlyRent - estimatedExpenses - estimatedMortgage;
    const capRate = Math.round(((monthlyRent - estimatedExpenses) * 12 / price) * 1000) / 10;
    const grm = Math.round((price / (monthlyRent * 12)) * 10) / 10;
    const onePercent = monthlyRent >= price * 0.01;

    // Intelligence: comp comparison
    const compMedian = Math.round(price * (1 + (rand() * 0.2 - 0.04))); // skew slightly above
    const belowComps = Math.round(((price - compMedian) / compMedian) * 1000) / 10;

    // Price drops
    const hasDrop = rand() > 0.6;
    const priceDropPct = hasDrop ? Math.round(rand() * 8 * 10) / 10 : 0;
    const priceDropAmt = Math.round(price * priceDropPct / 100);
    const dropDay = 1 + Math.floor(rand() * 14);
    const priceDropDate = hasDrop ? `Mar ${dropDay}` : "";

    // Neighborhood
    const walkScore = 30 + Math.round(rand() * 65);
    const schoolScore = Math.min(10, Math.max(2, Math.round(3 + rand() * 7)));
    const crimeRisk = rand() > 0.7 ? "high" as const : rand() > 0.3 ? "medium" as const : "low" as const;
    const floodZone = rand() > 0.85;
    const hoaMonthly = propertyType === "condo" ? 150 + Math.round(rand() * 300) : (rand() > 0.7 ? 50 + Math.round(rand() * 100) : 0);
    const rentGrowthYoY = Math.round((2 + rand() * 8) * 10) / 10;
    const neighAppreciation = Math.round((1 + rand() * 12) * 10) / 10;

    // Score
    const compBonus = belowComps < -5 ? 15 : belowComps < 0 ? 8 : 0;
    const grmBonus = grm < 12 ? 18 : grm < 15 ? 10 : 0;
    const score = Math.min(98, Math.max(22,
      25 + compBonus + grmBonus + (onePercent ? 15 : 0) +
      (estimatedCF > 400 ? 14 : estimatedCF > 0 ? 8 : 0) +
      (capRate > 7 ? 12 : capRate > 5 ? 6 : 0) +
      (loc.signal === "BUY" ? 10 : loc.signal === "HOLD" ? 5 : 0) +
      (priceDropPct > 3 ? 8 : 0)
    ));

    const aiPick = i < 3; // top 3 are AI picks

    props.push({
      id: `disc-${i}`, address: `${1200 + Math.round(rand() * 8600)} ${STREETS[i % STREETS.length]}`,
      city: loc.city, state: loc.state, zip: loc.zip,
      price, beds, baths, sqft, propertyType, dom,
      monthlyRent, estimatedExpenses, estimatedMortgage,
      capRate, score, grm, onePercent, estimatedCF,
      strategy: STRATEGIES_MAP[propertyType] ?? "Rental",
      compMedian, belowComps, avgDomArea: loc.avgDom,
      priceDropPct, priceDropAmt, priceDropDate,
      walkScore, schoolScore, crimeRisk, floodZone, hoaMonthly,
      marketSignal: loc.signal, aiPick, aiReason: aiPick ? AI_REASONS[i] ?? "" : "",
      rentGrowthYoY, neighAppreciation,
    });
  }

  return props.sort((a, b) => b.score - a.score);
}

const ALL_PROPERTIES = buildProperties();

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtK = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(n);
const fmtFull = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n));
const fmtCF = (n: number) => (n < 0 ? `(${fmtFull(n)})` : `+${fmtFull(n)}`);

function scoreColor(s: number) { return s >= 70 ? CHART_COLORS.emerald : s >= 50 ? CHART_COLORS.amber : CHART_COLORS.rose; }
function signalBadge(sig: "BUY" | "HOLD" | "SELL") {
  const colors = { BUY: "bg-emerald/10 text-emerald border-emerald/20", HOLD: "bg-amber/10 text-amber border-amber/20", SELL: "bg-rose/10 text-rose border-rose/20" };
  return colors[sig];
}

// ─── Market Snapshot (the value-add context) ──────────────────────────────────

function MarketSnapshot({ properties }: { properties: DiscoverProperty[] }) {
  const avgCap = properties.length > 0 ? properties.reduce((s, p) => s + p.capRate, 0) / properties.length : 0;
  const avgCF = properties.length > 0 ? properties.reduce((s, p) => s + p.estimatedCF, 0) / properties.length : 0;
  const avgDOM = properties.length > 0 ? Math.round(properties.reduce((s, p) => s + p.dom, 0) / properties.length) : 0;
  const medPrice = properties.length > 0 ? [...properties].sort((a, b) => a.price - b.price)[Math.floor(properties.length / 2)]!.price : 0;
  const withDrops = properties.filter(p => p.priceDropPct > 0).length;
  const pctDropping = properties.length > 0 ? Math.round((withDrops / properties.length) * 100) : 0;
  const buyMarkets = new Set(properties.filter(p => p.marketSignal === "BUY").map(p => p.city)).size;

  const metrics = [
    { label: "Median Price", value: fmtK(medPrice), sub: "across all results", icon: DollarSign },
    {
      label: <><Term id="cap-rate" value={avgCap}>Cap Rate</Term></>,
      labelText: "Avg Cap Rate",
      value: `${avgCap.toFixed(1)}%`,
      sub: avgCap >= 6 ? "above national avg 5.2%" : "near national avg 5.2%",
      icon: Percent,
      color: avgCap >= 6 ? CHART_COLORS.emerald : CHART_COLORS.amber,
    },
    { label: "Avg Cash Flow", value: fmtCF(avgCF), sub: avgCF > 0 ? "positive — deals here work" : "negative — tighten your criteria", icon: Activity, color: avgCF > 0 ? CHART_COLORS.emerald : CHART_COLORS.rose },
    {
      label: <><Term id="dom" value={avgDOM}>Avg DOM</Term></>,
      labelText: "Avg DOM",
      value: `${avgDOM}d`,
      sub: avgDOM < 30 ? "fast market — act quickly" : "buyers have leverage",
      icon: Clock,
    },
    { label: "Price Cuts", value: `${pctDropping}%`, sub: `${withDrops} properties recently reduced`, icon: TrendingDown, color: withDrops > 3 ? CHART_COLORS.emerald : CHART_COLORS.amber },
    { label: "BUY Markets", value: `${buyMarkets}`, sub: `${buyMarkets} of ${new Set(properties.map(p => p.city)).size} cities have BUY signal`, icon: Zap, color: CHART_COLORS.emerald },
  ];

  return (
    <div className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-surface-border bg-surface-card">
      {metrics.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <m.icon className="w-3 h-3 text-content-disabled" aria-hidden="true" />
            <span className="text-[9px] text-content-tertiary uppercase tracking-wider">
              {typeof m.label === "string" ? m.label : m.label}
            </span>
          </div>
          <p className="font-mono text-[14px] font-bold tabular-nums" style={{ color: (m as { color?: string }).color ?? "#FAFAFA" }}>{m.value}</p>
          <p className="text-[9px] text-content-disabled leading-tight mt-0.5">{m.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── AI Deal Scout ────────────────────────────────────────────────────────────

function AIDealScout({ picks }: { picks: DiscoverProperty[] }) {
  if (picks.length === 0) return null;
  return (
    <div className="px-4 py-3 border-b border-surface-border bg-surface">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-gold" aria-hidden="true" />
        </div>
        <span className="text-[12px] font-semibold text-gold">AI Deal Scout</span>
        <span className="text-[10px] text-content-disabled">— top {picks.length} picks based on your criteria</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {picks.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.2 }}
            className="rounded-lg border border-gold/15 bg-gold/[0.03] p-2.5"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="text-[12px] font-semibold text-content-primary truncate">{p.address}</p>
                <p className="text-[10px] text-content-tertiary">{p.city}, {p.state} {p.zip}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: scoreColor(p.score) }}>{p.score}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${signalBadge(p.marketSignal)}`}
                  title="Market signal based on 5-signal convergence model"
                >
                  {p.marketSignal}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums mb-1.5">
              <span className="text-content-primary font-semibold">{fmtK(p.price)}</span>
              <span style={{ color: CHART_COLORS.emerald }}>{p.capRate.toFixed(1)}%</span>
              <span style={{ color: p.estimatedCF >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose }}>{fmtCF(p.estimatedCF)}/mo</span>
            </div>
            <p className="text-[10px] text-content-secondary leading-snug border-t border-gold/10 pt-1.5">
              <Star className="w-3 h-3 inline text-gold mr-1" aria-hidden="true" />
              {p.aiReason}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Property Row (enriched) ──────────────────────────────────────────────────

function PropertyRow({ property: p, index }: { property: DiscoverProperty; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const domContext = p.dom < p.avgDomArea * 0.7 ? "Moving fast" : p.dom > p.avgDomArea * 1.5 ? "Stale — negotiate" : "Normal pace";
  const domColor = p.dom < p.avgDomArea * 0.7 ? CHART_COLORS.rose : p.dom > p.avgDomArea * 1.5 ? CHART_COLORS.emerald : CHART_COLORS.amber;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="border-b border-surface-border hover:bg-white/[0.015] transition-colors"
      role="article"
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score + market signal */}
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-mono tabular-nums border"
            style={{ borderColor: scoreColor(p.score) + "40", color: scoreColor(p.score), backgroundColor: scoreColor(p.score) + "12" }}>
            {p.score}
          </div>
          <span
            className={`text-[8px] font-bold px-1 rounded ${signalBadge(p.marketSignal)}`}
            title="Market signal based on 5-signal convergence model"
          >
            {p.marketSignal}
          </span>
        </div>

        {/* Address + intelligence tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-content-primary truncate">{p.address}</p>
            {p.aiPick && <Sparkles className="w-3 h-3 text-gold shrink-0" aria-label="AI pick" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-content-tertiary flex-wrap">
            <span>{p.city}, {p.state} {p.zip}</span>
            <span className="text-content-disabled">·</span>
            <span>{p.beds}bd/{p.baths}ba · {p.sqft.toLocaleString()}sf</span>

            {/* Intelligence badges */}
            {p.belowComps < -3 && (
              <span
                className="text-emerald font-semibold flex items-center gap-0.5"
                title="Comparable recent sales used to estimate fair market value"
              >
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
                {Math.abs(p.belowComps).toFixed(0)}% below{" "}
                <span title="Comparable recent sales used to estimate fair market value">comps</span>
              </span>
            )}
            {p.priceDropPct > 0 && (
              <span className="text-emerald font-semibold flex items-center gap-0.5">
                <DollarSign className="w-3 h-3" aria-hidden="true" />
                Cut {fmtK(p.priceDropAmt)} ({p.priceDropPct.toFixed(0)}%) {p.priceDropDate}
              </span>
            )}
            {p.floodZone && (
              <span className="text-rose font-semibold flex items-center gap-0.5">
                <Droplets className="w-3 h-3" aria-hidden="true" />
                Flood zone
              </span>
            )}
            {p.crimeRisk === "high" && (
              <span className="text-rose font-semibold flex items-center gap-0.5">
                <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                High crime
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-[14px] font-bold font-mono tabular-nums text-content-primary">{fmtK(p.price)}</p>
          {p.belowComps < 0 && (
            <p className="text-[9px] text-emerald">
              vs {fmtK(p.compMedian)}{" "}
              <span title="Comparable recent sales used to estimate fair market value">comp</span> median
            </p>
          )}
          {p.belowComps >= 0 && <p className="text-[9px] text-rose">{p.belowComps.toFixed(0)}% above comps</p>}
        </div>

        {/* Key metrics */}
        <div className="shrink-0 hidden md:flex gap-3 text-right">
          <div>
            <p className="text-[9px] text-content-disabled">
              <Term id="cap-rate" value={p.capRate}>Cap</Term>
            </p>
            <p className="text-[12px] font-mono tabular-nums font-semibold" style={{ color: p.capRate >= 6 ? CHART_COLORS.emerald : p.capRate >= 4 ? CHART_COLORS.amber : CHART_COLORS.rose }}>
              {p.capRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[9px] text-content-disabled">
              <Term id="coc" value={p.estimatedCF}>CF/mo</Term>
            </p>
            <p className="text-[12px] font-mono tabular-nums font-semibold" style={{ color: p.estimatedCF >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose }}>
              {fmtCF(p.estimatedCF)}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-content-disabled">
              <Term id="dom" value={p.dom}>DOM</Term>
            </p>
            <p className="text-[12px] font-mono tabular-nums" style={{ color: domColor }}>
              {p.dom}d
            </p>
          </div>
        </div>

        {/* Quick screens */}
        <div className="shrink-0 hidden lg:flex items-center gap-1.5">
          {[
            { label: "GRM", pass: p.grm < 15 },
            { label: "1%", pass: p.onePercent },
            { label: "CF+", pass: p.estimatedCF > 0 },
          ].map(({ label, pass }) => (
            <span key={label} title={`${label}: ${pass ? "pass" : "fail"}`} className="text-[9px] font-mono flex items-center gap-0.5"
              style={{ color: pass ? CHART_COLORS.emerald : CHART_COLORS.rose }}>
              {pass ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {label === "GRM" ? (
                <Term id="grm" value={p.grm}>GRM</Term>
              ) : label === "1%" ? (
                <span title="Monthly rent should be at least 1% of purchase price — a quick screening rule for cash flow properties">1%</span>
              ) : (
                label
              )}
            </span>
          ))}
        </div>

        {/* Action */}
        <Link
          href={`/dashboard/analyze?address=${encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip}`)}`}
          className="shrink-0 btn-primary text-[10px] px-2 py-1 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          Analyze <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Expanded detail — neighborhood + cash flow context */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 border-t border-surface-border/50 bg-surface-card/30">
              {/* Comp analysis */}
              <div>
                <p
                  className="text-[9px] text-content-disabled uppercase tracking-wider mb-0.5"
                  title="Comparable recent sales used to estimate fair market value"
                >
                  vs Comps
                </p>
                <p className="text-[12px] font-mono font-semibold" style={{ color: p.belowComps < 0 ? CHART_COLORS.emerald : CHART_COLORS.rose }}>
                  {p.belowComps < 0 ? `${Math.abs(p.belowComps).toFixed(1)}% below` : `${p.belowComps.toFixed(1)}% above`}
                </p>
                <p className="text-[9px] text-content-disabled">
                  <span title="Comparable recent sales used to estimate fair market value">Comp</span> median: {fmtK(p.compMedian)}
                </p>
              </div>
              {/* DOM context */}
              <div>
                <p className="text-[9px] text-content-disabled uppercase tracking-wider mb-0.5">
                  <Term id="dom" value={p.dom}>DOM</Term> Context
                </p>
                <p className="text-[12px] font-mono font-semibold" style={{ color: domColor }}>{p.dom}d vs {p.avgDomArea}d avg</p>
                <p className="text-[9px] text-content-disabled">{domContext}</p>
              </div>
              {/* Neighborhood */}
              <div>
                <p className="text-[9px] text-content-disabled uppercase tracking-wider mb-0.5">
                  <Term id="walk-score" value={p.walkScore}>Walk Score</Term>
                </p>
                <p className="text-[12px] font-mono font-semibold" style={{ color: p.walkScore >= 70 ? CHART_COLORS.emerald : p.walkScore >= 40 ? CHART_COLORS.amber : CHART_COLORS.rose }}>
                  {p.walkScore}/100
                </p>
                <p className="text-[9px] text-content-disabled">{p.walkScore >= 70 ? "Walkable — higher rents" : p.walkScore >= 40 ? "Somewhat walkable" : "Car-dependent"}</p>
              </div>
              {/* Schools */}
              <div>
                <p className="text-[9px] text-content-disabled uppercase tracking-wider mb-0.5">Schools</p>
                <p className="text-[12px] font-mono font-semibold" style={{ color: p.schoolScore >= 7 ? CHART_COLORS.emerald : p.schoolScore >= 4 ? CHART_COLORS.amber : CHART_COLORS.rose }}>
                  {p.schoolScore}/10
                </p>
                <p className="text-[9px] text-content-disabled">{p.schoolScore >= 7 ? "Strong — family demand" : "Average"}</p>
              </div>
              {/* Rent growth */}
              <div>
                <p className="text-[9px] text-content-disabled uppercase tracking-wider mb-0.5">
                  <Term id="appreciation" value={p.rentGrowthYoY}>Rent Growth</Term>
                </p>
                <p className="text-[12px] font-mono font-semibold text-emerald">
                  +{p.rentGrowthYoY.toFixed(1)}% <Term id="yoy-appreciation">YoY</Term>
                </p>
                <p className="text-[9px] text-content-disabled">Your CF grows each year</p>
              </div>
              {/* Appreciation */}
              <div>
                <p className="text-[9px] text-content-disabled uppercase tracking-wider mb-0.5">
                  <Term id="yoy-appreciation" value={p.neighAppreciation}>Appreciation</Term>
                </p>
                <p className="text-[12px] font-mono font-semibold text-emerald">+{p.neighAppreciation.toFixed(1)}% YoY</p>
                <p className="text-[9px] text-content-disabled">Neighborhood trending up</p>
              </div>
              {/* Risk flags */}
              {(p.floodZone || p.crimeRisk === "high" || p.hoaMonthly > 200) && (
                <div className="col-span-2 md:col-span-4 lg:col-span-6 flex items-center gap-3 pt-1.5 border-t border-surface-border/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0" aria-hidden="true" />
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {p.floodZone && <span className="text-rose">Flood zone — insurance +$1,200-2,400/yr</span>}
                    {p.crimeRisk === "high" && <span className="text-rose">High crime area — affects tenant quality and appreciation</span>}
                    {p.hoaMonthly > 200 && <span className="text-amber">HOA {fmtFull(p.hoaMonthly)}/mo — eats into cash flow</span>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [strategy, setStrategy] = useState<Strategy>("All");
  const [priceRange, setPriceRange] = useState(0);
  const [scoreMin, setScoreMin] = useState(0);
  const [quickScreen, setQuickScreen] = useState<"grm" | "one" | "cf" | "drops" | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const PRICE_RANGES = [
    { label: "Any", min: 0, max: Infinity },
    { label: "<$300K", min: 0, max: 300_000 },
    { label: "$300-500K", min: 300_000, max: 500_000 },
    { label: ">$500K", min: 500_000, max: Infinity },
  ];
  const SCORE_MINS = [
    { label: "Any", min: 0 },
    { label: "55+", min: 55 },
    { label: "75+", min: 75 },
  ];

  const priceOpt = PRICE_RANGES[priceRange]!;
  const scoreOpt = SCORE_MINS[scoreMin]!;

  const filtered = useMemo(() => {
    let list = ALL_PROPERTIES.filter((p) => {
      if (strategy !== "All" && p.strategy !== strategy) return false;
      if (p.price < priceOpt.min || p.price > priceOpt.max) return false;
      if (p.score < scoreOpt.min) return false;
      if (quickScreen === "grm" && p.grm >= 15) return false;
      if (quickScreen === "one" && !p.onePercent) return false;
      if (quickScreen === "cf" && p.estimatedCF <= 0) return false;
      if (quickScreen === "drops" && p.priceDropPct <= 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "score": return b.score - a.score;
        case "price": return a.price - b.price;
        case "capRate": return b.capRate - a.capRate;
        case "cashFlow": return b.estimatedCF - a.estimatedCF;
        case "belowComps": return a.belowComps - b.belowComps;
        case "dom": return b.dom - a.dom;
        default: return 0;
      }
    });
  }, [strategy, priceOpt.min, priceOpt.max, scoreOpt.min, quickScreen, sortKey]);

  const aiPicks = useMemo(() => filtered.filter(p => p.aiPick).slice(0, 3), [filtered]);

  const chip = "text-[10px] font-medium px-2 py-1 rounded-full border transition-colors cursor-pointer whitespace-nowrap";
  const chipOn = "bg-gold/10 border-gold/30 text-gold";
  const chipOff = "bg-transparent border-surface-border text-content-tertiary hover:text-content-secondary";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-surface">
      {/* Market Snapshot — the context that makes filters meaningful */}
      <MarketSnapshot properties={filtered} />

      {/* AI Deal Scout — top picks with reasoning */}
      <AIDealScout picks={aiPicks} />

      {/* Filter bar */}
      <div className="shrink-0 px-4 py-2 border-b border-surface-border flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <SlidersHorizontal className="w-3 h-3 text-content-disabled shrink-0" aria-hidden="true" />
        {STRATEGIES.map((s) => (
          <button key={s} onClick={() => setStrategy(s)}
            className={`${chip} ${strategy === s ? chipOn : chipOff}`} aria-pressed={strategy === s}>{s}</button>
        ))}
        <span className="w-px h-3 bg-surface-border shrink-0" />
        {PRICE_RANGES.map((opt, i) => (
          <button key={opt.label} onClick={() => setPriceRange(i)}
            className={`${chip} ${priceRange === i ? chipOn : chipOff}`}>{opt.label}</button>
        ))}
        <span className="w-px h-3 bg-surface-border shrink-0" />
        {SCORE_MINS.map((opt, i) => (
          <button key={opt.label} onClick={() => setScoreMin(i)}
            className={`${chip} ${scoreMin === i ? chipOn : chipOff}`}>Score {opt.label}</button>
        ))}
        <span className="w-px h-3 bg-surface-border shrink-0" />
        {([
          { key: "grm" as const, label: "GRM<15" },
          { key: "one" as const, label: "1% Rule" },
          { key: "cf" as const, label: "+Cash Flow" },
          { key: "drops" as const, label: "Price Cuts" },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setQuickScreen(quickScreen === key ? null : key)}
            className={`${chip} ${quickScreen === key ? chipOn : chipOff}`}>{label}</button>
        ))}
      </div>

      {/* List header with sort + count */}
      <div className="shrink-0 px-4 py-1.5 border-b border-surface-border flex items-center justify-between bg-surface-card">
        <p className="text-[11px] text-content-secondary">
          <span className="font-semibold text-content-primary font-mono">{filtered.length}</span> properties
          <span className="text-content-disabled"> · Click row to expand details</span>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-content-disabled">Sort:</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[10px] bg-surface-elevated border border-surface-border text-content-secondary rounded px-1.5 py-0.5 appearance-none cursor-pointer focus:outline-none"
            aria-label="Sort by">
            <option value="score">Score</option>
            <option value="price">Price (low)</option>
            <option value="capRate">Cap Rate</option>
            <option value="cashFlow">Cash Flow</option>
            <option value="belowComps">Below Comps</option>
            <option value="dom">Days on Market</option>
          </select>
        </div>
      </div>

      {/* Property list — full width, scrollable */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-content-tertiary">
            <XCircle className="w-8 h-8 opacity-40" />
            <p className="text-[12px]">No properties match. Try loosening filters.</p>
            <button onClick={() => { setStrategy("All"); setPriceRange(0); setScoreMin(0); setQuickScreen(null); }}
              className="text-[11px] text-gold hover:underline">Clear all</button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((p, i) => (
              <PropertyRow key={p.id} property={p} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
