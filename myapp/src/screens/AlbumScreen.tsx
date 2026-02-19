import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList, Image, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { deletePhoto, getAllFilms, getPhotosByStatus, Photo } from '../utils/sqlite';

interface AlbumScreenProps {
  onBack: () => void;
}

type PhotoTab = 'developed' | 'undeveloped';

const useFocusEffect = (effect: React.EffectCallback, deps: React.DependencyList) => {
  useEffect(effect, deps);
};

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filmNameById, setFilmNameById] = useState<Record<number, string>>({});
  const [selectedTab, setSelectedTab] = useState<PhotoTab>('developed');

  const load = useCallback(async (status: PhotoTab) => {
    const [list, films] = await Promise.all([getPhotosByStatus(status), getAllFilms()]);
    const nameMap: Record<number, string> = {};
    for (const film of films) {
      nameMap[film.id] = film.name;
    }

    setPhotos(list);
    setFilmNameById(nameMap);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(selectedTab);
    }, [load, selectedTab]),
    [load, selectedTab],
  );

  const renderItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={async () => {
        Alert.alert('削除', 'この写真を削除しますか？', [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              await deletePhoto(item.id);
              void load(selectedTab);
            },
          },
        ]);
      }}
      style={styles.photoItem}
    >
      <View style={styles.photoWrap}>
        <Image source={{ uri: item.uri }} style={styles.photo} />
        {selectedTab === 'undeveloped' && (
          <BlurView
            intensity={20}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={styles.photoBlurOverlay}
          />
        )}
      </View>
      <Text style={styles.metaText}>状態: {item.status === 'developed' ? '現像済み' : '現像前'}</Text>
      <Text style={styles.metaText}>フィルム: {filmNameById[item.film_id] ?? '不明'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← ホームに戻る</Text>
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
    color: '#2B2B2B',
    fontSize: 16,
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
  },
  metaText: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 14,
  },
});
