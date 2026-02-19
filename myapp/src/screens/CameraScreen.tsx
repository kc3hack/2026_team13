import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation'; // ★ 画面回転用
import { consumeFilm, addPhoto } from '../utils/sqlite';

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
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 100 }}>カメラ権限が必要です</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  backButton: { 
    position: 'absolute', 
    top: 20, 
    left: 40, 
    zIndex: 10 
  },
  backButtonText: { 
    color: '#ff4444', 
    fontFamily: 'Courier', 
    fontWeight: 'bold',
    fontSize: 16 
  },
  
  dashboard: {
    flex: 1.2,
    paddingLeft: 40,
    justifyContent: 'center',
  },
  systemText: {
    color: '#00ff00',
    fontFamily: 'Courier',
    fontSize: 14,
    marginBottom: 20,
    letterSpacing: 1,
  },
  instruments: {
    gap: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 30,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 10,
  },
  label: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 12,
    marginBottom: 5,
  },
  valueHighlight: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: 'bold',
  },
  valueText: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: 16,
    width: 45,
    textAlign: 'center',
  },
  dashboardBtn: {
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  btnText: {
    color: '#ccc',
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  cameraRig: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 40,
  },

  previewContainer: {
    width: 240,
    height: 180,
    borderWidth: 2,
    borderColor: '#333',
    borderRightWidth: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  camera: {
    flex: 1,
  },
  crosshairVertical: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  crosshairHorizontal: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  recDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },

  grip: {
    width: 80,
    height: 180,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  shutterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff4444',
  },
});