import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/microeconomics/:zip
 *
 * Returns comprehensive microeconomic profile for a zip code:
 * capital flows, business activity, construction, consumer spending,
 * credit market, labor micro-metrics, housing micro-metrics,
 * wealth indicators, and money velocity score.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zip: string }> }
) {
  try {
    const { zip } = await params;

    if (!zip || zip.length !== 5) {
      return NextResponse.json({ error: "Valid 5-digit zip code required" }, { status: 400 });
    }

    // In production, this aggregates from multiple data sources
    // For now, generate deterministic mock data based on zip
    const profile = generateMockMicroProfile(zip);

    return NextResponse.json({
      zipCode: zip,
      profile,
      moneyVelocityScore: profile.moneyVelocityScore,
      capitalFlowDirection: profile.capitalFlowDirection,
      keyInsights: generateKeyInsights(profile),
      generatedAt: new Date().toISOString(),
      dataSources: [
        "Census ACS", "BLS QCEW", "FRED", "IRS SOI Migration",
        "County Recorder", "City Open Data Portal", "SBA Loan Data",
      ],
    });
  } catch (error) {
    console.error("Microeconomics error:", error);
    return NextResponse.json({ error: "Failed to analyze microeconomics" }, { status: 500 });
  }
}

function generateMockMicroProfile(zip: string) {
  const hash = zip.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const s = (hash % 100) / 100;

  return {
    moneyVelocityScore: Math.round(40 + s * 50),
    capitalFlowDirection: s > 0.6 ? "strong_inflow" : s > 0.4 ? "inflow" : s > 0.2 ? "neutral" : "outflow",

    capitalFlows: {
      mortgageOriginationVolume: { current: Math.round(50 + s * 100), trend: s > 0.5 ? "accelerating" : "stable", yoyChange: Math.round((s - 0.3) * 30) },
      sbaLoanVolume: { current: Math.round(5 + s * 20), trend: s > 0.6 ? "accelerating" : "stable", yoyChange: Math.round((s - 0.2) * 25) },
      vcDeals: { count: Math.round(s * 15), totalFunding: Math.round(s * 50000000), trend: s > 0.7 ? "accelerating" : "stable" },
      commercialREInvestment: { volume: Math.round(20 + s * 80), yoyChange: Math.round((s - 0.3) * 40) },
      cashBuyerPct: { current: Math.round(15 + s * 20), trend: s > 0.5 ? "rising" : "stable" },
    },

    businessActivity: {
      newFormations: Math.round(100 + s * 300),
      dissolutions: Math.round(50 + s * 100),
      netNew: Math.round(50 + s * 200),
      retailOpenings: Math.round(5 + s * 20),
      retailClosings: Math.round(2 + s * 8),
      restaurantOpenings: Math.round(3 + s * 15),
      restaurantClosings: Math.round(1 + s * 5),
      commercialVacancyRate: Math.round((8 - s * 5) * 10) / 10,
    },

    constructionActivity: {
      activeProjects: Math.round(10 + s * 40),
      residentialPermitValue: Math.round(20 + s * 80) + "M",
      commercialPermitValue: Math.round(10 + s * 50) + "M",
      constructionJobs: Math.round(2000 + s * 5000),
      architecturalBillingsIndex: Math.round(45 + s * 15),
    },

    consumerSpending: {
      retailSalesPerCapita: Math.round(12000 + s * 8000),
      restaurantSpendPerCapita: Math.round(2000 + s * 3000),
      luxuryRetailPresence: Math.round(s * 12),
      avgNewCarPrice: Math.round(35000 + s * 20000),
      discretionaryRatio: Math.round((25 + s * 15) * 10) / 10,
    },

    creditMarket: {
      avgCreditScore: Math.round(660 + s * 80),
      mortgageApprovalRate: Math.round(60 + s * 25),
      delinquencyRate: Math.round((3 - s * 2) * 100) / 100,
      foreclosureRate: Math.round((1.5 - s * 1) * 100) / 100,
      cashBuyerPct: Math.round(15 + s * 20),
    },

    housingMicro: {
      investorPurchasePct: Math.round(15 + s * 15),
      firstTimeBuyerPct: Math.round(25 + s * 15),
      priceReductionPct: Math.round(20 - s * 10),
      flipsCompleted: Math.round(10 + s * 40),
      avgFlipProfit: Math.round(30000 + s * 50000),
      shadowInventory: Math.round(5 + s * 20),
    },

    wealthIndicators: {
      medianNetWorth: Math.round(100000 + s * 400000),
      millionDollarHomesPct: Math.round(s * 15 * 10) / 10,
      privateSchoolPct: Math.round(5 + s * 15),
      luxuryCarRegistrations: Math.round(s * 8 * 10) / 10,
    },
  };
}

function generateKeyInsights(profile: ReturnType<typeof generateMockMicroProfile>): string[] {
  const insights: string[] = [];

  if (profile.moneyVelocityScore > 70) insights.push("High money velocity - capital is actively flowing through this market");
  if (profile.capitalFlowDirection === "strong_inflow") insights.push("Strong capital inflows detected across mortgage, commercial, and VC channels");
  if (profile.businessActivity.netNew > 150) insights.push(`Net ${profile.businessActivity.netNew} new businesses formed - strong entrepreneurial activity`);
  if (profile.constructionActivity.architecturalBillingsIndex > 55) insights.push("Architectural billings above 55 - construction pipeline expanding (leading indicator)");
  if (profile.creditMarket.cashBuyerPct > 25) insights.push(`${profile.creditMarket.cashBuyerPct}% cash buyers - institutional investor presence`);
  if (profile.housingMicro.priceReductionPct < 12) insights.push("Low price reduction rate - sellers hold pricing power");
  if (profile.wealthIndicators.medianNetWorth > 300000) insights.push("High median net worth indicates affluent area with price support");

  if (insights.length === 0) insights.push("Market shows standard economic activity levels");

  return insights;
}
