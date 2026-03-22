"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Plus, Scale, Trophy, ChevronDown } from "lucide-react";
import Badge from "@/components/ui/Badge";
import DecisionRule from "@/components/ui/DecisionRule";
import { generateNearbyProperties } from "@/lib/mock/nearby-properties";
import { formatCurrency } from "@/lib/utils/format";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

type Property = ReturnType<typeof generateNearbyProperties>[number];
type MetricDef = { label: string; key: string; format: (p: Property) => string; best: (vals: Property[]) => string };

const MAX_SLOTS = 4;

function signalBadge(signal: string) {
  if (signal === "strong_buy") return <Badge variant="success" size="sm">Strong Buy</Badge>;
  if (signal === "buy") return <Badge variant="success" size="sm">Buy</Badge>;
  if (signal === "hold") return <Badge variant="warning" size="sm">Hold</Badge>;
  return <Badge variant="danger" size="sm">Pass</Badge>;
}

function scoreBorder(score: number) {
  if (score >= 75) return "border-t-money-500";
  if (score >= 60) return "border-t-gold-500";
  return "border-t-red-500";
}

function bestByMax(key: keyof Property) {
  return (vals: Property[]) => vals.reduce((a, b) => ((a[key] as number) >= (b[key] as number) ? a : b)).id;
}
function bestByMin(key: keyof Property) {
  return (vals: Property[]) => vals.reduce((a, b) => ((a[key] as number) <= (b[key] as number) ? a : b)).id;
}

function discount(p: Property) {
  return ((1 - p.price / p.estimatedValue) * 100).toFixed(1);
}

/** Metrics that get an inline decision rule when expanded. */
const DECISION_RULE_KEYS = new Set(["capRate", "monthlyCashFlow", "discount"]);

const pct = (v: number) => `${v.toFixed(1)}%`;
const usd = (v: number) => `$${Math.round(v).toLocaleString()}`;

/** Build a compact DecisionRule props object for a comparison metric row. */
function buildComparisonRule(key: string, props: Property[]) {
  if (key === "capRate") {
    const comparisons = props.map((p) => ({
      label: p.address,
      yourValue: p.capRate,
      benchmark: 6,
      benchmarkLabel: "6% Threshold",
      higherIsBetter: true,
      format: pct,
    }));
    const avg = props.reduce((s, p) => s + p.capRate, 0) / props.length;
    return {
      metric: "Cap Rate Comparison",
      value: avg,
      format: pct,
      comparisons,
      rule: "Cap Rate > 6% = Strong investor yield",
      action: comparisons.every((c) => c.yourValue >= 6)
        ? "All properties exceed threshold — compare on other factors"
        : "Properties below 6% need price negotiation or higher rents",
    };
  }
  if (key === "monthlyCashFlow") {
    const comparisons = props.map((p) => ({
      label: p.address,
      yourValue: p.monthlyCashFlow,
      benchmark: 300,
      benchmarkLabel: "$300 Good",
      higherIsBetter: true,
      format: usd,
    }));
    const avg = props.reduce((s, p) => s + p.monthlyCashFlow, 0) / props.length;
    return {
      metric: "Cash Flow Comparison",
      value: avg,
      format: usd,
      comparisons,
      rule: "Cash flow > $300/mo = Comfortable margin for repairs & vacancy",
      action: comparisons.every((c) => c.yourValue >= 300)
        ? "Both properties cash-flow well — weight other factors"
        : "Low cash-flow properties need rent increases or lower acquisition cost",
    };
  }
  // discount (Price vs Value)
  const comparisons = props.map((p) => {
    const d = (1 - p.price / p.estimatedValue) * 100;
    return {
      label: p.address,
      yourValue: d,
      benchmark: 5,
      benchmarkLabel: "5% Margin",
      higherIsBetter: true,
      format: pct,
    };
  });
  const avgDiscount = props.reduce((s, p) => s + (1 - p.price / p.estimatedValue) * 100, 0) / props.length;
  return {
    metric: "Price vs Value Comparison",
    value: avgDiscount,
    format: pct,
    comparisons,
    rule: "Discount > 5% = Instant equity on close",
    action: comparisons.every((c) => c.yourValue >= 5)
      ? "All properties priced below value — strong entry points"
      : "Properties above value may need aggressive negotiation",
  };
}

const metrics: MetricDef[] = [
  { label: "Price", key: "price", format: (p) => formatCurrency(p.price), best: bestByMin("price") },
  { label: "HyperScore", key: "hyperScore", format: (p) => String(p.hyperScore), best: bestByMax("hyperScore") },
  { label: "Cap Rate", key: "capRate", format: (p) => `${p.capRate}%`, best: bestByMax("capRate") },
  { label: "Monthly Cash Flow", key: "monthlyCashFlow", format: (p) => formatCurrency(p.monthlyCashFlow), best: bestByMax("monthlyCashFlow") },
  { label: "Appreciation (1yr)", key: "appreciation", format: (p) => `${p.predictedAppreciation1yr >= 0 ? "+" : ""}${p.predictedAppreciation1yr}%`, best: bestByMax("predictedAppreciation1yr") },
  { label: "Days on Market", key: "dom", format: (p) => `${p.daysOnMarket}d`, best: bestByMin("daysOnMarket") },
  { label: "Estimated Value", key: "estimatedValue", format: (p) => formatCurrency(p.estimatedValue), best: bestByMax("estimatedValue") },
  { label: "Price vs Value", key: "discount", format: (p) => `${discount(p)}%`, best: (vals) => vals.reduce((a, b) => (parseFloat(discount(a)) >= parseFloat(discount(b)) ? a : b)).id },
  { label: "Bed / Bath / Sqft", key: "size", format: (p) => `${p.bedrooms}bd / ${p.bathrooms}ba / ${p.sqft.toLocaleString()}sf`, best: bestByMax("sqft") },
  { label: "Signal", key: "signal", format: () => "", best: bestByMax("hyperScore") },
];

