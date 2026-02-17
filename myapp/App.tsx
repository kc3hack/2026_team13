import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// クラスコンポーネントから関数コンポーネントに書き換え
const ImagePickerExample: React.FC = () => {
  // ステートの型定義: string | null
  const [image, setImage] = useState<string | null>(null);

  // カメラを起動する関数
  const _camera = async (): Promise<void> => {
    // 権限確認
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("エラー", "カメラへのアクセス権限が必要です。");
      return;
    }

    let result = await ImagePicker.launchCameraAsync();

    console.log(result);

    // 最新の仕様に合わせて修正
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ライブラリから画像を選択する関数
  const _pickImage = async (): Promise<void> => {
    // 権限確認
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

    // 最新の仕様に合わせて修正
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title="Pick an image from camera roll"
        onPress={_pickImage}
      />
      <View style={styles.separator} />
      <Button
        title="Enjoy Camera!"
        onPress={_camera}
      />
      {image &&
        <Image source={{ uri: image }} style={styles.image} />}
    </View>
  );
};

// スタイルを別定義して見やすく
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 20,
  },
  separator: {
    height: 10,
  }
});

export default ImagePickerExample;