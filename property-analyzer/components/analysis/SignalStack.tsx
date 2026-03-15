"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Target,
  Clock,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BookOpen,
} from "lucide-react";
import type { StackedSignalResult, SignalLayer, Signal } from "@/lib/engines/stacked-signal-engine";

interface SignalStackProps {
  result: StackedSignalResult;
  marketName?: string;
  showPlaybook?: boolean;
}

const recColors: Record<string, { bg: string; text: string; border: string }> = {
  STRONG_BUY: { bg: "bg-money-900/40", text: "text-money-400", border: "border-money-700/50" },
  BUY: { bg: "bg-money-900/30", text: "text-money-400", border: "border-money-800/40" },
  LEAN_BUY: { bg: "bg-money-900/20", text: "text-money-400", border: "border-money-800/30" },
  NEUTRAL: { bg: "bg-gray-800/30", text: "text-gray-400", border: "border-gray-700/30" },
  LEAN_PASS: { bg: "bg-red-900/20", text: "text-red-400", border: "border-red-800/30" },
  PASS: { bg: "bg-red-900/30", text: "text-red-400", border: "border-red-800/40" },
  STRONG_PASS: { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-700/50" },
};

const layerIcons = {
  leading: Zap,
  concurrent: Target,
  macro: Shield,
};

const layerLabels = {
  leading: "Leading Indicators (predict 6-24mo ahead)",
  concurrent: "Current Market Conditions",
  macro: "Macro Context",
};

/**
 * The Signal Stack visualization — the core output of the stacked signal engine.
 * Shows: probability gauge → signal layers → individual signals → thesis → playbook
 */
export default function SignalStack({ result, marketName, showPlaybook = true }: SignalStackProps) {
  const [expandedLayer, setExpandedLayer] = useState<string | null>("leading");
  const rec = recColors[result.recommendation] || recColors.NEUTRAL;

  return (
    <div className="space-y-5">
      {/* Hero: Probability + Recommendation */}
      <div className={`rounded-xl border ${rec.border} ${rec.bg} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {marketName ? `${marketName} — ` : ""}{"\u4E94\u884C"} Five Elements
            </p>
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-mono font-bold ${rec.text}`}>
                {result.probability}%
              </span>
              <span className={`text-sm font-medium px-2.5 py-1 rounded-lg ${rec.bg} ${rec.text} border ${rec.border}`}>
                {result.recommendation.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Probability of profitable investment · {result.confidence}% confidence
            </p>
          </div>

          {/* Probability gauge */}
          <div className="hidden sm:block">
            <ProbabilityGauge probability={result.probability} size={80} />
          </div>
        </div>

        {/* Signal count strip */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-money-400">
            <TrendingUp className="h-3 w-3" /> {result.bullishCount} bullish
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <Minus className="h-3 w-3" /> {result.neutralCount} neutral
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <TrendingDown className="h-3 w-3" /> {result.bearishCount} bearish
          </span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" /> {result.timeHorizon}
          </span>
        </div>
      </div>

      {/* Composite Score Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Composite Signal Score</span>
          <span className={`text-sm font-mono font-bold ${result.compositeScore > 0 ? "text-money-400" : result.compositeScore < 0 ? "text-red-400" : "text-gray-400"}`}>
            {result.compositeScore > 0 ? "+" : ""}{result.compositeScore}
          </span>
        </div>
        <div className="h-3 bg-surface-elevated rounded-full overflow-hidden relative">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600 z-10" />
          {/* Score fill */}
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-700"
            style={{
              left: result.compositeScore >= 0 ? "50%" : `${50 + result.compositeScore / 2}%`,
              width: `${Math.abs(result.compositeScore) / 2}%`,
              backgroundColor: result.compositeScore >= 0 ? "#22c55e" : "#ef4444",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-red-400/50">-100 PASS</span>
          <span className="text-[9px] text-gray-600">0</span>
          <span className="text-[9px] text-money-400/50">+100 BUY</span>
        </div>
      </div>

      {/* Signal Layers */}
      <div className="space-y-2">
        {result.layers.filter((l) => l.signals.length > 0).map((layer) => {
          const isExpanded = expandedLayer === layer.name;
          const LayerIcon = layerIcons[layer.name as keyof typeof layerIcons] || Shield;
          const layerLabel = layerLabels[layer.name as keyof typeof layerLabels] || layer.name;

          return (
            <div key={layer.name} className="rounded-lg border border-surface-border bg-surface-card overflow-hidden">
              {/* Layer header */}
              <button
                onClick={() => setExpandedLayer(isExpanded ? null : layer.name)}
                className="w-full flex items-center justify-between p-3 hover:bg-surface-elevated/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LayerIcon className="h-4 w-4 text-gray-500" />
                  <div className="text-left">
                    <p className="text-xs font-medium text-gray-300">{layerLabel}</p>
                    <p className="text-[10px] text-gray-600">
                      {layer.signals.length} signals · Weight: {(layer.weight * 100).toFixed(0)}% · Concordance: {(layer.concordance * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-bold ${layer.layerScore > 0 ? "text-money-400" : layer.layerScore < 0 ? "text-red-400" : "text-gray-500"}`}>
                    {layer.layerScore > 0 ? "+" : ""}{layer.layerScore}
                  </span>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                </div>
              </button>

              {/* Individual signals */}
              {isExpanded && (
                <div className="border-t border-surface-border">
                  {layer.signals
                    .sort((a, b) => Math.abs(b.normalizedScore) - Math.abs(a.normalizedScore))
                    .map((signal) => (
                    <div key={signal.id} className="flex items-start gap-3 px-3 py-2.5 border-b border-surface-border/50 last:border-0">
                      {/* Direction indicator */}
                      <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        signal.direction === "bullish" ? "bg-money-900/40" :
                        signal.direction === "bearish" ? "bg-red-900/40" : "bg-gray-800/40"
                      }`}>
                        {signal.direction === "bullish" ? <TrendingUp className="h-3 w-3 text-money-400" /> :
                         signal.direction === "bearish" ? <TrendingDown className="h-3 w-3 text-red-400" /> :
                         <Minus className="h-3 w-3 text-gray-500" />}
                      </div>

                      {/* Signal info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-300">{signal.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[9px] text-gray-600">{signal.source}</span>
                            <span className={`text-xs font-mono font-bold ${
                              signal.normalizedScore > 0 ? "text-money-400" : signal.normalizedScore < 0 ? "text-red-400" : "text-gray-500"
                            }`}>
                              {signal.normalizedScore > 0 ? "+" : ""}{signal.normalizedScore}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{signal.explanation}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {signal.leadTime}
                          </span>
                          {/* Signal strength bar */}
                          <div className="flex-1 h-1 bg-surface-elevated rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.abs(signal.normalizedScore)}%`,
                                backgroundColor: signal.normalizedScore > 0 ? "#22c55e" : signal.normalizedScore < 0 ? "#ef4444" : "#6b7280",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Thesis */}
      <div className="p-4 bg-surface-elevated/50 rounded-lg border border-surface-border/50">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Investment Thesis</p>
        <p className="text-sm text-gray-300 leading-relaxed">{result.thesis}</p>
      </div>

      {/* Key Drivers + Risks side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {result.keyDrivers.length > 0 && (
          <div className="p-3 rounded-lg border border-money-800/20 bg-money-900/10">
            <p className="text-[10px] text-money-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Key Drivers
            </p>
            <div className="space-y-1.5">
              {result.keyDrivers.map((d, i) => (
                <p key={i} className="text-xs text-gray-400 leading-relaxed">{d}</p>
              ))}
            </div>
          </div>
        )}
        {result.keyRisks.length > 0 && (
          <div className="p-3 rounded-lg border border-red-800/20 bg-red-900/10">
            <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Key Risks
            </p>
            <div className="space-y-1.5">
              {result.keyRisks.map((r, i) => (
                <p key={i} className="text-xs text-gray-400 leading-relaxed">{r}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Acquisition Playbook */}
      {showPlaybook && (
        <AcquisitionPlaybook result={result} />
      )}
    </div>
  );
}

// ============================================================
// Probability Gauge (mini circular gauge)
// ============================================================

function ProbabilityGauge({ probability, size = 80 }: { probability: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (probability / 100) * circumference;
  const color = probability >= 65 ? "#22c55e" : probability >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e2030" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="16" fontWeight="bold" fontFamily="monospace"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {probability}%
      </text>
    </svg>
  );
}

// ============================================================
// Acquisition Playbook — step-by-step guide based on signal
// ============================================================

function AcquisitionPlaybook({ result }: { result: StackedSignalResult }) {
  const [open, setOpen] = useState(false);

  const steps = getPlaybookSteps(result);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-money-400" />
          <span className="text-sm font-medium text-gray-200">Acquisition Playbook</span>
          <span className="text-[10px] text-gray-500">({steps.length} steps)</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>

      {open && (
        <div className="border-t border-surface-border p-4 space-y-4 animate-fade-in">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-money-900/40 border border-money-800/50 flex items-center justify-center text-[10px] font-bold text-money-400 flex-shrink-0">
                  {i + 1}
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-surface-border mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-gray-200">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                {step.action && (
                  <p className="text-[10px] text-money-400 mt-1 font-medium">{step.action}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getPlaybookSteps(result: StackedSignalResult): Array<{ title: string; description: string; action?: string }> {
  if (result.probability >= 65) {
    return [
      { title: "Validate the Signal", description: "Run full 8-dimension \u547D\u6578 Destiny Score analysis on specific properties in this market. Confirm the Five Elements thesis holds at the property level.", action: "\u2192 Use the Analyze page with a specific address" },
      { title: "Secure Financing Pre-Approval", description: `At current rates, get pre-approved for investment property financing. DSCR loans may offer better terms for properties with strong cap rates in this market.`, action: "→ Contact 2-3 lenders for rate quotes" },
      { title: "Set Alert Criteria", description: "Define your buy box: price range, minimum cap rate, maximum DOM, target neighborhoods within this market.", action: "→ Set up alerts (coming soon)" },
      { title: "Run Deal Analysis", description: "When properties matching your criteria appear, run full deal analysis including stress test scenarios (rate +1%, vacancy +5%, rent -10%).", action: "→ Use the Deal Scanner to find matches" },
      { title: "Make Offer with Contingencies", description: "Submit offers at or slightly below asking. Include inspection and appraisal contingencies. The market data gives you negotiation leverage.", action: "→ Track your offers in Portfolio" },
      { title: "Close & Monitor", description: "After closing, add the property to your portfolio. Monitor the same Five Elements signals monthly \u2014 if the thesis changes, reassess your hold strategy." },
    ];
  }

  if (result.probability >= 45) {
    return [
      { title: "Add to Watchlist", description: "This market shows potential but signals are mixed. Add it to your watchlist and monitor weekly for signal improvement." },
      { title: "Identify Specific Neighborhoods", description: "Within mixed markets, some neighborhoods outperform. Use the Discover feature to find micro-markets within this ZIP that have stronger fundamentals." },
      { title: "Wait for Confirmation", description: `Key signal to watch: ${result.keyDrivers[0] || "leading indicators"}. When this signal strengthens, the probability will increase.`, action: "→ Check back in 30 days" },
      { title: "Prepare Financing", description: "Get pre-approved now so you can move quickly when the signal confirms. Having financing ready is a competitive advantage." },
    ];
  }

  return [
    { title: "Do Not Enter This Market", description: `${result.bearishCount} bearish signals outweigh ${result.bullishCount} bullish factors. Capital deployed here has a ${result.probability}% probability of being profitable — below the 50% threshold.` },
    { title: "Redirect Capital", description: "Search for markets with stronger Five Elements profiles using the Markets comparison tool. Focus on markets with 65%+ probability.", action: "\u2192 Compare markets on the Markets page" },
    { title: "Monitor for Reversal", description: `Key reversal signal to watch: ${result.keyRisks[0] || "macro conditions"}. If this factor improves, reassess.`, action: "→ Check back in 60-90 days" },
  ];
}
