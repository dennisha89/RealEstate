"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Building2, Users, Briefcase, Home, Newspaper, ShieldCheck, ShieldAlert, AlertTriangle, DollarSign, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
} from "recharts";
import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  AiInsightCard,
  generateTimeSeries,
  seededRandom,
  fmtChartPct,
  ChartTooltipContent,
} from "@/components/charts/ChartTheme";
import {
  predictAppreciation,
  identifyDrivers,
  generateScenarios,
  predict1YearAppreciation,
  type AppreciationFeatures,
} from "@/lib/engines/appreciation-engine";
import {
  runBubbleDetection,
  US_NATIONAL_BASELINE,
  type BubbleDetectionResult,
} from "@/lib/engines/bubble-detection-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Signal = "Buy" | "Hold" | "Avoid";

interface MarketDetail {
  name: string;
  state: string;
  score: number;
  signal: Signal;
  capRate: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  medianPrice: number;
  rentGrowth: number;
  unemployment: number;
  gdpGrowth: number;
  medianAge: number;
  medianIncome: number;
  population: number;
  priceToRent: number;
  monthsSupply: number;
  majorEmployers: string[];
  aiInsight: string;
  news: { date: string; headline: string; impact: "positive" | "negative" | "neutral" }[];
  properties: { name: string; price: number; capRate: number; cashFlow: number; score: number }[];
  seeds: { score: number; capRate: number; popGrowth: number; jobGrowth: number; inventory: number };
}

// ---------------------------------------------------------------------------
// Market Database
// ---------------------------------------------------------------------------

const MARKET_DB: Record<string, MarketDetail> = {
  "austin-tx": {
    name: "Austin", state: "TX", score: 87, signal: "Buy",
    capRate: 5.8, popGrowth: 2.8, jobGrowth: 4.1, inventory: 2.3, medianPrice: 485000, rentGrowth: 3.2,
    unemployment: 3.1, gdpGrowth: 4.8, medianAge: 33, medianIncome: 82000, population: 978000,
    priceToRent: 21.4, monthsSupply: 2.3, majorEmployers: ["Tesla", "Apple", "Dell", "Oracle", "Google"],
    aiInsight: "Austin leads the leaderboard at 87 — driven by Tesla Gigafactory expansion and sustained tech migration. Population growth at 2.8% YoY outpaces national average 3x. Cap rate of 5.8% remains below the Sunbelt median but rent growth trajectory (+3.2% over 24mo) compensates. Inventory tightened from 3.1 to 2.3 months over the tracked period — a 26% compression that signals accelerating demand. Buy window narrows as institutional capital accelerates Q3 deployment.",
    news: [
      { date: "Mar 12", headline: "Tesla announces 2,000 new jobs at Austin Gigafactory expansion", impact: "positive" },
      { date: "Mar 8", headline: "Austin City Council approves 3,400-unit mixed-use development near Domain", impact: "neutral" },
      { date: "Feb 28", headline: "Apple completes $1B campus Phase 2 — 5,000 engineers relocated", impact: "positive" },
      { date: "Feb 14", headline: "Q4 median home price up 4.1% YoY — fastest appreciation in 6 quarters", impact: "positive" },
      { date: "Jan 30", headline: "I-35 expansion groundbreaking signals $4.2B infrastructure investment", impact: "positive" },
    ],
    properties: [
      { name: "Mueller District Duplex", price: 620000, capRate: 5.9, cashFlow: 3050, score: 84 },
      { name: "East Austin Triplex", price: 875000, capRate: 5.6, cashFlow: 4080, score: 81 },
      { name: "North Loop SFR", price: 445000, capRate: 6.1, cashFlow: 2260, score: 79 },
    ],
    seeds: { score: 1001, capRate: 1002, popGrowth: 1003, jobGrowth: 1004, inventory: 1005 },
  },
  "raleigh-nc": {
    name: "Raleigh", state: "NC", score: 84, signal: "Buy",
    capRate: 6.2, popGrowth: 3.1, jobGrowth: 4.5, inventory: 2.1, medianPrice: 395000, rentGrowth: 4.1,
    unemployment: 2.8, gdpGrowth: 5.1, medianAge: 35, medianIncome: 78000, population: 469000,
    priceToRent: 18.6, monthsSupply: 2.1, majorEmployers: ["Red Hat", "Cisco", "SAS Institute", "Duke University", "WakeMed"],
    aiInsight: "Raleigh punches above its weight class. The Research Triangle corridor delivers the highest job growth (4.5%) in our tracked universe at the lowest price point ($395K median). Rent growth of 4.1% over 24 months exceeds every other Buy-signal market. The 18.6 price-to-rent ratio is the most favorable in the dataset — cash flow positive at purchase in most scenarios. Risk: single-family inventory at 2.1 months means bidding pressure will compress yields on acquisition. Move before institutional Q3 deployment.",
    news: [
      { date: "Mar 10", headline: "Apple data center expansion brings 800 high-wage jobs to RTP corridor", impact: "positive" },
      { date: "Mar 3", headline: "NC State engineering enrollment +18% — 5-year rental demand pipeline grows", impact: "positive" },
      { date: "Feb 20", headline: "Durham-Raleigh corridor named #1 tech talent growth market by CBRE", impact: "positive" },
      { date: "Feb 7", headline: "Affordable housing ordinance passes — 15% inclusionary requirement on new builds", impact: "neutral" },
      { date: "Jan 22", headline: "Flood plain remapping adds 1,200 parcels to mandatory insurance zones", impact: "negative" },
    ],
    properties: [
      { name: "Cameron Village Duplex", price: 510000, capRate: 6.3, cashFlow: 2680, score: 87 },
      { name: "Five Points SFR", price: 385000, capRate: 6.5, cashFlow: 2080, score: 82 },
      { name: "Midtown Raleigh Townhome", price: 420000, capRate: 6.0, cashFlow: 2100, score: 78 },
    ],
    seeds: { score: 2001, capRate: 2002, popGrowth: 2003, jobGrowth: 2004, inventory: 2005 },
  },
  "tampa-fl": {
    name: "Tampa", state: "FL", score: 79, signal: "Hold",
    capRate: 6.5, popGrowth: 1.9, jobGrowth: 2.8, inventory: 3.4, medianPrice: 380000, rentGrowth: 1.8,
    unemployment: 3.4, gdpGrowth: 3.2, medianAge: 37, medianIncome: 68000, population: 407000,
    priceToRent: 19.8, monthsSupply: 3.4, majorEmployers: ["Raymond James", "WellCare", "Bloomin' Brands", "BayCare", "USAA"],
    aiInsight: "Tampa's 6.5% cap rate leads the Buy-signal markets on yield, but that yield premium exists for a reason. Insurance costs have risen 40%+ since 2022 for coastal and flood-adjacent parcels — effectively erasing 80-120bps of net yield. Rent growth decelerated from 4.2% to 1.8% over the tracked period. Our Hold signal reflects the bifurcated picture: inland properties (ZIP 33634+) still pencil; waterfront and barrier island exposure does not at current prices. Verify insurance costs at underwriting — not after.",
    news: [
      { date: "Mar 9", headline: "Citizens Insurance rate hike approved — Tampa coastal properties face +22% premiums", impact: "negative" },
      { date: "Mar 2", headline: "Port Tampa Bay reports record cargo volume — 1,400 logistics jobs added", impact: "positive" },
      { date: "Feb 18", headline: "Midtown Tampa mixed-use phase 3 approved — 800 new apartments coming 2026", impact: "neutral" },
      { date: "Feb 5", headline: "FEMA updates flood maps — 3,100 additional Tampa parcels enter high-risk zone", impact: "negative" },
      { date: "Jan 28", headline: "Amalie Arena district redevelopment announced — $2.4B investment over 10 years", impact: "positive" },
    ],
    properties: [
      { name: "Seminole Heights Duplex", price: 445000, capRate: 6.7, cashFlow: 2490, score: 76 },
      { name: "Ybor City Multifamily 4-unit", price: 620000, capRate: 6.4, cashFlow: 3310, score: 74 },
      { name: "Westchase SFR", price: 365000, capRate: 6.2, cashFlow: 1890, score: 71 },
    ],
    seeds: { score: 3001, capRate: 3002, popGrowth: 3003, jobGrowth: 3004, inventory: 3005 },
  },
  "phoenix-az": {
    name: "Phoenix", state: "AZ", score: 76, signal: "Hold",
    capRate: 5.9, popGrowth: 1.7, jobGrowth: 2.4, inventory: 4.1, medianPrice: 420000, rentGrowth: 0.9,
    unemployment: 3.7, gdpGrowth: 2.9, medianAge: 36, medianIncome: 72000, population: 1608000,
    priceToRent: 23.1, monthsSupply: 4.1, majorEmployers: ["Intel", "Banner Health", "Arizona State", "Honeywell", "Boeing"],
    aiInsight: "Phoenix built too many units in 2021-2023. Inventory sits at 4.1 months — the highest of any Hold market in our coverage — while rent growth has stalled to 0.9% over the tracked period. That said, Intel's Chandler campus expansion ($20B over 5 years) and the semiconductor supply chain buildout provide a credible 36-month demand thesis. Hold with a watch for inventory compression below 3.5 months as your re-entry signal. Current price-to-rent of 23.1x is above the threshold where cash flow is achievable without 25%+ down.",
    news: [
      { date: "Mar 11", headline: "Intel Chandler fab expansion adds 3,000 construction jobs in Q2", impact: "positive" },
      { date: "Mar 4", headline: "Phoenix single-family permits down 18% YoY — supply pipeline tightening", impact: "positive" },
      { date: "Feb 22", headline: "TSMC confirms 2nm fab on schedule — 4,500 permanent jobs by 2027", impact: "positive" },
      { date: "Feb 10", headline: "Colorado River water allocation cut 18% — long-term growth risk flagged", impact: "negative" },
      { date: "Jan 25", headline: "Median rent flat for 3rd consecutive quarter — oversupply absorbing demand", impact: "negative" },
    ],
    properties: [
      { name: "Tempe Near ASU Quadplex", price: 580000, capRate: 6.1, cashFlow: 2940, score: 74 },
      { name: "Chandler SFR (Intel Corridor)", price: 430000, capRate: 5.8, cashFlow: 2070, score: 71 },
      { name: "Mesa Duplex", price: 390000, capRate: 6.0, cashFlow: 1950, score: 68 },
    ],
    seeds: { score: 4001, capRate: 4002, popGrowth: 4003, jobGrowth: 4004, inventory: 4005 },
  },
  "nashville-tn": {
    name: "Nashville", state: "TN", score: 82, signal: "Buy",
    capRate: 5.4, popGrowth: 2.1, jobGrowth: 3.6, inventory: 2.8, medianPrice: 445000, rentGrowth: 2.7,
    unemployment: 2.9, gdpGrowth: 4.2, medianAge: 34, medianIncome: 80000, population: 715000,
    priceToRent: 22.3, monthsSupply: 2.8, majorEmployers: ["HCA Healthcare", "Vanderbilt", "Amazon", "AllianceBernstein", "Bridgestone"],
    aiInsight: "Nashville's diversified economy insulates against single-sector shocks. Healthcare (HCA, Vanderbilt), finance (AllianceBernstein's HQ relocation), and tech (Amazon Operations) create three independent demand pillars. Population growth of 2.1% is steady — not spectacular — but the 34-year median age means the rental-age cohort is growing faster than headline numbers suggest. Cap rate of 5.4% is the lowest in our Buy universe; underwrites best on small multifamily (2-4 units) near the medical corridor where rents are less cyclical than downtown.",
    news: [
      { date: "Mar 13", headline: "AllianceBernstein Nashville HQ reaches full occupancy — 2,000 finance jobs anchored", impact: "positive" },
      { date: "Mar 6", headline: "WeGo Public Transit BRT corridor approved — 14-mile route boosts East Nashville values", impact: "positive" },
      { date: "Feb 25", headline: "Short-term rental ordinance tightened — 400 STR permits revoked in Metro core", impact: "negative" },
      { date: "Feb 12", headline: "Vanderbilt Medical Center $1.1B expansion creates 1,800 permanent healthcare jobs", impact: "positive" },
      { date: "Jan 31", headline: "Q4 apartment absorption rate highest since 2019 — oversupply fears easing", impact: "positive" },
    ],
    properties: [
      { name: "East Nashville Duplex", price: 580000, capRate: 5.6, cashFlow: 2710, score: 83 },
      { name: "Germantown Mixed-Use", price: 720000, capRate: 5.3, cashFlow: 3180, score: 79 },
      { name: "Medical District SFR", price: 465000, capRate: 5.5, cashFlow: 2130, score: 76 },
    ],
    seeds: { score: 5001, capRate: 5002, popGrowth: 5003, jobGrowth: 5004, inventory: 5005 },
  },
  "charlotte-nc": {
    name: "Charlotte", state: "NC", score: 78, signal: "Hold",
    capRate: 6.0, popGrowth: 2.3, jobGrowth: 3.2, inventory: 2.9, medianPrice: 365000, rentGrowth: 2.1,
    unemployment: 3.2, gdpGrowth: 3.6, medianAge: 35, medianIncome: 74000, population: 925000,
    priceToRent: 20.1, monthsSupply: 2.9, majorEmployers: ["Bank of America", "Wells Fargo", "Truist", "Atrium Health", "Duke Energy"],
    aiInsight: "Charlotte is the banking capital of the South with $2.4T in assets headquartered here — but that concentration is also the risk. Financial sector employment has been flat-to-negative for 3 quarters as regional banks reduce headcount post-merger activity. Population growth (2.3%) and rent growth (2.1%) are healthy but not exceptional. The Hold signal reflects uncertainty in the employment base. If banking stabilizes and tech migration (Microsoft, Google have minor offices) accelerates, this flips to Buy. Watch Q2 banking employment numbers as the leading signal.",
    news: [
      { date: "Mar 7", headline: "Truist merger integration complete — 1,200 back-office roles eliminated in Charlotte", impact: "negative" },
      { date: "Mar 1", headline: "Charlotte Douglas Airport $3.1B expansion project breaks ground", impact: "positive" },
      { date: "Feb 23", headline: "South End light rail extension approved — 4.2-mile addition to Blue Line", impact: "positive" },
      { date: "Feb 9", headline: "Bank of America opens 500-person tech hub in uptown — FinTech pivot", impact: "positive" },
      { date: "Jan 27", headline: "Charlotte apartment vacancy rate rises to 8.2% — 3-year high in South End", impact: "negative" },
    ],
    properties: [
      { name: "NoDa Duplex", price: 430000, capRate: 6.2, cashFlow: 2220, score: 77 },
      { name: "Plaza Midwood SFR", price: 385000, capRate: 6.0, cashFlow: 1920, score: 74 },
      { name: "South End Condo (2BR)", price: 310000, capRate: 5.8, cashFlow: 1500, score: 71 },
    ],
    seeds: { score: 6001, capRate: 6002, popGrowth: 6003, jobGrowth: 6004, inventory: 6005 },
  },
  "dallas-tx": {
    name: "Dallas", state: "TX", score: 81, signal: "Buy",
    capRate: 5.6, popGrowth: 2.5, jobGrowth: 3.8, inventory: 3.2, medianPrice: 398000, rentGrowth: 2.4,
    unemployment: 3.3, gdpGrowth: 4.1, medianAge: 34, medianIncome: 79000, population: 1304000,
    priceToRent: 21.2, monthsSupply: 3.2, majorEmployers: ["AT&T", "Toyota", "Goldman Sachs", "JPMorgan Chase", "Deloitte"],
    aiInsight: "Dallas is the corporate relocation capital of 2023-2025. Goldman Sachs, JPMorgan, and Toyota anchored a wave that continues — 47 Fortune 500 HQ or regional HQ moves in 3 years. Inventory at 3.2 months is the outlier in the Buy universe; above the 3.0 threshold but directionality matters — it fell from 4.1 months 12 months ago. Job growth (3.8%) combined with the lowest state income tax in the coverage universe makes the demand case durable. Best entry: workforce housing ($350-450K) in Frisco, Prosper, and McKinney corridors where job access and school ratings converge.",
    news: [
      { date: "Mar 12", headline: "Goldman Sachs Dallas office reaches 5,000 employees — largest US office outside NY", impact: "positive" },
      { date: "Mar 5", headline: "DART Silver Line opens connecting DFW airport to Plano — 24 new stations", impact: "positive" },
      { date: "Feb 26", headline: "Texas relocation tax incentives extended through 2028 — corporate pipeline intact", impact: "positive" },
      { date: "Feb 13", headline: "North Dallas multifamily deliveries peak — 8,200 units coming Q1-Q2 2026", impact: "negative" },
      { date: "Jan 29", headline: "DFW named fastest-growing large metro by Census — 137,000 net new residents", impact: "positive" },
    ],
    properties: [
      { name: "Oak Cliff Duplex", price: 420000, capRate: 5.8, cashFlow: 2030, score: 80 },
      { name: "Uptown Dallas Condo", price: 485000, capRate: 5.5, cashFlow: 2220, score: 77 },
      { name: "Frisco SFR", price: 495000, capRate: 5.7, cashFlow: 2350, score: 82 },
    ],
    seeds: { score: 7001, capRate: 7002, popGrowth: 7003, jobGrowth: 7004, inventory: 7005 },
  },
  "atlanta-ga": {
    name: "Atlanta", state: "GA", score: 77, signal: "Hold",
    capRate: 6.4, popGrowth: 1.8, jobGrowth: 2.9, inventory: 3.6, medianPrice: 355000, rentGrowth: 1.6,
    unemployment: 3.9, gdpGrowth: 3.1, medianAge: 36, medianIncome: 71000, population: 506000,
    priceToRent: 19.4, monthsSupply: 3.6, majorEmployers: ["Delta Air Lines", "Home Depot", "UPS", "Coca-Cola", "NCR Voyix"],
    aiInsight: "Atlanta's 6.4% cap rate is the second-highest in the Hold universe — on paper, attractive. The detail is that rent growth has decelerated to 1.6% (from 4.8% in 2022) as suburban supply — particularly in Forsyth County and Cherokee County — absorbed migration demand. The film and media sector (Georgia offers a 30% production tax credit) creates a non-cyclical rental demand base near Trilith Studios in Fayetteville. Hold rather than Buy because the unemployment rate (3.9%) exceeds the national average — watch for BeltLine Phase 2 completion as the catalyst for intown appreciation.",
    news: [
      { date: "Mar 10", headline: "Microsoft AI campus in Smyrna breaks ground — 1,100 permanent jobs by 2027", impact: "positive" },
      { date: "Mar 3", headline: "BeltLine Westside Trail expansion approved — 3.2-mile extension adds 12 neighborhoods", impact: "positive" },
      { date: "Feb 21", headline: "Delta Air Lines trims Atlanta workforce by 4% — 1,800 roles cut", impact: "negative" },
      { date: "Feb 8", headline: "Trilith Studios Phase 4 opens — 400-acre expansion cements Atlanta as film capital", impact: "positive" },
      { date: "Jan 24", headline: "Intown Atlanta condo conversions accelerating — 1,400 office units entering rental market", impact: "negative" },
    ],
    properties: [
      { name: "Grant Park Duplex", price: 430000, capRate: 6.5, cashFlow: 2330, score: 76 },
      { name: "Kirkwood SFR", price: 380000, capRate: 6.3, cashFlow: 1990, score: 74 },
      { name: "Old Fourth Ward Condo", price: 325000, capRate: 6.1, cashFlow: 1650, score: 72 },
    ],
    seeds: { score: 8001, capRate: 8002, popGrowth: 8003, jobGrowth: 8004, inventory: 8005 },
  },
  "denver-co": {
    name: "Denver", state: "CO", score: 68, signal: "Avoid",
    capRate: 5.1, popGrowth: 0.9, jobGrowth: 1.2, inventory: 5.2, medianPrice: 525000, rentGrowth: -0.4,
    unemployment: 4.2, gdpGrowth: 2.1, medianAge: 37, medianIncome: 83000, population: 715000,
    priceToRent: 27.8, monthsSupply: 5.2, majorEmployers: ["Lockheed Martin", "DaVita", "Dish Network", "UCHealth", "Centura Health"],
    aiInsight: "Denver is the clearest Avoid in the coverage universe. The data is unambiguous: rent growth turned negative (-0.4% over 24 months), inventory hit 5.2 months (oversupply territory), and the price-to-rent ratio at 27.8x makes cash-flow-positive acquisition nearly impossible without 35%+ equity. What broke the thesis: Colorado's aggressive renter protection legislation (source-of-income protections, just-cause eviction requirements) elevated operating risk for landlords exactly as tech sector layoffs (data centers, fintech) softened rental demand. The 5.1% cap rate does not compensate for current operating risk. Wait for inventory to compress below 4.0 months and rent growth to return positive before re-engaging.",
    news: [
      { date: "Mar 11", headline: "Colorado SB 24-131 signed — statewide just-cause eviction requirement effective July 2026", impact: "negative" },
      { date: "Mar 4", headline: "Dish Network HQ employees finalize relocation to Texas — 1,800 jobs leave Denver", impact: "negative" },
      { date: "Feb 26", headline: "Denver apartment vacancy hits 9.8% — highest since 2010 financial crisis", impact: "negative" },
      { date: "Feb 11", headline: "National Western Complex $1B redevelopment approved — 15-year infrastructure play", impact: "neutral" },
      { date: "Jan 28", headline: "I-70 mountain corridor ski economy stable — but limited spillover to urban market", impact: "neutral" },
    ],
    properties: [
      { name: "RiNo Condo", price: 510000, capRate: 5.2, cashFlow: 1760, score: 62 },
      { name: "Capitol Hill Duplex", price: 580000, capRate: 5.0, cashFlow: 1920, score: 60 },
      { name: "Highlands SFR", price: 620000, capRate: 4.9, cashFlow: 2010, score: 58 },
    ],
    seeds: { score: 9001, capRate: 9002, popGrowth: 9003, jobGrowth: 9004, inventory: 9005 },
  },
  "las-vegas-nv": {
    name: "Las Vegas", state: "NV", score: 72, signal: "Hold",
    capRate: 6.7, popGrowth: 1.4, jobGrowth: 2.1, inventory: 4.5, medianPrice: 395000, rentGrowth: 1.2,
    unemployment: 4.6, gdpGrowth: 2.6, medianAge: 38, medianIncome: 65000, population: 641000,
    priceToRent: 22.6, monthsSupply: 4.5, majorEmployers: ["MGM Resorts", "Caesars", "Boyd Gaming", "Raiders/NFL", "Allegiant Airlines"],
    aiInsight: "Las Vegas offers the highest cap rate (6.7%) in the dataset but it prices in meaningful volatility. The hospitality-dependent employment base (MGM, Caesars, Boyd Gaming employ 18% of metro workers) creates a boom/bust rental demand pattern that correlates with tourism cycles. The Raiders stadium and new Oakland A's ballpark create a sports-economy demand segment that partially offsets cyclicality. Hold is appropriate at current prices. Entry strategy: target Henderson and Summerlin submarkets where the employment base is more diversified (healthcare, logistics) and cap rates are compressed 30-50bps below the metro average, reflecting lower volatility premium.",
    news: [
      { date: "Mar 8", headline: "Oakland A's Las Vegas ballpark breaks ground — $1.5B project creates 3,200 construction jobs", impact: "positive" },
      { date: "Mar 1", headline: "Las Vegas tourism revenue up 6.2% YoY — hospitality jobs recovering", impact: "positive" },
      { date: "Feb 20", headline: "Caesars Entertainment announces 900 job cuts at Palace and Horseshoe properties", impact: "negative" },
      { date: "Feb 6", headline: "I-15 expansion approved — Henderson corridor development potential increases", impact: "positive" },
      { date: "Jan 30", headline: "Short-term rental moratorium in effect for 90 days — 2,400 Airbnb listings affected", impact: "negative" },
    ],
    properties: [
      { name: "Henderson SFR", price: 385000, capRate: 6.8, cashFlow: 2180, score: 71 },
      { name: "Summerlin Duplex", price: 510000, capRate: 6.6, cashFlow: 2810, score: 69 },
      { name: "North Las Vegas Quadplex", price: 620000, capRate: 7.1, cashFlow: 3670, score: 74 },
    ],
    seeds: { score: 10001, capRate: 10002, popGrowth: 10003, jobGrowth: 10004, inventory: 10005 },
  },
};

