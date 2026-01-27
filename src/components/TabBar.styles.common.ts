/**
 * TabBar Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { semanticSpacing } from '../constants/spacing';

export const tabBarCommonStyles = {
  container: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: semanticSpacing.buttonPadding,
    paddingHorizontal: semanticSpacing.containerPadding,
    zIndex: 1000,
  } as ViewStyle,
  
  tab: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: semanticSpacing.buttonPadding,
    paddingHorizontal: 4,
  } as ViewStyle,
  
  activeTab: {
    backgroundColor: '#333',
    borderRadius: 8,
  } as ViewStyle,
  
  tabLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500' as const,
  } as TextStyle,
  
  activeTabLabel: {
    color: '#fff',
    fontWeight: '600' as const,
  } as TextStyle,
  
  profileTab: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: semanticSpacing.buttonPadding,
    paddingHorizontal: 12,
    marginLeft: 4,
    borderRadius: 8,
  } as ViewStyle,
  
  menuTab: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: semanticSpacing.buttonPadding,
    paddingHorizontal: 12,
    marginLeft: 4,
    borderRadius: 8,
  } as ViewStyle,
  
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  } as ViewStyle,
  
  profileImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#fff',
  } as ViewStyle,
  
  profileImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  } as TextStyle,
};

