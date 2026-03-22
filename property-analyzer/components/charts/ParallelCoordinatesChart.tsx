"use client";

import { useEffect, useRef, useCallback } from "react";
import * as echarts from "echarts/core";
import { ParallelChart as EParallelChart } from "echarts/charts";
import {
  ParallelComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  EParallelChart,
  ParallelComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

interface MarketData {
  name: string;
  color: string;
  values: number[];
}

interface ParallelCoordinatesChartProps {
  dimensions: Array<{ name: string; min?: number; max?: number }>;
  markets: MarketData[];
  height?: number;
}

export default function ParallelCoordinatesChart({
  dimensions,
  markets,
  height = 450,
}: ParallelCoordinatesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const buildOption = useCallback((): echarts.EChartsCoreOption => {
    const parallelAxisData = dimensions.map((dim, i) => ({
      dim: i,
      name: dim.name,
      min: dim.min,
      max: dim.max,
      nameTextStyle: { color: "#9ca3af", fontSize: 11 },
      nameGap: 25,
      axisLine: { lineStyle: { color: "#374151" } },
      axisTick: { lineStyle: { color: "#4b5563" } },
      axisLabel: { color: "#6b7280", fontSize: 10 },
    }));

    return {
      backgroundColor: "transparent",
      parallelAxis: parallelAxisData,
      parallel: {
        left: 80,
        right: 80,
        top: 50,
        bottom: 30,
        parallelAxisDefault: {
          areaSelectStyle: {
            width: 20,
            opacity: 0.3,
            color: "#22c55e",
          },
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "#1a1d27",
        borderColor: "#2e3348",
        textStyle: { color: "#e5e7eb", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number[] };
          if (!p.value) return "";
          const lines = dimensions.map((d, i) => `${d.name}: <b>${p.value[i]?.toLocaleString()}</b>`);
          return `<b>${p.name}</b><br/>${lines.join("<br/>")}`;
        },
      },
      legend: {
        data: markets.map((m) => ({
          name: m.name,
          itemStyle: { color: m.color },
        })),
        textStyle: { color: "#9ca3af", fontSize: 11 },
        top: 0,
        type: "scroll",
      },
      series: markets.map((m) => ({
        type: "parallel" as const,
        name: m.name,
        lineStyle: {
          color: m.color,
          width: 2.5,
          opacity: 0.75,
        },
        emphasis: {
          lineStyle: { width: 4, opacity: 1 },
        },
        data: [{ value: m.values, name: m.name }],
      })),
    };
  }, [dimensions, markets]);

  // Init + update
  useEffect(() => {
    if (!containerRef.current) return;

    // Dispose old instance if exists (handles re-mount)
    if (chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }

    // Wait one tick for container to have dimensions
    const initTimer = setTimeout(() => {
      if (!containerRef.current) return;
      const chart = echarts.init(containerRef.current, "dark", {
        renderer: "canvas",
      });
      chartRef.current = chart;
      chart.setOption(buildOption(), true);
    }, 50);

    return () => clearTimeout(initTimer);
  }, [buildOption]);

  // Resize observer — handles container resize, sidebar toggle, tab switch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        chartRef.current?.resize();
      }, 100);
    });

    observer.observe(container);

    return () => {
      clearTimeout(resizeTimeout);
      observer.disconnect();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, minHeight: 300 }}
    />
  );
}
