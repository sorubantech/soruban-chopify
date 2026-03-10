import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  StatusBar, Alert, Share,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useLoyalty } from '@/context/LoyaltyContext';
import type { Referral } from '@/types';

const STEPS = [
  { icon: 'share-variant', label: 'Share Code', desc: 'Share your referral code with friends' },
  { icon: 'cart-outline', label: 'Friend Orders', desc: 'Your friend places their first order' },
  { icon: 'gift-outline', label: 'Both Earn \u20B950', desc: 'You and your friend both get \u20B950' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: '#FFF3E0', color: '#F57C00' },
  joined: { label: 'Joined', bg: '#E3F2FD', color: '#1565C0' },
  first_order: { label: 'Ordered', bg: '#E8F5E9', color: '#388E3C' },
  rewarded: { label: 'Rewarded', bg: '#F3E5F5', color: '#7B1FA2' },
};

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 2) + '****' + phone.slice(-2);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReferralScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { referrals, addReferral, getReferralCode } = useLoyalty();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const referralCode = useMemo(() => getReferralCode(), [getReferralCode]);

  const stats = useMemo(() => {
    const total = referrals.length;
    const successful = referrals.filter(r => r.status === 'rewarded').length;
    const earned = successful * 50;
    return { total, successful, earned };
  }, [referrals]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Use my referral code ${referralCode} on CutReady and we both get \u20B950! Download now.`,
      });
    } catch {}
  };

  const handleSendInvite = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) { Alert.alert('Missing Name', 'Please enter your friend\'s name.'); return; }
    if (trimmedPhone.length < 10) { Alert.alert('Invalid Phone', 'Please enter a valid phone number.'); return; }

    setSending(true);
    try {
      await addReferral(trimmedName, trimmedPhone);
      setName('');
      setPhone('');
      Alert.alert('Invite Sent!', `Referral invite sent to ${trimmedName}.`);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderReferral = ({ item }: { item: Referral }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    return (
      <View style={[styles.refCard, themed.card]}>
        <View style={[styles.refAvatar, { backgroundColor: COLORS.primary + '15' }]}>
          <Icon name="account-outline" size={22} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.refName, themed.textPrimary]}>{item.referredName}</Text>
          <Text style={styles.refPhone}>{maskPhone(item.referredPhone)}</Text>
          <Text style={styles.refDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <LinearGradient colors={['#388E3C', '#4CAF50']} style={styles.heroGrad}>
          <Icon name="gift-outline" size={36} color="#FFF" />
          <Text style={styles.heroTitle}>Earn {'\u20B9'}50 for each friend</Text>
          <Text style={styles.heroSub}>Share your code and earn rewards when friends join</Text>

          <View style={styles.codeRow}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Icon name="share-variant" size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* How it works */}
      <Text style={[styles.sectionTitle, themed.textPrimary]}>How it Works</Text>
      <View style={styles.stepsRow}>
        {STEPS.map((step, i) => (
          <React.Fragment key={i}>
            <View style={[styles.stepCard, themed.card]}>
              <View style={[styles.stepIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Icon name={step.icon as any} size={22} color={COLORS.primary} />
              </View>
              <Text style={[styles.stepLabel, themed.textPrimary]}>{step.label}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <Icon name="chevron-right" size={16} color={COLORS.text.muted} style={styles.stepArrow} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Invite Form */}
      <Text style={[styles.sectionTitle, themed.textPrimary]}>Invite a Friend</Text>
      <View style={[styles.formCard, themed.card]}>
        <TextInput
          style={[styles.input, themed.inputBg]}
          placeholder="Friend's name"
          placeholderTextColor={COLORS.text.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, themed.inputBg]}
          placeholder="Phone number"
          placeholderTextColor={COLORS.text.muted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={13}
        />
        <TouchableOpacity
          style={[styles.inviteBtn, sending && { opacity: 0.6 }]}
          onPress={handleSendInvite}
          activeOpacity={0.8}
          disabled={sending}
        >
          <LinearGradient colors={['#388E3C', '#4CAF50']} style={styles.inviteBtnGrad}>
            <Icon name="send" size={16} color="#FFF" />
            <Text style={styles.inviteBtnText}>{sending ? 'Sending...' : 'Send Invite'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={[styles.statsCard, themed.card]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, themed.textPrimary]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Referrals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, themed.textPrimary]}>{stats.successful}</Text>
          <Text style={styles.statLabel}>Successful</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.green }]}>{'\u20B9'}{stats.earned}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </View>
      </View>

      {/* History header */}
      {referrals.length > 0 && (
        <Text style={[styles.sectionTitle, themed.textPrimary]}>Referral History</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>Refer & Earn</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={referrals}
        keyExtractor={i => i.id}
        renderItem={renderReferral}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          referrals.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="account-group-outline" size={48} color={COLORS.text.muted} />
              <Text style={styles.emptyText}>No referrals yet. Invite friends to get started!</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  list: { paddingHorizontal: SPACING.base, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginTop: SPACING.lg, marginBottom: SPACING.md },

  /* Hero */
  heroCard: { marginTop: SPACING.sm, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.sm },
  heroGrad: { padding: SPACING.xl, alignItems: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: SPACING.sm },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SPACING.md, width: '100%' },
  codeBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md,
    paddingVertical: 12, paddingHorizontal: SPACING.base, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed',
  },
  codeText: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center', letterSpacing: 2 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: SPACING.base,
  },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  /* Steps */
  stepsRow: { flexDirection: 'row', alignItems: 'center' },
  stepCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.md,
    alignItems: 'center', ...SHADOW.sm,
  },
  stepIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text.primary, textAlign: 'center' },
  stepDesc: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center', marginTop: 2, lineHeight: 13 },
  stepArrow: { marginHorizontal: 2 },

  /* Form */
  formCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, ...SHADOW.sm },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base, paddingVertical: 12, fontSize: 13,
    color: COLORS.text.primary, backgroundColor: '#F7F7F7', marginBottom: SPACING.sm,
  },
  inviteBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.xs },
  inviteBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* Stats */
  statsCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: RADIUS.lg,
    padding: SPACING.base, marginTop: SPACING.md, ...SHADOW.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  statLabel: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  /* Referral list */
  refCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  refAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  refName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  refPhone: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  refDate: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  badge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  /* Empty */
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: COLORS.text.muted, marginTop: 8, textAlign: 'center' },
});
