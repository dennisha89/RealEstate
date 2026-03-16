// ============================================================
// AI Analysis Engine
// Integrates Claude API for intelligent natural language
// analysis, anomaly detection, narrative generation, and
// predictive reasoning across all dimensions.
// ============================================================

/**
 * AI Integration Points:
 * 1. Natural language property analysis summaries
 * 2. Anomaly detection in market data
 * 3. Cross-dimensional pattern recognition
 * 4. Investment thesis generation
 * 5. Risk narrative construction
 * 6. Comparable property narrative
 * 7. City development impact analysis
 * 8. Market cycle positioning interpretation
 * 9. Conversational Q&A about any analysis
 * 10. Automated deal alerts with context
 */

import Anthropic from "@anthropic-ai/sdk";

// --- Types ---

export interface AIAnalysisConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface AIPropertyInsight {
  executiveSummary: string;
  investmentThesis: string;
  riskNarrative: string;
  hiddenOpportunities: string[];
  redFlags: string[];
  comparableNarrative: string;
  marketPositioning: string;
  actionRecommendation: string;
  confidence: number;
}

export interface AIMarketInsight {
  marketNarrative: string;
  moneyFlowAnalysis: string;
  demographicStory: string;
  developmentImpactAnalysis: string;
  supplyDemandOutlook: string;
  investmentWindows: string[];
  emergingTrends: string[];
  warningSignals: string[];
}

export interface AIDevelopmentImpact {
  projectName: string;
  impactSummary: string;
  estimatedValueImpact: { low: number; mid: number; high: number };
  timelineToImpact: string;
  affectedRadius: number;
  winnerProperties: string; // types that benefit most
  loserProperties: string; // types that may be negatively affected
  historicalPrecedent: string;
}

export interface AIAnomalyDetection {
  anomalies: MarketAnomaly[];
  overallAssessment: string;
}

export interface MarketAnomaly {
  metric: string;
  dimension: string;
  expectedValue: string;
  actualValue: string;
  deviationPct: number;
  significance: "low" | "medium" | "high" | "critical";
  possibleExplanation: string;
  investmentImplication: string;
}

// --- AI Analysis Functions ---

/**
 * Create the Anthropic client
 */
function createClient(config: AIAnalysisConfig): Anthropic {
  return new Anthropic({ apiKey: config.apiKey });
}

/**
 * Generate a comprehensive AI-powered property analysis narrative
 */
