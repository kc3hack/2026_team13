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
import { getUserSettings, saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
import { styles } from '../styles/SettingsScreen.styles';

interface SettingsScreenProps {
  onSave: () => void;
  onCancel: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSave, onCancel }) => {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backTouchable}>
          <Text style={styles.backText}>{'< ABORT'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CONFIG // TERMINAL</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>AUTH PROFILE</Text>

        <View style={styles.sectionCard}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputWrap}>
              <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. octocat"
              placeholderTextColor="#5a805a"
              autoCapitalize="none"
            />
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>PAT TOKEN</Text>
            <View style={styles.inputWrap}>
              <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="github_pat_..."
              placeholderTextColor="#5a805a"
              secureTextEntry
              autoCapitalize="none"
            />
              <Text style={styles.helperText}>Contents: Read-only</Text>
            </View>
          </View>

          <View style={[styles.inputRow, styles.inputRowLast]}>
            <Text style={styles.label}>GIT EMAIL</Text>
            <View style={styles.inputWrap}>
              <TextInput
              style={styles.input}
              value={gitEmail}
              onChangeText={setGitEmail}
              placeholder="email@example.com"
              placeholderTextColor="#5a805a"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.footerBtn, styles.cancelBtn]} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>{loading ? 'VERIFYING...' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


