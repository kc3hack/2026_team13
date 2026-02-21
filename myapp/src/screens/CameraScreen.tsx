import { useState, useRef, useEffect } from 'react';
<<<<<<< HEAD
import { Text, View, TouchableOpacity, SafeAreaView, Alert, PanResponder } from 'react-native';
=======
import { Text, View, TouchableOpacity, SafeAreaView, Alert, PanResponder, Image, ScrollView, useWindowDimensions } from 'react-native';
>>>>>>> 0ef98fab62e64eeda60d510ffc820b2b0eac8cb2
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator'; // 追加
import { consumeFilm, addPhoto, getFilmInventory } from '../utils/sqlite';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FilmInventory, FILM_META, FILM_TYPES, RewardFilmType } from '../types';
import { styles } from '../styles/CameraScreen.styles';
import { ShutterOverlay } from '../components/ShutterOverlay';

const FILM_ID_MAP: Record<RewardFilmType, number> = {
  mono: 11,
  vivid: 12,
  retro: 13,
  disposable: 14,
  soft: 15,
};

interface CameraScreenProps {
    filmType?: string;
    filmId?: number;
    onBack: () => void;
    onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
    onGoAlbum?: () => void;
    onGoDarkroomScreen?: () => void;
    onGoSettings?: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ filmType, filmId, onBack, onGoDarkroom, onGoAlbum, onGoDarkroomScreen, onGoSettings }) => {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isShooting, setIsShooting] = useState(false);
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({
    mono: 0,
    vivid: 0,
    retro: 0,
    disposable: 0,
    soft: 0,
  });
  const [shutterTrigger, setShutterTrigger] = useState(0);
  const [selectedFilm, setSelectedFilm] = useState<RewardFilmType | null>(
    filmType && FILM_TYPES.includes(filmType as RewardFilmType) ? filmType as RewardFilmType : null
  );

  const activeFilmId = selectedFilm ? FILM_ID_MAP[selectedFilm] : null;
  const canShoot = !!selectedFilm && filmInventory[selectedFilm] > 0;

  const topBarLeft = width * 0.42;
  const previewHeight = Math.max(140, Math.min(260, Math.round(height * 0.38)));
  const previewWidth = Math.round(previewHeight * (4 / 3));
  const gripHeight = previewHeight;
  const gripWidth = Math.max(64, Math.min(96, Math.round(previewHeight * 0.42)));
  const shutterButtonSize = Math.max(44, Math.min(64, Math.round(previewHeight * 0.31)));
  const shutterInnerSize = Math.round(shutterButtonSize * 0.78);

  const getFilmDisplayName = (type: RewardFilmType): string => type;
  
  const cameraRef = useRef<CameraView>(null);
  const { checkForCommits } = useGithubCommits();

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

  // Swipe gesture: down → Album, up → Darkroom
  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 30,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 && onGoAlbum) {
          // Swipe down → Album
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onGoAlbum();
        } else if (gestureState.dy < -80 && onGoDarkroomScreen) {
          // Swipe up → Darkroom
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onGoDarkroomScreen();
        }
      },
    })
  ).current;

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
    if (!cameraRef.current || isShooting || !canShoot || !selectedFilm || !activeFilmId) return;

    try {
      setIsShooting(true);
      setShutterTrigger((prev) => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const photoData = await cameraRef.current.takePictureAsync();
      
      if (photoData && photoData.uri) {
        // ── 3:2 クロップ ──────────────────────────────────────
        const { width, height } = photoData;
        const targetHeight = Math.floor(width * (2 / 3));
        const originY = Math.floor((height - targetHeight) / 2);
        const cropped = await ImageManipulator.manipulateAsync(
          photoData.uri,
          [{ crop: { originX: 0, originY, width, height: targetHeight } }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
        const finalUri = cropped.uri;
        // ──────────────────────────────────────────────────────

        const consumed = await consumeFilm(selectedFilm);
        if (!consumed) {
           Alert.alert('エラー', 'フィルムが不足しています');
           const inv = await getFilmInventory();
           setFilmInventory(inv);
           return;
        }

        const inv = await getFilmInventory();
        setFilmInventory(inv);

        const photoId = await addPhoto(finalUri, activeFilmId, 'undeveloped');
        
        Alert.alert('撮影完了', '今すぐ暗室（現像）に行きますか？', [
          { text: 'まだ撮る', style: 'cancel' },
          { text: '暗室へ', onPress: () => onGoDarkroom({ id: photoId, uri: finalUri, filmId: activeFilmId }) }
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
    <SafeAreaView style={styles.container} {...swipePanResponder.panHandlers}>
      {/* Top bar: film inventory + refresh + settings */}
      <View style={[styles.topBar, { left: topBarLeft }]}>
        {FILM_TYPES.map((type) => {
          const meta = FILM_META[type];
          return (
            <View key={type} style={styles.filmBadge}>
              <Text style={styles.filmBadgeEmoji}>{meta.emoji}</Text>
              <Text style={styles.filmBadgeCount}>{filmInventory[type]}</Text>
            </View>
          );
        })}
        <TouchableOpacity style={styles.topBarButton} onPress={handleCheckCommits}>
          <Text style={styles.topBarButtonText}>↻</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarButton} onPress={onGoSettings}>
          <Text style={styles.topBarButtonText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainLayout}>
        {/* Left panel: grip + dashboard (matching AlbumScreen layout) */}
        <View style={styles.leftPanel}>
          <View style={styles.gripDecor}>
            <View style={styles.navSquare} />
            <View style={styles.gripLine} />
            <View style={[styles.navSquare, styles.navSquareActive]} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
          </View>

          <View style={styles.dashboard}>
            <Text style={styles.systemText}>DEVIT  //  SYSTEM_READY</Text>
            
            <View style={styles.instruments}>
              <Text style={styles.label}>[ FILM_TYPE ]</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filmSelectScroll}
                contentContainerStyle={styles.filmSelectRow}
              >
                {FILM_TYPES.map((type) => {
                  const meta = FILM_META[type];
                  const isSelected = selectedFilm === type;
                  const count = filmInventory[type];
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filmSelectBtn, isSelected && styles.filmSelectBtnActive]}
                      onPress={() => {
                        setSelectedFilm(type);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={styles.filmSelectEmoji}>{meta.emoji}</Text>
                      <Text style={[styles.filmSelectLabel, isSelected && styles.filmSelectLabelActive]}>
                        {getFilmDisplayName(type)}
                      </Text>
                      <Text style={[styles.filmSelectCount, count === 0 && styles.filmSelectCountEmpty]}>
                        x{count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedFilm && filmInventory[selectedFilm] === 0 && (
                <Text style={styles.warningText}>⚠ フィルムがありません</Text>
              )}
              
              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>[ FLASH ]</Text>
                  <TouchableOpacity onPress={toggleFlash} style={styles.dashboardBtn}>
                    <Text style={styles.btnText}>{flash.toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlsRow}>
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
        </View>

        <View style={styles.cameraRig}>
          <View style={[styles.previewContainer, { width: previewWidth, height: previewHeight }]}>
            <CameraView
              style={styles.camera}
              facing="back"
              zoom={zoom}
              flash={flash}
              ref={cameraRef}
            />
            {canShoot && (
              <>
                <View style={styles.crosshairVertical} />
                <View style={styles.crosshairHorizontal} />
                <View style={styles.recDot} />
              </>
            )}
            <ShutterOverlay width={previewWidth} height={previewHeight} isOpen={canShoot} shutterTrigger={shutterTrigger} />
          </View>

          <View style={[styles.grip, { width: gripWidth, height: gripHeight }]}>
            <TouchableOpacity 
              style={[
                styles.shutterButton,
                { width: shutterButtonSize, height: shutterButtonSize, borderRadius: shutterButtonSize / 2 },
                isShooting && { borderColor: '#ff4444' },
                !canShoot && styles.shutterDisabled,
              ]}
              onPress={takePicture}
              disabled={isShooting || !canShoot}
            >
              <View style={[
                styles.shutterInner,
                { width: shutterInnerSize, height: shutterInnerSize, borderRadius: shutterInnerSize / 2 },
                isShooting && { backgroundColor: '#cc0000' },
                !canShoot && styles.shutterInnerDisabled,
              ]} />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}