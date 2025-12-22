import React, { useState, useEffect } from 'react';
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
import type { UserRole } from 'onecrew-api-client';
import { useApi } from '../contexts/ApiContext';
import CategorySelectionModal from '../components/CategorySelectionModal';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator';
import { filterRolesByCategory } from '../utils/roleCategorizer';
import { createPlatformStyles } from '../utils/platformStyles';
import { signupPageCommonStyles } from './SignupPage.styles.common';
import { signupPageIosStyles } from './SignupPage.styles.ios';
import { signupPageAndroidStyles } from './SignupPage.styles.android';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: (email: string) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({
  onNavigateToLogin,
  onSignupSuccess,
}) => {
  const { signup, googleSignIn, isLoading, error, clearError, isAuthenticated, getRoles } = useApi();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    category: 'crew' as 'crew' | 'talent' | 'custom',
    primaryRole: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingGoogleSignIn, setPendingGoogleSignIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crewRoles, setCrewRoles] = useState<string[]>([]);
  const [talentRoles, setTalentRoles] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRoleMode, setIsCustomRoleMode] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

  const categories = [
    { key: 'crew', label: 'Crew Member', icon: 'people' },
    { key: 'talent', label: 'Talent', icon: 'star' },
    { key: 'other', label: 'Other', icon: 'create' },
  ];

  // Fallback roles in case API fails
  const fallbackCrewRoles = [
    'actor', 'voice_actor', 'director', 'dop', 'editor', 'producer',
    'scriptwriter', 'gaffer', 'grip', 'sound_engineer', 'makeup_artist',
    'stylist', 'vfx', 'colorist'
  ];

  const fallbackTalentRoles = [
    'actor', 'voice_actor', 'singer', 'dancer', 'model', 'engineer'
  ];

  // Use the shared categorizeRole function from utils

  // Load roles from API
  useEffect(() => {
    const loadRoles = async () => {
      setRolesLoading(true);
      try {
        const normalizeRoles = (data: any): string[] => {
          const rolesData = Array.isArray(data) ? data : [];
          const normalized = rolesData
            .map((role: any) => {
              const roleName =
                typeof role === 'string'
                  ? role
                  : (typeof role?.name === 'string' ? role.name : '');
              if (!roleName) return '';
              return roleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            })
            .filter(Boolean);
          return Array.from(new Set(normalized)).sort();
        };

        // Prefer server-driven categories (dynamic)
        // Use allSettled so a missing `custom` endpoint doesn't break crew/talent loads.
        const [crewResResult, talentResResult, customResResult] = await Promise.allSettled([
          getRoles({ category: 'crew' }),
          getRoles({ category: 'talent' }),
          getRoles({ category: 'custom' }),
        ]);

        const crewRes = crewResResult.status === 'fulfilled' ? crewResResult.value : null;
        const talentRes = talentResResult.status === 'fulfilled' ? talentResResult.value : null;
        const customRes = customResResult.status === 'fulfilled' ? customResResult.value : null;

        const crewFromApi = crewRes?.success ? normalizeRoles(crewRes.data) : [];
        const talentFromApi = talentRes?.success ? normalizeRoles(talentRes.data) : [];
        const customFromApi = customRes?.success ? normalizeRoles(customRes.data) : [];
        setCustomRoles(customFromApi);

        // If backend returns anything for the category calls, trust it (this is what makes roles truly dynamic)
        if (crewFromApi.length > 0 || talentFromApi.length > 0) {
          setCrewRoles(crewFromApi.length > 0 ? crewFromApi : fallbackCrewRoles);
          setTalentRoles(talentFromApi.length > 0 ? talentFromApi : fallbackTalentRoles);
          return;
        }

        // Fallback: load all roles then split via local categorizer
        const response = await getRoles();
        if (response.success && response.data) {
          const rolesData = Array.isArray(response.data) ? response.data : [];

          const crewRolesFiltered = filterRolesByCategory(rolesData, 'crew');
          const talentRolesFiltered = filterRolesByCategory(rolesData, 'talent');

          const crew = normalizeRoles(crewRolesFiltered);
          const talent = normalizeRoles(talentRolesFiltered);

          setCrewRoles(crew.length > 0 ? crew : fallbackCrewRoles);
          setTalentRoles(talent.length > 0 ? talent : fallbackTalentRoles);
        } else {
          setCrewRoles(fallbackCrewRoles);
          setTalentRoles(fallbackTalentRoles);
        }
      } catch (err) {
        console.error('Failed to load roles from API, using fallback:', err);
        // Use fallback on error
        setCrewRoles(fallbackCrewRoles);
        setTalentRoles(fallbackTalentRoles);
        setCustomRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [getRoles]);

  const getRolesForCategory = (category: string) => {
    switch (category) {
      case 'crew': return crewRoles;
      case 'talent': return talentRoles;
      default: return [];
    }
  };

  const rolesForSelectedCategory = getRolesForCategory(formData.category);
  const customRolesForPicker = customRoles.filter((r) => !new Set(rolesForSelectedCategory).has(r));

  const normalizeRoleInput = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const applyCustomRole = (rawValue?: string) => {
    const normalized = normalizeRoleInput(rawValue ?? customRoleInput);
    if (!normalized) {
      setFormErrors((prev) => ({ ...prev, primaryRole: 'Please enter a custom role' }));
      return;
    }
    handleInputChange('primaryRole', normalized);
    // Show the normalized value so users understand what will be saved.
    setCustomRoleInput(normalized);
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
      // If user is in custom-role mode, allow the typed value (even if they didn't tap "Use")
      const typed = isCustomRoleMode ? normalizeRoleInput(customRoleInput) : '';
      if (typed) {
        // ok (we'll submit typed value)
      } else {
        errors.primaryRole = isCustomRoleMode ? 'Please enter your role' : 'Please select your primary role';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    // Prevent double submission
    if (isSubmitting || isLoading) {
      console.log('⚠️ Signup already in progress, ignoring duplicate call');
      return;
    }

    try {
      setIsSubmitting(true);
      clearError();
      const userEmail = formData.email.trim().toLowerCase();

      // When in custom role mode, the backend requires primary_role to exist in the roles table.
      // Since custom roles don't exist in the table yet, we need to use a workaround:
      // Option 1: Try "custom" as the role (if backend supports it)
      // Option 2: Use a valid role from the roles table as a placeholder
      // For now, we'll try "custom" first, and if that fails, the backend should handle it
      const customRoleName = isCustomRoleMode 
        ? normalizeRoleInput(customRoleInput) 
        : null;

      // Try "custom" as the role value - if backend doesn't support it, it will fail
      // and we'll need backend support for custom roles
      const roleToSubmit = isCustomRoleMode
        ? 'custom'  // Try "custom" - backend may need to add this to roles table
        : formData.primaryRole;

      // Use "custom" as category - backend may need to support this
      const categoryToSubmit = isCustomRoleMode ? 'custom' : formData.category;

      console.log('📧 [SignupPage] Attempting signup with email:', userEmail, 'at', new Date().toISOString());
      console.log('📧 [SignupPage] Category:', categoryToSubmit, 'Role:', roleToSubmit, 'isCustomRoleMode:', isCustomRoleMode);
      if (customRoleName) {
        console.log('📧 [SignupPage] Custom role name (specialty):', customRoleName);
      }
      
      // Build signup request - include specialty when primary_role is "custom"
      const signupData: any = {
        name: formData.name.trim(),
        email: userEmail,
        password: formData.password,
        category: categoryToSubmit as any,
        primary_role: roleToSubmit as any as UserRole,
      };
      
      // Backend requires "specialty" field when primary_role is "custom"
      if (isCustomRoleMode && customRoleName) {
        signupData.specialty = customRoleName;
      }
      
      const signupResponse = await signup(signupData);
      
      // MANDATORY: Always navigate to OTP verification page after signup
      // User MUST verify email via OTP before being authenticated
      console.log('✅ [SignupPage] Signup successful - MANDATORY OTP verification required');
      console.log('📧 [SignupPage] Email for OTP verification:', userEmail);
      console.log('🚀 [SignupPage] Calling onSignupSuccess to navigate to OTP verification page');
      onSignupSuccess(userEmail);
      console.log('✅ [SignupPage] onSignupSuccess called successfully');
    } catch (err: any) {
      console.error('❌ [SignupPage] Signup error details:', {
        message: err.message,
        code: err.code,
        status: err.status,
        email: formData.email.trim().toLowerCase(),
        timestamp: new Date().toISOString(),
      });
      
      // Provide more helpful error messages
      let errorMessage = err.message || 'Please try again.';
      if (err.message?.toLowerCase().includes('already exists') || err.status === 409) {
        errorMessage = `An account with email ${formData.email.trim().toLowerCase()} already exists. If this is your account, please try logging in instead.`;
      } else if (isCustomRoleMode && err.message?.includes('foreign key constraint') && err.message?.includes('primary_role')) {
        // Custom role error - backend needs to support custom roles
        const customRoleName = normalizeRoleInput(customRoleInput);
        errorMessage = `Custom role "${customRoleName}" is not supported yet. The backend needs to add support for custom roles. Please try selecting a role from the available options, or contact support.`;
      }
      
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
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
    setCustomRoleInput('');
    setIsCustomRoleMode(false);
  };

  const handleOtherRoleMode = () => {
    setIsCustomRoleMode(true);
    setFormData(prev => ({ ...prev, category: 'custom', primaryRole: '' }));
    setFormErrors(prev => ({ ...prev, primaryRole: '' }));
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
      const authResponse = await googleSignIn();
      // For Google Sign-In, use the email from the response or form data
      const email = authResponse?.user?.email || formData.email.trim().toLowerCase() || '';
      onSignupSuccess(email);
    } catch (err: any) {
      console.error('❌ Google Sign-In error in SignupPage:', err);
      
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
      const authResponse = await googleSignIn(category, primaryRole);
      // For Google Sign-In, use the email from the response or form data
      const email = authResponse?.user?.email || formData.email.trim().toLowerCase() || '';
      onSignupSuccess(email);
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
                    (category.key === 'other'
                      ? isCustomRoleMode
                      : (!isCustomRoleMode && formData.category === category.key)) && styles.categoryButtonActive,
                  ]}
                  onPress={() => {
                    if (category.key === 'other') return handleOtherRoleMode();
                    return handleCategoryChange(category.key as any);
                  }}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={(category.key === 'other'
                      ? isCustomRoleMode
                      : (!isCustomRoleMode && formData.category === category.key)) ? '#fff' : '#71717a'}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      (category.key === 'other'
                        ? isCustomRoleMode
                        : (!isCustomRoleMode && formData.category === category.key)) && styles.categoryButtonTextActive,
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
              {rolesLoading ? (
                <View style={styles.roleLoadingContainer}>
                  <Text style={styles.roleLoadingText}>Loading roles...</Text>
                </View>
              ) : (
                isCustomRoleMode ? (
                  <View style={styles.customRoleInputRow}>
                    <TextInput
                      style={styles.customRoleInput}
                      placeholder="Type your role (e.g., production_assistant)"
                      placeholderTextColor="#9ca3af"
                      value={customRoleInput}
                      onChangeText={(text) => {
                        setCustomRoleInput(text);
                        // Keep primaryRole in sync so validation/errors behave naturally.
                        const normalized = normalizeRoleInput(text);
                        if (normalized) {
                          handleInputChange('primaryRole', normalized);
                        }
                      }}
                      editable={!isLoading}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => applyCustomRole()}
                      onBlur={() => applyCustomRole()}
                    />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.roleScrollView}
                  >
                    {rolesForSelectedCategory.map((role) => (
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
                          {role.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )
              )}
            </View>
            {isCustomRoleMode && !rolesLoading && (
              <Text style={styles.customRoleHint}>
                We’ll format it as lowercase with underscores.
              </Text>
            )}
            {!isCustomRoleMode && !rolesLoading && customRolesForPicker.length > 0 && (
              <View style={styles.customRolesSection}>
                <Text style={styles.customRolesTitle}>Custom roles</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roleScrollView}
                >
                  {customRolesForPicker.map((role) => (
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
                        {role.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
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
            style={[styles.signupButton, (isLoading || isSubmitting) && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading || isSubmitting}
          >
            {isLoading ? (
              <Text style={styles.signupButtonText}>Creating Account...</Text>
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Google Sign-Up temporarily hidden */}
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
                {pendingGoogleSignIn ? 'Signing Up...' : 'Sign up with Google'}
              </Text>
            </View>
          </TouchableOpacity> */}

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

// Create platform-specific styles
const styles = createPlatformStyles({
  common: signupPageCommonStyles,
  ios: signupPageIosStyles,
  android: signupPageAndroidStyles,
});

export default SignupPage;
