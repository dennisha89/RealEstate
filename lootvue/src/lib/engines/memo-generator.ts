/**
 * Investment Committee Memo Generator — produces professional-grade investment
 * reports for lenders, partners, or internal records. Pure function, no side effects.
 */

export interface MemoInput {
  property: {
    address: string; city: string; state: string; zip: string;
    price: number; sqft: number; bedrooms: number; bathrooms: number;
    yearBuilt: number; propertyType: string;
  };
  analysis: {
    apexScore: number; prismVerdict: string; convictionScore: number;
    harmonicLevel: string; capRate: number; cashOnCash: number;
    monthlyCashFlow: number; dscr: number; estimatedValue: number;
    predictedAppreciation: number;
  };
  market: {
    name: string; medianPrice: number; priceChange: number;
    capRate: number; popGrowth: number; jobGrowth: number; inventory: number;
  };
  rates: { mortgageRate: number; fedFunds: number; rateDirection: string };
  engineVotes: Array<{ engine: string; vote: string; score: number }>;
  riskLevel: string;
  riskFlags: string[];
  mitigations: string[];
  financing?: {
    loanType: string; downPayment: number;
    interestRate: number; monthlyPayment: number;
  };
  stressTest?: {
    resilience: string; worstSurvivable: string; reservesNeeded: number;
  };
}

export interface InvestmentMemo {
  generatedAt: string;
  sections: {
    executiveSummary: string; investmentOverview: string;
    propertyDescription: string; marketAnalysis: string;
    financialAnalysis: string; riskAssessment: string;
    engineConsensus: string; recommendation: string;
    nextSteps: string[];
  };
  metadata: { apexScore: number; prismVerdict: string; convictionScore: number; riskLevel: string };
}

const fmt = (n: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n: number, d = 1): string => `${n.toFixed(d)}%`;

function verdictAction(v: string): string {
  const u = v.toUpperCase();
  return u.includes("BUY") || u.includes("ACQUIRE") ? "ACQUISITION" : u.includes("HOLD") || u.includes("NEUTRAL") ? "HOLD / MONITOR" : "PASS";
}

function bulls(votes: MemoInput["engineVotes"]): number {
  return votes.filter(v => /buy|bullish|strong|positive/i.test(v.vote)).length;
}

function execSummary(i: MemoInput): string {
  const { property: p, analysis: a, market: m, engineVotes: ev } = i;
  const momentum = m.popGrowth > 2 ? "strong" : m.popGrowth > 1 ? "solid" : "modest";
  return (
    `We recommend ${verdictAction(a.prismVerdict)} of ${p.address}, ${p.city}, ${p.state} at ${fmt(p.price)} ` +
    `(APEX Score: ${a.apexScore}, PRISM Verdict: ${a.prismVerdict.toUpperCase()}, Conviction: ${a.convictionScore}%). ` +
    `The property offers a ${pct(a.capRate)} cap rate with ${fmt(a.monthlyCashFlow)}/month cash flow and ` +
    `${a.dscr.toFixed(2)}x DSCR in a market with ${momentum} demographic momentum ` +
    `(${pct(m.popGrowth)} population growth, ${pct(m.jobGrowth)} job growth). ` +
    `${bulls(ev)} of ${ev.length} analytical engines vote bullish with ${a.harmonicLevel} harmonic alignment. ` +
    `Primary risk: ${i.riskFlags[0] ?? "none identified"}.`
  );
}

function investOverview(i: MemoInput): string {
  const { property: p, analysis: a, financing: f } = i;
  const delta = a.estimatedValue - p.price;
  const valStr = delta > 0
    ? `priced ${((delta / a.estimatedValue) * 100).toFixed(1)}% below estimated value of ${fmt(a.estimatedValue)}, representing ${fmt(delta)} in immediate equity`
    : `priced at ${fmt(p.price)} against an estimated value of ${fmt(a.estimatedValue)}`;
  let text = `The subject property is ${valStr}. Projected 12-month appreciation of ${pct(a.predictedAppreciation)} ` +
    `would yield approximately ${fmt(p.price * a.predictedAppreciation / 100)} in additional equity growth.`;
  if (f) text += ` Financing assumes a ${f.loanType} with ${pct((f.downPayment / p.price) * 100, 0)} down ` +
    `(${fmt(f.downPayment)}) at ${pct(f.interestRate, 2)}, resulting in ${fmt(f.monthlyPayment)}/month debt service.`;
  return text;
}

function propDescription(i: MemoInput): string {
  const p = i.property, age = new Date().getFullYear() - p.yearBuilt, ppsf = p.price / p.sqft;
  return (
    `The subject is a ${p.propertyType} at ${p.address}, ${p.city}, ${p.state} ${p.zip}. ` +
    `Built in ${p.yearBuilt} (${age} years old), it comprises ${p.sqft.toLocaleString()} sqft ` +
    `with ${p.bedrooms} bedrooms and ${p.bathrooms} bathrooms. ` +
    `At ${fmt(p.price)}, acquisition cost is ${fmt(ppsf)}/sqft, ` +
    `${ppsf < i.market.medianPrice / 1200 ? "below" : "in line with"} the local median per-square-foot basis.`
  );
}

