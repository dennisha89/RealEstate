# Plan 1: Wire Real Data + AI + Deploy

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing useMarketSignals hook to the Markets page (replacing SAMPLE_MARKET_DATA with real FRED data), wire Claude AI streaming to the AiInsightStrip components, wire the floating deal intelligence + playbook shared components, and deploy to Vercel.

**Architecture:** Three independent workstreams: (1) replace sample data on Markets page with live FRED signals via useMarketSignals hook, (2) create /api/ai/coach streaming route using @anthropic-ai/sdk and wire to existing AiInsightStrip, (3) import the 15 unwired component files into their target pages. Deploy to Vercel after all three are verified.

**Tech Stack:** Next.js 14, @anthropic-ai/sdk ^0.78.0, FRED API (CSV, no key needed for supply/permits/hpi), existing useMarketSignals hook, existing AiInsightStrip component, Vercel CLI.

---

## File Structure

### Workstream A: Real Data Wiring
- Modify: `lootvue/src/app/dashboard/markets/page.tsx` — replace SAMPLE_MARKET_DATA with useMarketSignals()
- Modify: `lootvue/src/app/dashboard/page.tsx` — use real rates from /api/rates/current (already partially done)

### Workstream B: AI Streaming Route
- Create: `lootvue/src/app/api/ai/coach/route.ts` — Claude streaming SSE endpoint
- Modify: `lootvue/src/components/shared/AiInsightStrip.tsx` — add optional live AI fetch mode

### Workstream C: Wire Floating Components
- Modify: `lootvue/src/app/dashboard/analyze/page.tsx` — import _deal-intelligence components into StoryFlow chapters
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-ltr.tsx` — import shared playbook components
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-str.tsx` — same
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-flip.tsx` — same
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-brrrr.tsx` — same

### Workstream D: Deploy
- No new files — use Vercel MCP or CLI

---

## Chunk 1: Wire Real Market Data

### Task 1: Replace SAMPLE_MARKET_DATA on Markets Page

**Files:**
- Modify: `lootvue/src/app/dashboard/markets/page.tsx`

- [ ] **Step 1: Add useMarketSignals import**
Add at top of file:
```tsx
import { useMultiMarketSignals } from "@/lib/hooks/useMarketSignals";
```

- [ ] **Step 2: Call the hook and fallback to sample data**
Inside `MarketsPage()`, before the existing state declarations, add:
```tsx
const { mapData, status } = useMultiMarketSignals();
const marketData = status === "success" && mapData.length > 0 ? mapData : SAMPLE_MARKET_DATA;
```

- [ ] **Step 3: Replace all SAMPLE_MARKET_DATA references with marketData**
Find every usage of `SAMPLE_MARKET_DATA` in the component body (NOT the import — keep the import for the type and fallback). Replace with `marketData`:
- `sortedData` useMemo
- `tickerData`
- `nationalBullish` calculation
- CapitalFlowMap `data` prop
- Any other direct references

- [ ] **Step 4: Add a loading indicator when data is fetching**
If `status === "loading"`, show a subtle indicator in the page header:
```tsx
{status === "loading" && <span className="text-[10px] text-gold animate-pulse">Loading live data...</span>}
{status === "success" && <span className="text-[10px] text-emerald">Live FRED data</span>}
```

- [ ] **Step 5: Verify the page loads**
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/markets`
Expected: 200

- [ ] **Step 6: Commit**
```bash
git add lootvue/src/app/dashboard/markets/page.tsx
git commit -m "feat: wire real FRED market data to Markets page via useMarketSignals hook"
```

---

## Chunk 2: Wire Claude AI Streaming

### Task 2: Create AI Coach Streaming Route

**Files:**
- Create: `lootvue/src/app/api/ai/coach/route.ts`

- [ ] **Step 1: Create the streaming route**

```tsx
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are LootVue's AI investment coach — a sharp analyst who left Goldman to help regular investors stop getting fleeced. You speak in plain English at an 8th grade reading level. You are data-driven, specific, and always tie insights back to the user's money impact.

