"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw, AlertTriangle, Download, BookmarkPlus, ChevronDown,
  FlaskConical, TrendingUp, TrendingDown, CheckCircle, XCircle,
  Lightbulb, Shield, Target,
} from "lucide-react";
import { useSimulatorStore, type SimulatorInputs } from "@/lib/stores/simulator-store";
import { runDCF } from "@/lib/engines/dcf-engine";
import {
  runMonteCarlo,
  createDefaultMonteCarloConfig,
  type MonteCarloResult,
} from "@/lib/engines/monte-carlo-engine";
import {
  SimulatorInputPanel,
  SimulatorResultsPanel,
  ScenarioComparisonStrip,
  InvestmentReport,
  buildDCFInput,
} from "./_components";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { Term } from "@/components/shared/Term";
import {
  AmortizationTable,
  LoanComparison,
  DownPaymentScenarios,
  PointsAnalysis,
  RefinanceAnalysis,
  ClosingCostBreakdown,
  AffordabilityCalculator,
  PMICalculator,
} from "./_mortgage-calculator";
import {
  EquityPositionChart,
  CashOnCashTimeline,
  AfterTaxReturns,
  LeverageImpactAnalysis,
  InsuranceShockScenario,
  CashReserveAnalysis,
  DealComparisonPanel,
  TurnoverCostProjection,
} from "./_advanced-analysis";
import { formatCurrency, formatCompact } from "@/lib/utils/format";

// ─── Sensitivity Insight ─────────────────────────────────────────────────────

function computeSensitivityInsight(store: SimulatorInputs): string {
  const base = buildDCFInput(store);
  function irrDelta(patch: Partial<typeof base>): number {
    try {
      const r = runDCF({ ...base, ...patch });
      const b = runDCF(base);
      return Math.abs(r.leveredIRR - b.leveredIRR);
    } catch {
      return 0;
    }
  }

  const candidates: Array<[string, number]> = [
    ["exit cap rate",  irrDelta({ exitCapRate: base.exitCapRate + 0.5 })],
    ["interest rate",  irrDelta({ interestRate: base.interestRate + 0.5 })],
    ["vacancy rate",   irrDelta({ vacancyPct: (base.vacancyPct ?? 5) + 3 })],
    ["rent growth",    irrDelta({ annualRentGrowthPct: base.annualRentGrowthPct - 1 })],
    ["purchase price", irrDelta({ purchasePrice: base.purchasePrice * 1.05, loanAmount: base.purchasePrice * 1.05 * (1 - store.downPaymentPct / 100) })],
  ];

  candidates.sort((a, b) => b[1] - a[1]);
  const top = candidates[0];
  if (!top || top[1] < 0.1) return "Your return profile is well-balanced across key variables.";

  const second = candidates[1];
  const swingStr = top[1].toFixed(1);
  const secondStr = second ? ` A 100bps shift in ${second[0]} moves IRR by ${second[1].toFixed(1)}pp.` : "";
  return `Your most sensitive variable is the ${top[0]}. A 50bps change swings IRR by ${swingStr}pp.${secondStr} Lock in your assumptions carefully before committing capital.`;
}

// ─── Save Scenario ─────────────────────────────────────────────────────────────

