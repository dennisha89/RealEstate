"use client";

import { use, useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import HyperScoreRadar from "@/components/charts/HyperScoreRadar";
import ScenarioChart from "@/components/charts/ScenarioChart";
import KPIDriversChart from "@/components/charts/KPIDriversChart";
import DimensionBreakdownChart from "@/components/charts/DimensionBreakdownChart";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import StressTestPanel from "@/components/analysis/StressTestPanel";
import CompsTable from "@/components/analysis/CompsTable";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import {
  generateScenarios,
  generateKPIDrivers,
  generateDimensionBreakdown,
  generateMultiSeries,
  generateTimeSeries,
} from "@/lib/mock/time-series-generator";
import { formatCompact } from "@/lib/utils/format";
import {
  Target,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Building2,
  Shield,
  Heart,
  BarChart3,
  Activity,
  Zap,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: <Target className="h-4 w-4" /> },
  { id: "financial", label: "Financial", icon: <DollarSign className="h-4 w-4" /> },
  { id: "comps", label: "Comps", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "demographics", label: "Demographics", icon: <Users className="h-4 w-4" /> },
  { id: "economy", label: "Economy", icon: <Briefcase className="h-4 w-4" /> },
  { id: "infrastructure", label: "Infrastructure", icon: <Building2 className="h-4 w-4" /> },
  { id: "qol", label: "Quality of Life", icon: <Heart className="h-4 w-4" /> },
  { id: "supply", label: "Supply/Demand", icon: <Activity className="h-4 w-4" /> },
  { id: "macro", label: "Macro Risk", icon: <Shield className="h-4 w-4" /> },
];

