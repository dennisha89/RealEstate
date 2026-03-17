"use client";

/**
 * GlobeHeatmap
 *
 * Interactive 3D globe using deck.gl GlobeView showing US real estate
 * capital flow. Users can drag to rotate, scroll to zoom.
 *
 * Three simultaneous data layers:
 *   ScatterplotLayer  — metro dots: size = capital volume, color = market score
 *   ArcLayer          — capital flow corridors: gold with opacity = flow size
 *   TextLayer         — city labels at zoom ≥ 3
 *
 * Auto-rotation: slow continuous spin at 0.05°/frame. Pauses on user
 * interaction, resumes after 5 seconds of inactivity.
 *
 * CRITICAL LIMITATION (deck.gl docs): GlobeView does NOT support pitch or
 * bearing. The camera always points at Earth's center, north up. Rotation
 * is achieved by shifting the longitude of the viewState center.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
// GlobeView is experimental in deck.gl v9 — exported as _GlobeView
import { _GlobeView as GlobeView } from "@deck.gl/core";
import { ScatterplotLayer, ArcLayer, TextLayer } from "@deck.gl/layers";
import { Info, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { CHART_COLORS } from "./ChartTheme";

// ─── City coordinates ─────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "Austin TX":        [-97.74,  30.27],
  "Tampa FL":         [-82.46,  27.95],
  "Nashville TN":     [-86.78,  36.16],
  "Charlotte NC":     [-80.84,  35.23],
  "Phoenix AZ":       [-112.07, 33.45],
  "Atlanta GA":       [-84.39,  33.75],
  "Dallas TX":        [-96.80,  32.78],
  "Las Vegas NV":     [-115.14, 36.17],
  "Jacksonville FL":  [-81.66,  30.33],
  "San Antonio TX":   [-98.49,  29.42],
  // Sources — capital leaving
  "Los Angeles CA":   [-118.24, 34.05],
  "New York NY":      [-74.01,  40.71],
  "Chicago IL":       [-87.63,  41.88],
  "Newark NJ":        [-74.17,  40.74],
  "Boston MA":        [-71.06,  42.36],
};

// ─── Metro data ───────────────────────────────────────────────────────────────

interface MetroPoint {
  name: string;
  coordinates: [number, number];
  score: number;         // 0–100 market score
  capitalVolume: number; // annual USD millions
  isSource: boolean;
}

const METRO_DATA: MetroPoint[] = [
  // Destinations (scored)
  { name: "Austin TX",       coordinates: CITY_COORDS["Austin TX"]!,       score: 78, capitalVolume: 2400, isSource: false },
  { name: "Tampa FL",        coordinates: CITY_COORDS["Tampa FL"]!,        score: 72, capitalVolume: 2630, isSource: false },
  { name: "Nashville TN",    coordinates: CITY_COORDS["Nashville TN"]!,    score: 70, capitalVolume: 2310, isSource: false },
  { name: "Charlotte NC",    coordinates: CITY_COORDS["Charlotte NC"]!,    score: 68, capitalVolume: 1940, isSource: false },
  { name: "Phoenix AZ",      coordinates: CITY_COORDS["Phoenix AZ"]!,      score: 65, capitalVolume: 1840, isSource: false },
  { name: "Atlanta GA",      coordinates: CITY_COORDS["Atlanta GA"]!,      score: 64, capitalVolume: 1440, isSource: false },
  { name: "Dallas TX",       coordinates: CITY_COORDS["Dallas TX"]!,       score: 71, capitalVolume: 1840, isSource: false },
  { name: "Las Vegas NV",    coordinates: CITY_COORDS["Las Vegas NV"]!,    score: 58, capitalVolume: 1100, isSource: false },
  { name: "Jacksonville FL", coordinates: CITY_COORDS["Jacksonville FL"]!, score: 61, capitalVolume:  940, isSource: false },
  { name: "San Antonio TX",  coordinates: CITY_COORDS["San Antonio TX"]!,  score: 66, capitalVolume:  720, isSource: false },
  // Sources (capital-leaving markets)
  { name: "Los Angeles CA",  coordinates: CITY_COORDS["Los Angeles CA"]!,  score: 40, capitalVolume: 5180, isSource: true },
  { name: "New York NY",     coordinates: CITY_COORDS["New York NY"]!,     score: 38, capitalVolume: 3950, isSource: true },
  { name: "Chicago IL",      coordinates: CITY_COORDS["Chicago IL"]!,      score: 35, capitalVolume: 2460, isSource: true },
  { name: "Newark NJ",       coordinates: CITY_COORDS["Newark NJ"]!,       score: 42, capitalVolume: 1770, isSource: true },
  { name: "Boston MA",       coordinates: CITY_COORDS["Boston MA"]!,       score: 45, capitalVolume: 1420, isSource: true },
];

// ─── Arc flow data ────────────────────────────────────────────────────────────

interface FlowArc {
  source: string;
  target: string;
  sourceCoords: [number, number];
  targetCoords: [number, number];
  volumeM: number; // USD millions
}

const FLOW_ARCS: FlowArc[] = [
  { source: "Los Angeles CA", target: "Austin TX",       sourceCoords: CITY_COORDS["Los Angeles CA"]!, targetCoords: CITY_COORDS["Austin TX"]!,       volumeM: 1850 },
  { source: "Los Angeles CA", target: "Phoenix AZ",      sourceCoords: CITY_COORDS["Los Angeles CA"]!, targetCoords: CITY_COORDS["Phoenix AZ"]!,      volumeM: 1420 },
  { source: "Los Angeles CA", target: "Las Vegas NV",    sourceCoords: CITY_COORDS["Los Angeles CA"]!, targetCoords: CITY_COORDS["Las Vegas NV"]!,    volumeM: 1100 },
  { source: "Los Angeles CA", target: "Dallas TX",       sourceCoords: CITY_COORDS["Los Angeles CA"]!, targetCoords: CITY_COORDS["Dallas TX"]!,       volumeM:  980 },
  { source: "Los Angeles CA", target: "Atlanta GA",      sourceCoords: CITY_COORDS["Los Angeles CA"]!, targetCoords: CITY_COORDS["Atlanta GA"]!,      volumeM:  640 },
  { source: "Los Angeles CA", target: "Nashville TN",    sourceCoords: CITY_COORDS["Los Angeles CA"]!, targetCoords: CITY_COORDS["Nashville TN"]!,    volumeM:  340 },
  { source: "New York NY",    target: "Tampa FL",        sourceCoords: CITY_COORDS["New York NY"]!,    targetCoords: CITY_COORDS["Tampa FL"]!,        volumeM: 1650 },
  { source: "New York NY",    target: "Charlotte NC",    sourceCoords: CITY_COORDS["New York NY"]!,    targetCoords: CITY_COORDS["Charlotte NC"]!,    volumeM:  870 },
  { source: "New York NY",    target: "Nashville TN",    sourceCoords: CITY_COORDS["New York NY"]!,    targetCoords: CITY_COORDS["Nashville TN"]!,    volumeM:  720 },
  { source: "New York NY",    target: "Austin TX",       sourceCoords: CITY_COORDS["New York NY"]!,    targetCoords: CITY_COORDS["Austin TX"]!,       volumeM:  550 },
  { source: "New York NY",    target: "Atlanta GA",      sourceCoords: CITY_COORDS["New York NY"]!,    targetCoords: CITY_COORDS["Atlanta GA"]!,      volumeM:  490 },
  { source: "New York NY",    target: "Dallas TX",       sourceCoords: CITY_COORDS["New York NY"]!,    targetCoords: CITY_COORDS["Dallas TX"]!,       volumeM:  290 },
  { source: "Chicago IL",     target: "Nashville TN",    sourceCoords: CITY_COORDS["Chicago IL"]!,     targetCoords: CITY_COORDS["Nashville TN"]!,    volumeM:  810 },
  { source: "Chicago IL",     target: "Tampa FL",        sourceCoords: CITY_COORDS["Chicago IL"]!,     targetCoords: CITY_COORDS["Tampa FL"]!,        volumeM:  690 },
  { source: "Chicago IL",     target: "Phoenix AZ",      sourceCoords: CITY_COORDS["Chicago IL"]!,     targetCoords: CITY_COORDS["Phoenix AZ"]!,      volumeM:  420 },
  { source: "Chicago IL",     target: "Dallas TX",       sourceCoords: CITY_COORDS["Chicago IL"]!,     targetCoords: CITY_COORDS["Dallas TX"]!,       volumeM:  380 },
  { source: "Chicago IL",     target: "Charlotte NC",    sourceCoords: CITY_COORDS["Chicago IL"]!,     targetCoords: CITY_COORDS["Charlotte NC"]!,    volumeM:  160 },
  { source: "Newark NJ",      target: "Tampa FL",        sourceCoords: CITY_COORDS["Newark NJ"]!,      targetCoords: CITY_COORDS["Tampa FL"]!,        volumeM:  760 },
  { source: "Newark NJ",      target: "Charlotte NC",    sourceCoords: CITY_COORDS["Newark NJ"]!,      targetCoords: CITY_COORDS["Charlotte NC"]!,    volumeM:  520 },
  { source: "Newark NJ",      target: "Atlanta GA",      sourceCoords: CITY_COORDS["Newark NJ"]!,      targetCoords: CITY_COORDS["Atlanta GA"]!,      volumeM:  310 },
  { source: "Newark NJ",      target: "Jacksonville FL", sourceCoords: CITY_COORDS["Newark NJ"]!,      targetCoords: CITY_COORDS["Jacksonville FL"]!, volumeM:  180 },
  { source: "Boston MA",      target: "Nashville TN",    sourceCoords: CITY_COORDS["Boston MA"]!,      targetCoords: CITY_COORDS["Nashville TN"]!,    volumeM:  440 },
  { source: "Boston MA",      target: "Charlotte NC",    sourceCoords: CITY_COORDS["Boston MA"]!,      targetCoords: CITY_COORDS["Charlotte NC"]!,    volumeM:  390 },
  { source: "Boston MA",      target: "Tampa FL",        sourceCoords: CITY_COORDS["Boston MA"]!,      targetCoords: CITY_COORDS["Tampa FL"]!,        volumeM:  280 },
  { source: "Boston MA",      target: "Dallas TX",       sourceCoords: CITY_COORDS["Boston MA"]!,      targetCoords: CITY_COORDS["Dallas TX"]!,       volumeM:  190 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert hex color + alpha to [r, g, b, a] RGBA array for deck.gl */
