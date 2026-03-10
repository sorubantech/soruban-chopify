import type { Coupon } from '@/types';

export const COUPONS: Coupon[] = [
  {
    id: 'coup_1', code: 'FIRST50', title: '50% Off First Order',
    description: 'Get 50% off on your first order. Maximum discount ₹100.',
    discountType: 'percentage', discountValue: 50, minOrderValue: 150, maxDiscount: 100,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 1, usedCount: 0, isActive: true,
  },
  {
    id: 'coup_2', code: 'FRESH20', title: '20% Off Fresh Vegetables',
    description: 'Flat 20% off on all vegetable orders above ₹200.',
    discountType: 'percentage', discountValue: 20, minOrderValue: 200, maxDiscount: 80,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 5, usedCount: 0, category: 'Vegetables', isActive: true,
  },
  {
    id: 'coup_3', code: 'FREECUT', title: 'Free Cutting Charges',
    description: 'Get free cutting on orders above ₹300.',
    discountType: 'flat', discountValue: 50, minOrderValue: 300,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 3, usedCount: 0, isActive: true,
  },
  {
    id: 'coup_4', code: 'PACK25', title: '₹25 Off Dish Packs',
    description: 'Flat ₹25 off on any dish pack order.',
    discountType: 'flat', discountValue: 25, minOrderValue: 100,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 10, usedCount: 0, isActive: true,
  },
  {
    id: 'coup_5', code: 'WEEKEND15', title: '15% Weekend Special',
    description: 'Enjoy 15% off on weekend orders. Max discount ₹60.',
    discountType: 'percentage', discountValue: 15, minOrderValue: 180, maxDiscount: 60,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 8, usedCount: 0, isActive: true,
  },
  {
    id: 'coup_6', code: 'HEALTHY30', title: '30% Off Health Foods',
    description: '30% off on diet & health category items.',
    discountType: 'percentage', discountValue: 30, minOrderValue: 250, maxDiscount: 120,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 4, usedCount: 0, category: 'Diet Foods', isActive: true,
  },
  {
    id: 'coup_7', code: 'SUB10', title: '₹10 Off Subscription',
    description: 'Extra ₹10 off per delivery on new subscriptions.',
    discountType: 'flat', discountValue: 10, minOrderValue: 100,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 1, usedCount: 0, isActive: true,
  },
  {
    id: 'coup_8', code: 'FRUIT40', title: '40% Off Fruits',
    description: 'Flat 40% off on fruit orders above ₹150. Max ₹80.',
    discountType: 'percentage', discountValue: 40, minOrderValue: 150, maxDiscount: 80,
    validFrom: '2026-01-01', validTo: '2026-12-31', usageLimit: 3, usedCount: 0, category: 'Fruits', isActive: true,
  },
];
