import { useState, useRef, useEffect } from 'react';
import { Text, View, TouchableOpacity, SafeAreaView, Alert, PanResponder, Image, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import * as Haptics from 'expo-haptics';
import { consumeFilm, addPhoto, getFilmInventory } from '../utils/sqlite';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FilmInventory, FILM_META, FILM_TYPES, RewardFilmType } from '../types';
import { styles } from '../styles/CameraScreen.styles';
import { ShutterOverlay } from '../components/ShutterOverlay';

// ★修正: 3種類のみに限定
const FILM_ID_MAP: Record<string, number> = {
  mono: 11,   // (実質 Cinema)
  vivid: 12,
  retro: 13,
};

// ★追加: 確実に3種類だけをUIに表示するためのフィルター配列
const DISPLAY_FILMS = FILM_TYPES.filter(type => ['mono', 'vivid', 'retro'].includes(type));

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
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isShooting, setIsShooting] = useState(false);
  
  // ★修正: 初期ステートも3種類のみに限定
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({
    mono: 0,
    vivid: 0,
    retro: 0,
  } as FilmInventory);
  
  const [shutterTrigger, setShutterTrigger] = useState(0);
  const [selectedFilm, setSelectedFilm] = useState<RewardFilmType | null>(
    filmType && DISPLAY_FILMS.includes(filmType as RewardFilmType) ? filmType as RewardFilmType : null
  );
  const androidScale = Platform.OS === 'android' ? 0.9 : 1;
  const androidInset = Platform.OS === 'android' ? 8 : 0;
  const androidPreviewScale = Platform.OS === 'android' ? 1.25 : 1;

  const activeFilmId = selectedFilm ? FILM_ID_MAP[selectedFilm] : null;
  const canShoot = !!selectedFilm && filmInventory[selectedFilm] > 0;

  const topBarLeft = width * (Platform.OS === 'android' ? 0.29 : 0.42) + androidInset;
  const previewHeight = Math.round(Math.max(140, Math.min(260, Math.round(height * 0.38))) * androidPreviewScale);
  const previewWidth = Math.round(previewHeight * (4 / 3));
  const gripHeight = previewHeight;
  const gripWidth = Math.max(64, Math.min(96, Math.round(previewHeight * 0.42)));
  const shutterButtonSize = Math.round(Math.max(44, Math.min(64, Math.round(previewHeight * 0.31))) * androidScale);
  const shutterInnerSize = Math.round(shutterButtonSize * 0.78);

  // ★修正: UI上の表示名を 'mono' の場合は 'Cinema' に変更して表示
  const getFilmDisplayName = (type: string): string => {
    if (type === 'mono') return 'Cinema';
    return type.charAt(0).toUpperCase() + type.slice(1); // 先頭大文字 (Vivid, Retro)
  };
  
  const cameraRef = useRef<CameraView>(null);
  const { checkForCommits } = useGithubCommits();

  const regularFont = { fontFamily: 'CourierPrime_400Regular' as const, fontWeight: 'normal' as const };
  const boldFont = { fontFamily: 'CourierPrime_700Bold' as const, fontWeight: 'normal' as const };

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
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>カメラの権限が必要です</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>権限を許可</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView> 
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
        const consumed = await consumeFilm(selectedFilm);
        if (!consumed) {
           Alert.alert('エラー', 'フィルムが不足しています');
           const inv = await getFilmInventory();
           setFilmInventory(inv);
           return;
        }

        const inv = await getFilmInventory();
        setFilmInventory(inv);

        await addPhoto(photoData.uri, activeFilmId, 'undeveloped');
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
        {/* ★修正: DISPLAY_FILMSを使って3種類のみ表示 */}
        {DISPLAY_FILMS.map((type) => {
          const meta = FILM_META[type];
          return (
            <View key={type} style={styles.filmBadge}>
              <Image source={meta.image} style={styles.filmBadgeImage} />
              <Text style={[styles.filmBadgeCount, boldFont]}>{filmInventory[type]}</Text>
            </View>
          );
        })}
        <TouchableOpacity style={styles.topBarButton} onPress={handleCheckCommits}>
          <Text style={[styles.topBarButtonText, boldFont]}>↻</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarButton} onPress={onGoSettings}>
          <Text style={[styles.topBarButtonText, boldFont]}>⚙</Text>
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
            <Text style={[styles.systemText, regularFont]}>DEVIT  //  SYSTEM_READY</Text>
            
            <View style={styles.instruments}>
              <Text style={[styles.label, regularFont]}>[ FILM_TYPE ]</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filmSelectScroll}
                contentContainerStyle={styles.filmSelectRow}
              >
                {/* ★修正: DISPLAY_FILMSを使って3種類のみ表示 */}
                {DISPLAY_FILMS.map((type) => {
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
                      <Image source={meta.image} style={styles.filmSelectImage} />
                      <Text style={[styles.filmSelectLabel, isSelected && styles.filmSelectLabelActive]}>
                        {getFilmDisplayName(type)}
                      </Text>
                      <Text style={[styles.filmSelectCount, count === 0 && styles.filmSelectCountEmpty, regularFont]}>
                        x{count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedFilm && filmInventory[selectedFilm] === 0 && (
                <Text style={[styles.warningText, regularFont]}>⚠ フィルムがありません</Text>
              )}
              
              <View style={styles.row}>
                <View>
                  <Text style={[styles.label, regularFont]}>[ FLASH ]</Text>
                  <TouchableOpacity onPress={toggleFlash} style={styles.dashboardBtn}>
                    <Text style={[styles.btnText, boldFont]}>{flash.toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <View>
                  <Text style={[styles.label, regularFont]}>[ ZOOM_LEVEL ]</Text>
                  <View style={styles.zoomControls}>
                    <TouchableOpacity onPress={() => handleZoom(false)} style={[styles.dashboardBtn, styles.zoomSymbolButton]}><Text style={styles.zoomSymbolText}>-</Text></TouchableOpacity>
                    <Text style={[styles.valueText, regularFont]}>{(zoom * 10).toFixed(1)}</Text>
                    <TouchableOpacity onPress={() => handleZoom(true)} style={[styles.dashboardBtn, styles.zoomSymbolButton]}><Text style={styles.zoomSymbolText}>+</Text></TouchableOpacity>
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
            {canShoot ? (
              <>
                <View style={styles.crosshairVertical} />
                <View style={styles.crosshairHorizontal} />
                <View style={styles.recDot} />
              </>
            ) : (
              <View style={styles.cameraOff}>
                <Text style={[styles.cameraOffText, boldFont]}>NO FILM</Text>
              </View>
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