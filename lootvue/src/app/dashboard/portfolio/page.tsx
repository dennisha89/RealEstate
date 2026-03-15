"use client";

import { useState } from "react";
import {
  Building2, DollarSign, TrendingUp, Percent, ChevronDown, ChevronUp,
  Target, BookOpen, Brain,
} from "lucide-react";
import { useOracleStore } from "@/lib/stores/oracle-store";
import { useDecisionJournalStore } from "@/lib/stores/decision-journal-store";

// --- MOCK DATA ---
type Status = "Performing" | "Watch" | "Underperforming";
type Property = {
  address: string;
  city: string;
  state: string;
  value: number;
  equity: number;
  monthlyCF: number;
  capRate: number;
  status: Status;
  breakdown: { rent: number; mortgage: number; taxes: number; insurance: number; maintenance: number; vacancy: number };
};

const PROPERTIES: Property[] = [
  { address: "1847 Oak Valley Dr", city: "Austin", state: "TX", value: 385_000, equity: 88_000, monthlyCF: 420, capRate: 7.1, status: "Performing",
    breakdown: { rent: 2_450, mortgage: 1_580, taxes: 180, insurance: 95, maintenance: 100, vacancy: 75 } },
  { address: "920 Magnolia Ln", city: "Raleigh", state: "NC", value: 312_000, equity: 72_000, monthlyCF: 340, capRate: 6.8, status: "Performing",
    breakdown: { rent: 1_950, mortgage: 1_280, taxes: 140, insurance: 80, maintenance: 70, vacancy: 40 } },
  { address: "4501 Bay Shore Blvd", city: "Tampa", state: "FL", value: 245_000, equity: 54_000, monthlyCF: 280, capRate: 6.2, status: "Watch",
    breakdown: { rent: 1_680, mortgage: 1_100, taxes: 120, insurance: 110, maintenance: 50, vacancy: 20 } },
  { address: "789 Elm Street", city: "Nashville", state: "TN", value: 118_000, equity: 28_000, monthlyCF: 100, capRate: 5.9, status: "Underperforming",
    breakdown: { rent: 980, mortgage: 680, taxes: 80, insurance: 60, maintenance: 40, vacancy: 20 } },
];

const KPI = [
  { label: "Total Value", value: "$1.06M", icon: Building2 },
  { label: "Total Equity", value: "$242K", icon: DollarSign },
  { label: "Monthly Cash Flow", value: "+$1,140", icon: TrendingUp },
  { label: "Avg Cap Rate", value: "6.5%", icon: Percent },
];

const WEALTH = { total: 4_230, appreciation: 2_480, debtPaydown: 890, cashFlow: 860 };
const GOAL = { target: 5_000, current: 1_140 };

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function statusBadge(s: Status) {
  return s === "Performing" ? "badge-emerald" : s === "Watch" ? "badge-amber" : "badge-rose";
}

function wealthPct(v: number) { return Math.round((v / WEALTH.total) * 100); }

