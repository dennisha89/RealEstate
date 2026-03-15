"use client";

import { useState, useRef, useEffect } from "react";

interface MapDataPoint {
  zip: string;
  lat: number;
  lng: number;
  value: number;
  label?: string;
}

interface ChoroplethMapProps {
  data: MapDataPoint[];
  height?: number;
  colorScale?: { min: string; mid: string; max: string };
  valueLabel?: string;
  formatValue?: (value: number) => string;
}

export default function ChoroplethMap({
  data,
  height = 500,
  colorScale = { min: "#ef4444", mid: "#f59e0b", max: "#22c55e" },
  valueLabel = "Score",
  formatValue = (v) => v.toFixed(0),
}: ChoroplethMapProps) {
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Observe container width for responsive dot sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-surface-elevated rounded-lg" style={{ height }}>
        <p className="text-sm text-gray-500">No map data available. Add markets to visualize.</p>
      </div>
    );
  }

  const lats = data.map((d) => d.lat);
  const lngs = data.map((d) => d.lng);
  const minLat = Math.min(...lats) - 2;
  const maxLat = Math.max(...lats) + 2;
  const minLng = Math.min(...lngs) - 2;
  const maxLng = Math.max(...lngs) + 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  // Scale dots based on container width
  const scaleFactor = Math.max(0.5, Math.min(1.5, containerWidth / 800));

  const getColor = (value: number): string => {
    const pct = (value - minVal) / valRange;
    if (pct < 0.33) return colorScale.min;
    if (pct < 0.66) return colorScale.mid;
    return colorScale.max;
  };

  const getSize = (value: number): number => {
    const pct = (value - minVal) / valRange;
    return (10 + pct * 24) * scaleFactor;
  };

  return (
    <div ref={containerRef} className="relative bg-surface-elevated rounded-lg overflow-hidden" style={{ width: "100%", height }}>
      {/* Grid lines for geographic reference */}
      <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[20, 40, 60, 80].map((v) => (
          <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v} stroke="#4b5563" strokeWidth="0.3" />
        ))}
        {[20, 40, 60, 80].map((v) => (
          <line key={`v${v}`} x1={v} y1="0" x2={v} y2="100" stroke="#4b5563" strokeWidth="0.3" />
        ))}
      </svg>

      {/* Data points */}
      {data.map((point) => {
        const x = ((point.lng - minLng) / (maxLng - minLng)) * 88 + 6;
        const y = ((maxLat - point.lat) / (maxLat - minLat)) * 80 + 8;
        const size = getSize(point.value);
        const color = getColor(point.value);
        const isHovered = hoveredZip === point.zip;

        return (
          <div
            key={point.zip}
            className="absolute transition-all duration-200 cursor-pointer"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isHovered ? 20 : 10,
            }}
            onMouseEnter={() => setHoveredZip(point.zip)}
            onMouseLeave={() => setHoveredZip(null)}
          >
            <div
              className="rounded-full transition-all duration-200"
              style={{
                width: isHovered ? size * 1.8 : size,
                height: isHovered ? size * 1.8 : size,
                backgroundColor: color,
                opacity: isHovered ? 0.95 : 0.65,
                boxShadow: isHovered ? `0 0 24px ${color}90, 0 0 48px ${color}40` : `0 0 10px ${color}50`,
              }}
            />
            {/* Always show label */}
            <div
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
              style={{ top: isHovered ? -40 : size + 4 }}
            >
              {isHovered ? (
                <div className="bg-[#1a1d27] border border-[#2e3348] rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-xs font-medium text-gray-200">{point.label || point.zip}</p>
                  <p className="text-xs font-mono" style={{ color }}>
                    {valueLabel}: {formatValue(point.value)}
                  </p>
                </div>
              ) : (
                <span className="text-[9px] text-gray-500 font-medium">
                  {point.label?.split(",")[0] || point.zip}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-[#1a1d27]/90 border border-[#2e3348] rounded-lg px-3 py-2">
        <p className="text-[10px] text-gray-500 uppercase mb-1.5">{valueLabel}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colorScale.min }} />
            <span className="text-[10px] text-gray-500">{formatValue(minVal)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colorScale.mid }} />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colorScale.max }} />
            <span className="text-[10px] text-gray-500">{formatValue(maxVal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
