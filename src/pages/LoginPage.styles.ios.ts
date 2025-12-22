/**
 * LoginPage iOS Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { loginPageCommonStyles } from './LoginPage.styles.common';

export const loginPageIosStyles = StyleSheet.create({
  container: {
    ...loginPageCommonStyles.container,
    backgroundColor: '#f2f2f7', // iOS system background
  } as ViewStyle,
  
  scrollContainer: {
    ...loginPageCommonStyles.scrollContainer,
  } as ViewStyle,
  
  header: {
    ...loginPageCommonStyles.header,
  } as ViewStyle,
  
  title: {
    ...loginPageCommonStyles.title,
  } as TextStyle,
  
  subtitle: {
    ...loginPageCommonStyles.subtitle,
  } as TextStyle,
  
  form: {
    ...loginPageCommonStyles.form,
  } as ViewStyle,
  
  errorContainer: {
    ...loginPageCommonStyles.errorContainer,
    borderRadius: 10, // iOS prefers 10px
  } as ViewStyle,
  
  errorText: {
    ...loginPageCommonStyles.errorText,
  } as TextStyle,
  
  inputContainer: {
    ...loginPageCommonStyles.inputContainer,
  } as ViewStyle,
  
  label: {
    ...loginPageCommonStyles.label,
  } as TextStyle,
  
  inputWrapper: {
    ...loginPageCommonStyles.inputWrapper,
    borderRadius: 10, // iOS prefers 10px for inputs
  } as ViewStyle,
  
  inputError: {
    ...loginPageCommonStyles.inputError,
  } as ViewStyle,
  
  inputIcon: {
    ...loginPageCommonStyles.inputIcon,
  } as ViewStyle,
  
  input: {
    ...loginPageCommonStyles.input,
  } as TextStyle,
  
  eyeIcon: {
    ...loginPageCommonStyles.eyeIcon,
  } as ViewStyle,
  
  fieldError: {
    ...loginPageCommonStyles.fieldError,
  } as TextStyle,
  
  passwordRequirements: {
    ...loginPageCommonStyles.passwordRequirements,
  } as TextStyle,
  
  forgotPassword: {
    ...loginPageCommonStyles.forgotPassword,
  } as ViewStyle,
  
  forgotPasswordText: {
    ...loginPageCommonStyles.forgotPasswordText,
  } as TextStyle,
  
  loginButton: {
    ...loginPageCommonStyles.loginButton,
    borderRadius: 12, // iOS prefers 12px for buttons
  } as ViewStyle,
  
  loginButtonDisabled: {
    ...loginPageCommonStyles.loginButtonDisabled,
  } as ViewStyle,
  
  loginButtonText: {
    ...loginPageCommonStyles.loginButtonText,
  } as TextStyle,
  
  guestButton: {
    ...loginPageCommonStyles.guestButton,
    borderRadius: 12, // iOS prefers 12px
  } as ViewStyle,
  
  guestButtonDisabled: {
    ...loginPageCommonStyles.guestButtonDisabled,
  } as ViewStyle,
  
  guestButtonIcon: {
    ...loginPageCommonStyles.guestButtonIcon,
  } as ViewStyle,
  
  guestButtonText: {
    ...loginPageCommonStyles.guestButtonText,
  } as TextStyle,
  
  divider: {
    ...loginPageCommonStyles.divider,
  } as ViewStyle,
  
  dividerLine: {
    ...loginPageCommonStyles.dividerLine,
  } as ViewStyle,
  
  dividerText: {
    ...loginPageCommonStyles.dividerText,
  } as TextStyle,
  
  signupContainer: {
    ...loginPageCommonStyles.signupContainer,
  } as ViewStyle,
  
  signupText: {
    ...loginPageCommonStyles.signupText,
  } as TextStyle,
  
  signupLink: {
    ...loginPageCommonStyles.signupLink,
  } as TextStyle,
  
  googleButton: {
    ...loginPageCommonStyles.googleButton,
    borderRadius: 12, // iOS prefers 12px
  } as ViewStyle,
  
  googleButtonDisabled: {
    ...loginPageCommonStyles.googleButtonDisabled,
  } as ViewStyle,
  
  googleButtonContent: {
    ...loginPageCommonStyles.googleButtonContent,
  } as ViewStyle,
  
  googleButtonText: {
    ...loginPageCommonStyles.googleButtonText,
  } as TextStyle,
});

