"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  CheckCircle2, XCircle, Circle, ArrowRight, ArrowLeft,
  Shield, TrendingUp, AlertTriangle, Target, BarChart3,
  Building2, Zap, Clock, Search, Bell, ChevronDown, ChevronUp,
  Save, BookOpen, Eye,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import MetricCard from "@/components/ui/MetricCard";
import { formatCurrency } from "@/lib/utils/format";
import { generateNearbyProperties } from "@/lib/mock/nearby-properties";
import DecisionRule, { capRateRule, dscrRule, cashFlowRule, priceVsCompsRule, domRule } from "@/components/ui/DecisionRule";
import {
  ALL_MARKETS, PORTFOLIO_PROPERTIES, type MarketDef,
  confluenceScore, supplyVerdict, demandVerdict, borderColor,
  buildSignals, getTimingVerdict, getRiskLevel, riskBadgeVariant,
  getFinalVerdict, verdictColor, type TimingVerdict,
} from "@/lib/mock/workflow-data";
import { useBuyBoxStore, type PropertyCandidate } from "@/lib/stores/buybox-store";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useOracleStore } from "@/lib/stores/oracle-store";
import DecisionCapture from "@/components/ui/DecisionCapture";
import BuyBoxEditor from "@/components/ui/BuyBoxEditor";

// ---------------------------------------------------------------------------
// Confluence API types (matches MasterConfluenceResult from orchestrator)
// ---------------------------------------------------------------------------

interface ConfluenceVerdictShape {
  signal: "STRONG_BUY" | "BUY" | "LEAN_BUY" | "NEUTRAL" | "LEAN_PASS" | "PASS" | "HARD_PASS";
  label: string;
  color: "green" | "gold" | "red";
}

interface ConfluenceEngineVote {
  engine: string;
  vote: "bullish" | "neutral" | "bearish";
  score: number;
  verdict: string;
  weight: number;
}

interface ConfluenceAPIResult {
  probabilityScore: number;
  confidence: number;
  verdict: ConfluenceVerdictShape;
  votes: ConfluenceEngineVote[];
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  agreementLevel: "unanimous" | "strong" | "majority" | "split" | "conflicting";
  agreementMultiplier: number;
  independentProbability: number;
  convergenceNarrative: string;
  strongestSignal: string;
  weakestLink: string;
  contradictions: string[];
  reinforcements: string[];
  decision: string;
  nextSteps: string[];
  timeframe: string;
  revisitTriggers: string[];
}

/** Build the POST body for /api/confluence from a MarketDef */
function buildConfluencePayload(market: MarketDef) {
  return {
    market: {
      zip: market.zip,
      name: market.name,
      state: market.state,
      hyperScore: market.hyperScore,
      demographicScore: Math.round(market.hyperScore * 0.9),
      economicScore: Math.round(market.hyperScore * 0.85 + 5),
      infrastructureScore: Math.round(market.hyperScore * 0.8 + 8),
      capRate: market.capRate,
      medianPrice: market.medianPrice,
      priceChange: market.popGrowth + market.jobGrowth > 5 ? 6 : market.popGrowth + market.jobGrowth > 3 ? 3 : 0,
      popGrowth: market.popGrowth,
      jobGrowth: market.jobGrowth,
      inventory: market.inventory,
      daysOnMarket: market.inventory < 2 ? 22 : market.inventory < 3 ? 35 : 52,
    },
    signals: {
      compositeScore: market.hyperScore - 50,
      compositeScorePrevMonth: market.hyperScore - 53,
      probability: Math.min(0.95, market.hyperScore / 100),
      leadingLayerScore: market.hyperScore - 45,
      leadingConcordance: Math.min(0.95, market.hyperScore / 110),
      bearishCount: Math.max(0, Math.round((100 - market.hyperScore) / 20)),
      totalSignals: 12,
      bearishConcordance: Math.min(0.8, (100 - market.hyperScore) / 150),
    },
    rates: {
      mortgageRate30yr: 6.95,
      mortgageRateChange6mo: -0.25,
      fedFundsRate: 5.25,
      rateDirection: "stable" as const,
    },
    portfolio: {
      properties: PORTFOLIO_PROPERTIES.map((p) => ({
        address: p.address,
        city: p.city,
        state: p.state,
        value: p.value,
        monthlyCashFlow: p.cashFlow,
        capRate: p.capRate,
        appreciation: 3.5,
        purchasePrice: Math.round(p.value * 0.85),
        monthlyRent: Math.round(p.cashFlow + p.value * 0.005),
        monthlyExpenses: Math.round(p.value * 0.003),
        mortgage: Math.round(p.value * 0.005),
      })),
      goalMonthlyCashFlow: 3000,
    },
  };
}

// ---------------------------------------------------------------------------
// Loading skeleton for confluence computation
// ---------------------------------------------------------------------------

function ConfluenceSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full animate-pulse bg-money-400/30" />
        <span className="text-sm text-money-400 animate-pulse">{label}</span>
      </div>
      <div className="space-y-3">
        <div className="h-12 animate-pulse bg-surface-elevated rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 animate-pulse bg-surface-elevated rounded-lg" />
          <div className="h-20 animate-pulse bg-surface-elevated rounded-lg" />
          <div className="h-20 animate-pulse bg-surface-elevated rounded-lg" />
        </div>
        <div className="h-32 animate-pulse bg-surface-elevated rounded-lg" />
        <div className="h-24 animate-pulse bg-surface-elevated rounded-lg" />
      </div>
    </div>
  );
}

type StepStatus = "completed" | "failed" | "current" | "upcoming";

const STEP_DEFS = [
  { title: "\u9F8D\u7A74 Market Discovery", icon: Search },
  { title: "\u4E94\u884C Five Elements", icon: BarChart3 },
  { title: "\u7389\u77F3 Jade Test", icon: Building2 },
  { title: "\u5929\u6642 Heaven\u2019s Timing", icon: Clock },
  { title: "\u8B77\u6CD5 Guardian", icon: Shield },
  { title: "\u5BB6\u696D Empire Fit", icon: Target },
  { title: "\u5929\u6A5F The Reading", icon: Zap },
] as const;

// ---------------------------------------------------------------------------
// Step Navigation
// ---------------------------------------------------------------------------

