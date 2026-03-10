import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useLoyalty, TIER_THRESHOLDS } from '@/context/LoyaltyContext';
import type { LoyaltyTransaction } from '@/types';

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

const TIER_ICONS: Record<string, string> = {
  bronze: 'shield-outline',
  silver: 'shield-half-full',
  gold: 'shield-star',
  platinum: 'shield-crown',
};

const EARN_OPTIONS = [
  { icon: 'cart-outline', label: 'Place an Order', desc: 'Earn 2 pts per \u20B91 spent', points: '2 pts/\u20B91' },
  { icon: 'account-plus-outline', label: 'Refer a Friend', desc: 'Earn when they place first order', points: '100 pts' },
  { icon: 'star-outline', label: 'Write a Review', desc: 'Review any product you purchased', points: '20 pts' },
  { icon: 'calendar-check-outline', label: 'Daily Check-in', desc: 'Check in daily for streak bonuses', points: '5–50 pts' },
];

const REDEEM_OPTIONS = [
  { icon: 'ticket-percent-outline', points: 100, label: '\u20B910 Off', desc: 'Discount on your next order' },
  { icon: 'ticket-percent-outline', points: 250, label: '\u20B930 Off', desc: 'Bigger savings on your order' },
  { icon: 'ticket-percent-outline', points: 500, label: '\u20B960 Off', desc: 'Major discount coupon' },
  { icon: 'truck-delivery-outline', points: 1000, label: 'Free Delivery x5', desc: '5 free delivery vouchers' },
];

const TIER_BENEFITS = [
  { tier: 'Bronze', color: '#CD7F32', benefits: ['Earn 2 pts/\u20B91', 'Birthday bonus 50 pts'] },
  { tier: 'Silver', color: '#C0C0C0', benefits: ['All Bronze perks', 'Earn 3 pts/\u20B91', 'Exclusive offers'] },
  { tier: 'Gold', color: '#FFD700', benefits: ['All Silver perks', 'Earn 4 pts/\u20B91', 'Priority support', 'Free delivery 2x/mo'] },
  { tier: 'Platinum', color: '#E5E4E2', benefits: ['All Gold perks', 'Earn 5 pts/\u20B91', 'Early access to sales', 'Free delivery unlimited'] },
];

const TX_ICONS: Record<string, string> = {
  earned: 'arrow-down-circle',
  redeemed: 'arrow-up-circle',
  bonus: 'gift-outline',
  expired: 'clock-alert-outline',
};

