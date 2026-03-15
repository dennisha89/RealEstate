"use client";

import { useState } from "react";
import { Target, RotateCcw, Save } from "lucide-react";
import { useBuyBoxStore, DEFAULT_CRITERIA } from "@/lib/stores/buybox-store";

interface BuyBoxEditorProps {
  onClose?: () => void;
  compact?: boolean;
  matchCount?: number;
  totalCount?: number;
}

const PROPERTY_TYPE_OPTIONS = [
  { value: "sfr", label: "SFR" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "fourplex", label: "Fourplex" },
];

const PRIORITY_OPTIONS = [
  { value: "cash_flow", label: "Cash Flow" },
  { value: "appreciation", label: "Appreciation" },
  { value: "value", label: "Value" },
  { value: "balanced", label: "Balanced" },
] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-content-tertiary">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-content-disabled leading-tight">{hint}</span>}
    </div>
  );
}

export default function BuyBoxEditor({ onClose, compact, matchCount, totalCount }: BuyBoxEditorProps) {
  const { criteria, setCriteria, resetCriteria } = useBuyBoxStore();
  const [draft, setDraft] = useState({ ...criteria });

  const update = (partial: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...partial }));

  const toggleType = (t: string) => {
    const types = draft.propertyTypes.includes(t)
      ? draft.propertyTypes.filter((v) => v !== t)
      : [...draft.propertyTypes, t];
    update({ propertyTypes: types });
  };

  const handleSave = () => {
    setCriteria(draft);
    onClose?.();
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_CRITERIA });
    resetCriteria();
  };

  const inputCls =
    "w-full bg-surface-secondary border border-border-subtle rounded-[6px] px-3 py-2 text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:border-border-strong transition-colors";

  return (
    <div className={`bg-surface-card border border-border-subtle rounded-[10px] ${compact ? "p-4" : "p-6"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gold-400" />
          <h3 className="text-sm font-semibold text-content-primary tracking-wide">Your Buy Box</h3>
        </div>
        {matchCount !== undefined && totalCount !== undefined && (
          <span className="text-xs font-mono text-emerald-400">
            {matchCount} of {totalCount} match
          </span>
        )}
      </div>

      <div className={`grid gap-5 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Price Range */}
        <Field label="Min Price" hint="Floor for acquisition price">
          <input type="number" className={inputCls} value={draft.minPrice} onChange={(e) => update({ minPrice: +e.target.value })} />
        </Field>
        <Field label="Max Price" hint="Ceiling for acquisition price">
          <input type="number" className={inputCls} value={draft.maxPrice} onChange={(e) => update({ maxPrice: +e.target.value })} />
        </Field>

        {/* Returns */}
        <Field label="Min Cap Rate (%)" hint="Net operating income / price">
          <input type="number" step="0.5" className={inputCls} value={draft.minCapRate} onChange={(e) => update({ minCapRate: +e.target.value })} />
        </Field>
        <Field label="Min Cash Flow ($/mo)" hint="After PITI + reserves">
          <input type="number" className={inputCls} value={draft.minCashFlow} onChange={(e) => update({ minCashFlow: +e.target.value })} />
        </Field>
        <Field label="Min Cash-on-Cash (%)" hint="Annual return on capital deployed">
          <input type="number" step="0.5" className={inputCls} value={draft.minCashOnCash} onChange={(e) => update({ minCashOnCash: +e.target.value })} />
        </Field>
        <Field label="Min DSCR" hint="Debt service coverage ratio">
          <input type="number" step="0.05" className={inputCls} value={draft.minDSCR} onChange={(e) => update({ minDSCR: +e.target.value })} />
        </Field>

        {/* Property */}
        <div className="col-span-full">
          <Field label="Property Types">
            <div className="flex flex-wrap gap-2 mt-1">
              {PROPERTY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleType(opt.value)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors ${
                    draft.propertyTypes.includes(opt.value)
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-surface-secondary text-content-tertiary border-border-subtle hover:border-border"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="Min Bedrooms">
          <input type="number" min={0} className={inputCls} value={draft.minBedrooms} onChange={(e) => update({ minBedrooms: +e.target.value })} />
        </Field>
        <Field label="Max Property Age (yrs)" hint="Current year minus year built">
          <input type="number" className={inputCls} value={draft.maxAge} onChange={(e) => update({ maxAge: +e.target.value })} />
        </Field>

        {/* Market */}
        <Field label="Min APEX Score" hint="Composite market quality 0-100">
          <input type="number" min={0} max={100} className={inputCls} value={draft.minApexScore} onChange={(e) => update({ minApexScore: +e.target.value })} />
        </Field>
        <Field label="Max Days on Market" hint="Higher = motivated seller signal">
          <input type="number" className={inputCls} value={draft.maxDOM} onChange={(e) => update({ maxDOM: +e.target.value })} />
        </Field>

        {/* Toggles */}
        <label className="flex items-center gap-2 cursor-pointer col-span-full">
          <input
            type="checkbox"
            checked={draft.requirePositiveCashFlow}
            onChange={(e) => update({ requirePositiveCashFlow: e.target.checked })}
            className="accent-emerald-500 h-4 w-4"
          />
          <span className="text-sm text-content-secondary">Require positive cash flow</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer col-span-full">
          <input
            type="checkbox"
            checked={draft.requireStressTestPass}
            onChange={(e) => update({ requireStressTestPass: e.target.checked })}
            className="accent-emerald-500 h-4 w-4"
          />
          <span className="text-sm text-content-secondary">Require stress test pass</span>
        </label>

        {/* Priority */}
        <div className="col-span-full">
          <Field label="Ranking Priority" hint="How matched properties are sorted">
            <select
              className={`${inputCls} cursor-pointer appearance-none`}
              value={draft.prioritize}
              onChange={(e) => update({ prioritize: e.target.value as typeof draft.prioritize })}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
        <button onClick={handleReset} className="btn-ghost flex items-center gap-1.5 text-xs text-content-tertiary hover:text-content-secondary">
          <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
        </button>
        <button onClick={handleSave} className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm">
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}
