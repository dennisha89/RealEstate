"use client";

import { useEffect, useRef, useCallback } from "react";
import * as echarts from "echarts/core";
import { HeatmapChart as EHeatmapChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([EHeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

interface HeatmapChartProps {
  xLabels: string[];
  yLabels: string[];
  data: Array<[number, number, number]>;
  height?: number;
  minValue?: number;
  maxValue?: number;
  colorRange?: [string, string];
  formatValue?: (value: number) => string;
}

export default function HeatmapChart({
  xLabels,
  yLabels,
  data,
  height = 400,
  minValue = 0,
  maxValue = 100,
  colorRange = ["#1e3a5f", "#22c55e"],
  formatValue = (v) => v.toFixed(1),
}: HeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const buildOption = useCallback((): echarts.EChartsCoreOption => ({
    backgroundColor: "transparent",
    tooltip: {
      position: "top",
      backgroundColor: "#1a1d27",
      borderColor: "#2e3348",
      textStyle: { color: "#e5e7eb", fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number] };
        return `${yLabels[p.value[1]]} × ${xLabels[p.value[0]]}<br/><b>${formatValue(p.value[2])}</b>`;
      },
    },
    grid: {
      left: "15%",
      right: "5%",
      top: 10,
      bottom: 70,
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: xLabels,
      axisLabel: { color: "#6b7280", fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: "#374151" } },
      splitArea: { show: false },
    },
    yAxis: {
      type: "category",
      data: yLabels,
      axisLabel: { color: "#9ca3af", fontSize: 11 },
      axisLine: { lineStyle: { color: "#374151" } },
      splitArea: { show: false },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 5,
      inRange: {
        color: [colorRange[0], "#1a1d27", colorRange[1]],
      },
      textStyle: { color: "#6b7280", fontSize: 10 },
    },
    series: [
      {
        type: "heatmap",
        data,
        label: {
          show: data.length <= 100,
          color: "#e5e7eb",
          fontSize: 10,
          formatter: (params: unknown) => {
            const p = params as { value: [number, number, number] };
            return formatValue(p.value[2]);
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: "#111318",
        },
      },
    ],
  }), [xLabels, yLabels, data, minValue, maxValue, colorRange, formatValue]);

  // Init + update
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }

    const initTimer = setTimeout(() => {
      if (!containerRef.current) return;
      const chart = echarts.init(containerRef.current, "dark", { renderer: "canvas" });
      chartRef.current = chart;
      chart.setOption(buildOption(), true);
    }, 50);

    return () => clearTimeout(initTimer);
  }, [buildOption]);

  // ResizeObserver
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

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, minHeight: 200 }}
    />
  );
}
