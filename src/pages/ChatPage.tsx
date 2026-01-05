/**
 * Chat Page - StreamChat UI Components
 * 
 * Uses StreamChat's built-in Channel, MessageList, and MessageInput components.
 * This replaces the custom FlashList implementation with StreamChat's optimized UI.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  Channel, 
  MessageList, 
  MessageInput,
  useChatContext,
  Thread,
} from 'stream-chat-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApi } from '../contexts/ApiContext';
import { ChatPageProps } from '../types';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';
import streamChatService from '../services/StreamChatService';
import { getStreamChannelId, getOneCrewConversationId } from '../utils/streamChatMapping';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChatPage: React.FC<ChatPageProps> = ({
  conversationId: conversationIdProp,
  participant: participantProp,
  courseData: courseDataProp,
  onBack: onBackProp,
}) => {
  const route = useRoute<RootStackScreenProps<'chat'>['route']>();
  const { goBack } = useAppNavigation();
  
  // All hooks must be called unconditionally and in the same order
  const insets = useSafeAreaInsets();
  const { 
    getConversationById, 
    createConversation,
    user, 
    currentProfileType, 
    activeCompany 
  } = useApi();
  
  // Get route params if available, otherwise use props
  const routeParams = route.params;
  const conversationId = routeParams?.conversationId || conversationIdProp;
  const participant = routeParams?.participant || participantProp;
  const courseData = routeParams?.courseData || courseDataProp;
  const onBack = onBackProp || goBack;

  // Try to get chat context - use optional chaining to handle when context isn't ready
  // Note: useChatContext must be called unconditionally, but we handle undefined client
  let chatContext;
  try {
    chatContext = useChatContext();
  } catch (error) {
    // Context not available - this is expected during initial render
    chatContext = null;
  }
  
  const client = chatContext?.client;

  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);

  // Get StreamChat channel ID from OneCrew conversation ID
  const streamChannelId = useMemo(() => {
    if (!conversationId) return null;
    return getStreamChannelId(conversationId);
  }, [conversationId]);

  // Initialize or retrieve channel
  useEffect(() => {
    const initializeChannel = async () => {
      if (!client) {
        console.log('⏳ [ChatPage] Waiting for StreamChat client...');
        // Keep loading state - client might be initializing
        // The effect will re-run when client becomes available
        return;
      }

      // If no conversationId, try to create conversation from participant
      if (!conversationId && participant) {
        try {
          setLoading(true);
          setError(null);

          // Create conversation first
          const createResponse = await createConversation({
            conversation_type: currentProfileType === 'company' ? 'user_company' : 'user_user',
            participant_ids: [participant.id || participant.user_id],
          });

          if (!createResponse.success || !createResponse.data) {
            throw new Error(createResponse.error || 'Failed to create conversation');
          }

          // Get the new conversation ID and create channel
          const newConversationId = createResponse.data.id;
          const newStreamChannelId = getStreamChannelId(newConversationId);
          
          // Wait a bit for backend to create the channel in StreamChat
          // Backend should handle channel creation and member management
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const channelType = 'messaging';
          // Extract just the ID part (without messaging: prefix) for channel creation
          const channelIdOnly = newStreamChannelId.replace(/^messaging:/, '');
          
          // Get conversation details for channel name
          const conversationResponse = await getConversationById(newConversationId);
          const channelName = conversationResponse.success && conversationResponse.data 
            ? conversationResponse.data.name 
            : undefined;
          
          // Create channel instance - don't specify members, let backend handle it
          // StreamChat will automatically add the current connected user as a member
          let channelInstance = client.channel(channelType, channelIdOnly, {
            ...(channelName && { name: channelName }),
          });

          // Try to watch the channel (backend should have created it)
          try {
            await channelInstance.watch();
            console.log('✅ Channel watched successfully, messages should load');
            setChannel(channelInstance);
          } catch (watchError: any) {
            // If channel doesn't exist in StreamChat yet, try to create it
            // Only include current user - backend will add other members
            console.log('⚠️ Channel not found in StreamChat, attempting to create...');
            try {
              // Use getOrCreate which is safer - it will create if needed or get existing
              await channelInstance.watch();
              console.log('✅ Channel watched after retry');
              setChannel(channelInstance);
            } catch (createError: any) {
              console.error('❌ Failed to watch channel:', createError);
              // If backend hasn't created it yet, wait a bit more and retry
              await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                await channelInstance.watch();
                console.log('✅ Channel watched after additional wait');
                setChannel(channelInstance);
              } catch (finalError: any) {
                console.error('❌ Final attempt to watch channel failed:', finalError);
                throw new Error('Channel not available. Please try again in a moment.');
              }
            }
          }
        } catch (err: any) {
          console.error('Failed to create conversation and channel:', err);
          setError(err.message || 'Failed to create chat');
        } finally {
          setLoading(false);
        }
        return;
      }

      // If we have a conversationId, try to load existing channel
      if (!streamChannelId) {
        setLoading(false);
        setError('No conversation ID provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const channelType = 'messaging';
        // Extract just the ID part (without messaging: prefix) for channel creation
        const channelIdOnly = streamChannelId.replace(/^messaging:/, '');
        let channelInstance = client.channel(channelType, channelIdOnly);

        // Try to watch the channel (this will load it if it exists)
        try {
          await channelInstance.watch();
          console.log('✅ Channel watched successfully, messages should load');
          setChannel(channelInstance);
        } catch (watchError: any) {
          console.log('⚠️ Channel watch failed:', watchError?.message || watchError);
          // Channel might not exist in StreamChat yet
          console.log('Channel not found in StreamChat, checking backend...');
          
          // Check if conversation exists in backend
          const conversationResponse = await getConversationById(conversationId!);
          if (conversationResponse.success && conversationResponse.data) {
            // Conversation exists - get channel name but don't specify members
            // Backend should handle member management
            const conversation = conversationResponse.data;
            
            // Create channel instance without members - backend manages them
            // StreamChat will automatically include the current connected user
            channelInstance = client.channel(channelType, channelIdOnly, {
              ...(conversation.name && { name: conversation.name }),
            });

            // Try to watch the channel (backend should have created it)
            try {
              await channelInstance.watch();
              console.log('✅ Channel watched successfully');
              setChannel(channelInstance);
            } catch (watchError2: any) {
              console.error('❌ Failed to watch channel:', watchError2);
              // If backend hasn't created it yet, wait and retry
              console.log('⏳ Waiting for backend to create channel...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                await channelInstance.watch();
                console.log('✅ Channel watched after retry');
                setChannel(channelInstance);
              } catch (finalError: any) {
                console.error('❌ Final attempt to watch channel failed:', finalError);
                throw new Error('Channel not available. The backend may still be creating it. Please try again in a moment.');
              }
            }
          } else {
            throw new Error('Conversation not found in backend');
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize channel:', err);
        setError(err.message || 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    initializeChannel();
  }, [client, streamChannelId, conversationId, participant, getConversationById, createConversation, currentProfileType]);

  // Show loading state if client is not available yet (must be after all hooks)
  if (!client) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Connecting to chat...</Text>
        </View>
      </View>
    );
  }

  // Custom message input handler to integrate with backend
  const handleSendMessage = useCallback(async (message: any) => {
    if (!channel || !conversationId) return;

    try {
      // StreamChat will handle sending the message
      // But we might want to sync with backend if needed
      // For now, let StreamChat handle it since backend should be syncing
      
      // Mark as read after sending
      await channel.markRead();
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [channel, conversationId]);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadMessage: any) => {
    setThread(threadMessage);
  }, []);

  // Handle thread close
  const handleThreadDismiss = useCallback(() => {
    setThread(null);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              // Retry initialization
              const streamChannelId = conversationId ? getStreamChannelId(conversationId) : null;
              if (streamChannelId && client) {
                const channelIdOnly = streamChannelId.replace(/^messaging:/, '');
                const channelInstance = client.channel('messaging', channelIdOnly);
                channelInstance.watch()
                  .then(() => {
                    setChannel(channelInstance);
                    setLoading(false);
                  })
                  .catch((err) => {
                    setError(err.message || 'Failed to load chat');
                    setLoading(false);
                  });
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!channel) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Channel not available</Text>
        </View>
      </View>
    );
  }

  // If thread is open, show thread view
  if (thread) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleThreadDismiss} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thread</Text>
          <View style={styles.headerRight} />
        </View>
        <Thread thread={thread} />
      </View>
    );
  }

  // Log channel state for debugging
  useEffect(() => {
    if (channel) {
      console.log('💬 [ChatPage] Channel state:', {
        channelId: channel.id,
        channelCid: channel.cid,
        channelName: channel.data?.name,
        hasMessages: channel.state?.messages?.length > 0,
        messageCount: channel.state?.messages?.length || 0,
        isWatched: channel.state?.watched,
      });
    }
  }, [channel]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {channel?.data?.name || 'Chat'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {channel ? (
        <Channel
          channel={channel}
          onThreadSelect={handleThreadSelect}
          // Custom message input handler
          SendMessageButton={({ sendMessage, text }) => (
            <TouchableOpacity
              style={[styles.sendButton, !text?.trim() && styles.sendButtonDisabled]}
              onPress={() => {
                if (text?.trim()) {
                  sendMessage();
                  handleSendMessage({ text });
                }
              }}
              disabled={!text?.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={text?.trim() ? '#fff' : '#9ca3af'} 
              />
            </TouchableOpacity>
          )}
        >
          <MessageList 
            onThreadSelect={handleThreadSelect}
            // Mark as read when viewing
            onMessageRead={() => {
              channel.markRead().catch(console.error);
            }}
            // Empty state
            EmptyStateIndicator={() => (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No messages yet</Text>
                <Text style={styles.emptyStateSubtext}>Start the conversation!</Text>
              </View>
            )}
          />
          <MessageInput />
        </Channel>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Channel not available</Text>
        </View>
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
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ChatPage;
