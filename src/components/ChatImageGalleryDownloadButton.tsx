import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let RNBlobUtil: typeof import('react-native-blob-util').default | null = null;
let MediaLibrary: typeof import('expo-media-library') | null = null;
try {
  RNBlobUtil = require('react-native-blob-util').default;
} catch {
  // Native module not available
}
try {
  MediaLibrary = require('expo-media-library');
} catch {
  // expo-media-library not available
}

export type ChatGalleryPhoto = {
  messageId?: string;
  mime_type?: string;
  type?: string;
  uri?: string;
  user?: {
    id?: string | null;
  } | null;
};

type Props = {
  photo?: ChatGalleryPhoto;
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const getFileExtension = (photo?: ChatGalleryPhoto) => {
  const mimeExtension = photo?.mime_type ? MIME_EXTENSION_MAP[photo.mime_type.toLowerCase()] : undefined;
  if (mimeExtension) {
    return mimeExtension;
  }

  const uriWithoutQuery = (photo?.uri || '').split('?')[0];
  const uriParts = uriWithoutQuery.split('.');
  const uriExtension = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : '';

  if (uriExtension && uriExtension.length <= 5) {
    return uriExtension;
  }

  return 'jpg';
};

const sanitizeFileNamePart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

const buildFileName = (photo?: ChatGalleryPhoto) => {
  const extension = getFileExtension(photo);
  const userId = sanitizeFileNamePart(photo?.user?.id || 'chat-image');
  const messageId = sanitizeFileNamePart(photo?.messageId || `${Date.now()}`);
  return `${userId}-${messageId}.${extension}`;
};

const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

export const ChatImageGalleryDownloadButton = ({ photo }: Props) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!photo?.uri || isSaving) {
      return;
    }
    if (!MediaLibrary) {
      Alert.alert('Download failed', 'Saving to photo library is not available on this device.');
      return;
    }
    if (isRemoteUri(photo.uri) && !RNBlobUtil) {
      Alert.alert('Download failed', 'Saving remote images is not available on this device.');
      return;
    }

    let tempPath: string | null = null;

    try {
      setIsSaving(true);

      const permissionResponse =
        Platform.OS === 'android'
          ? await MediaLibrary.requestPermissionsAsync(true, ['photo'])
          : await MediaLibrary.requestPermissionsAsync(true);

      if (!permissionResponse.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo library access to save chat images to your device.',
        );
        return;
      }

      let fileUri: string;
      if (isRemoteUri(photo.uri) && RNBlobUtil) {
        const cachePath = `${RNBlobUtil.fs.dirs.CacheDir}/${buildFileName(photo)}`;
        const res = await RNBlobUtil.config({ fileCache: true, path: cachePath }).fetch(
          'GET',
          photo.uri,
        );
        const savedPath = typeof res.path === 'function' ? res.path() : res.path ?? cachePath;
        tempPath = savedPath;
        fileUri = savedPath.startsWith('file://') ? savedPath : `file://${savedPath}`;
      } else {
        fileUri = photo.uri.startsWith('file://') ? photo.uri : `file://${photo.uri}`;
      }

      if (Platform.OS === 'android' && fileUri.startsWith('file://') && !fileUri.startsWith('file:///')) {
        fileUri = 'file:///' + fileUri.replace(/^file:\/\//, '');
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);

      Alert.alert('Saved', 'Image downloaded to your device.');
    } catch (error) {
      console.error('❌ [ChatImageGalleryDownloadButton] Failed to save image:', error);
      Alert.alert('Download failed', 'The image could not be saved right now.');
    } finally {
      if (tempPath && RNBlobUtil?.fs?.unlink) {
        RNBlobUtil.fs.unlink(tempPath).catch(() => undefined);
      }
      setIsSaving(false);
    }
  }, [isSaving, photo]);

  if (!photo?.uri || photo.type === 'video') {
    return <View style={styles.placeholder} />;
  }

  return (
    <Pressable
      accessibilityLabel="Download image"
      disabled={isSaving}
      hitSlop={12}
      onPress={handleDownload}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      {isSaving ? (
        <ActivityIndicator size="small" color="#111827" />
      ) : (
        <Ionicons name="download-outline" size={22} color="#111827" />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  placeholder: {
    width: 32,
  },
});
