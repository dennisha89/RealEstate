import Link from "next/link";
import { ArrowRight, Eye, ShieldCheck, BarChart3, Database, Target, TrendingUp, Users } from "lucide-react";

const DIFFS = [
  { icon: Eye, title: "We show our work.", body: "Every score has a data source. Every verdict has a confidence level. Every recommendation cites the numbers behind it. No black boxes." },
  { icon: BarChart3, title: "We track our accuracy.", body: "Over time, you can see whether our analysis was right. We publish our track record because we have nothing to hide." },
  { icon: ShieldCheck, title: "We don\u2019t sell your data.", body: "Your portfolio is yours. We aggregate anonymous signals to improve the platform for everyone, but individual data is never exposed." },
];

const SOURCES = [
  { tag: "FRED", full: "Federal Reserve Economic Data", desc: "Interest rates, monetary policy, economic indicators" },
  { tag: "Census ACS", full: "U.S. Census Bureau", desc: "Demographics, income, housing, population trends" },
  { tag: "BLS", full: "Bureau of Labor Statistics", desc: "Employment, wages, CPI, labor market health" },
  { tag: "ATTOM", full: "ATTOM Property Data", desc: "Property records, valuations, transaction history" },
  { tag: "Walk Score", full: "Walk Score API", desc: "Walkability, transit access, bike score" },
  { tag: "GreatSchools", full: "GreatSchools.org", desc: "School ratings and proximity analysis" },
];

const STATS = [
  { icon: Database, stat: "6+", label: "Federal data sources" },
  { icon: Target, stat: "12", label: "Analysis engines" },
  { icon: TrendingUp, stat: "<10s", label: "Address to verdict" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface text-content-primary overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-gold-light text-lg font-serif">&#x7384;</span>
            <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* MISSION */}
      <section className="relative pt-32 md:pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-[150px]" />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-accent-light text-xs font-semibold tracking-[0.12em] uppercase mb-4">Our Mission</p>
          <h1 className="font-display font-extrabold text-[2.25rem] sm:text-[3rem] leading-[1.1] tracking-tight mb-8">
            Every investor deserves the same data advantage as a <span className="text-gradient">billion-dollar fund.</span>
          </h1>
          <p className="text-content-secondary text-lg leading-relaxed">
            Not as a watered-down version. The same depth. The same rigor. The same confidence.
            We built Xuan to close the gap between those who have information and those who don&apos;t.
          </p>
        </div>
      </section>

      {/* THE PROBLEM WE SOLVE */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <p className="text-rose-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">The Problem We Solve</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-6">The gap isn&apos;t talent. It&apos;s tools.</h2>
          <div className="space-y-5 text-content-secondary leading-relaxed">
            <p>A REIT analyst has access to 50+ data sources, stress testing infrastructure, and a team of researchers. An individual investor has a spreadsheet and Zillow.</p>
            <p>The information asymmetry between institutional and individual investors is the single biggest wealth transfer mechanism in real estate. It doesn&apos;t have to be.</p>
            <p className="text-white font-medium">We built the bridge.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-10">
            {STATS.map((s) => (
              <div key={s.label} className="card text-center">
                <s.icon className="w-5 h-5 text-accent-light mx-auto mb-3" />
                <div className="text-2xl font-mono font-bold text-white mb-1">{s.stat}</div>
                <div className="text-[11px] text-content-tertiary uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE'RE DIFFERENT */}
      <section className="py-20 px-6 border-t border-white/[0.06] bg-surface-secondary/20">
        <div className="max-w-3xl mx-auto">
          <p className="text-emerald-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">How We&apos;re Different</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-10">Transparent by design.</h2>
          <div className="space-y-5">
            {DIFFS.map((d) => (
              <div key={d.title} className="flex items-start gap-5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-all">
                <div className="w-10 h-10 rounded-lg bg-emerald-muted flex items-center justify-center flex-shrink-0">
                  <d.icon className="w-5 h-5 text-emerald-light" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{d.title}</h3>
                  <p className="text-sm text-content-secondary leading-relaxed">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DATA SOURCES */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <p className="text-accent-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Our Data Sources</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">The same sources the Federal Reserve uses.</h2>
          <p className="text-content-secondary leading-relaxed mb-10">We pull from the same datasets that drive monetary policy, regulatory decisions, and institutional investment strategies.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {SOURCES.map((s) => (
              <div key={s.tag} className="card group hover:border-accent/20 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono font-bold text-accent-light">{s.tag}</span>
                  <span className="text-[10px] text-content-disabled">{s.full}</span>
                </div>
                <p className="text-xs text-content-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT BY INVESTORS */}
      <section className="py-20 px-6 border-t border-white/[0.06] bg-surface-secondary/20">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">The Team</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-6">Built by investors, for investors.</h2>
          <div className="space-y-5 text-content-secondary leading-relaxed mb-10">
            <p>We&apos;ve been on both sides of the table &mdash; analyzing deals inside institutional funds and trying to replicate that rigor with consumer tools. The consumer tools always fall short.</p>
            <p>Xuan exists because we got tired of the gap. We built the platform we wished existed when we were making our own investment decisions with incomplete data and borrowed spreadsheets.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent-light" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Founding Team</h3>
              <p className="text-xs text-content-secondary leading-relaxed">Background in real estate investment, quantitative finance, and product engineering. We&apos;ve collectively analyzed thousands of deals across residential, multifamily, and commercial assets.</p>
            </div>
            <div className="card">
              <div className="w-12 h-12 rounded-full bg-gold-muted flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-gold-light" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Our Commitment</h3>
              <p className="text-xs text-content-secondary leading-relaxed">Accuracy over engagement. We&apos;d rather show you a deal is bad than help you feel good about a bad decision. Every feature we ship is measured by one metric: did it help you make a better investment decision?</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-accent/[0.06] blur-[150px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight mb-4">See the difference for yourself.</h2>
          <p className="text-content-secondary text-lg mb-8">Analyze your first deal free. No credit card required.</p>
          <Link href="/signup" className="btn-primary btn-lg group">
            Get Started <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="text-gold-light text-xl font-serif">&#x7384;</span>
                <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
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
                <ul className="space-y-2">{c.l.map(([n, h]) => <li key={n}><Link href={h} className="text-sm text-content-secondary hover:text-white transition-colors">{n}</Link></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 Xuan Intelligence, Inc.</span>
            <span className="text-xs text-content-disabled">Data: FRED &middot; Census &middot; BLS &middot; ATTOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
