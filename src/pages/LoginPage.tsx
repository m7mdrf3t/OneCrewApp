import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [rememberMe, setRememberMe] = useState(false);
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
        // Email is preserved to improve UX - user doesn't need to retype it
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
      
      // Try OAuth directly (for existing users - no category needed)
      await googleSignIn();
      setPendingAuthProvider(null);
      onLoginSuccess();
    } catch (err: any) {
      console.error('❌ Google Sign-In error in LoginPage:', err);
      
      // Don't show alert if user cancelled - this is expected behavior
      if (err?.message?.toLowerCase().includes('cancelled')) {
        console.log('ℹ️ User cancelled Google Sign-In');
        setPendingAuthProvider(null);
        return;
      }
      
      // Only show category modal if backend requires it (edge case for new users on login page)
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        // Show category selection modal as fallback
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
      
      // Store category and role in AsyncStorage before OAuth
      if (category) {
        await AsyncStorage.setItem('pending_category', category);
      }
      if (primaryRole) {
        await AsyncStorage.setItem('pending_role', primaryRole);
      }
      
      // Proceed with OAuth (selections will be retrieved in ApiContext)
      if (pendingAuthProvider === 'google') {
        setPendingGoogleSignIn(true);
        await googleSignIn();
      } else if (pendingAuthProvider === 'apple') {
        setPendingAppleSignIn(true);
        await appleSignIn();
      } else {
        // Fallback to Google if provider not set
        setPendingGoogleSignIn(true);
        await googleSignIn();
      }
      
      setPendingAuthProvider(null);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Sign-In error in category select:', err);
      
      // Clear AsyncStorage on error
      try {
        await AsyncStorage.removeItem('pending_category');
        await AsyncStorage.removeItem('pending_role');
      } catch (clearErr) {
        console.warn('Failed to clear AsyncStorage:', clearErr);
      }
      
      // Don't show alert if user cancelled - this is expected behavior
      if (err?.message?.toLowerCase().includes('cancelled')) {
        console.log('ℹ️ User cancelled OAuth');
        setPendingAuthProvider(null);
        return;
      }
      
      // Fallback: if backend still requires category, show modal again
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        setShowCategoryModal(true);
      } else {
        const providerName = pendingAuthProvider === 'apple' ? 'Apple' : 'Google';
        const errorMessage = err?.message || err?.toString() || `${providerName} Sign-In failed. Please try again.`;
        Alert.alert(`${providerName} Sign-In Failed`, errorMessage);
        setPendingAuthProvider(null);
      }
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
      
      // Try OAuth directly (for existing users - no category needed)
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
      
      // Only show category modal if backend requires it (edge case for new users on login page)
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        // Show category selection modal as fallback
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
        {/* Gradient Header */}
        <LinearGradient
          colors={['#E8E0F5', '#E0D5F0']}
          style={styles.gradientHeader}
        >
          <View style={styles.gridOverlay} />
          <View style={styles.headerContent}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>to your Account</Text>
          </View>
        </LinearGradient>

        {/* White Card Container */}
        <View style={styles.cardContainer}>
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
              </View>
            </View>

            {/* Remember Me and Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNavigateToForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forget Password</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Log in'}
              </Text>
            </TouchableOpacity>

            {/* Or divider */}
            <View style={styles.divider}>
              <Text style={styles.dividerText}>Or log in with</Text>
            </View>

            {/* Social Login Buttons - Side by Side */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton, (isLoading || pendingAppleSignIn) && styles.socialButtonDisabled]}
                onPress={handleAppleSignIn}
                disabled={isLoading || pendingAppleSignIn}
              >
                {Platform.OS === 'ios' && (
                  <>
                    <Ionicons name="logo-apple" size={20} color="#000" />
                    <Text style={styles.socialButtonText}>
                      {pendingAppleSignIn ? 'Signing In...' : 'Apple'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, (isLoading || pendingGoogleSignIn) && styles.socialButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isLoading || pendingGoogleSignIn}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.socialButtonText}>
                  {pendingGoogleSignIn ? 'Signing In...' : 'Google'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have account? </Text>
              <TouchableOpacity
                onPress={onNavigateToSignup}
                disabled={isLoading}
              >
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <CategorySelectionModal
        visible={showCategoryModal}
        onSelect={handleCategorySelect}
        onCancel={async () => {
          setShowCategoryModal(false);
          setPendingAuthProvider(null);
          try {
            await AsyncStorage.removeItem('pending_category');
            await AsyncStorage.removeItem('pending_role');
          } catch (err) {
            console.warn('Failed to clear AsyncStorage on cancel:', err);
          }
        }}
        isLoading={isLoading || pendingGoogleSignIn || pendingAppleSignIn}
      />
    </KeyboardAvoidingView>
  );
};

// Import platform-specific styles
import { createPlatformStyles } from '../utils/platformStyles';
import { loginPageCommonStyles } from './LoginPage.styles.common';
import { loginPageIosStyles } from './LoginPage.styles.ios';
import { loginPageAndroidStyles } from './LoginPage.styles.android';

// Create platform-specific styles
const styles = createPlatformStyles({
  common: loginPageCommonStyles,
  ios: loginPageIosStyles,
  android: loginPageAndroidStyles,
});

export default LoginPage;
