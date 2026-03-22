// Sample data used across all screens
// Replace with real API calls in production

export const portfolio = {
  totalValue: 1_240_000,
  monthlyCashFlow: 3_450,
  totalEquity: 380_000,
  cashFlowTrend: 'up' as const,
  valueTrend: 'up' as const,
  equityTrend: 'up' as const,
  dealCount: 4,
  irr: 14.2,
  valueChangePct: 8.2,
};

export const pipelineDeals = [
  {
    id: '1',
    address: '123 Main St',
    city: 'Austin, TX',
    stage: 'Analyzing',
    daysInStage: 3,
    avgDaysInStage: 11,
    cashFlowMonthly: 640,
    score: 81,
    verdict: 'BUY' as const,
    purchasePrice: 385_000,
    downPayment: 77_000,
    monthlyRent: 2_200,
    capRate: 6.8,
    dscr: 1.32,
  },
  {
    id: '2',
    address: '47 Oak Ave',
    city: 'Phoenix, AZ',
    stage: 'Discovered',
    daysInStage: 1,
    avgDaysInStage: 11,
    cashFlowMonthly: 420,
    score: 68,
    verdict: 'HOLD' as const,
    purchasePrice: 295_000,
    downPayment: 59_000,
    monthlyRent: 1_800,
    capRate: 5.9,
    dscr: 1.18,
  },
  {
    id: '3',
    address: '891 Elm Blvd',
    city: 'Tampa, FL',
    stage: 'Offer',
    daysInStage: 7,
    avgDaysInStage: 11,
    cashFlowMonthly: 880,
    score: 91,
    verdict: 'BUY' as const,
    purchasePrice: 410_000,
    downPayment: 82_000,
    monthlyRent: 2_600,
    capRate: 7.6,
    dscr: 1.54,
  },
  {
    id: '4',
    address: '204 Pine Ct',
    city: 'Nashville, TN',
    stage: 'Contract',
    daysInStage: 12,
    avgDaysInStage: 11,
    cashFlowMonthly: 310,
    score: 74,
    verdict: 'HOLD' as const,
    purchasePrice: 520_000,
    downPayment: 104_000,
    monthlyRent: 3_100,
    capRate: 5.1,
    dscr: 1.09,
  },
  {
    id: '5',
    address: '77 Willow Way',
    city: 'Denver, CO',
    stage: 'Discovered',
    daysInStage: 2,
    avgDaysInStage: 11,
    cashFlowMonthly: -120,
    score: 42,
    verdict: 'PASS' as const,
    purchasePrice: 650_000,
    downPayment: 130_000,
    monthlyRent: 2_900,
    capRate: 3.8,
    dscr: 0.96,
  },
];

export const markets = [
  {
    id: 'austin-tx',
    name: 'Austin',
    state: 'TX',
    score: 88,
    verdict: 'BUY' as const,
    convergence: 4,
    maxConvergence: 5,
    monthsSupply: 1.8,
    permitGrowth: 22.4,
    hpiMomentum: 8.3,
    employmentGrowth: 3.1,
    yoyPct: 8.3,
    prevSignalCount: 3,
  },
  {
    id: 'tampa-fl',
    name: 'Tampa',
    state: 'FL',
    score: 83,
    verdict: 'BUY' as const,
    convergence: 4,
    maxConvergence: 5,
    monthsSupply: 2.1,
    permitGrowth: 18.7,
    hpiMomentum: 6.9,
    employmentGrowth: 2.8,
    yoyPct: 6.9,
    prevSignalCount: 3,
  },
  {
    id: 'phoenix-az',
    name: 'Phoenix',
    state: 'AZ',
    score: 77,
    verdict: 'BUY' as const,
    convergence: 3,
    maxConvergence: 5,
    monthsSupply: 2.6,
    permitGrowth: 14.2,
    hpiMomentum: 5.1,
    employmentGrowth: 2.4,
    yoyPct: 5.1,
    prevSignalCount: 2,
  },
  {
    id: 'nashville-tn',
    name: 'Nashville',
    state: 'TN',
    score: 71,
    verdict: 'HOLD' as const,
    convergence: 3,
    maxConvergence: 5,
    monthsSupply: 3.2,
    permitGrowth: 9.8,
    hpiMomentum: 3.4,
    employmentGrowth: 2.1,
    yoyPct: 3.4,
    prevSignalCount: 3,
  },
  {
    id: 'denver-co',
    name: 'Denver',
    state: 'CO',
    score: 54,
    verdict: 'HOLD' as const,
    convergence: 2,
    maxConvergence: 5,
    monthsSupply: 4.1,
    permitGrowth: 4.2,
    hpiMomentum: 1.1,
    employmentGrowth: 1.6,
    yoyPct: 1.1,
    prevSignalCount: 3,
  },
  {
    id: 'chicago-il',
    name: 'Chicago',
    state: 'IL',
    score: 38,
    verdict: 'PASS' as const,
    convergence: 1,
    maxConvergence: 5,
    monthsSupply: 5.8,
    permitGrowth: -2.1,
    hpiMomentum: -1.4,
    employmentGrowth: 0.4,
    yoyPct: -1.4,
    prevSignalCount: 2,
  },
];

