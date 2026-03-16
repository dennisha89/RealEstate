"use client";

/**
 * Markets — Capital Flow Intelligence
 *
 * Crown jewel of the LootVue dashboard. Shows where institutional capital
 * is moving at the state level — a 5-signal convergence model no competing
 * tool publishes in this form.
 *
 * Layout:
 *  1. Page header (title + header actions)
 *  2. CapitalFlowMap — choropleth + table + ranked views (lazy-loaded)
 *  3. AI Insight Strip — global market narrative
 *  4. Selected State Detail Panel — appears when user clicks a state
 *     a. Stat row (score, convergence, price, YoY)
 *     b. SignalConvergenceChart
 *     c. FactorAttributionChart
 *     d. Top metros grid
 *     e. AI insight for the specific state
 *     f. Action buttons
 *  5. Comparison Mode — side-by-side radar when 2–5 markets selected
 */

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin,
  ArrowUpRight,
  BarChart2,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS, TOOLTIP_STYLE } from "@/components/charts/ChartTheme";
import { AiInsightStrip } from "@/components/shared/AiInsightStrip";
import {
  SignalConvergenceChart,
  type SignalDatum,
} from "@/components/charts/SignalConvergenceChart";
import {
  FactorAttributionChart,
  type FactorDatum,
} from "@/components/charts/FactorAttributionChart";
import {
  CapitalFlowMapSkeleton,
  SAMPLE_MARKET_DATA,
  type MarketScore,
} from "@/components/charts/CapitalFlowMap";

/* ═══════════════════════════════════════════════════════════════
   LAZY-LOADED MAP — heavy SVG + TopoJSON, never SSR
   ═══════════════════════════════════════════════════════════════ */

const CapitalFlowMap = dynamic(
  () =>
    import("@/components/charts/CapitalFlowMap").then((m) => ({
      default: m.CapitalFlowMap,
    })),
  { ssr: false, loading: () => <CapitalFlowMapSkeleton /> },
);

/* ═══════════════════════════════════════════════════════════════
   EXTENDED STATE DETAIL DATA
   One record per state code — extends MarketScore with signal
   details for the SignalConvergenceChart and FactorAttribution.
   ═══════════════════════════════════════════════════════════════ */

interface MetroEntry {
  name: string;
  score: number;
  convergence: number;
}

interface StateDetail {
  stateCode: string;
  signals: SignalDatum[];
  convergenceCount: number;
  historicalContext: string;
  factors: FactorDatum[];
  metros: MetroEntry[];
  aiSummary: string;
  aiDetail: string;
  capitalFlow: string; // e.g. "$3.2B net inflow from CA"
}

