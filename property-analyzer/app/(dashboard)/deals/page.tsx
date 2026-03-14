"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Building2,
  MapPin,
  ArrowUpDown,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MetricCard from "@/components/ui/MetricCard";
import DealGradeBadge from "@/components/analysis/DealGradeBadge";
import { DollarSign, Target, TrendingUp, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface Deal {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  grade: string;
  score: number;
  capRate: number;
  cashOnCash: number;
  cashFlow: number;
  bedrooms: number;
  sqft: number;
  type: string;
}

const sampleDeals: Deal[] = [
  { id: "1", address: "1423 Cedar Ridge Dr", city: "Austin", state: "TX", price: 285000, grade: "A+", score: 92, capRate: 8.1, cashOnCash: 13.2, cashFlow: 580, bedrooms: 3, sqft: 1450, type: "SFR" },
  { id: "2", address: "782 Oakwood Blvd", city: "Nashville", state: "TN", price: 225000, grade: "A", score: 84, capRate: 7.4, cashOnCash: 11.1, cashFlow: 420, bedrooms: 3, sqft: 1280, type: "SFR" },
  { id: "3", address: "3901 Pine Valley Ct", city: "Tampa", state: "FL", price: 198000, grade: "A-", score: 78, capRate: 6.9, cashOnCash: 9.8, cashFlow: 350, bedrooms: 2, sqft: 1100, type: "Condo" },
  { id: "4", address: "567 Magnolia St", city: "Raleigh", state: "NC", price: 310000, grade: "B+", score: 72, capRate: 6.2, cashOnCash: 8.5, cashFlow: 280, bedrooms: 4, sqft: 1680, type: "SFR" },
  { id: "5", address: "2100 River Walk Pl", city: "Denver", state: "CO", price: 345000, grade: "B", score: 64, capRate: 5.5, cashOnCash: 7.1, cashFlow: 190, bedrooms: 3, sqft: 1520, type: "Townhome" },
  { id: "6", address: "891 Palm Harbor Dr", city: "Phoenix", state: "AZ", price: 265000, grade: "B", score: 61, capRate: 5.3, cashOnCash: 6.8, cashFlow: 150, bedrooms: 3, sqft: 1350, type: "SFR" },
  { id: "7", address: "4455 Sunset Mesa Way", city: "Las Vegas", state: "NV", price: 195000, grade: "C+", score: 48, capRate: 4.5, cashOnCash: 4.2, cashFlow: 60, bedrooms: 2, sqft: 980, type: "Condo" },
  { id: "8", address: "1200 Market Square", city: "Charlotte", state: "NC", price: 410000, grade: "C", score: 38, capRate: 3.8, cashOnCash: 2.9, cashFlow: -45, bedrooms: 4, sqft: 2100, type: "SFR" },
];

function gradeVariant(grade: string) {
  if (grade.startsWith("A")) return "success" as const;
  if (grade.startsWith("B")) return "warning" as const;
  return "danger" as const;
}

export default function DealsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "capRate" | "cashFlow" | "price">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = sampleDeals
    .filter((d) =>
      searchQuery === "" ||
      d.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.city.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      return (a[sortBy] - b[sortBy]) * mul;
    });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const topDeal = filtered[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Deal Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-ranked investment opportunities across target markets
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Deals Found"
          value={`${filtered.length}`}
          color="blue"
          icon={Zap}
        />
        <MetricCard
          label="Avg Cap Rate"
          value={`${(filtered.reduce((s, d) => s + d.capRate, 0) / filtered.length).toFixed(1)}%`}
          color="green"
          icon={Target}
        />
        <MetricCard
          label="Avg Cash Flow"
          value={formatCurrency(filtered.reduce((s, d) => s + d.cashFlow, 0) / filtered.length)}
          color="gold"
          icon={DollarSign}
        />
        <MetricCard
          label="Top Grade"
          value={topDeal?.grade || "—"}
          color="green"
          icon={TrendingUp}
        />
      </div>

      {/* Search + filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address or city..."
              className="w-full bg-surface-card border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors"
            />
          </div>
        </div>
        <Button variant="secondary">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Deal list */}
      <Card>
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-surface-border">
          <div className="col-span-4">Property</div>
          <div className="col-span-1 text-center">Grade</div>
          <div className="col-span-2 text-right">
            <button onClick={() => toggleSort("price")} className="inline-flex items-center gap-1 hover:text-gray-300">
              Price <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className="col-span-1 text-right">
            <button onClick={() => toggleSort("capRate")} className="inline-flex items-center gap-1 hover:text-gray-300">
              Cap <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className="col-span-2 text-right">
            <button onClick={() => toggleSort("cashFlow")} className="inline-flex items-center gap-1 hover:text-gray-300">
              Cash Flow <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className="col-span-2 text-right">
            <button onClick={() => toggleSort("score")} className="inline-flex items-center gap-1 hover:text-gray-300">
              CoC <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-surface-border">
          {filtered.map((deal) => (
            <div
              key={deal.id}
              className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-surface-elevated transition-colors cursor-pointer group"
            >
              <div className="col-span-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-surface-elevated group-hover:bg-surface-muted transition-colors">
                    <Building2 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {deal.address}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {deal.city}, {deal.state} &middot; {deal.bedrooms}bd &middot; {deal.sqft.toLocaleString()}sf &middot; {deal.type}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-1 flex justify-center items-center">
                <Badge variant={gradeVariant(deal.grade)} size="sm">
                  {deal.grade}
                </Badge>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <span className="text-sm font-mono text-gray-300">
                  {formatCurrency(deal.price)}
                </span>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <span className={`text-sm font-mono ${deal.capRate >= 6 ? "text-money-400" : deal.capRate >= 4 ? "text-gold-400" : "text-red-400"}`}>
                  {deal.capRate}%
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <span className={`text-sm font-mono ${deal.cashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
                  {deal.cashFlow >= 0 ? "+" : ""}{formatCurrency(deal.cashFlow)}/mo
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <span className={`text-sm font-mono ${deal.cashOnCash >= 8 ? "text-money-400" : deal.cashOnCash >= 5 ? "text-gold-400" : "text-red-400"}`}>
                  {deal.cashOnCash}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
