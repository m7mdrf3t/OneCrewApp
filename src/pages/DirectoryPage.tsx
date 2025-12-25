import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import { spacing, semanticSpacing } from '../constants/spacing';
import SearchBar from '../components/SearchBar';
import FilterModal, { FilterParams } from '../components/FilterModal';
import SkeletonUserCard from '../components/SkeletonUserCard';
import { SECTIONS } from '../data/mockData';
import { RootStackScreenProps } from '../navigation/types';
import { getRoleName } from '../utils/roleCategorizer';

// NOTE: FlashList runtime supports `estimatedItemSize`, but the shipped TS typings
// in our current setup don't expose it. We cast to keep the perf optimization without
// blocking typecheck; consider revisiting after dependency upgrades.
const FlashListUnsafe: React.ComponentType<any> = FlashList as any;

interface User {
  id: string;
  name: string;
  email?: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  profile_completeness: number;
  online_last_seen?: string;
  image_url?: string;
  bio?: string;
  specialty?: string;
  skills?: string[];
  about?: {
    gender?: string;
    age?: number;
    birthday?: string;
    nationality?: string;
    location?: string;
    height_cm?: number;
    weight_kg?: number;
    skin_tone?: string;
    hair_color?: string;
    skin_tone_id?: string;
    hair_color_id?: string;
    skin_tones?: { name: string };
    hair_colors?: { name: string };
    eye_color?: string;
    chest_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    shoe_size_eu?: number;
    reel_url?: string;
    union_member?: boolean;
    willing_to_travel?: boolean;
    dialects?: string[];
    travel_ready?: boolean;
  };
}

interface DirectoryPageProps {
  section: {
    key: string;
    title: string;
    items: Array<{ label: string; users?: number }>;
  };
  onBack: () => void;
  onUserSelect: (user: User) => void;
  onNavigate?: (page: string, data?: any) => void;
}

interface Company {
  id: string;
  name: string;
  subcategory?: string;
  description?: string;
  bio?: string;
  logo_url?: string;
  location_text?: string;
  location?: string;
  company_type_info?: {
    code?: string;
    name?: string;
  };
}

