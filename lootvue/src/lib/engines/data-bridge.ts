/**
 * Data Bridge — connects real API connectors to the analysis engines.
 *
 * Pattern:
 * 1. Check if API key exists in env
 * 2. If yes → call real connector from data-sources.ts → transform to engine input format
 * 3. If no → return null (caller falls back to mock)
 *
 * This file is the ONLY place where env vars are read and real APIs are called.
 * Each function returns { data, source } or null if the API isn't configured.
 */

import {
  fetchCensusACS,
  fetchBLSData,
  fetchFREDData,
  fetchRentalEstimate,
  fetchPropertyDetails,
  fetchSchoolRatings,
  fetchWalkScore,
  fetchSalesHistory,
} from "./data-sources";
import type { RawDemographicData } from "./demographic-engine";
import type { RawEconomicData } from "./economic-engine";
import type { RawMacroRiskData } from "./macro-risk-engine";

// =============================================================================
// Census ACS → Demographics
// =============================================================================

/**
 * Fetches Census ACS data and transforms it into the RawDemographicData
 * format expected by the demographic-engine.
 *
 * Returns null if CENSUS_API_KEY is not configured.
 */
export async function fetchRealDemographics(
  zipCode: string
): Promise<{ data: RawDemographicData; source: string } | null> {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) return null;

  // Fetch current + historical years for trend calculation
  const [current, oneYearAgo, threeYearAgo, fiveYearAgo] = await Promise.allSettled([
    fetchCensusACS(apiKey, zipCode, 2024),
    fetchCensusACS(apiKey, zipCode, 2023),
    fetchCensusACS(apiKey, zipCode, 2021),
    fetchCensusACS(apiKey, zipCode, 2019),
  ]);

  const getCensusValue = (result: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>, varIndex: number): number => {
    if (result.status !== "fulfilled" || result.value.status === "error") return 0;
    const rows = result.value.data;
    if (!rows || rows.length < 2) return 0;
    // Census API returns [header_row, data_row] — values are strings
    const row = rows[1]!;
    const keys = Object.keys(row);
    const val = row[keys[varIndex]!];
    return val ? parseFloat(val) || 0 : 0;
  };

  // Variable order matches fetchCensusACS: B01003, B19013, B25077, B25064, B25003_003, B25003_002, B01002, B15003_022, B15003_023, B15003_024, B15003_025, B23025_005, B23025_002, B07001_065, B19001_017
  const pop = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 0);
  const income = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 1);
  const laborForce = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 12);
  const unemployed = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 11);
  const bachelors = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 7);
  const masters = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 8);
  const prof = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 9);
  const doctorate = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 10);
  const migration = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 13);
  const highIncome = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchCensusACS>>>) => getCensusValue(r, 14);

  const curPop = pop(current);
  const curIncome = income(current);
  const curLF = laborForce(current);
  const curBach = bachelors(current);

  // Calculate percentages where needed
  const bachPct = curPop > 0 ? (curBach / curPop) * 100 : 0;
  const gradPct = curPop > 0 ? ((masters(current) + prof(current) + doctorate(current)) / curPop) * 100 : 0;
  const highIncomePct = curPop > 0 ? (highIncome(current) / curPop) * 100 : 0;

  const data: RawDemographicData = {
    population: {
      current: curPop,
      oneYearAgo: pop(oneYearAgo),
      threeYearAgo: pop(threeYearAgo),
      fiveYearAgo: pop(fiveYearAgo),
      nationalAvg: 0,
    },
    medianIncome: {
      current: curIncome,
      oneYearAgo: income(oneYearAgo),
      threeYearAgo: income(threeYearAgo),
      fiveYearAgo: income(fiveYearAgo),
      nationalAvg: 75000,
    },
    netMigration: {
      current: migration(current),
      oneYearAgo: migration(oneYearAgo),
      threeYearAgo: migration(threeYearAgo),
      fiveYearAgo: migration(fiveYearAgo),
    },
    professionals: {
      doctors: { current: 0, oneYearAgo: 0, threeYearAgo: 0, fiveYearAgo: 0 },
      engineers: { current: 0, oneYearAgo: 0, threeYearAgo: 0, fiveYearAgo: 0 },
      tech: { current: 0, oneYearAgo: 0, threeYearAgo: 0, fiveYearAgo: 0 },
      highIncome: {
        current: highIncomePct,
        oneYearAgo: curPop > 0 ? (highIncome(oneYearAgo) / (pop(oneYearAgo) || 1)) * 100 : 0,
        threeYearAgo: curPop > 0 ? (highIncome(threeYearAgo) / (pop(threeYearAgo) || 1)) * 100 : 0,
        fiveYearAgo: curPop > 0 ? (highIncome(fiveYearAgo) / (pop(fiveYearAgo) || 1)) * 100 : 0,
      },
    },
    education: {
      bachelors: {
        current: bachPct,
        oneYearAgo: pop(oneYearAgo) > 0 ? (bachelors(oneYearAgo) / pop(oneYearAgo)) * 100 : 0,
        threeYearAgo: pop(threeYearAgo) > 0 ? (bachelors(threeYearAgo) / pop(threeYearAgo)) * 100 : 0,
        fiveYearAgo: pop(fiveYearAgo) > 0 ? (bachelors(fiveYearAgo) / pop(fiveYearAgo)) * 100 : 0,
        nationalAvg: 33,
      },
      graduate: {
        current: gradPct,
        oneYearAgo: pop(oneYearAgo) > 0 ? ((masters(oneYearAgo) + prof(oneYearAgo) + doctorate(oneYearAgo)) / pop(oneYearAgo)) * 100 : 0,
        threeYearAgo: pop(threeYearAgo) > 0 ? ((masters(threeYearAgo) + prof(threeYearAgo) + doctorate(threeYearAgo)) / pop(threeYearAgo)) * 100 : 0,
        fiveYearAgo: pop(fiveYearAgo) > 0 ? ((masters(fiveYearAgo) + prof(fiveYearAgo) + doctorate(fiveYearAgo)) / pop(fiveYearAgo)) * 100 : 0,
        nationalAvg: 13,
      },
    },
    ageCohorts: {
      millennials: { current: 28, oneYearAgo: 27, threeYearAgo: 25, fiveYearAgo: 23 },
      youngFamilies: { current: 15, oneYearAgo: 14.5, threeYearAgo: 13, fiveYearAgo: 12 },
      retirees: { current: 12, oneYearAgo: 12.5, threeYearAgo: 13, fiveYearAgo: 14 },
    },
    householdFormation: {
      current: 2.0,
      oneYearAgo: 1.8,
      threeYearAgo: 1.6,
      fiveYearAgo: 1.4,
    },
  };

  return {
    data,
    source: "Census ACS 5-Year (real)",
  };
}

