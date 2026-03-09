import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useOrders } from '@/context/OrderContext';
import { getCutLabel } from '@/data/cutTypes';
import { useScrollContext } from '@/context/ScrollContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  placed: { label: 'Placed', color: '#1565C0', icon: 'clipboard-check' },
  confirmed: { label: 'Confirmed', color: '#388E3C', icon: 'check-circle' },
  cutting: { label: 'Cutting', color: '#4CAF50', icon: 'knife' },
  quality_check: { label: 'Quality Check', color: '#F57C00', icon: 'shield-check' },
  packed: { label: 'Packed', color: '#7B1FA2', icon: 'package-variant-closed' },
  out_for_delivery: { label: 'On the Way', color: '#0277BD', icon: 'truck-delivery' },
  delivered: { label: 'Delivered', color: '#388E3C', icon: 'check-all' },
  cancelled: { label: 'Cancelled', color: '#D32F2F', icon: 'close-circle' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { orders } = useOrders();
  const { handleScroll } = useScrollContext();

  const renderOrder = ({ item }: { item: typeof orders[0] }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.placed;
    const cutItems = item.items.filter(i => i.cutType);
    const date = new Date(item.createdAt);
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

    return (
      <TouchableOpacity style={styles.orderCard} activeOpacity={0.85} onPress={() => router.push({ pathname: '/order-detail', params: { id: item.id } })}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id}</Text>
            <Text style={styles.orderDate}>{dateStr} at {timeStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
            <Icon name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        {item.subscription && (
          <View style={styles.subBadgeRow}>
            <Icon name="autorenew" size={12} color="#F57C00" />
            <Text style={styles.subBadgeText}>{item.subscription.frequency.charAt(0).toUpperCase() + item.subscription.frequency.slice(1)} Subscription</Text>
          </View>
        )}
        <View style={styles.orderItems}>
          {item.items.slice(0, 3).map((oi, idx) => (
            <Text key={idx} style={styles.orderItemText} numberOfLines={1}>
              {oi.name} x{oi.quantity}{oi.cutType ? ` (${getCutLabel(oi.cutType)})` : ''}
            </Text>
          ))}
          {item.items.length > 3 && <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>}
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>{'\u20B9'}{item.total}</Text>
          <View style={styles.orderMeta}>
            <Text style={styles.orderMetaText}>{item.items.reduce((s, i) => s + i.quantity, 0)} items</Text>
            {cutItems.length > 0 && <Text style={styles.orderMetaCut}>{'\uD83D\uDD2A'} {cutItems.length} cut</Text>}
          </View>
        </View>
        {item.status !== 'delivered' && item.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push({ pathname: '/order-detail', params: { id: item.id } })}
            activeOpacity={0.8}
          >
            <Icon name="chat-outline" size={16} color={COLORS.primary} />
            <Text style={styles.chatBtnText}>Chat with Shop</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={COLORS.gradient.header} style={styles.header}><Text style={styles.headerTitle}>{'\uD83D\uDCE6'} My Orders</Text></LinearGradient>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="clipboard-text-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyDesc}>Place your first Chopify order!</Text>
        </View>
      ) : (
        <FlatList data={orders} keyExtractor={o => o.id} renderItem={renderOrder} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  list: { paddingHorizontal: SPACING.base, paddingTop: SPACING.md, paddingBottom: 40 },
  orderCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  orderDate: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderItems: { marginTop: SPACING.md, gap: 3 },
  orderItemText: { fontSize: 12, color: COLORS.text.secondary },
  moreItems: { fontSize: 11, color: COLORS.text.muted, fontStyle: 'italic', marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  orderTotal: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  orderMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  orderMetaText: { fontSize: 11, color: COLORS.text.muted },
  orderMetaCut: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary, marginTop: SPACING.base },
  emptyDesc: { fontSize: 13, color: COLORS.text.muted, marginTop: 4 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  subBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm, backgroundColor: '#FFF8E1', alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  subBadgeText: { fontSize: 10, fontWeight: '700', color: '#F57C00' },
});
