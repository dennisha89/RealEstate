"use client";

import { useState } from "react";
import { Check, AlertTriangle, X } from "lucide-react";
import type { DecisionEntry } from "@/lib/stores/decision-journal-store";
import { useDecisionJournalStore } from "@/lib/stores/decision-journal-store";

interface DecisionCaptureProps {
  type: DecisionEntry["type"];
  context: DecisionEntry["context"];
  systemRecommendation?: string;
  onSave: () => void;
  onCancel: () => void;
}

const KEY_FACTORS = ["Cap rate", "Cash flow", "Location", "Timing", "Gut feeling", "Rate environment", "Risk concerns", "Portfolio fit"] as const;
const CONFIDENCE_OPTIONS: { value: DecisionEntry["confidenceLevel"]; label: string }[] = [
  { value: "very_confident", label: "Very Confident" }, { value: "confident", label: "Confident" },
  { value: "uncertain", label: "Uncertain" }, { value: "forced", label: "Forced" },
];
const TYPE_LABELS: Record<DecisionEntry["type"], string> = {
  buy: "BUY", pass: "PASS", sell: "SELL", hold: "HOLD", refinance: "REFINANCE", watch: "WATCH",
};
const fmtPrice = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const chipBase = "rounded text-xs font-medium transition-colors";
const chipOn = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
const chipOff = "bg-surface-elevated text-content-secondary border border-surface-border hover:border-border-strong";

export default function DecisionCapture({ type, context, systemRecommendation, onSave, onCancel }: DecisionCaptureProps) {
  const [reasoning, setReasoning] = useState("");
  const [factors, setFactors] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<DecisionEntry["confidenceLevel"]>("confident");
  const addEntry = useDecisionJournalStore((s) => s.addEntry);
  const agreed = systemRecommendation ? systemRecommendation.toUpperCase().includes(TYPE_LABELS[type]) : true;
  const toggle = (f: string) => setFactors((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const save = () => {
    if (!reasoning.trim()) return;
    addEntry({ type, context, reasoning: reasoning.trim(), keyFactors: factors, confidenceLevel: confidence, systemRecommendation, agreedWithSystem: agreed });
    onSave();
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-lg animate-scale-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-content-primary">Record Your Decision</h3>
        <button onClick={onCancel} className="text-content-tertiary hover:text-content-secondary transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5 text-xs text-content-secondary">
        <span className="bg-surface-elevated px-2 py-1 rounded">{context.market} {context.zip}</span>
        {context.apexScore !== undefined && <span className="bg-surface-elevated px-2 py-1 rounded">Apex {context.apexScore}</span>}
        {context.price !== undefined && <span className="bg-surface-elevated px-2 py-1 rounded font-mono">{fmtPrice(context.price)}</span>}
      </div>

      {systemRecommendation && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded mb-5 text-sm ${agreed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
          {agreed ? <Check className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{"\u5929\u6A5F"} says <strong>{systemRecommendation.toUpperCase()}</strong>. You&apos;re choosing to <strong>{TYPE_LABELS[type]}</strong>.</span>
        </div>
      )}

      <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1.5">Why are you making this decision?</label>
      <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="Capture your reasoning so future-you understands..." rows={3}
        className="w-full bg-surface-secondary border border-surface-border rounded px-3 py-2.5 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:border-border-strong transition-colors resize-none mb-4" />

      <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1.5">Key Factors</label>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {KEY_FACTORS.map((f) => (
          <button key={f} onClick={() => toggle(f)} className={`px-2.5 py-1 ${chipBase} ${factors.includes(f) ? chipOn : chipOff}`}>{f}</button>
        ))}
      </div>

      <label className="block text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1.5">Confidence</label>
      <div className="grid grid-cols-4 gap-1.5 mb-5">
        {CONFIDENCE_OPTIONS.map((o) => (
          <button key={o.value} onClick={() => setConfidence(o.value)} className={`py-1.5 ${chipBase} ${confidence === o.value ? chipOn : chipOff}`}>{o.label}</button>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors">Cancel</button>
        <button onClick={save} disabled={!reasoning.trim()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm transition-all active:scale-[0.98]">
          Save Decision
        </button>
      </div>
    </div>
  );
}
