import 'react-native-reanimated';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, BackHandler, Platform, PanResponder, ActivityIndicator, Animated } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { ImagePickerScreen } from './src/screens/ImagePickerScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { DarkroomScreen } from './src/screens/DarkroomScreen';
import { useBGM } from './src/hooks/useBGM';
import { initDb } from './src/utils/sqlite';
import { getUserSettings, clearUserSettings } from './src/utils/storage';
import { CameraScreen } from './src/screens/CameraScreen';

type Screen = 'Loading' | 'Setup' | 'Settings' | 'ImagePicker' | 'Album' | 'Darkroom' | 'Camera';
const ANDROID_GLOBAL_SCALE = 0.89;

interface PendingDevelopPhoto {
  id: number;
  uri: string;
  filmId: number;
}

interface SelectedFilm {
  type: string;
  id: number;
}

export default function App() {
  // ★ 変更: 7セグメントフォントを追加
  const [fontsLoaded] = useFonts({
    cinecaption226: require('./assets/fonts/cinecaption226.ttf'),
    'DSEG7Classic-Regular': require('./assets/fonts/DSEG7Classic-Regular.ttf'),
    Courier: CourierPrime_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });
  
  const [pendingDevelopPhoto, setPendingDevelopPhoto] = useState<PendingDevelopPhoto | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('Loading');
  const [selectedFilm, setSelectedFilm] = useState<SelectedFilm | null>(null);
  const { startBGM, stopBGM } = useBGM();

  // ── Fade transition ──
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isTransitioning = useRef(false);

  const navigateTo = useCallback((screen: Screen) => {
    if (isTransitioning.current || screen === currentScreen) {
      if (screen === currentScreen) return;
      setCurrentScreen(screen);
      return;
    }
    isTransitioning.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen(screen);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        isTransitioning.current = false;
      });
    });
  }, [currentScreen, fadeAnim]);

  const handleAppBackLikeAction = (): boolean => {
    if (currentScreen === 'Camera' || currentScreen === 'Setup' || currentScreen === 'Loading') {
      return true;
    }

    if (currentScreen === 'Settings' || currentScreen === 'Album' || currentScreen === 'Darkroom') {
      navigateTo('Camera');
      return true;
    }

    if (currentScreen === 'ImagePicker') {
      navigateTo('Camera');
      return true;
    }

    navigateTo('Camera');
    return true;
  };

  useEffect(() => {
    if (currentScreen === 'Camera') {
      startBGM();
    } else {
      stopBGM();
    }
  }, [currentScreen, startBGM, stopBGM]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  // ★ 変更: フォントの読み込みが終わってからDB初期化と画面遷移を行うように修正
  useEffect(() => {
    const bootstrap = async () => {
      await initDb().catch((err: unknown) => console.log('DB init error', err));
      const settings = await getUserSettings();
      if (settings?.username && settings?.token) {
        setCurrentScreen('Camera');
      } else {
        setCurrentScreen('Setup');
      }
    };

    // フォントがロードされたら起動処理を開始する
    if (fontsLoaded) {
      bootstrap();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handleAppBackLikeAction();
    });

    return () => subscription.remove();
  }, [currentScreen]);

  const iosEdgeBackPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => (
      Platform.OS === 'ios'
      && currentScreen !== 'Setup'
      && currentScreen !== 'Loading'
      && evt.nativeEvent.pageX <= 24
      && gestureState.dx > 12
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        handleAppBackLikeAction();
      }
    },
  });

  const handleLogout = async () => {
    await clearUserSettings();
    navigateTo('Setup');
  };

  const renderContent = () => {
      switch (currentScreen) {
          case 'Loading':
              // ★ 変更: ローディング中（フォントやDBの準備中）はインジケーターを表示
              return (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color="#D41414" />
                </View>
              );
          case 'Setup':
              return (
                  <SetupScreen
                      onComplete={() => navigateTo('Camera')}
                  />
              );
          case 'Settings':
              return (
                  <SettingsScreen 
                      onSave={() => navigateTo('Camera')}
                      onCancel={() => navigateTo('Camera')}
                  />
              );
          case 'ImagePicker':
              return (
                  <ImagePickerScreen 
                      onBack={() => navigateTo('Camera')}
                      onGoCamera={(filmType, filmId) => {
                        setSelectedFilm({ type: filmType, id: filmId });
                        navigateTo('Camera');
                      }}
                  />
              );
          case 'Camera':
              return (
                  <CameraScreen 
                      filmType={selectedFilm?.type}
                      filmId={selectedFilm?.id}
                      onBack={() => navigateTo('ImagePicker')}
                      onGoDarkroom={(photo: PendingDevelopPhoto) => {
                          setPendingDevelopPhoto(photo);
                          navigateTo('Darkroom');
                      }}
                      onGoAlbum={() => navigateTo('Album')}
                      onGoDarkroomScreen={() => {
                          setPendingDevelopPhoto(null);
                          navigateTo('Darkroom');
                      }}
                      onGoSettings={() => navigateTo('Settings')}
                  />
              );
          case 'Album':
              return (
                <AlbumScreen
                  onBack={() => navigateTo('Camera')}
                  onGoCamera={() => navigateTo('Camera')}
                  onGoSettings={() => navigateTo('Settings')}
                  onGoDarkroom={(photo) => {
                    setPendingDevelopPhoto(photo);
                    navigateTo('Darkroom');
                  }}
                />
              );
          case 'Darkroom':
              return (
                <DarkroomScreen
                  onBack={() => navigateTo('Camera')}
                  onGoSettings={() => navigateTo('Settings')}
                  onGoAlbum={() => navigateTo('Album')}
                />
              );
          default:
              return null;
      }
  };

  return (
    <View style={styles.container} {...iosEdgeBackPanResponder.panHandlers}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim },
          Platform.OS === 'android' && styles.androidScaledContent,
        ]}
      >
        {renderContent()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  content: {
    flex: 1,
  },
  androidScaledContent: {
    transform: [{ scale: ANDROID_GLOBAL_SCALE }],
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
  },
});