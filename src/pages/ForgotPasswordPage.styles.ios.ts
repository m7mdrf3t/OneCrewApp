/**
 * ForgotPasswordPage iOS Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { forgotPasswordPageCommonStyles } from './ForgotPasswordPage.styles.common';

export const forgotPasswordPageIosStyles = StyleSheet.create({
  container: {
    ...forgotPasswordPageCommonStyles.container,
    backgroundColor: '#f2f2f7', // iOS system background
  } as ViewStyle,
  
  content: {
    ...forgotPasswordPageCommonStyles.content,
  } as ViewStyle,
  
  header: {
    ...forgotPasswordPageCommonStyles.header,
  } as ViewStyle,
  
  backButton: {
    ...forgotPasswordPageCommonStyles.backButton,
  } as ViewStyle,
  
  title: {
    ...forgotPasswordPageCommonStyles.title,
  } as TextStyle,
  
  placeholder: {
    ...forgotPasswordPageCommonStyles.placeholder,
  } as ViewStyle,
  
  subtitle: {
    ...forgotPasswordPageCommonStyles.subtitle,
  } as TextStyle,
  
  successIcon: {
    ...forgotPasswordPageCommonStyles.successIcon,
  } as ViewStyle,
  
  emailText: {
    ...forgotPasswordPageCommonStyles.emailText,
  } as TextStyle,
  
  instructions: {
    ...forgotPasswordPageCommonStyles.instructions,
  } as TextStyle,
  
  errorContainer: {
    ...forgotPasswordPageCommonStyles.errorContainer,
    borderRadius: 10, // iOS prefers 10px
  } as ViewStyle,
  
  errorText: {
    ...forgotPasswordPageCommonStyles.errorText,
  } as TextStyle,
  
  inputContainer: {
    ...forgotPasswordPageCommonStyles.inputContainer,
  } as ViewStyle,
  
  label: {
    ...forgotPasswordPageCommonStyles.label,
  } as TextStyle,
  
  inputWrapper: {
    ...forgotPasswordPageCommonStyles.inputWrapper,
    borderRadius: 10, // iOS prefers 10px for inputs
  } as ViewStyle,
  
  inputError: {
    ...forgotPasswordPageCommonStyles.inputError,
  } as ViewStyle,
  
  inputValid: {
    ...forgotPasswordPageCommonStyles.inputValid,
  } as ViewStyle,
  
  inputInvalid: {
    ...forgotPasswordPageCommonStyles.inputInvalid,
  } as ViewStyle,
  
  inputIcon: {
    ...forgotPasswordPageCommonStyles.inputIcon,
  } as ViewStyle,
  
  input: {
    ...forgotPasswordPageCommonStyles.input,
  } as TextStyle,
  
  fieldError: {
    ...forgotPasswordPageCommonStyles.fieldError,
  } as TextStyle,
  
  sendButton: {
    ...forgotPasswordPageCommonStyles.sendButton,
    borderRadius: 12, // iOS prefers 12px for buttons
  } as ViewStyle,
  
  sendButtonDisabled: {
    ...forgotPasswordPageCommonStyles.sendButtonDisabled,
  } as ViewStyle,
  
  sendButtonText: {
    ...forgotPasswordPageCommonStyles.sendButtonText,
  } as TextStyle,
  
  resendButton: {
    ...forgotPasswordPageCommonStyles.resendButton,
    borderRadius: 12, // iOS prefers 12px
  } as ViewStyle,
  
  resendButtonText: {
    ...forgotPasswordPageCommonStyles.resendButtonText,
  } as TextStyle,
  
  backToLoginButton: {
    ...forgotPasswordPageCommonStyles.backToLoginButton,
    borderRadius: 12, // iOS prefers 12px
  } as ViewStyle,
  
  backToLoginText: {
    ...forgotPasswordPageCommonStyles.backToLoginText,
  } as TextStyle,
  
  helpContainer: {
    ...forgotPasswordPageCommonStyles.helpContainer,
  } as ViewStyle,
  
  helpText: {
    ...forgotPasswordPageCommonStyles.helpText,
  } as TextStyle,
  
  helpLink: {
    ...forgotPasswordPageCommonStyles.helpLink,
  } as TextStyle,
  
  loadingOverlay: {
    ...forgotPasswordPageCommonStyles.loadingOverlay,
  } as ViewStyle,
  
  loadingText: {
    ...forgotPasswordPageCommonStyles.loadingText,
  } as TextStyle,
  
  buttonContent: {
    ...forgotPasswordPageCommonStyles.buttonContent,
  } as ViewStyle,
  
  buttonSpinner: {
    ...forgotPasswordPageCommonStyles.buttonSpinner,
  } as ViewStyle,
});
