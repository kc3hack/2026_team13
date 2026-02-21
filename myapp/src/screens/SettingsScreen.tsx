// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import { getUserSettings, saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { FILM_META, FILM_TYPES, RewardFilmType, UserSettings } from '../types';
import { addFilm, getFilmInventory } from '../utils/sqlite';
import { styles } from '../styles/SettingsScreen.styles';

interface SettingsScreenProps {
  onSave: () => void;
  onCancel: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSave, onCancel }) => {
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugFilmLoading, setDebugFilmLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getUserSettings();
      if (settings) {
        setUsername(settings.username);
        setToken(settings.token);
        setGitEmail(settings.gitEmail || '');
      }
    };
    loadSettings();
  }, []);

  if (!fontsLoaded) {
    return <SafeAreaView style={styles.container} />;
  }

  const regularFont = { fontFamily: 'CourierPrime_400Regular' as const, fontWeight: 'normal' as const };
  const boldFont = { fontFamily: 'CourierPrime_700Bold' as const, fontWeight: 'normal' as const };

  const handleSave = async () => {
    if (!username || !token) {
      Alert.alert('Error', 'Username and Token are required.');
      return;
    }

    setLoading(true);
    const isValid = await verifyToken(token);
    setLoading(false);

    if (!isValid) {
      Alert.alert('Error', 'Invalid GitHub Token.');
      return;
    }

    const settings: UserSettings = {
      username,
      token,
      gitEmail: gitEmail || undefined,
    };

    await saveUserSettings(settings);
    Alert.alert('Success', 'Settings saved!');
    onSave();
  };

  const handleAddDebugFilm = async (type: RewardFilmType) => {
    try {
      setDebugFilmLoading(true);
      const inventory = await addFilm(type);
      const count = inventory[type];
      Alert.alert('Debug', `${FILM_META[type].label === '01 Mono' ? '01 Cinema' : FILM_META[type].label} +1 (現在: ${count})`);
    } catch (error) {
      console.log('failed to add debug film', error);
      Alert.alert('Error', 'Failed to add debug film.');
    } finally {
      setDebugFilmLoading(false);
    }
  };

  const handleAddAllDebugFilms = async () => {
    try {
      setDebugFilmLoading(true);
      for (const type of FILM_TYPES) {
        await addFilm(type, 1);
      }
      const inventory = await getFilmInventory();
      Alert.alert('Debug', `All films +1\nMONO:${inventory.mono} VIVID:${inventory.vivid} RETRO:${inventory.retro} DISP:${inventory.disposable} SOFT:${inventory.soft}`);
    } catch (error) {
      console.log('failed to add all debug films', error);
      Alert.alert('Error', 'Failed to add debug films.');
    } finally {
      setDebugFilmLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={onCancel} style={styles.backTouchable}>
        <Text style={[styles.backText, boldFont]}>{'< ABORT'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.mainLayout}>
        <View style={styles.leftPanel}>
          <View style={styles.gripDecor}>
            <View style={[styles.navSquare, styles.navSquareActive]} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
          </View>

          <View style={styles.dashboard}>
            <Text style={[styles.systemText, regularFont]}>DEVIT // SETTINGS_CONFIG</Text>

            <Text style={[styles.sectionTitle, boldFont]}>DEBUG FILM TOOLS</Text>
            <View style={styles.debugCardLeft}>
              <TouchableOpacity
                style={[styles.saveBtn, styles.debugAllBtn, debugFilmLoading && styles.disabledBtn]}
                onPress={handleAddAllDebugFilms}
                disabled={debugFilmLoading}
              >
                <Text style={[styles.saveBtnText, boldFont]}>{debugFilmLoading ? 'ADDING...' : 'ADD ALL +1'}</Text>
              </TouchableOpacity>

              <View style={styles.debugButtonGrid}>
                {FILM_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.debugFilmBtn, debugFilmLoading && styles.disabledBtn]}
                    onPress={() => handleAddDebugFilm(type)}
                    disabled={debugFilmLoading}
                  >
                    <Text style={[styles.debugFilmBtnText, boldFont]}>{FILM_META[type].label === '01 Mono' ? '01 Cinema' : FILM_META[type].label} +1</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.rightPanel}>
          <Text style={[styles.sectionTitle, boldFont]}>AUTH PROFILE</Text>

          <View style={styles.formCard}>
            <View style={styles.formRow}>
              <Text style={[styles.label, boldFont]}>USERNAME</Text>
              <TextInput
                style={[styles.input, regularFont]}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. octocat"
                placeholderTextColor="#5a805a"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={[styles.label, boldFont]}>PAT TOKEN</Text>
              <TextInput
                style={[styles.input, regularFont]}
                value={token}
                onChangeText={setToken}
                placeholder="github_pat_..."
                placeholderTextColor="#5a805a"
                secureTextEntry
                autoCapitalize="none"
              />
              <Text style={[styles.helperText, regularFont]}>Contents: Read-only</Text>
            </View>

            <View style={styles.formRowLast}>
              <Text style={[styles.label, boldFont]}>GIT EMAIL</Text>
              <TextInput
                style={[styles.input, regularFont]}
                value={gitEmail}
                onChangeText={setGitEmail}
                placeholder="email@example.com"
                placeholderTextColor="#5a805a"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.disabledBtn]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={[styles.saveBtnText, boldFont]}>{loading ? 'VERIFYING...' : 'SAVE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};


