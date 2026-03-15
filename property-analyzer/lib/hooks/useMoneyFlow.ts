import { useQuery } from "@tanstack/react-query";

export function useMoneyFlow(zip: string | null) {
  return useQuery({
    queryKey: ["money-flow", zip],
    queryFn: async () => {
      if (!zip) throw new Error("No zip code");
      const res = await fetch(`/api/follow-the-money/${zip}`);
      if (!res.ok) throw new Error("Money flow request failed");
      return res.json();
    },
    enabled: !!zip && /^\d{5}$/.test(zip),
  });
}

export function useCapitalMigration(zip: string | null) {
  return useQuery({
    queryKey: ["capital-migration", zip],
    queryFn: async () => {
      if (!zip) throw new Error("No zip code");
      const res = await fetch(`/api/capital-migration/${zip}`);
      if (!res.ok) throw new Error("Capital migration request failed");
      return res.json();
    },
    enabled: !!zip && /^\d{5}$/.test(zip),
  });
}

export function useInstitutionalCapital(zip: string | null) {
  return useQuery({
    queryKey: ["institutional-capital", zip],
    queryFn: async () => {
      if (!zip) throw new Error("No zip code");
      const res = await fetch(`/api/institutional-capital/${zip}`);
      if (!res.ok) throw new Error("Institutional capital request failed");
      return res.json();
    },
    enabled: !!zip && /^\d{5}$/.test(zip),
  });
}

export function useTransactionPipeline(zip: string | null) {
  return useQuery({
    queryKey: ["transaction-pipeline", zip],
    queryFn: async () => {
      if (!zip) throw new Error("No zip code");
      const res = await fetch(`/api/transaction-pipeline/${zip}`);
      if (!res.ok) throw new Error("Transaction pipeline request failed");
      return res.json();
    },
    enabled: !!zip && /^\d{5}$/.test(zip),
  });
}
