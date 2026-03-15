import { NextRequest, NextResponse } from "next/server";
import {
  estimateProjectValueImpact,
  summarizeDevelopment,
  CITY_DATA_PORTALS,
  type CityProject,
  type CityProjectType,
  type ZoningAction,
} from "@/lib/engines/city-development-engine";

/**
 * GET /api/city-development/:zip
 *
 * Returns all city development projects, permits, zoning changes,
 * opportunity zones, TIF districts, and their estimated impact
 * on property values for a given zip code.
 *
 * Pulls from city open data portals (Socrata API), planning
 * commission records, and capital improvement plans.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zip: string }> }
) {
  try {
    const { zip } = await params;

    if (!zip || !/^d{5}$/.test(zip)) {
      return NextResponse.json({ error: "Valid 5-digit zip code required" }, { status: 400 });
    }

    // In production, pull from city open data portals
    // For now, generate realistic mock projects
    const { active, planned, completed } = generateMockCityProjects(zip);
    const zoningActions = generateMockZoningActions(zip);
    const summary = summarizeDevelopment(active, planned, completed, zoningActions);

    // Calculate value impact for each active/planned project
    // relative to a hypothetical property at center of zip
    const projectsWithImpact = [...active, ...planned].map(project => ({
      ...project,
      valueImpact: estimateProjectValueImpact(
        project.type as CityProjectType,
        project.location.latitude ? 0.5 : 1.0 // mock distance
      ),
    }));

    return NextResponse.json({
      zipCode: zip,
      summary,
      activeProjects: active,
      plannedProjects: planned,
      recentlyCompleted: completed,
      zoningActions,
      projectsWithValueImpact: projectsWithImpact,
      opportunityZones: generateMockOpportunityZones(zip),
      tifDistricts: generateMockTIFDistricts(zip),
      utilityExpansions: generateMockUtilityExpansions(zip),
      availableDataPortal: findDataPortal(zip),
      generatedAt: new Date().toISOString(),
      dataSource: "mock",
    });
  } catch (error) {
    console.error("City development error:", error);
    return NextResponse.json({ error: "Failed to fetch city development data" }, { status: 500 });
  }
}

function findDataPortal(zip: string): { city: string; portalUrl: string } | null {
  // In production, use a zip-to-city lookup
  // For now, return null (would match to CITY_DATA_PORTALS)
  return null;
}

function generateMockCityProjects(zip: string): {
  active: CityProject[];
  planned: CityProject[];
  completed: CityProject[];
} {
  const hash = zip.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  const active: CityProject[] = [
    {
      id: `${zip}-001`, name: "Downtown BRT Corridor", type: "transit_bus",
      description: "Bus Rapid Transit line connecting downtown to tech corridor with dedicated lanes, 12 stations",
      department: "Department of Transportation", status: "under_construction",
      budget: 85000000, startDate: "2025-03-01", estimatedCompletion: "2027-06-30",
      location: { latitude: 35.22, longitude: -80.84, district: "District 3" },
      fundingSource: "Federal Transit Administration + Municipal Bonds",
      impactRadius: 2.0,
      propertyValueImpact: estimateProjectValueImpact("transit_bus", 0.5),
      relatedPermits: ["BRT-2025-001", "BRT-2025-002"],
      councilVoteDate: "2024-11-15", councilVoteResult: "Approved 8-1",
    },
    {
      id: `${zip}-002`, name: "Riverside Mixed-Use Development", type: "mixed_use_development",
      description: "350-unit residential + 40,000 sqft retail + 15,000 sqft restaurant space on former industrial site",
      department: "Economic Development", status: "under_construction",
      budget: 125000000, startDate: "2025-01-15", estimatedCompletion: "2027-09-30",
      location: { latitude: 35.23, longitude: -80.85, district: "District 2" },
      fundingSource: "Private Developer + TIF",
      impactRadius: 1.0,
      propertyValueImpact: estimateProjectValueImpact("mixed_use_development", 0.3),
      relatedPermits: ["MU-2024-089"],
      councilVoteDate: "2024-09-20", councilVoteResult: "Approved 7-2",
    },
    {
      id: `${zip}-003`, name: "Regional Medical Center Expansion", type: "hospital",
      description: "New 200-bed tower, emergency department expansion, medical office building",
      department: "N/A (Private)", status: "under_construction",
      budget: 280000000, startDate: "2024-06-01", estimatedCompletion: "2027-12-31",
      location: { latitude: 35.21, longitude: -80.83 },
      fundingSource: "Hospital System Capital Budget",
      impactRadius: 3.0,
      propertyValueImpact: estimateProjectValueImpact("hospital", 1.0),
      relatedPermits: ["MED-2024-015"],
    },
  ];

  const planned: CityProject[] = [
    {
      id: `${zip}-004`, name: "Innovation District Tech Campus", type: "tech_campus",
      description: "TechCorp regional headquarters: 500,000 sqft office, 800+ jobs over 3 years",
      department: "Economic Development", status: "approved",
      budget: 180000000, estimatedCompletion: "2028-06-30",
      location: { latitude: 35.22, longitude: -80.82, district: "District 1" },
      fundingSource: "Private + Economic Development Incentives ($12M tax abatement)",
      impactRadius: 3.0,
      propertyValueImpact: estimateProjectValueImpact("tech_campus", 0.8),
      relatedPermits: [],
      councilVoteDate: "2025-02-18", councilVoteResult: "Approved 9-0",
    },
    {
      id: `${zip}-005`, name: "Greenway Trail Extension", type: "trail",
      description: "4.2-mile multi-use trail connecting 3 neighborhoods to downtown and parks",
      department: "Parks & Recreation", status: "design",
      budget: 8500000, estimatedCompletion: "2028-03-31",
      location: { latitude: 35.24, longitude: -80.84 },
      fundingSource: "Parks Bond Referendum + Federal Trails Grant",
      impactRadius: 0.5,
      propertyValueImpact: estimateProjectValueImpact("trail", 0.2),
      relatedPermits: [],
    },
    {
      id: `${zip}-006`, name: "New Elementary School - Oak Hills", type: "school_new",
      description: "600-student capacity K-5 school to address overcrowding in District A",
      department: "School District", status: "approved",
      budget: 42000000, estimatedCompletion: "2028-08-15",
      location: { latitude: 35.25, longitude: -80.85 },
      fundingSource: "School Bond Referendum",
      impactRadius: 2.0,
      propertyValueImpact: estimateProjectValueImpact("school_new", 0.8),
      relatedPermits: [],
    },
    {
      id: `${zip}-007`, name: "Fiber Broadband Expansion Phase 2", type: "broadband_expansion",
      description: "Gigabit fiber to 15,000 additional homes in underserved neighborhoods",
      department: "IT / Public Utilities", status: "approved",
      budget: 25000000, estimatedCompletion: "2027-12-31",
      location: { latitude: 35.22, longitude: -80.84 },
      fundingSource: "Federal Infrastructure Act + Municipal Revenue Bonds",
      impactRadius: 5.0,
      propertyValueImpact: estimateProjectValueImpact("broadband_expansion", 1.0),
      relatedPermits: [],
    },
  ];

  const completed: CityProject[] = [
    {
      id: `${zip}-C01`, name: "Main Street Streetscape", type: "streetscape",
      description: "Sidewalk widening, bike lanes, street trees, outdoor dining areas on 8 blocks",
      department: "Public Works", status: "completed",
      budget: 12000000, actualCost: 13200000, startDate: "2023-03-01", actualCompletion: "2024-11-30",
      location: { latitude: 35.22, longitude: -80.84 },
      fundingSource: "Municipal CIP Budget",
      impactRadius: 0.5,
      propertyValueImpact: estimateProjectValueImpact("streetscape", 0.2),
      relatedPermits: ["SS-2023-001"],
    },
  ];

  return { active, planned, completed };
}

function generateMockZoningActions(zip: string): ZoningAction[] {
  return [
    {
      caseNumber: "ZC-2025-014",
      type: "rezoning",
      address: "1200-1400 Block Innovation Blvd",
      currentZoning: "I-1 (Light Industrial)",
      requestedZoning: "MX-3 (Mixed Use High Density)",
      description: "Rezone former industrial corridor to allow mixed-use development up to 8 stories",
      applicant: "Innovation District LLC",
      status: "approved",
      hearingDate: "2025-01-22",
      densityChange: "increase",
      estimatedUnits: 800,
      propertyValueImplication: "Significant upzoning enables 800+ residential units + commercial. Expect 10-20% value increase for adjacent parcels.",
    },
    {
      caseNumber: "ZC-2025-021",
      type: "planned_development",
      address: "550 Riverside Dr",
      currentZoning: "R-3 (Multi-family)",
      description: "Planned development for 120-unit townhome community with pool and clubhouse",
      applicant: "Riverside Homes Inc",
      status: "pending",
      hearingDate: "2025-04-15",
      densityChange: "increase",
      estimatedUnits: 120,
      propertyValueImplication: "Adds housing supply but improves neighborhood with new construction. Net positive for area values.",
    },
    {
      caseNumber: "VAR-2025-008",
      type: "variance",
      address: "2100 Oak St",
      currentZoning: "R-1 (Single Family)",
      description: "Variance to allow ADU (accessory dwelling unit) exceeding size limit",
      applicant: "Individual homeowner",
      status: "approved",
      hearingDate: "2025-02-10",
      densityChange: "increase",
      propertyValueImplication: "ADU-friendly precedent signals increasing density tolerance in SFH zones.",
    },
  ];
}

function generateMockOpportunityZones(zip: string) {
  return [{
    tractNumber: `${zip}00`,
    designation: "designated",
    totalInvestment: 45000000,
    activeQOFunds: 3,
    developmentActivity: "moderate",
    taxBenefitSummary: "Capital gains tax deferral through 2026, 10% exclusion at 5yr hold, 15% at 7yr, full exclusion on new gains at 10yr hold",
  }];
}

function generateMockTIFDistricts(zip: string) {
  return [{
    name: "Downtown Revitalization TIF",
    creationDate: "2018-01-01",
    expirationDate: "2041-12-31",
    totalInvestment: 85000000,
    projectsInDistrict: 12,
    currentTIFBalance: 12000000,
    annualIncrement: 3500000,
    purpose: "Fund infrastructure improvements to attract private investment in downtown core",
    impactOnPropertyTax: "Property tax base frozen at 2018 levels within TIF. Increment funds improvements but doesn't increase your tax bill.",
  }];
}

function generateMockUtilityExpansions(zip: string) {
  return [
    { type: "sewer", area: "Southeast quadrant", investment: 18000000, completionDate: "2027-06", enablesDevelopment: true, currentGap: "Septic-only area limiting lot density to 1 acre minimum. Sewer enables 0.25 acre lots." },
    { type: "fiber", area: "Zip-wide", investment: 25000000, completionDate: "2027-12", enablesDevelopment: true, currentGap: "Only 40% of zip has fiber. Expansion enables work-from-home premium." },
  ];
}
