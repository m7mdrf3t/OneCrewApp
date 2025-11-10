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
import { useApi } from '../contexts/ApiContext';
import { CourseManagementPageProps, CourseWithDetails, CourseStatus } from '../types';
import CourseCard from '../components/CourseCard';
import CourseCreationModal from '../components/CourseCreationModal';
import { CreateCourseRequest } from '../types';

const CoursesManagementPage: React.FC<CourseManagementPageProps> = ({
  companyId,
  onBack,
  onCourseSelect,
}) => {
  const { getAcademyCourses, createCourse, deleteCourse } = useApi();
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, [companyId, statusFilter]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const coursesData = await getAcademyCourses(companyId, filters);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
      setCourses([]);
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
        Alert.alert('Error', response.error || 'Failed to create course');
      }
    } catch (error: any) {
      console.error('Failed to create course:', error);
      Alert.alert('Error', error.message || 'Failed to create course');
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
    if (onCourseSelect) {
      onCourseSelect(course);
    }
  };

  const handleViewCourse = (course: CourseWithDetails) => {
    // Navigate to course detail page
    if (onCourseSelect) {
      // For now, navigate to edit, but could navigate to detail
      onCourseSelect(course);
    }
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
        <Text style={styles.headerTitle}>Manage Courses</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Create Course</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onSelect={() => handleViewCourse(course)}
              onEdit={() => handleEditCourse(course)}
              onDelete={() => handleDeleteCourse(course.id)}
              showActions={true}
            />
          ))}
        </ScrollView>
      )}

      {/* Create Course Modal */}
      <CourseCreationModal
        visible={showCreateModal}
        companyId={companyId}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCourse}
      />
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

