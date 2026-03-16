---
name: plain-english
description: Add plain English explanations to metrics and signals. Use when building tooltips, info panels, or AI narrator content.
user-invocable: false
---

# Plain English Translation Rules

Every metric in LootVue must have a human-readable explanation at 8th grade reading level.

## MetricDisplay Interface

Every metric type definition must include these fields:

```typescript
interface MetricDisplay {
  value: number;
  label: string;
  plainEnglish: string;       // 8th grade reading level, 1-2 sentences
  causeAndEffect: string;     // 'When X happens, Y tends to follow because Z'
  historicalContext: string;   // 'Historically, markets with this pattern saw...'
  confidenceLevel: 'high' | 'medium' | 'low';
  asOfDate: string;           // ISO date of data freshness
  source: string;             // Data source attribution
}
```

## Writing Rules

1. **Target 8th grade reading level** — Flesch-Kincaid Grade Level <= 8.0
2. **Lead with what it means**, not what it is: "This property earns 6.5 cents for every dollar it costs" not "The capitalization rate is 6.5%"
3. **Use concrete dollar amounts** when possible: "You'd pocket $450/month after all bills" not "Positive cash flow"
4. **Avoid jargon without defining it first**: If you must use "DSCR", immediately follow with "(how much income covers the loan payment)"
5. **Round aggressively for plain English**: "about 7%" not "6.847%"
6. **Use comparisons**: "That's like earning a 7% savings account on your down payment"
7. **Show direction with plain words**: "Going up", "Slowing down", "Holding steady" — not just arrows

## Examples by Category

### Deal Metrics
- **Cap Rate 6.5%**: "For every $100 this property costs, it earns $6.50 per year before your mortgage. Higher is better for cash flow."
- **DSCR 1.35x**: "This property's income covers the loan payment 1.35 times over. Lenders usually want at least 1.20x. You have a comfortable cushion."
- **Cash-on-Cash 9.2%**: "For every dollar you put down, you're earning 9.2 cents per year in cash. That beats most stock dividends."
- **GRM 12.5**: "If you collected rent and saved every penny, it would take 12.5 years to pay off the purchase price."

### Market Signals
- **Permits up 34%**: "Builders are betting their own money that this market will grow. 34% more new homes are being started than usual."
- **HPI Momentum +2.1 sigma**: "Home prices are rising faster than normal. In the past, markets at this speed kept growing for another 12-18 months."
- **Confluence 3/3 bullish**: "All three signals agree: this market looks strong. When all signals line up like this, average returns have been +12.6%."
- **Divergence detected**: "The signals disagree. The market looks good on paper, but the timing feels risky. Dig deeper before committing."

### Stress Test
- **Survived 5/6 scenarios**: "We tested 6 bad-case scenarios (recession, rate spike, vacancy surge, etc.). This deal stays profitable in 5 of them. The main risk is an insurance cost spike."
- **Break-even vacancy 18%**: "You could have the property empty 18% of the time and still break even. The current vacancy rate in this area is 7%, so you have a big safety margin."

### Confidence Levels
- **High**: "Based on 10+ years of data from a reliable source."
- **Medium**: "Based on limited data or a source that updates infrequently."
- **Low**: "Estimated from regional averages. Actual numbers may differ significantly."

## Testing

- Run Flesch-Kincaid on every plainEnglish string — must score <= 8.0 grade level
- No sentence longer than 25 words
- No word longer than 3 syllables unless it's a proper noun or unavoidable term (then define it)
