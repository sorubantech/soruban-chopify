import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Alert, Image, Modal, FlatList,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';
import type { WeekDay, DayPlan, DayPlanItem, WeeklyPlan, CutType } from '@/types';
import products from '@/data/products.json';
import { DISH_PACKS } from '@/data/dishPacks';

const WEEKDAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WEEKDAY_LABELS: Record<WeekDay, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const CUT_OPTIONS: { value: CutType; label: string; icon: string }[] = [
  { value: 'small_pieces', label: 'Small Pieces', icon: 'knife' },
  { value: 'slices', label: 'Slices', icon: 'content-cut' },
  { value: 'cubes', label: 'Cubes', icon: 'cube-outline' },
  { value: 'long_cuts', label: 'Long Cuts', icon: 'minus' },
  { value: 'grated', label: 'Grated', icon: 'grain' },
];

function createEmptyPlan(): WeeklyPlan {
  const plan = {} as WeeklyPlan;
  for (const day of WEEKDAYS) {
    plan[day] = { day, items: [], isActive: true };
  }
  return plan;
}

export default function SubscriptionPlanEditorScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, updateWeeklyPlan } = useOrders();

  const order = useMemo(() => orders.find(o => o.id === id), [orders, id]);
  const sub = order?.subscription;

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() =>
    sub?.weeklyPlan ?? createEmptyPlan()
  );
  const [selectedDay, setSelectedDay] = useState<WeekDay>('Mon');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showCutPicker, setShowCutPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentDayPlan = weeklyPlan[selectedDay];

  const dayTotal = useMemo(() => {
    let total = 0;
    if (currentDayPlan.packId) {
      const pack = DISH_PACKS.find(p => p.id === currentDayPlan.packId);
      if (pack) total += pack.price;
    }
    for (const item of currentDayPlan.items) {
      const product = (products as any[]).find(p => p.id === item.productId);
      if (product) total += product.price * item.quantity;
    }
    return total;
  }, [currentDayPlan]);

  const weekTotal = useMemo(() => {
    let total = 0;
    for (const day of WEEKDAYS) {
      const plan = weeklyPlan[day];
      if (!plan.isActive) continue;
      if (plan.packId) {
        const pack = DISH_PACKS.find(p => p.id === plan.packId);
        if (pack) total += pack.price;
      }
      for (const item of plan.items) {
        const product = (products as any[]).find(p => p.id === item.productId);
        if (product) total += product.price * item.quantity;
      }
    }
    return total;
  }, [weeklyPlan]);

  const activeDays = useMemo(() =>
    WEEKDAYS.filter(d => weeklyPlan[d].isActive).length
  , [weeklyPlan]);

  const updateDayPlan = useCallback((day: WeekDay, updates: Partial<DayPlan>) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
    setHasChanges(true);
  }, []);

  const toggleDayActive = useCallback((day: WeekDay) => {
    updateDayPlan(day, { isActive: !weeklyPlan[day].isActive });
  }, [weeklyPlan, updateDayPlan]);

  const addProduct = useCallback((product: any) => {
    const item: DayPlanItem = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      unit: product.unit,
    };
    updateDayPlan(selectedDay, {
      items: [...currentDayPlan.items, item],
    });
    setShowProductPicker(false);
  }, [selectedDay, currentDayPlan, updateDayPlan]);

  const removeItem = useCallback((index: number) => {
    const updated = [...currentDayPlan.items];
    updated.splice(index, 1);
    updateDayPlan(selectedDay, { items: updated });
  }, [selectedDay, currentDayPlan, updateDayPlan]);

  const updateItemQuantity = useCallback((index: number, delta: number) => {
    const updated = [...currentDayPlan.items];
    const newQty = updated[index].quantity + delta;
    if (newQty < 1) return;
    updated[index] = { ...updated[index], quantity: newQty };
    updateDayPlan(selectedDay, { items: updated });
  }, [selectedDay, currentDayPlan, updateDayPlan]);

  const updateItemCut = useCallback((cutType: CutType) => {
    if (editingItemIndex === null) return;
    const updated = [...currentDayPlan.items];
    updated[editingItemIndex] = { ...updated[editingItemIndex], cutType };
    updateDayPlan(selectedDay, { items: updated });
    setShowCutPicker(false);
    setEditingItemIndex(null);
  }, [selectedDay, currentDayPlan, editingItemIndex, updateDayPlan]);

  const selectPack = useCallback((pack: typeof DISH_PACKS[0]) => {
    updateDayPlan(selectedDay, {
      packId: pack.id,
      packName: pack.name,
      items: pack.items.map(pi => {
        const product = (products as any[]).find(p => p.id === pi.productId);
        return {
          productId: pi.productId,
          name: product?.name || 'Unknown',
          quantity: pi.quantity,
          unit: product?.unit || '1 kg',
        };
      }),
    });
    setShowPackPicker(false);
  }, [selectedDay, updateDayPlan]);

  const removePack = useCallback(() => {
    updateDayPlan(selectedDay, { packId: undefined, packName: undefined, items: [] });
  }, [selectedDay, updateDayPlan]);

  const copyToAllDays = useCallback(() => {
    Alert.alert(
      'Copy to All Days',
      `Copy ${WEEKDAY_LABELS[selectedDay]}'s plan to all other active days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            setWeeklyPlan(prev => {
              const updated = { ...prev };
              for (const day of WEEKDAYS) {
                if (day !== selectedDay && updated[day].isActive) {
                  updated[day] = { ...prev[selectedDay], day, isActive: true };
                }
              }
              return updated;
            });
            setHasChanges(true);
          },
        },
      ],
    );
  }, [selectedDay]);

  const handleSave = useCallback(async () => {
    if (!order) return;
    // Validate: at least one active day with items
    const activePlans = WEEKDAYS.filter(d => weeklyPlan[d].isActive && weeklyPlan[d].items.length > 0);
    if (activePlans.length === 0) {
      Alert.alert('No Items', 'Please add items to at least one delivery day.');
      return;
    }
    await updateWeeklyPlan(order.id, weeklyPlan);
    setHasChanges(false);
    Alert.alert('Plan Saved', 'Your weekly delivery plan has been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [order, weeklyPlan, updateWeeklyPlan, router]);

  if (!order || !sub) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: 'center', marginTop: 60 }}>Subscription not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => {
              if (hasChanges) {
                Alert.alert('Unsaved Changes', 'You have unsaved changes. Discard?', [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                ]);
              } else {
                router.back();
              }
            }} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Weekly Plan</Text>
            <TouchableOpacity onPress={handleSave} disabled={!hasChanges}>
              <Text style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Week Summary Banner */}
        <LinearGradient colors={COLORS.gradient.primary} style={styles.summaryBanner}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{activeDays}</Text>
              <Text style={styles.summaryLabel}>Active Days</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{'\u20B9'}{weekTotal}</Text>
              <Text style={styles.summaryLabel}>Weekly Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{'\u20B9'}{activeDays > 0 ? Math.round(weekTotal / activeDays) : 0}</Text>
              <Text style={styles.summaryLabel}>Per Day Avg</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Day Selector Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsContainer}
          style={styles.dayTabsScroll}
        >
          {WEEKDAYS.map(day => {
            const plan = weeklyPlan[day];
            const isSelected = day === selectedDay;
            const itemCount = plan.items.length;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayTab,
                  isSelected && styles.dayTabActive,
                  !plan.isActive && styles.dayTabInactive,
                ]}
                onPress={() => setSelectedDay(day)}
                onLongPress={() => toggleDayActive(day)}
              >
                <Text style={[
                  styles.dayTabText,
                  isSelected && styles.dayTabTextActive,
                  !plan.isActive && styles.dayTabTextInactive,
                ]}>
                  {day}
                </Text>
                {plan.isActive && itemCount > 0 && (
                  <View style={[styles.dayTabBadge, isSelected && styles.dayTabBadgeActive]}>
                    <Text style={[styles.dayTabBadgeText, isSelected && styles.dayTabBadgeTextActive]}>
                      {itemCount}
                    </Text>
                  </View>
                )}
                {!plan.isActive && (
                  <Icon name="close-circle" size={12} color="#BDBDBD" style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day Toggle & Info */}
        <View style={[styles.dayHeaderCard, themed.card]}>
          <View style={styles.dayHeaderRow}>
            <View>
              <Text style={[styles.dayHeaderTitle, themed.textPrimary]}>
                {WEEKDAY_LABELS[selectedDay]}
              </Text>
              <Text style={styles.dayHeaderSub}>
                {currentDayPlan.isActive
                  ? currentDayPlan.items.length > 0
                    ? `${currentDayPlan.items.length} items \u00B7 \u20B9${dayTotal}`
                    : 'No items added yet'
                  : 'No delivery on this day'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, currentDayPlan.isActive && styles.toggleBtnActive]}
              onPress={() => toggleDayActive(selectedDay)}
            >
              <Icon
                name={currentDayPlan.isActive ? 'check-circle' : 'close-circle-outline'}
                size={18}
                color={currentDayPlan.isActive ? '#FFF' : '#999'}
              />
              <Text style={[styles.toggleBtnText, currentDayPlan.isActive && styles.toggleBtnTextActive]}>
                {currentDayPlan.isActive ? 'Active' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentDayPlan.isActive && (
          <>
            {/* Pack Selection */}
            {currentDayPlan.packId ? (
              <View style={[styles.packCard, themed.card]}>
                <View style={styles.packHeader}>
                  <Icon name="package-variant" size={20} color={COLORS.primary} />
                  <Text style={[styles.packName, themed.textPrimary]}>{currentDayPlan.packName}</Text>
                  <TouchableOpacity onPress={removePack}>
                    <Icon name="close-circle" size={20} color={COLORS.status.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.packHint}>Items from this pack are shown below. You can customize quantities and cut types.</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addPackBtn, themed.card]}
                onPress={() => setShowPackPicker(true)}
              >
                <Icon name="package-variant-plus" size={22} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.addPackTitle, themed.textPrimary]}>Add a Dish Pack</Text>
                  <Text style={styles.addPackDesc}>Choose a pre-made pack (Sambar, Biryani, etc.)</Text>
                </View>
                <Icon name="chevron-right" size={20} color={COLORS.text.muted} />
              </TouchableOpacity>
            )}

            {/* Items List */}
            <View style={[styles.itemsSection, themed.card]}>
              <View style={styles.itemsSectionHeader}>
                <Text style={[styles.sectionTitle, themed.textPrimary]}>
                  {currentDayPlan.packId ? 'Pack Items' : 'Products'}
                </Text>
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => setShowProductPicker(true)}
                >
                  <Icon name="plus" size={16} color="#FFF" />
                  <Text style={styles.addItemBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {currentDayPlan.items.length === 0 && (
                <View style={styles.emptyItems}>
                  <Icon name="cart-outline" size={36} color={COLORS.text.muted} />
                  <Text style={styles.emptyItemsText}>No items yet</Text>
                  <Text style={styles.emptyItemsSub}>Add products or a dish pack for this day</Text>
                </View>
              )}

              {currentDayPlan.items.map((item, index) => {
                const product = (products as any[]).find(p => p.id === item.productId);
                return (
                  <View key={`${item.productId}-${index}`} style={[styles.itemRow, index < currentDayPlan.items.length - 1 && styles.itemRowBorder]}>
                    {product?.image && (
                      <Image source={{ uri: product.image }} style={styles.itemImage} />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.itemName, themed.textPrimary]}>{item.name}</Text>
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemUnit}>{item.unit}</Text>
                        {item.cutType && (
                          <View style={styles.cutBadge}>
                            <Text style={styles.cutBadgeText}>
                              {CUT_OPTIONS.find(c => c.value === item.cutType)?.label || item.cutType}
                            </Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.cutSelectBtn}
                        onPress={() => { setEditingItemIndex(index); setShowCutPicker(true); }}
                      >
                        <Icon name="content-cut" size={12} color={COLORS.primary} />
                        <Text style={styles.cutSelectText}>
                          {item.cutType ? 'Change Cut' : 'Select Cut'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateItemQuantity(index, -1)}
                      >
                        <Icon name="minus" size={14} color={COLORS.text.secondary} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, themed.textPrimary]}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateItemQuantity(index, 1)}
                      >
                        <Icon name="plus" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeItem(index)}
                    >
                      <Icon name="trash-can-outline" size={16} color={COLORS.status.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={[styles.quickActionBtn, themed.card]} onPress={copyToAllDays}>
                <Icon name="content-copy" size={18} color={COLORS.primary} />
                <Text style={[styles.quickActionText, themed.textPrimary]}>Copy to All Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, themed.card]}
                onPress={() => {
                  updateDayPlan(selectedDay, { items: [], packId: undefined, packName: undefined });
                }}
              >
                <Icon name="eraser" size={18} color="#F57C00" />
                <Text style={[styles.quickActionText, themed.textPrimary]}>Clear Day</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Admin-Style Preparation Summary */}
        <View style={[styles.prepSection, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Weekly Preparation Summary</Text>
          <Text style={styles.prepSubtitle}>What needs to be prepared each day</Text>
          {WEEKDAYS.map(day => {
            const plan = weeklyPlan[day];
            if (!plan.isActive || plan.items.length === 0) return null;
            return (
              <View key={day} style={styles.prepDayRow}>
                <View style={styles.prepDayLabel}>
                  <Text style={styles.prepDayText}>{day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {plan.packName && (
                    <Text style={styles.prepPackLabel}>{plan.packName}</Text>
                  )}
                  {plan.items.map((item, i) => (
                    <Text key={`${item.productId}-${i}`} style={styles.prepItem}>
                      {item.name} x{item.quantity}
                      {item.cutType ? ` (${CUT_OPTIONS.find(c => c.value === item.cutType)?.label || item.cutType})` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
          {WEEKDAYS.every(d => !weeklyPlan[d].isActive || weeklyPlan[d].items.length === 0) && (
            <Text style={styles.emptyItemsText}>No items planned for any day yet.</Text>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => setShowProductPicker(false)}>
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.textPrimary]}>Add Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Icon name="close" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={products as any[]}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: SPACING.base }}
            renderItem={({ item }) => {
              const alreadyAdded = currentDayPlan.items.some(i => i.productId === item.id);
              return (
                <TouchableOpacity
                  style={[styles.productPickerRow, alreadyAdded && styles.productPickerRowAdded]}
                  onPress={() => !alreadyAdded && addProduct(item)}
                  disabled={alreadyAdded}
                >
                  <Image source={{ uri: item.image }} style={styles.productPickerImage} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.productPickerName, themed.textPrimary]}>{item.name}</Text>
                    <Text style={styles.productPickerInfo}>{item.unit} \u00B7 {'\u20B9'}{item.price}</Text>
                  </View>
                  {alreadyAdded ? (
                    <Icon name="check-circle" size={20} color={COLORS.primary} />
                  ) : (
                    <Icon name="plus-circle-outline" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Pack Picker Modal */}
      <Modal visible={showPackPicker} animationType="slide" onRequestClose={() => setShowPackPicker(false)}>
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.textPrimary]}>Choose a Dish Pack</Text>
            <TouchableOpacity onPress={() => setShowPackPicker(false)}>
              <Icon name="close" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={DISH_PACKS}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: SPACING.base }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.packPickerCard}
                onPress={() => selectPack(item)}
              >
                <Image source={{ uri: item.image }} style={styles.packPickerImage} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.packPickerName, themed.textPrimary]}>{item.name}</Text>
                  <Text style={styles.packPickerDesc}>{item.description}</Text>
                  <View style={styles.packPickerMeta}>
                    <Text style={styles.packPickerPrice}>{'\u20B9'}{item.price}</Text>
                    <Text style={styles.packPickerServes}>{item.serves}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Cut Type Picker Modal */}
      <Modal visible={showCutPicker} transparent animationType="fade" onRequestClose={() => setShowCutPicker(false)}>
        <View style={styles.cutModalOverlay}>
          <View style={[styles.cutModalContent, themed.card]}>
            <Text style={[styles.cutModalTitle, themed.textPrimary]}>Select Cut Type</Text>
            {CUT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.cutOption}
                onPress={() => updateItemCut(opt.value)}
              >
                <Icon name={opt.icon as any} size={20} color={COLORS.primary} />
                <Text style={[styles.cutOptionText, themed.textPrimary]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cutCancelBtn} onPress={() => setShowCutPicker(false)}>
              <Text style={styles.cutCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  saveBtn: { fontSize: 15, fontWeight: '700', color: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnDisabled: { opacity: 0.4 },
  scroll: { padding: SPACING.base, paddingBottom: 20 },
  // Summary banner
  summaryBanner: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  // Day tabs
  dayTabsScroll: { marginBottom: SPACING.md },
  dayTabsContainer: { gap: 8, paddingVertical: 2 },
  dayTab: {
    width: 56, height: 64, borderRadius: RADIUS.md, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  dayTabActive: { backgroundColor: COLORS.primary },
  dayTabInactive: { backgroundColor: '#F5F5F5', opacity: 0.7 },
  dayTabText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  dayTabTextActive: { color: '#FFF' },
  dayTabTextInactive: { color: '#BDBDBD' },
  dayTabBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  dayTabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  dayTabBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  dayTabBadgeTextActive: { color: '#FFF' },
  // Day header
  dayHeaderCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayHeaderTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  dayHeaderSub: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA',
  },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#999' },
  toggleBtnTextActive: { color: '#FFF' },
  // Pack card
  packCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  packHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  packName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text.primary },
  packHint: { fontSize: 11, color: COLORS.text.muted, marginTop: 6 },
  addPackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  addPackTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  addPackDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  // Items section
  itemsSection: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  itemsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addItemBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  emptyItems: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyItemsText: { fontSize: 13, color: COLORS.text.muted, textAlign: 'center', marginTop: SPACING.sm },
  emptyItemsSub: { fontSize: 11, color: COLORS.text.muted, textAlign: 'center', marginTop: 2 },
  // Item row
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemImage: { width: 44, height: 44, borderRadius: 10 },
  itemName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  itemUnit: { fontSize: 11, color: COLORS.text.muted },
  cutBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 1 },
  cutBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  cutSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cutSelectText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.sm },
  quickActionText: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  // Preparation summary
  prepSection: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  prepSubtitle: { fontSize: 11, color: COLORS.text.muted, marginTop: -4, marginBottom: SPACING.md },
  prepDayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  prepDayLabel: { width: 36, height: 28, borderRadius: 6, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  prepDayText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  prepPackLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  prepItem: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 },
  // Product picker modal
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  productPickerRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productPickerRowAdded: { opacity: 0.5 },
  productPickerImage: { width: 44, height: 44, borderRadius: 10 },
  productPickerName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  productPickerInfo: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  // Pack picker
  packPickerCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  packPickerImage: { width: 60, height: 60, borderRadius: 12 },
  packPickerName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  packPickerDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  packPickerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  packPickerPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  packPickerServes: { fontSize: 11, color: COLORS.text.secondary },
  // Cut type modal
  cutModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  cutModalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.floating },
  cutModalTitle: { fontSize: 16, fontWeight: '800', marginBottom: SPACING.md },
  cutOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cutOptionText: { fontSize: 14, fontWeight: '600' },
  cutCancelBtn: { alignItems: 'center', paddingTop: SPACING.md },
  cutCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.text.muted },
});
