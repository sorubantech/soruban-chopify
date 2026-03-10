import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order, CartItem, OrderTimeline, Subscription, SkippedDelivery, PaymentMethod } from '@/types';

const ORDERS_KEY = '@cutting_orders';

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = new Set(['placed', 'confirmed']);

interface OrderContextType {
  orders: Order[];
  createOrder: (input: {
    items: CartItem[];
    subtotal: number;
    cuttingCharges: number;
    deliveryFee: number;
    discount: number;
    couponCode?: string;
    deliverySlot: string;
    deliveryAddress: string;
    orderType?: 'delivery' | 'pickup';
    specialNote?: string;
    subscription?: Subscription;
    paymentMethod?: PaymentMethod;
    walletAmountUsed?: number;
  }) => Promise<Order>;
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; message: string; refundAmount?: number }>;
  canCancelOrder: (orderId: string) => { canCancel: boolean; reason: string };
  skipDelivery: (orderId: string, date: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  unskipDelivery: (orderId: string, date: string) => Promise<void>;
  getUpcomingDeliveries: (orderId: string, daysAhead?: number) => { date: string; dayLabel: string; isSkipped: boolean; canSkip: boolean }[];
  updateSubscriptionStatus: (orderId: string, status: 'active' | 'paused' | 'cancelled') => Promise<void>;
}

const DEFAULT_CUTOFF_HOURS = 10; // 10 PM previous day

const OrderContext = createContext<OrderContextType>({
  orders: [],
  createOrder: async () => ({} as Order),
  refreshOrders: async () => {},
  cancelOrder: async () => ({ success: false, message: '' }),
  canCancelOrder: () => ({ canCancel: false, reason: '' }),
  skipDelivery: async () => ({ success: false, message: '' }),
  unskipDelivery: async () => {},
  getUpcomingDeliveries: () => [],
  updateSubscriptionStatus: async () => {},
});

