import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useReviews } from '@/context/ReviewContext';
import { useLoyalty } from '@/context/LoyaltyContext';

const QUICK_TAGS = [
  'Fresh produce',
  'Perfect cuts',
  'On-time delivery',
  'Great packaging',
  'Value for money',
];

const CATEGORY_LABELS = [
  { key: 'freshness', label: 'Freshness', icon: 'leaf' },
  { key: 'cutting', label: 'Cutting Quality', icon: 'knife' },
  { key: 'delivery', label: 'Delivery', icon: 'truck-delivery' },
] as const;

function StarRow({
  rating,
  onRate,
  size = 28,
  readOnly = false,
}: {
  rating: number;
  onRate?: (star: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readOnly && onRate?.(star)}
          activeOpacity={readOnly ? 1 : 0.6}
          disabled={readOnly}
          style={styles.starTouch}
        >
          <Icon
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? COLORS.accent : COLORS.text.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RateOrderScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { addOrderRating, getOrderRating } = useReviews();
  const { earnPoints } = useLoyalty();

  const existingRating = orderId ? getOrderRating(orderId) : undefined;
  const isReadOnly = !!existingRating;

  const [overallRating, setOverallRating] = useState(existingRating?.overallRating ?? 0);
  const [freshnessRating, setFreshnessRating] = useState(existingRating?.freshnessRating ?? 0);
  const [cuttingRating, setCuttingRating] = useState(existingRating?.cuttingRating ?? 0);
  const [deliveryRating, setDeliveryRating] = useState(existingRating?.deliveryRating ?? 0);
  const [comment, setComment] = useState(existingRating?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);

  const categorySetters: Record<string, (v: number) => void> = {
    freshness: setFreshnessRating,
    cutting: setCuttingRating,
    delivery: setDeliveryRating,
  };
  const categoryValues: Record<string, number> = {
    freshness: freshnessRating,
    cutting: cuttingRating,
    delivery: deliveryRating,
  };

  const handleTagPress = (tag: string) => {
    if (isReadOnly) return;
    const separator = comment.trim().length > 0 ? ', ' : '';
    setComment((prev) => prev.trim() + separator + tag);
  };

  const handleSubmit = async () => {
    if (!orderId) return;
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please select an overall rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await addOrderRating({
        orderId,
        overallRating,
        freshnessRating,
        cuttingRating,
        deliveryRating,
        comment: comment.trim() || undefined,
      });
      await earnPoints(20, 'Order review');
      Alert.alert(
        'Thank You!',
        'Your review has been submitted. You earned 20 loyalty points!',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Rate Your Order</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thank-you banner for already-rated orders */}
        {isReadOnly && (
          <View style={styles.thankYouBanner}>
            <LinearGradient colors={COLORS.gradient.primary} style={styles.thankYouGrad}>
              <Icon name="check-circle" size={28} color="#FFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.thankYouTitle}>Thank You for Your Feedback!</Text>
                <Text style={styles.thankYouSub}>Your review helps us improve our service.</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Overall Rating */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Overall Experience</Text>
          <View style={styles.overallRow}>
            <StarRow
              rating={overallRating}
              onRate={setOverallRating}
              size={36}
              readOnly={isReadOnly}
            />
            {overallRating > 0 && (
              <Text style={[styles.ratingLabel, themed.textSecondary]}>
                {overallRating === 1
                  ? 'Poor'
                  : overallRating === 2
                    ? 'Fair'
                    : overallRating === 3
                      ? 'Good'
                      : overallRating === 4
                        ? 'Very Good'
                        : 'Excellent'}
              </Text>
            )}
          </View>
        </View>

        {/* Category Ratings */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Rate by Category</Text>
          {CATEGORY_LABELS.map(({ key, label, icon }) => (
            <View key={key} style={styles.categoryRow}>
              <View style={styles.categoryLabelRow}>
                <Icon name={icon as any} size={18} color={COLORS.primary} />
                <Text style={[styles.categoryLabel, themed.textSecondary]}>{label}</Text>
              </View>
              <StarRow
                rating={categoryValues[key]}
                onRate={categorySetters[key]}
                size={24}
                readOnly={isReadOnly}
              />
            </View>
          ))}
        </View>

        {/* Comment */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Your Comments</Text>
          <TextInput
            style={[styles.commentInput, themed.inputBg]}
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us about your experience..."
            placeholderTextColor={COLORS.text.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isReadOnly}
          />

          {/* Quick Tags */}
          {!isReadOnly && (
            <View style={styles.tagsContainer}>
              <Text style={[styles.tagsLabel, themed.textMuted]}>Quick tags:</Text>
              <View style={styles.tagsRow}>
                {QUICK_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, themed.softBg, themed.borderColor]}
                    onPress={() => handleTagPress(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagText, themed.textAccent]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Submit Button */}
        {!isReadOnly && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={COLORS.gradient.primary}
              style={styles.submitGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="send-check" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Points info */}
        {!isReadOnly && (
          <View style={styles.pointsInfo}>
            <Icon name="star-circle" size={16} color={COLORS.accent} />
            <Text style={[styles.pointsInfoText, themed.textMuted]}>
              Earn 20 loyalty points for submitting your review!
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  scroll: { padding: SPACING.base, paddingBottom: 20 },

  // Thank-you banner
  thankYouBanner: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  thankYouGrad: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  thankYouTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  thankYouSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // Section card
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },

  // Stars
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starTouch: { padding: 2 },

  // Overall
  overallRow: { alignItems: 'center', paddingVertical: SPACING.sm },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },

  // Category
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.secondary },

  // Comment
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 100,
    backgroundColor: '#F7F7F7',
  },

  // Quick tags
  tagsContainer: { marginTop: SPACING.md },
  tagsLabel: { fontSize: 12, color: COLORS.text.muted, marginBottom: SPACING.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tagChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSoft,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Submit
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.sm },
  submitBtnDisabled: { opacity: 0.6 },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Points info
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  pointsInfoText: { fontSize: 12, color: COLORS.text.muted },
});
