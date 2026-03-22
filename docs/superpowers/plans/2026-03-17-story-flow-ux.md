# Story Flow UX System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure every LootVue page from "dashboard with simultaneous widgets" to "narrative story flow" — verdict first, evidence on demand, clear next actions — backed by UX research showing 26% abandonment reduction (Baymard), 2.3x adoption increase (ThoughtSpot), and better decisions with fewer options (800K record 401(k) study).

**Architecture:** Three shared components (`StoryFlow`, `StoryChapter`, `StoryAction`) provide the page-level narrative structure. Each page is restructured to flow top-to-bottom: verdict → evidence → risks → action. Advanced features hide behind `[Advanced ▸]` expanders (progressive disclosure). AI narrator introduces each chapter. Existing content is reorganized, not rewritten.

**Tech Stack:** React 18, Next.js 14, TypeScript, motion (Framer Motion v11), Tailwind CSS, existing `CHART_COLORS`, `Term`, `AiInsightStrip` components.

---

## File Structure

### New files (3 shared components):
- `lootvue/src/components/shared/StoryFlow.tsx` — page-level wrapper with sticky step indicator, scroll tracking, chapter transitions
- `lootvue/src/components/shared/StoryChapter.tsx` — numbered section with AI intro, flow connector, deep-dive expander
- `lootvue/src/components/shared/StoryAction.tsx` — directional action buttons with next-step guidance

### Modified files (7 pages):
- `lootvue/src/app/dashboard/page.tsx` — wrap in StoryFlow: What Changed → Your Portfolio → Market Pulse → What's Next
- `lootvue/src/app/dashboard/analyze/page.tsx` — wrap in StoryFlow: Verdict → Evidence → Risks → Your Move. Hide tabs 4-10 behind Advanced expander.
- `lootvue/src/app/dashboard/markets/page.tsx` — wrap in StoryFlow: Market Signal → Where to Look → Evidence → Compare → Find Deals
- `lootvue/src/app/dashboard/discover/page.tsx` — wrap in StoryFlow: AI Picks → Market Context → Browse Deals → Deep Dive
- `lootvue/src/app/dashboard/pipeline/page.tsx` — wrap in StoryFlow: Portfolio Health → Active Deals → Next Steps
- `lootvue/src/app/dashboard/simulator/page.tsx` — wrap in StoryFlow: Does This Work? → Scenarios → Risks → Mortgage → Decision. Hide 24 advanced tools behind expander.
- `lootvue/src/app/dashboard/rates/page.tsx` — wrap in StoryFlow: Today's Rate → Your Move → Deep Dive → Forecast

### Existing files leveraged (not modified):
- `lootvue/src/components/shared/GuidedSteps.tsx` — already has horizontal step indicator, reused inside StoryFlow
- `lootvue/src/components/shared/Term.tsx` — already on all pages
- `lootvue/src/components/shared/AiInsightStrip.tsx` — used for AI narrator lines

---

## Chunk 1: Shared Components

### Task 1: StoryFlow Component

**Files:**
- Create: `lootvue/src/components/shared/StoryFlow.tsx`

This is the page-level wrapper. It renders a sticky step indicator at the top, tracks which chapter is in view via IntersectionObserver, and provides context to child StoryChapter components.

- [ ] **Step 1: Create StoryFlow component**

