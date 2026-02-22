import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Platform, SafeAreaView, Text, TouchableOpacity, View, PanResponder, AppState, Alert, useWindowDimensions, Animated, Easing, Pressable, ScrollView, FlatList } from 'react-native';
import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import * as Haptics from 'expo-haptics';
import { completeDevelopingSession, getDevelopingPhotos, getFilmEffectTypeById, getUndevelopedPhotosOldest, startDevelopingSession, updatePhotoUri, getFilmInventory, countDevelopingPhotos, countPendingPhotos } from '../utils/sqlite';
import { applyFilmEffectToPhoto, applyUndevelopedPreviewEffect, getUndevelopedPreviewUriByPhotoId } from '../utils/photoEffects';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { getDarkroomUseNativeRipple } from '../utils/storage';
import { FilmInventory, FILM_META, FILM_TYPES } from '../types';

import { styles as albumStyles } from '../styles/AlbumScreen.styles';
import { styles as darkroomStyles } from '../styles/DarkroomScreen.styles';
import { DarkroomSkiaView } from '../components/DarkroomSkiaView';

interface DarkroomScreenProps {
  onBack: () => void;
  onGoSettings?: () => void;
  onGoAlbum?: () => void;
}

const SESSION_SECONDS = 10;
const MAX_DEVELOPING_BATCH = 5;
const globalDarkroomCache: Record<number, { remaining: number; isPaused: boolean }> = {};
const DARKROOM_ASMR_BGM = require('../../assets/sounds/water_asmr.mp3');
const DARKROOM_MIXDOWN_BGM = require('../../assets/sounds/Mixdown.mp3');
const DARKROOM_MIXDOWN_INTERVAL_MS = 30000;

const DISPLAY_FILMS = FILM_TYPES.filter(type => ['mono', 'vivid', 'retro'].includes(type));

interface DevelopingPhoto {
  id: number;
  uri: string;
  filmId: number;
  previewUri?: string;
}

interface ResultPhoto {
  id: number;
  beforeUri: string;
  afterUri: string;
  aspectRatio: number;
}

