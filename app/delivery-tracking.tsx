import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated, Linking, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useOrders } from '@/context/OrderContext';

const DELIVERY_PARTNER = {
  name: 'Rajesh Kumar',
  phone: '+91 98765 43210',
  rating: 4.8,
  totalDeliveries: 1240,
  vehicle: 'Bike',
  vehicleNumber: 'TN 38 AB 1234',
  avatar: 'R',
};

// Simulated route steps - like Blinkit/BigBasket
const ROUTE_STEPS = [
  { id: 1, label: 'Order Picked Up', sublabel: 'Partner picked up your order from store', icon: 'store', duration: 0 },
  { id: 2, label: 'On the Way', sublabel: 'Heading towards your location', icon: 'bike-fast', duration: 3 },
  { id: 3, label: 'Nearby', sublabel: 'Almost at your doorstep', icon: 'map-marker-radius', duration: 2 },
  { id: 4, label: 'Arrived', sublabel: 'Delivery partner has arrived', icon: 'map-marker-check', duration: 1 },
];

export default function DeliveryTrackingScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useOrders();
  const order = useMemo(() => orders.find(o => o.id === id), [orders, id]);

  // Simulated tracking state
  const [currentStep, setCurrentStep] = useState(1);
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [deliveryProgress, setDeliveryProgress] = useState(0.25);
  const [liveUpdates, setLiveUpdates] = useState([
    { time: formatTime(-8), text: 'Order picked up from Chopify Store' },
    { time: formatTime(-5), text: 'Delivery partner is on the way' },
  ]);

  const bikerAnim = useRef(new Animated.Value(0.25)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const etaBounce = useRef(new Animated.Value(1)).current;

  // Pulse animation for current location dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Simulate delivery progress
  useEffect(() => {
    const interval = setInterval(() => {
      setEtaSeconds(prev => {
        if (prev <= 0) {
          setEtaMinutes(m => {
            if (m <= 0) return 0;
            return m - 1;
          });
          return 59;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto advance steps
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setCurrentStep(2);
        setDeliveryProgress(0.55);
        setEtaMinutes(8);
        Animated.spring(bikerAnim, { toValue: 0.55, useNativeDriver: false }).start();
        Animated.sequence([
          Animated.timing(etaBounce, { toValue: 1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(etaBounce, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setLiveUpdates(prev => [{ time: formatTime(0), text: 'Partner is 2 km away from your location' }, ...prev]);
      }, 15000),
      setTimeout(() => {
        setCurrentStep(3);
        setDeliveryProgress(0.8);
        setEtaMinutes(3);
        Animated.spring(bikerAnim, { toValue: 0.8, useNativeDriver: false }).start();
        Animated.sequence([
          Animated.timing(etaBounce, { toValue: 1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(etaBounce, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setLiveUpdates(prev => [{ time: formatTime(0), text: 'Delivery partner is nearby!' }, ...prev]);
      }, 35000),
      setTimeout(() => {
        setCurrentStep(4);
        setDeliveryProgress(1);
        setEtaMinutes(0);
        setEtaSeconds(0);
        Animated.spring(bikerAnim, { toValue: 1, useNativeDriver: false }).start();
        setLiveUpdates(prev => [{ time: formatTime(0), text: 'Delivery partner has arrived at your location' }, ...prev]);
      }, 55000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [bikerAnim, etaBounce]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: 'center', marginTop: 60 }}>Order not found</Text>
      </SafeAreaView>
    );
  }

  const handleCallPartner = () => {
    Alert.alert('Call Delivery Partner', `Call ${DELIVERY_PARTNER.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${DELIVERY_PARTNER.phone}`) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, themed.safeArea]} edges={['bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, '#2E7D32']} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Live Tracking</Text>
              <Text style={styles.headerSub}>Order #{order.id}</Text>
            </View>
            <TouchableOpacity onPress={handleCallPartner} style={styles.callBtnHeader}>
              <Icon name="phone" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* ETA Banner */}
          <Animated.View style={[styles.etaBanner, { transform: [{ scale: etaBounce }] }]}>
            <View style={styles.etaIconWrap}>
              <Icon name="clock-fast" size={28} color="#FFF" />
            </View>
            <View>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>
                {etaMinutes > 0 ? `${etaMinutes} min ${etaSeconds.toString().padStart(2, '0')} sec` : 'Arrived!'}
              </Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Map Simulation */}
        <View style={[styles.mapCard, themed.card]}>
          <LinearGradient colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']} style={styles.mapArea}>
            {/* Road */}
            <View style={styles.roadContainer}>
              <View style={styles.road}>
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
              </View>

              {/* Store marker */}
              <View style={[styles.marker, styles.markerStore]}>
                <Icon name="store" size={18} color="#FFF" />
              </View>

              {/* Animated biker */}
              <Animated.View style={[styles.bikerMarker, {
                left: bikerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['5%', '85%'],
                }),
              }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={styles.bikerPulse} />
                </Animated.View>
                <View style={styles.bikerIcon}>
                  <Icon name="bike-fast" size={20} color="#FFF" />
                </View>
                <View style={styles.bikerLabel}>
                  <Text style={styles.bikerLabelText}>{etaMinutes > 0 ? `${etaMinutes} min` : 'Here!'}</Text>
                </View>
              </Animated.View>

              {/* Home marker */}
              <View style={[styles.marker, styles.markerHome]}>
                <Icon name="home" size={18} color="#FFF" />
              </View>
            </View>

            {/* Street labels */}
            <View style={styles.streetLabels}>
              <Text style={styles.streetText}>Chopify Store</Text>
              <Text style={styles.streetText}>{order.deliveryAddress?.split(',')[0] || 'Your Home'}</Text>
            </View>
          </LinearGradient>

          {/* Progress bar */}
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, {
                width: bikerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(deliveryProgress * 100)}% complete</Text>
          </View>
        </View>

        {/* Route Steps */}
        <View style={[styles.stepsCard, themed.card]}>
          <Text style={[styles.cardTitle, themed.textPrimary]}>Delivery Status</Text>
          {ROUTE_STEPS.map((step, idx) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isPending = step.id > currentStep;
            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepTimeline}>
                  <View style={[
                    styles.stepDot,
                    isCompleted && styles.stepDotCompleted,
                    isCurrent && styles.stepDotCurrent,
                    isPending && styles.stepDotPending,
                  ]}>
                    {isCompleted ? (
                      <Icon name="check" size={12} color="#FFF" />
                    ) : isCurrent ? (
                      <Icon name={step.icon as any} size={12} color="#FFF" />
                    ) : (
                      <Icon name={step.icon as any} size={12} color={COLORS.text.muted} />
                    )}
                  </View>
                  {idx < ROUTE_STEPS.length - 1 && (
                    <View style={[styles.stepLine, (isCompleted || isCurrent) && styles.stepLineActive]} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[
                    styles.stepLabel,
                    (isCompleted || isCurrent) && styles.stepLabelActive,
                  ]}>
                    {step.label}
                    {isCurrent && <Text style={styles.stepCurrent}> (Current)</Text>}
                  </Text>
                  <Text style={styles.stepSublabel}>{step.sublabel}</Text>
                  {isCurrent && etaMinutes > 0 && (
                    <View style={styles.stepEta}>
                      <Icon name="clock-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.stepEtaText}>{etaMinutes} min away</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery Partner Card */}
        <View style={[styles.partnerCard, themed.card]}>
          <Text style={[styles.cardTitle, themed.textPrimary]}>Delivery Partner</Text>
          <View style={styles.partnerRow}>
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerAvatarText}>{DELIVERY_PARTNER.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName}>{DELIVERY_PARTNER.name}</Text>
              <View style={styles.partnerMeta}>
                <Icon name="star" size={12} color="#FFD700" />
                <Text style={styles.partnerRating}>{DELIVERY_PARTNER.rating}</Text>
                <Text style={styles.partnerDot}>·</Text>
                <Text style={styles.partnerTrips}>{DELIVERY_PARTNER.totalDeliveries} deliveries</Text>
              </View>
              <View style={styles.partnerVehicle}>
                <Icon name="motorbike" size={12} color={COLORS.text.muted} />
                <Text style={styles.partnerVehicleText}>{DELIVERY_PARTNER.vehicle} · {DELIVERY_PARTNER.vehicleNumber}</Text>
              </View>
            </View>
            <View style={styles.partnerActions}>
              <TouchableOpacity style={styles.partnerActionBtn} onPress={handleCallPartner}>
                <Icon name="phone" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.partnerActionBtn} onPress={() => {
                Alert.alert('Chat', 'Opening chat with delivery partner...');
              }}>
                <Icon name="message-text" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Updates */}
        <View style={[styles.updatesCard, themed.card]}>
          <View style={styles.updatesHeader}>
            <Icon name="broadcast" size={18} color={COLORS.primary} />
            <Text style={[styles.cardTitle, themed.textPrimary, { marginBottom: 0 }]}>Live Updates</Text>
            <View style={styles.liveDot} />
          </View>
          {liveUpdates.map((update, idx) => (
            <View key={idx} style={[styles.updateRow, idx === 0 && styles.updateRowLatest]}>
              <Text style={[styles.updateTime, idx === 0 && styles.updateTimeLatest]}>{update.time}</Text>
              <Text style={[styles.updateText, idx === 0 && styles.updateTextLatest]}>{update.text}</Text>
            </View>
          ))}
        </View>

        {/* Order Summary Mini */}
        <View style={[styles.orderMini, themed.card]}>
          <View style={styles.orderMiniHeader}>
            <Icon name="package-variant" size={16} color={COLORS.primary} />
            <Text style={[styles.orderMiniTitle, themed.textPrimary]}>Order Summary</Text>
          </View>
          <Text style={styles.orderMiniItems}>
            {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
          </Text>
          <View style={styles.orderMiniFooter}>
            <Text style={styles.orderMiniTotal}>Total: {'\u20B9'}{order.total}</Text>
            <Text style={styles.orderMiniPayment}>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={[styles.addressCard, themed.card]}>
          <View style={styles.addressRow}>
            <View style={styles.addressIconWrap}>
              <Icon name="map-marker" size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Delivering to</Text>
              <Text style={[styles.addressText, themed.textPrimary]}>{order.deliveryAddress}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(offsetMinutes: number): string {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.sm, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  callBtnHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // ETA Banner
  etaBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md },
  etaIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  etaLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  etaTime: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 2 },

  scroll: { padding: SPACING.base, paddingBottom: 20 },

  // Map Card
  mapCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md, ...SHADOW.sm },
  mapArea: { height: 180, padding: SPACING.base, justifyContent: 'center' },
  roadContainer: { position: 'relative', height: 60, justifyContent: 'center' },
  road: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, marginHorizontal: 20, paddingHorizontal: 4 },
  roadDash: { width: 20, height: 2, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 1 },
  marker: { position: 'absolute', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  markerStore: { left: 0, backgroundColor: COLORS.primary },
  markerHome: { right: 0, backgroundColor: '#F44336' },
  bikerMarker: { position: 'absolute', top: -10, alignItems: 'center' },
  bikerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(76, 175, 80, 0.2)' },
  bikerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', ...SHADOW.md, zIndex: 2 },
  bikerLabel: { backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  bikerLabelText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  streetLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm, paddingHorizontal: 4 },
  streetText: { fontSize: 10, fontWeight: '600', color: COLORS.text.secondary },

  // Progress Bar
  progressBarWrap: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm },
  progressBarBg: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 11, color: COLORS.text.muted, marginTop: 4, textAlign: 'center' },

  // Steps
  stepsCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary, marginBottom: SPACING.md },
  stepRow: { flexDirection: 'row', marginBottom: 4 },
  stepTimeline: { width: 30, alignItems: 'center' },
  stepDot: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, backgroundColor: '#FFF' },
  stepDotCompleted: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotCurrent: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  stepDotPending: { backgroundColor: '#FFF', borderColor: '#E0E0E0' },
  stepLine: { width: 2, height: 30, backgroundColor: '#E0E0E0', marginVertical: 2 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepContent: { flex: 1, marginLeft: 12, paddingBottom: 16 },
  stepLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text.muted },
  stepLabelActive: { color: COLORS.text.primary },
  stepCurrent: { fontSize: 11, fontWeight: '800', color: '#FF9800' },
  stepSublabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  stepEta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 },
  stepEtaText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Delivery Partner
  partnerCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  partnerAvatarText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  partnerName: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  partnerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  partnerRating: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  partnerDot: { fontSize: 12, color: COLORS.text.muted },
  partnerTrips: { fontSize: 12, color: COLORS.text.muted },
  partnerVehicle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  partnerVehicleText: { fontSize: 11, color: COLORS.text.muted },
  partnerActions: { flexDirection: 'row', gap: 8 },
  partnerActionBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // Live Updates
  updatesCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  updatesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336', marginLeft: 'auto' },
  updateRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  updateRowLatest: { backgroundColor: '#E8F5E9', marginHorizontal: -SPACING.base, paddingHorizontal: SPACING.base, borderRadius: RADIUS.sm },
  updateTime: { fontSize: 11, fontWeight: '600', color: COLORS.text.muted, width: 65 },
  updateTimeLatest: { color: COLORS.primary },
  updateText: { fontSize: 12, color: COLORS.text.secondary, flex: 1 },
  updateTextLatest: { color: COLORS.text.primary, fontWeight: '700' },

  // Order Summary Mini
  orderMini: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  orderMiniHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  orderMiniTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text.primary },
  orderMiniItems: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 },
  orderMiniFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  orderMiniTotal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  orderMiniPayment: { fontSize: 11, color: COLORS.text.muted, backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },

  // Address
  addressCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center' },
  addressLabel: { fontSize: 11, color: COLORS.text.muted },
  addressText: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, marginTop: 2 },
});
