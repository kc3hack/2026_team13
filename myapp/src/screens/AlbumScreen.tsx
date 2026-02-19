import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import { deletePhoto, getPhotosByStatus, PhotoWithFilmName } from '../utils/sqlite';

interface AlbumScreenProps {
  onBack: () => void;
  onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
}

type PhotoTab = 'developed' | 'undeveloped';

const useFocusEffect = (effect: React.EffectCallback, deps: React.DependencyList) => {
  React.useEffect(effect, deps);
};

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack, onGoDarkroom }) => {
  const [photos, setPhotos] = useState<PhotoWithFilmName[]>([]);
  const [selectedTab, setSelectedTab] = useState<PhotoTab>('developed');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithFilmName | null>(null);
  const [menuTargetPhoto, setMenuTargetPhoto] = useState<PhotoWithFilmName | null>(null);

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

  const openActionMenu = (photo: PhotoWithFilmName) => {
    setMenuTargetPhoto(photo);
  };

  const closeActionMenu = () => {
    setMenuTargetPhoto(null);
  };

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
            setSelectedPhoto(null);
          }
          await load(selectedTab);
        },
      },
    ]);
  };

  const handleDevelop = (photo: PhotoWithFilmName) => {
    closeActionMenu();
    setSelectedPhoto(null);
    onGoDarkroom({
      id: photo.id,
      uri: photo.uri,
      filmId: photo.film_id,
    });
  };

  const handleSaveToDevice = async (photo: PhotoWithFilmName) => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('保存できません', '写真ライブラリへのアクセス権限が必要です');
      return;
    }

    try {
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      Alert.alert('保存完了', '写真を端末に保存しました');
      closeActionMenu();
    } catch {
      Alert.alert('保存失敗', '写真の保存に失敗しました');
    }
  };

  const renderItem = ({ item }: { item: PhotoWithFilmName }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setSelectedPhoto(item)}
      onLongPress={() => openActionMenu(item)}
      style={styles.photoItem}
    >
      <View style={styles.photoWrap}>
        <Image source={{ uri: item.uri }} style={styles.photo} blurRadius={selectedTab === 'undeveloped' ? 10 : 0} />
        {selectedTab === 'undeveloped' && (
          <BlurView
            intensity={Platform.OS === 'ios' ? 8 : 0}
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
    <SafeAreaView style={styles.container}>
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
        {photos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {selectedTab === 'developed' ? '現像済みの写真はありません' : '現像待ちの写真はありません'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={p => p.id.toString()}
            renderItem={renderItem}
            numColumns={3}
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      <Modal visible={selectedPhoto !== null} animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity style={styles.detailHeaderButton} onPress={() => setSelectedPhoto(null)}>
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
            <View style={styles.detailImageWrap}>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.detailImage}
                resizeMode="contain"
                blurRadius={selectedPhoto.status === 'undeveloped' ? 14 : 0}
              />
              {selectedPhoto.status === 'undeveloped' && (
                <BlurView
                  intensity={Platform.OS === 'ios' ? 10 : 0}
                  tint="default"
                  style={styles.detailBlurOverlay}
                />
              )}
            </View>
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
