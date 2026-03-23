import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Alert, Image, Modal, FlatList, useWindowDimensions,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/src/utils/theme';
import { useThemedStyles } from '@/src/utils/useThemedStyles';
import { useCart } from '@/context/CartContext';
import type { CutType, SubFrequency, DishPack } from '@/types';
import products from '@/data/products.json';
import { DISH_PACKS } from '@/data/dishPacks';
import { SPECIAL_PLANS, PLAN_CATEGORIES } from '@/data/specialPlans';
import type { SpecialPlan } from '@/data/specialPlans';
import { useDiet } from '@/context/DietContext';

/* ─── Types ─── */
interface SubscriptionItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  unit: string;
  cutType?: CutType;
  packId?: string;
  packName?: string;
}

type DayItems = Record<string, SubscriptionItem[]>;

const CUT_OPTIONS: { value: CutType; label: string; icon: string }[] = [
  { value: 'small_pieces', label: 'Small Pieces', icon: 'knife' },
  { value: 'slices', label: 'Slices', icon: 'content-cut' },
  { value: 'cubes', label: 'Cubes', icon: 'cube-outline' },
  { value: 'long_cuts', label: 'Long Cuts', icon: 'minus' },
  { value: 'grated', label: 'Grated', icon: 'grain' },
];

const FREQ_OPTIONS: { value: SubFrequency; label: string; icon: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', icon: 'calendar-today', desc: 'Same items delivered every day' },
  { value: 'weekly', label: 'Weekly', icon: 'calendar-week', desc: 'Choose days & different items per day' },
  { value: 'monthly', label: 'Monthly', icon: 'calendar-month', desc: 'Pick specific dates each month' },
];

const TIME_SLOTS = [
  { id: 'slot_7am', label: '7 - 8 AM', full: '7:00 AM - 8:00 AM', icon: 'weather-sunset-up' },
  { id: 'slot_8am', label: '8 - 10 AM', full: '8:00 AM - 10:00 AM', icon: 'weather-sunny' },
  { id: 'slot_10am', label: '10 - 12 PM', full: '10:00 AM - 12:00 PM', icon: 'weather-sunny' },
  { id: 'slot_12pm', label: '12 - 2 PM', full: '12:00 PM - 2:00 PM', icon: 'weather-sunny' },
  { id: 'slot_5pm', label: '5 - 7 PM', full: '5:00 PM - 7:00 PM', icon: 'weather-sunset-down' },
  { id: 'slot_7pm', label: '7 - 9 PM', full: '7:00 PM - 9:00 PM', icon: 'weather-night' },
];

