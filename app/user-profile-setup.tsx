import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useDiet } from '@/context/DietContext';
import { useAuth } from '@/context/AuthContext';
import type { UserGender, UserCategory, UserLifestyle } from '@/context/DietContext';

/* ─── Category Options ─── */
const CATEGORIES: { value: UserCategory; label: string; icon: string; desc: string; color: string; gender?: UserGender }[] = [
  { value: 'hostel_girl', label: 'Hostel Girl', icon: 'school', desc: 'Budget meals, skincare & period care', color: '#E91E63', gender: 'female' },
  { value: 'hostel_boy', label: 'Hostel Boy', icon: 'school', desc: 'Budget meals, energy & daily essentials', color: '#1565C0', gender: 'male' },
  { value: 'gym_male', label: 'Gym Boy', icon: 'dumbbell', desc: 'Muscle building, protein & fitness diet', color: '#E53935', gender: 'male' },
  { value: 'gym_female', label: 'Gym Girl', icon: 'dumbbell', desc: 'Fitness, toning & lean body diet', color: '#D81B60', gender: 'female' },
  { value: 'parent', label: 'Parent', icon: 'human-male-female-child', desc: 'Family nutrition, kids & pregnancy care', color: '#7B1FA2' },
  { value: 'caretaker', label: 'Caretaker', icon: 'hand-heart', desc: 'Patient diet, elderly care & health support', color: '#00897B' },
  { value: 'working_pro', label: 'Working Professional', icon: 'briefcase', desc: 'Quick meals, energy & stress relief', color: '#2E7D32' },
  { value: 'homemaker', label: 'Homemaker', icon: 'home-heart', desc: 'Family cooking, daily veggies & savings', color: '#F57C00' },
];

const HEALTH_GOALS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'lose_weight', label: 'Lose Weight', icon: 'scale-bathroom', color: '#FF7043' },
  { id: 'build_muscle', label: 'Build Muscle', icon: 'arm-flex', color: '#E53935' },
  { id: 'heart_health', label: 'Heart Health', icon: 'heart-pulse', color: '#C62828' },
  { id: 'manage_diabetes', label: 'Manage Diabetes', icon: 'medical-bag', color: '#1565C0' },
  { id: 'improve_immunity', label: 'Immunity Boost', icon: 'shield-check', color: '#7B1FA2' },
  { id: 'skin_care', label: 'Skin & Glow', icon: 'face-woman-shimmer', color: '#E91E63' },
  { id: 'hair_care', label: 'Hair Health', icon: 'hair-dryer', color: '#5D4037' },
  { id: 'period_care', label: 'Period Support', icon: 'heart-circle', color: '#AD1457' },
  { id: 'pregnancy', label: 'Pregnancy Care', icon: 'baby-carriage', color: '#8E24AA' },
  { id: 'general_wellness', label: 'General Wellness', icon: 'meditation', color: '#2E7D32' },
];

/* ─── Category → Relevant Goals Mapping ─── */
const CATEGORY_GOALS: Record<string, string[]> = {
  gym_male: ['build_muscle', 'lose_weight', 'improve_immunity', 'heart_health', 'general_wellness'],
  gym_female: ['build_muscle', 'lose_weight', 'improve_immunity', 'heart_health', 'skin_care', 'general_wellness'],
  hostel_girl: ['general_wellness', 'improve_immunity', 'skin_care', 'hair_care', 'period_care', 'lose_weight'],
  hostel_boy: ['general_wellness', 'improve_immunity', 'build_muscle', 'lose_weight'],
  parent: ['general_wellness', 'improve_immunity', 'heart_health', 'manage_diabetes', 'pregnancy', 'hair_care', 'skin_care'],
  caretaker: ['general_wellness', 'improve_immunity', 'heart_health', 'manage_diabetes'],
  working_pro: ['general_wellness', 'improve_immunity', 'lose_weight', 'heart_health', 'manage_diabetes', 'skin_care'],
  homemaker: ['general_wellness', 'improve_immunity', 'heart_health', 'manage_diabetes', 'skin_care', 'hair_care', 'pregnancy', 'period_care'],
};

const GENDER_OPTIONS: { value: UserGender; label: string; icon: string; color: string }[] = [
  { value: 'male', label: 'Male', icon: 'human-male', color: '#1976D2' },
  { value: 'female', label: 'Female', icon: 'human-female', color: '#E91E63' },
  { value: 'other', label: 'Other', icon: 'human-non-binary', color: '#7B1FA2' },
];

