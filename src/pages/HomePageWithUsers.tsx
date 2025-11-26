import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import SectionCard from '../components/SectionCard';
import { HomePageProps } from '../types';
import { SECTIONS } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';
import { spacing, semanticSpacing } from '../constants/spacing';

interface User {
  id: string;
  name: string;
  email?: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  profile_completeness: number;
  online_last_seen?: string;
  bio?: string;
  image_url?: string;
  specialty?: string;
  skills?: string[];
  about?: {
    gender?: string;
    age?: number;
    nationality?: string;
    location?: string;
    height_cm?: number;
    weight_kg?: number;
    skin_tone?: string;
    hair_color?: string;
    eye_color?: string;
    chest_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    shoe_size_eu?: number;
    reel_url?: string;
    union_member?: boolean;
    dialects?: string[];
    travel_ready?: boolean;
  };
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
  const { api, getUsersDirect, isGuest, browseUsersAsGuest, getCompanies } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCompleteData, setLoadingCompleteData] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  const fetchUsers = async () => {
    try {
      console.log('👥 Fetching users...', isGuest ? '(Guest Mode)' : '(Authenticated)');
      setError(null);
      
      // Use guest browsing if in guest mode
      if (isGuest) {
        try {
          console.log('🎭 Browsing users as guest...');
          const response = await browseUsersAsGuest({ limit: 50 });
          
          if (response.success && response.data) {
            const usersArray = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.users) ? response.data.users : []);
            console.log('✅ Users fetched successfully as guest:', usersArray.length);
            setUsers(usersArray);
            return;
          } else {
            throw new Error(response.error || 'Failed to browse users as guest');
          }
        } catch (guestErr: any) {
          console.error('❌ Guest browsing failed:', guestErr);
          setError(guestErr.message || 'Failed to browse users as guest');
          throw guestErr;
        }
      }
      
      // Authenticated user flow
      // Try direct fetch first
      try {
        const response = await getUsersDirect({ limit: 50 });
        
        if (response.success && response.data) {
          const usersArray = Array.isArray(response.data) ? response.data : [];
          console.log('✅ Users fetched successfully with direct fetch:', usersArray.length);
          setUsers(usersArray);
          return;
        }
      } catch (directErr) {
        console.warn('⚠️ Direct fetch failed, trying API client:', directErr);
      }
      
      // Fallback to API client
      const response = await api.getUsers({ limit: 50 });
      
      if (response.success && response.data) {
        // The API returns data as an array directly, not as data.items
        const usersArray = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Users fetched successfully with API client:', usersArray.length);
        
        // For now, use basic user data to avoid rate limiting
        // TODO: Implement batch API call or server-side complete data fetching
        const completeUsers = usersArray;
        
        setUsers(completeUsers);
        console.log('✅ Complete user data fetched:', completeUsers.length);
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

  const fetchCompanies = async () => {
    try {
      console.log('🏢 Fetching companies...');
      
      const response = await getCompanies({ limit: 50 });
      
      if (response.success && response.data) {
        const companiesArray = Array.isArray(response.data) 
          ? response.data 
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        console.log('✅ Companies fetched successfully:', companiesArray.length);
        setCompanies(companiesArray);
      } else {
        console.error('❌ Failed to fetch companies:', response.error);
      }
    } catch (err: any) {
      console.error('❌ Error fetching companies:', err);
      // Don't set error state for companies, just log it
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, [isGuest]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
    fetchCompanies();
  };

  const fetchCompleteUserData = async (userId: string): Promise<User | null> => {
    if (loadingCompleteData.has(userId)) {
      return null; // Already loading
    }

    setLoadingCompleteData(prev => new Set(prev).add(userId));
    
    try {
      console.log(`🔍 Fetching complete data for user: ${userId}`);
      const completeResponse = await api.getUserByIdDirect(userId);
      
      if (completeResponse.success && completeResponse.data) {
        const updatedUser = completeResponse.data;
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? updatedUser : user
          )
        );
        console.log(`✅ Complete data fetched for user: ${userId}`);
        return updatedUser;
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch complete data for user ${userId}:`, err);
    } finally {
      setLoadingCompleteData(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
    return null;
  };

  // Filter sections to only show: talent, individuals (Crew), onehub (Studios & Agencies), academy
  const allowedSectionKeys = ['talent', 'individuals', 'onehub', 'academy'];
  
  const filteredSections = useMemo(() => {
    const allowedSections = SECTIONS.filter(section => allowedSectionKeys.includes(section.key));
    
    if (!searchQuery) return allowedSections;
    const lowerCaseQuery = searchQuery.toLowerCase();

    return allowedSections.filter(section => {
      const hasMatchingItem = section.items.some(item =>
        item.label.toLowerCase().includes(lowerCaseQuery)
      );
      return section.title.toLowerCase().includes(lowerCaseQuery) || hasMatchingItem;
    });
  }, [searchQuery]);


  const usersByCategory = useMemo(() => {
    const lowerCaseQuery = searchQuery?.toLowerCase() || '';
    
    const filterUser = (user: User) => {
      if (!searchQuery) return true;
      return (
        user.name?.toLowerCase().includes(lowerCaseQuery) ||
        user.email?.toLowerCase().includes(lowerCaseQuery) ||
        user.primary_role?.toLowerCase().includes(lowerCaseQuery) ||
        user.specialty?.toLowerCase().includes(lowerCaseQuery) ||
        user.bio?.toLowerCase().includes(lowerCaseQuery)
      );
    };
    
    const categorized = {
      talent: users.filter(u => u.category === 'talent' && filterUser(u)),
      crew: users.filter(u => u.category === 'crew' && filterUser(u)),
      company: users.filter(u => u.category === 'company' && filterUser(u)),
    };
    
    console.log('📊 Users by category:', {
      talent: categorized.talent.length,
      crew: categorized.crew.length,
      company: categorized.company.length,
    });
    
    return categorized;
  }, [users, searchQuery]);

  // Categorize companies by type
  const companiesByType = useMemo(() => {
    const studiosAndAgencies = companies.filter(company => {
      const subcategory = company.subcategory || company.company_type_info?.code || '';
      return ['production_house', 'agency', 'studio', 'casting_agency', 'management_company'].includes(subcategory);
    });
    
    const academy = companies.filter(company => {
      const subcategory = company.subcategory || company.company_type_info?.code || '';
      return subcategory === 'academy';
    });
    
    return {
      studiosAndAgencies,
      academy
    };
  }, [companies]);

  const sectionsWithUserCounts = useMemo(() => {
    return filteredSections.map(section => {
      let userCount = 0;
      
      // Map section keys to user categories and companies
      if (section.key === 'talent') {
        userCount = usersByCategory.talent.length;
      } else if (section.key === 'individuals') {
        userCount = usersByCategory.crew.length;
      } else if (section.key === 'onehub') {
        // Studios & Agencies: users with company category + companies matching this type
        userCount = usersByCategory.company.length + companiesByType.studiosAndAgencies.length;
      } else if (section.key === 'academy') {
        // Academy: companies matching academy type
        userCount = companiesByType.academy.length;
      }
      
      return {
        ...section,
        userCount
      };
    });
  }, [usersByCategory, companiesByType, filteredSections]);

  const handleUserSelect = async (selectedUser: User) => {
    console.log('👤 User selected:', selectedUser.name);
    
    // For talent users without complete data, fetch it first
    if (selectedUser.category === 'talent' && !selectedUser.about) {
      const updatedUser = await fetchCompleteUserData(selectedUser.id);
      onNavigate('profile', updatedUser || selectedUser);
    } else {
      onNavigate('profile', selectedUser);
    }
  };


  const isDark = theme === 'dark';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
        >
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
          </View>
        </ScrollView>
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
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Dynamic Directory Sections */}
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
          {sectionsWithUserCounts.map((section) => (
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
    padding: semanticSpacing.containerPadding,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    padding: semanticSpacing.containerPadding,
    marginBottom: semanticSpacing.buttonPadding,
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
    marginRight: semanticSpacing.containerPadding,
  },
  searchButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  searchBarContainer: {
    marginBottom: semanticSpacing.buttonPadding,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  usersSection: {
    padding: semanticSpacing.containerPadding,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: semanticSpacing.containerPadding,
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default HomePageWithUsers;
