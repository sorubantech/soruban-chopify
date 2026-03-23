import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  TextInput, Alert, Share, Linking, Modal,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';

const GROUP_STORAGE_KEY = 'group_subscription_data';

/* ─── Types ─── */
interface GroupMember {
  id: string;
  name: string;
  phone: string;
  status: 'invited' | 'joined' | 'subscribed';
  plan?: string;
  share?: number;
}

/* ─── Demo Data ─── */
const DEMO_MEMBERS: GroupMember[] = [
  { id: 'm1', name: 'Priya', phone: '9876543210', status: 'subscribed', plan: 'Budget Daily Pack', share: 75 },
  { id: 'm2', name: 'Kavitha', phone: '9876543211', status: 'subscribed', plan: 'Glow & Beauty Pack', share: 110 },
  { id: 'm3', name: 'Meena', phone: '9876543212', status: 'joined', plan: undefined, share: 0 },
];

const PLAN_OPTIONS = [
  { id: 'budget', name: 'Budget Daily Pack', price: 75, icon: 'cash', color: '#2E7D32' },
  { id: 'beauty', name: 'Glow & Beauty Pack', price: 110, icon: 'face-woman-shimmer', color: '#AD1457' },
  { id: 'period', name: 'Period Care Plan', price: 100, icon: 'heart-circle', color: '#E91E63' },
  { id: 'protein', name: 'Protein Power Plan', price: 150, icon: 'dumbbell', color: '#E53935' },
  { id: 'snack', name: 'Student Snack Pack', price: 90, icon: 'food-apple', color: '#1565C0' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  invited: { label: 'Invited', bg: '#FFF3E0', color: '#F57C00', icon: 'send' },
  joined: { label: 'Joined', bg: '#E3F2FD', color: '#1565C0', icon: 'account-check' },
  subscribed: { label: 'Subscribed', bg: '#E8F5E9', color: '#2E7D32', icon: 'check-circle' },
};

const AVATAR_COLORS = ['#E91E63', '#FF9800', '#9C27B0', '#009688', '#3F51B5', '#FF5722', '#00BCD4', '#8BC34A'];

export default function GroupSubscriptionScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { user } = useAuth();
  const { orders, getUpcomingDeliveries } = useOrders();

  const groupSubscriptions = useMemo(() =>
    orders.filter(o => o.subscription && o.subscription.groupCode && (o.subscription.status === 'active' || o.subscription.status === 'paused')),
  [orders]);

  const [groupCreated, setGroupCreated] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAddress, setGroupAddress] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [createGroupName, setCreateGroupName] = useState('');
  const [createGroupAddress, setCreateGroupAddress] = useState('');
  const [adminPlan, setAdminPlan] = useState<string | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [subscriptionPaused, setSubscriptionPaused] = useState(false);

  const groupCode = 'GRP' + (user?.phone?.slice(-4) || '1234');
  const adminPlanObj = PLAN_OPTIONS.find(p => p.id === adminPlan);
  const allMembers = useMemo(() => [
    { id: 'admin', name: user?.name || 'You', phone: user?.phone || '', status: (adminPlan ? 'subscribed' : 'joined') as 'subscribed' | 'joined' | 'invited', plan: adminPlanObj?.name, share: adminPlanObj?.price || 0 },
    ...members,
  ], [members, user, adminPlan, adminPlanObj]);
  const subscribedCount = allMembers.filter(m => m.status === 'subscribed').length;
  const totalMembers = allMembers.length;
  const discountUnlocked = totalMembers >= 5;
  const discountPct = discountUnlocked ? 10 : 0;

  const totalGroupCost = useMemo(() => {
    return allMembers.reduce((sum, m) => sum + (m.share || 0), 0);
  }, [allMembers]);

  const deliveryFee = 30;
  const splitDelivery = Math.ceil(deliveryFee / totalMembers);
  const perPersonSaving = discountUnlocked ? Math.round(totalGroupCost / totalMembers * 0.1) : 0;

  /* ─── Persist group data ─── */
  const saveGroup = useCallback(async (data: { groupCreated: boolean; groupName: string; groupAddress: string; members: GroupMember[]; adminPlan: string | null; subscriptionPaused: boolean }) => {
    try { await AsyncStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, []);

  // Load saved group on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(GROUP_STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.groupCreated) {
            setGroupCreated(true);
            setGroupName(data.groupName || '');
            setGroupAddress(data.groupAddress || '');
            setMembers(data.members || []);
            setAdminPlan(data.adminPlan || null);
            setSubscriptionPaused(data.subscriptionPaused || false);
          }
        }
      } catch {}
    })();
  }, []);

  // Auto-save whenever group data changes
  useEffect(() => {
    if (groupCreated) {
      saveGroup({ groupCreated, groupName, groupAddress, members, adminPlan, subscriptionPaused });
    }
  }, [groupCreated, groupName, groupAddress, members, adminPlan, subscriptionPaused, saveGroup]);

  const handleAddMember = () => {
    if (!newName.trim()) { Alert.alert('Name Required'); return; }
    if (newPhone.trim().length < 10) { Alert.alert('Valid Phone Required'); return; }
    if (totalMembers >= 8) { Alert.alert('Group Full', 'Maximum 8 members per group.'); return; }
    setMembers(prev => [...prev, {
      id: `m_${Date.now()}`, name: newName.trim(), phone: newPhone.trim(), status: 'invited', share: 0,
    }]);
    setNewName('');
    setNewPhone('');
    setShowAddModal(false);
    Alert.alert('Invited!', `${newName.trim()} has been invited to the group.`);
  };

  const handleRemoveMember = (id: string) => {
    Alert.alert('Remove Member', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMembers(prev => prev.filter(m => m.id !== id)) },
    ]);
  };

  const handleCreateGroup = () => {
    if (!createGroupName.trim()) { Alert.alert('Group Name Required', 'Please enter a name for your group.'); return; }
    if (!createGroupAddress.trim()) { Alert.alert('Address Required', 'Please enter a shared delivery address.'); return; }
    setGroupName(createGroupName.trim());
    setGroupAddress(createGroupAddress.trim());
    setMembers([]);
    setGroupCreated(true);
  };

  const handleShareGroup = async () => {
    const msg = `Join my Soruban Group Subscription!\n\nGroup: ${groupName}\nCode: ${groupCode}\nAddress: ${groupAddress}\n\n${totalMembers}/5 members joined. When 5+ subscribe, everyone gets 10% OFF + shared delivery!\n\nJoin now & save together!`;
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else await Share.share({ message: msg });
    } catch {
      await Share.share({ message: msg });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1565C0', '#1976D2']} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Group Subscription</Text>
              <Text style={styles.headerSub}>{groupName} · {totalMembers} members</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEditGroup(true)} style={styles.backBtn}>
              <Icon name="pencil" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ━━━ Create Group Flow ━━━ */}
      {!groupCreated && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hero Section */}
          <View style={styles.createHero}>
            <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.createHeroBg}>
              <Icon name="account-group" size={48} color="#1565C0" />
              <Text style={[styles.createHeroTitle, themed.textPrimary]}>Create a Group</Text>
              <Text style={styles.createHeroDesc}>
                Subscribe together with friends, family, or hostelmates. Share delivery fees and unlock group discounts!
              </Text>
            </LinearGradient>
          </View>

          {/* Benefits Preview */}
          <View style={[styles.createBenefitsCard, themed.card]}>
            <Text style={[styles.createBenefitsTitle, themed.textPrimary]}>Why Group Subscription?</Text>
            {[
              { icon: 'percent-outline', color: '#E53935', bg: '#FFEBEE', text: 'Get 10% OFF when 5+ members subscribe' },
              { icon: 'truck-fast-outline', color: '#1565C0', bg: '#E3F2FD', text: 'Split delivery fee among all members' },
              { icon: 'calendar-check-outline', color: '#2E7D32', bg: '#E8F5E9', text: 'Each member picks their own plan' },
              { icon: 'whatsapp', color: '#25D366', bg: '#E8F5E9', text: 'Invite friends easily via WhatsApp' },
            ].map((item, i) => (
              <View key={i} style={styles.createBenefitRow}>
                <View style={[styles.createBenefitIcon, { backgroundColor: item.bg }]}>
                  <Icon name={item.icon as any} size={16} color={item.color} />
                </View>
                <Text style={[styles.createBenefitText, themed.textPrimary]}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Create Form */}
          <View style={[styles.createFormCard, themed.card]}>
            <Text style={[styles.createFormTitle, themed.textPrimary]}>Group Details</Text>

            <Text style={styles.createFormLabel}>Group Name</Text>
            <TextInput
              style={[styles.modalInput, themed.inputBg]}
              placeholder="e.g. Room 204 Gang, Office Lunch Club"
              placeholderTextColor={COLORS.text.muted}
              value={createGroupName}
              onChangeText={setCreateGroupName}
            />

            <Text style={styles.createFormLabel}>Shared Delivery Address</Text>
            <TextInput
              style={[styles.modalInput, themed.inputBg, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. Hostel Block B, Room 204, Anna University"
              placeholderTextColor={COLORS.text.muted}
              value={createGroupAddress}
              onChangeText={setCreateGroupAddress}
              multiline
            />

            <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup} activeOpacity={0.85}>
              <LinearGradient colors={['#1565C0', '#1976D2']} style={styles.createGroupBtnGrad}>
                <Icon name="account-multiple-plus" size={20} color="#FFF" />
                <Text style={styles.createGroupBtnText}>Create Group</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* How it works */}
          <View style={[styles.createHowCard, themed.card]}>
            <Text style={[styles.createFormTitle, themed.textPrimary]}>How It Works</Text>
            {[
              { step: '1', title: 'Create your group', desc: 'Name it & add your delivery address' },
              { step: '2', title: 'Invite members', desc: 'Share your group code via WhatsApp' },
              { step: '3', title: 'Everyone subscribes', desc: 'Each member picks their preferred plan' },
              { step: '4', title: 'Save together', desc: '10% OFF when 5+ members join!' },
            ].map((item, i) => (
              <View key={i} style={styles.createStepRow}>
                <View style={styles.createStepCircle}>
                  <Text style={styles.createStepNum}>{item.step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.createStepTitle, themed.textPrimary]}>{item.title}</Text>
                  <Text style={styles.createStepDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ━━━ Group Management (after creation) ━━━ */}
      {groupCreated && (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Group Info Card */}
        <View style={[styles.groupInfoCard, themed.card]}>
          <View style={styles.groupCodeRow}>
            <View>
              <Text style={styles.groupCodeLabel}>Group Code</Text>
              <Text style={[styles.groupCodeText, themed.textPrimary]}>{groupCode}</Text>
            </View>
            <TouchableOpacity style={styles.shareCodeBtn} onPress={handleShareGroup}>
              <Icon name="whatsapp" size={18} color="#FFF" />
              <Text style={styles.shareCodeBtnText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Shared Address */}
          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <Icon name="map-marker" size={16} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Shared Delivery Address</Text>
              <Text style={[styles.addressText, themed.textPrimary]}>{groupAddress}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEditGroup(true)}>
              <Icon name="pencil-outline" size={16} color={COLORS.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Discount Progress */}
          <View style={styles.discountSection}>
            <View style={styles.discountHeader}>
              <Text style={styles.discountTitle}>{discountUnlocked ? '10% Group Discount Active!' : `${5 - totalMembers > 0 ? 5 - totalMembers : 0} more to unlock 10% discount`}</Text>
              <Text style={styles.discountCount}>{totalMembers}/5</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min((totalMembers / 5) * 100, 100)}%`, backgroundColor: discountUnlocked ? '#43A047' : '#1565C0' }]} />
            </View>
            {discountUnlocked && (
              <View style={styles.discountBadge}>
                <Icon name="party-popper" size={14} color="#FF6F00" />
                <Text style={styles.discountBadgeText}>Everyone saves {perPersonSaving > 0 ? `~\u20B9${perPersonSaving}` : '10%'} per delivery!</Text>
              </View>
            )}
          </View>
        </View>

        {/* ━━━ Your Subscription Status ━━━ */}
        {/* <View style={[styles.yourSubCard, themed.card]}> */}
          {/* <View style={styles.yourSubHeader}>
            <View style={[styles.yourSubIconWrap, { backgroundColor: adminPlanObj ? adminPlanObj.color + '20' : '#E3F2FD' }]}>
              <Icon name={adminPlanObj ? adminPlanObj.icon as any : 'account-circle-outline'} size={20} color={adminPlanObj?.color || '#1565C0'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.yourSubTitle, themed.textPrimary]}>Your Subscription</Text>
              {adminPlanObj ? (
                <Text style={styles.yourSubPlan}>{adminPlanObj.name} · {'\u20B9'}{adminPlanObj.price}/day {subscriptionPaused ? '(Paused)' : ''}</Text>
              ) : (
                <Text style={styles.yourSubPlan}>No plan selected yet</Text>
              )}
            </View>
            {adminPlanObj && (
              <View style={[styles.statusBadge, { backgroundColor: subscriptionPaused ? '#FFF3E0' : '#E8F5E9' }]}>
                <Icon name={subscriptionPaused ? 'pause-circle' : 'check-circle'} size={10} color={subscriptionPaused ? '#F57C00' : '#2E7D32'} />
                <Text style={[styles.statusBadgeText, { color: subscriptionPaused ? '#F57C00' : '#2E7D32' }]}>{subscriptionPaused ? 'Paused' : 'Active'}</Text>
              </View>
            )}
          </View> */}

          {/* <View style={styles.yourSubActions}>
            {!adminPlanObj ? (
              <TouchableOpacity style={styles.yourSubActionBtn} onPress={() => setShowPlanPicker(true)} activeOpacity={0.85}>
                <LinearGradient colors={['#1565C0', '#1976D2']} style={styles.yourSubActionBtnGrad}>
                  <Icon name="plus-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.yourSubActionBtnText}>Choose a Plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.yourSubManageBtn, { borderColor: '#1565C0' }]}
                  onPress={() => setShowPlanPicker(true)}
                  activeOpacity={0.8}
                >
                  <Icon name="swap-horizontal" size={14} color="#1565C0" />
                  <Text style={[styles.yourSubManageBtnText, { color: '#1565C0' }]}>Change Plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.yourSubManageBtn, { borderColor: subscriptionPaused ? '#2E7D32' : '#F57C00' }]}
                  onPress={() => {
                    setSubscriptionPaused(!subscriptionPaused);
                    Alert.alert(subscriptionPaused ? 'Resumed' : 'Paused', subscriptionPaused ? 'Your subscription is now active.' : 'Your subscription is paused. You can resume anytime.');
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name={subscriptionPaused ? 'play-circle-outline' : 'pause-circle-outline'} size={14} color={subscriptionPaused ? '#2E7D32' : '#F57C00'} />
                  <Text style={[styles.yourSubManageBtnText, { color: subscriptionPaused ? '#2E7D32' : '#F57C00' }]}>{subscriptionPaused ? 'Resume' : 'Pause'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.yourSubManageBtn, { borderColor: '#E53935' }]}
                  onPress={() => {
                    Alert.alert('Cancel Subscription', 'Are you sure you want to cancel your plan?', [
                      { text: 'No', style: 'cancel' },
                      { text: 'Yes, Cancel', style: 'destructive', onPress: () => { setAdminPlan(null); setSubscriptionPaused(false); } },
                    ]);
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name="close-circle-outline" size={14} color="#E53935" />
                  <Text style={[styles.yourSubManageBtnText, { color: '#E53935' }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View> */}
        {/* </View> */}

        {/* Members */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Members ({totalMembers})</Text>
          <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddModal(true)}>
            <Icon name="account-plus" size={16} color="#FFF" />
            <Text style={styles.addMemberBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {allMembers.map((member, idx) => {
          const cfg = STATUS_CONFIG[member.status];
          const isAdmin = member.id === 'admin';
          return (
            <View key={member.id} style={[styles.memberCard, themed.card]}>
              <View style={[styles.memberAvatar, { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                <Text style={styles.memberAvatarText}>{member.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.memberName, themed.textPrimary]}>{member.name}</Text>
                  {isAdmin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
                </View>
                {member.plan ? (
                  <Text style={styles.memberPlan}>{member.plan} · {'\u20B9'}{member.share}/day</Text>
                ) : (
                  <Text style={styles.memberPlan}>No plan selected yet</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Icon name={cfg.icon as any} size={10} color={cfg.color} />
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {!isAdmin && (
                  <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                    <Icon name="close-circle-outline" size={18} color={COLORS.text.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* My Group Subscriptions — with upcoming deliveries */}
        {groupSubscriptions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, themed.textPrimary]}>My Group Subscriptions</Text>
              <View style={styles.groupSubCountBadge}>
                <Text style={styles.groupSubCountText}>{groupSubscriptions.length}</Text>
              </View>
            </View>

            {groupSubscriptions.map(order => {
              const sub = order.subscription!;
              const freqLabel = sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1);
              const upcoming = getUpcomingDeliveries(order.id, 7);
              const nextDelivery = upcoming.find(d => !d.isSkipped);
              const skippedCount = upcoming.filter(d => d.isSkipped).length;
              const scheduleDetail = sub.frequency === 'weekly'
                ? `Every ${sub.weeklyDay || 'weekday'}`
                : sub.frequency === 'monthly'
                ? `On ${sub.monthlyDates?.join(', ') || 'weekdays'}`
                : 'Every day';

              return (
                <View key={order.id} style={[styles.groupSubCard, themed.card]}>
                  {/* Card Header */}
                  <View style={styles.groupSubCardHeader}>
                    <View style={[styles.groupSubIcon, { backgroundColor: sub.frequency === 'weekly' ? '#E8F5E9' : sub.frequency === 'monthly' ? '#E3F2FD' : '#FFF3E0' }]}>
                      <Icon
                        name={sub.frequency === 'daily' ? 'calendar-today' : sub.frequency === 'weekly' ? 'calendar-week' : 'calendar-month'}
                        size={22}
                        color={sub.frequency === 'weekly' ? '#2E7D32' : sub.frequency === 'monthly' ? '#1565C0' : '#F57C00'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.groupSubTitle, themed.textPrimary]}>Group {freqLabel} Subscription</Text>
                        {sub.status === 'paused' ? (
                          <View style={styles.groupSubPausedBadge}><Text style={styles.groupSubPausedText}>Paused</Text></View>
                        ) : (
                          <View style={styles.groupSubActiveBadge}><Text style={styles.groupSubActiveText}>Active</Text></View>
                        )}
                      </View>
                      <Text style={styles.groupSubSchedule}>{scheduleDetail} at {sub.preferredTime}</Text>
                      <Text style={styles.groupSubItems}>{order.items.length} items · {'\u20B9'}{order.total}/delivery</Text>
                    </View>
                  </View>

                  {/* Next Delivery */}
                  <View style={styles.groupSubNextRow}>
                    {nextDelivery ? (
                      <View style={styles.groupSubNextInfo}>
                        <Icon name="truck-delivery-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.groupSubNextText}>
                          Next: {nextDelivery.dayLabel}, {new Date(nextDelivery.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.groupSubNextInfo}>
                        <Icon name="calendar-blank" size={14} color={COLORS.text.muted} />
                        <Text style={[styles.groupSubNextText, { color: COLORS.text.muted }]}>No upcoming deliveries</Text>
                      </View>
                    )}
                    <View style={styles.groupSubStats}>
                      <Text style={styles.groupSubStat}>{upcoming.filter(d => !d.isSkipped).length} upcoming</Text>
                      {skippedCount > 0 && <Text style={styles.groupSubStatSkipped}>{skippedCount} skipped</Text>}
                    </View>
                  </View>

                  {/* Upcoming Deliveries List */}
                  {upcoming.length > 0 && (
                    <View style={styles.groupSubUpcoming}>
                      <Text style={[styles.groupSubUpcomingTitle, themed.textPrimary]}>Upcoming Deliveries</Text>
                      {upcoming.slice(0, 5).map((delivery, i) => (
                        <View key={delivery.date} style={[styles.groupSubDeliveryRow, i < Math.min(upcoming.length, 5) - 1 && styles.groupSubDeliveryBorder]}>
                          <View style={[styles.groupSubDeliveryDate, delivery.isSkipped && styles.groupSubDeliveryDateSkipped]}>
                            <Text style={[styles.groupSubDeliveryDay, delivery.isSkipped && { color: COLORS.text.muted }]}>
                              {new Date(delivery.date).getDate()}
                            </Text>
                            <Text style={[styles.groupSubDeliveryMonth, delivery.isSkipped && { color: COLORS.text.muted }]}>
                              {new Date(delivery.date).toLocaleDateString('en-IN', { month: 'short' })}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.groupSubDeliveryLabel, delivery.isSkipped && { color: COLORS.text.muted, textDecorationLine: 'line-through' }]}>
                              {delivery.dayLabel}
                            </Text>
                            <Text style={styles.groupSubDeliveryTime}>{sub.preferredTime}</Text>
                          </View>
                          {delivery.isSkipped ? (
                            <View style={styles.groupSubSkippedBadge}>
                              <Icon name={delivery.isVacation ? 'airplane' : 'close-circle'} size={12} color={delivery.isVacation ? '#607D8B' : COLORS.status.error} />
                              <Text style={[styles.groupSubSkippedText, delivery.isVacation && { color: '#607D8B' }]}>
                                {delivery.isVacation ? 'Vacation' : 'Skipped'}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.groupSubScheduledBadge}>
                              <Icon name="check-circle" size={12} color={COLORS.primary} />
                              <Text style={styles.groupSubScheduledText}>Scheduled</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Quick Actions */}
                  <View style={styles.groupSubActions}>
                    <TouchableOpacity
                      style={styles.groupSubManageBtn}
                      onPress={() => router.push({ pathname: '/subscription-manage' as any, params: { id: order.id } })}
                    >
                      <Icon name="cog-outline" size={14} color="#FFF" />
                      <Text style={styles.groupSubManageBtnText}>Manage</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.groupSubCalendarBtn}
                      onPress={() => router.push({ pathname: '/subscription-calendar' as any, params: { orderId: order.id } })}
                    >
                      <Icon name="calendar-month" size={14} color={COLORS.primary} />
                      <Text style={styles.groupSubCalendarBtnText}>Calendar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.groupSubCalendarBtn}
                      onPress={() => router.push({ pathname: '/subscription-plan-editor' as any, params: { id: order.id } })}
                    >
                      <Icon name="pencil-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.groupSubCalendarBtnText}>Edit Plan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Split Payment Summary */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Payment Split</Text>
          <TouchableOpacity onPress={() => setShowSplitModal(true)}>
            <Text style={styles.viewDetailLink}>View Details</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.splitCard, themed.card]}>
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>Total group cost/day</Text>
            <Text style={[styles.splitValue, themed.textPrimary]}>{'\u20B9'}{totalGroupCost}</Text>
          </View>
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>Delivery fee (shared)</Text>
            <Text style={[styles.splitValue, themed.textPrimary]}>{'\u20B9'}{deliveryFee} ({'\u20B9'}{splitDelivery}/person)</Text>
          </View>
          {discountUnlocked && (
            <View style={styles.splitRow}>
              <Text style={[styles.splitLabel, { color: '#2E7D32' }]}>Group discount (10%)</Text>
              <Text style={[styles.splitValue, { color: '#2E7D32' }]}>-{'\u20B9'}{Math.round(totalGroupCost * 0.1)}</Text>
            </View>
          )}
          <View style={[styles.splitRow, styles.splitTotal]}>
            <Text style={[styles.splitLabel, { fontWeight: '800' }]}>Your daily cost</Text>
            <Text style={[styles.splitValue, { fontSize: 18, color: COLORS.primary }]}>
              {'\u20B9'}{Math.round((75 + splitDelivery) * (1 - discountPct / 100))}
            </Text>
          </View>
          <View style={styles.savingsRow}>
            <Icon name="piggy-bank" size={14} color="#FF6F00" />
            <Text style={styles.savingsText}>
              You save {'\u20B9'}{deliveryFee - splitDelivery + perPersonSaving}/day compared to ordering alone!
            </Text>
          </View>
        </View>

        {/* Benefits */}
        <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: SPACING.md }]}>Group Benefits</Text>
        <View style={[styles.benefitsCard, themed.card]}>
          {[
            { icon: 'percent', text: '10% off when 5+ members subscribe', color: '#E53935' },
            { icon: 'truck-delivery', text: 'Single delivery — split fee among all', color: '#F57C00' },
            { icon: 'map-marker-check', text: 'Same address — no confusion', color: '#1565C0' },
            { icon: 'food-variant', text: 'Each member picks their own plan', color: '#2E7D32' },
            { icon: 'calendar-sync', text: 'Flexible — pause or change plan anytime', color: '#7B1FA2' },
            { icon: 'account-group', text: 'Up to 8 members per group', color: '#00897B' },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: b.color + '15' }]}>
                <Icon name={b.icon as any} size={16} color={b.color} />
              </View>
              <Text style={[styles.benefitText, themed.textPrimary]}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.subscribeCta}
          onPress={() => {
            if (adminPlanObj) {
              // Plan already selected — go to subscription setup for delivery schedule
              router.push({ pathname: '/subscription-setup', params: { planId: adminPlan, groupCode, groupName } } as any);
            } else {
              // No plan yet — open plan picker first
              setShowPlanPicker(true);
            }
          }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#1565C0', '#1976D2']} style={styles.subscribeCtaGrad}>
            <Icon name={adminPlanObj ? 'calendar-clock' : 'cart-plus'} size={20} color="#FFF" />
            <Text style={styles.subscribeCtaText}>
              {adminPlanObj ? 'Set Up Delivery Schedule' : 'Choose Your Plan & Subscribe'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.whatsappCta} onPress={handleShareGroup} activeOpacity={0.85}>
          <Icon name="whatsapp" size={20} color="#25D366" />
          <Text style={styles.whatsappCtaText}>Share Group Invite on WhatsApp</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
      )}

      {/* ━━━ Add Member Modal ━━━ */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, themed.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.textPrimary]}>Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, themed.inputBg]}
              placeholder="Friend's name"
              placeholderTextColor={COLORS.text.muted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[styles.modalInput, themed.inputBg]}
              placeholder="Phone number"
              placeholderTextColor={COLORS.text.muted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={handleShareGroup}>
                <Icon name="whatsapp" size={16} color="#25D366" />
                <Text style={styles.modalSecondaryBtnText}>Invite via WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAddMember}>
                <Icon name="account-plus" size={16} color="#FFF" />
                <Text style={styles.modalPrimaryBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ━━━ Split Detail Modal ━━━ */}
      <Modal visible={showSplitModal} transparent animationType="slide" onRequestClose={() => setShowSplitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, themed.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.textPrimary]}>Payment Split Details</Text>
              <TouchableOpacity onPress={() => setShowSplitModal(false)}>
                <Icon name="close" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>

            {allMembers.filter(m => m.status === 'subscribed').map((m, i) => (
              <View key={m.id} style={styles.splitDetailRow}>
                <View style={[styles.splitDetailAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                  <Text style={styles.splitDetailAvatarText}>{m.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.splitDetailName, themed.textPrimary]}>{m.name}</Text>
                  <Text style={styles.splitDetailPlan}>{m.plan || 'No plan'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.splitDetailAmount, themed.textPrimary]}>{'\u20B9'}{m.share || 0}</Text>
                  <Text style={styles.splitDetailDelivery}>+{'\u20B9'}{splitDelivery} delivery</Text>
                </View>
              </View>
            ))}

            <View style={styles.splitDetailTotal}>
              <Text style={styles.splitDetailTotalLabel}>Total Daily Cost</Text>
              <Text style={styles.splitDetailTotalValue}>{'\u20B9'}{totalGroupCost + deliveryFee}{discountUnlocked ? ` (-${'\u20B9'}${Math.round(totalGroupCost * 0.1)} discount)` : ''}</Text>
            </View>

            <TouchableOpacity style={[styles.modalPrimaryBtn, { flex: 0 }]} onPress={() => setShowSplitModal(false)}>
              <Text style={styles.modalPrimaryBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ━━━ Edit Group Modal ━━━ */}
      <Modal visible={showEditGroup} transparent animationType="slide" onRequestClose={() => setShowEditGroup(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, themed.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.textPrimary]}>Edit Group</Text>
              <TouchableOpacity onPress={() => setShowEditGroup(false)}>
                <Icon name="close" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalFieldLabel}>Group Name</Text>
            <TextInput
              style={[styles.modalInput, themed.inputBg]}
              placeholder="Group name"
              placeholderTextColor={COLORS.text.muted}
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={styles.modalFieldLabel}>Shared Delivery Address</Text>
            <TextInput
              style={[styles.modalInput, themed.inputBg, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Hostel address..."
              placeholderTextColor={COLORS.text.muted}
              value={groupAddress}
              onChangeText={setGroupAddress}
              multiline
            />
            <TouchableOpacity style={[styles.modalPrimaryBtn, { flex: 0 }]} onPress={() => { setShowEditGroup(false); Alert.alert('Saved', 'Group details updated.'); }}>
              <Icon name="check" size={16} color="#FFF" />
              <Text style={styles.modalPrimaryBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ━━━ Plan Picker Modal ━━━ */}
      <Modal visible={showPlanPicker} transparent animationType="slide" onRequestClose={() => setShowPlanPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, themed.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themed.textPrimary]}>{adminPlan ? 'Change Plan' : 'Choose Your Plan'}</Text>
              <TouchableOpacity onPress={() => setShowPlanPicker(false)}>
                <Icon name="close" size={22} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>

            {PLAN_OPTIONS.map(plan => {
              const isSelected = adminPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planOptionCard, isSelected && { borderColor: plan.color, borderWidth: 2 }]}
                  onPress={() => {
                    setAdminPlan(plan.id);
                    setSubscriptionPaused(false);
                    setShowPlanPicker(false);
                    Alert.alert('Plan Selected', `You've subscribed to ${plan.name}!`);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.planOptionIcon, { backgroundColor: plan.color + '20' }]}>
                    <Icon name={plan.icon as any} size={18} color={plan.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planOptionName, themed.textPrimary]}>{plan.name}</Text>
                    <Text style={[styles.planOptionPrice, { color: plan.color }]}>{'\u20B9'}{plan.price}/day</Text>
                  </View>
                  {isSelected && <Icon name="check-circle" size={20} color={plan.color} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.modalSecondaryBtn, { marginTop: 8, borderColor: '#1565C0' }]}
              onPress={() => { setShowPlanPicker(false); router.push('/subscription-setup' as any); }}
            >
              <Icon name="cog-outline" size={16} color="#1565C0" />
              <Text style={[styles.modalSecondaryBtnText, { color: '#1565C0' }]}>Customize with Subscription Setup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.sm, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  scroll: { padding: SPACING.base },

  // Group Info
  groupInfoCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  groupCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  groupCodeLabel: { fontSize: 10, color: COLORS.text.muted, fontWeight: '600' },
  groupCodeText: { fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 2 },
  shareCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#25D366', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10 },
  shareCodeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F5F5', borderRadius: RADIUS.md, padding: 12, marginBottom: 14 },
  addressIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center' },
  addressLabel: { fontSize: 9, color: COLORS.text.muted, fontWeight: '600' },
  addressText: { fontSize: 12, fontWeight: '700', marginTop: 1 },

  discountSection: {},
  discountHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  discountTitle: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  discountCount: { fontSize: 12, fontWeight: '800', color: '#1565C0' },
  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  discountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E0', borderRadius: RADIUS.md, padding: 8 },
  discountBadgeText: { fontSize: 11, fontWeight: '700', color: '#E65100' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1565C0', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  addMemberBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  viewDetailLink: { fontSize: 12, fontWeight: '700', color: '#1565C0' },

  // Member Card
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, padding: 14, marginBottom: 8, ...SHADOW.sm },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberPlan: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  adminBadge: { backgroundColor: '#1565C0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  adminBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },

  // Split Payment
  splitCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  splitTotal: { borderTopWidth: 1, borderTopColor: '#E0E0E0', marginTop: 4, paddingTop: 12 },
  splitLabel: { fontSize: 13, color: COLORS.text.secondary },
  splitValue: { fontSize: 14, fontWeight: '700' },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E0', borderRadius: RADIUS.md, padding: 10, marginTop: 8 },
  savingsText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#E65100' },

  // Benefits
  benefitsCard: { borderRadius: RADIUS.lg, padding: SPACING.base, gap: 12, ...SHADOW.sm },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  benefitText: { flex: 1, fontSize: 12, fontWeight: '600' },

  // CTA
  subscribeCta: { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  subscribeCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  subscribeCtaText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  whatsappCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#25D366', borderRadius: RADIUS.lg, paddingVertical: 14, marginTop: 10 },
  whatsappCtaText: { fontSize: 14, fontWeight: '700', color: '#25D366' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: RADIUS.xl, padding: SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalFieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.muted, marginBottom: 4, marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 10 },
  modalPrimaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1565C0', borderRadius: RADIUS.lg, paddingVertical: 14 },
  modalPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  modalSecondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#25D366', borderRadius: RADIUS.lg, paddingVertical: 14 },
  modalSecondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#25D366' },

  // Split Detail Modal
  splitDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  splitDetailAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  splitDetailAvatarText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  splitDetailName: { fontSize: 13, fontWeight: '700' },
  splitDetailPlan: { fontSize: 10, color: COLORS.text.muted },
  splitDetailAmount: { fontSize: 14, fontWeight: '800' },
  splitDetailDelivery: { fontSize: 9, color: COLORS.text.muted },
  splitDetailTotal: { backgroundColor: '#E3F2FD', borderRadius: RADIUS.md, padding: 12, marginVertical: 12, flexDirection: 'row', justifyContent: 'space-between' },
  splitDetailTotalLabel: { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  splitDetailTotalValue: { fontSize: 13, fontWeight: '800', color: '#1565C0' },

  // Create Group
  createHero: { marginBottom: SPACING.md },
  createHeroBg: { borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center' as const, gap: 10 },
  createHeroTitle: { fontSize: 22, fontWeight: '900' },
  createHeroDesc: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center' as const, lineHeight: 19 },
  createBenefitsCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  createBenefitsTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  createBenefitRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 10 },
  createBenefitIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center' as const, alignItems: 'center' as const },
  createBenefitText: { flex: 1, fontSize: 12, fontWeight: '600' },
  createFormCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  createFormTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  createFormLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text.muted, marginBottom: 4, marginTop: 4 },
  createGroupBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' as const, marginTop: SPACING.sm },
  createGroupBtnGrad: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 16 },
  createGroupBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  createHowCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  createStepRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 12 },
  createStepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1565C0', justifyContent: 'center' as const, alignItems: 'center' as const },
  createStepNum: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  createStepTitle: { fontSize: 13, fontWeight: '700' },
  createStepDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },

  // Your Subscription
  yourSubCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  yourSubHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 12 },
  yourSubIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center' as const, alignItems: 'center' as const },
  yourSubTitle: { fontSize: 14, fontWeight: '800' },
  yourSubPlan: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  yourSubActions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  yourSubActionBtn: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' as const },
  yourSubActionBtnGrad: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, paddingVertical: 12 },
  yourSubActionBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  yourSubManageBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 5, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8 },
  yourSubManageBtnText: { fontSize: 11, fontWeight: '700' },

  // Plan Picker
  planOptionCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 },
  planOptionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center' as const, alignItems: 'center' as const },
  planOptionName: { fontSize: 13, fontWeight: '700' },
  planOptionPrice: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  // Group Subscriptions Section
  groupSubCountBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  groupSubCountText: { fontSize: 11, fontWeight: '800', color: '#2E7D32' },
  groupSubCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, ...SHADOW.sm },
  groupSubCardHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, marginBottom: 12 },
  groupSubIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center' as const, alignItems: 'center' as const },
  groupSubTitle: { fontSize: 14, fontWeight: '800' },
  groupSubActiveBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  groupSubActiveText: { fontSize: 9, fontWeight: '700', color: '#4CAF50' },
  groupSubPausedBadge: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  groupSubPausedText: { fontSize: 9, fontWeight: '700', color: '#F57C00' },
  groupSubSchedule: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
  groupSubItems: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  groupSubNextRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: '#F5F5F5', borderRadius: RADIUS.md, padding: 10, marginBottom: 12 },
  groupSubNextInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  groupSubNextText: { fontSize: 12, fontWeight: '600', color: COLORS.text.primary },
  groupSubStats: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  groupSubStat: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  groupSubStatSkipped: { fontSize: 10, fontWeight: '700', color: COLORS.status.error },
  groupSubUpcoming: { marginBottom: 12 },
  groupSubUpcomingTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  groupSubDeliveryRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 8 },
  groupSubDeliveryBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  groupSubDeliveryDate: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center' as const, alignItems: 'center' as const },
  groupSubDeliveryDateSkipped: { backgroundColor: '#F5F5F5' },
  groupSubDeliveryDay: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  groupSubDeliveryMonth: { fontSize: 9, fontWeight: '600', color: COLORS.text.muted },
  groupSubDeliveryLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text.primary },
  groupSubDeliveryTime: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  groupSubSkippedBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#FFEBEE', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  groupSubSkippedText: { fontSize: 9, fontWeight: '700', color: COLORS.status.error },
  groupSubScheduledBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  groupSubScheduledText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  groupSubActions: { flexDirection: 'row' as const, gap: 8 },
  groupSubManageBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, backgroundColor: '#1565C0', borderRadius: RADIUS.md, paddingVertical: 10 },
  groupSubManageBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  groupSubCalendarBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10 },
  groupSubCalendarBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});
