import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { LenderProfile, LenderMatch, LenderLead } from "@/lib/types/marketplace";
import type { AnalysisResult } from "@/app/dashboard/analyze/_components";

// ─── Matcher (pure function, no store dependency) ─────────────────────────────

export function matchLenders(
  analysis: AnalysisResult,
  lenders: LenderProfile[]
): LenderMatch[] {
  const loanAmount = analysis.purchasePrice * 0.8;
  const ltv = 80;

  return lenders
    .map((lender) => {
      const meets: string[] = [];
      const warns: string[] = [];
      let score = 0;
      let total = 0;

      // Loan amount in range
      total += 25;
      if (loanAmount >= lender.minLoan && loanAmount <= lender.maxLoan) {
        meets.push("Loan amount in range");
        score += 25;
      } else {
        warns.push("Loan amount outside range");
      }

      // LTV
      total += 20;
      if (ltv <= lender.maxLTV) {
        meets.push("LTV within limit");
        score += 20;
      } else {
        warns.push("LTV exceeds maximum");
      }

      // DSCR requirement
      total += 20;
      if (!lender.minDSCR || analysis.dscr >= lender.minDSCR) {
        meets.push("DSCR meets minimum");
        score += 20;
      } else {
        warns.push(`DSCR below ${lender.minDSCR}x minimum`);
      }

      // Property type
      total += 15;
      if (
        lender.propertyTypes.includes("all") ||
        lender.propertyTypes.includes("sfr")
      ) {
        meets.push("Property type eligible");
        score += 15;
      } else {
        warns.push("Property type not supported");
      }

      // Rate attractiveness (lower = better)
      total += 20;
      const midRate = (lender.rateRange.min + lender.rateRange.max) / 2;
      if (midRate <= 8) {
        meets.push("Competitive rate");
        score += 20;
      } else if (midRate <= 12) {
        meets.push("Moderate rate");
        score += 10;
      } else {
        warns.push("High interest rate");
      }

      // Estimated rate: use midpoint adjusted by DSCR strength
      const dscrBonus =
        analysis.dscr > 1.5 ? -0.25 : analysis.dscr > 1.25 ? -0.125 : 0;
      const estimatedRate = Math.max(
        lender.rateRange.min,
        midRate + dscrBonus
      );
      const estimatedPayment = Math.round(
        (loanAmount *
          (estimatedRate / 100 / 12) *
          Math.pow(1 + estimatedRate / 100 / 12, 360)) /
          (Math.pow(1 + estimatedRate / 100 / 12, 360) - 1)
      );

      return {
        lender,
        matchScore: Math.round((score / total) * 100),
        estimatedRate: Math.round(estimatedRate * 100) / 100,
        estimatedPayment,
        meetsCriteria: meets,
        warnings: warns,
      } satisfies LenderMatch;
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface LenderState {
  leads: LenderLead[];
  submitLead: (
    params: Omit<LenderLead, "id" | "createdAt" | "status">
  ) => string;
  getMyLeads: () => LenderLead[];
  updateLeadStatus: (id: string, status: LenderLead["status"]) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLenderStore = create<LenderState>()(
  persist(
    (set, get) => ({
      leads: [],

      submitLead: (params) => {
        const id = `lead_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        const lead: LenderLead = {
          ...params,
          id,
          createdAt: new Date().toISOString(),
          status: "submitted",
        };
        set((state) => ({ leads: [...state.leads, lead] }));
        return id;
      },

      getMyLeads: () => get().leads,

      updateLeadStatus: (id, status) =>
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id ? { ...l, status } : l
          ),
        })),
    }),
    {
      name: "lender-store",
    }
  )
);
