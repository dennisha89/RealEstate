"use client";

import { useState } from "react";
import {
  Layers, Plus, ChevronRight, Clock, Search, FileCheck, Handshake,
  CheckCircle, XCircle, BarChart3,
} from "lucide-react";
import { useDealPipelineStore, type DealStatus } from "@/lib/stores/deal-pipeline-store";

// --- MOCK DEALS (seeded if store is empty) ---
type MockDeal = {
  address: string; market: string; state: string; zip: string; price: number;
  propertyType: string; status: DealStatus; daysAgo: number;
  analysis: { apexScore: number; convictionScore: number; prismVerdict: string; capRate: number; monthlyCashFlow: number; cashOnCash: number };
};

const MOCK_DEALS: MockDeal[] = [
  { address: "1847 Oak Valley Dr", market: "Austin", state: "TX", zip: "78745", price: 385_000, propertyType: "sfr", status: "analyzing", daysAgo: 2,
    analysis: { apexScore: 82, convictionScore: 78, prismVerdict: "Buy", capRate: 7.1, monthlyCashFlow: 420, cashOnCash: 8.2 } },
  { address: "920 Magnolia Ln", market: "Raleigh", state: "NC", zip: "27601", price: 312_000, propertyType: "sfr", status: "offer_pending", daysAgo: 7,
    analysis: { apexScore: 78, convictionScore: 74, prismVerdict: "Buy", capRate: 6.8, monthlyCashFlow: 340, cashOnCash: 7.5 } },
  { address: "4501 Bay Shore Blvd", market: "Tampa", state: "FL", zip: "33611", price: 445_000, propertyType: "duplex", status: "under_contract", daysAgo: 12,
    analysis: { apexScore: 74, convictionScore: 70, prismVerdict: "Hold", capRate: 6.2, monthlyCashFlow: 280, cashOnCash: 6.1 } },
  { address: "223 Riverside Pkwy", market: "Nashville", state: "TN", zip: "37203", price: 268_000, propertyType: "sfr", status: "discovered", daysAgo: 1,
    analysis: { apexScore: 71, convictionScore: 66, prismVerdict: "Hold", capRate: 5.9, monthlyCashFlow: 180, cashOnCash: 5.8 } },
];

const COLUMNS: { status: DealStatus; label: string; icon: typeof Search }[] = [
  { status: "discovered", label: "Discovered", icon: Search },
  { status: "analyzing", label: "Analyzing", icon: BarChart3 },
  { status: "offer_pending", label: "Offer Pending", icon: FileCheck },
  { status: "under_contract", label: "Under Contract", icon: Handshake },
  { status: "closed", label: "Closed", icon: CheckCircle },
  { status: "passed", label: "Passed", icon: XCircle },
];

const NEXT_STATUS: Partial<Record<DealStatus, DealStatus>> = {
  discovered: "analyzing",
  analyzing: "offer_pending",
  offer_pending: "under_contract",
  under_contract: "closed",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function scoreClr(n: number) {
  return n >= 80 ? "text-emerald-light" : n >= 70 ? "text-amber-light" : "text-rose-light";
}

function statusColor(s: DealStatus) {
  if (s === "closed") return "badge-emerald";
  if (s === "passed" || s === "lost") return "badge-rose";
  if (s === "offer_pending" || s === "under_contract") return "badge-amber";
  return "badge-gold";
}

export default function PipelinePage() {
  const store = useDealPipelineStore();
  const [showMock, setShowMock] = useState(true);

  // Use store deals if any, otherwise show mock data
  const deals = store.deals.length > 0 ? store.deals : (showMock ? MOCK_DEALS.map((d, i) => ({
    id: `mock_${i}`,
    addedAt: new Date(Date.now() - d.daysAgo * 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - d.daysAgo * 86_400_000).toISOString(),
    status: d.status,
    address: d.address,
    market: d.market,
    state: d.state,
    zip: d.zip,
    price: d.price,
    propertyType: d.propertyType,
    analysis: d.analysis,
    notes: [] as string[],
  })) : []);

  const totalDeals = deals.length;
  const avgScore = deals.filter((d) => d.analysis).length > 0
    ? Math.round(deals.filter((d) => d.analysis).reduce((s, d) => s + (d.analysis?.apexScore ?? 0), 0) / deals.filter((d) => d.analysis).length)
    : 0;

  function moveDeal(id: string, nextStatus: DealStatus) {
    if (id.startsWith("mock_")) return; // Can't move mock deals
    store.updateDealStatus(id, nextStatus);
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Manage
          </div>
          <h1 className="text-lg font-semibold text-content-primary mt-1">Deal Pipeline</h1>
        </div>
        <button className="btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Add Deal
        </button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Deals", value: totalDeals.toString() },
          { label: "Active", value: deals.filter((d) => !["closed", "passed", "lost"].includes(d.status)).length.toString() },
          { label: "Avg Score", value: avgScore > 0 ? avgScore.toString() : "--" },
        ].map((s) => (
          <div key={s.label} className="card-glass !p-3">
            <div className="metric-label mb-1">{s.label}</div>
            <div className="font-mono text-lg font-bold text-content-primary">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="space-y-4">
        {COLUMNS.map((col) => {
          const colDeals = deals.filter((d) => d.status === col.status);
          if (colDeals.length === 0 && (col.status === "closed" || col.status === "passed")) return null;
          const next = NEXT_STATUS[col.status];
          return (
            <section key={col.status}>
              <div className="flex items-center gap-2 mb-2">
                <col.icon className="w-3.5 h-3.5 text-content-tertiary" />
                <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wider">{col.label}</span>
                <span className="font-mono text-[11px] text-content-disabled">{colDeals.length}</span>
              </div>
              {colDeals.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-surface-border text-center text-xs text-content-disabled">
                  No deals in this stage
                </div>
              ) : (
                <div className="space-y-2">
                  {colDeals.map((deal) => {
                    const daysInPipeline = Math.round((Date.now() - new Date(deal.addedAt).getTime()) / 86_400_000);
                    return (
                      <div key={deal.id} className="card !p-3 hover:bg-surface-elevated transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-content-primary truncate">{deal.address}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-content-tertiary">{deal.market}, {deal.state}</span>
                              <span className="text-content-disabled">·</span>
                              <span className="font-mono text-xs text-content-secondary">{fmt(deal.price)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {deal.analysis && (
                              <span className={`font-mono text-sm font-bold ${scoreClr(deal.analysis.apexScore)}`}>
                                {deal.analysis.apexScore}
                              </span>
                            )}
                            <span className="text-[11px] text-content-disabled flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />{daysInPipeline}d
                            </span>
                          </div>
                        </div>
                        {deal.analysis && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-content-tertiary">
                            <span>Cap: <span className="font-mono text-content-secondary">{deal.analysis.capRate}%</span></span>
                            <span>CF: <span className="font-mono text-emerald-light">{fmt(deal.analysis.monthlyCashFlow)}/mo</span></span>
                            <span>CoC: <span className="font-mono text-content-secondary">{deal.analysis.cashOnCash}%</span></span>
                          </div>
                        )}
                        {next && (
                          <button
                            onClick={() => moveDeal(deal.id, next)}
                            className="mt-2 flex items-center gap-1 text-[11px] text-gold-light hover:text-goldtransition-colors font-medium"
                          >
                            Move to {COLUMNS.find((c) => c.status === next)?.label}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
