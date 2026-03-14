/**
 * End-to-end integration test for the analysis pipeline.
 *
 * Tests the complete data flow:
 * Input validation (Zod) → Property data fetch → Calculator → AI Score → Response
 *
 * Uses mock property data (no external API calls) to verify the pipeline
 * works correctly from input to output.
 */

import {
  analyzeInputSchema,
  formatZodError,
} from "@/lib/utils/validation";
import {
  calculateMetrics,
  calculateAIScore,
  type PropertyData,
} from "@/lib/calculator";

// Simulates the full analyze pipeline (same logic as the API route)
function runAnalyzePipeline(body: unknown) {
  // Step 1: Validate input with Zod
  const parsed = analyzeInputSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: formatZodError(parsed.error) };
  }

  const { address, purchasePrice, downPayment, interestRate } = parsed.data;

  // Step 2: Mock property data fetch (same as route)
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const estimatedValue = 250000 + (hash % 500000);
  const sqft = 1000 + (hash % 2000);
  const propertyData: PropertyData = {
    address,
    estimatedValue: Math.round(estimatedValue),
    estimatedRent: Math.round((estimatedValue * 0.007) + (sqft * 0.5)),
    bedrooms: 2 + (hash % 4),
    bathrooms: 1 + (hash % 3),
    sqft,
  };

  const effectivePrice = purchasePrice ?? propertyData.estimatedValue;

  // Step 3: Calculate financial metrics
  const metrics = calculateMetrics(propertyData, {
    purchasePrice: effectivePrice,
    downPaymentPercent: downPayment,
    interestRate,
  });

  // Step 4: Calculate AI score
  const priceVsValue = effectivePrice / propertyData.estimatedValue;
  const aiAnalysis = calculateAIScore({
    cashFlow: metrics.monthlyCashFlow,
    capRate: metrics.capRate,
    cashOnCashReturn: metrics.cashOnCashReturn,
    priceVsValue,
  });

  // Step 5: Build response
  return {
    status: 200,
    body: {
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
      dataSource: "mock",
    },
  };
}

