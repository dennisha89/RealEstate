"use client";

import {
  DollarSign,
  TrendingUp,
  Building2,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SparklineChart from "@/components/charts/SparklineChart";

const recentAnalyses = [
  { address: "123 Main St, Austin, TX", grade: "A+", capRate: 7.8, coc: 12.3, trend: "up" as const },
  { address: "456 Oak Ave, Denver, CO", grade: "A", capRate: 6.5, coc: 9.1, trend: "up" as const },
  { address: "789 Pine Rd, Phoenix, AZ", grade: "B+", capRate: 5.9, coc: 7.4, trend: "flat" as const },
  { address: "321 Elm Blvd, Nashville, TN", grade: "B", capRate: 5.2, coc: 6.8, trend: "down" as const },
  { address: "654 Cedar Ln, Tampa, FL", grade: "C+", capRate: 4.1, coc: 3.9, trend: "down" as const },
];

const marketAlerts = [
  { market: "Austin, TX", signal: "Inventory down 15% MoM", type: "bullish" as const },
  { market: "Denver, CO", signal: "Mortgage rates up 25bps", type: "bearish" as const },
  { market: "Phoenix, AZ", signal: "Cap rates expanding", type: "neutral" as const },
  { market: "Nashville, TN", signal: "New employer HQ announced", type: "bullish" as const },
];

function gradeVariant(grade: string) {
  if (grade.startsWith("A")) return "success" as const;
  if (grade.startsWith("B")) return "warning" as const;
  return "danger" as const;
}

function signalVariant(type: "bullish" | "bearish" | "neutral") {
  if (type === "bullish") return "success" as const;
  if (type === "bearish") return "danger" as const;
  return "neutral" as const;
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Portfolio overview and market signals
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Portfolio Value"
          value="$1.24M"
          trend="up"
          trendValue="+5.2% YTD"
          color="green"
          icon={DollarSign}
        />
        <MetricCard
          label="Monthly Cash Flow"
          value="$3,420"
          trend="up"
          trendValue="+$280 vs last mo"
          color="green"
          icon={TrendingUp}
        />
        <MetricCard
          label="Avg Cap Rate"
          value="7.2%"
          trend="flat"
          trendValue="Stable"
          color="gold"
          icon={Target}
        />
        <MetricCard
          label="Properties Tracked"
          value="12"
          trend="up"
          trendValue="+3 this week"
          color="blue"
          icon={Building2}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header="Portfolio Value (12 months)">
          <SparklineChart
            data={[980, 1010, 1030, 1050, 1020, 1060, 1090, 1120, 1150, 1180, 1210, 1240]}
            height={200}
            color="#22c55e"
            showArea
          />
        </Card>
        <Card header="Monthly Cash Flow">
          <SparklineChart
            data={[2800, 2950, 3100, 2900, 3050, 3200, 3100, 3250, 3300, 3150, 3380, 3420]}
            height={200}
            color="#f59e0b"
            showArea
          />
        </Card>
      </div>

      {/* Bottom row: Recent analyses + Market alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent analyses */}
        <div className="lg:col-span-2">
          <Card header="Recent Analyses">
            <div className="space-y-1">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Property</div>
                <div className="col-span-2 text-center">Grade</div>
                <div className="col-span-2 text-right">Cap Rate</div>
                <div className="col-span-3 text-right">Cash-on-Cash</div>
              </div>
              {recentAnalyses.map((analysis, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-4 px-3 py-3 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer group"
                >
                  <div className="col-span-5 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />
                    <span className="text-sm text-gray-300 truncate">
                      {analysis.address}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Badge variant={gradeVariant(analysis.grade)}>
                      {analysis.grade}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono text-gray-300">
                      {analysis.capRate}%
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-sm font-mono text-gray-300">
                      {analysis.coc}%
                    </span>
                    {analysis.trend === "up" ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-money-400" />
                    ) : analysis.trend === "down" ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <Activity className="h-3.5 w-3.5 text-gray-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Market alerts */}
        <Card header="Market Signals">
          <div className="space-y-3">
            {marketAlerts.map((alert, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-surface-elevated border border-surface-border hover:border-surface-muted transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-200">
                    {alert.market}
                  </span>
                  <Badge variant={signalVariant(alert.type)} size="sm">
                    {alert.type === "bullish" ? (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Bullish
                      </span>
                    ) : alert.type === "bearish" ? (
                      <span className="flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3" /> Bearish
                      </span>
                    ) : (
                      "Neutral"
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{alert.signal}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
