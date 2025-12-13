import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { Company, CertificationTemplate, CreateCertificationRequest } from '../types';
import DatePicker from './DatePicker';
import MediaPickerService from '../services/MediaPickerService';
import UploadProgressBar from './UploadProgressBar';

interface GrantCertificationModalProps {
  visible: boolean;
  onClose: () => void;
  company: Company;
  onCertificationGranted?: () => void;
  preselectedUserId?: string; // Optional: pre-select a user when opening the modal
}

const GrantCertificationModal: React.FC<GrantCertificationModalProps> = ({
  visible,
  onClose,
  company,
  onCertificationGranted,
  preselectedUserId,
}) => {
  const {
    api,
    getAuthorizedCertifications,
    grantCertification,
    uploadFile,
    uploadCertificateImage,
    getAcademyCourses,
    getCourseRegistrations,
  } = useApi();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [authorizedTemplates, setAuthorizedTemplates] = useState<CertificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificationTemplate | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [certificateUrl, setCertificateUrl] = useState<string>('');
  const [certificateImageUrl, setCertificateImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [granting, setGranting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCertificateImage, setUploadingCertificateImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    visible: boolean;
    progress?: number;
    label: string;
  }>({
    visible: false,
    progress: undefined,
    label: 'Uploading...',
  });
  const mediaPicker = MediaPickerService.getInstance();
  
  // Course selection state
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [courseRegistrations, setCourseRegistrations] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [userSelectionMethod, setUserSelectionMethod] = useState<'course' | 'search'>('course');

  useEffect(() => {
    if (visible) {
      loadAuthorizedCertifications();
      if (company.subcategory === 'academy') {
        loadCourses();
      }
      resetForm();
      
      // If a user ID is preselected, fetch and set that user
      if (preselectedUserId) {
        loadPreselectedUser(preselectedUserId);
        setUserSelectionMethod('search');
      }
    }
  }, [visible, company.id, preselectedUserId]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseRegistrations(selectedCourse.id);
    } else {
      setCourseRegistrations([]);
    }
  }, [selectedCourse]);

  const loadPreselectedUser = async (userId: string) => {
    try {
      // Try to get user by ID using the API
      const response = await api.getUsers({ id: userId, limit: 1 });
      if (response?.success && response.data) {
        const usersArray = Array.isArray(response.data) ? response.data : (response.data.data || []);
        const userData = usersArray.find((u: any) => u.id === userId) || usersArray[0];
        if (userData) {
          setSelectedUser(userData);
          setSearchQuery(userData.name || userData.email || '');
          setFilteredUsers([]); // Clear search results since we have a preselected user
        }
      }
    } catch (error) {
      console.error('Failed to load preselected user:', error);
      // If API call fails, at least set the search query to show we're trying to load
      setSearchQuery('Loading user...');
    }
  };

  // Search users using API q parameter when search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setFilteredUsers([]);
        return;
      }

      try {
        setSearching(true);
        // Use the API's q parameter for full-text search
        const response = await api.getUsers({
          q: searchQuery,
          limit: 20,
        });

        if (response.success && response.data) {
          // Handle both array and paginated response
          const usersArray = Array.isArray(response.data) 
            ? response.data 
            : (response.data.data || []);
          setFilteredUsers(usersArray.slice(0, 10)); // Limit to 10 results for display
        } else {
          setFilteredUsers([]);
        }
      } catch (error) {
        console.error('Failed to search users:', error);
        setFilteredUsers([]);
      } finally {
        setSearching(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, api]);

  const resetForm = () => {
    setSearchQuery('');
    setSelectedUser(null);
    setSelectedTemplate(null);
    setExpirationDate('');
    setNotes('');
    setCertificateUrl('');
    setCertificateImageUrl('');
    setFilteredUsers([]);
    setSelectedCourse(null);
    setCourseRegistrations([]);
    setUserSelectionMethod('course');
  };

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const coursesData = await getAcademyCourses(company.id);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadCourseRegistrations = async (courseId: string) => {
    try {
      setLoadingRegistrations(true);
      const registrationsData = await getCourseRegistrations(courseId);
      const allRegistrations = Array.isArray(registrationsData) ? registrationsData : [];
      
      // Filter out cancelled and deleted registrations, and deduplicate by user_id
      const activeRegistrations = allRegistrations.filter(
        (reg: any) => !reg.cancelled_at && !reg.deleted_at
      );
      
      // Deduplicate by user_id - keep only the most recent registration per user
      const uniqueRegistrations = activeRegistrations.reduce((acc: any[], reg: any) => {
        const existingIndex = acc.findIndex((r) => r.user_id === reg.user_id);
        if (existingIndex === -1) {
          acc.push(reg);
        } else {
          const existing = acc[existingIndex];
          const existingDate = new Date(existing.registered_at || existing.created_at);
          const newDate = new Date(reg.registered_at || reg.created_at);
          if (newDate > existingDate) {
            acc[existingIndex] = reg;
          }
        }
        return acc;
      }, []);
      
      setCourseRegistrations(uniqueRegistrations);
    } catch (error) {
      console.error('Failed to load course registrations:', error);
      Alert.alert('Error', 'Failed to load course registrations');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // Map invalid icon names to valid Ionicons names
  const getValidIconName = (iconName: string | undefined | null): string => {
    if (!iconName) return 'trophy-outline'; // Default icon
    
    const iconMap: Record<string, string> = {
      'pen': 'pencil-outline',
      'pencil': 'pencil-outline',
      'create': 'create-outline',
      'edit': 'create-outline',
      'write': 'pencil-outline',
    };
    
    const lowerIconName = iconName.toLowerCase();
    // Return mapped icon if exists, otherwise return the original with fallback
    return iconMap[lowerIconName] || iconName || 'trophy-outline';
  };

  const loadAuthorizedCertifications = async () => {
    try {
      setLoadingTemplates(true);
      console.log('🔍 Loading authorized certifications for company:', company.id, company.name);
      const templates = await getAuthorizedCertifications(company.id);
      console.log('✅ Authorized certifications response:', {
        isArray: Array.isArray(templates),
        count: Array.isArray(templates) ? templates.length : 'not an array',
        data: templates
      });
      const templatesArray = Array.isArray(templates) ? templates : [];
      setAuthorizedTemplates(templatesArray);
      
      if (templatesArray.length === 0) {
        console.warn('⚠️ No authorized certifications found. This means:');
        console.warn('   1. There are no authorization records in academy_certification_authorizations table');
        console.warn('   2. An admin needs to authorize this academy to grant certifications');
        console.warn('   3. Even if certifications exist in certification_templates, they need authorization');
      }
    } catch (error: any) {
      console.error('❌ Failed to load authorized certifications:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      Alert.alert(
        'Error Loading Certifications',
        `Failed to load authorized certifications.\n\n${error.message || 'Please try again.'}\n\nNote: Certifications must be authorized by an admin before they can be granted.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchQuery(user.name || user.email);
    setFilteredUsers([]);
  };

  const handleSelectTemplate = (template: CertificationTemplate) => {
    setSelectedTemplate(template);
    // Auto-set expiration date if template has default_expiration_days
    if (template.default_expiration_days && !expirationDate) {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + template.default_expiration_days);
      setExpirationDate(expiration.toISOString().split('T')[0]);
    }
  };

  const handleUploadCertificateImage = async () => {
    try {
      // Request permissions
      const hasPermission = await mediaPicker.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera and media library permissions are required to upload a certificate image.');
        return;
      }

      // Show action sheet to choose between camera and gallery
      Alert.alert(
        'Upload Certificate Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const result = await mediaPicker.pickImage({
                  allowsEditing: true,
                  quality: 0.9,
                  aspect: [8.5, 11], // Standard certificate aspect ratio
                  maxWidth: 1700,
                  maxHeight: 2200,
                });

                if (result) {
                  await uploadCertificateImageFile(result);
                }
              } catch (error: any) {
                console.error('Error picking image:', error);
                Alert.alert('Error', error.message || 'Failed to pick image.');
              }
            },
          },
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const result = await mediaPicker.takePhoto({
                  allowsEditing: true,
                  quality: 0.9,
                  aspect: [8.5, 11],
                });

                if (result) {
                  await uploadCertificateImageFile(result);
                }
              } catch (error: any) {
                console.error('Error taking photo:', error);
                Alert.alert('Error', error.message || 'Failed to take photo.');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in handleUploadCertificateImage:', error);
      Alert.alert('Error', error.message || 'Failed to upload certificate image.');
    }
  };

  const uploadCertificateImageFile = async (imageResult: any) => {
    try {
      setUploadingCertificateImage(true);
      setUploadProgress({
        visible: true,
        progress: undefined,
        label: 'Uploading certificate image...',
      });

      const file = {
        uri: imageResult.uri,
        type: 'image/jpeg',
        name: imageResult.fileName || `certificate_image_${Date.now()}.jpg`,
      };

      const response = await uploadCertificateImage(file);

      setUploadProgress({ visible: false });
      if (response.success && response.data?.url) {
        // Update certificate image URL
        setCertificateImageUrl(response.data.url);
        Alert.alert('Success', 'Certificate image uploaded successfully!');
      } else {
        throw new Error(response.error || 'Failed to upload certificate image');
      }
    } catch (error: any) {
      console.error('Failed to upload certificate image:', error);
      setUploadProgress({ visible: false });
      Alert.alert('Error', error.message || 'Failed to upload certificate image.');
    } finally {
      setUploadingCertificateImage(false);
    }
  };

  const handleGrantCertification = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user to certify');
      return;
    }

    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a certification template');
      return;
    }

    try {
      setGranting(true);
      const certificationData: CreateCertificationRequest = {
        user_id: selectedUser.id,
        certification_template_id: selectedTemplate.id,
        expiration_date: expirationDate || undefined,
        notes: notes || undefined,
        certificate_url: certificateUrl || undefined,
        certificate_image_url: certificateImageUrl || undefined,
      };

      const response = await grantCertification(company.id, certificationData);

      if (response) {
        Alert.alert('Success', `Certification granted to ${selectedUser.name || selectedUser.email}`);
        resetForm();
        // Call the callback BEFORE closing to ensure refresh happens
        if (onCertificationGranted) {
          onCertificationGranted();
        }
        onClose();
      } else {
        throw new Error('Failed to grant certification');
      }
    } catch (error: any) {
      console.error('Failed to grant certification:', error);
      Alert.alert('Error', error.message || 'Failed to grant certification. Please try again.');
    } finally {
      setGranting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Grant Certification</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Company Info */}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companySubcategory}>
              {company.subcategory?.replace(/_/g, ' ')}
            </Text>
          </View>

          {/* User Selection Method Toggle */}
          {company.subcategory === 'academy' && courses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select User</Text>
              <View style={styles.methodToggle}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    userSelectionMethod === 'course' && styles.methodButtonActive,
                  ]}
                  onPress={() => {
                    setUserSelectionMethod('course');
                    setSelectedUser(null);
                    setSearchQuery('');
                    setFilteredUsers([]);
                  }}
                >
                  <Ionicons 
                    name="school-outline" 
                    size={18} 
                    color={userSelectionMethod === 'course' ? '#fff' : '#6b7280'} 
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      userSelectionMethod === 'course' && styles.methodButtonTextActive,
                    ]}
                  >
                    From Course
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    userSelectionMethod === 'search' && styles.methodButtonActive,
                  ]}
                  onPress={() => {
                    setUserSelectionMethod('search');
                    setSelectedCourse(null);
                    setCourseRegistrations([]);
                    setSelectedUser(null);
                  }}
                >
                  <Ionicons 
                    name="search-outline" 
                    size={18} 
                    color={userSelectionMethod === 'search' ? '#fff' : '#6b7280'} 
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      userSelectionMethod === 'search' && styles.methodButtonTextActive,
                    ]}
                  >
                    Search User
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Course Selection (if academy and method is 'course') */}
          {company.subcategory === 'academy' && userSelectionMethod === 'course' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Course</Text>
              {loadingCourses ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              ) : courses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="school-outline" size={32} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>No courses available</Text>
                </View>
              ) : (
                <View style={styles.coursesList}>
                  {courses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.courseItem,
                        selectedCourse?.id === course.id && styles.courseItemSelected,
                      ]}
                      onPress={() => setSelectedCourse(course)}
                    >
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseTitle}>{course.title}</Text>
                        <Text style={styles.courseStatus}>
                          {course.status} • {course.registration_count || 0} registered
                        </Text>
                      </View>
                      {selectedCourse?.id === course.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Course Registrations (if course selected) */}
          {userSelectionMethod === 'course' && selectedCourse && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Registered Users ({courseRegistrations.length})
              </Text>
              {loadingRegistrations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              ) : courseRegistrations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={32} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>No users registered for this course</Text>
                </View>
              ) : (
                <View style={styles.registrationsList}>
                  {courseRegistrations.map((registration) => {
                    const user = registration.user;
                    const isSelected = selectedUser?.id === user?.id;
                    return (
                      <TouchableOpacity
                        key={registration.id}
                        style={[
                          styles.registrationItem,
                          isSelected && styles.registrationItemSelected,
                        ]}
                        onPress={() => handleSelectUser(user)}
                      >
                        <View style={styles.userInfo}>
                          {user?.image_url ? (
                            <Image
                              source={{ uri: user.image_url }}
                              style={styles.userAvatar}
                            />
                          ) : (
                            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                              <Text style={styles.userAvatarText}>
                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.userDetails}>
                            <Text style={styles.userName}>
                              {user?.name || user?.email || 'Unknown User'}
                            </Text>
                            <Text style={styles.registrationDate}>
                              Registered: {new Date(registration.registered_at).toLocaleDateString()}
                            </Text>
                            {registration.status === 'completed' && (
                              <View style={styles.completedBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                                <Text style={styles.completedText}>Course Completed</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* User Search (if method is 'search') */}
          {userSelectionMethod === 'search' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search User</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
              </View>


              {searching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              ) : filteredUsers.length > 0 && !selectedUser ? (
                <View style={styles.resultsContainer}>
                  {filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userItem}
                      onPress={() => handleSelectUser(user)}
                    >
                      {user.image_url ? (
                        <Image source={{ uri: user.image_url }} style={styles.userItemAvatar} />
                      ) : (
                        <View style={[styles.userItemAvatar, styles.userItemAvatarPlaceholder]}>
                          <Text style={styles.userItemAvatarText}>
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userItemInfo}>
                        <Text style={styles.userItemName}>
                          {user.name || user.email || 'Unknown User'}
                        </Text>
                        {user.primary_role && (
                          <Text style={styles.userItemRole}>
                            {user.primary_role.replace(/_/g, ' ')}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {/* Selected User Display (common for both methods) */}
          {selectedUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selected User</Text>
              <View style={styles.selectedUserContainer}>
                <View style={styles.selectedUserInfo}>
                  {selectedUser.image_url ? (
                    <Image
                      source={{ uri: selectedUser.image_url }}
                      style={styles.userAvatar}
                    />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                      <Text style={styles.userAvatarText}>
                        {(selectedUser.name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {selectedUser.name || selectedUser.email || 'Unknown User'}
                    </Text>
                    {selectedUser.primary_role && (
                      <Text style={styles.userRole}>
                        {selectedUser.primary_role.replace(/_/g, ' ')}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Certification Template Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certification Template</Text>
            {loadingTemplates ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : authorizedTemplates.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={32} color="#d1d5db" />
                <Text style={styles.emptyStateText}>
                  No authorized certifications available
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  This academy has not been authorized to grant any certifications yet.{'\n\n'}
                  Even if certifications exist in the database, an administrator must authorize this academy to grant them.{'\n\n'}
                  Contact an administrator to request authorization for certification templates.
                </Text>
              </View>
            ) : (
              <View style={styles.templatesList}>
                {authorizedTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateItem,
                      selectedTemplate?.id === template.id && styles.templateItemSelected,
                    ]}
                    onPress={() => handleSelectTemplate(template)}
                  >
                    <View style={styles.templateIcon}>
                      <Ionicons
                        name={getValidIconName(template.icon_name || 'trophy')}
                        size={24}
                        color={selectedTemplate?.id === template.id ? '#3b82f6' : '#6b7280'}
                      />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text
                        style={[
                          styles.templateName,
                          selectedTemplate?.id === template.id && styles.templateNameSelected,
                        ]}
                      >
                        {template.name}
                      </Text>
                      {template.description && (
                        <Text style={styles.templateDescription}>{template.description}</Text>
                      )}
                      {template.default_expiration_days && (
                        <Text style={styles.templateExpiration}>
                          Default expiration: {template.default_expiration_days} days
                        </Text>
                      )}
                    </View>
                    {selectedTemplate?.id === template.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Expiration Date */}
          {selectedTemplate && (
            <View style={styles.section}>
              <DatePicker
                label="Expiration Date (Optional)"
                value={expirationDate || null}
                onChange={(date) => setExpirationDate(date || '')}
                placeholder="Select expiration date"
                mode="date"
                minimumDate={new Date()}
                style={styles.datePickerContainer}
              />
              <Text style={styles.inputHint}>
                Leave empty if certification doesn't expire
              </Text>
            </View>
          )}

          {/* Certificate Image Upload */}
          {selectedTemplate && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certificate Image (Optional)</Text>
              {certificateImageUrl ? (
                <View style={styles.certificateImageContainer}>
                  <Image source={{ uri: certificateImageUrl }} style={styles.certificateImagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setCertificateImageUrl('')}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadCertificateButton}
                  onPress={handleUploadCertificateImage}
                  disabled={uploadingCertificateImage}
                >
                  {uploadingCertificateImage ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={24} color="#3b82f6" />
                      <Text style={styles.uploadCertificateButtonText}>Upload Certificate Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <Text style={styles.inputHint}>
                Upload a custom certificate image/template for this certification
              </Text>
            </View>
          )}

          {/* Certificate URL */}
          {selectedTemplate && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certificate Document URL (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://..."
                value={certificateUrl}
                onChangeText={setCertificateUrl}
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
              <Text style={styles.inputHint}>
                URL to the certificate document (PDF, image, etc.) - separate from certificate image above
              </Text>
            </View>
          )}

          {/* Notes */}
          {selectedTemplate && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Additional notes about this certification..."
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.grantButton,
              (!selectedUser || !selectedTemplate || granting) && styles.grantButtonDisabled,
            ]}
            onPress={handleGrantCertification}
            disabled={!selectedUser || !selectedTemplate || granting}
          >
            {granting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="trophy" size={18} color="#ffffff" />
                <Text style={styles.grantButtonText}>Grant Certification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Upload Progress Bar */}
        {uploadProgress.visible && (
          <UploadProgressBar
            visible={uploadProgress.visible}
            progress={uploadProgress.progress}
            label={uploadProgress.label}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  companyInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  companySubcategory: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  selectedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultsContainer: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userItemAvatarPlaceholder: {
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItemAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  userItemRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  templatesList: {
    gap: 12,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  templateItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  templateNameSelected: {
    color: '#3b82f6',
  },
  templateDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  templateExpiration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dateInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  datePickerContainer: {
    marginBottom: 0,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesInput: {
    minHeight: 100,
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  grantButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  grantButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  methodButtonTextActive: {
    color: '#ffffff',
  },
  coursesList: {
    gap: 8,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  courseItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  courseStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  registrationsList: {
    gap: 8,
  },
  registrationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  registrationItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  registrationDate: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  certificateImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  certificateImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#f9fafb',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  uploadCertificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  uploadCertificateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

export default GrantCertificationModal;

