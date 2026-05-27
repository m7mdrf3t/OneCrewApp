import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Manages a periodic heartbeat interval, paused/resumed with AppState changes.
 *
 * @param enabled  When false the heartbeat is stopped immediately. Re-enables when true.
 * @param onBeat   Async callback fired on each beat (must be stable / wrapped in useCallback).
 * @param intervalMs  Beat interval in ms. Defaults to 30 000.
 * @returns `{ stop }` — imperative escape hatch for callers that need to stop the heartbeat
 *          outside of the `enabled` flag (e.g. during logout or 401 handling).
 */
export const useHeartbeat = ({
  enabled,
  onBeat,
  intervalMs = 30_000,
}: {
  enabled: boolean;
  onBeat: () => void | Promise<void>;
  intervalMs?: number;
}): { stop: () => void } => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Keep onBeat in a ref so the interval callback never becomes stale
  const onBeatRef = useRef(onBeat);
  onBeatRef.current = onBeat;

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('🔴 Heartbeat stopped');
    }
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onBeatRef.current();
    intervalRef.current = setInterval(() => onBeatRef.current(), intervalMs);
    console.log(`🟢 Heartbeat started (${intervalMs / 1000}s interval)`);
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        start();
      } else {
        stop();
      }
    };

    if (AppState.currentState === 'active') {
      start();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      stop();
      subscription.remove();
    };
  }, [enabled, start, stop]);

  return { stop };
};
