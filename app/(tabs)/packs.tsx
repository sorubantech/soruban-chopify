import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, Animated } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useScrollContext } from '@/context/ScrollContext';
import { DISH_PACKS } from '@/data/dishPacks';
import productsData from '@/data/products.json';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

type FilterType = 'all' | 'veg' | 'fruit';
const FRUIT_PACK_IDS = ['pack_fruit_salad', 'pack_fruit_juice'];

export default function PacksScreen() {
  const router = useRouter();
  const { handleScroll } = useScrollContext();
  const [filter, setFilter] = useState<FilterType>('all');
  const themed = useThemedStyles();
  const scrollY = useRef(new Animated.Value(0)).current;

  const heroBannerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const heroBannerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => handleScroll(event),
    },
  );

  const packs = useMemo(() => {
    if (filter === 'all') return DISH_PACKS;
    if (filter === 'fruit') return DISH_PACKS.filter(p => FRUIT_PACK_IDS.includes(p.id));
    return DISH_PACKS.filter(p => !FRUIT_PACK_IDS.includes(p.id));
  }, [filter]);

  const getPackImages = (pack: typeof DISH_PACKS[0]) =>
    pack.items.slice(0, 4).map(item => productsData.find(p => p.id === item.productId)?.image ?? '').filter(Boolean);

  const renderPack = ({ item }: { item: typeof DISH_PACKS[0] }) => {
    const images = getPackImages(item);
    return (
      <TouchableOpacity
        style={[styles.packCard, { backgroundColor: item.color }]}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/dish-pack-detail', params: { id: item.id } })}
      >
        <View style={styles.packHeader}>
          <Image source={{ uri: item.image }} style={styles.packImage} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <View style={styles.packNameRow}>
              <Text style={[styles.packName, themed.textPrimary]}>{item.name}</Text>
              {item.tag && <View style={styles.tagBadge}><Text style={styles.tagText}>{item.tag}</Text></View>}
            </View>
            <Text style={styles.packDesc}>{item.description}</Text>
            {item.regionalVariants && item.regionalVariants.length > 0 && (
              <Text style={styles.variantsHint}>{item.regionalVariants.length} regional styles available</Text>
            )}
          </View>
        </View>
        <View style={styles.thumbRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.thumbWrap}>
              <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
            </View>
          ))}
          {item.items.length > 4 && (
            <View style={styles.thumbMore}><Text style={styles.thumbMoreText}>+{item.items.length - 4}</Text></View>
          )}
        </View>
        <View style={styles.packFooter}>
          <View>
            <Text style={[styles.packPrice, themed.textPrimary]}>{'\u20B9'}{item.price}</Text>
            <Text style={styles.packServes}>{item.items.length} items | Choose your cut style</Text>
          </View>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Pack</Text>
            <Icon name="chevron-right" size={16} color={COLORS.green} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Dish Packs</Text>
        <Text style={styles.headerSub}>Pre-cut veggie packs for your favorite dishes</Text>
      </LinearGradient>

      <Animated.View style={[styles.heroBanner, { transform: [{ scaleY: heroBannerHeight }], opacity: heroBannerOpacity, maxHeight: heroBannerHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }]}>
        <LinearGradient colors={COLORS.gradient.green} style={styles.heroGrad}>
          <Text style={styles.heroTitle}>Cook Smarter, Order Faster!</Text>
          <Text style={styles.heroDesc}>Pick a dish, choose pack size, select cut style for each vegetable. We cut & deliver!</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.filterRow}>
        {([
          { key: 'all' as FilterType, label: 'All Packs' },
          { key: 'veg' as FilterType, label: 'Veg Dishes' },
          { key: 'fruit' as FilterType, label: 'Fruit Packs' },
        ]).map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={packs} keyExtractor={i => i.id} renderItem={renderPack} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  headerSub: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  heroBanner: { marginHorizontal: SPACING.base, marginTop: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.lg, overflow: 'hidden' },
  heroGrad: { padding: SPACING.base },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 17 },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.base, marginTop: SPACING.md, marginBottom: SPACING.sm, gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  filterChipActive: { borderColor: COLORS.green, backgroundColor: '#EAF7EB' },
  filterChipText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  filterChipTextActive: { color: COLORS.green },
  list: { paddingHorizontal: SPACING.base, paddingBottom: 40 },
  packCard: { borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  packHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  packImage: { width: 56, height: 56, borderRadius: RADIUS.lg },
  packNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  packName: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  tagBadge: { backgroundColor: COLORS.green, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  packDesc: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 17 },
  variantsHint: { fontSize: 11, fontWeight: '600', color: COLORS.primary, marginTop: 4 },
  thumbRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  thumbWrap: { width: 48, height: 48, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 2, borderColor: '#FFF' },
  thumbImg: { width: '100%', height: '100%' },
  thumbMore: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
  thumbMoreText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  packFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packPrice: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  packServes: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: COLORS.green, borderRadius: RADIUS.full, paddingVertical: 8, paddingHorizontal: 16 },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.green },
});
