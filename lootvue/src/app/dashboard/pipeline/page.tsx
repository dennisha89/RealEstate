"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Search, BarChart3, FileCheck, Handshake, X, ChevronRight,
  ChevronLeft, Clock, Plus, BookOpen, AlertTriangle,
  ArrowRight, Layers, CheckCircle, XCircle,
} from "lucide-react";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { useDealPipelineStore, type DealStatus, type DealEntry } from "@/lib/stores/deal-pipeline-store";
import { CHART_COLORS, TOOLTIP_STYLE } from "@/components/charts/ChartTheme";

// ─── Lazy-loaded radar chart ─────────────────────────────────────────────────
// Recharts sub-components have defaultProps with widened string types that
// conflict with next/dynamic's strict generic. Cast the loader to `any` at the
// dynamic call, then cast the result back to the proper component type so JSX
// props are still checked at usage sites.
import type {
  RadarChart as RadarChartType,
  Radar as RadarType,
  PolarGrid as PolarGridType,
  PolarAngleAxis as PolarAngleAxisType,
  ResponsiveContainer as ResponsiveContainerType,
  Tooltip as TooltipType,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadarChart = dynamic(() => import("recharts").then((m) => ({ default: m.RadarChart })) as any, { ssr: false }) as typeof RadarChartType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Radar = dynamic(() => import("recharts").then((m) => ({ default: m.Radar })) as any, { ssr: false }) as typeof RadarType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PolarGrid = dynamic(() => import("recharts").then((m) => ({ default: m.PolarGrid })) as any, { ssr: false }) as typeof PolarGridType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PolarAngleAxis = dynamic(() => import("recharts").then((m) => ({ default: m.PolarAngleAxis })) as any, { ssr: false }) as typeof PolarAngleAxisType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => ({ default: m.ResponsiveContainer })) as any, { ssr: false }) as typeof ResponsiveContainerType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Tooltip = dynamic(() => import("recharts").then((m) => ({ default: m.Tooltip })) as any, { ssr: false }) as typeof TooltipType;

// ─── Extended deal shape (sample data only — store type unchanged) ───────────
interface PipelineDeal extends DealEntry {
  daysInStage: number;
  strategy: "LTR" | "STR" | "Flip" | "BRRRR";
  dscr?: number;
  irr?: number;
}

// ─── Sample data ─────────────────────────────────────────────────────────────
const SAMPLE_DEALS: PipelineDeal[] = [
  {
    id: "s1", addedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: "discovered", address: "789 Pine Rd", market: "Austin",
    state: "TX", zip: "78745", price: 320000, propertyType: "sfr",
    notes: [], daysInStage: 2, strategy: "LTR",
    analysis: { apexScore: 68, convictionScore: 65, prismVerdict: "Hold", capRate: 5.9, monthlyCashFlow: 300, cashOnCash: 6.1 },
    dscr: 1.18, irr: 9.2,
  },
  {
    id: "s2", addedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: "discovered", address: "222 Elm Dr", market: "Nashville",
    state: "TN", zip: "37203", price: 295000, propertyType: "sfr",
    notes: [], daysInStage: 5, strategy: "STR",
    analysis: { apexScore: 71, convictionScore: 68, prismVerdict: "Hold", capRate: 6.2, monthlyCashFlow: 220, cashOnCash: 5.8 },
    dscr: 1.22, irr: 10.1,
  },
  {
    id: "s3", addedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: "discovered", address: "333 Maple Ct", market: "Austin",
    state: "TX", zip: "78701", price: 275000, propertyType: "sfr",
    notes: [], daysInStage: 7, strategy: "Flip",
    analysis: { apexScore: 42, convictionScore: 38, prismVerdict: "Avoid", capRate: 3.1, monthlyCashFlow: -80, cashOnCash: 1.2 },
    dscr: 0.91, irr: 3.4,
  },
  {
    id: "s4", addedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: "analyzing", address: "123 Main St", market: "Austin",
    state: "TX", zip: "78702", price: 385000, propertyType: "sfr",
    notes: ["[2026-03-13T10:00:00.000Z] Good numbers but need to verify insurance. Getting 3 quotes."],
    daysInStage: 3, strategy: "LTR",
    analysis: { apexScore: 82, convictionScore: 79, prismVerdict: "Buy", capRate: 7.1, monthlyCashFlow: 450, cashOnCash: 8.3 },
    dscr: 1.35, irr: 12.4,
  },
  {
    id: "s5", addedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    status: "analyzing", address: "900 Cedar Blvd", market: "Tampa",
    state: "FL", zip: "33602", price: 340000, propertyType: "duplex",
    notes: [], daysInStage: 4, strategy: "LTR",
    analysis: { apexScore: 77, convictionScore: 74, prismVerdict: "Buy", capRate: 6.8, monthlyCashFlow: 390, cashOnCash: 7.6 },
    dscr: 1.29, irr: 11.8,
  },
  {
    id: "s6", addedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    status: "offer_pending", address: "456 Oak Ave", market: "Tampa",
    state: "FL", zip: "33611", price: 410000, propertyType: "sfr",
    notes: ["[2026-03-15T14:30:00.000Z] Offer submitted at $400K. Waiting on seller response."],
    daysInStage: 1, strategy: "LTR",
    analysis: { apexScore: 74, convictionScore: 71, prismVerdict: "Buy", capRate: 6.3, monthlyCashFlow: 680, cashOnCash: 7.9 },
    dscr: 1.31, irr: 11.1,
  },
];

