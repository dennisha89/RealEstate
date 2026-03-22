"use client";

import { useState, useEffect } from "react";
import { Search, Banknote, TrendingUp, Users, Activity, Zap } from "lucide-react";
import Card from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import MoneyFlowSankey from "@/components/charts/MoneyFlowSankey";
import CapitalFlowTimeline from "@/components/charts/CapitalFlowTimeline";
import MarketAlertsFeed from "@/components/dashboard/MarketAlertsFeed";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { useMoneyFlow } from "@/lib/hooks/useMoneyFlow";
import { useEventCapture } from "@/lib/hooks/useEventCapture";
import {
  generateSankeyData,
  generateCapitalFlowTimeline,
} from "@/lib/mock/time-series-generator";
import { formatCompact } from "@/lib/utils/format";

export default function MoneyFlowPage() {
  const [zip, setZip] = useState("");
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const { data, isLoading, error } = useMoneyFlow(activeZip);
  const { capture } = useEventCapture();

  useEffect(() => {
    capture("session.page_viewed", { page: "money-flow" });
  }, [capture]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{5}$/.test(zip)) setActiveZip(zip);
  };

  const profile = data?.profile;
  const sankeyData = activeZip ? generateSankeyData(activeZip) : null;
  const capitalTimeline = activeZip ? generateCapitalFlowTimeline(activeZip) : null;

  // Map unified signals for the feed
  const feedSignals = profile?.topSignals?.map((s: { signal: string; source: string; strength: number; actionability: string }) => ({
    signal: s.signal,
    source: s.source,
    strength: s.strength,
    type: s.strength > 60 ? "bullish" as const : s.strength < 40 ? "bearish" as const : "neutral" as const,
  })) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">天河 — Follow the Money</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track the celestial river of capital — where money flows, wealth follows
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
          Failed to load money flow data. Try again.
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
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Net Capital Flow"
              value={`$${formatCompact(profile.capitalFlowSummary?.totalNetInflow ?? 0)}`}
              trend="up"
              trendValue="Inflow"
              color="green"
              icon={Banknote}
            />
            <MetricCard
              label="Money Velocity"
              value={`${profile.moneyVelocity?.velocityScore ?? 0}/100`}
              color={profile.moneyVelocity?.velocityScore >= 60 ? "green" : "gold"}
              icon={Zap}
            />
            <MetricCard
              label="Institutional %"
              value={`${profile.institutionalCapital?.llcPurchaseActivity?.llcPurchasePctOfTotal?.current?.toFixed(0) ?? 0}%`}
              color="blue"
              icon={Users}
            />
            <MetricCard
              label="Buy Signal"
              value={profile.timingAssessment?.buySignalStrength ?? "Neutral"}
              color={
                profile.timingAssessment?.buySignalStrength === "strong"
                  ? "green"
                  : profile.timingAssessment?.buySignalStrength === "weak"
                  ? "red"
                  : "gold"
              }
              icon={TrendingUp}
            />
          </div>

          {/* Money Flow Sankey + Timing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card header="Capital Flow Sources → Destinations">
                {sankeyData && (
                  <MoneyFlowSankey
                    nodes={sankeyData.nodes}
                    links={sankeyData.links}
                  />
                )}
              </Card>
            </div>
            <Card header="Timing Assessment">
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                      profile.timingAssessment?.recommendation === "buy"
                        ? "bg-money-900/40 text-money-400"
                        : profile.timingAssessment?.recommendation === "hold"
                        ? "bg-gold-900/40 text-gold-400"
                        : "bg-red-900/40 text-red-400"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    {profile.timingAssessment?.recommendation?.toUpperCase() ?? "NEUTRAL"}
                  </div>
                </div>
                {profile.timingAssessment?.catalysts?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Catalysts</p>
                    <ul className="space-y-1">
                      {profile.timingAssessment.catalysts.map((c: string, i: number) => (
                        <li key={i} className="text-xs text-money-400 pl-3 border-l-2 border-money-800">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.timingAssessment?.risks?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Risks</p>
                    <ul className="space-y-1">
                      {profile.timingAssessment.risks.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-red-400 pl-3 border-l-2 border-red-800">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Capital Flow Timeline */}
          <Card header="Capital Flow Timeline (24 months)">
            {capitalTimeline && <CapitalFlowTimeline data={capitalTimeline} />}
          </Card>

          {/* Signal Feed */}
          <Card header="Top Market Signals">
            <MarketAlertsFeed signals={feedSignals} />
          </Card>

          {/* Deep dive link */}
          <div className="text-center">
            <a
              href={`/money-flow/${activeZip}`}
              className="text-sm text-money-400 hover:text-money-300 transition-colors"
            >
              View full capital migration deep-dive for {activeZip} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
