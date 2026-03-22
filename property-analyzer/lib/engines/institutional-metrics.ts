/**
 * Institutional Metrics Engine — Blackstone/Invitation Homes acquisition ratios.
 * Debt Yield, Yield-on-Cost, Replacement Cost, IRR, Exit Sensitivity, Decision Rules.
 * All monetary values in dollars (not cents). Pure functions, no side effects.
 */

// ============================================================
// Types
// ============================================================

export interface InstitutionalMetricsInput {
  purchasePrice: number; currentValue: number; monthlyRent: number;
  monthlyExpenses: number; sqft: number;
  loanAmount: number; interestRate: number; loanTermYears: number; monthlyMortgage: number;
  renovationCost: number; postRenovationRent: number; postRenovationValue: number;
  constructionCostPerSqft: number; landValuePerSqft: number;
  marketRent: number; marketCapRate: number;
  exitCapRate: number; holdPeriodYears: number; sellingCostsPct: number;
  annualAppreciation: number; annualRentGrowth: number; annualExpenseGrowth: number;
}

export interface InstitutionalMetrics {
  debtYield: number; yieldOnCost: number; loanToCost: number;
  replacementCostBasis: number; buyingBelowReplacement: boolean; replacementCostDiscount: number;
  rentToPrice: number; spreadToMarketRent: number; spreadToMarketRentPct: number;
  effectiveGrossIncome: number;
  unleveredIRR: number; leveredIRR: number; equityMultiple: number;
  renovationROI: number; valueAddSpread: number;
  exitCapRateSensitivity: Array<{ exitCap: number; exitPrice: number; totalReturn: number; irr: number }>;
  rules: Array<{ metric: string; value: number; benchmark: number; passes: boolean; rule: string; action: string }>;
}

// ============================================================
// Helpers
// ============================================================

const VACANCY = 0.05;
const r2 = (v: number): number => Math.round(v * 100) / 100;

function noi(rent: number, expenses: number): number {
  return (rent * (1 - VACANCY) - expenses) * 12;
}

/** Project rent/expenses forward N years, return final-year NOI. */
function projectNOI(rent: number, exp: number, years: number, rentGr: number, expGr: number): number {
  let r = rent, e = exp;
  for (let i = 0; i < years; i++) { r *= 1 + rentGr / 100; e *= 1 + expGr / 100; }
  return noi(r, e);
}

/** Build levered annual cash flows array (year 0 = -equity, terminal year includes sale). */
function buildCashFlows(
  equity: number, rent: number, exp: number, mortgage: number, years: number,
  rentGr: number, expGr: number, exitCap: number, sellPct: number,
  loan: number, rate: number, term: number,
): { flows: number[]; totalDistributions: number } {
  const flows: number[] = [-equity];
  let total = 0, r = rent, e = exp;
  const annMtg = mortgage * 12;
  for (let yr = 1; yr <= years; yr++) {
    r *= 1 + rentGr / 100; e *= 1 + expGr / 100;
    const yrNOI = noi(r, e);
    const cf = yrNOI - annMtg;
    if (yr < years) { flows.push(cf); total += cf; }
    else {
      const exitPx = exitCap > 0 ? yrNOI / (exitCap / 100) : 0;
      const net = exitPx - exitPx * (sellPct / 100);
      const rem = remainingBalance(loan, rate, term, years);
      flows.push(cf + net - rem); total += cf + net - rem;
    }
  }
  return { flows, totalDistributions: total };
}

/** Newton-Raphson IRR solver. Returns annualized percentage. */
function solveIRR(cf: number[]): number {
  let r = 0.10;
  for (let i = 0; i < 100; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cf.length; t++) {
      const d = Math.pow(1 + r, t);
      npv += cf[t] / d; dnpv -= t * cf[t] / (d * (1 + r));
    }
    if (Math.abs(dnpv) < 1e-14) break;
    const nr = r - npv / dnpv;
    if (Math.abs(nr - r) < 1e-7) { r = nr; break; }
    r = nr;
  }
  return Math.max(-100, Math.min(200, r * 100));
}

