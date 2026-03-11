import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';
import { useCart } from '@/context/CartContext';
import { useWallet } from '@/context/WalletContext';
import { useReviews } from '@/context/ReviewContext';
import { getCutLabel } from '@/data/cutTypes';
import type { Product } from '@/types';

type ChatMsg = { id: string; text: string; sender: 'user' | 'shop'; time: string };

const STATUS_ICONS: Record<string, string> = {
  'Order Placed': 'clipboard-check', 'Confirmed': 'check-circle', 'Cutting Started': 'knife',
  'Quality Check': 'shield-check', 'Packed': 'package-variant-closed', 'Out for Delivery': 'truck-delivery', 'Delivered': 'check-all',
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, cancelOrder, canCancelOrder } = useOrders();
  const { addToCart } = useCart();
  const { refundToWallet } = useWallet();
  const { getOrderRating } = useReviews();
  const orderRating = getOrderRating(id);
  const order = useMemo(() => orders.find(o => o.id === id), [orders, id]);
  const cancelCheck = useMemo(() => id ? canCancelOrder(id) : { canCancel: false, reason: '' }, [id, canCancelOrder]);

  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [tipSent, setTipSent] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { id: '1', text: 'Hi! Your order is being prepared.', sender: 'shop', time: '10:30 AM' },
    { id: '2', text: 'We are using the freshest vegetables for your order!', sender: 'shop', time: '10:31 AM' },
  ]);
  const [inputText, setInputText] = useState('');

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr2 = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    setChatMessages(prev => [...prev, { id: Date.now().toString(), text: inputText.trim(), sender: 'user', time: timeStr2 }]);
    setInputText('');
    scrollToEnd();
    // Auto-reply after short delay
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Thanks for your message! We will get back to you shortly.', sender: 'shop', time: replyTime }]);
      scrollToEnd();
    }, 1500);
  };

  const handleReorder = () => {
    if (!order) return;
    order.items.forEach(item => {
      addToCart(item as unknown as Product, item.quantity, item.selectedWeight, item.cutType, item.specialInstructions);
    });
    router.push('/(tabs)/cart');
  };

  const handleCancelOrder = useCallback(() => {
    if (!order) return;
    setCancelReason('');
    setShowCancelModal(true);
  }, [order]);

  const confirmCancelOrder = useCallback(async () => {
    if (!order) return;
    const reason = cancelReason.trim() || 'Cancelled by user';
    setShowCancelModal(false);
    const result = await cancelOrder(order.id, reason);
    if (result.success) {
      if (result.refundAmount && result.refundAmount > 0) {
        await refundToWallet(result.refundAmount, order.id, `Refund for cancelled order #${order.id}`);
      }
      Alert.alert('Order Cancelled', result.message);
    } else {
      Alert.alert('Cannot Cancel', result.message);
    }
  }, [order, cancelReason, cancelOrder, refundToWallet]);

  const handleSendTip = useCallback(() => {
    if (!tipAmount || tipAmount <= 0) return;
    setTipSent(true);
    Alert.alert('Tip Sent!', `₹${tipAmount} tip has been sent to your delivery partner. Thank you!`);
  }, [tipAmount]);

  if (!order) return <SafeAreaView style={styles.safe}><Text style={{ textAlign: 'center', marginTop: 60 }}>Order not found</Text></SafeAreaView>;

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={themed.colors.text.primary} /></TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Order #{order.id}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Status */}
        <View style={styles.statusBanner}>
          <LinearGradient colors={COLORS.gradient.primary} style={styles.statusGrad}>
            <Icon name="package-variant" size={32} color="#FFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.statusLabel}>
                {order.status === 'cutting' ? 'Cutting in Progress...' : order.status === 'delivered' ? 'Delivered!' : order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              {order.estimatedDelivery && <Text style={styles.statusTime}>ETA: {order.estimatedDelivery}</Text>}
            </View>
          </LinearGradient>
        </View>

        {/* Subscription Info */}
        {order.subscription && (
          <View style={styles.subInfoCard}>
            <View style={styles.subInfoHeader}>
              <Icon name="autorenew" size={20} color="#FFF" />
              <Text style={styles.subInfoTitle}>{order.subscription.frequency.charAt(0).toUpperCase() + order.subscription.frequency.slice(1)} Subscription</Text>
              <View style={[styles.subStatusBadge, order.subscription.status === 'active' && styles.subStatusActive, order.subscription.status === 'paused' && styles.subStatusPaused]}>
                <Text style={styles.subStatusText}>{order.subscription.status.charAt(0).toUpperCase() + order.subscription.status.slice(1)}</Text>
              </View>
            </View>
            <View style={styles.subInfoBody}>
              {order.subscription.frequency === 'weekly' && order.subscription.weeklyDay && (
                <View style={styles.subInfoRow}><Icon name="calendar-week" size={14} color={COLORS.text.muted} /><Text style={styles.subInfoText}>Every {order.subscription.weeklyDay}</Text></View>
              )}
              {order.subscription.frequency === 'monthly' && order.subscription.monthlyDates && (
                <View style={styles.subInfoRow}><Icon name="calendar-month" size={14} color={COLORS.text.muted} /><Text style={styles.subInfoText}>On {order.subscription.monthlyDates.join(', ')} of each month</Text></View>
              )}
              {order.subscription.frequency === 'daily' && (
                <View style={styles.subInfoRow}><Icon name="calendar-today" size={14} color={COLORS.text.muted} /><Text style={styles.subInfoText}>Every day</Text></View>
              )}
              <View style={styles.subInfoRow}><Icon name="clock-outline" size={14} color={COLORS.text.muted} /><Text style={styles.subInfoText}>{order.subscription.preferredTime}</Text></View>
              {(order.subscription.skippedDeliveries || []).filter(s => s.status === 'skipped').length > 0 && (
                <View style={styles.subInfoRow}>
                  <Icon name="calendar-remove" size={14} color={COLORS.status.error} />
                  <Text style={[styles.subInfoText, { color: COLORS.status.error }]}>
                    {(order.subscription.skippedDeliveries || []).filter(s => s.status === 'skipped').length} delivery(s) skipped
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.subManageBtn}
                onPress={() => router.push({ pathname: '/subscription-manage' as any, params: { id: order.id } })}
              >
                <Icon name="cog-outline" size={16} color={COLORS.primary} />
                <Text style={styles.subManageBtnText}>Manage Subscription</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Order Timeline</Text>
          {order.timeline?.map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDotCol}>
                <View style={[styles.timelineDot, step.completed && styles.timelineDotDone]}>
                  <Icon name={(STATUS_ICONS[step.status] || 'circle-outline') as any} size={14} color={step.completed ? '#FFF' : COLORS.text.muted} />
                </View>
                {i < (order.timeline?.length ?? 0) - 1 && <View style={[styles.timelineLine, step.completed && styles.timelineLineDone]} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStatus, step.completed && styles.timelineStatusDone]}>{step.status}</Text>
                {step.time ? <Text style={styles.timelineTime}>{step.time}</Text> : null}
                <Text style={styles.timelineDesc}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Items */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Order Items ({order.items.length})</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.orderItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderItemName}>{item.name} x{item.quantity}</Text>
                {item.cutType && <View style={styles.cutBadge}><Text style={styles.cutBadgeText}>{getCutLabel(item.cutType)}</Text></View>}
                {item.specialInstructions && <Text style={styles.orderItemInstr}>{'\uD83D\uDCDD'} {item.specialInstructions}</Text>}
              </View>
              <Text style={styles.orderItemPrice}>{'\u20B9'}{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Details */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Order Details</Text>
          {[
            ['Order ID', `#${order.id}`], ['Placed on', `${dateStr} at ${timeStr}`],
            ['Delivery Slot', order.deliverySlot], ['Address', order.deliveryAddress],
            ...(order.specialNote ? [['Note', order.specialNote]] : []),
          ].map(([label, value], i) => (
            <View key={i} style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
          ))}
        </View>

        {/* Bill */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Bill Summary</Text>
          <View style={styles.billRow}><Text style={styles.billLabel}>Items Total</Text><Text style={styles.billValue}>{'\u20B9'}{order.subtotal}</Text></View>
          {order.cuttingCharges > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>{'\uD83D\uDD2A'} Cutting Charges</Text><Text style={[styles.billValue, { color: COLORS.primary }]}>{'\u20B9'}{order.cuttingCharges}</Text></View>}
          <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Fee</Text><Text style={styles.billValue}>{'\u20B9'}{order.deliveryFee}</Text></View>
          <View style={[styles.billRow, styles.billTotal]}><Text style={styles.billTotalLabel}>Total Paid</Text><Text style={styles.billTotalValue}>{'\u20B9'}{order.total}</Text></View>
        </View>
        {/* Cancelled + Refund Info */}
        {order.status === 'cancelled' && (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledHeader}>
              <Icon name="close-circle" size={20} color={COLORS.status.error} />
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            </View>
            {order.cancelReason && <Text style={styles.cancelledReason}>{order.cancelReason}</Text>}
            {order.cancelledAt && (
              <Text style={styles.cancelledTime}>
                Cancelled on {new Date(order.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {new Date(order.cancelledAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            )}
            {order.refundedToWallet && order.refundAmount && (
              <View style={styles.refundBadge}>
                <Icon name="wallet-outline" size={16} color={COLORS.green} />
                <Text style={styles.refundBadgeText}>{'\u20B9'}{order.refundAmount} refunded to wallet</Text>
              </View>
            )}
          </View>
        )}

        {/* Rate Order */}
        {order.status === 'delivered' && !orderRating && (
          <TouchableOpacity style={styles.rateOrderBtn} onPress={() => router.push({ pathname: '/rate-order', params: { orderId: id } } as any)}>
            <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.rateOrderGrad}>
              <Icon name="star-outline" size={20} color="#FFF" />
              <Text style={styles.rateOrderText}>Rate Your Order</Text>
              <Text style={styles.rateOrderPoints}>+20 pts</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Already Rated Badge */}
        {order.status === 'delivered' && orderRating && (
          <View style={styles.ratedBadge}>
            <Icon name="check-circle" size={18} color={COLORS.green} />
            <Text style={styles.ratedText}>You rated this order</Text>
            <View style={styles.ratedStars}>
              {[1,2,3,4,5].map(s => <Icon key={s} name={s <= orderRating.overallRating ? 'star' : 'star-outline'} size={14} color="#FFD700" />)}
            </View>
          </View>
        )}

        {/* Chat with Shop */}
        <View style={[styles.chatCard, themed.card]}>
          <View style={styles.chatHeader}>
            <Icon name="chat-outline" size={20} color={themed.colors.text.primary} />
            <Text style={[styles.chatTitle, themed.textPrimary]}>Chat with Shop</Text>
            <View style={styles.chatOnlineDot} />
          </View>
          <View style={styles.chatMessages}>
            {chatMessages.length === 0 ? (
              <Text style={styles.chatEmpty}>No messages yet. Say hi to the shop!</Text>
            ) : (
              chatMessages.map(msg => (
                <View key={msg.id} style={[styles.chatBubble, msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleShop]}>
                  <Text style={[styles.chatBubbleText, msg.sender === 'user' && styles.chatBubbleTextUser]}>{msg.text}</Text>
                  <Text style={[styles.chatBubbleTime, msg.sender === 'user' && styles.chatBubbleTimeUser]}>{msg.time}</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.chatInputRow}>
            <TextInput
              style={[styles.chatInput, themed.inputBg]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.text.muted}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              onFocus={scrollToEnd}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, inputText.trim() && styles.chatSendBtnActive]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Icon name="send" size={18} color={inputText.trim() ? '#FFF' : COLORS.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Estimated Delivery Countdown */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={[styles.etaCard, themed.card]}>
            <Icon name="clock-fast" size={22} color={COLORS.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.etaTitle, themed.textPrimary]}>Estimated Delivery</Text>
              <Text style={styles.etaTime}>{order.estimatedDelivery || '30-45 min'}</Text>
            </View>
          </View>
        )}

        {/* Cancel info banner when can't cancel */}
        {!cancelCheck.canCancel && order.status !== 'cancelled' && order.status !== 'delivered' && (
          <View style={styles.cancelInfoBanner}>
            <Icon name="information-outline" size={16} color="#F57C00" />
            <Text style={styles.cancelInfoText}>{cancelCheck.reason}</Text>
          </View>
        )}

        {/* Live Tracking */}
        {order.status === 'out_for_delivery' && (
          <TouchableOpacity
            style={[styles.mapCard, themed.card]}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/delivery-tracking', params: { id: order.id } })}
          >
            <View style={styles.mapHeader}>
              <Icon name="map-marker-radius" size={20} color={COLORS.primary} />
              <Text style={[styles.mapTitle, themed.textPrimary]}>Live Tracking</Text>
              <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#F44336' }}>LIVE</Text>
              </View>
            </View>
            <View style={styles.mapSimulation}>
              <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.mapGrad}>
                <View style={styles.mapRoute}>
                  <View style={styles.mapDotStart}>
                    <Icon name="store" size={18} color="#FFF" />
                  </View>
                  <View style={styles.mapLine}>
                    <View style={styles.mapLineFilled} />
                    <View style={styles.mapBiker}>
                      <Icon name="bike" size={16} color="#FFF" />
                    </View>
                  </View>
                  <View style={styles.mapDotEnd}>
                    <Icon name="home" size={18} color="#FFF" />
                  </View>
                </View>
                <View style={styles.mapLabels}>
                  <Text style={styles.mapLabelText}>Shop</Text>
                  <Text style={styles.mapLabelText}>Your Location</Text>
                </View>
              </LinearGradient>
            </View>
            <View style={styles.mapInfo}>
              <Icon name="clock-fast" size={14} color={COLORS.green} />
              <Text style={styles.mapInfoText}>Tap to track your delivery partner in real-time</Text>
              <Icon name="chevron-right" size={16} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
        )}

        {/* Tip After Delivery */}
        {order.status === 'delivered' && !tipSent && (
          <View style={[styles.tipCard, themed.card]}>
            <View style={styles.tipHeader}>
              <Icon name="hand-heart" size={20} color="#F57C00" />
              <Text style={[styles.tipTitle, themed.textPrimary]}>Tip your delivery partner</Text>
            </View>
            <View style={styles.tipOptions}>
              {[10, 20, 30, 50].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.tipChip, tipAmount === amount && styles.tipChipActive]}
                  onPress={() => setTipAmount(tipAmount === amount ? null : amount)}
                >
                  <Text style={[styles.tipChipText, tipAmount === amount && styles.tipChipTextActive]}>{'\u20B9'}{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tipAmount && (
              <TouchableOpacity style={styles.tipSendBtn} onPress={handleSendTip}>
                <Icon name="hand-coin" size={16} color="#FFF" />
                <Text style={styles.tipSendText}>Send {'\u20B9'}{tipAmount} Tip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {tipSent && (
          <View style={styles.tipSentBadge}>
            <Icon name="check-circle" size={16} color={COLORS.green} />
            <Text style={styles.tipSentText}>Tip sent! Thank you for your generosity.</Text>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          {cancelCheck.canCancel && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCancelOrder}>
              <View style={[styles.actionBtnIcon, { backgroundColor: '#FFEBEE' }]}>
                <Icon name="close-circle-outline" size={20} color={COLORS.status.error} />
              </View>
              <Text style={[styles.actionBtnLabel, { color: COLORS.status.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {order.status !== 'cancelled' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/report-issue', params: { orderId: id } } as any)}>
              <View style={[styles.actionBtnIcon, { backgroundColor: '#FFF3E0' }]}>
                <Icon name="alert-circle-outline" size={20} color="#F57C00" />
              </View>
              <Text style={[styles.actionBtnLabel, { color: '#F57C00' }]}>Report</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={handleReorder}>
            <View style={[styles.actionBtnIcon, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="cart-plus" size={20} color={COLORS.primary} />
            </View>
            <Text style={[styles.actionBtnLabel, { color: COLORS.primary }]}>Reorder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/order-invoice' as any, params: { id: order.id } })}>
            <View style={[styles.actionBtnIcon, { backgroundColor: '#E3F2FD' }]}>
              <Icon name="receipt" size={20} color={COLORS.status.info} />
            </View>
            <Text style={[styles.actionBtnLabel, { color: COLORS.status.info }]}>Invoice</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />

      {/* Cancel Reason Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themed.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.textPrimary]}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Icon name="close" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>Why are you cancelling this order?</Text>
            {['Changed my mind', 'Ordered by mistake', 'Found better price', 'Delivery too late', 'Other'].map(reason => (
              <TouchableOpacity
                key={reason}
                style={[styles.cancelReasonChip, cancelReason === reason && styles.cancelReasonChipActive]}
                onPress={() => setCancelReason(reason)}
              >
                <Icon name={cancelReason === reason ? 'radiobox-marked' : 'radiobox-blank'} size={18} color={cancelReason === reason ? COLORS.status.error : COLORS.text.muted} />
                <Text style={[styles.cancelReasonText, cancelReason === reason && { color: COLORS.status.error, fontWeight: '700' }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            {cancelReason === 'Other' && (
              <TextInput
                style={[styles.cancelReasonInput, themed.inputBg]}
                placeholder="Tell us more..."
                placeholderTextColor={COLORS.text.muted}
                value={cancelReason === 'Other' ? '' : cancelReason}
                onChangeText={(text) => setCancelReason(text || 'Other')}
                multiline
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalKeepBtn} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalKeepText}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCancelBtn, !cancelReason && { opacity: 0.5 }]}
                onPress={confirmCancelOrder}
                disabled={!cancelReason}
              >
                <Icon name="close-circle" size={16} color="#FFF" />
                <Text style={styles.modalCancelText}>Cancel Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  scroll: { padding: SPACING.base, paddingBottom: 20 },
  statusBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  statusGrad: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  statusLabel: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  statusTime: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineDotCol: { width: 30, alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  timelineDotDone: { backgroundColor: COLORS.primary },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 2 },
  timelineLineDone: { backgroundColor: COLORS.primary },
  timelineContent: { flex: 1, marginLeft: 10, paddingBottom: 16 },
  timelineStatus: { fontSize: 13, fontWeight: '700', color: COLORS.text.muted },
  timelineStatusDone: { color: COLORS.text.primary },
  timelineTime: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  timelineDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderItemName: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  cutBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3, borderWidth: 1, borderColor: '#A5D6A7' },
  cutBadgeText: { fontSize: 10, fontWeight: '600', color: '#4CAF50' },
  orderItemInstr: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  orderItemPrice: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 12, color: COLORS.text.muted },
  detailValue: { fontSize: 12, fontWeight: '600', color: COLORS.text.primary, maxWidth: '60%', textAlign: 'right' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billLabel: { fontSize: 13, color: COLORS.text.secondary },
  billValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  billTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 10 },
  billTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  billTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  // Action Buttons Row
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: SPACING.md, marginBottom: SPACING.md },
  actionBtn: { alignItems: 'center', gap: 6, minWidth: 72 },
  actionBtnIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnLabel: { fontSize: 11, fontWeight: '700' },
  chatCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  chatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  chatTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginLeft: 8, flex: 1 },
  chatOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  chatMessages: { maxHeight: 250, marginBottom: SPACING.sm },
  chatEmpty: { fontSize: 12, color: COLORS.text.muted, textAlign: 'center', paddingVertical: SPACING.lg },
  chatBubble: { maxWidth: '80%', borderRadius: RADIUS.md, padding: 10, marginBottom: 8 },
  chatBubbleShop: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9' },
  chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  chatBubbleText: { fontSize: 13, color: COLORS.text.primary, lineHeight: 18 },
  chatBubbleTextUser: { color: '#FFF' },
  chatBubbleTime: { fontSize: 10, color: COLORS.text.muted, marginTop: 4 },
  chatBubbleTimeUser: { color: 'rgba(255,255,255,0.7)' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  chatInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text.primary },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  chatSendBtnActive: { backgroundColor: COLORS.primary },
  // Subscription
  subInfoCard: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  subInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.base, paddingVertical: 12 },
  subInfoTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', flex: 1 },
  subStatusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  subStatusActive: { backgroundColor: '#E8F5E9' },
  subStatusPaused: { backgroundColor: '#FFF8E1' },
  subStatusText: { fontSize: 10, fontWeight: '700', color: '#4CAF50' },
  subInfoBody: { backgroundColor: '#FFF', padding: SPACING.base, gap: 8 },
  subInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subInfoText: { fontSize: 12, color: COLORS.text.secondary },
  subManageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  subManageBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  // Cancel Order
  cancelInfoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  cancelInfoText: { flex: 1, fontSize: 12, color: '#F57C00', lineHeight: 17 },
  cancelledCard: { backgroundColor: '#FFEBEE', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  cancelledHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cancelledTitle: { fontSize: 15, fontWeight: '800', color: COLORS.status.error },
  cancelledReason: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 4 },
  cancelledTime: { fontSize: 11, color: COLORS.text.muted, marginBottom: 6 },
  refundBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  refundBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.green },
  // Rate & Review
  rateOrderBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md } as any,
  rateOrderGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.base } as any,
  rateOrderText: { fontSize: 14, fontWeight: '700', color: '#FFF', flex: 1 } as any,
  rateOrderPoints: { fontSize: 12, fontWeight: '800', color: '#FFF', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full } as any,
  ratedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md } as any,
  ratedText: { fontSize: 13, fontWeight: '700', color: COLORS.green, flex: 1 } as any,
  ratedStars: { flexDirection: 'row', gap: 2 } as any,
  etaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm } as any,
  etaTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary } as any,
  etaTime: { fontSize: 15, fontWeight: '800', color: COLORS.green, marginTop: 2 } as any,
  // Map simulation
  mapCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm } as any,
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md } as any,
  mapTitle: { fontSize: 15, fontWeight: '800' } as any,
  mapSimulation: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.sm } as any,
  mapGrad: { padding: SPACING.lg } as any,
  mapRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as any,
  mapDotStart: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' } as any,
  mapLine: { flex: 1, height: 4, backgroundColor: '#A5D6A7', marginHorizontal: 8, borderRadius: 2, position: 'relative' } as any,
  mapLineFilled: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', backgroundColor: COLORS.primary, borderRadius: 2 } as any,
  mapBiker: { position: 'absolute', left: '55%', top: -14, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' } as any,
  mapDotEnd: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.status.info, justifyContent: 'center', alignItems: 'center' } as any,
  mapLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm } as any,
  mapLabelText: { fontSize: 10, fontWeight: '600', color: COLORS.text.secondary } as any,
  mapInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 } as any,
  mapInfoText: { fontSize: 12, color: COLORS.green, fontWeight: '600' } as any,
  // Tip
  tipCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm } as any,
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md } as any,
  tipTitle: { fontSize: 14, fontWeight: '700' } as any,
  tipOptions: { flexDirection: 'row', gap: 8 } as any,
  tipChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border } as any,
  tipChipActive: { borderColor: '#F57C00', backgroundColor: '#FFF8E1' } as any,
  tipChipText: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary } as any,
  tipChipTextActive: { color: '#F57C00' } as any,
  tipSendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F57C00', borderRadius: RADIUS.full, paddingVertical: 12, marginTop: SPACING.md } as any,
  tipSendText: { fontSize: 14, fontWeight: '700', color: '#FFF' } as any,
  tipSentBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md } as any,
  tipSentText: { fontSize: 12, fontWeight: '600', color: COLORS.green } as any,
  // Cancel modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl } as any,
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.floating } as any,
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm } as any,
  modalTitle: { fontSize: 17, fontWeight: '800' } as any,
  modalSubtext: { fontSize: 13, color: COLORS.text.secondary, marginBottom: SPACING.md } as any,
  cancelReasonChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border } as any,
  cancelReasonChipActive: { backgroundColor: '#FFEBEE', marginHorizontal: -SPACING.lg, paddingHorizontal: SPACING.lg, borderBottomColor: 'transparent' } as any,
  cancelReasonText: { fontSize: 14, color: COLORS.text.primary } as any,
  cancelReasonInput: { backgroundColor: '#F7F7F7', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, minHeight: 50, textAlignVertical: 'top', marginTop: SPACING.sm } as any,
  modalActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.lg } as any,
  modalKeepBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border } as any,
  modalKeepText: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary } as any,
  modalCancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.status.error } as any,
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#FFF' } as any,
});
