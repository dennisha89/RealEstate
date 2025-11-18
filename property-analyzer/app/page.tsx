"use client";

import { useState } from "react";
import PropertyForm from "@/components/PropertyForm";
import ResultsDisplay from "@/components/ResultsDisplay";

export interface AnalysisResult {
  address: string;
  estimatedValue: number;
  estimatedRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  purchasePrice: number;
  downPayment: number;
  interestRate: number;

  // Calculated metrics
  monthlyMortgage: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;

  // AI Score
  score: number;
  recommendation: "STRONG BUY" | "BUY" | "HOLD" | "PASS";
  explanation: {
    positives: string[];
    negatives: string[];
  };
}

export default function Home() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (address: string, purchasePrice: number, downPayment: number, interestRate: number) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          purchasePrice,
          downPayment,
          interestRate,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🏠 Property Analyzer
          </h1>
          <p className="text-xl text-gray-600">
            Analyze any property in 60 seconds. AI-powered buy/pass recommendations.
          </p>
        </div>

        <PropertyForm onAnalyze={handleAnalyze} analyzing={analyzing} />

        {error && (
          <div className="mt-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {result && <ResultsDisplay result={result} />}
      </div>
    </main>
  );
}
