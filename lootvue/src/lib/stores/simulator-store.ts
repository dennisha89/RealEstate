import { create } from "zustand";

export interface SimulatorInputs {
  // Acquisition
  purchasePrice: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  amortizationYears: number;
  closingCostsPct: number;
  renovationBudget: number;

  // Income
  monthlyRent: number;
  annualRentGrowthPct: number;
  vacancyPct: number;
  otherIncome: number;

  // Expenses
  propertyTaxRate: number;
  insuranceAnnual: number;
  managementPct: number;
  maintenancePct: number;
  capexReservePct: number;
  annualExpenseGrowthPct: number;

  // Exit & Hold
  holdPeriodYears: number;
  exitCapRate: number;
  sellingCostsPct: number;
  annualAppreciationPct: number;
}

interface SimulatorState extends SimulatorInputs {
  // Track active chart tab
  activeTab: "cashflow" | "proforma" | "montecarlo" | "waterfall" | "sensitivity";

  // Actions
  setValue: <K extends keyof SimulatorInputs>(key: K, value: SimulatorInputs[K]) => void;
  setActiveTab: (tab: SimulatorState["activeTab"]) => void;
  reset: () => void;
  loadDeal: (inputs: Partial<SimulatorInputs>) => void;
}

const DEFAULTS: SimulatorInputs = {
  purchasePrice: 350_000,
  downPaymentPct: 20,
  interestRate: 6.95,
  loanTermYears: 30,
  amortizationYears: 30,
  closingCostsPct: 3,
  renovationBudget: 0,

  monthlyRent: 2_200,
  annualRentGrowthPct: 2,
  vacancyPct: 5,
  otherIncome: 0,

  propertyTaxRate: 1.25,
  insuranceAnnual: 2_400,
  managementPct: 10,
  maintenancePct: 1,
  capexReservePct: 1,
  annualExpenseGrowthPct: 2.5,

  holdPeriodYears: 5,
  exitCapRate: 6.5,
  sellingCostsPct: 6,
  annualAppreciationPct: 3,
};

export const useSimulatorStore = create<SimulatorState>((set) => ({
  ...DEFAULTS,
  activeTab: "cashflow",

  setValue: (key, value) => set({ [key]: value }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () => set({ ...DEFAULTS, activeTab: "cashflow" }),
  loadDeal: (inputs) => set((state) => ({ ...state, ...inputs, activeTab: "cashflow" })),
}));

export { DEFAULTS as SIMULATOR_DEFAULTS };