export const trendingAddresses = [
  { address: '1402 S Congress Ave', city: 'Austin, TX', score: 84, capRate: 7.1 },
  { address: '3318 Bayshore Blvd', city: 'Tampa, FL', score: 79, capRate: 6.4 },
  { address: '901 N 4th Ave', city: 'Phoenix, AZ', score: 72, capRate: 5.9 },
];

export const rates = {
  thirtyYear: 6.85,
  fifteenYear: 6.12,
  fiveOneArm: 6.01,
  direction: 'up' as const,
  changeBps: 11,
  context: 'Fed held rates. 30yr up 11bps this week — still below 7% ceiling.',
  asOf: '2026-03-22',
  // sparkline data (last 12 weeks, relative bps from current)
  sparkline: [6.62, 6.58, 6.71, 6.69, 6.74, 6.80, 6.77, 6.72, 6.78, 6.81, 6.74, 6.85],
};

export const userLevel = {
  level: 7,
  levelName: 'Portfolio Builder',
  xp: 3_240,
  xpToNext: 5_000,
  streak: 12,
  totalDealsAnalyzed: 34,
};

export const kanbanColumns = ['Discovered', 'Analyzing', 'Offer', 'Contract', 'Closed'] as const;
export type KanbanStage = (typeof kanbanColumns)[number];
export type Verdict = 'BUY' | 'HOLD' | 'PASS';

// -------------------------------------------------------
// Feed data
// -------------------------------------------------------

export type FeedCardType =
  | 'rate_alert'
  | 'deal_match'
  | 'pipeline_alert'
  | 'market_shift'
  | 'achievement'
  | 'ai_insight'
  | 'portfolio_update';

export interface FeedCard {
  id: string;
  type: FeedCardType;
  timestamp: Date;
  data: Record<string, unknown>;
  read: boolean;
  actionable: boolean;
}

const now = new Date('2026-03-22T09:00:00');
function minsAgo(m: number): Date {
  return new Date(now.getTime() - m * 60 * 1000);
}
function hoursAgo(h: number): Date {
  return new Date(now.getTime() - h * 60 * 60 * 1000);
}
function daysAgo(d: number): Date {
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
}

