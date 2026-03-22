"use client";

import { useEffect, useRef } from "react";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";

/**
 * Seeds Zustand stores with demo data on first load.
 * Only runs once — if stores already have data (from persistence), skips.
 * Safe to call on every dashboard mount.
 */
export function useDemoData() {
  const seeded = useRef(false);
  const pipelineDeals = useDealPipelineStore((s) => s.deals);
  const addDeal = useDealPipelineStore((s) => s.addDeal);
  const setAnalysis = useDealPipelineStore((s) => s.setAnalysis);
  const watchedMarkets = useWatchlistStore((s) => s.watchedMarkets);
  const addMarket = useWatchlistStore((s) => s.addMarket);
  const addAlert = useWatchlistStore((s) => s.addAlert);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    // ── Seed Deal Pipeline ──────────────────────────────────────
    if (pipelineDeals.length === 0) {
      const deals = [
        {
          status: "closed" as const,
          address: "742 Evergreen Terrace, Austin, TX 78701",
          market: "Austin",
          state: "TX",
          zip: "78701",
          price: 385000,
          propertyType: "single_family",
          analysis: { apexScore: 82, convictionScore: 88, prismVerdict: "BUY", capRate: 7.1, monthlyCashFlow: 420, cashOnCash: 9.2 },
          outcome: { actualPrice: 378000, closingDate: "2025-11-15", currentValue: 395000, actualCashFlow: 450 },
        },
        {
          status: "under_contract" as const,
          address: "1200 Broadway Ave, Nashville, TN 37201",
          market: "Nashville",
          state: "TN",
          zip: "37201",
          price: 295000,
          propertyType: "condo",
          analysis: { apexScore: 76, convictionScore: 81, prismVerdict: "BUY", capRate: 6.5, monthlyCashFlow: 310, cashOnCash: 8.4 },
        },
        {
          status: "offer_pending" as const,
          address: "450 Palm Dr, Tampa, FL 33601",
          market: "Tampa",
          state: "FL",
          zip: "33601",
          price: 245000,
          propertyType: "townhome",
          analysis: { apexScore: 68, convictionScore: 72, prismVerdict: "HOLD", capRate: 6.8, monthlyCashFlow: 180, cashOnCash: 6.9 },
        },
        {
          status: "analyzing" as const,
          address: "88 Innovation Way, Raleigh, NC 27601",
          market: "Raleigh",
          state: "NC",
          zip: "27601",
          price: 320000,
          propertyType: "single_family",
          analysis: { apexScore: 84, convictionScore: 90, prismVerdict: "STRONG BUY", capRate: 6.9, monthlyCashFlow: 380, cashOnCash: 8.8 },
        },
        {
          status: "discovered" as const,
          address: "2100 Peachtree Rd, Atlanta, GA 30301",
          market: "Atlanta",
          state: "GA",
          zip: "30301",
          price: 275000,
          propertyType: "multi_family",
        },
        {
          status: "passed" as const,
          address: "5500 Camelback Rd, Phoenix, AZ 85001",
          market: "Phoenix",
          state: "AZ",
          zip: "85001",
          price: 410000,
          propertyType: "single_family",
          analysis: { apexScore: 42, convictionScore: 38, prismVerdict: "AVOID", capRate: 4.1, monthlyCashFlow: -120, cashOnCash: -1.8 },
          passReason: "Negative cash flow at current rates, overpriced vs comps",
        },
      ];

      for (const deal of deals) {
        const { analysis, outcome, passReason, ...rest } = deal;
        const id = addDeal(rest);
        if (analysis) setAnalysis(id, analysis);
        if (outcome) {
          useDealPipelineStore.getState().setOutcome(id, outcome);
        }
        if (passReason) {
          useDealPipelineStore.getState().setPassReason(id, passReason);
        }
      }
    }

    // ── Seed Watchlist ──────────────────────────────────────────
    if (watchedMarkets.length === 0) {
      const markets = [
        { zip: "78701", name: "Austin", state: "TX", notes: "Strong tech job growth" },
        { zip: "37201", name: "Nashville", state: "TN", notes: "Healthcare + music economy" },
        { zip: "27601", name: "Raleigh", state: "NC", notes: "Research Triangle momentum" },
        { zip: "30301", name: "Atlanta", state: "GA", notes: "Diverse economy, strong migration" },
        { zip: "28202", name: "Charlotte", state: "NC", notes: "Banking hub, population boom" },
      ];

      for (const m of markets) {
        addMarket(m);
      }

      // Add sample alerts
      const alertDefs = [
        { zip: "78701", marketName: "Austin, TX", metric: "hyperScore" as const, condition: "below" as const, threshold: 70, enabled: true },
        { zip: "78701", marketName: "Austin, TX", metric: "capRate" as const, condition: "above" as const, threshold: 8.0, enabled: true },
        { zip: "27601", marketName: "Raleigh, NC", metric: "priceChange" as const, condition: "above" as const, threshold: 10, enabled: true },
        { zip: "30301", marketName: "Atlanta, GA", metric: "inventory" as const, condition: "below" as const, threshold: 3, enabled: false },
      ];

      for (const a of alertDefs) {
        addAlert(a);
      }
    }
  }, [pipelineDeals.length, watchedMarkets.length, addDeal, setAnalysis, addMarket, addAlert]);
}
