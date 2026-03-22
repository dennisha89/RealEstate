import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { colors, fontSize, spacing } from '../theme';

type Trend = 'up' | 'down' | 'neutral';

interface MetricRowProps {
  label: string;
  value: string;
  trend?: Trend;
  subValue?: string;
  style?: ViewStyle;
  valueColor?: string;
}

export function MetricRow({
  label,
  value,
  trend,
  subValue,
  style,
  valueColor,
}: MetricRowProps) {
  const trendColor =
    trend === 'up' ? colors.emerald : trend === 'down' ? colors.rose : colors.textDisabled;

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueGroup}>
        {subValue ? <Text style={styles.subValue}>{subValue}</Text> : null}
        <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
        {trend ? (
          <TrendIcon size={14} color={trendColor} aria-hidden />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  subValue: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginRight: spacing.xs,
  },
});