export const feedCards: FeedCard[] = [
  {
    id: 'feed-1',
    type: 'ai_insight',
    timestamp: minsAgo(4),
    read: false,
    actionable: true,
    data: {
      insight:
        'Austin inventory dropped to 1.8 months — historically this precedes a 6–9% price surge within 90 days. Your pipeline deal at 123 Main St looks even better this morning.',
      cta: 'Review 123 Main St',
      dealId: '1',
      confidencePct: 82,
    },
  },
  {
    id: 'feed-2',
    type: 'rate_alert',
    timestamp: minsAgo(18),
    read: false,
    actionable: true,
    data: {
      rate30yr: 6.85,
      prevRate30yr: 6.74,
      changeBps: 11,
      direction: 'up',
      impactDeal: '891 Elm Blvd, Tampa FL',
      impactCFDelta: -38,
      sparkline: rates.sparkline,
    },
  },
  {
    id: 'feed-3',
    type: 'deal_match',
    timestamp: hoursAgo(2),
    read: false,
    actionable: true,
    data: {
      address: '2204 Riverside Dr',
      city: 'Austin, TX',
      score: 86,
      verdict: 'BUY',
      cashFlowMonthly: 720,
      capRate: 7.2,
      purchasePrice: 395_000,
      monthlyRent: 2_375,
      dscr: 1.41,
      matchReason: 'Matches your Austin buy box: score 86, CF $720/mo',
    },
  },
  {
    id: 'feed-4',
    type: 'pipeline_alert',
    timestamp: hoursAgo(3),
    read: false,
    actionable: true,
    data: {
      dealId: '4',
      address: '204 Pine Ct',
      city: 'Nashville, TN',
      stage: 'Contract',
      daysInStage: 12,
      avgDaysInStage: 11,
      urgency: 'Contract expires in 3 days. Inspection deadline tomorrow.',
      action: 'Advance to Closed',
    },
  },
  {
    id: 'feed-5',
    type: 'market_shift',
    timestamp: hoursAgo(6),
    read: false,
    actionable: true,
    data: {
      market: 'Tampa, FL',
      state: 'FL',
      oldSignalCount: 3,
      newSignalCount: 4,
      score: 83,
      verdict: 'BUY',
      explanation:
        'Tampa permits surged 18.7% YoY. A 4th signal just confirmed — builders are betting their capital on this market.',
    },
  },
  {
    id: 'feed-6',
    type: 'deal_match',
    timestamp: hoursAgo(8),
    read: true,
    actionable: true,
    data: {
      address: '5510 Bayshore Dr',
      city: 'Tampa, FL',
      score: 79,
      verdict: 'BUY',
      cashFlowMonthly: 540,
      capRate: 6.4,
      purchasePrice: 340_000,
      monthlyRent: 2_100,
      dscr: 1.28,
      matchReason: 'Matches Tampa buy box: cap rate 6.4%, positive cash flow',
    },
  },
  {
    id: 'feed-7',
    type: 'achievement',
    timestamp: daysAgo(1),
    read: true,
    actionable: false,
    data: {
      emoji: '🏆',
      name: 'Deal Analyst',
      description: 'Analyzed 10+ deals this month',
      xpGained: 500,
      newLevel: null,
      totalXP: 3_240,
      xpToNext: 5_000,
    },
  },
  {
    id: 'feed-8',
    type: 'portfolio_update',
    timestamp: daysAgo(1),
    read: true,
    actionable: false,
    data: {
      valueChange: 18_600,
      valueChangePct: 1.5,
      cashFlowChange: 85,
      newTotalValue: 1_240_000,
      newMonthlyCF: 3_450,
      driver: 'Austin HPI +0.8% this month lifted 123 Main St estimated value.',
    },
  },
  {
    id: 'feed-9',
    type: 'rate_alert',
    timestamp: daysAgo(2),
    read: true,
    actionable: false,
    data: {
      rate30yr: 6.74,
      prevRate30yr: 6.81,
      changeBps: -7,
      direction: 'down',
      impactDeal: '123 Main St, Austin TX',
      impactCFDelta: 24,
      sparkline: [6.62, 6.58, 6.71, 6.69, 6.74, 6.80, 6.77, 6.72, 6.78, 6.81, 6.74, 6.74],
    },
  },
  {
    id: 'feed-10',
    type: 'ai_insight',
    timestamp: daysAgo(2),
    read: true,
    actionable: false,
    data: {
      insight:
        'Chicago inventory hit 5.8 months — 6th straight month of expansion. Institutional money is leaving. This is where retail investors get left holding the bag.',
      cta: 'See Chicago analysis',
      dealId: null,
      confidencePct: 91,
    },
  },
];
