import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  BellDot,
  TrendingUp,
  TrendingDown,
  Zap,
  Brain,
  Star,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Award,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, fontSize, radius } from '../theme';
import { PortfolioStrip } from '../components/PortfolioStrip';
import { SwipeableCard } from '../components/SwipeableCard';
import { VerdictBadge } from '../components/VerdictBadge';
import { ScoreRing } from '../components/ScoreRing';
import { MiniSparkline } from '../components/MiniSparkline';
import { ConvergenceDots } from '../components/ConvergenceDots';
import { feedCards, type FeedCard, type Verdict } from '../data/mockData';
import type { HomeStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeedMain'>;

// -------------------------------------------------------
// Formatters
// -------------------------------------------------------

function fmt(n: number, compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

function timeAgo(date: Date): string {
  const now = new Date('2026-03-22T09:00:00');
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
}

// -------------------------------------------------------
// Card type renderers
// -------------------------------------------------------

interface RateAlertCardProps {
  card: FeedCard;
  onPress?: () => void;
}

function RateAlertCard({ card, onPress }: RateAlertCardProps) {
  const d = card.data as {
    rate30yr: number;
    prevRate30yr: number;
    changeBps: number;
    direction: string;
    impactDeal: string;
    impactCFDelta: number;
    sparkline: number[];
  };
  const up = d.direction === 'up';
  const changeColor = up ? colors.rose : colors.emerald;

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Rate alert: 30-year mortgage ${d.rate30yr}%, ${Math.abs(d.changeBps)} basis points ${d.direction}`}
    >
      <View style={styles.standardCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeTag}>
            <TrendingUp size={11} color={changeColor} aria-hidden />
            <Text style={[styles.cardTypeText, { color: changeColor }]}>RATE ALERT</Text>
          </View>
          <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
        </View>

        {/* Rate row */}
        <View style={styles.rateRow}>
          <View>
            <Text style={styles.rateValue}>{d.rate30yr.toFixed(2)}%</Text>
            <Text style={styles.rateLabel}>30yr fixed</Text>
          </View>
          <View style={[styles.changePill, { backgroundColor: changeColor + '20' }]}>
            {up
              ? <TrendingUp size={12} color={changeColor} aria-hidden />
              : <TrendingDown size={12} color={changeColor} aria-hidden />
            }
            <Text style={[styles.changePillText, { color: changeColor }]}>
              {up ? '+' : ''}{d.changeBps}bps
            </Text>
          </View>
          <MiniSparkline
            data={d.sparkline}
            width={80}
            height={36}
            color={changeColor}
          />
        </View>

        {/* Impact */}
        <View style={styles.impactRow}>
          <Zap size={12} color={colors.amber} aria-hidden />
          <Text style={styles.impactText}>
            Impact on{' '}
            <Text style={styles.impactDeal}>{d.impactDeal}</Text>:{' '}
            <Text style={{ color: d.impactCFDelta >= 0 ? colors.emerald : colors.rose }}>
              {d.impactCFDelta >= 0 ? '+' : ''}{fmt(d.impactCFDelta)}/mo
            </Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

interface DealMatchCardProps {
  card: FeedCard;
  onSave: () => void;
  onPass: () => void;
  onPress: () => void;
}

function DealMatchCard({ card, onSave, onPass, onPress }: DealMatchCardProps) {
  const d = card.data as {
    address: string;
    city: string;
    score: number;
    verdict: Verdict;
    cashFlowMonthly: number;
    capRate: number;
    purchasePrice: number;
    monthlyRent: number;
    dscr: number;
    matchReason: string;
  };

  return (
    <SwipeableCard
      onSwipeRight={onSave}
      onSwipeLeft={onPass}
      rightLabel="SAVE"
      leftLabel="PASS"
    >
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={`Deal match: ${d.address}, score ${d.score}, ${d.verdict}`}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeTag}>
            <MapPin size={11} color={colors.gold} aria-hidden />
            <Text style={[styles.cardTypeText, { color: colors.gold }]}>DEAL MATCH</Text>
          </View>
          <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
        </View>

        {/* Property row */}
        <View style={styles.dealMatchTop}>
          {/* Photo placeholder */}
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {d.address.slice(0, 4)}
            </Text>
          </View>

          <View style={styles.dealMatchInfo}>
            <Text style={styles.dealAddress}>{d.address}</Text>
            <Text style={styles.dealCity}>{d.city}</Text>
            <VerdictBadge verdict={d.verdict} size="sm" style={{ marginTop: 4 }} />
          </View>

          <ScoreRing score={d.score} size={56} strokeWidth={5} />
        </View>

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillLabel}>CF</Text>
            <Text style={[styles.metricPillValue, { color: colors.emerald }]}>
              +{fmt(d.cashFlowMonthly)}/mo
            </Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillLabel}>CAP</Text>
            <Text style={styles.metricPillValue}>{d.capRate}%</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillLabel}>DSCR</Text>
            <Text style={styles.metricPillValue}>{d.dscr}x</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillLabel}>PRICE</Text>
            <Text style={styles.metricPillValue}>{fmt(d.purchasePrice, true)}</Text>
          </View>
        </View>

        {/* Match reason */}
        <View style={styles.matchReasonRow}>
          <Star size={11} color={colors.gold} aria-hidden />
          <Text style={styles.matchReasonText}>{d.matchReason}</Text>
        </View>
      </Pressable>
    </SwipeableCard>
  );
}

interface PipelineAlertCardProps {
  card: FeedCard;
  onAdvance: () => void;
  onPass: () => void;
  onPress: () => void;
}

function PipelineAlertCard({ card, onAdvance, onPass, onPress }: PipelineAlertCardProps) {
  const d = card.data as {
    address: string;
    city: string;
    stage: string;
    daysInStage: number;
    avgDaysInStage: number;
    urgency: string;
    action: string;
  };
  const overdue = d.daysInStage > d.avgDaysInStage;
  const progressPct = Math.min((d.daysInStage / d.avgDaysInStage) * 100, 100);

  return (
    <SwipeableCard
      onSwipeRight={onAdvance}
      onSwipeLeft={onPass}
      rightLabel="ADVANCE"
      leftLabel="PASS"
    >
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={`Pipeline alert: ${d.address}, ${d.daysInStage} days in ${d.stage}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeTag}>
            <AlertTriangle size={11} color={colors.amber} aria-hidden />
            <Text style={[styles.cardTypeText, { color: colors.amber }]}>PIPELINE ALERT</Text>
          </View>
          <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
        </View>

        <Text style={styles.dealAddress}>{d.address}</Text>
        <Text style={styles.dealCity}>{d.city}</Text>

        {/* Stage + days */}
        <View style={styles.stagePillRow}>
          <View style={styles.stagePill}>
            <Text style={styles.stagePillText}>{d.stage}</Text>
          </View>
          <Text style={[styles.daysText, overdue && { color: colors.amber }]}>
            {d.daysInStage}d here · avg {d.avgDaysInStage}d
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPct}%` as `${number}%`,
                backgroundColor: overdue ? colors.amber : colors.emerald,
              },
            ]}
          />
        </View>

        {/* Urgency */}
        <View style={styles.urgencyRow}>
          <Zap size={11} color={colors.amber} aria-hidden />
          <Text style={styles.urgencyText}>{d.urgency}</Text>
        </View>
      </Pressable>
    </SwipeableCard>
  );
}

interface MarketShiftCardProps {
  card: FeedCard;
  onPress?: () => void;
}

function MarketShiftCard({ card, onPress }: MarketShiftCardProps) {
  const d = card.data as {
    market: string;
    state: string;
    oldSignalCount: number;
    newSignalCount: number;
    score: number;
    verdict: Verdict;
    explanation: string;
  };
  const gained = d.newSignalCount > d.oldSignalCount;

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Market shift: ${d.market} signal count changed to ${d.newSignalCount}`}
    >
      <View style={styles.standardCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeTag}>
            <TrendingUp size={11} color={gained ? colors.emerald : colors.rose} aria-hidden />
            <Text style={[styles.cardTypeText, { color: gained ? colors.emerald : colors.rose }]}>
              MARKET SHIFT
            </Text>
          </View>
          <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
        </View>

        <View style={styles.marketShiftTop}>
          <View>
            <Text style={styles.marketName}>{d.market}</Text>
            <Text style={styles.marketState}>{d.state}</Text>
          </View>
          <VerdictBadge verdict={d.verdict} size="md" />
        </View>

        {/* Signal change */}
        <View style={styles.signalChangeRow}>
          <ConvergenceDots filled={d.oldSignalCount} total={5} color={colors.textDisabled} size={9} />
          <Text style={styles.signalArrow}> → </Text>
          <ConvergenceDots filled={d.newSignalCount} total={5} color={colors.emerald} size={9} />
          <Text style={styles.signalChangeLabel}>
            {gained ? '+' : ''}{d.newSignalCount - d.oldSignalCount} signal
          </Text>
        </View>

        <Text style={styles.explanationText}>{d.explanation}</Text>

        <View style={styles.exploreCTA}>
          <Text style={styles.exploreCTAText}>Explore {d.market}</Text>
          <ChevronRight size={13} color={colors.gold} aria-hidden />
        </View>
      </View>
    </Pressable>
  );
}

