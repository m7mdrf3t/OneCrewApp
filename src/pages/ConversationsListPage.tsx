import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { ConversationsListPageProps, ChatConversation, ChatParticipant } from '../types';
import supabaseService from '../services/SupabaseService';

const ConversationsListPage: React.FC<ConversationsListPageProps> = ({
  onBack,
  onConversationSelect,
}) => {
  const { getConversations, user, currentProfileType, activeCompany } = useApi();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const conversationsChannelIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setError(null);
      const response = await getConversations({ page: pageNum, limit: 20 });
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const pagination = response.data.pagination;
        
        if (Array.isArray(data)) {
          if (append) {
            setConversations(prev => [...prev, ...data]);
          } else {
            setConversations(data);
          }
          setHasMore(pagination ? pageNum < pagination.totalPages : false);
        }
      } else {
        throw new Error(response.error || 'Failed to load conversations');
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setError(err.message || 'Failed to load conversations');
      if (!append) {
        setConversations([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getConversations]);

  useEffect(() => {
    loadConversations(1, false);
  }, [loadConversations]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!user?.id || !supabaseService.isInitialized()) {
      return;
    }

    console.log('💬 Setting up real-time subscription for conversations');

    // Cleanup previous subscription
    if (conversationsChannelIdRef.current) {
      supabaseService.unsubscribe(conversationsChannelIdRef.current);
      conversationsChannelIdRef.current = null;
    }

    // Subscribe to conversation updates
    const channelId = supabaseService.subscribeToConversations(
      user.id,
      (updatedConversation: ChatConversation) => {
        console.log('💬 Conversation updated via real-time:', updatedConversation);
        
        // Update the conversation in the list
        setConversations(prev =>
          prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
        );
        
        // Trigger a refresh of conversations to update unread count
        // This will recalculate the unread count
        setTimeout(() => {
          loadConversations(1, false);
        }, 500);
      }
    );

    conversationsChannelIdRef.current = channelId;

    return () => {
      if (conversationsChannelIdRef.current) {
        console.log('🔌 Unsubscribing from conversations');
        supabaseService.unsubscribe(conversationsChannelIdRef.current);
        conversationsChannelIdRef.current = null;
      }
    };
  }, [user?.id]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadConversations(1, false);
  }, [loadConversations]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadConversations(nextPage, true);
    }
  }, [loading, hasMore, refreshing, page, loadConversations]);

  const getConversationName = (conversation: ChatConversation): string => {
    if (conversation.name) {
      return conversation.name;
    }
    
    if (conversation.participants && conversation.participants.length > 0) {
      const otherParticipants = conversation.participants.filter(p => {
        if (p.participant_type === 'user') {
          return p.participant_id !== user?.id;
        } else if (p.participant_type === 'company') {
          return currentProfileType === 'company' ? p.participant_id !== activeCompany?.id : true;
        }
        return true;
      });

      if (otherParticipants.length > 0) {
        const participant = otherParticipants[0];
        if (participant.user) {
          return participant.user.name || 'Unknown User';
        } else if (participant.company) {
          return participant.company.name || 'Unknown Company';
        }
      }
    }
    
    return 'Unknown';
  };

  const getConversationAvatar = (conversation: ChatConversation): string | null => {
    if (conversation.participants && conversation.participants.length > 0) {
      const otherParticipants = conversation.participants.filter(p => {
        if (p.participant_type === 'user') {
          return p.participant_id !== user?.id;
        } else if (p.participant_type === 'company') {
          return currentProfileType === 'company' ? p.participant_id !== activeCompany?.id : true;
        }
        return true;
      });

      if (otherParticipants.length > 0) {
        const participant = otherParticipants[0];
        if (participant.user?.image_url) {
          return participant.user.image_url;
        } else if (participant.company?.logo_url) {
          return participant.company.logo_url;
        }
      }
    }
    return null;
  };

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
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

  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    const avatarUrl = getConversationAvatar(item);
    const name = getConversationName(item);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onConversationSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {name}
            </Text>
            {item.last_message_at && (
              <Text style={styles.conversationTime}>
                {formatTime(item.last_message_at)}
              </Text>
            )}
          </View>
          
          {item.last_message_preview && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message_preview}
            </Text>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyStateTitle}>No conversations yet</Text>
        <Text style={styles.emptyStateText}>
          Start a conversation by messaging someone from their profile
        </Text>
      </View>
    );
  };

  const renderError = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            loadConversations(1, false);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerRight} />
      </View>

      {error && conversations.length === 0 ? (
        renderError()
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && conversations.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : null
          }
        />
      )}
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
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  conversationContent: {
    flex: 1,
    marginRight: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyList: {
    flexGrow: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default ConversationsListPage;

