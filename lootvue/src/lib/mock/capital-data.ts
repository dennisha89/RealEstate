/**
 * Mock capital connection posts for the Marketplace / Capital tab.
 * In production: replace with real posts fetched through data-bridge.ts.
 * Oracle accuracy and totalPredictions are sourced from the oracle-store
 * to give each poster a credibility signal visible to other users.
 * Dates are relative to 2026-03-15 (current date).
 */

import type { CapitalPost } from "@/lib/types/marketplace";

export const MOCK_CAPITAL_POSTS: CapitalPost[] = [
  // 1 — Seeking equity for a 4-unit in Tampa
  {
    id: "cap_mock_1",
    dealRoomId: "dr_mock_2",
    createdAt: "2026-03-09T10:22:11Z",
    postedBy: "Sandra Kim",
    type: "seeking_equity",
    title: "Seeking $104K equity partner for stabilized 4-unit in Tampa, FL",
    description:
      "I have a 4-unit (two 2/1 units, two 1/1 units) under contract in Tampa's Seminole Heights neighborhood at $520,000. All four units are currently tenant-occupied with rents at or slightly below market. I'm bringing $416K in debt financing (DSCR loan at 7.25%) and need a $104K equity co-investor to close. Targeting a 5-year hold with a refinance or sale at exit. Pro forma cash-on-cash is 8.2% in year 1, improving to 11.4% by year 3 as leases roll to market rents. Projecting 15% annualized total return to equity over the hold period. I have 6 prior acquisitions, all performing within 10% of original underwriting.",
    address: "2209 N 15th Street, Tampa, FL 33605",
    market: "Tampa",
    state: "FL",
    dealSize: 520_000,
    equityNeeded: 104_000,
    targetReturn: "15% annualized",
    holdPeriod: "5 years",
    propertyType: "quad",
    oracleAccuracy: 73,
    totalPredictions: 28,
    status: "open",
    inquiryCount: 3,
  },

  // 2 — JV partner for fix-and-flip in Nashville
  {
    id: "cap_mock_2",
    dealRoomId: "dr_mock_4",
    createdAt: "2026-03-06T15:44:30Z",
    postedBy: "Alicia Thornton",
    type: "jv_partner",
    title: "JV partner wanted — fix-and-flip in Nashville, 8-month project, 20% split",
    description:
      "Looking for a capital partner on a cosmetic-to-moderate fix-and-flip in Nashville's Inglewood neighborhood. Purchase price $310,000 with an estimated $55,000 in renovation costs (new kitchen, two full bathroom remodels, fresh paint, landscaping). Comparable sales in the immediate area over the last 60 days range from $430,000–$460,000, giving a conservative ARV of $435,000. I'm contributing $62,000 in equity and drawing on a $303,000 hard money loan for the remaining acquisition and construction funds. Looking for a partner to co-sign or provide liquidity backstop in exchange for a 20% profit split on net proceeds at sale. I have completed 11 flips in the Nashville market since 2021 with an average ROI of 23% and zero failed exits.",
    address: "3348 Gallatin Avenue, Nashville, TN 37216",
    market: "Nashville",
    state: "TN",
    dealSize: 310_000,
    equityNeeded: 62_000,
    targetReturn: "20% of net profit",
    holdPeriod: "8 months",
    propertyType: "sfr",
    oracleAccuracy: 81,
    totalPredictions: 45,
    status: "open",
    inquiryCount: 4,
  },

  // 3 — Offering equity in a 12-unit Columbus portfolio
  {
    id: "cap_mock_3",
    createdAt: "2026-03-13T08:05:44Z",
    postedBy: "Priya Mehta",
    type: "offering_equity",
    title: "Equity stake available — 12-unit Columbus OH portfolio, $240K offered",
    description:
      "I am offering a passive equity position in a 12-unit residential portfolio located across three contiguous streets in Columbus, Ohio's Clintonville and University District neighborhoods. The portfolio was assembled over four years and consists of ten SFRs and two duplexes (14 total rentable units). Current blended occupancy is 92%. Total portfolio acquisition cost was $1.2M; current appraised value is $1.41M per an appraisal completed in January 2026. Existing debt of $720K at a blended rate of 6.8% on two separate DSCR loans. I am offering up to $240K in equity participation to one or two partners seeking stable, cash-flowing passive income in a Midwest market with strong fundamentals. Preferred return of 7% annually before profit splits. Open to discussing preferred equity, LP structures, or co-ownership depending on investor preference.",
    market: "Columbus",
    state: "OH",
    dealSize: 1_200_000,
    equityNeeded: 240_000,
    targetReturn: "7% preferred return + profit share",
    holdPeriod: "5-7 years",
    propertyType: "multifamily",
    oracleAccuracy: 68,
    totalPredictions: 15,
    status: "open",
    inquiryCount: 1,
  },
];
