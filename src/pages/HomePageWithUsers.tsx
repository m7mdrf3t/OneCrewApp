import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import FilterModal, { FilterParams } from '../components/FilterModal';
import SectionCard from '../components/SectionCard';
import PromoCarousel, { PromoItem } from '../components/PromoCarousel';
import SkeletonSectionCard from '../components/SkeletonSectionCard';
import { HomePageProps } from '../types';
import { SECTIONS } from '../data/mockData';
import { useApi } from '../contexts/ApiContext';
import { spacing, semanticSpacing } from '../constants/spacing';
import { getRoleName, filterRolesByCategory } from '../utils/roleCategorizer';

interface User {
  id: string;
  name: string;
  email?: string;
  category: 'crew' | 'talent' | 'company' | 'custom';
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
  const { api, getUsersDirect, isGuest, browseUsersAsGuest, getCompanies, getRoles } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [crewRoles, setCrewRoles] = useState<any[]>([]);
  const [talentRoles, setTalentRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCompleteData, setLoadingCompleteData] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  
  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreCompanies, setHasMoreCompanies] = useState(true);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [loadingMoreCompanies, setLoadingMoreCompanies] = useState(false);

  const fetchUsers = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      console.log('👥 Fetching users...', isGuest ? '(Guest Mode)' : '(Authenticated)', `Page: ${page}`);
      setError(null);
      
      if (append) {
        setLoadingMoreUsers(true);
      } else if (page === 1) {
        setIsLoading(true);
      }
      
      const limit = 20;
      const params: any = {
        limit,
        page,
        search: searchQuery,
        category: filters.category,
        role: filters.role,
        location: filters.location,
        // Physical Attributes
        height: filters.height,
        height_min: filters.height_min,
        height_max: filters.height_max,
        weight: filters.weight,
        weight_min: filters.weight_min,
        weight_max: filters.weight_max,
        age: filters.age,
        age_min: filters.age_min,
        age_max: filters.age_max,
        // Body Measurements
        chest_min: filters.chest_min,
        chest_max: filters.chest_max,
        waist_min: filters.waist_min,
        waist_max: filters.waist_max,
        hips_min: filters.hips_min,
        hips_max: filters.hips_max,
        shoe_size_min: filters.shoe_size_min,
        shoe_size_max: filters.shoe_size_max,
        // Appearance
        skin_tone: filters.skin_tone,
        hair_color: filters.hair_color,
        eye_color: filters.eye_color,
        // Personal Details
        gender: filters.gender,
        nationality: filters.nationality,
        // Professional Preferences
        union_member: filters.union_member,
        willing_to_travel: filters.willing_to_travel,
        travel_ready: filters.travel_ready,
        // Legacy/Additional filters
        accent: filters.accent,
        skills: filters.skills,
        languages: filters.languages,
      };
      
      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });
      
      // Use guest browsing if in guest mode
      if (isGuest) {
        try {
          console.log('🎭 Browsing users as guest...', params);
          const response = await browseUsersAsGuest(params);
          
          if (response.success && response.data) {
            const data = response.data.data || response.data;
            const usersArray = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
            const pagination = response.data.pagination;
            
            if (append) {
              setUsers(prev => [...prev, ...usersArray]);
            } else {
              setUsers(usersArray);
            }
            
            setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
            console.log('✅ Users fetched successfully as guest:', usersArray.length);
            return;
          } else {
            throw new Error(response.error || 'Failed to browse users as guest');
          }
        } catch (guestErr: any) {
          console.error('❌ Guest browsing failed:', guestErr);
          setError(guestErr.message || 'Failed to browse users as guest');
          if (!append) {
            setUsers([]);
          }
          throw guestErr;
        }
      }
      
      // Authenticated user flow
      // Try direct fetch first
      try {
        const response = await getUsersDirect(params);
        
        if (response.success && response.data) {
          const data = response.data.data || response.data;
          const usersArray = Array.isArray(data) ? data : [];
          const pagination = response.data.pagination;
          
          if (append) {
            setUsers(prev => [...prev, ...usersArray]);
          } else {
            setUsers(usersArray);
          }
          
          setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
          console.log('✅ Users fetched successfully with direct fetch:', usersArray.length);
          return;
        }
      } catch (directErr) {
        console.warn('⚠️ Direct fetch failed, trying API client:', directErr);
      }
      
      // Fallback to API client - use q for search parameter
      // Copy all params to apiParams (excluding limit and page which are handled separately)
      const apiParams: any = {
        limit,
        page,
      };
      // Copy all filter parameters
      Object.keys(params).forEach(key => {
        if (key !== 'limit' && key !== 'page' && params[key] !== undefined && params[key] !== null && params[key] !== '') {
          if (key === 'search') {
            apiParams.q = params[key];
          } else {
            apiParams[key] = params[key];
          }
        }
      });
      
      const response = await api.getUsers(apiParams);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const usersArray = Array.isArray(data) ? data : [];
        const pagination = response.data.pagination;
        
        if (append) {
          setUsers(prev => [...prev, ...usersArray]);
        } else {
          setUsers(usersArray);
        }
        
        setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
        console.log('✅ Users fetched successfully with API client:', usersArray.length);
      } else {
        console.error('❌ Failed to fetch users:', response.error);
        setError('Failed to load users');
        if (!append) {
          setUsers([]);
        }
      }
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      if (!append) {
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMoreUsers(false);
    }
  }, [isGuest, searchQuery, filters, browseUsersAsGuest, getUsersDirect, api]);

  const fetchCompanies = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      console.log('🏢 Fetching companies...', `Page: ${page}`);
      
      if (append) {
        setLoadingMoreCompanies(true);
      }
      
      const limit = 20;
      const params = {
        limit,
        page,
        search: searchQuery,
        category: filters.category,
        location: filters.location,
        // Optimize payload size by selecting only essential fields for list view (v2.24.0)
        fields: ['id', 'name', 'logo_url', 'location_text', 'subcategory'],
        sort: 'name',
        order: 'asc' as const,
      };
      
      const response = await getCompanies(params);
      
      if (response.success && response.data) {
        const data = response.data.data || response.data;
        const companiesArray = Array.isArray(data) ? data : [];
        const pagination = response.data.pagination;
        
        if (append) {
          setCompanies(prev => [...prev, ...companiesArray]);
        } else {
          setCompanies(companiesArray);
        }
        
        setHasMoreCompanies(pagination ? page < pagination.totalPages : companiesArray.length === limit);
        console.log('✅ Companies fetched successfully:', companiesArray.length);
      } else {
        console.error('❌ Failed to fetch companies:', response.error);
        if (!append) {
          setCompanies([]);
        }
      }
    } catch (err: any) {
      console.error('❌ Error fetching companies:', err);
      if (!append) {
        setCompanies([]);
      }
    } finally {
      setLoadingMoreCompanies(false);
    }
  }, [searchQuery, filters, getCompanies]);

  // Fetch crew and talent roles separately using backend category filtering
  useEffect(() => {
    const loadRoles = async () => {
      try {
        // Fetch crew roles using backend category filter
        const crewResponse = await getRoles({ category: 'crew' });
        if (crewResponse.success && crewResponse.data) {
          const crewRolesData = Array.isArray(crewResponse.data) ? crewResponse.data : [];
          setCrewRoles(crewRolesData);
          console.log('✅ Crew roles loaded for home page:', crewRolesData.length, 'roles');
          console.log('📋 Crew roles:', crewRolesData.map((r: any) => getRoleName(r)).slice(0, 5));
        }

        // Fetch talent roles using backend category filter
        const talentResponse = await getRoles({ category: 'talent' });
        if (talentResponse.success && talentResponse.data) {
          const talentRolesData = Array.isArray(talentResponse.data) ? talentResponse.data : [];
          setTalentRoles(talentRolesData);
          console.log('✅ Talent roles loaded for home page:', talentRolesData.length, 'roles');
          console.log('📋 Talent roles:', talentRolesData.map((r: any) => getRoleName(r)).slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
      }
    };
    loadRoles();
  }, [getRoles]);

  // Reset and fetch when filters or search change
  useEffect(() => {
    setUsersPage(1);
    setCompaniesPage(1);
    setHasMoreUsers(true);
    setHasMoreCompanies(true);
    fetchUsers(1, false);
    fetchCompanies(1, false);
  }, [isGuest, searchQuery, filters, fetchUsers, fetchCompanies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setUsersPage(1);
    setCompaniesPage(1);
    setHasMoreUsers(true);
    setHasMoreCompanies(true);
    fetchUsers(1, false);
    fetchCompanies(1, false);
  }, [fetchUsers, fetchCompanies]);
  
  const handleLoadMoreUsers = useCallback(() => {
    if (!loadingMoreUsers && hasMoreUsers && !isLoading) {
      const nextPage = usersPage + 1;
      setUsersPage(nextPage);
      fetchUsers(nextPage, true);
    }
  }, [loadingMoreUsers, hasMoreUsers, isLoading, usersPage, fetchUsers]);
  
  const handleLoadMoreCompanies = useCallback(() => {
    if (!loadingMoreCompanies && hasMoreCompanies) {
      const nextPage = companiesPage + 1;
      setCompaniesPage(nextPage);
      fetchCompanies(nextPage, true);
    }
  }, [loadingMoreCompanies, hasMoreCompanies, companiesPage, fetchCompanies]);
  
  const handleApplyFilters = useCallback((newFilters: FilterParams) => {
    setFilters(newFilters);
  }, []);
  
  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Connect onOpenFilter prop to open the filter modal
  // If onOpenFilter is provided, we'll use it, otherwise handle internally
  useEffect(() => {
    // Override onOpenFilter if it's an empty function
    // The component manages its own filter modal state
  }, [onOpenFilter]);

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

  // Users are already filtered by API, just categorize them
  const usersByCategory = useMemo(() => {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const knownRoleSet = new Set<string>([
      ...crewRoles.map((r: any) => normalize(getRoleName(r))),
      ...talentRoles.map((r: any) => normalize(getRoleName(r))),
    ].filter(Boolean));

    const categorized = {
      talent: users.filter(u => u.category === 'talent'),
      crew: users.filter(u => u.category === 'crew'),
      company: users.filter(u => u.category === 'company'),
      // "Custom users" definition (client-side):
      // - explicit category 'custom' (future backend support), OR
      // - crew/talent users whose primary_role isn't in the known crew/talent roles lists
      custom: users.filter(u => {
        if ((u as any).category === 'custom') return true;
        if (u.category === 'company') return false;
        if (!u.primary_role) return false;
        if (knownRoleSet.size === 0) return false; // avoid misclassifying if roles haven't loaded
        const role = normalize(u.primary_role);
        return role ? !knownRoleSet.has(role) : false;
      }),
    };
    
    return categorized;
  }, [users, crewRoles, talentRoles]);

  // Count users by role for crew section (normalize role names for matching)
  const roleCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    if (usersByCategory?.crew) {
      usersByCategory.crew.forEach(user => {
        if (user.primary_role) {
          // Normalize role name for matching (lowercase, replace spaces/special chars with underscore)
          const normalized = user.primary_role.toLowerCase().replace(/[^a-z0-9]/g, '_');
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      });
    }
    return counts;
  }, [usersByCategory?.crew]);

  // Filter sections to only show: talent, individuals (Crew), onehub (Studios & Agencies), academy, custom, directory
  const allowedSectionKeys = ['talent', 'individuals', 'onehub', 'academy', 'custom', 'directory'];
  
  const filteredSections = useMemo(() => {
    // Add "All Members" directory section dynamically
    const directorySection = {
      key: 'directory',
      title: 'All Members',
      items: [
        { label: 'All Members', users: users.length }
      ]
    };
    
    const allowedSections = SECTIONS.filter(section => allowedSectionKeys.includes(section.key));
    
    // Combine directory section with allowed sections
    const allSections = [directorySection, ...allowedSections];
    
    // Dynamically update the crew (individuals) and talent sections with API roles
    // But only if roles have loaded, otherwise use original section items
    const updatedSections = allSections.map(section => {
      if (section.key === 'individuals') {
        // Only update if crew roles have loaded
        if (crewRoles.length > 0) {
          // Create section items from API crew roles with user counts
          const crewItems = crewRoles.map((role: any) => {
            const roleName = getRoleName(role);
            // Normalize role name for matching
            const normalized = roleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const count = roleCounts[normalized] || 0;
            return {
              label: roleName,
              users: count
            };
          });

          // Sort: roles with users first (descending by count), then roles without users alphabetically
          const sortedItems = crewItems.sort((a, b) => {
            if (a.users > 0 && b.users === 0) return -1;
            if (a.users === 0 && b.users > 0) return 1;
            if (a.users > 0 && b.users > 0) return b.users - a.users;
            return a.label.localeCompare(b.label);
          });

          // Update with API roles (use original items as fallback if empty)
          return {
            ...section,
            items: sortedItems.length > 0 ? sortedItems : section.items
          };
        }
        // Fallback to original section items if roles haven't loaded
        return section;
      } else if (section.key === 'talent') {
        // Only update if talent roles have loaded
        if (talentRoles.length > 0) {
          // Create section items from API talent roles with user counts
          const talentItems = talentRoles.map((role: any) => {
            const roleName = getRoleName(role);
            // Normalize role name for matching
            const normalizedRole = roleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            // Count talent users with this role (normalize user's role for comparison)
            const count = (usersByCategory?.talent || []).filter(u => {
              if (!u.primary_role) return false;
              const normalizedUserRole = u.primary_role.toLowerCase().replace(/[^a-z0-9]/g, '_');
              return normalizedUserRole === normalizedRole;
            }).length;
            return {
              label: roleName,
              users: count
            };
          });

          // Sort: roles with users first (descending by count), then roles without users alphabetically
          const sortedItems = talentItems.sort((a, b) => {
            if (a.users > 0 && b.users === 0) return -1;
            if (a.users === 0 && b.users > 0) return 1;
            if (a.users > 0 && b.users > 0) return b.users - a.users;
            return a.label.localeCompare(b.label);
          });

          // Update with API roles (use original items as fallback if empty)
          return {
            ...section,
            items: sortedItems.length > 0 ? sortedItems : section.items
          };
        }
        // Fallback to original section items if roles haven't loaded
        return section;
      }
      if (section.key === 'custom') {
        // Build dynamic custom roles from actual "custom" users
        const customUsers = usersByCategory.custom || [];
        const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const prettify = (value: string) =>
          value
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

        const countsByRole: Record<string, number> = {};
        customUsers.forEach((u) => {
          const role = u.primary_role ? normalize(u.primary_role) : '';
          if (!role) return;
          countsByRole[role] = (countsByRole[role] || 0) + 1;
        });

        const roleItems = Object.keys(countsByRole)
          .sort((a, b) => countsByRole[b] - countsByRole[a] || a.localeCompare(b))
          .map((role) => ({
            label: prettify(role),
            users: countsByRole[role],
          }));

        const items = [
          { label: 'All Custom Users', users: customUsers.length },
          ...roleItems,
        ];

        return {
          ...section,
          items: items.length > 0 ? items : section.items,
        };
      }
      // For directory section, keep it as is
      if (section.key === 'directory') {
        return {
          ...section,
          items: [{ label: 'All Members', users: users.length }]
        };
      }
      
      // For other sections (onehub, academy), keep original items
      return section;
    });
    
    if (!searchQuery) return updatedSections;
    const lowerCaseQuery = searchQuery.toLowerCase();

    return updatedSections.filter(section => {
      const hasMatchingItem = section.items.some(item =>
        item.label.toLowerCase().includes(lowerCaseQuery)
      );
      return section.title.toLowerCase().includes(lowerCaseQuery) || hasMatchingItem;
    });
  }, [searchQuery, crewRoles, talentRoles, roleCounts, usersByCategory]);

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
      if (section.key === 'directory') {
        // All Members: total count of all users
        userCount = users.length;
      } else if (section.key === 'talent') {
        userCount = usersByCategory.talent.length;
      } else if (section.key === 'individuals') {
        userCount = usersByCategory.crew.length;
      } else if (section.key === 'onehub') {
        // Studios & Agencies: users with company category + companies matching this type
        userCount = usersByCategory.company.length + companiesByType.studiosAndAgencies.length;
      } else if (section.key === 'academy') {
        // Academy: companies matching academy type
        userCount = companiesByType.academy.length;
      } else if (section.key === 'custom') {
        userCount = usersByCategory.custom.length;
      }
      
      return {
        ...section,
        userCount
      };
    });
  }, [users, usersByCategory, companiesByType, filteredSections]);

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

  // Promo items for the carousel
  const promoItems: PromoItem[] = useMemo(() => [
    {
      id: '1',
      label: 'Deals',
      title: 'Academy deals this week',
      subtitle: 'Special offers on courses and training',
    },
    {
      id: '2',
      label: 'New',
      title: 'Discover top talent',
      subtitle: 'Browse our latest profiles',
    },
    {
      id: '3',
      label: 'Featured',
      title: 'Premium studios available',
      subtitle: 'Book your next production space',
    },
  ], []);

  const handlePromoPress = useCallback((promo: PromoItem) => {
    // Handle promo press - can navigate to specific page
    console.log('Promo pressed:', promo);
    // You can add navigation logic here based on promo.actionUrl
  }, []);

  const renderSection = useCallback(({ item: section }: { item: any }) => (
    <SectionCard
      key={section.key}
      section={section}
      onClick={() => onNavigate('sectionServices', section)}
    />
  ), [onNavigate]);

  const renderHeader = useCallback(() => (
    <View>
      <PromoCarousel
        promos={promoItems}
        autoSlideInterval={5000}
        onPromoPress={handlePromoPress}
      />
    </View>
  ), [promoItems, handlePromoPress]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      {isLoading ? (
        <FlatList
          data={Array.from({ length: 6 })}
          renderItem={() => <SkeletonSectionCard isDark={isDark} />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.sectionsContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
        />
      ) : (
        <FlatList
          data={sectionsWithUserCounts}
          renderItem={renderSection}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.sectionsContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                No sections found
              </Text>
            </View>
          }
        />
      )}
      
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  searchContainer: {
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: semanticSpacing.sectionGapLarge,
    backgroundColor: '#f4f4f5',
  },
  sectionsContainer: {
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: semanticSpacing.containerPadding,
  },
  emptyContainer: {
    padding: semanticSpacing.containerPaddingLarge * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: semanticSpacing.containerPadding,
    margin: semanticSpacing.containerPaddingLarge,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#dc2626',
  },
});

export default HomePageWithUsers;
