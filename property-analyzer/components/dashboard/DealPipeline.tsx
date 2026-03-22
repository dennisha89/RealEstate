"use client";

import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, X, Inbox } from "lucide-react";
import { useDealPipelineStore, type DealStatus, type DealEntry } from "@/lib/stores/deal-pipeline-store";
import { formatCurrency } from "@/lib/utils/format";

const STATUS_CONFIG: Record<DealStatus, { label: string; color: string; bg: string; border: string }> = {
  discovered:     { label: "Discovered",     color: "text-gray-400",    bg: "bg-gray-500/10",    border: "border-gray-500/20" },
  analyzing:      { label: "Analyzing",      color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  offer_pending:  { label: "Offer Pending",  color: "text-gold-400",    bg: "bg-gold-500/10",    border: "border-gold-500/20" },
  under_contract: { label: "Under Contract", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  closed:         { label: "Closed",         color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  passed:         { label: "Passed",         color: "text-gray-500",    bg: "bg-gray-500/10",    border: "border-gray-500/20" },
  lost:           { label: "Lost",           color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
};

const ACTIVE_STATUSES: DealStatus[] = ["discovered", "analyzing", "offer_pending", "under_contract"];
const CLOSED_STATUSES: DealStatus[] = ["closed", "passed", "lost"];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const v = verdict.toLowerCase();
  const cls = v.includes("buy") ? "badge-profit" : v.includes("hold") ? "badge-caution" : "badge-loss";
  return <span className={cls}>{verdict}</span>;
}

function DealCard({ deal, onRemove }: { deal: DealEntry; onRemove: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[deal.status];
  const days = daysSince(deal.addedAt);

  return (
    <div className="bg-surface-card border border-surface-border rounded-[10px] p-4 transition-all duration-200 hover:border-border">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setOpen(!open)} className="flex-1 text-left">
          <p className="text-sm font-medium text-content-primary truncate">{deal.address}</p>
          <p className="text-xs text-content-tertiary mt-0.5">{deal.market}, {deal.state} {deal.zip}</p>
        </button>
        <button onClick={() => onRemove(deal.id)} className="text-content-disabled hover:text-red-400 transition-colors p-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-sm font-mono font-semibold text-content-primary">{formatCurrency(deal.price)}</span>
        <span className={`badge ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        {deal.analysis && <VerdictBadge verdict={deal.analysis.prismVerdict} />}
        {deal.analysis && (
          <span className="text-xs font-mono text-gold-400">{deal.analysis.convictionScore.toFixed(0)}%</span>
        )}
        <span className="text-xs text-content-disabled ml-auto">{days}d</span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-2 animate-fade-in">
          {deal.analysis && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-content-tertiary">Cap Rate</span><p className="font-mono text-content-primary">{deal.analysis.capRate.toFixed(1)}%</p></div>
              <div><span className="text-content-tertiary">CoC</span><p className="font-mono text-content-primary">{deal.analysis.cashOnCash.toFixed(1)}%</p></div>
              <div><span className="text-content-tertiary">Cash Flow</span><p className="font-mono text-emerald-400">{formatCurrency(deal.analysis.monthlyCashFlow)}/mo</p></div>
            </div>
          )}
          {deal.financing && (
            <div className="text-xs text-content-secondary">
              {deal.financing.loanType} &middot; {deal.financing.interestRate}% &middot; {formatCurrency(deal.financing.monthlyPayment)}/mo
            </div>
          )}
          {deal.notes.length > 0 && (
            <div className="text-xs text-content-tertiary space-y-1">
              {deal.notes.slice(-2).map((n, i) => <p key={i} className="truncate">{n}</p>)}
            </div>
          )}
          {deal.passReason && <p className="text-xs text-red-400">Passed: {deal.passReason}</p>}
        </div>
      )}
    </div>
  );
}

function AddDealForm({ onClose }: { onClose: () => void }) {
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const [form, setForm] = useState({ address: "", price: "", market: "", state: "", zip: "", propertyType: "SFR" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address || !form.price) return;
    addDeal({ address: form.address, price: Number(form.price), market: form.market, state: form.state, zip: form.zip, propertyType: form.propertyType, status: "discovered" });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-elevated border border-surface-border rounded-[10px] p-4 space-y-3 animate-slide-up">
      <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="input" required />
      <div className="grid grid-cols-2 gap-3">
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" type="number" className="input" required />
        <input value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} placeholder="Market" className="input" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="input" />
        <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="ZIP" className="input" />
        <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className="select">
          <option value="SFR">SFR</option><option value="Multi">Multi</option><option value="Condo">Condo</option><option value="Townhouse">TH</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
        <button type="submit" className="btn-primary btn-sm">Add Deal</button>
      </div>
    </form>
  );
}

export default function DealPipeline() {
  const { deals, removeDeal, getPipelineStats } = useDealPipelineStore();
  const [showForm, setShowForm] = useState(false);
  const [section, setSection] = useState<"active" | "closed">("active");
  const stats = getPipelineStats();

  const statusList = section === "active" ? ACTIVE_STATUSES : CLOSED_STATUSES;
  const filtered = deals
    .filter((d) => statusList.includes(d.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-content-primary">Deal Pipeline</h2>
          {stats.total > 0 && (
            <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">{stats.activeDeals} active</span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary btn-sm">
          <Plus className="h-4 w-4" /> Add Deal
        </button>
      </div>

      {showForm && <AddDealForm onClose={() => setShowForm(false)} />}

      <div className="flex gap-1 bg-surface-secondary rounded-[6px] p-1">
        <button onClick={() => setSection("active")} className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${section === "active" ? "bg-surface-elevated text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}>
          Active ({ACTIVE_STATUSES.reduce((n, s) => n + (stats.byStatus[s] ?? 0), 0)})
        </button>
        <button onClick={() => setSection("closed")} className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${section === "closed" ? "bg-surface-elevated text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}>
          Closed ({CLOSED_STATUSES.reduce((n, s) => n + (stats.byStatus[s] ?? 0), 0)})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-10 w-10 text-content-disabled mb-3" />
          <p className="text-sm text-content-secondary">No deals in pipeline.</p>
          <p className="text-xs text-content-tertiary mt-1">Start analyzing properties to build your pipeline.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} onRemove={removeDeal} />
          ))}
        </div>
      )}
    </div>
  );
}
