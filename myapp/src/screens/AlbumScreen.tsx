import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
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
import { deletePhoto, getPhotosByStatus, PhotoWithFilmName } from '../utils/sqlite';

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
  const [menuTargetPhoto, setMenuTargetPhoto] = useState<PhotoWithFilmName | null>(null);

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

    onBack();
    return true;
  }, [menuTargetPhoto, selectedPhoto, closeActionMenu, closeSelectedPhoto, onBack]);

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

  const handleSaveToDevice = async (photo: PhotoWithFilmName) => {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      Alert.alert('保存できません', '写真ライブラリへのアクセス権限が必要です');
      return;
    }

    const resolveSavableUri = async (uri: string): Promise<string> => {
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
    };

    try {
      const savableUri = await resolveSavableUri(photo.uri);
      await MediaLibrary.saveToLibraryAsync(savableUri);
      Alert.alert('保存完了', '写真を端末に保存しました');
      closeActionMenu();
    } catch (firstError) {
      try {
        const savableUri = await resolveSavableUri(photo.uri);
        await MediaLibrary.createAssetAsync(savableUri);
        Alert.alert('保存完了', '写真を端末に保存しました');
        closeActionMenu();
      } catch (secondError) {
        console.log('failed to save photo to device', { firstError, secondError, uri: photo.uri });
        Alert.alert('保存失敗', '写真の保存に失敗しました');
      }
    }
  };

  const renderItem = ({ item, index }: { item: PhotoWithFilmName; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        setSelectedPhoto(item);
        setSelectedPhotoIndex(index);
      }}
      onLongPress={() => openActionMenu(item)}
      style={styles.photoItem}
    >
      <View style={styles.photoWrap}>
        <Image
          source={{ uri: item.uri }}
          style={styles.photo}
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
      </View>
      <Text style={styles.metaText}>状態: {item.status === 'developed' ? '現像済み' : '現像前'}</Text>
      <Text style={styles.metaText}>フィルム: {item.film_name ?? '不明'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} {...iosEdgeBackPanResponder.panHandlers}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setSelectedTab('developed')}
        >
          <Text style={[styles.tabText, selectedTab === 'developed' && styles.tabTextActive]}>現像済み</Text>
          {selectedTab === 'developed' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setSelectedTab('undeveloped')}
        >
          <Text style={[styles.tabText, selectedTab === 'undeveloped' && styles.tabTextActive]}>未現像</Text>
          {selectedTab === 'undeveloped' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{selectedTab === 'developed' ? '現像済みアルバム' : '現像待ちアルバム'}</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={rotateSortOrder}
        >
          <Text style={styles.sortButtonText}>{sortOrderLabelMap[sortOrder]}</Text>
        </TouchableOpacity>
        {sortedPhotos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {selectedTab === 'developed' ? '現像済みの写真はありません' : '現像待ちの写真はありません'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedPhotos}
            keyExtractor={p => p.id.toString()}
            renderItem={renderItem}
            numColumns={3}
            contentContainerStyle={styles.list}
          />
        )}
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    marginTop: 6,
  },
  tabItem: {
    width: 140,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    color: '#787878',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
  tabIndicator: {
    marginTop: 8,
    width: 76,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1E1E1E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sortButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#3A3A3A',
    fontWeight: '600',
  },
  list: {
    marginTop: 20,
    paddingBottom: 20,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666666',
    fontSize: 14,
  },
  photoItem: {
    width: 108,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  photoWrap: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: 100,
    height: 100,
  },
  photoBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  metaText: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 14,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  detailHeader: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailHeaderButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  detailHeaderText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  detailImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  detailImage: {
    width: '100%',
    height: '78%',
  },
  detailBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: '11%',
    bottom: '11%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuBackdropDismiss: {
    flex: 1,
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  menuActionButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  menuActionText: {
    fontSize: 15,
    color: '#2B2B2B',
  },
  menuDangerButton: {
    marginTop: 2,
  },
  menuDangerText: {
    fontSize: 15,
    color: '#D63A3A',
    fontWeight: '600',
  },
  menuInfoWrap: {
    marginTop: 14,
  },
  menuInfoLabel: {
    fontSize: 12,
    color: '#888888',
  },
  menuInfoTopMargin: {
    marginTop: 10,
  },
  menuInfoValue: {
    fontSize: 14,
    color: '#1E1E1E',
    marginTop: 2,
  },
});
