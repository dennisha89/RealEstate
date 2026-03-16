"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Activity, Layers } from "lucide-react";
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from "./ChartTheme";
import { computeDerivedMetrics, type DerivedMarketProfile } from "@/lib/engines/derived-metrics-engine";

/* ═══════════════════════════════════════════════════════════════
   MARKET DATA — generates time-series from derived-metrics engine
   ═══════════════════════════════════════════════════════════════ */

interface MarketConfig {
  name: string;
  zip: string;
  medianPrice: number;
  medianRent: number;
  medianIncome: number;
  priceGrowthRate: number;
  rentGrowthRate: number;
  incomeGrowthRate: number;
  mortgageRate: number;
  inventory: number;
  monthlyExpenseRatio: number;
  color: string;
}

const MARKET_CONFIGS: MarketConfig[] = [
  { name: "Austin", zip: "78701", medianPrice: 425000, medianRent: 2100, medianIncome: 78000, priceGrowthRate: 4.2, rentGrowthRate: 3.1, incomeGrowthRate: 3.8, mortgageRate: 6.95, inventory: 2.3, monthlyExpenseRatio: 0.35, color: CHART_COLORS.gold },
  { name: "Raleigh", zip: "27601", medianPrice: 380000, medianRent: 1850, medianIncome: 72000, priceGrowthRate: 5.1, rentGrowthRate: 4.2, incomeGrowthRate: 4.0, mortgageRate: 6.95, inventory: 2.1, monthlyExpenseRatio: 0.33, color: CHART_COLORS.emerald },
  { name: "Tampa", zip: "33601", medianPrice: 350000, medianRent: 2000, medianIncome: 58000, priceGrowthRate: 2.8, rentGrowthRate: 1.5, incomeGrowthRate: 2.2, mortgageRate: 6.95, inventory: 3.4, monthlyExpenseRatio: 0.38, color: CHART_COLORS.amber },
  { name: "Phoenix", zip: "85001", medianPrice: 395000, medianRent: 1900, medianIncome: 65000, priceGrowthRate: 1.2, rentGrowthRate: 0.8, incomeGrowthRate: 2.5, mortgageRate: 6.95, inventory: 4.1, monthlyExpenseRatio: 0.34, color: CHART_COLORS.roseLight },
  { name: "Denver", zip: "80201", medianPrice: 520000, medianRent: 2200, medianIncome: 82000, priceGrowthRate: -0.5, rentGrowthRate: 0.2, incomeGrowthRate: 2.0, mortgageRate: 6.95, inventory: 5.2, monthlyExpenseRatio: 0.36, color: "#8B5CF6" },
];

type ChartView = "appreciation" | "capVsAppreciation" | "priceToRent" | "affordability" | "supplyDemand" | "cashFlow";

const CHART_VIEWS: { key: ChartView; label: string; icon: typeof TrendingUp }[] = [
  { key: "appreciation", label: "Appreciation / Depreciation", icon: TrendingUp },
  { key: "capVsAppreciation", label: "Cap Rate vs Price Growth", icon: Activity },
  { key: "priceToRent", label: "Price-to-Rent Ratio", icon: BarChart3 },
  { key: "affordability", label: "Affordability Index", icon: Layers },
  { key: "supplyDemand", label: "Inventory & Absorption", icon: TrendingDown },
  { key: "cashFlow", label: "Cash Flow per Unit", icon: BarChart3 },
];

type TimeFrame = "12m" | "24m" | "36m";

