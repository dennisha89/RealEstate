"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  SlidersHorizontal,
  Building2,
  MapPin,
  ArrowUpDown,
  Zap,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  CheckCircle2,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MetricCard from "@/components/ui/MetricCard";
import Select from "@/components/ui/Select";
import BuyBoxEditor from "@/components/ui/BuyBoxEditor";
import { DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { useBuyBoxStore, type PropertyCandidate } from "@/lib/stores/buybox-store";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

interface DealFromAPI {
  property: {
    address: string;
    price: number;
    sqft: number;
    pricePerSqft: number;
    bedrooms: number;
    bathrooms: number;
    yearBuilt: number;
    daysOnMarket?: number;
  };
  dealType: string;
  hyperScore: number;
  estimatedDiscount: number;
  projectedCashFlow: number;
  projectedAppreciation: number;
  urgency: string;
  keyReasons: string[];
  risks: string[];
}

function gradeFromScore(score: number): string {
  if (score >= 85) return "A+";
  if (score >= 75) return "A";
  if (score >= 65) return "B+";
  if (score >= 55) return "B";
  if (score >= 45) return "C+";
  if (score >= 35) return "C";
  return "D";
}

function gradeVariant(grade: string) {
  if (grade.startsWith("A")) return "success" as const;
  if (grade.startsWith("B")) return "warning" as const;
  return "danger" as const;
}

function urgencyBadge(urgency: string) {
  if (urgency === "act_now") return <Badge variant="danger" size="sm">Act Now</Badge>;
  if (urgency === "move_fast") return <Badge variant="warning" size="sm">Move Fast</Badge>;
  return <Badge variant="neutral" size="sm">{urgency.replace("_", " ")}</Badge>;
}

export default function DealsPage() {
  const [zipCodes, setZipCodes] = useState("78701");
  const [maxPrice, setMaxPrice] = useState("500000");
  const [minCapRate, setMinCapRate] = useState("4");
  const [propertyType, setPropertyType] = useState("");
  const [deals, setDeals] = useState<DealFromAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "price" | "cashFlow">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Buy Box
  const [buyBoxEnabled, setBuyBoxEnabled] = useState(false);
  const [buyBoxOpen, setBuyBoxOpen] = useState(false);
  const { matchesBox } = useBuyBoxStore();

  // Deal Pipeline
  const { addDeal, deals: pipelineDeals } = useDealPipelineStore();
  const [savedAddresses, setSavedAddresses] = useState<Set<string>>(new Set());

  // Event Capture
  const { capture } = useEventCapture();

  // Capture page view on mount
  useEffect(() => {
    capture("session.page_viewed", { pageName: "deals" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build a set of already-saved addresses from pipeline for initial state
  useEffect(() => {
    const existing = new Set(pipelineDeals.map((d) => d.address));
    setSavedAddresses(existing);
  }, [pipelineDeals]);

  const dealToCandidate = useCallback((deal: DealFromAPI): PropertyCandidate => {
    const annualCashFlow = deal.projectedCashFlow * 12;
    const estimatedNOI = annualCashFlow + deal.property.price * 0.005 * 12;
    const capRate = deal.property.price > 0 ? (estimatedNOI / deal.property.price) * 100 : 0;
    return {
      price: deal.property.price,
      capRate,
      monthlyCashFlow: deal.projectedCashFlow,
      cashOnCash: capRate * 0.8, // rough approximation
      dscr: deal.projectedCashFlow > 0 ? 1.2 : 0.8, // simplified
      propertyType: deal.dealType.includes("multi") ? "duplex" : "sfr",
      bedrooms: deal.property.bedrooms,
      yearBuilt: deal.property.yearBuilt,
      hyperScore: deal.hyperScore,
      daysOnMarket: deal.property.daysOnMarket ?? 30,
    };
  }, []);

  const handleSaveToPipeline = useCallback((deal: DealFromAPI) => {
    const address = deal.property.address;
    if (savedAddresses.has(address)) return;

    addDeal({
      status: "discovered",
      address,
      market: "",
      state: "",
      zip: "",
      price: deal.property.price,
      propertyType: deal.dealType,
    });
    setSavedAddresses((prev) => new Set(prev).add(address));
    capture("property.saved", { address, price: deal.property.price });
  }, [addDeal, savedAddresses, capture]);

  const handleDealExpand = useCallback((deal: DealFromAPI) => {
    capture("property.analyzed", {
      address: deal.property.address,
      hyperScore: deal.hyperScore,
      price: deal.property.price,
    });
  }, [capture]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDeals([]);

    try {
      const zips = zipCodes.split(",").map((z) => z.trim()).filter((z) => /^\d{5}$/.test(z));
      if (zips.length === 0) return;

      const res = await fetch("/api/deals/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: {
            markets: zips,
            propertyTypes: propertyType
              ? [propertyType]
              : ["single_family", "condo", "townhouse", "multi_family"],
            priceRange: { min: 50000, max: parseFloat(maxPrice) || 500000 },
            dealTypes: [
              "below_market_value",
              "cash_flow_play",
              "appreciation_bet",
              "value_add",
              "distressed",
              "price_reduction",
            ],
            minCapRate: parseFloat(minCapRate) || 0,
          },
        }),
      });

      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();
      setDeals(data.deals ?? []);
      setTotalScanned(data.totalScanned ?? 0);
      setScanned(true);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = deals
    .filter(
      (d) =>
        searchQuery === "" ||
        d.property.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      if (sortBy === "score") return (a.hyperScore - b.hyperScore) * mul;
      if (sortBy === "price") return (a.property.price - b.property.price) * mul;
      return (a.projectedCashFlow - b.projectedCashFlow) * mul;
    });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const avgCapRate =
    filtered.length > 0
      ? filtered.reduce(
          (s, d) =>
            s +
            (d.property.price > 0
              ? ((d.projectedCashFlow * 12 + d.property.price * 0.005 * 12) /
                  d.property.price) *
                100
              : 0),
          0
        ) / filtered.length
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          <span className="text-gold-400">聚寶盆</span> Treasure Basin &mdash; Deal Scanner
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          The legendary vessel that multiplies wealth. Find deals where the forces converge.
        </p>
      </div>

      {/* Buy Box toggle + collapsible editor */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBuyBoxEnabled(!buyBoxEnabled);
              if (!buyBoxEnabled) setBuyBoxOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              buyBoxEnabled
                ? "bg-gold-500/15 text-gold-400 border-gold-500/30"
                : "bg-surface-card text-gray-400 border-surface-border hover:border-gray-600"
            }`}
          >
            <Target className="h-4 w-4" />
            尋寶 Buy Box
          </button>
          {buyBoxEnabled && (
            <button
              onClick={() => setBuyBoxOpen(!buyBoxOpen)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {buyBoxOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {buyBoxOpen ? "Hide criteria" : "Edit criteria"}
            </button>
          )}
        </div>
        {buyBoxEnabled && buyBoxOpen && (
          <BuyBoxEditor
            compact
            onClose={() => setBuyBoxOpen(false)}
            matchCount={
              filtered.length > 0
                ? filtered.filter((d) => matchesBox(dealToCandidate(d)).passes).length
                : undefined
            }
            totalCount={filtered.length > 0 ? filtered.length : undefined}
          />
        )}
      </div>

      {/* Scan form */}
      <form onSubmit={handleScan} className="bg-surface-card border border-surface-border rounded-xl p-4 md:p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              id="zipCodes"
              label="Zip Codes (comma separated)"
              value={zipCodes}
              onChange={(e) => setZipCodes(e.target.value)}
              placeholder="78701, 37201, 33601"
              disabled={loading}
            />
            <Input
              id="maxPrice"
              label="Max Price"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              prefix="$"
              disabled={loading}
            />
            <Input
              id="minCapRate"
              label="Min Cap Rate"
              type="number"
              value={minCapRate}
              onChange={(e) => setMinCapRate(e.target.value)}
              suffix="%"
              disabled={loading}
            />
            <Select
              id="propertyType"
              label="Property Type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              placeholder="All types"
              options={[
                { value: "", label: "All Types" },
                { value: "single_family", label: "Single Family" },
                { value: "condo", label: "Condo" },
                { value: "townhouse", label: "Townhouse" },
                { value: "multi_family", label: "Multi-Family" },
              ]}
              disabled={loading}
            />
          </div>
          <Button type="submit" loading={loading} className="w-full md:w-auto">
            <Search className="h-4 w-4" />
            {loading ? "Scanning..." : "Scan for Deals"}
          </Button>
        </div>
      </form>

      {/* Results */}
      {scanned && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Deals Found"
              value={`${filtered.length}`}
              color="blue"
              icon={Zap}
            />
            <MetricCard
              label="Total Scanned"
              value={`${totalScanned}`}
              color="gray"
              icon={Search}
            />
            <MetricCard
              label="Avg Cash Flow"
              value={
                filtered.length > 0
                  ? formatCurrency(
                      filtered.reduce((s, d) => s + d.projectedCashFlow, 0) /
                        filtered.length
                    )
                  : "$0"
              }
              color="gold"
              icon={DollarSign}
            />
            <MetricCard
              label="Top Score"
              value={
                filtered.length > 0
                  ? `${Math.max(...filtered.map((d) => d.hyperScore))}/100`
                  : "—"
              }
              color="green"
              icon={TrendingUp}
            />
          </div>

          {/* Search row */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter results by address..."
                className="w-full bg-surface-card border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors"
              />
            </div>
          </div>

          {/* Deal list */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-surface-border">
                    <th className="py-3 px-4 text-left">Property</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">HyperScore</th>
                    <th className="py-3 px-4 text-right">
                      <button onClick={() => toggleSort("price")} className="inline-flex items-center gap-1 hover:text-gray-300">
                        Price <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">
                      <button onClick={() => toggleSort("cashFlow")} className="inline-flex items-center gap-1 hover:text-gray-300">
                        Cash Flow <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right hidden md:table-cell">Urgency</th>
                    {buyBoxEnabled && (
                      <th className="py-3 px-4 text-center hidden md:table-cell">Match</th>
                    )}
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={buyBoxEnabled ? 8 : 7} className="text-center py-8 text-sm text-gray-500">
                        No deals match your criteria. Try adjusting filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((deal, i) => {
                      const grade = gradeFromScore(deal.hyperScore);
                      const buyBoxMatch = buyBoxEnabled
                        ? matchesBox(dealToCandidate(deal))
                        : null;
                      const isSaved = savedAddresses.has(deal.property.address);
                      return (
                        <tr
                          key={i}
                          onClick={() => handleDealExpand(deal)}
                          className="hover:bg-surface-elevated transition-colors cursor-pointer group"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-surface-elevated group-hover:bg-surface-muted transition-colors hidden sm:block">
                                <Building2 className="h-4 w-4 text-gray-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate max-w-[200px]">
                                  {deal.property.address}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  {deal.property.bedrooms}bd / {deal.property.sqft.toLocaleString()}sf
                                  {deal.property.daysOnMarket != null && (
                                    <> &middot; {deal.property.daysOnMarket} DOM</>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-600 mt-0.5">
                                  {deal.dealType.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge variant={gradeVariant(grade)} size="sm">
                              {grade}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-center hidden md:table-cell">
                            <span
                              className={`text-sm font-mono font-medium ${
                                deal.hyperScore >= 70
                                  ? "text-money-400"
                                  : deal.hyperScore >= 50
                                  ? "text-gold-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {deal.hyperScore}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-sm font-mono text-gray-300">
                              {formatCurrency(deal.property.price)}
                            </span>
                            {deal.estimatedDiscount > 0 && (
                              <span className="block text-[10px] text-money-400 font-mono">
                                -{deal.estimatedDiscount.toFixed(0)}% below
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span
                              className={`text-sm font-mono ${
                                deal.projectedCashFlow >= 0
                                  ? "text-money-400"
                                  : "text-red-400"
                              }`}
                            >
                              {deal.projectedCashFlow >= 0 ? "+" : ""}
                              {formatCurrency(deal.projectedCashFlow)}/mo
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right hidden md:table-cell">
                            {urgencyBadge(deal.urgency)}
                          </td>
                          {buyBoxEnabled && buyBoxMatch && (
                            <td className="py-4 px-4 text-center hidden md:table-cell">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-1 rounded-md ${
                                  buyBoxMatch.passes
                                    ? "bg-money-500/15 text-money-400"
                                    : buyBoxMatch.matchScore >= 60
                                    ? "bg-gold-500/15 text-gold-400"
                                    : "bg-gray-500/15 text-gray-400"
                                }`}
                              >
                                {buyBoxMatch.matchScore}%
                              </span>
                            </td>
                          )}
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToPipeline(deal);
                              }}
                              disabled={isSaved}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isSaved
                                  ? "bg-money-500/15 text-money-400 cursor-default"
                                  : "bg-surface-elevated text-gray-400 hover:text-gray-200 hover:bg-surface-muted border border-surface-border"
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="h-3.5 w-3.5" />
                                  Save
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
