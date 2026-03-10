import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useCoupons } from '@/context/CouponContext';
import type { Coupon } from '@/types';

const DEFAULT_ORDER_TOTAL = 500;

export default function OffersCouponsScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { availableCoupons, applyCoupon } = useCoupons();

  const [couponCode, setCouponCode] = useState('');
  const [termsExpanded, setTermsExpanded] = useState(false);

  const topCoupons = availableCoupons.slice(0, 2);

  const handleApply = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('Enter Code', 'Please enter a coupon code to apply.');
      return;
    }
    const result = applyCoupon(trimmed, DEFAULT_ORDER_TOTAL);
    Alert.alert(result.success ? 'Coupon Applied!' : 'Could not apply', result.message);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const discountLabel = (coupon: Coupon) =>
    coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% OFF`
      : `\u20B9${coupon.discountValue} OFF`;

  // ─── Best Offer Gradient Card ───
  const renderBestOffer = (coupon: Coupon, index: number) => (
    <LinearGradient
      key={coupon.id}
      colors={index === 0 ? themed.heroGradient : themed.primaryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bestCard}
    >
      <View style={styles.bestBadge}>
        <Icon name="star-circle" size={16} color="#FFD700" />
        <Text style={styles.bestBadgeText}>BEST OFFER</Text>
      </View>
      <Text style={styles.bestDiscount}>{discountLabel(coupon)}</Text>
      <Text style={styles.bestTitle} numberOfLines={1}>{coupon.title}</Text>
      <Text style={styles.bestDesc} numberOfLines={2}>{coupon.description}</Text>
      <View style={styles.bestCodeRow}>
        <View style={styles.bestCodeBox}>
          <Text style={styles.bestCodeText}>{coupon.code}</Text>
        </View>
        <TouchableOpacity
          style={styles.bestApplyBtn}
          activeOpacity={0.8}
          onPress={() => {
            setCouponCode(coupon.code);
            handleApply(coupon.code);
          }}
        >
          <Text style={styles.bestApplyText}>APPLY</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // ─── Coupon Card ───
  const renderCoupon = ({ item }: { item: Coupon }) => {
    const remaining = item.usageLimit - item.usedCount;

    return (
      <View style={[styles.couponCard, themed.card, themed.borderColor]}>
        {/* Left dashed ticket border */}
        <View style={styles.ticketLeft}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{discountLabel(item)}</Text>
          </View>
        </View>

        {/* Coupon body */}
        <View style={styles.couponBody}>
          <Text style={[styles.couponTitle, themed.textPrimary]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.couponDesc, themed.textSecondary]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Code box */}
          <TouchableOpacity
            style={[styles.codeBox, themed.borderColor]}
            activeOpacity={0.7}
            onPress={() => setCouponCode(item.code)}
          >
            <Text style={[styles.codeText, themed.textPrimary]}>{item.code}</Text>
            <Icon name="content-copy" size={14} color={COLORS.text.muted} />
          </TouchableOpacity>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Min order: {'\u20B9'}{item.minOrderValue}</Text>
            <Text style={styles.metaDot}>{'\u00B7'}</Text>
            <Text style={styles.metaText}>Valid till {formatDate(item.validTo)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{remaining} use{remaining !== 1 ? 's' : ''} remaining</Text>
            {item.maxDiscount && item.discountType === 'percentage' && (
              <>
                <Text style={styles.metaDot}>{'\u00B7'}</Text>
                <Text style={styles.metaText}>Max save {'\u20B9'}{item.maxDiscount}</Text>
              </>
            )}
          </View>

          {/* Category tag */}
          {item.category ? (
            <View style={[styles.categoryTag, themed.softBg]}>
              <Icon name="tag-outline" size={12} color={COLORS.primary} />
              <Text style={styles.categoryTagText}>{item.category}</Text>
            </View>
          ) : null}

          {/* Apply button */}
          <TouchableOpacity
            style={styles.applyBtn}
            activeOpacity={0.8}
            onPress={() => {
              setCouponCode(item.code);
              handleApply(item.code);
            }}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Ticket notch decorations */}
        <View style={[styles.notchTop, { backgroundColor: themed.colors.background }]} />
        <View style={[styles.notchBottom, { backgroundColor: themed.colors.background }]} />
      </View>
    );
  };

  // ─── Header Component for FlatList ───
  const ListHeader = () => (
    <View>
      {/* Best Offers Section */}
      {topCoupons.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="fire" size={20} color={COLORS.status.warning} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Best Offers</Text>
          </View>
          {topCoupons.map((c, i) => renderBestOffer(c, i))}
        </View>
      )}

      {/* Coupon Input */}
      <View style={[styles.inputSection, themed.card, themed.borderColor]}>
        <View style={styles.inputRow}>
          <Icon name="ticket-percent-outline" size={22} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
          <TextInput
            style={[styles.input, themed.inputBg]}
            placeholder="Enter coupon code"
            placeholderTextColor={COLORS.text.muted}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.inputApplyBtn, !couponCode.trim() && styles.inputApplyBtnDisabled]}
            activeOpacity={0.8}
            onPress={() => handleApply(couponCode)}
          >
            <Text style={styles.inputApplyText}>APPLY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section label for available coupons */}
      {availableCoupons.length > 0 && (
        <View style={styles.sectionHeader}>
          <Icon name="ticket-confirmation-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Available Coupons</Text>
        </View>
      )}
    </View>
  );

  // ─── Footer: Terms section ───
  const ListFooter = () => (
    <View style={{ paddingBottom: 40 }}>
      {availableCoupons.length === 0 && (
        <View style={styles.empty}>
          <Icon name="ticket-percent-outline" size={56} color={COLORS.text.muted} />
          <Text style={styles.emptyTitle}>No Coupons Available</Text>
          <Text style={styles.emptyHint}>Check back later for exciting offers!</Text>
        </View>
      )}

      {/* Coupon Terms */}
      <TouchableOpacity
        style={[styles.termsHeader, themed.card, themed.borderColor]}
        activeOpacity={0.8}
        onPress={() => setTermsExpanded(!termsExpanded)}
      >
        <View style={styles.termsHeaderRow}>
          <Icon name="information-outline" size={18} color={COLORS.text.secondary} />
          <Text style={[styles.termsTitle, themed.textPrimary]}>Coupon Terms</Text>
        </View>
        <Icon
          name={termsExpanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={COLORS.text.muted}
        />
      </TouchableOpacity>
      {termsExpanded && (
        <View style={[styles.termsBody, themed.card]}>
          <Text style={[styles.termsText, themed.textSecondary]}>
            {'\u2022'} Coupons are applicable on eligible orders only.{'\n'}
            {'\u2022'} Only one coupon can be applied per order.{'\n'}
            {'\u2022'} Discount is applied on the cart total before delivery charges.{'\n'}
            {'\u2022'} Coupons cannot be combined with other promotions unless stated.{'\n'}
            {'\u2022'} Soruban Cutting reserves the right to modify or revoke coupons at any time.{'\n'}
            {'\u2022'} Category-specific coupons apply only to items in that category.{'\n'}
            {'\u2022'} Expired or fully redeemed coupons cannot be applied.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Offers & Coupons</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <FlatList
        data={availableCoupons}
        keyExtractor={(item) => item.id}
        renderItem={renderCoupon}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // ─── Header ───
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },

  list: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm },

  // ─── Sections ───
  section: { marginBottom: SPACING.base },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },

  // ─── Best Offer Cards ───
  bestCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
  },
  bestDiscount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bestDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: SPACING.md,
    lineHeight: 17,
  },
  bestCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bestCodeBox: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  bestCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  bestApplyBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.base,
  },
  bestApplyText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  // ─── Input Section ───
  inputSection: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  inputApplyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.base,
    marginLeft: SPACING.sm,
  },
  inputApplyBtnDisabled: {
    opacity: 0.5,
  },
  inputApplyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ─── Coupon Card (ticket style) ───
  couponCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  ticketLeft: {
    width: 84,
    borderRightWidth: 1.5,
    borderRightColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.base,
  },
  discountBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    transform: [{ rotate: '-90deg' }],
    minWidth: 80,
    alignItems: 'center',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  couponBody: {
    flex: 1,
    padding: SPACING.md,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  couponDesc: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginBottom: SPACING.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: COLORS.text.muted,
  },
  metaDot: {
    fontSize: 11,
    color: COLORS.text.muted,
    marginHorizontal: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  applyBtn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  // Ticket notch circles
  notchTop: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  notchBottom: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },

  // ─── Empty State ───
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.muted,
    marginTop: SPACING.md,
  },
  emptyHint: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: SPACING.xs,
  },

  // ─── Terms ───
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  termsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  termsBody: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    paddingTop: SPACING.sm,
    marginTop: -SPACING.sm,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
});
