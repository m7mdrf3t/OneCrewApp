import { useEffect } from 'react';
import streamChatService from '../services/StreamChatService';
import { rateLimiter } from '../utils/rateLimiter';

export interface UseUnreadConversationCountParams {
  isAuthenticated: boolean;
  /** `user?.id` — used only for profile-aware cache key / logging */
  userId: string | undefined;
  currentProfileType: string;
  /** `activeCompany?.id` — used only for profile-aware cache key / logging */
  activeCompanyId: string | undefined;
  /**
   * Fetch unread count from the lightweight backend endpoint.
   * Internally calls `setUnreadConversationCount` (the real state setter lives in ApiContext).
   */
  getUnreadConversationCount: () => Promise<number>;
  /** Fall-back Stream Chat client count (profile-unaware). */
  calculateStreamChatUnreadCount: () => Promise<number>;
  /** Pagination fallback when the lightweight endpoint is unavailable. */
  getConversations: (params: { page: number; limit: number }) => Promise<any>;
  /** Direct access to the state setter for resetting to 0 when unauthenticated. */
  setUnreadConversationCount: (count: number) => void;
}

/**
 * Manages real-time unread conversation count polling and StreamChat event subscriptions.
 * Extracted from ApiContext to reduce its size; behaviour is identical.
 */