// ---------------------------------------------------------------------------
// Appreciation Features per Market
// Calibrated to each market's real characteristics. In production these come
// from the data-pipeline engine; here they are deterministic mock values so
// the appreciation engine can run purely client-side with zero API calls.
// ---------------------------------------------------------------------------

const MARKET_FEATURES: Record<string, AppreciationFeatures> = {
  "austin-tx": {
    populationGrowthRate3yr: 2.8,
    medianIncomeGrowthRate3yr: 2.1,
    jobGrowthRate3yr: 4.1,
    buildingPermitsTrend: 0.8,
    monthsOfInventoryTrend: -0.8,   // tightening
    rentGrowthRate3yr: 3.2,
    schoolRatingChange: 0.3,
    crimeRateChange: -0.1,
    transitScoreChange: 0.5,
    majorEmployerEvents: 2,          // Tesla + Apple expansions
    zoningChangeImpact: 0.4,
    interestRateForecast: -0.25,
    walkScoreChange: 1.2,
    affordabilityIndex: 0.6,
    daysOnMarketTrend: -4.2,
    listToSaleRatioTrend: 0.02,
  },
  "raleigh-nc": {
    populationGrowthRate3yr: 3.1,
    medianIncomeGrowthRate3yr: 2.4,
    jobGrowthRate3yr: 4.5,
    buildingPermitsTrend: 0.6,
    monthsOfInventoryTrend: -1.0,
    rentGrowthRate3yr: 4.1,
    schoolRatingChange: 0.5,
    crimeRateChange: -0.2,
    transitScoreChange: 0.2,
    majorEmployerEvents: 1,
    zoningChangeImpact: 0.2,
    interestRateForecast: -0.25,
    walkScoreChange: 0.8,
    affordabilityIndex: 1.2,
    daysOnMarketTrend: -5.1,
    listToSaleRatioTrend: 0.03,
  },
  "tampa-fl": {
    populationGrowthRate3yr: 1.9,
    medianIncomeGrowthRate3yr: 1.4,
    jobGrowthRate3yr: 2.8,
    buildingPermitsTrend: 1.2,       // overbuilding risk
    monthsOfInventoryTrend: 0.6,     // rising
    rentGrowthRate3yr: 1.8,
    schoolRatingChange: 0.0,
    crimeRateChange: 0.1,            // slight increase
    transitScoreChange: 0.1,
    majorEmployerEvents: 0,
    zoningChangeImpact: 0.1,
    interestRateForecast: 0.0,
    walkScoreChange: 0.3,
    affordabilityIndex: 0.8,
    daysOnMarketTrend: 1.8,          // slowing
    listToSaleRatioTrend: -0.01,
  },
  "phoenix-az": {
    populationGrowthRate3yr: 1.7,
    medianIncomeGrowthRate3yr: 1.6,
    jobGrowthRate3yr: 2.4,
    buildingPermitsTrend: 1.8,       // oversupply
    monthsOfInventoryTrend: 1.4,
    rentGrowthRate3yr: 0.9,
    schoolRatingChange: 0.1,
    crimeRateChange: 0.0,
    transitScoreChange: 0.2,
    majorEmployerEvents: 1,          // Intel Chandler
    zoningChangeImpact: 0.3,
    interestRateForecast: 0.0,
    walkScoreChange: 0.4,
    affordabilityIndex: 0.5,
    daysOnMarketTrend: 3.2,
    listToSaleRatioTrend: -0.02,
  },
  "nashville-tn": {
    populationGrowthRate3yr: 2.1,
    medianIncomeGrowthRate3yr: 2.0,
    jobGrowthRate3yr: 3.6,
    buildingPermitsTrend: 0.5,
    monthsOfInventoryTrend: -0.4,
    rentGrowthRate3yr: 2.7,
    schoolRatingChange: 0.2,
    crimeRateChange: 0.0,
    transitScoreChange: 0.8,         // BRT corridor
    majorEmployerEvents: 2,          // AllianceBernstein + Vanderbilt
    zoningChangeImpact: 0.1,
    interestRateForecast: -0.25,
    walkScoreChange: 0.6,
    affordabilityIndex: 0.7,
    daysOnMarketTrend: -2.8,
    listToSaleRatioTrend: 0.01,
  },
  "charlotte-nc": {
    populationGrowthRate3yr: 2.3,
    medianIncomeGrowthRate3yr: 1.5,
    jobGrowthRate3yr: 3.2,
    buildingPermitsTrend: 0.7,
    monthsOfInventoryTrend: 0.2,
    rentGrowthRate3yr: 2.1,
    schoolRatingChange: 0.1,
    crimeRateChange: 0.0,
    transitScoreChange: 0.6,         // Blue Line extension
    majorEmployerEvents: 0,          // banking headwinds
    zoningChangeImpact: 0.2,
    interestRateForecast: 0.0,
    walkScoreChange: 0.3,
    affordabilityIndex: 1.0,
    daysOnMarketTrend: 0.8,
    listToSaleRatioTrend: 0.00,
  },
  "dallas-tx": {
    populationGrowthRate3yr: 2.5,
    medianIncomeGrowthRate3yr: 2.2,
    jobGrowthRate3yr: 3.8,
    buildingPermitsTrend: 0.9,
    monthsOfInventoryTrend: -0.9,    // tightening from 4.1
    rentGrowthRate3yr: 2.4,
    schoolRatingChange: 0.2,
    crimeRateChange: -0.1,
    transitScoreChange: 0.7,         // DART Silver Line
    majorEmployerEvents: 3,          // Goldman + JPM + Toyota
    zoningChangeImpact: 0.3,
    interestRateForecast: -0.25,
    walkScoreChange: 0.5,
    affordabilityIndex: 0.9,
    daysOnMarketTrend: -3.5,
    listToSaleRatioTrend: 0.02,
  },
  "atlanta-ga": {
    populationGrowthRate3yr: 1.8,
    medianIncomeGrowthRate3yr: 1.3,
    jobGrowthRate3yr: 2.9,
    buildingPermitsTrend: 1.1,
    monthsOfInventoryTrend: 0.4,
    rentGrowthRate3yr: 1.6,
    schoolRatingChange: 0.0,
    crimeRateChange: 0.2,            // elevated unemployment driving crime risk
    transitScoreChange: 0.4,         // BeltLine
    majorEmployerEvents: 0,
    zoningChangeImpact: 0.2,
    interestRateForecast: 0.0,
    walkScoreChange: 0.4,
    affordabilityIndex: 1.1,
    daysOnMarketTrend: 1.2,
    listToSaleRatioTrend: -0.01,
  },
  "denver-co": {
    populationGrowthRate3yr: 0.9,
    medianIncomeGrowthRate3yr: 0.8,
    jobGrowthRate3yr: 1.2,
    buildingPermitsTrend: 2.1,       // significant oversupply
    monthsOfInventoryTrend: 2.2,
    rentGrowthRate3yr: -0.4,
    schoolRatingChange: -0.1,
    crimeRateChange: 0.3,
    transitScoreChange: 0.1,
    majorEmployerEvents: -1,         // Dish Network departure
    zoningChangeImpact: 0.0,
    interestRateForecast: 0.25,      // rate headwind
    walkScoreChange: 0.1,
    affordabilityIndex: -0.5,
    daysOnMarketTrend: 5.8,
    listToSaleRatioTrend: -0.03,
  },
  "las-vegas-nv": {
    populationGrowthRate3yr: 1.4,
    medianIncomeGrowthRate3yr: 1.1,
    jobGrowthRate3yr: 2.1,
    buildingPermitsTrend: 0.8,
    monthsOfInventoryTrend: 0.9,
    rentGrowthRate3yr: 1.2,
    schoolRatingChange: -0.1,
    crimeRateChange: 0.1,
    transitScoreChange: 0.2,
    majorEmployerEvents: 1,          // A's stadium
    zoningChangeImpact: 0.1,
    interestRateForecast: 0.0,
    walkScoreChange: 0.2,
    affordabilityIndex: 0.6,
    daysOnMarketTrend: 2.1,
    listToSaleRatioTrend: -0.01,
  },
};

