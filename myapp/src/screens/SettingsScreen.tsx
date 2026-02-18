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
import { getUserSettings, saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
import { useBGM } from '../hooks/useBGM';

type SettingsSection = 'profile' | 'sounds';

interface SettingsScreenProps {
  onSave: () => void;
  onCancel: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSave, onCancel }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialVolume, setInitialVolume] = useState(0);
  const { volume, updateVolume } = useBGM();

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getUserSettings();
      if (settings) {
        setUsername(settings.username);
        setToken(settings.token);
        setGitEmail(settings.gitEmail || '');
      }
      // 初期音量を記録
      setInitialVolume(volume);
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

  const handleResetVolume = () => {
    updateVolume(initialVolume);
    Alert.alert('Reset', 'Volume reset to default setting');
  };

  const handleSaveVolume = () => {
    Alert.alert('Success', `Volume saved at ${Math.round(volume * 100)}%`);
  };

  const renderProfileSection = () => (
    <ScrollView contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Profile</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>GitHub Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. octocat"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Personal Access Token (PAT)</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="ghp_..."
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>
          Required scope: 'repo' (to access private repos)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Git Email (Optional)</Text>
        <TextInput
          style={styles.input}
          value={gitEmail}
          onChangeText={setGitEmail}
          placeholder="email@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.helperText}>
          Used to identify your commits accurately.
        </Text>
      </View>
    </ScrollView>
  );

  const renderSoundsSection = () => (
    <ScrollView contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Sounds</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>BGM Volume</Text>
        <View style={styles.volumeContainer}>
          <TouchableOpacity 
            style={styles.volumeButton}
            onPress={handleVolumeDecrease}
          >
            <Text style={styles.volumeButtonText}>−</Text>
          </TouchableOpacity>
          <View style={styles.volumeDisplay}>
            <View style={styles.volumeBar}>
              <View 
                style={[
                  styles.volumeFill, 
                  { width: `${volume * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
          </View>
          <TouchableOpacity 
            style={styles.volumeButton}
            onPress={handleVolumeIncrease}
          >
            <Text style={styles.volumeButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.soundsButtonGroup}>
        <TouchableOpacity
          style={[styles.soundsButton, styles.resetButton]}
          onPress={handleResetVolume}
        >
          <Text style={[styles.soundsButtonText, styles.resetButtonText]}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.soundsButton, styles.saveSoundButton]}
          onPress={handleSaveVolume}
        >
          <Text style={[styles.soundsButtonText, styles.saveSoundButtonText]}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Left Sidebar - Section Navigation */}
      <View style={styles.sidebar}>
        <TouchableOpacity 
          style={styles.backButtonContainer}
          onPress={onCancel}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.sidebarTitle}>Settings</Text>
        <View style={styles.sectionList}>
          <TouchableOpacity 
            style={[
              styles.sectionButton,
              activeSection === 'profile' && styles.sectionButtonActive
            ]}
            onPress={() => setActiveSection('profile')}
          >
            <Text style={[
              styles.sectionButtonText,
              activeSection === 'profile' && styles.sectionButtonTextActive
            ]}>
              Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.sectionButton,
              activeSection === 'sounds' && styles.sectionButtonActive
            ]}
            onPress={() => setActiveSection('sounds')}
          >
            <Text style={[
              styles.sectionButtonText,
              activeSection === 'sounds' && styles.sectionButtonTextActive
            ]}>
              Sounds
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Content Area */}
      <View style={styles.contentArea}>
        {activeSection === 'profile' && renderProfileSection()}
        {activeSection === 'sounds' && renderSoundsSection()}

        {/* Footer Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={onCancel}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  sidebar: {
    width: 200,
    backgroundColor: '#2c3e50',
    paddingTop: 20,
    paddingHorizontal: 0,
    borderRightWidth: 1,
    borderRightColor: '#1a252f',
    minHeight: '100%',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a252f',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  sectionList: {
    gap: 8,
  },
  sectionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sectionButtonActive: {
    borderLeftColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  sectionButtonText: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '500',
  },
  sectionButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  contentContainer: {
    padding: 25,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  volumeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  volumeDisplay: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  volumeBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  volumeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingBottom: 20,
    gap: 10,
    position: 'absolute',
    bottom: 0,
    left: 200,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  soundsButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: 12,
  },
  soundsButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveSoundButton: {
    backgroundColor: '#007AFF',
  },
  soundsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#444',
  },
  saveSoundButtonText: {
    color: '#fff',
  },
});
