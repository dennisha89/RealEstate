"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Shield, TrendingUp, Target, Clock, Eye, Building2,
  DollarSign, AlertTriangle, Lock, Check, X as XIcon,
  ChevronDown, ChevronUp, MapPin, Zap, Users, Star, Flame,
} from "lucide-react";

function AnimatedCounter({ end, prefix = "", suffix = "", duration = 2000 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

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

export default function LandingPage() {
  const [searchFocused, setSearchFocused] = useState(false);
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/80 border-b border-gold/[0.08]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
              <span className="text-black font-bold text-xs">LV</span>
            </div>
            <span className="font-display font-bold text-white tracking-[0.15em] text-sm">LOOTVUE</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-content-secondary hover:text-gold-light transition-colors hidden sm:block">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-gold/[0.05] blur-[180px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-emerald/[0.03] blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in mb-8">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-gold-light bg-gold-muted px-4 py-1.5 rounded-full border border-gold/20">
                <Flame className="w-3 h-3" /> Your broker hopes you never find this
              </span>
            </div>
            <h1 className="animate-fade-in font-display font-extrabold text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] leading-[1.04] tracking-tight mb-6">
              You&apos;re making <span className="text-gold-light">half-million dollar</span> decisions with <span className="text-rose-light">free tools</span>.
            </h1>
            <p className="animate-slide-up text-content-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
              Blackstone sees 50 data points before they bid. You see Zillow&apos;s guess and your gut feeling.
              That information gap costs the average investor <span className="text-rose-light font-mono font-semibold">$48,000 per deal</span>.
            </p>
            <p className="animate-slide-up text-content-tertiary text-base mb-10">LootVue closes that gap. Same depth. Fraction of the cost. 10 seconds.</p>
            <div className="max-w-xl mx-auto animate-slide-up">
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-300 bg-surface-card ${searchFocused ? "border-gold/40 shadow-glow-gold" : "border-white/[0.08] hover:border-gold/20"}`}>
                <MapPin className={`w-5 h-5 transition-colors ${searchFocused ? "text-gold" : "text-content-disabled"}`} />
                <input type="text" placeholder="Paste any US address — see what your broker won't show you" className="flex-1 bg-transparent text-base text-white placeholder:text-content-disabled outline-none" onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
                <Link href="/signup" className="btn-primary btn-sm whitespace-nowrap">Analyze <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
              <p className="text-content-disabled text-xs mt-3 flex items-center justify-center gap-3">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Free. No credit card.</span><span>·</span><span>Results in 10 seconds</span>
              </p>
            </div>
          </div>
          {/* Product preview */}
          <div className="max-w-4xl mx-auto mt-16 animate-slide-up">
            <div className="rounded-2xl border border-gold/[0.1] bg-surface-card overflow-hidden shadow-elevated">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-surface-secondary">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose/40" /><div className="w-3 h-3 rounded-full bg-amber/40" /><div className="w-3 h-3 rounded-full bg-emerald/40" /></div>
                <div className="flex-1 text-center text-[10px] text-content-disabled font-mono">lootvue.com/dashboard/analyze</div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div><div className="text-sm font-semibold text-white">1423 Cedar Ridge Dr, Austin TX 78701</div><div className="text-xs text-content-tertiary">3bd / 2ba / 1,650 sqft / Built 2008</div></div>
                  <div className="flex items-center gap-2"><span className="px-3 py-1 rounded-lg bg-emerald-muted text-emerald-light text-xs font-bold">BUY</span><span className="px-3 py-1 rounded-lg bg-gold-muted text-gold-light text-xs font-mono font-bold">87%</span></div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                  {[{l:"Price",v:"$285K",c:"text-white"},{l:"True Value",v:"$312K",c:"text-emerald-light"},{l:"Instant Equity",v:"+$27K",c:"text-gold-bright"},{l:"Cap Rate",v:"7.2%",c:"text-white"},{l:"Cash Flow",v:"+$470/mo",c:"text-emerald-light"},{l:"DSCR",v:"1.35x",c:"text-white"}].map(m=>(
                    <div key={m.l} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"><div className="text-[9px] text-content-disabled uppercase tracking-wider">{m.l}</div><div className={`text-sm font-mono font-bold mt-0.5 ${m.c}`}>{m.v}</div></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"><div className="text-[9px] text-content-disabled uppercase tracking-wider mb-2">Stress Test</div><div className="flex gap-1">{["Recession","Rate +2%","Vacancy","Insurance"].map(s=>(<span key={s} className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-muted text-emerald-light border border-emerald/10">✓</span>))}</div><div className="text-[10px] text-emerald-light mt-1">Survives all 4 scenarios</div></div>
                  <div className="p-3 rounded-lg bg-gold-muted/30 border border-gold/[0.1]"><div className="text-[9px] text-content-disabled uppercase tracking-wider mb-1">Verdict</div><div className="text-lg font-display font-bold text-gold-light">BUY — High Confidence</div><div className="text-[10px] text-content-tertiary mt-0.5">11 of 12 analytical forces aligned</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gold/[0.06] py-6 bg-surface-secondary">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{v:48000,p:"$",s:"",l:"avg saved per deal",c:"text-gold-light"},{v:10,p:"",s:"s",l:"full analysis time",c:"text-white"},{v:87,p:"",s:"%",l:"confidence on top deals",c:"text-emerald-light"},{v:12,p:"",s:"",l:"independent engines",c:"text-gold-light"}].map(m=>(
            <div key={m.l}><div className={`text-2xl md:text-3xl font-mono font-bold ${m.c}`}><AnimatedCounter end={m.v} prefix={m.p} suffix={m.s} /></div><div className="text-[10px] text-content-tertiary uppercase tracking-wider mt-1">{m.l}</div></div>
          ))}
        </div>
      </section>

      {/* THE ATTACK */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-16">
            <p className="text-rose-light text-xs font-semibold tracking-[0.12em] uppercase mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> The uncomfortable truth</p>
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">Your broker profits from what you don&apos;t know.</h2>
            <p className="text-content-secondary text-lg leading-relaxed">They see the comps you don&apos;t. They know the neighborhood trajectory you can&apos;t access. They pocket the difference between what you paid and what you should have paid. It&apos;s not personal. It&apos;s information asymmetry. And it&apos;s costing you six figures.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[{icon:DollarSign,stat:"$48K",label:"avg overpayment",title:"You overpaid. You just don't know it yet.",body:"The average investor overpays by 12%. On a $400K property — $48,000. Gone before your first rent check."},{icon:Clock,stat:"11 days",label:"avg deal window",title:"Good deals don't wait for spreadsheets.",body:"The best properties last 11 days. Your manual analysis takes 14 hours. Someone with better tools already closed."},{icon:Eye,stat:"1 of 12",label:"risks you test",title:"Your stress test is a fantasy.",body:"You tested what happens if vacancy rises 5%. But recessions send five problems at once. You tested 1 of 12 variables."}].map(p=>(
              <div key={p.title} className="card-bento group">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-rose-muted flex items-center justify-center"><p.icon className="w-6 h-6 text-rose-light" /></div>
                  <div className="text-right"><div className="text-2xl font-mono font-bold text-rose-light">{p.stat}</div><div className="text-[10px] text-content-disabled uppercase tracking-wider">{p.label}</div></div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE MOAT */}
      <section className="py-28 px-6 border-t border-gold/[0.06] relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-gold/[0.03] blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl mb-14">
            <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Why LootVue can&apos;t be copied</p>
            <h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">Not one algorithm.<br /><span className="text-gradient">A system that compounds.</span></h2>
            <p className="text-content-secondary text-lg leading-relaxed">Competitors can copy a feature. They can&apos;t copy 12 months of prediction accuracy. They can&apos;t copy thousands of investors&apos; aggregate behavior. They can&apos;t copy your portfolio history. The longer you use LootVue, the wider the moat — for you AND for us.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[{icon:Target,title:"See what the institutions see",desc:"Debt yield, yield-on-cost, IRR, exit cap sensitivity, replacement cost — the metrics Blackstone uses. In 10 seconds.",g:"group-hover:shadow-glow-gold"},{icon:Shield,title:"Stress test like it's 2008",desc:"Six correlated worst-case scenarios simultaneously. Recession + rate spike + insurance crisis + vacancy surge. Know your breaking point.",g:"group-hover:shadow-glow-emerald"},{icon:TrendingUp,title:"Rate intelligence that predicts",desc:"Fed funds, yield curve, mortgage spread, Goldman's 30-month lag — track how rate changes hit YOUR deals and YOUR portfolio months from now.",g:"group-hover:shadow-glow-gold"},{icon:Users,title:"See what other investors see",desc:"Anonymous crowd intelligence. Which markets heat up. Where smart money moves. Consensus targets. Data no API sells.",g:"group-hover:shadow-glow-emerald"}].map(f=>(
              <div key={f.title} className={`card-bento group transition-all duration-300 ${f.g}`}>
                <div className="w-12 h-12 rounded-xl bg-gold-muted flex items-center justify-center mb-4"><f.icon className="w-6 h-6 text-gold-light" /></div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-28 px-6 border-t border-gold/[0.06] bg-surface-secondary">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16"><h2 className="font-display text-3xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-4">Address to verdict. Under <span className="text-gradient">10 seconds.</span></h2></div>
          <div className="space-y-0">
            {[{n:"01",t:"Paste any address",d:"Type or paste. Analysis starts automatically.",icon:MapPin},{n:"02",t:"See everything your broker hides",d:"True value, cash flow, institutional metrics, stress tests, market trajectory — all at once.",icon:Eye},{n:"03",t:"Get a verdict you can trust",d:"Buy, hold, or avoid — with a confidence percentage, specific next steps, and every data point visible.",icon:Target}].map((s,i)=>(
              <div key={s.n} className="relative flex gap-6 pb-12 last:pb-0 group">
                {i<2&&<div className="absolute left-[23px] top-[56px] w-px h-[calc(100%-48px)] bg-gradient-to-b from-gold/30 to-transparent" />}
                <div className="relative z-10 w-12 h-12 rounded-xl bg-gold-muted border border-gold/20 flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-gold transition-shadow"><span className="text-sm font-mono font-bold text-gold-light">{s.n}</span></div>
                <div className="pt-1"><h3 className="text-base font-semibold text-white mb-1">{s.t}</h3><p className="text-sm text-content-secondary leading-relaxed">{s.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-28 px-6 border-t border-gold/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14"><h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Zillow is for buyers.<br /><span className="text-gradient">LootVue is for investors.</span></h2></div>
          <div className="rounded-xl border border-gold/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gold/[0.1]"><th className="text-left py-4 px-5 text-[11px] font-semibold text-content-tertiary uppercase tracking-wider">What you need to know</th><th className="text-center py-4 px-4"><span className="text-gold-light font-bold text-sm">LootVue</span></th><th className="text-center py-4 px-4 text-content-disabled text-xs">Zillow</th><th className="text-center py-4 px-4 text-content-disabled text-xs">DealCheck</th><th className="text-center py-4 px-4 text-content-disabled text-xs">Spreadsheet</th></tr></thead>
                <tbody>
                  {[{f:"Will this deal actually make money?",lv:true,z:false,d:"Partially",s:false},{f:"Is NOW the right time to buy?",lv:true,z:false,d:false,s:false},{f:"What happens in a recession?",lv:true,z:false,d:false,s:"Manual"},{f:"How do rates affect MY deal?",lv:true,z:false,d:false,s:false},{f:"What would Blackstone see?",lv:true,z:false,d:"Basic",s:"Manual"},{f:"When should I sell or refi?",lv:true,z:false,d:false,s:false},{f:"What are other investors seeing?",lv:true,z:false,d:false,s:false},{f:"How does this change my portfolio?",lv:true,z:false,d:false,s:false}].map((r,i)=>(
                    <tr key={r.f} className={`border-b border-white/[0.03] ${i%2===0?"bg-white/[0.01]":""}`}>
                      <td className="py-3.5 px-5 text-content-secondary text-xs">{r.f}</td>
                      <td className="py-3.5 px-4 text-center">{r.lv===true?<Check className="w-4 h-4 text-gold-light mx-auto" />:<span className="text-[11px] font-mono text-content-secondary">{String(r.lv)}</span>}</td>
                      <td className="py-3.5 px-4 text-center">{r.z===false?<XIcon className="w-4 h-4 text-content-disabled mx-auto" />:<span className="text-[11px] font-mono text-content-secondary">{String(r.z)}</span>}</td>
                      <td className="py-3.5 px-4 text-center">{r.d===false?<XIcon className="w-4 h-4 text-content-disabled mx-auto" />:<span className="text-[11px] font-mono text-content-secondary">{String(r.d)}</span>}</td>
                      <td className="py-3.5 px-4 text-center">{r.s===false?<XIcon className="w-4 h-4 text-content-disabled mx-auto" />:<span className="text-[11px] font-mono text-content-secondary">{String(r.s)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-28 px-6 border-t border-gold/[0.06] bg-surface-secondary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gold/[0.03] blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-14"><h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Real investors. Real money.</h2><p className="text-content-secondary text-lg">Not vanity metrics. Actual dollars found, saved, and earned.</p></div>
          <div className="grid md:grid-cols-3 gap-5">
            {[{name:"David K.",role:"12-unit portfolio, Austin TX",text:"Found a property listed at $285K that comped at $312K. LootVue showed me what my agent couldn't — the demographic momentum, the supply constraint, and why the cap rate was about to compress. Closed in 9 days.",metric:"$27K equity",stars:5},{name:"Sarah L.",role:"First-time investor, Raleigh NC",text:"I was paralyzed for 8 months. Every deal felt like a gamble. The guided workflow walked me through every risk, every number, every worst-case scenario. I made my first offer knowing exactly what I was getting into.",metric:"$380/mo CF",stars:5},{name:"Marcus T.",role:"PE analyst, 48-unit fund",text:"Debt yield, yield-on-cost, exit cap sensitivity — tools my firm pays $50K/year for elsewhere. I screen deals through LootVue before presenting to our investment committee. Saves 6 hours per deal.",metric:"6 hrs saved",stars:5}].map(t=>(
              <div key={t.name} className="card-bento">
                <div className="flex items-center justify-between mb-5"><div className="flex gap-0.5">{Array.from({length:t.stars}).map((_,i)=><Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />)}</div><span className="badge-emerald font-mono font-bold">{t.metric}</span></div>
                <p className="text-sm text-content-secondary leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="border-t border-white/[0.06] pt-4"><div className="text-sm font-semibold text-white">{t.name}</div><div className="text-xs text-content-tertiary">{t.role}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-28 px-6 border-t border-gold/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-8">Institutional intelligence.<br /><span className="text-gradient">Individual pricing.</span></h2>
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
            {[{name:"Bloomberg",price:"$24,000",per:"/year",h:false},{name:"CoStar",price:"$15,000",per:"/year",h:false},{name:"LootVue",price:"Free",per:"to start",h:true}].map(p=>(
              <div key={p.name} className={`p-5 rounded-xl border transition-all ${p.h?"border-gold/30 bg-gold-muted glow-gold":"border-white/[0.04] bg-white/[0.01]"}`}>
                <div className={`text-xs mb-2 ${p.h?"text-gold-light font-semibold":"text-content-disabled"}`}>{p.name}</div>
                <div className={`font-mono font-bold ${p.h?"text-gold-bright text-3xl":"text-content-disabled line-through text-sm"}`}>{p.price}</div>
                <div className="text-[10px] text-content-disabled mt-1">{p.per}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-content-tertiary">3 free analyses. Then $29/month for unlimited. The average insight saves 10-50x the subscription.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-28 px-6 border-t border-gold/[0.06] bg-surface-secondary">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white tracking-tight mb-10">Questions we get asked</h2>
          {[{q:"How is this different from Zillow?",a:"Zillow shows listings for BUYERS. LootVue tells INVESTORS which properties will make money — cash flow, stress tests, risk scoring, timing signals, portfolio impact. Different question, different tool."},{q:"Why should I trust this over my own analysis?",a:"You shouldn't trust it blindly. LootVue shows every data source, every calculation, every assumption. We track prediction accuracy over time. If we're wrong, you'll know."},{q:"What's the catch with the free tier?",a:"No catch. 3 analyses per month. If it doesn't save you 10x the subscription on your next deal, don't subscribe."},{q:"Do I need experience?",a:"No. The system explains every number and tells you what to do about it. First-time investors use the guided workflow. Experienced investors skip straight to analysis."}].map(f=><FAQ key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 border-t border-gold/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-gold/[0.06] blur-[180px]" /></div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-5">The next deal you analyze without this could cost you <span className="text-gradient">$48K.</span></h2>
          <p className="text-content-secondary text-lg leading-relaxed mb-10">Same data. Same depth. Same tools the institutions use. The only difference is who has access. Now you do.</p>
          <Link href="/signup" className="btn-primary btn-lg group text-base">Analyze Your First Deal Free <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></Link>
          <p className="text-content-disabled text-xs mt-5">No credit card. 90-second setup. Free forever tier.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gold/[0.08] py-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4"><div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center"><span className="text-black font-bold text-[10px]">LV</span></div><span className="font-display font-bold text-white tracking-[0.15em] text-sm">LOOTVUE</span></div>
              <p className="text-xs text-content-tertiary leading-relaxed">Real estate intelligence for investors who refuse to guess.</p>
            </div>
            {[{t:"Product",l:[{n:"Features",h:"#"},{n:"Pricing",h:"/pricing"}]},{t:"Company",l:[{n:"About",h:"/about"}]},{t:"Legal",l:[{n:"Privacy",h:"/privacy"},{n:"Terms",h:"/terms"},{n:"Disclaimer",h:"/disclaimer"}]}].map(c=>(
              <div key={c.t}><div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-4">{c.t}</div><ul className="space-y-2">{c.l.map(l=><li key={l.n}><Link href={l.h} className="text-sm text-content-secondary hover:text-gold-light transition-colors">{l.n}</Link></li>)}</ul></div>
            ))}
          </div>
          <div className="border-t border-gold/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 LootVue Inc.</span>
            <span className="text-xs text-content-disabled">Data: FRED · Census · BLS · ATTOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
