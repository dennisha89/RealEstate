"use client";

import { use } from "react";
import Card from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import CapitalFlowTimeline from "@/components/charts/CapitalFlowTimeline";
import MarketAlertsFeed from "@/components/dashboard/MarketAlertsFeed";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { useMoneyFlow, useCapitalMigration, useInstitutionalCapital, useTransactionPipeline } from "@/lib/hooks/useMoneyFlow";
import { generateCapitalFlowTimeline } from "@/lib/mock/time-series-generator";
import { formatCompact } from "@/lib/utils/format";
import {
  Banknote,
  Building2,
  Globe,
  Users,
  FileText,
  TrendingUp,
  ArrowRightLeft,
} from "lucide-react";

const tabs = [
  { id: "migration", label: "Capital Migration", icon: <ArrowRightLeft className="h-4 w-4" /> },
  { id: "institutional", label: "Institutional", icon: <Building2 className="h-4 w-4" /> },
  { id: "pipeline", label: "Pipeline", icon: <FileText className="h-4 w-4" /> },
  { id: "signals", label: "Signals", icon: <TrendingUp className="h-4 w-4" /> },
];

export default function MoneyFlowDeepDive({
  params,
}: {
  params: Promise<{ zip: string }>;
}) {
  const { zip } = use(params);
  const { data: moneyFlow, isLoading: loadingFlow } = useMoneyFlow(zip);
  const { data: migration, isLoading: loadingMigration } = useCapitalMigration(zip);
  const { data: institutional, isLoading: loadingInst } = useInstitutionalCapital(zip);
  const { data: pipeline, isLoading: loadingPipeline } = useTransactionPipeline(zip);

  const capitalTimeline = generateCapitalFlowTimeline(zip);
  const isLoading = loadingFlow || loadingMigration || loadingInst || loadingPipeline;

  const migrationProfile = migration?.profile;
  const instProfile = institutional?.profile;
  const pipeProfile = pipeline?.profile;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          Money Flow Deep Dive — {zip}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Comprehensive capital flow analysis across all channels
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      )}

      {/* KPI Row */}
      {migrationProfile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="1031 Net Flow"
            value={`$${formatCompact(migrationProfile.exchange1031?.netExchangeFlow ?? 0)}`}
            color="green"
            icon={ArrowRightLeft}
          />
          <MetricCard
            label="Foreign Capital"
            value={`$${formatCompact(migrationProfile.foreignCapital?.totalInvestmentVolume?.current ?? 0)}`}
            color="blue"
            icon={Globe}
          />
          <MetricCard
            label="Tax Migration"
            value={`$${formatCompact(migrationProfile.taxMigration?.netIncomeFlow ?? 0)}`}
            color="gold"
            icon={Users}
          />
          <MetricCard
            label="Institutional Score"
            value={`${instProfile?.institutionalCapitalScore ?? 0}/100`}
            color={instProfile?.institutionalCapitalScore >= 60 ? "green" : "gold"}
            icon={Building2}
          />
        </div>
      )}

      {/* Capital Flow Timeline */}
      <Card header="Capital Flow Timeline">
        <CapitalFlowTimeline data={capitalTimeline} />
      </Card>

      {/* Tabbed Deep Dive */}
      <Card>
        <Tabs tabs={tabs}>
          {(activeTab) => {
            if (activeTab === "migration" && migrationProfile) {
              return (
                <div className="space-y-6">
                  {/* 1031 Exchange */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">1031 Exchange Flows</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatBox label="Inbound" value={`$${formatCompact(migrationProfile.exchange1031?.inboundVolume?.current ?? 0)}`} color="money" />
                      <StatBox label="Outbound" value={`$${formatCompact(migrationProfile.exchange1031?.outboundVolume?.current ?? 0)}`} color="red" />
                      <StatBox label="Completion Rate" value={`${migrationProfile.exchange1031?.exchangeCompletionRate ?? 0}%`} />
                      <StatBox label="Avg Value" value={`$${formatCompact(migrationProfile.exchange1031?.avgExchangeValue ?? 0)}`} />
                    </div>
                    {migrationProfile.exchange1031?.topOriginMarkets && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Top Origin Markets</p>
                        <div className="space-y-1">
                          {migrationProfile.exchange1031.topOriginMarkets.map((m: { market: string; volume: number; count: number }, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1">
                              <span className="text-gray-400">{m.market}</span>
                              <span className="text-gray-300 font-mono">${formatCompact(m.volume)} ({m.count} deals)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Foreign Capital */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Foreign Capital</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <StatBox label="Total Volume" value={`$${formatCompact(migrationProfile.foreignCapital?.totalInvestmentVolume?.current ?? 0)}`} color="blue" />
                      <StatBox label="Foreign Buyer %" value={`${migrationProfile.foreignCapital?.foreignBuyerPct?.current?.toFixed(1) ?? 0}%`} />
                      <StatBox label="Signal" value={migrationProfile.foreignCapital?.signal ?? "—"} />
                    </div>
                  </div>

                  {/* Tax Migration */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Tax Migration</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <StatBox label="Net Migration" value={`${migrationProfile.taxMigration?.irsSoiNetMigration?.current?.toLocaleString() ?? 0}`} color="gold" />
                      <StatBox label="Avg In-Migrant Income" value={`$${(migrationProfile.taxMigration?.avgIncomOfInMigrants ?? 0).toLocaleString()}`} />
                      <StatBox label="Tax Arbitrage" value={`${migrationProfile.taxMigration?.stateIncomeTaxArbitrage ?? 0}%`} />
                    </div>
                  </div>
                </div>
              );
            }

            if (activeTab === "institutional" && instProfile) {
              return (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">LLC Purchase Activity</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatBox label="LLC Purchases" value={`${instProfile.llcPurchaseActivity?.totalLLCPurchases?.current?.toFixed(0) ?? 0}`} color="blue" />
                      <StatBox label="LLC % of Total" value={`${instProfile.llcPurchaseActivity?.llcPurchasePctOfTotal?.current?.toFixed(0) ?? 0}%`} />
                      <StatBox label="Unique Entities" value={`${instProfile.llcPurchaseActivity?.uniqueEntitiesBuying ?? 0}`} />
                      <StatBox label="New Entering" value={`${instProfile.llcPurchaseActivity?.newEntitiesEntering ?? 0}`} />
                    </div>
                  </div>

                  {instProfile.reitDeployment?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">REIT Activity</h4>
                      <div className="space-y-2">
                        {instProfile.reitDeployment.map((r: { reitName: string; ticker: string; activityInMarket: string; propertiesOwned: number; capitalDeployed: number }, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                            <div>
                              <p className="text-sm text-gray-300">{r.reitName} ({r.ticker})</p>
                              <p className="text-xs text-gray-500">{r.propertiesOwned} properties owned</p>
                            </div>
                            <Badge variant={r.activityInMarket === "expanding" ? "success" : "neutral"} size="sm">
                              {r.activityInMarket}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Sentiment</h4>
                    <p className="text-sm text-gray-400">{instProfile.institutionalSentiment}</p>
                  </div>
                </div>
              );
            }

            if (activeTab === "pipeline" && pipeProfile) {
              return (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Title Insurance Pipeline</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatBox label="Order Volume" value={`${pipeProfile.titleInsurance?.orderVolume?.current?.toFixed(0) ?? 0}`} />
                      <StatBox label="Closing Volume" value={`${pipeProfile.titleInsurance?.closingVolume?.current?.toFixed(0) ?? 0}`} />
                      <StatBox label="Cancel Rate" value={`${pipeProfile.titleInsurance?.cancelationRate?.current?.toFixed(0) ?? 0}%`} />
                      <StatBox label="Signal" value={pipeProfile.titleInsurance?.signal ?? "—"} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Foreclosure Pipeline</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatBox label="Notices of Default" value={`${pipeProfile.foreclosurePipeline?.noticeOfDefault?.current?.toFixed(0) ?? 0}`} color="red" />
                      <StatBox label="Scheduled Auctions" value={`${pipeProfile.foreclosurePipeline?.scheduledAuctions?.current?.toFixed(0) ?? 0}`} />
                      <StatBox label="REO Inventory" value={`${pipeProfile.foreclosurePipeline?.reoInventory?.current?.toFixed(0) ?? 0}`} />
                      <StatBox label="Flow Rate" value={pipeProfile.foreclosurePipeline?.pipelineFlowRate ?? "—"} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Hard Money Lending</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <StatBox label="Loan Volume" value={`$${formatCompact(pipeProfile.hardMoneyLending?.loanVolume?.current ?? 0)}`} color="gold" />
                      <StatBox label="Avg Rate" value={`${pipeProfile.hardMoneyLending?.avgInterestRate ?? 0}%`} />
                      <StatBox label="Signal" value={pipeProfile.hardMoneyLending?.signal ?? "—"} />
                    </div>
                  </div>
                </div>
              );
            }

            if (activeTab === "signals") {
              const signals = moneyFlow?.profile?.allSignals?.map((s: { signal: string; source: string; strength: number }) => ({
                signal: s.signal,
                source: s.source,
                strength: s.strength,
                type: s.strength > 60 ? "bullish" as const : s.strength < 40 ? "bearish" as const : "neutral" as const,
              })) ?? [];

              return <MarketAlertsFeed signals={signals} maxItems={20} />;
            }

            return (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Loading data...</p>
              </div>
            );
          }}
        </Tabs>
      </Card>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "money" | "red" | "blue" | "gold";
}) {
  const textColor = color === "money" ? "text-money-400" : color === "red" ? "text-red-400" : color === "blue" ? "text-blue-400" : color === "gold" ? "text-gold-400" : "text-gray-200";
  return (
    <div className="p-3 bg-surface-elevated rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-mono font-medium ${textColor}`}>{value}</p>
    </div>
  );
}