function StepNav({ currentStep, statuses, onGoTo }: { currentStep: number; statuses: StepStatus[]; onGoTo: (s: number) => void }) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col gap-1 w-56 flex-shrink-0">
        {STEP_DEFS.map((def, i) => {
          const st = statuses[i];
          const clickable = st !== "upcoming";
          return (
            <button key={i} disabled={!clickable} onClick={() => clickable && onGoTo(i)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                st === "current" ? "bg-money-900/40 border border-money-800/50" :
                clickable ? "hover:bg-surface-elevated" : "opacity-40 cursor-not-allowed"
              }`}>
              {st === "completed" ? <CheckCircle2 className="h-5 w-5 text-money-400" /> :
               st === "failed" ? <XCircle className="h-5 w-5 text-red-400" /> :
               st === "current" ? <Circle className="h-5 w-5 text-money-400 animate-pulse-glow" /> :
               <Circle className="h-5 w-5 text-gray-600" />}
              <span className={st === "current" ? "text-money-400 font-medium" : st === "completed" ? "text-gray-300" : st === "failed" ? "text-red-400" : "text-gray-600"}>
                {i + 1}. {def.title}
              </span>
            </button>
          );
        })}
      </div>
      {/* Mobile top bar */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-3">
        {STEP_DEFS.map((_, i) => {
          const st = statuses[i];
          return (
            <button key={i} disabled={st === "upcoming"} onClick={() => st !== "upcoming" && onGoTo(i)}
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                st === "completed" ? "bg-money-900/60 border-money-400 text-money-400" :
                st === "failed" ? "bg-red-900/60 border-red-400 text-red-400" :
                st === "current" ? "border-money-400 text-money-400 animate-pulse-glow" :
                "border-gray-700 text-gray-600 cursor-not-allowed"
              }`}>
              {st === "completed" ? <CheckCircle2 className="h-4 w-4" /> : st === "failed" ? <XCircle className="h-4 w-4" /> : i + 1}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step renderers (each returns JSX for its step)
// ---------------------------------------------------------------------------

function StepMarketScan({ selectedIdx, onSelect, onAdvance, confluenceResult, confluenceLoading }: {
  selectedIdx: number | null; onSelect: (i: number) => void; onAdvance: (pass: boolean) => void;
  confluenceResult: ConfluenceAPIResult | null; confluenceLoading: boolean;
}) {
  const selected = selectedIdx !== null ? ALL_MARKETS[selectedIdx] : null;
  const gateFailed = selected !== null && selected.hyperScore <= 55;
  const passingNames = ALL_MARKETS.filter((m) => m.hyperScore > 55).map((m) => m.name).join(", ");

  // Use real confluence score when available, fall back to mock
  const getCS = (m: MarketDef) => {
    if (confluenceResult && selected && m.zip === selected.zip) {
      return confluenceResult.probabilityScore;
    }
    return confluenceScore(m.hyperScore);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold text-gray-100">{"\u9F8D\u7A74"} Dragon&apos;s Lair &mdash; Where should you invest?</h2>
        <p className="text-sm text-gray-500 mt-1">Select a market to begin. Markets scoring above 55 qualify.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_MARKETS.map((m, i) => { const cs = getCS(m); return (
          <button key={m.zip} onClick={() => onSelect(i)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${borderColor(cs)} ${selectedIdx === i ? "bg-surface-elevated ring-2 ring-money-400/30" : "bg-surface-card hover:bg-surface-elevated"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-200">{m.name}, {m.state}</span>
              <span className={`font-mono text-lg font-bold ${m.hyperScore > 65 ? "text-money-400" : m.hyperScore > 45 ? "text-gold-400" : "text-red-400"}`}>{m.hyperScore}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-500">Conviction</span>
              {confluenceLoading && selectedIdx === i ? (
                <span className="text-right"><span className="inline-block h-3 w-8 animate-pulse bg-surface-elevated rounded" /></span>
              ) : (
                <span className="text-gray-300 font-mono text-right">{cs}%{confluenceResult && selectedIdx === i && <span className="text-money-400/50 ml-1 text-[10px]">live</span>}</span>
              )}
              <span className="text-gray-500">Supply</span><span className={`text-right ${m.inventory < 2 ? "text-money-400" : m.inventory < 3 ? "text-gold-400" : "text-red-400"}`}>{supplyVerdict(m.inventory)}</span>
              <span className="text-gray-500">Demand</span><span className={`text-right ${m.popGrowth + m.jobGrowth > 5.5 ? "text-money-400" : m.popGrowth + m.jobGrowth > 3.5 ? "text-gold-400" : "text-red-400"}`}>{demandVerdict(m.popGrowth, m.jobGrowth)}</span>
              <span className="text-gray-500">Cap Rate</span><span className={`font-mono text-right ${m.capRate > 6 ? "text-money-400" : m.capRate > 5 ? "text-gold-400" : "text-red-400"}`}>{m.capRate}%</span>
            </div>
            {/* Decision hint */}
            <p className={`text-[10px] mt-2 ${cs > 65 ? "text-money-400/70" : cs > 45 ? "text-gold-400/70" : "text-red-400/70"}`}>
              {cs > 65 ? `Supply ${m.inventory < 2 ? "tight" : "balanced"} + Demand ${m.popGrowth + m.jobGrowth > 5.5 ? "strong" : "moderate"} = ${m.inventory < 2 && m.popGrowth + m.jobGrowth > 5.5 ? "Price appreciation likely" : "Stable market"}`
               : cs > 45 ? "Mixed signals — investigate before committing"
               : "Weak fundamentals — look for distressed pricing or skip"}</p>
          </button>);
        })}
      </div>
      {confluenceLoading && <div className="p-4 bg-money-900/20 border border-money-700/40 rounded-lg text-sm text-money-400 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full animate-pulse bg-money-400/30" />
        Computing conviction across 73 components...
      </div>}
      {gateFailed && <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg text-sm text-red-400">This market scores below threshold. Consider: {passingNames}</div>}
      <div className="flex justify-end">
        <Button disabled={!selected || confluenceLoading} onClick={() => selected && onAdvance(selected.hyperScore > 55)}>
          {confluenceLoading ? "Computing..." : "Analyze This Market"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepSignalDeepDive({ market, onBack, onAdvance, confluenceResult, confluenceLoading }: {
  market: MarketDef; onBack: () => void; onAdvance: (pass: boolean) => void;
  confluenceResult: ConfluenceAPIResult | null; confluenceLoading: boolean;
}) {
  // Use real stacked signal data from confluence when available, fall back to mock
  const mockSignals = buildSignals(market.hyperScore);

  const bullishPct = confluenceResult
    ? Math.round((confluenceResult.bullishCount / confluenceResult.votes.length) * 100)
    : mockSignals.bullish;
  const bearishPct = confluenceResult
    ? Math.round((confluenceResult.bearishCount / confluenceResult.votes.length) * 100)
    : mockSignals.bearish;
  const neutralPct = confluenceResult
    ? Math.round((confluenceResult.neutralCount / confluenceResult.votes.length) * 100)
    : mockSignals.neutral;

  // Map real engine votes to signal items for display
  const realSignals = confluenceResult ? confluenceResult.votes.map((v) => ({
    name: v.engine,
    dir: v.vote === "bullish" ? "\u2191" : v.vote === "bearish" ? "\u2193" : "\u2192",
    score: v.score,
  })) : null;

  const leading = realSignals?.slice(0, 2) ?? mockSignals.leading;
  const concurrent = realSignals?.slice(2, 4) ?? mockSignals.concurrent;
  const macro = realSignals?.slice(4) ?? mockSignals.macro;
  const sections: [string, typeof mockSignals.leading][] = [["Leading", leading], ["Concurrent", concurrent], ["Macro", macro]];

  // Map real reinforcements/contradictions to correlation pairs
  const realPairs = confluenceResult ? [
    ...confluenceResult.reinforcements.map((r) => ({ pair: "Reinforcement", aligned: true, note: r })),
    ...confluenceResult.contradictions.map((c) => ({ pair: "Contradiction", aligned: false, note: c })),
  ] : null;
  const pairs = realPairs && realPairs.length > 0 ? realPairs : mockSignals.pairs;

  const hasDivergence = confluenceResult
    ? confluenceResult.agreementLevel === "conflicting" || confluenceResult.agreementLevel === "split"
    : mockSignals.hasDivergence;

  const gatePass = bullishPct > 50 && !hasDivergence;

  if (confluenceLoading) {
    return <ConfluenceSkeleton label="Reading the Five Elements across 5 elemental forces..." />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold text-gray-100">{"\u4E94\u884C"} Five Elements &mdash; What&apos;s driving {market.name}?</h2>
        <p className="text-sm text-gray-500 mt-1">
          {confluenceResult ? "Live elemental concordance and cross-validation." : "Five Elements signal concordance and correlation check."}
        </p>
        {confluenceResult && <span className="text-[10px] text-money-400/60">Powered by 73-component {"\u5929\u610F"} Heaven&apos;s Will engine</span>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Bullish" value={`${bullishPct}%`} color="green" icon={TrendingUp} />
        <MetricCard label="Bearish" value={`${bearishPct}%`} color="red" icon={TrendingUp} />
        <MetricCard label="Neutral" value={`${neutralPct}%`} color="gray" icon={TrendingUp} />
      </div>
      {confluenceResult && (
        <div className="p-3 bg-surface-elevated rounded-lg text-sm text-gray-400">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Convergence Narrative</p>
          {confluenceResult.convergenceNarrative}
        </div>
      )}
      {sections.map(([label, items]) => (
        <Card key={label} header={label}><div className="space-y-2">{items.map((sig) => (
          <div key={sig.name} className="flex items-center gap-3">
            <span className="text-sm text-gray-300 w-36">{sig.name}</span>
            <span className={`text-lg font-bold ${sig.dir === "\u2191" ? "text-money-400" : sig.dir === "\u2193" ? "text-red-400" : "text-gold-400"}`}>{sig.dir}</span>
            <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full bg-money-500 rounded-full" style={{ width: `${Math.min(sig.score, 100)}%` }} /></div>
            <span className="text-xs font-mono text-gray-400 w-8 text-right">{sig.score}</span>
          </div>))}</div></Card>))}
      <Card header="Correlation Check"><div className="space-y-2">{pairs.map((p, idx) => (
        <div key={`${p.pair}-${idx}`} className="flex items-start gap-2 text-sm">
          {p.aligned ? <CheckCircle2 className="h-4 w-4 text-money-400 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />}
          <div><span className="font-medium text-gray-200">{p.pair}</span> &mdash; <span className="text-gray-400">{p.note}</span></div>
        </div>))}</div></Card>
      {hasDivergence && <div className="p-4 bg-gold-900/20 border border-gold-700/40 rounded-lg text-sm text-gold-400 flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{confluenceResult ? `Engine disagreement detected (${confluenceResult.agreementLevel}). ${confluenceResult.weakestLink} is the weakest link.` : "Signal divergence detected. Investigate leading indicators before proceeding."}</span></div>}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={() => onAdvance(gatePass)}>Find Deals <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function toPropertyCandidate(p: ReturnType<typeof generateNearbyProperties>[number]): PropertyCandidate {
  // Approximate cash-on-cash and DSCR from available data
  const downPayment = p.price * 0.25;
  const annualCashFlow = p.monthlyCashFlow * 12;
  const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
  const monthlyMortgage = p.price * 0.75 * 0.07 / 12; // rough estimate
  const monthlyNOI = p.monthlyCashFlow + monthlyMortgage;
  const dscr = monthlyMortgage > 0 ? monthlyNOI / monthlyMortgage : 0;
  return {
    price: p.price, capRate: p.capRate, monthlyCashFlow: p.monthlyCashFlow,
    cashOnCash, dscr, propertyType: p.propertyType.toLowerCase().replace(/[- ]/g, ""),
    bedrooms: p.bedrooms, yearBuilt: p.yearBuilt, hyperScore: p.hyperScore,
    daysOnMarket: p.daysOnMarket,
  };
}

function StepDealScreening({ market, properties, selectedIdx, onSelect, onBack, onAdvance }: {
  market: MarketDef; properties: ReturnType<typeof generateNearbyProperties>; selectedIdx: number | null;
  onSelect: (i: number) => void; onBack: () => void; onAdvance: (pass: boolean) => void;
}) {
  const matchesBox = useBuyBoxStore((s) => s.matchesBox);
  const [showBuyBoxEditor, setShowBuyBoxEditor] = useState(false);

  // Compute buy box match scores and sort properties by match score descending
  const scoredProperties = useMemo(() => {
    return properties.map((p, originalIndex) => {
      const candidate = toPropertyCandidate(p);
      const match = matchesBox(candidate);
      return { property: p, originalIndex, match };
    }).sort((a, b) => b.match.matchScore - a.match.matchScore);
  }, [properties, matchesBox]);

  const matchingCount = scoredProperties.filter((s) => s.match.passes).length;

  const sel = selectedIdx !== null ? properties[selectedIdx] : null;
  const gateFailed = sel !== null && (sel.monthlyCashFlow <= 0 || sel.capRate <= 4);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-100">{"\u7389\u77F3"} Jade Test &mdash; Find properties in {market.name}</h2>
        <p className="text-sm text-gray-500 mt-1">Select a property with positive cash flow and cap rate above 4%. Sorted by Buy Box match.</p>
      </div>
      {/* Buy Box toggle */}
      <div>
        <button
          onClick={() => setShowBuyBoxEditor((v) => !v)}
          className="flex items-center gap-2 text-xs text-gold-400 hover:text-gold-300 transition-colors"
        >
          <Target className="h-3.5 w-3.5" />
          <span>{showBuyBoxEditor ? "Hide" : "Edit"} Buy Box</span>
          <span className="text-gray-500 font-mono">({matchingCount}/{properties.length} match)</span>
          {showBuyBoxEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showBuyBoxEditor && (
          <div className="mt-3">
            <BuyBoxEditor compact onClose={() => setShowBuyBoxEditor(false)} matchCount={matchingCount} totalCount={properties.length} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scoredProperties.map(({ property: p, originalIndex: oi, match }) => (
          <button key={p.id} onClick={() => onSelect(oi)}
            className={`text-left p-4 rounded-xl border transition-all relative ${selectedIdx === oi ? "bg-surface-elevated border-money-400/60 ring-2 ring-money-400/30" : "bg-surface-card border-surface-border hover:bg-surface-elevated"}`}>
            {/* Buy box match badge */}
            <div className="flex items-center justify-between mb-1">
              {match.matchScore >= 80 && match.passes && <Badge variant="success" size="sm"><Zap className="h-3 w-3 mr-1" />Best Match</Badge>}
              <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                match.matchScore >= 75 ? "bg-money-900/40 text-money-400" :
                match.matchScore >= 50 ? "bg-gold-900/40 text-gold-400" :
                "bg-red-900/30 text-red-400"
              }`}>{match.matchScore}% match</span>
            </div>
            <p className="text-sm font-medium text-gray-200 mt-1 truncate">{p.address}</p>
            <p className="text-xs text-gray-500 mt-0.5">{p.propertyType} &middot; {p.bedrooms}bd/{p.bathrooms}ba &middot; {p.sqft.toLocaleString()}sf</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
              <span className="text-gray-500">Price</span><span className="font-mono text-gray-300 text-right">{formatCurrency(p.price)}</span>
              <span className="text-gray-500">Cap Rate</span><span className={`font-mono text-right ${p.capRate > 5 ? "text-money-400" : "text-gold-400"}`}>{p.capRate.toFixed(1)}%</span>
              <span className="text-gray-500">Cash Flow</span><span className={`font-mono text-right ${p.monthlyCashFlow > 0 ? "text-money-400" : "text-red-400"}`}>{p.monthlyCashFlow > 0 ? "+" : ""}{formatCurrency(p.monthlyCashFlow)}/mo</span>
              <span className="text-gray-500">APEX Score</span><span className={`font-mono text-right ${p.hyperScore >= 70 ? "text-money-400" : p.hyperScore >= 50 ? "text-gold-400" : "text-red-400"}`}>{p.hyperScore}</span>
            </div>
            {/* Show failed criteria if any */}
            {match.failedCriteria.length > 0 && match.failedCriteria.length <= 3 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {match.failedCriteria.map((c) => (
                  <span key={c} className="text-[10px] text-red-400/70 bg-red-900/20 px-1.5 py-0.5 rounded">{c.replace(/_/g, " ")}</span>
                ))}
              </div>
            )}
          </button>))}
      </div>
      {/* Decision Rules — show detailed analysis when property selected */}
      {sel && (
        <div className="space-y-3">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium">Decision Analysis — {sel.address}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DecisionRule {...capRateRule(sel.capRate, market.capRate, 6.5)} compact />
            <DecisionRule {...cashFlowRule(sel.monthlyCashFlow)} compact />
            <DecisionRule {...priceVsCompsRule(sel.price, sel.estimatedValue)} compact />
            <DecisionRule {...domRule(sel.daysOnMarket, 35)} compact />
          </div>
        </div>
      )}
      {gateFailed && <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg text-sm text-red-400">
        This property has {sel!.monthlyCashFlow <= 0 ? "negative cash flow" : "a cap rate below 4%"}.
        Consider: {properties.filter((p) => p.monthlyCashFlow > 0 && p.capRate > 4).map((p) => p.address).slice(0, 3).join(", ") || "expanding your search"}</div>}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button disabled={!sel} onClick={() => sel && onAdvance(sel.monthlyCashFlow > 0 && sel.capRate > 4)}>Check Timing <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function StepTimingCheck({ market, onBack, onAdvance, confluenceResult, confluenceLoading }: {
  market: MarketDef; onBack: () => void; onAdvance: (pass: boolean) => void;
  confluenceResult: ConfluenceAPIResult | null; confluenceLoading: boolean;
}) {
  const mockT = getTimingVerdict(market.hyperScore);

  // Map real timing engine verdict to our display format
  const timingVote = confluenceResult?.votes.find((v) => v.engine === "\u5929\u6642 Heaven\u2019s Timing");
  const realTimingVerdict = timingVote?.verdict;

  // Map real timing verdict strings to our TimingVerdict type
  const mapTimingVerdict = (v: string | undefined): TimingVerdict => {
    if (!v) return mockT.verdict;
    if (v === "ACT_NOW" || v === "MOVE_SOON") return "BUY_NOW";
    if (v === "GOOD_WINDOW") return "FAVORABLE";
    if (v === "NEUTRAL") return "NEUTRAL";
    return "WAIT"; // PATIENCE, WAIT_FOR_CORRECTION
  };

  const verdict = confluenceResult ? mapTimingVerdict(realTimingVerdict) : mockT.verdict;
  const isWait = verdict === "WAIT";
  const colors: Record<TimingVerdict, string> = { BUY_NOW: "text-money-400", FAVORABLE: "text-money-400", NEUTRAL: "text-gold-400", WAIT: "text-red-400" };

  // Use real timeframe from confluence when available
  const timeframeLabel = confluenceResult?.timeframe ?? (isWait ? "Wait 3-6 months" : "Window is open");

  if (confluenceLoading) {
    return <ConfluenceSkeleton label="Reading Heaven&apos;s Timing across rate, seasonal, and momentum signals..." />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold text-gray-100">{"\u5929\u6642"} Heaven&apos;s Timing &mdash; Is now the right time?</h2>
        <p className="text-sm text-gray-500 mt-1">Rate environment, seasonal factors, and timing verdict.</p>
        {confluenceResult && <span className="text-[10px] text-money-400/60">Real-time {"\u5929\u6642"} Heaven&apos;s Timing analysis (6 components)</span>}
      </div>
      <div className="text-center py-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Timing Verdict</p>
        <p className={`text-4xl font-bold font-mono ${colors[verdict]}`}>{verdict.replace("_", " ")}</p>
        {confluenceResult && realTimingVerdict && (
          <p className="text-xs text-gray-500 mt-1">Engine verdict: {realTimingVerdict.replace(/_/g, " ")}</p>
        )}
        {!isWait && <p className="text-sm text-money-400 mt-2">{timeframeLabel}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Mortgage Rate" value={mockT.mortgageRate} color="blue" icon={TrendingUp} />
        <MetricCard label="Fed Funds" value={mockT.fedFunds} color="gray" icon={TrendingUp} />
        <MetricCard label="Rate Direction" value={mockT.rateDir} color="gold" icon={TrendingUp} />
        <MetricCard label="Seasonal" value={mockT.seasonal} color="green" icon={Clock} />
      </div>
      {confluenceResult && timingVote && (
        <div className="p-3 bg-surface-elevated rounded-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Timing Engine Score</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-surface-card rounded-full overflow-hidden">
              <div className="h-full bg-money-500 rounded-full transition-all" style={{ width: `${Math.min(timingVote.score, 100)}%` }} />
            </div>
            <span className="text-sm font-mono font-bold text-gray-200">{timingVote.score}/100</span>
          </div>
        </div>
      )}
      {isWait && <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg text-sm text-red-400 flex items-start gap-3">
        <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div><p className="font-medium">{confluenceResult ? `The timing engine suggests patience. ${confluenceResult.timeframe}.` : "The timing engine suggests waiting 3-6 months."}</p>
          <p className="text-red-400/80 mt-1">Set alerts to be notified when conditions improve.</p>
          <Button variant="danger" size="sm" className="mt-3"><Bell className="h-3.5 w-3.5" /> Set Alert</Button></div></div>}
      {/* Rate decision context */}
      <div className="p-4 bg-surface-elevated rounded-lg space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Rate Analysis</p>
        <div className="text-sm space-y-1">
          <p className="text-gray-400">Mortgage rate (<span className="font-mono text-gray-200">{mockT.mortgageRate}</span>) vs Fed Funds (<span className="font-mono text-gray-200">{mockT.fedFunds}</span>):</p>
          <p className="text-gray-400">Spread: <span className="font-mono text-gray-200">{(6.95 - 5.25).toFixed(2)}%</span> — {6.95 - 5.25 > 2 ? <span className="text-gold-400">WIDE (banks tightening beyond Fed policy — rates may compress when banks compete)</span> : <span className="text-money-400">NORMAL (healthy lending conditions)</span>}</p>
          <p className="text-gray-400 mt-2">{mockT.rateDir.includes("cut") ? <span className="text-money-400">IF rates drop 0.5%: Monthly payment decreases ~$85 on $350K loan → more buyer demand → prices rise. ACT BEFORE the cut.</span>
            : mockT.rateDir.includes("Holding") ? <span className="text-gold-400">Rates stable — no urgency from rate environment. Focus on deal quality.</span>
            : <span className="text-red-400">IF rates rise 0.5%: Monthly payment increases ~$85 → buyer pool shrinks → negotiate harder on price.</span>}</p>
        </div>
      </div>
      {verdict === "NEUTRAL" && <div className="p-4 bg-gold-900/20 border border-gold-700/40 rounded-lg text-sm text-gold-400">{confluenceResult ? confluenceResult.decision : "Timing is neutral. Proceed with caution — negotiate aggressively."}</div>}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={() => onAdvance(!isWait)}>Review Risks <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function StepRiskReview({ market, onBack, onAdvance, confluenceResult, confluenceLoading }: {
  market: MarketDef; onBack: () => void; onAdvance: (pass: boolean) => void;
  confluenceResult: ConfluenceAPIResult | null; confluenceLoading: boolean;
}) {
  const mockR = getRiskLevel(market.hyperScore);

  // Map real risk engine data from confluence votes
  const riskVote = confluenceResult?.votes.find((v) => v.engine === "\u8B77\u6CD5 Guardian");

  // Map real risk verdict string to our RiskLevel
  type RiskLevel = "minimal" | "low" | "moderate" | "elevated" | "high" | "critical";
  const mapRiskLevel = (verdictStr: string | undefined): RiskLevel => {
    if (!verdictStr) return mockR.level;
    const lower = verdictStr.toLowerCase();
    if (lower.includes("minimal")) return "minimal";
    if (lower.includes("low")) return "low";
    if (lower.includes("moderate")) return "moderate";
    if (lower.includes("elevated")) return "elevated";
    if (lower.includes("high")) return "high";
    if (lower.includes("critical")) return "critical";
    // Fallback: use score-based mapping
    if (riskVote) {
      const oppScore = riskVote.score; // already inverted (100 - risk)
      if (oppScore >= 85) return "minimal";
      if (oppScore >= 70) return "low";
      if (oppScore >= 50) return "moderate";
      if (oppScore >= 30) return "elevated";
      return "high";
    }
    return mockR.level;
  };

  const level = confluenceResult && riskVote ? mapRiskLevel(riskVote.verdict) : mockR.level;

  // Use real contradictions as red flags, real reinforcements as positives
  const reds = confluenceResult
    ? confluenceResult.contradictions.filter((c) => c.toLowerCase().includes("risk") || c.toLowerCase().includes("flag") || c.toLowerCase().includes("breaker"))
    : mockR.reds;
  const yellows = confluenceResult
    ? confluenceResult.contradictions.filter((c) => !reds.includes(c))
    : mockR.yellows;
  const mitigations = confluenceResult?.revisitTriggers ?? mockR.mitigations;

  const gatePass = reds.length === 0 && ["minimal", "low", "moderate", "elevated"].includes(level);

  if (confluenceLoading) {
    return <ConfluenceSkeleton label="Running 6-dimension Guardian analysis..." />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold text-gray-100">{"\u8B77\u6CD5"} Guardian &mdash; What could go wrong?</h2>
        <p className="text-sm text-gray-500 mt-1">Systematic risk assessment across multiple dimensions.</p>
        {confluenceResult && <span className="text-[10px] text-money-400/60">6-dimension {"\u8B77\u6CD5"} Guardian analysis (macro, cost, signal, concentration, bubble, fragility)</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Risk Level:</span>
        <Badge variant={riskBadgeVariant(level)} size="md">{level.toUpperCase()}</Badge>
        {confluenceResult && riskVote && (
          <span className="text-xs font-mono text-gray-500">Score: {riskVote.score}/100</span>
        )}
      </div>
      {reds.length > 0 && <Card header="Red Flags"><div className="space-y-2">{reds.map((txt, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-red-400"><XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{txt}</span></div>))}</div></Card>}
      {yellows.length > 0 && <Card header="Yellow Flags"><div className="space-y-2">{yellows.map((txt, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-gold-400"><AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{txt}</span></div>))}</div></Card>}
      <Card header={confluenceResult ? "Revisit Triggers" : "Mitigations"}><div className="space-y-2">{mitigations.map((txt, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-gray-300"><Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-money-400" /><span>{txt}</span></div>))}</div></Card>
      {reds.length > 0 && <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg text-sm text-red-400 font-medium">STOP &mdash; {reds[0]}. This is a deal breaker.</div>}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={() => onAdvance(gatePass)}>Check {"\u5BB6\u696D"} Empire Fit <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function StepPortfolioFit({ market, prop, onBack, onAdvance }: { market: MarketDef; prop: { monthlyCashFlow: number }; onBack: () => void; onAdvance: (pass: boolean) => void }) {
  const newCF = prop.monthlyCashFlow;
  const currentCF = PORTFOLIO_PROPERTIES.reduce((s, p) => s + p.cashFlow, 0);
  const sameState = PORTFOLIO_PROPERTIES.filter((p) => p.state === market.state).length;
  const div = sameState > 0 ? "worsened" : "improved";
  const goalBefore = Math.round((currentCF / 3000) * 100);
  const goalAfter = Math.round(((currentCF + newCF) / 3000) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold text-gray-100">{"\u5BB6\u696D"} Empire Fit &mdash; How does this change your portfolio?</h2>
        <p className="text-sm text-gray-500 mt-1">Impact on cash flow, diversification, and goals.</p></div>
      <Card header={`Current Portfolio (${PORTFOLIO_PROPERTIES.length} properties)`}><div className="space-y-2">{PORTFOLIO_PROPERTIES.map((p, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div><span className="text-gray-300">{p.address}</span><span className="text-gray-500 ml-2">{p.city}, {p.state}</span></div>
          <div className="flex items-center gap-4"><span className="font-mono text-gray-400">{formatCurrency(p.value)}</span><span className="font-mono text-money-400">+{formatCurrency(p.cashFlow)}/mo</span></div>
        </div>))}</div></Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Cash Flow Impact" value={`+${formatCurrency(newCF)}/mo`} trend="up" trendValue={`Total: ${formatCurrency(currentCF + newCF)}/mo`} color="green" icon={TrendingUp} />
        <MetricCard label="Diversification" value={div === "improved" ? "Improved" : "Worsened"} color={div === "improved" ? "green" : "red"} icon={Target} />
        <MetricCard label="Goal Progress" value={`${goalBefore}% \u2192 ${goalAfter}%`} trend="up" trendValue="Target: $3,000/mo" color="gold" icon={Target} />
      </div>
      {sameState > 0 && <div className="p-4 bg-gold-900/20 border border-gold-700/40 rounded-lg text-sm text-gold-400 flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Adding another property in {market.state} increases geographic concentration ({sameState + 1} in same state).</span></div>}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={() => onAdvance(newCF > 0 && div !== "worsened")}>{"\u5929\u6A5F"} The Reading <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function StepFinalVerdict({ market, propScore, selectedProp, onRestart, confluenceResult, confluenceLoading }: {
  market: MarketDef; propScore: number; selectedProp: ReturnType<typeof generateNearbyProperties>[number];
  onRestart: () => void;
  confluenceResult: ConfluenceAPIResult | null; confluenceLoading: boolean;
}) {
  const mockF = getFinalVerdict(market.hyperScore, propScore);
  const mockTiming = getTimingVerdict(market.hyperScore);

  // Use real verdict data from confluence when available
  const verdictSignal = confluenceResult?.verdict.signal ?? mockF.verdict;
  const probability = confluenceResult?.probabilityScore ?? mockF.probability;
  const confidence = confluenceResult?.confidence ?? mockF.confidence;

  // Map real votes to display format
  const engines = confluenceResult
    ? confluenceResult.votes.map((v) => ({ name: v.engine, vote: v.vote, score: v.score }))
    : mockF.engines;
  const agreement = confluenceResult?.bullishCount ?? mockF.agreement;
  const totalEngines = confluenceResult ? confluenceResult.votes.length : 8;
  const agreementLabel = confluenceResult
    ? (confluenceResult.agreementLevel === "unanimous" || confluenceResult.agreementLevel === "strong" ? "Strong"
      : confluenceResult.agreementLevel === "majority" ? "Moderate" : "Weak")
    : mockF.agreementLabel;

  // Use real next steps from confluence, fall back to mock
  const mockSteps = [`Submit offer at 5% below asking price`, `Schedule property inspection within 7 days`, `Get pre-approval letter from lender`, `Lock mortgage rate at ${mockTiming.mortgageRate}`, `Review HOA docs and title search`];
  const steps = confluenceResult?.nextSteps && confluenceResult.nextSteps.length > 0
    ? confluenceResult.nextSteps
    : mockSteps;

  const timeframe = confluenceResult?.timeframe ?? "Act within 2-4 weeks for optimal conditions.";

  // --- Store integrations ---
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const addPrediction = useOracleStore((s) => s.addPrediction);
  const oraclePredictions = useOracleStore((s) => s.predictions);
  const oracleStats = useOracleStore((s) => s.getStats);

  const [savedToPipeline, setSavedToPipeline] = useState(false);
  const [showDecisionCapture, setShowDecisionCapture] = useState(false);
  const [predictionLogged, setPredictionLogged] = useState(false);

  const handleSaveToPipeline = useCallback(() => {
    addDeal({
      status: "discovered",
      address: selectedProp.address,
      market: market.name,
      state: market.state,
      zip: market.zip,
      price: selectedProp.price,
      propertyType: selectedProp.propertyType,
      analysis: {
        apexScore: selectedProp.hyperScore,
        convictionScore: probability,
        prismVerdict: verdictSignal,
        capRate: selectedProp.capRate,
        monthlyCashFlow: selectedProp.monthlyCashFlow,
        cashOnCash: 0, // would need full calculation
      },
    });
    setSavedToPipeline(true);
  }, [addDeal, selectedProp, market, probability, verdictSignal]);

  const handleLogPrediction = useCallback(() => {
    addPrediction({
      market: { zip: market.zip, name: market.name, state: market.state },
      property: { address: selectedProp.address, price: selectedProp.price },
      predictions: {
        prismVerdict: verdictSignal,
        convictionScore: probability,
        confidenceLevel: confidence,
        harmonicLevel: agreementLabel,
        predictedAppreciation1yr: market.hyperScore > 65 ? 5 : market.hyperScore > 45 ? 2 : -1,
        predictedCashFlow: selectedProp.monthlyCashFlow,
        predictedCapRate: selectedProp.capRate,
        timingVerdict: confluenceResult?.verdict.signal ?? "NEUTRAL",
        riskLevel: confluenceResult?.agreementLevel ?? "moderate",
      },
      engineVotes: engines.map((e) => ({ engine: e.name, vote: e.vote, score: e.score })),
    });
    setPredictionLogged(true);
  }, [addPrediction, market, selectedProp, verdictSignal, probability, confidence, agreementLabel, engines, confluenceResult]);

  if (confluenceLoading) {
    return <ConfluenceSkeleton label="Computing \u5929\u6A5F reading across all 5 elemental forces..." />;
  }

  // Oracle stats for track record section
  const stats = oracleStats();
  const hasPredictions = oraclePredictions.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h2 className="text-xl font-bold text-gray-100">{"\u5929\u6A5F"} The Reading</h2>
        <p className="text-sm text-gray-500 mt-1">{confluenceResult ? confluenceResult.decision : "All forces weighed. Here is the combined assessment."}</p>
        {confluenceResult && <span className="text-[10px] text-money-400/60">5 elemental forces x 73 components = {"\u5929\u6A5F"} reading</span>}
      </div>
      <div className="text-center py-8 bg-surface-card border border-surface-border rounded-xl">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Verdict</p>
        <p className={`text-5xl font-bold font-mono ${verdictColor(verdictSignal)}`}>{verdictSignal.replace(/_/g, " ")}</p>
        {confluenceResult && (
          <p className="text-sm text-gray-500 mt-1">{confluenceResult.verdict.label}</p>
        )}
        <div className="flex items-center justify-center gap-8 mt-6">
          <div><p className="text-xs text-gray-500">Probability</p><p className="text-3xl font-bold font-mono text-gray-100">{probability}</p></div>
          <div><p className="text-xs text-gray-500">Confidence</p><p className="text-3xl font-bold font-mono text-gray-100">{confidence}%</p></div>
          <div><p className="text-xs text-gray-500">Agreement</p><Badge variant={agreement >= Math.ceil(totalEngines * 0.75) ? "success" : agreement >= Math.ceil(totalEngines * 0.5) ? "warning" : "danger"} size="md">{agreementLabel} ({agreement}/{totalEngines})</Badge></div>
        </div>
        {confluenceResult && (
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <span>Independent probability: {confluenceResult.independentProbability}%</span>
            <span>Agreement: {confluenceResult.agreementLevel}</span>
            <span>Multiplier: {confluenceResult.agreementMultiplier}x</span>
          </div>
        )}
      </div>
      <Card header={"\u4E94\u884C Elemental Harmony"}><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{engines.map((e) => (
        <div key={e.name} className="flex items-center gap-2 p-3 bg-surface-elevated rounded-lg">
          {e.vote === "bullish" ? <TrendingUp className="h-4 w-4 text-money-400" /> : e.vote === "bearish" ? <XCircle className="h-4 w-4 text-red-400" /> : <Circle className="h-4 w-4 text-gold-400" />}
          <div className="min-w-0"><p className="text-xs text-gray-400 truncate">{e.name}</p><p className={`text-sm font-mono font-bold ${e.vote === "bullish" ? "text-money-400" : e.vote === "bearish" ? "text-red-400" : "text-gold-400"}`}>{e.score}</p></div>
        </div>))}</div></Card>
      {/* Confidence explanation */}
      <div className="p-4 bg-surface-elevated rounded-lg text-sm space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Why This Confidence Level</p>
        <p className="text-gray-400">
          {confluenceResult
            ? confluenceResult.convergenceNarrative
            : (agreement >= 6
              ? <><span className="text-money-400 font-medium">{agreement}/{totalEngines} forces aligned.</span> When this many independent forces converge, the compound probability of being correct is significantly higher than any single signal. Each force draws from different data sources.</>
              : agreement >= 4
                ? <><span className="text-gold-400 font-medium">{agreement}/{totalEngines} forces aligned, {totalEngines - agreement} dissenting.</span> Majority agreement but not unanimous. The dissenting forces may be seeing risks the others miss — review the opposed votes above.</>
                : <><span className="text-red-400 font-medium">Only {agreement}/{totalEngines} forces aligned.</span> Low agreement means high uncertainty. When forces disagree, the probability of a correct prediction drops significantly. Wait for more signals to align.</>)}
        </p>
      </div>
      {confluenceResult && confluenceResult.reinforcements.length > 0 && (
        <Card header="Cross-Engine Reinforcements"><div className="space-y-2">{confluenceResult.reinforcements.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-money-400"><CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{r}</span></div>))}</div></Card>
      )}
      {confluenceResult && confluenceResult.contradictions.length > 0 && (
        <Card header="Cross-Engine Contradictions"><div className="space-y-2">{confluenceResult.contradictions.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gold-400"><AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{c}</span></div>))}</div></Card>
      )}
      <Card header="Next Steps"><div className="space-y-2">{steps.map((s, i) => (
        <div key={i} className="flex items-start gap-2 text-sm"><span className="text-money-400 font-mono font-bold w-5 flex-shrink-0">{i + 1}.</span><span className="text-gray-300">{s}</span></div>))}
      </div><p className="text-xs text-gray-500 mt-4">Timeframe: {timeframe}</p></Card>

      {/* --- Action Buttons --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleSaveToPipeline}
          disabled={savedToPipeline}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            savedToPipeline
              ? "bg-money-900/30 border border-money-700/40 text-money-400 cursor-default"
              : "bg-money-900/20 border border-money-700/30 text-money-400 hover:bg-money-900/40 hover:border-money-600/50 active:scale-[0.98]"
          }`}
        >
          {savedToPipeline ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {savedToPipeline ? "Saved to \u805A\u5BF6\u76C6" : "Save to \u805A\u5BF6\u76C6 Pipeline"}
        </button>
        <button
          onClick={() => setShowDecisionCapture((v) => !v)}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            showDecisionCapture
              ? "bg-gold-900/30 border border-gold-600/50 text-gold-400"
              : "bg-gold-900/20 border border-gold-700/30 text-gold-400 hover:bg-gold-900/40 hover:border-gold-600/50 active:scale-[0.98]"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Record Decision
        </button>
        <button
          onClick={handleLogPrediction}
          disabled={predictionLogged}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            predictionLogged
              ? "bg-blue-900/30 border border-blue-700/40 text-blue-400 cursor-default"
              : "bg-blue-900/20 border border-blue-700/30 text-blue-400 hover:bg-blue-900/40 hover:border-blue-600/50 active:scale-[0.98]"
          }`}
        >
          {predictionLogged ? <CheckCircle2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {predictionLogged ? "Prediction Logged" : "Log Prediction"}
        </button>
      </div>

      {/* --- Inline Decision Capture --- */}
      {showDecisionCapture && (
        <DecisionCapture
          type={verdictSignal.includes("BUY") ? "buy" : verdictSignal.includes("PASS") ? "pass" : "watch"}
          context={{
            address: selectedProp.address,
            market: market.name,
            zip: market.zip,
            price: selectedProp.price,
            apexScore: selectedProp.hyperScore,
            convictionScore: probability,
            prismVerdict: verdictSignal,
          }}
          systemRecommendation={verdictSignal.replace(/_/g, " ")}
          onSave={() => setShowDecisionCapture(false)}
          onCancel={() => setShowDecisionCapture(false)}
        />
      )}

      {/* --- Oracle Track Record --- */}
      {hasPredictions && (
        <div className="p-4 bg-surface-card border border-surface-border rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-200">{"\u5929\u547D"} Track Record</h3>
            <span className="text-xs font-mono text-gray-500">{stats.totalPredictions} prediction{stats.totalPredictions !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-gray-500">Accuracy</p>
              <p className={`text-lg font-bold font-mono ${stats.accuracyRate >= 70 ? "text-money-400" : stats.accuracyRate >= 50 ? "text-gold-400" : "text-red-400"}`}>
                {stats.predictionsWithOutcomes > 0 ? `${stats.accuracyRate}%` : "--"}
              </p>
            </div>
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-gray-500">STRONG BUY</p>
              <p className="text-lg font-bold font-mono text-gray-200">{stats.predictionsWithOutcomes > 0 ? `${stats.strongBuyAccuracy}%` : "--"}</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-gray-500">Best Engine</p>
              <p className="text-sm font-medium text-money-400 truncate">{stats.bestPerformingEngine}</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-gray-500">With Outcomes</p>
              <p className="text-lg font-bold font-mono text-gray-200">{stats.predictionsWithOutcomes}/{stats.totalPredictions}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onRestart}>Start New Analysis</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WorkflowPage() {
  const [step, setStep] = useState(0);
  const [marketIdx, setMarketIdx] = useState<number | null>(null);
  const [propIdx, setPropIdx] = useState<number | null>(null);
  const [gates, setGates] = useState<Record<number, boolean>>({});

  // Confluence state — real API data with mock fallback
  const [confluenceResult, setConfluenceResult] = useState<ConfluenceAPIResult | null>(null);
  const [confluenceLoading, setConfluenceLoading] = useState(false);
  const lastFetchedZip = useRef<string | null>(null);

  const market = marketIdx !== null ? ALL_MARKETS[marketIdx] : null;
  const properties = useMemo(() => market ? generateNearbyProperties(market.lat, market.lng, 10, 5) : [], [market]);
  const selectedProp = propIdx !== null ? properties[propIdx] : null;

  // Fetch real confluence when a market is selected
  useEffect(() => {
    if (!market || market.zip === lastFetchedZip.current) return;
    lastFetchedZip.current = market.zip;

    let cancelled = false;
    async function runConfluence() {
      setConfluenceLoading(true);
      setConfluenceResult(null);
      try {
        const res = await fetch("/api/confluence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildConfluencePayload(market!)),
        });
        if (!cancelled && res.ok) {
          const data: ConfluenceAPIResult = await res.json();
          setConfluenceResult(data);
        }
      } catch {
        // Silently fall back to mock data — no-op
      }
      if (!cancelled) setConfluenceLoading(false);
    }
    runConfluence();
    return () => { cancelled = true; };
  }, [market]);

  const statuses: StepStatus[] = STEP_DEFS.map((_, i) => i === step ? "current" : i < step ? (gates[i] === false ? "failed" : "completed") : "upcoming");

  const advance = useCallback((pass: boolean) => { setGates((g) => ({ ...g, [step]: pass })); if (pass && step < 6) setStep(step + 1); }, [step]);
  const goBack = useCallback(() => { if (step > 0) setStep(step - 1); }, [step]);
  const goTo = useCallback((s: number) => { if (s <= step) setStep(s); }, [step]);
  const restart = useCallback(() => {
    setStep(0); setMarketIdx(null); setPropIdx(null); setGates({});
    setConfluenceResult(null); lastFetchedZip.current = null;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-gray-100">{"\u5929\u6A5F"} Investment Pathway</h1>
        <p className="text-sm text-gray-500 mt-1">When Heaven, Earth, and Man align — {"\u5929\u5730\u4EBA\u5408\u4E00"} — wealth follows.</p></div>
      <div className="flex flex-col lg:flex-row gap-6">
        <StepNav currentStep={step} statuses={statuses} onGoTo={goTo} />
        <div className="flex-1 min-w-0">
          {step === 0 && <StepMarketScan selectedIdx={marketIdx} onSelect={setMarketIdx} onAdvance={advance} confluenceResult={confluenceResult} confluenceLoading={confluenceLoading} />}
          {step === 1 && market && <StepSignalDeepDive market={market} onBack={goBack} onAdvance={advance} confluenceResult={confluenceResult} confluenceLoading={confluenceLoading} />}
          {step === 2 && market && <StepDealScreening market={market} properties={properties} selectedIdx={propIdx} onSelect={setPropIdx} onBack={goBack} onAdvance={advance} />}
          {step === 3 && market && <StepTimingCheck market={market} onBack={goBack} onAdvance={advance} confluenceResult={confluenceResult} confluenceLoading={confluenceLoading} />}
          {step === 4 && market && <StepRiskReview market={market} onBack={goBack} onAdvance={advance} confluenceResult={confluenceResult} confluenceLoading={confluenceLoading} />}
          {step === 5 && market && selectedProp && <StepPortfolioFit market={market} prop={selectedProp} onBack={goBack} onAdvance={advance} />}
          {step === 6 && market && selectedProp && <StepFinalVerdict market={market} propScore={selectedProp.hyperScore} selectedProp={selectedProp} onRestart={restart} confluenceResult={confluenceResult} confluenceLoading={confluenceLoading} />}
        </div>
      </div>
    </div>
  );
}
