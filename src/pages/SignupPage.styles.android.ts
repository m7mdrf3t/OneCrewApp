/**
 * SignupPage Android Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { signupPageCommonStyles } from './SignupPage.styles.common';

export const signupPageAndroidStyles = StyleSheet.create({
  container: {
    ...signupPageCommonStyles.container,
    backgroundColor: '#f5f5f5', // Material Design background
  } as ViewStyle,
  
  scrollContainer: {
    ...signupPageCommonStyles.scrollContainer,
  } as ViewStyle,
  
  header: {
    ...signupPageCommonStyles.header,
  } as ViewStyle,
  
  title: {
    ...signupPageCommonStyles.title,
  } as TextStyle,
  
  subtitle: {
    ...signupPageCommonStyles.subtitle,
  } as TextStyle,
  
  form: {
    ...signupPageCommonStyles.form,
  } as ViewStyle,
  
  errorContainer: {
    ...signupPageCommonStyles.errorContainer,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  errorText: {
    ...signupPageCommonStyles.errorText,
  } as TextStyle,
  
  inputContainer: {
    ...signupPageCommonStyles.inputContainer,
  } as ViewStyle,
  
  label: {
    ...signupPageCommonStyles.label,
  } as TextStyle,
  
  inputWrapper: {
    ...signupPageCommonStyles.inputWrapper,
    borderRadius: 4, // Material Design prefers 4px for inputs
  } as ViewStyle,
  
  inputError: {
    ...signupPageCommonStyles.inputError,
  } as ViewStyle,
  
  inputIcon: {
    ...signupPageCommonStyles.inputIcon,
  } as ViewStyle,
  
  input: {
    ...signupPageCommonStyles.input,
  } as TextStyle,
  
  eyeIcon: {
    ...signupPageCommonStyles.eyeIcon,
  } as ViewStyle,
  
  fieldError: {
    ...signupPageCommonStyles.fieldError,
  } as TextStyle,
  
  passwordRequirements: {
    ...signupPageCommonStyles.passwordRequirements,
  } as TextStyle,
  
  passwordRequirementsList: {
    ...signupPageCommonStyles.passwordRequirementsList,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  requirementsTitle: {
    ...signupPageCommonStyles.requirementsTitle,
  } as TextStyle,
  
  requirementItem: {
    ...signupPageCommonStyles.requirementItem,
  } as ViewStyle,
  
  requirementText: {
    ...signupPageCommonStyles.requirementText,
  } as TextStyle,
  
  requirementTextMet: {
    ...signupPageCommonStyles.requirementTextMet,
  } as TextStyle,
  
  categoryContainer: {
    ...signupPageCommonStyles.categoryContainer,
  } as ViewStyle,
  
  categoryButton: {
    ...signupPageCommonStyles.categoryButton,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  categoryButtonActive: {
    ...signupPageCommonStyles.categoryButtonActive,
  } as ViewStyle,
  
  categoryButtonText: {
    ...signupPageCommonStyles.categoryButtonText,
  } as TextStyle,
  
  categoryButtonTextActive: {
    ...signupPageCommonStyles.categoryButtonTextActive,
  } as TextStyle,
  
  roleScrollView: {
    ...signupPageCommonStyles.roleScrollView,
  } as ViewStyle,
  
  customRolesSection: {
    ...signupPageCommonStyles.customRolesSection,
  } as ViewStyle,
  
  customRoleInputRow: {
    ...signupPageCommonStyles.customRoleInputRow,
  } as ViewStyle,
  
  customRoleInput: {
    ...signupPageCommonStyles.customRoleInput,
  } as TextStyle,
  
  customRoleHint: {
    ...signupPageCommonStyles.customRoleHint,
  } as TextStyle,
  
  customRolesTitle: {
    ...signupPageCommonStyles.customRolesTitle,
  } as TextStyle,
  
  roleLoadingContainer: {
    ...signupPageCommonStyles.roleLoadingContainer,
  } as ViewStyle,
  
  roleLoadingText: {
    ...signupPageCommonStyles.roleLoadingText,
  } as TextStyle,
  
  roleButton: {
    ...signupPageCommonStyles.roleButton,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  roleButtonActive: {
    ...signupPageCommonStyles.roleButtonActive,
  } as ViewStyle,
  
  roleButtonText: {
    ...signupPageCommonStyles.roleButtonText,
  } as TextStyle,
  
  roleButtonTextActive: {
    ...signupPageCommonStyles.roleButtonTextActive,
  } as TextStyle,
  
  signupButton: {
    ...signupPageCommonStyles.signupButton,
    borderRadius: 4, // Material Design prefers 4px for buttons
  } as ViewStyle,
  
  signupButtonDisabled: {
    ...signupPageCommonStyles.signupButtonDisabled,
  } as ViewStyle,
  
  signupButtonText: {
    ...signupPageCommonStyles.signupButtonText,
  } as TextStyle,
  
  divider: {
    ...signupPageCommonStyles.divider,
  } as ViewStyle,
  
  dividerLine: {
    ...signupPageCommonStyles.dividerLine,
  } as ViewStyle,
  
  dividerText: {
    ...signupPageCommonStyles.dividerText,
  } as TextStyle,
  
  loginContainer: {
    ...signupPageCommonStyles.loginContainer,
  } as ViewStyle,
  
  loginText: {
    ...signupPageCommonStyles.loginText,
  } as TextStyle,
  
  loginLink: {
    ...signupPageCommonStyles.loginLink,
  } as TextStyle,
  
  googleButton: {
    ...signupPageCommonStyles.googleButton,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  googleButtonDisabled: {
    ...signupPageCommonStyles.googleButtonDisabled,
  } as ViewStyle,
  
  googleButtonContent: {
    ...signupPageCommonStyles.googleButtonContent,
  } as ViewStyle,
  
  googleButtonText: {
    ...signupPageCommonStyles.googleButtonText,
  } as TextStyle,
});

