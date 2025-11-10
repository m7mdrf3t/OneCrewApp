import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseCardProps, CourseStatus } from '../types';

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onSelect,
  onEdit,
  onDelete,
  showActions = false,
}) => {
  const getStatusColor = (status: CourseStatus): string => {
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

  const getStatusLabel = (status: CourseStatus): string => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'draft':
        return 'Draft';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price?: number): string => {
    if (!price || price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const statusColor = getStatusColor(course.status);
  const hasAvailableSeats = course.available_seats > 0;
  const isFull = course.total_seats > 0 && course.available_seats === 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Course Poster/Image */}
      {course.poster_url ? (
        <Image source={{ uri: course.poster_url }} style={styles.poster} />
      ) : (
        <View style={[styles.posterPlaceholder, { backgroundColor: statusColor + '20' }]}>
          <Ionicons name="school" size={32} color={statusColor} />
        </View>
      )}

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {getStatusLabel(course.status)}
        </Text>
      </View>

      {/* Course Info */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>

        {course.description && (
          <Text style={styles.description} numberOfLines={2}>
            {course.description}
          </Text>
        )}

        {/* Course Details */}
        <View style={styles.details}>
          {/* Price */}
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{formatPrice(course.price)}</Text>
          </View>

          {/* Dates */}
          {course.start_date && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{formatDate(course.start_date)}</Text>
            </View>
          )}

          {/* Duration */}
          {course.duration && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{course.duration}</Text>
            </View>
          )}

          {/* Seats */}
          {course.total_seats > 0 && (
            <View style={styles.detailItem}>
              <Ionicons
                name="people-outline"
                size={16}
                color={isFull ? '#ef4444' : hasAvailableSeats ? '#10b981' : '#6b7280'}
              />
              <Text
                style={[
                  styles.detailText,
                  isFull && styles.fullText,
                  hasAvailableSeats && !isFull && styles.availableText,
                ]}
              >
                {course.available_seats} / {course.total_seats} seats
              </Text>
            </View>
          )}

          {/* Registration Count (if available) */}
          {course.registration_count !== undefined && (
            <View style={styles.detailItem}>
              <Ionicons name="person-add-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>
                {course.registration_count} registered
              </Text>
            </View>
          )}

          {/* Category */}
          {course.category && (
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{course.category}</Text>
            </View>
          )}
        </View>

        {/* Registration Status */}
        {course.is_registered && (
          <View style={styles.registeredBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.registeredText}>You're registered</Text>
          </View>
        )}

        {/* Action Buttons */}
        {showActions && (onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Ionicons name="create-outline" size={18} color="#3b82f6" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poster: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  details: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  availableText: {
    color: '#10b981',
    fontWeight: '500',
  },
  fullText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#10b98120',
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  registeredText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3b82f620',
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ef444420',
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
});

export default CourseCard;

