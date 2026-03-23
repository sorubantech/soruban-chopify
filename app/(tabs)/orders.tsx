import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, RefreshControl, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useOrders } from '@/context/OrderContext';
import { useCart } from '@/context/CartContext';
import { getCutLabel } from '@/data/cutTypes';
import { useScrollContext } from '@/context/ScrollContext';
import type { Product } from '@/types';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

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
  const { orders, getUpcomingDeliveries, updateSubscriptionStatus } = useOrders();
  const { addToCart } = useCart();
  const { handleScroll } = useScrollContext();
  const themed = useThemedStyles();
  const [refreshing, setRefreshing] = useState(false);

  const activeSubscriptions = orders.filter(o => o.subscription && o.subscription.status !== 'cancelled');
  const regularOrders = orders.filter(o => !o.subscription || o.subscription.status === 'cancelled');
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleReorder = (order: typeof orders[0]) => {
    order.items.forEach(item => {
      addToCart(item as unknown as Product, item.quantity, item.selectedWeight, item.cutType, item.specialInstructions);
    });
    router.push('/(tabs)/cart');
  };

  const renderOrder = ({ item }: { item: typeof orders[0] }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.placed;
    const cutItems = item.items.filter(i => i.cutType);
    const date = new Date(item.createdAt);
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

    return (
      <TouchableOpacity style={[styles.orderCard, themed.card]} activeOpacity={0.85} onPress={() => router.push({ pathname: '/order-detail', params: { id: item.id } })}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={[styles.orderId, themed.textPrimary]}>#{item.id}</Text>
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
            <Text style={styles.subBadgeText}>{item.subscription.groupCode ? 'Group ' : ''}{item.subscription.frequency.charAt(0).toUpperCase() + item.subscription.frequency.slice(1)} Subscription</Text>
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
          <Text style={[styles.orderTotal, themed.textPrimary]}>{'\u20B9'}{item.total}</Text>
          <View style={styles.orderFooterRight}>
            <View style={styles.orderMeta}>
              <Text style={styles.orderMetaText}>{item.items.reduce((s, i) => s + i.quantity, 0)} items</Text>
              {cutItems.length > 0 && <Text style={styles.orderMetaCut}>{'\uD83D\uDD2A'} {cutItems.length} cut</Text>}
            </View>
            <TouchableOpacity style={styles.reorderSmallBtn} onPress={(e) => { e.stopPropagation(); handleReorder(item); }}>
              <Icon name="cart-plus" size={14} color="#FFF" />
              <Text style={styles.reorderSmallText}>Reorder</Text>
            </TouchableOpacity>
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
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <Text style={[styles.headerTitle, themed.textPrimary]}>{'\uD83D\uDCE6'} My Orders</Text>
        <TouchableOpacity style={styles.calendarBtn} onPress={() => router.push('/order-history-calendar' as any)}>
          <Icon name="calendar-month" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </LinearGradient>
      {orders.length === 0 && activeSubscriptions.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="clipboard-text-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyDesc}>Place your first Chopify order!</Text>
        </View>
      ) : (
        <FlatList
          data={regularOrders}
          keyExtractor={o => o.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={activeSubscriptions.length > 0 ? (
            <View style={styles.subSection}>
              <View style={styles.subSectionHeader}>
                <Icon name="autorenew" size={18} color={COLORS.primary} />
                <Text style={[styles.subSectionTitle, themed.textPrimary]}>My Subscriptions</Text>
                <View style={styles.subCountChip}>
                  <Text style={styles.subCountChipText}>{activeSubscriptions.length}</Text>
                </View>
              </View>

              {activeSubscriptions.map(order => {
                const sub = order.subscription!;
                const freqLabel = sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1);
                const upcoming = getUpcomingDeliveries(order.id, 7);
                const nextDelivery = upcoming.find(d => !d.isSkipped);
                const skippedCount = upcoming.filter(d => d.isSkipped).length;

                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.subCard, themed.card]}
                    onPress={() => router.push({ pathname: '/subscription-manage' as any, params: { id: order.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.subCardTop}>
                      <View style={[styles.subCardIcon, sub.status === 'paused' && { backgroundColor: '#FFF3E0' }]}>
                        <Icon
                          name={sub.status === 'paused' ? 'pause-circle' : sub.frequency === 'daily' ? 'calendar-today' : sub.frequency === 'weekly' ? 'calendar-week' : 'calendar-month'}
                          size={20}
                          color={sub.status === 'paused' ? '#F57C00' : COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.subCardTitle, themed.textPrimary]}>{sub.groupCode ? 'Group ' : ''}{freqLabel} Subscription</Text>
                          {sub.groupCode && (
                            <View style={{ backgroundColor: '#E3F2FD', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, fontWeight: '800', color: '#1565C0' }}>{sub.groupName || sub.groupCode}</Text>
                            </View>
                          )}
                          <View style={[styles.subStatusPill, sub.status === 'paused' && styles.subStatusPaused]}>
                            <Text style={[styles.subStatusText, sub.status === 'paused' && styles.subStatusTextPaused]}>
                              {sub.status === 'active' ? 'Active' : 'Paused'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.subCardDetail}>
                          {order.items.length} items · {'\u20B9'}{order.total}/delivery
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color={COLORS.text.muted} />
                    </View>

                    {/* Next Delivery / Upcoming Info */}
                    <View style={styles.subCardBottom}>
                      {nextDelivery ? (
                        <View style={styles.subNextDelivery}>
                          <Icon name="truck-delivery-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.subNextText}>
                            Next: {nextDelivery.dayLabel}, {new Date(nextDelivery.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.subNextDelivery}>
                          <Icon name="calendar-blank" size={14} color={COLORS.text.muted} />
                          <Text style={[styles.subNextText, { color: COLORS.text.muted }]}>No upcoming deliveries</Text>
                        </View>
                      )}
                      <View style={styles.subQuickStats}>
                        <Text style={styles.subQuickStat}>{upcoming.filter(d => !d.isSkipped).length} upcoming</Text>
                        {skippedCount > 0 && <Text style={styles.subQuickStatSkipped}>{skippedCount} skipped</Text>}
                      </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.subQuickActions}>
                      <TouchableOpacity
                        style={styles.subQuickBtn}
                        onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/subscription-manage' as any, params: { id: order.id } }); }}
                      >
                        <Icon name="cog-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.subQuickBtnText}>Manage</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.subQuickBtn}
                        onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/subscription-calendar' as any, params: { orderId: order.id } }); }}
                      >
                        <Icon name="calendar-month" size={14} color={COLORS.primary} />
                        <Text style={styles.subQuickBtnText}>Calendar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.subQuickBtn}
                        onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/subscription-plan-editor' as any, params: { id: order.id } }); }}
                      >
                        <Icon name="pencil-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.subQuickBtnText}>Edit Plan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.subQuickBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            'Cancel Subscription',
                            'Are you sure? This cannot be undone. You will need to create a new subscription.',
                            [
                              { text: 'Keep', style: 'cancel' },
                              { text: 'Cancel It', style: 'destructive', onPress: () => updateSubscriptionStatus(order.id, 'cancelled') },
                            ]
                          );
                        }}
                      >
                        <Icon name="close-circle-outline" size={14} color={COLORS.status.error} />
                        <Text style={styles.subQuickBtnCancel}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {regularOrders.length > 0 && (
                <Text style={[styles.regularOrdersLabel, themed.textPrimary]}>Orders</Text>
              )}
            </View>
          ) : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  calendarBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
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
  orderFooterRight: { alignItems: 'flex-end', gap: 6 },
  orderTotal: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  orderMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  reorderSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  reorderSmallText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  orderMetaText: { fontSize: 11, color: COLORS.text.muted },
  orderMetaCut: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary, marginTop: SPACING.base },
  emptyDesc: { fontSize: 13, color: COLORS.text.muted, marginTop: 4 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  subBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm, backgroundColor: '#FFF8E1', alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  subBadgeText: { fontSize: 10, fontWeight: '700', color: '#F57C00' },
  // Subscription section
  subSection: { marginBottom: SPACING.md },
  subSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  subSectionTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  subCountChip: { backgroundColor: COLORS.primary, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  subCountChipText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  subCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOW.sm },
  subCardTop: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, gap: 10 },
  subCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  subCardTitle: { fontSize: 14, fontWeight: '700' },
  subCardDetail: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  subStatusPill: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  subStatusPaused: { backgroundColor: '#FFF8E1' },
  subStatusText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  subStatusTextPaused: { color: '#F57C00' },
  subCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingBottom: 10 },
  subNextDelivery: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subNextText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  subQuickStats: { flexDirection: 'row', gap: 8 },
  subQuickStat: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted },
  subQuickStatSkipped: { fontSize: 10, fontWeight: '600', color: COLORS.status.error },
  subQuickActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  subQuickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  subQuickBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  subQuickBtnCancel: { fontSize: 11, fontWeight: '700', color: COLORS.status.error },
  regularOrdersLabel: { fontSize: 16, fontWeight: '800', marginTop: SPACING.sm, marginBottom: SPACING.sm },
});
