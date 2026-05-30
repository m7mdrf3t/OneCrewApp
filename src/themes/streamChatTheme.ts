import { Platform } from 'react-native';
import { DeepPartial, Theme } from 'stream-chat-react-native';

export type StreamChatThemeOptions = {
  /** Home-indicator / safe-area padding below the composer when the keyboard is closed */
  bottomInset?: number;
};

export const streamChatTheme: DeepPartial<Theme> = {
  colors: {
    accent_blue: '#00A884',    // WhatsApp teal
    accent_green: '#00A884',   // WhatsApp teal
    accent_red: '#ef4444',
    white: '#ffffff',
    white_smoke: '#F0F2F5',    // WhatsApp input bar tint
    grey: '#E2E8F0',
    grey_whisper: '#F0F2F5',
    black: '#111B21',          // WhatsApp dark text
    grey_dark: '#8696A0',      // WhatsApp muted label — lighter for dark input bar
  },

  // Date separator pill ("Thursday", "Today", etc.)
  dateSeparator: {
    container: {
      marginVertical: 12,
    },
    line: {
      flex: 0,
      width: 0,
      height: 0,
    },
    text: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: '#8696A0',
      borderRadius: 20,
      overflow: 'hidden',
    },
    dateText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: '#8696A0',
      borderRadius: 20,
      overflow: 'hidden',
    },
  },

  // WhatsApp-style warm wallpaper background
  messageList: {
    container: {
      backgroundColor: '#ECE5DD',
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
      borderBottomColor: '#E2E8F0',
      backgroundColor: '#ffffff',
    },
    contentContainer: {
      paddingVertical: 2,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
    },
    date: {
      fontSize: 12,
      color: '#94A3B8',
    },
    unreadText: {
      fontSize: 12,
      fontWeight: '700',
    },
  },

  // Message bubbles — WhatsApp/Messenger style
  // borderRadiusL = outer corners, borderRadiusS = inner (tail-side) corners
  messageSimple: {
    avatarWrapper: {
      container: {
        marginBottom: 0,
        marginRight: 8,
      },
      spacer: {
        width: 48,   // avatar width (40) + marginRight (8)
        height: 40,
      },
    },
    container: {
      marginVertical: 4,
    },
    content: {
      container: {
        borderRadiusL: 18,
        borderRadiusS: 4,  // The small corner gives the WhatsApp "tail" effect
      },
      containerInner: {
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      // Own messages: WhatsApp mint green — dark text (#111B21) ensures readability
      senderMessageBackgroundColor: '#DCF8C6',
      // Other messages: white card on warm wallpaper
      receiverMessageBackgroundColor: '#FFFFFF',
      markdown: {
        text: {
          fontSize: 15,
          lineHeight: 22,
          color: '#111B21',  // Dark text — works on both white AND light-green bubbles
        },
      },
      metaContainer: {
        marginTop: 4,
      },
      metaText: {
        fontSize: 11,
        color: '#667781',  // WhatsApp muted teal-gray
      },
    },
  },

  // Input bar — clean pill shape (Messenger style)
  messageInput: {
    container: {
      backgroundColor: '#202C33',  // WhatsApp dark charcoal input bar
      borderTopWidth: 1,
      borderTopColor: '#1A2428',   // barely-there dark separator
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 0,  // controlled by getStreamChatTheme based on safe-area inset
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    // The text input field
    inputBox: {
      backgroundColor: '#FFFFFF',  // White pill input
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 15,
      color: '#111B21',
      minHeight: 40,
      maxHeight: 120,
    },
    inputBoxContainer: {
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
    },
    // Attach (+) button — no circle background, plain icon matching dark bar
    attachButton: {
      backgroundColor: 'transparent',
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      transform: [{ scale: 0.78 }],  // 32px SVG → ~25px visual
    },
    // Native attachment picker popup (image/camera circles above the + button)
    nativeAttachmentPicker: {
      buttonContainer: {
        backgroundColor: '#202C33',  // Match dark input bar — makes light #E2E8F0 icons visible
        width: 32,
        height: 32,
        borderRadius: 16,
      },
    },
    // SDK mic/audio recording button container
    micButtonContainer: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // SDK AudioRecordingButton — the big white circle mic shown when no text is typed
    audioRecordingButton: {
      container: {
        width: 32,
        height: 32,
        backgroundColor: 'transparent',  // No white circle on dark bar
        marginLeft: 4,
      },
      micIcon: {
        size: 24,
        fill: '#E2E8F0',  // Light gray — matches the attach + icon color on dark bar
      },
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

export const getStreamChatTheme = (
  options?: StreamChatThemeOptions,
): DeepPartial<Theme> => {
  const bottomInset = options?.bottomInset ?? 0;
  // Use exactly the safe-area inset with a small minimum so the pill
  // never sits flush against the bottom edge on devices with no home indicator.
  const composerBottomPadding = Math.max(bottomInset, 4);

  return {
    ...streamChatTheme,
    messageInput: {
      ...streamChatTheme.messageInput,
      container: {
        ...streamChatTheme.messageInput?.container,
        paddingBottom: composerBottomPadding,
      },
    },
  };
};
