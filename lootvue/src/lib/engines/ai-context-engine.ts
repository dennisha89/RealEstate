/**
 * AI Context Engine — generates context-aware responses for the AI Assistant.
 *
 * Reads live data from Zustand stores and the insight engine to produce
 * responses grounded in the user's actual app state. No LLM calls —
 * pure deterministic text generation from real data.
 */

import { useSimulatorStore, SIMULATOR_DEFAULTS } from "@/lib/stores/simulator-store";
import { useDealPipelineStore, type DealEntry, type DealStatus } from "@/lib/stores/deal-pipeline-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import { contextualizeMetric, buildCausalChain } from "@/lib/engines/insight-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppContext {
  pathname: string;
  simulator: ReturnType<typeof getSimulatorContext>;
  pipeline: ReturnType<typeof getPipelineContext>;
  watchlist: ReturnType<typeof getWatchlistContext>;
}

// ─── Store Readers (call these from inside a React component) ────────────────

export function getSimulatorContext() {
  const state = useSimulatorStore.getState();
  const isDefault =
    state.purchasePrice === SIMULATOR_DEFAULTS.purchasePrice &&
    state.monthlyRent === SIMULATOR_DEFAULTS.monthlyRent;

  // Quick DCF approximation
  const monthlyGrossRent = state.monthlyRent;
  const vacancyLoss = monthlyGrossRent * (state.vacancyPct / 100);
  const egi = monthlyGrossRent - vacancyLoss + state.otherIncome + state.laundryIncome + state.parkingIncome;
  const monthlyTax = (state.purchasePrice * state.propertyTaxRate / 100) / 12;
  const monthlyInsurance = state.insuranceAnnual / 12;
  const mgmt = egi * (state.managementPct / 100);
  const maintenance = (state.purchasePrice * state.maintenancePct / 100) / 12;
  const capex = (state.purchasePrice * state.capexReservePct / 100) / 12;
  const totalExpenses = monthlyTax + monthlyInsurance + mgmt + maintenance + capex + state.hoaMonthly + state.utilitiesMonthly;
  const noi = (egi - totalExpenses) * 12;

  const downPayment = state.purchasePrice * (state.downPaymentPct / 100);
  const loanAmount = state.purchasePrice - downPayment;
  const monthlyRate = state.interestRate / 100 / 12;
  const numPayments = state.loanTermYears * 12;
  const monthlyMortgage = loanAmount > 0 && monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;
  const annualDebt = monthlyMortgage * 12;
  const cashFlow = noi - annualDebt;
  const capRate = state.purchasePrice > 0 ? (noi / state.purchasePrice) * 100 : 0;
  const dscr = annualDebt > 0 ? noi / annualDebt : 0;
  const totalCashIn = downPayment + (state.purchasePrice * state.closingCostsPct / 100) + state.renovationBudget;
  const cashOnCash = totalCashIn > 0 ? (cashFlow / totalCashIn) * 100 : 0;

  // Rough IRR estimate (simplified: annual CF + appreciation over hold period)
  const appreciation = state.annualAppreciationPct / 100;
  const exitValue = state.purchasePrice * Math.pow(1 + appreciation, state.holdPeriodYears);
  const sellingCosts = exitValue * (state.sellingCostsPct / 100);
  const netSaleProceeds = exitValue - sellingCosts - loanAmount; // simplified, ignores amortization
  const totalReturn = cashFlow * state.holdPeriodYears + netSaleProceeds - totalCashIn;
  const equityMultiple = totalCashIn > 0 ? (totalCashIn + totalReturn) / totalCashIn : 0;

  return {
    isDefault,
    purchasePrice: state.purchasePrice,
    monthlyRent: state.monthlyRent,
    downPaymentPct: state.downPaymentPct,
    interestRate: state.interestRate,
    holdPeriodYears: state.holdPeriodYears,
    exitCapRate: state.exitCapRate,
    vacancyPct: state.vacancyPct,
    noi: Math.round(noi),
    monthlyCashFlow: Math.round(cashFlow / 12),
    capRate: Math.round(capRate * 100) / 100,
    dscr: Math.round(dscr * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 100) / 100,
    equityMultiple: Math.round(equityMultiple * 100) / 100,
    totalCashIn: Math.round(totalCashIn),
    exitValue: Math.round(exitValue),
    activeTab: state.activeTab,
  };
}

