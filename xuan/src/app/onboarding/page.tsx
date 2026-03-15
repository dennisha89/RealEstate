"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, User, Target, Search, Building2, Check, Plus, Trash2, Sparkles } from "lucide-react";
import { useUserProfileStore, type InvestorType, type Strategy, type Timeline, type PropertyType } from "@/lib/stores/user-profile-store";

const STEPS = 4;
const INVESTOR_TYPES: { v: InvestorType; l: string; d: string }[] = [
  { v: "first_time", l: "First-time investor", d: "Looking for my first property" },
  { v: "growing", l: "Growing portfolio", d: "2-5 properties" },
  { v: "experienced", l: "Experienced", d: "5+ properties" },
  { v: "professional", l: "Professional / Fund", d: "Institutional or syndication" },
];
const STRATEGIES: { v: Strategy; l: string }[] = [
  { v: "cash_flow", l: "Cash flow" }, { v: "appreciation", l: "Appreciation" },
  { v: "both", l: "Both" }, { v: "brrrr", l: "BRRRR" }, { v: "unsure", l: "Not sure yet" },
];
const TIMELINES: { v: Timeline; l: string }[] = [
  { v: "1yr", l: "1 year" }, { v: "3yr", l: "3 years" }, { v: "5yr", l: "5+ years" },
];
const PROP_TYPES: { v: PropertyType; l: string }[] = [
  { v: "sfr", l: "SFR" }, { v: "duplex", l: "Duplex" }, { v: "triplex", l: "Triplex" }, { v: "fourplex", l: "Fourplex" },
];
const MARKETS = ["Austin, TX", "Raleigh, NC", "Tampa, FL", "Phoenix, AZ", "Nashville, TN", "Charlotte, NC", "San Antonio, TX", "Columbus, OH"];
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const BASE_PILL = "px-4 py-2 rounded-lg text-sm border transition-all";
const PILL_OFF = "border-surface-border bg-surface-card text-content-secondary hover:border-surface-muted";
const PILL_ACCENT = "border-accent/40 bg-accent-muted text-accent-light font-medium";
const PILL_EMERALD = "border-emerald/40 bg-emerald-muted text-emerald-light font-medium";
const optCard = "w-full text-left px-4 py-3 rounded-lg border border-surface-border bg-surface-card hover:border-surface-muted hover:bg-surface-elevated transition-all";
const SLIDER_EMERALD = "w-full accent-emerald h-1.5 bg-surface-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-light [&::-webkit-slider-thumb]:shadow-glow-emerald [&::-webkit-slider-thumb]:cursor-pointer";
const SLIDER_ACCENT = "w-full accent-accent h-1.5 bg-surface-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-light [&::-webkit-slider-thumb]:shadow-glow [&::-webkit-slider-thumb]:cursor-pointer";

