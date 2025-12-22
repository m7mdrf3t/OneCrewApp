import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabBarProps } from '../types';
import { createPlatformStyles } from '../utils/platformStyles';
import { tabBarCommonStyles } from './TabBar.styles.common';
import { tabBarIosStyles } from './TabBar.styles.ios';
import { tabBarAndroidStyles } from './TabBar.styles.android';

// Create platform-specific styles (outside component for performance)
const styles = createPlatformStyles({
  common: tabBarCommonStyles,
  ios: tabBarIosStyles,
  android: tabBarAndroidStyles,
});

const TabBar: React.FC<TabBarProps> = ({ active, onChange, onProfilePress }) => {
  const insets = useSafeAreaInsets();
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
        >
          <Ionicons
            name="person-circle"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TabBar;
