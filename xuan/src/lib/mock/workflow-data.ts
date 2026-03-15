/**
 * Mock data and derived-metric helpers for the Investor Workflow page.
 * In production: replace with real API calls through data-sources.ts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketDef {
  name: string; state: string; zip: string; lat: number; lng: number;
  medianPrice: number; capRate: number; hyperScore: number;
  popGrowth: number; jobGrowth: number; inventory: number;
}

export type TimingVerdict = "BUY_NOW" | "FAVORABLE" | "NEUTRAL" | "WAIT";
export type RiskLevel = "minimal" | "low" | "moderate" | "elevated" | "high" | "critical";
export type FinalVerdict = "STRONG_BUY" | "BUY" | "LEAN_BUY" | "NEUTRAL" | "LEAN_PASS" | "PASS" | "HARD_PASS";

export interface SignalItem { name: string; dir: string; score: number; }
export interface CorrelationPair { pair: string; aligned: boolean; note: string; }
export interface SignalData {
  bullish: number; bearish: number; neutral: number;
  leading: SignalItem[]; concurrent: SignalItem[]; macro: SignalItem[];
  pairs: CorrelationPair[]; hasDivergence: boolean;
}
export interface TimingData { verdict: TimingVerdict; mortgageRate: string; fedFunds: string; rateDir: string; yieldCurve: string; seasonal: string; }
export interface RiskData { level: RiskLevel; reds: string[]; yellows: string[]; mitigations: string[]; }
export interface EngineVote { name: string; vote: "bullish" | "neutral" | "bearish"; score: number; }
export interface VerdictData { verdict: FinalVerdict; probability: number; confidence: number; engines: EngineVote[]; agreementLabel: string; agreement: number; }

export interface PortfolioProperty { address: string; city: string; state: string; value: number; cashFlow: number; capRate: number; }

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

export const ALL_MARKETS: MarketDef[] = [
  { name: "Austin", state: "TX", zip: "78701", lat: 30.27, lng: -97.74, medianPrice: 425000, capRate: 7.1, popGrowth: 3.8, jobGrowth: 4.2, inventory: 1.8, hyperScore: 82 },
  { name: "Nashville", state: "TN", zip: "37201", lat: 36.16, lng: -86.78, medianPrice: 385000, capRate: 6.5, popGrowth: 2.9, jobGrowth: 3.5, inventory: 2.1, hyperScore: 76 },
  { name: "Tampa", state: "FL", zip: "33601", lat: 27.95, lng: -82.46, medianPrice: 315000, capRate: 6.8, popGrowth: 2.5, jobGrowth: 2.8, inventory: 2.4, hyperScore: 68 },
  { name: "Phoenix", state: "AZ", zip: "85001", lat: 33.45, lng: -112.07, medianPrice: 365000, capRate: 5.8, popGrowth: 1.8, jobGrowth: 2.1, inventory: 3.2, hyperScore: 52 },
  { name: "Raleigh", state: "NC", zip: "27601", lat: 35.78, lng: -78.64, medianPrice: 380000, capRate: 6.9, popGrowth: 3.2, jobGrowth: 4.5, inventory: 1.6, hyperScore: 84 },
  { name: "Charlotte", state: "NC", zip: "28202", lat: 35.23, lng: -80.84, medianPrice: 355000, capRate: 6.3, popGrowth: 2.8, jobGrowth: 3.8, inventory: 2.0, hyperScore: 74 },
];

export const PORTFOLIO_PROPERTIES: PortfolioProperty[] = [
  { address: "1423 Cedar Ridge Dr", city: "Austin", state: "TX", value: 312000, cashFlow: 470, capRate: 7.2 },
  { address: "782 Oakwood Blvd", city: "Nashville", state: "TN", value: 241000, cashFlow: 390, capRate: 6.5 },
  { address: "3901 Pine Valley Ct", city: "Tampa", state: "FL", value: 205000, cashFlow: 280, capRate: 5.8 },
];

// ---------------------------------------------------------------------------
// Derived-metric helpers
// ---------------------------------------------------------------------------

export function confluenceScore(hs: number) { return Math.round(hs * 0.85 + 8); }
export function supplyVerdict(inv: number) { return inv < 2 ? "Tight" : inv < 3 ? "Balanced" : "Oversupplied"; }
export function demandVerdict(pg: number, jg: number) { return pg + jg > 5.5 ? "Strong" : pg + jg > 3.5 ? "Moderate" : "Weak"; }

export function borderColor(score: number) {
  return score > 65 ? "border-money-400/60" : score > 45 ? "border-gold-400/60" : "border-red-400/60";
}

export function buildSignals(hs: number): SignalData {
  const bullish = Math.round(hs * 0.75 + 5);
  const bearish = Math.round((100 - hs) * 0.4);
  const neutral = 100 - bullish - bearish;
  return {
    bullish, bearish, neutral,
    leading: [
      { name: "Building Permits", dir: hs > 65 ? "\u2191" : "\u2193", score: hs + 3 },
      { name: "Job Postings", dir: hs > 55 ? "\u2191" : "\u2192", score: hs - 2 },
      { name: "Migration Flow", dir: hs > 60 ? "\u2191" : "\u2192", score: hs + 1 },
    ],
    concurrent: [
      { name: "Median Price", dir: hs > 50 ? "\u2191" : "\u2193", score: hs },
      { name: "Days on Market", dir: hs > 60 ? "\u2193" : "\u2191", score: hs - 5 },
    ],
    macro: [
      { name: "Mortgage Rate", dir: "\u2192", score: 50 },
      { name: "CPI / Inflation", dir: "\u2193", score: 58 },
    ],
    pairs: [
      { pair: "Permits vs Price", aligned: hs > 55, note: hs > 55 ? "Both rising \u2014 supply responds to demand" : "Permits falling while prices rise \u2014 watch supply" },
      { pair: "Jobs vs Migration", aligned: hs > 50, note: hs > 50 ? "Job growth pulling migration \u2014 positive" : "Jobs flat but migration up \u2014 wage pressure risk" },
      { pair: "Inventory vs DOM", aligned: hs > 60, note: hs > 60 ? "Low inventory, quick sales \u2014 seller\u2019s market" : "Inventory rising with DOM \u2014 cooling" },
      { pair: "Rates vs Demand", aligned: true, note: "Demand holding despite rate environment" },
    ],
    hasDivergence: hs <= 55,
  };
}

export function getTimingVerdict(hs: number): TimingData {
  const month = new Date().getMonth();
  const seasonals = ["Slow \u2014 post-holiday", "Warming up", "Spring surge", "Peak season", "Peak season", "Peak season", "Competitive", "Back-to-school lull", "Fall opportunity", "Year-end deals", "Holiday slowdown", "Year-end deals"];
  const v: TimingVerdict = hs > 75 ? "BUY_NOW" : hs > 60 ? "FAVORABLE" : hs > 50 ? "NEUTRAL" : "WAIT";
  return { verdict: v, mortgageRate: "6.95%", fedFunds: "5.25%", rateDir: "Holding / slight cuts expected", yieldCurve: "Normalizing", seasonal: seasonals[month] };
}

export function getRiskLevel(hs: number): RiskData {
  const level: RiskLevel = hs >= 80 ? "minimal" : hs >= 70 ? "low" : hs >= 60 ? "moderate" : hs >= 50 ? "elevated" : "high";
  const reds: string[] = [];
  const yellows: string[] = [];
  if (hs < 50) reds.push("Market fundamentals below investment threshold");
  if (hs < 55) yellows.push("Job growth decelerating \u2014 monitor quarterly");
  if (hs < 65) yellows.push("Inventory trending up \u2014 buyer leverage increasing");
  const mitigations = ["Negotiate 5-10% below ask", "Include inspection contingency", "Lock rate within 2 weeks"];
  if (hs < 60) mitigations.push("Consider waiting for rate cut cycle");
  return { level, reds, yellows, mitigations };
}

export function riskBadgeVariant(level: RiskLevel) {
  if (level === "minimal" || level === "low") return "success" as const;
  if (level === "moderate") return "warning" as const;
  return "danger" as const;
}

export function getFinalVerdict(hs: number, propScore: number): VerdictData {
  const combined = (hs + propScore) / 2;
  const verdict: FinalVerdict = combined >= 80 ? "STRONG_BUY" : combined >= 70 ? "BUY" : combined >= 62 ? "LEAN_BUY" : combined >= 50 ? "NEUTRAL" : combined >= 40 ? "LEAN_PASS" : combined >= 30 ? "PASS" : "HARD_PASS";
  const probability = Math.round(combined * 0.95 + 3);
  const confidence = Math.round(65 + (hs / 100) * 25);
  const engines: EngineVote[] = [
    { name: "\u9F8D\u7A74 Dragon\u2019s Lair", vote: hs > 60 ? "bullish" : hs > 45 ? "neutral" : "bearish", score: hs },
    { name: "\u7389\u77F3 Jade Test", vote: propScore > 65 ? "bullish" : propScore > 45 ? "neutral" : "bearish", score: propScore },
    { name: "\u5730\u8108 Earth Veins", vote: combined > 60 ? "bullish" : "neutral", score: Math.round(combined + 5) },
    { name: "\u5929\u6642 Heaven\u2019s Timing", vote: hs > 55 ? "bullish" : "neutral", score: Math.round(hs * 0.9) },
    { name: "\u8B77\u6CD5 Guardian", vote: hs > 65 ? "bullish" : hs > 50 ? "neutral" : "bearish", score: Math.round(100 - (100 - hs) * 0.8) },
    { name: "\u904B\u52E2 Fortune\u2019s Momentum", vote: hs > 60 ? "bullish" : "neutral", score: Math.round(hs * 0.95) },
    { name: "\u5BB6\u696D Empire", vote: "bullish", score: 72 },
    { name: "\u5929\u610F Heaven\u2019s Will", vote: combined > 65 ? "bullish" : "neutral", score: Math.round(combined) },
  ];
  const agreement = engines.filter((e) => e.vote === "bullish").length;
  const agreementLabel = agreement >= 6 ? "Strong" : agreement >= 4 ? "Moderate" : "Weak";
  return { verdict, probability, confidence, engines, agreementLabel, agreement };
}

export function verdictColor(v: FinalVerdict) {
  if (v === "STRONG_BUY" || v === "BUY") return "text-money-400";
  if (v === "LEAN_BUY" || v === "NEUTRAL") return "text-gold-400";
  return "text-red-400";
}
