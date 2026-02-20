import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View, Alert, Text, TouchableOpacity, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { BlurView } from 'expo-blur';
import { FilmInventory, FILM_META, FilmType, RewardFilmType } from '../types';
import { addFilm, addPhoto, consumeFilm, getAllFilms, getFilmInventory, initDatabase } from '../utils/sqlite';
import { getMenuBackgroundMode, MenuBackgroundMode } from '../utils/storage';
import { styles } from '../styles/ImagePickerScreen.styles';

interface ImagePickerScreenProps {
  onBack: () => void;
  onGoCamera: (filmType: RewardFilmType, filmId: number) => void;
}

export const ImagePickerScreen: React.FC<ImagePickerScreenProps> = ({ onBack, onGoCamera }) => {
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filmInventory, setFilmInventory] = useState<FilmInventory>({ mono: 0, vivid: 0, retro: 0 });
  const [filmIdByType, setFilmIdByType] = useState<Record<RewardFilmType, number | null>>({
    mono: null,
    vivid: null,
    retro: null,
  });
  const [selectedFilmType, setSelectedFilmType] = useState<RewardFilmType | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<MenuBackgroundMode>('light');
  const isDarkBackground = backgroundMode === 'dark';

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

  useEffect(() => {
    void (async () => {
      const mode = await getMenuBackgroundMode();
      setBackgroundMode(mode);
    })();
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

      const persistImageUri = async (sourceUri: string): Promise<string> => {
        try {
          const fileName = sourceUri.split('/').pop() || `photo_${Date.now()}.jpg`;
          const extMatch = fileName.match(/\.[a-zA-Z0-9]+$/);
          const extension = extMatch ? extMatch[0] : '.jpg';
          const basePath = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

          if (!basePath) {
            return sourceUri;
          }

          const targetDir = `${basePath}photos/`;
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
          const targetUri = `${targetDir}${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`;

          await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
          return targetUri;
        } catch (error) {
          console.log('failed to persist photo uri', error);
          return sourceUri;
        }
      };

      const persistedUri = await persistImageUri(uri);
      await addPhoto(persistedUri, selectedFilmId, 'undeveloped');
      setImage(persistedUri);
      await loadFilmState();
      onBack();
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

  const _goToCustomCamera = () => {
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

    onGoCamera(selectedFilmType, selectedFilmId);
  };

  return (
    <View style={[styles.container, isDarkBackground && styles.containerDark]}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backButtonText, isDarkBackground && styles.textDarkPrimary]}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={[styles.title, isDarkBackground && styles.textDarkPrimary]}>Camera</Text>

      <View style={styles.selectorWrap}>
        <Text style={[styles.selectorTitle, isDarkBackground && styles.textDarkSub]}>フィルムを選択</Text>
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
                  isDarkBackground && styles.filmChipDark,
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
                <View style={styles.filmChipTitleRow}>
                  <Image source={meta.image} style={styles.filmChipImage} />
                  <Text style={[styles.filmChipTitle, isSelected && styles.filmChipTitleSelected, !isSelectable && styles.filmChipTitleDisabled]}>
                    {meta.label}
                  </Text>
                </View>
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
        <TouchableOpacity
          style={[styles.cameraButton, saving && styles.cameraButtonDisabled]}
          onPress={_goToCustomCamera}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.cameraButtonText}>📷 Enjoy Camera!</Text>
        </TouchableOpacity>
      </View>

      {saving && <ActivityIndicator size="small" color="#007AFF" />}
      
      {image &&
        <View style={styles.imageWrap}>
          <Image source={{ uri: image }} style={styles.image} />
          <BlurView
            intensity={36}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={styles.imageBlurOverlay}
          />
        </View>
      }
    </View>
  );
};


