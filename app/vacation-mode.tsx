import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useDiet } from '@/context/DietContext';
import { useOrders } from '@/context/OrderContext';
import type { VacationMode } from '@/types';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function VacationModeScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { vacationMode, setVacationMode } = useDiet();
  const { orders, pauseSubscription, resumeSubscription } = useOrders();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState<Date>(addDays(today, 1));
  const [endDate, setEndDate] = useState<Date>(addDays(today, 7));
  const [refundType, setRefundType] = useState<'extend' | 'wallet'>('extend');
  const [isProcessing, setIsProcessing] = useState(false);

  const subscriptionOrders = useMemo(() => {
    return orders.filter(
      (o) => o.subscription && o.subscription.status === 'active' && o.status !== 'cancelled'
    );
  }, [orders]);

  const isActive = vacationMode?.isActive ?? false;

  const adjustStartDate = (delta: number) => {
    const next = addDays(startDate, delta);
    if (next <= today) return;
    if (next >= endDate) return;
    setStartDate(next);
  };

  const adjustEndDate = (delta: number) => {
    const next = addDays(endDate, delta);
    if (next <= startDate) return;
    setEndDate(next);
  };

  const handleActivate = () => {
    if (subscriptionOrders.length === 0) {
      Alert.alert(
        'No Subscriptions',
        'You have no active subscriptions to pause. Vacation mode only affects subscription deliveries.',
      );
      return;
    }

    Alert.alert(
      'Activate Vacation Mode',
      `All deliveries between ${formatDate(startDate)} and ${formatDate(endDate)} will be paused. ${refundType === 'wallet' ? 'Refund will be credited to your wallet.' : 'Your subscription will be extended.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            setIsProcessing(true);
            const affectedIds: string[] = [];
            let totalPausedDeliveries = 0;
            let totalEstimatedRefund = 0;

            // Pause each subscription
            for (const order of subscriptionOrders) {
              const result = await pauseSubscription(order.id, toDateString(startDate), toDateString(endDate));
              if (result.success) {
                affectedIds.push(order.id);
                totalPausedDeliveries += result.pausedDeliveryCount || 0;
                totalEstimatedRefund += result.estimatedRefund || 0;
              }
            }

            // Store vacation mode with refund info
            const vacation: VacationMode = {
              isActive: true,
              startDate: toDateString(startDate),
              endDate: toDateString(endDate),
              affectedSubscriptions: affectedIds,
              refundType,
              pausedDeliveryCount: totalPausedDeliveries,
              estimatedRefund: totalEstimatedRefund,
            };
            await setVacationMode(vacation);
            setIsProcessing(false);

            Alert.alert(
              'Vacation Mode Activated',
              `${totalPausedDeliveries} deliveries paused. ${refundType === 'wallet' ? `₹${totalEstimatedRefund} will be credited when you resume.` : `Subscription will be extended by ${totalPausedDeliveries} days.`}`,
            );
          },
        },
      ],
    );
  };

  const handleDeactivate = () => {
    const savedRefundType = vacationMode?.refundType || 'extend';
    const pausedCount = vacationMode?.pausedDeliveryCount || 0;
    const estimatedRefund = vacationMode?.estimatedRefund || 0;

    const refundMsg = savedRefundType === 'wallet'
      ? `₹${estimatedRefund} will be credited to your wallet.`
      : `Your subscription will be extended by ${pausedCount} delivery days.`;

    Alert.alert(
      'Deactivate Vacation Mode',
      `Your subscription deliveries will resume immediately. ${refundMsg}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume & Process Refund',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            // Resume each affected subscription
            for (const subId of (vacationMode?.affectedSubscriptions || [])) {
              await resumeSubscription(subId, savedRefundType);
            }
            await setVacationMode(null);
            setIsProcessing(false);
            Alert.alert('Vacation Mode Deactivated', `Deliveries resumed. ${refundMsg}`);
          },
        },
      ],
    );
  };

  const daysRemaining = isActive
    ? daysBetween(today, new Date(vacationMode!.endDate + 'T00:00:00'))
    : 0;

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Vacation Mode</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, themed.card, themed.borderColor]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: isActive ? '#E8F5E9' : '#FFF3E0' }]}>
              <Icon
                name={isActive ? 'palm-tree' : 'briefcase-outline'}
                size={28}
                color={isActive ? COLORS.status.success : COLORS.status.warning}
              />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, themed.textMuted]}>Status</Text>
              <Text style={[styles.statusValue, { color: isActive ? COLORS.status.success : COLORS.text.secondary }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isActive ? '#E8F5E9' : '#F5F5F5' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? COLORS.status.success : COLORS.text.muted },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isActive ? COLORS.status.success : COLORS.text.muted },
                ]}
              >
                {isActive ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
        </View>

        {isActive ? (
          <>
            {/* Active Vacation Card */}
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.activeCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.activeCardHeader}>
                <Icon name="palm-tree" size={24} color={COLORS.status.success} />
                <Text style={styles.activeCardTitle}>Vacation mode is ON</Text>
              </View>
              <View style={styles.activeDateRange}>
                <View style={styles.activeDateItem}>
                  <Text style={styles.activeDateLabel}>From</Text>
                  <Text style={styles.activeDateValue}>
                    {formatDate(new Date(vacationMode!.startDate + 'T00:00:00'))}
                  </Text>
                </View>
                <Icon name="arrow-right" size={20} color={COLORS.status.success} />
                <View style={styles.activeDateItem}>
                  <Text style={styles.activeDateLabel}>Until</Text>
                  <Text style={styles.activeDateValue}>
                    {formatDate(new Date(vacationMode!.endDate + 'T00:00:00'))}
                  </Text>
                </View>
              </View>
              <View style={styles.activeBadgesRow}>
                <View style={styles.daysRemainingBadge}>
                  <Icon name="clock-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.daysRemainingText}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                  </Text>
                </View>
                {vacationMode!.pausedDeliveryCount != null && (
                  <View style={[styles.daysRemainingBadge, { backgroundColor: '#1565C0' }]}>
                    <Icon name="truck-remove" size={16} color="#FFFFFF" />
                    <Text style={styles.daysRemainingText}>
                      {vacationMode!.pausedDeliveryCount} deliveries paused
                    </Text>
                  </View>
                )}
              </View>
              {vacationMode!.estimatedRefund != null && vacationMode!.estimatedRefund > 0 && (
                <View style={styles.refundInfoRow}>
                  <Icon name={vacationMode!.refundType === 'wallet' ? 'wallet' : 'calendar-plus'} size={16} color="#2E7D32" />
                  <Text style={styles.refundInfoText}>
                    {vacationMode!.refundType === 'wallet'
                      ? `₹${vacationMode!.estimatedRefund} wallet credit on resume`
                      : `${vacationMode!.pausedDeliveryCount} days extension on resume`}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Affected Subscriptions */}
            {vacationMode!.affectedSubscriptions.length > 0 && (
              <View style={[styles.sectionCard, themed.card, themed.borderColor]}>
                <Text style={[styles.sectionTitle, themed.textPrimary]}>Paused Subscriptions</Text>
                {vacationMode!.affectedSubscriptions.map((subId) => {
                  const order = orders.find((o) => o.id === subId);
                  return (
                    <View key={subId} style={styles.subscriptionItem}>
                      <Icon name="pause-circle-outline" size={20} color={COLORS.status.warning} />
                      <Text style={[styles.subscriptionText, themed.textSecondary]}>
                        {order ? `Order #${order.id}` : `Subscription ${subId}`}
                        {order?.subscription ? ` - ${order.subscription.frequency}` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Deactivate Button */}
            <TouchableOpacity style={styles.deactivateBtn} onPress={handleDeactivate} activeOpacity={0.8}>
              <Icon name="close-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deactivateBtnText}>Deactivate Vacation Mode</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Date Range Picker */}
            <View style={[styles.sectionCard, themed.card, themed.borderColor]}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Select Date Range</Text>

              {/* Start Date */}
              <View style={styles.datePickerRow}>
                <Text style={[styles.dateLabel, themed.textSecondary]}>Start Date</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity
                    style={[styles.dateBtn, themed.borderColor]}
                    onPress={() => adjustStartDate(-1)}
                    activeOpacity={0.7}
                  >
                    <Icon name="minus" size={18} color={themed.colors.text.primary} />
                  </TouchableOpacity>
                  <View style={styles.dateDisplay}>
                    <Icon name="calendar-start" size={16} color={COLORS.primary} />
                    <Text style={[styles.dateText, themed.textPrimary]}>{formatDate(startDate)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.dateBtn, themed.borderColor]}
                    onPress={() => adjustStartDate(1)}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={18} color={themed.colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Date */}
              <View style={styles.datePickerRow}>
                <Text style={[styles.dateLabel, themed.textSecondary]}>End Date</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity
                    style={[styles.dateBtn, themed.borderColor]}
                    onPress={() => adjustEndDate(-1)}
                    activeOpacity={0.7}
                  >
                    <Icon name="minus" size={18} color={themed.colors.text.primary} />
                  </TouchableOpacity>
                  <View style={styles.dateDisplay}>
                    <Icon name="calendar-end" size={16} color={COLORS.status.error} />
                    <Text style={[styles.dateText, themed.textPrimary]}>{formatDate(endDate)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.dateBtn, themed.borderColor]}
                    onPress={() => adjustEndDate(1)}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={18} color={themed.colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Duration */}
              <View style={styles.durationRow}>
                <Icon name="clock-outline" size={16} color={COLORS.text.muted} />
                <Text style={styles.durationText}>
                  {daysBetween(startDate, endDate)} {daysBetween(startDate, endDate) === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>

            {/* Preview */}
            <View style={[styles.previewCard, themed.borderColor]}>
              <Icon name="information-outline" size={20} color={COLORS.status.info} />
              <Text style={styles.previewText}>
                All deliveries between{' '}
                <Text style={styles.previewBold}>{formatDate(startDate)}</Text> and{' '}
                <Text style={styles.previewBold}>{formatDate(endDate)}</Text> will be paused.
              </Text>
            </View>

            {/* Affected Subscriptions */}
            <View style={[styles.sectionCard, themed.card, themed.borderColor]}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Affected Subscriptions</Text>
              {subscriptionOrders.length === 0 ? (
                <View style={styles.emptySubscriptions}>
                  <Icon name="package-variant" size={32} color={COLORS.text.muted} />
                  <Text style={styles.emptySubText}>No active subscriptions</Text>
                </View>
              ) : (
                subscriptionOrders.map((order) => (
                  <View key={order.id} style={styles.subscriptionItem}>
                    <Icon name="autorenew" size={20} color={COLORS.primary} />
                    <View style={styles.subscriptionInfo}>
                      <Text style={[styles.subscriptionText, themed.textPrimary]}>
                        Order #{order.id}
                      </Text>
                      <Text style={[styles.subscriptionSub, themed.textMuted]}>
                        {order.subscription?.frequency} delivery
                        {order.subscription?.preferredTime ? ` at ${order.subscription.preferredTime}` : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Refund Type Selector */}
            <View style={[styles.sectionCard, themed.card, themed.borderColor]}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Refund Preference</Text>
              <Text style={[styles.refundDesc, themed.textSecondary]}>
                Choose how paused delivery costs should be handled:
              </Text>
              <TouchableOpacity
                style={[styles.refundOption, refundType === 'extend' && styles.refundOptionActive]}
                onPress={() => setRefundType('extend')}
                activeOpacity={0.7}
              >
                <View style={[styles.refundRadio, refundType === 'extend' && styles.refundRadioActive]}>
                  {refundType === 'extend' && <View style={styles.refundRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.refundOptionTitle, themed.textPrimary]}>Extend Subscription</Text>
                  <Text style={[styles.refundOptionSub, themed.textMuted]}>
                    Add paused days to the end of your subscription
                  </Text>
                </View>
                <Icon name="calendar-plus" size={22} color={refundType === 'extend' ? COLORS.primary : COLORS.text.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.refundOption, refundType === 'wallet' && styles.refundOptionActive]}
                onPress={() => setRefundType('wallet')}
                activeOpacity={0.7}
              >
                <View style={[styles.refundRadio, refundType === 'wallet' && styles.refundRadioActive]}>
                  {refundType === 'wallet' && <View style={styles.refundRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.refundOptionTitle, themed.textPrimary]}>Wallet Credit</Text>
                  <Text style={[styles.refundOptionSub, themed.textMuted]}>
                    Get refund for paused deliveries to your wallet
                  </Text>
                </View>
                <Icon name="wallet" size={22} color={refundType === 'wallet' ? COLORS.primary : COLORS.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Activate Button */}
            <TouchableOpacity activeOpacity={0.85} onPress={handleActivate} disabled={isProcessing}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.activateBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="palm-tree" size={20} color="#FFFFFF" />
                <Text style={styles.activateBtnText}>Activate Vacation Mode</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, themed.borderColor]}>
          <View style={styles.infoHeader}>
            <Icon name="lightbulb-outline" size={20} color={COLORS.status.info} />
            <Text style={[styles.infoTitle, themed.textPrimary]}>How it works</Text>
          </View>
          <Text style={[styles.infoText, themed.textSecondary]}>
            Vacation mode automatically pauses all your active subscriptions. Deliveries will resume
            automatically after your vacation ends.
          </Text>
        </View>

        {/* Past Vacations */}
        <View style={[styles.sectionCard, themed.card, themed.borderColor]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Past Vacations</Text>
          <View style={styles.comingSoon}>
            <Icon name="history" size={28} color={COLORS.text.muted} />
            <Text style={styles.comingSoonText}>Feature coming soon</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  content: { padding: SPACING.base, paddingBottom: 40 },

  // Status card
  statusCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: { flex: 1 },
  statusLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  statusValue: { fontSize: 16, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  // Active vacation card
  activeCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.base,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  activeCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.status.success,
  },
  activeDateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.base,
  },
  activeDateItem: { flex: 1 },
  activeDateLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text.muted, marginBottom: 2 },
  activeDateValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  activeBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.sm },
  daysRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.status.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  daysRemainingText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  refundInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  refundInfoText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },

  // Section card
  sectionCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: SPACING.md },

  // Date picker
  datePickerRow: { marginBottom: SPACING.base },
  dateLabel: { fontSize: 13, fontWeight: '600', marginBottom: SPACING.xs },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  dateText: { fontSize: 13, fontWeight: '600' },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.xs,
  },
  durationText: { fontSize: 12, color: COLORS.text.muted, fontWeight: '500' },

  // Preview
  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  previewText: { flex: 1, fontSize: 13, color: COLORS.text.secondary, lineHeight: 20 },
  previewBold: { fontWeight: '700', color: COLORS.text.primary },

  // Subscriptions
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  subscriptionInfo: { flex: 1 },
  subscriptionText: { fontSize: 14, fontWeight: '600' },
  subscriptionSub: { fontSize: 12, marginTop: 2 },
  emptySubscriptions: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 8,
  },
  emptySubText: { fontSize: 13, color: COLORS.text.muted },

  // Refund selector
  refundDesc: { fontSize: 12, lineHeight: 18, marginBottom: SPACING.md },
  refundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  refundOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  refundRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.text.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refundRadioActive: {
    borderColor: COLORS.primary,
  },
  refundRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  refundOptionTitle: { fontSize: 14, fontWeight: '700' },
  refundOptionSub: { fontSize: 11, marginTop: 2 },

  // Activate button
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.base,
    ...SHADOW.md,
  },
  activateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Deactivate button
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.base,
    backgroundColor: COLORS.status.error,
    ...SHADOW.md,
  },
  deactivateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Info card
  infoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoText: { fontSize: 13, lineHeight: 20 },

  // Coming soon
  comingSoon: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 8,
  },
  comingSoonText: { fontSize: 13, color: COLORS.text.muted, fontWeight: '500' },
});
