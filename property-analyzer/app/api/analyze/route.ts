import { NextRequest, NextResponse } from "next/server";
import { calculateMetrics, calculateAIScore, type PropertyData } from "@/lib/calculator";
import {
  analyzeInputSchema,
  formatZodError,
} from "@/lib/utils/validation";

/**
 * POST /api/analyze
 *
 * Core property analysis endpoint. Validates input with Zod,
 * fetches property data, runs financial calculations, and returns
 * an AI-scored investment analysis.
 *
 * TODO: Replace fetchPropertyData() with real ATTOM + RentCast calls
 * from lib/engines/data-sources.ts once API keys are configured.
 */

// Mock function — generates deterministic fake data from address hash.
// This will be replaced by real API calls (ATTOM for property details,
// RentCast for rental estimates) in Phase 2.
function fetchPropertyData(address: string): PropertyData {
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const estimatedValue = 250000 + (hash % 500000);
  const bedrooms = 2 + (hash % 4);
  const bathrooms = 1 + (hash % 3);
  const sqft = 1000 + (hash % 2000);
  const estimatedRent = Math.round((estimatedValue * 0.007) + (sqft * 0.5));

  return {
    address,
    estimatedValue: Math.round(estimatedValue),
    estimatedRent,
    bedrooms,
    bathrooms,
    sqft,
    yearBuilt: 1990 + (hash % 35),
    propertyType: "Single Family",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const parsed = analyzeInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const { address, purchasePrice, downPayment, interestRate } = parsed.data;

    // Fetch property data (mock — see TODO above)
    const propertyData = fetchPropertyData(address);

    const effectivePrice = purchasePrice ?? propertyData.estimatedValue;

    // Calculate financial metrics
    const metrics = calculateMetrics(propertyData, {
      purchasePrice: effectivePrice,
      downPaymentPercent: downPayment,
      interestRate: interestRate,
    });

    // Calculate AI score
    const priceVsValue = effectivePrice / propertyData.estimatedValue;
    const aiAnalysis = calculateAIScore({
      cashFlow: metrics.monthlyCashFlow,
      capRate: metrics.capRate,
      cashOnCashReturn: metrics.cashOnCashReturn,
      priceVsValue,
    });

    return NextResponse.json({
      address: propertyData.address,
      estimatedValue: propertyData.estimatedValue,
      estimatedRent: propertyData.estimatedRent,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      sqft: propertyData.sqft,
      purchasePrice: effectivePrice,
      downPayment,
      interestRate,
      monthlyMortgage: metrics.monthlyMortgage,
      monthlyExpenses: metrics.monthlyExpenses,
      monthlyCashFlow: metrics.monthlyCashFlow,
      capRate: metrics.capRate,
      cashOnCashReturn: metrics.cashOnCashReturn,
      score: aiAnalysis.score,
      recommendation: aiAnalysis.recommendation,
      explanation: aiAnalysis.explanation,
      dataSource: "mock", // Will change to "live" when real APIs are wired
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze property" },
      { status: 500 }
    );
  }
}