function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
    alpha,
  ];
}

/** Score → RGBA. ≥75 emerald, ≥55 amber, else rose */
function scoreToRgba(score: number, isSource: boolean): [number, number, number, number] {
  if (isSource) return hexToRgba(CHART_COLORS.rose, 200);
  if (score >= 75) return hexToRgba(CHART_COLORS.emerald, 210);
  if (score >= 55) return hexToRgba(CHART_COLORS.amber, 210);
  return hexToRgba(CHART_COLORS.rose, 210);
}

/** Scale capital volume to dot radius in meters. Min 80km, max 300km. */
function volumeToRadius(volumeM: number): number {
  const MIN_R = 80_000;
  const MAX_R = 300_000;
  const MIN_V = 720;
  const MAX_V = 5180;
  const t = Math.max(0, Math.min(1, (volumeM - MIN_V) / (MAX_V - MIN_V)));
  return MIN_R + t * (MAX_R - MIN_R);
}

/** Scale flow volume to arc opacity. Min 60, max 220. */
function volumeToArcAlpha(volumeM: number): number {
  const MIN_V = 160;
  const MAX_V = 1850;
  const t = Math.max(0, Math.min(1, (volumeM - MIN_V) / (MAX_V - MIN_V)));
  return Math.round(60 + t * 160);
}

