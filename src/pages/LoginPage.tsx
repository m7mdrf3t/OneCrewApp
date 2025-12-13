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
  const { login, googleSignIn, isLoading, error, clearError, createGuestSession } = useApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingGoogleSignIn, setPendingGoogleSignIn] = useState(false);

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
      } else {
        Alert.alert('Login Failed', err.message || 'Please check your credentials and try again.');
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
      
      // Try without category first (for existing users)
      await googleSignIn();
      onLoginSuccess();
    } catch (err: any) {
      console.error('❌ Google Sign-In error in LoginPage:', err);
      
      // Don't show alert if user cancelled - this is expected behavior
      if (err?.message?.toLowerCase().includes('cancelled')) {
        console.log('ℹ️ User cancelled Google Sign-In');
        return;
      }
      
      // Check if error is about category being required
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        // Show category selection modal
        setShowCategoryModal(true);
      } else {
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
      setPendingGoogleSignIn(true);
      await googleSignIn(category, primaryRole);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error in category select:', err);
      const errorMessage = err?.message || err?.toString() || 'Google Sign-In failed. Please try again.';
      Alert.alert('Google Sign-In Failed', errorMessage);
    } finally {
      setPendingGoogleSignIn(false);
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
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
            <Text style={styles.label}>Password</Text>
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
            <Text style={styles.passwordRequirements}>
              Password must be at least 8 characters long
            </Text>
          </View>

          <TouchableOpacity
            onPress={onNavigateToForgotPassword}
            style={styles.forgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

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

          <TouchableOpacity
            style={[styles.guestButton, isLoading && styles.guestButtonDisabled]}
            onPress={handleGuestMode}
            disabled={isLoading}
          >
            <Ionicons name="eye" size={20} color="#fff" style={styles.guestButtonIcon} />
            <Text style={styles.guestButtonText}>Browse as Guest</Text>
          </TouchableOpacity>

          {/* Google Sign-In temporarily hidden */}
          {/* <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

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
          </TouchableOpacity> */}

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateToSignup} disabled={isLoading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CategorySelectionModal
        visible={showCategoryModal}
        onSelect={handleCategorySelect}
        onCancel={() => setShowCategoryModal(false)}
        isLoading={isLoading || pendingGoogleSignIn}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  eyeIcon: {
    padding: 4,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  passwordRequirements: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  guestButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  guestButtonIcon: {
    marginRight: 8,
  },
  guestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d4d4d8',
  },
  dividerText: {
    color: '#71717a',
    fontSize: 14,
    marginHorizontal: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#71717a',
    fontSize: 14,
  },
  signupLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginPage;
