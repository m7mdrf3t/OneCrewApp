import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { filterRolesByCategory } from '../utils/roleCategorizer';

interface CategorySelectionModalProps {
  visible: boolean;
  onSelect: (category: 'crew' | 'talent', primaryRole?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  visible,
  onSelect,
  onCancel,
  isLoading = false,
}) => {
  const { getRoles } = useApi();
  const [selectedCategory, setSelectedCategory] = useState<'crew' | 'talent'>('crew');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [crewRoles, setCrewRoles] = useState<string[]>([]);
  const [talentRoles, setTalentRoles] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRoleMode, setIsCustomRoleMode] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  // Store role objects to access code field
  const [crewRolesData, setCrewRolesData] = useState<any[]>([]);
  const [talentRolesData, setTalentRolesData] = useState<any[]>([]);

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
    if (!visible) return; // Only load when modal is visible
    
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

        // Store full role objects to access code field
        const storeRolesData = (data: any, category: 'crew' | 'talent') => {
          const rolesData = Array.isArray(data) ? data : [];
          if (category === 'crew') {
            setCrewRolesData(rolesData);
          } else {
            setTalentRolesData(rolesData);
          }
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

        // Store full role objects to access code field
        if (crewRes?.success && Array.isArray(crewRes.data)) {
          storeRolesData(crewRes.data, 'crew');
        }
        if (talentRes?.success && Array.isArray(talentRes.data)) {
          storeRolesData(talentRes.data, 'talent');
        }

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
  }, [visible, getRoles]);

  const getRolesForCategory = (category: string) => {
    switch (category) {
      case 'crew': return crewRoles;
      case 'talent': return talentRoles;
      default: return [];
    }
  };

  const handleCategoryChange = (category: 'crew' | 'talent') => {
    setSelectedCategory(category);
    setSelectedRole(''); // Reset role when category changes
    setCustomRoleInput('');
    setIsCustomRoleMode(false);
  };

  const handleOtherRoleMode = () => {
    setIsCustomRoleMode(true);
    setSelectedRole('');
    setCustomRoleInput('');
  };

  const normalizeRoleInput = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const canContinue = isCustomRoleMode
    ? Boolean(normalizeRoleInput(customRoleInput))
    : Boolean(selectedRole);

  const handleContinue = () => {
    let roleToSubmit: string | undefined;
    
    if (isCustomRoleMode) {
      roleToSubmit = normalizeRoleInput(customRoleInput) || selectedRole;
    } else {
      // Try to find the role code from stored role data
      const rolesData = selectedCategory === 'crew' ? crewRolesData : talentRolesData;
      const roleObj = rolesData.find((r: any) => {
        const roleName = typeof r === 'string' ? r : (r?.name || '');
        const normalized = roleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return normalized === selectedRole;
      });
      
      // Use code if available, otherwise fall back to normalized name
      if (roleObj && typeof roleObj === 'object' && roleObj.code) {
        roleToSubmit = roleObj.code;
      } else if (roleObj && typeof roleObj === 'object' && roleObj.name) {
        // Fallback: normalize the name
        roleToSubmit = roleObj.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      } else {
        roleToSubmit = selectedRole;
      }
    }

    if (!roleToSubmit) {
      Alert.alert('Role Required', 'Please select your primary role to continue.');
      return;
    }
    
    console.log('📋 Submitting role:', { selectedRole, roleToSubmit, selectedCategory });
    onSelect(selectedCategory, roleToSubmit);
  };

  const roles = getRolesForCategory(selectedCategory);
  const customRolesForPicker = customRoles.filter((r) => !new Set(roles).has(r));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Please select your category and primary role to continue
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryButton,
                    (category.key === 'other'
                      ? isCustomRoleMode
                      : (!isCustomRoleMode && selectedCategory === category.key)) && styles.categoryButtonActive,
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
                      : (!isCustomRoleMode && selectedCategory === category.key)) ? '#fff' : '#71717a'}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      (category.key === 'other'
                        ? isCustomRoleMode
                        : (!isCustomRoleMode && selectedCategory === category.key)) && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Role</Text>
            {rolesLoading ? (
              <View style={styles.roleLoadingContainer}>
                <Text style={styles.roleLoadingText}>Loading roles...</Text>
              </View>
            ) : (
              <>
                {isCustomRoleMode ? (
                  <View style={styles.customRoleInputRow}>
                    <TextInput
                      style={styles.customRoleInput}
                      placeholder="Type your role (e.g., production_assistant)"
                      placeholderTextColor="#9ca3af"
                      value={customRoleInput}
                      onChangeText={setCustomRoleInput}
                      editable={!isLoading}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (!isLoading) handleContinue();
                      }}
                    />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.roleScrollView}
                    contentContainerStyle={styles.roleScrollContent}
                  >
                    {roles.map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleButton,
                          selectedRole === role && styles.roleButtonActive,
                        ]}
                        onPress={() => setSelectedRole(role)}
                        disabled={isLoading}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            selectedRole === role && styles.roleButtonTextActive,
                          ]}
                        >
                          {role.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {isCustomRoleMode && (
                  <Text style={styles.customRoleHint}>
                    We’ll format it as lowercase with underscores.
                  </Text>
                )}

                {!isCustomRoleMode && customRolesForPicker.length > 0 && (
                  <View style={styles.customRolesSection}>
                    <Text style={styles.customRolesTitle}>Custom roles</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.roleScrollView}
                      contentContainerStyle={styles.roleScrollContent}
                    >
                      {customRolesForPicker.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleButton,
                            selectedRole === role && styles.roleButtonActive,
                          ]}
                          onPress={() => setSelectedRole(role)}
                          disabled={isLoading}
                        >
                          <Text
                            style={[
                              styles.roleButtonText,
                              selectedRole === role && styles.roleButtonTextActive,
                            ]}
                          >
                            {role.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
            {!rolesLoading && !canContinue && (
              <Text style={styles.roleHint}>
                {isCustomRoleMode ? 'Please enter your primary role' : 'Please select your primary role'}
              </Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.continueButton,
                (!canContinue || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!canContinue || isLoading}
            >
              {isLoading ? (
                <Text style={styles.continueButtonText}>Processing...</Text>
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
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
    flexGrow: 0,
  },
  customRolesSection: {
    marginTop: 10,
  },
  customRoleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customRoleInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  customRoleHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#71717a',
  },
  customRolesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 6,
  },
  roleScrollContent: {
    paddingRight: 16,
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
    paddingVertical: 8,
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
  roleHint: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CategorySelectionModal;


