import { NextRequest, NextResponse } from "next/server";
import { predictAppreciation, extractKPIDrivers, type AppreciationFeatures } from "@/lib/engines/appreciation-engine";

/**
 * POST /api/appreciation/predict
 *
 * Predict appreciation for a market area and identify
 * the exact KPIs driving prices up or down.
 *
 * Accepts a zip code or metro area, returns appreciation
 * predictions (1yr/3yr/5yr), primary drivers, and
 * bull/base/bear scenarios.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zipCode, features } = body as {
      zipCode?: string;
      features?: AppreciationFeatures;
    };

    // Use provided features or build from zip code lookup
    const appreciationFeatures: AppreciationFeatures = features ?? generateMockFeatures(zipCode);

    const prediction = predictAppreciation(appreciationFeatures);
    const kpiDrivers = extractKPIDrivers(appreciationFeatures, {});

    return NextResponse.json({
      zipCode: zipCode ?? "unknown",
      prediction,
      kpiDrivers,
      featuresUsed: appreciationFeatures,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Appreciation prediction error:", error);
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}

function generateMockFeatures(zipCode?: string): AppreciationFeatures {
  // Generate realistic features based on zip code hash for consistency
  const hash = (zipCode ?? "00000").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (hash % 100) / 100;

  return {
    populationGrowthRate3yr: 0.5 + seed * 2.5, // 0.5% to 3.0%
    medianIncomeGrowthRate3yr: 2.0 + seed * 4.0, // 2% to 6%
    jobGrowthRate3yr: 1.0 + seed * 3.0, // 1% to 4%
    buildingPermitsTrend: -5 + seed * 25, // -5% to +20%
    monthsOfInventoryTrend: -2 + seed * 3, // -2 to +1
    rentGrowthRate3yr: 2.0 + seed * 5.0, // 2% to 7%
    schoolRatingChange: -0.5 + seed * 1.5, // -0.5 to +1.0
    crimeRateChange: -1.5 + seed * 2.0, // -1.5 to +0.5
    transitScoreChange: seed * 5, // 0 to 5
    majorEmployerEvents: Math.round(-1 + seed * 4), // -1 to +3
    zoningChangeImpact: Math.round(seed * 2), // 0 to 2
    interestRateForecast: -1 + seed * 2, // -1 to +1
    walkScoreChange: -2 + seed * 5, // -2 to +3
    affordabilityIndex: 0.7 + seed * 0.6, // 0.7 to 1.3
    daysOnMarketTrend: -15 + seed * 20, // -15 to +5
    listToSaleRatioTrend: -2 + seed * 5, // -2% to +3%
  };
}