/* ═══════════════════════════════════════════════════════════════
   TOOLTIP COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 6, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>{p.name}:</span>
          <span style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function MarketQuantCharts() {
  const [activeView, setActiveView] = useState<ChartView>("appreciation");
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("36m");
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(
    new Set(MARKET_CONFIGS.map(m => m.name))
  );

  const months = timeFrame === "12m" ? 12 : timeFrame === "24m" ? 24 : 36;

  // Compute derived metrics for all markets
  const marketData = useMemo(() => {
    const result: Record<string, { config: MarketConfig; metrics: DerivedMarketProfile }> = {};
    for (const config of MARKET_CONFIGS) {
      result[config.name] = {
        config,
        metrics: computeDerivedMetrics(config, months),
      };
    }
    return result;
  }, [months]);

  function toggleMarket(name: string) {
    setSelectedMarkets(prev => {
      if (prev.has(name) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  // Build merged time-series data for multi-line charts
  const mergedTimeSeries = useMemo(() => {
    const active = MARKET_CONFIGS.filter(m => selectedMarkets.has(m.name));
    if (active.length === 0) return [];

    const first = active[0];
    if (!first) return [];
    const firstMarket = marketData[first.name];
    if (!firstMarket) return [];

    const getMetricSeries = (name: string): Array<{ date: string; value: number }> => {
      const m = marketData[name];
      if (!m) return [];
      switch (activeView) {
        case "appreciation": return m.metrics.capRateTrend.map((p, i) => {
          const priceStart = m.config.medianPrice * 0.92;
          const priceNow = m.metrics.pricePerSqft[i]?.value ?? 0;
          const sqft = 1600;
          const currentPrice = priceNow * sqft;
          const appreciationPct = ((currentPrice / priceStart) - 1) * 100;
          return { date: p.date, value: Math.round(appreciationPct * 10) / 10 };
        });
        case "capVsAppreciation": return m.metrics.capRateTrend;
        case "priceToRent": return m.metrics.priceToRent;
        case "affordability": return m.metrics.affordabilityIndex;
        case "supplyDemand": return m.metrics.inventoryAbsorption;
        case "cashFlow": return m.metrics.cashFlowPerUnit;
        default: return [];
      }
    };

    const refSeries = getMetricSeries(first.name);
    return refSeries.map((point, i) => {
      const row: Record<string, string | number> = { date: point.date };
      for (const mk of active) {
        const series = getMetricSeries(mk.name);
        row[mk.name] = series[i]?.value ?? 0;
      }
      return row;
    });
  }, [marketData, selectedMarkets, activeView]);

  // Scatter data for cap rate vs appreciation
  const scatterData = useMemo(() => {
    if (activeView !== "capVsAppreciation") return [];
    return MARKET_CONFIGS.filter(m => selectedMarkets.has(m.name)).map(mk => {
      const data = marketData[mk.name];
      if (!data) return null;
      const lastCap = data.metrics.capRateTrend[data.metrics.capRateTrend.length - 1]?.value ?? 0;
      return {
        name: mk.name,
        capRate: lastCap,
        appreciation: mk.priceGrowthRate,
        color: mk.color,
        size: 120,
      };
    }).filter(Boolean) as Array<{ name: string; capRate: number; appreciation: number; color: string; size: number }>;
  }, [marketData, selectedMarkets, activeView]);

  const activeMarkets = MARKET_CONFIGS.filter(m => selectedMarkets.has(m.name));

  const yAxisLabel = (() => {
    switch (activeView) {
      case "appreciation": return "Cumulative %";
      case "capVsAppreciation": return "Cap Rate %";
      case "priceToRent": return "P/R Ratio";
      case "affordability": return "% of Income";
      case "supplyDemand": return "Months";
      case "cashFlow": return "$/month";
      default: return "";
    }
  })();

  const yTickFormatter = (v: number) => {
    switch (activeView) {
      case "appreciation": return `${v > 0 ? "+" : ""}${v.toFixed(0)}%`;
      case "capVsAppreciation": return `${v.toFixed(1)}%`;
      case "priceToRent": return `${v.toFixed(0)}x`;
      case "affordability": return `${v.toFixed(0)}%`;
      case "supplyDemand": return `${v.toFixed(1)}`;
      case "cashFlow": return `$${v.toFixed(0)}`;
      default: return String(v);
    }
  };

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-content-primary">
            Market <span className="text-gold-light">Quantitative Analysis</span>
          </h2>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            Interactive time-series from derived-metrics engine
          </p>
        </div>

        {/* Time frame selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-elevated border border-surface-border">
          {(["12m", "24m", "36m"] as TimeFrame[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                timeFrame === tf
                  ? "bg-gold-muted text-gold-light"
                  : "text-content-disabled hover:text-content-tertiary"
              }`}
              aria-pressed={timeFrame === tf}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart view tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Chart views">
        {CHART_VIEWS.map(v => {
          const Icon = v.icon;
          const active = activeView === v.key;
          return (
            <button
              key={v.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                active
                  ? "bg-gold-muted text-gold-light border-gold/20"
                  : "text-content-disabled border-transparent hover:text-content-secondary hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Market toggle pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Toggle markets">
        {MARKET_CONFIGS.map(mk => {
          const active = selectedMarkets.has(mk.name);
          return (
            <button
              key={mk.name}
              onClick={() => toggleMarket(mk.name)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                active
                  ? "border-transparent text-black"
                  : "border-surface-border text-content-disabled bg-transparent hover:border-white/20 hover:text-content-tertiary"
              }`}
              style={active ? { backgroundColor: mk.color } : {}}
              aria-pressed={active}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? "rgba(0,0,0,0.35)" : mk.color }}
                aria-hidden="true"
              />
              {mk.name}
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      <div className="relative">
        {activeView === "capVsAppreciation" ? (
          /* Scatter plot: Cap Rate (x) vs Appreciation Rate (y) */
          <div>
            <p className="text-[11px] text-content-tertiary mb-3">
              Each dot is a market. X-axis = current cap rate. Y-axis = trailing appreciation rate.
              Higher cap + higher appreciation = best quadrant (top-right).
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} />
                <XAxis
                  type="number"
                  dataKey="capRate"
                  name="Cap Rate"
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  label={{ value: "Cap Rate (%)", position: "bottom", offset: 0, style: { fill: CHART_COLORS.text, fontSize: 11 } }}
                />
                <YAxis
                  type="number"
                  dataKey="appreciation"
                  name="Appreciation"
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                  label={{ value: "Appreciation (%/yr)", angle: -90, position: "insideLeft", style: { fill: CHART_COLORS.text, fontSize: 11 } }}
                />
                <ReferenceLine y={0} stroke={CHART_COLORS.rose} strokeDasharray="3 3" label={{ value: "Depreciation Line", position: "right", style: { fill: CHART_COLORS.rose, fontSize: 9 } }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as { name: string; capRate: number; appreciation: number } | undefined;
                    if (!d) return null;
                    return (
                      <div style={TOOLTIP_STYLE}>
                        <p style={{ fontSize: 12, color: CHART_COLORS.white, fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
                        <p style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>
                          Cap Rate: <span style={{ color: CHART_COLORS.gold, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{d.capRate.toFixed(1)}%</span>
                        </p>
                        <p style={{ fontSize: 11, color: CHART_COLORS.textSecondary }}>
                          Appreciation: <span style={{ color: d.appreciation >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose, fontFamily: "JetBrains Mono", fontWeight: 600 }}>
                            {d.appreciation > 0 ? "+" : ""}{d.appreciation.toFixed(1)}%/yr
                          </span>
                        </p>
                        <p style={{ fontSize: 9, color: CHART_COLORS.text, marginTop: 6 }}>
                          {d.appreciation >= 3 && d.capRate >= 5.5 ? "Strong: High yield + strong growth" :
                           d.appreciation >= 0 && d.capRate >= 5.5 ? "Income play: Good yield, moderate growth" :
                           d.appreciation >= 3 ? "Growth play: Low yield, strong appreciation" :
                           d.appreciation < 0 ? "Caution: Depreciating market" :
                           "Mixed signals"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} isAnimationActive={false}>
                  {scatterData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} stroke={entry.color} strokeWidth={2} r={8} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            {/* Market labels below scatter */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {scatterData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-content-secondary">{d.name}</span>
                  <span className="text-[10px] font-mono text-content-disabled">
                    {d.capRate.toFixed(1)}% / {d.appreciation > 0 ? "+" : ""}{d.appreciation.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : activeView === "cashFlow" ? (
          /* Bar chart for cash flow */
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={mergedTimeSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={false} />
              <XAxis
                dataKey="date"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={Math.max(0, Math.floor(mergedTimeSeries.length / 8) - 1)}
              />
              <YAxis
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={yTickFormatter}
                width={56}
              />
              <ReferenceLine y={0} stroke={CHART_COLORS.rose} strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              {activeMarkets.map(mk => (
                <Bar key={mk.name} dataKey={mk.name} fill={mk.color} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          /* Line chart for all other views */
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={mergedTimeSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray={GRID_STYLE.strokeDasharray} stroke={GRID_STYLE.stroke} vertical={false} />
              <XAxis
                dataKey="date"
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                interval={Math.max(0, Math.floor(mergedTimeSeries.length / 8) - 1)}
              />
              <YAxis
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                tickFormatter={yTickFormatter}
                width={56}
                label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -5, style: { fill: CHART_COLORS.text, fontSize: 10 } }}
              />
              {activeView === "appreciation" && (
                <ReferenceLine y={0} stroke={CHART_COLORS.rose} strokeDasharray="3 3" label={{ value: "0% — Appreciation / Depreciation line", position: "right", style: { fill: CHART_COLORS.text, fontSize: 9 } }} />
              )}
              <Tooltip content={<CustomTooltip />} />
              {activeMarkets.map(mk => (
                <Line
                  key={mk.name}
                  type="monotone"
                  dataKey={mk.name}
                  stroke={mk.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: mk.color, stroke: "#111111", strokeWidth: 2 }}
                  name={mk.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Context note per chart */}
        <div className="mt-3 pt-3 border-t border-surface-border">
          <p className="text-[10px] text-content-disabled leading-relaxed">
            {activeView === "appreciation" && "Cumulative price change from baseline. Markets above 0% are appreciating, below are depreciating. Computed from derived-metrics engine with 16-factor regression inputs."}
            {activeView === "capVsAppreciation" && "Cap rate vs annual appreciation — top-right quadrant (high yield + high growth) is the institutional sweet spot. Bottom-left (low yield + declining prices) is the danger zone."}
            {activeView === "priceToRent" && "Price-to-Rent ratio = Purchase Price / Annual Rent. Lower is better for investors. Above 20x suggests overvaluation relative to rental income. Source: derived-metrics engine."}
            {activeView === "affordability" && "Monthly mortgage payment as a percentage of median household income. Above 35% signals affordability stress — demand destruction becomes likely. Source: Census ACS + FRED."}
            {activeView === "supplyDemand" && "Months of housing inventory. Below 3 months = seller's market (appreciation pressure). Above 6 months = buyer's market (depreciation risk). Source: derived-metrics engine."}
            {activeView === "cashFlow" && "Monthly net cash flow per unit after all expenses and debt service. Positive = income property. Negative = you're subsidizing the deal from your pocket."}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-surface-border">
        {activeMarkets.map(mk => (
          <div key={mk.name} className="flex items-center gap-1.5">
            <span className="w-5 h-px" style={{ backgroundColor: mk.color }} aria-hidden="true" />
            <span className="text-[10px] text-content-tertiary">{mk.name}</span>
          </div>
        ))}
        <span className="ml-auto text-[9px] text-content-disabled">Engine: derived-metrics · {months}mo window</span>
      </div>
    </div>
  );
}
