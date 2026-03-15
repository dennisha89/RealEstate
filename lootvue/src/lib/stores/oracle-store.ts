import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Prediction, OracleStats } from "@/lib/engines/oracle/prediction-tracker";
import {
  createPrediction,
  recordOutcome as recordOutcomeFn,
  computeOracleStats,
  computeEngineAccuracy,
} from "@/lib/engines/oracle/prediction-tracker";

interface OracleState {
  predictions: Prediction[];
  addPrediction: (params: Omit<Prediction, "id" | "createdAt">) => Prediction;
  recordOutcome: (id: string, outcome: NonNullable<Prediction["outcomes"]>) => void;
  getPredictionsForMarket: (zip: string) => Prediction[];
  getStats: () => OracleStats;
  getEngineLeaderboard: () => Array<{ engine: string; accuracy: number; count: number }>;
}

export const useOracleStore = create<OracleState>()(
  persist(
    (set, get) => ({
      predictions: [],

      addPrediction: (params) => {
        const prediction = createPrediction(params);
        set((state) => ({
          predictions: [...state.predictions, prediction],
        }));
        return prediction;
      },

      recordOutcome: (id, outcome) =>
        set((state) => {
          const updated = recordOutcomeFn(id, outcome, state.predictions);
          return {
            predictions: state.predictions.map((p) =>
              p.id === id ? updated : p
            ),
          };
        }),

      getPredictionsForMarket: (zip) =>
        get().predictions.filter((p) => p.market.zip === zip),

      getStats: () => computeOracleStats(get().predictions),

      getEngineLeaderboard: () =>
        computeEngineAccuracy(get().predictions).map((e) => ({
          engine: e.engine,
          accuracy: e.accuracy,
          count: e.totalPredictions,
        })),
    }),
    {
      name: "oracle-store",
    }
  )
);
