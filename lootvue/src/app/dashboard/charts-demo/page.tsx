"use client";

import dynamic from "next/dynamic";
import { SAMPLE_MARKET_DATA } from "@/components/charts/CapitalFlowMap";
import { SAMPLE_SIGNALS, SAMPLE_CONVERGENCE_CONTEXT } from "@/components/charts/SignalConvergenceChart";
import { SAMPLE_FACTORS } from "@/components/charts/FactorAttributionChart";
import { MONTE_CARLO_SAMPLE } from "@/components/charts/MonteCarloChart";
import { STRESS_TEST_SAMPLE } from "@/components/charts/StressTestChart";
import { Term } from "@/components/shared/Term";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell, ReferenceLine, PieChart, Pie,
} from "recharts";

// Lazy load heavy components
const CapitalFlowMap = dynamic(
  () => import("@/components/charts/CapitalFlowMap").then((m) => ({ default: m.CapitalFlowMap })),
  { ssr: false, loading: () => <div className="skeleton h-[400px] rounded-xl" /> }
);
const SignalConvergenceChart = dynamic(
  () => import("@/components/charts/SignalConvergenceChart").then((m) => ({ default: m.SignalConvergenceChart })),
  { ssr: false, loading: () => <div className="skeleton h-64 rounded-xl" /> }
);
const FactorAttributionChart = dynamic(
  () => import("@/components/charts/FactorAttributionChart").then((m) => ({ default: m.FactorAttributionChart })),
  { ssr: false, loading: () => <div className="skeleton h-64 rounded-xl" /> }
);
const MonteCarloChart = dynamic(
  () => import("@/components/charts/MonteCarloChart").then((m) => ({ default: m.MonteCarloChart })),
  { ssr: false, loading: () => <div className="skeleton h-80 rounded-xl" /> }
);
const StressTestChart = dynamic(
  () => import("@/components/charts/StressTestChart").then((m) => ({ default: m.StressTestChart })),
  { ssr: false, loading: () => <div className="skeleton h-72 rounded-xl" /> }
);

// ─── Sample Data for Recharts demos ──────────────────────────────────────────

const HPI_TREND = Array.from({ length: 24 }, (_, i) => ({
  month: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
  hpi: 280 + i * 3.5 + Math.sin(i * 0.8) * 8,
  p10: 260 + i * 2.0,
  p90: 300 + i * 5.0,
}));

const CASH_FLOW_ANNUAL = Array.from({ length: 10 }, (_, i) => ({
  year: `Yr ${i + 1}`,
  cashFlow: 2520 + i * 380 + (i > 5 ? i * 120 : 0),
  cumulative: (2520 + i * 380) * (i + 1) * 0.6,
}));

const EXPENSE_WATERFALL = [
  { name: "Gross Rent", value: 1950, fill: "#10B981" },
  { name: "Vacancy", value: -113, fill: "#EF4444" },
  { name: "Tax", value: -452, fill: "#EF4444" },
  { name: "Insurance", value: -233, fill: "#EF4444" },
  { name: "Maintenance", value: -248, fill: "#EF4444" },
  { name: "Management", value: -156, fill: "#EF4444" },
  { name: "CapEx", value: -248, fill: "#EF4444" },
  { name: "NOI", value: 500, fill: "#C9A227" },
  { name: "Mortgage", value: -1627, fill: "#EF4444" },
  { name: "Net CF", value: 210, fill: "#10B981" },
];

const RADAR_COMPARISON = [
  { metric: "Cap Rate", austin: 82, tampa: 78, nashville: 68 },
  { metric: "Cash Flow", austin: 75, tampa: 85, nashville: 65 },
  { metric: "DSCR", austin: 80, tampa: 82, nashville: 70 },
  { metric: "Supply", austin: 90, tampa: 95, nashville: 72 },
  { metric: "Jobs", austin: 85, tampa: 80, nashville: 75 },
  { metric: "Permits", austin: 88, tampa: 72, nashville: 68 },
  { metric: "Affordability", austin: 55, tampa: 72, nashville: 80 },
  { metric: "HPI Momentum", austin: 78, tampa: 70, nashville: 65 },
];

const PORTFOLIO_ALLOCATION = [
  { name: "Appreciation", value: 48, fill: "#C9A227" },
  { name: "Debt Paydown", value: 32, fill: "#10B981" },
  { name: "Cash Flow", value: 20, fill: "#E8C547" },
];