export default function OnboardingPage() {
  const router = useRouter();
  const s = useUserProfileStore();
  const [step, setStep] = useState(0);
  const [mkt, setMkt] = useState("");
  const [done, setDone] = useState(false);
  const [imp, setImp] = useState<"add" | "later" | "first" | null>(null);
  const [pf, setPf] = useState({ address: "", purchasePrice: "", currentValue: "", monthlyRent: "" });

  const next = useCallback(() => { if (step < STEPS - 1) setStep((v) => v + 1); }, [step]);
  const back = useCallback(() => { if (step > 0) setStep((v) => v - 1); }, [step]);
  const canNext = step === 0 ? s.name.trim().length > 0 : true;

  function finish() { s.completeOnboarding(); setDone(true); setTimeout(() => router.push("/dashboard"), 1500); }
  function addMkt(m: string) { const t = m.trim(); if (t && !s.buyBox.targetMarkets.includes(t)) s.setBuyBox({ targetMarkets: [...s.buyBox.targetMarkets, t] }); setMkt(""); }
  function togglePT(pt: PropertyType) { const ts = s.buyBox.propertyTypes; s.setBuyBox({ propertyTypes: ts.includes(pt) ? ts.filter((t) => t !== pt) : [...ts, pt] }); }
  function addProp() {
    if (!pf.address.trim()) return;
    s.addExistingProperty({ address: pf.address.trim(), purchasePrice: Number(pf.purchasePrice) || 0, currentValue: Number(pf.currentValue) || 0, monthlyRent: Number(pf.monthlyRent) || 0 });
    setPf({ address: "", purchasePrice: "", currentValue: "", monthlyRent: "" });
  }

  if (done) return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center animate-scale-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-muted border border-emerald/20 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-light" /></div>
        <h1 className="text-2xl font-display font-bold text-content-primary mb-2">Your Xuan is ready.</h1>
        <p className="text-sm text-content-secondary">Taking you to your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 75% 25%, rgba(16,185,129,0.04) 0%, transparent 55%)" }} />

      {/* Header + progress */}
      <header className="relative z-10 px-6 pt-8 pb-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-gold-light text-lg font-serif">&#x7384;</span>
          <span className="font-display font-bold text-content-primary tracking-[0.08em] text-sm">XUAN</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-surface-muted">
              <div className="h-full rounded-full bg-gradient-accent transition-all duration-500" style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }} />
            </div>
          ))}
        </div>
        <p className="text-xs text-content-disabled">Step {step + 1} of {STEPS}</p>
      </header>

      {/* Steps */}
      <main className="relative z-10 flex-1 flex items-start justify-center px-6 pb-32">
        <div className="w-full max-w-lg animate-fade-in" key={step}>

          {step === 0 && <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-accent-light mb-3"><User className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-[0.1em]">Investor Profile</span></div>
              <h1 className="text-2xl font-display font-bold text-content-primary tracking-tight mb-2">Welcome to Xuan. Let&apos;s set up your investment profile.</h1>
              <p className="text-sm text-content-secondary">This takes about 60 seconds and helps us tailor everything to you.</p>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-content-secondary mb-1.5">Your name</label>
              <input id="name" type="text" value={s.name} onChange={(e) => s.setName(e.target.value)} placeholder="First name" className="input" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Where are you in your journey?</label>
              <div className="space-y-2">
                {INVESTOR_TYPES.map((t) => (
                  <button key={t.v} onClick={() => s.setInvestorType(t.v)} className={`${optCard} ${s.investorType === t.v ? "!border-accent/40 !bg-accent-muted" : ""}`}>
                    <div className={`text-sm font-medium ${s.investorType === t.v ? "text-accent-light" : "text-content-primary"}`}>{t.l}</div>
                    <div className="text-xs text-content-tertiary mt-0.5">{t.d}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>}

          {step === 1 && <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-light mb-3"><Target className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-[0.1em]">Investment Goals</span></div>
              <h1 className="text-2xl font-display font-bold text-content-primary tracking-tight mb-2">What are you building toward?</h1>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Monthly passive income target</label>
              <div className="flex items-center justify-between text-xs text-content-disabled mb-1.5">
                <span>$1K</span><span className="text-lg font-mono font-bold text-emerald-light">{fmt(s.goalMonthlyIncome)}</span><span>$25K</span>
              </div>
              <input type="range" min={1000} max={25000} step={500} value={s.goalMonthlyIncome} onChange={(e) => s.setGoalMonthlyIncome(Number(e.target.value))} className={SLIDER_EMERALD} />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Primary strategy</label>
              <div className="flex flex-wrap gap-2">{STRATEGIES.map((x) => <button key={x.v} onClick={() => s.setStrategy(x.v)} className={`${BASE_PILL} ${s.strategy === x.v ? PILL_EMERALD : PILL_OFF}`}>{x.l}</button>)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Timeline</label>
              <div className="grid grid-cols-3 gap-2">{TIMELINES.map((x) => <button key={x.v} onClick={() => s.setTimeline(x.v)} className={`${BASE_PILL} ${s.timeline === x.v ? PILL_EMERALD : PILL_OFF} text-center py-2.5`}>{x.l}</button>)}</div>
            </div>
          </div>}

          {step === 2 && <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-accent-light mb-3"><Search className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-[0.1em]">Buy Box</span></div>
              <h1 className="text-2xl font-display font-bold text-content-primary tracking-tight mb-2">What are you looking for?</h1>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Price range</label>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-content-disabled mb-1 block">Minimum</span><input type="number" value={s.buyBox.priceMin} onChange={(e) => s.setBuyBox({ priceMin: Number(e.target.value) })} className="input font-mono text-sm" step={10000} min={0} /></div>
                <div><span className="text-xs text-content-disabled mb-1 block">Maximum</span><input type="number" value={s.buyBox.priceMax} onChange={(e) => s.setBuyBox({ priceMax: Number(e.target.value) })} className="input font-mono text-sm" step={10000} min={0} /></div>
              </div>
              <p className="text-xs text-content-disabled mt-1.5">{fmt(s.buyBox.priceMin)} &ndash; {fmt(s.buyBox.priceMax)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Property types</label>
              <div className="flex flex-wrap gap-2">
                {PROP_TYPES.map((pt) => {
                  const on = s.buyBox.propertyTypes.includes(pt.v);
                  return <button key={pt.v} onClick={() => togglePT(pt.v)} className={`flex items-center gap-1.5 ${BASE_PILL} ${on ? PILL_ACCENT : PILL_OFF}`}>{on && <Check className="w-3 h-3" />}{pt.l}</button>;
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Target markets</label>
              <div className="flex gap-2">
                <input type="text" value={mkt} onChange={(e) => setMkt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMkt(mkt); } }} placeholder="City, State" className="input flex-1" />
                <button onClick={() => addMkt(mkt)} className="btn-secondary btn-sm shrink-0"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {s.buyBox.targetMarkets.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
                {s.buyBox.targetMarkets.map((m) => <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-muted text-accent-light text-xs font-medium">{m}<button onClick={() => s.setBuyBox({ targetMarkets: s.buyBox.targetMarkets.filter((x) => x !== m) })} className="hover:text-white transition-colors"><Trash2 className="w-3 h-3" /></button></span>)}
              </div>}
              {s.buyBox.targetMarkets.length === 0 && <div className="mt-2">
                <p className="text-xs text-content-disabled mb-1.5">Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">{MARKETS.map((m) => <button key={m} onClick={() => addMkt(m)} className="px-2 py-1 rounded text-[11px] border border-surface-border bg-surface-card text-content-tertiary hover:text-content-secondary hover:border-surface-muted transition-colors">{m}</button>)}</div>
              </div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">Minimum cap rate</label>
              <div className="flex items-center justify-between text-xs text-content-disabled mb-1.5">
                <span>4%</span><span className="text-lg font-mono font-bold text-accent-light">{s.buyBox.minCapRate}%</span><span>10%</span>
              </div>
              <input type="range" min={4} max={10} step={0.5} value={s.buyBox.minCapRate} onChange={(e) => s.setBuyBox({ minCapRate: Number(e.target.value) })} className={SLIDER_ACCENT} />
            </div>
          </div>}

          {step === 3 && <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-gold-light mb-3"><Building2 className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-[0.1em]">Portfolio</span></div>
              <h1 className="text-2xl font-display font-bold text-content-primary tracking-tight mb-2">Do you have existing properties?</h1>
            </div>
            {imp === null && <div className="space-y-2">
              {([["add", "Yes, I'll add them now", "Add your current properties so Xuan can track your portfolio"], ["later", "I'll add them later", "You can always add properties from your dashboard"], ["first", "I'm looking for my first property", "We'll help you find the right one"]] as const).map(([k, t, d]) => (
                <button key={k} onClick={() => setImp(k)} className={optCard}><div className="text-sm font-medium text-content-primary">{t}</div><div className="text-xs text-content-tertiary mt-0.5">{d}</div></button>
              ))}
            </div>}
            {imp === "add" && <div className="space-y-4">
              {s.existingProperties.length > 0 && <div className="space-y-2">
                {s.existingProperties.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-card border border-surface-border">
                    <div><div className="text-sm font-medium text-content-primary">{p.address}</div><div className="text-xs text-content-tertiary mt-0.5">{fmt(p.currentValue)} value &middot; {fmt(p.monthlyRent)}/mo</div></div>
                    <button onClick={() => s.setExistingProperties(s.existingProperties.filter((_, j) => j !== i))} className="text-content-disabled hover:text-rose-light transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>}
              <div className="p-4 rounded-lg border border-dashed border-surface-border bg-surface-secondary/50 space-y-3">
                <input type="text" value={pf.address} onChange={(e) => setPf({ ...pf, address: e.target.value })} placeholder="Property address" className="input" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={pf.purchasePrice} onChange={(e) => setPf({ ...pf, purchasePrice: e.target.value })} placeholder="Purchase $" className="input font-mono text-xs" />
                  <input type="number" value={pf.currentValue} onChange={(e) => setPf({ ...pf, currentValue: e.target.value })} placeholder="Current $" className="input font-mono text-xs" />
                  <input type="number" value={pf.monthlyRent} onChange={(e) => setPf({ ...pf, monthlyRent: e.target.value })} placeholder="Rent/mo" className="input font-mono text-xs" />
                </div>
                <button onClick={addProp} disabled={!pf.address.trim()} className="btn-secondary btn-sm w-full"><Plus className="w-3.5 h-3.5" /> Add Property</button>
              </div>
              <button onClick={() => setImp(null)} className="text-xs text-content-disabled hover:text-content-secondary transition-colors">&larr; Back to options</button>
            </div>}
            {imp === "later" && <div className="p-5 rounded-lg bg-surface-card border border-surface-border text-center"><p className="text-sm text-content-secondary">No problem. You can add properties anytime from your portfolio page.</p></div>}
            {imp === "first" && <div className="p-5 rounded-lg bg-emerald-muted/30 border border-emerald/10 text-center">
              <Sparkles className="w-5 h-5 text-emerald-light mx-auto mb-2" />
              <p className="text-sm text-content-primary font-medium mb-1">Great place to start.</p>
              <p className="text-xs text-content-secondary">Xuan will walk you through every step &mdash; from finding markets to analyzing your first deal with confidence.</p>
            </div>}
          </div>}

        </div>
      </main>

      {/* Footer nav */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-surface-border glass-subtle px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={back} disabled={step === 0} className={`btn-ghost text-sm ${step === 0 ? "opacity-0 pointer-events-none" : ""}`}><ArrowLeft className="w-4 h-4" /> Back</button>
          {step < STEPS - 1
            ? <button onClick={next} disabled={!canNext} className="btn-primary">Continue <ArrowRight className="w-4 h-4" /></button>
            : <button onClick={finish} className="btn-emerald">Launch Xuan <ArrowRight className="w-4 h-4" /></button>}
        </div>
      </footer>
    </div>
  );
}