const STATE_DETAILS: Record<string, StateDetail> = {
  TX: {
    stateCode: "TX",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "Only 2.1 months of homes for sale — a seller's market where prices historically rise 6-10% over the following 12 months.",
        value: 2.4,
        label: "2.1 mo",
        direction: "bullish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Builders filed 34% more permits this year than last — a forward-looking vote of confidence from developers.",
        value: 2.1,
        label: "+34% YoY",
        direction: "bullish",
      },
      {
        name: "Employment",
        plainEnglish:
          "12,000 net new jobs in the trailing 12 months. Steady demand floor — workers need housing.",
        value: 1.6,
        label: "+2.8% YoY",
        direction: "bullish",
      },
      {
        name: "Rates",
        plainEnglish:
          "Mortgage rates at 6.85% remain 140bps above the 5-year average. A real headwind for marginal buyers.",
        value: -1.1,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Price growth has slowed from 8% to 3.2% YoY. The rally is maturing but not reversing.",
        value: 0.4,
        label: "+3.2% YoY",
        direction: "neutral",
      },
    ],
    convergenceCount: 4,
    historicalContext:
      "When 4/5 signals aligned in the 20-year backtest, markets appreciated 8–13% on average over the following 18 months.",
    factors: [
      { name: "Supply constraint (tight inventory)", value: 14.2, category: "market" },
      { name: "Permit acceleration", value: 11.8, category: "market" },
      { name: "Job growth above national avg", value: 8.4, category: "market" },
      { name: "Net domestic migration inflow", value: 7.1, category: "market" },
      { name: "HPI momentum positive", value: 3.6, category: "market" },
      { name: "Rate headwind (6.85%)", value: -6.2, category: "market" },
      { name: "Affordability stretched", value: -4.1, category: "deal" },
      { name: "Insurance cost pressure", value: -1.8, category: "risk" },
    ],
    metros: [
      { name: "Austin", score: 74, convergence: 4 },
      { name: "Dallas", score: 70, convergence: 3 },
      { name: "Houston", score: 62, convergence: 2 },
      { name: "San Antonio", score: 58, convergence: 2 },
    ],
    aiSummary:
      "Texas is attracting $3.2B in net capital from California. Austin leads with 2.1 months of supply and permits up 34%.",
    aiDetail:
      "Four of five signals are bullish. The lone drag is mortgage rates — elevated at 6.85% but no longer rising. Net domestic migration into Texas metros ran at 142,000 people in 2025, the highest since 2021. Institutional buyers have increased Texas allocations by 18% YoY. The risk is concentrated in new construction oversupply in select Austin submarkets (north of 183), but the broader state picture remains one of the strongest in the country.",
    capitalFlow: "$3.2B net inflow",
  },
  FL: {
    stateCode: "FL",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "3.1 months supply — still tight but rising faster than the national average. Watch for further softening.",
        value: 1.6,
        label: "3.1 mo",
        direction: "bullish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Builders are active — permit filings up 22% YoY, concentrated in Tampa and Jacksonville corridors.",
        value: 1.8,
        label: "+22% YoY",
        direction: "bullish",
      },
      {
        name: "Employment",
        plainEnglish:
          "Tourism and healthcare sectors adding 9,200 jobs annually. Broad-based demand support.",
        value: 1.4,
        label: "+2.3% YoY",
        direction: "bullish",
      },
      {
        name: "Rates",
        plainEnglish:
          "Rates at 6.85% are a shared headwind. Florida insurance costs add an additional 80-120bps to effective carrying cost.",
        value: -1.4,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Growth decelerating from 5.1% to 3.2% — still positive but the post-pandemic surge is behind us.",
        value: 0.2,
        label: "+3.2% YoY",
        direction: "neutral",
      },
    ],
    convergenceCount: 3,
    historicalContext:
      "3/5 signal convergence historically precedes 4–8% appreciation over 18 months. Insurance cost trajectory is the key swing variable.",
    factors: [
      { name: "Supply still below 4-month threshold", value: 10.8, category: "market" },
      { name: "Permit activity accelerating", value: 9.2, category: "market" },
      { name: "Migration inflow sustained", value: 7.4, category: "market" },
      { name: "Rate headwind (6.85%)", value: -5.8, category: "market" },
      { name: "Insurance cost escalation", value: -7.2, category: "risk" },
      { name: "Affordability at 10-year low", value: -4.6, category: "deal" },
    ],
    metros: [
      { name: "Tampa", score: 72, convergence: 3 },
      { name: "Jacksonville", score: 68, convergence: 3 },
      { name: "Orlando", score: 64, convergence: 3 },
      { name: "Miami", score: 58, convergence: 2 },
    ],
    aiSummary:
      "Southeast cluster is tight — Tampa and Jacksonville show 3/5 signal convergence. Insurance risk is the wild card that most analysis ignores.",
    aiDetail:
      "Florida's investment thesis has split in two. Tampa, Jacksonville, and the I-4 corridor remain fundamentally sound — tight supply, migration inflows, diversified employment. Miami and coastal South Florida face a different equation: insurance costs have risen 40% in two years, pushing effective cap rates below 4% on many SFR assets. The signal model does not fully capture insurance risk — treat 3/5 convergence here as a conditional buy contingent on underwriting insurance costs at $4,500+ annually per property.",
    capitalFlow: "$1.8B net inflow",
  },
  TN: {
    stateCode: "TN",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "2.8 months supply — seller's market conditions persist in Nashville and Knoxville. No sign of loosening.",
        value: 1.8,
        label: "2.8 mo",
        direction: "bullish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Permit activity flat at +4% YoY — builders are rational here. Not overbuilding. Supply will stay tight.",
        value: 0.3,
        label: "+4% YoY",
        direction: "neutral",
      },
      {
        name: "Employment",
        plainEnglish:
          "Nashville's tech and healthcare sectors added 8,800 jobs. Broad diversification — not dependent on a single employer.",
        value: 1.5,
        label: "+3.1% YoY",
        direction: "bullish",
      },
      {
        name: "Rates",
        plainEnglish:
          "Same 6.85% headwind as the national market. Tennessee's lower entry prices partially offset affordability pressure.",
        value: -0.9,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Price growth accelerating to 5.1% YoY — the strongest momentum reading in this cohort.",
        value: 1.6,
        label: "+5.1% YoY",
        direction: "bullish",
      },
    ],
    convergenceCount: 3,
    historicalContext:
      "Tennessee markets with 3+ bullish signals have appreciated 7–11% over 18-month windows in the 2005–2024 backtest.",
    factors: [
      { name: "HPI momentum strongest in cohort", value: 12.1, category: "market" },
      { name: "Supply constrained below 3-month threshold", value: 10.4, category: "market" },
      { name: "Job growth above national avg", value: 8.2, category: "market" },
      { name: "Permit discipline (no oversupply)", value: 4.1, category: "market" },
      { name: "Rate headwind", value: -4.8, category: "market" },
      { name: "Limited institutional presence (illiquid exit)", value: -2.2, category: "risk" },
    ],
    metros: [
      { name: "Nashville", score: 70, convergence: 3 },
      { name: "Knoxville", score: 64, convergence: 3 },
      { name: "Memphis", score: 52, convergence: 2 },
      { name: "Chattanooga", score: 58, convergence: 2 },
    ],
    aiSummary:
      "Nashville tops the momentum rankings — 5.1% YoY HPI with 3-month supply. Builders are not overbuilding. This is a disciplined market.",
    aiDetail:
      "Tennessee punches above its weight in this model because the combination of tight supply and restrained permit activity is rare. Most Sunbelt markets that saw strong demand in 2021-2023 are now working through supply overhangs. Tennessee avoided that. The risk is exit liquidity — institutional buyer penetration is lower than Texas or Florida, meaning individual investors have fewer institutional bids when they want to sell.",
    capitalFlow: "$0.9B net inflow",
  },
  NC: {
    stateCode: "NC",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "2.9 months supply — below the 4-month neutral threshold. Conditions favor sellers in Raleigh and Charlotte.",
        value: 1.7,
        label: "2.9 mo",
        direction: "bullish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Permit filings up 28% YoY in the Research Triangle. Builders bullish on the tech corridor.",
        value: 1.9,
        label: "+28% YoY",
        direction: "bullish",
      },
      {
        name: "Employment",
        plainEnglish:
          "Semiconductor and biotech sectors adding 11,400 jobs. One of the strongest sector mixes in the Southeast.",
        value: 1.8,
        label: "+3.8% YoY",
        direction: "bullish",
      },
      {
        name: "Rates",
        plainEnglish:
          "Rate headwind consistent with national average. NC's median home price ($340K) provides more affordability buffer than coastal peers.",
        value: -0.8,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Growth holding at 4.4% YoY — decelerating but still well above long-run average of 3.1%.",
        value: 0.6,
        label: "+4.4% YoY",
        direction: "neutral",
      },
    ],
    convergenceCount: 3,
    historicalContext:
      "North Carolina shows 3/5 signal convergence. The tech corridor effect (Research Triangle + Charlotte fintech) creates durable demand that generic models miss.",
    factors: [
      { name: "Sector mix quality (tech, bio, finance)", value: 13.4, category: "market" },
      { name: "Supply tight below 3-month level", value: 10.1, category: "market" },
      { name: "Permit acceleration in tech corridor", value: 8.6, category: "market" },
      { name: "Affordability advantage vs coastal peers", value: 5.2, category: "deal" },
      { name: "Rate headwind", value: -4.4, category: "market" },
      { name: "Charlotte banking sector uncertainty", value: -3.1, category: "risk" },
    ],
    metros: [
      { name: "Raleigh", score: 74, convergence: 4 },
      { name: "Charlotte", score: 68, convergence: 3 },
      { name: "Durham", score: 66, convergence: 3 },
      { name: "Greensboro", score: 54, convergence: 2 },
    ],
    aiSummary:
      "Raleigh leads the Southeast on job quality metrics — semiconductor and biotech jobs create a 7-year demand runway that standard models undercount.",
    aiDetail:
      "The Research Triangle is the most defensible market in the Southeast for one reason: job quality. Intel, Apple, and the research universities create high-income demand that is structurally different from service-sector driven markets. Raleigh's median household income has grown 22% since 2020, compressing the price-to-income ratio relative to peers. Charlotte remains a solid market but carries more uncertainty from its financial services concentration.",
    capitalFlow: "$1.1B net inflow",
  },
  CO: {
    stateCode: "CO",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "5.4 months of inventory — above the 4-month neutral line. Buyers have negotiating power for the first time since 2019.",
        value: -1.8,
        label: "5.4 mo",
        direction: "bearish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Permit filings flat at +1% YoY. Builders are pulling back, which may arrest the supply build in 12-18 months.",
        value: 0.0,
        label: "+1% YoY",
        direction: "neutral",
      },
      {
        name: "Employment",
        plainEnglish:
          "Tech sector contraction partially offset by aerospace growth. Net employment growth is positive but narrow.",
        value: 0.8,
        label: "+1.4% YoY",
        direction: "bullish",
      },
      {
        name: "Rates",
        plainEnglish:
          "6.85% rates are especially painful in Denver where median prices ($540K) push monthly payments to ~$2,900. Demand destruction is real.",
        value: -2.1,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Prices declining at -0.8% YoY — the first annual decline since 2011. Not a crash, but a correction.",
        value: -1.2,
        label: "-0.8% YoY",
        direction: "bearish",
      },
    ],
    convergenceCount: 1,
    historicalContext:
      "1/5 signal convergence with negative HPI momentum and rising inventory has historically preceded 6-18 months of price stagnation or further declines.",
    factors: [
      { name: "Employment still growing (narrow)", value: 4.2, category: "market" },
      { name: "Supply building above neutral (5.4 mo)", value: -10.8, category: "market" },
      { name: "Rate / price affordability squeeze", value: -9.4, category: "deal" },
      { name: "HPI momentum turning negative", value: -7.2, category: "market" },
      { name: "Tech sector headwinds", value: -5.1, category: "market" },
      { name: "Permit pullback (lagging signal, positive)", value: 2.1, category: "market" },
    ],
    metros: [
      { name: "Denver", score: 45, convergence: 1 },
      { name: "Colorado Springs", score: 50, convergence: 2 },
      { name: "Boulder", score: 42, convergence: 1 },
      { name: "Fort Collins", score: 55, convergence: 2 },
    ],
    aiSummary:
      "Denver is the clearest avoid signal in this dataset. Inventory at 5.4 months, prices declining, and rate-adjusted affordability at a 15-year low.",
    aiDetail:
      "Denver entered 2024 as the most overvalued major market in the model. The post-pandemic tech migration story has reversed — remote work normalization has reduced the net migration premium that drove 2020-2022 prices. The $540K median price combined with 6.85% rates produces a monthly payment that requires $145K+ household income to meet the 28% DTI threshold. That eliminates 62% of Denver renters as potential buyers. Avoid new positions; existing holders should model exit scenarios.",
    capitalFlow: "$0.4B net outflow",
  },
  CA: {
    stateCode: "CA",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "4.8 months of inventory in key metros — above neutral in most markets except San Jose.",
        value: -1.2,
        label: "4.8 mo",
        direction: "bearish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Permit filings down 18% YoY — CEQA constraints and construction costs making new supply economically unviable.",
        value: -2.1,
        label: "-18% YoY",
        direction: "bearish",
      },
      {
        name: "Employment",
        plainEnglish:
          "Tech layoffs continue. Net employment growth flat at +0.3% — below population growth for the first time since 2010.",
        value: 0.1,
        label: "+0.3% YoY",
        direction: "neutral",
      },
      {
        name: "Rates",
        plainEnglish:
          "6.85% rates on an $820K median price generates a ~$4,400/month mortgage. The affordability math is catastrophically broken.",
        value: -2.8,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Prices down -0.5% YoY with no near-term catalyst to reverse. Institutional buyers have largely exited.",
        value: -0.8,
        label: "-0.5% YoY",
        direction: "bearish",
      },
    ],
    convergenceCount: 0,
    historicalContext:
      "0/5 bullish signals is the lowest reading in the dataset. California markets with this signal profile have produced negative real returns over the subsequent 3-year period in 7 of 9 historical instances.",
    factors: [
      { name: "Supply rising above neutral threshold", value: -9.2, category: "market" },
      { name: "Permit decline (CEQA/cost headwind)", value: -11.4, category: "market" },
      { name: "Rate/price affordability collapse", value: -14.8, category: "deal" },
      { name: "Institutional capital exiting", value: -8.6, category: "market" },
      { name: "Net domestic out-migration", value: -7.4, category: "market" },
      { name: "HPI momentum negative", value: -5.2, category: "market" },
      { name: "Supply constraint (CEQA, lagging positive)", value: 4.1, category: "market" },
    ],
    metros: [
      { name: "Los Angeles", score: 38, convergence: 0 },
      { name: "San Francisco", score: 36, convergence: 0 },
      { name: "San Diego", score: 44, convergence: 1 },
      { name: "San Jose", score: 46, convergence: 1 },
    ],
    aiSummary:
      "California scores 40/100 with zero bullish signals. The affordability math on an $820K median with 6.85% rates eliminates 71% of renters as potential buyers.",
    aiDetail:
      "California represents what happens when housing supply becomes structurally constrained at the same time affordability collapses. The supply shortage that would normally be bullish is inverted here — prices are so high relative to income that demand has simply evaporated. There is no buyer pool. Net domestic out-migration from California exceeded 300,000 people in 2025. The only scenario where California improves meaningfully is a sustained rate decline to 5.5% or below, which is not in the current forward curve.",
    capitalFlow: "$2.1B net outflow",
  },
  OR: {
    stateCode: "OR",
    signals: [
      {
        name: "Supply",
        plainEnglish:
          "6.2 months of inventory in Portland — significantly above the 4-month neutral line. A buyer's market.",
        value: -2.1,
        label: "6.2 mo",
        direction: "bearish",
      },
      {
        name: "Permits",
        plainEnglish:
          "Permits down 24% YoY — the largest decline in this cohort. Developers are sitting on the sidelines.",
        value: -2.4,
        label: "-24% YoY",
        direction: "bearish",
      },
      {
        name: "Employment",
        plainEnglish:
          "Employment growth flat at +0.4% YoY. Portland's tech exposure is a headwind as the sector contracts nationally.",
        value: 0.1,
        label: "+0.4% YoY",
        direction: "neutral",
      },
      {
        name: "Rates",
        plainEnglish:
          "6.85% rates on a $489K median — still painful, but more digestible than California or Colorado.",
        value: -1.6,
        label: "6.85%",
        direction: "bearish",
      },
      {
        name: "HPI Momentum",
        plainEnglish:
          "Prices declining at -1.4% YoY — accelerating to the downside versus the -0.6% reading six months ago.",
        value: -1.4,
        label: "-1.4% YoY",
        direction: "bearish",
      },
    ],
    convergenceCount: 0,
    historicalContext:
      "Oregon shares California's bearish signal profile. 0/5 signals is the floor reading.",
    factors: [
      { name: "Inventory significantly above neutral", value: -12.4, category: "market" },
      { name: "Permit collapse (-24% YoY)", value: -10.8, category: "market" },
      { name: "HPI momentum accelerating lower", value: -8.4, category: "market" },
      { name: "Rate headwind", value: -6.2, category: "market" },
      { name: "Tech sector concentration risk", value: -4.8, category: "risk" },
      { name: "Relative affordability vs CA (minor positive)", value: 2.4, category: "deal" },
    ],
    metros: [
      { name: "Portland", score: 40, convergence: 0 },
      { name: "Eugene", score: 46, convergence: 1 },
      { name: "Bend", score: 48, convergence: 1 },
      { name: "Salem", score: 50, convergence: 2 },
    ],
    aiSummary:
      "Portland has the sharpest inventory build in this dataset — 6.2 months and rising. Permit collapse suggests supply will eventually correct but that is an 18-24 month lag.",
    aiDetail:
      "Oregon's weakness is concentrated in Portland but is spreading to secondary markets. The permit collapse is notable — it will prevent a supply glut from becoming a crisis, but it also means no new supply to absorb pent-up demand when rates eventually decline. The investment case for Oregon is a contrarian one: buy quality assets below replacement cost and hold through the rate cycle. Not a trade for most investors.",
    capitalFlow: "$0.3B net outflow",
  },
};

