import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput, Alert, Platform, Modal, Image } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { useWallet } from '@/context/WalletContext';
import { useDiet } from '@/context/DietContext';
import { useLoyalty, POINTS_PER_RUPEE } from '@/context/LoyaltyContext';
import { getCutLabel, getCutFee } from '@/data/cutTypes';
import deliverySlotsData from '@/data/deliverySlots.json';
import products from '@/data/products.json';
import { DISH_PACKS } from '@/data/dishPacks';
import type { Subscription, PaymentMethod, WeekDay, WeeklyPlan } from '@/types';

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

// Weekly Plan Setup Modal Styles
const wpStyles = StyleSheet.create({
  summaryBanner: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E3F2FD', borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md },
  infoText: { flex: 1, fontSize: 12, color: '#1565C0', lineHeight: 17 },
  dayTabsContainer: { gap: 8, paddingVertical: 2 },
  dayTab: { width: 56, height: 64, borderRadius: RADIUS.md, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
  dayTabActive: { backgroundColor: COLORS.primary },
  dayTabInactive: { backgroundColor: '#F5F5F5', opacity: 0.7 },
  dayTabText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  dayTabTextActive: { color: '#FFF' },
  dayTabTextInactive: { color: '#BDBDBD' },
  dayBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  dayBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  dayBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  dayBadgeTextActive: { color: '#FFF' },
  dayCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  dayCardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  dayCardSub: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA' },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#999' },
  toggleBtnTextActive: { color: '#FFF' },
  emptyDay: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyDayText: { fontSize: 13, color: COLORS.text.muted, marginTop: SPACING.sm },
  addFromCartBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10, marginTop: SPACING.md },
  addFromCartBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemImage: { width: 44, height: 44, borderRadius: 10 },
  itemName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  itemUnit: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  cutBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3, alignSelf: 'flex-start' },
  cutBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.sm },
  quickActionText: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  overviewCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  overviewTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  overviewDayBadge: { width: 40, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  overviewDayBadgeActive: { backgroundColor: '#E8F5E9' },
  overviewDayBadgeOff: { backgroundColor: '#F5F5F5' },
  overviewDayText: { fontSize: 11, fontWeight: '700', color: '#BDBDBD' },
  overviewDayTextActive: { color: COLORS.primary },
  overviewInfo: { flex: 1, fontSize: 12, color: COLORS.text.muted },
  detailsCard: { backgroundColor: '#F0FAF0', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#C8E6C9' },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  detailsTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
  detailsLabel: { fontSize: 12, color: COLORS.text.muted },
  detailsValue: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  // Add action buttons row
  addActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  addActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  addActionBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  // Product picker
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  pickerSelectedCount: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.base, paddingVertical: 8, backgroundColor: '#E8F5E9' },
  pickerCountText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerRowSelected: { backgroundColor: '#E8F5E9' },
  pickerImage: { width: 44, height: 44, borderRadius: 10 },
  pickerCheckbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  pickerCheckboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickerBottomBar: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  pickerConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 14 },
  pickerConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  // Pack picker
  packPickerSubtitle: { fontSize: 12, color: COLORS.text.muted, paddingHorizontal: SPACING.base, paddingTop: 8, paddingBottom: 4 },
  packCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  packImage: { width: 70, height: 70, borderRadius: 12 },
  packName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  packTag: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  packTagText: { fontSize: 9, fontWeight: '700', color: '#F57C00' },
  packDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  packItems: { fontSize: 10, color: COLORS.text.secondary, marginTop: 3, lineHeight: 14 },
  packPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  packServes: { fontSize: 10, color: COLORS.text.muted },
  packItemCount: { fontSize: 10, fontWeight: '600', color: COLORS.text.secondary, backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
});

// Quick Action Button Styles
const qaStyles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: 4, backgroundColor: 'transparent' },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#C8E6C9' },
  subBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8E1', borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#FFE082' },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#C8E6C9', justifyContent: 'center', alignItems: 'center' },
  iconWrapSub: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFE082', justifyContent: 'center', alignItems: 'center' },
  btnLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  btnSub: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
});

