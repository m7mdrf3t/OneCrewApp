import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProjectDashboardData } from '../types';
import { spacing, semanticSpacing } from '../constants/spacing';

interface CommunicationComponentProps {
  project: ProjectDashboardData;
  onSendMessage: (message: string) => void;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: string;
  type: 'text' | 'system';
}

const CommunicationComponent: React.FC<CommunicationComponentProps> = ({
  project,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Welcome to the ${project.project.title} project! Let's get started.`,
      sender: 'System',
      senderId: 'system',
      timestamp: new Date().toISOString(),
      type: 'system',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: 'You', // This would come from user context
      senderId: 'current_user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Call the parent handler
    onSendMessage(message.text);

    // Simulate typing indicator and response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      // Add a simulated response
      const responses = [
        "Thanks for the update!",
        "Got it, I'll work on that.",
        "Perfect timing!",
        "I'll be there.",
        "Sounds good to me.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'Team Member',
        senderId: 'team_member',
        timestamp: new Date().toISOString(),
        type: 'text',
      };
      
      setMessages(prev => [...prev, responseMessage]);
    }, 2000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = (message: Message) => {
    const isCurrentUser = message.senderId === 'current_user';
    const isSystem = message.type === 'system';

    if (isSystem) {
      return (
        <View key={message.id} style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{message.text}</Text>
          <Text style={styles.systemMessageTime}>{formatTime(message.timestamp)}</Text>
        </View>
      );
    }

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText,
          ]}>
            {message.text}
          </Text>
        </View>
        <View style={styles.messageInfo}>
          <Text style={styles.messageSender}>{message.sender}</Text>
          <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
        </View>
      </View>
    );
  };

  const getProjectMembers = () => {
    // Extract unique members from assignments
    const members = new Set<string>();
    project.assignments.forEach(assignment => {
      if (assignment.userName) members.add(assignment.userName);
    });
    return Array.from(members);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Project Chat</Text>
          <Text style={styles.subtitle}>
            {getProjectMembers().length} member{getProjectMembers().length !== 1 ? 's' : ''} online
          </Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Members List */}
      <View style={styles.membersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.membersList}>
            {getProjectMembers().map((member, index) => (
              <View key={index} style={styles.memberChip}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitials}>
                    {member.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{member}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(renderMessage)}
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>Team Member is typing...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? "#fff" : "#9ca3af"} 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputFooter}>
          <Text style={styles.characterCount}>
            {newMessage.length}/500
          </Text>
          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="attach" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="camera" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="mic" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    paddingHorizontal: semanticSpacing.modalPadding,
    paddingVertical: semanticSpacing.headerPaddingVertical,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: semanticSpacing.iconPaddingSmall,
  },
  moreButton: {
    padding: spacing.xs,
  },
  membersContainer: {
    paddingVertical: semanticSpacing.buttonPadding,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  membersList: {
    flexDirection: 'row',
    paddingHorizontal: semanticSpacing.modalPadding,
    gap: semanticSpacing.buttonPadding,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: semanticSpacing.buttonPadding,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: semanticSpacing.tightGap,
  },
  memberAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitials: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  memberName: {
    fontSize: 12,
    color: '#374151',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: semanticSpacing.modalPadding,
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
  messageContainer: {
    marginVertical: spacing.xs,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.buttonPadding,
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
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: semanticSpacing.buttonPadding,
  },
  messageSender: {
    fontSize: 10,
    color: '#6b7280',
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  typingIndicator: {
    alignItems: 'flex-start',
    marginVertical: spacing.xs,
  },
  typingBubble: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.buttonPadding,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: semanticSpacing.modalPadding,
    paddingVertical: semanticSpacing.headerPaddingVertical,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: semanticSpacing.buttonPadding,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: semanticSpacing.modalPadding,
    paddingVertical: semanticSpacing.buttonPadding,
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
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: semanticSpacing.buttonPadding,
  },
  characterCount: {
    fontSize: 10,
    color: '#9ca3af',
  },
  inputActions: {
    flexDirection: 'row',
    gap: semanticSpacing.containerPadding,
  },
  actionButton: {
    padding: spacing.xs,
  },
});

export default CommunicationComponent;
