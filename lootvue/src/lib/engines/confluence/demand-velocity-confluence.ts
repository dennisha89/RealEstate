/**
 * Demand Velocity Confluence Engine — "HOW STRONG is housing demand?"
 * Stacks 6 independent demand layers. Organic (migration+jobs+demographics) vs
 * speculative (investor+1031): organic >60% = sustainable. Pure functions.
 */
export interface DemandVelocityInput {
  uspsInboundRatio: number; irsMigrationNetHouseholds: number; irsMigrationNetIncome: number;
  migrationTrend: "accelerating" | "stable" | "decelerating" | "reversing";
  jobGrowthRate: number; corporateRelocationJobs: number; h1bVisaApprovals: number; remoteWorkAdoption: number;
  googleTrendsIndex: number; googleTrendsYoY: number; listingViewsPerProperty: number; searchToListingRatio: number;
  householdFormationRate: number; millennialShareOfBuyers: number; firstTimeBuyerShare: number; medianAge: number;
  utilityNewConnections: number; utilityConnectionsYoY: number;
  kindergartenEnrollmentChange: number; schoolCapacityUtilization: number;
  investorPurchaseShare: number; investorShareChange: number;
  exchange1031Inflows: number; hmdaInvestorLoanGrowth: number;
}
interface ComponentScore { score: number; weight: number; source: string }
export interface DemandVelocityResult {
  confluenceScore: number;
  componentScores: {
    physicalMigration: ComponentScore; economicDrivers: ComponentScore;
    digitalDemand: ComponentScore; demographicDemand: ComponentScore;
    infrastructureDemand: ComponentScore; investorDemand: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "SURGE" | "STRONG" | "GROWING" | "STABLE" | "WEAKENING" | "COLLAPSING";
  demandSources: string; sustainabilityAssessment: string;
  generationalImpact: string; leadingIndicators: string;
  thesis: string; demandCatalysts: string[]; demandRisks: string[];
}

const W = { physicalMigration: 0.25, economicDrivers: 0.20, digitalDemand: 0.15,
  demographicDemand: 0.15, infrastructureDemand: 0.10, investorDemand: 0.15 } as const;
const TREND_MOD: Record<DemandVelocityInput["migrationTrend"], number> = {
  accelerating: 15, stable: 0, decelerating: -10, reversing: -25 };
const LABELS: Record<string, string> = { physicalMigration: "Physical migration",
  economicDrivers: "Economic drivers", digitalDemand: "Digital demand",
  demographicDemand: "Demographics", infrastructureDemand: "Infrastructure",
  investorDemand: "Investor demand" };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cl = (v: number) => clamp(Math.round(v), 0, 100);

function scorePhysicalMigration(i: DemandVelocityInput): number {
  const ratio = cl((i.uspsInboundRatio - 0.8) / 0.8 * 100);
  const hh = cl(50 + i.irsMigrationNetHouseholds / 200);
  const income = cl(50 + i.irsMigrationNetIncome / 2_000_000_000);
  return cl(ratio * 0.4 + hh * 0.3 + income * 0.3 + TREND_MOD[i.migrationTrend]);
}
function scoreEconomicDrivers(i: DemandVelocityInput): number {
  return cl(cl(i.jobGrowthRate / 6 * 100) * 0.4 + cl(i.corporateRelocationJobs / 50) * 0.25
    + cl(i.h1bVisaApprovals / 100) * 0.15 + cl(i.remoteWorkAdoption / 40 * 100) * 0.2);
}
function scoreDigitalDemand(i: DemandVelocityInput): number {
  return cl(cl(i.googleTrendsIndex) * 0.25 + cl(50 + i.googleTrendsYoY * 2) * 0.25
    + cl(i.listingViewsPerProperty / 5) * 0.25 + cl(i.searchToListingRatio / 30 * 100) * 0.25);
}
function scoreDemographicDemand(i: DemandVelocityInput): number {
  const agePeak = clamp(100 - Math.abs(i.medianAge - 31.5) * 5, 0, 100);
  return cl(cl(i.householdFormationRate / 3 * 100) * 0.3 + cl(i.millennialShareOfBuyers / 50 * 100) * 0.25
    + cl(i.firstTimeBuyerShare / 50 * 100) * 0.2 + agePeak * 0.25);
}
function scoreInfrastructureDemand(i: DemandVelocityInput): number {
  return cl(cl(i.utilityNewConnections / 10) * 0.25 + cl(50 + i.utilityConnectionsYoY * 3) * 0.25
    + cl(50 + i.kindergartenEnrollmentChange * 5) * 0.25 + cl(i.schoolCapacityUtilization) * 0.25);
}
function scoreInvestorDemand(i: DemandVelocityInput): number {
  return cl(cl(i.investorPurchaseShare / 40 * 100) * 0.3 + cl(50 + i.investorShareChange * 5) * 0.2
    + cl(i.exchange1031Inflows / 5_000_000) * 0.25 + cl(50 + i.hmdaInvestorLoanGrowth * 3) * 0.25);
}

function assessSustainability(cs: DemandVelocityResult["componentScores"]): string {
  const organic = cs.physicalMigration.score * W.physicalMigration
    + cs.economicDrivers.score * W.economicDrivers + cs.demographicDemand.score * W.demographicDemand;
  const total = Object.values(cs).reduce((s, c) => s + c.score * c.weight, 0);
  const pct = total > 0 ? Math.round(organic / total * 100) : 50;
  if (pct >= 60) return `Sustainable: ${pct}% organic demand (migration + jobs + demographics). Broad-based growth with low reversal risk.`;
  if (pct >= 40) return `Mixed: ${pct}% organic demand. Investor capital provides a floor, but monitor for speculative overheating.`;
  return `Fragile: only ${pct}% organic demand. Heavy investor dependence creates pullback risk if sentiment shifts.`;
}
function assessGenerational(i: DemandVelocityInput): string {
  if (i.medianAge >= 28 && i.medianAge <= 35 && i.millennialShareOfBuyers >= 35)
    return `Peak buying zone: median age ${i.medianAge} with ${i.millennialShareOfBuyers}% millennial buyers. Multi-year demand wave.`;
  if (i.millennialShareOfBuyers >= 30)
    return `Millennial cohort active at ${i.millennialShareOfBuyers}% of purchases. Sustained demand from largest generation since boomers.`;
  if (i.firstTimeBuyerShare >= 35)
    return `First-time buyers at ${i.firstTimeBuyerShare}% signal fresh demand. Not yet saturated by move-up or investor activity.`;
  return `Moderate generational impact. Median age ${i.medianAge} with ${i.millennialShareOfBuyers}% millennial share.`;
}
function assessLeadingIndicators(i: DemandVelocityInput): string {
  const s: string[] = [];
  if (i.kindergartenEnrollmentChange > 3) s.push(`kindergarten enrollment up ${i.kindergartenEnrollmentChange.toFixed(0)}% — families committing 5+ years`);
  if (i.utilityConnectionsYoY > 5) s.push(`utility connections up ${i.utilityConnectionsYoY.toFixed(0)}% — physical move-in proof`);
  if (i.googleTrendsYoY > 15) s.push(`search interest up ${i.googleTrendsYoY.toFixed(0)}% YoY — demand wave building`);
  if (i.migrationTrend === "accelerating") s.push("migration accelerating — inflow pipeline strengthening");
  return s.length > 0 ? `Leading signals: ${s.join("; ")}.` : "No strong leading indicators — demand trajectory unclear.";
}
function buildDemandSources(cs: DemandVelocityResult["componentScores"]): string {
  const top = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score)
    .filter(([, v]) => v.score >= 60).map(([k]) => LABELS[k]);
  if (top.length >= 2) return `Demand driven primarily by ${top.slice(0, 2).join(" and ")}, with ${top.length - 2} additional sources.`;
  if (top.length === 1) return `Demand concentrated in ${top[0]}. Narrow base increases risk if that driver weakens.`;
  return "No dominant demand driver above threshold. Broad weakness across signal layers.";
}
function buildCatalysts(cs: DemandVelocityResult["componentScores"], i: DemandVelocityInput): string[] {
  const r: string[] = [];
  if (cs.physicalMigration.score >= 70) r.push(`Net migration: USPS ratio ${i.uspsInboundRatio.toFixed(2)}, IRS net ${i.irsMigrationNetHouseholds.toLocaleString()} households`);
  if (cs.economicDrivers.score >= 70) r.push(`Jobs at ${i.jobGrowthRate.toFixed(1)}% growth with ${i.corporateRelocationJobs.toLocaleString()} relocation jobs`);
  if (cs.digitalDemand.score >= 70) r.push(`Digital demand surging: Trends ${i.googleTrendsIndex}, ${i.listingViewsPerProperty} views/property`);
  if (cs.demographicDemand.score >= 70) r.push(`Demographics: ${i.householdFormationRate.toFixed(1)}% formation, ${i.millennialShareOfBuyers}% millennial buyers`);
  if (cs.infrastructureDemand.score >= 70) r.push(`Infrastructure: ${i.utilityNewConnections} new connections, school capacity ${i.schoolCapacityUtilization}%`);
  if (cs.investorDemand.score >= 70) r.push(`Smart money: ${i.investorPurchaseShare}% investor share, 1031 inflows $${(i.exchange1031Inflows / 1_000_000).toFixed(0)}M`);
  return r.slice(0, 4);
}
function buildRisks(cs: DemandVelocityResult["componentScores"], i: DemandVelocityInput): string[] {
  const r: string[] = [];
  if (cs.physicalMigration.score < 40) r.push("Weak or negative migration — population base eroding");
  if (cs.economicDrivers.score < 40) r.push("Insufficient job growth to sustain housing demand");
  if (i.investorPurchaseShare > 30) r.push(`High investor share (${i.investorPurchaseShare}%) — vulnerable to pullback`);
  if (i.migrationTrend === "reversing") r.push("Migration reversing — inflows turning to outflows");
  if (cs.demographicDemand.score < 40) r.push("Unfavorable demographics — aging population or low household formation");
  if (i.kindergartenEnrollmentChange < -3) r.push(`Kindergarten enrollment declining ${i.kindergartenEnrollmentChange.toFixed(0)}% — families leaving`);
  if (cs.digitalDemand.score < 30) r.push("Declining search interest — demand evaporating before transactions");
  return r.slice(0, 4);
}

