import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, TextInput, Modal } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

interface Address {
  id: string;
  label: string;
  icon: string;
  address: string;
  isDefault: boolean;
}

const INITIAL_ADDRESSES: Address[] = [
  { id: '1', label: 'Home', icon: 'home', address: '42, Anna Nagar, 3rd Street, Coimbatore - 641018', isDefault: true },
  { id: '2', label: 'Office', icon: 'office-building', address: '15, Gandhipuram, IT Park Road, Coimbatore - 641012', isDefault: false },
];

export default function AddressesScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const handleAdd = () => {
    if (!newLabel.trim() || !newAddress.trim()) return;
    const id = String(Date.now());
    setAddresses(prev => [...prev, { id, label: newLabel.trim(), icon: 'map-marker', address: newAddress.trim(), isDefault: false }]);
    setNewLabel('');
    setNewAddress('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  };

  const renderAddress = ({ item }: { item: Address }) => (
    <View style={[styles.addressCard, themed.card, item.isDefault && styles.addressCardDefault]}>
      <View style={styles.addressHeader}>
        <View style={[styles.addressIcon, { backgroundColor: item.isDefault ? '#E8F5E9' : '#F5F5F5' }]}>
          <Icon name={item.icon as any} size={20} color={item.isDefault ? COLORS.primary : COLORS.text.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.labelRow}>
            <Text style={styles.addressLabel}>{item.label}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>
            )}
          </View>
          <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
        </View>
      </View>
      <View style={styles.addressActions}>
        {!item.isDefault && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetDefault(item.id)}>
            <Icon name="check-circle-outline" size={16} color={COLORS.green} />
            <Text style={[styles.actionText, { color: COLORS.green }]}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Icon name="delete-outline" size={16} color={COLORS.status.error} />
          <Text style={[styles.actionText, { color: COLORS.status.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
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
            <Text style={[styles.headerTitle, themed.textPrimary]}>Delivery Addresses</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={addresses}
        keyExtractor={i => i.id}
        renderItem={renderAddress}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="map-marker-off-outline" size={48} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>No saved addresses</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Icon name="plus" size={20} color="#FFF" />
        <Text style={styles.addBtnText}>Add New Address</Text>
      </TouchableOpacity>

      {/* Add Address Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Address</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}><Icon name="close" size={24} color={COLORS.text.primary} /></TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g. Home, Office)"
              placeholderTextColor={COLORS.text.muted}
              value={newLabel}
              onChangeText={setNewLabel}
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Full address"
              placeholderTextColor={COLORS.text.muted}
              value={newAddress}
              onChangeText={setNewAddress}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
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
  list: { padding: SPACING.base, paddingBottom: 100 },
  addressCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base,
    marginBottom: SPACING.sm, ...SHADOW.sm, borderWidth: 1.5, borderColor: 'transparent',
  },
  addressCardDefault: { borderColor: COLORS.primary },
  addressHeader: { flexDirection: 'row', gap: 12 },
  addressIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  defaultBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  addressText: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4, lineHeight: 17 },
  addressActions: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '600' },
  addBtn: {
    position: 'absolute', bottom: 40, left: SPACING.base, right: SPACING.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 14,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.base, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text.primary },
  input: { backgroundColor: COLORS.backgroundSoft, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: 14, color: COLORS.text.primary, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.sm },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
