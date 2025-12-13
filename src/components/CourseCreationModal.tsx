import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseCreationModalProps, CreateCourseRequest, CourseStatus, User } from '../types';
import { useApi } from '../contexts/ApiContext';
import DatePicker from './DatePicker';
import MediaPickerService from '../services/MediaPickerService';
import UploadProgressBar from './UploadProgressBar';

const CourseCreationModal: React.FC<CourseCreationModalProps> = ({
  visible,
  companyId,
  onClose,
  onSubmit,
}) => {
  const { api, getCompany, uploadFile } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState('');
  const [filteredLecturers, setFilteredLecturers] = useState<User[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<User | null>(null);
  const [searchingLecturer, setSearchingLecturer] = useState(false);
  const [companyDefaultDesign, setCompanyDefaultDesign] = useState<'vertical' | 'horizontal' | 'large' | undefined>(undefined);
  const [uploadingPoster, setUploadingPoster] = useState(false);
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
  const [formData, setFormData] = useState<CreateCourseRequest>({
    title: '',
    description: '',
    price: undefined,
    total_seats: 0,
    poster_url: '',
    start_date: '',
    end_date: '',
    duration: '',
    category: '',
    status: 'draft',
    number_of_sessions: undefined,
    design: undefined,
    certification_template: {
      name: '',
      description: '',
      category: '',
    },
    auto_grant_certification: false,
  });

  // Load company default design when modal opens
  useEffect(() => {
    if (visible && companyId) {
      const loadCompanyData = async () => {
        try {
          const response = await getCompany(companyId);
          if (response.success && response.data?.default_course_design) {
            setCompanyDefaultDesign(response.data.default_course_design);
            setFormData(prev => ({
              ...prev,
              design: response.data.default_course_design,
            }));
          }
        } catch (error) {
          console.error('Failed to load company data:', error);
        }
      };
      loadCompanyData();
    }
  }, [visible, companyId, getCompany]);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setFormData({
        title: '',
        description: '',
        price: undefined,
        total_seats: 0,
        poster_url: '',
        start_date: '',
        end_date: '',
        duration: '',
        category: '',
        status: 'draft',
        number_of_sessions: undefined,
        design: companyDefaultDesign,
        certification_template: {
          name: '',
          description: '',
          category: '',
        },
        auto_grant_certification: false,
      });
      setLecturerSearchQuery('');
      setFilteredLecturers([]);
      setSelectedLecturer(null);
    }
  }, [visible, companyDefaultDesign]);

  // Search lecturers when search query changes
  useEffect(() => {
    const searchLecturers = async () => {
      if (!lecturerSearchQuery.trim()) {
        setFilteredLecturers([]);
        return;
      }

      try {
        setSearchingLecturer(true);
        const response = await api.getUsers({
          q: lecturerSearchQuery,
          limit: 20,
        });

        if (response.success && response.data) {
          const usersArray = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          setFilteredLecturers(usersArray.slice(0, 10));
        } else {
          setFilteredLecturers([]);
        }
      } catch (error) {
        console.error('Failed to search lecturers:', error);
        setFilteredLecturers([]);
      } finally {
        setSearchingLecturer(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchLecturers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [lecturerSearchQuery, api]);

  const handleInputChange = (field: keyof CreateCourseRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectLecturer = (lecturer: User) => {
    setSelectedLecturer(lecturer);
    setLecturerSearchQuery(lecturer.name || lecturer.email || '');
    setFilteredLecturers([]);
    handleInputChange('primary_lecturer_id', lecturer.id);
  };

  const handleClearLecturer = () => {
    setSelectedLecturer(null);
    setLecturerSearchQuery('');
    setFilteredLecturers([]);
    handleInputChange('primary_lecturer_id', undefined);
  };

  const handleUploadPoster = async () => {
    try {
      // Request permissions
      const hasPermission = await mediaPicker.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera and media library permissions are required to upload a poster.');
        return;
      }

      // Show action sheet to choose between camera and gallery
      Alert.alert(
        'Upload Course Poster',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const result = await mediaPicker.pickImage({
                  allowsEditing: true,
                  quality: 0.8,
                  aspect: [16, 9],
                  maxWidth: 1920,
                  maxHeight: 1080,
                });

                if (result) {
                  await uploadPosterFile(result);
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
                  quality: 0.8,
                  aspect: [16, 9],
                });

                if (result) {
                  await uploadPosterFile(result);
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
      console.error('Error in handleUploadPoster:', error);
      Alert.alert('Error', error.message || 'Failed to upload poster.');
    }
  };

  const uploadPosterFile = async (imageResult: any) => {
    try {
      setUploadingPoster(true);
      setUploadProgress({
        visible: true,
        progress: undefined,
        label: 'Uploading course poster...',
      });

      const file = {
        uri: imageResult.uri,
        type: 'image/jpeg',
        name: imageResult.fileName || `course_poster_${Date.now()}.jpg`,
      };

      const response = await uploadFile(file);

      setUploadProgress({ visible: false });
      if (response.success && response.url) {
        // Update form data with uploaded URL
        handleInputChange('poster_url', response.url);
        Alert.alert('Success', 'Course poster uploaded successfully!');
      } else {
        throw new Error(response.error || 'Failed to upload poster');
      }
    } catch (error: any) {
      console.error('Failed to upload poster:', error);
      setUploadProgress({ visible: false });
      Alert.alert('Error', error.message || 'Failed to upload course poster.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Course title is required');
      return false;
    }
    if (!formData.certification_template.name.trim()) {
      Alert.alert('Error', 'Certification template name is required');
      return false;
    }
    if (formData.total_seats < 0) {
      Alert.alert('Error', 'Total seats must be 0 or greater');
      return false;
    }
    if (formData.price !== undefined && formData.price < 0) {
      Alert.alert('Error', 'Price must be 0 or greater');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Convert dates to ISO format if they exist
      const courseData: CreateCourseRequest = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        price: formData.price === undefined || formData.price === 0 ? undefined : formData.price,
        total_seats: formData.total_seats || 0,
      };

      await onSubmit(courseData);
      onClose();
    } catch (error) {
      console.error('Failed to create course:', error);
      Alert.alert('Error', 'Failed to create course. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: CourseStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Course</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Course Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="Enter course title"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Describe the course..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Price and Seats Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.textInput}
                value={formData.price?.toString() || ''}
                onChangeText={(value) => {
                  const numValue = value === '' ? undefined : parseFloat(value);
                  handleInputChange('price', isNaN(numValue as number) ? undefined : numValue);
                }}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>Leave empty for free</Text>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Total Seats *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.total_seats?.toString() || '0'}
                onChangeText={(value) => {
                  const numValue = parseInt(value) || 0;
                  handleInputChange('total_seats', numValue);
                }}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>0 = unlimited</Text>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <DatePicker
                label="Start Date"
                value={formData.start_date || null}
                onChange={(date) => handleInputChange('start_date', date || '')}
                placeholder="Select start date"
                mode="date"
                style={styles.datePicker}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <DatePicker
                label="End Date"
                value={formData.end_date || null}
                onChange={(date) => handleInputChange('end_date', date || '')}
                placeholder="Select end date"
                mode="date"
                minimumDate={formData.start_date ? new Date(formData.start_date) : undefined}
                style={styles.datePicker}
              />
            </View>
          </View>

          {/* Duration and Category Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Duration</Text>
              <TextInput
                style={styles.textInput}
                value={formData.duration}
                onChangeText={(value) => handleInputChange('duration', value)}
                placeholder="e.g., 2 hours, 5 days"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.textInput}
                value={formData.category}
                onChangeText={(value) => handleInputChange('category', value)}
                placeholder="e.g., Acting, Directing"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Number of Sessions and Design Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Number of Sessions</Text>
              <TextInput
                style={styles.textInput}
                value={formData.number_of_sessions?.toString() || ''}
                onChangeText={(value) => {
                  const numValue = value === '' ? undefined : parseInt(value);
                  handleInputChange('number_of_sessions', isNaN(numValue as number) ? undefined : numValue);
                }}
                placeholder="e.g., 10"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>Total number of course sessions</Text>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Course Design</Text>
              <View style={styles.designContainer}>
                {(['vertical', 'horizontal', 'large'] as const).map((designOption) => (
                  <TouchableOpacity
                    key={designOption}
                    style={[
                      styles.designOption,
                      formData.design === designOption && styles.designOptionSelected,
                    ]}
                    onPress={() => handleInputChange('design', designOption)}
                  >
                    <Text
                      style={[
                        styles.designOptionText,
                        formData.design === designOption && styles.designOptionTextSelected,
                      ]}
                    >
                      {designOption.charAt(0).toUpperCase() + designOption.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>
                {companyDefaultDesign ? `Default: ${companyDefaultDesign}` : 'Card layout style'}
              </Text>
            </View>
          </View>

          {/* Primary Lecturer */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primary Lecturer</Text>
            {selectedLecturer ? (
              <View style={styles.selectedLecturerCard}>
                <View style={styles.lecturerInfo}>
                  {selectedLecturer.image_url ? (
                    <Image
                      source={{ uri: selectedLecturer.image_url }}
                      style={styles.lecturerAvatar}
                    />
                  ) : (
                    <View style={styles.lecturerAvatarPlaceholder}>
                      <Text style={styles.lecturerAvatarText}>
                        {selectedLecturer.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.lecturerDetails}>
                    <Text style={styles.lecturerName}>{selectedLecturer.name}</Text>
                    {selectedLecturer.email && (
                      <Text style={styles.lecturerEmail}>{selectedLecturer.email}</Text>
                    )}
                    {selectedLecturer.primary_role && (
                      <Text style={styles.lecturerRole}>
                        {selectedLecturer.primary_role.replace(/_/g, ' ')}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.clearLecturerButton}
                  onPress={handleClearLecturer}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.textInput}
                  value={lecturerSearchQuery}
                  onChangeText={setLecturerSearchQuery}
                  placeholder="Search for lecturer by name or email..."
                  placeholderTextColor="#9ca3af"
                />
                {searchingLecturer && (
                  <ActivityIndicator size="small" color="#3b82f6" style={styles.loader} />
                )}
                {filteredLecturers.length > 0 && (
                  <View style={styles.lecturersList}>
                    {filteredLecturers.map((lecturer) => (
                      <TouchableOpacity
                        key={lecturer.id}
                        style={styles.lecturerItem}
                        onPress={() => handleSelectLecturer(lecturer)}
                      >
                        <View style={styles.lecturerInfo}>
                          {lecturer.image_url ? (
                            <Image
                              source={{ uri: lecturer.image_url }}
                              style={styles.lecturerAvatar}
                            />
                          ) : (
                            <View style={styles.lecturerAvatarPlaceholder}>
                              <Text style={styles.lecturerAvatarText}>
                                {lecturer.name?.charAt(0).toUpperCase() || '?'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.lecturerDetails}>
                            <Text style={styles.lecturerName}>{lecturer.name}</Text>
                            {lecturer.email && (
                              <Text style={styles.lecturerEmail}>{lecturer.email}</Text>
                            )}
                            {lecturer.primary_role && (
                              <Text style={styles.lecturerRole}>
                                {lecturer.primary_role.replace(/_/g, ' ')}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#71717a" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Poster URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Poster URL</Text>
            <View style={styles.posterUrlRow}>
              <TextInput
                style={[styles.textInput, styles.posterUrlInput]}
                value={formData.poster_url}
                onChangeText={(value) => handleInputChange('poster_url', value)}
                placeholder="https://example.com/poster.jpg"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                style={styles.uploadPosterButton}
                onPress={handleUploadPoster}
                disabled={uploadingPoster}
              >
                {uploadingPoster ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Optional image URL for course poster, or upload directly</Text>
          </View>

          {/* Certification Template Section */}
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionTitle}>Certification Template *</Text>
            <Text style={styles.sectionSubtitle}>
              Create a certification template for this course. Participants will receive this certification upon completion.
            </Text>
          </View>

          {/* Certification Template Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Certification Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.certification_template.name}
              onChangeText={(value) =>
                handleInputChange('certification_template', {
                  ...formData.certification_template,
                  name: value,
                })
              }
              placeholder="e.g., Acting Fundamentals Certificate"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Certification Template Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Certification Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.certification_template.description || ''}
              onChangeText={(value) =>
                handleInputChange('certification_template', {
                  ...formData.certification_template,
                  description: value,
                })
              }
              placeholder="Describe what this certification represents..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Certification Template Category and Expiration */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Certification Category</Text>
              <TextInput
                style={styles.textInput}
                value={formData.certification_template.category || ''}
                onChangeText={(value) =>
                  handleInputChange('certification_template', {
                    ...formData.certification_template,
                    category: value,
                  })
                }
                placeholder="e.g., Acting, Directing"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Expiration Days</Text>
              <TextInput
                style={styles.textInput}
                value={formData.certification_template.default_expiration_days?.toString() || ''}
                onChangeText={(value) => {
                  const numValue = value === '' ? undefined : parseInt(value);
                  handleInputChange('certification_template', {
                    ...formData.certification_template,
                    default_expiration_days: isNaN(numValue as number) ? undefined : numValue,
                  });
                }}
                placeholder="365"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>Leave empty for no expiration</Text>
            </View>
          </View>

          {/* Auto Grant Certification */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                handleInputChange('auto_grant_certification', !formData.auto_grant_certification)
              }
            >
              <View
                style={[
                  styles.checkbox,
                  formData.auto_grant_certification && styles.checkboxChecked,
                ]}
              >
                {formData.auto_grant_certification && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>Auto-grant certification on course completion</Text>
                <Text style={styles.checkboxHint}>
                  Automatically grant this certification to all registered users when the course is completed
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    formData.status === option.value && styles.statusOptionSelected,
                  ]}
                  onPress={() => handleInputChange('status', option.value)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === option.value && styles.statusOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Creating...' : 'Create Course'}
            </Text>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  datePicker: {
    marginTop: 0,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  checkboxHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  loader: {
    marginVertical: 8,
  },
  selectedLecturerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  lecturerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lecturerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  lecturerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lecturerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  lecturerDetails: {
    flex: 1,
  },
  lecturerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  lecturerEmail: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 2,
  },
  lecturerRole: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  clearLecturerButton: {
    padding: 4,
  },
  lecturersList: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  lecturerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  posterUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  posterUrlInput: {
    flex: 1,
  },
  uploadPosterButton: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  designContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  designOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  designOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  designOptionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  designOptionTextSelected: {
    color: '#fff',
  },
});

export default CourseCreationModal;

