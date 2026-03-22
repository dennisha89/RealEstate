"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  MapPin,
  Plus,
  Trash2,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Button from "@/components/ui/Button";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import ScenarioChart from "@/components/charts/ScenarioChart";
import CashFlowChart from "@/components/charts/CashFlowChart";
import { formatCurrency } from "@/lib/utils/format";
import { generateTimeSeries, generateScenarios } from "@/lib/mock/time-series-generator";
import WealthAttribution from "@/components/portfolio/WealthAttribution";
import GoalTracker from "@/components/portfolio/GoalTracker";
import Link from "next/link";
import { useOracleStore } from "@/lib/stores/oracle-store";
import { useDecisionJournalStore } from "@/lib/stores/decision-journal-store";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
  monthlyExpenses: number;
  mortgage: number;
  capRate: number;
  cashOnCash: number;
  equity: number;
  appreciation: number;
  hyperScore: number;
  status: "performing" | "watch" | "underperforming";
}

const sampleProperties: Property[] = [
  {
    id: "1", address: "1423 Cedar Ridge Dr", city: "Austin", state: "TX", zip: "78701",
    purchasePrice: 285000, currentValue: 312000, monthlyRent: 2100,
    monthlyExpenses: 450, mortgage: 1180, capRate: 7.2, cashOnCash: 11.8,
    equity: 84000, appreciation: 9.5, hyperScore: 82, status: "performing",
  },
  {
    id: "2", address: "782 Oakwood Blvd", city: "Nashville", state: "TN", zip: "37201",
    purchasePrice: 225000, currentValue: 241000, monthlyRent: 1750,
    monthlyExpenses: 380, mortgage: 980, capRate: 6.5, cashOnCash: 9.4,
    equity: 61000, appreciation: 7.1, hyperScore: 76, status: "performing",
  },
  {
    id: "3", address: "3901 Pine Valley Ct", city: "Tampa", state: "FL", zip: "33601",
    purchasePrice: 198000, currentValue: 205000, monthlyRent: 1450,
    monthlyExpenses: 320, mortgage: 850, capRate: 5.8, cashOnCash: 7.1,
    equity: 47000, appreciation: 3.5, hyperScore: 64, status: "watch",
  },
  {
    id: "4", address: "567 Magnolia St", city: "Raleigh", state: "NC", zip: "27601",
    purchasePrice: 310000, currentValue: 298000, monthlyRent: 1900,
    monthlyExpenses: 480, mortgage: 1320, capRate: 4.2, cashOnCash: 2.8,
    equity: 50000, appreciation: -3.9, hyperScore: 48, status: "underperforming",
  },
];

function statusVariant(status: Property["status"]) {
  if (status === "performing") return "success" as const;
  if (status === "watch") return "warning" as const;
  return "danger" as const;
}

function hyperScoreColor(score: number) {
  if (score >= 70) return "text-money-400";
  if (score >= 50) return "text-gold-400";
  return "text-red-400";
}

