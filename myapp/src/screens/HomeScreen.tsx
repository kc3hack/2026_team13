import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FILM_META } from '../types';
import { addFilm } from '../utils/sqlite';

interface HomeScreenProps {
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenImagePicker: () => void;
  onOpenAlbum: () => void;
  onOpenDarkroom: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onLogout,
  onOpenSettings,
  onOpenImagePicker,
  onOpenAlbum,
  onOpenDarkroom,
}) => {
  const { filmInventory, loading, checkForCommits, lastCheckTime, refreshInventory } = useGithubCommits();
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

  const handleLogout = () => {
    Alert.alert(
      'ログアウト確認',
      '本当にログアウトしますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: () => {
            closeMenu();
            onLogout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleAddDebugFilm = async (type: 'mono' | 'vivid' | 'retro') => {
    try {
      await addFilm(type);
      await refreshInventory();
      const meta = FILM_META[type];
      Alert.alert('フィルム追加', `${meta.emoji} ${meta.label} を追加しました！`);
    } catch (error) {
      console.log('failed to add debug film', error);
      Alert.alert('エラー', 'フィルムの追加に失敗しました。');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.filmBadgeRow}>
          <View style={styles.filmBadge}>
            <Text style={styles.filmBadgeText}>{FILM_META.mono.emoji} {filmInventory.mono}</Text>
          </View>
          <View style={styles.filmBadge}>
            <Text style={styles.filmBadgeText}>{FILM_META.vivid.emoji} {filmInventory.vivid}</Text>
          </View>
          <View style={styles.filmBadge}>
            <Text style={styles.filmBadgeText}>{FILM_META.retro.emoji} {filmInventory.retro}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleArea}>
        <Text style={styles.title}>Git Coin Miner</Text>
      </View>

      <View style={styles.commitArea}>
        <TouchableOpacity style={styles.checkButton} onPress={handleCheckCommits} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>コミットチェック</Text>}
        </TouchableOpacity>
        <Text style={styles.infoText}>Last Check: {lastCheckTime || 'None'}</Text>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.sideControlLeft}>
          <TouchableOpacity style={styles.albumButton} onPress={onOpenAlbum}>
            <Text style={styles.albumIcon}>🖼️</Text>
            <Text style={styles.albumLabel}>ALBUM</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shutterOuter} onPress={onOpenImagePicker}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={styles.sideControlRight}>
          <TouchableOpacity style={styles.darkroomButton} onPress={onOpenDarkroom}>
            <Text style={styles.darkroomIcon}>🔴</Text>
            <Text style={styles.darkroomLabel}>暗室へ移動</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.debugTitle}>デバッグ: フィルム追加</Text>
            <TouchableOpacity style={styles.debugAction} onPress={() => handleAddDebugFilm('mono')}>
              <Text style={styles.debugActionText}>⚫ モノクロを追加（所持: {filmInventory.mono}）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.debugAction} onPress={() => handleAddDebugFilm('vivid')}>
              <Text style={styles.debugActionText}>🌈 ビビッドを追加（所持: {filmInventory.vivid}）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.debugAction} onPress={() => handleAddDebugFilm('retro')}>
              <Text style={styles.debugActionText}>📼 レトロを追加（所持: {filmInventory.retro}）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsAction} onPress={onOpenSettings}>
              <Text style={styles.settingsActionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutAction} onPress={handleLogout}>
              <Text style={styles.logoutActionText}>ログアウト</Text>
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
  },
  coinBadgeText: {
  },
  filmBadgeRow: {
    marginTop: 36,
    flexDirection: 'row',
    gap: 8,
  },
  filmBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  filmBadgeText: {
    fontSize: 14,
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
  filmSelectorWrap: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  filmSelectorTitle: {
    fontSize: 13,
    color: '#3C3C3C',
    marginBottom: 10,
    fontWeight: '600',
  },
  filmSelectorRow: {
    paddingRight: 20,
    gap: 10,
  },
  filmChip: {
    minWidth: 148,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  filmChipSelected: {
    borderColor: '#222222',
    backgroundColor: '#F3F3F3',
  },
  filmChipTitle: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  filmChipTitleSelected: {
    color: '#111111',
  },
  filmChipDesc: {
    color: '#666666',
    fontSize: 12,
  },
  filmChipDescSelected: {
    color: '#3E3E3E',
  },
  bottomControls: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  sideControlLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideControlRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  albumButton: {
    width: 92,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D2D2D2',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  albumLabel: {
    fontSize: 11,
    color: '#4A4A4A',
    fontWeight: '700',
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
  debugTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  debugAction: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  debugActionText: {
    fontSize: 13,
    color: '#1E1E1E',
    fontWeight: '600',
  },
  settingsAction: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsActionText: {
    fontSize: 14,
    color: '#1E1E1E',
    fontWeight: '600',
  },
  logoutAction: {
    marginTop: 10,
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E2B5B5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7F7',
  },
  logoutActionText: {
    color: '#A12A2A',
    fontSize: 14,
    fontWeight: '700',
  },
});
