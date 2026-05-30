import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, Animated, Platform } from 'react-native';
import * as Updates from 'expo-updates';

// ─── Shared UI ────────────────────────────────────────────────────────────────

interface BannerUIProps {
  isVisible: boolean;
  progress: number; // 0–1
}

const BannerUI: React.FC<BannerUIProps> = ({ isVisible, progress }) => {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 80,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [isVisible, slideAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const percent = Math.round(progress * 100);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <View style={styles.textRow}>
        <Text style={styles.label}>Updating app</Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

// ─── Production: real expo-updates hook ───────────────────────────────────────

const OTAUpdateBannerReal: React.FC = () => {
  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    downloadProgress,
  } = Updates.useUpdates();

  // Check for updates once on mount
  useEffect(() => {
    Updates.checkForUpdateAsync().catch(() => {});
  }, []);

  // Silently download as soon as a new update is detected
  useEffect(() => {
    if (isUpdateAvailable) {
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [isUpdateAvailable]);

  // Reload on the next foreground transition instead of immediately.
  // This prevents the double-splash the user would see if we called
  // reloadAsync() right after download while they are actively using the app.
  useEffect(() => {
    if (!isUpdatePending) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        subscription.remove();
        Updates.reloadAsync().catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [isUpdatePending]);

  // Keep banner visible (at 100%) between download completion and app reload
  const isVisible = isDownloading || isUpdatePending;
  const progress = isUpdatePending ? 1 : (downloadProgress ?? 0);

  return <BannerUI isVisible={isVisible} progress={progress} />;
};

// ─── Dev preview: simulated progress (no expo-updates hook) ───────────────────

const OTAUpdateBannerPreview: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + 0.04, 1);
      setProgress(p);
      if (p >= 1) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return <BannerUI isVisible progress={progress} />;
};

// ─── Public export ─────────────────────────────────────────────────────────────

// Set to true temporarily to preview the banner UI in Expo Go / dev mode.
// ⚠️  Must be false before committing / shipping.
const DEV_PREVIEW = false;

const OTAUpdateBanner: React.FC = () => {
  if (DEV_PREVIEW) {
    return <OTAUpdateBannerPreview />;
  }
  if (__DEV__ || !Updates.isEnabled) {
    return null;
  }
  return <OTAUpdateBannerReal />;
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: BOTTOM_INSET,
    left: 16,
    right: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  percent: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});

export default OTAUpdateBanner;
