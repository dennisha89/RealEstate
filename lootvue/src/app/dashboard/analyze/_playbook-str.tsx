"use client";

import { useMemo } from "react";
import {
  Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Shield,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "motion/react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";
import {
  NegotiationIntelligence, DueDiligenceChecklist, SensitivityHeatmap,
  RedGreenFlags, FinancingMatrix, OfferToCloseTimeline, SimilarDeals,
} from "./_playbook-shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaybookProps {
  address?: string;
  result?: AnalysisResult | null;
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const STR_STEPS = [
  "Find Property",
  "Revenue Model",
  "Expense Budget",
  "Regulation Check",
  "Decide",
];

function StepBar({ steps, currentStep = 4 }: { steps: string[]; currentStep?: number }) {
  return (
    <div className="flex items-center gap-0" role="list" aria-label="Workflow steps">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0" role="listitem">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all",
                  done
                    ? "bg-emerald/20 border-emerald/40 text-emerald"
                    : active
                    ? "bg-gold/20 border-gold/50 text-gold"
                    : "bg-surface-elevated border-surface-border text-content-disabled",
                ].join(" ")}
                aria-label={`Step ${i + 1}: ${step}${done ? " (complete)" : active ? " (current)" : ""}`}
              >
                {done ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
              </div>
              <span
                className={[
                  "text-[9px] font-medium mt-1 text-center leading-tight hidden sm:block max-w-[72px]",
                  active ? "text-gold" : done ? "text-emerald" : "text-content-disabled",
                ].join(" ")}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "h-px flex-1 mx-1 transition-all",
                  done ? "bg-emerald/40" : "bg-surface-border",
                ].join(" ")}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Seeded sample data ───────────────────────────────────────────────────────

