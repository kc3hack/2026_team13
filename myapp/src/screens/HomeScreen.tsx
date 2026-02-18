import React, { useRef, useState } from 'react';
import {ActivityIndicator,Alert,Animated,PanResponder,SafeAreaView,StyleSheet,Text,TouchableOpacity,View,useWindowDimensions,} from 'react-native';
import { useGithubCommits } from '../hooks/useGithubCommits';

interface HomeScreenProps {
  onOpenSettings: () => void;
  onOpenImagePicker: () => void;
  onOpenAlbum: () => void;
  onOpenDarkroom: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenSettings, onOpenImagePicker, onOpenAlbum, onOpenDarkroom }) => {
  const { coinBalance, loading, checkForCommits, lastCheckTime, refreshBalance } = useGithubCommits();
  const { width } = useWindowDimensions();
  const menuWidth = Math.min(300, width * 0.76);
  const closedX = menuWidth;
  const menuTranslateX = useRef(new Animated.Value(closedX)).current;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCheckCommits = async () => {
    const result = await checkForCommits();
    if (result) {
      Alert.alert('コミットチェック', result.message);
    }
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(menuTranslateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuTranslateX, {
      toValue: closedX,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuOpen(false);
      }
    });
  };

  const edgePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy) && gesture.dx < -10,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -30) {
          openMenu();
        }
      },
    }),
  ).current;

  const menuPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy) && gesture.dx > 6,
      onPanResponderMove: (_, gesture) => {
        const nextValue = Math.max(0, Math.min(closedX, gesture.dx));
        menuTranslateX.setValue(nextValue);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 50) {
          closeMenu();
          return;
        }
        Animated.timing(menuTranslateX, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeText}>🪙 {coinBalance}</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openMenu}
        >
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleArea}>
        <Text style={styles.title}>Git Coin Miner</Text>
      </View>

      <View style={styles.commitArea}>
        <TouchableOpacity style={styles.checkButton} onPress={handleCheckCommits} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>コミットチェック</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.infoText}>Last Check: {lastCheckTime || 'None'}</Text>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.albumButton} onPress={onOpenAlbum}>
          <View style={styles.albumPreview} />
          <Text style={styles.albumLabel}>ALBUM</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutterOuter} onPress={onOpenImagePicker}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.darkroomButton} onPress={onOpenDarkroom}>
          <Text style={styles.darkroomIcon}>🔴</Text>
          <Text style={styles.darkroomLabel}>暗室へ移動</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightEdgeGesture} {...edgePanResponder.panHandlers} />

      {menuOpen && (
        <View style={styles.menuLayer} pointerEvents="box-none">
          <TouchableOpacity style={styles.menuBackdrop} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.menuPanel,
              {
                width: menuWidth,
                transform: [{ translateX: menuTranslateX }],
              },
            ]}
            {...menuPanResponder.panHandlers}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>MENU</Text>
              <TouchableOpacity onPress={closeMenu}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.aboutTitle}>About</Text>
            <Text style={styles.aboutText}>フィルム体験をテーマにしたコミット連動ダッシュボードです。</Text>
            <TouchableOpacity style={styles.settingsAction} onPress={onOpenSettings}>
              <Text style={styles.settingsActionText}>Settings</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  coinBadge: {
    marginTop: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  coinBadgeText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  menuButton: {
    width: 40,
    height: 40,
    marginTop: 33,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    color: '#1B1B1B',
  },
  titleArea: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    letterSpacing: 2,
    color: '#222222',
    fontWeight: '600',
    marginBottom: 16,
  },
  checkButton: {
    borderWidth: 1,
    borderColor: '#2EA44F',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#2EA44F',
    alignItems: 'center',
  },
  commitArea: {
    marginTop: 22,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    marginTop: 10,
    fontSize: 12,
    color: '#777777',
  },
  bottomControls: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  albumButton: {
    alignItems: 'center',
  },
  albumPreview: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D2D2D2',
    backgroundColor: '#F5F5F5',
    marginBottom: 6,
  },
  albumLabel: {
    fontSize: 11,
    color: '#4A4A4A',
    letterSpacing: 1.2,
  },
  shutterOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F1F1',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  darkroomButton: {
    width: 92,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6B0F0F',
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  darkroomIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  darkroomLabel: {
    fontSize: 11,
    color: '#FF4A4A',
    fontWeight: '700',
  },
  rightEdgeGesture: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 24,
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menuPanel: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 32,
    paddingHorizontal: 20,
    borderLeftWidth: 1,
    borderLeftColor: '#ECECEC',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
    elevation: 4,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202020',
    letterSpacing: 1,
  },
  closeText: {
    fontSize: 26,
    color: '#202020',
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555555',
    marginBottom: 24,
  },
  settingsAction: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  settingsActionText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '600',
  },
});
