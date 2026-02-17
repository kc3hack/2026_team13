// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types';

const KEYS = {
  USER_SETTINGS: 'USER_SETTINGS',
  COIN_BALANCE: 'COIN_BALANCE',
  LAST_PROCESSED_EVENT_ID: 'LAST_PROCESSED_EVENT_ID',
  LAST_CHECK_TIMESTAMP: 'LAST_CHECK_TIMESTAMP',
};

// --- User Settings ---
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings));
};

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const json = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
  return json ? JSON.parse(json) : null;
};

// --- Coin Balance ---
export const getCoinBalance = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(KEYS.COIN_BALANCE);
  return val ? parseInt(val, 10) : 0;
};

export const updateCoinBalance = async (amount: number): Promise<void> => {
  const current = await getCoinBalance();
  await AsyncStorage.setItem(KEYS.COIN_BALANCE, (current + amount).toString());
};

// --- Event Processing ---
export const getLastProcessedEventId = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.LAST_PROCESSED_EVENT_ID);
};

export const setLastProcessedEventId = async (eventId: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.LAST_PROCESSED_EVENT_ID, eventId);
};

export const setLastCheckTimestamp = async (): Promise<void> => {
  await AsyncStorage.setItem(KEYS.LAST_CHECK_TIMESTAMP, Date.now().toString());
};

export const getLastCheckTimestamp = async (): Promise<number | null> => {
  const val = await AsyncStorage.getItem(KEYS.LAST_CHECK_TIMESTAMP);
  return val ? parseInt(val, 10) : null;
};
