# Plan 3: PDF Reports + Lender Marketplace MVP

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Build one-click PDF report generation (investment memo, lender package) and a basic lender marketplace with "Get Financing" button on the Analyze page.

**Architecture:** PDF generation uses @react-pdf/renderer to produce professional investment memos from existing engine outputs. The lender marketplace wires the existing `matchLenders()` function in lender-store.ts to a new Financing tab panel, showing matched lenders with rate comparisons and a "Request Quote" CTA.

**Tech Stack:** @react-pdf/renderer, existing lender-store.ts, existing matchLenders(), existing memo-generator.ts

---

## Tasks

### Task 1: Install react-pdf and build report templates
- Install: `npm install @react-pdf/renderer`
- Create: `lootvue/src/lib/reports/investment-memo-pdf.tsx` — generates a professional PDF from DCF + analysis data
- Create: `lootvue/src/lib/reports/lender-package-pdf.tsx` — lender-formatted package

### Task 2: Add "Download Report" button to Analyze page
- Modify: `lootvue/src/app/dashboard/analyze/page.tsx` — add PDF download in StoryAction

### Task 3: Wire lender matching to Financing tab
- Read: `lootvue/src/lib/stores/lender-store.ts` — understand matchLenders()
- Create: `lootvue/src/app/dashboard/analyze/_financing-tab.tsx` — shows matched lenders with comparison table
- Wire into Analyze page tab navigation

### Task 4: Add "Get Financing" CTA
- The financing tab should have a prominent "Request Quote" button per matched lender
- Submits a LenderLead (type already in marketplace.ts) with deal data pre-populated
