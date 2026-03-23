import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, StatusBar, Image, Alert, useWindowDimensions } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useOrders } from '@/context/OrderContext';
import { useAuth } from '@/context/AuthContext';
import { useScrollContext } from '@/context/ScrollContext';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useLoyalty } from '@/context/LoyaltyContext';
import { useDiet } from '@/context/DietContext';

const MENU_ITEMS = [
  { icon: 'cog-outline', label: 'Settings', color: '#546E7A', route: '/settings' },
  { icon: 'map-marker-outline', label: 'Delivery Addresses', color: '#1565C0', route: '/addresses' },
  { icon: 'wallet-outline', label: 'Wallet', color: '#388E3C', route: '/wallet' },
  { icon: 'bell-outline', label: 'Notifications', color: '#F57C00', route: '/notifications' },
  { icon: 'heart-outline', label: 'Favorites', color: '#D32F2F', route: '/favorites' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#7B1FA2', route: '/help' },
  { icon: 'information-outline', label: 'About', color: '#455A64', route: '/about' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { handleScroll } = useScrollContext();
  const { orders } = useOrders();
  const totalOrders = orders.length;
  const totalSaved = orders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const activeSubscriptions = orders.filter(o => o.subscription && (o.subscription.status === 'active' || o.subscription.status === 'paused'));
  const themed = useThemedStyles();
  const { width: screenWidth } = useWindowDimensions();
  const { loyalty } = useLoyalty();
  const { familyMembers, resetProfile, userName } = useDiet();

  const EXTRA_MENU_ITEMS = [
    { icon: 'star-circle', label: 'Loyalty Rewards', desc: `${loyalty.currentBalance} points`, route: '/loyalty', color: '#FFD700' },
    { icon: 'gift-outline', label: 'Refer & Earn', desc: 'Earn ₹50 per referral', route: '/referral', color: '#E91E63' },
    { icon: 'chart-line', label: 'Spending Analytics', desc: 'Track your expenses', route: '/spending-analytics', color: '#2196F3' },
    { icon: 'food-variant', label: 'Diet & Health', desc: familyMembers.length > 0 ? `${familyMembers.length} family members` : 'Set preferences', route: '/diet-preferences', color: '#4CAF50' },
    { icon: 'doctor', label: 'Nutritionist', desc: 'Chat, Meal Plan & Health Report', route: '/nutritionist', color: '#1565C0' },
    { icon: 'content-save-outline', label: 'Saved Carts', desc: 'Your saved orders', route: '/saved-carts', color: '#FF9800' },
    { icon: 'book-open-variant', label: 'Community Recipes', desc: 'Discover recipes', route: '/community-recipes', color: '#7B1FA2' },
    { icon: 'ticket-percent', label: 'Offers & Coupons', desc: 'Available discounts', route: '/offers-coupons', color: '#E65100' },
    { icon: 'account-group', label: 'Group Subscription', desc: 'Hostel group — share & save', route: '/group-subscription', color: '#1565C0' },
    { icon: 'domain', label: 'Corporate Plans', desc: 'Office fruit baskets & wellness', route: '/corporate-subscription', color: '#1A237E' },
    { icon: 'airplane', label: 'Vacation Mode', desc: 'Pause deliveries', route: '/vacation-mode', color: '#607D8B' },
  ];

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Profile</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.scroll} onScroll={handleScroll} scrollEventThrottle={16}>
        {/* User Card */}
        <View style={[styles.profileCard, themed.card]}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}><Icon name="account" size={40} color={COLORS.primary} /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, themed.textPrimary]}>{userName || user?.name || 'Customer'}</Text>
            <View style={styles.tierBadge}>
              <Icon name="shield-star" size={14} color={loyalty.tier === 'gold' ? '#FFD700' : loyalty.tier === 'silver' ? '#C0C0C0' : loyalty.tier === 'platinum' ? '#E5E4E2' : '#CD7F32'} />
              <Text style={styles.tierText}>{loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)}</Text>
            </View>
            <View style={styles.phoneRow}>
              <Icon name="phone-outline" size={14} color={COLORS.primary} />
              <Text style={styles.profilePhone}>+91 {user?.phone || '98765 43210'}</Text>
            </View>
            {user?.email ? (
              <View style={styles.emailRow}>
                <Icon name="email-outline" size={14} color={COLORS.text.muted} />
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            ) : null}
            <Text style={styles.profileAddress} numberOfLines={1}>{user?.address || '42, Anna Nagar, Coimbatore'}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}><Icon name="pencil" size={16} color={COLORS.primary} /></TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { v: String(totalOrders), l: 'Orders' },
            { v: `\u20B9${totalSaved}`, l: 'Saved' },
            { v: '0', l: 'Favorites' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, themed.card]}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Active Subscriptions */}
        {activeSubscriptions.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, themed.textPrimary]}>My Subscriptions</Text>
              <View style={styles.subCountBadge}><Text style={styles.subCountText}>{activeSubscriptions.length} subscription{activeSubscriptions.length !== 1 ? 's' : ''}</Text></View>
            </View>
            <FlatList
              data={activeSubscriptions}
              keyExtractor={o => o.id}
              horizontal={activeSubscriptions.length > 3}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={activeSubscriptions.length > 3}
              contentContainerStyle={activeSubscriptions.length > 3 ? { gap: 10, paddingRight: 4 } : undefined}
              renderItem={({ item: order }) => {
                const sub = order.subscription!;
                const freqLabel = sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1);
                const isGroup = !!sub.groupCode;
                const typeLabel = `${isGroup ? 'Group ' : ''}${freqLabel}`;
                const iconName = sub.frequency === 'daily' ? 'calendar-today' : sub.frequency === 'weekly' ? 'calendar-week' : 'calendar-month';
                const iconBg = isGroup ? '#1565C0' : sub.frequency === 'weekly' ? '#2E7D32' : sub.frequency === 'monthly' ? '#1565C0' : '#F57C00';
                const scheduleDetail = sub.frequency === 'weekly'
                  ? `Every ${sub.weeklyDay || 'weekday'}`
                  : sub.frequency === 'monthly'
                  ? `On ${sub.monthlyDates?.join(', ') || 'weekdays'}`
                  : 'Every day';
                const skippedCount = (sub.skippedDeliveries || []).filter(s => s.status === 'skipped').length;

                return (
                  <TouchableOpacity
                    style={[
                      styles.subCard,
                      themed.card,
                      activeSubscriptions.length > 3 && { width: screenWidth - 56 },
                    ]}
                    onPress={() => router.push({ pathname: '/subscription-manage' as any, params: { id: order.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.subCardIcon, { backgroundColor: iconBg }]}>
                      <Icon name={iconName as any} size={20} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.subCardTitle} numberOfLines={1}>{typeLabel} Subscription</Text>
                        {sub.status === 'paused' ? (
                          <View style={styles.subPausedBadge}><Text style={styles.subPausedText}>Paused</Text></View>
                        ) : (
                          <View style={styles.subActiveBadge}><Text style={styles.subActiveText}>Active</Text></View>
                        )}
                      </View>
                      {isGroup && sub.groupName && (
                        <View style={styles.subGroupTag}>
                          <Icon name="account-group" size={10} color="#1565C0" />
                          <Text style={styles.subGroupTagText}>{sub.groupName}</Text>
                        </View>
                      )}
                      <Text style={styles.subCardDetail} numberOfLines={1}>{scheduleDetail} at {sub.preferredTime}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.subCardItems}>{order.items.length} items · {'\u20B9'}{order.total}/delivery</Text>
                        {skippedCount > 0 && <Text style={styles.subSkippedCount}>{skippedCount} skipped</Text>}
                      </View>
                    </View>
                    <View style={styles.manageBtn}>
                      <Text style={styles.manageBtnText}>Manage</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            {activeSubscriptions.length > 3 && (
              <View style={styles.subScrollHint}>
                <Icon name="gesture-swipe-horizontal" size={14} color={COLORS.text.muted} />
                <Text style={styles.subScrollHintText}>Swipe to see more</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Orders */}
        {totalOrders > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, themed.textPrimary]}>Recent Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.recentLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {orders.slice(0, 3).map(order => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, themed.card]}
                onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}
              >
                <View style={styles.orderIcon}>
                  <Icon name="package-variant" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderIdText}>#{order.id}</Text>
                  <Text style={styles.orderMeta}>{order.items.length} items · {'\u20B9'}{order.total}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <Text style={styles.orderStatusText}>{order.status}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={COLORS.text.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Menu */}
        <View style={[styles.menuCard, themed.card]}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={() => { if (item.route) router.push(item.route as any); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Icon name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
          ))}
          {EXTRA_MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={`extra-${i}`}
              style={styles.menuItem}
              onPress={() => { if (item.route) router.push(item.route as any); }}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Icon name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await resetProfile(); await logout(); }}>
          <Icon name="logout" size={18} color={COLORS.status.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => Alert.alert('Delete Account', 'Are you sure? This will permanently delete your account and all data.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await logout(); } }])}>
          <Icon name="delete-outline" size={20} color={COLORS.status.error} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  scroll: { padding: SPACING.base, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.backgroundSoft, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.primary },
  profileName: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  profilePhone: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  profileEmail: { fontSize: 12, color: COLORS.text.muted },
  profileAddress: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundSoft, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOW.sm },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  recentSection: { marginTop: SPACING.md },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  recentTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  recentLink: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  orderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  orderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  orderIdText: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  orderMeta: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  orderStatus: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  orderStatusText: { fontSize: 10, fontWeight: '700', color: COLORS.green, textTransform: 'capitalize' },
  menuCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, marginTop: SPACING.md, ...SHADOW.sm, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.xl, paddingVertical: SPACING.md, borderWidth: 1.5, borderColor: COLORS.status.error, borderRadius: RADIUS.full },
  logoutText: { fontSize: 14, fontWeight: '700', color: COLORS.status.error },
  // Subscriptions
  subCountBadge: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  subCountText: { fontSize: 11, fontWeight: '700', color: '#F57C00' },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  subCardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  subCardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text.primary },
  subActiveBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  subActiveText: { fontSize: 9, fontWeight: '700', color: '#4CAF50' },
  subPausedBadge: { backgroundColor: '#FFF8E1', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  subPausedText: { fontSize: 9, fontWeight: '700', color: '#F57C00' },
  subGroupTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 },
  subGroupTagText: { fontSize: 9, fontWeight: '700', color: '#1565C0' },
  subCardDetail: { fontSize: 11, color: COLORS.text.secondary, marginTop: 3 },
  subCardItems: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  subSkippedCount: { fontSize: 10, fontWeight: '700', color: COLORS.status.error },
  manageBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  manageBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  subScrollHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 },
  subScrollHintText: { fontSize: 10, color: COLORS.text.muted },
  menuDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: SPACING.base, marginTop: SPACING.md, marginBottom: SPACING.xl, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.status.error, borderRadius: RADIUS.lg },
  deleteAccountText: { fontSize: 14, fontWeight: '700', color: COLORS.status.error },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  tierText: { fontSize: 11, fontWeight: '700', color: '#B8860B' },
});
