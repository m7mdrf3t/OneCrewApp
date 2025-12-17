import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../contexts/ApiContext';
import { ChatPageProps, ChatMessage, ChatConversation, ChatConversationType, ChatParticipantType } from '../types';
import supabaseService from '../services/SupabaseService';
import { spacing, semanticSpacing } from '../constants/spacing';
import MediaPickerService from '../services/MediaPickerService';
import SkeletonMessage from '../components/SkeletonMessage';

// NOTE: FlashList runtime supports `estimatedItemSize`, but our current TS setup may not expose it.
// We cast to keep the perf optimization without blocking typecheck; revisit after dependency upgrades.
const FlashListUnsafe: React.ComponentType<any> = FlashList as any;

const ChatPage: React.FC<ChatPageProps> = ({
  conversationId,
  participant,
  courseData,
  onBack,
}) => {
  const {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    readMessage,
    getConversationById,
    createConversation,
    getConversations,
    uploadFile,
    getCompanyMembers,
    user,
    currentProfileType,
    activeCompany,
  } = useApi();

  const queryClient = useQueryClient();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<any>(null);
  const messageChannelIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<string | null>(null);
  const hasSentCourseMessageRef = useRef<{ conversationId: string; courseId: string } | null>(null);
  const getConversationByIdRef = useRef(getConversationById);
  const createConversationRef = useRef(createConversation);
  const sendMessageRef = useRef(sendMessage);
  const getMessagesRef = useRef(getMessages);
  const getConversationsRef = useRef(getConversations);
  
  // Keep refs updated
  useEffect(() => {
    getConversationByIdRef.current = getConversationById;
    createConversationRef.current = createConversation;
    sendMessageRef.current = sendMessage;
    getMessagesRef.current = getMessages;
    getConversationsRef.current = getConversations;
  }, [getConversationById, createConversation, sendMessage, getMessages, getConversations]);
  
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{ uri: string; type: 'image' | 'file'; fileName?: string; fileSize?: number } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState<{ userId: string; userName: string } | null>(null);
  const [sendAsCompany, setSendAsCompany] = useState(false);
  const [canSendAsCompany, setCanSendAsCompany] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelIdRef = useRef<string | null>(null);
  const sendTypingStatusRef = useRef<((isTyping: boolean) => Promise<void>) | null>(null);
  const companyChannelIdRef = useRef<string | null>(null);
  const canSendAsCompanyCacheRef = useRef<{ companyId: string; canSend: boolean } | null>(null);
  const mediaPicker = MediaPickerService.getInstance();

  // Determine current user/company ID
  const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
  const currentUserType = currentProfileType === 'company' ? 'company' : 'user';

  type MessagesPage = {
    items: ChatMessage[];
    page: number;
    totalPages?: number;
    limit: number;
  };

  const messagesQueryKey = useMemo(
    () => ['chatMessages', conversation?.id, currentUserType, currentUserId],
    [conversation?.id, currentUserType, currentUserId]
  );

  const messagesQuery = useInfiniteQuery<MessagesPage>({
    queryKey: messagesQueryKey,
    enabled: !!conversation?.id && !!currentUserId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const convId = conversation?.id;
      if (!convId) throw new Error('Conversation is not ready');
      const pageNum = typeof pageParam === 'number' ? pageParam : 1;
      const limit = 50;

      const response = await getMessages(convId, {
        page: pageNum,
        limit,
        include: ['sender_user', 'sender_company', 'sent_by_user'],
        sender_user_fields: ['id', 'name', 'image_url'],
        sender_company_fields: ['id', 'name', 'logo_url', 'subcategory'],
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load messages');
      }

      const data = response.data.data || response.data;
      const pagination = response.data.pagination;
      const list = Array.isArray(data) ? data : [];

      // Reverse messages so oldest are first (newest at bottom)
      let items: ChatMessage[] = [...list].reverse();

      // Fetch read receipts for recent messages only (page 1 only)
      if (pageNum === 1) {
        try {
          const readsResp: any = await getMessages(convId, {
            page: 1,
            limit: 20,
            include: ['reads'],
          });
          if (readsResp?.success && readsResp.data) {
            const readsData = readsResp.data.data || readsResp.data;
            if (Array.isArray(readsData)) {
              const readsMap = new Map<string, any>();
              readsData.forEach((m: any) => {
                if (m?.id) readsMap.set(m.id, m.reads);
              });
              items = items.map((m) => (readsMap.has(m.id) ? { ...m, reads: readsMap.get(m.id) } : m));
            }
          }
        } catch {
          // ignore read-receipt hydration errors; not critical for chat UX
        }
      }

      return {
        items,
        page: pageNum,
        totalPages: pagination?.totalPages,
        limit,
      };
    },
    getNextPageParam: (lastPage) => {
      if (typeof lastPage.totalPages === 'number') {
        return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
      }
      return undefined;
    },
  });

  const messages: ChatMessage[] = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    // Page 1 contains newest set; older pages must appear before it.
    const orderedPages = [...pages].reverse();
    const merged: ChatMessage[] = [];
    const seen = new Set<string>();
    orderedPages.forEach((p) => {
      (p.items || []).forEach((m) => {
        if (!m?.id) return;
        if (!seen.has(m.id)) {
          seen.add(m.id);
          merged.push(m);
        }
      });
    });
    return merged;
  }, [messagesQuery.data]);

  const getParticipantTypeFromParticipant = useCallback((p: any): ChatParticipantType => {
    if (!p) return 'user';
    // common shapes across the app
    if (p.category === 'company' || p.profile_type === 'company' || p.type === 'company') return 'company';
    return 'user';
  }, []);

  const getDirectConversationType = useCallback(
    (a: ChatParticipantType, b: ChatParticipantType): ChatConversationType => {
      if (a === 'user' && b === 'user') return 'user_user';
      if (a === 'company' && b === 'company') return 'company_company';
      return 'user_company';
    },
    []
  );

  const findExistingDirectConversation = useCallback(
    async (desiredType: ChatConversationType, otherId: string, otherType: ChatParticipantType) => {
      const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      const currentProfileTypeValue: ChatParticipantType = currentProfileType === 'company' ? 'company' : 'user';

      if (!currentProfileId) return null;
      if (!getConversationsRef.current) return null;

      const limit = 50;
      const maxPages = 3; // avoid excessive network calls; enough for most users

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const resp = await getConversationsRef.current({
          page: pageNum,
          limit,
          profile_type: currentProfileTypeValue,
          ...(currentProfileTypeValue === 'company' && activeCompany?.id ? { company_id: activeCompany.id } : {}),
        });
        if (!resp?.success || !resp.data) break;

        const data = resp.data.data || resp.data;
        const conversations = Array.isArray(data) ? data : [];

        const match = conversations.find((conv: any) => {
          if (!conv || conv.conversation_type !== desiredType) return false;
          if (!Array.isArray(conv.participants)) return false;

          const hasCurrent = conv.participants.some(
            (p: any) =>
              p?.participant_id === currentProfileId &&
              p?.participant_type === currentProfileTypeValue &&
              !p?.left_at
          );
          const hasOther = conv.participants.some(
            (p: any) => p?.participant_id === otherId && p?.participant_type === otherType && !p?.left_at
          );
          return hasCurrent && hasOther;
        });

        if (match) return match as ChatConversation;

        // stop early if pagination indicates no more pages
        const pagination = resp.data.pagination;
        if (pagination?.totalPages && pageNum >= pagination.totalPages) break;
        if (conversations.length < limit) break;
      }

      return null;
    },
    [currentProfileType, activeCompany?.id, user?.id]
  );

  const hydrateMessageFromLocalContext = useCallback(
    (message: ChatMessage): ChatMessage => {
      const hydrated: ChatMessage = { ...message };

      // Hydrate sender_user/sender_company from local context (realtime payloads are often not hydrated)
      if (hydrated.sender_type === 'user') {
        if (!hydrated.sender_user && user?.id && hydrated.sender_id === user.id) {
          hydrated.sender_user = user as any;
        }
        if (!hydrated.sender_user && conversation?.participants) {
          const p = conversation.participants.find(
            (pp: any) => pp?.participant_type === 'user' && pp?.participant_id === hydrated.sender_id
          );
          if (p?.user) hydrated.sender_user = p.user as any;
        }
      } else if (hydrated.sender_type === 'company') {
        if (!hydrated.sender_company && activeCompany?.id && hydrated.sender_id === activeCompany.id) {
          hydrated.sender_company = activeCompany as any;
        }
        if (!hydrated.sender_company && conversation?.participants) {
          const p = conversation.participants.find(
            (pp: any) => pp?.participant_type === 'company' && pp?.participant_id === hydrated.sender_id
          );
          if (p?.company) hydrated.sender_company = p.company as any;
        }
      }

      // Hydrate sent_by_user for "sent on behalf of company" when possible
      if (hydrated.sent_by_user_id && !hydrated.sent_by_user && user?.id && hydrated.sent_by_user_id === user.id) {
        hydrated.sent_by_user = user as any;
      }

      return hydrated;
    },
    [user, activeCompany, conversation?.id, conversation?.participants]
  );

  // Helper function to validate conversation belongs to current profile
  const validateConversationForProfile = useCallback((conv: ChatConversation): boolean => {
    if (!conv || !conv.participants || !Array.isArray(conv.participants)) {
      return false;
    }
    
    const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentProfileTypeValue = currentProfileType === 'company' ? 'company' : 'user';
    
    // Check if current profile is a participant
    const isParticipant = conv.participants.some((p: any) => 
      p.participant_id === currentProfileId && p.participant_type === currentProfileTypeValue
    );
    
    if (!isParticipant) {
      console.warn('⚠️ Conversation does not belong to current profile:', {
        conversationId: conv.id,
        currentProfileId,
        currentProfileType: currentProfileTypeValue,
        participants: conv.participants,
      });
    }
    
    return isParticipant;
  }, [currentProfileType, activeCompany?.id, user?.id]);

  // Load or create conversation - only once per conversationId
  useEffect(() => {
    // Skip if we've already initialized this conversation
    const conversationKey = conversationId || (participant ? `participant-${participant.id}` : null);
    if (!conversationKey) {
      return;
    }
    
    // Skip if we've already initialized this exact conversation
    if (hasInitializedRef.current === conversationKey) {
      console.log('⏭️ Skipping conversation initialization - already initialized for:', conversationKey);
      return;
    }
    
    const initializeConversation = async () => {
      try {
        console.log('🔄 Initializing conversation:', conversationKey, {
          profileType: currentProfileType,
          profileId: currentProfileType === 'company' ? activeCompany?.id : user?.id,
        });
        setLoading(true);
        setError(null);

        if (conversationId) {
          // Load existing conversation
          const response = await getConversationByIdRef.current(conversationId);
          if (response.success && response.data) {
            const conv = response.data;
            
            // Validate conversation belongs to current profile
            if (!validateConversationForProfile(conv)) {
              throw new Error('This conversation does not belong to your current profile. Please switch profiles to view it.');
            }
            
            setConversation(conv);
            hasInitializedRef.current = conversationKey;
            // Messages are loaded via TanStack Query once conversation is set.
            
            // Auto-send course message if courseData is provided (even for existing conversations)
            const messageKey = courseData ? { conversationId, courseId: courseData.id } : null;
            const alreadySent = hasSentCourseMessageRef.current && 
              hasSentCourseMessageRef.current.conversationId === conversationId &&
              hasSentCourseMessageRef.current.courseId === courseData?.id;
            
            if (courseData && !alreadySent) {
              try {
                const courseMessage = `I've registered for "${courseData.title}"${courseData.description ? `. ${courseData.description.substring(0, 200)}${courseData.description.length > 200 ? '...' : ''}` : ''}`;
                await sendMessageRef.current(conversationId, {
                  content: courseMessage,
                  message_type: 'text',
                });
                if (messageKey) {
                  hasSentCourseMessageRef.current = messageKey;
                }
                console.log('✅ Auto-sent course registration message to existing conversation');
              } catch (messageError: any) {
                console.error('Failed to send course registration message:', messageError);
                // Don't block conversation loading if message sending fails
              }
            }
          } else {
            throw new Error(response.error || 'Failed to load conversation');
          }
        } else if (participant) {
          // Create new conversation
          // IMPORTANT: When chatting with an academy/company, we need to determine the conversation type correctly
          // The backend requires that to create company_company conversations, the user must be a verified company member
          // Following the course registration pattern: users interact with academies as regular users, not as companies
          // So we default to user_company to avoid backend errors
          // Users can still send messages as company later if they have permissions (via sendAsCompany toggle)
          
          const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
          const currentProfileTypeValue: ChatParticipantType = currentProfileType === 'company' ? 'company' : 'user';
          const otherParticipantType = getParticipantTypeFromParticipant(participant);

          // Determine conversation type based on BOTH sides (fixes company→user incorrectly creating user_user)
          let conversationType: ChatConversationType = getDirectConversationType(currentProfileTypeValue, otherParticipantType);

          // When initiating chat with a company/academy from a user profile, default to user_company
          // (backend may reject company_company unless properly authorized)
          if (otherParticipantType === 'company' && currentProfileTypeValue === 'user') {
            conversationType = 'user_company';
            console.log('💬 Using user_company for user → company/academy chat');
          }

          const participantIds = [participant.id];
          
          // Log profile context for verification
          console.log('💬 Creating conversation with profile context:', {
            conversationType,
            participantIds,
            currentProfileType: currentProfileTypeValue,
            currentProfileId,
            hasActiveCompany: !!activeCompany,
            hasUser: !!user,
            note: 'Using user_company for academy chats (users can send as company later if authorized)',
          });

          // Prevent duplicate direct conversations: look up existing conversation before creating a new one
          try {
            const existing = await findExistingDirectConversation(conversationType, participant.id, otherParticipantType);
            if (existing?.id) {
              console.log('✅ Found existing conversation, reusing:', existing.id);
              setConversation(existing);
              hasInitializedRef.current = conversationKey;
              // Messages are loaded via TanStack Query once conversation is set.
              return;
            }
          } catch (lookupErr) {
            console.warn('⚠️ Failed to lookup existing conversation, falling back to create:', lookupErr);
          }

          const createResponse = await createConversationRef.current({
            conversation_type: conversationType,
            participant_ids: participantIds,
          });

          if (createResponse.success && createResponse.data) {
            const newConversation = createResponse.data;
            setConversation(newConversation);
            hasInitializedRef.current = conversationKey;
            
            // Messages are loaded via TanStack Query once conversation is set.
            
            // Auto-send course registration message if courseData is provided (always send, even if conversation exists)
            const messageKey = courseData ? { conversationId: newConversation.id, courseId: courseData.id } : null;
            const alreadySent = hasSentCourseMessageRef.current && 
              hasSentCourseMessageRef.current.conversationId === newConversation.id &&
              hasSentCourseMessageRef.current.courseId === courseData?.id;
            
            if (courseData && !alreadySent) {
              try {
                // First, send the course cover image if available
                if (courseData.poster_url) {
                  try {
                    await sendMessageRef.current(newConversation.id, {
                      content: '',
                      message_type: 'image',
                      file_url: courseData.poster_url,
                    });
                    console.log('✅ Sent course cover image');
                    // Small delay to ensure image message is sent before text message
                    await new Promise(resolve => setTimeout(resolve, 300));
                  } catch (imageError: any) {
                    console.error('Failed to send course cover image:', imageError);
                    // Continue with text message even if image fails
                  }
                }

                // Build rich course details message
                const courseDetails: string[] = [];
                courseDetails.push(`📚 Course Registration`);
                courseDetails.push(`\n🎓 ${courseData.title}`);
                
                if (courseData.description) {
                  const description = courseData.description.length > 300 
                    ? courseData.description.substring(0, 300) + '...' 
                    : courseData.description;
                  courseDetails.push(`\n📝 ${description}`);
                }

                // Course information
                const infoLines: string[] = [];
                
                if (courseData.price !== undefined && courseData.price !== null) {
                  infoLines.push(`💰 Price: ${courseData.price === 0 ? 'Free' : `$${courseData.price.toFixed(2)}`}`);
                }
                
                if (courseData.start_date) {
                  const startDate = new Date(courseData.start_date);
                  infoLines.push(`📅 Start Date: ${startDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`);
                }
                
                if (courseData.end_date) {
                  const endDate = new Date(courseData.end_date);
                  infoLines.push(`📅 End Date: ${endDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`);
                }
                
                if (courseData.duration) {
                  infoLines.push(`⏱️ Duration: ${courseData.duration}`);
                }
                
                if (courseData.category) {
                  infoLines.push(`🏷️ Category: ${courseData.category}`);
                }
                
                if (courseData.number_of_sessions) {
                  infoLines.push(`📖 Sessions: ${courseData.number_of_sessions}`);
                }
                
                if (courseData.primary_lecturer?.name) {
                  infoLines.push(`👨‍🏫 Lecturer: ${courseData.primary_lecturer.name}`);
                } else if (courseData.instructors && courseData.instructors.length > 0) {
                  const instructorNames = courseData.instructors.map(i => i.name).join(', ');
                  infoLines.push(`👨‍🏫 Instructors: ${instructorNames}`);
                }
                
                if (courseData.total_seats) {
                  const availableSeats = courseData.available_seats !== undefined ? courseData.available_seats : courseData.total_seats;
                  infoLines.push(`👥 Seats: ${availableSeats}/${courseData.total_seats} available`);
                }

                if (infoLines.length > 0) {
                  courseDetails.push(`\n${infoLines.join('\n')}`);
                }

                courseDetails.push(`\n\n✅ I've registered for this course and I'm looking forward to it!`);

                const courseMessage = courseDetails.join('');
                
                await sendMessageRef.current(newConversation.id, {
                  content: courseMessage,
                  message_type: 'text',
                });
                
                if (messageKey) {
                  hasSentCourseMessageRef.current = messageKey;
                }
                console.log('✅ Auto-sent enhanced course registration message');
              } catch (messageError: any) {
                console.error('Failed to send course registration message:', messageError);
                // Don't block conversation creation if message sending fails
              }
            }
          } else {
            throw new Error(createResponse.error || 'Failed to create conversation');
          }
        } else {
          throw new Error('No conversation ID or participant provided');
        }
      } catch (err: any) {
        console.error('Failed to initialize conversation:', err);
        const errorMessage = err.message || 'Failed to load conversation';
        setError(errorMessage);
        
        // Handle profile mismatch errors gracefully
        if (errorMessage.includes('does not belong to your current profile') || 
            err?.response?.status === 403 || 
            err?.message?.includes('403') ||
            err?.message?.includes('not a participant')) {
          Alert.alert(
            'Profile Mismatch',
            'This conversation belongs to a different profile. Please switch to the correct profile to view it.',
            [{ text: 'OK', onPress: onBack }]
          );
        } else {
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
    
    // Reset initialization flag when conversation key changes
    return () => {
      // Only reset if the conversation key actually changed
      const currentKey = conversationId || (participant ? `participant-${participant.id}` : null);
      if (currentKey && currentKey !== conversationKey) {
        hasInitializedRef.current = null;
        hasSentCourseMessageRef.current = null;
      }
    };
  }, [conversationId, participant?.id, currentProfileType, activeCompany?.id, courseData?.id, validateConversationForProfile]); // Include profile dependencies and validation function

  // Handle profile changes while viewing a conversation
  useEffect(() => {
    if (!conversation?.id) {
      return;
    }
    
    // Validate conversation still belongs to current profile
    const isValid = validateConversationForProfile(conversation);
    
    if (!isValid) {
      console.log('🔄 Profile changed - conversation no longer valid, navigating away');
      // Clear conversation state and navigate back
      const prevConversationId = conversation.id;
      setConversation(null);
      queryClient.removeQueries({ queryKey: ['chatMessages', prevConversationId], exact: false });
      hasInitializedRef.current = null;
      Alert.alert(
        'Profile Changed',
        'This conversation belongs to a different profile. Please switch to the correct profile to view it.',
        [{ text: 'OK', onPress: onBack }]
      );
      return;
    }
    
    // If conversation is still valid but profile changed, reload messages
    // This ensures we have the latest messages for the current profile context
    const shouldReload = hasInitializedRef.current === (conversationId || (participant ? `participant-${participant.id}` : null));
    if (shouldReload && conversation.id) {
      console.log('🔄 Profile changed - reloading messages for current profile');
      messagesQuery.refetch().catch((err) => {
        console.error('Failed to reload messages after profile change:', err);
      });
    }
  }, [currentProfileType, activeCompany?.id, user?.id, conversation?.id, validateConversationForProfile, conversationId, participant?.id, onBack, queryClient, messagesQuery]);

  // Mark messages as read when conversation is viewed
  const hasMarkedAsReadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversation?.id || loading || (messagesQuery.isLoading && messages.length === 0)) {
      return;
    }

    // Reset ref if conversation changed
    if (hasMarkedAsReadRef.current !== conversation.id) {
      hasMarkedAsReadRef.current = null;
    }

    // Skip if we already marked this conversation as read
    if (hasMarkedAsReadRef.current === conversation.id) {
      return;
    }

    // Mark all messages in conversation as read when viewing
    const markAsRead = async () => {
      try {
        // Mark the conversation as read (updates last_read_at for participant)
        await readMessage(conversation.id);
        console.log('✅ Marked conversation as read');
        hasMarkedAsReadRef.current = conversation.id;
      } catch (error: any) {
        // Handle 403 errors gracefully - user might not be a participant (e.g., company admin viewing user_user conversation)
        if (error?.message?.includes('403') || error?.message?.includes('not a participant') || error?.response?.status === 403) {
          console.log('⚠️ Cannot mark as read - user may not be a participant in this conversation type');
          // Still mark as "attempted" to prevent repeated tries
          hasMarkedAsReadRef.current = conversation.id;
        } else {
          console.error('❌ Failed to mark conversation as read:', error);
        }
        // Don't show error to user, just log it
      }
    };

    // Delay marking as read slightly to ensure messages are loaded
    const timer = setTimeout(() => {
      markAsRead();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [conversation?.id, loading, messagesQuery.isLoading, messages.length]);

  // Subscribe to real-time messages when conversation is loaded
  useEffect(() => {
    if (!conversation?.id || !supabaseService.isInitialized()) {
      return;
    }
    
    // Validate conversation belongs to current profile before subscribing
    if (!validateConversationForProfile(conversation)) {
      console.warn('⚠️ Skipping real-time subscription - conversation does not belong to current profile');
      return;
    }

    console.log('💬 Setting up real-time subscription for conversation:', conversation.id, {
      profileType: currentProfileType,
      profileId: currentProfileType === 'company' ? activeCompany?.id : user?.id,
    });

    // Cleanup previous subscription
    if (messageChannelIdRef.current) {
      supabaseService.unsubscribe(messageChannelIdRef.current);
      messageChannelIdRef.current = null;
    }

    // Subscribe to new messages
    const channelId = supabaseService.subscribeToChatMessages(
      conversation.id,
      (newMessage: ChatMessage) => {
        console.log('💬 New message received via real-time:', newMessage);

        // Realtime payloads are often not hydrated (no sender_user/sender_company/reads)
        const hydratedNewMessage = hydrateMessageFromLocalContext(newMessage);
        
        // Update TanStack Query cache (avoid duplicates)
        queryClient.setQueryData(messagesQueryKey, (old: any) => {
          const base = old ?? { pages: [], pageParams: [1] };
          const pages = Array.isArray(base.pages) ? base.pages : [];
          if (pages.length === 0) {
            return {
              ...base,
              pages: [{ items: [hydratedNewMessage], page: 1, totalPages: 1, limit: 50 }],
              pageParams: [1],
            };
          }

          // If message already exists anywhere, skip
          const exists = pages.some((p: any) =>
            Array.isArray(p.items) ? p.items.some((m: any) => m?.id === hydratedNewMessage.id) : false
          );
          if (exists) return base;

          // Append to page 1 (newest page)
          const updatedPages = pages.map((p: any, idx: number) => {
            if (idx !== 0) return p;
            const items = Array.isArray(p.items) ? p.items : [];
            return { ...p, items: [...items, hydratedNewMessage] };
          });

          return { ...base, pages: updatedPages };
        });

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd?.({ animated: true });
        }, 100);
        
        // Validate message belongs to current profile's conversation before processing
        const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
        const currentProfileTypeValue = currentProfileType === 'company' ? 'company' : 'user';
        
        // Only process messages if conversation is valid for current profile
        if (!validateConversationForProfile(conversation)) {
          console.warn('⚠️ Ignoring message - conversation does not belong to current profile');
          return;
        }
        
        // Mark as read if the message is NOT from the current active profile
        if (!(newMessage.sender_id === currentProfileId && newMessage.sender_type === currentProfileTypeValue)) {
          // Mark conversation as read when receiving a new message
          readMessage(conversation.id).catch((err: any) => {
            // Handle 403 errors gracefully
            if (err?.message?.includes('403') || err?.message?.includes('not a participant') || err?.response?.status === 403) {
              console.log('⚠️ Cannot mark as read - user may not be a participant');
            } else {
              console.error('❌ Failed to mark conversation as read:', err);
            }
          });
        }
      },
      (updatedMessage: ChatMessage) => {
        console.log('💬 Message updated via real-time:', updatedMessage);

        const hydratedUpdatedMessage = hydrateMessageFromLocalContext(updatedMessage);
        
        queryClient.setQueryData(messagesQueryKey, (old: any) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              items: Array.isArray(p.items)
                ? p.items.map((m: any) => (m?.id === hydratedUpdatedMessage.id ? hydratedUpdatedMessage : m))
                : p.items,
            })),
          };
        });
      },
      (deletedMessage: any) => {
        console.log('💬 Message deleted via real-time:', deletedMessage);
        
        // Handle both old (deleted message object) and new (just ID) formats
        const messageId = deletedMessage.id || deletedMessage;
        
        queryClient.setQueryData(messagesQueryKey, (old: any) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              items: Array.isArray(p.items) ? p.items.filter((m: any) => m?.id !== messageId) : p.items,
            })),
          };
        });
      }
    );

    messageChannelIdRef.current = channelId;

    // Subscribe to typing indicators from other users using Supabase broadcast
    try {
      const client = supabaseService.getClient();
      if (client) {
        const typingChannelName = `typing:${conversation.id}`;
        const typingChannel = client.channel(typingChannelName);
        
        typingChannel
          .on('broadcast', { event: 'typing' }, (payload) => {
            const { user_id, user_type, is_typing, user_name } = payload.payload || {};
            
            // Only show typing indicator for OTHER users, not current user
            if (user_id && user_id !== currentUserId) {
              if (is_typing) {
                setOtherUserTyping({ userId: user_id, userName: user_name || 'Someone' });
                
                // Auto-clear typing indicator after 5 seconds if no update
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                  setOtherUserTyping(prev => prev?.userId === user_id ? null : prev);
                }, 5000);
              } else {
                // Clear typing indicator when user stops typing
                setOtherUserTyping(prev => prev?.userId === user_id ? null : prev);
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
              }
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to typing indicators');
            }
          });
        
        typingChannelIdRef.current = typingChannelName;
      }
    } catch (error) {
      console.error('Failed to subscribe to typing indicators:', error);
    }

    // Subscribe to company channel if viewing as company
    if (currentProfileType === 'company' && activeCompany && supabaseService.isInitialized()) {
      try {
        const client = supabaseService.getClient();
        if (client) {
          const companyChannelName = `chat:company:${activeCompany.id}`;
          const companyChannel = client.channel(companyChannelName);
          
          // Listen for company-related updates
          companyChannel.on('broadcast', { event: 'company_update' }, (payload) => {
            console.log('💼 Company update received:', payload);
            // Handle company-related updates (e.g., new conversations, notifications)
          });
          
          companyChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to company channel:', companyChannelName);
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Failed to subscribe to company channel');
            }
          });
          
          companyChannelIdRef.current = companyChannelName;
        }
      } catch (error) {
        console.error('Failed to subscribe to company channel:', error);
      }
    }

    return () => {
      if (messageChannelIdRef.current) {
        console.log('🔌 Unsubscribing from chat messages');
        supabaseService.unsubscribe(messageChannelIdRef.current);
        messageChannelIdRef.current = null;
      }
      if (typingChannelIdRef.current) {
        try {
          const client = supabaseService.getClient();
          if (client) {
            const typingChannel = client.channel(typingChannelIdRef.current);
            typingChannel.unsubscribe();
          }
        } catch (error) {
          console.error('Failed to unsubscribe from typing channel:', error);
        }
        typingChannelIdRef.current = null;
      }
      if (companyChannelIdRef.current) {
        try {
          const client = supabaseService.getClient();
          if (client) {
            const companyChannel = client.channel(companyChannelIdRef.current);
            companyChannel.unsubscribe();
            console.log('🔌 Unsubscribed from company channel');
          }
        } catch (error) {
          console.error('Failed to unsubscribe from company channel:', error);
        }
        companyChannelIdRef.current = null;
      }
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing status when leaving
      if (sendTypingStatusRef.current) {
        sendTypingStatusRef.current(false);
      }
    };
  }, [conversation?.id, currentProfileType, activeCompany?.id, user?.id, validateConversationForProfile]);

  const loadMessages = useCallback(async (_convId: string, _pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
          await messagesQuery.fetchNextPage();
        }
        return;
      }

      // Keep refresh light: drop to page 1 then refetch.
      queryClient.setQueryData(messagesQueryKey, (old: any) => {
        if (!old?.pages?.length) return old;
        return {
          ...old,
          pages: old.pages.slice(0, 1),
          pageParams: old.pageParams?.slice?.(0, 1) ?? old.pageParams,
        };
      });

      await messagesQuery.refetch();

      // Scroll to bottom after refresh/initial load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd?.({ animated: false });
      }, 100);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.message || 'Failed to load messages');
    }
  }, [messagesQuery, queryClient, messagesQueryKey]);

  const handlePickImage = async () => {
    try {
      setShowAttachmentOptions(false);
      const result = await mediaPicker.pickImage({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result) {
        setSelectedAttachment({
          uri: result.uri,
          type: 'image',
          fileName: result.fileName,
          fileSize: result.fileSize,
        });
      }
    } catch (err: any) {
      console.error('Failed to pick image:', err);
      Alert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      setShowAttachmentOptions(false);
      const result = await mediaPicker.takePhoto({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result) {
        setSelectedAttachment({
          uri: result.uri,
          type: 'image',
          fileName: result.fileName,
          fileSize: result.fileSize,
        });
      }
    } catch (err: any) {
      console.error('Failed to take photo:', err);
      Alert.alert('Error', err.message || 'Failed to take photo');
    }
  };

  const handleRemoveAttachment = () => {
    setSelectedAttachment(null);
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedAttachment) || !conversation || sending || uploadingAttachment) return;

    const messageText = newMessage.trim();
    setSending(true);
    setNewMessage('');

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let messageType: 'text' | 'image' | 'file' = 'text';

      // Upload attachment if present
      if (selectedAttachment) {
        setUploadingAttachment(true);
        try {
          const uploadResult = await uploadFile({
            uri: selectedAttachment.uri,
            type: selectedAttachment.type === 'image' ? 'image/jpeg' : 'application/octet-stream',
            name: selectedAttachment.fileName || `attachment_${Date.now()}.${selectedAttachment.type === 'image' ? 'jpg' : 'bin'}`,
          });

          // uploadFile returns { success: true, data: { url, filename, size, type } }
          const fileData = uploadResult.data;
          fileUrl = fileData.url;
          fileName = fileData.filename;
          fileSize = fileData.size;
          messageType = selectedAttachment.type === 'image' ? 'image' : 'file';
        } catch (uploadError: any) {
          console.error('Failed to upload attachment:', uploadError);
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload attachment');
          setUploadingAttachment(false);
          setSending(false);
          setNewMessage(messageText);
          return;
        } finally {
          setUploadingAttachment(false);
        }
      }

      const response = await sendMessage(conversation.id, {
        content: messageText || undefined,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        reply_to_message_id: replyingToMessage?.id,
      });

      if (response.success) {
        // Real-time subscription will handle adding the message to the list
        console.log('✅ Message sent, waiting for real-time update');
        setSelectedAttachment(null);
        setReplyingToMessage(null);
        // Stop typing status when message is sent
        sendTypingStatus(false);
        if (typingStatusTimeoutRef.current) {
          clearTimeout(typingStatusTimeoutRef.current);
        }
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      // Handle 403 permission errors specifically
      if (err.response?.status === 403 || err.status === 403 || err.message?.includes('403') || err.message?.toLowerCase().includes('permission')) {
        Alert.alert(
          'Permission Denied',
          'Only company owners and admins can send messages as the company. Please switch to your personal account or contact a company admin.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to send message');
      }
      
      // Restore message text on error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!conversation?.id) return;
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      loadMessages(conversation.id, 0, true);
    }
  }, [conversation?.id, loadMessages, messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage]);

  const handleLongPressMessage = (message: ChatMessage) => {
    // Only allow edit/delete for own messages and non-system messages
    if (isCurrentUserMessage(message) && message.message_type !== 'system') {
      setSelectedMessage(message);
      setShowActionSheet(true);
    }
  };

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingToMessage(message);
    setShowActionSheet(false);
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };

  // Send typing status to other users
  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!conversation?.id || !supabaseService.isInitialized() || !currentUserId) return;
    
    try {
      const client = supabaseService.getClient();
      if (!client) return;
      
      // Use Supabase broadcast to send typing status
      const channelName = `typing:${conversation.id}`;
      let channel = client.channel(channelName);
      
      // Subscribe if not already subscribed
      if (channel.state !== 'joined' && channel.state !== 'joining') {
        channel.subscribe();
        // Wait a bit for subscription
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Send typing status
      const result = await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: conversation.id,
          user_id: currentUserId,
          user_type: currentUserType,
          is_typing: isTyping,
          user_name: user?.name || activeCompany?.name || 'User',
        },
      });
      
      if (result === 'error') {
        console.warn('Failed to send typing status broadcast');
      }
    } catch (error) {
      console.error('Failed to send typing status:', error);
    }
  }, [conversation?.id, currentUserId, currentUserType, user?.name, activeCompany?.name]);

  // Update ref whenever sendTypingStatus changes
  useEffect(() => {
    sendTypingStatusRef.current = sendTypingStatus;
  }, [sendTypingStatus]);

  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    // Send typing status when user starts typing
    if (text.length > 0) {
      sendTypingStatus(true);
      
      // Clear existing timeout
      if (typingStatusTimeoutRef.current) {
        clearTimeout(typingStatusTimeoutRef.current);
      }
      
      // Stop typing status after 3 seconds of no typing
      typingStatusTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 3000);
    } else {
      // Stop typing immediately when text is cleared
      sendTypingStatus(false);
      if (typingStatusTimeoutRef.current) {
        clearTimeout(typingStatusTimeoutRef.current);
      }
    }
  };

  const handleEditMessage = async () => {
    if (!selectedMessage || !editText.trim()) {
      return;
    }

    setIsEditing(true);
    try {
      const response = await editMessage(selectedMessage.id, editText.trim());
      if (response.success) {
        setShowEditModal(false);
        setSelectedMessage(null);
        setEditText('');
        // Real-time subscription will handle the update
      } else {
        throw new Error(response.error || 'Failed to edit message');
      }
    } catch (err: any) {
      console.error('Failed to edit message:', err);
      Alert.alert('Error', err.message || 'Failed to edit message');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    setShowActionSheet(false);
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await deleteMessage(message.id);
              if (response.success) {
                // Immediately remove from UI (don't wait for real-time)
                queryClient.setQueryData(messagesQueryKey, (old: any) => {
                  if (!old?.pages?.length) return old;
                  return {
                    ...old,
                    pages: old.pages.map((p: any) => ({
                      ...p,
                      items: Array.isArray(p.items) ? p.items.filter((m: any) => m?.id !== message.id) : p.items,
                    })),
                  };
                });
                setSelectedMessage(null);
                // Real-time subscription will also handle it, but we update immediately
              } else {
                throw new Error(response.error || 'Failed to delete message');
              }
            } catch (err: any) {
              console.error('Failed to delete message:', err);
              Alert.alert('Error', err.message || 'Failed to delete message');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getParticipantName = (): string => {
    if (conversation?.name) {
      return conversation.name;
    }
    
    if (conversation?.participants && conversation.participants.length > 0) {
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
    
    return participant?.name || 'Unknown';
  };

  const getParticipantAvatar = (): string | null => {
    if (conversation?.participants && conversation.participants.length > 0) {
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
    
    return participant?.image_url || participant?.logo_url || null;
  };

  const isCurrentUserMessage = (message: ChatMessage): boolean => {
    // Ensure we're checking against the current profile context
    const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentProfileTypeValue = currentProfileType === 'company' ? 'company' : 'user';
    
    if (message.sender_type === 'user') {
      return message.sender_type === currentProfileTypeValue && message.sender_id === currentProfileId;
    } else if (message.sender_type === 'company') {
      return message.sender_type === currentProfileTypeValue && message.sender_id === currentProfileId;
    }
    return false;
  };

  const getSenderName = (message: ChatMessage): string => {
    if (message.sender_user) {
      return message.sender_user.name || 'Unknown User';
    } else if (message.sender_company) {
      return message.sender_company.name || 'Unknown Company';
    }
    return 'Unknown';
  };

  const getSenderDisplayText = (message: ChatMessage): { name: string; subtitle?: string } => {
    if (message.sender_type === 'user') {
      return {
        name: message.sender_user?.name || 'Unknown User',
      };
    } else if (message.sender_type === 'company') {
      const companyName = message.sender_company?.name || 'Unknown Company';
      if (message.sent_by_user && message.sent_by_user.id !== message.sender_id) {
        return {
          name: companyName,
          subtitle: `Sent by ${message.sent_by_user.name || 'Unknown User'}`,
        };
      }
      return {
        name: companyName,
      };
    }
    return { name: 'Unknown' };
  };

  // Check if user can send messages as company (owner/admin only)
  const checkCanSendAsCompany = useCallback(async (): Promise<boolean> => {
    if (currentProfileType !== 'company' || !activeCompany || !user) {
      return false;
    }

    // Check cache first
    if (canSendAsCompanyCacheRef.current && canSendAsCompanyCacheRef.current.companyId === activeCompany.id) {
      return canSendAsCompanyCacheRef.current.canSend;
    }

    try {
      setCheckingPermission(true);
      const membersResponse = await getCompanyMembers(activeCompany.id);
      if (membersResponse.success && membersResponse.data) {
        const members = Array.isArray(membersResponse.data) ? membersResponse.data : (membersResponse.data.data || []);
        const userMember = members.find((m: any) => m.user_id === user.id);
        const canSend = userMember && (userMember.role === 'owner' || userMember.role === 'admin');
        
        // Cache the result
        canSendAsCompanyCacheRef.current = {
          companyId: activeCompany.id,
          canSend: !!canSend,
        };
        
        setCanSendAsCompany(!!canSend);
        return !!canSend;
      }
      return false;
    } catch (error) {
      console.error('Failed to check company member permissions:', error);
      return false;
    } finally {
      setCheckingPermission(false);
    }
  }, [currentProfileType, activeCompany, user, getCompanyMembers]);

  // Check permissions when conversation or profile changes
  useEffect(() => {
    if (conversation && (conversation.conversation_type === 'user_company' || conversation.conversation_type === 'company_company')) {
      checkCanSendAsCompany();
    } else {
      setCanSendAsCompany(false);
      setSendAsCompany(false);
    }
  }, [conversation?.id, conversation?.conversation_type, currentProfileType, activeCompany?.id, checkCanSendAsCompany]);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = isCurrentUserMessage(item);
    const isSystem = item.message_type === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content || 'System message'}</Text>
          <Text style={styles.systemMessageTime}>{formatTime(item.sent_at)}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
        onLongPress={() => handleLongPressMessage(item)}
        onPress={() => {
          // Allow replying to any non-system message
          if (item.message_type !== 'system' && !isCurrentUserMessage(item)) {
            handleReplyToMessage(item);
          }
        }}
        activeOpacity={0.7}
      >
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {item.sender_type === 'company' && item.sender_company?.logo_url ? (
              <Image
                source={{ uri: item.sender_company.logo_url }}
                style={styles.messageAvatar as ImageStyle}
                contentFit="cover"
                transition={150}
              />
            ) : item.sender_type === 'user' && item.sender_user?.image_url ? (
              <Image
                source={{ uri: item.sender_user.image_url }}
                style={styles.messageAvatar as ImageStyle}
                contentFit="cover"
                transition={150}
              />
            ) : getParticipantAvatar() ? (
              <Image
                source={{ uri: getParticipantAvatar() || '' }}
                style={styles.messageAvatar as ImageStyle}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.messageAvatarPlaceholder}>
                <Text style={styles.messageAvatarText}>
                  {getSenderName(item).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          !isCurrentUser && item.sender_type === 'company' && styles.companyMessageBubble,
          isCurrentUser && item.sender_type === 'company' && styles.companyMessageBubbleOwn,
        ]}>
          {!isCurrentUser && (
            <View>
              <Text style={styles.senderName}>{getSenderDisplayText(item).name}</Text>
              {getSenderDisplayText(item).subtitle && (
                <Text style={styles.senderSubtitle}>{getSenderDisplayText(item).subtitle}</Text>
              )}
            </View>
          )}
          
          {/* Reply context */}
          {item.reply_to_message && (
            <View style={[
              styles.replyContext,
              isCurrentUser && { borderLeftColor: 'rgba(255, 255, 255, 0.5)' }
            ]}>
              <Ionicons name="return-down-forward" size={12} color={isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : '#6b7280'} />
              <Text style={[
                styles.replyContextText,
                isCurrentUser ? styles.replyContextTextCurrent : styles.replyContextTextOther
              ]} numberOfLines={1}>
                {item.reply_to_message.content || (item.reply_to_message.message_type === 'image' ? 'Image' : item.reply_to_message.message_type === 'file' ? 'File' : 'Message')}
              </Text>
            </View>
          )}
          
          {/* Image attachment */}
          {item.message_type === 'image' && item.file_url && (
            <Image
              source={{ uri: item.file_url }}
              style={styles.messageImage as ImageStyle}
              contentFit="cover"
              transition={150}
            />
          )}
          
          {/* File attachment */}
          {item.message_type === 'file' && item.file_url && (
            <TouchableOpacity style={styles.messageFile}>
              <Ionicons name="document" size={24} color={isCurrentUser ? '#fff' : '#3b82f6'} />
              <View style={styles.messageFileInfo}>
                <Text style={[
                  styles.messageFileName,
                  isCurrentUser ? styles.currentUserText : styles.otherUserText
                ]} numberOfLines={1}>
                  {item.file_name || 'File'}
                </Text>
                {item.file_size && (
                  <Text style={[
                    styles.messageFileSize,
                    isCurrentUser ? styles.currentUserTime : styles.otherUserTime
                  ]}>
                    {formatFileSize(item.file_size)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {/* Text content */}
          {item.content && (
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}>
              {item.content}
            </Text>
          )}
          
          {/* Message status and read receipts for current user's messages */}
          {isCurrentUser && (
            <View style={styles.messageStatusContainer}>
              {item.reads && item.reads.length > 0 ? (
                <Ionicons name="checkmark-done" size={14} color="#3b82f6" style={styles.messageStatusIcon} />
              ) : (
                <Ionicons name="checkmark" size={14} color="rgba(255, 255, 255, 0.5)" style={styles.messageStatusIcon} />
              )}
              <Text style={[
                styles.messageTime,
                isCurrentUser ? styles.currentUserTime : styles.otherUserTime,
              ]}>
                {formatTime(item.sent_at)}
                {item.edited_at && ' (edited)'}
              </Text>
            </View>
          )}
          
          {!isCurrentUser && (
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime,
            ]}>
              {formatTime(item.sent_at)}
              {item.edited_at && ' (edited)'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const shouldShowLoading = loading || (messagesQuery.isLoading && messages.length === 0);

  if (shouldShowLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerRight} />
        </View>
        <FlashListUnsafe
          data={Array.from({ length: 5 })}
          renderItem={({ index }) => (
            <SkeletonMessage key={index} isOwn={index % 2 === 0} isDark={false} />
          )}
          keyExtractor={(_, index) => `skeleton-loading-${index}`}
          contentContainerStyle={styles.skeletonLoadingContainer}
          inverted={false}
          estimatedItemSize={88}
        />
      </View>
    );
  }

  if (error && !conversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
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
              if (conversationId) {
                getConversationById(conversationId).then(response => {
                  if (response.success && response.data) {
                    setConversation(response.data);
                  messagesQuery.refetch().catch(() => {});
                  }
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

  const participantName = getParticipantName();
  const participantAvatar = getParticipantAvatar();
  const initials = participantName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {participantAvatar ? (
            <Image
              source={{ uri: participantAvatar }}
              style={styles.headerAvatar as ImageStyle}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {participantName}
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      <FlashListUnsafe
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        estimatedItemSize={110}
        ListEmptyComponent={
          !shouldShowLoading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Start the conversation!</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {otherUserTyping && (
              <View style={styles.typingIndicator}>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, styles.typingDotDelay1]} />
                  <View style={[styles.typingDot, styles.typingDotDelay2]} />
                </View>
                <Text style={styles.typingText}>{otherUserTyping.userName} is typing...</Text>
              </View>
            )}
            {messagesQuery.isFetchingNextPage && (
              <View style={styles.footerLoader}>
                {Array.from({ length: 2 }).map((_, index) => (
                  <SkeletonMessage key={`skeleton-message-${index}`} isOwn={index % 2 === 0} isDark={false} />
                ))}
              </View>
            )}
          </>
        }
      />

      <View style={styles.inputContainer}>
        {/* Reply context */}
        {replyingToMessage && (
          <View style={styles.replyInputContext}>
            <View style={styles.replyInputContextContent}>
              <Ionicons name="return-down-forward" size={16} color="#3b82f6" />
              <View style={styles.replyInputContextText}>
                <Text style={styles.replyInputContextName}>
                  {getSenderName(replyingToMessage)}
                </Text>
                <Text style={styles.replyInputContextMessage} numberOfLines={1}>
                  {replyingToMessage.content || (replyingToMessage.message_type === 'image' ? 'Image' : replyingToMessage.message_type === 'file' ? 'File' : 'Message')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.replyInputContextClose}
              onPress={handleCancelReply}
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Selected attachment preview */}
        {selectedAttachment && (
          <View style={styles.attachmentPreview}>
            {selectedAttachment.type === 'image' ? (
              <Image
                source={{ uri: selectedAttachment.uri }}
                style={styles.attachmentPreviewImage as ImageStyle}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.attachmentPreviewFile}>
                <Ionicons name="document" size={24} color="#3b82f6" />
                <Text style={styles.attachmentPreviewFileName} numberOfLines={1}>
                  {selectedAttachment.fileName || 'File'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.attachmentRemoveButton}
              onPress={handleRemoveAttachment}
            >
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Send as Company Toggle */}
        {canSendAsCompany && conversation && (conversation.conversation_type === 'user_company' || conversation.conversation_type === 'company_company') && (
          <View style={styles.sendAsCompanyContainer}>
            <TouchableOpacity
              style={styles.sendAsCompanyToggle}
              onPress={() => setSendAsCompany(!sendAsCompany)}
              disabled={checkingPermission}
            >
              <View style={[styles.toggleSwitch, sendAsCompany && styles.toggleSwitchActive]}>
                <View style={[styles.toggleThumb, sendAsCompany && styles.toggleThumbActive]} />
              </View>
              <View style={styles.sendAsCompanyLabel}>
                {sendAsCompany && activeCompany?.logo_url ? (
                  <Image
                    source={{ uri: activeCompany.logo_url }}
                    style={styles.companyToggleLogo}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <Ionicons name="business" size={16} color={sendAsCompany ? "#3b82f6" : "#6b7280"} />
                )}
                <Text style={[styles.sendAsCompanyText, sendAsCompany && styles.sendAsCompanyTextActive]}>
                  {sendAsCompany ? `Send as ${activeCompany?.name || 'Company'}` : 'Send as yourself'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={() => setShowAttachmentOptions(true)}
            disabled={sending || uploadingAttachment}
          >
            <Ionicons name="add-circle" size={28} color="#3b82f6" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTextChange}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            editable={!sending && !uploadingAttachment}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              ((!newMessage.trim() && !selectedAttachment && !replyingToMessage) || sending || uploadingAttachment) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedAttachment && !replyingToMessage) || sending || uploadingAttachment}
          >
            {(sending || uploadingAttachment) ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={(newMessage.trim() || selectedAttachment || replyingToMessage) && !sending && !uploadingAttachment ? "#fff" : "#9ca3af"}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Attachment Options Modal */}
      <Modal
        visible={showAttachmentOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentOptions(false)}
        >
          <View style={styles.attachmentOptionsContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.attachmentOptionsContent}>
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={handlePickImage}
              >
                <Ionicons name="images-outline" size={32} color="#3b82f6" />
                <Text style={styles.attachmentOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={32} color="#3b82f6" />
                <Text style={styles.attachmentOptionText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.attachmentOptionsCancel}
              onPress={() => setShowAttachmentOptions(false)}
            >
              <Text style={styles.attachmentOptionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp-style Action Sheet */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowActionSheet(false);
          setSelectedMessage(null);
        }}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowActionSheet(false);
            setSelectedMessage(null);
          }}
        >
          <View style={styles.actionSheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.actionSheetContent}>
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => {
                  if (selectedMessage) {
                    setEditText(selectedMessage.content || '');
                    setShowActionSheet(false);
                    setShowEditModal(true);
                  }
                }}
              >
                <Ionicons name="create-outline" size={24} color="#000" />
                <Text style={styles.actionSheetItemText}>Edit</Text>
              </TouchableOpacity>
              
              <View style={styles.actionSheetDivider} />
              
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => {
                  if (selectedMessage) {
                    handleDeleteMessage(selectedMessage);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <Text style={[styles.actionSheetItemText, styles.actionSheetItemTextDanger]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => {
                setShowActionSheet(false);
                setSelectedMessage(null);
              }}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Message Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedMessage(null);
          setEditText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput
              style={styles.modalInput}
              value={editText}
              onChangeText={setEditText}
              placeholder="Edit your message..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedMessage(null);
                  setEditText('');
                }}
                disabled={isEditing}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  (!editText.trim() || isEditing) && styles.modalButtonDisabled,
                ]}
                onPress={handleEditMessage}
                disabled={!editText.trim() || isEditing}
              >
                {isEditing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: semanticSpacing.buttonPadding,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: semanticSpacing.containerPadding,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  skeletonLoadingContainer: {
    padding: 16,
    paddingTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: semanticSpacing.sectionGapLarge,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: spacing.xxl,
    paddingVertical: semanticSpacing.containerPadding,
    borderRadius: 8,
    marginTop: semanticSpacing.buttonPadding,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: semanticSpacing.modalPadding,
    paddingVertical: semanticSpacing.containerPadding,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 10,
    marginBottom: 2,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#f1f3f5',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  senderSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6b7280',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  companyMessageBubble: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    backgroundColor: '#f0f4ff',
  },
  companyMessageBubbleOwn: {
    // When sending "as company", keep currentUserBubble background so white text remains readable
    borderRightWidth: 3,
    borderRightColor: '#6366f1',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  currentUserText: {
    color: '#fff',
    fontWeight: '400',
  },
  otherUserText: {
    color: '#1f2937',
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherUserTime: {
    color: '#6b7280',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: semanticSpacing.buttonPadding,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemMessageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: spacing.xs,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#f9fafb',
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2.67, // Keep 64px for empty state
    gap: semanticSpacing.containerPadding,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLoader: {
    paddingVertical: semanticSpacing.containerPaddingLarge,
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: semanticSpacing.containerPaddingLarge,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: semanticSpacing.containerPaddingLarge,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: spacing.sm,
    padding: semanticSpacing.containerPadding,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: semanticSpacing.containerPaddingLarge,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: semanticSpacing.containerPadding,
  },
  modalButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSave: {
    backgroundColor: '#3b82f6',
  },
  modalButtonSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  actionSheetContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: semanticSpacing.containerPaddingLarge,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#fff',
  },
  actionSheetItemDanger: {
    backgroundColor: '#fff',
  },
  actionSheetItemText: {
    fontSize: 18,
    color: '#000',
    marginLeft: semanticSpacing.containerPaddingLarge,
    fontWeight: '400',
  },
  actionSheetItemTextDanger: {
    color: '#ef4444',
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: spacing.xl,
  },
  actionSheetCancel: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 14,
  },
  actionSheetCancelText: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '600',
  },
  attachmentButton: {
    padding: spacing.xs,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachmentPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attachmentPreviewFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: semanticSpacing.buttonPadding,
  },
  attachmentPreviewFileName: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  attachmentRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  attachmentOptionsContainer: {
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  attachmentOptionsContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: semanticSpacing.containerPaddingLarge,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#fff',
    gap: semanticSpacing.containerPaddingLarge,
  },
  attachmentOptionText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '400',
  },
  attachmentOptionsCancel: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 14,
  },
  attachmentOptionsCancelText: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '600',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  messageFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  messageFileInfo: {
    flex: 1,
  },
  messageFileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  messageFileSize: {
    fontSize: 12,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  replyContextText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  replyContextTextCurrent: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  replyContextTextOther: {
    color: '#4b5563',
  },
  readReceipts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
    gap: 2,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
    gap: 4,
  },
  messageStatusIcon: {
    marginRight: 2,
  },
  replyInputContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  replyInputContextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: semanticSpacing.buttonPadding,
  },
  replyInputContextText: {
    flex: 1,
  },
  replyInputContextName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: spacing.xs / 2,
  },
  replyInputContextMessage: {
    fontSize: 12,
    color: '#6b7280',
  },
  replyInputContextClose: {
    padding: spacing.xs,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#6b7280',
  },
  typingDotDelay1: {
    // Note: animationDelay is not supported in React Native
    // Animation delays should be handled via Animated API if needed
  },
  typingDotDelay2: {
    // Note: animationDelay is not supported in React Native
    // Animation delays should be handled via Animated API if needed
  },
  typingText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  sendAsCompanyContainer: {
    paddingHorizontal: semanticSpacing.modalPadding,
    paddingVertical: spacing.sm,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sendAsCompanyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  sendAsCompanyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  companyToggleLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  sendAsCompanyText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  sendAsCompanyTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default ChatPage;

