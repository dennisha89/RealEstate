import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

function buildPath(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xStep = width / (data.length - 1);

  return data.reduce((acc, val, i) => {
    const x = i * xStep;
    const y = height - ((val - min) / range) * height;
    if (i === 0) return `M ${x.toFixed(1)},${y.toFixed(1)}`;
    return `${acc} L ${x.toFixed(1)},${y.toFixed(1)}`;
  }, '');
}

function buildAreaPath(data: number[], width: number, height: number): string {
  const linePath = buildPath(data, width, height);
  if (!linePath) return '';
  return `${linePath} L ${width},${height} L 0,${height} Z`;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 36,
  color = colors.gold,
  showGradient = true,
}: MiniSparklineProps) {
  const linePath = buildPath(data, width, height);
  const areaPath = buildAreaPath(data, width, height);

  return (
    <View accessibilityLabel="Sparkline chart" accessibilityRole="image">
      <Svg width={width} height={height}>
        {showGradient && (
          <Defs>
            <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.3" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
        )}
        {showGradient && areaPath ? (
          <Path d={areaPath} fill="url(#sparkGrad)" />
        ) : null}
        {linePath ? (
          <Path
            d={linePath}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}
