// ============================================================
// Alternative Data Signals Engine
// Tracks non-traditional data sources that reveal real estate
// demand shifts before they show up in price data:
// USPS migration, utility connections, school enrollment,
// Google Trends, rideshare/traffic, STR regulation arbitrage.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface AlternativeSignalsProfile {
  zipCode: string;
  uspsMailMigration: USPSMigration;
  utilityConnections: UtilitySignals;
  schoolEnrollment: SchoolEnrollmentSignals;
  searchIntelligence: SearchIntelligence;
  mobilityPatterns: MobilityPatterns;
  strRegulationArbitrage: STRArbitrage;
  socialSentiment: SocialSentiment;
  alternativeSignalScore: number; // 0-100
  emergingSignals: EmergingSignal[];
}

/** USPS change-of-address data reveals migration before Census catches it */
export interface USPSMigration {
  totalChangesOfAddress: TrendMetric; // total COA filings
  inboundVsOutbound: number; // ratio >1 = net inflow
  inboundVolume: TrendMetric;
  outboundVolume: TrendMetric;
  topOriginZips: { zip: string; city: string; state: string; volume: number; avgIncome: number }[];
  topDestinationZips: { zip: string; city: string; state: string; volume: number }[];
  businessCOA: TrendMetric; // business address changes = commercial activity
  seasonalPattern: { month: string; netFlow: number }[];
  incomeProfileOfMovers: {
    avgIncome: number;
    medianIncome: number;
    highIncomeMovers: number; // households >$150K
    incomeShift: "upgrading" | "stable" | "downgrading";
  };
  signal: "strong_inflow" | "moderate_inflow" | "balanced" | "moderate_outflow" | "strong_outflow";
}

/** Utility connections are real-time occupancy signals */
export interface UtilitySignals {
  newElectricConnections: TrendMetric;
  electricDisconnections: TrendMetric;
  netConnections: number; // new - disconnections
  newWaterConnections: TrendMetric;
  newGasConnections: TrendMetric;
  commercialConnections: TrendMetric; // commercial = business growth
  averageUsagePerHousehold: TrendMetric; // rising = larger homes or more occupants
  vacantPropertyEstimate: number; // properties with no active utility
  vacancyTrend: "rising" | "stable" | "falling";
  constructionConnections: number; // temporary construction power = new builds
  signal: "expansion" | "stable" | "contraction";
}

/** School enrollment predicts family housing demand */
export interface SchoolEnrollmentSignals {
  totalEnrollment: TrendMetric;
  publicSchoolEnrollment: TrendMetric;
  privateSchoolEnrollment: TrendMetric;
  charterSchoolEnrollment: TrendMetric;
  kindergartenEnrollment: TrendMetric; // leading indicator (5 years of family demand)
  transfersIn: TrendMetric; // families moving into district
  transfersOut: TrendMetric;
  netTransfers: number;
  waitlistLength: number; // popular schools = demand
  newSchoolsPlanned: number;
  schoolCapacityUtilization: number; // % - high = district is full
  homeschoolRate: TrendMetric;
  avgClassSize: TrendMetric;
  perPupilSpending: TrendMetric;
  signal: "family_influx" | "stable" | "families_leaving";
}

/** Google Trends and search data reveal intent before action */
export interface SearchIntelligence {
  realEstateSearchVolume: TrendMetric; // "[city] homes for sale" searches
  rentalSearchVolume: TrendMetric; // "[city] apartments" searches
  relocationSearchVolume: TrendMetric; // "moving to [city]" searches
  topSearchTerms: { term: string; volume: number; trend: "rising" | "stable" | "falling" }[];
  zillow_trulia_views: TrendMetric; // listing page views for this market
  costOfLivingSearches: TrendMetric; // "cost of living in [city]"
  jobSearchVolume: TrendMetric; // "jobs in [city]"
  schoolSearchVolume: TrendMetric; // "schools in [city]" = families researching
  crimeSearchVolume: TrendMetric; // "[city] crime rate" = safety concerns
  searchVolumeVsNational: number; // % above or below national baseline
  intentScore: number; // 0-100 composite of search signals
  signal: "surging_interest" | "growing_interest" | "stable" | "declining_interest";
}