function buildTimeline(createdAt: Date): OrderTimeline[] {
  const placed = createdAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return [
    { status: 'Order Placed', time: placed, description: 'Your order has been placed successfully', completed: true },
    { status: 'Confirmed', time: '', description: 'Store will confirm your order shortly', completed: false },
    { status: 'Cutting Started', time: '', description: 'Our team is cutting your vegetables fresh', completed: false },
    { status: 'Quality Check', time: '', description: 'Checking freshness and cut quality', completed: false },
    { status: 'Packed', time: '', description: 'Items packed hygienically for delivery', completed: false },
    { status: 'Out for Delivery', time: '', description: 'Your order is on the way', completed: false },
    { status: 'Delivered', time: '', description: 'Order delivered successfully', completed: false },
  ];
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ORDERS_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const createOrder = useCallback(async (input: {
    items: CartItem[];
    subtotal: number;
    cuttingCharges: number;
    deliveryFee: number;
    discount: number;
    couponCode?: string;
    deliverySlot: string;
    deliveryAddress: string;
    orderType?: 'delivery' | 'pickup';
    specialNote?: string;
    subscription?: Subscription;
    paymentMethod?: PaymentMethod;
    walletAmountUsed?: number;
  }): Promise<Order> => {
    const existing = orders;
    const maxNum = existing.reduce((max, o) => {
      const match = String(o.id).match(/\d+/);
      if (!match) return max;
      return Math.max(max, Number(match[0]));
    }, 1000);

    const now = new Date();
    const total = input.subtotal + input.deliveryFee - input.discount;

    const order: Order = {
      id: `CUT${maxNum + 1}`,
      items: input.items.map(item => ({
        id: item.id, name: item.name, image: item.image,
        price: item.price, quantity: item.quantity, unit: item.unit,
        selectedWeight: item.selectedWeight, cutType: item.cutType,
        specialInstructions: item.specialInstructions,
      })),
      status: 'placed',
      total,
      subtotal: input.subtotal - input.cuttingCharges,
      cuttingCharges: input.cuttingCharges,
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      couponCode: input.couponCode,
      orderType: input.orderType || 'delivery',
      deliverySlot: input.deliverySlot,
      deliveryAddress: input.deliveryAddress,
      createdAt: now.toISOString(),
      estimatedDelivery: '30-45 min',
      timeline: buildTimeline(now),
      specialNote: input.specialNote,
      subscription: input.subscription,
      paymentMethod: input.paymentMethod,
      walletAmountUsed: input.walletAmountUsed,
    };

    const updated = [order, ...existing];
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    setOrders(updated);
    return order;
  }, [orders]);

  const canCancelOrder = useCallback((orderId: string): { canCancel: boolean; reason: string } => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { canCancel: false, reason: 'Order not found' };
    if (order.status === 'cancelled') return { canCancel: false, reason: 'Order is already cancelled' };
    if (order.status === 'delivered') return { canCancel: false, reason: 'Order has been delivered' };
    if (!CANCELLABLE_STATUSES.has(order.status)) {
      return { canCancel: false, reason: 'Delivery preparation already started. Cannot cancel now.' };
    }
    return { canCancel: true, reason: '' };
  }, [orders]);

  const cancelOrder = useCallback(async (orderId: string, reason?: string): Promise<{ success: boolean; message: string; refundAmount?: number }> => {
    const check = canCancelOrder(orderId);
    if (!check.canCancel) return { success: false, message: check.reason };

    const order = orders.find(o => o.id === orderId)!;
    const now = new Date();

    // Calculate refund: only for online payments (upi, wallet, wallet_partial)
    const paidOnline = order.paymentMethod && order.paymentMethod !== 'cod';
    let refundAmount = 0;
    if (paidOnline) {
      // If wallet_partial, refund the full total (wallet portion + online portion)
      // In real app, online portion would go back to payment gateway
      // For now, entire amount goes to wallet
      refundAmount = order.total;
    }

    const cancelledTimeline = [
      ...(order.timeline || []),
      { status: 'Cancelled', time: now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }), description: reason || 'Order cancelled by user', completed: true },
    ];

    const updatedOrders = orders.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        status: 'cancelled' as const,
        cancelledAt: now.toISOString(),
        cancelReason: reason,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
        refundedToWallet: refundAmount > 0,
        timeline: cancelledTimeline,
      };
    });

    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    setOrders(updatedOrders);

    if (refundAmount > 0) {
      return { success: true, message: `Order cancelled. ₹${refundAmount} will be refunded to your wallet.`, refundAmount };
    }
    return { success: true, message: 'Order cancelled successfully.' };
  }, [orders, canCancelOrder]);

  const skipDelivery = useCallback(async (orderId: string, date: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.subscription) return { success: false, message: 'Subscription not found' };

    const sub = order.subscription;
    const cutoffHours = sub.cutoffHours ?? DEFAULT_CUTOFF_HOURS;

    // Parse the preferred time to get delivery hour (e.g. "7:00 AM - 8:00 AM" → 7)
    const timeMatch = sub.preferredTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let deliveryHour = 7; // default
    if (timeMatch) {
      deliveryHour = parseInt(timeMatch[1]);
      if (timeMatch[3].toUpperCase() === 'PM' && deliveryHour !== 12) deliveryHour += 12;
      if (timeMatch[3].toUpperCase() === 'AM' && deliveryHour === 12) deliveryHour = 0;
    }

    // Calculate cutoff: delivery date at delivery hour minus cutoffHours
    const deliveryDateTime = new Date(date + 'T00:00:00');
    deliveryDateTime.setHours(deliveryHour, 0, 0, 0);
    const cutoffTime = new Date(deliveryDateTime.getTime() - cutoffHours * 60 * 60 * 1000);
    const now = new Date();

    if (now >= cutoffTime) {
      return { success: false, message: `Cannot skip — delivery preparation already started. Cutoff was ${cutoffTime.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} on ${cutoffTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.` };
    }

    // Check if already skipped
    const existing = sub.skippedDeliveries || [];
    if (existing.some(s => s.date === date && s.status === 'skipped')) {
      return { success: false, message: 'This delivery is already skipped' };
    }

    const skipped: SkippedDelivery = {
      date,
      reason,
      skippedAt: now.toISOString(),
      status: 'skipped',
    };

    const updatedSub: Subscription = {
      ...sub,
      skippedDeliveries: [...existing, skipped],
    };

    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, subscription: updatedSub } : o);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
    return { success: true, message: 'Delivery skipped successfully' };
  }, [orders]);

  const unskipDelivery = useCallback(async (orderId: string, date: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.subscription) return;

    const updatedSub: Subscription = {
      ...order.subscription,
      skippedDeliveries: (order.subscription.skippedDeliveries || []).filter(s => s.date !== date),
    };

    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, subscription: updatedSub } : o);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
  }, [orders]);

  const getUpcomingDeliveries = useCallback((orderId: string, daysAhead: number = 14) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.subscription || order.subscription.status !== 'active') return [];

    const sub = order.subscription;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveries: { date: string; dayLabel: string; isSkipped: boolean; canSkip: boolean }[] = [];

    // Parse delivery hour for cutoff calculation
    const timeMatch = sub.preferredTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let deliveryHour = 7;
    if (timeMatch) {
      deliveryHour = parseInt(timeMatch[1]);
      if (timeMatch[3].toUpperCase() === 'PM' && deliveryHour !== 12) deliveryHour += 12;
      if (timeMatch[3].toUpperCase() === 'AM' && deliveryHour === 12) deliveryHour = 0;
    }
    const cutoffHours = sub.cutoffHours ?? DEFAULT_CUTOFF_HOURS;

    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      let isDeliveryDay = false;
      if (sub.frequency === 'daily') {
        isDeliveryDay = true;
      } else if (sub.frequency === 'weekly') {
        isDeliveryDay = dayName === sub.weeklyDay;
      } else if (sub.frequency === 'monthly') {
        isDeliveryDay = (sub.monthlyDates || []).includes(d.getDate());
      }

      if (!isDeliveryDay) continue;

      const isSkipped = (sub.skippedDeliveries || []).some(s => s.date === dateStr && s.status === 'skipped');

      // Check if cutoff has passed
      const deliveryDateTime = new Date(dateStr + 'T00:00:00');
      deliveryDateTime.setHours(deliveryHour, 0, 0, 0);
      const cutoffTime = new Date(deliveryDateTime.getTime() - cutoffHours * 60 * 60 * 1000);
      const canSkip = new Date() < cutoffTime;

      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      deliveries.push({ date: dateStr, dayLabel, isSkipped, canSkip });
    }

    return deliveries;
  }, [orders]);

  const updateSubscriptionStatus = useCallback(async (orderId: string, status: 'active' | 'paused' | 'cancelled') => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId && o.subscription) {
        return { ...o, subscription: { ...o.subscription, status } };
      }
      return o;
    });
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
  }, [orders]);

  const value = useMemo(() => ({
    orders, createOrder, refreshOrders: loadOrders,
    cancelOrder, canCancelOrder,
    skipDelivery, unskipDelivery, getUpcomingDeliveries, updateSubscriptionStatus,
  }), [orders, createOrder, loadOrders, cancelOrder, canCancelOrder, skipDelivery, unskipDelivery, getUpcomingDeliveries, updateSubscriptionStatus]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export const useOrders = () => useContext(OrderContext);