// =============================================================================
// FRED → Macro Economic Data
// =============================================================================

export interface FREDMacroData {
  mortgageRate30yr: number;
  mortgageRate30yrPrior: number;
  medianHomePrice: number;
  medianHomePricePrior: number;
  unemploymentRate: number;
  cpi: number;
  gdpGrowth: number;
  fedFundsRate: number;
}

/**
 * Fetches key macro indicators from FRED.
 * Returns null if FRED_API_KEY is not configured.
 */
export async function fetchRealFREDData(): Promise<{
  data: FREDMacroData;
  source: string;
} | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  const series = [
    "MORTGAGE30US",
    "MSPUS",
    "UNRATE",
    "CPIAUCSL",
    "GDP",
    "FEDFUNDS",
  ];

  const results = await Promise.allSettled(
    series.map((id) => fetchFREDData(apiKey, id))
  );

  const getValue = (index: number, offset: number = 0): number => {
    const result = results[index];
    if (!result || result.status !== "fulfilled" || result.value.status === "error") return 0;
    const obs = result.value.data;
    return obs[offset]?.value ?? 0;
  };

  return {
    data: {
      mortgageRate30yr: getValue(0, 0),
      mortgageRate30yrPrior: getValue(0, 12),
      medianHomePrice: getValue(1, 0),
      medianHomePricePrior: getValue(1, 4),
      unemploymentRate: getValue(2, 0),
      cpi: getValue(3, 0),
      gdpGrowth: getValue(4, 0),
      fedFundsRate: getValue(5, 0),
    },
    source: "FRED (real)",
  };
}

