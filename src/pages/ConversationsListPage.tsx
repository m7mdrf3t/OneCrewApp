import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useApi } from '../contexts/ApiContext';
import { ConversationsListPageProps, ChatConversation, ChatParticipant } from '../types';
import supabaseService from '../services/SupabaseService';
import SkeletonConversationItem from '../components/SkeletonConversationItem';

// NOTE: FlashList runtime supports `estimatedItemSize`, but our current TS setup may not expose it.
// We cast to keep the perf optimization without blocking typecheck; revisit after dependency upgrades.
const FlashListUnsafe: React.ComponentType<any> = FlashList as any;

const ConversationsListPage: React.FC<ConversationsListPageProps> = ({
  onBack: onBackProp,
  onConversationSelect: onConversationSelectProp,
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'conversations'>['route']>();
  const navigation = useNavigation();
  const routeParams = route.params;
  const { navigateTo, goBack } = useAppNavigation();
  
  // Use props if provided (for backward compatibility), otherwise use navigation hooks
  const onBack = onBackProp || goBack;
  
  // Create default handler that navigates to chat page when onConversationSelect is not provided
  const handleConversationSelect = useCallback((conversation: ChatConversation) => {
    if (onConversationSelectProp) {
      onConversationSelectProp(conversation);
    } else if (navigateTo) {
      // Navigate to chat page with conversation ID
      navigateTo('chat', { conversationId: conversation.id });
    }
  }, [onConversationSelectProp, navigateTo]);
  const { getConversations, getConversationById, user, currentProfileType, activeCompany } = useApi();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const conversationsChannelIdRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<{ [key: string]: number }>({});
  const currentProfileId =
    currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
  const currentProfileTypeValue = currentProfileType === 'company' ? 'company' : 'user';

  type ConversationsPage = {
    items: ChatConversation[];
    page: number;
    totalPages?: number;
  };

  const conversationsQueryKey = useMemo(
    () => ['conversations', currentProfileTypeValue, currentProfileId, { limit: 20 }],
    [currentProfileTypeValue, currentProfileId]
  );

  const conversationsQuery = useInfiniteQuery<ConversationsPage>({
    queryKey: conversationsQueryKey,
    enabled: !!currentProfileId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const pageNum = typeof pageParam === 'number' ? pageParam : 1;
      const response = await getConversations({ page: pageNum, limit: 20 });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load conversations');
      }
      const data = response.data.data || response.data;
      const pagination = response.data.pagination;

      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((conv: ChatConversation) => {
        if (!conv || !Array.isArray(conv.participants)) return false;
        return conv.participants.some(
          (p: any) =>
            p.participant_id === currentProfileId && p.participant_type === currentProfileTypeValue
        );
      });

      return {
        items: filtered,
        page: pageNum,
        totalPages: pagination?.totalPages,
      };
    },
    getNextPageParam: (lastPage) => {
      if (typeof lastPage.totalPages === 'number') {
        return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
      }
      // If server didn't return pagination, stop (conservative)
      return undefined;
    },
  });

  const conversations = useMemo(() => {
    const pages = conversationsQuery.data?.pages ?? [];
    const merged: ChatConversation[] = [];
    const seen = new Set<string>();
    pages.forEach((p) => {
      (p.items || []).forEach((c) => {
        if (!c?.id) return;
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      });
    });

    // Keep list stable but ensure newest messages float to top
    merged.sort((a, b) => {
      const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bt - at;
    });

    return merged;
  }, [conversationsQuery.data]);

  const loading = conversationsQuery.isLoading;
  const refreshing = conversationsQuery.isRefetching && !conversationsQuery.isFetchingNextPage;
  const hasMore = !!conversationsQuery.hasNextPage;
  const error: string | null = (() => {
    const err: any = conversationsQuery.error;
    return err ? (err instanceof Error ? err.message : String(err)) : null;
  })();

  // Subscribe to real-time conversation updates
  useEffect(() => {
    // Determine the current profile ID based on profile type
    const currentProfileId = currentProfileType === 'company' && activeCompany 
      ? activeCompany.id 
      : user?.id;
    
    if (!currentProfileId || !supabaseService.isInitialized()) {
      return;
    }

    console.log('💬 Setting up real-time subscription for conversations', {
      profileType: currentProfileType,
      profileId: currentProfileId,
    });

    // Cleanup previous subscription
    if (conversationsChannelIdRef.current) {
      supabaseService.unsubscribe(conversationsChannelIdRef.current);
      conversationsChannelIdRef.current = null;
    }

    // Subscribe to conversation updates using the current profile ID
    const channelId = supabaseService.subscribeToConversations(
      currentProfileId,
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
        
        const isParticipant = updatedConversation.participants?.some(
          (p: any) =>
            p.participant_id === currentProfileId && p.participant_type === currentProfileTypeValue
        );
        if (!isParticipant) return;

        queryClient.setQueryData(conversationsQueryKey, (old: any) => {
          const base = old ?? { pages: [], pageParams: [1] };
          const pages = Array.isArray(base.pages) ? base.pages : [];

          // Remove existing occurrences
          const cleaned = pages.map((p: any) => ({
            ...p,
            items: Array.isArray(p.items) ? p.items.filter((c: any) => c?.id !== updatedConversation.id) : [],
          }));

          if (cleaned.length === 0) {
            return {
              ...base,
              pages: [{ items: [updatedConversation], page: 1, totalPages: 1 }],
              pageParams: [1],
            };
          }

          const first = cleaned[0];
          const firstItems = Array.isArray(first.items) ? first.items : [];
          cleaned[0] = { ...first, items: [updatedConversation, ...firstItems] };

          return { ...base, pages: cleaned };
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
  }, [user?.id, currentProfileType, activeCompany?.id]); // Update subscription when profile changes

  const handleRefresh = useCallback(() => {
    // Keep refresh light: drop cached pages to page 1 then refetch.
    queryClient.setQueryData(conversationsQueryKey, (old: any) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.slice(0, 1),
        pageParams: old.pageParams?.slice?.(0, 1) ?? old.pageParams,
      };
    });
    conversationsQuery.refetch();
  }, [queryClient, conversationsQueryKey, conversationsQuery]);

  const handleLoadMore = useCallback(() => {
    if (!conversationsQuery.hasNextPage || conversationsQuery.isFetchingNextPage) return;
    conversationsQuery.fetchNextPage();
  }, [conversationsQuery]);

  const getConversationName = (conversation: ChatConversation): string => {
    if (conversation.name) {
      return conversation.name;
    }
    
    // When viewing as a company, show the company name for conversations involving the company
    if (currentProfileType === 'company' && activeCompany) {
      // Check if this conversation involves the active company
      const hasCompanyParticipant = conversation.participants?.some(p => 
        p.participant_type === 'company' && p.participant_id === activeCompany.id
      );
      if (hasCompanyParticipant) {
        // Show the other participant's name, or company name if it's a company_company conversation
        const otherParticipants = conversation.participants?.filter(p => 
          !(p.participant_type === 'company' && p.participant_id === activeCompany.id)
        ) || [];
        
        if (otherParticipants.length > 0) {
          const participant = otherParticipants[0];
          if (participant.user) {
            return participant.user.name || 'Unknown User';
          } else if (participant.company) {
            return participant.company.name || 'Unknown Company';
          }
        }
        // Fallback: if it's a company_company conversation and we can't find other participant, show company name
        return activeCompany.name || 'Unknown Company';
      }
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
        // Check if participant data is loaded
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

  // Helper function to validate conversation belongs to current profile
  const validateConversationForProfile = useCallback((conv: ChatConversation): boolean => {
    if (!conv || !conv.participants || !Array.isArray(conv.participants)) {
      return false;
    }
    
    const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentProfileTypeValue = currentProfileType === 'company' ? 'company' : 'user';
    
    // Check if current profile is a participant
    return conv.participants.some((p: any) => 
      p.participant_id === currentProfileId && p.participant_type === currentProfileTypeValue
    );
  }, [currentProfileType, activeCompany?.id, user?.id]);

  // Memoize filtered conversations to prevent unnecessary recalculations
  const filteredConversations = useMemo(() => {
    // First filter by profile - only show conversations where current profile is a participant
    const profileFiltered = conversations.filter(conv => validateConversationForProfile(conv));
    
    if (!searchQuery.trim()) return profileFiltered;
    
    const query = searchQuery.toLowerCase();
    return profileFiltered.filter(conv => {
      const name = getConversationName(conv).toLowerCase();
      const preview = (conv.last_message_preview || '').toLowerCase();
      return name.includes(query) || preview.includes(query);
    });
  }, [conversations, searchQuery, validateConversationForProfile]);

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
    const [conversationData, setConversationData] = useState<ChatConversation>(item);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const getConversationByIdRef = useRef(getConversationById);
    
    // Keep ref updated
    useEffect(() => {
      getConversationByIdRef.current = getConversationById;
    }, [getConversationById]);
    
    // Update conversationData when item prop changes
    useEffect(() => {
      setConversationData(item);
    }, [item.id, item.last_message_at, item.last_message_preview]);
    
    // Fetch full conversation details if participant data is missing
    useEffect(() => {
      const hasMissingParticipantData = conversationData.participants?.some(p => 
        (p.participant_type === 'user' && !p.user) || 
        (p.participant_type === 'company' && !p.company)
      );
      
      if (hasMissingParticipantData && !isLoadingDetails && getConversationByIdRef.current) {
        setIsLoadingDetails(true);
        getConversationByIdRef.current(conversationData.id)
          .then(response => {
            if (response.success && response.data) {
              setConversationData(response.data);
            }
          })
          .catch(err => {
            console.error('Failed to fetch conversation details:', err);
          })
          .finally(() => {
            setIsLoadingDetails(false);
          });
      }
    }, [conversationData.id, conversationData.participants, isLoadingDetails]);
    
    const avatarUrl = getConversationAvatar(conversationData);
    const name = getConversationName(conversationData);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const unreadCount = getUnreadCount(conversationData);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          if (onSelect) {
            onSelect(conversationData);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={150} />
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
            {conversationData.last_message_at && (
              <Text style={styles.conversationTime}>
                {formatTime(conversationData.last_message_at)}
              </Text>
            )}
          </View>
          
          <Text style={[
            styles.lastMessage,
            unreadCount > 0 && styles.lastMessageUnread
          ]} numberOfLines={1}>
            {conversationData.last_message_preview || 'No messages yet'}
          </Text>
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
    return <ConversationItem item={item} onSelect={handleConversationSelect} />;
  }, [handleConversationSelect]);

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
            conversationsQuery.refetch();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Only show loading screen on initial load, not during real-time updates
  // NEVER show loading if we have conversations - this prevents flickering on real-time updates
  const shouldShowLoading = loading && conversations.length === 0;
  
  if (shouldShowLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerRight} />
        </View>
        <FlashListUnsafe
          data={Array.from({ length: 8 })}
          renderItem={() => <SkeletonConversationItem isDark={false} />}
          keyExtractor={(_: any, index: number) => `skeleton-conversation-${index}`}
          contentContainerStyle={styles.skeletonList}
          estimatedItemSize={72}
        />
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
        <FlashListUnsafe
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item: ChatConversation) => item.id}
          contentContainerStyle={filteredConversations.length === 0 ? styles.emptyList : undefined}
          estimatedItemSize={72}
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
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            conversationsQuery.isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                {Array.from({ length: 2 }).map((_, index) => (
                  <SkeletonConversationItem key={`footer-skeleton-${index}`} isDark={false} />
                ))}
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
    paddingVertical: 8,
  },
  skeletonList: {
    paddingVertical: 0,
  },
});

export default ConversationsListPage;

