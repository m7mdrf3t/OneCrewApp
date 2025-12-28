import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseCardProps, CourseStatus } from '../types';

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onSelect,
  onEdit,
  onDelete,
  onComplete,
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

  // Get number of sessions - use direct field if available, otherwise extract from duration
  const getSessionCount = (): number => {
    // v2.16.0: Use number_of_sessions field if available
    if (course.number_of_sessions !== undefined && course.number_of_sessions > 0) {
      return course.number_of_sessions;
    }
    // Fallback: Extract from duration (e.g., "8 Sessions" or "8 weeks" -> 8)
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
  const location = course.company?.location_text || course.company?.address || course.company?.city || 'Location TBD';
  
  // Determine design: use course design, fallback to company default, or 'vertical'
  const design = course.design || course.company?.default_course_design || 'vertical';
  
  // Get styles based on design
  const getContainerStyle = () => {
    switch (design) {
      case 'horizontal':
        return [styles.container, styles.containerHorizontal];
      case 'large':
        return [styles.container, styles.containerLarge];
      default: // 'vertical'
        return [styles.container, styles.containerVertical];
    }
  };

  const getContentStyle = () => {
    switch (design) {
      case 'horizontal':
        return [styles.contentOverlay, styles.contentOverlayHorizontal];
      case 'large':
        return [styles.contentOverlay, styles.contentOverlayLarge];
      default:
        return styles.contentOverlay;
    }
  };

  const getTitleStyle = () => {
    switch (design) {
      case 'large':
        return [styles.title, styles.titleLarge];
      case 'horizontal':
        return [styles.title, styles.titleHorizontal];
      default:
        return styles.title;
    }
  };

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={() => {
        console.log('🔍 [CourseCard] Card pressed, onSelect:', typeof onSelect);
        if (onSelect) {
          onSelect();
        } else {
          console.warn('⚠️ [CourseCard] onSelect is not defined!');
        }
      }}
      activeOpacity={0.8}
    >
      {/* Background - Image or Category Acronym */}
      {course.poster_url ? (
        <Image 
          source={{ uri: course.poster_url }} 
          style={[
            styles.backgroundImage,
            design === 'horizontal' && styles.backgroundImageHorizontal,
          ]} 
        />
      ) : (
        <View style={[
          styles.backgroundContainer,
          design === 'horizontal' && styles.backgroundImageHorizontal,
        ]}>
          <Text style={styles.categoryAcronym}>{categoryAcronym}</Text>
        </View>
      )}

      {/* Content Overlay */}
      <View style={getContentStyle()}>
        {/* Course Title */}
        <Text style={getTitleStyle()} numberOfLines={design === 'horizontal' ? 1 : 2}>
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
          <Text style={[
            styles.price,
            design === 'large' && styles.priceLarge,
            design === 'horizontal' && styles.priceHorizontal,
          ]}>
            {formatPrice(course.price)}
          </Text>

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
        {showActions && (onEdit || onDelete || onComplete) && (
          <View style={styles.actionsContainer}>
            {onComplete && course.status !== 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
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
    position: 'relative',
  },
  containerVertical: {
    minHeight: 200,
  },
  containerHorizontal: {
    minHeight: 140,
    flexDirection: 'row',
  },
  containerLarge: {
    minHeight: 280,
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
  // Horizontal layout: image on left, content on right
  backgroundImageHorizontal: {
    width: '40%',
    height: '100%',
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
  contentOverlayHorizontal: {
    flex: 1,
    padding: 16,
    marginLeft: '40%', // Make room for image on left
  },
  contentOverlayLarge: {
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 26,
  },
  titleHorizontal: {
    fontSize: 18,
    marginBottom: 8,
    lineHeight: 22,
  },
  titleLarge: {
    fontSize: 26,
    marginBottom: 20,
    lineHeight: 32,
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
  priceLarge: {
    fontSize: 28,
  },
  priceHorizontal: {
    fontSize: 20,
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
  completeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green for complete
    alignItems: 'center',
  },
});

export default CourseCard;
