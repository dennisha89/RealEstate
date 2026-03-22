/**
 * AI Insights — Plain-English metric interpretation engine
 *
 * Generates human-readable explanations, verdicts, and action recommendations
 * for every metric in the LootVue glossary. No AI API calls — this is deterministic
 * rule-based insight generation that runs instantly on the client.
 *
 * Rules:
 *   - Pure logic file. No React, no "use client", no side effects.
 *   - Every insight references the actual numeric value, never vague adjectives.
 *   - Language follows LootVue brand voice: confident, specific, conversational.
 *   - Context parameter enables comparative insights (market avg, portfolio avg, etc.).
 *   - Edge cases handled: null/undefined, NaN, Infinity, extreme outliers.
 */

import { METRIC_GLOSSARY } from './metric-glossary';
import type { MetricDefinition } from './metric-glossary';

// ============================================================
// Types
// ============================================================

export type InsightVerdict = 'good' | 'caution' | 'bad';

export interface MetricInsight {
  explanation: string;
  verdict: InsightVerdict;
  action: string;
  verdictLabel: string;
}

// ============================================================
// Verdict color mapping
// ============================================================

/**
 * Returns the Tailwind border-left class for a verdict.
 * Usage: `border-l-4 ${getVerdictColor(verdict)}`
 */
export function getVerdictColor(verdict: InsightVerdict): string {
  switch (verdict) {
    case 'good':
      return 'border-l-emerald';
    case 'caution':
      return 'border-l-amber';
    case 'bad':
      return 'border-l-rose';
  }
}

/**
 * Returns the badge CSS class for a verdict.
 * Maps to globals.css badge classes.
 */
export function getVerdictBadgeClass(verdict: InsightVerdict): string {
  switch (verdict) {
    case 'good':
      return 'badge-emerald';
    case 'caution':
      return 'badge-amber';
    case 'bad':
      return 'badge-rose';
  }
}

/**
 * Returns the hex color value for a verdict.
 * Use for inline styles or chart colors.
 */
export function getVerdictBorderColor(verdict: InsightVerdict): string {
  switch (verdict) {
    case 'good':
      return '#10B981';
    case 'caution':
      return '#F59E0B';
    case 'bad':
      return '#EF4444';
  }
}

// ============================================================
// Internal helpers
// ============================================================

/** Format currency with compact notation for large values */
function fmtCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a percentage value for display (input is already in display form, e.g. 6.5 = 6.5%) */
function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Format a ratio for display */
function fmtRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

/** Format a score for display */
function fmtScore(value: number): string {
  return `${Math.round(value)}/100`;
}

/** Format a multiple for display */
function fmtMultiple(value: number): string {
  return `${value.toFixed(2)}x`;
}

/** Format a value using the unit from its metric definition */
function fmtValue(value: number, unit: MetricDefinition['unit']): string {
  switch (unit) {
    case 'percent':
      return fmtPct(value);
    case 'currency':
      return fmtCurrency(value);
    case 'ratio':
      return fmtRatio(value);
    case 'score':
      return fmtScore(value);
    case 'multiple':
      return fmtMultiple(value);
    case 'months':
      return `${Math.round(value)} months`;
  }
}

// ============================================================
// Verdict logic
// ============================================================

/** Determine verdict for a standard "higher is better" metric */
function verdictHigherBetter(
  value: number,
  def: MetricDefinition
): InsightVerdict {
  if (def.badBelow !== undefined && value < def.badBelow) return 'bad';
  if (
    value >= def.goodRange[0] &&
    (value <= def.goodRange[1] || def.goodRange[1] === Infinity)
  ) {
    return 'good';
  }
  if (value >= def.cautionRange[0] && value <= def.cautionRange[1]) {
    return 'caution';
  }
  if (value < def.cautionRange[0]) return 'bad';
  return 'good';
}

/** Determine verdict for a "lower is better" metric */
function verdictLowerBetter(
  value: number,
  def: MetricDefinition
): InsightVerdict {
  if (def.badAbove !== undefined && value > def.badAbove) return 'bad';
  if (value >= def.goodRange[0] && value <= def.goodRange[1]) return 'good';
  if (value >= def.cautionRange[0] && value <= def.cautionRange[1]) {
    return 'caution';
  }
  if (value > def.cautionRange[1]) return 'bad';
  return 'good';
}

/** Metrics where lower values are better */
const LOWER_IS_BETTER = new Set([
  'grm',
  'risk_score',
  'price_to_rent',
  'price_to_income',
  'bubble_risk',
  'ltc',
  'break_even_occupancy',
  'mortgage_rate',
  'fed_funds',
  'vacancy_rate',
]);

