import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, ScrollView, View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FilmInventory, FILM_META, FilmType, RewardFilmType } from '../types';
import { addFilm, addPhoto, consumeFilm, getAllFilms, getFilmInventory, initDatabase } from '../utils/sqlite';

interface ImagePickerScreenProps {
  onBack: () => void;
  onGoDarkroom: (photo: { id: number; uri: string; filmId: number }) => void;
}

export const ImagePickerScreen: React.FC<ImagePickerScreenProps> = ({ onBack, onGoDarkroom }) => {
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({ mono: 0, vivid: 0, retro: 0 });
  const [filmIdByType, setFilmIdByType] = useState<Record<RewardFilmType, number | null>>({
    mono: null,
    vivid: null,
    retro: null,
  });
  const [selectedFilmType, setSelectedFilmType] = useState<RewardFilmType | null>(null);

  const resolveFilmIdByType = (films: FilmType[]): Record<RewardFilmType, number | null> => {
    const byEffect = new Map<string, number>();
    for (const film of films) {
      const key = film.effect_type.toLowerCase();
      if (!byEffect.has(key)) {
        byEffect.set(key, film.id);
      }
    }

    const findFallbackId = (patterns: string[]) => {
      const lowerPatterns = patterns.map((pattern) => pattern.toLowerCase());
      const matched = films.find((film) => {
        const name = film.name.toLowerCase();
        return lowerPatterns.some((pattern) => name === pattern || name.includes(pattern));
      });
      return matched?.id ?? null;
    };

    return {
      mono: byEffect.get('mono') ?? findFallbackId(['mono', 'monochrome']),
      vivid: byEffect.get('vivid') ?? findFallbackId(['vivid']),
      retro: byEffect.get('retro') ?? findFallbackId(['retro', 'vintage']),
    };
  };

  const loadFilmState = async (): Promise<void> => {
    try {
      await initDatabase();
      const [films, inventory] = await Promise.all([getAllFilms(), getFilmInventory()]);
      const mapping = resolveFilmIdByType(films);

      setFilmInventory(inventory);
      setFilmIdByType(mapping);

      const firstOwned = (['mono', 'vivid', 'retro'] as RewardFilmType[]).find(
        (type) => inventory[type] > 0 && mapping[type] !== null,
      ) ?? null;

      setSelectedFilmType((prev) => {
        if (prev && inventory[prev] > 0 && mapping[prev] !== null) {
          return prev;
        }
        return firstOwned;
      });
    } catch (error) {
      console.log('film load error', error);
    }
  };

  useEffect(() => {
    void loadFilmState();
  }, []);

  const saveAndAskDevelop = async (uri: string) => {
    if (!selectedFilmType) {
      Alert.alert('フィルム未選択', '利用するフィルムを選択してください。');
      return;
    }

    const selectedFilmId = filmIdByType[selectedFilmType];
    if (!selectedFilmId) {
      Alert.alert('エラー', '選択したフィルム情報が見つかりません。');
      return;
    }

    if (filmInventory[selectedFilmType] <= 0) {
      Alert.alert('フィルム不足', 'このフィルムは所持していません。');
      return;
    }

    let consumed = false;
    try {
      setSaving(true);
      consumed = await consumeFilm(selectedFilmType);
      if (!consumed) {
        Alert.alert('フィルム不足', 'このフィルムは所持していません。');
        await loadFilmState();
        return;
      }

      const photoId = await addPhoto(uri, selectedFilmId, 'undeveloped');
      setImage(uri);
      await loadFilmState();

      Alert.alert('保存完了', '今すぐ暗室（現像）に行きますか？', [
        {
          text: '行かない',
          style: 'cancel',
          onPress: () => onBack(),
        },
        {
          text: '行く',
          onPress: () => onGoDarkroom({ id: photoId, uri, filmId: selectedFilmId }),
        },
      ]);
    } catch (e) {
      console.log(e);
      if (consumed && selectedFilmType) {
        await addFilm(selectedFilmType, 1);
      }
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const _camera = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("エラー", "カメラへのアクセス権限が必要です。");
      return;
    }

    let result = await ImagePicker.launchCameraAsync();

    console.log(result);

    if (!result.canceled) {
      await saveAndAskDevelop(result.assets[0].uri);
    }
  };

  const _pickImage = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("エラー", "カメラロールへのアクセス権限が必要です。");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      await saveAndAskDevelop(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Camera & Gallery</Text>

      <View style={styles.selectorWrap}>
        <Text style={styles.selectorTitle}>フィルムを選択</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {(['mono', 'vivid', 'retro'] as RewardFilmType[]).map((type) => {
            const isSelected = type === selectedFilmType;
            const isOwned = filmInventory[type] > 0;
            const isSelectable = isOwned && filmIdByType[type] !== null;
            const meta = FILM_META[type];

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filmChip,
                  isSelected && styles.filmChipSelected,
                  !isSelectable && styles.filmChipDisabled,
                ]}
                onPress={() => {
                  if (isSelectable && !saving) {
                    setSelectedFilmType(type);
                  }
                }}
                disabled={saving || !isSelectable}
              >
                <Text style={[styles.filmChipTitle, isSelected && styles.filmChipTitleSelected, !isSelectable && styles.filmChipTitleDisabled]}>
                  {meta.emoji} {meta.label}
                </Text>
                <Text
                  style={[
                    styles.filmChipDesc,
                    isSelected && styles.filmChipDescSelected,
                    !isSelectable && styles.filmChipDescDisabled,
                  ]}
                  numberOfLines={1}
                >
                  所持数: {filmInventory[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Pick an image from camera roll"
          onPress={_pickImage}
          disabled={saving}
        />
        <View style={styles.separator} />
        <Button
          title="Enjoy Camera!"
          onPress={_camera}
          disabled={saving}
        />
      </View>

      {saving && <ActivityIndicator size="small" color="#007AFF" />}
      
      {image &&
        <Image source={{ uri: image }} style={styles.image} />
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectorWrap: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  selectorTitle: {
    fontSize: 14,
    color: '#2A2A2A',
    marginBottom: 8,
    fontWeight: '600',
  },
  selectorRow: {
    paddingRight: 20,
    gap: 10,
  },
  filmChip: {
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  filmChipSelected: {
    borderColor: '#222222',
    backgroundColor: '#F3F3F3',
  },
  filmChipDisabled: {
    backgroundColor: '#F7F7F7',
    borderColor: '#E4E4E4',
  },
  filmChipTitle: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  filmChipTitleSelected: {
    color: '#111111',
  },
  filmChipTitleDisabled: {
    color: '#A6A6A6',
  },
  filmChipDesc: {
    color: '#666666',
    fontSize: 12,
  },
  filmChipDescSelected: {
    color: '#3E3E3E',
  },
  filmChipDescDisabled: {
    color: '#A8A8A8',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 20,
    borderRadius: 10,
  },
  separator: {
    height: 10,
  }
});
