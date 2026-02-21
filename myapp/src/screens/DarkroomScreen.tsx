import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Platform, SafeAreaView, Text, TouchableOpacity, View, PanResponder, AppState, Alert, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import * as Haptics from 'expo-haptics';
// ★ 修正: countDevelopingPhotos と 新しく作った countPendingPhotos をインポート
import { completeDevelopingSession, getDevelopingPhotos, getFilmEffectTypeById, getUndevelopedPhotosOldest, startDevelopingSession, updatePhotoUri, getFilmInventory, countDevelopingPhotos, countPendingPhotos } from '../utils/sqlite';
import { applyFilmEffectToPhoto } from '../utils/photoEffects';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FilmInventory, FILM_META, FILM_TYPES } from '../types';

import { styles as albumStyles } from '../styles/AlbumScreen.styles';
import { styles as darkroomStyles } from '../styles/DarkroomScreen.styles';
import { DarkroomSkiaView } from '../components/DarkroomSkiaView';

interface DarkroomScreenProps {
  onBack: () => void;
  onGoSettings?: () => void;
}

const SESSION_SECONDS = 10;
const globalDarkroomCache: Record<number, { remaining: number; isPaused: boolean }> = {};
let lastPlayedDarkroomBgmIndex: number | null = null;
const DARKROOM_ENVIRONMENT_BGMS: number[] = [
  require('../../assets/sounds/environment/VSQSE_0701_morning_01.mp3'),
  require('../../assets/sounds/environment/VSQSE_0713_rice_field_04.mp3'),
  require('../../assets/sounds/environment/VSQSE_0744_rain_06_bird.mp3'),
  require('../../assets/sounds/environment/VSQSE_0855_turtledove.mp3'),
  require('../../assets/sounds/environment/VSQSE_0967_singing_of_insect_08.mp3'),
  require('../../assets/sounds/environment/VSQSE_0988_thunder_02.mp3'),
  require('../../assets/sounds/environment/VSQSE_1010_room_ambient_05.mp3'),
  require('../../assets/sounds/environment/VSQSE_1042_old_growth_forest_02.mp3'),
];

interface DevelopingPhoto {
  id: number;
  uri: string;
  filmId: number;
}