function remainingBalance(principal: number, annRate: number, termYr: number, paidYr: number): number {
  if (principal <= 0 || annRate <= 0) return Math.max(0, principal * (1 - paidYr / termYr));
  const mr = annRate / 100 / 12, n = termYr * 12, p = paidYr * 12;
  return principal * (Math.pow(1 + mr, n) - Math.pow(1 + mr, p)) / (Math.pow(1 + mr, n) - 1);
}

// ============================================================
// Core Computation
// ============================================================

export function computeInstitutionalMetrics(input: InstitutionalMetricsInput): InstitutionalMetrics {
  const {
    purchasePrice: pp, currentValue: cv, monthlyRent: mr, monthlyExpenses: me, sqft,
    loanAmount: loan, interestRate: rate, loanTermYears: term, monthlyMortgage: mtg,
    renovationCost: reno, postRenovationRent: prr, postRenovationValue: prv,
    constructionCostPerSqft: ccSqft, landValuePerSqft: lvSqft,
    marketRent: mktRent, exitCapRate: exitCap, holdPeriodYears: hold,
    sellingCostsPct: sellPct, annualRentGrowth: rg, annualExpenseGrowth: eg,
  } = input;

  const totalCost = pp + reno;
  const equity = totalCost - loan;
  const curNOI = noi(mr, me);
  const stabNOI = noi(prr || mr, me);
  const entryCap = totalCost > 0 ? (curNOI / totalCost) * 100 : 0;
  const years = Math.max(1, hold);

  // Core institutional metrics
  const debtYield = loan > 0 ? (curNOI / loan) * 100 : 0;
  const yieldOnCost = totalCost > 0 ? (stabNOI / totalCost) * 100 : 0;
  const loanToCost = totalCost > 0 ? (loan / totalCost) * 100 : 0;
  const replCost = (ccSqft + lvSqft) * sqft;
  const belowRepl = pp < replCost;
  const replDiscount = replCost > 0 ? ((replCost - pp) / replCost) * 100 : 0;

  // Rent analysis
  const rentToPrice = pp > 0 ? (mr / pp) * 100 : 0;
  const spreadMkt = mktRent - mr;
  const spreadMktPct = mr > 0 ? ((mktRent - mr) / mr) * 100 : 0;
  const egi = mr * 12 * (1 - VACANCY);

  // IRR / Equity Multiple (unlevered + levered)
  const ulvCFs: number[] = [-totalCost];
  let pR = mr, pE = me;
  for (let yr = 1; yr <= years; yr++) {
    pR *= 1 + rg / 100; pE *= 1 + eg / 100;
    const yrNOI = noi(pR, pE);
    if (yr < years) ulvCFs.push(yrNOI);
    else {
      const ep = exitCap > 0 ? yrNOI / (exitCap / 100) : 0;
      ulvCFs.push(yrNOI + ep - ep * (sellPct / 100));
    }
  }
  const lev = buildCashFlows(equity, mr, me, mtg, years, rg, eg, exitCap, sellPct, loan, rate, term);

  // Value-add metrics
  const renoROI = reno > 0 ? ((prv - cv - reno) / reno) * 100 : 0;
  const vaSpread = r2(yieldOnCost - entryCap);

  // Exit cap sensitivity: -50bps, -25bps, 0, +25bps, +50bps
  const exitSens = [-0.50, -0.25, 0, 0.25, 0.50].map((offset) => {
    const ec = r2(exitCap + offset);
    const termNOI = projectNOI(mr, me, years, rg, eg);
    const ep = ec > 0 ? Math.round(termNOI / (ec / 100)) : 0;
    const net = ep - ep * (sellPct / 100);
    const totRet = totalCost > 0 ? r2(((net - totalCost) / totalCost) * 100) : 0;
    const s = buildCashFlows(equity, mr, me, mtg, years, rg, eg, ec, sellPct, loan, rate, term);
    return { exitCap: ec, exitPrice: ep, totalReturn: totRet, irr: r2(solveIRR(s.flows)) };
  });

  // Decision rules
  const rules = makeRules(debtYield, yieldOnCost, loanToCost, rentToPrice, replDiscount, belowRepl, spreadMktPct, lev.totalDistributions / (equity || 1), r2(solveIRR(lev.flows)));

  return {
    debtYield: r2(debtYield), yieldOnCost: r2(yieldOnCost), loanToCost: r2(loanToCost),
    replacementCostBasis: Math.round(replCost), buyingBelowReplacement: belowRepl,
    replacementCostDiscount: r2(replDiscount),
    rentToPrice: r2(rentToPrice), spreadToMarketRent: r2(spreadMkt),
    spreadToMarketRentPct: r2(spreadMktPct), effectiveGrossIncome: Math.round(egi),
    unleveredIRR: r2(solveIRR(ulvCFs)), leveredIRR: r2(solveIRR(lev.flows)),
    equityMultiple: equity > 0 ? r2(lev.totalDistributions / equity) : 0,
    renovationROI: r2(renoROI), valueAddSpread: vaSpread,
    exitCapRateSensitivity: exitSens, rules,
  };
}

