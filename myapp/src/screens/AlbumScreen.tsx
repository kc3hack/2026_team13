import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList, Image, Alert } from 'react-native';
import { fetchPhotos, deletePhoto, Photo } from '../utils/sqlite';

interface AlbumScreenProps {
  onBack: () => void;
}

export const AlbumScreen: React.FC<AlbumScreenProps> = ({ onBack }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const load = async () => {
    const list = await fetchPhotos();
    setPhotos(list);
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
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← ホームに戻る</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>現像済み写真</Text>
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
    color: '#2B2B2B',
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1E1E',
    letterSpacing: 1,
  },
  list: {
    marginTop: 20,
  },
  photo: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
  },
});
