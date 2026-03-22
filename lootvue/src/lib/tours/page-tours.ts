"use client";

import type { TourStep } from "@/components/shared/GuidedTour";

// ─── Analyze page tour ────────────────────────────────────────────────────────
// Walks users through the deal verdict, key metrics, market signals,
// risk flags, and action buttons on /dashboard/analyze.

export const ANALYZE_TOUR: TourStep[] = [
  {
    target: '[data-tour="verdict"]',
    title: "This is your deal verdict",
    description:
      "BUY means the numbers work. PASS means your money works harder elsewhere. This one number tells you if the deal is worth your time.",
    position: "bottom",
  },
  {
    target: '[data-tour="metrics"]',
    title: "These are the key numbers",
    description:
      "Cap rate, DSCR, and cash flow — the three numbers that determine if you make or lose money each month.",
    position: "bottom",
  },
  {
    target: '[data-tour="signals"]',
    title: "Is the market supporting this deal?",
    description:
      "Green signals mean the local market is growing. Red means it's shrinking. Even a great deal fails in a bad market.",
    position: "left",
  },
  {
    target: '[data-tour="risks"]',
    title: "What could go wrong",
    description:
      "Every deal has risks. Green flags confirm it works. Red flags are deal breakers. Know both before you commit.",
    position: "top",
  },
  {
    target: '[data-tour="action"]',
    title: "Here's what to do next",
    description:
      "Based on everything above, these are your recommended next steps. Click any button to take action.",
    position: "top",
  },
];

// ─── Dashboard home tour ──────────────────────────────────────────────────────
// Orients new users to the rates card, market signal pulse, and the
// primary "Analyze a Deal" entry point on /dashboard.

export const DASHBOARD_TOUR: TourStep[] = [
  {
    target: '[data-tour="rates"]',
    title: "Today's rates",
    description:
      "Mortgage rates change weekly. When they drop, your buying power increases. When they rise, deals get harder.",
    position: "bottom",
  },
  {
    target: '[data-tour="markets"]',
    title: "Market signals",
    description:
      "Green means BUY markets where prices are likely rising. Red means markets to avoid. Click any to explore.",
    position: "bottom",
  },
  {
    target: '[data-tour="action"]',
    title: "Start here",
    description:
      "Click 'Analyze a Deal' to run your first property analysis. It takes 10 seconds.",
    position: "top",
  },
];

// ─── Markets page tour ────────────────────────────────────────────────────────
// Explains the choropleth map, validated signals, and the Discover CTA
// on /dashboard/markets.

export const MARKETS_TOUR: TourStep[] = [
  {
    target: '[data-tour="map"]',
    title: "The market map",
    description:
      "Green states have strong fundamentals. Red states have weak signals. Click any state to see the details.",
    position: "bottom",
  },
  {
    target: '[data-tour="signals"]',
    title: "Signal proof",
    description:
      "These are the 5 validated signals that predict price changes. Each has been backtested against 20 years of data.",
    position: "left",
  },
  {
    target: '[data-tour="action"]',
    title: "Find properties",
    description:
      "Found a good market? Click here to find properties in it.",
    position: "top",
  },
];

// ─── Simulator page tour ──────────────────────────────────────────────────────
// Walks users through the live verdict, assumption sliders, and
// scenario comparison on /dashboard/simulator.

export const SIMULATOR_TOUR: TourStep[] = [
  {
    target: '[data-tour="verdict"]',
    title: "Does this deal work?",
    description:
      "This verdict updates live as you move the sliders. Green means the deal is profitable. Red means it isn't.",
    position: "bottom",
  },
  {
    target: '[data-tour="sliders"]',
    title: "Adjust your assumptions",
    description:
      "Change the price, rate, or rent to see how it affects your returns. Every number updates instantly.",
    position: "right",
  },
  {
    target: '[data-tour="scenarios"]',
    title: "What if things go wrong?",
    description:
      "Bull case means everything goes right. Bear case means everything goes wrong. Base is the most likely outcome. Know all three before committing.",
    position: "top",
  },
];

// ─── Discover page tour ───────────────────────────────────────────────────────
// Introduces the map/list split, buy box filters, and instant screening
// on /dashboard/discover.

export const DISCOVER_TOUR: TourStep[] = [
  {
    target: '[data-tour="map"]',
    title: "Properties on the map",
    description:
      "Each dot is a property. Green dots pass your buy box. Red dots fail it. Click any dot to see the numbers.",
    position: "bottom",
  },
  {
    target: '[data-tour="filters"]',
    title: "Set your buy box",
    description:
      "Your buy box is the criteria a deal must meet before you even look at it. Set it once, and LootVue filters everything automatically.",
    position: "right",
  },
  {
    target: '[data-tour="action"]',
    title: "Analyze a property",
    description:
      "Click any property card, then hit 'Analyze' to get a full 10-second verdict.",
    position: "top",
  },
];

// ─── Pipeline page tour ───────────────────────────────────────────────────────
// Explains the Kanban board, side panel comparison, and deal journal
// on /dashboard/pipeline.

export const PIPELINE_TOUR: TourStep[] = [
  {
    target: '[data-tour="kanban"]',
    title: "Your deal pipeline",
    description:
      "Every deal you track lives here. Drag cards left to right as a deal moves from 'Discovered' to 'Closed'.",
    position: "bottom",
  },
  {
    target: '[data-tour="comparison"]',
    title: "Compare deals side by side",
    description:
      "Select up to 5 deals and compare their numbers instantly. No spreadsheet needed.",
    position: "left",
  },
  {
    target: '[data-tour="journal"]',
    title: "Your decision log",
    description:
      "Every note, call, and decision you make on a deal is saved here. Future you will thank present you.",
    position: "top",
  },
];