/* ─── Helpers ─── */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─── Screen ─── */
export default function SubscriptionSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string; groupCode?: string; groupName?: string }>();
  const themed = useThemedStyles();
  const { addToCart, cartItems } = useCart();
  const { gender, lifestyle, healthGoals, profileComplete } = useDiet();

  const [step, setStep] = useState(1);
  const [frequency, setFrequency] = useState<SubFrequency>('weekly');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0].id);
  const [selectedPlan, setSelectedPlan] = useState<SpecialPlan | null>(null);
  const [selectedDishPack, setSelectedDishPack] = useState<DishPack | null>(null);
  const [planCategory, setPlanCategory] = useState<string>(profileComplete ? 'recommended' : 'all');

  /* ─── Plan Recommendation: strictly filter by user's health goals ─── */
  const sortedPlans = useMemo(() => {
    const plans = SPECIAL_PLANS.filter(p => p.frequencies.includes(frequency));
    if (planCategory === 'recommended') {
      // Only show plans whose targetGoals overlap with the user's selected healthGoals
      // Ignore general_wellness — only match specific goals the user actually picked
      const userSpecificGoals = healthGoals.filter(g => g !== 'general_wellness');
      if (userSpecificGoals.length === 0) return plans; // no specific goals → show all as fallback

      const matched = plans.filter(plan => {
        if (!plan.targetGoals) return false;
        return plan.targetGoals.some(g => userSpecificGoals.includes(g));
      });

      // Sort: more goal matches first, then by gender/lifestyle relevance
      matched.sort((a, b) => {
        const aGoals = (a.targetGoals || []).filter(g => userSpecificGoals.includes(g)).length;
        const bGoals = (b.targetGoals || []).filter(g => userSpecificGoals.includes(g)).length;
        if (bGoals !== aGoals) return bGoals - aGoals;
        // Tiebreak: gender match
        const aGender = gender && a.targetGender?.includes(gender as any) ? 1 : 0;
        const bGender = gender && b.targetGender?.includes(gender as any) ? 1 : 0;
        if (bGender !== aGender) return bGender - aGender;
        // Tiebreak: lifestyle match
        const aLife = lifestyle && a.targetLifestyle?.includes(lifestyle as any) ? 1 : 0;
        const bLife = lifestyle && b.targetLifestyle?.includes(lifestyle as any) ? 1 : 0;
        return bLife - aLife;
      });

      return matched;
    }
    if (planCategory === 'all') return plans;
    return plans.filter(p => p.category === planCategory);
  }, [frequency, planCategory, gender, lifestyle, healthGoals]);
  const [showPlanDetail, setShowPlanDetail] = useState(false);

  /* Auto-select plan when navigated with planId param */
  useEffect(() => {
    if (params.planId) {
      const plan = SPECIAL_PLANS.find(p => p.id === params.planId);
      if (plan) {
        setSelectedPlan(plan);
        setShowPlanDetail(true);
      }
    }
  }, [params.planId]);

  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));
  const [selectedDates, setSelectedDates] = useState<string[]>([formatDate(today)]);
  const [dayItems, setDayItems] = useState<DayItems>({});
  const [disabledDates, setDisabledDates] = useState<string[]>([]);

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [showCartPicker, setShowCartPicker] = useState(false);
  const [showCutPicker, setShowCutPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [expandedPacks, setExpandedPacks] = useState<string[]>([]);
  const [pickerCategory, setPickerCategory] = useState<string | null>(null);
  const [pendingSubProductId, setPendingSubProductId] = useState<string | null>(null);
  const [pendingSubPackId, setPendingSubPackId] = useState<string | null>(null);

  const PICKER_CATEGORIES = useMemo(() => [
    { key: 'Vegetables', label: 'Vegetables', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&q=80', color: '#E8F5E9' },
    { key: 'Fruits', label: 'Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', color: '#E8F5E9' },
    { key: 'Healthy Snacks', label: 'Healthy Snacks', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80', color: '#E8F5E9' },
    { key: 'Diet Foods', label: 'Diet Foods', image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=200&q=80', color: '#E3F2FD' },
    { key: 'Sports Nutrition', label: 'Sports & Gym', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80', color: '#FCE4EC' },
    { key: 'Packs', label: 'Dish Packs', image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=200&q=80', color: '#FFF3E0' },
  ], []);

  const filteredPickerProducts = useMemo(() => {
    if (!pickerCategory) return [];
    return (products as any[]).filter(p => p.category === pickerCategory);
  }, [pickerCategory]);

  const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);
  const currentWeekStart = useMemo(() => getMonday(new Date(selectedDate + 'T00:00:00')), [selectedDate]);
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  /* Auto-add product/pack to subscription when returning from detail screen */
  const prevCartLenRef = useRef(cartItems.length);
  useEffect(() => {
    if (!pendingSubProductId && !pendingSubPackId) { prevCartLenRef.current = cartItems.length; return; }
    if (cartItems.length <= prevCartLenRef.current) return;

    // Handle single product added from product-detail
    if (pendingSubProductId) {
      const cartItem = cartItems.find(ci => ci.id === pendingSubProductId);
      if (cartItem) {
        const item: SubscriptionItem = {
          productId: cartItem.id, name: cartItem.name, image: cartItem.image,
          price: cartItem.price, quantity: cartItem.quantity, unit: cartItem.unit,
          cutType: cartItem.cutType,
        };
        setDayItems(prev => {
          const updated = { ...prev };
          selectedDates.forEach(dateKey => {
            const existing = updated[dateKey] || [];
            if (!existing.some(i => i.productId === cartItem.id)) {
              updated[dateKey] = [...existing, item];
            }
          });
          return updated;
        });
        setPendingSubProductId(null);
      }
    }

    // Handle pack added from dish-pack-detail
    if (pendingSubPackId) {
      const packCartItems = cartItems.filter(ci => ci.packId === pendingSubPackId);
      if (packCartItems.length > 0) {
        const packItems: SubscriptionItem[] = packCartItems.map(ci => ({
          productId: ci.id, name: ci.name, image: ci.image,
          price: ci.price, quantity: ci.quantity, unit: ci.unit,
          cutType: ci.cutType, packId: ci.packId, packName: ci.packName,
        }));
        setDayItems(prev => {
          const updated = { ...prev };
          selectedDates.forEach(dateKey => {
            const existing = updated[dateKey] || [];
            updated[dateKey] = [...existing, ...packItems];
          });
          return updated;
        });
        setPendingSubPackId(null);
      }
    }

    prevCartLenRef.current = cartItems.length;
  }, [cartItems, pendingSubProductId, pendingSubPackId, selectedDates]);

  const goToPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const toggleDate = useCallback((dateKey: string) => {
    setSelectedDates(prev => {
      if (prev.includes(dateKey)) {
        const next = prev.filter(d => d !== dateKey);
        // When deselecting, shift active date to another selected date
        if (dateKey === selectedDate && next.length > 0) {
          setSelectedDate(next[next.length - 1]);
        }
        return next;
      }
      return [...prev, dateKey];
    });
    // Set as active date for viewing items
    setSelectedDate(dateKey);
  }, [selectedDate]);

  const selectedItems = dayItems[selectedDate] || [];

  const groupedItems = useMemo(() => {
    const individuals: { item: SubscriptionItem; index: number }[] = [];
    const packs: Record<string, { packId: string; packName: string; items: { item: SubscriptionItem; index: number }[]; totalPrice: number }> = {};
    selectedItems.forEach((item, index) => {
      if (item.packId && item.packName) {
        if (!packs[item.packId]) {
          packs[item.packId] = { packId: item.packId, packName: item.packName, items: [], totalPrice: 0 };
        }
        packs[item.packId].items.push({ item, index });
        packs[item.packId].totalPrice += item.price * item.quantity;
      } else {
        individuals.push({ item, index });
      }
    });
    return { individuals, packs: Object.values(packs) };
  }, [selectedItems]);

  const togglePackExpand = useCallback((packId: string) => {
    setExpandedPacks(prev =>
      prev.includes(packId) ? prev.filter(id => id !== packId) : [...prev, packId]
    );
  }, []);

  const allDatesWithItems = useMemo(() =>
    Object.keys(dayItems).filter(d => dayItems[d].length > 0 && !disabledDates.includes(d)).sort()
  , [dayItems, disabledDates]);

  const totalItems = useMemo(() =>
    Object.values(dayItems).reduce((sum, items) => sum + items.length, 0)
  , [dayItems]);

  const totalPrice = useMemo(() =>
    Object.values(dayItems).reduce((sum, items) =>
      sum + items.reduce((s, i) => s + i.price * i.quantity, 0), 0)
  , [dayItems]);

  /* ─── Item Operations ─── */
  const updateDayItems = useCallback((date: string, items: SubscriptionItem[]) => {
    setDayItems(prev => ({ ...prev, [date]: items }));
  }, []);

  const addProduct = useCallback((product: any) => {
    const item: SubscriptionItem = {
      productId: product.id, name: product.name, image: product.image,
      price: product.price, quantity: 1, unit: product.unit,
    };
    setDayItems(prev => {
      const updated = { ...prev };
      selectedDates.forEach(dateKey => {
        const existing = updated[dateKey] || [];
        if (!existing.some(i => i.productId === product.id)) {
          updated[dateKey] = [...existing, item];
        }
      });
      return updated;
    });
    setShowProductPicker(false);
  }, [selectedDates]);

  const addPack = useCallback((pack: typeof DISH_PACKS[0]) => {
    const packItems: SubscriptionItem[] = pack.items.map(pi => {
      const product = (products as any[]).find(p => p.id === pi.productId);
      return {
        productId: pi.productId, name: product?.name || 'Unknown',
        image: product?.image || '', price: product?.price || 0,
        quantity: pi.quantity, unit: product?.unit || '1 kg',
        packId: pack.id, packName: pack.name,
      };
    });
    setDayItems(prev => {
      const updated = { ...prev };
      selectedDates.forEach(dateKey => {
        const existing = updated[dateKey] || [];
        updated[dateKey] = [...existing, ...packItems];
      });
      return updated;
    });
    setShowPackPicker(false);
  }, [selectedDates]);

  const addFromCart = useCallback((cartItem: typeof cartItems[0]) => {
    const item: SubscriptionItem = {
      productId: cartItem.id, name: cartItem.name, image: cartItem.image,
      price: cartItem.price, quantity: cartItem.quantity, unit: cartItem.unit,
      cutType: cartItem.cutType, packId: cartItem.packId, packName: cartItem.packName,
    };
    setDayItems(prev => {
      const updated = { ...prev };
      selectedDates.forEach(dateKey => {
        const existing = updated[dateKey] || [];
        if (!existing.some(i => i.productId === cartItem.id)) {
          updated[dateKey] = [...existing, item];
        }
      });
      return updated;
    });
    setShowCartPicker(false);
  }, [selectedDates, cartItems]);

  const resolveItems = useCallback((planItems: { productId: string; quantity: number }[]): SubscriptionItem[] => {
    return planItems.map(pi => {
      const product = (products as any[]).find(p => p.id === pi.productId);
      return {
        productId: pi.productId, name: product?.name || 'Unknown',
        image: product?.image || '', price: product?.price || 0,
        quantity: pi.quantity, unit: product?.unit || '1 kg',
      };
    });
  }, []);

  const applySpecialPlan = useCallback((plan: SpecialPlan) => {
    const planItems = resolveItems(plan.dailyItems);
    setDayItems(prev => {
      const updated = { ...prev };
      selectedDates.forEach(dateKey => {
        updated[dateKey] = [...planItems];
      });
      return updated;
    });
    setSelectedPlan(plan);
    setShowPlanDetail(false);
    Alert.alert('Plan Applied!', `${plan.name} items added to ${selectedDates.length} selected date${selectedDates.length !== 1 ? 's' : ''}.`);
  }, [selectedDates, resolveItems]);

  /* Resolve dish pack items into SubscriptionItem[] */
  const resolveDishPackItems = useCallback((pack: DishPack): SubscriptionItem[] => {
    return pack.items.map(pi => {
      const product = (products as any[]).find(p => p.id === pi.productId);
      return {
        productId: pi.productId, name: product?.name || 'Unknown',
        image: product?.image || '', price: product?.price || 0,
        quantity: pi.quantity, unit: product?.unit || '1 kg',
        packId: pack.id, packName: pack.name,
      };
    });
  }, []);

  /* Auto-fill plan items for all dates when entering step 2 */
  const goToStep2WithPlan = useCallback(() => {
    if (!selectedPlan && !selectedDishPack) { setStep(2); return; }

    const todayDate = new Date();
    const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const newDayItems: DayItems = {};
    const newSelectedDates: string[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get items for a given day — dish pack uses same items every day
    const getItemsForDay = (dayName: string): SubscriptionItem[] => {
      if (selectedDishPack) {
        return resolveDishPackItems(selectedDishPack);
      }
      if (selectedPlan) {
        if (selectedPlan.weeklyItems && selectedPlan.weeklyItems[dayName]) {
          return resolveItems(selectedPlan.weeklyItems[dayName]);
        }
        return resolveItems(selectedPlan.dailyItems);
      }
      return [];
    };

    if (frequency === 'weekly') {
      const weekStart = getMonday(todayDate);
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d < todayStart) continue;
        const dateKey = formatDate(d);
        newDayItems[dateKey] = getItemsForDay(dayNames[d.getDay()]);
        newSelectedDates.push(dateKey);
      }
    } else if (frequency === 'monthly') {
      const year = todayDate.getFullYear();
      const month = todayDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = todayDate.getDate(); day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const dateKey = formatDate(d);
        newDayItems[dateKey] = getItemsForDay(dayNames[d.getDay()]);
        newSelectedDates.push(dateKey);
      }
      setCalYear(year);
      setCalMonth(month);
    } else {
      // Daily
      const startDateKey = formatDate(todayDate);
      newDayItems[startDateKey] = getItemsForDay(dayNames[todayDate.getDay()]);
      newSelectedDates.push(startDateKey);
    }

    if (newSelectedDates.length > 0) {
      setSelectedDates(newSelectedDates);
      setSelectedDate(newSelectedDates[0]);
      setDayItems(newDayItems);
    }
    setStep(2);
  }, [selectedPlan, selectedDishPack, frequency, resolveItems, resolveDishPackItems]);

  const removeItem = useCallback((index: number) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    updateDayItems(selectedDate, updated);
  }, [selectedDate, selectedItems, updateDayItems]);

  const removePack = useCallback((packId: string) => {
    const updated = selectedItems.filter(i => i.packId !== packId);
    updateDayItems(selectedDate, updated);
    setExpandedPacks(prev => prev.filter(id => id !== packId));
  }, [selectedDate, selectedItems, updateDayItems]);

  const updateItemQty = useCallback((index: number, delta: number) => {
    const updated = [...selectedItems];
    const newQty = updated[index].quantity + delta;
    if (newQty < 1) return;
    updated[index] = { ...updated[index], quantity: newQty };
    updateDayItems(selectedDate, updated);
  }, [selectedDate, selectedItems, updateDayItems]);

  const updateItemCut = useCallback((cutType: CutType) => {
    if (editingItemIndex === null) return;
    const updated = [...selectedItems];
    updated[editingItemIndex] = { ...updated[editingItemIndex], cutType };
    updateDayItems(selectedDate, updated);
    setShowCutPicker(false);
    setEditingItemIndex(null);
  }, [selectedDate, selectedItems, editingItemIndex, updateDayItems]);

  /* ─── Copy Operations ─── */
  const copyToAllSelectedDays = useCallback(() => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Add items to the current day first.');
      return;
    }
    const targetDates = selectedDates.filter(d => d !== selectedDate);
    if (targetDates.length === 0) {
      Alert.alert('No Other Dates', 'Select more dates on the calendar first, then copy.');
      return;
    }
    const dateLabels = targetDates.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return `${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} (${DAY_HEADERS[dt.getDay() === 0 ? 6 : dt.getDay() - 1]})`;
    }).join(', ');
    Alert.alert(
      'Copy to All Selected Days',
      `Copy items from today to:\n${dateLabels}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy', onPress: () => {
            setDayItems(prev => {
              const updated = { ...prev };
              targetDates.forEach(key => {
                updated[key] = [...selectedItems];
              });
              return updated;
            });
            Alert.alert('Copied!', `Items applied to ${targetDates.length} day${targetDates.length > 1 ? 's' : ''} successfully.`);
          },
        },
      ]
    );
  }, [selectedDate, selectedItems, selectedDates]);

  const repeatLastWeek = useCallback(() => {
    const prevWeekStart = addDays(currentWeekStart, -7);
    const prevWeekDates = getWeekDates(prevWeekStart);
    const hasItems = prevWeekDates.some(d => (dayItems[formatDate(d)]?.length || 0) > 0);
    if (!hasItems) {
      Alert.alert('No Previous Week', 'No items found from the previous week to copy.');
      return;
    }
    const copiedDays: string[] = [];
    Alert.alert('Repeat Last Week', 'Copy all items from last week to this week?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Copy', onPress: () => {
          setDayItems(prev => {
            const updated = { ...prev };
            for (let i = 0; i < 7; i++) {
              const prevKey = formatDate(prevWeekDates[i]);
              const curKey = formatDate(weekDates[i]);
              if (prev[prevKey]?.length) {
                updated[curKey] = [...prev[prevKey]];
                const dt = weekDates[i];
                copiedDays.push(`${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} (${DAY_HEADERS[dt.getDay() === 0 ? 6 : dt.getDay() - 1]})`);
              }
            }
            return updated;
          });
          setTimeout(() => {
            Alert.alert('Copied!', `Items copied to:\n${copiedDays.join(', ')}`);
          }, 100);
        },
      },
    ]);
  }, [currentWeekStart, weekDates, dayItems]);

  const copyFrom2WeeksAgo = useCallback(() => {
    const twoWeeksStart = addDays(currentWeekStart, -14);
    const twoWeekDates = getWeekDates(twoWeeksStart);
    const hasItems = twoWeekDates.some(d => (dayItems[formatDate(d)]?.length || 0) > 0);
    if (!hasItems) {
      Alert.alert('No Data', 'No items found from 2 weeks ago to copy.');
      return;
    }
    const copiedDays: string[] = [];
    Alert.alert('Copy from 2 Weeks Ago', 'Copy all items from 2 weeks earlier to this week?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Copy', onPress: () => {
          setDayItems(prev => {
            const updated = { ...prev };
            for (let i = 0; i < 7; i++) {
              const srcKey = formatDate(twoWeekDates[i]);
              const curKey = formatDate(weekDates[i]);
              if (prev[srcKey]?.length) {
                updated[curKey] = [...prev[srcKey]];
                const dt = weekDates[i];
                copiedDays.push(`${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} (${DAY_HEADERS[dt.getDay() === 0 ? 6 : dt.getDay() - 1]})`);
              }
            }
            return updated;
          });
          setTimeout(() => {
            Alert.alert('Copied!', `Items copied to:\n${copiedDays.join(', ')}`);
          }, 100);
        },
      },
    ]);
  }, [currentWeekStart, weekDates, dayItems]);

  /* ─── Proceed to Checkout ─── */
  const handleProceed = useCallback(() => {
    if (allDatesWithItems.length === 0) {
      Alert.alert('No Items', 'Please add items for at least one day.');
      return;
    }
    for (const date of allDatesWithItems) {
      for (const item of dayItems[date]) {
        const product = (products as any[]).find(p => p.id === item.productId);
        if (product) {
          addToCart(product, item.quantity, undefined, item.cutType, undefined, item.packId, item.packName);
        }
      }
    }
    // Build delivery dates summary for checkout
    const deliveryDates = allDatesWithItems.join(',');
    const deliveryDaysCount = allDatesWithItems.length;
    router.push({
      pathname: '/checkout',
      params: {
        orderType: 'subscribe',
        subFrequency: frequency,
        subStartDate: allDatesWithItems[0],
        subDeliveryDates: deliveryDates,
        subDaysCount: String(deliveryDaysCount),
        subTimeSlot: timeSlot,
        ...(params.groupCode ? { groupCode: params.groupCode, groupName: params.groupName } : {}),
      },
    } as any);
  }, [allDatesWithItems, dayItems, frequency, addToCart, router, params.groupCode, params.groupName]);

  /* ─── Render ─── */
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
            <Text style={[styles.headerTitle, themed.textPrimary]}>{params.groupCode ? 'Group ' : ''}Subscription Setup</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {[1, 2, 3].map(s => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
            </View>
            <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
              {s === 1 ? 'Frequency' : s === 2 ? 'Plan Items' : 'Review'}
            </Text>
          </View>
        ))}
        <View style={styles.stepLine} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ━━━ STEP 1: Frequency ━━━ */}
        {step === 1 && (
          <View>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Choose Delivery Frequency</Text>
            <Text style={styles.sectionDesc}>How often would you like fresh cut produce delivered?</Text>

            {FREQ_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.freqCard, themed.card, frequency === opt.value && styles.freqCardActive]}
                onPress={() => setFrequency(opt.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.freqIconWrap, frequency === opt.value && styles.freqIconWrapActive]}>
                  <Icon name={opt.icon as any} size={24} color={frequency === opt.value ? '#FFF' : COLORS.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.freqTitle, themed.textPrimary]}>{opt.label}</Text>
                  <Text style={styles.freqDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.freqRadio, frequency === opt.value && styles.freqRadioActive]}>
                  {frequency === opt.value && <View style={styles.freqRadioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Preferred Delivery Time */}
            <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: SPACING.lg }]}>Preferred Delivery Time</Text>
            <Text style={styles.sectionDesc}>When would you like your delivery?</Text>

            <View style={styles.timeGrid}>
              {TIME_SLOTS.map(slot => {
                const isActive = timeSlot === slot.id;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.timeCard, themed.card, isActive && styles.timeCardActive]}
                    onPress={() => setTimeSlot(slot.id)}
                    activeOpacity={0.8}
                  >
                    <Icon name={slot.icon as any} size={18} color={isActive ? '#FFF' : COLORS.primary} />
                    <Text style={[styles.timeCardText, isActive && styles.timeCardTextActive]}>{slot.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ━━━ Special Plans ━━━ */}
            <Text style={[styles.sectionTitle, themed.textPrimary, { marginTop: SPACING.lg }]}>Special Plans</Text>
            <Text style={styles.sectionDesc}>Choose a recommended plan or build your own in the next step</Text>

            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }} contentContainerStyle={{ gap: 8 }}>
              {PLAN_CATEGORIES.map(cat => {
                const isActive = planCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.planCatChip, isActive && styles.planCatChipActive]}
                    onPress={() => setPlanCategory(cat.key)}
                  >
                    <Icon name={cat.icon as any} size={14} color={isActive ? '#FFF' : COLORS.text.secondary} />
                    <Text style={[styles.planCatChipText, isActive && styles.planCatChipTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Setup Profile Prompt */}
            {!profileComplete && (
              <TouchableOpacity
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF3E0', borderRadius: RADIUS.lg, padding: 14, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#FFE0B2' }]}
                onPress={() => router.push('/diet-preferences' as any)}
                activeOpacity={0.8}
              >
                <View style={{ backgroundColor: '#FF6F00', borderRadius: 10, padding: 8 }}>
                  <Icon name="account-cog" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700' }, themed.textPrimary]}>Set up your profile for personalized plans</Text>
                  <Text style={{ fontSize: 10, color: COLORS.text.muted }}>Tell us your goal, gender & lifestyle for smart recommendations</Text>
                </View>
                <Icon name="chevron-right" size={18} color="#FF6F00" />
              </TouchableOpacity>
            )}

            {/* Recommended badge when showing personalized results */}
            {planCategory === 'recommended' && sortedPlans.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Icon name="star-circle" size={14} color={COLORS.primary} />
                <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>Personalized plans based on your profile</Text>
              </View>
            )}

            {planCategory === 'recommended' && sortedPlans.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Icon name="account-cog-outline" size={40} color={COLORS.text.muted} />
                <Text style={[{ fontSize: 14, fontWeight: '700', marginTop: 10 }, themed.textPrimary]}>No personalized plans yet</Text>
                <Text style={{ fontSize: 12, color: COLORS.text.muted, textAlign: 'center', marginTop: 4 }}>Set up your profile to get smart recommendations</Text>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 12 }}
                  onPress={() => router.push('/diet-preferences' as any)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Set Up Profile</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Plan Cards */}
            {sortedPlans.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.specialPlanCard, themed.card, selectedPlan?.id === plan.id && { borderColor: plan.color, borderWidth: 2 }]}
                onPress={() => { setSelectedPlan(plan); setSelectedDishPack(null); setShowPlanDetail(true); }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: plan.image }} style={styles.specialPlanImage} />
                <View style={styles.specialPlanContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <View style={[styles.specialPlanIcon, { backgroundColor: plan.bgColor }]}>
                      <Icon name={plan.icon as any} size={14} color={plan.color} />
                    </View>
                    <Text style={[styles.specialPlanName, themed.textPrimary]}>{plan.name}</Text>
                    {plan.tag && (
                      <View style={[styles.specialPlanTag, { backgroundColor: plan.bgColor }]}>
                        <Text style={[styles.specialPlanTagText, { color: plan.color }]}>{plan.tag}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.specialPlanDesc} numberOfLines={2}>{plan.description}</Text>

                  {/* Benefits preview */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {plan.benefits.slice(0, 3).map((b, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Icon name="check-circle" size={10} color={plan.color} />
                        <Text style={{ fontSize: 9, color: COLORS.text.secondary, fontWeight: '600' }}>{b}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Health tip preview */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 5, backgroundColor: '#FFFDE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Icon name="lightbulb-on" size={10} color="#F57C00" style={{ marginTop: 1 }} />
                    <Text style={{ fontSize: 9, color: '#5D4037', fontWeight: '600', flex: 1 }} numberOfLines={2}>{plan.healthTips[0]}</Text>
                  </View>

                  {/* Best for */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: plan.bgColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                    <Icon name="account-group" size={11} color={plan.color} />
                    <Text style={{ fontSize: 9, color: plan.color, fontWeight: '700' }}>{plan.bestFor}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Text style={[styles.specialPlanPrice, { color: plan.color }]}>{'\u20B9'}{plan.pricePerDay}/day</Text>
                    <Text style={styles.specialPlanItems}>{plan.dailyItems.length} items</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Skip plan option */}
            <TouchableOpacity
              style={[styles.skipPlanBtn, themed.card]}
              onPress={() => { setSelectedPlan(null); setSelectedDishPack(null); setStep(2); }}
              activeOpacity={0.8}
            >
              <Icon name="plus-circle-outline" size={20} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.skipPlanTitle, themed.textPrimary]}>Build Your Own Plan</Text>
                <Text style={styles.skipPlanDesc}>Skip plans and choose your own products</Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextBtn} onPress={(selectedPlan || selectedDishPack) ? goToStep2WithPlan : () => setStep(2)} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{(selectedPlan || selectedDishPack) ? 'Continue with Plan' : 'Continue'}</Text>
              <Icon name="arrow-right" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ━━━ STEP 2: Calendar + Items ━━━ */}
        {step === 2 && (
          <View>
            {/* Selected Plan Badge */}
            {selectedPlan && (
              <View style={[styles.selectedPlanBadge, { borderColor: selectedPlan.color }]}>
                <View style={[styles.specialPlanIcon, { backgroundColor: selectedPlan.bgColor }]}>
                  <Icon name={selectedPlan.icon as any} size={14} color={selectedPlan.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700' }, themed.textPrimary]}>{selectedPlan.name}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.text.muted }}>Items pre-filled from plan. You can customize below.</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedPlan(null); setDayItems({}); }}>
                  <Icon name="close-circle" size={18} color={COLORS.text.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Dish Pack Badge */}
            {selectedDishPack && (
              <View style={[styles.selectedPlanBadge, { borderColor: '#F57C00' }]}>
                <View style={[styles.specialPlanIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Icon name="package-variant" size={14} color="#F57C00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700' }, themed.textPrimary]}>{selectedDishPack.name}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.text.muted }}>Pack items pre-filled. You can customize below.</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedDishPack(null); setDayItems({}); }}>
                  <Icon name="close-circle" size={18} color={COLORS.text.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Frequency Guide */}
            <View style={[styles.freqGuide, themed.card]}>
              <Icon
                name={frequency === 'daily' ? 'calendar-today' : frequency === 'weekly' ? 'calendar-week' : 'calendar-month'}
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.freqGuideText}>
                {frequency === 'daily'
                  ? 'Select a start date. Same items will be delivered every day.'
                  : frequency === 'weekly'
                  ? 'Select the days of the week you want delivery. Add different items per day.'
                  : 'Select specific dates in the month for delivery.'}
              </Text>
            </View>

            {/* Month Calendar */}
            <View style={[styles.calendarCard, themed.card]}>
              <View style={styles.calMonthRow}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.calNavBtn}>
                  <Icon name="chevron-left" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={[styles.calMonthTitle, themed.textPrimary]}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.calNavBtn}>
                  <Icon name="chevron-right" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.calDayHeaderRow}>
                {DAY_HEADERS.map(d => (
                  <View key={d} style={styles.calDayHeaderCell}>
                    <Text style={styles.calDayHeaderText}>{d}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calGrid}>
                {calendarDays.map((date, i) => {
                  if (!date) return <View key={`empty-${i}`} style={styles.calCell} />;
                  const key = formatDate(date);
                  const isActive = key === selectedDate;
                  const isChosen = selectedDates.includes(key);
                  const isToday = key === formatDate(today);
                  const hasItems = (dayItems[key]?.length || 0) > 0;
                  const isPast = date < today && key !== formatDate(today);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.calCell}
                      onPress={() => toggleDate(key)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.calCellInner,
                        isChosen && !isActive && styles.calCellMultiSelected,
                        isActive && isChosen && styles.calCellSelected,
                        isActive && !isChosen && styles.calCellActiveNotChosen,
                        isToday && !isActive && !isChosen && styles.calCellToday,
                      ]}>
                        <Text style={[
                          styles.calCellText,
                          isActive && isChosen && styles.calCellTextSelected,
                          isChosen && !isActive && styles.calCellTextMultiSelected,
                          isPast && !isActive && !isChosen && styles.calCellTextPast,
                        ]}>
                          {date.getDate()}
                        </Text>
                      </View>
                      {hasItems && <View style={[styles.calCellDot, (isActive && isChosen) && styles.calCellDotSelected, isChosen && !isActive && styles.calCellDotChosen]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Dates Info */}
            <View style={styles.selectedDatesInfo}>
              <Icon name="calendar-check" size={16} color={COLORS.primary} />
              <Text style={styles.selectedDatesInfoText}>
                {frequency === 'daily'
                  ? `Start date: ${new Date(selectedDates[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — daily delivery`
                  : `${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''} selected`}
              </Text>
              {selectedDates.length > 1 && (
                <TouchableOpacity
                  style={styles.clearDatesBtn}
                  onPress={() => { setSelectedDates([selectedDate]); }}
                >
                  <Text style={styles.clearDatesBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Copy Actions — Weekly */}
            {frequency === 'weekly' && (
              <View style={styles.copyActions}>
                <TouchableOpacity style={[styles.copyBtn, themed.card]} onPress={copyToAllSelectedDays}>
                  <Icon name="content-copy" size={16} color={COLORS.primary} />
                  <Text style={styles.copyBtnText}>Copy to All Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.copyBtn, themed.card]} onPress={repeatLastWeek}>
                  <Icon name="replay" size={16} color="#F57C00" />
                  <Text style={styles.copyBtnText}>Repeat Last Week</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.copyBtn, themed.card]} onPress={copyFrom2WeeksAgo}>
                  <Icon name="history" size={16} color="#7B1FA2" />
                  <Text style={styles.copyBtnText}>From 2 Weeks Ago</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Copy Actions — Monthly */}
            {frequency === 'monthly' && (
              <View style={styles.copyActions}>
                <TouchableOpacity style={[styles.copyBtn, themed.card]} onPress={copyToAllSelectedDays}>
                  <Icon name="content-copy" size={16} color={COLORS.primary} />
                  <Text style={styles.copyBtnText}>Same for All Dates</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.copyBtn, themed.card]} onPress={() => {
                  if (selectedItems.length === 0) {
                    Alert.alert('No Items', 'Add items to the current date first.');
                    return;
                  }
                  const targetDates = selectedDates.filter(d => d !== selectedDate);
                  if (targetDates.length === 0) {
                    Alert.alert('No Other Dates', 'Select more dates on the calendar first.');
                    return;
                  }
                  Alert.alert(
                    'Copy to Next Month',
                    'Copy items from your selected dates to the same dates next month?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Copy', onPress: () => {
                        setDayItems(prev => {
                          const updated = { ...prev };
                          selectedDates.forEach(dateKey => {
                            const d = new Date(dateKey + 'T00:00:00');
                            const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
                            const nextKey = formatDate(nextMonth);
                            updated[nextKey] = [...(updated[dateKey] || [])];
                          });
                          return updated;
                        });
                        Alert.alert('Copied!', 'Items copied to next month\'s dates.');
                      }},
                    ]
                  );
                }}>
                  <Icon name="calendar-arrow-right" size={16} color="#F57C00" />
                  <Text style={styles.copyBtnText}>Copy to Next Month</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Weekly & Monthly: selected dates chips */}
            {(frequency === 'weekly' || frequency === 'monthly') && selectedDates.length > 0 && (
              <View style={[styles.monthlyDatesCard, themed.card]}>
                <Text style={[styles.monthlyDatesTitle, themed.textPrimary]}>Selected Delivery Dates</Text>
                {disabledDates.some(d => selectedDates.includes(d)) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm }}>
                    <Icon name="information-outline" size={12} color={COLORS.text.muted} />
                    <Text style={{ fontSize: 10, color: COLORS.text.muted }}>Tap the toggle to skip or resume a delivery day</Text>
                  </View>
                )}
                <View style={styles.monthlyDatesChips}>
                  {selectedDates.sort().map(dateKey => {
                    const d = new Date(dateKey + 'T00:00:00');
                    const isActive = dateKey === selectedDate;
                    const isDisabled = disabledDates.includes(dateKey);
                    return (
                      <View key={dateKey} style={{ position: 'relative' }}>
                        <TouchableOpacity
                          style={[styles.monthlyDateChip, isActive && !isDisabled && styles.monthlyDateChipActive, isDisabled && styles.dateChipDisabled]}
                          onPress={() => { if (!isDisabled) setSelectedDate(dateKey); }}
                        >
                          <Text style={[styles.monthlyDateChipDay, isActive && !isDisabled && styles.monthlyDateChipDayActive, isDisabled && styles.dateChipDisabledText]}>
                            {DAY_HEADERS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                          </Text>
                          <Text style={[styles.monthlyDateChipDate, isActive && !isDisabled && styles.monthlyDateChipDateActive, isDisabled && styles.dateChipDisabledText]}>
                            {d.getDate()}
                          </Text>
                          <Text style={[styles.monthlyDateChipMonth, isActive && !isDisabled && styles.monthlyDateChipMonthActive, isDisabled && styles.dateChipDisabledText]}>
                            {MONTH_SHORT[d.getMonth()]}
                          </Text>
                          {!isDisabled && (dayItems[dateKey]?.length || 0) > 0 && (
                            <View style={[styles.monthlyDateChipBadge, isActive && styles.monthlyDateChipBadgeActive]}>
                              <Text style={[styles.monthlyDateChipBadgeText, isActive && { color: COLORS.primary }]}>{dayItems[dateKey].length}</Text>
                            </View>
                          )}
                          {isDisabled && (
                            <View style={{ backgroundColor: '#FFEBEE', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 3 }}>
                              <Text style={{ fontSize: 7, fontWeight: '700', color: COLORS.status.error }}>SKIPPED</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateChipToggleBtn}
                          onPress={() => {
                            setDisabledDates(prev =>
                              prev.includes(dateKey)
                                ? prev.filter(dk => dk !== dateKey)
                                : [...prev, dateKey]
                            );
                          }}
                        >
                          <Icon
                            name={isDisabled ? 'plus-circle' : 'close-circle'}
                            size={16}
                            color={isDisabled ? COLORS.primary : COLORS.status.error}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Daily info */}
            {frequency === 'daily' && selectedDates.length === 1 && (
              <View style={[styles.dailyInfoCard, themed.card]}>
                <Icon name="information-outline" size={16} color="#1565C0" />
                <Text style={styles.dailyInfoText}>
                  Add items below. The same items will be delivered every day starting from your selected date. You can skip any day later from Manage Subscription.
                </Text>
              </View>
            )}

            {/* Add Buttons */}
            <View style={styles.addRow}>
              <TouchableOpacity style={[styles.addCardBtn, themed.card]} onPress={() => { setPickerCategory(null); setShowProductPicker(true); }}>
                <Icon name="plus-circle" size={22} color={COLORS.primary} />
                <Text style={[styles.addCardBtnText, themed.textPrimary]}>Add Product</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addCardBtn, themed.card]} onPress={() => setShowPackPicker(true)}>
                <Icon name="package-variant-plus" size={22} color="#F57C00" />
                <Text style={[styles.addCardBtnText, themed.textPrimary]}>Add Dish Pack</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addCardBtn, themed.card, cartItems.length === 0 && { opacity: 0.4 }]}
                onPress={() => cartItems.length > 0 ? setShowCartPicker(true) : Alert.alert('Cart Empty', 'Your cart has no items to add.')}
              >
                <Icon name="cart-arrow-down" size={22} color="#7B1FA2" />
                <Text style={[styles.addCardBtnText, themed.textPrimary]}>From Cart</Text>
              </TouchableOpacity>
            </View>

            {/* Items for Selected Day */}
            <View style={[styles.itemsCard, themed.card]}>
              {selectedDates.length > 1 && frequency !== 'daily' && (
                <View style={styles.multiSelectBanner}>
                  <Icon name="information-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.multiSelectBannerText}>
                    Adding items will apply to all {selectedDates.length} selected {frequency === 'weekly' ? 'days' : 'dates'}
                  </Text>
                </View>
              )}
              <Text style={[styles.itemsCardTitle, themed.textPrimary]}>
                {frequency === 'daily'
                  ? 'Items for Every Day'
                  : `Items for ${new Date(selectedDate + 'T00:00:00').getDate()} ${MONTH_SHORT[new Date(selectedDate + 'T00:00:00').getMonth()]} (${DAY_HEADERS[new Date(selectedDate + 'T00:00:00').getDay() === 0 ? 6 : new Date(selectedDate + 'T00:00:00').getDay() - 1]})`}
              </Text>

              {selectedItems.length === 0 ? (
                <View style={styles.emptyItems}>
                  <Icon name="cart-outline" size={40} color={COLORS.text.muted} />
                  <Text style={styles.emptyText}>No items for this day</Text>
                  <Text style={styles.emptySubText}>Add products or a dish pack above</Text>
                </View>
              ) : (
                <View>
                  {/* Pack Cards */}
                  {groupedItems.packs.map(pack => {
                    const isExpanded = expandedPacks.includes(pack.packId);
                    const packData = DISH_PACKS.find(p => p.id === pack.packId);
                    return (
                      <View key={pack.packId} style={styles.packCard}>
                        <TouchableOpacity style={styles.packCardHeader} onPress={() => togglePackExpand(pack.packId)} activeOpacity={0.7}>
                          {packData?.image ? (
                            <Image source={{ uri: packData.image }} style={styles.packCardImage} />
                          ) : (
                            <View style={[styles.packCardImage, { backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' }]}>
                              <Icon name="package-variant" size={20} color="#F57C00" />
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.packCardName, themed.textPrimary]}>{pack.packName}</Text>
                            <Text style={styles.packCardMeta}>{pack.items.length} items · {'\u20B9'}{pack.totalPrice}</Text>
                          </View>
                          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.text.muted} />
                          <TouchableOpacity style={styles.removeBtn} onPress={() => removePack(pack.packId)}>
                            <Icon name="trash-can-outline" size={16} color={COLORS.status.error} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                        {isExpanded && pack.items.map(({ item, index }, i) => (
                          <View key={`${item.productId}-${index}`} style={[styles.itemRow, styles.packItemIndent, i < pack.items.length - 1 && styles.itemRowBorder]}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={styles.itemImage} />
                            ) : (
                              <View style={[styles.itemImage, { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }]}>
                                <Icon name="food-apple" size={20} color={COLORS.text.muted} />
                              </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={[styles.itemName, themed.textPrimary]}>{item.name}</Text>
                              <View style={styles.itemMeta}>
                                <Text style={styles.itemUnit}>{item.unit}</Text>
                                <Text style={styles.itemPrice}>{'\u20B9'}{item.price}</Text>
                              </View>
                              <TouchableOpacity style={styles.cutSelectBtn} onPress={() => { setEditingItemIndex(index); setShowCutPicker(true); }}>
                                <Icon name="content-cut" size={12} color={COLORS.primary} />
                                <Text style={styles.cutSelectText}>
                                  {item.cutType ? CUT_OPTIONS.find(c => c.value === item.cutType)?.label : 'Select Cut'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.qtyControls}>
                              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQty(index, -1)}>
                                <Icon name="minus" size={14} color={COLORS.text.secondary} />
                              </TouchableOpacity>
                              <Text style={[styles.qtyText, themed.textPrimary]}>{item.quantity}</Text>
                              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQty(index, 1)}>
                                <Icon name="plus" size={14} color={COLORS.primary} />
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(index)}>
                              <Icon name="trash-can-outline" size={16} color={COLORS.status.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    );
                  })}

                  {/* Individual Items */}
                  {groupedItems.individuals.map(({ item, index }, i) => (
                    <View key={`${item.productId}-${index}`} style={[styles.itemRow, i < groupedItems.individuals.length - 1 && styles.itemRowBorder]}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.itemImage} />
                      ) : (
                        <View style={[styles.itemImage, { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }]}>
                          <Icon name="food-apple" size={20} color={COLORS.text.muted} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.itemName, themed.textPrimary]}>{item.name}</Text>
                        <View style={styles.itemMeta}>
                          <Text style={styles.itemUnit}>{item.unit}</Text>
                          <Text style={styles.itemPrice}>{'\u20B9'}{item.price}</Text>
                        </View>
                        <TouchableOpacity style={styles.cutSelectBtn} onPress={() => { setEditingItemIndex(index); setShowCutPicker(true); }}>
                          <Icon name="content-cut" size={12} color={COLORS.primary} />
                          <Text style={styles.cutSelectText}>
                            {item.cutType ? CUT_OPTIONS.find(c => c.value === item.cutType)?.label : 'Select Cut'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.qtyControls}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQty(index, -1)}>
                          <Icon name="minus" size={14} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, themed.textPrimary]}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQty(index, 1)}>
                          <Icon name="plus" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(index)}>
                        <Icon name="trash-can-outline" size={16} color={COLORS.status.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
                <Icon name="arrow-left" size={16} color={COLORS.primary} />
                <Text style={styles.backStepBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  if (allDatesWithItems.length === 0) {
                    Alert.alert('No Items', 'Add items for at least one day to continue.');
                    return;
                  }
                  setStep(3);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Review Plan</Text>
                <Icon name="arrow-right" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ━━━ STEP 3: Review ━━━ */}
        {step === 3 && (
          <View>
            <Text style={[styles.sectionTitle, themed.textPrimary]}>Review Your {params.groupCode ? 'Group ' : ''}Subscription</Text>

            <LinearGradient colors={COLORS.gradient.primary} style={styles.reviewBanner}>
              {params.groupCode && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8, alignSelf: 'center' }}>
                  <Icon name="account-group" size={14} color="#FFF" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Group: {params.groupName || params.groupCode}</Text>
                </View>
              )}
              <View style={styles.reviewRow}>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewValue}>{params.groupCode ? 'Group ' : ''}{frequency}</Text>
                  <Text style={styles.reviewLabel}>Frequency</Text>
                </View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewValue}>{allDatesWithItems.length}</Text>
                  <Text style={styles.reviewLabel}>Days</Text>
                </View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewValue}>{totalItems}</Text>
                  <Text style={styles.reviewLabel}>Items</Text>
                </View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewValue}>{'\u20B9'}{totalPrice}</Text>
                  <Text style={styles.reviewLabel}>Est. Total</Text>
                </View>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="clock-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                  Delivery Time: {TIME_SLOTS.find(t => t.id === timeSlot)?.full}
                </Text>
              </View>
            </LinearGradient>

            {/* Delivery Schedule */}
            <View style={[styles.scheduleCard, themed.card]}>
              <View style={styles.scheduleHeader}>
                <Icon name="truck-delivery-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.scheduleTitle, themed.textPrimary]}>Delivery Schedule</Text>
              </View>
              <Text style={styles.scheduleDesc}>
                {frequency === 'weekly'
                  ? `Daily delivery for ${allDatesWithItems.length} days with different items per day`
                  : frequency === 'daily'
                  ? `Delivery every day starting ${new Date(allDatesWithItems[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                  : `Monthly delivery on selected dates`}
              </Text>
              <View style={styles.scheduleDays}>
                {allDatesWithItems.map(date => {
                  const d = new Date(date + 'T00:00:00');
                  const dayName = DAY_HEADERS[d.getDay() === 0 ? 6 : d.getDay() - 1];
                  const itemCount = dayItems[date].length;
                  return (
                    <View key={date} style={styles.scheduleDayChip}>
                      <Text style={styles.scheduleDayChipDay}>{dayName}</Text>
                      <Text style={styles.scheduleDayChipDate}>{d.getDate()} {MONTH_SHORT[d.getMonth()]}</Text>
                      <Text style={styles.scheduleDayChipItems}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Day-wise Breakdown */}
            {frequency === 'daily' ? (
              /* Daily: show single card for "Every Day" items */
              (() => {
                const items = dayItems[allDatesWithItems[0]] || [];
                const dayTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <View style={[styles.reviewDayCard, themed.card]}>
                    <View style={styles.reviewDayHeader}>
                      <View style={[styles.reviewDayLabel, { width: 'auto' as any, paddingHorizontal: 8 }]}>
                        <Text style={styles.reviewDayName}>Daily</Text>
                      </View>
                      <Text style={[styles.reviewDayDate, themed.textPrimary]}>
                        Every Day
                      </Text>
                      <Text style={styles.reviewDayTotal}>{'\u20B9'}{dayTotal}/day</Text>
                    </View>
                    {items.map((item, i) => (
                      <Text key={`${item.productId}-${i}`} style={styles.reviewItemText}>
                        {item.name} x{item.quantity}
                        {item.cutType ? ` (${CUT_OPTIONS.find(c => c.value === item.cutType)?.label})` : ''}
                      </Text>
                    ))}
                  </View>
                );
              })()
            ) : (
              /* Weekly / Monthly: show per-day cards */
              allDatesWithItems.map(date => {
                const d = new Date(date + 'T00:00:00');
                const items = dayItems[date];
                const dayTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <View key={date} style={[styles.reviewDayCard, themed.card]}>
                    <View style={styles.reviewDayHeader}>
                      <View style={styles.reviewDayLabel}>
                        <Text style={styles.reviewDayName}>{DAY_HEADERS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</Text>
                      </View>
                      <Text style={[styles.reviewDayDate, themed.textPrimary]}>
                        {d.getDate()} {MONTH_SHORT[d.getMonth()]}
                      </Text>
                      <Text style={styles.reviewDayTotal}>{'\u20B9'}{dayTotal}</Text>
                    </View>
                    {items.map((item, i) => (
                      <Text key={`${item.productId}-${i}`} style={styles.reviewItemText}>
                        {item.name} x{item.quantity}
                        {item.cutType ? ` (${CUT_OPTIONS.find(c => c.value === item.cutType)?.label})` : ''}
                      </Text>
                    ))}
                  </View>
                );
              })
            )}

            {/* After Subscription Info */}
            <View style={[styles.infoCard, themed.card]}>
              <Text style={[styles.infoCardTitle, themed.textPrimary]}>After You Subscribe</Text>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="calendar-check" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoItemTitle, themed.textPrimary]}>View Your Deliveries</Text>
                  <Text style={styles.infoItemDesc}>Go to Profile → My Subscriptions to see all upcoming delivery dates and items</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#FFF3E0' }]}>
                  <Icon name="calendar-remove" size={16} color="#F57C00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoItemTitle, themed.textPrimary]}>Skip a Day</Text>
                  <Text style={styles.infoItemDesc}>Don't want delivery on a specific day? Tap "Skip" next to that date in Manage Subscription</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#E3F2FD' }]}>
                  <Icon name="pause-circle-outline" size={16} color="#1565C0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoItemTitle, themed.textPrimary]}>Pause or Cancel</Text>
                  <Text style={styles.infoItemDesc}>Pause your subscription anytime or cancel it from the Manage screen. Going on vacation? Use Vacation Mode</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#F3E5F5' }]}>
                  <Icon name="pencil-outline" size={16} color="#7B1FA2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoItemTitle, themed.textPrimary]}>Edit Weekly Plan</Text>
                  <Text style={styles.infoItemDesc}>Change items, quantities, or cut types for any day from the Plan Editor</Text>
                </View>
              </View>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(2)}>
                <Icon name="arrow-left" size={16} color={COLORS.primary} />
                <Text style={styles.backStepBtnText}>Edit Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.proceedBtn}
                onPress={handleProceed}
                activeOpacity={0.85}
              >
                <Text style={styles.proceedBtnText}>Proceed to Checkout</Text>
                <Icon name="arrow-right" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => { if (pickerCategory) setPickerCategory(null); else setShowProductPicker(false); }}>
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]}>
          <View style={styles.modalHeader}>
            {pickerCategory ? (
              <TouchableOpacity onPress={() => setPickerCategory(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="arrow-left" size={22} color={COLORS.primary} />
                <Text style={[styles.modalTitle, themed.textPrimary]}>{PICKER_CATEGORIES.find(c => c.key === pickerCategory)?.label}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.modalTitle, themed.textPrimary]}>Choose Category</Text>
            )}
            <TouchableOpacity onPress={() => { setShowProductPicker(false); setPickerCategory(null); }}>
              <Icon name="close" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          {!pickerCategory ? (
            <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
              <Text style={[styles.sectionDesc, { marginBottom: SPACING.md }]}>Select a category to browse products</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
                {PICKER_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={{ width: '47%' as any, alignItems: 'center', borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: cat.color, ...SHADOW.sm }}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (cat.key === 'Packs') {
                        setShowProductPicker(false);
                        setPickerCategory(null);
                        setShowPackPicker(true);
                      } else {
                        setPickerCategory(cat.key);
                      }
                    }}
                  >
                    <Image source={{ uri: cat.image }} style={{ width: '100%', height: 90 }} resizeMode="cover" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text.primary, paddingVertical: 10, textAlign: 'center' }}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            /* Browse-style Product Grid for Selected Category */
            <FlatList
              data={filteredPickerProducts}
              numColumns={2}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, paddingBottom: 40 }}
              columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 60 }}><Icon name="magnify" size={48} color={COLORS.text.muted} /><Text style={{ fontSize: 14, color: COLORS.text.muted, marginTop: 8 }}>No products found</Text></View>}
              renderItem={({ item }) => {
                const alreadyAdded = selectedItems.some(i => i.productId === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.browseCard, themed.card, alreadyAdded && { borderColor: COLORS.primary, borderWidth: 2 }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!alreadyAdded) {
                        setPendingSubProductId(item.id);
                        setShowProductPicker(false);
                        router.push({ pathname: '/product-detail', params: { id: item.id, from: 'subscription' } });
                      }
                    }}
                  >
                    <View style={styles.browseCardImageWrap}>
                      <Image source={{ uri: item.image }} style={styles.browseCardImage} resizeMode="cover" />
                      {item.discount && <View style={styles.browseDiscountTag}><Text style={styles.browseDiscountText}>{item.discount}</Text></View>}
                      {alreadyAdded && (
                        <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: COLORS.primary, borderRadius: 12, padding: 2 }}>
                          <Icon name="check" size={14} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.browseCardBody}>
                      <Text style={[styles.browseCardName, themed.textPrimary]} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.browseCardUnit}>{item.unit}</Text>
                      {item.tags && item.tags[0] && (
                        <View style={styles.browseCardTag}><Text style={styles.browseCardTagText}>{item.tags[0]}</Text></View>
                      )}
                      <View style={styles.browseCardPriceRow}>
                        <Text style={[styles.browseCardPrice, themed.textPrimary]}>{'\u20B9'}{item.price}</Text>
                        {alreadyAdded ? (
                          <View style={[styles.browseAddBtn, { borderColor: COLORS.text.muted }]}>
                            <Text style={[styles.browseAddBtnText, { color: COLORS.text.muted }]}>ADDED</Text>
                          </View>
                        ) : (
                          <View style={styles.browseAddBtn}>
                            <Text style={styles.browseAddBtnText}>ADD</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Pack Picker Modal */}
      <Modal visible={showPackPicker} animationType="slide" onRequestClose={() => setShowPackPicker(false)}>
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.textPrimary]}>Choose a Dish Pack</Text>
            <TouchableOpacity onPress={() => setShowPackPicker(false)}>
              <Icon name="close" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={DISH_PACKS}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: SPACING.base }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.packPickerCard} onPress={() => {
                setPendingSubPackId(item.id);
                setShowPackPicker(false);
                router.push({ pathname: '/dish-pack-detail', params: { id: item.id, from: 'subscription' } });
              }}>
                <Image source={{ uri: item.image }} style={styles.packPickerImage} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.packPickerName, themed.textPrimary]}>{item.name}</Text>
                  <Text style={styles.packPickerDesc}>{item.description}</Text>
                  <View style={styles.packPickerMeta}>
                    <Text style={styles.packPickerPrice}>{'\u20B9'}{item.price}</Text>
                    <Text style={styles.packPickerServes}>{item.serves}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Cart Picker Modal */}
      <Modal visible={showCartPicker} animationType="slide" onRequestClose={() => setShowCartPicker(false)}>
        <SafeAreaView style={[styles.modalSafe, themed.safeArea]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.textPrimary]}>Add from Cart</Text>
            <TouchableOpacity onPress={() => setShowCartPicker(false)}>
              <Icon name="close" size={24} color={themed.colors.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={cartItems}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={{ padding: SPACING.base }}
            ListEmptyComponent={
              <View style={styles.emptyItems}>
                <Icon name="cart-outline" size={40} color={COLORS.text.muted} />
                <Text style={styles.emptyText}>Your cart is empty</Text>
              </View>
            }
            renderItem={({ item }) => {
              const alreadyAdded = selectedItems.some(i => i.productId === item.id);
              return (
                <TouchableOpacity
                  style={[styles.pickerRow, alreadyAdded && styles.pickerRowAdded]}
                  onPress={() => !alreadyAdded && addFromCart(item)}
                  disabled={alreadyAdded}
                >
                  <Image source={{ uri: item.image }} style={styles.pickerImage} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.pickerName, themed.textPrimary]}>{item.name}</Text>
                    <Text style={styles.pickerInfo}>
                      {item.unit} · {'\u20B9'}{item.price} · Qty: {item.quantity}
                      {item.cutType ? ` · ${CUT_OPTIONS.find(c => c.value === item.cutType)?.label}` : ''}
                    </Text>
                  </View>
                  {alreadyAdded ? (
                    <Icon name="check-circle" size={20} color={COLORS.primary} />
                  ) : (
                    <Icon name="plus-circle-outline" size={20} color="#7B1FA2" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Special Plan Detail Modal */}
      <Modal visible={showPlanDetail && !!selectedPlan} transparent animationType="slide" onRequestClose={() => setShowPlanDetail(false)}>
        <View style={styles.planDetailOverlay}>
          <View style={[styles.planDetailContent, themed.card]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPlan && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.specialPlanIcon, { backgroundColor: selectedPlan.bgColor, width: 36, height: 36, borderRadius: 12 }]}>
                        <Icon name={selectedPlan.icon as any} size={18} color={selectedPlan.color} />
                      </View>
                      <View>
                        <Text style={[styles.planDetailTitle, themed.textPrimary]}>{selectedPlan.name}</Text>
                        <Text style={[styles.specialPlanPrice, { color: selectedPlan.color }]}>{'\u20B9'}{selectedPlan.pricePerDay}/day</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowPlanDetail(false)}>
                      <Icon name="close" size={22} color={COLORS.text.muted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.planDetailDesc}>{selectedPlan.description}</Text>

                  {/* Best For */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: selectedPlan.bgColor, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>
                    <Icon name="account-group" size={16} color={selectedPlan.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: COLORS.text.muted, fontWeight: '600' }}>Best For</Text>
                      <Text style={{ fontSize: 12, color: selectedPlan.color, fontWeight: '700' }}>{selectedPlan.bestFor}</Text>
                    </View>
                  </View>

                  {/* Benefits */}
                  <View style={styles.planDetailBenefits}>
                    {selectedPlan.benefits.map((b, i) => (
                      <View key={i} style={styles.planDetailBenefitRow}>
                        <Icon name="check-circle" size={14} color={selectedPlan.color} />
                        <Text style={styles.planDetailBenefitText}>{b}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Health Tips & Results */}
                  <Text style={[styles.planDetailItemsTitle, themed.textPrimary, { marginTop: SPACING.md }]}>Why This Works</Text>
                  <View style={{ backgroundColor: '#FFFDE7', borderRadius: 12, padding: 12, marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#FFC107' }}>
                    {selectedPlan.healthTips.map((tip, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: i < selectedPlan.healthTips.length - 1 ? 10 : 0 }}>
                        <Icon name="lightbulb-on" size={14} color="#F57C00" style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 12, color: '#5D4037', fontWeight: '500', flex: 1, lineHeight: 18 }}>{tip}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Items Preview */}
                  <Text style={[styles.planDetailItemsTitle, themed.textPrimary]}>Items Included</Text>
                  {selectedPlan.dailyItems.map((pi, i) => {
                    const product = (products as any[]).find(p => p.id === pi.productId);
                    if (!product) return null;
                    return (
                      <View key={`${pi.productId}-${i}`} style={styles.planDetailItemRow}>
                        <Image source={{ uri: product.image }} style={styles.planDetailItemImage} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.planDetailItemName, themed.textPrimary]}>{product.name}</Text>
                          <Text style={styles.planDetailItemMeta}>{product.unit} · x{pi.quantity} · {'\u20B9'}{product.price}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Available Frequencies */}
                  <Text style={[styles.planDetailItemsTitle, themed.textPrimary, { marginTop: SPACING.md }]}>Available As</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.lg }}>
                    {selectedPlan.frequencies.map(f => (
                      <View key={f} style={[styles.planFreqChip, frequency === f && { backgroundColor: selectedPlan.color }]}>
                        <Text style={[styles.planFreqChipText, frequency === f && { color: '#FFF' }]}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Apply Button */}
                  <TouchableOpacity
                    style={[styles.applyPlanBtn, { backgroundColor: selectedPlan.color }]}
                    onPress={() => {
                      setShowPlanDetail(false);
                      goToStep2WithPlan();
                    }}
                    activeOpacity={0.85}
                  >
                    <Icon name="check-circle" size={18} color="#FFF" />
                    <Text style={styles.applyPlanBtnText}>Apply {selectedPlan.name}</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cut Type Picker Modal */}
      <Modal visible={showCutPicker} transparent animationType="fade" onRequestClose={() => setShowCutPicker(false)}>
        <View style={styles.cutModalOverlay}>
          <View style={[styles.cutModalContent, themed.card]}>
            <Text style={[styles.cutModalTitle, themed.textPrimary]}>Select Cut Type</Text>
            {CUT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.cutOption} onPress={() => updateItemCut(opt.value)}>
                <Icon name={opt.icon as any} size={20} color={COLORS.primary} />
                <Text style={[styles.cutOptionText, themed.textPrimary]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cutCancelBtn} onPress={() => setShowCutPicker(false)}>
              <Text style={styles.cutCancelText}>Cancel</Text>
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { padding: SPACING.base, paddingBottom: 20 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, position: 'relative' },
  stepLine: { position: 'absolute', top: '50%' as any, left: 60, right: 60, height: 2, backgroundColor: COLORS.border, zIndex: -1 },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border },
  stepCircleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNum: { fontSize: 13, fontWeight: '800', color: COLORS.text.muted },
  stepNumActive: { color: '#FFF' },
  stepLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.muted, marginTop: 4 },
  stepLabelActive: { color: COLORS.primary },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: COLORS.text.muted, marginBottom: SPACING.lg },
  freqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: 12, ...SHADOW.sm, borderWidth: 2, borderColor: 'transparent' },
  freqCardActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  freqIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  freqIconWrapActive: { backgroundColor: COLORS.primary },
  freqTitle: { fontSize: 15, fontWeight: '700' },
  freqDesc: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  freqRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  freqRadioActive: { borderColor: COLORS.primary },
  freqRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  // Special Plans
  planCatChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  planCatChipActive: { backgroundColor: COLORS.primary },
  planCatChipText: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  planCatChipTextActive: { color: '#FFF' },
  specialPlanCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: RADIUS.lg, marginBottom: 10, overflow: 'hidden', ...SHADOW.sm, borderWidth: 2, borderColor: 'transparent' },
  specialPlanImage: { width: 80, height: '100%' as any, minHeight: 90 },
  specialPlanContent: { flex: 1, padding: 10 },
  specialPlanIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  specialPlanName: { fontSize: 13, fontWeight: '700' },
  specialPlanTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  specialPlanTagText: { fontSize: 8, fontWeight: '800' },
  specialPlanDesc: { fontSize: 10, color: COLORS.text.muted, lineHeight: 15 },
  specialPlanPrice: { fontSize: 13, fontWeight: '800' },
  specialPlanItems: { fontSize: 10, color: COLORS.text.muted },
  skipPlanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  skipPlanTitle: { fontSize: 13, fontWeight: '700' },
  skipPlanDesc: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  // Plan Detail Modal
  planDetailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  planDetailContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, maxHeight: '85%' },
  planDetailTitle: { fontSize: 17, fontWeight: '800' },
  planDetailDesc: { fontSize: 12, color: COLORS.text.muted, lineHeight: 18, marginBottom: SPACING.md },
  planDetailBenefits: { marginBottom: SPACING.md },
  planDetailBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planDetailBenefitText: { fontSize: 12, fontWeight: '600', color: COLORS.text.primary },
  planDetailItemsTitle: { fontSize: 14, fontWeight: '800', marginBottom: SPACING.sm },
  planDetailItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  planDetailItemImage: { width: 40, height: 40, borderRadius: 10 },
  planDetailItemName: { fontSize: 13, fontWeight: '700' },
  planDetailItemMeta: { fontSize: 10, color: COLORS.text.muted, marginTop: 1 },
  planFreqChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F5F5F5' },
  planFreqChipText: { fontSize: 11, fontWeight: '700', color: COLORS.text.secondary },
  applyPlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg },
  applyPlanBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  // Time slots
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
  timeCard: { flexBasis: '30%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 2, borderColor: 'transparent', ...SHADOW.sm },
  timeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  timeCardText: { fontSize: 11, fontWeight: '700', color: COLORS.text.primary },
  timeCardTextActive: { color: '#FFF' },
  selectedPlanBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, borderWidth: 1.5, ...SHADOW.sm },
  freqGuide: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E3F2FD', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  freqGuideText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1565C0', lineHeight: 18 },
  dailyInfoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E3F2FD', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  dailyInfoText: { flex: 1, fontSize: 11, color: '#1565C0', lineHeight: 16 },
  monthlyDatesCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  monthlyDatesTitle: { fontSize: 13, fontWeight: '700', marginBottom: SPACING.sm },
  monthlyDatesChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthlyDateChip: { alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8, minWidth: 52, borderWidth: 1.5, borderColor: 'transparent' },
  monthlyDateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthlyDateChipDay: { fontSize: 9, fontWeight: '700', color: COLORS.text.muted },
  monthlyDateChipDayActive: { color: 'rgba(255,255,255,0.7)' },
  monthlyDateChipDate: { fontSize: 16, fontWeight: '800', color: COLORS.text.primary, marginTop: 1 },
  monthlyDateChipDateActive: { color: '#FFF' },
  monthlyDateChipMonth: { fontSize: 9, fontWeight: '600', color: COLORS.text.muted, marginTop: 1 },
  monthlyDateChipMonthActive: { color: 'rgba(255,255,255,0.7)' },
  monthlyDateChipBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, marginTop: 3 },
  monthlyDateChipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  monthlyDateChipBadgeText: { fontSize: 8, fontWeight: '700', color: COLORS.primary },
  dateChipToggleBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FFF', borderRadius: 10, zIndex: 1 },
  dateChipDisabled: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', borderStyle: 'dashed', opacity: 0.7 },
  dateChipDisabledText: { color: '#BDBDBD', textDecorationLine: 'line-through' },
  calendarCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  calNavBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  calMonthTitle: { fontSize: 16, fontWeight: '800' },
  calDayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  calDayHeaderCell: { width: '14.28%' as any, alignItems: 'center', paddingVertical: 4 },
  calDayHeaderText: { fontSize: 11, fontWeight: '700', color: COLORS.text.muted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%' as any, height: 44, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingVertical: 2 },
  calCellInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calCellSelected: { backgroundColor: COLORS.primary, borderRadius: 17 },
  calCellToday: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 17 },
  calCellText: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  calCellTextSelected: { color: '#FFF', fontWeight: '800' },
  calCellTextPast: { color: COLORS.text.muted },
  calCellDot: { position: 'absolute', bottom: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary },
  calCellDotSelected: { backgroundColor: '#FFF' },
  calCellDotChosen: { backgroundColor: COLORS.primary },
  calCellMultiSelected: { backgroundColor: '#E8F5E9', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 17 },
  calCellActiveNotChosen: { backgroundColor: '#F5F5F5', borderRadius: 17 },
  calCellTextMultiSelected: { color: COLORS.primary, fontWeight: '800' },
  selectedDatesInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm, paddingHorizontal: 4 },
  selectedDatesInfoText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.primary },
  clearDatesBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: '#FFEBEE' },
  clearDatesBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.status.error },
  multiSelectBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  multiSelectBannerText: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.primary },
  copyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 10, ...SHADOW.sm },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.text.primary },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  addCardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 6, ...SHADOW.sm },
  addCardBtnText: { fontSize: 11, fontWeight: '700' },
  itemsCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  itemsCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: SPACING.md },
  emptyItems: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { fontSize: 14, color: COLORS.text.muted, marginTop: SPACING.sm },
  emptySubText: { fontSize: 12, color: COLORS.text.muted, marginTop: 4 },
  packCard: { backgroundColor: '#FFF8F0', borderRadius: RADIUS.md, marginBottom: 10, borderWidth: 1, borderColor: '#FFE0B2', overflow: 'hidden' },
  packCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  packCardImage: { width: 40, height: 40, borderRadius: 10 },
  packCardName: { fontSize: 14, fontWeight: '700' },
  packCardMeta: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  packItemIndent: { paddingLeft: 16, backgroundColor: '#FFFAF5' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemImage: { width: 44, height: 44, borderRadius: 10 },
  itemName: { fontSize: 13, fontWeight: '700' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  itemUnit: { fontSize: 11, color: COLORS.text.muted },
  itemPrice: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  packBadge: { backgroundColor: '#FFF3E0', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  packBadgeText: { fontSize: 9, fontWeight: '700', color: '#F57C00' },
  cutSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cutSelectText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, gap: 10 },
  backStepBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, height: 48, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary },
  backStepBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, height: 48 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  proceedBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#388E3C', borderRadius: RADIUS.lg, height: 48 },
  proceedBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  reviewBanner: { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-around' },
  reviewItem: { alignItems: 'center' },
  reviewValue: { fontSize: 16, fontWeight: '800', color: '#FFF', textTransform: 'capitalize' },
  reviewLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  reviewDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  scheduleCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  scheduleTitle: { fontSize: 15, fontWeight: '800' },
  scheduleDesc: { fontSize: 12, color: COLORS.text.muted, marginBottom: SPACING.md, lineHeight: 18 },
  scheduleDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scheduleDayChip: { alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, minWidth: 70 },
  scheduleDayChipDay: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  scheduleDayChipDate: { fontSize: 10, fontWeight: '600', color: COLORS.text.secondary, marginTop: 2 },
  scheduleDayChipItems: { fontSize: 9, color: COLORS.text.muted, marginTop: 2 },
  infoCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOW.sm },
  infoCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: SPACING.md },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  infoIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoItemTitle: { fontSize: 13, fontWeight: '700' },
  infoItemDesc: { fontSize: 11, color: COLORS.text.muted, lineHeight: 16, marginTop: 2 },
  reviewDayCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: 10, ...SHADOW.sm },
  reviewDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewDayLabel: { width: 36, height: 28, borderRadius: 6, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  reviewDayName: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  reviewDayDate: { flex: 1, fontSize: 14, fontWeight: '700' },
  reviewDayTotal: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  reviewItemText: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 20, marginLeft: 46 },
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerRowAdded: { opacity: 0.5 },
  pickerImage: { width: 44, height: 44, borderRadius: 10 },
  pickerName: { fontSize: 14, fontWeight: '700' },
  pickerInfo: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  packPickerCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  packPickerImage: { width: 60, height: 60, borderRadius: 12 },
  packPickerName: { fontSize: 14, fontWeight: '700' },
  packPickerDesc: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  packPickerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  packPickerPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  packPickerServes: { fontSize: 11, color: COLORS.text.secondary },
  cutModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  cutModalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.floating },
  cutModalTitle: { fontSize: 16, fontWeight: '800', marginBottom: SPACING.md },
  cutOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cutOptionText: { fontSize: 14, fontWeight: '600' },
  cutCancelBtn: { alignItems: 'center', paddingTop: SPACING.md },
  cutCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.text.muted },
  browseCard: { backgroundColor: '#FFF', borderRadius: RADIUS.lg, ...SHADOW.sm, overflow: 'hidden', width: '48%' as any },
  browseCardImageWrap: { width: '100%', height: 110, overflow: 'hidden' },
  browseCardImage: { width: '100%', height: '100%' },
  browseDiscountTag: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  browseDiscountText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  browseCardBody: { padding: 8 },
  browseCardName: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary },
  browseCardUnit: { fontSize: 11, color: COLORS.text.muted, marginBottom: 4 },
  browseCardTag: { backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' as const, marginBottom: 4 },
  browseCardTagText: { fontSize: 9, fontWeight: '700', color: COLORS.green },
  browseCardPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  browseCardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.text.primary },
  browseAddBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 14 },
  browseAddBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
});
