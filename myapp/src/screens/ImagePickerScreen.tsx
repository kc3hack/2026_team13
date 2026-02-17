import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface ImagePickerScreenProps {
  onBack: () => void;
}

export const ImagePickerScreen: React.FC<ImagePickerScreenProps> = ({ onBack }) => {
  const [image, setImage] = useState<string | null>(null);

  const _camera = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("エラー", "カメラへのアクセス権限が必要です。");
      return;
    }

    let result = await ImagePicker.launchCameraAsync();

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
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
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Camera & Gallery</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Pick an image from camera roll"
          onPress={_pickImage}
        />
        <View style={styles.separator} />
        <Button
          title="Enjoy Camera!"
          onPress={_camera}
        />
      </View>
      
      {image &&
        <Image source={{ uri: image }} style={styles.image} />}
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
    marginBottom: 30,
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
