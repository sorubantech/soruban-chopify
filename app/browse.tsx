import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Image, StatusBar, useWindowDimensions, TextInput } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import productsData from '@/data/products.json';
import { useFavorites } from '@/context/FavoritesContext';

const ALL_CATEGORIES = ['Vegetables', 'Fruits', 'Healthy Snacks', 'Diet Foods', 'Sports Nutrition'];

const SUBCATEGORIES: Record<string, string[]> = {
  Vegetables: ['All', 'Everyday', 'Leafy', 'Root', 'Gourd'],
  Fruits: ['All', 'Everyday', 'Citrus', 'Seasonal'],
  'Healthy Snacks': ['All', 'Salads', 'Snacks', 'Drinks'],
  'Diet Foods': ['All', 'Diabetes Friendly', 'Asthma Friendly', 'Heart Healthy'],
  'Sports Nutrition': ['All', 'Salads', 'Drinks', 'Snacks', 'Meals'],
};

export default function BrowseScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { width } = useWindowDimensions();
  const themed = useThemedStyles();

  const [activeCategory, setActiveCategory] = useState(category || 'Vegetables');
  const [activeSub, setActiveSub] = useState('All');
  const [search, setSearch] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();
  const [sortBy, setSortBy] = useState<'default' | 'price_low' | 'price_high' | 'name'>('default');
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  const subs = SUBCATEGORIES[activeCategory] || ['All'];

  const products = useMemo(() => {
    let filtered = productsData.filter(p => p.category === activeCategory);
    if (activeSub !== 'All') filtered = filtered.filter(p => p.subcategory === activeSub);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    // Sort & filter
    let sortedProducts = [...filtered];
    if (!showOutOfStock) sortedProducts = sortedProducts.filter(p => p.inStock !== false);
    if (sortBy === 'price_low') sortedProducts.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_high') sortedProducts.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name') sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
    return sortedProducts;
  }, [activeCategory, activeSub, search, sortBy, showOutOfStock]);

  const cardW = (width - SPACING.base * 2 - 10) / 2;

  const renderProduct = ({ item }: { item: typeof productsData[0] }) => (
    <TouchableOpacity
      style={[styles.card, { width: cardW }, themed.card]} activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
    >
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        {item.discount && <View style={styles.discountTag}><Text style={styles.discountText}>{item.discount}</Text></View>}
        <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item.id)}><Icon name={isFavorite(item.id) ? 'heart' : 'heart-outline'} size={18} color={isFavorite(item.id) ? COLORS.primary : '#999'} /></TouchableOpacity>
        {item.inStock === false && <View style={styles.outOfStockOverlay}><Text style={styles.outOfStockText}>Out of Stock</Text></View>}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardUnit}>{item.unit}</Text>
        {item.tags && item.tags[0] && (
          <View style={styles.cardTag}><Text style={styles.cardTagText}>{item.tags[0]}</Text></View>
        )}
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>{'\u20B9'}{item.price}</Text>
          <View style={styles.addBtnSmall}><Text style={styles.addBtnText}>ADD</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={COLORS.text.primary} /></TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>{activeCategory}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color={COLORS.text.muted} />
        <TextInput style={styles.searchInput} placeholder={`Search ${activeCategory.toLowerCase()}...`} placeholderTextColor={COLORS.text.muted} value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Icon name="close" size={18} color={COLORS.text.muted} /></TouchableOpacity>}
      </View>

      <View style={styles.catToggleWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catToggle}>
          {ALL_CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} style={[styles.catChip, activeCategory === cat && styles.catChipActive]} onPress={() => { setActiveCategory(cat); setActiveSub('All'); }}>
              <Text style={[styles.catChipText, activeCategory === cat && styles.catChipTextActive]} numberOfLines={1}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.subRow}>
        {subs.map(sub => (
          <TouchableOpacity key={sub} style={[styles.subChip, activeSub === sub && styles.subChipActive]} onPress={() => setActiveSub(sub)}>
            <Text style={[styles.subChipText, activeSub === sub && styles.subChipTextActive]}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort & Filter Bar */}
      <View style={styles.sortBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
          {([
            { key: 'default', label: 'Relevance' },
            { key: 'price_low', label: 'Price: Low-High' },
            { key: 'price_high', label: 'Price: High-Low' },
            { key: 'name', label: 'Name A-Z' },
          ] as const).map(s => (
            <TouchableOpacity key={s.key} style={[styles.sortChip, sortBy === s.key && styles.sortChipActive]} onPress={() => setSortBy(s.key)}>
              <Text style={[styles.sortChipText, sortBy === s.key && styles.sortChipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.stockToggle} onPress={() => setShowOutOfStock(!showOutOfStock)}>
          <Icon name={showOutOfStock ? 'eye' : 'eye-off'} size={16} color={COLORS.text.muted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products} numColumns={2} keyExtractor={i => i.id} renderItem={renderProduct}
        contentContainerStyle={styles.grid} columnWrapperStyle={styles.gridRow} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.empty}><Icon name="magnify" size={48} color={COLORS.text.muted} /><Text style={styles.emptyText}>No products found</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACING.base, marginTop: SPACING.sm, backgroundColor: '#FFF', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text.primary, paddingVertical: 0 },
  catToggleWrap: { marginTop: SPACING.md, height: 38 },
  catToggle: { paddingHorizontal: SPACING.base, gap: 8, alignItems: 'center' },
  catChip: { paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  catChipText: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  catChipTextActive: { color: COLORS.primary },
  subRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.base, marginTop: SPACING.sm, marginBottom: SPACING.sm, gap: 6 },
  subChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border },
  subChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  subChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text.muted },
  subChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  grid: { paddingHorizontal: SPACING.base, paddingBottom: 40 },
  gridRow: { justifyContent: 'space-between', marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, ...SHADOW.sm, overflow: 'hidden' },
  cardImageWrap: { width: '100%', height: 110, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  discountTag: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  cardBody: { padding: 8 },
  cardName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  cardUnit: { fontSize: 11, color: COLORS.text.muted, marginBottom: 4 },
  cardTag: { backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
  cardTagText: { fontSize: 9, fontWeight: '700', color: COLORS.green },
  cardPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  addBtnSmall: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 14 },
  addBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: 8 },
  sortBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  sortChips: { gap: 6, paddingRight: 8 },
  sortChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFF' },
  sortChipActive: { borderColor: COLORS.green, backgroundColor: '#EAF7EB' },
  sortChipText: { fontSize: 11, fontWeight: '600', color: COLORS.text.secondary },
  sortChipTextActive: { color: COLORS.green },
  stockToggle: { padding: 6 },
  favBtn: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.lg },
  outOfStockText: { fontSize: 12, fontWeight: '700', color: COLORS.status.error },
});