const RATE_HISTORY = Array.from({ length: 52 }, (_, i) => ({
  week: i + 1,
  rate30: 7.2 - i * 0.008 + Math.sin(i * 0.3) * 0.15,
  rate15: 6.5 - i * 0.007 + Math.sin(i * 0.3) * 0.12,
  fedFunds: 5.25 - (i > 30 ? (i - 30) * 0.02 : 0),
}));

const SUPPLY_DEMAND = Array.from({ length: 24 }, (_, i) => ({
  month: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
  supply: 2.8 - i * 0.03 + Math.sin(i * 0.5) * 0.3,
  demand: 3.2 + i * 0.02 + Math.cos(i * 0.4) * 0.2,
  permits: 1200 + i * 45 + Math.sin(i) * 80,
}));

const SENSITIVITY_GRID = (() => {
  const exitCaps = [5.5, 6.0, 6.5, 7.0, 7.5];
  const discRates = [8, 9, 10, 11, 12];
  const data: Array<{ exitCap: number; discRate: number; irr: number }> = [];
  for (const dc of discRates) {
    for (const ec of exitCaps) {
      data.push({ exitCap: ec, discRate: dc, irr: 22 - dc * 0.8 - ec * 1.2 + Math.random() * 2 });
    }
  }
  return data;
})();

// ─── Chart Colors ────────────────────────────────────────────────────────────

const GOLD = "#C9A227";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";
const ROSE = "#EF4444";
const GOLD_LIGHT = "#E8C547";
const BORDER = "#1F1F1F";
const TEXT_DIM = "#666666";

