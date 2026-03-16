/**
 * GET /api/market/expenses?zip=78745
 *
 * Returns ZIP-level property tax rate and rental vacancy rate derived from
 * Census ACS 5-Year estimates, plus a state-level management fee lookup.
 *
 * Census variables used:
 *   B25103_001E — Median real estate taxes paid (dollars, owner-occupied)
 *   B25077_001E — Median home value (dollars, owner-occupied)
 *   Effective tax rate = B25103_001E / B25077_001E
 *
 *   B25004_002E — Vacant units: for rent
 *   B25004_003E — Vacant units: rented, not occupied
 *   B25003_003E — Renter-occupied units
 *   Rental vacancy rate = (B25004_002E + B25004_003E) /
 *                         (B25003_003E + B25004_002E + B25004_003E)
 *   Formula source: Census Bureau Vacancy Rate Fact Sheet
 *   https://www.census.gov/topics/housing/guidance/vacancy-fact-sheet.html
 *
 * Fallback hierarchy:
 *   1. ZIP-level ACS5 data (confidence: high)
 *   2. State-level ACS5 data (confidence: medium)
 *   3. National averages (confidence: low)
 *
 * Cache: 30 days (Census ACS updates annually)
 * Auth: CENSUS_API_KEY env var required
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import {
  compose,
  withRateLimit,
  withCache,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Census ACS5 variables for this endpoint.
 * B25103_001E: Median real estate taxes paid (dollars)
 * B25077_001E: Median home value (dollars)
 * B25004_002E: Vacant — for rent
 * B25004_003E: Vacant — rented, not occupied
 * B25003_003E: Renter-occupied housing units
 */
const CENSUS_VARS =
  "B25103_001E,B25077_001E,B25004_002E,B25004_003E,B25003_003E";

/**
 * Census returns -666666666 for suppressed/unavailable values at small
 * geographies. Treat those as missing.
 */
const CENSUS_NULL_VALUE = -666666666;

const CENSUS_ACS_YEAR = 2022; // Latest available ACS5 as of 2026-03

/**
 * National fallback values when Census data is unavailable.
 * Tax rate: national average ~0.90% (NAHB/Census 2023)
 * Vacancy: national average ~5.8% (Census 2022 ACS)
 */
const NATIONAL_FALLBACKS = {
  propertyTaxRate: 0.009, // 0.90%
  rentalVacancyRate: 0.058, // 5.8%
  medianHomeValue: 0,
  medianTaxPaid: 0,
};

/**
 * State-level management fee averages (% of gross rent).
 * Source: National Association of Residential Property Managers (NARPM)
 * industry survey data and regional market research, 2024.
 * National average: 8.5%
 */
export const MGMT_FEE_BY_STATE: Record<string, number> = {
  AL: 0.1,
  AK: 0.1,
  AZ: 0.08,
  AR: 0.1,
  CA: 0.07,
  CO: 0.08,
  CT: 0.09,
  DE: 0.09,
  DC: 0.08,
  FL: 0.09,
  GA: 0.09,
  HI: 0.1,
  ID: 0.09,
  IL: 0.08,
  IN: 0.1,
  IA: 0.1,
  KS: 0.1,
  KY: 0.1,
  LA: 0.1,
  ME: 0.1,
  MD: 0.08,
  MA: 0.07,
  MI: 0.09,
  MN: 0.08,
  MS: 0.1,
  MO: 0.1,
  MT: 0.1,
  NE: 0.1,
  NV: 0.08,
  NH: 0.09,
  NJ: 0.08,
  NM: 0.1,
  NY: 0.07,
  NC: 0.09,
  ND: 0.1,
  OH: 0.09,
  OK: 0.1,
  OR: 0.08,
  PA: 0.09,
  RI: 0.09,
  SC: 0.1,
  SD: 0.1,
  TN: 0.1,
  TX: 0.09,
  UT: 0.09,
  VT: 0.1,
  VA: 0.08,
  WA: 0.08,
  WV: 0.1,
  WI: 0.09,
  WY: 0.1,
};

