"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Scenario {
  name: string;
  change: string;
  monthlyCashFlow: number;
  dscr: number;
  status: "pass" | "warning" | "fail";
}

interface StressTestPanelProps {
  baseMonthlyRent: number;
  baseMortgage: number;
  baseExpenses: number;
  interestRate: number;
  purchasePrice: number;
  downPaymentPct: number;
}

function calculateMortgage(principal: number, rate: number, years: number): number {
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

export default function StressTestPanel({
  baseMonthlyRent,
  baseMortgage,
  baseExpenses,
  interestRate,
  purchasePrice,
  downPaymentPct,
}: StressTestPanelProps) {
  const loanAmount = purchasePrice * (1 - downPaymentPct / 100);
  const baseCashFlow = baseMonthlyRent - baseMortgage - baseExpenses;
  const baseDscr = baseMortgage > 0 ? (baseMonthlyRent - baseExpenses) / baseMortgage : 0;

  const scenarios: Scenario[] = [
    // Rate +1%
    (() => {
      const newMortgage = calculateMortgage(loanAmount, interestRate + 1, 30);
      const cf = baseMonthlyRent - newMortgage - baseExpenses;
      const dscr = newMortgage > 0 ? (baseMonthlyRent - baseExpenses) / newMortgage : 0;
      return {
        name: "Rate +1%",
        change: `${interestRate.toFixed(1)}% → ${(interestRate + 1).toFixed(1)}%`,
        monthlyCashFlow: Math.round(cf),
        dscr: Math.round(dscr * 100) / 100,
        status: cf > 0 ? "pass" as const : cf > -200 ? "warning" as const : "fail" as const,
      };
    })(),
    // Vacancy +5%
    (() => {
      const effectiveRent = baseMonthlyRent * 0.95;
      const cf = effectiveRent - baseMortgage - baseExpenses;
      const dscr = baseMortgage > 0 ? (effectiveRent - baseExpenses) / baseMortgage : 0;
      return {
        name: "Vacancy +5%",
        change: "Effective rent reduced 5%",
        monthlyCashFlow: Math.round(cf),
        dscr: Math.round(dscr * 100) / 100,
        status: cf > 0 ? "pass" as const : cf > -200 ? "warning" as const : "fail" as const,
      };
    })(),
    // Rent -10%
    (() => {
      const newRent = baseMonthlyRent * 0.9;
      const cf = newRent - baseMortgage - baseExpenses;
      const dscr = baseMortgage > 0 ? (newRent - baseExpenses) / baseMortgage : 0;
      return {
        name: "Rent -10%",
        change: `$${baseMonthlyRent.toLocaleString()} → $${Math.round(newRent).toLocaleString()}`,
        monthlyCashFlow: Math.round(cf),
        dscr: Math.round(dscr * 100) / 100,
        status: cf > 0 ? "pass" as const : cf > -200 ? "warning" as const : "fail" as const,
      };
    })(),
    // Rate +2% AND Vacancy +10%
    (() => {
      const newMortgage = calculateMortgage(loanAmount, interestRate + 2, 30);
      const effectiveRent = baseMonthlyRent * 0.9;
      const cf = effectiveRent - newMortgage - baseExpenses;
      const dscr = newMortgage > 0 ? (effectiveRent - baseExpenses) / newMortgage : 0;
      return {
        name: "Severe Stress",
        change: "Rate +2% & Vacancy +10%",
        monthlyCashFlow: Math.round(cf),
        dscr: Math.round(dscr * 100) / 100,
        status: cf > 0 ? "pass" as const : cf > -200 ? "warning" as const : "fail" as const,
      };
    })(),
  ];

  const statusIcon = {
    pass: <CheckCircle className="h-4 w-4 text-money-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-gold-400" />,
    fail: <XCircle className="h-4 w-4 text-red-400" />,
  };

  const statusBg = {
    pass: "border-money-800/30",
    warning: "border-gold-800/30",
    fail: "border-red-800/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300">Stress Test Scenarios</h4>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Base Cash Flow:</span>
          <span className={`font-mono font-medium ${baseCashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
            ${baseCashFlow.toLocaleString()}/mo
          </span>
          <span className="mx-1">|</span>
          <span>DSCR:</span>
          <span className="font-mono font-medium text-gray-300">{baseDscr.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map((s) => (
          <div
            key={s.name}
            className={`p-4 bg-surface-elevated rounded-lg border ${statusBg[s.status]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {statusIcon[s.status]}
                <span className="text-sm font-medium text-gray-200">{s.name}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">{s.change}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Cash Flow</p>
                <p className={`text-sm font-mono font-medium ${s.monthlyCashFlow >= 0 ? "text-money-400" : "text-red-400"}`}>
                  {s.monthlyCashFlow >= 0 ? "+" : ""}${s.monthlyCashFlow.toLocaleString()}/mo
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">DSCR</p>
                <p className={`text-sm font-mono font-medium ${s.dscr >= 1.25 ? "text-money-400" : s.dscr >= 1.0 ? "text-gold-400" : "text-red-400"}`}>
                  {s.dscr.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
