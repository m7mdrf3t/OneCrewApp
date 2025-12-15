import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import UploadProgressBar from './UploadProgressBar';

interface ImageUploadWithProgressProps {
  imageUrl?: string;
  placeholderSize?: { width: number; height: number };
  borderRadius?: number;
  isUploading: boolean;
  uploadProgress?: number;
  uploadLabel?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

const ImageUploadWithProgress: React.FC<ImageUploadWithProgressProps> = ({
  imageUrl,
  placeholderSize = { width: 120, height: 120 },
  borderRadius = 8,
  isUploading,
  uploadProgress,
  uploadLabel = 'Uploading...',
  children,
  onPress,
  disabled = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when imageUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <View style={[styles.container, { width: placeholderSize.width, height: placeholderSize.height, borderRadius }]}>
      {/* White placeholder background */}
      <View style={[styles.placeholder, { width: placeholderSize.width, height: placeholderSize.height, borderRadius }]}>
        {/* Show image if available and no error */}
        {imageUrl && !imageError && (
          <Image 
            source={{ uri: imageUrl }} 
            style={[styles.image, { width: placeholderSize.width, height: placeholderSize.height, borderRadius }]}
            resizeMode="cover"
            onError={() => {
              console.warn('Failed to load image:', imageUrl);
              setImageError(true);
            }}
          />
        )}
        
        {/* Show placeholder content (children) when no image or image error */}
        {(!imageUrl || imageError) && (
          <View style={styles.placeholderContent}>
            {children}
          </View>
        )}
        
        {/* Progress overlay when uploading - shows over image or placeholder */}
        {isUploading && (
          <View style={[styles.progressOverlay, { borderRadius }]}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <View style={styles.progressBarWrapper}>
              <UploadProgressBar
                progress={uploadProgress}
                label={uploadLabel}
                visible={true}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  progressBarWrapper: {
    width: '100%',
    marginTop: 12,
  },
});

export default ImageUploadWithProgress;