/** Rideshare, traffic, and mobility data */
export interface MobilityPatterns {
  avgCommuteTime: TrendMetric; // minutes
  commuteTimeDelta: number; // change in minutes vs 2 years ago
  trafficCongestionIndex: TrendMetric; // 1-10 scale
  transitRidership: TrendMetric;
  rideshareTripsPerCapita: TrendMetric;
  weekendActivityIndex: TrendMetric; // entertainment/dining trips
  airportPassengerVolume: TrendMetric; // nearest airport
  newRouteAnnouncements: number; // new airline routes = connectivity
  remoteWorkAdoption: TrendMetric; // % working from home
  coworkingOccupancy: TrendMetric; // % of coworking seats filled
  peakTrafficHours: { hour: number; congestion: number }[];
  signal: "increasing_activity" | "stable" | "decreasing_activity";
}

/** Short-term rental regulation gaps create arbitrage opportunities */
export interface STRArbitrage {
  currentRegulation: "permissive" | "moderate" | "restrictive" | "banned";
  regulationTrend: "loosening" | "stable" | "tightening";
  permitRequired: boolean;
  annualCap: number | null; // max nights per year, null = unlimited
  activeSTRListings: TrendMetric;
  strRevenue: TrendMetric; // avg monthly revenue
  strOccupancy: TrendMetric; // avg occupancy %
  strVsLongTermPremium: number; // % more revenue from STR vs long-term
  neighboringMarketRegulation: {
    market: string;
    regulation: string;
    strCount: number;
    spilloverEffect: boolean; // did restrictions push demand here?
  }[];
  pendingRegulationChanges: string[];
  arbitrageOpportunity: "high" | "moderate" | "low" | "none";
  estimatedAnnualSTRRevenue: number;
  estimatedLongTermAnnualRent: number;
}

/** Social media and review sentiment */
export interface SocialSentiment {
  neighborhoodSentiment: number; // -100 to +100
  sentimentTrend: "improving" | "stable" | "declining";
  topPositiveThemes: string[];
  topNegativeThemes: string[];
  yelpNewBusinessRating: number; // avg rating of businesses opened in last year
  googleReviewTrend: "improving" | "stable" | "declining";
  redditMentionVolume: TrendMetric;
  nextdoorActivityLevel: "high" | "medium" | "low";
  mediaArticleSentiment: number; // -100 to +100 from local news
  instagramGeotagVolume: TrendMetric; // social media "buzz"
}

export interface EmergingSignal {
  source: string;
  signal: string;
  strength: "strong" | "moderate" | "weak";
  leadTime: string;
  detail: string;
  dataFreshness: string; // "real-time", "weekly", "monthly"
}

// --- Analysis Functions ---

/**
 * Generate emerging signals from alternative data sources
 */
