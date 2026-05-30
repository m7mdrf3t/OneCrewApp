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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ChannelList } from 'stream-chat-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useApi } from '../contexts/ApiContext';
import { useStreamChatReady } from '../components/StreamChatProvider';
import SearchBar from '../components/SearchBar';
import { ConversationsListPageProps } from '../types';
import streamChatService from '../services/StreamChatService';
import { getStreamChannelId, getOneCrewConversationId } from '../utils/streamChatMapping';
import streamChatConnectionMonitor from '../utils/StreamChatConnectionMonitor';

type SearchMemberResult = {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string | null;
  participant: any;
  participantType: 'user' | 'company';
};

const ConversationsListPage: React.FC<ConversationsListPageProps> = ({
  onBack: onBackProp,
  onConversationSelect: onConversationSelectProp,
}) => {
  const route = useRoute<RootStackScreenProps<'conversations'>['route']>();
  const navigation = useNavigation();
  const { navigateTo, goBack } = useAppNavigation();
  const {
    api,
    user,
    currentProfileType,
    activeCompany,
    getUsersDirect,
    browseUsersAsGuest,
    getCompanies,
    isGuest,
    getAccessToken,
    getBaseUrl,
  } = useApi();
  const { clientReady } = useStreamChatReady();
  const isConnected = streamChatService.isConnected();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchMemberResult[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [deletingChannelCid, setDeletingChannelCid] = useState<string | null>(null);
  const [hiddenChannelKeys, setHiddenChannelKeys] = useState<string[]>([]);
  const [channelListRefreshNonce, setChannelListRefreshNonce] = useState(0);

  const onBack = onBackProp || goBack;

  // Safe: use service getCurrentUserId (client.userID can throw when disconnected)
  const currentStreamUserId = useMemo(
    () => (clientReady ? streamChatService.getCurrentUserId() : null),
    [clientReady]
  );

  // CRITICAL: Create a key that changes when profile switches
  // This forces ChannelList to remount and re-query when switching profiles
  const channelListKey = useMemo(() => {
    return `${currentStreamUserId || 'no-user'}-${currentProfileType}-${activeCompany?.id || 'no-company'}-${channelListRefreshNonce}`;
  }, [currentStreamUserId, currentProfileType, activeCompany?.id, channelListRefreshNonce]);

  // Log profile changes for debugging
  useEffect(() => {
    console.log('💬 [ConversationsListPage] Profile changed, refreshing channel list...', {
      currentStreamUserId,
      currentProfileType,
      activeCompanyId: activeCompany?.id,
      channelListKey,
    });
  }, [channelListKey, currentStreamUserId, currentProfileType, activeCompany?.id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
      console.log('[ConversationsListPage] Navigating to chat with conversationId:', conversationId);
      
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

  const handleMemberSelect = useCallback((member: SearchMemberResult) => {
    if (navigateTo) {
      navigateTo('chat', { participant: member.participant });
    } else if (navigation) {
      (navigation as any).navigate('chat', { participant: member.participant });
    }
  }, [navigateTo, navigation]);

  const handleDeleteConversation = useCallback((channel: any) => {
    if (!channel) return;

    const channelIdentifier = channel.id || channel.cid || '';
    const extractedConversationId = getOneCrewConversationId(channelIdentifier);
    const fallbackConversationId =
      channel?.data?.conversation_id ||
      extractedConversationId ||
      channel?.id;

    if (!fallbackConversationId) {
      Alert.alert('Error', 'Could not identify this conversation.');
      return;
    }

    Alert.alert(
      'Delete chat?',
      'This will permanently remove this chat from your conversations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const targetCid = channel?.cid || channel?.id || fallbackConversationId;

            try {
              setDeletingChannelCid(targetCid);

              const idCandidates = Array.from(new Set([
                channel?.data?.conversation_id,
                extractedConversationId,
                channel?.id,
              ].filter(Boolean)));

              let deleteSucceeded = false;
              let lastError: any = null;

              for (const candidateId of idCandidates) {
                try {
                  const token = getAccessToken();
                  if (!token) {
                    throw new Error('No access token available');
                  }

                  const baseUrl = getBaseUrl();
                  const params = new URLSearchParams({
                    profile_type: currentProfileType === 'company' ? 'company' : 'user',
                  });

                  if (currentProfileType === 'company' && activeCompany?.id) {
                    params.set('company_id', activeCompany.id);
                  }

                  const url = `${baseUrl}/api/chat/conversations/${encodeURIComponent(String(candidateId))}?${params.toString()}`;
                  const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  const result = await response.json().catch(() => ({}));
                  if (!response.ok || result?.success === false) {
                    throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}`);
                  }

                  deleteSucceeded = true;
                  break;
                } catch (err) {
                  lastError = err;
                }
              }

              if (!deleteSucceeded) {
                throw lastError || new Error('Failed to delete conversation');
              }

              try {
                await channel?.stopWatching?.();
              } catch (err) {
                if (__DEV__) {
                  console.warn('⚠️ [ConversationsListPage] stopWatching failed after delete:', err);
                }
              }

              // Hide deleted row immediately from local list rendering.
              setHiddenChannelKeys((prev) => {
                const next = new Set(prev);
                if (channel?.cid) next.add(String(channel.cid));
                if (channel?.id) next.add(String(channel.id));
                if (channel?.data?.conversation_id) next.add(String(channel.data.conversation_id));
                if (extractedConversationId) next.add(String(extractedConversationId));
                return Array.from(next);
              });

              setChannelListRefreshNonce((prev) => prev + 1);
              Alert.alert('Removed', 'Chat was removed successfully.');
            } catch (err: any) {
              console.error('❌ [ConversationsListPage] Failed to delete conversation:', err);
              Alert.alert('Error', err?.message || 'Failed to delete chat. Please try again.');
            } finally {
              setDeletingChannelCid(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [getAccessToken, getBaseUrl, currentProfileType, activeCompany?.id]);

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

  const getInitials = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return '?';

    const parts = trimmedName.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return trimmedName.slice(0, 2).toUpperCase();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const searchMembers = async () => {
      if (!debouncedSearchQuery) {
        setMemberSearchResults([]);
        setIsSearchingMembers(false);
        return;
      }

      setIsSearchingMembers(true);

      try {
        const userParams = {
          search: debouncedSearchQuery,
          limit: 8,
          page: 1,
        };

        const companyParams = {
          search: debouncedSearchQuery,
          limit: 8,
          page: 1,
          fields: ['id', 'name', 'logo_url', 'subcategory', 'company_type_info'],
          sort: 'name' as const,
          order: 'asc' as const,
        };

        const usersPromise = isGuest
          ? browseUsersAsGuest(userParams)
          : getUsersDirect(userParams).catch(async () => api.getUsers({ search: debouncedSearchQuery, limit: 8, page: 1 }));

        const [usersResponse, companiesResponse] = await Promise.all([
          usersPromise,
          getCompanies(companyParams),
        ]);

        const usersData = usersResponse?.data?.data || usersResponse?.data || [];
        const companiesData = companiesResponse?.data?.data || companiesResponse?.data || [];

        const usersArray = Array.isArray(usersData)
          ? usersData
          : Array.isArray(usersData?.users)
            ? usersData.users
            : [];

        const companiesArray = Array.isArray(companiesData) ? companiesData : [];

        const userResults: SearchMemberResult[] = usersArray
          .filter((member: any) => member?.id && member.id !== user?.id)
          .map((member: any) => ({
            id: `user-${member.id}`,
            name: member.name || 'Unknown',
            subtitle: member.primary_role || member.category || 'Member',
            imageUrl:
              member.image_url ||
              member.image ||
              member.imageUrl ||
              member.avatar ||
              member.avatar_url ||
              member.avatarUrl ||
              null,
            participant: member,
            participantType: 'user' as const,
          }));

        const companyResults: SearchMemberResult[] = companiesArray
          .filter((company: any) => company?.id && company.id !== activeCompany?.id)
          .map((company: any) => ({
            id: `company-${company.id}`,
            name: company.name || 'Unknown company',
            subtitle: company.company_type_info?.name || company.subcategory || 'Company',
            imageUrl:
              company.logo_url ||
              company.image_url ||
              company.image ||
              company.imageUrl ||
              company.avatar ||
              company.avatar_url ||
              company.avatarUrl ||
              null,
            participant: {
              ...company,
              category: 'company',
            },
            participantType: 'company' as const,
          }));

        if (!isCancelled) {
          setMemberSearchResults([...userResults, ...companyResults]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('❌ [ConversationsListPage] Failed to search members:', error);
          setMemberSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingMembers(false);
        }
      }
    };

    searchMembers();

    return () => {
      isCancelled = true;
    };
  }, [
    activeCompany?.id,
    api,
    browseUsersAsGuest,
    debouncedSearchQuery,
    getCompanies,
    getUsersDirect,
    isGuest,
    user?.id,
  ]);

  const hasActiveMemberSearch = debouncedSearchQuery.length > 0;

  // Custom channel preview component to match app design
  // Memoized for performance optimization
  const ChannelPreview = React.memo(useCallback(({ channel }: any) => {
    if (!channel) {
      return null;
    }

    const otherMembers = Object.values(channel?.state?.members || {}).filter(
      (member: any) => member.user?.id !== currentStreamUserId
    ) as any[];

    const primaryOtherUser = otherMembers[0]?.user;
    const displayName =
      channel?.data?.name ||
      otherMembers
        .map((member: any) => member.user?.name || member.user?.id)
        .filter(Boolean)
        .join(', ') ||
      'Unknown';
    const avatarUrl =
      channel?.data?.image ||
      channel?.data?.image_url ||
      channel?.data?.logo_url ||
      primaryOtherUser?.image ||
      primaryOtherUser?.image_url ||
      primaryOtherUser?.logo_url ||
      primaryOtherUser?.imageUrl ||
      primaryOtherUser?.avatar ||
      primaryOtherUser?.avatar_url ||
      primaryOtherUser?.avatarUrl ||
      primaryOtherUser?.profile_image ||
      primaryOtherUser?.profile_image_url ||
      primaryOtherUser?.profileImage ||
      primaryOtherUser?.profileImageUrl ||
      primaryOtherUser?.photo_url ||
      primaryOtherUser?.photoUrl ||
      primaryOtherUser?.logoUrl ||
      null;

    const lastMessage = channel?.state?.messages?.[channel.state.messages.length - 1];
    const isForwardedLastMessage =
      lastMessage?.is_forwarded === true ||
      lastMessage?.forwarded === true ||
      lastMessage?.forwarded_message === true;
    const lastMessageBody = lastMessage?.text || 'No messages yet';
    const lastMessageText = isForwardedLastMessage
      ? `Forwarded: ${lastMessageBody}`
      : lastMessageBody;
    const unreadCount = channel?.state?.unreadCount || 0;
    const channelCid = channel?.cid || channel?.id;
    const isDeleting = !!channelCid && deletingChannelCid === channelCid;

    return (
      <Swipeable
        enabled={!isDeleting}
        overshootRight={false}
        rightThreshold={40}
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.swipeDeleteButton}
            onPress={() => handleDeleteConversation(channel)}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.swipeDeleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[styles.channelPreview, isDeleting && styles.channelPreviewDeleting]}
          onPress={() => {
            console.log('👆 [ChannelPreview] Channel tapped:', {
              channelId: channel.id,
              channelCid: channel.cid,
            });
            handleChannelSelect(channel);
          }}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.channelAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={styles.channelAvatarPlaceholder}>
              <Text style={styles.channelAvatarText}>{getInitials(displayName)}</Text>
            </View>
          )}
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
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.lastMessageUnread,
                isDeleting && styles.lastMessageDeleting,
              ]}
              numberOfLines={1}
            >
              {isDeleting ? 'Removing...' : lastMessageText}
            </Text>
          </View>
          {isDeleting ? (
            <ActivityIndicator size="small" color="#94A3B8" style={{ marginRight: 8 }} />
          ) : unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </Swipeable>
    );
  }, [currentStreamUserId, getInitials, handleChannelSelect, handleDeleteConversation, deletingChannelCid]));

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
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </View>

      {deletingChannelCid ? (
        <View style={styles.removingBanner}>
          <ActivityIndicator size="small" color="#dc2626" />
          <Text style={styles.removingBannerText}>Removing chat...</Text>
        </View>
      ) : null}

      {hasActiveMemberSearch ? (
        <View style={styles.searchResultsContainer}>
          {isSearchingMembers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Searching members...</Text>
            </View>
          ) : memberSearchResults.length > 0 ? (
            memberSearchResults.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.searchResultRow}
                onPress={() => handleMemberSelect(member)}
                activeOpacity={0.7}
              >
                {member.imageUrl ? (
                  <Image
                    source={{ uri: member.imageUrl }}
                    style={styles.searchResultAvatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <View style={styles.searchResultAvatarPlaceholder}>
                    <Text style={styles.searchResultAvatarText}>{getInitials(member.name)}</Text>
                  </View>
                )}
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                    {member.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No members found</Text>
              <Text style={styles.emptyStateText}>
                Try another name to start a new chat
              </Text>
            </View>
          )}
        </View>
      ) : (
        <ChannelList
          key={channelListKey}
          filters={filters}
          sort={sort}
          channelRenderFilterFn={(channels) => {
            if (!hiddenChannelKeys.length) return channels;
            const hidden = new Set(hiddenChannelKeys);
            return channels.filter((ch: any) => {
              const keyCandidates = [
                ch?.cid,
                ch?.id,
                ch?.data?.conversation_id,
                getOneCrewConversationId(ch?.id || ch?.cid || ''),
              ].filter(Boolean).map(String);

              return !keyCandidates.some((k) => hidden.has(k));
            });
          }}
          options={{
            limit: 15,
            watch: true,
            state: true,
          }}
          Preview={ChannelPreview}
          // Note: onSelect is handled by the custom Preview component's onPress
          // Performance optimizations for FlatList
          additionalFlatListProps={{
            removeClippedSubviews: true,
            maxToRenderPerBatch: 10,
            windowSize: 5,
            initialNumToRender: 10,
            updateCellsBatchingPeriod: 50,
          }}
          // Empty state
          EmptyStateIndicator={() => (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No conversations yet</Text>
              <Text style={styles.emptyStateText}>
                Visit someone's profile to start a chat, or use the search bar above to message a member
              </Text>
            </View>
          )}
          LoadingIndicator={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )}
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
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
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  searchResultAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0369A1',
  },
  searchResultAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  searchResultContent: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchResultSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  channelPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  channelPreviewDeleting: {
    opacity: 0.55,
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  channelAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#0369A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
    color: '#0F172A',
    flex: 1,
  },
  channelNameUnread: {
    fontWeight: '700',
  },
  channelTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748B',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#0F172A',
  },
  lastMessageDeleting: {
    color: '#dc2626',
    fontWeight: '600',
  },
  removingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  removingBannerText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
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
  swipeDeleteButton: {
    width: 96,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 12,
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
    color: '#334155',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ConversationsListPage;
