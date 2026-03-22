/**
 * Confluence API Route
 *
 * POST — accepts market, property, signal, rate, and portfolio data,
 * runs the full confluence pipeline (5 engines + master), and returns
 * the MasterConfluenceResult.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runFullConfluence } from "@/lib/engines/confluence/orchestrator";

export const dynamic = "force-dynamic";

const confluenceSchema = z.object({
  market: z.object({
    zip: z.string().min(5).max(10),
    name: z.string().min(1),
    state: z.string().min(2).max(2),
    hyperScore: z.number().min(0).max(100),
    demographicScore: z.number().min(0).max(100),
    economicScore: z.number().min(0).max(100),
    infrastructureScore: z.number().min(0).max(100),
    capRate: z.number().min(0).max(30),
    medianPrice: z.number().positive(),
    priceChange: z.number(),
    popGrowth: z.number(),
    jobGrowth: z.number(),
    inventory: z.number().min(0),
    daysOnMarket: z.number().min(0),
  }),

  property: z.object({
    address: z.string().min(1),
    askingPrice: z.number().positive(),
    impliedValue: z.number().positive(),
    capRate: z.number().min(0).max(30),
    cashOnCash: z.number(),
    monthlyCashFlow: z.number(),
    dscr: z.number().min(0),
    hyperScore: z.number().min(0).max(100),
    pricePerSqft: z.number().positive(),
    compsPricePerSqft: z.number().positive(),
    daysOnMarket: z.number().min(0),
    stressTestSurvival: z.boolean(),
    cashFlowAtWorstCase: z.number(),
    breakEvenVacancy: z.number().min(0).max(100),
  }).optional(),

  signals: z.object({
    compositeScore: z.number().min(-100).max(100),
    compositeScorePrevMonth: z.number().min(-100).max(100),
    probability: z.number().min(0).max(1),
    leadingLayerScore: z.number().min(-100).max(100),
    leadingConcordance: z.number().min(0).max(1),
    bearishCount: z.number().int().min(0),
    totalSignals: z.number().int().min(0),
    bearishConcordance: z.number().min(0).max(1),
  }),

  rates: z.object({
    mortgageRate30yr: z.number().min(0).max(20),
    mortgageRateChange6mo: z.number(),
    fedFundsRate: z.number().min(0).max(20),
    rateDirection: z.enum(["falling", "stable", "rising"]),
  }),

  portfolio: z.object({
    properties: z.array(z.object({
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(2).max(2),
      value: z.number().positive(),
      monthlyCashFlow: z.number(),
      capRate: z.number().min(0).max(30),
      appreciation: z.number(),
      purchasePrice: z.number().positive(),
      monthlyRent: z.number().min(0),
      monthlyExpenses: z.number().min(0),
      mortgage: z.number().min(0),
    })),
    cashReserves: z.number().min(0).optional(),
    goalMonthlyCashFlow: z.number().min(0).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = confluenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues.map(i => ({ field: i.path.join("."), message: i.message })) },
        { status: 400 },
      );
    }

    const result = runFullConfluence(parsed.data);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof SyntaxError
      ? "Invalid JSON body"
      : "Internal server error";
    const status = err instanceof SyntaxError ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
