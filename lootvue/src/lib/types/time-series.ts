// ============================================================
// Shared time-series types used across charts and API responses
// ============================================================

/** Single data point with date */
export interface TimeSeriesPoint {
  date: string; // ISO date or "MMM 'YY" label
  value: number;
}

/** Data point with confidence bands (for forecasts) */
export interface TimeSeriesBand {
  date: string;
  value: number;
  upper: number;
  lower: number;
}

/** Multi-metric data point — date + any number of named metrics */
export interface MultiSeries {
  date: string;
  [metric: string]: number | string;
}

/** Named series for overlay charts */
export interface NamedSeries {
  name: string;
  color: string;
  data: TimeSeriesPoint[];
  visible?: boolean;
}

/** Scenario projection (bull/base/bear) */
export interface ScenarioSeries {
  name: "bull" | "base" | "bear";
  color: string;
  data: TimeSeriesBand[];
}

/** Capital flow stacked series */
export interface CapitalFlowPoint {
  date: string;
  institutional: number;
  retail: number;
  foreign: number;
  exchange1031: number;
  crowdfunding: number;
  netFlow: number;
}

/** KPI driver for horizontal bar charts */
export interface KPIDriverBar {
  name: string;
  impact: number; // positive = drives prices up, negative = down
  dimension: string;
  value: string;
  trend: string;
}

/** Sankey flow link */
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

/** Sankey node */
export interface SankeyNode {
  name: string;
}

/** Dimension breakdown for stacked bar charts */
export interface DimensionBar {
  dimension: string;
  score: number;
  weight: number;
  weightedScore: number;
  color: string;
  subMetrics: Array<{ name: string; score: number; impact: string }>;
}
