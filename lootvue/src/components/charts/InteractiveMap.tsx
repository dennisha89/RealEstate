"use client";

/**
 * InteractiveMap — deck.gl + MapLibre interactive choropleth map.
 *
 * Supports:
 *  - Full drag / pan / zoom (MapLibre native)
 *  - State drill-down → city scatter → breadcrumb back navigation
 *  - Search bar (states + cities autocomplete)
 *  - Score-based color fill (emerald / amber / rose)
 *  - Hover tooltips with BUY/HOLD/SELL badge + key metrics
 *  - 3D extrusion toggle (ColumnLayer, height = score)
 *  - Zoom +/- buttons
 *  - "National → State → City" breadcrumb
 *
 * Integration:
 *  - DeckGL (reverse-controlled) wraps react-map-gl/maplibre Map
 *  - GeoJsonLayer for state boundaries
 *  - ScatterplotLayer + ColumnLayer for city markers
 *  - Lazy-loaded via next/dynamic({ ssr: false }) in the Markets page
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, ScatterplotLayer, ColumnLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "@deck.gl/core";
import { Map, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
// CSS imported in globals.css or layout to avoid chunk loading issues in production
// import "maplibre-gl/dist/maplibre-gl.css";
import {
  Search,
  X,
  Plus,
  Minus,
  ChevronRight,
  MapPin,
  TrendingUp,
  TrendingDown,
  Box,
  Map as MapIcon,
} from "lucide-react";
import { CHART_COLORS } from "./ChartTheme";
import type { MarketScore } from "./CapitalFlowMap";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const DARK_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const GEO_STATES_URL = "/data/us-states.json";

// State name → 2-letter code for GeoJSON matching
const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR",
  California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS",
  Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};

// State centroids for fly-to on click [lng, lat, zoom]
const STATE_CENTROIDS: Record<string, [number, number, number]> = {
  AL: [-86.79, 32.80, 6.2], AK: [-153.37, 64.20, 3.5], AZ: [-111.09, 34.05, 6.0],
  AR: [-92.37, 34.97, 6.2], CA: [-119.68, 37.27, 5.3], CO: [-105.55, 39.06, 6.0],
  CT: [-72.73, 41.60, 8.2], DE: [-75.50, 39.00, 8.5], FL: [-81.52, 27.77, 5.9],
  GA: [-83.44, 32.65, 6.2], HI: [-157.50, 20.27, 6.5], ID: [-114.48, 44.24, 5.8],
  IL: [-88.99, 40.35, 6.0], IN: [-86.27, 40.04, 6.5], IA: [-93.21, 42.01, 6.3],
  KS: [-98.38, 38.53, 6.2], KY: [-84.86, 37.67, 6.3], LA: [-91.83, 31.17, 6.2],
  ME: [-69.38, 44.69, 6.5], MD: [-76.67, 39.06, 7.5], MA: [-71.53, 42.26, 7.8],
  MI: [-84.54, 44.18, 5.8], MN: [-93.90, 46.44, 5.8], MS: [-89.68, 32.74, 6.2],
  MO: [-92.29, 38.46, 6.0], MT: [-109.64, 47.03, 5.5], NE: [-99.90, 41.49, 6.0],
  NV: [-116.42, 38.31, 5.8], NH: [-71.57, 43.45, 7.5], NJ: [-74.52, 40.06, 7.5],
  NM: [-106.11, 34.31, 5.8], NY: [-75.53, 42.85, 6.3], NC: [-79.38, 35.54, 6.2],
  ND: [-100.47, 47.52, 6.0], OH: [-82.76, 40.42, 6.3], OK: [-97.09, 35.57, 6.1],
  OR: [-120.54, 43.93, 5.8], PA: [-77.21, 40.89, 6.3], RI: [-71.51, 41.68, 9.0],
  SC: [-80.90, 33.84, 6.5], SD: [-99.43, 44.44, 5.8], TN: [-86.69, 35.86, 6.2],
  TX: [-99.34, 31.05, 5.4], UT: [-111.09, 39.31, 6.0], VT: [-72.71, 44.06, 7.5],
  VA: [-78.66, 37.43, 6.3], WA: [-120.74, 47.38, 5.8], WV: [-80.45, 38.65, 6.8],
  WI: [-89.62, 44.27, 6.0], WY: [-107.55, 43.08, 5.8],
};

interface CityData {
  city: string;
  state: string;
  lat: number;
  lng: number;
  score: number;
  medianPrice: number;
  population: number;
}

const SAMPLE_CITIES: CityData[] = [
  { city: "Austin",       state: "TX", lat: 30.267, lng: -97.743,  score: 78, medianPrice: 425000,  population: 1028000 },
  { city: "Dallas",       state: "TX", lat: 32.777, lng: -96.796,  score: 72, medianPrice: 365000,  population: 1340000 },
  { city: "Houston",      state: "TX", lat: 29.760, lng: -95.369,  score: 68, medianPrice: 310000,  population: 2320000 },
  { city: "Tampa",        state: "FL", lat: 27.950, lng: -82.457,  score: 74, medianPrice: 385000,  population: 404000  },
  { city: "Jacksonville", state: "FL", lat: 30.332, lng: -81.655,  score: 70, medianPrice: 320000,  population: 954000  },
  { city: "Orlando",      state: "FL", lat: 28.538, lng: -81.379,  score: 69, medianPrice: 375000,  population: 315000  },
  { city: "Nashville",    state: "TN", lat: 36.162, lng: -86.781,  score: 71, medianPrice: 430000,  population: 689000  },
  { city: "Memphis",      state: "TN", lat: 35.149, lng: -89.978,  score: 58, medianPrice: 195000,  population: 633000  },
  { city: "Atlanta",      state: "GA", lat: 33.749, lng: -84.388,  score: 67, medianPrice: 390000,  population: 510000  },
  { city: "Charlotte",    state: "NC", lat: 35.227, lng: -80.843,  score: 66, medianPrice: 370000,  population: 897000  },
  { city: "Raleigh",      state: "NC", lat: 35.779, lng: -78.638,  score: 70, medianPrice: 410000,  population: 483000  },
  { city: "Phoenix",      state: "AZ", lat: 33.448, lng: -112.074, score: 63, medianPrice: 415000,  population: 1680000 },
  { city: "Los Angeles",  state: "CA", lat: 34.052, lng: -118.243, score: 38, medianPrice: 920000,  population: 3970000 },
  { city: "San Francisco",state: "CA", lat: 37.775, lng: -122.419, score: 35, medianPrice: 1350000, population: 874000  },
  { city: "New York",     state: "NY", lat: 40.713, lng: -74.006,  score: 36, medianPrice: 780000,  population: 8340000 },
  { city: "Chicago",      state: "IL", lat: 41.878, lng: -87.630,  score: 40, medianPrice: 310000,  population: 2696000 },
];

/* ═══════════════════════════════════════════════════════════════
   COLOR HELPERS
   ═══════════════════════════════════════════════════════════════ */

