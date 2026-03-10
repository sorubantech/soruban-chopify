import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useDiet } from '@/context/DietContext';
import { DIETARY_PRESETS } from '@/data/recipes';

// ─── Constants ───────────────────────────────────────────────
const COMMON_ALLERGENS = ['Nuts', 'Dairy', 'Gluten', 'Soy', 'Shellfish', 'Eggs', 'Mushroom'];

const HEALTH_GOALS: { id: string; label: string; icon: string }[] = [
  { id: 'lose_weight', label: 'Lose Weight', icon: 'scale-bathroom' },
  { id: 'build_muscle', label: 'Build Muscle', icon: 'arm-flex' },
  { id: 'heart_health', label: 'Heart Health', icon: 'heart-pulse' },
  { id: 'manage_diabetes', label: 'Manage Diabetes', icon: 'medical-bag' },
  { id: 'improve_immunity', label: 'Improve Immunity', icon: 'shield-check' },
  { id: 'general_wellness', label: 'General Wellness', icon: 'meditation' },
];

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

// ─── Screen ──────────────────────────────────────────────────
export default function DietPreferencesScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const {
    selectedDiets, allergies, healthGoals, familyMembers,
    setDietPreferences, setAllergies, setHealthGoals,
    addFamilyMember, removeFamilyMember,
  } = useDiet();

  // Local copies for editing before save
  const [localDiets, setLocalDiets] = useState<string[]>(selectedDiets);
  const [localAllergies, setLocalAllergies] = useState<string[]>(allergies);
  const [localGoals, setLocalGoals] = useState<string[]>(healthGoals);

  // Family member inline form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newDietPrefs, setNewDietPrefs] = useState<string[]>([]);

  // ── Toggle helpers ──
  const toggleItem = (list: string[], item: string): string[] =>
    list.includes(item) ? list.filter(i => i !== item) : [...list, item];

  // ── Save all ──
  const handleSave = async () => {
    try {
      await Promise.all([
        setDietPreferences(localDiets),
        setAllergies(localAllergies),
        setHealthGoals(localGoals),
      ]);
      Alert.alert('Saved', 'Your diet & health preferences have been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  // ── Add family member ──
  const handleAddMember = async () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter the member name.');
      return;
    }
    if (!newRelation) {
      Alert.alert('Required', 'Please select a relation.');
      return;
    }
    await addFamilyMember({
      name: newName.trim(),
      relation: newRelation,
      dietaryPreferences: newDietPrefs,
    });
    setNewName('');
    setNewRelation('');
    setNewDietPrefs([]);
    setShowAddForm(false);
  };

  // ── Delete family member ──
  const confirmRemoveMember = (id: string, name: string) => {
    Alert.alert('Remove Member', `Remove ${name} from your family list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFamilyMember(id) },
    ]);
  };

  // ── Section header helper ──
  const SectionTitle = ({ icon, title }: { icon: string; title: string }) => (
    <View style={styles.sectionHeader}>
      <Icon name={icon as any} size={22} color={themed.colors.primary} />
      <Text style={[styles.sectionTitle, themed.textPrimary]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['top']}>
      <StatusBar barStyle={themed.isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <LinearGradient colors={themed.headerGradient} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={themed.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themed.textPrimary]}>Diet & Health</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Dietary Preferences ── */}
        <SectionTitle icon="silverware-fork-knife" title="Dietary Preferences" />
        <View style={styles.cardGrid}>
          {DIETARY_PRESETS.map(preset => {
            const selected = localDiets.includes(preset.id);
            return (
              <TouchableOpacity
                key={preset.id}
                activeOpacity={0.7}
                onPress={() => setLocalDiets(toggleItem(localDiets, preset.id))}
                style={[
                  styles.dietCard, themed.card, SHADOW.sm,
                  selected && styles.dietCardSelected,
                ]}
              >
                <View style={[
                  styles.dietIconWrap,
                  { backgroundColor: selected ? COLORS.primaryLight + '30' : themed.colors.backgroundSoft },
                ]}>
                  <Icon
                    name={preset.icon as any}
                    size={26}
                    color={selected ? COLORS.primaryDark : themed.colors.text.muted}
                  />
                </View>
                <Text style={[styles.dietLabel, themed.textPrimary]}>{preset.label}</Text>
                <Text style={[styles.dietDesc, themed.textMuted]} numberOfLines={1}>
                  {preset.description}
                </Text>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Icon name="check-circle" size={18} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 2. Allergies ── */}
        <SectionTitle icon="alert-circle-outline" title="Allergies" />
        <View style={styles.chipRow}>
          {COMMON_ALLERGENS.map(allergen => {
            const selected = localAllergies.includes(allergen);
            return (
              <TouchableOpacity
                key={allergen}
                activeOpacity={0.7}
                onPress={() => setLocalAllergies(toggleItem(localAllergies, allergen))}
                style={[
                  styles.chip, themed.card,
                  selected && styles.chipSelected,
                ]}
              >
                {selected && <Icon name="close-circle" size={16} color={COLORS.status.error} style={{ marginRight: 4 }} />}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {allergen}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 3. Health Goals ── */}
        <SectionTitle icon="target" title="Health Goals" />
        <View style={styles.goalGrid}>
          {HEALTH_GOALS.map(goal => {
            const selected = localGoals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                activeOpacity={0.7}
                onPress={() => setLocalGoals(toggleItem(localGoals, goal.id))}
                style={[
                  styles.goalCard, themed.card, SHADOW.sm,
                  selected && styles.goalCardSelected,
                ]}
              >
                <Icon
                  name={goal.icon as any}
                  size={28}
                  color={selected ? COLORS.primaryDark : themed.colors.text.muted}
                />
                <Text
                  style={[
                    styles.goalLabel,
                    { color: selected ? COLORS.primaryDark : themed.colors.text.primary },
                  ]}
                  numberOfLines={2}
                >
                  {goal.label}
                </Text>
                {selected && (
                  <View style={styles.goalCheck}>
                    <Icon name="check" size={14} color={COLORS.text.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 4. Family Members ── */}
        <SectionTitle icon="account-group" title="Family Members" />

        {familyMembers.map(member => (
          <View key={member.id} style={[styles.memberCard, themed.card, SHADOW.sm]}>
            <View style={styles.memberInfo}>
              <View style={styles.memberAvatar}>
                <Icon name="account" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, themed.textPrimary]}>{member.name}</Text>
                <Text style={[styles.memberRelation, themed.textSecondary]}>{member.relation}</Text>
                {member.dietaryPreferences && member.dietaryPreferences.length > 0 && (
                  <View style={styles.memberDietRow}>
                    {member.dietaryPreferences.map(d => (
                      <View key={d} style={[styles.miniChip, { backgroundColor: themed.colors.backgroundSoft }]}>
                        <Text style={[styles.miniChipText, { color: themed.colors.primary }]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => confirmRemoveMember(member.id, member.name)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="trash-can-outline" size={22} color={COLORS.status.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add member form */}
        {showAddForm ? (
          <View style={[styles.addFormCard, themed.card, SHADOW.md]}>
            <Text style={[styles.addFormTitle, themed.textPrimary]}>New Family Member</Text>

            <TextInput
              style={[styles.input, themed.inputBg]}
              placeholder="Name"
              placeholderTextColor={themed.colors.text.muted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.fieldLabel, themed.textSecondary]}>Relation</Text>
            <View style={styles.chipRow}>
              {RELATIONS.map(r => {
                const selected = newRelation === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setNewRelation(r)}
                    style={[styles.chip, themed.card, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, themed.textSecondary]}>Dietary Preferences</Text>
            <View style={styles.chipRow}>
              {DIETARY_PRESETS.map(preset => {
                const selected = newDietPrefs.includes(preset.id);
                return (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => setNewDietPrefs(toggleItem(newDietPrefs, preset.id))}
                    style={[styles.chip, themed.card, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.addFormActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddForm(false); setNewName(''); setNewRelation(''); setNewDietPrefs([]); }}
              >
                <Text style={[styles.cancelBtnText, { color: themed.colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddMember}>
                <LinearGradient colors={themed.primaryGradient} style={styles.confirmBtnGrad}>
                  <Icon name="check" size={18} color="#FFF" />
                  <Text style={styles.confirmBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addMemberBtn, { borderColor: themed.colors.primary }]}
            onPress={() => setShowAddForm(true)}
          >
            <Icon name="plus-circle-outline" size={22} color={themed.colors.primary} />
            <Text style={[styles.addMemberText, { color: themed.colors.primary }]}>Add Member</Text>
          </TouchableOpacity>
        )}

        {/* ── 5. Save Button ── */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleSave} style={styles.saveWrap}>
          <LinearGradient colors={themed.primaryGradient} style={styles.saveBtn}>
            <Icon name="content-save-check-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Save Preferences</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.base, paddingTop: SPACING.md },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginLeft: SPACING.sm },

  // ── Dietary Preset Cards ──
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  dietCard: {
    width: '47%' as any, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  dietCardSelected: {
    borderColor: COLORS.primary, backgroundColor: COLORS.greenLight,
  },
  dietIconWrap: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  dietLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  dietDesc: { fontSize: 12 },
  checkBadge: { position: 'absolute', top: 8, right: 8 },

  // ── Chips (allergies, relations) ──
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipSelected: {
    borderColor: COLORS.primary, backgroundColor: COLORS.greenLight,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.text.secondary },
  chipTextSelected: { color: COLORS.primaryDark, fontWeight: '600' },

  // ── Health Goal Cards ──
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  goalCard: {
    width: '30%' as any, borderRadius: RADIUS.lg, padding: SPACING.md,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  goalCardSelected: {
    borderColor: COLORS.primary, backgroundColor: COLORS.greenLight,
  },
  goalLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: SPACING.xs },
  goalCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Family Member Card ──
  memberCard: {
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.greenLight, alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberRelation: { fontSize: 13, marginTop: 2 },
  memberDietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  miniChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full,
  },
  miniChipText: { fontSize: 11, fontWeight: '600' },

  // ── Add Member ──
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, marginTop: SPACING.sm,
  },
  addMemberText: { fontSize: 15, fontWeight: '600', marginLeft: SPACING.sm },

  // ── Add Form ──
  addFormCard: {
    borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.sm,
  },
  addFormTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: SPACING.md, marginBottom: SPACING.sm },
  input: {
    borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, fontSize: 15,
  },
  addFormActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.lg,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmBtnGrad: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2,
  },
  confirmBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 6 },

  // ── Save Button ──
  saveWrap: { marginTop: SPACING.xxl },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md + 2, borderRadius: RADIUS.lg,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
