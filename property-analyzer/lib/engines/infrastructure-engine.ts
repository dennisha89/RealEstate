// ============================================================
// Dimension 5: Infrastructure & Development Engine
// ============================================================

import type {
  InfrastructureDevelopment,
  ZoningChange,
  DevelopmentProject,
  DimensionScore,
} from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

export interface RawInfrastructureData {
  buildingPermitsResidential: TimeSeriesData;
  buildingPermitsCommercial: TimeSeriesData;
  permitTotalValue: TimeSeriesData;
  zoningChanges: ZoningChange[];
  transitProjects: DevelopmentProject[];
  commercialDevelopment: DevelopmentProject[];
  medicalFacilities: DevelopmentProject[];
  schoolProjects: DevelopmentProject[];
  techOfficeOpenings: DevelopmentProject[];
}

export function analyzeInfrastructure(data: RawInfrastructureData): InfrastructureDevelopment {
  const allProjects = [
    ...data.transitProjects,
    ...data.commercialDevelopment,
    ...data.medicalFacilities,
    ...data.schoolProjects,
    ...data.techOfficeOpenings,
  ];

  const totalInvestment = allProjects.reduce((sum, p) => sum + p.investment, 0);

  // Composite infrastructure score
  let infraScore = 50;

  // Active projects boost
  const activeProjects = allProjects.filter(p => p.status === "under_construction" || p.status === "planned");
  infraScore += Math.min(20, activeProjects.length * 3);

  // Transit projects are high-impact
  const activeTransit = data.transitProjects.filter(p => p.status !== "completed");
  infraScore += Math.min(15, activeTransit.length * 7);

  // Upzoning = future density = value
  const upzones = data.zoningChanges.filter(z => z.densityImpact === "increase");
  infraScore += Math.min(10, upzones.length * 5);

  // Tech offices moving in
  infraScore += Math.min(10, data.techOfficeOpenings.length * 5);

  infraScore = Math.max(0, Math.min(100, infraScore));

  return {
    buildingPermits: {
      residential: buildTrendMetric(
        data.buildingPermitsResidential.current,
        data.buildingPermitsResidential.oneYearAgo,
        data.buildingPermitsResidential.threeYearAgo,
        data.buildingPermitsResidential.fiveYearAgo
      ),
      commercial: buildTrendMetric(
        data.buildingPermitsCommercial.current,
        data.buildingPermitsCommercial.oneYearAgo,
        data.buildingPermitsCommercial.threeYearAgo,
        data.buildingPermitsCommercial.fiveYearAgo
      ),
      totalValue: buildTrendMetric(
        data.permitTotalValue.current,
        data.permitTotalValue.oneYearAgo,
        data.permitTotalValue.threeYearAgo,
        data.permitTotalValue.fiveYearAgo
      ),
    },
    zoningChanges: data.zoningChanges,
    transitProjects: data.transitProjects,
    commercialDevelopment: data.commercialDevelopment,
    medicalFacilities: data.medicalFacilities,
    schoolProjects: data.schoolProjects,
    techOfficeOpenings: data.techOfficeOpenings,
    infrastructureScore: infraScore,
    developmentPipeline: {
      totalProjects: activeProjects.length,
      totalInvestment,
      completionTimeline: activeProjects.length > 0 ? "12-36 months" : "No active projects",
    },
  };
}

export function scoreInfrastructure(infra: InfrastructureDevelopment): DimensionScore {
  const score = infra.infrastructureScore;
  const keyFactors: string[] = [];

  if (infra.developmentPipeline.totalProjects > 5) {
    keyFactors.push(`${infra.developmentPipeline.totalProjects} active development projects`);
  }
  if (infra.developmentPipeline.totalInvestment > 100_000_000) {
    keyFactors.push(`$${(infra.developmentPipeline.totalInvestment / 1_000_000).toFixed(0)}M+ in development investment`);
  }
  if (infra.transitProjects.some(p => p.status === "under_construction")) {
    keyFactors.push("Transit expansion under construction");
  }
  if (infra.techOfficeOpenings.length > 0) {
    keyFactors.push(`${infra.techOfficeOpenings.length} tech company office(s) opening`);
  }
  if (infra.zoningChanges.some(z => z.densityImpact === "increase")) {
    keyFactors.push("Upzoning approved (increased density)");
  }

  const permitTrend = infra.buildingPermits.residential.trend;
  if (permitTrend === "accelerating") {
    keyFactors.push("Residential building permits accelerating");
  } else if (permitTrend === "declining") {
    keyFactors.push("Building permits declining (supply tightening)");
  }

  if (keyFactors.length === 0) {
    keyFactors.push("Limited development activity");
  }

  return {
    score,
    weight: 0.10,
    weightedScore: score * 0.10,
    keyFactors,
    dataCompleteness: 70,
  };
}
