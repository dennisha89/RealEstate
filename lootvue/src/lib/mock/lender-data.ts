/**
 * Mock lender profiles for the Marketplace / Lending tab.
 * In production: replace with real lender data fetched through data-bridge.ts.
 * All 50-state coverage is expressed as ["ALL"]; partial coverage lists states explicitly.
 */

import type { LenderProfile } from "@/lib/types/marketplace";

export const MOCK_LENDERS: LenderProfile[] = [
  // 1 — National Bank Mortgage (conventional)
  {
    id: "lender_mock_1",
    name: "National Bank Mortgage",
    type: "conventional",
    minLoan: 100_000,
    maxLoan: 750_000,
    minDown: 3.5,
    rateRange: { min: 6.25, max: 7.5 },
    termOptions: ["15yr", "30yr"],
    closingDays: 45,
    minCreditScore: 680,
    maxLTV: 97,
    propertyTypes: [
      "sfr",
      "duplex",
      "triplex",
      "quad",
      "condo",
      "townhouse",
      "multifamily",
    ],
    states: ["ALL"],
    features: [
      "Fannie Mae / Freddie Mac conforming loans",
      "Rate lock up to 60 days at no cost",
      "Online application with 24-hr pre-approval",
      "No prepayment penalty",
    ],
    description:
      "Full-service conventional lender originating conforming and jumbo residential loans nationwide. Ideal for W-2 borrowers with strong credit purchasing primary or investment properties.",
    avgCloseTime: 42,
    rating: 4.3,
    reviewCount: 847,
  },

  // 2 — DSCR Capital Partners (dscr)
  {
    id: "lender_mock_2",
    name: "DSCR Capital Partners",
    type: "dscr",
    minLoan: 75_000,
    maxLoan: 2_000_000,
    minDown: 20,
    rateRange: { min: 7.0, max: 9.0 },
    termOptions: ["30yr", "5-1 ARM"],
    closingDays: 21,
    minDSCR: 1.0,
    maxLTV: 80,
    propertyTypes: ["sfr", "duplex", "triplex", "quad"],
    states: ["ALL"],
    features: [
      "No personal income verification required",
      "Qualify on rental income alone (DSCR 1.0+)",
      "LLC and entity vesting accepted",
      "Foreign national program available",
      "Blanket loan option for portfolios of 5+",
    ],
    description:
      "Specialist DSCR lender for buy-and-hold investors. Underwriting is based on property cash flow, not tax returns, making this ideal for self-employed borrowers and seasoned investors with large existing portfolios.",
    avgCloseTime: 19,
    rating: 4.5,
    reviewCount: 612,
  },

  // 3 — Velocity Hard Money (hard_money)
  {
    id: "lender_mock_3",
    name: "Velocity Hard Money",
    type: "hard_money",
    minLoan: 50_000,
    maxLoan: 1_500_000,
    minDown: 10,
    rateRange: { min: 10.0, max: 14.0 },
    termOptions: ["6mo", "12mo", "18mo"],
    closingDays: 7,
    maxLTV: 90,
    propertyTypes: [
      "sfr",
      "duplex",
      "triplex",
      "quad",
      "multifamily",
      "mixed_use",
      "commercial",
    ],
    states: ["ALL"],
    features: [
      "Close in as few as 5 business days",
      "Asset-based underwriting — credit score not primary factor",
      "Construction draw schedules available for rehab projects",
      "Up to 90% LTV on acquisition, 100% of rehab costs",
    ],
    description:
      "Speed-focused hard money lender built for fix-and-flip and bridge scenarios. No income verification, rapid closings, and flexible draw schedules for value-add investors who need capital now.",
    avgCloseTime: 7,
    rating: 4.1,
    reviewCount: 389,
  },

  // 4 — Regional Portfolio Lender (portfolio)
  {
    id: "lender_mock_4",
    name: "Regional Portfolio Lender",
    type: "portfolio",
    minLoan: 150_000,
    maxLoan: 5_000_000,
    minDown: 15,
    rateRange: { min: 6.75, max: 8.25 },
    termOptions: ["25yr", "30yr"],
    closingDays: 30,
    minDSCR: 1.15,
    maxLTV: 85,
    propertyTypes: ["sfr", "multifamily", "mixed_use"],
    states: ["TX", "FL", "NC", "TN", "GA", "SC", "OH"],
    features: [
      "Holds loans in-house — no secondary market constraints",
      "Common-sense underwriting for complex income situations",
      "Portfolio loans for investors with 10+ properties",
      "Relationship pricing for repeat borrowers",
      "Expedited 30-day close with full appraisal",
    ],
    description:
      "Southeast and Midwest-focused portfolio lender that retains all loans on its own balance sheet. Underwriting flexibility makes this a strong fit for investors with complicated tax returns or large existing portfolios that exceed agency limits.",
    avgCloseTime: 28,
    rating: 4.6,
    reviewCount: 294,
  },

  // 5 — Bridge Funding Group (bridge)
  {
    id: "lender_mock_5",
    name: "Bridge Funding Group",
    type: "bridge",
    minLoan: 100_000,
    maxLoan: 3_000_000,
    minDown: 15,
    rateRange: { min: 8.5, max: 12.0 },
    termOptions: ["12mo", "24mo"],
    closingDays: 10,
    maxLTV: 85,
    propertyTypes: [
      "sfr",
      "duplex",
      "triplex",
      "quad",
      "multifamily",
      "mixed_use",
      "commercial",
    ],
    states: ["ALL"],
    features: [
      "Interest-only payments during bridge term",
      "Cross-collateralization across properties allowed",
      "Extension options up to 6 additional months",
      "No prepayment penalty after month 3",
    ],
    description:
      "Short-term bridge financing for investors transitioning between acquisitions, stabilizing value-add assets, or waiting for a conventional refinance. Competitive interest-only structure preserves cash flow during the hold period.",
    avgCloseTime: 10,
    rating: 4.0,
    reviewCount: 201,
  },

  // 6 — FHA Direct (fha)
  {
    id: "lender_mock_6",
    name: "FHA Direct",
    type: "fha",
    minLoan: 50_000,
    maxLoan: 472_030,
    minDown: 3.5,
    rateRange: { min: 5.75, max: 6.75 },
    termOptions: ["30yr"],
    closingDays: 45,
    minCreditScore: 580,
    maxLTV: 96.5,
    propertyTypes: ["sfr", "duplex", "triplex", "quad"],
    states: [
      "AL", "AZ", "CA", "CO", "FL", "GA", "IL", "IN",
      "MI", "MN", "MO", "NC", "NJ", "NY", "OH", "PA",
      "SC", "TN", "TX", "VA", "WA",
    ],
    features: [
      "580+ credit score accepted with 3.5% down",
      "Owner-occupant requirement — must live in one unit",
      "Seller concessions up to 6% of purchase price",
      "Down payment assistance programs accepted",
    ],
    description:
      "FHA-insured lending for owner-occupant borrowers purchasing 1-4 unit properties. The low down payment and flexible credit requirements make this the preferred path for house-hacking investors entering the market for the first time.",
    avgCloseTime: 44,
    rating: 4.2,
    reviewCount: 1_103,
  },

  // 7 — Investor's Choice DSCR (dscr)
  {
    id: "lender_mock_7",
    name: "Investor's Choice DSCR",
    type: "dscr",
    minLoan: 100_000,
    maxLoan: 3_000_000,
    minDown: 25,
    rateRange: { min: 6.5, max: 8.5 },
    termOptions: ["30yr", "40yr interest-only"],
    closingDays: 14,
    minDSCR: 0.75,
    maxLTV: 75,
    propertyTypes: ["sfr", "duplex", "multifamily"],
    states: ["ALL"],
    features: [
      "DSCR as low as 0.75 — sub-1.0 cash-flowing deals accepted",
      "40-year interest-only option maximizes monthly cash flow",
      "No seasoning requirement on cash-out refinances",
      "Unlimited financed properties in portfolio",
      "Dedicated investor portal with pipeline tracking",
    ],
    description:
      "Premium DSCR program for experienced investors acquiring properties in high-cost markets where sub-1.0 DSCR is common. The 40-year interest-only term significantly improves short-term cash flow while building equity through appreciation.",
    avgCloseTime: 13,
    rating: 4.7,
    reviewCount: 531,
  },

  // 8 — Community Credit Union (portfolio)
  {
    id: "lender_mock_8",
    name: "Community Credit Union",
    type: "portfolio",
    minLoan: 50_000,
    maxLoan: 500_000,
    minDown: 10,
    rateRange: { min: 6.0, max: 7.25 },
    termOptions: ["15yr", "20yr", "30yr"],
    closingDays: 35,
    minCreditScore: 650,
    maxLTV: 90,
    propertyTypes: ["sfr"],
    states: ["OH", "IN", "MI", "PA", "KY"],
    features: [
      "Member-owned — profits returned as lower rates",
      "Local appraisers, faster turnaround times",
      "Manual underwriting for unique borrower situations",
      "No origination fee for existing members",
    ],
    description:
      "Member-owned credit union offering competitive portfolio mortgage rates across the Midwest. Particularly well-suited for first-time investment property buyers who want a relationship lender with local market knowledge.",
    avgCloseTime: 33,
    rating: 4.4,
    reviewCount: 178,
  },
];
