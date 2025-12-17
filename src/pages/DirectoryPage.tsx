import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { spacing, semanticSpacing } from '../constants/spacing';
import SearchBar from '../components/SearchBar';
import FilterModal, { FilterParams } from '../components/FilterModal';
import SkeletonUserCard from '../components/SkeletonUserCard';

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
  section,
  onBack,
  onUserSelect,
  onNavigate,
}) => {
  const { api, getUsersDirect, getMyTeam, addToMyTeam, removeFromMyTeam, getMyTeamMembers, isGuest, browseUsersAsGuest, getCompanies } = useApi();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [loadingCompleteData, setLoadingCompleteData] = useState<Set<string>>(new Set());
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [debouncedFilters, setDebouncedFilters] = useState<FilterParams>({});
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});
  const [loadingSubcategoryCounts, setLoadingSubcategoryCounts] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subcategoryCountsRequestIdRef = useRef(0);

  const normalizeRoleParam = useCallback((value: string) => {
    return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '_').trim();
  }, []);

  const inferredCategory = useMemo(() => {
    return section.key === 'talent' ? 'talent' : section.key === 'individuals' ? 'crew' : undefined;
  }, [section.key]);

  // Pagination state (users list)
  const [usersPage, setUsersPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);

  // Local back behavior: close in-page UI (filter/subcategory) before popping navigation history
  const handleBackPress = useCallback(() => {
    if (showFilterModal) {
      setShowFilterModal(false);
      return;
    }
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
      return;
    }
    onBack();
  }, [showFilterModal, selectedSubcategory, onBack]);

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

  const fetchUsers = useCallback(async (page: number = 1, append: boolean = false) => {
    // Cancel previous request if still pending (only for fresh loads)
    if (!append && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      console.log('👥 Fetching users for directory...', isGuest ? '(Guest Mode)' : '(Authenticated)', `Page: ${page}`, append ? '(append)' : '(replace)');
      setError(null);

      if (append) {
        setLoadingMoreUsers(true);
      } else {
        setIsLoading(true);
      }

      const limit = 50;

      const effectiveCategory = inferredCategory ?? debouncedFilters.category;
      const selectedRoleParam = selectedSubcategory ? normalizeRoleParam(selectedSubcategory) : undefined;

      // Build params with debounced search and filters
      const params: any = {
        limit,
        page,
        search: debouncedSearchQuery,
        category: effectiveCategory,
        // When a subcategory is selected, filter server-side by role so pagination + counts are correct.
        role: selectedRoleParam ?? debouncedFilters.role,
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
      
      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const mergeById = (prev: User[], next: User[]) => {
        if (!prev.length) return next;
        const seen = new Set(prev.map(u => u.id));
        const merged = [...prev];
        next.forEach(u => {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            merged.push(u);
          }
        });
        return merged;
      };
      
      // Use guest browsing if in guest mode
      if (isGuest) {
        try {
          console.log('🎭 Browsing users as guest...', params);
          const response = await browseUsersAsGuest(params);
          
          if (response.success && response.data) {
            const data = response.data.data || response.data;
            const usersArray = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
            const pagination = response.data.pagination;

            console.log('✅ Users fetched successfully as guest:', usersArray.length);
            setUsers(prev => (append ? mergeById(prev, usersArray) : usersArray));
            setUsersPage(page);
            setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
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
        const response = await getUsersDirect(params);
        
        if (response.success && response.data) {
          const data = response.data.data || response.data;
          const usersArray = Array.isArray(data) ? data : [];
          const pagination = response.data.pagination;

          console.log('✅ Users fetched successfully with direct fetch:', usersArray.length);
          setUsers(prev => (append ? mergeById(prev, usersArray) : usersArray));
          setUsersPage(page);
          setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
          return;
        }
      } catch (directErr) {
        console.warn('⚠️ Direct fetch failed, trying API client:', directErr);
      }
      
      // Fallback to API client
      const apiParams: any = {
        limit,
        page,
      };
      // Copy all filter parameters
      Object.keys(params).forEach(key => {
        if (key !== 'limit' && params[key] !== undefined && params[key] !== null && params[key] !== '') {
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

        console.log('✅ Users fetched successfully with API client:', usersArray.length);
        
        // For now, use basic user data to avoid rate limiting
        // TODO: Implement batch API call or server-side complete data fetching
        const completeUsers = usersArray;
        
        setUsers(prev => (append ? mergeById(prev, completeUsers) : completeUsers));
        setUsersPage(page);
        setHasMoreUsers(pagination ? page < pagination.totalPages : usersArray.length === limit);
        console.log('✅ Complete user data fetched:', completeUsers.length);
      } else {
        console.error('❌ Failed to fetch users:', response.error);
        setError('Failed to load users');
      }
    } catch (err: any) {
      // Don't update state if request was aborted
      if (abortController.signal.aborted) {
        console.log('⏹️ Request aborted');
        return;
      }
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      // Only update loading state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        setRefreshing(false);
        setLoadingMoreUsers(false);
      }
    }
  }, [isGuest, debouncedSearchQuery, debouncedFilters, browseUsersAsGuest, getUsersDirect, api, inferredCategory, selectedSubcategory, normalizeRoleParam]);

  const fetchSubcategoryCounts = useCallback(async () => {
    if (section.key === 'onehub' || section.key === 'academy') return;
    if (!inferredCategory) return; // only compute counts for users sections (crew/talent) for now
    if (!sectionItems?.length) return;

    // Only meaningful when viewing the list of subcategories
    if (selectedSubcategory) return;

    const requestId = ++subcategoryCountsRequestIdRef.current;
    setLoadingSubcategoryCounts(true);

    try {
      // Build shared params (excluding role - we set it per item)
      const sharedParams: any = {
        limit: 1,
        page: 1,
        search: debouncedSearchQuery,
        category: inferredCategory,
        // Apply all active filters except role (role is per-subcategory)
        location: debouncedFilters.location,
        height: debouncedFilters.height,
        height_min: debouncedFilters.height_min,
        height_max: debouncedFilters.height_max,
        weight: debouncedFilters.weight,
        weight_min: debouncedFilters.weight_min,
        weight_max: debouncedFilters.weight_max,
        age: debouncedFilters.age,
        age_min: debouncedFilters.age_min,
        age_max: debouncedFilters.age_max,
        chest_min: debouncedFilters.chest_min,
        chest_max: debouncedFilters.chest_max,
        waist_min: debouncedFilters.waist_min,
        waist_max: debouncedFilters.waist_max,
        hips_min: debouncedFilters.hips_min,
        hips_max: debouncedFilters.hips_max,
        shoe_size_min: debouncedFilters.shoe_size_min,
        shoe_size_max: debouncedFilters.shoe_size_max,
        skin_tone: debouncedFilters.skin_tone,
        hair_color: debouncedFilters.hair_color,
        eye_color: debouncedFilters.eye_color,
        gender: debouncedFilters.gender,
        nationality: debouncedFilters.nationality,
        union_member: debouncedFilters.union_member,
        willing_to_travel: debouncedFilters.willing_to_travel,
        travel_ready: debouncedFilters.travel_ready,
        accent: debouncedFilters.accent,
        skills: debouncedFilters.skills,
        languages: debouncedFilters.languages,
      };

      Object.keys(sharedParams).forEach((key) => {
        if (sharedParams[key] === undefined || sharedParams[key] === null || sharedParams[key] === '') {
          delete sharedParams[key];
        }
      });

      const labels = sectionItems.map((i) => i.label).filter(Boolean);
      const results: Record<string, number> = {};

      // Simple concurrency limiter to avoid rate limits
      const CONCURRENCY = 6;
      let idx = 0;

      const worker = async () => {
        while (idx < labels.length) {
          const current = labels[idx++];
          const roleParam = normalizeRoleParam(current);
          if (!roleParam) continue;

          try {
            const params = { ...sharedParams, role: roleParam };
            const response = isGuest
              ? await browseUsersAsGuest(params)
              : await getUsersDirect(params);

            const total =
              response?.data?.pagination?.total ??
              response?.data?.pagination?.totalCount ??
              response?.data?.pagination?.count ??
              0;

            results[current] = typeof total === 'number' ? total : Number(total) || 0;
          } catch (e) {
            // If anything fails, keep previous count (or 0) for that label
            results[current] = results[current] ?? 0;
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, labels.length) }).map(() => worker()));

      if (subcategoryCountsRequestIdRef.current === requestId) {
        setSubcategoryCounts(results);
      }
    } finally {
      if (subcategoryCountsRequestIdRef.current === requestId) {
        setLoadingSubcategoryCounts(false);
      }
    }
  }, [
    section.key,
    inferredCategory,
    sectionItems,
    selectedSubcategory,
    debouncedSearchQuery,
    debouncedFilters,
    isGuest,
    browseUsersAsGuest,
    getUsersDirect,
    normalizeRoleParam,
  ]);

  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Determine subcategory filter based on section (v2.24.0 optimization - server-side filtering)
      let subcategoryFilter: string | undefined;
      if (section.key === 'onehub') {
        // Studios & Agencies: production_house, agency, studio, casting_agency, management_company
        subcategoryFilter = 'production_house,agency,casting_agency,studio,management_company';
      } else if (section.key === 'academy') {
        // Academy: academy subcategory
        subcategoryFilter = 'academy';
      }
      
      // Optimize payload size by selecting only essential fields for list view (v2.24.0)
      // Use server-side subcategory filtering to reduce payload and improve performance
      const response = await getCompanies({ 
        limit: 100,
        fields: ['id', 'name', 'logo_url', 'location_text', 'subcategory', 'company_type_info'],
        subcategory: subcategoryFilter,
        sort: 'name',
        order: 'asc'
      });
      
      if (response.success && response.data) {
        const companiesArray = Array.isArray(response.data) 
          ? response.data 
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        setCompanies(companiesArray);
      } else {
        console.error('❌ Failed to fetch companies:', response.error);
        setError('Failed to load companies');
      }
    } catch (err: any) {
      console.error('❌ Error fetching companies:', err);
      setError(err.message || 'Failed to load companies');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [getCompanies, section.key]);


  useEffect(() => {
    setUsersPage(1);
    setHasMoreUsers(true);

    // Only fetch users if not viewing companies section
    if (section.key !== 'onehub' && section.key !== 'academy') {
      if (selectedSubcategory) {
        // Selected role: fetch users server-side for accurate pagination
        fetchUsers(1, false);
      } else {
        // Subcategory list: fetch accurate counts (not page-limited)
        fetchSubcategoryCounts();
      }
    }
    
    // Fetch companies for Studios & Agencies and Academy sections
    if (section.key === 'onehub' || section.key === 'academy') {
      fetchCompanies(); // fetchCompanies already handles setIsLoading
    }
    
    // Only load team members if authenticated (not guest)
    if (!isGuest) {
      loadTeamMembers();
    }
  }, [isGuest, section.key, selectedSubcategory, debouncedSearchQuery, debouncedFilters, fetchUsers, fetchCompanies, fetchSubcategoryCounts]);

  const loadTeamMembers = async () => {
    // Skip loading team members if guest
    if (isGuest) return;
    
    try {
      const response = await getMyTeamMembers();
      if (response.success && response.data) {
        console.log('🔍 DirectoryPage - Team members data:', JSON.stringify(response.data, null, 2));
        const memberIds = new Set<string>(response.data.map((member: any) => member.user_id));
        setTeamMemberIds(memberIds);
        console.log('✅ DirectoryPage - Team member IDs loaded:', Array.from(memberIds));
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (section.key !== 'onehub' && section.key !== 'academy') {
      setUsersPage(1);
      setHasMoreUsers(true);
      fetchUsers(1, false);
    } else {
      fetchCompanies();
    }
    // Only refresh team members if authenticated (not guest)
    if (!isGuest) {
      loadTeamMembers();
    }
  }, [section.key, isGuest, fetchUsers, fetchCompanies]);

  const handleLoadMoreUsers = useCallback(() => {
    if (isLoading || refreshing || loadingMoreUsers || !hasMoreUsers) return;
    fetchUsers(usersPage + 1, true);
  }, [isLoading, refreshing, loadingMoreUsers, hasMoreUsers, fetchUsers, usersPage]);

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

    // Custom section: allow an "All Custom Users" bucket + role-based buckets.
    // We infer "custom users" from the section's role items (generated on HomePageWithUsers),
    // so this works even before the backend supports a true `custom` category.
    if (section.key === 'custom') {
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const roleLabels = section.items
        .map((i) => i.label)
        .filter((label) => label !== 'All Custom Users');
      const roleSet = new Set(roleLabels.map(normalize).filter(Boolean));

      const customUsers = filteredByCriteria.filter((u) => {
        if (!u.primary_role) return false;
        const role = normalize(u.primary_role);
        return roleSet.size > 0 ? roleSet.has(role) : false;
      });

      section.items.forEach((item) => {
        if (item.label === 'All Custom Users') {
          sectionUsers[item.label] = customUsers;
          return;
        }
        const itemLabelNormalized = normalize(item.label);
        sectionUsers[item.label] = customUsers.filter((u) => {
          const userRoleNormalized = normalize(u.primary_role || '');
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
  }, [users, section, matchesFilters]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    const firstInitial = names[0]?.[0] || '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
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
          setTeamMemberIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(user.id);
            return newSet;
          });
        } else {
          console.error('Failed to remove user:', response.error);
        }
      } else {
        // Add to team
        console.log('🔍 Adding user to personal team:', user.name);
        const response = await addToMyTeam(user.id);
        
        if (response.success) {
          setTeamMemberIds(prev => new Set(prev).add(user.id));
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
            {selectedSubcategory ? selectedSubcategory : section.title}
          </Text>
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

        {/* Keep SearchBar mounted while loading so typing isn't interrupted */}
        {selectedSubcategory && (section.key !== 'onehub' && section.key !== 'academy') && (
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
          {selectedSubcategory ? selectedSubcategory : section.title}
        </Text>
        {selectedSubcategory && (
          <TouchableOpacity 
            onPress={() => setSelectedSubcategory(null)} 
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search and Filter Bar */}
      {selectedSubcategory && (section.key !== 'onehub' && section.key !== 'academy') && (
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
                      <Text style={styles.subcategoryTitle}>{item.label}</Text>
                      <Text style={styles.subcategoryCount}>{count} {(section.key === 'onehub' || section.key === 'academy') ? 'companies' : 'profiles'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#71717a" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (section.key === 'onehub' || section.key === 'academy') ? (
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

          {/* Show companies for selected subcategory */}
          <View style={styles.usersContainer}>
            {(() => {
              const itemCompanies = (filteredCompaniesByType as any)[selectedSubcategory] || [];
              const isAcademy = section.key === 'academy';

              return itemCompanies.length > 0 ? (
                <View style={styles.companiesListContainer}>
                  {itemCompanies.map((company: Company) => {
                    const location = company.location_text || company.location || '';
                    const companyType = company.company_type_info?.name || '';

                    return (
                      <TouchableOpacity
                        key={company.id}
                        style={[
                          styles.companyCardTwoTone,
                          isAcademy && styles.academyCard
                        ]}
                        onPress={() => {
                          if (onNavigate) {
                            onNavigate('companyProfile', { companyId: company.id, readOnly: true });
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        {/* Image Section */}
                        <View style={styles.companyCardImageContainer}>
                          {company.logo_url ? (
                            <Image
                              source={{ uri: company.logo_url }}
                              style={styles.companyCardLogo}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.companyCardLogoPlaceholder}>
                              <Ionicons
                                name={isAcademy ? "school" : "business"}
                                size={56}
                                color="#a1a1aa"
                              />
                            </View>
                          )}

                          {/* Navigation Arrow */}
                          <TouchableOpacity
                            style={styles.companyNavButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              if (onNavigate) {
                                onNavigate('companyProfile', { companyId: company.id, readOnly: true });
                              }
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
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No {selectedSubcategory.toLowerCase()} found</Text>
                </View>
              );
            })()}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={(filteredUsers as any)[selectedSubcategory] || []}
          keyExtractor={(u: User) => u.id}
          numColumns={2}
          columnWrapperStyle={styles.usersGrid}
          contentContainerStyle={[styles.usersContainer, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreUsers}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No {selectedSubcategory.toLowerCase()} profiles found</Text>
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
              onPress={async () => {
                // For talent users without complete data, fetch it first
                if (user.category === 'talent' && !user.about) {
                  const updatedUser = await fetchCompleteUserData(user.id);
                  onUserSelect(updatedUser || user);
                } else {
                  onUserSelect(user);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.userCardContent}>
                <View style={styles.userInitials}>
                  {user.image_url ? (
                    <Image
                      source={{ uri: user.image_url }}
                      style={styles.userImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.initialsText}>
                      {getInitials(user.name)}
                    </Text>
                  )}
                </View>

                <View style={styles.userInfo}>
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: getOnlineStatus(user) === 'online' ? '#10b981' : '#9ca3af' }
                    ]} />
                    <Text style={styles.userName}>{user.name}</Text>
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

                  {/* Show message if talent profile data is not available */}
                  {user.category === 'talent' && !user.about && (
                    <View style={styles.talentDetails}>
                      <Text style={[styles.talentDetailText, { fontStyle: 'italic' }]}>
                        {loadingCompleteData.has(user.id) ? 'Loading details...' : 'Profile details not loaded'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.userActions}>
                  {/* Only show team actions if authenticated (not guest) */}
                  {!isGuest && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        teamMemberIds.has(user.id) && styles.actionButtonAdded,
                        actionLoading.has(user.id) && styles.actionButtonLoading
                      ]}
                      onPress={() => handleToggleTeamMember(user)}
                      disabled={actionLoading.has(user.id)}
                    >
                      {actionLoading.has(user.id) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons
                          name={teamMemberIds.has(user.id) ? "checkmark" : "add"}
                          size={16}
                          color="#fff"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                  {/* Project assignment button - also only for authenticated users */}
                  {!isGuest && (
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="briefcase" size={16} color="#fff" />
                    </TouchableOpacity>
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
    padding: semanticSpacing.containerPadding,
    paddingTop: semanticSpacing.containerPadding,
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
    width: '48%',
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: semanticSpacing.buttonPadding,
    minHeight: 220,
  },
  userCardContent: {
    padding: semanticSpacing.containerPadding,
    flex: 1,
  },
  userInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: semanticSpacing.containerPadding,
    height: 100,
    width: '100%',
  },
  userImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  userRole: {
    fontSize: 12,
    color: '#9ca3af',
  },
  talentDetails: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  talentDetailText: {
    fontSize: 10,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
