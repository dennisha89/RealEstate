"use client";

import { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  Navigation,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  SlidersHorizontal,
  Locate,
  ArrowUpRight,
  Star,
  Zap,
  Home,
  DollarSign,
  Eye,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Button from "@/components/ui/Button";
import InsightCard from "@/components/analysis/InsightCard";
import CausalChainView from "@/components/analysis/CausalChainView";
import { useGeolocation, distanceMiles } from "@/lib/hooks/useGeolocation";
import { generateNearbyProperties } from "@/lib/mock/nearby-properties";
import { formatCurrency } from "@/lib/utils/format";
import {
  contextualizeMetric,
  buildCausalChain,
  generatePropertyInsightText,
  generateMarketNarrative,
} from "@/lib/engines/insight-engine";
import { computeStackedSignals, generateMarketSignals } from "@/lib/engines/stacked-signal-engine";
import SignalStack from "@/components/analysis/SignalStack";
import ScenarioSliders from "@/components/analysis/ScenarioSliders";
import TimingGauge from "@/components/analysis/TimingGauge";
import { computeEntryTiming } from "@/lib/engines/timing-engine";
import Link from "next/link";
import { useBuyBoxStore } from "@/lib/stores/buybox-store";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

function signalBadge(signal: string) {
  if (signal === "strong_buy") return <Badge variant="success" size="sm">Strong Buy</Badge>;
  if (signal === "buy") return <Badge variant="success" size="sm">Buy</Badge>;
  if (signal === "hold") return <Badge variant="warning" size="sm">Hold</Badge>;
  return <Badge variant="danger" size="sm">Pass</Badge>;
}

function signalColor(signal: string) {
  if (signal === "strong_buy" || signal === "buy") return "text-money-400";
  if (signal === "hold") return "text-gold-400";
  return "text-red-400";
}

function scoreBg(score: number) {
  if (score >= 75) return "from-money-600 to-money-800";
  if (score >= 60) return "from-gold-600 to-gold-800";
  return "from-red-600 to-red-800";
}

export default function DiscoverPage() {
  const { position, error: geoError, loading: geoLoading, refresh: refreshGeo } = useGeolocation();
  const [radius, setRadius] = useState(10);
  const [sortBy, setSortBy] = useState<"distance" | "appreciation" | "score" | "price">("score");
  const [filterSignal, setFilterSignal] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [buyBoxActive, setBuyBoxActive] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const { matchesBox } = useBuyBoxStore();
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const { capture } = useEventCapture();

  // Capture page view on mount
  useEffect(() => {
    capture("session.page_viewed", { pageName: "discover" });
  }, [capture]);

  const allProperties = useMemo(() => {
    if (!position) return [];
    return generateNearbyProperties(position.lat, position.lng, radius, 30);
  }, [position, radius]);

  // Pre-compute buy box matches for all properties
  const buyBoxMatches = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of allProperties) {
      const result = matchesBox({
        price: p.price,
        capRate: p.capRate,
        monthlyCashFlow: p.monthlyCashFlow,
        cashOnCash: p.capRate * 0.8, // approximate from cap rate
        dscr: p.monthlyCashFlow > 0 ? 1.2 : 0.9, // approximate
        propertyType: p.propertyType.toLowerCase().replace(/\s+/g, "").replace("singlefamily", "sfr").replace("multi-family", "multifamily"),
        bedrooms: p.bedrooms,
        yearBuilt: p.yearBuilt,
        hyperScore: p.hyperScore,
        daysOnMarket: p.daysOnMarket,
      });
      map.set(p.id, result.passes);
    }
    return map;
  }, [allProperties, matchesBox]);

  const buyBoxMatchCount = useMemo(
    () => [...buyBoxMatches.values()].filter(Boolean).length,
    [buyBoxMatches]
  );

  const filtered = useMemo(() => {
    let props = allProperties;
    if (filterSignal !== "all") {
      props = props.filter((p) => p.signal === filterSignal);
    }
    if (buyBoxActive) {
      props = props.filter((p) => buyBoxMatches.get(p.id));
    }
    return [...props].sort((a, b) => {
      if (sortBy === "distance") return a.distance - b.distance;
      if (sortBy === "appreciation") return b.predictedAppreciation1yr - a.predictedAppreciation1yr;
      if (sortBy === "score") return b.hyperScore - a.hyperScore;
      return a.price - b.price;
    });
  }, [allProperties, filterSignal, sortBy, buyBoxActive, buyBoxMatches]);

  const selected = filtered.find((p) => p.id === selectedId);
  const topPicks = allProperties.filter((p) => p.signal === "strong_buy" || p.signal === "buy").slice(0, 3);

  function handleSaveToPipeline(prop: typeof allProperties[number]) {
    if (savedIds.has(prop.id)) return;
    const zip = prop.address.match(/\d{5}/)?.[0] || "00000";
    addDeal({
      status: "discovered",
      address: prop.address,
      market: "Nearby",
      state: "",
      zip,
      price: prop.price,
      propertyType: prop.propertyType,
      analysis: {
        apexScore: prop.hyperScore,
        convictionScore: prop.hyperScore,
        prismVerdict: prop.signal,
        capRate: prop.capRate,
        monthlyCashFlow: prop.monthlyCashFlow,
        cashOnCash: prop.capRate * 0.8,
      },
    });
    setSavedIds((prev) => new Set(prev).add(prop.id));
    capture("property.saved", { address: prop.address, price: prop.price, score: prop.hyperScore });
  }

  function handleExpandProperty(prop: typeof allProperties[number]) {
    setSelectedId(selectedId === prop.id ? null : prop.id);
    if (selectedId !== prop.id) {
      capture("property.analyzed", { address: prop.address, price: prop.price, score: prop.hyperScore });
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hero — GPS status + location */}
      <div className="bg-gradient-to-br from-money-950/80 via-surface-card to-surface-card border border-money-900/30 rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-money-900/50 border border-money-700/50 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-money-400" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-100">
                {geoLoading ? "Finding you..." : "\u9F8D\u7A74 Dragon\u2019s Lair \u2014 Properties Near You"}
              </h1>
              {position && !geoLoading && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                  {position.accuracy > 0 && <> &middot; ±{Math.round(position.accuracy)}m</>}
                </p>
              )}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={refreshGeo} loading={geoLoading}>
            <Locate className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {geoError && (
          <p className="text-xs text-gold-400 bg-gold-900/20 border border-gold-800/30 rounded-lg px-3 py-2">
            {geoError}
          </p>
        )}

        {/* Quick stats */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center p-2 bg-surface-elevated/50 rounded-lg">
              <p className="text-lg font-bold text-money-400 font-mono">{filtered.length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Properties</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated/50 rounded-lg">
              <p className="text-lg font-bold text-gold-400 font-mono">{topPicks.length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Buy Signals</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated/50 rounded-lg">
              <p className="text-lg font-bold text-blue-400 font-mono">{radius}mi</p>
              <p className="text-[10px] text-gray-500 uppercase">Radius</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
        {/* Radius slider */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg flex-shrink-0">
          <MapPin className="h-3.5 w-3.5 text-gray-500" />
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="bg-transparent text-xs text-gray-300 outline-none"
          >
            <option value={1}>1 mi</option>
            <option value={3}>3 mi</option>
            <option value={5}>5 mi</option>
            <option value={10}>10 mi</option>
            <option value={25}>25 mi</option>
            <option value={50}>50 mi</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg flex-shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent text-xs text-gray-300 outline-none"
          >
            <option value="score">Best Score</option>
            <option value="appreciation">Highest Appreciation</option>
            <option value="distance">Nearest</option>
            <option value="price">Lowest Price</option>
          </select>
        </div>

        {/* Signal filter pills */}
        {["all", "strong_buy", "buy", "hold"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSignal(s)}
            className={`px-3 py-1.5 text-[10px] font-medium rounded-lg whitespace-nowrap flex-shrink-0 transition-colors ${
              filterSignal === s
                ? "bg-money-900/50 text-money-400 border border-money-700/50"
                : "bg-surface-card text-gray-500 border border-surface-border hover:text-gray-300"
            }`}
          >
            {s === "all" ? "All" : s === "strong_buy" ? "Strong Buy" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        {/* Buy Box toggle */}
        <button
          onClick={() => setBuyBoxActive(!buyBoxActive)}
          className={`px-3 py-1.5 text-[10px] font-medium rounded-lg whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 ${
            buyBoxActive
              ? "bg-money-900/50 text-money-400 border border-money-700/50"
              : "bg-surface-card text-gray-500 border border-surface-border hover:text-gray-300"
          }`}
        >
          {"\u5C0B\u5BF6"} Buy Box
          {buyBoxMatchCount > 0 && (
            <span className="bg-money-700/60 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {buyBoxMatchCount}
            </span>
          )}
        </button>
      </div>

      {/* Top picks — horizontal scroll cards */}
      {topPicks.length > 0 && (
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-money-400" /> Top Dragon&apos;s Lairs
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {topPicks.map((prop) => (
              <div
                key={prop.id}
                onClick={() => handleExpandProperty(prop)}
                className="flex-shrink-0 w-[280px] snap-start bg-surface-card border border-surface-border rounded-xl p-4 cursor-pointer hover:border-money-700/50 transition-all"
              >
                {/* Score badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`px-2.5 py-1 rounded-lg bg-gradient-to-r ${scoreBg(prop.hyperScore)} text-white text-xs font-bold`}>
                      {prop.hyperScore}
                    </div>
                    {buyBoxMatches.get(prop.id) && (
                      <Badge variant="success" size="sm">Match</Badge>
                    )}
                  </div>
                  {signalBadge(prop.signal)}
                </div>

                {/* Address */}
                <p className="text-sm font-medium text-gray-200 truncate">{prop.address}</p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <Navigation className="h-2.5 w-2.5" /> {prop.distance} mi away
                </p>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-[10px] text-gray-600">Price</p>
                    <p className="text-sm font-mono font-medium text-gray-200">{formatCurrency(prop.price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Appreciation</p>
                    <p className={`text-sm font-mono font-medium ${prop.predictedAppreciation1yr >= 0 ? "text-money-400" : "text-red-400"}`}>
                      {prop.predictedAppreciation1yr >= 0 ? "+" : ""}{prop.predictedAppreciation1yr}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Cap Rate</p>
                    <p className="text-sm font-mono font-medium text-gold-400">{prop.capRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Cash Flow</p>
                    <p className="text-sm font-mono font-medium text-money-400">+{formatCurrency(prop.monthlyCashFlow)}/mo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Signal Stack — the core probability engine */}
      {position && allProperties.length > 0 && (
        <Card>
          <SignalStack
            result={computeStackedSignals(generateMarketSignals({
              zip: "00000",
              medianPrice: Math.round(allProperties.reduce((s, p) => s + p.price, 0) / allProperties.length),
              priceChange: Math.round(allProperties.reduce((s, p) => s + p.priceChange30d, 0) / allProperties.length * 10) / 10,
              capRate: Math.round(allProperties.reduce((s, p) => s + p.capRate, 0) / allProperties.length * 10) / 10,
              popGrowth: 2.5,
              jobGrowth: 3.2,
              inventory: 2.8,
              hyperScore: Math.round(allProperties.reduce((s, p) => s + p.hyperScore, 0) / allProperties.length),
            }))}
            marketName="Your Area"
            showPlaybook
          />
        </Card>
      )}

      {/* Property list */}
      <div className="space-y-2">
        <h2 className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" /> {filtered.length} Properties Within {radius} Miles
        </h2>

        {filtered.map((prop) => {
          const isSelected = selectedId === prop.id;
          return (
            <div key={prop.id}>
              {/* Property row */}
              <div
                onClick={() => handleExpandProperty(prop)}
                className={`bg-surface-card border rounded-xl p-3 md:p-4 cursor-pointer transition-all ${
                  isSelected ? "border-money-700/50 bg-money-950/20" : "border-surface-border hover:border-surface-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Score circle */}
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${scoreBg(prop.hyperScore)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-sm font-bold text-white font-mono">{prop.hyperScore}</span>
                  </div>

                  {/* Buy box match badge */}
                  {buyBoxMatches.get(prop.id) && (
                    <Badge variant="success" size="sm">Match</Badge>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-200 truncate">{prop.address}</p>
                      <span className="text-sm font-mono font-medium text-gray-300 flex-shrink-0">{formatCurrency(prop.price)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Navigation className="h-2.5 w-2.5" /> {prop.distance} mi
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {prop.bedrooms}bd/{prop.bathrooms}ba &middot; {prop.sqft.toLocaleString()}sf
                      </span>
                      <span className={`text-[10px] font-mono font-medium ${prop.predictedAppreciation1yr >= 0 ? "text-money-400" : "text-red-400"}`}>
                        {prop.predictedAppreciation1yr >= 0 ? "↑" : "↓"}{Math.abs(prop.predictedAppreciation1yr)}%/yr
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`h-4 w-4 text-gray-600 flex-shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="bg-surface-card border border-surface-border border-t-0 rounded-b-xl p-4 -mt-2 pt-5 space-y-4 animate-fade-in">
                  {/* AI Narrative — the story of this property */}
                  <div className="p-4 bg-surface-elevated/50 rounded-lg border border-surface-border/50">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {generatePropertyInsightText({
                        address: prop.address,
                        price: prop.price,
                        estimatedValue: prop.estimatedValue,
                        predictedAppreciation: prop.predictedAppreciation1yr,
                        capRate: prop.capRate,
                        cashFlow: prop.monthlyCashFlow,
                        hyperScore: prop.hyperScore,
                        distance: prop.distance,
                        dom: prop.daysOnMarket,
                        reasons: prop.reasons,
                      })}
                    </p>
                  </div>

                  {/* Signal + type */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {signalBadge(prop.signal)}
                    <span className="text-xs text-gray-500">{prop.propertyType} &middot; Built {prop.yearBuilt} &middot; {prop.daysOnMarket} DOM</span>
                  </div>

                  {/* Contextualized metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <InsightCard context={contextualizeMetric("capRate", prop.capRate)} compact />
                    <InsightCard context={contextualizeMetric("appreciation1yr", prop.predictedAppreciation1yr)} compact />
                    <InsightCard context={contextualizeMetric("dom", prop.daysOnMarket)} compact />
                    <div className="p-3 rounded-lg border bg-surface-elevated/50 border-surface-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Est. Value</span>
                        {prop.price < prop.estimatedValue && (
                          <span className="text-[10px] font-medium text-money-400">
                            {((1 - prop.price / prop.estimatedValue) * 100).toFixed(0)}% below
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-mono font-bold text-gray-200">{formatCurrency(prop.estimatedValue)}</p>
                      <p className="text-[10px] text-gray-600">
                        Equity gain: {formatCurrency(Math.round(prop.price * prop.predictedAppreciation1yr / 100))}/yr
                      </p>
                    </div>
                  </div>

                  {/* Causal chain — WHY this property will appreciate */}
                  <CausalChainView
                    chain={buildCausalChain({
                      capRate: prop.capRate,
                      dom: prop.daysOnMarket,
                      priceChange: prop.priceChange30d,
                      inventory: 3.2,
                      popGrowth: 2.5,
                      jobGrowth: 3.2,
                      migration: 1200,
                    })}
                  />

                  {/* Entry Timing Gauge */}
                  <TimingGauge
                    result={computeEntryTiming({
                      compositeScore: prop.hyperScore - 50,
                      compositeScorePrevMonth: prop.hyperScore - 53,
                      probability: prop.hyperScore,
                      permitGrowth: prop.priceChange30d * 2,
                      mortgageRateChange: 0.15,
                      migrationInflow: 1200,
                      currentMonth: new Date().getMonth() + 1,
                      inventoryMonths: 2.8,
                      daysOnMarket: prop.daysOnMarket,
                      priceCutPercent: 12,
                    })}
                    compact
                  />

                  {/* Scenario Sliders — What-If Analysis */}
                  <ScenarioSliders
                    basePrice={prop.price}
                    baseRent={prop.monthlyCashFlow + 1200}
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/analysis/${prop.address.match(/\d{5}/)?.[0] || "78701"}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        <Eye className="h-3.5 w-3.5" />
                        Full Analysis
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleSaveToPipeline(prop);
                      }}
                      disabled={savedIds.has(prop.id)}
                    >
                      <Star className={`h-3.5 w-3.5 ${savedIds.has(prop.id) ? "text-money-400" : ""}`} />
                      {savedIds.has(prop.id) ? "Saved \u2713" : "Save"}
                    </Button>
                    <Button variant="secondary" size="sm">
                      <Navigation className="h-3.5 w-3.5" />
                      Directions
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
