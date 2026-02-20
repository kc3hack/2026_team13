// src/screens/SetupScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { saveUserSettings } from '../utils/storage';
import { verifyToken } from '../api/githubAPI';
import { UserSettings } from '../types';
import { PARALLAX_MAX_SCROLL, PARALLAX_OFFSET, styles } from '../styles/SetupScreen.styles';

// Asset imports
const BG_IMAGE = require('../../assets/images/KC3_Devit_background.png');
const LOGO_IMAGE = require('../../assets/images/KC3_Devit_logo.png');
const BUTTON_IMAGE = require('../../assets/images/KC3_Devit_button.png');
const FILMS_IMAGE = require('../../assets/images/KC3_Devit_films_long.png');

interface SetupScreenProps {
  onComplete: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const bgTranslateY = scrollY.interpolate({
    inputRange: [0, PARALLAX_MAX_SCROLL],
    outputRange: [-PARALLAX_OFFSET, 0],
    extrapolate: 'clamp',
  });

  const handleContinue = async () => {
    const trimmedUsername = username.trim();
    const trimmedToken = token.trim();
    const trimmedGitEmail = gitEmail.trim();

    if (!trimmedUsername) {
      Alert.alert('入力エラー', 'GitHub Usernameを入力してください。');
      return;
    }
    if (!trimmedToken) {
      Alert.alert('入力エラー', 'Personal Access Tokenを入力してください。');
      return;
    }

    setLoading(true);
    const isValid = await verifyToken(trimmedToken);
    setLoading(false);

    if (!isValid) {
      Alert.alert(
        'トークンエラー',
        'トークンが無効です。\nFine-grained PATを正しく入力してください。'
      );
      return;
    }

    const settings: UserSettings = {
      username: trimmedUsername,
      token: trimmedToken,
      gitEmail: trimmedGitEmail || undefined,
    };

    await saveUserSettings(settings);
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Parallax background */}
      <Animated.Image
        source={BG_IMAGE}
        style={[
          styles.backgroundImage,
          { transform: [{ translateY: bgTranslateY }] },
        ]}
        resizeMode="cover"
      />

      {/* Film strip overlays */}
      <Image source={FILMS_IMAGE} style={styles.filmsTop} resizeMode="cover" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
            {/* Hero */}
            <View style={styles.hero}>
              <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
              <Text style={styles.tagline}>あなたのコミットをフィルムに。</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>GitHubアカウントを連携</Text>
              </View>
              <Text style={styles.sectionDescription}>
                コミットを検出してフィルムを付与するために、{'\n'}
                GitHubの情報を入力してください。
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>GitHub Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. octocat"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Personal Access Token</Text>
                <Text style={styles.helperText}>
                  Fine-grained PATを入力してください。生成の際、Contents（Read-only）{'\n'}
                  権限が必要です。{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() =>
                      Linking.openURL(
                        'https://github.com/settings/personal-access-tokens'
                      )
                    }
                  >
                    トークンを発行する→
                  </Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={token}
                  onChangeText={setToken}
                  placeholder="github_pat_..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Git Email <Text style={styles.optional}>（任意）</Text>
                </Text>
                <Text style={styles.helperText}>コミットの検出精度が向上します。</Text>
                <TextInput
                  style={styles.input}
                  value={gitEmail}
                  onChangeText={setGitEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Button */}
            <View style={styles.buttonWrap}>
              <TouchableOpacity
                onPress={handleContinue}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.buttonTouchable}
              >
                {loading ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                ) : (
                  <Image
                    source={BUTTON_IMAGE}
                    style={styles.buttonImage}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom film strip */}
      <Image source={FILMS_IMAGE} style={styles.filmsBottom} resizeMode="cover" />
    </View>
  );
};