// ─── Kanban columns config ────────────────────────────────────────────────────
const BOARD_COLUMNS: { status: DealStatus; label: string; icon: typeof Search }[] = [
  { status: "discovered", label: "Discovered", icon: Search },
  { status: "analyzing", label: "Analyzing", icon: BarChart3 },
  { status: "offer_pending", label: "Offer", icon: FileCheck },
  { status: "under_contract", label: "Contract", icon: Handshake },
];

const NEXT_STATUS: Partial<Record<DealStatus, DealStatus>> = {
  discovered: "analyzing",
  analyzing: "offer_pending",
  offer_pending: "under_contract",
};

const PREV_STATUS: Partial<Record<DealStatus, DealStatus>> = {
  analyzing: "discovered",
  offer_pending: "analyzing",
  under_contract: "offer_pending",
};

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmtPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(n);

const fmtCF = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function scoreColor(n: number) {
  if (n >= 75) return "text-emerald-light";
  if (n >= 55) return "text-amber-light";
  return "text-rose-light";
}

function cfColor(n: number) {
  return n >= 0 ? "text-emerald-light" : "text-rose-light";
}

function stageBadgeClass(s: DealStatus) {
  if (s === "offer_pending" || s === "under_contract") return "badge-amber";
  if (s === "discovered") return "badge-gold";
  return "badge-gold";
}

