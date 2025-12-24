import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApi } from '../contexts/ApiContext';
import { CourseManagementPageProps, CourseWithDetails, CourseStatus } from '../types';
import CourseCard from '../components/CourseCard';
import CourseCreationModal from '../components/CourseCreationModal';
import { CreateCourseRequest } from '../types';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';

const CoursesManagementPage: React.FC<CourseManagementPageProps> = ({
  companyId: companyIdProp,
  onBack: onBackProp,
  onCourseSelect,
  readOnly: readOnlyProp = false,
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'coursesManagement'>['route']>();
  const navigation = useNavigation();
  const routeParams = route.params;
  const { goBack, navigateTo } = useAppNavigation();
  
  // Use props if provided (for backward compatibility), otherwise use route params or hooks
  const onBack = onBackProp || goBack;
  const onNavigate = navigateTo; // Use navigation context for navigation
  
  // Get companyId and readOnly from route params or props
  const companyId = companyIdProp || routeParams?.companyId || '';
  const readOnly = readOnlyProp || routeParams?.readOnly || false;
  
  // If no companyId provided, show error
  if (!companyId || companyId.trim() === '') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          Company ID not provided
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          Please navigate to this page from a company profile.
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
  
  const { getAcademyCourses, createCourse, deleteCourse, completeCourse } = useApi();
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [completingCourseId, setCompletingCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId && companyId.trim() !== '') {
      loadCourses();
    } else {
      setCourses([]);
      setLoading(false);
    }
  }, [companyId, statusFilter]);

  const loadCourses = async () => {
    // Guard against empty companyId
    if (!companyId || companyId.trim() === '') {
      setCourses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const coursesData = await getAcademyCourses(companyId, filters);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error: any) {
      // Handle "Company not found" errors gracefully
      if (error?.message?.includes('Company not found') || error?.message?.includes('404')) {
        console.warn('Company not found or not accessible for courses:', companyId);
        Alert.alert('Access Denied', 'You do not have access to this company\'s courses, or the company does not exist.');
        setCourses([]);
      } else {
        console.error('Failed to load courses:', error);
        Alert.alert('Error', error?.message || 'Failed to load courses. Please try again.');
        setCourses([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (courseData: CreateCourseRequest) => {
    try {
      const response = await createCourse(companyId, courseData);
      if (response.success) {
        Alert.alert('Success', 'Course created successfully!');
        setShowCreateModal(false);
        loadCourses(); // Reload courses
      } else {
        // Show more helpful error messages
        const errorMessage = response.error || 'Failed to create course';
        if (errorMessage.includes('permission') || errorMessage.includes('owner or admin')) {
          Alert.alert(
            'Permission Denied',
            errorMessage + '\n\nPlease ensure you are logged in as the company owner or admin.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Failed to create course:', error);
      const errorMessage = error.message || 'Failed to create course';
      if (errorMessage.includes('permission') || errorMessage.includes('owner or admin')) {
        Alert.alert(
          'Permission Denied',
          errorMessage + '\n\nPlease ensure you are logged in as the company owner or admin.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleDeleteCourse = (courseId: string) => {
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
              setDeletingCourseId(courseId);
              const response = await deleteCourse(companyId, courseId);
              if (response.success) {
                Alert.alert('Success', 'Course deleted successfully!');
                loadCourses(); // Reload courses
              } else {
                Alert.alert('Error', response.error || 'Failed to delete course');
              }
            } catch (error: any) {
              console.error('Failed to delete course:', error);
              Alert.alert('Error', error.message || 'Failed to delete course');
            } finally {
              setDeletingCourseId(null);
            }
          },
        },
      ]
    );
  };

  const handleEditCourse = (course: CourseWithDetails) => {
    console.log('🔍 [CoursesManagementPage] handleEditCourse called:', {
      courseId: course.id,
      courseTitle: course.title,
      companyId: companyId,
      hasOnNavigate: !!onNavigate,
    });
    
    // Navigate to course edit page
    if (onNavigate) {
      console.log('📱 [CoursesManagementPage] Navigating to courseEdit:', {
        courseId: course.id,
        companyId: companyId,
      });
      onNavigate('courseEdit', {
        courseId: course.id,
        companyId: companyId,
      });
    } else {
      console.error('❌ [CoursesManagementPage] No navigation method available for edit!');
      Alert.alert('Error', 'Unable to navigate to course edit page. Please try again.');
    }
  };

  const handleViewCourse = (course: CourseWithDetails) => {
    console.log('🔍 [CoursesManagementPage] handleViewCourse called:', {
      courseId: course.id,
      courseTitle: course.title,
      companyId: companyId,
      hasOnCourseSelect: !!onCourseSelect,
      hasOnNavigate: !!onNavigate,
    });
    
    // Navigate to course detail page
    if (onCourseSelect) {
      console.log('📱 [CoursesManagementPage] Using onCourseSelect callback');
      onCourseSelect(course);
    } else if (onNavigate) {
      // Fallback: navigate directly using React Navigation
      console.log('📱 [CoursesManagementPage] Navigating to courseDetail:', {
        courseId: course.id,
        companyId: companyId,
      });
      onNavigate('courseDetail', {
        courseId: course.id,
        companyId: companyId,
      });
    } else {
      console.error('❌ [CoursesManagementPage] No navigation method available!');
      Alert.alert('Error', 'Unable to navigate to course details. Please try again.');
    }
  };

  const handleCompleteCourse = (course: CourseWithDetails) => {
    if (course.status === 'completed') {
      Alert.alert('Course Already Completed', 'This course is already marked as completed.');
      return;
    }

    Alert.alert(
      'Complete Course',
      `Mark "${course.title}" as completed?${course.auto_grant_certification ? '\n\nThis will grant certifications to all registered users.' : '\n\nYou can manually grant certifications to users if needed.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Course',
          onPress: async () => {
            try {
              setCompletingCourseId(course.id);
              const response = await completeCourse(course.id, course.auto_grant_certification);
              if (response.success) {
                Alert.alert(
                  'Success',
                  `Course completed!${course.auto_grant_certification ? ' Certifications have been granted to all registered users.' : ''}`
                );
                loadCourses(); // Reload courses
              } else {
                Alert.alert('Error', response.error || 'Failed to complete course');
              }
            } catch (error: any) {
              console.error('Failed to complete course:', error);
              Alert.alert('Error', error.message || 'Failed to complete course');
            } finally {
              setCompletingCourseId(null);
            }
          },
        },
      ]
    );
  };

  const statusOptions: { value: CourseStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const getStatusCount = (status: CourseStatus | 'all'): number => {
    if (status === 'all') return courses.length;
    return courses.filter((c) => c.status === status).length;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{readOnly ? 'Courses' : 'Manage Courses'}</Text>
        {!readOnly && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {readOnly && <View style={styles.backButton} />}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {statusOptions.map((option) => {
            const isSelected = statusFilter === option.value;
            const count = getStatusCount(option.value);
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
                onPress={() => setStatusFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    isSelected && styles.filterButtonTextSelected,
                  ]}
                >
                  {option.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Courses List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={64} color="#e4e4e7" />
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptyText}>
            {statusFilter === 'all'
              ? 'Create your first course to get started!'
              : `No ${statusFilter} courses found.`}
          </Text>
          {!readOnly && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Create Course</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onSelect={() => handleViewCourse(course)}
              onEdit={readOnly ? undefined : () => handleEditCourse(course)}
              onDelete={readOnly ? undefined : () => handleDeleteCourse(course.id)}
              onComplete={readOnly ? undefined : () => handleCompleteCourse(course)}
              showActions={!readOnly}
            />
          ))}
        </ScrollView>
      )}

      {/* Create Course Modal - Only show if not read-only */}
      {!readOnly && (
        <CourseCreationModal
          visible={showCreateModal}
          companyId={companyId}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCourse}
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  filters: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextSelected: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});

export default CoursesManagementPage;