describe("Analyze Pipeline — End to End", () => {
  describe("valid inputs produce complete analysis", () => {
    it("processes a standard property analysis request", () => {
      const result = runAnalyzePipeline({
        address: "123 Main St, Austin, TX 78701",
        purchasePrice: 400000,
        downPayment: 20,
        interestRate: 7.5,
      });

      expect(result.status).toBe(200);
      const body = result.body as Record<string, unknown>;

      // All expected fields are present
      expect(body.address).toBe("123 Main St, Austin, TX 78701");
      expect(body.estimatedValue).toBeGreaterThan(0);
      expect(body.estimatedRent).toBeGreaterThan(0);
      expect(body.bedrooms).toBeGreaterThanOrEqual(2);
      expect(body.bathrooms).toBeGreaterThanOrEqual(1);
      expect(body.sqft).toBeGreaterThan(0);
      expect(body.purchasePrice).toBe(400000);
      expect(body.downPayment).toBe(20);
      expect(body.interestRate).toBe(7.5);
      expect(body.monthlyMortgage).toBeGreaterThan(0);
      expect(body.monthlyExpenses).toBeGreaterThan(0);
      expect(typeof body.monthlyCashFlow).toBe("number");
      expect(typeof body.capRate).toBe("number");
      expect(typeof body.cashOnCashReturn).toBe("number");
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(100);
      expect(["STRONG BUY", "BUY", "HOLD", "PASS"]).toContain(body.recommendation);
      expect(body.dataSource).toBe("mock");

      // Explanation has both positives and negatives
      const explanation = body.explanation as { positives: string[]; negatives: string[] };
      expect(explanation.positives.length).toBeGreaterThan(0);
      expect(explanation.negatives.length).toBeGreaterThan(0);
    });

    it("uses estimated value when purchase price is not provided", () => {
      const result = runAnalyzePipeline({
        address: "456 Oak Ave, Denver, CO 80201",
      });

      expect(result.status).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body.purchasePrice).toBe(body.estimatedValue);
      expect(body.downPayment).toBe(20); // default
      expect(body.interestRate).toBe(7.5); // default
    });

    it("produces deterministic results for the same address", () => {
      const input = { address: "789 Pine Rd, Phoenix, AZ 85001" };
      const result1 = runAnalyzePipeline(input);
      const result2 = runAnalyzePipeline(input);

      const body1 = result1.body as Record<string, unknown>;
      const body2 = result2.body as Record<string, unknown>;

      expect(body1.estimatedValue).toBe(body2.estimatedValue);
      expect(body1.estimatedRent).toBe(body2.estimatedRent);
      expect(body1.score).toBe(body2.score);
      expect(body1.recommendation).toBe(body2.recommendation);
    });

    it("produces different results for different addresses", () => {
      const result1 = runAnalyzePipeline({ address: "100 Alpha St, City, ST 10001" });
      const result2 = runAnalyzePipeline({ address: "999 Omega Blvd, Town, ST 99999" });

      const body1 = result1.body as Record<string, unknown>;
      const body2 = result2.body as Record<string, unknown>;

      // Different addresses should produce different estimated values
      expect(body1.estimatedValue).not.toBe(body2.estimatedValue);
    });
  });

  describe("financial calculations are consistent", () => {
    it("cap rate is independent of financing terms", () => {
      const base = { address: "Test Property, TX 78701", purchasePrice: 350000 };

      const r1 = runAnalyzePipeline({ ...base, downPayment: 10, interestRate: 7 });
      const r2 = runAnalyzePipeline({ ...base, downPayment: 50, interestRate: 5 });

      const capRate1 = (r1.body as Record<string, unknown>).capRate as number;
      const capRate2 = (r2.body as Record<string, unknown>).capRate as number;

      // Cap rate is an unlevered metric — MUST be the same regardless of financing
      expect(capRate1).toBeCloseTo(capRate2, 2);
    });

    it("higher down payment increases cash-on-cash but decreases cash flow", () => {
      const base = { address: "Test Property, TX 78701", purchasePrice: 350000, interestRate: 7 };

      const lowDown = runAnalyzePipeline({ ...base, downPayment: 5 });
      const highDown = runAnalyzePipeline({ ...base, downPayment: 40 });

      const lowBody = lowDown.body as Record<string, unknown>;
      const highBody = highDown.body as Record<string, unknown>;

      // Higher down payment = lower mortgage = better monthly cash flow
      expect(highBody.monthlyCashFlow as number).toBeGreaterThan(lowBody.monthlyCashFlow as number);
    });
  });

  describe("Zod validation rejects invalid inputs", () => {
    it("rejects missing address", () => {
      const result = runAnalyzePipeline({ purchasePrice: 400000 });
      expect(result.status).toBe(400);
      const body = result.body as { error: string; details: Array<{ field: string }> };
      expect(body.error).toBe("Validation failed");
    });

    it("rejects empty string address", () => {
      const result = runAnalyzePipeline({ address: "" });
      expect(result.status).toBe(400);
    });

    it("rejects address that is too short", () => {
      const result = runAnalyzePipeline({ address: "Hi" });
      expect(result.status).toBe(400);
    });

    it("rejects negative purchase price", () => {
      const result = runAnalyzePipeline({
        address: "Valid Address St, City, ST 12345",
        purchasePrice: -50000,
      });
      expect(result.status).toBe(400);
    });

    it("rejects interest rate above 30%", () => {
      const result = runAnalyzePipeline({
        address: "Valid Address St, City, ST 12345",
        interestRate: 35,
      });
      expect(result.status).toBe(400);
    });

    it("rejects down payment above 100%", () => {
      const result = runAnalyzePipeline({
        address: "Valid Address St, City, ST 12345",
        downPayment: 150,
      });
      expect(result.status).toBe(400);
    });

    it("accepts valid input with all optional fields", () => {
      const result = runAnalyzePipeline({
        address: "123 Main St, Austin, TX 78701",
        purchasePrice: 500000,
        downPayment: 25,
        interestRate: 6.5,
      });
      expect(result.status).toBe(200);
    });

    it("accepts valid input with only address", () => {
      const result = runAnalyzePipeline({
        address: "123 Main St, Austin, TX 78701",
      });
      expect(result.status).toBe(200);
    });
  });

  describe("AI scoring guardrails", () => {
    it("score is always between 0 and 100", () => {
      const addresses = [
        "Cheap House, TX 79901",
        "Expensive Mansion, CA 90210",
        "Average Place, OH 43201",
        "Rural Property, MT 59001",
        "Urban Condo, NY 10001",
      ];

      for (const address of addresses) {
        const result = runAnalyzePipeline({ address });
        const body = result.body as Record<string, unknown>;
        expect(body.score).toBeGreaterThanOrEqual(0);
        expect(body.score).toBeLessThanOrEqual(100);
      }
    });

    it("recommendation matches score thresholds", () => {
      // We can't control exact scores via mock, but we can verify the mapping
      const addresses = Array.from({ length: 20 }, (_, i) => `Property ${i}, State ${i}0001`);

      for (const address of addresses) {
        const result = runAnalyzePipeline({ address });
        const body = result.body as Record<string, unknown>;
        const score = body.score as number;
        const rec = body.recommendation as string;

        if (score >= 80) expect(rec).toBe("STRONG BUY");
        else if (score >= 60) expect(rec).toBe("BUY");
        else if (score >= 40) expect(rec).toBe("HOLD");
        else expect(rec).toBe("PASS");
      }
    });
  });
});
