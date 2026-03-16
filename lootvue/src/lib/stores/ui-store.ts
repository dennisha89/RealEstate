import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  activeTab: string;
  appMode: "simple" | "advanced";
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  setAppMode: (mode: "simple" | "advanced") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeTab: "",
      appMode: "simple",
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setAppMode: (mode: "simple" | "advanced") => set({ appMode: mode }),
    }),
    {
      name: "lootvue-ui",
    }
  )
);