export function computeDemandVelocityConfluence(input: DemandVelocityInput): DemandVelocityResult {
  const cs: DemandVelocityResult["componentScores"] = {
    physicalMigration: { score: scorePhysicalMigration(input), weight: W.physicalMigration, source: "USPS + IRS SOI Migration Data" },
    economicDrivers: { score: scoreEconomicDrivers(input), weight: W.economicDrivers, source: "BLS Jobs + Corporate Relocations + USCIS" },
    digitalDemand: { score: scoreDigitalDemand(input), weight: W.digitalDemand, source: "Google Trends + Listing Analytics" },
    demographicDemand: { score: scoreDemographicDemand(input), weight: W.demographicDemand, source: "Census ACS + HMDA Buyer Demographics" },
    infrastructureDemand: { score: scoreInfrastructureDemand(input), weight: W.infrastructureDemand, source: "Utility Commissions + School District Data" },
    investorDemand: { score: scoreInvestorDemand(input), weight: W.investorDemand, source: "HMDA Investor Loans + 1031 Exchange Data" },
  };
  const confluenceScore = cl(Object.values(cs).reduce((s, c) => s + c.score * c.weight, 0));
  const bull = Object.values(cs).filter(c => c.score >= 60).length;
  const bear = Object.values(cs).filter(c => c.score < 40).length;
  const agreement: DemandVelocityResult["agreement"] =
    bull >= 5 ? "strong" : bull >= 4 ? "moderate" : bear >= 4 ? "divergent" : "mixed";
  const agreementDetail = `${bull}/6 demand layers bullish (>=60), ${bear}/6 bearish (<40). `
    + (agreement === "strong" ? "Near-unanimous demand strength across independent signal sources."
      : agreement === "moderate" ? "Most demand layers confirm strength with minor gaps."
      : agreement === "divergent" ? "Broad demand weakness — multiple layers signaling decline."
      : "Demand signals split — strength in some layers offset by weakness in others.");
  const verdict: DemandVelocityResult["verdict"] =
    confluenceScore >= 82 && agreement !== "divergent" ? "SURGE" :
    confluenceScore >= 68 ? "STRONG" : confluenceScore >= 55 ? "GROWING" :
    confluenceScore >= 40 ? "STABLE" : confluenceScore >= 25 ? "WEAKENING" : "COLLAPSING";
  const sorted = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score);
  const top = LABELS[sorted[0][0]], bot = LABELS[sorted[sorted.length - 1][0]];
  let thesis: string;
  if (confluenceScore >= 68) {
    thesis = `${bull}/6 demand layers confirm strength at ${confluenceScore}/100. ${top} leads. `
      + `${assessSustainability(cs).split(":")[0]} demand profile supports conviction for capital deployment.`;
  } else if (confluenceScore >= 40) {
    thesis = `Demand confluence at ${confluenceScore}/100 with ${agreement} agreement. ${top} shows strength, `
      + `but ${bot} lags. Validate property-level demand before committing.`;
  } else {
    thesis = `Weak demand confluence at ${confluenceScore}/100. ${bot} is the primary drag. `
      + `Wait for catalysts or target distressed pricing to compensate for softness.`;
  }
  return {
    confluenceScore, componentScores: cs, agreement, agreementDetail, verdict,
    demandSources: buildDemandSources(cs), sustainabilityAssessment: assessSustainability(cs),
    generationalImpact: assessGenerational(input), leadingIndicators: assessLeadingIndicators(input),
    thesis, demandCatalysts: buildCatalysts(cs, input), demandRisks: buildRisks(cs, input),
  };
}
