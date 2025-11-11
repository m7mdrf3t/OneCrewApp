import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { Company } from '../types';
import DatePicker from '../components/DatePicker';

interface CompanyEditPageProps {
  company: Company;
  onBack: () => void;
  onCompanyUpdated?: () => void;
}

interface CompanyFormData {
  description: string;
  bio: string;
  website_url: string;
  location_text: string;
  email: string;
  phone: string;
  establishment_date: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
}

const CompanyEditPage: React.FC<CompanyEditPageProps> = ({
  company,
  onBack,
  onCompanyUpdated,
}) => {
  const { updateCompany } = useApi();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({
    description: company.description || '',
    bio: company.bio || '',
    website_url: company.website_url || '',
    location_text: company.location_text || '',
    email: company.email || '',
    phone: company.phone || '',
    establishment_date: company.establishment_date || '',
    contact_email: company.contact_email || '',
    contact_phone: company.contact_phone || '',
    contact_address: company.contact_address || '',
  });

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      Alert.alert('Error', 'Please enter a valid contact email address');
      return false;
    }

    // Website URL validation
    if (formData.website_url && !/^https?:\/\/.+/.test(formData.website_url)) {
      Alert.alert('Error', 'Please enter a valid website URL (must start with http:// or https://)');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        description: formData.description.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        website_url: formData.website_url.trim() || undefined,
        location_text: formData.location_text.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        establishment_date: formData.establishment_date || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_address: formData.contact_address.trim() || undefined,
      };

      // Remove undefined values
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
      );

      const response = await updateCompany(company.id, cleanedUpdates);
      if (response.success) {
        Alert.alert('Success', 'Company profile updated successfully!');
        if (onCompanyUpdated) {
          onCompanyUpdated();
        }
        onBack();
      } else {
        const errorMessage = response.error || 'Failed to update company profile';
        Alert.alert(
          'Cannot Update Company',
          errorMessage.includes('current status')
            ? 'Your company profile cannot be edited in its current approval status. Please contact an administrator for assistance.'
            : errorMessage
        );
      }
    } catch (error: any) {
      console.error('Failed to update company:', error);
      const errorMessage = error.message || 'Failed to update company profile';
      Alert.alert(
        'Cannot Update Company',
        errorMessage.includes('current status') || errorMessage.includes('403')
          ? 'Your company profile cannot be edited in its current approval status. Please contact an administrator for assistance.'
          : errorMessage
      );
    } finally {
      setSaving(false);
    }
  };

  const canEdit = company.approval_status === 'approved';
  const getStatusMessage = () => {
    switch (company.approval_status) {
      case 'pending':
        return 'Your company is pending approval. Once approved, you will be able to edit your profile.';
      case 'rejected':
        return 'Your company application was rejected. Please contact an administrator for assistance.';
      case 'suspended':
        return 'Your company is currently suspended. Please contact an administrator for assistance.';
      case 'draft':
        return 'Your company is still in draft status. Please submit it for approval first.';
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Company Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Warning */}
        {!canEdit && (
          <View style={styles.warningSection}>
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Editing Restricted</Text>
                <Text style={styles.warningText}>{getStatusMessage()}</Text>
                {company.approval_reason && company.approval_status === 'rejected' && (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonTitle}>Rejection Reason:</Text>
                    <Text style={styles.rejectionReasonText}>{company.approval_reason}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea, styles.input, !canEdit && styles.inputDisabled]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter company description..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={canEdit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.textArea, styles.input, !canEdit && styles.inputDisabled]}
              value={formData.bio}
              onChangeText={(value) => handleInputChange('bio', value)}
              placeholder="Enter company bio..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={canEdit}
            />
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="company@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={canEdit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              editable={canEdit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website URL</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.website_url}
              onChangeText={(value) => handleInputChange('website_url', value)}
              placeholder="https://www.example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="url"
              autoCapitalize="none"
              editable={canEdit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.location_text}
              onChangeText={(value) => handleInputChange('location_text', value)}
              placeholder="City, Country"
              placeholderTextColor="#9ca3af"
              editable={canEdit}
            />
          </View>
        </View>

        {/* Additional Contact Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Contact Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Email</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.contact_email}
              onChangeText={(value) => handleInputChange('contact_email', value)}
              placeholder="contact@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={canEdit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.contact_phone}
              onChangeText={(value) => handleInputChange('contact_phone', value)}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              editable={canEdit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Address</Text>
            <TextInput
              style={[styles.textArea, styles.input, !canEdit && styles.inputDisabled]}
              value={formData.contact_address}
              onChangeText={(value) => handleInputChange('contact_address', value)}
              placeholder="Street address, City, State, ZIP"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={canEdit}
            />
          </View>
        </View>

        {/* Company Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.inputGroup}>
            <DatePicker
              value={formData.establishment_date}
              onChange={(date) => handleInputChange('establishment_date', date || '')}
              placeholder="Select establishment date"
              label="Establishment Date"
              disabled={!canEdit}
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, (!canEdit || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canEdit || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {canEdit ? 'Save Changes' : 'Editing Disabled'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  warningSection: {
    padding: 16,
    paddingTop: 12,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  rejectionReasonBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectionReasonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 12,
    color: '#7f1d1d',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e4e4e7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
    color: '#6b7280',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompanyEditPage;

