import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; //reactのコンポーネントをインポート
import { Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, AppState} from 'react-native'; //react nativeのコンポーネントをインポート
import { Audio } from 'expo-av'; //expoのAudioをインポート
import { getPhotosByStatus, updatePhotoStatus } from '../utils/sqlite';
import * as MediaLibrary from 'expo-media-library';
import { Modal } from 'react-native';

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
const INITIAL_SECONDS = 10;

// 現像処理の画面コンポーネント
export const DarkroomScreen: React.FC<DarkroomScreenProps> = ({ onBack, photo }) => {
  const [developingPhoto, setDevelopingPhoto] = useState<DarkroomScreenProps['photo']>(photo);
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_SECONDS);
  const hasShownSuccessAlert = useRef(false);
  const hasUpdatedStatus = useRef(false);
  const waterSoundRef = useRef<Audio.Sound | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let isActive = true; // クリーンアップのためのフラグ

    const resolveDevelopingPhoto = async () => {
      if (photo) {
        setDevelopingPhoto(photo);
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
      Alert.alert("現像失敗", "アプリを離れたため現像が中断されました");
      onBack(); // ホーム画面へ戻る
    }
  });

  return () => subscription.remove();
  }, [onBack]);

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

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [developingPhoto]);

  useEffect(() => {
    if (remainingSeconds === 0 && !hasShownSuccessAlert.current) {
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
          onPress: () => setShowModal(true), // ← ポップアップを開く
        },
      ]);

    }
  }, [developingPhoto, remainingSeconds, stopAndUnloadWaterSound]);

  const displayTime = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, '0'))
      .join(':');
  }, [remainingSeconds]);

  const handleBackPress = () => {
    Alert.alert(
      '暗室を終了',
      '暗室を出るとタイマーはリセットされます。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '戻る', style: 'destructive', onPress: onBack },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />

      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.pendingWrap}>
        <Text style={styles.pendingTitle}>現像待ちの写真</Text>
        {developingPhoto ? (
          <Image source={{ uri: developingPhoto.uri }} style={styles.pendingPhoto} />
        ) : (
          <Text style={styles.pendingEmpty}>現像対象の写真がありません</Text>
        )}
      </View>

      <View style={styles.timerWrap}>
        <Text style={styles.timerLabel}>DEVELOPING</Text>
        <Text style={styles.timerText}>{displayTime}</Text>
      </View>
      
      {/* ▼▼ デバッグ用フィルム追加パネル ▼▼ */}
<View style={{ marginTop: 30, padding: 16, backgroundColor: '#222', borderRadius: 12 }}>
  <Text style={{ color: '#fff', fontSize: 16, marginBottom: 12, fontWeight: '700' }}>
    🎞 デバッグ：フィルム追加
  </Text>

  {(['mono', 'vivid', 'retro'] as const).map((type) => (
    <TouchableOpacity
      key={type}
      style={{
        backgroundColor: '#444',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
      }}
      onPress={async () => {
        const { addFilm } = require('../utils/sqlite');
        const { FILM_META } = require('../types');
        const meta = FILM_META[type];

        await addFilm(type);
        Alert.alert('フィルム追加', `${meta.emoji} ${meta.label} を追加しました！`);
      }}
    >
      <Text style={{ color: '#fff', fontSize: 15 }}>
        {type === 'mono' && '⚫ モノクロを追加'}
        {type === 'vivid' && '🌈 ビビッドを追加'}
        {type === 'retro' && '📼 レトロを追加'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
{/* ▲▲ デバッグ用フィルム追加パネル ▲▲ */}

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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
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
});
