/**
 * Chat Page - StreamChat UI Components
 * 
 * Uses StreamChat's built-in Channel, MessageList, and MessageInput components.
 * This replaces the custom FlashList implementation with StreamChat's optimized UI.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  LogBox,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { 
  Channel, 
  MessageList, 
  MessageInput,
  useChatContext,
  Thread,
  useMessageInputContext,
  useMessageContext,
  MessageMenu,
  ReactionPicker,
  MessageOverlay,
  MessageActionList,
  ChannelHeader,
  useChannelStateContext,
} from 'stream-chat-react-native';
import {
  LikeReaction,
  LoveReaction,
  HahaReaction,
  WowReaction,
  SadReaction,
  CareReaction,
  AngryReaction,
} from '../components/ReactionIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApi } from '../contexts/ApiContext';
import { ChatPageProps } from '../types';
import { RootStackScreenProps, RootStackParamList } from '../navigation/types';
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
  // Suppress key warning from StreamChat's MessageActionList internal implementation
  // This is a known issue in stream-chat-react-native library (v8.12.0)
  // The warning comes from MessageActionList's internal ScrollView rendering
  useEffect(() => {
    LogBox.ignoreLogs([
      /Each child in a list should have a unique "key" prop/,
      /Check the render method of `ScrollView`/,
    ]);
  }, []);

  const route = useRoute<RootStackScreenProps<'chat'>['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  // Ref to store latest header data - avoids closure issues
  // Must be defined before useLayoutEffect that uses it
  const headerDataRef = useRef<{
    userName: string;
    userImage: string | null;
  }>({
    userName: 'Chat',
    userImage: null,
  });

  // Track when channel members are loaded
  const [channelMembersLoaded, setChannelMembersLoaded] = useState(false);

  // Watch for channel state changes to detect when members are populated
  useEffect(() => {
    if (!channel) {
      setChannelMembersLoaded(false);
      return;
    }

    // Check if members are already loaded
    const checkMembers = () => {
      const members = channel?.state?.members || {};
      const memberCount = Object.keys(members).length;
      
      if (memberCount > 0) {
        setChannelMembersLoaded(true);
        if (__DEV__) {
          console.log('✅ [ChatPage] Channel members loaded:', memberCount, 'members');
        }
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkMembers()) {
      return; // Members already loaded, no need to set up listener
    }

    // Listen for channel state changes
    const handleStateChange = () => {
      if (checkMembers()) {
        // Force header update by triggering a state change
        // The useLayoutEffect will re-run when channelMembersLoaded changes
      }
    };

    // Also listen for member updates specifically
    const handleMemberUpdated = () => {
      if (checkMembers()) {
        if (__DEV__) {
          console.log('✅ [ChatPage] Member updated, members now available');
        }
      }
    };

    channel.on('state.changed', handleStateChange);
    channel.on('member.added', handleMemberUpdated);
    channel.on('member.updated', handleMemberUpdated);

    return () => {
      channel.off('state.changed', handleStateChange);
      channel.off('member.added', handleMemberUpdated);
      channel.off('member.updated', handleMemberUpdated);
    };
  }, [channel]);

  // Update navigation header with participant info dynamically
  // Try to get from participant prop first, then from channel after it loads
  useLayoutEffect(() => {
    // Helper function to extract user info
    const getUserInfo = () => {
      // Method 1: Try participant prop
      // Participant might be nested (participant.user) or direct (participant is the user)
      let participantUser = participant?.user || participant;
      let userName = participantUser?.name || participantUser?.id || participant?.user_id;
      
      // Try all possible image fields - check both nested and direct
      let userImage = 
        participantUser?.image || 
        participantUser?.image_url || 
        participantUser?.imageUrl ||  // camelCase variant
        participantUser?.avatar || 
        participantUser?.avatar_url ||
        participantUser?.avatarUrl ||  // camelCase variant
        participantUser?.profile_image ||
        participantUser?.profile_image_url ||
        participantUser?.profileImage ||  // camelCase variant
        participantUser?.profileImageUrl ||  // camelCase variant
        participantUser?.photo_url ||
        participantUser?.photoUrl ||
        participantUser?.logo_url ||
        participantUser?.logoUrl;
      
      // Method 2: If channel is loaded and watched, try to get from channel members
      if ((!userName || !userImage) && channel && client && channel.state?.watched) {
        try {
          const currentUserId = client?.userID;
          const members = channel?.state?.members || {};
          
          const otherMember = Object.values(members).find(
            (member: any) => member.user?.id !== currentUserId
          );
          
          if (otherMember?.user) {
            const channelUser = otherMember.user;
            if (!userName) {
              userName = channelUser.name || channelUser.id;
            }
            if (!userImage) {
              // Try all possible image fields from channel user
              userImage = channelUser.image || 
                         channelUser.image_url || 
                         channelUser.imageUrl ||
                         channelUser.avatar ||
                         channelUser.avatar_url ||
                         channelUser.avatarUrl ||
                         channelUser.profile_image ||
                         channelUser.profile_image_url ||
                         channelUser.profileImage ||
                         channelUser.profileImageUrl ||
                         channelUser.photo_url ||
                         channelUser.photoUrl ||
                         channelUser.logo_url ||
                         channelUser.logoUrl;
            }
            if (!participantUser) {
              participantUser = channelUser;
            }
          }
        } catch (error) {
          // Channel context not available yet
          if (__DEV__) {
            console.warn('⚠️ [ChatPage] Error getting user from channel:', error);
          }
        }
      }
      
      // Method 3: Try channel.data if available (fallback)
      if ((!userName || !userImage) && channel?.data) {
        try {
          const channelData = channel.data;
          
          // Check if channel.data has user info
          if (channelData.user) {
            const dataUser = channelData.user;
            if (!userName) {
              userName = dataUser.name || dataUser.id;
            }
            if (!userImage) {
              userImage = dataUser.image || 
                         dataUser.image_url || 
                         dataUser.imageUrl ||
                         dataUser.avatar ||
                         dataUser.avatar_url ||
                         dataUser.avatarUrl;
            }
          }
          
          // Also check channel.data.members array
          if ((!userName || !userImage) && Array.isArray(channelData.members)) {
            const currentUserId = client?.userID;
            const otherMember = channelData.members.find(
              (member: any) => member.user_id !== currentUserId && member.user
            );
            
            if (otherMember?.user) {
              const memberUser = otherMember.user;
              if (!userName) {
                userName = memberUser.name || memberUser.id;
              }
              if (!userImage) {
                userImage = memberUser.image || 
                           memberUser.image_url || 
                           memberUser.imageUrl ||
                           memberUser.avatar ||
                           memberUser.avatar_url ||
                           memberUser.avatarUrl;
              }
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('⚠️ [ChatPage] Error getting user from channel.data:', error);
          }
        }
      }
      
      return {
        userName: userName || 'Chat',
        userImage,
        participantUser,
      };
    };
    
    const { userName, userImage, participantUser } = getUserInfo();
    
    // Update ref with latest values - this ensures headerTitle always reads current data
    // Only update if we found new data - preserve existing values to prevent resetting to defaults
    // This prevents the avatar from disappearing when the effect re-runs before channel members load
    const newUserName = (userName && userName !== 'Chat') ? userName : (headerDataRef.current.userName || 'Chat');
    const newUserImage = userImage ? userImage : (headerDataRef.current.userImage || null);
    
    // Only update ref if we have meaningful changes to prevent unnecessary re-renders
    if (newUserName !== headerDataRef.current.userName || newUserImage !== headerDataRef.current.userImage) {
      headerDataRef.current = {
        userName: newUserName,
        userImage: newUserImage,
      };
      
      if (__DEV__) {
        console.log('🔄 [ChatPage] Header ref updated:', {
          userName: newUserName,
          hasUserImage: !!newUserImage,
          userImage: newUserImage,
        });
      }
    }
    
    if (__DEV__) {
      console.log('🔍 [ChatPage] Updating header dynamically:', {
        hasParticipant: !!participant,
        participantType: typeof participant,
        participantKeys: participant ? Object.keys(participant) : [],
        hasParticipantUser: !!participantUser,
        participantUserType: typeof participantUser,
        participantUserKeys: participantUser ? Object.keys(participantUser) : [],
        hasChannel: !!channel,
        hasClient: !!client,
        channelId: channel?.id,
        channelWatched: channel?.state?.watched,
        channelMembersLoaded,
        channelMembersCount: channel?.state?.members ? Object.keys(channel.state.members).length : 0,
        channelDataKeys: channel?.data ? Object.keys(channel.data) : [],
        userName: headerDataRef.current.userName,
        hasUserImage: !!headerDataRef.current.userImage,
        userImage: headerDataRef.current.userImage,
        // Log all image fields to debug
        imageFields: participantUser ? {
          image: participantUser?.image,
          image_url: participantUser?.image_url,
          imageUrl: participantUser?.imageUrl,
          avatar: participantUser?.avatar,
          avatar_url: participantUser?.avatar_url,
          avatarUrl: participantUser?.avatarUrl,
          profile_image: participantUser?.profile_image,
          profileImage: participantUser?.profileImage,
        } : {},
      });
    }
    
    // Force navigation to update header by setting options
    navigation.setOptions({
      headerTitle: () => {
        // Always read from ref - ensures we get latest values even if component hasn't re-rendered
        const currentUserName = headerDataRef.current.userName;
        const currentUserImage = headerDataRef.current.userImage;
        
        const headerStyles = StyleSheet.create({
          headerContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'center',
          },
          headerAvatar: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#e5e7eb',
            overflow: 'hidden', // Critical for Android border radius clipping
          },
          headerAvatarPlaceholder: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#3b82f6',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden', // For consistency
          },
          headerAvatarText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
          },
          headerTitleText: {
            fontSize: 18,
            fontWeight: '600',
            color: '#000',
          },
        });
        
        return (
          <View style={headerStyles.headerContent}>
            {currentUserImage ? (
              <View style={headerStyles.headerAvatar}>
                <Image
                  source={{ uri: currentUserImage }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  contentFit="cover"
                  transition={150}
                  onError={(error) => {
                    if (__DEV__) {
                      console.warn('⚠️ [ChatPage] Failed to load avatar image:', {
                        uri: currentUserImage,
                        error,
                      });
                    }
                  }}
                  onLoad={() => {
                    if (__DEV__) {
                      console.log('✅ [ChatPage] Avatar image loaded successfully:', currentUserImage);
                    }
                  }}
                />
              </View>
            ) : (
              <View style={headerStyles.headerAvatarPlaceholder}>
                <Text style={headerStyles.headerAvatarText}>
                  {currentUserName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={headerStyles.headerTitleText} numberOfLines={1}>
              {currentUserName}
            </Text>
          </View>
        );
      },
    });
  }, [participant, channel, client, navigation, channelMembersLoaded]);

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

  // Native-style send button - use StreamChat's default but with custom styling
  // This approach is more reliable as it uses StreamChat's built-in logic
  const NativeSendButton = (props: any) => {
    const messageInput = useMessageInputContext();
    // StreamChat passes: sendMessage function, disabled boolean, text string
    const { sendMessage: propsSendMessage, disabled, text } = props;
    
    // Trust StreamChat's disabled prop - it already checks for text
    const isEnabled = !disabled;
    const iconColor = isEnabled ? '#3b82f6' : '#9ca3af';
    
    // Get sendMessage from props first, fallback to context
    const sendMessageFn = propsSendMessage || messageInput?.sendMessage;
    
    const handlePress = async () => {
      if (disabled) {
        console.warn('⚠️ [NativeSendButton] Button is disabled');
        return;
      }
      
      if (!sendMessageFn) {
        console.error('❌ [NativeSendButton] No sendMessage function available:', {
          hasPropsSendMessage: !!propsSendMessage,
          hasContextSendMessage: !!messageInput?.sendMessage,
          propsKeys: Object.keys(props),
        });
        return;
      }
      
      try {
        console.log('💬 [NativeSendButton] Calling sendMessage...');
        // Call the sendMessage function
        if (typeof sendMessageFn === 'function') {
          await sendMessageFn();
          console.log('✅ [NativeSendButton] sendMessage called successfully');
        } else {
          console.error('❌ [NativeSendButton] sendMessage is not a function:', typeof sendMessageFn);
        }
      } catch (err: any) {
        console.error('❌ [ChatPage] Failed to send message:', err);
      }
    };

    // Platform-specific icon size (Android Material Design prefers slightly larger)
    const iconSize = Platform.OS === 'android' ? 24 : 22;

    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={styles.nativeSendButton}
        // Larger hitSlop for easier tapping
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.6}
        // Android: Enable ripple effect for Material Design
        {...(Platform.OS === 'android' && {
          android_ripple: {
            color: 'rgba(59, 130, 246, 0.2)', // Blue ripple when enabled
            borderless: false,
            radius: 24,
          },
        })}
      >
        <Ionicons
          name="send"
          size={iconSize}
          color={iconColor}
        />
      </TouchableOpacity>
    );
  };

  // Custom reaction options with SVG icons - larger size for easier tapping
  const customReactionOptions = [
    {
      type: 'like',
      Icon: () => <LikeReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
    {
      type: 'love',
      Icon: () => <LoveReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
    {
      type: 'haha',
      Icon: () => <HahaReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
    {
      type: 'wow',
      Icon: () => <WowReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
    {
      type: 'sad',
      Icon: () => <SadReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
    {
      type: 'care',
      Icon: () => <CareReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
    {
      type: 'angry',
      Icon: () => <AngryReaction size={Platform.OS === 'android' ? 44 : 40} />,
    },
  ];

  // Get screen dimensions for menu height
  const { height: screenHeight } = Dimensions.get('window');
  const MAX_MENU_HEIGHT = Math.round(screenHeight * 0.5);

  // Custom ReactionPicker with larger touch targets and spacing
  const CustomReactionPicker = (props: any) => {
    return (
      <View
        style={{
          paddingHorizontal: 16, // Increased from 12
          paddingTop: 16, // Increased from 12
          paddingBottom: 12, // Increased from 8 - Extra space so it doesn't touch the menu
          // Add gap between reaction items
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12, // Large gap between reaction icons
        }}
      >
        <ReactionPicker
          {...props}
          supportedReactions={customReactionOptions}
        />
      </View>
    );
  };

  // Memoized message actions array - each action string serves as a unique key for React's list rendering
  // This ensures stable keys and prevents the "missing key" warning
  const messageActionsArray = useMemo(() => [
    'react',           // Show reactions
    'reply',           // Regular reply (not thread)
    'copyMessage',
    'markAsUnread',
    'flagMessage',
    'pinMessage',
    'editMessage',
    'deleteMessage',
  ], []);

  // Custom ChannelHeader that shows participant's name and avatar
  // This component is rendered inside Channel context, so hooks should work
  const CustomChannelHeader = React.memo(() => {
    // Try to get from channel context first (most reliable)
    let channelContext;
    let chatContext;
    let channelFromContext;
    let clientFromContext;
    
    try {
      channelContext = useChannelStateContext();
      chatContext = useChatContext();
      channelFromContext = channelContext?.channel;
      clientFromContext = chatContext?.client;
    } catch (error) {
      // Hooks not available in this context - will use participant prop
      if (__DEV__) {
        console.log('⚠️ [CustomChannelHeader] Context not available, using participant prop');
      }
    }
    
    // Get user from channel members or participant prop
    let otherUser = null;
    let userName = 'Chat';
    let userImage = null;
    
    // Method 1: Try to get from channel context (most reliable)
    if (channelFromContext && clientFromContext) {
      const currentUserId = clientFromContext?.userID;
      const members = channelFromContext?.state?.members || {};
      
      const otherMember = Object.values(members).find(
        (member: any) => member.user?.id !== currentUserId
      );
      
      if (otherMember?.user) {
        otherUser = otherMember.user;
      }
    }
    
    // Method 2: Fallback to participant prop
    if (!otherUser && participant?.user) {
      otherUser = participant.user;
    }
    
    // Get user name and image
    if (otherUser) {
      userName = otherUser.name || otherUser.id || participant?.user_id || 'Chat';
      userImage = otherUser.image || otherUser.image_url;
    } else if (participant?.user_id) {
      // Last resort: use participant ID
      userName = participant.user_id;
    }
    
    if (__DEV__) {
      console.log('🔍 [CustomChannelHeader] Rendering:', {
        hasChannel: !!channelFromContext,
        hasClient: !!clientFromContext,
        hasParticipant: !!participant,
        hasOtherUser: !!otherUser,
        userName,
        hasUserImage: !!userImage,
      });
    }
    
    return (
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          {userImage ? (
            <Image
              source={{ uri: userImage }}
              style={styles.headerAvatar}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {userName}
          </Text>
        </View>
      </View>
    );
  });

  // Custom MessageActionListItem that handles copyMessage using useMessageContext
  // This component can use hooks because it's rendered within StreamChat's message context
  const CustomMessageActionListItem = (itemProps: any) => {
    // Use StreamChat's hook to get the message from context
    let messageContext;
    try {
      messageContext = useMessageContext();
    } catch (error) {
      messageContext = null;
    }
    
    const message = messageContext?.message;
    const messageText = message?.text || '';
    
    // Check if this is the copyMessage action
    const isCopyAction = itemProps?.action && (
      itemProps.action.title === 'Copy Message' ||
      itemProps.action.name === 'copyMessage' ||
      JSON.stringify(itemProps.action || {}).toLowerCase().includes('copy')
    );
    
    // If it's copyMessage, override the onPress handler
    if (isCopyAction) {
      const customProps = {
        ...itemProps,
        onPress: async () => {
          try {
            if (__DEV__) {
              console.log('🔍 [CustomMessageActionListItem] Copy action pressed, messageText:', messageText || 'NOT FOUND');
            }
            
            if (messageText) {
              await Clipboard.setStringAsync(messageText);
              if (Platform.OS === 'android') {
                Alert.alert('Copied', 'Message copied to clipboard');
              }
              if (itemProps?.dismissOverlay) {
                itemProps.dismissOverlay();
              }
            } else {
              console.warn('⚠️ [CustomMessageActionListItem] No message text to copy');
              Alert.alert('Error', 'No message text to copy');
            }
          } catch (error) {
            console.error('❌ [CustomMessageActionListItem] Failed to copy:', error);
            Alert.alert('Error', 'Failed to copy message to clipboard');
          }
        },
      };
      
      // Use default MessageActionListItem with our custom onPress
      const DefaultItem = itemProps.MessageActionListItem;
      if (DefaultItem) {
        return <DefaultItem {...customProps} />;
      }
    }
    
    // For non-copy actions, use default
    const DefaultItem = itemProps.MessageActionListItem;
    if (DefaultItem) {
      return <DefaultItem {...itemProps} />;
    }
    return null;
  };

  // Custom MessageActionList that intercepts copyMessage and uses useMessageContext
  // This component can use hooks because it's rendered within StreamChat's message context
  const CustomMessageActionList = (props: any) => {
    // Use StreamChat's hook to get the message from context
    // This is the key - useMessageContext gives us access to the current message
    let messageContext;
    try {
      messageContext = useMessageContext();
    } catch (error) {
      // Context not available - fallback to default
      messageContext = null;
    }
    
    const message = messageContext?.message;
    const messageText = message?.text || '';
    
    if (__DEV__) {
      console.log('🔍 [CustomMessageActionList] Message context:', {
        hasMessage: !!message,
        messageText: messageText || 'NOT FOUND',
        messageId: message?.id,
        propsKeys: Object.keys(props || {}),
        hasActions: !!props?.actions,
        actionsLength: props?.actions?.length || 0,
      });
    }
    
    // StreamChat's MessageActionList receives actions through props
    // We need to intercept and modify the copyMessage action
    // The actions come from the messageActions callback we defined in Channel
    const originalActions = props?.actions || [];
    
    // Map through actions and override copyMessage
    const modifiedActions = originalActions.map((action: any, index: number) => {
      // Identify copyMessage action - check multiple possible identifiers
      // StreamChat actions might have different structures, so check thoroughly
      const actionString = JSON.stringify(action || {}).toLowerCase();
      const isCopyAction = action && (
        action.title === 'Copy Message' ||
        action.name === 'copyMessage' ||
        action.actionId === 'copyMessage' ||
        action.id === 'copyMessage' ||
        (typeof action === 'object' && 'title' in action && action.title?.toLowerCase().includes('copy')) ||
        actionString.includes('copy') ||
        (action?.action && action.action.toString().includes('setClipboardString')) ||
        (action?.action && action.action.toString().includes('NativeHandlers'))
      );
      
      if (isCopyAction) {
        if (__DEV__) {
          console.log('🔍 [CustomMessageActionList] Found copyMessage action at index', index, 'overriding:', {
            actionKeys: Object.keys(action || {}),
            messageText: messageText || 'NOT FOUND',
            actionTitle: action?.title,
            actionName: action?.name,
            actionId: action?.id,
            hasAction: !!action?.action,
            actionType: typeof action?.action,
          });
        }
        
        // Completely replace the action to prevent StreamChat from calling the broken native handler
        return {
          ...action,
          // Override the action function completely
          action: async () => {
            try {
              if (__DEV__) {
                console.log('🔍 [CustomMessageActionList] Custom copy action called, messageText:', messageText || 'NOT FOUND');
              }
              
              if (messageText) {
                await Clipboard.setStringAsync(messageText);
                
                if (Platform.OS === 'android') {
                  Alert.alert('Copied', 'Message copied to clipboard');
                }
                // iOS has built-in haptic feedback
                
                // Dismiss overlay
                if (props?.dismissOverlay) {
                  props.dismissOverlay();
                }
              } else {
                console.warn('⚠️ [CustomMessageActionList] No message text to copy');
                Alert.alert('Error', 'No message text to copy');
              }
            } catch (error) {
              console.error('❌ [CustomMessageActionList] Failed to copy:', error);
              Alert.alert('Error', 'Failed to copy message to clipboard');
            }
          },
          // Also override onPress if it exists
          onPress: async () => {
            // Same logic as action
            try {
              if (messageText) {
                await Clipboard.setStringAsync(messageText);
                if (Platform.OS === 'android') {
                  Alert.alert('Copied', 'Message copied to clipboard');
                }
                if (props?.dismissOverlay) {
                  props.dismissOverlay();
                }
              }
            } catch (error) {
              console.error('❌ [CustomMessageActionList] Failed to copy:', error);
            }
          },
        };
      }
      return action;
    });
    
    // Pass all props with modified actions to default MessageActionList
    // Also pass our custom MessageActionListItem to handle copyMessage at the item level
    const finalProps = {
      ...props,
      actions: modifiedActions,
      // Override MessageActionListItem to handle copyMessage
      MessageActionListItem: CustomMessageActionListItem,
    };
    
    if (__DEV__) {
      console.log('🔍 [CustomMessageActionList] Final props:', {
        actionsLength: modifiedActions.length,
        originalActionsLength: originalActions.length,
        hasMessage: !!message,
        messageText: messageText || 'NOT FOUND',
        copyActionFound: modifiedActions.some((a: any) => 
          a?.title === 'Copy Message' || 
          a?.name === 'copyMessage' ||
          JSON.stringify(a || {}).toLowerCase().includes('copy')
        ),
      });
    }
    
    return <MessageActionList {...finalProps} />;
  };

  // Custom MessageOverlay - customize ReactionPicker and MessageActionList
  // MessageActionList uses useMessageContext to access message for copy functionality
  const CustomMessageOverlay = (overlayProps: any) => {
    // Debug logging to verify props are passed correctly
    if (__DEV__) {
      console.log('🔍 [CustomMessageOverlay] Props:', {
        hasMessageActions: !!overlayProps?.messageActions,
        overlayKeys: Object.keys(overlayProps || {}),
        messageActionsType: typeof overlayProps?.messageActions,
      });
    }
    
    // Override both ReactionPicker and MessageActionList
    return (
      <MessageOverlay
        {...overlayProps}
        ReactionPicker={CustomReactionPicker}
        MessageActionList={CustomMessageActionList}
      />
    );
  };

  // Get StreamChat channel ID from OneCrew conversation ID
  // CRITICAL: Backend returns channel IDs directly (e.g., "user_user-{hash}")
  // Do NOT add "onecrew_" prefix - use conversation ID directly
  const streamChannelId = useMemo(() => {
    if (!conversationId) return null;
    // Backend already returns the correct StreamChat channel ID format
    // No need to transform with getStreamChannelId() which adds "onecrew_" prefix
    return conversationId;
  }, [conversationId]);

  // Optimized channel watching - single watch call with consistent limits
  useEffect(() => {
    if (!channel || channel.state?.watched) return;
      
    const watchChannel = async () => {
      try {
        console.log('⏳ [ChatPage] Watching channel...');
        await channel.watch({
          watchers: { limit: 10 },
          messages: { limit: 30 }, // Consistent limit - pagination will load more
          presence: true,
        });
        console.log('✅ [ChatPage] Channel watched successfully');
      } catch (err: any) {
          console.error('❌ [ChatPage] Failed to watch channel:', err);
      }
    };
    
    watchChannel();
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
      isConnected: !!client?.userID,
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

  // Removed redundant message verification - StreamChat handles this automatically

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
                messages: { limit: 30 }, // Optimized - pagination will load more
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
          
          // Removed background query - let MessageList pagination handle it for better performance
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
            // Optimized: Load fewer messages initially, pagination will load more
            await channelInstance.watch({
              watchers: { limit: 10 },
              messages: { limit: 30 }, // Optimized - pagination will load more
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
                messages: { limit: 30 },
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
        
        // Removed background query - let MessageList pagination handle it for better performance
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

  // Memoized message send handler
  const handleSendMessage = useCallback(async (message: any) => {
    if (!channel || !conversationId) return;

    try {
      // Mark as read after sending - StreamChat handles the actual send
      await channel.markRead();
    } catch (err: any) {
      console.error('❌ [ChatPage] Failed to mark as read:', err);
    }
  }, [channel, conversationId]);

  // Memoized thread selection handler
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
              // Hide StreamChat's default header - we're using React Navigation header instead
              ChannelHeader={() => null}
              // Custom reaction options with SVG icons
              supportedReactions={customReactionOptions}
              // Custom overlay - only customizes ReactionPicker, uses default MessageActionList
              MessageOverlay={CustomMessageOverlay}
              // Configure message actions - callback function that receives action objects
              // StreamChat expects a callback, not an array of strings
              messageActions={({ 
                editMessage, 
                deleteMessage, 
                reply, 
                selectReaction,
                copyMessage,
                markAsUnread,
                flagMessage,
                pinMessage,
                message,  // CRITICAL: StreamChat passes the message object directly!
                dismissOverlay,  // Also available to close the overlay
                ...otherActions 
              }) => {
                // Debug logging to verify which actions are available
                if (__DEV__) {
                  console.log('🔍 [messageActions] Available actions:', {
                    editMessage: !!editMessage,
                    deleteMessage: !!deleteMessage,
                    reply: !!reply,
                    selectReaction: !!selectReaction,
                    copyMessage: !!copyMessage,
                    markAsUnread: !!markAsUnread,
                    flagMessage: !!flagMessage,
                    pinMessage: !!pinMessage,
                    hasMessage: !!message,
                    messageText: message?.text || 'NOT FOUND',
                    allActionKeys: Object.keys({ editMessage, deleteMessage, reply, selectReaction, copyMessage, markAsUnread, flagMessage, pinMessage, ...otherActions }),
                  });
                }
                
                // CRITICAL: Override copyMessage action to prevent StreamChat from calling
                // the broken NativeHandlers.setClipboardString
                // We have direct access to the message object from the callback parameters!
                const customCopyMessage = copyMessage ? {
                  ...copyMessage,
                  // Completely replace the action - use the message from callback parameters
                  action: async () => {
                    try {
                      const messageText = message?.text || '';
                      
                      if (__DEV__) {
                        console.log('🔍 [messageActions] copyMessage action called:', {
                          hasMessage: !!message,
                          messageText: messageText || 'NOT FOUND',
                          messageId: message?.id,
                        });
                      }
                      
                      if (messageText) {
                        await Clipboard.setStringAsync(messageText);
                        
                        if (Platform.OS === 'android') {
                          Alert.alert('Copied', 'Message copied to clipboard');
                        }
                        // iOS has built-in haptic feedback
                        
                        // Dismiss overlay
                        if (dismissOverlay) {
                          dismissOverlay();
                        }
                      } else {
                        console.warn('⚠️ [messageActions] No message text to copy');
                        Alert.alert('Error', 'No message text to copy');
                      }
                    } catch (error) {
                      console.error('❌ [messageActions] Failed to copy:', error);
                      Alert.alert('Error', 'Failed to copy message to clipboard');
                    }
                  },
                } : null;
                
                // Return all actions we want to show
                // CustomMessageActionList will intercept copyMessage and use useMessageContext
                // to get the message text and perform the actual copy
                const actions = [
                  selectReaction,  // This is the "react" action
                  reply,
                  customCopyMessage,  // Our overridden copyMessage (action will be replaced in CustomMessageActionList)
                  markAsUnread,
                  flagMessage,
                  pinMessage,
                  editMessage,
                  deleteMessage,
                ].filter(Boolean); // Filter out any null/undefined actions
                
                if (__DEV__) {
                  console.log('🔍 [messageActions] Returning actions:', actions.length, 'actions');
                }
                
                return actions;
              }}
              // Override channel capabilities to ensure actions are visible
              // StreamChat filters actions based on permissions, so we force enable them
              overrideOwnCapabilities={{
                'update-own-message': true,  // Required for editMessage
                'quote-message': true,        // Required for reply (quoted reply)
                'send-reply': true,           // Required for thread reply
                'send-message': true,         // Required for sending messages
                'delete-own-message': true,   // Required for deleteMessage
                'flag-message': true,         // Required for flagMessage
                'pin-message': true,          // Required for pinMessage
              }}
              // Reaction behavior
              enforceUniqueReaction={false}
              reactionListPosition="bottom"
            >
              <MessageList 
                onThreadSelect={handleThreadSelect}
                noGroupByUser={false}
                // Optimized pagination - consistent with watch limit
                pagination={{ limit: 30 }}
                // Performance-optimized FlatList props
                additionalFlatListProps={{
                  removeClippedSubviews: true, // Enable for better performance
                  initialNumToRender: 10, // Render fewer initially for faster load
                  maxToRenderPerBatch: 5, // Smaller batches for smoother scrolling
                  windowSize: 5, // Smaller window for better memory usage
                  updateCellsBatchingPeriod: 50, // Batch updates for performance
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
                  multiline: true,
                  returnKeyType: 'send',
                  blurOnSubmit: false,
                }}
                // Disable unnecessary features for cleaner UI
                giphyEnabled={false}
                imageUploadEnabled={false}
                fileUploadEnabled={false}
                audioRecordingEnabled={false}
                // Hide attachment button for cleaner UI
                AttachmentButton={() => null}
                // Native-style send button (iOS Messages/WhatsApp style)
                SendButton={NativeSendButton}
                // Handle send message event for additional processing
                onSendMessage={handleSendMessage}
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
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
  customSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    // Ensure minimum touch target size
    minWidth: 48,
    minHeight: 48,
  },
  customSendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  customSendButtonSending: {
    backgroundColor: '#60a5fa', // Lighter blue when sending
    opacity: 0.8,
  },
  nativeSendButton: {
    // Larger touch target for easier tapping
    width: Platform.OS === 'android' ? 48 : 44, // Increased from 40/36 for bigger touch area
    height: Platform.OS === 'android' ? 48 : 44,
    minWidth: Platform.OS === 'android' ? 48 : 44, // Ensure minimum touch target
    minHeight: Platform.OS === 'android' ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    // No background - just icon (native messenger style)
    backgroundColor: 'transparent',
    // Android: Add ripple effect support
    ...(Platform.OS === 'android' && {
      borderRadius: 24, // Circular for ripple effect
    }),
  },
  customReactionButton: {
    minWidth: 44, // iOS minimum touch target
    minHeight: 44,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