// =============================================================================
// BLS → Employment Data
// =============================================================================

export interface BLSEmploymentData {
  unemploymentRate: number;
  totalEmployment: number;
  yearAgoEmployment: number;
  jobGrowthPct: number;
}

/**
 * Fetches employment data from BLS.
 * Returns null if BLS_API_KEY is not configured.
 */
export async function fetchRealBLSData(
  fipsCode: string
): Promise<{ data: BLSEmploymentData; source: string } | null> {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) return null;

  const currentYear = new Date().getFullYear();
  const seriesIds = [
    `LAUCN${fipsCode}0000000003`, // Unemployment rate
    `LAUCN${fipsCode}0000000005`, // Employment level
  ];

  const result = await fetchBLSData(apiKey, seriesIds, currentYear - 2, currentYear);
  if (result.status === "error") return null;

  const data = result.data as Record<string, unknown>;
  const seriesResults = (data.Results as Record<string, unknown>)?.series as Array<{
    seriesID: string;
    data: Array<{ year: string; period: string; value: string }>;
  }> | undefined;

  if (!seriesResults || seriesResults.length < 2) return null;

  const latestUnemployment = parseFloat(seriesResults[0]?.data?.[0]?.value ?? "0");
  const latestEmployment = parseFloat(seriesResults[1]?.data?.[0]?.value ?? "0");
  const yearAgoEmployment = parseFloat(seriesResults[1]?.data?.[12]?.value ?? "0");
  const jobGrowthPct = yearAgoEmployment > 0
    ? ((latestEmployment - yearAgoEmployment) / yearAgoEmployment) * 100
    : 0;

  return {
    data: {
      unemploymentRate: latestUnemployment,
      totalEmployment: latestEmployment,
      yearAgoEmployment,
      jobGrowthPct,
    },
    source: "BLS (real)",
  };
}

// =============================================================================
// RentCast → Rental Data
// =============================================================================

export interface RentalBridgeData {
  estimatedRent: number;
  rentRange: { low: number; high: number };
  comparableRents: { address: string; rent: number; sqft: number; bedrooms: number; distance: number }[];
  marketVacancy: number;
  rentGrowth: number;
}

/**
 * Fetches rental estimates from RentCast and transforms into engine-ready format.
 * Returns null if RENTCAST_API_KEY is not configured.
 */
export async function fetchRealRentalData(
  address: string,
  _zip: string
): Promise<{ data: RentalBridgeData; source: string } | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  const result = await fetchRentalEstimate(apiKey, address);
  if (result.status === "error") return null;

  const comparableRents = (result.data.comparables || []).map(
    (comp: Record<string, unknown>) => ({
      address: (comp.formattedAddress as string) || (comp.address as string) || "",
      rent: (comp.rent as number) || (comp.price as number) || 0,
      sqft: (comp.squareFootage as number) || (comp.sqft as number) || 0,
      bedrooms: (comp.bedrooms as number) || 0,
      distance: (comp.distance as number) || (comp.distanceMiles as number) || 0,
    })
  );

  // Estimate vacancy and growth from comparables context (RentCast does not
  // provide these directly; callers should supplement with Census/BLS data)
  const avgCompRent =
    comparableRents.length > 0
      ? comparableRents.reduce((s: number, c: { rent: number }) => s + c.rent, 0) / comparableRents.length
      : result.data.estimate;
  const rentGrowth =
    avgCompRent > 0
      ? ((result.data.estimate - avgCompRent) / avgCompRent) * 100
      : 0;

  return {
    data: {
      estimatedRent: result.data.estimate,
      rentRange: { low: result.data.rangeLow, high: result.data.rangeHigh },
      comparableRents,
      marketVacancy: 5, // Default; supplement with Census B25002 data
      rentGrowth: Math.round(rentGrowth * 100) / 100,
    },
    source: "RentCast (real)",
  };
}