Rules:
- Never say "AI-powered" or "leveraging AI" — just give the analysis
- Always include specific numbers, not vague claims
- Tie every insight to money: "This means $X more/less in your pocket"
- Be honest about risks — don't sugarcoat
- If you don't know, say so — never fabricate data
- Keep responses under 200 words unless asked for detail
- You are not a financial advisor — always include that disclaimer when giving specific recommendations`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const { prompt, context } = body as { prompt: string; context?: string };

  if (!prompt || typeof prompt !== "string") {
    return new Response(
      JSON.stringify({ error: "prompt is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new Anthropic({ apiKey });

  const systemMessage = context
    ? `${SYSTEM_PROMPT}\n\nCurrent context:\n${context}`
    : SYSTEM_PROMPT;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    temperature: 0.2,
    system: systemMessage,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify the route exists**
Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/ai/coach -H "Content-Type: application/json" -d '{"prompt":"test"}'`
Expected: 503 (no API key) or 200 (if key exists)

- [ ] **Step 3: Commit**
```bash
git add lootvue/src/app/api/ai/coach/route.ts
git commit -m "feat: add Claude AI streaming route at /api/ai/coach"
```

---

## Chunk 3: Wire Floating Components

### Task 3: Wire Deal Intelligence into Analyze Page

**Files:**
- Modify: `lootvue/src/app/dashboard/analyze/page.tsx`

- [ ] **Step 1: Add deal intelligence imports**
```tsx
import {
  OpportunityRank, MoneyLeftOnTable, DealSpeedScore, CostOfWaiting,
  PassiveIncomeCalculator, WhatWouldAProDo, WealthTrajectory, OpportunityCost,
} from "./_deal-intelligence";
```

- [ ] **Step 2: Render components inside StoryFlow chapters**
- OpportunityRank + DealSpeedScore → Chapter 0 (Verdict), below the verdict badge
- MoneyLeftOnTable → Chapter 1 (Numbers), at the top
- CostOfWaiting + WhatWouldAProDo → Chapter 4 (Your Move), above StoryAction
- PassiveIncomeCalculator + WealthTrajectory + OpportunityCost → Chapter 4, inside `advanced` prop

- [ ] **Step 3: Verify page loads**
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/analyze`
Expected: 200

- [ ] **Step 4: Commit**

### Task 4: Wire Playbook Shared Components into All 4 Playbooks

**Files:**
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-ltr.tsx`
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-str.tsx`
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-flip.tsx`
- Modify: `lootvue/src/app/dashboard/analyze/_playbook-brrrr.tsx`

- [ ] **Step 1: Add shared component imports to each playbook**
```tsx
import {
  NegotiationIntelligence, DueDiligenceChecklist, SensitivityHeatmap,
  RedGreenFlags, FinancingMatrix, OfferToCloseTimeline, SimilarDeals,
} from "./_playbook-shared";
```

- [ ] **Step 2: Render shared components at the bottom of each playbook**
In each playbook, after the strategy-specific content, add:
```tsx
<div className="space-y-4 mt-6">
  <RedGreenFlags result={result} />
  <NegotiationIntelligence dom={28} avgDomArea={22} listPrice={result?.price ?? 400000} priceDrops={1} />
  <SensitivityHeatmap price={result?.price ?? 400000} rent={result?.rent ?? 2200} rate={7.0} downPct={20} />
  <FinancingMatrix price={result?.price ?? 400000} rent={result?.rent ?? 2200} noi={(result?.rent ?? 2200) * 0.55 * 12} />
  <DueDiligenceChecklist strategy="LTR" /> {/* or STR/Flip/BRRRR per file */}
  <OfferToCloseTimeline strategy="LTR" /> {/* per file */}
  <SimilarDeals address={address ?? ""} price={result?.price ?? 400000} strategy="LTR" /> {/* per file */}
</div>
```

- [ ] **Step 3: Verify all pages load**
Run: `for r in /dashboard/analyze; do curl -s -o /dev/null -w "$r: %{http_code}\n" http://localhost:3000$r; done`

- [ ] **Step 4: Commit**
```bash
git add lootvue/src/app/dashboard/analyze/
git commit -m "feat: wire deal intelligence + playbook shared components into Analyze page"
```

---

## Chunk 4: Deploy

### Task 5: Deploy to Vercel

- [ ] **Step 1: Verify build succeeds locally**
Run: `cd lootvue && node node_modules/next/dist/bin/next build 2>&1 | tail -20`
Note: Some TS errors may exist — if build succeeds despite warnings, proceed.

- [ ] **Step 2: Deploy via Vercel CLI or MCP**
Run: `npx vercel --prod` or use Vercel MCP if available.

- [ ] **Step 3: Verify deployed URL loads**
Check all 7 pages return 200 on the production URL.

- [ ] **Step 4: Commit deployment config if needed**
