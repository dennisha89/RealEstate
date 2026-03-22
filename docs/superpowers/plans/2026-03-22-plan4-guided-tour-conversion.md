# Plan 4: Guided Tour + Conversion System

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Build a first-time user guided tour (literal arrows pointing at what to look at) and implement the conversion system (14-day free trial, contextual paywalls, feature gating).

**Architecture:** A GuidedTour component dims the page and highlights specific elements with arrows and plain English explanations. Runs once on first visit per page, replayable via "?" button. The conversion system adds trial state to user-profile-store, contextual upgrade prompts at premium feature boundaries, and a pricing page with Stripe checkout.

**Tech Stack:** React, motion, Zustand (user-profile-store), Stripe (checkout), localStorage for tour completion state

---

## Tasks

### Task 1: Build GuidedTour component
- Create: `lootvue/src/components/shared/GuidedTour.tsx`
- Overlay that dims everything except the highlighted element
- Arrow pointing at the highlighted element
- Plain English explanation card
- "Got it →" button advances to next step
- 3-5 steps per page
- Stores completion in localStorage
- "?" button in page header to replay

### Task 2: Create tour definitions for each page
- Create: `lootvue/src/lib/tours/` directory with tour configs
- Each page gets a tour: dashboard, markets, analyze, simulator, discover, pipeline, rates

### Task 3: Build conversion system
- Modify: `lootvue/src/lib/stores/user-profile-store.ts` — add trial state, subscription tier, trial start date
- Create: `lootvue/src/components/shared/PaywallGate.tsx` — wrapper that checks subscription before rendering children
- Create: `lootvue/src/app/pricing/page.tsx` — pricing page with Free/Pro/Fund tiers

### Task 4: Add contextual upgrade prompts
- After 3rd analysis: "You've analyzed 3 deals. Pro gives unlimited."
- On Monte Carlo click (free tier): "Stress test like Blackstone. Upgrade to Pro."
- On PDF export click: "Send this to your lender. Upgrade to export."
- On pipeline 3rd deal: "Track unlimited deals. Upgrade to Pro."
