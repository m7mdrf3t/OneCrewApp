import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonProfilePageProps {
  isDark?: boolean;
}

const SkeletonProfilePage: React.FC<SkeletonProfilePageProps> = ({ isDark = false }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonPlaceholder
          backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
          highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
          borderRadius={4}
        >
          <View style={styles.headerContent}>
            <View style={styles.backButton} />
            <View style={styles.headerTitle} />
            <View style={styles.headerRight} />
          </View>
        </SkeletonPlaceholder>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SkeletonPlaceholder
          backgroundColor={isDark ? '#1f1f1f' : '#e5e7eb'}
          highlightColor={isDark ? '#2a2a2a' : '#f3f4f6'}
          borderRadius={0}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroImage} />
          </View>
          
          {/* Profile Info Section */}
          <View style={styles.profileInfo}>
            <View style={styles.avatar} />
            <View style={styles.nameContainer}>
              <View style={styles.name} />
              <View style={styles.subtitle} />
            </View>
          </View>
          
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statItem} />
            <View style={styles.statItem} />
            <View style={styles.statItem} />
          </View>
          
          {/* About Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitle} />
            <View style={styles.sectionLine1} />
            <View style={styles.sectionLine2} />
            <View style={styles.sectionLine3} />
          </View>
          
          {/* Skills/Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitle} />
            <View style={styles.tagsContainer}>
              <View style={styles.tag} />
              <View style={styles.tag} />
              <View style={styles.tag} />
              <View style={styles.tag} />
            </View>
          </View>
          
          {/* Additional Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitle} />
            <View style={styles.sectionLine1} />
            <View style={styles.sectionLine2} />
          </View>
        </SkeletonPlaceholder>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
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
  },
  heroSection: {
    width: '100%',
    height: 300,
    backgroundColor: '#f3f4f6',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: -50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    marginRight: 16,
  },
  nameContainer: {
    flex: 1,
    marginTop: 40,
  },
  name: {
    width: '70%',
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    width: '50%',
    height: 16,
    borderRadius: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: {
    width: 60,
    height: 50,
    borderRadius: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    width: 100,
    height: 18,
    borderRadius: 4,
    marginBottom: 12,
  },
  sectionLine1: {
    width: '100%',
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionLine2: {
    width: '90%',
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionLine3: {
    width: '80%',
    height: 14,
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    width: 80,
    height: 28,
    borderRadius: 14,
  },
});

export default SkeletonProfilePage;





