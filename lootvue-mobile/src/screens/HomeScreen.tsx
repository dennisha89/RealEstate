import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TrendingUp,
  TrendingDown,
  Mic,
  ArrowRight,
  Zap,
  Star,
  Flame,
  ChevronRight,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, fontSize, radius } from '../theme';
import { Card } from '../components/Card';
import { VerdictBadge } from '../components/VerdictBadge';
import { ScoreBar } from '../components/ScoreBar';
import { SectionLabel } from '../components/SectionLabel';
import { Divider } from '../components/Divider';
import {
  portfolio,
  pipelineDeals,
  markets,
  trendingAddresses,
  rates,
  userLevel,
} from '../data/mockData';
import type { HomeStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

function formatCurrency(n: number, compact = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDelta(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)}/mo`;
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.emerald;
  if (score >= 55) return colors.amber;
  return colors.rose;
}

interface PortfolioMetricProps {
  label: string;
  value: string;
  trend: 'up' | 'down';
}

function PortfolioMetric({ label, value, trend }: PortfolioMetricProps) {
  const trendColor = trend === 'up' ? colors.emerald : colors.rose;
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <View style={styles.portfolioMetric}>
      <View style={styles.portfolioMetricHeader}>
        <Text style={styles.portfolioValue}>{value}</Text>
        <TrendIcon size={12} color={trendColor} aria-hidden />
      </View>
      <Text style={styles.portfolioLabel}>{label}</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const urgentDeal = pipelineDeals[0];
  const topMarkets = markets.slice(0, 5);
  const previewDeals = pipelineDeals.slice(0, 3);

  const handleMic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: voice input
  };

  const handleNextMove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: navigate to deal detail
  };

  const xpPercent = (userLevel.xp / userLevel.xpToNext) * 100;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.brandName}>LootVue</Text>
          </View>
          <View style={styles.levelBadge}>
            <Star size={12} color={colors.gold} aria-hidden />
            <Text style={styles.levelText}>Lv {userLevel.level}</Text>
          </View>
        </View>

        {/* Portfolio Summary */}
        <LinearGradient
          colors={['#1A1200', '#0D0D0D']}
          style={styles.portfolioCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.portfolioBorder}>
            <View style={styles.portfolioRow}>
              <PortfolioMetric
                label="Portfolio"
                value={formatCurrency(portfolio.totalValue, true)}
                trend={portfolio.valueTrend}
              />
              <View style={styles.portfolioDivider} />
              <PortfolioMetric
                label="Cash Flow"
                value={formatDelta(portfolio.monthlyCashFlow)}
                trend={portfolio.cashFlowTrend}
              />
              <View style={styles.portfolioDivider} />
              <PortfolioMetric
                label="Equity"
                value={formatCurrency(portfolio.totalEquity, true)}
                trend={portfolio.equityTrend}
              />
            </View>
            <View style={styles.portfolioFooter}>
              <Text style={styles.portfolioFooterText}>
                {portfolio.dealCount} properties · {portfolio.irr}% IRR
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Next Move Card */}
        <SectionLabel style={styles.sectionLabel}>Your Next Move</SectionLabel>
        <Card gold style={styles.nextMoveCard} onPress={handleNextMove}>
          <View style={styles.nextMoveTop}>
            <View style={styles.nextMoveInfo}>
              <Text style={styles.nextMoveAddress}>{urgentDeal.address}</Text>
              <Text style={styles.nextMoveCity}>{urgentDeal.city}</Text>
            </View>
            <VerdictBadge verdict={urgentDeal.verdict} size="sm" />
          </View>
          <View style={styles.nextMoveStat}>
            <Zap size={13} color={colors.amber} aria-hidden />
            <Text style={styles.nextMoveStatText}>
              In pipeline {urgentDeal.daysInStage}d — market avg{' '}
              {urgentDeal.avgDaysInStage}d. Act now.
            </Text>
          </View>
          <Pressable
            style={styles.nextMoveCTA}
            onPress={handleNextMove}
            accessibilityRole="button"
            accessibilityLabel="Review this deal"
          >
            <LinearGradient
              colors={[colors.gold, colors.goldLight]}
              style={styles.nextMoveCTAGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextMoveCTAText}>Review Deal</Text>
              <ArrowRight size={15} color="#000" aria-hidden />
            </LinearGradient>
          </Pressable>
        </Card>

        {/* Quick Analyze */}
        <SectionLabel style={styles.sectionLabel}>Quick Analyze</SectionLabel>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter address or ZIP code..."
            placeholderTextColor={colors.textDisabled}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Property address search"
          />
          <Pressable
            style={styles.micButton}
            onPress={handleMic}
            accessibilityRole="button"
            accessibilityLabel="Voice input"
          >
            <Mic size={18} color={colors.gold} aria-hidden />
          </Pressable>
        </View>

        {/* Trending Addresses */}
        <View style={styles.trendingContainer}>
          {trendingAddresses.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.trendingRow,
                pressed && styles.trendingRowPressed,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSearchText(item.address);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Trending: ${item.address}, ${item.city}`}
            >
              <View style={styles.trendingLeft}>
                <Text style={styles.trendingAddress}>{item.address}</Text>
                <Text style={styles.trendingCity}>{item.city}</Text>
              </View>
              <View style={styles.trendingRight}>
                <Text
                  style={[styles.trendingScore, { color: scoreColor(item.score) }]}
                >
                  {item.score}
                </Text>
                <Text style={styles.trendingCapRate}>{item.capRate}% cap</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Rates Card */}
        <SectionLabel style={styles.sectionLabel}>Rates Today</SectionLabel>
        <Card style={styles.ratesCard}>
          <View style={styles.ratesRow}>
            <View style={styles.rateItem}>
              <Text style={styles.rateValue}>
                {rates.thirtyYear.toFixed(2)}%
              </Text>
              <TrendingUp size={12} color={colors.rose} aria-hidden />
              <Text style={styles.rateLabel}>30yr</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateValue}>
                {rates.fifteenYear.toFixed(2)}%
              </Text>
              <TrendingUp size={12} color={colors.rose} aria-hidden />
              <Text style={styles.rateLabel}>15yr</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateValue}>
                {rates.fiveOneArm.toFixed(2)}%
              </Text>
              <TrendingUp size={12} color={colors.rose} aria-hidden />
              <Text style={styles.rateLabel}>5/1 ARM</Text>
            </View>
          </View>
          <Divider style={styles.ratesDivider} />
          <Text style={styles.ratesContext}>{rates.context}</Text>
        </Card>

        {/* Market Signals */}
        <SectionLabel style={styles.sectionLabel}>Market Signals</SectionLabel>
        <Card padded={false} style={styles.marketsCard}>
          {topMarkets.map((market, index) => (
            <React.Fragment key={market.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.marketRow,
                  pressed && styles.marketRowPressed,
                ]}
                onPress={() => Haptics.selectionAsync()}
                accessibilityRole="button"
                accessibilityLabel={`${market.name}, ${market.state}: score ${market.score}, ${market.verdict}`}
              >
                <View style={styles.marketLeft}>
                  <Text style={styles.marketName}>{market.name}</Text>
                  <Text style={styles.marketState}>{market.state}</Text>
                </View>
                <View style={styles.marketCenter}>
                  {Array.from({ length: market.maxConvergence }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.convergenceDot,
                        i < market.convergence
                          ? { backgroundColor: scoreColor(market.score) }
                          : { backgroundColor: colors.border },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.marketRight}>
                  <Text
                    style={[
                      styles.marketScore,
                      { color: scoreColor(market.score) },
                    ]}
                  >
                    {market.score}
                  </Text>
                  <VerdictBadge verdict={market.verdict} size="sm" />
                </View>
              </Pressable>
              {index < topMarkets.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>

        {/* Pipeline Preview */}
        <SectionLabel style={styles.sectionLabel}>Pipeline</SectionLabel>
        <Card padded={false} style={styles.pipelineCard}>
          {previewDeals.map((deal, index) => (
            <React.Fragment key={deal.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.pipelineRow,
                  pressed && styles.pipelineRowPressed,
                ]}
                onPress={() => Haptics.selectionAsync()}
                accessibilityRole="button"
                accessibilityLabel={`${deal.address}: ${deal.cashFlowMonthly >= 0 ? 'positive' : 'negative'} cash flow, ${deal.stage}`}
              >
                <View style={styles.pipelineStatusDot}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: scoreColor(deal.score) },
                    ]}
                  />
                </View>
                <View style={styles.pipelineInfo}>
                  <Text style={styles.pipelineAddress}>{deal.address}</Text>
                  <Text style={styles.pipelineStage}>{deal.stage}</Text>
                </View>
                <View style={styles.pipelineMetrics}>
                  <Text
                    style={[
                      styles.pipelineCF,
                      {
                        color:
                          deal.cashFlowMonthly >= 0
                            ? colors.emerald
                            : colors.rose,
                      },
                    ]}
                  >
                    {deal.cashFlowMonthly >= 0 ? '+' : ''}
                    {formatCurrency(deal.cashFlowMonthly)}/mo
                  </Text>
                </View>
                <ChevronRight size={14} color={colors.textDisabled} aria-hidden />
              </Pressable>
              {index < previewDeals.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>

        {/* Level / XP Card */}
        <SectionLabel style={styles.sectionLabel}>Your Progress</SectionLabel>
        <Card gold style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelTitleGroup}>
              <Flame size={16} color={colors.gold} aria-hidden />
              <Text style={styles.levelName}>{userLevel.levelName}</Text>
              <Text style={styles.levelNumber}>Lv {userLevel.level}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>{userLevel.streak} day streak</Text>
            </View>
          </View>
          <View style={styles.xpTrack}>
            <View
              style={[
                styles.xpFill,
                { width: `${(userLevel.xp / userLevel.xpToNext) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.xpLabels}>
            <Text style={styles.xpCurrent}>
              {userLevel.xp.toLocaleString()} XP
            </Text>
            <Text style={styles.xpNext}>
              {userLevel.xpToNext.toLocaleString()} to next level
            </Text>
          </View>
          <View style={styles.levelStats}>
            <Text style={styles.levelStatText}>
              {userLevel.totalDealsAnalyzed} deals analyzed
            </Text>
          </View>
        </Card>

        <View style={styles.bottomPad} />
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
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  brandName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: -0.5,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  levelText: {
    fontSize: fontSize.xs,
    color: colors.gold,
    fontWeight: '600',
  },
  // Portfolio
  portfolioCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    marginBottom: spacing.xl,
  },
  portfolioBorder: {
    padding: spacing.lg,
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioMetric: {
    flex: 1,
    alignItems: 'center',
  },
  portfolioMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  portfolioValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  portfolioLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  portfolioDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  portfolioFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  portfolioFooterText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  // Section label
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  // Next Move
  nextMoveCard: {
    marginBottom: spacing.xl,
  },
  nextMoveTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  nextMoveInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  nextMoveAddress: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  nextMoveCity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nextMoveStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  nextMoveStatText: {
    fontSize: fontSize.sm,
    color: colors.amber,
    flex: 1,
  },
  nextMoveCTA: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  nextMoveCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  nextMoveCTAText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#000',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  micButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Trending
  trendingContainer: {
    marginBottom: spacing.xl,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    minHeight: 56,
  },
  trendingRowPressed: {
    backgroundColor: colors.cardElevated,
  },
  trendingLeft: {
    flex: 1,
  },
  trendingAddress: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trendingCity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trendingRight: {
    alignItems: 'flex-end',
  },
  trendingScore: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  trendingCapRate: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  // Rates
  ratesCard: {
    marginBottom: spacing.xl,
  },
  ratesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  rateDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  ratesDivider: {
    marginVertical: spacing.md,
  },
  ratesContext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Markets
  marketsCard: {
    marginBottom: spacing.xl,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  marketRowPressed: {
    backgroundColor: colors.cardElevated,
  },
  marketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: 100,
  },
  marketName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  marketState: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  marketCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  convergenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  marketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 90,
    justifyContent: 'flex-end',
  },
  marketScore: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Pipeline
  pipelineCard: {
    marginBottom: spacing.xl,
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
    gap: spacing.sm,
  },
  pipelineRowPressed: {
    backgroundColor: colors.cardElevated,
  },
  pipelineStatusDot: {
    width: 20,
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pipelineInfo: {
    flex: 1,
  },
  pipelineAddress: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pipelineStage: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  pipelineMetrics: {
    marginRight: spacing.sm,
  },
  pipelineCF: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Level Card
  levelCard: {
    marginBottom: spacing.xl,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  levelTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  levelNumber: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: '600',
  },
  streakBadge: {
    backgroundColor: colors.rose + '20',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  streakText: {
    fontSize: fontSize.xs,
    color: colors.rose,
    fontWeight: '600',
  },
  xpTrack: {
    height: 6,
    backgroundColor: colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  xpFill: {
    height: 6,
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpCurrent: {
    fontSize: fontSize.xs,
    color: colors.gold,
    fontFamily: 'monospace',
  },
  xpNext: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  levelStats: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  levelStatText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  bottomPad: {
    height: spacing.xxxl,
  },
});
