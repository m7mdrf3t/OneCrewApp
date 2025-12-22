import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SkeletonProjectCardProps {
  isDark?: boolean;
}

// Cache the check result
let skeletonAvailable: boolean | null = null;

const canUseSkeleton = (): boolean => {
  if (skeletonAvailable !== null) {
    return skeletonAvailable;
  }

  try {
    // Try to require the module
    const SkeletonPlaceholder = require('react-native-skeleton-placeholder');
    if (!SkeletonPlaceholder || !SkeletonPlaceholder.default) {
      skeletonAvailable = false;
      return false;
    }

    // Try to check if native module is linked by checking for LinearGradient
    const { NativeModules } = require('react-native');
    // If we can't find the native module, it's not linked
    // This is a heuristic - after rebuild, the module will be available
    skeletonAvailable = false; // Conservative: use fallback until rebuild
    return false;
  } catch {
    skeletonAvailable = false;
    return false;
  }
};

const SkeletonProjectCard: React.FC<SkeletonProjectCardProps> = ({ isDark = false }) => {
  // Fallback component - simple gray boxes (always safe)
  const FallbackCard = () => (
    <View style={[styles.container, { backgroundColor: isDark ? '#1f1f1f' : '#fff' }]}>
      <View style={styles.header}>
        <View style={[styles.title, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          <View style={[styles.menu, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
        </View>
      </View>
      <View style={[styles.description, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
      <View style={styles.details}>
        <View style={[styles.detailItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
        <View style={[styles.detailItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
      </View>
      <View style={styles.footer}>
        <View style={[styles.footerItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
        <View style={[styles.footerItem, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
      </View>
    </View>
  );

  // For now, always use fallback to prevent crashes
  // After iOS rebuild with proper native modules, change this to check canUseSkeleton()
  return <FallbackCard />;

  // TODO: After iOS rebuild, uncomment this to use real skeleton:
  /*
  if (!canUseSkeleton()) {
    return <FallbackCard />;
  }

  try {
    const SkeletonPlaceholder = require('react-native-skeleton-placeholder').default;
    
    return (
      <SkeletonPlaceholder
        backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
        highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
        borderRadius={12}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.title} />
            <View style={styles.headerRight}>
              <View style={styles.badge} />
              <View style={styles.menu} />
            </View>
          </View>
          <View style={styles.description} />
          <View style={styles.details}>
            <View style={styles.detailItem} />
            <View style={styles.detailItem} />
          </View>
          <View style={styles.footer}>
            <View style={styles.footerItem} />
            <View style={styles.footerItem} />
          </View>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    width: '60%',
    height: 20,
    borderRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 60,
    height: 20,
    borderRadius: 10,
  },
  menu: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  description: {
    width: '90%',
    height: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerItem: {
    width: 100,
    height: 14,
    borderRadius: 4,
  },
});

export default SkeletonProjectCard;









