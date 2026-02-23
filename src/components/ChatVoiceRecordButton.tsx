/**
 * Fallback voice record button for chat when Stream Chat's native audio modules are not available.
 * Uses expo-av to record and uploads as a voice attachment via the message composer.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { LocalVoiceRecordingAttachment } from 'stream-chat';
import { useMessageComposer, useMessageInputContext } from 'stream-chat-react-native';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const ChatVoiceRecordButton: React.FC = () => {
  const { attachmentManager } = useMessageComposer();
  const { asyncMessagesMultiSendEnabled, sendMessage } = useMessageInputContext();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  useEffect(() => {
    if (__DEV__) console.log('💬 [ChatVoiceRecordButton] mounted (voice button visible)');
  }, []);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission required');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording: r } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.durationMillis) {
            // optional: could update a duration display
          }
        },
        100,
      );
      setRecording(r);
      setIsRecording(true);
    } catch (e) {
      setError((e as Error).message);
      setRecording(null);
      setIsRecording(false);
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    const r = recording;
    if (!r) return;
    setRecording(null);
    setIsRecording(false);
    try {
      await r.stopAndUnloadAsync();
      const uri = r.getURI();
      const status = await r.getStatusAsync();
      if (!status || !uri) {
        setError('Could not get recording');
        return;
      }
      const durationMillis = (status as { durationMillis?: number }).durationMillis ?? 0;
      const durationSec = Math.max(0.001, durationMillis / 1000);
      const date = new Date().toISOString().replace(/[:.]/g, '_');
      const title = `audio_recording_${date}.m4a`;
      const file = {
        duration: durationSec,
        name: title,
        size: 0,
        type: 'audio/m4a',
        uri,
        waveform_data: [] as number[],
      };
      const audioFile: LocalVoiceRecordingAttachment = {
        asset_url: uri,
        duration: durationSec,
        file_size: 0,
        localMetadata: {
          file,
          id: generateId(),
          uploadState: 'pending',
        },
        mime_type: 'audio/m4a',
        title,
        type: 'voiceRecording',
        waveform_data: [],
      };
      await attachmentManager.uploadAttachment(audioFile);
      if (!asyncMessagesMultiSendEnabled) {
        setTimeout(() => {
          try {
            sendMessage();
          } catch (_) {}
        }, 100);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [recording, attachmentManager, asyncMessagesMultiSendEnabled, sendMessage]);

  if (error) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity onPress={() => setError(null)} style={styles.btn}>
          <Ionicons name="mic-off-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  }

  if (isRecording && recording) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity onPress={stopAndUpload} style={[styles.btn, styles.recording]} activeOpacity={0.8}>
          <View style={styles.dot} />
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={startRecording} style={styles.btn} activeOpacity={0.7}>
        <Ionicons name="mic" size={24} color="#3b82f6" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    width: 'auto',
    minWidth: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  stopText: {
    fontSize: 14,
    color: '#b91c1c',
    fontWeight: '600',
  },
});