function parseNoteDate(raw: string): string {
  const match = raw.match(/^\[(.+?)\]/);
  if (!match) return "";
  try {
    return new Date(match[1]!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return match[1] ?? "";
  }
}

function parseNoteText(raw: string): string {
  return raw.replace(/^\[.+?\]\s*/, "");
}

// ─── Radar chart data builder ─────────────────────────────────────────────────
function buildRadarData(deal: PipelineDeal, compare?: PipelineDeal) {
  const normalize = (v: number, min: number, max: number) =>
    Math.min(100, Math.max(0, Math.round(((v - min) / (max - min)) * 100)));

  const dims = (d: PipelineDeal) => [
    { subject: "Score", value: d.analysis?.apexScore ?? 0 },
    { subject: "CF", value: normalize(d.analysis?.monthlyCashFlow ?? 0, -200, 800) },
    { subject: "Cap Rate", value: normalize(d.analysis?.capRate ?? 0, 0, 12) },
    { subject: "CoC", value: normalize(d.analysis?.cashOnCash ?? 0, 0, 15) },
    { subject: "DSCR", value: normalize(d.dscr ?? 0, 0, 2) },
    { subject: "IRR", value: normalize(d.irr ?? 0, 0, 20) },
  ];

  const primary = dims(deal);
  if (!compare) return primary;

  const secondary = dims(compare);
  return primary.map((p, i) => ({ ...p, compare: secondary[i]?.value ?? 0 }));
}

// ─── Deal card ────────────────────────────────────────────────────────────────
function DealCard({
  deal,
  isSelected,
  onSelect,
  onMove,
}: {
  deal: PipelineDeal;
  isSelected: boolean;
  onSelect: (d: PipelineDeal) => void;
  onMove: (id: string, dir: "forward" | "back") => void;
}) {
  const next = NEXT_STATUS[deal.status];
  const prev = PREV_STATUS[deal.status];

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Deal: ${deal.address}, ${fmtPrice(deal.price)}, score ${deal.analysis?.apexScore ?? "N/A"}. Press Enter to view details.`}
      aria-pressed={isSelected}
      onClick={() => onSelect(deal)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(deal); }
      }}
      className={[
        "glass cursor-pointer p-3.5 transition-all duration-200 focus-visible:outline-none",
        "focus-visible:ring-1 focus-visible:ring-gold/40",
        isSelected
          ? "border-gold/30 shadow-gold-glow"
          : "hover:border-white/10 hover:shadow-glass-hover hover:-translate-y-px",
      ].join(" ")}
    >
      {/* Address + strategy */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-content-primary leading-snug truncate">
            {deal.address}
          </p>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            {deal.market}, {deal.state}
          </p>
        </div>
        <span className={`${stageBadgeClass(deal.status)} shrink-0`}>
          {deal.strategy}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        <div>
          <p className="metric-label" style={{ fontSize: 9 }}>Price</p>
          <p className="font-mono text-[12px] font-semibold text-content-primary tabular-nums">
            {fmtPrice(deal.price)}
          </p>
        </div>
        <div>
          <p className="metric-label" style={{ fontSize: 9 }}>CF/mo</p>
          <p className={`font-mono text-[12px] font-semibold tabular-nums ${cfColor(deal.analysis?.monthlyCashFlow ?? 0)}`}>
            {fmtCF(deal.analysis?.monthlyCashFlow ?? 0)}
          </p>
        </div>
        <div>
          <p className="metric-label" style={{ fontSize: 9 }}>Score</p>
          <p className={`font-mono text-[12px] font-bold tabular-nums ${scoreColor(deal.analysis?.apexScore ?? 0)}`}>
            {deal.analysis?.apexScore ?? "--"}
          </p>
        </div>
      </div>

      {/* Footer: time in stage + move controls */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-content-disabled">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {deal.daysInStage}d in stage
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {prev && (
            <button
              onClick={() => onMove(deal.id, "back")}
              aria-label={`Move ${deal.address} back to previous stage`}
              className="p-0.5 text-content-disabled hover:text-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {next && (
            <button
              onClick={() => onMove(deal.id, "forward")}
              aria-label={`Advance ${deal.address} to next stage`}
              className="p-0.5 text-content-disabled hover:text-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────
function KanbanColumn({
  config,
  deals,
  selectedId,
  onSelect,
  onMove,
}: {
  config: (typeof BOARD_COLUMNS)[number];
  deals: PipelineDeal[];
  selectedId: string | null;
  onSelect: (d: PipelineDeal) => void;
  onMove: (id: string, dir: "forward" | "back") => void;
}) {
  const Icon = config.icon;
  return (
    <section
      aria-label={`${config.label} column, ${deals.length} deal${deals.length !== 1 ? "s" : ""}`}
      className="flex flex-col min-w-[220px] flex-1"
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">
          {config.label}
        </span>
        <span className="font-mono text-[11px] text-content-disabled bg-surface-elevated rounded-full w-5 h-5 flex items-center justify-center">
          {deals.length}
        </span>
      </div>

      {/* Column body */}
      <div
        className="rounded-xl border border-surface-border p-2 flex flex-col gap-2 min-h-[140px]"
        style={{ background: "rgba(17,17,17,0.4)", backdropFilter: "blur(8px)" }}
      >
        {deals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="text-[11px] text-content-disabled text-center leading-relaxed">
              No deals here yet
            </p>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isSelected={selectedId === deal.id}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Decision journal ─────────────────────────────────────────────────────────
function DecisionJournal({
  notes,
  onSave,
}: {
  notes: string[];
  onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <section aria-label="Decision Journal">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        <span className="section-label">Decision Journal</span>
      </div>

      {/* Existing notes — append only */}
      {notes.length > 0 && (
        <ol
          aria-label="Previous journal entries"
          className="space-y-2 mb-3 max-h-36 overflow-y-auto scrollbar-hide"
        >
          {notes.map((raw, i) => (
            <li key={i} className="rounded-lg bg-surface-secondary border border-surface-border p-2.5">
              <p className="text-[10px] font-mono text-content-disabled mb-1">
                {parseNoteDate(raw)}
              </p>
              <p className="text-[12px] text-content-secondary leading-relaxed">
                {parseNoteText(raw)}
              </p>
            </li>
          ))}
        </ol>
      )}

      {notes.length === 0 && (
        <p className="text-[11px] text-content-disabled mb-3 italic">No notes yet.</p>
      )}

      {/* Add note input */}
      <div className="space-y-2">
        <label htmlFor="journal-input" className="sr-only">
          Add a journal note
        </label>
        <textarea
          ref={inputRef}
          id="journal-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note — insurance quotes, seller info, concerns..."
          rows={2}
          aria-required="false"
          className="input-glass w-full resize-none text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSave();
            }
          }}
        />
        <button
          onClick={handleSave}
          disabled={!draft.trim()}
          aria-label="Save journal note"
          className="btn-secondary btn-sm w-full"
        >
          Save Note
        </button>
      </div>
    </section>
  );
}

// ─── Side panel ───────────────────────────────────────────────────────────────
function SidePanel({
  deal,
  allDeals,
  onClose,
  onMove,
  onAddNote,
  onPassDeal,
}: {
  deal: PipelineDeal;
  allDeals: PipelineDeal[];
  onClose: () => void;
  onMove: (id: string, dir: "forward" | "back") => void;
  onAddNote: (id: string, text: string) => void;
  onPassDeal: (id: string) => void;
}) {
  const [compareId, setCompareId] = useState<string>("");
  const compareDeal = allDeals.find((d) => d.id === compareId);
  const next = NEXT_STATUS[deal.status];

  const radarData = buildRadarData(deal, compareDeal as PipelineDeal | undefined);
  const otherDeals = allDeals.filter((d) => d.id !== deal.id);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const statusLabel = BOARD_COLUMNS.find((c) => c.status === deal.status)?.label ?? deal.status;

  return (
    <aside
      aria-label={`Deal detail: ${deal.address}`}
      className="animate-slide-in-right glass-panel flex flex-col overflow-hidden"
      style={{ width: "100%", maxWidth: 420, height: "100%" }}
    >
      {/* Panel header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-surface-border">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-content-primary leading-snug">
            {deal.address}
          </p>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            {deal.market}, {deal.state}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close deal detail panel"
          className="shrink-0 p-1 text-content-disabled hover:text-content-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-5">

        {/* Stage + metadata row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-content-tertiary">
          <span className="badge-gold">{statusLabel}</span>
          <span aria-label="Strategy">{deal.strategy}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {deal.daysInStage}d in stage
          </span>
          <span>·</span>
          <span>{fmtPrice(deal.price)}</span>
        </div>

        {/* Metrics snapshot */}
        <section aria-label="Key metrics">
          <p className="section-label mb-2.5">Deal Snapshot</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Apex Score", value: String(deal.analysis?.apexScore ?? "--"), color: scoreColor(deal.analysis?.apexScore ?? 0), ariaLabel: `Apex score: ${deal.analysis?.apexScore ?? "N/A"}` },
              { label: "CF / mo", value: fmtCF(deal.analysis?.monthlyCashFlow ?? 0), color: cfColor(deal.analysis?.monthlyCashFlow ?? 0), ariaLabel: `Monthly cash flow: ${fmtCF(deal.analysis?.monthlyCashFlow ?? 0)}` },
              { label: "DSCR", value: deal.dscr?.toFixed(2) ?? "--", color: (deal.dscr ?? 0) >= 1.25 ? "text-emerald-light" : (deal.dscr ?? 0) >= 1.0 ? "text-amber-light" : "text-rose-light", ariaLabel: `DSCR: ${deal.dscr?.toFixed(2) ?? "N/A"}` },
              { label: "IRR", value: deal.irr ? `${deal.irr.toFixed(1)}%` : "--", color: (deal.irr ?? 0) >= 12 ? "text-emerald-light" : (deal.irr ?? 0) >= 6 ? "text-amber-light" : "text-rose-light", ariaLabel: `IRR: ${deal.irr?.toFixed(1) ?? "N/A"} percent` },
              { label: "Cap Rate", value: `${deal.analysis?.capRate ?? "--"}%`, color: (deal.analysis?.capRate ?? 0) >= 6 ? "text-emerald-light" : "text-amber-light", ariaLabel: `Cap rate: ${deal.analysis?.capRate ?? "N/A"} percent` },
              { label: "CoC", value: `${deal.analysis?.cashOnCash ?? "--"}%`, color: (deal.analysis?.cashOnCash ?? 0) >= 8 ? "text-emerald-light" : "text-amber-light", ariaLabel: `Cash on cash: ${deal.analysis?.cashOnCash ?? "N/A"} percent` },
            ].map((m) => (
              <div key={m.label} className="card !p-3" aria-label={m.ariaLabel}>
                <p className="metric-label mb-1">{m.label}</p>
                <p className={`font-mono text-base font-bold tabular-nums ${m.color}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Compare section */}
        <section aria-label="Deal comparison">
          <p className="section-label mb-2.5">Compare With</p>
          <label htmlFor="compare-select" className="sr-only">Select a deal to compare</label>
          <select
            id="compare-select"
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            className="input-glass w-full text-[12px] mb-3"
            aria-label="Select another pipeline deal to compare"
          >
            <option value="">Select another pipeline deal...</option>
            {otherDeals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.address} ({d.market})
              </option>
            ))}
          </select>

          {/* Radar chart — only when comparison selected */}
          {compareId && compareDeal && (
            <div className="rounded-xl border border-surface-border p-3" style={{ background: "rgba(17,17,17,0.5)" }}>
              <div className="flex items-center gap-3 mb-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: CHART_COLORS.gold }} aria-hidden="true" />
                  <span className="text-content-tertiary">{deal.address.split(" ").slice(0, 2).join(" ")}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: CHART_COLORS.emerald }} aria-hidden="true" />
                  <span className="text-content-tertiary">{compareDeal.address.split(" ").slice(0, 2).join(" ")}</span>
                </span>
              </div>
              <div
                className="chart-container"
                aria-label={`Radar chart comparing ${deal.address} with ${compareDeal.address} across 6 dimensions`}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                    <PolarGrid stroke="#1F1F1F" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#666666", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Radar
                      name={deal.address}
                      dataKey="value"
                      stroke={CHART_COLORS.gold}
                      fill={CHART_COLORS.gold}
                      fillOpacity={0.15}
                    />
                    {compareDeal && (
                      <Radar
                        name={compareDeal.address}
                        dataKey="compare"
                        stroke={CHART_COLORS.emerald}
                        fill={CHART_COLORS.emerald}
                        fillOpacity={0.1}
                      />
                    )}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* Decision journal */}
        <DecisionJournal
          notes={deal.notes}
          onSave={(text) => onAddNote(deal.id, text)}
        />

        {/* AI urgency coaching */}
        <AiInsightStrip
          summary={`This deal has been in '${statusLabel}' for ${deal.daysInStage} day${deal.daysInStage !== 1 ? "s" : ""}. Properties at this price point in ${deal.market} go under contract within 8 days. ${deal.daysInStage >= 5 ? "Move quickly — clock is ticking." : "Monitor closely."}`}
          detail={`Score ${deal.analysis?.apexScore ?? "N/A"} with ${fmtCF(deal.analysis?.monthlyCashFlow ?? 0)}/mo cash flow. ${(deal.analysis?.apexScore ?? 0) >= 75 ? "Strong fundamentals support advancing this deal." : "Review risk factors before advancing."} DSCR ${deal.dscr?.toFixed(2) ?? "N/A"} — ${(deal.dscr ?? 0) >= 1.25 ? "lender-ready." : "may need review before financing."}`}
          confidence={(deal.analysis?.apexScore ?? 0) >= 75 ? "high" : (deal.analysis?.apexScore ?? 0) >= 55 ? "medium" : "low"}
          sources={["Pipeline Engine", "Market Data"]}
        />
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-surface-border space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`/dashboard/analyze?address=${encodeURIComponent(deal.address + ", " + deal.market + ", " + deal.state)}`}
            className="btn-secondary btn-sm flex items-center justify-center gap-1.5 text-center"
            aria-label={`Open full analysis for ${deal.address}`}
          >
            Full Analysis
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
          {next ? (
            <button
              onClick={() => onMove(deal.id, "forward")}
              className="btn-primary btn-sm"
              aria-label={`Advance ${deal.address} to ${BOARD_COLUMNS.find((c) => c.status === next)?.label}`}
            >
              {next === "offer_pending" ? "Make Offer" : next === "under_contract" ? "Go to Contract" : "Advance"}
            </button>
          ) : (
            <div />
          )}
        </div>
        <button
          onClick={() => onPassDeal(deal.id)}
          className="btn-ghost btn-sm w-full text-rose-light hover:text-rose"
          aria-label={`Pass on ${deal.address}`}
        >
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Pass on This Deal
        </button>
      </div>
    </aside>
  );
}

