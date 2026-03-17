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
  loanPointsPct: number;          // upfront loan points (0–4%)
  pmiMonthly: number;             // monthly PMI ($0–$500), charged when down < 20%

  // Income
  monthlyRent: number;
  annualRentGrowthPct: number;
  vacancyPct: number;
  otherIncome: number;
  laundryIncome: number;          // additional monthly laundry income
  parkingIncome: number;          // additional monthly parking income
  leaseEscalationPct: number;     // annual contractual rent bump (0–5%)
  rentConcessionMonths: number;   // months of free rent at lease-up (0–3)

  // Expenses
  propertyTaxRate: number;
  insuranceAnnual: number;
  managementPct: number;
  maintenancePct: number;
  capexReservePct: number;
  annualExpenseGrowthPct: number;
  hoaMonthly: number;             // monthly HOA / condo fee
  utilitiesMonthly: number;       // monthly landlord-paid utilities
  legalAccountingAnnual: number;  // annual legal & accounting
  advertisingAnnual: number;      // annual advertising / leasing

  // Exit & Hold
  holdPeriodYears: number;
  exitCapRate: number;
  sellingCostsPct: number;
  annualAppreciationPct: number;

  // Tax & Strategy
  capitalGainsTaxRatePct: number;  // 0–40%
  depreciationYears: number;       // 0 = none, 27.5 = residential, 39 = commercial
  costSegBonus: number;            // year-1 accelerated depreciation ($)
  use1031Exchange: boolean;        // defer capital gains tax on exit

  // Missing Parameters (added for robust simulation)
  leaseUpMonths: number;           // months vacant before first tenant (0–6)
  turnoverCostPerEvent: number;    // paint, clean, re-lease per turnover ($)
  avgTenantStayYears: number;      // avg tenant tenure (1–5 years)
  insuranceAnnualIncreasePct: number; // annual insurance cost increase (0–40%)
  propertyTaxReassessment: boolean;   // does tax reset to purchase price?
  loanType: "fixed" | "arm5" | "arm7" | "interestOnly"; // loan structure
  armAdjustmentCapPct: number;     // max annual ARM adjustment (1-2%)
  armLifetimeCapPct: number;       // max lifetime ARM adjustment (5-6%)
  interestOnlyYears: number;       // IO period before amortizing (0-10)
  prepaymentPenaltyYears: number;  // years prepayment penalty applies (0-5)
  prepaymentPenaltyPct: number;    // penalty as % of balance (1-5%)
  rehabTimelineMonths: number;     // months of holding cost with zero income
  partnerSplitPct: number;         // partner's equity share (0 = no partner, 50 = 50/50)
  reserveMonths: number;           // months of reserves to maintain (3-12)
  annualIncomeTax: number;         // marginal income tax bracket (22-37%)
}

interface SimulatorState extends SimulatorInputs {
  // Track active chart tab
  activeTab: "cashflow" | "proforma" | "montecarlo" | "stresstest" | "waterfall" | "sensitivity";

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
  loanPointsPct: 0,
  pmiMonthly: 0,

  monthlyRent: 2_200,
  annualRentGrowthPct: 2,
  vacancyPct: 5,
  otherIncome: 0,
  laundryIncome: 0,
  parkingIncome: 0,
  leaseEscalationPct: 0,
  rentConcessionMonths: 0,

  propertyTaxRate: 1.25,
  insuranceAnnual: 2_400,
  managementPct: 10,
  maintenancePct: 1,
  capexReservePct: 1,
  annualExpenseGrowthPct: 2.5,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  legalAccountingAnnual: 0,
  advertisingAnnual: 0,

  holdPeriodYears: 5,
  exitCapRate: 6.5,
  sellingCostsPct: 6,
  annualAppreciationPct: 3,

  capitalGainsTaxRatePct: 20,
  depreciationYears: 27.5,
  costSegBonus: 0,
  use1031Exchange: false,

  // Missing Parameters — realistic defaults
  leaseUpMonths: 1,
  turnoverCostPerEvent: 2500,
  avgTenantStayYears: 2,
  insuranceAnnualIncreasePct: 5,
  propertyTaxReassessment: true,
  loanType: "fixed" as const,
  armAdjustmentCapPct: 2,
  armLifetimeCapPct: 5,
  interestOnlyYears: 0,
  prepaymentPenaltyYears: 0,
  prepaymentPenaltyPct: 0,
  rehabTimelineMonths: 0,
  partnerSplitPct: 0,
  reserveMonths: 6,
  annualIncomeTax: 24,
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
