"use client";

/**
 * Financing Tab — Analyze page
 * Matched lenders, pre-qualification summary, loan product comparison, quote CTA.
 *
 * Rates are market estimates as of March 2026 (Bankrate, HomeAbroad):
 *   Conventional 30yr fixed: 6.25–6.75%
 *   DSCR 30yr:               6.50–7.50%
 *   Hard Money 12–18mo:     10.00–14.00%
 *   FHA 30yr:                5.75–6.50%
 *
 * Displayed rates are estimates, not commitments.
 * LootVue is not a lender. This is not financial advice.
 */

import { useState, useMemo } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, Star, Clock, TrendingDown,
  Landmark, ChevronDown, ChevronUp, Info, Send,
} from "lucide-react";
import { Term } from "@/components/shared/Term";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import { CHART_COLORS } from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import { matchLenders } from "@/lib/stores/lender-store";
import { useLenderStore } from "@/lib/stores/lender-store";
import { MOCK_LENDERS } from "@/lib/mock/lender-data";
import type { AnalysisResult } from "./_components";
import type { LenderMatch } from "@/lib/types/marketplace";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcMonthly(principal: number, annualRatePct: number, years: number): number {
  if (annualRatePct <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function fmtRate(r: number): string {
  return r.toFixed(2) + "%";
}

// ─── Lender type labels ───────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  conventional: "Conventional",
  dscr: "DSCR",
  hard_money: "Hard Money",
  portfolio: "Portfolio",
  bridge: "Bridge",
  fha: "FHA",
  va: "VA",
  usda: "USDA",
};

const TYPE_COLORS: Record<string, string> = {
  conventional: CHART_COLORS.emerald,
  dscr:         CHART_COLORS.gold,
  hard_money:   CHART_COLORS.rose,
  portfolio:    CHART_COLORS.amber,
  bridge:       CHART_COLORS.amber,
  fha:          CHART_COLORS.emerald,
  va:           CHART_COLORS.emerald,
  usda:         CHART_COLORS.emerald,
};

// ─── Pre-qual evaluation ──────────────────────────────────────────────────────

type QualStatus = "eligible" | "conditional" | "ineligible";

interface QualResult {
  product: string;
  status: QualStatus;
  reason: string;
}

function evaluatePreQual(
  result: AnalysisResult,
  downPct: number,
): QualResult[] {
  const ltv = 100 - downPct;
  const loanAmount = result.purchasePrice * (downPct / 100) === 0
    ? result.purchasePrice
    : result.purchasePrice * (1 - downPct / 100);

  return [
    {
      product: "Conventional",
      status:
        ltv <= 80
          ? "eligible"
          : ltv <= 97
          ? "conditional"
          : "ineligible",
      reason:
        ltv <= 80
          ? `${downPct}% down clears the 20% threshold — no PMI required.`
          : ltv <= 97
          ? `LTV ${ltv}% triggers PMI. Rates ~6.25–6.75%.`
          : "LTV exceeds 97% Fannie/Freddie limit.",
    },
    {
      product: "DSCR",
      status:
        result.dscr >= 1.25
          ? "eligible"
          : result.dscr >= 1.0
          ? "conditional"
          : "ineligible",
      reason:
        result.dscr >= 1.25
          ? `DSCR ${result.dscr.toFixed(2)}x comfortably exceeds 1.25x — strong qualification.`
          : result.dscr >= 1.0
          ? `DSCR ${result.dscr.toFixed(2)}x qualifies for select lenders (min 1.0x).`
          : `DSCR ${result.dscr.toFixed(2)}x is below the 1.0x floor for most DSCR programs.`,
    },
    {
      product: "FHA",
      status:
        loanAmount <= 472_030 && ltv <= 96.5
          ? "eligible"
          : loanAmount <= 1_089_300
          ? "conditional"
          : "ineligible",
      reason:
        loanAmount <= 472_030
          ? "Loan amount within FHA baseline limit. Owner-occupancy required."
          : loanAmount <= 1_089_300
          ? "High-cost area FHA limit may apply. Confirm with lender."
          : "Loan amount exceeds FHA limits. Not eligible.",
    },
    {
      product: "Hard Money",
      status: ltv <= 75 ? "eligible" : ltv <= 90 ? "conditional" : "ineligible",
      reason:
        ltv <= 75
          ? "LTV within hard money sweet spot. Rapid close available."
          : ltv <= 90
          ? `LTV ${ltv}% is acceptable for bridge/hard money. Rate premium applies.`
          : "LTV too high for most hard money programs.",
    },
  ];
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: QualStatus }) {
  if (status === "eligible")
    return <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: CHART_COLORS.emerald }} aria-hidden="true" />;
  if (status === "conditional")
    return <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: CHART_COLORS.amber }} aria-hidden="true" />;
  return <XCircle className="w-4 h-4 shrink-0" style={{ color: CHART_COLORS.rose }} aria-hidden="true" />;
}

