"use client";

/**
 * StressTestChart — Stress Scenario Comparison
 *
 * Renders the output of runMultiVariableStressTest() as a horizontal bar chart
 * comparing cash flow and DSCR across up to 6 scenarios.
 *
 * Data contract maps directly to the engine's native types:
 *   scenarios → StressTestResult.scenarios
 *   baseline  → computed from base case (monthlyCashFlow / dscr at zero stress)
 *
 * Sorted mild → extreme by the engine's SEVERITY_ORDER.
 * Each row gets a verdict: survived (emerald), marginal (amber), failed (rose).
 */

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  TooltipProps,
  LabelList,
} from "recharts";
import { CheckCircle, AlertTriangle, XCircle, Shield, ShieldOff, ShieldAlert } from "lucide-react";
import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  fmtChartCurrency,
} from "./ChartTheme";
import type { StressTestResult } from "@/lib/engines/stress-test-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StressTestChartProps {
  /** scenarios array from StressTestResult */
  scenarios: StressTestResult["scenarios"];
  /** Base case cash flow (monthly, dollars) */
  baselineCashFlow: number;
  /** Base case DSCR */
  baselineDscr: number;
  /** From StressTestResult.resilience */
  resilience: StressTestResult["resilience"];
  /** Break-even vacancy rate (%) — optional, shown below chart */
  breakEvenVacancy?: number;
  /** Break-even interest rate (%) — optional */
  breakEvenRate?: number;
  /** From StressTestResult (scenarios that pass dscr > 0.9 and cf > 0) */
  survivalCount: number;
  /** Plain English summary from StressTestResult.thesis */
  summary: string;
  /** Show skeleton loading state */
  loading?: boolean;
  /** Minimum height of the bar chart section. Default 260 */
  height?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ["mild", "moderate", "severe", "extreme"] as const;
type Severity = typeof SEVERITY_ORDER[number];

/**
 * Return bar fill color by survival status and DSCR.
 *   survived + dscr >= 1.0  → emerald
 *   survived + dscr 0.9-1.0 → amber (marginal)
 *   failed                  → rose
 */
function scenarioColor(
  survives: boolean,
  dscr: number,
): string {
  if (!survives) return CHART_COLORS.rose;
  if (dscr < 1.0) return CHART_COLORS.amber;
  return CHART_COLORS.emerald;
}

function scenarioFill(survives: boolean, dscr: number): string {
  if (!survives) return "rgba(239,68,68,0.55)";
  if (dscr < 1.0) return "rgba(245,158,11,0.55)";
  return "rgba(16,185,129,0.55)";
}

/**
 * Opacity for bars based on severity — mild scenarios are lighter,
 * extreme are fully saturated.
 */
function severityOpacity(severity: Severity): number {
  switch (severity) {
    case "mild": return 0.70;
    case "moderate": return 0.80;
    case "severe": return 0.90;
    case "extreme": return 1.00;
  }
}

