import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { TabBarProps } from '../types';
import { createPlatformStyles } from '../utils/platformStyles';
import { tabBarCommonStyles } from './TabBar.styles.common';
import { tabBarIosStyles } from './TabBar.styles.ios';
import { tabBarAndroidStyles } from './TabBar.styles.android';
import { useApi } from '../contexts/ApiContext';
import { useGlobalModals } from '../contexts/GlobalModalsContext';

// Create platform-specific styles (outside component for performance)
const styles = createPlatformStyles({
  common: tabBarCommonStyles,
  ios: tabBarIosStyles,
  android: tabBarAndroidStyles,
});

const TabBar: React.FC<TabBarProps> = ({ active, onChange, onProfilePress }) => {
  const insets = useSafeAreaInsets();
  const { user, activeCompany, currentProfileType } = useApi();
  const { setShowAccountSwitcher, setShowUserMenu } = useGlobalModals();
  
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
  const tabs = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'projects', label: 'Projects', icon: 'folder' },
    { key: 'spot', label: 'Spot', icon: 'search' },
    { key: 'wall', label: 'Agenda', icon: 'calendar' },
  ];

  // Calculate padding bottom - iOS handles it in styles, Android uses insets
  const paddingBottom = Platform.OS === 'ios' 
    ? undefined 
    : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, paddingBottom !== undefined && { paddingBottom }]}> 
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, active === tab.key && styles.activeTab]}
          onPress={() => onChange(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={active === tab.key ? '#fff' : '#999'}
          />
          <Text style={[styles.tabLabel, active === tab.key && styles.activeTabLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
      {onProfilePress && (
        <TouchableOpacity
          style={styles.profileTab}
          onPress={onProfilePress}
          onLongPress={() => setShowAccountSwitcher(true)}
          delayLongPress={500}
        >
          {profileImageUrl ? (
            <Image
              key={imageKey} // Force re-render when URL changes
              source={{ uri: profileImageUrl }}
              style={styles.profileImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk" // Ensure fresh image loads
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.menuTab}
        onPress={() => setShowUserMenu(true)}
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

export default TabBar;
