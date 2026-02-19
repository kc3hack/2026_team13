// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { getMenuBackgroundMode, getUserSettings, MenuBackgroundMode, saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
import { useBGM } from '../hooks/useBGM';
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
  const [backgroundMode, setBackgroundMode] = useState<MenuBackgroundMode>('light');
  const isDarkBackground = backgroundMode === 'dark';
  const { volume, updateVolume } = useBGM();

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getUserSettings();
      const mode = await getMenuBackgroundMode();
      if (settings) {
        setUsername(settings.username);
        setToken(settings.token);
        setGitEmail(settings.gitEmail || '');
      }
      setBackgroundMode(mode);
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

  const handleVolumeIncrease = () => {
    updateVolume(Math.min(1, volume + 0.1));
  };

  const handleVolumeDecrease = () => {
    updateVolume(Math.max(0, volume - 0.1));
  };

  return (
    <View style={[styles.container, isDarkBackground && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDarkBackground && styles.headerDark]}>
        <TouchableOpacity onPress={onCancel} style={styles.backTouchable}>
          <Text style={[styles.backText, isDarkBackground && styles.textDarkPrimary]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkBackground && styles.textDarkPrimary]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile ── */}
        <Text style={[styles.sectionTitle, isDarkBackground && styles.textDarkSub]}>Profile</Text>

        <View style={[styles.sectionCard, isDarkBackground && styles.sectionCardDark]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkBackground && styles.textDarkPrimary]}>GitHub Username</Text>
            <TextInput
              style={[styles.input, isDarkBackground && styles.inputDark]}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. octocat"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkBackground && styles.textDarkPrimary]}>Personal Access Token (PAT)</Text>
            <TextInput
              style={[styles.input, isDarkBackground && styles.inputDark]}
              value={token}
              onChangeText={setToken}
              placeholder="github_pat_..."
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={[styles.helperText, isDarkBackground && styles.textDarkSub]}>
              Fine-grained PAT with Contents (Read-only) permission.
            </Text>
          </View>

          <View style={[styles.inputGroup, styles.inputGroupLast]}>
            <Text style={[styles.label, isDarkBackground && styles.textDarkPrimary]}>Git Email (Optional)</Text>
            <TextInput
              style={[styles.input, isDarkBackground && styles.inputDark]}
              value={gitEmail}
              onChangeText={setGitEmail}
              placeholder="email@example.com"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={[styles.helperText, isDarkBackground && styles.textDarkSub]}>
              Used to identify your commits accurately.
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, isDarkBackground && styles.dividerDark]} />

        {/* ── Sounds ── */}
        <Text style={[styles.sectionTitle, isDarkBackground && styles.textDarkSub]}>Sounds</Text>

        <View style={[styles.sectionCard, isDarkBackground && styles.sectionCardDark]}>
          <View style={[styles.inputGroup, styles.inputGroupLast]}>
            <Text style={[styles.label, isDarkBackground && styles.textDarkPrimary]}>BGM Volume</Text>
            <View style={styles.volumeRow}>
              <TouchableOpacity style={[styles.volumeBtn, isDarkBackground && styles.volumeBtnDark]} onPress={handleVolumeDecrease}>
                <Text style={[styles.volumeBtnText, isDarkBackground && styles.textDarkPrimary]}>−</Text>
              </TouchableOpacity>
              <View style={styles.volumeTrackWrap}>
                <View style={[styles.volumeTrack, isDarkBackground && styles.volumeTrackDark]}>
                  <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
                </View>
                <Text style={[styles.volumePercent, isDarkBackground && styles.textDarkSub]}>{Math.round(volume * 100)}%</Text>
              </View>
              <TouchableOpacity style={[styles.volumeBtn, isDarkBackground && styles.volumeBtnDark]} onPress={handleVolumeIncrease}>
                <Text style={[styles.volumeBtnText, isDarkBackground && styles.textDarkPrimary]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, isDarkBackground && styles.footerDark]}>
        <TouchableOpacity style={[styles.footerBtn, styles.cancelBtn]} onPress={onCancel}>
          <Text style={[styles.cancelBtnText, isDarkBackground && styles.textDarkSub]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>{loading ? 'Verifying...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


