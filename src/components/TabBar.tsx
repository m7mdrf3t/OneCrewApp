import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabBarProps } from '../types';

const TabBar: React.FC<TabBarProps> = ({ active, onChange }) => {
  const tabs = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'projects', label: 'Projects', icon: 'folder' },
    { key: 'spot', label: 'Spot', icon: 'search' },
    { key: 'profile', label: 'Profile', icon: 'person' },
    { key: 'star', label: 'Star', icon: 'star' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, active === tab.key && styles.activeTab]}
          onPress={() => onChange(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={active === tab.key ? '#000' : '#71717a'}
          />
          <Text style={[styles.tabLabel, active === tab.key && styles.activeTabLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d4d4d8',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#000',
    fontWeight: '600',
  },
});

export default TabBar;
