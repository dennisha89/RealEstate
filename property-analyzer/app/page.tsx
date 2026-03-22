"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Shield, TrendingUp, Target, Zap, Building2, DollarSign, Clock, Eye } from "lucide-react";

const FEATURES = [
  { icon: BarChart3, title: "12-Engine Market Analysis", desc: "Every market scored across macro, fundamentals, capital flow, and demand. Not one algorithm — twelve independent engines cross-validating each other.", color: "text-emerald-400" },
  { icon: TrendingUp, title: "Rate Intelligence", desc: "Track how Fed policy flows through mortgage rates to your deals. See the 30-month lag between rate changes and price impact — before anyone else.", color: "text-blue-400" },
  { icon: Shield, title: "Multi-Variable Stress Test", desc: "Don't test one variable at a time. Test recession, rate shock, and insurance crisis simultaneously. Know exactly when your deal breaks.", color: "text-red-400" },
  { icon: Target, title: "Institutional-Grade Metrics", desc: "Debt yield, yield-on-cost, replacement cost basis, exit cap sensitivity. The metrics Blackstone uses, accessible to you.", color: "text-gold-400" },
  { icon: Clock, title: "Entry Timing Engine", desc: "Not just where to buy — when to buy. Seasonal patterns, rate forecasts, leading indicators combined into one timing signal.", color: "text-purple-400" },
  { icon: Eye, title: "Investor Intelligence", desc: "See what other investors are watching. Aggregate behavior reveals consensus, contrarian opportunities, and emerging markets before they trend.", color: "text-cyan-400" },
];

const WORKFLOW_STEPS = [
  { num: "01", title: "Scan Markets", desc: "Find markets where macro forces, demographics, and capital flow converge" },
  { num: "02", title: "Analyze Signals", desc: "12 engines cross-validate. See where they agree and where they diverge" },
  { num: "03", title: "Evaluate Deals", desc: "Institutional metrics, stress tests, and financing optimization per property" },
  { num: "04", title: "Check Timing", desc: "Rate environment, seasonal patterns, and leading indicators say: now or wait" },
  { num: "05", title: "Assess Risk", desc: "Red flags, correlation anomalies, and worst-case scenarios surfaced automatically" },
  { num: "06", title: "Get the Verdict", desc: "All forces weighed. One decision. Backed by data, validated over time" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#08090E] overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#08090E]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold text-gold-400">LV</span>
            <span className="text-sm font-bold tracking-wider text-white">LOOTVUE</span>
            <span className="text-[10px] text-gray-500 tracking-widest uppercase hidden sm:block">Real Estate Intelligence</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Log in</Link>
            <Link href="/workflow" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              Start Analyzing <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Real Estate First */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 md:px-6">
          <div className="max-w-3xl">
            <p className="text-emerald-400 text-sm font-medium tracking-wider uppercase mb-4 animate-fade-in">Real Estate Investment Intelligence</p>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight animate-fade-in">
              Find high-probability<br />
              <span className="text-emerald-400">investment properties</span><br />
              with confidence.
            </h1>
            <p className="text-lg text-gray-400 mt-6 max-w-2xl leading-relaxed animate-slide-up">
              12 independent analytical engines cross-validate every market and deal.
              When they agree, you act with conviction. When they diverge, you wait.
              No guesswork. No single algorithm. Confluence.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 mt-8 animate-slide-up">
              <Link href="/workflow" className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-base">
                Start Your Analysis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/markets" className="px-8 py-3.5 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-lg transition-all flex items-center gap-2 text-base">
                Explore Markets
              </Link>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-slide-up">
            {[
              { value: "52", label: "Analysis Engines", sub: "Independent scoring" },
              { value: "12", label: "Confluence Forces", sub: "Cross-validated" },
              { value: "6", label: "Stress Scenarios", sub: "Correlated variables" },
              { value: "73", label: "Scoring Components", sub: "Per investment" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-2xl md:text-3xl font-bold font-mono text-white">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                <p className="text-[10px] text-gray-600">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What It Does */}
      <section className="py-16 md:py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-emerald-400 text-xs font-medium tracking-wider uppercase mb-3">Platform Capabilities</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Institutional analytics.<br />Individual investor access.
            </h2>
            <p className="text-sm text-gray-500 mt-3">What Blackstone pays millions for. What you get in one platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                <f.icon className={`h-5 w-5 ${f.color} mb-3`} />
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — The Workflow */}
      <section className="py-16 md:py-24 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-emerald-400 text-xs font-medium tracking-wider uppercase mb-3">Guided Decision Process</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Six steps. Pass/fail gates.<br />No bad decisions slip through.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.num} className="p-5 rounded-xl border border-white/[0.06] hover:border-emerald-500/30 transition-all">
                <span className="text-xs font-mono text-emerald-400/60">{s.num}</span>
                <h3 className="text-sm font-semibold text-white mt-2 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Philosophy — Subtle, Not the Headline */}
      <section className="py-16 md:py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <p className="text-xs text-gray-600 tracking-wider uppercase mb-6">The Methodology</p>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
            For 5,000 years, feng shui masters identified where natural forces converge
            to create prosperity. We apply the same principle to data — reading
            <span className="text-blue-400"> macro forces</span>,
            <span className="text-emerald-400"> ground truth</span>, and
            <span className="text-gold-400"> human behavior</span> to
            find where investment returns concentrate.
          </p>
          <div className="flex items-center justify-center gap-8 mt-10">
            <div className="text-center">
              <span className="text-3xl font-serif text-blue-400/80">天</span>
              <p className="text-[10px] text-gray-600 mt-1">Macro</p>
            </div>
            <span className="text-gray-700">×</span>
            <div className="text-center">
              <span className="text-3xl font-serif text-emerald-400/80">地</span>
              <p className="text-[10px] text-gray-600 mt-1">Fundamentals</p>
            </div>
            <span className="text-gray-700">×</span>
            <div className="text-center">
              <span className="text-3xl font-serif text-gold-400/80">人</span>
              <p className="text-[10px] text-gray-600 mt-1">Behavior</p>
            </div>
            <span className="text-gray-700">=</span>
            <div className="text-center">
              <span className="text-3xl font-bold text-white">LV</span>
              <p className="text-[10px] text-gray-600 mt-1">Conviction</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">
            Stop guessing. Start knowing.
          </h2>
          <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
            Every metric compared against benchmarks. Every decision backed by multiple independent engines.
            Every risk surfaced before you commit capital.
          </p>
          <Link href="/workflow" className="inline-flex items-center gap-2 px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all text-base">
            Start Your Analysis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gold-400">LV</span>
            <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">LootVue</span>
          </div>
          <p className="text-xs text-gray-700">&copy; 2026 LootVue Intelligence, Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