interface AchievementCardProps {
  card: FeedCard;
}

function AchievementCard({ card }: AchievementCardProps) {
  const d = card.data as {
    emoji: string;
    name: string;
    description: string;
    xpGained: number;
    totalXP: number;
    xpToNext: number;
  };
  const progressPct = (d.totalXP / d.xpToNext) * 100;

  return (
    <View style={styles.achievementCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTypeTag}>
          <Award size={11} color={colors.gold} aria-hidden />
          <Text style={[styles.cardTypeText, { color: colors.gold }]}>ACHIEVEMENT</Text>
        </View>
        <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
      </View>

      <View style={styles.achievementBody}>
        <Text style={styles.achievementEmoji}>{d.emoji}</Text>
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementName}>{d.name}</Text>
          <Text style={styles.achievementDesc}>{d.description}</Text>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{d.xpGained} XP</Text>
          </View>
        </View>
      </View>

      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: `${progressPct}%` as `${number}%` }]} />
      </View>
      <View style={styles.xpLabels}>
        <Text style={styles.xpCurrent}>{d.totalXP.toLocaleString()} XP</Text>
        <Text style={styles.xpNext}>{d.xpToNext.toLocaleString()} to next level</Text>
      </View>
    </View>
  );
}

interface AiInsightCardProps {
  card: FeedCard;
  onPress?: () => void;
}

