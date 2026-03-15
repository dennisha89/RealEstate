import { useQuery } from "@tanstack/react-query";
import type { DealCriteria } from "@/lib/types/market-intelligence";

export function useDeals(criteria: DealCriteria | null) {
  return useQuery({
    queryKey: ["deals", criteria],
    queryFn: async () => {
      if (!criteria) throw new Error("No criteria");
      const res = await fetch("/api/deals/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria }),
      });
      if (!res.ok) throw new Error("Deal scan request failed");
      return res.json();
    },
    enabled: !!criteria,
  });
}