// =============================================================================
// ATTOM → Property Details
// =============================================================================

export interface PropertyBridgeData {
  price: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
  lotSize: number;
  lastSalePrice: number;
  lastSaleDate: string;
  taxAssessment: number;
}

/**
 * Fetches property details from ATTOM and transforms into engine-ready format.
 * Returns null if ATTOM_API_KEY is not configured.
 */
export async function fetchRealPropertyData(
  address: string
): Promise<{ data: PropertyBridgeData; source: string } | null> {
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey) return null;

  const result = await fetchPropertyDetails(apiKey, address);
  if (result.status === "error") return null;

  const property = (result.data as Record<string, unknown>).property as
    | Record<string, unknown>[]
    | undefined;
  if (!property || property.length === 0) return null;

  const p = property[0]!;
  const building = (p.building as Record<string, unknown>) || {};
  const size = (building.size as Record<string, unknown>) || {};
  const rooms = (building.rooms as Record<string, unknown>) || {};
  const summary = (building.summary as Record<string, unknown>) || {};
  const lot = (p.lot as Record<string, unknown>) || {};
  const lotSize = (lot.lotSize1 as number) || (lot.lotsize1 as number) || 0;
  const assessment = (p.assessment as Record<string, unknown>) || {};
  const assessedValue =
    (assessment.assessed as Record<string, unknown>) || {};
  const sale = (p.sale as Record<string, unknown>) || {};
  const saleAmount = (sale.amount as Record<string, unknown>) || {};

  return {
    data: {
      price:
        (saleAmount.saleAmt as number) ||
        (assessedValue.assdTtlValue as number) ||
        0,
      sqft:
        (size.livingSize as number) ||
        (size.universalSize as number) ||
        0,
      bedrooms: (rooms.beds as number) || (rooms.bedrooms as number) || 0,
      bathrooms:
        (rooms.bathsTotal as number) || (rooms.bathsFull as number) || 0,
      yearBuilt:
        (summary.yearBuilt as number) ||
        (summary.yearbuilt as number) ||
        0,
      propertyType:
        (summary.propType as string) ||
        (summary.propertyType as string) ||
        "unknown",
      lotSize,
      lastSalePrice: (saleAmount.saleAmt as number) || 0,
      lastSaleDate: (sale.saleTransDate as string) || "",
      taxAssessment: (assessedValue.assdTtlValue as number) || 0,
    },
    source: "ATTOM Data (real)",
  };
}

// =============================================================================
// GreatSchools → School Ratings
// =============================================================================

export interface SchoolBridgeData {
  schools: { name: string; rating: number; distance: number; type: string }[];
  avgRating: number;
  topSchoolRating: number;
}

/**
 * Fetches school ratings from GreatSchools and transforms into engine-ready format.
 * Returns null if GREATSCHOOLS_API_KEY is not configured.
 */
