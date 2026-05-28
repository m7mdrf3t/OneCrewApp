import OneCrewApi from 'onecrew-api-client';
import { rateLimiter } from '../utils/rateLimiter';
import performanceMonitor from '../services/PerformanceMonitor';

const DEFAULT_BASE_URL = 'https://onecrew-backend-staging-309236356616.us-central1.run.app';

interface UseReferenceDataParams {
  api: OneCrewApi;
}

export function useReferenceData({ api }: UseReferenceDataParams) {
  const baseUrl: string = (api as any).baseUrl || DEFAULT_BASE_URL;

  // Helper function to categorize roles
  const getRoleCategory = (role: string): string => {
    const roleCategories: {[key: string]: string} = {
      'Writer': 'Creative',
      'Director': 'Creative',
      'Producer': 'Production',
      'Actor': 'Talent',
      'Cinematographer': 'Technical',
      'Editor': 'Technical',
      'Sound Engineer': 'Technical',
      'Casting Director': 'Production',
      'Location Manager': 'Production',
      'Production Designer': 'Creative',
      'Author': 'Creative',
      'Task Admins': 'Management',
      'Stunt Coordinator': 'Technical',
      'Colorist': 'Technical',
      'Sound Designer': 'Technical',
      'VFX Artist': 'Technical',
      'Marketing Manager': 'Marketing',
      'Distribution Coordinator': 'Business',
      'Publicist': 'Marketing',
    };
    return roleCategories[role] || 'Other';
  };

const getSkinTones = async () => {
  try {
    console.log('🔄 Fetching skin tones using API client...');
    const response = await api.getAvailableSkinTones();
    console.log('    Skin tones fetched successfully:', response.data?.length || 0);
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch skin tones via API client:', error);
    // Fallback to direct fetch
    try {
      console.log('🔄 Trying direct fetch fallback...');
      const response = await fetch(`${baseUrl}/api/talent/reference/skin-tones`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('    Skin tones fetched via fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('  Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

const getHairColors = async () => {
  try {
    console.log('🔄 Fetching hair colors using API client...');
    const response = await api.getAvailableHairColors();
    console.log('    Hair colors fetched successfully:', response.data?.length || 0);
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch hair colors via API client:', error);
    // Fallback to direct fetch
    try {
      console.log('🔄 Trying direct fetch fallback...');
      const response = await fetch(`${baseUrl}/api/talent/reference/hair-colors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('    Hair colors fetched via fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('  Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

const getSkills = async () => {
  try {
    console.log('🔄 Fetching skills using API client...');
    const response = await api.getAvailableSkills();
    console.log('    Skills fetched successfully:', response.data?.length || 0);
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch skills via API client:', error);
    // Fallback to direct fetch
    try {
      console.log('🔄 Trying direct fetch fallback...');
      const response = await fetch(`${baseUrl}/api/talent/reference/skills`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('    Skills fetched via fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('  Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

const getAbilities = async () => {
  try {
    console.log('🔄 Fetching abilities using API client...');
    const response = await api.getAvailableAbilities();
    console.log('    Abilities fetched successfully:', response.data?.length || 0);
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch abilities via API client:', error);
    // Fallback to direct fetch
    try {
      console.log('🔄 Trying direct fetch fallback...');
      const response = await fetch(`${baseUrl}/api/talent/reference/abilities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('    Abilities fetched via fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('  Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

const getLanguages = async () => {
  try {
    console.log('🔄 Fetching languages using API client...');
    const response = await api.getAvailableLanguages();
    console.log('    Languages fetched successfully:', response.data?.length || 0);
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch languages via API client:', error);
    // Fallback to direct fetch
    try {
      console.log('🔄 Trying direct fetch fallback...');
      const response = await fetch(`${baseUrl}/api/talent/reference/languages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('    Languages fetched via fallback:', result);
      return result;
    } catch (fallbackError) {
      console.error('  Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

const getServices = async () => {
  try {
    console.log('🔍 Fetching services...');
    const response = await fetch(`${baseUrl}/api/talent/reference/services`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('    Services fetched:', result);
    return result;
  } catch (err: any) {
    console.error('  Failed to fetch services:', err);
    // Return mock services as fallback
    return {
      success: true,
      data: [
        { id: '1', name: 'Writer', category: 'Creative' },
        { id: '2', name: 'Author', category: 'Creative' },
        { id: '3', name: 'Producer', category: 'Production' },
        { id: '4', name: 'Task Admins', category: 'Management' },
        { id: '5', name: 'Director', category: 'Creative' },
        { id: '6', name: 'Casting Director', category: 'Production' },
        { id: '7', name: 'Location Manager', category: 'Production' },
        { id: '8', name: 'Production Designer', category: 'Creative' },
        { id: '9', name: 'Cinematographer', category: 'Technical' },
        { id: '10', name: 'Sound Engineer', category: 'Technical' },
        { id: '11', name: 'Actor', category: 'Talent' },
        { id: '12', name: 'Stunt Coordinator', category: 'Technical' },
        { id: '13', name: 'Editor', category: 'Technical' },
        { id: '14', name: 'Colorist', category: 'Technical' },
        { id: '15', name: 'Sound Designer', category: 'Technical' },
        { id: '16', name: 'VFX Artist', category: 'Technical' },
        { id: '17', name: 'Marketing Manager', category: 'Marketing' },
        { id: '18', name: 'Distribution Coordinator', category: 'Business' },
        { id: '19', name: 'Publicist', category: 'Marketing' },
      ]
    };
  }
};

const getRoles = async (options?: { category?: 'crew' | 'talent' | 'company' | 'guest' | 'custom'; active?: boolean }) => {
  // Backend `user_category` enum does not include "custom" (yet). Treat custom roles as client-managed to avoid 500s.
  if (options?.category === 'custom') {
    return { success: true, data: [] };
  }

  return performanceMonitor.trackApiCall(
    'Get Roles',
    `${baseUrl}/api/roles${options?.category ? `?category=${options.category}` : ''}`,
    'GET',
    async () => {
      try {
        console.log('🔍 Fetching roles using API client...', options ? `with options: ${JSON.stringify(options)}` : '');
        const normalizeCategory = (cat: any): string | undefined => {
          if (typeof cat !== 'string') return undefined;
          const lower = cat.toLowerCase();
          // Common mappings (backend might return Title Case or different taxonomy)
          if (lower === 'talent') return 'talent';
          if (lower === 'crew') return 'crew';
          if (lower === 'company') return 'company';
          if (lower === 'guest') return 'guest';
          if (lower === 'custom') return 'custom';
          return cat;
        };

        const extractRoleName = (role: any): string => {
          if (typeof role === 'string') return role;
          if (!role || typeof role !== 'object') return '';
          // Try common fields
          if (typeof role.name === 'string') return role.name;
          if (typeof role.role === 'string') return role.role;
          if (typeof role.title === 'string') return role.title;
          if (typeof role.role_name === 'string') return role.role_name;
          return '';
        };

        const toRoleObjects = (raw: any): Array<{ id: string; name: string; category?: string }> => {
          const arr = Array.isArray(raw) ? raw : [];
          const out: Array<{ id: string; name: string; category?: string }> = [];

          arr.forEach((item: any, index: number) => {
            const name = extractRoleName(item).trim();
            if (!name) return;
            const id =
              (item && typeof item === 'object' && (typeof item.id === 'string' || typeof item.id === 'number'))
                ? String(item.id)
                : String(index + 1);
            const itemCategory =
              item && typeof item === 'object' ? normalizeCategory(item.category) : undefined;
            const category = options?.category || itemCategory || getRoleCategory(name);
            out.push({ id, name, category });
          });

          return out;
        };
        
        // Ensure API is initialized
        if (!api) {
          throw new Error('API client not initialized');
        }
        
        // Check if the method exists
        if (typeof api.getRoles !== 'function') {
          console.log('🔍 API client methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(api)));
          console.log('🔍 getRoles method exists:', typeof api.getRoles);
          console.log('🔍 API client prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(api)));
          
          // Try using the apiClient directly
          console.log('🔍 Trying direct apiClient call...');
          const params = new URLSearchParams();
          if (options?.category) {
            params.append('category', options.category);
          }
          if (options?.active !== undefined) {
            params.append('active', String(options.active));
          }
          const queryString = params.toString();
          const url = `/api/roles${queryString ? `?${queryString}` : ''}`;
          const response = await (api as any).apiClient.get(url);
          console.log('    Direct API call successful:', response);
          // Normalize into consistent shape for the app
          if (response?.success && response?.data) {
            return { success: true, data: toRoleObjects(response.data) };
          }
          return response;
        }
        
        const response = await api.getRoles(options);
    
    if (response.success && response.data) {
      // Normalize API response into object array format (supports string[] OR object[])
      const rolesData = toRoleObjects(response.data);
      
      console.log('    Roles fetched:', rolesData);
      return {
        success: true,
        data: rolesData
      };
    } else {
      throw new Error(response.error || 'Failed to fetch roles');
    }
      } catch (err: any) {
        console.error('  Failed to fetch roles:', err);
        // Custom roles should fail "quietly" (backend may not support it yet) and should not fall back to mock roles.
        if (options?.category === 'custom') {
          return { success: true, data: [] };
        }
        // Return mock roles as fallback
        return {
          success: true,
          data: [
            { id: '1', name: 'Writer', category: 'Creative' },
            { id: '2', name: 'Director', category: 'Creative' },
            { id: '3', name: 'Producer', category: 'Production' },
            { id: '4', name: 'Actor', category: 'Talent' },
            { id: '5', name: 'Cinematographer', category: 'Technical' },
            { id: '6', name: 'Editor', category: 'Technical' },
            { id: '7', name: 'Sound Engineer', category: 'Technical' },
            { id: '8', name: 'Casting Director', category: 'Production' },
            { id: '9', name: 'Location Manager', category: 'Production' },
            { id: '10', name: 'Production Designer', category: 'Creative' },
          ]
        };
      }
    }
  );
};

const getCategories = async () => {
  try {
    console.log('🔍 Fetching categories using API client...');
    
    // Check if the method exists
    if (typeof api.getCategories !== 'function') {
      console.log('🔍 getCategories method not available, using direct API call...');
      const response = await (api as any).apiClient.get('/api/categories');
      console.log('    Direct categories API call successful:', response);
      return response;
    }
    
    const response = await api.getCategories();
    
    if (response.success && response.data) {
      // Convert string array to object array format
      const categoriesData = response.data.map((category: string, index: number) => ({
        id: (index + 1).toString(),
        name: category,
        description: `${category} roles`
      }));
      
      console.log('    Categories fetched:', categoriesData);
      return {
        success: true,
        data: categoriesData
      };
    } else {
      throw new Error(response.error || 'Failed to fetch categories');
    }
  } catch (err: any) {
    console.error('  Failed to fetch categories:', err);
    // Return mock categories as fallback
    return {
      success: true,
      data: [
        { id: '1', name: 'Creative', description: 'Creative roles' },
        { id: '2', name: 'Technical', description: 'Technical roles' },
        { id: '3', name: 'Production', description: 'Production roles' },
        { id: '4', name: 'Talent', description: 'Talent roles' },
        { id: '5', name: 'Management', description: 'Management roles' },
      ]
    };
  }
};

const getRolesWithDescriptions = async (options?: { category?: 'crew' | 'talent' | 'company' | 'guest' | 'custom'; active?: boolean }) => {
  // Same rationale as `getRoles`: skip server call for unsupported "custom" category.
  if (options?.category === 'custom') {
    return { success: true, data: [] };
  }

  try {
    console.log('🔍 Fetching roles with descriptions using API client...', options ? `with options: ${JSON.stringify(options)}` : '');
    const response = await api.getRolesWithDescriptions(options);
    
    if (response.success && response.data) {
      // Convert to our expected format
      // If category filter was used, the roles are already filtered by the API
      const rolesData = response.data.map((role: any, index: number) => ({
        id: (index + 1).toString(),
        name: role.value,
        label: role.label,
        description: role.description,
        category: options?.category || getRoleCategory(role.value)
      }));
      
      console.log('    Roles with descriptions fetched:', rolesData);
      return {
        success: true,
        data: rolesData
      };
    } else {
      throw new Error(response.error || 'Failed to fetch roles with descriptions');
    }
  } catch (err: any) {
    console.error('  Failed to fetch roles with descriptions:', err);
    return getRoles(options); // Fallback to basic roles with same options
  }
};

const createCustomRole = async (data: { label: string; description?: string }) => {
  try {
    console.log('🔧 Creating custom role:', data);
    const response = await api.createCustomRole(data);
    
    if (response.success && response.data) {
      // Invalidate roles cache
      await rateLimiter.clearCacheByPattern('roles');
      return {
        success: true,
        data: response.data
      };
    }
    throw new Error(response.error || 'Failed to create custom role');
  } catch (error: any) {
    console.error('  Failed to create custom role:', error);
    throw error;
  }
};

const getCategoriesWithDescriptions = async () => {
  try {
    console.log('🔍 Fetching categories with descriptions using API client...');
    const response = await api.getCategoriesWithDescriptions();
    
    if (response.success && response.data) {
      // Convert to our expected format
      const categoriesData = response.data.map((category: any, index: number) => ({
        id: (index + 1).toString(),
        name: category.value,
        label: category.label,
        description: category.description
      }));
      
      console.log('    Categories with descriptions fetched:', categoriesData);
      return {
        success: true,
        data: categoriesData
      };
    } else {
      throw new Error(response.error || 'Failed to fetch categories with descriptions');
    }
  } catch (err: any) {
    console.error('  Failed to fetch categories with descriptions:', err);
    return getCategories(); // Fallback to basic categories
  }
};

  return {
    getSkinTones,
    getHairColors,
    getSkills,
    getAbilities,
    getLanguages,
    getServices,
    getRoles,
    getCategories,
    getRolesWithDescriptions,
    createCustomRole,
    getCategoriesWithDescriptions,
    getRoleCategory,
  };
}