// Top 5 markets for cross-market comparison table (by score descending)
const COMPARISON_SLUGS = ["austin-tx", "raleigh-nc", "nashville-tn", "dallas-tx", "charlotte-nc"];

// ---------------------------------------------------------------------------
// Microeconomics Data — per market
// Shape mirrors the engine's MicroeconomicProfile output fields that matter
// for the UI. In production these come from analyzeMicroeconomics(); here we
// use calibrated mock values so the section renders with zero API calls.
// ---------------------------------------------------------------------------

interface MarketMicroData {
  medianHouseholdIncome: number;       // dollars
  incomeYoYChange: number;             // percent
  unemploymentRate: number;            // percent
  unemploymentYoYChange: number;       // percent, negative = improving
  costOfLivingIndex: number;           // 100 = national avg
  propertyTaxEffectiveRate: number;    // percent of assessed value
  rentToIncomeRatio: number;           // percent of gross income to rent
  housingAffordabilityIndex: number;   // 100 = median family can afford median home
  moneyVelocityScore: number;          // 0-100 from calculateMoneyVelocityScore
  capitalFlowDirection: "strong_inflow" | "inflow" | "neutral" | "outflow" | "strong_outflow";
  aiInsight: string;
  // 24-month income and home price series (index 100 = 24 months ago)
  incomeSeed: number;
  priceSeed: number;
}

const MICRO_DB: Record<string, MarketMicroData> = {
  "austin-tx": {
    medianHouseholdIncome: 85200,
    incomeYoYChange: 3.4,
    unemploymentRate: 3.1,
    unemploymentYoYChange: -0.3,
    costOfLivingIndex: 108,
    propertyTaxEffectiveRate: 1.81,
    rentToIncomeRatio: 28.4,
    housingAffordabilityIndex: 82,
    moneyVelocityScore: 78,
    capitalFlowDirection: "strong_inflow",
    aiInsight: "Austin's microeconomic fundamentals are being stress-tested by their own success. Household income at $85,200 (+3.4% YoY) is growing, but home prices are compounding 2x faster — the affordability index has fallen from 104 to 82 over 24 months, a 21% compression. Rent-to-income at 28.4% sits in the stretched zone, which historically caps rent growth above 4%. The saving grace: money velocity score of 78 confirms capital is still actively flowing in. The affordability ceiling is the primary risk to continued appreciation.",
    incomeSeed: 1101,
    priceSeed: 1102,
  },
  "raleigh-nc": {
    medianHouseholdIncome: 78400,
    incomeYoYChange: 3.8,
    unemploymentRate: 2.8,
    unemploymentYoYChange: -0.4,
    costOfLivingIndex: 96,
    propertyTaxEffectiveRate: 0.84,
    rentToIncomeRatio: 24.1,
    housingAffordabilityIndex: 104,
    moneyVelocityScore: 74,
    capitalFlowDirection: "inflow",
    aiInsight: "Raleigh's microeconomics are the cleanest in the coverage universe. Rent-to-income of 24.1% is below the affordability stress threshold, meaning there is 450–500bps of rent growth headroom before demand destruction sets in. Income is growing at 3.8% YoY — faster than rent — so the ratio is actually improving. The 0.84% property tax rate is the lowest in the dataset and directly adds 60–90bps to net yield vs higher-tax markets. Affordability index at 104 means the median household can still comfortably afford the median home.",
    incomeSeed: 2101,
    priceSeed: 2102,
  },
  "tampa-fl": {
    medianHouseholdIncome: 68500,
    incomeYoYChange: 2.1,
    unemploymentRate: 3.4,
    unemploymentYoYChange: 0.1,
    costOfLivingIndex: 99,
    propertyTaxEffectiveRate: 0.98,
    rentToIncomeRatio: 32.6,
    housingAffordabilityIndex: 78,
    moneyVelocityScore: 58,
    capitalFlowDirection: "neutral",
    aiInsight: "Tampa's rent-to-income ratio of 32.6% sits firmly in the stretched zone and is rising — income growth at 2.1% YoY is not keeping pace with prior rent appreciation. This explains the deceleration in rent growth from 4.2% to 1.8%: the market hit an affordability ceiling. Money velocity score of 58 has declined from 68 over 12 months, signaling capital is beginning to rotate to higher-velocity markets. Affordability index of 78 is the second-lowest in Hold markets and warrants underwriting conservatism.",
    incomeSeed: 3101,
    priceSeed: 3102,
  },
  "phoenix-az": {
    medianHouseholdIncome: 72100,
    incomeYoYChange: 2.4,
    unemploymentRate: 3.7,
    unemploymentYoYChange: 0.2,
    costOfLivingIndex: 104,
    propertyTaxEffectiveRate: 0.62,
    rentToIncomeRatio: 30.8,
    housingAffordabilityIndex: 76,
    moneyVelocityScore: 54,
    capitalFlowDirection: "neutral",
    aiInsight: "Phoenix's microeconomic picture is bifurcated between the semiconductor corridor (Chandler, Gilbert) and the broader metro. Overall rent-to-income at 30.8% is elevated and the affordability index at 76 reflects the 2021-2023 price run that income growth hasn't caught up to. The 0.62% property tax rate is the most landlord-friendly in the dataset — effectively adds 100–120bps to net yield. Money velocity at 54 is flat, consistent with the Hold thesis: capital is present but not accelerating.",
    incomeSeed: 4101,
    priceSeed: 4102,
  },
  "nashville-tn": {
    medianHouseholdIncome: 80300,
    incomeYoYChange: 3.1,
    unemploymentRate: 2.9,
    unemploymentYoYChange: -0.2,
    costOfLivingIndex: 101,
    propertyTaxEffectiveRate: 0.74,
    rentToIncomeRatio: 27.2,
    housingAffordabilityIndex: 86,
    moneyVelocityScore: 71,
    capitalFlowDirection: "inflow",
    aiInsight: "Nashville's microeconomic fundamentals support the Buy signal. Rent-to-income of 27.2% provides 350bps of growth headroom before hitting the 30% stress threshold. Income at $80,300 (+3.1% YoY) is growing in line with rents, maintaining the ratio rather than worsening it. The 0.74% property tax rate is the second-most landlord-friendly in Buy markets. Affordability index of 86 is healthy. Money velocity at 71 confirms active capital movement. The medical corridor (HCA/Vanderbilt) creates a non-cyclical rental demand base that supports the thesis through economic cycles.",
    incomeSeed: 5101,
    priceSeed: 5102,
  },
  "charlotte-nc": {
    medianHouseholdIncome: 74200,
    incomeYoYChange: 2.2,
    unemploymentRate: 3.2,
    unemploymentYoYChange: 0.1,
    costOfLivingIndex: 97,
    propertyTaxEffectiveRate: 0.88,
    rentToIncomeRatio: 29.1,
    housingAffordabilityIndex: 91,
    moneyVelocityScore: 63,
    capitalFlowDirection: "neutral",
    aiInsight: "Charlotte's microeconomics are solid but unremarkable — which explains the Hold signal. Rent-to-income of 29.1% is approaching the 30% stress threshold, but income growth at 2.2% YoY is barely keeping pace with rent growth of 2.1%. The 0.88% property tax rate is modest. What keeps this at Hold rather than Buy: money velocity at 63 has been flat for 3 quarters, and the affordability index of 91 masks concentration risk in the finance sector. Banking employment instability is the leading indicator to watch.",
    incomeSeed: 6101,
    priceSeed: 6102,
  },
  "dallas-tx": {
    medianHouseholdIncome: 79400,
    incomeYoYChange: 3.2,
    unemploymentRate: 3.3,
    unemploymentYoYChange: -0.1,
    costOfLivingIndex: 103,
    propertyTaxEffectiveRate: 1.69,
    rentToIncomeRatio: 26.8,
    housingAffordabilityIndex: 89,
    moneyVelocityScore: 72,
    capitalFlowDirection: "inflow",
    aiInsight: "Dallas shows strong microeconomic momentum with income growing at 3.2% YoY and rent-to-income at 26.8% — well below the stress threshold. The 1.69% property tax rate is the highest in the Buy universe and materially impacts NOI; underwriters should apply a 150bps haircut to gross yield to arrive at true net yield. Money velocity of 72 and strong_inflow capital direction confirm the corporate relocation wave is translating into real economic activity, not just headline announcements. Affordability index of 89 provides comfortable room for continued rent growth.",
    incomeSeed: 7101,
    priceSeed: 7102,
  },
  "atlanta-ga": {
    medianHouseholdIncome: 71200,
    incomeYoYChange: 1.8,
    unemploymentRate: 3.9,
    unemploymentYoYChange: 0.3,
    costOfLivingIndex: 95,
    propertyTaxEffectiveRate: 1.04,
    rentToIncomeRatio: 31.4,
    housingAffordabilityIndex: 83,
    moneyVelocityScore: 56,
    capitalFlowDirection: "neutral",
    aiInsight: "Atlanta's microeconomics reveal the tension in the Hold signal. Rent-to-income at 31.4% is above the 30% stress threshold — income growth at 1.8% YoY is not keeping pace with where rents were running in 2022-2023. The unemployment rate rising to 3.9% (+0.3 YoY) is the micro signal that matters most: it precedes rent deceleration by 2–3 quarters in historical data. The low 95 cost-of-living index creates an inbound migration case but only if job creation can absorb the arrivals. Money velocity at 56 and declining confirms the Hold thesis.",
    incomeSeed: 8101,
    priceSeed: 8102,
  },
  "denver-co": {
    medianHouseholdIncome: 83100,
    incomeYoYChange: 1.2,
    unemploymentRate: 4.2,
    unemploymentYoYChange: 0.5,
    costOfLivingIndex: 114,
    propertyTaxEffectiveRate: 0.55,
    rentToIncomeRatio: 37.8,
    housingAffordabilityIndex: 61,
    moneyVelocityScore: 38,
    capitalFlowDirection: "outflow",
    aiInsight: "Denver's microeconomics confirm the Avoid signal at every level. Rent-to-income at 37.8% is the highest in the dataset — a full 280bps above the unaffordable threshold. The affordability index at 61 means the median household cannot afford the median home, which directly limits buyer demand and puts a ceiling on renter-to-buyer conversion. Income grew only 1.2% YoY while cost of living index sits at 114 (14% above national average). Money velocity at 38 is the lowest in the coverage universe. Capital outflow direction reflects the institutional view that has been pricing into the market for 18 months.",
    incomeSeed: 9101,
    priceSeed: 9102,
  },
  "las-vegas-nv": {
    medianHouseholdIncome: 65400,
    incomeYoYChange: 1.9,
    unemploymentRate: 4.6,
    unemploymentYoYChange: 0.2,
    costOfLivingIndex: 101,
    propertyTaxEffectiveRate: 0.61,
    rentToIncomeRatio: 34.2,
    housingAffordabilityIndex: 74,
    moneyVelocityScore: 52,
    capitalFlowDirection: "neutral",
    aiInsight: "Las Vegas has the lowest median household income in the dataset at $65,400, and the rent-to-income ratio of 34.2% reflects that structural challenge. The hospitality-dependent income base means the ratio can swing 300–500bps in either direction depending on tourism volumes — a risk that doesn't show up in the point estimate. The 0.61% property tax rate (second-lowest) partially compensates. Money velocity at 52 is consistent with a market in transition: the A's stadium and sphere economics are beginning to show in early-stage capital flows, but the base income problem limits how far rents can run.",
    incomeSeed: 10101,
    priceSeed: 10102,
  },
};

