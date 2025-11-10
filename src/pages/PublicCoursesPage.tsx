import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { PublicCoursesPageProps, CourseWithDetails } from '../types';
import CourseCard from '../components/CourseCard';

const PublicCoursesPage: React.FC<PublicCoursesPageProps> = ({
  onBack,
  onCourseSelect,
  filters,
}) => {
  const { getPublicCourses, getMyRegisteredCourses, user } = useApi();
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [myCourses, setMyCourses] = useState<CourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMyCourses, setLoadingMyCourses] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(filters?.category);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadCourses();
    if (user) {
      loadMyCourses();
    }
  }, [filters, categoryFilter]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const courseFilters = {
        category: categoryFilter,
        company_id: filters?.company_id,
        page: 1,
        limit: 50,
      };
      const coursesData = await getPublicCourses(courseFilters);
      const coursesList = Array.isArray(coursesData) ? coursesData : [];
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(coursesList.map((c) => c.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);
      
      // Filter by search query if provided
      if (searchQuery.trim()) {
        const filtered = coursesList.filter(
          (course) =>
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setCourses(filtered);
      } else {
        setCourses(coursesList);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMyCourses = async () => {
    try {
      setLoadingMyCourses(true);
      const myCoursesData = await getMyRegisteredCourses();
      setMyCourses(Array.isArray(myCoursesData) ? myCoursesData : []);
    } catch (error) {
      console.error('Failed to load my courses:', error);
      setMyCourses([]);
    } finally {
      setLoadingMyCourses(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      // Debounce search
      const timer = setTimeout(() => {
        loadCourses();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadCourses();
    }
  }, [searchQuery]);

  const handleCourseSelect = (course: CourseWithDetails) => {
    onCourseSelect(course);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Courses</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      {categories.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                !categoryFilter && styles.filterButtonSelected,
              ]}
              onPress={() => setCategoryFilter(undefined)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  !categoryFilter && styles.filterButtonTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  categoryFilter === category && styles.filterButtonSelected,
                ]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    categoryFilter === category && styles.filterButtonTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* My Registered Courses (if authenticated) */}
      {user && myCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bookmark" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>My Registered Courses</Text>
          </View>
          {loadingMyCourses ? (
            <ActivityIndicator size="small" color="#000" style={styles.loader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {myCourses.map((course) => (
                <View key={course.id} style={styles.courseCardWrapper}>
                  <CourseCard
                    course={course}
                    onSelect={() => handleCourseSelect(course)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* All Courses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {categoryFilter ? `${categoryFilter} Courses` : 'All Courses'}
          </Text>
          <Text style={styles.courseCount}>({courses.length})</Text>
        </View>

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
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No courses available at the moment'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={() => handleCourseSelect(course)}
              />
            ))}
          </ScrollView>
        )}
      </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    gap: 8,
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  clearButton: {
    padding: 4,
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
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  courseCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  courseCardWrapper: {
    width: 320,
    marginRight: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loader: {
    marginLeft: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default PublicCoursesPage;