export const DarkroomScreen: React.FC<DarkroomScreenProps> = ({ onBack, onGoSettings, onGoAlbum }) => {
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
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [resultPhotos, setResultPhotos] = useState<ResultPhoto[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [useNativeRipple, setUseNativeRipple] = useState(false);
  const [rightPanelDim, setRightPanelDim] = useState({ width: 0, height: 0 });
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({ mono: 0, vivid: 0, retro: 0 } as FilmInventory);
  const [developingCount, setDevelopingCount] = useState(0);
  const [totalPendingCount, setTotalPendingCount] = useState(0);

  const waterSoundRef = useRef<Audio.Sound | null>(null);
  const mixdownSoundRef = useRef<Audio.Sound | null>(null);
  const mixdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedDarkroomBgmRef = useRef<number | null>(null);
  const waterTouchSoundRef = useRef<Audio.Sound | null>(null);
  const waterTouchStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWaterTouchAtRef = useRef(0);
  const cancelProcessingRef = useRef(false);
  const finalizedSessionRef = useRef(false);
  const revealProgress = useRef(new Animated.Value(0)).current;
  const { checkForCommits } = useGithubCommits();

  const activePhoto = developingPhotos[0] || null;
  const boldFont = { fontFamily: 'CourierPrime_700Bold' as const, fontWeight: 'normal' as const };
  const latestStateRef = useRef({ remainingSeconds, isPaused, activePhotoId: activePhoto?.id });

  if (!fontsLoaded) {
    return <SafeAreaView style={albumStyles.container} />;
  }

  const resolveAspectRatio = useCallback(async (uri: string): Promise<number> => {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            resolve(width / height);
          } else {
            resolve(3 / 4);
          }
        },
        () => resolve(3 / 4),
      );
    });
  }, []);

  const resolveUndevelopedPreviewUri = useCallback(async (photoId: number, uri: string): Promise<string> => {
    const existingPreviewUri = await getUndevelopedPreviewUriByPhotoId(photoId);
    if (existingPreviewUri) {
      return existingPreviewUri;
    }

    return applyUndevelopedPreviewEffect(uri, {
      outputFileName: `${photoId}_undeveloped.jpg`,
    });
  }, []);

  const toDevelopingPhotos = useCallback(async (
    rows: Array<{ id: number; uri: string; film_id: number }>,
  ): Promise<DevelopingPhoto[]> => {
    return Promise.all(
      rows.map(async (item) => ({
        id: item.id,
        uri: item.uri,
        filmId: item.film_id,
        previewUri: await resolveUndevelopedPreviewUri(item.id, item.uri),
      })),
    );
  }, [resolveUndevelopedPreviewUri]);

  const ensureQueuedPhotosStarted = useCallback(async (queuedIds: number[]): Promise<number[]> => {
    if (queuedIds.length === 0) return [];

    const startedSet = new Set<number>();

    for (let attempt = 0; attempt < 3 && startedSet.size < queuedIds.length; attempt += 1) {
      const remaining = queuedIds.filter((id) => !startedSet.has(id));
      if (remaining.length === 0) break;

      const startedIds = await startDevelopingSession(remaining);
      startedIds.forEach((id) => startedSet.add(id));

      const currentlyDeveloping = await getDevelopingPhotos();
      currentlyDeveloping.forEach((photo) => {
        if (queuedIds.includes(photo.id)) {
          startedSet.add(photo.id);
        }
      });
    }

    return queuedIds.filter((id) => startedSet.has(id));
  }, []);

  useEffect(() => {
    latestStateRef.current = { remainingSeconds, isPaused, activePhotoId: activePhoto?.id };
  }, [remainingSeconds, isPaused, activePhoto?.id]);

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

  useEffect(() => {
    const loadRippleMode = async () => {
      const enabled = await getDarkroomUseNativeRipple();
      setUseNativeRipple(enabled);
    };
    void loadRippleMode();
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

  const stopAndUnloadMixdownSound = useCallback(async () => {
    if (mixdownTimerRef.current) {
      clearInterval(mixdownTimerRef.current);
      mixdownTimerRef.current = null;
    }
    const currentSound = mixdownSoundRef.current;
    if (!currentSound) return;
    mixdownSoundRef.current = null;
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
    if (now - lastWaterTouchAtRef.current < 100) return;
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
          try { await currentSound.stopAsync(); } catch {}
        })();
        waterTouchStopTimerRef.current = null;
      }, 5000);
    } catch (error) {
      console.warn('水タッチSEの再生に失敗しました', error);
    }
  }, []);

  const runPhotoEffects = useCallback(async (rows: DevelopingPhoto[]) => {
    const updatedRows = rows.map((row) => ({ ...row }));
    cancelProcessingRef.current = false;
    for (const targetPhoto of updatedRows) {
      if (cancelProcessingRef.current) return updatedRows;
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
                : 'mono');

        const processedUri = await applyFilmEffectToPhoto(targetPhoto.uri, effectType, {
          shouldCancel: () => cancelProcessingRef.current,
        });

        if (cancelProcessingRef.current) return updatedRows;
        if (processedUri !== targetPhoto.uri) {
          targetPhoto.uri = processedUri;
          await updatePhotoUri(targetPhoto.id, processedUri);
          setDevelopingPhotos((prev) => prev.map((item) => (item.id === targetPhoto.id ? { ...item, uri: processedUri } : item)));
        }
      } catch (error) {
        console.log('failed to process photo in darkroom', error);
      }
    }
    return updatedRows;
  }, []);

  const finalizeSession = useCallback(async (rows: DevelopingPhoto[]) => {
    if (finalizedSessionRef.current || rows.length === 0) return;
    finalizedSessionRef.current = true;
    setIsFinishingSession(true);

    try {
      const beforeById = new Map(rows.map((item) => [item.id, item.uri]));
      const undevelopedPreviewById = new Map(
        await Promise.all(
          rows.map(async (item) => [
            item.id,
            item.previewUri ?? await getUndevelopedPreviewUriByPhotoId(item.id),
          ] as const),
        ),
      );
      const processedRows = await runPhotoEffects(rows);
      const resultRows: ResultPhoto[] = await Promise.all(
        processedRows.map(async (item) => ({
          id: item.id,
          beforeUri: undevelopedPreviewById.get(item.id) ?? beforeById.get(item.id) ?? item.uri,
          afterUri: item.uri,
          aspectRatio: await resolveAspectRatio(item.uri),
        })),
      );

      await completeDevelopingSession(rows.map((item) => item.id));
      const nextUndeveloped = await getUndevelopedPhotosOldest(MAX_DEVELOPING_BATCH);

      if (nextUndeveloped.length > 0) {
        setDevelopingPhotos(await toDevelopingPhotos(nextUndeveloped));
      } else {
        setDevelopingPhotos([]);
      }

      setIsSessionStarted(false);
      setIsPaused(false);
      setRemainingSeconds(SESSION_SECONDS);
      setCompletionMessage(
        nextUndeveloped.length > 0
          ? '現像完了。次の写真を現像できます'
          : '現像完了。現像対象の写真がありません',
      );
      setIsSessionCompleted(true);
      setResultPhotos(resultRows);
      setIsResultModalVisible(resultRows.length > 0);

      if (rows[0]) {
        delete globalDarkroomCache[rows[0].id];
      }
      await refreshPhotoCounts();
    } catch (error) {
      console.log('failed to finalize developing session', error);
    } finally {
      setIsFinishingSession(false);
      await stopAndUnloadWaterSound();
      await stopAndUnloadMixdownSound();
    }
  }, [refreshPhotoCounts, resolveAspectRatio, runPhotoEffects, stopAndUnloadMixdownSound, stopAndUnloadWaterSound, toDevelopingPhotos]);

  useEffect(() => {
    let isActive = true;
    setIsPreparing(true);
    setIsSessionStarted(false);
    setIsSessionCompleted(false);
    finalizedSessionRef.current = false;

    const loadSession = async () => {
      try {
        await refreshPhotoCounts();

        const developing = await getDevelopingPhotos();
        if (!isActive) return;

        if (developing.length > 0) {
          setDevelopingPhotos(await toDevelopingPhotos(developing.slice(0, MAX_DEVELOPING_BATCH)));
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

        const undeveloped = await getUndevelopedPhotosOldest(MAX_DEVELOPING_BATCH);
        if (!isActive) return;

        if (undeveloped.length > 0) {
          setDevelopingPhotos(await toDevelopingPhotos(undeveloped));
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
    return () => {
      isActive = false;
    };
  }, [refreshPhotoCounts, toDevelopingPhotos]);

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
    // タイマーが0になったら完了処理を呼ぶ
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
      void stopAndUnloadMixdownSound();
      void stopAndUnloadWaterTouchSound();
      selectedDarkroomBgmRef.current = null;
    };
  }, [stopAndUnloadMixdownSound, stopAndUnloadWaterSound, stopAndUnloadWaterTouchSound]);

  const handleStartDeveloping = useCallback(() => {
    if (isSessionStarted || isSessionCompleted || !activePhoto) return;
    void (async () => {
      try {
        setIsPreparing(true);
        const queuedIds = developingPhotos.map((item) => item.id);
        const startedIds = await ensureQueuedPhotosStarted(queuedIds);
        if (startedIds.length > 0) {
          setDevelopingPhotos((prev) => prev.filter((item) => startedIds.includes(item.id)));
          setIsSessionStarted(true);
          setIsPaused(false);
          setCompletionMessage('');
          setPreviewIndex(0);
          await refreshPhotoCounts();
        }
      } finally {
        setIsPreparing(false);
      }
    })();
  }, [activePhoto, developingPhotos, ensureQueuedPhotosStarted, isSessionCompleted, isSessionStarted, refreshPhotoCounts]);

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
          selectedDarkroomBgmRef.current = DARKROOM_ASMR_BGM;
        }

        const { sound } = await Audio.Sound.createAsync(
          selectedDarkroomBgmRef.current,
          { shouldPlay: true, isLooping: true, volume: 0.1 },
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
    const playMixdownOnce = async () => {
      try {
        const currentSound = mixdownSoundRef.current;
        if (currentSound) {
          const status = await currentSound.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            return;
          }
          try { await currentSound.unloadAsync(); } catch {}
          if (mixdownSoundRef.current === currentSound) {
            mixdownSoundRef.current = null;
          }
        }

        const { sound } = await Audio.Sound.createAsync(
          DARKROOM_MIXDOWN_BGM,
          { shouldPlay: true, isLooping: false, volume: 0.12 },
        );

        mixdownSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded || !status.didJustFinish) return;
          void (async () => {
            if (mixdownSoundRef.current === sound) {
              mixdownSoundRef.current = null;
            }
            try { await sound.unloadAsync(); } catch {}
          })();
        });
      } catch (error) {
        console.warn('Mixdownの再生に失敗しました', error);
      }
    };

    if (!shouldPlayWaterSound) {
      void stopAndUnloadMixdownSound();
      return;
    }

    void playMixdownOnce();

    if (mixdownTimerRef.current) {
      clearInterval(mixdownTimerRef.current);
    }
    mixdownTimerRef.current = setInterval(() => {
      void playMixdownOnce();
    }, DARKROOM_MIXDOWN_INTERVAL_MS);

    return () => {
      if (mixdownTimerRef.current) {
        clearInterval(mixdownTimerRef.current);
        mixdownTimerRef.current = null;
      }
    };
  }, [shouldPlayWaterSound, stopAndUnloadMixdownSound]);

  useEffect(() => {
    if (remainingSeconds === 0 || isSessionCompleted) {
      void stopAndUnloadWaterTouchSound();
    }
  }, [remainingSeconds, isSessionCompleted, stopAndUnloadWaterTouchSound]);

  useEffect(() => {
    if (!isResultModalVisible || resultPhotos.length === 0) return;
    revealProgress.setValue(0);
    Animated.timing(revealProgress, {
      toValue: 1,
      duration: 1700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isResultModalVisible, resultPhotos.length, revealProgress]);

  const handleStartNextDeveloping = useCallback(() => {
    if (isFinishingSession) return;

    void (async () => {
      try {
        setIsPreparing(true);
        const undeveloped = await getUndevelopedPhotosOldest(MAX_DEVELOPING_BATCH);

        if (undeveloped.length === 0) {
          setDevelopingPhotos([]);
          setIsSessionStarted(false);
          setIsSessionCompleted(false);
          setResultPhotos([]);
          setIsResultModalVisible(false);
          setRemainingSeconds(SESSION_SECONDS);
          setCompletionMessage('現像対象の写真がありません');
          await refreshPhotoCounts();
          return;
        }

        const nextPhotos = await toDevelopingPhotos(undeveloped);

        setDevelopingPhotos(nextPhotos);
        setIsSessionCompleted(false);
        setIsPaused(false);
        setRemainingSeconds(SESSION_SECONDS);
        setCompletionMessage('');
        setResultPhotos([]);
        setIsResultModalVisible(false);
        finalizedSessionRef.current = false;

        const startedIds = await ensureQueuedPhotosStarted(nextPhotos.map((item) => item.id));
        setDevelopingPhotos((prev) => prev.filter((item) => startedIds.includes(item.id)));
        setIsSessionStarted(startedIds.length > 0);
                
        setPreviewIndex(0);

        
        await refreshPhotoCounts();
      } catch (error) {
        console.log('failed to start next developing session', error);
      } finally {
        setIsPreparing(false);
      }
    })();
  }, [ensureQueuedPhotosStarted, isFinishingSession, refreshPhotoCounts, toDevelopingPhotos]);

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

  return (
    <SafeAreaView style={albumStyles.container} {...swipePanResponder.panHandlers}>
      <View style={albumStyles.topBar}>
        {DISPLAY_FILMS.map((type) => {
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
                      fontSize: 44,           
                      fontWeight: 'normal',   
                      color: '#D41414', 
                      letterSpacing: 2, 
                      marginBottom: 24,
                      fontFamily: 'DSEG7Classic-Regular', 
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

              {(!isFinishingSession && completionMessage.length > 0) && (
                <Text style={[darkroomStyles.infoValue, { marginBottom: 24, color: '#C5B7B7' }]}>
                  {completionMessage}
                </Text>
              )}

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
                  <>
                    <TouchableOpacity style={albumStyles.dashboardBtn} onPress={() => onGoAlbum?.()}>
                      <Text style={darkroomStyles.actionBtnText}>CHECK ALBUM</Text>
                    </TouchableOpacity>
                    {activePhoto && (
                      <TouchableOpacity style={albumStyles.dashboardBtn} onPress={handleStartNextDeveloping}>
                        <Text style={darkroomStyles.actionBtnText}>START DEVELOPING</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={[albumStyles.rightPanel, darkroomStyles.darkroomRightPanel]} onLayout={(e) => setRightPanelDim(e.nativeEvent.layout)}>
          {rightPanelDim.width > 0 ? (
            <View style={darkroomStyles.fullscreenContent}>
              {developingPhotos.length > 0 ? (
                <FlatList
                  horizontal
                  pagingEnabled
                  data={developingPhotos}
                  keyExtractor={(item) => item.id.toString()}
                  style={darkroomStyles.fullscreenSkiaWrap}
                  showsHorizontalScrollIndicator={false}
                  initialNumToRender={1}
                  maxToRenderPerBatch={2}
                  windowSize={2}
                  removeClippedSubviews
                  decelerationRate="fast"
                  onMomentumScrollEnd={(event) => {
                    const pageWidth = rightPanelDim.width || 1;
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
                    setPreviewIndex(Math.max(0, Math.min(nextIndex, developingPhotos.length - 1)));
                  }}
                  renderItem={({ item, index }) => (
                    <View style={{ width: rightPanelDim.width, height: rightPanelDim.height }}>
                      <DarkroomSkiaView
                        photoUri={item.previewUri ?? item.uri}
                        width={rightPanelDim.width}
                        height={rightPanelDim.height}
                        useNativeRipple={useNativeRipple}
                        onWaterTouch={() => {
                          if (!isSessionCompleted && remainingSeconds > 0 && isSessionStarted && !isFinishingSession && index === previewIndex) {
                            void playWaterTouchSound();
                          }
                        }}
                      />
                    </View>
                  )}
                />
              ) : (
                <View style={darkroomStyles.fullscreenSkiaWrap}>
                  <DarkroomSkiaView
                    photoUri={null}
                    width={rightPanelDim.width}
                    height={rightPanelDim.height}
                    useNativeRipple={useNativeRipple}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={darkroomStyles.emptyBackground}>
              <ActivityIndicator color="#6cae75" />
            </View>
          )}
        </View>
      </View>

      {(isResultModalVisible && resultPhotos.length > 0) && (
        <View style={darkroomStyles.resultModalBackdrop}>
          <View style={darkroomStyles.resultModalCard}>
            <View style={darkroomStyles.resultHeader}>
              <Text style={darkroomStyles.resultHeaderText}>SUCCESSFULLY DEVELOPED!</Text>
            </View>

            <ScrollView style={darkroomStyles.resultBodyScroll} contentContainerStyle={darkroomStyles.resultBodyContent}>
              {resultPhotos.map((item, index) => (
                <View key={item.id} style={darkroomStyles.resultItemCard}>
                  <Text style={darkroomStyles.resultItemTitle}>RESULT #{index + 1}</Text>
                  <View style={darkroomStyles.resultComparisonRow}>
                    <View style={darkroomStyles.resultColumn}>
                      <Text style={darkroomStyles.resultColumnTitle}>BEFORE</Text>
                      <View style={[darkroomStyles.resultImageFrame, { aspectRatio: item.aspectRatio }]}>
                        <Image source={{ uri: item.beforeUri }} resizeMode="contain" style={darkroomStyles.resultImage} />
                      </View>
                    </View>

                    <View style={darkroomStyles.resultArrowWrap}>
                      <Text style={darkroomStyles.resultArrowText}>→</Text>
                    </View>

                    <View style={darkroomStyles.resultColumn}>
                      <Text style={darkroomStyles.resultColumnTitle}>AFTER</Text>
                      <View style={[darkroomStyles.resultImageFrame, { aspectRatio: item.aspectRatio }]}>
                        <Image source={{ uri: item.afterUri }} resizeMode="contain" style={darkroomStyles.resultImage} />
                        <Animated.Image
                          source={{ uri: item.afterUri }}
                          resizeMode="contain"
                          blurRadius={10}
                          style={[
                            darkroomStyles.resultImageOverlay,
                            {
                              opacity: revealProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0],
                              }),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={darkroomStyles.resultFooter}>
              <Pressable style={darkroomStyles.resultCloseButton} onPress={() => setIsResultModalVisible(false)}>
                <Text style={darkroomStyles.resultCloseButtonText}>CLOSE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};