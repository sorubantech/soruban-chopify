import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useWallet } from '@/context/WalletContext';
import type { WalletTransaction } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  refund: 'cash-refund',
  payment: 'arrow-up-circle',
  cashback: 'star-circle',
  bonus: 'gift-outline',
  topup: 'wallet-plus',
};

const CATEGORY_COLORS: Record<string, string> = {
  refund: '#1565C0',
  payment: COLORS.primary,
  cashback: '#F57C00',
  bonus: '#7B1FA2',
  topup: COLORS.green,
};

function formatTxDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

export default function WalletScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { balance, transactions } = useWallet();

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const iconName = item.type === 'credit'
      ? (CATEGORY_ICONS[item.category] || 'arrow-down-circle')
      : 'arrow-up-circle';
    const iconColor = item.type === 'credit'
      ? (CATEGORY_COLORS[item.category] || COLORS.green)
      : COLORS.primary;
    const bgColor = iconColor + '15';

    return (
      <View style={[styles.txCard, themed.card]}>
        <View style={[styles.txIcon, { backgroundColor: bgColor }]}>
          <Icon name={iconName as any} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txTitle}>{item.title}</Text>
          <Text style={styles.txDesc}>{item.description}</Text>
          <Text style={styles.txDate}>{formatTxDate(item.date)}</Text>
        </View>
        <Text style={[styles.txAmount, { color: item.type === 'credit' ? COLORS.green : COLORS.status.error }]}>
          {item.type === 'credit' ? '+' : '-'}{'\u20B9'}{item.amount}
        </Text>
      </View>
    );
  };

  const refundTxns = transactions.filter(t => t.category === 'refund');
  const paymentTxns = transactions.filter(t => t.category === 'payment');

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Wallet</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <LinearGradient colors={['#388E3C', '#4CAF50']} style={styles.balanceGrad}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>{'\u20B9'}{balance}</Text>
          <View style={styles.balanceStatsRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{refundTxns.length}</Text>
              <Text style={styles.balanceStatLabel}>Refunds</Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{paymentTxns.length}</Text>
              <Text style={styles.balanceStatLabel}>Payments</Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{transactions.length}</Text>
              <Text style={styles.balanceStatLabel}>Total Txns</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* How wallet works */}
      <View style={[styles.infoCard, themed.card]}>
        <View style={styles.infoRow}>
          <Icon name="information-outline" size={16} color="#1565C0" />
          <Text style={styles.infoText}>Wallet balance can be used for future orders. Refunds from cancelled orders are credited here automatically.</Text>
        </View>
      </View>

      {/* Transactions */}
      <Text style={[styles.sectionTitle, themed.textPrimary]}>Transaction History</Text>
      <FlatList
        data={transactions}
        keyExtractor={i => i.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="wallet-outline" size={48} color={COLORS.text.muted} />
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
  balanceCard: { marginHorizontal: SPACING.base, marginTop: SPACING.sm, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.sm },
  balanceGrad: { padding: SPACING.xl, alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 4 },
  balanceStatsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: SPACING.md, marginTop: SPACING.md, width: '100%' },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatValue: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  balanceStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  balanceStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  infoCard: { marginHorizontal: SPACING.base, marginTop: SPACING.sm, backgroundColor: '#E3F2FD', borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.sm },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 11, color: '#1565C0', lineHeight: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginHorizontal: SPACING.base, marginTop: SPACING.md, marginBottom: SPACING.sm },
  list: { paddingHorizontal: SPACING.base, paddingBottom: 40 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  txDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  txDate: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: 8 },
});
