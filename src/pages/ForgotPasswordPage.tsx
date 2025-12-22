import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import PasswordResetProgress from '../components/PasswordResetProgress';
import SuccessAnimation from '../components/SuccessAnimation';
import { createPlatformStyles } from '../utils/platformStyles';
import { forgotPasswordPageCommonStyles } from './ForgotPasswordPage.styles.common';
import { forgotPasswordPageIosStyles } from './ForgotPasswordPage.styles.ios';
import { forgotPasswordPageAndroidStyles } from './ForgotPasswordPage.styles.android';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
  onNavigateToVerifyOtp: (email: string) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
  onNavigateToVerifyOtp,
}) => {
  const { forgotPassword, isLoading, error, clearError } = useApi();
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendResetEmail = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      console.log('🔄 Starting password reset request for:', email.trim().toLowerCase());
      await forgotPassword(email.trim().toLowerCase());
      
      console.log('✅ Password reset request completed successfully');
      
      // Show success animation
      setShowSuccess(true);
      
      // Navigate to OTP verification screen after delay
      setTimeout(() => {
        onNavigateToVerifyOtp(email.trim().toLowerCase());
      }, 500);
    } catch (err: any) {
      console.error('❌ Error in handleSendResetEmail:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to send reset email. Please try again.';
      
      // Ensure error is set in context
      if (error) {
        console.log('📝 Error from context:', error);
      }
      
      // Show a more helpful alert for rate limiting
      if (errorMessage.toLowerCase().includes('too many') || 
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('wait')) {
        Alert.alert(
          'Too Many Requests',
          errorMessage + '\n\nThis is a security measure to prevent abuse. Please wait a few minutes before trying again.',
          [
            { text: 'OK' },
            { text: 'Retry', onPress: handleSendResetEmail, style: 'default' },
          ]
        );
      } else {
        Alert.alert(
          'Error Sending Verification Code',
          errorMessage + '\n\nPlease check your email address and try again.',
          [
            { text: 'OK' },
            { text: 'Retry', onPress: handleSendResetEmail, style: 'default' },
          ]
        );
      }
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: '' }));
    }
    
    // Real-time email validation feedback
    if (text.length > 0) {
      const isValid = /\S+@\S+\.\S+/.test(text);
      setEmailValid(isValid);
    } else {
      setEmailValid(null);
    }
    
    clearError();
  };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <PasswordResetProgress currentStep={1} />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onNavigateToLogin}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Forgot Password?</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a 6-digit verification code to reset your password.
        </Text>

        {showSuccess && (
          <SuccessAnimation
            message="Verification code sent!"
            autoDismiss={false}
          />
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[
            styles.inputWrapper,
            formErrors.email && styles.inputError,
            emailValid === true && styles.inputValid,
            emailValid === false && email.length > 0 && styles.inputInvalid,
          ]}>
            <Ionicons
              name="mail"
              size={20}
              color={
                emailValid === true ? '#10b981' :
                emailValid === false && email.length > 0 ? '#ef4444' :
                '#71717a'
              }
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !showSuccess}
            />
            {emailValid === true && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
            {emailValid === false && email.length > 0 && (
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            )}
          </View>
          {formErrors.email && <Text style={styles.fieldError}>{formErrors.email}</Text>}
          {emailValid === false && email.length > 0 && !formErrors.email && (
            <Text style={styles.fieldError}>Please enter a valid email address</Text>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Sending verification code...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendButton, (isLoading || showSuccess) && styles.sendButtonDisabled]}
          onPress={handleSendResetEmail}
          disabled={isLoading || showSuccess}
        >
          {isLoading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
              <Text style={styles.sendButtonText}>Sending Code...</Text>
            </View>
          ) : (
            <Text style={styles.sendButtonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Remember your password?{' '}
            <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
              <Text style={styles.helpLink}>Sign In</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// Create platform-specific styles
const styles = createPlatformStyles({
  common: forgotPasswordPageCommonStyles,
  ios: forgotPasswordPageIosStyles,
  android: forgotPasswordPageAndroidStyles,
});

export default ForgotPasswordPage;