const TX_COLORS: Record<string, string> = {
  earned: COLORS.green,
  redeemed: COLORS.status.error,
  bonus: '#7B1FA2',
  expired: COLORS.text.muted,
};

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LoyaltyScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const {
    loyalty,
    checkIn,
    dailyCheckIn,
    redeemPoints,
    getTier,
    getPointsToNextTier,
  } = useLoyalty();

  const [activeTab, setActiveTab] = useState<'earn' | 'redeem'>('earn');

  const tier = getTier();
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze;
  const tierIcon = TIER_ICONS[tier] || TIER_ICONS.bronze;
  const pointsToNext = getPointsToNextTier();

  // Progress bar calculation
  const tierKeys = Object.keys(TIER_THRESHOLDS) as (keyof typeof TIER_THRESHOLDS)[];
  const currentTierIdx = tierKeys.indexOf(tier as keyof typeof TIER_THRESHOLDS);
  const currentThreshold = TIER_THRESHOLDS[tierKeys[currentTierIdx]];
  const nextThreshold = currentTierIdx < tierKeys.length - 1
    ? TIER_THRESHOLDS[tierKeys[currentTierIdx + 1]]
    : TIER_THRESHOLDS[tierKeys[currentTierIdx]];
  const progress = nextThreshold > currentThreshold
    ? Math.min((loyalty.totalEarned - currentThreshold) / (nextThreshold - currentThreshold), 1)
    : 1;

  const handleCheckIn = async () => {
    const result = await dailyCheckIn();
    if (result.success) {
      Alert.alert('Check-in Successful!', `You earned ${result.points} points!\nStreak: ${result.streak} day${result.streak > 1 ? 's' : ''}`);
    } else {
      Alert.alert('Already Checked In', 'Come back tomorrow for your next reward!');
    }
  };

  const handleRedeem = async (points: number, label: string) => {
    if (loyalty.currentBalance < points) {
      Alert.alert('Insufficient Points', `You need ${points - loyalty.currentBalance} more points to redeem this reward.`);
      return;
    }
    Alert.alert('Redeem Reward', `Spend ${points} points for ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: async () => {
          const success = await redeemPoints(points, `Redeemed: ${label}`);
          if (success) {
            Alert.alert('Redeemed!', `${label} has been added to your account.`);
          }
        },
      },
    ]);
  };

  const renderTransaction = ({ item }: { item: LoyaltyTransaction }) => {
    const iconName = TX_ICONS[item.type] || 'circle-outline';
    const iconColor = TX_COLORS[item.type] || COLORS.text.muted;
    const isPositive = item.type === 'earned' || item.type === 'bonus';

    return (
      <View style={[styles.txCard, themed.card]}>
        <View style={[styles.txIcon, { backgroundColor: iconColor + '15' }]}>
          <Icon name={iconName as any} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.txTitle, themed.textPrimary]}>{item.description}</Text>
          <Text style={[styles.txDate, themed.textMuted]}>{formatDate(item.date)}</Text>
        </View>
        <Text style={[styles.txPoints, { color: isPositive ? COLORS.green : COLORS.status.error }]}>
          {isPositive ? '+' : '-'}{item.points}
        </Text>
      </View>
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const alreadyCheckedIn = checkIn.lastCheckIn === today;

  const ListHeader = () => (
    <>
      {/* Hero Card */}
      <View style={styles.heroWrapper}>
        <LinearGradient colors={[tierColor + 'DD', tierColor + '99']} style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.tierBadge}>
              <Icon name={tierIcon as any} size={28} color={tierColor} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.heroTierLabel}>{tier.charAt(0).toUpperCase() + tier.slice(1)} Member</Text>
              <Text style={styles.heroPoints}>{loyalty.currentBalance.toLocaleString()}</Text>
              <Text style={styles.heroPointsLabel}>Available Points</Text>
            </View>
          </View>

          {/* Progress to next tier */}
          {currentTierIdx < tierKeys.length - 1 ? (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {pointsToNext} pts to {tierKeys[currentTierIdx + 1].charAt(0).toUpperCase() + tierKeys[currentTierIdx + 1].slice(1)}
              </Text>
            </View>
          ) : (
            <Text style={styles.progressText}>You've reached the highest tier!</Text>
          )}

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{loyalty.totalEarned.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>Total Earned</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{loyalty.totalRedeemed.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>Redeemed</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Daily Check-in Section */}
      <View style={[styles.sectionCard, themed.card]}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-check" size={20} color={COLORS.primary} />
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Daily Check-in</Text>
          <View style={styles.streakBadge}>
            <Icon name="fire" size={14} color="#FF6B35" />
            <Text style={styles.streakText}>{checkIn.currentStreak} day streak</Text>
          </View>
        </View>

        <View style={styles.checkInRow}>
          {checkIn.rewards.map((reward, index) => {
            const isClaimed = reward.claimed;
            const isToday = !alreadyCheckedIn && index === (checkIn.currentStreak % 7);
            return (
              <View key={index} style={styles.checkInDay}>
                <View
                  style={[
                    styles.checkInCircle,
                    isClaimed && styles.checkInCircleClaimed,
                    isToday && styles.checkInCircleToday,
                  ]}
                >
                  {isClaimed ? (
                    <Icon name="check" size={16} color="#FFF" />
                  ) : (
                    <Text style={[styles.checkInPoints, isToday && { color: COLORS.primary }]}>
                      {reward.points}
                    </Text>
                  )}
                </View>
                <Text style={[styles.checkInDayLabel, themed.textMuted]}>Day {reward.day}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.checkInBtn, alreadyCheckedIn && styles.checkInBtnDisabled]}
          onPress={handleCheckIn}
          disabled={alreadyCheckedIn}
        >
          <Icon name={alreadyCheckedIn ? 'check-circle' : 'hand-pointing-up'} size={18} color="#FFF" />
          <Text style={styles.checkInBtnText}>
            {alreadyCheckedIn ? 'Checked In Today' : 'Check In'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Earn & Redeem Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earn' && styles.tabActive]}
          onPress={() => setActiveTab('earn')}
        >
          <Icon name="plus-circle-outline" size={18} color={activeTab === 'earn' ? COLORS.primary : COLORS.text.muted} />
          <Text style={[styles.tabText, activeTab === 'earn' && styles.tabTextActive]}>Earn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'redeem' && styles.tabActive]}
          onPress={() => setActiveTab('redeem')}
        >
          <Icon name="gift-outline" size={18} color={activeTab === 'redeem' ? COLORS.primary : COLORS.text.muted} />
          <Text style={[styles.tabText, activeTab === 'redeem' && styles.tabTextActive]}>Redeem</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'earn' ? (
        <View style={[styles.sectionCard, themed.card]}>
          {EARN_OPTIONS.map((opt, i) => (
            <View key={i} style={[styles.optionRow, i < EARN_OPTIONS.length - 1 && styles.optionDivider]}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryLight + '20' }]}>
                <Icon name={opt.icon as any} size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, themed.textPrimary]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, themed.textMuted]}>{opt.desc}</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{opt.points}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.sectionCard, themed.card]}>
          {REDEEM_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.optionRow, i < REDEEM_OPTIONS.length - 1 && styles.optionDivider]}
              onPress={() => handleRedeem(opt.points, opt.label)}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#FF980020' }]}>
                <Icon name={opt.icon as any} size={22} color="#FF9800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, themed.textPrimary]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, themed.textMuted]}>{opt.desc}</Text>
              </View>
              <View style={[styles.redeemBadge, loyalty.currentBalance < opt.points && { opacity: 0.4 }]}>
                <Text style={styles.redeemBadgeText}>{opt.points} pts</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tier Benefits */}
      <View style={[styles.sectionCard, themed.card]}>
        <View style={styles.sectionHeader}>
          <Icon name="crown-outline" size={20} color={COLORS.accent} />
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Tier Benefits</Text>
        </View>
        {TIER_BENEFITS.map((t, i) => (
          <View key={i} style={[styles.tierRow, i < TIER_BENEFITS.length - 1 && styles.optionDivider]}>
            <View style={[styles.tierDot, { backgroundColor: t.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierName, themed.textPrimary, tier === t.tier.toLowerCase() && { color: t.color, fontWeight: '800' }]}>
                {t.tier} {tier === t.tier.toLowerCase() ? '(You)' : ''}
              </Text>
              {t.benefits.map((b, j) => (
                <View key={j} style={styles.benefitRow}>
                  <Icon name="check-circle-outline" size={13} color={t.color} />
                  <Text style={[styles.benefitText, themed.textSecondary]}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Transaction History Header */}
      <Text style={[styles.historyTitle, themed.textPrimary]}>Transaction History</Text>
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Loyalty Rewards</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={loyalty.history}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="star-outline" size={48} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  list: { paddingBottom: 40 },

  // Hero Card
  heroWrapper: { marginHorizontal: SPACING.base, marginTop: SPACING.sm, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.md },
  heroCard: { padding: SPACING.xl },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  tierBadge: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', ...SHADOW.sm,
  },
  heroTierLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  heroPoints: { fontSize: 34, fontWeight: '800', color: '#FFF', marginTop: 2 },
  heroPointsLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: -2 },
  progressSection: { marginTop: SPACING.md },
  progressBarBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: RADIUS.full, overflow: 'hidden',
  },
  progressBarFill: { height: 8, backgroundColor: '#FFF', borderRadius: RADIUS.full },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },
  heroStatsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: SPACING.md, marginTop: SPACING.md,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Section Card
  sectionCard: {
    marginHorizontal: SPACING.base, marginTop: SPACING.md,
    backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, flex: 1 },

  // Check-in
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  streakText: { fontSize: 11, fontWeight: '700', color: '#FF6B35' },
  checkInRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  checkInDay: { alignItems: 'center', gap: 4 },
  checkInCircle: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  checkInCircleClaimed: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkInCircleToday: { borderColor: COLORS.primary, borderWidth: 2.5 },
  checkInPoints: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  checkInDayLabel: { fontSize: 9, color: COLORS.text.muted },
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  checkInBtnDisabled: { backgroundColor: COLORS.text.muted },
  checkInBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: SPACING.base, marginTop: SPACING.md,
    backgroundColor: '#FFF', borderRadius: RADIUS.md, ...SHADOW.sm, overflow: 'hidden',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: SPACING.md, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.text.muted },
  tabTextActive: { color: COLORS.primary },

  // Earn / Redeem options
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: SPACING.md },
  optionDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  optionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  optionDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  pointsBadge: {
    backgroundColor: COLORS.backgroundSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  pointsBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  redeemBadge: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  redeemBadgeText: { fontSize: 11, fontWeight: '700', color: '#FF9800' },

  // Tier Benefits
  tierRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: SPACING.md },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  tierName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  benefitText: { fontSize: 11, color: COLORS.text.secondary },

  // Transaction History
  historyTitle: {
    fontSize: 15, fontWeight: '800', color: COLORS.text.primary,
    marginHorizontal: SPACING.base, marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base,
    marginHorizontal: SPACING.base, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  txDate: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  txPoints: { fontSize: 15, fontWeight: '800' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: 8 },
});
