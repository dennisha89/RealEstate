import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExchangeListing, ExchangeMatch } from "@/lib/types/marketplace";
import type { AnalysisResult } from "@/app/dashboard/analyze/_components";
import type { BuyBoxCriteria } from "@/lib/stores/buybox-store";

// ─── Utilities ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Public utility: match a listing against a buy-box ───────────────────────

export function computeExchangeMatch(
  criteria: BuyBoxCriteria,
  listing: ExchangeListing
): ExchangeMatch {
  const matched: string[] = [];
  const failed: string[] = [];
  let score = 0;
  let total = 0;

  // Price range (15 pts)
  total += 15;
  if (
    listing.askingPrice >= criteria.minPrice &&
    listing.askingPrice <= criteria.maxPrice
  ) {
    matched.push("Price in range");
    score += 15;
  } else {
    failed.push("Price out of range");
  }

  // Cap rate (20 pts)
  total += 20;
  if (listing.capRate >= criteria.minCapRate) {
    matched.push("Cap rate meets minimum");
    score += 20;
  } else {
    failed.push("Cap rate below minimum");
  }

  // Cash flow (20 pts)
  total += 20;
  if (listing.monthlyCashFlow >= criteria.minCashFlow) {
    matched.push("Cash flow meets target");
    score += 20;
  } else {
    failed.push("Cash flow below target");
  }

  // DSCR (15 pts)
  total += 15;
  if (listing.dscr >= criteria.minDSCR) {
    matched.push("DSCR sufficient");
    score += 15;
  } else {
    failed.push("DSCR below threshold");
  }

  // Property type (10 pts)
  total += 10;
  if (
    criteria.propertyTypes.length === 0 ||
    criteria.propertyTypes.includes(listing.propertyType.toLowerCase())
  ) {
    matched.push("Property type match");
    score += 10;
  } else {
    failed.push("Property type mismatch");
  }

  // Score (20 pts)
  total += 20;
  if (listing.score >= criteria.minApexScore) {
    matched.push("Score above minimum");
    score += 20;
  } else {
    failed.push("Score below minimum");
  }

  return {
    listingId: listing.id,
    matchScore: Math.round((score / total) * 100),
    matchedCriteria: matched,
    failedCriteria: failed,
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface ExchangeState {
  listings: ExchangeListing[];
  createListing: (params: {
    analysis: AnalysisResult;
    dealRoomId: string;
    listingType: ExchangeListing["listingType"];
    whyPassing: string;
    sellerNotes?: string;
  }) => string;
  getActiveListings: () => ExchangeListing[];
  getMyListings: () => ExchangeListing[];
  markInterested: (id: string) => void;
  incrementViews: (id: string) => void;
  updateStatus: (id: string, status: ExchangeListing["status"]) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useExchangeStore = create<ExchangeState>()(
  persist(
    (set, get) => ({
      listings: [],

      createListing: ({ analysis, dealRoomId, listingType, whyPassing, sellerNotes }) => {
        const id = generateId();
        const now = new Date().toISOString();

        // Extract market and state from address like "123 Main St, Austin, TX 78758"
        const parts = analysis.address.split(",").map((p) => p.trim());
        const lastPart = parts[parts.length - 1] ?? "";
        const stateCode = lastPart.split(" ")[0] || "";
        const market = parts.length > 2 ? parts[parts.length - 2] : parts.length > 1 ? lastPart : analysis.address;

        const listing: ExchangeListing = {
          id,
          dealRoomId,
          createdAt: now,
          listedBy: "Investor",

          address: analysis.address,
          market,
          state: stateCode,
          askingPrice: analysis.purchasePrice,
          propertyType: "sfr",
          listingType,

          score: analysis.score,
          verdict: analysis.verdict,
          capRate: analysis.capRate,
          monthlyCashFlow: analysis.monthlyCashFlow,
          cashOnCash: analysis.cashOnCash,
          dscr: analysis.dscr,

          whyPassing,
          sellerNotes,

          status: "active",
          interestedCount: 0,
          viewCount: 0,
        };

        set((s) => ({
          listings: [...s.listings, listing],
        }));

        return id;
      },

      getActiveListings: () =>
        get().listings.filter((l) => l.status === "active"),

      getMyListings: () =>
        get().listings.filter((l) => l.listedBy === "Investor"),

      markInterested: (id) =>
        set((state) => ({
          listings: state.listings.map((l) =>
            l.id === id
              ? { ...l, interestedCount: l.interestedCount + 1 }
              : l
          ),
        })),

      incrementViews: (id) =>
        set((state) => ({
          listings: state.listings.map((l) =>
            l.id === id ? { ...l, viewCount: l.viewCount + 1 } : l
          ),
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          listings: state.listings.map((l) =>
            l.id === id ? { ...l, status } : l
          ),
        })),
    }),
    {
      name: "exchange-store",
    }
  )
);
