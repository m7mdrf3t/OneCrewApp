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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { ChatPageProps, ChatMessage, ChatConversation } from '../types';
import supabaseService from '../services/SupabaseService';

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
    getConversationById,
    createConversation,
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
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine current user/company ID
  const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
  const currentUserType = currentProfileType === 'company' ? 'company' : 'user';

  // Load or create conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        if (conversationId) {
          // Load existing conversation
          const response = await getConversationById(conversationId);
          if (response.success && response.data) {
            setConversation(response.data);
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

          const createResponse = await createConversation({
            conversation_type: conversationType,
            participant_ids: participantIds,
          });

          if (createResponse.success && createResponse.data) {
            const newConversation = createResponse.data;
            setConversation(newConversation);
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
  }, [conversationId, participant, getConversationById, createConversation, currentProfileType, activeCompany]);

  // Subscribe to real-time messages when conversation is loaded
  useEffect(() => {
    if (!conversation || loading || !supabaseService.isInitialized()) {
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

    return () => {
      if (messageChannelIdRef.current) {
        console.log('🔌 Unsubscribing from chat messages');
        supabaseService.unsubscribe(messageChannelIdRef.current);
        messageChannelIdRef.current = null;
      }
    };
  }, [conversation?.id, loading]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await sendMessage(conversation.id, {
        content: messageText,
        message_type: 'text',
      });

      if (response.success) {
        // Real-time subscription will handle adding the message to the list
        // No need to manually add it here
        console.log('✅ Message sent, waiting for real-time update');
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
        activeOpacity={0.7}
      >
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {getParticipantAvatar() ? (
              <Image
                source={{ uri: getParticipantAvatar() || '' }}
                style={styles.messageAvatar}
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
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText,
          ]}>
            {item.content || 'Message'}
          </Text>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime,
          ]}>
            {formatTime(item.sent_at)}
            {item.edited_at && ' (edited)'}
          </Text>
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
            <Image source={{ uri: participantAvatar }} style={styles.headerAvatar} />
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
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Start the conversation!</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={newMessage.trim() && !sending ? "#fff" : "#9ca3af"}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

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
                style={[styles.actionSheetItem, styles.actionSheetItemDanger]}
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
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#9ca3af',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemMessageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 8,
  },
  actionSheetContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  actionSheetItemDanger: {
    backgroundColor: '#fff',
  },
  actionSheetItemText: {
    fontSize: 18,
    color: '#000',
    marginLeft: 16,
    fontWeight: '400',
  },
  actionSheetItemTextDanger: {
    color: '#ef4444',
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
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
});

export default ChatPage;