// ---------------------------------------------------------------------------
// Bubble Detection — per-market mock inputs
//
// PTI = medianHomePrice / medianHouseholdIncome
// Target composite z-scores (task spec):
//   Austin 1.8σ, Denver 2.4σ, Raleigh 0.9σ, Tampa 1.2σ, Phoenix 1.6σ
//
// Back-derived using US_NATIONAL_BASELINE (PTI mean=5.3, stdDev=1.0):
//   PTI current = mean + targetPtiZScore * stdDev
//   medianHomePrice = PTI_current * medianHouseholdIncome
// Historical stats use the national baseline for simplicity.
// ---------------------------------------------------------------------------

interface BubbleInputRow {
  /** PTI z-score for the market (drives composite score) */
  ptiZScore: number;
  /** PTR z-score */
  ptrZScore: number;
  /** Credit gap z-score (BIS methodology) */
  creditGapZScore: number;
  /** PTI annual change (velocity signal) */
  ptiAnnualChange: number;
}

const BUBBLE_INPUTS: Record<string, BubbleInputRow> = {
  "austin-tx":    { ptiZScore: 1.8, ptrZScore: 1.5, creditGapZScore: 0.8, ptiAnnualChange: 0.3 },
  "denver-co":    { ptiZScore: 2.4, ptrZScore: 2.1, creditGapZScore: 1.1, ptiAnnualChange: 0.4 },
  "raleigh-nc":   { ptiZScore: 0.9, ptrZScore: 0.7, creditGapZScore: 0.2, ptiAnnualChange: 0.1 },
  "tampa-fl":     { ptiZScore: 1.2, ptrZScore: 1.0, creditGapZScore: 0.5, ptiAnnualChange: 0.2 },
  "phoenix-az":   { ptiZScore: 1.6, ptrZScore: 1.4, creditGapZScore: 0.7, ptiAnnualChange: 0.3 },
  "nashville-tn": { ptiZScore: 1.4, ptrZScore: 1.2, creditGapZScore: 0.6, ptiAnnualChange: 0.25 },
  "charlotte-nc": { ptiZScore: 1.1, ptrZScore: 0.9, creditGapZScore: 0.3, ptiAnnualChange: 0.15 },
  "dallas-tx":    { ptiZScore: 1.3, ptrZScore: 1.1, creditGapZScore: 0.5, ptiAnnualChange: 0.2 },
  "atlanta-ga":   { ptiZScore: 1.0, ptrZScore: 0.8, creditGapZScore: 0.3, ptiAnnualChange: 0.1 },
  "las-vegas-nv": { ptiZScore: 1.5, ptrZScore: 1.3, creditGapZScore: 0.6, ptiAnnualChange: 0.2 },
};

/**
 * Build a BubbleDetectionResult for a market from pre-calibrated z-score targets.
 * We construct synthetic inputs whose ratios hit the target z-scores exactly by
 * solving: current = mean + zScore * stdDev.
 */
function buildBubbleResult(slug: string, market: MarketDetail | undefined): BubbleDetectionResult | null {
  if (!market) return null;
  const row = BUBBLE_INPUTS[slug];
  if (!row) return null;

  const ptiMean = US_NATIONAL_BASELINE.pti.mean;
  const ptiStdDev = US_NATIONAL_BASELINE.pti.stdDev;
  const ptrMean = US_NATIONAL_BASELINE.ptr.mean;
  const ptrStdDev = US_NATIONAL_BASELINE.ptr.stdDev;
  const cgMean = US_NATIONAL_BASELINE.creditGap.mean;
  const cgStdDev = US_NATIONAL_BASELINE.creditGap.stdDev;

  // Solve for inputs that produce the target z-scores
  const ptiCurrent = ptiMean + row.ptiZScore * ptiStdDev;
  const ptrCurrent = ptrMean + row.ptrZScore * ptrStdDev;

  // Back-compute medianHomePrice and medianMonthlyRent from ratios
  const medianHouseholdIncome = market.medianIncome;
  const medianHomePrice = Math.round(ptiCurrent * medianHouseholdIncome);
  const annualRent = medianHomePrice / ptrCurrent;
  const medianMonthlyRent = Math.round(annualRent / 12);

  // Credit gap: cgGap = cgMean + row.creditGapZScore * cgStdDev
  const mortgageGrowth = cgMean + row.creditGapZScore * cgStdDev + 2.8; // 2.8% GDP base
  const gdpGrowth = 2.8;

  // PTI one year ago = current PTI minus annualChange
  const ptiOneYearAgo = ptiCurrent - row.ptiAnnualChange;

  return runBubbleDetection({
    medianHomePrice,
    medianHouseholdIncome,
    medianMonthlyRent,
    ptiHistoricalStats: { mean: ptiMean, stdDev: ptiStdDev },
    ptrHistoricalStats: { mean: ptrMean, stdDev: ptrStdDev },
    creditGap: {
      mortgageDebtGrowthPct: mortgageGrowth,
      gdpGrowthPct: gdpGrowth,
      historicalGapMean: cgMean,
      historicalGapStdDev: cgStdDev,
    },
    ptiOneYearAgo,
    market: `${market.name}, ${market.state}`,
  });
}

/**
 * Generate a 24-month historical composite z-score series for the AreaChart.
 * Uses a seeded PRNG so the chart is deterministic per market.
 * The series ends at the current z-score computed by the engine.
 */
function generateBubbleZScoreHistory(
  currentZScore: number,
  seedBase: number
): { month: string; zScore: number }[] {
  const rng = seededRandom(seedBase);
  const result: { month: string; zScore: number }[] = [];
  const now = new Date();

  // Walk backwards from 24 months ago up to now, ending at currentZScore
  // Drift: slightly upward trend toward currentZScore from a lower starting point
  const startZScore = Math.max(0, currentZScore - 0.8 - rng() * 0.6);

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    // Linear interpolation from start to current + noise
    const t = (23 - i) / 23;
    const base = startZScore + t * (currentZScore - startZScore);
    const noise = (rng() - 0.5) * 0.3;
    const zScore = Math.max(0, Math.round((base + noise) * 100) / 100);
    result.push({ month: label, zScore });
  }
  // Force last point to exactly the current z-score
  if (result.length > 0) {
    result[result.length - 1] = { month: result[result.length - 1]!.month, zScore: currentZScore };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugToMarket(slug: string): { name: string; stateAbbr: string } {
  const parts = slug.split("-");
  const stateAbbr = (parts[parts.length - 1] ?? "").toUpperCase();
  const nameParts = parts.slice(0, -1).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return { name: nameParts.join(" "), stateAbbr };
}

function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-light";
  if (n >= 70) return "text-amber-light";
  return "text-rose-light";
}

function scoreBg(n: number) {
  if (n >= 80) return "bg-emerald/20";
  if (n >= 70) return "bg-amber/20";
  return "bg-rose/20";
}

function signalBadge(s: Signal) {
  if (s === "Buy") return "badge-emerald";
  if (s === "Hold") return "badge-amber";
  return "badge-rose";
}

function impactBadge(impact: "positive" | "negative" | "neutral") {
  if (impact === "positive") return "badge-emerald";
  if (impact === "negative") return "badge-rose";
  return "badge-gold";
}

function impactLabel(impact: "positive" | "negative" | "neutral") {
  if (impact === "positive") return "POSITIVE";
  if (impact === "negative") return "NEGATIVE";
  return "NEUTRAL";
}

function formatCurrency(v: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(v);
}

// ---------------------------------------------------------------------------
// Dimension config
// ---------------------------------------------------------------------------

const DIMENSIONS = [
  { key: "score",     label: "Score",     color: CHART_COLORS.gold,       yAxis: "right", fmt: (v: number) => String(Math.round(v)) },
  { key: "capRate",   label: "Cap Rate",  color: CHART_COLORS.emerald,    yAxis: "left",  fmt: fmtChartPct },
  { key: "popGrowth", label: "Pop %",     color: CHART_COLORS.amber,      yAxis: "left",  fmt: fmtChartPct },
  { key: "jobGrowth", label: "Jobs %",    color: "#A78BFA" /* purple */,  yAxis: "left",  fmt: fmtChartPct },
  { key: "inventory", label: "Inventory", color: CHART_COLORS.rose,       yAxis: "left",  fmt: (v: number) => `${v.toFixed(1)}mo` },
] as const;

type DimKey = (typeof DIMENSIONS)[number]["key"];

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function MultiDimTooltip({
  active,
  payload,
  label,
  visibleDims,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
  visibleDims: Set<DimKey>;
}) {
  if (!active || !payload?.length) return null;
  const items = DIMENSIONS.filter((d) => visibleDims.has(d.key))
    .map((d) => {
      const entry = payload.find((p) => p.dataKey === d.key);
      return entry
        ? { name: d.label, value: d.fmt(entry.value), color: d.color }
        : null;
    })
    .filter(Boolean) as { name: string; value: string; color: string }[];

  return <ChartTooltipContent label={label} items={items} />;
}

// ---------------------------------------------------------------------------
// Mini sparkline (SVG, no recharts overhead)
// ---------------------------------------------------------------------------

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 64;
  const H = 24;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Microeconomics helper components
// ---------------------------------------------------------------------------

