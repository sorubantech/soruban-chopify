import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { ThemeProvider as NavThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { WalletProvider } from '@/context/WalletContext';

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const { isDark, colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.replace('/(auth)' as any);
      }
    } else if (isAuthenticated && inAuthGroup) {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.replace('/(tabs)' as any);
      }
    } else {
      hasNavigated.current = false;
    }
  }, [isAuthenticated, isLoading, segments]);

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text.primary,
      border: colors.border,
      notification: colors.primary,
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="browse" />
        <Stack.Screen name="product-detail" />
        <Stack.Screen name="dish-pack-detail" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-detail" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="addresses" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="help" />
        <Stack.Screen name="about" />
        <Stack.Screen name="search" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="subscription-manage" />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WalletProvider>
            <CartProvider>
              <OrderProvider>
                <RootLayoutNav />
              </OrderProvider>
            </CartProvider>
          </WalletProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