function getVerdict(
  metric: string,
  value: number,
  def: MetricDefinition
): InsightVerdict {
  if (LOWER_IS_BETTER.has(metric)) {
    return verdictLowerBetter(value, def);
  }
  return verdictHigherBetter(value, def);
}

function verdictToLabel(verdict: InsightVerdict): string {
  switch (verdict) {
    case 'good':
      return 'Strong';
    case 'caution':
      return 'Caution';
    case 'bad':
      return 'Weak';
  }
}

/** Build a comparison snippet when marketAvg is available */
function compareToMarket(
  value: number,
  marketAvg: number,
  unit: MetricDefinition['unit'],
  lowerIsBetter: boolean
): string {
  const diff = value - marketAvg;
  const absDiff = Math.abs(diff);
  const pctDiff = marketAvg !== 0 ? Math.abs((diff / marketAvg) * 100) : 0;

  if (absDiff < 0.01) {
    return ` right at the ${fmtValue(marketAvg, unit)} market average`;
  }

  const direction = diff > 0 ? 'above' : 'below';
  const quality = lowerIsBetter
    ? diff < 0
      ? 'better'
      : 'worse'
    : diff > 0
      ? 'better'
      : 'worse';

  if (pctDiff < 5) {
    return ` close to the ${fmtValue(marketAvg, unit)} market average`;
  }

  return (
    ` ${direction} the ${fmtValue(marketAvg, unit)} market average` +
    ` (${quality} by ${fmtValue(absDiff, unit)})`
  );
}

// ============================================================
// Per-metric insight generators
// ============================================================

type InsightGenerator = (
  value: number,
  verdict: InsightVerdict,
  context?: Record<string, number>
) => { explanation: string; action: string };

