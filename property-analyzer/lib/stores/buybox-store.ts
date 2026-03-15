import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BuyBoxCriteria {
  // Price
  minPrice: number;
  maxPrice: number;

  // Returns
  minCapRate: number;
  minCashFlow: number;
  minCashOnCash: number;
  minDSCR: number;

  // Property
  propertyTypes: string[];
  minBedrooms: number;
  maxAge: number;

  // Market
  targetMarkets: string[];
  minApexScore: number;

  // Risk
  maxDOM: number;
  requirePositiveCashFlow: boolean;
  requireStressTestPass: boolean;

  // Scoring
  prioritize: "cash_flow" | "appreciation" | "value" | "balanced";
}

export interface MatchResult {
  passes: boolean;
  failedCriteria: string[];
  matchScore: number;
}

export interface PropertyCandidate {
  price: number;
  capRate: number;
  monthlyCashFlow: number;
  cashOnCash: number;
  dscr: number;
  propertyType: string;
  bedrooms: number;
  yearBuilt: number;
  hyperScore: number;
  daysOnMarket: number;
}

const DEFAULT_CRITERIA: BuyBoxCriteria = {
  minPrice: 150_000,
  maxPrice: 500_000,
  minCapRate: 5,
  minCashFlow: 200,
  minCashOnCash: 6,
  minDSCR: 1.1,
  propertyTypes: ["sfr", "duplex"],
  minBedrooms: 2,
  maxAge: 50,
  targetMarkets: [],
  minApexScore: 55,
  maxDOM: 120,
  requirePositiveCashFlow: true,
  requireStressTestPass: false,
  prioritize: "balanced",
};

// Weight each criterion category for the composite match score
const CRITERION_WEIGHTS: Record<string, number> = {
  price: 10,
  capRate: 15,
  cashFlow: 15,
  cashOnCash: 10,
  dscr: 10,
  propertyType: 10,
  bedrooms: 5,
  age: 5,
  apexScore: 10,
  dom: 5,
  positiveCashFlow: 5,
};

function computeMatchScore(
  criteria: BuyBoxCriteria,
  property: PropertyCandidate
): { failedCriteria: string[]; matchScore: number } {
  const failedCriteria: string[] = [];
  let earnedWeight = 0;
  let totalWeight = 0;

  // --- Price ---
  totalWeight += CRITERION_WEIGHTS.price;
  if (property.price < criteria.minPrice) {
    failedCriteria.push("price_below_min");
  } else if (property.price > criteria.maxPrice) {
    failedCriteria.push("price_above_max");
  } else {
    earnedWeight += CRITERION_WEIGHTS.price;
  }

  // --- Cap Rate ---
  totalWeight += CRITERION_WEIGHTS.capRate;
  if (property.capRate < criteria.minCapRate) {
    failedCriteria.push("cap_rate_too_low");
  } else {
    // Bonus: how far above minimum (up to 2x weight)
    const capExcess = Math.min(
      (property.capRate - criteria.minCapRate) / criteria.minCapRate,
      1
    );
    earnedWeight += CRITERION_WEIGHTS.capRate * (1 + capExcess * 0.5);
  }

  // --- Monthly Cash Flow ---
  totalWeight += CRITERION_WEIGHTS.cashFlow;
  if (property.monthlyCashFlow < criteria.minCashFlow) {
    failedCriteria.push("cash_flow_too_low");
  } else {
    const cfExcess = Math.min(
      (property.monthlyCashFlow - criteria.minCashFlow) / Math.max(criteria.minCashFlow, 1),
      1
    );
    earnedWeight += CRITERION_WEIGHTS.cashFlow * (1 + cfExcess * 0.5);
  }

  // --- Cash on Cash ---
  totalWeight += CRITERION_WEIGHTS.cashOnCash;
  if (property.cashOnCash < criteria.minCashOnCash) {
    failedCriteria.push("cash_on_cash_too_low");
  } else {
    earnedWeight += CRITERION_WEIGHTS.cashOnCash;
  }

  // --- DSCR ---
  totalWeight += CRITERION_WEIGHTS.dscr;
  if (property.dscr < criteria.minDSCR) {
    failedCriteria.push("dscr_too_low");
  } else {
    earnedWeight += CRITERION_WEIGHTS.dscr;
  }

  // --- Property Type ---
  totalWeight += CRITERION_WEIGHTS.propertyType;
  if (
    criteria.propertyTypes.length > 0 &&
    !criteria.propertyTypes.includes(property.propertyType.toLowerCase())
  ) {
    failedCriteria.push("property_type_mismatch");
  } else {
    earnedWeight += CRITERION_WEIGHTS.propertyType;
  }

  // --- Bedrooms ---
  totalWeight += CRITERION_WEIGHTS.bedrooms;
  if (property.bedrooms < criteria.minBedrooms) {
    failedCriteria.push("bedrooms_too_few");
  } else {
    earnedWeight += CRITERION_WEIGHTS.bedrooms;
  }

  // --- Age ---
  totalWeight += CRITERION_WEIGHTS.age;
  const currentYear = new Date().getFullYear();
  const propertyAge = currentYear - property.yearBuilt;
  if (propertyAge > criteria.maxAge) {
    failedCriteria.push("property_too_old");
  } else {
    earnedWeight += CRITERION_WEIGHTS.age;
  }

  // --- APEX / HyperScore ---
  totalWeight += CRITERION_WEIGHTS.apexScore;
  if (property.hyperScore < criteria.minApexScore) {
    failedCriteria.push("apex_score_too_low");
  } else {
    const scoreExcess = Math.min(
      (property.hyperScore - criteria.minApexScore) / (100 - criteria.minApexScore || 1),
      1
    );
    earnedWeight += CRITERION_WEIGHTS.apexScore * (1 + scoreExcess * 0.3);
  }

  // --- Days on Market ---
  totalWeight += CRITERION_WEIGHTS.dom;
  if (property.daysOnMarket > criteria.maxDOM) {
    failedCriteria.push("days_on_market_exceeded");
  } else {
    earnedWeight += CRITERION_WEIGHTS.dom;
  }

  // --- Positive Cash Flow ---
  if (criteria.requirePositiveCashFlow) {
    totalWeight += CRITERION_WEIGHTS.positiveCashFlow;
    if (property.monthlyCashFlow <= 0) {
      failedCriteria.push("negative_cash_flow");
    } else {
      earnedWeight += CRITERION_WEIGHTS.positiveCashFlow;
    }
  }

  // Normalize to 0-100, capping bonus points at 100
  const rawScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
  const matchScore = Math.round(Math.min(rawScore, 100));

  return { failedCriteria, matchScore };
}

interface BuyBoxState {
  criteria: BuyBoxCriteria;
  setCriteria: (criteria: Partial<BuyBoxCriteria>) => void;
  resetCriteria: () => void;
  matchesBox: (property: PropertyCandidate) => MatchResult;
}

export const useBuyBoxStore = create<BuyBoxState>()(
  persist(
    (set, get) => ({
      criteria: { ...DEFAULT_CRITERIA },

      setCriteria: (partial) =>
        set((state) => ({
          criteria: { ...state.criteria, ...partial },
        })),

      resetCriteria: () =>
        set(() => ({
          criteria: { ...DEFAULT_CRITERIA },
        })),

      matchesBox: (property) => {
        const { criteria } = get();
        const { failedCriteria, matchScore } = computeMatchScore(
          criteria,
          property
        );
        return {
          passes: failedCriteria.length === 0,
          failedCriteria,
          matchScore,
        };
      },
    }),
    {
      name: "buybox-store",
    }
  )
);

export { DEFAULT_CRITERIA };
