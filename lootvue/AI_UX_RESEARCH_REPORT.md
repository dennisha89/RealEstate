# AI in UX/UI: Research Report for LootVue

**Date**: March 2026
**Purpose**: Research how leading fintech, proptech, and analytics apps integrate AI into their visual and interaction layers. Inform LootVue's AI UX strategy.

---

## Table of Contents

1. [App-by-App Analysis](#1-app-by-app-analysis)
2. [UX Pattern Analysis](#2-ux-pattern-analysis)
3. [Recommendation for LootVue](#3-recommendation-for-lootvue)

---

## 1. App-by-App Analysis

### 1.1 Bloomberg Terminal / Bloomberg AI

**How AI appears in the UI:**
- **3-bullet summaries** at the top of every news article. GenAI generates three concise bullet points above the article body, allowing traders to scan-then-decide whether to read the full piece.
- **Document Insights tool** (launched late 2025): A conversational panel where users ask questions across multiple documents (earnings transcripts, research). Users can add documents to the conversation and cross-examine data via auto-generated tables.
- **Source links alongside every AI output**: Bloomberg explicitly links to original documents so users can verify claims. This is a trust mechanism, not decoration.
- **AI is integrated INTO existing workflows**, not added as a separate section. Summaries appear inside the article view. Document analysis appears inside the research workflow. Nothing pulls users out of their existing mental model.

**Labeling**: Bloomberg uses its own proprietary LLMs fine-tuned on financial data. AI content is identifiable by its placement (top-of-article bullets, conversational panel) but Bloomberg does not use flashy "AI" badges -- the trust model relies on source attribution, not labeling.

**Key takeaway for LootVue**: Bloomberg proves that inline summaries (not chat) are the winning pattern for data-heavy professional tools. Users want AI to narrate the data they are already looking at, not to open a separate window to ask about it.

---

### 1.2 Robinhood Cortex / Wealthfront / Betterment

**Robinhood Cortex Digests:**
- AI-generated **plain-language summaries** of what is moving a user's portfolio, broken into three sections: Market Backdrop, Return Drivers, and Top Movers.
- Displayed as a **card feed within the portfolio view**, not in a separate chat interface. The digest appears where users already look (the portfolio screen), not behind a menu.
- Includes **benchmark comparisons** (S&P 500, BTC) rendered as mini-charts alongside the text summary.
- Surfaces upcoming events (earnings, stock splits) related to the user's holdings.
- Available to Gold subscribers, indicating AI insight is positioned as a premium value-add.

**Wealthfront / Betterment:**
- Neither uses conversational AI. Instead, they use **goal-based visualization**: progress bars toward financial targets replace raw number dumps.
- Betterment's dashboard shows total net worth with drill-down into sub-categories. The design prioritizes "am I on track?" over "what are the numbers?"
- Wealthfront's Path planning engine checks cash-flow projections and adjusts glide paths automatically. AI is invisible -- it powers the rebalancing engine without ever surfacing an "AI" label.
- Both use **card-based layouts** with expandable sections. Key metric on the card face, details on expand.

**Key takeaway for LootVue**: Consumer finance apps embed AI as a narrator within the data view, never as a separate chat. Robinhood's three-section digest (context, drivers, movers) is an excellent template for LootVue's market intelligence pages. The "AI is invisible infrastructure" model (Wealthfront) works for automation but NOT for an analytical product where the insight IS the product.

---

### 1.3 Reventure App (Nick Gerli)

**How they present AI-driven forecasts:**
- **Forecast Score: 0-100 gauge** for every ZIP code, county, and city. Below 50 = declining market, above 50 = growing.
- Score is decomposed into **5 visible sub-components**: Inventory, Days on Market, Price Cuts, Recent Appreciation, Mortgage Rates. Users can see exactly which factors drive the score.
- **Color-coded heatmap** on a national map: red for growth, with intensity indicating magnitude.
- **Scorecard sliders** allow users to interact with the underlying components.
- A new **gauge visualization** (circular/semi-circular dial) in the stats view provides instant comprehension of the overall signal.

**Confidence display**: Reventure claims a 72% correlation coefficient for their model but does not display per-prediction confidence in the UI. The score IS the confidence proxy -- a score of 80 implicitly signals high certainty, while 55 signals ambiguity.

**Key takeaway for LootVue**: The 0-100 score with visible sub-component decomposition is the gold standard for transparent AI scoring in proptech. LootVue's HyperScore engine should follow this pattern: show the verdict, then show the 5-7 factors that built it. The heatmap + gauge combination works for geographic data.

---

### 1.4 Notion AI / Cursor / GitHub Copilot

**Notion AI:**
- **Inline trigger**: Hit spacebar on an empty line or highlight text to invoke AI. No separate chat window needed for most actions.
- **Slash command menu** (`/AI`) groups AI actions with visual Gestalt principles: similar actions grouped with matching icon colors and dividers.
- **Animated AI character** (not sparkles): Notion replaced the generic sparkle icon with a face-based character that makes "curious" movements. This increases discoverability via peripheral vision without being intrusive.
- **Customizable AI character** (since September 2025): Users can personalize their AI assistant appearance.
- **Blue-bordered chat window** for longer AI interactions, with the emphasized input box drawing attention.
- **AI used for both creation AND explanation**: Summarize, translate, change tone, explain -- all inline.

**Cursor AI:**
- **Two-tier system**: Inline ghost text (Cmd+K) for micro-completions, Sidebar agent (Cmd+L) for multi-file reasoning.
- **Ghost text uses syntax highlighting** in 2025, color-coded by language. This reduces cognitive load when scanning multi-line suggestions.
- **Agent sidebar** shows plans, file context pills, and diffs. Multiple agents can run in parallel.
- **Files appear as inline pills** within conversations, not as full file paths -- compact visual density.

**GitHub Copilot:**
- **Ghost text (dimmed gray)** for inline suggestions at cursor position.
- **Next Edit Suggestions (NES)** with syntax-highlighted ghost text.
- **Sidebar chat** for longer reasoning.
- **Consolidating into one extension** (Copilot Chat) by 2026, indicating the market is converging on "one AI surface, two modes (inline + panel)."

**Key takeaway for LootVue**: The productivity tool pattern is: inline micro-actions (tooltips, explain-this triggers) + sidebar panel for deeper analysis. This maps directly to LootVue: "Explain This" buttons on every metric card (inline), plus an AI Analysis panel that can dock to the right side of any page (sidebar).

---

### 1.5 Perplexity AI / ChatGPT

**Perplexity's citation pattern:**
- **Inline numbered references [1][2][3]** within the AI text, maintaining the claim-to-source bond at the sentence level.
- **Source cards** with favicon, title, and domain name at the top of the answer -- users scan relevance before reading.
- **Hover preview** on citation numbers shows a snippet from the source without navigating away.
- **"Sources" panel** separated from the answer body, listing all referenced materials.
- **Follow-up questions** suggested below the answer to encourage progressive exploration.
- Design philosophy: "Results as synthesis, not as an ordered list" -- fundamentally different from Google's link list.

**ChatGPT:**
- **Streaming token-by-token output** at ~60fps (16ms throttle) with a blinking cursor at the insertion point.
- **Markdown rendering in real-time**: Headers, bold, code blocks, and lists render as they stream, not after completion.
- **Code blocks** with syntax highlighting and a copy button.
- **Footnote-style citations** in web search mode, similar to Perplexity but less prominent.

**Citation pattern taxonomy (across all AI systems):**
1. **Inline highlights** (Adobe Acrobat): Link directly to source passages in attached documents.
2. **Direct quotations** (Granola): Show the exact quote the model relied on.
3. **Multi-source references** (Perplexity): Inline [n] with metadata cards.
4. **Lightweight links** (Copy.ai): Full URLs at the end for verification.

**Key takeaway for LootVue**: For a financial product, the Perplexity model is the right citation pattern. Every AI-generated insight in LootVue should cite which engine, data source, or calculation produced the claim. Pattern: "Cap rate is trending down [FRED][Zillow]" with hover-to-verify. This builds trust AND satisfies EU AI Act requirements.

---

### 1.6 Figma AI / Canva AI

**Figma (Config 2025):**
- **Four new AI tools**: Sites, Make, Buzz, Draw -- each embedded in the design workflow, not in a chat panel.
- **Figma Make**: Turns prompts into full design systems, prototypes, and dev-ready code. AI is the creation engine, not an advisor.
- **Figma Buzz**: Lets non-designers create marketing content within design system guardrails. AI + brand constraints = controlled freedom.
- **"AI as assistant, human as director"**: Design tools emphasize that AI handles the "how" while humans direct the "what." Fewer than half of designers felt AI made them better at their jobs -- efficiency gains yes, quality gains uncertain.

**Canva Magic Studio:**
- AI tools appear as contextual options when an element is selected.
- "Magic" branding (magic eraser, magic design, magic write) creates a consistent visual language for AI features.
- Non-intrusive suggestions: AI options appear alongside non-AI editing options, not in a special section.

**Key takeaway for LootVue**: Design tools prove that the best AI UX is invisible until needed. AI options should appear as natural extensions of existing actions, not as a separate mode. For LootVue, this means: when a user clicks a metric card, "AI Explain" appears as one option alongside "View History," "Compare," and "Export" -- it is just another action, not a special category.

---

## 2. UX Pattern Analysis

### 2.1 Inline AI vs Sidebar AI vs Modal AI

| Pattern | Best For | Pros | Cons | Real Examples |
|---------|----------|------|------|---------------|
| **Inline** (within the content) | Micro-explanations, tooltips, metric annotations | Zero context-switching; feels native; power users love it | Limited space; can clutter dense dashboards | Bloomberg bullet summaries, Copilot ghost text, Notion inline AI |
| **Sidebar Panel** (docked right) | Multi-step analysis, conversation, deep dives | Persistent context; does not obscure main content; supports longer output | Reduces main content width; may be ignored if collapsed | Cursor agent sidebar, Copilot Chat, Microsoft 365 Copilot |
| **Modal/Overlay** (centered popup) | One-off deep analysis, reports, comparisons | Full attention; good for long-form output | Breaks workflow; user cannot reference dashboard behind it | DealCheck reports, Figma Make generation |
| **Card/Feed** (within content flow) | Digests, summaries, proactive insights | Natural reading flow; feels like content, not a tool | Can be confused with static content; needs clear AI labeling | Robinhood Cortex Digests, Tableau Pulse |
| **Command Palette** (search-style) | Power users, quick questions, navigation | Fast; keyboard-first; minimal UI footprint | High learning curve; invisible to new users | ThoughtSpot Sage, Notion slash commands |

**Verdict for data dashboards**: The research strongly favors a **hybrid of Inline + Sidebar**:
- Inline for micro-insights (3-bullet summaries on cards, "explain this" tooltips, trend annotations).
- Sidebar for deep analysis (full AI narrative, engine-by-engine breakdown, what-if scenarios).
- Modal only for exportable reports and full-page analysis memos.

---

### 2.2 "Explain This" Triggers

**How apps let users request AI explanation on any metric:**

| App | Trigger | UX |
|-----|---------|-----|
| Bloomberg | Automatic -- 3 bullets appear on every article | No trigger needed; always visible |
| Robinhood Cortex | Automatic -- digest appears in portfolio view | No trigger needed; card-based |
| ThoughtSpot | Type a question in the search bar | NLQ (natural language query) |
| Microsoft 365 | Select text/cell/object, click Copilot icon | Context-menu style |
| Notion | Highlight text, press spacebar, or use `/AI` | Inline trigger + slash command |
| Tableau Pulse | Automatic -- narrative insights generated alongside metrics | Proactive, not triggered |

**Best pattern for LootVue**: A small **icon-button on every metric card** (not sparkles -- see Section 2.7) that says "Why?" or shows a lightbulb icon. On click, it expands an inline explanation below the metric. On second click or "Deep Dive," it opens the sidebar panel with full engine attribution.

---

### 2.3 AI Confidence Display

**Research findings from AI UX design pattern libraries:**

| Method | Visual | When to Use | Risk |
|--------|--------|-------------|------|
| **Percentage badge** | "85% confident" | When the user is sophisticated enough to interpret | Users may demand 100% or ignore anything below 90% |
| **Color-coded bar** | Green/amber/red fill | When confidence is a secondary signal | Color-blind inaccessible without text backup |
| **Traffic light icon** | Circle: green/amber/red | When space is extremely limited | Over-simplifies; no granularity |
| **Written qualifier** | "High confidence" / "Moderate" / "Low" | When the audience is general public | Vague; different users interpret differently |
| **Range/interval** | "$285K - $310K" | For financial valuations | Best practice but takes more space |
| **Gauge/dial** | Semi-circular meter | For scores and composite indices | Reventure uses this; intuitive |

**Color thresholds (industry standard):**
- Green: >= 85% confidence
- Amber: 60-84% confidence
- Red: < 60% confidence

**Best practice**: "Provide clear thresholds that indicate when human verification is recommended."

**Best pattern for LootVue**: Use **confidence intervals (ranges)** as the primary indicator, backed by a **color-coded badge** ("High" / "Moderate" / "Low") with the color system already established (emerald/amber/rose). Show the percentage only on hover/expand. NEVER show a bare percentage without context -- "85% confident" means nothing without "based on 12 data points across 3 sources."

---

### 2.4 AI Narratives Alongside Charts

**How leading products combine chart + text:**

| Product | Pattern | Description |
|---------|---------|-------------|
| **Tableau Pulse** | Narrative below chart | AI generates a plain-language summary grounded in statistical facts. "Sales increased 12% MoM, driven primarily by the Northeast region." Summaries are generated from a metrics layer that ranks insights by significance. |
| **Bloomberg** | Bullets above content | Three AI-generated bullets at the top of the article/data view. Read-then-decide pattern. |
| **Robinhood Cortex** | Card with embedded chart | Text digest card includes mini benchmark charts (S&P, BTC) alongside the narrative. |
| **ThoughtSpot Sage** | Chart generated from question | User asks a question, AI generates both the visualization AND the narrative answer. |
| **Power BI Copilot** | Side panel narrative | AI writes a commentary about the selected chart, explaining trends and outliers. |

**Best pattern for LootVue**: Every chart card should have two layers:
1. **Default**: Chart + 1-2 sentence AI annotation below the chart (like Tableau Pulse). Always visible.
2. **Expanded**: Full AI narrative with engine attribution, factor decomposition, and confidence interval. Accessible via "Read Full Analysis" link.

This is the **narrated chart** pattern -- the chart shows the "what," the AI text explains the "why."

---

### 2.5 Progressive Disclosure of AI

**The three-layer model (from AI UX design pattern research):**

| Layer | What Shows | User Action to Reveal |
|-------|-----------|----------------------|
| **Essential** | Key metric + 1-line AI verdict | Always visible |
| **Intermediate** | Factor decomposition + confidence + mini-chart | Click "Why?" or expand card |
| **Advanced** | Full AI narrative + engine attribution + sensitivity analysis + sources | Click "Deep Dive" or open sidebar |

**Real examples:**
- **Wealthfront**: Shows "On Track" (essential), expand for asset allocation breakdown (intermediate), drill into tax-loss harvesting details (advanced).
- **Notion**: Shows page summary (essential), click to see AI analysis (intermediate), ask follow-up questions (advanced).
- **Cursor**: Ghost text (essential), sidebar conversation (intermediate), multi-agent parallel plans (advanced).

**Key design rule**: "Limit disclosure to 2-3 layers to prevent user frustration."

**Best pattern for LootVue**: Three-layer progressive disclosure on every insight:
1. **Metric card face**: Score + 1-line verdict + confidence badge. ("HyperScore: 78 | Strong Buy | High Confidence")
2. **Expanded card**: 5-7 factor breakdown + mini-sparklines + AI explanation paragraph. ("Driven by: employment growth +3.2%, permit surge +18%, capital inflow from SF")
3. **Sidebar panel**: Full AI memo + engine-by-engine output + source citations + sensitivity table + "Ask a question" input.

---

### 2.6 AI as Co-Pilot vs AI as Narrator

**Two dominant paradigms in 2025-2026:**

| Dimension | Co-Pilot (Interactive) | Narrator (Proactive) |
|-----------|----------------------|---------------------|
| **Interaction model** | User asks, AI answers | AI speaks, user reads |
| **Trigger** | User-initiated (click, type, command) | Automatic / system-initiated |
| **Best for** | Power users, custom questions, what-if | Beginners, scanning, digests |
| **Trust model** | User controls what AI sees | User must trust AI's editorial judgment |
| **Space required** | Sidebar panel or modal | Inline cards, annotations |
| **Products** | Cursor, ThoughtSpot, Copilot | Bloomberg, Tableau Pulse, Robinhood Cortex |
| **Risk** | Unused if users don't know what to ask | Ignored if insights are not relevant |

**Research finding**: Copilots convert better "when your judgment drives outcomes -- choose them when the task requires your intuition, creativity, or ethical perspective." Narrators work better for "surfacing insights users didn't know to ask about."

**Best pattern for LootVue**: **Narrator-first, Co-pilot-available.**
- Default state: AI narrates every page with proactive insights (Tableau Pulse / Bloomberg model).
- Always accessible: A sidebar co-pilot for custom questions ("What if interest rates rise 100bps?", "Compare this market to Austin").
- This serves BOTH the beginner (narrator does the thinking) and the power user (co-pilot answers custom questions).

---

### 2.7 AI Labeling and Disclaimers

**The sparkle icon problem (NN/g research, 2025):**
- 0% of users identified the sparkle icon as "AI" when shown in isolation.
- 16.8% thought it meant "save/favorite" (confusion with the star icon).
- Recommendation: "The icon should ALWAYS be accompanied by a label."

**EU AI Act requirements (Article 50, enforceable August 2026):**
- AI-generated content must be clearly labeled.
- Users must be informed when they are interacting with AI.
- Financial services using AI for customer communication must ensure proper labeling.
- A common icon + disclaimer adapted to the content modality is required.

**How finance apps handle disclaimers without destroying UX:**

| App | Disclaimer Pattern |
|-----|-------------------|
| Robinhood | "Cortex is AI-generated and may contain errors. Not investment advice." -- small text below digest |
| Bloomberg | Implicit -- AI summaries are clearly positioned as summaries, not recommendations |
| Wealthfront | No visible AI label -- AI is infrastructure, not visible to user |
| Betterment | Generic "for informational purposes only" on the platform level |

**Best pattern for LootVue:**
1. **Badge**: Small "AI Analysis" text badge (not sparkles) on every AI-generated section. Use the existing LootVue gold color for the badge to keep it on-brand.
2. **Tooltip disclaimer**: Hovering the badge shows: "Generated by LootVue AI engines. Based on [X] data sources as of [date]. Not financial advice."
3. **Page-level disclaimer**: One-time dismissible banner at the top of the dashboard: "AI analysis is informational only. Verify independently before making investment decisions."
4. **Source attribution inline**: Every AI claim cites the engine and data source, Perplexity-style: "Employment grew 3.2% [BLS] [FRED]".

---

### 2.8 Streaming AI Output

**How apps handle the "typing" animation:**

| App | Pattern | Details |
|-----|---------|---------|
| ChatGPT | Token-by-token with cursor | ~60fps rendering, markdown renders in real-time, blinking cursor at insertion point |
| Perplexity | Section-by-section | Sources load first, then answer streams below |
| Notion AI | Block-by-block | AI outputs full blocks (paragraphs, lists) that appear sequentially |
| Copilot | Ghost text fade-in | Dimmed text appears inline, no streaming animation for completions |

**Best practice for LootVue**: For the sidebar co-pilot (when user asks a custom question), use **streaming with markdown rendering** (ChatGPT pattern). For proactive narrator insights (card annotations, digests), use **pre-rendered content** -- no streaming animation. The reason: proactive insights should feel like content that was "already computed," not like an AI thinking in real-time. Streaming creates a "waiting" feeling that undermines the authority of proactive insights.

---

## 3. Recommendation for LootVue

### 3.1 The Unified AI UX Pattern

Based on all research, LootVue should implement a **three-surface AI system** that is consistent across all pages:

```
+--------------------------------------------------+
|  SURFACE 1: INLINE ANNOTATIONS                    |
|  (On every metric card and chart)                 |
|                                                   |
|  [Metric: Cap Rate 6.5%]                          |
|  AI: "Above market avg of 5.8%. Trending up       |
|       for 3 consecutive quarters." [FRED][Zillow]  |
|  [Why?] [Deep Dive ->]                            |
|                                                   |
+--------------------------------------------------+
|  SURFACE 2: EXPANDED INSIGHT CARDS                |
|  (On click of "Why?" or card expand)              |
|                                                   |
|  Factor Breakdown:                                |
|  - Employment Growth: +3.2% [BLS] ........ ===== |
|  - Permit Activity:   +18%  [Census] ..... ====  |
|  - Capital Inflow:    High  [IRS] ........ ===   |
|  - Inventory:         Low   [Realtor] .... ====  |
|                                                   |
|  Confidence: High (based on 12 data points)       |
|  [AI Analysis] Generated Mar 2026                 |
|                                                   |
+--------------------------------------------------+
|  SURFACE 3: SIDEBAR AI PANEL                      |
|  (Docked right, toggled via button)               |
|                                                   |
|  [Full AI narrative memo]                         |
|  [Engine-by-engine attribution]                   |
|  [Sensitivity analysis]                           |
|  [Source citations]                               |
|  [Ask a question: _______________]                |
|                                                   |
|  "What if rates increase 100bps?"                 |
|  -> [Streaming response with citations]           |
|                                                   |
+--------------------------------------------------+
```

### 3.2 Page-by-Page Application

| Page | Surface 1 (Inline) | Surface 2 (Expanded) | Surface 3 (Sidebar) |
|------|-------------------|---------------------|---------------------|
| **Dashboard** | 1-line verdict per market card | Factor decomposition | Full market memo + ask questions |
| **Market Intelligence** | Trend annotations on charts | Engine-by-engine signals | Deep analysis + comparison queries |
| **Deal Analyzer** | Metric explanations per KPI | Financial breakdown + sensitivity | Deal thesis memo + what-if scenarios |
| **Risk Assessment** | Risk score + 1-line per dimension | 7-dimension radar + factors | Full risk narrative + stress test results |
| **Portfolio** | Portfolio-level digest (Robinhood style) | Per-holding analysis | Portfolio optimization suggestions |
| **Signal Dashboard** | Confluence indicators + verdicts | Signal decomposition + timing | Signal deep dive + historical validation |
| **Capital Markets** | Rate commentary + market state | Rate sensitivity + comparisons | Full capital markets analysis |

### 3.3 Design Specifications

**AI Badge:**
- Text: "AI Analysis" (never sparkles alone)
- Color: Gold (#C9A227) text on dark surface, matching LootVue brand
- Size: 10px caps, monospace
- Position: Top-right of any AI-generated section
- On hover: Shows disclaimer tooltip

**"Why?" Button:**
- Icon: Lightbulb (Lucide `Lightbulb` icon, w-3.5 h-3.5)
- Position: Bottom-right of every metric card
- Behavior: Toggles expanded insight card inline
- Keyboard: `?` key when card is focused

**Sidebar Toggle:**
- Icon: Brain or message-circle icon (Lucide)
- Position: Fixed right edge of viewport, vertically centered
- Label: "AI Analyst"
- Width: 380px when open
- Behavior: Slides in from right, does not reduce main content on mobile (overlay)
- Keyboard: `Ctrl+Shift+A` / `Cmd+Shift+A`

**Confidence Display:**
- Primary: Range display ("$285K - $310K")
- Secondary: Color badge (emerald/amber/rose) + text ("High" / "Moderate" / "Low")
- On hover: "Based on X data points from Y sources. Last updated Z."
- Never: Bare percentages without context

**Source Citations:**
- Pattern: Inline [SOURCE] tags after every claim, Perplexity-style
- On hover: Source name, data series, last updated date
- Color: Gold-light (#E8C547) to distinguish from body text

**Streaming (Sidebar only):**
- Token-by-token at 60fps with blinking cursor
- Markdown renders in real-time
- Sources appear as they are referenced
- Skeleton placeholder for expected sections before content arrives

**Toggle AI Off:**
- Setting in user preferences: "AI Insights: On / Off"
- When off: All three surfaces hidden. Dashboard shows raw data only.
- Per-page toggle via sidebar button: "Hide AI on this page"
- Respects `prefers-reduced-motion` for streaming animations

### 3.4 What NOT to Do

Based on research, avoid these patterns:

1. **DO NOT make a chat-only AI experience.** Bloomberg, Robinhood, and Tableau all prove that proactive narration beats conversational AI for data dashboards. Chat is supplementary, not primary.

2. **DO NOT use the sparkle icon without a text label.** NN/g research shows 0% recognition. Use "AI Analysis" text badge instead.

3. **DO NOT show AI confidence as a bare percentage.** "85% confident" means nothing without "based on 12 data points across 3 sources." Always provide context.

4. **DO NOT stream proactive insights.** Pre-render narrator content so it feels authoritative. Only stream co-pilot responses (user-initiated questions).

5. **DO NOT put AI in a modal.** Modals break workflow on data dashboards. Use inline + sidebar exclusively for day-to-day use. Modals only for exportable reports.

6. **DO NOT use different AI patterns on different pages.** Consistency is critical. The same three-surface system (inline annotation, expanded card, sidebar panel) on every page.

7. **DO NOT let AI contradict engine calculations.** AI should narrate and explain engine outputs, never compute independently. If AI says "strong buy" but HyperScore is 35, the system has a bug.

8. **DO NOT hide the disclaimer.** EU AI Act (enforceable August 2026) requires clear labeling. Build it into the design now, not as an afterthought.

### 3.5 Priority Implementation Order

1. **Phase 1**: Inline annotations on metric cards (Surface 1). Highest impact, lowest complexity. Every metric card gets a 1-line AI verdict below the number.

2. **Phase 2**: Expanded insight cards with factor decomposition (Surface 2). "Why?" buttons on every card. Progressive disclosure of engine outputs.

3. **Phase 3**: Sidebar AI Analyst panel (Surface 3). Co-pilot mode with streaming. Custom questions and what-if scenarios. This requires Claude API integration.

4. **Phase 4**: AI toggle, user preferences, per-page control. Settings infrastructure.

---

## Sources

### Bloomberg Terminal / Bloomberg AI
- [Bloomberg to launch new AI tool for terminal](https://www.itbrew.com/stories/2025/11/19/bloomberg-new-ai-tool-for-terminal)
- [Bloomberg expands GenAI summary options on Terminal](https://www.waterstechnology.com/emerging-technologies/7952832/bloomberg-expands-genai-summary-options-on-terminal)
- [Inside the Bloomberg Terminal's AI](https://www.itbrew.com/stories/2025/11/06/inside-the-bloomberg-terminal-ai)
- [Bloomberg Launches Gen AI Summarization for News Content](https://www.bloomberg.com/company/press/bloomberg-launches-gen-ai-summarization-for-news-content/)
- [Bloomberg Accelerates Financial Analysis with Gen AI Document Insights](https://www.bloomberg.com/company/press/bloomberg-accelerates-financial-analysis-with-gen-ai-document-insights/)

### Robinhood / Wealthfront / Betterment
- [Robinhood Cortex Digests](https://robinhood.com/us/en/support/articles/cortex-digests/)
- [Robinhood unveils latest AI innovations](https://robinhood.com/us/en/newsroom/robinhood-presents-yes-no-event/)
- [Robinhood marries AI with prediction markets](https://www.axios.com/2025/12/17/ai-robinhood-stock-market)
- [Robinhood Unveils Powerful New Tools (HOOD Summit 2025)](https://robinhood.com/us/en/newsroom/hood-summit-2025-news/)
- [Six Wealthtech Apps with Outstanding UX](https://windmill.digital/six-wealthtech-apps-with-outstanding-ux/)
- [Designing products people trust -- Robinhood's UX playbook](https://www.usertesting.com/resources/podcast/intuitive-product-design-dheerja-kaur-robinhood)

### Reventure App
- [Reventure Home Price Forecast](https://www.reventure.app/forecast)
- [Reventure's 2025 US Housing Market Forecast](https://reventureapp.blog/reventures-2025-us-housing-market-forecast/)
- [Nick Gerli on Forecast Score](https://x.com/nickgerli1/status/1752414209374118020)

### Notion AI / Cursor / GitHub Copilot
- [Notion AI Inline: Complete Guide](https://www.eesel.ai/blog/notion-ai-inline)
- [How Notion utilizes visual design principles for AI adoption](https://medium.com/design-bootcamp/how-notion-utilize-visual-and-perceptual-design-principles-to-to-increase-new-ai-features-adoption-82e7f0dfcc4e)
- [Cursor Features](https://cursor.com/features)
- [Cursor AI Review 2026](https://prismic.io/blog/cursor-ai)
- [GitHub Copilot Inline Suggestions in VS Code](https://code.visualstudio.com/docs/copilot/ai-powered-suggestions)
- [Open Sourcing Inline AI in VS Code](https://windowsforum.com/threads/open-sourcing-inline-ai-in-vs-code-copilot-chat-consolidates-ghost-text.388269/)

### Perplexity AI / ChatGPT
- [AI UX Patterns: Citations (ShapeofAI)](https://www.shapeof.ai/patterns/citations)
- [Perplexity Platform Guide: Citation-Forward Answers](https://www.unusual.ai/blog/perplexity-platform-guide-design-for-citation-forward-answers)
- [How AI Engines Cite Sources](https://medium.com/@shuimuzhisou/how-ai-engines-cite-sources-patterns-across-chatgpt-claude-perplexity-and-sge-8c317777c71d)

### Figma AI / Canva AI
- [AI in Design: Transforming the Way We Create (Figma)](https://www.figma.com/resource-library/ai-in-design/)
- [Figma's 2025 Power-Play](https://medium.com/design-bootcamp/figmas-2025-power-play-redefining-design-workflows-with-ai-and-innovation-6875ba9b1d41)

### AI UX Pattern Libraries
- [Confidence Visualization Pattern](https://www.aiuxdesign.guide/patterns/confidence-visualization)
- [Progressive Disclosure Pattern](https://www.aiuxdesign.guide/patterns/progressive-disclosure)
- [Design Patterns for AI Interfaces (Smashing Magazine)](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)
- [Psychology of Trust in AI (Smashing Magazine)](https://www.smashingmagazine.com/2025/09/psychology-trust-ai-guide-measuring-designing-user-confidence/)
- [AI Design Patterns Enterprise Dashboards](https://www.aufaitux.com/blog/ai-design-patterns-enterprise-dashboards/)
- [Sparkles Icon Problem (NN/g)](https://www.nngroup.com/articles/ai-sparkles-icon-problem/)
- [Rise of the AI Sparkle Icon (Google Design)](https://design.google/library/ai-sparkle-icon-research-pozos-schmidt)

### Dashboard & Fintech UX
- [AI Dashboard Design Guide (Eleken)](https://www.eleken.co/blog-posts/ai-dashboard-design)
- [Fintech UX Best Practices 2026](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [Dashboard Design UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Fintech UI Examples (Eleken)](https://www.eleken.co/blog-posts/trusted-fintech-ui-examples)

### EU AI Act & Compliance
- [EU AI Act Overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [Article 50: Transparency Obligations](https://artificialintelligenceact.eu/article/50/)
- [Code of Practice on AI-Generated Content Labeling](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)

### Proptech & Real Estate AI
- [AI in Real Estate: 18 Companies (Built In)](https://builtin.com/artificial-intelligence/ai-real-estate)
- [AI Tools for Commercial Real Estate (Winter 2026)](https://www.adventuresincre.com/ai-tools-commercial-real-estate/)
- [Zillow Unveils ZillowPro AI](https://markets.financialcontent.com/wral/article/tokenring-2025-10-16-zillow-unveils-zillowpro-an-ai-powerhouse-to-revolutionize-real-estate-agent-workflows)

### Tableau / ThoughtSpot / Microsoft 365
- [How Tableau Pulse reimagines the data experience](https://www.tableau.com/blog/tableau-pulse-and-tableau-ai)
- [ThoughtSpot Sage](https://docs.thoughtspot.com/cloud/10.14.0.cl/search-sage)
- [Microsoft 365 Copilot (Ignite 2025)](https://www.microsoft.com/en-us/microsoft-365/blog/2025/11/18/microsoft-ignite-2025-copilot-and-agents-built-to-power-the-frontier-firm/)
- [Word, Excel, PowerPoint Agents](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/introducing-word-excel-and-powerpoint-agents-in-microsoft-365-copilot/4470604)
