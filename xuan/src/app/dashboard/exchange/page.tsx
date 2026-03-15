"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeftRight, Eye, Heart, MapPin, Tag, Filter, TrendingUp,
  DollarSign,
} from "lucide-react";
import { useExchangeStore, computeExchangeMatch } from "@/lib/stores/exchange-store";
import { useBuyBoxStore } from "@/lib/stores/buybox-store";
import { MOCK_EXCHANGE_LISTINGS } from "@/lib/mock/exchange-data";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import type { ExchangeListing } from "@/lib/types/marketplace";

type Market = "All" | "Austin" | "Tampa" | "Raleigh" | "Nashville" | "Phoenix" | "Columbus";
type PropType = "All" | "SFR" | "Duplex";
type SortKey = "match" | "newest" | "price_asc" | "price_desc";

const daysSince = (iso: string) => {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d === 0 ? "Today" : `${d}d ago`;
};

const listingBadge = (t: ExchangeListing["listingType"]) => {
  if (t === "wholesale") return "badge-gold";
  if (t === "assignment") return "badge-amber";
  if (t === "off_market") return "badge-emerald";
  return "bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 text-[11px] font-medium rounded-md";
};

const matchBar = (s: number) => (s >= 70 ? "bg-emerald" : s >= 40 ? "bg-gold" : "bg-rose-500");
const cfColor   = (n: number) => (n >= 0 ? "text-emerald-light" : "text-rose-light");

