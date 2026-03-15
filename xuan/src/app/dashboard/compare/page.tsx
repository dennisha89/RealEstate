"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale, Plus, X, Trophy, ArrowUpRight } from "lucide-react";

// --- Mock property pool ---
interface CompProperty {
  id: string; address: string; price: number; score: number; capRate: number;
  cashFlow: number; dscr: number; appreciation: number; dom: number;
  valueDiscount: number; beds: number; baths: number; sqft: number;
}

const POOL: CompProperty[] = [
  { id: "c1", address: "1847 Oak Valley Dr, Austin TX", price: 385000, score: 82, capRate: 6.8, cashFlow: 420, dscr: 1.32, appreciation: 4.8, dom: 18, valueDiscount: -3.2, beds: 4, baths: 2, sqft: 2100 },
  { id: "c2", address: "920 Magnolia Ln, Raleigh NC", price: 312000, score: 78, capRate: 7.1, cashFlow: 380, dscr: 1.25, appreciation: 5.2, dom: 24, valueDiscount: -1.8, beds: 3, baths: 2, sqft: 1650 },
  { id: "c3", address: "4501 Bay Shore Blvd, Tampa FL", price: 445000, score: 74, capRate: 5.9, cashFlow: 210, dscr: 1.12, appreciation: 3.5, dom: 32, valueDiscount: 1.2, beds: 4, baths: 3, sqft: 2400 },
  { id: "c4", address: "2280 Cedar Ridge Ct, Nashville TN", price: 358000, score: 76, capRate: 6.5, cashFlow: 340, dscr: 1.22, appreciation: 4.1, dom: 28, valueDiscount: -2.5, beds: 3, baths: 2, sqft: 1800 },
  { id: "c5", address: "6739 Pine Creek Dr, Charlotte NC", price: 295000, score: 80, capRate: 7.4, cashFlow: 460, dscr: 1.38, appreciation: 4.5, dom: 15, valueDiscount: -4.1, beds: 3, baths: 2, sqft: 1550 },
  { id: "c6", address: "1105 Elm Park Ave, Phoenix AZ", price: 275000, score: 62, capRate: 5.2, cashFlow: 85, dscr: 1.05, appreciation: 2.1, dom: 52, valueDiscount: 2.8, beds: 3, baths: 2, sqft: 1400 },
  { id: "c7", address: "3344 Birch Hollow Way, Austin TX", price: 410000, score: 85, capRate: 7.0, cashFlow: 520, dscr: 1.41, appreciation: 5.5, dom: 12, valueDiscount: -5.0, beds: 4, baths: 3, sqft: 2250 },
  { id: "c8", address: "880 Walnut Springs Rd, Raleigh NC", price: 268000, score: 72, capRate: 6.3, cashFlow: 290, dscr: 1.18, appreciation: 3.8, dom: 35, valueDiscount: -0.5, beds: 2, baths: 1, sqft: 1200 },
];

type MetricDef = { key: string; label: string; format: (p: CompProperty) => string; best: "high" | "low"; raw: (p: CompProperty) => number };

const METRICS: MetricDef[] = [
  { key: "price", label: "Price", format: (p) => `$${(p.price / 1000).toFixed(0)}K`, best: "low", raw: (p) => p.price },
  { key: "score", label: "Score", format: (p) => `${p.score}`, best: "high", raw: (p) => p.score },
  { key: "capRate", label: "Cap Rate", format: (p) => `${p.capRate}%`, best: "high", raw: (p) => p.capRate },
  { key: "cashFlow", label: "Cash Flow", format: (p) => `$${p.cashFlow}/mo`, best: "high", raw: (p) => p.cashFlow },
  { key: "dscr", label: "DSCR", format: (p) => p.dscr.toFixed(2), best: "high", raw: (p) => p.dscr },
  { key: "appreciation", label: "Appreciation", format: (p) => `${p.appreciation}%`, best: "high", raw: (p) => p.appreciation },
  { key: "dom", label: "Days on Market", format: (p) => `${p.dom}d`, best: "low", raw: (p) => p.dom },
  { key: "valueDiscount", label: "Value vs Ask", format: (p) => `${p.valueDiscount > 0 ? "+" : ""}${p.valueDiscount}%`, best: "low", raw: (p) => p.valueDiscount },
  { key: "beds", label: "Beds / Baths", format: (p) => `${p.beds}bd / ${p.baths}ba`, best: "high", raw: (p) => p.beds },
  { key: "sqft", label: "Sqft", format: (p) => p.sqft.toLocaleString(), best: "high", raw: (p) => p.sqft },
];

function isWinner(metric: MetricDef, value: number, all: number[]): boolean {
  if (all.length < 2) return false;
  return metric.best === "high" ? value === Math.max(...all) : value === Math.min(...all);
}

