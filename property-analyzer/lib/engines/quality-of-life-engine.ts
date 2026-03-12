// ============================================================
// Dimension 6: Quality of Life Engine
// ============================================================

import type { QualityOfLife, SchoolRating, DimensionScore } from "../types/market-intelligence";

export interface RawQualityOfLifeData {
  schools: {
    elementary: SchoolRating[];
    middle: SchoolRating[];
    high: SchoolRating[];
  };
  crime: {
    violentPer1000: { current: number; oneYearAgo: number; threeYearAgo: number; fiveYearAgo: number };
    propertyPer1000: { current: number; oneYearAgo: number; threeYearAgo: number; fiveYearAgo: number };
    metroAvgViolent: number;
    metroAvgProperty: number;
  };
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  healthcare: {
    doctorsPerCapita: number;
    nearestHospitalMiles: number;
    hospitalRating?: number;
  };
  greenSpace: {
    parkAcresPerCapita: number;
    nearestParkMiles: number;
  };
  neighborhood: {
    restaurantsPerCapita: number;
    retailDensity: number;
    nightlifeScore?: number;
  };
}

export function analyzeQualityOfLife(data: RawQualityOfLifeData): QualityOfLife {
  const allSchools = [
    ...data.schools.elementary,
    ...data.schools.middle,
    ...data.schools.high,
  ];
  const avgRating = allSchools.length > 0
    ? allSchools.reduce((sum, s) => sum + s.rating, 0) / allSchools.length
    : 5;

  // Determine school rating trend
  const schoolsImproving = allSchools.filter(s => s.trend === "improving").length;
  const schoolsDeclining = allSchools.filter(s => s.trend === "declining").length;
  let ratingTrend: "improving" | "stable" | "declining" = "stable";
  if (schoolsImproving > schoolsDeclining * 2) ratingTrend = "improving";
  else if (schoolsDeclining > schoolsImproving * 2) ratingTrend = "declining";

  // Crime trend
  const violentChange = data.crime.violentPer1000.current - data.crime.violentPer1000.threeYearAgo;
  const propertyChange = data.crime.propertyPer1000.current - data.crime.propertyPer1000.threeYearAgo;
  let crimeTrend: "improving" | "stable" | "worsening" = "stable";
  if (violentChange < -0.5 && propertyChange < -1) crimeTrend = "improving";
  else if (violentChange > 0.5 || propertyChange > 1) crimeTrend = "worsening";

  const vsMetroViolent = data.crime.metroAvgViolent > 0
    ? ((data.crime.violentPer1000.current - data.crime.metroAvgViolent) / data.crime.metroAvgViolent) * 100
    : 0;

  return {
    schoolRatings: {
      elementary: data.schools.elementary,
      middle: data.schools.middle,
      high: data.schools.high,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingTrend,
    },
    crimeRate: {
      violentPer1000: {
        current: data.crime.violentPer1000.current,
        oneYearAgo: data.crime.violentPer1000.oneYearAgo,
        threeYearAgo: data.crime.violentPer1000.threeYearAgo,
        fiveYearAgo: data.crime.violentPer1000.fiveYearAgo,
        oneYearChange: 0, threeYearCAGR: 0, fiveYearCAGR: 0,
        trend: crimeTrend === "improving" ? "declining" : crimeTrend === "worsening" ? "accelerating" : "stable",
        percentile: 50,
      },
      propertyPer1000: {
        current: data.crime.propertyPer1000.current,
        oneYearAgo: data.crime.propertyPer1000.oneYearAgo,
        threeYearAgo: data.crime.propertyPer1000.threeYearAgo,
        fiveYearAgo: data.crime.propertyPer1000.fiveYearAgo,
        oneYearChange: 0, threeYearCAGR: 0, fiveYearCAGR: 0,
        trend: "stable",
        percentile: 50,
      },
      overallTrend: crimeTrend,
      vsMetroAverage: Math.round(vsMetroViolent * 10) / 10,
    },
    walkability: {
      walkScore: data.walkScore,
      transitScore: data.transitScore,
      bikeScore: data.bikeScore,
    },
    healthcare: data.healthcare,
    greenSpace: data.greenSpace,
    neighborhoodVibrancy: data.neighborhood,
  };
}

export function scoreQualityOfLife(qol: QualityOfLife): DimensionScore {
  let score = 50;
  const keyFactors: string[] = [];

  // Schools (20 points)
  if (qol.schoolRatings.averageRating >= 8) {
    score += 20;
    keyFactors.push(`Excellent schools: ${qol.schoolRatings.averageRating}/10 avg`);
  } else if (qol.schoolRatings.averageRating >= 6) {
    score += 10;
    keyFactors.push(`Good schools: ${qol.schoolRatings.averageRating}/10 avg`);
  } else if (qol.schoolRatings.averageRating < 4) {
    score -= 10;
    keyFactors.push(`Weak schools: ${qol.schoolRatings.averageRating}/10 avg`);
  }

  if (qol.schoolRatings.ratingTrend === "improving") {
    score += 5;
    keyFactors.push("School ratings improving");
  }

  // Crime (15 points)
  if (qol.crimeRate.overallTrend === "improving") {
    score += 15;
    keyFactors.push("Crime rates declining");
  } else if (qol.crimeRate.overallTrend === "worsening") {
    score -= 15;
    keyFactors.push("Crime rates increasing");
  }

  if (qol.crimeRate.vsMetroAverage < -20) {
    score += 5;
    keyFactors.push("Crime well below metro average");
  } else if (qol.crimeRate.vsMetroAverage > 30) {
    score -= 10;
    keyFactors.push("Crime above metro average");
  }

  // Walk Score (10 points)
  if (qol.walkability.walkScore >= 80) {
    score += 10;
    keyFactors.push(`Very walkable: ${qol.walkability.walkScore} Walk Score`);
  } else if (qol.walkability.walkScore >= 50) {
    score += 5;
  }

  // Healthcare (5 points)
  if (qol.healthcare.nearestHospitalMiles < 3) {
    score += 5;
    keyFactors.push("Hospital within 3 miles");
  }

  // Neighborhood vibrancy (5 points)
  if (qol.neighborhoodVibrancy.restaurantsPerCapita > 0.005) {
    score += 5;
    keyFactors.push("Vibrant restaurant/retail scene");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.10,
    weightedScore: score * 0.10,
    keyFactors,
    dataCompleteness: 75,
  };
}
