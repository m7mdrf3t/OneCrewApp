/**
 * ForgotPasswordPage Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { semanticSpacing } from '../constants/spacing';

export const forgotPasswordPageCommonStyles = {
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  } as ViewStyle,
  
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  backButton: {
    padding: 4,
    marginRight: 12,
  } as ViewStyle,
  
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#000',
  } as TextStyle,
  
  placeholder: {
    width: 32,
  } as ViewStyle,
  
  subtitle: {
    fontSize: 16,
    color: '#71717a',
    lineHeight: 24,
    marginBottom: 32,
  } as TextStyle,
  
  successIcon: {
    alignItems: 'center' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  emailText: {
    fontWeight: '600' as const,
    color: '#000',
  } as TextStyle,
  
  instructions: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    textAlign: 'center' as const,
    marginBottom: 32,
  } as TextStyle,
  
  errorContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  } as ViewStyle,
  
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  } as TextStyle,
  
  inputContainer: {
    marginBottom: 24,
  } as ViewStyle,
  
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
    marginBottom: 8,
  } as TextStyle,
  
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as ViewStyle,
  
  inputError: {
    borderColor: '#ef4444',
  } as ViewStyle,
  
  inputValid: {
    borderColor: '#10b981',
  } as ViewStyle,
  
  inputInvalid: {
    borderColor: '#ef4444',
  } as ViewStyle,
  
  inputIcon: {
    marginRight: 12,
  } as ViewStyle,
  
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  } as TextStyle,
  
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  } as TextStyle,
  
  sendButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  } as ViewStyle,
  
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
  
  resendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 16,
  } as ViewStyle,
  
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
  
  backToLoginButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  } as ViewStyle,
  
  backToLoginText: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
  
  helpContainer: {
    alignItems: 'center' as const,
  } as ViewStyle,
  
  helpText: {
    fontSize: 14,
    color: '#71717a',
  } as TextStyle,
  
  helpLink: {
    color: '#3b82f6',
    fontWeight: '600' as const,
  } as TextStyle,
  
  loadingOverlay: {
    alignItems: 'center' as const,
    marginBottom: 16,
  } as ViewStyle,
  
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717a',
  } as TextStyle,
  
  buttonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  buttonSpinner: {
    marginRight: 8,
  } as ViewStyle,
};
