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
    // Format as EGP (Egyptian Pounds) - adjust currency as needed
    return `${price.toFixed(0)} EGP`;
  };

  // Get category acronym (first 3 letters, uppercase)
  const getCategoryAcronym = (): string => {
    if (course.category) {
      return course.category
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 3)
        .padEnd(3, 'X'); // Pad if less than 3 characters
    }
    // Fallback to first 3 letters of title
    return course.title
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 3)
      .padEnd(3, 'X');
  };

  // Extract number of sessions from duration (e.g., "8 Sessions" or "8 weeks" -> 8)
  const getSessionCount = (): number => {
    if (course.duration) {
      const match = course.duration.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
    }
    // Default to 1 if no duration specified
    return 1;
  };

  const categoryAcronym = getCategoryAcronym();
  const sessionCount = getSessionCount();
  const location = course.company?.location_text || course.company?.location || 'Location TBD';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {/* Background - Image or Category Acronym */}
      {course.poster_url ? (
        <Image source={{ uri: course.poster_url }} style={styles.backgroundImage} />
      ) : (
        <View style={styles.backgroundContainer}>
          <Text style={styles.categoryAcronym}>{categoryAcronym}</Text>
        </View>
      )}

      {/* Content Overlay */}
      <View style={styles.contentOverlay}>
        {/* Course Title */}
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Course Details Row */}
        <View style={styles.detailsRow}>
          {/* Date */}
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#fff" />
            <Text style={styles.detailText}>
              {course.start_date ? formatDate(course.start_date) : 'TBD'}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color="#fff" />
            <Text style={styles.detailText} numberOfLines={1}>
              {location}
            </Text>
          </View>

          {/* Sessions Count */}
          <View style={styles.detailItem}>
            <Text style={styles.hashSymbol}>#</Text>
            <Text style={styles.detailText}>
              {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
            </Text>
          </View>
        </View>

        {/* Bottom Section - Price and Details Button */}
        <View style={styles.bottomSection}>
          {/* Price */}
          <Text style={styles.price}>{formatPrice(course.price)}</Text>

          {/* Details Button */}
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <Ionicons name="ticket-outline" size={16} color="#000" />
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons (for management) */}
        {showActions && (onEdit || onDelete) && (
          <View style={styles.actionsContainer}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 200,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
    opacity: 0.3,
  },
  backgroundContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryAcronym: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.1)',
    letterSpacing: 20,
    position: 'absolute',
    textAlign: 'center',
  },
  contentOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 26,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#fff',
  },
  hashSymbol: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    gap: 6,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  actionsContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CourseCard;
