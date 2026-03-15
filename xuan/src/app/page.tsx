"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, BarChart3, Shield, TrendingUp, Search, GitMerge, CheckCircle,
  Zap, Target, Clock, Eye, Building2, DollarSign, AlertTriangle,
  Star, Lock, Layers, Activity, ArrowUpRight,
  Check, X as XIcon, ChevronDown, ChevronUp,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    stat: "$48K",
    statLabel: "avg overpayment",
    title: "You can't see what you can't see.",
    body: "The average investor overpays by 12% because they're working with incomplete data. On a $400K property, that's $48,000 you'll never recover. Not because you're bad at math — because your tools are.",
  },
  {
    icon: Clock,
    stat: "14 hrs",
    statLabel: "per deal analysis",
    title: "Your spreadsheet takes longer than the deal lasts.",
    body: "The average good deal in a competitive market lasts 11 days. Your manual analysis takes 14 hours per property. By the time you finish, someone else already closed.",
  },
  {
    icon: Eye,
    stat: "1 of 12",
    statLabel: "variables tested",
    title: "You stress test one thing. Life breaks everything at once.",
    body: "You tested what happens if vacancy rises 5%. But recessions don't send one problem — they send five simultaneously. Rents drop, vacancy spikes, rates rise, insurance jumps, values fall. All at once.",
  },
];

const CAPABILITIES = [
  { icon: Target, title: "Know if the deal is real", desc: "See the true value, not the listing price. Know your cash flow, risk profile, and exit strategy before you make an offer." },
  { icon: TrendingUp, title: "Know when to move", desc: "Rate environment, market momentum, and seasonal patterns combined into one clear signal: act now or wait." },
  { icon: Shield, title: "Know what could go wrong", desc: "Every deal stress tested against multiple worst-case scenarios at once — not one variable at a time." },
  { icon: Building2, title: "Know how it fits your empire", desc: "See how every new deal changes your portfolio — concentration risk, cash flow impact, goal progress." },
];

const COMPARISON = [
  { feature: "Tells you if a deal will make money", xuan: true, zillow: false, dealcheck: "Partially", sheets: false },
  { feature: "Tells you WHEN to buy", xuan: true, zillow: false, dealcheck: false, sheets: false },
  { feature: "Tests multiple risks at once", xuan: true, zillow: false, dealcheck: false, sheets: "Manual" },
  { feature: "Shows rate impact on your deal", xuan: true, zillow: false, dealcheck: false, sheets: false },
  { feature: "Institutional-grade analysis", xuan: true, zillow: false, dealcheck: "Basic", sheets: "Manual" },
  { feature: "Shows when to sell or refinance", xuan: true, zillow: false, dealcheck: false, sheets: false },
  { feature: "Shows what other investors see", xuan: true, zillow: false, dealcheck: false, sheets: false },
  { feature: "Generates lender-ready reports", xuan: true, zillow: false, dealcheck: false, sheets: false },
  { feature: "Portfolio-wide impact analysis", xuan: true, zillow: false, dealcheck: false, sheets: false },
  { feature: "Tracks your accuracy over time", xuan: true, zillow: false, dealcheck: false, sheets: false },
];

const TESTIMONIALS = [
  { name: "David K.", role: "12-unit portfolio, Austin TX", text: "I found a property listed at $285K that comped at $312K. Xuan showed me the demographic momentum, the supply constraint, and the cap rate trajectory — I would have missed all three in my spreadsheet. Closed in 9 days.", metric: "$27K instant equity", rating: 5 },
  { name: "Sarah L.", role: "First deal, Raleigh NC", text: "I was paralyzed for 8 months. Afraid of buying wrong. The guided workflow walked me through every risk, every number, every comparison. I made my first offer with actual confidence.", metric: "$380/mo cash flow", rating: 5 },
  { name: "Marcus T.", role: "PE analyst, 48-unit fund", text: "Debt yield, yield-on-cost, exit cap sensitivity — tools my firm pays $50K/year for elsewhere. I run preliminary screens through Xuan before presenting to committee. Saves 6 hours per deal.", metric: "6 hrs saved per deal", rating: 5 },
];

