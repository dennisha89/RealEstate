/**
 * Metric Glossary — Centralized dictionary of all real estate investment metrics
 *
 * Every metric used across LootVue's engines, dashboards, and AI outputs
 * is defined here with thresholds, plain-English explanations, and analogies.
 *
 * Threshold sources:
 *   - Cap rate, DSCR, debt yield: OCC Comptroller's Handbook — CRE Lending
 *   - Cash-on-cash, IRR, equity multiple: Adventures in CRE, Wall Street Prep
 *   - GRM, price-to-rent, price-to-income: Campbell et al. (2009), UBS Bubble Index
 *   - Bubble risk: Dallas Fed IHO, BIS Working Paper No. 17
 *   - Vacancy: Census Housing Vacancy Survey historical benchmarks
 *   - Mortgage/fed funds: FRED historical ranges and FOMC projections
 *
 * Rules:
 *   - Pure data file. No React, no "use client", no side effects.
 *   - Percentages stored as display values (6.5 means 6.5%), not decimals.
 *   - goodRange/cautionRange are inclusive on both ends.
 *   - For "lower is better" metrics (GRM, risk_score, etc.),
 *     goodRange[0] < goodRange[1] still holds, but badAbove is set instead of badBelow.
 */

export interface MetricDefinition {
  name: string;
  fullName: string;
  oneLiner: string;
  explain: string;
  goodRange: [number, number];
  cautionRange: [number, number];
  badBelow?: number;
  badAbove?: number;
  unit: 'percent' | 'ratio' | 'currency' | 'score' | 'months' | 'multiple';
  analogies: string;
  source: string;
}

