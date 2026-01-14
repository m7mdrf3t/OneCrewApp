/**
 * StreamChat Theme Configuration
 * 
 * Custom theme for StreamChat UI components to match OneCrew app design
 */

import { DefaultStreamChatGenerics, Theme } from 'stream-chat-react-native';

export const streamChatTheme: Theme<DefaultStreamChatGenerics> = {
  colors: {
    // Primary colors
    accent_blue: '#3b82f6', // Blue accent (matches app primary)
    accent_green: '#10b981', // Green for success states
    accent_red: '#ef4444', // Red for errors/destructive actions
    
    // Background colors
    white: '#ffffff',
    white_smoke: '#f3f4f6',
    grey: '#e5e7eb',
    grey_whisper: '#f9fafb',
    
    // Text colors
    black: '#000000',
    grey_dark: '#374151',
    grey: '#6b7280',
    grey_whisper: '#9ca3af',
    
    // Message bubble colors
    messageInput: {
      container: '#ffffff',
      inputBox: '#f3f4f6',
      inputBoxBorder: '#e5e7eb',
      sendButton: '#3b82f6',
      sendButtonDisabled: '#9ca3af',
    },
    
    // Channel list colors
    channelPreview: {
      active: '#3b82f6',
      activeBackground: '#eff6ff',
      container: '#ffffff',
      date: '#9ca3af',
      lastMessage: '#6b7280',
      title: '#000000',
      unread: '#ef4444',
      unreadBackground: '#fef2f2',
    },
    
    // Message colors
    messageSimple: {
      content: {
        container: '#ffffff',
        markdown: {
          text: '#000000',
          link: '#3b82f6',
        },
      },
      status: {
        container: '#ffffff',
        read: '#3b82f6',
        received: '#9ca3af',
      },
    },
    
    // Own message bubble
    ownMessage: {
      bubble: {
        container: '#3b82f6',
        leftContainer: '#ffffff',
        rightContainer: '#3b82f6',
        text: '#ffffff',
      },
    },
    
    // Other user message bubble
    message: {
      bubble: {
        container: '#f3f4f6',
        leftContainer: '#f3f4f6',
        rightContainer: '#ffffff',
        text: '#000000',
      },
    },
  },
  
  // Typography
  messageSimple: {
    content: {
      markdown: {
        text: {
          fontSize: 14,
          fontWeight: '400',
          color: '#000000',
        },
      },
    },
    status: {
      container: {
        fontSize: 11,
      },
    },
  },
  
  channelPreview: {
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
    },
    lastMessage: {
      fontSize: 14,
      color: '#6b7280',
    },
    date: {
      fontSize: 12,
      color: '#9ca3af',
    },
  },
  
  // Message input
  messageInput: {
    container: {
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inputBox: {
      backgroundColor: '#f3f4f6',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: '#000000',
    },
    sendButton: {
      backgroundColor: '#3b82f6',
      borderRadius: 20,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
  },
  
  // Message list
  messageList: {
    container: {
      backgroundColor: '#ffffff',
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  },
  
  // Message bubble
  messageSimple: {
    container: {
      marginVertical: 4,
    },
    bubble: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      maxWidth: '75%',
    },
  },
  
  // Avatar
  avatar: {
    container: {
      borderRadius: 20,
      width: 40,
      height: 40,
    },
    image: {
      borderRadius: 20,
    },
  },
  
  // Spacing (matching app spacing constants)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  
  // Border radius
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

/**
 * Get custom theme with overrides
 */
export const getStreamChatTheme = (): Theme<DefaultStreamChatGenerics> => {
  return streamChatTheme;
};


