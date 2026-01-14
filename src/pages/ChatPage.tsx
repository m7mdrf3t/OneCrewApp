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
    getAccessToken,
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
  // CRITICAL: Backend returns channel IDs directly (e.g., "user_user-{hash}")
  // Do NOT add "onecrew_" prefix - use conversation ID directly
  const streamChannelId = useMemo(() => {
    if (!conversationId) return null;
    // Backend already returns the correct StreamChat channel ID format
    // No need to transform with getStreamChannelId() which adds "onecrew_" prefix
    return conversationId;
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
        channel.watch({
          watchers: { limit: 10 },
          messages: { limit: 50 }, // Reduced - pagination will load more
          presence: true,
        }).then(async () => {
          console.log('✅ [ChatPage] Channel watched successfully - MessageInput should be available');
          // Load more messages in background (non-blocking)
          channel.query({
            messages: { limit: 200 },
          }).catch((queryError: any) => {
            console.warn('⚠️ [ChatPage] Background message query failed (non-critical):', queryError.message);
          });
        }).catch((err) => {
          console.error('❌ [ChatPage] Failed to watch channel:', err);
        });
      } else {
        console.log('✅ [ChatPage] Channel is watched - MessageInput should be visible');
        // Even if watched, verify messages are loaded
        const messageCount = channel.state?.messages?.length || 0;
        if (messageCount === 0) {
          console.warn('⚠️ [ChatPage] Channel watched but no messages. Querying...');
          channel.query({
            messages: { limit: 500 }, // Increased limit
          }).then(async () => {
            // StreamChat's MessageList will handle pagination automatically
          }).then(() => {
            console.log('✅ [ChatPage] Messages loaded. Count:', channel.state?.messages?.length || 0);
          }).catch((err) => {
            console.error('❌ [ChatPage] Failed to query messages:', err);
          });
        }
      }
    } else {
      console.log('⏳ [ChatPage] No channel yet, waiting for initialization...');
    }
  }, [channel]);

  // Real-time message event listeners
  useEffect(() => {
    if (!channel || !client) return;

    console.log('💬 [ChatPage] Setting up real-time event listeners');

    // Listen for new messages
    const handleNewMessage = (event: any) => {
      console.log('💬 [ChatPage] New message received:', {
        messageId: event.message?.id,
        text: event.message?.text,
        userId: event.message?.user?.id,
        timestamp: event.message?.created_at,
      });
    };

    // Listen for message updates
    const handleMessageUpdated = (event: any) => {
      console.log('💬 [ChatPage] Message updated:', event.message);
    };

    // Listen for message deletions
    const handleMessageDeleted = (event: any) => {
      console.log('💬 [ChatPage] Message deleted:', event.message);
    };

    // Listen for typing start
    const handleTypingStart = (event: any) => {
      console.log('💬 [ChatPage] User typing:', event.user);
      console.log('💬 [ChatPage] Typing state:', channel.state?.typing);
    };

    // Listen for typing stop
    const handleTypingStop = (event: any) => {
      console.log('💬 [ChatPage] User stopped typing:', event.user);
      console.log('💬 [ChatPage] Typing state:', channel.state?.typing);
    };

    // Subscribe to events
    channel.on('message.new', handleNewMessage);
    channel.on('message.updated', handleMessageUpdated);
    channel.on('message.deleted', handleMessageDeleted);
    channel.on('typing.start', handleTypingStart);
    channel.on('typing.stop', handleTypingStop);

    // Verify channel state for real-time events
    console.log('💬 [ChatPage] Channel state for real-time:', {
      watched: channel.state?.watched,
      presence: channel.state?.presence,
      typing: channel.state?.typing,
      watchers: channel.state?.watchers,
      messagesCount: channel.state?.messages?.length || 0,
      channelId: channel.id,
      channelCid: channel.cid,
      connected: client.connected,
    });
    
    // Verify event listeners are registered
    console.log('💬 [ChatPage] Event listeners registered for:', [
      'message.new',
      'message.updated', 
      'message.deleted',
      'typing.start',
      'typing.stop',
    ]);

    // Cleanup function
    return () => {
      console.log('💬 [ChatPage] Cleaning up event listeners');
      channel.off('message.new', handleNewMessage);
      channel.off('message.updated', handleMessageUpdated);
      channel.off('message.deleted', handleMessageDeleted);
      channel.off('typing.start', handleTypingStart);
      channel.off('typing.stop', handleTypingStop);
    };
  }, [channel, client]);

  // Verify messages are loaded after channel is set
  useEffect(() => {
    if (channel && channel.state?.watched) {
      const messageCount = channel.state?.messages?.length || 0;
      console.log('💬 [ChatPage] Message verification:', {
        messageCount,
        hasMessages: messageCount > 0,
        latestMessage: channel.state?.messages?.[messageCount - 1]?.text,
        oldestMessage: channel.state?.messages?.[0]?.text,
        channelId: channel.id,
        currentUserId: client?.userID,
      });
      
      // If no messages but channel is watched, try querying again
      if (messageCount === 0) {
        console.warn('⚠️ [ChatPage] Channel watched but no messages found. Querying...');
        channel.query({
          messages: { limit: 50 }, // Reduced - pagination will load more
        }).then(async () => {
          const newCount = channel.state?.messages?.length || 0;
          console.log('✅ [ChatPage] Messages loaded after query. Count:', newCount);
          
          // Load more in background if needed
          if (newCount > 0 && newCount < 50) {
            channel.query({
              messages: { limit: 200 },
            }).catch(() => {});
          }
        }).catch((err) => {
          console.error('❌ [ChatPage] Failed to query messages:', err);
        });
      }
    }
  }, [channel, client]);

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
          
          const channelType = 'messaging';
          // CRITICAL: Use the conversation ID directly from backend
          // The backend already returns the correct StreamChat channel ID format
          // No need to transform it with getStreamChannelId()
          const channelIdOnly = newConversationId;
          
          // Get current user's StreamChat ID
          const currentStreamUserId = client.userID;
          if (!currentStreamUserId) {
            throw new Error('StreamChat user not connected');
          }
          
          // Create channel instance using the conversation ID from backend
          // The backend should have already created the channel with proper members
          console.log('💬 [ChatPage] Creating channel instance with ID:', channelIdOnly);
          let channelInstance = client.channel(channelType, channelIdOnly);

          // PERFORMANCE OPTIMIZATION: Set channel early and run operations in parallel
          setChannel(channelInstance);
          setLoading(false); // Stop loading spinner early - UI renders immediately
          
          // Parallel operations for faster loading
          const [prepareResult, watchResult] = await Promise.allSettled([
            // Prepare endpoint (non-blocking)
            (async () => {
              try {
                const token = getAccessToken();
                const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
                const prepareUrl = `${baseUrl}/api/chat/conversations/${newConversationId}/prepare`;
                
                const response = await fetch(prepareUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });
                
                if (response.ok) {
                  await response.json();
                  console.log('✅ [ChatPage] Conversation prepared successfully');
                }
              } catch (error: any) {
                console.warn('⚠️ [ChatPage] Prepare endpoint error (non-critical):', error.message);
              }
            })(),
            
            // Watch channel (critical)
            (async () => {
              console.log('🔄 [ChatPage] Watching channel...');
              await channelInstance.watch({
                watchers: { limit: 10 },
                messages: { limit: 50 }, // Reduced from 500 - load more via pagination
                presence: true,
              });
              console.log('✅ [ChatPage] Channel watched successfully');
              return channelInstance;
            })(),
          ]);
          
          // Handle watch result
          if (watchResult.status === 'rejected') {
            const watchError = watchResult.reason;
            console.error('❌ [ChatPage] Failed to watch channel:', watchError.message);
            setError(watchError.message || 'Failed to load chat');
            return;
          }
          
          // Load more messages in background (non-blocking)
          channelInstance.query({
            messages: { limit: 200 }, // Load more in background
          }).then(() => {
            const loadedMessages = channelInstance.state?.messages || [];
            console.log('✅ [ChatPage] Background message load complete. Count:', loadedMessages.length);
          }).catch((queryError: any) => {
            console.warn('⚠️ [ChatPage] Background message query failed (non-critical):', queryError.message);
          });
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
        // Don't set loading to true if channel already exists (optimization)
        if (!channel) {
          setLoading(true);
        }
        setError(null);

        const channelType = 'messaging';
        
        // Get current user's StreamChat ID
        const currentStreamUserId = client.userID;
        if (!currentStreamUserId) {
          throw new Error('StreamChat user not connected');
        }
        
        // Use the conversation ID directly (backend returns correct format: "user_user-{hash}")
        // Backend already returns the correct StreamChat channel ID, no transformation needed
        const channelIdOnly = conversationId!;
        console.log('💬 [ChatPage] Using channel ID:', channelIdOnly);
        console.log('💬 [ChatPage] Channel ID details:', {
          originalConversationId: conversationId,
          streamChannelId: streamChannelId,
          extractedChannelId: channelIdOnly,
          currentUserId: currentStreamUserId,
          channelType: channelType,
        });
        
        // Create channel instance and try to watch immediately
        // Only call backend if watch fails with permission error
        console.log('💬 [ChatPage] Creating channel instance with ID:', channelIdOnly);
        let channelInstance = client.channel(channelType, channelIdOnly);
        
        // Log channel instance details for debugging
        console.log('💬 [ChatPage] Channel instance created:', {
          channelId: channelInstance.id,
          channelCid: channelInstance.cid,
          currentUserId: currentStreamUserId,
          conversationId: conversationId,
        });

        // PERFORMANCE OPTIMIZATION: Start watching immediately, prepare in parallel
        // Set channel early to start rendering UI while data loads
        setChannel(channelInstance);
        setLoading(false); // Stop loading spinner early
        
        // Parallel operations for faster loading
        const [prepareResult, watchResult] = await Promise.allSettled([
          // Prepare endpoint (non-blocking - real-time will work even if this fails)
          (async () => {
            try {
              const token = getAccessToken();
              const baseUrl = (api as any).baseUrl || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
              const prepareUrl = `${baseUrl}/api/chat/conversations/${conversationId}/prepare`;
              
              const response = await fetch(prepareUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const prepareData = await response.json();
                console.log('✅ [ChatPage] Conversation prepared successfully');
                return prepareData;
              }
            } catch (error: any) {
              // Non-critical - continue without prepare
              console.warn('⚠️ [ChatPage] Prepare endpoint error (non-critical):', error.message);
            }
          })(),
          
          // Watch channel (critical - must succeed)
          (async () => {
            console.log('🔄 [ChatPage] Watching channel...');
            // Optimize: Load fewer messages initially, pagination will load more
            await channelInstance.watch({
              watchers: { limit: 10 },
              messages: { limit: 50 }, // Reduced from 500 - load more via pagination
              presence: true,
            });
            console.log('✅ [ChatPage] Channel watched successfully');
            return channelInstance;
          })(),
        ]);
        
        // Handle watch result (critical)
        if (watchResult.status === 'rejected') {
          const watchError = watchResult.reason;
          console.error('❌ [ChatPage] Failed to watch channel:', watchError.message);
          
          // If permission error, try backend fix
          if (watchError.message?.includes('ReadChannel is denied') || 
              watchError.message?.includes('not allowed') ||
              watchError.message?.includes('not a member') ||
              watchError.message?.includes('error code 17')) {
            console.warn('⚠️ [ChatPage] Permission error, ensuring backend access...');
            
            try {
              await getConversationById(conversationId!);
              console.log('✅ [ChatPage] Backend confirmed access, retrying watch...');
              
              await channelInstance.watch({
                watchers: { limit: 10 },
                messages: { limit: 50 },
                presence: true,
              });
              console.log('✅ [ChatPage] Channel watched after ensuring access');
            } catch (retryError: any) {
              console.error('❌ [ChatPage] Retry failed:', retryError.message);
              setError('Channel not available. Please try again.');
              return;
            }
          } else {
            setError(watchError.message || 'Failed to load chat');
            return;
          }
        }
        
        // Load more messages in background (non-blocking)
        // This allows UI to render immediately with initial 50 messages
        channelInstance.query({
          messages: { limit: 200 }, // Load more in background
        }).then(() => {
          const loadedMessages = channelInstance.state?.messages || [];
          console.log('✅ [ChatPage] Background message load complete. Count:', loadedMessages.length);
        }).catch((queryError: any) => {
          console.warn('⚠️ [ChatPage] Background message query failed (non-critical):', queryError.message);
        });
      } catch (err: any) {
        console.error('❌ [ChatPage] Failed to initialize channel:', err);
        setError(err.message || 'Failed to load chat. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeChannel();
  }, [client, streamChannelId, conversationId, participant, getConversationById, createConversation, currentProfileType, api, getAccessToken]);

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
                // Enable pagination to load more messages when scrolling up
                loadMore={true}
                loadMoreThreshold={10} // Load more when 10 messages from top
                // Ensure all messages are displayed
                noGroupByUser={false}
                // Additional props to ensure messages render
                additionalFlatListProps={{
                  removeClippedSubviews: false, // Disable to ensure all messages render
                  maintainVisibleContentPosition: {
                    minIndexForVisible: 0,
                  },
                  // Ensure all messages are rendered
                  initialNumToRender: 50, // Render more messages initially
                  maxToRenderPerBatch: 20, // Render more per batch
                  windowSize: 10, // Larger window size
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
