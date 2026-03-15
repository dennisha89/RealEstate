import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scanForDeals, evaluateDeal } from "@/lib/engines/deal-finder-engine";
import type { DealCriteria, CompProperty, DealResult } from "@/lib/types/market-intelligence";

/**
 * POST /api/deals/scan
 *
 * Scan for deals matching configurable criteria.
 * Accepts deal criteria (markets, price range, deal types, min thresholds)
 * and returns ranked deal results.
 *
 * In production, `properties` would come from MLS/listing APIs.
 * For now, the client can pass properties or we generate mock listings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const schema = z.object({
      criteria: z.object({
        markets: z.array(z.string()).default([]),
        propertyTypes: z.array(z.enum(["single_family", "multi_family", "condo", "townhouse"])).default([]),
        priceRange: z.object({
          min: z.number().nonnegative(),
          max: z.number().positive(),
        }),
        dealTypes: z.array(z.string()).default([]),
        minCashFlow: z.number().optional(),
        minCapRate: z.number().optional(),
        minHyperScore: z.number().optional(),
        maxDaysOnMarket: z.number().optional(),
        minBedrooms: z.number().optional(),
        minSqft: z.number().optional(),
      }),
      properties: z.array(z.object({
        address: z.string(),
        price: z.number().positive(),
        sqft: z.number().positive(),
        pricePerSqft: z.number(),
        bedrooms: z.number(),
        bathrooms: z.number(),
        yearBuilt: z.number(),
        daysOnMarket: z.number().optional(),
      })).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: parsed.error.issues.map(i => ({ field: i.path.join("."), message: i.message })),
      }, { status: 400 });
    }

    const { criteria, properties } = parsed.data;

    // Use provided properties or generate mock listings
    const listings = properties ?? generateMockListings(criteria as DealCriteria);

    // Evaluate each property
    const evaluator = (property: CompProperty): DealResult => {
      // Deterministic mock values derived from property address hash
      // (replaces Math.random() to ensure same input = same output)
      const hash = property.address.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const seed = (hash % 1000) / 1000;

      const compImpliedValue = property.price * (1 + (seed * 0.3 - 0.1));
      const monthlyCashFlow = Math.round((property.price * 0.007) - (property.price * 0.005));
      const projectedAppreciation = 3 + seed * 5;
      const hyperScore = 40 + Math.round(seed * 50);
      const monthsOfInventory = 2 + seed * 5;
      const listToSaleRatio = 0.95 + seed * 0.08;

      return evaluateDeal(
        property,
        compImpliedValue,
        monthlyCashFlow,
        projectedAppreciation,
        hyperScore,
        monthsOfInventory,
        listToSaleRatio
      );
    };

    const deals = scanForDeals(listings as CompProperty[], criteria as DealCriteria, evaluator);

    return NextResponse.json({
      deals,
      totalScanned: listings.length,
      totalMatches: deals.length,
      criteria,
      scannedAt: new Date().toISOString(),
      dataSource: "mock",
    });
  } catch (error) {
    console.error("Deal scan error:", error);
    return NextResponse.json({ error: "Deal scan failed" }, { status: 500 });
  }
}

function generateMockListings(criteria: DealCriteria): CompProperty[] {
  const listings: CompProperty[] = [];
  const count = 20;
  const streetNames = ["Main", "Oak", "Elm", "Park", "Lake", "Hill", "River", "Sunset", "Valley", "Ridge"];
  const suffixes = ["St", "Ave", "Dr", "Blvd", "Ln"];

  // Deterministic seed from criteria
  const baseSeed = criteria.markets.join("").split("").reduce((a, c) => a + c.charCodeAt(0), 42);

  for (let i = 0; i < count; i++) {
    const seed = ((baseSeed + i * 37) % 1000) / 1000;
    const price = criteria.priceRange.min + seed * (criteria.priceRange.max - criteria.priceRange.min);
    const sqft = 800 + Math.round(seed * 2200);
    const bedrooms = 2 + Math.round(seed * 3);
    const bathrooms = 1 + Math.round(seed * 2);

    listings.push({
      address: `${100 + i * 37} ${streetNames[i % 10]} ${suffixes[i % 5]}`,
      price: Math.round(price),
      sqft,
      pricePerSqft: Math.round(price / sqft),
      bedrooms,
      bathrooms,
      yearBuilt: 1970 + Math.round(seed * 50),
      daysOnMarket: Math.round(seed * 120),
    });
  }

  return listings;
}