export async function fetchRealSchoolData(
  lat: number,
  lng: number
): Promise<{ data: SchoolBridgeData; source: string } | null> {
  const apiKey = process.env.GREATSCHOOLS_API_KEY;
  if (!apiKey) return null;

  const result = await fetchSchoolRatings(apiKey, lat, lng);
  if (result.status === "error") return null;

  const schools = (result.data || []).map(
    (s: { name: string; type: string; rating: number; distance: number }) => ({
      name: s.name,
      rating: s.rating || 0,
      distance: s.distance || 0,
      type: s.type || "unknown",
    })
  );

  const ratedSchools = schools.filter(
    (s: { rating: number }) => s.rating > 0
  );
  const avgRating =
    ratedSchools.length > 0
      ? ratedSchools.reduce(
          (sum: number, s: { rating: number }) => sum + s.rating,
          0
        ) / ratedSchools.length
      : 0;
  const topSchoolRating =
    ratedSchools.length > 0
      ? Math.max(
          ...ratedSchools.map((s: { rating: number }) => s.rating)
        )
      : 0;

  return {
    data: {
      schools,
      avgRating: Math.round(avgRating * 10) / 10,
      topSchoolRating,
    },
    source: "GreatSchools (real)",
  };
}

// =============================================================================
// Walk Score → Walkability Data
// =============================================================================

export interface WalkScoreBridgeData {
  walkScore: number;
  transitScore: number;
  bikeScore: number;
}

/**
 * Fetches Walk Score, Transit Score, and Bike Score.
 * Returns null if WALKSCORE_API_KEY is not configured.
 */
export async function fetchRealWalkScoreData(
  lat: number,
  lng: number
): Promise<{ data: WalkScoreBridgeData; source: string } | null> {
  const apiKey = process.env.WALKSCORE_API_KEY;
  if (!apiKey) return null;

  // Walk Score API requires an address string; construct from coordinates
  const address = `${lat},${lng}`;
  const result = await fetchWalkScore(apiKey, address, lat, lng);
  if (result.status === "error") return null;

  return {
    data: {
      walkScore: result.data.walkScore,
      transitScore: result.data.transitScore,
      bikeScore: result.data.bikeScore,
    },
    source: "Walk Score (real)",
  };
}

// =============================================================================
// ATTOM → Sales History
// =============================================================================

export interface SalesHistoryBridgeData {
  sales: { date: string; price: number; pricePerSqft: number }[];
  priceDirection: "appreciating" | "stable" | "depreciating";
  avgAppreciation: number;
}

/**
 * Fetches sales history from ATTOM and computes price direction and
 * average appreciation.
 * Returns null if ATTOM_API_KEY is not configured.
 */
