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
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({
  onNavigateToLogin,
  onSignupSuccess,
}) => {
  const { signup, googleSignIn, isLoading, error, clearError } = useApi();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    category: 'crew' as 'crew' | 'talent',
    primaryRole: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingGoogleSignIn, setPendingGoogleSignIn] = useState(false);

  const categories = [
    { key: 'crew', label: 'Crew Member', icon: 'people' },
    { key: 'talent', label: 'Talent', icon: 'star' },
  ];

  const crewRoles = [
    'actor', 'voice_actor', 'director', 'dop', 'editor', 'producer',
    'scriptwriter', 'gaffer', 'grip', 'sound_engineer', 'makeup_artist',
    'stylist', 'vfx', 'colorist'
  ];

  const talentRoles = [
    'actor', 'voice_actor', 'singer', 'dancer', 'model'
  ];

  const getRolesForCategory = (category: string) => {
    switch (category) {
      case 'crew': return crewRoles;
      case 'talent': return talentRoles;
      default: return [];
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

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

    if (!formData.primaryRole) {
      errors.primaryRole = 'Please select your primary role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await signup({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        category: formData.category,
        primary_role: formData.primaryRole,
      });
      onSignupSuccess();
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Please try again.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryChange = (category: 'crew' | 'talent') => {
    setFormData(prev => ({ ...prev, category, primaryRole: '' }));
    setFormErrors(prev => ({ ...prev, primaryRole: '' }));
  };

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      setPendingGoogleSignIn(true);
      // Try without category first (for existing users)
      await googleSignIn();
      onSignupSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error in SignupPage:', err);
      // Check if error is about category being required
      if (err?.code === 'CATEGORY_REQUIRED' || err?.message?.includes('Category') || err?.message?.includes('category')) {
        // Show category selection modal
        setShowCategoryModal(true);
      } else {
        const errorMessage = err?.message || err?.toString() || 'Google Sign-Up failed. Please try again.';
        Alert.alert('Google Sign-Up Failed', errorMessage);
      }
    } finally {
      setPendingGoogleSignIn(false);
    }
  };

  const handleCategorySelect = async (category: 'crew' | 'talent', primaryRole?: string) => {
    try {
      setShowCategoryModal(false);
      clearError();
      setPendingGoogleSignIn(true);
      await googleSignIn(category, primaryRole);
      onSignupSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error in category select:', err);
      const errorMessage = err?.message || err?.toString() || 'Google Sign-Up failed. Please try again.';
      Alert.alert('Google Sign-Up Failed', errorMessage);
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
          <Text style={styles.title}>Join cool steps</Text>
          <Text style={styles.subtitle}>Create your account to get started</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, formErrors.name && styles.inputError]}>
              <Ionicons name="person" size={20} color="#71717a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
                textContentType="name"
                autoComplete="name"
              />
            </View>
            {formErrors.name && <Text style={styles.fieldError}>{formErrors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, formErrors.email && styles.inputError]}>
              <Ionicons name="mail" size={20} color="#71717a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            {formErrors.email && <Text style={styles.fieldError}>{formErrors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryButton,
                    formData.category === category.key && styles.categoryButtonActive,
                  ]}
                  onPress={() => handleCategoryChange(category.key as any)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={formData.category === category.key ? '#fff' : '#71717a'}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      formData.category === category.key && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Primary Role</Text>
            <View style={[styles.inputWrapper, formErrors.primaryRole && styles.inputError]}>
              <Ionicons name="briefcase" size={20} color="#71717a" style={styles.inputIcon} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.roleScrollView}
              >
                {getRolesForCategory(formData.category).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      formData.primaryRole === role && styles.roleButtonActive,
                    ]}
                    onPress={() => handleInputChange('primaryRole', role)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.primaryRole === role && styles.roleButtonTextActive,
                      ]}
                    >
                      {role.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {formErrors.primaryRole && <Text style={styles.fieldError}>{formErrors.primaryRole}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, formErrors.password && styles.inputError]}>
              <Ionicons name="lock-closed" size={20} color="#71717a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
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
            {formErrors.password && <Text style={styles.fieldError}>{formErrors.password}</Text>}
            <View style={styles.passwordRequirementsList}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              {getPasswordRequirements().map((req) => {
                const isMet = req.test(formData.password);
                return (
                  <View key={req.key} style={styles.requirementItem}>
                    <Ionicons
                      name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
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
              })}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrapper, formErrors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed" size={20} color="#71717a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
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

          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.signupButtonText}>Creating Account...</Text>
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, (isLoading || pendingGoogleSignIn) && styles.googleButtonDisabled]}
            onPress={() => {
              try {
                handleGoogleSignIn();
              } catch (err: any) {
                console.error('Error in Google Sign-In button handler:', err);
                Alert.alert('Error', 'An unexpected error occurred. Please try again.');
              }
            }}
            disabled={isLoading || pendingGoogleSignIn}
          >
            <View style={styles.googleButtonContent}>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={styles.googleButtonText}>
                {pendingGoogleSignIn ? 'Signing Up...' : 'Sign up with Google'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>Sign In</Text>
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
  passwordRequirementsList: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 12,
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
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 6,
  },
  requirementTextMet: {
    color: '#10b981',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  roleScrollView: {
    flex: 1,
  },
  roleButton: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  signupButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  signupButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  signupButtonText: {
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

export default SignupPage;
