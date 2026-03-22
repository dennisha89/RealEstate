"use client";

import { DollarSign, TrendingUp, Building2, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface PortfolioSummaryProps {
  totalValue: number;
  totalEquity: number;
  totalCashFlow: number;
  propertyCount: number;
  avgCapRate: number;
  totalAppreciation: number;
}

export default function PortfolioSummary({
  totalValue,
  totalEquity,
  totalCashFlow,
  propertyCount,
  avgCapRate,
  totalAppreciation,
}: PortfolioSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-surface-elevated rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-money-500" />
          <span className="text-xs text-gray-500 uppercase">Total Value</span>
        </div>
        <p className="text-xl font-bold text-money-400 font-mono">
          {formatCurrency(totalValue)}
        </p>
      </div>

      <div className="bg-surface-elevated rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-gold-500" />
          <span className="text-xs text-gray-500 uppercase">Total Equity</span>
        </div>
        <p className="text-xl font-bold text-gold-400 font-mono">
          {formatCurrency(totalEquity)}
        </p>
      </div>

      <div className="bg-surface-elevated rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-gray-500 uppercase">Monthly Cash Flow</span>
        </div>
        <p className={`text-xl font-bold font-mono ${totalCashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
          {totalCashFlow >= 0 ? "+" : ""}{formatCurrency(totalCashFlow)}
        </p>
      </div>

      <div className="bg-surface-elevated rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500 uppercase">Properties</span>
        </div>
        <p className="text-xl font-bold text-gray-200 font-mono">
          {propertyCount}
        </p>
      </div>

      <div className="bg-surface-elevated rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Percent className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-gray-500 uppercase">Avg Cap Rate</span>
        </div>
        <p className="text-xl font-bold text-blue-400 font-mono">
          {avgCapRate.toFixed(1)}%
        </p>
      </div>

      <div className="bg-surface-elevated rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-money-500" />
          <span className="text-xs text-gray-500 uppercase">Appreciation</span>
        </div>
        <p className={`text-xl font-bold font-mono ${totalAppreciation >= 0 ? "text-money-400" : "text-red-400"}`}>
          {totalAppreciation >= 0 ? "+" : ""}{totalAppreciation.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
