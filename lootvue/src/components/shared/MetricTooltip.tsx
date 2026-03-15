"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

/**
 * Plain-English explanations for financial metrics.
 * Every metric label in the app should wrap in this tooltip.
 */
const EXPLANATIONS: Record<string, string> = {
  "Cap Rate": "Capitalization Rate — your annual net operating income as a percentage of the property price. Higher is better for cash flow. Most investors target 5-8%.",
  "Cash Flow": "Monthly Cash Flow — what's left after collecting rent and paying ALL expenses (mortgage, taxes, insurance, repairs, vacancy, management). Positive = money in your pocket.",
  "DSCR": "Debt Service Coverage Ratio — how many times your rental income covers your debt payments. Above 1.25x means lenders consider this safe. Below 1.0x means you're losing money.",
  "Cash-on-Cash": "Cash-on-Cash Return — your annual pre-tax cash flow divided by your total cash invested. It's the return on YOUR money, not the property's total return.",
  "IRR": "Internal Rate of Return — the annualized total return including appreciation, principal paydown, and cash flow. The gold standard institutional metric. 15%+ is strong.",
  "Levered IRR": "Levered IRR — your IRR with mortgage leverage included. Higher than unleveraged because you're amplifying returns with borrowed money (but also amplifying risk).",
  "GRM": "Gross Rent Multiplier — property price divided by annual gross rent. Lower GRM = better deal. Under 12 is generally attractive for investment.",
  "NOI": "Net Operating Income — annual rental income minus operating expenses (no mortgage). This is the property's earning power before financing.",
  "P(Return+)": "Probability of Positive Return — estimated likelihood this investment generates positive total returns based on stress testing and scenario analysis.",
  "Stress Resilience": "How well this deal survives adverse scenarios (rate hikes, vacancy spikes, rent drops, insurance increases). Fortress = survives everything. Paper Thin = fails most tests.",
  "HyperScore": "Composite score (0-100) combining 8 analysis dimensions: financial fundamentals, comparable sales, demographics, economics, infrastructure, quality of life, supply-demand, and macro risk.",
  "Deal Score": "Overall investment score (0-100) combining HyperScore, confluence probability, stress resilience, Monte Carlo simulation, and comp relative value.",
  "Walk Score": "Walk Score (0-100) — how walkable the neighborhood is. 90+ is a Walker's Paradise. 70-89 is Very Walkable. Below 50 is Car-Dependent.",
  "School Rating": "GreatSchools rating (1-10) — composite of test scores, equity, and college readiness. Higher ratings correlate with stronger property values and tenant demand.",
  "Yield Curve": "The difference between long-term and short-term interest rates. Normal (positive) = healthy economy. Inverted (negative) = recession warning signal.",
  "Spread": "The gap between the 30-year mortgage rate and the Federal Funds rate. Wide spreads mean banks are charging extra — rates could fall even without Fed cuts.",
  "Portfolio Fit": "How well this deal matches institutional investment criteria (leverage ratio, rent coverage, value-add spread, yield-on-cost). HIGH = passes most rules.",
};

interface Props {
  label: string;
  children?: React.ReactNode;
  className?: string;
}

export function MetricTooltip({ label, children, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const explanation = EXPLANATIONS[label];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!explanation) {
    return <span className={className}>{children ?? label}</span>;
  }

  return (
    <span ref={ref} className={`relative inline-flex items-center gap-1 ${className}`}>
      {children ?? label}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-content-disabled hover:text-gold-light transition-colors"
        aria-label={`Explain ${label}`}
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-surface-elevated border border-surface-border shadow-lg animate-fade-in">
          <p className="text-[11px] text-content-secondary leading-relaxed">{explanation}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-elevated border-r border-b border-surface-border rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}
