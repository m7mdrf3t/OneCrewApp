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
  KeyboardAvoidingView,
  Platform,
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
    api,
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
  // Note: useChatContext must be called unconditionally
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

  // Log channel state and ensure it's watched - MUST be called before any conditional returns
  useEffect(() => {
    if (channel) {
      console.log('💬 [ChatPage] Channel state:', {
        channelId: channel.id,
        channelCid: channel.cid,
        channelName: channel.data?.name,
        hasMessages: channel.state?.messages?.length > 0,
        messageCount: channel.state?.messages?.length || 0,
        isWatched: channel.state?.watched,
        channelData: channel.data,
      });
      
      // Ensure channel is watched (required for MessageInput to work)
      if (!channel.state?.watched) {
        console.log('⏳ [ChatPage] Channel not watched yet, watching...');
        channel.watch().then(() => {
          console.log('✅ [ChatPage] Channel watched successfully - MessageInput should be available');
        }).catch((err) => {
          console.error('❌ [ChatPage] Failed to watch channel:', err);
        });
      } else {
        console.log('✅ [ChatPage] Channel is watched - MessageInput should be visible');
      }
    } else {
      console.log('⏳ [ChatPage] No channel yet, waiting for initialization...');
    }
  }, [channel]);

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

          // Get the new conversation ID from backend response
          // CRITICAL: Backend returns the actual StreamChat channel ID (not a UUID)
          // The backend generates channel IDs like: user_user-{hash} or {type}-{id1}-{id2}
          // We should use this ID directly without transformation
          const newConversationId = createResponse.data.id;
          console.log('💬 [ChatPage] Backend returned conversation ID:', newConversationId);
          
          // CRITICAL: Call backend API first to ensure user is added as member
          // This will trigger checkConversationAccess which automatically adds user if missing
          console.log('🔄 [ChatPage] Ensuring backend access to conversation...');
          const conversationResponse = await getConversationById(newConversationId);
          
          if (!conversationResponse.success) {
            throw new Error('Failed to access conversation. Please try again.');
          }
          
          console.log('✅ [ChatPage] Backend confirmed access, user is now a member');
          
          // Wait a moment for StreamChat to sync the member addition
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const channelType = 'messaging';
          // CRITICAL: Use the conversation ID directly from backend
          // The backend already returns the correct StreamChat channel ID format
          // No need to transform it with getStreamChannelId()
          const channelIdOnly = newConversationId;
          
          // Use conversation data from create response
          const channelName = createResponse.data?.name || undefined;
          
          // Get current user's StreamChat ID
          const currentStreamUserId = client.userID;
          if (!currentStreamUserId) {
            throw new Error('StreamChat user not connected');
          }
          
          // Create channel instance using the conversation ID from backend
          // The backend already created the channel with proper members, so we just need to watch it
          console.log('💬 [ChatPage] Creating channel instance with ID:', channelIdOnly);
          let channelInstance = client.channel(channelType, channelIdOnly);

          // Try to watch the channel (backend should have already created it with members)
          try {
            console.log('🔄 [ChatPage] Attempting to watch channel...');
            await channelInstance.watch();
            console.log('✅ [ChatPage] Channel watched successfully');
            setChannel(channelInstance);
          } catch (watchError: any) {
            console.error('❌ [ChatPage] Failed to watch channel:', watchError.message);
            console.error('❌ [ChatPage] Channel ID used:', channelIdOnly);
            console.error('❌ [ChatPage] Current user ID:', currentStreamUserId);
            
            // If we get a permission error, the backend might not have added the user correctly
            // Or there might be a timing issue - wait a bit longer and retry
            if (watchError.message?.includes('ReadChannel is denied') || 
                watchError.message?.includes('not allowed') ||
                watchError.message?.includes('not a member') ||
                watchError.message?.includes('error code 17')) {
              console.warn('⚠️ [ChatPage] Permission error, waiting longer and retrying...');
              
              // Wait longer for backend to sync
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Call backend again to ensure user is added
              try {
                await getConversationById(newConversationId);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Retry watch
                await channelInstance.watch();
                console.log('✅ [ChatPage] Channel watched after retry');
                setChannel(channelInstance);
              } catch (retryError: any) {
                console.error('❌ [ChatPage] Retry failed:', retryError.message);
                throw new Error('Channel not available. Please try again in a moment. If the issue persists, the backend may need to fix the channel members.');
              }
            } else {
              // Other errors - throw as-is
              throw watchError;
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

        // CRITICAL: Call backend API first to ensure user is added as member
        // This will trigger checkConversationAccess which automatically adds user if missing
        console.log('🔄 [ChatPage] Ensuring backend access to conversation...');
        const conversationResponse = await getConversationById(conversationId!);
        
        if (!conversationResponse.success) {
          throw new Error('Failed to access conversation. Please try again.');
        }
        
        console.log('✅ [ChatPage] Backend confirmed access, user is now a member');
        
        // Wait a moment for StreamChat to sync the member addition
        await new Promise(resolve => setTimeout(resolve, 1000));

        const channelType = 'messaging';
        
        // Get conversation data from backend response
        const conversation = conversationResponse.data;
        
        // CRITICAL: Use the conversation ID from backend response directly
        // The backend returns the actual StreamChat channel ID format
        // For existing conversations, the conversationId prop might be in a different format
        // So we use the ID from the backend response which is guaranteed to be correct
        const actualConversationId = conversation?.id || conversationId!;
        console.log('💬 [ChatPage] Using conversation ID from backend:', actualConversationId);
        
        // Use the actual conversation ID directly (backend already returns correct format)
        const channelIdOnly = actualConversationId;
        
        // Get current user's StreamChat ID
        const currentStreamUserId = client.userID;
        if (!currentStreamUserId) {
          throw new Error('StreamChat user not connected');
        }
        
        // Get channel name from conversation
        const channelName = conversation?.name || undefined;
        
        // Create channel instance using the conversation ID from backend
        // The backend should have already created the channel with proper members
        console.log('💬 [ChatPage] Creating channel instance with ID:', channelIdOnly);
        let channelInstance = client.channel(channelType, channelIdOnly);

        // Try to watch the channel (backend should have already created it with members)
        try {
          console.log('🔄 [ChatPage] Attempting to watch channel...');
          await channelInstance.watch();
          console.log('✅ [ChatPage] Channel watched successfully');
          setChannel(channelInstance);
        } catch (watchError: any) {
          console.error('❌ [ChatPage] Failed to watch channel:', watchError.message);
          console.error('❌ [ChatPage] Channel ID used:', channelIdOnly);
          console.error('❌ [ChatPage] Current user ID:', currentStreamUserId);
          
          // If we get a permission error, the backend might not have added the user correctly
          // Or there might be a timing issue - wait a bit longer and retry
          if (watchError.message?.includes('ReadChannel is denied') || 
              watchError.message?.includes('not allowed') ||
              watchError.message?.includes('not a member') ||
              watchError.message?.includes('error code 17')) {
            console.warn('⚠️ [ChatPage] Permission error, waiting longer and retrying...');
            
            // Wait longer for backend to sync
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Call backend again to ensure user is added
            try {
              await getConversationById(conversationId!);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Retry watch
              await channelInstance.watch();
              console.log('✅ [ChatPage] Channel watched after retry');
              setChannel(channelInstance);
            } catch (retryError: any) {
              console.error('❌ [ChatPage] Retry failed:', retryError.message);
              throw new Error('Channel not available. Please try again in a moment. If the issue persists, the backend may need to fix the channel members.');
            }
          } else {
            // Other errors - throw as-is
            throw watchError;
          }
        }
      } catch (err: any) {
        console.error('❌ [ChatPage] Failed to initialize channel:', err);
        setError(err.message || 'Failed to load chat. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeChannel();
  }, [client, streamChannelId, conversationId, participant, getConversationById, createConversation, currentProfileType, api]);

  // Show loading state if client is not available yet (must be after all hooks)
  if (!client) {
    return (
      <View style={styles.container}>
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

  // All hooks must be called before any conditional returns
  // Early returns are below this point

  if (loading) {
    return (
      <View style={styles.container}>
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
        <Thread thread={thread} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        {channel ? (
          <View style={styles.channelContainer}>
            <Channel
              channel={channel}
              onThreadSelect={handleThreadSelect}
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
              <MessageInput 
                additionalTextInputProps={{
                  placeholder: 'Type a message...',
                  placeholderTextColor: '#9ca3af',
                }}
                giphyEnabled={false}
                imageUploadEnabled={false}
                fileUploadEnabled={false}
                audioRecordingEnabled={false}
              />
            </Channel>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Channel not available</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setError(null);
                // Retry initialization will happen via useEffect
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  channelContainer: {
    flex: 1,
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
