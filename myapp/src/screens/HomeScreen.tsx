import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  PanResponder,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FILM_META } from '../types';
import { addFilm } from '../utils/sqlite';
import { getMenuBackgroundMode, MenuBackgroundMode, setMenuBackgroundMode } from '../utils/storage';
import { styles } from '../styles/HomeScreen.styles';

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
  const [menuBackgroundMode, setMenuBackgroundModeState] = useState<MenuBackgroundMode>('light');
  const isMenuDark = menuBackgroundMode === 'dark';

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

  useEffect(() => {
    if (Platform.OS !== 'android' || !menuOpen) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return true;
    });

    return () => subscription.remove();
  }, [menuOpen, closedX]);

  useEffect(() => {
    void (async () => {
      const mode = await getMenuBackgroundMode();
      setMenuBackgroundModeState(mode);
    })();
  }, []);

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
      Alert.alert('フィルム追加', `${meta.label} を追加しました！`);
    } catch (error) {
      console.log('failed to add debug film', error);
      Alert.alert('エラー', 'フィルムの追加に失敗しました。');
    }
  };

  const handleChangeMenuBackgroundMode = async (mode: MenuBackgroundMode) => {
    setMenuBackgroundModeState(mode);
    await setMenuBackgroundMode(mode);
  };

  return (
    <SafeAreaView style={[styles.container, isMenuDark ? styles.containerDark : styles.containerLight]}>
      <View style={styles.topBar}>
        <View style={styles.filmBadgeRow}>
          <View style={[styles.filmBadge, isMenuDark && styles.filmBadgeDark]}>
            <Image source={FILM_META.mono.image} style={styles.filmBadgeImage} />
            <Text style={[styles.filmBadgeText, isMenuDark && styles.homeTextDark]}>{filmInventory.mono}</Text>
          </View>
          <View style={[styles.filmBadge, isMenuDark && styles.filmBadgeDark]}>
            <Image source={FILM_META.vivid.image} style={styles.filmBadgeImage} />
            <Text style={[styles.filmBadgeText, isMenuDark && styles.homeTextDark]}>{filmInventory.vivid}</Text>
          </View>
          <View style={[styles.filmBadge, isMenuDark && styles.filmBadgeDark]}>
            <Image source={FILM_META.retro.image} style={styles.filmBadgeImage} />
            <Text style={[styles.filmBadgeText, isMenuDark && styles.homeTextDark]}>{filmInventory.retro}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
          <Text style={[styles.menuButtonText, isMenuDark && styles.homeTextDark]}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleArea}>
        <Text style={[styles.title, isMenuDark && styles.homeTextDark]}>Git Coin Miner</Text>
      </View>

      <View style={styles.commitArea}>
        <TouchableOpacity style={styles.checkButton} onPress={handleCheckCommits} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>コミットチェック</Text>}
        </TouchableOpacity>
        <Text style={[styles.infoText, isMenuDark && styles.homeSubTextDark]}>Last Check: {lastCheckTime || 'None'}</Text>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.sideControlLeft}>
          <TouchableOpacity style={[styles.albumButton, isMenuDark && styles.albumButtonDark]} onPress={onOpenAlbum}>
            <Text style={styles.albumIcon}>🖼️</Text>
            <Text style={[styles.albumLabel, isMenuDark && styles.homeSubTextDark]}>ALBUM</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.shutterOuter, isMenuDark && styles.shutterOuterDark]} onPress={onOpenImagePicker}>
          <View style={[styles.shutterInner, isMenuDark && styles.shutterInnerDark]} />
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
              isMenuDark ? styles.menuPanelDark : styles.menuPanelLight,
              {
                width: menuWidth,
                transform: [{ translateX: menuTranslateX }],
              },
            ]}
            {...menuPanResponder.panHandlers}
          >
            <View style={styles.menuHeader}>
              <Text style={[styles.menuTitle, isMenuDark && styles.menuTextDark]}>MENU</Text>
              <TouchableOpacity onPress={closeMenu}>
                <Text style={[styles.closeText, isMenuDark && styles.menuTextDark]}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.aboutTitle, isMenuDark && styles.menuTextDark]}>About</Text>
            <Text style={[styles.aboutText, isMenuDark && styles.menuSubTextDark]}>フィルム体験をテーマにしたコミット連動ダッシュボードです。</Text>

            <Text style={[styles.menuSectionTitle, isMenuDark && styles.menuTextDark]}>背景</Text>
            <View style={styles.menuThemeRow}>
              <TouchableOpacity
                style={[
                  styles.menuThemeButton,
                  menuBackgroundMode === 'light' && styles.menuThemeButtonActive,
                  isMenuDark && styles.menuThemeButtonDark,
                ]}
                onPress={() => void handleChangeMenuBackgroundMode('light')}
              >
                <Text style={[styles.menuThemeButtonText, isMenuDark && styles.menuTextDark]}>白</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.menuThemeButton,
                  menuBackgroundMode === 'dark' && styles.menuThemeButtonActive,
                  isMenuDark && styles.menuThemeButtonDark,
                ]}
                onPress={() => void handleChangeMenuBackgroundMode('dark')}
              >
                <Text style={[styles.menuThemeButtonText, isMenuDark && styles.menuTextDark]}>黒</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.debugTitle, isMenuDark && styles.menuTextDark]}>デバッグ: フィルム追加</Text>
            <TouchableOpacity style={[styles.debugAction, isMenuDark && styles.debugActionDark]} onPress={() => handleAddDebugFilm('mono')}>
              <Text style={[styles.debugActionText, isMenuDark && styles.menuSubTextDark]}>⚫ モノクロを追加（所持: {filmInventory.mono}）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.debugAction, isMenuDark && styles.debugActionDark]} onPress={() => handleAddDebugFilm('vivid')}>
              <Text style={[styles.debugActionText, isMenuDark && styles.menuSubTextDark]}>🌈 ビビッドを追加（所持: {filmInventory.vivid}）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.debugAction, isMenuDark && styles.debugActionDark]} onPress={() => handleAddDebugFilm('retro')}>
              <Text style={[styles.debugActionText, isMenuDark && styles.menuSubTextDark]}>📼 レトロを追加（所持: {filmInventory.retro}）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsAction, isMenuDark && styles.settingsActionDark]} onPress={onOpenSettings}>
              <Text style={[styles.settingsActionText, isMenuDark && styles.menuTextDark]}>Settings</Text>
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


