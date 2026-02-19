import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { ImagePickerScreen } from './src/screens/ImagePickerScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { DarkroomScreen } from './src/screens/DarkroomScreen';
import { useBGM } from './src/hooks/useBGM';
import { initDb } from './src/utils/sqlite';
import { getUserSettings, clearUserSettings } from './src/utils/storage';

type Screen = 'Loading' | 'Setup' | 'Home' | 'Settings' | 'ImagePicker' | 'Album' | 'Darkroom';

interface PendingDevelopPhoto {
  id: number;
  uri: string;
  filmId: number;
}

export default function App() {
  const [pendingDevelopPhoto, setPendingDevelopPhoto] = useState<PendingDevelopPhoto | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('Loading');
  const { startBGM, stopBGM } = useBGM();

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
                  />
              );
            case 'Album':
              return (
                <AlbumScreen
                  onBack={() => setCurrentScreen('Home')}
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
  if (currentScreen === 'Setup') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {renderContent()}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
