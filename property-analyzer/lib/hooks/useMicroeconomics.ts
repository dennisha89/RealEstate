import { useQuery } from "@tanstack/react-query";

export function useMicroeconomics(zip: string | null) {
  return useQuery({
    queryKey: ["microeconomics", zip],
    queryFn: async () => {
      if (!zip) throw new Error("No zip code");
      const res = await fetch(`/api/microeconomics/${zip}`);
      if (!res.ok) throw new Error("Microeconomics request failed");
      return res.json();
    },
    enabled: !!zip && /^\d{5}$/.test(zip),
  });
}
