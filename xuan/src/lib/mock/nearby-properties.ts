/**
 * Generate mock nearby properties based on user GPS position.
 * Each property has predicted appreciation, HyperScore, and distance.
 * In production: replace with ATTOM/MLS API calls filtered by radius.
 */

interface NearbyProperty {
  id: string;
  address: string;
  lat: number;
  lng: number;
  distance: number; // miles from user
  price: number;
  estimatedValue: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
  daysOnMarket: number;
  priceChange30d: number; // % change last 30 days
  predictedAppreciation1yr: number; // predicted % appreciation
  hyperScore: number;
  capRate: number;
  monthlyCashFlow: number;
  signal: "strong_buy" | "buy" | "hold" | "pass";
  reasons: string[];
  imageUrl?: string;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateNearbyProperties(
  userLat: number,
  userLng: number,
  radiusMiles: number = 10,
  count: number = 20
): NearbyProperty[] {
  const seed = Math.round(userLat * 1000) + Math.round(userLng * 1000);
  const rand = seededRandom(seed);

  const streets = [
    "Oak", "Elm", "Maple", "Cedar", "Pine", "Birch", "Walnut",
    "Magnolia", "Willow", "Cypress", "Pecan", "Laurel", "Holly",
    "Ivy", "Sage", "Aspen", "Juniper", "Hawthorn", "Spruce", "Alder",
  ];

  const suffixes = ["St", "Ave", "Dr", "Blvd", "Ln", "Ct", "Pl", "Way", "Cir", "Rd"];

  const types = ["Single Family", "Townhome", "Condo", "Duplex", "Multi-Family"];

  const properties: NearbyProperty[] = [];

  for (let i = 0; i < count; i++) {
    // Scatter properties around user position
    const angle = rand() * 2 * Math.PI;
    const dist = Math.sqrt(rand()) * radiusMiles; // sqrt for uniform distribution in circle
    const latOffset = (dist / 69) * Math.cos(angle); // ~69 miles per degree lat
    const lngOffset = (dist / (69 * Math.cos((userLat * Math.PI) / 180))) * Math.sin(angle);

    const lat = userLat + latOffset;
    const lng = userLng + lngOffset;

    const price = Math.round((200000 + rand() * 500000) / 1000) * 1000;
    const sqft = 800 + Math.round(rand() * 2500);
    const bedrooms = 1 + Math.round(rand() * 4);
    const bathrooms = 1 + Math.round(rand() * 2.5);
    const yearBuilt = 1960 + Math.round(rand() * 65);
    const dom = Math.round(rand() * 90);

    // Predicted appreciation based on "market quality" seeded from position
    const marketQuality = 0.3 + rand() * 0.7;
    const appreciation = -2 + marketQuality * 12; // -2% to +10%
    const hyperScore = Math.round(30 + marketQuality * 60); // 30-90

    const capRate = 3 + marketQuality * 5; // 3-8%
    const monthlyRent = Math.round(price * 0.007);
    const monthlyExpenses = Math.round(monthlyRent * 0.45);
    const monthlyCashFlow = monthlyRent - monthlyExpenses;

    const signal: NearbyProperty["signal"] =
      hyperScore >= 75 ? "strong_buy" :
      hyperScore >= 60 ? "buy" :
      hyperScore >= 45 ? "hold" : "pass";

    const reasons: string[] = [];
    if (appreciation > 5) reasons.push(`+${appreciation.toFixed(1)}% predicted appreciation`);
    if (capRate > 6) reasons.push(`${capRate.toFixed(1)}% cap rate`);
    if (dom > 45) reasons.push(`${dom} days on market — motivated seller`);
    if (price < 300000) reasons.push("Below market median");
    if (hyperScore > 70) reasons.push(`HyperScore ${hyperScore} — strong fundamentals`);
    if (reasons.length === 0) reasons.push("Standard market conditions");

    properties.push({
      id: `prop-${i}-${seed}`,
      address: `${100 + Math.round(rand() * 9900)} ${streets[i % streets.length]} ${suffixes[i % suffixes.length]}`,
      lat,
      lng,
      distance: Math.round(dist * 10) / 10,
      price,
      estimatedValue: Math.round(price * (0.95 + rand() * 0.15)),
      bedrooms,
      bathrooms,
      sqft,
      yearBuilt,
      propertyType: types[Math.floor(rand() * types.length)],
      daysOnMarket: dom,
      priceChange30d: Math.round((-3 + rand() * 6) * 10) / 10,
      predictedAppreciation1yr: Math.round(appreciation * 10) / 10,
      hyperScore,
      capRate: Math.round(capRate * 10) / 10,
      monthlyCashFlow,
      signal,
      reasons,
    });
  }

  // Sort by distance
  return properties.sort((a, b) => a.distance - b.distance);
}