/** Returns state-level management fee or national average if state not found */
export function getMgmtFeeForState(stateCode: string): number {
  return MGMT_FEE_BY_STATE[stateCode.toUpperCase()] ?? 0.085;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  zip: z
    .string()
    .regex(/^\d{5}$/, "ZIP code must be exactly 5 digits"),
});

/**
 * Raw Census ACS response: [header_row, data_row] where each row is an
 * array of string values matching the CENSUS_VARS order.
 */
const CensusRowSchema = z.array(z.string());
const CensusResponseSchema = z.array(CensusRowSchema).min(2);

export const ExpenseEstimateSchema = z.object({
  zip: z.string(),
  propertyTaxRate: z.number().min(0).max(0.1),
  rentalVacancyRate: z.number().min(0).max(0.5),
  medianHomeValue: z.number().min(0),
  medianTaxPaid: z.number().min(0),
  managementFeeRate: z.number().min(0).max(0.25),
  state: z.string().optional(),
  source: z.string(),
  asOfDate: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  dataGaps: z.array(z.string()),
});

export type ExpenseEstimate = z.infer<typeof ExpenseEstimateSchema>;

// ─── Census Fetcher ───────────────────────────────────────────────────────────

interface CensusVarRow {
  medianTaxPaid: number;
  medianHomeValue: number;
  vacantForRent: number;
  vacantRentedNotOccupied: number;
  renterOccupied: number;
}

/**
 * Parses a Census ACS row array into typed values.
 * Census variable order matches CENSUS_VARS constant above:
 * [0] B25103_001E — median tax paid
 * [1] B25077_001E — median home value
 * [2] B25004_002E — vacant for rent
 * [3] B25004_003E — vacant rented not occupied
 * [4] B25003_003E — renter occupied
 * [-1] geography value (always last column from Census API)
 */
function parseCensusRow(headerRow: string[], dataRow: string[]): CensusVarRow {
  const idx = (varName: string): number => headerRow.indexOf(varName);

  const parseVal = (i: number): number => {
    if (i === -1) return 0;
    const raw = dataRow[i];
    if (raw === null || raw === undefined || raw === "") return 0;
    const n = parseFloat(raw);
    if (!isFinite(n) || n === CENSUS_NULL_VALUE || n < 0) return 0;
    return n;
  };

  return {
    medianTaxPaid: parseVal(idx("B25103_001E")),
    medianHomeValue: parseVal(idx("B25077_001E")),
    vacantForRent: parseVal(idx("B25004_002E")),
    vacantRentedNotOccupied: parseVal(idx("B25004_003E")),
    renterOccupied: parseVal(idx("B25003_003E")),
  };
}

/**
 * Fetches Census ACS5 data for a given geography.
 * Returns null if the API returns no data or all suppressed values.
 */
