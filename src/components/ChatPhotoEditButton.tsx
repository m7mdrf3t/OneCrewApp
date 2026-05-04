/**
 * Chat "Edit & send photo" button.
 * Picks an image, opens the open-source photo editor (draw & highlight via Skia),
 * then adds the edited image to the message composer via attachmentManager.uploadFiles().
 * Must be rendered inside Stream Chat's Channel/MessageInput tree.
 *
 * For more features (crop, filters, text, stickers) consider adding an open-source
 * full editor (e.g. react-native-photo-editor) and wiring it here after native setup.
 */

import React, { useCallback, useState } from 'react';
import { TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessageComposer, useMessageInputContext } from 'stream-chat-react-native';
import MediaPickerService from '../services/MediaPickerService';
import { PhotoEditorModal } from './PhotoEditorModal';

let RNBlobUtil: typeof import('react-native-blob-util').default | null = null;
try {
  RNBlobUtil = require('react-native-blob-util').default;
} catch {
  // optional: used for file size on Android
}

export const ChatPhotoEditButton: React.FC = () => {
  const { attachmentManager } = useMessageComposer();
  const { asyncMessagesMultiSendEnabled, sendMessage } = useMessageInputContext();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorImageUri, setEditorImageUri] = useState<string | null>(null);

  const openPicker = useCallback(async () => {
    try {
      const hasPermission = await MediaPickerService.getInstance().requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photos to send images.'
        );
        return;
      }
      const result = await MediaPickerService.getInstance().pickImage({
        mediaTypes: 'images',
        quality: 0.9,
        allowsEditing: false,
      });
      if (result?.uri) {
        setEditorImageUri(result.uri);
        setEditorVisible(true);
      }
    } catch (e) {
      console.error('ChatPhotoEditButton pick error:', e);
      Alert.alert('Error', 'Could not open photo picker.');
    }
  }, []);

  const handleEditorSave = useCallback(
    async (editedUri: string) => {
      setEditorVisible(false);
      setEditorImageUri(null);
      try {
        const name = `edited_${Date.now()}.jpg`;
        let size = 0;
        const pathForStat = editedUri.replace(/^file:\/\//, '');
        if (RNBlobUtil?.fs?.stat) {
          try {
            const stat = await RNBlobUtil.fs.stat(pathForStat);
            size = stat.size ?? 0;
          } catch {
            // use 0
          }
        }
        const fileRef = {
          uri: editedUri,
          name,
          size,
          type: 'image/jpeg',
        };
        await attachmentManager.uploadFiles([fileRef]);
        if (!asyncMessagesMultiSendEnabled) {
          setTimeout(() => {
            try {
              sendMessage();
            } catch (_) {}
          }, 100);
        }
      } catch (e) {
        console.error('ChatPhotoEditButton upload error:', e);
        Alert.alert('Error', 'Failed to add photo to message.');
      }
    },
    [attachmentManager, asyncMessagesMultiSendEnabled, sendMessage]
  );

  const handleEditorCancel = useCallback(() => {
    setEditorVisible(false);
    setEditorImageUri(null);
  }, []);

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        style={styles.button}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="image" size={24} color="#3b82f6" />
      </TouchableOpacity>
      {editorImageUri ? (
        <PhotoEditorModal
          visible={editorVisible}
          imageUri={editorImageUri}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
