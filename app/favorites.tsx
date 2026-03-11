import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, RefreshControl } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import productsData from '@/data/products.json';

const FAVORITE_IDS = ['1', '11', '23', '4', '8'];
const favorites = productsData.filter(p => FAVORITE_IDS.includes(p.id));

export default function FavoritesScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderItem = ({ item }: { item: typeof productsData[0] }) => (
    <TouchableOpacity
      style={[styles.card, themed.card]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardUnit}>{item.unit}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardPrice}>{'\u20B9'}{item.price}</Text>
          <TouchableOpacity style={styles.heartBtn}>
            <Icon name="heart" size={18} color="#D32F2F" />
          </TouchableOpacity>
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Favorites</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={favorites}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="heart-off-outline" size={48} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptyHint}>Tap the heart icon on products to add them here</Text>
          </View>
        }
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
  list: { padding: SPACING.base, paddingBottom: 40 },
  card: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: RADIUS.lg,
    overflow: 'hidden', marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  cardImage: { width: 90, height: 90 },
  cardBody: { flex: 1, padding: SPACING.md, justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  cardUnit: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary },
  heartBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: 8 },
  emptyHint: { fontSize: 12, color: COLORS.text.muted, marginTop: 4 },
});
