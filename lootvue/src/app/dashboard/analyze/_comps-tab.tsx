"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Home, Calendar, MapPin, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Term } from "@/components/shared/Term";
import {
  CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE,
  seededRandom, fmtChartCurrency,
} from "@/components/charts/ChartTheme";
import { formatCurrency } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comp {
  address: string;
  saleDate: string;
  salePrice: number;
  sqft: number;
  beds: number;
  baths: number;
  distanceMi: number;
  adjustment: number;
  adjustedPrice: number;
}

// ─── Seeded data ──────────────────────────────────────────────────────────────

const STREETS  = ["Oak", "Maple", "Cedar", "Birch", "Pine", "Elm", "Walnut", "Hickory", "Willow", "Poplar"];
const ST_TYPES = ["Dr", "Ln", "Ct", "Way", "Pl", "Ave", "Blvd", "Cir"];

function buildComps(result: AnalysisResult): Comp[] {
  let h = 0;
  for (let i = 0; i < result.address.length; i++) h = ((h << 5) - h + result.address.charCodeAt(i)) | 0;
  const rng = seededRandom(Math.abs(h));
  const r   = () => rng();

  return Array.from({ length: 5 }, () => {
    // Use extra rng calls to ensure each comp diverges sufficiently
    const streetIdx = Math.floor(r() * STREETS.length);
    const typeIdx   = Math.floor(r() * ST_TYPES.length);
    const num       = 100 + Math.floor(r() * 9900);
    const sqft      = Math.round(result.sqft * (0.85 + r() * 0.3));
    const ppsf      = result.purchasePrice / result.sqft;
    const rawPrice  = Math.round(sqft * ppsf * (0.9 + r() * 0.2));
    const adj       = Math.round((r() - 0.5) * 22000 / 1000) * 1000;
    const daysBack  = Math.floor(10 + r() * 80);
    const saleDate  = new Date(Date.now() - daysBack * 86400000)
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return {
      address:       `${num} ${STREETS[streetIdx]} ${ST_TYPES[typeIdx]}`,
      saleDate,
      salePrice:     rawPrice,
      sqft,
      beds:          Math.max(1, result.beds  + (r() > 0.65 ? 1 : r() < 0.25 ? -1 : 0)),
      baths:         Math.max(1, result.baths + (r() > 0.70 ? 0.5 : 0)),
      distanceMi:    Math.round((0.2 + r() * 1.8) * 10) / 10,
      adjustment:    adj,
      adjustedPrice: rawPrice + adj,
    };
  });
}