/** SVG arc gauge — shows rent-to-income ratio with affordability zones */
function RentToIncomeGauge({ ratio }: { ratio: number }) {
  // Gauge goes 0–50%, displayed as 180° sweep
  const clampedRatio = Math.max(0, Math.min(50, ratio));
  const pct = clampedRatio / 50; // 0..1
  const RADIUS = 60;
  const CX = 80;
  const CY = 80;
  const START_ANGLE = 180; // degrees, left
  const SWEEP = 180;       // degrees
  function polarToXY(deg: number, r: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }
  function arcPath(startDeg: number, endDeg: number, r: number) {
    const s = polarToXY(startDeg, r);
    const e = polarToXY(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }
  // Needle tip angle: 180° (left) = 0%, 0° (right) = 50%
  const needleAngleDeg = START_ANGLE + pct * SWEEP;
  const needleTip = polarToXY(needleAngleDeg, RADIUS - 6);
  const needleBase1 = polarToXY(needleAngleDeg + 90, 6);
  const needleBase2 = polarToXY(needleAngleDeg - 90, 6);

  const color = ratio < 25
    ? CHART_COLORS.emerald
    : ratio <= 35
    ? CHART_COLORS.amber
    : CHART_COLORS.rose;

  const label = ratio < 25 ? "Affordable" : ratio <= 35 ? "Stretched" : "Unaffordable";

  return (
    <div className="flex flex-col items-center" aria-label={`Rent-to-income ratio: ${ratio.toFixed(1)}%, ${label}`}>
      <svg width={160} height={95} viewBox="0 0 160 95" aria-hidden="true">
        {/* Background track */}
        <path
          d={arcPath(180, 360, RADIUS)}
          fill="none"
          stroke={CHART_COLORS.border}
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* Affordable zone 0–25% = 0°–90° sweep */}
        <path
          d={arcPath(180, 270, RADIUS)}
          fill="none"
          stroke={CHART_COLORS.emerald}
          strokeOpacity={0.25}
          strokeWidth={12}
          strokeLinecap="butt"
        />
        {/* Stretched zone 25–35% = 90°–126° sweep */}
        <path
          d={arcPath(270, 306, RADIUS)}
          fill="none"
          stroke={CHART_COLORS.amber}
          strokeOpacity={0.25}
          strokeWidth={12}
          strokeLinecap="butt"
        />
        {/* Unaffordable zone 35–50% = 126°–180° sweep */}
        <path
          d={arcPath(306, 360, RADIUS)}
          fill="none"
          stroke={CHART_COLORS.rose}
          strokeOpacity={0.25}
          strokeWidth={12}
          strokeLinecap="butt"
        />
        {/* Filled arc up to current value */}
        <path
          d={arcPath(180, 180 + pct * 180, RADIUS)}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={color}
          opacity={0.9}
        />
        <circle cx={CX} cy={CY} r={5} fill={CHART_COLORS.surface} stroke={color} strokeWidth={2} />
        {/* Zone labels */}
        <text x="20" y="90" fontSize="9" fill={CHART_COLORS.emerald} textAnchor="middle" fontFamily="JetBrains Mono, monospace">25%</text>
        <text x="80" y="16" fontSize="9" fill={CHART_COLORS.amber} textAnchor="middle" fontFamily="JetBrains Mono, monospace">35%</text>
        <text x="140" y="90" fontSize="9" fill={CHART_COLORS.rose} textAnchor="middle" fontFamily="JetBrains Mono, monospace">50%</text>
      </svg>
      {/* Center value */}
      <p className="font-mono font-bold tabular-nums text-3xl -mt-4" style={{ color }}>{ratio.toFixed(1)}%</p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color }}>{label}</p>
      <p className="text-[10px] text-content-disabled mt-0.5">of gross income to rent</p>
    </div>
  );
}

