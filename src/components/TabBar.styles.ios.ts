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
    borderTopWidth: 0.5, // iOS uses thinner borders
    paddingBottom: 34, // iOS safe area bottom
  } as ViewStyle,
  
  tab: {
    ...tabBarCommonStyles.tab,
  } as ViewStyle,
  
  activeTab: {
    ...tabBarCommonStyles.activeTab,
    borderRadius: 12, // iOS prefers more rounded
  } as ViewStyle,
  
  tabLabel: {
    ...tabBarCommonStyles.tabLabel,
  } as TextStyle,
  
  activeTabLabel: {
    ...tabBarCommonStyles.activeTabLabel,
  } as TextStyle,
  
  profileTab: {
    ...tabBarCommonStyles.profileTab,
    borderRadius: 12, // iOS prefers more rounded
  } as ViewStyle,
});

