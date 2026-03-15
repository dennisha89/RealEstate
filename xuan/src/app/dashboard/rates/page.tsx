"use client";

import { useState } from "react";
import {
  ArrowDown, ArrowUp, Minus, TrendingDown, Bell, CheckCircle, Home, RefreshCw,
  Wallet, Tag, Info, ChevronRight, ArrowRight,
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Dir = "down" | "up" | "flat";
type Signal = "favorable" | "neutral" | "unfavorable";
type Rate = { label: string; rate: number; change: number; dir: Dir; sparkline: number[] };
type Condition = { text: string; signal: Signal };
type Scenario = { title: string; icon: typeof Home; action: string; actionColor: string; lines: string[] };
type Spread = { title: string; current: number; baseline: number; baselineLabel: string; interpretation: string; signal: Signal };

// ─── MOCK DATA (March 2026) ─────────────────────────────────────────────────
const MORTGAGE_RATES: Rate[] = [
  { label: "30-Year Fixed",  rate: 6.95,  change: -0.03, dir: "down",  sparkline: [7.20,7.18,7.15,7.12,7.10,7.08,7.05,7.02,7.00,6.98,6.97,6.95] },
  { label: "15-Year Fixed",  rate: 6.38,  change: -0.02, dir: "down",  sparkline: [6.55,6.52,6.50,6.48,6.45,6.42,6.40,6.40,6.39,6.38,6.38,6.38] },
  { label: "5/1 ARM",        rate: 6.12,  change: 0,     dir: "flat",  sparkline: [6.30,6.28,6.25,6.20,6.18,6.15,6.14,6.13,6.12,6.12,6.12,6.12] },
  { label: "FHA 30-Year",    rate: 6.65,  change: -0.03, dir: "down",  sparkline: [6.90,6.88,6.85,6.82,6.80,6.78,6.75,6.72,6.70,6.68,6.67,6.65] },
  { label: "VA 30-Year",     rate: 6.45,  change: -0.03, dir: "down",  sparkline: [6.70,6.68,6.65,6.62,6.60,6.58,6.55,6.52,6.50,6.48,6.47,6.45] },
  { label: "DSCR Loan",      rate: 7.85,  change: 0,     dir: "flat",  sparkline: [8.10,8.05,8.00,7.95,7.92,7.90,7.88,7.88,7.86,7.85,7.85,7.85] },
  { label: "Hard Money",     rate: 11.50, change: 0,     dir: "flat",  sparkline: [12.0,12.0,11.8,11.8,11.5,11.5,11.5,11.5,11.5,11.5,11.5,11.5] },
  { label: "Commercial",     rate: 7.25,  change: 0.05,  dir: "up",    sparkline: [7.10,7.10,7.12,7.15,7.15,7.18,7.20,7.20,7.22,7.22,7.25,7.25] },
];

const MACRO_RATES: Rate[] = [
  { label: "Fed Funds",      rate: 4.75,  change: 0,     dir: "flat",  sparkline: [5.25,5.25,5.00,5.00,5.00,4.75,4.75,4.75,4.75,4.75,4.75,4.75] },
  { label: "CPI (YoY)",      rate: 3.10,  change: -0.10, dir: "down",  sparkline: [3.70,3.60,3.50,3.40,3.40,3.30,3.30,3.20,3.20,3.10,3.10,3.10] },
  { label: "10yr Treasury",  rate: 4.28,  change: -0.02, dir: "down",  sparkline: [4.50,4.48,4.45,4.42,4.40,4.38,4.35,4.32,4.30,4.30,4.28,4.28] },
  { label: "2yr Treasury",   rate: 4.15,  change: -0.01, dir: "down",  sparkline: [4.40,4.38,4.35,4.32,4.30,4.28,4.25,4.22,4.20,4.18,4.15,4.15] },
];

const CONDITIONS: Condition[] = [
  { text: "The Fed held rates steady at 4.75%. Markets price in 2 cuts over the next 12 months.", signal: "favorable" },
  { text: "Inflation at 3.1% \u2014 above the 2% target but declining. The Fed stays cautious.", signal: "neutral" },
  { text: "Yield curve is normal (10yr > 2yr by 13bps). Recession probability: LOW.", signal: "favorable" },
  { text: "Mortgage-to-Fed spread at 2.20% \u2014 NORMAL range. Banks are lending competitively.", signal: "neutral" },
];

const SCENARIOS: Scenario[] = [
  {
    title: "Buying a new property?",
    icon: Home,
    action: "LOCK RATE",
    actionColor: "badge-emerald",
    lines: [
      "Rate environment: FAVORABLE \u2014 rates stable with downward bias.",
      "Lock your rate within 30 days of closing.",
      "Don't float \u2014 the savings from waiting are minimal.",
    ],
  },
  {
    title: "Refinancing existing property?",
    icon: RefreshCw,
    action: "WAIT",
    actionColor: "badge-amber",
    lines: [
      "Current avg portfolio rate: 7.25% | Today's best: 6.95%",
      "Savings: $52/mo per $100K of loan. Break-even: 14 months.",
      "Rates likely to drop further. Set alert at 6.50% for optimal refi window.",
    ],
  },
  {
    title: "Holding and cash flowing?",
    icon: Wallet,
    action: "HOLD",
    actionColor: "badge-emerald",
    lines: [
      "Underwritten at 7.5% avg \u2014 current rates are BELOW that.",
      "Your deals are performing BETTER than projected.",
      "Hold position. Cash flow has upside from rate spread.",
    ],
  },
  {
    title: "Selling a property?",
    icon: Tag,
    action: "LIST NOW",
    actionColor: "badge-gold",
    lines: [
      "Lower rates = more qualified buyers = higher sale price.",
      "Rate trend: Stable with downward bias.",
      "List now \u2014 the buyer pool is expanding.",
    ],
  },
];

const SPREADS: Spread[] = [
  {
    title: "Mortgage vs Fed Funds Spread",
    current: 2.20,
    baseline: 1.70,
    baselineLabel: "Historical Avg",
    interpretation: "Banks are adding extra margin. Rates can drop WITHOUT a Fed cut.",
    signal: "neutral",
  },
  {
    title: "Cap Rate vs Mortgage Rate",
    current: -0.45,
    baseline: 0,
    baselineLabel: "Breakeven",
    interpretation: "Negative leverage. Deals only work with appreciation or below-market pricing.",
    signal: "unfavorable",
  },
  {
    title: "Yield Curve (10yr - 2yr)",
    current: 0.13,
    baseline: 0,
    baselineLabel: "Inversion Line",
    interpretation: "Normal curve = economy expected to grow. No recession signal.",
    signal: "favorable",
  },
];

const TIMELINE = [
  { label: "6 months ago",  value: "7.20%", note: "30yr was 25bps higher" },
  { label: "Today",         value: "6.95%", note: "Dropped 0.25% over 6 months" },
  { label: "6-month fwd",   value: "6.60\u20136.80%", note: "Market expects continued easing" },
  { label: "12-month fwd",  value: "6.25\u20136.50%", note: "2 Fed cuts priced in" },
];

const ALERTS = [
  { label: "30yr drops below", placeholder: "6.50", type: "number" as const },
  { label: "Yield curve inverts", placeholder: "", type: "toggle" as const },
  { label: "Before FOMC meetings", placeholder: "", type: "toggle" as const },
  { label: "Refi makes sense for portfolio", placeholder: "", type: "toggle" as const },
];

const PORTFOLIO_PROPERTIES = [
  { address: "1847 Oak Valley Dr", loan: 308_000, currentRate: 7.25 },
  { address: "920 Magnolia Ln",    loan: 249_600, currentRate: 7.50 },
  { address: "4501 Bay Shore Blvd", loan: 356_000, currentRate: 6.88 },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n: number, decimals = 2) => n.toFixed(decimals);
const fmtDollar = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function dirIcon(dir: Dir) {
  if (dir === "down") return <ArrowDown className="w-3 h-3" />;
  if (dir === "up")   return <ArrowUp className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function dirColor(dir: Dir) {
  if (dir === "down") return "text-emerald-light";
  if (dir === "up")   return "text-rose-light";
  return "text-content-tertiary";
}

function signalDot(s: Signal) {
  if (s === "favorable")   return "bg-emerald";
  if (s === "unfavorable") return "bg-rose";
  return "bg-amber";
}

function monthlyPayment(principal: number, annualRate: number, years = 30): number {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / (years * 12);
  return principal * (r * Math.pow(1 + r, years * 12)) / (Math.pow(1 + r, years * 12) - 1);
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 20;
  const w = 48;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export default function RatesPage() {
  const [simRate, setSimRate] = useState(6.95);
  const [alertValues, setAlertValues] = useState<Record<number, string>>({});
  const [alertToggles, setAlertToggles] = useState<Record<number, boolean>>({});

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── SECTION 1: Rate Dashboard ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              Today&apos;s Rates
            </div>
            <h1 className="text-lg font-semibold text-content-primary mt-1">Rate Environment</h1>
          </div>
          <span className="text-xs text-content-tertiary font-mono">{today}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MORTGAGE_RATES.map((r) => (
            <div key={r.label} className="card-glass !p-3">
              <div className="text-[11px] text-content-tertiary font-medium truncate">{r.label}</div>
              <div className="flex items-end justify-between mt-1">
                <span className="font-mono text-lg font-bold text-content-primary tabular-nums">{fmt(r.rate)}%</span>
                <Sparkline data={r.sparkline} color={r.dir === "down" ? "#34D399" : r.dir === "up" ? "#F87171" : "#5C6478"} />
              </div>
              <div className={`flex items-center gap-1 mt-1 font-mono text-xs ${dirColor(r.dir)}`}>
                {dirIcon(r.dir)}
                <span>{r.change === 0 ? "0.00" : (r.change > 0 ? "+" : "") + fmt(r.change)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Macro drivers */}
        <div className="mt-3 card-glass !p-3">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium">Driving Forces</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MACRO_RATES.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-content-tertiary">{r.label}</div>
                  <div className="font-mono text-sm font-semibold text-content-primary tabular-nums">{fmt(r.rate)}%</div>
                </div>
                <div className={`flex items-center gap-0.5 font-mono text-[11px] ${dirColor(r.dir)}`}>
                  {dirIcon(r.dir)}
                  {r.change !== 0 && <span>{(r.change > 0 ? "+" : "") + fmt(r.change)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Market Conditions ──────────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          What&apos;s Happening Right Now
        </div>
        <div className="space-y-2.5">
          {CONDITIONS.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${signalDot(c.signal)}`} />
              <p className="text-[13px] text-content-secondary leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: Decision Matrix ────────────────────────────────────── */}
      <section>
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          What This Means For You
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <div key={s.title} className="card group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4 text-content-tertiary" />
                  <span className="text-[13px] font-semibold text-content-primary">{s.title}</span>
                </div>
                <span className={s.actionColor}>{s.action}</span>
              </div>
              <div className="space-y-1.5">
                {s.lines.map((l, i) => (
                  <p key={i} className="text-xs text-content-secondary leading-relaxed flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-content-disabled" />
                    {l}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: Rate Impact Calculator ─────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Impact Calculator
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <label className="text-[13px] text-content-secondary shrink-0">What if rates move to</label>
          <div className="flex items-center gap-3 flex-1">
            <input
              type="range"
              min={4.0}
              max={10.0}
              step={0.125}
              value={simRate}
              onChange={(e) => setSimRate(parseFloat(e.target.value))}
              className="flex-1 accent-gold h-1.5 bg-surface-muted rounded-full cursor-pointer"
            />
            <span className="font-mono text-lg font-bold text-gold-light tabular-nums w-[72px] text-right">{fmt(simRate)}%</span>
          </div>
        </div>

        {/* Standard scenarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { label: "$350K property, 20% down", principal: 280_000 },
            { label: "$500K property, 25% down", principal: 375_000 },
          ].map((s) => {
            const currentPmt = monthlyPayment(s.principal, 6.95);
            const newPmt = monthlyPayment(s.principal, simRate);
            const diff = newPmt - currentPmt;
            return (
              <div key={s.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[11px] text-content-tertiary mb-1">{s.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-content-primary">{fmtDollar(Math.round(newPmt))}/mo</span>
                  <span className={`font-mono text-xs ${diff > 0 ? "text-rose-light" : diff < 0 ? "text-emerald-light" : "text-content-tertiary"}`}>
                    {diff > 0 ? "+" : ""}{fmtDollar(Math.round(diff))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Portfolio impact */}
        <div className="text-[11px] text-content-disabled uppercase tracking-[0.1em] mb-2 font-medium">Your Portfolio Impact</div>
        <div className="space-y-2">
          {PORTFOLIO_PROPERTIES.map((p) => {
            const currentPmt = monthlyPayment(p.loan, p.currentRate);
            const newPmt = monthlyPayment(p.loan, simRate);
            const diff = newPmt - currentPmt;
            return (
              <div key={p.address} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <div>
                  <span className="text-[13px] text-content-primary">{p.address}</span>
                  <span className="text-xs text-content-disabled ml-2 font-mono">{fmt(p.currentRate)}% now</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-content-secondary">{fmtDollar(Math.round(currentPmt))}</span>
                  <ArrowRight className="w-3 h-3 text-content-disabled" />
                  <span className="font-mono text-xs font-semibold text-content-primary">{fmtDollar(Math.round(newPmt))}</span>
                  <span className={`font-mono text-[11px] ${diff > 0 ? "text-rose-light" : diff < 0 ? "text-emerald-light" : "text-content-tertiary"}`}>
                    {diff >= 0 ? "+" : ""}{fmtDollar(Math.round(diff))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-muted/50">
          <Info className="w-3.5 h-3.5 text-amber-light mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-light">Every 1% rate increase removes ~10% of qualified buyers from the market.</p>
        </div>
      </section>

      {/* ── SECTION 5: Rate Spreads ───────────────────────────────────────── */}
      <section>
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
          Rate Spreads &mdash; Hidden Signals
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPREADS.map((s) => {
            const barMax = Math.max(Math.abs(s.current), Math.abs(s.baseline), 3);
            const currentPct = Math.min(Math.abs(s.current) / barMax * 100, 100);
            const baselinePct = Math.min(Math.abs(s.baseline) / barMax * 100, 100);
            return (
              <div key={s.title} className="card">
                <div className="text-[13px] font-semibold text-content-primary mb-3">{s.title}</div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-lg font-bold text-content-primary tabular-nums">
                    {s.current >= 0 ? "+" : ""}{fmt(s.current)}%
                  </span>
                  <span className={`w-2 h-2 rounded-full ${signalDot(s.signal)}`} />
                </div>
                {/* Bar visualization */}
                <div className="space-y-1.5 mb-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-content-disabled mb-0.5">
                      <span>Current</span>
                      <span>{fmt(s.current)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.signal === "favorable" ? "bg-emerald" : s.signal === "unfavorable" ? "bg-rose" : "bg-amber"}`}
                        style={{ width: `${currentPct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-content-disabled mb-0.5">
                      <span>{s.baselineLabel}</span>
                      <span>{fmt(s.baseline)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full rounded-full bg-content-disabled" style={{ width: `${baselinePct}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-content-tertiary leading-relaxed">{s.interpretation}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 6: Rate Forecast Timeline ─────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Forecast &amp; Timeline
        </div>
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-border" />
          {TIMELINE.map((t, i) => {
            const isToday = i === 1;
            return (
              <div key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">
                <div className={`absolute left-[-17px] top-1.5 w-3 h-3 rounded-full border-2 ${
                  isToday ? "bg-gold border-gold-light" : "bg-surface-card border-surface-border"
                }`} />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[12px] font-medium ${isToday ? "text-gold-light" : "text-content-secondary"}`}>{t.label}</span>
                    <span className="font-mono text-sm font-bold text-content-primary tabular-nums">{t.value}</span>
                  </div>
                  <p className="text-[11px] text-content-tertiary mt-0.5">{t.note}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-gold-muted/50 flex items-start gap-2">
          <TrendingDown className="w-4 h-4 text-gold-light mt-0.5 shrink-0" />
          <div>
            <div className="text-[12px] font-medium text-gold-light">The Goldman Lag</div>
            <p className="text-[11px] text-content-secondary mt-0.5">
              Price impact of recent rate drops: ~20% transmitted. The remaining 80% feeds into home prices over the next 24 months.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: Rate Alerts ────────────────────────────────────────── */}
      <section className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Rate Alerts
        </div>
        <div className="space-y-3">
          {ALERTS.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Bell className="w-3.5 h-3.5 text-content-tertiary shrink-0" />
                <span className="text-[13px] text-content-secondary truncate">{a.label}</span>
              </div>
              {a.type === "number" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={a.placeholder}
                    value={alertValues[i] ?? ""}
                    onChange={(e) => setAlertValues((p) => ({ ...p, [i]: e.target.value }))}
                    className="input !w-20 !py-1.5 !text-xs font-mono text-right"
                  />
                  <span className="text-xs text-content-disabled">%</span>
                </div>
              ) : (
                <button
                  onClick={() => setAlertToggles((p) => ({ ...p, [i]: !p[i] }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${alertToggles[i] ? "bg-gold" : "bg-surface-muted"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${alertToggles[i] ? "left-[18px]" : "left-0.5"}`} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="btn-primary btn-sm mt-4 w-full sm:w-auto">
          <CheckCircle className="w-3.5 h-3.5" />
          Save Alerts
        </button>
      </section>
    </div>
  );
}