export default function ComparePage() {
  const allProperties = useMemo(() => generateNearbyProperties(30.27, -97.74, 10, 20), []);
  const [selected, setSelected] = useState<string[]>([]);
  const [dropdownSlot, setDropdownSlot] = useState<number | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const { capture } = useEventCapture();

  // Capture page view on mount
  useEffect(() => {
    capture("session.page_viewed", { pageName: "compare" });
  }, [capture]);

  const selectedProps = selected.map((id) => allProperties.find((p) => p.id === id)!).filter(Boolean);
  const available = allProperties.filter((p) => !selected.includes(p.id));

  function addProperty(id: string) {
    const prop = allProperties.find((p) => p.id === id);
    setSelected((s) => [...s, id]);
    setDropdownSlot(null);
    if (prop) {
      capture("property.compared", { address: prop.address, zip: prop.address.match(/\d{5}/)?.[0] ?? "" });
    }
  }
  function removeProperty(id: string) {
    setSelected((s) => s.filter((x) => x !== id));
    setDropdownSlot(null);
  }
  function toggleRule(key: string) {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-money-900/50 border border-money-700/50 flex items-center justify-center">
          <Scale className="h-5 w-5 text-money-400" />
        </div>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-100">&#x7389;&#x77F3; Jade Test &mdash; Compare Deals</h1>
          <p className="text-xs text-gray-500">Lay the deals side by side. Let the forces reveal which is jade and which is stone.</p>
        </div>
      </div>

      {/* Comparison table — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[640px] border-separate border-spacing-0">
          {/* Property columns header */}
          <thead>
            <tr>
              <th className="w-[140px] md:w-[170px]" />
              {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                const prop = selectedProps[i];
                return (
                  <th key={i} className="p-0 align-top">
                    {prop ? (
                      <div className={`bg-surface-card border border-surface-border border-t-2 ${scoreBorder(prop.hyperScore)} rounded-xl p-3 mx-1 mb-2 relative`}>
                        <button onClick={() => removeProperty(prop.id)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <p className="text-sm font-medium text-gray-200 truncate pr-5">{prop.address}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{prop.propertyType} &middot; {prop.yearBuilt}</p>
                      </div>
                    ) : (
                      <div className="relative mx-1 mb-2">
                        <button
                          onClick={() => setDropdownSlot(dropdownSlot === i ? null : i)}
                          className="w-full border-2 border-dashed border-surface-border rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-money-700/50 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600">Add Property</span>
                        </button>
                        {dropdownSlot === i && available.length > 0 && (
                          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-surface-elevated border border-surface-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {available.map((p) => (
                              <button key={p.id} onClick={() => addProperty(p.id)} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-muted truncate transition-colors">
                                {p.address} &middot; {formatCurrency(p.price)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Metric rows */}
          <tbody>
            {metrics.map((m) => {
              const winnerId = selectedProps.length >= 2 ? m.best(selectedProps) : null;
              const hasRule = DECISION_RULE_KEYS.has(m.key) && selectedProps.length >= 2;
              const isRuleOpen = expandedRules.has(m.key);
              return (
                <React.Fragment key={m.key}>
                  <tr className="group">
                    <td className="py-2 pr-3 text-xs text-gray-500 font-medium align-middle">
                      <span className="flex items-center gap-1">
                        {m.label}
                        {hasRule && (
                          <button onClick={() => toggleRule(m.key)} className="text-gray-600 hover:text-money-400 transition-colors" title="Decision rule">
                            <ChevronDown className={`h-3 w-3 transition-transform ${isRuleOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </span>
                    </td>
                    {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                      const prop = selectedProps[i];
                      if (!prop) return <td key={i} />;
                      const isWinner = winnerId === prop.id;
                      return (
                        <td key={i} className="py-2 px-1 align-middle">
                          <div className={`flex items-center gap-1.5 ${isWinner ? "" : "opacity-60"}`}>
                            {m.key === "signal" ? (
                              signalBadge(prop.signal)
                            ) : (
                              <span className="text-sm font-mono text-gray-200">{m.format(prop)}</span>
                            )}
                            {isWinner && selectedProps.length >= 2 && (
                              <Trophy className="h-3 w-3 text-money-400 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {hasRule && isRuleOpen && (
                    <tr>
                      <td colSpan={MAX_SLOTS + 1} className="py-1 px-1">
                        <DecisionRule {...buildComparisonRule(m.key, selectedProps)} compact />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {selected.length === 0 && (
        <div className="text-center py-10 text-gray-600 text-sm">
          Select properties above to start comparing deals.
        </div>
      )}
    </div>
  );
}
