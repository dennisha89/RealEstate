import { NextRequest, NextResponse } from "next/server";
import { calculateMetrics, calculateAIScore, type PropertyData } from "@/lib/calculator";

// Mock function to simulate property data fetching
// In production, this would scrape Zillow or call a real estate API
function fetchPropertyData(address: string): PropertyData {
  // Generate mock data based on address (for demo purposes)
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const estimatedValue = 250000 + (hash % 500000);
  const bedrooms = 2 + (hash % 4);
  const bathrooms = 1 + (hash % 3);
  const sqft = 1000 + (hash % 2000);

  // Estimate rent based on property size (rough formula)
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
    const { address, purchasePrice, downPayment, interestRate } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Fetch property data (mock for now)
    const propertyData = fetchPropertyData(address);

    // Calculate financial metrics
    const metrics = calculateMetrics(propertyData, {
      purchasePrice: purchasePrice || propertyData.estimatedValue,
      downPaymentPercent: downPayment || 20,
      interestRate: interestRate || 7.5,
    });

    // Calculate AI score
    const priceVsValue = (purchasePrice || propertyData.estimatedValue) / propertyData.estimatedValue;
    const aiAnalysis = calculateAIScore({
      cashFlow: metrics.monthlyCashFlow,
      capRate: metrics.capRate,
      cashOnCashReturn: metrics.cashOnCashReturn,
      priceVsValue,
    });

    // Return complete analysis
    const result = {
      address: propertyData.address,
      estimatedValue: propertyData.estimatedValue,
      estimatedRent: propertyData.estimatedRent,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      sqft: propertyData.sqft,
      purchasePrice: purchasePrice || propertyData.estimatedValue,
      downPayment: downPayment || 20,
      interestRate: interestRate || 7.5,
      monthlyMortgage: metrics.monthlyMortgage,
      monthlyExpenses: metrics.monthlyExpenses,
      monthlyCashFlow: metrics.monthlyCashFlow,
      capRate: metrics.capRate,
      cashOnCashReturn: metrics.cashOnCashReturn,
      score: aiAnalysis.score,
      recommendation: aiAnalysis.recommendation,
      explanation: aiAnalysis.explanation,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze property" },
      { status: 500 }
    );
  }
}
