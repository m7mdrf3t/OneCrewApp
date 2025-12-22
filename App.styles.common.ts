/**
 * App Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { semanticSpacing } from './src/constants/spacing';

export const appCommonStyles = {
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  } as ViewStyle,
  
  appContainer: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  } as ViewStyle,
  
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.headerPaddingVertical,
    paddingTop: semanticSpacing.containerPadding,
    minHeight: 56,
  } as ViewStyle,
  
  topBarLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  } as ViewStyle,
  
  topBarRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 4,
  } as ViewStyle,
  
  topBarButton: {
    padding: semanticSpacing.tightPadding,
    marginLeft: 4,
    position: 'relative' as const,
  } as ViewStyle,
  
  topBarTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginLeft: semanticSpacing.containerPadding,
  } as ViewStyle,
  
  topBarTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  } as TextStyle,
  
  userName: {
    fontWeight: '400' as const,
  } as TextStyle,
  
  chevronIcon: {
    marginLeft: 4,
  } as ViewStyle,
  
  notificationBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  } as ViewStyle,
  
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600' as const,
  } as TextStyle,
  
  content: {
    flex: 1,
  } as ViewStyle,
  
  backButton: {
    position: 'absolute' as const,
    bottom: 88,
    left: semanticSpacing.sectionGapLarge,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: semanticSpacing.buttonPadding,
    zIndex: 20,
  } as ViewStyle,
  
  fullPageOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    zIndex: 1000,
  } as ViewStyle,
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as ViewStyle,
  
  loadingText: {
    fontSize: 16,
    fontWeight: '500' as const,
  } as TextStyle,
  
  modalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 10000,
  } as ViewStyle,
  
  guestPromptModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
  } as ViewStyle,
  
  guestPromptTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 12,
    textAlign: 'center' as const,
  } as TextStyle,
  
  guestPromptMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center' as const,
    lineHeight: 22,
  } as TextStyle,
  
  guestPromptButtons: {
    width: '100%',
    gap: 12,
  } as ViewStyle,
  
  guestPromptButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  guestPromptButtonPrimary: {
    backgroundColor: '#000',
  } as ViewStyle,
  
  guestPromptButtonSecondary: {
    borderWidth: 1,
  } as ViewStyle,
  
  guestPromptButtonTertiary: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  
  guestPromptButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
};

