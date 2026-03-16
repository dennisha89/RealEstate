"use client";

/**
 * Shared chart constants for LootVue dark theme.
 * All Recharts components import from here for consistency.
 */

export const CHART_COLORS = {
  gold: "#C9A227",
  goldLight: "#E8C547",
  emerald: "#10B981",
  emeraldLight: "#34D399",
  amber: "#F59E0B",
  amberLight: "#FBBF24",
  rose: "#EF4444",
  roseLight: "#F87171",
  surface: "#111111",
  surfaceCard: "#0D0D0D",
  border: "#1F1F1F",
  text: "#666666",
  textSecondary: "#999999",
  white: "#E5E5E5",
} as const;

export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#1A1A1A",
  border: "1px solid #1F1F1F",
  borderRadius: 8,
  padding: "8px 12px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
};

export const AXIS_STYLE = {
  tick: { fill: "#666666", fontSize: 11, fontFamily: "JetBrains Mono, monospace" },
  axisLine: { stroke: "#1F1F1F" },
  tickLine: { stroke: "#1F1F1F" },
};

export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "#1F1F1F",
  vertical: false,
};

export function ChartTooltipContent({
  label,
  items,
}: {
  label?: string;
  items: { name: string; value: string; color: string }[];
}) {
  return (
    <div style={TOOLTIP_STYLE}>
      {label && (
        <p style={{ fontSize: 10, color: "#666666", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
          {label}
        </p>
      )}
      {items.map((item) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#999999" }}>{item.name}:</span>
          <span style={{ fontSize: 12, color: "#E5E5E5", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Format currency for chart labels */
export function fmtChartCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/** Format percentage for chart labels */
export function fmtChartPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

/** AI Insight card component — reused on every dashboard page */
export function AiInsightCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-glass border-gold/[0.08] ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-3.5 h-3.5 text-gold-light" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
        </svg>
        <span className="text-xs font-semibold text-gold-light">{title ?? "AI Insight"}</span>
      </div>
      <div className="text-[13px] text-content-secondary leading-relaxed">{children}</div>
      <p className="text-[9px] text-content-disabled mt-2">AI analysis · Not financial advice</p>
    </div>
  );
}

/** Generate deterministic demo data from a seed */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Generate monthly time-series data */
export function generateTimeSeries(
  months: number,
  startValue: number,
  volatility: number,
  trend: number,
  seed: number = 42,
): { month: string; value: number }[] {
  const rng = seededRandom(seed);
  const data: { month: string; value: number }[] = [];
  let value = startValue;
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    value = value * (1 + trend / 12) + (rng() - 0.5) * volatility;
    data.push({ month: label, value: Math.round(value * 100) / 100 });
  }
  return data;
}
