import React, { useMemo, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import SearchBar from '../components/SearchBar';
import SectionCard from '../components/SectionCard';
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
        api.getProjects({ limit: 1 }), // Just get count
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

  if (isLoading && !userStats.totalUsers) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onOpenFilter={onOpenFilter}
          />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onOpenFilter={onOpenFilter}
        />
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionsContainer}>
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
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    padding: 12,
  },
  content: {
    flex: 1,
  },
  sectionsContainer: {
    padding: 12,
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