export default function ExchangePage() {
  const storeListings  = useExchangeStore((s) => s.listings);
  const markInterested = useExchangeStore((s) => s.markInterested);
  const criteria       = useBuyBoxStore((s) => s.criteria);

  const [market,   setMarket]   = useState<Market>("All");
  const [propType, setPropType] = useState<PropType>("All");
  const [sort,     setSort]     = useState<SortKey>("match");
  const [showMine, setShowMine] = useState(false);
  const [liked,    setLiked]    = useState<Set<string>>(new Set());

  // Merge + deduplicate
  const allListings = useMemo<ExchangeListing[]>(() => {
    const ids = new Set(storeListings.map((l) => l.id));
    return [
      ...storeListings,
      ...MOCK_EXCHANGE_LISTINGS.filter((l) => !ids.has(l.id)),
    ].filter((l) => l.status === "active");
  }, [storeListings]);

  const withScores = useMemo(
    () => allListings.map((l) => ({ l, match: computeExchangeMatch(criteria, l) })),
    [allListings, criteria]
  );

  // Stats
  const avgPrice    = allListings.length ? allListings.reduce((s, l) => s + l.askingPrice, 0) / allListings.length : 0;
  const bbMatches   = withScores.filter((w) => w.match.matchScore >= 60).length;
  const totalViews  = allListings.reduce((s, l) => s + l.viewCount, 0);

  const filtered = useMemo(() => {
    let list = withScores;
    if (market   !== "All") list = list.filter((w) => w.l.market === market);
    if (propType !== "All") list = list.filter((w) => w.l.propertyType === propType.toLowerCase());
    if (showMine)           list = list.filter((w) => w.l.listedBy === "Investor");
    return [...list].sort((a, b) => {
      if (sort === "match")     return b.match.matchScore - a.match.matchScore;
      if (sort === "newest")    return new Date(b.l.createdAt).getTime() - new Date(a.l.createdAt).getTime();
      if (sort === "price_asc") return a.l.askingPrice - b.l.askingPrice;
      return b.l.askingPrice - a.l.askingPrice;
    });
  }, [withScores, market, propType, showMine, sort]);

  const handleInterested = (id: string, isMock: boolean) => {
    if (liked.has(id)) return;
    setLiked((prev) => new Set(prev).add(id));
    if (!isMock) markInterested(id);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <ArrowLeftRight className="w-3.5 h-3.5" /> Marketplace
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Deal Exchange</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          Off-market deals from other investors. Your PASS is someone else&apos;s BUY.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Listings",    value: allListings.length.toString(),      icon: Tag         },
          { label: "Avg Price",          value: `$${formatCompact(avgPrice)}`,       icon: DollarSign  },
          { label: "My Buy Box Matches", value: bbMatches.toString(),                icon: TrendingUp  },
          { label: "Total Views",        value: totalViews.toLocaleString(),         icon: Eye         },
        ].map((s) => (
          <div key={s.label} className="card-glass">
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon className="w-3.5 h-3.5 text-content-tertiary" />
              <span className="metric-label">{s.label}</span>
            </div>
            <div className="font-mono text-xl font-bold text-content-primary">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card !p-3 flex flex-wrap items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-content-tertiary shrink-0" />
        <select value={market} onChange={(e) => setMarket(e.target.value as Market)}
          className="input !w-32 !py-1.5 !text-xs">
          {(["All","Austin","Tampa","Raleigh","Nashville","Phoenix","Columbus"] as Market[]).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5">
          {(["All","SFR","Duplex"] as PropType[]).map((t) => (
            <button key={t} onClick={() => setPropType(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${propType === t ? "bg-gold-muted text-gold-light" : "text-content-tertiary hover:text-content-secondary"}`}>
              {t}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
          className="input !w-32 !py-1.5 !text-xs">
          <option value="match">Best Match</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price Low</option>
          <option value="price_desc">Price High</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input type="checkbox" checked={showMine} onChange={(e) => setShowMine(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-gold" />
          <span className="text-xs text-content-secondary">Show My Listings</span>
        </label>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card text-center py-10">
          <ArrowLeftRight className="w-8 h-8 text-content-disabled mx-auto mb-3" />
          <p className="text-sm text-content-secondary">No listings match your filters.</p>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(({ l, match }) => {
          const isMock   = l.id.startsWith("ex_mock_");
          const isLiked  = liked.has(l.id);
          const href     = isMock ? "#" : `/dashboard/deal-room/${l.dealRoomId}`;

          return (
            <div key={l.id} className="card !p-4 space-y-3">
              {/* Badge + age */}
              <div className="flex items-center justify-between gap-2">
                <span className={listingBadge(l.listingType)}>{l.listingType.replace("_", " ")}</span>
                <span className="text-[11px] text-content-disabled">{daysSince(l.createdAt)}</span>
              </div>

              {/* Address */}
              <div>
                <p className="text-[13px] font-medium text-content-primary truncate">{l.address}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-content-disabled" />
                  <span className="text-xs text-content-tertiary">{l.market}, {l.state}</span>
                </div>
              </div>

              {/* Price + score + verdict */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-content-primary">{formatCurrency(l.askingPrice)}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-content-primary">{l.score}</span>
                  <span className={l.verdict === "BUY" ? "badge-emerald" : "badge-rose"}>{l.verdict}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-4 text-xs text-content-tertiary">
                <span>Cap <span className="font-mono text-content-secondary">{l.capRate.toFixed(1)}%</span></span>
                <span>CF <span className={`font-mono font-semibold ${cfColor(l.monthlyCashFlow)}`}>
                  {l.monthlyCashFlow >= 0 ? "+" : ""}{formatCurrency(l.monthlyCashFlow)}/mo
                </span></span>
                <span>DSCR <span className="font-mono text-content-secondary">{l.dscr.toFixed(2)}</span></span>
              </div>

              {/* Match bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="metric-label">Buy Box Match</span>
                  <span className="font-mono text-[11px] text-content-secondary">{match.matchScore}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${matchBar(match.matchScore)}`}
                    style={{ width: `${match.matchScore}%` }} />
                </div>
              </div>

              {/* Why passing */}
              {l.whyPassing && (
                <p className="text-xs italic text-content-tertiary line-clamp-2 leading-relaxed">
                  &ldquo;{l.whyPassing}&rdquo;
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-surface-border">
                <div className="flex items-center gap-3 text-[11px] text-content-disabled">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.viewCount}</span>
                  <span className="flex items-center gap-1">
                    <Heart className={`w-3 h-3 ${isLiked ? "text-rose-light fill-rose-500/40" : ""}`} />
                    {l.interestedCount + (isLiked ? 1 : 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={href} className="btn-ghost btn-sm text-xs">View Deal Room</Link>
                  <button onClick={() => handleInterested(l.id, isMock)} disabled={isLiked}
                    className={`btn-secondary btn-sm text-xs ${isLiked ? "opacity-50 cursor-default" : ""}`}>
                    {isLiked ? "Interested" : "I'm Interested"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
