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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface ResetPasswordPageProps {
  token: string;
  onNavigateToLogin: () => void;
  onResetSuccess: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token,
  onNavigateToLogin,
  onResetSuccess,
}) => {
  const { api, isLoading, error, clearError } = useApi();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
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

    try {
      clearError();
      await api.auth.resetPassword(token, formData.password);
      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: onResetSuccess,
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
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
          <View style={styles.requirementItem}>
            <Ionicons
              name={formData.password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={formData.password.length >= 6 ? '#10b981' : '#9ca3af'}
            />
            <Text style={[
              styles.requirementText,
              formData.password.length >= 6 && styles.requirementTextMet
            ]}>
              At least 6 characters
            </Text>
          </View>
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

        <TouchableOpacity
          style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.resetButtonText}>Resetting...</Text>
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
});

export default ResetPasswordPage;
