// ============================================================
// City Development Resource Engine
// Fetches and analyzes city/municipal development projects,
// permits, zoning changes, and capital improvement plans
// by zip code to identify value-driving developments.
// ============================================================

import type { DevelopmentProject, ZoningChange } from "../types/market-intelligence";

// --- Types ---

export interface CityDevelopmentProfile {
  zipCode: string;
  city: string;
  state: string;
  capitalImprovementPlan: CapitalImprovementPlan;
  activeProjects: CityProject[];
  plannedProjects: CityProject[];
  completedProjects: CityProject[]; // last 3 years
  permitActivity: PermitActivity;
  zoningActions: ZoningAction[];
  taxIncrementFinancing: TIFDistrict[];
  opportunityZones: OpportunityZone[];
  historicDistricts: HistoricDistrict[];
  enterpriseZones: EnterpriseZone[];
  annexations: Annexation[];
  utilityExpansions: UtilityExpansion[];
  impactSummary: DevelopmentImpactSummary;
}

/** City's Capital Improvement Plan (CIP) - usually 5-year budget */
export interface CapitalImprovementPlan {
  totalBudget: number;
  yearsRemaining: number;
  categories: CIPCategory[];
  fundingSources: { source: string; amount: number; pct: number }[];
  approvalDate: string;
  nextUpdateDate: string;
}

export interface CIPCategory {
  name: string; // "Transportation", "Water/Sewer", "Parks", "Public Safety", etc.
  budget: number;
  pctOfTotal: number;
  projectCount: number;
  keyProjects: string[];
}

/** Individual city project */
export interface CityProject {
  id: string;
  name: string;
  type: CityProjectType;
  description: string;
  department: string;
  status: "proposed" | "approved" | "design" | "bidding" | "under_construction" | "completed";
  budget: number;
  actualCost?: number;
  startDate?: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
  location: {
    address?: string;
    latitude: number;
    longitude: number;
    ward?: string;
    district?: string;
  };
  contractor?: string;
  fundingSource: string;
  impactRadius: number; // miles
  propertyValueImpact: PropertyValueImpact;
  relatedPermits: string[];
  publicDocumentUrl?: string;
  councilVoteDate?: string;
  councilVoteResult?: string;
}

export type CityProjectType =
  | "road_improvement"
  | "highway_expansion"
  | "bridge"
  | "transit_rail"
  | "transit_bus"
  | "bike_lane"
  | "sidewalk"
  | "water_main"
  | "sewer"
  | "stormwater"
  | "park_new"
  | "park_renovation"
  | "trail"
  | "recreation_center"
  | "fire_station"
  | "police_station"
  | "library"
  | "community_center"
  | "school_new"
  | "school_renovation"
  | "hospital"
  | "medical_facility"
  | "mixed_use_development"
  | "commercial_center"
  | "tech_campus"
  | "industrial_park"
  | "affordable_housing"
  | "market_rate_housing"
  | "parking_structure"
  | "utility_upgrade"
  | "broadband_expansion"
  | "streetscape"
  | "demolition"
  | "environmental_remediation"
  | "other";

export interface PropertyValueImpact {
  estimatedImpactPct: { low: number; mid: number; high: number };
  impactType: "positive" | "negative" | "mixed" | "neutral";
  impactTimeline: "during_construction" | "upon_completion" | "1_3_years" | "3_5_years";
  affectedPropertyTypes: string[];
  reasoning: string;
}

/** Building/renovation permit activity */
export interface PermitActivity {
  period: string; // "last_12_months"
  residential: {
    newConstruction: number;
    renovation: number;
    demolition: number;
    totalValue: number;
    avgPermitValue: number;
    trendVsPriorYear: number; // % change
  };
  commercial: {
    newConstruction: number;
    renovation: number;
    demolition: number;
    totalValue: number;
    avgPermitValue: number;
    trendVsPriorYear: number;
  };
  topPermits: {
    address: string;
    type: string;
    value: number;
    description: string;
    dateIssued: string;
  }[];
}

/** Zoning board actions */
export interface ZoningAction {
  caseNumber: string;
  type: "rezoning" | "variance" | "conditional_use" | "planned_development" | "text_amendment";
  address?: string;
  currentZoning: string;
  requestedZoning?: string;
  description: string;
  applicant: string;
  status: "pending" | "approved" | "denied" | "withdrawn" | "continued";
  hearingDate: string;
  densityChange: "increase" | "decrease" | "neutral";
  estimatedUnits?: number;
  propertyValueImplication: string;
}

/** Tax Increment Financing districts */
export interface TIFDistrict {
  name: string;
  creationDate: string;
  expirationDate: string;
  totalInvestment: number;
  projectsInDistrict: number;
  currentTIFBalance: number;
  annualIncrement: number;
  purpose: string;
  impactOnPropertyTax: string;
}