export function getPipelineContext() {
  const state = useDealPipelineStore.getState();
  const deals = state.deals;
  const stats = state.getPipelineStats();

  const activeDeals = deals.filter((d) =>
    ["discovered", "analyzing", "offer_pending", "under_contract"].includes(d.status)
  );
  const closedDeals = deals.filter((d) => d.status === "closed");
  const passedDeals = deals.filter((d) => d.status === "passed");

  const bestDeal = [...deals]
    .filter((d) => d.analysis?.apexScore != null)
    .sort((a, b) => (b.analysis?.apexScore ?? 0) - (a.analysis?.apexScore ?? 0))[0];

  const totalPortfolioValue = closedDeals.reduce(
    (sum, d) => sum + (d.outcome?.currentValue ?? d.price),
    0
  );
  const totalMonthlyCF = closedDeals.reduce(
    (sum, d) => sum + (d.outcome?.actualCashFlow ?? d.analysis?.monthlyCashFlow ?? 0),
    0
  );
  const avgCapRate =
    deals.filter((d) => d.analysis?.capRate).length > 0
      ? deals.filter((d) => d.analysis?.capRate).reduce((s, d) => s + (d.analysis?.capRate ?? 0), 0) /
        deals.filter((d) => d.analysis?.capRate).length
      : 0;

  return {
    totalDeals: deals.length,
    activeDeals: activeDeals.length,
    closedDeals: closedDeals.length,
    passedDeals: passedDeals.length,
    byStatus: stats.byStatus,
    avgConvictionScore: Math.round(stats.avgConvictionScore),
    totalInvested: stats.totalInvested,
    bestDeal: bestDeal
      ? { address: bestDeal.address, score: bestDeal.analysis?.apexScore ?? 0, verdict: bestDeal.analysis?.prismVerdict ?? "N/A" }
      : null,
    totalPortfolioValue,
    totalMonthlyCF,
    avgCapRate: Math.round(avgCapRate * 100) / 100,
    deals: deals.slice(0, 6).map((d) => ({
      address: d.address,
      status: d.status,
      score: d.analysis?.apexScore,
      cashFlow: d.analysis?.monthlyCashFlow,
      capRate: d.analysis?.capRate,
    })),
  };
}

export function getWatchlistContext() {
  const state = useWatchlistStore.getState();
  return {
    markets: state.watchedMarkets,
    alerts: state.alerts.filter((a) => a.enabled),
    marketCount: state.watchedMarkets.length,
  };
}

