/**
 * StreamChat Theme Configuration
 * 
 * Custom theme for StreamChat UI components to match OneCrew app design
 */

import { Platform } from 'react-native';
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: 16, // Extra padding for better spacing
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 3, // Android shadow
    },
    inputBox: {
      backgroundColor: '#f3f4f6',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: '#000000',
      minHeight: 48,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    inputBoxFocused: {
      borderColor: '#3b82f6',
      backgroundColor: '#ffffff',
    },
    sendButton: {
      // Native messenger style - transparent background, icon only
      backgroundColor: 'transparent',
      width: 44, // Increased for larger touch target
      height: 44,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
      // No shadows for native look
      shadowOpacity: 0,
      elevation: 0,
      // Platform-specific adjustments
      ...(Platform.OS === 'android' && {
        width: 48, // Android Material Design: 48dp for comfortable touch target
        height: 48,
        minWidth: 48,
        minHeight: 48,
        borderRadius: 24, // Circular for Android ripple effect
      }),
    },
    sendButtonDisabled: {
      backgroundColor: 'transparent',
      shadowOpacity: 0,
      elevation: 0,
    },
    sendButtonSending: {
      backgroundColor: '#60a5fa',
      opacity: 0.8,
    },
    sendButtonContainer: {
      minWidth: 48,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
  },
  
  // Message reactions - INCREASED TOUCH TARGETS AND SPACING
  messageReactions: {
    container: {
      padding: 10, // Increased from 8 for more space
    },
    reactionButton: {
      // Much larger touch targets for easier tapping
      minWidth: Platform.OS === 'android' ? 64 : 60, // Increased: Android: 64dp, iOS: 60px
      minHeight: Platform.OS === 'android' ? 64 : 60,
      padding: 16, // Increased from 14
      borderRadius: 30, // Increased from 28 for better touch area
      justifyContent: 'center',
      alignItems: 'center',
      // Increased spacing between buttons for easier selection
      marginHorizontal: 8, // Increased from 6
      marginVertical: 8, // Increased from 6
    },
    reactionBubble: {
      minWidth: Platform.OS === 'android' ? 64 : 60, // Match button size
      minHeight: Platform.OS === 'android' ? 64 : 60,
      paddingHorizontal: 20, // Increased from 18
      paddingVertical: 14, // Increased from 12
      borderRadius: 24, // Increased from 22
      // Add spacing between reaction bubbles
      marginHorizontal: 6, // Increased from 4
      marginVertical: 6, // Increased from 4
    },
  },
  
  // Reaction picker (the menu that appears when you tap "react")
  reactionPicker: {
    container: {
      padding: 16, // Increased padding for the picker container
      gap: 12, // Large space between reaction items
    },
    item: {
      // Much larger touch targets for reaction picker items
      minWidth: Platform.OS === 'android' ? 72 : 68, // Even larger: Android: 72dp, iOS: 68px
      minHeight: Platform.OS === 'android' ? 72 : 68,
      width: Platform.OS === 'android' ? 72 : 68,
      height: Platform.OS === 'android' ? 72 : 68,
      padding: 18, // Increased padding
      borderRadius: 36, // Larger border radius
      justifyContent: 'center',
      alignItems: 'center',
      // Very large spacing between items for easier selection
      marginHorizontal: 12, // Increased from 10 - Large spacing between reaction icons
      marginVertical: 10, // Increased from 8
    },
    icon: {
      width: Platform.OS === 'android' ? 44 : 40, // Even larger icons
      height: Platform.OS === 'android' ? 44 : 40,
    },
  },
  
  // Message overlay (the menu that appears on long press)
  overlay: {
    container: {
      elevation: 8, // Android shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
  },
  
  // Message actions list (menu items)
  messageActions: {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: 14,
      overflow: 'hidden',
      paddingVertical: 4,
    },
    item: {
      minHeight: Platform.OS === 'android' ? 56 : 44, // Larger touch targets
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    itemText: {
      fontSize: 16,
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