/* ─── Screen ─── */
export default function UserProfileSetupScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { setFullProfile } = useDiet();
  const { updateUser } = useAuth();

  const [step, setStep] = useState(1); // 1: Category, 2: Details + Gender, 3: Goals
  const [category, setCategory] = useState<UserCategory>('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<UserGender>('');
  const [goals, setGoals] = useState<string[]>([]);

  const selectedCat = CATEGORIES.find(c => c.value === category);

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  // Auto-set gender from category if available + reset goals when category changes
  const onSelectCategory = (cat: UserCategory) => {
    setCategory(cat);
    setGoals([]); // Reset goals when category changes since available goals differ
    const found = CATEGORIES.find(c => c.value === cat);
    if (found?.gender) setGender(found.gender);
  };

  const getLifestyle = (): UserLifestyle => {
    if (!category) return '';
    if (category.startsWith('gym')) return 'gym';
    if (category.startsWith('hostel')) return 'student';
    if (category === 'working_pro') return 'working';
    if (category === 'homemaker') return 'homemaker';
    return '';
  };

  const handleFinish = async () => {
    if (!category || !name.trim()) return;
    await setFullProfile({
      userName: name.trim(),
      userAge: age.trim(),
      gender,
      userCategory: category,
      lifestyle: getLifestyle(),
      healthGoals: goals,
    });
    // Sync name to AuthContext so profile screen shows it
    await updateUser({ name: name.trim() });
    router.replace('/(tabs)' as any);
  };

  // Filter goals based on selected category
  const filteredGoals = category
    ? HEALTH_GOALS.filter(g => (CATEGORY_GOALS[category] || []).includes(g.id))
    : HEALTH_GOALS;

  const canProceed = () => {
    if (step === 1) return !!category;
    if (step === 2) return name.trim().length >= 2 && !!gender;
    if (step === 3) return true; // goals optional
    return false;
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {step > 1 ? (
            <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.headerBtn}>
              <Icon name="arrow-left" size={22} color={themed.colors.text.primary} />
            </TouchableOpacity>
          ) : <View style={styles.headerBtn} />}

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3].map(s => (
              <View key={s} style={[styles.dot, s <= step && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.headerBtn} />
        </View>

        {/* Progress */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ━━━ STEP 1: Category ━━━ */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <LinearGradient colors={['#43A047', '#66BB6A']} style={styles.stepIconBg}>
                  <Icon name="account-group" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, themed.textPrimary]}>Who are you?</Text>
              <Text style={styles.stepDesc}>Pick the category that best describes you — we'll personalize everything for you!</Text>

              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => {
                  const selected = category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.catCard, selected && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.color + '0D' }]}
                      onPress={() => onSelectCategory(cat.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.catIconWrap, { backgroundColor: selected ? cat.color : '#F0F0F0' }]}>
                        <Icon name={cat.icon as any} size={22} color={selected ? '#FFF' : '#9E9E9E'} />
                      </View>
                      <Text style={[styles.catLabel, selected && { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
                      <Text style={styles.catDesc} numberOfLines={2}>{cat.desc}</Text>
                      {selected && <Icon name="check-circle" size={16} color={cat.color} style={{ position: 'absolute', top: 6, right: 6 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ━━━ STEP 2: Name, Age, Gender ━━━ */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <LinearGradient colors={[selectedCat?.color || '#43A047', (selectedCat?.color || '#66BB6A') + 'CC']} style={styles.stepIconBg}>
                  <Icon name={selectedCat?.icon as any || 'account'} size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, themed.textPrimary]}>Your Details</Text>
              <Text style={styles.stepDesc}>Hey {selectedCat?.label}! Tell us a bit more about yourself</Text>

              {/* Category badge */}
              <View style={[styles.selectedBadge, { backgroundColor: (selectedCat?.color || COLORS.primary) + '15', borderColor: selectedCat?.color || COLORS.primary }]}>
                <Icon name={selectedCat?.icon as any || 'account'} size={16} color={selectedCat?.color} />
                <Text style={[styles.selectedBadgeText, { color: selectedCat?.color }]}>{selectedCat?.label}</Text>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <Icon name="pencil" size={14} color={selectedCat?.color} />
                </TouchableOpacity>
              </View>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, themed.textPrimary]}>Your Name *</Text>
                <View style={[styles.inputWrap, themed.card]}>
                  <Icon name="account-outline" size={20} color={COLORS.text.muted} />
                  <TextInput
                    style={[styles.input, themed.textPrimary]}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.text.muted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Age */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, themed.textPrimary]}>Your Age</Text>
                <View style={[styles.inputWrap, themed.card]}>
                  <Icon name="calendar-account-outline" size={20} color={COLORS.text.muted} />
                  <TextInput
                    style={[styles.input, themed.textPrimary]}
                    placeholder="Enter your age"
                    placeholderTextColor={COLORS.text.muted}
                    value={age}
                    onChangeText={t => setAge(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Gender — hidden when category has predefined gender */}
              {!selectedCat?.gender && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, themed.textPrimary]}>Gender *</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {GENDER_OPTIONS.map(opt => {
                    const selected = gender === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.genderCard, selected && { borderColor: opt.color, borderWidth: 2, backgroundColor: opt.color + '10' }]}
                        onPress={() => setGender(opt.value)}
                        activeOpacity={0.7}
                      >
                        <Icon name={opt.icon as any} size={22} color={selected ? opt.color : '#9E9E9E'} />
                        <Text style={[styles.genderLabel, selected && { color: opt.color, fontWeight: '800' }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              )}

              {/* Suggestion tip */}
              <View style={[styles.tipCard, { borderLeftColor: selectedCat?.color || COLORS.primary }]}>
                <Icon name="lightbulb-on" size={16} color="#F57C00" />
                <Text style={styles.tipText}>
                  {category === 'hostel_girl' && 'We\'ll suggest period care, skincare nutrition, budget meals & daily essentials for you'}
                  {category === 'hostel_boy' && 'We\'ll suggest budget daily meals, energy foods & student-friendly packs for you'}
                  {category === 'gym_male' && 'We\'ll suggest high-protein, muscle gain & pre-workout nutrition plans for you'}
                  {category === 'gym_female' && 'We\'ll suggest lean body, toning & fitness nutrition plans for you'}
                  {category === 'parent' && 'We\'ll suggest family nutrition, kids health & pregnancy care plans for you'}
                  {category === 'caretaker' && 'We\'ll suggest patient diet, elderly care & health recovery plans for you'}
                  {category === 'working_pro' && 'We\'ll suggest quick healthy meals, energy & stress relief plans for you'}
                  {category === 'homemaker' && 'We\'ll suggest daily cooking veggies, family packs & savings plans for you'}
                </Text>
              </View>
            </View>
          )}

          {/* ━━━ STEP 3: Goals ━━━ */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.stepIconWrap}>
                <LinearGradient colors={['#43A047', '#66BB6A']} style={styles.stepIconBg}>
                  <Icon name="target" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={[styles.stepTitle, themed.textPrimary]}>What are your goals?</Text>
              <Text style={styles.stepDesc}>Select one or more — we'll suggest plans based on this (optional)</Text>

              <View style={styles.goalsGrid}>
                {filteredGoals.map(goal => {
                  const selected = goals.includes(goal.id);
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={[styles.goalCard, selected && { borderColor: goal.color, borderWidth: 2, backgroundColor: goal.color + '0D' }]}
                      onPress={() => toggleGoal(goal.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.goalIconWrap, { backgroundColor: selected ? goal.color : '#F0F0F0' }]}>
                        <Icon name={goal.icon as any} size={18} color={selected ? '#FFF' : '#9E9E9E'} />
                      </View>
                      <Text style={[styles.goalLabel, selected && { color: goal.color, fontWeight: '800' }]}>{goal.label}</Text>
                      {selected && <Icon name="check-circle" size={14} color={goal.color} style={{ position: 'absolute', top: 4, right: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {goals.length > 0 && (
                <View style={styles.selectedGoalsSummary}>
                  <Icon name="check-decagram" size={14} color={COLORS.primary} />
                  <Text style={styles.selectedGoalsText}>{goals.length} goal{goals.length > 1 ? 's' : ''} selected</Text>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && { opacity: 0.4 }]}
          onPress={step === 3 ? handleFinish : () => setStep(s => s + 1)}
          disabled={!canProceed()}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canProceed() ? ['#43A047', '#66BB6A'] : ['#BDBDBD', '#E0E0E0']}
            style={styles.nextBtnGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextBtnText}>{step === 3 ? "Let's Go!" : 'Continue'}</Text>
            <Icon name={step === 3 ? 'check-all' : 'arrow-right'} size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
        {step === 1 && (
          <Text style={styles.privacyText}>Your info stays private — only used to personalize your plans</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.base, paddingBottom: 20 },

  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 50, height: 36, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600', color: COLORS.text.muted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  progressTrack: { height: 3, backgroundColor: '#E0E0E0', borderRadius: 2, marginTop: 12, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },

  stepContent: { alignItems: 'center', paddingTop: 16 },
  stepIconWrap: { marginBottom: 16 },
  stepIconBg: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  stepDesc: { fontSize: 13, color: COLORS.text.muted, textAlign: 'center', marginBottom: 20, lineHeight: 18, paddingHorizontal: 10 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  catCard: {
    width: '47.5%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FFF',
  },
  catIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catLabel: { fontSize: 12, fontWeight: '800', color: COLORS.text.primary, textAlign: 'center' },
  catDesc: { fontSize: 9, color: COLORS.text.muted, textAlign: 'center', marginTop: 2, lineHeight: 12 },

  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, marginBottom: 20, alignSelf: 'center',
  },
  selectedBadgeText: { fontSize: 13, fontWeight: '700' },
  inputGroup: { width: '100%', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500', padding: 0 },
  genderCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FFF',
  },
  genderLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFDE7', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderLeftWidth: 3, width: '100%', marginTop: 4,
  },
  tipText: { flex: 1, fontSize: 12, color: '#5D4037', fontWeight: '500', lineHeight: 18 },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  goalCard: {
    width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FFF',
  },
  goalIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary, flex: 1 },
  selectedGoalsSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, backgroundColor: '#E8F5E9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  selectedGoalsText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  bottomBar: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, alignItems: 'center' },
  nextBtn: { width: '100%', borderRadius: RADIUS.lg, overflow: 'hidden' },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  privacyText: { fontSize: 11, color: COLORS.text.muted, textAlign: 'center', marginTop: 10 },
});