function useSaveScenario() {
  const store = useSimulatorStore();
  const [saved, setSaved] = useState(false);

  const save = useCallback(() => {
    try {
      const scenarios = JSON.parse(localStorage.getItem("lv_simulator_scenarios") ?? "[]");
      scenarios.unshift({
        savedAt: new Date().toISOString(),
        name: `Scenario ${scenarios.length + 1}`,
        inputs: {
          purchasePrice: store.purchasePrice,
          downPaymentPct: store.downPaymentPct,
          interestRate: store.interestRate,
          monthlyRent: store.monthlyRent,
          vacancyPct: store.vacancyPct,
          holdPeriodYears: store.holdPeriodYears,
          exitCapRate: store.exitCapRate,
          annualAppreciationPct: store.annualAppreciationPct,
          annualRentGrowthPct: store.annualRentGrowthPct,
        },
      });
      localStorage.setItem("lv_simulator_scenarios", JSON.stringify(scenarios.slice(0, 10)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // localStorage unavailable
    }
  }, [store]);

  return { save, saved };
}

// ─── Mobile Input Accordion ──────────────────────────────────────────────────

function MobileInputAccordion({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-input-panel"
        className="w-full flex items-center justify-between px-4 py-3 card text-sm font-medium text-content-primary"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-gold" aria-hidden="true" />
          Adjust Assumptions
        </span>
        <ChevronDown
          className={`w-4 h-4 text-content-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id="mobile-input-panel"
          className="mt-2 card animate-fade-in overflow-hidden"
          aria-label="Simulator input assumptions"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Verdict configuration ────────────────────────────────────────────────────

type VerdictKind = "BUY" | "DIG_DEEPER" | "PASS";

function getVerdict(irr: number): VerdictKind {
  if (irr >= 12) return "BUY";
  if (irr >= 6) return "DIG_DEEPER";
  return "PASS";
}

const VERDICT_CONFIG: Record<VerdictKind, {
  label: string;
  bg: string;
  border: string;
  badge: string;
  textClass: string;
  icon: React.ReactNode;
}> = {
  BUY: {
    label: "BUY",
    bg: "bg-emerald/5",
    border: "border-emerald/20",
    badge: "badge-emerald",
    textClass: "text-emerald",
    icon: <TrendingUp className="w-4 h-4" aria-hidden="true" />,
  },
  DIG_DEEPER: {
    label: "DIG DEEPER",
    bg: "bg-gold/5",
    border: "border-gold/20",
    badge: "badge-gold",
    textClass: "text-gold",
    icon: <Target className="w-4 h-4" aria-hidden="true" />,
  },
  PASS: {
    label: "PASS",
    bg: "bg-rose/5",
    border: "border-rose/20",
    badge: "badge-rose",
    textClass: "text-rose",
    icon: <TrendingDown className="w-4 h-4" aria-hidden="true" />,
  },
};

// ─── AI Verdict Bar ───────────────────────────────────────────────────────────

function AiVerdictBar({
  dcf,
  mc,
  store,
  sensitivityInsight,
}: {
  dcf: ReturnType<typeof runDCF>;
  mc: MonteCarloResult | null;
  store: SimulatorInputs;
  sensitivityInsight: string;
}) {
  const irr = isNaN(dcf.leveredIRR) ? 0 : dcf.leveredIRR;
  const verdict = getVerdict(irr);
  const cfg = VERDICT_CONFIG[verdict];
  const equity = dcf.totalEquityInvested;
  const totalOut = dcf.totalCashDistributed;
  const hold = store.holdPeriodYears;

  let oneLiner: string;
  if (verdict === "BUY") {
    oneLiner = `This deal returns ${irr.toFixed(1)}% IRR. Your ${formatCompact(equity)} investment becomes ${formatCompact(totalOut)} in ${hold} years.`;
  } else if (verdict === "DIG_DEEPER") {
    const topVar = sensitivityInsight.match(/most sensitive variable is the (.+?)\./)?.[1] ?? "exit cap rate";
    oneLiner = `Returns are decent at ${irr.toFixed(1)}% but sensitive to ${topVar}. Stress-test before committing.`;
  } else {
    oneLiner = `${irr.toFixed(1)}% IRR doesn't justify the risk. Your money works harder in an index fund.`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 ${cfg.bg} ${cfg.border}`}
      role="region"
      aria-label={`AI Verdict: ${cfg.label}`}
    >
      {/* Badge + one-liner */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest border ${cfg.border} ${cfg.textClass} bg-transparent`}>
          {cfg.icon}
          {cfg.label}
        </span>
        <p className="text-[13px] text-content-primary font-medium leading-snug">
          {oneLiner}
        </p>
      </div>

      {/* Monte Carlo probability */}
      {mc && (
        <div className="shrink-0 flex items-center gap-2 text-[12px] text-content-secondary font-mono">
          <Shield className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          <span>
            <span className={`font-bold tabular-nums ${mc.probabilityOfPositiveReturn >= 70 ? "text-emerald" : mc.probabilityOfPositiveReturn >= 50 ? "text-amber" : "text-rose"}`}>
              {mc.probabilityOfPositiveReturn.toFixed(0)}%
            </span>
            {" "}chance of positive returns across{" "}
            <span className="tabular-nums">{mc.numSimulations.toLocaleString()}</span> simulations
          </span>
        </div>
      )}
      {!mc && (
        <div className="shrink-0 flex items-center gap-2 text-[11px] text-content-disabled font-mono">
          <Shield className="w-3.5 h-3.5 opacity-30" aria-hidden="true" />
          Running simulations...
        </div>
      )}
    </motion.div>
  );
}

// ─── Key Metrics Row (6 cards) ────────────────────────────────────────────────

type Verdict = "good" | "bad" | "neutral";

const VERDICT_COLORS: Record<Verdict, string> = {
  good: "text-emerald",
  bad: "text-rose",
  neutral: "text-content-primary",
};

function MetricCard({
  label,
  value,
  sub,
  verdict,
  ariaLabel,
}: {
  label: React.ReactNode;
  value: string;
  sub?: string;
  verdict: Verdict;
  ariaLabel: string;
}) {
  return (
    <div className="card-glass !p-3" aria-label={ariaLabel}>
      <div className="metric-label mb-1">{label}</div>
      <div className={`font-mono text-[17px] font-bold tabular-nums leading-tight ${VERDICT_COLORS[verdict]}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-content-disabled mt-0.5 leading-snug">
          {sub}
        </div>
      )}
    </div>
  );
}

function KeyMetricsRow({ dcf }: { dcf: ReturnType<typeof runDCF> }) {
  const y1 = dcf.annualCashFlows[0];
  const irr = isNaN(dcf.leveredIRR) ? 0 : dcf.leveredIRR;
  const dscr = y1?.dscr ?? 0;
  const coc = y1?.cashOnCash ?? 0;
  const cf = y1?.cashFlowBeforeTax ?? 0;

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
      role="region"
      aria-label="Key return metrics"
    >
      <MetricCard
        label={<Term id="irr" value={irr}>Levered IRR</Term>}
        value={isNaN(dcf.leveredIRR) ? "N/A" : `${irr.toFixed(1)}%`}
        sub={irr >= 12 ? "Beats most REITs" : irr >= 6 ? "Above inflation" : "Below index fund"}
        verdict={irr >= 12 ? "good" : irr < 6 ? "bad" : "neutral"}
        ariaLabel={`Levered IRR: ${irr.toFixed(1)}%`}
      />
      <MetricCard
        label={<Term id="equity-multiple" value={dcf.equityMultiple}>Equity Multiple</Term>}
        value={`${dcf.equityMultiple.toFixed(2)}x`}
        sub={`${formatCompact(dcf.totalCashDistributed)} total out`}
        verdict={dcf.equityMultiple >= 2 ? "good" : dcf.equityMultiple < 1 ? "bad" : "neutral"}
        ariaLabel={`Equity multiple: ${dcf.equityMultiple.toFixed(2)}x`}
      />
      <MetricCard
        label={<Term id="coc" value={coc}>Year 1 Cash Flow</Term>}
        value={cf < 0 ? `(${formatCurrency(Math.abs(cf))})` : formatCurrency(cf)}
        sub={`${coc.toFixed(1)}% cash-on-cash`}
        verdict={cf > 0 ? "good" : "bad"}
        ariaLabel={`Year 1 cash flow: ${formatCurrency(cf)}`}
      />
      <MetricCard
        label={<Term id="npv" value={dcf.netPresentValue}>NPV at 8%</Term>}
        value={dcf.netPresentValue < 0
          ? `(${formatCompact(Math.abs(dcf.netPresentValue))})`
          : formatCompact(dcf.netPresentValue)
        }
        sub={dcf.netPresentValue > 0 ? "Creates value vs parking cash" : "Index fund wins"}
        verdict={dcf.netPresentValue > 0 ? "good" : "bad"}
        ariaLabel={`Net present value at 8%: ${formatCurrency(dcf.netPresentValue)}`}
      />
      <MetricCard
        label={<Term id="dscr" value={dscr}>DSCR</Term>}
        value={`${dscr.toFixed(2)}x`}
        sub={dscr >= 1.25 ? "Comfortable cushion" : dscr >= 1.0 ? "Tight — watch vacancy" : "Negative cash flow"}
        verdict={dscr >= 1.25 ? "good" : dscr < 1.0 ? "bad" : "neutral"}
        ariaLabel={`Debt service coverage ratio: ${dscr.toFixed(2)}x`}
      />
      <MetricCard
        label={<Term id="coc" value={coc}>Cash-on-Cash Y1</Term>}
        value={`${coc.toFixed(1)}%`}
        sub={coc >= 8 ? "Beats most dividends" : coc >= 4 ? "Acceptable return" : "Below savings rate"}
        verdict={coc >= 8 ? "good" : coc < 4 ? "bad" : "neutral"}
        ariaLabel={`Year 1 cash-on-cash return: ${coc.toFixed(1)}%`}
      />
    </div>
  );
}

// ─── AI Coach Section ─────────────────────────────────────────────────────────

function AiCoachSection({
  dcf,
  mc,
  store,
  sensitivityInsight,
}: {
  dcf: ReturnType<typeof runDCF>;
  mc: MonteCarloResult | null;
  store: SimulatorInputs;
  sensitivityInsight: string;
}) {
  const irr = isNaN(dcf.leveredIRR) ? 0 : dcf.leveredIRR;
  const y1 = dcf.annualCashFlows[0];
  const dscr = y1?.dscr ?? 0;
  const cf = y1?.cashFlowBeforeTax ?? 0;
  const monthlyBuffer = cf / 12;
  const reserves = cf < 0
    ? Math.abs(Math.round((dcf.totalEquityInvested * 0.03) / Math.abs(monthlyBuffer)))
    : null;

  // Index fund comparison — S&P 500 historical ~10% annualized
  const indexFundValue = dcf.totalEquityInvested * Math.pow(1.10, store.holdPeriodYears);
  const dealValue = dcf.totalCashDistributed;
  const vsDiff = dealValue - indexFundValue;

  const topVar = sensitivityInsight.match(/most sensitive variable is the (.+?)\./)?.[1] ?? "exit cap rate";

  const bullets: Array<{ icon: React.ReactNode; text: string; color: string }> = [
    {
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />,
      text: `Your most sensitive variable is ${topVar}. Lock this in before committing capital — a small shift changes everything.`,
      color: "text-amber",
    },
    {
      icon: mc ? <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-40" />,
      text: mc
        ? `Monte Carlo shows ${mc.probabilityOfPositiveReturn.toFixed(0)}% chance of positive returns — ${mc.probabilityOfPositiveReturn >= 75 ? "that's solid confidence. Proceed with diligence." : mc.probabilityOfPositiveReturn >= 55 ? "borderline. The bear case is real." : "concerning. More than 1-in-3 simulations lose money."}`
        : "Monte Carlo simulation running — probability estimate pending.",
      color: mc && mc.probabilityOfPositiveReturn >= 75 ? "text-emerald" : "text-amber",
    },
    ...(reserves !== null
      ? [{
          icon: <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />,
          text: `At your current vacancy rate, you have approximately ${reserves} months of equity reserves before cash flow goes negative. Build a buffer.`,
          color: "text-rose",
        }]
      : [{
          icon: <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />,
          text: `DSCR of ${dscr.toFixed(2)}x means income covers the mortgage ${dscr >= 1.25 ? "comfortably" : "marginally"}. You have ${formatCurrency(Math.abs(cf / 12))}/mo ${cf >= 0 ? "buffer" : "shortfall"}.`,
          color: dscr >= 1.25 ? "text-emerald" : "text-amber",
        }]
    ),
    {
      icon: <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />,
      text: vsDiff > 0
        ? `Compared to an S&P 500 index fund (10% historical avg), this deal outperforms by ${formatCompact(vsDiff)} over ${store.holdPeriodYears} years. Real estate wins — if you execute.`
        : `Compared to an S&P 500 index fund, this deal underperforms by ${formatCompact(Math.abs(vsDiff))} over ${store.holdPeriodYears} years. Reconsider the entry price.`,
      color: vsDiff > 0 ? "text-emerald" : "text-rose",
    },
  ];

  // Factor attribution for the strip
  const factors = [
    { label: "Exit cap rate exposure", value: -(store.exitCapRate * 0.12), unit: "pp" },
    { label: "Rent growth upside", value: store.annualRentGrowthPct * 0.15, unit: "pp" },
    { label: "Interest rate drag", value: -(store.interestRate * 0.09), unit: "pp" },
    { label: "Vacancy drag", value: -(store.vacancyPct * 0.05), unit: "pp" },
    { label: "Appreciation lift", value: store.annualAppreciationPct * 0.08, unit: "pp" },
  ];

  return (
    <div className="space-y-4">
      {/* What This Means For You */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-gold" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-content-primary">What This Means For You</h2>
        </div>
        <ul className="space-y-3" role="list">
          {bullets.map((b, i) => (
            <li key={i} className={`flex items-start gap-2.5 text-[13px] leading-relaxed ${b.color}`}>
              {b.icon}
              <span className="text-content-secondary">{b.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AiInsightStrip with factor attribution */}
      <AiInsightStrip
        summary={sensitivityInsight}
        detail={
          mc
            ? `Monte Carlo confirms: ${mc.probabilityOfPositiveReturn.toFixed(0)}% of ${mc.numSimulations.toLocaleString()} simulations produce a positive return. P10 downside IRR is ${mc.irr.p10.toFixed(1)}%, P90 upside is ${mc.irr.p90.toFixed(1)}%. Median simulated IRR of ${mc.irr.median.toFixed(1)}% is the most realistic single-scenario expectation. At ${irr.toFixed(1)}% levered IRR, this deal ${irr >= 12 ? "clears the institutional hurdle rate" : irr >= 8 ? "approaches the hurdle but leaves little margin" : "falls short of the 8% minimum institutional threshold"}.`
            : undefined
        }
        factors={factors}
        confidence={
          mc && mc.probabilityOfPositiveReturn >= 80 ? "high"
          : mc && mc.probabilityOfPositiveReturn >= 60 ? "medium"
          : "low"
        }
        sources={["DCF Engine", "Monte Carlo (5k sims)", "Sensitivity Analysis"]}
      />
    </div>
  );
}

// ─── Deal Intelligence Footer ─────────────────────────────────────────────────

function DealIntelligenceFooter({ dcf, store }: { dcf: ReturnType<typeof runDCF>; store: SimulatorInputs }) {
  const y1 = dcf.annualCashFlows[0];
  const irr = isNaN(dcf.leveredIRR) ? 0 : dcf.leveredIRR;
  const dscr = y1?.dscr ?? 0;
  const cf = y1?.cashFlowBeforeTax ?? 0;
  const coc = y1?.cashOnCash ?? 0;

  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (irr < 6) redFlags.push(`IRR of ${irr.toFixed(1)}% barely clears inflation — re-examine the entry price`);
  if (irr >= 12) greenFlags.push(`IRR of ${irr.toFixed(1)}% clears the institutional 12% hurdle rate`);
  if (dscr < 1.0) redFlags.push(`DSCR of ${dscr.toFixed(2)}x — property loses money after debt service`);
  if (dscr >= 1.25) greenFlags.push(`DSCR of ${dscr.toFixed(2)}x — income covers the mortgage with a ${((dscr - 1) * 100).toFixed(0)}% buffer`);
  if (cf < 0) redFlags.push(`Negative year 1 cash flow of ${formatCurrency(Math.abs(cf))} — you're feeding this deal monthly`);
  if (coc >= 8) greenFlags.push(`${coc.toFixed(1)}% cash-on-cash return outperforms most dividend stocks`);
  if (store.vacancyPct >= 10) redFlags.push(`${store.vacancyPct}% vacancy assumption is high — verify local market absorption`);
  if (store.exitCapRate > 7.5) redFlags.push(`Exit cap rate of ${store.exitCapRate}% implies a soft resale market — consider lower hold period`);
  if (store.interestRate > 8) redFlags.push(`Interest rate at ${store.interestRate}% is expensive — model a refinance in year 3-5`);
  if (dcf.equityMultiple >= 2) greenFlags.push(`${dcf.equityMultiple.toFixed(2)}x equity multiple — you double your money over ${store.holdPeriodYears} years`);

  const proAdvice: string[] = [
    irr < 8
      ? `Negotiate the purchase price down ${Math.round(((irr + 4) / irr - 1) * 100)}% to hit an 8% IRR floor`
      : `Current pricing supports your return target — focus on locking in the financing`,
    store.vacancyPct >= 7
      ? `Pull 24 months of local absorption data before closing — your vacancy assumption needs validation`
      : `${store.vacancyPct}% vacancy looks conservative for most markets — you have cushion`,
    dscr < 1.25
      ? `Add ${formatCurrency(((1.25 - dscr) * (y1?.debtService ?? 0) / 12))} to monthly rent pricing or cut expenses before underwriting`
      : `Consider whether the excess DSCR could support additional leverage at better terms`,
    `Run a 1031 exchange scenario at exit — if capital gains tax rate is above 20%, it materially improves IRR`,
    store.holdPeriodYears > 7
      ? `A ${store.holdPeriodYears}-year hold is a long commitment — model a 5-year exit as your base case`
      : `${store.holdPeriodYears}-year hold aligns with typical private equity real estate fund cycles`,
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Flags */}
      <div className="card p-5">
        <h2 className="text-[13px] font-semibold text-content-primary mb-4">Red / Green Flags</h2>
        <div className="space-y-2">
          {greenFlags.map((f, i) => (
            <div key={`g-${i}`} className="flex items-start gap-2.5 text-[12px]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-content-secondary">{f}</span>
            </div>
          ))}
          {redFlags.map((f, i) => (
            <div key={`r-${i}`} className="flex items-start gap-2.5 text-[12px]">
              <XCircle className="w-3.5 h-3.5 text-rose shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-content-secondary">{f}</span>
            </div>
          ))}
          {greenFlags.length === 0 && redFlags.length === 0 && (
            <p className="text-[12px] text-content-disabled">Adjust assumptions to generate flags.</p>
          )}
        </div>
      </div>

      {/* What Would a Pro Do */}
      <div className="card p-5">
        <h2 className="text-[13px] font-semibold text-content-primary mb-4">What Would a Pro Do?</h2>
        <ol className="space-y-2.5 list-none">
          {proAdvice.map((advice, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[12px]">
              <span className="shrink-0 w-4 h-4 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[9px] font-bold text-gold tabular-nums mt-0.5">
                {i + 1}
              </span>
              <span className="text-content-secondary leading-relaxed">{advice}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const store = useSimulatorStore();
  const reset = useSimulatorStore((s) => s.reset);
  const [mc, setMC] = useState<MonteCarloResult | null>(null);
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { save, saved } = useSaveScenario();

  useEffect(() => {
    if (showReport && reportRef.current) {
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [showReport]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dcfInput = useMemo(() => buildDCFInput(store), [
    store.purchasePrice, store.downPaymentPct, store.interestRate, store.loanTermYears,
    store.amortizationYears, store.closingCostsPct, store.renovationBudget,
    store.monthlyRent, store.annualRentGrowthPct, store.vacancyPct, store.otherIncome,
    store.propertyTaxRate, store.insuranceAnnual, store.managementPct,
    store.maintenancePct, store.capexReservePct, store.annualExpenseGrowthPct,
    store.holdPeriodYears, store.exitCapRate, store.sellingCostsPct,
    store.annualAppreciationPct,
  ]);

  const dcf = useMemo(() => {
    try { return runDCF(dcfInput); } catch { return null; }
  }, [dcfInput]);

  // Monte Carlo — debounced
  useEffect(() => {
    setMC(null);
    const timer = setTimeout(() => {
      try {
        const config = createDefaultMonteCarloConfig(dcfInput, "simulator-seed");
        config.numSimulations = 5000;
        const result = runMonteCarlo(dcfInput, config);
        setMC(result);
      } catch {
        // Silently fail on edge-case inputs
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [dcfInput]);

  const sensitivityInsight = useMemo(() => {
    if (!dcf) return "Adjust your assumptions to see sensitivity analysis.";
    try { return computeSensitivityInsight(store); } catch { return ""; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcfInput]);

  if (!dcf) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-8 h-8 text-amber mb-3" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-content-primary">Invalid Inputs</h2>
        <p className="text-sm text-content-tertiary mt-1 max-w-sm">
          Some slider values produce invalid calculations. Try adjusting hold period or exit cap rate.
        </p>
        <button onClick={reset} className="btn-secondary mt-4">
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Reset to Defaults
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-screen space-y-5">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-content-primary font-display tracking-tight">
            Deal Simulator
          </h1>
          <p className="text-[13px] text-content-tertiary mt-0.5">
            Drag sliders. Watch returns recalculate in real-time. Every number is live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            aria-label={saved ? "Scenario saved" : "Save current scenario"}
            className={`btn-ghost text-xs transition-colors ${saved ? "text-emerald" : ""}`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={() => setShowReport(!showReport)}
            aria-expanded={showReport}
            aria-label={showReport ? "Close investment report" : "Generate investment report"}
            className="btn-ghost text-xs"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Report
          </button>
          <button onClick={reset} className="btn-ghost text-xs" aria-label="Reset all inputs to defaults">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* ── 1. AI Verdict Bar ────────────────────────────────────────────────── */}
      <AiVerdictBar
        dcf={dcf}
        mc={mc}
        store={store}
        sensitivityInsight={sensitivityInsight}
      />

      {/* ── 2. Key Metrics Row ───────────────────────────────────────────────── */}
      <KeyMetricsRow dcf={dcf} />

      {/* ── 3. Scenario Strip (inline, 3 columns) ───────────────────────────── */}
      <ScenarioComparisonStrip dcf={dcf} />

      {/* ── Mobile: Collapsible Input Accordion ─────────────────────────────── */}
      <MobileInputAccordion>
        <SimulatorInputPanel />
      </MobileInputAccordion>

      {/* ── 4. Two-Column: Sliders | Charts ─────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Left: Sticky Sliders (280px) */}
        <aside
          className="hidden lg:flex flex-col w-[280px] shrink-0"
          aria-label="Simulator inputs"
        >
          <div className="card p-4 lg:sticky lg:top-20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-gold" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-content-primary">Assumptions</span>
              </div>
              <button
                onClick={reset}
                className="text-[11px] text-content-disabled hover:text-content-tertiary transition-colors font-medium"
                aria-label="Reset all assumptions to defaults"
              >
                Reset
              </button>
            </div>
            <SimulatorInputPanel />
          </div>
        </aside>

        {/* Right: Chart Tabs */}
        <main className="flex-1 min-w-0" aria-label="Simulator results">
          <SimulatorResultsPanel dcf={dcf} mc={mc} />
        </main>
      </div>

      {/* ── 5. AI Coach Section ──────────────────────────────────────────────── */}
      <AiCoachSection
        dcf={dcf}
        mc={mc}
        store={store}
        sensitivityInsight={sensitivityInsight}
      />

      {/* ── 6. Deal Intelligence Footer ─────────────────────────────────────── */}
      <DealIntelligenceFooter dcf={dcf} store={store} />

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div
        role="note"
        className="flex items-start gap-2 p-3 rounded-lg bg-amber/5 border border-amber/10"
      >
        <AlertTriangle className="w-4 h-4 text-amber mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-amber leading-relaxed">
          All calculations run client-side using institutional-grade formulas (Newton-Raphson IRR,
          Cholesky-correlated Monte Carlo). Input your own assumptions — real data integration is in progress.
          This is not financial advice.
        </p>
      </div>

      {/* ── Mortgage Calculator Suite ──────────────────────────────────────────── */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          <h2 className="text-sm font-semibold text-content-primary">
            <Term id="mortgage-rates">Mortgage</Term> Calculator Suite
          </h2>
          <span className="text-[10px] text-content-disabled">All calculations use real amortization math — not approximations</span>
        </div>

        {/* Row 1: Amortization + Loan Comparison */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <AmortizationTable
              loanAmount={Math.round(store.purchasePrice * (1 - store.downPaymentPct / 100))}
              rate={store.interestRate}
              termYears={store.loanTermYears || 30}
              holdYears={store.holdPeriodYears}
            />
          </div>
          <div className="card">
            <LoanComparison
              purchasePrice={store.purchasePrice}
              downPct={store.downPaymentPct}
              currentRate={store.interestRate}
            />
          </div>
        </div>

        {/* Row 2: Down Payment Scenarios + Points Analysis */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <DownPaymentScenarios
              purchasePrice={store.purchasePrice}
              rate={store.interestRate}
              monthlyRent={store.monthlyRent}
              expenses={Math.round(store.monthlyRent * 0.45)}
            />
          </div>
          <div className="card">
            <PointsAnalysis
              loanAmount={Math.round(store.purchasePrice * (1 - store.downPaymentPct / 100))}
              rate={store.interestRate}
              termYears={store.loanTermYears || 30}
              holdYears={store.holdPeriodYears}
            />
          </div>
        </div>

        {/* Row 3: Refi Analysis + Closing Costs */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <RefinanceAnalysis
              currentLoan={Math.round(store.purchasePrice * (1 - store.downPaymentPct / 100))}
              currentRate={store.interestRate}
              currentPayment={dcf.annualCashFlows[0]?.debtService ? Math.round(dcf.annualCashFlows[0].debtService / 12) : 0}
              monthsRemaining={(store.loanTermYears || 30) * 12}
            />
          </div>
          <div className="card">
            <ClosingCostBreakdown
              purchasePrice={store.purchasePrice}
              loanAmount={Math.round(store.purchasePrice * (1 - store.downPaymentPct / 100))}
              isNewPurchase={true}
            />
          </div>
        </div>

        {/* Row 4: Affordability + PMI */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <AffordabilityCalculator rate={store.interestRate} />
          </div>
          <div className="card">
            <PMICalculator
              purchasePrice={store.purchasePrice}
              downPct={store.downPaymentPct}
              rate={store.interestRate}
              loanAmount={Math.round(store.purchasePrice * (1 - store.downPaymentPct / 100))}
            />
          </div>
        </div>
      </div>

      {/* ── Advanced Analysis Suite ──────────────────────────────────────────── */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          <h2 className="text-sm font-semibold text-content-primary">
            Advanced Analysis
          </h2>
          <span className="text-[10px] text-content-disabled">Deep-dive metrics most tools don&apos;t show</span>
        </div>

        {/* Row 1: Equity Position + Cash-on-Cash Timeline */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <EquityPositionChart
              purchasePrice={store.purchasePrice}
              loanAmount={Math.round(store.purchasePrice * (1 - store.downPaymentPct / 100))}
              rate={store.interestRate}
              termYears={store.loanTermYears || 30}
              holdYears={store.holdPeriodYears}
              appreciationPct={store.annualAppreciationPct}
            />
          </div>
          <div className="card">
            <CashOnCashTimeline
              dcfCashFlows={dcf.annualCashFlows.map((cf, i) => ({
                year: i + 1,
                cashFlowBeforeTax: cf.cashFlowBeforeTax,
                cashOnCash: cf.cashOnCash,
              }))}
              totalEquityInvested={dcf.totalEquityInvested}
            />
          </div>
        </div>

        {/* Row 2: After-Tax Returns + Leverage Impact */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <AfterTaxReturns
              annualIncomeTax={store.annualIncomeTax}
              depreciationYears={store.depreciationYears}
              costSegBonus={store.costSegBonus}
              use1031Exchange={store.use1031Exchange}
              capitalGainsTaxRatePct={store.capitalGainsTaxRatePct}
              purchasePrice={store.purchasePrice}
              dcf={dcf}
            />
          </div>
          <div className="card">
            <LeverageImpactAnalysis
              purchasePrice={store.purchasePrice}
              monthlyRent={store.monthlyRent}
              rate={store.interestRate}
              holdYears={store.holdPeriodYears}
              appreciationPct={store.annualAppreciationPct}
            />
          </div>
        </div>

        {/* Row 3: Insurance Shock + Cash Reserves */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <InsuranceShockScenario
              insuranceAnnual={store.insuranceAnnual}
              insuranceAnnualIncreasePct={store.insuranceAnnualIncreasePct}
              monthlyRent={store.monthlyRent}
              mortgage={dcf.annualCashFlows[0]?.debtService ? Math.round(dcf.annualCashFlows[0].debtService / 12) : 0}
              expenses={Math.round(store.monthlyRent * 0.45)}
              holdYears={store.holdPeriodYears}
            />
          </div>
          <div className="card">
            <CashReserveAnalysis
              monthlyExpenses={Math.round(store.monthlyRent * (store.managementPct + store.maintenancePct + store.capexReservePct) / 100) + Math.round(store.insuranceAnnual / 12) + Math.round(store.purchasePrice * store.propertyTaxRate / 100 / 12) + store.hoaMonthly + store.utilitiesMonthly}
              monthlyMortgage={dcf.annualCashFlows[0]?.debtService ? Math.round(dcf.annualCashFlows[0].debtService / 12) : 0}
              reserveMonths={store.reserveMonths}
              cashFlow={dcf.annualCashFlows[0]?.cashFlowBeforeTax ? Math.round(dcf.annualCashFlows[0].cashFlowBeforeTax / 12) : 0}
            />
          </div>
        </div>

        {/* Row 4: Deal Comparison + Turnover Costs */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <DealComparisonPanel
              currentDeal={{
                irr: dcf.leveredIRR,
                coc: dcf.annualCashFlows[0]?.cashOnCash ?? 0,
                cashFlow: dcf.annualCashFlows[0]?.cashFlowBeforeTax ?? 0,
                npv: dcf.netPresentValue,
                equityMultiple: dcf.equityMultiple,
                dscr: dcf.annualCashFlows[0]?.dscr ?? 0,
              }}
            />
          </div>
          <div className="card">
            <TurnoverCostProjection
              turnoverCost={store.turnoverCostPerEvent}
              avgStayYears={store.avgTenantStayYears}
              holdYears={store.holdPeriodYears}
              monthlyRent={store.monthlyRent}
            />
          </div>
        </div>
      </div>

      {/* ── Full-Width Investment Report ──────────────────────────────────────── */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            ref={reportRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <InvestmentReport
              dcf={dcf}
              mc={mc}
              inputs={store}
              onClose={() => setShowReport(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
