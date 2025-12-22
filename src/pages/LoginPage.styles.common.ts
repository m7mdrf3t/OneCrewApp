/**
 * LoginPage Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { semanticSpacing } from '../constants/spacing';

export const loginPageCommonStyles = {
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  } as ViewStyle,
  
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    padding: 24,
  } as ViewStyle,
  
  header: {
    alignItems: 'center' as const,
    marginBottom: 40,
  } as ViewStyle,
  
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#000',
    marginBottom: 8,
  } as TextStyle,
  
  subtitle: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center' as const,
  } as TextStyle,
  
  form: {
    width: '100%',
  } as ViewStyle,
  
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
    marginBottom: 20,
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
  
  inputIcon: {
    marginRight: 12,
  } as ViewStyle,
  
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  } as TextStyle,
  
  eyeIcon: {
    padding: 4,
  } as ViewStyle,
  
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  } as TextStyle,
  
  passwordRequirements: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic' as const,
  } as TextStyle,
  
  forgotPassword: {
    alignSelf: 'flex-end' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500' as const,
  } as TextStyle,
  
  loginButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  } as ViewStyle,
  
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
  
  guestButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 24,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  guestButtonDisabled: {
    backgroundColor: '#9ca3af',
  } as ViewStyle,
  
  guestButtonIcon: {
    marginRight: 8,
  } as ViewStyle,
  
  guestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
  
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d4d4d8',
  } as ViewStyle,
  
  dividerText: {
    color: '#71717a',
    fontSize: 14,
    marginHorizontal: 16,
  } as TextStyle,
  
  signupContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as ViewStyle,
  
  signupText: {
    color: '#71717a',
    fontSize: 14,
  } as TextStyle,
  
  signupLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600' as const,
  } as TextStyle,
  
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  } as ViewStyle,
  
  googleButtonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  
  googleButtonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  } as ViewStyle,
  
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
};

