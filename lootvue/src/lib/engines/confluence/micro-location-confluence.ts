/** Micro-Location Confluence — "Is THIS block/neighborhood good?" at sub-ZIP granularity.
 * Weights: Walk(15%) Schools(20%) Safety(20%) Amenities(15%) EnvRisk(15%) Gentrify(15%) */

export interface MicroLocationInput {
  walkScore: number; transitScore: number; bikeScore: number;
  avgSchoolRating: number; topSchoolRating: number; schoolCount: number;
  crimeIndex: number; violentCrimeRate: number; propertyCrimeRate: number; crimeYoYChange: number;
  groceryMinutes: number; hospitalMinutes: number;
  employmentCenterMinutes: number; airportMinutes: number; restaurantCount500m: number;
  floodZone: boolean; floodZoneType?: string;
  wildfireRisk: "minimal" | "low" | "moderate" | "high" | "extreme";
  noiseLevel: "quiet" | "moderate" | "noisy" | "very_noisy";
  newRestaurantsLast12mo: number; newBusinessesLast12mo: number;
  medianHomeAgeYears: number; recentRenovationPermits: number; artGalleriesOrBreweries: number;
}

interface ComponentScore { score: number; weight: number; source: string }

export interface MicroLocationResult {
  confluenceScore: number;
  componentScores: {
    walkability: ComponentScore; schoolQuality: ComponentScore;
    safety: ComponentScore; amenityAccess: ComponentScore;
    environmentalRisk: ComponentScore; gentrification: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "PRIME_LOCATION" | "STRONG" | "GOOD" | "AVERAGE" | "BELOW_AVERAGE" | "AVOID";
  locationProfile: string;
  appreciationDriver: string;
  riskFactors: string[];
  tenantAppeal: string;
  thesis: string;
  strengths: string[];
  concerns: string[];
}

const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (v: number, iMin: number, iMax: number, oMin: number, oMax: number) =>
  oMin + cl((v - iMin) / (iMax - iMin), 0, 1) * (oMax - oMin);

function scoreWalkability(i: MicroLocationInput): number {
  const walk = lerp(i.walkScore, 30, 90, 10, 80);
  const transit = lerp(i.transitScore, 20, 70, 0, 50);
  const bike = lerp(i.bikeScore, 20, 70, 0, 40);
  return Math.round(cl(walk * 0.50 + transit * 0.30 + bike * 0.20, 0, 100));
}

function scoreSchoolQuality(i: MicroLocationInput): number {
  const avg = lerp(i.avgSchoolRating, 3, 9, 10, 90);
  const top = lerp(i.topSchoolRating, 4, 10, 10, 90);
  const count = lerp(i.schoolCount, 0, 6, 0, 20);
  return Math.round(cl(avg * 0.50 + top * 0.30 + count * 0.20, 0, 100));
}

function scoreSafety(i: MicroLocationInput): number {
  const idx = lerp(i.crimeIndex, 60, 10, 10, 90);          // lower = safer = higher score
  const violent = lerp(i.violentCrimeRate, 8, 1, 10, 90);   // weighted 2x via blend
  const property = lerp(i.propertyCrimeRate, 40, 5, 10, 80);
  const trend = i.crimeYoYChange < 0 ? lerp(i.crimeYoYChange, 0, -15, 0, 15) : lerp(i.crimeYoYChange, 0, 15, 0, -15);
  return Math.round(cl(idx * 0.25 + violent * 0.35 + property * 0.20 + (50 + trend) * 0.20, 0, 100));
}

function scoreAmenityAccess(i: MicroLocationInput): number {
  const grocery = lerp(i.groceryMinutes, 15, 2, 10, 90);
  const hospital = lerp(i.hospitalMinutes, 30, 5, 10, 80);
  const employment = lerp(i.employmentCenterMinutes, 40, 10, 10, 80);
  const airport = lerp(i.airportMinutes, 60, 15, 10, 60);
  const restaurants = lerp(i.restaurantCount500m, 0, 15, 10, 90);
  return Math.round(cl(grocery * 0.25 + hospital * 0.20 + employment * 0.25 + airport * 0.10 + restaurants * 0.20, 0, 100));
}

function scoreEnvironmentalRisk(i: MicroLocationInput): number {
  let s = 100; // INVERTED: start at best, subtract penalties
  if (i.floodZone) s -= ({ V: 50, A: 40, AE: 35, X: 10 } as Record<string, number>)[i.floodZoneType ?? "A"] ?? 30;
  s -= ({ minimal: 0, low: 5, moderate: 15, high: 35, extreme: 50 } as const)[i.wildfireRisk];
  s -= ({ quiet: 0, moderate: 8, noisy: 20, very_noisy: 35 } as const)[i.noiseLevel];
  return Math.round(cl(s, 0, 100));
}

function scoreGentrification(i: MicroLocationInput): number {
  const biz = lerp(i.newBusinessesLast12mo, 0, 15, 10, 70);
  const rest = lerp(i.newRestaurantsLast12mo, 0, 8, 10, 70);
  const permits = lerp(i.recentRenovationPermits, 0, 20, 10, 70);
  const art = lerp(i.artGalleriesOrBreweries, 0, 5, 0, 60);
  const ageBonus = i.medianHomeAgeYears > 40 ? lerp(i.medianHomeAgeYears, 40, 80, 0, 20) : 0;
  return Math.round(cl(biz * 0.25 + rest * 0.25 + permits * 0.25 + art * 0.15 + ageBonus * 0.10 + ageBonus, 0, 100));
}

function buildTenantAppeal(i: MicroLocationInput): string {
  if (i.walkScore > 80 && i.restaurantCount500m > 10) return "Urban professional appeal — high walkability and dining density attract young renters";
  if (i.avgSchoolRating > 8 && i.crimeIndex < 20) return "Premium family neighborhood — top schools and very low crime command rent premiums";
  if (i.walkScore > 70 && i.avgSchoolRating > 7) return "Family + young professional appeal — walkable with strong schools draws broad tenant pool";
  if (i.walkScore > 70) return "Walkable urban appeal — attracts car-free professionals and downsizers";
  if (i.avgSchoolRating > 7) return "Family-oriented — good schools drive stable, long-term tenancies";
  if (i.crimeIndex < 30) return "Safe neighborhood — low crime supports reliable occupancy";
  return "General residential — no standout tenant draw; competitive pricing needed";
}

function buildProfile(i: MicroLocationInput): string {
  const parts: string[] = [];
  if (i.walkScore > 70) parts.push("walkable");
  if (i.transitScore > 50) parts.push("transit-connected");
  if (i.avgSchoolRating > 7) parts.push("strong-school");
  if (i.crimeIndex < 30) parts.push("safe");
  if (i.restaurantCount500m > 8) parts.push("vibrant dining scene");
  if (i.artGalleriesOrBreweries > 2) parts.push("emerging cultural hub");
  const area = i.walkScore > 70 ? "Urban" : i.walkScore > 40 ? "Suburban" : "Exurban";
  return parts.length > 0 ? `${area} ${parts.join(", ")} neighborhood` : `${area} neighborhood with mixed characteristics`;
}

const WEIGHTS = {
  walkability: 0.15, schoolQuality: 0.20, safety: 0.20,
  amenityAccess: 0.15, environmentalRisk: 0.15, gentrification: 0.15,
} as const;

const SOURCES = {
  walkability: "Walk Score API", schoolQuality: "GreatSchools API",
  safety: "FBI UCR / local crime data", amenityAccess: "Walk Score + Google Places",
  environmentalRisk: "FEMA, ClimateCheck, FAA noise maps", gentrification: "Census ACS, permit records, Yelp/Google",
} as const;

export function computeMicroLocationConfluence(input: MicroLocationInput): MicroLocationResult {
  const raw = {
    walkability: scoreWalkability(input), schoolQuality: scoreSchoolQuality(input),
    safety: scoreSafety(input), amenityAccess: scoreAmenityAccess(input),
    environmentalRisk: scoreEnvironmentalRisk(input), gentrification: scoreGentrification(input),
  };

  let weighted = 0;
  const componentScores = {} as MicroLocationResult["componentScores"];
  for (const k of Object.keys(raw) as Array<keyof typeof raw>) {
    weighted += raw[k] * WEIGHTS[k];
    componentScores[k] = { score: raw[k], weight: WEIGHTS[k], source: SOURCES[k] };
  }
  const confluenceScore = Math.round(cl(weighted, 0, 100));

  const all = Object.values(raw);
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  const sd = Math.sqrt(all.reduce((s, v) => s + (v - avg) ** 2, 0) / all.length);
  const agreement: MicroLocationResult["agreement"] = sd < 10 ? "strong" : sd < 18 ? "moderate" : sd < 28 ? "mixed" : "divergent";
  const sdStr = sd.toFixed(0);
  const agreementDetail = agreement === "strong" ? `All dimensions align tightly (std dev ${sdStr}). High-confidence location assessment.`
    : agreement === "moderate" ? `Dimensions mostly agree (std dev ${sdStr}) with minor variation.`
    : agreement === "mixed" ? `Notable spread across dimensions (std dev ${sdStr}). Some location factors conflict.`
    : `Significant divergence across location factors (std dev ${sdStr}). Investigate tradeoffs carefully.`;

  const verdict: MicroLocationResult["verdict"] =
    confluenceScore >= 85 ? "PRIME_LOCATION" : confluenceScore >= 72 ? "STRONG" :
    confluenceScore >= 58 ? "GOOD" : confluenceScore >= 42 ? "AVERAGE" :
    confluenceScore >= 28 ? "BELOW_AVERAGE" : "AVOID";

  const strengths: string[] = [];
  if (input.walkScore > 80) strengths.push(`Walk Score ${input.walkScore} — highly walkable`);
  if (input.avgSchoolRating > 7) strengths.push(`Avg school rating ${input.avgSchoolRating.toFixed(1)}/10 — drives family demand`);
  if (input.crimeIndex < 25) strengths.push(`Crime index ${input.crimeIndex} — well below average`);
  if (input.crimeYoYChange < -5) strengths.push(`Crime down ${Math.abs(input.crimeYoYChange).toFixed(0)}% YoY — improving safety`);
  if (input.groceryMinutes <= 5) strengths.push("Grocery within 5 minutes");
  if (raw.environmentalRisk > 80) strengths.push("Minimal environmental risk exposure");
  if (input.artGalleriesOrBreweries > 2) strengths.push(`${input.artGalleriesOrBreweries} art galleries/breweries — cultural momentum`);
  if (input.recentRenovationPermits > 10) strengths.push(`${input.recentRenovationPermits} renovation permits — active reinvestment`);

  const concerns: string[] = [];
  if (input.crimeIndex > 50) concerns.push(`Crime index ${input.crimeIndex} — above average`);
  if (input.violentCrimeRate > 5) concerns.push(`Violent crime rate ${input.violentCrimeRate.toFixed(1)}/1000 — elevated`);
  if (input.floodZone && input.floodZoneType !== "X") concerns.push(`Flood zone ${input.floodZoneType ?? "A"} — insurance costs and resale risk`);
  if (input.wildfireRisk === "high" || input.wildfireRisk === "extreme") concerns.push(`${input.wildfireRisk} wildfire risk`);
  if (input.noiseLevel === "very_noisy") concerns.push("Very noisy location — flight path, highway, or rail proximity");
  if (input.avgSchoolRating < 5) concerns.push(`Avg school rating ${input.avgSchoolRating.toFixed(1)}/10 — limits family appeal`);
  if (input.employmentCenterMinutes > 30) concerns.push(`${input.employmentCenterMinutes}min to employment center — long commute`);

  const riskFactors: string[] = [];
  if (input.floodZone) riskFactors.push(`Flood zone ${input.floodZoneType ?? "unknown"} — verify insurance costs`);
  if (input.wildfireRisk !== "minimal" && input.wildfireRisk !== "low") riskFactors.push(`${input.wildfireRisk} wildfire risk — budget for mitigation`);
  if (input.noiseLevel === "noisy" || input.noiseLevel === "very_noisy") riskFactors.push(`${input.noiseLevel} environment may suppress appreciation`);
  if (input.crimeYoYChange > 5) riskFactors.push(`Crime rising ${input.crimeYoYChange.toFixed(0)}% YoY — neighborhood may be declining`);

  const gentrifying = input.newRestaurantsLast12mo > 3 && input.newBusinessesLast12mo > 5 && input.medianHomeAgeYears > 40;
  const appreciationDriver = gentrifying
    ? "Gentrification signals suggest 3-5yr appreciation above market — new businesses in older housing stock"
    : raw.schoolQuality > 75 ? "Strong schools are a durable appreciation driver — family demand keeps prices resilient"
    : raw.walkability > 75 ? "High walkability commands growing premiums as urban living demand increases"
    : raw.safety > 75 ? "Low crime supports steady appreciation and strong tenant retention"
    : "No standout appreciation catalyst — expect market-rate growth";

  const thesis = `${verdict.replace(/_/g, " ")} (${confluenceScore}/100). ` +
    `${buildProfile(input)}. ` +
    `${agreement === "strong" || agreement === "moderate" ? "Dimensions converge." : "Mixed signals across location factors."} ` +
    appreciationDriver;

  return {
    confluenceScore, componentScores, agreement, agreementDetail, verdict,
    locationProfile: buildProfile(input), appreciationDriver,
    riskFactors, tenantAppeal: buildTenantAppeal(input),
    thesis, strengths, concerns,
  };
}
