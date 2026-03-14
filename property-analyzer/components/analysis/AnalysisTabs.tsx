"use client";

import {
  DollarSign,
  BarChart3,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import FinancialBreakdown from "./FinancialBreakdown";
import RiskAssessmentPanel from "./RiskAssessmentPanel";
import Card from "@/components/ui/Card";

interface AnalysisTabsProps {
  financials: {
    monthlyIncome: number;
    monthlyMortgage: number;
    monthlyExpenses: number;
    monthlyCashFlow: number;
    capRate: number;
    cashOnCash: number;
    dscr: number;
    purchasePrice: number;
    downPayment: number;
  };
  risk: {
    overallScore: number;
    dimensions: Array<{
      name: string;
      score: number;
      level: "low" | "medium" | "high";
      description: string;
    }>;
  };
  aiAnalysis: {
    positives: string[];
    negatives: string[];
    summary: string;
  };
}

const tabs = [
  { id: "financials", label: "Financials", icon: <DollarSign className="h-4 w-4" /> },
  { id: "comps", label: "Comps", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "market", label: "Market", icon: <MapPin className="h-4 w-4" /> },
  { id: "risk", label: "Risk", icon: <Shield className="h-4 w-4" /> },
  { id: "ai", label: "AI Insights", icon: <Sparkles className="h-4 w-4" /> },
];

export default function AnalysisTabs({ financials, risk, aiAnalysis }: AnalysisTabsProps) {
  return (
    <Tabs tabs={tabs} defaultTab="financials">
      {(activeTab) => {
        switch (activeTab) {
          case "financials":
            return <FinancialBreakdown {...financials} />;

          case "comps":
            return (
              <Card header="Comparable Sales">
                <div className="text-center py-12">
                  <MapPin className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Comparable sales analysis will appear here when connected to real data sources.
                  </p>
                </div>
              </Card>
            );

          case "market":
            return (
              <Card header="Market Analysis">
                <div className="text-center py-12">
                  <BarChart3 className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Market intelligence data will appear here when connected to real data sources.
                  </p>
                </div>
              </Card>
            );

          case "risk":
            return (
              <RiskAssessmentPanel
                overallScore={risk.overallScore}
                dimensions={risk.dimensions}
              />
            );

          case "ai":
            return (
              <Card>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {aiAnalysis.summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-money-400 mb-3 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-money-400" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {aiAnalysis.positives.map((item, i) => (
                        <li key={i} className="text-sm text-gray-400 pl-4 border-l-2 border-money-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      Concerns
                    </h4>
                    <ul className="space-y-2">
                      {aiAnalysis.negatives.map((item, i) => (
                        <li key={i} className="text-sm text-gray-400 pl-4 border-l-2 border-red-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );

          default:
            return null;
        }
      }}
    </Tabs>
  );
}
