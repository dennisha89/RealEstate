// lib/brand.ts
// Centralized brand constants for LootVue
// Import from here — never hardcode brand strings in components

export const BRAND = {
  name: "LootVue",
  code: "LV",
  fullName: "LootVue Intelligence, Inc.",
  tagline: "See what the institutions see. Before you bid.",
  philosophy: "Every number has a source. Every score has a formula. Every verdict has a reason.",

  // Analysis domains (plain English — no metaphors)
  domains: {
    market: { name: "Market Analysis", description: "Demographics, employment, population trends" },
    property: { name: "Property Analysis", description: "Valuation, comps, rental estimates" },
    financial: { name: "Financial Analysis", description: "Cash flow, returns, debt metrics" },
    risk: { name: "Risk Analysis", description: "Stress testing, scenario modeling, downside" },
    timing: { name: "Timing Analysis", description: "Rate environment, market cycle, momentum" },
    portfolio: { name: "Portfolio Analysis", description: "Concentration, impact, goal tracking" },
  },

  // The 6 core engines (consolidated from 20)
  engines: {
    dealQuality: { name: "Deal Quality", description: "Aggregates financial + valuation metrics into deal score" },
    marketSelection: { name: "Market Selection", description: "Ranks markets by growth, supply/demand, affordability" },
    entryTiming: { name: "Entry Timing", description: "Rate environment + market cycle → buy/wait signal" },
    riskAssessment: { name: "Risk Assessment", description: "Multi-scenario stress test across 7 dimensions" },
    portfolioFit: { name: "Portfolio Fit", description: "How this deal changes your portfolio's risk and cash flow" },
    exitStrategy: { name: "Exit Strategy", description: "When to sell, refinance, or hold — and why" },
  },

  // Score names (descriptive)
  scores: {
    dealScore: { name: "Deal Score", range: "0-100", description: "Composite score across all 6 engines" },
    confidence: { name: "Confidence", range: "0-100%", description: "How much data supports this verdict" },
    riskScore: { name: "Risk Score", range: "Low/Medium/High", description: "Downside exposure level" },
    timingSignal: { name: "Timing Signal", range: "Buy/Wait/Hold", description: "Current market timing" },
  },

  // Verdict labels (clear, actionable)
  verdicts: {
    STRONG_BUY: "Strong buy — high conviction",
    BUY: "Buy — fundamentals support it",
    LEAN_BUY: "Lean buy — proceed with caution",
    NEUTRAL: "Neutral — needs more data",
    LEAN_PASS: "Lean pass — risk outweighs reward",
    PASS: "Pass — numbers don't work",
    HARD_PASS: "Hard pass — deal breakers found",
  } as Record<string, string>,

  // Data source registry with citation format
  dataSources: {
    census: { name: "U.S. Census Bureau", dataset: "ACS 5-Year Estimates", refresh: "30 days", url: "data.census.gov" },
    bls: { name: "Bureau of Labor Statistics", dataset: "QCEW / CES", refresh: "7 days", url: "bls.gov" },
    fred: { name: "Federal Reserve (FRED)", dataset: "Economic Data", refresh: "1 day", url: "fred.stlouisfed.org" },
    attom: { name: "ATTOM Property Data", dataset: "Property / Sales / AVM", refresh: "1 day", url: "attomdata.com" },
    rentcast: { name: "RentCast", dataset: "Rental Estimates", refresh: "7 days", url: "rentcast.io" },
    walkscore: { name: "Walk Score", dataset: "Walkability / Transit", refresh: "90 days", url: "walkscore.com" },
    greatschools: { name: "GreatSchools", dataset: "School Ratings", refresh: "90 days", url: "greatschools.org" },
  },

  // Calculation formulas (for transparency layer)
  formulas: {
    capRate: { formula: "NOI / Purchase Price", inputs: ["Annual Gross Rent", "Annual Operating Expenses", "Purchase Price"] },
    cashOnCash: { formula: "(Annual Cash Flow) / Total Cash Invested", inputs: ["Annual Net Income after Debt Service", "Down Payment + Closing Costs"] },
    dscr: { formula: "NOI / Annual Debt Service", inputs: ["Net Operating Income", "Annual Mortgage Payments"] },
    monthlyCashFlow: { formula: "Monthly Rent - Mortgage - Expenses", inputs: ["Gross Rent", "Mortgage Payment", "Taxes", "Insurance", "Maintenance", "CapEx", "Vacancy"] },
    mortgagePayment: { formula: "P × [r(1+r)^n] / [(1+r)^n - 1]", inputs: ["Loan Amount (P)", "Monthly Rate (r)", "Total Payments (n)"] },
    irr: { formula: "Discount rate where NPV of all cash flows = 0", inputs: ["Purchase Price", "Annual Cash Flows", "Exit Price", "Hold Period"] },
  },
} as const;
