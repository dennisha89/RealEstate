"use client";

import { useMemo } from "react";
import { TrendingUp, Landmark, Banknote, AlertTriangle, Lightbulb } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface WealthAttributionProps {
  properties: Array<{
    id: string;
    address: string;
    city: string;
    state: string;
    purchasePrice: number;
    currentValue: number;
    monthlyRent: number;
    monthlyExpenses: number;
    mortgage: number;
    equity: number;
    appreciation: number;
  }>;
}

export default function WealthAttribution({ properties }: WealthAttributionProps) {
  const analysis = useMemo(() => {
    let totalAppreciation = 0;
    let totalDebtPaydown = 0;
    let totalCashFlow = 0;

    const perProperty = properties.map((p) => {
      const monthlyAppreciation = p.currentValue * (p.appreciation / 100) / 12;
      const monthlyDebtPaydown = p.mortgage * 0.25;
      const monthlyCashFlow = p.monthlyRent - p.monthlyExpenses - p.mortgage;

      totalAppreciation += monthlyAppreciation;
      totalDebtPaydown += monthlyDebtPaydown;
      totalCashFlow += monthlyCashFlow;

      return { ...p, monthlyAppreciation, monthlyDebtPaydown, monthlyCashFlow };
    });

    const totalGrowth = totalAppreciation + totalDebtPaydown + totalCashFlow;

    // Concentration check
    const stateCounts: Record<string, number> = {};
    for (const p of properties) {
      stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
    }
    const concentratedState = Object.entries(stateCounts).find(
      ([, count]) => properties.length > 1 && count / properties.length > 0.6
    );

    // Tax optimization: find properties with losses that could offset gains
    const losers = perProperty.filter((p) => p.monthlyCashFlow < 0);
    const winners = perProperty.filter((p) => p.monthlyCashFlow > 0);
    const taxHint =
      losers.length > 0 && winners.length > 0
        ? `${losers[0].address} has a monthly loss of ${formatCurrency(Math.abs(losers[0].monthlyCashFlow))} that could offset gains from ${winners[0].address}.`
        : null;

    return {
      perProperty,
      totalAppreciation,
      totalDebtPaydown,
      totalCashFlow,
      totalGrowth,
      concentratedState,
      taxHint,
    };
  }, [properties]);

  const total = Math.abs(analysis.totalAppreciation) + Math.abs(analysis.totalDebtPaydown) + Math.abs(analysis.totalCashFlow);
  const pctAppreciation = total > 0 ? (Math.abs(analysis.totalAppreciation) / total) * 100 : 0;
  const pctDebt = total > 0 ? (Math.abs(analysis.totalDebtPaydown) / total) * 100 : 0;
  const pctCashFlow = total > 0 ? (Math.abs(analysis.totalCashFlow) / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card-premium p-8">
        <p className="stat-label mb-2">Monthly Wealth Growth</p>
        <p className={`text-4xl font-bold font-mono tracking-tight ${analysis.totalGrowth >= 0 ? "text-money-400" : "text-red-400"}`}>
          {analysis.totalGrowth >= 0 ? "+" : ""}{formatCurrency(Math.round(analysis.totalGrowth))}
        </p>
        <p className="text-sm text-content-secondary mt-1">Your net worth grew this amount this month</p>

        {/* Source breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-content-tertiary">Appreciation</p>
              <p className="text-sm font-mono font-semibold text-emerald-400">
                {formatCurrency(Math.round(analysis.totalAppreciation))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-xs text-content-tertiary">Debt Paydown</p>
              <p className="text-sm font-mono font-semibold text-blue-400">
                {formatCurrency(Math.round(analysis.totalDebtPaydown))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-money-400 shrink-0" />
            <div>
              <p className="text-xs text-content-tertiary">Cash Flow</p>
              <p className={`text-sm font-mono font-semibold ${analysis.totalCashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
                {analysis.totalCashFlow >= 0 ? "+" : ""}{formatCurrency(Math.round(analysis.totalCashFlow))}
              </p>
            </div>
          </div>
        </div>

        {/* Proportion bar */}
        <div className="mt-4 h-2 w-full rounded-full overflow-hidden flex bg-surface-elevated">
          <div className="bg-emerald-400 h-full" style={{ width: `${pctAppreciation}%` }} />
          <div className="bg-blue-400 h-full" style={{ width: `${pctDebt}%` }} />
          <div className={`h-full ${analysis.totalCashFlow >= 0 ? "bg-money-400" : "bg-red-400"}`} style={{ width: `${pctCashFlow}%` }} />
        </div>
      </div>

      {/* Warnings & Hints */}
      {(analysis.concentratedState || analysis.taxHint) && (
        <div className="space-y-3">
          {analysis.concentratedState && (
            <div className="flex items-start gap-3 p-4 rounded-[10px] bg-gold-900/10 border border-gold-500/20">
              <AlertTriangle className="h-4 w-4 text-gold-400 mt-0.5 shrink-0" />
              <p className="text-sm text-gold-300">
                <span className="font-medium">Concentration risk:</span>{" "}
                {Math.round((analysis.concentratedState[1] / properties.length) * 100)}% of your properties are in {analysis.concentratedState[0]}. Consider diversifying geographically.
              </p>
            </div>
          )}
          {analysis.taxHint && (
            <div className="flex items-start gap-3 p-4 rounded-[10px] bg-blue-500/5 border border-blue-500/20">
              <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">
                <span className="font-medium">Tax optimization:</span> {analysis.taxHint}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Per-property P&L table */}
      <div className="data-table">
        <table className="w-full">
          <thead>
            <tr>
              <th className="data-table-header">Property</th>
              <th className="data-table-header text-right">Appreciation</th>
              <th className="data-table-header text-right">Debt Paydown</th>
              <th className="data-table-header text-right">Cash Flow</th>
              <th className="data-table-header text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {analysis.perProperty.map((p) => {
              const rowTotal = p.monthlyAppreciation + p.monthlyDebtPaydown + p.monthlyCashFlow;
              return (
                <tr key={p.id}>
                  <td className="data-table-row">
                    <p className="text-sm text-content-primary font-medium">{p.address}</p>
                    <p className="text-xs text-content-tertiary">{p.city}, {p.state}</p>
                  </td>
                  <td className="data-table-row text-right font-mono text-sm text-emerald-400">
                    {formatCurrency(Math.round(p.monthlyAppreciation))}
                  </td>
                  <td className="data-table-row text-right font-mono text-sm text-blue-400">
                    {formatCurrency(Math.round(p.monthlyDebtPaydown))}
                  </td>
                  <td className={`data-table-row text-right font-mono text-sm ${p.monthlyCashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
                    {p.monthlyCashFlow >= 0 ? "+" : ""}{formatCurrency(Math.round(p.monthlyCashFlow))}
                  </td>
                  <td className={`data-table-row text-right font-mono text-sm font-semibold ${rowTotal >= 0 ? "text-content-primary" : "text-red-400"}`}>
                    {rowTotal >= 0 ? "+" : ""}{formatCurrency(Math.round(rowTotal))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
