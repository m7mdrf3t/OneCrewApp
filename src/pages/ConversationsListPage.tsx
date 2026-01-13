/**
 * Conversations List Page - StreamChat UI Components
 * 
 * Uses StreamChat's built-in ChannelList component for the conversation list.
 * This replaces the custom FlashList implementation with StreamChat's optimized UI.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
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
import { ConversationsListPageProps } from '../types';
import streamChatService from '../services/StreamChatService';
import { getStreamChannelId, getOneCrewConversationId } from '../utils/streamChatMapping';

const ConversationsListPage: React.FC<ConversationsListPageProps> = ({
  onBack: onBackProp,
  onConversationSelect: onConversationSelectProp,
}) => {
  const route = useRoute<RootStackScreenProps<'conversations'>['route']>();
  const navigation = useNavigation();
  const { navigateTo, goBack } = useAppNavigation();
  const { user, currentProfileType, activeCompany } = useApi();
  
  // Get client directly from service
  // Note: ChannelList will get the client from ChatContext provided by StreamChatProvider
  const client = streamChatService.getClient();
  const isConnected = streamChatService.isConnected();

  // Use props if provided (for backward compatibility), otherwise use navigation hooks
  const onBack = onBackProp || goBack;

  // Get current user's StreamChat ID
  const currentStreamUserId = useMemo(() => {
    if (!client?.userID) return null;
    return client.userID;
  }, [client?.userID]);

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
  const ChannelPreview = useCallback(({ channel }: any) => {
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
  }, [currentStreamUserId, handleChannelSelect]);

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

  // Show loading state if client doesn't exist, not connected, or user ID not available
  if (!client || !isConnected || !currentStreamUserId) {
    // Log debug info
    console.log('💬 [ConversationsListPage] Loading state:', {
      hasClient: !!client,
      isConnected,
      currentStreamUserId,
      clientUserId: client?.userID,
    });
    
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Connecting to chat...</Text>
        </View>
      </View>
    );
  }

  // Handle new message button - navigate to directory to find users
  const handleNewMessage = useCallback(() => {
    if (navigateTo) {
      navigateTo('directory');
    }
  }, [navigateTo]);

  return (
    <View style={styles.container}>
      <ChannelList
        filters={filters}
        sort={sort}
        Preview={ChannelPreview}
        // Note: onSelect is handled by the custom Preview component's onPress
        // Pagination
        pagination={{ limit: 20 }}
        // Error handling
        onError={(error) => {
          console.error('ChannelList error:', error);
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
        // Loading state
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
