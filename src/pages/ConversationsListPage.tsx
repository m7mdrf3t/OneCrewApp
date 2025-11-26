import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');
  const conversationsChannelIdRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<{ [key: string]: number }>({});
  const hasInitiallyLoadedRef = useRef(false);
  const getConversationsRef = useRef(getConversations);
  
  // Keep ref updated
  useEffect(() => {
    getConversationsRef.current = getConversations;
  }, [getConversations]);

  const loadConversations = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    // Only set loading to true if this is the initial load (not appending)
    if (!append && !hasInitiallyLoadedRef.current) {
      console.log('🔄 Setting loading to true for initial load');
      setLoading(true);
    } else {
      console.log('⏭️ Skipping loading state - append:', append, 'hasInitiallyLoaded:', hasInitiallyLoadedRef.current);
    }
    
    try {
      setError(null);
      const response = await getConversationsRef.current({ page: pageNum, limit: 20 });
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const pagination = response.data.pagination;
        
        if (Array.isArray(data)) {
          if (append) {
            setConversations(prev => [...prev, ...data]);
          } else {
            setConversations(data);
            hasInitiallyLoadedRef.current = true; // Mark as initially loaded
            console.log('✅ Initial load complete, hasInitiallyLoaded set to true');
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
        // Only clear conversations if we haven't loaded initially
        // This prevents the loading screen from showing when we already have conversations
        if (!hasInitiallyLoadedRef.current) {
          setConversations([]);
        }
      }
    } finally {
      console.log('🔄 Setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Empty deps - use ref to avoid recreating callback

  useEffect(() => {
    loadConversations(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only load once on mount - real-time updates will handle subsequent changes

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
        
        // Throttle updates to prevent excessive re-renders (max once per second per conversation)
        const now = Date.now();
        const lastUpdate = lastUpdateTimeRef.current[updatedConversation.id] || 0;
        if (now - lastUpdate < 1000) {
          console.log('⏭️ Skipping duplicate conversation update (throttled)');
          return;
        }
        lastUpdateTimeRef.current[updatedConversation.id] = now;
        
        // Update the conversation in the list efficiently
        // Ensure loading is false during real-time updates
        setLoading(false);
        
        setConversations(prev => {
          // Safety check: never return empty array if we have conversations
          if (prev.length === 0 && hasInitiallyLoadedRef.current) {
            console.warn('⚠️ Attempted to update conversations but list is empty - this should not happen');
            return prev;
          }
          
          const existingIndex = prev.findIndex(conv => conv.id === updatedConversation.id);
          
          // Check if the update actually changed anything meaningful
          if (existingIndex >= 0) {
            const existing = prev[existingIndex];
            const existingTime = existing.last_message_at ? new Date(existing.last_message_at).getTime() : 0;
            const updatedTime = updatedConversation.last_message_at ? new Date(updatedConversation.last_message_at).getTime() : 0;
            
            // If the last_message_at hasn't changed, skip the update
            if (existingTime === updatedTime && existing.last_message_preview === updatedConversation.last_message_preview) {
              console.log('⏭️ Skipping conversation update (no changes)');
              return prev;
            }
            
            // If conversation needs to move to top (new message), do it efficiently
            if (updatedTime > existingTime) {
              // Remove from current position and add to top
              const updated = [...prev];
              updated.splice(existingIndex, 1);
              updated.unshift({ ...existing, ...updatedConversation });
              return updated;
            } else {
              // Just update in place without re-sorting
              return prev.map(conv => 
                conv.id === updatedConversation.id 
                  ? { ...conv, ...updatedConversation }
                  : conv
              );
            }
          } else {
            // New conversation, add to top
            return [updatedConversation, ...prev];
          }
        });
      }
    );

    conversationsChannelIdRef.current = channelId;

    return () => {
      if (conversationsChannelIdRef.current) {
        console.log('🔌 Unsubscribing from conversations');
        supabaseService.unsubscribe(conversationsChannelIdRef.current);
        conversationsChannelIdRef.current = null;
      }
      // Clear update timestamps when unmounting
      lastUpdateTimeRef.current = {};
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

  // Memoize filtered conversations to prevent unnecessary recalculations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const name = getConversationName(conv).toLowerCase();
      const preview = (conv.last_message_preview || '').toLowerCase();
      return name.includes(query) || preview.includes(query);
    });
  }, [conversations, searchQuery]);

  const getUnreadCount = (conversation: ChatConversation): number => {
    if (!conversation.participants || !conversation.last_message_at) {
      return 0;
    }

    const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentUserType = currentProfileType === 'company' ? 'company' : 'user';

    const participant = conversation.participants.find((p: any) => 
      p.participant_id === currentUserId && p.participant_type === currentUserType
    );

    if (!participant) {
      return 0;
    }

    const lastReadAt = participant.last_read_at ? new Date(participant.last_read_at).getTime() : 0;
    const lastMessageAt = new Date(conversation.last_message_at).getTime();

    // If last message is after last read, there are unread messages
    if (lastMessageAt > lastReadAt) {
      // For now, we'll show a badge if there are unread messages
      // In the future, we could calculate the actual count if the API provides it
      return 1; // Show badge indicator
    }

    return 0;
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

  // Memoize the conversation item component to prevent unnecessary re-renders
  const ConversationItem = memo(({ item, onSelect }: { item: ChatConversation; onSelect: (item: ChatConversation) => void }) => {
    const avatarUrl = getConversationAvatar(item);
    const name = getConversationName(item);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const unreadCount = getUnreadCount(item);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onSelect(item)}
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
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.conversationName,
              unreadCount > 0 && styles.conversationNameUnread
            ]} numberOfLines={1}>
              {name}
            </Text>
            {item.last_message_at && (
              <Text style={styles.conversationTime}>
                {formatTime(item.last_message_at)}
              </Text>
            )}
          </View>
          
          {item.last_message_preview && (
            <Text style={[
              styles.lastMessage,
              unreadCount > 0 && styles.lastMessageUnread
            ]} numberOfLines={1}>
              {item.last_message_preview}
            </Text>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Return true if props are equal (skip re-render), false if different (re-render)
    const prev = prevProps.item;
    const next = nextProps.item;
    
    // Quick check: if IDs don't match, definitely re-render
    if (prev.id !== next.id) return false;
    
    // Check if key properties changed
    if (
      prev.last_message_at !== next.last_message_at ||
      prev.last_message_preview !== next.last_message_preview
    ) {
      return false; // Re-render needed
    }
    
    // Check participants for unread count changes (compare last_read_at)
    if (prev.participants && next.participants) {
      if (prev.participants.length !== next.participants.length) {
        return false; // Re-render needed
      }
      
      // Check if any participant's last_read_at changed
      for (let i = 0; i < prev.participants.length; i++) {
        const prevPart = prev.participants[i];
        const nextPart = next.participants[i];
        if (
          prevPart.participant_id !== nextPart.participant_id ||
          prevPart.last_read_at !== nextPart.last_read_at
        ) {
          return false; // Re-render needed
        }
      }
    }
    
    // Props are equal, skip re-render
    return true;
  });

  const renderConversationItem = useCallback(({ item }: { item: ChatConversation }) => {
    return <ConversationItem item={item} onSelect={onConversationSelect} />;
  }, [onConversationSelect]);

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

  // Only show loading screen on initial load, not during real-time updates
  // NEVER show loading if we have conversations - this prevents flickering on real-time updates
  const shouldShowLoading = loading && !hasInitiallyLoadedRef.current && conversations.length === 0;
  
  if (shouldShowLoading) {
    console.log('📱 Showing loading screen - loading:', loading, 'hasInitiallyLoaded:', hasInitiallyLoadedRef.current, 'conversations.length:', conversations.length);
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
  
  // Debug log when loading screen should NOT show but loading is true
  if (loading && (hasInitiallyLoadedRef.current || conversations.length > 0)) {
    console.log('⚠️ Loading is true but not showing loading screen - hasInitiallyLoaded:', hasInitiallyLoadedRef.current, 'conversations.length:', conversations.length);
    // Force loading to false if we have conversations - this is a safety measure
    if (conversations.length > 0) {
      console.log('🔧 Force setting loading to false because we have conversations');
      setLoading(false);
    }
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchClearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {error && conversations.length === 0 ? (
        renderError()
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredConversations.length === 0 ? styles.emptyList : undefined}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No conversations found</Text>
                <Text style={styles.emptyStateText}>
                  Try adjusting your search terms
                </Text>
              </View>
            ) : (
              renderEmptyState()
            )
          }
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    padding: 0,
  },
  searchClearButton: {
    marginLeft: 8,
    padding: 4,
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
  lastMessageUnread: {
    fontWeight: '600',
    color: '#000',
  },
  conversationNameUnread: {
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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

