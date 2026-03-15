import { useQuery } from "@tanstack/react-query";

export function useMarketIntelligence(
  property: {
    address: string;
    price: number;
    sqft: number;
    bedrooms: number;
    bathrooms: number;
    yearBuilt: number;
    estimatedRent: number;
  } | null,
  financialInputs?: { downPaymentPct: number; interestRate: number }
) {
  return useQuery({
    queryKey: ["market-intelligence", property?.address],
    queryFn: async () => {
      if (!property) throw new Error("No property");
      const res = await fetch("/api/market-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: {
            ...property,
            pricePerSqft: Math.round(property.price / property.sqft),
          },
          financialInputs: financialInputs ?? { downPaymentPct: 20, interestRate: 7.5 },
        }),
      });
      if (!res.ok) throw new Error("Market intelligence request failed");
      return res.json();
    },
    enabled: !!property,
  });
}
