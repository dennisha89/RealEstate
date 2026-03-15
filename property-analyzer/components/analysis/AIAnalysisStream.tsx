"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface AIAnalysisStreamProps {
  address: string;
  score: number;
  recommendation: string;
  positives: string[];
  negatives: string[];
  capRate?: number;
  cashOnCash?: number;
  hyperScore?: number;
}

/**
 * AI-powered narrative analysis display.
 * In production this would stream from the ai-analysis-engine via SSE.
 * For now it generates a structured narrative from the analysis data.
 */
export default function AIAnalysisStream({
  address,
  score,
  recommendation,
  positives,
  negatives,
  capRate,
  cashOnCash,
  hyperScore,
}: AIAnalysisStreamProps) {
  const [expanded, setExpanded] = useState(false);

  // Build narrative sections from analysis data
  const summary = buildSummary(address, score, recommendation, hyperScore);
  const financialNarrative = buildFinancialNarrative(capRate, cashOnCash);

  return (
    <Card>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-money-400" />
          <h4 className="text-sm font-semibold text-gray-200">AI Analysis</h4>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>

        {/* Financial narrative */}
        {financialNarrative && (
          <p className="text-sm text-gray-400 leading-relaxed">{financialNarrative}</p>
        )}

        {/* Strengths */}
        {positives.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-money-400 mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-money-400" />
              Investment Strengths
            </h5>
            <ul className="space-y-1.5">
              {positives.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-400 pl-4 border-l-2 border-money-800"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {negatives.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Risk Factors
            </h5>
            <ul className="space-y-1.5">
              {negatives.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-400 pl-4 border-l-2 border-red-800"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="pt-3 border-t border-surface-border animate-fade-in">
            <h5 className="text-sm font-semibold text-gray-300 mb-2">
              Detailed Assessment
            </h5>
            <p className="text-sm text-gray-400 leading-relaxed">
              {buildDetailedAssessment(score, positives, negatives)}
            </p>
          </div>
        )}

        {/* Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-money-400 hover:text-money-300 transition-colors"
        >
          {expanded ? "Show less" : "Show detailed assessment"}
        </button>
      </div>
    </Card>
  );
}

function buildSummary(
  address: string,
  score: number,
  recommendation: string,
  hyperScore?: number
): string {
  const recLabel = recommendation.replace(/_/g, " ").toLowerCase();
  const scoreDesc =
    score >= 80
      ? "an excellent"
      : score >= 65
      ? "a strong"
      : score >= 50
      ? "a moderate"
      : score >= 35
      ? "a below-average"
      : "a weak";

  let text = `The property at ${address} receives ${scoreDesc} investment score of ${score}/100, resulting in a "${recLabel}" recommendation.`;

  if (hyperScore && hyperScore !== score) {
    text += ` The multi-dimensional HyperScore analysis rates this market at ${hyperScore}/100 across 8 key dimensions.`;
  }

  return text;
}

function buildFinancialNarrative(
  capRate?: number,
  cashOnCash?: number
): string | null {
  if (!capRate && !cashOnCash) return null;

  const parts: string[] = [];
  if (capRate) {
    if (capRate >= 7)
      parts.push(`a strong ${capRate.toFixed(1)}% cap rate that exceeds typical investor thresholds`);
    else if (capRate >= 5)
      parts.push(`a moderate ${capRate.toFixed(1)}% cap rate within acceptable investment range`);
    else
      parts.push(`a ${capRate.toFixed(1)}% cap rate below the typical 5%+ investor threshold`);
  }
  if (cashOnCash) {
    if (cashOnCash >= 10)
      parts.push(`an excellent ${cashOnCash.toFixed(1)}% cash-on-cash return`);
    else if (cashOnCash >= 6)
      parts.push(`a solid ${cashOnCash.toFixed(1)}% cash-on-cash return`);
    else
      parts.push(`a ${cashOnCash.toFixed(1)}% cash-on-cash return that may be below target for active investors`);
  }

  return `From a financial perspective, the property shows ${parts.join(" and ")}.`;
}

function buildDetailedAssessment(
  score: number,
  positives: string[],
  negatives: string[]
): string {
  const netSentiment = positives.length - negatives.length;
  if (netSentiment > 2) {
    return `With ${positives.length} identified strengths against only ${negatives.length} risk factors, this property demonstrates a favorable risk-reward profile. The concentration of positive indicators suggests sustained performance potential. Consider securing this opportunity if it aligns with your portfolio strategy and risk tolerance.`;
  }
  if (netSentiment > 0) {
    return `The analysis reveals a balanced investment profile with ${positives.length} strengths and ${negatives.length} concerns. While the positives marginally outweigh the risks, investors should monitor the identified risk factors and ensure adequate reserves. This property could serve well in a diversified portfolio.`;
  }
  return `Caution is advised — the analysis identifies ${negatives.length} risk factors against ${positives.length} strengths. The risk profile suggests careful due diligence is warranted. Consider stress-testing the financials under adverse scenarios before committing capital.`;
}
