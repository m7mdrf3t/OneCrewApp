/**
 * TabBar Android Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { tabBarCommonStyles } from './TabBar.styles.common';

export const tabBarAndroidStyles = StyleSheet.create({
  container: {
    ...tabBarCommonStyles.container,
    backgroundColor: '#000',
    borderTopColor: '#333',
    borderTopWidth: 1, // Material Design uses 1px
    elevation: 8, // Material elevation
  } as ViewStyle,
  
  tab: {
    ...tabBarCommonStyles.tab,
  } as ViewStyle,
  
  activeTab: {
    ...tabBarCommonStyles.activeTab,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  tabLabel: {
    ...tabBarCommonStyles.tabLabel,
  } as TextStyle,
  
  activeTabLabel: {
    ...tabBarCommonStyles.activeTabLabel,
  } as TextStyle,
  
  profileTab: {
    ...tabBarCommonStyles.profileTab,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
});

