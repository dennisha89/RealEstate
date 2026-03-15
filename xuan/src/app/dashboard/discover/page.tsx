"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  MapPin, RefreshCw, SlidersHorizontal, Compass, ChevronDown, ChevronUp,
  Bookmark, ArrowUpRight, Users, Bed, Bath, Ruler, X,
} from "lucide-react";
import { useBuyBoxStore, type PropertyCandidate } from "@/lib/stores/buybox-store";
import { useDealPipelineStore } from "@/lib/stores/deal-pipeline-store";

// --- Deterministic mock generator ---
function seededRand(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface MockProperty {
  id: string; address: string; price: number; capRate: number; cashFlow: number;
  score: number; distance: number; beds: number; baths: number; sqft: number;
  dscr: number; cashOnCash: number; yearBuilt: number; dom: number; propertyType: string;
}

function generateProperties(lat: number, lng: number, radius: number): MockProperty[] {
  const seed = Math.round(lat * 1000) + Math.round(Math.abs(lng) * 1000);
  const rand = seededRand(seed);
  const streets = ["Oak Valley Dr","Magnolia Ln","Cedar Ridge Ct","Pine Creek Blvd","Elm Park Ave","Birch Hollow Way","Walnut Springs Rd","Cypress Point Dr","Pecan Grove Ln","Laurel Heights Pl"];
  const props: MockProperty[] = [];
  for (let i = 0; i < 10; i++) {
    const r = rand;
    const dist = +(r() * radius).toFixed(1);
    const price = Math.round((180000 + r() * 270000) / 1000) * 1000;
    const score = Math.round(40 + r() * 50);
    const capRate = +(4 + r() * 5).toFixed(1);
    const cashFlow = Math.round(-100 + r() * 700);
    const beds = 2 + Math.round(r() * 3);
    const baths = 1 + Math.round(r() * 2);
    const sqft = 900 + Math.round(r() * 2000);
    props.push({
      id: `disc-${i}-${seed}`, address: `${100 + Math.round(r() * 9800)} ${streets[i]}`,
      price, capRate, cashFlow, score, distance: dist, beds, baths, sqft,
      dscr: +(0.8 + r() * 0.8).toFixed(2), cashOnCash: +(3 + r() * 8).toFixed(1),
      yearBuilt: 1975 + Math.round(r() * 50), dom: Math.round(r() * 90),
      propertyType: ["sfr","duplex","townhome","condo"][Math.floor(r() * 4)],
    });
  }
  return props;
}

type SortKey = "score" | "price" | "capRate" | "distance";

function scoreBadge(s: number) {
  if (s >= 75) return "bg-emerald-muted text-emerald-light";
  if (s >= 55) return "bg-amber-muted text-amber-light";
  return "bg-rose-muted text-rose-light";
}

function cashFlowColor(cf: number) {
  return cf >= 200 ? "text-emerald-light" : cf > 0 ? "text-amber-light" : "text-rose-light";
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function DiscoverPage() {
  const [lat] = useState(30.27);
  const [lng] = useState(-97.74);
  const [radius, setRadius] = useState(10);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [buyBoxActive, setBuyBoxActive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const matchesBox = useBuyBoxStore((s) => s.matchesBox);
  const addDeal = useDealPipelineStore((s) => s.addDeal);

  const properties = useMemo(() => generateProperties(lat, lng, radius), [lat, lng, radius]);

  const sorted = useMemo(() => {
    const list = [...properties];
    if (sortBy === "score") list.sort((a, b) => b.score - a.score);
    else if (sortBy === "price") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "capRate") list.sort((a, b) => b.capRate - a.capRate);
    else list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [properties, sortBy]);

  function toBuyBoxCandidate(p: MockProperty): PropertyCandidate {
    return {
      price: p.price, capRate: p.capRate, monthlyCashFlow: p.cashFlow,
      cashOnCash: +p.cashOnCash, dscr: p.dscr, propertyType: p.propertyType,
      bedrooms: p.beds, yearBuilt: p.yearBuilt, hyperScore: p.score, daysOnMarket: p.dom,
    };
  }

  function handleSave(p: MockProperty) {
    addDeal({ status: "discovered", address: p.address, market: "Austin", state: "TX", zip: "78701", price: p.price, propertyType: p.propertyType });
  }

  const investorsToday = 12 + Math.round(Math.abs(lat * 3) % 20);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <Compass className="w-3.5 h-3.5" /> Property Discovery
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Discover Properties</h1>
      </div>

      {/* Location bar */}
      <div className="card-glass !p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[13px] text-content-secondary">
          <MapPin className="w-4 h-4 text-gold-light" />
          <span>Properties near</span>
          <span className="font-mono font-semibold text-content-primary">{lat.toFixed(2)}, {lng.toFixed(2)}</span>
          <span className="text-content-disabled">(Austin, TX)</span>
        </div>
        <button className="btn-ghost btn-sm flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-content-tertiary" />
          <label className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">Radius</label>
          <select value={radius} onChange={(e) => setRadius(+e.target.value)}
            className="input !w-24 !py-1.5 !text-xs font-mono">
            {[1, 5, 10, 15, 25, 50].map((r) => <option key={r} value={r}>{r} mi</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-content-disabled uppercase tracking-wider font-medium">Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="input !w-28 !py-1.5 !text-xs font-mono">
            <option value="score">Score</option>
            <option value="price">Price</option>
            <option value="capRate">Cap Rate</option>
            <option value="distance">Distance</option>
          </select>
        </div>
        <button onClick={() => setBuyBoxActive(!buyBoxActive)}
          className={`btn btn-sm text-xs ${buyBoxActive ? "bg-gold-muted text-gold-light border border-gold/30" : "bg-white/[0.04] text-content-secondary border border-white/[0.06]"}`}>
          Buy Box {buyBoxActive ? "ON" : "OFF"}
        </button>
        <span className="ml-auto text-[11px] text-content-disabled flex items-center gap-1">
          <Users className="w-3 h-3" /> {investorsToday} investors analyzed this area today
        </span>
      </div>

      {/* Property grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map((p) => {
          const isExpanded = expanded === p.id;
          const match = buyBoxActive ? matchesBox(toBuyBoxCandidate(p)) : null;
          return (
            <div key={p.id} className={`card-hover !p-0 overflow-hidden ${isExpanded ? "ring-1 ring-gold/30" : ""}`}>
              <button className="w-full text-left p-4" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`badge font-mono font-bold ${scoreBadge(p.score)}`}>{p.score}</span>
                  <div className="flex items-center gap-2">
                    {match && <span className="badge-gold font-mono">{match.matchScore}% match</span>}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-content-disabled" /> : <ChevronDown className="w-3.5 h-3.5 text-content-disabled" />}
                  </div>
                </div>
                <div className="text-[13px] font-medium text-content-primary truncate">{p.address}</div>
                <div className="font-mono text-lg font-bold text-content-primary mt-1">{fmt(p.price)}</div>
                <div className="flex items-center gap-3 mt-2 text-xs text-content-secondary flex-wrap">
                  <span className="font-mono">Cap {p.capRate}%</span>
                  <span className={`font-mono font-semibold ${cashFlowColor(p.cashFlow)}`}>
                    {p.cashFlow >= 0 ? "+" : ""}{fmt(p.cashFlow)}/mo
                  </span>
                  <span className="text-content-disabled">{p.distance} mi</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-content-tertiary">
                  <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{p.beds}</span>
                  <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{p.baths}</span>
                  <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{p.sqft.toLocaleString()} sqft</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-surface-border px-4 py-3 bg-white/[0.01] space-y-3 animate-fade-in">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "DSCR", value: p.dscr.toFixed(2) },
                      { label: "CoC", value: `${p.cashOnCash}%` },
                      { label: "DOM", value: `${p.dom}d` },
                    ].map((m) => (
                      <div key={m.label} className="p-2 rounded-lg bg-white/[0.02]">
                        <div className="text-[10px] text-content-disabled uppercase tracking-wider">{m.label}</div>
                        <div className="font-mono text-sm font-semibold text-content-primary mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSave(p)} className="btn-emerald btn-sm flex-1">
                      <Bookmark className="w-3 h-3" /> Save to Pipeline
                    </button>
                    <Link href="/dashboard/analyze" className="btn-primary btn-sm flex-1 text-center">
                      <ArrowUpRight className="w-3 h-3" /> Full Analysis
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