function seedFrom(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface STRData {
  purchasePrice: number;
  beds: number;
  baths: number;
  address: string;
  adr: number;
  occupancy: number;
  grossRevenue: number;
  airbnbFee: number;
  vrboFee: number;
  netAirbnb: number;
  netVrbo: number;
  monthlyMortgage: number;
  monthlyExpenses: number;
  ltrRent: number;
  ltrCashFlow: number;
  strCashFlow: number;
  score: number;
  verdict: "BUY" | "PASS";
  seasonalRevenue: { month: string; revenue: number; season: "high" | "shoulder" | "low" }[];
}

function buildSTRData(address: string): STRData {
  const seed = seedFrom(address || "sample");
  const rng = (min: number, max: number, offset = 0) => {
    const x = Math.sin(seed + min + max + offset) * 10000;
    return min + ((x - Math.floor(x)) * (max - min));
  };

  const purchasePrice = Math.round(rng(280000, 520000) / 1000) * 1000;
  const beds = Math.round(rng(2, 4));
  const baths = Math.round(rng(1, 3));

  const adr = Math.round(rng(120, 280) / 5) * 5;
  const annualOccupancy = rng(0.62, 0.78);
  const grossRevenue = Math.round(adr * annualOccupancy * 365);
  const airbnbFeeRate = 0.155;
  const vrboFeeRate = 0.08;
  const netAirbnb = Math.round(grossRevenue * (1 - airbnbFeeRate));
  const netVrbo = Math.round(grossRevenue * (1 - vrboFeeRate));

  const monthlyMortgage = Math.round(purchasePrice * 0.8 * (0.07 / 12) / (1 - Math.pow(1 + 0.07 / 12, -360)));
  const monthlyExpenses = Math.round(netAirbnb / 12 * 0.30); // cleaning, supplies, mgmt, insurance
  const strCashFlow = Math.round(netAirbnb / 12 - monthlyMortgage - monthlyExpenses);

  const ltrRent = Math.round(rng(1400, 2600) / 50) * 50;
  const ltrExpenses = Math.round(ltrRent * 0.38);
  const ltrCashFlow = ltrRent - monthlyMortgage - ltrExpenses;

  const score = Math.min(92, Math.max(38, Math.round(strCashFlow / 50 + 60)));

  // Monthly seasonality (seeded)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const seasonMultipliers = [0.55, 0.58, 0.72, 0.78, 0.88, 0.92, 0.98, 1.0, 0.82, 0.74, 0.65, 0.60];
  const seasonLabels: ("low" | "shoulder" | "high")[] = [
    "low", "low", "shoulder", "shoulder", "high", "high",
    "high", "high", "shoulder", "shoulder", "low", "low",
  ];
  const seasonalRevenue = months.map((month, i) => ({
    month,
    revenue: Math.round((grossRevenue / 12) * seasonMultipliers[i]!),
    season: seasonLabels[i]!,
  }));

  return {
    purchasePrice, beds, baths, address: address || "5901 Bergamo Way, Austin TX",
    adr, occupancy: Math.round(annualOccupancy * 100),
    grossRevenue, airbnbFee: Math.round(grossRevenue * airbnbFeeRate),
    vrboFee: Math.round(grossRevenue * vrboFeeRate), netAirbnb, netVrbo,
    monthlyMortgage, monthlyExpenses, ltrRent, ltrCashFlow, strCashFlow,
    score, verdict: score >= 60 ? "BUY" : "PASS", seasonalRevenue,
  };
}

// ─── Revenue Model ────────────────────────────────────────────────────────────

function RevenueModel({ d }: { d: STRData }) {
  const revpar = Math.round(d.adr * (d.occupancy / 100));

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Revenue Model
      </h3>

      {/* ADR + Occupancy headline */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-secondary rounded-xl p-3 text-center border border-surface-border space-y-1">
          <p className="metric-label"><Term id="adr">ADR</Term></p>
          <p className="text-xl font-bold font-mono tabular-nums text-gold" aria-label={`Average daily rate: ${formatCurrency(d.adr)} per night`}>
            {formatCurrency(d.adr)}/nt
          </p>
          <p className="text-[10px] text-content-disabled">Based on area comps</p>
        </div>
        <div className="bg-surface-secondary rounded-xl p-3 text-center border border-surface-border space-y-1">
          <p className="metric-label"><Term id="vacancy">Occupancy</Term></p>
          <p className="text-xl font-bold font-mono tabular-nums text-content-primary" aria-label={`Occupancy rate: ${d.occupancy}%`}>
            {d.occupancy}%
          </p>
          <p className="text-[10px] text-content-disabled">High 85% / Low 55%</p>
        </div>
        <div className="bg-surface-secondary rounded-xl p-3 text-center border border-surface-border space-y-1">
          <p className="metric-label"><Term id="revpar">RevPAR</Term></p>
          <p className="text-xl font-bold font-mono tabular-nums text-content-primary" aria-label={`Revenue per available room: ${formatCurrency(revpar)} per night`}>
            {formatCurrency(revpar)}/nt
          </p>
          <p className="text-[10px] text-content-disabled">ADR x Occupancy</p>
        </div>
      </div>

      {/* Revenue waterfall */}
      <div className="space-y-2 font-mono text-[13px]">
        {[
          { label: "Gross Annual Revenue", value: formatCurrency(d.grossRevenue), color: "text-emerald-light", bold: false },
          { label: `Airbnb Platform Fee (15.5%)`, value: `(${formatCurrency(d.airbnbFee)})`, color: "text-rose-light", bold: false },
          { label: "Net After Airbnb Fees", value: formatCurrency(d.netAirbnb), color: "text-emerald-light", bold: true },
          { label: "vs VRBO (8% fee instead)", value: formatCurrency(d.netVrbo), color: "text-amber-light", bold: false },
        ].map((row) => (
          <div key={row.label} className={`flex justify-between items-center gap-2 ${row.bold ? "pt-2 border-t border-surface-border font-semibold" : ""}`}>
            <span className="text-content-tertiary font-sans text-[13px]">{row.label}</span>
            <span className={`${row.color} tabular-nums`} aria-label={`${row.label}: ${row.value}`}>{row.value}</span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
        At <strong className="text-gold font-mono">{formatCurrency(d.adr)}/night</strong> and{" "}
        <strong className="text-content-primary">{d.occupancy}% occupancy</strong>, gross revenue is{" "}
        <strong className="font-mono text-content-primary">{formatCurrency(d.grossRevenue)}/yr</strong>.
        After Airbnb fees, net is{" "}
        <strong className="font-mono text-emerald-light">{formatCurrency(d.netAirbnb)}/yr</strong> — or{" "}
        <strong className="font-mono text-amber-light">{formatCurrency(d.netVrbo)}/yr</strong> on VRBO.
        Listing on both platforms is standard practice.
      </p>
    </div>
  );
}

// ─── STR vs LTR Comparison ────────────────────────────────────────────────────

function STRvsLTR({ d }: { d: STRData }) {
  const strNetMonthly = d.netAirbnb / 12;
  const ltrNetMonthly = d.ltrRent;
  const uplift = ((strNetMonthly / ltrNetMonthly - 1) * 100).toFixed(0);

  return (
    <div className="card space-y-4">
      <h3 className="section-label">STR vs LTR — Head to Head</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* STR column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-gold">Short-Term Rental</span>
          </div>
          <div className="space-y-1.5 font-mono text-[12px]">
            {[
              { label: "Gross Revenue", value: formatCurrency(d.grossRevenue) + "/yr", color: "text-emerald-light" },
              { label: "Platform Fees", value: `(${formatCurrency(d.airbnbFee)})/yr`, color: "text-rose-light" },
              { label: "Net Revenue", value: formatCurrency(d.netAirbnb) + "/yr", color: "text-emerald-light" },
              { label: "Monthly Net CF", value: formatCurrency(d.strCashFlow) + "/mo", color: d.strCashFlow >= 0 ? "text-emerald-light" : "text-rose-light" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <span className="text-content-disabled font-sans">{row.label}</span>
                <span className={row.color + " tabular-nums"}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-[11px] text-content-disabled">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber mt-0.5 shrink-0" aria-hidden="true" />
              <span>Furnishing cost: $15,000-25,000</span>
            </div>
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber mt-0.5 shrink-0" aria-hidden="true" />
              <span>Active management required</span>
            </div>
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber mt-0.5 shrink-0" aria-hidden="true" />
              <span>Regulation risk in many cities</span>
            </div>
          </div>
        </div>

        {/* LTR column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-content-secondary">Long-Term Rental</span>
          </div>
          <div className="space-y-1.5 font-mono text-[12px]">
            {[
              { label: "Monthly Rent", value: formatCurrency(d.ltrRent) + "/mo", color: "text-content-primary" },
              { label: "Annual Gross", value: formatCurrency(d.ltrRent * 12) + "/yr", color: "text-content-primary" },
              { label: "Net after Expenses", value: formatCurrency((d.ltrRent - Math.round(d.ltrRent * 0.38)) * 12) + "/yr", color: "text-content-secondary" },
              { label: "Monthly Net CF", value: formatCurrency(d.ltrCashFlow) + "/mo", color: d.ltrCashFlow >= 0 ? "text-emerald-light" : "text-rose-light" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <span className="text-content-disabled font-sans">{row.label}</span>
                <span className={row.color + " tabular-nums"}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-[11px] text-content-disabled">
            <div className="flex items-start gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald mt-0.5 shrink-0" aria-hidden="true" />
              <span>Predictable income</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald mt-0.5 shrink-0" aria-hidden="true" />
              <span>Low management effort</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald mt-0.5 shrink-0" aria-hidden="true" />
              <span>No regulation risk</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
        STR earns{" "}
        <strong className="text-gold font-mono">{uplift}% more</strong> than LTR but requires furnishing
        ($15,000-25,000), active management, and carries regulation risk. If regulations tighten, this property
        converts to LTR at{" "}
        <strong className="font-mono text-content-primary">{formatCurrency(d.ltrRent)}/mo</strong> —{" "}
        {d.ltrCashFlow >= 0 ? "still positive cash flow" : "negative cash flow — factor in as downside risk"}.
      </p>
    </div>
  );
}

// ─── Startup Costs ────────────────────────────────────────────────────────────

function StartupCosts({ d }: { d: STRData }) {
  const items = [
    { name: "Bedroom (bed, linens x2, furniture)", lo: 2500, hi: 4500 },
    { name: "Kitchen (cookware, appliances, utensils)", lo: 1200, hi: 2400 },
    { name: "Bathroom (towels, accessories x2)", lo: 400, hi: 800 },
    { name: "Living room (sofa, TV, decor)", lo: 3000, hi: 5500 },
    { name: "Outdoor / patio (if applicable)", lo: 800, hi: 2500 },
    { name: "Professional photography", lo: 300, hi: 600 },
    { name: "Smart locks + security setup", lo: 400, hi: 800 },
    { name: "Buffer for surprises (10%)", lo: 860, hi: 1710 },
  ];

  const totalLo = items.reduce((s, i) => s + i.lo, 0);
  const totalHi = items.reduce((s, i) => s + i.hi, 0);
  const midpoint = Math.round((totalLo + totalHi) / 2);
  const breakEvenMonths = (d.strCashFlow > 0 ? Math.ceil(midpoint / d.strCashFlow) : null);

  return (
    <div className="card space-y-4">
      <h3 className="section-label">Startup Costs — Furnishing Budget</h3>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="text-content-secondary flex-1">{item.name}</span>
            <span className="font-mono tabular-nums text-content-primary shrink-0">
              {formatCurrency(item.lo)}&ndash;{formatCurrency(item.hi)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 text-[13px] pt-2 border-t border-surface-border font-bold">
          <span className="text-content-primary">Total Furnishing Budget</span>
          <span className="font-mono tabular-nums text-gold">
            {formatCurrency(totalLo)}&ndash;{formatCurrency(totalHi)}
          </span>
        </div>
      </div>

      {breakEvenMonths !== null && (
        <p className="text-[12px] text-content-secondary leading-relaxed bg-surface-elevated rounded-lg p-3 border border-surface-border">
          At{" "}
          <strong className="font-mono text-emerald-light">{formatCurrency(d.strCashFlow)}/mo</strong> net cash flow,
          furnishing cost of{" "}
          <strong className="font-mono text-content-primary">~{formatCurrency(midpoint)}</strong> pays back in{" "}
          <strong className="text-gold">{breakEvenMonths} months</strong>. After that, pure profit.
        </p>
      )}

      <p className="text-[11px] text-content-disabled">
        Pro tip: Buy staging-quality used furniture on Facebook Marketplace — save 30-50% vs retail.
        Photo quality determines 40% of booking rate; always hire a professional.
      </p>
    </div>
  );
}

// ─── Seasonality Chart ────────────────────────────────────────────────────────

function SeasonalityChart({ d }: { d: STRData }) {
  const seasonColor: Record<string, string> = {
    high: CHART_COLORS.emerald,
    shoulder: CHART_COLORS.amber,
    low: CHART_COLORS.rose,
  };

  const lowMonths = d.seasonalRevenue.filter((m) => m.season === "low").map((m) => m.month).join(", ");
  const loRevenue = Math.min(...d.seasonalRevenue.map((m) => m.revenue));
  const hiRevenue = Math.max(...d.seasonalRevenue.map((m) => m.revenue));

  return (
    <div className="card space-y-4">
      <h3 className="section-label flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Seasonality — Monthly Revenue Forecast
      </h3>

      <div className="h-52" aria-label="Monthly revenue seasonality bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d.seasonalRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="month" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} />
            <YAxis
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              width={40}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatCurrency(v), "Monthly Revenue"]}
              labelStyle={{ color: CHART_COLORS.text, fontSize: 10 }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
              {d.seasonalRevenue.map((entry, i) => (
                <Cell key={i} fill={seasonColor[entry.season]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        {(["high", "shoulder", "low"] as const).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: seasonColor[s] }} aria-hidden="true" />
            <span className="capitalize text-content-secondary">{s} season</span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-content-secondary leading-relaxed">
        <strong className="text-content-primary">{lowMonths}</strong> are your weakest months.
        Budget for{" "}
        <strong className="font-mono text-rose-light">{formatCurrency(loRevenue)}&ndash;{formatCurrency(loRevenue * 1.2)}/mo</strong> during off-season.
        Peak months generate{" "}
        <strong className="font-mono text-emerald-light">up to {formatCurrency(hiRevenue)}/mo</strong> — that surplus
        funds off-season shortfalls.
      </p>
    </div>
  );
}

// ─── Regulation Check ─────────────────────────────────────────────────────────

function RegulationCheck({ d }: { d: STRData }) {
  const city = d.address.split(",")[1]?.trim().split(" ")[0] || "this city";

  const regulations = [
    {
      icon: <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />,
      label: "STR Permit Required",
      detail: `Most cities require a short-term rental license. Processing time: 30-90 days. Annual renewal typically $200-600.`,
      status: "required",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-amber" aria-hidden="true" />,
      label: "HOA Restrictions",
      detail: "Check CC&Rs before closing. Many HOAs prohibit rentals under 30 days — no exceptions after purchase.",
      status: "check",
    },
    {
      icon: <Shield className="w-4 h-4 text-content-tertiary" aria-hidden="true" />,
      label: "Zoning Compliance",
      detail: "Residential zones SR-1 and SR-2 typically allow STR with permit. Commercial zones have different rules.",
      status: "verify",
    },
    {
      icon: d.ltrCashFlow >= 0
        ? <CheckCircle className="w-4 h-4 text-emerald" aria-hidden="true" />
        : <XCircle className="w-4 h-4 text-rose-light" aria-hidden="true" />,
      label: "Fallback Plan",
      detail: `If regulations change, this property converts to LTR at ${formatCurrency(d.ltrRent)}/mo — ${d.ltrCashFlow >= 0 ? "still positive cash flow of " + formatCurrency(d.ltrCashFlow) + "/mo" : "negative at " + formatCurrency(d.ltrCashFlow) + "/mo, which is the risk you carry"}.`,
      status: d.ltrCashFlow >= 0 ? "safe" : "risk",
    },
  ];

  const badgeClass = (s: string) => {
    switch (s) {
      case "required": return "badge-amber";
      case "check": return "badge-amber";
      case "safe": return "badge-emerald";
      case "risk": return "badge-rose";
      default: return "badge-gold";
    }
  };

  return (
    <div className="card space-y-3">
      <h3 className="section-label flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
        Regulation Risk — {city}
      </h3>

      <div className="space-y-3">
        {regulations.map((reg) => (
          <div
            key={reg.label}
            className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary border border-surface-border"
          >
            <div className="shrink-0 mt-0.5">{reg.icon}</div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-content-primary">{reg.label}</p>
                <span className={badgeClass(reg.status)}>{reg.status.toUpperCase()}</span>
              </div>
              <p className="text-[12px] text-content-secondary leading-relaxed">{reg.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-content-disabled">
        Always verify local ordinances with the city clerk before closing. Regulations change annually.
        Nashville, Austin, and Denver have active enforcement. Airbnb&apos;s compliance portal lists city requirements.
      </p>
    </div>
  );
}

// ─── Verdict Banner ───────────────────────────────────────────────────────────

function VerdictBanner({ d }: { d: STRData }) {
  const isBuy = d.verdict === "BUY";
  const isDig = d.score >= 55 && d.score < 75;
  const label = isBuy ? "BUY" : isDig ? "DIG DEEPER" : "PASS";
  const labelColor = isBuy ? "text-emerald-light" : isDig ? "text-amber-light" : "text-rose-light";
  const borderClass = isBuy ? "border-emerald/20 bg-emerald/5" : isDig ? "border-amber/20 bg-amber/5" : "border-rose/20 bg-rose/5";
  const strMonthly = formatCurrency(d.netAirbnb / 12);

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${borderClass}`}>
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-bold font-display tracking-tight ${labelColor}`} aria-label={`Strategy verdict: ${label}`}>
          {label}
        </div>
        <div className="flex-1">
          <p className="text-[12px] text-content-secondary leading-relaxed">
            STR gross of{" "}
            <span className="font-mono font-semibold text-gold">{formatCurrency(d.grossRevenue)}/yr</span> at{" "}
            <span className="font-mono text-content-primary">{d.occupancy}% occupancy</span> and{" "}
            <span className="font-mono text-content-primary">{formatCurrency(d.adr)}/night</span>.
            Net cash flow of{" "}
            <span className={`font-mono font-semibold ${d.strCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
              {formatCurrency(d.strCashFlow)}/mo
            </span>{" "}
            after mortgage and operating costs.{" "}
            {d.strCashFlow > d.ltrCashFlow
              ? `STR outperforms LTR by ${formatCurrency(d.strCashFlow - d.ltrCashFlow)}/mo.`
              : `LTR actually beats STR by ${formatCurrency(d.ltrCashFlow - d.strCashFlow)}/mo on this deal — consider simplicity.`}{" "}
            <span className={`font-semibold ${labelColor}`}>{label} for Short-Term Rental strategy.</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="metric-label mb-0.5">Score</p>
          <p className={`text-2xl font-bold font-mono tabular-nums ${labelColor}`} aria-label={`Score: ${d.score} out of 100`}>
            {d.score}
          </p>
          <p className="text-[10px] text-content-disabled">/100</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border/50">
        {[
          { label: "STR > LTR", ok: d.strCashFlow > d.ltrCashFlow },
          { label: "Positive CF", ok: d.strCashFlow >= 0 },
          { label: "LTR Fallback", ok: d.ltrCashFlow >= 0 },
        ].map((check) => (
          <div key={check.label} className="flex items-center gap-1.5 text-[11px]">
            {check.ok
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald shrink-0" aria-hidden="true" />
              : <XCircle className="w-3.5 h-3.5 text-rose-light shrink-0" aria-hidden="true" />}
            <span className={check.ok ? "text-emerald" : "text-rose-light"}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Playbook Export ─────────────────────────────────────────────────────

export function STRPlaybook({ address, result }: PlaybookProps) {
  const d = useMemo(() => buildSTRData(address || result?.address || "5901 Bergamo Way, Austin TX"), [address, result]);

  // Build a minimal AnalysisResult-compatible object for shared components
  const resultForShared: AnalysisResult = {
    address: d.address,
    beds: d.beds,
    baths: d.baths,
    sqft: 1200,
    yearBuilt: 2005,
    purchasePrice: d.purchasePrice,
    estimatedValue: d.purchasePrice,
    monthlyRent: d.netAirbnb / 12,
    score: d.score,
    verdict: d.verdict,
    confidence: 72,
    narrative: "",
    nextSteps: [],
    capRate: ((d.netAirbnb - d.monthlyExpenses * 12) / d.purchasePrice) * 100,
    monthlyCashFlow: d.strCashFlow,
    dscr: (d.netAirbnb - d.monthlyExpenses * 12) / (d.monthlyMortgage * 12),
    cashOnCash: (d.strCashFlow * 12) / (d.purchasePrice * 0.23) * 100,
    monthlyMortgage: d.monthlyMortgage,
    monthlyExpenses: d.monthlyExpenses,
    institutional: {} as never,
    stress: {} as never,
  };

  const annualNOI = d.netAirbnb - d.monthlyExpenses * 12;

  const sections = [
    { delay: 0, component: <RevenueModel d={d} /> },
    { delay: 0.07, component: <STRvsLTR d={d} /> },
    { delay: 0.12, component: <StartupCosts d={d} /> },
    { delay: 0.17, component: <SeasonalityChart d={d} /> },
    { delay: 0.22, component: <RegulationCheck d={d} /> },
    { delay: 0.27, component: <VerdictBanner d={d} /> },
    { delay: 0.32, component: <NegotiationIntelligence dom={18} avgDomArea={22} listPrice={d.purchasePrice} priceDrops={0} /> },
    { delay: 0.35, component: <RedGreenFlags result={resultForShared} /> },
    { delay: 0.38, component: <SensitivityHeatmap price={d.purchasePrice} rent={Math.round(d.netAirbnb / 12)} rate={7.0} downPct={20} /> },
    { delay: 0.41, component: <FinancingMatrix price={d.purchasePrice} rent={Math.round(d.netAirbnb / 12)} noi={annualNOI} /> },
    { delay: 0.44, component: <DueDiligenceChecklist strategy="STR" /> },
    { delay: 0.47, component: <OfferToCloseTimeline strategy="STR" /> },
    { delay: 0.50, component: <SimilarDeals address={d.address} price={d.purchasePrice} strategy="STR" /> },
  ];

  return (
    <div className="space-y-5">
      <Section delay={0}>
        <StepBar steps={STR_STEPS} currentStep={4} />
      </Section>
      {sections.map(({ delay, component }, i) => (
        <Section key={i} delay={delay}>
          {component}
        </Section>
      ))}
    </div>
  );
}
