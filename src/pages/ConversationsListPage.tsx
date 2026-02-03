/**
 * Conversations List Page - StreamChat UI Components
 * 
 * Uses StreamChat's built-in ChannelList component for the conversation list.
 * This replaces the custom FlashList implementation with StreamChat's optimized UI.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChannelList } from 'stream-chat-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useApi } from '../contexts/ApiContext';
import { useStreamChatReady } from '../components/StreamChatProvider';
import { ConversationsListPageProps } from '../types';
import streamChatService from '../services/StreamChatService';
import { getStreamChannelId, getOneCrewConversationId } from '../utils/streamChatMapping';
import streamChatConnectionMonitor from '../utils/StreamChatConnectionMonitor';

const ConversationsListPage: React.FC<ConversationsListPageProps> = ({
  onBack: onBackProp,
  onConversationSelect: onConversationSelectProp,
}) => {
  const route = useRoute<RootStackScreenProps<'conversations'>['route']>();
  const navigation = useNavigation();
  const { navigateTo, goBack } = useAppNavigation();
  const { user, currentProfileType, activeCompany } = useApi();
  const { clientReady } = useStreamChatReady();
  const isConnected = streamChatService.isConnected();

  const onBack = onBackProp || goBack;

  // Safe: use service getCurrentUserId (client.userID can throw when disconnected)
  const currentStreamUserId = useMemo(
    () => (clientReady ? streamChatService.getCurrentUserId() : null),
    [clientReady]
  );

  // CRITICAL: Create a key that changes when profile switches
  // This forces ChannelList to remount and re-query when switching profiles
  const channelListKey = useMemo(() => {
    return `${currentStreamUserId || 'no-user'}-${currentProfileType}-${activeCompany?.id || 'no-company'}`;
  }, [currentStreamUserId, currentProfileType, activeCompany?.id]);

  // Log profile changes for debugging
  useEffect(() => {
    console.log('💬 [ConversationsListPage] Profile changed, refreshing channel list...', {
      currentStreamUserId,
      currentProfileType,
      activeCompanyId: activeCompany?.id,
      channelListKey,
    });
  }, [channelListKey, currentStreamUserId, currentProfileType, activeCompany?.id]);

  // Handle channel selection - navigate to chat page
  const handleChannelSelect = useCallback((channel: any) => {
    if (!channel) {
      console.warn('⚠️ [ConversationsListPage] handleChannelSelect called with no channel');
      return;
    }

    console.log('💬 [ConversationsListPage] Channel selected:', {
      channelId: channel.id,
      channelCid: channel.cid,
      channelData: channel.data,
      channelState: channel.state,
    });

    // Extract OneCrew conversation ID from StreamChat channel ID
    // Try both id and cid formats
    const channelIdentifier = channel.id || channel.cid || '';
    let conversationId = getOneCrewConversationId(channelIdentifier);
    
    // If extraction failed, try to get it from channel data
    if (!conversationId && channel.data?.conversation_id) {
      conversationId = channel.data.conversation_id;
      console.log('💬 [ConversationsListPage] Using conversation_id from channel data:', conversationId);
    }
    
    console.log('💬 [ConversationsListPage] Extracted conversation ID:', conversationId, 'from:', channelIdentifier);
    
    if (conversationId) {
      console.log('✅ [ConversationsListPage] Navigating to chat with conversationId:', conversationId);
      
      // Try custom navigateTo first, then fallback to React Navigation
      if (navigateTo) {
        navigateTo('chat', { conversationId });
      } else if (navigation) {
        // Fallback to React Navigation directly
        (navigation as any).navigate('chat', { conversationId });
      } else {
        console.error('❌ [ConversationsListPage] No navigation method available');
      }
      
      // Also call custom handler if provided
      if (onConversationSelectProp) {
        onConversationSelectProp({ id: conversationId } as any);
      }
    } else {
      console.error('❌ [ConversationsListPage] Failed to extract conversation ID from channel:', {
        channelId: channel.id,
        channelCid: channel.cid,
        channelIdentifier,
        channelData: channel.data,
      });
    }
  }, [onConversationSelectProp, navigateTo, navigation]);

  // Custom filters for channels
  // Only show channels where current user is a member
  const filters = useMemo(() => {
    if (!currentStreamUserId) return {};
    
    return {
      members: { $in: [currentStreamUserId] },
      type: 'messaging',
    };
  }, [currentStreamUserId]);

  // Sort channels by last message time (most recent first)
  const sort = useMemo(() => {
    return [{ last_message_at: -1 }];
  }, []);

  // Custom channel preview component to match app design
  // Memoized for performance optimization
  const ChannelPreview = React.memo(useCallback(({ channel }: any) => {
    if (!channel) {
      return null;
    }

    const displayName = channel?.data?.name || 
      Object.values(channel?.state?.members || {})
        .filter((member: any) => member.user?.id !== currentStreamUserId)
        .map((member: any) => member.user?.name || member.user?.id)
        .join(', ') || 'Unknown';

    const lastMessage = channel?.state?.messages?.[channel.state.messages.length - 1];
    const lastMessageText = lastMessage?.text || 'No messages yet';
    const unreadCount = channel?.state?.unreadCount || 0;

    return (
      <TouchableOpacity
        style={styles.channelPreview}
        onPress={() => {
          console.log('👆 [ChannelPreview] Channel tapped:', {
            channelId: channel.id,
            channelCid: channel.cid,
          });
          handleChannelSelect(channel);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.channelContent}>
          <View style={styles.channelHeader}>
            <Text style={[styles.channelName, unreadCount > 0 && styles.channelNameUnread]}>
              {displayName}
            </Text>
            {lastMessage?.created_at && (
              <Text style={styles.channelTime}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>
          <Text 
            style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {lastMessageText}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  }, [currentStreamUserId, handleChannelSelect]));

  // Format time helper
  const formatTime = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // CRITICAL: Wait for StreamChat to be fully connected before rendering ChannelList
  // This prevents "tokens are not set" errors when switching profiles
  const [isReady, setIsReady] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  
  // Handle new message button - navigate to directory to find users
  // MUST be defined before early return to avoid hook order violation
  const handleNewMessage = useCallback(() => {
    if (navigateTo) {
      navigateTo('directory');
    }
  }, [navigateTo]);
  
  // Clear error on profile change
  const { getConversations } = useApi();
  
  useEffect(() => {
    setListError(null);
  }, [currentProfileType, activeCompany?.id, user?.id]);
  
  // FIXED: Update unread count when page becomes visible or profile changes
  // The ApiContext's updateUnreadCount will handle fetching all conversations
  // We just need to ensure it's triggered when this page loads
  useEffect(() => {
    // The unread count tracking useEffect in ApiContext will automatically
    // update the count when dependencies change (currentProfileType, activeCompany, etc.)
    // We don't need to do anything here - the useEffect in ApiContext handles it
    // But we can log for debugging
    if (__DEV__ && clientReady && currentStreamUserId) {
      console.log('💬 [ConversationsListPage] Page loaded, unread count should update automatically via ApiContext useEffect');
    }
  }, [clientReady, currentStreamUserId, currentProfileType, activeCompany?.id]);
  
  // Wait for StreamChat to be ready (clientReady from provider) and userId available
  useEffect(() => {
    setIsReady(false);
    if (!clientReady || !currentStreamUserId) {
      console.log('💬 [ConversationsListPage] Not ready or no userId, waiting...', {
        clientReady,
        currentStreamUserId: currentStreamUserId ?? null,
      });
      return;
    }
    const checkIfConnected = (): boolean => {
      const freshConnected = streamChatService.isConnected();
      const freshUserId = streamChatService.getCurrentUserId();
      if (freshUserId !== currentStreamUserId) return false;
      return freshConnected;
    };
    
    // CRITICAL: Add a small delay even when clientReady is true
    // This gives the SDK extra time to finish setting up tokens internally
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    
    const verifyAndSetReady = () => {
      // OPTIMIZED: Reduced delay for instant connection (150ms instead of 300ms)
      // Wait a bit for SDK to fully initialize tokens before checking
      timeoutId = setTimeout(() => {
        if (checkIfConnected()) {
          console.log('✅ [ConversationsListPage] Verified connected after delay');
          // Monitor: Log ready state
          streamChatConnectionMonitor.logEvent('channelList.ready', {
            currentStreamUserId,
            clientReady,
            isConnected: streamChatService.isConnected(),
          });
          setIsReady(true);
        } else {
          // If not connected after delay, start the waiting loop
          console.log('⏳ [ConversationsListPage] Waiting for StreamChat connection...', {
            clientReady,
            currentStreamUserId,
            isConnected,
          });
          const maxWait = 8000;
          const startTime = Date.now();
          let checkCount = 0;
          intervalId = setInterval(() => {
            checkCount++;
            const elapsed = Date.now() - startTime;
            if (checkIfConnected()) {
              clearInterval(intervalId);
              // Monitor: Log ready state after waiting
              streamChatConnectionMonitor.logEvent('channelList.ready', {
                currentStreamUserId,
                elapsed,
                checkCount,
                clientReady,
                isConnected: streamChatService.isConnected(),
              });
              setIsReady(true);
              console.log(`✅ [ConversationsListPage] StreamChat connected after ${elapsed}ms (${checkCount} checks)`);
            } else if (elapsed > maxWait) {
              clearInterval(intervalId);
              setIsReady(false);
              console.warn(`⚠️ [ConversationsListPage] StreamChat connection timeout after ${elapsed}ms`, {
                freshConnected: streamChatService.isConnected(),
                freshUserId: streamChatService.getCurrentUserId(),
                currentStreamUserId,
              });
              // Monitor: Log timeout
              streamChatConnectionMonitor.logEvent('channelList.timeout', {
                currentStreamUserId,
                elapsed,
                checkCount,
                freshConnected: streamChatService.isConnected(),
                freshUserId: streamChatService.getCurrentUserId(),
              });
              setListError('Failed to connect to chat. Please try again.');
            } else if (checkCount % 10 === 0) {
              console.log(`⏳ [ConversationsListPage] Still waiting... (${elapsed}ms elapsed)`, {
                freshConnected: streamChatService.isConnected(),
                freshUserId: streamChatService.getCurrentUserId(),
              });
            }
          }, 200);
        }
      }, 300);
    };
    
    verifyAndSetReady();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [clientReady, currentStreamUserId, currentProfileType, activeCompany?.id, isConnected]);
  
  const isActuallyConnected = clientReady && isConnected && !!currentStreamUserId;

  // Show loading state if not ready (never render ChannelList until clientReady + connected)
  if (!clientReady || !currentStreamUserId || !isReady || !isActuallyConnected) {
    console.log('💬 [ConversationsListPage] Loading state:', {
      clientReady,
      currentStreamUserId,
      isConnected,
      isReady,
      isActuallyConnected,
    });
    
    // Monitor: Log loading state
    streamChatConnectionMonitor.logEvent('channelList.loading', {
      clientReady,
      hasUserId: !!currentStreamUserId,
      isConnected,
      isReady,
      isActuallyConnected,
    });
    
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Connecting to chat...</Text>
          {listError && (
            <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 8 }]}>{listError}</Text>
          )}
        </View>
      </View>
    );
  }

  // Monitor: Log ChannelList render
  streamChatConnectionMonitor.logEvent('channelList.rendering', {
    channelListKey,
    currentStreamUserId,
    clientReady,
    isConnected,
  });

  return (
    <View style={styles.container}>
      <ChannelList
        key={channelListKey}
        filters={filters}
        sort={sort}
        Preview={ChannelPreview}
        // Note: onSelect is handled by the custom Preview component's onPress
        // Pagination - reduced limit for faster initial load
        pagination={{ limit: 15 }}
        // Performance optimizations for FlatList
        additionalFlatListProps={{
          removeClippedSubviews: true,
          maxToRenderPerBatch: 10,
          windowSize: 5,
          initialNumToRender: 10,
          updateCellsBatchingPeriod: 50,
        }}
        // Error handling
        onError={(error: any) => {
          const errorMessage = error?.message || error?.toString() || '';
          const isTokenError =
            errorMessage.includes('tokens are not set') ||
            errorMessage.includes('connectUser wasn\'t called') ||
            errorMessage.includes('disconnect was called') ||
            errorMessage.includes('Both secret and user tokens') ||
            errorMessage.includes('Both secret') ||
            errorMessage.includes('client.disconnect');
          
          // Monitor: Log ChannelList error
          streamChatConnectionMonitor.logChannelOperation(
            'channelList.query',
            channelListKey,
            false,
            error
          );
          
          // Monitor: Log token access attempt
          if (isTokenError) {
            streamChatConnectionMonitor.logTokenAccess('channelList.query', false, error);
          }
          
          if (isTokenError) {
            console.log('💬 [ConversationsListPage] StreamChat not connected yet (expected during profile switch):', errorMessage);
            setIsReady(false);
            // Reset clientReady check - force re-verification
            // The useEffect will re-run and wait for connection again
            setTimeout(() => {
              // Trigger re-check after a short delay
              setIsReady(false);
            }, 500);
            return;
          }
          console.error('❌ [ConversationsListPage] ChannelList error:', error);
          setListError('Error loading channel list. Please try again.');
        }}
        // Empty state
        EmptyStateIndicator={() => (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateText}>
              Visit someone's profile to start a chat, or use the navigation to find people to message
            </Text>
          </View>
        )}
        LoadingIndicator={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 32,
  },
  newMessageButton: {
    padding: 4,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  channelPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  channelContent: {
    flex: 1,
    marginRight: 8,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  channelNameUnread: {
    fontWeight: '700',
  },
  channelTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ConversationsListPage;
