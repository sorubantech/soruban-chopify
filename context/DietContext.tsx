import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FamilyMember, VacationMode } from '@/types';

const DIET_KEY = '@cutting_diet';
const FAMILY_KEY = '@cutting_family';
const VACATION_KEY = '@cutting_vacation';

interface DietContextType {
  selectedDiets: string[];
  allergies: string[];
  healthGoals: string[];
  familyMembers: FamilyMember[];
  vacationMode: VacationMode | null;
  setDietPreferences: (diets: string[]) => Promise<void>;
  setAllergies: (allergies: string[]) => Promise<void>;
  setHealthGoals: (goals: string[]) => Promise<void>;
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  setVacationMode: (vacation: VacationMode | null) => Promise<void>;
}

interface DietState {
  selectedDiets: string[];
  allergies: string[];
  healthGoals: string[];
}

const DEFAULT_DIET: DietState = { selectedDiets: [], allergies: [], healthGoals: [] };

const DietContext = createContext<DietContextType>({
  selectedDiets: [], allergies: [], healthGoals: [],
  familyMembers: [], vacationMode: null,
  setDietPreferences: async () => {}, setAllergies: async () => {}, setHealthGoals: async () => {},
  addFamilyMember: async () => {}, removeFamilyMember: async () => {}, updateFamilyMember: async () => {},
  setVacationMode: async () => {},
});

export function DietProvider({ children }: { children: React.ReactNode }) {
  const [diet, setDiet] = useState<DietState>(DEFAULT_DIET);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [vacationMode, setVacationModeState] = useState<VacationMode | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [dRaw, fRaw, vRaw] = await Promise.all([
          AsyncStorage.getItem(DIET_KEY), AsyncStorage.getItem(FAMILY_KEY), AsyncStorage.getItem(VACATION_KEY),
        ]);
        if (dRaw) setDiet(JSON.parse(dRaw));
        if (fRaw) setFamilyMembers(JSON.parse(fRaw));
        if (vRaw) setVacationModeState(JSON.parse(vRaw));
      } catch {}
    })();
  }, []);

  const persistDiet = useCallback(async (d: DietState) => {
    setDiet(d);
    await AsyncStorage.setItem(DIET_KEY, JSON.stringify(d));
  }, []);

  const setDietPreferences = useCallback(async (diets: string[]) => {
    await persistDiet({ ...diet, selectedDiets: diets });
  }, [diet, persistDiet]);

  const setAllergiesFunc = useCallback(async (allergies: string[]) => {
    await persistDiet({ ...diet, allergies });
  }, [diet, persistDiet]);

  const setHealthGoals = useCallback(async (goals: string[]) => {
    await persistDiet({ ...diet, healthGoals: goals });
  }, [diet, persistDiet]);

  const addFamilyMember = useCallback(async (member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = { ...member, id: `fm_${Date.now()}` };
    const updated = [...familyMembers, newMember];
    setFamilyMembers(updated);
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(updated));
  }, [familyMembers]);

  const removeFamilyMember = useCallback(async (id: string) => {
    const updated = familyMembers.filter(m => m.id !== id);
    setFamilyMembers(updated);
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(updated));
  }, [familyMembers]);

  const updateFamilyMember = useCallback(async (id: string, updates: Partial<FamilyMember>) => {
    const updated = familyMembers.map(m => m.id === id ? { ...m, ...updates } : m);
    setFamilyMembers(updated);
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(updated));
  }, [familyMembers]);

  const setVacationMode = useCallback(async (vacation: VacationMode | null) => {
    setVacationModeState(vacation);
    if (vacation) {
      await AsyncStorage.setItem(VACATION_KEY, JSON.stringify(vacation));
    } else {
      await AsyncStorage.removeItem(VACATION_KEY);
    }
  }, []);

  const value = useMemo(() => ({
    selectedDiets: diet.selectedDiets, allergies: diet.allergies, healthGoals: diet.healthGoals,
    familyMembers, vacationMode,
    setDietPreferences, setAllergies: setAllergiesFunc, setHealthGoals,
    addFamilyMember, removeFamilyMember, updateFamilyMember, setVacationMode,
  }), [diet, familyMembers, vacationMode, setDietPreferences, setAllergiesFunc, setHealthGoals, addFamilyMember, removeFamilyMember, updateFamilyMember, setVacationMode]);

  return <DietContext.Provider value={value}>{children}</DietContext.Provider>;
}

export const useDiet = () => useContext(DietContext);
