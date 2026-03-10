import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';

const CONFETTI_COLORS = ['#FFA726', '#66BB6A', '#42A5F5', '#EF5350', '#AB47BC', '#FFEE58', '#26C6DA', '#FF7043'];

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const themed = useThemedStyles();
  const { orderId, total } = useLocalSearchParams<{ orderId: string; total: string }>();

  // --- Animation values ---
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;
  const detailsTranslateY = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(30)).current;

  // Confetti dots (8 dots animating outward from center)
  const confettiProgress = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0)),
  ).current;
  const confettiOpacity = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // 1. Checkmark spring in
    const checkAnim = Animated.parallel([
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    // 2. Confetti burst
    const confettiAnims = confettiProgress.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          delay: i * 50,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(confettiOpacity[i], {
            toValue: 1,
            duration: 200,
            delay: i * 50,
            useNativeDriver: true,
          }),
          Animated.timing(confettiOpacity[i], {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 3. Title fade + slide
    const titleAnim = Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // 4. Details fade + slide
    const detailsAnim = Animated.parallel([
      Animated.timing(detailsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(detailsTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // 5. Buttons fade + slide
    const buttonsAnim = Animated.parallel([
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    Animated.sequence([
      checkAnim,
      Animated.parallel(confettiAnims),
      titleAnim,
      Animated.delay(100),
      detailsAnim,
      Animated.delay(150),
      buttonsAnim,
    ]).start();
  }, []);

  // Confetti dot positions (radiate outward from center in a circle)
  const renderConfetti = () => {
    return confettiProgress.map((progress, i) => {
      const angle = (i / 8) * 2 * Math.PI;
      const distance = 120;
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.cos(angle) * distance],
      });
      const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(angle) * distance],
      });
      const scale = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 1.2, 0.6],
      });

      return (
        <Animated.View
          key={i}
          style={[
            styles.confettiDot,
            {
              backgroundColor: CONFETTI_COLORS[i],
              opacity: confettiOpacity[i],
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
        />
      );
    });
  };

  return (
    <LinearGradient
      colors={['#2E7D32', '#43A047', '#66BB6A']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Checkmark + Confetti area */}
          <View style={styles.celebrationArea}>
            <View style={styles.confettiContainer}>
              {renderConfetti()}
            </View>
            <Animated.View
              style={[
                styles.checkCircle,
                {
                  opacity: checkOpacity,
                  transform: [{ scale: checkScale }],
                },
              ]}
            >
              <Icon name="check-circle" size={100} color="#FFFFFF" />
            </Animated.View>
          </View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={styles.title}>Order Placed!</Text>
            <Text style={styles.subtitle}>
              Your fresh vegetables are being prepared with care!
            </Text>
          </Animated.View>

          {/* Order details card */}
          <Animated.View
            style={[
              styles.detailsCard,
              {
                opacity: detailsOpacity,
                transform: [{ translateY: detailsTranslateY }],
              },
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue}>#CUT{orderId}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.detailTotal}>{'\u20B9'}{total}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.deliveryBadge}>
              <Icon name="clock-fast" size={18} color={COLORS.primary} />
              <Text style={styles.deliveryText}>Estimated: 30-45 min</Text>
            </View>
            <View style={styles.loyaltyRow}>
              <Icon name="star-circle" size={16} color={COLORS.accent} />
              <Text style={styles.loyaltyText}>
                Earn 2 points per {'\u20B9'}1 spent
              </Text>
            </View>
          </Animated.View>

          {/* Buttons */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonsOpacity,
                transform: [{ translateY: buttonsTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() =>
                router.replace({
                  pathname: '/order-detail',
                  params: { id: orderId },
                })
              }
              activeOpacity={0.85}
            >
              <Icon name="truck-delivery-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.trackBtnText}>Track Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.85}
            >
              <Icon name="shopping-outline" size={20} color="#FFFFFF" />
              <Text style={styles.continueBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Celebration area
  celebrationArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  checkCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Title section
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.base,
  },

  // Details card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.xxl,
    ...SHADOW.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  detailTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    marginTop: SPACING.md,
  },
  deliveryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  loyaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  loyaltyText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Buttons
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    ...SHADOW.md,
  },
  trackBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
