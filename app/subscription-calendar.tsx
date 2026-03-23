import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Image, Modal, FlatList } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';
import { useDiet } from '@/context/DietContext';
import type { CutType, WeekDay } from '@/types';
import products from '@/data/products.json';
import { DISH_PACKS } from '@/data/dishPacks';

const WEEKDAYS_MAP: Record<string, WeekDay> = { Sun: 'Sun', Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat' };

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function SubscriptionCalendarScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, skipDelivery, unskipDelivery, updateWeeklyPlan } = useOrders();
  const { vacationMode } = useDiet();

  const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId]);
  const subscription = order?.subscription;

  const [showProductPicker, setShowProductPicker] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Calculate delivery days for the current month
  const deliveryMap = useMemo(() => {
    if (!subscription || subscription.status === 'cancelled') return new Map<number, { isDelivery: boolean; isSkipped: boolean; isVacation: boolean; skipReason?: string }>();

    const map = new Map<number, { isDelivery: boolean; isSkipped: boolean; isVacation: boolean; skipReason?: string }>();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = toDateStr(currentYear, currentMonth, day);

      let isDelivery = false;
      if (subscription.frequency === 'daily') {
        isDelivery = true;
      } else if (subscription.frequency === 'weekly') {
        const weekDay = dayName as WeekDay;
        // Check if weeklyPlan has any active days with actual items
        const hasWeeklyPlanItems = subscription.weeklyPlan && Object.values(subscription.weeklyPlan).some(
          (dp: any) => dp && dp.isActive && dp.items && dp.items.length > 0
        );
        if (subscription.weeklyPlan && hasWeeklyPlanItems) {
          const dayPlan = subscription.weeklyPlan[weekDay];
          if (dayPlan && dayPlan.isActive && dayPlan.items.length > 0) {
            isDelivery = true;
          }
        } else if (subscription.weeklyPlan && order && order.items.length > 0) {
          // weeklyPlan exists with isActive flags but no items yet — use isActive to determine delivery days
          const dayPlan = subscription.weeklyPlan[weekDay];
          if (dayPlan && dayPlan.isActive) {
            isDelivery = true;
          }
        } else if (subscription.weeklyDay) {
          isDelivery = dayName === subscription.weeklyDay;
        }
      } else if (subscription.frequency === 'monthly') {
        if (subscription.monthlyDates && subscription.monthlyDates.length > 0) {
          isDelivery = subscription.monthlyDates.includes(day);
        }
      }

      if (isDelivery) {
        const skippedEntry = (subscription.skippedDeliveries || []).find(
          s => s.date === dateStr && s.status === 'skipped'
        );
        // Check if this date is within vacation range
        const inVacation = subscription.pausedFrom && subscription.pausedUntil
          ? dateStr >= subscription.pausedFrom && dateStr <= subscription.pausedUntil
          : false;

        map.set(day, {
          isDelivery: true,
          isSkipped: !!skippedEntry || inVacation,
          isVacation: inVacation,
          skipReason: inVacation ? 'Vacation pause' : skippedEntry?.reason,
        });
      }
    }

    return map;
  }, [subscription, currentMonth, currentYear, order]);

  // Calendar grid data
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const rows: (number | null)[][] = [];
    let row: (number | null)[] = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) row.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      row.push(day);
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
    }

    // Trailing blanks
    if (row.length > 0) {
      while (row.length < 7) row.push(null);
      rows.push(row);
    }

    return rows;
  }, [currentMonth, currentYear]);

  // Monthly summary
  const summary = useMemo(() => {
    let totalDeliveries = 0;
    let skipped = 0;
    deliveryMap.forEach(val => {
      totalDeliveries++;
      if (val.isSkipped) skipped++;
    });
    return { totalDeliveries, skipped, active: totalDeliveries - skipped };
  }, [deliveryMap]);

  // Selected day details
  const selectedDetail = useMemo(() => {
    if (selectedDay === null) return null;
    const d = new Date(currentYear, currentMonth, selectedDay);
    const dateStr = toDateStr(currentYear, currentMonth, selectedDay);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const info = deliveryMap.get(selectedDay);
    const isToday = isSameDay(d, today);
    const isPast = d < today;

    let status: 'scheduled' | 'skipped' | 'vacation' | 'delivered' | 'none' = 'none';
    if (info?.isDelivery) {
      if (info.isVacation) status = 'vacation';
      else if (info.isSkipped) status = 'skipped';
      else if (isPast) status = 'delivered';
      else status = 'scheduled';
    }

    return { dateStr, dayName, dateLabel, info, isToday, isPast, status };
  }, [selectedDay, currentMonth, currentYear, deliveryMap, today]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const handleSkip = async () => {
    if (!orderId || !selectedDetail) return;
    const result = await skipDelivery(orderId, selectedDetail.dateStr, 'Skipped from calendar');
    Alert.alert(result.success ? 'Success' : 'Cannot Skip', result.message);
  };

  const handleUnskip = async () => {
    if (!orderId || !selectedDetail) return;
    await unskipDelivery(orderId, selectedDetail.dateStr);
    Alert.alert('Success', 'Delivery has been restored.');
  };

  // Get items for selected day from weeklyPlan or order items
  const getSelectedDayItems = useCallback(() => {
    if (!selectedDay || !order) return [];
    const info = deliveryMap.get(selectedDay);
    if (!info?.isDelivery) return [];
    const d = new Date(currentYear, currentMonth, selectedDay);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }) as WeekDay;
    const plan = subscription?.weeklyPlan?.[dayName];
    if (plan && plan.items.length > 0) {
      return plan.items.map(item => {
        const product = (products as any[]).find(p => p.id === item.productId);
        return { ...item, image: product?.image, price: product?.price || 0 };
      });
    }
    // Fallback to order items (same items for all delivery days)
    return order.items.map(oi => ({
      productId: oi.id, name: oi.name, quantity: oi.quantity,
      unit: oi.unit, cutType: oi.cutType, image: oi.image, price: oi.price,
    }));
  }, [selectedDay, currentMonth, currentYear, order, subscription, deliveryMap]);

  const selectedDayItems = useMemo(() => getSelectedDayItems(), [getSelectedDayItems]);

  const getSelectedWeekDay = useCallback((): WeekDay | null => {
    if (!selectedDay) return null;
    const d = new Date(currentYear, currentMonth, selectedDay);
    return d.toLocaleDateString('en-US', { weekday: 'short' }) as WeekDay;
  }, [selectedDay, currentMonth, currentYear]);

  const handleAddProductToDay = useCallback((product: any) => {
    if (!order || !orderId || !selectedDay) return;
    const weekDay = getSelectedWeekDay();
    if (!weekDay) return;
    const currentPlan = subscription?.weeklyPlan || {};
    const dayPlan = currentPlan[weekDay] || { day: weekDay, items: [], isActive: true };
    if (dayPlan.items.some((i: any) => i.productId === product.id)) {
      setShowProductPicker(false);
      return;
    }
    const updatedDayPlan = {
      ...dayPlan,
      items: [...dayPlan.items, { productId: product.id, name: product.name, quantity: 1, unit: product.unit }],
    };
    const WEEKDAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullPlan: any = {};
    for (const d of WEEKDAYS) {
      fullPlan[d] = currentPlan[d] || { day: d, items: [], isActive: true };
    }
    fullPlan[weekDay] = updatedDayPlan;
    updateWeeklyPlan(orderId, fullPlan);
    setShowProductPicker(false);
    Alert.alert('Added', `${product.name} added to ${weekDay}'s delivery.`);
  }, [order, orderId, selectedDay, subscription, getSelectedWeekDay, updateWeeklyPlan]);

  const handleRemoveProductFromDay = useCallback((productId: string) => {
    if (!order || !orderId || !selectedDay) return;
    const weekDay = getSelectedWeekDay();
    if (!weekDay) return;
    const currentPlan = subscription?.weeklyPlan || {};
    const dayPlan = currentPlan[weekDay] || { day: weekDay, items: [], isActive: true };
    Alert.alert('Remove Item', 'Remove this item from this day\'s delivery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          const updatedItems = dayPlan.items.filter((i: any) => i.productId !== productId);
          const updatedDayPlan = { ...dayPlan, items: updatedItems };
          const WEEKDAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const fullPlan: any = {};
          for (const d of WEEKDAYS) {
            fullPlan[d] = currentPlan[d] || { day: d, items: [], isActive: true };
          }
          fullPlan[weekDay] = updatedDayPlan;
          updateWeeklyPlan(orderId, fullPlan);
        },
      },
    ]);
  }, [order, orderId, selectedDay, subscription, getSelectedWeekDay, updateWeeklyPlan]);

  const getDayCellStyle = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    const isToday = isSameDay(d, today);
    const isSelected = selectedDay === day;
    const info = deliveryMap.get(day);

    return {
      isToday,
      isSelected,
      isDelivery: !!info?.isDelivery,
      isSkipped: !!info?.isSkipped,
      isVacation: !!info?.isVacation,
    };
  };

  if (!order || !subscription) {
    return (
      <SafeAreaView style={[styles.container, themed.safeArea]}>
        <StatusBar barStyle={themed.isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyContainer}>
          <Icon name="calendar-remove" size={64} color={themed.colors.text.muted} />
          <Text style={[styles.emptyTitle, themed.textPrimary]}>Subscription Not Found</Text>
          <Text style={[styles.emptySubtitle, themed.textSecondary]}>
            This order does not have an active subscription.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themed.safeArea]} edges={['top']}>
      <StatusBar barStyle={themed.isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Delivery Calendar</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={[styles.monthNav, themed.card, themed.borderColor]}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
            <Icon name="chevron-left" size={28} color={themed.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, themed.textPrimary]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow}>
            <Icon name="chevron-right" size={28} color={themed.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={[styles.calendarCard, themed.card, SHADOW.md]}>
          {/* Day headers */}
          <View style={styles.dayHeaderRow}>
            {DAY_NAMES.map(name => (
              <View key={name} style={styles.dayHeaderCell}>
                <Text style={[styles.dayHeaderText, themed.textMuted]}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Day cells */}
          {calendarGrid.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.dayRow}>
              {row.map((day, colIdx) => {
                if (day === null) {
                  return <View key={`blank-${colIdx}`} style={styles.dayCell} />;
                }

                const cellInfo = getDayCellStyle(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      cellInfo.isSelected && { backgroundColor: themed.colors.backgroundSoft },
                      cellInfo.isToday && styles.todayCell,
                    ]}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        themed.textPrimary,
                        cellInfo.isSkipped && !cellInfo.isVacation && styles.skippedDayNumber,
                        cellInfo.isVacation && styles.vacationDayNumber,
                        cellInfo.isSelected && { color: themed.colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {day}
                    </Text>
                    {cellInfo.isDelivery && !cellInfo.isSkipped && (
                      <View style={styles.deliveryDot} />
                    )}
                    {cellInfo.isVacation && (
                      <View style={styles.vacationLine} />
                    )}
                    {cellInfo.isSkipped && !cellInfo.isVacation && (
                      <View style={styles.skippedLine} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={[styles.legendCard, themed.card, SHADOW.sm]}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.deliveryDotLegend} />
              <Text style={[styles.legendText, themed.textSecondary]}>Delivery Day</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.skippedLineLegend} />
              <Text style={[styles.legendText, themed.textSecondary]}>Skipped</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.todayCellLegend} />
              <Text style={[styles.legendText, themed.textSecondary]}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.vacationLineLegend} />
              <Text style={[styles.legendText, themed.textSecondary]}>Vacation</Text>
            </View>
          </View>
        </View>

        {/* Selected Day Detail */}
        {selectedDetail && (
          <View style={[styles.detailCard, themed.card, SHADOW.md]}>
            <View style={styles.detailHeader}>
              <Icon
                name={
                  selectedDetail.status === 'delivered' ? 'check-circle' :
                  selectedDetail.status === 'vacation' ? 'airplane' :
                  selectedDetail.status === 'skipped' ? 'close-circle' :
                  selectedDetail.status === 'scheduled' ? 'clock-outline' :
                  'calendar-blank'
                }
                size={24}
                color={
                  selectedDetail.status === 'delivered' ? COLORS.status.success :
                  selectedDetail.status === 'vacation' ? '#607D8B' :
                  selectedDetail.status === 'skipped' ? COLORS.status.error :
                  selectedDetail.status === 'scheduled' ? COLORS.status.info :
                  COLORS.text.muted
                }
              />
              <View style={styles.detailHeaderText}>
                <Text style={[styles.detailDate, themed.textPrimary]}>{selectedDetail.dateLabel}</Text>
                <Text style={[styles.detailDay, themed.textSecondary]}>{selectedDetail.dayName}</Text>
              </View>
            </View>

            {selectedDetail.info?.isDelivery ? (
              <View style={styles.detailBody}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, themed.textMuted]}>Delivery Time</Text>
                  <Text style={[styles.detailValue, themed.textPrimary]}>{subscription.preferredTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, themed.textMuted]}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selectedDetail.status === 'delivered' ? COLORS.greenLight :
                        selectedDetail.status === 'vacation' ? '#ECEFF1' :
                        selectedDetail.status === 'skipped' ? '#FFEBEE' :
                        selectedDetail.status === 'scheduled' ? '#E3F2FD' :
                        COLORS.background,
                    },
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      {
                        color:
                          selectedDetail.status === 'delivered' ? COLORS.status.success :
                          selectedDetail.status === 'vacation' ? '#607D8B' :
                          selectedDetail.status === 'skipped' ? COLORS.status.error :
                          selectedDetail.status === 'scheduled' ? COLORS.status.info :
                          COLORS.text.muted,
                      },
                    ]}>
                      {selectedDetail.status === 'delivered' ? 'Delivered' :
                       selectedDetail.status === 'vacation' ? 'Vacation Pause' :
                       selectedDetail.status === 'skipped' ? 'Skipped' :
                       selectedDetail.status === 'scheduled' ? 'Scheduled' : 'No Delivery'}
                    </Text>
                  </View>
                </View>

                {selectedDetail.status === 'skipped' && selectedDetail.info.skipReason && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, themed.textMuted]}>Skip Reason</Text>
                    <Text style={[styles.detailValue, themed.textPrimary]}>{selectedDetail.info.skipReason}</Text>
                  </View>
                )}

                {/* Items for this day */}
                {selectedDayItems.length > 0 && (
                  <View style={styles.dayItemsSection}>
                    <View style={styles.dayItemsHeader}>
                      <Text style={[styles.dayItemsTitle, themed.textPrimary]}>
                        Items ({selectedDayItems.length})
                      </Text>
                      {!selectedDetail.isPast && selectedDetail.status !== 'vacation' && (
                        <TouchableOpacity style={styles.addItemSmallBtn} onPress={() => setShowProductPicker(true)}>
                          <Icon name="plus" size={14} color="#FFF" />
                          <Text style={styles.addItemSmallBtnText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {selectedDayItems.map((item: any, idx: number) => (
                      <View key={`${item.productId}-${idx}`} style={[styles.dayItemRow, idx < selectedDayItems.length - 1 && styles.dayItemRowBorder]}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.dayItemImage} />
                        ) : (
                          <View style={[styles.dayItemImage, { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }]}>
                            <Icon name="food-apple" size={16} color={COLORS.text.muted} />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.dayItemName, themed.textPrimary]}>{item.name}</Text>
                          <Text style={styles.dayItemMeta}>
                            {item.unit} · x{item.quantity}
                            {item.price ? ` · ₹${item.price}` : ''}
                            {item.cutType ? ` · ${item.cutType.replace('_', ' ')}` : ''}
                          </Text>
                        </View>
                        {!selectedDetail.isPast && selectedDetail.status !== 'vacation' && (
                          <TouchableOpacity style={styles.dayItemRemoveBtn} onPress={() => handleRemoveProductFromDay(item.productId)}>
                            <Icon name="close" size={14} color={COLORS.status.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {selectedDayItems.length === 0 && !selectedDetail.isPast && (
                  <TouchableOpacity style={styles.addItemsEmptyBtn} onPress={() => setShowProductPicker(true)}>
                    <Icon name="plus-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.addItemsEmptyText}>Add items for this day</Text>
                  </TouchableOpacity>
                )}

                {/* Action buttons */}
                <View style={styles.dayActionRow}>
                  {!selectedDetail.isPast && selectedDetail.status === 'scheduled' && (
                    <TouchableOpacity style={[styles.skipBtn, { flex: 1 }]} onPress={handleSkip} activeOpacity={0.7}>
                      <Icon name="close-circle-outline" size={16} color="#FFF" />
                      <Text style={styles.skipBtnText}>Skip</Text>
                    </TouchableOpacity>
                  )}
                  {!selectedDetail.isPast && selectedDetail.status === 'skipped' && (
                    <TouchableOpacity style={[styles.unskipBtn, { flex: 1 }]} onPress={handleUnskip} activeOpacity={0.7}>
                      <Icon name="undo" size={16} color="#FFF" />
                      <Text style={styles.skipBtnText}>Restore</Text>
                    </TouchableOpacity>
                  )}
                  {!selectedDetail.isPast && selectedDetail.status !== 'vacation' && (
                    <TouchableOpacity
                      style={styles.editPlanBtn}
                      onPress={() => router.push({ pathname: '/subscription-plan-editor' as any, params: { id: orderId } })}
                      activeOpacity={0.7}
                    >
                      <Icon name="pencil" size={16} color={COLORS.primary} />
                      <Text style={styles.editPlanBtnText}>Edit Plan</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedDetail.status === 'vacation' && (
                  <View style={styles.vacationNote}>
                    <Icon name="information-outline" size={16} color="#607D8B" />
                    <Text style={styles.vacationNoteText}>This delivery is paused due to vacation mode.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.detailBody}>
                <Text style={[styles.noDeliveryText, themed.textMuted]}>No delivery scheduled for this day.</Text>
                {!selectedDetail.isPast && (
                  <TouchableOpacity
                    style={styles.addDeliveryBtn}
                    onPress={() => {
                      const weekDay = getSelectedWeekDay();
                      if (!weekDay || !orderId) return;
                      const currentPlan = subscription?.weeklyPlan || {};
                      const WKDAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      const fullPlan: any = {};
                      for (const d of WKDAYS) {
                        fullPlan[d] = currentPlan[d] || { day: d, items: [], isActive: d === weekDay };
                      }
                      if (!fullPlan[weekDay].isActive) {
                        fullPlan[weekDay] = { ...fullPlan[weekDay], isActive: true };
                      }
                      updateWeeklyPlan(orderId, fullPlan);
                      setShowProductPicker(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="plus-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.addDeliveryBtnText}>Add delivery for this day</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Monthly Summary */}
        <View style={[styles.summaryCard, themed.card, SHADOW.md]}>
          <Text style={[styles.summaryTitle, themed.textPrimary]}>Monthly Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <LinearGradient colors={themed.primaryGradient} style={styles.summaryIcon}>
                <Icon name="truck-delivery" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.totalDeliveries}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.status.success }]}>
                <Icon name="check" size={20} color="#FFF" />
              </View>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.active}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Active</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.status.error }]}>
                <Icon name="close" size={20} color="#FFF" />
              </View>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.skipped}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Skipped</Text>
            </View>
          </View>
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => setShowProductPicker(false)}>
        <SafeAreaView style={[styles.container, themed.safeArea]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, themed.textPrimary]}>
              Add Product — {selectedDay && new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Icon name="close" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={products as any[]}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: SPACING.base }}
            renderItem={({ item }) => {
              const alreadyAdded = selectedDayItems.some((i: any) => i.productId === item.id);
              return (
                <TouchableOpacity
                  style={[styles.pickerRow, alreadyAdded && { opacity: 0.4 }]}
                  onPress={() => !alreadyAdded && handleAddProductToDay(item)}
                  disabled={alreadyAdded}
                >
                  <Image source={{ uri: item.image }} style={styles.pickerImage} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.pickerName, themed.textPrimary]}>{item.name}</Text>
                    <Text style={styles.pickerInfo}>{item.unit} · ₹{item.price}</Text>
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
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Calendar
  calendarCard: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    overflow: 'hidden',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    marginVertical: 1,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: COLORS.status.info,
    borderRadius: RADIUS.sm,
  },
  skippedDayNumber: {
    color: COLORS.status.error,
    textDecorationLine: 'line-through',
    textDecorationColor: COLORS.status.error,
  },
  vacationDayNumber: {
    color: '#90A4AE',
    opacity: 0.7,
  },
  vacationLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#607D8B',
    marginTop: 2,
  },
  deliveryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.status.success,
    marginTop: 2,
  },
  skippedLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.status.error,
    marginTop: 2,
  },

  // Legend
  legendCard: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
  deliveryDotLegend: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.status.success,
  },
  skippedLineLegend: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.status.error,
  },
  todayCellLegend: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.status.info,
  },
  vacationLineLegend: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#607D8B',
  },

  // Detail card
  detailCard: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailHeaderText: {
    marginLeft: SPACING.md,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailDay: {
    fontSize: 13,
    marginTop: 2,
  },
  detailBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noDeliveryText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: SPACING.base,
  },
  // Day items
  dayItemsSection: { marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  dayItemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  dayItemsTitle: { fontSize: 13, fontWeight: '700' },
  addItemSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  addItemSmallBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  dayItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dayItemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dayItemImage: { width: 36, height: 36, borderRadius: 8 },
  dayItemName: { fontSize: 12, fontWeight: '700' },
  dayItemMeta: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  dayItemRemoveBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  addItemsEmptyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, borderStyle: 'dashed', marginTop: SPACING.sm },
  addItemsEmptyText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  addDeliveryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, borderStyle: 'dashed', marginTop: SPACING.sm },
  addDeliveryBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  dayActionRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.md },
  editPlanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary },
  editPlanBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  // Picker modal
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerTitle: { fontSize: 15, fontWeight: '800' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerImage: { width: 40, height: 40, borderRadius: 10 },
  pickerName: { fontSize: 13, fontWeight: '700' },
  pickerInfo: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  // Action buttons
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.status.error,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  unskipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.status.success,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  skipBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  vacationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECEFF1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  vacationNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#607D8B',
    lineHeight: 18,
  },

  // Summary
  summaryCard: {
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.base,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  backBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
