import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, Modal, Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av'; //expoのAudioをインポート
import { completeDevelopingSession, failDevelopingSession, getDevelopingPhotos, getFilmEffectTypeById, getUndevelopedPhotosOldest, startDevelopingSession, updatePhotoUri } from '../utils/sqlite';
import { applyFilmEffectToPhoto } from '../utils/photoEffects';
import { BlurView } from 'expo-blur';
import { styles } from '../styles/DarkroomScreen.styles';

// 現像処理の画面
interface DarkroomScreenProps {
  onBack: () => void;
  photo: {
    id: number;
    uri: string;
    filmId: number;
  } | null;
}

const SESSION_SECONDS = 5;
const MAX_SLOTS = 5;

interface DevelopingPhoto {
  id: number;
  uri: string;
  filmId: number;
  developingStartedAt: string | null;
}

const parseDbDateMs = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const direct = new Date(normalized).getTime();
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const fallback = new Date(`${normalized}Z`).getTime();
  return Number.isNaN(fallback) ? null : fallback;
};

// 現像処理の画面コンポーネント
export const DarkroomScreen: React.FC<DarkroomScreenProps> = ({ onBack, photo }) => {
  const [developingPhotos, setDevelopingPhotos] = useState<DevelopingPhoto[]>([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS);
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const waterSoundRef = useRef<Audio.Sound | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const cancelProcessingRef = useRef(false);
  const finalizedSessionRef = useRef(false);

  const stopAndUnloadWaterSound = useCallback(async () => {
    const currentSound = waterSoundRef.current;

    if (!currentSound) {
      return;
    }

    waterSoundRef.current = null;

    try {
      await currentSound.stopAsync();
    } catch {
      // no-op
    }

    try {
      await currentSound.unloadAsync();
    } catch {
      // no-op
    }
  }, []);

  const mapRowsToDevelopingPhotos = useCallback((rows: Awaited<ReturnType<typeof getDevelopingPhotos>>): DevelopingPhoto[] => {
    return rows.slice(0, MAX_SLOTS).map((row) => ({
      id: row.id,
      uri: row.uri,
      filmId: row.film_id,
      developingStartedAt: row.developing_started_at ?? null,
    }));
  }, []);

  const runPhotoEffects = useCallback(async (rows: DevelopingPhoto[]) => {
    cancelProcessingRef.current = false;

    for (const targetPhoto of rows) {
      if (cancelProcessingRef.current) {
        return;
      }

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

        if (cancelProcessingRef.current) {
          return;
        }

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
    if (finalizedSessionRef.current || rows.length === 0) {
      return;
    }

    finalizedSessionRef.current = true;
    setIsFinishingSession(true);

    try {
      await runPhotoEffects(rows);
      await completeDevelopingSession(rows.map((item) => item.id));
      setRemainingSeconds(0);
      setCompletionMessage('現像が完了しました。アルバムを確認してください');
      setIsSessionCompleted(true);
    } catch (error) {
      console.log('failed to finalize developing session', error);
    } finally {
      setIsFinishingSession(false);
      await stopAndUnloadWaterSound();
    }
  }, [runPhotoEffects, stopAndUnloadWaterSound]);

  const computeRemainingSeconds = useCallback((startedAtMs: number): number => {
    const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
    return Math.max(0, SESSION_SECONDS - elapsed);
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsPreparing(true);
    setIsSessionCompleted(false);
    setCompletionMessage('');
    finalizedSessionRef.current = false;

    const loadSession = async () => {
      try {
        let developing = await getDevelopingPhotos();

        if (developing.length === 0) {
          const undeveloped = await getUndevelopedPhotosOldest(80);
          const ordered = [...undeveloped];

          if (photo) {
            const selectedIndex = ordered.findIndex((item) => item.id === photo.id);
            if (selectedIndex > 0) {
              const [selected] = ordered.splice(selectedIndex, 1);
              ordered.unshift(selected);
            }
          }

          const pickedIds = ordered.slice(0, MAX_SLOTS).map((item) => item.id);
          if (pickedIds.length > 0) {
            await startDevelopingSession(pickedIds);
            developing = await getDevelopingPhotos();
          }
        }

        if (!isActive) {
          return;
        }

        const sessionRows = mapRowsToDevelopingPhotos(developing);
        setDevelopingPhotos(sessionRows);

        if (sessionRows.length === 0) {
          setSessionStartedAtMs(null);
          setRemainingSeconds(0);
          setCompletionMessage('現像対象の写真がありません');
          return;
        }

        const firstStart = sessionRows
          .map((item) => parseDbDateMs(item.developingStartedAt))
          .filter((value): value is number => value !== null)
          .sort((left, right) => left - right)[0] ?? Date.now();

        setSessionStartedAtMs(firstStart);
        const nextRemaining = computeRemainingSeconds(firstStart);
        setRemainingSeconds(nextRemaining);

        if (nextRemaining === 0) {
          void finalizeSession(sessionRows);
        }
      } catch (error) {
        console.log('failed to load darkroom session', error);
      } finally {
        if (isActive) {
          setIsPreparing(false);
        }
      }
    };

    void loadSession();

    return () => {
      isActive = false;
    };
  }, [computeRemainingSeconds, finalizeSession, mapRowsToDevelopingPhotos, photo]);

  useEffect(() => {
    if (!sessionStartedAtMs || isSessionCompleted) {
      return;
    }

    const timer = setInterval(() => {
      const next = computeRemainingSeconds(sessionStartedAtMs);
      setRemainingSeconds(next);
    }, 1000);

    return () => clearInterval(timer);
  }, [computeRemainingSeconds, isSessionCompleted, sessionStartedAtMs]);

  useEffect(() => {
    if (remainingSeconds > 0 || isSessionCompleted || isFinishingSession || developingPhotos.length === 0) {
      return;
    }

    void finalizeSession(developingPhotos);
  }, [developingPhotos, finalizeSession, isFinishingSession, isSessionCompleted, remainingSeconds]);

  const shouldPlayWaterSound = developingPhotos.length > 0 && remainingSeconds > 0 && !isSessionCompleted;

  useEffect(() => {
    let isMounted = true;

    const syncWaterSound = async () => {
      if (!shouldPlayWaterSound) {
        await stopAndUnloadWaterSound();
        return;
      }

      if (waterSoundRef.current) {
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/water_asmr.mp3'),
          {
            shouldPlay: true,
            isLooping: true,
          },
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        waterSoundRef.current = sound;
      } catch (error) {
        console.warn('水音ASMRの再生開始に失敗しました', error);
      }
    };

    void syncWaterSound();

    return () => {
      isMounted = false;
    };
  }, [shouldPlayWaterSound, stopAndUnloadWaterSound]);

  const displayTime = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, '0'))
      .join(':');
  }, [remainingSeconds]);

  const slots = useMemo(() => {
    const items: Array<DevelopingPhoto | null> = [...developingPhotos];
    while (items.length < MAX_SLOTS) {
      items.push(null);
    }
    return items;
  }, [developingPhotos]);

  const canShowBackButton =
    !isPreparing &&
    !showExitConfirmModal &&
    !isFinishingSession;

  const handleBackPress = () => {
    setShowExitConfirmModal(true);
  };

  const handleConfirmExit = useCallback(() => {
    const developingIds = developingPhotos.map((item) => item.id);
    cancelProcessingRef.current = true;
    setShowExitConfirmModal(false);

    void (async () => {
      if (developingIds.length > 0 && remainingSeconds > 0 && !isSessionCompleted) {
        await failDevelopingSession(developingIds).catch((error) => {
          console.log('failed to rollback developing session', error);
        });
      }
      await stopAndUnloadWaterSound();
      onBack();
    })();
  }, [developingPhotos, isSessionCompleted, onBack, remainingSeconds, stopAndUnloadWaterSound]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canShowBackButton) {
        handleBackPress();
      }
      return true;
    });

    return () => subscription.remove();
  }, [canShowBackButton]);

  useEffect(() => {
    return () => {
      cancelProcessingRef.current = true;
      void stopAndUnloadWaterSound();
    };
  }, [stopAndUnloadWaterSound]);

  const renderSlot = (slot: DevelopingPhoto | null, index: number) => {
    if (!slot) {
      return (
        <View key={`empty-${index}`} style={styles.slotCard}>
          <View style={styles.emptySlot}>
            <Text style={styles.emptySlotTitle}>Empty</Text>
            <Text style={styles.emptySlotSub}>空きスロット</Text>
          </View>
        </View>
      );
    }

    const isMaskVisible = !isSessionCompleted && remainingSeconds > 0;

    return (
      <View key={slot.id} style={styles.slotCard}>
        <View style={styles.slotImageWrap}>
          <Image source={{ uri: slot.uri }} style={styles.slotImage} />
          {isMaskVisible && (
            <BlurView
              intensity={56}
              tint="dark"
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
              style={styles.slotBlur}
            />
          )}
        </View>
        <Text style={styles.slotStatus}>{isMaskVisible ? '現像中' : '現像完了'}</Text>
      </View>
    );
  };

  if (isPreparing) {
    return (
      <SafeAreaView style={styles.container}>
        <View pointerEvents="none" style={styles.glowLarge} />
        <View pointerEvents="none" style={styles.glowSmall} />

        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={styles.loadingText}>暗室を準備中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.glowLarge} />
      <View pointerEvents="none" style={styles.glowSmall} />

      <View style={styles.mainContent}>
        {canShowBackButton && (
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}

        <View style={styles.slotsWrap}>
          <Text style={styles.pendingTitle}>現像タンク（最大5）</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={215}
            contentContainerStyle={styles.slotsScrollContent}
            style={styles.slotsScroll}
          >
            {slots.map(renderSlot)}
          </ScrollView>
        </View>

        <View style={styles.timerWrap}>
          <Text style={styles.timerLabel}>DARKROOM SESSION</Text>
          <Text style={styles.timerText}>{displayTime}</Text>
          {isFinishingSession && <Text style={styles.processingText}>現像仕上げ中...</Text>}
          {!isFinishingSession && completionMessage.length > 0 && <Text style={styles.processingText}>{completionMessage}</Text>}
        </View>
      </View>

      <Modal
        visible={showExitConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>暗室を終了</Text>
            <Text style={styles.exitConfirmMessage}>
              今暗室を出ると光が入ってしまい、現像中の写真はすべて失敗します。本当に出ますか？
            </Text>

            <TouchableOpacity
              style={[styles.saveButton, styles.exitConfirmDangerButton]}
              onPress={handleConfirmExit}
            >
              <Text style={styles.saveButtonText}>終了する</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowExitConfirmModal(false)}
            >
              <Text style={styles.closeButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


