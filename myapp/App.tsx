import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, BackHandler, Platform, PanResponder } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { ImagePickerScreen } from './src/screens/ImagePickerScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { DarkroomScreen } from './src/screens/DarkroomScreen';
import { useBGM } from './src/hooks/useBGM';
import { initDb } from './src/utils/sqlite';
import { getUserSettings, clearUserSettings } from './src/utils/storage';
import { CameraScreen } from './src/screens/CameraScreen';

type Screen = 'Loading' | 'Setup' | 'Home' | 'Settings' | 'ImagePicker' | 'Album' | 'Darkroom' | 'Camera';

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
  const [pendingDevelopPhoto, setPendingDevelopPhoto] = useState<PendingDevelopPhoto | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('Loading');
  const [selectedFilm, setSelectedFilm] = useState<SelectedFilm | null>(null);
  const { startBGM, stopBGM } = useBGM();

  const handleAppBackLikeAction = (): boolean => {
    if (currentScreen === 'Home' || currentScreen === 'Setup' || currentScreen === 'Loading') {
      return true;
    }

    if (currentScreen === 'Camera') {
      setCurrentScreen('ImagePicker');
      return true;
    }

    setCurrentScreen('Home');
    return true;
  };

  // Control BGM based on current screen
  useEffect(() => {
    if (currentScreen === 'Home') {
      startBGM();
    } else {
      stopBGM();
    }
  }, [currentScreen, startBGM, stopBGM]);

  // Initialize database & check first-launch on app start
  useEffect(() => {
    const bootstrap = async () => {
      await initDb().catch((err: unknown) => console.log('DB init error', err));
      const settings = await getUserSettings();
      if (settings?.username && settings?.token) {
        setCurrentScreen('Home');
      } else {
        setCurrentScreen('Setup');
      }
    };
    bootstrap();
  }, []);

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
    setCurrentScreen('Setup');
  };

  const renderContent = () => {
      switch (currentScreen) {
          case 'Loading':
              return null;
          case 'Setup':
              return (
                  <SetupScreen
                      onComplete={() => setCurrentScreen('Home')}
                  />
              );
          case 'Home':
              return (
                  <HomeScreen 
                      onOpenSettings={() => setCurrentScreen('Settings')}
                      onOpenImagePicker={() => setCurrentScreen('ImagePicker')}
                      onOpenAlbum={() => setCurrentScreen('Album')}
                      onOpenDarkroom={() => {
                        setPendingDevelopPhoto(null);
                        setCurrentScreen('Darkroom');
                      }}
                  onLogout={handleLogout}
                  />
              );
          case 'Settings':
              return (
                  <SettingsScreen 
                      onSave={() => setCurrentScreen('Home')}
                      onCancel={() => setCurrentScreen('Home')}
                  />
              );
          case 'ImagePicker':
              return (
                  <ImagePickerScreen 
                      onBack={() => setCurrentScreen('Home')}
                      onGoDarkroom={(photo) => {
                        setPendingDevelopPhoto(photo);
                        setCurrentScreen('Darkroom');
                      }}
                      onGoCamera={(filmType, filmId) => {
                        setSelectedFilm({ type: filmType, id: filmId });
                        setCurrentScreen('Camera');
                        // setScreen('camera');
                      }}
                  />
              );
              case 'Camera':
              return (
                  // 5. CameraScreenの呼び出し
                  <CameraScreen 
                      filmType={selectedFilm?.type}
                      filmId={selectedFilm?.id}
                  onBack={() => setCurrentScreen('ImagePicker')}
                      onGoDarkroom={(photo: PendingDevelopPhoto) => {
                          setPendingDevelopPhoto(photo);
                          setCurrentScreen('Darkroom');
                      }}
                  />
              );
            case 'Album':
              return (
                <AlbumScreen
                  onBack={() => setCurrentScreen('Home')}
                  onGoDarkroom={(photo) => {
                    setPendingDevelopPhoto(photo);
                    setCurrentScreen('Darkroom');
                  }}
                />
              );
            case 'Darkroom':
              return (
                <DarkroomScreen
                  onBack={() => setCurrentScreen('Home')}
                  photo={pendingDevelopPhoto}
                />
              );
          default:
              return null;
      }
  };

  // SetupScreen is rendered full-screen (outside SafeAreaView)
  if (currentScreen === 'Setup' || currentScreen === 'Camera') {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.container} {...iosEdgeBackPanResponder.panHandlers}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          {renderContent()}
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container} {...iosEdgeBackPanResponder.panHandlers}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.content}>
          {renderContent()}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