```tsx
// lootvue/src/components/shared/StoryFlow.tsx
"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion } from "motion/react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";

// ─── Context ──────────────────────────────────────────────────────────────────

interface StoryFlowContextValue {
  activeChapter: number;
  totalChapters: number;
  registerChapter: (index: number, ref: HTMLDivElement) => void;
  scrollToChapter: (index: number) => void;
}

const StoryFlowContext = createContext<StoryFlowContextValue>({
  activeChapter: 0,
  totalChapters: 0,
  registerChapter: () => {},
  scrollToChapter: () => {},
});

export const useStoryFlow = () => useContext(StoryFlowContext);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryStep {
  label: string;
  id: string;
}

interface StoryFlowProps {
  steps: StoryStep[];
  children: ReactNode;
  /** Optional AI narrator line at the very top */
  narrator?: string;
  /** Show "Skip to action" button for power users */
  showSkip?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StoryFlow({ steps, children, narrator, showSkip = true, className = "" }: StoryFlowProps) {
  const [activeChapter, setActiveChapter] = useState(0);
  const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Register chapter refs from children
  const registerChapter = useCallback((index: number, ref: HTMLDivElement) => {
    chapterRefs.current.set(index, ref);
  }, []);

  // Scroll to a specific chapter
  const scrollToChapter = useCallback((index: number) => {
    const el = chapterRefs.current.get(index);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveChapter(index);
    }
  }, []);

  // IntersectionObserver to track which chapter is in view
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-story-index"));
            if (!isNaN(index)) setActiveChapter(index);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.1 }
    );

    // Observe all registered chapters
    for (const [, el] of chapterRefs.current) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  // Re-observe when chapters register (delayed to allow children to mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!observerRef.current) return;
      observerRef.current.disconnect();
      for (const [, el] of chapterRefs.current) {
        observerRef.current.observe(el);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [steps.length]);

  const contextValue: StoryFlowContextValue = {
    activeChapter,
    totalChapters: steps.length,
    registerChapter,
    scrollToChapter,
  };

  return (
    <StoryFlowContext.Provider value={contextValue}>
      <div className={`relative ${className}`}>
        {/* ── Sticky Step Indicator ──────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-surface-border px-4 py-2">
          <nav
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
            aria-label="Story flow navigation"
          >
            {steps.map((step, i) => {
              const isActive = activeChapter === i;
              const isPast = activeChapter > i;
              return (
                <button
                  key={step.id}
                  onClick={() => scrollToChapter(i)}
                  className="flex items-center gap-1.5 shrink-0 group transition-all duration-200"
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${step.label} — step ${i + 1} of ${steps.length}`}
                >
                  {/* Step number */}
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? CHART_COLORS.gold : isPast ? `${CHART_COLORS.emerald}20` : "rgba(255,255,255,0.05)",
                      color: isActive ? "#000" : isPast ? CHART_COLORS.emerald : "#666",
                      border: isActive ? "none" : `1px solid ${isPast ? `${CHART_COLORS.emerald}30` : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {isPast ? "✓" : i + 1}
                  </span>
                  {/* Label */}
                  <span
                    className="text-[11px] font-medium transition-colors duration-200 whitespace-nowrap"
                    style={{ color: isActive ? CHART_COLORS.gold : isPast ? "#999" : "#555" }}
                  >
                    {step.label}
                  </span>
                  {/* Connector */}
                  {i < steps.length - 1 && (
                    <span
                      className="w-4 h-px mx-0.5 shrink-0"
                      style={{ backgroundColor: isPast ? `${CHART_COLORS.emerald}40` : "rgba(255,255,255,0.06)" }}
                    />
                  )}
                </button>
              );
            })}

            {/* Skip to action button for power users */}
            {showSkip && steps.length > 2 && (
              <button
                onClick={() => scrollToChapter(steps.length - 1)}
                className="ml-auto shrink-0 text-[10px] text-content-disabled hover:text-gold transition-colors px-2 py-1 rounded"
              >
                Skip to action →
              </button>
            )}
          </nav>
        </div>

        {/* ── AI Narrator (optional) ──────────────────────────── */}
        {narrator && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2.5 border-b border-gold/10 bg-gold/[0.03]"
          >
            <p className="text-[12px] text-content-secondary leading-relaxed">
              <span className="text-gold font-semibold mr-1.5">AI:</span>
              {narrator}
            </p>
          </motion.div>
        )}

        {/* ── Chapters ────────────────────────────────────────── */}
        <div className="px-4 py-4 space-y-6">
          {children}
        </div>
      </div>
    </StoryFlowContext.Provider>
  );
}
```

- [ ] **Step 2: Verify file created and has no syntax errors**

Run: `cd lootvue && npx tsc --noEmit src/components/shared/StoryFlow.tsx 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add lootvue/src/components/shared/StoryFlow.tsx
git commit -m "feat: add StoryFlow component — sticky step indicator with scroll tracking"
```

---

### Task 2: StoryChapter Component

**Files:**
- Create: `lootvue/src/components/shared/StoryChapter.tsx`

