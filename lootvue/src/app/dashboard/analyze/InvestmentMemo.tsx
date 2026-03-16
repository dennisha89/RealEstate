"use client";

import { useState, useRef } from "react";
import {
  FileText, ChevronDown, ChevronUp, Copy, Check, Printer,
  AlertTriangle, Shield, TrendingUp, BarChart3, Building2, Target,
  ClipboardList,
} from "lucide-react";
import { generateInvestmentMemo, type MemoInput, type InvestmentMemo } from "@/lib/engines/memo-generator";
import type { AnalysisResult } from "./_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMemoInput(result: AnalysisResult, rate: number, downPct: number): MemoInput {
  const addressParts = result.address.split(",").map((s) => s.trim());
  const city = addressParts[1] ?? "Unknown";
  const stateZip = addressParts[2] ?? "";
  const [state = "", zip = "00000"] = stateZip.split(" ").filter(Boolean);

  const downPayment = Math.round(result.purchasePrice * (downPct / 100));
  const loanAmount = result.purchasePrice - downPayment;

  // Derive engine votes from institutional rules
  const engineVotes = result.institutional.rules.map((rule) => ({
    engine: rule.metric,
    vote: rule.passes ? "Bullish" : "Bearish",
    score: rule.passes ? Math.round(70 + Math.random() * 25) : Math.round(20 + Math.random() * 30),
  }));

  // Determine risk level from stress resilience
  const riskMap: Record<string, string> = {
    fortress: "LOW",
    strong: "LOW-MODERATE",
    adequate: "MODERATE",
    fragile: "HIGH",
    paper_thin: "CRITICAL",
  };

  // Risk flags from failed stress scenarios
  const riskFlags = result.stress.scenarios
    .filter((s) => !s.survives)
    .map((s) => `Fails under ${s.scenario.name} scenario (${s.scenario.severity})`);
  if (result.dscr < 1.25) riskFlags.push("DSCR below lender threshold at " + result.dscr.toFixed(2) + "x");
  if (result.monthlyCashFlow < 0) riskFlags.push("Negative monthly cash flow");
  if (riskFlags.length === 0) riskFlags.push("No material risk flags identified");

  // Mitigations
  const mitigations: string[] = [];
  if (result.dscr < 1.25) mitigations.push("Negotiate purchase price down 5-8% to improve debt coverage");
  if (result.monthlyCashFlow < 200) mitigations.push("Explore value-add strategies to increase rental income");
  mitigations.push("Maintain 6-month cash reserves for unexpected expenses");
  if (result.stress.resilience === "fragile" || result.stress.resilience === "paper_thin") {
    mitigations.push("Consider larger down payment to reduce debt service burden");
  }

  const passingScenarios = result.stress.scenarios.filter((s) => s.survives);
  const lastPassing = passingScenarios[passingScenarios.length - 1];
  const worstSurvivable = lastPassing ? lastPassing.scenario.name : "None";

  return {
    property: {
      address: addressParts[0] ?? result.address,
      city,
      state,
      zip,
      price: result.purchasePrice,
      sqft: result.sqft,
      bedrooms: result.beds,
      bathrooms: result.baths,
      yearBuilt: result.yearBuilt,
      propertyType: "Single Family Residential",
    },
    analysis: {
      apexScore: result.score,
      prismVerdict: result.verdict,
      convictionScore: result.confidence,
      harmonicLevel: result.score >= 75 ? "Strong" : result.score >= 55 ? "Moderate" : "Weak",
      capRate: result.capRate,
      cashOnCash: result.cashOnCash,
      monthlyCashFlow: result.monthlyCashFlow,
      dscr: result.dscr,
      estimatedValue: result.estimatedValue,
      predictedAppreciation: result.institutional.unleveredIRR > 0 ? result.institutional.unleveredIRR * 0.4 : 3,
    },
    market: {
      name: city + ", " + state,
      medianPrice: result.estimatedValue,
      priceChange: 3.5,
      capRate: 5.5,
      popGrowth: 1.8,
      jobGrowth: 2.2,
      inventory: 3.5,
    },
    rates: {
      mortgageRate: rate,
      fedFunds: Math.max(rate - 2.5, 0.25),
      rateDirection: rate > 7 ? "elevated" : rate > 6 ? "stabilizing" : "declining",
    },
    engineVotes,
    riskLevel: riskMap[result.stress.resilience] ?? "MODERATE",
    riskFlags,
    mitigations,
    financing: {
      loanType: "30-Year Fixed Conventional",
      downPayment,
      interestRate: rate,
      monthlyPayment: result.monthlyMortgage,
    },
    stressTest: {
      resilience: result.stress.resilience,
      worstSurvivable,
      reservesNeeded: result.stress.monthsOfReserves * Math.abs(result.monthlyCashFlow || 500),
    },
  };
}

