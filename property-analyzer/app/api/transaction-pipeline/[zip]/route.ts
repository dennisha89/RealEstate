import { NextRequest, NextResponse } from "next/server";
import {
  generatePipelineSignals,
  scorePipeline,
  type TransactionPipelineProfile,
} from "@/lib/engines/transaction-pipeline-engine";
import { buildTrendMetric } from "@/lib/engines/demographic-engine";

/**
 * GET /api/transaction-pipeline/:zip
 *
 * Transaction pipeline intelligence — title insurance, foreclosure pipeline,
 * probate activity, hard money lending, evictions, tax appeals, permit velocity.
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

    const tm = (c: number, y: number) => buildTrendMetric(c, c * 0.96, y, y * 0.85);

    const profile: TransactionPipelineProfile = {
      zipCode: zip,
      titleInsurance: {
        orderVolume: tm(420, 350), closingVolume: tm(380, 340),
        orderToCloseRatio: 1.11, avgDaysToClose: tm(38, 42),
        commercialVsResidentialMix: { residential: 78, commercial: 22 },
        refinanceOrderPct: tm(22, 28), purchaseOrderPct: tm(78, 72),
        cancelationRate: tm(8, 6), signal: "pipeline_building",
      },
      foreclosurePipeline: {
        noticeOfDefault: tm(35, 42), lisPendens: tm(22, 28),
        scheduledAuctions: tm(15, 18), auctionSales: tm(12, 14),
        reoInventory: tm(8, 12), totalPipelineVolume: 92,
        pipelineFlowRate: "decelerating", avgForeclosureTimeline: 240,
        estimatedDistressedInventory6Mo: 45, estimatedDistressedInventory12Mo: 75,
        shortSales: tm(5, 8), loanModifications: tm(18, 12),
        forbearanceExits: { total: 85, cured: 45, modifiedToPerforming: 22, delinquentAfterExit: 12, inForeclosure: 6 },
      },
      probateEstateActivity: {
        newFilings: tm(28, 25), estimatedPropertyValue: 8500000,
        avgTimeToSale: 14, estatesSoldBelowMarket: 8,
        avgDiscountToMarket: 12, propertiesStillHeldByEstate: 15,
        probateAsPercentOfListings: tm(3.2, 2.8),
      },
      hardMoneyLending: {
        loanVolume: tm(12000000, 8500000), loanCount: tm(42, 30),
        avgLoanAmount: tm(285000, 283000), avgInterestRate: 11.5,
        avgLTV: 68, avgLoanTerm: 12, defaultRate: tm(3.2, 2.8),
        activeLenders: 8,
        purposeBreakdown: { fix_and_flip: 55, bridge: 20, construction: 10, rehab: 12, other: 3 },
        signal: "high_flip_activity",
      },
      evictionMetrics: {
        filingRate: tm(4.2, 3.8), filingCount: tm(125, 110),
        executedEvictions: tm(62, 58), avgDaysToEviction: 45,
        topReasons: [{ reason: "Non-payment", pct: 68 }, { reason: "Lease violation", pct: 22 }, { reason: "Holdover", pct: 10 }],
        filingRateVsMetro: -8, serialEvictionProperties: 12,
        evictionMoratoriumActive: false, signal: "stable",
      },
      propertyTaxAppeals: {
        appealVolume: tm(180, 150), appealRate: 3.5,
        avgRequestedReduction: 12, successRate: tm(42, 38),
        avgGrantedReduction: 6.5, totalAssessedValueReduction: 2800000,
        signal: "normal_activity",
      },
      permitToCompletionVelocity: {
        avgPermitToStartDays: tm(45, 52), avgStartToCompletionDays: tm(180, 165),
        totalPipelineDays: tm(225, 217), permitsExpiredUnbuilt: tm(18, 22),
        completionRate: 72, bottleneck: "labor",
        supplyImplication: "Moderate labor constraints slowing new construction.",
      },
      transactionPipelineScore: 0,
      pipelineSignals: [],
    };

    profile.transactionPipelineScore = scorePipeline(profile);
    profile.pipelineSignals = generatePipelineSignals(profile);

    return NextResponse.json({ profile, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Transaction pipeline error:", error);
    return NextResponse.json({ error: "Transaction pipeline analysis failed" }, { status: 500 });
  }
}