/** Federal Opportunity Zones (tax incentive) */
export interface OpportunityZone {
  tractNumber: string;
  designation: "designated" | "contiguous";
  totalInvestment: number;
  activeQOFunds: number; // Qualified Opportunity Funds
  propertyTypes: string[];
  developmentActivity: "high" | "moderate" | "low";
  taxBenefitSummary: string;
}

export interface HistoricDistrict {
  name: string;
  designation: "national" | "state" | "local";
  taxCreditAvailable: boolean;
  taxCreditPct: number;
  restrictions: string[];
  propertyValuePremium: number; // % premium vs non-historic
}

export interface EnterpriseZone {
  name: string;
  incentives: string[];
  eligibleBusinessTypes: string[];
  taxAbatementYears: number;
  jobCreationRequirement?: number;
}

export interface Annexation {
  area: string;
  acreage: number;
  status: "proposed" | "approved" | "completed";
  effectiveDate?: string;
  implication: string; // "City services extended, property tax changes"
}

export interface UtilityExpansion {
  type: "water" | "sewer" | "electric" | "gas" | "fiber" | "broadband";
  area: string;
  investment: number;
  completionDate?: string;
  enablesDevelopment: boolean;
  currentGap: string; // "No sewer service limits development to septic"
}

export interface DevelopmentImpactSummary {
  totalActiveInvestment: number;
  totalPlannedInvestment: number;
  projectsUnderConstruction: number;
  projectsInPipeline: number;
  biggestProject: { name: string; budget: number; type: string };
  netZoningDensityChange: "increasing" | "stable" | "decreasing";
  infrastructureGrade: "A" | "B" | "C" | "D" | "F";
  developmentMomentum: "accelerating" | "steady" | "decelerating" | "stalled";
  keyTakeaway: string;
}

// --- Data Source Integration ---

/**
 * Data sources for city development information.
 * Each city has different APIs/portals, but common patterns exist.
 */
export interface CityDataSourceConfig {
  zipCode: string;
  city: string;
  state: string;
  dataSources: {
    // Open data portals (Socrata-powered)
    openDataPortalUrl?: string; // e.g., "data.cityofchicago.org"

    // Building permits API
    buildingPermitsApi?: string;

    // Capital improvement plan
    cipDocumentUrl?: string;

    // Zoning/planning commission
    zoningBoardUrl?: string;

    // GIS/mapping
    gisPortalUrl?: string;

    // City council agendas/minutes
    councilAgendasUrl?: string;
  };
}

/**
 * Common city open data portal endpoints (Socrata API pattern)
 * Many cities use Socrata for their open data.
 */
export const COMMON_DATA_ENDPOINTS = {
  // These are example Socrata dataset patterns
  buildingPermits: "/resource/building-permits.json",
  zoningCases: "/resource/zoning-cases.json",
  constructionProjects: "/resource/capital-projects.json",
  businessLicenses: "/resource/business-licenses.json",
  demolitionPermits: "/resource/demolition-permits.json",
};

/**
 * Known city open data portals (partial list of major cities)
 */
export const CITY_DATA_PORTALS: Record<string, { url: string; permitsDataset?: string; projectsDataset?: string }> = {
  "Chicago, IL": { url: "data.cityofchicago.org", permitsDataset: "ydr8-5enu", projectsDataset: "3mfz-3as5" },
  "New York, NY": { url: "data.cityofnewyork.us", permitsDataset: "ipu4-2vj7" },
  "Los Angeles, CA": { url: "data.lacity.org", permitsDataset: "nbyu-2ha9" },
  "Houston, TX": { url: "data.houstontx.gov" },
  "Phoenix, AZ": { url: "phoenixopendata.com" },
  "Philadelphia, PA": { url: "opendataphilly.org", permitsDataset: "licenses-and-inspections-building-permits" },
  "San Antonio, TX": { url: "data.sanantonio.gov" },
  "San Diego, CA": { url: "data.sandiego.gov" },
  "Dallas, TX": { url: "dallasopendata.com" },
  "Austin, TX": { url: "data.austintexas.gov", permitsDataset: "3syk-w9eu" },
  "Denver, CO": { url: "denvergov.org/opendata" },
  "Seattle, WA": { url: "data.seattle.gov", permitsDataset: "76t5-zqzr" },
  "Nashville, TN": { url: "data.nashville.gov" },
  "Portland, OR": { url: "gis-pdx.opendata.arcgis.com" },
  "Atlanta, GA": { url: "atlantaga.gov/government/open-data" },
  "Miami, FL": { url: "datahub-miamigov.opendata.arcgis.com" },
  "Tampa, FL": { url: "city-tampa.opendata.arcgis.com" },
  "Charlotte, NC": { url: "data.charlottenc.gov" },
  "Raleigh, NC": { url: "data-ral.opendata.arcgis.com" },
  "Minneapolis, MN": { url: "opendata.minneapolismn.gov" },
  "San Francisco, CA": { url: "data.sfgov.org", permitsDataset: "i98e-djp9" },
  "Boston, MA": { url: "data.boston.gov", permitsDataset: "hfgw-p5wb" },
  "Washington, DC": { url: "opendata.dc.gov", permitsDataset: "building-permits" },
};

