import { useCallback } from 'react';
import OneCrewApi from 'onecrew-api-client';
import { Notification, NotificationParams } from '../types';
import {
  filterInAppNotifications,
  countUnreadInAppNotifications,
  parseNotificationsFromResponse,
} from '../utils/inAppNotifications';

const NOTIFICATION_FETCH_LIMIT = 100;

interface UseNotificationMethodsParams {
  api: OneCrewApi;
  notifications: Notification[];
  setNotifications: (updater: ((prev: Notification[]) => Notification[]) | Notification[]) => void;
  setUnreadNotificationCount: (updater: ((prev: number) => number) | number) => void;
  handle401Error: (error: any) => Promise<void>;
}

export function useNotificationMethods({
  api,
  notifications,
  setNotifications,
  setUnreadNotificationCount,
  handle401Error,
}: UseNotificationMethodsParams) {

const NOTIFICATION_FETCH_LIMIT = 100;

/** Parse API payload, keep in-app rows only, sync list + badge from the same data. */
const applyNotificationCenterSnapshot = useCallback(
  (parsed: Notification[], options?: { updateList?: boolean; updateBadge?: boolean }) => {
    const inApp = filterInAppNotifications(parsed);
    const unreadInApp = inApp.filter((n) => !n.is_read);

    if (options?.updateList !== false) {
      setNotifications(inApp);
    }
    if (options?.updateBadge !== false) {
      setUnreadNotificationCount(unreadInApp.length);
    }

    if (__DEV__) {
      console.log('🔔 [Notifications] Snapshot applied:', {
        fetched: parsed.length,
        inApp: inApp.length,
        unreadInApp: unreadInApp.length,
        updateList: options?.updateList !== false,
        updateBadge: options?.updateBadge !== false,
      });
    }

    return { inApp, unreadCount: unreadInApp.length };
  },
  []
);

const fetchNotificationsFromApi = useCallback(
  async (params?: NotificationParams) => {
    const response = await api.getNotifications({
      limit: NOTIFICATION_FETCH_LIMIT,
      page: 1,
      ...params,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch notifications');
    }
    return parseNotificationsFromResponse(response.data);
  },
  [api]
);

/** Badge only (boot) — does not overwrite the modal list until it is opened. */
const refreshNotificationBadge = useCallback(async (): Promise<number> => {
  try {
    const parsed = await fetchNotificationsFromApi({ unread_only: true });
    const { unreadCount } = applyNotificationCenterSnapshot(parsed, {
      updateList: false,
      updateBadge: true,
    });
    return unreadCount;
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || '';
    const isNetworkError =
      errorMessage.includes('Network error') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('fetch failed') ||
      (error?.name === 'TypeError' && errorMessage.includes('Network'));

    if (isNetworkError) {
      console.warn('   Failed to refresh notification badge (network issue):', errorMessage);
      return 0;
    }

    console.error('Failed to refresh notification badge:', error);
    await handle401Error(error);
    return 0;
  }
}, [api, applyNotificationCenterSnapshot, fetchNotificationsFromApi]);

// Notification methods
const getNotifications = async (params?: NotificationParams) => {
  try {
    const parsed = await fetchNotificationsFromApi(params);
    const { inApp } = applyNotificationCenterSnapshot(parsed, {
      updateList: true,
      // Unread tab: badge from this fetch. All tab: badge from dedicated unread fetch below.
      updateBadge: params?.unread_only === true,
    });

    if (!params?.unread_only) {
      await refreshNotificationBadge();
    }

    return inApp;
  } catch (error: any) {
    console.error('Failed to get notifications:', error);
    await handle401Error(error);
    throw error;
  }
};

const getUnreadNotificationCount = async (): Promise<number> => refreshNotificationBadge();

const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = await api.markNotificationAsRead(notificationId);
    if (response.success && response.data) {
      // Update local state
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        setUnreadNotificationCount(countUnreadInAppNotifications(updated));
        return updated;
      });
      return response.data;
    }
    throw new Error(response.error || 'Failed to mark notification as read');
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};

const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.markAllNotificationsAsRead();
    if (response.success) {
      // Update local state
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, is_read: true }));
        // Recalculate unread count (should be 0, but exclude messages just in case)
        setUnreadNotificationCount(0);
        return updated;
      });
      return response;
    }
    throw new Error(response.error || 'Failed to mark all notifications as read');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
};

const deleteNotification = async (notificationId: string) => {
  try {
    const response = await api.deleteNotification(notificationId);
    if (response.success) {
      // Update local state
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        setUnreadNotificationCount(countUnreadInAppNotifications(updated));
        return updated;
      });
      return response;
    }
    throw new Error(response.error || 'Failed to delete notification');
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
};

  return {
    applyNotificationCenterSnapshot,
    fetchNotificationsFromApi,
    refreshNotificationBadge,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  };
}
