import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Monitor,
  AlertTriangle,
} from 'lucide-react-native';

import { colors, spacing, fontSize, radius } from '../theme';
import { Card } from '../components/Card';
import { VerdictBadge } from '../components/VerdictBadge';
import { ScoreBar } from '../components/ScoreBar';
import { MetricRow } from '../components/MetricRow';
import { SectionLabel } from '../components/SectionLabel';
import { Divider } from '../components/Divider';
import { markets } from '../data/mockData';

function scoreColor(score: number): string {
  if (score >= 75) return colors.emerald;
  if (score >= 55) return colors.amber;
  return colors.rose;
}

interface SignalRowProps {
  label: string;
  value: string;
  subLabel: string;
  trend: 'up' | 'down' | 'neutral';
  weight: string;
}

function SignalRow({ label, value, subLabel, trend, weight }: SignalRowProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const trendColor =
    trend === 'up' ? colors.emerald : trend === 'down' ? colors.rose : colors.textDisabled;

  return (
    <View style={styles.signalRow}>
      <View style={styles.signalLeft}>
        <Text style={styles.signalLabel}>{label}</Text>
        <Text style={styles.signalSub}>{subLabel}</Text>
      </View>
      <View style={styles.signalRight}>
        <View style={styles.signalValueGroup}>
          {TrendIcon && <TrendIcon size={12} color={trendColor} aria-hidden />}
          <Text style={[styles.signalValue, { color: trendColor }]}>{value}</Text>
        </View>
        <Text style={styles.signalWeight}>{weight}</Text>
      </View>
    </View>
  );
}

