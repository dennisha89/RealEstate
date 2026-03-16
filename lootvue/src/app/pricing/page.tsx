"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X as XIcon, ArrowRight, ChevronDown, ChevronUp, Lock, BarChart3 } from "lucide-react";

const TIERS = [
  { name: "Free", price: [0, 0], desc: "Prove the value before you spend a dollar.", cta: "Start Free", href: "/signup", hl: false, features: ["3 property analyses per month", "Basic market scores for 5 markets", "Rate dashboard", "Community pulse (view only)"] },
  { name: "Pro", price: [29, 23], desc: "Everything you need to invest with confidence.", cta: "Start Pro \u2014 14 day free trial", href: "/signup?plan=pro", hl: true, badge: "Most Popular", features: ["Unlimited property analyses", "All market scores and rankings", "Full rate intelligence + portfolio impact", "Stress testing (all 6 scenarios)", "Deal pipeline tracking", "Investment memo generation", "Community consensus + rankings", "Priority data refresh"] },
  { name: "Fund", price: [79, 63], desc: "For teams running real portfolios.", cta: "Contact Sales", href: "/signup?plan=fund", hl: false, features: ["Everything in Pro", "API access (1,000 calls/month)", "Team collaboration (up to 5 seats)", "Custom report branding", "Dedicated support", "Bulk analysis (CSV upload)"] },
];

const COMP = [
  { f: "Property analyses", v: ["3/month", "Unlimited", "Unlimited"] },
  { f: "Market scores", v: ["5 markets", "All markets", "All markets"] },
  { f: "Rate dashboard", v: [true, true, true] },
  { f: "Community pulse", v: ["View only", true, true] },
  { f: "Stress testing", v: [false, "All 6 scenarios", "All 6 scenarios"] },
  { f: "Deal pipeline tracking", v: [false, true, true] },
  { f: "Investment memo generation", v: [false, true, true] },
  { f: "Priority data refresh", v: [false, true, true] },
  { f: "API access", v: [false, false, "1,000 calls/mo"] },
  { f: "Team collaboration", v: [false, false, "Up to 5 seats"] },
  { f: "Custom report branding", v: [false, false, true] },
  { f: "Dedicated support", v: [false, false, true] },
  { f: "Bulk analysis (CSV)", v: [false, false, true] },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no cancellation fees. Cancel from your account settings and keep access through the end of your billing period." },
  { q: "What happens after the 14-day Pro trial?", a: "You\u2019ll be charged the Pro rate unless you cancel or downgrade. We\u2019ll remind you 3 days before the trial ends." },
  { q: "Can I switch plans mid-cycle?", a: "Upgrades apply immediately with prorated billing. Downgrades take effect at the next billing cycle." },
  { q: "Is there a student or non-profit discount?", a: "Yes. Email us with verification and we\u2019ll apply a 50% discount to any paid plan." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards via Stripe. Annual plans can also pay by invoice." },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-light mx-auto" />;
  if (value === false) return <XIcon className="w-4 h-4 text-content-disabled mx-auto" />;
  return <span className="text-[11px] font-mono text-content-secondary">{value}</span>;
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm font-medium text-white group-hover:text-gold-light transition-colors pr-4">{q}</span>
        <Icon className="w-4 h-4 text-content-tertiary flex-shrink-0" />
      </button>
      {open && <p className="text-sm text-content-secondary leading-relaxed pb-5 pr-8">{a}</p>}
    </div>
  );
}

