---
globs: "**/engines/ai-*.*,**/engines/memo-generator*,**/api/ai-*/**"
---

# AI / LLM Integration Rules

## Claude API Usage
- Use `@anthropic-ai/sdk` (already installed in lootvue).
- Model selection: `claude-sonnet-4-6` for fast analysis (<1s), `claude-opus-4-6` for deep thesis/advisory.
- Temperature: 0.1 factual, 0.4 narrative, 0.7 creative exploration. Never >0.8 for financial content.
- Always set `max_tokens` explicitly — 1024 for summaries, 4096 for full memos.

## Prompt Engineering
- **Ground every prompt in real data.** Pass engine outputs as system context. Never ask Claude to guess market data.
- **Structured output**: Request JSON matching a Zod schema. Validate response before rendering.
- **System prompt template**: "You are a real estate investment analyst. Based on the following verified data: [DATA]. Generate [TASK]."
- **Never send PII** to the Claude API — no user names, emails, or financial account details in prompts.
- **Token budgets**: Monitor input size. If context exceeds 50k tokens, summarize before sending.

## Streaming
- Use Anthropic SDK streaming for any response >500 tokens.
- Stream to frontend via Server-Sent Events (SSE) from API routes.
- Show typing indicator while streaming. Show skeleton for non-streaming.
- Handle stream interruption gracefully — show partial result with "interrupted" label.

## Output Handling
- **Always label AI-generated content** — use "AI Analysis" badge or similar indicator.
- **Disclaimer**: AI analysis is informational, not financial advice. Include on every AI output.
- **Confidence scoring**: AI outputs must include a confidence level (0-100) based on data quality and completeness.
- **Fallback**: If Claude API fails or rate limits, show "AI analysis unavailable" — never crash or show stale AI output without labeling it.

## Validation
- Validate all AI JSON responses with Zod schemas before rendering.
- If AI output contains numbers, cross-check against engine calculations — AI should narrate, not compute.
- Flag any AI output that contradicts engine metrics (e.g., AI says "strong buy" but deal grade is D).

## ai-advisor-engine.ts
- Currently deterministic (keyword matching, no API call). Production version must call Claude API.
- Portfolio context must be sanitized before sending to API.
