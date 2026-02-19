import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; //reactのコンポーネントをインポート
import { ActivityIndicator, Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, AppState, Platform, BackHandler } from 'react-native'; //react nativeのコンポーネントをインポート
import { Audio } from 'expo-av'; //expoのAudioをインポート
import { getFilmEffectTypeById, getPhotosByStatus, updatePhotoStatus, updatePhotoUri } from '../utils/sqlite';
import * as MediaLibrary from 'expo-media-library';
import { Modal } from 'react-native';
import { applyFilmEffectToPhoto } from '../utils/photoEffects';
import { BlurView } from 'expo-blur';

// 現像処理の画面
interface DarkroomScreenProps {
  onBack: () => void;
  photo: {
    id: number;
    uri: string;
    filmId: number;
  } | null;
}

// 現像に必要な時間（秒）[初期値=1時間] - 開発中は短くしてもOK
const INITIAL_SECONDS = 60;

// 現像処理の画面コンポーネント
export const DarkroomScreen: React.FC<DarkroomScreenProps> = ({ onBack, photo }) => {
  const [developingPhoto, setDevelopingPhoto] = useState<DarkroomScreenProps['photo']>(photo);
  const [isPreparing, setIsPreparing] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_SECONDS);
  const hasShownSuccessAlert = useRef(false);
  const hasUpdatedStatus = useRef(false);
  const waterSoundRef = useRef<Audio.Sound | null>(null);
  const cancelProcessingRef = useRef(false);
  const isLeavingDarkroomRef = useRef(false);
  const pausedStartedAtRef = useRef<number | null>(null);
  const pausedAccumulatedMsRef = useRef(0);
  const [showModal, setShowModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isProcessingFilter, setIsProcessingFilter] = useState(false);
  const [isFilterProcessingDone, setIsFilterProcessingDone] = useState(false);

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

  const leaveDarkroom = useCallback(() => {
    isLeavingDarkroomRef.current = true;
    cancelProcessingRef.current = true;
    hasShownSuccessAlert.current = true;
    hasUpdatedStatus.current = true;
    setShowExitConfirmModal(false);
    setIsProcessingFilter(false);
    void stopAndUnloadWaterSound();
    onBack();
  }, [onBack, stopAndUnloadWaterSound]);

  useEffect(() => {
    let isActive = true; // クリーンアップのためのフラグ
    setIsPreparing(true);

    const resolveDevelopingPhoto = async () => {
      if (photo) {
        setDevelopingPhoto(photo);
        if (isActive) {
          setIsPreparing(false);
        }
        return;
      }

      try {
        const undeveloped = await getPhotosByStatus('undeveloped');
        if (!isActive) {
          return;
        }

        if (undeveloped.length > 0) {
          const latest = undeveloped[0];
          setDevelopingPhoto({
            id: latest.id,
            uri: latest.uri,
            filmId: latest.film_id,
          });
        } else {
          setDevelopingPhoto(null);
        }
      } catch (error) {
        console.log('failed to load undeveloped photo', error);
      } finally {
        if (isActive) {
          setIsPreparing(false);
        }
      }
    };

    void resolveDevelopingPhoto();

    return () => {
      isActive = false;
    };
  }, [photo]);

  // アプリがバックグラウンドに移行した場合の処理
  useEffect(() => {
    let wasBackground = false; // アプリがバックグラウンドに移行したかどうかのフラグ

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        wasBackground = true;
      }

      if (nextState === "active" && wasBackground) {
        wasBackground = false;
        if (isLeavingDarkroomRef.current) {
          return;
        }

        Alert.alert("現像失敗", "アプリを離れたため現像が中断されました");
        leaveDarkroom();
      }
    });

    return () => subscription.remove();
  }, [leaveDarkroom]);

  const handleSave = async () => {
    if (!developingPhoto) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("保存できません", "写真へのアクセス権限がありません");
      return;
    }

    try {
      await MediaLibrary.saveToLibraryAsync(developingPhoto.uri);
      Alert.alert("保存完了", "写真をカメラロールに保存しました");
    } catch (error) {
      Alert.alert("保存エラー", "写真の保存に失敗しました");
    }
  };

  useEffect(() => {
    let isActive = true;

    const startWaterASMR = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/water_asmr.mp3'),
          {
            shouldPlay: true,
            isLooping: true,
          },
        );

        if (!isActive) {
          await sound.unloadAsync();
          return;
        }

        waterSoundRef.current = sound;
      } catch (error) {
        console.warn('水音ASMRの再生開始に失敗しました', error);
      }
    };

    void startWaterASMR();

    return () => {
      isActive = false;
      void stopAndUnloadWaterSound();
    };
  }, [stopAndUnloadWaterSound]);

  useEffect(() => {
    if (!developingPhoto) {
      return;
    }

    const startedAt = Date.now();
    pausedStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;

    setRemainingSeconds(INITIAL_SECONDS);

    const timer = setInterval(() => {
      const pausedMs = pausedAccumulatedMsRef.current
        + (pausedStartedAtRef.current ? Date.now() - pausedStartedAtRef.current : 0);
      const elapsed = Math.floor((Date.now() - startedAt - pausedMs) / 1000);
      const next = Math.max(0, INITIAL_SECONDS - elapsed);
      setRemainingSeconds(next);
    }, 250);

    return () => clearInterval(timer);
  }, [developingPhoto?.id]);

  useEffect(() => {
    if (!developingPhoto) {
      return;
    }

    if (showExitConfirmModal) {
      if (!pausedStartedAtRef.current) {
        pausedStartedAtRef.current = Date.now();
      }
      return;
    }

    if (pausedStartedAtRef.current) {
      pausedAccumulatedMsRef.current += Date.now() - pausedStartedAtRef.current;
      pausedStartedAtRef.current = null;
    }
  }, [developingPhoto, showExitConfirmModal]);

  useEffect(() => {
    if (!developingPhoto) {
      setIsFilterProcessingDone(true);
      setIsProcessingFilter(false);
      return;
    }

    const targetPhoto = developingPhoto;

    let cancelled = false;
    cancelProcessingRef.current = false;

    setIsProcessingFilter(true);
    setIsFilterProcessingDone(false);

    void (async () => {
      try {
        const effectType = await getFilmEffectTypeById(targetPhoto.filmId);
        const processedUri = await applyFilmEffectToPhoto(targetPhoto.uri, effectType, {
          shouldCancel: () => cancelled || cancelProcessingRef.current || isLeavingDarkroomRef.current,
        });

        if (cancelled || isLeavingDarkroomRef.current) {
          return;
        }

        if (processedUri !== targetPhoto.uri) {
          await updatePhotoUri(targetPhoto.id, processedUri);
          if (!cancelled && !isLeavingDarkroomRef.current) {
            setDevelopingPhoto((prev) => {
              if (!prev || prev.id !== targetPhoto.id) {
                return prev;
              }
              return { ...prev, uri: processedUri };
            });
          }
        }
      } catch (error) {
        console.log('failed to process photo in darkroom', error);
      } finally {
        if (!cancelled && !isLeavingDarkroomRef.current) {
          setIsFilterProcessingDone(true);
          setIsProcessingFilter(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelProcessingRef.current = true;
    };
  }, [developingPhoto?.id]);

  useEffect(() => {
    if (isLeavingDarkroomRef.current) {
      return;
    }

    if (remainingSeconds === 0 && isFilterProcessingDone && !hasShownSuccessAlert.current) {
      void stopAndUnloadWaterSound();
      hasShownSuccessAlert.current = true;
      if (developingPhoto && !hasUpdatedStatus.current) {
        hasUpdatedStatus.current = true;
        void updatePhotoStatus(developingPhoto.id, 'developed').catch((error) => {
          console.log('failed to update photo status', error);
        });
      }
      Alert.alert('現像完了', '現像に成功しました！', [
        {
          text: "OK",
          onPress: () => setShowModal(true),
        },
      ]);

    }
  }, [developingPhoto, isFilterProcessingDone, remainingSeconds, stopAndUnloadWaterSound]);

  const displayTime = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, '0'))
      .join(':');
  }, [remainingSeconds]);

  const shouldMaskPendingPhoto =
    !!developingPhoto &&
    (remainingSeconds > 0 || isProcessingFilter || !isFilterProcessingDone);

  const canShowBackButton =
    !isPreparing &&
    !showModal &&
    !showExitConfirmModal &&
    !isLeavingDarkroomRef.current;

  const handleBackPress = () => {
    setShowExitConfirmModal(true);
  };

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

      {canShowBackButton && (
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}

      <View style={styles.pendingWrap}>
        <Text style={styles.pendingTitle}>現像待ちの写真</Text>
        {developingPhoto ? (
          <View style={styles.pendingPhotoWrap}>
            <Image source={{ uri: developingPhoto.uri }} style={styles.pendingPhoto} />
            {shouldMaskPendingPhoto && (
              <BlurView
                intensity={56}
                tint="dark"
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={styles.pendingPhotoMosaic}
              />
            )}
          </View>
        ) : (
          <Text style={styles.pendingEmpty}>現像対象の写真がありません</Text>
        )}
      </View>

      <View style={styles.timerWrap}>
        <Text style={styles.timerLabel}>DEVELOPING</Text>
        <Text style={styles.timerText}>{displayTime}</Text>
        {developingPhoto && isProcessingFilter && <Text style={styles.processingText}>フィルム処理中...</Text>}
        {developingPhoto && remainingSeconds === 0 && !isFilterProcessingDone && <Text style={styles.processingText}>現像仕上げ中...</Text>}
        {developingPhoto && !isProcessingFilter && isFilterProcessingDone && <Text style={styles.processingText}>フィルム処理完了</Text>}
      </View>

      <Modal
  visible={showModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>現像された写真</Text>

      {developingPhoto && (
        <Image
          source={{ uri: developingPhoto.uri }}
          style={styles.modalImage}
        />
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存する</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {setShowModal(false); onBack();}}
      >
        <Text style={styles.closeButtonText}>閉じる</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

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
              {isProcessingFilter
                ? 'フィルム処理を中断して暗室を出ます。よろしいですか？'
                : '暗室を出るとタイマーはリセットされます。よろしいですか？'}
            </Text>

            <TouchableOpacity
              style={[styles.saveButton, styles.exitConfirmDangerButton]}
              onPress={leaveDarkroom}
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

// スタイル定義
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 90,
  },
  glowLarge: {
    position: 'absolute',
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: 'rgba(139, 0, 0, 0.16)',
    top: -140,
    right: -180,
  },
  glowSmall: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(139, 0, 0, 0.12)',
    bottom: -90,
    left: -90,
  },
  backButton: {
    position: 'absolute',
    top: 36,
    left: 20,
    paddingVertical: 12,
    zIndex: 30,
    elevation: 30,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  pendingWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 42,
  },
  pendingTitle: {
    color: '#E8D3D3',
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '700',
  },
  pendingPhoto: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  pendingPhotoWrap: {
    position: 'relative',
    width: 220,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pendingPhotoMosaic: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  pendingEmpty: {
    color: '#C5B7B7',
    fontSize: 13,
  },
  timerWrap: {
    alignItems: 'center',
  },
  timerLabel: {
    color: '#8B0000',
    fontSize: 13,
    letterSpacing: 3,
    marginBottom: 14,
    fontWeight: '600',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  processingText: {
    marginTop: 10,
    color: '#C5B7B7',
    fontSize: 12,
    letterSpacing: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#E8D3D3',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },

  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.7)",
  justifyContent: "center",
  alignItems: "center",
},
modalContent: {
  backgroundColor: "#1a1a1a",
  padding: 20,
  borderRadius: 12,
  alignItems: "center",
  width: "80%",
},
modalTitle: {
  color: "#fff",
  fontSize: 18,
  marginBottom: 12,
  fontWeight: "700",
},
modalImage: {
  width: 240,
  height: 240,
  borderRadius: 12,
  marginBottom: 20,
},
saveButton: {
  backgroundColor: "#8B0000",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
  marginBottom: 12,
},
saveButtonText: {
  color: "#fff",
  fontWeight: "700",
},
closeButton: {
  paddingVertical: 8,
  paddingHorizontal: 20,
},
closeButtonText: {
  color: "#ccc",
},
exitConfirmMessage: {
  color: '#E8D3D3',
  fontSize: 14,
  textAlign: 'center',
  marginBottom: 20,
  lineHeight: 20,
},
exitConfirmDangerButton: {
  marginBottom: 10,
},
});