export function generateAlternativeSignals(profile: AlternativeSignalsProfile): EmergingSignal[] {
  const signals: EmergingSignal[] = [];

  // USPS migration signals
  const usps = profile.uspsMailMigration;
  if (usps.signal === "strong_inflow") {
    signals.push({
      source: "USPS Change of Address",
      signal: `Strong net migration inflow (ratio: ${usps.inboundVsOutbound.toFixed(2)})`,
      strength: "strong",
      leadTime: "3-6 months",
      detail: `${usps.incomeProfileOfMovers.highIncomeMovers} high-income households moved in recently. Income profile: ${usps.incomeProfileOfMovers.incomeShift}.`,
      dataFreshness: "monthly",
    });
  }

  // Utility expansion
  const util = profile.utilityConnections;
  if (util.signal === "expansion") {
    signals.push({
      source: "Utility connections",
      signal: `Net ${util.netConnections} new utility connections`,
      strength: util.netConnections > 100 ? "strong" : "moderate",
      leadTime: "1-3 months",
      detail: `${util.constructionConnections} construction connections active. Vacancy trend: ${util.vacancyTrend}.`,
      dataFreshness: "monthly",
    });
  }

  // School enrollment
  const school = profile.schoolEnrollment;
  if (school.signal === "family_influx") {
    signals.push({
      source: "School enrollment",
      signal: `Net ${school.netTransfers} student transfers into district`,
      strength: school.netTransfers > 200 ? "strong" : "moderate",
      leadTime: "6-12 months",
      detail: `Kindergarten enrollment ${school.kindergartenEnrollment.trend}. Capacity utilization at ${school.schoolCapacityUtilization.toFixed(0)}%.`,
      dataFreshness: "quarterly",
    });
  }

  // Search intelligence
  const search = profile.searchIntelligence;
  if (search.signal === "surging_interest") {
    signals.push({
      source: "Google Trends / Search Data",
      signal: `Real estate search volume surging (intent score: ${search.intentScore})`,
      strength: "strong",
      leadTime: "1-3 months",
      detail: `Search volume ${search.searchVolumeVsNational > 0 ? search.searchVolumeVsNational.toFixed(0) + "% above" : Math.abs(search.searchVolumeVsNational).toFixed(0) + "% below"} national baseline. Top terms: ${search.topSearchTerms.slice(0, 3).map(t => t.term).join(", ")}`,
      dataFreshness: "weekly",
    });
  }

  // Mobility patterns
  const mobility = profile.mobilityPatterns;
  if (mobility.signal === "increasing_activity" && mobility.newRouteAnnouncements > 0) {
    signals.push({
      source: "Mobility / Traffic data",
      signal: `${mobility.newRouteAnnouncements} new airline routes + increasing rideshare activity`,
      strength: "moderate",
      leadTime: "6-12 months",
      detail: `Remote work adoption: ${mobility.remoteWorkAdoption.trend}. Coworking occupancy: ${mobility.coworkingOccupancy.trend}.`,
      dataFreshness: "monthly",
    });
  }

  // STR arbitrage
  const str = profile.strRegulationArbitrage;
  if (str.arbitrageOpportunity === "high") {
    signals.push({
      source: "STR regulation analysis",
      signal: `High STR arbitrage: ${str.strVsLongTermPremium.toFixed(0)}% premium over long-term rental`,
      strength: "strong",
      leadTime: "0-3 months",
      detail: `Regulation: ${str.currentRegulation} (${str.regulationTrend}). Neighboring markets restricting STR, creating spillover demand.`,
      dataFreshness: "real-time",
    });
  }

  // Social sentiment
  const social = profile.socialSentiment;
  if (social.sentimentTrend === "improving" && social.neighborhoodSentiment > 30) {
    signals.push({
      source: "Social media sentiment",
      signal: `Neighborhood sentiment strongly positive (${social.neighborhoodSentiment}/100) and improving`,
      strength: "moderate",
      leadTime: "6-18 months",
      detail: `Positive themes: ${social.topPositiveThemes.slice(0, 3).join(", ")}. New business rating: ${social.yelpNewBusinessRating.toFixed(1)}/5.`,
      dataFreshness: "weekly",
    });
  }

  return signals;
}

/**
 * Score alternative data signals (0-100)
 */
export function scoreAlternativeSignals(profile: AlternativeSignalsProfile): number {
  let score = 50;

  // USPS migration
  if (profile.uspsMailMigration.signal === "strong_inflow") score += 12;
  else if (profile.uspsMailMigration.signal === "moderate_inflow") score += 6;
  else if (profile.uspsMailMigration.signal === "moderate_outflow") score -= 6;
  else if (profile.uspsMailMigration.signal === "strong_outflow") score -= 12;

  // Utility signals
  if (profile.utilityConnections.signal === "expansion") score += 8;
  else if (profile.utilityConnections.signal === "contraction") score -= 8;

  // School enrollment
  if (profile.schoolEnrollment.signal === "family_influx") score += 8;
  else if (profile.schoolEnrollment.signal === "families_leaving") score -= 8;

  // Search intelligence
  if (profile.searchIntelligence.signal === "surging_interest") score += 10;
  else if (profile.searchIntelligence.signal === "growing_interest") score += 5;
  else if (profile.searchIntelligence.signal === "declining_interest") score -= 8;

  // Mobility
  if (profile.mobilityPatterns.signal === "increasing_activity") score += 5;
  else if (profile.mobilityPatterns.signal === "decreasing_activity") score -= 5;

  // STR arbitrage
  if (profile.strRegulationArbitrage.arbitrageOpportunity === "high") score += 7;
  else if (profile.strRegulationArbitrage.arbitrageOpportunity === "moderate") score += 3;

  // Social sentiment
  if (profile.socialSentiment.sentimentTrend === "improving") score += 5;
  else if (profile.socialSentiment.sentimentTrend === "declining") score -= 5;

  return Math.max(0, Math.min(100, score));
}
