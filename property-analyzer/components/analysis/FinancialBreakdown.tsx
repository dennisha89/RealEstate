"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import Card from "@/components/ui/Card";
import CashFlowChart from "@/components/charts/CashFlowChart";
import { formatCurrency } from "@/lib/utils/format";

interface FinancialBreakdownProps {
  monthlyIncome: number;
  monthlyMortgage: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  purchasePrice: number;
  downPayment: number;
}

export default function FinancialBreakdown({
  monthlyIncome,
  monthlyMortgage,
  monthlyExpenses,
  monthlyCashFlow,
  capRate,
  cashOnCash,
  dscr,
  purchasePrice,
  downPayment,
}: FinancialBreakdownProps) {
  const isPositive = monthlyCashFlow >= 0;

  const cashFlowData = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ].map((month) => ({
    month,
    income: monthlyIncome,
    mortgage: monthlyMortgage,
    expenses: monthlyExpenses - monthlyMortgage,
    cashFlow: monthlyCashFlow,
  }));

  return (
    <div className="space-y-6">
      {/* P&L Breakdown */}
      <Card header="Monthly P&L">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-400">Rental Income</span>
            <span className="text-sm font-mono font-semibold text-money-400">
              +{formatCurrency(monthlyIncome)}
            </span>
          </div>
          <div className="border-t border-surface-border" />
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-400">Mortgage (P&I)</span>
            <span className="text-sm font-mono font-semibold text-red-400">
              -{formatCurrency(monthlyMortgage)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-400">Operating Expenses</span>
            <span className="text-sm font-mono font-semibold text-red-400">
              -{formatCurrency(monthlyExpenses - monthlyMortgage)}
            </span>
          </div>
          <div className="border-t border-surface-border" />
          <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-surface-elevated">
            <span className="text-sm font-semibold text-gray-200">
              Net Cash Flow
            </span>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-money-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
              <span
                className={`text-lg font-mono font-bold ${
                  isPositive ? "text-money-400" : "text-red-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(monthlyCashFlow)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cap Rate</p>
          <p className="text-2xl font-bold text-money-400 font-mono">{capRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 mt-1">NOI / Property Value</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cash-on-Cash</p>
          <p className="text-2xl font-bold text-gold-400 font-mono">{cashOnCash.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 mt-1">Annual CF / Cash Invested</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">DSCR</p>
          <p className={`text-2xl font-bold font-mono ${dscr >= 1.25 ? "text-money-400" : dscr >= 1.0 ? "text-gold-400" : "text-red-400"}`}>
            {dscr.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600 mt-1">NOI / Debt Service</p>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card header="12-Month Cash Flow Projection">
        <CashFlowChart data={cashFlowData} />
      </Card>
    </div>
  );
}
