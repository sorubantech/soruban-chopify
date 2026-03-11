import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '@/src/utils/theme';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch {}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const translateY = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    if (!NetInfo || Platform.OS === 'web') return;

    const unsubscribe = NetInfo.addEventListener?.((state: any) => {
      const offline = state?.isConnected === false;
      setIsOffline(offline);
      Animated.spring(translateY, {
        toValue: offline ? 0 : -50,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe?.();
  }, [translateY]);

  // Fallback for when NetInfo is not available
  if (!NetInfo && Platform.OS !== 'web') {
    return null;
  }

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Icon name="wifi-off" size={16} color="#FFF" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.status.error,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    zIndex: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});