Each numbered section within a StoryFlow. Handles: chapter registration, AI intro line, flow arrow connector, progressive disclosure expander.

- [ ] **Step 1: Create StoryChapter component**

```tsx
// lootvue/src/components/shared/StoryChapter.tsx
"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useStoryFlow } from "./StoryFlow";
import { CHART_COLORS } from "@/components/charts/ChartTheme";

interface StoryChapterProps {
  /** Chapter index (0-based, must match StoryFlow steps order) */
  index: number;
  /** AI narrator line introducing this chapter */
  aiIntro?: string;
  /** Content always visible */
  children: ReactNode;
  /** Content hidden behind "Advanced" expander */
  advanced?: ReactNode;
  /** Label for the expander button */
  advancedLabel?: string;
  /** Show flow arrow connector to next chapter */
  showConnector?: boolean;
  className?: string;
}

export function StoryChapter({
  index,
  aiIntro,
  children,
  advanced,
  advancedLabel = "Advanced analysis",
  showConnector = true,
  className = "",
}: StoryChapterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerChapter, activeChapter } = useStoryFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isActive = activeChapter === index;

  // Register this chapter's DOM ref with the parent StoryFlow
  useEffect(() => {
    if (ref.current) {
      registerChapter(index, ref.current);
    }
  }, [index, registerChapter]);

  return (
    <motion.div
      ref={ref}
      data-story-index={index}
      initial={{ opacity: 0.4 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, margin: "-10% 0px -30% 0px" }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
      aria-label={`Story chapter ${index + 1}`}
    >
      {/* ── AI Intro Line ──────────────────────────────────── */}
      {aiIntro && (
        <div className="flex items-start gap-2 mb-3">
          <span
            className="shrink-0 w-1 h-1 rounded-full mt-1.5"
            style={{ backgroundColor: isActive ? CHART_COLORS.gold : "#333" }}
          />
          <p className="text-[11px] text-content-tertiary leading-relaxed italic">
            {aiIntro}
          </p>
        </div>
      )}

      {/* ── Chapter Content ────────────────────────────────── */}
      <div>{children}</div>

      {/* ── Progressive Disclosure Expander ─────────────────── */}
      {advanced && (
        <div className="mt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[11px] text-content-disabled hover:text-content-tertiary transition-colors group"
            aria-expanded={showAdvanced}
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            <span>{showAdvanced ? "Hide" : "Show"} {advancedLabel}</span>
            <span className="text-[9px] text-content-disabled group-hover:text-content-tertiary">
              ({advancedLabel.toLowerCase().includes("tab") ? "more detailed views" : "for experienced investors"})
            </span>
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 overflow-hidden"
            >
              {advanced}
            </motion.div>
          )}
        </div>
      )}

      {/* ── Flow Connector Arrow ────────────────────────────── */}
      {showConnector && (
        <div className="flex justify-center py-3" aria-hidden="true">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-4" style={{ backgroundColor: isActive ? `${CHART_COLORS.gold}40` : "rgba(255,255,255,0.06)" }} />
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: `4px solid ${isActive ? `${CHART_COLORS.gold}60` : "rgba(255,255,255,0.08)"}`,
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lootvue/src/components/shared/StoryChapter.tsx
git commit -m "feat: add StoryChapter — numbered section with AI intro and progressive disclosure"
```

---

### Task 3: StoryAction Component

**Files:**
- Create: `lootvue/src/components/shared/StoryAction.tsx`

The "Your Move" section at the end of every story flow. Shows directional action buttons with next-step guidance.

- [ ] **Step 1: Create StoryAction component**

