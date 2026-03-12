import { NextRequest, NextResponse } from "next/server";
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
    const { criteria, properties } = body as {
      criteria: DealCriteria;
      properties?: CompProperty[];
    };

    if (!criteria) {
      return NextResponse.json({ error: "Deal criteria is required" }, { status: 400 });
    }

    // Use provided properties or generate mock listings
    const listings = properties ?? generateMockListings(criteria);

    // Evaluate each property
    const evaluator = (property: CompProperty): DealResult => {
      // In production, these would come from real analysis
      const compImpliedValue = property.price * (1 + (Math.random() * 0.3 - 0.1));
      const monthlyCashFlow = Math.round((property.price * 0.007) - (property.price * 0.005));
      const projectedAppreciation = 3 + Math.random() * 5;
      const hyperScore = 40 + Math.round(Math.random() * 50);
      const monthsOfInventory = 2 + Math.random() * 5;
      const listToSaleRatio = 0.95 + Math.random() * 0.08;

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

    const deals = scanForDeals(listings, criteria, evaluator);

    return NextResponse.json({
      deals,
      totalScanned: listings.length,
      totalMatches: deals.length,
      criteria,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Deal scan error:", error);
    return NextResponse.json({ error: "Deal scan failed" }, { status: 500 });
  }
}

function generateMockListings(criteria: DealCriteria): CompProperty[] {
  const listings: CompProperty[] = [];
  const count = 20;

  for (let i = 0; i < count; i++) {
    const price = criteria.priceRange.min + Math.random() * (criteria.priceRange.max - criteria.priceRange.min);
    const sqft = 800 + Math.round(Math.random() * 2200);
    const bedrooms = 2 + Math.round(Math.random() * 3);
    const bathrooms = 1 + Math.round(Math.random() * 2);

    listings.push({
      address: `${100 + i * 37} ${["Main", "Oak", "Elm", "Park", "Lake", "Hill", "River", "Sunset", "Valley", "Ridge"][i % 10]} ${["St", "Ave", "Dr", "Blvd", "Ln"][i % 5]}`,
      price: Math.round(price),
      sqft,
      pricePerSqft: Math.round(price / sqft),
      bedrooms,
      bathrooms,
      yearBuilt: 1970 + Math.round(Math.random() * 50),
      daysOnMarket: Math.round(Math.random() * 120),
    });
  }

  return listings;
}
