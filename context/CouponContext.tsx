import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Coupon } from '@/types';
import { COUPONS } from '@/data/coupons';

interface CouponContextType {
  availableCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string, orderTotal: number, category?: string) => { success: boolean; message: string; discount: number };
  removeCoupon: () => void;
  getApplicableCoupons: (orderTotal: number, category?: string) => Coupon[];
  calculateDiscount: (coupon: Coupon, orderTotal: number) => number;
}

const CouponContext = createContext<CouponContextType>({
  availableCoupons: [],
  appliedCoupon: null,
  applyCoupon: () => ({ success: false, message: '', discount: 0 }),
  removeCoupon: () => {},
  getApplicableCoupons: () => [],
  calculateDiscount: () => 0,
});

export function CouponProvider({ children }: { children: React.ReactNode }) {
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const calculateDiscount = useCallback((coupon: Coupon, orderTotal: number): number => {
    if (orderTotal < coupon.minOrderValue) return 0;
    if (coupon.discountType === 'percentage') {
      const disc = Math.round((orderTotal * coupon.discountValue) / 100);
      return coupon.maxDiscount ? Math.min(disc, coupon.maxDiscount) : disc;
    }
    return coupon.discountValue;
  }, []);

  const applyCoupon = useCallback((code: string, orderTotal: number, category?: string) => {
    const coupon = COUPONS.find(c => c.code.toLowerCase() === code.toLowerCase() && c.isActive);
    if (!coupon) return { success: false, message: 'Invalid coupon code', discount: 0 };

    const now = new Date().toISOString().split('T')[0];
    if (now < coupon.validFrom || now > coupon.validTo) return { success: false, message: 'Coupon has expired', discount: 0 };
    if (coupon.usedCount >= coupon.usageLimit) return { success: false, message: 'Coupon usage limit reached', discount: 0 };
    if (orderTotal < coupon.minOrderValue) return { success: false, message: `Minimum order ₹${coupon.minOrderValue} required`, discount: 0 };
    if (coupon.category && category && coupon.category !== category) return { success: false, message: `This coupon is only for ${coupon.category}`, discount: 0 };

    const discount = calculateDiscount(coupon, orderTotal);
    setAppliedCoupon(coupon);
    return { success: true, message: `Coupon applied! You save ₹${discount}`, discount };
  }, [calculateDiscount]);

  const removeCoupon = useCallback(() => setAppliedCoupon(null), []);

  const getApplicableCoupons = useCallback((orderTotal: number, category?: string) => {
    const now = new Date().toISOString().split('T')[0];
    return COUPONS.filter(c => {
      if (!c.isActive) return false;
      if (now < c.validFrom || now > c.validTo) return false;
      if (c.usedCount >= c.usageLimit) return false;
      if (c.category && category && c.category !== category) return false;
      return true;
    }).sort((a, b) => {
      const dA = calculateDiscount(a, orderTotal);
      const dB = calculateDiscount(b, orderTotal);
      return dB - dA;
    });
  }, [calculateDiscount]);

  const value = useMemo(() => ({
    availableCoupons: COUPONS.filter(c => c.isActive),
    appliedCoupon, applyCoupon, removeCoupon, getApplicableCoupons, calculateDiscount,
  }), [appliedCoupon, applyCoupon, removeCoupon, getApplicableCoupons, calculateDiscount]);

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export const useCoupons = () => useContext(CouponContext);
