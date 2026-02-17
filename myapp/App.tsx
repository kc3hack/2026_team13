import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ImagePickerScreen } from './src/screens/ImagePickerScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { useBGM } from './src/hooks/useBGM';
import { initDb } from './src/utils/sqlite';

type Screen = 'Home' | 'Settings' | 'ImagePicker' | 'Album';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
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
    initDb().catch(err => console.log('DB init error', err));
  }, []);

  const renderContent = () => {
      switch (currentScreen) {
          case 'Home':
              return (
                  <HomeScreen 
                      onOpenSettings={() => setCurrentScreen('Settings')}
                      onOpenImagePicker={() => setCurrentScreen('ImagePicker')}
                      onOpenAlbum={() => setCurrentScreen('Album')}
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
                  />
              );
            case 'Album':
              return (
                <AlbumScreen
                  onBack={() => setCurrentScreen('Home')}
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
});