export default function PortfolioPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const oracleStats = useOracleStore((s) => s.getStats());
  const journalStats = useDecisionJournalStore((s) => s.getJournalStats());

  const goalPct = Math.round((GOAL.current / GOAL.target) * 100);
  const avgCF = Math.round(GOAL.current / PROPERTIES.length);
  const propertiesNeeded = Math.ceil((GOAL.target - GOAL.current) / avgCF);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          Manage
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Portfolio</h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI.map((k) => (
          <div key={k.label} className="card-glass">
            <div className="flex items-center gap-1.5 mb-1.5">
              <k.icon className="w-3.5 h-3.5 text-content-tertiary" />
              <span className="metric-label">{k.label}</span>
            </div>
            <div className="metric-value text-xl">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wealth Attribution */}
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Wealth Attribution
          </div>
          <p className="text-[15px] font-semibold text-content-primary mb-3">
            Your wealth grew <span className="font-mono text-emerald-light">{fmt(WEALTH.total)}</span> this month
          </p>
          {/* Proportion bar */}
          <div className="h-3 rounded-full overflow-hidden flex mb-3">
            <div className="bg-emerald" style={{ width: `${wealthPct(WEALTH.appreciation)}%` }} />
            <div className="bg-gold" style={{ width: `${wealthPct(WEALTH.debtPaydown)}%` }} />
            <div className="bg-emerald/60" style={{ width: `${wealthPct(WEALTH.cashFlow)}%` }} />
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Appreciation", value: WEALTH.appreciation, color: "bg-emerald" },
              { label: "Debt paydown", value: WEALTH.debtPaydown, color: "bg-gold" },
              { label: "Cash flow", value: WEALTH.cashFlow, color: "bg-emerald/60" },
            ].map((w) => (
              <div key={w.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${w.color}`} />
                  <span className="text-content-secondary">{w.label}</span>
                </div>
                <span className="font-mono text-content-primary">{fmt(w.value)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Goal Tracker */}
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> Goal Tracker
          </div>
          <p className="text-[13px] text-content-secondary mb-2">
            <span className="font-mono text-content-primary font-semibold">{fmt(GOAL.target)}/mo</span> passive income target
          </p>
          <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden mb-2">
            <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-mono text-emerald-light">{fmt(GOAL.current)}/mo</span>
            <span className="font-mono text-content-tertiary">{goalPct}%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] text-[12px] text-content-tertiary leading-relaxed">
            Need <span className="font-mono text-content-primary font-medium">{propertiesNeeded}</span> more properties at your average.
            At current pace: <span className="font-mono text-content-primary font-medium">14 months</span>.
          </div>
        </section>
      </div>

      {/* Properties Table */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" /> Properties
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider">
                <th className="text-left font-medium pb-2 pr-3">Property</th>
                <th className="text-right font-medium pb-2 px-3">Value</th>
                <th className="text-right font-medium pb-2 px-3 hidden sm:table-cell">Monthly CF</th>
                <th className="text-right font-medium pb-2 px-3 hidden sm:table-cell">Cap Rate</th>
                <th className="text-center font-medium pb-2 px-3">Status</th>
                <th className="w-8 pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {PROPERTIES.map((p) => {
                const isOpen = expanded === p.address;
                return (
                  <tr key={p.address} className="group">
                    <td colSpan={6} className="p-0">
                      <button
                        onClick={() => setExpanded(isOpen ? null : p.address)}
                        className="w-full flex items-center hover:bg-white/[0.02] transition-colors py-2.5"
                      >
                        <span className="flex-1 text-left pr-3">
                          <span className="font-medium text-content-primary">{p.address}</span>
                          <span className="text-xs text-content-disabled ml-2">{p.city}, {p.state}</span>
                        </span>
                        <span className="font-mono text-content-secondary px-3 text-right w-24">{fmt(p.value)}</span>
                        <span className="font-mono text-emerald-light px-3 text-right w-20 hidden sm:block">{fmt(p.monthlyCF)}</span>
                        <span className="font-mono text-content-secondary px-3 text-right w-16 hidden sm:block">{p.capRate}%</span>
                        <span className="px-3 text-center w-28"><span className={statusBadge(p.status)}>{p.status}</span></span>
                        <span className="w-8 flex justify-center text-content-disabled">
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="pb-3 pl-4 pr-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            {[
                              { label: "Rent", value: p.breakdown.rent },
                              { label: "Mortgage", value: -p.breakdown.mortgage },
                              { label: "Taxes", value: -p.breakdown.taxes },
                              { label: "Insurance", value: -p.breakdown.insurance },
                              { label: "Maintenance", value: -p.breakdown.maintenance },
                              { label: "Vacancy", value: -p.breakdown.vacancy },
                            ].map((b) => (
                              <div key={b.label} className="flex items-center justify-between">
                                <span className="text-[11px] text-content-tertiary">{b.label}</span>
                                <span className={`font-mono text-xs ${b.value >= 0 ? "text-emerald-light" : "text-content-secondary"}`}>
                                  {b.value >= 0 ? "+" : ""}{fmt(b.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Track Record */}
      <section className="card-gold">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-3 font-medium flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" /> Track Record
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-gold-light" />
            </div>
            <div>
              <p className="text-[13px] text-content-primary font-medium">Oracle</p>
              <p className="text-xs text-content-tertiary mt-0.5">
                <span className="font-mono text-content-secondary">{oracleStats.totalPredictions}</span> predictions logged.{" "}
                <span className="font-mono text-emerald-light">{oracleStats.totalPredictions > 0 ? Math.round(oracleStats.accuracyRate * 100) : 0}%</span> accuracy.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-gold-light" />
            </div>
            <div>
              <p className="text-[13px] text-content-primary font-medium">Decision Journal</p>
              <p className="text-xs text-content-tertiary mt-0.5">
                <span className="font-mono text-content-secondary">{journalStats.totalDecisions}</span> decisions recorded.
                System agreed <span className="font-mono text-content-secondary">{journalStats.agreedWithSystem}</span>x.
                Override accuracy <span className="font-mono text-emerald-light">
                  {journalStats.userOverrideWasRight + journalStats.userOverrideWasWrong > 0
                    ? Math.round((journalStats.userOverrideWasRight / (journalStats.userOverrideWasRight + journalStats.userOverrideWasWrong)) * 100)
                    : 0}%
                </span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
