"use client";

/**
 * MultiDimensionalExplorer — 4D interactive market scatter with time scrubbing
 *
 * Maps any 4 of 10 quant dimensions to:
 *   X position · Y position · Bubble SIZE · Bubble COLOR
 *
 * Time slider scrubs through 60 months (Jan 2021 – Dec 2025).
 * Play button animates the evolution of every market over time.
 * Animated trails show the path each city traveled during playback.
 *
 * Architecture:
 *   - generateCityTimeSeries: deterministic 60-month data per city/dimension
 *   - useMemo on ECharts option: re-derives only on [dimensions, cities, timeIndex]
 *   - ECharts scatter: one series per active city, color = dimension value gradient
 *   - Trail series: line series rendered during playback showing historical path
 *   - Quadrant lines: markLine at median X and median Y of active cities
 */

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { CHART_COLORS, seededRandom } from "./ChartTheme";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const MONTH_COUNT = 60; // Jan 2021 – Dec 2025

/** All 10 selectable dimensions */
export type DimensionKey =
  | "marketScore"
  | "permitsGrowth"
  | "hpiMomentum"
  | "employmentGrowth"
  | "monthsOfSupply"
  | "medianPrice"
  | "yoyAppreciation"
  | "populationGrowth"
  | "rentGrowth"
  | "capRateAvg";

export interface DimensionMeta {
  key: DimensionKey;
  label: string;
  unit: string;
  /** Lower is better (inverted color scale) */
  inverted?: boolean;
  format: (v: number) => string;
}

