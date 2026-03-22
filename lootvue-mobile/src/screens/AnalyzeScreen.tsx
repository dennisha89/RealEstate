import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Search,
  Mic,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Shield,
  DollarSign,
  Building2,
} from 'lucide-react-native';

import { colors, spacing, fontSize, radius } from '../theme';
import { Card } from '../components/Card';
import { VerdictBadge } from '../components/VerdictBadge';
import { ScoreBar } from '../components/ScoreBar';
import { MetricRow } from '../components/MetricRow';
import { SectionLabel } from '../components/SectionLabel';
import { Divider } from '../components/Divider';
import { trendingAddresses, pipelineDeals } from '../data/mockData';

type AnalysisTab = 'summary' | 'financials' | 'risk' | 'market';

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

// Mock analysis result that would come from the API
const mockAnalysisResult = {
  address: '123 Main St, Austin, TX 78701',
  verdict: 'BUY' as const,
  score: 81,
  confidencePct: 87,
  // Financials
  purchasePrice: 385_000,
  downPayment: 77_000,
  monthlyMortgage: 1_940,
  monthlyRent: 2_200,
  monthlyExpenses: 550,
  monthlyCashFlow: 640,
  annualCashFlow: 7_680,
  capRate: 6.8,
  grm: 14.6,
  dscr: 1.32,
  cashOnCashReturn: 9.97,
  irr5yr: 14.2,
  irr10yr: 18.6,
  npv: 42_300,
  // Risk
  riskScore: 72,
  vacancyRisk: 'Low',
  liquidityRisk: 'Medium',
  marketRisk: 'Low',
  regulatoryRisk: 'Low',
  breakEvenVacancy: 34.2,
  breakEvenRate: 9.1,
  // Market
  marketScore: 88,
  monthsSupply: 1.8,
  permitGrowthPct: 22.4,
  medianRentGrowthPct: 4.8,
  employmentGrowthPct: 3.1,
  walkScore: 72,
  schoolRating: 8,
};

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryTab() {
  const deal = mockAnalysisResult;
  return (
    <View style={styles.tabContent}>
      <Card style={styles.verdictCard}>
        <View style={styles.verdictRow}>
          <View>
            <Text style={styles.verdictLabel}>Deal Verdict</Text>
            <VerdictBadge verdict={deal.verdict} size="lg" style={{ marginTop: spacing.xs }} />
          </View>
          <View style={styles.confidenceGroup}>
            <Text style={styles.confidencePct}>{deal.confidencePct}%</Text>
            <Text style={styles.confidenceLabel}>Confidence</Text>
          </View>
        </View>
        <View style={styles.scoreBarContainer}>
          <ScoreBar score={deal.score} />
        </View>
      </Card>
      <Card>
        <SectionLabel>Key Numbers</SectionLabel>
        <MetricRow
          label="Monthly Cash Flow"
          value={`+${formatCurrency(deal.monthlyCashFlow)}/mo`}
          trend="up"
          valueColor={colors.emerald}
        />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="Cap Rate"
          value={`${deal.capRate}%`}
          trend="up"
          valueColor={colors.emerald}
        />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="DSCR" value={`${deal.dscr}x`} trend="up" />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="Cash-on-Cash" value={`${deal.cashOnCashReturn}%`} trend="up" />
      </Card>
      <Card>
        <SectionLabel>Quick Checks</SectionLabel>
        {[
          { label: '1% Rule', pass: (deal.monthlyRent / deal.purchasePrice) * 100 >= 1, value: `${((deal.monthlyRent / deal.purchasePrice) * 100).toFixed(2)}%` },
          { label: 'Positive Cash Flow', pass: deal.monthlyCashFlow > 0, value: formatCurrency(deal.monthlyCashFlow) },
          { label: 'DSCR > 1.20', pass: deal.dscr >= 1.2, value: `${deal.dscr}x` },
          { label: 'Cap Rate > 5%', pass: deal.capRate >= 5, value: `${deal.capRate}%` },
        ].map((check, i) => (
          <View key={i} style={styles.checkRow}>
            {check.pass
              ? <CheckCircle size={16} color={colors.emerald} aria-hidden />
              : <XCircle size={16} color={colors.rose} aria-hidden />
            }
            <Text style={styles.checkLabel}>{check.label}</Text>
            <Text style={[styles.checkValue, { color: check.pass ? colors.emerald : colors.rose }]}>
              {check.value}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

function FinancialsTab() {
  const deal = mockAnalysisResult;
  return (
    <View style={styles.tabContent}>
      <Card>
        <SectionLabel>Purchase</SectionLabel>
        <MetricRow label="Purchase Price" value={formatCurrencyCompact(deal.purchasePrice)} />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="Down Payment (20%)" value={formatCurrencyCompact(deal.downPayment)} />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="Monthly Mortgage" value={formatCurrency(deal.monthlyMortgage)} />
      </Card>
      <Card>
        <SectionLabel>Monthly Income vs Expenses</SectionLabel>
        <MetricRow label="Monthly Rent" value={formatCurrency(deal.monthlyRent)} valueColor={colors.emerald} />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="Mortgage" value={`(${formatCurrency(deal.monthlyMortgage)})`} valueColor={colors.rose} />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="Operating Expenses" value={`(${formatCurrency(deal.monthlyExpenses)})`} valueColor={colors.rose} />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="Net Cash Flow"
          value={`+${formatCurrency(deal.monthlyCashFlow)}/mo`}
          trend="up"
          valueColor={colors.emerald}
        />
      </Card>
      <Card>
        <SectionLabel>Returns</SectionLabel>
        <MetricRow label="Cap Rate" value={`${deal.capRate}%`} trend="up" />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="Cash-on-Cash" value={`${deal.cashOnCashReturn}%`} trend="up" />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="5yr IRR" value={`${deal.irr5yr}%`} trend="up" />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="10yr IRR" value={`${deal.irr10yr}%`} trend="up" />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow label="NPV" value={formatCurrencyCompact(deal.npv)} trend="up" valueColor={colors.emerald} />
      </Card>
    </View>
  );
}

function RiskTab() {
  const deal = mockAnalysisResult;
  const riskItems = [
    { label: 'Vacancy Risk', value: deal.vacancyRisk, good: deal.vacancyRisk === 'Low' },
    { label: 'Liquidity Risk', value: deal.liquidityRisk, good: deal.liquidityRisk === 'Low' },
    { label: 'Market Risk', value: deal.marketRisk, good: deal.marketRisk === 'Low' },
    { label: 'Regulatory Risk', value: deal.regulatoryRisk, good: deal.regulatoryRisk === 'Low' },
  ];

  const riskColor = (good: boolean) => (good ? colors.emerald : colors.amber);

  return (
    <View style={styles.tabContent}>
      <Card>
        <View style={styles.riskScoreHeader}>
          <Shield size={20} color={colors.gold} aria-hidden />
          <Text style={styles.riskScoreTitle}>Risk Score</Text>
          <ScoreBar score={deal.riskScore} showLabel style={{ flex: 1 }} />
        </View>
      </Card>
      <Card>
        <SectionLabel>Risk Dimensions</SectionLabel>
        {riskItems.map((item, i) => (
          <React.Fragment key={i}>
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>{item.label}</Text>
              <View style={[styles.riskBadge, { backgroundColor: riskColor(item.good) + '20' }]}>
                <Text style={[styles.riskBadgeText, { color: riskColor(item.good) }]}>
                  {item.value}
                </Text>
              </View>
            </View>
            {i < riskItems.length - 1 && <Divider style={{ marginVertical: spacing.xs }} />}
          </React.Fragment>
        ))}
      </Card>
      <Card>
        <SectionLabel>Break-Even Analysis</SectionLabel>
        <MetricRow
          label="Break-even Vacancy"
          value={`${deal.breakEvenVacancy}%`}
          subValue="current 5%"
        />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="Break-even Rate"
          value={`${deal.breakEvenRate}%`}
          subValue="current 6.85%"
        />
        <View style={styles.riskNote}>
          <AlertCircle size={13} color={colors.amber} aria-hidden />
          <Text style={styles.riskNoteText}>
            Vacancy could triple before going negative. Comfortable margin.
          </Text>
        </View>
      </Card>
    </View>
  );
}

function MarketTab() {
  const deal = mockAnalysisResult;
  return (
    <View style={styles.tabContent}>
      <Card>
        <SectionLabel>Market Score</SectionLabel>
        <ScoreBar score={deal.marketScore} />
        <View style={styles.marketTagline}>
          <Text style={styles.marketTaglineText}>
            Austin is supply-constrained. Builders are betting — permits up 22%.
          </Text>
        </View>
      </Card>
      <Card>
        <SectionLabel>Supply / Demand</SectionLabel>
        <MetricRow
          label="Months of Supply"
          value={`${deal.monthsSupply} mo`}
          trend="down"
          valueColor={colors.emerald}
        />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="Permit Growth (YoY)"
          value={`+${deal.permitGrowthPct}%`}
          trend="up"
        />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="Rent Growth (YoY)"
          value={`+${deal.medianRentGrowthPct}%`}
          trend="up"
          valueColor={colors.emerald}
        />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="Employment Growth"
          value={`+${deal.employmentGrowthPct}%`}
          trend="up"
        />
      </Card>
      <Card>
        <SectionLabel>Location Quality</SectionLabel>
        <MetricRow label="Walk Score" value={`${deal.walkScore}/100`} />
        <Divider style={{ marginVertical: spacing.xs }} />
        <MetricRow
          label="School Rating"
          value={`${deal.schoolRating}/10`}
          valueColor={deal.schoolRating >= 7 ? colors.emerald : colors.amber}
        />
      </Card>
    </View>
  );
}

export function AnalyzeScreen() {
  const [address, setAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('summary');

  const handleAnalyze = () => {
    if (!address.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setShowResults(false);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 1800);
  };

  const handleMic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const tabs: { key: AnalysisTab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'financials', label: 'Financials' },
    { key: 'risk', label: 'Risk' },
    { key: 'market', label: 'Market' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analyze</Text>
        <Text style={styles.headerSub}>Get a 10-second verdict</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, showResults && styles.searchBarActive]}>
          <Search size={16} color={colors.gold} aria-hidden />
          <TextInput
            style={styles.searchInput}
            placeholder="Address, city, or ZIP..."
            placeholderTextColor={colors.textDisabled}
            value={address}
            onChangeText={setAddress}
            returnKeyType="search"
            onSubmitEditing={handleAnalyze}
            clearButtonMode="while-editing"
            accessibilityLabel="Property address to analyze"
          />
          <Pressable
            onPress={handleMic}
            style={styles.micBtn}
            accessibilityRole="button"
            accessibilityLabel="Voice input"
          >
            <Mic size={16} color={colors.textDisabled} aria-hidden />
          </Pressable>
        </View>
        {address.trim().length > 3 && !isAnalyzing && !showResults && (
          <Pressable
            style={styles.analyzeBtn}
            onPress={handleAnalyze}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.gold, colors.goldLight]}
              style={styles.analyzeBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.analyzeBtnText}>Analyze</Text>
              <ArrowRight size={15} color="#000" aria-hidden />
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Loading State */}
      {isAnalyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.gold} size="small" />
          <Text style={styles.loadingText}>Running 12 engines...</Text>
          <View style={styles.loadingSteps}>
            {['Market data', 'Comp analysis', 'Cash flow model', 'Risk assessment'].map(
              (step, i) => (
                <Text key={i} style={styles.loadingStep}>
                  {step}
                </Text>
              )
            )}
          </View>
        </View>
      )}

      {/* Results */}
      {showResults && (
        <View style={styles.resultsWrapper}>
          {/* Tabs */}
          <View style={styles.tabBar}>
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                label={tab.label}
                active={activeTab === tab.key}
                onPress={() => setActiveTab(tab.key)}
              />
            ))}
          </View>
          <ScrollView
            style={styles.tabScrollView}
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'summary' && <SummaryTab />}
            {activeTab === 'financials' && <FinancialsTab />}
            {activeTab === 'risk' && <RiskTab />}
            {activeTab === 'market' && <MarketTab />}
            <View style={{ height: 80 }} />
          </ScrollView>
        </View>
      )}

      {/* Empty state — trending deals when no address entered */}
      {!isAnalyzing && !showResults && (
        <ScrollView
          style={styles.emptyScroll}
          contentContainerStyle={styles.emptyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>Trending Deals</SectionLabel>
          {trendingAddresses.map((item, index) => (
            <Card
              key={index}
              style={styles.trendingCard}
              onPress={() => {
                setAddress(item.address + ', ' + item.city);
              }}
            >
              <View style={styles.trendingCardRow}>
                <View style={styles.trendingCardLeft}>
                  <Building2 size={14} color={colors.gold} aria-hidden />
                  <View style={{ marginLeft: spacing.sm }}>
                    <Text style={styles.trendingCardAddress}>{item.address}</Text>
                    <Text style={styles.trendingCardCity}>{item.city}</Text>
                  </View>
                </View>
                <View style={styles.trendingCardRight}>
                  <Text style={[styles.trendingCardScore, {
                    color: item.score >= 75 ? colors.emerald : item.score >= 55 ? colors.amber : colors.rose
                  }]}>
                    {item.score}
                  </Text>
                  <Text style={styles.trendingCardCap}>{item.capRate}% cap</Text>
                </View>
              </View>
            </Card>
          ))}

          <SectionLabel style={{ marginTop: spacing.xl }}>Recent Analyses</SectionLabel>
          {pipelineDeals.slice(0, 3).map((deal) => (
            <Card
              key={deal.id}
              style={styles.recentCard}
              onPress={() => setAddress(deal.address + ', ' + deal.city)}
            >
              <View style={styles.recentRow}>
                <View style={styles.recentLeft}>
                  <Text style={styles.recentAddress}>{deal.address}</Text>
                  <Text style={styles.recentCity}>{deal.city}</Text>
                </View>
                <VerdictBadge verdict={deal.verdict} size="sm" />
              </View>
            </Card>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
  },
  searchBarActive: {
    borderColor: colors.gold + '60',
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  micBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtn: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  analyzeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
  },
  analyzeBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#000',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  loadingSteps: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  loadingStep: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
  // Results
  resultsWrapper: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderColor: colors.gold + '50',
    backgroundColor: colors.goldMuted,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.gold,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.lg,
  },
  tabContent: {
    gap: spacing.md,
  },
  // Verdict
  verdictCard: {},
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  verdictLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  confidenceGroup: {
    alignItems: 'flex-end',
  },
  confidencePct: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: 'monospace',
  },
  confidenceLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  scoreBarContainer: {
    marginTop: spacing.sm,
  },
  // Checks
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  checkValue: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  // Risk
  riskScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  riskScoreTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    width: 70,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  riskLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  riskBadge: {
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  riskBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  riskNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.amber + '10',
    borderRadius: radius.sm,
  },
  riskNoteText: {
    fontSize: fontSize.xs,
    color: colors.amber,
    flex: 1,
    lineHeight: 16,
  },
  // Market tab
  marketTagline: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.emerald + '10',
    borderRadius: radius.sm,
  },
  marketTaglineText: {
    fontSize: fontSize.sm,
    color: colors.emerald,
    lineHeight: 18,
  },
  // Empty state
  emptyScroll: {
    flex: 1,
  },
  emptyScrollContent: {
    paddingHorizontal: spacing.lg,
  },
  trendingCard: {
    marginBottom: spacing.sm,
  },
  trendingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trendingCardAddress: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trendingCardCity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trendingCardRight: {
    alignItems: 'flex-end',
  },
  trendingCardScore: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  trendingCardCap: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  recentCard: {
    marginBottom: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  recentAddress: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recentCity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  goldMuted: colors.goldMuted,
});

// Re-export colors.goldMuted so styles don't reference outside
const goldMuted = colors.goldMuted;