export default function CheckoutScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { cartItems, getSubtotal, getCuttingTotal, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { balance: walletBalance, deductFunds } = useWallet();

  const [deliveryMode, setDeliveryMode] = useState<'now' | 'scheduled'>('now');
  const [selectedSlot, setSelectedSlot] = useState(deliverySlotsData[0].id);
  const [scheduleDate, setScheduleDate] = useState(SCHEDULE_DATES[1].key);
  const [scheduleTime, setScheduleTime] = useState(TIME_SLOTS[0].id);
  const SAVED_ADDRESSES = [
    { id: 'addr1', label: 'Home', address: '42, Anna Nagar, Coimbatore', icon: 'home' as const },
    { id: 'addr2', label: 'Work', address: '15, RS Puram, Coimbatore', icon: 'office-building' as const },
    { id: 'addr3', label: 'Other', address: '8, Gandhipuram, Coimbatore', icon: 'map-marker' as const },
  ];
  const [selectedAddressId, setSelectedAddressId] = useState('addr1');
  const address = SAVED_ADDRESSES.find(a => a.id === selectedAddressId)?.address || SAVED_ADDRESSES[0].address;
  const [orderNote, setOrderNote] = useState('');
  const [payment, setPayment] = useState<'cod' | 'upi' | 'wallet'>('cod');
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderType, setOrderType] = useState<'once' | 'subscribe'>('once');
  const [subFrequency, setSubFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [subWeeklyDay, setSubWeeklyDay] = useState('Mon');
  const [subMonthlyDates, setSubMonthlyDates] = useState<number[]>([1]);
  const [subStartDate, setSubStartDate] = useState(SCHEDULE_DATES[1].key);
  const [subTimeSlot, setSubTimeSlot] = useState(TIME_SLOTS[0].id);

  const { familyMembers } = useDiet();
  const { earnPoints } = useLoyalty();
  const [deliveryTip, setDeliveryTip] = useState(0);
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [isGiftOrder, setIsGiftOrder] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftPhone, setGiftPhone] = useState('');

  // Weekly Plan Setup Modal State
  const PLAN_WEEKDAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const PLAN_DAY_LABELS: Record<WeekDay, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
    Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
  };
  const [showWeeklyPlanModal, setShowWeeklyPlanModal] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() => {
    const plan = {} as WeeklyPlan;
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as WeekDay[]) {
      plan[day] = { day, items: [], isActive: true };
    }
    return plan;
  });
  const [planSelectedDay, setPlanSelectedDay] = useState<WeekDay>('Mon');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const confirmProductSelection = useCallback(() => {
    const newItems = Array.from(selectedProductIds).map(id => {
      const product = (products as any[]).find(p => p.id === id);
      return {
        productId: id,
        name: product?.name || 'Unknown',
        quantity: 1,
        unit: product?.unit || '1 kg',
      };
    });
    setWeeklyPlan(prev => {
      const existing = prev[planSelectedDay].items;
      const existingIds = new Set(existing.map(i => i.productId));
      const toAdd = newItems.filter(i => !existingIds.has(i.productId));
      return {
        ...prev,
        [planSelectedDay]: { ...prev[planSelectedDay], items: [...existing, ...toAdd] },
      };
    });
    setSelectedProductIds(new Set());
    setShowProductPicker(false);
  }, [selectedProductIds, planSelectedDay]);

  const addPackToDay = useCallback((pack: typeof DISH_PACKS[0]) => {
    const packItems = pack.items.map(pi => {
      const product = (products as any[]).find(p => p.id === pi.productId);
      return {
        productId: pi.productId,
        name: product?.name || 'Unknown',
        quantity: pi.quantity,
        unit: product?.unit || '1 kg',
      };
    });
    setWeeklyPlan(prev => {
      const existing = prev[planSelectedDay].items;
      const existingIds = new Set(existing.map(i => i.productId));
      const toAdd = packItems.filter(i => !existingIds.has(i.productId));
      return {
        ...prev,
        [planSelectedDay]: {
          ...prev[planSelectedDay],
          items: [...existing, ...toAdd],
          packId: pack.id,
          packName: pack.name,
        },
      };
    });
    setShowPackPicker(false);
  }, [planSelectedDay]);

  const initWeeklyPlanFromCart = useCallback(() => {
    const plan = {} as WeeklyPlan;
    const cartPlanItems = cartItems.map(item => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      cutType: item.cutType,
    }));
    for (const day of PLAN_WEEKDAYS) {
      // For weekly: only enable the selected day by default
      // For monthly/daily: enable all days
      const isActive = subFrequency === 'weekly' ? day === subWeeklyDay : true;
      plan[day] = { day, items: isActive ? [...cartPlanItems] : [], isActive };
    }
    setWeeklyPlan(plan);
    setPlanSelectedDay(subFrequency === 'weekly' ? (subWeeklyDay as WeekDay) : 'Mon');
  }, [cartItems, subFrequency, subWeeklyDay]);

  const togglePlanDay = useCallback((day: WeekDay) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], isActive: !prev[day].isActive },
    }));
  }, []);

  const updatePlanItemQty = useCallback((day: WeekDay, index: number, delta: number) => {
    setWeeklyPlan(prev => {
      const items = [...prev[day].items];
      const newQty = items[index].quantity + delta;
      if (newQty < 1) return prev;
      items[index] = { ...items[index], quantity: newQty };
      return { ...prev, [day]: { ...prev[day], items } };
    });
  }, []);

  const removePlanItem = useCallback((day: WeekDay, index: number) => {
    setWeeklyPlan(prev => {
      const items = [...prev[day].items];
      items.splice(index, 1);
      return { ...prev, [day]: { ...prev[day], items } };
    });
  }, []);

  const copyPlanToAllDays = useCallback((fromDay: WeekDay) => {
    setWeeklyPlan(prev => {
      const updated = { ...prev };
      for (const day of PLAN_WEEKDAYS) {
        if (day !== fromDay && updated[day].isActive) {
          updated[day] = { ...prev[fromDay], day, isActive: true };
        }
      }
      return updated;
    });
  }, []);

  const planActiveDays = useMemo(() =>
    PLAN_WEEKDAYS.filter(d => weeklyPlan[d].isActive).length
  , [weeklyPlan]);

  const planCurrentDayItems = weeklyPlan[planSelectedDay];

  const TIP_OPTIONS = [0, 10, 20, 30, 50];

  const subtotal = getSubtotal();
  const cuttingTotal = getCuttingTotal();
  const deliveryFee = 25;
  const effectiveDeliveryFee = orderType === 'subscribe' ? deliveryFee - Math.round(deliveryFee * (subFrequency === 'daily' ? 0.10 : subFrequency === 'weekly' ? 0.15 : 0.20)) : deliveryFee;
  const total = subtotal + effectiveDeliveryFee;

  // Wallet calculations
  const walletApplicable = payment === 'wallet' || useWalletBalance;
  const walletDeduction = walletApplicable ? Math.min(walletBalance, total) : 0;
  const remainingToPay = total - walletDeduction;
  const walletCoversAll = walletDeduction >= total;

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

    // Show weekly plan setup modal for subscription orders before placing
    if (orderType === 'subscribe' && !showWeeklyPlanModal) {
      initWeeklyPlanFromCart();
      setShowWeeklyPlanModal(true);
      return;
    }

    setPlacing(true);
    try {
      // Deduct wallet if applicable
      if (walletDeduction > 0) {
        const success = await deductFunds(walletDeduction, 'Order Payment', `Wallet payment for order`, undefined);
        if (!success) {
          Alert.alert('Wallet Error', 'Insufficient wallet balance. Please try again.');
          setPlacing(false);
          return;
        }
      }

      // Determine payment method
      let paymentMethod: PaymentMethod = payment === 'wallet' ? 'wallet' : payment;
      if (useWalletBalance && payment !== 'wallet') {
        paymentMethod = walletCoversAll ? 'wallet' : 'wallet_partial';
      }

      const subscriptionData: Subscription | undefined = orderType === 'subscribe' ? {
        frequency: subFrequency,
        preferredTime: TIME_SLOTS.find(t => t.id === subTimeSlot)?.label || '',
        startDate: subStartDate,
        weeklyDay: subFrequency === 'weekly' ? subWeeklyDay : undefined,
        monthlyDates: subFrequency === 'monthly' ? subMonthlyDates : undefined,
        status: 'active',
        skippedDeliveries: [],
        cutoffHours: 10,
        weeklyPlan: orderType === 'subscribe' ? weeklyPlan : undefined,
      } : undefined;
      const order = await createOrder({
        items: cartItems, subtotal, cuttingCharges: cuttingTotal, deliveryFee: effectiveDeliveryFee, discount: 0,
        deliverySlot: deliveryLabel, deliveryAddress: address, specialNote: orderNote || undefined,
        subscription: subscriptionData,
        paymentMethod,
        walletAmountUsed: walletDeduction > 0 ? walletDeduction : undefined,
      });
      clearCart();
      setShowWeeklyPlanModal(false);
      await earnPoints(Math.floor(total * POINTS_PER_RUPEE), `Order #${order.id}`, order.id);
      const walletMsg = walletDeduction > 0 ? ` ₹${walletDeduction} paid from wallet.` : '';
      const remainMsg = remainingToPay > 0 && walletDeduction > 0 ? ` ₹${remainingToPay} via ${payment === 'upi' ? 'UPI' : 'Cash on Delivery'}.` : '';
      const msg = orderType === 'subscribe'
        ? `Order #${order.id} placed with ${subFrequency} subscription!${walletMsg}${remainMsg} Your first delivery starts ${SCHEDULE_DATES.find(d => d.key === subStartDate)?.label || 'soon'}.`
        : `Order #${order.id} has been placed successfully.${walletMsg}${remainMsg} Your fresh-cut items will be ready soon!`;
      Alert.alert(orderType === 'subscribe' ? 'Subscribed!' : 'Order Placed!', msg,
        [{ text: 'View Order', onPress: () => router.replace({ pathname: '/order-confirmation', params: { orderId: order.id, total: String(total) } } as any) }]);
    } catch { Alert.alert('Error', 'Failed to place order. Please try again.'); }
    finally { setPlacing(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={themed.colors.text.primary} /></TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Checkout</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Address Selection */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}><Icon name="map-marker" size={20} color={COLORS.primary} /><Text style={[styles.sectionTitle, themed.textPrimary]}>Delivery Address</Text></View>
          {SAVED_ADDRESSES.map(addr => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <TouchableOpacity key={addr.id} style={[styles.addressOption, isSelected && styles.addressOptionActive]} onPress={() => setSelectedAddressId(addr.id)}>
                <View style={[styles.addressIconWrap, isSelected && styles.addressIconWrapActive]}>
                  <Icon name={addr.icon} size={18} color={isSelected ? '#FFF' : COLORS.text.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressLabel, isSelected && styles.addressLabelActive]}>{addr.label}</Text>
                  <Text style={styles.addressText} numberOfLines={1}>{addr.address}</Text>
                </View>
                {isSelected && <Icon name="check-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addAddressBtn} onPress={() => router.push('/addresses' as any)}>
            <Icon name="plus" size={16} color={COLORS.primary} />
            <Text style={styles.addAddressBtnText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Mode Toggle */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}><Icon name="clock-outline" size={20} color={COLORS.primary} /><Text style={[styles.sectionTitle, themed.textPrimary]}>Delivery Time</Text></View>
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
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}><Icon name="repeat" size={20} color={COLORS.primary} /><Text style={[styles.sectionTitle, themed.textPrimary]}>Order Frequency</Text></View>
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
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}><Icon name="clipboard-list" size={20} color={COLORS.primary} /><Text style={[styles.sectionTitle, themed.textPrimary]}>Order Items ({cartItems.length})</Text></View>
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
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}><Icon name="note-text" size={20} color={COLORS.primary} /><Text style={[styles.sectionTitle, themed.textPrimary]}>Order Note</Text></View>
          <View style={styles.quickNoteChipsRow}>
            {['Ring the bell', 'Leave at door', 'Call before delivery', 'No plastic bags', 'Handle with care', 'Evening preferred'].map(chip => (
              <TouchableOpacity
                key={chip}
                style={[styles.quickNoteChip, orderNote.includes(chip) && styles.quickNoteChipActive]}
                onPress={() => {
                  if (orderNote.includes(chip)) {
                    setOrderNote(prev => prev.replace(chip, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim());
                  } else {
                    setOrderNote(prev => prev ? `${prev}, ${chip}` : chip);
                  }
                }}
              >
                <Text style={[styles.quickNoteChipText, orderNote.includes(chip) && styles.quickNoteChipTextActive]}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.noteInput, themed.inputBg]} placeholder='"Ring the bell twice", "Leave at door"' placeholderTextColor={COLORS.text.muted} value={orderNote} onChangeText={setOrderNote} multiline />
        </View>

        {/* Bill */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.billTitle, themed.textPrimary]}>Bill Summary</Text>
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
          {walletDeduction > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: COLORS.green }]}>Wallet Payment</Text>
              <Text style={[styles.billValue, { color: COLORS.green }]}>-{'\u20B9'}{walletDeduction}</Text>
            </View>
          )}
          {deliveryTip > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Tip</Text><Text style={styles.billValue}>₹{deliveryTip}</Text></View>}
          <View style={[styles.billRow, styles.billTotal]}>
            <Text style={styles.billTotalLabel}>{walletDeduction > 0 && remainingToPay > 0 ? 'Remaining to Pay' : 'Total'}</Text>
            <Text style={styles.billTotalValue}>{'\u20B9'}{walletDeduction > 0 ? remainingToPay : total}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}><Icon name="credit-card" size={20} color={COLORS.primary} /><Text style={[styles.sectionTitle, themed.textPrimary]}>Payment</Text></View>

          {/* Wallet Balance Banner */}
          {walletBalance > 0 && (
            <TouchableOpacity
              style={[styles.walletBanner, useWalletBalance && styles.walletBannerActive]}
              onPress={() => {
                if (payment === 'wallet') {
                  setPayment('cod');
                  setUseWalletBalance(false);
                } else {
                  setUseWalletBalance(!useWalletBalance);
                }
              }}
            >
              <Icon name="wallet" size={20} color={useWalletBalance ? COLORS.green : COLORS.text.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.walletBannerTitle, useWalletBalance && { color: COLORS.green }]}>
                  Use Wallet Balance
                </Text>
                <Text style={styles.walletBannerSub}>
                  Available: {'\u20B9'}{walletBalance}
                  {useWalletBalance && walletDeduction > 0 && ` · Using ₹${walletDeduction}`}
                </Text>
              </View>
              <View style={[styles.walletCheckbox, useWalletBalance && styles.walletCheckboxActive]}>
                {useWalletBalance && <Icon name="check" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          )}

          {/* Full wallet payment option */}
          {walletBalance >= total && (
            <TouchableOpacity
              style={[styles.paymentRow, payment === 'wallet' && styles.paymentRowActive]}
              onPress={() => { setPayment('wallet'); setUseWalletBalance(true); }}
            >
              <Icon name="wallet" size={20} color={payment === 'wallet' ? COLORS.green : COLORS.text.muted} />
              <Text style={[styles.paymentLabel, payment === 'wallet' && { color: COLORS.green }]}>Pay Full with Wallet ({'\u20B9'}{total})</Text>
              {payment === 'wallet' && <Icon name="check-circle" size={20} color={COLORS.green} />}
            </TouchableOpacity>
          )}

          {/* Remaining payment methods */}
          {(!walletCoversAll || !useWalletBalance) && (
            <>
              {useWalletBalance && remainingToPay > 0 && (
                <Text style={styles.remainingLabel}>Pay remaining {'\u20B9'}{remainingToPay} via:</Text>
              )}
              {([
                { key: 'cod' as const, label: 'Cash on Delivery', icon: 'cash' },
                { key: 'upi' as const, label: 'UPI Payment', icon: 'cellphone' },
              ]).map(p => (
                <TouchableOpacity key={p.key} style={[styles.paymentRow, payment === p.key && styles.paymentRowActive]} onPress={() => setPayment(p.key)}>
                  <Icon name={p.icon as any} size={20} color={payment === p.key ? COLORS.primary : COLORS.text.muted} />
                  <Text style={[styles.paymentLabel, payment === p.key && styles.paymentLabelActive]}>{p.label}</Text>
                  {payment === p.key && <Icon name="check-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* Delivery Tip + Options */}
        <View style={[styles.extrasCard, themed.card]}>
          <View style={styles.extrasRow}>
            <Icon name="hand-heart" size={18} color={COLORS.green} />
            <Text style={[styles.extrasTitle, themed.textPrimary]}>Tip your delivery partner</Text>
          </View>
          <Text style={styles.extrasDesc}>100% of tip goes to your delivery partner</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map(t => (
              <TouchableOpacity key={t} style={[styles.tipChip, deliveryTip === t && styles.tipChipActive]} onPress={() => setDeliveryTip(t)}>
                <Text style={[styles.tipChipText, deliveryTip === t && styles.tipChipTextActive]}>{t === 0 ? 'No tip' : `₹${t}`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.extrasDivider} />

          <TouchableOpacity style={styles.extrasOptionRow} onPress={() => setContactlessDelivery(!contactlessDelivery)}>
            <Icon name="hand-wave" size={18} color={contactlessDelivery ? COLORS.green : COLORS.text.muted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.extrasOptionTitle, themed.textPrimary]}>Contactless Delivery</Text>
              <Text style={styles.extrasOptionDesc}>Leave at doorstep</Text>
            </View>
            <Icon name={contactlessDelivery ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={contactlessDelivery ? COLORS.green : COLORS.text.muted} />
          </TouchableOpacity>

          <View style={styles.extrasDivider} />

          <TouchableOpacity style={styles.extrasOptionRow} onPress={() => setIsGiftOrder(!isGiftOrder)}>
            <Icon name="gift-outline" size={18} color={isGiftOrder ? '#E91E63' : COLORS.text.muted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.extrasOptionTitle, themed.textPrimary]}>Send as Gift</Text>
            </View>
            <Icon name={isGiftOrder ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={isGiftOrder ? '#E91E63' : COLORS.text.muted} />
          </TouchableOpacity>
          {isGiftOrder && (
            <View style={styles.giftForm}>
              <TextInput style={[styles.giftInput, themed.inputBg]} placeholder="Recipient Name" value={giftRecipient} onChangeText={setGiftRecipient} placeholderTextColor={COLORS.text.muted} />
              <TextInput style={[styles.giftInput, themed.inputBg]} placeholder="Recipient Phone" value={giftPhone} onChangeText={setGiftPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.text.muted} />
              <TextInput style={[styles.giftInput, themed.inputBg]} placeholder="Gift Message (optional)" value={giftMessage} onChangeText={setGiftMessage} placeholderTextColor={COLORS.text.muted} />
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Quick Action Buttons - Wallet & Subscription */}
      {/* <View style={qaStyles.bar}>
        <TouchableOpacity style={qaStyles.walletBtn} onPress={() => router.push('/wallet' as any)}>
          <View style={qaStyles.iconWrap}>
            <Icon name="wallet" size={16} color={COLORS.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={qaStyles.btnLabel}>Wallet</Text>
            <Text style={qaStyles.btnSub}>{'\u20B9'}{walletBalance}</Text>
          </View>
          <Icon name="chevron-right" size={16} color={COLORS.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={qaStyles.subBtn} onPress={() => router.push('/subscription-manage' as any)}>
          <View style={qaStyles.iconWrapSub}>
            <Icon name="autorenew" size={16} color="#F57C00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={qaStyles.btnLabel}>Subscriptions</Text>
            <Text style={qaStyles.btnSub}>Manage Plans</Text>
          </View>
          <Icon name="chevron-right" size={16} color={COLORS.text.muted} />
        </TouchableOpacity>
      </View> */}

      <View style={[styles.orderBar, themed.card]}>
        <View><Text style={[styles.orderBarTotal, themed.textPrimary]}>{'\u20B9'}{total}</Text><Text style={styles.orderBarSub}>{cartItems.length} items | {deliveryLabel}</Text></View>
        <TouchableOpacity style={[styles.orderBarBtn, placing && { opacity: 0.6 }]} onPress={handlePlaceOrder} disabled={placing}>
          <Icon name="cart-check" size={20} color="#FFF" /><Text style={styles.orderBarBtnText}>{placing ? 'Placing...' : orderType === 'subscribe' ? 'Set Up Plan & Order' : 'Place Order'}</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Plan Setup Modal */}
      <Modal visible={showWeeklyPlanModal} animationType="slide" onRequestClose={() => setShowWeeklyPlanModal(false)}>
        <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
          <LinearGradient colors={themed.headerGradient} style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => setShowWeeklyPlanModal(false)} style={styles.backBtn}>
                <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, themed.textPrimary]}>Set Up {subFrequency === 'weekly' ? 'Weekly' : subFrequency === 'monthly' ? 'Monthly' : 'Daily'} Plan</Text>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Plan Summary Banner */}
            <LinearGradient colors={COLORS.gradient.primary} style={wpStyles.summaryBanner}>
              <View style={wpStyles.summaryRow}>
                <View style={wpStyles.summaryItem}>
                  <Icon name="calendar-check" size={20} color="#FFF" />
                  <Text style={wpStyles.summaryValue}>{planActiveDays}</Text>
                  <Text style={wpStyles.summaryLabel}>Active Days</Text>
                </View>
                <View style={wpStyles.summaryDivider} />
                <View style={wpStyles.summaryItem}>
                  <Icon name="package-variant" size={20} color="#FFF" />
                  <Text style={wpStyles.summaryValue}>{cartItems.length}</Text>
                  <Text style={wpStyles.summaryLabel}>Items</Text>
                </View>
                <View style={wpStyles.summaryDivider} />
                <View style={wpStyles.summaryItem}>
                  <Icon name="tag" size={20} color="#FFF" />
                  <Text style={wpStyles.summaryValue}>{subFrequency === 'daily' ? '10%' : subFrequency === 'weekly' ? '15%' : '20%'}</Text>
                  <Text style={wpStyles.summaryLabel}>Savings</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Info Banner */}
            <View style={wpStyles.infoBanner}>
              <Icon name="information-outline" size={16} color={COLORS.primary} />
              <Text style={wpStyles.infoText}>
                Customize your {subFrequency} delivery plan. Toggle days on/off and adjust items per day. Your cart items are pre-filled for each active day.
              </Text>
            </View>

            {/* Day Selector Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={wpStyles.dayTabsContainer} style={{ marginBottom: SPACING.md }}>
              {PLAN_WEEKDAYS.map(day => {
                const plan = weeklyPlan[day];
                const isSelected = day === planSelectedDay;
                const itemCount = plan.items.length;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[wpStyles.dayTab, isSelected && wpStyles.dayTabActive, !plan.isActive && wpStyles.dayTabInactive]}
                    onPress={() => setPlanSelectedDay(day)}
                  >
                    <Text style={[wpStyles.dayTabText, isSelected && wpStyles.dayTabTextActive, !plan.isActive && wpStyles.dayTabTextInactive]}>
                      {day}
                    </Text>
                    {plan.isActive && itemCount > 0 && (
                      <View style={[wpStyles.dayBadge, isSelected && wpStyles.dayBadgeActive]}>
                        <Text style={[wpStyles.dayBadgeText, isSelected && wpStyles.dayBadgeTextActive]}>{itemCount}</Text>
                      </View>
                    )}
                    {!plan.isActive && <Icon name="close-circle" size={12} color="#BDBDBD" style={{ marginTop: 2 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected Day Card */}
            <View style={[wpStyles.dayCard, themed.card]}>
              <View style={wpStyles.dayCardHeader}>
                <View>
                  <Text style={[wpStyles.dayCardTitle, themed.textPrimary]}>{PLAN_DAY_LABELS[planSelectedDay]}</Text>
                  <Text style={wpStyles.dayCardSub}>
                    {planCurrentDayItems.isActive
                      ? planCurrentDayItems.items.length > 0
                        ? `${planCurrentDayItems.items.length} items`
                        : 'No items - add from your cart'
                      : 'No delivery on this day'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[wpStyles.toggleBtn, planCurrentDayItems.isActive && wpStyles.toggleBtnActive]}
                  onPress={() => togglePlanDay(planSelectedDay)}
                >
                  <Icon name={planCurrentDayItems.isActive ? 'check-circle' : 'close-circle-outline'} size={16} color={planCurrentDayItems.isActive ? '#FFF' : '#999'} />
                  <Text style={[wpStyles.toggleBtnText, planCurrentDayItems.isActive && wpStyles.toggleBtnTextActive]}>
                    {planCurrentDayItems.isActive ? 'Active' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>

              {planCurrentDayItems.isActive && (
                <>
                  {/* Add Products/Packs Action Buttons */}
                  <View style={wpStyles.addActionRow}>
                    <TouchableOpacity
                      style={wpStyles.addActionBtn}
                      onPress={() => {
                        setSelectedProductIds(new Set());
                        setShowProductPicker(true);
                      }}
                    >
                      <Icon name="plus-circle" size={16} color={COLORS.primary} />
                      <Text style={wpStyles.addActionBtnText}>Add Products</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[wpStyles.addActionBtn, { borderColor: '#FFE082', backgroundColor: '#FFFDE7' }]}
                      onPress={() => setShowPackPicker(true)}
                    >
                      <Icon name="package-variant" size={16} color="#F57C00" />
                      <Text style={[wpStyles.addActionBtnText, { color: '#F57C00' }]}>Add Pack</Text>
                    </TouchableOpacity>
                    {cartItems.length > 0 && (
                      <TouchableOpacity
                        style={[wpStyles.addActionBtn, { borderColor: '#C8E6C9', backgroundColor: '#E8F5E9' }]}
                        onPress={() => {
                          const cartPlanItems = cartItems.map(item => ({
                            productId: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                            cutType: item.cutType,
                          }));
                          setWeeklyPlan(prev => {
                            const existing = prev[planSelectedDay].items;
                            const existingIds = new Set(existing.map(i => i.productId));
                            const toAdd = cartPlanItems.filter(i => !existingIds.has(i.productId));
                            return {
                              ...prev,
                              [planSelectedDay]: { ...prev[planSelectedDay], items: [...existing, ...toAdd] },
                            };
                          });
                        }}
                      >
                        <Icon name="cart-plus" size={16} color={COLORS.green} />
                        <Text style={[wpStyles.addActionBtnText, { color: COLORS.green }]}>From Cart</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {planCurrentDayItems.items.length === 0 && (
                    <View style={wpStyles.emptyDay}>
                      <Icon name="cart-outline" size={32} color={COLORS.text.muted} />
                      <Text style={wpStyles.emptyDayText}>No items for this day</Text>
                      <Text style={{ fontSize: 11, color: COLORS.text.muted, textAlign: 'center', marginTop: 4 }}>Use buttons above to add products or a dish pack</Text>
                    </View>
                  )}

                  {planCurrentDayItems.items.map((item, index) => {
                    const product = (products as any[]).find(p => p.id === item.productId);
                    return (
                      <View key={`${item.productId}-${index}`} style={[wpStyles.itemRow, index < planCurrentDayItems.items.length - 1 && wpStyles.itemRowBorder]}>
                        {product?.image && <Image source={{ uri: product.image }} style={wpStyles.itemImage} />}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[wpStyles.itemName, themed.textPrimary]}>{item.name}</Text>
                          <Text style={wpStyles.itemUnit}>{item.unit}</Text>
                          {item.cutType && (
                            <View style={wpStyles.cutBadge}>
                              <Text style={wpStyles.cutBadgeText}>{getCutLabel(item.cutType)}</Text>
                            </View>
                          )}
                        </View>
                        <View style={wpStyles.qtyControls}>
                          <TouchableOpacity style={wpStyles.qtyBtn} onPress={() => updatePlanItemQty(planSelectedDay, index, -1)}>
                            <Icon name="minus" size={14} color={COLORS.text.secondary} />
                          </TouchableOpacity>
                          <Text style={[wpStyles.qtyText, themed.textPrimary]}>{item.quantity}</Text>
                          <TouchableOpacity style={wpStyles.qtyBtn} onPress={() => updatePlanItemQty(planSelectedDay, index, 1)}>
                            <Icon name="plus" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={wpStyles.removeBtn} onPress={() => removePlanItem(planSelectedDay, index)}>
                          <Icon name="trash-can-outline" size={16} color={COLORS.status.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}
            </View>

            {/* Quick Actions */}
            <View style={wpStyles.quickActions}>
              <TouchableOpacity style={[wpStyles.quickActionBtn, themed.card]} onPress={() => copyPlanToAllDays(planSelectedDay)}>
                <Icon name="content-copy" size={16} color={COLORS.primary} />
                <Text style={[wpStyles.quickActionText, themed.textPrimary]}>Copy to All Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[wpStyles.quickActionBtn, themed.card]}
                onPress={() => {
                  setWeeklyPlan(prev => ({
                    ...prev,
                    [planSelectedDay]: { ...prev[planSelectedDay], items: [] },
                  }));
                }}
              >
                <Icon name="eraser" size={16} color="#F57C00" />
                <Text style={[wpStyles.quickActionText, themed.textPrimary]}>Clear Day</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly Overview */}
            <View style={[wpStyles.overviewCard, themed.card]}>
              <View style={wpStyles.overviewHeader}>
                <Icon name="calendar-text" size={18} color={COLORS.primary} />
                <Text style={[wpStyles.overviewTitle, themed.textPrimary]}>Weekly Overview</Text>
              </View>
              {PLAN_WEEKDAYS.map(day => {
                const plan = weeklyPlan[day];
                return (
                  <View key={day} style={wpStyles.overviewRow}>
                    <View style={[wpStyles.overviewDayBadge, plan.isActive ? wpStyles.overviewDayBadgeActive : wpStyles.overviewDayBadgeOff]}>
                      <Text style={[wpStyles.overviewDayText, plan.isActive && wpStyles.overviewDayTextActive]}>{day}</Text>
                    </View>
                    <Text style={wpStyles.overviewInfo}>
                      {!plan.isActive ? 'No delivery' : plan.items.length === 0 ? 'No items' : `${plan.items.length} items`}
                    </Text>
                    {plan.isActive && plan.items.length > 0 && (
                      <Icon name="check-circle" size={16} color={COLORS.primary} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Subscription Details Summary */}
            <View style={[wpStyles.detailsCard, themed.card]}>
              <View style={wpStyles.detailsHeader}>
                <Icon name="check-decagram" size={18} color={COLORS.primary} />
                <Text style={[wpStyles.detailsTitle, themed.textPrimary]}>Plan Details</Text>
              </View>
              <View style={wpStyles.detailsRow}><Text style={wpStyles.detailsLabel}>Frequency</Text><Text style={wpStyles.detailsValue}>{subFrequency.charAt(0).toUpperCase() + subFrequency.slice(1)}</Text></View>
              {subFrequency === 'weekly' && <View style={wpStyles.detailsRow}><Text style={wpStyles.detailsLabel}>Every</Text><Text style={wpStyles.detailsValue}>{subWeeklyDay}</Text></View>}
              {subFrequency === 'monthly' && <View style={wpStyles.detailsRow}><Text style={wpStyles.detailsLabel}>On dates</Text><Text style={wpStyles.detailsValue}>{subMonthlyDates.join(', ')}</Text></View>}
              <View style={wpStyles.detailsRow}><Text style={wpStyles.detailsLabel}>Starts</Text><Text style={wpStyles.detailsValue}>{SCHEDULE_DATES.find(d => d.key === subStartDate)?.label || ''}</Text></View>
              <View style={wpStyles.detailsRow}><Text style={wpStyles.detailsLabel}>Time</Text><Text style={wpStyles.detailsValue}>{TIME_SLOTS.find(t => t.id === subTimeSlot)?.label || ''}</Text></View>
              <View style={wpStyles.detailsRow}><Text style={wpStyles.detailsLabel}>Delivery Fee</Text><Text style={[wpStyles.detailsValue, { color: COLORS.primary }]}>{'\u20B9'}{effectiveDeliveryFee} (Save {'\u20B9'}{deliveryFee - effectiveDeliveryFee})</Text></View>
              <View style={[wpStyles.detailsRow, { borderBottomWidth: 0, paddingBottom: 0 }]}><Text style={[wpStyles.detailsLabel, { fontWeight: '700', color: COLORS.text.primary }]}>Total per delivery</Text><Text style={[wpStyles.detailsValue, { fontSize: 15, color: COLORS.primary }]}>{'\u20B9'}{total}</Text></View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={[styles.orderBar, themed.card]}>
            <View>
              <Text style={[styles.orderBarTotal, themed.textPrimary]}>{'\u20B9'}{total}</Text>
              <Text style={styles.orderBarSub}>{planActiveDays} days active | {subFrequency} plan</Text>
            </View>
            <TouchableOpacity
              style={[styles.orderBarBtn, placing && { opacity: 0.6 }]}
              onPress={handlePlaceOrder}
              disabled={placing}
            >
              <Icon name="check-decagram" size={20} color="#FFF" />
              <Text style={styles.orderBarBtnText}>{placing ? 'Placing...' : 'Confirm & Subscribe'}</Text>
            </TouchableOpacity>
          </View>
          {/* Multi-Select Product Picker Modal */}
          <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => setShowProductPicker(false)}>
            <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
              <View style={wpStyles.pickerHeader}>
                <Text style={[wpStyles.pickerTitle, themed.textPrimary]}>Select Products</Text>
                <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                  <Icon name="close" size={24} color={themed.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <View style={wpStyles.pickerSelectedCount}>
                <Icon name="check-circle" size={16} color={COLORS.primary} />
                <Text style={wpStyles.pickerCountText}>{selectedProductIds.size} products selected</Text>
              </View>
              <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
                {(products as any[]).map(item => {
                  const isSelected = selectedProductIds.has(item.id);
                  const alreadyInDay = planCurrentDayItems.items.some((i: any) => i.productId === item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[wpStyles.pickerRow, isSelected && wpStyles.pickerRowSelected, alreadyInDay && { opacity: 0.5 }]}
                      onPress={() => !alreadyInDay && toggleProductSelection(item.id)}
                      disabled={alreadyInDay}
                    >
                      <Image source={{ uri: item.image }} style={wpStyles.pickerImage} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[wpStyles.itemName, themed.textPrimary]}>{item.name}</Text>
                        <Text style={wpStyles.itemUnit}>{item.unit} · {'\u20B9'}{item.price}</Text>
                      </View>
                      <View style={[wpStyles.pickerCheckbox, isSelected && wpStyles.pickerCheckboxActive]}>
                        {isSelected && <Icon name="check" size={14} color="#FFF" />}
                        {alreadyInDay && <Icon name="check" size={14} color={COLORS.text.muted} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedProductIds.size > 0 && (
                <View style={wpStyles.pickerBottomBar}>
                  <TouchableOpacity style={wpStyles.pickerConfirmBtn} onPress={confirmProductSelection}>
                    <Icon name="check-all" size={20} color="#FFF" />
                    <Text style={wpStyles.pickerConfirmText}>Add {selectedProductIds.size} Products</Text>
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </Modal>

          {/* Dish Pack Picker Modal */}
          <Modal visible={showPackPicker} animationType="slide" onRequestClose={() => setShowPackPicker(false)}>
            <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
              <View style={wpStyles.pickerHeader}>
                <Text style={[wpStyles.pickerTitle, themed.textPrimary]}>Choose a Dish Pack</Text>
                <TouchableOpacity onPress={() => setShowPackPicker(false)}>
                  <Icon name="close" size={24} color={themed.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <Text style={wpStyles.packPickerSubtitle}>Select a pack to quickly add all its items to {PLAN_DAY_LABELS[planSelectedDay]}</Text>
              <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
                {DISH_PACKS.map(pack => {
                  const packProducts = pack.items.map(pi => {
                    const product = (products as any[]).find(p => p.id === pi.productId);
                    return product?.name || 'Unknown';
                  });
                  return (
                    <TouchableOpacity
                      key={pack.id}
                      style={[wpStyles.packCard, themed.card]}
                      onPress={() => addPackToDay(pack)}
                    >
                      <Image source={{ uri: pack.image }} style={wpStyles.packImage} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[wpStyles.packName, themed.textPrimary]}>{pack.name}</Text>
                          {pack.tag && (
                            <View style={wpStyles.packTag}>
                              <Text style={wpStyles.packTagText}>{pack.tag}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={wpStyles.packDesc}>{pack.description}</Text>
                        <Text style={wpStyles.packItems} numberOfLines={2}>{packProducts.join(', ')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <Text style={wpStyles.packPrice}>{'\u20B9'}{pack.price}</Text>
                          <Text style={wpStyles.packServes}>{pack.serves}</Text>
                          <Text style={wpStyles.packItemCount}>{pack.items.length} items</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      </Modal>
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
  addressOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: RADIUS.md, marginBottom: 6, borderWidth: 1.5, borderColor: COLORS.border },
  addressOptionActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  addressIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  addressIconWrapActive: { backgroundColor: COLORS.primary },
  addressLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  addressLabelActive: { color: COLORS.primary },
  addressText: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', marginTop: 4 },
  addAddressBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
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
  quickNoteChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  quickNoteChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  quickNoteChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  quickNoteChipText: { fontSize: 11, fontWeight: '600', color: COLORS.text.secondary },
  quickNoteChipTextActive: { color: COLORS.primary, fontWeight: '700' },
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
  // Wallet
  walletBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  walletBannerActive: { borderColor: COLORS.green, backgroundColor: '#E8F5E9' },
  walletBannerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  walletBannerSub: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  walletCheckbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  walletCheckboxActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  remainingLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6, marginTop: 4 },
  extrasCard: { marginHorizontal: SPACING.sm, marginTop: SPACING.md, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  extrasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  extrasTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  extrasDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 2, marginBottom: SPACING.sm },
  tipRow: { flexDirection: 'row', gap: 6 },
  tipChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  tipChipActive: { borderColor: COLORS.green, backgroundColor: '#E8F5E9' },
  tipChipText: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  tipChipTextActive: { color: COLORS.green },
  extrasDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  extrasOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  extrasOptionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  extrasOptionDesc: { fontSize: 11, color: COLORS.text.muted },
  giftForm: { marginTop: SPACING.sm, gap: SPACING.sm },
  giftInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
});

