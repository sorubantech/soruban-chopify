import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Share } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';
import { getCutLabel } from '@/data/cutTypes';

export default function OrderInvoiceScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useOrders();
  const order = useMemo(() => orders.find(o => o.id === id), [orders, id]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: 'center', marginTop: 60 }}>Invoice not found</Text>
      </SafeAreaView>
    );
  }

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const invoiceNo = `INV-${order.id}-${date.getFullYear()}`;

  const handleShare = async () => {
    const itemsList = order.items.map(i => `  ${i.name} x${i.quantity} - \u20B9${i.price * i.quantity}`).join('\n');
    const text = `Invoice: ${invoiceNo}\nDate: ${dateStr}\n\nItems:\n${itemsList}\n\nSubtotal: \u20B9${order.subtotal}\nCutting: \u20B9${order.cuttingCharges}\nDelivery: \u20B9${order.deliveryFee}\n${order.discount > 0 ? `Discount: -\u20B9${order.discount}\n` : ''}Total: \u20B9${order.total}\n\nPayment: ${(order.paymentMethod || 'cod').toUpperCase()}\nStatus: ${order.status.toUpperCase()}`;
    try { await Share.share({ message: text }); } catch {}
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Invoice</Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
              <Icon name="share-variant" size={20} color={themed.colors.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Invoice Header */}
        <View style={[styles.invoiceCard, themed.card]}>
          <View style={styles.invoiceHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Icon name="knife" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.brandName}>Chopify</Text>
                <Text style={styles.brandTag}>Fresh Cut Delivered</Text>
              </View>
            </View>
            <View style={styles.invoiceNoCol}>
              <Text style={styles.invoiceLabel}>Invoice</Text>
              <Text style={[styles.invoiceNo, themed.textPrimary]}>{invoiceNo}</Text>
            </View>
          </View>

          <View style={styles.invoiceDivider} />

          {/* Invoice Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={[styles.metaValue, themed.textPrimary]}>{dateStr}</Text>
              <Text style={styles.metaSub}>{timeStr}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Order ID</Text>
              <Text style={[styles.metaValue, themed.textPrimary]}>#{order.id}</Text>
              <Text style={styles.metaSub}>{order.deliverySlot}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Payment</Text>
              <Text style={[styles.metaValue, themed.textPrimary]}>{(order.paymentMethod || 'COD').toUpperCase()}</Text>
              <View style={[styles.statusBadge, order.status === 'delivered' ? styles.statusDelivered : order.status === 'cancelled' ? styles.statusCancelled : styles.statusActive]}>
                <Text style={styles.statusText}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.invoiceDivider} />

          {/* Delivery Address */}
          <View style={styles.addressRow}>
            <Icon name="map-marker" size={16} color={COLORS.primary} />
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={[styles.tableCard, themed.card]}>
          <Text style={[styles.tableTitle, themed.textPrimary]}>Order Items</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thItem, { flex: 2 }]}>Item</Text>
            <Text style={styles.thItem}>Qty</Text>
            <Text style={styles.thItem}>Rate</Text>
            <Text style={[styles.thItem, { textAlign: 'right' }]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {order.items.map((item, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tdItem}>{item.name}</Text>
                {item.cutType && <Text style={styles.tdCut}>{getCutLabel(item.cutType)}</Text>}
              </View>
              <Text style={styles.tdItem}>{item.quantity}</Text>
              <Text style={styles.tdItem}>{'\u20B9'}{item.price}</Text>
              <Text style={[styles.tdItem, { textAlign: 'right', fontWeight: '700' }]}>{'\u20B9'}{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        <View style={[styles.summaryCard, themed.card]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={[styles.summaryValue, themed.textPrimary]}>{'\u20B9'}{order.subtotal}</Text>
          </View>
          {order.cuttingCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cutting Charges</Text>
              <Text style={[styles.summaryValue, themed.textPrimary]}>{'\u20B9'}{order.cuttingCharges}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, themed.textPrimary]}>{'\u20B9'}{order.deliveryFee}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</Text>
              <Text style={[styles.summaryValue, { color: COLORS.green }]}>-{'\u20B9'}{order.discount}</Text>
            </View>
          )}
          {order.walletAmountUsed != null && order.walletAmountUsed > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Wallet Used</Text>
              <Text style={[styles.summaryValue, { color: COLORS.status.info }]}>-{'\u20B9'}{order.walletAmountUsed}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{'\u20B9'}{order.total}</Text>
          </View>
        </View>

        {/* Refund Info */}
        {order.status === 'cancelled' && order.refundAmount != null && order.refundAmount > 0 && (
          <View style={styles.refundCard}>
            <Icon name="wallet-outline" size={20} color={COLORS.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.refundTitle}>Refund Processed</Text>
              <Text style={styles.refundAmount}>{'\u20B9'}{order.refundAmount} credited to wallet</Text>
            </View>
          </View>
        )}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Thank you for ordering with Chopify!</Text>
          <Text style={styles.footerSub}>This is a computer-generated invoice and does not require a signature.</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  shareBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: SPACING.base, paddingBottom: 20 },
  // Invoice header
  invoiceCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOW.sm },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  brandTag: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  invoiceNoCol: { alignItems: 'flex-end' },
  invoiceLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted, textTransform: 'uppercase' },
  invoiceNo: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  invoiceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { fontSize: 12, fontWeight: '700' },
  metaSub: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: 4 },
  statusDelivered: { backgroundColor: '#E8F5E9' },
  statusCancelled: { backgroundColor: '#FFEBEE' },
  statusActive: { backgroundColor: '#E3F2FD' },
  statusText: { fontSize: 9, fontWeight: '700', color: COLORS.text.primary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressText: { flex: 1, fontSize: 12, color: COLORS.text.secondary, lineHeight: 17 },
  // Items table
  tableCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  tableTitle: { fontSize: 14, fontWeight: '800', marginBottom: SPACING.md },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1.5, borderBottomColor: COLORS.text.primary },
  thItem: { flex: 1, fontSize: 10, fontWeight: '700', color: COLORS.text.primary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tdItem: { flex: 1, fontSize: 12, color: COLORS.text.primary },
  tdCut: { fontSize: 9, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  // Summary
  summaryCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: COLORS.text.secondary },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  summaryDivider: { height: 1.5, backgroundColor: COLORS.text.primary, marginVertical: SPACING.sm },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  // Refund
  refundCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  refundTitle: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  refundAmount: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
  // Footer
  footerNote: { alignItems: 'center', paddingVertical: SPACING.lg },
  footerText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  footerSub: { fontSize: 10, color: COLORS.text.muted, marginTop: 4, textAlign: 'center' },
});
