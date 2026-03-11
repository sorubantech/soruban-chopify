import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Switch, Alert, Platform } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, LANGUAGES } from '@/context/LanguageContext';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

const THEME_OPTIONS: { key: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
  { key: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { key: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
  { key: 'system', label: 'System', icon: 'cellphone' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const themed = useThemedStyles();

  const [notifications, setNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoApplyOffers, setAutoApplyOffers] = useState(true);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [buildNumber, setBuildNumber] = useState('2026.03.1');

  useEffect(() => {
    try {
      const Constants = require('expo-constants').default;
      const ver = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
      const build = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '2026.03.1';
      setAppVersion(ver);
      setBuildNumber(build);
    } catch {}
  }, []);

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will clear cached images and temporary data. Your orders and profile are safe.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Done', 'Cache cleared successfully.') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Icon name="arrow-left" size={24} color={themed.colors.text.primary} /></TouchableOpacity>
            <Text style={[styles.headerTitle, themed.textPrimary]}>{t('settings')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Dark Mode */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="theme-light-dark" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>{t('darkMode')}</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(opt => {
              const isActive = themeMode === opt.key;
              return (
                <TouchableOpacity key={opt.key} style={[styles.themeChip, isActive && styles.themeChipActive]} onPress={() => setThemeMode(opt.key)}>
                  <Icon name={opt.icon as any} size={20} color={isActive ? '#FFF' : COLORS.text.secondary} />
                  <Text style={[styles.themeChipText, isActive && styles.themeChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="translate" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>{t('language')}</Text>
          </View>
          {LANGUAGES.map((lang, idx) => {
            const isActive = language === lang.code;
            return (
              <React.Fragment key={lang.code}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity style={styles.langRow} onPress={() => setLanguage(lang.code)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>{lang.label}</Text>
                    <Text style={styles.langNative}>{lang.nativeLabel}</Text>
                  </View>
                  {isActive && <Icon name="check-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Notifications */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="bell-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>{t('notifications')}</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive push notifications</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: COLORS.primaryLight }} thumbColor={notifications ? COLORS.primary : '#CCC'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Order Updates</Text>
              <Text style={styles.settingDesc}>Get notified about order status changes</Text>
            </View>
            <Switch value={orderUpdates} onValueChange={setOrderUpdates} trackColor={{ true: COLORS.primaryLight }} thumbColor={orderUpdates ? COLORS.primary : '#CCC'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Promotions & Offers</Text>
              <Text style={styles.settingDesc}>Deals and discount notifications</Text>
            </View>
            <Switch value={promotions} onValueChange={setPromotions} trackColor={{ true: COLORS.primaryLight }} thumbColor={promotions ? COLORS.primary : '#CCC'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Alerts</Text>
              <Text style={styles.settingDesc}>Play sound for order updates</Text>
            </View>
            <Switch value={soundAlerts} onValueChange={setSoundAlerts} trackColor={{ true: COLORS.primaryLight }} thumbColor={soundAlerts ? COLORS.primary : '#CCC'} />
          </View>
        </View>

        {/* Ordering Preferences */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="cart-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Ordering Preferences</Text>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Apply Best Offers</Text>
              <Text style={styles.settingDesc}>Automatically apply available discounts</Text>
            </View>
            <Switch value={autoApplyOffers} onValueChange={setAutoApplyOffers} trackColor={{ true: COLORS.primaryLight }} thumbColor={autoApplyOffers ? COLORS.primary : '#CCC'} />
          </View>
        </View>

        {/* Storage */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="database-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Storage</Text>
          </View>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Icon name="broom" size={20} color={COLORS.text.secondary} />
            <Text style={styles.actionLabel}>Clear Cache</Text>
            <Icon name="chevron-right" size={18} color={COLORS.text.muted} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.sectionCard, themed.card]}>
          <View style={styles.sectionHeader}>
            <Icon name="information-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, themed.textPrimary]}>App Info</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>{buildNumber}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}</Text>
          </View>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
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
  sectionCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  // Theme selector
  themeRow: { flexDirection: 'row', gap: 8 },
  themeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FFF' },
  themeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  themeChipText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  themeChipTextActive: { color: '#FFF' },
  // Language selector
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  langLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  langLabelActive: { color: COLORS.primary, fontWeight: '800' },
  langNative: { fontSize: 12, color: COLORS.text.muted, marginTop: 1 },
  // Settings toggles
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  settingInfo: { flex: 1, marginRight: 10 },
  settingLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  settingDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.xs },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: SPACING.md },
  actionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary, flex: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm },
  infoLabel: { fontSize: 13, color: COLORS.text.secondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
});
