import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import { getPhotosByStatus, updatePhotoStatus } from '../utils/sqlite';

interface DarkroomScreenProps {
  onBack: () => void;
  photo: {
    id: number;
    uri: string;
    filmId: number;
  } | null;
}

const INITIAL_SECONDS = 60 * 60;

export const DarkroomScreen: React.FC<DarkroomScreenProps> = ({ onBack, photo }) => {
  const [developingPhoto, setDevelopingPhoto] = useState<DarkroomScreenProps['photo']>(photo);
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_SECONDS);
  const hasShownSuccessAlert = useRef(false);
  const hasUpdatedStatus = useRef(false);
  const waterSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isActive = true;

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
      Alert.alert('現像完了', '現像に成功しました！');
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
        <Text style={styles.backButtonText}>← 戻る</Text>
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
    </SafeAreaView>
  );
};

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
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(20, 0, 0, 0.55)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
});
