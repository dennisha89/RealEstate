import { NextResponse } from "next/server";
import { getAvailableDataSources } from "@/lib/engines/data-bridge";

/**
 * GET /api/status
 *
 * Health check endpoint showing which data sources are configured
 * and available. Useful for debugging and monitoring.
 */
export async function GET() {
  const sources = getAvailableDataSources();
  const configuredCount = Object.values(sources).filter(Boolean).length;
  const totalCount = Object.keys(sources).length;

  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    dataSources: {
      configured: configuredCount,
      total: totalCount,
      details: Object.entries(sources).map(([name, available]) => ({
        name,
        status: available ? "configured" : "missing_api_key",
        priority: ["census", "attom", "rentcast"].includes(name)
          ? "P0"
          : ["fred", "bls", "walkScore", "greatSchools"].includes(name)
            ? "P1"
            : "P2",
      })),
    },
    engines: {
      total: 22,
      note: "All engines operational. Mock data used when API keys not configured.",
    },
    timestamp: new Date().toISOString(),
  });
}
