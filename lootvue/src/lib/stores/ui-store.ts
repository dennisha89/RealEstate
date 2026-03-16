import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  activeTab: string;
  appMode: "simple" | "advanced";
  aiCoachOpen: boolean;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  setAppMode: (mode: "simple" | "advanced") => void;
  toggleAiCoach: () => void;
  setAiCoachOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeTab: "",
      appMode: "simple",
      aiCoachOpen: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setAppMode: (mode: "simple" | "advanced") => set({ appMode: mode }),
      toggleAiCoach: () =>
        set((state) => ({ aiCoachOpen: !state.aiCoachOpen })),
      setAiCoachOpen: (open: boolean) => set({ aiCoachOpen: open }),
    }),
    {
      name: "lootvue-ui",
    }
  )
);