const insightGenerators: Record<string, InsightGenerator> = {
  cap_rate: (value, verdict, ctx) => {
    const marketComp = ctx?.marketAvg
      ? ` —${compareToMarket(value, ctx.marketAvg, 'percent', false)}`
      : '';
    const centsPerDollar = value.toFixed(1);

    const explanation =
      verdict === 'good'
        ? `This property earns ${centsPerDollar} cents per dollar of value each year${marketComp}. That is solid cash flow potential.`
        : verdict === 'caution'
          ? `A ${fmtPct(value)} cap rate${marketComp} is on the lower end. You are paying a premium relative to the income.`
          : `At ${fmtPct(value)}${marketComp}, this cap rate barely beats a Treasury bond. You are paying for appreciation, not income.`;

    const action =
      verdict === 'good'
        ? 'Strong income relative to price. Verify it is not masking deferred maintenance or high turnover.'
        : verdict === 'caution'
          ? 'Moderate income potential. Run a stress test — does the deal survive a 200bps rate hike?'
          : 'The income does not justify the price. Unless you have a specific value-add thesis, look for better cash flow elsewhere.';

    return { explanation, action };
  },

  cash_flow: (value, verdict, ctx) => {
    const perMonth = fmtCurrency(value);
    const perYear = fmtCurrency(value * 12);
    const mortgageNote = ctx?.monthlyPayment
      ? ` on a ${fmtCurrency(ctx.monthlyPayment)}/month mortgage`
      : '';

    const explanation =
      verdict === 'good'
        ? `${perMonth}/month (${perYear}/year) in your pocket after all expenses${mortgageNote}. The tenant is paying your bills and then some.`
        : verdict === 'caution'
          ? `${perMonth}/month${mortgageNote}. Positive, but thin — one repair or vacant month erases months of profit.`
          : `You are losing ${fmtCurrency(Math.abs(value))}/month${mortgageNote}. That is ${fmtCurrency(Math.abs(value) * 12)}/year out of pocket to subsidize this property.`;

    const action =
      verdict === 'good'
        ? 'Healthy cash flow. Build 6 months of reserves and this deal has a real margin of safety.'
        : verdict === 'caution'
          ? 'Thin margin. Can you raise rent, reduce expenses, or negotiate the price down $10-20K?'
          : 'This property loses money monthly. Negotiate price down or increase rent before committing.';

    return { explanation, action };
  },

  dscr: (value, verdict, ctx) => {
    const pctCoverage = Math.round(value * 100);
    const shortfall =
      value < 1.0
        ? ` You would cover only ${pctCoverage}% of the mortgage from rent.`
        : '';
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${fmtRatio(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `The rental income covers the mortgage ${fmtRatio(value)} — the property earns ${Math.round((value - 1) * 100)}% more than the debt requires.${marketComp}`
        : verdict === 'caution'
          ? `DSCR of ${fmtRatio(value)} barely clears the mortgage.${marketComp} Most lenders want 1.25x minimum — you might face pushback on financing.`
          : `DSCR of ${fmtRatio(value)} means the rent does not cover the mortgage.${shortfall}${marketComp}`;

    const action =
      verdict === 'good'
        ? 'Comfortable debt coverage. This deal can absorb vacancy or rate increases without going negative.'
        : verdict === 'caution'
          ? 'Tight coverage. One vacant month or a 50bps rate increase could push you underwater. Stress test before committing.'
          : 'The income cannot service the debt. Either increase the down payment, find a lower rate, or raise rents to fix this.';

    return { explanation, action };
  },

  cash_on_cash: (value, verdict, ctx) => {
    const example = ctx?.cashInvested
      ? ` On your ${fmtCurrency(ctx.cashInvested)} invested, that is ${fmtCurrency((ctx.cashInvested * value) / 100)}/year in cash.`
      : '';
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${fmtPct(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `${fmtPct(value)} return on your actual cash invested.${example}${marketComp} Your money is working harder than a high-yield savings account.`
        : verdict === 'caution'
          ? `${fmtPct(value)} cash-on-cash.${example}${marketComp} Positive, but only modestly better than parking your money in index funds.`
          : `${fmtPct(value)} cash-on-cash.${example}${marketComp} A high-yield savings account pays 4-5% with zero effort — this barely justifies the risk and work.`;

    const action =
      verdict === 'good'
        ? 'Strong cash return. Your invested capital is earning well above passive alternatives.'
        : verdict === 'caution'
          ? 'Moderate return. The deal works, but is the effort worth 1-3% more than a savings account? Look for value-add to boost returns.'
          : 'The return does not compensate for the risk. Either negotiate price down or find a higher-rent property.';

    return { explanation, action };
  },

  irr: (value, verdict, ctx) => {
    const holdPeriod = ctx?.holdYears
      ? ` over a ${ctx.holdYears}-year hold`
      : '';
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${fmtPct(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `${fmtPct(value)} annualized total return${holdPeriod}${marketComp} — equivalent to a bank account compounding at ${fmtPct(value)} per year.`
        : verdict === 'caution'
          ? `${fmtPct(value)} IRR${holdPeriod}.${marketComp} Positive, but institutional investors typically target 15%+. Check if the exit assumptions are realistic.`
          : `${fmtPct(value)} IRR${holdPeriod}.${marketComp} This barely beats inflation. Unless you have a strong appreciation thesis, the risk is not worth the return.`;

    const action =
      verdict === 'good'
        ? 'Strong total return. Verify the exit cap rate and appreciation assumptions — IRR is only as good as its inputs.'
        : verdict === 'caution'
          ? 'Moderate return. Run the exit sensitivity table — does the IRR hold if exit cap rates widen by 100bps?'
          : 'Weak returns. Re-evaluate the purchase price, rent projections, and exit assumptions. Something needs to change.';

    return { explanation, action };
  },

  noi: (value, verdict, ctx) => {
    const annual = fmtCurrency(value);
    const monthly = fmtCurrency(value / 12);
    const marketComp = ctx?.marketAvg
      ? ` Market average for comparable properties: ${fmtCurrency(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `${annual}/year (${monthly}/month) in net operating income before debt service.${marketComp} The building earns enough to support solid financing terms.`
        : verdict === 'caution'
          ? `${annual}/year NOI.${marketComp} Enough to cover basic debt, but leaves limited room for error.`
          : `${annual}/year NOI.${marketComp} This level of income makes it difficult to finance or generate meaningful returns.`;

    const action =
      verdict === 'good'
        ? 'Healthy operating income. Verify expenses are realistic — underestimated maintenance or taxes will erode this.'
        : verdict === 'caution'
          ? 'Moderate NOI. Look for expense reduction opportunities or rent upside to improve this number.'
          : 'Low NOI signals either high expenses or low rent. Investigate both before proceeding.';

    return { explanation, action };
  },

  grm: (value, verdict, ctx) => {
    const yearsText = value.toFixed(1);
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${ctx.marketAvg.toFixed(1)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `GRM of ${yearsText} — the purchase price equals ${yearsText} years of gross rent.${marketComp} That is a favorable price-to-rent relationship.`
        : verdict === 'caution'
          ? `GRM of ${yearsText}.${marketComp} The price is getting stretched relative to rent — you are starting to pay for appreciation rather than income.`
          : `GRM of ${yearsText}.${marketComp} You are paying more than 16 years of gross rent for this property. That is speculative pricing.`;

    const action =
      verdict === 'good'
        ? 'Favorable price relative to rent. Confirm the rents are market-rate and not inflated by above-market leases.'
        : verdict === 'caution'
          ? 'Elevated GRM. This deal only works if rents increase or you plan to force appreciation through renovation.'
          : 'Price is disconnected from income. Unless strong appreciation is near-certain, find a better-priced property.';

    return { explanation, action };
  },

  hyper_score: (value, verdict, ctx) => {
    const score = Math.round(value);
    const confidence = ctx?.confidence
      ? ` (${Math.round(ctx.confidence)}% data confidence)`
      : '';

    const explanation =
      verdict === 'good'
        ? `HyperScore ${score}/100${confidence}. The property performs well across most analysis dimensions — financials, market, demographics, and risk.`
        : verdict === 'caution'
          ? `HyperScore ${score}/100${confidence}. Mixed signals — some dimensions are strong while others flag concerns. Dig into the dimension breakdown.`
          : `HyperScore ${score}/100${confidence}. Multiple dimensions are underperforming. This property has fundamental issues across the board.`;

    const action =
      verdict === 'good'
        ? 'Strong composite score. Check which dimensions drive the score highest — that is your thesis.'
        : verdict === 'caution'
          ? 'Review the dimension breakdown. One weak dimension (like macro risk) can be acceptable; three weak dimensions is a pattern.'
          : 'Multiple red flags. Unless you have a specific catalyst that will change the fundamentals, pass on this one.';

    return { explanation, action };
  },

  deal_grade: (value, verdict, ctx) => {
    const score = Math.round(value);
    const marketComp = ctx?.marketAvg
      ? ` Average deal in this market scores ${Math.round(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `Deal Grade ${score}/100.${marketComp} The transaction fundamentals are strong — cash flow, returns, and comp positioning all check out.`
        : verdict === 'caution'
          ? `Deal Grade ${score}/100.${marketComp} The deal is marginal. It might work with negotiation or a value-add strategy, but the numbers are not compelling as-is.`
          : `Deal Grade ${score}/100.${marketComp} The fundamentals are weak. You would need significant improvement in price or rents to make this work.`;

    const action =
      verdict === 'good'
        ? 'Strong deal. Move to due diligence and verify the data behind the score.'
        : verdict === 'caution'
          ? 'Marginal deal. Identify the 1-2 weakest metrics and see if they can be improved through negotiation or value-add.'
          : 'Weak deal. Unless the price drops significantly or you have a clear turnaround plan, keep looking.';

    return { explanation, action };
  },

  risk_score: (value, verdict) => {
    const score = Math.round(value);

    const explanation =
      verdict === 'good'
        ? `Risk Score ${score}/100. Low downside exposure — the deal can weather most adverse scenarios without significant loss.`
        : verdict === 'caution'
          ? `Risk Score ${score}/100. Moderate risk. Some vulnerabilities exist — rate sensitivity, market volatility, or structural factors need attention.`
          : `Risk Score ${score}/100. High downside exposure. This deal is vulnerable to rate hikes, vacancy spikes, or market corrections.`;

    const action =
      verdict === 'good'
        ? 'Low risk profile. Still run the stress test to confirm — but the fundamentals provide a good cushion.'
        : verdict === 'caution'
          ? 'Identify which risk dimensions are elevated. Can you mitigate them (lock rates, improve occupancy, reduce leverage)?'
          : 'High risk. Consider reducing leverage, increasing reserves, or finding a less exposed property.';

    return { explanation, action };
  },

  stress_resilience: (value, verdict) => {
    const score = Math.round(value);

    const explanation =
      verdict === 'good'
        ? `Stress Resilience ${score}/100. This deal stays cash-flow positive through most adverse scenarios — rate spikes, vacancy surges, rent declines.`
        : verdict === 'caution'
          ? `Stress Resilience ${score}/100. The deal survives mild stress but struggles under severe scenarios. One major shock could push you underwater.`
          : `Stress Resilience ${score}/100. The deal breaks under stress. A 200bps rate hike or doubled vacancy would cause monthly losses.`;

    const action =
      verdict === 'good'
        ? 'Resilient deal. Build 6 months of reserves and you are well-positioned for downturns.'
        : verdict === 'caution'
          ? 'Build larger cash reserves (9-12 months). Consider a rate lock or cap to limit interest rate exposure.'
          : 'Fragile deal. Either reduce leverage, negotiate a lower price, or build a 12+ month cash reserve before committing.';

    return { explanation, action };
  },

  price_to_rent: (value, verdict, ctx) => {
    const ratio = value.toFixed(1);
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${ctx.marketAvg.toFixed(1)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `Price-to-Rent ratio of ${ratio}.${marketComp} The property is priced attractively relative to the rent it generates — buying makes more financial sense than renting.`
        : verdict === 'caution'
          ? `Price-to-Rent of ${ratio}.${marketComp} Prices are moderately stretched relative to rents. The income alone does not fully justify the price.`
          : `Price-to-Rent of ${ratio}.${marketComp} Prices have run well ahead of rents — this is appreciation territory, not income investing.`;

    const action =
      verdict === 'good'
        ? 'Income justifies the price. Confirm rents are sustainable by checking comparable listings and lease terms.'
        : verdict === 'caution'
          ? 'The deal relies partly on appreciation. Make sure you have a thesis for price growth, not just current income.'
          : 'Unless you are betting on strong appreciation, the price is too high relative to the rent. Wait for a correction or find better-priced inventory.';

    return { explanation, action };
  },

  price_to_income: (value, verdict, ctx) => {
    const ratio = value.toFixed(1);
    const marketComp = ctx?.marketAvg
      ? ` National average: ${ctx.marketAvg.toFixed(1)}x.`
      : '';

    const explanation =
      verdict === 'good'
        ? `Price-to-Income of ${ratio}x.${marketComp} Homes cost about ${ratio} years of the median household income — the buyer pool is deep and healthy.`
        : verdict === 'caution'
          ? `Price-to-Income of ${ratio}x.${marketComp} Affordability is stretched. Buyers need high incomes or low rates to qualify, which narrows the pool.`
          : `Price-to-Income of ${ratio}x.${marketComp} Homes cost ${ratio} years of income — that is historically unsustainable. Demand is fragile.`;

    const action =
      verdict === 'good'
        ? 'Affordable market. Strong buyer pool supports resale values and limits downside risk.'
        : verdict === 'caution'
          ? 'Monitor rate trends closely. If rates rise further, affordability will crack and demand will drop.'
          : 'Affordability crisis territory. The exit strategy depends on wage growth or rate cuts — both uncertain. Stress test the exit price.';

    return { explanation, action };
  },

  bubble_risk: (value, verdict) => {
    const score = Math.round(value);

    const explanation =
      verdict === 'good'
        ? `Bubble Risk ${score}/100. Prices are grounded in fundamentals — income, rent, and credit metrics are aligned with historical norms.`
        : verdict === 'caution'
          ? `Bubble Risk ${score}/100. Some froth detected. Prices are stretching beyond what income and rent fundamentals support.`
          : `Bubble Risk ${score}/100. The market shows statistical signatures similar to pre-correction periods. Prices have disconnected from fundamentals.`;

    const action =
      verdict === 'good'
        ? 'Low bubble risk. The market is rationally priced. Proceed with normal due diligence.'
        : verdict === 'caution'
          ? 'Elevated risk. Stress test with a 10-15% price decline scenario. Ensure you can hold through a correction.'
          : 'High bubble risk. Do not buy at the peak. Either wait for a correction, negotiate a significant discount, or invest in a lower-risk market.';

    return { explanation, action };
  },

  leading_indicator: (value, verdict) => {
    const score = Math.round(value);

    const explanation =
      verdict === 'good'
        ? `Leading Indicator ${score}/100. Forward-looking signals are positive — permit activity, employment growth, and demand metrics suggest momentum over the next 6-18 months.`
        : verdict === 'caution'
          ? `Leading Indicator ${score}/100. Mixed forward signals. Some metrics point up, others flat or declining. The market could go either way.`
          : `Leading Indicator ${score}/100. Forward signals are weakening — falling permits, rising days on market, or employment deceleration suggest headwinds ahead.`;

    const action =
      verdict === 'good'
        ? 'Tailwinds ahead. If the deal works on current numbers, positive momentum improves the upside case.'
        : verdict === 'caution'
          ? 'Neutral outlook. The deal needs to work on current numbers — do not rely on future appreciation to make it profitable.'
          : 'Headwinds detected. Buy only at a discount large enough to absorb a 6-12 month market softening.';

    return { explanation, action };
  },

  consensus: (value, verdict) => {
    const score = Math.round(value);

    const explanation =
      verdict === 'good'
        ? `Consensus ${score}/100. LootVue's analysis engines strongly agree — the financial, market, risk, and timing signals all point in the same direction.`
        : verdict === 'caution'
          ? `Consensus ${score}/100. Engines are split. Some dimensions look good while others raise concerns — the picture is not clean.`
          : `Consensus ${score}/100. Engines disagree significantly. The signals are conflicting — this deal needs deeper investigation before any decision.`;

    const action =
      verdict === 'good'
        ? 'High conviction signal. The data aligns across all dimensions — act on the verdict with confidence.'
        : verdict === 'caution'
          ? 'Investigate the disagreeing engines. Which dimension is the outlier? Is it a data gap or a genuine red flag?'
          : 'Low consensus means high uncertainty. Do not act until you understand why the engines disagree. Run additional research on the weakest dimensions.';

    return { explanation, action };
  },

  debt_yield: (value, verdict, ctx) => {
    const loanNote = ctx?.loanAmount
      ? ` on a ${fmtCurrency(ctx.loanAmount)} loan`
      : '';
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${fmtPct(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `${fmtPct(value)} debt yield${loanNote}.${marketComp} The property income can comfortably service and repay the debt — lenders will view this favorably.`
        : verdict === 'caution'
          ? `${fmtPct(value)} debt yield${loanNote}.${marketComp} Acceptable to most lenders, but leaves limited margin. Some CMBS lenders may push back.`
          : `${fmtPct(value)} debt yield${loanNote}.${marketComp} Below institutional lending thresholds. You may face difficulty securing competitive financing.`;

    const action =
      verdict === 'good'
        ? 'Strong debt metrics. You will qualify for competitive loan terms. Shop multiple lenders for the best rate.'
        : verdict === 'caution'
          ? 'Borderline. Lenders may price in higher risk. Consider a larger down payment to improve the ratio.'
          : 'Low debt yield. Either increase NOI, reduce the loan request, or seek alternative financing (portfolio lender, private capital).';

    return { explanation, action };
  },

  ltc: (value, verdict, ctx) => {
    const equityPct = 100 - value;
    const totalCostNote = ctx?.totalCost
      ? ` on a ${fmtCurrency(ctx.totalCost)} total project cost`
      : '';

    const explanation =
      verdict === 'good'
        ? `${fmtPct(value)} loan-to-cost${totalCostNote}. You are contributing ${equityPct.toFixed(0)}% equity — plenty of cushion against value declines.`
        : verdict === 'caution'
          ? `${fmtPct(value)} LTC${totalCostNote}. Moderate leverage. A 15-25% value decline would erode your equity position significantly.`
          : `${fmtPct(value)} LTC${totalCostNote}. Highly leveraged — only ${equityPct.toFixed(0)}% equity. A ${Math.round(equityPct)}% price drop wipes out your entire investment.`;

    const action =
      verdict === 'good'
        ? 'Conservative leverage. Your equity position can absorb market downturns.'
        : verdict === 'caution'
          ? 'Moderate leverage. Build a larger cash reserve to offset the thinner equity cushion.'
          : 'High leverage. Consider increasing your down payment, or ensure the property has a clear path to value appreciation.';

    return { explanation, action };
  },

  equity_multiple: (value, verdict, ctx) => {
    const holdNote = ctx?.holdYears ? ` over ${ctx.holdYears} years` : '';
    const cashExample = ctx?.cashInvested
      ? ` Every $100,000 invested becomes ${fmtCurrency(value * 100_000)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `${fmtMultiple(value)} equity multiple${holdNote}.${cashExample} For every dollar invested, you get ${fmtCurrency(value)} back.`
        : verdict === 'caution'
          ? `${fmtMultiple(value)} equity multiple${holdNote}. Your money grows, but modestly. After inflation and opportunity cost, the real return is thin.`
          : `${fmtMultiple(value)} equity multiple${holdNote}. Your money barely grows — ${value < 1.0 ? 'and you actually lose capital' : 'the return does not justify the illiquidity and risk'}.`;

    const action =
      verdict === 'good'
        ? 'Strong wealth creation. Verify the exit assumptions — equity multiple is only as real as the sale price.'
        : verdict === 'caution'
          ? 'Moderate growth. Look for value-add opportunities (renovation, rent increases, expense reduction) to push the multiple higher.'
          : 'Weak returns. Re-evaluate the deal. At this multiple, your capital is better deployed elsewhere.';

    return { explanation, action };
  },

  break_even_occupancy: (value, verdict) => {
    const pct = fmtPct(value);
    const vacancyCushion = 100 - value;

    const explanation =
      verdict === 'good'
        ? `Break-even at ${pct} occupancy. You can handle ${vacancyCushion.toFixed(0)}% vacancy before losing money — a healthy margin of safety.`
        : verdict === 'caution'
          ? `Break-even at ${pct} occupancy. Only ${vacancyCushion.toFixed(0)}% vacancy margin before you are out of pocket. One prolonged vacancy hurts.`
          : `Break-even at ${pct} occupancy. You need nearly full occupancy to stay afloat. One vacant unit or one slow month creates a loss.`;

    const action =
      verdict === 'good'
        ? 'Strong vacancy cushion. Even in a soft market, this property stays cash-flow positive.'
        : verdict === 'caution'
          ? 'Thin margin. Screen tenant quality carefully and maintain the property to minimize turnover.'
          : 'Dangerous. You cannot afford any vacancy. Reduce the purchase price, lower expenses, or increase rents to improve this ratio.';

    return { explanation, action };
  },

  mortgage_rate: (value, verdict, ctx) => {
    const monthlyPayment = ctx?.monthlyPayment
      ? `${fmtCurrency(ctx.monthlyPayment)}/month`
      : '';
    const loanNote = ctx?.loanAmount
      ? ` on a ${fmtCurrency(ctx.loanAmount)} loan`
      : '';
    const paymentSnippet =
      monthlyPayment && loanNote
        ? ` At ${fmtPct(value)}, a${loanNote.trim()} costs ${monthlyPayment}.`
        : '';

    const explanation =
      verdict === 'good'
        ? `${fmtPct(value)} mortgage rate.${paymentSnippet} Historically favorable borrowing conditions — more of your payment builds equity.`
        : verdict === 'caution'
          ? `${fmtPct(value)} mortgage rate.${paymentSnippet} Elevated but not prohibitive. The bank takes a larger share of each payment.`
          : `${fmtPct(value)} mortgage rate.${paymentSnippet} High cost of capital. More than two-thirds of early payments go to interest, not equity.`;

    const action =
      verdict === 'good'
        ? 'Favorable rate. Consider locking if buying now — these conditions may not last.'
        : verdict === 'caution'
          ? 'Rates are elevated. Lock if buying now, but set a rate alert for refinancing below 6%.'
          : 'Expensive money. Run the deal at this rate — if it still works, buy. If not, wait for rates to moderate or negotiate a lower price.';

    return { explanation, action };
  },

  fed_funds: (value, verdict) => {
    const explanation =
      verdict === 'good'
        ? `Fed funds at ${fmtPct(value)}. Accommodative monetary policy — cheap money supports asset prices and keeps mortgage rates lower.`
        : verdict === 'caution'
          ? `Fed funds at ${fmtPct(value)}. Neutral territory. The Fed is neither stimulating nor restricting — market direction depends on economic data.`
          : `Fed funds at ${fmtPct(value)}. Restrictive policy. The Fed is actively slowing the economy, which pressures property values and tightens lending.`;

    const action =
      verdict === 'good'
        ? 'Low rates support real estate. Take advantage of cheap financing, but plan for eventual rate normalization.'
        : verdict === 'caution'
          ? 'Watch FOMC statements for direction signals. The next 100bps of movement matters more than the current level.'
          : 'High rates compress valuations. Focus on cash-flow deals that work at current rates — do not rely on rate cuts to make the numbers work.';

    return { explanation, action };
  },

  vacancy_rate: (value, verdict, ctx) => {
    const marketComp = ctx?.marketAvg
      ? ` Market average: ${fmtPct(ctx.marketAvg)}.`
      : '';

    const explanation =
      verdict === 'good'
        ? `${fmtPct(value)} vacancy rate.${marketComp} Tight market — landlords have pricing power and tenants are competing for units.`
        : verdict === 'caution'
          ? `${fmtPct(value)} vacancy.${marketComp} Normal to slightly elevated. Sufficient demand exists, but landlords cannot push rents aggressively.`
          : `${fmtPct(value)} vacancy.${marketComp} Weak demand signal. Units are sitting empty, which pressures rents downward and increases marketing costs.`;

    const action =
      verdict === 'good'
        ? 'Low vacancy supports rent growth. Be cautious of overbuilding — check the supply pipeline for new construction.'
        : verdict === 'caution'
          ? 'Moderate vacancy. Ensure your pro forma uses at least this vacancy rate, not the optimistic 5% default.'
          : 'High vacancy. Investigate the cause — oversupply, population decline, or economic weakness? Adjust your pro forma vacancy assumption upward.';

    return { explanation, action };
  },

  market_forecast: (value, verdict) => {
    const score = Math.round(value);

    const explanation =
      verdict === 'good'
        ? `Market Forecast ${score}/100. Forward-looking data points to favorable conditions — population growth, job creation, and limited supply support appreciation.`
        : verdict === 'caution'
          ? `Market Forecast ${score}/100. Neutral outlook. The market is not clearly strengthening or weakening — expect flat to modest growth.`
          : `Market Forecast ${score}/100. Headwinds ahead. Employment, demographic, or supply trends suggest the market may soften over the next 12-24 months.`;

    const action =
      verdict === 'good'
        ? 'Favorable outlook. If the deal works on current fundamentals, the tailwind improves the upside.'
        : verdict === 'caution'
          ? 'Do not count on appreciation. The deal must work on current income — treat any price growth as a bonus.'
          : 'Defensive positioning. Buy only with a significant margin of safety, or wait for clearer signals before entering this market.';

    return { explanation, action };
  },
};

// ============================================================
// Main export
// ============================================================

/**
 * Generate a plain-English insight for a metric value.
 *
 * @param metric  - Key from METRIC_GLOSSARY (e.g., 'cap_rate', 'dscr')
 * @param value   - The numeric value to interpret
 * @param context - Optional comparative data (marketAvg, monthlyPayment, loanAmount, etc.)
 * @returns MetricInsight with explanation, verdict, action, and verdictLabel
 *
 * @example
 * ```ts
 * const insight = getMetricInsight('cap_rate', 6.5, { marketAvg: 5.8 });
 * // insight.verdict === 'good'
 * // insight.explanation includes "6.5 cents per dollar" and market comparison
 * ```
 */
export function getMetricInsight(
  metric: string,
  value: number,
  context?: Record<string, number>
): MetricInsight {
  const def = METRIC_GLOSSARY[metric];

  // Unknown metric — return a safe fallback
  if (!def) {
    return {
      explanation: `${metric}: ${value}. No interpretation available for this metric.`,
      verdict: 'caution',
      action: 'Verify this metric against industry benchmarks before acting on it.',
      verdictLabel: 'Caution',
    };
  }

  // Handle edge cases: NaN, null-ish, Infinity
  if (value === null || value === undefined || Number.isNaN(value)) {
    return {
      explanation: `${def.fullName}: data unavailable. Cannot generate an assessment without a value.`,
      verdict: 'caution',
      action:
        'Missing data. Verify the input sources and ensure the calculation completed successfully.',
      verdictLabel: 'Caution',
    };
  }

  // Handle positive Infinity
  if (!Number.isFinite(value) && value > 0) {
    return {
      explanation: `${def.fullName} is extremely high — likely a data issue or edge case (e.g., no debt, no expenses).`,
      verdict: 'caution',
      action:
        'Verify inputs. Infinite or extremely large values usually indicate a zero denominator or missing data.',
      verdictLabel: 'Caution',
    };
  }

  // Handle negative Infinity
  if (!Number.isFinite(value) && value < 0) {
    return {
      explanation: `${def.fullName} is negative infinity — this indicates a calculation error or impossible scenario.`,
      verdict: 'bad',
      action:
        'Check the underlying inputs. A negative infinite value should not occur under normal conditions.',
      verdictLabel: 'Weak',
    };
  }

  // Determine verdict from thresholds
  const verdict = getVerdict(metric, value, def);
  const verdictLabel = verdictToLabel(verdict);

  // Generate the insight using the metric-specific generator
  const generator = insightGenerators[metric];

  if (generator) {
    const { explanation, action } = generator(value, verdict, context);
    return { explanation, verdict, action, verdictLabel };
  }

  // Fallback for metrics without a custom generator (should not happen
  // since all 24 are implemented, but safety first)
  const formatted = fmtValue(value, def.unit);
  return {
    explanation: `${def.fullName}: ${formatted}. ${def.oneLiner}`,
    verdict,
    action:
      verdict === 'good'
        ? `${def.name} is in the healthy range. Continue with due diligence.`
        : verdict === 'caution'
          ? `${def.name} is borderline. Investigate further before committing.`
          : `${def.name} is outside healthy ranges. Address this before proceeding.`,
    verdictLabel,
  };
}
