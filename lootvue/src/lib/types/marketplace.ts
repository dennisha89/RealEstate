import type { AnalysisResult } from "@/app/dashboard/analyze/_components";

// ─── Deal Room ──────────────────────────────────────────────────────────────

export interface DealRoomComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface DealRoomScenario {
  id: string;
  label: string;
  description: string;
  overrides: {
    purchasePrice?: number;
    downPct?: number;
    rate?: number;
    monthlyRent?: number;
  };
  createdAt: string;
}

export interface DealRoomInterest {
  id: string;
  name: string;
  role: "buyer" | "partner" | "lender" | "observer";
  message?: string;
  createdAt: string;
}

export interface DealRoom {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Frozen snapshot of the analysis
  analysis: AnalysisResult;

  // Collaboration
  comments: DealRoomComment[];
  scenarios: DealRoomScenario[];
  interests: DealRoomInterest[];

  // Metadata
  title: string;
  status: "active" | "closed" | "archived";
  viewCount: number;
}

// ─── Exchange ───────────────────────────────────────────────────────────────

export interface ExchangeListing {
  id: string;
  dealRoomId: string;
  createdAt: string;
  listedBy: string;

  // Listing info
  address: string;
  market: string;
  state: string;
  askingPrice: number;
  propertyType: string;
  listingType: "wholesale" | "assignment" | "off_market" | "pocket";

  // Key metrics from analysis snapshot
  score: number;
  verdict: "BUY" | "PASS";
  capRate: number;
  monthlyCashFlow: number;
  cashOnCash: number;
  dscr: number;

  // Seller context
  whyPassing: string;
  sellerNotes?: string;

  // State
  status: "active" | "pending" | "sold" | "withdrawn";
  interestedCount: number;
  viewCount: number;
}

export interface ExchangeMatch {
  listingId: string;
  matchScore: number;
  matchedCriteria: string[];
  failedCriteria: string[];
}

// ─── Capital ────────────────────────────────────────────────────────────────

export interface CapitalPost {
  id: string;
  dealRoomId?: string;
  createdAt: string;
  postedBy: string;

  // What they're looking for
  type: "seeking_equity" | "offering_equity" | "seeking_debt" | "jv_partner";
  title: string;
  description: string;

  // Deal details
  address?: string;
  market: string;
  state: string;
  dealSize: number;
  equityNeeded?: number;
  targetReturn?: string;
  holdPeriod?: string;
  propertyType: string;

  // Reputation signal (from oracle store)
  oracleAccuracy?: number;
  totalPredictions?: number;

  // State
  status: "open" | "in_discussion" | "funded" | "closed";
  inquiryCount: number;
}

export interface CapitalInquiry {
  id: string;
  postId: string;
  from: string;
  message: string;
  createdAt: string;
}

// ─── Lending ────────────────────────────────────────────────────────────────

export interface LenderProfile {
  id: string;
  name: string;
  type: "conventional" | "dscr" | "hard_money" | "portfolio" | "bridge" | "fha" | "va" | "usda";
  logo?: string;

  // Loan parameters
  minLoan: number;
  maxLoan: number;
  minDown: number;
  rateRange: { min: number; max: number };
  termOptions: string[];
  closingDays: number;

  // Requirements
  minDSCR?: number;
  minCreditScore?: number;
  maxLTV: number;
  propertyTypes: string[];
  states: string[];

  // Features
  features: string[];
  description: string;

  // Track record
  avgCloseTime: number;
  rating: number;
  reviewCount: number;
}

export interface LenderMatch {
  lender: LenderProfile;
  matchScore: number;
  estimatedRate: number;
  estimatedPayment: number;
  meetsCriteria: string[];
  warnings: string[];
}

export interface LenderLead {
  id: string;
  lenderId: string;
  dealRoomId?: string;
  createdAt: string;

  // Borrower info (from analysis)
  loanAmount: number;
  propertyAddress: string;
  propertyType: string;
  purchasePrice: number;
  downPayment: number;

  // State
  status: "submitted" | "reviewing" | "pre_approved" | "declined" | "closed";
}
