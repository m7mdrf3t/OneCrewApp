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
import CollapsibleSection from '../components/CollapsibleSection';

interface CompanyEditPageProps {
  company: Company;
  onBack: () => void;
  onCompanyUpdated?: () => void;
}

interface CompanyFormData {
  name: string;
  description: string;
  bio: string;
  website_url: string;
  location_text: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  establishment_date: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  social_media_links: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
}

const CompanyEditPage: React.FC<CompanyEditPageProps> = ({
  company,
  onBack,
  onCompanyUpdated,
}) => {
  const { updateCompany, getCompany } = useApi();
  const [saving, setSaving] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company>(company);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company.name || '',
    description: company.description || '',
    bio: company.bio || '',
    website_url: company.website_url || '',
    location_text: company.location_text || '',
    address: company.address || '',
    city: company.city || '',
    country: company.country || '',
    email: company.email || '',
    phone: company.phone || '',
    establishment_date: company.establishment_date || '',
    contact_email: company.contact_email || '',
    contact_phone: company.contact_phone || '',
    contact_address: company.contact_address || '',
    social_media_links: company.social_media_links || {},
  });

  // Reload company data when component mounts to ensure we have the latest data
  useEffect(() => {
    const loadCompany = async () => {
      try {
        setLoading(true);
        const response = await getCompany(company.id);
        if (response.success && response.data) {
          const updatedCompany = response.data;
          setCurrentCompany(updatedCompany);
          // Update form data with fresh company data
          setFormData({
            name: updatedCompany.name || '',
            description: updatedCompany.description || '',
            bio: updatedCompany.bio || '',
            website_url: updatedCompany.website_url || '',
            location_text: updatedCompany.location_text || '',
            address: updatedCompany.address || '',
            city: updatedCompany.city || '',
            country: updatedCompany.country || '',
            email: updatedCompany.email || '',
            phone: updatedCompany.phone || '',
            establishment_date: updatedCompany.establishment_date || '',
            contact_email: updatedCompany.contact_email || '',
            contact_phone: updatedCompany.contact_phone || '',
            contact_address: updatedCompany.contact_address || '',
            social_media_links: updatedCompany.social_media_links || {},
          });
          // Clear raw inputs when loading fresh data
          setSocialMediaRawInputs({});
        }
      } catch (error) {
        console.error('Failed to reload company data:', error);
        // Continue with existing company data if reload fails
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const handleInputChange = (field: keyof CompanyFormData, value: string | any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Smart URL formatting for social media platforms
  const formatSocialMediaUrl = (platform: string, input: string): string => {
    if (!input || !input.trim()) return '';
    
    const cleaned = input.trim();
    
    switch (platform) {
      case 'instagram':
        // Accept: username, @username, instagram.com/username, or full URL
        const instagramCleaned = cleaned
          .replace(/^@/, '')
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .replace(/^instagram\.com\//i, '')
          .replace(/\/.*$/, '')
          .trim();
        return instagramCleaned ? `https://instagram.com/${instagramCleaned}` : '';
      
      case 'twitter':
        // Accept: username, @username, twitter.com/username, x.com/username, or full URL
        const twitterCleaned = cleaned
          .replace(/^@/, '')
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .replace(/^(twitter\.com|x\.com)\//i, '')
          .replace(/\/.*$/, '')
          .trim();
        return twitterCleaned ? `https://twitter.com/${twitterCleaned}` : '';
      
      case 'facebook':
        // Accept: username, page name, facebook.com/username, or full URL
        const facebookCleaned = cleaned
          .replace(/^@/, '')
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .replace(/^facebook\.com\//i, '')
          .replace(/\/.*$/, '')
          .trim();
        return facebookCleaned ? `https://facebook.com/${facebookCleaned}` : '';
      
      case 'linkedin':
        // Accept: username, linkedin.com/in/username, linkedin.com/company/companyname, or full URL
        const linkedinCleaned = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim();
        if (linkedinCleaned.includes('linkedin.com')) {
          return `https://${linkedinCleaned}`;
        } else if (linkedinCleaned.match(/^[a-zA-Z0-9-]+$/)) {
          return `https://linkedin.com/in/${linkedinCleaned}`;
        }
        return linkedinCleaned ? `https://${linkedinCleaned}` : '';
      
      case 'youtube':
        // Accept: channel URL, channel ID, youtube.com/channel/ID, or full URL
        const youtubeCleaned = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim();
        if (youtubeCleaned.includes('youtube.com') || youtubeCleaned.includes('youtu.be')) {
          return `https://${youtubeCleaned}`;
        }
        return youtubeCleaned ? `https://youtube.com/${youtubeCleaned}` : '';
      
      case 'tiktok':
        // Accept: username, @username, tiktok.com/@username, or full URL
        const tiktokCleaned = cleaned
          .replace(/^@/, '')
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .replace(/^tiktok\.com\/@?/i, '')
          .replace(/\/.*$/, '')
          .trim();
        return tiktokCleaned ? `https://tiktok.com/@${tiktokCleaned}` : '';
      
      default:
        // Default: normalize URL
        if (/^https?:\/\//i.test(cleaned)) {
          return cleaned;
        }
        return cleaned ? `https://${cleaned}` : '';
    }
  };

  // Store raw input values for better UX while typing
  const [socialMediaRawInputs, setSocialMediaRawInputs] = useState<Record<string, string>>({});
  
  // Collapsible section state
  const [isSocialMediaExpanded, setIsSocialMediaExpanded] = useState(true);

  const handleSocialMediaChange = (platform: keyof CompanyFormData['social_media_links'], value: string) => {
    // Store raw input for display
    setSocialMediaRawInputs((prev) => ({ ...prev, [platform]: value }));
    
    // Format and save the URL
    const formattedUrl = formatSocialMediaUrl(platform, value);
    handleInputChange('social_media_links', {
      ...formData.social_media_links,
      [platform]: formattedUrl || undefined,
    });
  };

  // Get display value - prefer raw input if user is typing, otherwise extract from URL
  const getSocialMediaDisplayValue = (platform: string, url: string | undefined): string => {
    // If user has raw input stored, use that (for better UX while typing)
    if (socialMediaRawInputs[platform] !== undefined) {
      return socialMediaRawInputs[platform];
    }
    
    // Otherwise, extract username from stored URL
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      switch (platform) {
        case 'instagram':
          return pathname.replace(/^\//, '') || '';
        case 'twitter':
          return pathname.replace(/^\//, '') || '';
        case 'facebook':
          return pathname.replace(/^\//, '') || '';
        case 'linkedin':
          return pathname.replace(/^\/(in|company)\//, '') || '';
        case 'youtube':
          if (pathname.includes('/@')) {
            return pathname.replace(/^\/@/, '');
          }
          return pathname.replace(/^\//, '') || '';
        case 'tiktok':
          return pathname.replace(/^\/@/, '') || '';
        default:
          return url;
      }
    } catch {
      // If URL parsing fails, return as is
      return url;
    }
  };

  // Clear raw input when field is cleared
  const handleSocialMediaClear = (platform: keyof CompanyFormData['social_media_links']) => {
    setSocialMediaRawInputs((prev) => {
      const updated = { ...prev };
      delete updated[platform];
      return updated;
    });
    handleSocialMediaChange(platform, '');
  };

  const validateForm = (): boolean => {
    // Name validation (2-255 characters)
    if (!formData.name || formData.name.trim().length < 2) {
      Alert.alert('Error', 'Company name must be at least 2 characters long');
      return false;
    }
    if (formData.name.trim().length > 255) {
      Alert.alert('Error', 'Company name must be 255 characters or less');
      return false;
    }
    
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
    // Helper function to normalize URL (add https:// if missing)
    const normalizeUrl = (url: string): string => {
      const trimmed = url.trim();
      if (!trimmed) return trimmed;
      
      // If it already starts with http:// or https://, return as is
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      
      // Otherwise, add https://
      return `https://${trimmed}`;
    };

    // Website URL validation and normalization
    if (formData.website_url && formData.website_url.trim()) {
      const normalizedUrl = normalizeUrl(formData.website_url);
      // Validate URL format (now accepts URLs with or without protocol)
      if (!/^(https?:\/\/)?.+\..+/.test(normalizedUrl)) {
        Alert.alert('Error', 'Please enter a valid website URL (e.g., example.com)');
        return false;
      }
      // Update the form data with normalized URL
      formData.website_url = normalizedUrl;
    }

    // Social media URL validation (URLs are already formatted by handleSocialMediaChange)
    const socialLinks = formData.social_media_links;
    const socialPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'] as const;
    for (const platform of socialPlatforms) {
      const url = socialLinks[platform];
      if (url && url.trim()) {
        // URLs are already formatted, just validate they're valid URLs
        try {
          new URL(url);
        } catch {
          Alert.alert('Error', `Please enter a valid ${platform} URL or username`);
          return false;
        }
      }
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
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        website_url: formData.website_url.trim() || undefined,
        location_text: formData.location_text.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        establishment_date: formData.establishment_date || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_address: formData.contact_address.trim() || undefined,
        social_media_links: (() => {
          const filtered = Object.fromEntries(
            Object.entries(formData.social_media_links).filter(([_, v]) => v && typeof v === 'string' && v.trim() !== '')
          );
          // Return the filtered object (may be empty)
          return filtered;
        })(),
      };

      // Remove undefined values, but keep empty objects for social_media_links
      // Also ensure bio and description are included if they have content
      // Name is always included as it's required
      const cleanedUpdates: any = {};
      
      Object.entries(updates).forEach(([key, v]) => {
        if (key === 'social_media_links') {
          // Always include social_media_links, even if empty object
          // Ensure it's a proper object (not stringified) - backend should handle JSONB
          cleanedUpdates[key] = v;
        } else if (key === 'name') {
          // Always include name as it's required (validated to be 2-255 characters)
          cleanedUpdates[key] = v;
        } else if (key === 'bio' || key === 'description') {
          // Include bio and description even if they're empty strings (to clear them)
          if (v !== undefined) {
            cleanedUpdates[key] = v;
          }
        } else {
          // Other fields: only include if not undefined and not empty string
          if (v !== undefined && v !== '') {
            cleanedUpdates[key] = v;
          }
        }
      });

      // Debug: Log what we're sending
      console.log('📤 Sending company update:', JSON.stringify(cleanedUpdates, null, 2));
      console.log('📤 Social media links being sent:', cleanedUpdates.social_media_links);

      const response = await updateCompany(currentCompany.id, cleanedUpdates);
      
      // Debug: Log what we received
      console.log('✅ Company update response:', JSON.stringify(response.data, null, 2));
      console.log('✅ Social media links in response:', response.data?.social_media_links);
      
      if (response.success) {
        // Check if social media links were saved (backend issue detection)
        const sentLinks = cleanedUpdates.social_media_links;
        const receivedLinks = response.data?.social_media_links || {};
        const sentCount = Object.keys(sentLinks || {}).length;
        const receivedCount = Object.keys(receivedLinks).length;
        
        if (sentCount > 0 && receivedCount === 0) {
          // Backend didn't save social media links - show warning
          Alert.alert(
            'Partial Update',
            'Company profile updated, but social media links were not saved. This appears to be a backend issue. Please try again or contact support.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', 'Company profile updated successfully!');
        }
        
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

  // Allow editing for all statuses except 'suspended' (as per API requirements)
  // Approved companies can update name without re-approval
  const canEdit = currentCompany.approval_status !== 'suspended';
  const getStatusMessage = () => {
    switch (currentCompany.approval_status) {
      case 'suspended':
        return 'Your company is currently suspended. You cannot edit your profile. Please contact an administrator for assistance.';
      case 'pending':
        return 'Your company is pending approval. You can edit your profile, but changes may require re-approval.';
      case 'rejected':
        return 'Your company application was rejected. You can edit your profile, but please contact an administrator for assistance.';
      case 'draft':
        return 'Your company is still in draft status. You can edit your profile before submitting for approval.';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Company Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading company data...</Text>
        </View>
      </View>
    );
  }

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
                {currentCompany.approval_reason && currentCompany.approval_status === 'rejected' && (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonTitle}>Rejection Reason:</Text>
                    <Text style={styles.rejectionReasonText}>{currentCompany.approval_reason}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Company Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name *</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter company name"
              placeholderTextColor="#9ca3af"
              editable={canEdit}
              maxLength={255}
            />
            <Text style={styles.hint}>Company name must be 2-255 characters</Text>
          </View>
        </View>

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
            <Text style={styles.label}>Location (General)</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.location_text}
              onChangeText={(value) => handleInputChange('location_text', value)}
              placeholder="City, Country"
              placeholderTextColor="#9ca3af"
              editable={canEdit}
            />
            <Text style={styles.hint}>General location text (optional if using structured fields below)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Street address"
              placeholderTextColor="#9ca3af"
              editable={canEdit}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
                placeholder="City"
                placeholderTextColor="#9ca3af"
                editable={canEdit}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.country}
                onChangeText={(value) => handleInputChange('country', value)}
                placeholder="Country"
                placeholderTextColor="#9ca3af"
                editable={canEdit}
              />
            </View>
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

        {/* Social Media Links Section */}
        <CollapsibleSection
          title="Social Media Links"
          icon="share-social"
          isExpanded={isSocialMediaExpanded}
          onToggle={() => setIsSocialMediaExpanded(!isSocialMediaExpanded)}
        >
          <View style={styles.socialMediaSectionContent}>
            <View style={styles.smartInputHint}>
              <Ionicons name="bulb-outline" size={14} color="#3b82f6" />
              <Text style={styles.smartInputHintText}>
                You can enter just a username, @username, or full URL - we'll format it automatically
              </Text>
            </View>
            
            {[
              { key: 'instagram' as const, icon: 'logo-instagram', color: '#E4405F', label: 'Instagram', placeholder: 'username or @username' },
              { key: 'facebook' as const, icon: 'logo-facebook', color: '#1877F2', label: 'Facebook', placeholder: 'username or page name' },
              { key: 'twitter' as const, icon: 'logo-twitter', color: '#1DA1F2', label: 'Twitter', placeholder: 'username or @username' },
              { key: 'linkedin' as const, icon: 'logo-linkedin', color: '#0077B5', label: 'LinkedIn', placeholder: 'profile URL or username' },
              { key: 'youtube' as const, icon: 'logo-youtube', color: '#FF0000', label: 'YouTube', placeholder: 'channel URL or @channel' },
              { key: 'tiktok' as const, icon: 'musical-notes', color: '#000000', label: 'TikTok', placeholder: 'username or @username' },
            ].map((platform) => {
              const currentValue = formData.social_media_links[platform.key] || '';
              const displayValue = getSocialMediaDisplayValue(platform.key, currentValue);
              const hasValue = !!currentValue;
              
              return (
                <View key={platform.key} style={styles.socialMediaCard}>
                  <View style={styles.socialMediaHeader}>
                    <View style={[styles.socialIconContainer, { backgroundColor: `${platform.color}15` }]}>
                      <Ionicons name={platform.icon as any} size={22} color={platform.color} />
                    </View>
                    <View style={styles.socialMediaLabelContainer}>
                      <Text style={styles.socialMediaLabel}>{platform.label}</Text>
                      {hasValue && (
                        <Text style={styles.socialMediaUrl} numberOfLines={1}>
                          {currentValue}
                        </Text>
                      )}
                    </View>
                    {hasValue && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => handleSocialMediaClear(platform.key)}
                        disabled={!canEdit}
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.socialInput,
                      !canEdit && styles.inputDisabled,
                      hasValue && styles.socialInputFilled,
                    ]}
                    value={displayValue}
                    onChangeText={(value) => handleSocialMediaChange(platform.key, value)}
                    placeholder={platform.placeholder}
                    placeholderTextColor="#9ca3af"
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={canEdit}
                  />
                  {hasValue && (
                    <View style={styles.socialMediaHint}>
                      <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      <Text style={styles.socialMediaHintText}>Link saved</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </CollapsibleSection>

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
  socialMediaSectionContent: {
    paddingTop: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 18,
  },
  socialMediaCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  socialMediaLabelContainer: {
    flex: 1,
  },
  socialMediaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  socialMediaUrl: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  socialInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    fontFamily: 'monospace',
  },
  socialInputFilled: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  socialMediaHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  socialMediaHintText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  smartInputHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    gap: 6,
  },
  smartInputHintText: {
    fontSize: 12,
    color: '#1e40af',
    flex: 1,
    lineHeight: 16,
  },
});

export default CompanyEditPage;