export const DIMENSIONS: DimensionMeta[] = [
  {
    key: "marketScore",
    label: "Market Score",
    unit: "/100",
    format: (v) => v.toFixed(0),
  },
  {
    key: "permitsGrowth",
    label: "Permits Growth",
    unit: "% YoY",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    key: "hpiMomentum",
    label: "HPI Momentum",
    unit: "% YoY",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    key: "employmentGrowth",
    label: "Employment Growth",
    unit: "% YoY",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    key: "monthsOfSupply",
    label: "Months of Supply",
    unit: "mo",
    inverted: true,
    format: (v) => `${v.toFixed(1)} mo`,
  },
  {
    key: "medianPrice",
    label: "Median Price",
    unit: "$",
    format: (v) => {
      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
      return `$${(v / 1_000).toFixed(0)}K`;
    },
  },
  {
    key: "yoyAppreciation",
    label: "YoY Appreciation",
    unit: "%",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    key: "populationGrowth",
    label: "Population Growth",
    unit: "% YoY",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`,
  },
  {
    key: "rentGrowth",
    label: "Rent Growth",
    unit: "% YoY",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
  },
  {
    key: "capRateAvg",
    label: "Cap Rate Avg",
    unit: "%",
    format: (v) => `${v.toFixed(2)}%`,
  },
];

const DIM_MAP: Record<DimensionKey, DimensionMeta> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d])
) as Record<DimensionKey, DimensionMeta>;

/* ─────────────────────────────────────────────────────────────
   CITY ROSTER
───────────────────────────────────────────────────────────── */

export interface CityProfile {
  name: string;
  state: string;
  /** City-level baseline characteristics that drive seeded data generation */
  growthBias: number;   // +1 strong growth, -1 declining
  supplyBias: number;   // +1 tight supply, -1 oversupplied
  priceTier: number;    // 1=affordable, 3=expensive
}

export const ALL_CITIES: CityProfile[] = [
  { name: "Austin",        state: "TX", growthBias:  0.9, supplyBias:  0.3, priceTier: 2 },
  { name: "Tampa",         state: "FL", growthBias:  0.7, supplyBias:  0.5, priceTier: 1 },
  { name: "Nashville",     state: "TN", growthBias:  0.8, supplyBias:  0.4, priceTier: 2 },
  { name: "Charlotte",     state: "NC", growthBias:  0.9, supplyBias:  0.6, priceTier: 1 },
  { name: "Phoenix",       state: "AZ", growthBias:  0.1, supplyBias: -0.3, priceTier: 2 },
  { name: "Atlanta",       state: "GA", growthBias:  0.5, supplyBias:  0.1, priceTier: 1 },
  { name: "Dallas",        state: "TX", growthBias:  0.4, supplyBias: -0.1, priceTier: 1 },
  { name: "Las Vegas",     state: "NV", growthBias:  0.2, supplyBias: -0.2, priceTier: 1 },
  { name: "Denver",        state: "CO", growthBias: -0.3, supplyBias: -0.5, priceTier: 2 },
  { name: "Portland",      state: "OR", growthBias: -0.6, supplyBias: -0.6, priceTier: 3 },
  { name: "Seattle",       state: "WA", growthBias:  0.5, supplyBias:  0.3, priceTier: 3 },
  { name: "Columbus",      state: "OH", growthBias:  0.4, supplyBias:  0.4, priceTier: 1 },
  { name: "Boise",         state: "ID", growthBias: -0.1, supplyBias: -0.3, priceTier: 1 },
  { name: "San Antonio",   state: "TX", growthBias:  0.5, supplyBias:  0.1, priceTier: 1 },
  { name: "Jacksonville",  state: "FL", growthBias:  0.6, supplyBias:  0.4, priceTier: 1 },
  { name: "Orlando",       state: "FL", growthBias:  0.7, supplyBias:  0.2, priceTier: 1 },
  { name: "Raleigh",       state: "NC", growthBias:  0.8, supplyBias:  0.5, priceTier: 2 },
  { name: "Salt Lake City",state: "UT", growthBias:  0.3, supplyBias: -0.1, priceTier: 2 },
  { name: "Indianapolis",  state: "IN", growthBias:  0.3, supplyBias:  0.3, priceTier: 1 },
];

const DEFAULT_CITIES = ["Austin", "Tampa", "Nashville", "Charlotte", "Phoenix"];
const MAX_CITIES = 8;

/* ─────────────────────────────────────────────────────────────
   TIME-SERIES DATA GENERATION
───────────────────────────────────────────────────────────── */

/** All 10 dimension values for one city at one month */
export type CitySnapshot = Record<DimensionKey, number>;

/**
 * Generates 60 months of deterministic data for a given city.
 * Each dimension follows a realistic arc:
 *   - Strong-growth cities start high and maintain with mild regression
 *   - Cooling cities (Denver, Portland) show decline mid-period
 *   - Supply dimensions drift inversely to demand signals
 */
export function generateCityTimeSeries(city: CityProfile): CitySnapshot[] {
  // Create per-city, per-dimension seeds so data is reproducible
  const cityHash = city.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Each dimension gets its own RNG stream
  const rng = (dimensionOffset: number) =>
    seededRandom(cityHash * 31 + dimensionOffset * 997);

  // Cooling event: cities with negative bias have a trough around month 18-30
  const coolingMonth = 18 + Math.floor(seededRandom(cityHash)() * 12);

  const snapshots: CitySnapshot[] = [];

  for (let m = 0; m < MONTH_COUNT; m++) {
    // Normalized phase 0..1
    const t = m / (MONTH_COUNT - 1);

    // Growth arc: peak early, fade or sustain based on bias
    const growthCurve = city.growthBias > 0
      ? city.growthBias * (1 - 0.3 * t)                        // strong: slight fade
      : city.growthBias * (1 + 0.5 * Math.sin(Math.PI * t));   // weak: trough then partial recovery

    // Supply arc: inversely correlated with growth
    const supplyCurve = -city.supplyBias * 0.4 * t + (1 - city.supplyBias) * 0.3;

    // Noise generators per dimension
    const rngPg = rng(1);
    const rngHpi = rng(2);
    const rngEmp = rng(3);
    const rngSup = rng(4);
    const rngPop = rng(5);
    const rngRent = rng(6);
    const rngCap = rng(7);
    const rngAppr = rng(8);

    // Advance RNG to current month position
    for (let skip = 0; skip < m; skip++) {
      rngPg(); rngHpi(); rngEmp(); rngSup();
      rngPop(); rngRent(); rngCap(); rngAppr();
    }

    // Permits Growth: % YoY, range -20 to +50
    const permitsBase = 20 * growthCurve;
    const permitsGrowth = permitsBase + (rngPg() - 0.5) * 18;

    // HPI Momentum: % YoY, range -5 to +15
    const hpiBase = 5 * growthCurve + (m < coolingMonth ? 2 : -1) * Math.max(0, city.growthBias);
    const hpiMomentum = Math.max(-8, hpiBase + (rngHpi() - 0.5) * 4);

    // Employment Growth: % YoY, range 0 to 5
    const empBase = 2.5 + 2 * city.growthBias * (1 - 0.2 * t);
    const employmentGrowth = Math.max(0, empBase + (rngEmp() - 0.5) * 1.2);

    // Months of Supply: range 1 to 8 (lower = tighter)
    const supBase = 3.5 - 2.5 * city.supplyBias + supplyCurve;
    const monthsOfSupply = Math.max(1, Math.min(8, supBase + (rngSup() - 0.5) * 1.5));

    // Median Price: in dollars, range based on price tier
    const priceBase = [220_000, 380_000, 580_000][city.priceTier - 1] ?? 380_000;
    const priceAppreciation = 1 + 0.06 * city.growthBias * t;
    const medianPrice = Math.round((priceBase * priceAppreciation + (rngPg() - 0.5) * 20_000) / 1000) * 1000;

    // YoY Appreciation: % close to hpiMomentum with lag
    const yoyAppreciation = hpiMomentum * 0.85 + (rngAppr() - 0.5) * 2;

    // Population Growth: % YoY, 0 to 4%
    const popBase = 1.5 + 2.5 * city.growthBias * (1 - 0.25 * t);
    const populationGrowth = Math.max(-0.5, popBase + (rngPop() - 0.5) * 0.8);

    // Rent Growth: % YoY, correlated with HPI but lag
    const rentBase = hpiMomentum * 0.6 + city.growthBias * 2;
    const rentGrowth = Math.max(-4, rentBase + (rngRent() - 0.5) * 3);

    // Cap Rate Avg: % inversely tied to appreciation
    const capBase = 5.5 - 0.4 * city.growthBias - 0.3 * hpiMomentum;
    const capRateAvg = Math.max(3, Math.min(9, capBase + (rngCap() - 0.5) * 0.8));

    // Market Score: composite 0-100
    const marketScore = Math.round(
      Math.max(0, Math.min(100,
        50 +
        growthCurve * 30 +
        city.supplyBias * 15 +
        (rngPg() - 0.5) * 10
      ))
    );

    snapshots.push({
      marketScore,
      permitsGrowth: Math.round(permitsGrowth * 10) / 10,
      hpiMomentum: Math.round(hpiMomentum * 10) / 10,
      employmentGrowth: Math.round(employmentGrowth * 10) / 10,
      monthsOfSupply: Math.round(monthsOfSupply * 10) / 10,
      medianPrice,
      yoyAppreciation: Math.round(yoyAppreciation * 10) / 10,
      populationGrowth: Math.round(populationGrowth * 100) / 100,
      rentGrowth: Math.round(rentGrowth * 10) / 10,
      capRateAvg: Math.round(capRateAvg * 100) / 100,
    });
  }

  return snapshots;
}

/* Pre-compute all city time series once at module load */
const CITY_DATA: Record<string, CitySnapshot[]> = Object.fromEntries(
  ALL_CITIES.map((city) => [city.name, generateCityTimeSeries(city)])
);

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

/** Jan 2021 origin */
function monthLabel(index: number): string {
  const origin = new Date(2021, 0, 1); // Jan 2021
  const d = new Date(origin.getFullYear(), origin.getMonth() + index, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Normalize a raw value to 0-1 within the dataset range */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Map a normalized 0-1 value to a color on the
 * rose → amber → emerald gradient (color-blind safe, paired with labels).
 */
function scoreToHex(t: number, inverted: boolean): string {
  const effective = inverted ? 1 - t : t;
  // rose(0)  #EF4444  →  amber(0.5)  #F59E0B  →  emerald(1)  #10B981
  if (effective < 0.5) {
    const p = effective * 2;
    const r = Math.round(0xEF + p * (0xF5 - 0xEF));
    const g = Math.round(0x44 + p * (0x9E - 0x44));
    const b = Math.round(0x44 + p * (0x0B - 0x44));
    return `rgb(${r},${g},${b})`;
  } else {
    const p = (effective - 0.5) * 2;
    const r = Math.round(0xF5 + p * (0x10 - 0xF5));
    const g = Math.round(0x9E + p * (0xB9 - 0x9E));
    const b = Math.round(0x0B + p * (0x81 - 0x0B));
    return `rgb(${r},${g},${b})`;
  }
}

/** Map normalized size 0-1 to radius 10–50px */
function normToRadius(t: number): number {
  return Math.round(10 + t * 40);
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT PROPS & TYPES
───────────────────────────────────────────────────────────── */

export interface MultiDimensionalExplorerProps {
  className?: string;
  defaultCities?: string[];
}

interface SelectedDimensions {
  x: DimensionKey;
  y: DimensionKey;
  size: DimensionKey;
  color: DimensionKey;
}

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */

function DimSelect({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: DimensionKey;
  onChange: (k: DimensionKey) => void;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[9px] uppercase tracking-[0.12em] font-semibold"
        style={{ color: accent ?? CHART_COLORS.text }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DimensionKey)}
        className="rounded-lg px-3 py-1.5 text-[12px] font-mono border outline-none appearance-none cursor-pointer transition-all duration-150"
        style={{
          background: "#1A1A1A",
          borderColor: accent ? `${accent}33` : "#1F1F1F",
          color: accent ?? "#FAFAFA",
          boxShadow: accent ? `0 0 0 1px ${accent}22 inset` : undefined,
          minWidth: 160,
        }}
        aria-label={`Select ${label} dimension`}
      >
        {DIMENSIONS.map((d) => (
          <option key={d.key} value={d.key} style={{ background: "#1A1A1A", color: "#FAFAFA" }}>
            {d.label} ({d.unit})
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function MultiDimensionalExplorer({
  className,
  defaultCities = DEFAULT_CITIES,
}: MultiDimensionalExplorerProps) {
  /* ── Dimension state ── */
  const [dims, setDims] = useState<SelectedDimensions>({
    x:     "permitsGrowth",
    y:     "hpiMomentum",
    size:  "employmentGrowth",
    color: "marketScore",
  });

  /* ── City selection ── */
  const [activeCities, setActiveCities] = useState<Set<string>>(
    new Set(defaultCities.slice(0, MAX_CITIES))
  );

  /* ── Time slider ── */
  const [timeIndex, setTimeIndex] = useState(MONTH_COUNT - 1); // latest month by default
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Trail: list of past snapshots for animation ── */
  const [trailIndices, setTrailIndices] = useState<number[]>([]);
  const TRAIL_LENGTH = 8;

  /* ── Play / pause logic ── */
  const stopPlay = useCallback(() => {
    if (playRef.current !== null) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    stopPlay();
    setIsPlaying(true);
    setTrailIndices([]);
    // Reset to start if at end
    setTimeIndex((prev) => {
      if (prev >= MONTH_COUNT - 1) return 0;
      return prev;
    });
  }, [stopPlay]);

  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current !== null) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
      return;
    }

    playRef.current = setInterval(() => {
      setTimeIndex((prev) => {
        const next = prev + 1;
        if (next >= MONTH_COUNT) {
          stopPlay();
          return MONTH_COUNT - 1;
        }
        setTrailIndices((t) => {
          const updated = [...t, prev].slice(-TRAIL_LENGTH);
          return updated;
        });
        return next;
      });
    }, 500);

    return () => {
      if (playRef.current !== null) {
        clearInterval(playRef.current);
      }
    };
  }, [isPlaying, stopPlay]);

  /* When user manually drags, stop play and clear trail */
  const handleSliderChange = useCallback((value: number) => {
    stopPlay();
    setTrailIndices([]);
    setTimeIndex(value);
  }, [stopPlay]);

  /* ── City toggle ── */
  const toggleCity = useCallback((cityName: string) => {
    setActiveCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityName)) {
        if (next.size > 1) next.delete(cityName); // never go to 0
      } else {
        if (next.size < MAX_CITIES) next.add(cityName);
      }
      return next;
    });
  }, []);

  /* ── Derived: active city snapshots for current time index ── */
  const activeCityList = useMemo(
    () => ALL_CITIES.filter((c) => activeCities.has(c.name)),
    [activeCities]
  );

  const currentSnapshots = useMemo(() =>
    activeCityList.map((c) => ({
      city: c,
      snap: CITY_DATA[c.name]![timeIndex]!,
    })),
    [activeCityList, timeIndex]
  );

  /* ── Dimension stats for normalization ── */
  const dimStats = useMemo(() => {
    const compute = (key: DimensionKey) => {
      // Use all cities, all time for stable scale
      const vals = ALL_CITIES.flatMap((c) =>
        CITY_DATA[c.name]!.map((s) => s[key]!)
      );
      return {
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    };

    return {
      x:     compute(dims.x),
      y:     compute(dims.y),
      size:  compute(dims.size),
      color: compute(dims.color),
    };
  }, [dims]);

  /* ── Quadrant medians at current time ── */
  const medianX = useMemo(() => {
    const vals = currentSnapshots.map((s) => s.snap[dims.x]!).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2 : (vals[mid] ?? 0);
  }, [currentSnapshots, dims.x]);

  const medianY = useMemo(() => {
    const vals = currentSnapshots.map((s) => s.snap[dims.y]!).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2 : (vals[mid] ?? 0);
  }, [currentSnapshots, dims.y]);

  /* ── City score at current time for pill display ── */
  const cityScores = useMemo(() => {
    return Object.fromEntries(
      ALL_CITIES.map((c) => [c.name, CITY_DATA[c.name]![timeIndex]!.marketScore!])
    );
  }, [timeIndex]);

  /* ── ECharts option ── */
  const option = useMemo(() => {
    const dimXMeta    = DIM_MAP[dims.x];
    const dimYMeta    = DIM_MAP[dims.y];
    const dimSizeMeta = DIM_MAP[dims.size];
    const dimColorMeta = DIM_MAP[dims.color];

    // Axis ranges with padding
    const xVals = currentSnapshots.map((s) => s.snap[dims.x]!);
    const yVals = currentSnapshots.map((s) => s.snap[dims.y]!);
    const xSpan = Math.max(Math.abs(dimStats.x.max - dimStats.x.min) * 0.1, 0.5);
    const ySpan = Math.max(Math.abs(dimStats.y.max - dimStats.y.min) * 0.1, 0.5);
    const xMin = (xVals.length ? Math.min(...xVals) : dimStats.x.min) - xSpan;
    const xMax = (xVals.length ? Math.max(...xVals) : dimStats.x.max) + xSpan;
    const yMin = (yVals.length ? Math.min(...yVals) : dimStats.y.min) - ySpan;
    const yMax = (yVals.length ? Math.max(...yVals) : dimStats.y.max) + ySpan;

    // Build trail series (line traces during playback)
    const trailSeries = isPlaying && trailIndices.length > 0
      ? activeCityList.map((city) => {
          const trailData = trailIndices.map((ti) => [
            CITY_DATA[city.name]![ti]![dims.x]!,
            CITY_DATA[city.name]![ti]![dims.y]!,
          ]);
          const colorNorm = normalize(
            CITY_DATA[city.name]![timeIndex]![dims.color]!,
            dimStats.color.min,
            dimStats.color.max
          );
          const trailColor = scoreToHex(colorNorm, dimColorMeta.inverted ?? false);
          return {
            type: "line" as const,
            name: `_trail_${city.name}`,
            data: trailData,
            smooth: true,
            symbol: "none",
            silent: true,
            lineStyle: {
              color: trailColor,
              width: 1.5,
              opacity: 0.35,
              type: "solid" as const,
            },
            z: 1,
          };
        })
      : [];

    // Build scatter series — one per city
    const scatterSeries = currentSnapshots.map(({ city, snap }) => {
      const xVal = snap[dims.x]!;
      const yVal = snap[dims.y]!;
      const sizeVal = snap[dims.size]!;
      const colorVal = snap[dims.color]!;

      const sizeNorm  = normalize(sizeVal, dimStats.size.min, dimStats.size.max);
      const colorNorm = normalize(colorVal, dimStats.color.min, dimStats.color.max);

      const radius = normToRadius(sizeNorm);
      const bubbleColor = scoreToHex(colorNorm, dimColorMeta.inverted ?? false);

      const tooltipHtml = `
        <div style="font-family:'Inter',sans-serif;min-width:230px;padding:2px 0;">
          <div style="font-size:13px;font-weight:700;color:#FAFAFA;margin-bottom:4px;">
            ${city.name}, ${city.state}
          </div>
          <div style="font-size:9px;color:#666;letter-spacing:0.1em;margin-bottom:8px;">
            ${monthLabel(timeIndex).toUpperCase()}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:center;">
              <span style="font-size:10px;color:#666;">
                <span style="color:${CHART_COLORS.gold};font-weight:600;">X</span> — ${dimXMeta.label}
              </span>
              <span style="font-size:12px;font-weight:700;color:#FAFAFA;font-family:'JetBrains Mono',monospace;">
                ${dimXMeta.format(xVal)}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:center;">
              <span style="font-size:10px;color:#666;">
                <span style="color:${CHART_COLORS.goldLight};font-weight:600;">Y</span> — ${dimYMeta.label}
              </span>
              <span style="font-size:12px;font-weight:700;color:#FAFAFA;font-family:'JetBrains Mono',monospace;">
                ${dimYMeta.format(yVal)}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:center;">
              <span style="font-size:10px;color:#666;">Size — ${dimSizeMeta.label}</span>
              <span style="font-size:12px;font-weight:700;color:#E5E5E5;font-family:'JetBrains Mono',monospace;">
                ${dimSizeMeta.format(sizeVal)}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:20px;align-items:center;">
              <span style="font-size:10px;color:#666;">Color — ${dimColorMeta.label}</span>
              <span style="font-size:12px;font-weight:700;color:${bubbleColor};font-family:'JetBrains Mono',monospace;">
                ${dimColorMeta.format(colorVal)}
              </span>
            </div>
          </div>
          <div style="margin-top:10px;padding-top:8px;border-top:1px solid #1F1F1F;font-size:9px;color:#444;">
            Market Score: <span style="color:${scoreToHex(snap.marketScore! / 100, false)};font-weight:700;">${snap.marketScore!}/100</span>
          </div>
        </div>
      `;

      return {
        type: "scatter" as const,
        name: city.name,
        symbolSize: radius * 2,
        data: [[xVal, yVal]],
        itemStyle: {
          color: bubbleColor,
          opacity: 0.82,
          borderColor: "rgba(255,255,255,0.18)",
          borderWidth: 1.5,
          shadowBlur: 12,
          shadowColor: `${bubbleColor}55`,
        },
        emphasis: {
          itemStyle: {
            color: bubbleColor,
            opacity: 1,
            borderColor: CHART_COLORS.gold,
            borderWidth: 2.5,
            shadowBlur: 24,
            shadowColor: `${bubbleColor}80`,
          },
          scale: true,
          scaleSize: 6,
        },
        label: {
          show: true,
          formatter: city.name,
          position: "top" as const,
          distance: 8,
          fontSize: 10,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          color: "#CCCCCC",
          backgroundColor: "rgba(0,0,0,0.55)",
          padding: [2, 5],
          borderRadius: 4,
        },
        tooltip: {
          formatter: () => tooltipHtml,
        },
        z: 10,
      };
    });

    // Quadrant background overlay series
    const quadrantOverlay = {
      type: "scatter" as const,
      name: "_quadrants",
      data: [],
      silent: true,
      markArea: {
        silent: true,
        data: [
          [
            { xAxis: medianX, yAxis: medianY, itemStyle: { color: "rgba(16,185,129,0.04)" } },
            { xAxis: xMax, yAxis: yMax },
          ],
          [
            { xAxis: xMin, yAxis: yMin, itemStyle: { color: "rgba(239,68,68,0.04)" } },
            { xAxis: medianX, yAxis: medianY },
          ],
          [
            { xAxis: xMin, yAxis: medianY, itemStyle: { color: "rgba(245,158,11,0.03)" } },
            { xAxis: medianX, yAxis: yMax },
          ],
          [
            { xAxis: medianX, yAxis: yMin, itemStyle: { color: "rgba(245,158,11,0.03)" } },
            { xAxis: xMax, yAxis: medianY },
          ],
        ],
      },
      markLine: {
        silent: true,
        animation: false,
        symbol: ["none", "none"],
        lineStyle: { color: "#2A2A2A", type: "dashed" as const, width: 1 },
        label: { show: false },
        data: [
          { xAxis: medianX },
          { yAxis: medianY },
        ],
      },
    };

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 400,
      animationEasing: "cubicOut" as const,

      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: "#1A1A1A",
        borderColor: "#2A2A2A",
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: "#E5E5E5", fontSize: 12 },
        extraCssText:
          "box-shadow: 0 8px 32px rgba(0,0,0,0.7); border-radius: 10px; pointer-events: none;",
      },

      grid: {
        left: "9%",
        right: "4%",
        top: 40,
        bottom: 60,
        containLabel: true,
      },

      xAxis: {
        type: "value",
        name: `${dimXMeta.label} (${dimXMeta.unit})`,
        nameLocation: "middle",
        nameGap: 42,
        nameTextStyle: {
          color: CHART_COLORS.gold,
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
        },
        min: xMin,
        max: xMax,
        axisLine: { lineStyle: { color: "#2A2A2A" } },
        axisTick: { lineStyle: { color: "#2A2A2A" } },
        splitLine: { lineStyle: { color: "#161616", type: "dashed" as const } },
        axisLabel: {
          color: "#666666",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (v: number) => dimXMeta.format(v),
        },
      },

      yAxis: {
        type: "value",
        name: `${dimYMeta.label} (${dimYMeta.unit})`,
        nameLocation: "middle",
        nameGap: 60,
        nameTextStyle: {
          color: CHART_COLORS.goldLight,
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
        },
        min: yMin,
        max: yMax,
        axisLine: { lineStyle: { color: "#2A2A2A" } },
        axisTick: { lineStyle: { color: "#2A2A2A" } },
        splitLine: { lineStyle: { color: "#161616", type: "dashed" as const } },
        axisLabel: {
          color: "#666666",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          formatter: (v: number) => dimYMeta.format(v),
        },
      },

      // Quadrant corner labels
      graphic: [
        {
          type: "text",
          right: "5%",
          top: 44,
          style: {
            text: "Leaders",
            fill: CHART_COLORS.emerald,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: "bold",
            opacity: 0.45,
            letterSpacing: 2,
          },
          silent: true,
        },
        {
          type: "text",
          left: "9%",
          top: 44,
          style: {
            text: "Momentum",
            fill: CHART_COLORS.amber,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: "bold",
            opacity: 0.45,
            letterSpacing: 2,
          },
          silent: true,
        },
        {
          type: "text",
          right: "5%",
          bottom: 64,
          style: {
            text: "Value",
            fill: CHART_COLORS.amber,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: "bold",
            opacity: 0.45,
            letterSpacing: 2,
          },
          silent: true,
        },
        {
          type: "text",
          left: "9%",
          bottom: 64,
          style: {
            text: "Lagging",
            fill: CHART_COLORS.rose,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: "bold",
            opacity: 0.45,
            letterSpacing: 2,
          },
          silent: true,
        },
      ],

      series: [quadrantOverlay, ...trailSeries, ...scatterSeries],
    } as unknown as EChartsOption;
  }, [
    dims,
    currentSnapshots,
    dimStats,
    medianX,
    medianY,
    timeIndex,
    isPlaying,
    trailIndices,
    activeCityList,
  ]);

  /* ── City pill score color ── */
  const scoreColor = (s: number) => {
    if (s >= 70) return CHART_COLORS.emerald;
    if (s >= 50) return CHART_COLORS.amber;
    return CHART_COLORS.rose;
  };

  /* ── Color legend for active color dimension ── */
  const colorDimMeta = DIM_MAP[dims.color];
  const colorLegendStops = [
    { t: 0, label: colorDimMeta.inverted ? "High" : "Low" },
    { t: 0.5, label: "Mid" },
    { t: 1, label: colorDimMeta.inverted ? "Low" : "High" },
  ];

  /* ── Render ── */
  return (
    <div
      className={`flex flex-col gap-0 ${className ?? ""}`}
      style={{ minHeight: 640 }}
    >
      {/* ── SECTION 1: Dimension Controls ── */}
      <div
        className="flex flex-wrap gap-4 items-end px-5 py-4 rounded-t-xl border-b"
        style={{
          background: "rgba(17,17,17,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(201,162,39,0.12)",
        }}
      >
        <DimSelect
          label="X-Axis"
          value={dims.x}
          onChange={(k) => setDims((d) => ({ ...d, x: k }))}
          accent={CHART_COLORS.gold}
        />
        <DimSelect
          label="Y-Axis"
          value={dims.y}
          onChange={(k) => setDims((d) => ({ ...d, y: k }))}
          accent={CHART_COLORS.goldLight}
        />
        <DimSelect
          label="Size"
          value={dims.size}
          onChange={(k) => setDims((d) => ({ ...d, size: k }))}
          accent={CHART_COLORS.textSecondary}
        />
        <DimSelect
          label="Color"
          value={dims.color}
          onChange={(k) => setDims((d) => ({ ...d, color: k }))}
          accent={CHART_COLORS.emerald}
        />

        {/* Color gradient legend */}
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[9px] uppercase tracking-[0.12em] font-semibold" style={{ color: CHART_COLORS.text }}>
            Color Scale — {colorDimMeta.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono" style={{ color: CHART_COLORS.rose }}>
              {colorLegendStops[0]!.label}
            </span>
            <div
              className="rounded-full"
              style={{
                width: 100,
                height: 6,
                background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)",
                opacity: 0.8,
              }}
              aria-label="Color scale from low (rose) to high (emerald)"
            />
            <span className="text-[9px] font-mono" style={{ color: CHART_COLORS.emerald }}>
              {colorLegendStops[2]!.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: City Selector ── */}
      <div
        className="flex flex-wrap gap-2 px-5 py-3 border-b"
        style={{
          background: "rgba(10,10,10,0.95)",
          borderColor: "#1F1F1F",
        }}
        role="group"
        aria-label="City selector — toggle markets"
      >
        <span className="text-[9px] uppercase tracking-[0.12em] text-content-disabled self-center mr-1">
          Markets
        </span>
        {ALL_CITIES.map((city) => {
          const active = activeCities.has(city.name);
          const score = cityScores[city.name] ?? 50;
          const sc = scoreColor(score);
          const atMax = activeCities.size >= MAX_CITIES && !active;

          return (
            <button
              key={city.name}
              onClick={() => toggleCity(city.name)}
              disabled={atMax}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all duration-150"
              style={{
                background: active ? "rgba(201,162,39,0.08)" : "rgba(17,17,17,0.6)",
                borderColor: active ? "rgba(201,162,39,0.3)" : "#1F1F1F",
                color: active ? CHART_COLORS.gold : "#444444",
                cursor: atMax ? "not-allowed" : "pointer",
                opacity: atMax ? 0.4 : 1,
                boxShadow: active ? "0 0 12px rgba(201,162,39,0.12)" : "none",
              }}
              aria-pressed={active}
              aria-label={`${city.name} — score ${score}. ${active ? "Active, click to remove" : "Inactive, click to add"}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? sc : "#333" }}
                aria-hidden="true"
              />
              {city.name}
              {active && (
                <span className="font-mono text-[9px]" style={{ color: sc }}>
                  {score}
                </span>
              )}
            </button>
          );
        })}
        <span className="text-[9px] text-content-disabled self-center ml-auto">
          {activeCities.size}/{MAX_CITIES} selected
        </span>
      </div>

      {/* ── SECTION 3: Chart ── */}
      <div
        className="relative flex-1"
        style={{ minHeight: 420, background: "rgba(0,0,0,0.97)" }}
        aria-label={`4D scatter chart — X: ${DIM_MAP[dims.x].label}, Y: ${DIM_MAP[dims.y].label}, Size: ${DIM_MAP[dims.size].label}, Color: ${DIM_MAP[dims.color].label}. ${activeCities.size} cities shown at ${monthLabel(timeIndex)}.`}
        role="img"
      >
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%", minHeight: 420 }}
          notMerge={false}
          lazyUpdate={false}
          opts={{ renderer: "canvas" }}
        />

        {/* Playing badge */}
        {isPlaying && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{
              background: "rgba(201,162,39,0.15)",
              border: "1px solid rgba(201,162,39,0.3)",
              color: CHART_COLORS.gold,
            }}
            aria-live="polite"
            aria-label="Playback in progress"
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: CHART_COLORS.gold }}
              aria-hidden="true"
            />
            LIVE
          </div>
        )}
      </div>

      {/* ── SECTION 4: Time Slider ── */}
      <div
        className="flex flex-col gap-3 px-5 py-4 rounded-b-xl border-t"
        style={{
          background: "rgba(17,17,17,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "#1F1F1F",
        }}
      >
        {/* Row: play button + date label */}
        <div className="flex items-center gap-4">
          {/* Play / Pause button */}
          <button
            onClick={isPlaying ? stopPlay : startPlay}
            className="flex items-center justify-center rounded-lg w-8 h-8 border transition-all duration-150 flex-shrink-0"
            style={{
              background: isPlaying ? "rgba(201,162,39,0.15)" : "rgba(26,26,26,0.9)",
              borderColor: isPlaying ? "rgba(201,162,39,0.4)" : "#2A2A2A",
              color: isPlaying ? CHART_COLORS.gold : "#666666",
              boxShadow: isPlaying ? "0 0 16px rgba(201,162,39,0.2)" : "none",
            }}
            aria-label={isPlaying ? "Pause time playback" : "Play time evolution animation"}
            aria-pressed={isPlaying}
          >
            {isPlaying ? (
              /* Pause icon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              /* Play icon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Date display */}
          <div className="flex flex-col">
            <span
              className="text-[15px] font-bold font-mono tabular-nums"
              style={{ color: CHART_COLORS.gold }}
              aria-live="polite"
              aria-label={`Current time: ${monthLabel(timeIndex)}`}
            >
              {monthLabel(timeIndex)}
            </span>
            <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: CHART_COLORS.text }}>
              {isPlaying ? "Animating…" : "Drag to scrub"}
            </span>
          </div>

          {/* Slider */}
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={MONTH_COUNT - 1}
              value={timeIndex}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full"
              style={{
                accentColor: CHART_COLORS.gold,
                height: 4,
                cursor: "pointer",
              }}
              aria-label="Time slider — scrub through Jan 2021 to Dec 2025"
              aria-valuemin={0}
              aria-valuemax={MONTH_COUNT - 1}
              aria-valuenow={timeIndex}
              aria-valuetext={monthLabel(timeIndex)}
            />
            {/* Tick labels */}
            <div className="flex justify-between px-px">
              {[0, 12, 24, 36, 48, 59].map((i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono"
                  style={{ color: i === timeIndex ? CHART_COLORS.gold : "#444444" }}
                  aria-hidden="true"
                >
                  {monthLabel(i).split(" ")[1]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t" style={{ borderColor: "#1A1A1A" }}>
          {/* Bubble size legend */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: CHART_COLORS.text }}>
              Size — {DIM_MAP[dims.size].label}
            </span>
            {[0.15, 0.5, 0.85].map((t, i) => {
              const r = normToRadius(t);
              return (
                <div key={i} className="flex items-center gap-1">
                  <span
                    className="rounded-full inline-block flex-shrink-0"
                    style={{
                      width: r,
                      height: r,
                      background: "#666666",
                      opacity: 0.5,
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-[9px] font-mono" style={{ color: "#555" }}>
                    {["Low", "Mid", "High"][i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quadrant key */}
          <div className="flex items-center gap-3 ml-auto">
            {[
              { color: CHART_COLORS.emerald, label: "Leaders" },
              { color: CHART_COLORS.amber,   label: "Momentum / Value" },
              { color: CHART_COLORS.rose,    label: "Lagging" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-sm inline-block"
                  style={{ background: color, opacity: 0.6 }}
                  aria-hidden="true"
                />
                <span className="text-[9px]" style={{ color: "#555" }}>{label}</span>
              </div>
            ))}
          </div>

          <p className="text-[9px] ml-2" style={{ color: "#333" }}>
            Quadrant lines = median of selected cities
          </p>
        </div>
      </div>
    </div>
  );
}
