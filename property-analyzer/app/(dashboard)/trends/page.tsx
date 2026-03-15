"use client";

import { useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Home,
  DollarSign,
  Users,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useEventCapture } from "@/lib/hooks/useEventCapture";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Tabs from "@/components/ui/Tabs";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import ScenarioChart from "@/components/charts/ScenarioChart";
import KPIDriversChart from "@/components/charts/KPIDriversChart";
import {
  generateTimeSeries,
  generateScenarios,
  generateKPIDrivers,
} from "@/lib/mock/time-series-generator";

// Generate national time-series data
const homePriceSeries = generateTimeSeries("00000", {
  startValue: 375000,
  monthlyGrowthRate: 0.004,
  months: 24,
  seasonalAmplitude: 0.01,
});
const mortgageRateSeries = generateTimeSeries("00001", {
  startValue: 6.8,
  monthlyGrowthRate: 0.001,
  volatility: 0.01,
  months: 24,
});
const inventorySeries = generateTimeSeries("00002", {
  startValue: 2.8,
  monthlyGrowthRate: -0.01,
  months: 24,
});
const unemploymentSeries = generateTimeSeries("00003", {
  startValue: 3.8,
  monthlyGrowthRate: -0.003,
  months: 24,
});

// Market-level time-series
const marketTimeSeries = [
  { city: "Austin, TX", zip: "78701", popGrowth: 3.8, jobGrowth: 4.2, priceChange: 5.2, rentChange: 4.8, signal: "bullish" as const },
  { city: "Nashville, TN", zip: "37201", popGrowth: 2.9, jobGrowth: 3.5, priceChange: 4.8, rentChange: 3.9, signal: "bullish" as const },
  { city: "Tampa, FL", zip: "33601", popGrowth: 2.5, jobGrowth: 2.8, priceChange: 3.1, rentChange: 2.8, signal: "neutral" as const },
  { city: "Phoenix, AZ", zip: "85001", popGrowth: 1.8, jobGrowth: 2.1, priceChange: -1.2, rentChange: -2.1, signal: "bearish" as const },
  { city: "Denver, CO", zip: "80201", popGrowth: 1.5, jobGrowth: 2.4, priceChange: 1.5, rentChange: 1.0, signal: "neutral" as const },
  { city: "Raleigh, NC", zip: "27601", popGrowth: 3.2, jobGrowth: 4.5, priceChange: 6.1, rentChange: 5.8, signal: "bullish" as const },
];

const nationalScenarios = generateScenarios("00000", 428000);
const nationalKPIDrivers = generateKPIDrivers("00000");

function signalVariant(signal: "bullish" | "bearish" | "neutral") {
  if (signal === "bullish") return "success" as const;
  if (signal === "bearish") return "danger" as const;
  return "neutral" as const;
}

const lastPrice = homePriceSeries[homePriceSeries.length - 1]?.value ?? 428000;
const lastRate = mortgageRateSeries[mortgageRateSeries.length - 1]?.value ?? 6.95;
const lastInv = inventorySeries[inventorySeries.length - 1]?.value ?? 2.4;
const lastUnemp = unemploymentSeries[unemploymentSeries.length - 1]?.value ?? 3.4;

const tabItems = [
  { id: "national", label: "National" },
  { id: "markets", label: "Market Trends" },
  { id: "forecast", label: "Forecast" },
  { id: "drivers", label: "KPI Drivers" },
];