function bestOverall(selected: CompProperty[]): CompProperty | null {
  if (selected.length < 2) return null;
  const scores: Map<string, number> = new Map();
  for (const p of selected) scores.set(p.id, 0);
  for (const m of METRICS) {
    const vals = selected.map((p) => m.raw(p));
    for (let i = 0; i < selected.length; i++) {
      if (isWinner(m, vals[i], vals)) scores.set(selected[i].id, (scores.get(selected[i].id) ?? 0) + 1);
    }
  }
  let best = selected[0];
  let max = 0;
  for (const p of selected) {
    const s = scores.get(p.id) ?? 0;
    if (s > max) { max = s; best = p; }
  }
  return best;
}

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const selected = selectedIds.map((id) => POOL.find((p) => p.id === id)!).filter(Boolean);
  const available = POOL.filter((p) => !selectedIds.includes(p.id));
  const winner = bestOverall(selected);

  function addProperty(id: string) {
    if (selectedIds.length < 4) { setSelectedIds([...selectedIds, id]); setShowPicker(false); }
  }
  function removeProperty(id: string) { setSelectedIds(selectedIds.filter((i) => i !== id)); }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> Deal Comparison</div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Compare Properties</h1>
        <p className="text-[13px] text-content-tertiary mt-1">Select up to 4 properties for side-by-side analysis.</p>
      </div>

      {/* Slots */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => {
          const p = selected[i];
          return p ? (
            <div key={p.id} className="card-glass !p-3 relative group">
              <button onClick={() => removeProperty(p.id)}
                className="absolute top-2 right-2 p-1 rounded-md bg-white/[0.04] text-content-disabled hover:text-rose-light hover:bg-rose-muted transition-colors opacity-0 group-hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
              <div className={`badge font-mono font-bold mb-2 ${p.score >= 75 ? "badge-emerald" : p.score >= 55 ? "badge-amber" : "badge-rose"}`}>{p.score}</div>
              <div className="text-[12px] font-medium text-content-primary leading-snug truncate">{p.address}</div>
              <div className="font-mono text-sm font-bold text-content-primary mt-1">${(p.price / 1000).toFixed(0)}K</div>
            </div>
          ) : (
            <button key={i} onClick={() => setShowPicker(true)}
              className="card-glass !p-3 flex flex-col items-center justify-center gap-2 min-h-[100px] border-dashed !border-white/[0.1] hover:!border-gold/30 transition-colors">
              <Plus className="w-5 h-5 text-content-disabled" />
              <span className="text-[11px] text-content-disabled">Add Property</span>
            </button>
          );
        })}
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-content-primary">Select a Property</span>
            <button onClick={() => setShowPicker(false)} className="text-content-disabled hover:text-content-primary"><X className="w-4 h-4" /></button>
          </div>
          {available.map((p) => (
            <button key={p.id} onClick={() => addProperty(p.id)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-gold/20 transition-all text-left">
              <div>
                <div className="text-[12px] font-medium text-content-primary">{p.address}</div>
                <div className="text-[11px] text-content-tertiary font-mono mt-0.5">${(p.price / 1000).toFixed(0)}K | Cap {p.capRate}% | Score {p.score}</div>
              </div>
              <Plus className="w-4 h-4 text-content-disabled shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {selected.length >= 2 && (
        <section className="card overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider">
                <th className="text-left font-medium pb-3 pr-4 sticky left-0 bg-surface-card z-10">Metric</th>
                {selected.map((p) => (
                  <th key={p.id} className="text-right font-medium pb-3 px-3 min-w-[120px]">
                    <span className="text-content-secondary normal-case tracking-normal">{p.address.split(",")[0]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {METRICS.map((m) => {
                const vals = selected.map((p) => m.raw(p));
                return (
                  <tr key={m.key} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 text-content-secondary sticky left-0 bg-surface-card z-10">{m.label}</td>
                    {selected.map((p, i) => {
                      const win = isWinner(m, vals[i], vals);
                      return (
                        <td key={p.id} className={`py-2.5 px-3 text-right font-mono ${win ? "text-emerald-light font-semibold" : "text-content-tertiary"}`}>
                          {m.format(p)}
                          {win && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Best overall */}
      {winner && (
        <section className="card-gold">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-muted flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-gold-light" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-content-disabled uppercase tracking-wider font-medium mb-1">Best Overall</div>
              <div className="text-[15px] font-semibold text-content-primary">{winner.address}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-content-secondary">
                <span className="font-mono">${(winner.price / 1000).toFixed(0)}K</span>
                <span className="font-mono font-semibold text-emerald-light">{winner.score} score</span>
                <span className="font-mono">{winner.capRate}% cap</span>
              </div>
              <Link href="/dashboard/analyze" className="btn-primary btn-sm mt-3 inline-flex">
                <ArrowUpRight className="w-3 h-3" /> Full Analysis
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
