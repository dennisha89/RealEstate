import { NextRequest, NextResponse } from "next/server";
import {
  detectInstitutionalPatterns,
  scoreInstitutionalCapital,
  determineInstitutionalSentiment,
  type InstitutionalCapitalProfile,
} from "@/lib/engines/institutional-capital-engine";
import { buildTrendMetric } from "@/lib/engines/demographic-engine";

/**
 * GET /api/institutional-capital/:zip
 *
 * Institutional capital radar — tracks LLC purchases, REIT deployment,
 * PE fund activity, iBuyer signals, and corporate relocations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zip: string }> }
) {
  try {
    const { zip } = await params;

    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: "Valid 5-digit zip code required" }, { status: 400 });
    }

    // Mock data for demo
    const tm = (c: number, y: number) => buildTrendMetric([
      { date: "2021-01", value: y * 0.85 }, { date: "2022-01", value: y * 0.92 },
      { date: "2023-01", value: y }, { date: "2024-01", value: c * 0.96 }, { date: "2025-01", value: c },
    ]);

    const llcActivity = {
      totalLLCPurchases: tm(145, 110),
      llcPurchasePctOfTotal: tm(22, 17),
      uniqueEntitiesBuying: 38,
      topBuyingEntities: [
        { entityName: "Sunbelt Capital LLC", entityType: "llc" as const, purchaseCount: 12, totalVolume: 4200000, avgPurchasePrice: 350000, propertyTypes: ["SFR"], firstPurchaseDate: "2023-06-15", mostRecentPurchase: "2025-11-20", strategy: "buy_and_hold" as const },
      ],
      bulkPurchases: [{ entity: "Sunbelt Capital LLC", count: 5, totalVolume: 1750000, dateRange: "2025-09 to 2025-11" }],
      newEntitiesEntering: 8,
      avgEntityHoldPeriod: 28,
      entitySellingVsBuying: 1.6,
    };

    const reitDeployments = [
      { reitName: "Invitation Homes", ticker: "INVH", sector: "SFR", activityInMarket: "expanding" as const, propertiesOwned: 85, recentAcquisitions: 22, recentDispositions: 3, capitalDeployed: 7500000, publicStatements: "Targeting Sun Belt markets with strong job growth", source: "earnings call" },
    ];

    const peActivity = {
      activeFundsTargetingMarket: 4,
      totalFundCapitalRaised: 85000000,
      recentFundFormations: [{ fundName: "Metro Growth Fund III", targetSize: 50000000, strategy: "value-add multifamily", filingDate: "2025-08-15" }],
      formDFilings: tm(6, 3),
      dryPowder: 120000000,
    };

    const iBuyer = {
      activeBuyers: ["Opendoor", "Offerpad"],
      purchaseVolume: tm(35, 22), resaleVolume: tm(28, 18),
      avgHoldPeriod: 62, avgMarkup: 8.5, marketShare: 4.2,
      inventoryOnHand: 18, pricingVsMarket: 2.1, signal: "expanding" as const,
    };

    const corporateRelocations = [
      { companyName: "TechVenture Inc", industry: "Technology", relocationType: "regional_office" as const, estimatedJobs: 800, avgSalary: 95000, announcementDate: "2025-06-01", expectedMoveDate: "2026-09-01", incentivesReceived: 12000000, estimatedHousingDemand: 650, estimatedRentalDemand: 400, salaryToMedianIncomeRatio: 1.45, source: "Press release" },
    ];

    const crowdfunding = {
      activePlatforms: ["Fundrise", "RealtyMogul", "CrowdStreet"],
      totalRaised: tm(8500000, 4200000), activeProjects: 5, avgProjectSize: 1700000,
      projectTypes: [{ type: "multifamily", count: 3, totalRaised: 5100000 }],
      consensusSignal: true,
    };

    const signals = detectInstitutionalPatterns(llcActivity, reitDeployments, peActivity, iBuyer, corporateRelocations, crowdfunding);
    const score = scoreInstitutionalCapital(llcActivity, signals);
    const sentiment = determineInstitutionalSentiment(score, llcActivity);

    const profile: InstitutionalCapitalProfile = {
      zipCode: zip,
      llcPurchaseActivity: llcActivity,
      reitDeployment: reitDeployments,
      privateEquityActivity: peActivity,
      iBuyerActivity: iBuyer,
      corporateRelocations,
      crowdfundingDeployment: crowdfunding,
      institutionalSentiment: sentiment,
      institutionalCapitalScore: score,
      smartMoneySignals: signals,
    };

    return NextResponse.json({ profile, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Institutional capital error:", error);
    return NextResponse.json({ error: "Institutional capital analysis failed" }, { status: 500 });
  }
}
