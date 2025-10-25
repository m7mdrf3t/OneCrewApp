import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface MediaPickerResult {
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number; // for videos
}

export interface MediaPickerOptions {
  allowsEditing?: boolean;
  quality?: number; // 0-1 for images
  videoQuality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
  aspect?: [number, number];
  mediaTypes?: 'images' | 'videos' | 'all';
}

class MediaPickerService {
  private static instance: MediaPickerService;

  public static getInstance(): MediaPickerService {
    if (!MediaPickerService.instance) {
      MediaPickerService.instance = new MediaPickerService();
    }
    return MediaPickerService.instance;
  }

  /**
   * Request permissions for camera and media library
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      // Request media library permissions
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      const hasCameraPermission = cameraPermission.status === 'granted';
      const hasMediaLibraryPermission = mediaLibraryPermission.status === 'granted';

      if (!hasCameraPermission || !hasMediaLibraryPermission) {
        console.warn('Media picker permissions not granted:', {
          camera: cameraPermission.status,
          mediaLibrary: mediaLibraryPermission.status
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting media picker permissions:', error);
      return false;
    }
  }

  /**
   * Pick an image from the device gallery
   */
  async pickImage(options: MediaPickerOptions = {}): Promise<MediaPickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.mediaTypes === 'videos' ? ImagePicker.MediaTypeOptions.Videos : 
                   options.mediaTypes === 'images' ? ImagePicker.MediaTypeOptions.Images :
                   ImagePicker.MediaTypeOptions.All,
        allowsEditing: options.allowsEditing || false,
        quality: options.quality || 0.8,
        aspect: options.aspect,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      return {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize || undefined,
        width: asset.width || undefined,
        height: asset.height || undefined,
        duration: asset.duration || undefined,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Take a photo using the camera
   */
  async takePhoto(options: MediaPickerOptions = {}): Promise<MediaPickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera and media library permissions are required');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: options.mediaTypes === 'videos' ? ImagePicker.MediaTypeOptions.Videos : 
                   options.mediaTypes === 'images' ? ImagePicker.MediaTypeOptions.Images :
                   ImagePicker.MediaTypeOptions.All,
        allowsEditing: options.allowsEditing || false,
        quality: options.quality || 0.8,
        aspect: options.aspect,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      return {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        fileName: asset.fileName || undefined,
        fileSize: asset.fileSize || undefined,
        width: asset.width || undefined,
        height: asset.height || undefined,
        duration: asset.duration || undefined,
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  /**
   * Pick a video from the device gallery
   */
  async pickVideo(options: MediaPickerOptions = {}): Promise<MediaPickerResult | null> {
    return this.pickImage({ ...options, mediaTypes: 'videos' });
  }

  /**
   * Record a video using the camera
   */
  async recordVideo(options: MediaPickerOptions = {}): Promise<MediaPickerResult | null> {
    return this.takePhoto({ ...options, mediaTypes: 'videos' });
  }

  /**
   * Upload media to a server (you'll need to implement this based on your backend)
   */
  async uploadMedia(media: MediaPickerResult, uploadUrl: string): Promise<string> {
    try {
      const formData = new FormData();
      
      // Create file object for upload
      const file = {
        uri: media.uri,
        type: media.type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: media.fileName || `media_${Date.now()}.${media.type === 'image' ? 'jpg' : 'mp4'}`,
      } as any;

      formData.append('file', file);
      formData.append('type', media.type);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.url || result.uri || result.path;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file size (in bytes)
   */
  validateFileSize(fileSize: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
  }

  /**
   * Get optimal image dimensions for display
   */
  getOptimalDimensions(originalWidth: number, originalHeight: number, maxWidth: number = 300, maxHeight: number = 300) {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }
}

export default MediaPickerService;