export const DarkroomScreen: React.FC<DarkroomScreenProps> = ({ onBack, onGoSettings }) => {
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });
  const [developingPhotos, setDevelopingPhotos] = useState<DevelopingPhoto[]>([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [rightPanelDim, setRightPanelDim] = useState({ width: 0, height: 0 });
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({ mono: 0, vivid: 0, retro: 0, disposable: 0, soft: 0 });
  
  // ★ 追加: INFO表示用のカウントステート
  const [developingCount, setDevelopingCount] = useState(0);
  const [totalPendingCount, setTotalPendingCount] = useState(0);

  const waterSoundRef = useRef<Audio.Sound | null>(null);
  const selectedDarkroomBgmRef = useRef<number | null>(null);
  const waterTouchSoundRef = useRef<Audio.Sound | null>(null);
  const waterTouchStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWaterTouchAtRef = useRef(0);
  const cancelProcessingRef = useRef(false);
  const finalizedSessionRef = useRef(false);
  const { checkForCommits } = useGithubCommits();

  const activePhoto = developingPhotos[0] || null;
  const boldFont = { fontFamily: 'CourierPrime_700Bold' as const, fontWeight: 'normal' as const };
  const latestStateRef = useRef({ remainingSeconds, isPaused, activePhotoId: activePhoto?.id });

  if (!fontsLoaded) {
    return <SafeAreaView style={albumStyles.container} />;
  }

  useEffect(() => {
    latestStateRef.current = { remainingSeconds, isPaused, activePhotoId: activePhoto?.id };
  }, [remainingSeconds, isPaused, activePhoto?.id]);

  // ★ 追加: 枚数をDBから取得して更新する関数
  const refreshPhotoCounts = useCallback(async () => {
    try {
      const devCount = await countDevelopingPhotos();
      const pendingCount = await countPendingPhotos();
      setDevelopingCount(devCount);
      setTotalPendingCount(pendingCount);
    } catch (e) {
      console.log('failed to fetch photo counts', e);
    }
  }, []);

  useEffect(() => {
    const loadInventory = async () => {
      const inv = await getFilmInventory();
      setFilmInventory(inv);
    };
    loadInventory();
  }, []);

  const handleCheckCommits = async () => {
    const result = await checkForCommits();
    if (result) {
      Alert.alert('コミットチェック', result.message);
      const inv = await getFilmInventory();
      setFilmInventory(inv);
    }
  };

  const stopAndUnloadWaterSound = useCallback(async () => {
    const currentSound = waterSoundRef.current;
    if (!currentSound) return;
    waterSoundRef.current = null;
    try { await currentSound.stopAsync(); } catch {}
    try { await currentSound.unloadAsync(); } catch {}
  }, []);

  const stopAndUnloadWaterTouchSound = useCallback(async () => {
    if (waterTouchStopTimerRef.current) {
      clearTimeout(waterTouchStopTimerRef.current);
      waterTouchStopTimerRef.current = null;
    }

    const currentSound = waterTouchSoundRef.current;
    if (!currentSound) return;
    waterTouchSoundRef.current = null;
    try { await currentSound.stopAsync(); } catch {}
    try { await currentSound.unloadAsync(); } catch {}
  }, []);

  const playWaterTouchSound = useCallback(async () => {
    const now = Date.now();
    if (now - lastWaterTouchAtRef.current < 100) {
      return;
    }
    lastWaterTouchAtRef.current = now;

    try {
      if (!waterTouchSoundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/VSQSE_0604_water_splash_01.mp3'),
          { shouldPlay: false, isLooping: false, volume: 0.2 },
        );
        waterTouchSoundRef.current = sound;
      }

      if (waterTouchStopTimerRef.current) {
        clearTimeout(waterTouchStopTimerRef.current);
        waterTouchStopTimerRef.current = null;
      }

      await waterTouchSoundRef.current.setPositionAsync(0);
      await waterTouchSoundRef.current.playAsync();

      waterTouchStopTimerRef.current = setTimeout(() => {
        const currentSound = waterTouchSoundRef.current;
        if (!currentSound) return;
        void (async () => {
          try {
            await currentSound.stopAsync();
          } catch {}
        })();
        waterTouchStopTimerRef.current = null;
      }, 5000);
    } catch (error) {
      console.warn('水タッチSEの再生に失敗しました', error);
    }
  }, []);

  const runPhotoEffects = useCallback(async (rows: DevelopingPhoto[]) => {
    cancelProcessingRef.current = false;
    for (const targetPhoto of rows) {
      if (cancelProcessingRef.current) return;
      try {
        const resolvedEffectType = await getFilmEffectTypeById(targetPhoto.filmId);
        const effectType =
          resolvedEffectType
          ?? (targetPhoto.filmId === 1 || targetPhoto.filmId === 11
            ? 'mono'
            : targetPhoto.filmId === 2 || targetPhoto.filmId === 12
              ? 'vivid'
              : targetPhoto.filmId === 3 || targetPhoto.filmId === 13
                ? 'retro'
                : targetPhoto.filmId === 4 || targetPhoto.filmId === 14
                  ? 'disposable'
                  : targetPhoto.filmId === 5 || targetPhoto.filmId === 15
                    ? 'soft'
                    : 'mono');
        const processedUri = await applyFilmEffectToPhoto(targetPhoto.uri, effectType, {
          shouldCancel: () => cancelProcessingRef.current,
        });
        if (cancelProcessingRef.current) return;
        if (processedUri !== targetPhoto.uri) {
          await updatePhotoUri(targetPhoto.id, processedUri);
          setDevelopingPhotos((prev) => prev.map((item) => (item.id === targetPhoto.id ? { ...item, uri: processedUri } : item)));
        }
      } catch (error) {
        console.log('failed to process photo in darkroom', error);
      }
    }
  }, []);

  const finalizeSession = useCallback(async (rows: DevelopingPhoto[]) => {
    if (finalizedSessionRef.current || rows.length === 0) return;
    finalizedSessionRef.current = true;
    setIsFinishingSession(true);

    try {
      await runPhotoEffects(rows);
      await completeDevelopingSession(rows.map((item) => item.id));
      setRemainingSeconds(0);
      setCompletionMessage('現像完了。アルバムを確認してください');
      setIsSessionCompleted(true);
      if (activePhoto) delete globalDarkroomCache[activePhoto.id];
      await refreshPhotoCounts(); // ★ 完了時にカウント更新
    } catch (error) {
      console.log('failed to finalize developing session', error);
    } finally {
      setIsFinishingSession(false);
      await stopAndUnloadWaterSound();
    }
  }, [runPhotoEffects, stopAndUnloadWaterSound, activePhoto, refreshPhotoCounts]);

  useEffect(() => {
    let isActive = true;
    setIsPreparing(true);
    setIsSessionStarted(false);
    setIsSessionCompleted(false);
    finalizedSessionRef.current = false;

    const loadSession = async () => {
      try {
        await refreshPhotoCounts(); // ★ 初期ロード時にカウント更新

        const developing = await getDevelopingPhotos();
        if (!isActive) return;

        if (developing.length > 0) {
          setDevelopingPhotos([{ id: developing[0].id, uri: developing[0].uri, filmId: developing[0].film_id }]);
          setIsSessionStarted(true);
          
          const cached = globalDarkroomCache[developing[0].id];
          if (cached) {
             setRemainingSeconds(cached.remaining);
             setIsPaused(cached.isPaused);
          } else {
             setRemainingSeconds(SESSION_SECONDS);
             setIsPaused(false);
          }
          return;
        }

        const undeveloped = await getUndevelopedPhotosOldest(1);
        if (!isActive) return;

        if (undeveloped.length > 0) {
           setDevelopingPhotos([{ id: undeveloped[0].id, uri: undeveloped[0].uri, filmId: undeveloped[0].film_id }]);
        } else {
           setDevelopingPhotos([]);
           setCompletionMessage('現像対象の写真がありません');
        }
        setRemainingSeconds(SESSION_SECONDS);
        setIsSessionStarted(false);
      } catch (error) {
        console.log('failed to load darkroom session', error);
      } finally {
        if (isActive) setIsPreparing(false);
      }
    };
    void loadSession();
    return () => { isActive = false; };
  }, [refreshPhotoCounts]);

  useEffect(() => {
    if (!isSessionStarted || isSessionCompleted || isPaused) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSessionStarted, isSessionCompleted, isPaused]);

  useEffect(() => {
    if (isSessionStarted && remainingSeconds === 0 && !isSessionCompleted && !isFinishingSession && developingPhotos.length > 0) {
      void finalizeSession(developingPhotos);
    }
  }, [remainingSeconds, isSessionStarted, isSessionCompleted, isFinishingSession, developingPhotos, finalizeSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
         if (isSessionStarted && !isSessionCompleted) setIsPaused(true);
      }
    });
    return () => subscription.remove();
  }, [isSessionStarted, isSessionCompleted]);

  useEffect(() => {
    return () => {
      cancelProcessingRef.current = true;
      const { activePhotoId, remainingSeconds, isPaused } = latestStateRef.current;
      if (activePhotoId && remainingSeconds > 0) {
          globalDarkroomCache[activePhotoId] = { remaining: remainingSeconds, isPaused: true };
      }
      void stopAndUnloadWaterSound();
      void stopAndUnloadWaterTouchSound();
      selectedDarkroomBgmRef.current = null;
    };
  }, [stopAndUnloadWaterSound, stopAndUnloadWaterTouchSound]);

  const handleStartDeveloping = useCallback(() => {
    if (isSessionStarted || isSessionCompleted || !activePhoto) return;
    void (async () => {
      try {
        setIsPreparing(true);
        const startedIds = await startDevelopingSession([activePhoto.id]);
        if (startedIds.length > 0) {
          setIsSessionStarted(true);
          setIsPaused(false);
          setCompletionMessage('');
          await refreshPhotoCounts(); // ★ 開始時にカウント更新
        }
      } finally {
        setIsPreparing(false);
      }
    })();
  }, [activePhoto, isSessionCompleted, isSessionStarted, refreshPhotoCounts]);

  const togglePause = () => {
      Haptics.selectionAsync();
      setIsPaused(!isPaused);
  };

  const shouldPlayWaterSound = isSessionStarted && remainingSeconds > 0 && !isSessionCompleted && !isPaused;

  useEffect(() => {
    let isMounted = true;
    const syncWaterSound = async () => {
      if (!shouldPlayWaterSound) {
        await stopAndUnloadWaterSound();
        return;
      }
      if (waterSoundRef.current) return;
      try {
        if (selectedDarkroomBgmRef.current === null) {
          let randomIndex = Math.floor(Math.random() * DARKROOM_ENVIRONMENT_BGMS.length);
          if (DARKROOM_ENVIRONMENT_BGMS.length > 1 && lastPlayedDarkroomBgmIndex !== null) {
            while (randomIndex === lastPlayedDarkroomBgmIndex) {
              randomIndex = Math.floor(Math.random() * DARKROOM_ENVIRONMENT_BGMS.length);
            }
          }
          selectedDarkroomBgmRef.current = DARKROOM_ENVIRONMENT_BGMS[randomIndex];
          lastPlayedDarkroomBgmIndex = randomIndex;
        }

        const { sound } = await Audio.Sound.createAsync(
          selectedDarkroomBgmRef.current,
          { shouldPlay: true, isLooping: true },
        );
        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }
        waterSoundRef.current = sound;
      } catch (error) {
        console.warn('水音ASMRの再生に失敗しました', error);
      }
    };
    void syncWaterSound();
    return () => { isMounted = false; };
  }, [shouldPlayWaterSound, stopAndUnloadWaterSound]);

  useEffect(() => {
    if (remainingSeconds === 0 || isSessionCompleted) {
      void stopAndUnloadWaterTouchSound();
    }
  }, [remainingSeconds, isSessionCompleted, stopAndUnloadWaterTouchSound]);

  const displayTime = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
  }, [remainingSeconds]);

  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const isSwipingDown = gestureState.dy > 20;
        return isVerticalSwipe && isSwipingDown;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onBack();
        }
      },
    })
  ).current;

  if (isPreparing) {
    return (
      <SafeAreaView style={albumStyles.container}>
        <View style={darkroomStyles.loadingWrap}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={darkroomStyles.loadingText}>LOADING DARKROOM...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isMaskVisible = !isSessionCompleted;

  return (
    <SafeAreaView style={albumStyles.container} {...swipePanResponder.panHandlers}>
      <View style={albumStyles.topBar}>
        {FILM_TYPES.map((type) => {
          const meta = FILM_META[type];
          return (
            <View key={type} style={albumStyles.filmBadge}>
              <Image source={meta.image} style={albumStyles.filmBadgeImage} />
              <Text style={[albumStyles.filmBadgeCount, boldFont]}>{filmInventory[type]}</Text>
            </View>
          );
        })}
        <TouchableOpacity style={albumStyles.topBarButton} onPress={handleCheckCommits}>
          <Text style={[albumStyles.topBarButtonText, boldFont]}>↻</Text>
        </TouchableOpacity>
        {onGoSettings && (
          <TouchableOpacity style={albumStyles.topBarButton} onPress={onGoSettings}>
            <Text style={[albumStyles.topBarButtonText, boldFont]}>⚙</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={albumStyles.mainLayout}>
        <View style={albumStyles.leftPanel}>
          <View style={albumStyles.grip}>
            <View style={albumStyles.navSquare} />
            <View style={albumStyles.gripLine} />
            <View style={albumStyles.navSquare} />
            <View style={albumStyles.gripLine} />
            <View style={[albumStyles.navSquare, albumStyles.navSquareActive]} />
          </View>

          <View style={albumStyles.dashboard}>
            <Text style={albumStyles.systemText}>DEVIT  //  DARKROOM</Text>

            <View style={albumStyles.instruments}>
              
              {(isSessionStarted && !isSessionCompleted && !isFinishingSession) && (
                <>
                  <Text style={albumStyles.label}>[ TIME LEFT ]</Text>
                  <Text style={[
                    darkroomStyles.statusValue, 
                    { 
                      fontSize: 44,           // 7セグメントが映えるように大きく
                      fontWeight: 'normal',   // デジタルフォントはnormal推奨
                      color: '#D41414', 
                      letterSpacing: 2, 
                      marginBottom: 24,
                      fontFamily: 'DSEG7Classic-Regular', // ★ 7セグメントフォント（※別途読み込みが必要）
                      textShadowColor: 'rgba(212, 20, 20, 0.8)',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 10,
                    },
                    isPaused && { color: '#ffaa00', textShadowColor: 'rgba(255, 170, 0, 0.8)' }
                  ]}>
                    {displayTime}
                  </Text>
                </>
              )}

              {/* メッセージ表示（完了時など） */}
              {(!isFinishingSession && completionMessage.length > 0) && (
                <Text style={[darkroomStyles.infoValue, { marginBottom: 24, color: '#C5B7B7' }]}>
                  {completionMessage}
                </Text>
              )}

              {/* ★ 変更: INFO を (現像中) / (未現像全体) に変更 */}
              <Text style={albumStyles.label}>[ INFO: DEV / TOTAL ]</Text>
              <Text style={[darkroomStyles.infoValue, { fontSize: 22, letterSpacing: 4, color: '#fff' }]}>
                {developingCount} / {totalPendingCount}
              </Text>

              <Text style={[albumStyles.label, { marginTop: Platform.OS === 'android' ? 14 : 32 }]}>[ ACTION ]</Text>
              <View style={albumStyles.buttonRow}>
                {!isSessionStarted && !isSessionCompleted && activePhoto && (
                  <TouchableOpacity style={albumStyles.dashboardBtn} onPress={handleStartDeveloping}>
                    <Text style={darkroomStyles.actionBtnText}>START DEVELOPING</Text>
                  </TouchableOpacity>
                )}
                {isSessionStarted && !isSessionCompleted && (
                  <TouchableOpacity 
                    style={[albumStyles.dashboardBtn, isPaused && albumStyles.dashboardBtnActive]} 
                    onPress={togglePause}
                  >
                    <Text style={[darkroomStyles.actionBtnText, isPaused && albumStyles.btnTextActive]}>
                      {isPaused ? 'RESUME' : 'PAUSE'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isSessionCompleted && (
                  <View style={albumStyles.dashboardBtn}>
                    <Text style={darkroomStyles.actionBtnText}>CHECK ALBUM</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={[albumStyles.rightPanel, darkroomStyles.darkroomRightPanel]} onLayout={(e) => setRightPanelDim(e.nativeEvent.layout)}>
          {rightPanelDim.width > 0 && activePhoto ? (
            <View style={darkroomStyles.fullscreenContent}>
              {isMaskVisible && (
                <View style={darkroomStyles.fullscreenSkiaWrap}>
                  <DarkroomSkiaView
                    photoUri={activePhoto.uri}
                    width={rightPanelDim.width}
                    height={rightPanelDim.height}
                    onWaterTouch={() => {
                      if (!isSessionCompleted && remainingSeconds > 0 && isSessionStarted && !isFinishingSession) {
                        void playWaterTouchSound();
                      }
                    }}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={darkroomStyles.emptyBackground}>
              <Text style={darkroomStyles.emptyBackgroundText}>NO PHOTO</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};