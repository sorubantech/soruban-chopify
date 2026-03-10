import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProductReview, OrderRating } from '@/types';

const REVIEWS_KEY = '@cutting_reviews';
const RATINGS_KEY = '@cutting_ratings';

interface ReviewContextType {
  reviews: ProductReview[];
  orderRatings: OrderRating[];
  addReview: (review: Omit<ProductReview, 'id' | 'date' | 'helpful'>) => Promise<void>;
  getProductReviews: (productId: string) => ProductReview[];
  getAverageRating: (productId: string) => number;
  addOrderRating: (rating: Omit<OrderRating, 'date'>) => Promise<void>;
  getOrderRating: (orderId: string) => OrderRating | undefined;
  markHelpful: (reviewId: string) => Promise<void>;
}

const DEMO_REVIEWS: ProductReview[] = [
  { id: 'rv_1', productId: '1', userId: 'u1', userName: 'Priya K.', rating: 5, comment: 'Very fresh tomatoes! The cutting was perfect for my sambar.', date: '2026-03-01T10:00:00Z', helpful: 12 },
  { id: 'rv_2', productId: '1', userId: 'u2', userName: 'Arjun R.', rating: 4, comment: 'Good quality, slightly soft but fine for cooking.', date: '2026-02-28T14:00:00Z', helpful: 5 },
  { id: 'rv_3', productId: '4', userId: 'u3', userName: 'Lakshmi D.', rating: 5, comment: 'Onions were fresh and the slicing was uniform. Saved so much time!', date: '2026-03-02T09:00:00Z', helpful: 8 },
  { id: 'rv_4', productId: '7', userId: 'u4', userName: 'Ravi S.', rating: 4, comment: 'Nice carrots, good size. Cubing was neat.', date: '2026-02-25T16:00:00Z', helpful: 3 },
  { id: 'rv_5', productId: '13', userId: 'u1', userName: 'Priya K.', rating: 5, comment: 'Fresh broccoli, well cut. My kids loved the stir fry!', date: '2026-03-05T11:00:00Z', helpful: 15 },
  { id: 'rv_6', productId: '22', userId: 'u5', userName: 'Meena S.', rating: 4, comment: 'Potatoes were clean and cubed perfectly for biryani.', date: '2026-03-03T08:00:00Z', helpful: 6 },
  { id: 'rv_7', productId: '2', userId: 'u6', userName: 'Kavitha R.', rating: 5, comment: 'Bananas were perfectly ripe. Great for smoothies.', date: '2026-03-04T12:00:00Z', helpful: 9 },
  { id: 'rv_8', productId: '3', userId: 'u7', userName: 'Suresh M.', rating: 4, comment: 'Fresh apples, crispy and sweet. Good quality.', date: '2026-02-27T15:00:00Z', helpful: 4 },
];

const ReviewContext = createContext<ReviewContextType>({
  reviews: [], orderRatings: [],
  addReview: async () => {}, getProductReviews: () => [], getAverageRating: () => 0,
  addOrderRating: async () => {}, getOrderRating: () => undefined, markHelpful: async () => {},
});

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<ProductReview[]>(DEMO_REVIEWS);
  const [orderRatings, setOrderRatings] = useState<OrderRating[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rvRaw, rtRaw] = await Promise.all([
          AsyncStorage.getItem(REVIEWS_KEY), AsyncStorage.getItem(RATINGS_KEY),
        ]);
        if (rvRaw) setReviews(JSON.parse(rvRaw));
        if (rtRaw) setOrderRatings(JSON.parse(rtRaw));
      } catch {}
    })();
  }, []);

  const addReview = useCallback(async (review: Omit<ProductReview, 'id' | 'date' | 'helpful'>) => {
    const newReview: ProductReview = { ...review, id: `rv_${Date.now()}`, date: new Date().toISOString(), helpful: 0 };
    const updated = [newReview, ...reviews];
    setReviews(updated);
    await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(updated));
  }, [reviews]);

  const getProductReviews = useCallback((productId: string) => {
    return reviews.filter(r => r.productId === productId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reviews]);

  const getAverageRating = useCallback((productId: string) => {
    const pReviews = reviews.filter(r => r.productId === productId);
    if (pReviews.length === 0) return 0;
    return Math.round((pReviews.reduce((s, r) => s + r.rating, 0) / pReviews.length) * 10) / 10;
  }, [reviews]);

  const addOrderRating = useCallback(async (rating: Omit<OrderRating, 'date'>) => {
    const newRating: OrderRating = { ...rating, date: new Date().toISOString() };
    const updated = [newRating, ...orderRatings.filter(r => r.orderId !== rating.orderId)];
    setOrderRatings(updated);
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(updated));
  }, [orderRatings]);

  const getOrderRating = useCallback((orderId: string) => {
    return orderRatings.find(r => r.orderId === orderId);
  }, [orderRatings]);

  const markHelpful = useCallback(async (reviewId: string) => {
    const updated = reviews.map(r => r.id === reviewId ? { ...r, helpful: r.helpful + 1 } : r);
    setReviews(updated);
    await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(updated));
  }, [reviews]);

  const value = useMemo(() => ({
    reviews, orderRatings, addReview, getProductReviews, getAverageRating,
    addOrderRating, getOrderRating, markHelpful,
  }), [reviews, orderRatings, addReview, getProductReviews, getAverageRating, addOrderRating, getOrderRating, markHelpful]);

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export const useReviews = () => useContext(ReviewContext);
