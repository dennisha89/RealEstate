# Plan 2: Deal Structure Simulator

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Deal Structure Simulator that shows users ALL possible ways to acquire any property — conventional, FHA, DSCR, seller financing, subject-to, partnership/JV, BRRRR, lease option, SDIRA, HELOC, assumable mortgage, land contract, wraparound, bridge-to-perm, master lease — side by side with exact numbers.

**Architecture:** One new engine (`deal-structure-engine.ts`) contains the math for all 15 financing structures. One new page section in the Simulator integrates a "Financing Paths" chapter into the existing StoryFlow. The engine uses the existing `dcf-engine.ts` for amortization/IRR calculations and `waterfall-engine.ts` for partnership splits. A "How are you funding this?" question entry point routes users to the appropriate structure.

**Tech Stack:** TypeScript, existing financial engines (dcf-engine, waterfall-engine, financial-engine), React, Tailwind, motion.

---

## File Structure

### New files:
- `lootvue/src/lib/engines/deal-structure-engine.ts` — all 15 financing structure calculations
- `lootvue/src/app/dashboard/simulator/_deal-structures.tsx` — UI for the side-by-side comparison + "How are you funding this?" entry

### Modified files:
- `lootvue/src/app/dashboard/simulator/page.tsx` — add new StoryChapter for financing paths
- `lootvue/src/lib/stores/simulator-store.ts` — add structureType field

---

## Chunk 1: Deal Structure Engine

### Task 1: Create the Deal Structure Engine

**Files:**
- Create: `lootvue/src/lib/engines/deal-structure-engine.ts`

The engine exports:
- `DealStructureInput` interface — universal input for all structures
- `DealStructureOutput` interface — universal output with per-structure results
- `analyzeAllStructures(input)` — runs all applicable structures and returns sorted comparison
- Individual structure functions: `analyzeConventional()`, `analyzeDSCR()`, `analyzeFHA()`, etc.

Each structure function uses the standard mortgage formula:
```
PMT = P × r(1+r)^n / ((1+r)^n - 1)
```

Where P = principal, r = monthly rate, n = total payments.

The engine should:
- Calculate monthly payment, cash at closing, total cost, IRR, DSCR for each structure
- Flag which structures this deal qualifies for (e.g., FHA only if owner-occupied)
- Sort by cash-on-cash return descending
- Include risk level and legal requirements per structure
- Use existing `calculateMortgagePayment` from financial-engine.ts where possible

Key structures to implement (from research):
1. Conventional 20% down
2. FHA 3.5% house hack
3. DSCR 25% down
4. Seller financing 10% down + balloon
5. Subject-to (assume existing low-rate loan)
6. Partnership 50/50 or 70/30
7. BRRRR (hard money → rehab → refi)
8. Lease option
9. SDIRA (all cash from retirement)
10. HELOC + conventional

---

## Chunk 2: Deal Structure UI

### Task 2: Create the Deal Structure UI Component

**Files:**
- Create: `lootvue/src/app/dashboard/simulator/_deal-structures.tsx`

Exports:
- `FundingQuestion` — "How are you funding this?" entry with 4 visual cards (Solo / Partner / Investors / Creative)
- `StructureComparison` — side-by-side table of all applicable structures
- `StructureDetail` — expanded view of a single structure with full breakdown

The comparison table should show:
| Structure | Cash Needed | Monthly Pmt | Monthly CF | CoC | IRR | Risk |
Each row clickable to expand into full detail.

### Task 3: Wire into Simulator Page

**Files:**
- Modify: `lootvue/src/app/dashboard/simulator/page.tsx`

Add a new StoryChapter between "Mortgage" and "Decision":
```tsx
<StoryChapter index={4} id="structures" aiIntro="Here are all the ways you could acquire this property.">
  <StructureComparison input={structureInput} />
</StoryChapter>
```

Update STORY_STEPS to include the new chapter.
