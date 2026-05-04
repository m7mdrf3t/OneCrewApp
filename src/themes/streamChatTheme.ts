import { Platform } from 'react-native';
import { DeepPartial, Theme } from 'stream-chat-react-native';

export const streamChatTheme: DeepPartial<Theme> = {
  colors: {
    accent_blue: '#3b82f6',
    accent_green: '#10b981',
    accent_red: '#ef4444',
    white: '#ffffff',
    white_smoke: '#f0f2f5',
    grey: '#e5e7eb',
    grey_whisper: '#f0f2f5',
    black: '#111827',
    grey_dark: '#374151',
  },

  // Messenger-style light gray background for the chat area
  messageList: {
    container: {
      backgroundColor: '#f0f2f5',
    },
    contentContainer: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
  },

  // Conversations list
  channelPreview: {
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
      backgroundColor: '#ffffff',
    },
    contentContainer: {
      paddingVertical: 2,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
    },
    date: {
      fontSize: 12,
      color: '#9ca3af',
    },
    unreadText: {
      fontSize: 12,
      fontWeight: '700',
    },
  },

  // Message bubbles — WhatsApp/Messenger style
  // borderRadiusL = outer corners, borderRadiusS = inner (tail-side) corners
  messageSimple: {
    container: {
      marginVertical: 2,
    },
    content: {
      container: {
        borderRadiusL: 18,
        borderRadiusS: 4,  // The small corner gives the WhatsApp "tail" effect
      },
      containerInner: {
        borderRadius: 18,
      },
      // Own messages: blue (Messenger blue)
      senderMessageBackgroundColor: '#3b82f6',
      // Other messages: white card on the gray background
      receiverMessageBackgroundColor: '#ffffff',
      markdown: {
        text: {
          fontSize: 15,
          lineHeight: 20,
        },
      },
      metaText: {
        fontSize: 11,
        color: '#9ca3af',
      },
    },
  },

  // Input bar — clean pill shape (Messenger style)
  messageInput: {
    container: {
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e9e9e9',
      paddingHorizontal: 8,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    // The text input field
    inputBox: {
      backgroundColor: '#f0f2f5',
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 15,
      color: '#111827',
      minHeight: 44,
      maxHeight: 120,
    },
    inputBoxContainer: {
      borderRadius: 22,
      backgroundColor: '#f0f2f5',
    },
    sendButton: {
      backgroundColor: 'transparent',
      width: Platform.OS === 'android' ? 48 : 44,
      height: Platform.OS === 'android' ? 48 : 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    sendButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
  },

  // Reaction picker (the emoji row on long-press)
  messageMenu: {
    reactionPicker: {
      container: {
        paddingHorizontal: 8,
        paddingVertical: 12,
      },
      reactionIconSize: Platform.OS === 'android' ? 36 : 32,
    },
    actionList: {
      container: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        overflow: 'hidden',
      },
      contentContainer: {
        paddingVertical: 4,
      },
    },
    actionListItem: {
      container: {
        minHeight: Platform.OS === 'android' ? 56 : 44,
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      title: {
        fontSize: 16,
      },
    },
  },

  // Audio message player
  audioAttachment: {
    container: {
      borderRadius: 12,
      borderWidth: 1,
      minHeight: 56,
      maxWidth: '100%',
    },
    leftContainer: {
      marginRight: 8,
    },
    playPauseButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: 22,
      padding: 4,
    },
    progressControlContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      minHeight: 24,
    },
    progressDurationText: {
      fontSize: 12,
      marginRight: 8,
    },
    rightContainer: {
      marginLeft: 8,
    },
    speedChangeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    speedChangeButtonText: {
      fontSize: 12,
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
};

export const getStreamChatTheme = (): DeepPartial<Theme> => streamChatTheme;