```tsx
// lootvue/src/components/shared/StoryAction.tsx
"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";

interface ActionItem {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
}

interface StoryActionProps {
  /** Verdict line: "Based on everything above:" */
  intro?: string;
  /** Bullet-point recommendations */
  recommendations?: string[];
  /** Action buttons */
  actions: ActionItem[];
  className?: string;
}

export function StoryAction({ intro, recommendations, actions, className = "" }: StoryActionProps) {
  return (
    <div
      className={`rounded-xl border border-gold/15 bg-gold/[0.03] p-4 ${className}`}
      role="region"
      aria-label="Recommended next actions"
    >
      {intro && (
        <p className="text-[12px] text-gold font-semibold mb-2">{intro}</p>
      )}

      {recommendations && recommendations.length > 0 && (
        <ul className="space-y-1.5 mb-4">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-content-secondary leading-relaxed">
              <span className="text-gold mt-0.5 shrink-0">→</span>
              {rec}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const baseClass = "flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg transition-all";
          const variantClass =
            action.variant === "primary"
              ? "bg-gold text-black hover:bg-gold-light"
              : action.variant === "secondary"
                ? "border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold"
                : "text-content-tertiary hover:text-content-secondary";

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`${baseClass} ${variantClass}`}
            >
              {action.icon}
              {action.label}
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lootvue/src/components/shared/StoryAction.tsx
git commit -m "feat: add StoryAction — directional action buttons with next-step guidance"
```

---

## Chunk 2: Apply StoryFlow to Analyze Page (Proof of Concept)

The Analyze page is the most complex (1503 lines, 10 tabs, 4 playbooks, 8 deal intelligence components). This is the hardest test of the system.

### Task 4: Restructure Analyze Page

**Files:**
- Modify: `lootvue/src/app/dashboard/analyze/page.tsx`

**Current structure:** Coach greeting → strategy cards → search → verdict → 10 tabs (all visible)

**New structure:**
```
StoryFlow steps: ["Verdict", "The Numbers", "The Market", "The Risks", "Your Move"]

Chapter 0 - Verdict:
  - BUY/PASS badge (large)
  - Score + confidence
  - AI one-liner: "This deal returns X% in a BUY market. Here's why."

Chapter 1 - The Numbers:
  - Key metrics grid (cap rate, DSCR, CoC, cash flow)
  - Cash flow breakdown
  - Advanced: [Financials tab content, What-If tab, Tax tab]

Chapter 2 - The Market:
  - Market signal (BUY/HOLD/SELL for this ZIP)
  - 5-signal convergence mini-view
  - Advanced: [Market tab, Neighborhood tab, Comps tab]

Chapter 3 - The Risks:
  - Red/Green flags (from _playbook-shared.tsx)
  - Break-even thresholds
  - Advanced: [Risk tab, Stress test, Monte Carlo]

Chapter 4 - Your Move:
  - StoryAction with recommendations
  - "Run simulation" / "Save to pipeline" / "Generate PDF" buttons
```

- [ ] **Step 1: Add StoryFlow imports to analyze page**

At the top of the file, add:
```tsx
import { StoryFlow, type StoryStep } from "@/components/shared/StoryFlow";
import { StoryChapter } from "@/components/shared/StoryChapter";
import { StoryAction } from "@/components/shared/StoryAction";
```

- [ ] **Step 2: Define story steps constant**

After the existing TABS constant, add:
```tsx
const STORY_STEPS: StoryStep[] = [
  { id: "verdict", label: "Verdict" },
  { id: "numbers", label: "The Numbers" },
  { id: "market", label: "The Market" },
  { id: "risks", label: "The Risks" },
  { id: "action", label: "Your Move" },
];
```

- [ ] **Step 3: Wrap the analysis result section in StoryFlow**

Find the section that renders when `result` exists (after the coach greeting / strategy cards). Wrap the tab content in StoryFlow with 5 StoryChapters. The first 3 tabs (Summary, Financials, Risk) become the visible content of chapters 1-3. Tabs 4-10 become the `advanced` prop of the relevant chapters.

The key changes:
- Remove the visible TabNav (10 tabs)
- Chapter 0 (Verdict): extract the verdict hero from SummaryTab
- Chapter 1 (Numbers): SummaryTab metrics + FinancialsTab as `advanced`
- Chapter 2 (Market): MarketTab signals + NeighborhoodTab/CompsTab as `advanced`
- Chapter 3 (Risks): RiskTab flags + StressTest/MonteCarlo as `advanced`
- Chapter 4 (Action): StoryAction with contextual recommendations

- [ ] **Step 4: Verify page loads**

Run: `curl -s -o /dev/null -w "HTTP: %{http_code}" http://localhost:3000/dashboard/analyze`
Expected: `HTTP: 200`