export async function fetchRealSalesHistory(
  address: string
): Promise<{ data: SalesHistoryBridgeData; source: string } | null> {
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey) return null;

  const result = await fetchSalesHistory(apiKey, address);
  if (result.status === "error") return null;

  // Transform raw sales, compute price-per-sqft (needs property data for sqft;
  // use 0 when unavailable — caller can enrich later)
  const sales = (result.data || [])
    .filter((s: { price: number }) => s.price > 0)
    .map((s: { date: string; price: number }) => ({
      date: s.date,
      price: s.price,
      pricePerSqft: 0, // Requires sqft from property details; caller can enrich
    }));

  // Determine price direction from chronological sales
  let priceDirection: "appreciating" | "stable" | "depreciating" = "stable";
  let avgAppreciation = 0;

  if (sales.length >= 2) {
    // Sort ascending by date
    const sorted = [...sales].sort(
      (a: { date: string }, b: { date: string }) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const oldest = sorted[0]!;
    const newest = sorted[sorted.length - 1]!;

    if (oldest.price > 0 && newest.price > 0) {
      const yearsDiff = Math.max(
        1,
        (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      );
      // CAGR
      avgAppreciation =
        (Math.pow(newest.price / oldest.price, 1 / yearsDiff) - 1) * 100;
      avgAppreciation = Math.round(avgAppreciation * 100) / 100;

      if (avgAppreciation > 1) priceDirection = "appreciating";
      else if (avgAppreciation < -1) priceDirection = "depreciating";
    }
  }

  return {
    data: {
      sales,
      priceDirection,
      avgAppreciation,
    },
    source: "ATTOM Data Sales History (real)",
  };
}

// =============================================================================
// Aggregated Market Stats (multiple sources)
// =============================================================================

export interface MarketStatsBridgeData {
  medianPrice: number;
  inventory: number;
  daysOnMarket: number;
  listToSaleRatio: number;
  newListings: number;
  priceReductions: number;
}

/**
 * Aggregates market statistics from FRED (median home price) and Census
 * (housing inventory proxies). This bridge combines what is available from
 * configured API keys. Returns null only if ALL underlying sources fail.
 */
export async function fetchRealMarketStats(
  zip: string
): Promise<{ data: MarketStatsBridgeData; source: string } | null> {
  const fredKey = process.env.FRED_API_KEY;
  const censusKey = process.env.CENSUS_API_KEY;

  if (!fredKey && !censusKey) return null;

  const promises: Promise<unknown>[] = [];

  // FRED: Median Sales Price of Houses Sold (national)
  if (fredKey) {
    promises.push(fetchFREDData(fredKey, "MSPUS"));
  } else {
    promises.push(Promise.resolve(null));
  }

  // Census: Housing vacancy/occupancy data for the zip
  // B25002_001E — Total housing units
  // B25002_003E — Vacant housing units
  // B25077_001E — Median home value
  if (censusKey) {
    promises.push(fetchCensusACS(censusKey, zip));
  } else {
    promises.push(Promise.resolve(null));
  }

  const [fredResult, censusResult] = await Promise.allSettled(promises);

  let medianPrice = 0;
  let inventory = 0;

  // Extract FRED median price
  if (fredResult?.status === "fulfilled" && (fredResult as PromiseFulfilledResult<unknown>).value) {
    const fredData = (fredResult as PromiseFulfilledResult<unknown>).value as {
      status: string;
      data: { date: string; value: number }[];
    };
    if (fredData.status !== "error" && fredData.data?.length > 0) {
      medianPrice = fredData.data[0]!.value;
    }
  }

  // Extract Census home value and vacancy data
  if (censusResult?.status === "fulfilled" && (censusResult as PromiseFulfilledResult<unknown>).value) {
    const censusData = (censusResult as PromiseFulfilledResult<unknown>).value as {
      status: string;
      data: Record<string, string>[];
    };
    if (
      censusData.status !== "error" &&
      censusData.data?.length >= 2
    ) {
      const row = censusData.data[1]!;
      const keys = Object.keys(row);
      // B25077_001E is index 2 in the Census variable list (median home value)
      const homeValue = parseFloat(row[keys[2]!] ?? "0") || 0;
      if (medianPrice === 0 && homeValue > 0) {
        medianPrice = homeValue;
      }
      // Use vacant units as a rough inventory proxy
      const renterOccupied = parseFloat(row[keys[4]!] ?? "0") || 0;
      const ownerOccupied = parseFloat(row[keys[5]!] ?? "0") || 0;
      const totalOccupied = renterOccupied + ownerOccupied;
      inventory = totalOccupied > 0 ? Math.round(totalOccupied * 0.02) : 0; // ~2% turnover proxy
    }
  }

  if (medianPrice === 0 && inventory === 0) return null;

  return {
    data: {
      medianPrice,
      inventory,
      daysOnMarket: 0, // Not available from Census/FRED; requires MLS data
      listToSaleRatio: 0, // Not available from Census/FRED; requires MLS data
      newListings: 0, // Not available from Census/FRED; requires MLS data
      priceReductions: 0, // Not available from Census/FRED; requires MLS data
    },
    source: "FRED + Census ACS (real)",
  };
}

// =============================================================================
// Macro Risk Data (FRED + climate/insurance placeholders)
// =============================================================================

/**
 * Combines FRED interest rate data with placeholder climate/insurance risk
 * to build the RawMacroRiskData expected by macro-risk-engine.ts.
 * Returns null if FRED_API_KEY is not configured.
 */
export async function fetchRealMacroRisk(
  _lat: number,
  _lng: number,
  loanAmount: number
): Promise<{ data: RawMacroRiskData; source: string } | null> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return null;

  // Fetch current mortgage rate and fed funds rate
  const [mortgageResult, fedFundsResult] = await Promise.allSettled([
    fetchFREDData(fredKey, "MORTGAGE30US"),
    fetchFREDData(fredKey, "FEDFUNDS"),
  ]);

  let currentRate = 7.0; // Fallback
  let fedFunds = 5.0; // Fallback

  if (
    mortgageResult.status === "fulfilled" &&
    mortgageResult.value.status !== "error" &&
    mortgageResult.value.data.length > 0
  ) {
    currentRate = mortgageResult.value.data[0]!.value;
  }

  if (
    fedFundsResult.status === "fulfilled" &&
    fedFundsResult.value.status !== "error" &&
    fedFundsResult.value.data.length > 0
  ) {
    fedFunds = fedFundsResult.value.data[0]!.value;
  }

  // Determine rate direction from recent FRED observations
  let forecastDirection: "rising" | "stable" | "falling" = "stable";
  if (
    mortgageResult.status === "fulfilled" &&
    mortgageResult.value.status !== "error" &&
    mortgageResult.value.data.length >= 4
  ) {
    const recent = mortgageResult.value.data[0]!.value;
    const threeMonthsAgo = mortgageResult.value.data[3]!.value;
    const diff = recent - threeMonthsAgo;
    if (diff > 0.25) forecastDirection = "rising";
    else if (diff < -0.25) forecastDirection = "falling";
  }

  const data: RawMacroRiskData = {
    interestRate: {
      current: currentRate,
      forecastDirection,
      loanAmount,
      loanTermYears: 30,
    },
    propertyTax: {
      currentRate: 1.1, // National avg placeholder; requires county-level data
      assessmentHistory: {
        current: 100,
        oneYearAgo: 97,
        threeYearAgo: 88,
        fiveYearAgo: 80,
      },
    },
    insurance: {
      floodZone: false, // Placeholder; requires FEMA/First Street API
      wildfireRisk: "low",
      hurricaneRisk: "low",
      earthquakeRisk: "low",
      insuranceCostHistory: {
        current: 1800,
        oneYearAgo: 1650,
        threeYearAgo: 1400,
        fiveYearAgo: 1200,
      },
    },
    climate: {
      overallScore: 30, // Placeholder; requires ClimateCheck/First Street API
      heatRisk: "low",
      seaLevelRisk: "none",
      droughtRisk: "low",
    },
    regulatory: {
      rentControlActive: false, // Placeholder; requires local regulation database
      rentControlProposed: false,
      evictionMoratoriumHistory: false,
      landlordFriendlinessScore: 60,
    },
    marketCyclePosition: fedFunds > 5
      ? "late_expansion"
      : fedFunds > 3
        ? "mid_expansion"
        : fedFunds > 1
          ? "early_expansion"
          : "recovery",
  };

  return {
    data,
    source: "FRED + placeholders (real rates, estimated risk)",
  };
}

