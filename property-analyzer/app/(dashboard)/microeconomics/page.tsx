"use client";

import { useState } from "react";
import { Search, Activity, TrendingUp, DollarSign, Building2, Briefcase, CreditCard, Home, Banknote } from "lucide-react";
import Card from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { useMicroeconomics } from "@/lib/hooks/useMicroeconomics";
import { generateTimeSeries } from "@/lib/mock/time-series-generator";
import { formatCompact } from "@/lib/utils/format";

export default function MicroeconomicsPage() {
  const [zip, setZip] = useState("");
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const { data, isLoading, error } = useMicroeconomics(activeZip);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{5}$/.test(zip)) setActiveZip(zip);
  };

  const profile = data?.profile;

  // Generate time-series for charts
  const mortgageSeries = activeZip
    ? generateTimeSeries(activeZip, { startValue: profile?.capitalFlows?.mortgageOriginationVolume?.current ?? 60, months: 24 })
    : [];
  const businessSeries = activeZip
    ? generateTimeSeries(activeZip + "biz", { startValue: profile?.businessActivity?.netNew ?? 100, volatility: 0.05, months: 24 })
    : [];
  const constructionSeries = activeZip
    ? generateTimeSeries(activeZip + "con", { startValue: profile?.constructionActivity?.activeProjects ?? 20, volatility: 0.04, months: 24 })
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Microeconomics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Local money velocity, capital flows, business activity, and wealth indicators
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-md">
        <Input
          id="zip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="Enter zip code (e.g., 78701)"
          disabled={isLoading}
        />
        <Button type="submit" loading={isLoading}>
          <Search className="h-4 w-4" />
          Analyze
        </Button>
      </form>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-sm text-red-400">
          Failed to load microeconomic data.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      )}

      {profile && (
        <div className="space-y-6 animate-slide-up">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Money Velocity"
              value={`${data.moneyVelocityScore}/100`}
              color={data.moneyVelocityScore >= 60 ? "green" : data.moneyVelocityScore >= 40 ? "gold" : "red"}
              icon={Activity}
            />
            <MetricCard
              label="Capital Flow"
              value={data.capitalFlowDirection?.replace("_", " ") ?? "—"}
              color={
                data.capitalFlowDirection === "strong_inflow"
                  ? "green"
                  : data.capitalFlowDirection === "inflow"
                  ? "green"
                  : data.capitalFlowDirection === "outflow"
                  ? "red"
                  : "gold"
              }
              icon={TrendingUp}
            />
            <MetricCard
              label="Avg Credit Score"
              value={`${profile.creditMarket?.avgCreditScore ?? 0}`}
              color={profile.creditMarket?.avgCreditScore >= 700 ? "green" : "gold"}
              icon={CreditCard}
            />
            <MetricCard
              label="Cash Buyers"
              value={`${profile.creditMarket?.cashBuyerPct ?? 0}%`}
              color="blue"
              icon={DollarSign}
            />
          </div>

          {/* Capital Flows */}
          <Card header="Capital Flows">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatBox label="Mortgage Volume" value={`${profile.capitalFlows?.mortgageOriginationVolume?.current ?? 0}`} sub={`${profile.capitalFlows?.mortgageOriginationVolume?.yoyChange ?? 0}% YoY`} />
              <StatBox label="SBA Loans" value={`${profile.capitalFlows?.sbaLoanVolume?.current ?? 0}`} sub={`${profile.capitalFlows?.sbaLoanVolume?.yoyChange ?? 0}% YoY`} />
              <StatBox label="VC Deals" value={`${profile.capitalFlows?.vcDeals?.count ?? 0}`} sub={`$${formatCompact(profile.capitalFlows?.vcDeals?.totalFunding ?? 0)}`} />
              <StatBox label="CRE Investment" value={`${profile.capitalFlows?.commercialREInvestment?.volume ?? 0}`} sub={`${profile.capitalFlows?.commercialREInvestment?.yoyChange ?? 0}% YoY`} />
              <StatBox label="Cash Buyer %" value={`${profile.capitalFlows?.cashBuyerPct?.current ?? 0}%`} sub={profile.capitalFlows?.cashBuyerPct?.trend ?? "—"} />
            </div>
            <TimeSeriesChart
              data={mortgageSeries}
              series={[{ key: "value", name: "Mortgage Originations", color: "#22c55e", type: "area" }]}
              height={200}
            />
          </Card>

          {/* Business + Construction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header="Business Activity">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatBox label="New Formations" value={`${profile.businessActivity?.newFormations ?? 0}`} />
                <StatBox label="Net New" value={`+${profile.businessActivity?.netNew ?? 0}`} />
                <StatBox label="Retail Openings" value={`${profile.businessActivity?.retailOpenings ?? 0}`} />
                <StatBox label="Restaurant Openings" value={`${profile.businessActivity?.restaurantOpenings ?? 0}`} />
              </div>
              <TimeSeriesChart
                data={businessSeries}
                series={[{ key: "value", name: "Net New Businesses", color: "#3b82f6", type: "line" }]}
                height={180}
              />
            </Card>

            <Card header="Construction Activity">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatBox label="Active Projects" value={`${profile.constructionActivity?.activeProjects ?? 0}`} />
                <StatBox label="Residential Permits" value={profile.constructionActivity?.residentialPermitValue ?? "—"} />
                <StatBox label="ABI Index" value={`${profile.constructionActivity?.architecturalBillingsIndex ?? 0}`} />
                <StatBox label="Construction Jobs" value={`${(profile.constructionActivity?.constructionJobs ?? 0).toLocaleString()}`} />
              </div>
              <TimeSeriesChart
                data={constructionSeries}
                series={[{ key: "value", name: "Active Projects", color: "#f59e0b", type: "area" }]}
                height={180}
              />
            </Card>
          </div>

          {/* Consumer + Credit + Housing + Wealth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card header="Consumer Spending">
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Retail Sales/Capita" value={`$${(profile.consumerSpending?.retailSalesPerCapita ?? 0).toLocaleString()}`} />
                <StatBox label="Restaurant/Capita" value={`$${(profile.consumerSpending?.restaurantSpendPerCapita ?? 0).toLocaleString()}`} />
                <StatBox label="Luxury Retail" value={`${profile.consumerSpending?.luxuryRetailPresence ?? 0} stores`} />
                <StatBox label="Discretionary %" value={`${profile.consumerSpending?.discretionaryRatio ?? 0}%`} />
              </div>
            </Card>

            <Card header="Credit Market">
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Approval Rate" value={`${profile.creditMarket?.mortgageApprovalRate ?? 0}%`} />
                <StatBox label="Delinquency" value={`${profile.creditMarket?.delinquencyRate ?? 0}%`} />
                <StatBox label="Foreclosure Rate" value={`${profile.creditMarket?.foreclosureRate ?? 0}%`} />
                <StatBox label="Cash Buyer %" value={`${profile.creditMarket?.cashBuyerPct ?? 0}%`} />
              </div>
            </Card>

            <Card header="Housing Micro-Metrics">
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Investor %" value={`${profile.housingMicro?.investorPurchasePct ?? 0}%`} />
                <StatBox label="First-Time Buyer %" value={`${profile.housingMicro?.firstTimeBuyerPct ?? 0}%`} />
                <StatBox label="Price Reductions" value={`${profile.housingMicro?.priceReductionPct ?? 0}%`} />
                <StatBox label="Flips Completed" value={`${profile.housingMicro?.flipsCompleted ?? 0}`} />
              </div>
            </Card>

            <Card header="Wealth Indicators">
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Median Net Worth" value={`$${formatCompact(profile.wealthIndicators?.medianNetWorth ?? 0)}`} />
                <StatBox label="$1M+ Homes" value={`${profile.wealthIndicators?.millionDollarHomesPct ?? 0}%`} />
                <StatBox label="Private School %" value={`${profile.wealthIndicators?.privateSchoolPct ?? 0}%`} />
                <StatBox label="Luxury Cars" value={`${profile.wealthIndicators?.luxuryCarRegistrations ?? 0}%`} />
              </div>
            </Card>
          </div>

          {/* Key Insights */}
          {data.keyInsights?.length > 0 && (
            <Card header="Key Insights">
              <ul className="space-y-2">
                {data.keyInsights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <Activity className="h-4 w-4 text-money-400 mt-0.5 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 bg-surface-elevated rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-mono font-medium text-gray-200">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
