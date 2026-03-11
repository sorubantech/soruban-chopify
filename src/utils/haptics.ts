import { Platform } from 'react-native';

// Lightweight haptic feedback utility
// Uses expo-haptics if available, gracefully degrades otherwise

let Haptics: any = null;

try {
  Haptics = require('expo-haptics');
} catch {}

export function hapticLight() {
  if (Platform.OS === 'web' || !Haptics) return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
}

export function hapticMedium() {
  if (Platform.OS === 'web' || !Haptics) return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}

export function hapticHeavy() {
  if (Platform.OS === 'web' || !Haptics) return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export function hapticSuccess() {
  if (Platform.OS === 'web' || !Haptics) return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}

export function hapticError() {
  if (Platform.OS === 'web' || !Haptics) return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
}

export function hapticSelection() {
  if (Platform.OS === 'web' || !Haptics) return;
  try { Haptics.selectionAsync(); } catch {}
}
