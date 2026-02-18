import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ImagePickerScreen } from './src/screens/ImagePickerScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { DarkroomScreen } from './src/screens/DarkroomScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useBGM } from './src/hooks/useBGM';
import { initDatabase } from './src/utils/sqlite';
import { clearUserSettings, getUserSettings } from './src/utils/storage';

type Screen = 'Login' | 'Home' | 'Settings' | 'ImagePicker' | 'Album' | 'Darkroom';

interface PendingDevelopPhoto {
  id: number;
  uri: string;
  filmId: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingDevelopPhoto, setPendingDevelopPhoto] = useState<PendingDevelopPhoto | null>(null);
  const { startBGM, stopBGM } = useBGM();

  // Control BGM based on current screen
  useEffect(() => {
    if (currentScreen === 'Home') {
      startBGM();
    } else {
      stopBGM();
    }
  }, [currentScreen, startBGM, stopBGM]);

  // initialize database on app start
  useEffect(() => {
    initDatabase().catch(err => console.log('DB init error', err));
  }, []);

  const handleLogout = async () => {
    await clearUserSettings();
    setCurrentScreen('Login');
  };

  // Decide initial route by saved login settings
  useEffect(() => {
    const bootstrap = async () => {
      const settings = await getUserSettings();
      if (settings?.username && settings?.token) {
        setCurrentScreen('Home');
      } else {
        setCurrentScreen('Login');
      }
      setIsInitializing(false);
    };

    bootstrap().catch(() => {
      setCurrentScreen('Login');
      setIsInitializing(false);
    });
  }, []);

  const renderContent = () => {
      switch (currentScreen) {
          case 'Login':
              return (
                  <LoginScreen
                      onLoginSuccess={() => setCurrentScreen('Home')}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {isInitializing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : renderContent()}
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