// ============================================================
// Institutional Decision Rules
// ============================================================

interface RuleDef { metric: string; value: number; benchmark: number; passes: boolean; rule: string; passAction: string; failAction: string }

function makeRules(
  dy: number, yoc: number, ltc: number, rtp: number,
  rcd: number, belowRepl: boolean, smrp: number, em: number, lirr: number,
): InstitutionalMetrics["rules"] {
  const defs: RuleDef[] = [
    { metric: "Debt Yield", value: dy, benchmark: 10, passes: dy >= 10,
      rule: "Lenders require 8-12%. Below 8% = loan unlikely.",
      passAction: "Financeable — lender-safe",
      failAction: dy >= 8 ? "Marginal — may need recapitalization" : "Fails underwriting — reduce leverage or increase NOI" },
    { metric: "Yield-on-Cost", value: yoc, benchmark: 6.5, passes: yoc >= 6.5,
      rule: "Must exceed market cap rate by 100-200bps to justify renovation risk.",
      passAction: "Value-add thesis confirmed",
      failAction: "Reno doesn't pencil — renegotiate price or cut scope" },
    { metric: "Loan-to-Cost", value: ltc, benchmark: 75, passes: ltc <= 75,
      rule: "Institutional max is 75%. Above 80% = overleveraged.",
      passAction: "Conservative leverage",
      failAction: "Overleveraged — increase equity contribution" },
    { metric: "Rent-to-Price", value: rtp, benchmark: 0.8, passes: rtp >= 0.8,
      rule: "SFR sweet spot is 0.8-1.0%. Below 0.6% = appreciation-dependent.",
      passAction: "Cash flow market — meets SFR threshold",
      failAction: "Appreciation play — needs strong growth thesis" },
    { metric: "Replacement Cost Discount", value: rcd, benchmark: 0, passes: belowRepl,
      rule: "Buying below replacement cost = competitors can't build cheaper.",
      passAction: "Structural moat — new supply won't undercut you",
      failAction: "Above replacement cost — new construction is a competitive threat" },
    { metric: "Spread to Market Rent", value: smrp, benchmark: 5, passes: smrp >= 5,
      rule: "5%+ below market = organic upside without capex.",
      passAction: "Rent upside exists — capture on lease renewal",
      failAction: "At or above market — no organic rent growth available" },
    { metric: "Equity Multiple", value: em, benchmark: 2.0, passes: em >= 2.0,
      rule: "Institutional minimum is 2.0x over hold period.",
      passAction: "Doubles equity — meets institutional hurdle",
      failAction: "Below 2x — extend hold or improve NOI growth assumptions" },
    { metric: "Levered IRR", value: lirr, benchmark: 15, passes: lirr >= 15,
      rule: "Institutional hurdle rate is 15-20% for value-add SFR.",
      passAction: "Clears hurdle rate",
      failAction: "Below hurdle — improve basis or exit assumptions" },
  ];

  return defs.map(({ passAction, failAction, ...d }) => ({
    ...d, value: r2(d.value), action: d.passes ? passAction : failAction,
  }));
}
