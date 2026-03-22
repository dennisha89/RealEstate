/** Engine Validation & Financial Guardrails */

import { z } from "zod";

// -- Zod Schemas -----------------------------------------------

export const RawSignalInputSchema = z.object({
  permitGrowth: z.number().optional(),
  mortgageRateChange: z.number().optional(),
  migrationInflow: z.number().optional(),
  googleTrendsDelta: z.number().optional(),
  secFormDVolume: z.number().optional(),
  hmdaInvestorLoanDelta: z.number().optional(),
  inventoryMonths: z.number().optional(),
  daysOnMarket: z.number().optional(),
  priceCutPercent: z.number().optional(),
  investorPurchaseShare: z.number().optional(),
  capRate: z.number().optional(),
  yelpNewBusinesses: z.number().optional(),
  unemploymentRate: z.number().optional(),
  jobGrowthRate: z.number().optional(),
  popGrowthRate: z.number().optional(),
  priceToIncomeRatio: z.number().optional(),
  priceToRentRatio: z.number().optional(),
  m2VelocityChange: z.number().optional(),
});

export const TimingInputSchema = z.object({
  compositeScore: z.number().min(-100).max(100),
  compositeScorePrevMonth: z.number().min(-100).max(100),
  probability: z.number().min(0).max(100),
  permitGrowth: z.number(),
  mortgageRateChange: z.number(),
  migrationInflow: z.number(),
  currentMonth: z.number().int().min(1).max(12),
  inventoryMonths: z.number().min(0),
  daysOnMarket: z.number().min(0),
  priceCutPercent: z.number().min(0).max(100),
});

export const FinancialInputSchema = z.object({
  purchasePrice: z.number().positive(),
  estimatedValue: z.number().positive(),
  monthlyRent: z.number().nonnegative(),
  downPaymentPct: z.number().min(0).max(100),
  interestRate: z.number().min(0).max(30),
  loanTermYears: z.number().int().positive().optional(),
  propertyTaxRate: z.number().min(0).max(0.1).optional(),
  insuranceRate: z.number().min(0).max(0.1).optional(),
  managementPct: z.number().min(0).max(1).optional(),
  maintenancePct: z.number().min(0).max(0.1).optional(),
  capexPct: z.number().min(0).max(0.1).optional(),
  vacancyPct: z.number().min(0).max(1).optional(),
});

const TimeSeriesDataSchema = z.object({
  current: z.number(),
  oneYearAgo: z.number(),
  threeYearAgo: z.number(),
  fiveYearAgo: z.number(),
  nationalAvg: z.number().optional(),
});

export const RawMacroRiskDataSchema = z.object({
  interestRate: z.object({
    current: z.number().min(0).max(30),
    forecastDirection: z.enum(["rising", "stable", "falling"]),
    loanAmount: z.number().positive(),
    loanTermYears: z.number().int().positive(),
  }),
  propertyTax: z.object({
    currentRate: z.number().min(0).max(0.1),
    assessmentHistory: TimeSeriesDataSchema,
  }),
  insurance: z.object({
    floodZone: z.boolean(),
    floodZoneType: z.string().optional(),
    wildfireRisk: z.enum(["low", "moderate", "high", "extreme"]),
    hurricaneRisk: z.enum(["low", "moderate", "high"]),
    earthquakeRisk: z.enum(["low", "moderate", "high"]),
    insuranceCostHistory: TimeSeriesDataSchema,
  }),
  climate: z.object({
    overallScore: z.number().min(0).max(100),
    heatRisk: z.enum(["low", "moderate", "high"]),
    seaLevelRisk: z.enum(["none", "low", "moderate", "high"]),
    droughtRisk: z.enum(["low", "moderate", "high"]),
  }),
  regulatory: z.object({
    rentControlActive: z.boolean(),
    rentControlProposed: z.boolean(),
    evictionMoratoriumHistory: z.boolean(),
    landlordFriendlinessScore: z.number().min(0).max(100),
  }),
  marketCyclePosition: z.enum([
    "recovery", "early_expansion", "late_expansion", "peak", "contraction",
  ]),
});

// -- Financial Guardrails --------------------------------------

export interface GuardrailWarning {
  field: string;
  value: number;
  expectedRange: [number, number];
  severity: "info" | "warning" | "critical";
  message: string;
}

interface GuardrailRule {
  warn: [number, number];
  critical: [number, number];
  label: string;
}

const GUARDRAILS: Record<string, GuardrailRule> = {
  capRate:          { warn: [1, 15],    critical: [0, 20],    label: "Cap rate" },
  dscr:            { warn: [0.5, 3.0], critical: [0, 5.0],   label: "DSCR" },
  cashOnCash:      { warn: [-20, 40],  critical: [-50, 80],  label: "Cash-on-cash return" },
  priceToIncome:   { warn: [1, 12],    critical: [0.5, 20],  label: "Price-to-income ratio" },
  priceToRent:     { warn: [5, 40],    critical: [2, 60],    label: "Price-to-rent ratio" },
  appreciation:    { warn: [-15, 25],  critical: [-30, 50],  label: "Annual appreciation" },
  vacancy:         { warn: [0, 30],    critical: [0, 50],    label: "Vacancy rate" },
  mortgageRate:    { warn: [2, 15],    critical: [0, 25],    label: "Mortgage rate" },
  affordabilityIndex: { warn: [10, 60], critical: [5, 80],   label: "Affordability index" },
};

export function checkFinancialGuardrails(data: {
  capRate?: number;
  dscr?: number;
  cashOnCash?: number;
  priceToIncome?: number;
  priceToRent?: number;
  appreciation?: number;
  vacancy?: number;
  mortgageRate?: number;
  affordabilityIndex?: number;
}): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];

  for (const [field, rule] of Object.entries(GUARDRAILS)) {
    const value = data[field as keyof typeof data];
    if (value == null) continue;

    const [cLo, cHi] = rule.critical;
    const [wLo, wHi] = rule.warn;

    if (value < cLo || value > cHi) {
      warnings.push({
        field, value, expectedRange: rule.warn, severity: "critical",
        message: `${rule.label} (${value}) is far outside typical range [${wLo}, ${wHi}]`,
      });
    } else if (value < wLo || value > wHi) {
      warnings.push({
        field, value, expectedRange: rule.warn, severity: "warning",
        message: `${rule.label} (${value}) is outside normal range [${wLo}, ${wHi}]`,
      });
    }
  }

  return warnings;
}

// -- Validated Engine Runner ------------------------------------

export interface ValidatedResult<TOutput> {
  result: TOutput;
  warnings: GuardrailWarning[];
  validationErrors?: z.ZodError;
}

/** Wraps any engine call with Zod validation + guardrail checks. */
export function validateAndRun<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  engine: (input: TInput) => TOutput,
  rawInput: unknown,
): ValidatedResult<TOutput> {
  const parsed = schema.parse(rawInput);
  const numericFields: Record<string, number> = {};
  if (parsed && typeof parsed === "object") {
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof val === "number") {
        numericFields[key] = val;
      }
    }
  }

  const warnings = checkFinancialGuardrails(numericFields);
  const result = engine(parsed);

  return { result, warnings };
}
