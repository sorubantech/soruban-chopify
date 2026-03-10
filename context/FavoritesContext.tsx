import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@cutting_favorites';

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  clearFavorites: () => {},
});

const DEFAULT_FAVORITES = ['1', '4', '7', '2', '13'];

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(raw => {
      if (raw) setFavorites(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const persist = useCallback((fav: string[]) => {
    setFavorites(fav);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(fav)).catch(() => {});
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    const updated = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    persist(updated);
  }, [favorites, persist]);

  const isFavorite = useCallback((productId: string) => favorites.includes(productId), [favorites]);
  const clearFavorites = useCallback(() => persist([]), [persist]);

  const value = useMemo(() => ({ favorites, toggleFavorite, isFavorite, clearFavorites }), [favorites, toggleFavorite, isFavorite, clearFavorites]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
