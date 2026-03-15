import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InvestorType = "first_time" | "growing" | "experienced" | "professional";
export type Strategy = "cash_flow" | "appreciation" | "both" | "brrrr" | "unsure";
export type Timeline = "1yr" | "3yr" | "5yr";
export type PropertyType = "sfr" | "duplex" | "triplex" | "fourplex";

export interface BuyBox {
  priceMin: number;
  priceMax: number;
  propertyTypes: PropertyType[];
  targetMarkets: string[];
  minCapRate: number;
}

export interface ExistingProperty {
  address: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
}

export interface UserProfile {
  name: string;
  investorType: InvestorType;
  goalMonthlyIncome: number;
  strategy: Strategy;
  timeline: Timeline;
  buyBox: BuyBox;
  existingProperties: ExistingProperty[];
  onboardingComplete: boolean;
  createdAt: string;
}

interface UserProfileActions {
  setName: (name: string) => void;
  setInvestorType: (type: InvestorType) => void;
  setGoalMonthlyIncome: (income: number) => void;
  setStrategy: (strategy: Strategy) => void;
  setTimeline: (timeline: Timeline) => void;
  setBuyBox: (buyBox: Partial<BuyBox>) => void;
  setExistingProperties: (properties: ExistingProperty[]) => void;
  addExistingProperty: (property: ExistingProperty) => void;
  completeOnboarding: () => void;
  resetProfile: () => void;
}

const DEFAULT_BUY_BOX: BuyBox = {
  priceMin: 150000,
  priceMax: 500000,
  propertyTypes: [],
  targetMarkets: [],
  minCapRate: 6,
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  investorType: "first_time",
  goalMonthlyIncome: 5000,
  strategy: "unsure",
  timeline: "3yr",
  buyBox: DEFAULT_BUY_BOX,
  existingProperties: [],
  onboardingComplete: false,
  createdAt: "",
};

export const useUserProfileStore = create<UserProfile & UserProfileActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,

      setName: (name) => set({ name }),

      setInvestorType: (investorType) => set({ investorType }),

      setGoalMonthlyIncome: (goalMonthlyIncome) => set({ goalMonthlyIncome }),

      setStrategy: (strategy) => set({ strategy }),

      setTimeline: (timeline) => set({ timeline }),

      setBuyBox: (partial) =>
        set((state) => ({
          buyBox: { ...state.buyBox, ...partial },
        })),

      setExistingProperties: (existingProperties) => set({ existingProperties }),

      addExistingProperty: (property) =>
        set((state) => ({
          existingProperties: [...state.existingProperties, property],
        })),

      completeOnboarding: () =>
        set({
          onboardingComplete: true,
          createdAt: new Date().toISOString(),
        }),

      resetProfile: () => set(DEFAULT_PROFILE),
    }),
    {
      name: "lootvue-user-profile",
    }
  )
);
