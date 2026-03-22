/**
 * Investment Memo PDF — @react-pdf/renderer v4
 *
 * Generates a bank-acceptable investment memo. Import via next/dynamic with ssr:false.
 * Colors: dark gray surfaces with gold accents, translated from the LootVue theme.
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvestmentMemoPDFProps {
  address: string;
  verdict: "BUY" | "PASS" | "DIG_DEEPER";
  score: number;
  metrics: {
    capRate: number;
    dscr: number;
    cashOnCash: number;
    irr: number;
    monthlyCashFlow: number;
    purchasePrice: number;
    monthlyRent: number;
    noi: number;
  };
  marketSignal?: string;
  convergence?: number;
  generatedAt: string;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;

const verdictColor: Record<string, string> = {
  BUY: "#10B981",
  PASS: "#EF4444",
  DIG_DEEPER: "#F59E0B",
};

const verdictLabel: Record<string, string> = {
  BUY: "BUY",
  PASS: "PASS",
  DIG_DEEPER: "DIG DEEPER",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const GOLD = "#C9A227";
const BG = "#111111";
const SURFACE = "#1A1A1A";
const BORDER = "#2A2A2A";
const TEXT_PRIMARY = "#FAFAFA";
const TEXT_SECONDARY = "#999999";
const TEXT_TERTIARY = "#666666";

const S = StyleSheet.create({
  page: {
    backgroundColor: BG,
    paddingHorizontal: 48,
    paddingVertical: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TEXT_PRIMARY,
  },
  // Cover
  coverLogo: { fontSize: 22, color: GOLD, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  coverTagline: { fontSize: 9, color: TEXT_SECONDARY, marginBottom: 36 },
  coverAddress: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 12,
    lineHeight: 1.3,
  },
  verdictBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 24,
  },
  verdictText: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  coverMeta: { fontSize: 8, color: TEXT_SECONDARY, marginBottom: 4 },
  coverDivider: { height: 1, backgroundColor: BORDER, marginVertical: 20 },
  coverFooter: { fontSize: 8, color: TEXT_TERTIARY, marginTop: 8 },

  // Section headers
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 20,
  },
  divider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  // Body
  body: { fontSize: 9, color: TEXT_SECONDARY, lineHeight: 1.55, marginBottom: 8 },

  // Key metrics row
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  metricLabel: { fontSize: 7, color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: "uppercase" },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#141414",
  },
  colLabel: { flex: 2, fontSize: 9, color: TEXT_SECONDARY },
  colValue: { flex: 1, fontSize: 9, color: TEXT_PRIMARY, textAlign: "right", fontFamily: "Helvetica-Bold" },
  colHeader: { flex: 1, fontSize: 7, color: TEXT_TERTIARY, textAlign: "right", letterSpacing: 0.6, textTransform: "uppercase" },
  colHeaderLabel: { flex: 2, fontSize: 7, color: TEXT_TERTIARY, letterSpacing: 0.6, textTransform: "uppercase" },

  // Flags
  flagRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  flagDot: { width: 5, height: 5, borderRadius: 3, marginRight: 8 },
  flagText: { fontSize: 9, color: TEXT_SECONDARY },

  // Disclaimer
  disclaimer: {
    marginTop: 24,
    padding: 10,
    backgroundColor: SURFACE,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: BORDER,
  },
  disclaimerText: { fontSize: 7.5, color: TEXT_TERTIARY, lineHeight: 1.5 },
});

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <Text style={S.sectionLabel}>{label}</Text>
      <View style={S.divider} />
    </>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={S.metricCard}>
      <Text style={S.metricValue}>{value}</Text>
      <Text style={S.metricLabel}>{label}</Text>
    </View>
  );
}

function CashFlowTable({ m }: { m: InvestmentMemoPDFProps["metrics"] }) {
  const annualRent = m.monthlyRent * 12;
  const annualNOI = m.noi;
  const debtService = (m.monthlyCashFlow < 0 ? m.noi + Math.abs(m.monthlyCashFlow) : m.noi - m.monthlyCashFlow) * 12;
  const annualCF = m.monthlyCashFlow * 12;

  const rows: [string, number, boolean][] = [
    ["Gross Rental Income", annualRent, false],
    ["Net Operating Income (NOI)", annualNOI, false],
    ["Annual Debt Service", -debtService, false],
    ["Net Cash Flow", annualCF, false],
    ["Monthly Cash Flow", m.monthlyCashFlow, false],
  ];

  return (
    <View>
      <View style={S.tableHeader}>
        <Text style={S.colHeaderLabel}>Line Item</Text>
        <Text style={S.colHeader}>Annual</Text>
      </View>
      {rows.map(([label, value], i) => (
        <View key={label} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
          <Text style={S.colLabel}>{label}</Text>
          <Text style={[S.colValue, { color: value < 0 ? "#EF4444" : TEXT_PRIMARY }]}>
            {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function InvestmentMemoPDF(props: InvestmentMemoPDFProps) {
  const { address, verdict, score, metrics: m, marketSignal, convergence, generatedAt } = props;
  const vc = verdictColor[verdict] ?? GOLD;
  const vl = verdictLabel[verdict] ?? verdict;
  const dateStr = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <Document title={`Investment Memo — ${address}`} author="LootVue">
      <Page size="LETTER" style={S.page}>

        {/* COVER */}
        <Text style={S.coverLogo}>LootVue</Text>
        <Text style={S.coverTagline}>Institutional-Grade Real Estate Intelligence</Text>
        <View style={S.coverDivider} />

        <Text style={S.coverAddress}>{address}</Text>
        <View style={[S.verdictBadge, { backgroundColor: `${vc}22`, borderWidth: 1, borderColor: vc }]}>
          <Text style={[S.verdictText, { color: vc }]}>{vl}</Text>
        </View>

        <Text style={S.coverMeta}>APEX Score: {score}/100</Text>
        <Text style={S.coverMeta}>Prepared: {dateStr}</Text>
        <Text style={S.coverMeta}>Purchase Price: {fmt(m.purchasePrice)}</Text>

        <View style={S.coverDivider} />
        <Text style={S.coverFooter}>
          Prepared by LootVue — Institutional-Grade Analysis. This document is confidential and intended
          solely for the use of the named recipient(s). Not for redistribution.
        </Text>

        {/* EXECUTIVE SUMMARY */}
        <SectionHeader label="Executive Summary" />
        <Text style={S.body}>
          {`This analysis evaluates ${address} for acquisition at ${fmt(m.purchasePrice)}. `}
          {`The property receives an APEX Score of ${score}/100 with a ${vl} verdict. `}
          {`Key metrics: ${pct(m.capRate)} cap rate, ${m.dscr.toFixed(2)}x DSCR, `}
          {`${pct(m.cashOnCash)} cash-on-cash return, and ${fmt(m.monthlyCashFlow)}/month net cash flow. `}
          {convergence !== undefined
            ? `Signal convergence across analytical engines is ${pct(convergence, 0)}, `
            : ""}
          {marketSignal ? `Market signal: ${marketSignal}.` : ""}
        </Text>

        {/* KEY METRICS */}
        <SectionHeader label="Key Performance Metrics" />
        <View style={S.metricsRow}>
          <MetricCard value={pct(m.capRate)} label="Cap Rate" />
          <MetricCard value={`${m.dscr.toFixed(2)}x`} label="DSCR" />
          <MetricCard value={pct(m.cashOnCash)} label="Cash-on-Cash" />
          <MetricCard value={pct(m.irr, 1)} label="Projected IRR" />
        </View>
        <View style={S.metricsRow}>
          <MetricCard value={fmt(m.monthlyCashFlow)} label="Monthly Cash Flow" />
          <MetricCard value={fmt(m.noi)} label="Annual NOI" />
          <MetricCard value={fmt(m.monthlyRent)} label="Monthly Rent" />
          <MetricCard value={fmt(m.purchasePrice)} label="Purchase Price" />
        </View>

        {/* FINANCIAL ANALYSIS */}
        <SectionHeader label="Financial Analysis" />
        <Text style={S.body}>
          {`At ${fmt(m.purchasePrice)}, the property generates ${fmt(m.monthlyRent)}/month gross rent and `}
          {`${fmt(m.noi)}/year NOI. DSCR of ${m.dscr.toFixed(2)}x `}
          {m.dscr >= 1.25
            ? "comfortably exceeds the conventional 1.25x lender threshold."
            : m.dscr >= 1.0
            ? "meets the minimum 1.0x lender threshold."
            : "falls below the standard 1.0x lender threshold — review financing terms."}
        </Text>
        <CashFlowTable m={m} />

        {/* MARKET CONTEXT */}
        <SectionHeader label="Market Context" />
        <Text style={S.body}>
          {marketSignal
            ? `Market signal for this area: ${marketSignal}. `
            : "Market signal data not provided for this analysis. "}
          {convergence !== undefined
            ? `Engine convergence is ${pct(convergence, 0)}, indicating ${
                convergence >= 75
                  ? "strong cross-signal agreement supporting high conviction."
                  : convergence >= 50
                  ? "moderate agreement — additional due diligence on divergent signals is warranted."
                  : "low agreement — treat this verdict with caution and investigate signal divergence."
              }`
            : ""}
        </Text>

        {/* RISK ASSESSMENT */}
        <SectionHeader label="Risk Assessment" />
        <Text style={S.body}>
          {m.dscr < 1.0 && "WARNING: DSCR below 1.0 — property does not cover debt service at projected rents. "}
          {m.capRate < 4 && "Cap rate below 4% may indicate overvaluation relative to income. "}
          {m.monthlyCashFlow < 0 && "Negative monthly cash flow requires out-of-pocket reserves every month. "}
          {m.dscr >= 1.25 && m.capRate >= 5 && m.monthlyCashFlow > 0
            ? "Core metrics are within acceptable ranges. Standard diligence applies: physical inspection, rent roll verification, title search."
            : "Review flagged metrics above before proceeding. Consult a licensed financial advisor."}
        </Text>

        {/* DISCLAIMER */}
        <View style={S.disclaimer}>
          <Text style={S.disclaimerText}>
            DISCLAIMER: This analysis is generated by LootVue automated systems and is provided for
            informational purposes only. It does not constitute financial, investment, legal, or tax advice.
            All projections are estimates based on available data and may not reflect actual outcomes.
            Past performance of comparable properties does not guarantee future results. Consult a licensed
            financial advisor before making any investment decision. LootVue is not a registered investment
            advisor. All financial decisions are solely the responsibility of the investor.
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ─── PDF blob generator ───────────────────────────────────────────────────────

export async function generateMemoPDF(props: InvestmentMemoPDFProps): Promise<Blob> {
  const element = <InvestmentMemoPDF {...props} />;
  return await pdf(element).toBlob();
}
