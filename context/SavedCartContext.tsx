import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedCart, CartItem, CustomPack } from '@/types';

const SAVED_CARTS_KEY = '@cutting_saved_carts';
const CUSTOM_PACKS_KEY = '@cutting_custom_packs';

interface SavedCartContextType {
  savedCarts: SavedCart[];
  customPacks: CustomPack[];
  saveCart: (name: string, items: CartItem[]) => Promise<void>;
  deleteSavedCart: (id: string) => Promise<void>;
  saveCustomPack: (pack: Omit<CustomPack, 'id' | 'createdAt'>) => Promise<void>;
  deleteCustomPack: (id: string) => Promise<void>;
  updateCustomPackLastOrdered: (id: string) => Promise<void>;
}

const SavedCartContext = createContext<SavedCartContextType>({
  savedCarts: [], customPacks: [],
  saveCart: async () => {}, deleteSavedCart: async () => {},
  saveCustomPack: async () => {}, deleteCustomPack: async () => {},
  updateCustomPackLastOrdered: async () => {},
});

export function SavedCartProvider({ children }: { children: React.ReactNode }) {
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);
  const [customPacks, setCustomPacks] = useState<CustomPack[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [scRaw, cpRaw] = await Promise.all([
          AsyncStorage.getItem(SAVED_CARTS_KEY), AsyncStorage.getItem(CUSTOM_PACKS_KEY),
        ]);
        if (scRaw) setSavedCarts(JSON.parse(scRaw));
        if (cpRaw) setCustomPacks(JSON.parse(cpRaw));
      } catch {}
    })();
  }, []);

  const saveCart = useCallback(async (name: string, items: CartItem[]) => {
    const cart: SavedCart = { id: `sc_${Date.now()}`, name, items, createdAt: new Date().toISOString() };
    const updated = [cart, ...savedCarts];
    setSavedCarts(updated);
    await AsyncStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(updated));
  }, [savedCarts]);

  const deleteSavedCart = useCallback(async (id: string) => {
    const updated = savedCarts.filter(c => c.id !== id);
    setSavedCarts(updated);
    await AsyncStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(updated));
  }, [savedCarts]);

  const saveCustomPack = useCallback(async (pack: Omit<CustomPack, 'id' | 'createdAt'>) => {
    const newPack: CustomPack = { ...pack, id: `cp_${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [newPack, ...customPacks];
    setCustomPacks(updated);
    await AsyncStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(updated));
  }, [customPacks]);

  const deleteCustomPack = useCallback(async (id: string) => {
    const updated = customPacks.filter(p => p.id !== id);
    setCustomPacks(updated);
    await AsyncStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(updated));
  }, [customPacks]);

  const updateCustomPackLastOrdered = useCallback(async (id: string) => {
    const updated = customPacks.map(p => p.id === id ? { ...p, lastOrdered: new Date().toISOString() } : p);
    setCustomPacks(updated);
    await AsyncStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(updated));
  }, [customPacks]);

  const value = useMemo(() => ({
    savedCarts, customPacks, saveCart, deleteSavedCart,
    saveCustomPack, deleteCustomPack, updateCustomPackLastOrdered,
  }), [savedCarts, customPacks, saveCart, deleteSavedCart, saveCustomPack, deleteCustomPack, updateCustomPackLastOrdered]);

  return <SavedCartContext.Provider value={value}>{children}</SavedCartContext.Provider>;
}

export const useSavedCarts = () => useContext(SavedCartContext);
