/**
 * TabBar Common Styles
 */
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { semanticSpacing } from '../constants/spacing';

export const tabBarCommonStyles = {
  container: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible' as const,
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
    minWidth: 56,
    position: 'relative' as const,
    overflow: 'visible' as const,
    alignItems: 'center' as const,
    paddingVertical: semanticSpacing.buttonPadding,
    paddingHorizontal: 2,
  } as ViewStyle,

  iconContainer: {
    position: 'relative' as const,
    overflow: 'visible' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 24,
    minHeight: 24,
  } as ViewStyle,
  
  activeTab: {
    backgroundColor: '#333',
    borderRadius: 8,
  } as ViewStyle,
  
  tabLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '500' as const,
  } as TextStyle,

  tabLabelSingleLine: {
    flexShrink: 0,
  } as TextStyle,

  messageBadge: {
    position: 'absolute' as const,
    top: -6,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#000',
    zIndex: 10,
    elevation: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  } as ViewStyle,

  tabMessageBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#000',
    zIndex: 20,
    elevation: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 5,
  } as ViewStyle,

  messageBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    lineHeight: 11,
    textAlign: 'center' as const,
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
  } as ImageStyle,
  
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

