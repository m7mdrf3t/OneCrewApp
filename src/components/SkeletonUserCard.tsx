import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonUserCardProps {
  showSubtitle?: boolean;
  isDark?: boolean;
}

const SkeletonUserCard: React.FC<SkeletonUserCardProps> = ({ 
  showSubtitle = true, 
  isDark = false 
}) => {
  return (
    <SkeletonPlaceholder
      backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
      highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
      borderRadius={12}
    >
      <View style={styles.container}>
        <View style={styles.avatar} />
        <View style={styles.content}>
          <View style={styles.name} />
          {showSubtitle && <View style={styles.subtitle} />}
        </View>
        <View style={styles.chevron} />
      </View>
    </SkeletonPlaceholder>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    width: '60%',
    height: 16,
    borderRadius: 4,
    marginBottom: 6,
  },
  subtitle: {
    width: '40%',
    height: 14,
    borderRadius: 4,
  },
  chevron: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});

export default SkeletonUserCard;





