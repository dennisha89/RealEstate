"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Workflow, CheckCircle, XCircle, ChevronRight, ChevronLeft, MapPin, Activity,
  Search, Clock, Shield, PieChart, Gavel, Bookmark, BookOpen, ArrowUpRight, AlertTriangle, Info,
} from "lucide-react";
import {
  ALL_MARKETS, buildSignals, getTimingVerdict, getRiskLevel, getFinalVerdict,
  confluenceScore, supplyVerdict, demandVerdict,
  type MarketDef, type SignalData, type TimingData, type RiskData, type VerdictData,
} from "@/lib/mock/workflow-data";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";

function getProperties(m: MarketDef) {
  const r = (s: number) => Math.round(s / 1000) * 1000;
  const b = m.medianPrice;
  return [
    { id: `${m.zip}-1`, address: `1423 ${m.name} Ridge Dr`, price: r(b * 0.85), capRate: +(m.capRate + 0.8).toFixed(1), cashFlow: 380, score: m.hyperScore + 5 },
    { id: `${m.zip}-2`, address: `782 ${m.name} Valley Ln`, price: r(b * 0.92), capRate: +(m.capRate + 0.3).toFixed(1), cashFlow: 290, score: m.hyperScore + 2 },
    { id: `${m.zip}-3`, address: `3901 ${m.name} Creek Ct`, price: r(b * 1.05), capRate: +(m.capRate - 0.4).toFixed(1), cashFlow: 150, score: m.hyperScore - 3 },
    { id: `${m.zip}-4`, address: `550 ${m.name} Park Ave`, price: r(b * 0.78), capRate: +(m.capRate + 1.2).toFixed(1), cashFlow: 420, score: m.hyperScore + 8 },
    { id: `${m.zip}-5`, address: `9210 ${m.name} Elm Blvd`, price: r(b * 1.12), capRate: +(m.capRate - 0.9).toFixed(1), cashFlow: -50, score: m.hyperScore - 6 },
  ];
}

const ICONS = [MapPin, Activity, Search, Clock, Shield, PieChart, Gavel];
const LABELS = ["Market Scan", "Signal Check", "Deal Screening", "Timing", "Risk", "Portfolio Fit", "Verdict"];
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const sb = (s: number) => s >= 75 ? "badge-emerald" : s >= 55 ? "badge-amber" : "badge-rose";
const gate = (pass: boolean) => pass
  ? <span className="flex items-center gap-1 text-xs text-emerald-light font-medium"><CheckCircle className="w-3.5 h-3.5" /> Gate Passed</span>
  : <span className="flex items-center gap-1 text-xs text-rose-light font-medium"><XCircle className="w-3.5 h-3.5" /> Gate Failed</span>;

