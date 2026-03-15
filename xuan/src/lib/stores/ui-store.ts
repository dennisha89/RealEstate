import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  activeTab: string;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeTab: "",
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
}));
