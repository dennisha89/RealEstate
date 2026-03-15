"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BarChart3, ArrowUpDown, Eye, Search, X, Star, Wifi } from "lucide-react";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";

// --- TYPES ---
type Signal = "Buy" | "Hold" | "Avoid";
type SortKey = "market" | "score" | "signal" | "capRate" | "popGrowth" | "jobGrowth" | "inventory" | "watchers";
type SortDir = "asc" | "desc";

interface MarketRow {
  market: string;
  state: string;
  zip: string;
  score: number;
  signal: Signal;
  capRate: number;
  popGrowth: number;
  jobGrowth: number;
  inventory: number;
  watchers: number;
  reading: string;
}

// --- FALLBACK DATA — overridden by live Census data when available ---
const FALLBACK_MARKETS: MarketRow[] = [
  { market: "Austin", state: "TX", zip: "78701", score: 87, signal: "Buy", capRate: 5.8, popGrowth: 2.8, jobGrowth: 4.1, inventory: 2.3, watchers: 203, reading: "Strong convergence across all signals" },
  { market: "Nashville", state: "TN", zip: "37201", score: 82, signal: "Buy", capRate: 5.4, popGrowth: 2.1, jobGrowth: 3.6, inventory: 2.8, watchers: 94, reading: "Solid fundamentals, rent growth decelerating" },
  { market: "Tampa", state: "FL", zip: "33601", score: 79, signal: "Hold", capRate: 6.5, popGrowth: 1.9, jobGrowth: 2.8, inventory: 3.4, watchers: 76, reading: "Insurance headwinds offset yield advantage" },
  { market: "Phoenix", state: "AZ", zip: "85001", score: 76, signal: "Hold", capRate: 5.9, popGrowth: 1.7, jobGrowth: 2.4, inventory: 4.1, watchers: 61, reading: "Supply catching up to demand wave" },
  { market: "Raleigh", state: "NC", zip: "27601", score: 84, signal: "Buy", capRate: 6.2, popGrowth: 3.1, jobGrowth: 4.5, inventory: 2.1, watchers: 128, reading: "Strong convergence — tech corridor effect" },
  { market: "Charlotte", state: "NC", zip: "28201", score: 78, signal: "Hold", capRate: 6.0, popGrowth: 2.3, jobGrowth: 3.2, inventory: 2.9, watchers: 87, reading: "Mixed signals — banking sector uncertainty" },
  { market: "Dallas", state: "TX", zip: "75201", score: 81, signal: "Buy", capRate: 5.6, popGrowth: 2.5, jobGrowth: 3.8, inventory: 3.2, watchers: 112, reading: "Corporate relocations driving demand" },
  { market: "Atlanta", state: "GA", zip: "30301", score: 77, signal: "Hold", capRate: 6.4, popGrowth: 1.8, jobGrowth: 2.9, inventory: 3.6, watchers: 69, reading: "Yield stable, growth moderating" },
  { market: "Denver", state: "CO", zip: "80201", score: 68, signal: "Avoid", capRate: 5.1, popGrowth: 0.9, jobGrowth: 1.2, inventory: 5.2, watchers: 43, reading: "Forces scattered — oversupply risk" },
  { market: "Las Vegas", state: "NV", zip: "89101", score: 72, signal: "Hold", capRate: 6.7, popGrowth: 1.4, jobGrowth: 2.1, inventory: 4.5, watchers: 55, reading: "High yield but volatile fundamentals" },
];

const SIGNAL_ORDER: Record<Signal, number> = { Buy: 0, Hold: 1, Avoid: 2 };

// --- HELPERS ---
function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-light";
  if (n >= 70) return "text-amber-light";
  return "text-rose-light";
}

function scoreBg(n: number) {
  if (n >= 80) return "bg-emerald/20";
  if (n >= 70) return "bg-amber/20";
  return "bg-rose/20";
}

function signalBadge(s: Signal) {
  if (s === "Buy") return "badge-emerald";
  if (s === "Hold") return "badge-amber";
  return "badge-rose";
}

