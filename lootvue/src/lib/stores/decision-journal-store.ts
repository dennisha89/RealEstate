import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DecisionEntry {
  id: string;
  createdAt: string;
  type: "buy" | "pass" | "sell" | "hold" | "refinance" | "watch";

  context: {
    address?: string;
    market: string;
    zip: string;
    price?: number;
    apexScore?: number;
    convictionScore?: number;
    prismVerdict?: string;
    mortgageRate?: number;
  };

  reasoning: string;
  keyFactors: string[];
  confidenceLevel: "very_confident" | "confident" | "uncertain" | "forced";

  systemRecommendation?: string;
  agreedWithSystem: boolean;

  outcome?: {
    recordedAt: string;
    whatHappened: string;
    wasRightDecision: boolean;
    financialImpact?: number;
  };
}

interface DecisionJournalState {
  entries: DecisionEntry[];
  addEntry: (entry: Omit<DecisionEntry, "id" | "createdAt">) => string;
  addOutcome: (id: string, outcome: DecisionEntry["outcome"]) => void;
  getEntriesByType: (type: DecisionEntry["type"]) => DecisionEntry[];
  getEntriesByMarket: (zip: string) => DecisionEntry[];
  getJournalStats: () => {
    totalDecisions: number;
    agreedWithSystem: number;
    disagreedWithSystem: number;
    systemWasRight: number;
    systemWasWrong: number;
    userOverrideWasRight: number;
    userOverrideWasWrong: number;
    avgConfidence: string;
    mostCommonPassReasons: string[];
  };
}

function generateId(): string {
  return `decision_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const CONFIDENCE_VALUES: Record<DecisionEntry["confidenceLevel"], number> = {
  very_confident: 4,
  confident: 3,
  uncertain: 2,
  forced: 1,
};

const CONFIDENCE_LABELS: Record<number, string> = {
  4: "very_confident",
  3: "confident",
  2: "uncertain",
  1: "forced",
};

export const useDecisionJournalStore = create<DecisionJournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        const id = generateId();
        set((state) => ({
          entries: [
            {
              ...entry,
              id,
              createdAt: new Date().toISOString(),
            },
            ...state.entries,
          ],
        }));
        return id;
      },

      addOutcome: (id, outcome) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, outcome } : e
          ),
        })),

      getEntriesByType: (type) => get().entries.filter((e) => e.type === type),

      getEntriesByMarket: (zip) =>
        get().entries.filter((e) => e.context.zip === zip),

      getJournalStats: () => {
        const entries = get().entries;
        const withOutcome = entries.filter((e) => e.outcome !== undefined);
        const agreed = entries.filter((e) => e.agreedWithSystem);
        const disagreed = entries.filter((e) => !e.agreedWithSystem);

        const agreedWithOutcome = withOutcome.filter(
          (e) => e.agreedWithSystem
        );
        const disagreedWithOutcome = withOutcome.filter(
          (e) => !e.agreedWithSystem
        );

        // Confidence average
        const totalConfidence = entries.reduce(
          (sum, e) => sum + CONFIDENCE_VALUES[e.confidenceLevel],
          0
        );
        const avgNum =
          entries.length > 0
            ? Math.round(totalConfidence / entries.length)
            : 3;
        const avgConfidence = CONFIDENCE_LABELS[avgNum] ?? "confident";

        // Most common pass reasons: aggregate keyFactors from "pass" decisions
        const passEntries = entries.filter((e) => e.type === "pass");
        const factorCounts: Record<string, number> = {};
        for (const entry of passEntries) {
          for (const factor of entry.keyFactors) {
            factorCounts[factor] = (factorCounts[factor] ?? 0) + 1;
          }
        }
        const mostCommonPassReasons = Object.entries(factorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([reason]) => reason);

        return {
          totalDecisions: entries.length,
          agreedWithSystem: agreed.length,
          disagreedWithSystem: disagreed.length,
          systemWasRight: agreedWithOutcome.filter(
            (e) => e.outcome?.wasRightDecision
          ).length,
          systemWasWrong: agreedWithOutcome.filter(
            (e) => e.outcome && !e.outcome.wasRightDecision
          ).length,
          userOverrideWasRight: disagreedWithOutcome.filter(
            (e) => e.outcome?.wasRightDecision
          ).length,
          userOverrideWasWrong: disagreedWithOutcome.filter(
            (e) => e.outcome && !e.outcome.wasRightDecision
          ).length,
          avgConfidence,
          mostCommonPassReasons,
        };
      },
    }),
    {
      name: "decision-journal-store",
    }
  )
);
