"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Save, FileText, ArrowLeftRight, AlertTriangle, SlidersHorizontal, Wifi, Database } from "lucide-react";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useSimulatorStore } from "@/lib/stores/simulator-store";
import {
  AnalysisSkeleton, MetricsGrid, CalculationChain, InstitutionalCard, StressTestCard,
  ExitCapTable, VerdictCard,
  type AnalysisResult,
} from "./_components";
import { InstantVerdict } from "./InstantVerdict";

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

export default function AnalyzePage() {
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

  const router = useRouter();
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const loadDeal = useSimulatorStore((s) => s.loadDeal);

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

            {/* Secondary action buttons */}
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
  );
}
