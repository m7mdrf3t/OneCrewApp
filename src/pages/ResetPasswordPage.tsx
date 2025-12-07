import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator';
import PasswordResetProgress from '../components/PasswordResetProgress';
import SuccessAnimation from '../components/SuccessAnimation';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

interface ResetPasswordPageProps {
  resetToken: string;
  onNavigateToLogin: () => void;
  onResetSuccess: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  resetToken,
  onNavigateToLogin,
  onResetSuccess,
}) => {
  const { resetPassword, isLoading, error, clearError } = useApi();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0]; // Show first error
      }
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    if (isLoading || showSuccess) return; // Prevent double submission

    try {
      clearError();
      // Use resetPassword from context (handles token clearing automatically)
      await resetPassword(resetToken, formData.password);
      
      // Show success screen
      setShowSuccess(true);
      
      // Auto-navigate to login after 2 seconds
      setTimeout(() => {
        onResetSuccess();
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reset password. Please try again.';
      
      // Handle rate limiting (429)
      if (errorMessage.toLowerCase().includes('rate limit') || 
          errorMessage.toLowerCase().includes('too many') ||
          errorMessage.toLowerCase().includes('429') ||
          errorMessage.toLowerCase().includes('wait')) {
        Alert.alert(
          'Too Many Requests',
          errorMessage + '\n\nThis is a security measure to prevent abuse. Please wait before trying again.',
          [
            { text: 'OK' },
            { text: 'Retry', onPress: handleResetPassword, style: 'default' },
          ]
        );
      }
      // Handle token expiration/invalid errors
      else if (errorMessage.toLowerCase().includes('token') || 
               errorMessage.toLowerCase().includes('expired') || 
               errorMessage.toLowerCase().includes('invalid')) {
        Alert.alert(
          'Reset Token Expired',
          'The reset token has expired or is invalid. Please request a new password reset.',
          [
            {
              text: 'Request New Reset',
              onPress: () => onNavigateToLogin(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Show success screen
  if (showSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <PasswordResetProgress currentStep={3} />
          <SuccessAnimation
            message="Password Reset Successful!"
            autoDismiss={false}
          />
          <Text style={styles.successSubtitle}>
            Your password has been reset successfully.
          </Text>
          <Text style={styles.redirectText}>
            Redirecting to login...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <PasswordResetProgress currentStep={3} />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onNavigateToLogin}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.subtitle}>
          Enter your new password below. Make sure it's secure and easy to remember.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.inputWrapper, formErrors.password && styles.inputError]}>
            <Ionicons name="lock-closed" size={20} color="#71717a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your new password"
              placeholderTextColor="#9ca3af"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              textContentType="newPassword"
              autoComplete="password-new"
              passwordRules="minlength: 8; required: lower; required: upper; required: digit;"
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
          {formData.password.length > 0 && (
            <PasswordStrengthMeter password={formData.password} />
          )}
          {formErrors.password && <Text style={styles.fieldError}>{formErrors.password}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={[styles.inputWrapper, formErrors.confirmPassword && styles.inputError]}>
            <Ionicons name="lock-closed" size={20} color="#71717a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your new password"
              placeholderTextColor="#9ca3af"
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              textContentType="newPassword"
              autoComplete="password-new"
              passwordRules="minlength: 8; required: lower; required: upper; required: digit;"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#71717a"
              />
            </TouchableOpacity>
          </View>
          {formErrors.confirmPassword && <Text style={styles.fieldError}>{formErrors.confirmPassword}</Text>}
        </View>

        <View style={styles.passwordRequirements}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          {(() => {
            const passwordValidation = validatePassword(formData.password);
            const requirements = getPasswordRequirements();
            return requirements.map((req) => {
              const isMet = req.test(formData.password);
              return (
                <View key={req.key} style={styles.requirementItem}>
                  <Ionicons
                    name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={isMet ? '#10b981' : '#9ca3af'}
                  />
                  <Text style={[
                    styles.requirementText,
                    isMet && styles.requirementTextMet
                  ]}>
                    {req.label}
                  </Text>
                </View>
              );
            });
          })()}
          <View style={styles.requirementItem}>
            <Ionicons
              name={formData.password === formData.confirmPassword && formData.password.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={formData.password === formData.confirmPassword && formData.password.length > 0 ? '#10b981' : '#9ca3af'}
            />
            <Text style={[
              styles.requirementText,
              formData.password === formData.confirmPassword && formData.password.length > 0 && styles.requirementTextMet
            ]}>
              Passwords match
            </Text>
          </View>
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Resetting password...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.resetButton, (isLoading || showSuccess) && styles.resetButtonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading || showSuccess}
        >
          {isLoading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={styles.buttonSpinner} />
              <Text style={styles.resetButtonText}>Resetting...</Text>
            </View>
          ) : (
            <Text style={styles.resetButtonText}>Reset Password</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#71717a',
    lineHeight: 24,
    marginBottom: 32,
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
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  requirementTextMet: {
    color: '#10b981',
  },
  resetButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#71717a',
  },
  helpLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  successContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  redirectText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingOverlay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717a',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: 8,
  },
});

export default ResetPasswordPage;
