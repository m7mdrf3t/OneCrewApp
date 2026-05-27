import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';

export interface UseCompanySyncParams {
  /** Enable when the user is authenticated, present, and app boot is complete. */
  enabled: boolean;
  userId: string | undefined;
  /**
   * Fetch user companies. Pass `true` as second arg to force-bypass the cache.
   * Should be a stable reference (useCallback).
   */
  getUserCompanies: (userId: string, forceRefresh?: boolean) => Promise<any>;
}

/**
 * Manages two company-data sync behaviours:
 *
 * 1. **Foreground refresh** — when the app returns from background after ≥ 60 s,
 *    force-refreshes company data so approval-status changes are visible quickly.
 *
 * 2. **Pending approval polling** — polls every 30 s (foreground only) and force-
 *    refreshes whenever any company has `approval_status === 'pending'`.
 *
 * Both effects share the same `enabled` / `userId` / `getUserCompanies` dependencies
 * and are co-located here because they serve the same purpose.
 */
export const useCompanySync = ({
  enabled,
  userId,
  getUserCompanies,
}: UseCompanySyncParams): void => {
  const appBackgroundTimeRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effect 1: force-refresh company data when app returns from background ---
  useEffect(() => {
    if (!enabled || !userId) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        const timeInBackground = appBackgroundTimeRef.current
          ? now - appBackgroundTimeRef.current
          : 0;

        if (timeInBackground > 60_000) {
          console.log(
            `🔄 App returned to foreground after ${Math.round(timeInBackground / 1000)}s - refreshing company data`
          );
          InteractionManager.runAfterInteractions(() => {
            getUserCompanies(userId, true).catch(err => {
              console.warn('Failed to refresh company data on app foreground:', err);
            });
          });
        }

        appBackgroundTimeRef.current = null;
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        appBackgroundTimeRef.current = Date.now();
      }
    };

    // Initialise based on current state
    if (AppState.currentState === 'active') {
      appBackgroundTimeRef.current = null;
    } else {
      appBackgroundTimeRef.current = Date.now();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [enabled, userId, getUserCompanies]);

  // --- Effect 2: poll for pending company approval changes ---
  useEffect(() => {
    if (!enabled || !userId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const checkAndRefreshPendingCompanies = async () => {
      try {
        const response = await getUserCompanies(userId);
        if (response.success && response.data) {
          const companiesList: any[] = Array.isArray(response.data)
            ? response.data
            : (response.data as any)?.data || [];

          const hasPendingCompanies = companiesList.some((company: any) => {
            const approvalStatus =
              company.approval_status || company.company?.approval_status;
            return approvalStatus === 'pending';
          });

          if (hasPendingCompanies) {
            await getUserCompanies(userId, true);
            console.log('🔄 Refreshed pending company approval status');
          }
        }
      } catch (error) {
        console.warn('Failed to check pending company status:', error);
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

      setTimeout(checkAndRefreshPendingCompanies, 5_000);

      pollingIntervalRef.current = setInterval(() => {
        if (AppState.currentState === 'active') {
          checkAndRefreshPendingCompanies();
        }
      }, 30_000);
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (AppState.currentState === 'active') {
      startPolling();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [enabled, userId, getUserCompanies]);
};
