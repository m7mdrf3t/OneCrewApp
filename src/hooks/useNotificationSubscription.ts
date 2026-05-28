import { useEffect, useRef } from 'react';
import { Notification } from '../types';
import supabaseService from '../services/SupabaseService';
import {
  countUnreadInAppNotifications,
  normalizeNotification,
  shouldShowInNotificationCenter,
} from '../utils/inAppNotifications';

export interface UseNotificationSubscriptionParams {
  isAuthenticated: boolean;
  userId: string | undefined;
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  setUnreadNotificationCount: (count: number) => void;
  refreshNotificationBadge: () => void;
  getUserCompanies: (userId: string, forceRefresh?: boolean) => Promise<any>;
}

export interface UseNotificationSubscriptionResult {
  /**
   * Imperatively unsubscribes the active Supabase channel.
   * Call during logout or on 401 before the component unmounts.
   */
  forceUnsubscribe: () => void;
}

/**
 * Sets up a Supabase real-time subscription for in-app notifications.
 * - Initialises Supabase if needed (reads env vars internally).
 * - Normalises and deduplicates incoming notifications.
 * - Triggers a company data refresh when a company-related notification arrives.
 * - Tracks the channel ID in a ref (not state) to avoid stale-closure bugs.
 * - Returns `forceUnsubscribe` so callers (logout, 401 handler) can clean up early.
 */
export const useNotificationSubscription = ({
  isAuthenticated,
  userId,
  setNotifications,
  setUnreadNotificationCount,
  refreshNotificationBadge,
  getUserCompanies,
}: UseNotificationSubscriptionParams): UseNotificationSubscriptionResult => {
  // Use a ref so the cleanup function never captures a stale value
  const channelIdRef = useRef<string | null>(null);

  const forceUnsubscribe = () => {
    if (channelIdRef.current) {
      supabaseService.unsubscribe(channelIdRef.current);
      channelIdRef.current = null;
      console.log('🔌 Unsubscribed from real-time notifications (forced)');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    try {
      if (!supabaseService.isInitialized()) {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

        if (supabaseUrl && supabaseKey) {
          supabaseService.initialize(supabaseUrl, supabaseKey);
          console.log('    Supabase initialized for real-time notifications');
        } else {
          console.warn(
            '   Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          );
        }
      }

      if (!supabaseService.isInitialized()) return;

      const channelId = supabaseService.subscribeToNotifications(
        userId,
        (newNotification: Notification) => {
          console.log('New notification received via real-time:', newNotification);

          const normalized = normalizeNotification(
            newNotification as unknown as Record<string, unknown>
          );

          if (!shouldShowInNotificationCenter(normalized)) {
            setTimeout(() => refreshNotificationBadge(), 500);
            return;
          }

          setNotifications((prev) => {
            if (prev.find((n) => n.id === normalized.id)) return prev;
            const updated = [normalized, ...prev];
            setUnreadNotificationCount(countUnreadInAppNotifications(updated));
            return updated;
          });

          // If company-related, force-refresh company list
          const title = (newNotification as any).title?.toLowerCase() || '';
          const message = (newNotification as any).message?.toLowerCase() || '';
          const isCompanyRelated =
            title.includes('company') ||
            title.includes('approval') ||
            message.includes('company') ||
            message.includes('approval') ||
            (newNotification as any).type === 'company_invitation' ||
            (newNotification as any).type === 'company_invitation_accepted';

          if (isCompanyRelated) {
            console.log('🔄 Company-related notification received - refreshing company data');
            setTimeout(() => {
              getUserCompanies(userId, true).catch(err => {
                console.warn('Failed to refresh company data after notification:', err);
              });
            }, 1_000);
          }

          setTimeout(() => refreshNotificationBadge(), 500);
        }
      );

      channelIdRef.current = channelId;
      console.log('    Real-time notification subscription established');
    } catch (error) {
      console.error('Failed to setup real-time notifications:', error);
    }

    return () => {
      // Use ref value — never stale
      if (channelIdRef.current) {
        supabaseService.unsubscribe(channelIdRef.current);
        channelIdRef.current = null;
        console.log('Unsubscribed from real-time notifications');
      }
    };
  }, [isAuthenticated, userId]);

  return { forceUnsubscribe };
};
