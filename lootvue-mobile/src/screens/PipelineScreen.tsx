import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Kanban,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  DollarSign,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';

import { colors, spacing, fontSize, radius } from '../theme';
import { Card } from '../components/Card';
import { VerdictBadge } from '../components/VerdictBadge';
import { ScoreBar } from '../components/ScoreBar';
import { MetricRow } from '../components/MetricRow';
import { SectionLabel } from '../components/SectionLabel';
import { Divider } from '../components/Divider';
import {
  pipelineDeals,
  kanbanColumns,
  type KanbanStage,
} from '../data/mockData';

type Deal = (typeof pipelineDeals)[number];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCurrencyCompact(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.emerald;
  if (score >= 55) return colors.amber;
  return colors.rose;
}

function stageColor(stage: KanbanStage): string {
  switch (stage) {
    case 'Discovered':
      return colors.textDisabled;
    case 'Analyzing':
      return colors.amber;
    case 'Offer':
      return colors.gold;
    case 'Contract':
      return colors.emerald;
    case 'Closed':
      return colors.emerald;
    default:
      return colors.textDisabled;
  }
}

interface DealCardProps {
  deal: Deal;
  onPress: () => void;
}

function DealCard({ deal, onPress }: DealCardProps) {
  const cfColor = deal.cashFlowMonthly >= 0 ? colors.emerald : colors.rose;
  const isUrgent = deal.daysInStage > deal.avgDaysInStage;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.dealCardContainer,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Deal: ${deal.address}, ${deal.stage}, cash flow ${deal.cashFlowMonthly >= 0 ? 'positive' : 'negative'}`}
    >
      <View style={styles.dealCard}>
        {isUrgent && (
          <View style={styles.urgentBanner}>
            <AlertCircle size={11} color={colors.amber} aria-hidden />
            <Text style={styles.urgentText}>
              {deal.daysInStage}d here — avg {deal.avgDaysInStage}d
            </Text>
          </View>
        )}
        <View style={styles.dealCardHeader}>
          <Text style={styles.dealAddress} numberOfLines={1}>{deal.address}</Text>
          <View
            style={[styles.stageDot, { backgroundColor: stageColor(deal.stage as KanbanStage) }]}
          />
        </View>
        <Text style={styles.dealCity}>{deal.city}</Text>
        <View style={styles.dealMetrics}>
          <Text style={[styles.dealCF, { color: cfColor }]}>
            {deal.cashFlowMonthly >= 0 ? '+' : ''}
            {formatCurrency(deal.cashFlowMonthly)}/mo
          </Text>
          <View style={[styles.dealScore, { backgroundColor: scoreColor(deal.score) + '20' }]}>
            <Text style={[styles.dealScoreText, { color: scoreColor(deal.score) }]}>
              {deal.score}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

interface DealDetailModalProps {
  deal: Deal | null;
  onClose: () => void;
}

function DealDetailModal({ deal, onClose }: DealDetailModalProps) {
  if (!deal) return null;

  return (
    <Modal
      visible={!!deal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <RNSafeAreaView style={styles.modalSafe}>
        {/* Handle */}
        <View style={styles.modalHandle} />

        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <Text style={styles.modalAddress}>{deal.address}</Text>
            <Text style={styles.modalCity}>{deal.city}</Text>
          </View>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={colors.textSecondary} aria-hidden />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Verdict + Score */}
          <Card gold>
            <View style={styles.modalVerdictRow}>
              <VerdictBadge verdict={deal.verdict} size="lg" />
              <View style={styles.modalStageTag}>
                <View style={[styles.stageDotLg, { backgroundColor: stageColor(deal.stage as KanbanStage) }]} />
                <Text style={styles.modalStageText}>{deal.stage}</Text>
              </View>
            </View>
            <ScoreBar score={deal.score} style={{ marginTop: spacing.md }} />
          </Card>

          {/* Timeline */}
          <Card>
            <View style={styles.timelineRow}>
              <Clock size={14} color={colors.gold} aria-hidden />
              <Text style={styles.timelineText}>
                {deal.daysInStage} days in {deal.stage}
              </Text>
              <Text style={styles.timelineAvg}>(avg {deal.avgDaysInStage}d)</Text>
              {deal.daysInStage > deal.avgDaysInStage && (
                <View style={styles.urgentTag}>
                  <Text style={styles.urgentTagText}>Overdue</Text>
                </View>
              )}
            </View>
          </Card>

          {/* Financials */}
          <Card>
            <SectionLabel>Deal Financials</SectionLabel>
            <MetricRow
              label="Purchase Price"
              value={formatCurrencyCompact(deal.purchasePrice)}
            />
            <Divider style={{ marginVertical: spacing.xs }} />
            <MetricRow
              label="Down Payment"
              value={formatCurrencyCompact(deal.downPayment)}
            />
            <Divider style={{ marginVertical: spacing.xs }} />
            <MetricRow
              label="Monthly Rent"
              value={formatCurrency(deal.monthlyRent)}
              valueColor={colors.emerald}
            />
            <Divider style={{ marginVertical: spacing.xs }} />
            <MetricRow
              label="Monthly Cash Flow"
              value={`${deal.cashFlowMonthly >= 0 ? '+' : ''}${formatCurrency(deal.cashFlowMonthly)}/mo`}
              trend={deal.cashFlowMonthly >= 0 ? 'up' : 'down'}
              valueColor={deal.cashFlowMonthly >= 0 ? colors.emerald : colors.rose}
            />
            <Divider style={{ marginVertical: spacing.xs }} />
            <MetricRow label="Cap Rate" value={`${deal.capRate}%`} trend="up" />
            <Divider style={{ marginVertical: spacing.xs }} />
            <MetricRow label="DSCR" value={`${deal.dscr}x`} trend={deal.dscr >= 1.2 ? 'up' : 'down'} />
          </Card>

          {/* Actions */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionBtnSecondary}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnSecondaryText}>Pass</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
              }}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.gold, colors.goldLight]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.actionBtnPrimaryText}>Move Forward</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );
}

export function PipelineScreen() {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const columns = kanbanColumns.filter((col) => col !== 'Closed');
  const activeCols = columns as KanbanStage[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <Kanban size={20} color={colors.gold} aria-hidden />
          <Text style={styles.pageTitle}>Pipeline</Text>
        </View>
        <View style={styles.dealCountBadge}>
          <Text style={styles.dealCountText}>{pipelineDeals.length} deals</Text>
        </View>
      </View>

      {/* Kanban horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanbanContainer}
        style={styles.kanbanScroll}
      >
        {activeCols.map((column) => {
          const columnDeals = pipelineDeals.filter((d) => d.stage === column);
          return (
            <View key={column} style={styles.kanbanColumn}>
              {/* Column Header */}
              <View style={styles.columnHeader}>
                <View style={[styles.columnDot, { backgroundColor: stageColor(column) }]} />
                <Text style={styles.columnTitle}>{column}</Text>
                <View style={styles.columnCount}>
                  <Text style={styles.columnCountText}>{columnDeals.length}</Text>
                </View>
              </View>

              {/* Column Cards */}
              <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.columnContent}
              >
                {columnDeals.length === 0 ? (
                  <View style={styles.emptyColumn}>
                    <Text style={styles.emptyColumnText}>No deals</Text>
                  </View>
                ) : (
                  columnDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onPress={() => setSelectedDeal(deal)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        {pipelineDeals
          .filter((d) => d.cashFlowMonthly > 0)
          .slice(0, 3)
          .map((deal, index) => (
            <View key={deal.id} style={styles.summaryItem}>
              <Text style={styles.summaryAddress} numberOfLines={1}>
                {deal.address.split(' ').slice(0, 3).join(' ')}
              </Text>
              <Text style={[styles.summaryCF, { color: colors.emerald }]}>
                +{formatCurrency(deal.cashFlowMonthly)}/mo
              </Text>
            </View>
          ))}
      </View>

      <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  dealCountBadge: {
    backgroundColor: colors.goldMuted,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  dealCountText: {
    fontSize: fontSize.xs,
    color: colors.gold,
    fontWeight: '600',
  },
  // Kanban
  kanbanScroll: {
    flex: 1,
  },
  kanbanContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  kanbanColumn: {
    width: 220,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnCount: {
    backgroundColor: colors.cardElevated,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  columnCountText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
  },
  columnScroll: {
    flex: 1,
  },
  columnContent: {
    gap: spacing.sm,
  },
  emptyColumn: {
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyColumnText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
  // Deal Card
  dealCardContainer: {
    marginBottom: 0,
  },
  dealCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amber + '15',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  urgentText: {
    fontSize: fontSize.xs,
    color: colors.amber,
  },
  dealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dealAddress: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.xs,
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  stageDotLg: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dealCity: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginBottom: spacing.sm,
  },
  dealMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealCF: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  dealScore: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dealScoreText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryAddress: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginBottom: 2,
  },
  summaryCF: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  modalAddress: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalCity: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: 4,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  modalVerdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalStageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardElevated,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  modalStageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  timelineText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timelineAvg: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
  urgentTag: {
    backgroundColor: colors.amber + '20',
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  urgentTagText: {
    fontSize: fontSize.xs,
    color: colors.amber,
    fontWeight: '700',
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rose + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.rose,
  },
  actionBtnPrimary: {
    flex: 2,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#000',
  },
  goldMuted: colors.goldMuted,
});

const goldMuted = colors.goldMuted;
