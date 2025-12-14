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
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator';

interface ChangePasswordPageProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
}

const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ onBack, theme = 'light' }) => {
  const { changePassword, isLoading, error, clearError } = useApi();
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        errors.newPassword = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await changePassword(formData.currentPassword, formData.newPassword);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password. Please try again.';
      
      if (errorMessage.toLowerCase().includes('current password') || 
          errorMessage.toLowerCase().includes('incorrect password')) {
        setFormErrors(prev => ({ ...prev, currentPassword: 'Current password is incorrect' }));
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
    if (error) {
      clearError();
    }
  };

  const handleResetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setFormErrors({});
    clearError();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: isDark ? '#000' : '#fff', borderBottomColor: isDark ? '#1f2937' : '#000' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Text style={[styles.sectionDescription, { color: isDark ? '#9ca3af' : '#71717a' }]}>
            Update your password to keep your account secure. After changing your password, you'll need to sign in again.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Current Password</Text>
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', borderColor: isDark ? '#1f2937' : '#d4d4d8' },
              formErrors.currentPassword && styles.inputError
            ]}>
              <Ionicons name="lock-closed" size={20} color={isDark ? '#9ca3af' : '#71717a'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                placeholder="Enter your current password"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                value={formData.currentPassword}
                onChangeText={(text) => handleInputChange('currentPassword', text)}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
                disabled={isLoading}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={isDark ? '#9ca3af' : '#71717a'}
                />
              </TouchableOpacity>
            </View>
            {formErrors.currentPassword && (
              <Text style={styles.fieldError}>{formErrors.currentPassword}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>New Password</Text>
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', borderColor: isDark ? '#1f2937' : '#d4d4d8' },
              formErrors.newPassword && styles.inputError
            ]}>
              <Ionicons name="lock-closed" size={20} color={isDark ? '#9ca3af' : '#71717a'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                placeholder="Enter your new password"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                value={formData.newPassword}
                onChangeText={(text) => handleInputChange('newPassword', text)}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
                disabled={isLoading}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={isDark ? '#9ca3af' : '#71717a'}
                />
              </TouchableOpacity>
            </View>
            {formErrors.newPassword && (
              <Text style={styles.fieldError}>{formErrors.newPassword}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Confirm New Password</Text>
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', borderColor: isDark ? '#1f2937' : '#d4d4d8' },
              formErrors.confirmPassword && styles.inputError
            ]}>
              <Ionicons name="lock-closed" size={20} color={isDark ? '#9ca3af' : '#71717a'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                placeholder="Confirm your new password"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
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
                  color={isDark ? '#9ca3af' : '#71717a'}
                />
              </TouchableOpacity>
            </View>
            {formErrors.confirmPassword && (
              <Text style={styles.fieldError}>{formErrors.confirmPassword}</Text>
            )}
          </View>

          <View style={[styles.passwordRequirements, { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb' }]}>
            <Text style={[styles.requirementsTitle, { color: isDark ? '#fff' : '#000' }]}>Password Requirements:</Text>
            {(() => {
              const passwordValidation = validatePassword(formData.newPassword);
              const requirements = getPasswordRequirements();
              return requirements.map((req) => {
                const isMet = req.test(formData.newPassword);
                return (
                  <View key={req.key} style={styles.requirementItem}>
                    <Ionicons
                      name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={isMet ? '#10b981' : '#9ca3af'}
                    />
                    <Text style={[
                      styles.requirementText,
                      { color: isDark ? '#9ca3af' : '#9ca3af' },
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
                name={formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? '#10b981' : '#9ca3af'}
              />
              <Text style={[
                styles.requirementText,
                { color: isDark ? '#9ca3af' : '#9ca3af' },
                formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 && styles.requirementTextMet
              ]}>
                Passwords match
              </Text>
            </View>
            {formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword && (
              <View style={styles.requirementItem}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color="#ef4444"
                />
                <Text style={[styles.requirementText, styles.requirementTextError]}>
                  New password must be different from current password
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.cancelButton, 
                { 
                  backgroundColor: isDark ? '#1a1a1a' : '#f4f4f5',
                  borderColor: isDark ? '#1f2937' : '#d4d4d8'
                },
                isLoading && styles.buttonDisabled
              ]}
              onPress={handleResetForm}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: isDark ? '#9ca3af' : '#71717a' }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.changeButton, isLoading && styles.changeButtonDisabled]}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.changeButtonText}>Changing...</Text>
              ) : (
                <Text style={styles.changeButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoItem, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
              After changing your password, all your sessions will be invalidated for security reasons. You'll need to sign in again with your new password.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 24,
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
    backgroundColor: '#f9fafb',
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
  requirementTextError: {
    color: '#ef4444',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  cancelButtonText: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    flex: 2,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  changeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  infoSection: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
    marginLeft: 12,
  },
});

export default ChangePasswordPage;


