// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings } from '../types';

const KEYS = {
  USER_SETTINGS: 'USER_SETTINGS',
  LAST_CHECK_TIMESTAMP: 'LAST_CHECK_TIMESTAMP',
  BGM_VOLUME: 'BGM_VOLUME',
  MENU_BACKGROUND_MODE: 'MENU_BACKGROUND_MODE',
  DARKROOM_NATIVE_RIPPLE: 'DARKROOM_NATIVE_RIPPLE',
};

export type MenuBackgroundMode = 'light' | 'dark';

// --- User Settings ---
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings));
};

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const json = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
  return json ? JSON.parse(json) : null;
};

export const clearUserSettings = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.USER_SETTINGS);
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

export const getMenuBackgroundMode = async (): Promise<MenuBackgroundMode> => {
  const val = await AsyncStorage.getItem(KEYS.MENU_BACKGROUND_MODE);
  return val === 'dark' ? 'dark' : 'light';
};

export const setMenuBackgroundMode = async (mode: MenuBackgroundMode): Promise<void> => {
  await AsyncStorage.setItem(KEYS.MENU_BACKGROUND_MODE, mode);
};

export const getDarkroomUseNativeRipple = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(KEYS.DARKROOM_NATIVE_RIPPLE);
  return val === '1';
};

export const setDarkroomUseNativeRipple = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.DARKROOM_NATIVE_RIPPLE, enabled ? '1' : '0');
};
