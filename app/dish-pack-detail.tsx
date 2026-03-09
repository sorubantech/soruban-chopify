import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, TextInput, Modal } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { DISH_PACKS, PACK_SIZES, DEFAULT_PACK_SIZE } from '@/data/dishPacks';
import { CUT_TYPE_OPTIONS, WEIGHT_OPTIONS, getCutFee } from '@/data/cutTypes';
import { useCart } from '@/context/CartContext';
import productsData from '@/data/products.json';
import type { CutType, Product, RegionalVariant } from '@/types';

const SPICE_COLORS = { mild: '#4CAF50', medium: '#FF9800', spicy: '#F44336' };

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export default function DishPackDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart } = useCart();

  const pack = useMemo(() => DISH_PACKS.find(p => p.id === id), [id]);
  const [selectedSize, setSelectedSize] = useState(DEFAULT_PACK_SIZE);
  const [itemWeights, setItemWeights] = useState<Record<string, number>>({});
  const [itemQtys, setItemQtys] = useState<Record<string, number>>({});
  const [cutSelections, setCutSelections] = useState<Record<string, CutType>>({});
  const [extraItems, setExtraItems] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [showVideo, setShowVideo] = useState(false);

  const extraProducts = useMemo(() => {
    if (!pack) return [];
    const ids = pack.items.map(i => i.productId);
    return productsData.filter(p => !ids.includes(p.id) && !extraItems.includes(p.id) && (p.category === 'Vegetables' || p.category === 'Fruits'));
  }, [pack, extraItems]);

  const allItems = useMemo(() => {
    if (!pack) return [];
    return [
      ...pack.items.map(i => ({ productId: i.productId, baseQty: i.quantity, isExtra: false })),
      ...extraItems.map(pid => ({ productId: pid, baseQty: 1, isExtra: true })),
    ];
  }, [pack, extraItems]);

  const handleSizeChange = useCallback((size: typeof PACK_SIZES[0]) => {
    setSelectedSize(size);
    const newWeights: Record<string, number> = {};
    allItems.forEach(item => {
      const product = productsData.find(p => p.id === item.productId);
      if (product && product.unit.includes('kg')) newWeights[item.productId] = size.weightGrams;
    });
    setItemWeights(newWeights);
  }, [allItems]);

  const getItemWeight = (pid: string) => itemWeights[pid] || selectedSize.weightGrams;
  const getItemQty = (pid: string, baseQty: number) => itemQtys[pid] ?? baseQty;

  const calcItemPrice = (pid: string, baseQty: number) => {
    const product = productsData.find(p => p.id === pid);
    if (!product) return 0;
    const weight = getItemWeight(pid);
    const qty = getItemQty(pid, baseQty);
    const cut = cutSelections[pid];
    const price = product.unit.includes('kg') ? Math.round((product.price * weight / 1000) * qty) : product.price * qty;
    return price + getCutFee(cut) * qty;
  };

  const totalPrice = useMemo(() => allItems.reduce((sum, item) => sum + calcItemPrice(item.productId, item.baseQty), 0), [allItems, itemWeights, itemQtys, cutSelections, selectedSize]);
  const cuttingTotal = useMemo(() => allItems.reduce((sum, item) => sum + getCutFee(cutSelections[item.productId]) * getItemQty(item.productId, item.baseQty), 0), [allItems, cutSelections, itemQtys]);

  const handleAddPackToCart = () => {
    allItems.forEach(item => {
      const product = productsData.find(p => p.id === item.productId);
      if (!product) return;
      const qty = getItemQty(item.productId, item.baseQty);
      const weight = product.unit.includes('kg') ? getItemWeight(item.productId) : undefined;
      const variantNote = selectedVariant ? `Variant: ${pack?.regionalVariants?.find(v => v.id === selectedVariant)?.name || ''}` : '';
      const fullInstructions = [variantNote, instructions].filter(Boolean).join('. ') || undefined;
      addToCart(product as Product, qty, weight, cutSelections[item.productId], fullInstructions);
    });
    router.back();
  };

  if (!pack) return <SafeAreaView style={styles.safe}><Text style={{ textAlign: 'center', marginTop: 60 }}>Pack not found</Text></SafeAreaView>;

  const activeVariant = pack.regionalVariants?.find(v => v.id === selectedVariant);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={COLORS.gradient.header} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={COLORS.text.primary} /></TouchableOpacity>
            <Text style={styles.headerTitle}>{pack.name}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Pack Info with Image */}
        <View style={[styles.infoCard, { backgroundColor: pack.color }]}>
          <Image source={{ uri: pack.image }} style={styles.infoImage} resizeMode="cover" />
          <Text style={styles.infoName}>{pack.name}</Text>
          <Text style={styles.infoDesc}>{pack.description}</Text>
          {pack.tag && <View style={styles.infoTag}><Text style={styles.infoTagText}>{pack.tag}</Text></View>}
        </View>

        {/* Regional Variants */}
        {pack.regionalVariants && pack.regionalVariants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Style</Text>
            {pack.regionalVariants.map(variant => {
              const isActive = selectedVariant === variant.id;
              const spiceColor = SPICE_COLORS[variant.spiceLevel];
              return (
                <TouchableOpacity key={variant.id} style={[styles.variantCard, isActive && styles.variantCardActive]}
                  onPress={() => setSelectedVariant(isActive ? undefined : variant.id)}>
                  <View style={styles.variantHeader}>
                    <Text style={[styles.variantName, isActive && { color: COLORS.primary }]}>{variant.name}</Text>
                    <View style={[styles.spiceBadge, { backgroundColor: spiceColor + '20' }]}>
                      <Icon name="fire" size={12} color={spiceColor} />
                      <Text style={[styles.spiceText, { color: spiceColor }]}>{variant.spiceLevel}</Text>
                    </View>
                  </View>
                  <Text style={styles.variantDesc}>{variant.description}</Text>
                  {variant.extraIngredients && (
                    <View style={styles.extraIngrRow}>
                      {variant.extraIngredients.map((ing, i) => (
                        <View key={i} style={styles.ingredChip}><Text style={styles.ingredChipText}>{ing}</Text></View>
                      ))}
                    </View>
                  )}
                  {isActive && <Icon name="check-circle" size={20} color={COLORS.primary} style={{ position: 'absolute', top: 12, right: 12 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Cooking Video & Preparation */}
        {(pack.cookingVideoUrl || pack.preparationSteps) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to Cook</Text>
            {pack.cookingVideoUrl && (
              <TouchableOpacity style={styles.videoThumb} onPress={() => setShowVideo(true)}>
                <Image source={{ uri: pack.image }} style={styles.videoThumbImage} resizeMode="cover" />
                <View style={styles.playOverlay}>
                  <Icon name="play-circle" size={48} color="#FFF" />
                  <Text style={styles.playText}>Watch Cooking Video</Text>
                </View>
              </TouchableOpacity>
            )}
            {pack.preparationSteps && (
              <View style={styles.stepsCard}>
                <Text style={styles.stepsTitle}>Preparation Steps</Text>
                {pack.preparationSteps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Size Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pack Size</Text>
          <View style={styles.sizeRow}>
            {PACK_SIZES.map(size => {
              const isActive = selectedSize.id === size.id;
              return (
                <TouchableOpacity key={size.id} style={[styles.sizeChip, isActive && styles.sizeChipActive]} onPress={() => handleSizeChange(size)}>
                  <Text style={[styles.sizeLabel, isActive && styles.sizeLabelActive]}>{size.label}</Text>
                  <Text style={[styles.sizeWeight, isActive && styles.sizeWeightActive]}>{size.weightLabel}</Text>
                  <Text style={[styles.sizeServes, isActive && styles.sizeServesActive]}>{size.serves}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pack Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pack Items ({allItems.length})</Text>
          {allItems.map(item => {
            const product = productsData.find(p => p.id === item.productId);
            if (!product) return null;
            const isKg = product.unit.includes('kg');
            const weight = getItemWeight(item.productId);
            const qty = getItemQty(item.productId, item.baseQty);
            const cut = cutSelections[item.productId];
            const price = calcItemPrice(item.productId, item.baseQty);

            return (
              <View key={item.productId} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemImageWrap}><Image source={{ uri: product.image }} style={styles.itemImage} resizeMode="cover" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{product.name}</Text>
                    <Text style={styles.itemUnit}>{isKg ? (weight >= 1000 ? `${weight/1000} kg` : `${weight}g`) : product.unit}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemPrice}>{'\u20B9'}{price}</Text>
                    {item.isExtra && <TouchableOpacity onPress={() => setExtraItems(prev => prev.filter(x => x !== item.productId))}><Icon name="close-circle" size={18} color={COLORS.status.error} /></TouchableOpacity>}
                  </View>
                </View>
                {isKg && (
                  <View style={styles.itemWeightRow}>
                    {WEIGHT_OPTIONS.map(w => {
                      const isW = weight === w.grams;
                      return (
                        <TouchableOpacity key={w.grams} style={[styles.miniChip, isW && styles.miniChipActive]} onPress={() => setItemWeights(prev => ({ ...prev, [item.productId]: w.grams }))}>
                          <Text style={[styles.miniChipText, isW && styles.miniChipTextActive]}>{w.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cutChipsRow}>
                  {CUT_TYPE_OPTIONS.map(opt => {
                    const isActive = cut === opt.id;
                    return (
                      <TouchableOpacity key={opt.id} style={[styles.cutChip, isActive && styles.cutChipActive]}
                        onPress={() => setCutSelections(prev => { if (prev[item.productId] === opt.id) { const n = { ...prev }; delete n[item.productId]; return n; } return { ...prev, [item.productId]: opt.id }; })}>
                        <Text style={[styles.cutChipText, isActive && styles.cutChipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.itemQtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setItemQtys(prev => ({ ...prev, [item.productId]: Math.max(1, qty - 1) }))}><Icon name="minus" size={14} color={COLORS.primary} /></TouchableOpacity>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setItemQtys(prev => ({ ...prev, [item.productId]: qty + 1 }))}><Icon name="plus" size={14} color={COLORS.primary} /></TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Extras */}
        {extraProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Extra Items</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extrasRow}>
              {extraProducts.slice(0, 10).map(p => (
                <TouchableOpacity key={p.id} style={styles.extraCard} onPress={() => setExtraItems(prev => [...prev, p.id])}>
                  <View style={styles.extraImgWrap}><Image source={{ uri: p.image }} style={styles.extraImg} resizeMode="cover" /></View>
                  <Text style={styles.extraName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.extraPrice}>{'\u20B9'}{p.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput style={styles.instructionsInput} placeholder='"Keep drumstick long", "Extra thin onion slices"' placeholderTextColor={COLORS.text.muted} value={instructions} onChangeText={setInstructions} multiline numberOfLines={2} />
        </View>

        {/* Price */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>Pack Items</Text><Text style={styles.priceValue}>{'\u20B9'}{totalPrice - cuttingTotal}</Text></View>
          {cuttingTotal > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Cutting Charges</Text><Text style={[styles.priceValue, { color: COLORS.primary }]}>{'\u20B9'}{cuttingTotal}</Text></View>}
          <View style={[styles.priceRow, styles.priceTotalRow]}><Text style={styles.priceTotalLabel}>Total</Text><Text style={styles.priceTotalValue}>{'\u20B9'}{totalPrice}</Text></View>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.addBar}>
        <View><Text style={styles.addBarPrice}>{'\u20B9'}{totalPrice}</Text><Text style={styles.addBarSub}>{allItems.length} items | {selectedSize.serves}</Text></View>
        <TouchableOpacity style={styles.addBarBtn} onPress={handleAddPackToCart}>
          <Icon name="cart-plus" size={20} color="#FFF" /><Text style={styles.addBarBtnText}>Add Pack to Cart</Text>
        </TouchableOpacity>
      </View>

      {/* Cooking Video Modal */}
      <Modal visible={showVideo} animationType="slide" onRequestClose={() => setShowVideo(false)}>
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{pack.name} - Cooking Demo</Text>
            <TouchableOpacity onPress={() => setShowVideo(false)}><Icon name="close" size={24} color={COLORS.text.primary} /></TouchableOpacity>
          </View>
          {showVideo && pack.cookingVideoUrl && (
            isYouTubeUrl(pack.cookingVideoUrl) ? (
              <WebView
                source={{ uri: pack.cookingVideoUrl }}
                style={styles.webViewPlayer}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              />
            ) : (
              <Video
                source={{ uri: pack.cookingVideoUrl }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            )
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  scroll: { paddingBottom: 20 },
  infoCard: { marginHorizontal: SPACING.base, marginTop: SPACING.sm, borderRadius: RADIUS.xl, overflow: 'hidden', alignItems: 'center', ...SHADOW.sm },
  infoImage: { width: '100%', height: 160 },
  infoName: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary, marginTop: SPACING.md },
  infoDesc: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center', marginTop: 4, lineHeight: 18, paddingHorizontal: SPACING.base },
  infoTag: { backgroundColor: COLORS.green, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8, marginBottom: SPACING.md },
  infoTagText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.base },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  // Regional Variants
  variantCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border, position: 'relative' },
  variantCardActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  variantHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  variantName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  spiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  spiceText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  variantDesc: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 17 },
  extraIngrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  ingredChip: { backgroundColor: '#F5F5F5', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  ingredChipText: { fontSize: 10, fontWeight: '600', color: COLORS.text.secondary },
  // Cooking Video
  videoThumb: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md, height: 160 },
  videoThumbImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  playText: { fontSize: 13, fontWeight: '700', color: '#FFF', marginTop: 4 },
  stepsCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.md },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  stepText: { flex: 1, fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  // Size
  sizeRow: { flexDirection: 'row', gap: 6 },
  sizeChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  sizeChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  sizeLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  sizeLabelActive: { color: COLORS.primary },
  sizeWeight: { fontSize: 14, fontWeight: '800', color: COLORS.text.primary, marginTop: 2 },
  sizeWeightActive: { color: COLORS.primary },
  sizeServes: { fontSize: 9, color: COLORS.text.muted, marginTop: 2, textAlign: 'center' },
  sizeServesActive: { color: COLORS.primary },
  // Items
  itemCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemImageWrap: { width: 44, height: 44, borderRadius: RADIUS.md, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  itemUnit: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.text.primary },
  itemWeightRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  miniChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F7F7F7' },
  miniChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  miniChipText: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted },
  miniChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  cutChipsRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  cutChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F7F7F7' },
  cutChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  cutChipText: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted },
  cutChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  itemQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, minWidth: 18, textAlign: 'center' },
  // Extras
  extrasRow: { paddingRight: SPACING.base, gap: 8 },
  extraCard: { width: 90, backgroundColor: '#FFF', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  extraImgWrap: { width: 90, height: 60, overflow: 'hidden' },
  extraImg: { width: '100%', height: '100%' },
  extraName: { fontSize: 10, fontWeight: '600', color: COLORS.text.primary, paddingHorizontal: 4, paddingTop: 4 },
  extraPrice: { fontSize: 11, fontWeight: '800', color: COLORS.primary, paddingHorizontal: 4, paddingBottom: 4 },
  instructionsInput: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: 13, color: COLORS.text.primary, minHeight: 60, textAlignVertical: 'top' },
  // Price
  priceCard: { marginHorizontal: SPACING.base, marginTop: SPACING.xl, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceLabel: { fontSize: 13, color: COLORS.text.secondary },
  priceValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 10 },
  priceTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  priceTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  addBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.floating },
  addBarPrice: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  addBarSub: { fontSize: 10, color: COLORS.text.muted },
  addBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.green, borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 14 },
  addBarBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  // Modal
  modalFull: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary },
  videoPlayer: { width: '100%', height: 260 },
  webViewPlayer: { flex: 1 },
});
