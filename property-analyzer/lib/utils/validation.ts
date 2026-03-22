import { z } from "zod";

// =============================================================================
// Shared schemas reused across multiple routes
// =============================================================================

/** US street address — basic sanitization + length check */
export const addressSchema = z
  .string()
  .trim()
  .min(5, "Address must be at least 5 characters")
  .max(200, "Address must be under 200 characters");

/** 5-digit US zip code */
export const zipCodeSchema = z
  .string()
  .regex(/^\d{5}$/, "Must be a valid 5-digit zip code");

/** Latitude/longitude pair */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Purchase price in dollars (positive integer) */
export const priceSchema = z
  .number()
  .nonnegative("Price cannot be negative")
  .max(100_000_000, "Price exceeds maximum");

/** Interest rate as percentage (e.g., 7.5 for 7.5%) */
export const interestRateSchema = z
  .number()
  .min(0, "Interest rate cannot be negative")
  .max(30, "Interest rate exceeds 30%");

/** Down payment as percentage (0-100) */
export const downPaymentSchema = z
  .number()
  .min(0, "Down payment cannot be negative")
  .max(100, "Down payment cannot exceed 100%");

// =============================================================================
// Route-specific schemas
// =============================================================================

/** POST /api/analyze */
export const analyzeInputSchema = z.object({
  address: addressSchema,
  purchasePrice: priceSchema.optional(),
  downPayment: downPaymentSchema.optional().default(20),
  interestRate: interestRateSchema.optional().default(7.5),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

/** POST /api/market-intelligence */
export const marketIntelligenceInputSchema = z.object({
  zipCode: zipCodeSchema,
  coordinates: coordinatesSchema.optional(),
  options: z
    .object({
      includeDemographics: z.boolean().optional().default(true),
      includeEconomy: z.boolean().optional().default(true),
      includeInfrastructure: z.boolean().optional().default(true),
      includeQualityOfLife: z.boolean().optional().default(true),
      includeSupplyDemand: z.boolean().optional().default(true),
      includeMacroRisk: z.boolean().optional().default(true),
    })
    .optional(),
});

export type MarketIntelligenceInput = z.infer<typeof marketIntelligenceInputSchema>;

/** POST /api/rental-analysis */
export const rentalAnalysisInputSchema = z.object({
  address: addressSchema,
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  sqft: z.number().int().min(100).max(100000).optional(),
  propertyType: z
    .enum(["single_family", "condo", "townhome", "multi_family", "apartment"])
    .optional(),
});

export type RentalAnalysisInput = z.infer<typeof rentalAnalysisInputSchema>;

/** POST /api/deals/scan */
export const dealScanInputSchema = z.object({
  zipCodes: z.array(zipCodeSchema).min(1).max(10),
  maxPrice: priceSchema.optional(),
  minCapRate: z.number().min(0).max(100).optional(),
  minCashFlow: z.number().optional(),
  propertyTypes: z
    .array(z.enum(["single_family", "condo", "townhome", "multi_family"]))
    .optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type DealScanInput = z.infer<typeof dealScanInputSchema>;

/** POST /api/appreciation/predict */
export const appreciationInputSchema = z.object({
  zipCode: zipCodeSchema,
  propertyValue: priceSchema,
  horizonYears: z.number().int().min(1).max(30).optional().default(5),
});

export type AppreciationInput = z.infer<typeof appreciationInputSchema>;

// =============================================================================
// Helper: Parse and return typed result or 400 error
// =============================================================================

export function parseRequestBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/** Format Zod errors into a clean API response */
export function formatZodError(error: z.ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  return {
    error: "Validation failed",
    details: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
