"use client";

import { useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Home,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import SparklineChart from "@/components/charts/SparklineChart";
import MarketComparisonChart from "@/components/charts/MarketComparisonChart";

interface Market {
  name: string;
  state: string;
  zip: string;
  medianPrice: number;
  priceChange: number;
  capRate: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  signal: "bullish" | "bearish" | "neutral";
  priceHistory: number[];
}

const sampleMarkets: Market[] = [
  { name: "Austin", state: "TX", zip: "78701", medianPrice: 425000, priceChange: 5.2, capRate: 7.1, popGrowth: 3.8, jobGrowth: 4.2, inventory: 1.8, signal: "bullish", priceHistory: [380, 390, 395, 400, 405, 410, 405, 415, 420, 418, 422, 425] },
  { name: "Nashville", state: "TN", zip: "37201", medianPrice: 385000, priceChange: 4.8, capRate: 6.5, popGrowth: 2.9, jobGrowth: 3.5, inventory: 2.1, signal: "bullish", priceHistory: [345, 350, 358, 360, 365, 368, 372, 375, 378, 380, 382, 385] },
  { name: "Tampa", state: "FL", zip: "33601", medianPrice: 315000, priceChange: 3.1, capRate: 6.8, popGrowth: 2.5, jobGrowth: 2.8, inventory: 2.4, signal: "neutral", priceHistory: [290, 295, 298, 300, 302, 305, 308, 306, 310, 312, 313, 315] },
  { name: "Phoenix", state: "AZ", zip: "85001", medianPrice: 365000, priceChange: -1.2, capRate: 5.8, popGrowth: 1.8, jobGrowth: 2.1, inventory: 3.2, signal: "bearish", priceHistory: [375, 378, 380, 376, 374, 372, 370, 368, 365, 366, 364, 365] },
  { name: "Denver", state: "CO", zip: "80201", medianPrice: 520000, priceChange: 1.5, capRate: 5.2, popGrowth: 1.5, jobGrowth: 2.4, inventory: 2.8, signal: "neutral", priceHistory: [505, 508, 510, 512, 515, 513, 516, 518, 517, 519, 518, 520] },
  { name: "Raleigh", state: "NC", zip: "27601", medianPrice: 380000, priceChange: 6.1, capRate: 6.9, popGrowth: 3.2, jobGrowth: 4.5, inventory: 1.6, signal: "bullish", priceHistory: [340, 348, 352, 355, 360, 362, 365, 368, 370, 374, 377, 380] },
];

const comparisonData = sampleMarkets.slice(0, 5).map((m) => ({
  market: m.name,
  capRate: m.capRate,
  appreciation: m.priceChange,
  cashFlow: m.capRate - 2,
}));

function signalVariant(signal: "bullish" | "bearish" | "neutral") {
  if (signal === "bullish") return "success" as const;
  if (signal === "bearish") return "danger" as const;
  return "neutral" as const;
}

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = sampleMarkets.filter(
    (m) =>
      searchQuery === "" ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.zip.includes(searchQuery)
  );

  const avgCapRate = filtered.reduce((s, m) => s + m.capRate, 0) / filtered.length;
  const avgGrowth = filtered.reduce((s, m) => s + m.popGrowth, 0) / filtered.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Market Research</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare markets by demographics, economics, and investment metrics
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Markets Tracked"
          value={`${filtered.length}`}
          color="blue"
          icon={Home}
        />
        <MetricCard
          label="Avg Cap Rate"
          value={`${avgCapRate.toFixed(1)}%`}
          color="green"
          icon={DollarSign}
        />
        <MetricCard
          label="Avg Pop Growth"
          value={`${avgGrowth.toFixed(1)}%`}
          trend="up"
          trendValue="Annual"
          color="gold"
          icon={Users}
        />
        <MetricCard
          label="Bullish Markets"
          value={`${filtered.filter((m) => m.signal === "bullish").length}`}
          color="green"
          icon={TrendingUp}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by city or zip code..."
          className="w-full bg-surface-card border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors"
        />
      </div>

      {/* Comparison chart */}
      <Card header="Market Comparison">
        <MarketComparisonChart data={comparisonData} />
      </Card>

      {/* Market cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((market) => (
          <div
            key={market.zip}
            className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-surface-muted transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-200 group-hover:text-money-400 transition-colors">
                  {market.name}, {market.state}
                </h3>
                <p className="text-xs text-gray-500">{market.zip}</p>
              </div>
              <Badge variant={signalVariant(market.signal)} size="sm">
                {market.signal}
              </Badge>
            </div>

            {/* Sparkline */}
            <div className="mb-4">
              <SparklineChart
                data={market.priceHistory}
                height={50}
                color={market.priceChange >= 0 ? "#22c55e" : "#ef4444"}
              />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Median Price</p>
                <p className="text-sm font-semibold text-gray-200 font-mono">
                  ${(market.medianPrice / 1000).toFixed(0)}K
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Price Change</p>
                <p className={`text-sm font-semibold font-mono flex items-center gap-1 ${market.priceChange >= 0 ? "text-money-400" : "text-red-400"}`}>
                  {market.priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {market.priceChange >= 0 ? "+" : ""}{market.priceChange}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cap Rate</p>
                <p className="text-sm font-semibold text-money-400 font-mono">{market.capRate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pop Growth</p>
                <p className="text-sm font-semibold text-gold-400 font-mono">+{market.popGrowth}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Growth</p>
                <p className="text-sm font-semibold text-blue-400 font-mono flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  +{market.jobGrowth}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Inventory (mo)</p>
                <p className={`text-sm font-semibold font-mono ${market.inventory <= 2 ? "text-money-400" : market.inventory <= 3 ? "text-gold-400" : "text-red-400"}`}>
                  {market.inventory}
                </p>
              </div>
            </div>

            {/* View details link */}
            <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-end">
              <span className="text-xs text-gray-500 group-hover:text-money-400 transition-colors flex items-center gap-1">
                View details <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
