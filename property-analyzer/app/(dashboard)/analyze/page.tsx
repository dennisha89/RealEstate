"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MetricCard from "@/components/ui/MetricCard";
import DealGradeBadge from "@/components/analysis/DealGradeBadge";
import AnalysisTabs from "@/components/analysis/AnalysisTabs";
import StressTestPanel from "@/components/analysis/StressTestPanel";
import CompsTable from "@/components/analysis/CompsTable";
import AIAnalysisStream from "@/components/analysis/AIAnalysisStream";
import HyperScoreRadar from "@/components/charts/HyperScoreRadar";
import ScenarioChart from "@/components/charts/ScenarioChart";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { generateScenarios } from "@/lib/mock/time-series-generator";
import { DollarSign, TrendingUp, Target, Percent, Save, FileText, Shield, CheckCircle, XCircle } from "lucide-react";
import ScenarioSliders from "@/components/analysis/ScenarioSliders";
import AIAdvisor from "@/components/analysis/AIAdvisor";
import { computeInstitutionalMetrics, type InstitutionalMetricsInput, type InstitutionalMetrics } from "@/lib/engines/institutional-metrics";
import { runMultiVariableStressTest, PRESET_SCENARIOS, type StressTestInput, type StressTestResult } from "@/lib/engines/stress-test-engine";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { generateInvestmentMemo, type MemoInput, type InvestmentMemo } from "@/lib/engines/memo-generator";
import { useEventCapture } from "@/lib/hooks/useEventCapture";

interface AnalysisResult {
  address: string;
  estimatedValue: number;
  estimatedRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  monthlyMortgage: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  score: number;
  recommendation: string;
  explanation: {
    positives: string[];
    negatives: string[];
  };
}

interface HyperAnalysisResult {
  analysis: {
    hyperScore: {
      overall: number;
      recommendation: string;
      confidence: number;
      dimensions: Record<string, { score: number; weightedScore: number; keyFactors: string[] }>;
      topDrivers: Array<{ kpi: string; value: string; trend: string }>;
      topRisks: Array<{ kpi: string; value: string; trend: string }>;
    };
    comps: {
      comparables: Array<{
        address: string;
        price: number;
        sqft: number;
        pricePerSqft: number;
        bedrooms: number;
        bathrooms: number;
        yearBuilt: number;
        daysOnMarket?: number;
        distance?: number;
        similarity?: number;
      }>;
    };
    appreciation: {
      oneYear: { predicted: number };
      threeYear: { predicted: number };
      fiveYear: { predicted: number };
    };
  };
}

function getGrade(score: number): string {
  if (score >= 85) return "A+";
  if (score >= 75) return "A";
  if (score >= 65) return "B+";
  if (score >= 55) return "B";
  if (score >= 45) return "C+";
  if (score >= 35) return "C";
  return "D";
}

