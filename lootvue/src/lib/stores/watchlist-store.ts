import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchedMarket {
  zip: string;
  name: string;
  state: string;
  addedAt: string; // ISO date
  notes?: string;
}

export interface Alert {
  id: string;
  zip: string;
  marketName: string;
  metric: "hyperScore" | "capRate" | "priceChange" | "inventory" | "signal";
  condition: "above" | "below" | "crosses";
  threshold: number;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
}

interface WatchlistState {
  watchedMarkets: WatchedMarket[];
  alerts: Alert[];
  addMarket: (market: Omit<WatchedMarket, "addedAt">) => void;
  removeMarket: (zip: string) => void;
  isWatching: (zip: string) => boolean;
  addAlert: (alert: Omit<Alert, "id" | "createdAt">) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  getAlertsForMarket: (zip: string) => Alert[];
}

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      watchedMarkets: [],
      alerts: [],

      addMarket: (market) =>
        set((state) => {
          if (state.watchedMarkets.some((m) => m.zip === market.zip)) {
            return state;
          }
          return {
            watchedMarkets: [
              ...state.watchedMarkets,
              { ...market, addedAt: new Date().toISOString() },
            ],
          };
        }),

      removeMarket: (zip) =>
        set((state) => ({
          watchedMarkets: state.watchedMarkets.filter((m) => m.zip !== zip),
          alerts: state.alerts.filter((a) => a.zip !== zip),
        })),

      isWatching: (zip) => get().watchedMarkets.some((m) => m.zip === zip),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        })),

      getAlertsForMarket: (zip) => get().alerts.filter((a) => a.zip === zip),
    }),
    {
      name: "watchlist-store",
    }
  )
);
