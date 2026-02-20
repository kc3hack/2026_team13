// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import { getUserSettings, saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
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

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={onCancel} style={styles.backTouchable}>
        <Text style={[styles.backText, boldFont]}>{'< ABORT'}</Text>
      </TouchableOpacity>

      <View style={styles.mainLayout}>
        <View style={styles.leftPanel}>
          <View style={styles.gripDecor} />

          <View style={styles.dashboard}>
            <Text style={[styles.systemText, regularFont]}>DEVIT // SETTINGS_CONFIG</Text>
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
    </SafeAreaView>
  );
};