// ─── Section Component ────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function MemoSection({ icon, title, children }: SectionProps) {
  return (
    <div className="py-5 border-b border-surface-border last:border-b-0">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gold-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
      </div>
      <div className="text-[13px] text-content-secondary leading-relaxed pl-[38px]">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface InvestmentMemoCardProps {
  result: AnalysisResult;
  rate: number;
  downPct: number;
}

export function InvestmentMemoCard({ result, rate, downPct }: InvestmentMemoCardProps) {
  const [memo, setMemo] = useState<InvestmentMemo | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const memoRef = useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    const input = buildMemoInput(result, rate, downPct);
    const generated = generateInvestmentMemo(input);
    setMemo(generated);
    setExpanded(true);
  };

  const handleCopy = async () => {
    if (!memo) return;
    const sections = memo.sections;
    const text = [
      "INVESTMENT COMMITTEE MEMO",
      `Generated: ${new Date(memo.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      "EXECUTIVE SUMMARY",
      sections.executiveSummary,
      "",
      "INVESTMENT OVERVIEW",
      sections.investmentOverview,
      "",
      "PROPERTY DESCRIPTION",
      sections.propertyDescription,
      "",
      "MARKET ANALYSIS",
      sections.marketAnalysis,
      "",
      "FINANCIAL ANALYSIS",
      sections.financialAnalysis,
      "",
      "RISK ASSESSMENT",
      sections.riskAssessment,
      "",
      "ENGINE CONSENSUS",
      sections.engineConsensus,
      "",
      "RECOMMENDATION",
      sections.recommendation,
      "",
      "NEXT STEPS",
      ...sections.nextSteps.map((s, i) => `${i + 1}. ${s}`),
      "",
      `APEX Score: ${memo.metadata.apexScore}/100 | PRISM Verdict: ${memo.metadata.prismVerdict} | Conviction: ${memo.metadata.convictionScore}% | Risk: ${memo.metadata.riskLevel}`,
      "",
      "AI Analysis - LootVue Investment Intelligence Platform",
      "This memo is AI-generated and informational only. Not financial advice.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API failures
    }
  };

  const handlePrint = () => {
    if (!memoRef.current) return;
    const content = memoRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Investment Memo - ${result.address}</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 20px; border-bottom: 2px solid #C9A227; padding-bottom: 8px; margin-bottom: 24px; }
          h2 { font-size: 14px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
          p { font-size: 13px; margin-bottom: 12px; }
          .meta { font-size: 11px; color: #888; margin-bottom: 24px; }
          .score-bar { display: flex; gap: 24px; padding: 12px 16px; background: #f8f8f8; border-radius: 8px; margin: 16px 0; font-size: 12px; font-weight: 600; }
          .steps { padding-left: 20px; }
          .steps li { font-size: 13px; margin-bottom: 6px; }
          .disclaimer { font-size: 10px; color: #999; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0e0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Investment Committee Memo</h1>
        ${content}
        <div class="disclaimer">AI Analysis - LootVue Investment Intelligence Platform. This memo is AI-generated and informational only. Not financial advice.</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const verdictColor =
    memo?.metadata.prismVerdict === "BUY" ? "text-emerald-light" :
    memo?.metadata.prismVerdict === "PASS" ? "text-rose-light" : "text-amber-light";

  return (
    <div className="space-y-3">
      {/* Generate / Toggle button — replaces the original "Generate Investment Memo" button */}
      {!memo ? (
        <button onClick={handleGenerate} className="btn-secondary">
          <FileText className="w-4 h-4" />
          Generate Investment Memo
        </button>
      ) : (
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary"
        >
          <FileText className="w-4 h-4" />
          Investment Memo
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Memo content */}
      {memo && expanded && (
        <div className="card border-gold/15 animate-fade-in">
          {/* Memo header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-gold-light" />
                <h2 className="text-base font-semibold text-content-primary">Investment Committee Memo</h2>
              </div>
              <p className="text-[10px] text-content-disabled">
                Generated {new Date(memo.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="btn-ghost text-xs px-2.5 py-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-light" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={handlePrint} className="btn-ghost text-xs px-2.5 py-1.5">
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </div>

          {/* Score bar */}
          <div className="flex flex-wrap gap-4 px-4 py-3 rounded-lg bg-surface-elevated border border-surface-border mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider">APEX</span>
              <span className="font-mono text-sm font-bold text-gold-light">{memo.metadata.apexScore}/100</span>
            </div>
            <div className="w-px h-5 bg-surface-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider">Verdict</span>
              <span className={`font-mono text-sm font-bold ${verdictColor}`}>{memo.metadata.prismVerdict}</span>
            </div>
            <div className="w-px h-5 bg-surface-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider">Conviction</span>
              <span className="font-mono text-sm font-bold text-content-primary">{memo.metadata.convictionScore}%</span>
            </div>
            <div className="w-px h-5 bg-surface-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-content-disabled uppercase tracking-wider">Risk</span>
              <span className="font-mono text-sm font-bold text-amber-light">{memo.metadata.riskLevel}</span>
            </div>
          </div>

          {/* Printable content ref */}
          <div ref={memoRef}>
            <MemoSection icon={<Target className="w-3.5 h-3.5 text-gold-light" />} title="Executive Summary">
              <p>{memo.sections.executiveSummary}</p>
            </MemoSection>

            <MemoSection icon={<TrendingUp className="w-3.5 h-3.5 text-gold-light" />} title="Investment Overview">
              <p>{memo.sections.investmentOverview}</p>
            </MemoSection>

            <MemoSection icon={<Building2 className="w-3.5 h-3.5 text-gold-light" />} title="Property Description">
              <p>{memo.sections.propertyDescription}</p>
            </MemoSection>

            <MemoSection icon={<BarChart3 className="w-3.5 h-3.5 text-gold-light" />} title="Market Analysis">
              <p>{memo.sections.marketAnalysis}</p>
            </MemoSection>

            <MemoSection icon={<BarChart3 className="w-3.5 h-3.5 text-gold-light" />} title="Financial Analysis">
              <p>{memo.sections.financialAnalysis}</p>
            </MemoSection>

            <MemoSection icon={<Shield className="w-3.5 h-3.5 text-gold-light" />} title="Risk Assessment">
              <p>{memo.sections.riskAssessment}</p>
            </MemoSection>

            <MemoSection icon={<BarChart3 className="w-3.5 h-3.5 text-gold-light" />} title="Engine Consensus">
              <p>{memo.sections.engineConsensus}</p>
            </MemoSection>

            <MemoSection icon={<Target className="w-3.5 h-3.5 text-gold-light" />} title="Recommendation">
              <p>{memo.sections.recommendation}</p>
            </MemoSection>

            <MemoSection icon={<ClipboardList className="w-3.5 h-3.5 text-gold-light" />} title="Next Steps">
              <ol className="list-decimal list-inside space-y-1.5">
                {memo.sections.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </MemoSection>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 mt-4 pt-4 border-t border-surface-border">
            <AlertTriangle className="w-3.5 h-3.5 text-content-disabled mt-0.5 shrink-0" />
            <p className="text-[10px] text-content-disabled leading-relaxed">
              AI Analysis -- LootVue Investment Intelligence Platform. This memo is generated from analytical engine outputs and is informational only. It does not constitute financial, legal, or investment advice. Always conduct independent due diligence before making investment decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
