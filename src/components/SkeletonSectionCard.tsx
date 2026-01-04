import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SkeletonSectionCardProps {
  isDark?: boolean;
}

const SkeletonSectionCard: React.FC<SkeletonSectionCardProps> = ({ isDark = false }) => {
  // Fallback component - simple gray boxes (always safe)
  const FallbackCard = () => (
    <View style={[styles.container, { backgroundColor: isDark ? '#1f1f1f' : '#fff' }]}>
      <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
      <View style={styles.content}>
        <View style={[styles.title, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
      </View>
      <View style={[styles.chevron, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
    </View>
  );

  // For now, always use fallback to prevent crashes
  // After iOS rebuild, this will automatically use SkeletonPlaceholder
  return <FallbackCard />;

  // TODO: After iOS rebuild, uncomment this to use real skeleton:
  /*
  try {
    const SkeletonPlaceholder = require('react-native-skeleton-placeholder').default;
    
    return (
      <SkeletonPlaceholder
        backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
        highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
        borderRadius={12}
      >
        <View style={styles.container}>
          <View style={styles.iconContainer} />
          <View style={styles.content}>
            <View style={styles.title} />
          </View>
          <View style={styles.chevron} />
        </View>
      </SkeletonPlaceholder>
    );
  } catch (error) {
    return <FallbackCard />;
  }
  */
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    width: '70%',
    height: 20,
    borderRadius: 4,
  },
  chevron: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});

export default SkeletonSectionCard;















