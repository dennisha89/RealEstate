"use client";

import { useState } from "react";
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
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Tabs from "@/components/ui/Tabs";
import SparklineChart from "@/components/charts/SparklineChart";
import PriceHistoryChart from "@/components/charts/PriceHistoryChart";

interface TrendSeries {
  label: string;
  data: number[];
  change: number;
  current: string;
  icon: typeof TrendingUp;
  color: string;
}

const nationalTrends: TrendSeries[] = [
  {
    label: "Median Home Price",
    data: [375, 382, 388, 395, 401, 398, 405, 410, 415, 418, 422, 428],
    change: 5.2,
    current: "$428K",
    icon: Home,
    color: "#22c55e",
  },
  {
    label: "30Y Mortgage Rate",
    data: [6.8, 6.9, 7.0, 7.1, 7.2, 7.0, 6.9, 6.8, 6.7, 6.9, 7.0, 6.95],
    change: 0.15,
    current: "6.95%",
    icon: DollarSign,
    color: "#f59e0b",
  },
  {
    label: "Inventory (Months)",
    data: [2.8, 2.9, 3.0, 3.1, 3.2, 3.1, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4],
    change: -14.3,
    current: "2.4 mo",
    icon: Activity,
    color: "#3b82f6",
  },
  {
    label: "Unemployment Rate",
    data: [3.8, 3.7, 3.7, 3.6, 3.5, 3.6, 3.5, 3.4, 3.5, 3.4, 3.5, 3.4],
    change: -10.5,
    current: "3.4%",
    icon: Briefcase,
    color: "#a855f7",
  },
];

const marketTrends = [
  {
    city: "Austin, TX",
    priceData: [380, 390, 395, 400, 405, 410, 405, 415, 420, 418, 422, 425],
    rentData: [1800, 1820, 1840, 1860, 1880, 1900, 1910, 1920, 1940, 1950, 1960, 1980],
    popGrowth: 3.8,
    jobGrowth: 4.2,
    priceChange: 5.2,
    rentChange: 4.8,
    signal: "bullish" as const,
  },
  {
    city: "Nashville, TN",
    priceData: [345, 350, 358, 360, 365, 368, 372, 375, 378, 380, 382, 385],
    rentData: [1600, 1610, 1625, 1640, 1650, 1660, 1675, 1690, 1700, 1710, 1720, 1735],
    popGrowth: 2.9,
    jobGrowth: 3.5,
    priceChange: 4.8,
    rentChange: 3.9,
    signal: "bullish" as const,
  },
  {
    city: "Tampa, FL",
    priceData: [290, 295, 298, 300, 302, 305, 308, 306, 310, 312, 313, 315],
    rentData: [1400, 1410, 1420, 1430, 1440, 1445, 1450, 1460, 1465, 1470, 1475, 1480],
    popGrowth: 2.5,
    jobGrowth: 2.8,
    priceChange: 3.1,
    rentChange: 2.8,
    signal: "neutral" as const,
  },
  {
    city: "Phoenix, AZ",
    priceData: [375, 378, 380, 376, 374, 372, 370, 368, 365, 366, 364, 365],
    rentData: [1550, 1545, 1540, 1535, 1530, 1525, 1520, 1520, 1518, 1515, 1510, 1510],
    popGrowth: 1.8,
    jobGrowth: 2.1,
    priceChange: -1.2,
    rentChange: -2.1,
    signal: "bearish" as const,
  },
  {
    city: "Denver, CO",
    priceData: [505, 508, 510, 512, 515, 513, 516, 518, 517, 519, 518, 520],
    rentData: [1900, 1905, 1910, 1915, 1920, 1918, 1922, 1925, 1928, 1930, 1932, 1935],
    popGrowth: 1.5,
    jobGrowth: 2.4,
    priceChange: 1.5,
    rentChange: 1.0,
    signal: "neutral" as const,
  },
  {
    city: "Raleigh, NC",
    priceData: [340, 348, 352, 355, 360, 362, 365, 368, 370, 374, 377, 380],
    rentData: [1500, 1520, 1530, 1545, 1560, 1570, 1580, 1595, 1605, 1615, 1625, 1640],
    popGrowth: 3.2,
    jobGrowth: 4.5,
    priceChange: 6.1,
    rentChange: 5.8,
    signal: "bullish" as const,
  },
];

const priceHistoryData = [
  { date: "Mar '25", price: 395000, lowerBound: 380000, upperBound: 410000 },
  { date: "Apr '25", price: 401000, lowerBound: 385000, upperBound: 417000 },
  { date: "May '25", price: 398000, lowerBound: 382000, upperBound: 414000 },
  { date: "Jun '25", price: 405000, lowerBound: 388000, upperBound: 422000 },
  { date: "Jul '25", price: 410000, lowerBound: 392000, upperBound: 428000 },
  { date: "Aug '25", price: 415000, lowerBound: 396000, upperBound: 434000 },
  { date: "Sep '25", price: 418000, lowerBound: 400000, upperBound: 436000 },
  { date: "Oct '25", price: 420000, lowerBound: 402000, upperBound: 438000 },
  { date: "Nov '25", price: 422000, lowerBound: 404000, upperBound: 440000 },
  { date: "Dec '25", price: 425000, lowerBound: 406000, upperBound: 444000 },
  { date: "Jan '26", price: 426000, lowerBound: 406000, upperBound: 446000 },
  { date: "Feb '26", price: 428000, lowerBound: 408000, upperBound: 448000 },
];

