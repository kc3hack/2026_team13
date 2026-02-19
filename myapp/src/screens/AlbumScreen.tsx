import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
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
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { deletePhoto, getPhotosByStatus, PhotoWithFilmName } from '../utils/sqlite';
import { getMenuBackgroundMode, MenuBackgroundMode } from '../utils/storage';
import { styles } from '../styles/AlbumScreen.styles';

interface AlbumScreenProps {
  onBack: () => void;
  onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
}

type PhotoTab = 'developed' | 'undeveloped';
type SortOrder = 'newest' | 'oldest' | 'film';

const useFocusEffect = (effect: React.EffectCallback, deps: React.DependencyList) => {
  React.useEffect(effect, deps);
};

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack, onGoDarkroom }) => {
  const GRID_COLUMNS = 3;
  const GRID_SIDE_PADDING = 20;
  const GRID_GAP = 8;
  const DETAIL_ZOOM_MIN = 1;
  const DETAIL_ZOOM_MAX = 3;
  const sortOrderOptions: SortOrder[] = ['newest', 'oldest', 'film'];
  const sortOrderLabelMap: Record<SortOrder, string> = {
    newest: '新しい順',
    oldest: '古い順',
    film: '種類別',
  };
  const { width: screenWidth } = useWindowDimensions();
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
  const [backgroundMode, setBackgroundMode] = useState<MenuBackgroundMode>('light');
  const isDarkBackground = backgroundMode === 'dark';

  useEffect(() => {
    void (async () => {
      const mode = await getMenuBackgroundMode();
      setBackgroundMode(mode);
    })();
  }, []);

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
  }, [DETAIL_ZOOM_MAX, DETAIL_ZOOM_MIN]);

  const thumbnailSize = useMemo(() => {
    const totalGap = GRID_GAP * (GRID_COLUMNS - 1);
    const availableWidth = screenWidth - GRID_SIDE_PADDING * 2 - totalGap;
    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [screenWidth]);

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


  const rotateSortOrder = useCallback(() => {
    setSortOrder((prev) => {
      const currentIndex = sortOrderOptions.indexOf(prev);
      const nextIndex = (currentIndex + 1) % sortOrderOptions.length;
      return sortOrderOptions[nextIndex];
    });
  }, [sortOrderOptions]);

  const load = useCallback(async (status: PhotoTab) => {
    const list = await getPhotosByStatus(status);
    setPhotos(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(selectedTab);
    }, [load, selectedTab]),
    [load, selectedTab],
  );

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

  const resetDetailZoom = useCallback(() => {
    setDetailZoomScale(DETAIL_ZOOM_MIN);
    setDetailTranslateX(0);
    setDetailTranslateY(0);
  }, [DETAIL_ZOOM_MIN]);

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

  const iosEdgeBackPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => (
      Platform.OS === 'ios'
      && evt.nativeEvent.pageX <= 24
      && gestureState.dx > 12
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        handleBackLikeAction();
      }
    },
  }), [handleBackLikeAction]);

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

  const handleDevelop = (photo: PhotoWithFilmName) => {
    closeActionMenu();
    closeSelectedPhoto();
    onGoDarkroom({
      id: photo.id,
      uri: photo.uri,
      filmId: photo.film_id,
    });
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

  const renderItem = ({ item, index }: { item: PhotoWithFilmName; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        if (isSelectionMode) {
          togglePhotoSelection(item.id);
          return;
        }

        setSelectedPhoto(item);
        setSelectedPhotoIndex(index);
        applyDetailZoomScale(DETAIL_ZOOM_MIN);
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
      <View style={[styles.photoWrap, isDarkBackground && styles.photoWrapDark, { width: thumbnailSize, height: thumbnailSize }]}>
        <Image
          source={{ uri: item.uri }}
          style={[styles.photo, { width: thumbnailSize, height: thumbnailSize }]}
          resizeMode="contain"
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
      <Text style={[styles.metaText, isDarkBackground && styles.textDarkSub]}>状態: {item.status === 'developed' ? '現像済み' : '現像前'}</Text>
      <Text style={[styles.metaText, isDarkBackground && styles.textDarkSub]}>フィルム: {item.film_name ?? '不明'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, isDarkBackground && styles.containerDark]}
      {...iosEdgeBackPanResponder.panHandlers}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={[styles.backText, isDarkBackground && styles.textDarkPrimary]}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.selectionToggleButton, isDarkBackground && styles.controlDark]} onPress={toggleSelectionMode}>
          <Text style={[styles.selectionToggleButtonText, isDarkBackground && styles.textDarkPrimary]}>{isSelectionMode ? '完了' : '選択'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabsWrap, isDarkBackground && styles.tabsWrapDark]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setSelectedTab('developed');
            setIsSelectionMode(false);
            setSelectedPhotoIds([]);
          }}
        >
          <Text style={[styles.tabText, isDarkBackground && styles.textDarkSub, selectedTab === 'developed' && styles.tabTextActive, isDarkBackground && selectedTab === 'developed' && styles.textDarkPrimary]}>現像済み</Text>
          {selectedTab === 'developed' && <View style={[styles.tabIndicator, isDarkBackground && styles.tabIndicatorDark]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setSelectedTab('undeveloped');
            setIsSelectionMode(false);
            setSelectedPhotoIds([]);
          }}
        >
          <Text style={[styles.tabText, isDarkBackground && styles.textDarkSub, selectedTab === 'undeveloped' && styles.tabTextActive, isDarkBackground && selectedTab === 'undeveloped' && styles.textDarkPrimary]}>未現像</Text>
          {selectedTab === 'undeveloped' && <View style={[styles.tabIndicator, isDarkBackground && styles.tabIndicatorDark]} />}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, isDarkBackground && styles.textDarkPrimary]}>{selectedTab === 'developed' ? '現像済みアルバム' : '現像待ちアルバム'}</Text>
        {isSelectionMode && (
          <Text style={[styles.selectionInfoText, isDarkBackground && styles.textDarkSub]}>{selectedPhotoIds.length}枚を選択中</Text>
        )}
        <TouchableOpacity
          style={[styles.sortButton, isDarkBackground && styles.controlDark, isSelectionMode && styles.sortButtonDisabled]}
          onPress={rotateSortOrder}
          disabled={isSelectionMode}
        >
          <Text style={[styles.sortButtonText, isDarkBackground && styles.textDarkPrimary]}>{sortOrderLabelMap[sortOrder]}</Text>
        </TouchableOpacity>
        {sortedPhotos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, isDarkBackground && styles.textDarkSub]}>
              {selectedTab === 'developed' ? '現像済みの写真はありません' : '現像待ちの写真はありません'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedPhotos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            style={styles.listView}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.listRow}
            contentContainerStyle={[styles.list, isSelectionMode && styles.listWithSelectionActions]}
          />
        )}
      </View>

      {isSelectionMode && (
        <View style={[styles.selectionActionBar, isDarkBackground && styles.selectionActionBarDark]}>
          <View style={styles.selectionActionRow}>
            <TouchableOpacity style={[styles.selectionActionButton, isDarkBackground && styles.controlDark]} onPress={() => void handleSaveSelectedPhotos()}>
              <Text style={[styles.selectionActionButtonText, isDarkBackground && styles.textDarkPrimary]}>写真を保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectionActionButton, styles.selectionActionDangerButton, isDarkBackground && styles.controlDark]}
              onPress={handleDeleteSelectedPhotos}
            >
              <Text style={[styles.selectionActionButtonText, styles.selectionActionDangerText]}>写真を削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={selectedPhoto !== null}
        animationType="fade"
        onRequestClose={closeSelectedPhoto}
      >
        <SafeAreaView style={styles.detailContainer} {...iosEdgeBackPanResponder.panHandlers}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.detailHeaderButton}
              onPress={closeSelectedPhoto}
            >
              <Text style={styles.detailHeaderText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailHeaderButton}
              onPress={() => selectedPhoto && openActionMenu(selectedPhoto)}
            >
              <Text style={styles.detailHeaderText}>•••</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailZoomControls}>
            <TouchableOpacity style={styles.detailZoomButton} onPress={resetDetailZoom}>
              <Text style={styles.detailZoomButtonText}>元の位置に戻す</Text>
            </TouchableOpacity>
          </View>

          {selectedPhoto && (
            <FlatList
              data={sortedPhotos}
              horizontal
              scrollEnabled={!isPinchingDetail && !isPanningDetail && detailZoomScale <= DETAIL_ZOOM_MIN + 0.01}
              decelerationRate="fast"
              snapToInterval={detailScrollInterval}
              snapToAlignment="start"
              disableIntervalMomentum
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => p.id.toString()}
              ItemSeparatorComponent={() => <View style={{ width: detailPhotoGap }} />}
              initialScrollIndex={selectedPhotoIndex}
              getItemLayout={(_, index) => ({
                length: detailScrollInterval,
                offset: detailScrollInterval * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / detailScrollInterval);
                if (nextIndex < 0 || nextIndex >= sortedPhotos.length) {
                  return;
                }
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
              renderItem={({ item, index }) => {
                const scale = index === selectedPhotoIndex ? detailZoomScale : DETAIL_ZOOM_MIN;
                const translateX = index === selectedPhotoIndex ? detailTranslateX : 0;
                const translateY = index === selectedPhotoIndex ? detailTranslateY : 0;
                const touchHandlers = index === selectedPhotoIndex
                  ? {
                    onTouchStart: handleDetailTouchStart,
                    onTouchMove: handleDetailTouchMove,
                    onTouchEnd: handleDetailTouchEnd,
                    onTouchCancel: handleDetailTouchEnd,
                  }
                  : {};

                return (
                  <View
                    style={[styles.detailImageWrap, { width: screenWidth }]}
                    onLayout={index === selectedPhotoIndex ? handleDetailImageWrapLayout : undefined}
                    {...touchHandlers}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={[styles.detailImage, { transform: [{ translateX }, { translateY }, { scale }] }]}
                      resizeMode="contain"
                      blurRadius={item.status === 'undeveloped' ? 22 : 0}
                    />
                    {item.status === 'undeveloped' && (
                      <BlurView
                        intensity={Platform.OS === 'ios' ? 22 : 0}
                        tint="default"
                        style={[styles.detailBlurOverlay, { transform: [{ translateX }, { translateY }, { scale }] }]}
                      />
                    )}
                  </View>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={menuTargetPhoto !== null} transparent animationType="fade" onRequestClose={closeActionMenu}>
        <View style={styles.menuBackdrop}>
          <Pressable style={styles.menuBackdropDismiss} onPress={closeActionMenu} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>写真アクション</Text>

            {menuTargetPhoto?.status === 'undeveloped' && (
              <TouchableOpacity style={styles.menuActionButton} onPress={() => menuTargetPhoto && handleDevelop(menuTargetPhoto)}>
                <Text style={styles.menuActionText}>現像する</Text>
              </TouchableOpacity>
            )}

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
              <Text style={styles.menuInfoValue}>{menuTargetPhoto?.film_name ?? '不明'}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


