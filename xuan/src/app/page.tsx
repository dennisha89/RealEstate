"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Shield, TrendingUp, Target, Clock, Eye, DollarSign,
  AlertTriangle, Lock, Check, X as XIcon, ChevronDown,
  ChevronUp, MapPin, Zap, Users, Star, Flame, Gauge, Layers,
  BarChart3, Activity,
} from "lucide-react";

/* ─── Scroll Reveal Hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("revealed"); obs.unobserve(el); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>;
}
/* ─── Animated Counter ─── */
function AnimatedCounter({ end, prefix = "", suffix = "", duration = 2000 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const s = Date.now();
        const tick = () => { const p = Math.min((Date.now() - s) / duration, 1); setCount(Math.round((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(tick); };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}
/* ─── FAQ ─── */
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gold/[0.08]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm font-medium text-white group-hover:text-gold-light transition-colors pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gold/60 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-content-tertiary flex-shrink-0" />}
      </button>
      {open && <p className="text-sm text-content-secondary leading-relaxed pb-5 pr-8">{a}</p>}
    </div>
  );
}
/* ─── Floating Card ─── */
function FloatingCard({ label, value, color, anim, className }: { label: string; value: string; color: "emerald" | "gold"; anim: string; className: string }) {
  const bg = color === "emerald" ? "bg-emerald-muted border-emerald/20" : "bg-gold-muted border-gold/20";
  const text = color === "emerald" ? "text-emerald-light" : "text-gold-light";
  return (
    <div className={`absolute ${className} ${anim} hidden lg:block pointer-events-none z-10`}>
      <div className={`rounded-xl border ${bg} px-4 py-3 backdrop-blur-sm shadow-elevated`}>
        <div className="text-[9px] text-content-disabled uppercase tracking-wider">{label}</div>
        <div className={`text-lg font-mono font-bold ${text}`}>{value}</div>
      </div>
    </div>
  );
}

/* ─── Data Arrays ─── */
const comparisonRows = [
  { f: "Will this deal actually make money?", lv: true, z: false, d: "Partially", s: false },
  { f: "Is NOW the right time to buy?", lv: true, z: false, d: false, s: false },
  { f: "What happens in a recession?", lv: true, z: false, d: false, s: "Manual" },
  { f: "How do rates affect MY deal?", lv: true, z: false, d: false, s: false },
  { f: "What would Blackstone see?", lv: true, z: false, d: "Basic", s: "Manual" },
  { f: "When should I sell or refi?", lv: true, z: false, d: false, s: false },
  { f: "What are other investors seeing?", lv: true, z: false, d: false, s: false },
  { f: "How does this change my portfolio?", lv: true, z: false, d: false, s: false },
];

const testimonials = [
  { name: "David K.", role: "12-unit portfolio, Austin TX", text: "Found a property listed at $285K that comped at $312K. LootVue showed me what my agent couldn't — the demographic momentum, the supply constraint, and why the cap rate was about to compress. Closed in 9 days.", metric: "$27K", metricLabel: "instant equity found", stars: 5 },
  { name: "Sarah L.", role: "First-time investor, Raleigh NC", text: "I was paralyzed for 8 months. Every deal felt like a gamble. The guided workflow walked me through every risk, every number, every worst-case scenario. I made my first offer knowing exactly what I was getting into.", metric: "$380", metricLabel: "monthly cash flow", stars: 5 },
  { name: "Marcus T.", role: "PE analyst, 48-unit fund", text: "Debt yield, yield-on-cost, exit cap sensitivity — tools my firm pays $50K/year for elsewhere. I screen deals through LootVue before presenting to our investment committee.", metric: "6 hrs", metricLabel: "saved per deal", stars: 5 },
];

const bentoFeatures = [
  { icon: Eye, title: "True Value Detection", desc: "Triangulate from 8 independent valuation methods. See the gap between list price and real worth before anyone else.", size: "large", mockMetric: { label: "Hidden Equity", value: "+$27,400" } },
  { icon: Gauge, title: "Market Timing", desc: "Know if the market is heating, peaking, or cooling — and exactly where your target ZIP sits in the cycle.", size: "tall", mockMetric: { label: "Cycle Position", value: "72%" } },
  { icon: Shield, title: "Stress Test", desc: "Six worst-case scenarios simultaneously. Know your breaking point before you bid.", size: "small", mockMetric: null },
  { icon: Layers, title: "Portfolio Impact", desc: "See how each new deal changes your overall risk, diversification, and cash flow.", size: "small", mockMetric: null },
];

const faqData = [
  { q: "How is this different from Zillow?", a: "Zillow shows listings for BUYERS. LootVue tells INVESTORS which properties will make money — cash flow, stress tests, risk scoring, timing signals, portfolio impact. Different question, different tool." },
  { q: "Why should I trust this over my own analysis?", a: "You shouldn't trust it blindly. LootVue shows every data source, every calculation, every assumption. We track prediction accuracy over time. If we're wrong, you'll know." },
  { q: "What's the catch with the free tier?", a: "No catch. 3 analyses per month. If it doesn't save you 10x the subscription on your next deal, don't subscribe." },
  { q: "Do I need experience?", a: "No. The system explains every number and tells you what to do about it. First-time investors use the guided workflow. Experienced investors skip straight to analysis." },
];

const previewMetrics = [
  { l: "Price", v: "$285K", c: "text-white" },
  { l: "True Value", v: "$312K", c: "text-emerald-light" },
  { l: "Instant Equity", v: "+$27K", c: "text-gold-bright" },
  { l: "Cap Rate", v: "7.2%", c: "text-white" },
  { l: "Cash Flow", v: "+$470/mo", c: "text-emerald-light" },
  { l: "DSCR", v: "1.35x", c: "text-white" },
];

/* ─── MAIN PAGE ─── */
export default function LandingPage() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [liveCount, setLiveCount] = useState(12);
  const [countPulse, setCountPulse] = useState(false);
  const fullAddress = "1423 Cedar Ridge Dr, Austin TX";

  // Typing animation for product preview
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullAddress.length) { setTypedText(fullAddress.slice(0, i)); i++; }
      else { clearInterval(timer); setTimeout(() => setShowMetrics(true), 400); }
    }, 55);
    return () => clearInterval(timer);
  }, []);

  // Live activity counter
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveCount(prev => {
        const next = prev + Math.floor(Math.random() * 3) + 1;
        setCountPulse(true);
        setTimeout(() => setCountPulse(false), 600);
        return next;
      });
    }, 8000 + Math.random() * 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/80 border-b border-gold/[0.08]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
              <span className="text-black font-bold text-xs">LV</span>
            </div>
            <span className="font-display font-bold text-white tracking-[0.15em] text-sm">LOOTVUE</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-content-secondary hover:text-gold-light transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-content-secondary hover:text-gold-light transition-colors">How It Works</a>
            <Link href="/pricing" className="text-sm text-content-secondary hover:text-gold-light transition-colors">Pricing</Link>
            <Link href="/about" className="text-sm text-content-secondary hover:text-gold-light transition-colors">About</Link>
            <a href="#faq" className="text-sm text-content-secondary hover:text-gold-light transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-content-secondary hover:text-gold-light transition-colors hidden sm:block">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Join Waitlist</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 md:pt-48 pb-24 md:pb-36 px-6 overflow-hidden noise-overlay">
        {/* Gold radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-gold/[0.06] blur-[200px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald/[0.03] blur-[120px] pointer-events-none" />

        {/* Floating real estate data cards — pushed to edges, NOT blocking content */}
        <FloatingCard label="Cap Rate" value="7.2%" color="gold" anim="animate-float" className="top-[35%] left-[3%] xl:left-[5%]" />
        <FloatingCard label="Cash Flow" value="+$470/mo" color="emerald" anim="animate-float-delay" className="top-[30%] right-[3%] xl:right-[5%]" />
        <FloatingCard label="Equity Gain" value="+$27K" color="gold" anim="animate-float-slow" className="bottom-[25%] left-[4%] xl:left-[7%]" />
        <FloatingCard label="DSCR" value="1.35x" color="emerald" anim="animate-float" className="bottom-[30%] right-[4%] xl:right-[7%]" />

        <div className="relative max-w-7xl mx-auto z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in mb-8">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-gold-light bg-gold-muted px-4 py-1.5 rounded-full border border-gold/20">
                <Flame className="w-3 h-3" /> Your broker hopes you never find this
              </span>
            </div>

            <h1 className="animate-fade-in font-display font-extrabold text-[2.75rem] sm:text-[3.5rem] lg:text-[4.5rem] leading-[1.02] tracking-[-0.02em] mb-6">
              Find the <span className="text-gradient-gold">hidden gems</span> everyone else misses.
            </h1>

            <p className="animate-slide-up text-content-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
              Quant-based AI analysis from hand-picked data sources. 12 engines. One verdict. <span className="text-gold-light font-semibold">10 seconds.</span>
            </p>
            <p className="animate-slide-up-delay text-content-tertiary text-base mb-10">
              You&apos;re making half-million dollar decisions with free tools. That ends now.
            </p>

            {/* Waitlist CTA */}
            <div className="max-w-lg mx-auto animate-slide-up-delay-2">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-300 bg-surface-card ${searchFocused ? "border-gold/40 shadow-glow-gold" : "border-white/[0.08] hover:border-gold/20"}`}>
                <input type="email" placeholder="Enter your email for early access" className="flex-1 bg-transparent text-base text-white placeholder:text-content-disabled outline-none" onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
                <button className="btn-primary btn-sm whitespace-nowrap">Join Waitlist <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-content-disabled text-xs mt-3 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Free early access</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2,847 on the list</span>
                <span>·</span>
                <span>Launching Q2 2026</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── GOLD PROPERTY TICKER ─── */}
      <div className="border-y border-gold/[0.12] py-3 bg-black overflow-hidden">
        <div className="flex items-center gap-8 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
          {[...Array(2)].map((_, r) => (
            <div key={r} className="flex items-center gap-8 flex-shrink-0">
              {[
                { addr: "Austin, TX 78701", price: "$425K", change: "+5.2%", up: true },
                { addr: "Raleigh, NC 27601", price: "$380K", change: "+6.1%", up: true },
                { addr: "Nashville, TN 37201", price: "$385K", change: "+4.8%", up: true },
                { addr: "Tampa, FL 33601", price: "$315K", change: "+3.1%", up: true },
                { addr: "Phoenix, AZ 85001", price: "$365K", change: "-1.2%", up: false },
                { addr: "Charlotte, NC 28202", price: "$355K", change: "+4.5%", up: true },
              ].map((m) => (
                <div key={`${r}-${m.addr}`} className="flex items-center gap-3 text-xs">
                  <span className="text-gold/60 font-mono">{m.addr}</span>
                  <span className="text-white font-mono font-bold">{m.price}</span>
                  <span className={`font-mono font-semibold ${m.up ? "text-emerald-light" : "text-rose-light"}`}>{m.change}</span>
                  <span className="text-gold/20">│</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── LIVE ACTIVITY ─── */}
      <div className="border-b border-gold/[0.06] py-3 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-light" />
          </span>
          <p className="text-sm text-content-secondary">
            <span className={`font-mono font-bold text-gold-light transition-transform inline-block ${countPulse ? "scale-110" : "scale-100"}`} style={{ transition: "transform 0.3s ease" }}>
              {liveCount}
            </span>{" "}
            investors analyzed properties in the last hour
          </p>
        </div>
      </div>

      {/* ─── PRODUCT PREVIEW (Typing Animation) ─── */}
      <section className="py-20 md:py-28 px-6">
        <RevealSection>
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-gold/[0.15] bg-surface-card overflow-hidden shadow-elevated" style={{ boxShadow: "0 0 60px -10px rgba(201,162,39,0.15), 0 4px 16px rgba(0,0,0,0.5)" }}>
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-surface-secondary">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose/40" />
                  <div className="w-3 h-3 rounded-full bg-amber/40" />
                  <div className="w-3 h-3 rounded-full bg-emerald/40" />
                </div>
                <div className="flex-1 mx-4 px-3 py-1 rounded-md bg-black/40 border border-white/[0.04]">
                  <span className="text-[11px] text-content-disabled font-mono">
                    lootvue.com/analyze/{" "}
                    <span className="text-gold-light">{typedText}</span>
                    <span className="animate-blink text-gold-light">|</span>
                  </span>
                </div>
              </div>

              {/* Analysis content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{typedText || "..."}</div>
                    <div className="text-xs text-content-tertiary">3bd / 2ba / 1,650 sqft / Built 2008</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg bg-emerald-muted text-emerald-light text-xs font-bold transition-all duration-500 ${showMetrics ? "opacity-100" : "opacity-0"}`}>BUY</span>
                    <span className={`px-3 py-1 rounded-lg bg-gold-muted text-gold-light text-xs font-mono font-bold transition-all duration-500 ${showMetrics ? "opacity-100" : "opacity-0"}`}>87%</span>
                  </div>
                </div>

                {/* Metrics grid — staggered reveal */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                  {previewMetrics.map((m, i) => (
                    <div key={m.l} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] transition-all duration-500" style={{ opacity: showMetrics ? 1 : 0, transform: showMetrics ? "translateY(0)" : "translateY(8px)", transitionDelay: `${i * 120}ms` }}>
                      <div className="text-[9px] text-content-disabled uppercase tracking-wider">{m.l}</div>
                      <div className={`text-sm font-mono font-bold mt-0.5 ${m.c}`}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] transition-all duration-700" style={{ opacity: showMetrics ? 1 : 0, transitionDelay: "800ms" }}>
                    <div className="text-[9px] text-content-disabled uppercase tracking-wider mb-2">Stress Test</div>
                    <div className="flex gap-1">
                      {["Recession", "Rate +2%", "Vacancy", "Insurance"].map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-muted text-emerald-light border border-emerald/10">PASS</span>
                      ))}
                    </div>
                    <div className="text-[10px] text-emerald-light mt-1">Survives all 4 scenarios</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gold-muted/30 border border-gold/[0.1] transition-all duration-700" style={{ opacity: showMetrics ? 1 : 0, transitionDelay: "950ms" }}>
                    <div className="text-[9px] text-content-disabled uppercase tracking-wider mb-1">Verdict</div>
                    <div className="text-lg font-display font-bold text-gold-light">BUY — High Confidence</div>
                    <div className="text-[10px] text-content-tertiary mt-0.5">All analytical signals aligned</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="border-y border-gold/[0.06] py-6 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: 48000, p: "$", s: "", l: "avg saved per deal", c: "text-gold-light" },
            { v: 10, p: "", s: "s", l: "full analysis time", c: "text-white" },
            { v: 87, p: "", s: "%", l: "confidence on top deals", c: "text-emerald-light" },
            { v: 12, p: "", s: "", l: "data engines", c: "text-gold-light" },
          ].map(m => (
            <div key={m.l}>
              <div className={`text-2xl md:text-3xl font-mono font-bold ${m.c}`}>
                <AnimatedCounter end={m.v} prefix={m.p} suffix={m.s} />
              </div>
              <div className="text-[10px] text-content-tertiary uppercase tracking-wider mt-1">{m.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── BENTO GRID — Features ─── */}
      <section id="features" className="py-28 px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="max-w-3xl mb-14">
              <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> A system that gets smarter with every analysis</p>
              <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">
                Not one algorithm. <span className="text-gradient-gold">A compounding advantage.</span>
              </h2>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-4 gap-5 auto-rows-[200px]">
            {bentoFeatures.map(f => {
              const sc = f.size === "large" ? "md:col-span-2" : f.size === "tall" ? "md:row-span-2" : "";
              return (
                <RevealSection key={f.title} className={sc}>
                  <div className="card-bento h-full group hover:shadow-glow-gold flex flex-col">
                    <div className="w-11 h-11 rounded-xl bg-gold-muted flex items-center justify-center mb-4 flex-shrink-0"><f.icon className="w-5 h-5 text-gold-light" /></div>
                    <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-content-secondary leading-relaxed flex-1">{f.desc}</p>
                    {f.title === "Market Timing" ? (
                      <div className="mt-4 pt-4 border-t border-white/[0.04]">
                        <div className="text-[9px] text-content-disabled uppercase tracking-wider mb-2">Cycle Position</div>
                        <div className="relative h-3 bg-white/[0.04] rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 rounded-full bg-gradient-gold" style={{ width: "72%" }} /></div>
                        <div className="flex justify-between mt-1.5 text-[9px] text-content-disabled"><span>Buyer&apos;s</span><span className="text-gold-light font-mono font-bold">Growth</span><span>Peak</span></div>
                      </div>
                    ) : f.mockMetric && (
                      <div className="mt-4 pt-4 border-t border-white/[0.04]">
                        <div className="text-[9px] text-content-disabled uppercase tracking-wider">{f.mockMetric.label}</div>
                        <div className="text-xl font-mono font-bold text-gold-light mt-0.5">{f.mockMetric.value}</div>
                      </div>
                    )}
                  </div>
                </RevealSection>);
            })}
          </div>
        </div>
      </section>

      {/* ─── THE ATTACK ─── */}
      <section className="py-28 px-6 border-t border-gold/[0.1]">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="max-w-3xl mb-16">
              <p className="text-rose-light text-xs font-semibold tracking-[0.12em] uppercase mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> The uncomfortable truth</p>
              <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">Your broker profits from what you don&apos;t know.</h2>
              <p className="text-content-secondary text-lg leading-relaxed">They see the comps you don&apos;t. They know the neighborhood trajectory you can&apos;t access. They pocket the difference between what you paid and what you should have paid. It&apos;s not personal. It&apos;s information asymmetry. And it&apos;s costing you six figures.</p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5">
            {[{icon:DollarSign,stat:"$48K",label:"avg overpayment",title:"You overpaid. You just don't know it yet.",body:"The average investor overpays by 12%. On a $400K property — $48,000. Gone before your first rent check."},{icon:Clock,stat:"11 days",label:"avg deal window",title:"Good deals don't wait for spreadsheets.",body:"The best properties last 11 days. Your manual analysis takes 14 hours. Someone with better tools already closed."},{icon:Eye,stat:"1 of 12",label:"risks you test",title:"Your stress test is a fantasy.",body:"You tested what happens if vacancy rises 5%. But recessions send five problems at once. You tested 1 of 12 variables."}].map(p=>(
              <RevealSection key={p.title}>
                <div className="card-bento group h-full">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-rose-muted flex items-center justify-center"><p.icon className="w-6 h-6 text-rose-light" /></div>
                    <div className="text-right"><div className="text-2xl font-mono font-bold text-rose-light">{p.stat}</div><div className="text-[10px] text-content-disabled uppercase tracking-wider">{p.label}</div></div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-content-secondary leading-relaxed">{p.body}</p>
                </div>
              </RevealSection>))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-28 px-6 border-t border-gold/[0.1] bg-surface-secondary scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-4">
                Address to verdict. Under <span className="text-gradient-gold">10 seconds.</span>
              </h2>
            </div>
          </RevealSection>
          <div className="space-y-0">
            {[
              { n: "01", t: "Paste any address", d: "Type or paste. Analysis starts automatically.", icon: MapPin },
              { n: "02", t: "See everything your broker hides", d: "True value, cash flow, institutional metrics, stress tests, market trajectory — all at once.", icon: Eye },
              { n: "03", t: "Get a verdict you can trust", d: "Buy, hold, or avoid — with a confidence percentage, specific next steps, and every data point visible.", icon: Target },
            ].map((s, i) => (
              <RevealSection key={s.n}>
                <div className="relative flex gap-6 pb-12 last:pb-0 group">
                  {i < 2 && <div className="absolute left-[23px] top-[56px] w-px h-[calc(100%-48px)] bg-gradient-to-b from-gold/30 to-transparent" />}
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gold-muted border border-gold/20 flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-gold transition-shadow">
                    <span className="text-sm font-mono font-bold text-gold-light">{s.n}</span>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-base font-semibold text-white mb-1">{s.t}</h3>
                    <p className="text-sm text-content-secondary leading-relaxed">{s.d}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="py-28 px-6 border-t border-gold/[0.1]">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                Zillow is for buyers.<br /><span className="text-gradient-gold">LootVue is for investors.</span>
              </h2>
            </div>
          </RevealSection>

          <RevealSection>
            <div className="rounded-xl border border-gold/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gold/[0.1]">
                      <th className="text-left py-4 px-5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">What you need to know</th>
                      <th className="text-center py-4 px-4 bg-gold/[0.04]"><span className="text-gold-light font-bold text-sm">LootVue</span></th>
                      <th className="text-center py-4 px-4 text-content-disabled text-xs">Zillow</th>
                      <th className="text-center py-4 px-4 text-content-disabled text-xs">DealCheck</th>
                      <th className="text-center py-4 px-4 text-content-disabled text-xs">Spreadsheet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((r, i) => (
                      <tr key={r.f} className={`border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                        <td className="py-3.5 px-5 text-content-secondary text-xs">{r.f}</td>
                        <td className="py-3.5 px-4 text-center bg-gold/[0.04]">
                          {r.lv === true ? <Check className="w-4 h-4 text-gold-light mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.lv)}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.z === false ? <XIcon className="w-3.5 h-3.5 text-white/[0.08] mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.z)}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.d === false ? <XIcon className="w-3.5 h-3.5 text-white/[0.08] mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.d)}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {r.s === false ? <XIcon className="w-3.5 h-3.5 text-white/[0.08] mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.s)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-28 px-6 border-t border-gold/[0.1] bg-surface-secondary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gold/[0.03] blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <RevealSection>
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Real investors. Real money.</h2>
              <p className="text-content-secondary text-lg">Not vanity metrics. Actual dollars found, saved, and earned.</p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <RevealSection key={t.name}>
                <div className="card-bento h-full flex flex-col">
                  {/* Hero metric */}
                  <div className="mb-5">
                    <div className="text-4xl font-mono font-extrabold text-gradient-gold leading-none">{t.metric}</div>
                    <div className="text-[10px] text-content-disabled uppercase tracking-wider mt-1">{t.metricLabel}</div>
                  </div>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />)}
                  </div>
                  {/* Quote */}
                  <p className="text-sm text-content-secondary leading-relaxed mb-5 flex-1">&ldquo;{t.text}&rdquo;</p>
                  {/* Attribution */}
                  <div className="border-t border-white/[0.06] pt-4 mt-auto">
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-content-tertiary">{t.role}</div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="py-28 px-6 border-t border-gold/[0.1]">
        <RevealSection>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-8">
              Institutional intelligence.<br /><span className="text-gradient-gold">Individual pricing.</span>
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
              {[
                { name: "Bloomberg", price: "$24,000", per: "/year", h: false },
                { name: "CoStar", price: "$15,000", per: "/year", h: false },
                { name: "LootVue", price: "Free", per: "to start", h: true },
              ].map(p => (
                <div key={p.name} className={`p-5 rounded-xl border transition-all ${p.h ? "border-gold/30 bg-gold-muted animate-pulse-gold" : "border-white/[0.04] bg-white/[0.01]"}`}>
                  <div className={`text-xs mb-2 ${p.h ? "text-gold-light font-semibold" : "text-content-disabled"}`}>{p.name}</div>
                  <div className={`font-mono font-bold ${p.h ? "text-gold-bright text-3xl" : "text-content-disabled line-through text-sm"}`}>{p.price}</div>
                  <div className="text-[10px] text-content-disabled mt-1">{p.per}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-content-tertiary">3 free analyses. Then $29/month for unlimited. The average insight saves 10-50x the subscription.</p>
          </div>
        </RevealSection>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-28 px-6 border-t border-gold/[0.1] bg-surface-secondary scroll-mt-20">
        <RevealSection>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-10">Questions we get asked</h2>
            {faqData.map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
          </div>
        </RevealSection>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 px-6 border-t border-gold/[0.1] relative overflow-hidden">
        <div className="absolute inset-0 animate-gradient-x pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(154,123,26,0.08) 0%, rgba(201,162,39,0.12) 25%, rgba(232,197,71,0.08) 50%, rgba(201,162,39,0.12) 75%, rgba(154,123,26,0.08) 100%)", backgroundSize: "200% 100%" }} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-gold/[0.06] blur-[180px]" />
        </div>
        <RevealSection>
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl sm:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">
              Be first in line.<br /><span className="text-gradient-gold">Early access is limited.</span>
            </h2>
            <p className="text-content-secondary text-lg leading-relaxed mb-8">Same data. Same depth. Same tools the institutions use. The only difference is who has access.</p>
            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gold/20 bg-surface-card hover:border-gold/40 transition-all">
                <input type="email" placeholder="your@email.com" className="flex-1 bg-transparent text-base text-white placeholder:text-content-disabled outline-none" />
                <button className="btn-primary btn-sm whitespace-nowrap animate-pulse-gold">Join Waitlist <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-content-disabled text-xs mt-3">2,847 investors already on the list. Launching Q2 2026.</p>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gold/[0.08] py-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4"><div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center"><span className="text-black font-bold text-[10px]">LV</span></div><span className="font-display font-bold text-white tracking-[0.15em] text-sm">LOOTVUE</span></div>
              <p className="text-xs text-content-tertiary leading-relaxed">Real estate intelligence for investors who refuse to guess.</p>
            </div>
            {[
              {t:"Product",l:[{n:"Features",h:"#features"},{n:"How It Works",h:"#how-it-works"},{n:"Pricing",h:"/pricing"},{n:"FAQ",h:"#faq"},{n:"Waitlist",h:"/signup"}]},
              {t:"Company",l:[{n:"About",h:"/about"},{n:"Blog",h:"#"},{n:"Careers",h:"#"},{n:"Contact",h:"mailto:hello@lootvue.com"}]},
              {t:"Legal",l:[{n:"Privacy Policy",h:"/privacy"},{n:"Terms of Service",h:"/terms"},{n:"Investment Disclaimer",h:"/disclaimer"},{n:"Security",h:"#"}]}
            ].map(c=>(
              <div key={c.t}><div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-4">{c.t}</div><ul className="space-y-2.5">{c.l.map(l=><li key={l.n}><Link href={l.h} className="text-sm text-content-secondary hover:text-gold-light transition-colors">{l.n}</Link></li>)}</ul></div>
            ))}
          </div>
          <div className="border-t border-gold/[0.1] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"><span className="text-xs text-content-disabled">&copy; 2026 LootVue Inc.</span><span className="text-xs text-content-disabled">Data: FRED · Census · BLS · ATTOM</span></div>
        </div>
      </footer>
    </div>
  );
}