export const METRIC_GLOSSARY: Record<string, MetricDefinition> = {
  // ────────────────────────────────────────────────────────────
  // 1. Capitalization Rate
  // ────────────────────────────────────────────────────────────
  cap_rate: {
    name: 'Cap Rate',
    fullName: 'Capitalization Rate',
    oneLiner: 'Annual income as a percentage of property price.',
    explain:
      'Cap rate tells you how much income a property generates relative to what you paid for it, ' +
      'ignoring financing. Take the annual net operating income (rent minus operating costs, but ' +
      'before mortgage payments), divide by the purchase price, and multiply by 100. A 7% cap rate ' +
      'on a $300,000 property means it produces $21,000 in net income per year. Higher cap rates ' +
      'mean more income per dollar spent, but they often come with more risk — there is a reason ' +
      'the price is low relative to the rent.',
    goodRange: [5, 10],
    cautionRange: [3, 5],
    badBelow: 3,
    unit: 'percent',
    analogies:
      'Think of cap rate like the interest rate on a savings account, but for buildings. ' +
      'A 7% cap rate means your building "pays" you 7 cents per year for every dollar of value. ' +
      'A Treasury bond pays ~4% with zero effort; your building needs to beat that to justify the work.',
    source: 'OCC Comptroller\'s Handbook — Commercial Real Estate Lending',
  },

  // ────────────────────────────────────────────────────────────
  // 2. Monthly Cash Flow
  // ────────────────────────────────────────────────────────────
  cash_flow: {
    name: 'Cash Flow',
    fullName: 'Monthly Cash Flow',
    oneLiner: 'Money left in your pocket after all bills are paid.',
    explain:
      'Monthly cash flow is the simplest truth in real estate: rent collected minus every single ' +
      'expense — mortgage, taxes, insurance, maintenance, vacancies, management. If this number ' +
      'is positive, the tenant is paying your bills and you pocket the rest. If it is negative, ' +
      'you are subsidizing a tenant\'s housing out of your own pocket every month. ' +
      'Professional investors target at least $200/month per unit as a minimum floor.',
    goodRange: [200, Infinity],
    cautionRange: [0, 200],
    badBelow: 0,
    unit: 'currency',
    analogies:
      'Cash flow is your "paycheck" from the property. A $200/month cash flow is like a part-time ' +
      'job that pays you $2,400/year to own something that someone else is buying for you. ' +
      'Negative cash flow is the opposite: you are paying to go to work.',
    source: 'BiggerPockets Cash Flow Calculator methodology',
  },

  // ────────────────────────────────────────────────────────────
  // 3. DSCR
  // ────────────────────────────────────────────────────────────
  dscr: {
    name: 'DSCR',
    fullName: 'Debt Service Coverage Ratio',
    oneLiner: 'How many times the income covers the mortgage payment.',
    explain:
      'DSCR divides the net operating income by the total annual debt payments (principal + interest). ' +
      'A DSCR of 1.0 means the property earns exactly enough to cover the mortgage — nothing left over. ' +
      'Banks typically require 1.25x or higher before they will lend, meaning the property earns ' +
      '25% more than the mortgage demands. Below 1.0 means the rent does not cover the loan ' +
      'and you are writing checks out of pocket every month.',
    goodRange: [1.25, Infinity],
    cautionRange: [1.0, 1.25],
    badBelow: 1.0,
    unit: 'ratio',
    analogies:
      'Imagine your rent is your "salary" and your mortgage is your "rent." A DSCR of 1.25 means ' +
      'you earn $1.25 for every $1.00 you owe. Anything below 1.0 is like a job that does not ' +
      'cover your rent — you are dipping into savings every month.',
    source: 'OCC Comptroller\'s Handbook — DSCR thresholds for commercial lending',
  },

  // ────────────────────────────────────────────────────────────
  // 4. Cash-on-Cash Return
  // ────────────────────────────────────────────────────────────
  cash_on_cash: {
    name: 'Cash-on-Cash',
    fullName: 'Cash-on-Cash Return',
    oneLiner: 'Annual cash income divided by the cash you invested.',
    explain:
      'Cash-on-cash return measures how hard your actual out-of-pocket money is working. ' +
      'Take the annual pre-tax cash flow, divide by the total cash you invested (down payment, ' +
      'closing costs, renovation). If you put $60,000 into a deal and it spins off $6,000/year ' +
      'in cash flow, that is a 10% cash-on-cash return. This metric ignores appreciation, ' +
      'principal paydown, and tax benefits — it only measures cash you can spend.',
    goodRange: [8, 20],
    cautionRange: [4, 8],
    badBelow: 4,
    unit: 'percent',
    analogies:
      'If you put $50,000 in a high-yield savings account at 5%, you earn $2,500/year doing nothing. ' +
      'Cash-on-cash asks: does your rental property beat that lazy money? ' +
      'At 10% CoC, your $50,000 earns $5,000/year — double the savings account, but with work.',
    source: 'Adventures in CRE — Cash-on-Cash Return methodology',
  },

  // ────────────────────────────────────────────────────────────
  // 5. Internal Rate of Return
  // ────────────────────────────────────────────────────────────
  irr: {
    name: 'IRR',
    fullName: 'Internal Rate of Return',
    oneLiner: 'Total annualized return including cash flow, appreciation, and sale.',
    explain:
      'IRR is the gold standard metric in institutional real estate. It accounts for everything: ' +
      'the timing of every dollar in and every dollar out, including your initial investment, ' +
      'annual cash flows, principal paydown, and the eventual sale. ' +
      'It answers: "What annual return would a bank account need to offer to match this deal?" ' +
      'An IRR of 15% means the deal, over its full life, is equivalent to a savings account ' +
      'compounding at 15% per year. Higher is better, but verify the assumptions behind it — ' +
      'IRR is very sensitive to exit price and hold period.',
    goodRange: [12, 25],
    cautionRange: [6, 12],
    badBelow: 6,
    unit: 'percent',
    analogies:
      'IRR is the "everything bagel" of returns. Cash-on-cash is the cream cheese (cash income). ' +
      'Appreciation is the lox. Tax benefits are the capers. IRR wraps them all into one annualized ' +
      'number so you can compare a rental property to an index fund, a business, or any other investment.',
    source: 'Wall Street Prep — IRR methodology; Newton-Raphson implementation per Appraisal Institute',
  },

  // ────────────────────────────────────────────────────────────
  // 6. Net Operating Income
  // ────────────────────────────────────────────────────────────
  noi: {
    name: 'NOI',
    fullName: 'Net Operating Income',
    oneLiner: 'Annual income after operating costs, before mortgage.',
    explain:
      'Net operating income is the property\'s "salary" — total rental income minus all operating ' +
      'expenses (taxes, insurance, maintenance, management, vacancy), but before any mortgage payments. ' +
      'NOI is financing-neutral: it tells you what the building earns regardless of how you pay for it. ' +
      'Investors and lenders use NOI as the foundation for cap rate, DSCR, and debt yield. ' +
      'If NOI is low, no amount of clever financing can save a bad deal.',
    goodRange: [15000, Infinity],
    cautionRange: [5000, 15000],
    badBelow: 5000,
    unit: 'currency',
    analogies:
      'NOI is like a business\'s operating profit. Revenue (rent) minus cost of doing business ' +
      '(taxes, insurance, repairs) equals what the "company" earns. The mortgage is like the ' +
      'business loan you used to buy the company — it matters, but NOI tells you if the business ' +
      'itself is healthy.',
    source: 'Appraisal Institute — Income Capitalization Approach',
  },

  // ────────────────────────────────────────────────────────────
  // 7. Gross Rent Multiplier (lower is better)
  // ────────────────────────────────────────────────────────────
  grm: {
    name: 'GRM',
    fullName: 'Gross Rent Multiplier',
    oneLiner: 'Years of gross rent needed to pay the full purchase price.',
    explain:
      'Gross Rent Multiplier is the fastest, dirtiest valuation shortcut in real estate. ' +
      'Divide the purchase price by the annual gross rent. A GRM of 10 means you would recoup the ' +
      'purchase price in 10 years of gross rent (before expenses). Lower is better — it means the ' +
      'price is cheap relative to the rent. A GRM above 16 usually means you are paying for ' +
      'appreciation potential, not income. This metric ignores expenses entirely, so always ' +
      'pair it with cap rate or cash flow.',
    goodRange: [1, 12],
    cautionRange: [12, 16],
    badAbove: 16,
    unit: 'multiple',
    analogies:
      'GRM is like asking "how many years of rent does it take to pay off the price tag?" ' +
      'A GRM of 8 is like buying a car that pays for itself in 8 years of Uber fares. ' +
      'A GRM of 20 is like buying a sports car and hoping it appreciates — the fares alone ' +
      'will not cover it.',
    source: 'Appraisal Institute — Sales Comparison Approach; GRM as a screening metric',
  },

  // ────────────────────────────────────────────────────────────
  // 8. HyperScore
  // ────────────────────────────────────────────────────────────
  hyper_score: {
    name: 'HyperScore',
    fullName: 'HyperScore Composite Rating',
    oneLiner: 'LootVue\'s master score combining all 8 analysis dimensions.',
    explain:
      'HyperScore is LootVue\'s composite rating that aggregates financial fundamentals, ' +
      'comparable sales, demographics, economics, infrastructure, quality of life, supply/demand, ' +
      'and macro risk into a single 0-100 score. Each dimension is weighted and scored independently, ' +
      'then combined. A HyperScore above 70 means the property and its market perform well across ' +
      'most dimensions. Below 50 means multiple red flags are present. The confidence percentage ' +
      'tells you how complete the underlying data is — a high score with low confidence should ' +
      'be investigated.',
    goodRange: [70, 100],
    cautionRange: [50, 70],
    badBelow: 50,
    unit: 'score',
    analogies:
      'HyperScore is like a credit score, but for properties. Just as a 750 FICO means you are ' +
      'creditworthy across multiple factors (payment history, utilization, length), a 75 HyperScore ' +
      'means the property checks most boxes across financials, market, and risk.',
    source: 'LootVue 8-dimension weighted composite; see hyper-score-engine.ts',
  },

  // ────────────────────────────────────────────────────────────
  // 9. Deal Grade
  // ────────────────────────────────────────────────────────────
  deal_grade: {
    name: 'Deal Grade',
    fullName: 'Deal Grade Score',
    oneLiner: 'Overall deal quality on a 0-100 scale.',
    explain:
      'Deal Grade distills the financial viability of a specific transaction into a single number. ' +
      'It factors in cash flow, cap rate, cash-on-cash return, DSCR, and how the deal stacks up ' +
      'against comparable transactions in the same market. A score of 75+ suggests the numbers ' +
      'work well. 55-75 means the deal is marginal — it might work with negotiation or value-add. ' +
      'Below 55: the fundamentals are weak and you need a compelling reason to proceed.',
    goodRange: [75, 100],
    cautionRange: [55, 75],
    badBelow: 55,
    unit: 'score',
    analogies:
      'Think of Deal Grade like a restaurant health inspection score. 90+ is pristine. ' +
      '70 means it will probably not make you sick, but you might find a hair. ' +
      'Below 55 — eat at your own risk.',
    source: 'LootVue deal-quality-confluence; weighted financial and comps analysis',
  },

  // ────────────────────────────────────────────────────────────
  // 10. Risk Score (lower is better)
  // ────────────────────────────────────────────────────────────
  risk_score: {
    name: 'Risk Score',
    fullName: 'Risk Score',
    oneLiner: 'Downside exposure on a 0-100 scale. Lower is safer.',
    explain:
      'Risk Score measures how exposed a property is to things going wrong: rate hikes, vacancy ' +
      'spikes, market downturns, natural disasters, economic recessions. It aggregates stress test ' +
      'results, market volatility, and structural risk factors. A score under 30 means the deal ' +
      'can survive most bad scenarios. 30-60 means some vulnerabilities exist. Above 60 means ' +
      'significant downside risk — the deal might work in good times but will hurt in a recession.',
    goodRange: [0, 30],
    cautionRange: [30, 60],
    badAbove: 60,
    unit: 'score',
    analogies:
      'Risk Score is like a weather forecast for your investment. Under 30 is "clear skies." ' +
      '30-60 is "chance of storms — bring an umbrella." Above 60 is "severe weather warning — ' +
      'are you sure you want to go outside?"',
    source: 'LootVue 7-dimension risk assessment; stress-test-engine.ts',
  },

  // ────────────────────────────────────────────────────────────
  // 11. Stress Resilience
  // ────────────────────────────────────────────────────────────
  stress_resilience: {
    name: 'Stress Resilience',
    fullName: 'Stress Resilience Score',
    oneLiner: 'How well the deal survives worst-case scenarios.',
    explain:
      'Stress Resilience tests the property against multiple adverse scenarios simultaneously: ' +
      'interest rates jumping 200 basis points, vacancy doubling, rents dropping 10%, and expenses ' +
      'rising 15%. A score of 70+ means the deal stays cash-flow positive or breaks even through ' +
      'most storm scenarios. Below 40 means one bad quarter could put you underwater. ' +
      'This is the metric that separates "works in a spreadsheet" from "works in real life."',
    goodRange: [70, 100],
    cautionRange: [40, 70],
    badBelow: 40,
    unit: 'score',
    analogies:
      'Stress Resilience is the crash test rating for your investment. A 70+ score is a 5-star ' +
      'safety rating — it can take a hit and you walk away fine. Below 40 is no airbags, no ' +
      'seatbelts — one fender bender and you are in trouble.',
    source: 'LootVue stress-test-engine.ts; scenarios derived from 2008 GFC and 2020 COVID drawdowns',
  },

  // ────────────────────────────────────────────────────────────
  // 12. Price-to-Rent (lower is better)
  // ────────────────────────────────────────────────────────────
  price_to_rent: {
    name: 'Price-to-Rent',
    fullName: 'Price-to-Rent Ratio',
    oneLiner: 'Purchase price divided by annual rent. Lower favors buying.',
    explain:
      'Price-to-Rent compares the cost of owning to the cost of renting. Divide the property price ' +
      'by the annual gross rent. A ratio under 15 suggests the market favors buying — the property ' +
      'generates strong income relative to its price. Between 15-20 is neutral. Above 20 means ' +
      'prices have run ahead of rents, typical of speculative or appreciation-driven markets. ' +
      'The New York Times popularized this as the "buy vs. rent" threshold at 15.',
    goodRange: [1, 15],
    cautionRange: [15, 20],
    badAbove: 20,
    unit: 'ratio',
    analogies:
      'If a $300,000 house rents for $25,000/year, the Price-to-Rent is 12 — solid. ' +
      'If that same house only rents for $12,000/year, the ratio is 25 — you are paying a premium ' +
      'that the rent cannot justify. It is like buying a vending machine for $10,000 ' +
      'that only makes $400/year in sales.',
    source: 'Campbell, Davis, Gallin & Martin (2009); NYT Buy vs. Rent Calculator',
  },

  // ────────────────────────────────────────────────────────────
  // 13. Price-to-Income (lower is better)
  // ────────────────────────────────────────────────────────────
  price_to_income: {
    name: 'Price-to-Income',
    fullName: 'Price-to-Income Ratio',
    oneLiner: 'Home price divided by area median household income.',
    explain:
      'Price-to-Income measures housing affordability at the market level. Divide the median home ' +
      'price by the median annual household income in the area. A ratio under 3 means most ' +
      'households can realistically afford to buy, creating a healthy buyer pool and supporting ' +
      'property values. Between 3-5 is stretched. Above 5 means homes cost more than 5 years of ' +
      'income — that level is historically unsustainable without significant wage growth or ' +
      'rate declines.',
    goodRange: [1, 3],
    cautionRange: [3, 5],
    badAbove: 5,
    unit: 'ratio',
    analogies:
      'Price-to-Income is like asking "how many years of salary does it take to buy a house?" ' +
      'In affordable markets like the Midwest, the answer is 2-3 years. In San Francisco, it is ' +
      '10+. Historically, anything above 5x strains the buyer pool and slows appreciation.',
    source: 'UBS Global Real Estate Bubble Index; Demographia International Housing Affordability Survey',
  },

  // ────────────────────────────────────────────────────────────
  // 14. Bubble Risk (lower is better)
  // ────────────────────────────────────────────────────────────
  bubble_risk: {
    name: 'Bubble Risk',
    fullName: 'Bubble Risk Score',
    oneLiner: 'Likelihood the market is overheated. Lower is safer.',
    explain:
      'Bubble Risk quantifies whether prices have disconnected from fundamentals using three ' +
      'signals: price-to-income divergence, price-to-rent divergence, and the credit gap (how fast ' +
      'mortgage debt is growing relative to the economy). A score under 40 means prices are ' +
      'grounded in reality. 40-70 means some froth exists. Above 70 means the market shows ' +
      'statistical signatures similar to pre-correction periods (2006, 2022). This does not predict ' +
      'when a correction happens — only that the conditions for one are present.',
    goodRange: [0, 40],
    cautionRange: [40, 70],
    badAbove: 70,
    unit: 'score',
    analogies:
      'Bubble Risk is like a thermometer for the market\'s fever. Under 40 is normal temperature. ' +
      '40-70 is running warm — monitor closely. Above 70 is a high fever — something is wrong and ' +
      'a correction (the body fighting back) becomes increasingly likely.',
    source: 'Dallas Fed International Housing Observatory; BIS Working Paper No. 17 (Borio & Lowe 2002)',
  },

  // ────────────────────────────────────────────────────────────
  // 15. Leading Indicator
  // ────────────────────────────────────────────────────────────
  leading_indicator: {
    name: 'Leading Indicator',
    fullName: 'Leading Indicator Score',
    oneLiner: 'Forward-looking signal of where the market is heading.',
    explain:
      'The Leading Indicator score aggregates signals that historically predict market direction ' +
      '6-18 months in advance: building permit trends, mortgage application volume, days on market, ' +
      'price-cut frequency, and employment growth. A score above 60 suggests positive momentum ' +
      'ahead. Between 40-60 is neutral — the market could go either way. Below 40 warns of ' +
      'deceleration or contraction. Leading indicators are probabilistic, not deterministic — they ' +
      'improve your odds, not your certainty.',
    goodRange: [60, 100],
    cautionRange: [40, 60],
    badBelow: 40,
    unit: 'score',
    analogies:
      'Leading indicators are like weather radar, not weather reports. The weather report tells you ' +
      'it is raining now. The radar shows a storm front 100 miles away heading your direction. ' +
      'It might miss, but you would be smart to bring an umbrella.',
    source: 'LootVue leading-indicator-engine.ts; Conference Board LEI methodology adapted for local RE',
  },

  // ────────────────────────────────────────────────────────────
  // 16. Consensus
  // ────────────────────────────────────────────────────────────
  consensus: {
    name: 'Consensus',
    fullName: 'Consensus Score',
    oneLiner: 'Agreement level across all LootVue engines.',
    explain:
      'Consensus measures whether LootVue\'s analysis engines agree with each other. When ' +
      'financials, market data, risk assessment, and timing signals all point in the same direction, ' +
      'consensus is high. When some engines say "buy" while others say "avoid," consensus drops. ' +
      'A score of 70+ means strong cross-engine agreement — the signal is clear. Below 40 means ' +
      'conflicting signals — dig deeper before deciding. High consensus + high scores = high ' +
      'conviction. High consensus + low scores = clear avoid.',
    goodRange: [70, 100],
    cautionRange: [40, 70],
    badBelow: 40,
    unit: 'score',
    analogies:
      'Consensus is like polling a jury. If 11 out of 12 jurors agree, you have high consensus — ' +
      'whether the verdict is "guilty" or "not guilty." A hung jury (low consensus) means the ' +
      'evidence is ambiguous and you need more information before acting.',
    source: 'LootVue stacked-signal-engine.ts and master-confluence.ts',
  },

  // ────────────────────────────────────────────────────────────
  // 17. Debt Yield
  // ────────────────────────────────────────────────────────────
  debt_yield: {
    name: 'Debt Yield',
    fullName: 'Debt Yield',
    oneLiner: 'NOI as a percentage of the loan amount. The lender\'s safety metric.',
    explain:
      'Debt yield tells the lender how quickly they could recover their money from the property\'s ' +
      'income alone, ignoring the borrower entirely. It divides the net operating income by the ' +
      'total loan amount. A debt yield of 10% means the property generates enough income to ' +
      '"repay" 10% of the loan each year. Commercial lenders typically require 9-10% minimum. ' +
      'Below 7% means the lender is taking significant risk that the property\'s income cannot ' +
      'service or repay the debt.',
    goodRange: [10, Infinity],
    cautionRange: [7, 10],
    badBelow: 7,
    unit: 'percent',
    analogies:
      'Debt yield is the lender\'s version of cash-on-cash return. If you lend someone $1 million ' +
      'and the building earns $100,000/year, the debt yield is 10%. The lender asks: "If the ' +
      'borrower disappears tomorrow, can this building pay me back?" At 10%, yes.',
    source: 'OCC Comptroller\'s Handbook; institutional CRE lending minimums per CMBS underwriting',
  },

  // ────────────────────────────────────────────────────────────
  // 18. Loan-to-Cost (lower is better)
  // ────────────────────────────────────────────────────────────
  ltc: {
    name: 'LTC',
    fullName: 'Loan-to-Cost',
    oneLiner: 'Loan amount as a percentage of total project cost.',
    explain:
      'Loan-to-Cost measures how much of the total deal cost is financed with debt versus your own ' +
      'money. Total cost includes purchase price, closing costs, and renovation. An LTC of 75% ' +
      'means you are borrowing 75 cents of every dollar and contributing 25 cents. Lower LTC means ' +
      'more skin in the game and less leverage risk. Above 85% means you are highly leveraged — ' +
      'small value drops can wipe out your equity. Most commercial lenders cap LTC at 75-80%.',
    goodRange: [0, 75],
    cautionRange: [75, 85],
    badAbove: 85,
    unit: 'percent',
    analogies:
      'LTC is like the down payment percentage on a house, but for the full project. An LTC of ' +
      '75% means you put 25% down. An LTC of 90% means you put only 10% down — a 10% price ' +
      'drop erases your entire investment. More leverage amplifies gains AND losses.',
    source: 'Fannie Mae Multifamily Selling & Servicing Guide; CMBS underwriting standards',
  },

  // ────────────────────────────────────────────────────────────
  // 19. Equity Multiple
  // ────────────────────────────────────────────────────────────
  equity_multiple: {
    name: 'Equity Multiple',
    fullName: 'Equity Multiple',
    oneLiner: 'Total cash returned divided by total cash invested.',
    explain:
      'Equity Multiple answers the simplest question in investing: for every dollar you put in, ' +
      'how many dollars did you get back? A 2.0x equity multiple means you doubled your money. ' +
      'Unlike IRR, it ignores timing — 2.0x in 3 years is better than 2.0x in 10 years. ' +
      'Institutional investors typically target 1.8-2.5x for value-add deals and 1.5-1.8x for ' +
      'core deals. Below 1.5x means your money barely grew. Below 1.0x means you lost money.',
    goodRange: [2.0, Infinity],
    cautionRange: [1.5, 2.0],
    badBelow: 1.5,
    unit: 'multiple',
    analogies:
      'Equity multiple is like asking "if I give you $100, how much do you give me back when it ' +
      'is over?" 2.0x = you get $200 back. 1.5x = $150 back. 0.8x = you get $80 back — you ' +
      'lost $20. Simple as that. IRR tells you how fast; equity multiple tells you how much.',
    source: 'Wall Street Prep; NCREIF / Preqin fund benchmarks',
  },

  // ────────────────────────────────────────────────────────────
  // 20. Break-Even Occupancy (lower is better)
  // ────────────────────────────────────────────────────────────
  break_even_occupancy: {
    name: 'Break-Even Occupancy',
    fullName: 'Break-Even Occupancy Rate',
    oneLiner: 'Minimum occupancy needed to cover all costs. Lower is safer.',
    explain:
      'Break-even occupancy is the percentage of units (or months) that must be occupied for the ' +
      'property to cover all expenses including the mortgage. A break-even of 70% means you can ' +
      'survive 30% vacancy before losing money. At 90%, just one vacant month out of ten pushes ' +
      'you into negative cash flow. This is one of the best stress-test metrics — it tells you ' +
      'exactly how much margin of safety you have against vacancy.',
    goodRange: [0, 75],
    cautionRange: [75, 90],
    badAbove: 90,
    unit: 'percent',
    analogies:
      'Break-even occupancy is like asking "how many tables in a restaurant need to be full to ' +
      'keep the lights on?" If the answer is 70%, you can survive a slow night. If it is 95%, ' +
      'one cancellation means the chef does not get paid.',
    source: 'CCIM Institute; commercial real estate underwriting fundamentals',
  },

  // ────────────────────────────────────────────────────────────
  // 21. Mortgage Rate (lower is better)
  // ────────────────────────────────────────────────────────────
  mortgage_rate: {
    name: 'Mortgage Rate',
    fullName: 'Mortgage Interest Rate',
    oneLiner: 'Annual interest charged on the property loan.',
    explain:
      'The mortgage rate determines how much of your monthly payment goes to the bank versus ' +
      'building equity. At 4%, roughly half your early payments build equity. At 7%, the bank ' +
      'keeps more than two-thirds. A 1% rate difference on a $300,000 loan changes your monthly ' +
      'payment by roughly $170-$200 and your total interest cost by $60,000+ over 30 years. Rate ' +
      'directly affects cash flow, DSCR, and whether a deal works at all.',
    goodRange: [0, 5.5],
    cautionRange: [5.5, 7.5],
    badAbove: 7.5,
    unit: 'percent',
    analogies:
      'The mortgage rate is the "rent" you pay to use the bank\'s money. At 4%, you are renting ' +
      'cheap money. At 7%, you are paying premium. At 8%+, the bank is making more off your deal ' +
      'than you are — which should make you question who the real investor is.',
    source: 'Freddie Mac Primary Mortgage Market Survey; FRED MORTGAGE30US series',
  },

  // ────────────────────────────────────────────────────────────
  // 22. Federal Funds Rate (lower is better, context-dependent)
  // ────────────────────────────────────────────────────────────
  fed_funds: {
    name: 'Fed Funds',
    fullName: 'Federal Funds Rate',
    oneLiner: 'The rate banks charge each other — it drives all other rates.',
    explain:
      'The federal funds rate is the interest rate that banks charge each other for overnight loans. ' +
      'It is set by the Federal Reserve and it influences every other interest rate in the economy: ' +
      'mortgage rates, car loans, credit cards, savings accounts. When the Fed raises rates, ' +
      'borrowing gets more expensive and property values tend to cool. When they cut rates, money ' +
      'is cheaper and real estate prices tend to rise. The direction matters more than the level — ' +
      'markets react to changes, not absolutes.',
    goodRange: [0, 3],
    cautionRange: [3, 5],
    badAbove: 5,
    unit: 'percent',
    analogies:
      'The fed funds rate is the "gravity" of the financial system. When gravity is low (low rates), ' +
      'asset prices float higher easily. When gravity is high (high rates), everything gets heavier. ' +
      'It does not directly control your mortgage rate, but it pulls on the entire chain.',
    source: 'Federal Reserve Board; FRED FEDFUNDS series; context-dependent by cycle',
  },

  // ────────────────────────────────────────────────────────────
  // 23. Vacancy Rate (lower is better)
  // ────────────────────────────────────────────────────────────
  vacancy_rate: {
    name: 'Vacancy Rate',
    fullName: 'Vacancy Rate',
    oneLiner: 'Percentage of rental units sitting empty.',
    explain:
      'Vacancy rate measures the share of available rental units that are unoccupied at any given ' +
      'time. A 5% vacancy rate is considered healthy — normal turnover between tenants. Above 10% ' +
      'signals weak demand, oversupply, or management problems. Very low vacancy (under 3%) means ' +
      'landlords have pricing power — you can raise rents. In your pro forma, always assume at ' +
      'least 5-8% vacancy even if current vacancy is 0% — tenants leave, units need repair, ' +
      'things go wrong.',
    goodRange: [0, 5],
    cautionRange: [5, 10],
    badAbove: 10,
    unit: 'percent',
    analogies:
      'Vacancy rate is like a hotel\'s empty room percentage. Under 5% means you are nearly sold ' +
      'out — great for revenue. Over 10% means something is wrong: either the rates are too high, ' +
      'the location is bad, or there are too many hotels on the block.',
    source: 'Census Bureau Housing Vacancy Survey; HUD historical benchmarks',
  },

  // ────────────────────────────────────────────────────────────
  // 24. Market Forecast
  // ────────────────────────────────────────────────────────────
  market_forecast: {
    name: 'Market Forecast',
    fullName: 'Market Forecast Score',
    oneLiner: 'Projected market direction over the next 12-24 months.',
    explain:
      'Market Forecast combines leading indicators, demographic trends, employment projections, ' +
      'supply pipeline data, and rate environment into a forward-looking score. Above 60 indicates ' +
      'favorable conditions ahead — growing population, strong employment, limited supply. ' +
      'Between 40-60 is flat — no strong signal either way. Below 40 suggests headwinds: ' +
      'outmigration, job losses, oversupply, or rate pressure. Use this alongside entry timing ' +
      'to decide when to act.',
    goodRange: [60, 100],
    cautionRange: [40, 60],
    badBelow: 40,
    unit: 'score',
    analogies:
      'Market Forecast is like a GPS navigation estimate. It says "traffic ahead looks clear" (60+) ' +
      'or "expect delays" (below 40). It cannot predict an accident, but it reads the road ' +
      'conditions and traffic patterns better than looking out the windshield.',
    source: 'LootVue market-forecast-engine.ts; Conference Board / Moody\'s Analytics local forecasting',
  },
};
