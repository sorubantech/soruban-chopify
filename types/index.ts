export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  image: string;
  discount?: string;
  category: string;
  subcategory?: string;
  description?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  healthBenefits?: string[];
  targetAudience?: string[];
}

export type CutType = 'small_pieces' | 'slices' | 'cubes' | 'long_cuts' | 'grated';

export interface CutStyleMedia {
  image: string;
  videoUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedWeight?: number;
  cutType?: CutType;
  specialInstructions?: string;
}

export interface DeliverySlot {
  id: string;
  label: string;
  sub: string;
  icon: string;
}

export interface ScheduledDelivery {
  type: 'now' | 'scheduled';
  date?: string;
  timeSlot?: string;
}

export type OrderType = 'delivery' | 'pickup';

export type SubFrequency = 'daily' | 'weekly' | 'monthly';

export interface SkippedDelivery {
  date: string;              // ISO date string e.g. '2026-03-12'
  reason?: string;           // optional reason from user
  skippedAt: string;         // ISO timestamp when skip was requested
  status: 'skipped' | 'too_late';  // too_late = tried after cutoff
}

export interface Subscription {
  frequency: SubFrequency;
  preferredTime: string;
  startDate: string;
  weeklyDay?: string;        // e.g. 'Mon', 'Tue' — for weekly
  monthlyDates?: number[];   // e.g. [1, 15] — for monthly
  status: 'active' | 'paused' | 'cancelled';
  skippedDeliveries?: SkippedDelivery[];
  cutoffHours: number;       // hours before delivery to allow skip (default 10 = 10 PM previous day)
}

export type PaymentMethod = 'cod' | 'upi' | 'wallet' | 'wallet_partial';

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  description: string;
  amount: number;
  date: string;           // ISO timestamp
  orderId?: string;       // linked order if applicable
  category: 'refund' | 'payment' | 'cashback' | 'bonus' | 'topup';
}

export interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  subtotal: number;
  cuttingCharges: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  orderType?: OrderType;
  deliverySlot: string;
  scheduledDelivery?: ScheduledDelivery;
  deliveryAddress: string;
  createdAt: string;
  estimatedDelivery?: string;
  timeline?: OrderTimeline[];
  specialNote?: string;
  subscription?: Subscription;
  paymentMethod?: PaymentMethod;
  walletAmountUsed?: number;
  cancelledAt?: string;
  cancelReason?: string;
  refundAmount?: number;
  refundedToWallet?: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  unit: string;
  selectedWeight?: number;
  cutType?: CutType;
  specialInstructions?: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'cutting' | 'quality_check' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderTimeline {
  status: string;
  time: string;
  description: string;
  completed: boolean;
}

export interface DishPackItem {
  productId: string;
  quantity: number;
}

export interface PackSize {
  id: string;
  label: string;
  serves: string;
  weightGrams: number;
  weightLabel: string;
}

export interface RegionalVariant {
  id: string;
  name: string;
  description: string;
  spiceLevel: 'mild' | 'medium' | 'spicy';
  extraIngredients?: string[];
}

export interface DishPack {
  id: string;
  name: string;
  image: string;
  description: string;
  color: string;
  tag?: string;
  items: DishPackItem[];
  serves: string;
  price: number;
  cookingVideoUrl?: string;
  preparationSteps?: string[];
  regionalVariants?: RegionalVariant[];
}
