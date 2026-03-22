"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Shield, TrendingUp, Target, Clock, Eye, Building2,
  DollarSign, AlertTriangle, Lock, Check, X as XIcon,
  ChevronDown, ChevronUp, MapPin, Zap, Users, Star, Flame,
  BarChart3, LineChart, Activity, Brain, Landmark,
  Layers, Calculator, Briefcase, PieChart,
  GraduationCap, Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.classList.add("revealed");
          obs.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useReveal();
  return (
    <section ref={ref} id={id} className={`scroll-reveal ${className}`}>
      {children}
    </section>
  );
}

function AnimatedCounter({ end, prefix = "", suffix = "", duration = 2000 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && !started.current) {
        started.current = true;
        const s = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - s) / duration, 1);
          setCount(Math.round((1 - Math.pow(1 - p, 3)) * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gold/[0.08]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-[15px] font-medium text-white group-hover:text-gold-light transition-colors pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gold/60 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-content-tertiary flex-shrink-0" />}
      </button>
      {open && <p className="text-sm text-content-secondary leading-relaxed pb-5 pr-8">{a}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════════════════════════════════ */

const FEATURES = [
  { icon: Target, title: "Property Analysis", desc: "12 engines dissect every deal in 10 seconds. True market value, cash flow, cap rate, DSCR, institutional metrics, AI verdict with confidence score.", accent: "gold" as const },
  { icon: BarChart3, title: "Deal Simulator", desc: "Monte Carlo + DCF modeling. Adjust 20+ variables with real-time sliders. 10,000 iterations. See every possible outcome before committing a dollar.", accent: "emerald" as const },
  { icon: Shield, title: "Stress Testing", desc: "6 correlated worst-case scenarios simultaneously. Recession + rate spike + vacancy surge + insurance crisis. Know your exact breaking point.", accent: "rose" as const },
  { icon: PieChart, title: "Portfolio Intelligence", desc: "Track every property in one view. Wealth attribution, performance benchmarks, goal tracking. See your portfolio the way a fund manager does.", accent: "gold" as const },
  { icon: Activity, title: "Market Signals", desc: "39 engines tracking demographics, economics, supply/demand, capital flows, and leading indicators. Consensus scoring with 6-18 month forward signal.", accent: "emerald" as const },
  { icon: Brain, title: "AI Advisory", desc: "Claude-powered investment thesis grounded in your deal's actual numbers. Not generic advice — specific to your property, market, and portfolio.", accent: "gold" as const },
  { icon: Landmark, title: "Lending Marketplace", desc: "Match with lenders by deal type and borrower profile. Compare rates, terms, fees. Get pre-qualified without leaving the platform.", accent: "emerald" as const },
  { icon: Users, title: "Deal Room", desc: "Share analysis with partners and advisors via token-based access. Collaborate on due diligence. Close deals faster with shared intelligence.", accent: "gold" as const },
];

const ACCENT_CLASSES = {
  gold: "bg-gold-muted text-gold-light",
  emerald: "bg-emerald-muted text-emerald-light",
  rose: "bg-rose-muted text-rose-light",
};

const PAIN_POINTS = [
  { icon: DollarSign, stat: "$48K", label: "avg overpayment", title: "You overpaid. You just don\u2019t know it yet.", body: "The average investor overpays by 12%. On a $400K property, that\u2019s $48,000 gone before your first rent check clears." },
  { icon: Clock, stat: "11 days", label: "avg deal window", title: "Good deals don\u2019t wait for your spreadsheet.", body: "The best properties last 11 days on market. Your manual analysis takes 14 hours. Someone with better tools already submitted their offer." },
  { icon: Eye, stat: "1 of 12", label: "risks most test", title: "Your stress test is a fantasy.", body: "You test one variable in isolation. Recessions send five problems simultaneously. You tested 1 of 12 correlated risks. The other 11 are what kill deals." },
];

const MOAT_ITEMS = [
  { icon: Target, title: "See what the institutions see", desc: "Debt yield, yield-on-cost, IRR, exit cap sensitivity, replacement cost \u2014 the metrics Blackstone uses before every acquisition. In 10 seconds.", glow: "group-hover:shadow-glow-gold" },
  { icon: Shield, title: "Stress test like it\u2019s 2008", desc: "Six correlated worst-case scenarios running simultaneously. Recession + rate spike + insurance crisis + vacancy surge. Know your breaking point before you write the check.", glow: "group-hover:shadow-glow-emerald" },
  { icon: TrendingUp, title: "Rate intelligence that predicts", desc: "Fed funds, yield curve, mortgage spread, Goldman\u2019s 30-month lag \u2014 track how rate changes will hit YOUR deals and YOUR portfolio months from now.", glow: "group-hover:shadow-glow-gold" },
  { icon: Users, title: "Crowd intelligence you can\u2019t buy", desc: "Anonymous aggregate investor behavior. Which markets are heating. Where smart money moves. Consensus targets. Data no API sells.", glow: "group-hover:shadow-glow-emerald" },
];

const COMPARISON_ROWS = [
  { f: "Will this deal actually make money?", lv: true, z: false, d: "Partially", s: false },
  { f: "Is NOW the right time to buy?", lv: true, z: false, d: false, s: false },
  { f: "What happens in a recession?", lv: true, z: false, d: false, s: "Manual" },
  { f: "How do interest rates affect MY deal?", lv: true, z: false, d: false, s: false },
  { f: "What would Blackstone\u2019s analysts see?", lv: true, z: false, d: "Basic", s: "Manual" },
  { f: "Monte Carlo probability analysis?", lv: true, z: false, d: false, s: false },
  { f: "What are other investors seeing?", lv: true, z: false, d: false, s: false },
  { f: "How does this change my portfolio?", lv: true, z: false, d: false, s: false },
];

const TESTIMONIALS = [
  { name: "David K.", role: "12-unit portfolio, Austin TX", text: "Found a property listed at $285K that comped at $312K. LootVue showed me the demographic momentum, supply constraint, and why the cap rate was compressing. Closed in 9 days.", metric: "$27K equity", stars: 5 },
  { name: "Sarah L.", role: "First-time investor, Raleigh NC", text: "I was paralyzed for 8 months. Every deal felt like a gamble. The stress test and AI verdict gave me the confidence to make my first offer \u2014 knowing exactly what I was getting into.", metric: "$380/mo CF", stars: 5 },
  { name: "Marcus T.", role: "PE analyst, 48-unit fund", text: "Debt yield, yield-on-cost, exit cap sensitivity \u2014 tools my firm pays $50K/year for elsewhere. I screen deals through LootVue before presenting to our investment committee. Saves 6 hours per deal.", metric: "6 hrs saved", stars: 5 },
];

const PRICING_TIERS = [
  {
    name: "Free", price: "$0", period: "forever",
    desc: "Try the full analysis engine with no commitment.",
    features: ["3 property analyses per month", "Core metrics: cap rate, cash flow, DSCR", "AI verdict with confidence score", "Basic stress testing", "Community market signals"],
    cta: "Start Free", ctaClass: "btn-secondary w-full", highlight: false,
  },
  {
    name: "Pro", price: "$29", period: "/month",
    desc: "Everything you need to invest with institutional confidence.",
    features: ["Unlimited property analyses", "Full 12-engine deep analysis", "6-scenario correlated stress testing", "Deal simulator: DCF + Monte Carlo", "Portfolio tracker + benchmarks", "AI advisory with thesis generation", "39-engine market intelligence", "Lending marketplace access"],
    cta: "Start Pro", ctaClass: "btn-primary w-full", highlight: true,
  },
  {
    name: "Institutional", price: "$199", period: "/month",
    desc: "For teams managing capital at scale.",
    features: ["Everything in Pro", "5 team seats included", "Deal room collaboration", "Exportable loan packages (PDF)", "API access for pipeline integration", "White-label investor reports", "Priority support", "Custom model configuration"],
    cta: "Contact Sales", ctaClass: "btn-secondary w-full", highlight: false,
  },
];

const FAQ_ITEMS = [
  { q: "How is this different from Zillow?", a: "Zillow is a listings marketplace for BUYERS. LootVue is an analytics platform for INVESTORS. We don\u2019t show you homes to browse \u2014 we tell you which properties will make money. Cash flow analysis, institutional metrics, stress testing, Monte Carlo simulations, market signals, AI advisory. Different question, entirely different tool." },
  { q: "Why should I trust this over my own analysis?", a: "You shouldn\u2019t trust it blindly \u2014 and that\u2019s the point. LootVue shows every data source, every calculation step, every assumption in the chain. We surface the full computation so you can verify any number. We also track prediction accuracy over time. If we\u2019re wrong, you\u2019ll see it." },
  { q: "How accurate are the valuations?", a: "We cross-reference ATTOM property data, Census ACS demographics, BLS employment figures, FRED economic indicators, and RentCast rental comps. Every valuation includes a confidence interval \u2014 not a single-number guess. The system flags when data quality is insufficient for a reliable analysis." },
  { q: "What data sources power this?", a: "Seven institutional-grade sources: FRED (Federal Reserve economic data), Census ACS (demographics), Bureau of Labor Statistics (employment), ATTOM (property/title), RentCast (rental comps), Walk Score (walkability), and GreatSchools (school quality). Every data point cites its source and freshness date." },
  { q: "What\u2019s the catch with the free tier?", a: "No catch. 3 analyses per month, forever. If LootVue doesn\u2019t save you 10x the Pro subscription on your next deal, don\u2019t upgrade. We make money when investors get enough value to want unlimited access \u2014 not from hidden fees." },
  { q: "Do I need real estate investing experience?", a: "No. Every metric includes a plain-English explanation via MetricTooltip. First-time investors use the guided workflow that walks through each number and what to do about it. Experienced investors skip straight to the raw institutional analysis." },
  { q: "Can I use this for commercial properties?", a: "Currently optimized for residential (1-4 units) and small multifamily (5-50 units). Commercial analysis (office, retail, industrial) is on the roadmap. The institutional metrics \u2014 debt yield, yield-on-cost, exit cap sensitivity \u2014 already speak commercial underwriting language." },
  { q: "Is my data secure?", a: "All analysis runs server-side over encrypted connections. We never store your financial details or PII. Property analyses are tied to your account but contain no personal information. We don\u2019t sell data. Period." },
];

/* ═══════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-gray-900 overflow-x-hidden">

      {/* ──────────────────── NAV ──────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-display font-bold text-white tracking-[0.15em] text-sm">LOOTVUE</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-content-secondary hover:text-gold-light transition-colors">Features</a>
            <a href="#how-it-works" className="text-[13px] text-content-secondary hover:text-gold-light transition-colors">How It Works</a>
            <a href="#pricing" className="text-[13px] text-content-secondary hover:text-gold-light transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-content-secondary hover:text-gold-light transition-colors hidden sm:block">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* ──────────────────── HERO ──────────────────── */}
      <section className="relative pt-32 md:pt-44 pb-20 md:pb-28 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-gold/[0.04] blur-[180px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-emerald/[0.03] blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in mb-8">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-gold-light bg-gold-muted px-4 py-1.5 rounded-full border border-gold/20">
                <Flame className="w-3 h-3" /> 12 engines &middot; 10 seconds &middot; Zero guesswork
              </span>
            </div>

            <h1 className="animate-fade-in font-display font-extrabold text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] leading-[1.04] tracking-tight mb-6">
              Stop guessing on{" "}
              <span className="text-gradient">half-million dollar</span> decisions.
            </h1>

            <p className="animate-slide-up text-content-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
              Blackstone runs 50 data points before they bid. You get Zillow&apos;s estimate and a gut feeling.
              That gap costs the average investor <span className="text-rose-light font-mono font-semibold">$48,000 per deal</span>.
            </p>
            <p className="animate-slide-up text-content-tertiary text-base mb-10">
              LootVue gives you the same depth. In 10 seconds. For free.
            </p>

            <div className="max-w-xl mx-auto animate-slide-up">
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300 bg-surface-card ${searchFocused ? "border-gold/40 shadow-glow-gold" : "border-white/[0.06] hover:border-white/[0.12]"}`}>
                <MapPin className={`w-5 h-5 transition-colors ${searchFocused ? "text-gold" : "text-content-disabled"}`} />
                <input
                  type="text"
                  placeholder="Paste any US property address..."
                  className="flex-1 bg-transparent text-base text-white placeholder:text-content-disabled outline-none"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                <Link href="/signup" className="btn-primary btn-sm whitespace-nowrap">
                  Analyze <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-content-disabled text-xs mt-3 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Free forever tier</span>
                <span>&middot;</span>
                <span>No credit card</span>
                <span>&middot;</span>
                <span>Results in 10 seconds</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────── DATA SOURCES ──────────────────── */}
      <section className="border-y border-white/[0.04] py-5 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-content-tertiary">Powered by</span>
            {["FRED", "Census ACS", "BLS", "ATTOM", "RentCast", "Walk Score", "GreatSchools"].map(s => (
              <span key={s} className="text-[11px] font-mono tracking-wide text-content-disabled hover:text-content-tertiary transition-colors">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── PRODUCT PREVIEW ──────────────────── */}
      <Reveal className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gold/[0.08] bg-surface-card overflow-hidden shadow-elevated">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-surface-secondary">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald/30" />
              </div>
              <div className="flex-1 text-center text-[10px] text-content-disabled font-mono">lootvue.com/dashboard/analyze</div>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm font-semibold text-white">1423 Cedar Ridge Dr, Austin TX 78701</div>
                  <div className="text-xs text-content-tertiary mt-0.5">3bd &middot; 2ba &middot; 1,650 sqft &middot; Built 2008 &middot; Single Family</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-muted text-emerald-light text-xs font-bold tracking-wide">BUY</span>
                  <span className="px-3 py-1.5 rounded-lg bg-gold-muted text-gold-light text-xs font-mono font-bold">87%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
                {[
                  { l: "List Price", v: "$285,000", c: "text-white" },
                  { l: "True Value", v: "$312,400", c: "text-emerald-light" },
                  { l: "Instant Equity", v: "+$27,400", c: "text-gold-bright" },
                  { l: "Cap Rate", v: "7.2%", c: "text-white" },
                  { l: "Cash Flow", v: "+$470/mo", c: "text-emerald-light" },
                  { l: "DSCR", v: "1.35x", c: "text-white" },
                ].map(m => (
                  <div key={m.l} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[9px] text-content-disabled uppercase tracking-wider">{m.l}</div>
                    <div className={`text-sm font-mono font-bold mt-1 ${m.c}`}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[9px] text-content-disabled uppercase tracking-wider mb-2">Stress Test</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Recession", "Rate +2%", "Vacancy 2x", "Insurance"].map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-emerald-muted text-emerald-light border border-emerald/10">
                        <Check className="w-2.5 h-2.5" /> {s}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-emerald-light mt-2">Survives all 4 scenarios</div>
                </div>
                <div className="p-4 rounded-lg bg-gold-muted/30 border border-gold/[0.1]">
                  <div className="text-[9px] text-content-disabled uppercase tracking-wider mb-1">AI Verdict</div>
                  <div className="text-xl font-display font-bold text-gold-light">BUY &mdash; High Confidence</div>
                  <div className="text-[10px] text-content-tertiary mt-1">11 of 12 analytical engines aligned</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── STATS ──────────────────── */}
      <Reveal className="border-y border-gold/[0.06] py-8 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: 48000, p: "$", s: "", l: "avg saved per deal", c: "text-gold-light" },
            { v: 10, p: "", s: "s", l: "full analysis time", c: "text-white" },
            { v: 87, p: "", s: "%", l: "confidence accuracy", c: "text-emerald-light" },
            { v: 12, p: "", s: "", l: "independent engines", c: "text-gold-light" },
          ].map(m => (
            <div key={m.l}>
              <div className={`text-3xl md:text-4xl font-mono font-bold ${m.c}`}>
                <AnimatedCounter end={m.v} prefix={m.p} suffix={m.s} />
              </div>
              <div className="text-[10px] text-content-tertiary uppercase tracking-wider mt-1.5">{m.l}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ──────────────────── FEATURES GRID ──────────────────── */}
      <Reveal id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-16">
            <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">The platform</p>
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">
              Everything an institutional investor sees.<br />
              <span className="text-gradient">Now in your browser.</span>
            </h2>
            <p className="text-content-secondary text-lg leading-relaxed">
              12 analytical engines running in parallel. Property analysis, market signals, stress testing,
              AI advisory &mdash; the full stack of tools that power billion-dollar funds.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-bento group">
                  <div className={`w-10 h-10 rounded-lg ${ACCENT_CLASSES[f.accent]} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-[13px] text-content-secondary leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── THE PROBLEM ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-16">
            <p className="text-rose-light text-xs font-semibold tracking-[0.12em] uppercase mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> The uncomfortable truth
            </p>
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">
              Your broker profits from what you don&apos;t know.
            </h2>
            <p className="text-content-secondary text-lg leading-relaxed">
              They see comps you can&apos;t access. They know which neighborhoods are about to turn.
              They pocket the difference between what you paid and what you should have paid.
              It&apos;s not personal &mdash; it&apos;s information asymmetry.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PAIN_POINTS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="card-bento group">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-rose-muted flex items-center justify-center">
                      <Icon className="w-6 h-6 text-rose-light" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-rose-light">{p.stat}</div>
                      <div className="text-[10px] text-content-disabled uppercase tracking-wider">{p.label}</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-content-secondary leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── DEEP DIVE: ANALYSIS ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04] bg-surface-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Instant Analysis</p>
              <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-tight mb-5">
                Every metric that matters.<br />
                <span className="text-gradient">In 10 seconds flat.</span>
              </h2>
              <p className="text-content-secondary text-base leading-relaxed mb-6">
                Paste an address. Get institutional-grade analysis: true market value, cash flow projection,
                cap rate, DSCR, debt yield, yield-on-cost, IRR, exit cap sensitivity &mdash; plus a stress test
                across 6 simultaneous worst-case scenarios.
              </p>
              <ul className="space-y-3">
                {[
                  "True market value vs. listing price \u2014 spot instant equity",
                  "Full mortgage breakdown with real-time rate data from FRED",
                  "6 correlated stress scenarios running simultaneously",
                  "AI-powered verdict: buy, hold, or avoid \u2014 with confidence %",
                ].map(t => (
                  <li key={t} className="flex items-start gap-3 text-sm text-content-secondary">
                    <Check className="w-4 h-4 text-gold-light mt-0.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Mockup */}
            <div className="rounded-xl border border-white/[0.06] bg-surface-card p-5 shadow-elevated">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-3.5 h-3.5 text-gold" />
                <span className="text-xs text-content-secondary">847 Oak Park Ave, Chicago IL 60302</span>
                <span className="ml-auto badge-emerald text-[10px]">BUY 91%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { l: "Price", v: "$195K", c: "text-white" },
                  { l: "Value", v: "$228K", c: "text-emerald-light" },
                  { l: "Equity", v: "+$33K", c: "text-gold-bright" },
                ].map(m => (
                  <div key={m.l} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                    <div className="text-[8px] text-content-disabled uppercase tracking-wider">{m.l}</div>
                    <div className={`text-xs font-mono font-bold mt-0.5 ${m.c}`}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { l: "Cap Rate", v: "8.1%" },
                  { l: "Cash Flow", v: "+$620" },
                  { l: "DSCR", v: "1.52x" },
                  { l: "Debt Yield", v: "11.2%" },
                ].map(m => (
                  <div key={m.l} className="p-2 rounded bg-white/[0.02]">
                    <div className="text-[7px] text-content-disabled uppercase">{m.l}</div>
                    <div className="text-[11px] font-mono font-bold text-white mt-0.5">{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-muted/30 border border-emerald/10">
                <div className="text-[8px] text-content-disabled uppercase tracking-wider mb-1">Stress Test</div>
                <div className="flex gap-1">
                  {["Recession", "Rate+2%", "Vacancy", "Insurance", "Rent-10%", "Combined"].map(s => (
                    <span key={s} className="text-[7px] px-1.5 py-0.5 rounded bg-emerald-muted text-emerald-light">&#10003;</span>
                  ))}
                </div>
                <div className="text-[9px] text-emerald-light mt-1">6/6 scenarios survived &middot; Resilience: A</div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── DEEP DIVE: SIMULATOR ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Mockup — left on desktop */}
            <div className="order-2 lg:order-1 rounded-xl border border-white/[0.06] bg-surface-card p-5 shadow-elevated">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-white">Deal Simulator</span>
                <span className="text-[10px] text-content-disabled font-mono">Monte Carlo &middot; 10,000 runs</span>
              </div>
              {/* Sliders */}
              <div className="space-y-3 mb-4">
                {[
                  { l: "Hold Period", v: "7 years", pct: 60 },
                  { l: "Exit Cap Rate", v: "6.5%", pct: 45 },
                  { l: "Rent Growth", v: "3.0%/yr", pct: 50 },
                ].map(s => (
                  <div key={s.l}>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-content-tertiary">{s.l}</span>
                      <span className="text-gold-light font-mono">{s.v}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-gold rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Chart */}
              <div className="h-24 mb-3 rounded-lg bg-white/[0.02] border border-white/[0.03] p-3 flex items-end gap-[3px]">
                {[20, 35, 28, 45, 52, 48, 60, 72, 65, 80, 75, 85, 90, 82, 95, 88, 70, 55, 40, 30].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${h}%`,
                      background: h > 50 ? "rgba(16,185,129,0.4)" : h > 30 ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)",
                    }}
                  />
                ))}
              </div>
              {/* Outputs */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "IRR", v: "14.2%", c: "text-emerald-light" },
                  { l: "NPV", v: "$48,200", c: "text-gold-light" },
                  { l: "P(profit)", v: "78%", c: "text-white" },
                ].map(m => (
                  <div key={m.l} className="text-center p-2 rounded bg-white/[0.02]">
                    <div className="text-[8px] text-content-disabled uppercase">{m.l}</div>
                    <div className={`text-sm font-mono font-bold ${m.c}`}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Text — right on desktop */}
            <div className="order-1 lg:order-2">
              <p className="text-emerald-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Deal Simulator</p>
              <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-tight mb-5">
                See every outcome<br />
                <span className="text-gradient">before you commit a dollar.</span>
              </h2>
              <p className="text-content-secondary text-base leading-relaxed mb-6">
                DCF analysis + Monte Carlo simulation with 10,000 iterations. Adjust hold period,
                exit cap, rent growth, vacancy, interest rates &mdash; see exactly how each variable
                impacts your IRR, NPV, and probability of profit. In real time.
              </p>
              <ul className="space-y-3">
                {[
                  "20+ adjustable inputs with real-time output updates",
                  "Monte Carlo probability distribution across 10,000 scenarios",
                  "IRR, NPV, equity multiple, and break-even month",
                  "Sensitivity tables: vary two inputs, see the full impact matrix",
                ].map(t => (
                  <li key={t} className="flex items-start gap-3 text-sm text-content-secondary">
                    <Check className="w-4 h-4 text-emerald-light mt-0.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── DEEP DIVE: MARKET INTEL ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04] bg-surface-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Market Intelligence</p>
              <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-tight mb-5">
                39 engines tracking<br />
                <span className="text-gradient">every market signal.</span>
              </h2>
              <p className="text-content-secondary text-base leading-relaxed mb-6">
                Population growth, employment trends, supply pipeline, institutional capital flows,
                rent trajectories, school quality, walkability, climate risk &mdash; aggregated into
                a single consensus score that tells you whether NOW is the right time to buy in any market.
              </p>
              <ul className="space-y-3">
                {[
                  "Demographic, economic, and supply/demand engines",
                  "Institutional capital flow tracking and smart money signals",
                  "Leading indicators with 6-18 month forward signal",
                  "Consensus scoring: bullish, neutral, or bearish with confidence",
                ].map(t => (
                  <li key={t} className="flex items-start gap-3 text-sm text-content-secondary">
                    <Check className="w-4 h-4 text-gold-light mt-0.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Mockup */}
            <div className="rounded-xl border border-white/[0.06] bg-surface-card p-5 shadow-elevated">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-white">Market Pulse &mdash; Austin, TX</span>
                <span className="badge-gold text-[10px]">Score: 82</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { l: "Population", v: "+2.8%", c: "text-emerald-light" },
                  { l: "Job Growth", v: "+3.1%", c: "text-emerald-light" },
                  { l: "Unemployment", v: "3.2%", c: "text-emerald-light" },
                  { l: "Med. Income", v: "$78K", c: "text-white" },
                ].map(m => (
                  <div key={m.l} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] text-center">
                    <div className="text-[7px] text-content-disabled uppercase">{m.l}</div>
                    <div className={`text-[11px] font-mono font-bold mt-0.5 ${m.c}`}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { l: "Demographics", s: 88, c: "bg-emerald" },
                  { l: "Economics", s: 82, c: "bg-emerald" },
                  { l: "Supply/Demand", s: 71, c: "bg-gold" },
                  { l: "Capital Flows", s: 79, c: "bg-emerald" },
                  { l: "Quality of Life", s: 85, c: "bg-emerald" },
                ].map(b => (
                  <div key={b.l} className="flex items-center gap-3">
                    <span className="text-[8px] text-content-tertiary w-20 text-right">{b.l}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className={`h-full ${b.c} rounded-full`} style={{ width: `${b.s}%`, opacity: 0.6 }} />
                    </div>
                    <span className="text-[9px] font-mono text-content-secondary w-6">{b.s}</span>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-lg bg-gold-muted/30 border border-gold/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-content-tertiary">Consensus</span>
                  <span className="text-xs font-bold text-gold-light">BULLISH &middot; 14 of 17 signals</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── MOAT ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04] relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-gold/[0.03] blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl mb-14">
            <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> The compounding advantage
            </p>
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">
              Not one feature.<br />
              <span className="text-gradient">A system that compounds.</span>
            </h2>
            <p className="text-content-secondary text-lg leading-relaxed">
              Competitors can copy a feature. They can&apos;t copy 12 months of prediction accuracy.
              They can&apos;t copy thousands of investors&apos; aggregate behavior.
              The longer you use LootVue, the wider the moat &mdash; for you AND for the platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {MOAT_ITEMS.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={`card-bento group transition-all duration-300 ${f.glow}`}>
                  <div className="w-12 h-12 rounded-xl bg-gold-muted flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-gold-light" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-content-secondary leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── HOW IT WORKS ──────────────────── */}
      <Reveal id="how-it-works" className="py-32 px-6 border-t border-white/[0.04] bg-surface-secondary">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-4">
              Address to verdict.<br />Under <span className="text-gradient">10 seconds.</span>
            </h2>
          </div>
          <div className="space-y-0">
            {[
              { n: "01", t: "Paste any address", d: "Type or paste any US property address. Analysis starts the instant you hit enter.", icon: MapPin },
              { n: "02", t: "12 engines run simultaneously", d: "Market comps, cash flow, stress testing, demographic analysis, institutional metrics, AI advisory \u2014 all at once.", icon: Layers },
              { n: "03", t: "Get a verdict you can act on", d: "Buy, hold, or avoid. Confidence percentage. Specific next steps. Every data point visible and verifiable.", icon: Target },
            ].map((s, i) => (
              <div key={s.n} className="relative flex gap-6 pb-14 last:pb-0 group">
                {i < 2 && <div className="absolute left-[23px] top-[56px] w-px h-[calc(100%-48px)] bg-gradient-to-b from-gold/30 to-transparent" />}
                <div className="relative z-10 w-12 h-12 rounded-xl bg-gold-muted border border-gold/20 flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-gold transition-shadow">
                  <span className="text-sm font-mono font-bold text-gold-light">{s.n}</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-base font-semibold text-white mb-1.5">{s.t}</h3>
                  <p className="text-sm text-content-secondary leading-relaxed max-w-lg">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── WHO IT'S FOR ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight mb-4">
              Built for every investor.
            </h2>
            <p className="text-content-secondary text-lg max-w-2xl mx-auto">
              Whether it&apos;s your first deal or your fiftieth &mdash; the platform adapts to your experience level.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: GraduationCap, title: "First-Time Investor", subtitle: "Stop guessing. Start knowing.",
                points: ["Every metric explained in plain English", "Guided workflow walks you through the analysis", "Stress test shows exactly what can go wrong", "AI verdict gives you a clear answer with reasoning"],
              },
              {
                icon: Building2, title: "Portfolio Owner", subtitle: "Scale without the spreadsheet.",
                points: ["Track 50+ properties in one dashboard", "Wealth attribution shows where returns come from", "Refinance and exit timing signals", "Portfolio-wide stress testing and benchmarks"],
              },
              {
                icon: Briefcase, title: "Fund Manager", subtitle: "Institutional diligence. Individual speed.",
                points: ["Debt yield, YOC, IRR, exit cap sensitivity", "Exportable loan packages for lenders", "Team deal rooms with role-based access", "API access for pipeline integration"],
              },
            ].map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="card-bento">
                  <div className="w-12 h-12 rounded-xl bg-gold-muted flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-gold-light" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{p.title}</h3>
                  <p className="text-sm text-gold-light/70 mb-4">{p.subtitle}</p>
                  <ul className="space-y-2.5">
                    {p.points.map(pt => (
                      <li key={pt} className="flex items-start gap-2.5 text-[13px] text-content-secondary">
                        <Check className="w-3.5 h-3.5 text-emerald-light mt-0.5 flex-shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── COMPARISON ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04] bg-surface-secondary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              Zillow is for buyers.<br />
              <span className="text-gradient">LootVue is for investors.</span>
            </h2>
          </div>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">What you need to know</th>
                    <th className="text-center py-4 px-4"><span className="text-gold-light font-bold text-sm">LootVue</span></th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">Zillow</th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">DealCheck</th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">Spreadsheet</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((r, i) => (
                    <tr key={r.f} className={`border-b border-white/[0.03] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                      <td className="py-3.5 px-5 text-content-secondary text-xs">{r.f}</td>
                      <td className="py-3.5 px-4 text-center">
                        {r.lv === true ? <Check className="w-4 h-4 text-gold-light mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.lv)}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {r.z === false ? <XIcon className="w-4 h-4 text-content-disabled mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.z)}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {r.d === false ? <XIcon className="w-4 h-4 text-content-disabled mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.d)}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {r.s === false ? <XIcon className="w-4 h-4 text-content-disabled mx-auto" /> : <span className="text-[11px] font-mono text-content-secondary">{String(r.s)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── TESTIMONIALS ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gold/[0.03] blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              Real investors. Real dollars.
            </h2>
            <p className="text-content-secondary text-lg">Not vanity metrics. Actual money found, saved, and earned.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card-bento">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />
                    ))}
                  </div>
                  <span className="badge-emerald font-mono font-bold">{t.metric}</span>
                </div>
                <p className="text-sm text-content-secondary leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-content-tertiary">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ──────────────────── PRICING ──────────────────── */}
      <Reveal id="pricing" className="py-32 px-6 border-t border-white/[0.04] bg-surface-secondary">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Institutional intelligence.<br />
              <span className="text-gradient">Individual pricing.</span>
            </h2>
          </div>
          {/* Competitor context */}
          <div className="flex items-center justify-center gap-6 mb-14">
            {[
              { name: "Bloomberg Terminal", price: "$24,000/yr" },
              { name: "CoStar", price: "$15,000/yr" },
            ].map(c => (
              <span key={c.name} className="text-xs text-content-disabled">
                <span className="line-through">{c.name}: {c.price}</span>
              </span>
            ))}
          </div>
          {/* Tiers */}
          <div className="grid md:grid-cols-3 gap-5">
            {PRICING_TIERS.map(tier => (
              <div key={tier.name} className={`rounded-xl border p-6 transition-all ${tier.highlight ? "border-gold/30 bg-gold-muted/10 shadow-glow-gold" : "border-white/[0.06] bg-surface-card"}`}>
                {tier.highlight && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gold-light bg-gold-muted px-2.5 py-0.5 rounded-full mb-4">Most Popular</span>
                )}
                <div className="text-sm font-semibold text-white mb-1">{tier.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-mono font-bold text-white">{tier.price}</span>
                  <span className="text-sm text-content-tertiary">{tier.period}</span>
                </div>
                <p className="text-[13px] text-content-secondary mb-6">{tier.desc}</p>
                <Link href="/signup" className={tier.ctaClass}>{tier.cta}</Link>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-content-secondary">
                      <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-gold-light" : "text-content-tertiary"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-content-tertiary mt-8">
            The average insight saves 10&ndash;50x the subscription. Cancel anytime.
          </p>
        </div>
      </Reveal>

      {/* ──────────────────── FAQ ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-10">Frequently asked questions</h2>
          {FAQ_ITEMS.map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
        </div>
      </Reveal>

      {/* ──────────────────── FINAL CTA ──────────────────── */}
      <Reveal className="py-32 px-6 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-gold/[0.06] blur-[180px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">
            Your next deal without this could cost you <span className="text-gradient">$48K.</span>
          </h2>
          <p className="text-content-secondary text-lg leading-relaxed mb-10">
            Same data. Same depth. Same tools the institutions use.
            The only difference is who has access. Now you do.
          </p>
          <Link href="/signup" className="btn-primary btn-lg group text-base">
            Analyze Your First Deal Free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="text-content-disabled text-xs mt-5">No credit card &middot; 90-second setup &middot; Free forever tier</p>
        </div>
      </Reveal>

      {/* ──────────────────── FOOTER ──────────────────── */}
      <footer className="border-t border-black/[0.06] py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <LogoMark size={24} />
                <span className="font-display font-bold text-white tracking-[0.15em] text-sm">LOOTVUE</span>
              </div>
              <p className="text-xs text-content-tertiary leading-relaxed max-w-[200px]">
                Institutional-grade real estate intelligence for investors who refuse to guess.
              </p>
            </div>
            {[
              { t: "Product", l: [{ n: "Features", h: "#features" }, { n: "Pricing", h: "#pricing" }, { n: "How It Works", h: "#how-it-works" }] },
              { t: "Resources", l: [{ n: "Documentation", h: "#" }, { n: "API Reference", h: "#" }, { n: "Blog", h: "#" }] },
              { t: "Company", l: [{ n: "About", h: "/about" }, { n: "Careers", h: "#" }] },
              { t: "Legal", l: [{ n: "Privacy", h: "/privacy" }, { n: "Terms", h: "/terms" }, { n: "Disclaimer", h: "/disclaimer" }] },
            ].map(c => (
              <div key={c.t}>
                <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-4">{c.t}</div>
                <ul className="space-y-2.5">
                  {c.l.map(l => (
                    <li key={l.n}><Link href={l.h} className="text-sm text-content-secondary hover:text-gold-light transition-colors">{l.n}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 LootVue Inc. All rights reserved.</span>
            <span className="text-xs text-content-disabled">Data: FRED &middot; Census ACS &middot; BLS &middot; ATTOM &middot; RentCast &middot; Walk Score</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
