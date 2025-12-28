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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApi } from '../contexts/ApiContext';
import { CourseEditPageProps, UpdateCourseRequest, CourseStatus } from '../types';
import DatePicker from '../components/DatePicker';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';
import MediaPickerService from '../services/MediaPickerService';

const CourseEditPage: React.FC<CourseEditPageProps> = ({
  courseId: courseIdProp,
  companyId: companyIdProp,
  onBack: onBackProp,
  onCourseUpdated,
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'courseEdit'>['route']>();
  const navigation = useNavigation();
  const routeParams = route.params;
  const { goBack } = useAppNavigation();
  
  // Use props if provided (for backward compatibility), otherwise use route params or hooks
  const onBack = onBackProp || goBack;
  
  // Get courseId and companyId from route params or props
  const courseId = courseIdProp || routeParams?.courseId || '';
  const companyId = companyIdProp || routeParams?.companyId || '';
  
  // If no courseId provided, show error
  if (!courseId || courseId.trim() === '') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          Course ID not provided
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          Please navigate to this page from a course management page.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3b82f6', borderRadius: 8 }}
          onPress={onBack}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // If no companyId provided, show error
  if (!companyId || companyId.trim() === '') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          Company ID not provided
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          Company ID is required to edit a course.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3b82f6', borderRadius: 8 }}
          onPress={onBack}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const { getCourseById, updateCourse, deleteCourse, uploadCoursePoster } = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const mediaPicker = MediaPickerService.getInstance();
  const [formData, setFormData] = useState<UpdateCourseRequest>({
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
  });

  useEffect(() => {
    loadCourse();
  }, [courseId, companyId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await getCourseById(courseId, companyId);
      if (response.success && response.data) {
        const course = response.data;
        setFormData({
          title: course.title || '',
          description: course.description || '',
          price: course.price,
          total_seats: course.total_seats || 0,
          poster_url: course.poster_url || '',
          start_date: course.start_date || '',
          end_date: course.end_date || '',
          duration: course.duration || '',
          category: course.category || '',
          status: course.status || 'draft',
        });
      } else {
        Alert.alert('Error', response.error || 'Failed to load course');
        onBack();
      }
    } catch (error: any) {
      console.error('Failed to load course:', error);
      Alert.alert('Error', error.message || 'Failed to load course');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateCourseRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.title?.trim()) {
      Alert.alert('Error', 'Course title is required');
      return false;
    }
    if (formData.total_seats !== undefined && formData.total_seats < 0) {
      Alert.alert('Error', 'Total seats must be 0 or greater');
      return false;
    }
    if (formData.price !== undefined && formData.price < 0) {
      Alert.alert('Error', 'Price must be 0 or greater');
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
      const updates: UpdateCourseRequest = {
        ...formData,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        price: formData.price === undefined || formData.price === 0 ? undefined : formData.price,
      };

      const response = await updateCourse(companyId, courseId, updates);
      if (response.success) {
        Alert.alert('Success', 'Course updated successfully!');
        if (onCourseUpdated) {
          onCourseUpdated();
        }
        onBack();
      } else {
        Alert.alert('Error', response.error || 'Failed to update course');
      }
    } catch (error: any) {
      console.error('Failed to update course:', error);
      Alert.alert('Error', error.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const response = await deleteCourse(companyId, courseId);
              if (response.success) {
                Alert.alert('Success', 'Course deleted successfully!');
                onBack();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete course');
              }
            } catch (error: any) {
              console.error('Failed to delete course:', error);
              Alert.alert('Error', error.message || 'Failed to delete course');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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

      const file = {
        uri: imageResult.uri,
        type: 'image/jpeg',
        name: imageResult.fileName || `course_poster_${Date.now()}.jpg`,
      };

      const response = await uploadCoursePoster(courseId, file);

      if (response.success && response.data?.url) {
        // Update form data with uploaded URL
        handleInputChange('poster_url', response.data.url);
        Alert.alert('Success', 'Course poster uploaded successfully!');
      } else {
        throw new Error(response.error || 'Failed to upload poster');
      }
    } catch (error: any) {
      console.error('Failed to upload poster:', error);
      Alert.alert('Error', error.message || 'Failed to upload course poster.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const statusOptions: { value: CourseStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Course</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading course...</Text>
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
        <Text style={styles.headerTitle}>Edit Course</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          )}
        </TouchableOpacity>
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
            <Text style={styles.label}>Total Seats</Text>
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

        {/* Poster Image Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Poster</Text>
          {formData.poster_url ? (
            <View style={styles.posterPreviewContainer}>
              <Image
                source={{ uri: formData.poster_url }}
                style={styles.posterPreview}
                resizeMode="cover"
              />
              <View style={styles.posterActions}>
                <TouchableOpacity
                  style={styles.changePosterButton}
                  onPress={handleUploadPoster}
                  disabled={uploadingPoster}
                >
                  {uploadingPoster ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={18} color="#fff" />
                      <Text style={styles.changePosterButtonText}>Change</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePosterButton}
                  onPress={() => handleInputChange('poster_url', '')}
                  disabled={uploadingPoster}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={styles.uploadPosterButtonLarge}
                onPress={handleUploadPoster}
                disabled={uploadingPoster}
              >
                {uploadingPoster ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.uploadPosterButtonText}>Upload Poster Image</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>Optional: Upload a poster image for your course</Text>
            </View>
          )}
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
          onPress={onBack}
          disabled={saving || deleting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (saving || deleting) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || deleting}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
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
    flexWrap: 'wrap',
  },
  statusOption: {
    flex: 1,
    minWidth: '45%',
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
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  posterPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  posterPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  posterActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  changePosterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  changePosterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  removePosterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPosterButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadPosterButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default CourseEditPage;

