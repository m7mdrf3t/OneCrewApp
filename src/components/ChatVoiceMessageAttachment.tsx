import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import streamChatService from '../services/StreamChatService';

type Props = {
  attachment?: any;
  item?: any;
  message?: any;
  isOwnMessage?: boolean;
};

const FALLBACK_WAVEFORM = [
  0.2, 0.55, 0.72, 0.94, 0.8, 0.62, 0.48, 0.7, 0.88, 0.76,
  0.58, 0.34, 0.28, 0.52, 0.84, 0.92, 0.74, 0.49, 0.67, 0.44,
];

const formatDuration = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const normalizeWaveform = (waveformData: unknown): number[] => {
  if (!Array.isArray(waveformData) || waveformData.length === 0) {
    return FALLBACK_WAVEFORM;
  }

  const numericValues = waveformData
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? Math.abs(value) : 0))
    .filter((value) => value > 0);

  if (numericValues.length === 0) {
    return FALLBACK_WAVEFORM;
  }

  const maxValue = Math.max(...numericValues, 1);
  return numericValues.slice(0, 28).map((value) => Math.max(0.18, Math.min(1, value / maxValue)));
};

const getAudioUri = (attachment: any): string | null => {
  const candidates = [
    attachment?.asset_url,
    attachment?.audio_url,
    attachment?.url,
    attachment?.file,
    attachment?.localMetadata?.file?.uri,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
};

const ChatVoiceMessageAttachment: React.FC<Props> = ({ attachment, item, message, isOwnMessage }) => {
  const resolvedAttachment = item ?? attachment;
  const currentUserId = streamChatService.getCurrentUserId();
  const resolvedIsOwnMessage =
    typeof isOwnMessage === 'boolean'
      ? isOwnMessage
      : !!currentUserId && message?.user?.id === currentUserId;
  const audioUri = useMemo(() => getAudioUri(resolvedAttachment), [resolvedAttachment]);
  const waveform = useMemo(
    () => normalizeWaveform(resolvedAttachment?.waveform_data),
    [resolvedAttachment?.waveform_data],
  );
  const totalDuration = Math.max(0, Number(resolvedAttachment?.duration) || 0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(totalDuration * 1000);

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;

    try {
      await sound.unloadAsync();
    } catch {
      // Ignore cleanup failures from native playback teardown.
    }
  }, []);

  useEffect(() => {
    return () => {
      unloadSound();
    };
  }, [unloadSound]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setIsPlaying(false);
      }
      return;
    }

    setPositionMillis(status.positionMillis ?? 0);
    setDurationMillis(status.durationMillis ?? durationMillis);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
    }
  }, [durationMillis]);

  const togglePlayback = useCallback(async () => {
    if (!audioUri) return;

    try {
      let sound = soundRef.current;

      if (!sound) {
        const created = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 120 },
          handlePlaybackStatus,
        );
        soundRef.current = created.sound;
        setIsPlaying(true);
        return;
      }

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        await unloadSound();
        return;
      }

      if (status.didJustFinish || status.positionMillis >= (status.durationMillis ?? 0)) {
        await sound.setPositionAsync(0);
      }

      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch {
      setIsPlaying(false);
    }
  }, [audioUri, handlePlaybackStatus, unloadSound]);

  const progressRatio = durationMillis > 0 ? Math.min(1, positionMillis / durationMillis) : 0;
  const activeBarCount = Math.max(0, Math.round(waveform.length * progressRatio));
  const shownDurationSeconds = isPlaying ? positionMillis / 1000 : totalDuration;

  return (
    <View style={[styles.container, isOwnMessage ? styles.containerOwn : styles.containerOther]}>
      <TouchableOpacity
        onPress={togglePlayback}
        activeOpacity={0.8}
        style={[styles.playButton, resolvedIsOwnMessage ? styles.playButtonOwn : styles.playButtonOther]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={22}
          color={resolvedIsOwnMessage ? '#FFFFFF' : '#111B21'}
          style={!isPlaying ? styles.playIcon : undefined}
        />
      </TouchableOpacity>

      <View style={styles.waveSection}>
        <View style={styles.waveRow}>
          <View style={styles.waveBars}>
            {waveform.map((value, index) => (
              <View
                key={`${index}-${value}`}
                style={[
                  styles.waveBar,
                  { height: 6 + Math.round(value * 16) },
                  index < activeBarCount
                    ? (resolvedIsOwnMessage ? styles.waveBarActiveOwn : styles.waveBarActiveOther)
                    : styles.waveBarInactive,
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={[styles.durationText, resolvedIsOwnMessage ? styles.durationTextOwn : styles.durationTextOther]}>
          {formatDuration(shownDurationSeconds)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 185,
    maxWidth: 240,
  },
  containerOwn: {
    backgroundColor: '#DCF8C6',
  },
  containerOther: {
    backgroundColor: '#FFFFFF',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  playButtonOwn: {
    backgroundColor: '#22C55E',
  },
  playButtonOther: {
    backgroundColor: '#E9EDF0',
  },
  playIcon: {
    marginLeft: 1,
  },
  waveSection: {
    flex: 1,
    justifyContent: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    overflow: 'hidden',
  },
  waveBar: {
    width: 3,
    borderRadius: 999,
  },
  waveBarActiveOwn: {
    backgroundColor: '#1F8F4A',
  },
  waveBarActiveOther: {
    backgroundColor: '#54656F',
  },
  waveBarInactive: {
    backgroundColor: '#A7B4BC',
  },
  durationText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  durationTextOwn: {
    color: '#5E6B63',
  },
  durationTextOther: {
    color: '#667781',
  },
});

export default ChatVoiceMessageAttachment;
