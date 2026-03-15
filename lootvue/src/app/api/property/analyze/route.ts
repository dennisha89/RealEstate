/**
 * POST /api/property/analyze
 *
 * Full property analysis endpoint. Accepts an address and optional
 * financial parameters, runs all configured engines with real API data,
 * and returns a complete verdict.
 *
 * Request body:
 * {
 *   address: string (required)
 *   zipCode?: string
 *   lat?: number
 *   lng?: number
 *   purchasePrice?: number
 *   downPaymentPct?: number (default 20)
 *   interestRate?: number (default: current FRED rate)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeProperty } from "@/lib/services/analysis-service";
import { withValidation, compose, withRateLimit, jsonError, jsonSuccess } from "@/lib/api/middleware";

const AnalyzeInputSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
  zipCode: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  purchasePrice: z.number().positive().optional(),
  downPaymentPct: z.number().min(0).max(100).optional(),
  interestRate: z.number().min(0).max(30).optional(),
});

type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

const handler = withValidation(AnalyzeInputSchema, "body")(
  async (_req, ctx) => {
    const input: AnalyzeInput = ctx.validated;

    try {
      const result = await analyzeProperty({
        address: input.address,
        zipCode: input.zipCode,
        lat: input.lat,
        lng: input.lng,
        purchasePrice: input.purchasePrice,
        downPaymentPct: input.downPaymentPct,
        interestRate: input.interestRate,
      });

      return jsonSuccess(result, {
        meta: {
          realDataPct: result.realDataPct,
          sourcesLive: result.dataSources.filter((s) => s.status === "live").length,
          sourcesTotal: result.dataSources.length,
        },
      });
    } catch (err) {
      console.error("[/api/property/analyze] Error:", err);
      return jsonError("Analysis failed. Please try again.", 500);
    }
  }
);

export const POST = compose(
  withRateLimit(50, 60_000) // Lower limit — each call makes multiple API requests
)(handler);
