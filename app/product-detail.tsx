import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, TextInput, Modal } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { CUT_TYPE_OPTIONS, WEIGHT_OPTIONS, getCutFee } from '@/data/cutTypes';
import { useCart } from '@/context/CartContext';
import productsData from '@/data/products.json';
import type { CutType, Product } from '@/types';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, cartItems } = useCart();

  const product = useMemo(() => productsData.find(p => p.id === id), [id]);
  const isKgProduct = product ? product.unit.includes('kg') : false;
  const isCuttable = product ? ['Vegetables', 'Fruits'].includes(product.category) : false;

  const [selectedWeight, setSelectedWeight] = useState(isKgProduct ? 500 : undefined);
  const [selectedCut, setSelectedCut] = useState<CutType | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [videoModal, setVideoModal] = useState<{ url: string; label: string } | null>(null);

  if (!product) return <SafeAreaView style={styles.safe}><Text style={{ textAlign: 'center', marginTop: 60 }}>Product not found</Text></SafeAreaView>;

  const cartItem = cartItems.find(i => i.id === product.id);
  const basePrice = isKgProduct && selectedWeight ? Math.round((product.price * selectedWeight) / 1000) : product.price;
  const cutFee = getCutFee(selectedCut);
  const totalPrice = (basePrice + cutFee) * quantity;

  const handleAddToCart = () => {
    addToCart(product as Product, quantity, selectedWeight, selectedCut, instructions || undefined);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.imageOverlay} />
          <SafeAreaView edges={['top']} style={styles.imageHeaderSafe}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUnit}>{product.unit}</Text>
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{'\u20B9'}{product.price}</Text>
              <Text style={styles.priceUnit}>/{product.unit}</Text>
            </View>
          </View>
          {product.description && <Text style={styles.description}>{product.description}</Text>}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {product.tags.map((tag, i) => (
                <View key={i} style={styles.tagChip}><Text style={styles.tagChipText}>{tag}</Text></View>
              ))}
            </View>
          )}

          {/* Health Benefits */}
          {product.healthBenefits && product.healthBenefits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Benefits</Text>
              {product.healthBenefits.map((benefit, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Icon name="check-circle" size={16} color={COLORS.green} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Weight Selection */}
          {isKgProduct && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Weight</Text>
              <View style={styles.chipRow}>
                {WEIGHT_OPTIONS.map(w => {
                  const isActive = selectedWeight === w.grams;
                  return (
                    <TouchableOpacity key={w.grams} style={[styles.weightChip, isActive && styles.weightChipActive]} onPress={() => setSelectedWeight(w.grams)}>
                      <Text style={[styles.weightChipText, isActive && styles.weightChipTextActive]}>{w.label}</Text>
                      <Text style={[styles.weightChipPrice, isActive && styles.weightChipPriceActive]}>{'\u20B9'}{Math.round((product.price * w.grams) / 1000)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Cut Style - only for vegetables and fruits */}
          {isCuttable && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How do you want it cut?</Text>
              <View style={styles.cutGrid}>
                {CUT_TYPE_OPTIONS.map(opt => {
                  const isActive = selectedCut === opt.id;
                  return (
                    <TouchableOpacity key={opt.id} style={[styles.cutCard, isActive && styles.cutCardActive]} onPress={() => setSelectedCut(isActive ? undefined : opt.id)}>
                      <Image source={{ uri: opt.media.image }} style={styles.cutImage} resizeMode="cover" />
                      <Text style={[styles.cutLabel, isActive && styles.cutLabelActive]}>{opt.label}</Text>
                      <Text style={[styles.cutFeeText, isActive && styles.cutFeeActive]}>+{'\u20B9'}{opt.fee}</Text>
                      <Text style={styles.cutDesc} numberOfLines={2}>{opt.description}</Text>
                      {opt.media.videoUrl && (
                        <TouchableOpacity
                          style={styles.cutVideoBtn}
                          onPress={() => setVideoModal({ url: opt.media.videoUrl!, label: opt.label })}
                        >
                          <Icon name="play-circle" size={14} color={COLORS.primary} />
                          <Text style={styles.cutVideoBtnText}>Watch</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!selectedCut && (
                <View style={styles.noCutHint}>
                  <Icon name="information-outline" size={14} color={COLORS.text.muted} />
                  <Text style={styles.noCutHintText}>No cut selected = whole/uncut delivery</Text>
                </View>
              )}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <TextInput style={styles.instructionsInput} placeholder='"thin slices", "remove seeds", "keep skin on"' placeholderTextColor={COLORS.text.muted} value={instructions} onChangeText={setInstructions} multiline numberOfLines={2} />
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}><Icon name="minus" size={20} color={COLORS.primary} /></TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}><Icon name="plus" size={20} color={COLORS.primary} /></TouchableOpacity>
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Base price</Text><Text style={styles.priceValue}>{'\u20B9'}{basePrice} x {quantity}</Text></View>
            {cutFee > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Cutting fee</Text><Text style={[styles.priceValue, { color: COLORS.primary }]}>{'\u20B9'}{cutFee} x {quantity}</Text></View>}
            <View style={[styles.priceRow, styles.priceTotalRow]}><Text style={styles.priceTotalLabel}>Total</Text><Text style={styles.priceTotalValue}>{'\u20B9'}{totalPrice}</Text></View>
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      <View style={styles.addBar}>
        <View>
          <Text style={styles.addBarPrice}>{'\u20B9'}{totalPrice}</Text>
          {selectedCut && <Text style={styles.addBarCut}>incl. cutting</Text>}
        </View>
        <TouchableOpacity style={styles.addBarBtn} onPress={handleAddToCart}>
          <Icon name="cart-plus" size={20} color="#FFF" />
          <Text style={styles.addBarBtnText}>{cartItem ? 'Add More' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </View>

      {/* Video Modal */}
      <Modal visible={!!videoModal} animationType="slide" onRequestClose={() => setVideoModal(null)}>
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{videoModal?.label} - Cutting Demo</Text>
            <TouchableOpacity onPress={() => setVideoModal(null)}><Icon name="close" size={24} color={COLORS.text.primary} /></TouchableOpacity>
          </View>
          {videoModal?.url && (
            videoModal.url.match(/\.(gif|png|jpg|jpeg|webp)(\?|$)/i) ? (
              <View style={styles.gifContainer}>
                <Image
                  source={{ uri: videoModal.url }}
                  style={styles.gifPlayer}
                  resizeMode="contain"
                />
              </View>
            ) : videoModal.url.includes('youtube.com') || videoModal.url.includes('youtu.be') ? (
              <WebView
                source={{ uri: videoModal.url }}
                style={styles.webViewPlayer}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              />
            ) : (
              <Video
                source={{ uri: videoModal.url }}
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
  imageContainer: { width: '100%', height: 250, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  imageHeaderSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.base, marginTop: SPACING.sm },
  content: { padding: SPACING.base },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 22, fontWeight: '800', color: COLORS.text.primary },
  productUnit: { fontSize: 13, color: COLORS.text.muted, marginTop: 2 },
  priceTag: { alignItems: 'flex-end' },
  priceText: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  priceUnit: { fontSize: 11, color: COLORS.text.muted },
  description: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 19, marginTop: SPACING.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md },
  tagChip: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tagChipText: { fontSize: 11, fontWeight: '600', color: COLORS.green },
  section: { marginTop: SPACING.xl },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  benefitText: { fontSize: 13, color: COLORS.text.secondary },
  chipRow: { flexDirection: 'row', gap: 8 },
  weightChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  weightChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  weightChipText: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary },
  weightChipTextActive: { color: COLORS.primary },
  weightChipPrice: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  weightChipPriceActive: { color: COLORS.primary },
  cutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cutCard: { width: '31%', alignItems: 'center', paddingBottom: 8, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF', overflow: 'hidden' },
  cutCardActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  cutImage: { width: '100%', height: 50, marginBottom: 4 },
  cutLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary, textAlign: 'center' },
  cutLabelActive: { color: COLORS.primary },
  cutFeeText: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted, marginTop: 2 },
  cutFeeActive: { color: COLORS.primary },
  cutDesc: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center', marginTop: 3, lineHeight: 12, paddingHorizontal: 4 },
  cutVideoBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  cutVideoBtnText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  noCutHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 6 },
  noCutHintText: { fontSize: 11, color: COLORS.text.muted },
  instructionsInput: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, fontSize: 13, color: COLORS.text.primary, minHeight: 60, textAlignVertical: 'top' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary, minWidth: 30, textAlign: 'center' },
  priceBreakdown: { marginTop: SPACING.xl, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceLabel: { fontSize: 13, color: COLORS.text.secondary },
  priceValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 10 },
  priceTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  priceTotalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  addBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.floating },
  addBarPrice: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  addBarCut: { fontSize: 10, color: COLORS.text.muted },
  addBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 14 },
  addBarBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  modalFull: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary },
  videoPlayer: { width: '100%', height: 260 },
  webViewPlayer: { flex: 1 },
  gifContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  gifPlayer: { width: '100%', height: '100%' },
});
