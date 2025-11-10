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
import { CourseDetailPageProps, CourseWithDetails } from '../types';

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  courseId,
  companyId,
  onBack,
  onRegister,
  onUnregister,
}) => {
  const { getCourseById, registerForCourse, unregisterFromCourse, user } = useApi();
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [courseId, companyId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await getCourseById(courseId, companyId);
      if (response.success && response.data) {
        setCourse(response.data);
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

  const handleRegister = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to register for this course.');
      return;
    }

    if (course?.available_seats === 0 && course.total_seats > 0) {
      Alert.alert('Course Full', 'This course has no available seats.');
      return;
    }

    Alert.alert(
      'Register for Course',
      `Are you sure you want to register for "${course?.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Register',
          onPress: async () => {
            try {
              setRegistering(true);
              const response = await registerForCourse(courseId);
              if (response.success) {
                Alert.alert('Success', 'You have successfully registered for this course!');
                if (onRegister) {
                  onRegister();
                }
                loadCourse(); // Reload to update registration status
              } else {
                Alert.alert('Error', response.error || 'Failed to register for course');
              }
            } catch (error: any) {
              console.error('Failed to register for course:', error);
              Alert.alert('Error', error.message || 'Failed to register for course');
            } finally {
              setRegistering(false);
            }
          },
        },
      ]
    );
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
        {course.poster_url ? (
          <Image source={{ uri: course.poster_url }} style={styles.poster} />
        ) : (
          <View style={[styles.posterPlaceholder, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name="school" size={64} color={statusColor} />
          </View>
        )}

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
          </Text>
        </View>

        {/* Course Title */}
        <Text style={styles.title}>{course.title}</Text>

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
});

export default CourseDetailPage;