async function fetchCensusExpenseVars(
  apiKey: string,
  geography: string,
  year: number = CENSUS_ACS_YEAR
): Promise<CensusVarRow | null> {
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${CENSUS_VARS}&for=${encodeURIComponent(geography)}&key=${apiKey}`;

  const start = Date.now();
  let status = 0;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      // Census API typically responds in 1-3s; 10s is generous
      signal: AbortSignal.timeout(10_000),
    });
    status = response.status;

    if (!response.ok) {
      console.error(
        `[expenses] Census API error ${response.status} for ${geography} — ${response.statusText}`
      );
      return null;
    }

    const raw: unknown = await response.json();
    const parsed = CensusResponseSchema.safeParse(raw);

    if (!parsed.success) {
      console.error(
        `[expenses] Census response validation failed for ${geography}:`,
        parsed.error.issues
      );
      return null;
    }

    const [headerRow, dataRow] = parsed.data;
    if (!headerRow || !dataRow) return null;

    const row = parseCensusRow(headerRow, dataRow);
    const latencyMs = Date.now() - start;

    console.info(
      `[expenses] Census ACS5 fetch: geo="${geography}" status=${status} latency=${latencyMs}ms ` +
        `taxPaid=${row.medianTaxPaid} homeValue=${row.medianHomeValue} ` +
        `forRent=${row.vacantForRent} renterOcc=${row.renterOccupied}`
    );

    // If all tax/value fields are zero, the geography has no usable data
    if (row.medianTaxPaid === 0 && row.medianHomeValue === 0) {
      console.warn(
        `[expenses] Census returned all-zero tax/value for ${geography} — treating as no data`
      );
      return null;
    }

    return row;
  } catch (err) {
    const latencyMs = Date.now() - start;
    console.error(
      `[expenses] Census fetch failed for ${geography} (${latencyMs}ms):`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ─── ZIP-to-state helper ──────────────────────────────────────────────────────

/**
 * Maps the first 3 digits of a ZIP code to a 2-letter state abbreviation.
 * This is a coarse but zero-dependency approximation that covers all US ZIPs.
 * Used only for the management fee lookup; the state fallback call uses Census
 * state FIPS directly via the ZIP prefix.
 *
 * Source: USPS ZIP Code prefix allocation data.
 */
function stateFromZip(zip: string): string {
  const prefix = parseInt(zip.substring(0, 3), 10);
  if (prefix >= 0 && prefix <= 9) return "PR"; // Puerto Rico 00xxx
  if (prefix >= 10 && prefix <= 27) return "MA";
  if (prefix >= 28 && prefix <= 29) return "RI";
  if (prefix >= 30 && prefix <= 39) return "NH";
  if (prefix >= 40 && prefix <= 49) return "ME";
  if (prefix >= 50 && prefix <= 54) return "VT";
  if (prefix >= 55 && prefix <= 59) return "MA"; // overlap; use MA
  if (prefix >= 60 && prefix <= 69) return "CT";
  if (prefix >= 70 && prefix <= 89) return "NJ";
  if (prefix >= 90 && prefix <= 99) return "NJ";
  if (prefix >= 100 && prefix <= 149) return "NY";
  if (prefix >= 150 && prefix <= 196) return "PA";
  if (prefix >= 197 && prefix <= 199) return "DE";
  if (prefix >= 200 && prefix <= 205) return "DC";
  if (prefix >= 206 && prefix <= 212) return "MD";
  if (prefix >= 214 && prefix <= 219) return "MD";
  if (prefix >= 220 && prefix <= 246) return "VA";
  if (prefix >= 247 && prefix <= 268) return "WV";
  if (prefix >= 270 && prefix <= 289) return "NC";
  if (prefix >= 290 && prefix <= 299) return "SC";
  if (prefix >= 300 && prefix <= 319) return "GA";
  if (prefix >= 320 && prefix <= 349) return "FL";
  if (prefix >= 350 && prefix <= 369) return "AL";
  if (prefix >= 370 && prefix <= 385) return "TN";
  if (prefix >= 386 && prefix <= 397) return "MS";
  if (prefix >= 398 && prefix <= 399) return "GA";
  if (prefix >= 400 && prefix <= 427) return "KY";
  if (prefix >= 430 && prefix <= 458) return "OH";
  if (prefix >= 460 && prefix <= 479) return "IN";
  if (prefix >= 480 && prefix <= 499) return "MI";
  if (prefix >= 500 && prefix <= 528) return "IA";
  if (prefix >= 530 && prefix <= 549) return "WI";
  if (prefix >= 550 && prefix <= 567) return "MN";
  if (prefix >= 570 && prefix <= 577) return "SD";
  if (prefix >= 580 && prefix <= 588) return "ND";
  if (prefix >= 590 && prefix <= 599) return "MT";
  if (prefix >= 600 && prefix <= 629) return "IL";
  if (prefix >= 630 && prefix <= 658) return "MO";
  if (prefix >= 660 && prefix <= 679) return "KS";
  if (prefix >= 680 && prefix <= 693) return "NE";
  if (prefix >= 700 && prefix <= 714) return "LA";
  if (prefix >= 716 && prefix <= 729) return "AR";
  if (prefix >= 730 && prefix <= 749) return "OK";
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 800 && prefix <= 816) return "CO";
  if (prefix >= 820 && prefix <= 831) return "WY";
  if (prefix >= 832 && prefix <= 838) return "ID";
  if (prefix >= 840 && prefix <= 847) return "UT";
  if (prefix >= 850 && prefix <= 865) return "AZ";
  if (prefix >= 870 && prefix <= 884) return "NM";
  if (prefix >= 885 && prefix <= 885) return "TX";
  if (prefix >= 889 && prefix <= 898) return "NV";
  if (prefix >= 900 && prefix <= 961) return "CA";
  if (prefix >= 970 && prefix <= 979) return "OR";
  if (prefix >= 980 && prefix <= 994) return "WA";
  if (prefix >= 995 && prefix <= 999) return "AK";
  return "US"; // Unknown — use national average
}

/**
 * Maps a state abbreviation to its Census state FIPS code (zero-padded).
 */
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56", PR: "72",
};

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Computes the expense estimate from a Census variable row.
 * All rate arithmetic uses integer-safe division with explicit rounding.
 */
function computeRates(row: CensusVarRow): {
  propertyTaxRate: number;
  rentalVacancyRate: number;
  medianHomeValue: number;
  medianTaxPaid: number;
  dataGaps: string[];
} {
  const dataGaps: string[] = [];

  // Effective property tax rate = median taxes paid / median home value
  let propertyTaxRate = NATIONAL_FALLBACKS.propertyTaxRate;
  if (row.medianTaxPaid > 0 && row.medianHomeValue > 0) {
    propertyTaxRate = row.medianTaxPaid / row.medianHomeValue;
    // Clamp to a sane range (0.1% – 4.0%) to catch data anomalies
    propertyTaxRate = Math.max(0.001, Math.min(0.04, propertyTaxRate));
  } else {
    dataGaps.push("property_tax_rate");
  }

  // Rental vacancy rate
  // Formula: (for_rent + rented_not_occupied) / (renter_occupied + for_rent + rented_not_occupied)
  // Source: Census Bureau Vacancy Rate Fact Sheet
  let rentalVacancyRate = NATIONAL_FALLBACKS.rentalVacancyRate;
  const totalVacantRental = row.vacantForRent + row.vacantRentedNotOccupied;
  const totalRentalUnits = row.renterOccupied + totalVacantRental;
  if (totalRentalUnits > 0) {
    rentalVacancyRate = totalVacantRental / totalRentalUnits;
    // Clamp to sane range (1% – 30%)
    rentalVacancyRate = Math.max(0.01, Math.min(0.3, rentalVacancyRate));
  } else {
    dataGaps.push("rental_vacancy_rate");
  }

  return {
    propertyTaxRate: Math.round(propertyTaxRate * 100000) / 100000,
    rentalVacancyRate: Math.round(rentalVacancyRate * 100000) / 100000,
    medianHomeValue: row.medianHomeValue,
    medianTaxPaid: row.medianTaxPaid,
    dataGaps,
  };
}

/**
 * Main fetcher: tries ZIP → state fallback → national fallback.
 * Returns a validated ExpenseEstimate.
 */
async function fetchExpenseEstimate(
  apiKey: string,
  zip: string
): Promise<{ data: ExpenseEstimate; source: string } | null> {
  const state = stateFromZip(zip);
  const mgmtFeeRate = getMgmtFeeForState(state);

  // Attempt 1: ZIP-level (ZCTA)
  const zipGeo = `zip code tabulation area:${zip}`;
  const zipRow = await fetchCensusExpenseVars(apiKey, zipGeo);

  if (zipRow) {
    const computed = computeRates(zipRow);
    const result: ExpenseEstimate = {
      zip,
      ...computed,
      managementFeeRate: mgmtFeeRate,
      state,
      source: `Census ACS 5-Year ${CENSUS_ACS_YEAR}`,
      asOfDate: String(CENSUS_ACS_YEAR),
      confidence: computed.dataGaps.length === 0 ? "high" : "medium",
    };
    const validated = ExpenseEstimateSchema.safeParse(result);
    if (!validated.success) {
      console.error("[expenses] Schema validation failed on ZIP result:", validated.error.issues);
      return null;
    }
    return { data: validated.data, source: `Census ACS 5-Year ${CENSUS_ACS_YEAR} (ZCTA)` };
  }

  // Attempt 2: State-level fallback
  const stateFips = STATE_FIPS[state];
  if (stateFips) {
    console.info(`[expenses] ZIP ${zip} has no data — falling back to state ${state} (FIPS ${stateFips})`);
    const stateGeo = `state:${stateFips}`;
    const stateRow = await fetchCensusExpenseVars(apiKey, stateGeo);

    if (stateRow) {
      const computed = computeRates(stateRow);
      const result: ExpenseEstimate = {
        zip,
        ...computed,
        managementFeeRate: mgmtFeeRate,
        state,
        source: `Census ACS 5-Year ${CENSUS_ACS_YEAR} (state-level fallback: ${state})`,
        asOfDate: String(CENSUS_ACS_YEAR),
        confidence: "medium",
        dataGaps: [...computed.dataGaps, "zip_level_data_unavailable"],
      };
      const validated = ExpenseEstimateSchema.safeParse(result);
      if (!validated.success) {
        console.error("[expenses] Schema validation failed on state result:", validated.error.issues);
        return null;
      }
      return { data: validated.data, source: `Census ACS 5-Year ${CENSUS_ACS_YEAR} (state)` };
    }
  }

  // Attempt 3: National average fallback
  console.warn(
    `[expenses] No Census data for ZIP ${zip} or state ${state} — returning national averages`
  );
  const result: ExpenseEstimate = {
    zip,
    propertyTaxRate: NATIONAL_FALLBACKS.propertyTaxRate,
    rentalVacancyRate: NATIONAL_FALLBACKS.rentalVacancyRate,
    medianHomeValue: 0,
    medianTaxPaid: 0,
    managementFeeRate: mgmtFeeRate,
    state,
    source: "National average (Census ACS 5-Year 2022 not available for this area)",
    asOfDate: String(CENSUS_ACS_YEAR),
    confidence: "low",
    dataGaps: ["zip_level_data_unavailable", "state_level_data_unavailable"],
  };
  const validated = ExpenseEstimateSchema.safeParse(result);
  if (!validated.success) return null;
  return { data: validated.data, source: "national_average" };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

async function handler(req: NextRequest) {
  const rawZip = req.nextUrl.searchParams.get("zip");

  const parsed = QuerySchema.safeParse({ zip: rawZip });
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((i) => i.message).join("; "),
      400
    );
  }

  const { zip } = parsed.data;

  if (!process.env.CENSUS_API_KEY) {
    return jsonError("CENSUS_API_KEY not configured", 503);
  }

  const result = await cachedFetch(
    `census:expenses:${zip}`,
    () => fetchExpenseEstimate(process.env.CENSUS_API_KEY!, zip),
    CACHE_TTL.CENSUS
  );

  if (!result) {
    return jsonError(
      `No expense estimate data available for ZIP ${zip}`,
      404
    );
  }

  return jsonSuccess(result.data, {
    meta: {
      source: result.source,
      cached: result.cached,
      stale: result.stale,
      zip,
    },
  });
}

export const GET = compose(
  withRateLimit(100, 60_000),
  withCache(30 * 24 * 60 * 60 * 1000) // 30 days — Census data is annual
)(handler);
