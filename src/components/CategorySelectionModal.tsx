import React, { useState } from 'react';
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

interface CategorySelectionModalProps {
  visible: boolean;
  onSelect: (category: 'crew' | 'talent' | 'company', primaryRole?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  visible,
  onSelect,
  onCancel,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'crew' | 'talent' | 'company'>('crew');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const categories = [
    { key: 'crew', label: 'Crew Member', icon: 'people' },
    { key: 'talent', label: 'Talent', icon: 'star' },
    { key: 'company', label: 'Company', icon: 'business' },
  ];

  const crewRoles = [
    'actor', 'voice_actor', 'director', 'dop', 'editor', 'producer',
    'scriptwriter', 'gaffer', 'grip', 'sound_engineer', 'makeup_artist',
    'stylist', 'vfx', 'colorist'
  ];

  const talentRoles = [
    'actor', 'voice_actor', 'singer', 'dancer', 'model'
  ];

  const companyRoles = [
    'production_house', 'agency', 'studio', 'post_house', 'equipment_rental'
  ];

  const getRolesForCategory = (category: string) => {
    switch (category) {
      case 'crew': return crewRoles;
      case 'talent': return talentRoles;
      case 'company': return companyRoles;
      default: return [];
    }
  };

  const handleCategoryChange = (category: 'crew' | 'talent' | 'company') => {
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
                    {role.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!selectedRole && (
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

