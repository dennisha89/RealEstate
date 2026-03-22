import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { colors, fontSize, spacing } from '../theme';
import { portfolio } from '../data/mockData';

function fmt(n: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

export function PortfolioStrip() {
  return (
    <View
      style={styles.strip}
      accessibilityRole="summary"
      accessibilityLabel={`Portfolio value ${fmt(portfolio.totalValue)}, cash flow +${fmt(portfolio.monthlyCashFlow)} per month, equity ${fmt(portfolio.totalEquity, true)}`}
    >
      {/* Value */}
      <View style={styles.metric}>
        <Text style={styles.value}>{fmt(portfolio.totalValue, true)}</Text>
        <View style={styles.badge}>
          <TrendingUp size={10} color={colors.emerald} aria-hidden />
          <Text style={styles.badgeText}>{portfolio.valueChangePct}%</Text>
        </View>
      </View>

      <View style={styles.sep} />

      {/* Cash Flow */}
      <View style={styles.metric}>
        <Text style={[styles.value, { color: colors.emerald }]}>
          +{fmt(portfolio.monthlyCashFlow)}/mo
        </Text>
      </View>

      <View style={styles.sep} />

      {/* Equity */}
      <View style={styles.metric}>
        <Text style={styles.label}>EQUITY</Text>
        <Text style={styles.value}>{fmt(portfolio.totalEquity, true)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginRight: 3,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.emeraldMuted,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    color: colors.emerald,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sep: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
});
