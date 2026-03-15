"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Shield, TrendingUp, Search, GitMerge, CheckCircle, Play } from "lucide-react";

const features = [
  { icon: BarChart3, color: "text-accent-light", glow: "group-hover:shadow-glow",
    title: "Multi-Engine Analysis",
    body: "Not one algorithm. Twelve. Each built from different data\u2009\u2014\u2009demographics, capital flow, permits, rates, migration, search trends. When they independently agree, the probability of being correct compounds." },
  { icon: Shield, color: "text-emerald-light", glow: "group-hover:shadow-glow-emerald",
    title: "Institutional-Grade Risk",
    body: "Six correlated stress scenarios test your deal against recession, rate shock, insurance crisis, and more\u2009\u2014\u2009simultaneously. Know your break-even vacancy and exact resilience rating." },
  { icon: TrendingUp, color: "text-[#A78BFA]", glow: "group-hover:shadow-[0_0_20px_-4px_rgba(167,139,250,0.3)]",
    title: "Rate Intelligence",
    body: "Track how Fed policy transmits to mortgage rates to your deals. See the 30-month Goldman lag between rate changes and price impact. Know when to act." },
];

const steps = [
  { icon: Search, title: "Enter a market or address", body: "Analysis runs automatically across all 12 engines." },
  { icon: GitMerge, title: "12 engines cross-validate", body: "See where they agree and where they diverge." },
  { icon: CheckCircle, title: "Get verdict with confidence", body: "Backed by data, not opinions." },
];

const rankings = [
  { city: "Austin, TX", score: 82, bars: 4 },
  { city: "Raleigh, NC", score: 84, bars: 5 },
  { city: "Nashville, TN", score: 76, bars: 3 },
];

const cardMetrics = [
  { label: "Price", value: "$285,000" },
  { label: "Cap Rate", value: "7.2%", tag: "strong" },
  { label: "Cash Flow", value: "+$470/mo", positive: true },
  { label: "DSCR", value: "1.35x", tag: "good" },
];