- [ ] **Step 5: Commit**

```bash
git add lootvue/src/app/dashboard/analyze/page.tsx
git commit -m "feat: restructure Analyze page with StoryFlow — verdict first, progressive disclosure"
```

---

### Task 5: Apply StoryFlow to Simulator

**Files:**
- Modify: `lootvue/src/app/dashboard/simulator/page.tsx`

**New structure:**
```
StoryFlow steps: ["Does This Work?", "Scenarios", "The Risks", "Mortgage", "Decision"]

Chapter 0 - Does This Work?:
  - AI verdict bar (already exists)
  - 6 key metrics (already exists)

Chapter 1 - Scenarios:
  - Bull/Base/Bear (already exists)
  - Chart tabs (cash flow, monte carlo)
  - Advanced: [Sensitivity tab, Waterfall tab]

Chapter 2 - The Risks:
  - AI coach section (already exists)
  - Deal intelligence footer (already exists)

Chapter 3 - Mortgage:
  - Show 3 key tools: Amortization, Loan Comparison, Down Payment
  - Advanced: [Points, Refi, Closing Costs, Affordability, PMI]

Chapter 4 - Decision:
  - StoryAction: "Run on a real property" / "Save scenario" / "Generate report"
  - Advanced: [Equity chart, CoC timeline, After-tax, Leverage, Insurance, Reserves, Comparison, Turnover]
```

- [ ] **Step 1-4: Same pattern as Task 4** — import StoryFlow, define steps, wrap content, verify, commit.

---

### Task 6: Apply StoryFlow to Markets Page

**Files:**
- Modify: `lootvue/src/app/dashboard/markets/page.tsx`

**New structure:**
```
StoryFlow steps: ["Market Signal", "Explore", "Evidence", "Find Deals"]

Chapter 0 - Market Signal:
  - AI narrator: "X markets are BUY. Y are SELL. Here's the map."
  - Map (full width, hero)

Chapter 1 - Explore:
  - Rankings table + state detail overlay

Chapter 2 - Evidence:
  - Signal convergence + backtest proof
  - Advanced: [HPI forecast, Scatter, Parallel charts]

Chapter 3 - Find Deals:
  - StoryAction: "Explore properties in [top market]" / "Compare markets"
```

- [ ] **Steps 1-4: Same pattern.**

---

### Task 7: Apply StoryFlow to remaining pages

**Files:**
- Modify: `lootvue/src/app/dashboard/page.tsx` (Dashboard)
- Modify: `lootvue/src/app/dashboard/discover/page.tsx`
- Modify: `lootvue/src/app/dashboard/pipeline/page.tsx`
- Modify: `lootvue/src/app/dashboard/rates/page.tsx`

Each follows the same pattern:
1. Import StoryFlow/StoryChapter/StoryAction
2. Define 3-5 story steps
3. Wrap existing content in chapters
4. Move advanced content behind expanders
5. Add StoryAction at the end
6. Verify and commit

**Dashboard:** What Changed → Your Portfolio → Market Pulse → What's Next
**Discover:** AI Picks → Market Context → Browse Deals → Deep Dive
**Pipeline:** Portfolio Health → Active Deals → Next Steps
**Rates:** Today's Rate → Your Move → Deep Dive → Forecast

---

## Chunk 3: Wire Unwired Components

### Task 8: Wire deal intelligence into Analyze StoryChapter

**Files:**
- Modify: `lootvue/src/app/dashboard/analyze/page.tsx`

Import and render inside the appropriate StoryChapters:
- `OpportunityRank` → Chapter 0 (Verdict), below the score
- `DealSpeedScore` → Chapter 0 (Verdict), next to the score
- `MoneyLeftOnTable` → Chapter 1 (Numbers), top of chapter
- `CostOfWaiting` → Chapter 4 (Action), above StoryAction
- `WhatWouldAProDo` → Chapter 4 (Action), as recommendations
- `PassiveIncomeCalculator` → Chapter 4 (Action), advanced
- `WealthTrajectory` → Chapter 4 (Action), advanced
- `OpportunityCost` → Chapter 1 (Numbers), advanced

