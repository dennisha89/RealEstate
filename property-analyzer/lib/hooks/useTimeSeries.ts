import { useQuery } from "@tanstack/react-query";

interface TimeSeriesResponse {
  series: Record<string, Array<{ date: string; value: number }>>;
  merged: Array<Record<string, string | number>>;
  sources: Record<string, string>;
  dateRange: { start: string | null; end: string | null };
}

/**
 * Fetch FRED time-series data with automatic caching and polling.
 *
 * @param seriesIds - Array of FRED series IDs (e.g., ["MORTGAGE30US", "PERMIT"])
 * @param options - start/end dates, polling interval
 *
 * Usage:
 * ```
 * const { data, isLoading } = useTimeSeries(["MORTGAGE30US", "UNRATE"]);
 * // data.merged → chart-ready array with date + all series values
 * // data.series.MORTGAGE30US → individual series points
 * ```
 */
export function useTimeSeries(
  seriesIds: string[],
  options?: {
    start?: string;
    end?: string;
    refetchInterval?: number;
    enabled?: boolean;
  }
) {
  const seriesKey = seriesIds.sort().join(",");

  return useQuery<TimeSeriesResponse>({
    queryKey: ["time-series", seriesKey, options?.start, options?.end],
    queryFn: async () => {
      const params = new URLSearchParams({ series: seriesKey });
      if (options?.start) params.set("start", options.start);
      if (options?.end) params.set("end", options.end);

      const res = await fetch(`/api/time-series?${params}`);
      if (!res.ok) throw new Error("Failed to fetch time series");
      return res.json();
    },
    enabled: options?.enabled !== false && seriesIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: options?.refetchInterval, // optional polling
    refetchOnWindowFocus: false,
  });
}

/**
 * Preset hook for the leading indicators dashboard.
 * Fetches the 5 Dallas Fed variables + mortgage rates.
 */
export function useLeadingIndicators() {
  return useTimeSeries([
    "PERMIT1",       // Single family permits
    "HOUST1F",       // Housing starts (1 unit)
    "HSN1F",         // New home sales
    "ASPNHSUS",      // Avg sale price new homes
    "MORTGAGE30US",  // 30yr mortgage rate
    "UNRATE",        // Unemployment
    "FEDFUNDS",      // Fed funds rate
    "NASDAQOMRXMUNI", // Muni bond index
  ]);
}

/**
 * Preset hook for national market overview.
 */
export function useNationalTrends() {
  return useTimeSeries([
    "MORTGAGE30US",
    "MSPUS",
    "CSUSHPINSA",
    "UNRATE",
    "M2V",
    "UMCSENT",
  ]);
}