const tooltipStyle = {
  backgroundColor: "#1A1A1A",
  border: "1px solid #1F1F1F",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#FAFAFA",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChartsDemoPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div>
        <h1 className="page-title gold-gradient-text">Quant Charts Demo</h1>
        <p className="page-subtitle">Every chart component rendered with sample data</p>
      </div>

      {/* ═══ 1. CAPITAL FLOW MAP ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">1. Capital Flow Choropleth Map</h2>
        <p className="text-xs text-content-tertiary">National → State drill-down with signal panel</p>
        <CapitalFlowMap
          data={SAMPLE_MARKET_DATA}
          onStateSelect={(code) => console.log("Selected:", code)}
        />
        <AiInsightStrip
          summary="Capital is rotating from coastal to Sun Belt. Tampa leads with tightest supply nationally."
          sources={["FRED", "Census", "Redfin"]}
          confidence="high"
        />
      </section>

      {/* ═══ 2. HPI TREND WITH CONFIDENCE BANDS ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">2. HPI Trend with P10/P90 Confidence Bands</h2>
        <p className="text-xs text-content-tertiary">5-year price history + forecast with uncertainty range</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={HPI_TREND}>
              <defs>
                <linearGradient id="hpiBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="hpiLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} />
              <YAxis tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="p90" stroke="none" fill={GOLD} fillOpacity={0.08} />
              <Area type="monotone" dataKey="p10" stroke="none" fill="#000" fillOpacity={0.8} />
              <Line type="monotone" dataKey="hpi" stroke={GOLD} strokeWidth={2} dot={false} />
              <ReferenceLine y={HPI_TREND[11]?.hpi ?? 320} stroke={TEXT_DIM} strokeDasharray="4 4" label={{ value: "Current", fill: TEXT_DIM, fontSize: 9 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <AiInsightStrip
          summary="Austin HPI appreciated 6.2% YoY. Forecast shows 78% probability of continued growth with P10-P90 range of 2-17%."
          factors={[
            { label: "Supply tightening", value: 4.2, unit: "pp" },
            { label: "Job growth", value: 2.8, unit: "%" },
            { label: "Rate headwind", value: -1.5, unit: "pp" },
          ]}
          sources={["FHFA", "FRED"]}
          confidence="high"
        />
      </section>

      {/* ═══ 3. SIGNAL CONVERGENCE ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">3. Signal Convergence (5 Validated Signals)</h2>
        <p className="text-xs text-content-tertiary">Backtested signals with convergence scoring</p>
        <SignalConvergenceChart
          signals={SAMPLE_SIGNALS}
          convergenceCount={4}
          historicalContext={SAMPLE_CONVERGENCE_CONTEXT}
          market="Austin, TX"
        />
      </section>

      {/* ═══ 4. SHAP FACTOR ATTRIBUTION ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">4. SHAP-Style Factor Attribution</h2>
        <p className="text-xs text-content-tertiary">What's pushing the score up and down</p>
        <FactorAttributionChart
          factors={SAMPLE_FACTORS}
          totalScore={82}
          maxScore={100}
          title="What's Driving Austin's Score"
        />
      </section>

      {/* ═══ 5. MONTE CARLO IRR DISTRIBUTION ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">5. Monte Carlo IRR Distribution (10,000 sims)</h2>
        <p className="text-xs text-content-tertiary">Probability-weighted return outcomes</p>
        <MonteCarloChart {...MONTE_CARLO_SAMPLE} />
      </section>

      {/* ═══ 6. STRESS TEST SURVIVAL ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">6. Stress Test Survival (6 Scenarios)</h2>
        <p className="text-xs text-content-tertiary">Can this deal survive a downturn?</p>
        <StressTestChart {...STRESS_TEST_SAMPLE} />
      </section>

      {/* ═══ 7. RATE HISTORY (52-week) ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">7. Rate Environment (52-Week Trend)</h2>
        <p className="text-xs text-content-tertiary">30yr / 15yr / Fed Funds with direction</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={RATE_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="week" tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} />
              <YAxis tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="rate30" stroke={GOLD} strokeWidth={2} dot={false} name="30yr Fixed" />
              <Line type="monotone" dataKey="rate15" stroke={GOLD_LIGHT} strokeWidth={1.5} dot={false} name="15yr Fixed" />
              <Line type="monotone" dataKey="fedFunds" stroke={EMERALD} strokeWidth={1} dot={false} name="Fed Funds" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <AiInsightStrip
          summary="Rates dropped 0.35% over 52 weeks. Each 0.25% saves $52/month on a $300K loan."
          sources={["FRED MORTGAGE30US", "FRED DFF"]}
          confidence="high"
        />
      </section>

      {/* ═══ 8. EXPENSE WATERFALL ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">8. Cash Flow Waterfall (monthly)</h2>
        <p className="text-xs text-content-tertiary">Where every dollar of rent goes</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={EXPENSE_WATERFALL} layout="vertical" barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
              <XAxis type="number" tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#999", fontSize: 11 }} stroke={BORDER} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${Math.abs(v)}`, v >= 0 ? "Income" : "Expense"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {EXPENSE_WATERFALL.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══ 9. ANNUAL CASH FLOW PROJECTION ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">9. Annual Cash Flow Projection (10-Year Hold)</h2>
        <p className="text-xs text-content-tertiary">Cash flow grows with rent escalation</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={CASH_FLOW_ANNUAL}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="year" tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} />
              <YAxis tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Annual CF"]} />
              <Bar dataKey="cashFlow" fill={EMERALD} fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke={GOLD} strokeWidth={1.5} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══ 10. RADAR COMPARISON (3 markets) ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">10. Market Comparison Radar (Austin vs Tampa vs Nashville)</h2>
        <p className="text-xs text-content-tertiary">8-dimension comparison across markets</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={RADAR_COMPARISON}>
              <PolarGrid stroke={BORDER} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#999", fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: TEXT_DIM, fontSize: 9 }} domain={[0, 100]} />
              <Radar name="Austin" dataKey="austin" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Tampa" dataKey="tampa" stroke={EMERALD} fill={EMERALD} fillOpacity={0.1} strokeWidth={1.5} />
              <Radar name="Nashville" dataKey="nashville" stroke={AMBER} fill={AMBER} fillOpacity={0.08} strokeWidth={1} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gold inline-block" /> Austin</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald inline-block" /> Tampa</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber inline-block" /> Nashville</span>
        </div>
      </section>

      {/* ═══ 11. SUPPLY VS DEMAND TIMELINE ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">11. Supply vs Demand (24-Month Trend)</h2>
        <p className="text-xs text-content-tertiary">Months of supply + demand proxy with permit overlay</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={SUPPLY_DEMAND}>
              <defs>
                <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ROSE} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={ROSE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMERALD} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} />
              <YAxis tick={{ fill: TEXT_DIM, fontSize: 10 }} stroke={BORDER} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="supply" stroke={ROSE} fill="url(#supplyGrad)" strokeWidth={2} name="Supply (months)" />
              <Area type="monotone" dataKey="demand" stroke={EMERALD} fill="url(#demandGrad)" strokeWidth={2} name="Demand proxy" />
              <ReferenceLine y={4} stroke={AMBER} strokeDasharray="4 4" label={{ value: "Balanced (4mo)", fill: AMBER, fontSize: 9 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══ 12. PORTFOLIO ALLOCATION DONUT ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">12. Wealth Growth Breakdown</h2>
        <p className="text-xs text-content-tertiary">Where your returns come from</p>
        <div className="flex items-center gap-8">
          <div className="chart-container" style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PORTFOLIO_ALLOCATION} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {PORTFOLIO_ALLOCATION.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {PORTFOLIO_ALLOCATION.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.fill }} />
                <span className="text-content-secondary text-sm">{item.name}</span>
                <span className="font-mono text-content-primary text-sm font-bold">{item.value}%</span>
              </div>
            ))}
            <div className="pt-2 border-t border-surface-border">
              <p className="text-content-primary font-bold">$4,280/mo total wealth growth</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 13. SENSITIVITY HEATMAP ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">13. Sensitivity Heatmap (Exit Cap vs Discount Rate)</h2>
        <p className="text-xs text-content-tertiary">IRR sensitivity to key assumptions</p>
        <div className="overflow-x-auto">
          <table className="w-full text-center font-mono text-xs">
            <thead>
              <tr>
                <th className="p-2 text-content-tertiary">Disc Rate ↓ \ Exit Cap →</th>
                {[5.5, 6.0, 6.5, 7.0, 7.5].map((ec) => (
                  <th key={ec} className="p-2 text-content-secondary">{ec}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[8, 9, 10, 11, 12].map((dr) => (
                <tr key={dr}>
                  <td className="p-2 text-content-secondary">{dr}%</td>
                  {[5.5, 6.0, 6.5, 7.0, 7.5].map((ec) => {
                    const cell = SENSITIVITY_GRID.find((c) => c.exitCap === ec && c.discRate === dr);
                    const irr = cell?.irr ?? 0;
                    const bg = irr > 12 ? "bg-emerald/20" : irr > 8 ? "bg-gold/20" : irr > 4 ? "bg-amber/20" : "bg-rose/20";
                    const text = irr > 12 ? "text-emerald-light" : irr > 8 ? "text-gold" : irr > 4 ? "text-amber-light" : "text-rose-light";
                    return (
                      <td key={ec} className={`p-2 rounded ${bg} ${text} font-bold`}>
                        {irr.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AiInsightStrip
          summary="Most sensitive to exit cap rate. A 50bps change swings IRR by 3.2 percentage points."
          confidence="high"
          sources={["DCF Engine"]}
        />
      </section>

      {/* ═══ 14. TERM COMPONENT DEMO ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">14. Plain English Terms (hover/click any)</h2>
        <p className="text-sm text-content-secondary leading-relaxed">
          This property has a <Term id="cap-rate" value={7.2} benchmark={5.8}>Cap Rate of 7.2%</Term> which is above the market average.
          The <Term id="dscr" value={1.35}>DSCR of 1.35x</Term> means the income comfortably covers the loan payment.
          Your <Term id="coc" value={3.7}>Cash-on-Cash return is 3.7%</Term>, and the
          <Term id="grm" value={12.8}>GRM is 12.8</Term>. The
          <Term id="irr" value={12.4}>projected IRR is 12.4%</Term> over a 10-year hold, with
          <Term id="break-even-occupancy" value={18.2}>break-even vacancy at 18.2%</Term> — a big safety cushion.
          The market shows <Term id="months-of-supply" value={2.1}>2.1 months of supply</Term> which is very tight.
        </p>
      </section>

      {/* ═══ 15. AI INSIGHT STRIP (expanded) ═══ */}
      <section className="glass p-5 space-y-3">
        <h2 className="text-lg font-semibold text-content-primary">15. AI Insight Strip (Surface 1 + 2)</h2>
        <AiInsightStrip
          summary="This property's cap rate of 7.2% is 1.4pp above the Austin metro average — strong for cash flow."
          detail="In markets where cap rates exceed the average by more than 1 point, forward 12-month returns have been 2.3% higher than average. The tight supply (2.1 months) and accelerating permits (+34%) create a favorable environment for both cash flow and appreciation."
          factors={[
            { label: "Cap rate above average", value: 1.4, unit: "pp" },
            { label: "Below-average vacancy (5.8%)", value: 0.8, unit: "pp" },
            { label: "Permits accelerating", value: 2.1, unit: "σ" },
            { label: "Higher-than-average tax rate", value: -0.5, unit: "pp" },
            { label: "Rates above long-term avg", value: -0.8, unit: "pp" },
          ]}
          sources={["FRED MORTGAGE30US", "Census ACS B25103", "FHFA HPI Q4 2025", "Redfin MoS"]}
          confidence="high"
          defaultExpanded
        />
      </section>
    </div>
  );
}
