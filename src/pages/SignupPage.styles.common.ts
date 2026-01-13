/**
 * SignupPage Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { semanticSpacing } from '../constants/spacing';

export const signupPageCommonStyles = {
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
  
  passwordRequirementsList: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  } as ViewStyle,
  
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#000',
    marginBottom: 8,
  } as TextStyle,
  
  requirementItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  } as ViewStyle,
  
  requirementText: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 6,
  } as TextStyle,
  
  requirementTextMet: {
    color: '#10b981',
  } as TextStyle,
  
  categoryContainer: {
    flexDirection: 'row' as const,
    gap: 8,
  } as ViewStyle,
  
  categoryButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  } as ViewStyle,
  
  categoryButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  } as ViewStyle,
  
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#71717a',
  } as TextStyle,
  
  categoryButtonTextActive: {
    color: '#fff',
  } as TextStyle,
  
  roleScrollView: {
    flex: 1,
  } as ViewStyle,
  
  customRolesSection: {
    marginTop: 10,
  } as ViewStyle,
  
  customRoleInputRow: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  } as ViewStyle,
  
  customRoleInput: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
  } as TextStyle,
  
  customRoleHint: {
    marginTop: 6,
    marginLeft: 4,
    fontSize: 11,
    color: '#71717a',
  } as TextStyle,
  
  customRolesTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#71717a',
    marginBottom: 6,
    marginLeft: 4,
  } as TextStyle,
  
  roleLoadingContainer: {
    paddingVertical: 12,
    alignItems: 'center' as const,
  } as ViewStyle,
  
  roleLoadingText: {
    color: '#71717a',
    fontSize: 14,
  } as TextStyle,
  
  roleButton: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  } as ViewStyle,
  
  roleButtonActive: {
    backgroundColor: '#3b82f6',
  } as ViewStyle,
  
  roleButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#71717a',
  } as TextStyle,
  
  roleButtonTextActive: {
    color: '#fff',
  } as TextStyle,
  
  signupButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    marginBottom: 24,
  } as ViewStyle,
  
  signupButtonDisabled: {
    backgroundColor: '#9ca3af',
  } as ViewStyle,
  
  signupButtonText: {
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
  
  loginContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as ViewStyle,
  
  loginText: {
    color: '#71717a',
    fontSize: 14,
  } as TextStyle,
  
  loginLink: {
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