function resilienceConfig(resilience: StressTestResult["resilience"]) {
  switch (resilience) {
    case "fortress":
      return {
        label: "Fortress",
        color: CHART_COLORS.emerald,
        Icon: Shield,
        bg: "bg-emerald-muted",
        border: "border-emerald/20",
      };
    case "strong":
      return {
        label: "Strong",
        color: CHART_COLORS.emerald,
        Icon: Shield,
        bg: "bg-emerald-muted",
        border: "border-emerald/20",
      };
    case "adequate":
      return {
        label: "Adequate",
        color: CHART_COLORS.amber,
        Icon: ShieldAlert,
        bg: "bg-amber-muted",
        border: "border-amber/20",
      };
    case "fragile":
      return {
        label: "Fragile",
        color: CHART_COLORS.rose,
        Icon: ShieldOff,
        bg: "bg-rose-muted",
        border: "border-rose/20",
      };
    case "paper_thin":
      return {
        label: "Paper-Thin",
        color: CHART_COLORS.rose,
        Icon: ShieldOff,
        bg: "bg-rose-muted",
        border: "border-rose/20",
      };
  }
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface RowDatum {
  name: string;
  shortName: string;
  cashFlow: number;
  dscr: number;
  survives: boolean;
  severity: Severity;
}

function StressTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as RowDatum | undefined;
  if (!d) return null;

  const color = scenarioColor(d.survives, d.dscr);
  const verdictLabel = !d.survives ? "Failed" : d.dscr < 1.0 ? "Marginal" : "Survived";

  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 190 }}>
      <p style={{ fontSize: 11, color: CHART_COLORS.textSecondary, marginBottom: 6, fontFamily: "JetBrains Mono, monospace" }}>
        {d.name}
      </p>

      {[
        { label: "Cash Flow", value: fmtChartCurrency(d.cashFlow) + "/mo", color: d.cashFlow >= 0 ? CHART_COLORS.emerald : CHART_COLORS.rose },
        { label: "DSCR", value: d.dscr.toFixed(2) + "x", color: d.dscr >= 1.0 ? CHART_COLORS.emerald : CHART_COLORS.rose },
        { label: "Severity", value: d.severity.charAt(0).toUpperCase() + d.severity.slice(1), color: CHART_COLORS.text },
        { label: "Verdict", value: verdictLabel, color },
      ].map((item) => (
        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: CHART_COLORS.text }}>{item.label}</span>
          <span style={{ fontSize: 12, color: item.color, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Verdict Icons Row ────────────────────────────────────────────────────────

function VerdictBadge({ survives, dscr }: { survives: boolean; dscr: number }) {
  if (!survives) {
    return (
      <span className="flex items-center gap-1 text-rose text-[10px] font-medium font-mono">
        <XCircle className="w-3 h-3" aria-hidden="true" />
        Failed
      </span>
    );
  }
  if (dscr < 1.0) {
    return (
      <span className="flex items-center gap-1 text-amber text-[10px] font-medium font-mono">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
        Marginal
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-emerald text-[10px] font-medium font-mono">
      <CheckCircle className="w-3 h-3" aria-hidden="true" />
      Survived
    </span>
  );
}

// ─── Survival Score Banner ────────────────────────────────────────────────────

function SurvivalBanner({
  survivalCount,
  totalScenarios,
  resilience,
}: {
  survivalCount: number;
  totalScenarios: number;
  resilience: StressTestResult["resilience"];
}) {
  const config = resilienceConfig(resilience);
  const { Icon } = config;

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-3 border ${config.bg} ${config.border}`}
      role="status"
      aria-label={`${survivalCount} of ${totalScenarios} scenarios survived. Resilience: ${config.label}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: config.color }} aria-hidden="true" />
        <span className="text-sm font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Survival bar */}
        <div className="flex gap-0.5" aria-hidden="true">
          {Array.from({ length: totalScenarios }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-3 h-3 rounded-sm"
              style={{
                backgroundColor:
                  i < survivalCount ? config.color : CHART_COLORS.border,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-sm font-bold" style={{ color: config.color }}>
          {survivalCount}/{totalScenarios}
        </span>
        <span className="text-[11px] text-content-secondary">scenarios survived</span>
      </div>
    </div>
  );
}

// ─── Break-Even Metrics ───────────────────────────────────────────────────────

function BreakEvenRow({
  breakEvenVacancy,
  breakEvenRate,
  baselineDscr,
}: {
  breakEvenVacancy?: number;
  breakEvenRate?: number;
  baselineDscr: number;
}) {
  if (!breakEvenVacancy && !breakEvenRate) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {breakEvenVacancy !== undefined && (
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <span className="section-label">Break-even Vacancy</span>
          <span
            className="font-mono tabular-nums text-sm font-bold"
            style={{ color: breakEvenVacancy >= 20 ? CHART_COLORS.emerald : breakEvenVacancy >= 10 ? CHART_COLORS.amber : CHART_COLORS.rose }}
            aria-label={`Break-even vacancy rate: ${breakEvenVacancy.toFixed(1)}%`}
          >
            {breakEvenVacancy.toFixed(1)}%
          </span>
        </div>
      )}
      {breakEvenRate !== undefined && (
        <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
          <span className="section-label">Break-even Rate</span>
          <span
            className="font-mono tabular-nums text-sm font-bold"
            style={{ color: breakEvenRate >= 9 ? CHART_COLORS.emerald : breakEvenRate >= 7 ? CHART_COLORS.amber : CHART_COLORS.rose }}
            aria-label={`Break-even interest rate: ${breakEvenRate.toFixed(1)}%`}
          >
            {breakEvenRate.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
        <span className="section-label">Base DSCR</span>
        <span
          className="font-mono tabular-nums text-sm font-bold"
          style={{ color: baselineDscr >= 1.25 ? CHART_COLORS.emerald : baselineDscr >= 1.0 ? CHART_COLORS.amber : CHART_COLORS.rose }}
          aria-label={`Baseline DSCR: ${baselineDscr.toFixed(2)}`}
        >
          {baselineDscr.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function StressTestSkeleton({ height }: { height: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading stress test scenarios">
      <div className="skeleton h-10 rounded-lg" />
      <div style={{ height }} className="flex flex-col gap-2 justify-around py-2">
        {([55, 38, 70, 44, 62, 30] as const).map((pct, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-4 rounded" style={{ width: "22%" }} />
            <div
              className="skeleton h-5 rounded"
              style={{ width: `${pct}%` }}
            />
          </div>
        ))}
      </div>
      <div className="skeleton h-4 rounded w-3/4" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StressTestChart({
  scenarios,
  baselineCashFlow,
  baselineDscr,
  resilience,
  breakEvenVacancy,
  breakEvenRate,
  survivalCount,
  summary,
  loading = false,
  height = 260,
}: StressTestChartProps) {
  const totalScenarios = scenarios.length;

  // Transform engine output into Recharts horizontal bar data.
  // Sort by severity: mild first (least severe at top of chart).
  const data = useMemo<RowDatum[]>(() => {
    return [...scenarios]
      .sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.scenario.severity as Severity) -
          SEVERITY_ORDER.indexOf(b.scenario.severity as Severity),
      )
      .map((s) => ({
        name: s.scenario.name,
        shortName:
          s.scenario.name.length > 18
            ? s.scenario.name.slice(0, 17) + "…"
            : s.scenario.name,
        cashFlow: s.results.monthlyCashFlow,
        dscr: s.results.dscr,
        survives: s.survives,
        severity: s.scenario.severity as Severity,
      }));
  }, [scenarios]);

  // Determine x-axis domain — symmetric enough to see baseline and worst case.
  const allCashFlows = [baselineCashFlow, ...data.map((d) => d.cashFlow)];
  const cfMin = Math.min(...allCashFlows);
  const cfMax = Math.max(...allCashFlows);
  const domainPad = Math.max(Math.abs(cfMin), Math.abs(cfMax)) * 0.12;
  const xDomain: [number, number] = [
    Math.floor((cfMin - domainPad) / 100) * 100,
    Math.ceil((cfMax + domainPad) / 100) * 100,
  ];

  if (loading) return <StressTestSkeleton height={height} />;

  if (!data.length) {
    return (
      <div
        className="flex flex-col items-center justify-center text-content-tertiary gap-2"
        style={{ height }}
        role="status"
        aria-label="No stress test data available"
      >
        <Shield className="w-8 h-8 opacity-30" aria-hidden="true" />
        <p className="text-sm">No stress scenarios available</p>
        <p className="text-[11px] text-content-disabled">Run an analysis to generate scenarios</p>
      </div>
    );
  }

  const axisTickStyle = AXIS_STYLE.tick;

  return (
    <div
      className="flex flex-col gap-3"
      aria-label={`Stress test: ${survivalCount} of ${totalScenarios} scenarios survived`}
    >
      {/* Survival banner */}
      <SurvivalBanner
        survivalCount={survivalCount}
        totalScenarios={totalScenarios}
        resilience={resilience}
      />

      {/* Verdict row — one badge per scenario, in severity order */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1"
        role="list"
        aria-label="Scenario verdicts"
      >
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5" role="listitem">
            <span className="text-[10px] text-content-tertiary font-mono">{d.shortName}:</span>
            <VerdictBadge survives={d.survives} dscr={d.dscr} />
          </div>
        ))}
      </div>

      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          barCategoryGap="25%"
          margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray={GRID_STYLE.strokeDasharray}
            stroke={GRID_STYLE.stroke}
            horizontal={false}
          />

          <XAxis
            type="number"
            domain={xDomain}
            tickFormatter={(v: number) => fmtChartCurrency(v)}
            tick={axisTickStyle}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{
              value: "Monthly Cash Flow",
              position: "insideBottom",
              offset: -2,
              style: {
                fill: CHART_COLORS.text,
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
              },
            }}
          />

          <YAxis
            type="category"
            dataKey="shortName"
            tick={axisTickStyle}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={{ stroke: "transparent" }}
            width={110}
          />

          <Tooltip
            content={<StressTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.025)" }}
          />

          {/* Zero / break-even line */}
          <ReferenceLine
            x={0}
            stroke={CHART_COLORS.border}
            strokeWidth={1.5}
            strokeDasharray="0"
            label={{
              value: "$0",
              position: "top",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fill: CHART_COLORS.text,
            }}
          />

          {/* Baseline reference line */}
          <ReferenceLine
            x={baselineCashFlow}
            stroke={CHART_COLORS.gold}
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: `Base ${fmtChartCurrency(baselineCashFlow)}/mo`,
              position: "top",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fill: CHART_COLORS.gold,
            }}
          />

          <Bar
            dataKey="cashFlow"
            radius={[0, 3, 3, 0]}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`st-cell-${index}`}
                fill={scenarioFill(entry.survives, entry.dscr)}
                stroke={scenarioColor(entry.survives, entry.dscr)}
                strokeWidth={0.5}
                strokeOpacity={0.5}
                fillOpacity={severityOpacity(entry.severity)}
              />
            ))}

            {/* DSCR label at end of each bar */}
            <LabelList
              dataKey="dscr"
              position="right"
              formatter={(v: unknown) => typeof v === "number" ? `${v.toFixed(2)}x` : ""}
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                fill: CHART_COLORS.textSecondary,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* DSCR = 1.0 callout note */}
      <p className="text-[10px] text-content-disabled font-mono text-right -mt-1 mr-2">
        DSCR labels at right · Lender minimum = 1.00x
      </p>

      {/* Break-even metrics */}
      <BreakEvenRow
        breakEvenVacancy={breakEvenVacancy}
        breakEvenRate={breakEvenRate}
        baselineDscr={baselineDscr}
      />

      {/* Plain English thesis */}
      <p
        className="text-[12px] text-content-tertiary italic leading-relaxed px-1 border-l-2 pl-3 mt-1"
        style={{ borderLeftColor: CHART_COLORS.border }}
        aria-live="polite"
      >
        {summary}
      </p>
    </div>
  );
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

/**
 * Development/demo data matching PRESET_SCENARIOS from the stress-test engine.
 * Cash flows and DSCRs are representative values for a $350K SFR at 7% rate,
 * 20% down, $2,200/mo rent, $600/mo expenses, $150/mo insurance.
 */
export const STRESS_TEST_SAMPLE: StressTestChartProps = {
  scenarios: [
    {
      scenario: {
        name: "Inflationary Boom",
        description: "High inflation, rates rise but rents rise faster",
        severity: "mild",
        variables: { rentChange: 8, vacancyChange: -2, rateChange: 1.5, expenseChange: 10, valueChange: 5, insuranceChange: 15 },
      },
      results: {
        monthlyCashFlow: 820, annualCashFlow: 9840, dscr: 1.52,
        capRate: 7.1, cashOnCash: 14.1, ltv: 66.7,
        equityRemaining: 116500, monthsOfReservesNeeded: 0,
      },
      survives: true,
      breaksAt: "n/a",
      comparison: { cashFlowChange: 370, dscrChange: 0.17, equityChange: 17500 },
    },
    {
      scenario: {
        name: "Mild Recession",
        description: "GDP slows, rates hold, slight rent pressure",
        severity: "mild",
        variables: { rentChange: -3, vacancyChange: 2, rateChange: 0, expenseChange: 3, valueChange: -5, insuranceChange: 5 },
      },
      results: {
        monthlyCashFlow: 195, annualCashFlow: 2340, dscr: 1.14,
        capRate: 5.9, cashOnCash: 3.4, ltv: 73.7,
        equityRemaining: 80750, monthsOfReservesNeeded: 0,
      },
      survives: true,
      breaksAt: "n/a",
      comparison: { cashFlowChange: -255, dscrChange: -0.21, equityChange: -17500 },
    },
    {
      scenario: {
        name: "Insurance Crisis (FL/LA)",
        description: "Carriers exit, premiums spike, values pressured",
        severity: "moderate",
        variables: { rentChange: 0, vacancyChange: 2, rateChange: 0, expenseChange: 15, valueChange: -8, insuranceChange: 60 },
      },
      results: {
        monthlyCashFlow: 62, annualCashFlow: 744, dscr: 1.04,
        capRate: 5.6, cashOnCash: 1.1, ltv: 76.1,
        equityRemaining: 73100, monthsOfReservesNeeded: 0,
      },
      survives: true,
      breaksAt: "n/a",
      comparison: { cashFlowChange: -388, dscrChange: -0.31, equityChange: -25200 },
    },
    {
      scenario: {
        name: "Rate Shock +2%",
        description: "Fed hikes aggressively, demand drops, values fall",
        severity: "moderate",
        variables: { rentChange: -5, vacancyChange: 3, rateChange: 2, expenseChange: 5, valueChange: -10, insuranceChange: 8 },
      },
      results: {
        monthlyCashFlow: -118, annualCashFlow: -1416, dscr: 0.93,
        capRate: 5.2, cashOnCash: -2.0, ltv: 77.8,
        equityRemaining: 68250, monthsOfReservesNeeded: 12,
      },
      survives: false,
      breaksAt: "rate increase",
      comparison: { cashFlowChange: -568, dscrChange: -0.42, equityChange: -29750 },
    },
    {
      scenario: {
        name: "2008-Style Correction",
        description: "Credit freeze, values crash, high vacancy",
        severity: "severe",
        variables: { rentChange: -10, vacancyChange: 8, rateChange: 1.5, expenseChange: 5, valueChange: -25, insuranceChange: 10 },
      },
      results: {
        monthlyCashFlow: -892, annualCashFlow: -10704, dscr: 0.61,
        capRate: 4.2, cashOnCash: -15.3, ltv: 93.3,
        equityRemaining: 24500, monthsOfReservesNeeded: 12,
      },
      survives: false,
      breaksAt: "rent decline",
      comparison: { cashFlowChange: -1342, dscrChange: -0.74, equityChange: -87500 },
    },
    {
      scenario: {
        name: "Perfect Storm",
        description: "Rates spike + recession + insurance crisis simultaneously",
        severity: "extreme",
        variables: { rentChange: -12, vacancyChange: 10, rateChange: 3, expenseChange: 20, valueChange: -30, insuranceChange: 40 },
      },
      results: {
        monthlyCashFlow: -1420, annualCashFlow: -17040, dscr: 0.41,
        capRate: 3.6, cashOnCash: -24.3, ltv: 100.0,
        equityRemaining: -3500, monthsOfReservesNeeded: 12,
      },
      survives: false,
      breaksAt: "combined stress",
      comparison: { cashFlowChange: -1870, dscrChange: -0.94, equityChange: -105000 },
    },
  ],
  baselineCashFlow: 450,
  baselineDscr: 1.35,
  resilience: "adequate",
  breakEvenVacancy: 18.2,
  breakEvenRate: 8.9,
  survivalCount: 3,
  summary:
    "This deal handles normal downturns and modest shocks. The main vulnerability is rate increases — a 2% hike flips cash flow negative. Maintain 6 months of reserves and avoid floating-rate debt.",
};
