import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert, Platform } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { getCutLabel, getCutFee } from '@/data/cutTypes';
import deliverySlotsData from '@/data/deliverySlots.json';
import type { Subscription } from '@/types';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHLY_DATE_OPTIONS = [1, 5, 10, 15, 20, 25];

const SCHEDULE_DATES = (() => {
  const dates: { key: string; label: string; sub: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    dates.push({
      key: d.toISOString().split('T')[0],
      label: dayLabel,
      sub: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }
  return dates;
})();

const TIME_SLOTS = [
  { id: 'slot_7am', label: '7:00 AM - 8:00 AM' },
  { id: 'slot_8am', label: '8:00 AM - 10:00 AM' },
  { id: 'slot_10am', label: '10:00 AM - 12:00 PM' },
  { id: 'slot_12pm', label: '12:00 PM - 2:00 PM' },
  { id: 'slot_2pm', label: '2:00 PM - 4:00 PM' },
  { id: 'slot_5pm', label: '5:00 PM - 7:00 PM' },
  { id: 'slot_7pm', label: '7:00 PM - 9:00 PM' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { cartItems, getSubtotal, getCuttingTotal, clearCart } = useCart();
  const { createOrder } = useOrders();

  const [deliveryMode, setDeliveryMode] = useState<'now' | 'scheduled'>('now');
  const [selectedSlot, setSelectedSlot] = useState(deliverySlotsData[0].id);
  const [scheduleDate, setScheduleDate] = useState(SCHEDULE_DATES[1].key);
  const [scheduleTime, setScheduleTime] = useState(TIME_SLOTS[0].id);
  const [address, setAddress] = useState('42, Anna Nagar, Coimbatore');
  const [orderNote, setOrderNote] = useState('');
  const [payment, setPayment] = useState<'cod' | 'upi'>('cod');
  const [placing, setPlacing] = useState(false);
  const [orderType, setOrderType] = useState<'once' | 'subscribe'>('once');
  const [subFrequency, setSubFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [subWeeklyDay, setSubWeeklyDay] = useState('Mon');
  const [subMonthlyDates, setSubMonthlyDates] = useState<number[]>([1]);
  const [subStartDate, setSubStartDate] = useState(SCHEDULE_DATES[1].key);
  const [subTimeSlot, setSubTimeSlot] = useState(TIME_SLOTS[0].id);

  const subtotal = getSubtotal();
  const cuttingTotal = getCuttingTotal();
  const deliveryFee = 25;
  const effectiveDeliveryFee = orderType === 'subscribe' ? deliveryFee - Math.round(deliveryFee * (subFrequency === 'daily' ? 0.10 : subFrequency === 'weekly' ? 0.15 : 0.20)) : deliveryFee;
  const total = subtotal + effectiveDeliveryFee;

  const SUBSCRIPTION_OPTIONS: { key: 'daily' | 'weekly' | 'monthly'; label: string; icon: string; desc: string; savings: string }[] = [
    { key: 'daily', label: 'Daily', icon: 'calendar-today', desc: 'Fresh delivery every day', savings: 'Save 10% on delivery' },
    { key: 'weekly', label: 'Weekly', icon: 'calendar-week', desc: 'Once a week, pick your day', savings: 'Save 15% on delivery' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar-month', desc: '4 deliveries per month', savings: 'Save 20% on delivery' },
  ];

  const subDiscount = orderType === 'subscribe' ? (subFrequency === 'daily' ? 0.10 : subFrequency === 'weekly' ? 0.15 : 0.20) : 0;
  const subDeliverySaving = Math.round(deliveryFee * subDiscount);

  const deliveryLabel = useMemo(() => {
    const base = deliveryMode === 'now'
      ? (deliverySlotsData.find(s => s.id === selectedSlot)?.label || 'ASAP')
      : `${SCHEDULE_DATES.find(d => d.key === scheduleDate)?.label || ''} ${TIME_SLOTS.find(t => t.id === scheduleTime)?.label || ''}`;
    if (orderType === 'subscribe') return `${base} (${subFrequency.charAt(0).toUpperCase() + subFrequency.slice(1)} subscription)`;
    return base;
  }, [deliveryMode, selectedSlot, scheduleDate, scheduleTime, orderType, subFrequency]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setPlacing(true);
    try {
      const subscriptionData: Subscription | undefined = orderType === 'subscribe' ? {
        frequency: subFrequency,
        preferredTime: TIME_SLOTS.find(t => t.id === subTimeSlot)?.label || '',
        startDate: subStartDate,
        weeklyDay: subFrequency === 'weekly' ? subWeeklyDay : undefined,
        monthlyDates: subFrequency === 'monthly' ? subMonthlyDates : undefined,
        status: 'active',
      } : undefined;
      const order = await createOrder({
        items: cartItems, subtotal, cuttingCharges: cuttingTotal, deliveryFee: effectiveDeliveryFee, discount: 0,
        deliverySlot: deliveryLabel, deliveryAddress: address, specialNote: orderNote || undefined,
        subscription: subscriptionData,
      });
      clearCart();
      const msg = orderType === 'subscribe'
        ? `Order #${order.id} placed with ${subFrequency} subscription! Your first delivery starts ${SCHEDULE_DATES.find(d => d.key === subStartDate)?.label || 'soon'}.`
        : `Order #${order.id} has been placed successfully. Your fresh-cut items will be ready soon!`;
      Alert.alert(orderType === 'subscribe' ? 'Subscribed!' : 'Order Placed!', msg,
        [{ text: 'View Order', onPress: () => router.replace({ pathname: '/order-detail', params: { id: order.id } }) }]);
    } catch { Alert.alert('Error', 'Failed to place order. Please try again.'); }
    finally { setPlacing(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={COLORS.gradient.header} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={COLORS.text.primary} /></TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Address */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Icon name="map-marker" size={20} color={COLORS.primary} /><Text style={styles.sectionTitle}>Delivery Address</Text></View>
          <TextInput style={styles.addressInput} value={address} onChangeText={setAddress} multiline numberOfLines={2} />
        </View>

        {/* Delivery Mode Toggle */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Icon name="clock-outline" size={20} color={COLORS.primary} /><Text style={styles.sectionTitle}>Delivery Time</Text></View>
          <View style={styles.modeToggle}>
            <TouchableOpacity style={[styles.modeBtn, deliveryMode === 'now' && styles.modeBtnActive]} onPress={() => setDeliveryMode('now')}>
              <Icon name="lightning-bolt" size={18} color={deliveryMode === 'now' ? '#FFF' : COLORS.text.secondary} />
              <Text style={[styles.modeBtnText, deliveryMode === 'now' && styles.modeBtnTextActive]}>Deliver Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, deliveryMode === 'scheduled' && styles.modeBtnActive]} onPress={() => setDeliveryMode('scheduled')}>
              <Icon name="calendar-clock" size={18} color={deliveryMode === 'scheduled' ? '#FFF' : COLORS.text.secondary} />
              <Text style={[styles.modeBtnText, deliveryMode === 'scheduled' && styles.modeBtnTextActive]}>Schedule</Text>
            </TouchableOpacity>
          </View>

          {deliveryMode === 'now' ? (
            <>
              {deliverySlotsData.map(slot => {
                const isActive = selectedSlot === slot.id;
                return (
                  <TouchableOpacity key={slot.id} style={[styles.slotRow, isActive && styles.slotRowActive]} onPress={() => setSelectedSlot(slot.id)}>
                    <Icon name={slot.icon as any} size={20} color={isActive ? COLORS.primary : COLORS.text.muted} />
                    <View style={{ flex: 1 }}><Text style={[styles.slotLabel, isActive && styles.slotLabelActive]}>{slot.label}</Text><Text style={styles.slotSub}>{slot.sub}</Text></View>
                    {isActive && <Icon name="check-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <>
              <Text style={styles.scheduleLabel}>Select Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {SCHEDULE_DATES.map(d => {
                  const isActive = scheduleDate === d.key;
                  return (
                    <TouchableOpacity key={d.key} style={[styles.dateChip, isActive && styles.dateChipActive]} onPress={() => setScheduleDate(d.key)}>
                      <Text style={[styles.dateChipLabel, isActive && styles.dateChipLabelActive]}>{d.label}</Text>
                      <Text style={[styles.dateChipSub, isActive && styles.dateChipSubActive]}>{d.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.scheduleLabel}>Select Time Slot</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map(t => {
                  const isActive = scheduleTime === t.id;
                  return (
                    <TouchableOpacity key={t.id} style={[styles.timeChip, isActive && styles.timeChipActive]} onPress={() => setScheduleTime(t.id)}>
                      <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Subscription */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Icon name="repeat" size={20} color={COLORS.primary} /><Text style={styles.sectionTitle}>Order Frequency</Text></View>
          <View style={styles.modeToggle}>
            <TouchableOpacity style={[styles.modeBtn, orderType === 'once' && styles.modeBtnActive]} onPress={() => setOrderType('once')}>
              <Icon name="numeric-1-circle" size={18} color={orderType === 'once' ? '#FFF' : COLORS.text.secondary} />
              <Text style={[styles.modeBtnText, orderType === 'once' && styles.modeBtnTextActive]}>One-time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, orderType === 'subscribe' && styles.subBtnActive]} onPress={() => setOrderType('subscribe')}>
              <Icon name="autorenew" size={18} color={orderType === 'subscribe' ? '#FFF' : COLORS.text.secondary} />
              <Text style={[styles.modeBtnText, orderType === 'subscribe' && styles.modeBtnTextActive]}>Subscribe</Text>
            </TouchableOpacity>
          </View>
          {orderType === 'subscribe' && (
            <>
              <View style={styles.subInfoBanner}>
                <Icon name="star-circle" size={16} color="#F57C00" />
                <Text style={styles.subInfoText}>Subscribe & save on every delivery!</Text>
              </View>
              {SUBSCRIPTION_OPTIONS.map(opt => {
                const isActive = subFrequency === opt.key;
                return (
                  <TouchableOpacity key={opt.key} style={[styles.subOption, isActive && styles.subOptionActive]} onPress={() => setSubFrequency(opt.key)}>
                    <View style={[styles.subIconWrap, isActive && styles.subIconWrapActive]}>
                      <Icon name={opt.icon as any} size={22} color={isActive ? '#FFF' : COLORS.text.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subOptionLabel, isActive && styles.subOptionLabelActive]}>{opt.label}</Text>
                      <Text style={styles.subOptionDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.subSavingsBadge, isActive && styles.subSavingsBadgeActive]}>
                      <Text style={[styles.subSavingsText, isActive && styles.subSavingsTextActive]}>{opt.savings}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Weekly: Pick a day */}
              {subFrequency === 'weekly' && (
                <>
                  <Text style={styles.scheduleLabel}>Delivery Day</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                    {WEEK_DAYS.map(day => {
                      const isActive = subWeeklyDay === day;
                      return (
                        <TouchableOpacity key={day} style={[styles.dayChip, isActive && styles.dayChipActive]} onPress={() => setSubWeeklyDay(day)}>
                          <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Monthly: Pick dates */}
              {subFrequency === 'monthly' && (
                <>
                  <Text style={styles.scheduleLabel}>Delivery Dates (tap to select)</Text>
                  <View style={styles.timeGrid}>
                    {MONTHLY_DATE_OPTIONS.map(date => {
                      const isActive = subMonthlyDates.includes(date);
                      return (
                        <TouchableOpacity key={date} style={[styles.dayChip, isActive && styles.dayChipActive]} onPress={() => {
                          setSubMonthlyDates(prev => isActive ? prev.filter(d => d !== date) : [...prev, date].sort((a, b) => a - b));
                        }}>
                          <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>{date}{date === 1 ? 'st' : date === 2 ? 'nd' : date === 3 ? 'rd' : 'th'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Start Date */}
              <Text style={styles.scheduleLabel}>Start From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {SCHEDULE_DATES.map(d => {
                  const isActive = subStartDate === d.key;
                  return (
                    <TouchableOpacity key={d.key} style={[styles.dateChip, isActive && styles.dateChipActive]} onPress={() => setSubStartDate(d.key)}>
                      <Text style={[styles.dateChipLabel, isActive && styles.dateChipLabelActive]}>{d.label}</Text>
                      <Text style={[styles.dateChipSub, isActive && styles.dateChipSubActive]}>{d.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Preferred Time */}
              <Text style={styles.scheduleLabel}>Preferred Time</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map(t => {
                  const isActive = subTimeSlot === t.id;
                  return (
                    <TouchableOpacity key={t.id} style={[styles.timeChip, isActive && styles.timeChipActive]} onPress={() => setSubTimeSlot(t.id)}>
                      <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Summary Card */}
              <View style={styles.subSummaryCard}>
                <View style={styles.subSummaryHeader}>
                  <Icon name="check-decagram" size={18} color={COLORS.primary} />
                  <Text style={styles.subSummaryTitle}>Subscription Summary</Text>
                </View>
                <View style={styles.subSummaryRow}><Text style={styles.subSummaryLabel}>Frequency</Text><Text style={styles.subSummaryValue}>{subFrequency.charAt(0).toUpperCase() + subFrequency.slice(1)}</Text></View>
                {subFrequency === 'weekly' && <View style={styles.subSummaryRow}><Text style={styles.subSummaryLabel}>Every</Text><Text style={styles.subSummaryValue}>{subWeeklyDay}</Text></View>}
                {subFrequency === 'monthly' && <View style={styles.subSummaryRow}><Text style={styles.subSummaryLabel}>On dates</Text><Text style={styles.subSummaryValue}>{subMonthlyDates.join(', ')}</Text></View>}
                <View style={styles.subSummaryRow}><Text style={styles.subSummaryLabel}>Starts</Text><Text style={styles.subSummaryValue}>{SCHEDULE_DATES.find(d => d.key === subStartDate)?.label || ''}</Text></View>
                <View style={styles.subSummaryRow}><Text style={styles.subSummaryLabel}>Time</Text><Text style={styles.subSummaryValue}>{TIME_SLOTS.find(t => t.id === subTimeSlot)?.label || ''}</Text></View>
                <View style={styles.subSummaryRow}><Text style={styles.subSummaryLabel}>Savings</Text><Text style={[styles.subSummaryValue, { color: '#F57C00' }]}>{subFrequency === 'daily' ? '10%' : subFrequency === 'weekly' ? '15%' : '20%'} off delivery</Text></View>
              </View>

              <View style={styles.subNote}>
                <Icon name="information-outline" size={14} color={COLORS.text.muted} />
                <Text style={styles.subNoteText}>You can pause or cancel anytime from your profile</Text>
              </View>
            </>
          )}
        </View>

        {/* Items */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Icon name="clipboard-list" size={20} color={COLORS.primary} /><Text style={styles.sectionTitle}>Order Items ({cartItems.length})</Text></View>
          {cartItems.map((item, idx) => (
            <View key={idx} style={styles.orderItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderItemName}>{item.name} x{item.quantity}</Text>
                {item.cutType && <Text style={styles.orderItemCut}>{getCutLabel(item.cutType)} (+{'\u20B9'}{getCutFee(item.cutType)})</Text>}
                {item.specialInstructions && <Text style={styles.orderItemInstr}>{item.specialInstructions}</Text>}
              </View>
              <Text style={styles.orderItemPrice}>{'\u20B9'}{(() => { let b = item.price; if (item.selectedWeight && item.unit.includes('kg')) b = Math.round((item.price * item.selectedWeight) / 1000); return b * item.quantity + getCutFee(item.cutType) * item.quantity; })()}</Text>
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Icon name="note-text" size={20} color={COLORS.primary} /><Text style={styles.sectionTitle}>Order Note</Text></View>
          <TextInput style={styles.noteInput} placeholder='"Ring the bell twice", "Leave at door"' placeholderTextColor={COLORS.text.muted} value={orderNote} onChangeText={setOrderNote} multiline />
        </View>

        {/* Bill */}
        <View style={styles.sectionCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>
          <View style={styles.billRow}><Text style={styles.billLabel}>Items Total</Text><Text style={styles.billValue}>{'\u20B9'}{subtotal - cuttingTotal}</Text></View>
          {cuttingTotal > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Cutting Charges</Text><Text style={[styles.billValue, { color: COLORS.primary }]}>{'\u20B9'}{cuttingTotal}</Text></View>}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            {orderType === 'subscribe' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: COLORS.text.muted, textDecorationLine: 'line-through' }}>{'\u20B9'}{deliveryFee}</Text>
                <Text style={[styles.billValue, { color: COLORS.primary }]}>{'\u20B9'}{effectiveDeliveryFee}</Text>
              </View>
            ) : (
              <Text style={styles.billValue}>{'\u20B9'}{deliveryFee}</Text>
            )}
          </View>
          {orderType === 'subscribe' && (
            <View style={styles.billRow}><Text style={[styles.billLabel, { color: '#F57C00' }]}>Subscription Savings</Text><Text style={[styles.billValue, { color: '#F57C00' }]}>-{'\u20B9'}{deliveryFee - effectiveDeliveryFee}</Text></View>
          )}
          <View style={[styles.billRow, styles.billTotal]}><Text style={styles.billTotalLabel}>Total</Text><Text style={styles.billTotalValue}>{'\u20B9'}{total}</Text></View>
        </View>

        {/* Payment */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}><Icon name="credit-card" size={20} color={COLORS.primary} /><Text style={styles.sectionTitle}>Payment</Text></View>
          {([{ key: 'cod' as const, label: 'Cash on Delivery', icon: 'cash' }, { key: 'upi' as const, label: 'UPI Payment', icon: 'cellphone' }]).map(p => (
            <TouchableOpacity key={p.key} style={[styles.paymentRow, payment === p.key && styles.paymentRowActive]} onPress={() => setPayment(p.key)}>
              <Icon name={p.icon as any} size={20} color={payment === p.key ? COLORS.primary : COLORS.text.muted} />
              <Text style={[styles.paymentLabel, payment === p.key && styles.paymentLabelActive]}>{p.label}</Text>
              {payment === p.key && <Icon name="check-circle" size={20} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.orderBar}>
        <View><Text style={styles.orderBarTotal}>{'\u20B9'}{total}</Text><Text style={styles.orderBarSub}>{cartItems.length} items | {deliveryLabel}</Text></View>
        <TouchableOpacity style={[styles.orderBarBtn, placing && { opacity: 0.6 }]} onPress={handlePlaceOrder} disabled={placing}>
          <Icon name="cart-check" size={20} color="#FFF" /><Text style={styles.orderBarBtnText}>{placing ? 'Placing...' : orderType === 'subscribe' ? 'Subscribe & Order' : 'Place Order'}</Text>
        </TouchableOpacity>
      </View>
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
  sectionCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  addressInput: { backgroundColor: '#F7F7F7', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 13, color: COLORS.text.primary, borderWidth: 1, borderColor: COLORS.border },
  // Delivery Mode Toggle
  modeToggle: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  modeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  modeBtnTextActive: { color: '#FFF' },
  // Immediate slots
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, marginBottom: 4 },
  slotRowActive: { backgroundColor: '#E8F5E9' },
  slotLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  slotLabelActive: { color: COLORS.primary },
  slotSub: { fontSize: 11, color: COLORS.text.muted },
  // Schedule
  scheduleLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, marginBottom: 8, marginTop: 4 },
  dateRow: { gap: 8, paddingBottom: 4 },
  dateChip: { width: 80, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  dateChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  dateChipLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  dateChipLabelActive: { color: COLORS.primary },
  dateChipSub: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  dateChipSubActive: { color: COLORS.primary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  timeChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  timeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text.secondary },
  timeChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  // Order items
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderItemName: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  orderItemCut: { fontSize: 10, color: COLORS.primary, marginTop: 2 },
  orderItemInstr: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  orderItemPrice: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  noteInput: { backgroundColor: '#F7F7F7', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 13, color: COLORS.text.primary, borderWidth: 1, borderColor: COLORS.border, minHeight: 50 },
  billTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billLabel: { fontSize: 13, color: COLORS.text.secondary },
  billValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  billTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 10 },
  billTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  billTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, marginBottom: 4 },
  paymentRowActive: { backgroundColor: '#E8F5E9' },
  paymentLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text.secondary },
  paymentLabelActive: { color: COLORS.primary },
  orderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.floating },
  orderBarTotal: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  orderBarSub: { fontSize: 10, color: COLORS.text.muted },
  orderBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 14 },
  orderBarBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  // Subscription
  subBtnActive: { borderColor: '#F57C00', backgroundColor: '#F57C00' },
  subInfoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', borderRadius: RADIUS.md, padding: 10, marginBottom: SPACING.md },
  subInfoText: { fontSize: 12, fontWeight: '700', color: '#F57C00' },
  subOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, marginBottom: 6, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  subOptionActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  subIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  subIconWrapActive: { backgroundColor: COLORS.primary },
  subOptionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary },
  subOptionLabelActive: { color: COLORS.primary },
  subOptionDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  subSavingsBadge: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 3 },
  subSavingsBadgeActive: { backgroundColor: '#E8F5E9' },
  subSavingsText: { fontSize: 9, fontWeight: '700', color: '#F57C00' },
  subSavingsTextActive: { color: COLORS.primary },
  subNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 4 },
  subNoteText: { fontSize: 11, color: COLORS.text.muted },
  dayChip: { width: 48, height: 40, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  dayChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  dayChipText: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  dayChipTextActive: { color: COLORS.primary },
  subSummaryCard: { backgroundColor: '#F0FAF0', borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md, borderWidth: 1, borderColor: '#C8E6C9' },
  subSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  subSummaryTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  subSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  subSummaryLabel: { fontSize: 12, color: COLORS.text.muted },
  subSummaryValue: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
});