export default function TrendsPage() {
  const { capture } = useEventCapture();

  useEffect(() => {
    capture("session.page_viewed", { page: "trends" });
  }, [capture]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">{"\u904B\u52E2"} Fortune&apos;s Momentum &mdash; Trends</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reading the momentum of fate across time
        </p>
      </div>

      {/* National KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Median Home Price" value={`$${(lastPrice / 1000).toFixed(0)}K`} trend="up" trendValue="+5.2% YoY" color="green" icon={Home} />
        <MetricCard label="30Y Mortgage Rate" value={`${lastRate.toFixed(2)}%`} trend="up" trendValue="+0.15% YoY" color="gold" icon={DollarSign} />
        <MetricCard label="Inventory (Months)" value={`${lastInv.toFixed(1)} mo`} trend="down" trendValue="-14.3% YoY" color="blue" icon={Activity} />
        <MetricCard label="Unemployment" value={`${lastUnemp.toFixed(1)}%`} trend="down" trendValue="-10.5% YoY" color="gray" icon={Briefcase} />
      </div>

      <Tabs tabs={tabItems}>
        {(activeTab) => (
          <>
            {activeTab === "national" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card header="Median Home Price">
                    <TimeSeriesChart
                      data={homePriceSeries}
                      series={[{ key: "value", name: "Median Price", color: "#22c55e", type: "area" }]}
                      height={200}
                      formatY={(v) => `$${(v / 1000).toFixed(0)}K`}
                    />
                  </Card>
                  <Card header="30Y Mortgage Rate">
                    <TimeSeriesChart
                      data={mortgageRateSeries}
                      series={[{ key: "value", name: "Rate", color: "#f59e0b", type: "line" }]}
                      height={200}
                      formatY={(v) => `${v.toFixed(2)}%`}
                    />
                  </Card>
                  <Card header="Months of Inventory">
                    <TimeSeriesChart
                      data={inventorySeries}
                      series={[{ key: "value", name: "Inventory", color: "#3b82f6", type: "area" }]}
                      height={200}
                      formatY={(v) => `${v.toFixed(1)} mo`}
                    />
                  </Card>
                  <Card header="Unemployment Rate">
                    <TimeSeriesChart
                      data={unemploymentSeries}
                      series={[{ key: "value", name: "Unemployment", color: "#a855f7", type: "line" }]}
                      height={200}
                      formatY={(v) => `${v.toFixed(1)}%`}
                    />
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "markets" && (
              <div className="space-y-4 animate-fade-in">
                {marketTimeSeries.map((m) => {
                  const priceSeries = generateTimeSeries(m.zip, {
                    startValue: 300000 + Math.random() * 200000,
                    monthlyGrowthRate: m.priceChange > 0 ? 0.004 : -0.001,
                    months: 12,
                  });
                  const rentSeries = generateTimeSeries(m.zip + "r", {
                    startValue: 1500 + Math.random() * 500,
                    monthlyGrowthRate: m.rentChange > 0 ? 0.004 : -0.002,
                    months: 12,
                  });

                  return (
                    <div
                      key={m.city}
                      className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-surface-muted transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-gray-200">{m.city}</h3>
                          <Badge variant={signalVariant(m.signal)} size="sm">{m.signal}</Badge>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> Pop +{m.popGrowth}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> Jobs +{m.jobGrowth}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Median Price</p>
                            <span className={`text-xs font-mono font-medium ${m.priceChange >= 0 ? "text-money-400" : "text-red-400"}`}>
                              {m.priceChange >= 0 ? "+" : ""}{m.priceChange}% YoY
                            </span>
                          </div>
                          <TimeSeriesChart
                            data={priceSeries}
                            series={[{ key: "value", name: "Price", color: m.priceChange >= 0 ? "#22c55e" : "#ef4444", type: "area" }]}
                            height={80}
                            showGrid={false}
                            showLegend={false}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Median Rent</p>
                            <span className={`text-xs font-mono font-medium ${m.rentChange >= 0 ? "text-money-400" : "text-red-400"}`}>
                              {m.rentChange >= 0 ? "+" : ""}{m.rentChange}% YoY
                            </span>
                          </div>
                          <TimeSeriesChart
                            data={rentSeries}
                            series={[{ key: "value", name: "Rent", color: m.rentChange >= 0 ? "#f59e0b" : "#ef4444", type: "area" }]}
                            height={80}
                            showGrid={false}
                            showLegend={false}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "forecast" && (
              <div className="space-y-6 animate-fade-in">
                <Card header="National Median Home Price — 5-Year Scenario Projection">
                  <ScenarioChart
                    scenarios={nationalScenarios}
                    currentPrice={428000}
                    height={350}
                  />
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-surface-elevated rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Bull Case (5yr)</p>
                      <p className="text-lg font-bold text-money-400 font-mono">
                        ${(nationalScenarios[0].data[59]?.value / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-money-400">
                        +{(((nationalScenarios[0].data[59]?.value ?? 0) / 428000 - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Base Case (5yr)</p>
                      <p className="text-lg font-bold text-blue-400 font-mono">
                        ${(nationalScenarios[1].data[59]?.value / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-blue-400">
                        +{(((nationalScenarios[1].data[59]?.value ?? 0) / 428000 - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bear Case (5yr)</p>
                      <p className="text-lg font-bold text-red-400 font-mono">
                        ${(nationalScenarios[2].data[59]?.value / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-red-400">
                        {(((nationalScenarios[2].data[59]?.value ?? 0) / 428000 - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card header="Key Drivers (Bullish)">
                    <ul className="space-y-2">
                      {["Low inventory constraining supply", "Strong job growth in Sun Belt", "Millennial household formation rising", "Fed signaling rate cuts in H2"].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                          <TrendingUp className="h-4 w-4 text-money-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card header="Key Risks (Bearish)">
                    <ul className="space-y-2">
                      {["Mortgage rates above 7% persist", "Affordability ceiling in key metros", "Commercial RE distress spillover", "Recession risk from tight credit"].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                          <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card header="Watch List">
                    <ul className="space-y-2">
                      {["FOMC meeting schedule & statements", "Monthly housing starts report", "Existing home sales data", "CPI / PCE inflation readings"].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                          <Activity className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "drivers" && (
              <div className="space-y-6 animate-fade-in">
                <Card header="National Appreciation KPI Drivers">
                  <KPIDriversChart drivers={nationalKPIDrivers} />
                </Card>
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