function gatherContext(pathname: string): AppContext {
  return {
    pathname,
    simulator: getSimulatorContext(),
    pipeline: getPipelineContext(),
    watchlist: getWatchlistContext(),
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n: number): string => `${n.toFixed(1)}%`;

// ─── Contextual Response Generator ──────────────────────────────────────────

export function generateContextualResponse(
  message: string,
  pathname: string,
): string {
  const ctx = gatherContext(pathname);
  const q = message.toLowerCase();

  // ── Simulator-specific context (when on /simulator) ──
  if (pathname.includes("/simulator") && !ctx.simulator.isDefault) {
    const sim = ctx.simulator;

    if (q.includes("irr") || q.includes("return")) {
      const capCtx = contextualizeMetric("capRate", sim.capRate);
      return `Based on your current simulation:\n\n- Purchase Price: ${fmt(sim.purchasePrice)}\n- Monthly Rent: ${fmt(sim.monthlyRent)}\n- Cap Rate: ${pct(sim.capRate)} (${capCtx.rating} -- ${capCtx.benchmark})\n- Cash-on-Cash: ${pct(sim.cashOnCash)}\n- Equity Multiple: ${sim.equityMultiple.toFixed(2)}x over ${sim.holdPeriodYears} years\n\nYour ${pct(sim.interestRate)} rate and ${sim.holdPeriodYears}-year hold produce an exit value of approximately ${fmt(sim.exitValue)}. ${sim.cashOnCash >= 8 ? "The cash-on-cash return exceeds the 8% target for most residential investors." : sim.cashOnCash >= 5 ? "The cash-on-cash is acceptable but below the 8% target most investors aim for." : "The cash-on-cash is thin -- consider negotiating price down or finding ways to increase rent."}`;
    }

    if (q.includes("vacancy")) {
      const currentVacancy = sim.vacancyPct;
      const lostRent = Math.round(sim.monthlyRent * (currentVacancy / 100));
      return `Your simulation models ${currentVacancy}% vacancy, which costs ${fmt(lostRent)}/month in lost rent.\n\nIf vacancy doubles to ${currentVacancy * 2}%, your monthly cash flow would drop from ${fmt(sim.monthlyCashFlow)} to approximately ${fmt(sim.monthlyCashFlow - lostRent)}.\n\n${sim.dscr >= 1.25 ? `Your current DSCR of ${sim.dscr.toFixed(2)}x gives you a cushion -- you can absorb some vacancy increase before breaking even.` : `With a DSCR of only ${sim.dscr.toFixed(2)}x, you have very little room for vacancy increases. Any spike could push you into negative cash flow.`}`;
    }

    if (q.includes("cash flow") || q.includes("cashflow")) {
      return `Your deal simulation shows:\n\n- Monthly Cash Flow: ${fmt(sim.monthlyCashFlow)}\n- Annual NOI: ${fmt(sim.noi)}\n- DSCR: ${sim.dscr.toFixed(2)}x\n- Cap Rate: ${pct(sim.capRate)}\n- Total Cash Required: ${fmt(sim.totalCashIn)} (${sim.downPaymentPct}% down)\n\n${sim.monthlyCashFlow > 200 ? "Positive cash flow from day one. This deal covers its debt and then some." : sim.monthlyCashFlow > 0 ? "Barely cash-flow positive. One major repair could put you in the red for the month." : "Negative cash flow means you are subsidizing this property every month. The thesis relies entirely on appreciation."}`;
    }

    if (q.includes("recession") || q.includes("stress") || q.includes("downturn")) {
      const stressCF = Math.round(sim.monthlyCashFlow * 0.65); // rough 35% haircut
      return `If a recession hits your simulated deal at ${fmt(sim.purchasePrice)}:\n\n- Estimated cash flow impact: ${fmt(sim.monthlyCashFlow)} drops to approximately ${fmt(stressCF)} (35% haircut from combined rent decline + vacancy spike)\n- Current DSCR: ${sim.dscr.toFixed(2)}x\n- Break-even DSCR: 1.0x\n\n${sim.dscr >= 1.3 ? "Your DSCR has enough cushion to likely survive a moderate recession. The deal would need to lose more than 30% of its NOI before debt service becomes an issue." : "Your DSCR is tight. A recession scenario could push this deal underwater. Consider a larger down payment to reduce the monthly debt burden."}`;
    }

    // Generic simulator context
    return `Looking at your current simulation for a ${fmt(sim.purchasePrice)} property:\n\n- Monthly Cash Flow: ${fmt(sim.monthlyCashFlow)}\n- Cap Rate: ${pct(sim.capRate)}\n- DSCR: ${sim.dscr.toFixed(2)}x\n- Cash-on-Cash: ${pct(sim.cashOnCash)}\n- Exit Value (${sim.holdPeriodYears}yr): ${fmt(sim.exitValue)}\n- Equity Multiple: ${sim.equityMultiple.toFixed(2)}x\n\n${sim.capRate >= 6 ? "The fundamentals look solid." : "The yield is compressed at this price point."} Want me to explain any specific metric or run a stress scenario?`;
  }

  // ── Pipeline / Portfolio context ──
  if (
    (pathname.includes("/portfolio") || pathname.includes("/pipeline") || pathname === "/dashboard") &&
    ctx.pipeline.totalDeals > 0
  ) {
    const pipe = ctx.pipeline;

    if (q.includes("portfolio") || q.includes("performing") || q.includes("how is my")) {
      const cfLabel = pipe.totalMonthlyCF > 0 ? "cash-flow positive" : "cash-flow negative";
      return `Your portfolio at a glance:\n\n- ${pipe.totalDeals} total deals (${pipe.activeDeals} active, ${pipe.closedDeals} closed, ${pipe.passedDeals} passed)\n- Total Portfolio Value: ${fmt(pipe.totalPortfolioValue)}\n- Monthly Cash Flow: ${fmt(pipe.totalMonthlyCF)} (${cfLabel})\n- Average Cap Rate: ${pct(pipe.avgCapRate)}\n- Average Conviction: ${pipe.avgConvictionScore}%\n- Total Invested: ${fmt(pipe.totalInvested)}\n\n${pipe.bestDeal ? `Your strongest deal is ${pipe.bestDeal.address} (Score: ${pipe.bestDeal.score}/100, Verdict: ${pipe.bestDeal.verdict}).` : ""}\n\n${pipe.avgCapRate >= 6 ? "Your portfolio yield is above market average. Solid income generation." : "Your portfolio yield is below the 6% investor target. Consider higher-yielding markets for your next acquisition."}`;
    }

    if (q.includes("best") || q.includes("strongest") || q.includes("top")) {
      if (pipe.bestDeal) {
        return `Your highest-scoring deal is ${pipe.bestDeal.address} with an APEX Score of ${pipe.bestDeal.score}/100 and a ${pipe.bestDeal.verdict} verdict.\n\n${pipe.deals.filter((d) => d.score).length > 1 ? "Your analyzed deals ranked by score:\n\n" + pipe.deals.filter((d) => d.score).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((d, i) => `${i + 1}. ${d.address} -- Score: ${d.score}, Cash Flow: ${d.cashFlow != null ? fmt(d.cashFlow) + "/mo" : "N/A"}`).join("\n") : "Analyze more deals to build a comparison set."}`;
      }
      return "You don't have any analyzed deals yet. Head to **Analyze** and run your first property to see scores.";
    }

    if (q.includes("sell") || q.includes("should i")) {
      const weakDeals = pipe.deals.filter((d) => d.score != null && d.score < 50);
      if (weakDeals.length > 0) {
        return `Based on your pipeline data, ${weakDeals.length} deal(s) scored below 50:\n\n${weakDeals.map((d) => `- ${d.address} (Score: ${d.score}, Cash Flow: ${d.cashFlow != null ? fmt(d.cashFlow) + "/mo" : "N/A"})`).join("\n")}\n\nProperties with scores below 50 typically indicate thin margins or structural issues. If any of these are closed positions, consider whether the capital could perform better elsewhere. Re-analyze with current market data to confirm.`;
      }
      return `All your analyzed deals score above 50. No immediate sell signals based on current data. Keep monitoring -- set alerts on the **Watchlist** page to catch deteriorating conditions.`;
    }

    if (q.includes("invest in") || q.includes("what should")) {
      const watchlist = ctx.watchlist;
      const pipelineMarkets = [...new Set(pipe.deals.map((d) => d.address.split(",").slice(-2).join(",").trim()))];
      return `Based on your current portfolio:\n\n- You have deals in: ${pipelineMarkets.slice(0, 4).join(", ") || "no markets yet"}\n- ${watchlist.marketCount > 0 ? `Watching ${watchlist.marketCount} market(s): ${watchlist.markets.map((m) => m.name).join(", ")}` : "No markets on your watchlist yet"}\n- Average conviction across deals: ${pipe.avgConvictionScore}%\n\n${pipe.avgCapRate < 6 ? "Your portfolio yield is below 6%. Consider higher-cap-rate secondary markets like Raleigh, Nashville, or Tampa." : "Your yield profile is healthy. Focus on geographic diversification if most deals are in one state."}\n\nHead to **Discover** to search for deals that complement your existing portfolio.`;
    }
  }

  // ── Watchlist / Markets context ──
  if (pathname.includes("/markets") || pathname.includes("/discover")) {
    const watchlist = ctx.watchlist;
    if (q.includes("market") || q.includes("cap rate")) {
      if (watchlist.marketCount > 0) {
        return `You are watching ${watchlist.marketCount} markets: ${watchlist.markets.map((m) => `${m.name}, ${m.state}${m.notes ? ` (${m.notes})` : ""}`).join(" | ")}\n\n${watchlist.alerts.length > 0 ? `You have ${watchlist.alerts.length} active alert(s) set up. You'll be notified when conditions change.` : "Consider setting up alerts on the Watchlist page to catch opportunities."}\n\nHead to **Analyze** to deep-dive any specific property in these markets.`;
      }
    }
  }

  // ── Rates context ──
  if (pathname.includes("/rates") && (q.includes("rate") || q.includes("yield") || q.includes("fed"))) {
    const sim = ctx.simulator;
    return `At your current simulation rate of ${pct(sim.interestRate)}:\n\n- Monthly mortgage on ${fmt(sim.purchasePrice)}: approximately ${fmt(Math.round(sim.purchasePrice * (1 - sim.downPaymentPct / 100) * sim.interestRate / 100 / 12 * 1.1))}\n- DSCR impact: ${sim.dscr.toFixed(2)}x\n\nA 1% rate drop would save roughly ${fmt(Math.round(sim.purchasePrice * (1 - sim.downPaymentPct / 100) * 0.01 / 12))}/month on this deal. But remember: don't time rates, time deals. Cash flow at today's rate is better than hoping for tomorrow's rate.\n\nThe yield curve and Fed funds rate direction matter more for your refinance strategy than your acquisition timing.`;
  }

  // ── Educational fallbacks (keep the original high-quality canned responses) ──
  return getEducationalResponse(q);
}

// ─── Educational Fallback Responses ──────────────────────────────────────────

function getEducationalResponse(q: string): string {
  if (q.includes("dscr"))
    return "**DSCR (Debt Service Coverage Ratio)** measures whether a property's income covers its debt payments.\n\n- **1.0x** = barely covers mortgage\n- **1.25x+** = healthy, most lenders require this\n- **1.5x+** = strong, cushion for vacancies\n\nLootVue calculates DSCR using actual NOI divided by annual debt service. A higher DSCR means lower risk of default.";
  if (q.includes("cap rate"))
    return "**Cap Rate** = Net Operating Income / Purchase Price\n\nIt tells you how much the property earns relative to what you paid.\n\n- **4-5%** = Low yield, typically Class A markets\n- **6-8%** = Sweet spot for most investors\n- **9%+** = High yield but often higher risk\n\n7% is solid in most secondary markets. Context matters -- compare it to the market average shown in your analysis.";
  if (q.includes("stress test"))
    return "LootVue runs **6 correlated stress scenarios simultaneously**:\n\n1. **Recession** -- -15% values, +5% vacancy\n2. **Rate spike** -- +200bps on variable debt\n3. **Vacancy surge** -- 2x current vacancy\n4. **Insurance crisis** -- +40% premiums\n5. **Rent decline** -- -10% rents\n6. **Combined worst-case** -- All of the above\n\nProperties surviving all 6 earn a fortress resilience rating. Focus on the break-even vacancy rate -- that tells you exactly how much can go wrong before you lose money.";
  if (q.includes("irr"))
    return "**IRR (Internal Rate of Return)** is your annualized return over the entire hold period, including the exit sale.\n\n- **8-12%** = Conservative, stable cash flow\n- **12-18%** = Value-add residential target\n- **18%+** = Aggressive, usually short-term plays\n\nOur simulator models IRR across 10,000 Monte Carlo scenarios so you see the probability distribution, not just a single guess.";
  if (q.includes("first deal") || q.includes("help me find") || q.includes("get started"))
    return "Here's your roadmap:\n\n**Step 1:** Go to **Analyze** and paste any property address\n**Step 2:** Review the 12-engine verdict and stress test\n**Step 3:** If it scores well, open **Simulate** to model scenarios\n**Step 4:** Save to **Portfolio** to track it\n\nStart with a market you know. Want me to suggest some high-scoring properties?";
  if (q.includes("vacancy"))
    return "Vacancy directly reduces your effective gross income.\n\n- **5% vacancy** on $2,000/mo rent = **$1,200/year lost**\n- Going from 5% to 10% typically drops IRR by **2-3 percentage points**\n\nOur stress test models 2x vacancy to show your break-even point. The key question: at what vacancy rate does your DSCR drop below 1.0?";
  if (q.includes("recession"))
    return "Our recession scenario models **simultaneous shocks**:\n\n- Property values: **-15%**\n- Vacancy: **+5%** increase\n- Rents: **-5%** decline\n- Rates: **+200bps** (ARM loans)\n\nThe key metric: does your **DSCR stay above 1.0**? If yes, you can service debt through the downturn. Most properties with initial DSCR above 1.3x survive.";
  if (q.includes("rate") && (q.includes("wait") || q.includes("drop")))
    return "**Don't time rates. Time deals.**\n\nHistorically, investors who waited for rate drops missed 2-3 years of cash flow and appreciation. The math:\n\n- Rate drops 1% saves ~$150/mo on a $300K loan\n- But 2 years of waiting = ~$24K in missed cash flow\n\nFocus on deal quality (DSCR, cap rate, cash flow). You can always refinance later. You can't go back in time to buy.";
  if (q.includes("lender") || q.includes("loan") || q.includes("conventional") || q.includes("dscr loan"))
    return "**Conventional vs DSCR loans:**\n\nConventional: W2/tax income verification, lower rates, 15-25% down\nDSCR: No income verification, uses property cash flow, 20-25% down, rates 0.5-1% higher\n\nDSCR loans are ideal for full-time investors scaling beyond 4 properties. Conventional loans give better rates if you have the income documentation. Go to **Lending** to match with lenders for your specific deal.";
  if (q.includes("market") || q.includes("invest in"))
    return "Based on our 39-engine analysis, the strongest markets right now:\n\n- **Austin, TX** -- Score: 87, tech hiring +12% YoY\n- **Raleigh, NC** -- Score: 84, top-5 pop growth\n- **Tampa, FL** -- Score: 79, watch insurance costs\n\nWant me to analyze a specific property? Head to **Analyze** and paste any address.";
  return "Based on the data in your LootVue dashboard:\n\nI can see your deals, simulation parameters, and watchlist. Ask me about a specific metric, deal, or scenario and I will reference your actual numbers.\n\nTry: \"How is my portfolio performing?\" or \"What IRR does my simulation show?\" or explain any metric like DSCR, cap rate, or IRR.";
}