function mktAnalysis(i: MemoInput): string {
  const m = i.market, r = i.rates;
  const temp = m.inventory < 3 ? "seller's" : m.inventory < 5 ? "balanced" : "buyer's";
  const dir = m.priceChange > 3 ? "appreciating" : m.priceChange > 0 ? "growing modestly" : "softening";
  const rateTail = r.rateDirection === "declining"
    ? "provides a tailwind as falling rates expand buyer purchasing power"
    : "presents a headwind on buyer affordability that may cap near-term price acceleration";
  return (
    `The ${m.name} market is ${dir} at ${pct(m.priceChange)} YoY with a median price of ${fmt(m.medianPrice)}. ` +
    `At ${m.inventory.toFixed(1)} months of inventory, conditions favor a ${temp} market (area cap rate: ${pct(m.capRate)}). ` +
    `Demographic tailwinds include ${pct(m.popGrowth)} population growth and ${pct(m.jobGrowth)} job growth, ` +
    `which historically correlate with sustained housing demand over 12-24 months. ` +
    `The prevailing rate of ${pct(r.mortgageRate, 2)} (Fed Funds: ${pct(r.fedFunds, 2)}, ${r.rateDirection}) ${rateTail}.`
  );
}

function finAnalysis(i: MemoInput): string {
  const a = i.analysis;
  const qual = a.dscr >= 1.25 ? "comfortably exceeds" : a.dscr >= 1.0 ? "meets" : "falls below";
  let text = `The property generates a ${pct(a.capRate)} cap rate and ${pct(a.cashOnCash)} cash-on-cash return. ` +
    `Monthly net cash flow of ${fmt(a.monthlyCashFlow)} (${fmt(a.monthlyCashFlow * 12)}/year) ${qual} ` +
    `the conventional lender DSCR threshold at ${a.dscr.toFixed(2)}x.`;
  if (i.stressTest) {
    const st = i.stressTest;
    text += ` Stress testing shows ${st.resilience} resilience: the investment survives the ` +
      `${st.worstSurvivable} scenario with recommended reserves of ${fmt(st.reservesNeeded)}.`;
  }
  return text;
}

function riskAssess(i: MemoInput): string {
  let text = `Overall risk is assessed as ${i.riskLevel.toUpperCase()}. `;
  text += i.riskFlags.length > 0 ? `Key concerns: ${i.riskFlags.join("; ")}. ` : "No material risk flags identified. ";
  if (i.mitigations.length > 0) text += `Proposed mitigations: ${i.mitigations.join("; ")}.`;
  return text;
}

function engConsensus(i: MemoInput): string {
  const b = bulls(i.engineVotes), t = i.engineVotes.length;
  const bd = i.engineVotes.map(v => `${v.engine} (${v.vote}, ${v.score}/100)`).join(", ");
  const align = i.analysis.harmonicLevel.toLowerCase().includes("strong")
    ? "high cross-engine agreement supporting conviction in the thesis"
    : "moderate agreement — additional diligence is warranted on divergent signals";
  return `${b} of ${t} analytical engines signal bullish. Engine breakdown: ${bd}. ` +
    `Composite harmonic alignment is ${i.analysis.harmonicLevel}, indicating ${align}.`;
}

function buildRec(i: MemoInput): string {
  const a = i.analysis, action = verdictAction(a.prismVerdict);
  const conv = a.convictionScore >= 75 ? "high" : a.convictionScore >= 50 ? "moderate" : "low";
  return `Based on a ${a.apexScore}/100 APEX score, ${a.prismVerdict.toUpperCase()} PRISM verdict, ` +
    `and ${conv} conviction at ${a.convictionScore}%, our recommendation is ${action}. ` +
    `The investment offers a compelling risk-adjusted return profile supported by favorable ` +
    `market dynamics and strong engine consensus.`;
}

function buildSteps(i: MemoInput): string[] {
  const action = verdictAction(i.analysis.prismVerdict);
  if (action === "ACQUISITION") {
    const s = [
      "Order professional property inspection and appraisal.",
      "Confirm rental comps and projected NOI with local property manager.",
      "Secure financing pre-approval and lock rate within 30 days.",
    ];
    if (i.riskFlags.length > 0) s.push(`Address identified risk: ${i.riskFlags[0]}.`);
    s.push("Submit offer with appropriate contingencies and target 30-day close.");
    return s;
  }
  if (action === "HOLD / MONITOR") return [
    "Set price alert for 5% reduction from current asking.",
    "Monitor market inventory and days-on-market trends monthly.",
    "Re-evaluate in 60-90 days as rate environment evolves.",
  ];
  return [
    "Archive deal for future reference if market conditions change.",
    "Redirect capital allocation toward higher-conviction opportunities.",
  ];
}

export function generateInvestmentMemo(input: MemoInput): InvestmentMemo {
  return {
    generatedAt: new Date().toISOString(),
    sections: {
      executiveSummary: execSummary(input),
      investmentOverview: investOverview(input),
      propertyDescription: propDescription(input),
      marketAnalysis: mktAnalysis(input),
      financialAnalysis: finAnalysis(input),
      riskAssessment: riskAssess(input),
      engineConsensus: engConsensus(input),
      recommendation: buildRec(input),
      nextSteps: buildSteps(input),
    },
    metadata: {
      apexScore: input.analysis.apexScore,
      prismVerdict: input.analysis.prismVerdict,
      convictionScore: input.analysis.convictionScore,
      riskLevel: input.riskLevel,
    },
  };
}
