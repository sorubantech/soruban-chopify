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
  packId?: string;
  packName?: string;
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
  pausedFrom?: string;       // ISO date — vacation pause start
  pausedUntil?: string;      // ISO date — vacation pause end (auto-resume after this)
  pausedDays?: number;       // total delivery days paused
  weeklyPlan?: WeeklyPlan;   // customizable daily plan — different items per day
  groupCode?: string;        // group subscription code (e.g. GRP3210)
  groupName?: string;        // group subscription name (e.g. Room 204 Gang)
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

// ─── Nutrition & Health ───
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  fat: number;
  vitamins?: string[];
  minerals?: string[];
}

export interface Allergen {
  name: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DietaryPreference {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface HealthGoal {
  id: string;
  label: string;
  icon: string;
  targetCalories?: number;
}

// ─── Reviews & Ratings ───
export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  photos?: string[];
  date: string;
  helpful: number;
}

export interface OrderRating {
  orderId: string;
  overallRating: number;
  freshnessRating: number;
  cuttingRating: number;
  deliveryRating: number;
  comment?: string;
  photos?: string[];
  date: string;
}

// ─── Coupons & Offers ───
export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  category?: string;
  isActive: boolean;
}

// ─── Loyalty & Referral ───
export interface LoyaltyPoints {
  totalEarned: number;
  totalRedeemed: number;
  currentBalance: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  history: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'expired';
  points: number;
  description: string;
  date: string;
  orderId?: string;
}

export interface Referral {
  id: string;
  referredName: string;
  referredPhone: string;
  status: 'pending' | 'joined' | 'first_order' | 'rewarded';
  rewardAmount: number;
  date: string;
}

// ─── Saved Cart ───
export interface SavedCart {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: string;
  lastUsed?: string;
}

// ─── Custom Pack ───
export interface CustomPack {
  id: string;
  name: string;
  items: { productId: string; quantity: number; cutType?: CutType }[];
  createdAt: string;
  lastOrdered?: string;
}

// ─── Order Issue / Report ───
export interface OrderIssue {
  id: string;
  orderId: string;
  type: 'wrong_item' | 'quality' | 'missing_item' | 'late_delivery' | 'damaged' | 'other';
  description: string;
  photos?: string[];
  status: 'open' | 'investigating' | 'resolved' | 'refunded';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  refundAmount?: number;
}

// ─── Delivery Address Extended ───
export interface DeliveryAddress {
  id: string;
  label: string;
  address: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  contactName?: string;
  contactPhone?: string;
}

// ─── Gift Order ───
export interface GiftInfo {
  recipientName: string;
  recipientPhone: string;
  message?: string;
  deliveryAddress: string;
}

// ─── Family Profile ───
export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  dietaryPreferences?: string[];
  allergies?: string[];
  avatar?: string;
}

// ─── Vacation Mode ───
export interface VacationMode {
  isActive: boolean;
  startDate: string;
  endDate: string;
  affectedSubscriptions: string[];
  refundType?: 'extend' | 'wallet';  // how to handle paused delivery costs
  pausedDeliveryCount?: number;       // total deliveries paused across all subscriptions
  estimatedRefund?: number;           // estimated refund/extension amount
}

// ─── Daily Subscription Plan ───
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface DayPlanItem {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  cutType?: CutType;
  specialInstructions?: string;
}

export interface DayPlan {
  day: WeekDay;
  items: DayPlanItem[];
  packId?: string;          // optional dish pack instead of individual items
  packName?: string;
  isActive: boolean;        // false = no delivery this day
}

export type WeeklyPlan = Record<WeekDay, DayPlan>;

// ─── Community Recipe ───
export interface CommunityRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  authorName: string;
  authorAvatar?: string;
  ingredients: string[];
  steps: string[];
  servings: number;
  cookTime: string;
  likes: number;
  isLiked?: boolean;
  packId?: string;
  date: string;
}

// ─── Check-in / Streak ───
export interface CheckInStreak {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  totalCheckIns: number;
  rewards: { day: number; points: number; claimed: boolean }[];
}

// ─── Spending Analytics ───
export interface SpendingAnalytics {
  totalSpent: number;
  totalSaved: number;
  totalOrders: number;
  avgOrderValue: number;
  monthlySpending: { month: string; amount: number }[];
  categorySpending: { category: string; amount: number; percentage: number }[];
  topItems: { name: string; count: number; totalSpent: number }[];
}

// ─── Tip ───
export interface DeliveryTip {
  amount: number;
  isCustom: boolean;
}

// ─── Extend Order for new features ───
export interface OrderExtended extends Order {
  rating?: OrderRating;
  issue?: OrderIssue;
  giftInfo?: GiftInfo;
  deliveryTip?: number;
  contactlessDelivery?: boolean;
  deliveryPartner?: {
    name: string;
    phone: string;
    photo?: string;
  };
  estimatedArrival?: string;
  invoiceUrl?: string;
}
