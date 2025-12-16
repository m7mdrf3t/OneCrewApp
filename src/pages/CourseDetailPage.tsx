import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { CourseDetailPageProps, CourseWithDetails, Company } from '../types';
import MediaPickerService from '../services/MediaPickerService';
import UploadProgressBar from '../components/UploadProgressBar';

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  courseId,
  companyId,
  onBack,
  onRegister,
  onUnregister,
  onNavigate,
}) => {
  const { 
    getCourseById, 
    registerForCourse, 
    unregisterFromCourse, 
    user, 
    getCompany,
    uploadCoursePoster,
    getCompanyMembers,
    activeCompany,
    currentProfileType,
  } = useApi();
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
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

  useEffect(() => {
    loadCourse();
  }, [courseId, companyId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await getCourseById(courseId, companyId);
      if (response.success && response.data) {
        setCourse(response.data);
        // Load company data if not already loaded
        const courseCompanyId = response.data.company_id || companyId;
        if (courseCompanyId && !company) {
          loadCompanyData(courseCompanyId);
        }
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

  const loadCompanyData = async (id: string) => {
    try {
      // Use include parameter to load company and members in single request (v2.24.0 optimization)
      const companyResponse = await getCompany(id, {
        include: ['members'],
        membersLimit: 50,
        membersPage: 1
      });
      if (companyResponse.success && companyResponse.data) {
        setCompany(companyResponse.data);
        // Extract members from included data
        if (companyResponse.data.members) {
          const members = Array.isArray(companyResponse.data.members) 
            ? companyResponse.data.members 
            : (companyResponse.data.members.data || []);
          setCompanyMembers(members);
        } else {
          // Fallback: load members separately if not included
          const membersResponse = await getCompanyMembers(id);
          if (membersResponse.success && membersResponse.data) {
            const members = Array.isArray(membersResponse.data) 
              ? membersResponse.data 
              : (membersResponse.data.data || []);
            setCompanyMembers(members);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load company data:', error);
    }
  };

  // Check if user can edit course (academy owner/admin)
  const canEditCourse = (): boolean => {
    if (!user || !company || !course) return false;
    
    // Check if user is viewing their active company
    if (currentProfileType === 'company' && activeCompany?.id === company.id) {
      return true;
    }
    
    // Check if user is company owner
    if (company.owner?.id === user.id) {
      return true;
    }
    
    // Check if user is a member with admin/owner role
    const userMember = companyMembers.find(m => m.user_id === user.id);
    if (userMember && (userMember.role === 'owner' || userMember.role === 'admin')) {
      return true;
    }
    
    return false;
  };

  const handleUploadPoster = async () => {
    if (!course?.id) return;

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
    if (!course?.id) return;

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

      const response = await uploadCoursePoster(course.id, file);

      setUploadProgress({ visible: false, label: '' });
      if (response.success && response.data?.url) {
        // Reload course data to show new poster
        await loadCourse();
        Alert.alert('Success', 'Course poster uploaded successfully!');
      } else {
        throw new Error(response.error || 'Failed to upload poster');
      }
    } catch (error: any) {
      console.error('Failed to upload poster:', error);
      setUploadProgress({ visible: false, label: '' });
      Alert.alert('Error', error.message || 'Failed to upload course poster.');
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to start a conversation with the academy.');
      return;
    }

    // Get company data for chat navigation
    let companyData = course?.company;
    if (!companyData && (course?.company_id || companyId)) {
      try {
        // Only fetch minimal fields needed for navigation (v2.24.0 optimization)
        const companyResponse = await getCompany(course?.company_id || companyId || '', {
          fields: ['id', 'name', 'logo_url']
        });
        if (companyResponse.success && companyResponse.data) {
          companyData = companyResponse.data;
        }
      } catch (companyError) {
        console.error('Failed to fetch company data:', companyError);
        Alert.alert('Error', 'Failed to load academy information. Please try again.');
        return;
      }
    }

    // Navigate to chat with academy if company data is available and onNavigate is provided
    if (companyData && onNavigate && course) {
      const participant = {
        id: companyData.id,
        category: 'company' as const,
      };
      onNavigate('chat', {
        participant,
        courseData: course,
      });
    } else {
      Alert.alert('Error', 'Unable to start conversation. Academy information is missing.');
    }
  };

  const handleUnregister = async () => {
    Alert.alert(
      'Unregister from Course',
      `Are you sure you want to unregister from "${course?.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnregistering(true);
              const response = await unregisterFromCourse(courseId);
              if (response.success) {
                Alert.alert('Success', 'You have successfully unregistered from this course.');
                if (onUnregister) {
                  onUnregister();
                }
                loadCourse(); // Reload to update registration status
              } else {
                Alert.alert('Error', response.error || 'Failed to unregister from course');
              }
            } catch (error: any) {
              console.error('Failed to unregister from course:', error);
              Alert.alert('Error', error.message || 'Failed to unregister from course');
            } finally {
              setUnregistering(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price?: number): string => {
    if (!price || price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'published':
        return '#10b981';
      case 'draft':
        return '#6b7280';
      case 'completed':
        return '#3b82f6';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Course not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCourse}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(course.status);
  const hasAvailableSeats = course.available_seats > 0;
  const isFull = course.total_seats > 0 && course.available_seats === 0;
  const isRegistered = course.is_registered;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Course Poster */}
        <View style={styles.posterContainer}>
          {course.poster_url ? (
            <Image source={{ uri: course.poster_url }} style={styles.poster} />
          ) : (
            <View style={[styles.posterPlaceholder, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name="school" size={64} color={statusColor} />
            </View>
          )}
          {/* Upload Button Overlay (for academy admins) */}
          {canEditCourse() && (
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
          )}
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
          </Text>
        </View>

        {/* Course Title */}
        <Text style={styles.title}>{course.title}</Text>

        {/* Primary Lecturer */}
        {course.primary_lecturer && (
          <View style={styles.lecturerSection}>
            <View style={styles.lecturerInfo}>
              {course.primary_lecturer.image_url ? (
                <Image
                  source={{ uri: course.primary_lecturer.image_url }}
                  style={styles.lecturerAvatar}
                />
              ) : (
                <View style={styles.lecturerAvatarPlaceholder}>
                  <Text style={styles.lecturerAvatarText}>
                    {course.primary_lecturer.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.lecturerDetails}>
                <Text style={styles.lecturerLabel}>Primary Lecturer</Text>
                <Text style={styles.lecturerName}>{course.primary_lecturer.name}</Text>
                {course.primary_lecturer.primary_role && (
                  <Text style={styles.lecturerRole}>
                    {course.primary_lecturer.primary_role.replace(/_/g, ' ')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Course Description */}
        {course.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{course.description}</Text>
          </View>
        )}

        {/* Course Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Details</Text>

          {/* Price */}
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>{formatPrice(course.price)}</Text>
          </View>

          {/* Start Date */}
          {course.start_date && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.detailLabel}>Start Date:</Text>
              <Text style={styles.detailValue}>{formatDate(course.start_date)}</Text>
            </View>
          )}

          {/* End Date */}
          {course.end_date && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.detailLabel}>End Date:</Text>
              <Text style={styles.detailValue}>{formatDate(course.end_date)}</Text>
            </View>
          )}

          {/* Duration */}
          {course.duration && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{course.duration}</Text>
            </View>
          )}

          {/* Seats */}
          {course.total_seats > 0 && (
            <View style={styles.detailRow}>
              <Ionicons
                name="people-outline"
                size={20}
                color={isFull ? '#ef4444' : hasAvailableSeats ? '#10b981' : '#6b7280'}
              />
              <Text style={styles.detailLabel}>Seats:</Text>
              <Text
                style={[
                  styles.detailValue,
                  isFull && styles.fullText,
                  hasAvailableSeats && !isFull && styles.availableText,
                ]}
              >
                {course.available_seats} / {course.total_seats} available
              </Text>
            </View>
          )}

          {/* Category */}
          {course.category && (
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={20} color="#6b7280" />
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{course.category}</Text>
            </View>
          )}

          {/* Registration Count */}
          {course.registration_count !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="person-add-outline" size={20} color="#6b7280" />
              <Text style={styles.detailLabel}>Registrations:</Text>
              <Text style={styles.detailValue}>{course.registration_count}</Text>
            </View>
          )}
        </View>

        {/* Instructors */}
        {course.instructors && course.instructors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructors</Text>
            {course.instructors.map((instructor, index) => (
              <View key={index} style={styles.instructorRow}>
                <Ionicons name="person-circle-outline" size={24} color="#6b7280" />
                <Text style={styles.instructorName}>{instructor.name || 'Unknown'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Company Info */}
        {course.company && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academy</Text>
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={20} color="#6b7280" />
              <Text style={styles.detailValue}>{course.company.name}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {user && (
        <View style={styles.footer}>
          {isRegistered ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.unregisterButton]}
              onPress={handleUnregister}
              disabled={unregistering}
            >
              {unregistering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-remove-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Unregister</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.registerButton,
                (isFull || course.status !== 'published') && styles.actionButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={registering || isFull || course.status !== 'published'}
            >
              {registering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {isFull ? 'Course Full' : 'Register Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress.visible && (
        <UploadProgressBar
          visible={uploadProgress.visible}
          progress={uploadProgress.progress}
          label={uploadProgress.label}
        />
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  posterContainer: {
    position: 'relative',
    width: '100%',
  },
  poster: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPosterButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#000',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  availableText: {
    color: '#10b981',
    fontWeight: '500',
  },
  fullText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  instructorName: {
    fontSize: 16,
    color: '#000',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  registerButton: {
    backgroundColor: '#3b82f6',
  },
  unregisterButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  lecturerSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lecturerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lecturerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  lecturerAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lecturerAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#71717a',
  },
  lecturerDetails: {
    flex: 1,
  },
  lecturerLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  lecturerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  lecturerRole: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
});

export default CourseDetailPage;

