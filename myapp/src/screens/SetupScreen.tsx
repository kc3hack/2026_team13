// src/screens/SetupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';

interface SetupScreenProps {
  onComplete: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('入力エラー', 'GitHub Usernameを入力してください。');
      return;
    }
    if (!token.trim()) {
      Alert.alert('入力エラー', 'Personal Access Tokenを入力してください。');
      return;
    }

    setLoading(true);
    const isValid = await verifyToken(token.trim());
    setLoading(false);

    if (!isValid) {
      Alert.alert(
        'トークンエラー',
        'トークンが無効です。\nFine-grained PATを正しく入力してください。'
      );
      return;
    }

    const settings: UserSettings = {
      username: username.trim(),
      token: token.trim(),
      gitEmail: gitEmail.trim() || undefined,
    };

    await saveUserSettings(settings);
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.appIcon}>📷</Text>
          <Text style={styles.appName}>Film Developer</Text>
          <Text style={styles.tagline}>
            コミットして、フィルムを集めよう。
          </Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>GitHubアカウントを連携</Text>
          <Text style={styles.cardDescription}>
            コミットを検出してフィルムを付与するために、{'\n'}
            GitHubの情報を入力してください。
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GitHub Username <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. octocat"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Personal Access Token <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="github_pat_..."
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              Fine-grained PAT — Contents (Read-only) 権限が必要です。{' '}
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL('https://github.com/settings/personal-access-tokens')}
              >
                トークンを発行する →
              </Text>
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Git Email <Text style={styles.optional}>(任意)</Text></Text>
            <TextInput
              style={styles.input}
              value={gitEmail}
              onChangeText={setGitEmail}
              placeholder="email@example.com"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Text style={styles.helperText}>
              コミットの検出精度が向上します。
            </Text>
          </View>
        </View>

        {/* Button inside ScrollView so it's always reachable */}
        <View style={styles.buttonWrap}>
          <TouchableOpacity
            style={[styles.continueBtn, loading && styles.disabledBtn]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>はじめる</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
  },

  /* ── Hero ── */
  hero: {
    alignItems: 'center',
    marginBottom: 36,
  },
  appIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginBottom: 20,
  },

  /* ── Form ── */
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  required: {
    color: '#E55',
    fontWeight: '400',
  },
  optional: {
    color: '#999',
    fontWeight: '400',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },

  /* ── Button ── */
  buttonWrap: {
    marginTop: 28,
    paddingBottom: 8,
  },
  continueBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