function fmtVolume(volumeM: number): string {
  if (volumeM >= 1000) return `$${(volumeM / 1000).toFixed(1)}B`;
  return `$${volumeM}M`;
}

// ─── Initial view state ───────────────────────────────────────────────────────

const INITIAL_LONGITUDE = -98;
const INITIAL_LATITUDE  = 38;
const INITIAL_ZOOM      = 3.5;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GlobeHeatmapProps {
  geoKey?: string;
  className?: string;
  onCityClick?: (cityName: string) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobeHeatmap({
  geoKey,
  className,
  onCityClick,
}: GlobeHeatmapProps) {
  // viewState for controlled deck.gl
  const [viewState, setViewState] = useState({
    longitude: INITIAL_LONGITUDE,
    latitude:  INITIAL_LATITUDE,
    zoom:      INITIAL_ZOOM,
  });

  // Auto-rotation state — separate from viewState longitude to avoid
  // fighting between rotation and user interaction
  const rotationRef   = useRef(0);
  const isUserActive  = useRef(false);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef        = useRef<number | null>(null);
  const [isRotating, setIsRotating] = useState(true);

  // Hoverd city for tooltip
  const [hoveredCity, setHoveredCity] = useState<MetroPoint | null>(null);
  const [tooltipPos, setTooltipPos]   = useState({ x: 0, y: 0 });

  // Auto-rotation loop — updates longitude in viewState
  useEffect(() => {
    const animate = () => {
      if (!isUserActive.current) {
        rotationRef.current = (rotationRef.current + 0.05) % 360;
        setViewState((vs) => ({
          ...vs,
          longitude: INITIAL_LONGITUDE + rotationRef.current,
        }));
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    if (isRotating) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isRotating]);

  // User interaction: pause rotation, resume after 5s inactivity
  const handleInteractionStart = useCallback(() => {
    isUserActive.current = true;
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      isUserActive.current = false;
    }, 5000);
  }, []);

  const handleViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: Record<string, unknown> }) => {
      handleInteractionStart();
      setViewState(vs as typeof viewState);
      handleInteractionEnd();
    },
    [handleInteractionStart, handleInteractionEnd],
  );

  // Cleanup inactivity timer
  useEffect(() => {
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, []);

  // Build deck.gl layers
  const layers = useMemo(() => {
    const goldRgba = hexToRgba(CHART_COLORS.gold);

    // Filter by geoKey if set — dim irrelevant nodes
    const highlightCode = geoKey && geoKey !== "national" ? geoKey.toUpperCase() : null;

    // ScatterplotLayer — metro heat dots
    const scatterLayer = new ScatterplotLayer<MetroPoint>({
      id: "globe-metros",
      data: METRO_DATA,
      getPosition: (d) => d.coordinates,
      getRadius: (d) => volumeToRadius(d.capitalVolume),
      getFillColor: (d) => {
        if (highlightCode) {
          const stateMatch = d.name.endsWith(highlightCode);
          if (!stateMatch) return [30, 30, 30, 80];
        }
        return scoreToRgba(d.score, d.isSource);
      },
      getLineColor: (d) => {
        if (d.isSource) return hexToRgba(CHART_COLORS.rose, 120);
        if (d.score >= 75) return hexToRgba(CHART_COLORS.emerald, 120);
        if (d.score >= 55) return hexToRgba(CHART_COLORS.amber, 120);
        return hexToRgba(CHART_COLORS.rose, 120);
      },
      stroked: true,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      radiusUnits: "meters",
      radiusMinPixels: 6,
      radiusMaxPixels: 28,
      pickable: true,
      autoHighlight: true,
      highlightColor: [201, 162, 39, 255], // gold
      onHover: (info) => {
        if (info.object) {
          setHoveredCity(info.object as MetroPoint);
          setTooltipPos({ x: info.x, y: info.y });
        } else {
          setHoveredCity(null);
        }
      },
      onClick: (info) => {
        if (info.object && onCityClick) {
          onCityClick((info.object as MetroPoint).name);
        }
      },
      updateTriggers: {
        getFillColor: [highlightCode],
      },
    });

    // ArcLayer — capital flow corridors
    const arcLayer = new ArcLayer<FlowArc>({
      id: "globe-arcs",
      data: FLOW_ARCS,
      getSourcePosition: (d) => d.sourceCoords,
      getTargetPosition: (d) => d.targetCoords,
      getSourceColor: (d) => {
        if (highlightCode) {
          const srcMatch = d.source.endsWith(highlightCode);
          const dstMatch = d.target.endsWith(highlightCode);
          if (!srcMatch && !dstMatch) return [20, 20, 20, 20];
        }
        return [goldRgba[0], goldRgba[1], goldRgba[2], volumeToArcAlpha(d.volumeM)];
      },
      getTargetColor: (d) => {
        if (highlightCode) {
          const srcMatch = d.source.endsWith(highlightCode);
          const dstMatch = d.target.endsWith(highlightCode);
          if (!srcMatch && !dstMatch) return [20, 20, 20, 20];
        }
        const alpha = volumeToArcAlpha(d.volumeM);
        return [goldRgba[0], goldRgba[1], goldRgba[2], Math.max(20, alpha - 60)];
      },
      getWidth: (d) => {
        // 1–4 px proportional to volume
        const MIN_V = 160;
        const MAX_V = 1850;
        const t = Math.max(0, Math.min(1, (d.volumeM - MIN_V) / (MAX_V - MIN_V)));
        return 1 + t * 3;
      },
      getHeight: 0.5,    // arc height multiplier
      widthUnits: "pixels",
      widthMinPixels: 0.5,
      widthMaxPixels: 5,
      updateTriggers: {
        getSourceColor: [highlightCode],
        getTargetColor: [highlightCode],
      },
    });

    // TextLayer — city name labels
    const textLayer = new TextLayer<MetroPoint>({
      id: "globe-labels",
      data: METRO_DATA,
      getPosition: (d) => d.coordinates,
      getText: (d) => {
        // Show city name (strip state suffix for brevity)
        return d.name.replace(/ [A-Z]{2}$/, "");
      },
      getColor: (d) => {
        if (highlightCode) {
          const stateMatch = d.name.endsWith(highlightCode);
          if (!stateMatch) return [60, 60, 60, 120];
        }
        return d.isSource
          ? [239, 68, 68, 200]
          : d.score >= 75
          ? [16, 185, 129, 220]
          : d.score >= 55
          ? [245, 158, 11, 220]
          : [239, 68, 68, 180];
      },
      getSize: 11,
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      background: true,
      getBorderColor: [0, 0, 0, 0],
      getBackgroundColor: [0, 0, 0, 140],
      backgroundPadding: [3, 1, 3, 1],
      fontFamily: "JetBrains Mono, monospace",
      fontWeight: 600,
      pickable: false,
      // Only show labels when zoomed in enough to read them
      sizeMinPixels: viewState.zoom >= 3 ? 8 : 0,
      updateTriggers: {
        getColor: [highlightCode],
        sizeMinPixels: [viewState.zoom],
      },
    });

    return [arcLayer, scatterLayer, textLayer];
  }, [geoKey, onCityClick, viewState.zoom]);

  const globeView = useMemo(() => new GlobeView({ id: "globe", controller: true }), []);

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className ?? ""}`}
      style={{ background: "#050510" }}
      aria-label="3D interactive globe showing US real estate capital flow"
      role="img"
    >
      {/* deck.gl canvas */}
      <DeckGL
        views={globeView}
        viewState={viewState}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewStateChange={handleViewStateChange as any}
        layers={layers}
        parameters={{ cullMode: "back" }}
        style={{ position: "absolute", top: "0", right: "0", bottom: "0", left: "0" }}
        getCursor={({ isDragging }: { isDragging: boolean }) => (isDragging ? "grabbing" : "grab")}
      />

      {/* Rotation toggle */}
      <button
        onClick={() => setIsRotating((r) => !r)}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
        style={{
          background: "rgba(17,17,17,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: isRotating ? CHART_COLORS.gold : "#666666",
          backdropFilter: "blur(8px)",
        }}
        aria-label={isRotating ? "Pause globe rotation" : "Resume globe rotation"}
        title={isRotating ? "Pause rotation" : "Resume rotation"}
      >
        <RotateCw
          className="w-3 h-3"
          aria-hidden="true"
          style={{ opacity: isRotating ? 1 : 0.4 }}
        />
        <span>{isRotating ? "Rotating" : "Paused"}</span>
      </button>

      {/* Zoom controls */}
      <div
        className="absolute right-3 top-12 z-10 flex flex-col gap-1"
      >
        <button
          onClick={() => {
            isUserActive.current = true;
            setViewState((vs) => ({ ...vs, zoom: Math.min(vs.zoom + 0.5, 8) }));
            handleInteractionEnd();
          }}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
          style={{
            background: "rgba(17,17,17,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#999",
            backdropFilter: "blur(8px)",
          }}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => {
            isUserActive.current = true;
            setViewState((vs) => ({ ...vs, zoom: Math.max(vs.zoom - 0.5, 1) }));
            handleInteractionEnd();
          }}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50"
          style={{
            background: "rgba(17,17,17,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#999",
            backdropFilter: "blur(8px)",
          }}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Floating legend — bottom left */}
      <div
        className="absolute bottom-3 left-3 z-10 rounded-xl p-3 space-y-2"
        style={{
          background: "rgba(10,10,20,0.88)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
          minWidth: 160,
        }}
        aria-label="Globe legend"
      >
        <p
          className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "#555" }}
        >
          Capital Flow
        </p>

        {/* Dot colors */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: CHART_COLORS.emerald }}
              aria-hidden="true"
            />
            <span className="text-[10px]" style={{ color: "#888" }}>
              Score ≥75 — Buy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: CHART_COLORS.amber }}
              aria-hidden="true"
            />
            <span className="text-[10px]" style={{ color: "#888" }}>
              Score 55-74 — Watch
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: CHART_COLORS.rose }}
              aria-hidden="true"
            />
            <span className="text-[10px]" style={{ color: "#888" }}>
              Score &lt;55 / Source
            </span>
          </div>
        </div>

        {/* Arc legend */}
        <div className="pt-1.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <span
              className="block w-6 h-0.5 shrink-0 rounded-full"
              style={{ background: `linear-gradient(to right, ${CHART_COLORS.gold}cc, ${CHART_COLORS.gold}40)` }}
              aria-hidden="true"
            />
            <span className="text-[10px]" style={{ color: "#888" }}>
              Arc = capital flow
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="block rounded-full shrink-0"
              style={{ width: 10, height: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
              aria-hidden="true"
            />
            <span
              className="block rounded-full shrink-0"
              style={{ width: 18, height: 18, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
              aria-hidden="true"
            />
            <span className="text-[10px]" style={{ color: "#888" }}>
              Dot size = volume
            </span>
          </div>
        </div>

        {/* Interaction hint */}
        <div
          className="flex items-center gap-1.5 pt-1.5 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <Info className="w-2.5 h-2.5 shrink-0" style={{ color: "#444" }} aria-hidden="true" />
          <span className="text-[9px]" style={{ color: "#444" }}>
            Drag to rotate · Scroll to zoom
          </span>
        </div>
      </div>

      {/* City hover tooltip */}
      {hoveredCity && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl px-3 py-2.5"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 40,
            background: "#1A1A1A",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
            minWidth: 160,
          }}
          role="tooltip"
          aria-live="polite"
        >
          <p
            className="text-[9px] uppercase tracking-widest mb-1 font-semibold"
            style={{ color: hoveredCity.isSource ? CHART_COLORS.rose : "#555" }}
          >
            {hoveredCity.isSource ? "Capital Source" : "Destination Market"}
          </p>
          <p
            className="text-[13px] font-semibold mb-2"
            style={{
              color: hoveredCity.isSource
                ? CHART_COLORS.rose
                : hoveredCity.score >= 75
                ? CHART_COLORS.emerald
                : hoveredCity.score >= 55
                ? CHART_COLORS.amber
                : CHART_COLORS.rose,
            }}
          >
            {hoveredCity.name}
          </p>
          <div className="space-y-1">
            {!hoveredCity.isSource && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px]" style={{ color: "#666" }}>
                  Market score
                </span>
                <span
                  className="text-[12px] font-bold font-mono tabular-nums"
                  style={{
                    color:
                      hoveredCity.score >= 75
                        ? CHART_COLORS.emerald
                        : hoveredCity.score >= 55
                        ? CHART_COLORS.amber
                        : CHART_COLORS.rose,
                  }}
                  aria-label={`Market score ${hoveredCity.score}`}
                >
                  {hoveredCity.score}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px]" style={{ color: "#666" }}>
                Capital flow
              </span>
              <span
                className="text-[12px] font-bold font-mono tabular-nums"
                style={{ color: CHART_COLORS.gold }}
                aria-label={`Capital flow ${fmtVolume(hoveredCity.capitalVolume)}`}
              >
                {fmtVolume(hoveredCity.capitalVolume)}/yr
              </span>
            </div>
          </div>
          {!hoveredCity.isSource && onCityClick && (
            <p className="text-[9px] mt-2 pt-2 border-t" style={{ color: "#444", borderColor: "rgba(255,255,255,0.06)" }}>
              Click to drill into this market
            </p>
          )}
        </div>
      )}

      {/* Screen reader data table — accessibility alternative */}
      <table className="sr-only" aria-label="Globe data: US metro capital flows">
        <caption>Real estate capital flow by US metro market</caption>
        <thead>
          <tr>
            <th scope="col">City</th>
            <th scope="col">Type</th>
            <th scope="col">Market score</th>
            <th scope="col">Annual flow</th>
          </tr>
        </thead>
        <tbody>
          {METRO_DATA.map((m) => (
            <tr key={m.name}>
              <td>{m.name}</td>
              <td>{m.isSource ? "Capital source" : "Destination"}</td>
              <td>{m.isSource ? "N/A" : m.score}</td>
              <td>{fmtVolume(m.capitalVolume)} per year estimated</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
