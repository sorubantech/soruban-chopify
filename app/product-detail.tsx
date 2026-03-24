import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, TextInput, Modal, Share, Alert, Animated as RNAnimated, FlatList, useWindowDimensions } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { CUT_TYPE_OPTIONS, WEIGHT_OPTIONS, getCutFee } from '@/data/cutTypes';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useReviews } from '@/context/ReviewContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import productsData from '@/data/products.json';
import { NUTRITION_DATA, DEFAULT_NUTRITION } from '@/data/nutrition';
import { DISH_PACKS } from '@/data/dishPacks';
import type { CutType, Product } from '@/types';

export default function ProductDetailScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { addToCart, cartItems } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getProductReviews, getAverageRating, markHelpful } = useReviews();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const productReviews = getProductReviews(id);
  const avgRating = getAverageRating(id);
  const nutrition = NUTRITION_DATA[id] || DEFAULT_NUTRITION;

  const product = useMemo(() => productsData.find(p => p.id === id), [id]);
  const isKgProduct = product ? product.unit.includes('kg') : false;
  const isCuttable = product ? ['Vegetables', 'Fruits'].includes(product.category) : false;

  const [selectedWeight, setSelectedWeight] = useState(isKgProduct ? 500 : undefined);
  const [selectedCut, setSelectedCut] = useState<CutType | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [videoModal, setVideoModal] = useState<{ url: string; label: string } | null>(null);

  // Track recently viewed
  useEffect(() => {
    if (id) addToRecentlyViewed(id);
  }, [id, addToRecentlyViewed]);

  // Simulated stock status
  const stockStatus = useMemo(() => {
    if (!product) return { inStock: false, label: '', color: '' };
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const qty = (hash % 50) + 1;
    if (qty <= 5) return { inStock: true, label: `Only ${qty} left!`, color: '#F44336' };
    if (qty <= 15) return { inStock: true, label: 'Limited Stock', color: '#FF9800' };
    return { inStock: true, label: 'In Stock', color: COLORS.green };
  }, [id, product]);

  /* ─── Image/Video Carousel Data ─── */
  const { width: screenW } = useWindowDimensions();
  const carouselMedia = useMemo(() => {
    const items: { id: string; kind: 'photo' | 'gif' | 'youtube'; uri: string; label: string }[] = [];
    if (product) items.push({ id: 'main', kind: 'photo', uri: product.image, label: product.name });
    if (isCuttable) {
      // 1 cut style image
      const firstCut = CUT_TYPE_OPTIONS[0];
      if (firstCut) items.push({ id: `img_${firstCut.id}`, kind: 'photo', uri: firstCut.media.image, label: `${firstCut.label} Cut` });
      // 1 cutting video
      const videocut = CUT_TYPE_OPTIONS.find(c => c.media.videoUrl);
      if (videocut?.media.videoUrl) {
        const isGif = /\.(gif|png|jpg|jpeg|webp)(\?|$)/i.test(videocut.media.videoUrl);
        items.push({ id: `vid_${videocut.id}`, kind: isGif ? 'gif' : 'youtube', uri: videocut.media.videoUrl, label: `${videocut.label} Demo` });
      }
    }
    return items;
  }, [product, isCuttable]);
  const [slideIdx, setSlideIdx] = useState(0);

  /* ─── Key Features Panel ─── */
  const [panelOpen, setPanelOpen] = useState(false);
  const panelAnim = useRef(new RNAnimated.Value(0)).current;
  const togglePanel = useCallback(() => {
    const next = panelOpen ? 0 : 1;
    setPanelOpen(!panelOpen);
    RNAnimated.spring(panelAnim, { toValue: next, useNativeDriver: true, speed: 14, bounciness: 3 }).start();
  }, [panelOpen, panelAnim]);
  const panelX = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [-240, 0] });
  const panelOpacity = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const arrowRotation = panelAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  if (!product) return <SafeAreaView style={styles.safe}><Text style={{ textAlign: 'center', marginTop: 60 }}>Product not found</Text></SafeAreaView>;

  const cartItem = cartItems.find(i => i.id === product.id);
  const basePrice = isKgProduct && selectedWeight ? Math.round((product.price * selectedWeight) / 1000) : product.price;
  const cutFee = getCutFee(selectedCut);
  const totalPrice = (basePrice + cutFee) * quantity;

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return productsData.filter(p => p.id !== id && p.category === product.category).slice(0, 10);
  }, [id, product]);

  const frequentlyBought = useMemo(() => {
    if (!product) return [];
    return productsData.filter(p => p.id !== id && p.category !== product.category).slice(0, 8);
  }, [id, product]);

  const relatedPacks = useMemo(() => {
    return DISH_PACKS.filter(pack => pack.items.some(i => i.productId === id));
  }, [id]);

  const [showAddedToast, setShowAddedToast] = useState(false);
  const toastOpacity = useRef(new RNAnimated.Value(0)).current;

  const handleAddToCart = () => {
    addToCart(product as Product, quantity, selectedWeight, selectedCut, instructions || undefined);
    if (from === 'subscription') {
      router.back();
      return;
    }
    setShowAddedToast(true);
    RNAnimated.sequence([
      RNAnimated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.delay(1500),
      RNAnimated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowAddedToast(false));
  };

  const handleShare = async () => {
    try { await Share.share({ message: `Check out ${product?.name} on Chopify! Fresh cut vegetables delivered to your door.` }); } catch {}
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.imageContainer}>

          {/* ─── Swipeable Image / Video Carousel ─── */}
          <FlatList
            data={carouselMedia}
            keyExtractor={i => i.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setSlideIdx(Math.round(e.nativeEvent.contentOffset.x / screenW))}
            getItemLayout={(_, i) => ({ length: screenW, offset: screenW * i, index: i })}
            renderItem={({ item }) => {
              // GIF — plays inline as an animated image
              if (item.kind === 'gif') {
                return (
                  <View style={[pdStyles.slide, { width: screenW }]}>
                    <Image source={{ uri: item.uri }} style={pdStyles.slideImage} resizeMode="contain" />
                    <View style={pdStyles.slideBadge}>
                      <Icon name="play-circle" size={13} color="#FFF" />
                      <Text style={pdStyles.slideBadgeText}>{item.label}</Text>
                    </View>
                  </View>
                );
              }
              // YouTube — thumbnail with play icon, taps open video modal
              if (item.kind === 'youtube') {
                return (
                  <TouchableOpacity
                    style={[pdStyles.slide, { width: screenW }]}
                    activeOpacity={0.85}
                    onPress={() => setVideoModal({ url: item.uri, label: item.label })}
                  >
                    <View style={pdStyles.ytSlide}>
                      <Icon name="youtube" size={52} color="#FF0000" />
                      <Text style={pdStyles.ytText}>Tap to play</Text>
                      <Text style={pdStyles.ytSubText}>{item.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              // Photo (product image or cut style image)
              return (
                <View style={[pdStyles.slide, { width: screenW }]}>
                  <Image source={{ uri: item.uri }} style={pdStyles.slideImage} resizeMode="cover" />
                  {item.id !== 'main' && (
                    <View style={pdStyles.slideBadge}>
                      <Icon name="content-cut" size={11} color="#FFF" />
                      <Text style={pdStyles.slideBadgeText}>{item.label}</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />

          {/* Dot indicators */}
          {carouselMedia.length > 1 && (
            <View style={pdStyles.dots}>
              {carouselMedia.map((_, i) => (
                <View key={i} style={[pdStyles.dot, slideIdx === i && pdStyles.dotActive]} />
              ))}
            </View>
          )}

          {/* ─── Key Features Slide-in Panel ─── */}
          <RNAnimated.View style={[pdStyles.panel, { transform: [{ translateX: panelX }], opacity: panelOpacity }]} pointerEvents={panelOpen ? 'auto' : 'none'}>
            <LinearGradient colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.78)']} style={pdStyles.panelInner}>
              <Text style={pdStyles.panelTitle}>Key Features</Text>

              {product.category && (
                <View style={pdStyles.panelRow}>
                  <Text style={pdStyles.panelLabel}>Category</Text>
                  <Text style={pdStyles.panelValue}>{product.category}</Text>
                </View>
              )}
              <View style={pdStyles.panelRow}>
                <Text style={pdStyles.panelLabel}>Price</Text>
                <Text style={pdStyles.panelValue}>{'\u20B9'}{product.price}/{product.unit}</Text>
              </View>
              {isCuttable && (
                <View style={pdStyles.panelRow}>
                  <Text style={pdStyles.panelLabel}>Cut Styles</Text>
                  <Text style={pdStyles.panelValue}>{CUT_TYPE_OPTIONS.length} available</Text>
                </View>
              )}
              {nutrition.calories > 0 && (
                <View style={pdStyles.panelRow}>
                  <Text style={pdStyles.panelLabel}>Calories</Text>
                  <Text style={pdStyles.panelValue}>{nutrition.calories} kcal / 100g</Text>
                </View>
              )}
              {nutrition.protein > 0 && (
                <View style={pdStyles.panelRow}>
                  <Text style={pdStyles.panelLabel}>Protein</Text>
                  <Text style={pdStyles.panelValue}>{nutrition.protein}g / 100g</Text>
                </View>
              )}
              {product.healthBenefits && product.healthBenefits.length > 0 && (
                <View style={pdStyles.panelBenefits}>
                  <Text style={pdStyles.panelLabel}>Benefits</Text>
                  {product.healthBenefits.slice(0, 4).map((b, i) => (
                    <View key={i} style={pdStyles.panelBenefitRow}>
                      <Icon name="check-circle-outline" size={12} color="#66BB6A" />
                      <Text style={pdStyles.panelBenefitText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )}
              {product.tags && product.tags.length > 0 && (
                <View style={pdStyles.panelRow}>
                  <Text style={pdStyles.panelLabel}>Preferences</Text>
                  <Text style={pdStyles.panelValue}>{product.tags.join(', ')}</Text>
                </View>
              )}
            </LinearGradient>
          </RNAnimated.View>

          {/* Toggle arrow on left edge */}
          <TouchableOpacity style={pdStyles.toggleBtn} onPress={togglePanel} activeOpacity={0.75}>
            <RNAnimated.View style={{ transform: [{ rotate: arrowRotation }] }}>
              <Icon name="chevron-right" size={20} color="#FFF" />
            </RNAnimated.View>
          </TouchableOpacity>

          {/* Header gradient for readability */}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.imageOverlay} pointerEvents="none" />

          {/* Back / Fav / Share buttons (unchanged) */}
          <SafeAreaView edges={['top']} style={styles.imageHeaderSafe}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Icon name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => toggleFavorite(id)} style={styles.headerActionBtn}>
                  <Icon name={isFavorite(id) ? 'heart' : 'heart-outline'} size={22} color={isFavorite(id) ? COLORS.primary : COLORS.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.headerActionBtn}>
                  <Icon name="share-variant" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, themed.textPrimary]}>{product.name}</Text>
              <Text style={styles.productUnit}>{product.unit}</Text>
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{'\u20B9'}{product.price}</Text>
              <Text style={styles.priceUnit}>/{product.unit}</Text>
            </View>
          </View>
          {/* Stock Status */}
          <View style={[styles.stockBadge, { backgroundColor: `${stockStatus.color}15` }]}>
            <Icon name={stockStatus.color === COLORS.green ? 'check-circle' : 'alert-circle'} size={14} color={stockStatus.color} />
            <Text style={[styles.stockText, { color: stockStatus.color }]}>{stockStatus.label}</Text>
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
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Health Benefits</Text>
              {product.healthBenefits.map((benefit, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Icon name="check-circle" size={16} color={COLORS.green} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Nutrition Info */}
          <View style={[styles.nutritionCard, themed.card]}>
            <View style={styles.nutritionHeader}>
              <Icon name="leaf" size={14} color={COLORS.primary} />
              <Text style={[styles.nutritionTitle, themed.textPrimary]}>Nutrition</Text>
              <Text style={styles.nutritionSub}>per 100g</Text>
            </View>
            <View style={styles.nutritionGrid}>
              {[
                { label: 'Calories', value: `${nutrition.calories}`, unit: 'kcal', color: '#FF5722' },
                { label: 'Protein', value: `${nutrition.protein}`, unit: 'g', color: '#2196F3' },
                { label: 'Carbs', value: `${nutrition.carbs}`, unit: 'g', color: '#FF9800' },
                { label: 'Fiber', value: `${nutrition.fiber}`, unit: 'g', color: '#4CAF50' },
                { label: 'Fat', value: `${nutrition.fat}`, unit: 'g', color: '#9C27B0' },
              ].map(n => (
                <View key={n.label} style={styles.nutritionItem}>
                  <Text style={[styles.nutritionItemValue, { color: n.color }]}>{n.value}<Text style={styles.nutritionItemUnit}>{n.unit}</Text></Text>
                  <Text style={styles.nutritionItemLabel}>{n.label}</Text>
                </View>
              ))}
            </View>
            {((nutrition.vitamins && nutrition.vitamins.length > 0) || (nutrition.minerals && nutrition.minerals.length > 0)) && (
              <View style={styles.nutrientTagRow}>
                {nutrition.vitamins?.map((v, i) => (
                  <View key={`v${i}`} style={styles.vitaminChip}><Text style={styles.vitaminChipText}>{v}</Text></View>
                ))}
                {nutrition.minerals?.map((m, i) => (
                  <View key={`m${i}`} style={styles.mineralChip}><Text style={styles.mineralChipText}>{m}</Text></View>
                ))}
              </View>
            )}
          </View>

          {/* Weight Selection */}
          {isKgProduct && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Select Weight</Text>
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
              <Text style={[styles.sectionTitle, themed.textPrimary]}>How do you want it cut?</Text>

              {/* Before → After Preview */}
              {selectedCut && (() => {
                const activeCut = CUT_TYPE_OPTIONS.find(c => c.id === selectedCut);
                return activeCut ? (
                  <View style={styles.cutPreviewCard}>
                    <View style={styles.cutPreviewRow}>
                      <View style={styles.cutPreviewSide}>
                        <Image source={{ uri: product!.image }} style={styles.cutPreviewImg} resizeMode="cover" />
                        <View style={styles.cutPreviewLabelBg}>
                          <Text style={styles.cutPreviewLabel}>Before</Text>
                        </View>
                        <Text style={styles.cutPreviewCaption}>Whole {product!.name}</Text>
                      </View>
                      <View style={styles.cutPreviewArrow}>
                        <View style={styles.cutPreviewArrowCircle}>
                          <Icon name="arrow-right" size={18} color="#FFF" />
                        </View>
                        <Text style={styles.cutPreviewArrowText}>{activeCut.label}</Text>
                      </View>
                      <View style={styles.cutPreviewSide}>
                        <Image source={{ uri: activeCut.media.image }} style={styles.cutPreviewImg} resizeMode="cover" />
                        <View style={[styles.cutPreviewLabelBg, { backgroundColor: COLORS.primary }]}>
                          <Text style={styles.cutPreviewLabel}>After</Text>
                        </View>
                        <Text style={styles.cutPreviewCaption}>{activeCut.description}</Text>
                      </View>
                    </View>
                    <View style={styles.cutPreviewInfo}>
                      <View style={styles.cutPreviewChip}>
                        <Icon name="clock-outline" size={12} color="#1565C0" />
                        <Text style={styles.cutPreviewChipText}>Freshly cut before delivery</Text>
                      </View>
                      <View style={styles.cutPreviewChip}>
                        <Icon name="shield-check" size={12} color="#388E3C" />
                        <Text style={styles.cutPreviewChipText}>Hygienic cutting</Text>
                      </View>
                    </View>
                    {activeCut.media.videoUrl && (
                      <TouchableOpacity
                        style={styles.cutPreviewVideoBtn}
                        onPress={() => setVideoModal({ url: activeCut.media.videoUrl!, label: activeCut.label })}
                      >
                        <Icon name="play-circle" size={16} color={COLORS.primary} />
                        <Text style={styles.cutPreviewVideoBtnText}>Watch cutting demo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null;
              })()}

              {/* Cut Options Grid */}
              <View style={styles.cutGrid}>
                {CUT_TYPE_OPTIONS.map(opt => {
                  const isActive = selectedCut === opt.id;
                  return (
                    <TouchableOpacity key={opt.id} style={[styles.cutCard, isActive && styles.cutCardActive]} onPress={() => setSelectedCut(isActive ? undefined : opt.id)}>
                      <Image source={{ uri: opt.media.image }} style={styles.cutImage} resizeMode="cover" />
                      {isActive && (
                        <View style={styles.cutCardCheck}>
                          <Icon name="check-circle" size={16} color="#FFF" />
                        </View>
                      )}
                      <Text style={[styles.cutLabel, isActive && styles.cutLabelActive]}>{opt.label}</Text>
                      <Text style={[styles.cutFeeText, isActive && styles.cutFeeActive]}>+{'\u20B9'}{opt.fee}</Text>
                      <Text style={styles.cutDesc} numberOfLines={2}>{opt.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!selectedCut && (
                <View style={styles.noCutHint}>
                  <Icon name="information-outline" size={14} color={COLORS.text.muted} />
                  <Text style={styles.noCutHintText}>Tap a cut style to see before & after preview</Text>
                </View>
              )}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Special Instructions</Text>
            <View style={styles.quickChipsRow}>
              {['Extra thin', 'Remove seeds', 'Keep skin on', 'No stems', 'Wash thoroughly', 'Peel off'].map(chip => (
                <TouchableOpacity
                  key={chip}
                  style={[styles.quickChip, instructions.includes(chip) && styles.quickChipActive]}
                  onPress={() => {
                    if (instructions.includes(chip)) {
                      setInstructions(prev => prev.replace(chip, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim());
                    } else {
                      setInstructions(prev => prev ? `${prev}, ${chip}` : chip);
                    }
                  }}
                >
                  <Text style={[styles.quickChipText, instructions.includes(chip) && styles.quickChipTextActive]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.instructionsInput, themed.inputBg]} placeholder='"thin slices", "remove seeds", "keep skin on"' placeholderTextColor={COLORS.text.muted} value={instructions} onChangeText={setInstructions} multiline numberOfLines={2} />
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}><Icon name="minus" size={20} color={COLORS.primary} /></TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}><Icon name="plus" size={20} color={COLORS.primary} /></TouchableOpacity>
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={[styles.priceBreakdown, themed.card]}>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Base price</Text><Text style={styles.priceValue}>{'\u20B9'}{basePrice} x {quantity}</Text></View>
            {cutFee > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Cutting fee</Text><Text style={[styles.priceValue, { color: COLORS.primary }]}>{'\u20B9'}{cutFee} x {quantity}</Text></View>}
            <View style={[styles.priceRow, styles.priceTotalRow]}><Text style={styles.priceTotalLabel}>Total</Text><Text style={styles.priceTotalValue}>{'\u20B9'}{totalPrice}</Text></View>
          </View>

          {/* Reviews */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={[styles.reviewsSectionTitle, themed.textPrimary]}>Reviews ({productReviews.length})</Text>
              {avgRating > 0 && (
                <View style={styles.avgRatingBadge}>
                  <Icon name="star" size={14} color="#FFF" />
                  <Text style={styles.avgRatingText}>{avgRating}</Text>
                </View>
              )}
            </View>
            {productReviews.slice(0, 3).map(review => (
              <View key={review.id} style={[styles.reviewCard, themed.card]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}><Icon name="account" size={16} color="#FFF" /></View>
                  <Text style={styles.reviewerName}>{review.userName}</Text>
                  <View style={styles.reviewStars}>
                    {[1,2,3,4,5].map(s => <Icon key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={12} color="#FFD700" />)}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewDate}>{new Date(review.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  <TouchableOpacity style={styles.helpfulBtn} onPress={() => markHelpful(review.id)}>
                    <Icon name="thumb-up-outline" size={12} color={COLORS.text.muted} />
                    <Text style={styles.helpfulText}>{review.helpful}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Dish Packs containing this product */}
          {relatedPacks.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Available in Packs</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.hScrollContent}>
                {relatedPacks.map(pack => (
                  <TouchableOpacity key={pack.id} style={[styles.packCard, themed.card]} onPress={() => router.push({ pathname: '/dish-pack-detail', params: { id: pack.id } })}>
                    <Image source={{ uri: pack.image }} style={styles.packImage} resizeMode="cover" />
                    <View style={styles.packInfo}>
                      <Text style={styles.packName} numberOfLines={1}>{pack.name}</Text>
                      <Text style={styles.packItems}>{pack.items.length} items</Text>
                      <Text style={styles.packPrice}>{'\u20B9'}{pack.price}</Text>
                    </View>
                    {pack.tag && <View style={styles.packTag}><Text style={styles.packTagText}>{pack.tag}</Text></View>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* All Dish Packs */}
          {DISH_PACKS.length > relatedPacks.length && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Browse Dish Packs</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.hScrollContent}>
                {DISH_PACKS.filter(p => !relatedPacks.some(r => r.id === p.id)).map(pack => (
                  <TouchableOpacity key={pack.id} style={[styles.packCard, themed.card]} onPress={() => router.push({ pathname: '/dish-pack-detail', params: { id: pack.id } })}>
                    <Image source={{ uri: pack.image }} style={styles.packImage} resizeMode="cover" />
                    <View style={styles.packInfo}>
                      <Text style={styles.packName} numberOfLines={1}>{pack.name}</Text>
                      <Text style={styles.packItems}>{pack.items.length} items</Text>
                      <Text style={styles.packPrice}>{'\u20B9'}{pack.price}</Text>
                    </View>
                    {pack.tag && <View style={styles.packTag}><Text style={styles.packTagText}>{pack.tag}</Text></View>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Similar Items */}
          {similarProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Similar Items</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.hScrollContent}>
                {similarProducts.map(p => (
                  <TouchableOpacity key={`sim_${p.id}`} style={[styles.similarCard, themed.card]} onPress={() => router.push({ pathname: '/product-detail', params: { id: p.id } })}>
                    <Image source={{ uri: p.image }} style={styles.similarImage} resizeMode="cover" />
                    <Text style={styles.similarName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.similarPrice}>{'\u20B9'}{p.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Frequently Bought Together */}
          {frequentlyBought.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Frequently Bought Together</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.hScrollContent}>
                {frequentlyBought.map(p => (
                  <TouchableOpacity key={`fbt_${p.id}`} style={[styles.similarCard, themed.card]} onPress={() => router.push({ pathname: '/product-detail', params: { id: p.id } })}>
                    <Image source={{ uri: p.image }} style={styles.similarImage} resizeMode="cover" />
                    <Text style={styles.similarName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.similarPrice}>{'\u20B9'}{p.price}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      <View style={[styles.addBar, themed.card]}>
        <View>
          <Text style={[styles.addBarPrice, themed.textPrimary]}>{'\u20B9'}{totalPrice}</Text>
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
      {showAddedToast && (
        <RNAnimated.View style={[styles.addedToast, { opacity: toastOpacity }]}>
          <Icon name="check-circle" size={20} color="#FFF" />
          <Text style={styles.addedToastText}>Added to cart!</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/cart')} style={styles.addedToastBtn}>
            <Text style={styles.addedToastBtnText}>View Cart</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  imageContainer: { width: '100%', height: 300, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 80, zIndex: 8 },
  imageHeaderSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.base, marginTop: SPACING.sm },
  content: { padding: SPACING.base },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 22, fontWeight: '800', color: COLORS.text.primary },
  productUnit: { fontSize: 13, color: COLORS.text.muted, marginTop: 2 },
  priceTag: { alignItems: 'flex-end' },
  priceText: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  priceUnit: { fontSize: 11, color: COLORS.text.muted },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  stockText: { fontSize: 12, fontWeight: '700' },
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
  /* Cut Preview (Before → After) */
  cutPreviewCard: {
    backgroundColor: '#FAFAFA', borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: '#E8F5E9',
  },
  cutPreviewRow: { flexDirection: 'row', alignItems: 'center' },
  cutPreviewSide: { flex: 1, alignItems: 'center' },
  cutPreviewImg: { width: 90, height: 90, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: '#FFF' },
  cutPreviewLabelBg: {
    position: 'absolute', top: 4, left: '50%', marginLeft: -28,
    backgroundColor: '#FF9800', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2,
  },
  cutPreviewLabel: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  cutPreviewCaption: { fontSize: 10, color: COLORS.text.secondary, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  cutPreviewArrow: { alignItems: 'center', paddingHorizontal: 6 },
  cutPreviewArrowCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  cutPreviewArrowText: { fontSize: 9, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  cutPreviewInfo: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: SPACING.md },
  cutPreviewChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  cutPreviewChipText: { fontSize: 9, fontWeight: '600', color: COLORS.text.secondary },
  cutPreviewVideoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: SPACING.sm, paddingVertical: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#FFF',
  },
  cutPreviewVideoBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  /* Cut Grid */
  cutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cutCard: { width: '31%', alignItems: 'center', paddingBottom: 8, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF', overflow: 'hidden', position: 'relative' },
  cutCardActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  cutCardCheck: { position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.primary, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  cutImage: { width: '100%', height: 50, marginBottom: 4 },
  cutLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary, textAlign: 'center' },
  cutLabelActive: { color: COLORS.primary },
  cutFeeText: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted, marginTop: 2 },
  cutFeeActive: { color: COLORS.primary },
  cutDesc: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center', marginTop: 3, lineHeight: 12, paddingHorizontal: 4 },
  noCutHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 6 },
  noCutHintText: { fontSize: 11, color: COLORS.text.muted },
  quickChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  quickChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  quickChipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  quickChipText: { fontSize: 11, fontWeight: '600', color: COLORS.text.secondary },
  quickChipTextActive: { color: COLORS.primary, fontWeight: '700' },
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
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  nutritionCard: { marginTop: SPACING.lg, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.sm },
  nutritionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  nutritionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text.primary },
  nutritionSub: { fontSize: 10, color: COLORS.text.muted, marginLeft: 'auto' },
  nutritionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  nutritionItem: { alignItems: 'center', flex: 1 },
  nutritionItemValue: { fontSize: 15, fontWeight: '800' },
  nutritionItemUnit: { fontSize: 9, fontWeight: '600' },
  nutritionItemLabel: { fontSize: 9, color: COLORS.text.muted, marginTop: 2 },
  nutrientTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  vitaminChip: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  vitaminChipText: { fontSize: 9, fontWeight: '700', color: COLORS.green },
  mineralChip: { backgroundColor: '#E3F2FD', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  mineralChipText: { fontSize: 9, fontWeight: '700', color: '#1565C0' },
  reviewsSection: { marginTop: SPACING.xl },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  reviewsSectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary },
  avgRatingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.green, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  avgRatingText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  reviewCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.text.muted, justifyContent: 'center', alignItems: 'center' },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, flex: 1 },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 17 },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  reviewDate: { fontSize: 10, color: COLORS.text.muted },
  helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpfulText: { fontSize: 11, color: COLORS.text.muted },
  hScrollContent: { gap: 10, paddingBottom: 4 },
  packCard: { width: 140, backgroundColor: '#FFF', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm, position: 'relative' as const },
  packImage: { width: 140, height: 85 },
  packInfo: { padding: 8 },
  packName: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  packItems: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  packPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  packTag: { position: 'absolute' as const, top: 6, left: 6, backgroundColor: COLORS.green, borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  packTagText: { fontSize: 8, fontWeight: '700', color: '#FFF' },
  similarCard: { width: 110, backgroundColor: '#FFF', borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.sm },
  similarImage: { width: 110, height: 75 },
  similarName: { fontSize: 11, fontWeight: '600', color: COLORS.text.primary, paddingHorizontal: 6, paddingTop: 4 },
  similarPrice: { fontSize: 12, fontWeight: '800', color: COLORS.primary, paddingHorizontal: 6, paddingBottom: 6 },
  addedToast: { position: 'absolute', bottom: 90, left: SPACING.base, right: SPACING.base, backgroundColor: '#388E3C', borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addedToastText: { fontSize: 14, fontWeight: '700', color: '#FFF', flex: 1 },
  addedToastBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6 },
  addedToastBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

/* ─── Carousel + Features Panel Styles ─── */
const pdStyles = StyleSheet.create({
  /* Carousel slides */
  slide: { height: 300, position: 'relative', backgroundColor: '#111' },
  slideImage: { width: '100%', height: '100%' },
  slideBadge: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  slideBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  /* YouTube placeholder */
  ytSlide: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  ytText: { fontSize: 14, fontWeight: '700', color: '#FFF', marginTop: 10 },
  ytSubText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  /* Dot indicators */
  dots: { position: 'absolute', bottom: 14, right: 14, flexDirection: 'row', gap: 5, zIndex: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 22, backgroundColor: '#FFF' },
  /* Key Features panel */
  panel: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 230, zIndex: 6 },
  panelInner: { flex: 1, paddingTop: 82, paddingHorizontal: 18, paddingBottom: 18 },
  panelTitle: { fontSize: 17, fontWeight: '900', color: '#FFF', marginBottom: 18, letterSpacing: 0.3 },
  panelRow: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', paddingBottom: 10 },
  panelLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  panelValue: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  panelBenefits: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', paddingBottom: 10 },
  panelBenefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  panelBenefitText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17, flex: 1 },
  /* Toggle arrow */
  toggleBtn: {
    position: 'absolute', bottom: '40%' as any, left: 0, zIndex: 7,
    width: 30, height: 46, borderTopRightRadius: 12, borderBottomRightRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
});
