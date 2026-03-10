import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, TextInput, Modal } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';
import { useDiet } from '@/context/DietContext';

const FREQ_ICONS: Record<string, string> = {
  daily: 'calendar-today',
  weekly: 'calendar-week',
  monthly: 'calendar-month',
};

export default function SubscriptionManageScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, skipDelivery, unskipDelivery, getUpcomingDeliveries, updateSubscriptionStatus, resumeSubscription } = useOrders();
  const { vacationMode } = useDiet();

  const order = useMemo(() => orders.find(o => o.id === id), [orders, id]);
  const sub = order?.subscription;

  const [skipReason, setSkipReason] = useState('');
  const [skipModalDate, setSkipModalDate] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const upcoming = useMemo(() => {
    if (!order) return [];
    return getUpcomingDeliveries(order.id, 21);
  }, [order, getUpcomingDeliveries]);

  const skippedCount = useMemo(() =>
    (sub?.skippedDeliveries || []).filter(s => s.status === 'skipped').length
  , [sub]);

  const activeCount = useMemo(() =>
    upcoming.filter(d => !d.isSkipped).length
  , [upcoming]);

  const handleSkipPress = useCallback((date: string) => {
    setSkipModalDate(date);
    setSkipReason('');
    setShowSkipModal(true);
  }, []);

  const handleConfirmSkip = useCallback(async () => {
    if (!order || !skipModalDate) return;
    const result = await skipDelivery(order.id, skipModalDate, skipReason || undefined);
    setShowSkipModal(false);
    if (result.success) {
      Alert.alert('Delivery Skipped', result.message);
    } else {
      Alert.alert('Cannot Skip', result.message);
    }
  }, [order, skipModalDate, skipReason, skipDelivery]);

  const handleUnskip = useCallback(async (date: string) => {
    if (!order) return;
    Alert.alert('Restore Delivery', 'Resume delivery for this date?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: async () => { await unskipDelivery(order.id, date); } },
    ]);
  }, [order, unskipDelivery]);

  const handlePauseResume = useCallback(() => {
    if (!order || !sub) return;

    if (sub.status === 'paused' && sub.pausedFrom && sub.pausedUntil) {
      // Paused via vacation — prompt with refund options
      Alert.alert(
        'Resume Subscription',
        'This subscription was paused for vacation. How would you like to handle the paused deliveries?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Extend Subscription',
            onPress: async () => {
              const result = await resumeSubscription(order.id, 'extend');
              Alert.alert('Resumed', result.message);
            },
          },
          {
            text: 'Wallet Credit',
            onPress: async () => {
              const result = await resumeSubscription(order.id, 'wallet');
              Alert.alert('Resumed', result.message);
            },
          },
        ],
      );
      return;
    }

    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    const msg = newStatus === 'paused'
      ? 'Pause this subscription? No deliveries will be made until you resume. For extended pauses, use Vacation Mode.'
      : 'Resume this subscription? Deliveries will start from the next scheduled date.';
    Alert.alert(newStatus === 'paused' ? 'Pause Subscription' : 'Resume Subscription', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: newStatus === 'paused' ? 'Pause' : 'Resume', onPress: () => updateSubscriptionStatus(order.id, newStatus) },
    ]);
  }, [order, sub, updateSubscriptionStatus, resumeSubscription]);

  const handleCancel = useCallback(() => {
    if (!order) return;
    Alert.alert('Cancel Subscription', 'Are you sure? This cannot be undone. You will need to create a new subscription.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Subscription', style: 'destructive', onPress: () => {
        updateSubscriptionStatus(order.id, 'cancelled');
        router.back();
      }},
    ]);
  }, [order, updateSubscriptionStatus, router]);

  if (!order || !sub) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: 'center', marginTop: 60 }}>Subscription not found</Text>
      </SafeAreaView>
    );
  }

  const freqLabel = sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1);
  const scheduleDetail = sub.frequency === 'weekly'
    ? `Every ${sub.weeklyDay}`
    : sub.frequency === 'monthly'
    ? `On ${sub.monthlyDates?.join(', ')} of each month`
    : 'Every day';

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Manage Subscription</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Subscription Overview Card */}
        <View style={styles.overviewCard}>
          <LinearGradient colors={COLORS.gradient.primary} style={styles.overviewGrad}>
            <View style={styles.overviewTop}>
              <View style={styles.overviewIconWrap}>
                <Icon name={(FREQ_ICONS[sub.frequency] || 'calendar') as any} size={28} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewTitle}>{freqLabel} Subscription</Text>
                <Text style={styles.overviewSchedule}>{scheduleDetail}</Text>
              </View>
              <View style={[styles.statusPill, sub.status === 'active' && styles.statusActive, sub.status === 'paused' && styles.statusPaused, sub.status === 'cancelled' && styles.statusCancelled]}>
                <Text style={styles.statusPillText}>{sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}</Text>
              </View>
            </View>
            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{activeCount}</Text>
                <Text style={styles.overviewStatLabel}>Upcoming</Text>
              </View>
              <View style={styles.overviewStatDivider} />
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{skippedCount}</Text>
                <Text style={styles.overviewStatLabel}>Skipped</Text>
              </View>
              <View style={styles.overviewStatDivider} />
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{order.items.length}</Text>
                <Text style={styles.overviewStatLabel}>Items</Text>
              </View>
              <View style={styles.overviewStatDivider} />
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{'\u20B9'}{order.total}</Text>
                <Text style={styles.overviewStatLabel}>Per Delivery</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Pause Duration Banner */}
        {sub.status === 'paused' && sub.pausedFrom && sub.pausedUntil && (
          <View style={styles.pauseBanner}>
            <View style={styles.pauseBannerIcon}>
              <Icon name="pause-circle" size={24} color="#F57C00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pauseBannerTitle}>Subscription Paused</Text>
              <Text style={styles.pauseBannerDates}>
                {new Date(sub.pausedFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(sub.pausedUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
              {sub.pausedDays != null && (
                <Text style={styles.pauseBannerDays}>{sub.pausedDays} deliveries paused</Text>
              )}
            </View>
            <Text style={styles.pauseBannerAutoResume}>
              Auto-resumes{'\n'}{new Date(sub.pausedUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        )}

        {/* Weekly Plan Overview */}
        {sub.weeklyPlan && (
          <View style={[styles.sectionCard, themed.card]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>Weekly Plan</Text>
              <TouchableOpacity
                style={styles.editPlanBtn}
                onPress={() => router.push({ pathname: '/subscription-plan-editor', params: { id } } as any)}
              >
                <Icon name="pencil" size={14} color="#FFF" />
                <Text style={styles.editPlanBtnText}>Edit Plan</Text>
              </TouchableOpacity>
            </View>
            {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(day => {
              const plan = sub.weeklyPlan![day];
              if (!plan?.isActive || plan.items.length === 0) return null;
              return (
                <View key={day} style={styles.planDayRow}>
                  <View style={styles.planDayBadge}>
                    <Text style={styles.planDayBadgeText}>{day}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {plan.packName && (
                      <Text style={styles.planPackLabel}>{plan.packName}</Text>
                    )}
                    <Text style={styles.planItemsList} numberOfLines={2}>
                      {plan.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </Text>
                  </View>
                  <Text style={styles.planDayCount}>{plan.items.length} items</Text>
                </View>
              );
            })}
          </View>
        )}

        {!sub.weeklyPlan && (
          <TouchableOpacity
            style={[styles.setupPlanBtn, themed.card]}
            onPress={() => router.push({ pathname: '/subscription-plan-editor', params: { id } } as any)}
          >
            <Icon name="calendar-edit" size={22} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.setupPlanTitle, themed.textPrimary]}>Set Up Weekly Plan</Text>
              <Text style={styles.setupPlanDesc}>Choose different products for each day of the week</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.text.muted} />
          </TouchableOpacity>
        )}

        {/* Delivery Details */}
        <View style={[styles.detailCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Delivery Details</Text>
          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={16} color={COLORS.text.muted} />
            <Text style={styles.detailLabel}>Preferred Time</Text>
            <Text style={styles.detailValue}>{sub.preferredTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="calendar-start" size={16} color={COLORS.text.muted} />
            <Text style={styles.detailLabel}>Started</Text>
            <Text style={styles.detailValue}>{new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="timer-sand" size={16} color={COLORS.text.muted} />
            <Text style={styles.detailLabel}>Skip Cutoff</Text>
            <Text style={styles.detailValue}>{sub.cutoffHours ?? 10} hrs before delivery</Text>
          </View>
        </View>

        {/* Cutoff Info Banner */}
        <View style={styles.cutoffBanner}>
          <Icon name="information-outline" size={18} color="#1565C0" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cutoffTitle}>Skip Cutoff Rule</Text>
            <Text style={styles.cutoffDesc}>
              You must skip at least {sub.cutoffHours ?? 10} hours before the scheduled delivery time. For example, if delivery is at 7:00 AM, skip before {(() => {
                const h = sub.cutoffHours ?? 10;
                const timeMatch = sub.preferredTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                let dh = 7;
                if (timeMatch) {
                  dh = parseInt(timeMatch[1]);
                  if (timeMatch[3].toUpperCase() === 'PM' && dh !== 12) dh += 12;
                  if (timeMatch[3].toUpperCase() === 'AM' && dh === 12) dh = 0;
                }
                const cutoffDate = new Date();
                cutoffDate.setHours(dh - h, 0, 0, 0);
                if (cutoffDate.getHours() < 0) cutoffDate.setHours(cutoffDate.getHours() + 24);
                return cutoffDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
              })()} the previous day.
            </Text>
          </View>
        </View>

        {/* Upcoming Deliveries */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Upcoming Deliveries</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{upcoming.length} days</Text>
            </View>
          </View>

          {upcoming.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="calendar-blank" size={40} color={COLORS.text.muted} />
              <Text style={styles.emptyText}>
                {sub.status === 'paused' ? 'Subscription is paused. Resume to see upcoming deliveries.' : 'No upcoming deliveries found.'}
              </Text>
            </View>
          )}

          {upcoming.map((delivery, i) => (
            <View key={delivery.date} style={[styles.deliveryRow, i < upcoming.length - 1 && styles.deliveryRowBorder]}>
              <View style={[styles.deliveryDateCol, delivery.isSkipped && !delivery.isVacation && styles.deliveryDateColSkipped, delivery.isVacation && styles.deliveryDateColVacation]}>
                <Text style={[styles.deliveryDay, delivery.isSkipped && styles.deliveryDaySkipped]}>
                  {new Date(delivery.date).getDate()}
                </Text>
                <Text style={[styles.deliveryMonth, delivery.isSkipped && styles.deliveryMonthSkipped]}>
                  {new Date(delivery.date).toLocaleDateString('en-IN', { month: 'short' })}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.deliveryLabel, delivery.isSkipped && styles.deliveryLabelSkipped]}>
                  {delivery.dayLabel}
                </Text>
                <Text style={styles.deliveryTime}>{sub.preferredTime}</Text>
                {delivery.isSkipped && (
                  <View style={styles.skippedBadge}>
                    <Icon name={delivery.isVacation ? 'airplane' : 'close-circle'} size={12} color={delivery.isVacation ? '#607D8B' : COLORS.status.error} />
                    <Text style={[styles.skippedBadgeText, delivery.isVacation && { color: '#607D8B' }]}>
                      {delivery.isVacation ? 'Vacation' : 'Skipped'}
                    </Text>
                  </View>
                )}
                {!delivery.isSkipped && !delivery.canSkip && (
                  <View style={styles.lockedBadge}>
                    <Icon name="lock" size={12} color="#F57C00" />
                    <Text style={styles.lockedBadgeText}>Cutoff passed</Text>
                  </View>
                )}
              </View>
              {delivery.isVacation ? (
                <View style={styles.vacationDayBadge}>
                  <Icon name="airplane" size={14} color="#607D8B" />
                  <Text style={styles.vacationDayText}>Vacation</Text>
                </View>
              ) : delivery.isSkipped ? (
                <TouchableOpacity style={styles.restoreBtn} onPress={() => handleUnskip(delivery.date)}>
                  <Icon name="undo" size={16} color={COLORS.primary} />
                  <Text style={styles.restoreBtnText}>Restore</Text>
                </TouchableOpacity>
              ) : delivery.canSkip ? (
                <TouchableOpacity style={styles.skipBtn} onPress={() => handleSkipPress(delivery.date)}>
                  <Icon name="calendar-remove" size={16} color={COLORS.status.error} />
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.scheduledBadge}>
                  <Icon name="check-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.scheduledText}>Scheduled</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Skipped History */}
        {(sub.skippedDeliveries || []).length > 0 && (
          <View style={[styles.sectionCard, themed.card]}>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Skip History</Text>
            {(sub.skippedDeliveries || []).map((skip, i) => (
              <View key={skip.date + i} style={[styles.historyRow, i < (sub.skippedDeliveries?.length ?? 0) - 1 && styles.deliveryRowBorder]}>
                <View style={styles.historyIcon}>
                  <Icon name="calendar-remove" size={16} color={COLORS.status.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>
                    {new Date(skip.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  {skip.reason && <Text style={styles.historyReason}>{skip.reason}</Text>}
                  <Text style={styles.historyTime}>
                    Skipped on {new Date(skip.skippedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {new Date(skip.skippedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.historyStatusBadge, skip.status === 'too_late' && styles.historyTooLate]}>
                  <Text style={[styles.historyStatusText, skip.status === 'too_late' && styles.historyTooLateText]}>
                    {skip.status === 'skipped' ? 'Skipped' : 'Too Late'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {sub.status !== 'cancelled' && (
          <View style={styles.actionsSection}>
            <TouchableOpacity style={[styles.actionBtn, styles.pauseBtn]} onPress={handlePauseResume}>
              <Icon name={sub.status === 'active' ? 'pause-circle' : 'play-circle'} size={20} color="#F57C00" />
              <Text style={styles.pauseBtnText}>{sub.status === 'active' ? 'Pause Subscription' : 'Resume Subscription'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel}>
              <Icon name="close-circle" size={20} color={COLORS.status.error} />
              <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Savings Dashboard */}
        <View style={[styles.savingsCard, themed.card]}>
          <Text style={[styles.savingsTitle, themed.textPrimary]}>Subscription Savings</Text>
          <View style={styles.savingsGrid}>
            <View style={styles.savingsItem}>
              <Icon name="truck-delivery" size={22} color={COLORS.green} />
              <Text style={styles.savingsValue}>{'\u20B9'}{(upcoming.filter(d => !d.isSkipped).length * 5)}</Text>
              <Text style={styles.savingsLabel}>Delivery Saved</Text>
            </View>
            <View style={styles.savingsDivider} />
            <View style={styles.savingsItem}>
              <Icon name="calendar-check" size={22} color="#1565C0" />
              <Text style={styles.savingsValue}>{upcoming.filter(d => !d.isSkipped).length}</Text>
              <Text style={styles.savingsLabel}>Deliveries</Text>
            </View>
            <View style={styles.savingsDivider} />
            <View style={styles.savingsItem}>
              <Icon name="calendar-remove" size={22} color="#E65100" />
              <Text style={styles.savingsValue}>{upcoming.filter(d => d.isSkipped).length}</Text>
              <Text style={styles.savingsLabel}>Skipped</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.calendarLinkBtn, themed.card]} onPress={() => router.push({ pathname: '/subscription-calendar', params: { orderId: id } } as any)}>
          <Icon name="calendar-month" size={22} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.calendarLinkTitle, themed.textPrimary]}>Delivery Calendar</Text>
            <Text style={styles.calendarLinkDesc}>View monthly delivery schedule</Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.text.muted} />
        </TouchableOpacity>

        {vacationMode?.isActive && (
          <View style={styles.vacationBanner}>
            <Icon name="airplane" size={20} color="#FFF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.vacationTitle}>Vacation Mode Active</Text>
              <Text style={styles.vacationDates}>
                {new Date(vacationMode.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(vacationMode.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {vacationMode.pausedDeliveryCount ? ` (${vacationMode.pausedDeliveryCount} deliveries)` : ''}
              </Text>
              {vacationMode.refundType && (
                <Text style={styles.vacationRefund}>
                  {vacationMode.refundType === 'wallet' ? `₹${vacationMode.estimatedRefund || 0} wallet credit` : `${vacationMode.pausedDeliveryCount || 0} days extension`} on resume
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/vacation-mode' as any)}>
              <Text style={styles.vacationManage}>Manage</Text>
            </TouchableOpacity>
          </View>
        )}

        {!vacationMode?.isActive && (
          <TouchableOpacity style={[styles.vacationLinkBtn, themed.card]} onPress={() => router.push('/vacation-mode' as any)}>
            <Icon name="airplane" size={20} color="#607D8B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.vacationLinkTitle, themed.textPrimary]}>Going on Vacation?</Text>
              <Text style={styles.vacationLinkDesc}>Pause all deliveries while you're away</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.text.muted} />
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Skip Reason Modal */}
      <Modal visible={showSkipModal} transparent animationType="fade" onRequestClose={() => setShowSkipModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themed.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.textPrimary]}>Skip Delivery</Text>
              <TouchableOpacity onPress={() => setShowSkipModal(false)}>
                <Icon name="close" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDateText}>
              {skipModalDate && new Date(skipModalDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.modalSubtext}>Are you sure you want to skip this delivery?</Text>
            <TextInput
              style={[styles.reasonInput, themed.inputBg]}
              placeholder="Reason for skipping (optional)"
              placeholderTextColor={COLORS.text.muted}
              value={skipReason}
              onChangeText={setSkipReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSkipModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmSkip}>
                <Icon name="calendar-remove" size={18} color="#FFF" />
                <Text style={styles.modalConfirmText}>Skip Delivery</Text>
              </TouchableOpacity>
            </View>
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
  scroll: { padding: SPACING.base, paddingBottom: 20 },
  // Overview
  overviewCard: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md },
  overviewGrad: { padding: SPACING.lg },
  overviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.lg },
  overviewIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  overviewTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  overviewSchedule: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statusPill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusPaused: { backgroundColor: '#FFF8E1' },
  statusCancelled: { backgroundColor: '#FFEBEE' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
  overviewStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, padding: SPACING.md },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewStatValue: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  overviewStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  overviewStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  // Pause banner
  pauseBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF8E1', borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: '#FFE082',
  },
  pauseBannerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' },
  pauseBannerTitle: { fontSize: 14, fontWeight: '700', color: '#F57C00' },
  pauseBannerDates: { fontSize: 12, color: '#E65100', marginTop: 2 },
  pauseBannerDays: { fontSize: 11, color: '#BF360C', marginTop: 1 },
  pauseBannerAutoResume: { fontSize: 10, fontWeight: '600', color: '#F57C00', textAlign: 'right' },
  // Detail card
  detailCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { flex: 1, fontSize: 13, color: COLORS.text.secondary },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  // Cutoff banner
  cutoffBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#E3F2FD', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  cutoffTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 2 },
  cutoffDesc: { fontSize: 11, color: '#1565C0', lineHeight: 16 },
  // Section
  sectionCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.sm },
  countBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  countBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { fontSize: 13, color: COLORS.text.muted, textAlign: 'center', marginTop: SPACING.sm },
  // Delivery rows
  deliveryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  deliveryRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deliveryDateCol: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  deliveryDateColSkipped: { backgroundColor: '#FFEBEE' },
  deliveryDateColVacation: { backgroundColor: '#ECEFF1' },
  vacationDayBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECEFF1', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  vacationDayText: { fontSize: 11, fontWeight: '600', color: '#607D8B' },
  deliveryDay: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  deliveryDaySkipped: { color: COLORS.status.error },
  deliveryMonth: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  deliveryMonthSkipped: { color: COLORS.status.error },
  deliveryLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  deliveryLabelSkipped: { color: COLORS.text.muted, textDecorationLine: 'line-through' },
  deliveryTime: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  skippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  skippedBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.status.error },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  lockedBadgeText: { fontSize: 10, fontWeight: '700', color: '#F57C00' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: COLORS.status.error, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  skipBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.status.error },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  restoreBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduledText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  // History
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  historyIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  historyDate: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  historyReason: { fontSize: 11, color: COLORS.text.secondary, marginTop: 1 },
  historyTime: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  historyStatusBadge: { backgroundColor: '#FFEBEE', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  historyTooLate: { backgroundColor: '#FFF8E1' },
  historyStatusText: { fontSize: 10, fontWeight: '700', color: COLORS.status.error },
  historyTooLateText: { color: '#F57C00' },
  // Actions
  actionsSection: { gap: 10, marginTop: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.full, borderWidth: 1.5 },
  pauseBtn: { borderColor: '#F57C00', backgroundColor: '#FFF8E1' },
  pauseBtnText: { fontSize: 14, fontWeight: '700', color: '#F57C00' },
  cancelBtn: { borderColor: COLORS.status.error, backgroundColor: '#FFF' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.status.error },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.floating },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  modalDateText: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  modalSubtext: { fontSize: 13, color: COLORS.text.secondary, marginBottom: SPACING.md },
  reasonInput: { backgroundColor: '#F7F7F7', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 13, color: COLORS.text.primary, borderWidth: 1, borderColor: COLORS.border, minHeight: 60, textAlignVertical: 'top', marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary },
  modalConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.status.error },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  // Savings Dashboard
  savingsCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md, ...SHADOW.sm },
  savingsTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  savingsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  savingsItem: { alignItems: 'center', gap: 4 },
  savingsValue: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  savingsLabel: { fontSize: 10, color: COLORS.text.muted },
  savingsDivider: { width: 1, backgroundColor: COLORS.border },
  // Calendar Link
  calendarLinkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md, ...SHADOW.sm },
  calendarLinkTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  calendarLinkDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  // Vacation
  vacationBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#607D8B', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md },
  vacationTitle: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  vacationDates: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  vacationRefund: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  vacationManage: { fontSize: 12, fontWeight: '700', color: '#FFF', textDecorationLine: 'underline' },
  vacationLinkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md, ...SHADOW.sm },
  vacationLinkTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  vacationLinkDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  // Weekly plan overview
  editPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  editPlanBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  planDayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  planDayBadge: { width: 36, height: 24, borderRadius: 6, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  planDayBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  planPackLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  planItemsList: { fontSize: 11, color: COLORS.text.secondary, lineHeight: 16, marginTop: 1 },
  planDayCount: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted },
  setupPlanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  setupPlanTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  setupPlanDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
});
