import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { COMMUNITY_RECIPES } from '@/data/recipes';
import type { CommunityRecipe } from '@/types';

export default function CommunityRecipesScreen() {
  const router = useRouter();
  const themed = useThemedStyles();

  const [likes, setLikes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    COMMUNITY_RECIPES.forEach((r) => {
      initial[r.id] = r.likes;
    });
    return initial;
  });
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [selectedRecipe, setSelectedRecipe] = useState<CommunityRecipe | null>(null);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLikes((l) => ({ ...l, [id]: (l[id] ?? 0) - 1 }));
      } else {
        next.add(id);
        setLikes((l) => ({ ...l, [id]: (l[id] ?? 0) + 1 }));
      }
      return next;
    });
  };

  const renderRecipeCard = ({ item }: { item: CommunityRecipe }) => {
    const liked = likedIds.has(item.id);
    const likeCount = likes[item.id] ?? item.likes;

    return (
      <TouchableOpacity
        style={[styles.card, themed.card, SHADOW.md]}
        activeOpacity={0.9}
        onPress={() => setSelectedRecipe(item)}
      >
        {/* Image */}
        <View style={styles.cardImageWrapper}>
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={styles.cardImageOverlay}
          />
          {/* Badges on image */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Icon name="clock-outline" size={13} color={COLORS.text.white} />
              <Text style={styles.badgeText}>{item.cookTime}</Text>
            </View>
            <View style={styles.badge}>
              <Icon name="account-group-outline" size={13} color={COLORS.text.white} />
              <Text style={styles.badgeText}>{item.servings} servings</Text>
            </View>
          </View>
          {/* Title overlay */}
          <View style={styles.cardTitleOverlay}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>

        {/* Card body */}
        <View style={styles.cardBody}>
          {/* Author */}
          <View style={styles.authorRow}>
            <View style={[styles.avatarCircle, { backgroundColor: themed.colors.backgroundSoft }]}>
              <Icon name="account-circle" size={22} color={themed.colors.primary} />
            </View>
            <Text style={[styles.authorName, themed.textSecondary]}>{item.authorName}</Text>
          </View>

          {/* Ingredient chips */}
          <View style={styles.chipRow}>
            {item.ingredients.slice(0, 4).map((ing, idx) => (
              <View key={idx} style={[styles.ingredientChip, { backgroundColor: themed.colors.backgroundSoft }]}>
                <Text style={[styles.chipText, { color: themed.colors.text.primary }]} numberOfLines={1}>
                  {ing}
                </Text>
              </View>
            ))}
            {item.ingredients.length > 4 && (
              <View style={[styles.ingredientChip, { backgroundColor: themed.colors.backgroundSoft }]}>
                <Text style={[styles.chipText, { color: themed.colors.text.muted }]}>
                  +{item.ingredients.length - 4}
                </Text>
              </View>
            )}
          </View>

          {/* Actions row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => toggleLike(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? COLORS.status.error : themed.colors.text.muted}
              />
              <Text style={[styles.likeCount, { color: liked ? COLORS.status.error : themed.colors.text.muted }]}>
                {likeCount}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              {item.packId && (
                <TouchableOpacity
                  style={[styles.orderPackChip, { backgroundColor: themed.colors.backgroundSoft, borderColor: themed.colors.primary }]}
                  onPress={() => router.push({ pathname: '/dish-pack-detail', params: { id: item.packId } })}
                >
                  <Icon name="package-variant" size={14} color={themed.colors.primary} />
                  <Text style={[styles.orderPackText, { color: themed.colors.primary }]}>Order Pack</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.viewRecipeBtn}
                onPress={() => setSelectedRecipe(item)}
              >
                <LinearGradient
                  colors={themed.primaryGradient}
                  style={styles.viewRecipeBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.viewRecipeBtnText}>View Recipe</Text>
                  <Icon name="chevron-right" size={16} color={COLORS.text.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="book-open-variant" size={64} color={themed.colors.text.muted} />
      <Text style={[styles.emptyTitle, themed.textPrimary]}>No Recipes Yet</Text>
      <Text style={[styles.emptySubtitle, themed.textMuted]}>
        Community recipes will appear here. Check back soon!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
      <StatusBar barStyle={themed.isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, themed.card, { borderBottomColor: themed.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Community Recipes</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Recipe list */}
      <FlatList
        data={COMMUNITY_RECIPES}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Detail modal */}
      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRecipe(null)}
      >
        {selectedRecipe && (
          <SafeAreaView style={[styles.modalSafe, themed.safeArea]} edges={['top', 'bottom']}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Modal image */}
              <View style={styles.modalImageWrapper}>
                <Image source={{ uri: selectedRecipe.image }} style={styles.modalImage} resizeMode="cover" />
                <LinearGradient
                  colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.5)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedRecipe(null)}
                >
                  <Icon name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalContent, { backgroundColor: themed.colors.background }]}>
                {/* Title & author */}
                <Text style={[styles.modalTitle, themed.textPrimary]}>{selectedRecipe.title}</Text>
                <View style={styles.modalAuthorRow}>
                  <Icon name="account-circle" size={20} color={themed.colors.primary} />
                  <Text style={[styles.modalAuthorName, themed.textSecondary]}>
                    {selectedRecipe.authorName}
                  </Text>
                </View>

                {/* Meta badges */}
                <View style={styles.modalMetaRow}>
                  <View style={[styles.modalMetaBadge, { backgroundColor: themed.colors.backgroundSoft }]}>
                    <Icon name="clock-outline" size={16} color={themed.colors.primary} />
                    <Text style={[styles.modalMetaText, themed.textPrimary]}>{selectedRecipe.cookTime}</Text>
                  </View>
                  <View style={[styles.modalMetaBadge, { backgroundColor: themed.colors.backgroundSoft }]}>
                    <Icon name="account-group-outline" size={16} color={themed.colors.primary} />
                    <Text style={[styles.modalMetaText, themed.textPrimary]}>
                      {selectedRecipe.servings} servings
                    </Text>
                  </View>
                  <View style={[styles.modalMetaBadge, { backgroundColor: themed.colors.backgroundSoft }]}>
                    <Icon name="heart" size={16} color={COLORS.status.error} />
                    <Text style={[styles.modalMetaText, themed.textPrimary]}>
                      {likes[selectedRecipe.id] ?? selectedRecipe.likes}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={[styles.modalDescription, themed.textSecondary]}>
                  {selectedRecipe.description}
                </Text>

                {/* Ingredients */}
                <Text style={[styles.sectionTitle, themed.textPrimary]}>Ingredients</Text>
                <View style={[styles.ingredientsList, themed.card, { borderColor: themed.colors.border }]}>
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientItem}>
                      <Icon name="circle-small" size={24} color={themed.colors.primary} />
                      <Text style={[styles.ingredientText, themed.textPrimary]}>{ing}</Text>
                    </View>
                  ))}
                </View>

                {/* Steps */}
                <Text style={[styles.sectionTitle, themed.textPrimary]}>Instructions</Text>
                {selectedRecipe.steps.map((step, idx) => (
                  <View key={idx} style={[styles.stepItem, themed.card, { borderColor: themed.colors.border }]}>
                    <View style={[styles.stepNumber, { backgroundColor: themed.colors.primary }]}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, themed.textPrimary]}>{step}</Text>
                  </View>
                ))}

                {/* Order Ingredients button */}
                {selectedRecipe.packId && (
                  <TouchableOpacity
                    style={styles.orderIngredientsBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedRecipe(null);
                      router.push({ pathname: '/dish-pack-detail', params: { id: selectedRecipe.packId } });
                    }}
                  >
                    <LinearGradient
                      colors={themed.primaryGradient}
                      style={styles.orderIngredientsBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Icon name="cart-outline" size={20} color={COLORS.text.white} />
                      <Text style={styles.orderIngredientsBtnText}>Order Ingredients</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <View style={{ height: SPACING.xxl }} />
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  /* ── List ── */
  listContent: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },

  /* ── Card ── */
  card: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  cardImageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: COLORS.text.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitleOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text.white,
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* ── Card body ── */
  cardBody: {
    padding: SPACING.base,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  ingredientChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundSoft,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  orderPackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  orderPackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewRecipeBtn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  viewRecipeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: 8,
    gap: 2,
  },
  viewRecipeBtnText: {
    color: COLORS.text.white,
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Empty state ── */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.base,
    color: COLORS.text.primary,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
    color: COLORS.text.muted,
  },

  /* ── Modal ── */
  modalImageWrapper: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: SPACING.base,
    right: SPACING.base,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.lg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    marginTop: -SPACING.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  modalAuthorName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  modalMetaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.base,
  },
  modalMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundSoft,
  },
  modalMetaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  ingredientsList: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  ingredientText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: COLORS.text.white,
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
    paddingTop: 3,
  },
  orderIngredientsBtn: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  orderIngredientsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.base,
  },
  orderIngredientsBtnText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
