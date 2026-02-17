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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

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

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
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
    backgroundColor: '#fff',
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
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#007AFF', // iOS Blue
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