function AiInsightCard({ card, onPress }: AiInsightCardProps) {
  const d = card.data as {
    insight: string;
    cta: string;
    confidencePct: number;
  };

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`AI insight with ${d.confidencePct}% confidence`}
    >
      <View style={styles.aiCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeTag}>
            <Brain size={11} color={colors.gold} aria-hidden />
            <Text style={[styles.cardTypeText, { color: colors.gold }]}>AI INSIGHT</Text>
          </View>
          <View style={styles.confBadge}>
            <Text style={styles.confText}>{d.confidencePct}% conf</Text>
          </View>
          <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
        </View>

        <Text style={styles.aiInsightText}>{d.insight}</Text>

        {d.cta ? (
          <View style={styles.aiCTA}>
            <Text style={styles.aiCTAText}>{d.cta}</Text>
            <ChevronRight size={13} color={colors.gold} aria-hidden />
          </View>
        ) : null}

        <Text style={styles.aiDisclaimer}>AI analysis is informational, not financial advice.</Text>
      </View>
    </Pressable>
  );
}

interface PortfolioUpdateCardProps {
  card: FeedCard;
}

function PortfolioUpdateCard({ card }: PortfolioUpdateCardProps) {
  const d = card.data as {
    valueChange: number;
    valueChangePct: number;
    cashFlowChange: number;
    newTotalValue: number;
    newMonthlyCF: number;
    driver: string;
  };

  return (
    <View style={styles.standardCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTypeTag}>
          <TrendingUp size={11} color={colors.emerald} aria-hidden />
          <Text style={[styles.cardTypeText, { color: colors.emerald }]}>PORTFOLIO UPDATE</Text>
        </View>
        <Text style={styles.timestamp}>{timeAgo(card.timestamp)}</Text>
      </View>

      <View style={styles.portfolioUpdateRow}>
        <View style={styles.portfolioUpdateMetric}>
          <Text style={styles.portfolioUpdateValue}>{fmt(d.newTotalValue, true)}</Text>
          <Text style={styles.portfolioUpdateSub}>
            {d.valueChange >= 0 ? '+' : ''}{fmt(d.valueChange, true)} ({d.valueChangePct}%)
          </Text>
          <Text style={styles.portfolioUpdateLabel}>Portfolio Value</Text>
        </View>
        <View style={styles.portfolioUpdateMetric}>
          <Text style={[styles.portfolioUpdateValue, { color: colors.emerald }]}>
            +{fmt(d.newMonthlyCF)}/mo
          </Text>
          <Text style={styles.portfolioUpdateSub}>
            {d.cashFlowChange >= 0 ? '+' : ''}{fmt(d.cashFlowChange)}/mo
          </Text>
          <Text style={styles.portfolioUpdateLabel}>Monthly Cash Flow</Text>
        </View>
      </View>

      <Text style={styles.driverText}>{d.driver}</Text>
    </View>
  );
}

