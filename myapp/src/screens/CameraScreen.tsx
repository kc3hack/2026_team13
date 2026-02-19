import { useState, useRef, useEffect } from 'react';
import { Text, View, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation'; // ★ 画面回転用
import { consumeFilm, addPhoto } from '../utils/sqlite';
import { styles } from '../styles/CameraScreen.styles';

interface CameraScreenProps {
    filmType?: string;
    filmId?: number;
    onBack: () => void;
    onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ filmType, filmId, onBack, onGoDarkroom }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isShooting, setIsShooting] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>カメラ権限が必要です</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.dashboardBtn}>
          <Text style={styles.btnText}>許可</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleZoom = (increment: boolean) => {
    setZoom((prev) => Math.max(0, Math.min(increment ? prev + 0.1 : prev - 0.1, 1)));
    Haptics.selectionAsync();
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const takePicture = async () => {
    if (!cameraRef.current || isShooting) return;

    try {
      setIsShooting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const photoData = await cameraRef.current.takePictureAsync();
      
      if (photoData && photoData.uri && filmId && filmType) {
        const consumed = await consumeFilm(filmType as any);
        if (!consumed) {
           Alert.alert('エラー', 'フィルムが不足しています');
           onBack();
           return;
        }

        const photoId = await addPhoto(photoData.uri, filmId, 'undeveloped');
        
        Alert.alert('撮影完了', '今すぐ暗室（現像）に行きますか？', [
          { text: 'まだ撮る', style: 'cancel' },
          { text: '暗室へ', onPress: () => onGoDarkroom({ id: photoId, uri: photoData.uri, filmId: filmId }) }
        ]);
      }
    } catch (error) {
      console.log("撮影エラー:", error);
      Alert.alert('エラー', '写真の保存に失敗しました');
    } finally {
      setIsShooting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>{'< ABORT'}</Text>
      </TouchableOpacity>

      <View style={styles.mainLayout}>
        <View style={styles.dashboard}>
          <Text style={styles.systemText}>DEVIT // SYSTEM_READY</Text>
          
          <View style={styles.instruments}>
            <Text style={styles.label}>[ FILM_TYPE ]</Text>
            <Text style={styles.valueHighlight}>{filmType ? filmType.toUpperCase() : 'UNKNOWN'}</Text>
            
            <View style={styles.row}>
              <View>
                <Text style={styles.label}>[ FLASH ]</Text>
                <TouchableOpacity onPress={toggleFlash} style={styles.dashboardBtn}>
                  <Text style={styles.btnText}>{flash.toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.controlsRow}>
              {/* ZOOM コントロール */}
              <View>
                <Text style={styles.label}>[ ZOOM_LEVEL ]</Text>
                <View style={styles.zoomControls}>
                  <TouchableOpacity onPress={() => handleZoom(false)} style={styles.dashboardBtn}><Text style={styles.btnText}>-</Text></TouchableOpacity>
                  <Text style={styles.valueText}>{(zoom * 10).toFixed(1)}</Text>
                  <TouchableOpacity onPress={() => handleZoom(true)} style={styles.dashboardBtn}><Text style={styles.btnText}>+</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cameraRig}>
          
          <View style={styles.previewContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              zoom={zoom}
              flash={flash}
              ref={cameraRef}
            />
            <View style={styles.crosshairVertical} />
            <View style={styles.crosshairHorizontal} />
            <View style={styles.recDot} />
          </View>

          <View style={styles.grip}>
            <TouchableOpacity 
              style={[styles.shutterButton, isShooting && { borderColor: '#ff4444' }]}
              onPress={takePicture}
              disabled={isShooting}
            >
              <View style={[styles.shutterInner, isShooting && { backgroundColor: '#cc0000' }]} />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

