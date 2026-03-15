"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Save, FileText, ArrowLeftRight, AlertTriangle, SlidersHorizontal, DoorOpen, Tag } from "lucide-react";
import { computeInstitutionalMetrics } from "@/lib/engines/institutional-metrics";
import { runMultiVariableStressTest, PRESET_SCENARIOS } from "@/lib/engines/stress-test-engine";
import { calculateMortgagePayment, calculateMonthlyExpenses, calculateMetrics, calculateAIScore } from "@/lib/calculator";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import { useDealRoomStore } from "@/lib/stores/deal-room-store";
import { useExchangeStore } from "@/lib/stores/exchange-store";
import { formatCurrency } from "@/lib/utils/format";
import {
  AnalysisSkeleton, MetricsGrid, CalculationChain, InstitutionalCard, StressTestCard,
  ExitCapTable, VerdictCard, scoreColor, scoreBg, verdictBadge,
  type AnalysisResult,
} from "./_components";

// ─── Deterministic mock from address string ──────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function generateResult(address: string, priceOverride?: number, downPct = 20, rate = 6.95): AnalysisResult {
  const h = hashCode(address.toLowerCase().trim());

  const beds = 2 + (h % 4);             // 2-5
  const baths = 1 + (h % 3);            // 1-3
  const sqft = 1200 + (h % 2000);       // 1200-3200
  const yearBuilt = 1965 + (h % 55);    // 1965-2020
  const baseValue = 250_000 + (h % 400_000);
  const purchasePrice = priceOverride ?? Math.round(baseValue * 0.95);
  const estimatedValue = baseValue;
  const monthlyRent = Math.round(1200 + (h % 1800));

  const downPayment = purchasePrice * (downPct / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyMortgage = calculateMortgagePayment(loanAmount, rate);
  const expenses = calculateMonthlyExpenses(purchasePrice, monthlyRent);

  const metrics = calculateMetrics(
    { address, estimatedValue, estimatedRent: monthlyRent, bedrooms: beds, bathrooms: baths, sqft },
    { purchasePrice, downPaymentPercent: downPct, interestRate: rate },
  );

  const aiScore = calculateAIScore({
    cashFlow: metrics.monthlyCashFlow,
    capRate: metrics.capRate,
    cashOnCashReturn: metrics.cashOnCashReturn,
    priceVsValue: purchasePrice / estimatedValue,
  });

  // Institutional metrics input
  const marketCapRate = 5.5 + (h % 30) / 10;
  const institutional = computeInstitutionalMetrics({
    purchasePrice, currentValue: estimatedValue, monthlyRent,
    monthlyExpenses: expenses.total, sqft,
    loanAmount, interestRate: rate, loanTermYears: 30, monthlyMortgage,
    renovationCost: 15_000 + (h % 25_000),
    postRenovationRent: Math.round(monthlyRent * 1.12),
    postRenovationValue: Math.round(estimatedValue * 1.15),
    constructionCostPerSqft: 120 + (h % 80),
    landValuePerSqft: 30 + (h % 60),
    marketRent: Math.round(monthlyRent * 1.05),
    marketCapRate, exitCapRate: marketCapRate + 0.5,
    holdPeriodYears: 5, sellingCostsPct: 6,
    annualAppreciation: 3, annualRentGrowth: 3, annualExpenseGrowth: 2,
  });

  // Stress test
  const stress = runMultiVariableStressTest({
    monthlyRent, vacancy: 5, mortgageRate: rate, loanAmount,
    monthlyExpenses: expenses.total - expenses.insurance,
    propertyValue: purchasePrice, monthlyInsurance: expenses.insurance,
    downPayment,
  }, PRESET_SCENARIOS);

  const verdict: "BUY" | "PASS" = aiScore.score >= 60 ? "BUY" : "PASS";
  const confidence = Math.min(95, Math.max(45, aiScore.score + (h % 10) - 5));

  const narrative = verdict === "BUY"
    ? `This deal shows ${metrics.capRate > 6 ? "strong" : "acceptable"} fundamentals with ${stress.resilience} stress resilience. Worth pursuing.`
    : `Margins are thin and the deal ${stress.resilience === "fragile" || stress.resilience === "paper_thin" ? "fails basic stress tests" : "doesn't clear institutional hurdles"}. Pass unless you can renegotiate price.`;

  const nextSteps = verdict === "BUY"
    ? ["Order a property inspection and appraisal", "Verify rent comps with 3+ local sources", "Lock rate within 30 days of target close"]
    : ["Renegotiate purchase price 8-12% lower", "Explore alternative financing (DSCR, ARM)", "Consider nearby markets with better cap rates"];

  return {
    address, beds, baths, sqft, yearBuilt, purchasePrice, estimatedValue,
    monthlyRent, score: aiScore.score, verdict, confidence, narrative, nextSteps,
    capRate: metrics.capRate, monthlyCashFlow: metrics.monthlyCashFlow,
    dscr: expenses.total > 0 ? ((monthlyRent * 12 - expenses.total * 12) / (monthlyMortgage * 12)) : 0,
    cashOnCash: metrics.cashOnCashReturn, monthlyMortgage, monthlyExpenses: expenses.total,
    institutional, stress,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [downPct, setDownPct] = useState("20");
  const [rate, setRate] = useState("6.95");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);

  const [shared, setShared] = useState(false);
  const [listed, setListed] = useState(false);
  const [roomToken, setRoomToken] = useState<string | null>(null);

  const router = useRouter();
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const loadDeal = useSimulatorStore((s) => s.loadDeal);
  const createRoom = useDealRoomStore((s) => s.createRoom);
  const createListing = useExchangeStore((s) => s.createListing);

  const analyze = useCallback(() => {
    if (!address.trim()) return;
    setLoading(true);
    setSaved(false);
    setShared(false);
    setListed(false);
    setRoomToken(null);
    setResult(null);

    // Simulate 1.5s engine processing delay
    setTimeout(() => {
      const r = generateResult(
        address.trim(),
        price ? parseInt(price.replace(/\D/g, ""), 10) || undefined : undefined,
        parseFloat(downPct) || 20,
        parseFloat(rate) || 6.95,
      );
      setResult(r);
      setLoading(false);
    }, 1500);
  }, [address, price, downPct, rate]);

  const saveToPipeline = useCallback(() => {
    if (!result) return;
    addDeal({
      status: "analyzing",
      address: result.address,
      market: result.address.split(",").pop()?.trim() || "Unknown",
      state: result.address.split(",").pop()?.trim().split(" ")[0] || "",
      zip: String(hashCode(result.address) % 90000 + 10000),
      price: result.purchasePrice,
      propertyType: "Single Family",
      analysis: {
        apexScore: result.score,
        convictionScore: result.confidence,
        prismVerdict: result.verdict,
        capRate: result.capRate,
        monthlyCashFlow: result.monthlyCashFlow,
        cashOnCash: result.cashOnCash,
      },
    });
    setSaved(true);
  }, [result, addDeal]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-content-primary">Analyze Property</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          12-engine scoring. One verdict. Enter an address to begin.
        </p>
      </div>

      {/* ── Search Form ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5">Address</label>
            <input
              type="text"
              placeholder="Enter any US property address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              className="input"
            />
          </div>
          <div>
            <label className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5">
              Purchase Price <span className="text-content-disabled">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="$350,000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5">Down Payment %</label>
            <input
              type="number"
              value={downPct}
              onChange={(e) => setDownPct(e.target.value)}
              className="input font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-content-tertiary uppercase tracking-wider font-medium block mb-1.5">Interest Rate %</label>
            <input
              type="number"
              step="0.125"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="input font-mono"
            />
          </div>
          <div className="flex items-end">
            <button onClick={analyze} disabled={!address.trim() || loading} className="btn-primary w-full">
              <Search className="w-4 h-4" />
              Analyze
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading State ────────────────────────────────────────────────── */}
      {loading && <AnalysisSkeleton />}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-in">

          {/* Header card */}
          <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-content-primary truncate">{result.address}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-content-secondary">
                <span>{result.beds} bd / {result.baths} ba</span>
                <span className="text-content-disabled">|</span>
                <span>{result.sqft.toLocaleString()} sqft</span>
                <span className="text-content-disabled">|</span>
                <span>Built {result.yearBuilt}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl border font-mono text-lg font-bold ${scoreBg(result.score)} ${scoreColor(result.score)}`}>
                {result.score}
              </div>
              <span className={`${verdictBadge(result.verdict)} !text-sm !px-3 !py-1`}>{result.verdict}</span>
            </div>
          </div>

          {/* Metrics grid */}
          <MetricsGrid r={result} />

          {/* Calculation chain — show the math */}
          <CalculationChain r={result} />

          {/* Institutional + Stress side by side on large */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InstitutionalCard inst={result.institutional} />
            <StressTestCard stress={result.stress} />
          </div>

          {/* Exit cap sensitivity */}
          <ExitCapTable sens={result.institutional.exitCapRateSensitivity} />

          {/* Verdict */}
          <VerdictCard r={result} />

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={saveToPipeline} disabled={saved} className={saved ? "btn-secondary opacity-60 cursor-default" : "btn-emerald"}>
              <Save className="w-4 h-4" />
              {saved ? "Saved to Pipeline" : "Save to Pipeline"}
            </button>
            <button className="btn-secondary">
              <FileText className="w-4 h-4" />
              Generate Investment Memo
            </button>
            <button
              onClick={() => {
                if (!result) return;
                loadDeal({
                  purchasePrice: result.purchasePrice,
                  monthlyRent: result.monthlyRent,
                  downPaymentPct: parseFloat(downPct) || 20,
                  interestRate: parseFloat(rate) || 6.95,
                });
                router.push("/dashboard/simulator");
              }}
              className="btn-primary"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Open in Simulator
            </button>
            <button onClick={() => { setResult(null); setAddress(""); setSaved(false); setShared(false); setListed(false); setRoomToken(null); }} className="btn-ghost">
              <ArrowLeftRight className="w-4 h-4" />
              Compare with Another
            </button>
          </div>

          {/* Marketplace actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (!result || shared) return;
                const token = roomToken ?? createRoom(result);
                setRoomToken(token);
                setShared(true);
                router.push(`/dashboard/deal-room/${token}`);
              }}
              disabled={shared}
              className={shared ? "btn-secondary opacity-60 cursor-default" : "btn-primary"}
            >
              <DoorOpen className="w-4 h-4" />
              {shared ? "Deal Room Created" : "Share Deal Room"}
            </button>
            {result.verdict === "PASS" && (
              <button
                onClick={() => {
                  if (!result || listed) return;
                  const token = roomToken ?? createRoom(result);
                  setRoomToken(token);
                  setShared(true);
                  createListing({
                    analysis: result,
                    dealRoomId: token,
                    listingType: "off_market",
                    whyPassing: result.narrative,
                  });
                  setListed(true);
                }}
                disabled={listed}
                className={listed ? "btn-secondary opacity-60 cursor-default" : "btn-secondary"}
              >
                <Tag className="w-4 h-4" />
                {listed ? "Listed on Exchange" : "List on Exchange"}
              </button>
            )}
          </div>

          {/* Dev disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-muted/40 border border-amber/10">
            <AlertTriangle className="w-4 h-4 text-amber-light mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-light leading-relaxed">
              Analysis uses deterministic mock data generated from the address string. Real data engines will replace this in production.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
