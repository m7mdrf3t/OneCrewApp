import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import SearchBar from '../components/SearchBar';
import SectionCard from '../components/SectionCard';
import UserTable from '../components/UserTable';
import { HomePageProps } from '../types';
import { SECTIONS } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';

interface User {
  id: string;
  name: string;
  email: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  profile_completeness: number;
  online_last_seen?: string;
  bio?: string;
  image_url?: string;
}

const HomePageWithUsers: React.FC<HomePageProps> = ({
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
  const { api } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users...');
      setError(null);
      const response = await api.getUsers({ limit: 50 });
      
      if (response.success && response.data) {
        // The API returns data as an array directly, not as data.items
        const usersArray = Array.isArray(response.data) ? response.data : response.data.items || [];
        console.log('✅ Users fetched successfully:', usersArray.length);
        setUsers(usersArray);
      } else {
        console.error('❌ Failed to fetch users:', response.error);
        setError('Failed to load users');
      }
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery) return SECTIONS;
    const lowerCaseQuery = searchQuery.toLowerCase();

    return SECTIONS.filter(section => {
      const hasMatchingItem = section.items.some(item =>
        item.label.toLowerCase().includes(lowerCaseQuery)
      );
      return section.title.toLowerCase().includes(lowerCaseQuery) || hasMatchingItem;
    });
  }, [searchQuery]);

  const usersByCategory = useMemo(() => {
    const categorized = {
      talent: users.filter(u => u.category === 'talent'),
      crew: users.filter(u => u.category === 'crew'),
      company: users.filter(u => u.category === 'company'),
    };
    
    console.log('📊 Users by category:', {
      talent: categorized.talent.length,
      crew: categorized.crew.length,
      company: categorized.company.length,
    });
    
    return categorized;
  }, [users]);

  const handleUserSelect = (selectedUser: User) => {
    console.log('👤 User selected:', selectedUser.name);
    // Navigate to user profile or start chat
    onNavigate('profile', selectedUser);
  };

  const isDark = theme === 'dark';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
        <View style={styles.header}>
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onOpenFilter={onOpenFilter}
          />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>
            Loading users...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onOpenFilter={onOpenFilter}
        />
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Original Services Section */}
        <View style={styles.sectionsContainer}>
          {filteredSections.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              onClick={() => onNavigate('sectionServices', section)}
            />
          ))}
        </View>

        {/* Users by Category - Added at the bottom */}
        <View style={styles.usersSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
            Community Members
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: '#ef4444' }]}>
                {error}
              </Text>
            </View>
          )}
          
          <UserTable
            title="Talent"
            users={usersByCategory.talent}
            onUserSelect={handleUserSelect}
            isDark={isDark}
          />
          
          <UserTable
            title="Crew"
            users={usersByCategory.crew}
            onUserSelect={handleUserSelect}
            isDark={isDark}
          />
          
          <UserTable
            title="Companies"
            users={usersByCategory.company}
            onUserSelect={handleUserSelect}
            isDark={isDark}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionsContainer: {
    padding: 12,
  },
  usersSection: {
    padding: 12,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default HomePageWithUsers;
