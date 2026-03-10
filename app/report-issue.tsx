import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

const ISSUE_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'wrong_item', label: 'Wrong Item', icon: 'swap-horizontal' },
  { key: 'quality', label: 'Quality Issue', icon: 'alert-circle' },
  { key: 'missing_item', label: 'Missing Item', icon: 'package-variant-minus' },
  { key: 'late_delivery', label: 'Late Delivery', icon: 'clock-alert' },
  { key: 'damaged', label: 'Damaged Items', icon: 'package-variant-closed' },
  { key: 'other', label: 'Other', icon: 'dots-horizontal' },
];

const RESOLUTIONS = ['Refund', 'Replacement', 'Credit to Wallet', 'Other'];

export default function ReportIssueScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);

  const handleAddPhotos = () => {
    Alert.alert('Add Photos', 'Camera will open to capture photos of the issue.');
  };

  const handleSubmit = () => {
    if (!selectedType) {
      Alert.alert('Select Issue Type', 'Please select the type of issue you are facing.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add Description', 'Please describe the issue in detail.');
      return;
    }

    const reference = `ISS-${Date.now()}`;
    Alert.alert(
      'Issue Reported!',
      `Our team will review within 24 hours.\nReference: ${reference}`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

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
            <Text style={[styles.headerTitle, themed.textPrimary]}>Report an Issue</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Order reference */}
        {orderId && (
          <View style={[styles.orderRefCard, themed.card, themed.borderColor]}>
            <Icon name="receipt" size={18} color={themed.colors.primary} />
            <Text style={[styles.orderRefText, themed.textSecondary]}>
              Order <Text style={[styles.orderRefId, themed.textPrimary]}>#{orderId}</Text>
            </Text>
          </View>
        )}

        {/* Issue Type Selector */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>What went wrong?</Text>
          <View style={styles.issueGrid}>
            {ISSUE_TYPES.map((type) => {
              const isSelected = selectedType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.issueCard,
                    themed.borderColor,
                    isSelected && styles.issueCardSelected,
                  ]}
                  onPress={() => setSelectedType(type.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.issueIconWrap, isSelected && styles.issueIconWrapSelected]}>
                    <Icon
                      name={type.icon as any}
                      size={24}
                      color={isSelected ? COLORS.primary : themed.colors.text.muted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.issueLabel,
                      isSelected ? styles.issueLabelSelected : themed.textSecondary,
                    ]}
                    numberOfLines={2}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Describe the Issue</Text>
          <TextInput
            style={[styles.descriptionInput, themed.inputBg]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail..."
            placeholderTextColor={COLORS.text.muted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Photo Section */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Add Photos</Text>
          <TouchableOpacity style={[styles.addPhotoBtn, themed.borderColor]} onPress={handleAddPhotos} activeOpacity={0.7}>
            <Icon name="camera-plus-outline" size={28} color={themed.colors.text.muted} />
            <Text style={[styles.addPhotoText, themed.textMuted]}>Tap to add photos</Text>
          </TouchableOpacity>
        </View>

        {/* Expected Resolution */}
        <View style={[styles.sectionCard, themed.card]}>
          <Text style={[styles.sectionTitle, themed.textPrimary]}>Expected Resolution</Text>
          <View style={styles.chipRow}>
            {RESOLUTIONS.map((res) => {
              const isActive = selectedResolution === res;
              return (
                <TouchableOpacity
                  key={res}
                  style={[
                    styles.chip,
                    themed.borderColor,
                    isActive && themed.chipActive,
                  ]}
                  onPress={() => setSelectedResolution(res)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : themed.textSecondary]}>
                    {res}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
          <LinearGradient colors={themed.primaryGradient} style={styles.submitGrad}>
            <Icon name="send-check" size={20} color="#FFF" />
            <Text style={styles.submitBtnText}>Submit Report</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={[styles.infoCard, themed.softBg]}>
          <Icon name="information-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.infoText, themed.textSecondary]}>
            Our team reviews all issues within 24 hours. Refunds are processed to your wallet within 48 hours.
          </Text>
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

  // Order reference
  orderRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderRefText: { fontSize: 13, color: COLORS.text.secondary },
  orderRefId: { fontWeight: '700', color: COLORS.text.primary },

  // Sections
  sectionCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },

  // Issue type grid
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  issueCard: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  issueCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundSoft,
  },
  issueIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  issueIconWrapSelected: {
    backgroundColor: '#E8F5E9',
  },
  issueLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text.secondary, textAlign: 'center' },
  issueLabelSelected: { color: COLORS.primary, fontWeight: '700' },

  // Description
  descriptionInput: {
    minHeight: 100,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: '#F7F7F7',
    lineHeight: 20,
  },

  // Photo
  addPhotoBtn: {
    height: 100,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
  },
  addPhotoText: { fontSize: 13, color: COLORS.text.muted },

  // Resolution chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Submit
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.md },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 },
});
