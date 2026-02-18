// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types';

const KEYS = {
  USER_SETTINGS: 'USER_SETTINGS',
  LAST_CHECK_TIMESTAMP: 'LAST_CHECK_TIMESTAMP',
  BGM_VOLUME: 'BGM_VOLUME',
};

// --- User Settings ---
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings));
};

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const json = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
  return json ? JSON.parse(json) : null;
};

// --- Event Processing ---
export const setLastCheckTimestamp = async (): Promise<void> => {
  await AsyncStorage.setItem(KEYS.LAST_CHECK_TIMESTAMP, Date.now().toString());
};

export const getLastCheckTimestamp = async (): Promise<number | null> => {
  const val = await AsyncStorage.getItem(KEYS.LAST_CHECK_TIMESTAMP);
  return val ? parseInt(val, 10) : null;
};

// --- BGM Volume ---
export const getBGMVolume = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(KEYS.BGM_VOLUME);
  return val ? parseFloat(val) : 0.5; // Default 50%
};

export const setBGMVolume = async (volume: number): Promise<void> => {
  // Clamp volume between 0 and 1
  const clampedVolume = Math.max(0, Math.min(1, volume));
  await AsyncStorage.setItem(KEYS.BGM_VOLUME, clampedVolume.toString());
};