function recommendationVariant(rec: string) {
  if (rec.includes("BUY") || rec === "GENERATIONAL_OPPORTUNITY") return "success" as const;
  if (rec.includes("PASS")) return "danger" as const;
  return "warning" as const;
}

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ zip: string }>;
}) {
  const { zip } = use(params);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch("/api/market-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property: {
              address: `Sample Property, ${zip}`,
              price: 400000,
              sqft: 1800,
              pricePerSqft: 222,
              bedrooms: 3,
              bathrooms: 2,
              yearBuilt: 2005,
              estimatedRent: 2400,
            },
            financialInputs: { downPaymentPct: 20, interestRate: 7.0 },
          }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setAnalysis(data);
      } catch {
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [zip]);

  const a = analysis?.analysis as Record<string, unknown> | undefined;
  const hyperScore = a?.hyperScore as Record<string, unknown> | undefined;
  const scenarios = generateScenarios(zip, 400000);
  const kpiDrivers = generateKPIDrivers(zip);
  const dimensionBreakdown = generateDimensionBreakdown(zip);
  const multiSeries = generateMultiSeries(zip);

  const demoSeries = generateTimeSeries(zip, { startValue: 52000, monthlyGrowthRate: 0.002, months: 24 });
  const incomeSeries = generateTimeSeries(zip + "inc", { startValue: 78000, monthlyGrowthRate: 0.003, months: 24 });
  const jobSeries = generateTimeSeries(zip + "jobs", { startValue: 3.2, monthlyGrowthRate: 0.001, volatility: 0.01, months: 24 });
  const inventorySeries = generateTimeSeries(zip + "inv", { startValue: 3.2, monthlyGrowthRate: -0.01, months: 24 });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  if (!a || !hyperScore) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analysis for {zip}.</p>
      </div>
    );
  }

  const overallScore = (hyperScore.overall as number) ?? 0;
  const recommendation = (hyperScore.recommendation as string) ?? "NEUTRAL";
  const confidence = (hyperScore.confidence as number) ?? 0;
  const dims = (hyperScore.dimensions as Record<string, { score: number; weightedScore: number; keyFactors: string[] }>) ?? {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-100">
              Market Analysis — {zip}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              8-Dimension HyperScore Analysis
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="text-4xl md:text-5xl font-bold text-money-400 font-mono">
              {overallScore}
            </div>
            <Badge variant={recommendationVariant(recommendation)} size="sm">
              {recommendation.replace(/_/g, " ")}
            </Badge>
            <p className="text-[10px] text-gray-500 mt-1">
              Confidence: {confidence}%
            </p>
          </div>
        </div>
      </div>

      {/* Radar + Scenarios side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header="HyperScore Radar">
          <HyperScoreRadar dimensions={dims} size={320} />
        </Card>
        <Card header="Appreciation Scenarios (5yr)">
          <ScenarioChart scenarios={scenarios} currentPrice={400000} />
        </Card>
      </div>

      {/* KPI Drivers + Dimension Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header="What's Driving Prices">
          <KPIDriversChart drivers={kpiDrivers} />
        </Card>
        <Card header="Dimension Breakdown">
          <DimensionBreakdownChart dimensions={dimensionBreakdown} />
        </Card>
      </div>

      {/* Tabbed Dimension Details */}
      <Card>
        <Tabs tabs={tabs}>
          {(activeTab) => {
            if (activeTab === "overview") {
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dims).map(([key, dim]) => (
                      <MetricCard
                        key={key}
                        label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                        value={`${dim.score}/100`}
                        color={dim.score >= 70 ? "green" : dim.score >= 50 ? "gold" : "red"}
                        icon={Zap}
                      />
                    ))}
                  </div>
                  {Array.isArray(hyperScore.topDrivers) && hyperScore.topDrivers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-money-400 mb-2">Top Drivers</h4>
                      <ul className="space-y-1">
                        {(hyperScore.topDrivers as Array<{ kpi: string; value: string; trend: string }>).map((d, i) => (
                          <li key={i} className="text-sm text-gray-400 pl-3 border-l-2 border-money-800">
                            {d.kpi}: {d.value} ({d.trend})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            }

            if (activeTab === "financial") {
              const fin = a.financial as Record<string, unknown> | undefined;
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox label="Cap Rate" value={`${((fin?.capRate as number) ?? 0).toFixed(1)}%`} />
                    <StatBox label="Cash Flow" value={`$${((fin?.monthlyCashFlow as number) ?? 0).toLocaleString()}/mo`} />
                    <StatBox label="DSCR" value={`${((fin?.debtServiceCoverageRatio as number) ?? 0).toFixed(2)}`} />
                    <StatBox label="GRM" value={`${((fin?.grossRentMultiplier as number) ?? 0).toFixed(1)}`} />
                  </div>
                  <StressTestPanel
                    baseMonthlyRent={2400}
                    baseMortgage={1800}
                    baseExpenses={500}
                    interestRate={7.0}
                    purchasePrice={400000}
                    downPaymentPct={20}
                  />
                </div>
              );
            }

            if (activeTab === "comps") {
              const comps = a.comps as { comparables?: Array<{ address: string; price: number; sqft: number; pricePerSqft: number; bedrooms: number; bathrooms: number; yearBuilt: number; daysOnMarket?: number; distance?: number; similarity?: number }> } | undefined;
              return (
                <CompsTable
                  comps={comps?.comparables ?? []}
                  subjectPrice={400000}
                />
              );
            }

            if (activeTab === "demographics") {
              return (
                <div className="space-y-4">
                  <TimeSeriesChart
                    data={demoSeries}
                    series={[{ key: "value", name: "Population", color: "#a855f7", type: "area" }]}
                    height={220}
                  />
                  <TimeSeriesChart
                    data={incomeSeries}
                    series={[{ key: "value", name: "Median Income", color: "#22c55e", type: "line" }]}
                    height={220}
                    formatY={(v) => `$${formatCompact(v)}`}
                  />
                </div>
              );
            }

            if (activeTab === "economy") {
              return (
                <TimeSeriesChart
                  data={jobSeries}
                  series={[{ key: "value", name: "Job Growth %", color: "#f59e0b", type: "area" }]}
                  height={280}
                  formatY={(v) => `${v.toFixed(1)}%`}
                />
              );
            }

            if (activeTab === "supply") {
              return (
                <TimeSeriesChart
                  data={inventorySeries}
                  series={[{ key: "value", name: "Months of Inventory", color: "#06b6d4", type: "area" }]}
                  height={280}
                  formatY={(v) => `${v.toFixed(1)} mo`}
                />
              );
            }

            return (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  Detailed {activeTab} analysis data displayed here with time-series charts.
                </p>
              </div>
            );
          }}
        </Tabs>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-surface-elevated rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-mono font-medium text-gray-200">{value}</p>
    </div>
  );
}
