// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { getMenuBackgroundMode, getUserSettings, MenuBackgroundMode, saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
import { useBGM } from '../hooks/useBGM';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  textDarkPrimary: {
    color: '#F1F1F1',
  },
  textDarkSub: {
    color: '#C7C7C7',
  },

  /* ── Header ── */
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: '#101010',
    borderBottomColor: '#2E2E2E',
  },
  backTouchable: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 20,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },

  /* ── ScrollView ── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  /* ── Section ── */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionCardDark: {
    backgroundColor: '#151515',
    borderColor: '#2E2E2E',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 20,
  },
  dividerDark: {
    backgroundColor: '#2E2E2E',
  },

  /* ── Inputs ── */
  inputGroup: {
    marginBottom: 14,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 7,
    color: '#333',
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  inputDark: {
    backgroundColor: '#1F1F1F',
    borderColor: '#3A3A3A',
    color: '#F1F1F1',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    lineHeight: 18,
  },

  /* ── Volume ── */
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeBtnDark: {
    backgroundColor: '#252525',
  },
  volumeBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  volumeTrackWrap: {
    flex: 1,
    marginHorizontal: 14,
    alignItems: 'center',
  },
  volumeTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  volumeTrackDark: {
    backgroundColor: '#3A3A3A',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  volumePercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },

  /* ── Footer ── */
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  footerDark: {
    borderTopColor: '#2E2E2E',
    backgroundColor: '#101010',
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