/** Compact metric card with trend arrow and sparkline */
function MicroMetricCard({
  label,
  value,
  sub,
  trendPct,
  sparkData,
  sparkColor,
  ariaLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  trendPct: number;
  sparkData: number[];
  sparkColor: string;
  ariaLabel: string;
}) {
  const isPositive = trendPct >= 0;
  const TrendIcon = Math.abs(trendPct) < 0.1
    ? Minus
    : isPositive
    ? TrendingUp
    : TrendingDown;
  const trendColor = isPositive ? "text-emerald-light" : "text-rose-light";

  return (
    <div className="card" aria-label={ariaLabel}>
      <p className="metric-label mb-1.5">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-mono font-bold tabular-nums text-[18px] text-content-primary leading-none">{value}</p>
          {sub && <p className="text-[10px] text-content-disabled mt-1">{sub}</p>}
        </div>
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
      <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
        <TrendIcon className="w-3 h-3" aria-hidden="true" />
        <span className="text-[11px] font-mono tabular-nums">
          {isPositive ? "+" : ""}{trendPct.toFixed(1)}% YoY
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const market = MARKET_DB[slug];
  const { name: fallbackName, stateAbbr } = slugToMarket(slug);
  const displayName = market ? `${market.name}, ${market.state}` : `${fallbackName}, ${stateAbbr}`;

  // Dimension toggles — all on by default
  const [visibleDims, setVisibleDims] = useState<Set<DimKey>>(
    new Set(DIMENSIONS.map((d) => d.key))
  );

  function toggleDim(key: DimKey) {
    setVisibleDims((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Keep at least one visible
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Build merged 24-month time series
  const chartData = useMemo(() => {
    if (!market) return [];
    const s = market.seeds;

    const scoreSeries   = generateTimeSeries(24, market.score,    8,    0.02, s.score);
    const capSeries     = generateTimeSeries(24, market.capRate,  0.4,  0.005, s.capRate);
    const popSeries     = generateTimeSeries(24, market.popGrowth, 0.3, 0.001, s.popGrowth);
    const jobSeries     = generateTimeSeries(24, market.jobGrowth, 0.4, 0.002, s.jobGrowth);
    const invSeries     = generateTimeSeries(24, market.inventory, 0.3, -0.005, s.inventory);

    return scoreSeries.map((pt, i) => ({
      month:     pt.month,
      score:     Math.max(0, Math.min(100, pt.value)),
      capRate:   Math.max(0, capSeries[i]?.value ?? 0),
      popGrowth: popSeries[i]?.value ?? 0,
      jobGrowth: jobSeries[i]?.value ?? 0,
      inventory: Math.max(0, invSeries[i]?.value ?? 0),
    }));
  }, [market]);

  // Appreciation engine output — pure computation, no API
  const appreciationData = useMemo(() => {
    const features = MARKET_FEATURES[slug];
    if (!features) return null;
    const prediction = predictAppreciation(features, 82);
    const drivers = identifyDrivers(features).slice(0, 8);
    const base1yr = predict1YearAppreciation(features);
    const scenarios = generateScenarios(features, base1yr);
    return { prediction, drivers, scenarios };
  }, [slug]);

  // Cap rate history (24 months) + 12-month forward forecast for AreaChart
  const capRateForecastData = useMemo(() => {
    if (!market) return [];
    const s = market.seeds;
    // Historical: 24 months (last month = "Today")
    const historical = generateTimeSeries(24, market.capRate, 0.4, 0.005, s.capRate);
    // Forward: 12 months, slight trend from engine prediction
    const oneYrPred = appreciationData?.prediction.oneYear.predicted ?? 0;
    // Higher predicted appreciation -> cap rate compresses slightly
    const capRateTrend = oneYrPred > 5 ? -0.008 : oneYrPred > 2 ? -0.003 : 0.004;
    const todayValue = historical[historical.length - 1]?.value ?? market.capRate;
    const forecast = generateTimeSeries(12, todayValue, 0.15, capRateTrend, s.capRate + 9999);
    // Confidence band: ±0.3% around forecast
    const result: { month: string; actual?: number; forecastMid?: number; forecastLow?: number; forecastHigh?: number; isForecast?: boolean }[] = [
      ...historical.map((pt) => ({ month: pt.month, actual: pt.value })),
      // Bridge point so lines connect
      { month: historical[historical.length - 1]?.month ?? "", actual: todayValue, forecastMid: todayValue, forecastLow: todayValue - 0.3, forecastHigh: todayValue + 0.3, isForecast: true },
      ...forecast.slice(1).map((pt) => ({
        month: pt.month,
        forecastMid: pt.value,
        forecastLow: Math.round((pt.value - 0.3) * 100) / 100,
        forecastHigh: Math.round((pt.value + 0.3) * 100) / 100,
        isForecast: true,
      })),
    ];
    return result;
  }, [market, appreciationData, slug]);

  // Label of the "Today" month (last historical point) for the reference line
  // capRateForecastData[23] is the final historical point; bridge is at [24]
  const todayLabel = capRateForecastData[23]?.month ?? "";

  // Sparkline data for fundamentals cards
  const sparkData = useMemo(() => {
    if (!market) return {};
    const s = market.seeds;
    return {
      price:    generateTimeSeries(12, market.medianPrice, market.medianPrice * 0.02, 0.01, s.score + 100).map((d) => d.value),
      rent:     generateTimeSeries(12, market.rentGrowth,  0.3, 0.005, s.capRate + 100).map((d) => d.value),
      jobs:     generateTimeSeries(12, market.jobGrowth,   0.3, 0.002, s.jobGrowth + 100).map((d) => d.value),
      pop:      generateTimeSeries(12, market.popGrowth,   0.2, 0.001, s.popGrowth + 100).map((d) => d.value),
      inv:      generateTimeSeries(12, market.inventory,   0.2, -0.003, s.inventory + 100).map((d) => d.value),
      income:   generateTimeSeries(12, market.medianIncome, market.medianIncome * 0.015, 0.008, s.score + 200).map((d) => d.value),
    };
  }, [market]);

  // Microeconomics computed data
  const microData = MICRO_DB[slug] ?? null;

  // 24-month income vs home price dual-axis series
  const incomeVsPriceData = useMemo(() => {
    if (!microData || !market) return [];
    // Index both to 100 at month 0 so the chart shows relative growth rates
    const incomeSeries = generateTimeSeries(24, microData.medianHouseholdIncome, microData.medianHouseholdIncome * 0.008, microData.incomeYoYChange / 100, microData.incomeSeed);
    const priceSeries  = generateTimeSeries(24, market.medianPrice, market.medianPrice * 0.018, 0.012, microData.priceSeed);
    return incomeSeries.map((pt, i) => ({
      month: pt.month,
      income: Math.round(pt.value),
      price: Math.round(priceSeries[i]?.value ?? market.medianPrice),
      // Flag squeeze months where price growth > income growth (both relative to month-0)
      squeeze: (priceSeries[i]?.value ?? market.medianPrice) / (priceSeries[0]?.value ?? market.medianPrice) >
               pt.value / (incomeSeries[0]?.value ?? microData.medianHouseholdIncome) + 0.02,
    }));
  }, [microData, market]);

  // 12-month sparklines for microeconomics metric cards
  const microSparkData = useMemo(() => {
    if (!microData) return {};
    return {
      income:        generateTimeSeries(12, microData.medianHouseholdIncome, microData.medianHouseholdIncome * 0.008, microData.incomeYoYChange / 100, microData.incomeSeed + 1).map((d) => d.value),
      unemployment:  generateTimeSeries(12, microData.unemploymentRate, 0.15, microData.unemploymentYoYChange / 100, microData.incomeSeed + 2).map((d) => d.value),
      col:           generateTimeSeries(12, microData.costOfLivingIndex, 0.5, 0.002, microData.priceSeed + 1).map((d) => d.value),
      propTax:       generateTimeSeries(12, microData.propertyTaxEffectiveRate, 0.02, 0.001, microData.priceSeed + 2).map((d) => d.value),
      rti:           generateTimeSeries(12, microData.rentToIncomeRatio, 0.4, microData.incomeYoYChange < microData.incomeYoYChange ? 0.002 : -0.001, microData.incomeSeed + 3).map((d) => d.value),
      affordability: generateTimeSeries(12, microData.housingAffordabilityIndex, 2, -0.003, microData.priceSeed + 3).map((d) => d.value),
    };
  }, [microData]);

  // Not-found state
  if (!market) {
    return (
      <div className="animate-fade-in space-y-6">
        <Link href="/dashboard/markets" className="inline-flex items-center gap-1.5 text-sm text-content-tertiary hover:text-content-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Markets
        </Link>
        <div className="card text-center py-16">
          <p className="text-content-secondary text-sm">Market data unavailable for <span className="font-mono text-content-primary">{slug}</span>.</p>
          <p className="text-content-disabled text-xs mt-1">Currently tracking 10 markets. More coming soon.</p>
        </div>
      </div>
    );
  }

  const trendIcon = market.jobGrowth >= 3 ? (
    <TrendingUp className="w-3.5 h-3.5 text-emerald-light" aria-hidden="true" />
  ) : market.jobGrowth >= 1.5 ? (
    <Minus className="w-3.5 h-3.5 text-amber-light" aria-hidden="true" />
  ) : (
    <TrendingDown className="w-3.5 h-3.5 text-rose-light" aria-hidden="true" />
  );

  return (
    <div className="animate-fade-in space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <Link
          href="/dashboard/markets"
          className="inline-flex items-center gap-1.5 text-[12px] text-content-disabled hover:text-content-secondary transition-colors mb-3"
          aria-label="Back to Market Rankings"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Market Rankings
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="section-label flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Market Detail
            </div>
            <h1 className="text-xl font-semibold font-display text-content-primary">{displayName}</h1>
            <p className="text-[13px] text-content-tertiary mt-0.5">24-month market intelligence · Updated 5 min ago</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-mono font-bold text-base ${scoreBg(market.score)} ${scoreColor(market.score)}`}
              aria-label={`Market score: ${market.score}`}
            >
              {market.score}
            </span>
            <span className={signalBadge(market.signal)} aria-label={`Signal: ${market.signal}`}>
              {market.signal}
            </span>
            {trendIcon}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Row — 6 cards                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" role="list" aria-label="Key performance indicators">
        {[
          {
            label: "Score",
            value: String(market.score),
            sub: market.signal,
            color: scoreColor(market.score),
            aria: `Score: ${market.score}, Signal: ${market.signal}`,
          },
          {
            label: "Cap Rate",
            value: `${market.capRate.toFixed(1)}%`,
            sub: "gross yield",
            color: "text-content-primary",
            aria: `Cap Rate: ${market.capRate.toFixed(1)} percent gross yield`,
          },
          {
            label: "Pop Growth",
            value: `${market.popGrowth.toFixed(1)}%`,
            sub: "YoY",
            color: market.popGrowth >= 2 ? "text-emerald-light" : market.popGrowth >= 1 ? "text-amber-light" : "text-rose-light",
            aria: `Population growth: ${market.popGrowth.toFixed(1)} percent year over year`,
          },
          {
            label: "Job Growth",
            value: `${market.jobGrowth.toFixed(1)}%`,
            sub: "YoY",
            color: market.jobGrowth >= 3 ? "text-emerald-light" : market.jobGrowth >= 1.5 ? "text-amber-light" : "text-rose-light",
            aria: `Job growth: ${market.jobGrowth.toFixed(1)} percent year over year`,
          },
          {
            label: "Inventory",
            value: `${market.inventory.toFixed(1)} mo`,
            sub: "months supply",
            color: market.inventory <= 3 ? "text-emerald-light" : market.inventory <= 5 ? "text-amber-light" : "text-rose-light",
            aria: `Inventory: ${market.inventory.toFixed(1)} months supply`,
          },
          {
            label: "Median Price",
            value: formatCurrency(market.medianPrice, true),
            sub: "single-family",
            color: "text-content-primary",
            aria: `Median price: ${formatCurrency(market.medianPrice)}`,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="card" role="listitem" aria-label={kpi.aria}>
            <p className="metric-label mb-1">{kpi.label}</p>
            <p className={`metric-value text-xl ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[11px] text-content-disabled mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Multi-Dimensional Time Series Chart                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="card" aria-label="Multi-dimensional time series chart">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            24-Month Trend Analysis
          </div>

          {/* Dimension toggle buttons */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Toggle chart dimensions">
            {DIMENSIONS.map((dim) => {
              const active = visibleDims.has(dim.key);
              return (
                <button
                  key={dim.key}
                  onClick={() => toggleDim(dim.key)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all duration-150 ${
                    active
                      ? "border-transparent text-[#111111]"
                      : "border-surface-border text-content-disabled hover:text-content-secondary hover:border-surface-elevated"
                  }`}
                  style={active ? { backgroundColor: dim.color } : {}}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: active ? "#111111" : dim.color }}
                    aria-hidden="true"
                  />
                  {dim.label}
                </button>
              );
            })}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="month"
              tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              interval={3}
            />
            {/* Left axis — percentages */}
            <YAxis
              yAxisId="left"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              width={44}
            />
            {/* Right axis — score 0-100 */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              domain={[0, 100]}
              tickFormatter={(v) => String(v)}
              width={36}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <MultiDimTooltip
                  active={active}
                  payload={payload as { dataKey: string; value: number; color: string }[]}
                  label={label as string}
                  visibleDims={visibleDims}
                />
              )}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: CHART_COLORS.text, paddingTop: 12 }}
              formatter={(value) => (
                <span style={{ color: CHART_COLORS.textSecondary, fontSize: 11 }}>
                  {DIMENSIONS.find((d) => d.key === value)?.label ?? value}
                </span>
              )}
            />
            {DIMENSIONS.map((dim) =>
              visibleDims.has(dim.key) ? (
                <Line
                  key={dim.key}
                  yAxisId={dim.yAxis}
                  type="monotone"
                  dataKey={dim.key}
                  stroke={dim.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: dim.color, stroke: "#111111", strokeWidth: 2 }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* ================================================================== */}
      {/* APPRECIATION FORECAST                                               */}
      {/* ================================================================== */}
      {appreciationData && (
        <section aria-label="Appreciation forecast">
          <div className="section-label flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Appreciation Forecast
          </div>

          {/* ---- 1yr / 3yr / 5yr prediction cards ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: "1-Year Outlook", result: appreciationData.prediction.oneYear },
              { label: "3-Year Outlook", result: appreciationData.prediction.threeYear },
              { label: "5-Year Outlook", result: appreciationData.prediction.fiveYear },
            ].map(({ label, result }) => {
              const isPositive = result.predicted >= 0;
              const valueColor = isPositive ? "text-emerald-light" : "text-rose-light";
              const rangeColor = isPositive ? "text-emerald/60" : "text-rose/60";
              const badgeCls = result.confidence >= 65 ? "badge-emerald" : result.confidence >= 45 ? "badge-amber" : "badge-rose";
              return (
                <div key={label} className="card" aria-label={`${label}: ${result.predicted.toFixed(1)}% predicted appreciation, confidence ${result.confidence}%`}>
                  <p className="metric-label mb-2">{label}</p>
                  <p className={`font-mono tabular-nums text-2xl font-bold ${valueColor}`}>
                    {isPositive ? "+" : ""}{result.predicted.toFixed(1)}%
                  </p>
                  <p className={`text-[11px] font-mono mt-1 ${rangeColor}`}>
                    {result.low.toFixed(1)}% – {result.high.toFixed(1)}% range
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-content-disabled uppercase tracking-wide">Confidence</span>
                    <span className={badgeCls}>{result.confidence}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Cap Rate History & Forecast Chart ---- */}
          <section className="card mb-4" aria-label="Cap rate history and 12-month forecast">
            <div className="section-label flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Cap Rate — History &amp; Forecast
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={capRateForecastData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="capRateHistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="capRateBandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="month"
                  tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  interval={5}
                />
                <YAxis
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  width={44}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontSize: 10, color: CHART_COLORS.text, fontFamily: "JetBrains Mono, monospace" }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      actual: "Cap Rate (actual)",
                      forecastMid: "Cap Rate (forecast)",
                      forecastHigh: "Upper bound",
                      forecastLow: "Lower bound",
                    };
                    return [`${value.toFixed(2)}%`, labels[name] ?? name];
                  }}
                />
                {/* Vertical reference line at "Today" separating historical from forecast */}
                <ReferenceLine
                  x={todayLabel}
                  stroke={CHART_COLORS.gold}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: CHART_COLORS.gold }}
                />
                {/* Confidence band (area between low and high) */}
                <Area
                  type="monotone"
                  dataKey="forecastHigh"
                  stroke="none"
                  fill="url(#capRateBandGrad)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecastLow"
                  stroke="none"
                  fill={CHART_COLORS.surface}
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                {/* Historical line */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke={CHART_COLORS.gold}
                  strokeWidth={2}
                  fill="url(#capRateHistGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: "#111111", strokeWidth: 2 }}
                />
                {/* Forecast dashed line */}
                <Area
                  type="monotone"
                  dataKey="forecastMid"
                  stroke={CHART_COLORS.gold}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  fill="none"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: "#111111", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* ---- KPI Drivers Bar Chart ---- */}
          <section className="card mb-4" aria-label="Top price drivers">
            <div className="section-label flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              What&#39;s Driving Prices
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={appreciationData.drivers.map((d) => ({
                  name: d.factor.replace(" (3yr CAGR)", "").replace(" (Net)", ""),
                  value: d.contribution,
                  positive: d.contribution >= 0 ? d.contribution : 0,
                  negative: d.contribution < 0 ? d.contribution : 0,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
              >
                <CartesianGrid {...GRID_STYLE} horizontal={false} vertical={true} />
                <XAxis
                  type="number"
                  tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  width={148}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontSize: 10, color: CHART_COLORS.text }}
                  formatter={(value: number) => [`${value > 0 ? "+" : ""}${value.toFixed(3)}% contribution`, "Price Impact"]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <ReferenceLine x={0} stroke={CHART_COLORS.border} strokeWidth={1.5} />
                <Bar dataKey="positive" fill={CHART_COLORS.emerald} radius={[0, 3, 3, 0]} maxBarSize={16} isAnimationActive={false}>
                  {appreciationData.drivers.map((d, i) => (
                    <Cell key={`pos-${i}`} fill={d.contribution >= 0 ? CHART_COLORS.emerald : "transparent"} />
                  ))}
                </Bar>
                <Bar dataKey="negative" fill={CHART_COLORS.rose} radius={[3, 0, 0, 3]} maxBarSize={16} isAnimationActive={false}>
                  {appreciationData.drivers.map((d, i) => (
                    <Cell key={`neg-${i}`} fill={d.contribution < 0 ? CHART_COLORS.rose : "transparent"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ---- Bull / Base / Bear Scenario Cards ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {appreciationData.scenarios.map((scenario) => {
              const isBull = scenario.name === "bull";
              const isBear = scenario.name === "bear";
              const borderCls = isBull
                ? "border-emerald/30"
                : isBear
                ? "border-rose/30"
                : "border-gold/30";
              const labelCls = isBull
                ? "text-emerald-light"
                : isBear
                ? "text-rose-light"
                : "text-gold";
              const valueCls = isBull
                ? "text-emerald-light"
                : isBear && scenario.oneYearAppreciation < 0
                ? "text-rose-light"
                : "text-content-primary";
              const keyChange = isBull
                ? `Jobs +${(scenario.assumptions.jobGrowth ?? 0).toFixed(1)}%, Rates ${(scenario.assumptions.interestRateChange ?? 0).toFixed(2)}%`
                : isBear
                ? `Jobs +${(scenario.assumptions.jobGrowth ?? 0).toFixed(1)}%, Rates +${(scenario.assumptions.interestRateChange ?? 0).toFixed(2)}%`
                : `Jobs +${(scenario.assumptions.jobGrowth ?? 0).toFixed(1)}%, Rates ${(scenario.assumptions.interestRateChange ?? 0) >= 0 ? "+" : ""}${(scenario.assumptions.interestRateChange ?? 0).toFixed(2)}%`;
              const badge = isBull ? "badge-emerald" : isBear ? "badge-rose" : "badge-gold";
              return (
                <div key={scenario.name} className={`card border ${borderCls}`} aria-label={`${scenario.name} scenario: ${scenario.oneYearAppreciation.toFixed(1)}% 1-year appreciation`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-widest ${labelCls}`}>
                      {scenario.name.toUpperCase()}
                    </span>
                    <span className={badge}>{isBull ? "Upside" : isBear ? "Downside" : "Base"}</span>
                  </div>
                  <p className={`font-mono tabular-nums text-xl font-bold mb-0.5 ${valueCls}`}>
                    {scenario.oneYearAppreciation >= 0 ? "+" : ""}{scenario.oneYearAppreciation.toFixed(1)}%
                    <span className="text-[11px] font-normal text-content-disabled ml-1">1yr</span>
                  </p>
                  <p className="text-[12px] text-content-tertiary font-mono">
                    3yr: {scenario.threeYearAppreciation >= 0 ? "+" : ""}{scenario.threeYearAppreciation.toFixed(1)}%
                    <span className="mx-1.5 text-content-disabled">·</span>
                    5yr: {scenario.fiveYearAppreciation >= 0 ? "+" : ""}{scenario.fiveYearAppreciation.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-content-disabled mt-2 leading-snug">{keyChange}</p>
                </div>
              );
            })}
          </div>

          {/* ---- Cross-Market Comparison Table ---- */}
          <section className="card" aria-label="Cross-market appreciation comparison">
            <div className="section-label flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Cross-Market Comparison
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" role="table" aria-label="Appreciation forecast comparison across top markets">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left text-content-disabled font-medium pb-2 pr-4" scope="col">Market</th>
                    <th className="text-right text-content-disabled font-medium pb-2 px-3 font-mono" scope="col">1yr Pred</th>
                    <th className="text-right text-content-disabled font-medium pb-2 px-3 font-mono" scope="col">3yr Pred</th>
                    <th className="text-right text-content-disabled font-medium pb-2 px-3 font-mono" scope="col">Cap Rate</th>
                    <th className="text-right text-content-disabled font-medium pb-2 pl-3" scope="col">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_SLUGS.map((compSlug) => {
                    const compMarket = MARKET_DB[compSlug];
                    const compFeatures = MARKET_FEATURES[compSlug];
                    if (!compMarket || !compFeatures) return null;
                    const compPred = predictAppreciation(compFeatures, 82);
                    const isCurrentMarket = compSlug === slug;
                    const pred1yr = compPred.oneYear.predicted;
                    const pred3yr = compPred.threeYear.predicted;
                    const rowCls = isCurrentMarket ? "bg-gold/[0.06] border-b border-surface-border" : "border-b border-surface-border hover:bg-white/[0.02] transition-colors";
                    const trend1yr = pred1yr >= 4 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-light" aria-hidden="true" />
                    ) : pred1yr >= 1 ? (
                      <Minus className="w-3.5 h-3.5 text-amber-light" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-light" aria-hidden="true" />
                    );
                    return (
                      <tr key={compSlug} className={rowCls} aria-current={isCurrentMarket ? "true" : undefined}>
                        <td className="py-2.5 pr-4">
                          {isCurrentMarket ? (
                            <span className="font-medium text-content-primary flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                              {compMarket.name}, {compMarket.state}
                            </span>
                          ) : (
                            <Link
                              href={`/dashboard/markets/${compSlug}`}
                              className="text-content-secondary hover:text-gold transition-colors"
                              aria-label={`View ${compMarket.name}, ${compMarket.state} market detail`}
                            >
                              {compMarket.name}, {compMarket.state}
                            </Link>
                          )}
                        </td>
                        <td className={`text-right px-3 font-mono font-semibold ${pred1yr >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                          {pred1yr >= 0 ? "+" : ""}{pred1yr.toFixed(1)}%
                        </td>
                        <td className={`text-right px-3 font-mono font-semibold ${pred3yr >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                          {pred3yr >= 0 ? "+" : ""}{pred3yr.toFixed(1)}%
                        </td>
                        <td className="text-right px-3 font-mono text-content-secondary">
                          {compMarket.capRate.toFixed(1)}%
                        </td>
                        <td className="text-right pl-3 flex justify-end py-2.5">
                          {trend1yr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {/* ================================================================== */}
      {/* MICROECONOMICS                                                       */}
      {/* ================================================================== */}
      {microData && (
        <section aria-label="Microeconomics analysis">
          <div className="section-label flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Microeconomics
          </div>

          {/* --- Neighborhood Economics Grid: 6 metric cards --- */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4" role="list" aria-label="Microeconomic indicators">

            <MicroMetricCard
              label="Median HH Income"
              value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(microData.medianHouseholdIncome)}
              sub="household / yr"
              trendPct={microData.incomeYoYChange}
              sparkData={microSparkData.income ?? []}
              sparkColor={CHART_COLORS.emerald}
              ariaLabel={`Median household income: ${formatCurrency(microData.medianHouseholdIncome)}, ${microData.incomeYoYChange >= 0 ? "+" : ""}${microData.incomeYoYChange.toFixed(1)}% YoY`}
            />

            <MicroMetricCard
              label="Unemployment"
              value={`${microData.unemploymentRate.toFixed(1)}%`}
              sub={microData.unemploymentRate <= 3.5 ? "tight labor market" : microData.unemploymentRate <= 4.5 ? "moderate" : "elevated"}
              trendPct={-microData.unemploymentYoYChange}
              sparkData={microSparkData.unemployment ?? []}
              sparkColor={microData.unemploymentRate <= 3.5 ? CHART_COLORS.emerald : microData.unemploymentRate <= 4.5 ? CHART_COLORS.amber : CHART_COLORS.rose}
              ariaLabel={`Unemployment rate: ${microData.unemploymentRate.toFixed(1)}%, ${microData.unemploymentYoYChange <= 0 ? "improving" : "worsening"} YoY`}
            />

            <MicroMetricCard
              label="Cost of Living"
              value={`${microData.costOfLivingIndex}`}
              sub="100 = national avg"
              trendPct={microData.costOfLivingIndex >= 105 ? 1.2 : microData.costOfLivingIndex <= 95 ? -0.8 : 0.3}
              sparkData={microSparkData.col ?? []}
              sparkColor={microData.costOfLivingIndex <= 100 ? CHART_COLORS.emerald : microData.costOfLivingIndex <= 110 ? CHART_COLORS.amber : CHART_COLORS.rose}
              ariaLabel={`Cost of living index: ${microData.costOfLivingIndex}, national average is 100`}
            />

            <MicroMetricCard
              label="Eff. Property Tax"
              value={`${microData.propertyTaxEffectiveRate.toFixed(2)}%`}
              sub="of assessed value"
              trendPct={microData.propertyTaxEffectiveRate <= 0.8 ? -0.2 : 0.4}
              sparkData={microSparkData.propTax ?? []}
              sparkColor={microData.propertyTaxEffectiveRate <= 0.8 ? CHART_COLORS.emerald : microData.propertyTaxEffectiveRate <= 1.4 ? CHART_COLORS.amber : CHART_COLORS.rose}
              ariaLabel={`Effective property tax rate: ${microData.propertyTaxEffectiveRate.toFixed(2)} percent of assessed value`}
            />

            <MicroMetricCard
              label="Rent-to-Income"
              value={`${microData.rentToIncomeRatio.toFixed(1)}%`}
              sub={microData.rentToIncomeRatio < 25 ? "affordable zone" : microData.rentToIncomeRatio <= 35 ? "stretched zone" : "unaffordable zone"}
              trendPct={microData.incomeYoYChange > 2 ? -0.3 : 0.5}
              sparkData={microSparkData.rti ?? []}
              sparkColor={microData.rentToIncomeRatio < 25 ? CHART_COLORS.emerald : microData.rentToIncomeRatio <= 35 ? CHART_COLORS.amber : CHART_COLORS.rose}
              ariaLabel={`Rent-to-income ratio: ${microData.rentToIncomeRatio.toFixed(1)} percent`}
            />

            <MicroMetricCard
              label="Affordability Index"
              value={`${microData.housingAffordabilityIndex}`}
              sub="100 = fully affordable"
              trendPct={microData.housingAffordabilityIndex >= 100 ? 0.8 : -1.1}
              sparkData={microSparkData.affordability ?? []}
              sparkColor={microData.housingAffordabilityIndex >= 95 ? CHART_COLORS.emerald : microData.housingAffordabilityIndex >= 75 ? CHART_COLORS.amber : CHART_COLORS.rose}
              ariaLabel={`Housing affordability index: ${microData.housingAffordabilityIndex}, 100 means median household can afford median home`}
            />
          </div>

          {/* --- Income vs Home Price dual-axis chart --- */}
          <section className="card mb-4" aria-label="Median income vs median home price over 24 months">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="section-label flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                Income vs. Home Price — 24 Months
              </div>
              <div className="flex items-center gap-3 text-[11px] text-content-disabled">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.emerald }} />
                  Median Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.gold }} />
                  Median Home Price
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 rounded opacity-40" style={{ backgroundColor: CHART_COLORS.rose }} />
                  Affordability Squeeze
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={incomeVsPriceData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="month"
                  tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  interval={3}
                />
                {/* Left Y: income */}
                <YAxis
                  yAxisId="income"
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickFormatter={(v) => new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)}
                  width={56}
                  domain={["auto", "auto"]}
                />
                {/* Right Y: home price */}
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  tick={AXIS_STYLE.tick}
                  axisLine={AXIS_STYLE.axisLine}
                  tickLine={AXIS_STYLE.tickLine}
                  tickFormatter={(v) => new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)}
                  width={64}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontSize: 10, color: CHART_COLORS.text, fontFamily: "JetBrains Mono, monospace" }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { income: "Median Income", price: "Median Home Price" };
                    return [formatCurrency(value), labels[name] ?? name];
                  }}
                  cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }}
                />
                {/* Squeeze highlight bands */}
                {incomeVsPriceData.map((pt, i) =>
                  pt.squeeze && incomeVsPriceData[i - 1]?.squeeze !== true ? (
                    <ReferenceArea
                      key={`sq-${i}`}
                      yAxisId="income"
                      x1={pt.month}
                      x2={incomeVsPriceData[i + 1]?.month ?? pt.month}
                      fill={CHART_COLORS.rose}
                      fillOpacity={0.06}
                    />
                  ) : null
                )}
                <Area
                  yAxisId="income"
                  type="monotone"
                  dataKey="income"
                  stroke={CHART_COLORS.emerald}
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.emerald, stroke: "#111111", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke={CHART_COLORS.gold}
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.gold, stroke: "#111111", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          {/* --- Rent-to-Income Gauge + Money Velocity + Capital Flow --- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

            {/* Gauge */}
            <div className="card flex flex-col items-center justify-center py-6" aria-label="Rent-to-income gauge">
              <p className="metric-label mb-4">Rent-to-Income Ratio</p>
              <RentToIncomeGauge ratio={microData.rentToIncomeRatio} />
            </div>

            {/* Money Velocity */}
            <div className="card flex flex-col justify-between" aria-label={`Money velocity score: ${microData.moneyVelocityScore}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
                  <p className="metric-label">Money Velocity Score</p>
                </div>
                <p className={`font-mono font-bold tabular-nums text-4xl mt-1 ${
                  microData.moneyVelocityScore >= 70 ? "text-emerald-light" :
                  microData.moneyVelocityScore >= 50 ? "text-amber-light" : "text-rose-light"
                }`}>
                  {microData.moneyVelocityScore}
                  <span className="text-[14px] font-normal text-content-disabled ml-1">/100</span>
                </p>
                <p className="text-[11px] text-content-tertiary mt-2 leading-relaxed">
                  How fast capital cycles through the local economy — construction, business formation, lending, retail spending.
                </p>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden" role="progressbar" aria-valuenow={microData.moneyVelocityScore} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${microData.moneyVelocityScore}%`,
                      backgroundColor: microData.moneyVelocityScore >= 70 ? CHART_COLORS.emerald : microData.moneyVelocityScore >= 50 ? CHART_COLORS.amber : CHART_COLORS.rose,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-content-disabled font-mono">Stagnant</span>
                  <span className="text-[9px] text-content-disabled font-mono">Hyperactive</span>
                </div>
              </div>
            </div>

            {/* Capital Flow Direction */}
            <div className="card flex flex-col justify-between" aria-label={`Capital flow direction: ${microData.capitalFlowDirection.replace("_", " ")}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
                  <p className="metric-label">Capital Flow Direction</p>
                </div>
                <div className="mt-2">
                  {(["strong_inflow", "inflow", "neutral", "outflow", "strong_outflow"] as const).map((level) => {
                    const isActive = level === microData.capitalFlowDirection;
                    const isPast =
                      ["strong_inflow", "inflow", "neutral", "outflow", "strong_outflow"].indexOf(level) >=
                      ["strong_inflow", "inflow", "neutral", "outflow", "strong_outflow"].indexOf(microData.capitalFlowDirection);
                    const labels: Record<string, string> = {
                      strong_inflow: "Strong Inflow",
                      inflow: "Inflow",
                      neutral: "Neutral",
                      outflow: "Outflow",
                      strong_outflow: "Strong Outflow",
                    };
                    const colors: Record<string, string> = {
                      strong_inflow: CHART_COLORS.emerald,
                      inflow: CHART_COLORS.emeraldLight,
                      neutral: CHART_COLORS.amber,
                      outflow: CHART_COLORS.roseLight,
                      strong_outflow: CHART_COLORS.rose,
                    };
                    return (
                      <div key={level} className={`flex items-center gap-2.5 py-1.5 ${isActive ? "" : "opacity-30"}`}>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isActive ? colors[level] : CHART_COLORS.border }}
                          aria-hidden="true"
                        />
                        <span className={`text-[12px] font-medium ${isActive ? "text-content-primary" : "text-content-disabled"}`}>
                          {labels[level]}
                        </span>
                        {isActive && (
                          <span
                            className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: colors[level] + "22", color: colors[level] }}
                            aria-label="current"
                          >
                            NOW
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* --- AI Microeconomic Insight --- */}
          <AiInsightCard title={`Microeconomic Signals — ${market.name}, ${market.state}`}>
            {microData.aiInsight}
          </AiInsightCard>

        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* AI Market Analysis                                                   */}
      {/* ------------------------------------------------------------------ */}
      <AiInsightCard title={`AI Market Analysis — ${market.name}, ${market.state}`}>
        {market.aiInsight}
      </AiInsightCard>

      {/* ------------------------------------------------------------------ */}
      {/* Market Fundamentals Grid — 2×3                                      */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Market fundamentals">
        <div className="section-label flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Market Fundamentals
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

          {/* Demographics */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wide">Demographics</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Population</span>
                <div className="flex items-center gap-3">
                  <Sparkline data={sparkData.pop ?? []} color={CHART_COLORS.gold} />
                  <span className="text-[13px] font-mono text-content-primary" aria-label={`Population: ${market.population.toLocaleString()}`}>
                    {new Intl.NumberFormat("en-US", { notation: "compact" }).format(market.population)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Median Age</span>
                <span className="text-[13px] font-mono text-content-primary">{market.medianAge} yrs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Median Income</span>
                <div className="flex items-center gap-3">
                  <Sparkline data={sparkData.income ?? []} color={CHART_COLORS.emerald} />
                  <span className="text-[13px] font-mono text-content-primary" aria-label={`Median income: ${formatCurrency(market.medianIncome)}`}>
                    {formatCurrency(market.medianIncome, true)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Economics */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wide">Economics</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Unemployment</span>
                <span className={`text-[13px] font-mono ${market.unemployment <= 3.5 ? "text-emerald-light" : market.unemployment <= 4.5 ? "text-amber-light" : "text-rose-light"}`}>
                  {market.unemployment.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">GDP Growth</span>
                <div className="flex items-center gap-3">
                  <Sparkline data={sparkData.jobs ?? []} color={CHART_COLORS.emerald} />
                  <span className="text-[13px] font-mono text-emerald-light">{market.gdpGrowth.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] text-content-tertiary shrink-0">Top Employers</span>
                <span className="text-[11px] text-content-secondary text-right leading-relaxed">
                  {market.majorEmployers.slice(0, 3).join(" · ")}
                </span>
              </div>
            </div>
          </div>

          {/* Housing */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wide">Housing</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Median Price</span>
                <div className="flex items-center gap-3">
                  <Sparkline data={sparkData.price ?? []} color={CHART_COLORS.gold} />
                  <span className="text-[13px] font-mono text-content-primary" aria-label={`Median home price: ${formatCurrency(market.medianPrice)}`}>
                    {formatCurrency(market.medianPrice, true)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Price-to-Rent</span>
                <span className={`text-[13px] font-mono ${market.priceToRent <= 20 ? "text-emerald-light" : market.priceToRent <= 25 ? "text-amber-light" : "text-rose-light"}`}>
                  {market.priceToRent.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Months of Supply</span>
                <span className={`text-[13px] font-mono ${market.monthsSupply <= 3 ? "text-emerald-light" : market.monthsSupply <= 5 ? "text-amber-light" : "text-rose-light"}`}>
                  {market.monthsSupply.toFixed(1)} mo
                </span>
              </div>
            </div>
          </div>

          {/* Rent Trend */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wide">Rent Trend</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Rent Growth YoY</span>
                <div className="flex items-center gap-3">
                  <Sparkline data={sparkData.rent ?? []} color={market.rentGrowth >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose} />
                  <span className={`text-[13px] font-mono ${market.rentGrowth >= 2 ? "text-emerald-light" : market.rentGrowth >= 0 ? "text-amber-light" : "text-rose-light"}`}>
                    {market.rentGrowth >= 0 ? "+" : ""}{market.rentGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Cap Rate</span>
                <span className="text-[13px] font-mono text-content-primary">{market.capRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Signal</span>
                <span className={signalBadge(market.signal)} aria-label={`Investment signal: ${market.signal}`}>{market.signal}</span>
              </div>
            </div>
          </div>

          {/* Job Market */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wide">Job Market</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Job Growth</span>
                <span className={`text-[13px] font-mono ${market.jobGrowth >= 3 ? "text-emerald-light" : market.jobGrowth >= 1.5 ? "text-amber-light" : "text-rose-light"}`}>
                  +{market.jobGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Pop Growth</span>
                <span className={`text-[13px] font-mono ${market.popGrowth >= 2 ? "text-emerald-light" : market.popGrowth >= 1 ? "text-amber-light" : "text-rose-light"}`}>
                  +{market.popGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] text-content-tertiary shrink-0">All Employers</span>
                <span className="text-[11px] text-content-secondary text-right leading-relaxed">
                  {market.majorEmployers.join(" · ")}
                </span>
              </div>
            </div>
          </div>

          {/* Supply & Demand */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-gold" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-content-secondary uppercase tracking-wide">Supply & Demand</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Inventory</span>
                <div className="flex items-center gap-3">
                  <Sparkline data={sparkData.inv ?? []} color={market.inventory <= 3 ? CHART_COLORS.emerald : CHART_COLORS.rose} />
                  <span className={`text-[13px] font-mono ${market.inventory <= 3 ? "text-emerald-light" : market.inventory <= 5 ? "text-amber-light" : "text-rose-light"}`}>
                    {market.inventory.toFixed(1)} mo
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Price-to-Rent</span>
                <span className="text-[13px] font-mono text-content-secondary">{market.priceToRent.toFixed(1)}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-tertiary">Unemployment</span>
                <span className={`text-[13px] font-mono ${market.unemployment <= 3.5 ? "text-emerald-light" : "text-amber-light"}`}>
                  {market.unemployment.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Bubble Detection ── */}
      {/* ------------------------------------------------------------------ */}
      {/* Bubble Risk — Deep Dive                                              */}
      {/* Inserted after microeconomics section (marker above for agent sync) */}
      {/* ------------------------------------------------------------------ */}
      {(() => {
        const bubbleData = buildBubbleResult(slug, market);
        if (!bubbleData) return null;

        // Component score z-scores for the 4-bar breakdown
        const components: { label: string; description: string; zScore: number }[] = [
          {
            label: "Price-to-Income",
            description: `PTI ${bubbleData.priceToIncome.current.toFixed(1)}x vs ${bubbleData.priceToIncome.historicalMean.toFixed(1)}x mean`,
            zScore: bubbleData.priceToIncome.zScore,
          },
          {
            label: "Price-to-Rent",
            description: `PTR ${bubbleData.priceToRent.current.toFixed(1)}x vs ${bubbleData.priceToRent.historicalMean.toFixed(1)}x mean`,
            zScore: bubbleData.priceToRent.zScore,
          },
          {
            label: "Credit Gap",
            description: `${bubbleData.creditGap.gapPp > 0 ? "+" : ""}${bubbleData.creditGap.gapPp.toFixed(1)}pp mortgage vs GDP growth`,
            zScore: bubbleData.creditGap.zScore,
          },
          {
            label: "Divergence Velocity",
            description: bubbleData.ptiDivergenceVelocity.annualChange !== null
              ? `PTI ${bubbleData.ptiDivergenceVelocity.annualChange > 0 ? "+" : ""}${bubbleData.ptiDivergenceVelocity.annualChange.toFixed(2)}x/yr`
              : "Velocity data unavailable",
            zScore: bubbleData.ptiDivergenceVelocity.annualChange !== null
              ? Math.min(4, Math.abs(bubbleData.ptiDivergenceVelocity.annualChange) * 2)
              : 0,
          },
        ];

        // Zone coloring for horizontal bars: 0-1σ emerald, 1-2σ amber, 2-3σ rose, 3σ+ deep rose
        function zScoreBarColor(z: number): string {
          if (z >= 3) return "#DC2626";  // deep rose (tailwind red-600)
          if (z >= 2) return "#EF4444";  // rose
          if (z >= 1) return "#F59E0B";  // amber
          return "#10B981";              // emerald
        }

        // Historical z-score chart data — 24 months ending at engine output
        const compositeZ = bubbleData.priceToIncome.zScore;
        const zHistory = generateBubbleZScoreHistory(compositeZ, market.seeds.score + 5000);

        // Risk level badge styling
        const levelBadgeCls =
          bubbleData.level === "critical" ? "badge-rose" :
          bubbleData.level === "elevated" ? "badge-amber" : "badge-emerald";
        const levelLabel =
          bubbleData.level === "critical" ? "Critical" :
          bubbleData.level === "elevated" ? "Elevated" : "Normal";
        const LevelIcon =
          bubbleData.level === "critical" ? AlertTriangle :
          bubbleData.level === "elevated" ? ShieldAlert : ShieldCheck;

        return (
          <section aria-label="Bubble risk deep dive">
            <div className="section-label flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />
              Bubble Risk Analysis
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* ---- Left: Risk Card ---- */}
              <div className="lg:col-span-2 card space-y-4">
                {/* Overall risk level header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label mb-1">Overall Bubble Risk</p>
                    <div className="flex items-center gap-2">
                      <LevelIcon
                        className="w-4 h-4"
                        style={{ color: bubbleData.level === "critical" ? "#EF4444" : bubbleData.level === "elevated" ? "#F59E0B" : "#10B981" }}
                        aria-hidden="true"
                      />
                      <span className={levelBadgeCls} aria-label={`Bubble risk level: ${levelLabel}`}>{levelLabel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-content-disabled uppercase tracking-wide mb-1">Risk Score</p>
                    <p
                      className="font-mono tabular-nums text-2xl font-bold"
                      style={{ color: zScoreBarColor(compositeZ) }}
                      aria-label={`Bubble risk score: ${bubbleData.bubbleRisk} out of 100`}
                    >
                      {bubbleData.bubbleRisk}
                    </p>
                    <p className="text-[10px] text-content-disabled">/ 100</p>
                  </div>
                </div>

                {/* 4-component z-score bars */}
                <div className="space-y-3" role="list" aria-label="Bubble risk component scores">
                  {components.map((comp) => {
                    const barColor = zScoreBarColor(comp.zScore);
                    const barPct = Math.min(100, (Math.max(0, comp.zScore) / 3) * 100);
                    return (
                      <div
                        key={comp.label}
                        role="listitem"
                        aria-label={`${comp.label}: ${comp.zScore.toFixed(1)} sigma`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-content-secondary font-medium">{comp.label}</span>
                          <span className="font-mono tabular-nums text-[11px]" style={{ color: barColor }}>
                            {comp.zScore.toFixed(1)}σ
                          </span>
                        </div>
                        {/* Zone-colored bar background */}
                        <div className="relative h-1.5 rounded-full overflow-hidden flex" aria-hidden="true">
                          <div className="flex-1 bg-emerald/15" />
                          <div className="flex-1 bg-amber/15" />
                          <div className="flex-1 bg-rose/15" />
                        </div>
                        <div className="relative -mt-1.5 h-1.5 rounded-full overflow-hidden" aria-hidden="true">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, backgroundColor: barColor, opacity: 0.9 }}
                          />
                        </div>
                        <p className="text-[10px] text-content-disabled mt-0.5">{comp.description}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Methodology footnote */}
                <p className="text-[9px] text-content-disabled leading-relaxed border-t border-surface-border pt-3">
                  Dallas Fed / UBS methodology. Thresholds: 2σ = elevated, 3σ = critical.
                  PTI weight 40%, PTR 35%, credit gap 15%, velocity 10%.
                </p>
              </div>

              {/* ---- Right: 24-month composite z-score chart ---- */}
              <div className="lg:col-span-3 card" aria-label="24-month composite z-score history">
                <div className="section-label flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                  PTI Z-Score — 24-Month History
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={zHistory} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`bubbleGrad-${slug}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis
                      dataKey="month"
                      tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                      axisLine={AXIS_STYLE.axisLine}
                      tickLine={AXIS_STYLE.tickLine}
                      interval={5}
                    />
                    <YAxis
                      tick={AXIS_STYLE.tick}
                      axisLine={AXIS_STYLE.axisLine}
                      tickLine={AXIS_STYLE.tickLine}
                      domain={[0, 4]}
                      tickFormatter={(v) => `${v}σ`}
                      width={32}
                      ticks={[0, 1, 2, 3, 4]}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ fontSize: 10, color: CHART_COLORS.text, fontFamily: "JetBrains Mono, monospace" }}
                      formatter={(value: number) => [`${value.toFixed(2)}σ`, "PTI Z-Score"]}
                      cursor={{ stroke: CHART_COLORS.border, strokeWidth: 1 }}
                    />

                    {/* 2σ elevated threshold band */}
                    <ReferenceArea
                      y1={2}
                      y2={3}
                      fill={CHART_COLORS.amber}
                      fillOpacity={0.06}
                      label={{ value: "Elevated (2σ)", position: "insideTopRight", fontSize: 9, fill: CHART_COLORS.amber }}
                    />
                    {/* 3σ critical threshold band */}
                    <ReferenceArea
                      y1={3}
                      y2={4}
                      fill={CHART_COLORS.rose}
                      fillOpacity={0.08}
                      label={{ value: "Critical (3σ)", position: "insideTopRight", fontSize: 9, fill: CHART_COLORS.roseLight }}
                    />

                    {/* 2σ reference line */}
                    <ReferenceLine
                      y={2}
                      stroke={CHART_COLORS.amber}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                    {/* 3σ reference line */}
                    <ReferenceLine
                      y={3}
                      stroke={CHART_COLORS.rose}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />

                    <Area
                      type="monotone"
                      dataKey="zScore"
                      stroke={CHART_COLORS.amber}
                      strokeWidth={2}
                      fill={`url(#bubbleGrad-${slug})`}
                      dot={false}
                      activeDot={{ r: 4, fill: CHART_COLORS.amber, stroke: "#111111", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Chart legend */}
                <div className="flex items-center gap-5 mt-3 pt-3 border-t border-surface-border">
                  <span className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
                    <span className="w-2.5 h-1 rounded-sm" style={{ backgroundColor: CHART_COLORS.amber }} />
                    PTI Z-Score
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
                    <span className="w-6 border-t border-dashed" style={{ borderColor: CHART_COLORS.amber }} />
                    2σ Elevated
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
                    <span className="w-6 border-t border-dashed" style={{ borderColor: CHART_COLORS.rose }} />
                    3σ Critical
                  </span>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ------------------------------------------------------------------ */}
      {/* Recent News / Events                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Recent market news and events">
        <div className="section-label flex items-center gap-2 mb-3">
          <Newspaper className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Recent News & Events
        </div>

        <div className="card space-y-0 p-0 overflow-hidden">
          {market.news.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-5 py-3.5 ${i < market.news.length - 1 ? "border-b border-surface-border" : ""} hover:bg-white/[0.02] transition-colors`}
            >
              <span className="text-[11px] font-mono text-content-disabled w-12 shrink-0 mt-0.5">{item.date}</span>
              <p className="text-[13px] text-content-secondary flex-1 leading-snug">{item.headline}</p>
              <span className={`${impactBadge(item.impact)} shrink-0 mt-0.5`} aria-label={`Impact: ${impactLabel(item.impact)}`}>
                {impactLabel(item.impact)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Comparable Properties                                                */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Sample properties in this market">
        <div className="section-label flex items-center gap-2 mb-3">
          <Building2 className="w-3.5 h-3.5 text-content-tertiary" aria-hidden="true" />
          Sample Properties in {market.name}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {market.properties.map((prop, i) => (
            <div key={i} className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <div className="text-[13px] font-medium text-content-primary leading-tight pr-2">{prop.name}</div>
                <span
                  className={`inline-flex items-center justify-center w-9 h-6 rounded-md font-mono font-bold text-xs shrink-0 ${scoreBg(prop.score)} ${scoreColor(prop.score)}`}
                  aria-label={`Property score: ${prop.score}`}
                >
                  {prop.score}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-content-disabled uppercase tracking-wide">Price</span>
                  <span className="text-[13px] font-mono text-content-primary" aria-label={`Price: ${formatCurrency(prop.price)}`}>
                    {formatCurrency(prop.price, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-content-disabled uppercase tracking-wide">Cap Rate</span>
                  <span className="text-[13px] font-mono text-emerald-light">{prop.capRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-content-disabled uppercase tracking-wide">Cash Flow/mo</span>
                  <span
                    className={`text-[13px] font-mono ${prop.cashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}
                    aria-label={`Monthly cash flow: ${formatCurrency(prop.cashFlow)}`}
                  >
                    {prop.cashFlow >= 0 ? "+" : ""}{formatCurrency(prop.cashFlow, true)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-surface-border">
                <Link
                  href={`/dashboard/analyze?market=${slug}&price=${prop.price}`}
                  className="text-[11px] text-gold hover:text-gold-light transition-colors font-medium"
                  aria-label={`Analyze ${prop.name}`}
                >
                  Analyze this property →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