const ANCHORS = [
  { name: "Bloomberg Terminal", price: "$24,000", per: "/year" },
  { name: "CoStar", price: "$15,000", per: "/year" },
  { name: "LootVue Pro", price: "$29", per: "/month" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="min-h-screen bg-surface text-content-primary overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white tracking-wider text-sm">LOOTVUE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO + ANCHOR */}
      <section className="relative pt-32 md:pt-40 pb-4 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gold/[0.06] blur-[150px]" />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Pricing</p>
          <h1 className="font-display font-extrabold text-[2.5rem] sm:text-[3.25rem] leading-[1.08] tracking-tight mb-4">
            Institutional intelligence.<br /><span className="text-gradient">Not institutional pricing.</span>
          </h1>
          <p className="text-content-secondary text-lg leading-relaxed max-w-xl mx-auto mb-10">
            The same depth of analysis that billion-dollar funds pay six figures for.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-md mx-auto">
            {ANCHORS.map((p, i) => (
              <div key={p.name} className={`p-4 rounded-xl border ${i < 2 ? "border-white/[0.06] bg-white/[0.02]" : "border-gold/30 bg-gold-muted"}`}>
                <div className="text-xs text-content-tertiary mb-2">{p.name}</div>
                <div className={`font-mono font-bold ${i < 2 ? "text-content-disabled line-through" : "text-gold-light text-2xl"}`}>{p.price}</div>
                <div className="text-[10px] text-content-disabled">{p.per}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`text-sm ${!annual ? "text-white font-medium" : "text-content-tertiary"}`}>Monthly</span>
            <button onClick={() => setAnnual(!annual)} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${annual ? "bg-gold" : "bg-surface-muted"}`} aria-label="Toggle annual billing">
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${annual ? "translate-x-6" : ""}`} />
            </button>
            <span className={`text-sm ${annual ? "text-white font-medium" : "text-content-tertiary"}`}>
              Annual <span className="text-emerald-light text-xs font-semibold ml-1">Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <div key={t.name} className={`relative rounded-xl p-6 border transition-all ${t.hl ? "border-gold/40 bg-surface-card glow-gold" : "border-white/[0.06] bg-surface-card"}`} style={t.hl ? undefined : { boxShadow: "0 1px 3px rgba(0,0,0,0.3), inset 0 0.5px 0 0 rgba(255,255,255,0.04)" }}>
              {t.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-goldtext-white font-bold px-3 py-1 text-[11px]">{t.badge}</span>}
              <div className="mb-6">
                <h3 className="text-lg font-display font-bold text-white mb-1">{t.name}</h3>
                <p className="text-xs text-content-tertiary mb-4">{t.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-extrabold text-white">${annual ? (t.price[1] ?? 0) : (t.price[0] ?? 0)}</span>
                  <span className="text-content-tertiary text-sm">/month</span>
                </div>
                {annual && (t.price[0] ?? 0) > 0 && <p className="text-emerald-light text-xs mt-1 font-medium">${((t.price[0] ?? 0) - (t.price[1] ?? 0)) * 12} saved per year</p>}
              </div>
              <Link href={t.href} className={`w-full mb-6 ${t.hl ? "btn-primary" : "btn-secondary"} justify-center`}>{t.cta}</Link>
              <ul className="space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-light flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-content-secondary">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ALL PLANS INCLUDE */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-content-tertiary">
          <span className="text-content-disabled font-medium">All plans include:</span>
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Encrypted storage</span>
          <span>|</span><span>Data from FRED / Census / BLS</span>
          <span>|</span><span>Investment disclaimer</span>
        </div>
      </div>

      {/* FEATURE COMPARISON */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">Compare plans</h2>
            <p className="text-content-secondary text-sm">Every feature, side by side.</p>
          </div>
          <div className="card-glass overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-4 px-5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">Feature</th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">Free</th>
                    <th className="text-center py-4 px-4"><span className="text-gold-light font-bold text-sm">Pro</span></th>
                    <th className="text-center py-4 px-4 text-content-disabled text-xs">Fund</th>
                  </tr>
                </thead>
                <tbody>
                  {COMP.map((r, i) => (
                    <tr key={r.f} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                      <td className="py-3.5 px-5 text-content-secondary text-xs">{r.f}</td>
                      {r.v.map((val, j) => <td key={j} className="py-3.5 px-4 text-center"><Cell value={val} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-white/[0.06] bg-surface-secondary/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-8">Billing questions</h2>
          {FAQS.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gold/[0.06] blur-[150px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-4">Start analyzing deals today.</h2>
          <p className="text-content-secondary text-lg mb-8">3 free analyses. No credit card. 90-second setup.</p>
          <Link href="/signup" className="btn-primary btn-lg group">
            Analyze Your First Deal Free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-white tracking-wider text-sm">LOOTVUE</span>
              </Link>
              <p className="text-xs text-content-tertiary leading-relaxed">Real estate intelligence for investors<br />who refuse to guess.</p>
            </div>
            {[
              { t: "Product", l: [["Features", "/#features"], ["Pricing", "/pricing"], ["API", "#"], ["Changelog", "#"]] },
              { t: "Company", l: [["About", "/about"], ["Blog", "#"], ["Careers", "#"]] },
              { t: "Legal", l: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Security", "#"]] },
            ].map((c) => (
              <div key={c.t}>
                <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-4">{c.t}</div>
                <ul className="space-y-2">{c.l.map(([n, h]) => <li key={n}><Link href={h ?? "#"} className="text-sm text-content-secondary hover:text-white transition-colors">{n}</Link></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 LootVue Intelligence, Inc.</span>
            <span className="text-xs text-content-disabled">Data: FRED &middot; Census &middot; BLS &middot; ATTOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