export default function PathwayPage() {
  const [step, setStep] = useState(0);
  const [mktIdx, setMktIdx] = useState<number | null>(null);
  const [propIdx, setPropIdx] = useState<number | null>(null);
  const addDeal = useDealPipelineStore((s) => s.addDeal);

  const market = mktIdx !== null ? ALL_MARKETS[mktIdx] : null;
  const hs = market?.hyperScore ?? 0;
  const signals = market ? buildSignals(hs) : buildSignals(50);
  const timing = getTimingVerdict(hs);
  const risk = getRiskLevel(hs);
  const props = market ? getProperties(market) : [];
  const prop = propIdx !== null ? props[propIdx] ?? null : null;
  const verdict = prop ? getFinalVerdict(hs, prop.score) : getFinalVerdict(50, 50);

  const gates = [market !== null && hs > 55, market !== null && signals.bullish > 50,
    prop !== null && prop.cashFlow > 0 && prop.capRate > 4, timing.verdict !== "WAIT",
    risk.reds.length === 0, prop !== null && prop.cashFlow > 0, true];
  const canGo = (s: number) => { for (let i = 0; i <= s; i++) if (!gates[i]) return false; return true; };
  const handleSave = () => { if (market && prop) addDeal({ status: "analyzing", address: prop.address, market: market.name, state: market.state, zip: market.zip, price: prop.price, propertyType: "sfr" }); };

  function Step0() {
    return (<div className="space-y-3">
      <p className="text-[13px] text-content-secondary">Select a target market to begin your investment pathway.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ALL_MARKETS.map((m, i) => (
          <button key={m.zip} onClick={() => setMktIdx(i)}
            className={`p-3 rounded-lg text-left border transition-all ${mktIdx === i ? "bg-gold-muted border-gold/40 ring-1 ring-gold/20" : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-content-primary">{m.name}, {m.state}</span>
              <span className={sb(m.hyperScore)}>{m.hyperScore}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-content-tertiary">
              <span className="font-mono">Cap {m.capRate}%</span>
              <span>{supplyVerdict(m.inventory)} supply</span>
              <span>{demandVerdict(m.popGrowth, m.jobGrowth)} demand</span>
            </div>
          </button>))}
      </div>
      {market && gate(gates[0])}
      {market && !gates[0] && <p className="text-[11px] text-content-tertiary">Market score must be above 55 to proceed.</p>}
    </div>);
  }

  function Step1() {
    if (!market) return <p className="text-[13px] text-content-tertiary">Select a market first.</p>;
    return (<div className="space-y-4">
      <p className="text-[13px] text-content-secondary">Signal alignment for <span className="font-semibold text-content-primary">{market.name}, {market.state}</span>.</p>
      <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden">
        <div className="h-full bg-emerald rounded-l-full" style={{ width: `${signals.bullish}%` }} />
        <div className="h-full bg-amber" style={{ width: `${signals.neutral}%` }} />
        <div className="h-full bg-rose rounded-r-full" style={{ width: `${signals.bearish}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-emerald-light font-mono">{signals.bullish}% Bullish</span>
        <span className="text-amber-light font-mono">{signals.neutral}% Neutral</span>
        <span className="text-rose-light font-mono">{signals.bearish}% Bearish</span>
      </div>
      <div className="space-y-1.5">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium">Correlation Pairs</div>
        {signals.pairs.map((p) => (
          <div key={p.pair} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02]">
            <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${p.aligned ? "bg-emerald" : "bg-rose"}`} />
            <div><span className="text-[12px] font-medium text-content-primary">{p.pair}</span><p className="text-[11px] text-content-tertiary mt-0.5">{p.note}</p></div>
          </div>))}
      </div>
      {gate(gates[1])}
      {!gates[1] && <p className="text-[11px] text-content-tertiary">Concordance must exceed 50% to proceed.</p>}
    </div>);
  }

  function Step2() {
    if (!market) return <p className="text-[13px] text-content-tertiary">Select a market first.</p>;
    return (<div className="space-y-3">
      <p className="text-[13px] text-content-secondary">Properties in <span className="font-semibold text-content-primary">{market.name}</span>. Select one for deep analysis.</p>
      <div className="space-y-2">
        {props.map((p, i) => (
          <button key={p.id} onClick={() => setPropIdx(i)}
            className={`w-full p-3 rounded-lg text-left border transition-all ${propIdx === i ? "bg-gold-muted border-gold/40 ring-1 ring-gold/20" : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-content-primary">{p.address}</span>
              <span className={sb(p.score)}>{p.score}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-content-tertiary">
              <span className="font-mono">{fmt(p.price)}</span><span className="font-mono">Cap {p.capRate}%</span>
              <span className={`font-mono font-semibold ${p.cashFlow > 0 ? "text-emerald-light" : "text-rose-light"}`}>{p.cashFlow >= 0 ? "+" : ""}{fmt(p.cashFlow)}/mo</span>
              {(p.cashFlow <= 0 || p.capRate <= 4) && <AlertTriangle className="w-3 h-3 text-amber-light" />}
            </div>
          </button>))}
      </div>
      {prop && gate(gates[2])}
      {prop && !gates[2] && <p className="text-[11px] text-content-tertiary">Property must have positive cash flow and cap rate above 4%.</p>}
    </div>);
  }

  function Step3() {
    const vc = timing.verdict === "BUY_NOW" || timing.verdict === "FAVORABLE" ? "text-emerald-light" : timing.verdict === "NEUTRAL" ? "text-amber-light" : "text-rose-light";
    return (<div className="space-y-4">
      <p className="text-[13px] text-content-secondary">Current market timing assessment.</p>
      <div className="card-glass !p-4 text-center">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium">Timing Verdict</div>
        <div className={`font-mono text-2xl font-bold ${vc}`}>{timing.verdict.replace("_", " ")}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([["Mortgage Rate", timing.mortgageRate], ["Fed Funds", timing.fedFunds], ["Rate Direction", timing.rateDir], ["Seasonal", timing.seasonal]] as const).map(([l, v]) => (
          <div key={l} className="p-2.5 rounded-lg bg-white/[0.02]">
            <div className="text-[10px] text-content-disabled uppercase tracking-wider">{l}</div>
            <div className="text-[13px] text-content-primary font-medium mt-0.5 font-mono">{v}</div>
          </div>))}
      </div>
      {gate(gates[3])}{!gates[3] && <p className="text-[11px] text-content-tertiary">Timing verdict must not be WAIT to proceed.</p>}
    </div>);
  }

  function Step4() {
    const lc = risk.level === "minimal" || risk.level === "low" ? "text-emerald-light" : risk.level === "moderate" ? "text-amber-light" : "text-rose-light";
    return (<div className="space-y-4">
      <p className="text-[13px] text-content-secondary">Risk assessment for your selected deal.</p>
      <div className="flex items-center gap-3"><span className="text-[10px] text-content-disabled uppercase tracking-wider font-medium">Risk Level</span><span className={`font-mono text-lg font-bold capitalize ${lc}`}>{risk.level}</span></div>
      {risk.reds.length > 0 && <div className="space-y-1.5">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-1.5"><XCircle className="w-3 h-3 text-rose-light" /> Red Flags</div>
        {risk.reds.map((r) => <div key={r} className="text-[12px] text-rose-light p-2 rounded-lg bg-rose-muted">{r}</div>)}
      </div>}
      {risk.yellows.length > 0 && <div className="space-y-1.5">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-light" /> Caution</div>
        {risk.yellows.map((y) => <div key={y} className="text-[12px] text-amber-light p-2 rounded-lg bg-amber-muted">{y}</div>)}
      </div>}
      <div className="space-y-1.5">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-light" /> Mitigations</div>
        {risk.mitigations.map((m) => <div key={m} className="text-[12px] text-content-secondary p-2 rounded-lg bg-white/[0.02]">{m}</div>)}
      </div>
      {gate(gates[4])}{!gates[4] && <p className="text-[11px] text-content-tertiary">No red flags allowed to proceed.</p>}
    </div>);
  }

  function Step5() {
    const cf = prop?.cashFlow ?? 0; const total = 1140 + cf;
    const div = market ? (market.name === "Austin" ? "Same market - lower diversification" : "New market - improves diversification") : "--";
    const goal = Math.round(((1060000 + (prop?.price ?? 0)) / 2000000) * 100);
    return (<div className="space-y-4">
      <p className="text-[13px] text-content-secondary">How this deal fits your existing portfolio.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-white/[0.02] text-center">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Cash Flow Impact</div>
          <div className={`font-mono text-lg font-bold mt-1 ${cf > 0 ? "text-emerald-light" : "text-rose-light"}`}>{cf >= 0 ? "+" : ""}{fmt(cf)}/mo</div>
          <div className="text-[11px] text-content-tertiary mt-0.5">New total: {fmt(total)}/mo</div>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] text-center">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Diversification</div>
          <div className="text-[13px] text-content-primary font-medium mt-1">{div}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] text-center">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider">Goal Progress</div>
          <div className="font-mono text-lg font-bold text-gold-light mt-1">{goal}%</div>
          <div className="text-[11px] text-content-tertiary mt-0.5">of $2M target</div>
        </div>
      </div>
      {gate(gates[5])}{!gates[5] && <p className="text-[11px] text-content-tertiary">Deal must have positive portfolio impact to proceed.</p>}
    </div>);
  }

  function Step6() {
    const vc = verdict.verdict === "STRONG_BUY" || verdict.verdict === "BUY" ? "text-emerald-light" : verdict.verdict === "LEAN_BUY" || verdict.verdict === "NEUTRAL" ? "text-amber-light" : "text-rose-light";
    return (<div className="space-y-4">
      <div className="card-glass !p-5 text-center">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-1 font-medium">Final Verdict</div>
        <div className={`font-mono text-3xl font-bold ${vc}`}>{verdict.verdict.replace(/_/g, " ")}</div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-content-tertiary flex-wrap">
          <span>Confidence: <span className="font-mono font-semibold text-content-primary">{verdict.confidence}%</span></span>
          <span>Probability: <span className="font-mono font-semibold text-content-primary">{verdict.probability}%</span></span>
          <span>Consensus: <span className={`font-mono font-semibold ${verdict.agreement >= 6 ? "text-emerald-light" : verdict.agreement >= 4 ? "text-amber-light" : "text-rose-light"}`}>{verdict.agreementLabel}</span></span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium">Engine Consensus</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {verdict.engines.map((e) => (
            <div key={e.name} className="p-2 rounded-lg bg-white/[0.02] text-center">
              <div className="text-[11px] text-content-tertiary truncate">{e.name}</div>
              <div className={`font-mono text-xs font-semibold mt-0.5 capitalize ${e.vote === "bullish" ? "text-emerald-light" : e.vote === "bearish" ? "text-rose-light" : "text-amber-light"}`}>{e.vote} ({e.score})</div>
            </div>))}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-gold-muted/50 space-y-2">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-1.5"><Info className="w-3 h-3 text-gold-light" /> Next Steps</div>
        <ul className="space-y-1 text-[12px] text-content-secondary">
          {["Schedule property inspection within 5 days", "Lock mortgage rate with preferred lender", "Run comps analysis for offer price validation", "Connect with local property manager"].map((t) => (
            <li key={t} className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-gold-light" />{t}</li>))}
        </ul>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleSave} className="btn-emerald btn-sm"><Bookmark className="w-3 h-3" /> Save to Pipeline</button>
        <button className="btn-primary btn-sm"><BookOpen className="w-3 h-3" /> Record Decision</button>
        <Link href="/dashboard/analyze" className="btn-secondary btn-sm"><ArrowUpRight className="w-3 h-3" /> Full Analysis</Link>
      </div>
    </div>);
  }

  const STEPS = [Step0, Step1, Step2, Step3, Step4, Step5, Step6];
  const Cur = STEPS[step];
  const Icon = ICONS[step];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="section-label flex items-center gap-2"><Workflow className="w-3.5 h-3.5" /> Guided Workflow</div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Investment Pathway</h1>
        <p className="text-[13px] text-content-tertiary mt-1">7-step guided process with pass/fail gates at each stage.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex lg:flex-col gap-1 lg:gap-0 overflow-x-auto lg:overflow-visible lg:w-48 shrink-0">
          {LABELS.map((label, i) => {
            const a = step === i, c = i < step && gates[i], f = i < step && !gates[i];
            return (
              <button key={i} onClick={() => i <= step && setStep(i)} disabled={i > step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left shrink-0 transition-all ${a ? "bg-gold-muted border border-gold/30 text-gold-light" : c ? "text-emerald-light hover:bg-white/[0.03]" : f ? "text-rose-light hover:bg-white/[0.03]" : i <= step ? "text-content-secondary hover:bg-white/[0.03]" : "text-content-disabled cursor-not-allowed"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${a ? "bg-goldtext-white" : c ? "bg-emerald text-white" : f ? "bg-rose text-white" : "bg-surface-muted text-content-disabled"}`}>
                  {c ? <CheckCircle className="w-3.5 h-3.5" /> : f ? <XCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-[12px] font-medium whitespace-nowrap hidden lg:inline">{label}</span>
              </button>);
          })}
        </div>

        <div className="flex-1 card">
          <div className="flex items-center gap-2 mb-4">
            <Icon className="w-4 h-4 text-gold-light" />
            <h2 className="text-sm font-semibold text-content-primary">Step {step + 1}: {LABELS[step]}</h2>
          </div>
          <Cur />
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-border">
            <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0} className="btn-ghost btn-sm disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /> Back</button>
            {step < 6 ? <button onClick={() => canGo(step) && setStep(step + 1)} disabled={!canGo(step)} className="btn-primary btn-sm disabled:opacity-30">Next <ChevronRight className="w-3.5 h-3.5" /></button>
              : <span className="text-xs text-content-tertiary font-mono">Workflow complete</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
