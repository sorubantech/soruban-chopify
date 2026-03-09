import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Image, StatusBar, useWindowDimensions, TextInput } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import productsData from '@/data/products.json';

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

  const [activeCategory, setActiveCategory] = useState(category || 'Vegetables');
  const [activeSub, setActiveSub] = useState('All');
  const [search, setSearch] = useState('');

  const subs = SUBCATEGORIES[activeCategory] || ['All'];

  const products = useMemo(() => {
    let filtered = productsData.filter(p => p.category === activeCategory && p.inStock !== false);
    if (activeSub !== 'All') filtered = filtered.filter(p => p.subcategory === activeSub);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [activeCategory, activeSub, search]);

  const cardW = (width - SPACING.base * 2 - 10) / 2;

  const renderProduct = ({ item }: { item: typeof productsData[0] }) => (
    <TouchableOpacity
      style={[styles.card, { width: cardW }]} activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
    >
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        {item.discount && <View style={styles.discountTag}><Text style={styles.discountText}>{item.discount}</Text></View>}
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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={COLORS.gradient.header} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={COLORS.text.primary} /></TouchableOpacity>
            <Text style={styles.headerTitle}>{activeCategory}</Text>
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
  catChipActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
  catChipText: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  catChipTextActive: { color: COLORS.primary },
  subRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.base, marginTop: SPACING.sm, marginBottom: SPACING.sm, gap: 6 },
  subChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border },
  subChipActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3E0' },
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
});
