import { useCallback } from 'react';
import { User } from 'onecrew-api-client';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import streamChatService from '../services/StreamChatService';

interface UseChatMethodsParams {
  api: any;
  user: User | null;
  activeCompany: any;
  currentProfileType: string;
  getAccessToken: () => string;
  setUnreadConversationCount: (count: number) => void;
  handle401Error: (error: any) => Promise<void>;
}

export function useChatMethods({
  api,
  user,
  activeCompany,
  currentProfileType,
  getAccessToken,
  setUnreadConversationCount,
  handle401Error,
}: UseChatMethodsParams) {
  const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
  const getUnreadConversationCount = async (): Promise<number> => {
    try {
      const extractUnreadCount = (payload: any): number => {
        if (!payload || typeof payload !== 'object') return 0;

        const directCandidates = [
          payload.unread_count,
          payload.unreadConversationCount,
          payload.unread_conversation_count,
          payload.conversation_unread_count,
          payload.total_unread_count,
          payload.count,
        ];

        for (const candidate of directCandidates) {
          const parsed = typeof candidate === 'string' ? parseInt(candidate, 10) : candidate;
          if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
          }
        }

        // Handle nested wrappers like { data: { unread_count: n } }
        if (payload.data && payload.data !== payload) {
          return extractUnreadCount(payload.data);
        }

        return 0;
      };

      // First try API client method if available
      const chatService = api.chat as any;
      if (chatService?.getUnreadConversationCount) {
        const params: any = {
          profile_type: currentProfileType === 'company' ? 'company' : 'user',
        };
        
        if (currentProfileType === 'company' && activeCompany?.id) {
          params.company_id = activeCompany.id;
        }
        
        const response = await chatService.getUnreadConversationCount(params);
        
        if (response.success && response.data) {
          const count = extractUnreadCount(response.data);
          setUnreadConversationCount(count);
          
          if (__DEV__) {
            console.log('    [UnreadCount]     Updated from API client:', {
              count,
              profile_type: params.profile_type,
              cached: response.data.cached || false,
            });
          }
          
          return count;
        }
      }
      
      // Fallback: Call backend endpoint directly via fetch
      // This works even if API client doesn't have the method yet
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      
      const params: any = {
        profile_type: currentProfileType === 'company' ? 'company' : 'user',
      };
      
      if (currentProfileType === 'company' && activeCompany?.id) {
        params.company_id = activeCompany.id;
      }
      
      const queryString = new URLSearchParams(params).toString();
      const url = `${baseUrl}/api/chat/conversations/unread-count?${queryString}`;
      
      if (__DEV__) {
        console.log('    [UnreadCount] Calling backend directly:', url);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const count = extractUnreadCount(data.data);
        setUnreadConversationCount(count);
        
        if (__DEV__) {
          console.log('    [UnreadCount]     Updated from direct backend call:', {
            count,
            profile_type: params.profile_type,
            profile_id: params.company_id || user?.id,
            cached: data.data.cached || false,
          });
        }
        
        return count;
      }
      
      throw new Error(data.error || 'Failed to get unread count');
    } catch (error: any) {
      // Network errors are expected in mobile apps - log as warning
      const errorMessage = error?.message || error?.toString() || '';
      const isNetworkError = errorMessage.includes('Network error') ||
                            errorMessage.includes('Network request failed') ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('fetch failed') ||
                            error?.name === 'TypeError' && errorMessage.includes('Network');
      
      if (isNetworkError) {
        if (__DEV__) {
          console.warn('   Failed to get unread conversation count (network issue):', errorMessage);
        }
        // Don't throw - let fallback handle it
        throw error;
      }
      
      if (__DEV__) {
        console.warn('   Failed to get unread conversation count:', errorMessage);
      }
      // Don't call handle401Error here - let updateUnreadCount handle fallback
      throw error;
    }
  };

  // Chat/Messaging methods (v2.5.0)
  // Real-time data - caching disabled for immediate updates
  const getConversations = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    /**
     * onecrew-api-client v2.24.4+: server-side profile scoping for conversation lists
     */
    profile_type?: 'user' | 'company';
    company_id?: string;
  }) => {
    // Include profile context in cache key to separate conversations by profile
    const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
    const cacheKey = `conversations-${currentUserType}-${currentUserId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        // Prefer server-side scoping to avoid mixing personal + company conversations.
        const scopedParams = {
          ...params,
          profile_type: params?.profile_type ?? (currentProfileType === 'company' ? 'company' : 'user'),
          ...(currentProfileType === 'company' && activeCompany?.id
            ? { company_id: params?.company_id ?? activeCompany.id }
            : {}),
        };
        console.log('    Fetching conversations...', scopedParams);
        const response = await api.chat.getConversations(scopedParams);
        if (response.success && response.data) {
          // Calculate unread count
          const rawConversations = response.data.data || response.data;
          if (Array.isArray(rawConversations)) {
            const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
            const currentUserType = currentProfileType === 'company' ? 'company' : 'user';

            let unreadCount = 0;
            let skippedNotParticipant = 0;
            rawConversations.forEach((conv: any) => {
              if (conv.participants && Array.isArray(conv.participants)) {
                const participant = conv.participants.find((p: any) => 
                  p.participant_id === currentUserId && p.participant_type === currentUserType
                );
                
                if (participant && conv.last_message_at) {
                  const lastReadAt = participant.last_read_at ? new Date(participant.last_read_at).getTime() : 0;
                  const lastMessageAt = new Date(conv.last_message_at).getTime();
                  
                  // If last message is after last read, there are unread messages
                  if (lastMessageAt > lastReadAt) {
                    unreadCount++;
                  }
                } else if (conv.last_message_at && participant && !participant.last_read_at) {
                  // If there's a last message but no read timestamp, consider it unread
                  // Only if participant exists (current profile is a participant)
                  unreadCount++;
                } else if (conv.last_message_at && !participant) {
                  // If there's a last message but current profile is not a participant, skip it
                  // This ensures we only count unread for conversations belonging to current profile
                  skippedNotParticipant++;
                }
              }
            });
            
            // FIXED: Only update unread count if we fetched ALL conversations (no limit or very high limit)
            // If limit is small, don't update count here - let updateUnreadCount handle it
            // This prevents partial counts from overriding the full count
            const hasLimit = params?.limit !== undefined;
            const limitValue = params?.limit || 0;
            // Only update if no limit specified OR limit is very high (>= 1000)
            // This ensures we don't overwrite the full count with partial counts
            const shouldUpdateCount = !hasLimit || limitValue >= 1000;
            
            if (shouldUpdateCount) {
              setUnreadConversationCount(unreadCount);
              if (__DEV__) {
                console.log('    Unread conversations count (from backend, full fetch):', unreadCount, {
                  streamChatConnected: streamChatService.isConnected(),
                  totalConversations: rawConversations.length,
                  limit: limitValue,
                });
              }
            } else {
              if (__DEV__) {
                console.log('    Skipped unread count update (partial fetch, limit:', limitValue, 'conversations:', rawConversations.length, ')');
              }
            }
            
            if (__DEV__ && skippedNotParticipant > 0) {
              console.log('   Skipped unread-count for conversations not belonging to current profile:', {
                skipped: skippedNotParticipant,
                currentProfileType: currentUserType,
                currentProfileId: currentUserId,
              });
            }
          }
        }
        console.log('    Conversations fetched successfully');
        return response;
      } catch (error: any) {
        // Network errors are expected in mobile apps - log as warning
        const errorMessage = error?.message || error?.toString() || '';
        const isNetworkError = errorMessage.includes('Network error') ||
                              errorMessage.includes('Network request failed') ||
                              errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('fetch failed') ||
                              error?.name === 'TypeError' && errorMessage.includes('Network');
        
        if (isNetworkError) {
          console.warn('   Failed to fetch conversations (network issue):', errorMessage);
          // Return empty result for network errors instead of throwing
          return { success: true, data: [] };
        }
        
        console.error('  Failed to fetch conversations:', error);
        // Handle 401 errors
        await handle401Error(error);
        throw error;
      }
    }, { useCache: false }); // Disabled caching for real-time data
  };

  const getConversationById = async (conversationId: string) => {
    const cacheKey = `conversation-${conversationId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        console.log('    Fetching conversation:', conversationId);
        const response = await api.chat.getConversationById(conversationId);
        console.log('    Conversation fetched successfully');
        return response;
      } catch (error: any) {
        console.error('  Failed to fetch conversation:', error);
        throw error;
      }
    }, { useCache: false }); // Disabled caching for real-time data
  };

  const createConversation = async (request: { conversation_type: 'user_user' | 'user_company' | 'company_company'; participant_ids: string[]; name?: string }) => {
    try {
      // Log profile context for verification
      const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
      console.log('    Creating conversation...', {
        ...request,
        currentProfileType: currentUserType,
        currentProfileId: currentUserId,
      });
      console.log('    API object:', api);
      console.log('    API.chat:', api.chat);
      console.log('    API keys:', Object.keys(api));
      
      // Check if chat service is available
      if (!api.chat) {
        console.error('  Chat service is undefined!');
        console.error('  API object:', api);
        console.error('  Available properties:', Object.keys(api));
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      
      // Ensure participant_ids is an array
      // CRITICAL: Pass company_id if on company profile so backend uses correct initiator
      const requestData = {
        conversation_type: request.conversation_type,
        participant_ids: Array.isArray(request.participant_ids) ? request.participant_ids : [request.participant_ids],
        ...(request.name && { name: request.name }),
        // Pass company_id explicitly when on company profile
        // This ensures backend uses company ID (not user ID) as initiator
        ...(currentProfileType === 'company' && activeCompany?.id && {
          company_id: activeCompany.id
        }),
      };
      console.log('    Request data:', requestData);
      console.log('    Profile context:', {
        currentProfileType,
        activeCompanyId: activeCompany?.id,
        passingCompanyId: currentProfileType === 'company' && activeCompany?.id,
      });
      
      // CRITICAL: Use direct fetch with longer timeout for createConversation
      // Backend needs time to sync users to StreamChat (can take 2-4 seconds)
      const token = getAccessToken();
      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const url = `${baseUrl}/api/chat/conversations`;
      
      console.log('    Making direct fetch call with extended timeout...');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log('    Conversation created successfully');
          return data;
        }
        
        throw new Error(data.error || 'Failed to create conversation');
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          throw new Error('Request timeout - The server is taking longer than expected. Please try again.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('  Failed to create conversation:', error);
      throw error;
    }
  };

  // Cached wrapper for getUserByIdDirect with request deduplication and rate limit handling
  // CRITICAL: Prevents 429 errors when fetching multiple users from same company
  const getUserByIdDirectInFlight = new Map<string, Promise<any>>();
  const getUserByIdDirect = async (userId: string): Promise<any> => {
    // Check if there's already an in-flight request for this user
    if (getUserByIdDirectInFlight.has(userId)) {
      console.log(`⏳ [getUserByIdDirect] Request already in flight for user ${userId}, waiting...`);
      return getUserByIdDirectInFlight.get(userId)!;
    }

    const cacheKey = `user-by-id-${userId}`;
    const requestPromise = (async () => {
      try {
        return await rateLimiter.execute(cacheKey, async () => {
          try {
            console.log(`    [getUserByIdDirect] Fetching user: ${userId}`);
            
            // Use the API client's method
            const response = await api.getUserByIdDirect(userId);
            
            if (response.success && response.data) {
              console.log(`    [getUserByIdDirect] User fetched successfully: ${userId}`);
              return response;
            }
            
            throw new Error(response.error || 'Failed to fetch user');
          } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || '';
            
            // Handle 429 rate limit errors with exponential backoff retry
            if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
              console.warn(`   [getUserByIdDirect] Rate limited for user ${userId}, retrying with backoff...`);
              
              // Exponential backoff: wait 1s, 2s, 4s
              for (let attempt = 1; attempt <= 3; attempt++) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                try {
                  const retryResponse = await api.getUserByIdDirect(userId);
                  if (retryResponse.success && retryResponse.data) {
                    console.log(`    [getUserByIdDirect] User fetched after retry: ${userId}`);
                    return retryResponse;
                  }
                } catch (retryError) {
                  if (attempt === 3) {
                    console.error(`  [getUserByIdDirect] Failed after ${attempt} retries for user ${userId}`);
                    throw retryError;
                  }
                }
              }
            }
            
            throw error;
          }
        }, { 
          ttl: CacheTTL.MEDIUM, // Cache for 5 minutes
          persistent: true 
        });
      } finally {
        // Remove from in-flight map after completion
        getUserByIdDirectInFlight.delete(userId);
      }
    })();

    // Store the promise in the in-flight map
    getUserByIdDirectInFlight.set(userId, requestPromise);
    
    return requestPromise;
  };

  // Real-time data - caching disabled for immediate updates
  const getMessages = async (
    conversationId: string,
    params?: {
      page?: number;
      limit?: number;
      before?: string;
      include?: 'none' | Array<'sender_user' | 'sender_company' | 'sent_by_user' | 'reads'>;
      sender_type?: 'user' | 'company' | Array<'user' | 'company'>;
      sender_user_fields?: string[];
      sender_company_fields?: string[];
    }
  ) => {
    // Include profile context in cache key to separate messages by profile
    const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
    const cacheKey = `messages-${conversationId}-${currentUserType}-${currentUserId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        console.log('    Fetching messages for conversation:', conversationId);
        const response = await api.chat.getMessages(conversationId, params);
        console.log('    Messages fetched successfully');
        return response;
      } catch (error: any) {
        console.error('  Failed to fetch messages:', error);
        throw error;
      }
    }, { useCache: false }); // Disabled caching for real-time data
  };

  const sendMessage = async (conversationId: string, messageData: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number; reply_to_message_id?: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Sending message to conversation:', conversationId);
      const response = await api.chat.sendMessage(conversationId, messageData);
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for real-time data
        console.log('    Message sent successfully');
        // FIXED: Backend automatically invalidates cache when message is sent
        // The unread count will be updated by event handlers, but we can trigger immediate update
        // Note: The recipient's count will update, not the sender's
        return response;
      }
      throw new Error(response.error || 'Failed to send message');
    } catch (error: any) {
      console.error('  Failed to send message:', error);
      throw error;
    }
  };

  const editMessage = async (messageId: string, data: { content: string; conversation_id?: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Editing message:', messageId);
      const response = await api.chat.editMessage(messageId, data);
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for real-time data
        console.log('    Message edited successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to edit message');
    } catch (error: any) {
      console.error('  Failed to edit message:', error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Deleting message:', messageId, 'from conversation:', conversationId);
      const response = await api.chat.deleteMessage(messageId, conversationId);
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for real-time data
        console.log('    Message deleted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to delete message');
    } catch (error: any) {
      console.error('  Failed to delete message:', error);
      throw error;
    }
  };

  const readMessage = async (conversationId: string, messageId?: string, messageIds?: string[]) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      // Log profile context for verification
      const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
      console.log('    Marking message as read:', { 
        conversationId, 
        messageId, 
        messageIds,
        profileType: currentUserType,
        profileId: currentUserId,
      });
      
      let response;
      
      if (messageId) {
        // Mark a single message as read using library method
        // markMessageAsRead(messageId: string, conversationId: string)
        response = await api.chat.markMessageAsRead(messageId, conversationId);
      } else {
        // Mark all messages in a conversation as read using library method
      // After marking as read, update unread count
        // markAllAsRead(conversationId: string, messageIds?: string[])
        response = await api.chat.markAllAsRead(conversationId, messageIds);
      }
      
      if (response.success) {
        console.log('    Message(s) marked as read successfully');
        // FIXED: Update unread count using lightweight endpoint (instant update)
        // Backend cache is invalidated automatically, so we get fresh count
        try {
          await getUnreadConversationCount();
        } catch (countError) {
          console.warn('   Failed to update unread count after readMessage:', countError);
        }
        return response;
      }
      
      throw new Error(response.error || 'Failed to mark message as read');
    } catch (error: any) {
      console.error('  Failed to mark message as read:', error);
      throw error;
    }
  };

  const markMessageAsRead = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Marking message as read:', messageId);
      const response = await api.chat.markMessageAsRead(messageId, conversationId);
      if (response.success) {
        console.log('    Message marked as read successfully');
        // FIXED: Update unread count using lightweight endpoint (instant update)
        // Backend cache is invalidated automatically, so we get fresh count
        try {
          await getUnreadConversationCount();
        } catch (countError) {
          console.warn('   Failed to update unread count after marking as read:', countError);
        }
        return response;
      }
      throw new Error(response.error || 'Failed to mark message as read');
    } catch (error: any) {
      console.error('  Failed to mark message as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async (conversationId: string, messageIds?: string[]) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Marking all messages as read in conversation:', conversationId);
      const response = await api.chat.markAllAsRead(conversationId, messageIds);
      if (response.success) {
        console.log('    All messages marked as read successfully');
        // FIXED: Update unread count using lightweight endpoint (instant update)
        // Backend cache is invalidated automatically, so we get fresh count
        try {
          await getUnreadConversationCount();
        } catch (countError) {
          console.warn('   Failed to update unread count after marking all as read:', countError);
        }
        return response;
      }
      throw new Error(response.error || 'Failed to mark all messages as read');
    } catch (error: any) {
      console.error('  Failed to mark all messages as read:', error);
      throw error;
    }
  };

  const leaveConversation = async (conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Leaving conversation:', conversationId);
      const response = await api.chat.leaveConversation(conversationId);
      if (response.success) {
        console.log('    Left conversation successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to leave conversation');
    } catch (error: any) {
      console.error('  Failed to leave conversation:', error);
      throw error;
    }
  };

  const muteConversation = async (conversationId: string, mutedUntil?: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Muting conversation:', conversationId, mutedUntil ? `until ${mutedUntil}` : 'indefinitely');
      const response = await api.chat.muteConversation(conversationId, mutedUntil);
      if (response.success) {
        console.log('    Conversation muted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to mute conversation');
    } catch (error: any) {
      console.error('  Failed to mute conversation:', error);
      throw error;
    }
  };

  const sendTypingIndicator = async (conversationId: string, isTyping: boolean) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      const response = await api.chat.sendTypingIndicator(conversationId, isTyping);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to send typing indicator');
    } catch (error: any) {
      console.error('  Failed to send typing indicator:', error);
      throw error;
    }
  };

  // StreamChat token
  // CRITICAL: Memoize this function to prevent infinite loops in StreamChatProvider
  // Without useCallback, this function is recreated on every render, causing StreamChatProvider's
  // useEffect to run repeatedly, which can cause flickering, restarts, and server overload
  const getStreamChatToken = useCallback(async (options?: { profile_type?: 'user' | 'company'; company_id?: string }) => {
    try {
      // Build query parameters if profile type is specified
      let queryParams = '';
      if (options?.profile_type === 'company' && options?.company_id) {
        queryParams = `?profile_type=company&company_id=${encodeURIComponent(options.company_id)}`;
      } else if (options?.profile_type === 'user') {
        queryParams = '?profile_type=user';
      }
      
      console.log('    Getting StreamChat token...', { 
        profile_type: options?.profile_type || 'user',
        company_id: options?.company_id,
        queryParams 
      });
      
      // Make direct HTTP call to support query parameters
      // The API client might not support query params, so we'll call the endpoint directly
      // Inline getAccessToken call to avoid dependency on unstable function reference
      let accessToken = '';
      try {
        if ((api as any).auth && typeof (api as any).auth.getAuthToken === 'function') {
          accessToken = (api as any).auth.getAuthToken();
        } else if ((api as any).getAuthToken && typeof (api as any).getAuthToken === 'function') {
          accessToken = (api as any).getAuthToken();
        }
      } catch (tokenError) {
        console.warn('   Failed to get access token:', tokenError);
      }
      
      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const url = `${baseUrl}/api/chat/token${queryParams}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get StreamChat token' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('    StreamChat token retrieved successfully', {
          user_id: data.data?.user_id,
          profile_type: options?.profile_type || 'user',
        });
        return data;
      }
      throw new Error(data.error || 'Failed to get StreamChat token');
    } catch (error: any) {
      // Check error type to determine appropriate logging level
      const errorMessage = error?.message || error?.toString() || '';
      const errorName = error?.name || '';
      
      // Network errors are expected in mobile apps - log as warning
      const isNetworkError = errorMessage.includes('Network request failed') ||
                            errorMessage.includes('Network error') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('fetch failed') ||
                            errorName === 'TypeError' && errorMessage.includes('Network') ||
                            errorName === 'NetworkError';
      
      // Membership errors are expected if user lost access - log as warning
      const isMembershipError = errorMessage.includes('must be a member') || 
                               errorMessage.includes('member of this company') ||
                               errorMessage.includes('not a member');
      
      // Token expiration errors are expected (token refresh will handle it) - log as warning
      const isTokenError = errorMessage.includes('Invalid or expired token') ||
                          errorMessage.includes('expired token') ||
                          errorMessage.includes('token expired') ||
                          errorMessage.includes('invalid token');
      
      if (isNetworkError) {
        // Network issues are expected in mobile apps - log as warning (not error)
        console.warn('   Failed to get StreamChat token (network issue):', errorMessage);
      } else if (isTokenError) {
        // Token expiration is expected - token refresh will handle it
        console.warn('   Failed to get StreamChat token (token expired, will retry):', errorMessage);
      } else if (isMembershipError) {
        // User lost access - this is expected, log as warning
        console.warn('   Failed to get StreamChat token (membership issue):', errorMessage);
      } else {
        // Other errors (auth, server errors) - log as error
        console.error('  Failed to get StreamChat token:', error);
      }
      throw error;
    }
  }, [api]); // Only depend on api, which is a stable reference (OneCrewApi instance)

  // Message reactions
  const addReaction = async (messageId: string, data: { reaction_type: string; conversation_id: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Adding reaction to message:', messageId);
      const response = await api.chat.addReaction(messageId, data);
      if (response.success) {
        console.log('    Reaction added successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to add reaction');
    } catch (error: any) {
      console.error('  Failed to add reaction:', error);
      throw error;
    }
  };

  const removeReaction = async (messageId: string, reactionType: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Removing reaction from message:', messageId);
      const response = await api.chat.removeReaction(messageId, reactionType, conversationId);
      if (response.success) {
        console.log('    Reaction removed successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to remove reaction');
    } catch (error: any) {
      console.error('  Failed to remove reaction:', error);
      throw error;
    }
  };

  const getReactions = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Getting reactions for message:', messageId);
      const response = await api.chat.getReactions(messageId, conversationId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get reactions');
    } catch (error: any) {
      console.error('  Failed to get reactions:', error);
      throw error;
    }
  };

  // Message threading
  const createThreadReply = async (parentMessageId: string, conversationId: string, data: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Creating thread reply to message:', parentMessageId);
      const response = await api.chat.createThreadReply(parentMessageId, conversationId, data);
      if (response.success) {
        console.log('    Thread reply created successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to create thread reply');
    } catch (error: any) {
      console.error('  Failed to create thread reply:', error);
      throw error;
    }
  };

  const getThreadReplies = async (parentMessageId: string, conversationId: string, params?: { limit?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Getting thread replies for message:', parentMessageId);
      const response = await api.chat.getThreadReplies(parentMessageId, conversationId, params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get thread replies');
    } catch (error: any) {
      console.error('  Failed to get thread replies:', error);
      throw error;
    }
  };

  // Message pinning
  const pinMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Pinning message:', messageId);
      const response = await api.chat.pinMessage(messageId, conversationId);
      if (response.success) {
        console.log('    Message pinned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to pin message');
    } catch (error: any) {
      console.error('  Failed to pin message:', error);
      throw error;
    }
  };

  const unpinMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Unpinning message:', messageId);
      const response = await api.chat.unpinMessage(messageId, conversationId);
      if (response.success) {
        console.log('    Message unpinned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unpin message');
    } catch (error: any) {
      console.error('  Failed to unpin message:', error);
      throw error;
    }
  };

  const getPinnedMessages = async (conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Getting pinned messages for conversation:', conversationId);
      const response = await api.chat.getPinnedMessages(conversationId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get pinned messages');
    } catch (error: any) {
      console.error('  Failed to get pinned messages:', error);
      throw error;
    }
  };

  // Message search
  const searchMessages = async (params: { query: string; conversation_id?: string; sender_id?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Searching messages:', params);
      const response = await api.chat.searchMessages(params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to search messages');
    } catch (error: any) {
      console.error('  Failed to search messages:', error);
      throw error;
    }
  };

  const searchInConversation = async (conversationId: string, params: { query: string; sender_id?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Searching messages in conversation:', conversationId);
      const response = await api.chat.searchInConversation(conversationId, params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to search in conversation');
    } catch (error: any) {
      console.error('  Failed to search in conversation:', error);
      throw error;
    }
  };

  // Channel management
  const updateChannel = async (conversationId: string, data: { name?: string; image?: string; description?: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Updating channel:', conversationId);
      const response = await api.chat.updateChannel(conversationId, data);
      if (response.success) {
        console.log('    Channel updated successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to update channel');
    } catch (error: any) {
      console.error('  Failed to update channel:', error);
      throw error;
    }
  };

  const addMember = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Adding member to channel:', conversationId);
      const response = await api.chat.addMember(conversationId, userId);
      if (response.success) {
        console.log('    Member added successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to add member');
    } catch (error: any) {
      console.error('  Failed to add member:', error);
      throw error;
    }
  };

  const removeMember = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Removing member from channel:', conversationId);
      const response = await api.chat.removeMember(conversationId, userId);
      if (response.success) {
        console.log('    Member removed successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to remove member');
    } catch (error: any) {
      console.error('  Failed to remove member:', error);
      throw error;
    }
  };

  const getMembers = async (conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Getting channel members:', conversationId);
      const response = await api.chat.getMembers(conversationId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get members');
    } catch (error: any) {
      console.error('  Failed to get members:', error);
      throw error;
    }
  };

  // Channel moderation
  const addModerator = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Adding moderator to channel:', conversationId);
      const response = await api.chat.addModerator(conversationId, userId);
      if (response.success) {
        console.log('    Moderator added successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to add moderator');
    } catch (error: any) {
      console.error('  Failed to add moderator:', error);
      throw error;
    }
  };

  const removeModerator = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Removing moderator from channel:', conversationId);
      const response = await api.chat.removeModerator(conversationId, userId);
      if (response.success) {
        console.log('    Moderator removed successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to remove moderator');
    } catch (error: any) {
      console.error('  Failed to remove moderator:', error);
      throw error;
    }
  };

  const banUser = async (conversationId: string, data: { user_id: string; reason?: string; timeout?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Banning user from channel:', conversationId);
      const response = await api.chat.banUser(conversationId, data);
      if (response.success) {
        console.log('    User banned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to ban user');
    } catch (error: any) {
      console.error('  Failed to ban user:', error);
      throw error;
    }
  };

  const unbanUser = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Unbanning user from channel:', conversationId);
      const response = await api.chat.unbanUser(conversationId, userId);
      if (response.success) {
        console.log('    User unbanned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unban user');
    } catch (error: any) {
      console.error('  Failed to unban user:', error);
      throw error;
    }
  };

  const muteUser = async (conversationId: string, data: { user_id: string; timeout?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Muting user in channel:', conversationId);
      const response = await api.chat.muteUser(conversationId, data);
      if (response.success) {
        console.log('    User muted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to mute user');
    } catch (error: any) {
      console.error('  Failed to mute user:', error);
      throw error;
    }
  };

  const unmuteUser = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Unmuting user in channel:', conversationId);
      const response = await api.chat.unmuteUser(conversationId, userId);
      if (response.success) {
        console.log('    User unmuted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unmute user');
    } catch (error: any) {
      console.error('  Failed to unmute user:', error);
      throw error;
    }
  };

  const flagMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Flagging message:', messageId);
      const response = await api.chat.flagMessage(messageId, conversationId);
      if (response.success) {
        console.log('    Message flagged successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to flag message');
    } catch (error: any) {
      console.error('  Failed to flag message:', error);
      throw error;
    }
  };

  const getFlaggedMessages = async (params?: { limit?: number; offset?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Getting flagged messages');
      const response = await api.chat.getFlaggedMessages(params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get flagged messages');
    } catch (error: any) {
      console.error('  Failed to get flagged messages:', error);
      throw error;
    }
  };

  // Message translation
  const translateMessage = async (messageId: string, conversationId: string, targetLanguage: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('    Translating message:', messageId, 'to', targetLanguage);
      const response = await api.chat.translateMessage(messageId, conversationId, targetLanguage);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to translate message');
    } catch (error: any) {
      console.error('  Failed to translate message:', error);
      throw error;
    }
  };


  return {
    getUnreadConversationCount,
    getConversations,
    getConversationById,
    createConversation,
    getUserByIdDirect,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    readMessage,
    markMessageAsRead,
    markAllAsRead,
    leaveConversation,
    muteConversation,
    sendTypingIndicator,
    getStreamChatToken,
    addReaction,
    removeReaction,
    getReactions,
    createThreadReply,
    getThreadReplies,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    searchMessages,
    searchInConversation,
    updateChannel,
    addMember,
    removeMember,
    getMembers,
    addModerator,
    removeModerator,
    banUser,
    unbanUser,
    muteUser,
    unmuteUser,
    flagMessage,
    getFlaggedMessages,
    translateMessage,
  };
}
