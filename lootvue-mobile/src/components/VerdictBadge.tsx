import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontSize, spacing, radius } from '../theme';
import type { Verdict } from '../data/mockData';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const verdictConfig: Record<Verdict, { bg: string; text: string; label: string }> = {
  BUY: { bg: colors.emerald + '25', text: colors.emerald, label: 'BUY' },
  HOLD: { bg: colors.amber + '25', text: colors.amber, label: 'HOLD' },
  PASS: { bg: colors.rose + '25', text: colors.rose, label: 'PASS' },
};

export function VerdictBadge({ verdict, size = 'md', style }: VerdictBadgeProps) {
  const config = verdictConfig[verdict];

  const sizeStyles = {
    sm: { paddingHorizontal: spacing.sm, paddingVertical: 2, textSize: fontSize.xs },
    md: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, textSize: fontSize.sm },
    lg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, textSize: fontSize.base },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${verdict} recommendation`}
    >
      <Text style={[styles.text, { color: config.text, fontSize: s.textSize }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.xl,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
