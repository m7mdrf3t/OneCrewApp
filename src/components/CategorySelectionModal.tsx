import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
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
  const [rolesLoading, setRolesLoading] = useState(true);

  const categories = [
    { key: 'crew', label: 'Crew Member', icon: 'people' },
    { key: 'talent', label: 'Talent', icon: 'star' },
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

        // Prefer server-driven categories (dynamic)
        const [crewRes, talentRes] = await Promise.all([
          getRoles({ category: 'crew' }),
          getRoles({ category: 'talent' }),
        ]);

        const crewFromApi = crewRes?.success ? normalizeRoles(crewRes.data) : [];
        const talentFromApi = talentRes?.success ? normalizeRoles(talentRes.data) : [];

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
  };

  const handleContinue = () => {
    if (!selectedRole) {
      Alert.alert('Role Required', 'Please select your primary role to continue.');
      return;
    }
    onSelect(selectedCategory, selectedRole);
  };

  const roles = getRolesForCategory(selectedCategory);

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
                    selectedCategory === category.key && styles.categoryButtonActive,
                  ]}
                  onPress={() => handleCategoryChange(category.key as any)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={selectedCategory === category.key ? '#fff' : '#71717a'}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category.key && styles.categoryButtonTextActive,
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
            {!selectedRole && !rolesLoading && (
              <Text style={styles.roleHint}>Please select your primary role</Text>
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
                (!selectedRole || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!selectedRole || isLoading}
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