/* ═══════════════════════════════════════════════════════════════
   COMPARISON RADAR DATA
   Transforms MarketScore[] into RadarChart datum shape.
   ═══════════════════════════════════════════════════════════════ */

const RADAR_COLORS = [
  CHART_COLORS.gold,
  CHART_COLORS.emerald,
  "#818CF8", // indigo
  "#F472B6", // pink
  "#38BDF8", // sky
];

function buildRadarData(markets: MarketScore[]) {
  const dimensions = ["Score", "Supply", "Permits", "Employment", "Momentum"];
  return dimensions.map((dim) => {
    const row: Record<string, string | number> = { subject: dim };
    for (const m of markets) {
      if (dim === "Score") {
        row[m.stateCode] = m.score;
      } else {
        const key = dim.toLowerCase() as keyof typeof m.signals;
        const val = m.signals[key as keyof typeof m.signals];
        row[m.stateCode] = val === "bullish" ? 80 : val === "neutral" ? 50 : 20;
      }
    }
    return row;
  });
}

/* ═══════════════════════════════════════════════════════════════
   SCORE COLOR HELPER — mirrors CapitalFlowMap.scoreToColor
   ═══════════════════════════════════════════════════════════════ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function scoreToColor(score: number): string {
  if (score <= 30) return lerpColor("#7F1D1D", "#EF4444", score / 30);
  if (score <= 50) return lerpColor("#EF4444", "#F59E0B", (score - 30) / 20);
  if (score <= 70) return lerpColor("#F59E0B", "#C9A227", (score - 50) / 20);
  return lerpColor("#C9A227", "#10B981", (score - 70) / 30);
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/** Convergence dot row — reusable across the page */
function ConvergenceDots({
  count,
  total = 5,
  size = "sm",
}: {
  count: number;
  total?: number;
  size?: "sm" | "md";
}) {
  const dotSize = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${count} of ${total} bullish signals`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-block ${dotSize} rounded-full transition-all duration-300 ${
            i < count
              ? "bg-gold"
              : "bg-transparent border border-content-disabled"
          }`}
          style={i < count ? { boxShadow: "0 0 6px rgba(201,162,39,0.4)" } : undefined}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** Direction icon — bullish / bearish / neutral */
