import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order, CartItem, OrderTimeline, Subscription } from '@/types';

const ORDERS_KEY = '@cutting_orders';

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
  }) => Promise<Order>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType>({
  orders: [],
  createOrder: async () => ({} as Order),
  refreshOrders: async () => {},
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
    };

    const updated = [order, ...existing];
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    setOrders(updated);
    return order;
  }, [orders]);

  const value = useMemo(() => ({ orders, createOrder, refreshOrders: loadOrders }), [orders, createOrder, loadOrders]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export const useOrders = () => useContext(OrderContext);
