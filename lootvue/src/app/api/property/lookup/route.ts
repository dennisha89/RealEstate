/**
 * GET /api/property/lookup?address=...
 *
 * Geocodes an address using the Census Bureau's free geocoding API.
 * Returns formatted address, lat/lng, and ZIP code.
 *
 * Uses Census Geocoder (free, no API key required):
 * https://geocoding.geo.census.gov/geocoder/
 */

import { NextRequest, NextResponse } from "next/server";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import { compose, withRateLimit, jsonError, jsonSuccess } from "@/lib/api/middleware";

interface GeocodedAddress {
  formattedAddress: string;
  lat: number;
  lng: number;
  zipCode: string;
  state: string;
  city: string;
  county: string;
  fips: string;
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || address.length < 5) {
    return jsonError("Query parameter 'address' is required (min 5 chars)", 400);
  }

  const result = await cachedFetch<GeocodedAddress>(
    `geocode:${address.toLowerCase().trim()}`,
    async () => {
      const encoded = encodeURIComponent(address);
      const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encoded}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      const matches = json?.result?.addressMatches;
      if (!matches || matches.length === 0) {
        return null;
      }

      const match = matches[0];
      const coords = match.coordinates;
      const components = match.addressComponents;
      const geographies = match.geographies;

      // Extract FIPS county code from Census geographies
      const counties = geographies?.Counties;
      const fips = counties?.[0]?.GEOID ?? "";
      const county = counties?.[0]?.BASENAME ?? "";

      return {
        data: {
          formattedAddress: match.matchedAddress ?? address,
          lat: coords?.y ?? 0,
          lng: coords?.x ?? 0,
          zipCode: components?.zip ?? "",
          state: components?.state ?? "",
          city: components?.city ?? "",
          county,
          fips,
        },
        source: "Census Geocoder",
      };
    },
    CACHE_TTL.CENSUS // Addresses don't change — cache for 30 days
  );

  if (!result) {
    return jsonError("Address not found. Try a more specific US address.", 404);
  }

  return jsonSuccess(result.data, {
    meta: {
      cached: result.cached,
      source: result.source,
    },
  });
}

export const GET = compose(
  withRateLimit(100, 60_000)
)(handler);