export default function PortfolioPage() {
  const [properties] = useState<Property[]>(sampleProperties);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Oracle Track Record
  const oraclePredictions = useOracleStore((s) => s.predictions);
  const getOracleStats = useOracleStore((s) => s.getStats);
  const getEngineLeaderboard = useOracleStore((s) => s.getEngineLeaderboard);

  // Decision Journal
  const journalEntries = useDecisionJournalStore((s) => s.entries);
  const getJournalStats = useDecisionJournalStore((s) => s.getJournalStats);

  // Event capture
  const { capture } = useEventCapture();

  useEffect(() => {
    capture("session.page_viewed", { pageName: "portfolio" });
  }, [capture]);

  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0);
  const totalEquity = properties.reduce((s, p) => s + p.equity, 0);
  const totalCashFlow = properties.reduce(
    (s, p) => s + (p.monthlyRent - p.monthlyExpenses - p.mortgage),
    0
  );
  const avgCapRate = properties.reduce((s, p) => s + p.capRate, 0) / properties.length;

  const cashFlowData = properties.map((p) => ({
    month: p.city,
    income: p.monthlyRent,
    mortgage: p.mortgage,
    expenses: p.monthlyExpenses,
    cashFlow: p.monthlyRent - p.monthlyExpenses - p.mortgage,
  }));

  const selected = properties.find((p) => p.id === selectedId);

  // Portfolio-level time-series
  const portfolioValueSeries = generateTimeSeries("PORTFOLIO", {
    startValue: totalValue * 0.9,
    monthlyGrowthRate: 0.005,
    months: 12,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{"\u5BB6\u696D"} Family Empire</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your wealth dynasty — track, protect, and grow
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Value" value={formatCurrency(totalValue)} trend="up" trendValue="+5.8% YTD" color="green" icon={DollarSign} />
        <MetricCard label="Total Equity" value={formatCurrency(totalEquity)} trend="up" trendValue={`${properties.length} properties`} color="gold" icon={Briefcase} />
        <MetricCard label="Monthly Cash Flow" value={formatCurrency(totalCashFlow)} trend={totalCashFlow > 0 ? "up" : "down"} trendValue="Net after expenses" color={totalCashFlow > 0 ? "green" : "red"} icon={TrendingUp} />
        <MetricCard label="Avg Cap Rate" value={`${avgCapRate.toFixed(1)}%`} color="blue" icon={Percent} />
      </div>

      {/* Wealth Attribution — Moat 5 */}
      <WealthAttribution properties={properties} />

      {/* Goal Tracker — Moat 5 */}
      <GoalTracker
        currentMonthlyCashFlow={totalCashFlow}
        totalEquity={totalEquity}
        totalValue={totalValue}
        propertyCount={properties.length}
        avgCapRate={avgCapRate}
      />

      {/* Oracle Track Record */}
      <Card header={"\u5929\u547D Track Record"}>
        {oraclePredictions.length > 0 ? (() => {
          const stats = getOracleStats();
          const leaderboard = getEngineLeaderboard();
          const bestEngine = leaderboard.length > 0 ? leaderboard[0].engine : stats.bestPerformingEngine;
          return (
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <span className="font-mono text-gold-400">{stats.totalPredictions}</span> predictions logged.{" "}
                <span className="font-mono text-gold-400">{stats.predictionsWithOutcomes}</span> have outcomes.{" "}
                Accuracy: <span className={`font-mono font-medium ${stats.accuracyRate >= 60 ? "text-money-400" : stats.accuracyRate >= 40 ? "text-gold-400" : "text-red-400"}`}>
                  {stats.accuracyRate.toFixed(1)}%
                </span>
              </p>
              {bestEngine && (
                <p className="text-gray-400">
                  Best performing force: <span className="text-gold-400 font-medium">{bestEngine}</span>
                </p>
              )}
            </div>
          );
        })() : (
          <p className="text-sm text-gray-500">
            No predictions logged yet. Use the {"\u5929\u6A5F"} Pathway to start building your track record.
          </p>
        )}
      </Card>

      {/* Decision Journal Summary */}
      <Card header={"\u609F\u9053 Decision History"}>
        {journalEntries.length > 0 ? (() => {
          const stats = getJournalStats();
          const followedCount = stats.agreedWithSystem;
          const overrideCount = stats.disagreedWithSystem;
          const systemFollowedWithOutcome = stats.systemWasRight + stats.systemWasWrong;
          const systemAccuracy = systemFollowedWithOutcome > 0
            ? ((stats.systemWasRight / systemFollowedWithOutcome) * 100).toFixed(1)
            : "N/A";
          const overrideWithOutcome = stats.userOverrideWasRight + stats.userOverrideWasWrong;
          const overrideAccuracy = overrideWithOutcome > 0
            ? ((stats.userOverrideWasRight / overrideWithOutcome) * 100).toFixed(1)
            : "N/A";
          return (
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <span className="font-mono text-gold-400">{stats.totalDecisions}</span> decisions recorded.{" "}
                <span className="font-mono text-gold-400">{followedCount}</span> followed the system.{" "}
                <span className="font-mono text-gold-400">{overrideCount}</span> overrides.
              </p>
              <p className="text-gray-400">
                System accuracy when followed:{" "}
                <span className={`font-mono font-medium ${typeof systemAccuracy === "string" && systemAccuracy === "N/A" ? "text-gray-500" : Number(systemAccuracy) >= 60 ? "text-money-400" : Number(systemAccuracy) >= 40 ? "text-gold-400" : "text-red-400"}`}>
                  {systemAccuracy}{systemAccuracy !== "N/A" && "%"}
                </span>.{" "}
                Override accuracy:{" "}
                <span className={`font-mono font-medium ${typeof overrideAccuracy === "string" && overrideAccuracy === "N/A" ? "text-gray-500" : Number(overrideAccuracy) >= 60 ? "text-money-400" : Number(overrideAccuracy) >= 40 ? "text-gold-400" : "text-red-400"}`}>
                  {overrideAccuracy}{overrideAccuracy !== "N/A" && "%"}
                </span>
              </p>
            </div>
          );
        })() : (
          <p className="text-sm text-gray-500">
            No decisions recorded yet. Your {"\u609F\u9053"} Enlightenment Path begins with your first decision.
          </p>
        )}
      </Card>

      {/* Charts row — time-series */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header="Portfolio Value (12 months)">
          <TimeSeriesChart
            data={portfolioValueSeries}
            series={[{ key: "value", name: "Portfolio Value", color: "#22c55e", type: "area" }]}
            height={200}
            formatY={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
        </Card>
        <Card header="Cash Flow by Property">
          <CashFlowChart data={cashFlowData} />
        </Card>
      </div>

      {/* Property list */}
      <Card header={`Properties (${properties.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-surface-border">
                <th className="py-3 px-3 text-left">Property</th>
                <th className="py-3 px-3 text-center hidden md:table-cell">Status</th>
                <th className="py-3 px-3 text-center hidden md:table-cell">HyperScore</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Value</th>
                <th className="py-3 px-3 text-right">Cash Flow</th>
                <th className="py-3 px-3 text-right">Cap</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Appreciation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {properties.map((prop) => {
                const monthlyCF = prop.monthlyRent - prop.monthlyExpenses - prop.mortgage;
                return (
                  <tr
                    key={prop.id}
                    onClick={() => setSelectedId(selectedId === prop.id ? null : prop.id)}
                    className={`cursor-pointer transition-colors group ${
                      selectedId === prop.id
                        ? "bg-money-900/20"
                        : "hover:bg-surface-elevated"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface-elevated group-hover:bg-surface-muted transition-colors hidden sm:block">
                          <Building2 className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate max-w-[180px]">{prop.address}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {prop.city}, {prop.state}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center hidden md:table-cell">
                      <Badge variant={statusVariant(prop.status)} size="sm">
                        {prop.status === "performing" ? "Good" : prop.status === "watch" ? "Watch" : "Low"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center hidden md:table-cell">
                      <span className={`text-sm font-mono font-medium ${hyperScoreColor(prop.hyperScore)}`}>
                        {prop.hyperScore}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right hidden md:table-cell">
                      <span className="text-sm font-mono text-gray-300">{formatCurrency(prop.currentValue)}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-sm font-mono ${monthlyCF >= 0 ? "text-money-400" : "text-red-400"}`}>
                        {monthlyCF >= 0 ? "+" : ""}{formatCurrency(monthlyCF)}/mo
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-sm font-mono ${prop.capRate >= 6 ? "text-money-400" : prop.capRate >= 4 ? "text-gold-400" : "text-red-400"}`}>
                        {prop.capRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {prop.appreciation >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-money-400" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className={`text-sm font-mono ${prop.appreciation >= 0 ? "text-money-400" : "text-red-400"}`}>
                          {prop.appreciation >= 0 ? "+" : ""}{prop.appreciation}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expanded property detail — now with time-series + scenarios */}
      {selected && (
        <Card header={`${selected.address} — ${selected.city}, ${selected.state}`}>
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                <p className="text-sm md:text-lg font-bold text-gray-200 font-mono">{formatCurrency(selected.purchasePrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Current Value</p>
                <p className="text-sm md:text-lg font-bold text-money-400 font-mono">{formatCurrency(selected.currentValue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Equity</p>
                <p className="text-sm md:text-lg font-bold text-gold-400 font-mono">{formatCurrency(selected.equity)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">CoC Return</p>
                <p className="text-sm md:text-lg font-bold text-blue-400 font-mono">{selected.cashOnCash}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">HyperScore</p>
                <p className={`text-sm md:text-lg font-bold font-mono ${hyperScoreColor(selected.hyperScore)}`}>
                  {selected.hyperScore}/100
                </p>
              </div>
            </div>

            {/* Value history — time-series */}
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Value History (12 months)</p>
              <TimeSeriesChart
                data={generateTimeSeries(selected.zip, {
                  startValue: selected.purchasePrice,
                  monthlyGrowthRate: selected.appreciation > 0 ? 0.006 : -0.003,
                  months: 12,
                })}
                series={[{
                  key: "value",
                  name: "Property Value",
                  color: selected.appreciation >= 0 ? "#22c55e" : "#ef4444",
                  type: "area",
                }]}
                height={160}
                formatY={(v) => `$${(v / 1000).toFixed(0)}K`}
              />
            </div>

            {/* Appreciation Forecast */}
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Appreciation Forecast (5yr)</p>
              <ScenarioChart
                scenarios={generateScenarios(selected.zip, selected.currentValue)}
                currentPrice={selected.currentValue}
                height={200}
              />
            </div>

            {/* Monthly breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 p-4 bg-surface-elevated rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Rent</p>
                <p className="text-sm font-mono text-money-400">+{formatCurrency(selected.monthlyRent)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mortgage</p>
                <p className="text-sm font-mono text-red-400">-{formatCurrency(selected.mortgage)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-sm font-mono text-red-400">-{formatCurrency(selected.monthlyExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Cash Flow</p>
                <p className={`text-sm font-mono font-bold ${selected.monthlyRent - selected.monthlyExpenses - selected.mortgage >= 0 ? "text-money-400" : "text-red-400"}`}>
                  {formatCurrency(selected.monthlyRent - selected.monthlyExpenses - selected.mortgage)}/mo
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cap Rate</p>
                <p className="text-sm font-mono text-gold-400">{selected.capRate}%</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href={`/analysis/${selected.zip}`}>
                <Button variant="secondary" size="sm">
                  <Eye className="h-3.5 w-3.5" />
                  Full Market Analysis
                </Button>
              </Link>
              <Button variant="danger" size="sm">
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
