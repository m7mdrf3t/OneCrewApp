import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { ChatPageProps, ChatMessage, ChatConversation } from '../types';
import supabaseService from '../services/SupabaseService';
import { spacing, semanticSpacing } from '../constants/spacing';
import MediaPickerService from '../services/MediaPickerService';

const ChatPage: React.FC<ChatPageProps> = ({
  conversationId,
  participant,
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
    uploadFile,
    user,
    currentProfileType,
    activeCompany,
  } = useApi();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const messageChannelIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<string | null>(null);
  const getConversationByIdRef = useRef(getConversationById);
  const createConversationRef = useRef(createConversation);
  
  // Keep refs updated
  useEffect(() => {
    getConversationByIdRef.current = getConversationById;
    createConversationRef.current = createConversation;
  }, [getConversationById, createConversation]);
  
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelIdRef = useRef<string | null>(null);
  const sendTypingStatusRef = useRef<((isTyping: boolean) => Promise<void>) | null>(null);
  const mediaPicker = MediaPickerService.getInstance();

  // Determine current user/company ID
  const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
  const currentUserType = currentProfileType === 'company' ? 'company' : 'user';

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
        console.log('🔄 Initializing conversation:', conversationKey);
        setLoading(true);
        setError(null);

        if (conversationId) {
          // Load existing conversation
          const response = await getConversationByIdRef.current(conversationId);
          if (response.success && response.data) {
            setConversation(response.data);
            hasInitializedRef.current = conversationKey;
            await loadMessages(conversationId, 1, false);
          } else {
            throw new Error(response.error || 'Failed to load conversation');
          }
        } else if (participant) {
          // Create new conversation
          const conversationType = participant.category === 'company'
            ? (currentProfileType === 'company' ? 'company_company' : 'user_company')
            : 'user_user';

          const participantIds = [participant.id];
          if (currentProfileType === 'company' && activeCompany) {
            // For company conversations, we need to handle differently
            // The API will handle adding the current user/company
          }

          const createResponse = await createConversationRef.current({
            conversation_type: conversationType,
            participant_ids: participantIds,
          });

          if (createResponse.success && createResponse.data) {
            const newConversation = createResponse.data;
            setConversation(newConversation);
            hasInitializedRef.current = conversationKey;
            await loadMessages(newConversation.id, 1, false);
          } else {
            throw new Error(createResponse.error || 'Failed to create conversation');
          }
        } else {
          throw new Error('No conversation ID or participant provided');
        }
      } catch (err: any) {
        console.error('Failed to initialize conversation:', err);
        setError(err.message || 'Failed to load conversation');
        Alert.alert('Error', err.message || 'Failed to load conversation');
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
      }
    };
  }, [conversationId, participant?.id, currentProfileType, activeCompany?.id]); // Removed function dependencies

  // Mark messages as read when conversation is viewed
  const hasMarkedAsReadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversation?.id || loading) {
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
      } catch (error) {
        console.error('❌ Failed to mark conversation as read:', error);
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
  }, [conversation?.id, loading]);

  // Subscribe to real-time messages when conversation is loaded
  useEffect(() => {
    if (!conversation?.id || !supabaseService.isInitialized()) {
      return;
    }

    console.log('💬 Setting up real-time subscription for conversation:', conversation.id);

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
        
        // Check if message already exists (avoid duplicates)
        setMessages(prev => {
          const exists = prev.find(m => m.id === newMessage.id);
          if (exists) {
            return prev;
          }
          
          // Add new message to the end
          const updated = [...prev, newMessage];
          
          // Auto-scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
          
          return updated;
        });
        
        // Mark the message as read if it's from another user and we're viewing the conversation
        if (newMessage.sender_id !== currentUserId && newMessage.sender_type !== currentUserType) {
          // Mark conversation as read when receiving a new message
          readMessage(conversation.id).catch(err => {
            console.error('❌ Failed to mark conversation as read:', err);
          });
        }
      },
      (updatedMessage: ChatMessage) => {
        console.log('💬 Message updated via real-time:', updatedMessage);
        
        // Update the message in the list
        setMessages(prev =>
          prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
        );
      },
      (deletedMessage: any) => {
        console.log('💬 Message deleted via real-time:', deletedMessage);
        
        // Handle both old (deleted message object) and new (just ID) formats
        const messageId = deletedMessage.id || deletedMessage;
        
        // Remove the message from the list
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
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
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing status when leaving
      if (sendTypingStatusRef.current) {
        sendTypingStatusRef.current(false);
      }
    };
  }, [conversation?.id, currentUserId]);

  const loadMessages = useCallback(async (convId: string, pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      }

      const response = await getMessages(convId, { page: pageNum, limit: 50 });
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const pagination = response.data.pagination;
        
        if (Array.isArray(data)) {
          // Reverse messages so newest are at bottom
          const sortedMessages = [...data].reverse();
          
          if (append) {
            setMessages(prev => [...sortedMessages, ...prev]);
          } else {
            setMessages(sortedMessages);
            // Scroll to bottom after initial load
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
          
          setHasMore(pagination ? pageNum < pagination.totalPages : false);
        }
      } else {
        throw new Error(response.error || 'Failed to load messages');
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      if (!append) {
        setError(err.message || 'Failed to load messages');
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      }
    }
  }, [getMessages]);

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
      Alert.alert('Error', err.message || 'Failed to send message');
      // Restore message text on error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && conversation) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(conversation.id, nextPage, true);
    }
  }, [loadingMore, hasMore, conversation, page, loadMessages]);

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
                setMessages(prev => prev.filter(msg => msg.id !== message.id));
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
    if (message.sender_type === 'user') {
      return message.sender_id === user?.id;
    } else if (message.sender_type === 'company') {
      return currentProfileType === 'company' && message.sender_id === activeCompany?.id;
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
            {getParticipantAvatar() ? (
              <Image
                source={{ uri: getParticipantAvatar() || '' }}
                style={styles.messageAvatar as ImageStyle}
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
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>{getSenderName(item)}</Text>
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
              resizeMode="cover"
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
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
                    loadMessages(response.data.id, 1, false);
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
            <Image source={{ uri: participantAvatar }} style={styles.headerAvatar as ImageStyle} />
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

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && messages.length === 0 ? (
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
            {loadingMore && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#3b82f6" />
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
              <Image source={{ uri: selectedAttachment.uri }} style={styles.attachmentPreviewImage as ImageStyle} />
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
    marginBottom: 4,
    letterSpacing: 0.2,
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
    alignItems: 'center',
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
});

export default ChatPage;

