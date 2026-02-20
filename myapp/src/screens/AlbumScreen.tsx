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
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { deletePhoto, getPhotosByStatus, PhotoWithFilmName, getFilmInventory } from '../utils/sqlite';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { FilmInventory, FILM_META, FILM_TYPES } from '../types';
import { styles } from '../styles/AlbumScreen.styles';

interface AlbumScreenProps {
  onBack: () => void;
  onGoCamera: () => void;
  onGoSettings: () => void;
  onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
}

type PhotoTab = 'developed' | 'undeveloped';
type SortOrder = 'newest' | 'oldest' | 'film';

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack, onGoCamera, onGoSettings, onGoDarkroom }) => {
  const GRID_COLUMNS = 3;
  const GRID_SIDE_PADDING = 12;
  const GRID_GAP = 8;
  const sortOrderOptions: SortOrder[] = ['newest', 'oldest', 'film'];
  const sortOrderLabelMap: Record<SortOrder, string> = {
    newest: '新しい順',
    oldest: '古い順',
    film: '種別順',
  };
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const detailPhotoGap = 16;
  const detailScrollInterval = screenWidth + detailPhotoGap;
  const [photos, setPhotos] = useState<PhotoWithFilmName[]>([]);
  const [selectedTab, setSelectedTab] = useState<PhotoTab>('developed');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithFilmName | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [menuTargetPhoto, setMenuTargetPhoto] = useState<PhotoWithFilmName | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({ mono: 0, vivid: 0, retro: 0 });

  const { checkForCommits } = useGithubCommits();

  // Load film inventory
  useEffect(() => {
    const loadInventory = async () => {
      const inv = await getFilmInventory();
      setFilmInventory(inv);
    };
    loadInventory();
  }, []);

  // Thumbnail size: fit 3 columns in the right panel, and also respect screen height
  const rightPanelWidth = screenWidth * 0.58;
  const thumbnailSize = useMemo(() => {
    const totalGap = GRID_GAP * (GRID_COLUMNS - 1);
    const availableWidth = rightPanelWidth - GRID_SIDE_PADDING * 2 - totalGap;
    const sizeByWidth = Math.floor(availableWidth / GRID_COLUMNS);
    // Also cap by screen height so a row doesn't overflow vertically
    const maxByHeight = Math.floor((screenHeight - 80) / 2.4);
    return Math.min(sizeByWidth, maxByHeight);
  }, [rightPanelWidth, screenHeight]);

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

  const load = useCallback(async (status: PhotoTab) => {
    const list = await getPhotosByStatus(status);
    setPhotos(list);
  }, []);

  useEffect(() => {
    void load(selectedTab);
  }, [load, selectedTab]);

  const closeSelectedPhoto = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedPhotoIndex(0);
  }, []);

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

  // Swipe up → Camera
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
        if (isSelectionMode) {
          togglePhotoSelection(item.id);
          return;
        }
        setSelectedPhoto(item);
        setSelectedPhotoIndex(index);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Top-right toolbar: film inventory + refresh + settings */}
      <View style={styles.topBar}>
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
        {/* Left side: grip element + dashboard — swipe up here to go to Camera */}
        <View style={styles.leftPanel} {...swipePanResponder.panHandlers}>
          {/* Grip element (decorative camera grip) */}
          <View style={styles.grip}>
            <View style={[styles.navSquare, styles.navSquareActive]} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
            <View style={styles.gripLine} />
            <View style={styles.navSquare} />
          </View>

          {/* Dashboard controls */}
          <View style={styles.dashboard}>
            <Text style={styles.systemText}>DEVIT  //  ALBUM</Text>

            <View style={styles.instruments}>
              <Text style={styles.label}>[ PICTURE TYPE ]</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTab('developed');
                    setIsSelectionMode(false);
                    setSelectedPhotoIds([]);
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

              <Text style={styles.label}>[ MODE ]</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={toggleSelectionMode}
                  style={[styles.dashboardBtn, isSelectionMode && styles.dashboardBtnActive]}
                >
                  <Text style={[styles.btnText, isSelectionMode && styles.btnTextActive]}>
                    {isSelectionMode ? '選択モード解除' : '選択モードにする'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isSelectionMode && selectedPhotoIds.length > 0 && (
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
            </View>
          </View>
        </View>

        {/* Right side: photo grid */}
        <View style={styles.rightPanel}>
          {sortedPhotos.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {selectedTab === 'developed' ? '現像済みの写真はありません' : '現像待ちの写真はありません'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={sortedPhotos}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              numColumns={GRID_COLUMNS}
              columnWrapperStyle={styles.listRow}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      {/* Detail modal */}
      <Modal
        visible={selectedPhoto !== null}
        animationType="fade"
        onRequestClose={closeSelectedPhoto}
      >
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity style={styles.detailHeaderButton} onPress={closeSelectedPhoto}>
              <Text style={styles.detailHeaderText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailHeaderButton}
              onPress={() => selectedPhoto && openActionMenu(selectedPhoto)}
            >
              <Text style={styles.detailHeaderText}>•••</Text>
            </TouchableOpacity>
          </View>

          {selectedPhoto && (
            <FlatList
              data={sortedPhotos}
              horizontal
              decelerationRate="fast"
              snapToInterval={detailScrollInterval}
              snapToAlignment="start"
              disableIntervalMomentum
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => p.id.toString()}
              ItemSeparatorComponent={() => <View style={{ width: detailPhotoGap }} />}
              contentOffset={{ x: detailScrollInterval * selectedPhotoIndex, y: 0 }}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / detailScrollInterval);
                if (nextIndex < 0 || nextIndex >= sortedPhotos.length) return;
                setSelectedPhotoIndex(nextIndex);
                setSelectedPhoto(sortedPhotos[nextIndex]);
              }}
              renderItem={({ item }) => (
                <View style={[styles.detailImageWrap, { width: screenWidth }]}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.detailImage}
                    resizeMode="contain"
                    blurRadius={item.status === 'undeveloped' ? 22 : 0}
                  />
                  {item.status === 'undeveloped' && (
                    <BlurView
                      intensity={Platform.OS === 'ios' ? 22 : 0}
                      tint="default"
                      style={styles.detailBlurOverlay}
                    />
                  )}
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Action menu modal */}
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