const FAQS = [
  { q: "How is this different from Zillow?", a: "Zillow shows listings. Xuan tells you which ones will actually make money — and which ones will lose money. Different question, different tool." },
  { q: "Do I need to be an experienced investor?", a: "No. The system walks you through every step. If a number is bad, it tells you it's bad and what to do about it. If a number is good, it tells you why and what to check next." },
  { q: "How accurate is it?", a: "The system tracks every prediction it makes and compares it against what actually happened. Over time, you can see the accuracy rate. We show our track record because we have nothing to hide." },
  { q: "What's the catch with the free tier?", a: "No catch. 3 free analyses to prove the value. Then $29/month for unlimited. The average insight saves investors 10-50x the subscription cost. If it doesn't pay for itself, you should cancel." },
  { q: "Is my data secure?", a: "Your portfolio data is encrypted and never shared. We aggregate anonymous behavior signals across all users to improve market intelligence, but individual data is never exposed." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function CompCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-light mx-auto" />;
  if (value === false) return <XIcon className="w-4 h-4 text-content-disabled mx-auto" />;
  return <span className="text-[11px] font-mono text-content-secondary">{value}</span>;
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm font-medium text-white group-hover:text-accent-light transition-colors pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-content-tertiary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-content-tertiary flex-shrink-0" />}
      </button>
      {open && <p className="text-sm text-content-secondary leading-relaxed pb-5 pr-8">{a}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-content-primary overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <span className="text-gold-light text-lg font-serif">&#x7384;</span>
            <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Analyze Your First Deal Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO — PROVOKE + ELEVATE ── */}
      <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-accent/[0.06] blur-[150px]" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-emerald/[0.04] blur-[120px]" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1fr_440px] gap-12 lg:gap-20 items-center">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent-light bg-accent-muted px-3.5 py-1.5 rounded-full border border-accent/20 mb-8">
              <Zap className="w-3 h-3" /> Real Estate Intelligence Platform
            </span>

            <h1 className="font-display font-extrabold text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] leading-[1.06] tracking-tight mb-6">
              Your broker knows things<br />you don&apos;t. <span className="text-gradient">Now you can too.</span>
            </h1>

            <p className="text-content-secondary text-lg leading-relaxed max-w-xl mb-3">
              See the true value of any deal before you bid. Know if the market is rising or falling.
              Know if the numbers survive a recession. Know if it fits your portfolio.
              In 10 seconds. Not 10 hours.
            </p>
            <p className="text-content-tertiary text-sm mb-8 max-w-lg">
              The same depth of analysis that institutional funds run on every acquisition — now in your hands.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Link href="/signup" className="btn-primary btn-lg group">
                Analyze Your First Deal Free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="text-content-disabled text-xs flex items-center gap-3">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Free forever tier</span>
              <span>·</span>
              <span>No credit card</span>
              <span>·</span>
              <span>90-second setup</span>
            </p>
          </div>

          {/* Mock analysis card */}
          <div className="hidden lg:block animate-fade-in">
            <div className="card-glass border-accent/15 glow-accent p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <div>
                  <div className="text-sm font-semibold text-white">1423 Cedar Ridge Dr</div>
                  <div className="text-xs text-content-tertiary mt-0.5">Austin, TX 78701 · 3bd/2ba · 1,650 sqft</div>
                </div>
                <span className="badge bg-emerald-muted text-emerald-light font-bold">BUY</span>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-white/[0.06]">
                {[
                  { l: "Price", v: "$285,000", c: "text-white" },
                  { l: "Est. Value (comps)", v: "$312,000", c: "text-emerald-light", note: "+$27K equity" },
                  { l: "Cap Rate", v: "7.2%", c: "text-white", note: "Above 6% threshold ✓" },
                  { l: "Monthly Cash Flow", v: "+$470", c: "text-emerald-light", note: "After all expenses" },
                  { l: "DSCR", v: "1.35x", c: "text-white", note: "Debt fully covered" },
                  { l: "Cash-on-Cash", v: "11.8%", c: "text-emerald-light", note: "vs 5% savings acct" },
                ].map((m) => (
                  <div key={m.l}>
                    <div className="text-[10px] text-content-disabled uppercase tracking-wider">{m.l}</div>
                    <div className={`text-sm font-mono font-bold ${m.c}`}>{m.v}</div>
                    {m.note && <div className="text-[9px] text-emerald/70 mt-0.5">{m.note}</div>}
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 space-y-3 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider">Analysis Confidence</span>
                  <span className="text-xs font-mono font-bold text-accent-light">87%</span>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent via-accent-light to-[#A78BFA]" style={{ width: "91.6%" }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { l: "Verdict", v: "BUY", c: "text-emerald-light", bg: "bg-emerald-muted/50" },
                    { l: "Confidence", v: "87%", c: "text-accent-light", bg: "bg-accent-muted/50" },
                    { l: "Risk", v: "LOW", c: "text-emerald-light", bg: "bg-emerald-muted/50" },
                  ].map((m) => (
                    <div key={m.l} className={`p-2 rounded-lg ${m.bg}`}>
                      <div className="text-[10px] text-content-disabled">{m.l}</div>
                      <div className={`text-sm font-mono font-bold ${m.c}`}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3 bg-white/[0.01]">
                <p className="text-[11px] text-content-tertiary leading-relaxed italic">
                  &ldquo;Strong buy signal. Market fundamentals support price growth. Cash flow positive
                  after all expenses. Stress tested against recession scenario — survives.
                  One flag: portfolio concentration in Texas — consider diversifying next acquisition.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="border-y border-white/[0.06] py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-content-disabled">
          <span>Data from:</span>
          <span className="text-content-tertiary font-medium">FRED (Federal Reserve)</span>
          <span>·</span>
          <span className="text-content-tertiary font-medium">U.S. Census</span>
          <span>·</span>
          <span className="text-content-tertiary font-medium">Bureau of Labor Statistics</span>
          <span>·</span>
          <span className="text-content-tertiary font-medium">ATTOM Property Data</span>
        </div>
      </section>

      {/* ── THE PROBLEM — PAS FRAMEWORK ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-rose-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">The Problem</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              You wouldn&apos;t be on this page<br />if your current approach was working.
            </h2>
            <p className="text-content-secondary leading-relaxed">
              The information asymmetry between institutional investors and individual investors is the single biggest
              wealth transfer mechanism in real estate. Here&apos;s what it costs you:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="card group hover:border-rose/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-muted flex items-center justify-center">
                    <p.icon className="w-5 h-5 text-rose-light" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-mono font-bold text-rose-light">{p.stat}</div>
                    <div className="text-[10px] text-content-disabled uppercase tracking-wider">{p.statLabel}</div>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET — OUTCOMES, NOT METHODOLOGY ── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-accent-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">What You Get</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Four answers. Every deal.<br />Before you risk a dollar.
            </h2>
            <p className="text-content-secondary leading-relaxed">
              Xuan doesn&apos;t give you data and leave you to figure it out.
              It gives you answers — with a confidence level and specific next steps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="card group hover:border-accent/20 transition-all">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                  <c.icon className="w-5 h-5 text-accent-light" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 border-t border-white/[0.06] bg-surface-secondary/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">How It Works</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Address to verdict. Under 10 seconds.
            </h2>
            <p className="text-content-secondary max-w-lg mx-auto">
              Type an address. Get a clear answer in under 10 seconds — a verdict, a confidence level,
              and specific next steps. Backed by data, not opinions.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { n: "01", t: "Enter any US address or ZIP code", d: "Type an address. The system does the rest. Analysis starts automatically." },
              { n: "02", t: "See the full picture — not just one number", d: "Value, cash flow, risk, timing, market trajectory, and portfolio impact. All in one view." },
              { n: "03", t: "See what survives a worst-case scenario", d: "Your deal tested against multiple economic scenarios simultaneously. Know the breaking point." },
              { n: "04", t: "Get a clear answer with a confidence level", d: "Not a vague score. A specific verdict, a confidence percentage, and exactly what to do next." },
              { n: "05", t: "Track every decision. Build your track record.", d: "Save deals, generate reports, and see whether your past decisions were right — over time." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-all">
                <div className="w-10 h-10 rounded-xl bg-accent-muted border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-mono font-bold text-accent-light">{s.n}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{s.t}</h3>
                  <p className="text-xs text-content-secondary leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE — ENEMY POSITIONING ── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Why Switch</p>
            <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-3">
              Zillow is for buyers. Xuan is for investors.
            </h2>
            <p className="text-content-secondary">Different question. Different tool. See the difference.</p>
          </div>

          <div className="card-glass overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">Capability</th>
                    <th className="text-center py-4 px-4"><span className="text-accent-light font-bold text-sm">Xuan</span></th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">Zillow</th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">DealCheck</th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">Spreadsheet</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((r, i) => (
                    <tr key={r.feature} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                      <td className="py-3.5 px-5 text-content-secondary text-xs">{r.feature}</td>
                      <td className="py-3.5 px-4 text-center"><CompCell value={r.xuan} /></td>
                      <td className="py-3.5 px-4 text-center"><CompCell value={r.zillow} /></td>
                      <td className="py-3.5 px-4 text-center"><CompCell value={r.dealcheck} /></td>
                      <td className="py-3.5 px-4 text-center"><CompCell value={r.sheets} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — SPECIFIC OUTCOMES ── */}
      <section className="py-24 px-6 border-t border-white/[0.06] bg-surface-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-3">Real investors. Real outcomes.</h2>
            <p className="text-content-secondary">Not vanity metrics. Actual dollars and hours saved.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />)}</div>
                  <span className="badge bg-emerald-muted text-emerald-light font-mono font-bold">{t.metric}</span>
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
      </section>

      {/* ── PRICING ANCHOR ── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-accent-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Pricing</p>
          <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-6">
            Institutional intelligence.<br />Not institutional pricing.
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
            {[
              { name: "Bloomberg", price: "$24,000", per: "/year", style: "text-content-disabled line-through" },
              { name: "CoStar", price: "$15,000", per: "/year", style: "text-content-disabled line-through" },
              { name: "Xuan", price: "Free", per: "to start", style: "text-emerald-light text-3xl" },
            ].map((p) => (
              <div key={p.name} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-xs text-content-tertiary mb-2">{p.name}</div>
                <div className={`font-mono font-bold ${p.style}`}>{p.price}</div>
                <div className="text-[10px] text-content-disabled">{p.per}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-content-tertiary max-w-md mx-auto">
            3 free analyses. Then $29/month for unlimited. Cancel anytime.
            The average deal Xuan helps you avoid or negotiate saves $15K+.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6 border-t border-white/[0.06] bg-surface-secondary/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-8">Frequently asked</h2>
          {FAQS.map((f) => <FAQ key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── FINAL CTA — LOSS AVERSION ── */}
      <section className="py-28 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-accent/[0.06] blur-[150px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            The next deal you analyze without this<br />could be the one that costs you $48K.
          </h2>
          <p className="text-content-secondary text-lg leading-relaxed mb-8">
            Same data. Same analysis. Same tools the institutions use.
            The only difference is who has access.
          </p>
          <Link href="/signup" className="btn-primary btn-lg group">
            Analyze Your First Deal Free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-content-disabled text-xs mt-4">No credit card. 90-second setup. Free forever tier.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gold-light text-xl font-serif">&#x7384;</span>
                <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
              </div>
              <p className="text-xs text-content-tertiary leading-relaxed">
                Real estate intelligence for investors<br />who refuse to guess.
              </p>
            </div>
            {[
              { t: "Product", l: [{ name: "Features", href: "#" }, { name: "Pricing", href: "#" }, { name: "API", href: "#" }, { name: "Changelog", href: "#" }] },
              { t: "Company", l: [{ name: "About", href: "#" }, { name: "Blog", href: "#" }, { name: "Careers", href: "#" }] },
              { t: "Legal", l: [{ name: "Privacy", href: "/privacy" }, { name: "Terms", href: "/terms" }, { name: "Disclaimer", href: "/disclaimer" }] },
            ].map((c) => (
              <div key={c.t}>
                <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-4">{c.t}</div>
                <ul className="space-y-2">{c.l.map((l) => <li key={l.name}><Link href={l.href} className="text-sm text-content-secondary hover:text-white transition-colors">{l.name}</Link></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 Xuan Intelligence, Inc.</span>
            <span className="text-xs text-content-disabled">Data: FRED · Census · BLS · ATTOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