/** Returns RGBA array [r, g, b, a] for a score 0-100 */
function scoreToRGBA(score: number, alpha = 200): [number, number, number, number] {
  if (score >= 70) return [16,  185, 129, alpha]; // emerald
  if (score >= 45) return [245, 158, 11,  alpha]; // amber
  return              [239, 68,  68,  alpha]; // rose
}

function scoreToHex(score: number): string {
  if (score >= 70) return CHART_COLORS.emerald;
  if (score >= 45) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

function scoreLabel(score: number): "BUY" | "HOLD" | "SELL" {
  if (score >= 70) return "BUY";
  if (score >= 45) return "HOLD";
  return "SELL";
}

function badgeClass(label: "BUY" | "HOLD" | "SELL"): string {
  return label === "BUY" ? "badge-emerald" : label === "HOLD" ? "badge-amber" : "badge-rose";
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH CANDIDATES
   ═══════════════════════════════════════════════════════════════ */

interface SearchCandidate {
  label: string;
  sublabel: string;
  type: "state" | "city";
  stateCode: string;
  cityName?: string;
  lat: number;
  lng: number;
  zoom: number;
}

function buildSearchCandidates(data: MarketScore[]): SearchCandidate[] {
  const candidates: SearchCandidate[] = [];

  // States from the score data
  for (const m of data) {
    const centroid = STATE_CENTROIDS[m.stateCode];
    if (!centroid) continue;
    candidates.push({
      label: m.stateName,
      sublabel: `State · Score ${m.score}`,
      type: "state",
      stateCode: m.stateCode,
      lat: centroid[1],
      lng: centroid[0],
      zoom: centroid[2],
    });
  }

  // Cities from sample data
  for (const c of SAMPLE_CITIES) {
    candidates.push({
      label: c.city,
      sublabel: `${c.state} · Score ${c.score}`,
      type: "city",
      stateCode: c.state,
      cityName: c.city,
      lat: c.lat,
      lng: c.lng,
      zoom: 10,
    });
  }

  return candidates;
}

/* ═══════════════════════════════════════════════════════════════
   DECK OVERLAY WRAPPER (needed for interleaved mode with react-map-gl)
   ═══════════════════════════════════════════════════════════════ */

function DeckGLOverlay(props: MapboxOverlayProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   HOVER TOOLTIP
   ═══════════════════════════════════════════════════════════════ */

interface HoverInfo {
  x: number;
  y: number;
  type: "state" | "city";
  name: string;
  score: number;
  medianPrice?: number;
  yoyAppreciation?: number;
  convergence?: number;
  population?: number;
  topMetro?: string;
}

function HoverTooltip({ info }: { info: HoverInfo }) {
  const sig = scoreLabel(info.score);
  const scoreColor = scoreToHex(info.score);
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  });

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[200px] rounded-xl border border-surface-border"
      style={{
        left: info.x + 14,
        top: info.y - 8,
        backgroundColor: "#141414",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(31,31,31,1)",
        transform: "translateY(-50%)",
      }}
      role="tooltip"
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-2.5">
          <div>
            <div className="text-[13px] font-semibold text-content-primary leading-tight">
              {info.name}
            </div>
            {info.topMetro && info.type === "state" && (
              <div className="text-[10px] text-content-tertiary mt-0.5">
                Top metro: {info.topMetro}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`badge text-[10px] font-bold ${badgeClass(sig)}`}>{sig}</span>
            <span
              className="text-[20px] font-bold font-mono tabular-nums leading-none"
              style={{ color: scoreColor }}
              aria-label={`Score ${info.score} out of 100`}
            >
              {info.score}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-1 text-[11px]">
          {info.medianPrice !== undefined && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-content-disabled">Median Price</span>
              <span className="font-mono text-content-primary font-semibold">
                {fmt.format(info.medianPrice)}
              </span>
            </div>
          )}
          {info.yoyAppreciation !== undefined && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-content-disabled">YoY</span>
              <span
                className="font-mono font-semibold"
                style={{
                  color:
                    info.yoyAppreciation >= 0
                      ? CHART_COLORS.emerald
                      : CHART_COLORS.rose,
                }}
              >
                {info.yoyAppreciation >= 0 ? "+" : ""}
                {info.yoyAppreciation.toFixed(1)}%
                {info.yoyAppreciation >= 0 ? (
                  <TrendingUp className="inline w-3 h-3 ml-0.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="inline w-3 h-3 ml-0.5" aria-hidden="true" />
                )}
              </span>
            </div>
          )}
          {info.convergence !== undefined && (
            <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-surface-border">
              <span className="text-content-disabled">Convergence</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        i < info.convergence!
                          ? CHART_COLORS.gold
                          : "#333333",
                    }}
                    aria-hidden="true"
                  />
                ))}
                <span className="font-mono text-content-secondary ml-1">
                  {info.convergence}/5
                </span>
              </div>
            </div>
          )}
          {info.population !== undefined && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-content-disabled">Population</span>
              <span className="font-mono text-content-secondary">
                {new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(info.population)}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Click hint */}
      <div className="px-3 pb-2.5">
        <p className="text-[9px] text-content-disabled">
          Click to drill down
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BREADCRUMB COMPONENT
   ═══════════════════════════════════════════════════════════════ */