// ─── Bar tooltip ──────────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 10, color: CHART_COLORS.text, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>{label}</p>
      <p style={{ fontSize: 13, color: CHART_COLORS.white, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
        {fmtChartCurrency(payload[0].value)}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompsTab({ result }: { result: AnalysisResult }) {
  const comps = buildComps(result);

  const adjustedPrices = comps.map((c) => c.adjustedPrice);
  const compMedian     = adjustedPrices.reduce((a, b) => a + b, 0) / comps.length;
  const pctVsMedian    = ((result.purchasePrice - compMedian) / compMedian) * 100;
  const isBelowMedian  = pctVsMedian < 0;

  const compPpsf    = comps.reduce((s, c) => s + c.salePrice / c.sqft, 0) / comps.length;
  const subjectPpsf = result.purchasePrice / result.sqft;
  const zipAvgPpsf  = compPpsf * 0.96;

  const low  = Math.min(...adjustedPrices);
  const high = Math.max(...adjustedPrices);

  const chartData = [
    { label: "Low Comp",  value: low,                   key: "low"  },
    { label: "This Deal", value: result.purchasePrice,  key: "subj" },
    { label: "Median",    value: Math.round(compMedian), key: "mid"  },
    { label: "High Comp", value: high,                  key: "high" },
  ];

  const pssfMax = Math.max(subjectPpsf, compPpsf, zipAvgPpsf) * 1.25;

  return (
    <div className="space-y-4">

      {/* Summary banner */}
      <div className={`card border ${isBelowMedian ? "border-emerald/20 bg-emerald/[0.03]" : "border-amber/20 bg-amber/[0.03]"}`}>
        <div className="flex items-start gap-3">
          {isBelowMedian
            ? <ArrowDownRight className="w-5 h-5 text-emerald-light mt-0.5 shrink-0" aria-label="Below median" />
            : <ArrowUpRight   className="w-5 h-5 text-amber-light mt-0.5 shrink-0"   aria-label="Above median" />}
          <div>
            <p className="text-[13px] text-content-primary font-semibold">
              This property is priced{" "}
              <span className={`font-mono tabular-nums ${isBelowMedian ? "text-emerald-light" : "text-amber-light"}`}>
                {Math.abs(pctVsMedian).toFixed(1)}% {isBelowMedian ? "below" : "above"}
              </span>{" "}
              5 comparable sales in the last 90 days
            </p>
            <p className="text-[12px] text-content-secondary mt-1">
              Comp median:{" "}
              <span className="font-mono text-content-primary tabular-nums">{formatCurrency(Math.round(compMedian))}</span>
              {" · "}
              Range:{" "}
              <span className="font-mono text-content-tertiary tabular-nums">{formatCurrency(low)} – {formatCurrency(high)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Comp table */}
      <div className="card overflow-x-auto">
        <div className="section-label flex items-center gap-2 mb-3">
          <Home className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Comparable Sales
          <span className="text-[10px] text-content-disabled ml-auto">ATTOM · Demo · Last 90 days</span>
        </div>
        <table className="w-full text-[12px] min-w-[560px]" aria-label="Comparable sales table">
          <thead>
            <tr className="border-b border-surface-border">
              {["Address", "Sale Date", "Sale Price", "$/sqft", "Bed/Ba", "Dist", "Adj. Value"].map((h) => (
                <th key={h} scope="col" className="text-left text-[10px] uppercase tracking-wider text-content-disabled font-medium pb-2 pr-3 last:pr-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comps.map((comp, i) => (
              <tr key={i} className="border-b border-surface-border/40 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-content-disabled shrink-0" aria-hidden="true" />
                    <span className="text-content-secondary">{comp.address}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-content-disabled">
                    <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{comp.saleDate}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 font-mono tabular-nums text-content-primary font-semibold">
                  {formatCurrency(comp.salePrice)}
                </td>
                <td className="py-2.5 pr-3 font-mono tabular-nums text-content-secondary">
                  ${Math.round(comp.salePrice / comp.sqft).toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-content-secondary whitespace-nowrap">
                  {comp.beds}bd/{comp.baths}ba
                </td>
                <td className="py-2.5 pr-3 font-mono tabular-nums text-content-disabled whitespace-nowrap">
                  {comp.distanceMi} mi
                </td>
                <td className="py-2.5">
                  <span className="font-mono tabular-nums text-content-primary">{formatCurrency(comp.adjustedPrice)}</span>
                  <span className={`ml-1.5 text-[10px] font-mono tabular-nums ${comp.adjustment >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                    {comp.adjustment >= 0 ? "+" : ""}{formatCurrency(comp.adjustment)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart + $/sqft */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="card">
          <div className="section-label mb-3">Adjusted Value Range</div>
          <ResponsiveContainer width="100%" height={160} aria-label="Value range bar chart">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ ...AXIS_STYLE.tick, fontSize: 10 }} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <YAxis tickFormatter={(v: number) => fmtChartCurrency(v)} tick={AXIS_STYLE.tick} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.key}
                    fill={
                      d.key === "subj" ? CHART_COLORS.gold
                      : d.key === "low"  ? CHART_COLORS.emerald
                      : d.key === "high" ? CHART_COLORS.rose
                      : CHART_COLORS.textSecondary
                    }
                    fillOpacity={d.key === "subj" ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-label mb-4">Price Per Sq Ft</div>
          <div className="space-y-3">
            {([
              ["This Property", subjectPpsf, CHART_COLORS.gold],
              ["Comp Average",  compPpsf,    CHART_COLORS.textSecondary],
              ["ZIP Average",   zipAvgPpsf,  CHART_COLORS.text],
            ] as [string, number, string][]).map(([label, value, color]) => (
              <div key={label}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-content-secondary">{label}</span>
                  <span className="font-mono tabular-nums font-semibold text-content-primary">
                    ${Math.round(value).toLocaleString()}/sqft
                  </span>
                </div>
                <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (value / pssfMax) * 100)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-content-tertiary mt-4">
            <Term id="arv">Comp-adjusted value</Term> is the most reliable measure of fair market price.
          </p>
        </div>
      </div>

      {/* Comp map placeholder */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Comp Map
          <span className="text-[10px] text-content-disabled ml-auto">Connect Mapbox API key to enable</span>
        </div>
        <div
          className="h-36 rounded-lg bg-surface-elevated border border-surface-border flex flex-col items-center justify-center gap-2"
          role="img"
          aria-label={`Map placeholder: subject property plus ${comps.length} comparable sales within ${Math.max(...comps.map((c) => c.distanceMi))} miles`}
        >
          <MapPin className="w-6 h-6 text-gold/30" aria-hidden="true" />
          <p className="text-[12px] text-content-disabled">Subject + {comps.length} comps within {Math.max(...comps.map((c) => c.distanceMi))} mi</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" aria-hidden="true" />
              <span className="text-content-disabled">Subject</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-muted border border-surface-border inline-block" aria-hidden="true" />
              <span className="text-content-disabled">Comps</span>
            </span>
          </div>
        </div>
      </div>

      {/* AI comp analysis */}
      <div className="card-glass border-gold/[0.08]">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-gold-light" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
          </svg>
          <span className="text-xs font-semibold text-gold-light">AI Comp Analysis</span>
        </div>
        <p className="text-[13px] text-content-secondary leading-relaxed">
          Based on {comps.length} comps,{" "}
          {isBelowMedian
            ? `this property is priced ${Math.abs(pctVsMedian).toFixed(1)}% below the adjusted comp median. The ${formatCurrency(Math.abs(Math.round(result.purchasePrice - compMedian)))} discount suggests room for a below-ask offer — or immediate equity at closing.`
            : `this property is priced ${pctVsMedian.toFixed(1)}% above the adjusted comp median. Ensure the premium is justified by condition, upgrades, or location advantages vs the comps before proceeding.`
          }{" "}
          At <span className="font-mono text-content-primary tabular-nums">${Math.round(subjectPpsf)}/sqft</span> vs comp avg{" "}
          <span className="font-mono text-content-primary tabular-nums">${Math.round(compPpsf)}/sqft</span>, the{" "}
          <Term id="arv">value position</Term> is {subjectPpsf <= compPpsf ? "favorable" : "at a slight premium"}.
        </p>
        <p className="text-[9px] text-content-disabled mt-2">AI analysis · Not financial advice</p>
      </div>

    </div>
  );
}