- [ ] **Step 1: Add imports**
```tsx
import {
  OpportunityRank, MoneyLeftOnTable, DealSpeedScore, CostOfWaiting,
  PassiveIncomeCalculator, WhatWouldAProDo, WealthTrajectory, OpportunityCost,
} from "./_deal-intelligence";
```

- [ ] **Step 2: Render each component in its chapter** (details depend on exact page structure after Task 4)

- [ ] **Step 3: Commit**

---

### Task 9: Wire playbook shared components into playbooks

**Files:**
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-ltr.tsx`
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-str.tsx`
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-flip.tsx`
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-brrrr.tsx`

Each playbook should import and render from `_playbook-shared.tsx`:
- `NegotiationIntelligence` — all 4 playbooks
- `DueDiligenceChecklist` — all 4 playbooks (with strategy prop)
- `SensitivityHeatmap` — LTR, STR, BRRRR
- `RedGreenFlags` — all 4 playbooks
- `FinancingMatrix` — all 4 playbooks
- `OfferToCloseTimeline` — all 4 playbooks (with strategy prop)
- `SimilarDeals` — all 4 playbooks

- [ ] **Steps 1-4: Add imports and render in each file. Commit per file.**

---

### Task 10: Wire useMarketSignals to Markets page

**Files:**
- Modify: `lootvue/src/app/dashboard/markets/page.tsx`

Replace `SAMPLE_MARKET_DATA` usage with `useMultiMarketSignals()` hook. The hook fetches real FRED data via the 4 API routes and computes confluence scores.

- [ ] **Step 1: Import the hook**
```tsx
import { useMultiMarketSignals } from "@/lib/hooks/useMarketSignals";
```

- [ ] **Step 2: Call the hook and use its output**
```tsx
const { mapData, status } = useMultiMarketSignals();
const marketData = status === "success" ? mapData : SAMPLE_MARKET_DATA; // graceful fallback
```

- [ ] **Step 3: Pass `marketData` instead of `SAMPLE_MARKET_DATA` to all consumers**

- [ ] **Step 4: Commit**

---

## Chunk 4: Legacy Cleanup

### Task 11: Delete 11 dead pages

**Files:**
- Delete: `lootvue/src/app/dashboard/capital/`
- Delete: `lootvue/src/app/dashboard/charts-demo/`
- Delete: `lootvue/src/app/dashboard/compare/`
- Delete: `lootvue/src/app/dashboard/consensus/`
- Delete: `lootvue/src/app/dashboard/deal-room/`
- Delete: `lootvue/src/app/dashboard/exchange/`
- Delete: `lootvue/src/app/dashboard/leaderboard/`
- Delete: `lootvue/src/app/dashboard/lending/`
- Delete: `lootvue/src/app/dashboard/pathway/`
- Delete: `lootvue/src/app/dashboard/pulse/`

- [ ] **Step 1: Delete all legacy page directories**
```bash
cd lootvue/src/app/dashboard
rm -rf capital charts-demo compare consensus deal-room exchange leaderboard lending pathway pulse
```

- [ ] **Step 2: Search for any imports referencing deleted pages**
```bash
grep -r "capital\|charts-demo\|compare\|consensus\|deal-room\|exchange\|leaderboard\|lending\|pathway\|pulse" src/app/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 3: Clean up any broken references found**

- [ ] **Step 4: Verify all pages still load**
```bash
for route in /dashboard /dashboard/markets /dashboard/analyze /dashboard/discover /dashboard/pipeline /dashboard/simulator /dashboard/rates; do
  curl -s -o /dev/null -w "$route: %{http_code}\n" http://localhost:3000$route
done
```

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "chore: delete 11 legacy pages (capital, charts-demo, compare, consensus, deal-room, exchange, leaderboard, lending, pathway, pulse)"
```

---

## Execution Summary

| Chunk | Tasks | What it produces |
|-------|-------|-----------------|
| 1: Shared Components | 1-3 | 3 reusable components: StoryFlow, StoryChapter, StoryAction |
| 2: Apply to Pages | 4-7 | All 7 pages restructured with narrative flow |
| 3: Wire Unwired Code | 8-10 | 1,734 lines of floating components connected to pages |
| 4: Legacy Cleanup | 11 | 11 dead pages deleted, clean codebase |
