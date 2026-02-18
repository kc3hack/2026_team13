import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
import { saveUserSettings } from '../utils/storage';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOkPress = async () => {
    if (!username.trim() || !token.trim()) {
      Alert.alert('入力エラー', 'GitHub username と PAT は必須です。');
      return;
    }

    setLoading(true);
    const isValid = await verifyToken(token.trim());
    setLoading(false);

    if (!isValid) {
      Alert.alert('認証エラー', 'PAT が無効です。再確認してください。');
      return;
    }

    const settings: UserSettings = {
      username: username.trim(),
      token: token.trim(),
      gitEmail: gitEmail.trim() ? gitEmail.trim() : undefined,
    };

    await saveUserSettings(settings);
    onLoginSuccess();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GitHub username *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="octocat"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Personal Access Token (PAT) *</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="ghp_..."
            autoCapitalize="none"
            secureTextEntry
          />
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
        </View>

        <TouchableOpacity
          style={[styles.okButton, loading && styles.disabledButton]}
          onPress={handleOkPress}
          disabled={loading}
        >
          <Text style={styles.okButtonText}>{loading ? '確認中...' : 'OK'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: '#2D2D2D',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7D7D7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#1F1F1F',
  },
  okButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
