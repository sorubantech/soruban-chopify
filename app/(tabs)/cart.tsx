import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Alert, TextInput, ScrollView } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useCart } from '@/context/CartContext';
import { useScrollContext } from '@/context/ScrollContext';
import { getCutLabel, getCutFee } from '@/data/cutTypes';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useCoupons } from '@/context/CouponContext';
import { useSavedCarts } from '@/context/SavedCartContext';
import productsData from '@/data/products.json';

export default function CartScreen() {
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, getSubtotal, getCuttingTotal, getItemCount } = useCart();
  const { handleScroll } = useScrollContext();
  const themed = useThemedStyles();
  const { appliedCoupon, applyCoupon, removeCoupon, calculateDiscount } = useCoupons();
  const { saveCart } = useSavedCarts();
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  const MIN_ORDER = 100;
  const FREE_DELIVERY_THRESHOLD = 300;

  const subtotal = getSubtotal();
  const cuttingTotal = getCuttingTotal();
  const minOrderProgress = Math.min(subtotal / MIN_ORDER, 1);
  const freeDeliveryProgress = Math.min(subtotal / FREE_DELIVERY_THRESHOLD, 1);
  const couponDiscount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal) : 0;
  const deliveryFee = subtotal > 0 ? 25 : 0;
  const total = subtotal + deliveryFee;

  const suggestions = useMemo(() => {
    const cartIds = cartItems.map(c => c.id);
    return productsData.filter(p => !cartIds.includes(p.id) && (p.category === 'Vegetables' || p.category === 'Fruits')).slice(0, 6);
  }, [cartItems]);

  const handleApplyCoupon = () => {
    const result = applyCoupon(couponCode, subtotal);
    setCouponMsg(result.message);
  };

  const handleSaveCart = () => {
    if (cartItems.length === 0) return;
    Alert.alert('Save Cart', 'Save current cart for later?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: () => { saveCart('My Cart ' + new Date().toLocaleDateString(), cartItems); Alert.alert('Saved!', 'Cart saved successfully.'); } },
    ]);
  };

  const calcItemPrice = (item: typeof cartItems[0]) => {
    let base = item.price;
    if (item.selectedWeight && item.unit.includes('kg')) base = Math.round((item.price * item.selectedWeight) / 1000);
    return base * item.quantity + getCutFee(item.cutType) * item.quantity;
  };

  const getWeightLabel = (item: typeof cartItems[0]) => {
    if (!item.selectedWeight) return item.unit;
    return item.selectedWeight >= 1000 ? `${item.selectedWeight / 1000} kg` : `${item.selectedWeight}g`;
  };

  const renderItem = ({ item }: { item: typeof cartItems[0] }) => (
    <View style={[styles.itemCard, themed.card]}>
      <View style={styles.itemImageWrap}>
        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemUnit}>{getWeightLabel(item)}</Text>
        {item.cutType && (
          <View style={styles.cutBadge}>
            <Text style={styles.cutBadgeText}>{getCutLabel(item.cutType)} (+{'\u20B9'}{getCutFee(item.cutType)})</Text>
          </View>
        )}
        {item.specialInstructions ? <Text style={styles.instructions} numberOfLines={1}>{'\uD83D\uDCDD'} {item.specialInstructions}</Text> : null}
        <View style={styles.itemBottom}>
          <Text style={styles.itemPrice}>{'\u20B9'}{calcItemPrice(item)}</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
              <Icon name="minus" size={14} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
              <Icon name="plus" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item.id)}>
        <Icon name="delete-outline" size={18} color={COLORS.status.error} />
      </TouchableOpacity>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient colors={themed.headerGradient} style={styles.header}><Text style={[styles.headerTitle, themed.textPrimary]}>{'\uD83D\uDED2'} Your Cart</Text></LinearGradient>
        <View style={styles.emptyContainer}>
          <Icon name="cart-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDesc}>Add fresh-cut vegetables & fruits to get started</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push({ pathname: '/browse', params: { category: 'Vegetables' } })}>
            <Text style={styles.emptyBtnText}>Browse Items</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={themed.headerGradient} style={styles.header}><Text style={[styles.headerTitle, themed.textPrimary]}>{'\uD83D\uDED2'} Your Cart ({getItemCount()} items)</Text></LinearGradient>
      <ScrollView
        showsVerticalScrollIndicator
        onScroll={handleScroll} scrollEventThrottle={16}
        contentContainerStyle={styles.list}
      >
        {/* Cart Items - scrollable container when >3 items */}
        {cartItems.length > 3 && (
          <View style={styles.cartItemsHeaderRow}>
            <Text style={styles.cartItemsCount}>{cartItems.length} items in cart</Text>
            <Text style={styles.cartScrollHint}>Scroll to see all</Text>
          </View>
        )}
        <View style={cartItems.length > 3 ? styles.cartItemsScrollWrap : undefined}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={cartItems.length > 3}
            style={cartItems.length > 3 ? styles.cartItemsScroll : undefined}
          >
            {cartItems.map((item, idx) => (
              <View key={`${item.id}_${idx}`}>
                {renderItem({ item })}
              </View>
            ))}
          </ScrollView>
        </View>

        {subtotal < MIN_ORDER && (
          <View style={styles.minOrderCard}>
            <View style={styles.minOrderRow}>
              <Icon name="information-outline" size={16} color="#E65100" />
              <Text style={styles.minOrderText}>Add ₹{MIN_ORDER - subtotal} more to place order (Min: ₹{MIN_ORDER})</Text>
            </View>
            <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${minOrderProgress * 100}%` }]} /></View>
          </View>
        )}

        {subtotal < FREE_DELIVERY_THRESHOLD && (
          <View style={styles.freeDeliveryCard}>
            <View style={styles.minOrderRow}>
              <Icon name="truck-delivery-outline" size={16} color={COLORS.green} />
              <Text style={styles.freeDeliveryText}>Add ₹{FREE_DELIVERY_THRESHOLD - subtotal} more for FREE delivery</Text>
            </View>
            <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${freeDeliveryProgress * 100}%`, backgroundColor: COLORS.green }]} /></View>
          </View>
        )}

        <View style={[styles.couponSection, themed.card]}>
          <Text style={[styles.couponTitle, themed.textPrimary]}>Apply Coupon</Text>
          <View style={styles.couponInputRow}>
            <TextInput style={styles.couponInput} placeholder="Enter code" placeholderTextColor={COLORS.text.muted} value={couponCode} onChangeText={setCouponCode} autoCapitalize="characters" />
            {appliedCoupon ? (
              <TouchableOpacity style={styles.couponRemoveBtn} onPress={() => { removeCoupon(); setCouponCode(''); setCouponMsg(''); }}>
                <Icon name="close" size={16} color={COLORS.status.error} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.couponApplyBtn} onPress={handleApplyCoupon}>
                <Text style={styles.couponApplyText}>APPLY</Text>
              </TouchableOpacity>
            )}
          </View>
          {couponMsg !== '' && <Text style={[styles.couponMsg, { color: appliedCoupon ? COLORS.green : COLORS.status.error }]}>{couponMsg}</Text>}
          {appliedCoupon && <Text style={styles.couponSaving}>You save ₹{couponDiscount}!</Text>}
          <TouchableOpacity onPress={() => router.push('/offers-coupons' as any)}><Text style={styles.viewCouponsLink}>View all coupons</Text></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveCartBtn} onPress={handleSaveCart}>
          <Icon name="content-save-outline" size={18} color={COLORS.primary} />
          <Text style={styles.saveCartText}>Save Cart for Later</Text>
        </TouchableOpacity>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionsTitle, themed.textPrimary]}>You might also need</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
              {suggestions.map(p => (
                <TouchableOpacity key={p.id} style={[styles.suggestionCard, themed.card]}
                  onPress={() => router.push({ pathname: '/product-detail', params: { id: p.id } })}>
                  <Image source={{ uri: p.image }} style={styles.suggestionImg} resizeMode="cover" />
                  <Text style={styles.suggestionName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.suggestionPrice}>₹{p.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.billCard, themed.card]}>
          <Text style={[styles.billTitle, themed.textPrimary]}>Bill Summary</Text>
          <View style={styles.billRow}><Text style={styles.billLabel}>Items Total</Text><Text style={styles.billValue}>{'\u20B9'}{subtotal - cuttingTotal}</Text></View>
          {cuttingTotal > 0 && <View style={styles.billRow}><Text style={styles.billLabel}>{'\uD83D\uDD2A'} Cutting Charges</Text><Text style={[styles.billValue, { color: COLORS.primary }]}>{'\u20B9'}{cuttingTotal}</Text></View>}
          <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Fee</Text><Text style={styles.billValue}>{'\u20B9'}{deliveryFee}</Text></View>
          <View style={[styles.billRow, styles.billTotal]}><Text style={styles.billTotalLabel}>Total</Text><Text style={styles.billTotalValue}>{'\u20B9'}{total}</Text></View>
        </View>
      </ScrollView>
      <View style={[styles.checkoutBar, themed.card]}>
        <View>
          <Text style={[styles.checkoutTotal, themed.textPrimary]}>{'\u20B9'}{total}</Text>
          <Text style={styles.checkoutSub}>incl. cutting charges</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Icon name="chevron-right" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  list: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: 20 },
  cartItemsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  cartItemsCount: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  cartScrollHint: { fontSize: 11, color: COLORS.text.muted, fontStyle: 'italic' },
  cartItemsScrollWrap: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: SPACING.sm },
  cartItemsScroll: { maxHeight: 420 },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  itemImageWrap: { width: 60, height: 60, borderRadius: RADIUS.md, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemBody: { flex: 1, marginLeft: SPACING.md },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  itemUnit: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  cutBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, borderWidth: 1, borderColor: '#A5D6A7' },
  cutBadgeText: { fontSize: 10, fontWeight: '600', color: '#4CAF50' },
  instructions: { fontSize: 10, color: COLORS.text.muted, marginTop: 3 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  billCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md, ...SHADOW.sm },
  billTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billLabel: { fontSize: 13, color: COLORS.text.secondary },
  billValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  billTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 10 },
  billTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  billTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  checkoutBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, paddingBottom: 80, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.floating },
  checkoutTotal: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  checkoutSub: { fontSize: 10, color: COLORS.text.muted },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 12 },
  checkoutBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary, marginTop: SPACING.base },
  emptyDesc: { fontSize: 13, color: COLORS.text.muted, textAlign: 'center', marginTop: 4 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 12, marginTop: SPACING.lg },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  minOrderCard: { marginTop: SPACING.md, backgroundColor: '#FFF3E0', borderRadius: RADIUS.lg, padding: SPACING.md },
  minOrderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  minOrderText: { fontSize: 12, fontWeight: '600', color: '#E65100', flex: 1 },
  progressBarBg: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  progressBarFill: { height: 4, backgroundColor: '#FF9800', borderRadius: 2 },
  freeDeliveryCard: { marginTop: SPACING.sm, backgroundColor: '#E8F5E9', borderRadius: RADIUS.lg, padding: SPACING.md },
  freeDeliveryText: { fontSize: 12, fontWeight: '600', color: COLORS.green, flex: 1 },
  couponSection: { marginTop: SPACING.md, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  couponTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.sm },
  couponInputRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderStyle: 'dashed' },
  couponApplyBtn: { backgroundColor: COLORS.green, borderRadius: RADIUS.md, paddingHorizontal: 16, justifyContent: 'center' },
  couponApplyText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  couponRemoveBtn: { width: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.status.error, borderRadius: RADIUS.md },
  couponMsg: { fontSize: 11, marginTop: 6 },
  couponSaving: { fontSize: 12, fontWeight: '700', color: COLORS.green, marginTop: 4 },
  viewCouponsLink: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 8 },
  saveCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.lg, borderStyle: 'dashed' },
  saveCartText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  suggestionsSection: { marginTop: SPACING.lg },
  suggestionsTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  suggestionsScroll: { gap: 8, paddingBottom: 4 },
  suggestionCard: { width: 90, backgroundColor: '#FFF', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  suggestionImg: { width: 90, height: 60 },
  suggestionName: { fontSize: 10, fontWeight: '600', color: COLORS.text.primary, paddingHorizontal: 4, paddingTop: 4 },
  suggestionPrice: { fontSize: 11, fontWeight: '800', color: COLORS.primary, paddingHorizontal: 4, paddingBottom: 4 },
});