function signalVariant(signal: "bullish" | "bearish" | "neutral") {
  if (signal === "bullish") return "success" as const;
  if (signal === "bearish") return "danger" as const;
  return "neutral" as const;
}

const tabItems = [
  { id: "national", label: "National" },
  { id: "markets", label: "Market Trends" },
  { id: "forecast", label: "Forecast" },
];

export default function TrendsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Trends</h1>
        <p className="text-sm text-gray-500 mt-1">
          National indicators, market trends, and price forecasts
        </p>
      </div>

      {/* National KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {nationalTrends.map((t) => (
          <MetricCard
            key={t.label}
            label={t.label}
            value={t.current}
            trend={t.change > 0 ? "up" : t.change < 0 ? "down" : "flat"}
            trendValue={`${t.change > 0 ? "+" : ""}${t.change.toFixed(1)}% YoY`}
            color={
              t.label.includes("Price")
                ? "green"
                : t.label.includes("Mortgage")
                ? "gold"
                : t.label.includes("Inventory")
                ? "blue"
                : "gray"
            }
            icon={t.icon}
          />
        ))}
      </div>

      <Tabs tabs={tabItems}>
        {(activeTab) => (
          <>
            {activeTab === "national" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {nationalTrends.map((t) => (
                    <Card header={t.label} key={t.label}>
                      <SparklineChart
                        data={t.data}
                        height={160}
                        color={t.color}
                        showArea
                      />
                      <div className="flex items-center gap-2 mt-3">
                        {t.change > 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-money-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-400" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            t.change > 0 ? "text-money-400" : "text-red-400"
                          }`}
                        >
                          {t.change > 0 ? "+" : ""}
                          {t.change.toFixed(1)}% trailing 12 months
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "markets" && (
              <div className="space-y-4 animate-fade-in">
                {marketTrends.map((m) => (
                  <div
                    key={m.city}
                    className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-surface-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-200">
                          {m.city}
                        </h3>
                        <Badge variant={signalVariant(m.signal)} size="sm">
                          {m.signal}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            Median Price ($K)
                          </p>
                          <span
                            className={`text-xs font-mono font-medium ${
                              m.priceChange >= 0
                                ? "text-money-400"
                                : "text-red-400"
                            }`}
                          >
                            {m.priceChange >= 0 ? "+" : ""}
                            {m.priceChange}% YoY
                          </span>
                        </div>
                        <SparklineChart
                          data={m.priceData}
                          height={80}
                          color={m.priceChange >= 0 ? "#22c55e" : "#ef4444"}
                          showArea
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            Median Rent
                          </p>
                          <span
                            className={`text-xs font-mono font-medium ${
                              m.rentChange >= 0
                                ? "text-money-400"
                                : "text-red-400"
                            }`}
                          >
                            {m.rentChange >= 0 ? "+" : ""}
                            {m.rentChange}% YoY
                          </span>
                        </div>
                        <SparklineChart
                          data={m.rentData}
                          height={80}
                          color={m.rentChange >= 0 ? "#f59e0b" : "#ef4444"}
                          showArea
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "forecast" && (
              <div className="space-y-6 animate-fade-in">
                <Card header="National Median Home Price — 12-Month Forecast">
                  <PriceHistoryChart
                    data={priceHistoryData}
                    showConfidenceBand
                  />
                  <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-surface-elevated rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Base Case</p>
                      <p className="text-lg font-bold text-money-400 font-mono">
                        $428K
                      </p>
                      <p className="text-xs text-money-400">+5.2% YoY</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bull Case</p>
                      <p className="text-lg font-bold text-blue-400 font-mono">
                        $448K
                      </p>
                      <p className="text-xs text-blue-400">+10.1% YoY</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bear Case</p>
                      <p className="text-lg font-bold text-red-400 font-mono">
                        $408K
                      </p>
                      <p className="text-xs text-red-400">+0.2% YoY</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card header="Key Drivers (Bullish)">
                    <ul className="space-y-2">
                      {[
                        "Low inventory constraining supply",
                        "Strong job growth in Sun Belt",
                        "Millennial household formation rising",
                        "Fed signaling rate cuts in H2",
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-gray-400"
                        >
                          <TrendingUp className="h-4 w-4 text-money-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card header="Key Risks (Bearish)">
                    <ul className="space-y-2">
                      {[
                        "Mortgage rates above 7% persist",
                        "Affordability ceiling in key metros",
                        "Commercial RE distress spillover",
                        "Recession risk from tight credit",
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-gray-400"
                        >
                          <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card header="Watch List">
                    <ul className="space-y-2">
                      {[
                        "FOMC meeting schedule & statements",
                        "Monthly housing starts report",
                        "Existing home sales data",
                        "CPI / PCE inflation readings",
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-gray-400"
                        >
                          <Activity className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
