import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import SkeletonCard from './SkeletonCard';

interface SkeletonScreenProps {
  showHeader?: boolean;
  showContent?: boolean;
  contentCount?: number;
  isDark?: boolean;
}

const SkeletonScreen: React.FC<SkeletonScreenProps> = ({
  showHeader = true,
  showContent = true,
  contentCount = 5,
  isDark = false,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      {showHeader && (
        <View style={styles.header}>
          <View style={[styles.headerLeft, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          <View style={[styles.headerTitle, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
          <View style={[styles.headerRight, { backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb' }]} />
        </View>
      )}
      {showContent && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {Array.from({ length: contentCount }).map((_, index) => (
            <SkeletonCard
              key={index}
              height={80}
              borderRadius={12}
              isDark={isDark}
              style={styles.card}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    width: 120,
    height: 20,
    borderRadius: 4,
  },
  headerRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
});

export default SkeletonScreen;















