import React from 'react';
import { View, TouchableOpacity, Text, Platform, ImageStyle, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { TabBarProps } from '../types';
import { createPlatformStyles } from '../utils/platformStyles';
import { tabBarCommonStyles } from './TabBar.styles.common';
import { tabBarIosStyles } from './TabBar.styles.ios';
import { tabBarAndroidStyles } from './TabBar.styles.android';
import { useApi } from '../contexts/ApiContext';
import { useGlobalModalActions } from '../contexts/GlobalModalsContext';
import streamChatService from '../services/StreamChatService';

// Create platform-specific styles (outside component for performance)
const styles = createPlatformStyles({
  common: tabBarCommonStyles,
  ios: tabBarIosStyles,
  android: tabBarAndroidStyles,
});

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'projects', label: 'Projects', icon: 'folder' },
  { key: 'spot', label: 'Spot', icon: 'search' },
  { key: 'conversations', label: 'Messages', icon: 'chatbubble-ellipses-outline', iconSize: 24 },
] as const;

const TabBar: React.FC<TabBarProps> = ({ active, onChange, onProfilePress }) => {
  const insets = useSafeAreaInsets();
  const { user, activeCompany, currentProfileType, unreadConversationCount, getUnreadConversationCount } = useApi();
  const { setShowAccountSwitcher, setShowUserMenu } = useGlobalModalActions();
  const [tabUnreadCount, setTabUnreadCount] = React.useState(0);
  const [streamUnreadCount, setStreamUnreadCount] = React.useState(0);

  const readStreamUnreadCount = React.useCallback(() => {
    try {
      if (!streamChatService.isConnected()) {
        return 0;
      }

      const client: any = streamChatService.getClient();
      const parseCount = (value: any): number => {
        const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
        return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      };

      const userTotal = parseCount(client?.user?.total_unread_count);
      const activeChannels = Object.values(client?.activeChannels || {}) as any[];
      const channelTotal = activeChannels.reduce((sum: number, channel: any) => {
        return sum + parseCount(channel?.state?.unreadCount);
      }, 0);

      return Math.max(userTotal, channelTotal);
    } catch {
      return 0;
    }
  }, []);

  React.useEffect(() => {
    setTabUnreadCount(unreadConversationCount || 0);
  }, [unreadConversationCount]);

  React.useEffect(() => {
    let isMounted = true;

    const refreshUnread = async () => {
      try {
        const count = await getUnreadConversationCount();
        if (isMounted && typeof count === 'number') {
          setTabUnreadCount(count);
        }
      } catch {
        // Keep current count if refresh fails.
      }
    };

    refreshUnread();
    const intervalId = setInterval(refreshUnread, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [getUnreadConversationCount, currentProfileType, activeCompany?.id]);

  React.useEffect(() => {
    let isMounted = true;
    let listeners: Array<{ unsubscribe: () => void }> = [];
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const updateFromStream = () => {
      if (!isMounted) return;
      const count = readStreamUnreadCount();
      setStreamUnreadCount(count);
    };

    updateFromStream();

    if (streamChatService.isConnected()) {
      try {
        const client: any = streamChatService.getClient();
        listeners = [
          client.on('notification.message_new', updateFromStream),
          client.on('notification.mark_read', updateFromStream),
          client.on('notification.mark_unread', updateFromStream),
          client.on('notification.read', updateFromStream),
          client.on('message.new', updateFromStream),
        ];
      } catch {
        // Keep polling fallback if listeners can't be attached.
      }
    }

    intervalId = setInterval(updateFromStream, 5000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      listeners.forEach((listener) => {
        try {
          listener.unsubscribe();
        } catch {
          // Ignore listener cleanup errors.
        }
      });
    };
  }, [readStreamUnreadCount, currentProfileType, activeCompany?.id]);

  const effectiveUnreadCount = Math.max(unreadConversationCount || 0, tabUnreadCount || 0, streamUnreadCount || 0);
  const showUnreadBadge = effectiveUnreadCount > 0;
  const unreadBadgeText = effectiveUnreadCount > 99 ? '99+' : String(effectiveUnreadCount);
  
  // Get profile image - use company logo if on company profile, otherwise user image
  // Use useMemo to ensure it updates when activeCompany changes
  const profileImageUrl = React.useMemo(() => {
    if (currentProfileType === 'company' && activeCompany?.logo_url) {
      return activeCompany.logo_url;
    }
    return user?.image_url;
  }, [currentProfileType, activeCompany?.logo_url, activeCompany?.id, user?.image_url]);
  
  // Get initials for fallback - also memoized
  const getInitials = React.useCallback((name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);
  
  const initials = React.useMemo(() => {
    if (currentProfileType === 'company' && activeCompany?.name) {
      return getInitials(activeCompany.name);
    }
    return getInitials(user?.name);
  }, [currentProfileType, activeCompany?.name, activeCompany?.id, user?.name, getInitials]);
  
  // Create a key for the Image component to force re-render when URL changes
  const imageKey = React.useMemo(() => {
    return `${currentProfileType}-${activeCompany?.id || user?.id}-${profileImageUrl || 'no-image'}`;
  }, [currentProfileType, activeCompany?.id, user?.id, profileImageUrl]);

  // Rotating ring animation
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);
  const ringRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate padding bottom - iOS handles it in styles, Android uses insets
  const paddingBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  const ringWrapperStyle = {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const ringStyle = {
    position: 'absolute' as const,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  };

  const handleMenuPress = React.useCallback(() => {
    setShowUserMenu(true);
  }, [setShowUserMenu]);

  const handleProfileLongPress = React.useCallback(() => {
    setShowAccountSwitcher(true);
  }, [setShowAccountSwitcher]);

  return (
    <View style={[styles.container, paddingBottom !== undefined && { paddingBottom }]}> 
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, active === tab.key && styles.activeTab]}
          onPress={() => onChange(tab.key)}
        >
          {tab.key === 'conversations' && showUnreadBadge && (
            <View style={styles.tabMessageBadge} pointerEvents="none">
              <Text style={styles.messageBadgeText}>{unreadBadgeText}</Text>
            </View>
          )}
          <View style={styles.iconContainer}>
            <Ionicons
              name={(tab as { icon: string }).icon as any}
              size={'iconSize' in tab ? tab.iconSize : 20}
              color={active === tab.key ? '#fff' : '#999'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              active === tab.key && styles.activeTabLabel,
              tab.key === 'conversations' && styles.tabLabelSingleLine,
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
      {onProfilePress && (
        <TouchableOpacity
          style={styles.profileTab}
          onPress={onProfilePress}
          onLongPress={handleProfileLongPress}
          delayLongPress={500}
        >
          <View style={ringWrapperStyle}>
            <Animated.View style={[ringStyle, { transform: [{ rotate: ringRotation }] }]} />
            {profileImageUrl ? (
              <Image
                key={imageKey}
                source={{ uri: profileImageUrl }}
                style={styles.profileImage as ImageStyle}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>{initials}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.menuTab}
        onPress={handleMenuPress}
      >
        <Ionicons
          name="menu-outline"
          size={20}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(TabBar);
