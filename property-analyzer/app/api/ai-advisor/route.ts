import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAdvisorResponse } from "@/lib/engines/ai-advisor-engine";

const propertyContextSchema = z.object({
  address: z.string().min(1),
  price: z.number().positive(),
  capRate: z.number().min(0).max(30),
  cashFlow: z.number(),
  hyperScore: z.number().min(0).max(100),
  appreciation: z.number(),
});

const portfolioPropertySchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1).max(2),
  purchasePrice: z.number().positive(),
  currentValue: z.number().positive(),
  monthlyRent: z.number().min(0),
  monthlyExpenses: z.number().min(0),
  mortgage: z.number().min(0),
  capRate: z.number().min(0).max(30),
});

const portfolioContextSchema = z.object({
  properties: z.array(portfolioPropertySchema),
  cashReserves: z.number().min(0).optional(),
  monthlyIncome: z.number().min(0).optional(),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  investmentGoal: z.string().max(200).optional(),
});

const querySchema = z.object({
  question: z.string().min(1).max(500),
  propertyContext: propertyContextSchema.optional(),
  portfolioContext: portfolioContextSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = querySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map(i => ({ field: i.path.join("."), message: i.message })) },
        { status: 400 },
      );
    }

    const response = generateAdvisorResponse(parsed.data);

    return NextResponse.json({
      ...response,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI advisor error:", error);
    return NextResponse.json(
      { error: "Failed to generate advisor response" },
      { status: 500 },
    );
  }
}
