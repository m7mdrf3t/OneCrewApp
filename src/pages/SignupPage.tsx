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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from 'onecrew-api-client';
import { useApi } from '../contexts/ApiContext';
import CategorySelectionModal from '../components/CategorySelectionModal';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidator';
import { filterRolesByCategory } from '../utils/roleCategorizer';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: (email: string) => void;
  onLoginSuccess?: () => void;
  onGuestMode?: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({
  onNavigateToLogin,
  onSignupSuccess,
  onLoginSuccess,
  onGuestMode,
}) => {
  const { signup, googleSignIn, appleSignIn, isLoading, error, clearError, isAuthenticated, getRoles, createGuestSession } = useApi();
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
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pendingGoogleSignIn, setPendingGoogleSignIn] = useState(false);
  const [pendingAppleSignIn, setPendingAppleSignIn] = useState(false);
  const [pendingAuthProvider, setPendingAuthProvider] = useState<'google' | 'apple' | null>(null);
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

  const handleGuestMode = async () => {
    try {
      clearError();
      await createGuestSession();
      if (onGuestMode) {
        onGuestMode();
      }
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
      setPendingAuthProvider('google');
      
      // Show category selection modal BEFORE OAuth
      setShowCategoryModal(true);
    } catch (err: any) {
      console.error('❌ Error showing category modal:', err);
      setPendingAuthProvider(null);
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
      
      // After category selection, user is authenticated - go directly to app
      // Google/Apple Sign In doesn't require OTP verification (provider already verified email)
      setPendingAuthProvider(null);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
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
        const errorMessage = err?.message || err?.toString() || `${providerName} Sign-Up failed. Please try again.`;
        Alert.alert(`${providerName} Sign-Up Failed`, errorMessage);
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
      setPendingAuthProvider('apple');
      
      // Show category selection modal BEFORE OAuth
      setShowCategoryModal(true);
    } catch (err: any) {
      console.error('❌ Error showing category modal:', err);
      setPendingAuthProvider(null);
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
          colors={['#E0F0F5', '#D5E8F0']}
          style={styles.gradientHeader}
        >
          <View style={styles.gridOverlay} />
          <View style={styles.headerContent}>
            <Text style={styles.title}>Sign up</Text>
            <Text style={styles.subtitle}>to your Account</Text>
          </View>
        </LinearGradient>

        {/* White Card Container */}
        <View style={styles.cardContainer}>
          <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Social Login Buttons at Top */}
          <View style={styles.socialButtonsTop}>
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButtonTop, (isLoading || pendingAppleSignIn) && styles.socialButtonDisabled]}
              onPress={handleAppleSignIn}
              disabled={isLoading || pendingAppleSignIn}
            >
              {Platform.OS === 'ios' && (
                <>
                  <Ionicons name="logo-apple" size={20} color="#000" />
                  <Text style={styles.socialButtonText}>
                    {pendingAppleSignIn ? 'Signing Up...' : 'Apple'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.googleButtonTop, (isLoading || pendingGoogleSignIn) && styles.socialButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || pendingGoogleSignIn}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={styles.socialButtonText}>
                {pendingGoogleSignIn ? 'Signing Up...' : 'Google'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Full Name with Edge Label */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, formErrors.name && styles.inputError, nameFocused && styles.inputFocused]}>
              <Text style={styles.edgeLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
                textContentType="name"
                autoComplete="name"
              />
            </View>
            {formErrors.name && <Text style={styles.fieldError}>{formErrors.name}</Text>}
          </View>

          {/* Email with Edge Label */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, formErrors.email && styles.inputError, emailFocused && styles.inputFocused]}>
              <Text style={styles.edgeLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
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
            {formData.password.length > 0 && (
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
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Repeat Password</Text>
            <View style={[styles.inputWrapper, formErrors.confirmPassword && styles.inputError]}>
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
            style={[styles.registerButton, (isLoading || isSubmitting) && styles.registerButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading || isSubmitting}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Register'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>I have account? </Text>
            <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>

          {/* Continue as Guest */}
          <TouchableOpacity
            style={styles.guestLink}
            onPress={handleGuestMode}
            disabled={isLoading}
          >
            <Text style={styles.guestLinkText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      <CategorySelectionModal
        visible={showCategoryModal}
        onSelect={handleCategorySelect}
        onCancel={async () => {
          setShowCategoryModal(false);
          setPendingAuthProvider(null);
          // Clear any stored selections on cancel
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  gradientHeader: {
    height: 280,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#000',
    fontWeight: '400',
    opacity: 0.8,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  socialButtonsTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    gap: 8,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  appleButtonTop: {
    backgroundColor: '#fff',
  },
  googleButtonTop: {
    backgroundColor: '#fff',
  },
  socialButtonText: {
    color: '#000',
    fontSize: 15,
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
    backgroundColor: '#e4e4e7',
  },
  dividerText: {
    color: '#71717a',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '400',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: '#000',
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  edgeLabel: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    marginRight: 12,
    minWidth: 80,
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
  customRolesSection: {
    marginTop: 10,
  },
  customRoleInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customRoleInput: {
    flex: 1,
    // This input sits inside `inputWrapper` (which already has border/radius/padding).
    // Keep the inner TextInput borderless so it visually follows the wrapper's borders.
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
  },
  customRoleHint: {
    marginTop: 6,
    marginLeft: 4,
    fontSize: 11,
    color: '#71717a',
  },
  customRolesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 6,
    marginLeft: 4,
  },
  roleLoadingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleLoadingText: {
    color: '#71717a',
    fontSize: 14,
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
  registerButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  guestLink: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  guestLinkText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SignupPage;
