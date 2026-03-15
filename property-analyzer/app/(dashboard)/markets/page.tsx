"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  TrendingUp,
  Plus,
  X,
  ArrowRight,
  Layers,
  BarChart3,
  Map,
  GitCompare,
  Eye,
  Bell,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Tabs from "@/components/ui/Tabs";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import { generateTimeSeries } from "@/lib/mock/time-series-generator";
import { computeDerivedMetrics, RATIO_DESCRIPTIONS } from "@/lib/engines/derived-metrics-engine";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import Watchlist from "@/components/dashboard/Watchlist";
import CommunityPulse from "@/components/dashboard/CommunityPulse";
import Link from "next/link";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

// Lazy-load multi-ratio chart
const MultiRatioChart = dynamic(
  () => import("@/components/charts/MultiRatioChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// Lazy-load heavy chart components
const ParallelCoordinatesChart = dynamic(
  () => import("@/components/charts/ParallelCoordinatesChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const HeatmapChart = dynamic(
  () => import("@/components/charts/HeatmapChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const ChoroplethMap = dynamic(
  () => import("@/components/charts/ChoroplethMap"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const CorrelationDashboard = dynamic(
  () => import("@/components/charts/CorrelationDashboard"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return <div className="h-[400px] bg-surface-elevated rounded-lg animate-pulse" />;
}

// --- Market database ---
interface MarketDef {
  name: string;
  state: string;
  zip: string;
  color: string;
  lat: number;
  lng: number;
  medianPrice: number;
  priceChange: number;
  capRate: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  hyperScore: number;
  signal: "bullish" | "bearish" | "neutral";
}

const ALL_MARKETS: MarketDef[] = [
  { name: "Austin", state: "TX", zip: "78701", color: "#22c55e", lat: 30.27, lng: -97.74, medianPrice: 425000, priceChange: 5.2, capRate: 7.1, popGrowth: 3.8, jobGrowth: 4.2, inventory: 1.8, hyperScore: 82, signal: "bullish" },
  { name: "Nashville", state: "TN", zip: "37201", color: "#3b82f6", lat: 36.16, lng: -86.78, medianPrice: 385000, priceChange: 4.8, capRate: 6.5, popGrowth: 2.9, jobGrowth: 3.5, inventory: 2.1, hyperScore: 76, signal: "bullish" },
  { name: "Tampa", state: "FL", zip: "33601", color: "#f59e0b", lat: 27.95, lng: -82.46, medianPrice: 315000, priceChange: 3.1, capRate: 6.8, popGrowth: 2.5, jobGrowth: 2.8, inventory: 2.4, hyperScore: 68, signal: "neutral" },
  { name: "Phoenix", state: "AZ", zip: "85001", color: "#ef4444", lat: 33.45, lng: -112.07, medianPrice: 365000, priceChange: -1.2, capRate: 5.8, popGrowth: 1.8, jobGrowth: 2.1, inventory: 3.2, hyperScore: 52, signal: "bearish" },
  { name: "Denver", state: "CO", zip: "80201", color: "#a855f7", lat: 39.74, lng: -104.99, medianPrice: 520000, priceChange: 1.5, capRate: 5.2, popGrowth: 1.5, jobGrowth: 2.4, inventory: 2.8, hyperScore: 58, signal: "neutral" },
  { name: "Raleigh", state: "NC", zip: "27601", color: "#06b6d4", lat: 35.78, lng: -78.64, medianPrice: 380000, priceChange: 6.1, capRate: 6.9, popGrowth: 3.2, jobGrowth: 4.5, inventory: 1.6, hyperScore: 84, signal: "bullish" },
  { name: "Charlotte", state: "NC", zip: "28202", color: "#ec4899", lat: 35.23, lng: -80.84, medianPrice: 355000, priceChange: 4.5, capRate: 6.3, popGrowth: 2.8, jobGrowth: 3.8, inventory: 2.0, hyperScore: 74, signal: "bullish" },
  { name: "Dallas", state: "TX", zip: "75201", color: "#14b8a6", lat: 32.78, lng: -96.80, medianPrice: 395000, priceChange: 3.8, capRate: 6.0, popGrowth: 2.4, jobGrowth: 3.2, inventory: 2.3, hyperScore: 70, signal: "neutral" },
  { name: "Atlanta", state: "GA", zip: "30301", color: "#8b5cf6", lat: 33.75, lng: -84.39, medianPrice: 340000, priceChange: 4.0, capRate: 6.5, popGrowth: 2.6, jobGrowth: 3.0, inventory: 2.2, hyperScore: 72, signal: "bullish" },
  { name: "Las Vegas", state: "NV", zip: "89101", color: "#d97706", lat: 36.17, lng: -115.14, medianPrice: 385000, priceChange: 1.8, capRate: 5.5, popGrowth: 2.0, jobGrowth: 2.5, inventory: 2.9, hyperScore: 55, signal: "neutral" },
];

const DIMENSIONS = [
  { id: "price", label: "Median Price", format: (v: number) => `$${(v / 1000).toFixed(0)}K` },
  { id: "rent", label: "Median Rent", format: (v: number) => `$${v.toLocaleString()}` },
  { id: "population", label: "Population", format: (v: number) => `${(v / 1000).toFixed(0)}K` },
  { id: "jobs", label: "Employment", format: (v: number) => `${(v / 1000).toFixed(0)}K` },
  { id: "permits", label: "Building Permits", format: (v: number) => v.toLocaleString() },
  { id: "inventory", label: "Months of Inventory", format: (v: number) => `${v.toFixed(1)} mo` },
] as const;

type DimensionId = typeof DIMENSIONS[number]["id"];

function signalVariant(signal: "bullish" | "bearish" | "neutral") {
  if (signal === "bullish") return "success" as const;
  if (signal === "bearish") return "danger" as const;
  return "neutral" as const;
}

const viewTabs = [
  { id: "correlations", label: "Multi-Signal", icon: <GitCompare className="h-4 w-4" /> },
  { id: "ratios", label: "Investment Ratios", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "parallel", label: "All Dimensions", icon: <Layers className="h-4 w-4" /> },
  { id: "heatmap", label: "Heatmap", icon: <Layers className="h-4 w-4" /> },
  { id: "timeline", label: "Timeline", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "map", label: "Map", icon: <Map className="h-4 w-4" /> },
];

export default function MarketsPage() {
  const { addMarket: watchMarket, removeMarket: unwatchMarket, isWatching } = useWatchlistStore();
  const { capture } = useEventCapture();
  const [selectedZips, setSelectedZips] = useState<string[]>(["78701", "37201", "33601", "27601", "85001"]);

  // Capture page view on mount
  useEffect(() => {
    capture("session.page_viewed", { pageName: "markets" });
  }, [capture]);
  const [activeDimension, setActiveDimension] = useState<DimensionId>("price");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedMarkets = ALL_MARKETS.filter((m) => selectedZips.includes(m.zip));
  const unselectedMarkets = ALL_MARKETS.filter(
    (m) => !selectedZips.includes(m.zip) &&
      (searchQuery === "" || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.zip.includes(searchQuery))
  );

  const addMarket = (zip: string) => {
    if (selectedZips.length < 8 && !selectedZips.includes(zip)) setSelectedZips([...selectedZips, zip]);
  };
  const removeMarket = (zip: string) => setSelectedZips(selectedZips.filter((z) => z !== zip));

  // Time-series data for timeline view
  const chartData = useMemo(() => {
    if (selectedMarkets.length === 0) return [];
    const seriesMap: Record<string, Array<{ date: string; value: number }>> = {};
    for (const market of selectedMarkets) {
      const baseValues: Record<string, { start: number; growth: number; vol: number }> = {
        price: { start: market.medianPrice * 0.9, growth: market.priceChange > 0 ? 0.004 : -0.001, vol: 0.01 },
        rent: { start: 1200 + (market.hyperScore / 100) * 800, growth: 0.004, vol: 0.008 },
        population: { start: 40000 + (market.hyperScore / 100) * 30000, growth: market.popGrowth / 100 / 12, vol: 0.001 },
        jobs: { start: 20000 + (market.hyperScore / 100) * 20000, growth: market.jobGrowth / 100 / 12, vol: 0.003 },
        permits: { start: 200 + (market.hyperScore / 100) * 300, growth: 0.003, vol: 0.05 },
        inventory: { start: market.inventory + 1, growth: -0.005, vol: 0.03 },
      };
      const cfg = baseValues[activeDimension];
      seriesMap[market.zip] = generateTimeSeries(market.zip + activeDimension, {
        startValue: cfg.start, monthlyGrowthRate: cfg.growth, volatility: cfg.vol, months: 36, startYear: 2023, startMonth: 3,
      });
    }
    const allDates = new Set<string>();
    for (const series of Object.values(seriesMap)) for (const p of series) allDates.add(p.date);
    return Array.from(allDates).sort().map((date) => {
      const point: Record<string, string | number> = { date };
      for (const market of selectedMarkets) {
        const match = seriesMap[market.zip]?.find((p) => p.date === date);
        if (match) point[market.zip] = match.value;
      }
      return point;
    });
  }, [selectedMarkets, activeDimension]);

  // Parallel coordinates data
  const parallelDimensions = [
    { name: "HyperScore", min: 0, max: 100 },
    { name: "Price ($K)", min: 200, max: 600 },
    { name: "Cap Rate %", min: 4, max: 9 },
    { name: "Pop Growth %", min: 0, max: 5 },
    { name: "Job Growth %", min: 0, max: 5 },
    { name: "Inventory (mo)", min: 1, max: 4 },
    { name: "Price Chg %", min: -3, max: 8 },
  ];

  const parallelMarkets = selectedMarkets.map((m) => ({
    name: `${m.name}, ${m.state}`,
    color: m.color,
    values: [m.hyperScore, m.medianPrice / 1000, m.capRate, m.popGrowth, m.jobGrowth, m.inventory, m.priceChange],
  }));

  // Heatmap data: markets × metrics
  const heatmapMetrics = ["HyperScore", "Cap Rate", "Pop Growth", "Job Growth", "Price Chg", "Inventory"];
  const heatmapMarketNames = selectedMarkets.map((m) => m.name);
  const heatmapData: Array<[number, number, number]> = [];
  selectedMarkets.forEach((m, yi) => {
    const normalized = [
      m.hyperScore,
      m.capRate * 10,
      m.popGrowth * 15,
      m.jobGrowth * 12,
      (m.priceChange + 3) * 8,
      (5 - m.inventory) * 20,
    ];
    normalized.forEach((val, xi) => {
      heatmapData.push([xi, yi, Math.round(Math.max(0, Math.min(100, val)))]);
    });
  });

  // Map data
  const mapData = selectedMarkets.map((m) => ({
    zip: m.zip,
    lat: m.lat,
    lng: m.lng,
    value: m.hyperScore,
    label: `${m.name}, ${m.state}`,
  }));

  const dimConfig = DIMENSIONS.find((d) => d.id === activeDimension)!;
  const bestMarket = selectedMarkets.reduce((best, m) => (m.hyperScore > (best?.hyperScore ?? 0) ? m : best), selectedMarkets[0]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">{"\u9F8D\u7A74"} Dragon&apos;s Lairs — Market Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scanning for where the dragon sleeps — markets where forces converge
        </p>
      </div>

      {/* Selected markets strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-nowrap md:flex-wrap">
        {selectedMarkets.map((market) => (
          <div key={market.zip} className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg flex-shrink-0">
            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: market.color }} />
            <span className="text-sm text-gray-200 font-medium">{market.name}, {market.state}</span>
            <span className="text-xs text-gray-500 font-mono">{market.hyperScore}</span>
            <button onClick={() => removeMarket(market.zip)} className="text-gray-600 hover:text-red-400 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {selectedZips.length < 8 && (
          <div className="relative">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-elevated border border-dashed border-surface-border rounded-lg">
              <Plus className="h-3.5 w-3.5 text-gray-600" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Add market..." className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-28" />
            </div>
            {searchQuery && unselectedMarkets.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl z-20 w-56 max-h-48 overflow-y-auto">
                {unselectedMarkets.map((m) => (
                  <button key={m.zip} onClick={() => { addMarket(m.zip); setSearchQuery(""); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-surface-elevated transition-colors">
                    <span>{m.name}, {m.state}</span>
                    <span className="text-xs text-gray-500 font-mono">{m.zip}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Best Market" value={bestMarket?.name ?? "—"} trend="up" trendValue={`Score: ${bestMarket?.hyperScore ?? 0}`} color="green" icon={TrendingUp} />
        <MetricCard label="Avg HyperScore" value={`${selectedMarkets.length > 0 ? Math.round(selectedMarkets.reduce((s, m) => s + m.hyperScore, 0) / selectedMarkets.length) : 0}/100`} color="gold" icon={TrendingUp} />
        <MetricCard label="Avg Cap Rate" value={`${selectedMarkets.length > 0 ? (selectedMarkets.reduce((s, m) => s + m.capRate, 0) / selectedMarkets.length).toFixed(1) : 0}%`} color="blue" icon={TrendingUp} />
        <MetricCard label="Markets Compared" value={`${selectedMarkets.length}`} color="gray" icon={TrendingUp} />
      </div>

      {/* Multi-view tabs */}
      <Card>
        <Tabs tabs={viewTabs} onChange={(tabId) => capture("market.viewed", { tab: tabId })}>
          {(activeView) => {
            if (activeView === "correlations") {
              // Build correlation data for all selected markets
              const correlationData = selectedMarkets.map((m) => ({
                name: `${m.name}, ${m.state}`,
                color: m.color,
                medianPrice: m.medianPrice,
                medianRent: 1400 + (m.hyperScore / 100) * 800,
                priceChange: m.priceChange,
                popGrowth: m.popGrowth,
                jobGrowth: m.jobGrowth,
                inventory: m.inventory,
                dom: Math.round(15 + (100 - m.hyperScore) * 0.5),
                capRate: m.capRate,
                hyperScore: m.hyperScore,
                mortgageRate: 6.95,
                priceCutPct: Math.round(10 + (100 - m.hyperScore) * 0.2),
                migration: Math.round(m.popGrowth * 0.8 * 1000) / 1000,
                permits: Math.round((m.priceChange - 2) * 3),
                medianIncome: 55000 + (m.hyperScore / 100) * 40000,
                priceToRent: Math.round(m.medianPrice / ((1400 + (m.hyperScore / 100) * 800) * 12) * 10) / 10,
                priceToIncome: Math.round(m.medianPrice / (55000 + (m.hyperScore / 100) * 40000) * 10) / 10,
                rentYield: Math.round((1400 + (m.hyperScore / 100) * 800) * 12 / m.medianPrice * 1000) / 10,
                affordability: Math.round(((m.medianPrice * 0.8 * 0.0695 / 12 * Math.pow(1.00579, 360)) / (Math.pow(1.00579, 360) - 1)) / ((55000 + (m.hyperScore / 100) * 40000) / 12) * 100),
              }));

              return (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Multi-parameter correlation views — see how metrics move together across markets. Each view shows the relationship investors use to spot buying/selling signals.
                  </p>
                  <CorrelationDashboard markets={correlationData} height={400} />
                </div>
              );
            }

            if (activeView === "ratios") {
              // Compute derived metrics for first selected market
              const primaryMarket = selectedMarkets[0];
              if (!primaryMarket) return <p className="text-sm text-gray-500 text-center py-8">Select a market to view ratios.</p>;

              const derived = computeDerivedMetrics({
                name: primaryMarket.name,
                zip: primaryMarket.zip,
                medianPrice: primaryMarket.medianPrice,
                medianRent: 1400 + (primaryMarket.hyperScore / 100) * 800,
                medianIncome: 55000 + (primaryMarket.hyperScore / 100) * 40000,
                priceGrowthRate: primaryMarket.priceChange,
                rentGrowthRate: primaryMarket.priceChange * 0.8,
                incomeGrowthRate: 3.5,
                mortgageRate: 6.95,
                inventory: primaryMarket.inventory,
                monthlyExpenseRatio: 0.4,
              });

              return (
                <div className="space-y-6">
                  <p className="text-xs text-gray-500">
                    {primaryMarket.name}, {primaryMarket.state} — investment ratios over 36 months. Toggle ratios to compare. Hover for formula breakdowns.
                  </p>
                  <MultiRatioChart
                    ratios={[
                      { key: "priceToRent", label: "Price/Rent", data: derived.priceToRent, color: "#22c55e", benchmark: 19.5 },
                      { key: "rentYield", label: "Rent Yield %", data: derived.rentYield, color: "#f59e0b", benchmark: 5.1 },
                      { key: "priceToIncome", label: "Price/Income", data: derived.priceToIncome, color: "#3b82f6", benchmark: 4.8 },
                      { key: "affordabilityIndex", label: "Affordability %", data: derived.affordabilityIndex, color: "#ef4444", benchmark: 28 },
                      { key: "appreciationVsRentGrowth", label: "Price-Rent Divergence", data: derived.appreciationVsRentGrowth, color: "#a855f7", benchmark: 0 },
                    ]}
                    height={450}
                    showBenchmarks
                  />

                  {/* Cap Rate + Cash Flow side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Cap Rate Trend</p>
                      <MultiRatioChart
                        ratios={[
                          { key: "capRateTrend", label: "Cap Rate %", data: derived.capRateTrend, color: "#22c55e", benchmark: 5.2 },
                        ]}
                        height={200}
                        showBrush={false}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Monthly Cash Flow per Unit</p>
                      <MultiRatioChart
                        ratios={[
                          { key: "cashFlowPerUnit", label: "Cash Flow $/mo", data: derived.cashFlowPerUnit, color: derived.cashFlowPerUnit[derived.cashFlowPerUnit.length - 1]?.value >= 0 ? "#22c55e" : "#ef4444" },
                        ]}
                        height={200}
                        showBrush={false}
                        showBenchmarks={false}
                      />
                    </div>
                  </div>
                </div>
              );
            }

            if (activeView === "timeline") {
              return (
                <div className="space-y-4">
                  {/* Dimension selector */}
                  <div className="flex items-center gap-1 bg-surface-elevated rounded-lg p-1 w-fit overflow-x-auto max-w-full">
                    {DIMENSIONS.map((dim) => (
                      <button key={dim.id} onClick={() => setActiveDimension(dim.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0 whitespace-nowrap ${
                          activeDimension === dim.id
                            ? "bg-money-900/50 text-money-400 border border-money-700/50"
                            : "text-gray-500 hover:text-gray-300 hover:bg-surface-muted border border-transparent"
                        }`}>
                        {dim.label}
                      </button>
                    ))}
                  </div>
                  <TimeSeriesChart
                    data={chartData}
                    series={selectedMarkets.map((m) => ({
                      key: m.zip, name: `${m.name}, ${m.state}`, color: m.color, type: "line" as const,
                    }))}
                    height={400}
                    showBrush={chartData.length > 12}
                    showTimeRanges
                    formatY={dimConfig.format}
                    syncId="market-comparison"
                  />
                </div>
              );
            }

            if (activeView === "parallel") {
              return (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Each vertical axis = one metric. Each line = one market. Brush any axis to filter.
                  </p>
                  <ParallelCoordinatesChart
                    dimensions={parallelDimensions}
                    markets={parallelMarkets}
                    height={450}
                  />
                </div>
              );
            }

            if (activeView === "heatmap") {
              return (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Normalized scores (0-100). Green = strong. Dark = weak. Compare at a glance.
                  </p>
                  <HeatmapChart
                    xLabels={heatmapMetrics}
                    yLabels={heatmapMarketNames}
                    data={heatmapData}
                    height={Math.max(300, selectedMarkets.length * 50 + 100)}
                    minValue={0}
                    maxValue={100}
                  />
                </div>
              );
            }

            if (activeView === "map") {
              return (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    HyperScore by location. Green = strong market. Red = weak.
                  </p>
                  <ChoroplethMap
                    data={mapData}
                    height={500}
                    valueLabel="HyperScore"
                  />
                </div>
              );
            }

            return null;
          }}
        </Tabs>
      </Card>

      {/* Market detail table */}
      <Card header="Market Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-surface-border">
                <th className="py-3 px-3 text-left">Market</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3 text-center">Signal</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Change</th>
                <th className="py-3 px-3 text-right">Cap Rate</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Pop</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Jobs</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Inv.</th>
                <th className="py-3 px-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {selectedMarkets.map((m) => (
                <tr key={m.zip} className="hover:bg-surface-elevated transition-colors cursor-pointer" onClick={() => capture("market.viewed", { zip: m.zip })}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                      <div>
                        <span className="text-gray-200 font-medium">{m.name}, {m.state}</span>
                        <p className="text-[10px] text-gray-600 leading-tight mt-0.5">
                          {m.hyperScore > 75
                            ? "Strong convergence of forces"
                            : m.hyperScore >= 55
                              ? "Mixed reading \u2014 selective opportunity"
                              : "Forces scattered \u2014 patience advised"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`font-mono font-bold ${m.hyperScore >= 70 ? "text-money-400" : m.hyperScore >= 50 ? "text-gold-400" : "text-red-400"}`}>{m.hyperScore}</span>
                  </td>
                  <td className="py-3 px-3 text-center"><Badge variant={signalVariant(m.signal)} size="sm">{m.signal}</Badge></td>
                  <td className="py-3 px-3 text-right font-mono text-gray-300">${(m.medianPrice / 1000).toFixed(0)}K</td>
                  <td className="py-3 px-3 text-right"><span className={`font-mono ${m.priceChange >= 0 ? "text-money-400" : "text-red-400"}`}>{m.priceChange >= 0 ? "+" : ""}{m.priceChange}%</span></td>
                  <td className="py-3 px-3 text-right font-mono text-money-400">{m.capRate}%</td>
                  <td className="py-3 px-3 text-right font-mono text-gold-400 hidden md:table-cell">+{m.popGrowth}%</td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400 hidden md:table-cell">+{m.jobGrowth}%</td>
                  <td className="py-3 px-3 text-right hidden md:table-cell"><span className={`font-mono ${m.inventory <= 2 ? "text-money-400" : m.inventory <= 3 ? "text-gold-400" : "text-red-400"}`}>{m.inventory}</span></td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isWatching(m.zip)) {
                            unwatchMarket(m.zip);
                            capture("market.unwatched", { zip: m.zip });
                          } else {
                            watchMarket({ zip: m.zip, name: m.name, state: m.state });
                            capture("market.watched", { zip: m.zip });
                          }
                        }}
                        className={`p-1 rounded transition-colors ${isWatching(m.zip) ? "text-money-400 hover:text-money-300" : "text-gray-600 hover:text-gray-400"}`}
                        title={isWatching(m.zip) ? "Unwatch" : "Watch"}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <Link href={`/analysis/${m.zip}`} className="text-xs text-money-400 hover:text-money-300 flex items-center gap-1">
                        Analyze <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Watchlist + Community Pulse — Moat 3 & 7 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Watchlist />
        <CommunityPulse />
      </div>

      {/* Quick-add unselected */}
      {ALL_MARKETS.filter((m) => !selectedZips.includes(m.zip)).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ALL_MARKETS.filter((m) => !selectedZips.includes(m.zip)).map((m) => (
            <button key={m.zip} onClick={() => addMarket(m.zip)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:border-surface-muted transition-colors">
              <Plus className="h-3 w-3" />{m.name}<span className="text-gray-600 font-mono">{m.hyperScore}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
