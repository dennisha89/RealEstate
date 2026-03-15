import { create } from "zustand";
import type { HyperAnalysis } from "@/lib/types/market-intelligence";

interface AnalysisState {
  currentAnalysis: HyperAnalysis | null;
  selectedZip: string;
  setCurrentAnalysis: (analysis: HyperAnalysis | null) => void;
  setSelectedZip: (zip: string) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentAnalysis: null,
  selectedZip: "",
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setSelectedZip: (zip) => set({ selectedZip: zip }),
}));