const DirectoryPage: React.FC<DirectoryPageProps> = ({
  section: sectionProp,
  onBack: onBackProp,
  onUserSelect,
  onNavigate: onNavigateProp,
}) => {
  // Get route params if available (React Navigation)
  // DirectoryPage can be accessed via both 'sectionServices' and 'directory' routes
  const route = useRoute<any>();
  const navigation = useNavigation();
  const routeParams = route.params;
  
  // Hide subcategory counts for now (they can be inaccurate due to role/label normalization differences)
  const SHOW_SUBCATEGORY_COUNTS = false;

  const { navigateTo, goBack } = useAppNavigation();
  // Use prop if provided (for backward compatibility), otherwise use hook
  const onNavigate = onNavigateProp || navigateTo;
  const onBack = onBackProp || goBack;

  // Handle user selection - use onUserSelect prop if provided, otherwise navigate directly
  const handleUserSelect = async (user: User) => {
    // For talent users without complete data, fetch it first
    if (user.category === 'talent' && !user.about) {
      const updatedUser = await fetchCompleteUserData(user.id);
      const userToNavigate = updatedUser || user;
      if (onUserSelect) {
        onUserSelect(userToNavigate);
      } else {
        // Transform user data to match ProfileDetailPage expectations
        const transformedProfile = {
          ...userToNavigate,
          stats: userToNavigate.stats || {
            followers: '0',
            projects: 0,
            likes: '0'
          },
          skills: userToNavigate.skills || [],
          bio: userToNavigate.bio || 'No bio available',
          onlineStatus: userToNavigate.onlineStatus || userToNavigate.online_last_seen || 'Last seen recently',
          about: userToNavigate.about || {
            gender: 'unknown'
          }
        };
        onNavigate('profile', transformedProfile);
      }
    } else {
      if (onUserSelect) {
        onUserSelect(user);
      } else {
        // Transform user data to match ProfileDetailPage expectations
        const transformedProfile = {
          ...user,
          stats: user.stats || {
            followers: '0',
            projects: 0,
            likes: '0'
          },
          skills: user.skills || [],
          bio: user.bio || 'No bio available',
          onlineStatus: user.onlineStatus || user.online_last_seen || 'Last seen recently',
          about: user.about || {
            gender: 'unknown'
          }
        };
        onNavigate('profile', transformedProfile);
      }
    }
  };

  // Get section from route params or prop
  // If route name is 'directory' or sectionKey is 'directory', use 'directory'
  const routeName = route.name;
  const sectionKey = routeParams?.sectionKey || (routeName === 'directory' ? 'directory' : null) || sectionProp?.key;
  
  // Handle directory section specially (it's dynamically created, not in SECTIONS)
  let section = sectionProp;
  if (!section && sectionKey) {
    if (sectionKey === 'directory') {
      // Create directory section dynamically
      section = {
        key: 'directory',
        title: 'All Members',
        items: [
          { label: 'All Members', users: 0 }
        ]
      };
    } else {
      // Find section from SECTIONS constant
      section = SECTIONS.find(s => s.key === sectionKey);
    }
  }
  
  // If no section found, show error or return early
  if (!section) {
    return (
      <View style={styles.container}>
        <Text>Section not found</Text>
      </View>
    );
  }

  const { api, getUsersDirect, addToMyTeam, removeFromMyTeam, getMyTeamMembers, isGuest, browseUsersAsGuest, getCompanies, getRoles } = useApi();
  const queryClient = useQueryClient();
  const isCompaniesSection = section.key === 'onehub' || section.key === 'academy';
  const isDirectorySection = section.key === 'directory';

  // Auto-select "All Members" for directory section since it only has one item
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    isDirectorySection && section.items.length === 1 ? section.items[0].label : null
  );
  const [loadingCompleteData, setLoadingCompleteData] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [debouncedFilters, setDebouncedFilters] = useState<FilterParams>({});
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [crewRoles, setCrewRoles] = useState<any[]>([]);
  const [talentRoles, setTalentRoles] = useState<any[]>([]);

  // Local back behavior: close in-page UI (filter/subcategory) before popping navigation history
  const handleBackPress = useCallback(() => {
    if (showFilterModal) {
      setShowFilterModal(false);
      return;
    }
    if (selectedSubcategory) {
      // For Academy/onehub sections, go back directly instead of clearing selection
      // (since we auto-select the subcategory when there's only one item)
      if (isCompaniesSection) {
        onBack();
        return;
      }
      setSelectedSubcategory(null);
      return;
    }
    onBack();
  }, [showFilterModal, selectedSubcategory, onBack, isCompaniesSection]);

  // Debounce search query (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce filters (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  // Fetch crew and talent roles for custom user identification
  useEffect(() => {
    const loadRoles = async () => {
      try {
        // Fetch crew roles using backend category filter
        const crewResponse = await getRoles({ category: 'crew' });
        if (crewResponse.success && crewResponse.data) {
          const crewRolesData = Array.isArray(crewResponse.data) ? crewResponse.data : [];
          setCrewRoles(crewRolesData);
          console.log('✅ Crew roles loaded for directory page:', crewRolesData.length, 'roles');
        }

        // Fetch talent roles using backend category filter
        const talentResponse = await getRoles({ category: 'talent' });
        if (talentResponse.success && talentResponse.data) {
          const talentRolesData = Array.isArray(talentResponse.data) ? talentResponse.data : [];
          setTalentRoles(talentRolesData);
          console.log('✅ Talent roles loaded for directory page:', talentRolesData.length, 'roles');
        }
      } catch (err) {
        console.error('Failed to load roles in directory page:', err);
      }
    };
    loadRoles();
  }, [getRoles]);

  const directoryUsersQueryKey = useMemo(
    () => [
      'directoryUsers',
      {
        sectionKey: section.key,
        isGuest,
        search: debouncedSearchQuery,
        filters: debouncedFilters,
      },
    ],
    [section.key, isGuest, debouncedSearchQuery, debouncedFilters]
  );

  type DirectoryUsersPage = {
    users: User[];
    page: number;
    limit: number;
    pagination?: { totalPages?: number };
  };

  const directoryUsersQuery = useInfiniteQuery<DirectoryUsersPage>({
    queryKey: directoryUsersQueryKey,
    enabled: !isCompaniesSection,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;
      const limit = 50;

      // For directory section, don't filter by category (show all users)
      // For other sections, infer category from section key
      const inferredCategory =
        isDirectorySection ? undefined : 
        section.key === 'talent' ? 'talent' : 
        section.key === 'individuals' ? 'crew' : undefined;
      const effectiveCategory = debouncedFilters.category ?? inferredCategory;

      const params: any = {
        limit,
        page,
        search: debouncedSearchQuery,
        category: effectiveCategory,
        role: debouncedFilters.role,
        location: debouncedFilters.location,
        // Physical Attributes
        height: debouncedFilters.height,
        height_min: debouncedFilters.height_min,
        height_max: debouncedFilters.height_max,
        weight: debouncedFilters.weight,
        weight_min: debouncedFilters.weight_min,
        weight_max: debouncedFilters.weight_max,
        age: debouncedFilters.age,
        age_min: debouncedFilters.age_min,
        age_max: debouncedFilters.age_max,
        // Body Measurements
        chest_min: debouncedFilters.chest_min,
        chest_max: debouncedFilters.chest_max,
        waist_min: debouncedFilters.waist_min,
        waist_max: debouncedFilters.waist_max,
        hips_min: debouncedFilters.hips_min,
        hips_max: debouncedFilters.hips_max,
        shoe_size_min: debouncedFilters.shoe_size_min,
        shoe_size_max: debouncedFilters.shoe_size_max,
        // Appearance
        skin_tone: debouncedFilters.skin_tone,
        hair_color: debouncedFilters.hair_color,
        eye_color: debouncedFilters.eye_color,
        // Personal Details
        gender: debouncedFilters.gender,
        nationality: debouncedFilters.nationality,
        // Professional Preferences
        union_member: debouncedFilters.union_member,
        willing_to_travel: debouncedFilters.willing_to_travel,
        travel_ready: debouncedFilters.travel_ready,
        // Additional filters
        accent: debouncedFilters.accent,
        skills: debouncedFilters.skills,
        languages: debouncedFilters.languages,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      if (isGuest) {
        const response = await browseUsersAsGuest(params);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to browse users as guest');
        }
        const data = response.data.data || response.data;
        const usersArray = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
        const pagination = response.data.pagination;
        return { users: usersArray, page, limit, pagination };
      }

      // Authenticated user flow: try direct fetch first
      try {
        const response = await getUsersDirect(params);
        if (response.success && response.data) {
          const data = response.data.data || response.data;
          const usersArray = Array.isArray(data) ? data : [];
          const pagination = response.data.pagination;
          return { users: usersArray, page, limit, pagination };
        }
      } catch (directErr) {
        console.warn('⚠️ Direct fetch failed, trying API client:', directErr);
      }

      // Fallback to API client
      const apiParams: any = { limit, page };
      Object.keys(params).forEach((key) => {
        if (key !== 'limit' && params[key] !== undefined && params[key] !== null && params[key] !== '') {
          if (key === 'search') {
            apiParams.q = params[key];
          } else {
            apiParams[key] = params[key];
          }
        }
      });
      const response = await api.getUsers(apiParams);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load users');
      }
      const data = response.data.data || response.data;
      const usersArray = Array.isArray(data) ? data : [];
      const pagination = response.data.pagination;
      return { users: usersArray, page, limit, pagination };
    },
    getNextPageParam: (lastPage) => {
      const totalPages = lastPage.pagination?.totalPages;
      if (typeof totalPages === 'number') {
        return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
      }
      return lastPage.users.length === lastPage.limit ? lastPage.page + 1 : undefined;
    },
  });

  const directoryCompaniesQueryKey = useMemo(
    () => ['directoryCompanies', { sectionKey: section.key }],
    [section.key]
  );

  const directoryCompaniesQuery = useQuery<Company[]>({
    queryKey: directoryCompaniesQueryKey,
    enabled: isCompaniesSection,
    queryFn: async () => {
      // Determine subcategory filter based on section (v2.24.0 optimization - server-side filtering)
      let subcategoryFilter: string | undefined;
      if (section.key === 'onehub') {
        subcategoryFilter = 'production_house,agency,casting_agency,studio,management_company';
      } else if (section.key === 'academy') {
        subcategoryFilter = 'academy';
      }

      const response = await getCompanies({
        limit: 100,
        fields: ['id', 'name', 'logo_url', 'location_text', 'subcategory', 'company_type_info'],
        subcategory: subcategoryFilter,
        sort: 'name',
        order: 'asc',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load companies');
      }

      const companiesArray = Array.isArray(response.data)
        ? response.data
        : Array.isArray((response.data as any)?.data)
          ? (response.data as any).data
          : [];

      return companiesArray;
    },
  });

  const teamMembersQueryKey = useMemo(() => ['myTeamMembers'], []);

  const teamMembersQuery = useQuery<any[]>({
    queryKey: teamMembersQueryKey,
    enabled: !isGuest,
    queryFn: async () => {
      const response = await getMyTeamMembers();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load team members');
      }
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const companies = directoryCompaniesQuery.data ?? [];

  const users = useMemo(() => {
    const pages = directoryUsersQuery.data?.pages ?? [];
    const merged: User[] = [];
    const seen = new Set<string>();
    pages.forEach((p) => {
      p.users.forEach((u) => {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          merged.push(u);
        }
      });
    });
    return merged;
  }, [directoryUsersQuery.data]);

  const teamMemberIds = useMemo(() => {
    const ids = new Set<string>();
    (teamMembersQuery.data ?? []).forEach((member: any) => {
      const id = member?.user_id || member?.id;
      if (typeof id === 'string') {
        ids.add(id);
      }
    });
    return ids;
  }, [teamMembersQuery.data]);

  const isLoading = isCompaniesSection
    ? directoryCompaniesQuery.isLoading
    : directoryUsersQuery.isLoading;

  const refreshing = isCompaniesSection
    ? directoryCompaniesQuery.isRefetching
    : (directoryUsersQuery.isRefetching && !directoryUsersQuery.isFetchingNextPage);

  const error = (() => {
    const err: any = isCompaniesSection ? directoryCompaniesQuery.error : directoryUsersQuery.error;
    return err ? (err instanceof Error ? err.message : String(err)) : null;
  })();

  const hasMoreUsers = !!directoryUsersQuery.hasNextPage;
  const loadingMoreUsers = directoryUsersQuery.isFetchingNextPage;

  const onRefresh = useCallback(() => {
    if (!isCompaniesSection) {
      // Keep refresh lightweight: drop to page 1 then refetch.
      queryClient.setQueryData(directoryUsersQueryKey, (old: any) => {
        if (!old?.pages?.length) return old;
        return {
          ...old,
          pages: old.pages.slice(0, 1),
          pageParams: old.pageParams?.slice?.(0, 1) ?? old.pageParams,
        };
      });
      directoryUsersQuery.refetch();
    } else {
      directoryCompaniesQuery.refetch();
    }

    if (!isGuest) {
      teamMembersQuery.refetch();
    }
  }, [
    isCompaniesSection,
    isGuest,
    queryClient,
    directoryUsersQueryKey,
    directoryUsersQuery,
    directoryCompaniesQuery,
    teamMembersQuery,
  ]);

  const handleLoadMoreUsers = useCallback(() => {
    if (!directoryUsersQuery.hasNextPage || directoryUsersQuery.isFetchingNextPage) return;
    directoryUsersQuery.fetchNextPage();
  }, [directoryUsersQuery]);

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
        // Update cached list data so the UI re-renders without additional refetches
        queryClient.setQueryData(directoryUsersQueryKey, (old: any) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              users: Array.isArray(p.users)
                ? p.users.map((u: User) => (u.id === userId ? updatedUser : u))
                : p.users,
            })),
          };
        });
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

  // Group companies by type for Studios & Agencies and Academy
  // Note: Companies are already filtered server-side by subcategory (v2.24.0 optimization)
  const filteredCompaniesByType = useMemo(() => {
    if (!companies.length || (section.key !== 'onehub' && section.key !== 'academy')) {
      return {};
    }

    const companiesByType: { [key: string]: Company[] } = {};

    companies.forEach(company => {
      const subcategory = company.subcategory || company.company_type_info?.code || '';
      
      if (section.key === 'onehub') {
        // Studios & Agencies: Group by subcategory type
        // Companies are already filtered server-side to only include: production_house, agency, studio, casting_agency, management_company
        if (subcategory === 'production_house') {
          if (!companiesByType['Production Houses']) companiesByType['Production Houses'] = [];
          companiesByType['Production Houses'].push(company);
        } else if (subcategory === 'agency' || subcategory === 'casting_agency') {
          if (!companiesByType['Agency']) companiesByType['Agency'] = [];
          companiesByType['Agency'].push(company);
        } else if (subcategory === 'studio') {
          if (!companiesByType['Studio']) companiesByType['Studio'] = [];
          companiesByType['Studio'].push(company);
        } else if (subcategory === 'management_company') {
          if (!companiesByType['Management Company']) companiesByType['Management Company'] = [];
          companiesByType['Management Company'].push(company);
        }
      } else if (section.key === 'academy') {
        // Academy: Group by company type name
        // Companies are already filtered server-side to only include academy subcategory
        const typeName = company.company_type_info?.name || 'Academy';
        if (!companiesByType[typeName]) companiesByType[typeName] = [];
        companiesByType[typeName].push(company);
      }
    });

    return companiesByType;
  }, [companies, section.key]);

  // Generate dynamic section items from companies
  const sectionItems = useMemo(() => {
    if (section.key === 'onehub' || section.key === 'academy') {
      // Use companies to generate items
      const items = Object.keys(filteredCompaniesByType).map(type => ({
        label: type,
        users: filteredCompaniesByType[type].length
      }));
      return items;
    }
    // For other sections, use original items
    return section.items;
  }, [section.items, section.key, filteredCompaniesByType]);

  // Auto-select subcategory for Academy/onehub sections when there's only one item
  useEffect(() => {
    if (isCompaniesSection && sectionItems.length === 1 && !selectedSubcategory) {
      setSelectedSubcategory(sectionItems[0].label);
    }
  }, [isCompaniesSection, sectionItems, selectedSubcategory]);

  // Helper function to check if a user matches the filter criteria
  // Note: Search is handled server-side, so we don't need to filter by searchQuery here
  // Optimized: checks only active filters, ordered by selectivity (most selective first)
  const matchesFilters = useCallback((user: User): boolean => {
    // Early exit if no filters are active
    const hasActiveFilters = Object.keys(filters).some(key => {
      const value = filters[key as keyof FilterParams];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
    if (!hasActiveFilters) return true;

    // Most selective filters first (category, role)
    // Category filter
    if (filters.category && user.category !== filters.category) {
      return false;
    }

    // Role filter
    if (filters.role && user.primary_role?.toLowerCase() !== filters.role.toLowerCase()) {
      return false;
    }

    // Location filter - only filter if user has location data
    if (filters.location) {
      const userLocation = user.about?.location?.toLowerCase() || '';
      // Only exclude if user has location data and it doesn't match
      if (userLocation && !userLocation.includes(filters.location.toLowerCase())) {
        return false;
      }
      // If user doesn't have location data, include them (lenient filtering)
    }

    // Gender filter - only filter if user has gender data
    if (filters.gender) {
      const userGender = user.about?.gender?.toLowerCase();
      // Only exclude if user has gender data and it doesn't match
      if (userGender && userGender !== filters.gender.toLowerCase()) {
        return false;
      }
      // If user doesn't have gender data, include them (lenient filtering)
    }

    // Age filter - only filter if user has age data
    if (filters.age || filters.age_min || filters.age_max) {
      if (user.about?.age !== undefined) {
        if (filters.age && user.about.age !== filters.age) {
          return false;
        }
        if (filters.age_min) {
          if (user.about.age < filters.age_min) {
            return false;
          }
        }
        if (filters.age_max) {
          if (user.about.age > filters.age_max) {
            return false;
          }
        }
      }
      // If user doesn't have age data, we still include them (lenient filtering)
    }

    // Height filter - only filter if user has height data
    if (filters.height || filters.height_min || filters.height_max) {
      if (user.about?.height_cm !== undefined) {
        if (filters.height && user.about.height_cm !== filters.height) {
          return false;
        }
        if (filters.height_min) {
          if (user.about.height_cm < filters.height_min) {
            return false;
          }
        }
        if (filters.height_max) {
          if (user.about.height_cm > filters.height_max) {
            return false;
          }
        }
      }
      // If user doesn't have height data, we still include them (lenient filtering)
    }

    // Weight filter - only filter if user has weight data
    if (filters.weight || filters.weight_min || filters.weight_max) {
      if (user.about?.weight_kg !== undefined) {
        if (filters.weight && user.about.weight_kg !== filters.weight) {
          return false;
        }
        if (filters.weight_min) {
          if (user.about.weight_kg < filters.weight_min) {
            return false;
          }
        }
        if (filters.weight_max) {
          if (user.about.weight_kg > filters.weight_max) {
            return false;
          }
        }
      }
      // If user doesn't have weight data, we still include them (lenient filtering)
    }

    // Body measurements filters
    if (filters.chest_min && user.about?.chest_cm !== undefined && user.about.chest_cm < filters.chest_min) {
      return false;
    }
    if (filters.chest_max && user.about?.chest_cm !== undefined && user.about.chest_cm > filters.chest_max) {
      return false;
    }
    if (filters.waist_min && user.about?.waist_cm !== undefined && user.about.waist_cm < filters.waist_min) {
      return false;
    }
    if (filters.waist_max && user.about?.waist_cm !== undefined && user.about.waist_cm > filters.waist_max) {
      return false;
    }
    if (filters.hips_min && user.about?.hips_cm !== undefined && user.about.hips_cm < filters.hips_min) {
      return false;
    }
    if (filters.hips_max && user.about?.hips_cm !== undefined && user.about.hips_cm > filters.hips_max) {
      return false;
    }
    if (filters.shoe_size_min && user.about?.shoe_size_eu !== undefined && user.about.shoe_size_eu < filters.shoe_size_min) {
      return false;
    }
    if (filters.shoe_size_max && user.about?.shoe_size_eu !== undefined && user.about.shoe_size_eu > filters.shoe_size_max) {
      return false;
    }

    // Appearance filters - only filter if user has the data
    if (filters.skin_tone) {
      const skinTone = filters.skin_tone.toLowerCase();
      const userSkinTone = user.about?.skin_tones?.name?.toLowerCase() || user.about?.skin_tone?.toLowerCase() || '';
      // Only exclude if user has skin tone data and it doesn't match
      if (userSkinTone && !userSkinTone.includes(skinTone)) {
        return false;
      }
      // If user doesn't have skin tone data, include them (lenient filtering)
    }
    if (filters.hair_color) {
      const hairColor = filters.hair_color.toLowerCase();
      const userHairColor = user.about?.hair_colors?.name?.toLowerCase() || user.about?.hair_color?.toLowerCase() || '';
      // Only exclude if user has hair color data and it doesn't match
      if (userHairColor && !userHairColor.includes(hairColor)) {
        return false;
      }
      // If user doesn't have hair color data, include them (lenient filtering)
    }
    if (filters.eye_color) {
      const userEyeColor = user.about?.eye_color?.toLowerCase() || '';
      // Only exclude if user has eye color data and it doesn't match
      if (userEyeColor && !userEyeColor.includes(filters.eye_color.toLowerCase())) {
        return false;
      }
      // If user doesn't have eye color data, include them (lenient filtering)
    }

    // Nationality filter - only filter if user has nationality data
    if (filters.nationality) {
      const userNationality = user.about?.nationality?.toLowerCase() || '';
      // Only exclude if user has nationality data and it doesn't match
      if (userNationality && !userNationality.includes(filters.nationality.toLowerCase())) {
        return false;
      }
      // If user doesn't have nationality data, include them (lenient filtering)
    }

    // Professional preferences - only filter if user has the data
    // Lenient filtering: if user doesn't have data, include them
    if (filters.union_member !== undefined) {
      const userUnionMember = user.about?.union_member;
      // Only exclude if user has data and it doesn't match
      if (userUnionMember !== undefined && userUnionMember !== filters.union_member) {
        return false;
      }
      // If user doesn't have union_member data, include them (lenient filtering)
    }
    if (filters.willing_to_travel !== undefined) {
      const userWillingToTravel = user.about?.willing_to_travel;
      // Only exclude if user has data and it doesn't match
      if (userWillingToTravel !== undefined && userWillingToTravel !== filters.willing_to_travel) {
        return false;
      }
      // If user doesn't have willing_to_travel data, include them (lenient filtering)
    }
    if (filters.travel_ready !== undefined) {
      const userTravelReady = user.about?.travel_ready;
      // Only exclude if user has data and it doesn't match
      if (userTravelReady !== undefined && userTravelReady !== filters.travel_ready) {
        return false;
      }
      // If user doesn't have travel_ready data, include them (lenient filtering)
    }

    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      const userSkills = user.skills?.map(s => s.toLowerCase()) || [];
      const hasMatchingSkill = filters.skills.some(skill => 
        userSkills.some(userSkill => userSkill.includes(skill.toLowerCase()))
      );
      if (!hasMatchingSkill) {
        return false;
      }
    }

    // Languages filter
    if (filters.languages && filters.languages.length > 0) {
      const userLanguages = user.about?.dialects?.map(l => l.toLowerCase()) || [];
      const hasMatchingLanguage = filters.languages.some(lang => 
        userLanguages.some(userLang => userLang.includes(lang.toLowerCase()))
      );
      if (!hasMatchingLanguage) {
        return false;
      }
    }

    return true;
  }, [filters]);

  // Filter users based on section, items, and applied filters
  const filteredUsers = useMemo(() => {
    if (!users.length || section.key === 'onehub' || section.key === 'academy') return {};
    
    // First, apply filter criteria to all users
    const filteredByCriteria = users.filter(matchesFilters);
    
    const sectionUsers: { [key: string]: User[] } = {};

    // Directory section: show all users without category/role filtering
    if (isDirectorySection) {
      section.items.forEach(item => {
        // For directory, all users go under "All Members"
        if (item.label === 'All Members') {
          sectionUsers[item.label] = filteredByCriteria;
        }
      });
      return sectionUsers;
    }

    // Custom section: allow an "All Custom Users" bucket + role-based buckets.
    // Use the same logic as HomePageWithUsers to identify ALL custom users:
    // - explicit category 'custom' (future backend support), OR
    // - crew/talent users whose primary_role isn't in the known crew/talent roles lists
    if (section.key === 'custom') {
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Build known role set from crew and talent roles (same as HomePageWithUsers)
      const knownRoleSet = new Set<string>([
        ...crewRoles.map((r: any) => normalize(getRoleName(r))),
        ...talentRoles.map((r: any) => normalize(getRoleName(r))),
      ].filter(Boolean));

      // Identify ALL custom users using the same logic as HomePageWithUsers
      const allCustomUsers = filteredByCriteria.filter((u) => {
        // Always include users with explicit 'custom' category
        if ((u as any).category === 'custom') {
          return true;
        }
        // Exclude companies
        if (u.category === 'company') return false;
        // Need a primary_role to classify as custom
        if (!u.primary_role) return false;
        
        // If roles haven't loaded yet, we can't determine if user is custom
        if (knownRoleSet.size === 0) {
          return false;
        }
        
        const role = normalize(u.primary_role);
        const isCustom = role ? !knownRoleSet.has(role) : false;
        
        return isCustom;
      });

      // Process section items
      section.items.forEach((item) => {
        if (item.label === 'All Custom Users') {
          // Show ALL custom users, not just those matching role labels
          sectionUsers[item.label] = allCustomUsers;
          return;
        }
        // For specific role labels, filter by that role
        const itemLabelNormalized = normalize(item.label);
        sectionUsers[item.label] = allCustomUsers.filter((u) => {
          if (!u.primary_role) return false;
          const userRoleNormalized = normalize(u.primary_role);
          // Exact match only to avoid double-counting (e.g. `nurse_2` showing up under `nurse`)
          return userRoleNormalized === itemLabelNormalized;
        });
      });

      return sectionUsers;
    }
    
    section.items.forEach(item => {
      // Use the item label directly as the role to match
      // Normalize both the item label and user's primary_role for comparison
      const itemLabelNormalized = item.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      const categoryUsers = filteredByCriteria.filter(user => {
        // Check if user's category matches section
        if (section.key === 'talent' && user.category !== 'talent') return false;
        if (section.key === 'individuals' && user.category !== 'crew') return false;
        
        // Check if user's role matches the item label
        if (!user.primary_role) return false;
        
        const userRoleNormalized = user.primary_role.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Match if normalized roles are the same, or if one contains the other
        return userRoleNormalized === itemLabelNormalized ||
               userRoleNormalized.includes(itemLabelNormalized) ||
               itemLabelNormalized.includes(userRoleNormalized);
      });
      
      sectionUsers[item.label] = categoryUsers;
    });

    return sectionUsers;
  }, [users, section, matchesFilters, crewRoles, talentRoles, isDirectorySection]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    const firstInitial = names[0]?.[0] || '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const capitalizeName = (name: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const capitalizeRole = (role: string) => {
    if (!role) return '';
    // Handle special cases that should be all caps
    const allCapsRoles = ['vfx', 'dop', 'ad', 'pa'];
    const lowerRole = role.toLowerCase();
    if (allCapsRoles.includes(lowerRole)) {
      return role.toUpperCase();
    }
    // For other roles, capitalize first letter of each word
    return role
      .toLowerCase()
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getOnlineStatus = (user: User) => {
    if (user.online_last_seen) {
      const lastSeen = new Date(user.online_last_seen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) return 'online';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return 'offline';
    }
    return 'offline';
  };

  const handleApplyFilters = useCallback((newFilters: FilterParams) => {
    console.log('🔍 Applying filters:', newFilters);
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const handleToggleTeamMember = async (user: User) => {
    const isCurrentlyInTeam = teamMemberIds.has(user.id);
    const isLoading = actionLoading.has(user.id);
    
    if (isLoading) return; // Prevent multiple simultaneous actions
    
    setActionLoading(prev => new Set(prev).add(user.id));
    
    try {
      if (isCurrentlyInTeam) {
        // Remove from team
        console.log('🔍 Removing user from personal team:', user.name);
        const response = await removeFromMyTeam(user.id);
        
        if (response.success) {
          // Optimistically remove from UI
          queryClient.setQueryData(teamMembersQueryKey, (old: any) => {
            const prev = Array.isArray(old) ? old : [];
            return prev.filter((m: any) => (m?.user_id || m?.id) !== user.id);
          });
          // Then invalidate and refetch to get fresh data
          queryClient.invalidateQueries({ queryKey: teamMembersQueryKey });
          // Force refetch to ensure UI updates immediately
          await queryClient.refetchQueries({ queryKey: teamMembersQueryKey });
        } else {
          console.error('Failed to remove user:', response.error);
        }
      } else {
        // Add to team
        console.log('🔍 Adding user to personal team:', user.name);
        const response = await addToMyTeam(user.id);
        
        if (response.success) {
          // Optimistically update the UI first to match API response structure
          queryClient.setQueryData(teamMembersQueryKey, (old: any) => {
            const prev = Array.isArray(old) ? old : [];
            const already = prev.some((m: any) => (m?.user_id || m?.id) === user.id);
            if (already) return prev;
            // Add user with full data structure matching API response (uses 'users' not 'user')
            // API returns: { user_id, users: {...}, joined_at, role, team_id }
            return [...prev, { 
              user_id: user.id,
              users: {
                id: user.id,
                name: user.name,
                email: user.email,
                image_url: user.image_url,
                category: user.category,
                primary_role: user.primary_role
              },
              joined_at: new Date().toISOString(),
              role: null,
              team_id: null // Will be set by actual API response
            }];
          });
          // Then invalidate and refetch to get fresh data from server
          queryClient.invalidateQueries({ queryKey: teamMembersQueryKey });
          // Force refetch to ensure UI updates immediately
          await queryClient.refetchQueries({ queryKey: teamMembersQueryKey });
        } else {
          console.error('Failed to add user:', response.error);
        }
      }
    } catch (error) {
      console.error('Error toggling team member:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {selectedSubcategory ? capitalizeRole(selectedSubcategory) : section.title}
          </Text>
          <View style={styles.headerRight}>
            {selectedSubcategory && (section.key !== 'onehub' && section.key !== 'academy') && (
              <TouchableOpacity 
                onPress={() => setShowSearchBar(!showSearchBar)} 
                style={styles.searchToggleButton}
              >
                <Ionicons name={showSearchBar ? "search" : "search-outline"} size={24} color="#000" />
              </TouchableOpacity>
            )}
            {selectedSubcategory ? (
              <TouchableOpacity
                onPress={() => setSelectedSubcategory(null)}
                style={styles.backButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
        </View>

        {/* Search and Filter Bar - Expandable */}
        {showSearchBar && selectedSubcategory && (section.key !== 'onehub' && section.key !== 'academy') && (
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onOpenFilter={() => setShowFilterModal(true)}
              filters={filters}
              onClearFilters={handleClearFilters}
            />
          </View>
        )}

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.skeletonContainer}
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonUserCard key={index} isDark={false} />
          ))}
        </ScrollView>

        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedSubcategory ? capitalizeRole(selectedSubcategory) : section.title}
        </Text>
        <View style={styles.headerRight}>
          {selectedSubcategory && (section.key !== 'onehub' && section.key !== 'academy') && (
            <TouchableOpacity 
              onPress={() => setShowSearchBar(!showSearchBar)} 
              style={styles.searchToggleButton}
            >
              <Ionicons name={showSearchBar ? "search" : "search-outline"} size={24} color="#000" />
            </TouchableOpacity>
          )}
          {selectedSubcategory && (
            <TouchableOpacity 
              onPress={() => setSelectedSubcategory(null)} 
              style={styles.backButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search and Filter Bar - Expandable */}
      {showSearchBar && selectedSubcategory && (section.key !== 'onehub' && section.key !== 'academy') && (
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onOpenFilter={() => setShowFilterModal(true)}
            filters={filters}
            onClearFilters={handleClearFilters}
          />
        </View>
      )}

      {!selectedSubcategory ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Show subcategories */}
          <View style={styles.subcategoriesContainer}>
            {sectionItems.map((item) => {
              const itemUsers = (filteredUsers as any)[item.label] || [];
              const itemCompanies = (filteredCompaniesByType as any)[item.label] || [];
              const count = section.key === 'onehub' || section.key === 'academy'
                ? itemCompanies.length
                : (typeof item.users === 'number' ? item.users : itemUsers.length);

              return (
                <TouchableOpacity
                  key={item.label}
                  style={styles.subcategoryCard}
                  onPress={() => setSelectedSubcategory(item.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.subcategoryContent}>
                    <View style={styles.subcategoryIcon}>
                      <Ionicons
                        name={(section.key === 'onehub' || section.key === 'academy') ? "business" : "people"}
                        size={24}
                        color="#3b82f6"
                      />
                    </View>
                    <View style={styles.subcategoryInfo}>
                      <Text style={styles.subcategoryTitle}>{capitalizeRole(item.label)}</Text>
                      {SHOW_SUBCATEGORY_COUNTS && (
                        <Text style={styles.subcategoryCount}>
                          {count} {(section.key === 'onehub' || section.key === 'academy') ? 'companies' : 'profiles'}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#71717a" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (section.key === 'onehub' || section.key === 'academy') ? (
        (() => {
          const itemCompanies = (filteredCompaniesByType as any)[selectedSubcategory] || [];
          const isAcademy = section.key === 'academy';

          return (
            <FlashListUnsafe
              data={itemCompanies}
              keyExtractor={(c: Company) => c.id}
              contentContainerStyle={[styles.usersContainer, { paddingBottom: 24 }]}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={onRefresh}
              estimatedItemSize={320}
              ListHeaderComponent={
                error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No {capitalizeRole(selectedSubcategory)} found</Text>
                </View>
              }
              renderItem={({ item: company }: { item: Company }) => {
                const location = company.location_text || company.location || '';
                const companyType = company.company_type_info?.name || '';

                return (
                  <TouchableOpacity
                    key={company.id}
                    style={[styles.companyCardTwoTone, isAcademy && styles.academyCard]}
                    onPress={() => {
                      onNavigate('companyProfile', { companyId: company.id, readOnly: true });
                    }}
                    activeOpacity={0.85}
                  >
                    {/* Image Section */}
                    <View style={styles.companyCardImageContainer}>
                      {company.logo_url ? (
                        <Image
                          source={{ uri: company.logo_url }}
                          style={styles.companyCardLogo}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View style={styles.companyCardLogoPlaceholder}>
                          <Ionicons name={isAcademy ? 'school' : 'business'} size={56} color="#a1a1aa" />
                        </View>
                      )}

                      {/* Navigation Arrow */}
                      <TouchableOpacity
                        style={styles.companyNavButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          onNavigate('companyProfile', { companyId: company.id, readOnly: true });
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Info Section */}
                    <View style={styles.companyCardBottom}>
                      <View style={styles.companyCardBottomHeader}>
                        <Text style={styles.companyCardBottomName} numberOfLines={1}>
                          {company.name}
                        </Text>
                        {companyType ? (
                          <View style={styles.companyCardTypeBadge}>
                            <Text style={styles.companyCardTypeText} numberOfLines={1}>
                              {companyType}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {location ? (
                        <View style={styles.companyCardLocation}>
                          <Ionicons name="location" size={16} color="#71717a" />
                          <Text style={styles.companyCardLocationText} numberOfLines={1}>
                            {location}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          );
        })()
      ) : (
        <FlashListUnsafe
          data={(filteredUsers as any)[selectedSubcategory] || []}
          keyExtractor={(u: User) => u.id}
          numColumns={2}
          contentContainerStyle={[styles.usersContainer, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreUsers}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={onRefresh}
          estimatedItemSize={260}
          ListHeaderComponent={
            error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No {capitalizeRole(selectedSubcategory)} profiles found</Text>
              {hasMoreUsers && !loadingMoreUsers ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMoreUsers}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loadMoreButtonText}>Load more profiles</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListFooterComponent={
            loadingMoreUsers ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : null
          }
          renderItem={({ item: user }: { item: User }) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => handleUserSelect(user)}
              activeOpacity={0.7}
            >
              {/* Full card background image */}
              {user.image_url ? (
                <Image
                  source={{ uri: user.image_url }}
                  style={styles.userCardBackgroundImage}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.userCardBackgroundPlaceholder}>
                  <Text style={styles.initialsText}>
                    {getInitials(user.name)}
                  </Text>
                </View>
              )}

              {/* Gradient overlay for text readability - full card */}
              <View style={styles.userCardGradientOverlay} />

              {/* Top actions bar */}
              {!isGuest && (
                <View style={styles.userCardTopActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButtonTop,
                      teamMemberIds.has(user.id) && styles.actionButtonTopAdded,
                      actionLoading.has(user.id) && styles.actionButtonTopLoading
                    ]}
                    onPress={() => handleToggleTeamMember(user)}
                    disabled={actionLoading.has(user.id)}
                  >
                    {actionLoading.has(user.id) ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name={teamMemberIds.has(user.id) ? "checkmark" : "add"}
                        size={18}
                        color="#fff"
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButtonTop}>
                    <Ionicons name="briefcase" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom content overlay */}
              <View style={styles.userCardBottomContent}>
                <View style={styles.userInfo}>
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: getOnlineStatus(user) === 'online' ? '#10b981' : '#9ca3af' }
                    ]} />
                    <Text style={styles.userName}>{capitalizeName(user.name)}</Text>
                  </View>
                  <Text style={styles.userRole}>
                    {user.primary_role?.replace('_', ' ').toUpperCase() || 'Member'}
                  </Text>

                  {/* Talent-specific details */}
                  {user.category === 'talent' && user.about && (
                    <View style={styles.talentDetails}>
                      {user.about.birthday && (
                        <Text style={styles.talentDetailText}>
                          {(() => {
                            const dob = new Date(user.about.birthday);
                            return dob.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                          })()}
                        </Text>
                      )}
                      {user.about.height_cm && (
                        <Text style={styles.talentDetailText}>
                          {user.about.height_cm}cm
                        </Text>
                      )}
                      {user.about.nationality && (
                        <Text style={styles.talentDetailText}>
                          {user.about.nationality}
                        </Text>
                      )}
                      {(user.about.hair_color || user.about.hair_colors?.name) && (
                        <Text style={styles.talentDetailText}>
                          {user.about.hair_colors?.name || user.about.hair_color}
                        </Text>
                      )}
                      {(user.about.skin_tone || user.about.skin_tones?.name) && (
                        <Text style={styles.talentDetailText}>
                          {user.about.skin_tones?.name || user.about.skin_tone}
                        </Text>
                      )}
                      {user.about.eye_color && (
                        <Text style={styles.talentDetailText}>
                          {user.about.eye_color}
                        </Text>
                      )}
                      {user.skills && user.skills.length > 0 && (
                        <Text style={styles.talentDetailText} numberOfLines={1}>
                          {user.skills.slice(0, 2).join(', ')}{user.skills.length > 2 ? '...' : ''}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Filter Modal */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.xs,
    paddingTop: spacing.xs,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: semanticSpacing.containerPadding,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchToggleButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    padding: semanticSpacing.containerPadding,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    color: '#71717a',
  },
  skeletonContainer: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: semanticSpacing.containerPadding,
    margin: semanticSpacing.sectionGapLarge,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: semanticSpacing.modalPadding,
    marginBottom: semanticSpacing.containerPadding,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  userCount: {
    fontSize: 14,
    color: '#71717a',
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xs,
    gap: semanticSpacing.buttonPadding,
  },
  userCard: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 16,
    marginHorizontal: spacing.xs,
    marginBottom: semanticSpacing.buttonPadding,
    minHeight: 240,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userCardBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  userCardBackgroundPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  userCardTopActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 3,
  },
  userCardBottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: semanticSpacing.containerPadding,
    paddingTop: 20,
    zIndex: 2,
  },
  userCardContent: {
    padding: semanticSpacing.containerPadding,
    flex: 1,
    position: 'relative',
    zIndex: 2,
    justifyContent: 'flex-end',
  },
  userInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: semanticSpacing.containerPadding,
    height: 140,
    width: '100%',
    overflow: 'hidden',
  },
  userImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginBottom: semanticSpacing.buttonPadding,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userRole: {
    fontSize: 10,
    color: '#d1d5db',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  talentDetails: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  talentDetailText: {
    fontSize: 9,
    color: '#e5e7eb',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '500',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonTopAdded: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)', // Green color when user is in team
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonTopLoading: {
    backgroundColor: 'rgba(107, 114, 128, 0.8)', // Gray color when loading
  },
  actionButtonAdded: {
    backgroundColor: '#10b981', // Green color when user is in team
  },
  actionButtonLoading: {
    backgroundColor: '#6b7280', // Gray color when loading
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  loadMoreButton: {
    marginTop: 12,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subcategoriesContainer: {
    padding: semanticSpacing.modalPadding,
  },
  subcategoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: semanticSpacing.containerPadding,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: semanticSpacing.modalPadding,
  },
  subcategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: semanticSpacing.sectionGapLarge,
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: spacing.xs,
  },
  subcategoryCount: {
    fontSize: 14,
    color: '#71717a',
  },
  usersContainer: {
    padding: semanticSpacing.modalPadding,
  },
  companyLogoInCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  companyDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 16,
  },
  // Two-tone company card styles
  companiesListContainer: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  companyCardTwoTone: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  academyCard: {
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderColor: '#e4e4e7',
  },
  companyCardImageContainer: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#18181b',
  },
  companyCardLogo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#18181b',
  },
  companyCardLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyNavButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  companyCardBottom: {
    backgroundColor: '#ffffff',
    padding: 18,
    paddingTop: 16,
  },
  companyCardBottomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  companyCardBottomName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181b',
    flex: 1,
    letterSpacing: 0.2,
  },
  companyCardTypeBadge: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  companyCardTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  companyCardLocationText: {
    fontSize: 14,
    color: '#71717a',
    flex: 1,
    fontWeight: '500',
  },
});

export default DirectoryPage;