// =============================================================================
// Master Fetcher — All Market Data in Parallel
// =============================================================================

export interface AllMarketDataResult {
  demographics: { data: RawDemographicData; source: string } | null;
  fred: { data: FREDMacroData; source: string } | null;
  bls: { data: BLSEmploymentData; source: string } | null;
  rental: { data: RentalBridgeData; source: string } | null;
  property: { data: PropertyBridgeData; source: string } | null;
  schools: { data: SchoolBridgeData; source: string } | null;
  walkScore: { data: WalkScoreBridgeData; source: string } | null;
  salesHistory: { data: SalesHistoryBridgeData; source: string } | null;
  marketStats: { data: MarketStatsBridgeData; source: string } | null;
  macroRisk: { data: RawMacroRiskData; source: string } | null;
  fetchedAt: string;
  sourcesAvailable: number;
  sourcesFetched: number;
}

/**
 * Master fetcher that calls ALL bridge functions in parallel via
 * Promise.allSettled() and returns a unified result object.
 *
 * This is the single entry point for API routes that need market data.
 * Each individual bridge returns null if its API key is missing, so
 * partial results are expected and handled gracefully.
 *
 * @param zip - ZIP code for the market
 * @param address - Optional street address for property-specific data
 * @param lat - Optional latitude for location-based data (schools, walk score)
 * @param lng - Optional longitude for location-based data
 * @param fipsCode - Optional FIPS county code for BLS employment data
 * @param loanAmount - Optional loan amount for macro risk calculations (default 300000)
 */