const footerCols = [
  { title: "Product", links: ["Features", "Pricing", "Integrations"] },
  { title: "Company", links: ["About", "Blog", "Careers"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-content-primary overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <span className="text-gold-light text-lg font-serif leading-none">&#x7384;</span>
            <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 bg-gradient-mesh overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent/[0.07] blur-[120px]" />
          <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-emerald/[0.05] blur-[100px]" />
        </div>
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1fr_420px] gap-16 items-center">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-accent-light bg-accent-muted px-3.5 py-1.5 rounded-full border border-accent/20 mb-8">
              Real Estate Intelligence Platform
            </span>
            <h1 className="font-display font-bold text-[2.75rem] sm:text-[3.5rem] leading-[1.08] tracking-tight mb-6">
              <span className="text-white">Find properties that will</span><br />
              <span className="text-gradient">actually make you money.</span>
            </h1>
            <p className="text-content-secondary text-lg leading-relaxed max-w-xl mb-8">
              12 independent engines cross-validate markets, deals, and timing. When engines
              agree&thinsp;&mdash;&thinsp;you invest with conviction. When they diverge&thinsp;&mdash;&thinsp;you
              wait. No guesswork. No single algorithm.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Link href="/signup" className="btn-primary btn-lg group">
                Start Free Analysis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button className="btn-ghost btn-lg gap-2"><Play className="w-4 h-4" /> Watch Demo</button>
            </div>
            <p className="text-content-disabled text-xs tracking-wide">
              Free to start &middot; No credit card &middot; Real-time data
            </p>
          </div>

          {/* Mock Analysis Card */}
          <div className="hidden lg:block animate-fade-in">
            <div className="card-glass border-accent/15 glow-accent p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">1423 Cedar Ridge Dr</div>
                  <div className="text-xs text-content-tertiary mt-0.5">Austin, TX 78701</div>
                </div>
                <span className="badge bg-emerald-muted text-emerald-light font-bold tracking-wide">BUY</span>
              </div>
              <div className="px-5 py-4 space-y-3 border-b border-white/[0.06]">
                {cardMetrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-xs text-content-tertiary">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-semibold ${m.positive ? "text-emerald-light" : "text-white"}`}>{m.value}</span>
                      {m.tag && <span className="text-[10px] font-medium text-emerald-light">&#9679; {m.tag}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider">11/12 Engines Aligned</span>
                  <span className="text-xs font-mono font-bold text-accent-light">87%</span>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#A78BFA]" style={{ width: "87%" }} />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <div className="text-[10px] text-content-disabled">Verdict</div>
                    <div className="text-sm font-bold text-emerald-light flex items-center gap-1">
                      BUY <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-content-disabled">Confidence</div>
                    <div className="text-sm font-mono font-bold text-white">87%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-content-disabled">Risk</div>
                    <div className="text-sm font-bold text-emerald-light">LOW</div>
                  </div>
                </div>
                <p className="text-[11px] text-content-tertiary leading-relaxed italic border-t border-white/[0.06] pt-3 mt-1">
                  &ldquo;Strong convergence across macro, fundamentals, and demand signals.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className="border-y border-white/[0.06] bg-gradient-to-b from-surface-secondary to-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { value: "12", label: "Analysis Engines" },
            { value: "12", label: "Confluences" },
            { value: "6", label: "Stress Tests" },
            { value: "$2.4B+", label: "Analyzed" },
          ].map((m, i) => (
            <div key={m.label} className={`px-6 py-8 text-center ${i < 3 ? "border-r border-white/[0.06]" : ""} ${i < 2 ? "border-b md:border-b-0 border-white/[0.06]" : ""}`}>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">{m.value}</div>
              <div className="text-xs text-content-tertiary mt-1 uppercase tracking-wider font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-3">Everything you need to invest with confidence</h2>
            <p className="text-content-secondary leading-relaxed">Institutional-grade analytics, available to every investor.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className={`card-glass group transition-all duration-300 hover:border-white/[0.12] ${f.glow}`}>
                <div className="mb-5 w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-accent/40 via-accent/20 to-accent/40" />
            {steps.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="w-14 h-14 rounded-2xl bg-accent-muted border border-accent/20 flex items-center justify-center mb-5 relative z-10">
                  <span className="text-lg font-mono font-bold text-accent-light">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <s.icon className="w-5 h-5 text-accent-light mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dense Product Preview */}
      <section className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-3">Built for investors who read the numbers</h2>
            <p className="text-content-secondary max-w-lg mx-auto">Every data point sourced, every metric benchmarked, every risk surfaced.</p>
          </div>
          <div className="card-glass glow-accent border-accent/10 p-0 overflow-hidden max-w-4xl mx-auto">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <div className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-3">Rate Environment</div>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: "30yr Fixed", value: "6.95%", delta: "\u2193 0.08", deltaClass: "text-emerald-light" },
                  { label: "Fed Funds", value: "4.75%" },
                  { label: "Spread", value: "2.20%", badge: "NORMAL" },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="text-xs text-content-tertiary mb-0.5">{r.label}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-mono font-bold text-white">{r.value}</span>
                      {r.delta && <span className={`text-xs font-mono ${r.deltaClass}`}>{r.delta}</span>}
                      {r.badge && <span className="badge-emerald text-[10px]">{r.badge}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 divide-x divide-white/[0.06]">
              <div className="px-6 py-4">
                <div className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-3">Market Rankings</div>
                <div className="space-y-2.5">
                  {rankings.map((m) => (
                    <div key={m.city} className="flex items-center justify-between">
                      <span className="text-sm text-content-secondary">{m.city}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className={`w-1 h-3 rounded-sm ${j < m.bars ? "bg-accent-light" : "bg-surface-muted"}`} />
                          ))}
                        </div>
                        <span className="text-sm font-mono font-bold text-white w-6 text-right">{m.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-3">Portfolio Summary</div>
                <div className="space-y-2.5">
                  {[
                    { label: "Total Value", value: "$1.06M" },
                    { label: "Monthly CF", value: "+$1,140", up: true },
                    { label: "Avg Cap Rate", value: "6.5%" },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center justify-between">
                      <span className="text-sm text-content-secondary">{p.label}</span>
                      <span className={`text-sm font-mono font-bold ${p.up ? "text-emerald-light" : "text-white"}`}>{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-accent/[0.06] blur-[120px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Stop guessing. <span className="text-gradient">Start investing with conviction.</span>
          </h2>
          <p className="text-content-secondary leading-relaxed mb-8 text-lg">Join investors analyzing markets across 50 states.</p>
          <Link href="/signup" className="btn-primary btn-lg group">
            Get Started Free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-12 md:gap-16 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gold-light text-xl font-serif leading-none">&#x7384;</span>
                <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
              </div>
              <p className="text-sm text-content-tertiary leading-relaxed max-w-xs">
                Institutional-grade real estate intelligence. 12 engines. One verdict.
              </p>
            </div>
            {footerCols.map((col) => (
              <div key={col.title}>
                <div className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href={`/${link.toLowerCase()}`} className="text-sm text-content-secondary hover:text-white transition-colors">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 Xuan Intelligence, Inc.</span>
            <div className="flex items-center gap-4 text-xs text-content-disabled">
              <Link href="/privacy" className="hover:text-content-tertiary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-content-tertiary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
