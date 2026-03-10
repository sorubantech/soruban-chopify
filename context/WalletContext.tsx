import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WalletTransaction } from '@/types';

const WALLET_KEY = '@cutting_wallet';

interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  addFunds: (amount: number, title: string, description: string, category?: WalletTransaction['category']) => Promise<void>;
  deductFunds: (amount: number, title: string, description: string, orderId?: string) => Promise<boolean>;
  refundToWallet: (amount: number, orderId: string, reason?: string) => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  transactions: [],
  addFunds: async () => {},
  deductFunds: async () => false,
  refundToWallet: async () => {},
  refreshWallet: async () => {},
});

interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
}

const DEFAULT_STATE: WalletState = {
  balance: 50, // Welcome bonus
  transactions: [
    {
      id: 'tx_welcome',
      type: 'credit',
      title: 'Welcome Bonus',
      description: 'New user welcome reward',
      amount: 50,
      date: new Date().toISOString(),
      category: 'bonus',
    },
  ],
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(DEFAULT_STATE);

  const loadWallet = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(WALLET_KEY);
      if (raw) {
        setState(JSON.parse(raw));
      } else {
        // First time: save default state
        await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(DEFAULT_STATE));
      }
    } catch {}
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const persist = useCallback(async (newState: WalletState) => {
    setState(newState);
    await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(newState));
  }, []);

  const addFunds = useCallback(async (amount: number, title: string, description: string, category: WalletTransaction['category'] = 'topup') => {
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'credit',
      title,
      description,
      amount,
      date: new Date().toISOString(),
      category,
    };
    const newState: WalletState = {
      balance: state.balance + amount,
      transactions: [tx, ...state.transactions],
    };
    await persist(newState);
  }, [state, persist]);

  const deductFunds = useCallback(async (amount: number, title: string, description: string, orderId?: string): Promise<boolean> => {
    if (state.balance < amount) return false;
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'debit',
      title,
      description,
      amount,
      date: new Date().toISOString(),
      orderId,
      category: 'payment',
    };
    const newState: WalletState = {
      balance: state.balance - amount,
      transactions: [tx, ...state.transactions],
    };
    await persist(newState);
    return true;
  }, [state, persist]);

  const refundToWallet = useCallback(async (amount: number, orderId: string, reason?: string) => {
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'credit',
      title: 'Order Refund',
      description: reason || `Refund for order #${orderId}`,
      amount,
      date: new Date().toISOString(),
      orderId,
      category: 'refund',
    };
    const newState: WalletState = {
      balance: state.balance + amount,
      transactions: [tx, ...state.transactions],
    };
    await persist(newState);
  }, [state, persist]);

  const value = useMemo(() => ({
    balance: state.balance,
    transactions: state.transactions,
    addFunds,
    deductFunds,
    refundToWallet,
    refreshWallet: loadWallet,
  }), [state, addFunds, deductFunds, refundToWallet, loadWallet]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export const useWallet = () => useContext(WalletContext);
