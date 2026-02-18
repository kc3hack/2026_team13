import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList, Image, Alert } from 'react-native';
import { deletePhoto, fetchPhotos, getAllFilms, Photo } from '../utils/sqlite';

interface AlbumScreenProps {
  onBack: () => void;
}

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filmNameById, setFilmNameById] = useState<Record<number, string>>({});

  const load = async () => {
    const [list, films] = await Promise.all([fetchPhotos(), getAllFilms()]);
    const nameMap: Record<number, string> = {};
    for (const film of films) {
      nameMap[film.id] = film.name;
    }

    setPhotos(list);
    setFilmNameById(nameMap);
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      onLongPress={async () => {
        Alert.alert('削除', 'この写真を削除しますか？', [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              await deletePhoto(item.id);
              load();
            },
          },
        ]);
      }}
      style={styles.photoItem}
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
      <Text style={styles.metaText}>状態: {item.status === 'developed' ? '現像済み' : '現像前'}</Text>
      <Text style={styles.metaText}>フィルム: {filmNameById[item.film_id] ?? '不明'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>アルバム（現像前 / 現像済み）</Text>
        <FlatList
          data={photos}
          keyExtractor={p => p.id.toString()}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.list}
        />
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
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
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
  photoItem: {
    width: 108,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  photo: {
    width: 100,
    height: 100,
    marginBottom: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 14,
  },
});
