import { NextRequest, NextResponse } from "next/server";
import { extractKPIDrivers, predictAppreciation, type AppreciationFeatures } from "@/lib/engines/appreciation-engine";

/**
 * GET /api/kpi-drivers/:zip
 *
 * Returns the ranked KPIs driving property prices in a given zip code.
 * This is the endpoint that answers: "WHY are prices going up/down here?"
 *
 * Response includes each KPI ranked by impact, with its current value,
 * trend direction, and which dimension it belongs to.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { zip: string } }
) {
  try {
    const { zip } = params;

    if (!zip || zip.length !== 5) {
      return NextResponse.json({ error: "Valid 5-digit zip code required" }, { status: 400 });
    }

    // In production, fetch real data for this zip code
    const features = buildFeaturesForZip(zip);
    const prediction = predictAppreciation(features);
    const kpiDrivers = extractKPIDrivers(features, {});

    // Separate into positive and negative drivers
    const positiveDrivers = kpiDrivers.filter(d => d.impact === "strong_positive" || d.impact === "positive");
    const negativeDrivers = kpiDrivers.filter(d => d.impact === "strong_negative" || d.impact === "negative");
    const neutralDrivers = kpiDrivers.filter(d => d.impact === "neutral");

    return NextResponse.json({
      zipCode: zip,
      summary: {
        predictedAppreciation1yr: prediction.oneYear.predicted,
        totalPositiveDrivers: positiveDrivers.length,
        totalNegativeDrivers: negativeDrivers.length,
        topDriver: kpiDrivers[0],
      },
      priceDrivers: {
        pushingPricesUp: positiveDrivers,
        pushingPricesDown: negativeDrivers,
        neutral: neutralDrivers,
      },
      allDriversRanked: kpiDrivers,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("KPI drivers error:", error);
    return NextResponse.json({ error: "Failed to compute KPI drivers" }, { status: 500 });
  }
}

function buildFeaturesForZip(zip: string): AppreciationFeatures {
  // Deterministic mock based on zip code for consistent results
  const hash = zip.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const s = (hash % 100) / 100;

  return {
    populationGrowthRate3yr: 0.3 + s * 3.0,
    medianIncomeGrowthRate3yr: 1.5 + s * 5.0,
    jobGrowthRate3yr: 0.8 + s * 3.5,
    buildingPermitsTrend: -8 + s * 30,
    monthsOfInventoryTrend: -3 + s * 4,
    rentGrowthRate3yr: 1.5 + s * 6.0,
    schoolRatingChange: -0.5 + s * 1.5,
    crimeRateChange: -2 + s * 3,
    transitScoreChange: -1 + s * 6,
    majorEmployerEvents: Math.round(-2 + s * 5),
    zoningChangeImpact: Math.round(-1 + s * 3),
    interestRateForecast: -1.5 + s * 2.5,
    walkScoreChange: -3 + s * 8,
    affordabilityIndex: 0.6 + s * 0.8,
    daysOnMarketTrend: -20 + s * 30,
    listToSaleRatioTrend: -3 + s * 7,
  };
}