// -------------------------------------------------------
// Feed row renderer
// -------------------------------------------------------

interface FeedRowProps {
  card: FeedCard;
  onDealPress: (dealId: string) => void;
  onSaved: (cardId: string) => void;
  onPassed: (cardId: string) => void;
}

function FeedRow({ card, onDealPress, onSaved, onPassed }: FeedRowProps) {
  switch (card.type) {
    case 'rate_alert':
      return (
        <View style={styles.feedRow}>
          <RateAlertCard card={card} />
        </View>
      );

    case 'deal_match': {
      const d = card.data as { address: string };
      return (
        <View style={styles.feedRow}>
          <DealMatchCard
            card={card}
            onSave={() => onSaved(card.id)}
            onPass={() => onPassed(card.id)}
            onPress={() => onDealPress(card.id)}
          />
        </View>
      );
    }

    case 'pipeline_alert':
      return (
        <View style={styles.feedRow}>
          <PipelineAlertCard
            card={card}
            onAdvance={() => onSaved(card.id)}
            onPass={() => onPassed(card.id)}
            onPress={() => onDealPress((card.data as { dealId: string }).dealId)}
          />
        </View>
      );

    case 'market_shift':
      return (
        <View style={styles.feedRow}>
          <MarketShiftCard card={card} />
        </View>
      );

    case 'achievement':
      return (
        <View style={styles.feedRow}>
          <AchievementCard card={card} />
        </View>
      );

    case 'ai_insight':
      return (
        <View style={styles.feedRow}>
          <AiInsightCard card={card} />
        </View>
      );

    case 'portfolio_update':
      return (
        <View style={styles.feedRow}>
          <PortfolioUpdateCard card={card} />
        </View>
      );

    default:
      return null;
  }
}

// -------------------------------------------------------
// Main screen
// -------------------------------------------------------

