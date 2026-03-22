// ============================================================
// Deal Finder Engine
// Scans markets for opportunities matching configurable criteria
// ============================================================

import type {
  DealCriteria,
  DealResult,
  DealType,
  CompProperty,
  HyperScore,
} from "../types/market-intelligence";

/**
 * Classify what type of deal a property represents
 */
export function classifyDealType(
  property: CompProperty,
  compImpliedValue: number,
  monthlyCashFlow: number,
  projectedAppreciation: number,
  daysOnMarket: number
): DealType[] {
  const dealTypes: DealType[] = [];

  // Below market value: priced 10%+ below comp-implied value
  const discount = (compImpliedValue - property.price) / compImpliedValue;
  if (discount > 0.10) {
    dealTypes.push("below_market_value");
  }

  // Cash flow play: strong monthly cash flow
  if (monthlyCashFlow > 300) {
    dealTypes.push("cash_flow_play");
  }

  // Appreciation bet: high projected appreciation (>5% 1yr)
  if (projectedAppreciation > 5) {
    dealTypes.push("appreciation_bet");
  }

  // Motivated seller: high DOM
  if (daysOnMarket > 60) {
    dealTypes.push("motivated_seller");
  }

  // Default to below_market_value if no category matched
  if (dealTypes.length === 0) {
    dealTypes.push("below_market_value");
  }

  return dealTypes;
}

/**
 * Determine urgency level based on deal characteristics
 */
export function assessUrgency(
  discount: number,
  daysOnMarket: number,
  monthsOfInventory: number,
  listToSaleRatio: number
): "act_now" | "move_fast" | "standard" | "watch" {
  // Act now: massive discount in a hot market
  if (discount > 0.15 && monthsOfInventory < 3) return "act_now";

  // Move fast: good discount, competitive market
  if (discount > 0.10 && listToSaleRatio > 0.98) return "move_fast";

  // Watch: property has been sitting, negotiate
  if (daysOnMarket > 90) return "watch";

  return "standard";
}

/**
 * Score a property against deal criteria and return a DealResult
 */
export function evaluateDeal(
  property: CompProperty,
  compImpliedValue: number,
  monthlyCashFlow: number,
  projectedAppreciation: number,
  hyperScore: number,
  monthsOfInventory: number,
  listToSaleRatio: number
): DealResult {
  const discount = (compImpliedValue - property.price) / compImpliedValue;
  const daysOnMarket = property.daysOnMarket ?? 0;

  const dealTypes = classifyDealType(
    property,
    compImpliedValue,
    monthlyCashFlow,
    projectedAppreciation,
    daysOnMarket
  );

  const urgency = assessUrgency(discount, daysOnMarket, monthsOfInventory, listToSaleRatio);

  // Build reasons
  const keyReasons: string[] = [];
  if (discount > 0.10) {
    keyReasons.push(`${(discount * 100).toFixed(1)}% below comp-implied value ($${compImpliedValue.toLocaleString()})`);
  }
  if (monthlyCashFlow > 300) {
    keyReasons.push(`$${monthlyCashFlow.toLocaleString()}/mo projected cash flow`);
  }
  if (projectedAppreciation > 5) {
    keyReasons.push(`${projectedAppreciation.toFixed(1)}% projected 1yr appreciation`);
  }
  if (daysOnMarket > 60) {
    keyReasons.push(`${daysOnMarket} days on market (motivated seller)`);
  }
  if (hyperScore > 75) {
    keyReasons.push(`HyperScore: ${hyperScore} (strong market fundamentals)`);
  }

  // Build risks
  const risks: string[] = [];
  if (discount > 0.25) {
    risks.push("Extreme discount may indicate hidden issues");
  }
  if (daysOnMarket > 120) {
    risks.push("Very long time on market - investigate why");
  }
  if (monthsOfInventory > 6) {
    risks.push("Buyer's market - appreciation risk");
  }
  if (hyperScore < 50) {
    risks.push("Below-average market fundamentals");
  }

  return {
    property,
    dealType: dealTypes[0], // Primary deal type
    hyperScore,
    estimatedDiscount: Math.round(discount * 1000) / 10,
    projectedCashFlow: monthlyCashFlow,
    projectedAppreciation,
    urgency,
    keyReasons,
    risks,
  };
}

/**
 * Filter properties against deal criteria
 */
export function filterByCriteria(
  properties: CompProperty[],
  criteria: DealCriteria
): CompProperty[] {
  return properties.filter(p => {
    if (p.price < criteria.priceRange.min || p.price > criteria.priceRange.max) return false;
    if (criteria.minBedrooms && p.bedrooms < criteria.minBedrooms) return false;
    if (criteria.minSqft && p.sqft < criteria.minSqft) return false;
    if (criteria.maxDaysOnMarket && p.daysOnMarket && p.daysOnMarket > criteria.maxDaysOnMarket) return false;
    return true;
  });
}

/**
 * Rank deals by composite score
 */
export function rankDeals(deals: DealResult[]): DealResult[] {
  return [...deals].sort((a, b) => {
    // Primary sort: urgency
    const urgencyOrder = { act_now: 0, move_fast: 1, standard: 2, watch: 3 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    // Secondary sort: hyper score
    return b.hyperScore - a.hyperScore;
  });
}

/**
 * Run the full deal scan pipeline
 */
export function scanForDeals(
  allProperties: CompProperty[],
  criteria: DealCriteria,
  evaluator: (property: CompProperty) => DealResult
): DealResult[] {
  // Filter by basic criteria
  const filtered = filterByCriteria(allProperties, criteria);

  // Evaluate each property
  const deals = filtered.map(evaluator);

  // Filter by deal-specific criteria
  const qualifiedDeals = deals.filter(deal => {
    if (criteria.minCashFlow && deal.projectedCashFlow < criteria.minCashFlow) return false;
    if (criteria.minHyperScore && deal.hyperScore < criteria.minHyperScore) return false;
    if (criteria.dealTypes.length > 0 && !criteria.dealTypes.includes(deal.dealType)) return false;
    return true;
  });

  // Rank and return
  return rankDeals(qualifiedDeals);
}
