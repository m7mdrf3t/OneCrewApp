/**
 * App iOS Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { appCommonStyles } from './App.styles.common';

export const appIosStyles = StyleSheet.create({
  container: {
    ...appCommonStyles.container,
    backgroundColor: '#f2f2f7', // iOS system background
  } as ViewStyle,
  
  appContainer: {
    ...appCommonStyles.appContainer,
    backgroundColor: '#f2f2f7',
  } as ViewStyle,
  
  topBar: {
    ...appCommonStyles.topBar,
    backgroundColor: '#ffffff',
    borderBottomColor: '#1f2937',
    borderBottomWidth: 0.5, // iOS uses thinner borders
  } as ViewStyle,
  
  topBarLeft: {
    ...appCommonStyles.topBarLeft,
  } as ViewStyle,
  
  topBarRight: {
    ...appCommonStyles.topBarRight,
  } as ViewStyle,
  
  topBarButton: {
    ...appCommonStyles.topBarButton,
  } as ViewStyle,
  
  topBarTitleContainer: {
    ...appCommonStyles.topBarTitleContainer,
  } as ViewStyle,
  
  topBarTitle: {
    ...appCommonStyles.topBarTitle,
  } as TextStyle,
  
  userName: {
    ...appCommonStyles.userName,
  } as TextStyle,
  
  chevronIcon: {
    ...appCommonStyles.chevronIcon,
  } as ViewStyle,
  
  notificationBadge: {
    ...appCommonStyles.notificationBadge,
  } as ViewStyle,
  
  notificationBadgeText: {
    ...appCommonStyles.notificationBadgeText,
  } as TextStyle,
  
  content: {
    ...appCommonStyles.content,
  } as ViewStyle,
  
  backButton: {
    ...appCommonStyles.backButton,
    borderRadius: 20, // iOS prefers more rounded
  } as ViewStyle,
  
  fullPageOverlay: {
    ...appCommonStyles.fullPageOverlay,
  } as ViewStyle,
  
  loadingContainer: {
    ...appCommonStyles.loadingContainer,
  } as ViewStyle,
  
  loadingText: {
    ...appCommonStyles.loadingText,
  } as TextStyle,
  
  modalOverlay: {
    ...appCommonStyles.modalOverlay,
  } as ViewStyle,
  
  guestPromptModal: {
    ...appCommonStyles.guestPromptModal,
    borderRadius: 20, // iOS prefers 20px
  } as ViewStyle,
  
  guestPromptTitle: {
    ...appCommonStyles.guestPromptTitle,
  } as TextStyle,
  
  guestPromptMessage: {
    ...appCommonStyles.guestPromptMessage,
  } as TextStyle,
  
  guestPromptButtons: {
    ...appCommonStyles.guestPromptButtons,
  } as ViewStyle,
  
  guestPromptButton: {
    ...appCommonStyles.guestPromptButton,
    borderRadius: 10, // iOS prefers 10px
  } as ViewStyle,
  
  guestPromptButtonPrimary: {
    ...appCommonStyles.guestPromptButtonPrimary,
  } as ViewStyle,
  
  guestPromptButtonSecondary: {
    ...appCommonStyles.guestPromptButtonSecondary,
  } as ViewStyle,
  
  guestPromptButtonTertiary: {
    ...appCommonStyles.guestPromptButtonTertiary,
  } as ViewStyle,
  
  guestPromptButtonText: {
    ...appCommonStyles.guestPromptButtonText,
  } as TextStyle,
});

