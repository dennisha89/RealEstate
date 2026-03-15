/**
 * Transaction Intelligence Confluence Engine
 * Answers: "How are OTHER buyers behaving in this market?"
 * Stacks buyer composition, bidding dynamics, seller behavior, transaction
 * velocity, and absorption into negotiation leverage. Pure functions.
 */
export interface TransactionIntelligenceInput {
  cashBuyerPct: number; investorPurchasePct: number; firstTimeBuyerPct: number;
  listToSaleRatio: number; avgOfferCount: number; biddingWarPct: number; aboveAskingPct: number;
  sellerConcessionPct: number; avgConcessionAmount: number;
  priceReductionPct: number; avgPriceReduction: number;
  expiredListingPct: number; withdrawnListingPct: number;
  daysToFirstOffer: number; medianDOM: number;
  domTrend: "shortening" | "stable" | "lengthening";
  pendingSalesYoY: number; closedSalesYoY: number;
  monthsOfSupply: number; newListingsYoY: number; absorptionRate: number;
}

interface ComponentScore { score: number; weight: number; source: string }

export interface TransactionIntelligenceResult {
  confluenceScore: number;
  componentScores: {
    buyerComposition: ComponentScore; biddingDynamics: ComponentScore;
    sellerBehavior: ComponentScore; transactionVelocity: ComponentScore;
    absorption: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "BUYERS_MARKET" | "SLIGHT_BUYER_ADVANTAGE" | "BALANCED" | "SLIGHT_SELLER_ADVANTAGE" | "SELLERS_MARKET";
  marketTemperature: "cold" | "cool" | "warm" | "hot" | "overheated";
  negotiationLeverage: number;
  suggestedOfferStrategy: string;
  competitionLevel: string;
  smartMoneySignal: string;
  thesis: string;
  negotiationTips: string[];
  warningSignals: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cl = (v: number) => clamp(Math.round(v), 0, 100);
const W = { buyer: 0.20, bidding: 0.25, seller: 0.25, velocity: 0.15, absorption: 0.15 } as const;

// All scores: higher = more favorable for BUYER (less competition, more leverage)
function scoreBuyerComposition(i: TransactionIntelligenceInput): number {
  const cash = cl(100 - i.cashBuyerPct * 2.5);       // 40% cash => 0 (rate-insensitive competition)
  const investor = cl(100 - i.investorPurchasePct * 2); // 50% => 0 (smart money but competitive)
  const ftb = cl(i.firstTimeBuyerPct * 2.5);          // 40% => 100 (price-sensitive, less aggressive)
  return cl(cash * 0.35 + investor * 0.30 + ftb * 0.35);
}
function scoreBiddingDynamics(i: TransactionIntelligenceInput): number {
  const lts = cl((1.05 - i.listToSaleRatio) / 0.12 * 100); // INVERTED: 0.93=>100, 1.05=>0
  const offers = cl(100 - (i.avgOfferCount - 1) / 4 * 100);
  const wars = cl(100 - i.biddingWarPct * 2);
  const above = cl(100 - i.aboveAskingPct * 2);
  return cl(lts * 0.35 + offers * 0.25 + wars * 0.20 + above * 0.20);
}
function scoreSellerBehavior(i: TransactionIntelligenceInput): number {
  const conc = cl(i.sellerConcessionPct * 2);    // High concessions = seller desperation
  const concAmt = cl(i.avgConcessionAmount / 150);
  const priceRed = cl(i.priceReductionPct * 2);
  const expired = cl(i.expiredListingPct * 4);
  const withdrawn = cl(i.withdrawnListingPct * 4);
  return cl(conc * 0.25 + concAmt * 0.15 + priceRed * 0.25 + expired * 0.20 + withdrawn * 0.15);
}
function scoreTransactionVelocity(i: TransactionIntelligenceInput): number {
  const dom = cl((i.medianDOM - 10) / 80 * 100); // Lengthening DOM = cooling = buyer advantage
  const trend: Record<TransactionIntelligenceInput["domTrend"], number> = { shortening: 20, stable: 50, lengthening: 85 };
  const firstOffer = cl((i.daysToFirstOffer - 3) / 25 * 100);
  const pending = cl(50 - i.pendingSalesYoY * 2.5);
  const closed = cl(50 - i.closedSalesYoY * 2.5);
  return cl(dom * 0.25 + trend[i.domTrend] * 0.20 + firstOffer * 0.15 + pending * 0.20 + closed * 0.20);
}
function scoreAbsorption(i: TransactionIntelligenceInput): number {
  const supply = cl(clamp((i.monthsOfSupply - 2) / 6, 0, 1) * 100); // High supply = buyer's market
  const newList = cl(50 + i.newListingsYoY * 1.5);
  const absRate = cl(100 - i.absorptionRate);
  return cl(supply * 0.40 + newList * 0.25 + absRate * 0.35);
}

function deriveTemp(s: number): TransactionIntelligenceResult["marketTemperature"] {
  return s >= 78 ? "cold" : s >= 58 ? "cool" : s >= 42 ? "warm" : s >= 22 ? "hot" : "overheated";
}
function buildOfferStrategy(i: TransactionIntelligenceInput): string {
  if (i.listToSaleRatio < 0.97 && i.sellerConcessionPct > 20)
    return "Offer 8-12% below asking — sellers are desperate";
  if (i.listToSaleRatio <= 1.00 && i.medianDOM > 30)
    return "Offer 5-8% below asking with contingencies";
  if (i.listToSaleRatio > 1.05)
    return "Expect bidding war — decide max price and escalation clause";
  if (i.listToSaleRatio > 1.02 && i.avgOfferCount > 3)
    return "Offer at asking with strong terms — you're competing";
  if (i.listToSaleRatio >= 0.97 && i.listToSaleRatio <= 1.02)
    return "Offer 2-4% below asking — balanced market allows moderate negotiation";
  return "Offer at or near asking — market conditions are neutral";
}

function buildCompetitionLevel(i: TransactionIntelligenceInput): string {
  if (i.avgOfferCount <= 1.5 && i.biddingWarPct < 10)
    return `Low competition — ${i.avgOfferCount.toFixed(1)} offers per listing`;
  if (i.avgOfferCount <= 3 && i.biddingWarPct < 30)
    return `Moderate competition — ${i.avgOfferCount.toFixed(1)} offers per listing, ${i.biddingWarPct.toFixed(0)}% bidding wars`;
  return `High competition — ${i.avgOfferCount.toFixed(1)} offers per listing, ${i.biddingWarPct.toFixed(0)}% bidding wars`;
}

function buildSmartMoney(i: TransactionIntelligenceInput): string {
  if (i.investorPurchasePct > 25)
    return `Investors at ${i.investorPurchasePct.toFixed(0)}% — above normal, confirms fundamentals`;
  if (i.investorPurchasePct > 15)
    return `Investors at ${i.investorPurchasePct.toFixed(0)}% — normal range, selective deployment`;
  return `Investors at ${i.investorPurchasePct.toFixed(0)}% — below normal, may signal caution or opportunity`;
}

function buildTips(i: TransactionIntelligenceInput, leverage: number): string[] {
  const tips: string[] = [];
  if (i.medianDOM > 45) tips.push(`Median ${i.medianDOM} DOM — use time pressure on stale listings`);
  if (i.sellerConcessionPct > 30) tips.push(`${i.sellerConcessionPct.toFixed(0)}% of sellers offering concessions — always ask`);
  if (i.priceReductionPct > 30) tips.push(`${i.priceReductionPct.toFixed(0)}% of listings have price cuts — track reduction patterns`);
  if (i.expiredListingPct > 10) tips.push(`${i.expiredListingPct.toFixed(0)}% expired listings — approach off-market after expiry`);
  if (leverage > 60 && i.avgOfferCount < 2) tips.push("Low offer volume — submit with inspection contingency intact");
  if (i.cashBuyerPct > 30) tips.push(`${i.cashBuyerPct.toFixed(0)}% cash buyers — if financed, strengthen with large earnest deposit`);
  if (i.listToSaleRatio < 0.98) tips.push("Sellers accepting below asking — anchor low and negotiate up");
  if (i.withdrawnListingPct > 8) tips.push("High withdrawal rate — sellers unsure; patience may yield better terms");
  return tips.slice(0, 5);
}

function buildWarnings(i: TransactionIntelligenceInput): string[] {
  const w: string[] = [];
  if (i.cashBuyerPct > 35) w.push(`Cash buyers at ${i.cashBuyerPct.toFixed(0)}% — financed offers at disadvantage`);
  if (i.listToSaleRatio > 1.05) w.push(`List-to-sale ${i.listToSaleRatio.toFixed(2)} — buyers overpaying in bidding wars`);
  if (i.monthsOfSupply < 2) w.push(`Only ${i.monthsOfSupply.toFixed(1)} months of supply — extreme scarcity`);
  if (i.absorptionRate > 80) w.push(`${i.absorptionRate.toFixed(0)}% absorption — listings vanishing on arrival`);
  if (i.avgOfferCount > 5) w.push(`${i.avgOfferCount.toFixed(1)} offers per listing — waiving contingencies likely required`);
  if (i.pendingSalesYoY > 15) w.push(`Pending sales up ${i.pendingSalesYoY.toFixed(0)}% YoY — competition intensifying`);
  if (i.closedSalesYoY < -20) w.push(`Closed sales down ${Math.abs(i.closedSalesYoY).toFixed(0)}% YoY — liquidity drying up`);
  return w.slice(0, 4);
}

export function computeTransactionIntelligence(input: TransactionIntelligenceInput): TransactionIntelligenceResult {
  const cs: TransactionIntelligenceResult["componentScores"] = {
    buyerComposition: { score: scoreBuyerComposition(input), weight: W.buyer, source: "HMDA + MLS buyer profiles" },
    biddingDynamics: { score: scoreBiddingDynamics(input), weight: W.bidding, source: "MLS offer analytics" },
    sellerBehavior: { score: scoreSellerBehavior(input), weight: W.seller, source: "MLS concession + listing data" },
    transactionVelocity: { score: scoreTransactionVelocity(input), weight: W.velocity, source: "MLS DOM + NAR pending/closed" },
    absorption: { score: scoreAbsorption(input), weight: W.absorption, source: "MLS inventory + absorption metrics" },
  };

  const confluenceScore = cl(Object.values(cs).reduce((s, c) => s + c.score * c.weight, 0));
  const scores = Object.values(cs).map(c => c.score);
  const bull = scores.filter(s => s >= 60).length;
  const bear = scores.filter(s => s < 40).length;

  const agreement: TransactionIntelligenceResult["agreement"] =
    bull >= 4 ? "strong" : bull >= 3 ? "moderate" : bear >= 4 ? "divergent" : "mixed";
  const agreementDetail = `${bull}/5 layers favor buyers (>=60), ${bear}/5 favor sellers (<40). `
    + (agreement === "strong" ? "Near-unanimous buyer advantage across transaction signals."
      : agreement === "moderate" ? "Most transaction layers favor buyers with minor exceptions."
      : agreement === "divergent" ? "Broad seller advantage — competitive market across layers."
      : "Transaction signals split — mixed leverage between buyers and sellers.");

  const verdict: TransactionIntelligenceResult["verdict"] =
    confluenceScore >= 75 ? "BUYERS_MARKET" :
    confluenceScore >= 60 ? "SLIGHT_BUYER_ADVANTAGE" :
    confluenceScore >= 40 ? "BALANCED" :
    confluenceScore >= 25 ? "SLIGHT_SELLER_ADVANTAGE" : "SELLERS_MARKET";

  const marketTemperature = deriveTemp(confluenceScore);
  const negotiationLeverage = cl(confluenceScore * 0.7 + (cs.sellerBehavior.score * 0.15) + (cs.biddingDynamics.score * 0.15));

  const L: Record<string, string> = { buyerComposition: "buyer composition", biddingDynamics: "bidding dynamics",
    sellerBehavior: "seller behavior", transactionVelocity: "transaction velocity", absorption: "absorption" };
  const sorted = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score);
  const top = L[sorted[0][0]], bot = L[sorted[sorted.length - 1][0]];

  let thesis: string;
  if (confluenceScore >= 60) {
    thesis = `${verdict.replace(/_/g, " ")} (${confluenceScore}/100). ${top} leads at ${sorted[0][1].score}. `
      + `${agreement} agreement across ${bull}/5 layers. Negotiate aggressively — leverage is with buyers.`;
  } else if (confluenceScore >= 40) {
    thesis = `BALANCED market (${confluenceScore}/100). ${top} favors buyers, but ${bot} favors sellers. `
      + `Negotiate firmly on property-specific weaknesses rather than relying on macro leverage.`;
  } else {
    thesis = `${verdict.replace(/_/g, " ")} (${confluenceScore}/100). ${bot} at ${sorted[sorted.length - 1][1].score} `
      + `confirms seller control. Compete on terms and speed; price negotiation room is limited.`;
  }

  return {
    confluenceScore, componentScores: cs, agreement, agreementDetail, verdict,
    marketTemperature, negotiationLeverage,
    suggestedOfferStrategy: buildOfferStrategy(input),
    competitionLevel: buildCompetitionLevel(input),
    smartMoneySignal: buildSmartMoney(input),
    thesis,
    negotiationTips: buildTips(input, negotiationLeverage),
    warningSignals: buildWarnings(input),
  };
}
