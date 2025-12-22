/**
 * App Android Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { appCommonStyles } from './App.styles.common';

export const appAndroidStyles = StyleSheet.create({
  container: {
    ...appCommonStyles.container,
    backgroundColor: '#f5f5f5', // Material Design background
  } as ViewStyle,
  
  appContainer: {
    ...appCommonStyles.appContainer,
    backgroundColor: '#f5f5f5',
  } as ViewStyle,
  
  topBar: {
    ...appCommonStyles.topBar,
    backgroundColor: '#ffffff',
    borderBottomColor: '#000',
    borderBottomWidth: 1, // Material Design uses 1px borders
    elevation: 2, // Material elevation
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
    borderRadius: 24, // Material Design prefers 24px for FABs
    elevation: 4, // Material elevation
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
    borderRadius: 16, // Material Design prefers 16px
    elevation: 16, // High elevation for modals
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
    borderRadius: 4, // Material Design prefers 4px
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