// ─── Stats view ───────────────────────────────────────────────────────────────
function StatsView({ deals }: { deals: PipelineDeal[] }) {
  const stages = BOARD_COLUMNS.map((col) => {
    const colDeals = deals.filter((d) => d.status === col.status);
    const avgDays = colDeals.length > 0
      ? Math.round(colDeals.reduce((s, d) => s + d.daysInStage, 0) / colDeals.length)
      : 0;
    return { ...col, count: colDeals.length, avgDays };
  });

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const totalActive = stages.reduce((s, col) => s + col.count, 0);

  return (
    <section aria-label="Pipeline statistics" className="space-y-4">
      {/* Funnel bars */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          <span className="section-label">Pipeline Funnel</span>
        </div>
        {stages.map((stage, i) => {
          const widthPct = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
          const opacity = 0.3 + (0.7 * (stages.length - i)) / stages.length;
          return (
            <div key={stage.status} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-content-secondary font-medium">{stage.label}</span>
                <div className="flex items-center gap-3 text-content-tertiary">
                  <span className="font-mono tabular-nums">{stage.count} deal{stage.count !== 1 ? "s" : ""}</span>
                  <span>avg {stage.avgDays}d</span>
                </div>
              </div>
              <div
                className="h-2 rounded-full bg-surface-elevated overflow-hidden"
                role="progressbar"
                aria-valuenow={stage.count}
                aria-valuemin={0}
                aria-valuemax={maxCount}
                aria-label={`${stage.label}: ${stage.count} deals`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, background: `rgba(201,162,39,${opacity})` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card !p-3">
          <p className="metric-label mb-1">Active Deals</p>
          <p className="metric-value">{totalActive}</p>
        </div>
        <div className="card !p-3">
          <p className="metric-label mb-1">Avg Score</p>
          <p className={`metric-value ${scoreColor(
            deals.filter((d) => d.analysis).length > 0
              ? Math.round(deals.filter((d) => d.analysis).reduce((s, d) => s + (d.analysis?.apexScore ?? 0), 0) / deals.filter((d) => d.analysis).length)
              : 0
          )}`}>
            {deals.filter((d) => d.analysis).length > 0
              ? Math.round(deals.filter((d) => d.analysis).reduce((s, d) => s + (d.analysis?.apexScore ?? 0), 0) / deals.filter((d) => d.analysis).length)
              : "--"}
          </p>
        </div>
        <div className="card !p-3">
          <p className="metric-label mb-1">Positive CF</p>
          <p className="metric-value text-emerald-light">
            {deals.filter((d) => (d.analysis?.monthlyCashFlow ?? 0) > 0).length}
          </p>
        </div>
        <div className="card !p-3">
          <p className="metric-label mb-1">Needs Attention</p>
          <p className="metric-value text-amber-light">
            {deals.filter((d) => d.daysInStage >= 5).length}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Cost of Waiting ──────────────────────────────────────────────────────────
function CostOfWaiting({ deals }: { deals: PipelineDeal[] }) {
  const staleDeal = deals
    .filter((d) => d.daysInStage >= 3 && d.analysis?.monthlyCashFlow && d.analysis.monthlyCashFlow > 0)
    .sort((a, b) => (b.analysis?.monthlyCashFlow ?? 0) - (a.analysis?.monthlyCashFlow ?? 0))[0];

  if (!staleDeal) return null;

  const dailyCost = Math.round((staleDeal.analysis!.monthlyCashFlow!) / 30);
  const totalMissed = dailyCost * staleDeal.daysInStage;

  return (
    <aside
      aria-label="Cost of waiting alert"
      className="glass-gold p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="w-4 h-4 text-amber-light shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <p className="text-[12px] font-semibold text-amber-light mb-1">
            Cost of Waiting
          </p>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            Every day you wait on{" "}
            <span className="font-medium text-content-primary">{staleDeal.address}</span>{" "}
            costs{" "}
            <span className="font-mono font-bold text-amber-light tabular-nums" aria-label={`${fmtCF(dailyCost)} per day`}>
              {fmtCF(dailyCost)}/day
            </span>{" "}
            in potential cash flow.{" "}
            <span className="font-mono text-rose-light tabular-nums" aria-label={`Total missed: ${fmtCF(totalMissed)}`}>
              {fmtCF(totalMissed)} missed
            </span>{" "}
            over {staleDeal.daysInStage} days.{" "}
            {staleDeal.daysInStage >= 7 ? "Comparable properties in this ZIP typically go under contract within 8 days." : "Consider advancing this deal soon."}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const store = useDealPipelineStore();
  const [view, setView] = useState<"board" | "stats">("board");
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Merge store deals with sample data — store takes priority
  const storeDeals = store.deals as PipelineDeal[];
  const deals: PipelineDeal[] = storeDeals.length > 0
    ? storeDeals.map((d) => ({ ...d, daysInStage: Math.max(1, Math.round((Date.now() - new Date(d.updatedAt).getTime()) / 86400000)), strategy: "LTR" as const }))
    : SAMPLE_DEALS;

  const activeDeals = deals.filter((d) => !["closed", "passed", "lost"].includes(d.status));

  const handleMove = useCallback((id: string, dir: "forward" | "back") => {
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    const newStatus = dir === "forward" ? NEXT_STATUS[deal.status] : PREV_STATUS[deal.status];
    if (!newStatus) return;

    if (!id.startsWith("s")) {
      store.updateDealStatus(id, newStatus);
    } else {
      // For sample data, update selectedDeal if open
      if (selectedDeal?.id === id) {
        setSelectedDeal((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    }
  }, [deals, store, selectedDeal]);

  const handleAddNote = useCallback((id: string, text: string) => {
    if (!id.startsWith("s")) {
      store.addNote(id, text);
    } else {
      // Update local sample deal note in side panel
      setSelectedDeal((prev) => {
        if (!prev || prev.id !== id) return prev;
        const timestamp = new Date().toISOString();
        return { ...prev, notes: [...prev.notes, `[${timestamp}] ${text}`] };
      });
    }
  }, [store]);

  const handlePass = useCallback((id: string) => {
    if (!id.startsWith("s")) {
      store.updateDealStatus(id, "passed");
    }
    setSelectedDeal(null);
  }, [store]);

  // Click outside to close panel
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedDeal(null);
      }
    }
    if (selectedDeal) {
      document.addEventListener("pointerdown", onPointerDown);
    }
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedDeal]);

  return (
    <div className="animate-fade-in">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
            Manage
          </div>
          <h1 className="page-title mt-1">Deal Pipeline</h1>
          <p className="page-subtitle">
            Track deals from discovery to close. {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center rounded-lg border border-surface-border overflow-hidden"
            role="group"
            aria-label="View toggle"
          >
            {(["board", "stats"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={`Switch to ${v} view`}
                className={[
                  "px-3 py-1.5 text-[11px] font-medium capitalize transition-colors",
                  view === v
                    ? "bg-surface-elevated text-content-primary"
                    : "text-content-tertiary hover:text-content-secondary",
                ].join(" ")}
              >
                {v === "board" ? "Board" : "Stats"}
              </button>
            ))}
          </div>

          <button
            className="btn-primary btn-sm"
            aria-label="Add a new deal to pipeline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add Deal
          </button>
        </div>
      </div>

      {/* ── Main layout: board + side panel ────────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* Board / Stats */}
        <div className="flex-1 min-w-0">
          {view === "board" ? (
            <>
              {/* Kanban columns — horizontal scroll on small screens */}
              <div
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                role="region"
                aria-label="Kanban board"
              >
                {BOARD_COLUMNS.map((col) => (
                  <KanbanColumn
                    key={col.status}
                    config={col}
                    deals={activeDeals.filter((d) => d.status === col.status)}
                    selectedId={selectedDeal?.id ?? null}
                    onSelect={setSelectedDeal}
                    onMove={handleMove}
                  />
                ))}
              </div>

              {/* Cost of Waiting */}
              <div className="mt-4">
                <CostOfWaiting deals={activeDeals} />
              </div>
            </>
          ) : (
            <StatsView deals={deals} />
          )}
        </div>

        {/* Side panel */}
        {selectedDeal && (
          <div
            ref={panelRef}
            className="shrink-0 hidden md:flex"
            style={{ height: "calc(100vh - 12rem)", position: "sticky", top: "5rem", width: 420 }}
          >
            <SidePanel
              deal={selectedDeal}
              allDeals={activeDeals}
              onClose={() => setSelectedDeal(null)}
              onMove={handleMove}
              onAddNote={handleAddNote}
              onPassDeal={handlePass}
            />
          </div>
        )}
      </div>

      {/* Side panel — mobile full-screen overlay */}
      {selectedDeal && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          role="dialog"
          aria-modal="true"
          aria-label={`Deal detail: ${selectedDeal.address}`}
        >
          <div className="absolute inset-y-0 right-0 w-full max-w-[420px] flex flex-col">
            <SidePanel
              deal={selectedDeal}
              allDeals={activeDeals}
              onClose={() => setSelectedDeal(null)}
              onMove={handleMove}
              onAddNote={handleAddNote}
              onPassDeal={handlePass}
            />
          </div>
        </div>
      )}

      {/* Closed/passed counts — tucked below the board */}
      {deals.filter((d) => d.status === "closed" || d.status === "passed").length > 0 && (
        <div className="mt-6 flex items-center gap-4 text-[11px] text-content-disabled">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-light" aria-hidden="true" />
            {deals.filter((d) => d.status === "closed").length} closed
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-light" aria-hidden="true" />
            {deals.filter((d) => d.status === "passed").length} passed
          </span>
        </div>
      )}
    </div>
  );
}