export function FeedScreen({ navigation }: Props) {
  const [cards, setCards] = useState<FeedCard[]>(feedCards);

  const handleDealPress = useCallback(
    (dealId: string) => {
      navigation.navigate('DealDetail', { dealId });
    },
    [navigation]
  );

  const handleSaved = useCallback((cardId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, read: true, actionable: false } : c))
    );
  }, []);

  const handlePassed = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const unreadCount = cards.filter((c) => !c.read).length;

  const renderItem = useCallback(
    ({ item }: { item: FeedCard }) => (
      <FeedRow
        card={item}
        onDealPress={handleDealPress}
        onSaved={handleSaved}
        onPassed={handlePassed}
      />
    ),
    [handleDealPress, handleSaved, handlePassed]
  );

  const keyExtractor = useCallback((item: FeedCard) => item.id, []);

  const ListHeader = (
    <View>
      {/* App header */}
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.brandName}>LootVue</Text>
          <Text style={styles.brandSub}>Your edge. Their blind spot.</Text>
        </View>
        <Pressable
          style={styles.notifBtn}
          accessibilityRole="button"
          accessibilityLabel={`${unreadCount} unread notifications`}
        >
          <BellDot size={22} color={unreadCount > 0 ? colors.gold : colors.textDisabled} aria-hidden />
          {unreadCount > 0 && (
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <PortfolioStrip />
      <View style={styles.feedLabelRow}>
        <Text style={styles.feedLabel}>YOUR FEED</Text>
        <Text style={styles.feedCount}>{cards.length} updates</Text>
      </View>
    </View>
  );

  const ListEmpty = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>✓</Text>
      <Text style={styles.emptyTitle}>All caught up</Text>
      <Text style={styles.emptySub}>New alerts will appear here as markets move.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={cards}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

// -------------------------------------------------------
// Styles
// -------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: 100,
  },
  // App header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  brandName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 1,
  },
  notifBtn: {
    position: 'relative',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.rose,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifDotText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  // Feed label
  feedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  feedLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  feedCount: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  // Feed row
  feedRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  // Shared card shell
  standardCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  // AI card
  aiCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold + '40',
    padding: spacing.lg,
  },
  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  cardTypeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  // Rate alert
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rateValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  rateLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  changePillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.amberMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  impactText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  impactDeal: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Deal match
  dealMatchTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    fontWeight: '700',
  },
  dealMatchInfo: {
    flex: 1,
  },
  dealAddress: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dealCity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricPill: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.sm,
    padding: spacing.xs,
    alignItems: 'center',
  },
  metricPillLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricPillValue: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  matchReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchReasonText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    flex: 1,
  },
  // Pipeline alert
  stagePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  stagePill: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  stagePillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  daysText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.cardElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  urgencyText: {
    fontSize: fontSize.sm,
    color: colors.amber,
    flex: 1,
    lineHeight: 18,
  },
  // Market shift
  marketShiftTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  marketName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  marketState: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signalChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  signalArrow: {
    color: colors.textDisabled,
    fontSize: fontSize.sm,
  },
  signalChangeLabel: {
    fontSize: fontSize.sm,
    color: colors.emerald,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  explanationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  exploreCTA: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreCTAText: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: '600',
  },
  // Achievement
  achievementCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    padding: spacing.lg,
  },
  achievementBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  achievementEmoji: {
    fontSize: 36,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  achievementDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: colors.goldMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  xpBadgeText: {
    fontSize: fontSize.xs,
    color: colors.gold,
    fontWeight: '700',
  },
  xpTrack: {
    height: 4,
    backgroundColor: colors.cardElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  xpFill: {
    height: 4,
    backgroundColor: colors.gold,
    borderRadius: 2,
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
  // AI insight
  aiInsightText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  confBadge: {
    backgroundColor: colors.goldMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  confText: {
    fontSize: 10,
    color: colors.gold,
    fontWeight: '700',
  },
  aiCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiCTAText: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: '600',
  },
  aiDisclaimer: {
    fontSize: 10,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  // Portfolio update
  portfolioUpdateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  portfolioUpdateMetric: {
    flex: 1,
  },
  portfolioUpdateValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  portfolioUpdateSub: {
    fontSize: fontSize.sm,
    color: colors.emerald,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  portfolioUpdateLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  driverText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
});
