// app/b2b-portal.tsx - B2B Business Portal for Restaurants, Hotels, Caterers
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Alert, Dimensions, Modal,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BusinessType = 'restaurant' | 'hotel' | 'caterer' | 'cloud_kitchen' | 'canteen' | 'hostel';

interface BulkProduct {
  id: string;
  name: string;
  category: string;
  retailPrice: number;
  b2bPrice: number;
  unit: string;
  minQty: number;
  icon: string;
}

interface B2BPlan {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  description: string;
  features: string[];
  priceLabel: string;
  popular?: boolean;
}

const BUSINESS_TYPES: { key: BusinessType; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'restaurant', label: 'Restaurant', icon: 'silverware-fork-knife', color: '#E65100', bg: '#FFF3E0' },
  { key: 'hotel', label: 'Hotel', icon: 'office-building', color: '#1565C0', bg: '#E3F2FD' },
  { key: 'caterer', label: 'Caterer', icon: 'food-variant', color: '#7B1FA2', bg: '#F3E5F5' },
  { key: 'cloud_kitchen', label: 'Cloud Kitchen', icon: 'cloud', color: '#00796B', bg: '#E0F7FA' },
  { key: 'canteen', label: 'Canteen', icon: 'store', color: '#388E3C', bg: '#E8F5E9' },
  { key: 'hostel', label: 'Hostel / PG', icon: 'home-group', color: '#C62828', bg: '#FFEBEE' },
];

const BULK_PRODUCTS: BulkProduct[] = [
  { id: 'bp1', name: 'Onions (Chopped)', category: 'Vegetables', retailPrice: 60, b2bPrice: 42, unit: 'kg', minQty: 5, icon: 'circle-slice-8' },
  { id: 'bp2', name: 'Tomatoes (Diced)', category: 'Vegetables', retailPrice: 50, b2bPrice: 35, unit: 'kg', minQty: 5, icon: 'circle-slice-8' },
  { id: 'bp3', name: 'Mixed Veg (Cubed)', category: 'Vegetables', retailPrice: 80, b2bPrice: 56, unit: 'kg', minQty: 3, icon: 'food-apple' },
  { id: 'bp4', name: 'Carrots (Sliced)', category: 'Vegetables', retailPrice: 55, b2bPrice: 38, unit: 'kg', minQty: 5, icon: 'food-apple' },
  { id: 'bp5', name: 'Cabbage (Shredded)', category: 'Vegetables', retailPrice: 45, b2bPrice: 32, unit: 'kg', minQty: 5, icon: 'leaf' },
  { id: 'bp6', name: 'Paneer (Cubed)', category: 'Dairy', retailPrice: 320, b2bPrice: 240, unit: 'kg', minQty: 2, icon: 'cheese' },
  { id: 'bp7', name: 'Fresh Fruits Mix', category: 'Fruits', retailPrice: 150, b2bPrice: 105, unit: 'kg', minQty: 3, icon: 'fruit-watermelon' },
  { id: 'bp8', name: 'Sambar Pack (Bulk)', category: 'Packs', retailPrice: 120, b2bPrice: 84, unit: 'kg', minQty: 5, icon: 'pot-steam' },
  { id: 'bp9', name: 'Salad Mix', category: 'Salads', retailPrice: 100, b2bPrice: 70, unit: 'kg', minQty: 3, icon: 'food-apple' },
  { id: 'bp10', name: 'Beetroot (Grated)', category: 'Vegetables', retailPrice: 65, b2bPrice: 45, unit: 'kg', minQty: 3, icon: 'circle-slice-8' },
];

const B2B_PLANS: B2BPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    icon: 'rocket-launch',
    color: '#1565C0',
    bg: '#E3F2FD',
    description: 'For small restaurants & cloud kitchens',
    features: ['Up to 50 kg/day', '20% off retail price', 'Morning delivery slot', 'Weekly billing', 'WhatsApp support'],
    priceLabel: 'Free to join',
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: 'trending-up',
    color: '#E65100',
    bg: '#FFF3E0',
    description: 'For growing businesses & hotels',
    features: ['Up to 200 kg/day', '30% off retail price', 'Priority delivery (2 slots)', 'Dedicated account manager', 'Monthly credit terms', 'Custom cutting styles'],
    priceLabel: '₹999/month',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: 'domain',
    color: '#7B1FA2',
    bg: '#F3E5F5',
    description: 'For large chains & catering companies',
    features: ['Unlimited volume', '35% off retail price', 'Flexible delivery (any slot)', 'Key account manager', 'Net-30 payment terms', 'Custom packing & labeling', 'SLA guarantee', 'Bulk event catering'],
    priceLabel: 'Custom pricing',
  },
];

