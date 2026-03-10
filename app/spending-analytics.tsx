import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BAR_COLORS = ['#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9'];

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: '#4CAF50',
  Fruits: '#FF9800',
  'Leafy Greens': '#2E7D32',
  Herbs: '#66BB6A',
  Exotics: '#7B1FA2',
  Salads: '#00897B',
  Roots: '#795548',
  Other: '#607D8B',
};

const CATEGORY_ICONS: Record<string, string> = {
  Vegetables: 'carrot',
  Fruits: 'fruit-watermelon',
  'Leafy Greens': 'leaf',
  Herbs: 'sprout',
  Exotics: 'star-circle',
  Salads: 'bowl-mix',
  Roots: 'seed',
  Other: 'food-variant',
};

function formatCurrency(amount: number): string {
  return `\u20B9${Math.round(amount).toLocaleString('en-IN')}`;
}

export default function SpendingAnalyticsScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { orders } = useOrders();

  const analytics = useMemo(() => {
    const deliveredOrders = orders.filter(o => o.status !== 'cancelled');

    // --- Summary ---
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalSaved = deliveredOrders.reduce((sum, o) => sum + o.discount, 0);
    const totalOrders = deliveredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // --- Monthly spending (last 6 months) ---
    const now = new Date();
    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }

    deliveredOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthlyMap) {
        monthlyMap[key] += o.total;
      }
    });

    const monthlySpending = Object.entries(monthlyMap).map(([key, amount]) => {
      const [year, month] = key.split('-');
      return { month: `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year.slice(2)}`, amount };
    });
    const maxMonthly = Math.max(...monthlySpending.map(m => m.amount), 1);

    // --- Category breakdown ---
    const categoryMap: Record<string, number> = {};
    deliveredOrders.forEach(o => {
      o.items.forEach(item => {
        // Derive category from item name heuristics or default to 'Other'
        const cat = guessCategoryFromName(item.name);
        categoryMap[cat] = (categoryMap[cat] || 0) + item.price * item.quantity;
      });
    });

    const totalCategorySpend = Object.values(categoryMap).reduce((s, v) => s + v, 0) || 1;
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalCategorySpend) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // --- Top ordered items ---
    const itemMap: Record<string, { name: string; count: number; totalSpent: number }> = {};
    deliveredOrders.forEach(o => {
      o.items.forEach(item => {
        const key = item.name.toLowerCase();
        if (!itemMap[key]) {
          itemMap[key] = { name: item.name, count: 0, totalSpent: 0 };
        }
        itemMap[key].count += item.quantity;
        itemMap[key].totalSpent += item.price * item.quantity;
      });
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // --- Savings breakdown ---
    const totalDiscounts = deliveredOrders.reduce((sum, o) => sum + o.discount, 0);
    const freeDeliverySavings = deliveredOrders.filter(o => o.deliveryFee === 0).length * 30; // estimated avg delivery fee
    const couponSavings = deliveredOrders
      .filter(o => o.couponCode)
      .reduce((sum, o) => sum + o.discount, 0);

    // --- Subscription savings ---
    const subscriptionOrders = deliveredOrders.filter(o => o.subscription);
    const subscriptionDeliverySavings = subscriptionOrders.length * 30; // free delivery per subscription order

    return {
      totalSpent,
      totalSaved,
      totalOrders,
      avgOrderValue,
      monthlySpending,
      maxMonthly,
      categoryBreakdown,
      topItems,
      totalDiscounts,
      freeDeliverySavings,
      couponSavings,
      subscriptionOrders: subscriptionOrders.length,
      subscriptionDeliverySavings,
    };
  }, [orders]);

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Spending Analytics</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="cash-multiple"
            label="Total Spent"
            value={formatCurrency(analytics.totalSpent)}
            color={COLORS.primary}
            themed={themed}
          />
          <SummaryCard
            icon="piggy-bank-outline"
            label="Total Saved"
            value={formatCurrency(analytics.totalSaved)}
            color={COLORS.status.success}
            themed={themed}
          />
        </View>
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="chart-line"
            label="Avg Order"
            value={formatCurrency(analytics.avgOrderValue)}
            color={COLORS.status.info}
            themed={themed}
          />
          <SummaryCard
            icon="package-variant-closed"
            label="Total Orders"
            value={String(analytics.totalOrders)}
            color={COLORS.accent}
            themed={themed}
          />
        </View>

        {/* Monthly Spending */}
        <View style={[styles.section, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="chart-bar" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Monthly Spending</Text>
          </View>
          <Text style={[styles.sectionSub, themed.textMuted]}>Last 6 months</Text>

          {analytics.monthlySpending.map((m, i) => (
            <View key={m.month} style={styles.barRow}>
              <Text style={[styles.barLabel, themed.textSecondary]}>{m.month}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max((m.amount / analytics.maxMonthly) * 100, 2)}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, themed.textPrimary]}>{formatCurrency(m.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Category Breakdown */}
        {analytics.categoryBreakdown.length > 0 && (
          <View style={[styles.section, themed.card]}>
            <View style={styles.sectionHeader}>
              <Icon name="shape" size={20} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Category Breakdown</Text>
            </View>

            {analytics.categoryBreakdown.map(cat => {
              const color = CATEGORY_COLORS[cat.category] || COLORS.primary;
              const iconName = CATEGORY_ICONS[cat.category] || 'food-variant';
              return (
                <View key={cat.category} style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: color + '15' }]}>
                    <Icon name={iconName as any} size={18} color={color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryLabelRow}>
                      <Text style={[styles.categoryName, themed.textPrimary]}>{cat.category}</Text>
                      <Text style={[styles.categoryAmount, themed.textSecondary]}>
                        {formatCurrency(cat.amount)} ({Math.round(cat.percentage)}%)
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[styles.progressFill, { width: `${cat.percentage}%`, backgroundColor: color }]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Top Ordered Items */}
        {analytics.topItems.length > 0 && (
          <View style={[styles.section, themed.card]}>
            <View style={styles.sectionHeader}>
              <Icon name="trophy-outline" size={20} color={COLORS.accent} />
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Top Ordered Items</Text>
            </View>

            {analytics.topItems.map((item, i) => (
              <View key={item.name} style={[styles.topItemRow, i < analytics.topItems.length - 1 && styles.topItemBorder]}>
                <View style={styles.topItemRank}>
                  <Text style={styles.topItemRankText}>{i + 1}</Text>
                </View>
                <View style={styles.topItemInfo}>
                  <Text style={[styles.topItemName, themed.textPrimary]}>{item.name}</Text>
                  <Text style={[styles.topItemMeta, themed.textMuted]}>
                    Ordered {item.count} time{item.count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={[styles.topItemSpent, { color: COLORS.primary }]}>
                  {formatCurrency(item.totalSpent)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Savings Summary */}
        <View style={[styles.section, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="tag-heart-outline" size={20} color={COLORS.status.success} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Savings Summary</Text>
          </View>

          <SavingsRow icon="sale" label="Total Discounts" amount={analytics.totalDiscounts} themed={themed} />
          <SavingsRow icon="truck-fast-outline" label="Free Delivery Savings" amount={analytics.freeDeliverySavings} themed={themed} />
          <SavingsRow icon="ticket-percent-outline" label="Coupon Savings" amount={analytics.couponSavings} themed={themed} />

          <View style={styles.totalSavingsCard}>
            <LinearGradient colors={[COLORS.primaryLight + '30', COLORS.primary + '15']} style={styles.totalSavingsGradient}>
              <Icon name="piggy-bank" size={28} color={COLORS.status.success} />
              <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                <Text style={[styles.totalSavingsLabel, themed.textSecondary]}>You've saved a total of</Text>
                <Text style={styles.totalSavingsValue}>{formatCurrency(analytics.totalSaved)}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Subscription Savings */}
        {analytics.subscriptionOrders > 0 && (
          <View style={[styles.section, themed.card]}>
            <View style={styles.sectionHeader}>
              <Icon name="autorenew" size={20} color={COLORS.status.info} />
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Subscription Savings</Text>
            </View>

            <View style={styles.subSavingsCard}>
              <LinearGradient colors={['#E3F2FD', '#BBDEFB40']} style={styles.subSavingsGradient}>
                <View style={styles.subSavingsRow}>
                  <View style={styles.subSavingsIconBox}>
                    <Icon name="truck-delivery-outline" size={24} color={COLORS.status.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subSavingsLabel, themed.textPrimary]}>Delivery Fee Savings</Text>
                    <Text style={[styles.subSavingsMeta, themed.textSecondary]}>
                      {analytics.subscriptionOrders} subscription delivery{analytics.subscriptionOrders !== 1 ? 'ies' : 'y'}
                    </Text>
                  </View>
                  <Text style={styles.subSavingsAmount}>
                    {formatCurrency(analytics.subscriptionDeliverySavings)}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <Text style={[styles.subSavingsHint, themed.textMuted]}>
              Subscribe to save on delivery with every order!
            </Text>
          </View>
        )}

        {/* Empty state */}
        {analytics.totalOrders === 0 && (
          <View style={styles.emptyState}>
            <Icon name="chart-areaspline" size={64} color={COLORS.border} />
            <Text style={[styles.emptyTitle, themed.textPrimary]}>No Orders Yet</Text>
            <Text style={[styles.emptyDesc, themed.textMuted]}>
              Place your first order to see spending analytics here.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.emptyBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Helper Components ─── */

function SummaryCard({ icon, label, value, color, themed }: {
  icon: string; label: string; value: string; color: string; themed: ReturnType<typeof useThemedStyles>;
}) {
  return (
    <View style={[styles.summaryCard, themed.card]}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '15' }]}>
        <Icon name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.summaryValue, themed.textPrimary]}>{value}</Text>
      <Text style={[styles.summaryLabel, themed.textMuted]}>{label}</Text>
    </View>
  );
}

function SavingsRow({ icon, label, amount, themed }: {
  icon: string; label: string; amount: number; themed: ReturnType<typeof useThemedStyles>;
}) {
  return (
    <View style={styles.savingsRow}>
      <Icon name={icon as any} size={20} color={COLORS.status.success} />
      <Text style={[styles.savingsLabel, themed.textSecondary]}>{label}</Text>
      <Text style={[styles.savingsAmount, { color: COLORS.status.success }]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

/* ─── Category Guesser ─── */

function guessCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  const fruitKeywords = ['apple', 'banana', 'mango', 'orange', 'grape', 'papaya', 'pineapple', 'watermelon', 'pomegranate', 'kiwi', 'guava', 'berry', 'strawberry', 'fig', 'lemon', 'lime', 'pear', 'peach', 'plum', 'cherry', 'coconut', 'melon', 'jackfruit', 'custard apple', 'sapota', 'chikoo', 'litchi'];
  const leafyKeywords = ['spinach', 'palak', 'methi', 'fenugreek', 'amaranth', 'lettuce', 'kale', 'coriander', 'mint', 'pudina', 'cabbage', 'spring onion'];
  const herbKeywords = ['basil', 'thyme', 'rosemary', 'dill', 'parsley', 'curry leaves', 'bay leaf', 'lemongrass'];
  const saladKeywords = ['salad', 'cucumber', 'lettuce', 'cherry tomato', 'bell pepper', 'capsicum', 'avocado'];
  const rootKeywords = ['potato', 'carrot', 'beetroot', 'radish', 'turnip', 'sweet potato', 'yam', 'ginger', 'garlic', 'turmeric', 'onion'];
  const exoticKeywords = ['zucchini', 'asparagus', 'broccoli', 'artichoke', 'celery', 'leek', 'bok choy', 'exotic', 'mushroom', 'baby corn'];

  if (fruitKeywords.some(k => lower.includes(k))) return 'Fruits';
  if (leafyKeywords.some(k => lower.includes(k))) return 'Leafy Greens';
  if (herbKeywords.some(k => lower.includes(k))) return 'Herbs';
  if (saladKeywords.some(k => lower.includes(k))) return 'Salads';
  if (rootKeywords.some(k => lower.includes(k))) return 'Roots';
  if (exoticKeywords.some(k => lower.includes(k))) return 'Exotics';

  const vegKeywords = ['tomato', 'cauliflower', 'peas', 'beans', 'gourd', 'eggplant', 'brinjal', 'okra', 'bhindi', 'lady finger', 'pumpkin', 'drumstick', 'ridge gourd', 'bottle gourd', 'bitter gourd', 'tinda', 'parwal', 'ivy gourd', 'cluster beans', 'taro', 'colocasia', 'raw banana', 'green chilli', 'chili'];
  if (vegKeywords.some(k => lower.includes(k))) return 'Vegetables';

  return 'Vegetables';
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Section
  section: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    ...SHADOW.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: SPACING.md,
  },

  // Bar chart
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  barLabel: {
    width: 50,
    fontSize: 12,
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginHorizontal: SPACING.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
    minWidth: 4,
  },
  barValue: {
    width: 65,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Category
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  // Top items
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  topItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  topItemRankText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  topItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  topItemSpent: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Savings
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  savingsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  savingsAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalSavingsCard: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  totalSavingsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
  },
  totalSavingsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalSavingsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.status.success,
  },

  // Subscription savings
  subSavingsCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  subSavingsGradient: {
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
  },
  subSavingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subSavingsIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: '#1E88E520',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  subSavingsLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  subSavingsMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  subSavingsAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.status.info,
  },
  subSavingsHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.base,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xxl,
  },
  emptyBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  emptyBtnText: {
    color: COLORS.text.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