type DrillLevel = "national" | "state" | "city";

interface BreadcrumbItem {
  label: string;
  level: DrillLevel;
}

function MapBreadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: BreadcrumbItem[];
  onNavigate: (level: DrillLevel) => void;
}) {
  return (
    <div
      className="absolute top-3 left-3 z-10 flex items-center gap-1 px-3 py-1.5 rounded-lg"
      style={{
        background: "rgba(10,10,10,0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(31,31,31,0.9)",
      }}
      aria-label="Map navigation breadcrumb"
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.level} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="w-3 h-3 text-content-disabled" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="text-[11px] font-semibold text-gold">
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(crumb.level)}
                className="text-[11px] text-content-tertiary hover:text-content-secondary transition-colors focus-visible:outline-none focus-visible:underline"
                aria-label={`Navigate back to ${crumb.label}`}
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH BAR
   ═══════════════════════════════════════════════════════════════ */

function MapSearchBar({
  candidates,
  onSelect,
}: {
  candidates: SearchCandidate[];
  onSelect: (c: SearchCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return candidates
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.stateCode.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, candidates]);

  const handleSelect = useCallback(
    (c: SearchCandidate) => {
      setQuery("");
      setOpen(false);
      onSelect(c);
    },
    [onSelect]
  );

  return (
    <div
      className="absolute top-3 right-3 z-20 w-56"
      role="search"
      aria-label="Search states and cities"
    >
      <div
        className="relative flex items-center rounded-lg overflow-hidden"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(31,31,31,0.9)",
        }}
      >
        <Search
          className="w-3.5 h-3.5 text-content-disabled absolute left-3 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search state or city..."
          className="w-full bg-transparent text-[12px] text-content-primary placeholder:text-content-disabled pl-8 pr-8 py-2 focus:outline-none"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
          aria-controls="map-search-results"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-2.5 text-content-disabled hover:text-content-secondary transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul
          id="map-search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden"
          style={{
            background: "rgba(14,14,14,0.97)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(31,31,31,0.9)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {filtered.map((c) => (
            <li
              key={`${c.type}-${c.label}`}
              role="option"
              aria-selected={false}
            >
              <button
                onMouseDown={() => handleSelect(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-elevated transition-colors"
              >
                <MapPin
                  className="w-3 h-3 text-content-disabled shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-content-primary font-medium truncate">
                    {c.label}
                  </div>
                  <div className="text-[10px] text-content-disabled">{c.sublabel}</div>
                </div>
                <span
                  className="text-[11px] font-mono font-bold shrink-0"
                  style={{
                    color: scoreToHex(
                      parseInt(c.sublabel.match(/Score (\d+)/)?.[1] ?? "50", 10)
                    ),
                  }}
                >
                  {c.stateCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ZOOM CONTROLS
   ═══════════════════════════════════════════════════════════════ */

function ZoomControls({
  onZoomIn,
  onZoomOut,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div
      className="absolute bottom-6 right-3 z-10 flex flex-col"
      style={{ gap: 1 }}
    >
      <button
        onClick={onZoomIn}
        className="flex items-center justify-center w-8 h-8 rounded-t-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(31,31,31,0.9)",
          color: "#999999",
        }}
        aria-label="Zoom in"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <button
        onClick={onZoomOut}
        className="flex items-center justify-center w-8 h-8 rounded-b-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(31,31,31,0.9)",
          color: "#999999",
        }}
        aria-label="Zoom out"
      >
        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIEW STATE TYPE
   ═══════════════════════════════════════════════════════════════ */

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  transitionInterpolator?: FlyToInterpolator;
}

const NATIONAL_VIEW: ViewState = {
  longitude: -96,
  latitude: 38.5,
  zoom: 3.8,
  pitch: 0,
  bearing: 0,
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export interface InteractiveMapProps {
  data?: MarketScore[];
  onGeoSelect?: (
    level: "national" | "state" | "city" | "zip",
    code: string
  ) => void;
  className?: string;
}

export function InteractiveMap({
  data = [],
  onGeoSelect,
  className = "",
}: InteractiveMapProps) {
  const [viewState, setViewState] = useState<ViewState>(NATIONAL_VIEW);
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("national");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [geoData, setGeoData] = useState<object | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);

  // Build score lookup map
  const scoreMap = useMemo<Record<string, MarketScore>>(() => {
    const map: Record<string, MarketScore> = {};
    for (const m of data) {
      map[m.stateCode] = m;
    }
    return map;
  }, [data]);

  const searchCandidates = useMemo(
    () => buildSearchCandidates(data),
    [data]
  );

  // Breadcrumbs
  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const crumbs: BreadcrumbItem[] = [{ label: "National", level: "national" }];
    if (selectedState && (drillLevel === "state" || drillLevel === "city")) {
      const stateName =
        data.find((m) => m.stateCode === selectedState)?.stateName ??
        selectedState;
      crumbs.push({ label: stateName, level: "state" });
    }
    if (selectedCity && drillLevel === "city") {
      crumbs.push({ label: selectedCity, level: "city" });
    }
    return crumbs;
  }, [drillLevel, selectedState, selectedCity, data]);

  // Lazy-load GeoJSON (avoid blocking initial render)
  const loadGeo = useCallback(() => {
    if (geoData || !geoLoading) return;
    fetch(GEO_STATES_URL)
      .then((r) => {
        if (!r.ok) throw new Error("GeoJSON fetch failed");
        return r.json();
      })
      .then((json) => {
        setGeoData(json);
        setGeoLoading(false);
      })
      .catch(() => {
        setGeoError(true);
        setGeoLoading(false);
      });
  }, [geoData, geoLoading]);

  // Trigger geo load on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadGeo(); }, []);

  // Fly to a new location
  const flyTo = useCallback(
    (
      lng: number,
      lat: number,
      zoom: number,
      pitch = 0
    ) => {
      setViewState((prev) => ({
        ...prev,
        longitude: lng,
        latitude: lat,
        zoom,
        pitch,
        bearing: 0,
        transitionDuration: 1800,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.4 }),
      }));
    },
    []
  );

  // Handle state polygon click
  const handleStateClick = useCallback(
    (stateName: string) => {
      const code = STATE_NAME_TO_CODE[stateName];
      if (!code) return;
      const centroid = STATE_CENTROIDS[code];
      if (!centroid) return;

      setSelectedState(code);
      setSelectedCity(null);
      setDrillLevel("state");

      const pitch = show3D ? 45 : 0;
      flyTo(centroid[0], centroid[1], centroid[2], pitch);
      onGeoSelect?.("state", code);
    },
    [flyTo, show3D, onGeoSelect]
  );

  // Handle city marker click
  const handleCityClick = useCallback(
    (city: CityData) => {
      setSelectedCity(city.city);
      setDrillLevel("city");
      flyTo(city.lng, city.lat, 10.5, show3D ? 50 : 0);
      onGeoSelect?.("city", `${city.state}-${city.city}`);
    },
    [flyTo, show3D, onGeoSelect]
  );

  // Breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (level: DrillLevel) => {
      if (level === "national") {
        setSelectedState(null);
        setSelectedCity(null);
        setDrillLevel("national");
        setViewState({
          ...NATIONAL_VIEW,
          transitionDuration: 1500,
          transitionInterpolator: new FlyToInterpolator({ speed: 1.2 }),
        });
        onGeoSelect?.("national", "US");
      } else if (level === "state" && selectedState) {
        setSelectedCity(null);
        setDrillLevel("state");
        const centroid = STATE_CENTROIDS[selectedState];
        if (centroid) {
          flyTo(centroid[0], centroid[1], centroid[2]);
        }
        onGeoSelect?.("state", selectedState);
      }
    },
    [selectedState, flyTo, onGeoSelect]
  );

  // Search select
  const handleSearchSelect = useCallback(
    (candidate: SearchCandidate) => {
      if (candidate.type === "state") {
        setSelectedState(candidate.stateCode);
        setSelectedCity(null);
        setDrillLevel("state");
        flyTo(candidate.lng, candidate.lat, candidate.zoom, show3D ? 45 : 0);
        onGeoSelect?.("state", candidate.stateCode);
      } else {
        setSelectedState(candidate.stateCode);
        setSelectedCity(candidate.cityName ?? null);
        setDrillLevel("city");
        flyTo(candidate.lng, candidate.lat, candidate.zoom, show3D ? 50 : 0);
        onGeoSelect?.(
          "city",
          `${candidate.stateCode}-${candidate.cityName ?? ""}`
        );
      }
    },
    [flyTo, show3D, onGeoSelect]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setViewState((vs) => ({
      ...vs,
      zoom: Math.min(vs.zoom + 1, 18),
      transitionDuration: 300,
    }));
  }, []);
  const handleZoomOut = useCallback(() => {
    setViewState((vs) => ({
      ...vs,
      zoom: Math.max(vs.zoom - 1, 2),
      transitionDuration: 300,
    }));
  }, []);

  // Cities visible in state drill-down
  const visibleCities = useMemo(() => {
    if (drillLevel === "national") return [];
    if (drillLevel === "state" && selectedState) {
      return SAMPLE_CITIES.filter((c) => c.state === selectedState);
    }
    if (drillLevel === "city" && selectedCity) {
      return SAMPLE_CITIES.filter((c) => c.city === selectedCity);
    }
    return [];
  }, [drillLevel, selectedState, selectedCity]);

  /* ─── deck.gl Layers ────────────────────────────────────────────── */

  const layers = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = [];

    // State boundary layer
    if (geoData) {
      all.push(
        new GeoJsonLayer({
          id: "states-fill",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: geoData as any,
          stroked: true,
          filled: true,
          extruded: false,
          pickable: true,
          getFillColor: (f: { properties: { name?: string } }) => {
            const name = f.properties?.name ?? "";
            const code = STATE_NAME_TO_CODE[name] ?? "";
            const market = scoreMap[code];
            if (!market) return [30, 30, 30, 180];
            const isSelected = selectedState === code;
            const alpha = isSelected ? 230 : drillLevel === "state" ? 100 : 200;
            return scoreToRGBA(market.score, alpha);
          },
          getLineColor: (f: { properties: { name?: string } }) => {
            const name = f.properties?.name ?? "";
            const code = STATE_NAME_TO_CODE[name] ?? "";
            const isSelected = selectedState === code;
            return isSelected
              ? [201, 162, 39, 255] // gold border on selected
              : [31, 31, 31, 200];
          },
          getLineWidth: (f: { properties: { name?: string } }) => {
            const name = f.properties?.name ?? "";
            const code = STATE_NAME_TO_CODE[name] ?? "";
            return selectedState === code ? 2500 : 800;
          },
          lineWidthUnits: "meters",
          lineWidthMinPixels: 0.5,
          onHover: (info: {
            x: number;
            y: number;
            object?: { properties?: { name?: string } };
          }) => {
            if (info.object) {
              const name = info.object.properties?.name ?? "";
              const code = STATE_NAME_TO_CODE[name] ?? "";
              const market = scoreMap[code];
              if (market) {
                setHoverInfo({
                  x: info.x,
                  y: info.y,
                  type: "state",
                  name: market.stateName,
                  score: market.score,
                  medianPrice: market.medianHomePrice,
                  yoyAppreciation: market.yoyAppreciation,
                  convergence: market.convergence,
                  topMetro: market.topMetro,
                });
              } else {
                setHoverInfo(null);
              }
            } else {
              setHoverInfo(null);
            }
          },
          onClick: (info: { object?: { properties?: { name?: string } } }) => {
            if (info.object) {
              const name = info.object.properties?.name ?? "";
              handleStateClick(name);
            }
          },
          updateTriggers: {
            getFillColor: [scoreMap, selectedState, drillLevel],
            getLineColor: [selectedState],
            getLineWidth: [selectedState],
          },
        })
      );
    }

    // City scatter layer (visible when drilled into a state or city)
    if (visibleCities.length > 0 && !show3D) {
      all.push(
        new ScatterplotLayer<CityData>({
          id: "cities-scatter",
          data: visibleCities,
          pickable: true,
          opacity: 0.95,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 6,
          radiusMaxPixels: 28,
          getPosition: (d) => [d.lng, d.lat, 0],
          getRadius: (d) => Math.sqrt(d.population) * 15,
          getFillColor: (d) => {
            const [r, g, b] = scoreToRGBA(d.score, 220);
            return [r, g, b, 220];
          },
          getLineColor: (d) => {
            const isSelected = selectedCity === d.city;
            return isSelected
              ? [201, 162, 39, 255]
              : [255, 255, 255, 60];
          },
          getLineWidth: (d) => (selectedCity === d.city ? 3 : 1),
          onHover: (info: {
            x: number;
            y: number;
            object?: CityData;
          }) => {
            if (info.object) {
              setHoverInfo({
                x: info.x,
                y: info.y,
                type: "city",
                name: `${info.object.city}, ${info.object.state}`,
                score: info.object.score,
                medianPrice: info.object.medianPrice,
                population: info.object.population,
              });
            } else {
              setHoverInfo(null);
            }
          },
          onClick: (info: { object?: CityData }) => {
            if (info.object) handleCityClick(info.object);
          },
          updateTriggers: {
            getFillColor: [],
            getLineColor: [selectedCity],
            getLineWidth: [selectedCity],
          },
        })
      );
    }

    // 3D Column layer (extrusion mode, visible when drilled + show3D)
    if (visibleCities.length > 0 && show3D) {
      all.push(
        new ColumnLayer<CityData>({
          id: "cities-columns",
          data: visibleCities,
          diskResolution: 12,
          radius: 8000,
          extruded: true,
          pickable: true,
          getPosition: (d) => [d.lng, d.lat],
          getElevation: (d) => d.score * 600,
          getFillColor: (d) => scoreToRGBA(d.score, 220),
          getLineColor: [201, 162, 39, 180],
          lineWidthMinPixels: 1,
          onHover: (info: {
            x: number;
            y: number;
            object?: CityData;
          }) => {
            if (info.object) {
              setHoverInfo({
                x: info.x,
                y: info.y,
                type: "city",
                name: `${info.object.city}, ${info.object.state}`,
                score: info.object.score,
                medianPrice: info.object.medianPrice,
                population: info.object.population,
              });
            } else {
              setHoverInfo(null);
            }
          },
          onClick: (info: { object?: CityData }) => {
            if (info.object) handleCityClick(info.object);
          },
        })
      );
    }

    return all;
  }, [
    geoData,
    scoreMap,
    selectedState,
    selectedCity,
    drillLevel,
    visibleCities,
    show3D,
    handleStateClick,
    handleCityClick,
  ]);

  /* ─── Render ────────────────────────────────────────────────────── */

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-xl ${className}`}
      style={{ minHeight: 420, background: "#000000" }}
      aria-label="Interactive US market map"
    >
      {/* MapLibre + deck.gl */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState as ViewState)}
        mapStyle={DARK_MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
      >
        <DeckGLOverlay
          layers={layers}
          interleaved={false}
          getCursor={() => (hoverInfo ? "pointer" : "grab")}
        />
      </Map>

      {/* Breadcrumb */}
      <MapBreadcrumb crumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />

      {/* Search bar */}
      <MapSearchBar candidates={searchCandidates} onSelect={handleSearchSelect} />

      {/* Zoom controls */}
      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

      {/* 3D toggle */}
      <div className="absolute bottom-6 left-3 z-10">
        <button
          onClick={() => {
            setShow3D((v) => {
              const next = !v;
              // Adjust pitch when toggling 3D
              setViewState((vs) => ({
                ...vs,
                pitch: next && drillLevel !== "national" ? 45 : 0,
                transitionDuration: 600,
              }));
              return next;
            });
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
          style={{
            background: show3D
              ? "rgba(201,162,39,0.15)"
              : "rgba(10,10,10,0.92)",
            backdropFilter: "blur(12px)",
            border: show3D
              ? "1px solid rgba(201,162,39,0.4)"
              : "1px solid rgba(31,31,31,0.9)",
            color: show3D ? "#C9A227" : "#666666",
          }}
          aria-pressed={show3D}
          aria-label={show3D ? "Switch to flat map" : "Switch to 3D view"}
        >
          {show3D ? (
            <Box className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {show3D ? "3D" : "2D"}
        </button>
      </div>

      {/* Level label */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-md"
        style={{
          background: "rgba(10,10,10,0.82)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(31,31,31,0.7)",
        }}
        aria-live="polite"
      >
        <span className="text-[10px] font-mono text-content-disabled uppercase tracking-widest">
          {drillLevel === "national"
            ? "Click a state to drill down"
            : drillLevel === "state"
            ? "Click a city marker"
            : "City view"}
        </span>
      </div>

      {/* Loading overlay */}
      {geoLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", zIndex: 30 }}
          aria-busy="true"
          aria-label="Loading map data"
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-gold animate-spin"
              style={{ borderTopColor: "transparent" }}
            />
            <span className="text-[11px] text-content-tertiary">
              Loading map data...
            </span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {geoError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", zIndex: 30 }}
        >
          <div className="text-center">
            <p className="text-[13px] text-rose font-medium mb-1">
              Unable to load map boundaries
            </p>
            <p className="text-[11px] text-content-disabled">
              Check your network connection
            </p>
            <button
              onClick={() => {
                setGeoError(false);
                setGeoLoading(true);
                loadGeo();
              }}
              className="mt-3 btn-ghost text-[11px]"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoverInfo && <HoverTooltip info={hoverInfo} />}

      {/* Attribution (minimal) */}
      <div className="absolute bottom-1 right-2 z-10">
        <span className="text-[8px] text-content-disabled opacity-50">
          Map data: CartoDB · Boundaries: PublicaMundi
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */

export function InteractiveMapSkeleton() {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ minHeight: 420, background: "#000000" }}
      aria-busy="true"
      aria-label="Loading interactive map"
    >
      <div className="skeleton w-full h-full absolute inset-0" />
      <div className="absolute top-3 left-3 skeleton h-6 w-40 rounded-lg" />
      <div className="absolute top-3 right-3 skeleton h-7 w-52 rounded-lg" />
      <div className="absolute bottom-6 right-3 flex flex-col gap-px">
        <div className="skeleton h-8 w-8 rounded-t-lg" />
        <div className="skeleton h-8 w-8 rounded-b-lg" />
      </div>
    </div>
  );
}