const HERO_STATS = [
  { value: '120+', label: 'Businesses', icon: 'store' },
  { value: '30%', label: 'Avg Savings', icon: 'percent' },
  { value: '5 AM', label: 'Early Delivery', icon: 'clock-fast' },
  { value: '4.9', label: 'Rating', icon: 'star' },
];

export default function B2BPortalScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<B2BPlan | null>(null);

  // Enquiry form state
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [dailyRequirement, setDailyRequirement] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmitEnquiry = () => {
    if (!businessName.trim() || !contactPerson.trim() || !phone.trim() || !businessType) {
      Alert.alert('Required Fields', 'Please fill in business name, contact person, phone, and business type.');
      return;
    }
    Alert.alert(
      'Enquiry Submitted!',
      'Our B2B team will contact you within 24 hours to set up your business account.',
      [{ text: 'OK', onPress: () => {
        setShowEnquiry(false);
        setBusinessName(''); setContactPerson(''); setPhone(''); setEmail('');
        setBusinessType(''); setDailyRequirement(''); setAddress('');
      }}],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={['#1A237E', '#283593', '#3949AB']} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Soruban B2B</Text>
            <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowEnquiry(true)}>
              <Icon name="phone-outline" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero Section */}
        <LinearGradient colors={['#1A237E', '#283593', '#3949AB']} style={styles.hero}>
          <Text style={styles.heroTitle}>Bulk Fresh-Cut{'\n'}for Your Business</Text>
          <Text style={styles.heroSubtitle}>
            Pre-cut vegetables, fruits & packs delivered fresh every morning.{'\n'}Save up to 35% on retail prices.
          </Text>

          <View style={styles.heroStatsRow}>
            {HERO_STATS.map((stat) => (
              <View key={stat.label} style={styles.heroStat}>
                <Icon name={stat.icon as any} size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroStatValue}>{stat.value}</Text>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.heroCta} onPress={() => setShowEnquiry(true)} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.heroCtaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name="handshake" size={20} color="#FFF" />
              <Text style={styles.heroCtaText}>Register Your Business</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Business Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Who Can Join?</Text>
          <View style={styles.businessGrid}>
            {BUSINESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.businessCard, themed.card]}
                activeOpacity={0.7}
                onPress={() => { setBusinessType(type.key); setShowEnquiry(true); }}
              >
                <View style={[styles.businessIcon, { backgroundColor: type.bg }]}>
                  <Icon name={type.icon as any} size={22} color={type.color} />
                </View>
                <Text style={[styles.businessLabel, themed.textPrimary]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>How It Works</Text>
          <View style={[styles.howItWorksCard, themed.card]}>
            {[
              { step: '1', icon: 'account-plus', title: 'Register', desc: 'Fill the enquiry form with your business details' },
              { step: '2', icon: 'handshake', title: 'Onboarding', desc: 'Our team visits, verifies & activates your account' },
              { step: '3', icon: 'cart-outline', title: 'Order Daily', desc: 'Place bulk orders via app or WhatsApp before 8 PM' },
              { step: '4', icon: 'truck-fast', title: 'Morning Delivery', desc: 'Fresh-cut items delivered by 5-7 AM next day' },
            ].map((item, idx) => (
              <View key={item.step} style={[styles.stepRow, idx < 3 && styles.stepBorder]}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                <View style={styles.stepIconWrap}>
                  <Icon name={item.icon as any} size={22} color={COLORS.primary} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, themed.textPrimary]}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* B2B Plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Choose Your Plan</Text>
          {B2B_PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, themed.card, plan.popular && styles.planCardPopular]}
              activeOpacity={0.8}
              onPress={() => { setSelectedPlan(plan); setShowEnquiry(true); }}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIconWrap, { backgroundColor: plan.bg }]}>
                  <Icon name={plan.icon as any} size={24} color={plan.color} />
                </View>
                <View style={styles.planHeaderInfo}>
                  <Text style={[styles.planName, themed.textPrimary]}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                </View>
                <Text style={[styles.planPrice, { color: plan.color }]}>{plan.priceLabel}</Text>
              </View>
              <View style={styles.planFeatures}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Icon name="check-circle" size={14} color={plan.color} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.planCta, { backgroundColor: plan.bg }]}
                onPress={() => { setSelectedPlan(plan); setShowEnquiry(true); }}
              >
                <Text style={[styles.planCtaText, { color: plan.color }]}>Get Started</Text>
                <Icon name="arrow-right" size={16} color={plan.color} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bulk Pricing Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Bulk Pricing</Text>
            <TouchableOpacity onPress={() => setShowPricing(true)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {BULK_PRODUCTS.slice(0, 5).map((product) => {
            const savings = Math.round(((product.retailPrice - product.b2bPrice) / product.retailPrice) * 100);
            return (
              <View key={product.id} style={[styles.priceRow, themed.card]}>
                <View style={styles.priceLeft}>
                  <Icon name={product.icon as any} size={18} color={COLORS.primary} />
                  <View>
                    <Text style={[styles.priceName, themed.textPrimary]}>{product.name}</Text>
                    <Text style={styles.priceUnit}>Min {product.minQty} {product.unit}</Text>
                  </View>
                </View>
                <View style={styles.priceRight}>
                  <Text style={styles.retailPrice}>{'\u20B9'}{product.retailPrice}/{product.unit}</Text>
                  <Text style={styles.b2bPrice}>{'\u20B9'}{product.b2bPrice}/{product.unit}</Text>
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{savings}% off</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Trusted by Businesses</Text>
          {[
            { name: 'Hotel Annapoorna', type: 'Restaurant Chain', quote: 'We save 2 hours of prep time daily. The pre-cut quality is consistently excellent.', rating: 5 },
            { name: 'FreshBowl Cloud Kitchen', type: 'Cloud Kitchen', quote: 'B2B pricing saves us ₹15,000+ per month. Morning delivery means everything is fresh for lunch rush.', rating: 5 },
            { name: 'Sai Hostel Mess', type: 'Hostel', quote: 'Feeding 200 students daily is so much easier now. Bulk sambar packs are a lifesaver!', rating: 4 },
          ].map((t) => (
            <View key={t.name} style={[styles.testimonialCard, themed.card]}>
              <View style={styles.testimonialHeader}>
                <View style={styles.testimonialAvatar}>
                  <Text style={styles.testimonialAvatarText}>{t.name.charAt(0)}</Text>
                </View>
                <View style={styles.testimonialInfo}>
                  <Text style={[styles.testimonialName, themed.textPrimary]}>{t.name}</Text>
                  <Text style={styles.testimonialType}>{t.type}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Icon key={s} name={s <= t.rating ? 'star' : 'star-outline'} size={12} color="#FFA726" />
                  ))}
                </View>
              </View>
              <Text style={styles.testimonialQuote}>"{t.quote}"</Text>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottomCta}>
          <LinearGradient colors={['#1A237E', '#283593']} style={styles.bottomCtaGrad}>
            <Icon name="phone-in-talk" size={28} color="#FFF" />
            <Text style={styles.bottomCtaTitle}>Ready to get started?</Text>
            <Text style={styles.bottomCtaSub}>Call us at +91 98765 43210 or register below</Text>
            <TouchableOpacity style={styles.bottomCtaBtn} onPress={() => setShowEnquiry(true)} activeOpacity={0.85}>
              <Text style={styles.bottomCtaBtnText}>Register Now</Text>
              <Icon name="arrow-right" size={18} color="#1A237E" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Enquiry Modal ── */}
      <Modal visible={showEnquiry} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.textPrimary]}>Business Registration</Text>
            <TouchableOpacity onPress={() => setShowEnquiry(false)} style={styles.modalClose}>
              <Icon name="close" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {selectedPlan && (
              <View style={[styles.selectedPlanBanner, { backgroundColor: selectedPlan.bg }]}>
                <Icon name={selectedPlan.icon as any} size={20} color={selectedPlan.color} />
                <Text style={[styles.selectedPlanText, { color: selectedPlan.color }]}>
                  {selectedPlan.name} Plan — {selectedPlan.priceLabel}
                </Text>
              </View>
            )}

            <Text style={styles.formLabel}>Business Name *</Text>
            <TextInput style={[styles.input, themed.inputBg]} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Hotel Annapoorna" placeholderTextColor={COLORS.text.muted} />

            <Text style={styles.formLabel}>Contact Person *</Text>
            <TextInput style={[styles.input, themed.inputBg]} value={contactPerson} onChangeText={setContactPerson} placeholder="Full name" placeholderTextColor={COLORS.text.muted} />

            <Text style={styles.formLabel}>Phone Number *</Text>
            <TextInput style={[styles.input, themed.inputBg]} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={COLORS.text.muted} keyboardType="phone-pad" />

            <Text style={styles.formLabel}>Email</Text>
            <TextInput style={[styles.input, themed.inputBg]} value={email} onChangeText={setEmail} placeholder="business@email.com" placeholderTextColor={COLORS.text.muted} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.formLabel}>Business Type *</Text>
            <View style={styles.typeGrid}>
              {BUSINESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeChip, businessType === type.key && { backgroundColor: type.bg, borderColor: type.color }]}
                  onPress={() => setBusinessType(type.key)}
                >
                  <Icon name={type.icon as any} size={16} color={businessType === type.key ? type.color : COLORS.text.muted} />
                  <Text style={[styles.typeChipText, businessType === type.key && { color: type.color }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Daily Requirement (approx kg)</Text>
            <TextInput style={[styles.input, themed.inputBg]} value={dailyRequirement} onChangeText={setDailyRequirement} placeholder="e.g. 50" placeholderTextColor={COLORS.text.muted} keyboardType="numeric" />

            <Text style={styles.formLabel}>Business Address</Text>
            <TextInput style={[styles.input, styles.inputMulti, themed.inputBg]} value={address} onChangeText={setAddress} placeholder="Full address with landmark" placeholderTextColor={COLORS.text.muted} multiline numberOfLines={3} textAlignVertical="top" />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitEnquiry} activeOpacity={0.85}>
              <LinearGradient colors={['#1A237E', '#3949AB']} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="send-check" size={20} color="#FFF" />
                <Text style={styles.submitBtnText}>Submit Enquiry</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Full Pricing Modal ── */}
      <Modal visible={showPricing} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.textPrimary]}>B2B Pricing List</Text>
            <TouchableOpacity onPress={() => setShowPricing(false)} style={styles.modalClose}>
              <Icon name="close" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.pricingNote}>
              <Icon name="information-outline" size={16} color="#1565C0" />
              <Text style={styles.pricingNoteText}>Prices are for Growth plan. Starter & Enterprise pricing may vary.</Text>
            </View>

            {BULK_PRODUCTS.map((product) => {
              const savings = Math.round(((product.retailPrice - product.b2bPrice) / product.retailPrice) * 100);
              return (
                <View key={product.id} style={[styles.priceRow, themed.card]}>
                  <View style={styles.priceLeft}>
                    <Icon name={product.icon as any} size={18} color={COLORS.primary} />
                    <View>
                      <Text style={[styles.priceName, themed.textPrimary]}>{product.name}</Text>
                      <Text style={styles.priceUnit}>Min {product.minQty} {product.unit} · {product.category}</Text>
                    </View>
                  </View>
                  <View style={styles.priceRight}>
                    <Text style={styles.retailPrice}>{'\u20B9'}{product.retailPrice}/{product.unit}</Text>
                    <Text style={styles.b2bPrice}>{'\u20B9'}{product.b2bPrice}/{product.unit}</Text>
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{savings}% off</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 20 },

  /* Header */
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  /* Hero */
  hero: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl + 10, marginTop: -1 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', lineHeight: 36, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: SPACING.sm, lineHeight: 22 },
  heroStatsRow: { flexDirection: 'row', marginTop: SPACING.xl, gap: SPACING.sm },
  heroStat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.lg, paddingVertical: SPACING.md },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 4 },
  heroStatLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroCta: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.xl },
  heroCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16 },
  heroCtaText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  /* Section */
  section: { paddingHorizontal: SPACING.base, marginTop: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: SPACING.md, letterSpacing: -0.3 },
  seeAllText: { fontSize: 13, fontWeight: '700', color: '#1A237E' },

  /* Business Types Grid */
  businessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  businessCard: { width: (SCREEN_WIDTH - 32 - 16) / 3, alignItems: 'center', paddingVertical: SPACING.md, borderRadius: RADIUS.lg, ...SHADOW.sm },
  businessIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  businessLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  /* How It Works */
  howItWorksCard: { borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOW.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A237E', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  stepIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.backgroundSoft, alignItems: 'center', justifyContent: 'center' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepDesc: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },

  /* Plans */
  planCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOW.sm, position: 'relative' },
  planCardPopular: { borderWidth: 2, borderColor: '#E65100' },
  popularBadge: { position: 'absolute', top: -1, right: 20, backgroundColor: '#E65100', paddingHorizontal: SPACING.md, paddingVertical: 3, borderBottomLeftRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm },
  popularBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.base },
  planIconWrap: { width: 48, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  planHeaderInfo: { flex: 1 },
  planName: { fontSize: 18, fontWeight: '800' },
  planDesc: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  planPrice: { fontSize: 14, fontWeight: '800' },
  planFeatures: { gap: SPACING.xs + 2, marginBottom: SPACING.base },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  featureText: { fontSize: 13, color: COLORS.text.secondary, fontWeight: '500' },
  planCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.lg },
  planCtaText: { fontSize: 14, fontWeight: '700' },

  /* Pricing */
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, ...SHADOW.sm },
  priceLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  priceName: { fontSize: 13, fontWeight: '700' },
  priceUnit: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  priceRight: { alignItems: 'flex-end' },
  retailPrice: { fontSize: 11, color: COLORS.text.muted, textDecorationLine: 'line-through' },
  b2bPrice: { fontSize: 15, fontWeight: '800', color: '#1A237E', marginTop: 1 },
  savingsBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  savingsText: { fontSize: 9, fontWeight: '700', color: '#2E7D32' },

  /* Testimonials */
  testimonialCard: { borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, ...SHADOW.sm },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  testimonialAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  testimonialAvatarText: { fontSize: 15, fontWeight: '800', color: '#1565C0' },
  testimonialInfo: { flex: 1 },
  testimonialName: { fontSize: 13, fontWeight: '700' },
  testimonialType: { fontSize: 11, color: COLORS.text.muted },
  testimonialQuote: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 20, fontStyle: 'italic' },

  /* Bottom CTA */
  bottomCta: { paddingHorizontal: SPACING.base, marginTop: SPACING.xl },
  bottomCtaGrad: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center' },
  bottomCtaTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: SPACING.md },
  bottomCtaSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: SPACING.xs, textAlign: 'center' },
  bottomCtaBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#FFF', paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.full, marginTop: SPACING.lg },
  bottomCtaBtnText: { fontSize: 15, fontWeight: '800', color: '#1A237E' },

  /* Modal */
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  modalScroll: { flex: 1, paddingHorizontal: SPACING.lg },

  /* Selected Plan Banner */
  selectedPlanBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.md },
  selectedPlanText: { fontSize: 14, fontWeight: '700' },

  /* Form */
  formLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, marginTop: SPACING.base, marginBottom: SPACING.xs },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, fontSize: 14, color: COLORS.text.primary, backgroundColor: '#FAFAFA' },
  inputMulti: { minHeight: 80 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#FAFAFA' },
  typeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text.muted },

  /* Submit */
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.xl },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  /* Pricing Note */
  pricingNote: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#E3F2FD', padding: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.md, marginBottom: SPACING.md },
  pricingNoteText: { fontSize: 12, color: '#1565C0', fontWeight: '500', flex: 1 },
});