/**
 * Fetch building permits from a city's open data portal (Socrata API)
 */
export async function fetchCityPermits(
  portalUrl: string,
  datasetId: string,
  zipCode: string,
  limit: number = 1000
): Promise<Record<string, unknown>[]> {
  const url = `https://${portalUrl}/resource/${datasetId}.json?$where=zip_code='${zipCode}'&$limit=${limit}&$order=issue_date DESC`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch permits: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch city capital improvement projects
 */
export async function fetchCIPProjects(
  portalUrl: string,
  datasetId: string,
  limit: number = 500
): Promise<Record<string, unknown>[]> {
  const url = `https://${portalUrl}/resource/${datasetId}.json?$limit=${limit}&$order=:id DESC`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CIP projects: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Estimate property value impact of a city project based on type and proximity
 */
export function estimateProjectValueImpact(
  projectType: CityProjectType,
  distanceFromProperty: number // miles
): PropertyValueImpact {
  // Impact diminishes with distance (inverse square-ish)
  const distanceMultiplier = Math.max(0.1, 1 / (1 + distanceFromProperty * 2));

  // Base impact by project type (research-backed estimates)
  const impactTable: Record<CityProjectType, { low: number; mid: number; high: number; type: PropertyValueImpact["impactType"] }> = {
    transit_rail: { low: 5, mid: 12, high: 25, type: "positive" },
    transit_bus: { low: 2, mid: 5, high: 10, type: "positive" },
    highway_expansion: { low: -2, mid: 3, high: 8, type: "mixed" },
    park_new: { low: 3, mid: 8, high: 15, type: "positive" },
    park_renovation: { low: 1, mid: 4, high: 8, type: "positive" },
    school_new: { low: 3, mid: 7, high: 12, type: "positive" },
    school_renovation: { low: 1, mid: 3, high: 6, type: "positive" },
    hospital: { low: 2, mid: 5, high: 10, type: "positive" },
    medical_facility: { low: 1, mid: 3, high: 6, type: "positive" },
    tech_campus: { low: 5, mid: 15, high: 30, type: "positive" },
    mixed_use_development: { low: 3, mid: 8, high: 15, type: "positive" },
    commercial_center: { low: 2, mid: 6, high: 12, type: "positive" },
    fire_station: { low: 1, mid: 2, high: 4, type: "positive" },
    police_station: { low: 0, mid: 2, high: 4, type: "mixed" },
    library: { low: 1, mid: 3, high: 6, type: "positive" },
    community_center: { low: 1, mid: 3, high: 5, type: "positive" },
    recreation_center: { low: 2, mid: 4, high: 8, type: "positive" },
    trail: { low: 1, mid: 3, high: 7, type: "positive" },
    bike_lane: { low: 0, mid: 2, high: 5, type: "positive" },
    sidewalk: { low: 0, mid: 1, high: 3, type: "positive" },
    road_improvement: { low: 1, mid: 3, high: 5, type: "positive" },
    bridge: { low: 1, mid: 4, high: 8, type: "positive" },
    water_main: { low: 0, mid: 1, high: 2, type: "neutral" },
    sewer: { low: 0, mid: 1, high: 3, type: "positive" },
    stormwater: { low: 0, mid: 1, high: 2, type: "neutral" },
    streetscape: { low: 2, mid: 5, high: 10, type: "positive" },
    industrial_park: { low: -3, mid: 2, high: 8, type: "mixed" },
    affordable_housing: { low: -2, mid: 1, high: 5, type: "mixed" },
    market_rate_housing: { low: 0, mid: 3, high: 7, type: "positive" },
    parking_structure: { low: -1, mid: 1, high: 3, type: "mixed" },
    utility_upgrade: { low: 0, mid: 1, high: 3, type: "neutral" },
    broadband_expansion: { low: 1, mid: 3, high: 6, type: "positive" },
    demolition: { low: -2, mid: 0, high: 5, type: "mixed" },
    environmental_remediation: { low: 2, mid: 5, high: 12, type: "positive" },
    other: { low: -1, mid: 1, high: 3, type: "neutral" },
  };

  const base = impactTable[projectType] || impactTable.other;

  return {
    estimatedImpactPct: {
      low: Math.round(base.low * distanceMultiplier * 10) / 10,
      mid: Math.round(base.mid * distanceMultiplier * 10) / 10,
      high: Math.round(base.high * distanceMultiplier * 10) / 10,
    },
    impactType: base.type,
    impactTimeline: projectType.includes("transit") ? "3_5_years" : "1_3_years",
    affectedPropertyTypes: getAffectedPropertyTypes(projectType),
    reasoning: getImpactReasoning(projectType, distanceFromProperty),
  };
}

function getAffectedPropertyTypes(type: CityProjectType): string[] {
  const map: Partial<Record<CityProjectType, string[]>> = {
    transit_rail: ["All residential within 0.5mi", "Commercial within 0.25mi"],
    school_new: ["Family homes (3+ bed)", "Properties in new school zone"],
    tech_campus: ["All residential within 2mi", "Rental properties"],
    hospital: ["Senior housing", "Medical offices", "All residential"],
    park_new: ["Properties with park views", "Family homes"],
    mixed_use_development: ["Adjacent residential", "Walkable properties"],
  };
  return map[type] || ["Surrounding residential properties"];
}

function getImpactReasoning(type: CityProjectType, distance: number): string {
  if (type === "transit_rail") return `Rail transit typically adds 10-25% value premium within 0.5mi. At ${distance.toFixed(1)}mi, impact is moderated by distance.`;
  if (type === "tech_campus") return `Tech campuses bring high-income workers who drive housing demand. Effect is strongest within 2mi as employees seek short commutes.`;
  if (type === "school_new") return `New schools improve GreatSchools ratings for the zone, directly lifting family home values. Premium strongest within school attendance boundary.`;
  if (type === "park_new") return `New parks add 3-15% value premium to adjacent properties, with impact diminishing beyond 0.25mi for views and 0.5mi for walkability.`;
  if (type === "hospital") return `Hospital construction brings medical professionals (high earners) and adds healthcare accessibility premium.`;
  return `Project at ${distance.toFixed(1)}mi distance. Impact scales inversely with distance.`;
}

/**
 * Aggregate development impact summary
 */
export function summarizeDevelopment(
  activeProjects: CityProject[],
  plannedProjects: CityProject[],
  completedProjects: CityProject[],
  zoningActions: ZoningAction[]
): DevelopmentImpactSummary {
  const totalActiveInvestment = activeProjects.reduce((s, p) => s + p.budget, 0);
  const totalPlannedInvestment = plannedProjects.reduce((s, p) => s + p.budget, 0);

  const allActive = [...activeProjects, ...plannedProjects];
  const biggestProject = allActive.reduce((max, p) => p.budget > (max?.budget ?? 0) ? p : max, allActive[0]);

  const upzones = zoningActions.filter(z => z.densityChange === "increase").length;
  const downzones = zoningActions.filter(z => z.densityChange === "decrease").length;

  const netDensity: DevelopmentImpactSummary["netZoningDensityChange"] =
    upzones > downzones * 2 ? "increasing" : downzones > upzones * 2 ? "decreasing" : "stable";

  // Infrastructure grade based on investment per capita (assuming ~50k population)
  const totalInvestmentPerCapita = (totalActiveInvestment + totalPlannedInvestment) / 50000;
  let grade: DevelopmentImpactSummary["infrastructureGrade"] = "C";
  if (totalInvestmentPerCapita > 5000) grade = "A";
  else if (totalInvestmentPerCapita > 3000) grade = "B";
  else if (totalInvestmentPerCapita > 1000) grade = "C";
  else if (totalInvestmentPerCapita > 500) grade = "D";
  else grade = "F";

  const momentum: DevelopmentImpactSummary["developmentMomentum"] =
    plannedProjects.length > activeProjects.length ? "accelerating" :
    plannedProjects.length > 0 ? "steady" :
    activeProjects.length > 0 ? "decelerating" : "stalled";

  const keyTakeaway = biggestProject
    ? `${biggestProject.name} ($${(biggestProject.budget / 1_000_000).toFixed(1)}M) is the anchor project. ${momentum === "accelerating" ? "Development pipeline is growing." : ""}`
    : "No significant development activity.";

  return {
    totalActiveInvestment,
    totalPlannedInvestment,
    projectsUnderConstruction: activeProjects.filter(p => p.status === "under_construction").length,
    projectsInPipeline: plannedProjects.length,
    biggestProject: biggestProject
      ? { name: biggestProject.name, budget: biggestProject.budget, type: biggestProject.type }
      : { name: "None", budget: 0, type: "other" },
    netZoningDensityChange: netDensity,
    infrastructureGrade: grade,
    developmentMomentum: momentum,
    keyTakeaway,
  };
}