export function MarketsScreen() {
  const [selectedMarketId, setSelectedMarketId] = useState(markets[0].id);

  const selectedMarket = markets.find((m) => m.id === selectedMarketId) ?? markets[0];
  const buyMarkets = markets.filter((m) => m.verdict === 'BUY');
  const holdMarkets = markets.filter((m) => m.verdict === 'HOLD');
  const passMarkets = markets.filter((m) => m.verdict === 'PASS');

  const selectMarket = (id: string) => {
    Haptics.selectionAsync();
    setSelectedMarketId(id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Globe size={20} color={colors.gold} aria-hidden />
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.headerTitle}>Markets</Text>
            <Text style={styles.headerSub}>
              {buyMarkets.length} buy · {holdMarkets.length} hold · {passMarkets.length} pass
            </Text>
          </View>
        </View>

        {/* Market Tier Summary */}
        <View style={styles.tierRow}>
          <View style={[styles.tierCard, { borderColor: colors.emerald + '40' }]}>
            <Text style={styles.tierCount}>{buyMarkets.length}</Text>
            <Text style={[styles.tierLabel, { color: colors.emerald }]}>Buy</Text>
          </View>
          <View style={[styles.tierCard, { borderColor: colors.amber + '40' }]}>
            <Text style={styles.tierCount}>{holdMarkets.length}</Text>
            <Text style={[styles.tierLabel, { color: colors.amber }]}>Hold</Text>
          </View>
          <View style={[styles.tierCard, { borderColor: colors.rose + '40' }]}>
            <Text style={styles.tierCount}>{passMarkets.length}</Text>
            <Text style={[styles.tierLabel, { color: colors.rose }]}>Pass</Text>
          </View>
        </View>

        {/* Market List — scrollable horizontal selector */}
        <SectionLabel>Select Market</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.marketSelector}
        >
          {markets.map((market) => (
            <Pressable
              key={market.id}
              style={[
                styles.marketChip,
                selectedMarketId === market.id && {
                  borderColor: scoreColor(market.score),
                  backgroundColor: scoreColor(market.score) + '15',
                },
              ]}
              onPress={() => selectMarket(market.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedMarketId === market.id }}
              accessibilityLabel={`Select ${market.name}, ${market.state}`}
            >
              <Text
                style={[
                  styles.marketChipName,
                  selectedMarketId === market.id && {
                    color: scoreColor(market.score),
                  },
                ]}
              >
                {market.name}
              </Text>
              <Text style={styles.marketChipState}>{market.state}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Selected Market Detail */}
        <Card gold style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <View>
              <Text style={styles.selectedName}>{selectedMarket.name}</Text>
              <Text style={styles.selectedState}>{selectedMarket.state}</Text>
            </View>
            <VerdictBadge verdict={selectedMarket.verdict} size="md" />
          </View>

          <View style={styles.selectedScoreRow}>
            <ScoreBar score={selectedMarket.score} />
          </View>

          {/* Convergence */}
          <View style={styles.convergenceRow}>
            <Text style={styles.convergenceLabel}>Signal Convergence</Text>
            <View style={styles.convergenceDots}>
              {Array.from({ length: selectedMarket.maxConvergence }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.convergenceDot,
                    {
                      backgroundColor:
                        i < selectedMarket.convergence
                          ? scoreColor(selectedMarket.score)
                          : colors.border,
                    },
                  ]}
                />
              ))}
              <Text style={styles.convergenceText}>
                {selectedMarket.convergence}/{selectedMarket.maxConvergence} signals aligned
              </Text>
            </View>
          </View>
        </Card>

        {/* Signal Breakdown */}
        <SectionLabel>Signal Breakdown</SectionLabel>
        <Card padded={false}>
          <SignalRow
            label="Supply Constraint"
            value={`${selectedMarket.monthsSupply} mo`}
            subLabel="Months of inventory. <3 = tight market."
            trend={selectedMarket.monthsSupply < 3 ? 'up' : 'down'}
            weight="30% weight"
          />
          <Divider />
          <SignalRow
            label="Building Permits"
            value={`+${selectedMarket.permitGrowth}%`}
            subLabel="YoY permit growth. Builders bet their money."
            trend={selectedMarket.permitGrowth > 10 ? 'up' : 'neutral'}
            weight="25% weight"
          />
          <Divider />
          <SignalRow
            label="Price Momentum"
            value={`+${selectedMarket.hpiMomentum}%`}
            subLabel="HPI growth rate, last 12 months."
            trend={selectedMarket.hpiMomentum > 3 ? 'up' : 'neutral'}
            weight="20% weight"
          />
          <Divider />
          <SignalRow
            label="Employment Growth"
            value={`+${selectedMarket.employmentGrowth}%`}
            subLabel="BLS non-farm payroll, YoY change."
            trend={selectedMarket.employmentGrowth > 1.5 ? 'up' : 'neutral'}
            weight="15% weight"
          />
        </Card>

        {/* Best Markets — Top 3 */}
        <SectionLabel style={{ marginTop: spacing.lg }}>Best Markets Right Now</SectionLabel>
        <Card padded={false}>
          {buyMarkets.slice(0, 3).map((market, index) => (
            <React.Fragment key={market.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.marketListRow,
                  pressed && styles.marketListRowPressed,
                ]}
                onPress={() => selectMarket(market.id)}
                accessibilityRole="button"
                accessibilityLabel={`${market.name}, score ${market.score}`}
              >
                <View style={styles.marketListRank}>
                  <Text style={styles.marketListRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.marketListInfo}>
                  <Text style={styles.marketListName}>{market.name}, {market.state}</Text>
                  <Text style={styles.marketListSub}>
                    {market.convergence}/{market.maxConvergence} signals · {market.monthsSupply} mo supply
                  </Text>
                </View>
                <View style={styles.marketListRight}>
                  <Text style={[styles.marketListScore, { color: scoreColor(market.score) }]}>
                    {market.score}
                  </Text>
                  <ChevronRight size={14} color={colors.textDisabled} aria-hidden />
                </View>
              </Pressable>
              {index < buyMarkets.slice(0, 3).length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>

        {/* Avoid Markets */}
        <SectionLabel style={{ marginTop: spacing.lg }}>Markets to Avoid</SectionLabel>
        <Card padded={false}>
          {passMarkets.map((market, index) => (
            <React.Fragment key={market.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.marketListRow,
                  pressed && styles.marketListRowPressed,
                ]}
                onPress={() => selectMarket(market.id)}
                accessibilityRole="button"
              >
                <AlertTriangle size={14} color={colors.rose} aria-hidden style={{ marginRight: spacing.sm }} />
                <View style={styles.marketListInfo}>
                  <Text style={styles.marketListName}>{market.name}, {market.state}</Text>
                  <Text style={styles.marketListSub}>
                    {market.convergence}/{market.maxConvergence} signals · {market.monthsSupply} mo supply
                  </Text>
                </View>
                <Text style={[styles.marketListScore, { color: colors.rose }]}>
                  {market.score}
                </Text>
              </Pressable>
              {index < passMarkets.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>

        {/* Desktop CTA */}
        <Card elevated style={styles.desktopCTA}>
          <View style={styles.desktopCTARow}>
            <Monitor size={16} color={colors.gold} aria-hidden />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={styles.desktopCTATitle}>Full 4D Analysis on Desktop</Text>
              <Text style={styles.desktopCTASub}>
                Choropleth maps, state→MSA→ZIP drill-down, and comparison mode. Open LootVue on your browser for the complete view.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Tier summary
  tierRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  tierCount: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  tierLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Market selector chips
  marketSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  marketChip: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  marketChipName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  marketChipState: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  // Selected market
  selectedCard: {
    marginBottom: spacing.xl,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  selectedName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  selectedState: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  selectedScoreRow: {
    marginBottom: spacing.md,
  },
  convergenceRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  convergenceLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  convergenceDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  convergenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  convergenceText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  // Signal rows
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  signalLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  signalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  signalSub: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
    lineHeight: 16,
  },
  signalRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  signalValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  signalValue: {
    fontSize: fontSize.base,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  signalWeight: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  // Market list rows
  marketListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  marketListRowPressed: {
    backgroundColor: colors.cardElevated,
  },
  marketListRank: {
    width: 28,
    marginRight: spacing.sm,
  },
  marketListRankText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  marketListInfo: {
    flex: 1,
  },
  marketListName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  marketListSub: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  marketListRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  marketListScore: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Desktop CTA
  desktopCTA: {
    marginTop: spacing.xl,
  },
  desktopCTARow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  desktopCTATitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  desktopCTASub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
