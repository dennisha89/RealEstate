/**
 * Mock exchange listings for the Marketplace / Exchange tab.
 * In production: replace with real listings fetched through data-bridge.ts.
 * All listings represent PASS deals shared by investors offloading them to the community.
 * Dates are relative to 2026-03-15 (current date).
 */

import type { ExchangeListing } from "@/lib/types/marketplace";

export const MOCK_EXCHANGE_LISTINGS: ExchangeListing[] = [
  // 1 — Austin TX, SFR, wholesale, 14 days ago
  {
    id: "ex_mock_1",
    dealRoomId: "dr_mock_1",
    createdAt: "2026-03-01T09:14:22Z",
    listedBy: "Marcus Webb",
    address: "4712 Rundberg Lane, Austin, TX 78758",
    market: "Austin",
    state: "TX",
    askingPrice: 348_000,
    propertyType: "sfr",
    listingType: "wholesale",
    score: 52,
    verdict: "PASS",
    capRate: 4.1,
    monthlyCashFlow: -87,
    cashOnCash: 2.3,
    dscr: 0.91,
    whyPassing:
      "Doesn't meet my 7% cap rate threshold — at current rates the numbers just aren't there.",
    sellerNotes:
      "3/2, 1,480 sqft, 1988 build. Roof replaced 2022. Good bones but priced for the Austin premium. Assign at asking or OBO.",
    status: "active",
    interestedCount: 4,
    viewCount: 38,
  },

  // 2 — Tampa FL, duplex, assignment, 7 days ago
  {
    id: "ex_mock_2",
    dealRoomId: "dr_mock_2",
    createdAt: "2026-03-08T14:32:05Z",
    listedBy: "Sandra Kim",
    address: "2209 N 15th Street, Tampa, FL 33605",
    market: "Tampa",
    state: "FL",
    askingPrice: 279_000,
    propertyType: "duplex",
    listingType: "assignment",
    score: 61,
    verdict: "PASS",
    capRate: 5.8,
    monthlyCashFlow: 118,
    cashOnCash: 5.1,
    dscr: 1.09,
    whyPassing:
      "Insurance costs make the deal marginal — flood zone AE, quotes came in $4,200/yr which killed my projected returns.",
    sellerNotes:
      "Both units tenant-occupied, $1,350 + $1,250/mo. Unit A lease expires June 2026, Unit B month-to-month. Assignment fee $8k. Call before making offer.",
    status: "active",
    interestedCount: 3,
    viewCount: 27,
  },

  // 3 — Raleigh NC, SFR, off_market, 3 days ago
  {
    id: "ex_mock_3",
    dealRoomId: "dr_mock_3",
    createdAt: "2026-03-12T11:07:48Z",
    listedBy: "Devon Price",
    address: "817 Sunnybrook Road, Raleigh, NC 27610",
    market: "Raleigh",
    state: "NC",
    askingPrice: 315_000,
    propertyType: "sfr",
    listingType: "off_market",
    score: 58,
    verdict: "PASS",
    capRate: 5.2,
    monthlyCashFlow: -42,
    cashOnCash: 3.7,
    dscr: 0.97,
    whyPassing:
      "Cash flow doesn't cover debt service at current rates — I underwrote this at 6.5% and now quotes are 7.25%+.",
    sellerNotes:
      "Off-market from estate sale. Executor wants 45-day close. Minimal deferred maintenance, just cosmetic. No lockbox — showing by appointment only.",
    status: "active",
    interestedCount: 2,
    viewCount: 19,
  },

  // 4 — Nashville TN, SFR, pocket, 10 days ago
  {
    id: "ex_mock_4",
    dealRoomId: "dr_mock_4",
    createdAt: "2026-03-05T16:55:33Z",
    listedBy: "Alicia Thornton",
    address: "3348 Gallatin Avenue, Nashville, TN 37216",
    market: "Nashville",
    state: "TN",
    askingPrice: 422_000,
    propertyType: "sfr",
    listingType: "pocket",
    score: 47,
    verdict: "PASS",
    capRate: 3.9,
    monthlyCashFlow: -194,
    cashOnCash: 2.1,
    dscr: 0.84,
    whyPassing:
      "Too much deferred maintenance — inspection flagged the HVAC (original 2001), electrical panel, and foundation crack in the crawl space.",
    sellerNotes:
      "Seller motivated after pulling from MLS. Priced to reflect deferred maintenance. Contractor estimate for all repairs approx $28-35k. Pocket price is below their failed MLS list.",
    status: "active",
    interestedCount: 1,
    viewCount: 12,
  },

  // 5 — Phoenix AZ, SFR, wholesale, 5 days ago
  {
    id: "ex_mock_5",
    dealRoomId: "dr_mock_5",
    createdAt: "2026-03-10T08:20:17Z",
    listedBy: "Ray Gutierrez",
    address: "11924 W McDowell Road, Phoenix, AZ 85035",
    market: "Phoenix",
    state: "AZ",
    askingPrice: 248_000,
    propertyType: "sfr",
    listingType: "wholesale",
    score: 54,
    verdict: "PASS",
    capRate: 5.5,
    monthlyCashFlow: 62,
    cashOnCash: 4.4,
    dscr: 1.03,
    whyPassing:
      "Market is cooling — Phoenix saw 3.2 months inventory in Feb, I prefer to wait for better buying conditions in Q3.",
    sellerNotes:
      "3/2, 1,220 sqft. Tenant paying $1,550/mo, lease through Nov 2026. Minimal repairs needed. Wholesale, assign only, no daisy chains.",
    status: "active",
    interestedCount: 5,
    viewCount: 34,
  },

  // 6 — Columbus OH, duplex, off_market, 1 day ago
  {
    id: "ex_mock_6",
    dealRoomId: "dr_mock_6",
    createdAt: "2026-03-14T13:45:59Z",
    listedBy: "Priya Mehta",
    address: "1607 Cleveland Avenue, Columbus, OH 43211",
    market: "Columbus",
    state: "OH",
    askingPrice: 198_000,
    propertyType: "duplex",
    listingType: "off_market",
    score: 63,
    verdict: "PASS",
    capRate: 6.7,
    monthlyCashFlow: 234,
    cashOnCash: 7.8,
    dscr: 1.26,
    whyPassing:
      "Doesn't fit my buy box — too far from employment centers. At 11 miles from downtown, I can't underwrite strong rent growth here.",
    sellerNotes:
      "Both units vacant, fresh paint and carpet. Unit A: 2bed/1ba. Unit B: 1bed/1ba. ARV comps support $215-225k. Quick close preferred, cash or hard money.",
    status: "active",
    interestedCount: 2,
    viewCount: 9,
  },
];