export async function generatePropertyInsight(
  config: AIAnalysisConfig,
  analysisData: Record<string, unknown>
): Promise<AIPropertyInsight> {
  const client = createClient(config);

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: config.maxTokens || 4096,
    system: `You are an elite real estate investment analyst. You analyze properties using an 8-dimension scoring system that covers financial fundamentals, comparable sales, demographic velocity, economic indicators, infrastructure development, quality of life, supply-demand dynamics, and macro/risk factors. You also track microeconomic capital flows and city development projects.

Your job is to synthesize all this data into actionable investment intelligence. Be specific with numbers. Identify non-obvious patterns. Think like a hedge fund analyst, not a realtor.

Respond in valid JSON matching this exact structure:
{
  "executiveSummary": "2-3 sentence summary of the opportunity",
  "investmentThesis": "Why this IS or ISN'T a good investment, with specific data points",
  "riskNarrative": "What could go wrong, with probability assessment",
  "hiddenOpportunities": ["opportunity 1", "opportunity 2"],
  "redFlags": ["flag 1", "flag 2"],
  "comparableNarrative": "How this property stacks up against comps with adjustments explained",
  "marketPositioning": "Where this market sits in the cycle and what that means for timing",
  "actionRecommendation": "Specific action: buy at X, negotiate to Y, wait for Z, or pass because...",
  "confidence": 75
}`,
    messages: [
      {
        role: "user",
        content: `Analyze this property and market data. Provide your investment analysis.\n\n${JSON.stringify(analysisData, null, 2)}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as AIPropertyInsight;
}

/**
 * Analyze city development projects and their impact on nearby property values
 */
export async function analyzeDevelopmentImpact(
  config: AIAnalysisConfig,
  projects: Record<string, unknown>[],
  propertyLocation: { address: string; lat?: number; lng?: number },
  marketContext: Record<string, unknown>
): Promise<AIDevelopmentImpact[]> {
  const client = createClient(config);

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: config.maxTokens || 4096,
    system: `You are a real estate development impact analyst. You assess how new development projects (transit, commercial, residential, medical, tech offices, schools) affect surrounding property values.

Use historical precedent from similar projects in other cities to estimate impact. Consider:
- Construction disruption (short-term negative, long-term positive for transit/amenities)
- Gentrification effects from commercial/tech development
- School quality improvement from new school construction
- Healthcare facility proximity premium
- Transit-oriented development appreciation patterns

Respond in valid JSON as an array of impact assessments:
[{
  "projectName": "name",
  "impactSummary": "1-2 sentence impact summary",
  "estimatedValueImpact": { "low": 3, "mid": 7, "high": 12 },
  "timelineToImpact": "6-18 months after completion",
  "affectedRadius": 1.5,
  "winnerProperties": "SFH within 0.5mi with 3+ bed",
  "loserProperties": "Properties directly adjacent (noise/traffic during construction)",
  "historicalPrecedent": "Similar BRT project in City X led to Y% appreciation within Z years"
}]`,
    messages: [
      {
        role: "user",
        content: `Analyze the impact of these development projects on the property at ${propertyLocation.address}.\n\nProjects:\n${JSON.stringify(projects, null, 2)}\n\nMarket Context:\n${JSON.stringify(marketContext, null, 2)}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as AIDevelopmentImpact[];
}

/**
 * Generate market intelligence narrative from microeconomic data
 */
export async function generateMarketInsight(
  config: AIAnalysisConfig,
  microeconomicData: Record<string, unknown>,
  demographicData: Record<string, unknown>,
  developmentData: Record<string, unknown>
): Promise<AIMarketInsight> {
  const client = createClient(config);

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: config.maxTokens || 4096,
    system: `You are a market intelligence analyst specializing in real estate microeconomics. You interpret capital flows, demographic shifts, and development pipelines to identify where money is moving and why.

Your analysis should answer: "Where is smart money going, and what does that mean for property values?"

Track patterns like:
- VC money flowing in → tech workers follow → housing demand increases
- Hospital expansion → doctors relocate → high-income housing demand
- Transit project → TOD zoning → density increase → appreciation
- Business formations accelerating → employment growth → population growth
- Cash buyer percentage rising → investor confidence signal
- Construction permits declining + population growing → supply squeeze

Respond in valid JSON:
{
  "marketNarrative": "3-4 sentence overall market story",
  "moneyFlowAnalysis": "Where capital is flowing and what it signals",
  "demographicStory": "Who is moving in/out and why it matters for RE",
  "developmentImpactAnalysis": "How the development pipeline will reshape the market",
  "supplyDemandOutlook": "Forward-looking supply/demand balance",
  "investmentWindows": ["window 1 with timing", "window 2"],
  "emergingTrends": ["trend 1", "trend 2"],
  "warningSignals": ["signal 1", "signal 2"]
}`,
    messages: [
      {
        role: "user",
        content: `Analyze this market's microeconomic data and provide investment intelligence.\n\nMicroeconomics:\n${JSON.stringify(microeconomicData, null, 2)}\n\nDemographics:\n${JSON.stringify(demographicData, null, 2)}\n\nDevelopment Pipeline:\n${JSON.stringify(developmentData, null, 2)}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as AIMarketInsight;
}

/**
 * Detect anomalies in market data that might signal opportunity or risk
 */
export async function detectAnomalies(
  config: AIAnalysisConfig,
  currentData: Record<string, unknown>,
  historicalBaselines: Record<string, unknown>,
  nationalAverages: Record<string, unknown>
): Promise<AIAnomalyDetection> {
  const client = createClient(config);

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: config.maxTokens || 4096,
    system: `You are a quantitative analyst specializing in real estate market anomaly detection. You compare current market data against historical baselines and national averages to find deviations that signal opportunities or risks.

Flag anomalies like:
- Population growing fast but permits declining (supply squeeze incoming)
- Incomes rising but home prices flat (undervalued market)
- Cash buyer % spiking (institutional money entering)
- Crime dropping rapidly + school ratings rising (gentrification)
- Construction costs rising but permit volume increasing (developer confidence despite costs)
- Vacancy rate dropping below 3% (rent spike incoming)
- Mortgage delinquency rising in specific zip while metro is stable (localized stress)

Respond in valid JSON:
{
  "anomalies": [{
    "metric": "metric name",
    "dimension": "which dimension",
    "expectedValue": "what you'd expect",
    "actualValue": "what it actually is",
    "deviationPct": 25,
    "significance": "high",
    "possibleExplanation": "why this might be happening",
    "investmentImplication": "what this means for investors"
  }],
  "overallAssessment": "1-2 sentence summary of anomaly pattern"
}`,
    messages: [
      {
        role: "user",
        content: `Detect anomalies in this market data.\n\nCurrent Data:\n${JSON.stringify(currentData, null, 2)}\n\nHistorical Baselines:\n${JSON.stringify(historicalBaselines, null, 2)}\n\nNational Averages:\n${JSON.stringify(nationalAverages, null, 2)}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as AIAnomalyDetection;
}

/**
 * Answer natural language questions about any analysis
 */
export async function askAnalysisQuestion(
  config: AIAnalysisConfig,
  question: string,
  analysisContext: Record<string, unknown>
): Promise<string> {
  const client = createClient(config);

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: config.maxTokens || 2048,
    system: `You are an AI real estate investment advisor. You have access to comprehensive market analysis data across 8 dimensions plus microeconomic tracking. Answer the user's question using specific data points from the analysis. Be concise, actionable, and data-driven. If the data doesn't support a confident answer, say so.`,
    messages: [
      {
        role: "user",
        content: `Context:\n${JSON.stringify(analysisContext, null, 2)}\n\nQuestion: ${question}`,
      },
    ],
  });

  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

/**
 * Generate rental analysis insight with AI
 */
export async function generateRentalInsight(
  config: AIAnalysisConfig,
  rentalData: Record<string, unknown>,
  marketContext: Record<string, unknown>
): Promise<{
  rentalSummary: string;
  optimalRentEstimate: { low: number; mid: number; high: number };
  rentGrowthForecast: string;
  tenantDemandAssessment: string;
  competitiveLandscape: string;
  recommendations: string[];
}> {
  const client = createClient(config);

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-6",
    max_tokens: config.maxTokens || 2048,
    system: `You are a rental market analyst. Analyze rental data at the address/zip level and provide actionable rental investment intelligence. Consider comparable rentals, vacancy rates, tenant demographics, seasonal patterns, and market trajectory.

Respond in valid JSON:
{
  "rentalSummary": "2-3 sentence overview",
  "optimalRentEstimate": { "low": 1500, "mid": 1750, "high": 2000 },
  "rentGrowthForecast": "Expected rent growth with reasoning",
  "tenantDemandAssessment": "Who is renting here and why demand is strong/weak",
  "competitiveLandscape": "What competing rentals look like",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
    messages: [
      {
        role: "user",
        content: `Analyze this rental market data:\n\n${JSON.stringify(rentalData, null, 2)}\n\nMarket Context:\n${JSON.stringify(marketContext, null, 2)}`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}