export const useUnreadConversationCount = ({
  isAuthenticated,
  userId,
  currentProfileType,
  activeCompanyId,
  getUnreadConversationCount,
  calculateStreamChatUnreadCount,
  getConversations,
  setUnreadConversationCount,
}: UseUnreadConversationCountParams): void => {
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadConversationCount(0);
      return;
    }

    let isMounted = true;
    let client: any = null;
    let rateLimitedUntil = 0;
    let lastUpdateAttempt = 0;
    const THROTTLE_MS = 15_000;
    const NORMAL_POLL_MS = 30_000;
    const RATE_LIMIT_BACKOFF_MS = 60_000;

    const is429 = (err: any) => {
      const msg = err?.message || err?.toString() || '';
      return msg.includes('429') || msg.includes('Too many requests');
    };

    const updateUnreadCount = async (force = false) => {
      if (!isMounted) return;
      const now = Date.now();
      if (now < rateLimitedUntil && !force) return;
      if (!force && now - lastUpdateAttempt < THROTTLE_MS) return;
      lastUpdateAttempt = now;

      try {
        if (isMounted) {
          const count = await getUnreadConversationCount();

          if (count === 0 && streamChatService.isConnected()) {
            try {
              const streamChatCount = await calculateStreamChatUnreadCount();
              if (streamChatCount > 0) {
                setUnreadConversationCount(streamChatCount);
                if (__DEV__) {
                  console.log('    [UnreadCount] Using Stream fallback after backend returned 0:', streamChatCount);
                }
                return;
              }
            } catch {
              // Keep backend count if Stream fallback fails.
            }
          }

          if (__DEV__) {
            console.log('    [UnreadCount] Updated from lightweight endpoint:', {
              count,
              currentProfileType,
              currentProfileId: currentProfileType === 'company' && activeCompanyId ? activeCompanyId : userId,
            });
          }
          return;
        }
      } catch (error) {
        if (is429(error)) {
          rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
          if (__DEV__) console.warn('   [UnreadCount] Rate limited (429), backing off 60s');
        }
        if (__DEV__) {
          console.warn('   [UnreadCount] Lightweight endpoint failed:', error);
        }

        // On 429 skip pagination; use StreamChat fallback instead
        if (is429(error)) {
          try {
            if (streamChatService.isConnected() && isMounted) {
              client = streamChatService.getClient();
              const streamChatCount = await calculateStreamChatUnreadCount();
              setUnreadConversationCount(streamChatCount);
              if (__DEV__) console.warn('   [UnreadCount] StreamChat fallback (rate limited):', streamChatCount);
            }
          } catch {
            /* keep existing count */
          }
          return;
        }

        // Non-429: try pagination fallback
        try {
          if (isMounted) {
            const currentUserId = currentProfileType === 'company' && activeCompanyId ? activeCompanyId : userId;
            const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
            const cachePattern = `conversations-${currentUserType}-${currentUserId}`;
            await rateLimiter.clearCacheByPattern(cachePattern);

            let allConversations: any[] = [];
            let page = 1;
            const limit = 100;
            let hasMore = true;

            while (hasMore && isMounted) {
              const response = await getConversations({ limit, page });
              if (response.success && response.data) {
                const responseData = response.data as any;
                let conversations: any[] = [];
                if (Array.isArray(responseData)) {
                  conversations = responseData;
                } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
                  conversations = Array.isArray(responseData.data) ? responseData.data : [];
                }

                if (Array.isArray(conversations) && conversations.length > 0) {
                  allConversations = allConversations.concat(conversations);
                  hasMore = conversations.length === limit;
                  page++;
                } else {
                  hasMore = false;
                }
              } else {
                hasMore = false;
              }
            }

            let unreadCount = 0;
            allConversations.forEach((conv: any) => {
              if (conv.participants && Array.isArray(conv.participants)) {
                const participant = conv.participants.find((p: any) =>
                  p.participant_id === currentUserId && p.participant_type === currentUserType
                );

                if (participant && conv.last_message_at) {
                  const lastReadAt = participant.last_read_at ? new Date(participant.last_read_at).getTime() : 0;
                  const lastMessageAt = new Date(conv.last_message_at).getTime();
                  if (lastMessageAt > lastReadAt) unreadCount++;
                } else if (conv.last_message_at && participant && !participant.last_read_at) {
                  unreadCount++;
                }
              }
            });

            if (isMounted) {
              setUnreadConversationCount(unreadCount);
              if (__DEV__) {
                console.log('    [UnreadCount] Updated from pagination fallback:', {
                  unreadCount,
                  totalConversations: allConversations.length,
                });
              }
            }
          }
        } catch (fallbackError) {
          if (__DEV__) console.warn('   [UnreadCount] Pagination fallback failed:', fallbackError);
          if (is429(fallbackError)) {
            rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
          }
          // Last resort: StreamChat (profile-unaware)
          try {
            if (streamChatService.isConnected() && isMounted) {
              client = streamChatService.getClient();
              const streamChatCount = await calculateStreamChatUnreadCount();
              setUnreadConversationCount(streamChatCount);
              if (__DEV__) {
                console.warn('   [UnreadCount] Using StreamChat fallback (may not be profile-aware):', streamChatCount);
              }
            }
          } catch {
            if (__DEV__) console.warn('   [UnreadCount] All methods failed');
          }
        }
      }
    };

    let initialTimeout: NodeJS.Timeout | null = null;

    if (isMounted) {
      updateUnreadCount(true).catch(err => {
        if (__DEV__) console.warn('   [UnreadCount] Immediate update failed:', err);
      });
    }

    initialTimeout = setTimeout(() => {
      if (isMounted) {
        updateUnreadCount().catch(err => {
          if (__DEV__) console.warn('   [UnreadCount] Backup update failed:', err);
        });
      }
    }, 5_000);

    if (streamChatService.isConnected()) {
      client = streamChatService.getClient();

      const handleUnreadUpdate = (event: any) => {
        if (isMounted) {
          updateUnreadCount();
          if (__DEV__) {
            console.log('    [UnreadCount] Event received, recalculating from backend (profile-aware)');
          }
        }
      };

      const handleMessageNew = () => {
        if (isMounted) updateUnreadCount();
      };

      const handleChannelUpdated = (event: any) => {
        if (isMounted) {
          if (__DEV__ && event?.channel?.state?.unreadCount !== undefined) {
            console.log('    [UnreadCount] Channel updated, unreadCount:', event.channel.state.unreadCount);
          }
          updateUnreadCount();
        }
      };

      const handleReadStateChanged = () => {
        if (isMounted) {
          if (__DEV__) console.log('    [UnreadCount] Read state changed, updating count');
          updateUnreadCount();
        }
      };

      const handleChannelDeleted = () => {
        if (isMounted) updateUnreadCount();
      };

      const handleChannelRead = () => {
        if (isMounted) {
          if (__DEV__) console.log('    [UnreadCount] Channel marked as read, updating count');
          updateUnreadCount();
        }
      };

      const unreadEventListeners = [
        client.on('notification.mark_read', (event: any) => {
          handleUnreadUpdate(event);
          handleChannelRead();
        }),
        client.on('notification.message_new', (event: any) => {
          handleUnreadUpdate(event);
          handleMessageNew();
        }),
        client.on('notification.mark_unread', (event: any) => {
          handleUnreadUpdate(event);
        }),
      ];

      const channelEventListeners = [
        client.on('message.new', handleMessageNew),
        client.on('channel.updated', handleChannelUpdated),
        client.on('channel.deleted', handleChannelDeleted),
        client.on('notification.read', handleReadStateChanged),
      ];

      const refreshInterval = setInterval(() => {
        if (isMounted && streamChatService.isConnected()) {
          updateUnreadCount();
        }
      }, NORMAL_POLL_MS);

      return () => {
        isMounted = false;
        unreadEventListeners.forEach(listener => {
          try { listener.unsubscribe(); } catch (error) {
            console.warn('   [UnreadCount] Error unsubscribing unread listener:', error);
          }
        });
        channelEventListeners.forEach(listener => {
          try { listener.unsubscribe(); } catch (error) {
            console.warn('   [UnreadCount] Error unsubscribing channel listener:', error);
          }
        });
        clearInterval(refreshInterval);
        if (initialTimeout !== null) clearTimeout(initialTimeout);
      };
    }

    return () => {
      isMounted = false;
      if (initialTimeout !== null) clearTimeout(initialTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, currentProfileType, activeCompanyId, calculateStreamChatUnreadCount, getConversations]);
};