function DirectionIcon({
  direction,
  size = 14,
}: {
  direction: "bullish" | "bearish" | "neutral";
  size?: number;
}) {
  const cls = { width: size, height: size };
  if (direction === "bullish")
    return <TrendingUp style={cls} className="text-emerald-light" aria-hidden="true" />;
  if (direction === "bearish")
    return <TrendingDown style={cls} className="text-rose-light" aria-hidden="true" />;
  return <Minus style={cls} className="text-amber-light" aria-hidden="true" />;
}

/** Top metros grid inside the detail panel */
function MetrosGrid({ metros }: { metros: MetroEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {metros.map((metro) => (
        <div
          key={metro.name}
          className="flex items-center justify-between gap-2 bg-surface-elevated rounded-lg px-3 py-2"
        >
          <div className="min-w-0">
            <span className="text-[12px] font-medium text-content-primary truncate block">
              {metro.name}
            </span>
            <ConvergenceDots count={metro.convergence} total={5} size="sm" />
          </div>
          <span
            className="text-[14px] font-bold font-mono tabular-nums shrink-0"
            style={{ color: scoreToColor(metro.score) }}
            aria-label={`Score ${metro.score}`}
          >
            {metro.score}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Stat chip used in the header row of the detail panel */
function StatChip({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="section-label">{label}</span>
      <span
        className="text-[15px] font-bold font-mono tabular-nums text-content-primary"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/** Signal quick-grid — compact bullish/neutral/bearish grid for comparison header */
function SignalQuickGrid({
  signals,
}: {
  signals: MarketScore["signals"];
}) {
  const items: { key: keyof typeof signals; label: string }[] = [
    { key: "monthsOfSupply", label: "Supply" },
    { key: "permits", label: "Permits" },
    { key: "employment", label: "Employment" },
    { key: "rates", label: "Rates" },
    { key: "hpiMomentum", label: "HPI" },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map(({ key, label }) => (
        <div
          key={key}
          className="flex flex-col items-center gap-0.5"
          title={`${label}: ${signals[key]}`}
        >
          <DirectionIcon direction={signals[key]} size={11} />
          <span className="text-[9px] text-content-disabled leading-none">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL PANEL SKELETON
   ═══════════════════════════════════════════════════════════════ */

function DetailPanelSkeleton() {
  return (
    <div className="glass p-5 space-y-5" aria-busy="true" aria-label="Loading market detail">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
        <div className="skeleton h-10 w-20 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
      <div className="skeleton h-40 rounded-xl" />
      <div className="skeleton h-40 rounded-xl" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPARISON MODE — radar + side-by-side signal bars
   ═══════════════════════════════════════════════════════════════ */

function ComparisonPanel({
  markets,
  onRemove,
  onClear,
}: {
  markets: MarketScore[];
  onRemove: (code: string) => void;
  onClear: () => void;
}) {
  const radarData = useMemo(() => buildRadarData(markets), [markets]);
  const fmtPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  });

  return (
    <section
      className="glass p-5 space-y-5 animate-slide-up"
      aria-label="Market comparison"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-content-primary">
            Market Comparison{" "}
            <span className="text-gold font-mono">{markets.length}</span>
            <span className="text-content-disabled"> / 5</span>
          </h2>
          <p className="text-[11px] text-content-tertiary mt-0.5">
            Click states on the map to add — select up to 5
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-[11px] text-content-disabled hover:text-rose-light transition-colors flex items-center gap-1"
          aria-label="Clear all comparisons"
        >
          <X className="w-3 h-3" aria-hidden="true" />
          Clear all
        </button>
      </div>

      {/* Selected market chips */}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Selected markets">
        {markets.map((m, idx) => (
          <div
            key={m.stateCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border"
            role="listitem"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: RADAR_COLORS[idx] ?? CHART_COLORS.gold }}
              aria-hidden="true"
            />
            <span className="text-[12px] font-medium text-content-primary">{m.stateName}</span>
            <span className="text-[10px] font-mono text-content-disabled">{m.score}</span>
            <button
              onClick={() => onRemove(m.stateCode)}
              aria-label={`Remove ${m.stateName} from comparison`}
              className="text-content-disabled hover:text-rose-light transition-colors ml-0.5"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {markets.length >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Radar chart */}
          <div>
            <p className="section-label mb-3">5-Signal Radar</p>
            <div
              aria-label={`Radar chart comparing ${markets.map((m) => m.stateName).join(", ")}`}
            >
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} outerRadius={95}>
                  <PolarGrid stroke="#1F1F1F" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#666666", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: "#444444", fontSize: 9 }}
                  />
                  {markets.map((m, idx) => (
                    <Radar
                      key={m.stateCode}
                      name={m.stateName}
                      dataKey={m.stateCode}
                      stroke={RADAR_COLORS[idx] ?? CHART_COLORS.gold}
                      fill={RADAR_COLORS[idx] ?? CHART_COLORS.gold}
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                  ))}
                  <RechartsTooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: "#FAFAFA", fontSize: 11, fontWeight: 600 }}
                    itemStyle={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#666666", paddingTop: 8 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score + key metrics side-by-side */}
          <div className="space-y-2">
            <p className="section-label mb-3">Key Metrics</p>
            <table
              className="w-full text-[11px]"
              aria-label="Comparison metrics table"
            >
              <thead>
                <tr className="border-b border-surface-border">
                  <th scope="col" className="text-left pb-2 section-label">Market</th>
                  <th scope="col" className="text-right pb-2 section-label">Score</th>
                  <th scope="col" className="text-right pb-2 section-label hidden sm:table-cell">Price</th>
                  <th scope="col" className="text-right pb-2 section-label hidden sm:table-cell">YoY</th>
                  <th scope="col" className="text-left pb-2 section-label pl-3 hidden md:table-cell">Signals</th>
                </tr>
              </thead>
              <tbody>
                {[...markets]
                  .sort((a, b) => b.score - a.score)
                  .map((m, idx) => (
                    <tr
                      key={m.stateCode}
                      className="border-b border-surface-border/50"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: RADAR_COLORS[markets.indexOf(m)] ?? CHART_COLORS.gold }}
                            aria-hidden="true"
                          />
                          <span className="text-content-primary font-medium">{m.stateName}</span>
                        </div>
                      </td>
                      <td
                        className="py-2 text-right font-mono font-bold"
                        style={{ color: scoreToColor(m.score) }}
                      >
                        {m.score}
                      </td>
                      <td className="py-2 text-right font-mono text-content-secondary hidden sm:table-cell">
                        {fmtPrice.format(m.medianHomePrice)}
                      </td>
                      <td
                        className={`py-2 text-right font-mono hidden sm:table-cell ${
                          m.yoyAppreciation >= 0 ? "text-emerald-light" : "text-rose-light"
                        }`}
                      >
                        {m.yoyAppreciation >= 0 ? "+" : ""}
                        {m.yoyAppreciation.toFixed(1)}%
                      </td>
                      <td className="py-2 pl-3 hidden md:table-cell">
                        <SignalQuickGrid signals={m.signals} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* AI comparison narrative */}
            {markets.length >= 2 && (
              <div className="pt-3">
                <AiInsightStrip
                  summary={`${markets[0]?.stateName} leads with a score of ${markets[0]?.score} — ${markets[0]?.convergence}/5 signals bullish. ${markets.length > 1 ? `${markets[markets.length - 1]?.stateName} trails at ${markets[markets.length - 1]?.score}.` : ""}`}
                  confidence={(markets[0]?.convergence ?? 0) >= 4 ? "high" : (markets[0]?.convergence ?? 0) >= 3 ? "medium" : "low"}
                  sources={["FRED", "Census", "Redfin"]}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 text-[12px] text-content-disabled border border-dashed border-surface-border rounded-xl">
          Select at least 2 states on the map to compare
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATE DETAIL PANEL
   ═══════════════════════════════════════════════════════════════ */

function StateDetailPanel({
  market,
  detail,
  onClose,
}: {
  market: MarketScore;
  detail: StateDetail;
  onClose: () => void;
}) {
  const fmtPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  });
  const overallLabel =
    market.convergence >= 4 ? "BULLISH" :
    market.convergence >= 3 ? "MIXED BULLISH" :
    market.convergence >= 2 ? "NEUTRAL" : "BEARISH";

  const overallBadge =
    market.convergence >= 4 ? "badge-emerald" :
    market.convergence >= 3 ? "badge-amber" :
    "badge-rose";

  return (
    <section
      className="glass p-5 space-y-5 animate-slide-up"
      aria-label={`${market.stateName} market detail`}
      aria-live="polite"
    >
      {/* ── Panel header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "rgba(201,162,39,0.08)",
              border: "1px solid rgba(201,162,39,0.15)",
            }}
            aria-hidden="true"
          >
            <MapPin className="w-4 h-4 text-gold" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-content-primary font-display">
              {market.stateName}
            </h2>
            <p className="text-[11px] text-content-tertiary mt-0.5">{market.topMetro}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={overallBadge}>{overallLabel}</span>
          <button
            onClick={onClose}
            className="text-content-disabled hover:text-content-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded"
            aria-label={`Close ${market.stateName} detail panel`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Stat row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip
          label="Score"
          value={`${market.score}/100`}
          valueColor={scoreToColor(market.score)}
        />
        <div className="flex flex-col gap-0.5">
          <span className="section-label">Convergence</span>
          <div className="flex items-center gap-2 mt-0.5">
            <ConvergenceDots count={market.convergence} total={5} size="md" />
            <span className="text-[12px] font-mono text-content-disabled">
              {market.convergence}/5
            </span>
          </div>
        </div>
        <StatChip
          label="Median Price"
          value={fmtPrice.format(market.medianHomePrice)}
        />
        <StatChip
          label="YoY Apprec."
          value={`${market.yoyAppreciation >= 0 ? "+" : ""}${market.yoyAppreciation.toFixed(1)}%`}
          valueColor={market.yoyAppreciation >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose}
        />
      </div>

      {/* Capital flow callout */}
      {detail.capitalFlow && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: "rgba(201,162,39,0.05)",
            border: "1px solid rgba(201,162,39,0.12)",
          }}
          aria-label={`Capital flow: ${detail.capitalFlow}`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-gold shrink-0" aria-hidden="true" />
          <span className="text-[12px] text-gold-light font-medium">
            {detail.capitalFlow}
          </span>
          <span className="text-[11px] text-content-disabled">
            — net institutional capital
          </span>
        </div>
      )}

      {/* ── Signal convergence chart ── */}
      <SignalConvergenceChart
        signals={detail.signals}
        convergenceCount={detail.convergenceCount}
        historicalContext={detail.historicalContext}
        market={`${market.stateName} (${market.stateCode})`}
        defaultExpanded={false}
      />

      {/* ── Factor attribution chart ── */}
      <FactorAttributionChart
        factors={detail.factors}
        totalScore={market.score}
        maxScore={100}
        title="What's Driving This Score"
        initialVisible={6}
      />

      {/* ── Top metros ── */}
      <div>
        <p className="section-label mb-3">Top Metros</p>
        <MetrosGrid metros={detail.metros} />
      </div>

      {/* ── AI insight for this state ── */}
      <AiInsightStrip
        summary={detail.aiSummary}
        detail={detail.aiDetail}
        confidence={
          market.convergence >= 4 ? "high" :
          market.convergence >= 3 ? "medium" :
          "low"
        }
        sources={["FRED", "Census ACS", "Redfin", "BLS"]}
      />

      {/* ── Action row ── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/dashboard/discover?state=${market.stateCode}`}
          className="btn-primary btn-sm flex items-center gap-1.5"
          aria-label={`Find properties in ${market.stateName}`}
        >
          <BarChart2 className="w-3.5 h-3.5" aria-hidden="true" />
          Find Properties in {market.stateCode}
        </Link>
        <Link
          href={`/dashboard/compare?markets=${market.stateCode}`}
          className="btn-secondary btn-sm flex items-center gap-1.5"
          aria-label={`Compare ${market.stateName} with other markets`}
        >
          <Scale className="w-3.5 h-3.5" aria-hidden="true" />
          Compare Markets
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GLOBAL AI INSIGHT — page-level narrative
   ═══════════════════════════════════════════════════════════════ */

const GLOBAL_AI_SUMMARY =
  "The strongest signal cluster is in the Southeast — Tampa, Jacksonville, and Charlotte all show tight supply with accelerating permits. Avoid Denver and Portland — inventory is building fast.";

const GLOBAL_AI_DETAIL =
  "The 5-signal model is currently showing a bifurcated US housing market. The Southeast and Mountain South remain bullish: 4 of 5 signals positive in Texas, 3 of 5 in Florida, Tennessee, and North Carolina. The West Coast and Mountain West have flipped: California, Oregon, and Colorado are now 0-1 bullish signals — the worst readings in the dataset. The dividing line is affordability: markets where the median income supports the median mortgage payment at current rates are holding. Markets where it does not are correcting.";

/* ═══════════════════════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function MarketsPage() {
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStates, setCompareStates] = useState<string[]>([]);

  // Derived: selected MarketScore object
  const selectedMarket = useMemo(
    () => SAMPLE_MARKET_DATA.find((m) => m.stateCode === selectedStateCode) ?? null,
    [selectedStateCode],
  );

  // Derived: StateDetail for selected state
  const selectedDetail = selectedStateCode ? (STATE_DETAILS[selectedStateCode] ?? null) : null;

  // Derived: MarketScore objects for comparison
  const compareMarkets = useMemo(
    () => compareStates.map((code) => SAMPLE_MARKET_DATA.find((m) => m.stateCode === code)).filter(Boolean) as MarketScore[],
    [compareStates],
  );

  const handleStateSelect = useCallback(
    (code: string | null) => {
      if (!code) {
        setSelectedStateCode(null);
        return;
      }
      if (compareMode) {
        setCompareStates((prev) => {
          if (prev.includes(code)) return prev.filter((c) => c !== code);
          if (prev.length >= 5) return prev; // max 5
          return [...prev, code];
        });
        return;
      }
      setSelectedStateCode((prev) => (prev === code ? null : code));
    },
    [compareMode],
  );

  const handleToggleCompare = useCallback(() => {
    setCompareMode((v) => {
      if (!v) {
        // entering compare mode — seed with current selection if any
        if (selectedStateCode) setCompareStates([selectedStateCode]);
        setSelectedStateCode(null);
      } else {
        // leaving compare mode — clear comparison
        setCompareStates([]);
      }
      return !v;
    });
  }, [selectedStateCode]);

  const handleRemoveCompare = useCallback((code: string) => {
    setCompareStates((prev) => prev.filter((c) => c !== code));
  }, []);

  const handleClearCompare = useCallback(() => {
    setCompareStates([]);
  }, []);

  return (
    <div className="min-h-screen bg-luxury space-y-6 p-4 sm:p-6">

      {/* ── Page Header ── */}
      <header className="page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">
            Markets{" "}
            <span className="gold-gradient-text">Intelligence</span>
          </h1>
          <p className="page-subtitle">
            5-signal convergence model — where institutional capital is moving
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCompare}
            aria-pressed={compareMode}
            className={`btn-sm flex items-center gap-1.5 transition-all ${
              compareMode ? "btn-primary" : "btn-secondary"
            }`}
            aria-label={compareMode ? "Exit comparison mode" : "Enter comparison mode"}
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            {compareMode ? "Exit Compare" : "Compare"}
          </button>
          {compareMode && compareStates.length > 0 && (
            <span className="badge-gold">
              {compareStates.length} selected
            </span>
          )}
        </div>
      </header>

      {/* ── Capital Flow Map (lazy-loaded) ── */}
      <div className="chart-container">
        <CapitalFlowMap
          data={SAMPLE_MARKET_DATA}
          onStateSelect={handleStateSelect}
        />
      </div>

      {/* ── Global AI Insight ── */}
      <AiInsightStrip
        summary={GLOBAL_AI_SUMMARY}
        detail={GLOBAL_AI_DETAIL}
        confidence="high"
        sources={["FRED", "Census ACS", "Redfin", "BLS QCEW"]}
      />

      {/* ── Compare Mode Panel ── */}
      {compareMode && (
        <ComparisonPanel
          markets={compareMarkets}
          onRemove={handleRemoveCompare}
          onClear={handleClearCompare}
        />
      )}

      {/* ── State Detail Panel ── */}
      {!compareMode && selectedMarket && selectedDetail && (
        <StateDetailPanel
          market={selectedMarket}
          detail={selectedDetail}
          onClose={() => setSelectedStateCode(null)}
        />
      )}

      {/* ── Detail panel skeleton when state selected but no detail data ── */}
      {!compareMode && selectedMarket && !selectedDetail && (
        <DetailPanelSkeleton />
      )}

      {/* ── Empty state — no selection, not in compare mode ── */}
      {!compareMode && !selectedMarket && (
        <div
          className="glass p-6 text-center animate-fade-in"
          aria-label="No market selected"
        >
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "rgba(201,162,39,0.06)",
              border: "1px solid rgba(201,162,39,0.12)",
            }}
            aria-hidden="true"
          >
            <MapPin className="w-5 h-5 text-gold" aria-hidden="true" />
          </div>
          <p className="text-[13px] font-medium text-content-primary mb-1">
            Select a state to drill down
          </p>
          <p className="text-[12px] text-content-disabled max-w-xs mx-auto leading-relaxed">
            Click any highlighted state on the map to view signal breakdown, factor attribution, and top metros.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={handleToggleCompare}
              className="btn-ghost btn-sm flex items-center gap-1.5"
              aria-label="Switch to comparison mode"
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              Or compare markets side-by-side
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Data freshness footer ── */}
      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-surface-border">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse"
            aria-hidden="true"
          />
          <span className="text-[10px] text-content-disabled">
            Sample data — connect FRED + Census + Redfin APIs to go live
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-content-disabled">
          <Info className="w-3 h-3" aria-hidden="true" />
          <span>5-signal model: Supply · Permits · Employment · Rates · HPI Momentum</span>
        </div>
      </footer>
    </div>
  );
}
