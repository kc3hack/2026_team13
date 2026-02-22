import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Platform,
  Modal,
  Pressable,
  BackHandler,
  PanResponder,
  NativeSyntheticEvent,
  NativeTouchEvent,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { deletePhoto, getPhotosByStatus, PhotoWithFilmName, getFilmInventory } from '../utils/sqlite';
import { applyUndevelopedPreviewEffect, getUndevelopedPreviewUriByPhotoId } from '../utils/photoEffects';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FilmInventory, FILM_META, FILM_TYPES } from '../types';
import { styles } from '../styles/AlbumScreen.styles';

// ★追加: 確実に3種類だけをUIに表示するためのフィルター配列
const DISPLAY_FILMS = FILM_TYPES.filter(type => ['mono', 'vivid', 'retro'].includes(type));

interface AlbumScreenProps {
  onBack: () => void;
  onGoCamera: () => void;
  onGoSettings: () => void;
  onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
}

type PhotoTab = 'developed' | 'undeveloped';
type SortOrder = 'newest' | 'oldest' | 'film';

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack, onGoCamera, onGoSettings, onGoDarkroom }) => {
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });
  const useFocusEffect = (effect: React.EffectCallback, deps: React.DependencyList) => {
    React.useEffect(effect, deps);
  };

  const GRID_COLUMNS = 3;
  const GRID_SIDE_PADDING = 12;
  const GRID_GAP = 8;
  const DETAIL_ZOOM_MIN = 1;
  const DETAIL_ZOOM_MAX = 3;
  const sortOrderOptions: SortOrder[] = ['newest', 'oldest', 'film'];
  const sortOrderLabelMap: Record<SortOrder, string> = {
    newest: '新しい順',
    oldest: '古い順',
    film: '種別順',
  };
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const topBarLeft = screenWidth * (Platform.OS === 'android' ? 0.29 : 0.42);
  const albumAndroidScale = Platform.OS === 'android' ? 0.82 : 1;
  const detailPhotoGap = 16;
  const detailScrollInterval = screenWidth + detailPhotoGap;
  const [photos, setPhotos] = useState<PhotoWithFilmName[]>([]);
  const [selectedTab, setSelectedTab] = useState<PhotoTab>('developed');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithFilmName | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [detailZoomScale, setDetailZoomScale] = useState(1);
  const [detailTranslateX, setDetailTranslateX] = useState(0);
  const [detailTranslateY, setDetailTranslateY] = useState(0);
  const [isPinchingDetail, setIsPinchingDetail] = useState(false);
  const [isPanningDetail, setIsPanningDetail] = useState(false);
  const detailZoomScaleRef = useRef(1);
  const detailTranslateXRef = useRef(0);
  const detailTranslateYRef = useRef(0);
  const detailPinchRef = useRef<{ initialDistance: number; startScale: number } | null>(null);
  const detailPanRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const detailViewportRef = useRef({ width: screenWidth, height: Math.round(screenWidth * 1.2) });
  const [menuTargetPhoto, setMenuTargetPhoto] = useState<PhotoWithFilmName | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [isProcessingUndeveloped, setIsProcessingUndeveloped] = useState(false);
  const [unprocessedPhotoIds, setUnprocessedPhotoIds] = useState<number[]>([]);
  
  // ★修正: 初期ステートを3種類のみに限定
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({ 
    mono: 0, 
    vivid: 0, 
    retro: 0 
  } as FilmInventory);
  
  const [currentPage, setCurrentPage] = useState(0);
  const loadRequestIdRef = useRef(0);

  const { checkForCommits } = useGithubCommits();

  useEffect(() => {
    const loadInventory = async () => {
      const inv = await getFilmInventory();
      setFilmInventory(inv);
    };
    loadInventory();
  }, []);

  const rightPanelWidth = screenWidth * 0.58;
  useEffect(() => {
    detailZoomScaleRef.current = detailZoomScale;
  }, [detailZoomScale]);

  useEffect(() => {
    detailTranslateXRef.current = detailTranslateX;
  }, [detailTranslateX]);

  useEffect(() => {
    detailTranslateYRef.current = detailTranslateY;
  }, [detailTranslateY]);

  const getPanBounds = useCallback((scale: number) => {
    const { width, height } = detailViewportRef.current;
    const maxX = Math.max(0, ((width || screenWidth) * (scale - 1)) / 2);
    const maxY = Math.max(0, ((height || Math.round(screenWidth * 1.2)) * (scale - 1)) / 2);
    return { maxX, maxY };
  }, [screenWidth]);

  const clampTranslation = useCallback((nextX: number, nextY: number, scale: number) => {
    const { maxX, maxY } = getPanBounds(scale);
    return {
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY)),
    };
  }, [getPanBounds]);

  const applyDetailTranslation = useCallback((nextX: number, nextY: number, scale = detailZoomScaleRef.current) => {
    const clamped = clampTranslation(nextX, nextY, scale);
    setDetailTranslateX(clamped.x);
    setDetailTranslateY(clamped.y);
  }, [clampTranslation]);

  const applyDetailZoomScale = useCallback((scale: number) => {
    const clamped = Math.max(DETAIL_ZOOM_MIN, Math.min(DETAIL_ZOOM_MAX, Number(scale.toFixed(2))));
    setDetailZoomScale(clamped);
    if (clamped <= DETAIL_ZOOM_MIN + 0.01) {
      setDetailTranslateX(0);
      setDetailTranslateY(0);
      return;
    }

    const adjusted = clampTranslation(detailTranslateXRef.current, detailTranslateYRef.current, clamped);
    setDetailTranslateX(adjusted.x);
    setDetailTranslateY(adjusted.y);
  }, [DETAIL_ZOOM_MAX, DETAIL_ZOOM_MIN, clampTranslation]);

  const thumbnailSize = useMemo(() => {
    const totalGap = GRID_GAP * (GRID_COLUMNS - 1);
    const availableWidth = rightPanelWidth - GRID_SIDE_PADDING * 2 - totalGap;
    const sizeByWidth = Math.floor(availableWidth / GRID_COLUMNS);
    const maxByHeight = Math.floor((screenHeight - 80) / 2.4);
    const baseSize = Math.min(sizeByWidth, maxByHeight);
    return Math.max(56, Math.floor(baseSize * albumAndroidScale));
  }, [rightPanelWidth, screenHeight, albumAndroidScale]);

  const regularFont = { fontFamily: 'CourierPrime_400Regular' as const, fontWeight: 'normal' as const };
  const boldFont = { fontFamily: 'CourierPrime_700Bold' as const, fontWeight: 'normal' as const };

  const sortedPhotos = useMemo(() => {
    const getPhotoTime = (photo: PhotoWithFilmName): number => {
      const createdAt = photo.created_at ? new Date(photo.created_at).getTime() : Number.NaN;
      if (!Number.isNaN(createdAt)) {
        return createdAt;
      }
      return photo.id;
    };

    return [...photos].sort((a, b) => {
      const left = getPhotoTime(a);
      const right = getPhotoTime(b);

      if (sortOrder === 'newest') {
        return right - left;
      }

      if (sortOrder === 'oldest') {
        return left - right;
      }

      const leftFilmName = a.film_name ?? '';
      const rightFilmName = b.film_name ?? '';
      const byFilmName = leftFilmName.localeCompare(rightFilmName, 'ja');

      if (byFilmName !== 0) {
        return byFilmName;
      }

      return right - left;
    });
  }, [photos, sortOrder]);

  const selectedPhotos = useMemo(
    () => sortedPhotos.filter((photo) => selectedPhotoIds.includes(photo.id)),
    [sortedPhotos, selectedPhotoIds],
  );
  const shouldShowSelectionActions = isSelectionMode && selectedPhotoIds.length > 0;
  const selectionModeButtonLabel = Platform.OS === 'android'
    ? (isSelectionMode ? '選択解除' : '選択モード')
    : (isSelectionMode ? '選択モード解除' : '選択モードにする');

  const ITEMS_PER_PAGE = 6;
  const totalPages = useMemo(() => {
    return Math.ceil(sortedPhotos.length / ITEMS_PER_PAGE);
  }, [sortedPhotos.length]);

  const displayStartIndex = useMemo(() => {
    return currentPage * ITEMS_PER_PAGE;
  }, [currentPage]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  const load = useCallback(async (status: PhotoTab) => {
    const requestId = ++loadRequestIdRef.current;
    const isStale = () => loadRequestIdRef.current !== requestId;

    setIsProcessingUndeveloped(false);

    if (status === 'undeveloped') {
      const undevelopedPhotos = await getPhotosByStatus('undeveloped');
      if (isStale()) return;

      const previewRows = await Promise.all(
        undevelopedPhotos.map(async (photo) => ({
          photo,
          previewUri: await getUndevelopedPreviewUriByPhotoId(photo.id),
        })),
      );
      if (isStale()) return;

      setPhotos(
        previewRows.map(({ photo, previewUri }) => ({
          ...photo,
          uri: previewUri ?? photo.uri,
        })),
      );

      const missingPreviewPhotos = previewRows
        .filter(({ previewUri }) => !previewUri)
        .map(({ photo }) => photo);

      setUnprocessedPhotoIds(missingPreviewPhotos.map((photo) => photo.id));

      if (missingPreviewPhotos.length === 0) {
        return;
      }

      setIsProcessingUndeveloped(true);
      void (async () => {
        try {
          for (const photo of missingPreviewPhotos) {
            if (isStale()) return;

            const generatedUri = await applyUndevelopedPreviewEffect(photo.uri, {
              outputFileName: `${photo.id}_undeveloped.jpg`,
            });

            if (isStale()) return;
            if (generatedUri !== photo.uri) {
              setPhotos((prev) => prev.map((item) => (
                item.id === photo.id
                  ? { ...item, uri: generatedUri }
                  : item
              )));
              setUnprocessedPhotoIds((prev) => prev.filter((id) => id !== photo.id));
            }
          }
        } finally {
          if (!isStale()) {
            setIsProcessingUndeveloped(false);
          }
        }
      })();
      return;
    }

    const list = await getPhotosByStatus(status);
    if (isStale()) return;
    setUnprocessedPhotoIds([]);
    setPhotos(list);
  }, []);

  useEffect(() => {
    void load(selectedTab);
  }, [load, selectedTab]);

  const closeSelectedPhoto = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(0);
    applyDetailZoomScale(DETAIL_ZOOM_MIN);
    setDetailTranslateX(0);
    setDetailTranslateY(0);
    setIsPinchingDetail(false);
    setIsPanningDetail(false);
    detailPanRef.current = null;
    detailPinchRef.current = null;
  }, [DETAIL_ZOOM_MIN, applyDetailZoomScale]);

  const getTouchDistance = useCallback((touches: readonly NativeTouchEvent[]) => {
    if (touches.length < 2) {
      return 0;
    }

    const first = touches[0];
    const second = touches[1];
    const deltaX = first.pageX - second.pageX;
    const deltaY = first.pageY - second.pageY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }, []);

  const handleDetailTouchStart = useCallback((event: NativeSyntheticEvent<any>) => {
    const touches = event.nativeEvent.touches as readonly NativeTouchEvent[];
    if (touches.length < 2) {
      if (touches.length === 1 && detailZoomScaleRef.current > DETAIL_ZOOM_MIN + 0.01) {
        const touch = touches[0];
        detailPanRef.current = {
          startX: touch.pageX,
          startY: touch.pageY,
          originX: detailTranslateXRef.current,
          originY: detailTranslateYRef.current,
        };
        setIsPanningDetail(true);
      }
      return;
    }

    const distance = getTouchDistance(touches);
    if (distance <= 0) {
      return;
    }

    detailPinchRef.current = {
      initialDistance: distance,
      startScale: detailZoomScaleRef.current,
    };
    detailPanRef.current = null;
    setIsPanningDetail(false);
    setIsPinchingDetail(true);
  }, [DETAIL_ZOOM_MIN, getTouchDistance]);

  const handleDetailTouchMove = useCallback((event: NativeSyntheticEvent<any>) => {
    const pinchState = detailPinchRef.current;
    const touches = event.nativeEvent.touches as readonly NativeTouchEvent[];
    if (pinchState && touches.length >= 2) {
      const currentDistance = getTouchDistance(touches);
      if (currentDistance <= 0) {
        return;
      }

      const ratio = currentDistance / pinchState.initialDistance;
      applyDetailZoomScale(pinchState.startScale * ratio);
      return;
    }

    const panState = detailPanRef.current;
    if (!panState || touches.length !== 1 || detailZoomScaleRef.current <= DETAIL_ZOOM_MIN + 0.01) {
      return;
    }

    const touch = touches[0];
    const deltaX = touch.pageX - panState.startX;
    const deltaY = touch.pageY - panState.startY;
    applyDetailTranslation(
      panState.originX + deltaX,
      panState.originY + deltaY,
      detailZoomScaleRef.current,
    );
  }, [DETAIL_ZOOM_MIN, applyDetailTranslation, applyDetailZoomScale, getTouchDistance]);

  const handleDetailTouchEnd = useCallback((event: NativeSyntheticEvent<any>) => {
    const touches = event.nativeEvent.touches as readonly NativeTouchEvent[];
    const hadPinch = detailPinchRef.current !== null;

    if (touches.length >= 2 && hadPinch) {
      return;
    }

    if (touches.length === 1 && detailZoomScaleRef.current > DETAIL_ZOOM_MIN + 0.01) {
      const touch = touches[0];
      detailPinchRef.current = null;
      setIsPinchingDetail(false);
      detailPanRef.current = {
        startX: touch.pageX,
        startY: touch.pageY,
        originX: detailTranslateXRef.current,
        originY: detailTranslateYRef.current,
      };
      setIsPanningDetail(true);
      return;
    }

    detailPinchRef.current = null;
    detailPanRef.current = null;
    setIsPinchingDetail(false);
    setIsPanningDetail(false);
  }, [DETAIL_ZOOM_MIN]);

  const handleDetailImageWrapLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    detailViewportRef.current = { width, height };
    const adjusted = clampTranslation(detailTranslateXRef.current, detailTranslateYRef.current, detailZoomScaleRef.current);
    setDetailTranslateX(adjusted.x);
    setDetailTranslateY(adjusted.y);
  }, [clampTranslation]);

  const openActionMenu = useCallback((photo: PhotoWithFilmName) => {
    setMenuTargetPhoto(photo);
  }, []);

  const closeActionMenu = useCallback(() => {
    setMenuTargetPhoto(null);
  }, []);

  const handleBackLikeAction = useCallback(() => {
    if (menuTargetPhoto) {
      closeActionMenu();
      return true;
    }

    if (selectedPhoto) {
      closeSelectedPhoto();
      return true;
    }

    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedPhotoIds([]);
      return true;
    }

    onBack();
    return true;
  }, [menuTargetPhoto, selectedPhoto, closeActionMenu, closeSelectedPhoto, isSelectionMode, onBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return handleBackLikeAction();
    });
    return () => subscription.remove();
  }, [handleBackLikeAction]);

  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy < -30,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -80) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onGoCamera();
        }
      },
    })
  ).current;

  const formattedCreatedAt = useMemo(() => {
    if (!menuTargetPhoto?.created_at) {
      return '-';
    }
    const date = new Date(menuTargetPhoto.created_at);
    if (Number.isNaN(date.getTime())) {
      return menuTargetPhoto.created_at;
    }
    return date.toLocaleString('ja-JP');
  }, [menuTargetPhoto]);

  const useFallbackModal = true;

  const handleDelete = (photo: PhotoWithFilmName) => {
    Alert.alert('削除', 'この写真を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(photo.id);
          closeActionMenu();
          if (selectedPhoto?.id === photo.id) {
            closeSelectedPhoto();
          }
          await load(selectedTab);
        },
      },
    ]);
  };

  const resolveSavableUri = useCallback(async (uri: string): Promise<string> => {
    const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!basePath) {
      return uri;
    }

    const targetUri = `${basePath}album_export_${Date.now()}.jpg`;

    try {
      await FileSystem.copyAsync({ from: uri, to: targetUri });
    } catch {
      return uri;
    }

    try {
      const copiedInfo = await FileSystem.getInfoAsync(targetUri);
      if (copiedInfo.exists) {
        return targetUri;
      }
    } catch {
      return uri;
    }

    return uri;
  }, []);

  const savePhotoToLibrary = useCallback(async (uri: string): Promise<boolean> => {
    try {
      const savableUri = await resolveSavableUri(uri);
      await MediaLibrary.saveToLibraryAsync(savableUri);
      return true;
    } catch (firstError) {
      try {
        const savableUri = await resolveSavableUri(uri);
        await MediaLibrary.createAssetAsync(savableUri);
        return true;
      } catch (secondError) {
        console.log('failed to save photo to device', { firstError, secondError, uri });
        return false;
      }
    }
  }, [resolveSavableUri]);

  const handleSaveToDevice = async (photo: PhotoWithFilmName) => {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      Alert.alert('保存できません', '写真ライブラリへのアクセス権限が必要です');
      return;
    }

    const saved = await savePhotoToLibrary(photo.uri);
    if (saved) {
      Alert.alert('保存完了', '写真を端末に保存しました');
      closeActionMenu();
      return;
    }

    Alert.alert('保存失敗', '写真の保存に失敗しました');
  };

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedPhotoIds([]);
      }
      return next;
    });
  }, []);

  const togglePhotoSelection = useCallback((photoId: number) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      return [...prev, photoId];
    });
  }, []);

  const handleSaveSelectedPhotos = useCallback(async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert('未選択', '保存する写真を選択してください');
      return;
    }

    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      Alert.alert('保存できません', '写真ライブラリへのアクセス権限が必要です');
      return;
    }

    let successCount = 0;
    for (const photo of selectedPhotos) {
      const saved = await savePhotoToLibrary(photo.uri);
      if (saved) {
        successCount += 1;
      }
    }

    Alert.alert('保存結果', `${successCount} / ${selectedPhotos.length}枚を保存しました`);
  }, [savePhotoToLibrary, selectedPhotos]);

  const handleDeleteSelectedPhotos = useCallback(() => {
    if (selectedPhotoIds.length === 0) {
      Alert.alert('未選択', '削除する写真を選択してください');
      return;
    }

    Alert.alert('削除', `${selectedPhotoIds.length}枚の写真を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          for (const photoId of selectedPhotoIds) {
            await deletePhoto(photoId);
          }
          setSelectedPhotoIds([]);
          setIsSelectionMode(false);
          await load(selectedTab);
        },
      },
    ]);
  }, [load, selectedPhotoIds, selectedTab]);

  const handleCheckCommits = async () => {
    const result = await checkForCommits();
    if (result) {
      Alert.alert('コミットチェック', result.message);
      const inv = await getFilmInventory();
      setFilmInventory(inv);
    }
  };

  const renderItem = ({ item, index }: { item: PhotoWithFilmName; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        if (isSelectionMode) { //選択モード中、単押しで選択追加/解除
          togglePhotoSelection(item.id);
          return;
        }
        setSelectedPhotoIndex(index);
        
        setTimeout(() => {
    setSelectedPhoto(item);
    applyDetailZoomScale(DETAIL_ZOOM_MIN);
  }, 50);

        console.log('Photo pressed', item.id, index);
      }}
      onLongPress={() => {
        if (isSelectionMode) {
          togglePhotoSelection(item.id);
          return;
        }
        setIsSelectionMode(true);
        setSelectedPhotoIds([item.id]);
      }}
      style={[
        styles.photoItem,
        {
          width: thumbnailSize,
          marginRight: (index + 1) % GRID_COLUMNS === 0 ? 0 : GRID_GAP,
        },
      ]}
    >
      <View style={[styles.photoWrap, { width: thumbnailSize, height: thumbnailSize }]}>
        <Image
          source={{ uri: item.uri }}
          style={[styles.photo, { width: thumbnailSize, height: thumbnailSize }]}
          resizeMode="cover"
          blurRadius={selectedTab === 'undeveloped' ? 14 : 0}
        />
        {selectedTab === 'undeveloped' && (
          <BlurView
            intensity={Platform.OS === 'ios' ? 22 : 0}
            tint="default"
            style={styles.photoBlurOverlay}
          />
        )}
        {isSelectionMode && (
          <View style={[styles.selectionBadge, selectedPhotoIds.includes(item.id) && styles.selectionBadgeActive]}>
            <Text style={styles.selectionBadgeText}>{selectedPhotoIds.includes(item.id) ? '✓' : ''}</Text>
          </View>
        )}
      </View>
      <Text style={styles.metaText}>状態: {item.status === 'developed' ? '現像済' : '現像前'}</Text>
      <Text style={styles.metaText}>フィルム: {item.film_name ?? '不明'}</Text>
    </TouchableOpacity>
  );

  if (!fontsLoaded) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top-right toolbar: film inventory + refresh + settings */}
      <View style={[styles.topBar, { left: screenWidth * 0.42 }]}> 
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
        <View style={styles.leftPanel} {...swipePanResponder.panHandlers}>
          <View style={styles.grip}>
            <View style={[styles.navSquare, styles.navSquareActive]} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
          </View>

          <View style={styles.dashboard}>
            <Text style={[styles.systemText, regularFont]}>DEVIT  //  ALBUM</Text>

            <View style={styles.instruments}>
              <Text style={styles.label}>[ PICTURE TYPE ]</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTab('developed');
                    setIsSelectionMode(false);
                    setSelectedPhotoIds([]);
                    setCurrentPage(0);
                  }}
                  style={[styles.dashboardBtn, selectedTab === 'developed' && styles.dashboardBtnActive]}
                >
                  <Text style={[styles.btnText, selectedTab === 'developed' && styles.btnTextActive]}>現像済み</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTab('undeveloped');
                    setIsSelectionMode(false);
                    setSelectedPhotoIds([]);
                    setCurrentPage(0);
                  }}
                  style={[styles.dashboardBtn, selectedTab === 'undeveloped' && styles.dashboardBtnActive]}
                >
                  <Text style={[styles.btnText, selectedTab === 'undeveloped' && styles.btnTextActive]}>現像待ち</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>[ SORT ]</Text>
              <View style={styles.buttonRow}>
                {sortOrderOptions.map((order) => (
                  <TouchableOpacity
                    key={order}
                    onPress={() => setSortOrder(order)}
                    style={[styles.dashboardBtn, sortOrder === order && styles.dashboardBtnActive]}
                  >
                    <Text style={[styles.btnText, sortOrder === order && styles.btnTextActive]}>{sortOrderLabelMap[order]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {Platform.OS === 'android' ? (
                <>
                  <View style={styles.modeActionHeaderRowAndroid}>
                    <Text style={styles.label}>[ MODE ]</Text>
                    {shouldShowSelectionActions && (
                      <Text style={styles.modeActionHeaderLabelAndroid}>[ ACTION ] {selectedPhotoIds.length}枚</Text>
                    )}
                  </View>

                  <View style={styles.modeActionControlsRowAndroid}>
                    <TouchableOpacity
                      onPress={toggleSelectionMode}
                      style={[styles.dashboardBtn, isSelectionMode && styles.dashboardBtnActive]}
                    >
                      <Text style={[styles.btnText, isSelectionMode && styles.btnTextActive]}>
                        {selectionModeButtonLabel}
                      </Text>
                    </TouchableOpacity>

                    {shouldShowSelectionActions && (
                      <View style={[styles.buttonRow, styles.modeActionButtonsRowAndroid]}>
                        <TouchableOpacity
                          onPress={() => void handleSaveSelectedPhotos()}
                          style={styles.dashboardBtn}
                        >
                          <Text style={styles.btnText}>保存</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleDeleteSelectedPhotos}
                          style={[styles.dashboardBtn, styles.dangerBtn]}
                        >
                          <Text style={styles.dangerBtnText}>削除</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>[ MODE ]</Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={toggleSelectionMode}
                      style={[styles.dashboardBtn, isSelectionMode && styles.dashboardBtnActive]}
                    >
                      <Text style={[styles.btnText, isSelectionMode && styles.btnTextActive]}>
                        {selectionModeButtonLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {Platform.OS !== 'android' && shouldShowSelectionActions && (
                <>
                  <Text style={styles.label}>[ ACTION ] {selectedPhotoIds.length}枚選択中</Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() => void handleSaveSelectedPhotos()}
                      style={styles.dashboardBtn}
                    >
                      <Text style={styles.btnText}>保存</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteSelectedPhotos}
                      style={[styles.dashboardBtn, styles.dangerBtn]}
                    >
                      <Text style={styles.dangerBtnText}>削除</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {sortedPhotos.length > ITEMS_PER_PAGE && (
                <>
                  <Text style={styles.label}>[ PAGINATION ]</Text>
                  <View style={styles.paginationContainer}>
                    <TouchableOpacity
                      onPress={handlePreviousPage}
                      disabled={currentPage === 0}
                      style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
                    >
                      <Text style={[styles.paginationButtonText, currentPage === 0 && styles.paginationButtonTextDisabled]}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.paginationText}>
                      {currentPage + 1} / {totalPages}
                    </Text>
                    <TouchableOpacity
                      onPress={handleNextPage}
                      disabled={currentPage === totalPages - 1}
                      style={[styles.paginationButton, currentPage === totalPages - 1 && styles.paginationButtonDisabled]}
                    >
                      <Text style={[styles.paginationButtonText, currentPage === totalPages - 1 && styles.paginationButtonTextDisabled]}>→</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rightPanel}>
          {isProcessingUndeveloped && (
            <View style={styles.processingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingOverlayText}>未現像プレビューを生成中...</Text>
            </View>
          )}
          <View style={styles.gridContainer}>
            {Array.from({ length: 6 }).map((_, idx) => {
              const item = sortedPhotos[displayStartIndex + idx];
              return (
                <View key={idx} style={styles.gridItem}>
                  {item ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        if (isSelectionMode) {
                          togglePhotoSelection(item.id);
                          return;
                        }
                        setSelectedPhotoIndex(displayStartIndex + idx);
                        setSelectedPhoto(item);
                      }}
                      onLongPress={() => {
                        if (isSelectionMode) {
                          togglePhotoSelection(item.id);
                          return;
                        }
                        setIsSelectionMode(true);
                        setSelectedPhotoIds([item.id]);
                      }}
                    >
                      <View style={styles.photoWrap}>
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.gridImage}
                          resizeMode="cover"
                          blurRadius={selectedTab === 'undeveloped' && unprocessedPhotoIds.includes(item.id) ? 14 : 0}
                        />
                        {/*selectedTab === 'undeveloped' && (
                          <BlurView
                            intensity={Platform.OS === 'ios' ? 22 : 0}
                            tint="default"
                            style={styles.photoBlurOverlay}
                          />
                        )*/}
                        {isSelectionMode && (
                          <View style={[styles.selectionBadge, selectedPhotoIds.includes(item.id) && styles.selectionBadgeActive]}>
                            <Text style={styles.selectionBadgeText}>{selectedPhotoIds.includes(item.id) ? '✓' : ''}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.photoWrap}>
                      <View style={styles.gridImage} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
        
      {selectedPhoto && (
        <Pressable
          style={styles.detailModalBackdrop}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.detailModalDismiss}
            onPress={closeSelectedPhoto}
          />
          <Pressable
            style={styles.detailImageWrap}
            onLayout={handleDetailImageWrapLayout}
            onTouchStart={handleDetailTouchStart}
            onTouchMove={handleDetailTouchMove}
            onTouchEnd={handleDetailTouchEnd}
            onTouchCancel={handleDetailTouchEnd}
            onLongPress={() => openActionMenu(selectedPhoto)}
          >
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={[styles.detailImage, { transform: [{ translateX: detailTranslateX }, { translateY: detailTranslateY }, { scale: detailZoomScale }] }]}
              resizeMode="contain"
              blurRadius={selectedPhoto.status === 'undeveloped' && unprocessedPhotoIds.includes(selectedPhoto.id) ? 22 : 0}
            />
            {/*selectedPhoto.status === 'undeveloped' && (
              <BlurView
                intensity={Platform.OS === 'ios' ? 22 : 0}
                tint="default"
                style={[styles.detailBlurOverlay, { transform: [{ translateX: detailTranslateX }, { translateY: detailTranslateY }, { scale: detailZoomScale }] }]}
              />
            )*/}
          </Pressable>

          {/* ナビゲーションボタン*/}
          {selectedPhotoIndex > 0 && (
            <TouchableOpacity
              style={[styles.detailModalNavButton, styles.detailModalNavButtonLeft]}
              onPress={() => {
                const prevIndex = selectedPhotoIndex - 1;
                setSelectedPhotoIndex(prevIndex);
                setSelectedPhoto(sortedPhotos[prevIndex]);
                applyDetailZoomScale(DETAIL_ZOOM_MIN);
                setDetailTranslateX(0);
                setDetailTranslateY(0);
                setIsPinchingDetail(false);
                setIsPanningDetail(false);
                detailPanRef.current = null;
                detailPinchRef.current = null;
              }}
            >
              <Text style={styles.detailModalNavButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          {selectedPhotoIndex < sortedPhotos.length - 1 && (
            <TouchableOpacity
              style={[styles.detailModalNavButton, styles.detailModalNavButtonRight]}
              onPress={() => {
                const nextIndex = selectedPhotoIndex + 1;
                setSelectedPhotoIndex(nextIndex);
                setSelectedPhoto(sortedPhotos[nextIndex]);
                applyDetailZoomScale(DETAIL_ZOOM_MIN);
                setDetailTranslateX(0);
                setDetailTranslateY(0);
                setIsPinchingDetail(false);
                setIsPanningDetail(false);
                detailPanRef.current = null;
                detailPinchRef.current = null;
              }}
            >
              <Text style={styles.detailModalNavButtonText}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.detailModalCloseButton}
            onPress={closeSelectedPhoto}
          >
            <Text style={styles.detailModalCloseButtonText}>×</Text>
          </TouchableOpacity>
        </Pressable>
      )}

      {useFallbackModal ? (
        menuTargetPhoto !== null && (
          <Pressable 
            style={styles.menuBackdrop} 
            onPress={closeActionMenu}
            pointerEvents="auto"
          >
            <Pressable style={styles.menuBackdropDismiss} onPress={closeActionMenu} />
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle}>写真アクション</Text>

              {menuTargetPhoto?.status === 'developed' && (
                <TouchableOpacity
                  style={styles.menuActionButton}
                  onPress={() => menuTargetPhoto && void handleSaveToDevice(menuTargetPhoto)}
                >
                  <Text style={styles.menuActionText}>端末に保存</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.menuActionButton, styles.menuDangerButton]}
                onPress={() => menuTargetPhoto && handleDelete(menuTargetPhoto)}
              >
                <Text style={styles.menuDangerText}>削除</Text>
              </TouchableOpacity>

              <View style={styles.menuInfoWrap}>
                <Text style={styles.menuInfoLabel}>撮影日時</Text>
                <Text style={styles.menuInfoValue}>{formattedCreatedAt}</Text>

                <Text style={[styles.menuInfoLabel, styles.menuInfoTopMargin]}>使用フィルム</Text>
                {/* ★修正: メニュー内のフィルム名表示もMonoをCinemaと表示する */}
                <Text style={styles.menuInfoValue}>
                  {menuTargetPhoto?.film_name === 'Mono' ? 'Cinema' : (menuTargetPhoto?.film_name ?? '不明')}
                </Text>
              </View>
            </View>
          </Pressable>
        )
      ) : (
        <Modal visible={menuTargetPhoto !== null} transparent animationType="fade" onRequestClose={closeActionMenu}>
          <View style={styles.menuBackdrop}>
            <Pressable style={styles.menuBackdropDismiss} onPress={closeActionMenu} />
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle}>写真アクション</Text>

              {menuTargetPhoto?.status === 'developed' && (
                <TouchableOpacity
                  style={styles.menuActionButton}
                  onPress={() => menuTargetPhoto && void handleSaveToDevice(menuTargetPhoto)}
                >
                  <Text style={styles.menuActionText}>端末に保存</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.menuActionButton, styles.menuDangerButton]}
                onPress={() => menuTargetPhoto && handleDelete(menuTargetPhoto)}
              >
                <Text style={styles.menuDangerText}>削除</Text>
              </TouchableOpacity>

              <View style={styles.menuInfoWrap}>
                <Text style={styles.menuInfoLabel}>撮影日時</Text>
                <Text style={styles.menuInfoValue}>{formattedCreatedAt}</Text>

                <Text style={[styles.menuInfoLabel, styles.menuInfoTopMargin]}>使用フィルム</Text>
                <Text style={styles.menuInfoValue}>
                  {menuTargetPhoto?.film_name === 'Mono' ? 'Cinema' : (menuTargetPhoto?.film_name ?? '不明')}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};