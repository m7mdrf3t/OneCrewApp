import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaPickerService, { MediaPickerResult } from '../services/MediaPickerService';

const ImagePickerDemo: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<MediaPickerResult | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaPickerResult | null>(null);
  const mediaPicker = MediaPickerService.getInstance();

  const pickImage = async () => {
    try {
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (result) {
        setSelectedImage(result);
        Alert.alert('Success', 'Image selected successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await mediaPicker.takePhoto({
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (result) {
        setSelectedImage(result);
        Alert.alert('Success', 'Photo taken successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await mediaPicker.pickVideo({
        quality: 0.8,
      });

      if (result) {
        setSelectedVideo(result);
        Alert.alert('Success', 'Video selected successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick video');
    }
  };

  const recordVideo = async () => {
    try {
      const result = await mediaPicker.recordVideo({
        quality: 0.8,
      });

      if (result) {
        setSelectedVideo(result);
        Alert.alert('Success', 'Video recorded successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record video');
    }
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setSelectedVideo(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Image & Video Picker Demo</Text>
      
      {/* Image Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Image Selection</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Choose Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Selected Image:</Text>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <Text style={styles.previewInfo}>
              Size: {selectedImage.fileSize ? mediaPicker.formatFileSize(selectedImage.fileSize) : 'Unknown'}
            </Text>
            <Text style={styles.previewInfo}>
              Dimensions: {selectedImage.width}x{selectedImage.height}
            </Text>
          </View>
        )}
      </View>

      {/* Video Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Video Selection</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Choose Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={recordVideo}>
            <Ionicons name="videocam" size={24} color="#fff" />
            <Text style={styles.buttonText}>Record Video</Text>
          </TouchableOpacity>
        </View>

        {selectedVideo && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Selected Video:</Text>
            <View style={styles.videoPreview}>
              <Ionicons name="play-circle" size={48} color="#fff" />
              <Text style={styles.videoText}>Video Selected</Text>
            </View>
            <Text style={styles.previewInfo}>
              Size: {selectedVideo.fileSize ? mediaPicker.formatFileSize(selectedVideo.fileSize) : 'Unknown'}
            </Text>
            <Text style={styles.previewInfo}>
              Duration: {selectedVideo.duration ? `${Math.round(selectedVideo.duration)}s` : 'Unknown'}
            </Text>
            <Text style={styles.previewInfo}>
              Dimensions: {selectedVideo.width}x{selectedVideo.height}
            </Text>
          </View>
        )}
      </View>

      {/* Clear Button */}
      <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.buttonText}>Clear All</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#111827',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#374151',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  previewContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#374151',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  previewInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
  },
});

export default ImagePickerDemo;
