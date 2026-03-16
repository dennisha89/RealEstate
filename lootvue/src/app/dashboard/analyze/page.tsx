"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Save, ArrowLeftRight, AlertTriangle, SlidersHorizontal, Wifi, Database, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  AnalysisSkeleton, MetricsGrid, CalculationChain, InstitutionalCard, StressTestCard,
  ExitCapTable, VerdictCard, CashFlowWaterfall, RiskGauge, CompsSection,
  DealDimensionsChart, scoreColor,
  type AnalysisResult,
} from "./_components";
import { InstantVerdict } from "./InstantVerdict";
import { InvestmentMemoCard } from "./InvestmentMemo";
import { AiInsightCard } from "@/components/charts/ChartTheme";
import { GuidedSteps } from "@/components/shared/GuidedSteps";
import { AiInsight } from "@/components/shared/AiInsight";
import { formatCurrency } from "@/lib/utils/format";

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface DataSourceInfo {
  name: string;
  status: "live" | "fallback" | "unavailable";
  source?: string;
}

// ─── Page ───────────────────────────────────────────────────────────────────

function AnalyzePageContent() {
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [downPct, setDownPct] = useState("20");
  const [rate, setRate] = useState("6.95");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [realDataPct, setRealDataPct] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const appMode = useUIStore((state) => state.appMode);
  const setAppMode = useUIStore((state) => state.setAppMode);
  const [guidedStep, setGuidedStep] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const loadDeal = useSimulatorStore((s) => s.loadDeal);

  const GUIDED_STEPS = [
    { id: "cost", label: "What Does It Cost?" },
    { id: "earn", label: "What Will You Earn?" },
    { id: "deal", label: "Is It a Good Deal?" },
    { id: "risk", label: "What Could Go Wrong?" },
    { id: "verdict", label: "Our Verdict" },
  ];

  // Auto-fill from query params (e.g., from Discover → Analyze)
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);
  useEffect(() => {
    const qAddress = searchParams.get("address");
    const qPrice = searchParams.get("price");
    if (qAddress && !autoAnalyzed) {
      setAddress(qAddress);
      if (qPrice) setPrice(qPrice);
      setAutoAnalyzed(true);
    }
  }, [searchParams, autoAnalyzed]);

  const analyze = useCallback(async () => {
    if (!address.trim()) return;
    setLoading(true);
    setSaved(false);
    setResult(null);
    setApiError(null);
    setDataSources([]);

    try {
      // Step 1: Geocode the address to get zip, lat/lng, FIPS
      let zipCode: string | undefined;
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const geoRes = await fetch(`/api/property/lookup?address=${encodeURIComponent(address.trim())}`);
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson.data) {
            zipCode = geoJson.data.zipCode;
            lat = geoJson.data.lat;
            lng = geoJson.data.lng;
          }
        }
      } catch {
        // Geocoding failed — continue without coordinates
      }

      // Step 2: Call the analysis API with all available context
      const body = {
        address: address.trim(),
        zipCode,
        lat,
        lng,
        purchasePrice: price ? parseInt(price.replace(/\D/g, ""), 10) || undefined : undefined,
        downPaymentPct: parseFloat(downPct) || 20,
        interestRate: parseFloat(rate) || 6.95,
      };

      const res = await fetch("/api/property/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = json.data;

      // Map API response to AnalysisResult shape
      const analysisResult: AnalysisResult = {
        address: data.address,
        beds: data.beds,
        baths: data.baths,
        sqft: data.sqft,
        yearBuilt: data.yearBuilt,
        purchasePrice: data.purchasePrice,
        estimatedValue: data.estimatedValue,
        monthlyRent: data.monthlyRent,
        score: data.score,
        verdict: data.verdict,
        confidence: data.confidence,
        narrative: data.narrative,
        nextSteps: data.nextSteps,
        capRate: data.capRate,
        monthlyCashFlow: data.monthlyCashFlow,
        dscr: data.dscr,
        cashOnCash: data.cashOnCash,
        monthlyMortgage: data.monthlyMortgage,
        monthlyExpenses: data.monthlyExpenses,
        institutional: data.institutional,
        stress: data.stress,
      };

      setResult(analysisResult);
      setDataSources(data.dataSources ?? []);
      setRealDataPct(data.realDataPct ?? 0);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
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

  const liveCount = dataSources.filter((s) => s.status === "live").length;

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
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {apiError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-muted/40 border border-rose/10">
          <AlertTriangle className="w-4 h-4 text-rose-light mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] text-rose-light font-medium">Analysis failed</p>
            <p className="text-[11px] text-rose-light/70 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* ── Loading State ────────────────────────────────────────────────── */}
      {loading && <AnalysisSkeleton />}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-in">

          {appMode === "simple" ? (
            /* ═══════════════════════════════════════════════════════════════
               SIMPLE MODE — Guided 5-step flow for first-time investors
            ═══════════════════════════════════════════════════════════════ */
            <div className="space-y-5">

              {/* Step progress indicator */}
              <div className="card">
                <GuidedSteps
                  steps={GUIDED_STEPS}
                  currentStep={guidedStep}
                  onStepChange={setGuidedStep}
                />
              </div>

              {/* ── Step 0: What Does It Cost? ─────────────────────────── */}
              {guidedStep === 0 && (
                <div className="card space-y-5 animate-fade-in">
                  <h2 className="text-base font-semibold text-content-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gold-muted border border-gold/40 flex items-center justify-center text-[11px] font-bold text-gold-light" aria-hidden="true">1</span>
                    What Does It Cost?
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border">
                      <p className="metric-label mb-1">Purchase Price</p>
                      <p className="metric-value text-content-primary" aria-label={`Purchase price: ${formatCurrency(result.purchasePrice)}`}>{formatCurrency(result.purchasePrice)}</p>
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border">
                      <p className="metric-label mb-1">Down Payment</p>
                      <p className="metric-value text-content-primary" aria-label={`Down payment: ${formatCurrency(Math.round(result.purchasePrice * (parseFloat(downPct) || 20) / 100))}`}>
                        {formatCurrency(Math.round(result.purchasePrice * (parseFloat(downPct) || 20) / 100))}
                      </p>
                      <p className="text-[11px] text-content-disabled mt-0.5 font-mono">{downPct}% of price</p>
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border">
                      <p className="metric-label mb-1">Monthly Mortgage</p>
                      <p className="metric-value text-content-primary" aria-label={`Monthly mortgage: ${formatCurrency(result.monthlyMortgage)}`}>{formatCurrency(result.monthlyMortgage)}</p>
                      <p className="text-[11px] text-content-disabled mt-0.5 font-mono">{rate}% rate · 30yr fixed</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="text-[13px] text-content-tertiary leading-relaxed">
                      Your upfront cost is{" "}
                      <span className="text-content-primary font-semibold font-mono">
                        {formatCurrency(Math.round(result.purchasePrice * (parseFloat(downPct) || 20) / 100))}
                      </span>{" "}
                      down, then{" "}
                      <span className="text-content-primary font-semibold font-mono">{formatCurrency(result.monthlyMortgage)}</span>{" "}
                      every month to the bank before counting expenses or rent.
                    </p>
                    <div className="mt-3">
                      <AiInsight metric="cash_flow" value={result.monthlyCashFlow} compact />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1: What Will You Earn? ────────────────────────── */}
              {guidedStep === 1 && (
                <div className="card space-y-5 animate-fade-in">
                  <h2 className="text-base font-semibold text-content-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gold-muted border border-gold/40 flex items-center justify-center text-[11px] font-bold text-gold-light" aria-hidden="true">2</span>
                    What Will You Earn?
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border">
                      <p className="metric-label mb-1">Monthly Rent</p>
                      <p className="metric-value text-emerald-light" aria-label={`Monthly rent: ${formatCurrency(result.monthlyRent)}`}>{formatCurrency(result.monthlyRent)}</p>
                      <p className="text-[11px] text-content-disabled mt-0.5">Estimated market rent</p>
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border">
                      <p className="metric-label mb-1">Monthly Expenses</p>
                      <p className="metric-value text-rose-light" aria-label={`Monthly expenses: ${formatCurrency(result.monthlyExpenses)}`}>{formatCurrency(result.monthlyExpenses)}</p>
                      <p className="text-[11px] text-content-disabled mt-0.5">Tax · ins · maint · vacancy</p>
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border">
                      <p className="metric-label mb-1">Net Cash Flow</p>
                      <p
                        className={`metric-value ${result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}
                        aria-label={`Net cash flow: ${result.monthlyCashFlow >= 0 ? "positive" : "negative"} ${formatCurrency(Math.abs(result.monthlyCashFlow))} per month`}
                      >
                        {result.monthlyCashFlow >= 0
                          ? formatCurrency(result.monthlyCashFlow)
                          : `(${formatCurrency(Math.abs(result.monthlyCashFlow))})`}
                      </p>
                      <p className="text-[11px] text-content-disabled mt-0.5">Per month after all costs</p>
                    </div>
                  </div>

                  {/* Simple income − expense breakdown */}
                  <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border font-mono text-[13px] space-y-2" role="table" aria-label="Monthly cash flow breakdown">
                    <div className="flex justify-between" role="row">
                      <span className="text-content-secondary" role="cell">Monthly Rent</span>
                      <span className="text-emerald-light" role="cell">+{formatCurrency(result.monthlyRent)}</span>
                    </div>
                    <div className="flex justify-between" role="row">
                      <span className="text-content-secondary" role="cell">Operating Expenses</span>
                      <span className="text-rose-light" role="cell">−{formatCurrency(result.monthlyExpenses)}</span>
                    </div>
                    <div className="flex justify-between" role="row">
                      <span className="text-content-secondary" role="cell">Mortgage Payment</span>
                      <span className="text-rose-light" role="cell">−{formatCurrency(result.monthlyMortgage)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-surface-border font-bold" role="row">
                      <span className="text-content-primary" role="cell">Net Cash Flow</span>
                      <span className={result.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"} role="cell">
                        {result.monthlyCashFlow >= 0
                          ? `+${formatCurrency(result.monthlyCashFlow)}`
                          : `(${formatCurrency(Math.abs(result.monthlyCashFlow))})`}
                        /mo
                      </span>
                    </div>
                  </div>

                  <AiInsight metric="cash_flow" value={result.monthlyCashFlow} />
                </div>
              )}

              {/* ── Step 2: Is It a Good Deal? ─────────────────────────── */}
              {guidedStep === 2 && (
                <div className="card space-y-5 animate-fade-in">
                  <h2 className="text-base font-semibold text-content-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gold-muted border border-gold/40 flex items-center justify-center text-[11px] font-bold text-gold-light" aria-hidden="true">3</span>
                    Is It a Good Deal?
                  </h2>

                  {/* Deal score gauge */}
                  <div
                    className="flex items-center gap-5 p-4 bg-surface-secondary rounded-xl border border-surface-border"
                    aria-label={`Deal score: ${result.score} out of 100`}
                  >
                    <div className="flex flex-col items-center">
                      <span className={`text-5xl font-bold font-mono tabular-nums ${scoreColor(result.score)}`}>
                        {result.score}
                      </span>
                      <span className="metric-label mt-1">Deal Score</span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full h-2.5 bg-surface-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            result.score >= 75 ? "bg-emerald" : result.score >= 55 ? "bg-amber" : "bg-rose"
                          }`}
                          style={{ width: `${result.score}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1" aria-hidden="true">
                        <span className="text-[10px] text-rose-light font-mono">0 Avoid</span>
                        <span className="text-[10px] text-amber-light font-mono">55 Hold</span>
                        <span className="text-[10px] text-emerald-light font-mono">75+ Buy</span>
                      </div>
                    </div>
                  </div>

                  {/* Key metrics with inline AiInsight */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border space-y-2">
                      <p className="metric-label">Cap Rate</p>
                      <p className={`metric-value ${scoreColor(result.capRate >= 7 ? 80 : result.capRate >= 5 ? 60 : 40)}`}>
                        {result.capRate.toFixed(1)}%
                      </p>
                      <p className="text-[11px] text-content-disabled">Annual income ÷ price</p>
                      <AiInsight metric="cap_rate" value={result.capRate} compact />
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border space-y-2">
                      <p className="metric-label">Cash-on-Cash</p>
                      <p className={`metric-value ${scoreColor(result.cashOnCash >= 8 ? 80 : result.cashOnCash >= 5 ? 60 : 40)}`}>
                        {result.cashOnCash.toFixed(1)}%
                      </p>
                      <p className="text-[11px] text-content-disabled">Annual return on cash invested</p>
                      <AiInsight metric="coc" value={result.cashOnCash} compact />
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-surface-border space-y-2">
                      <p className="metric-label">DSCR</p>
                      <p className={`metric-value ${scoreColor(result.dscr >= 1.25 ? 80 : result.dscr >= 1.0 ? 60 : 40)}`}>
                        {result.dscr.toFixed(2)}x
                      </p>
                      <p className="text-[11px] text-content-disabled">Rent ÷ mortgage (need &gt;1.0)</p>
                      <AiInsight metric="dscr" value={result.dscr} compact />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: What Could Go Wrong? ───────────────────────── */}
              {guidedStep === 3 && (
                <div className="card space-y-5 animate-fade-in">
                  <h2 className="text-base font-semibold text-content-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gold-muted border border-gold/40 flex items-center justify-center text-[11px] font-bold text-gold-light" aria-hidden="true">4</span>
                    What Could Go Wrong?
                  </h2>

                  <p className="text-[13px] text-content-tertiary">
                    We ran {result.stress.scenarios.length} stress scenarios against this deal. Here is how it holds up:
                  </p>

                  {/* Simplified pass/fail scenario list */}
                  <ul className="space-y-2" aria-label="Stress test scenarios">
                    {result.stress.scenarios.map((s) => (
                      <li
                        key={s.scenario.name}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          s.survives
                            ? "bg-emerald-muted/20 border-emerald/15"
                            : "bg-rose-muted/20 border-rose/15"
                        }`}
                        aria-label={`${s.scenario.name}: ${s.survives ? "passes" : "fails"}, cash flow ${s.results.monthlyCashFlow >= 0 ? formatCurrency(s.results.monthlyCashFlow) : `negative ${formatCurrency(Math.abs(s.results.monthlyCashFlow))}`} per month`}
                      >
                        {s.survives ? (
                          <CheckCircle className="w-4 h-4 text-emerald-light shrink-0" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-light shrink-0" aria-hidden="true" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] text-content-primary font-medium">{s.scenario.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              s.scenario.severity === "mild" ? "bg-emerald-muted text-emerald-light" :
                              s.scenario.severity === "moderate" ? "bg-amber-muted text-amber-light" :
                              s.scenario.severity === "severe" ? "bg-rose-muted text-rose-light" :
                              "bg-rose-muted/60 text-rose-light"
                            }`}>
                              {s.scenario.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-content-disabled mt-0.5 truncate">{s.scenario.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[13px] font-mono font-bold ${s.results.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                            {s.results.monthlyCashFlow >= 0
                              ? formatCurrency(s.results.monthlyCashFlow)
                              : `(${formatCurrency(Math.abs(s.results.monthlyCashFlow))})`}
                          </p>
                          <p className="text-[10px] text-content-disabled">cash flow/mo</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Resilience summary */}
                  <div className="p-3 rounded-lg bg-surface-secondary border border-surface-border">
                    <div className="flex items-center justify-between">
                      <span className="metric-label">Overall Resilience</span>
                      <span className={`text-sm font-semibold capitalize ${
                        result.stress.resilience === "fortress" || result.stress.resilience === "strong"
                          ? "text-emerald-light"
                          : result.stress.resilience === "adequate"
                          ? "text-amber-light"
                          : "text-rose-light"
                      }`}>
                        {result.stress.resilience.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-content-tertiary mt-1">{result.stress.thesis}</p>
                  </div>

                  <AiInsight
                    metric="stress_resilience"
                    value={
                      result.stress.resilience === "fortress" ? 90 :
                      result.stress.resilience === "strong" ? 75 :
                      result.stress.resilience === "adequate" ? 55 :
                      result.stress.resilience === "fragile" ? 35 : 15
                    }
                  />
                </div>
              )}

              {/* ── Step 4: Our Verdict ────────────────────────────────── */}
              {guidedStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="card">
                    <h2 className="text-base font-semibold text-content-primary flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-gold-muted border border-gold/40 flex items-center justify-center text-[11px] font-bold text-gold-light" aria-hidden="true">5</span>
                      Our Verdict
                    </h2>
                    <InstantVerdict
                      result={result}
                      downPct={parseFloat(downPct) || 20}
                      rate={parseFloat(rate) || 6.95}
                      onSave={saveToPipeline}
                      saved={saved}
                    />
                  </div>

                  <InvestmentMemoCard
                    result={result}
                    rate={parseFloat(rate) || 6.95}
                    downPct={parseFloat(downPct) || 20}
                  />

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button onClick={saveToPipeline} disabled={saved} className={saved ? "btn-secondary opacity-60 cursor-default" : "btn-emerald"}>
                      <Save className="w-4 h-4" />
                      {saved ? "Saved to Pipeline" : "Save to Pipeline"}
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
                    <button onClick={() => { setResult(null); setAddress(""); setSaved(false); setDataSources([]); }} className="btn-ghost">
                      <ArrowLeftRight className="w-4 h-4" />
                      Compare with Another
                    </button>
                  </div>

                  {/* Upgrade to full institutional-grade view */}
                  <button
                    onClick={() => setAppMode("advanced")}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-gold/20 bg-gold-muted/10 text-gold-light hover:bg-gold-muted/20 transition-colors text-[13px] font-medium"
                    aria-label="Switch to advanced mode to see the full institutional-grade analysis"
                  >
                    Show all details
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════
               ADVANCED MODE — Full institutional-grade analysis (unchanged)
            ═══════════════════════════════════════════════════════════════ */
            <div className="space-y-4">

              {/* ── Instant Verdict — shown FIRST, always above the fold ── */}
              <InstantVerdict
                result={result}
                downPct={parseFloat(downPct) || 20}
                rate={parseFloat(rate) || 6.95}
                onSave={saveToPipeline}
                saved={saved}
              />

              {/* ── Data Sources Badge ── */}
              {dataSources.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <span className="text-[10px] text-content-disabled uppercase tracking-wider font-medium flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Data Sources
                  </span>
                  {dataSources.map((ds) => (
                    <span
                      key={ds.name}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        ds.status === "live"
                          ? "bg-emerald-muted text-emerald-light border border-emerald/20"
                          : ds.status === "fallback"
                          ? "bg-amber-muted text-amber-light border border-amber/20"
                          : "bg-surface-elevated text-content-disabled border border-surface-border"
                      }`}
                      title={ds.source ?? ds.name}
                    >
                      {ds.status === "live" && <Wifi className="w-2.5 h-2.5 inline mr-1" />}
                      {ds.name}
                    </span>
                  ))}
                  <span className="text-[10px] text-content-disabled ml-auto font-mono">
                    {realDataPct}% real data
                  </span>
                </div>
              )}

              {/* ── Full Analysis detail — anchored for scroll-to ── */}
              <div id="full-analysis" className="space-y-4 scroll-mt-4">

                {/* Metrics grid */}
                <MetricsGrid r={result} />

                {/* Cash flow bridge — visual breakdown from rent to net cash flow */}
                <CashFlowWaterfall r={result} />

                {/* Comparable sales — implied value, comps table, $/sqft chart */}
                <CompsSection r={result} />

                {/* Calculation chain — show the math */}
                <CalculationChain r={result} />

                {/* Institutional + Risk Gauge side by side on large */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <InstitutionalCard inst={result.institutional} />
                  </div>
                  <RiskGauge r={result} />
                </div>

                {/* Stress test — grouped bar chart + scenario detail table */}
                <StressTestCard stress={result.stress} />

                {/* Multi-dimensional deal analysis — radar / bar / gauge with toggleable dimensions */}
                <DealDimensionsChart r={result} />

                {/* Exit cap sensitivity — color-coded heatmap grid, middle row = current deal baseline */}
                <ExitCapTable sens={result.institutional.exitCapRateSensitivity} />

                {/* Verdict */}
                <VerdictCard r={result} />

                {/* AI Investment Thesis */}
                <AiInsightCard title="AI Investment Thesis">
                  {result.score >= 75
                    ? `Strong fundamentals at ${result.address}. Cap rate of ${result.capRate.toFixed(1)}% with positive cash flow of $${result.monthlyCashFlow}/mo and DSCR at ${result.dscr.toFixed(2)}x. The numbers support a buy — stress test your assumptions in the simulator before committing.`
                    : result.score >= 55
                    ? `Mixed signals at ${result.address}. Cap rate of ${result.capRate.toFixed(1)}% is acceptable but cash flow at $${result.monthlyCashFlow}/mo leaves thin margins. DSCR of ${result.dscr.toFixed(2)}x is near the institutional minimum. Consider negotiating price down 5-8% or find a DSCR lender with better terms.`
                    : `Proceed with caution at ${result.address}. The numbers don't support current asking price — cap rate of ${result.capRate.toFixed(1)}% and cash flow of $${result.monthlyCashFlow}/mo indicate negative leverage risk. Look at comparable properties in the area or wait for a price reduction.`
                  }
                </AiInsightCard>

                {/* Investment Memo — expandable section */}
                <InvestmentMemoCard
                  result={result}
                  rate={parseFloat(rate) || 6.95}
                  downPct={parseFloat(downPct) || 20}
                />

                {/* Secondary action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button onClick={saveToPipeline} disabled={saved} className={saved ? "btn-secondary opacity-60 cursor-default" : "btn-emerald"}>
                    <Save className="w-4 h-4" />
                    {saved ? "Saved to Pipeline" : "Save to Pipeline"}
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
                  <button onClick={() => { setResult(null); setAddress(""); setSaved(false); setDataSources([]); }} className="btn-ghost">
                    <ArrowLeftRight className="w-4 h-4" />
                    Compare with Another
                  </button>
                </div>

                {/* Data provenance notice */}
                {liveCount > 0 ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-muted/30 border border-emerald/10">
                    <Wifi className="w-4 h-4 text-emerald-light mt-0.5 shrink-0" />
                    <p className="text-[11px] text-emerald-light leading-relaxed">
                      {liveCount} of {dataSources.length} data sources returned live data.
                      {liveCount < dataSources.length && " Remaining sources used calculated estimates. Add API keys to .env.local for full coverage."}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-muted/40 border border-amber/10">
                    <AlertTriangle className="w-4 h-4 text-amber-light mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-light leading-relaxed">
                      No API keys configured. Analysis uses calculated estimates from the address. Add FRED_API_KEY, ATTOM_API_KEY, RENTCAST_API_KEY to .env.local for real data.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-surface-elevated rounded-lg h-screen" />}>
      <AnalyzePageContent />
    </Suspense>
  );
}
