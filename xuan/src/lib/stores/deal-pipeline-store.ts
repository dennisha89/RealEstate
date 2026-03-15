import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DealStatus =
  | "discovered"
  | "analyzing"
  | "offer_pending"
  | "under_contract"
  | "closed"
  | "passed"
  | "lost";

export interface DealEntry {
  id: string;
  addedAt: string;
  updatedAt: string;
  status: DealStatus;

  // Property
  address: string;
  market: string;
  state: string;
  zip: string;
  price: number;
  propertyType: string;

  // Analysis results (captured when analyzed)
  analysis?: {
    apexScore: number;
    convictionScore: number;
    prismVerdict: string;
    capRate: number;
    monthlyCashFlow: number;
    cashOnCash: number;
  };

  // Financing (if selected)
  financing?: {
    loanType: string;
    downPayment: number;
    interestRate: number;
    monthlyPayment: number;
  };

  // Decision tracking
  notes: string[];
  passReason?: string;

  // Outcome (for closed deals)
  outcome?: {
    actualPrice: number;
    closingDate: string;
    currentValue?: number;
    actualCashFlow?: number;
  };
}

interface DealPipelineState {
  deals: DealEntry[];
  addDeal: (deal: Omit<DealEntry, "id" | "addedAt" | "updatedAt" | "notes">) => string;
  updateDealStatus: (id: string, status: DealStatus) => void;
  addNote: (id: string, note: string) => void;
  setAnalysis: (id: string, analysis: DealEntry["analysis"]) => void;
  setFinancing: (id: string, financing: DealEntry["financing"]) => void;
  setOutcome: (id: string, outcome: DealEntry["outcome"]) => void;
  setPassReason: (id: string, reason: string) => void;
  removeDeal: (id: string) => void;
  getDealsByStatus: (status: DealStatus) => DealEntry[];
  getDealsByMarket: (zip: string) => DealEntry[];
  getRecentDeals: (limit: number) => DealEntry[];
  getPipelineStats: () => {
    total: number;
    byStatus: Record<DealStatus, number>;
    avgConvictionScore: number;
    totalInvested: number;
    activeDeals: number;
  };
}

function generateId(): string {
  return `deal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const ALL_STATUSES: DealStatus[] = [
  "discovered",
  "analyzing",
  "offer_pending",
  "under_contract",
  "closed",
  "passed",
  "lost",
];

export const useDealPipelineStore = create<DealPipelineState>()(
  persist(
    (set, get) => ({
      deals: [],

      addDeal: (deal) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((state) => ({
          deals: [
            ...state.deals,
            { ...deal, id, addedAt: now, updatedAt: now, notes: [] },
          ],
        }));
        return id;
      },

      updateDealStatus: (id, status) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? { ...d, status, updatedAt: new Date().toISOString() }
              : d
          ),
        })),

      addNote: (id, note) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? {
                  ...d,
                  notes: [
                    ...d.notes,
                    `[${new Date().toISOString()}] ${note}`,
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        })),

      setAnalysis: (id, analysis) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? { ...d, analysis, updatedAt: new Date().toISOString() }
              : d
          ),
        })),

      setFinancing: (id, financing) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? { ...d, financing, updatedAt: new Date().toISOString() }
              : d
          ),
        })),

      setOutcome: (id, outcome) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? { ...d, outcome, updatedAt: new Date().toISOString() }
              : d
          ),
        })),

      setPassReason: (id, reason) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? {
                  ...d,
                  passReason: reason,
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        })),

      removeDeal: (id) =>
        set((state) => ({
          deals: state.deals.filter((d) => d.id !== id),
        })),

      getDealsByStatus: (status) =>
        get().deals.filter((d) => d.status === status),

      getDealsByMarket: (zip) =>
        get().deals.filter((d) => d.zip === zip),

      getRecentDeals: (limit) =>
        [...get().deals]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, limit),

      getPipelineStats: () => {
        const deals = get().deals;
        const byStatus = ALL_STATUSES.reduce(
          (acc, s) => {
            acc[s] = deals.filter((d) => d.status === s).length;
            return acc;
          },
          {} as Record<DealStatus, number>
        );

        const withConviction = deals.filter(
          (d) => d.analysis?.convictionScore != null
        );
        const avgConvictionScore =
          withConviction.length > 0
            ? withConviction.reduce(
                (sum, d) => sum + (d.analysis?.convictionScore ?? 0),
                0
              ) / withConviction.length
            : 0;

        const totalInvested = deals
          .filter((d) => d.status === "closed" && d.outcome?.actualPrice)
          .reduce((sum, d) => sum + (d.outcome?.actualPrice ?? 0), 0);

        const activeStatuses: DealStatus[] = [
          "discovered",
          "analyzing",
          "offer_pending",
          "under_contract",
        ];
        const activeDeals = deals.filter((d) =>
          activeStatuses.includes(d.status)
        ).length;

        return {
          total: deals.length,
          byStatus,
          avgConvictionScore,
          totalInvested,
          activeDeals,
        };
      },
    }),
    {
      name: "deal-pipeline-store",
    }
  )
);