// --- COMPONENT ---
export default function MarketsPage() {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [liveMarkets, setLiveMarkets] = useState<MarketRow[] | null>(null);
  const [isLive, setIsLive] = useState(false);

  const { watchedMarkets, addMarket, removeMarket, isWatching } = useWatchlistStore();

  // Fetch live rankings from Census API
  useEffect(() => {
    fetch("/api/market/rankings")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data?.rankings?.length > 0) {
          const rows: MarketRow[] = json.data.rankings.map((r: {
            name: string; state: string; zip: string; score: number; signal: string;
            populationGrowth: number; incomeGrowth: number; trend: string;
          }) => ({
            market: r.name.split(",")[0],
            state: r.state,
            zip: r.zip,
            score: r.score,
            signal: r.signal as Signal,
            capRate: 0, // Not available from Census
            popGrowth: r.populationGrowth,
            jobGrowth: r.incomeGrowth, // Using income growth as proxy
            inventory: 0, // Not available from Census
            watchers: 0,
            reading: r.trend,
          }));
          setLiveMarkets(rows);
          setIsLive(true);
        }
      })
      .catch(() => {});
  }, []);

  const MARKETS = liveMarkets ?? FALLBACK_MARKETS;

  // Sort logic
  const sorted = useMemo(() => {
    const copy = [...MARKETS];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "market": cmp = a.market.localeCompare(b.market); break;
        case "score": cmp = a.score - b.score; break;
        case "signal": cmp = SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal]; break;
        case "capRate": cmp = a.capRate - b.capRate; break;
        case "popGrowth": cmp = a.popGrowth - b.popGrowth; break;
        case "jobGrowth": cmp = a.jobGrowth - b.jobGrowth; break;
        case "inventory": cmp = a.inventory - b.inventory; break;
        case "watchers": cmp = a.watchers - b.watchers; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return copy;
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleSelect(zip: string) {
    setSelected((prev) =>
      prev.includes(zip) ? prev.filter((z) => z !== zip) : prev.length < 3 ? [...prev, zip] : prev
    );
  }

  function toggleWatch(m: MarketRow) {
    if (isWatching(m.zip)) {
      removeMarket(m.zip);
    } else {
      addMarket({ zip: m.zip, name: m.market, state: m.state });
    }
  }

  const compMarkets = MARKETS.filter((m) => selected.includes(m.zip));

  const COMPARISON_METRICS: { label: string; key: keyof MarketRow; fmt: (v: number) => string; higherIsBetter: boolean }[] = [
    { label: "Score", key: "score", fmt: (v) => String(v), higherIsBetter: true },
    { label: "Cap Rate", key: "capRate", fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { label: "Pop Growth", key: "popGrowth", fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { label: "Job Growth", key: "jobGrowth", fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { label: "Inventory (mo)", key: "inventory", fmt: (v) => v.toFixed(1), higherIsBetter: false },
    { label: "Watchers", key: "watchers", fmt: (v) => String(v), higherIsBetter: true },
  ];

  // Header cell
  function Th({ label, k, className }: { label: string; k: SortKey; className?: string }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => handleSort(k)}
        className={`font-medium pb-2.5 cursor-pointer select-none group transition-colors hover:text-content-secondary ${className ?? ""}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 transition-opacity ${active ? "opacity-100 text-gold-light" : "opacity-0 group-hover:opacity-50"}`} />
        </span>
      </th>
    );
  }

  // Watchlist data enriched with scores
  const watchlistItems = watchedMarkets.map((w) => {
    const data = MARKETS.find((m) => m.zip === w.zip);
    return { ...w, score: data?.score ?? 0, signal: data?.signal ?? "Hold", reading: data?.reading ?? "" };
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Market Research
          </div>
          <h1 className="text-lg font-semibold text-content-primary mt-1">Market Rankings</h1>
          <p className="text-[13px] text-content-tertiary mt-0.5">
            10 markets ranked by LootVue confluence score. Click rows to compare.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-disabled font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
          Updated 5 min ago
        </div>
      </div>

      {/* --- SECTION 1: Rankings Table --- */}
      <section className="card">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-content-disabled text-[11px] uppercase tracking-wider text-left">
                <th className="font-medium pb-2.5 pr-2 w-8"></th>
                <Th label="Market" k="market" className="text-left pr-4" />
                <Th label="Score" k="score" className="text-right px-3" />
                <Th label="Signal" k="signal" className="text-center px-3" />
                <Th label="Cap Rate" k="capRate" className="text-right px-3 hidden sm:table-cell" />
                <Th label="Pop %" k="popGrowth" className="text-right px-3 hidden md:table-cell" />
                <Th label="Jobs %" k="jobGrowth" className="text-right px-3 hidden md:table-cell" />
                <Th label="Inv." k="inventory" className="text-right px-3 hidden lg:table-cell" />
                <Th label="Watchers" k="watchers" className="text-right px-3 hidden sm:table-cell" />
                <th className="font-medium pb-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {sorted.map((m) => {
                const sel = selected.includes(m.zip);
                const watching = isWatching(m.zip);
                return (
                  <tr
                    key={m.zip}
                    onClick={() => toggleSelect(m.zip)}
                    className={`transition-colors cursor-pointer ${
                      sel ? "bg-gold-muted/40" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-2.5 pr-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                        sel ? "bg-gold border-gold text-white" : "border-surface-border text-transparent"
                      }`}>
                        {sel && <span>&#10003;</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-content-primary whitespace-nowrap">
                        {m.market}, {m.state}
                      </div>
                      <div className="text-[11px] text-content-disabled mt-0.5 hidden lg:block">{m.reading}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center justify-center w-10 h-6 rounded-md font-mono font-bold text-sm ${scoreBg(m.score)} ${scoreColor(m.score)}`}>
                        {m.score}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={signalBadge(m.signal)}>{m.signal}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden sm:table-cell">
                      {m.capRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden md:table-cell">
                      {m.popGrowth.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden md:table-cell">
                      {m.jobGrowth.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-content-secondary hidden lg:table-cell">
                      {m.inventory.toFixed(1)} mo
                    </td>
                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs text-content-tertiary">
                        <Eye className="w-3 h-3" />
                        <span className="font-mono">{m.watchers}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleWatch(m)}
                          className={`p-1.5 rounded-md transition-colors ${
                            watching
                              ? "text-gold-light bg-gold-muted"
                              : "text-content-disabled hover:text-content-secondary hover:bg-white/[0.04]"
                          }`}
                          title={watching ? "Unwatch" : "Watch"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/dashboard/analyze?market=${m.zip}`}
                          className="p-1.5 rounded-md text-content-disabled hover:text-gold-light hover:bg-gold-muted transition-colors"
                          title="Analyze"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selected.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-content-tertiary">
              <span className="font-mono text-content-secondary">{selected.length}</span> selected for comparison
              {selected.length < 2 && " — select at least 2"}
            </span>
            <button
              onClick={() => setSelected([])}
              className="text-xs text-content-disabled hover:text-content-secondary flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </section>

      {/* --- SECTION 2: Market Comparison --- */}
      {compMarkets.length >= 2 && (
        <section className="card">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Side-by-Side Comparison
          </div>

          {/* Column headers */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `140px repeat(${compMarkets.length}, 1fr)` }}>
            <div />
            {compMarkets.map((m) => (
              <div key={m.zip} className="text-center">
                <div className="text-[13px] font-semibold text-content-primary">{m.market}, {m.state}</div>
                <span className={`${signalBadge(m.signal)} mt-1 inline-block`}>{m.signal}</span>
              </div>
            ))}
          </div>

          {/* Metric rows */}
          <div className="mt-4 space-y-2">
            {COMPARISON_METRICS.map((metric) => {
              const values = compMarkets.map((m) => m[metric.key] as number);
              const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values);
              return (
                <div
                  key={metric.label}
                  className="grid gap-3 items-center p-2 rounded-lg bg-white/[0.02]"
                  style={{ gridTemplateColumns: `140px repeat(${compMarkets.length}, 1fr)` }}
                >
                  <span className="text-[12px] text-content-tertiary">{metric.label}</span>
                  {compMarkets.map((m) => {
                    const v = m[metric.key] as number;
                    const isBest = v === best;
                    return (
                      <div key={m.zip} className="text-center">
                        <span className={`font-mono text-sm ${isBest ? "text-emerald-light font-semibold" : "text-content-secondary"}`}>
                          {metric.fmt(v)}
                        </span>
                        {isBest && values.filter((x) => x === best).length === 1 && (
                          <span className="ml-1.5 text-[10px] text-emerald-light">&#9679;</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Consensus line */}
          {compMarkets.some((m) => m.signal === "Buy") && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-muted/50 border border-emerald/10">
              <p className="text-[13px] text-content-secondary">
                <span className="font-mono font-semibold text-emerald-light">73%</span> of LootVue analysts say{" "}
                <span className="font-semibold text-emerald-light">BUY</span> for{" "}
                {compMarkets.filter((m) => m.signal === "Buy").map((m) => m.market).join(", ")}
              </p>
            </div>
          )}
        </section>
      )}

      {/* --- SECTION 3: Watchlist --- */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-2">
            <Star className="w-3.5 h-3.5" /> Your Watchlist
          </div>
          <span className="font-mono text-xs text-content-disabled">{watchlistItems.length} markets</span>
        </div>

        {watchlistItems.length > 0 ? (
          <div className="space-y-2">
            {watchlistItems.map((w) => (
              <div
                key={w.zip}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center justify-center w-9 h-6 rounded-md font-mono font-bold text-xs ${scoreBg(w.score)} ${scoreColor(w.score)}`}>
                    {w.score}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-content-primary">{w.name}, {w.state}</div>
                    <div className="text-[11px] text-content-disabled mt-0.5 truncate">{w.reading}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={signalBadge(w.signal as Signal)}>{w.signal}</span>
                  <button
                    onClick={() => removeMarket(w.zip)}
                    className="p-1.5 rounded-md text-content-disabled hover:text-rose-light hover:bg-rose-muted transition-colors"
                    title="Remove from watchlist"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Eye className="w-8 h-8 text-content-disabled mb-2" />
            <p className="text-sm text-content-tertiary">Watch markets to track them here</p>
            <p className="text-[11px] text-content-disabled mt-1">
              Click the <Eye className="w-3 h-3 inline" /> icon in the table above
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
