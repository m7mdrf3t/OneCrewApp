import React, { useMemo, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import SectionCard from '../components/SectionCard';
import SkeletonSectionCard from '../components/SkeletonSectionCard';
import { HomePageProps } from '../types';
import { useApi } from '../contexts/ApiContext';
import { SECTIONS } from '../data/mockData';

const HomePageWithAPI: React.FC<HomePageProps> = ({
  onServiceSelect,
  onOpenFilter,
  searchQuery,
  onSearchChange,
  onToggleTheme,
  theme,
  onNavigate,
  user,
  onOpenMainMenu,
}) => {
  const { api, isAuthenticated } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalTeams: 0,
  });

  // Load user statistics on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadUserStats();
    }
  }, [isAuthenticated]);

  const loadUserStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load users, projects, and teams in parallel
      const [usersResponse, projectsResponse, teamsResponse] = await Promise.all([
        api.getUsers({ limit: 1 }), // Just get count
        api.getProjects({ limit: 1, minimal: true }), // Just get count, use minimal endpoint
        api.getTeams({ limit: 1 }), // Just get count
      ]);

      setUserStats({
        totalUsers: usersResponse.data?.pagination?.total || 0,
        totalProjects: projectsResponse.data?.pagination?.total || 0,
        totalTeams: teamsResponse.data?.pagination?.total || 0,
      });
    } catch (err: any) {
      console.error('Failed to load user stats:', err);
      setError('Failed to load data');
      // Fallback to mock data counts
      setUserStats({
        totalUsers: 1650,
        totalProjects: 45,
        totalTeams: 12,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced sections with real data
  const enhancedSections = useMemo(() => {
    return SECTIONS.map(section => {
      // Update user counts with real data where available
      const updatedItems = section.items.map(item => {
        let userCount = item.users;
        
        // Map some sections to real data
        switch (section.key) {
          case 'talent':
            userCount = userStats.totalUsers > 0 ? Math.floor(userStats.totalUsers * 0.4) : item.users;
            break;
          case 'individuals':
            userCount = userStats.totalUsers > 0 ? Math.floor(userStats.totalUsers * 0.3) : item.users;
            break;
          case 'technicians':
            userCount = userStats.totalUsers > 0 ? Math.floor(userStats.totalUsers * 0.2) : item.users;
            break;
          case 'specialized':
            userCount = userStats.totalUsers > 0 ? Math.floor(userStats.totalUsers * 0.1) : item.users;
            break;
          default:
            // Keep original counts for other sections
            break;
        }

        return {
          ...item,
          users: userCount,
        };
      });

      return {
        ...section,
        items: updatedItems,
      };
    });
  }, [userStats]);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return enhancedSections;
    const lowerCaseQuery = searchQuery.toLowerCase();

    return enhancedSections.filter(section => {
      const hasMatchingItem = section.items.some(item =>
        item.label.toLowerCase().includes(lowerCaseQuery)
      );
      return section.title.toLowerCase().includes(lowerCaseQuery) || hasMatchingItem;
    });
  }, [searchQuery, enhancedSections]);

  const handleServiceSelect = async (serviceData: any, sectionKey: string) => {
    try {
      // If user is authenticated, we could log this interaction
      if (isAuthenticated) {
        // Example: Log user interaction for analytics
        console.log('User selected service:', serviceData, 'from section:', sectionKey);
        
        // We could also make an API call to track user interests
        // await api.trackUserInterest({ service: serviceData.label, section: sectionKey });
      }
      
      // Navigate to the service detail page
      onServiceSelect(serviceData, sectionKey);
    } catch (err) {
      console.error('Error handling service selection:', err);
      // Still navigate even if tracking fails
      onServiceSelect(serviceData, sectionKey);
    }
  };

  const isDark = theme === 'dark';

  if (isLoading && !userStats.totalUsers) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionsContainer}>
            {!showSearch ? (
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={() => setShowSearch(true)}
              >
                <View style={styles.searchIconContainer}>
                  <Ionicons name="search" size={16} color="#000" />
                </View>
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.searchBarContainer}>
                <SearchBar
                  value={searchQuery}
                  onChange={onSearchChange}
                  onOpenFilter={onOpenFilter}
                  onClose={() => setShowSearch(false)}
                />
              </View>
            )}
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonSectionCard key={index} isDark={isDark} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionsContainer}>
          {!showSearch ? (
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => setShowSearch(true)}
            >
              <View style={styles.searchIconContainer}>
                <Ionicons name="search" size={16} color="#000" />
              </View>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.searchBarContainer}>
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onOpenFilter={onOpenFilter}
                onClose={() => setShowSearch(false)}
              />
            </View>
          )}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {filteredSections.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              onClick={() => onNavigate('sectionServices', section)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  content: {
    flex: 1,
  },
  sectionsContainer: {
    padding: 12,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  searchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  searchBarContainer: {
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default HomePageWithAPI;
