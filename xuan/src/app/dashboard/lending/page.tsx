"use client";

import { useState, useMemo } from "react";
import {
  Landmark, CheckCircle, AlertTriangle, Star, Clock, DollarSign,
  ChevronDown, ChevronUp, ArrowRight, Shield, Percent,
} from "lucide-react";
import { matchLenders } from "@/lib/stores/lender-store";
import { useDealRoomStore } from "@/lib/stores/deal-room-store";
import { MOCK_LENDERS } from "@/lib/mock/lender-data";
import { formatCurrency } from "@/lib/utils/format";
import type { LenderMatch } from "@/lib/types/marketplace";
import type { AnalysisResult } from "@/app/dashboard/analyze/_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchScoreColor(n: number) {
  if (n >= 80) return "text-emerald-light";
  if (n >= 60) return "text-amber-light";
  return "text-rose-light";
}

function matchScoreBar(n: number) {
  if (n >= 80) return "bg-emerald-light";
  if (n >= 60) return "bg-amber-light";
  return "bg-rose-light";
}

function lenderTypeBadge(type: string) {
  switch (type) {
    case "conventional": return <span className="badge-gold">Conventional</span>;
    case "dscr":         return <span className="badge-emerald">DSCR</span>;
    case "hard_money":   return <span className="badge-rose">Hard Money</span>;
    case "portfolio":    return <span className="badge-amber">Portfolio</span>;
    case "bridge":       return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 text-[11px] font-medium rounded-md">Bridge</span>;
    case "fha":          return <span className="badge-gold">FHA</span>;
    default:             return <span className="badge-gold">{type}</span>;
  }
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < full || (i === full && half) ? "text-gold-light fill-gold-light" : "text-content-disabled"}`}
        />
      ))}
    </span>
  );
}

// ─── Lender Card ──────────────────────────────────────────────────────────────

function LenderCard({ match }: { match: LenderMatch }) {
  const [expanded, setExpanded] = useState(false);
  const { lender, matchScore, estimatedRate, estimatedPayment, meetsCriteria, warnings } = match;

  return (
    <div className="card hover:bg-surface-elevated transition-colors">
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-content-tertiary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-content-primary">{lender.name}</span>
            {lenderTypeBadge(lender.type)}
          </div>
          <p className="text-[11px] text-content-tertiary mt-0.5 truncate">{lender.description}</p>
        </div>
        {/* Match score */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`font-mono text-sm font-bold ${matchScoreColor(matchScore)}`}>
            {matchScore}%
          </span>
          <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${matchScoreBar(matchScore)}`}
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { icon: Percent,     label: "Est. Rate",    value: `${estimatedRate}%` },
          { icon: DollarSign,  label: "Est. Payment", value: `${formatCurrency(estimatedPayment)}/mo` },
          { icon: Shield,      label: "Max LTV",      value: `${lender.maxLTV}%` },
          { icon: Clock,       label: "Close Time",   value: `${lender.avgCloseTime}d` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-surface-elevated rounded-lg p-2 text-center">
            <Icon className="w-3 h-3 text-content-disabled mx-auto mb-1" />
            <div className="font-mono text-[12px] font-semibold text-content-primary">{value}</div>
            <div className="text-[10px] text-content-disabled">{label}</div>
          </div>
        ))}
      </div>

      {/* Criteria */}
      <div className="space-y-1 mb-3">
        {meetsCriteria.map((c) => (
          <div key={c} className="flex items-center gap-1.5 text-[11px] text-content-secondary">
            <CheckCircle className="w-3 h-3 text-emerald-light shrink-0" />
            {c}
          </div>
        ))}
        {warnings.map((w) => (
          <div key={w} className="flex items-center gap-1.5 text-[11px] text-amber-light">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {w}
          </div>
        ))}
      </div>

      {/* Features (collapsed by default) */}
      {expanded && (
        <div className="border-t border-surface-border pt-2.5 mb-3">
          <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-1.5">Features</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {lender.features.map((f) => (
              <span key={f} className="text-[11px] text-content-secondary before:content-['•'] before:mr-1 before:text-content-disabled">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-surface-border pt-2.5">
        <div className="flex items-center gap-1.5">
          <StarRating rating={lender.rating} />
          <span className="font-mono text-[11px] text-content-secondary">{lender.rating}</span>
          <span className="text-[11px] text-content-disabled">({lender.reviewCount.toLocaleString()} reviews)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost !px-2 !py-1 !text-[11px] flex items-center gap-0.5"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Less" : "Details"}
          </button>
          <button className="btn-secondary !px-3 !py-1.5 !text-[11px] flex items-center gap-1">
            Get Pre-Quote
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LendingPage() {
  const rooms = useDealRoomStore((s) => s.rooms);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const analysis: AnalysisResult | null = selectedRoom?.analysis ?? null;

  const matches: LenderMatch[] = useMemo(
    () => (analysis ? matchLenders(analysis, MOCK_LENDERS) : []),
    [analysis]
  );

  const loanAmount = analysis ? analysis.purchasePrice * 0.8 : 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Marketplace
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Lender Match</h1>
        <p className="text-xs text-content-tertiary mt-0.5">
          Get matched with lenders based on your deal&apos;s financials.
        </p>
      </div>

      {/* Deal Selector */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-4 h-4 text-gold-light" />
          <span className="text-[13px] font-semibold text-content-primary">Select a Deal</span>
        </div>

        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Landmark className="w-8 h-8 text-content-disabled" />
            <p className="text-[13px] text-content-secondary">No deal rooms yet</p>
            <p className="text-xs text-content-tertiary max-w-[260px]">
              Analyze a property first to get lender matches.
            </p>
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2.5 text-[13px] text-content-primary appearance-none pr-8 focus:outline-none focus:border-gold/40 transition-colors"
            >
              <option value="">Choose a deal room…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          </div>
        )}
      </div>

      {/* Deal Summary + Results */}
      {analysis && (
        <>
          {/* Deal Summary */}
          <div className="card-glass">
            <p className="text-[10px] text-content-disabled uppercase tracking-wider mb-2">Deal Summary</p>
            <p className="text-[13px] font-medium text-content-primary mb-2">{analysis.address}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
              <div>
                <span className="text-content-disabled block">Purchase Price</span>
                <span className="font-mono font-semibold text-content-primary">{formatCurrency(analysis.purchasePrice)}</span>
              </div>
              <div>
                <span className="text-content-disabled block">Loan Amount (80%)</span>
                <span className="font-mono font-semibold text-content-primary">{formatCurrency(loanAmount)}</span>
              </div>
              <div>
                <span className="text-content-disabled block">DSCR</span>
                <span className={`font-mono font-semibold ${analysis.dscr >= 1.25 ? "text-emerald-light" : analysis.dscr >= 1.0 ? "text-amber-light" : "text-rose-light"}`}>
                  {analysis.dscr.toFixed(2)}x
                </span>
              </div>
              <div>
                <span className="text-content-disabled block">Cap Rate</span>
                <span className="font-mono font-semibold text-content-primary">{analysis.capRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Lender Matches */}
          <div>
            <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-2 mb-3">
              <Landmark className="w-3.5 h-3.5" />
              {matches.length} Lenders Matched
            </div>
            <div className="space-y-3">
              {matches.map((m) => (
                <LenderCard key={m.lender.id} match={m} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
