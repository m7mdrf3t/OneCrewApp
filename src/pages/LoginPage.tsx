import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import CategorySelectionModal from '../components/CategorySelectionModal';

interface LoginPageProps {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onLoginSuccess: () => void;
  onGuestMode: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onLoginSuccess,
  onGuestMode,
}) => {
  const { login, googleSignIn, appleSignIn, isLoading, error, clearError, createGuestSession } = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingGoogleSignIn, setPendingGoogleSignIn] = useState(false);
  const [pendingAppleSignIn, setPendingAppleSignIn] = useState(false);
  const [pendingAuthProvider, setPendingAuthProvider] = useState<'google' | 'apple' | null>(null);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await login({ email: email.trim().toLowerCase(), password });
      onLoginSuccess();
    } catch (err: any) {
      // Handle account lockout specifically
      if (err.code === 'ACCOUNT_LOCKOUT' || err.message?.toLowerCase().includes('lockout') || err.message?.toLowerCase().includes('locked')) {
        const lockoutDuration = err.lockoutDuration || 3600; // Default 1 hour
        const remainingTime = err.remainingTime || lockoutDuration;
        const minutes = Math.ceil(remainingTime / 60);
        
        Alert.alert(
          'Account Locked',
          `Your account has been temporarily locked due to too many failed login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
          [{ text: 'OK' }]
        );
      } else if (err.code === 'ACCOUNT_DELETION_PENDING') {
        // Handle account deletion pending - user should still be able to login during grace period
        let message = err.message || 'Your account is scheduled for deletion.';
        if (err.expirationDate) {
          const expirationDate = new Date(err.expirationDate).toLocaleDateString();
          message += `\n\nExpiration Date: ${expirationDate}`;
        }
        if (err.daysRemaining !== undefined) {
          message += `\n\nDays Remaining: ${err.daysRemaining}`;
        }
        message += '\n\nYou can still log in during the grace period to restore your account.';
        
        Alert.alert(
          'Account Deletion Pending',
          message,
          [{ text: 'OK' }]
        );
      } else {
        // Clear only the password field on authentication errors
        setPassword('');
        
        // Provide a user-friendly error message
        let errorMessage = err.message || 'Please check your credentials and try again.';
        
        // Normalize common error messages for better UX
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes('invalid') && (errorLower.includes('email') || errorLower.includes('password'))) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorLower.includes('network') || errorLower.includes('connection')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorLower.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
        
        Alert.alert('Login Failed', errorMessage);
      }
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleGuestMode = async () => {
    try {
      clearError();
      await createGuestSession();
      onGuestMode();
    } catch (err: any) {
      Alert.alert('Guest Mode Failed', err.message || 'Unable to start guest browsing. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    // Prevent multiple simultaneous calls
    if (pendingGoogleSignIn || isLoading) {
      console.log('⚠️ Google Sign-In already in progress, ignoring duplicate call');
      return;
    }

    try {
      clearError();
      setPendingGoogleSignIn(true);
      setPendingAuthProvider('google');
      
      // Try without category first (for existing users)
      await googleSignIn();
      onLoginSuccess();
    } catch (err: any) {
      console.error('❌ Google Sign-In error in LoginPage:', err);
      
      // Don't show alert if user cancelled - this is expected behavior
      if (err?.message?.toLowerCase().includes('cancelled')) {
        console.log('ℹ️ User cancelled Google Sign-In');
        setPendingAuthProvider(null);
        return;
      }
      
      // Check if error is about category being required
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        // Show category selection modal
        setShowCategoryModal(true);
      } else {
        setPendingAuthProvider(null);
        const errorMessage = err?.message || err?.toString() || 'Google Sign-In failed. Please try again.';
        Alert.alert('Google Sign-In Failed', errorMessage);
      }
    } finally {
      setPendingGoogleSignIn(false);
    }
  };

  const handleCategorySelect = async (category: 'crew' | 'talent' | 'company', primaryRole?: string) => {
    try {
      setShowCategoryModal(false);
      clearError();
      
      if (pendingAuthProvider === 'google') {
        setPendingGoogleSignIn(true);
        await googleSignIn(category, primaryRole);
      } else if (pendingAuthProvider === 'apple') {
        setPendingAppleSignIn(true);
        await appleSignIn(category, primaryRole);
      } else {
        // Fallback to Google if provider not set
        setPendingGoogleSignIn(true);
        await googleSignIn(category, primaryRole);
      }
      
      setPendingAuthProvider(null);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Sign-In error in category select:', err);
      const providerName = pendingAuthProvider === 'apple' ? 'Apple' : 'Google';
      const errorMessage = err?.message || err?.toString() || `${providerName} Sign-In failed. Please try again.`;
      Alert.alert(`${providerName} Sign-In Failed`, errorMessage);
      setPendingAuthProvider(null);
    } finally {
      setPendingGoogleSignIn(false);
      setPendingAppleSignIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (pendingAppleSignIn || isLoading) {
      console.log('⚠️ Apple Sign-In already in progress, ignoring duplicate call');
      return;
    }

    try {
      clearError();
      setPendingAppleSignIn(true);
      setPendingAuthProvider('apple');
      
      // Try without category first (for existing users)
      await appleSignIn();
      setPendingAuthProvider(null);
      onLoginSuccess();
    } catch (err: any) {
      console.error('❌ Apple Sign-In error in LoginPage:', err);
      
      // Don't show alert if user cancelled - this is expected behavior
      if (err?.message?.toLowerCase().includes('cancelled')) {
        console.log('ℹ️ User cancelled Apple Sign-In');
        setPendingAuthProvider(null);
        return;
      }
      
      // Check if error is about category being required
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        // Show category selection modal
        setShowCategoryModal(true);
      } else {
        setPendingAuthProvider(null);
        const errorMessage = err?.message || err?.toString() || 'Apple Sign-In failed. Please try again.';
        Alert.alert('Apple Sign-In Failed', errorMessage);
      }
    } finally {
      setPendingAppleSignIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your cool steps account</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, formErrors.email && styles.inputError]}>
                <Ionicons name="mail" size={20} color="#71717a" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textContentType="emailAddress"
                  autoComplete="email"
                  onFocus={() => {
                    // Clear any errors when user focuses on input
                    if (formErrors.email) {
                      setFormErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                />
              </View>
              {formErrors.email && <Text style={styles.fieldError}>{formErrors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={onNavigateToForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrapper, formErrors.password && styles.inputError]}>
                <Ionicons name="lock-closed" size={20} color="#71717a" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textContentType="password"
                  autoComplete="password"
                  onFocus={() => {
                    // Clear any errors when user focuses on input
                    if (formErrors.password) {
                      setFormErrors(prev => ({ ...prev, password: '' }));
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#71717a"
                  />
                </TouchableOpacity>
              </View>
              {formErrors.password && <Text style={styles.fieldError}>{formErrors.password}</Text>}
              {password.length > 0 && password.length < 8 && !formErrors.password && (
                <Text style={styles.passwordRequirements}>
                  Password must be at least 8 characters long
                </Text>
              )}
            </View>
          </View>

          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.loginButtonText}>Signing In...</Text>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.googleButton, (isLoading || pendingGoogleSignIn) && styles.googleButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isLoading || pendingGoogleSignIn}
              >
                <View style={styles.googleButtonContent}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={styles.googleButtonText}>
                    {pendingGoogleSignIn ? 'Signing In...' : 'Sign in with Google'}
                  </Text>
                </View>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.appleButton, (isLoading || pendingAppleSignIn) && styles.appleButtonDisabled]}
                  onPress={handleAppleSignIn}
                  disabled={isLoading || pendingAppleSignIn}
                >
                  <View style={styles.appleButtonContent}>
                    <Ionicons name="logo-apple" size={20} color="#fff" />
                    <Text style={styles.appleButtonText}>
                      {pendingAppleSignIn ? 'Signing In...' : 'Sign in with Apple'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.footerSection}>
            <TouchableOpacity
              style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
              onPress={onNavigateToSignup}
              disabled={isLoading}
            >
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestLink}
              onPress={handleGuestMode}
              disabled={isLoading}
            >
              <Text style={styles.guestLinkText}>Browse as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CategorySelectionModal
        visible={showCategoryModal}
        onSelect={handleCategorySelect}
        onCancel={() => {
          setShowCategoryModal(false);
          setPendingAuthProvider(null);
        }}
        isLoading={isLoading || pendingGoogleSignIn || pendingAppleSignIn}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
  passwordRequirements: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonSection: {
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e4e4e7',
  },
  dividerText: {
    color: '#71717a',
    fontSize: 13,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  socialButtons: {
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  appleButtonDisabled: {
    opacity: 0.5,
  },
  appleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footerSection: {
    alignItems: 'center',
    gap: 16,
  },
  signupButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  signupButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  guestLink: {
    paddingVertical: 8,
  },
  guestLinkText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#71717a',
    fontSize: 14,
  },
  loginLink: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default LoginPage;