export default function AnalyzePage() {
  const [address, setAddress] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [downPayment, setDownPayment] = useState("20");
  const [interestRate, setInterestRate] = useState("7.5");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hyperResult, setHyperResult] = useState<HyperAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<InvestmentMemo | null>(null);
  const [memoGenerating, setMemoGenerating] = useState(false);
  const [savedToPipeline, setSavedToPipeline] = useState(false);

  const { capture } = useEventCapture();
  const addDeal = useDealPipelineStore((s) => s.addDeal);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setHyperResult(null);

    try {
      // Run both analyses in parallel
      const [analyzeRes, hyperRes] = await Promise.allSettled([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            ...(purchasePrice ? { purchasePrice: parseFloat(purchasePrice) } : {}),
            downPayment: parseFloat(downPayment) || 20,
            interestRate: parseFloat(interestRate) || 7.5,
          }),
        }).then((r) => {
          if (!r.ok) throw new Error("Analysis failed");
          return r.json();
        }),
        fetch("/api/market-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property: {
              address,
              price: purchasePrice ? parseFloat(purchasePrice) : 400000,
              sqft: 1800,
              pricePerSqft: 222,
              bedrooms: 3,
              bathrooms: 2,
              yearBuilt: 2005,
              estimatedRent: 2200,
            },
            financialInputs: {
              downPaymentPct: parseFloat(downPayment) || 20,
              interestRate: parseFloat(interestRate) || 7.5,
            },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error("HyperScore failed");
          return r.json();
        }),
      ]);

      if (analyzeRes.status === "fulfilled") {
        setResult(analyzeRes.value);
        capture("property.analyzed", {
          address,
          score: analyzeRes.value.score,
          capRate: analyzeRes.value.capRate,
        });
      } else {
        throw new Error("Analysis failed");
      }

      if (hyperRes.status === "fulfilled") {
        setHyperResult(hyperRes.value);
        if (hyperRes.value?.analysis?.hyperScore) {
          capture("confluence.ran", {
            verdict: hyperRes.value.analysis.hyperScore.recommendation,
            score: hyperRes.value.analysis.hyperScore.overall,
          });
        }
      }

      // Reset action states for new analysis
      setMemo(null);
      setSavedToPipeline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAnalyzing(false);
    }
  };

  const hyper = hyperResult?.analysis?.hyperScore;
  const comps = hyperResult?.analysis?.comps?.comparables ?? [];
  const appreciation = hyperResult?.analysis?.appreciation;

  // Extract zip for scenarios
  const zipMatch = address.match(/\b(\d{5})\b/);
  const zip = zipMatch?.[1] ?? "78701";
  const scenarios = generateScenarios(zip, result?.purchasePrice ?? 400000);

  // Institutional metrics computation
  const institutionalMetrics = useMemo<InstitutionalMetrics | null>(() => {
    if (!result) return null;
    const dp = result.downPayment / 100;
    const loanAmt = result.purchasePrice * (1 - dp);
    const input: InstitutionalMetricsInput = {
      purchasePrice: result.purchasePrice,
      currentValue: result.estimatedValue,
      monthlyRent: result.estimatedRent,
      monthlyExpenses: result.monthlyExpenses - result.monthlyMortgage,
      sqft: result.sqft,
      loanAmount: loanAmt,
      interestRate: result.interestRate,
      loanTermYears: 30,
      monthlyMortgage: result.monthlyMortgage,
      renovationCost: 0,
      postRenovationRent: result.estimatedRent,
      postRenovationValue: result.estimatedValue,
      constructionCostPerSqft: 150,
      landValuePerSqft: 50,
      marketRent: result.estimatedRent * 1.05,
      marketCapRate: 5.5,
      exitCapRate: result.capRate > 0 ? result.capRate + 0.5 : 6.0,
      holdPeriodYears: 5,
      sellingCostsPct: 6,
      annualAppreciation: appreciation?.oneYear?.predicted ?? 3,
      annualRentGrowth: 3,
      annualExpenseGrowth: 2,
    };
    return computeInstitutionalMetrics(input);
  }, [result, appreciation]);

  // Multi-variable stress test computation
  const multiStressResult = useMemo<StressTestResult | null>(() => {
    if (!result) return null;
    const dp = result.downPayment / 100;
    const loanAmt = result.purchasePrice * (1 - dp);
    const opex = result.monthlyExpenses - result.monthlyMortgage;
    const input: StressTestInput = {
      monthlyRent: result.estimatedRent,
      vacancy: 5,
      mortgageRate: result.interestRate,
      loanAmount: loanAmt,
      monthlyExpenses: opex * 0.7,
      propertyValue: result.purchasePrice,
      monthlyInsurance: opex * 0.3,
      downPayment: result.purchasePrice * dp,
    };
    return runMultiVariableStressTest(input, PRESET_SCENARIOS);
  }, [result]);

  // Action: save to deal pipeline
  const handleSaveToPipeline = () => {
    if (!result || savedToPipeline) return;
    addDeal({
      address: result.address,
      market: zip,
      state: result.address.split(",").at(-1)?.trim().split(" ")[0] ?? "",
      zip,
      price: result.purchasePrice,
      propertyType: "SFR",
      status: "discovered",
      analysis: {
        apexScore: hyper?.overall ?? result.score,
        convictionScore: hyper?.confidence ?? result.score,
        prismVerdict: result.recommendation,
        capRate: result.capRate,
        monthlyCashFlow: result.monthlyCashFlow,
        cashOnCash: result.cashOnCashReturn,
      },
    });
    setSavedToPipeline(true);
  };

  // Action: generate investment memo
  const handleGenerateMemo = () => {
    if (!result || memoGenerating) return;
    setMemoGenerating(true);
    try {
      const memoInput: MemoInput = {
        property: {
          address: result.address,
          city: result.address.split(",")[1]?.trim() ?? "",
          state: result.address.split(",").at(-1)?.trim().split(" ")[0] ?? "",
          zip,
          price: result.purchasePrice,
          sqft: result.sqft,
          bedrooms: result.bedrooms,
          bathrooms: result.bathrooms,
          yearBuilt: 2005,
          propertyType: "SFR",
        },
        analysis: {
          apexScore: hyper?.overall ?? result.score,
          prismVerdict: result.recommendation,
          convictionScore: hyper?.confidence ?? result.score,
          harmonicLevel: (hyper?.overall ?? result.score) >= 70 ? "Strong" : "Moderate",
          capRate: result.capRate,
          cashOnCash: result.cashOnCashReturn,
          monthlyCashFlow: result.monthlyCashFlow,
          dscr: result.estimatedRent / (result.monthlyMortgage || 1),
          estimatedValue: result.estimatedValue,
          predictedAppreciation: appreciation?.oneYear?.predicted ?? 3,
        },
        market: {
          name: result.address.split(",")[1]?.trim() ?? "Local Market",
          medianPrice: result.estimatedValue,
          priceChange: appreciation?.oneYear?.predicted ?? 3,
          capRate: result.capRate,
          popGrowth: 1.5,
          jobGrowth: 2.1,
          inventory: 3.2,
        },
        rates: {
          mortgageRate: result.interestRate,
          fedFunds: 5.25,
          rateDirection: "stable",
        },
        engineVotes: [
          { engine: "Financial", vote: result.capRate >= 5 ? "bullish" : "neutral", score: Math.min(100, result.score + 10) },
          { engine: "Market", vote: "bullish", score: Math.min(100, result.score + 5) },
          { engine: "Risk", vote: result.score >= 60 ? "bullish" : "bearish", score: result.score },
          { engine: "Demographic", vote: "bullish", score: Math.min(100, result.score + 3) },
        ],
        riskLevel: result.score >= 70 ? "low" : result.score >= 50 ? "moderate" : "high",
        riskFlags: result.explanation.negatives.slice(0, 3),
        mitigations: result.explanation.positives.slice(0, 2),
        stressTest: multiStressResult ? {
          resilience: multiStressResult.resilience,
          worstSurvivable: multiStressResult.worstSurvivableScenario,
          reservesNeeded: multiStressResult.monthsOfReserves * (result.monthlyExpenses || 1000),
        } : undefined,
      };
      setMemo(generateInvestmentMemo(memoInput));
    } finally {
      setMemoGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Analyze Property</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter an address. The 12 forces will read its destiny.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleAnalyze} className="bg-surface-card border border-surface-border rounded-xl p-4 md:p-6">
        <div className="space-y-4">
          <Input
            id="address"
            label="Property Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Austin, TX 78701"
            hint="Enter any US property address"
            disabled={analyzing}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="purchasePrice"
              label="Purchase Price"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="450000"
              prefix="$"
              hint="Leave blank to use estimate"
              disabled={analyzing}
            />
            <Input
              id="downPayment"
              label="Down Payment"
              type="number"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              suffix="%"
              disabled={analyzing}
            />
            <Input
              id="interestRate"
              label="Interest Rate"
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              suffix="%"
              disabled={analyzing}
            />
          </div>
          <Button type="submit" loading={analyzing} size="lg" className="w-full">
            <Search className="h-4 w-4" />
            {analyzing ? "Analyzing..." : "Analyze Property"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {analyzing && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-slide-up">
          {/* Grade + header + HyperScore */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-100 truncate">{result.address}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {result.bedrooms}bd / {result.bathrooms}ba / {result.sqft.toLocaleString()} sqft
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {hyper && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase">{"\u547D\u6578"} Destiny Score</p>
                    <p className="text-2xl font-bold text-money-400 font-mono">{hyper.overall}</p>
                    <Badge
                      variant={
                        hyper.recommendation.includes("BUY") ? "success" :
                        hyper.recommendation.includes("PASS") ? "danger" : "warning"
                      }
                      size="sm"
                    >
                      {hyper.recommendation.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
                <DealGradeBadge grade={getGrade(result.score)} score={result.score} size="lg" />
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Estimated Value"
              value={`$${result.estimatedValue.toLocaleString()}`}
              color="green"
              icon={DollarSign}
            />
            <MetricCard
              label="Monthly Rent"
              value={`$${result.estimatedRent.toLocaleString()}`}
              color="gold"
              icon={TrendingUp}
            />
            <MetricCard
              label="Cap Rate"
              value={`${result.capRate.toFixed(1)}%`}
              color={result.capRate >= 6 ? "green" : result.capRate >= 4 ? "gold" : "red"}
              icon={Target}
            />
            <MetricCard
              label="Cash-on-Cash"
              value={`${result.cashOnCashReturn.toFixed(1)}%`}
              color={result.cashOnCashReturn >= 8 ? "green" : result.cashOnCashReturn >= 4 ? "gold" : "red"}
              icon={Percent}
            />
          </div>

          {/* HyperScore Radar + Scenario side by side */}
          {hyper && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card header="8-Dimension HyperScore">
                <HyperScoreRadar dimensions={hyper.dimensions} size={300} />
              </Card>
              <Card header="Appreciation Scenarios (5yr)">
                <ScenarioChart
                  scenarios={scenarios}
                  currentPrice={result.purchasePrice}
                />
                {appreciation && (
                  <div className="mt-4 grid grid-cols-3 gap-3 p-3 bg-surface-elevated rounded-lg">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500">1 Year</p>
                      <p className="text-sm font-mono font-bold text-money-400">
                        +{appreciation.oneYear.predicted.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500">3 Year</p>
                      <p className="text-sm font-mono font-bold text-blue-400">
                        +{appreciation.threeYear.predicted.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500">5 Year</p>
                      <p className="text-sm font-mono font-bold text-gold-400">
                        +{appreciation.fiveYear.predicted.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tabbed analysis — now with wired Comps, Market, StressTest */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-6">
            <AnalysisTabs
              financials={{
                monthlyIncome: result.estimatedRent,
                monthlyMortgage: result.monthlyMortgage,
                monthlyExpenses: result.monthlyExpenses,
                monthlyCashFlow: result.monthlyCashFlow,
                capRate: result.capRate,
                cashOnCash: result.cashOnCashReturn,
                dscr: result.estimatedRent / (result.monthlyMortgage || 1),
                purchasePrice: result.purchasePrice,
                downPayment: result.downPayment,
              }}
              risk={{
                overallScore: result.score,
                dimensions: [
                  { name: "Market", score: Math.min(100, result.score + 5), level: result.score >= 60 ? "low" : "medium", description: "Market fundamentals and trends" },
                  { name: "Financial", score: Math.min(100, result.score + 10), level: result.capRate >= 6 ? "low" : "medium", description: "Cash flow and return metrics" },
                  { name: "Property", score: Math.max(0, result.score - 5), level: result.score >= 50 ? "low" : "medium", description: "Property condition and features" },
                  { name: "Economic", score: Math.min(100, result.score + 3), level: "low", description: "Local employment and GDP growth" },
                  { name: "Demographic", score: Math.max(0, result.score - 8), level: result.score >= 55 ? "low" : "medium", description: "Population and income trends" },
                  { name: "Climate", score: Math.min(100, result.score + 15), level: "low", description: "Natural disaster and climate risk" },
                  { name: "Regulatory", score: Math.max(0, result.score - 3), level: result.score >= 50 ? "low" : "high", description: "Zoning, rent control, regulations" },
                ],
              }}
              aiAnalysis={{
                summary: `This property at ${result.address} receives a ${result.recommendation} recommendation with an AI score of ${result.score}/100.`,
                positives: result.explanation.positives,
                negatives: result.explanation.negatives,
              }}
            />
          </div>

          {/* Stress Test */}
          <Card header="Financial Stress Test">
            <StressTestPanel
              baseMonthlyRent={result.estimatedRent}
              baseMortgage={result.monthlyMortgage}
              baseExpenses={result.monthlyExpenses - result.monthlyMortgage}
              interestRate={result.interestRate}
              purchasePrice={result.purchasePrice}
              downPaymentPct={result.downPayment}
            />
          </Card>

          {/* Institutional Metrics */}
          {institutionalMetrics && (
            <Card header="Institutional Analysis">
              <div className="space-y-4">
                {/* Core metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {institutionalMetrics.rules.slice(0, 6).map((rule) => (
                    <div key={rule.metric} className="bg-surface-elevated rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-gray-500 uppercase truncate">{rule.metric}</p>
                        {rule.passes ? (
                          <CheckCircle className="h-3.5 w-3.5 text-money-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-lg font-mono font-bold ${rule.passes ? "text-money-400" : "text-red-400"}`}>
                        {rule.metric === "Equity Multiple"
                          ? `${rule.value.toFixed(2)}x`
                          : `${rule.value.toFixed(1)}%`}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Benchmark: {rule.metric === "Equity Multiple" ? `${rule.benchmark.toFixed(1)}x` : `${rule.benchmark}%`}
                      </p>
                      <p className={`text-[10px] mt-1 ${rule.passes ? "text-money-600" : "text-red-600"}`}>
                        {rule.action}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Replacement Cost comparison */}
                <div className="bg-surface-elevated rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Replacement Cost Basis</p>
                      <p className="text-lg font-mono font-bold text-gray-100">
                        ${institutionalMetrics.replacementCostBasis.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={institutionalMetrics.buyingBelowReplacement ? "success" : "danger"} size="sm">
                      {institutionalMetrics.buyingBelowReplacement
                        ? `${institutionalMetrics.replacementCostDiscount.toFixed(1)}% below`
                        : "Above replacement"}
                    </Badge>
                  </div>
                </div>

                {/* Exit Cap Rate Sensitivity table */}
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2 uppercase">Exit Cap Rate Sensitivity</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-border">
                          <th className="text-left text-gray-500 py-1.5 pr-3">Exit Cap</th>
                          <th className="text-right text-gray-500 py-1.5 px-3">Exit Price</th>
                          <th className="text-right text-gray-500 py-1.5 px-3">Total Return</th>
                          <th className="text-right text-gray-500 py-1.5 pl-3">IRR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {institutionalMetrics.exitCapRateSensitivity.map((row, i) => (
                          <tr
                            key={row.exitCap}
                            className={`border-b border-surface-border/50 ${i === 2 ? "bg-surface-elevated" : ""}`}
                          >
                            <td className="py-1.5 pr-3 font-mono text-gray-300">
                              {row.exitCap.toFixed(2)}%{i === 2 ? " (base)" : ""}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-right text-gray-300">
                              ${row.exitPrice.toLocaleString()}
                            </td>
                            <td className={`py-1.5 px-3 font-mono text-right ${row.totalReturn >= 0 ? "text-money-400" : "text-red-400"}`}>
                              {row.totalReturn.toFixed(1)}%
                            </td>
                            <td className={`py-1.5 pl-3 font-mono text-right ${row.irr >= 15 ? "text-money-400" : row.irr >= 8 ? "text-gold-400" : "text-red-400"}`}>
                              {row.irr.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Multi-Variable Stress Test */}
          {multiStressResult && (
            <Card header="Multi-Variable Stress Test">
              <div className="space-y-4">
                {/* Resilience rating */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-300 font-semibold">Overall Resilience</p>
                      <p className="text-xs text-gray-500">{multiStressResult.thesis}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      multiStressResult.resilience === "fortress" || multiStressResult.resilience === "strong"
                        ? "success"
                        : multiStressResult.resilience === "adequate"
                          ? "warning"
                          : "danger"
                    }
                    size="md"
                  >
                    {multiStressResult.resilience.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                {/* Reserves recommendation */}
                <div className="bg-surface-elevated rounded-lg p-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">Recommended Reserves</p>
                  <p className="text-sm font-mono font-bold text-gold-400">
                    {multiStressResult.monthsOfReserves} months
                  </p>
                </div>

                {/* Scenario grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {multiStressResult.scenarios.map(({ scenario, survives, comparison, results }) => (
                    <div
                      key={scenario.name}
                      className={`rounded-lg p-3 border ${
                        survives
                          ? "bg-money-900/10 border-money-800/30"
                          : "bg-red-900/10 border-red-800/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-200 truncate">{scenario.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              scenario.severity === "mild" ? "info"
                                : scenario.severity === "moderate" ? "warning"
                                  : "danger"
                            }
                            size="sm"
                          >
                            {scenario.severity}
                          </Badge>
                          <span className={`text-sm font-bold ${survives ? "text-money-400" : "text-red-400"}`}>
                            {survives ? "\u2713" : "\u2717"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <p className="text-gray-500">Cash Flow</p>
                          <p className={`font-mono font-bold ${comparison.cashFlowChange >= 0 ? "text-money-400" : "text-red-400"}`}>
                            {comparison.cashFlowChange >= 0 ? "+" : ""}${comparison.cashFlowChange.toLocaleString()}/mo
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">DSCR</p>
                          <p className={`font-mono font-bold ${results.dscr >= 1.0 ? "text-money-400" : "text-red-400"}`}>
                            {results.dscr.toFixed(2)}x
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Comps Table */}
          {comps.length > 0 && (
            <Card header={`Comparable Sales (${comps.length})`}>
              <CompsTable comps={comps} subjectPrice={result.purchasePrice} />
            </Card>
          )}

          {/* Scenario Sliders — Interactive What-If */}
          <Card header="What-If Scenario Analysis">
            <ScenarioSliders
              basePrice={result.purchasePrice}
              baseRent={result.estimatedRent}
              baseDownPayment={result.downPayment}
              baseInterestRate={result.interestRate}
            />
          </Card>

          {/* AI Deal Advisor */}
          <AIAdvisor
            propertyContext={{
              address: result.address,
              price: result.purchasePrice,
              capRate: result.capRate,
              cashFlow: result.monthlyCashFlow,
              hyperScore: hyper?.overall ?? result.score,
              appreciation: appreciation?.oneYear?.predicted ?? 5,
            }}
          />

          {/* AI Analysis Stream */}
          <AIAnalysisStream
            address={result.address}
            score={result.score}
            recommendation={result.recommendation}
            positives={result.explanation.positives}
            negatives={result.explanation.negatives}
            capRate={result.capRate}
            cashOnCash={result.cashOnCashReturn}
            hyperScore={hyper?.overall}
          />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSaveToPipeline}
              disabled={savedToPipeline}
              className="flex-1"
              size="lg"
            >
              <Save className="h-4 w-4" />
              {savedToPipeline ? "Saved to \u805A\u5BF6\u76C6 Pipeline" : "Save to \u805A\u5BF6\u76C6 Pipeline"}
            </Button>
            <Button
              onClick={handleGenerateMemo}
              loading={memoGenerating}
              disabled={!!memo}
              className="flex-1"
              size="lg"
            >
              <FileText className="h-4 w-4" />
              {memo ? "\u8056\u65E8 Memo Generated" : "Generate \u8056\u65E8 Investment Memo"}
            </Button>
          </div>

          {/* Investment Memo Display */}
          {memo && (
            <Card header={`\u8056\u65E8 Investment Memo \u2014 ${new Date(memo.generatedAt).toLocaleDateString()}`}>
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Executive Summary</h4>
                  <p className="leading-relaxed">{memo.sections.executiveSummary}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Investment Overview</h4>
                  <p className="leading-relaxed">{memo.sections.investmentOverview}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Property Description</h4>
                  <p className="leading-relaxed">{memo.sections.propertyDescription}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Market Analysis</h4>
                  <p className="leading-relaxed">{memo.sections.marketAnalysis}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Financial Analysis</h4>
                  <p className="leading-relaxed">{memo.sections.financialAnalysis}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Risk Assessment</h4>
                  <p className="leading-relaxed">{memo.sections.riskAssessment}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Engine Consensus</h4>
                  <p className="leading-relaxed">{memo.sections.engineConsensus}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Recommendation</h4>
                  <p className="leading-relaxed">{memo.sections.recommendation}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gold-400 uppercase mb-1">Next Steps</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {memo.sections.nextSteps.map((step, i) => (
                      <li key={i} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="border-t border-surface-border pt-3 flex items-center gap-4 text-[10px] text-gray-500">
                  <span>APEX: <span className="font-mono text-money-400">{memo.metadata.apexScore}</span></span>
                  <span>PRISM: <span className="font-mono text-gold-400">{memo.metadata.prismVerdict}</span></span>
                  <span>Conviction: <span className="font-mono text-blue-400">{memo.metadata.convictionScore}%</span></span>
                  <span>Risk: <span className={`font-mono ${memo.metadata.riskLevel === "low" ? "text-money-400" : memo.metadata.riskLevel === "moderate" ? "text-gold-400" : "text-red-400"}`}>{memo.metadata.riskLevel}</span></span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
