"use client";

import { Receipt, TrendingDown, AlertTriangle, RefreshCw, ArrowRightLeft, Info } from "lucide-react";
import { Term } from "@/components/shared/Term";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAX_BRACKETS = [
  { pct: 22, label: "22% bracket" },
  { pct: 24, label: "24% bracket" },
  { pct: 32, label: "32% bracket" },
] as const;

// IRS: residential rental property depreciated over 27.5 years on building value
// Building value is typically 80% of purchase price (land is not depreciable)
function calcDepreciation(purchasePrice: number) {
  const buildingValue    = purchasePrice * 0.80;
  const annualDeprec     = buildingValue / 27.5;
  return { buildingValue, annualDeprec };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaxTab({
  result,
  downPct,
  rate,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
}) {
  const { buildingValue, annualDeprec } = calcDepreciation(result.purchasePrice);
  const downPayment     = result.purchasePrice * (downPct / 100);
  const loanAmount      = result.purchasePrice - downPayment;
  const annualCF        = result.monthlyCashFlow * 12;

  // After-tax cash flow: depreciation is a paper loss that offsets taxable income
  const taxableIncome   = annualCF - annualDeprec;         // often negative (tax shelter)
  const afterTaxCF_22   = annualCF - Math.max(0, taxableIncome) * 0.22;
  const afterTaxCF_24   = annualCF - Math.max(0, taxableIncome) * 0.24;
  const afterTaxCF_32   = annualCF - Math.max(0, taxableIncome) * 0.32;

  // Savings per bracket when depreciation creates a loss shelter
  const taxSavings      = (bracket: number) => Math.round(Math.min(annualDeprec, Math.abs(taxableIncome) + annualDeprec) * bracket / 100);

  // Cost segregation: typically captures 15-20% of building value in Year 1
  const costSegYear1    = Math.round(buildingValue * 0.18);
  const costSegCost     = 6500; // typical study cost
  const costSegBreakEven = costSegCost / (taxSavings(24) * 0.18 / annualDeprec) / 12; // months

  // 1031 deferred tax estimate: assume 20% cap gains rate on appreciation
  const yearsHeld       = 5;
  const appreciatedValue = result.purchasePrice * Math.pow(1.04, yearsHeld);
  const capitalGain     = appreciatedValue - result.purchasePrice;
  const deferredTax     = Math.round(capitalGain * 0.20);
  const accumulatedDeprec = Math.round(annualDeprec * yearsHeld);

  // Depreciation recapture: 25% rate on total depreciation claimed
  const recaptureOwed   = Math.round(accumulatedDeprec * 0.25);

  const afterTaxCFMap: Record<number, number> = {
    22: afterTaxCF_22,
    24: afterTaxCF_24,
    32: afterTaxCF_32,
  };

  return (
    <div className="space-y-4">

      {/* Annual Depreciation Benefit */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <TrendingDown className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Annual Depreciation Benefit
          <span className="text-[10px] text-content-disabled ml-auto">IRS Publication 946</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div className="card-glass !p-3">
            <p className="metric-label mb-1">Building Value</p>
            <p className="font-mono text-base font-bold tabular-nums text-content-primary">
              {formatCurrency(Math.round(buildingValue))}
            </p>
            <p className="text-[10px] text-content-disabled">80% of purchase price</p>
          </div>
          <div className="card-glass !p-3">
            <p className="metric-label mb-1">Annual Depreciation</p>
            <p className="font-mono text-base font-bold tabular-nums text-emerald-light">
              {formatCurrency(Math.round(annualDeprec))}
            </p>
            <p className="text-[10px] text-content-disabled">÷ 27.5 years</p>
          </div>
          <div className="card-glass !p-3">
            <p className="metric-label mb-1">Monthly Benefit</p>
            <p className="font-mono text-base font-bold tabular-nums text-emerald-light">
              {formatCurrency(Math.round(annualDeprec / 12))}
            </p>
            <p className="text-[10px] text-content-disabled">paper deduction / mo</p>
          </div>
        </div>
        <p className="text-[12px] text-content-secondary leading-relaxed">
          Depreciation is a{" "}
          <span className="text-emerald-light font-semibold">paper loss</span>{" "}
          — the IRS lets you deduct{" "}
          <span className="font-mono text-content-primary tabular-nums">{formatCurrency(Math.round(annualDeprec))}/yr</span>{" "}
          even if the property went up in value. This shields your rental income from taxes.
        </p>
      </div>

      {/* Tax Bracket Impact */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <Receipt className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Depreciation Savings by Tax Bracket
        </div>
        <div className="space-y-3">
          {TAX_BRACKETS.map(({ pct, label }) => {
            const savings = taxSavings(pct);
            const barPct  = Math.min(100, (savings / (taxSavings(32) * 1.1)) * 100);
            return (
              <div key={pct}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-content-secondary">{label}</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-light">
                    +{formatCurrency(savings)}/yr saved
                  </span>
                </div>
                <div className="h-2 bg-surface-elevated rounded-full overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-emerald/50" style={{ width: `${barPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-content-tertiary mt-3">
          At the 24% bracket, this property saves you{" "}
          <span className="font-mono text-emerald-light tabular-nums">{formatCurrency(taxSavings(24))}/yr</span>{" "}
          in taxes you would otherwise owe on other income.
        </p>
      </div>

      {/* After-Tax Cash Flow comparison */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <Info className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          After-Tax Cash Flow
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="card-glass !p-3">
            <p className="metric-label mb-1">Pre-Tax</p>
            <p className={`font-mono text-base font-bold tabular-nums ${annualCF >= 0 ? "text-content-primary" : "text-rose-light"}`}>
              {annualCF >= 0 ? formatCurrency(annualCF) : `(${formatCurrency(Math.abs(annualCF))})`}
            </p>
            <p className="text-[10px] text-content-disabled">annual CF</p>
          </div>
          {TAX_BRACKETS.map(({ pct }) => {
            const atcf = afterTaxCFMap[pct] ?? 0;
            const isPos = atcf >= 0;
            return (
              <div key={pct} className="card-glass !p-3">
                <p className="metric-label mb-1">At {pct}%</p>
                <p className={`font-mono text-base font-bold tabular-nums ${isPos ? "text-emerald-light" : "text-rose-light"}`}>
                  {isPos ? formatCurrency(Math.round(atcf)) : `(${formatCurrency(Math.round(Math.abs(atcf)))})`}
                </p>
                <p className="text-[10px] text-content-disabled">after-tax</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-content-tertiary mt-3">
          Your actual return after taxes is higher than the pre-tax number suggests —{" "}
          <Term id="coc">cash-on-cash</Term> calculations should use after-tax cash flow for accuracy.
        </p>
      </div>

      {/* Cost Segregation + 1031 + Recapture row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <RefreshCw className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Cost Segregation
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-emerald-light mb-1">
            {formatCurrency(costSegYear1)}
          </p>
          <p className="text-[10px] text-content-disabled mb-2">est. Year 1 bonus deductions</p>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            An accelerated depreciation study could increase Year 1 deductions by{" "}
            <span className="text-emerald-light font-semibold">3–5x</span>.
            Cost: ~{formatCurrency(costSegCost)}.
            Break-even: <span className="font-mono text-content-primary tabular-nums">Year 1</span>.
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            1031 Exchange
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-gold mb-1">
            {formatCurrency(deferredTax)}
          </p>
          <p className="text-[10px] text-content-disabled mb-2">deferred capital gains tax (5yr est.)</p>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            If you sell after 5 years, you have{" "}
            <span className="text-content-primary font-semibold">45 days</span> to identify and{" "}
            <span className="text-content-primary font-semibold">180 days</span> to close a replacement.
            Defer{" "}
            <span className="font-mono text-gold tabular-nums">{formatCurrency(deferredTax)}</span>{" "}
            in taxes indefinitely.
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
            Recapture Warning
          </div>
          <p className="font-mono text-xl font-bold tabular-nums text-amber-light mb-1">
            {formatCurrency(recaptureOwed)}
          </p>
          <p className="text-[10px] text-content-disabled mb-2">recapture tax if sold at yr {yearsHeld}</p>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            If you sell after claiming{" "}
            <span className="font-mono text-content-primary tabular-nums">{formatCurrency(accumulatedDeprec)}</span>{" "}
            in depreciation, you&apos;ll owe{" "}
            <span className="text-amber-light font-semibold">25% recapture tax</span>{" "}
            = <span className="font-mono text-amber-light tabular-nums">{formatCurrency(recaptureOwed)}</span>.
            A 1031 exchange avoids this entirely.
          </p>
        </div>

      </div>

      {/* Disclaimer */}
      <div className="card-glass border-amber/[0.08] !py-3">
        <p className="text-[11px] text-content-tertiary leading-relaxed">
          Tax estimates are illustrative. Consult a CPA or tax attorney for advice specific to your situation.
          Depreciation benefits depend on passive activity rules, income limits, and your tax filing status.
          Rates based on 2025 IRS schedules.
        </p>
      </div>

    </div>
  );
}
