import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  size?: number;
  label?: string;
  accentColor?: string;
  subtitleColor?: string;
};

export default function ProfilePicturePicker({
  imageUri,
  onImageSelected,
  size = 120,
  label = 'Add Photo (Optional)',
  accentColor = '#38BDF8',
  subtitleColor = '#94A3B8',
}: Props) {

  const pickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', `Please allow access to your ${useCamera ? 'camera' : 'photo library'}.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  const handlePress = () => {
    if (Platform.OS === 'web') {
      pickImage(false);
      return;
    }
    Alert.alert('Select Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: imageUri ? accentColor : subtitleColor,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Ionicons name="camera-outline" size={size * 0.3} color={subtitleColor} />
          </View>
        )}
        {/* Edit badge */}
        <View style={[styles.editBadge, { backgroundColor: accentColor }]}>
          <Ionicons name={imageUri ? 'pencil' : 'add'} size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text style={[styles.label, { color: subtitleColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  container: {
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
});
