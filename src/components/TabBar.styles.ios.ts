/**
 * TabBar iOS Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { tabBarCommonStyles } from './TabBar.styles.common';

export const tabBarIosStyles = StyleSheet.create({
  container: {
    ...tabBarCommonStyles.container,
    backgroundColor: '#000',
    borderTopColor: '#333',
    borderTopWidth: 1,
  } as ViewStyle,
  
  tab: {
    ...tabBarCommonStyles.tab,
  } as ViewStyle,
  
  activeTab: {
    ...tabBarCommonStyles.activeTab,
    borderRadius: 8, // iOS prefers 8px
  } as ViewStyle,
  
  tabLabel: {
    ...tabBarCommonStyles.tabLabel,
  } as TextStyle,
  
  activeTabLabel: {
    ...tabBarCommonStyles.activeTabLabel,
  } as TextStyle,
  
  profileTab: {
    ...tabBarCommonStyles.profileTab,
    borderRadius: 8, // iOS prefers 8px
  } as ViewStyle,
});

