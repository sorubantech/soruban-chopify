import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';
import type { WeekDay } from '@/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getSubColor(frequency: string, isGroup: boolean): string {
  if (isGroup) return '#1565C0';
  return frequency === 'daily' ? '#F57C00' : frequency === 'weekly' ? COLORS.primary : '#7B1FA2';
}

function getSubBgColor(frequency: string, isGroup: boolean): string {
  if (isGroup) return '#E3F2FD';
  return frequency === 'daily' ? '#FFF3E0' : frequency === 'weekly' ? '#E8F5E9' : '#F3E5F5';
}

type DayStatus = 'delivered' | 'cancelled' | 'in_progress' | 'none';

type SubDeliveryInfo = {
  orderId: string;
  frequency: string;
  label: string;
  isSkipped: boolean;
  isGroup: boolean;
  items: { name: string; quantity: number }[];
  total: number;
};

export default function OrderHistoryCalendarScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { orders } = useOrders();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Get subscription orders
  const subscriptionOrders = useMemo(() =>
    orders.filter(o => o.subscription && o.subscription.status !== 'cancelled')
  , [orders]);

  const regularOrders = useMemo(() =>
    orders.filter(o => !o.subscription || o.subscription.status === 'cancelled')
  , [orders]);

  // Filter tabs
  const filterTabs = useMemo(() => {
    const tabs: { key: string; label: string; icon: string; color: string }[] = [
      { key: 'all', label: 'All', icon: 'view-grid', color: COLORS.primary },
    ];
    if (regularOrders.length > 0) {
      tabs.push({ key: 'orders', label: 'Orders', icon: 'package-variant', color: '#1565C0' });
    }
    subscriptionOrders.forEach(o => {
      const sub = o.subscription!;
      const freqLabel = sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1);
      const isGroup = !!sub.groupCode;
      tabs.push({
        key: o.id,
        label: `${isGroup ? 'Group ' : ''}${freqLabel} Sub`,
        icon: isGroup ? 'account-group' : sub.frequency === 'daily' ? 'calendar-today' : sub.frequency === 'weekly' ? 'calendar-week' : 'calendar-month',
        color: getSubColor(sub.frequency, isGroup),
      });
    });
    return tabs;
  }, [subscriptionOrders, regularOrders]);

  // Build subscription delivery map for current month
  const subDeliveryMap = useMemo(() => {
    const map = new Map<string, SubDeliveryInfo[]>();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    subscriptionOrders.forEach(order => {
      const sub = order.subscription!;
      if (activeFilter !== 'all' && activeFilter !== order.id) return;

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(currentYear, currentMonth, day);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = toDateStr(currentYear, currentMonth, day);

        let isDelivery = false;
        if (sub.frequency === 'daily') {
          isDelivery = true;
        } else if (sub.frequency === 'weekly') {
          const wd = dayName as WeekDay;
          if (sub.weeklyPlan) {
            const dp = sub.weeklyPlan[wd];
            const hasItems = !!(dp && dp.isActive && dp.items.length > 0);
            // If weeklyPlan exists but all days have empty items, fall through to weeklyDay
            const planHasAnyItems = Object.values(sub.weeklyPlan).some(d => d.isActive && d.items.length > 0);
            if (planHasAnyItems) {
              isDelivery = hasItems;
            } else if (sub.weeklyDay) {
              isDelivery = dayName === sub.weeklyDay;
            } else {
              isDelivery = dayName !== 'Sun';
            }
          } else if (sub.weeklyDay) {
            isDelivery = dayName === sub.weeklyDay;
          } else {
            isDelivery = dayName !== 'Sun';
          }
        } else if (sub.frequency === 'monthly') {
          if (sub.monthlyDates && sub.monthlyDates.length > 0) {
            isDelivery = sub.monthlyDates.includes(day);
          } else {
            isDelivery = dayName !== 'Sun';
          }
        }

        if (isDelivery) {
          const isSkipped = (sub.skippedDeliveries || []).some(s => s.date === dateStr && s.status === 'skipped');
          const freqLabel = sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1);
          const isGroup = !!sub.groupCode;
          const info: SubDeliveryInfo = {
            orderId: order.id,
            frequency: sub.frequency,
            label: `${isGroup ? 'Group ' : ''}${freqLabel} Subscription`,
            isSkipped,
            isGroup,
            items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
            total: order.total,
          };
          if (!map.has(dateStr)) map.set(dateStr, []);
          map.get(dateStr)!.push(info);
        }
      }
    });
    return map;
  }, [subscriptionOrders, currentMonth, currentYear, activeFilter]);

  // Build a map of date -> order statuses for the current month
  const orderMap = useMemo(() => {
    const map = new Map<string, { status: DayStatus; orders: typeof orders; subDeliveries: SubDeliveryInfo[] }>();

    // Add subscription deliveries first
    subDeliveryMap.forEach((deliveries, dateStr) => {
      if (!map.has(dateStr)) {
        map.set(dateStr, { status: 'none', orders: [], subDeliveries: deliveries });
      } else {
        map.get(dateStr)!.subDeliveries = deliveries;
      }
      // Mark as in_progress for future, delivered for past
      const d = new Date(dateStr + 'T00:00:00');
      const entry = map.get(dateStr)!;
      const allSkipped = deliveries.every(del => del.isSkipped);
      if (allSkipped) {
        if (entry.status === 'none') entry.status = 'cancelled';
      } else if (d < today) {
        if (entry.status === 'none') entry.status = 'delivered';
      } else {
        if (entry.status === 'none') entry.status = 'in_progress';
      }
    });

    // Add regular orders
    if (activeFilter === 'all' || activeFilter === 'orders') {
      regularOrders.forEach(order => {
        const created = new Date(order.createdAt);
        const dateStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;

        if (!map.has(dateStr)) {
          map.set(dateStr, { status: 'none', orders: [], subDeliveries: [] });
        }
        const entry = map.get(dateStr)!;
        entry.orders.push(order);

        if (order.status === 'delivered') {
          entry.status = 'delivered';
        } else if (order.status === 'cancelled') {
          if (entry.status !== 'delivered') entry.status = 'cancelled';
        } else {
          if (entry.status !== 'delivered' && entry.status !== 'cancelled') entry.status = 'in_progress';
        }
      });
    }

    // If filtering by a specific subscription, only show that sub's data
    if (activeFilter !== 'all' && activeFilter !== 'orders') {
      const filtered = new Map<string, { status: DayStatus; orders: typeof orders; subDeliveries: SubDeliveryInfo[] }>();
      subDeliveryMap.forEach((deliveries, dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const allSkipped = deliveries.every(del => del.isSkipped);
        filtered.set(dateStr, {
          status: allSkipped ? 'cancelled' : d < today ? 'delivered' : 'in_progress',
          orders: [],
          subDeliveries: deliveries,
        });
      });
      return filtered;
    }

    return map;
  }, [orders, regularOrders, subDeliveryMap, activeFilter, today]);

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const rows: (number | null)[][] = [];
    let row: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) row.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      row.push(day);
      if (row.length === 7) { rows.push(row); row = []; }
    }
    if (row.length > 0) {
      while (row.length < 7) row.push(null);
      rows.push(row);
    }
    return rows;
  }, [currentMonth, currentYear]);

  // Monthly summary
  const summary = useMemo(() => {
    let delivered = 0;
    let cancelled = 0;
    let inProgress = 0;
    let skipped = 0;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateStr(currentYear, currentMonth, day);
      const entry = orderMap.get(dateStr);
      if (entry) {
        if (entry.status === 'delivered') delivered++;
        else if (entry.status === 'cancelled') cancelled++;
        else if (entry.status === 'in_progress') inProgress++;
      }
      const subDels = subDeliveryMap.get(dateStr);
      if (subDels) {
        skipped += subDels.filter(d => d.isSkipped).length;
      }
    }
    return { delivered, cancelled, inProgress, skipped, total: delivered + cancelled + inProgress };
  }, [orderMap, subDeliveryMap, currentMonth, currentYear]);

  // Selected day details
  const selectedDetail = useMemo(() => {
    if (selectedDay === null) return null;
    const dateStr = toDateStr(currentYear, currentMonth, selectedDay);
    const d = new Date(currentYear, currentMonth, selectedDay);
    const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const entry = orderMap.get(dateStr);
    return { dateStr, dateLabel, dayName, entry };
  }, [selectedDay, currentMonth, currentYear, orderMap]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
    setSelectedDay(null);
  };

  const getDayCellInfo = (day: number) => {
    const dateStr = toDateStr(currentYear, currentMonth, day);
    const d = new Date(currentYear, currentMonth, day);
    const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    const entry = orderMap.get(dateStr);
    return { isToday, isSelected: selectedDay === day, status: entry?.status || 'none' as DayStatus };
  };

  const STATUS_COLORS: Record<DayStatus, string> = {
    delivered: COLORS.status.success,
    cancelled: COLORS.status.error,
    in_progress: COLORS.status.info,
    none: 'transparent',
  };

  return (
    <SafeAreaView style={[styles.container, themed.safeArea]} edges={['top']}>
      <StatusBar barStyle={themed.isDark ? 'light-content' : 'dark-content'} />

      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Order History</Text>
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

        {/* Subscription Filter Tabs */}
        {filterTabs.length > 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
            {filterTabs.map(tab => {
              const isActive = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterTab, isActive && { backgroundColor: tab.color, borderColor: tab.color }]}
                  onPress={() => { setActiveFilter(tab.key); setSelectedDay(null); }}
                  activeOpacity={0.8}
                >
                  <Icon name={tab.icon as any} size={14} color={isActive ? '#FFF' : tab.color} />
                  <Text style={[styles.filterTabText, isActive && { color: '#FFF' }]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Calendar Grid */}
        <View style={[styles.calendarCard, themed.card, SHADOW.md]}>
          <View style={styles.dayHeaderRow}>
            {DAY_NAMES.map(name => (
              <View key={name} style={styles.dayHeaderCell}>
                <Text style={[styles.dayHeaderText, themed.textMuted]}>{name}</Text>
              </View>
            ))}
          </View>

          {calendarGrid.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.dayRow}>
              {row.map((day, colIdx) => {
                if (day === null) return <View key={`blank-${colIdx}`} style={styles.dayCell} />;

                const cellInfo = getDayCellInfo(day);
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
                    <Text style={[
                      styles.dayNumber,
                      themed.textPrimary,
                      cellInfo.isSelected && { color: themed.colors.primary, fontWeight: '700' },
                    ]}>
                      {day}
                    </Text>
                    {(() => {
                      const dateStr = toDateStr(currentYear, currentMonth, day);
                      const subDels = subDeliveryMap.get(dateStr);
                      if (subDels && subDels.length > 0) {
                        // Show colored dots for each subscription
                        return (
                          <View style={{ flexDirection: 'row', gap: 2, marginTop: 1 }}>
                            {subDels.map((del, i) => (
                              <View key={i} style={{
                                width: 5, height: 5, borderRadius: 3,
                                backgroundColor: del.isSkipped ? COLORS.status.error : getSubColor(del.frequency, del.isGroup),
                              }} />
                            ))}
                          </View>
                        );
                      }
                      // Regular order icons
                      if (cellInfo.status === 'delivered') return <Icon name="check-circle" size={12} color={COLORS.status.success} style={{ marginTop: 1 }} />;
                      if (cellInfo.status === 'cancelled') return <Icon name="close-circle" size={12} color={COLORS.status.error} style={{ marginTop: 1 }} />;
                      if (cellInfo.status === 'in_progress') return <Icon name="clock-outline" size={12} color={COLORS.status.info} style={{ marginTop: 1 }} />;
                      return null;
                    })()}
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
              <Icon name="check-circle" size={14} color={COLORS.status.success} />
              <Text style={[styles.legendText, themed.textSecondary]}>Delivered</Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="close-circle" size={14} color={COLORS.status.error} />
              <Text style={[styles.legendText, themed.textSecondary]}>Cancelled/Skipped</Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="clock-outline" size={14} color={COLORS.status.info} />
              <Text style={[styles.legendText, themed.textSecondary]}>Scheduled</Text>
            </View>
          </View>
          {subscriptionOrders.length > 0 && (
            <>
              <View style={[styles.legendRow, { marginTop: 6 }]}>
                <View style={styles.legendItem}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F57C00' }} />
                  <Text style={[styles.legendText, themed.textSecondary]}>Daily</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
                  <Text style={[styles.legendText, themed.textSecondary]}>Weekly</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7B1FA2' }} />
                  <Text style={[styles.legendText, themed.textSecondary]}>Monthly</Text>
                </View>
              </View>
              <View style={[styles.legendRow, { marginTop: 6 }]}>
                <View style={styles.legendItem}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1565C0' }} />
                  <Text style={[styles.legendText, themed.textSecondary]}>Group Sub</Text>
                </View>
              </View>
            </>
          )}
          <View style={[styles.legendRow, { marginTop: 6 }]}>
            <View style={styles.legendItem}>
              <View style={styles.todayCellLegend} />
              <Text style={[styles.legendText, themed.textSecondary]}>Today</Text>
            </View>
          </View>
        </View>

        {/* Selected Day Detail */}
        {selectedDetail && (
          <View style={[styles.detailCard, themed.card, SHADOW.md]}>
            <View style={styles.detailHeader}>
              <Icon
                name={
                  selectedDetail.entry?.status === 'delivered' ? 'check-circle' :
                  selectedDetail.entry?.status === 'cancelled' ? 'close-circle' :
                  selectedDetail.entry?.status === 'in_progress' ? 'clock-outline' :
                  'calendar-blank'
                }
                size={24}
                color={STATUS_COLORS[selectedDetail.entry?.status || 'none']}
              />
              <View style={styles.detailHeaderText}>
                <Text style={[styles.detailDate, themed.textPrimary]}>{selectedDetail.dateLabel}</Text>
                <Text style={[styles.detailDay, themed.textSecondary]}>{selectedDetail.dayName}</Text>
              </View>
            </View>

            {(selectedDetail.entry && (selectedDetail.entry.orders.length > 0 || selectedDetail.entry.subDeliveries.length > 0)) ? (
              <View style={styles.detailBody}>
                {/* Subscription Deliveries */}
                {selectedDetail.entry.subDeliveries.map((del, idx) => (
                  <TouchableOpacity
                    key={`sub-${del.orderId}-${idx}`}
                    style={styles.orderRow}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/subscription-manage' as any, params: { id: del.orderId } })}
                  >
                    <View style={[styles.orderStatusDot, { backgroundColor: del.isSkipped ? COLORS.status.error : getSubColor(del.frequency, del.isGroup) }]} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.orderRowId, themed.textPrimary]}>{del.label}</Text>
                        <View style={[styles.subTypeBadge, { backgroundColor: getSubBgColor(del.frequency, del.isGroup) }]}>
                          <Text style={[styles.subTypeBadgeText, { color: getSubColor(del.frequency, del.isGroup) }]}>
                            {del.isGroup ? `Group ${del.frequency}` : del.frequency}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.orderRowMeta}>
                        {del.items.length} items · {'\u20B9'}{del.total}
                        {del.isSkipped ? '' : ` · ${del.items.slice(0, 2).map(i => i.name).join(', ')}${del.items.length > 2 ? '...' : ''}`}
                      </Text>
                    </View>
                    {del.isSkipped ? (
                      <View style={[styles.orderStatusBadge, { backgroundColor: '#FFEBEE' }]}>
                        <Text style={[styles.orderStatusText, { color: COLORS.status.error }]}>Skipped</Text>
                      </View>
                    ) : (
                      <View style={[styles.orderStatusBadge, { backgroundColor: new Date(selectedDetail.dateStr + 'T00:00:00') < today ? '#E8F5E9' : '#E3F2FD' }]}>
                        <Text style={[styles.orderStatusText, { color: new Date(selectedDetail.dateStr + 'T00:00:00') < today ? COLORS.status.success : COLORS.status.info }]}>
                          {new Date(selectedDetail.dateStr + 'T00:00:00') < today ? 'Delivered' : 'Scheduled'}
                        </Text>
                      </View>
                    )}
                    <Icon name="chevron-right" size={16} color={COLORS.text.muted} />
                  </TouchableOpacity>
                ))}

                {/* Regular Orders */}
                {selectedDetail.entry.orders.map(order => {
                  const time = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
                  const statusColor = STATUS_COLORS[order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' ? 'cancelled' : 'in_progress'];
                  const statusLabel = order.status === 'delivered' ? 'Delivered' :
                    order.status === 'cancelled' ? 'Cancelled' :
                    order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ');

                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={styles.orderRow}
                      activeOpacity={0.8}
                      onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}
                    >
                      <View style={[styles.orderStatusDot, { backgroundColor: statusColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.orderRowId, themed.textPrimary]}>#{order.id}</Text>
                        <Text style={styles.orderRowMeta}>{order.items.length} items · {'\u20B9'}{order.total} · {time}</Text>
                      </View>
                      <View style={[styles.orderStatusBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.orderStatusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      <Icon name="chevron-right" size={16} color={COLORS.text.muted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.detailBody}>
                <Text style={[styles.noOrderText, themed.textMuted]}>No orders on this day</Text>
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
                <Icon name="package-variant" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.total}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.status.success }]}>
                <Icon name="check" size={20} color="#FFF" />
              </View>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.delivered}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Delivered</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.status.error }]}>
                <Icon name="close" size={20} color="#FFF" />
              </View>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.cancelled}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Cancelled</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.status.info }]}>
                <Icon name="clock-outline" size={20} color="#FFF" />
              </View>
              <Text style={[styles.summaryNumber, themed.textPrimary]}>{summary.inProgress}</Text>
              <Text style={[styles.summaryLabel, themed.textMuted]}>Active</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerBack: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.base, marginTop: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.base, borderRadius: RADIUS.lg, borderWidth: 1 },
  monthArrow: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 18, fontWeight: '700' },
  filterScroll: { marginTop: SPACING.md, marginBottom: -SPACING.sm },
  filterContainer: { paddingHorizontal: SPACING.base, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: COLORS.border },
  filterTabText: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  subTypeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  subTypeBadgeText: { fontSize: 8, fontWeight: '800', textTransform: 'capitalize' },
  calendarCard: { marginHorizontal: SPACING.base, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.sm, overflow: 'hidden' },
  dayHeaderRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  dayHeaderText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  dayRow: { flexDirection: 'row' },
  dayCell: { flex: 1, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm, marginVertical: 1 },
  dayNumber: { fontSize: 14, fontWeight: '500' },
  todayCell: { borderWidth: 2, borderColor: COLORS.status.info, borderRadius: RADIUS.sm },
  legendCard: { marginHorizontal: SPACING.base, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.base },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12 },
  todayCellLegend: { width: 20, height: 20, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.status.info },
  detailCard: { marginHorizontal: SPACING.base, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.base },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  detailHeaderText: { marginLeft: SPACING.md },
  detailDate: { fontSize: 16, fontWeight: '700' },
  detailDay: { fontSize: 13, marginTop: 2 },
  detailBody: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md },
  noOrderText: { fontSize: 14, textAlign: 'center', paddingVertical: SPACING.base },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  orderStatusDot: { width: 8, height: 8, borderRadius: 4 },
  orderRowId: { fontSize: 13, fontWeight: '700' },
  orderRowMeta: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  orderStatusText: { fontSize: 10, fontWeight: '700' },
  summaryCard: { marginHorizontal: SPACING.base, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.base },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 6 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  summaryNumber: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11 },
});