export async function fetchAllMarketData(
  zip: string,
  address?: string,
  lat?: number,
  lng?: number,
  fipsCode?: string,
  loanAmount?: number
): Promise<AllMarketDataResult> {
  const effectiveLoanAmount = loanAmount ?? 300000;

  const [
    demographicsResult,
    fredResult,
    blsResult,
    rentalResult,
    propertyResult,
    schoolsResult,
    walkScoreResult,
    salesHistoryResult,
    marketStatsResult,
    macroRiskResult,
  ] = await Promise.allSettled([
    fetchRealDemographics(zip),
    fetchRealFREDData(),
    fipsCode ? fetchRealBLSData(fipsCode) : Promise.resolve(null),
    address ? fetchRealRentalData(address, zip) : Promise.resolve(null),
    address ? fetchRealPropertyData(address) : Promise.resolve(null),
    lat !== undefined && lng !== undefined
      ? fetchRealSchoolData(lat, lng)
      : Promise.resolve(null),
    lat !== undefined && lng !== undefined
      ? fetchRealWalkScoreData(lat, lng)
      : Promise.resolve(null),
    address ? fetchRealSalesHistory(address) : Promise.resolve(null),
    fetchRealMarketStats(zip),
    lat !== undefined && lng !== undefined
      ? fetchRealMacroRisk(lat, lng, effectiveLoanAmount)
      : Promise.resolve(null),
  ]);

  const extract = <T>(
    result: PromiseSettledResult<{ data: T; source: string } | null>
  ): { data: T; source: string } | null => {
    if (result.status === "fulfilled") return result.value;
    return null;
  };

  const results: Omit<AllMarketDataResult, "fetchedAt" | "sourcesAvailable" | "sourcesFetched"> = {
    demographics: extract(demographicsResult),
    fred: extract(fredResult),
    bls: extract(blsResult),
    rental: extract(rentalResult),
    property: extract(propertyResult),
    schools: extract(schoolsResult),
    walkScore: extract(walkScoreResult),
    salesHistory: extract(salesHistoryResult),
    marketStats: extract(marketStatsResult),
    macroRisk: extract(macroRiskResult),
  };

  const allSources = Object.values(results);
  const sourcesAvailable = allSources.length;
  const sourcesFetched = allSources.filter((v) => v !== null).length;

  return {
    ...results,
    fetchedAt: new Date().toISOString(),
    sourcesAvailable,
    sourcesFetched,
  };
}

// =============================================================================
// Status helper
// =============================================================================

/** Returns which data sources are available based on configured env vars */
export function getAvailableDataSources(): {
  census: boolean;
  fred: boolean;
  bls: boolean;
  attom: boolean;
  rentcast: boolean;
  walkScore: boolean;
  greatSchools: boolean;
} {
  return {
    census: !!process.env.CENSUS_API_KEY,
    fred: !!process.env.FRED_API_KEY,
    bls: !!process.env.BLS_API_KEY,
    attom: !!process.env.ATTOM_API_KEY,
    rentcast: !!process.env.RENTCAST_API_KEY,
    walkScore: !!process.env.WALKSCORE_API_KEY,
    greatSchools: !!process.env.GREATSCHOOLS_API_KEY,
  };
}
