import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, useWindowDimensions, StatusBar, FlatList, Alert,
  Animated as RNAnimated, Modal, BackHandler, Platform,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useScrollContext } from '@/context/ScrollContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import AnimatedSearchPlaceholder from '@/src/components/AnimatedSearchPlaceholder';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { DISH_PACKS } from '@/data/dishPacks';
import productsData from '@/data/products.json';
import { useOrders } from '@/context/OrderContext';
import { useLoyalty } from '@/context/LoyaltyContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { SEASONAL_PICKS } from '@/data/recipes';
import { FESTIVAL_PACKS } from '@/data/festivalPacks';
import { useDiet } from '@/context/DietContext';
import { SPECIAL_PLANS } from '@/data/specialPlans';

const CATEGORIES = [
  { key: 'All', label: 'All', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80', color: '#E8F5E9' },
  { key: 'Vegetables', label: 'Vegetables', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&q=80', color: '#E8F5E9' },
  { key: 'Fruits', label: 'Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', color: '#E8F5E9' },
  { key: 'Healthy Snacks', label: 'Healthy Snacks', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80', color: '#E8F5E9' },
  { key: 'Diet Foods', label: 'Diet Foods', image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=200&q=80', color: '#E3F2FD' },
  { key: 'Sports Nutrition', label: 'Sports & Gym', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80', color: '#FCE4EC' },
];


const OFFERS = [
  { id: '1', title: 'CHOPIFY', subtitle: 'FRESH PASS', price: '\u20B91 for 3 months', desc: 'Unlimited free cutting & priority delivery', bg: ['#FDF6E3', '#F5E6C8', '#EDD9AD'] as const, headerBg: '#FDF6E3', icon: 'content-cut' as const, route: '/subscription-setup', params: null, btn: 'Join Fresh Pass now', accent: '#B8860B', accentLight: '#D4A84320', titleColor: '#C5941A', ctaBg: '#2D2D2D', badge: 'GOLD' },
  { id: '2', title: 'FLAT 50%', subtitle: 'OFF', price: '& FREE Delivery', desc: 'On your first order of fresh cut veggies', bg: ['#E8F5E9', '#C8E6C9', '#A5D6A7'] as const, headerBg: '#E8F5E9', icon: 'leaf' as const, route: '/browse', params: { category: 'Vegetables' }, btn: 'Order Now', accent: '#2E7D32', accentLight: '#2E7D3220', titleColor: '#1B5E20', ctaBg: '#2E7D32', badge: 'NEW' },
  { id: '3', title: 'FREE', subtitle: 'CUTTING', price: 'On First Order', desc: 'Choose any cut style absolutely free!', bg: ['#E3F2FD', '#BBDEFB', '#90CAF9'] as const, headerBg: '#E3F2FD', icon: 'content-cut' as const, route: null, params: null, btn: 'Try Now', accent: '#0D47A1', accentLight: '#0D47A120', titleColor: '#0D47A1', ctaBg: '#0D47A1', badge: 'FREE' },
  { id: '4', title: 'DISH', subtitle: 'PACKS', price: 'from \u20B995', desc: 'Sambar, Biryani & more - pre-cut for your dish!', bg: ['#FFF3E0', '#FFE0B2', '#FFCC80'] as const, headerBg: '#FFF3E0', icon: 'food-variant' as const, route: '/(tabs)/packs', params: null, btn: 'View Packs', accent: '#E65100', accentLight: '#E6510020', titleColor: '#BF360C', ctaBg: '#E65100', badge: 'HOT' },
  { id: '5', title: 'BUY 2', subtitle: 'GET 1 FREE', price: 'This week only!', desc: 'On all seasonal fruit packs this week!', bg: ['#F3E5F5', '#E1BEE7', '#CE93D8'] as const, headerBg: '#F3E5F5', icon: 'fruit-watermelon' as const, route: '/browse', params: { category: 'Fruits' }, btn: 'Shop Now', accent: '#6A1B9A', accentLight: '#6A1B9A20', titleColor: '#4A148C', ctaBg: '#6A1B9A', badge: '2+1' },
];

const POPULAR_IDS = ['1', '4', '13', '7', '19', '22', '11', '23'];

const LIFESTYLE_TABS = [
  { key: 'healthy', label: 'Healthy Snacks', icon: 'food-apple-outline' as const, color: '#43A047', category: 'Healthy Snacks' },
  { key: 'diet', label: 'Diet Foods', icon: 'heart-pulse' as const, color: '#1E88E5', category: 'Diet Foods' },
  { key: 'sports', label: 'Sports & Gym', icon: 'dumbbell' as const, color: '#E53935', category: 'Sports Nutrition' },
] as const;

/* ─── Animated Section Wrapper (fade + slide up) ─── */
function FadeInSection({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(30)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      RNAnimated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <RNAnimated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </RNAnimated.View>
  );
}

/* ─── Bounce Card Wrapper ─── */
function BounceCard({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const scale = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <RNAnimated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </RNAnimated.View>
    </TouchableOpacity>
  );
}

/* ─── Pulsing FAB Badge ─── */
function PulsingDot() {
  const scale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      RNAnimated.sequence([
        RNAnimated.timing(scale, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, [scale]);

  return (
    <RNAnimated.View style={{
      position: 'absolute', top: -3, right: -3,
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: '#FF5722',
      transform: [{ scale }],
    }} />
  );
}

/* ─── Welcome Offer Modal (Swiggy-style popup) ─── */
function WelcomeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scale = useRef(new RNAnimated.Value(0.8)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
        RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  const handleClose = () => {
    RNAnimated.parallel([
      RNAnimated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <RNAnimated.View style={[welcomeStyles.overlay, { opacity }]}>
        <RNAnimated.View style={[welcomeStyles.card, { transform: [{ scale }] }]}>
          <LinearGradient colors={['#2E7D32', '#43A047', '#66BB6A']} style={welcomeStyles.cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={welcomeStyles.cardDecor1} />
            <View style={welcomeStyles.cardDecor2} />
            <View style={{ zIndex: 1, alignItems: 'center' }}>
              <View style={welcomeStyles.iconCircle}>
                <Icon name="leaf" size={36} color="#FFF" />
              </View>
              <Text style={welcomeStyles.title}>Welcome to Chopify!</Text>
              <Text style={welcomeStyles.subtitle}>Fresh cut vegetables & fruits{'\n'}delivered to your door</Text>
              <View style={welcomeStyles.offerBadge}>
                <Text style={welcomeStyles.offerText}>FLAT 50% OFF</Text>
                <Text style={welcomeStyles.offerSub}>on your first order</Text>
              </View>
              <View style={welcomeStyles.features}>
                {[
                  { icon: 'content-cut', text: 'Choose your cut style' },
                  { icon: 'package-variant', text: 'Ready dish packs' },
                  { icon: 'truck-fast', text: 'Quick delivery' },
                ].map((f, i) => (
                  <View key={i} style={welcomeStyles.featureRow}>
                    <Icon name={f.icon as any} size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={welcomeStyles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={welcomeStyles.cta} onPress={handleClose} activeOpacity={0.9}>
                <Text style={welcomeStyles.ctaText}>Start Shopping</Text>
                <Icon name="arrow-right" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <TouchableOpacity style={welcomeStyles.closeBtn} onPress={handleClose}>
            <Icon name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

const welcomeStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  card: { width: '100%', borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.lg },
  cardGrad: { padding: 28, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  cardDecor1: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  cardDecor2: { position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  offerBadge: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, paddingHorizontal: 24, paddingVertical: 14, marginTop: 20, alignItems: 'center', ...SHADOW.sm },
  offerText: { fontSize: 22, fontWeight: '900', color: '#E53935', letterSpacing: -0.5 },
  offerSub: { fontSize: 12, color: COLORS.text.muted, marginTop: 2, fontWeight: '600' },
  features: { marginTop: 20, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 14, marginTop: 24, ...SHADOW.md },
  ctaText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
});

/* ─── Shimmer Light Sweep ─── */
function ShimmerSweep({ accent }: { accent: string }) {
  const translateX = useRef(new RNAnimated.Value(-200)).current;
  useEffect(() => {
    const loop = () => {
      translateX.setValue(-200);
      RNAnimated.timing(translateX, { toValue: 500, duration: 2800, delay: 1500, useNativeDriver: true }).start(() => loop());
    };
    loop();
  }, [translateX]);
  return (
    <RNAnimated.View style={{
      position: 'absolute', top: 0, bottom: 0, width: 80, zIndex: 0,
      transform: [{ translateX }, { skewX: '-15deg' }],
      backgroundColor: `${accent}08`,
    }} />
  );
}

/* ─── Glowing Icon Ring ─── */
function GlowingIconRing({ accent, icon }: { accent: string; icon: string }) {
  const glowScale = useRef(new RNAnimated.Value(1)).current;
  const glowOp = useRef(new RNAnimated.Value(0.3)).current;
  useEffect(() => {
    const pulse = () => {
      RNAnimated.parallel([
        RNAnimated.sequence([
          RNAnimated.timing(glowScale, { toValue: 1.25, duration: 1400, useNativeDriver: true }),
          RNAnimated.timing(glowScale, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ]),
        RNAnimated.sequence([
          RNAnimated.timing(glowOp, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
          RNAnimated.timing(glowOp, { toValue: 0.25, duration: 1400, useNativeDriver: true }),
        ]),
      ]).start(() => pulse());
    };
    pulse();
  }, [glowScale, glowOp]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
      <RNAnimated.View style={{
        position: 'absolute', width: 56, height: 56, borderRadius: 28,
        backgroundColor: accent, opacity: glowOp, transform: [{ scale: glowScale }],
      }} />
      <View style={{
        width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
      }}>
        <Icon name={icon as any} size={22} color={accent} />
      </View>
    </View>
  );
}

/* ─── Floating Badge Chip ─── */
function FloatingBadge({ label, accent }: { label: string; accent: string }) {
  const bounceY = useRef(new RNAnimated.Value(-4)).current;
  useEffect(() => {
    const float = () => {
      RNAnimated.sequence([
        RNAnimated.timing(bounceY, { toValue: 2, duration: 1600, useNativeDriver: true }),
        RNAnimated.timing(bounceY, { toValue: -4, duration: 1600, useNativeDriver: true }),
      ]).start(() => float());
    };
    float();
  }, [bounceY]);
  return (
    <RNAnimated.View style={{
      position: 'absolute', top: 14, right: 14, zIndex: 10,
      transform: [{ translateY: bounceY }],
    }}>
      <View style={{
        backgroundColor: accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
        shadowColor: accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
      }}>
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 }}>{label}</Text>
      </View>
    </RNAnimated.View>
  );
}

/* ─── Sparkle Dot (twinkling) ─── */
function Sparkle({ style, delay = 0 }: { style: any; delay?: number }) {
  const opacity = useRef(new RNAnimated.Value(0.15)).current;
  const scale = useRef(new RNAnimated.Value(0.6)).current;
  useEffect(() => {
    const loop = () => {
      RNAnimated.parallel([
        RNAnimated.sequence([
          RNAnimated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
          RNAnimated.timing(opacity, { toValue: 0.1, duration: 800, useNativeDriver: true }),
        ]),
        RNAnimated.sequence([
          RNAnimated.timing(scale, { toValue: 1.2, duration: 600, delay, useNativeDriver: true }),
          RNAnimated.timing(scale, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        ]),
      ]).start(() => loop());
    };
    loop();
  }, [delay, opacity, scale]);
  return <RNAnimated.View style={[style, { opacity, transform: [{ scale }] }]} />;
}

/* ─── Animated Dot ─── */
function AnimatedDot({ scrollX, index, width: screenW }: { scrollX: RNAnimated.Value; index: number; width: number }) {
  const dotW = scrollX.interpolate({
    inputRange: [(index - 1) * screenW, index * screenW, (index + 1) * screenW],
    outputRange: [6, 24, 6], extrapolate: 'clamp',
  });
  const dotOp = scrollX.interpolate({
    inputRange: [(index - 1) * screenW, index * screenW, (index + 1) * screenW],
    outputRange: [0.3, 1, 0.3], extrapolate: 'clamp',
  });
  return <RNAnimated.View style={[offerCardStyles.dot, { width: dotW, opacity: dotOp, backgroundColor: 'rgba(0,0,0,0.6)' }]} />;
}

/* ─── Card Content ─── */
function CardContent({ item, isActive }: { item: typeof OFFERS[0]; isActive: boolean }) {
  const anim = useRef(new RNAnimated.Value(0)).current;
  const priceScale = useRef(new RNAnimated.Value(0.8)).current;
  const ctaOp = useRef(new RNAnimated.Value(0)).current;
  const ctaY = useRef(new RNAnimated.Value(12)).current;

  useEffect(() => {
    if (isActive) {
      anim.setValue(0); priceScale.setValue(0.8);
      ctaOp.setValue(0); ctaY.setValue(12);
      RNAnimated.sequence([
        RNAnimated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }),
        RNAnimated.parallel([
          RNAnimated.spring(priceScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
          RNAnimated.timing(ctaOp, { toValue: 1, duration: 350, useNativeDriver: true }),
          RNAnimated.spring(ctaY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
        ]),
      ]).start();
    }
  }, [isActive]);

  const fadeSlide = { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] };

  return (
    <>
      {/* Sparkle particles */}
      <Sparkle style={{ position: 'absolute', top: 22, left: '15%', width: 5, height: 5, borderRadius: 2.5, backgroundColor: `${item.accent}80` }} delay={0} />
      <Sparkle style={{ position: 'absolute', top: 55, right: '22%', width: 4, height: 4, borderRadius: 2, backgroundColor: `${item.accent}60` }} delay={400} />
      <Sparkle style={{ position: 'absolute', bottom: 60, left: '28%', width: 4, height: 4, borderRadius: 2, backgroundColor: `${item.accent}70` }} delay={200} />
      <Sparkle style={{ position: 'absolute', bottom: 35, right: '30%', width: 5, height: 5, borderRadius: 2.5, backgroundColor: `${item.accent}50` }} delay={600} />
      <Sparkle style={{ position: 'absolute', top: 40, left: '48%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: `${item.accent}60` }} delay={800} />
      <Sparkle style={{ position: 'absolute', bottom: 80, left: '58%', width: 4, height: 4, borderRadius: 2, backgroundColor: `${item.accent}50` }} delay={350} />

      {/* Title + subtitle */}
      <RNAnimated.View style={[offerCardStyles.content, fadeSlide]}>
        <Text style={[offerCardStyles.title, { color: item.titleColor }]}>{item.title}</Text>
        <Text style={[offerCardStyles.subtitle, { color: item.titleColor }]}>{item.subtitle}</Text>
      </RNAnimated.View>

      {/* Price */}
      <RNAnimated.View style={{ transform: [{ scale: priceScale }], zIndex: 2, marginTop: 10 }}>
        <Text style={[offerCardStyles.priceText, { color: item.accent }]}>{item.price}</Text>
      </RNAnimated.View>

      {/* CTA button */}
      <RNAnimated.View style={{ opacity: ctaOp, transform: [{ translateY: ctaY }], zIndex: 2, marginTop: 16 }}>
        <View style={[offerCardStyles.cta, { backgroundColor: item.ctaBg }]}>
          <Text style={offerCardStyles.ctaText}>{item.btn}</Text>
          <Icon name="chevron-right" size={14} color="#FFF" />
        </View>
      </RNAnimated.View>
    </>
  );
}

/* ─── ScrollReveal ─── */
function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(35)).current;
  const done = useRef(false);
  const onLayout = useCallback(() => {
    if (done.current) return;
    done.current = true;
    RNAnimated.parallel([
      RNAnimated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      RNAnimated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, speed: 12, bounciness: 4 }),
    ]).start();
  }, [opacity, translateY, delay]);
  return (
    <RNAnimated.View onLayout={onLayout} style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </RNAnimated.View>
  );
}

/* ─── Offers Carousel (full-bleed, animated) ─── */
function OffersCarousel({ width, activeIndex, onIndexChange, isVisible = true }: { width: number; activeIndex: number; onIndexChange: (i: number) => void; isVisible?: boolean }) {
  const flatListRef = useRef<FlatList>(null);
  const indexRef = useRef(0);
  const router = useRouter();
  const scrollX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % OFFERS.length;
      indexRef.current = next;
      onIndexChange(next);
      flatListRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [width, onIndexChange, isVisible]);

  const onScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== indexRef.current && idx >= 0 && idx < OFFERS.length) {
      indexRef.current = idx;
      onIndexChange(idx);
    }
  }, [width, onIndexChange]);

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={OFFERS}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: onScroll }
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item, index }) => {
          const handlePress = () => {
            if (item.route) router.push(item.params ? { pathname: item.route, params: item.params } as any : item.route as any);
          };
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const cardScale = scrollX.interpolate({ inputRange, outputRange: [0.93, 1, 0.93], extrapolate: 'clamp' });
          const cardOpacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });

          return (
            <TouchableOpacity style={{ width }} activeOpacity={0.9} onPress={handlePress}>
              <RNAnimated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity }}>
              <LinearGradient colors={[item.bg[0], item.bg[1], item.bg[2]]} style={offerCardStyles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {/* Soft decorative circles */}
                <View style={[offerCardStyles.decor1, { backgroundColor: item.accent }]} />
                <View style={[offerCardStyles.decor2, { backgroundColor: item.accent }]} />
                <View style={offerCardStyles.decor3} />
                <CardContent item={item} isActive={activeIndex === index} />
              </LinearGradient>
              </RNAnimated.View>
            </TouchableOpacity>
          );
        }}
      />
      <View style={offerCardStyles.dots}>
        {OFFERS.map((_, i) => (
          <AnimatedDot key={i} scrollX={scrollX} index={i} width={width} />
        ))}
      </View>
    </View>
  );
}

const offerCardStyles = StyleSheet.create({
  card: {
    minHeight: 240, overflow: 'hidden', position: 'relative',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 30, paddingHorizontal: 24,
  },
  decor1: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, opacity: 0.12 },
  decor2: { position: 'absolute', bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, opacity: 0.08 },
  decor3: { position: 'absolute', top: '35%' as any, right: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  content: { alignItems: 'center', zIndex: 2 },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  subtitle: { fontSize: 28, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginTop: -4 },
  priceText: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: RADIUS.full,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  ctaText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: {},
});

/* ─── Add To Cart Button ─── */
function AddToCartButton({ item }: { item: any }) {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const inCart = cartItems.find((c) => c.id === item.id);
  const qty = inCart?.quantity || 0;

  if (qty === 0) {
    return (
      <TouchableOpacity
        style={styles.addBtn}
        onPress={(e) => { e.stopPropagation(); addToCart(item, 1); }}
        activeOpacity={0.8}
      >
        <Text style={styles.addBtnText}>ADD</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.qtyRow}>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={(e) => { e.stopPropagation(); updateQuantity(item.id, qty - 1); }}
      >
        <Icon name="minus" size={14} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.qtyText}>{qty}</Text>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={(e) => { e.stopPropagation(); updateQuantity(item.id, qty + 1); }}
      >
        <Icon name="plus" size={14} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

/* ─── Product Mini Card (Zomato-style reusable) ─── */
function ProductMiniCard({ item, themed }: { item: any; themed: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.miniCard}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
    >
      <View style={styles.miniImageWrap}>
        <Image source={{ uri: item.image }} style={styles.miniImage} resizeMode="cover" />
        {item.discount && (
          <View style={styles.miniOfferBadge}>
            <Text style={styles.miniOfferText}>{item.discount}</Text>
          </View>
        )}
        <View style={styles.miniPriceBadge}>
          <Icon name="star" size={10} color="#FFF" />
          <Text style={styles.miniPriceBadgeText}>{'\u20B9'}{item.price}</Text>
        </View>
      </View>
      <Text style={[styles.miniName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
      <View style={styles.miniInfoRow}>
        <Icon name="weight" size={12} color={COLORS.text.muted} />
        <Text style={styles.miniUnit}>{item.unit}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Home Screen ─── */
export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { handleScroll } = useScrollContext();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const themed = useThemedStyles();
  const { userName, userCategory, lifestyle, healthGoals, gender } = useDiet();
  const [lifestyleTab, setLifestyleTab] = useState<'healthy' | 'diet' | 'sports'>('healthy');
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  /* Filters hide AFTER carousel — starts at 180px, done by 280px */
  const filterHeight = scrollY.interpolate({
    inputRange: [180, 280],
    outputRange: [44, 0],
    extrapolate: 'clamp',
  });
  const filterOpacity = scrollY.interpolate({
    inputRange: [180, 260],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const onCarouselChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
  }, []);

  /* ─── Personalized "For You" recommendations ─── */
  const forYouPlans = useMemo(() => {
    if (!userCategory) return [];
    return SPECIAL_PLANS.filter(plan => {
      // Match by lifestyle
      if (plan.targetLifestyle?.length && lifestyle && plan.targetLifestyle.includes(lifestyle as any)) return true;
      // Match by goals
      if (plan.targetGoals?.length && healthGoals.length > 0) {
        if (plan.targetGoals.some(g => healthGoals.includes(g))) return true;
      }
      // Match by gender
      if (plan.targetGender?.length && gender && plan.targetGender.includes(gender as any)) {
        // Also check lifestyle or goals overlap
        if (plan.targetLifestyle?.includes(lifestyle as any)) return true;
        if (plan.targetGoals?.some(g => healthGoals.includes(g))) return true;
      }
      return false;
    }).slice(0, 4);
  }, [userCategory, lifestyle, healthGoals, gender]);

  const forYouProducts = useMemo(() => {
    if (!userCategory || forYouPlans.length === 0) return [];
    // Collect product IDs from recommended plans
    const productIds = new Set<string>();
    forYouPlans.forEach(plan => {
      plan.dailyItems.forEach(item => productIds.add(item.productId));
    });
    return productsData.filter(p => productIds.has(p.id)).slice(0, 8);
  }, [userCategory, forYouPlans]);

  const isAllCategory = selectedCategory === 'All';
  const categoryProducts = useMemo(() => {
    if (isAllCategory) return [];
    return productsData.filter(p => p.category === selectedCategory);
  }, [selectedCategory, isAllCategory]);

  const popularProducts = useMemo(() => productsData.filter(p => POPULAR_IDS.includes(p.id)), []);
  const healthySnacks = useMemo(() => productsData.filter(p => p.category === 'Healthy Snacks').slice(0, 6), []);
  const dietFoods = useMemo(() => productsData.filter(p => p.category === 'Diet Foods').slice(0, 6), []);
  const sportsFoods = useMemo(() => productsData.filter(p => p.category === 'Sports Nutrition').slice(0, 6), []);
  const { orders } = useOrders();
  const { loyalty, dailyCheckIn } = useLoyalty();
  const { recentlyViewed } = useRecentlyViewed();

  const recentlyOrdered = useMemo(() => {
    const itemIds = new Set<string>();
    orders.slice(0, 5).forEach(o => o.items.forEach(i => { if (itemIds.size < 8) itemIds.add(i.id); }));
    return productsData.filter(p => itemIds.has(p.id));
  }, [orders]);

  // Show welcome modal for new users
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orders.length === 0) setShowWelcome(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Back button: if specific category selected, go back to "All" instead of exiting
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedCategory !== 'All') {
        setSelectedCategory('All');
        return true; // handled — don't exit
      }
      return false; // default behavior
    });
    return () => handler.remove();
  }, [selectedCategory]);

  /* ─── Smart Reorder: analyze order frequency patterns ─── */
  const smartReorder = useMemo(() => {
    if (orders.length < 1) return null;
    const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'placed' || o.status === 'confirmed');
    if (deliveredOrders.length === 0) return null;

    // Count how many times each item was ordered & track cut preferences
    const itemFreq: Record<string, { count: number; lastOrdered: string; cutType?: string; name: string; qty: number }> = {};
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        if (itemFreq[item.id]) {
          itemFreq[item.id].count += 1;
          if (new Date(order.createdAt) > new Date(itemFreq[item.id].lastOrdered)) {
            itemFreq[item.id].lastOrdered = order.createdAt;
            if (item.cutType) itemFreq[item.id].cutType = item.cutType;
          }
        } else {
          itemFreq[item.id] = { count: 1, lastOrdered: order.createdAt, cutType: item.cutType, name: item.name, qty: item.quantity };
        }
      });
    });

    // Find items ordered 2+ times (frequently bought)
    const frequentItems = Object.entries(itemFreq)
      .filter(([_, data]) => data.count >= 1)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);

    if (frequentItems.length === 0) return null;

    // Calculate days since last order
    const lastOrderDate = new Date(deliveredOrders[0].createdAt);
    const daysSince = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Estimate average order interval
    let avgInterval = 7;
    if (deliveredOrders.length >= 2) {
      const firstDate = new Date(deliveredOrders[deliveredOrders.length - 1].createdAt).getTime();
      const lastDate = new Date(deliveredOrders[0].createdAt).getTime();
      avgInterval = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24 * (deliveredOrders.length - 1))));
    }

    const isRunningLow = daysSince >= Math.max(1, avgInterval - 1);
    const daysUntilReorder = Math.max(0, avgInterval - daysSince);

    // Get product details
    const products = frequentItems.map(([id, data]) => {
      const product = productsData.find(p => p.id === id);
      return product ? { ...product, orderCount: data.count, cutType: data.cutType, lastQty: data.qty } : null;
    }).filter(Boolean) as (typeof productsData[0] & { orderCount: number; cutType?: string; lastQty: number })[];

    // Estimate total for quick reorder
    const estimatedTotal = products.reduce((sum, p) => sum + p.price, 0);

    return { products, daysSince, avgInterval, isRunningLow, daysUntilReorder, estimatedTotal, totalOrders: deliveredOrders.length };
  }, [orders]);

  const recentlyViewedProducts = useMemo(() => {
    return recentlyViewed.map(id => productsData.find(p => p.id === id)).filter(Boolean).slice(0, 8) as typeof productsData;
  }, [recentlyViewed]);

  const newArrivals = useMemo(() => productsData.filter(p => p.tags?.includes('new') || p.tags?.includes('seasonal')).slice(0, 6), []);
  const currentSeason = useMemo(() => SEASONAL_PICKS[0], []);
  const seasonalProducts = useMemo(() => productsData.filter(p => currentSeason.productIds.includes(p.id)), [currentSeason]);

  const lifestyleProducts = useMemo(() => {
    if (lifestyleTab === 'healthy') return healthySnacks;
    if (lifestyleTab === 'diet') return dietFoods;
    return sportsFoods;
  }, [lifestyleTab, healthySnacks, dietFoods, sportsFoods]);

  const activeLifestyle = LIFESTYLE_TABS.find(t => t.key === lifestyleTab)!;

  const cardW = (width - SPACING.base * 2 - 10) / 2;

  /* ─── Sticky header on scroll (Android-compatible) ─── */
  const [stickyVisible, setStickyVisible] = useState(false);
  const stickyRef = useRef(false);

  const onMainScroll = useCallback((e: any) => {
    handleScroll(e);
    const y = e.nativeEvent.contentOffset.y;
    scrollY.setValue(y);
    // Show sticky when carousel is scrolled past (~200px)
    if (y > 190 && !stickyRef.current) {
      stickyRef.current = true;
      setStickyVisible(true);
    } else if (y <= 190 && stickyRef.current) {
      stickyRef.current = false;
      setStickyVisible(false);
    }
  }, [handleScroll, scrollY]);

  return (
    <View style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={isAllCategory ? OFFERS[carouselIndex].headerBg : COLORS.background} />
    <SafeAreaView style={[{ flex: 1 }, themed.safeArea]} edges={['bottom']}>

      <View style={{ flex: 1 }}>
      {/* ─── Sticky Categories + Filters overlay (shown when scrolled past carousel) ─── */}
      {stickyVisible && (
        <View style={styles.stickyOverlay}>
          <TouchableOpacity style={[styles.searchBar, { marginHorizontal: SPACING.base, marginBottom: SPACING.xs }]} onPress={() => router.push('/search')} activeOpacity={0.9}>
            <Icon name="magnify" size={20} color={COLORS.text.muted} />
            <View style={{ flex: 1 }}><AnimatedSearchPlaceholder /></View>
            <Icon name="microphone-outline" size={20} color={COLORS.text.muted} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <BounceCard
                key={cat.key}
                style={styles.categoryCard}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <View style={[styles.categoryImageWrap, selectedCategory === cat.key && { borderColor: COLORS.primary, borderWidth: 3 }]}>
                  <Image source={{ uri: cat.image }} style={styles.categoryImage} resizeMode="cover" />
                </View>
                <Text style={[styles.categoryLabel, themed.textPrimary, selectedCategory === cat.key && { color: COLORS.primary }]}>{cat.label}</Text>
              </BounceCard>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScroll={onMainScroll}
        scrollEventThrottle={16}
      >

        {/* ━━━ HEADER + CAROUSEL — one unified block with same bg, scrolls together ━━━ */}
          <View style={[{ backgroundColor: OFFERS[carouselIndex].headerBg }, !isAllCategory && { display: 'none' }]}>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.headerTitle, themed.textPrimary]}>Chopify</Text>
                  <Text style={styles.headerSub}>Fresh cut, ready to cook!</Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => router.push('/wallet')} style={styles.walletBtn}>
                    <View style={styles.walletIcon}>
                      <Icon name="wallet-outline" size={20} color={COLORS.text.primary} />
                    </View>
                    <Text style={styles.walletText}>{'\u20B9'}0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
                    <Icon name="bell-outline" size={24} color={COLORS.text.primary} />
                    <View style={styles.notifDot} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.profileBtn}>
                    {user?.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.profileIconImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.profileIcon}>
                        <Icon name="account" size={20} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')} activeOpacity={0.9}>
                <Icon name="magnify" size={20} color={COLORS.text.muted} />
                <View style={{ flex: 1 }}><AnimatedSearchPlaceholder /></View>
                <Icon name="microphone-outline" size={20} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            <OffersCarousel width={width} activeIndex={carouselIndex} onIndexChange={onCarouselChange} isVisible={isAllCategory} />
          </View>

        {/* Search bar when specific category selected */}
        {!isAllCategory && (
          <View style={{ paddingHorizontal: SPACING.base, paddingVertical: SPACING.xs }}>
            <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')} activeOpacity={0.9}>
              <Icon name="magnify" size={20} color={COLORS.text.muted} />
              <View style={{ flex: 1 }}><AnimatedSearchPlaceholder /></View>
              <Icon name="microphone-outline" size={20} color={COLORS.text.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ━━━ 2. CATEGORIES + FILTERS (in-flow, hidden when sticky overlay is active) ━━━ */}
        <View style={[styles.stickySection, stickyVisible && styles.stickySectionHidden]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <BounceCard
                key={cat.key}
                style={styles.categoryCard}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <View style={[styles.categoryImageWrap, selectedCategory === cat.key && { borderColor: COLORS.primary, borderWidth: 3 }]}>
                  <Image source={{ uri: cat.image }} style={styles.categoryImage} resizeMode="cover" />
                </View>
                <Text style={[styles.categoryLabel, themed.textPrimary, selectedCategory === cat.key && { color: COLORS.primary }]}>{cat.label}</Text>
              </BounceCard>
            ))}
          </ScrollView>

          {/* Filters — collapses on scroll */}
          <RNAnimated.View style={{ height: filterHeight, opacity: filterOpacity, overflow: 'hidden' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            <TouchableOpacity
              style={styles.filterChipPrimary}
              activeOpacity={0.8}
              onPress={() => router.push('/browse' as any)}
            >
              <Icon name="tune-variant" size={15} color={COLORS.text.primary} />
              <Text style={styles.filterChipPrimaryText}>Filters</Text>
            </TouchableOpacity>
            {([
              { label: 'Under ₹150', icon: 'tag-outline' as const, params: { maxPrice: '150' } },
              { label: 'Fresh Cut', icon: 'content-cut' as const, params: { tag: 'fresh-cut' } },
              { label: 'Rating 4.0+', icon: 'star' as const, params: { minRating: '4' } },
              { label: 'Offers', icon: 'percent-outline' as const, params: { hasDiscount: 'true' } },
              { label: 'Organic', icon: 'leaf' as const, params: { tag: 'organic' } },
            ] as const).map((chip) => (
              <TouchableOpacity
                key={chip.label}
                style={styles.filterChip}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/browse', params: chip.params } as any)}
              >
                <Icon name={chip.icon} size={13} color={COLORS.text.secondary} />
                <Text style={styles.filterChipText}>{chip.label}</Text>
                <Icon name="chevron-down" size={13} color={COLORS.text.muted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          </RNAnimated.View>
        </View>

        {/* ━━━ CATEGORY PRODUCTS GRID (shown when specific category selected) ━━━ */}
        {!isAllCategory && categoryProducts.length > 0 && (
          <View style={{ paddingHorizontal: SPACING.base, paddingTop: SPACING.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: 0, marginBottom: 0, marginHorizontal: 0 }]}>{selectedCategory}</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/browse', params: { category: selectedCategory } })}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {categoryProducts.map(item => (
                <View key={`cat_${item.id}`} style={{ width: (width - SPACING.base * 2 - 12) / 2 }}>
                  <ProductMiniCard item={item} themed={themed} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ━━━ ALL SECTIONS (only when "All" category is active) ━━━ */}
        {isAllCategory && (<>
        {/* ━━━ SUBSCRIPTION PROMO ━━━ */}
        <TouchableOpacity
          style={{ marginHorizontal: SPACING.base, marginTop: SECTION_GAP, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.lg }}
          onPress={() => router.push('/subscription-setup' as any)}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#0D47A1', '#1565C0', '#1976D2']} style={{ padding: 20, position: 'relative', overflow: 'hidden' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ position: 'absolute', bottom: -30, left: 40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="calendar-clock" size={26} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 }}>Subscribe & Save</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 17 }}>Daily, weekly or monthly deliveries</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Start</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ━━━ QUICK ACCESS CARD ━━━ */}
        {/* <View style={[styles.quickAccessCard, themed.card]}>
          <View style={styles.quickAccessGrid}>
            {([
              { icon: 'ticket-percent' as const, label: 'Offers', color: '#E65100', bg: '#FFF3E0', route: '/offers-coupons' },
              { icon: 'star-circle' as const, label: 'Rewards', color: '#7B1FA2', bg: '#F3E5F5', route: '/loyalty' },
              { icon: 'pot-steam' as const, label: 'Recipes', color: '#00897B', bg: '#E0F2F1', route: '/recipe-cart' },
              { icon: 'package-variant' as const, label: 'My Pack', color: COLORS.green, bg: '#E8F5E9', route: '/create-pack' },
              { icon: 'cart-heart' as const, label: 'Saved', color: '#E91E63', bg: '#FCE4EC', route: '/saved-carts' },
              { icon: 'food-apple' as const, label: 'Diet', color: '#FF6F00', bg: '#FFF8E1', route: '/diet-preferences' },
              { icon: 'chart-line' as const, label: 'Analytics', color: '#1565C0', bg: '#E3F2FD', route: '/spending-analytics' },
              { icon: 'account-group' as const, label: 'Referral', color: '#6D4C41', bg: '#EFEBE9', route: '/referral' },
            ] as const).map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.quickAccessItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickAccessIconWrap, { backgroundColor: item.bg }]}>
                  <Icon name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.quickAccessLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View> */}

        {/*

        {/* ━━━ FOR YOU - Personalized Section ━━━ */}
        {forYouProducts.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="star-circle" size={20} color="#FF6F00" />
                <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: 0, marginBottom: 0 }]}>
                  Recommended For You{userName ? `, ${userName.split(' ')[0]}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/diet-preferences' as any)}>
                <Text style={styles.viewAllLink}>Edit Goals</Text>
              </TouchableOpacity>
            </View>
            {/* Recommended Plans (shown first) */}
            {forYouPlans.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {forYouPlans.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.forYouPlanCard}
                    onPress={() => router.push({ pathname: '/subscription-setup', params: { planId: plan.id } } as any)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.forYouPlanImageWrap}>
                      <Image source={{ uri: plan.image }} style={styles.forYouPlanImage} resizeMode="cover" />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.forYouPlanOverlay} />
                      {plan.tag && (
                        <View style={[styles.forYouPlanTagBadge, { backgroundColor: plan.color }]}>
                          <Text style={styles.forYouPlanTagBadgeText}>{plan.tag}</Text>
                        </View>
                      )}
                      <View style={styles.forYouPlanBottom}>
                        <View style={[styles.forYouPlanIconBadge, { backgroundColor: plan.bgColor }]}>
                          <Icon name={plan.icon as any} size={14} color={plan.color} />
                        </View>
                        <Text style={styles.forYouPlanImageName} numberOfLines={1}>{plan.name}</Text>
                      </View>
                    </View>
                    <View style={styles.forYouPlanBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.forYouPlanPrice, { color: plan.color }]}>{'\u20B9'}{plan.pricePerDay}/day</Text>
                        <View style={[styles.forYouPlanCta, { backgroundColor: plan.color }]}>
                          <Text style={styles.forYouPlanCtaText}>Subscribe</Text>
                        </View>
                      </View>
                      <Text style={styles.forYouPlanDesc} numberOfLines={2}>{plan.description}</Text>
                      <View style={styles.forYouPlanBenefits}>
                        {plan.benefits.slice(0, 2).map((b, i) => (
                          <View key={i} style={styles.forYouPlanBenefitRow}>
                            <Icon name="check-circle" size={10} color={plan.color} />
                            <Text style={styles.forYouPlanBenefitText}>{b}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Recommended Products removed — plans shown above are sufficient */}
          </>
        )}

        {/* ━━━ 3. RECENTLY ORDERED (conditional) ━━━ */}
        {recentlyOrdered.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: 0, marginBottom: 0 }]}>Recently Ordered</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}><Text style={styles.viewAllLink}>View Orders</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {recentlyOrdered.map(item => (
                <ProductMiniCard key={`recent_${item.id}`} item={item} themed={themed} />
              ))}
            </ScrollView>
          </>
        )}

        {/* ━━━ SMART REORDER ━━━ */}
        {smartReorder && smartReorder.products.length > 0 && !smartReorder.isRunningLow && (
          <>
            <View style={[styles.smartReorderCard, themed.card]}>
              {/* Header */}
              <View style={styles.smartReorderHeader}>
                <View style={[styles.smartReorderIcon, { backgroundColor: smartReorder.isRunningLow ? '#FFF3E0' : '#E8F5E9' }]}>
                  <Icon name={smartReorder.isRunningLow ? 'clock-alert-outline' : 'refresh-circle'} size={22} color={smartReorder.isRunningLow ? '#E65100' : COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.smartReorderTitle, themed.textPrimary]}>
                    {smartReorder.isRunningLow ? 'Your veggies are running low!' : 'Quick Reorder'}
                  </Text>
                  <Text style={styles.smartReorderSub}>
                    {smartReorder.isRunningLow
                      ? `Last ordered ${smartReorder.daysSince} day${smartReorder.daysSince !== 1 ? 's' : ''} ago — you usually order every ${smartReorder.avgInterval} days`
                      : `Based on ${smartReorder.totalOrders} order${smartReorder.totalOrders !== 1 ? 's' : ''} — your frequently bought items`}
                  </Text>
                </View>
                {smartReorder.isRunningLow && (
                  <View style={styles.smartReorderUrgent}>
                    <Text style={styles.smartReorderUrgentText}>Restock</Text>
                  </View>
                )}
              </View>

              {/* Items Scroll */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.smartReorderScroll}>
                {smartReorder.products.map((item, idx) => (
                  <TouchableOpacity
                    key={`sr_${item.id}`}
                    style={styles.smartReorderItem}
                    onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: item.image }} style={styles.smartReorderImage} resizeMode="cover" />
                    <View style={styles.smartReorderFreqBadge}>
                      <Text style={styles.smartReorderFreqText}>{item.orderCount}x</Text>
                    </View>
                    <Text style={[styles.smartReorderItemName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
                    {item.cutType && (
                      <Text style={styles.smartReorderCut}>{item.cutType.replace('_', ' ')}</Text>
                    )}
                    <View style={styles.smartReorderPriceRow}>
                      <Text style={styles.smartReorderPrice}>{'\u20B9'}{item.price}</Text>
                      <AddToCartButton item={item} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Add All to Cart */}
              <TouchableOpacity
                style={styles.smartReorderAddAll}
                onPress={() => {
                  smartReorder.products.forEach(item => {
                    addToCart(item as any, 1, undefined, (item as any).cutType);
                  });
                  Alert.alert('Added to Cart', `${smartReorder.products.length} items added with your usual preferences!`);
                }}
                activeOpacity={0.8}
              >
                <Icon name="cart-plus" size={18} color="#FFF" />
                <Text style={styles.smartReorderAddAllText}>Add All to Cart · {'\u20B9'}{smartReorder.estimatedTotal}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ━━━ RECENTLY VIEWED ━━━ */}
        {/* {recentlyViewedProducts.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: 0, marginBottom: 0 }]}>Recently Viewed</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {recentlyViewedProducts.map(item => (
                <ProductMiniCard key={`rv_${item.id}`} item={item} themed={themed} />
              ))}
            </ScrollView>
          </>
        )} */}

        {/* ━━━ 4. DISH PACKS (banner + carousel) ━━━ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: 0, marginBottom: 0 }]}>Dish Packs</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/packs')}><Text style={styles.viewAllLink}>View All</Text></TouchableOpacity>
        </View>
        <View style={styles.zomatoCardList}>
          {DISH_PACKS.slice(0, 4).map(pack => {
            const itemCount = pack.items.length;
            const hasVariants = pack.regionalVariants && pack.regionalVariants.length > 0;
            return (
              <TouchableOpacity
                key={pack.id}
                style={[styles.zomatoCard, themed.card]}
                onPress={() => router.push({ pathname: '/dish-pack-detail', params: { id: pack.id } })}
                activeOpacity={0.9}
              >
                <View style={styles.zomatoImageWrap}>
                  <Image source={{ uri: pack.image }} style={styles.zomatoImage} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.zomatoImageOverlay} />
                  {pack.tag && (
                    <View style={styles.zomatoTagBadge}>
                      <Text style={styles.zomatoTagText}>{pack.tag}</Text>
                    </View>
                  )}
                  <View style={styles.zomatoDeliveryBadge}>
                    <Text style={styles.zomatoDeliveryText}>{itemCount} items</Text>
                  </View>
                </View>
                <View style={styles.zomatoBody}>
                  <View style={styles.zomatoNameRow}>
                    <Text style={[styles.zomatoName, themed.textPrimary]} numberOfLines={1}>{pack.name}</Text>
                    <View style={styles.zomatoRatingBadge}>
                      <Text style={styles.zomatoRatingText}>{'\u20B9'}{pack.price}</Text>
                    </View>
                  </View>
                  <Text style={styles.zomatoMeta} numberOfLines={1}>{pack.description}</Text>
                  <View style={styles.zomatoInfoRow}>
                    <View style={styles.zomatoInfoChip}>
                      <Icon name="account-group-outline" size={12} color={COLORS.text.muted} />
                      <Text style={styles.zomatoInfoText}>{pack.serves}</Text>
                    </View>
                    {hasVariants && (
                      <View style={styles.zomatoInfoChip}>
                        <Icon name="map-marker-outline" size={12} color={COLORS.text.muted} />
                        <Text style={styles.zomatoInfoText}>{pack.regionalVariants!.length} styles</Text>
                      </View>
                    )}
                    <View style={styles.zomatoInfoChip}>
                      <Icon name="content-cut" size={12} color={COLORS.text.muted} />
                      <Text style={styles.zomatoInfoText}>Choose cut</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ━━━ 6. EXPLORE BY LIFESTYLE (tabbed section) ━━━ */}
        <Text style={[styles.sectionTitle, themed.textPrimary]}>Explore by Lifestyle</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lifestyleTabsRow}>
          {LIFESTYLE_TABS.map(tab => {
            const isActive = lifestyleTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.lifestyleTab, isActive && { backgroundColor: tab.color, borderColor: 'transparent' }]}
                onPress={() => setLifestyleTab(tab.key)}
                activeOpacity={0.8}
              >
                <Icon name={tab.icon} size={16} color={isActive ? '#FFF' : COLORS.text.secondary} />
                <Text style={[styles.lifestyleTabText, isActive && { color: '#FFF' }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.zomatoCardList}>
          {lifestyleProducts.slice(0, 4).map(item => (
            <TouchableOpacity
              key={`lifestyle_${item.id}`}
              style={[styles.zomatoCard, themed.card]}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
            >
              <View style={styles.zomatoImageWrap}>
                <Image source={{ uri: item.image }} style={styles.zomatoImage} resizeMode="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.zomatoImageOverlay} />
                {item.tags && item.tags[0] && (
                  <View style={[styles.zomatoTagBadge, { backgroundColor: activeLifestyle.color }]}>
                    <Text style={styles.zomatoTagText}>{item.tags[0]}</Text>
                  </View>
                )}
                {item.discount && (
                  <View style={[styles.zomatoOfferBadge]}>
                    <Icon name="brightness-percent" size={12} color="#FFF" />
                    <Text style={styles.zomatoOfferText}>{item.discount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.zomatoBody}>
                <View style={styles.zomatoNameRow}>
                  <Text style={[styles.zomatoName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.zomatoRatingBadge, { backgroundColor: activeLifestyle.color }]}>
                    <Text style={styles.zomatoRatingText}>{'\u20B9'}{item.price}</Text>
                  </View>
                </View>
                <View style={styles.zomatoInfoRow}>
                  <View style={styles.zomatoInfoChip}>
                    <Icon name="weight" size={12} color={COLORS.text.muted} />
                    <Text style={styles.zomatoInfoText}>{item.unit}</Text>
                  </View>
                  <View style={styles.zomatoInfoChip}>
                    <Icon name="tag-outline" size={12} color={COLORS.text.muted} />
                    <Text style={styles.zomatoInfoText}>{item.category}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                  <AddToCartButton item={item} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => router.push({ pathname: '/browse', params: { category: activeLifestyle.category } })}
          activeOpacity={0.8}
        >
          <Text style={styles.viewAllBtnText}>View All {activeLifestyle.label}</Text>
          <Icon name="chevron-right" size={16} color={COLORS.primary} />
        </TouchableOpacity>

        {/* ━━━ 7. SEASONAL PICKS ━━━ */}
        <View style={styles.sectionBanner}>
          <LinearGradient colors={['#FF7043', '#FF5722']} style={styles.sectionBannerGrad}>
            <Icon name={currentSeason.icon as any} size={24} color="#FFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sectionBannerTitle}>{currentSeason.title}</Text>
              <Text style={styles.sectionBannerDesc}>{currentSeason.description}</Text>
            </View>
          </LinearGradient>
        </View>
        <View style={styles.zomatoCardList}>
          {seasonalProducts.slice(0, 4).map(item => (
            <TouchableOpacity
              key={`seasonal_${item.id}`}
              style={[styles.zomatoCard, themed.card]}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
            >
              <View style={styles.zomatoImageWrap}>
                <Image source={{ uri: item.image }} style={styles.zomatoImage} resizeMode="cover" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.zomatoImageOverlay} />
                {item.tags && item.tags[0] && (
                  <View style={[styles.zomatoTagBadge, { backgroundColor: '#FF5722' }]}>
                    <Text style={styles.zomatoTagText}>{item.tags[0]}</Text>
                  </View>
                )}
                {item.discount && (
                  <View style={styles.zomatoOfferBadge}>
                    <Icon name="brightness-percent" size={12} color="#FFF" />
                    <Text style={styles.zomatoOfferText}>{item.discount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.zomatoBody}>
                <View style={styles.zomatoNameRow}>
                  <Text style={[styles.zomatoName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.zomatoRatingBadge, { backgroundColor: '#FF5722' }]}>
                    <Text style={styles.zomatoRatingText}>{'\u20B9'}{item.price}</Text>
                  </View>
                </View>
                <View style={styles.zomatoInfoRow}>
                  <View style={styles.zomatoInfoChip}>
                    <Icon name="weight" size={12} color={COLORS.text.muted} />
                    <Text style={styles.zomatoInfoText}>{item.unit}</Text>
                  </View>
                  <View style={styles.zomatoInfoChip}>
                    <Icon name="leaf" size={12} color={COLORS.text.muted} />
                    <Text style={styles.zomatoInfoText}>{item.category}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                  <AddToCartButton item={item} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ━━━ 8. FESTIVAL & OCCASION PACKS ━━━ */}
        <Text style={[styles.sectionTitle, themed.textPrimary]}>Festival & Occasion Packs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packsScroll}>
          {FESTIVAL_PACKS.map(pack => (
            <TouchableOpacity key={pack.id} style={[styles.packCard, { backgroundColor: pack.color }]}
              onPress={() => router.push({ pathname: '/dish-pack-detail', params: { id: pack.id } })} activeOpacity={0.85}>
              <Image source={{ uri: pack.image }} style={styles.packImage} resizeMode="cover" />
              <Text style={styles.packName}>{pack.name}</Text>
              <Text style={styles.packPrice}>{'\u20B9'}{pack.price}</Text>
              {pack.tag ? <View style={styles.packTag}><Text style={styles.packTagText}>{pack.tag}</Text></View> : <View style={{ height: 8 }} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ━━━ 9. POPULAR ITEMS (compact 4-item grid) ━━━ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: 0, marginBottom: 0 }]}>Popular Items</Text>
          <TouchableOpacity onPress={() => router.push('/browse' as any)}><Text style={styles.viewAllLink}>View All</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {popularProducts.map(item => (
            <ProductMiniCard key={`pop_${item.id}`} item={item} themed={themed} />
          ))}
        </ScrollView>

        <View style={{ height: SPACING.xxl }} />
        </>)}
      </ScrollView>

      {/* ━━━ ASK CHOPIFY FAB ━━━ */}
      {/* <BounceCard
        onPress={() => router.push('/recipe-cart' as any)}
        style={styles.askChopifyFab}
      >
        <LinearGradient
          colors={['#00796B', '#009688']}
          style={styles.askChopifyFabGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ position: 'relative' }}>
            <Icon name="chef-hat" size={24} color="#FFF" />
            <PulsingDot />
          </View>
          <Text style={styles.askChopifyFabText}>Ask Chopify</Text>
        </LinearGradient>
      </BounceCard> */}

      {/* ━━━ WELCOME MODAL ━━━ */}
      {/* <WelcomeModal visible={showWelcome} onClose={() => setShowWelcome(false)} /> */}
      </View>
    </SafeAreaView>
    </View>
  );
}

/* ─── Styles ─── */
const SECTION_GAP = 28;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  /* Header */
  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text.primary },
  headerSub: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 17, paddingRight: 8, gap: 2,
  },
  walletIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  walletText: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary },
  headerIconBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  profileBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  profileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.text.primary, alignItems: 'center', justifyContent: 'center' },
  profileIconImg: { width: 36, height: 36, borderRadius: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    paddingHorizontal: 14, paddingVertical: 10,
    ...SHADOW.sm,
  },

  /* Sticky Categories + Filters */
  stickySection: {
    backgroundColor: COLORS.background,
    paddingBottom: 4,
  },
  stickySectionHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  stickyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    zIndex: 50,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    ...SHADOW.sm,
  },

  /* Scroll */
  scroll: { paddingBottom: 100 },

  /* Offers Carousel (styles now in offerCardStyles above) */
  offersSection: { marginTop: SPACING.sm },
  offerCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl,
    padding: SPACING.lg, minHeight: 160, overflow: 'hidden', position: 'relative',
  },
  offerDecor1: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, opacity: 0.15 },
  offerDecor2: { position: 'absolute', bottom: -40, left: -20, width: 100, height: 100, borderRadius: 50, opacity: 0.1 },
  offerTitle: { fontSize: 26, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  offerSubtitle: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  offerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 17, marginTop: 6 },
  offerBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#FFF', borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 8, gap: 4, marginTop: 12,
    ...SHADOW.sm,
  },
  offerBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  offerIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  offerDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  offerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)' },
  offerDotActive: { width: 24, backgroundColor: COLORS.primary },

  /* Quick Access Card */
  quickAccessCard: {
    marginHorizontal: SPACING.base, marginTop: SPACING.lg,
    borderRadius: RADIUS.lg, backgroundColor: '#FFF',
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  quickAccessGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  quickAccessItem: {
    width: '25%', alignItems: 'center', paddingVertical: 8,
  },
  quickAccessIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickAccessLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text.secondary, textAlign: 'center' },

  /* Section Title */
  sectionTitle: {
    fontSize: 19, fontWeight: '800', color: COLORS.text.primary, letterSpacing: -0.3,
    marginHorizontal: SPACING.base, marginTop: SECTION_GAP, marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: SPACING.base, marginTop: SECTION_GAP, marginBottom: SPACING.sm,
  },
  viewAllLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary, backgroundColor: '#F0FFF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, overflow: 'hidden' },

  /* Categories */
  categoryScroll: { paddingHorizontal: SPACING.base, gap: 16, paddingVertical: SPACING.sm },
  categoryCard: { width: 80, alignItems: 'center' },
  categoryImageWrap: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 2.5, borderColor: '#E8F5E9', ...SHADOW.sm },
  categoryImage: { width: '100%', height: '100%' },
  categoryLabel: { fontSize: 10, fontWeight: '800', color: COLORS.text.primary, paddingTop: 6, textAlign: 'center' },

  /* Filter Chips */
  filterChipsScroll: { paddingHorizontal: SPACING.base, gap: 8, paddingTop: SPACING.xs, paddingBottom: SPACING.sm },
  filterChipPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.2, borderColor: '#E0E0E0',
    ...SHADOW.sm,
  },
  filterChipPrimaryText: { fontSize: 12.5, fontWeight: '700', color: COLORS.text.primary },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.text.secondary },

  /* (Popular Items now use ProductMiniCard) */

  /* Dish Packs */
  packsBanner: { marginHorizontal: SPACING.base, marginTop: SECTION_GAP, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.md },
  packsGrad: { padding: SPACING.lg },
  packsContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packsTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  packsDesc: { fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 18, marginTop: 2 },
  packsScroll: { paddingHorizontal: SPACING.base, gap: 12, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  packCard: { width: 170, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.sm },
  packImage: { width: 170, height: 115 },
  packName: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, textAlign: 'center', paddingHorizontal: 8, marginTop: 8 },
  packPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginTop: 4, marginBottom: 2 },
  packTag: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, alignSelf: 'center', marginBottom: 12 },
  packTagText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  /* Zomato-style Full-width Cards */
  zomatoCardList: { paddingHorizontal: SPACING.base, gap: 16, marginTop: SPACING.sm },
  zomatoCard: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl, overflow: 'hidden',
    ...SHADOW.md,
  },
  zomatoImageWrap: { width: '100%', height: 200, position: 'relative' },
  zomatoImage: { width: '100%', height: '100%' },
  zomatoImageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
  },
  zomatoTagBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  zomatoTagText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  zomatoDeliveryBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  zomatoDeliveryText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  zomatoOfferBadge: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: '#1565C0', borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  zomatoOfferText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  zomatoBody: { padding: 14 },
  zomatoNameRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  zomatoName: { fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  zomatoRatingBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  zomatoRatingText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  zomatoMeta: { fontSize: 12, color: COLORS.text.muted, marginTop: 4, lineHeight: 17 },
  zomatoInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8,
  },
  zomatoInfoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  zomatoInfoText: { fontSize: 11, color: COLORS.text.muted, fontWeight: '600' },

  /* Lifestyle Tabs */
  lifestyleTabsRow: {
    paddingHorizontal: SPACING.base, gap: 8, marginTop: 6, marginBottom: SPACING.md,
  },
  lifestyleTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.full, backgroundColor: '#F5F5F5',
    borderWidth: 1, borderColor: COLORS.border,
  },
  lifestyleTabText: { fontSize: 13, fontWeight: '700', color: COLORS.text.secondary },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginHorizontal: SPACING.base, marginTop: SPACING.sm,
    paddingVertical: 10, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#FFF',
  },
  viewAllBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  /* Section Banner */
  sectionBanner: { marginHorizontal: SPACING.base, marginTop: SECTION_GAP, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.md },
  sectionBannerGrad: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  sectionBannerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  sectionBannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  /* Horizontal List */
  horizontalList: { paddingHorizontal: SPACING.base, gap: 14, paddingTop: SPACING.sm, paddingBottom: SPACING.md },

  /* Mini Card (Zomato-style — no card wrapper, just image + text) */
  miniCard: { width: 175 },
  miniImageWrap: { width: 175, height: 150, borderRadius: RADIUS.xl, overflow: 'hidden', position: 'relative', backgroundColor: '#F0F0F0' },
  miniImage: { width: '100%', height: '100%' },
  miniOfferBadge: {
    position: 'absolute', top: 10, left: 0,
    backgroundColor: 'rgba(33,33,33,0.85)', borderTopRightRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  miniOfferText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  miniPriceBadge: {
    position: 'absolute', bottom: -1, left: 10,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingHorizontal: 7, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  miniPriceBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  miniName: { fontSize: 15, fontWeight: '800', marginTop: 10, paddingHorizontal: 2 },
  miniInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 2 },
  miniUnit: { fontSize: 12, color: COLORS.text.muted },
  miniTag: { backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  miniTagText: { fontSize: 9, fontWeight: '700', color: COLORS.green },

  /* Smart Reorder */
  smartReorderCard: {
    marginHorizontal: SPACING.base, marginTop: SECTION_GAP,
    backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    padding: SPACING.base, ...SHADOW.sm,
    borderWidth: 1, borderColor: '#E8F5E9',
  },
  smartReorderHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  smartReorderIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  smartReorderTitle: { fontSize: 15, fontWeight: '800' },
  smartReorderSub: { fontSize: 11, color: COLORS.text.muted, marginTop: 2, lineHeight: 15 },
  smartReorderUrgent: { backgroundColor: '#FF6F00', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  smartReorderUrgentText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  smartReorderScroll: { gap: 12, paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  smartReorderItem: { width: 110, alignItems: 'center', position: 'relative' },
  smartReorderImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#E8F5E9' },
  smartReorderFreqBadge: {
    position: 'absolute', top: 0, right: 4,
    backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 22, height: 22,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  smartReorderFreqText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  smartReorderItemName: { fontSize: 11, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  smartReorderCut: { fontSize: 9, color: COLORS.text.muted, marginTop: 1, textTransform: 'capitalize' },
  smartReorderPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  smartReorderPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  smartReorderAddAll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: 14, marginTop: SPACING.md,
  },
  smartReorderAddAllText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  /* For You Plan Cards (Zomato-style with image) */
  forYouPlanCard: {
    width: 220, backgroundColor: '#FFF', borderRadius: RADIUS.xl,
    overflow: 'hidden', ...SHADOW.md,
  },
  forYouPlanImageWrap: { width: 220, height: 140, position: 'relative' },
  forYouPlanImage: { width: '100%', height: '100%' },
  forYouPlanOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  forYouPlanTagBadge: {
    position: 'absolute', top: 10, left: 0,
    borderTopRightRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  forYouPlanTagBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  forYouPlanBottom: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  forYouPlanIconBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  forYouPlanImageName: { fontSize: 14, fontWeight: '800', color: '#FFF', flex: 1 },
  forYouPlanBody: { padding: 12 },
  forYouPlanPrice: { fontSize: 15, fontWeight: '900' },
  forYouPlanCta: {
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  forYouPlanCtaText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  forYouPlanDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 6, lineHeight: 15 },
  forYouPlanBenefits: { marginTop: 8, gap: 4 },
  forYouPlanBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  forYouPlanBenefitText: { fontSize: 10, color: COLORS.text.secondary, fontWeight: '600' },

  /* Ask Chopify FAB */
  askChopifyFab: {
    position: 'absolute',
    bottom: 150,
    right: SPACING.base,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    elevation: 12,
    zIndex: 10,
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  askChopifyFabGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  askChopifyFabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },

  /* Add / Qty Button */
  addBtn: {
    backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 4,
    ...SHADOW.sm,
  },
  addBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.primary, ...SHADOW.sm },
  qtyBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  qtyText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, minWidth: 18, textAlign: 'center' },

});
