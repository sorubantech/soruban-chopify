import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoyaltyPoints, LoyaltyTransaction, Referral, CheckInStreak } from '@/types';

const LOYALTY_KEY = '@cutting_loyalty';
const REFERRAL_KEY = '@cutting_referrals';
const CHECKIN_KEY = '@cutting_checkin';

interface LoyaltyContextType {
  loyalty: LoyaltyPoints;
  referrals: Referral[];
  checkIn: CheckInStreak;
  earnPoints: (points: number, description: string, orderId?: string) => Promise<void>;
  redeemPoints: (points: number, description: string) => Promise<boolean>;
  addReferral: (name: string, phone: string) => Promise<string>;
  dailyCheckIn: () => Promise<{ success: boolean; points: number; streak: number }>;
  getTier: () => string;
  getPointsToNextTier: () => number;
  getReferralCode: () => string;
}

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1500, platinum: 5000 };
const POINTS_PER_RUPEE = 2;
const CHECKIN_REWARDS = [
  { day: 1, points: 5, claimed: false }, { day: 2, points: 5, claimed: false },
  { day: 3, points: 10, claimed: false }, { day: 4, points: 10, claimed: false },
  { day: 5, points: 15, claimed: false }, { day: 6, points: 15, claimed: false },
  { day: 7, points: 50, claimed: false },
];

const DEFAULT_LOYALTY: LoyaltyPoints = {
  totalEarned: 100, totalRedeemed: 0, currentBalance: 100, tier: 'bronze',
  history: [{ id: 'lp_welcome', type: 'bonus', points: 100, description: 'Welcome bonus points', date: new Date().toISOString() }],
};

const DEFAULT_CHECKIN: CheckInStreak = {
  currentStreak: 0, longestStreak: 0, lastCheckIn: '', totalCheckIns: 0, rewards: [...CHECKIN_REWARDS],
};

const LoyaltyContext = createContext<LoyaltyContextType>({
  loyalty: DEFAULT_LOYALTY, referrals: [], checkIn: DEFAULT_CHECKIN,
  earnPoints: async () => {}, redeemPoints: async () => false, addReferral: async () => '',
  dailyCheckIn: async () => ({ success: false, points: 0, streak: 0 }),
  getTier: () => 'bronze', getPointsToNextTier: () => 500, getReferralCode: () => '',
});

function calcTier(total: number): LoyaltyPoints['tier'] {
  if (total >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (total >= TIER_THRESHOLDS.gold) return 'gold';
  if (total >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function LoyaltyProvider({ children }: { children: React.ReactNode }) {
  const [loyalty, setLoyalty] = useState<LoyaltyPoints>(DEFAULT_LOYALTY);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [checkIn, setCheckIn] = useState<CheckInStreak>(DEFAULT_CHECKIN);

  useEffect(() => {
    (async () => {
      try {
        const [lRaw, rRaw, cRaw] = await Promise.all([
          AsyncStorage.getItem(LOYALTY_KEY),
          AsyncStorage.getItem(REFERRAL_KEY),
          AsyncStorage.getItem(CHECKIN_KEY),
        ]);
        if (lRaw) setLoyalty(JSON.parse(lRaw));
        if (rRaw) setReferrals(JSON.parse(rRaw));
        if (cRaw) setCheckIn(JSON.parse(cRaw));
      } catch {}
    })();
  }, []);

  const persistLoyalty = useCallback(async (l: LoyaltyPoints) => {
    setLoyalty(l);
    await AsyncStorage.setItem(LOYALTY_KEY, JSON.stringify(l));
  }, []);

  const earnPoints = useCallback(async (points: number, description: string, orderId?: string) => {
    const tx: LoyaltyTransaction = { id: `lp_${Date.now()}`, type: 'earned', points, description, date: new Date().toISOString(), orderId };
    const newTotal = loyalty.totalEarned + points;
    const updated: LoyaltyPoints = {
      ...loyalty, totalEarned: newTotal, currentBalance: loyalty.currentBalance + points,
      tier: calcTier(newTotal), history: [tx, ...loyalty.history],
    };
    await persistLoyalty(updated);
  }, [loyalty, persistLoyalty]);

  const redeemPoints = useCallback(async (points: number, description: string): Promise<boolean> => {
    if (loyalty.currentBalance < points) return false;
    const tx: LoyaltyTransaction = { id: `lp_${Date.now()}`, type: 'redeemed', points, description, date: new Date().toISOString() };
    const updated: LoyaltyPoints = {
      ...loyalty, totalRedeemed: loyalty.totalRedeemed + points, currentBalance: loyalty.currentBalance - points,
      history: [tx, ...loyalty.history],
    };
    await persistLoyalty(updated);
    return true;
  }, [loyalty, persistLoyalty]);

  const addReferral = useCallback(async (name: string, phone: string) => {
    const ref: Referral = { id: `ref_${Date.now()}`, referredName: name, referredPhone: phone, status: 'pending', rewardAmount: 50, date: new Date().toISOString() };
    const updated = [ref, ...referrals];
    setReferrals(updated);
    await AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(updated));
    return ref.id;
  }, [referrals]);

  const dailyCheckIn = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    if (checkIn.lastCheckIn === today) return { success: false, points: 0, streak: checkIn.currentStreak };

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const isConsecutive = checkIn.lastCheckIn === yesterday;
    const newStreak = isConsecutive ? checkIn.currentStreak + 1 : 1;
    const dayIndex = ((newStreak - 1) % 7);
    const points = CHECKIN_REWARDS[dayIndex]?.points || 5;

    const newRewards = [...checkIn.rewards];
    if (newRewards[dayIndex]) newRewards[dayIndex] = { ...newRewards[dayIndex], claimed: true };

    const updated: CheckInStreak = {
      currentStreak: newStreak, longestStreak: Math.max(checkIn.longestStreak, newStreak),
      lastCheckIn: today, totalCheckIns: checkIn.totalCheckIns + 1,
      rewards: newStreak % 7 === 0 ? CHECKIN_REWARDS.map(r => ({ ...r, claimed: false })) : newRewards,
    };
    setCheckIn(updated);
    await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(updated));
    await earnPoints(points, `Daily check-in (Day ${newStreak})`);
    return { success: true, points, streak: newStreak };
  }, [checkIn, earnPoints]);

  const getTier = useCallback(() => loyalty.tier, [loyalty.tier]);
  const getPointsToNextTier = useCallback(() => {
    const tiers = Object.entries(TIER_THRESHOLDS);
    const currentIdx = tiers.findIndex(([t]) => t === loyalty.tier);
    if (currentIdx >= tiers.length - 1) return 0;
    return tiers[currentIdx + 1][1] - loyalty.totalEarned;
  }, [loyalty]);
  const getReferralCode = useCallback(() => 'CHOP' + Math.random().toString(36).substring(2, 6).toUpperCase(), []);

  const value = useMemo(() => ({
    loyalty, referrals, checkIn, earnPoints, redeemPoints, addReferral,
    dailyCheckIn, getTier, getPointsToNextTier, getReferralCode,
  }), [loyalty, referrals, checkIn, earnPoints, redeemPoints, addReferral, dailyCheckIn, getTier, getPointsToNextTier, getReferralCode]);

  return <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>;
}

export const useLoyalty = () => useContext(LoyaltyContext);
export { POINTS_PER_RUPEE, TIER_THRESHOLDS };