function qualBadgeClass(status: QualStatus): string {
  if (status === "eligible")   return "badge-emerald";
  if (status === "conditional") return "badge-amber";
  return "badge-rose";
}

function qualLabel(status: QualStatus): string {
  if (status === "eligible")    return "Eligible";
  if (status === "conditional") return "Conditional";
  return "Not Eligible";
}

// ─── Quote confirmation state ─────────────────────────────────────────────────

interface QuoteState {
  [lenderId: string]: "idle" | "submitted";
}

// ─── Lender Card ──────────────────────────────────────────────────────────────

function LenderCard({
  match,
  result,
  downPct,
  onRequestQuote,
  quoteStatus,
}: {
  match: LenderMatch;
  result: AnalysisResult;
  downPct: number;
  onRequestQuote: (lenderId: string) => void;
  quoteStatus: "idle" | "submitted";
}) {
  const [expanded, setExpanded] = useState(false);
  const { lender, matchScore, estimatedRate, estimatedPayment, meetsCriteria, warnings } = match;
  const typeColor = TYPE_COLORS[lender.type] ?? CHART_COLORS.text;
  const typeLabel = TYPE_LABELS[lender.type] ?? lender.type;

  const cashFlowAtRate = useMemo(() => {
    const loanAmount = result.purchasePrice * (1 - downPct / 100);
    const years = lender.termOptions[0]?.includes("mo") ? 1 : 30;
    const pmt = calcMonthly(loanAmount, estimatedRate, years);
    return result.monthlyRent - result.monthlyExpenses - pmt;
  }, [result, downPct, estimatedRate, lender.termOptions]);

  const matchColor =
    matchScore >= 80
      ? CHART_COLORS.emerald
      : matchScore >= 60
      ? CHART_COLORS.amber
      : CHART_COLORS.rose;

  return (
    <article
      className="card space-y-3"
      aria-label={`${lender.name} — ${typeLabel} lender, ${matchScore}% match`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[14px] font-semibold text-content-primary leading-tight">
              {lender.name}
            </h4>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
              style={{
                color: typeColor,
                background: `${typeColor}18`,
                borderColor: `${typeColor}40`,
              }}
              aria-label={`Loan type: ${typeLabel}`}
            >
              {typeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3" style={{ color: CHART_COLORS.gold }} aria-hidden="true" />
            <span className="text-[11px] text-content-secondary font-mono">
              {lender.rating.toFixed(1)}
            </span>
            <span className="text-[11px] text-content-disabled">
              ({lender.reviewCount.toLocaleString()} reviews)
            </span>
          </div>
        </div>

        {/* Match score pill */}
        <div
          className="flex flex-col items-center px-3 py-1.5 rounded-xl border shrink-0"
          style={{ background: `${matchColor}12`, borderColor: `${matchColor}40` }}
          aria-label={`Match score: ${matchScore}%`}
        >
          <span
            className="text-[18px] font-bold font-mono tabular-nums leading-none"
            style={{ color: matchColor }}
          >
            {matchScore}
          </span>
          <span className="text-[9px] text-content-disabled uppercase tracking-wider mt-0.5">
            Match %
          </span>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            label: "Rate Range",
            value: `${fmtRate(lender.rateRange.min)} – ${fmtRate(lender.rateRange.max)}`,
            sub: `Est. ${fmtRate(estimatedRate)}`,
            color: "text-content-primary",
          },
          {
            label: <Term id="ltv">Max LTV</Term>,
            value: `${lender.maxLTV}%`,
            sub: lender.minDSCR ? `Min DSCR ${lender.minDSCR}x` : "No DSCR req.",
            color: "text-content-primary",
          },
          {
            label: "Est. Payment/mo",
            value: formatCurrency(estimatedPayment),
            sub:
              cashFlowAtRate >= 0
                ? `+${formatCurrency(cashFlowAtRate)} cash flow`
                : `${formatCurrency(cashFlowAtRate)} cash flow`,
            color: cashFlowAtRate >= 0 ? "text-emerald-light" : "text-rose-light",
          },
          {
            label: "Close Timeline",
            value: `${lender.closingDays} days`,
            sub: lender.termOptions.join(", "),
            color: "text-content-primary",
          },
        ].map((m, i) => (
          <div
            key={i}
            className="bg-surface-secondary rounded-lg p-2.5 border border-surface-border"
          >
            <p className="metric-label mb-1">{m.label}</p>
            <p className={`text-[13px] font-bold font-mono tabular-nums ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-content-disabled mt-0.5 leading-snug">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Criteria met / warnings summary */}
      <div className="flex flex-wrap gap-1.5">
        {meetsCriteria.slice(0, 3).map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-muted text-emerald border border-emerald/20"
          >
            <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
            {c}
          </span>
        ))}
        {warnings.slice(0, 2).map((w) => (
          <span
            key={w}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-muted text-amber border border-amber/20"
          >
            <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
            {w}
          </span>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="pt-2 border-t border-surface-border space-y-2 animate-fade-in">
          <p className="text-[11px] text-content-secondary leading-snug">{lender.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {lender.features.map((f) => (
              <span
                key={f}
                className="text-[10px] px-1.5 py-0.5 rounded border border-surface-border text-content-disabled"
              >
                {f}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-content-disabled">
            Available in:{" "}
            {lender.states.includes("ALL")
              ? "All 50 states"
              : lender.states.join(", ")}
          </p>
        </div>
      )}

      {/* Footer: expand toggle + CTA */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-content-tertiary hover:text-content-secondary transition-colors"
          aria-expanded={expanded}
          aria-controls={`lender-detail-${lender.id}`}
        >
          {expanded ? (
            <>Less detail <ChevronUp className="w-3 h-3" aria-hidden="true" /></>
          ) : (
            <>More detail <ChevronDown className="w-3 h-3" aria-hidden="true" /></>
          )}
        </button>

        {quoteStatus === "submitted" ? (
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Quote request sent
          </span>
        ) : (
          <button
            type="button"
            className="btn-primary text-[12px] py-1.5 px-3 inline-flex items-center gap-1.5"
            onClick={() => onRequestQuote(lender.id)}
            aria-label={`Request a rate quote from ${lender.name}`}
          >
            <Send className="w-3 h-3" aria-hidden="true" />
            Request Quote
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Comparison table row ─────────────────────────────────────────────────────

interface LoanRow {
  type: string;
  rateLabel: string;
  rateValue: number;
  ltv: string;
  monthly: number;
  cashFlow: number;
  notes: string;
  recommended: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinancingTab({
  result,
  downPct,
  rate,
}: {
  result: AnalysisResult;
  downPct: number;
  rate: number;
}) {
  const [quoteStates, setQuoteStates] = useState<QuoteState>({});
  const submitLead = useLenderStore((s) => s.submitLead);

  const loanAmount = Math.round(result.purchasePrice * (1 - downPct / 100));
  const downPayment = Math.round(result.purchasePrice * (downPct / 100));

  // Run matcher against mock lender pool (top 4 only)
  const matches: LenderMatch[] = useMemo(
    () => matchLenders(result, MOCK_LENDERS).slice(0, 4),
    [result]
  );

  // Pre-qualification evaluation
  const quals = useMemo(() => evaluatePreQual(result, downPct), [result, downPct]);

  // Build comparison rows using current market rates (March 2026)
  const convRate = Math.max(rate, 6.25);
  const dscrRate = Math.max(rate + 0.75, 6.5);
  const fhaRate  = Math.max(rate - 0.25, 5.75);
  const hmRate   = 12.0; // hard money midpoint

  const loanRows: LoanRow[] = useMemo(() => {
    const convMonthly = calcMonthly(loanAmount, convRate, 30);
    const dscrMonthly = calcMonthly(Math.round(loanAmount * 0.8), dscrRate, 30); // 80% LTV
    const fhaMonthly  = calcMonthly(loanAmount, fhaRate, 30);
    const hmMonthly   = calcMonthly(Math.round(loanAmount * 0.7), hmRate, 1);   // 70% LTV, 12mo

    const baseExpenses = result.monthlyExpenses - result.monthlyMortgage; // non-debt expenses

    return [
      {
        type: "Conventional",
        rateLabel: fmtRate(convRate),
        rateValue: convRate,
        ltv: `${100 - downPct}%`,
        monthly: convMonthly,
        cashFlow: result.monthlyRent - baseExpenses - convMonthly,
        notes: `80% LTV. W-2 income required. No PMI at ${downPct >= 20 ? "✓" : "PMI applies"}.`,
        recommended: result.cashOnCash >= 6 && downPct >= 20,
      },
      {
        type: "DSCR",
        rateLabel: `${fmtRate(dscrRate)} – ${fmtRate(dscrRate + 1.0)}`,
        rateValue: dscrRate,
        ltv: "75–80%",
        monthly: dscrMonthly,
        cashFlow: result.monthlyRent - baseExpenses - dscrMonthly,
        notes: `No income docs. DSCR ${result.dscr.toFixed(2)}x — min 1.0x. LLC vesting allowed.`,
        recommended: result.dscr >= 1.25,
      },
      {
        type: "FHA",
        rateLabel: fmtRate(fhaRate),
        rateValue: fhaRate,
        ltv: "96.5%",
        monthly: fhaMonthly,
        cashFlow: result.monthlyRent - baseExpenses - fhaMonthly,
        notes: "3.5% down. Owner-occupancy required. MIP for life of loan.",
        recommended: false,
      },
      {
        type: "Hard Money",
        rateLabel: "10.00–14.00%",
        rateValue: hmRate,
        ltv: "65–70%",
        monthly: hmMonthly,
        cashFlow: -1, // sentinel: N/A bridge loan
        notes: "12–18mo bridge. Rehab draws available. Refi out within 18mo.",
        recommended: false,
      },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanAmount, result.monthlyExpenses, result.monthlyMortgage, result.monthlyRent,
      result.dscr, result.cashOnCash, downPct, convRate, dscrRate, fhaRate, hmRate]);

  function handleRequestQuote(lenderId: string) {
    const leadId = submitLead({
      lenderId,
      loanAmount,
      propertyAddress: result.address,
      propertyType: "sfr",
      purchasePrice: result.purchasePrice,
      downPayment,
    });
    setQuoteStates((prev) => ({ ...prev, [lenderId]: "submitted" }));
    // eslint-disable-next-line no-console
    console.info("[FinancingTab] Quote lead submitted:", leadId);
  }

  const aiSummary = useMemo(() => {
    const best = matches[0];
    if (!best) return "Run analysis to get lender matches.";
    const diffVsConv = best.estimatedPayment - calcMonthly(loanAmount, convRate, 30);
    if (best.lender.type === "dscr" && result.dscr >= 1.25) {
      return `DSCR at ${result.dscr.toFixed(2)}x opens the door to no-income-doc financing. ${best.lender.name} is your top match at ~${fmtRate(best.estimatedRate)} — ${diffVsConv > 0 ? `${formatCurrency(Math.abs(diffVsConv))}/mo more than conventional` : `competitive with conventional`}. No tax returns required.`;
    }
    if (result.dscr < 1.0) {
      return `DSCR ${result.dscr.toFixed(2)}x falls below most lender minimums. Conventional is the primary path — W-2 income will carry this deal. Consider increasing rent or reducing the purchase price to improve the cash flow profile.`;
    }
    return `${best.lender.name} matches at ${best.matchScore}% with an estimated rate of ${fmtRate(best.estimatedRate)}. Monthly payment of ${formatCurrency(best.estimatedPayment)} leaves ${formatCurrency(result.monthlyRent - result.monthlyExpenses - best.estimatedPayment)} in monthly cash flow.`;
  }, [matches, loanAmount, convRate, result]);

  return (
    <div
      role="tabpanel"
      id="tabpanel-financing"
      aria-labelledby="tab-financing"
      className="space-y-5 animate-fade-in"
    >
      {/* ── 1. Pre-Qualification Summary ────────────────────────── */}
      <section className="card space-y-3" aria-label="Pre-qualification summary">
        <h3 className="section-label flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Pre-Qualification Check
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quals.map((q) => (
            <div
              key={q.product}
              className="flex items-start gap-2 bg-surface-secondary rounded-lg p-3 border border-surface-border"
              aria-label={`${q.product}: ${qualLabel(q.status)}`}
            >
              <StatusIcon status={q.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-semibold text-content-primary">
                    {q.product === "DSCR"
                      ? <><Term id="dscr">DSCR</Term> Loan</>
                      : q.product}
                  </span>
                  <span className={`text-[10px] ${qualBadgeClass(q.status)}`}>
                    {qualLabel(q.status)}
                  </span>
                </div>
                <p className="text-[11px] text-content-secondary leading-snug">{q.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Matched Lenders ──────────────────────────────────── */}
      <section aria-label="Matched lenders">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          <h3 className="section-label">Matched Lenders</h3>
          <span className="text-[10px] text-content-disabled">
            ({matches.length} of {MOCK_LENDERS.length} lenders)
          </span>
          <span
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-amber/30 text-amber bg-amber-muted"
            aria-label="Note: mock data"
          >
            Mock Data
          </span>
        </div>
        <div className="space-y-3">
          {matches.map((match) => (
            <LenderCard
              key={match.lender.id}
              match={match}
              result={result}
              downPct={downPct}
              onRequestQuote={handleRequestQuote}
              quoteStatus={quoteStates[match.lender.id] ?? "idle"}
            />
          ))}
        </div>
      </section>

      {/* ── 3. Loan Product Comparison ──────────────────────────── */}
      <section className="card space-y-4" aria-label="Loan product comparison table">
        <h3 className="section-label flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Loan Product Comparison
        </h3>
        <div className="overflow-x-auto -mx-1">
          <table
            className="table-premium w-full min-w-[560px]"
            aria-label="Side-by-side loan product comparison"
          >
            <thead>
              <tr>
                <th scope="col" className="text-left">Loan Type</th>
                <th scope="col" className="text-right">Rate</th>
                <th scope="col" className="text-right">
                  <Term id="ltv">LTV</Term>
                </th>
                <th scope="col" className="text-right">Payment/mo</th>
                <th scope="col" className="text-right">Cash Flow</th>
                <th scope="col" className="text-left pl-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loanRows.map((row) => {
                const cfLabel =
                  row.cashFlow === -1
                    ? "N/A — bridge"
                    : formatCurrency(row.cashFlow);
                const cfColor =
                  row.cashFlow === -1
                    ? "text-content-disabled"
                    : row.cashFlow >= 0
                    ? "text-emerald-light"
                    : "text-rose-light";
                return (
                  <tr
                    key={row.type}
                    className={row.recommended ? "bg-gold-muted/10" : ""}
                    aria-label={`${row.type}: rate ${row.rateLabel}, ${row.ltv} LTV, ${formatCurrency(row.monthly)}/mo`}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-content-primary font-medium">
                          {row.type === "DSCR"
                            ? <><Term id="dscr">DSCR</Term> Loan</>
                            : row.type}
                        </span>
                        {row.recommended && (
                          <span className="badge-gold text-[10px]" aria-label="Recommended">
                            Recommended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right font-mono tabular-nums text-content-primary">
                      {row.rateLabel}
                    </td>
                    <td className="text-right font-mono tabular-nums text-content-secondary">
                      {row.ltv}
                    </td>
                    <td className="text-right font-mono tabular-nums text-content-primary">
                      {formatCurrency(row.monthly)}
                    </td>
                    <td className={`text-right font-mono tabular-nums font-semibold ${cfColor}`}>
                      {cfLabel}
                    </td>
                    <td className="text-[11px] text-content-disabled pl-3 max-w-[200px] leading-snug">
                      {row.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Loan amount summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            {
              label: "Loan Amount",
              value: formatCurrency(loanAmount),
              sub: `${100 - downPct}% `,
              suffix: <Term id="ltv">LTV</Term>,
            },
            {
              label: "Down Payment",
              value: formatCurrency(downPayment),
              sub: `${downPct}% of purchase price`,
              suffix: null,
            },
            {
              label: <Term id="dscr">DSCR</Term>,
              value: `${result.dscr.toFixed(2)}x`,
              sub:
                result.dscr >= 1.25
                  ? "Strong — qualifies for most DSCR programs"
                  : result.dscr >= 1.0
                  ? "Marginal — some DSCR lenders only"
                  : "Below floor — conventional path required",
              suffix: null,
            },
          ].map((m, i) => (
            <div
              key={i}
              className="bg-surface-secondary rounded-xl p-4 border border-surface-border"
              aria-label={`${typeof m.label === "string" ? m.label : "DSCR"}: ${m.value}. ${m.sub}`}
            >
              <p className="metric-label mb-1">{m.label}</p>
              <p className="metric-value text-content-primary font-mono tabular-nums">{m.value}</p>
              <p className="text-[11px] text-content-disabled mt-1 leading-snug">
                {m.sub}{m.suffix}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. AI Insight ────────────────────────────────────────── */}
      <AiInsightStrip
        summary={aiSummary}
        sources={["Bankrate", "HomeAbroad", "Lender Match"]}
        confidence="medium"
      />

      {/* ── 5. Rate Disclaimer ───────────────────────────────────── */}
      <p
        className="text-[10px] text-content-disabled leading-snug border-t border-surface-border pt-3"
        role="note"
        aria-label="Rate disclaimer"
      >
        <Clock className="w-3 h-3 inline mr-1 align-text-bottom" aria-hidden="true" />
        Rates are market estimates as of March 2026 and are not commitments. Actual rates depend on
        credit score, property type, loan amount, and lender underwriting. LootVue is not a lender
        and does not originate, underwrite, or broker mortgage loans. Lender data is mock and will be
        replaced with real lender network data. Consult a licensed mortgage professional before
        making financing decisions.
      </p>
    </div>
  );
}
