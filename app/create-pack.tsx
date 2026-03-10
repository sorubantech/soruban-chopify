import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  Alert,
  FlatList,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useSavedCarts } from '@/context/SavedCartContext';
import { useCart } from '@/context/CartContext';
import productsData from '@/data/products.json';
import { CUT_TYPE_OPTIONS } from '@/data/cutTypes';
import type { Product, CutType } from '@/types';

// ── Types ──────────────────────────────────────────────
interface SelectedItem {
  product: Product;
  quantity: number;
  cutType?: CutType;
}

const CATEGORIES = ['Vegetables', 'Fruits'] as const;

// ── Component ──────────────────────────────────────────
export default function CreatePackScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { saveCustomPack } = useSavedCarts();
  const { addToCart } = useCart();

  const [packName, setPackName] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Vegetables');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // ── Derived data ─────────────────────────────────────
  const filteredProducts = useMemo(
    () => (productsData as Product[]).filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const selectedIds = useMemo(
    () => new Set(selectedItems.map((si) => si.product.id)),
    [selectedItems],
  );

  const totalItems = useMemo(
    () => selectedItems.reduce((sum, si) => sum + si.quantity, 0),
    [selectedItems],
  );

  const totalPrice = useMemo(
    () => selectedItems.reduce((sum, si) => sum + si.product.price * si.quantity, 0),
    [selectedItems],
  );

  // ── Handlers ─────────────────────────────────────────
  const handleAddProduct = (product: Product) => {
    if (selectedIds.has(product.id)) return;
    setSelectedItems((prev) => [...prev, { product, quantity: 1 }]);
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((si) => si.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((si) =>
          si.product.id === productId
            ? { ...si, quantity: Math.max(1, si.quantity + delta) }
            : si,
        ),
    );
  };

  const handleCutTypeChange = (productId: string, cutType: CutType) => {
    setSelectedItems((prev) =>
      prev.map((si) =>
        si.product.id === productId
          ? { ...si, cutType: si.cutType === cutType ? undefined : cutType }
          : si,
      ),
    );
  };

  const handleSaveTemplate = async () => {
    if (!packName.trim()) {
      Alert.alert('Pack Name Required', 'Please enter a name for your pack.');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Add at least one item to your pack.');
      return;
    }
    await saveCustomPack({
      name: packName.trim(),
      items: selectedItems.map((si) => ({
        productId: si.product.id,
        quantity: si.quantity,
        cutType: si.cutType,
      })),
    });
    Alert.alert('Saved!', `"${packName.trim()}" has been saved as a template.`);
  };

  const handleAddToCart = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Add at least one item to your pack.');
      return;
    }
    selectedItems.forEach((si) => {
      addToCart(si.product, si.quantity, undefined, si.cutType);
    });
    router.back();
  };

  // ── Render helpers ───────────────────────────────────
  const renderProductCard = ({ item }: { item: Product }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <View style={[styles.productCard, themed.card, themed.borderColor]}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, themed.textPrimary]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.productPrice, themed.textAccent]}>
            {'\u20B9'}{item.price}/{item.unit}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, isSelected && styles.addBtnDisabled]}
          onPress={() => handleAddProduct(item)}
          disabled={isSelected}
          activeOpacity={0.7}
        >
          <Icon
            name={isSelected ? 'check' : 'plus'}
            size={18}
            color={isSelected ? COLORS.text.muted : '#fff'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Main render ──────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top']}>
      <StatusBar barStyle={themed.isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Create Your Pack</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pack name input */}
        <View style={styles.section}>
          <TextInput
            style={[styles.nameInput, themed.inputBg]}
            placeholder="Pack name (e.g. Weekly Veggies)"
            placeholderTextColor={themed.colors.text.muted}
            value={packName}
            onChangeText={setPackName}
          />
        </View>

        {/* Category chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Browse Products</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  themed.borderColor,
                  activeCategory === cat && themed.chipActive,
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Icon
                  name={cat === 'Vegetables' ? 'leaf' : 'food-apple'}
                  size={16}
                  color={activeCategory === cat ? themed.colors.primary : themed.colors.text.muted}
                />
                <Text
                  style={[
                    styles.chipLabel,
                    { color: activeCategory === cat ? themed.colors.primary : themed.colors.text.secondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product grid */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          renderItem={renderProductCard}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
        />

        {/* Selected items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>
            Your Pack ({selectedItems.length} items)
          </Text>

          {selectedItems.length === 0 ? (
            <View style={[styles.emptyState, themed.card, themed.borderColor]}>
              <Icon name="package-variant" size={48} color={themed.colors.text.muted} />
              <Text style={[styles.emptyText, themed.textMuted]}>
                Tap "+" on products above to build your pack
              </Text>
            </View>
          ) : (
            selectedItems.map((si) => (
              <View key={si.product.id} style={[styles.selectedCard, themed.card, themed.borderColor]}>
                {/* Item header row */}
                <View style={styles.selectedHeader}>
                  <Image source={{ uri: si.product.image }} style={styles.selectedImage} />
                  <View style={styles.selectedInfo}>
                    <Text style={[styles.selectedName, themed.textPrimary]} numberOfLines={1}>
                      {si.product.name}
                    </Text>
                    <Text style={[styles.selectedPrice, themed.textAccent]}>
                      {'\u20B9'}{si.product.price * si.quantity}
                    </Text>
                  </View>

                  {/* Quantity controls */}
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, themed.softBg]}
                      onPress={() => handleQuantityChange(si.product.id, -1)}
                    >
                      <Icon name="minus" size={16} color={themed.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, themed.textPrimary]}>{si.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, themed.softBg]}
                      onPress={() => handleQuantityChange(si.product.id, 1)}
                    >
                      <Icon name="plus" size={16} color={themed.colors.text.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Remove */}
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(si.product.id)}
                    style={styles.removeBtn}
                  >
                    <Icon name="close-circle" size={22} color={COLORS.status.error} />
                  </TouchableOpacity>
                </View>

                {/* Cut style chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cutChipRow}
                >
                  {CUT_TYPE_OPTIONS.map((ct) => {
                    const isActive = si.cutType === ct.id;
                    return (
                      <TouchableOpacity
                        key={ct.id}
                        style={[
                          styles.cutChip,
                          themed.borderColor,
                          isActive && { borderColor: themed.colors.primary, backgroundColor: themed.colors.backgroundSoft },
                        ]}
                        onPress={() => handleCutTypeChange(si.product.id, ct.id)}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name={ct.icon as any}
                          size={14}
                          color={isActive ? themed.colors.primary : themed.colors.text.muted}
                        />
                        <Text
                          style={[
                            styles.cutChipLabel,
                            { color: isActive ? themed.colors.primary : themed.colors.text.secondary },
                          ]}
                        >
                          {ct.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </View>

        {/* Summary card */}
        {selectedItems.length > 0 && (
          <View style={[styles.summaryCard, themed.card, themed.borderColor]}>
            <Text style={[styles.summaryTitle, themed.textPrimary]}>Pack Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, themed.textSecondary]}>Total Items</Text>
              <Text style={[styles.summaryValue, themed.textPrimary]}>{totalItems}</Text>
            </View>
            <View style={[styles.divider, themed.dividerColor]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, themed.textSecondary]}>Total Price</Text>
              <Text style={[styles.summaryTotal, themed.textAccent]}>
                {'\u20B9'}{totalPrice}
              </Text>
            </View>
          </View>
        )}

        {/* Spacer for bottom buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom action buttons */}
      <View style={[styles.bottomBar, themed.card, { borderTopColor: themed.colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn, themed.borderColor]}
          onPress={handleSaveTemplate}
          activeOpacity={0.7}
        >
          <Icon name="content-save-outline" size={20} color={themed.colors.primary} />
          <Text style={[styles.saveBtnText, { color: themed.colors.primary }]}>Save as Template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.cartBtn]}
          onPress={handleAddToCart}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={themed.primaryGradient}
            style={styles.cartBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="cart-plus" size={20} color="#fff" />
            <Text style={styles.cartBtnText}>Add to Cart</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.base,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.base,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },

  // Pack name input
  nameInput: {
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.base,
    fontSize: 15,
    fontWeight: '500',
  },

  // Category chips
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Product grid
  gridContainer: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  productCard: {
    width: '31%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  productImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  productInfo: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 11,
    fontWeight: '700',
  },
  addBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },
  addBtnDisabled: {
    backgroundColor: COLORS.border,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    marginTop: SPACING.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Selected item card
  selectedCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedImage: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    resizeMode: 'cover',
  },
  selectedInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  // Quantity controls
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: SPACING.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 2,
  },

  // Cut type chips
  cutChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  cutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  cutChipLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Summary card
  summaryCard: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    ...SHADOW.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.xs,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
    ...SHADOW.floating,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveBtn: {
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cartBtn: {},
  cartBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
