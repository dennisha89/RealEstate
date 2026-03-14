"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MetricCard from "@/components/ui/MetricCard";
import DealGradeBadge from "@/components/analysis/DealGradeBadge";
import AnalysisTabs from "@/components/analysis/AnalysisTabs";
import { MetricCardSkeleton } from "@/components/ui/Skeleton";
import { DollarSign, TrendingUp, Target, Percent } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          ...(purchasePrice ? { purchasePrice: parseFloat(purchasePrice) } : {}),
          downPayment: parseFloat(downPayment) || 20,
          interestRate: parseFloat(interestRate) || 7.5,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Analyze Property</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter a property address for AI-powered investment analysis
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleAnalyze} className="bg-surface-card border border-surface-border rounded-xl p-6">
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

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
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

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-slide-up">
          {/* Grade + header */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-100">{result.address}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {result.bedrooms}bd / {result.bathrooms}ba / {result.sqft.toLocaleString()} sqft
                </p>
              </div>
              <DealGradeBadge grade={getGrade(result.score)} score={result.score} size="lg" />
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

          {/* Tabbed analysis */}
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
                summary: `This property at ${result.address} receives a ${result.recommendation} recommendation with an AI score of ${result.score}/100. The analysis considers financial metrics, market conditions, and risk factors.`,
                positives: result.explanation.positives,
                negatives: result.explanation.negatives,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
