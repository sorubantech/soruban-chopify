import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useSavedCarts } from '@/context/SavedCartContext';
import { useCart } from '@/context/CartContext';
import type { Product, SavedCart, CustomPack } from '@/types';
import productsData from '@/data/products.json';

type Tab = 'carts' | 'packs';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SavedCartsScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { savedCarts, customPacks, deleteSavedCart, deleteCustomPack, updateCustomPackLastOrdered } = useSavedCarts();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState<Tab>('carts');

  const handleLoadCart = (cart: SavedCart) => {
    cart.items.forEach((item) => {
      addToCart(item as Product, item.quantity, item.selectedWeight, item.cutType, item.specialInstructions);
    });
    Alert.alert('Added to Cart', `${cart.items.length} item(s) from "${cart.name}" added to your cart.`);
  };

  const handleDeleteCart = (cart: SavedCart) => {
    Alert.alert('Delete Saved Cart', `Are you sure you want to delete "${cart.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSavedCart(cart.id) },
    ]);
  };

  const handleReorderPack = (pack: CustomPack) => {
    const productsMap = new Map(productsData.map((p) => [p.id, p]));
    let addedCount = 0;
    pack.items.forEach((item) => {
      const product = productsMap.get(item.productId);
      if (product) {
        addToCart(product as Product, item.quantity, undefined, item.cutType);
        addedCount++;
      }
    });
    updateCustomPackLastOrdered(pack.id);
    Alert.alert('Added to Cart', `${addedCount} item(s) from "${pack.name}" added to your cart.`);
  };

  const handleDeletePack = (pack: CustomPack) => {
    Alert.alert('Delete Custom Pack', `Are you sure you want to delete "${pack.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCustomPack(pack.id) },
    ]);
  };

  const getItemPreview = (cart: SavedCart) => {
    const names = cart.items.slice(0, 3).map((i) => i.name);
    const remaining = cart.items.length - 3;
    let preview = names.join(', ');
    if (remaining > 0) preview += ` +${remaining} more`;
    return preview;
  };

  const getPackItemNames = (pack: CustomPack) => {
    const productsMap = new Map(productsData.map((p) => [p.id, p]));
    const names = pack.items.slice(0, 3).map((i) => productsMap.get(i.productId)?.name ?? 'Unknown').filter(Boolean);
    const remaining = pack.items.length - 3;
    let preview = names.join(', ');
    if (remaining > 0) preview += ` +${remaining} more`;
    return preview;
  };

  const renderCartItem = ({ item }: { item: SavedCart }) => (
    <View style={[styles.card, themed.card]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Icon name="cart-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.cardName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteCart(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="trash-can-outline" size={20} color={COLORS.status.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, themed.textMuted]}>{item.items.length} item{item.items.length !== 1 ? 's' : ''}</Text>
        <View style={styles.dot} />
        <Text style={[styles.metaText, themed.textMuted]}>{formatDate(item.createdAt)}</Text>
      </View>

      <Text style={[styles.previewText, themed.textSecondary]} numberOfLines={2}>{getItemPreview(item)}</Text>

      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => handleLoadCart(item)}>
        <LinearGradient colors={themed.primaryGradient} style={styles.actionBtnGradient}>
          <Icon name="cart-plus" size={16} color="#FFF" />
          <Text style={styles.actionBtnText}>Load to Cart</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPackItem = ({ item }: { item: CustomPack }) => (
    <View style={[styles.card, themed.card]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Icon name="package-variant" size={20} color={COLORS.primary} />
          <Text style={[styles.cardName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeletePack(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="trash-can-outline" size={20} color={COLORS.status.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, themed.textMuted]}>{item.items.length} item{item.items.length !== 1 ? 's' : ''}</Text>
        <View style={styles.dot} />
        <Text style={[styles.metaText, themed.textMuted]}>Created {formatDate(item.createdAt)}</Text>
      </View>

      {item.lastOrdered && (
        <Text style={[styles.lastOrdered, themed.textMuted]}>Last ordered {formatDate(item.lastOrdered)}</Text>
      )}

      <Text style={[styles.previewText, themed.textSecondary]} numberOfLines={2}>{getPackItemNames(item)}</Text>

      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => handleReorderPack(item)}>
        <LinearGradient colors={themed.primaryGradient} style={styles.actionBtnGradient}>
          <Icon name="replay" size={16} color="#FFF" />
          <Text style={styles.actionBtnText}>Reorder</Text>
        </LinearGradient>
      </TouchableOpacity>
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
            <Text style={[styles.headerTitle, themed.textPrimary]}>Saved Carts</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, themed.card]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'carts' && styles.tabActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('carts')}
        >
          <Icon name="cart-outline" size={18} color={activeTab === 'carts' ? COLORS.primary : COLORS.text.muted} />
          <Text style={[styles.tabText, activeTab === 'carts' && styles.tabTextActive]}>Saved Carts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'packs' && styles.tabActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('packs')}
        >
          <Icon name="package-variant" size={18} color={activeTab === 'packs' ? COLORS.primary : COLORS.text.muted} />
          <Text style={[styles.tabText, activeTab === 'packs' && styles.tabTextActive]}>My Packs</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'carts' ? (
        <FlatList
          data={savedCarts}
          keyExtractor={(item) => item.id}
          renderItem={renderCartItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="cart-off" size={48} color={COLORS.text.muted} />
              <Text style={[styles.emptyText, themed.textMuted]}>No saved carts yet</Text>
              <Text style={[styles.emptyHint, themed.textMuted]}>Save your cart from the Cart tab to quickly reorder later</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={customPacks}
          keyExtractor={(item) => item.id}
          renderItem={renderPackItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="package-variant-closed" size={48} color={COLORS.text.muted} />
              <Text style={[styles.emptyText, themed.textMuted]}>No custom packs</Text>
              <Text style={[styles.emptyHint, themed.textMuted]}>Create one from the Packs tab!</Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.createPackBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/create-pack' as any)}
            >
              <LinearGradient colors={themed.primaryGradient} style={styles.createPackGradient}>
                <Icon name="plus-circle-outline" size={20} color="#FFF" />
                <Text style={styles.createPackText}>Create New Pack</Text>
              </LinearGradient>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.base,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: 4,
    ...SHADOW.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.backgroundSoft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.muted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  /* List */
  list: { padding: SPACING.base, paddingBottom: 40 },

  /* Card */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.muted,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.muted,
  },
  lastOrdered: {
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 4,
  },
  previewText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
    lineHeight: 18,
  },

  /* Action button */
  actionBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },

  /* Create Pack */
  createPackBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  createPackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    gap: 8,
  },
  createPackText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  /* Empty */
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: 8, fontWeight: '600' },
  emptyHint: { fontSize: 12, color: COLORS.text.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: SPACING.xl },
});
