import { useCallback, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Computes Stream Chat `keyboardVerticalOffset` for iOS.
 * Uses measureInWindow when available so nested SafeArea / stack layouts
 * (iPhone 15–17 Pro/Max) report the true distance from screen top to the channel.
 */
export function useChatKeyboardVerticalOffset() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const channelContainerRef = useRef<View>(null);
  const [channelScreenY, setChannelScreenY] = useState<number | null>(null);

  const measureChannelOffset = useCallback(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    channelContainerRef.current?.measureInWindow((_x, y) => {
      if (typeof y === 'number' && y >= 0) {
        setChannelScreenY(y);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(measureChannelOffset);
      const interaction = InteractionManager.runAfterInteractions(measureChannelOffset);
      return () => {
        cancelAnimationFrame(frame);
        interaction.cancel();
      };
    }, [measureChannelOffset]),
  );

  const fallbackOffset = useMemo(() => {
    if (headerHeight > 0) {
      return headerHeight;
    }
    return insets.top + 44;
  }, [headerHeight, insets.top]);

  const keyboardVerticalOffset =
    Platform.OS === 'ios' ? (channelScreenY ?? fallbackOffset) : 0;

  return {
    channelContainerRef,
    keyboardVerticalOffset,
    onChannelContainerLayout: measureChannelOffset,
    bottomInset: insets.bottom,
    topInset: insets.top,
  };
}
