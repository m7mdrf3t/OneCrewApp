import OneCrewApi from 'onecrew-api-client';

interface UseUserFiltersParams {
  api: OneCrewApi;
  getUsersDirect: (params?: any) => Promise<any>;
}

export function useUserFilters({ api, getUsersDirect }: UseUserFiltersParams) {

const getUsersByRole = async (role: string) => {
  try {
    console.log('🔍 Fetching users by role using API client:', role);
    
    // Check if the method exists
    if (typeof api.getUsersByRole !== 'function') {
      console.log('🔍 getUsersByRole method not available, using direct API call...');
      const response = await (api as any).apiClient.get(`/api/users/by-role/${encodeURIComponent(role)}`);
      console.log('    Direct getUsersByRole API call successful:', response);
      return response;
    }
    
    const response = await api.getUsersByRole(role);
    
    if (response.success && response.data) {
      // Handle both array and paginated response
      const users = Array.isArray(response.data) ? response.data : response.data.data || [];
      console.log('    Users by role fetched:', users.length);
      return {
        success: true,
        data: users
      };
    } else {
      throw new Error(response.error || 'Failed to fetch users by role');
    }
  } catch (err: any) {
    console.error('  Failed to fetch users by role:', err);
    // Fallback to getUsersDirect with role filtering
    try {
      const users = await getUsersDirect();
      const filteredUsers = users.filter((user: any) => 
        user.specialty?.toLowerCase().includes(role.toLowerCase()) ||
        user.category?.toLowerCase().includes(role.toLowerCase()) ||
        user.skills?.some((skill: string) => skill.toLowerCase().includes(role.toLowerCase()))
      );
      return { success: true, data: filteredUsers };
    } catch (fallbackErr) {
      console.error('  Fallback also failed:', fallbackErr);
      return { success: false, data: [], error: 'Failed to fetch users' };
    }
  }
};

const getUsersByCategory = async (category: string) => {
  try {
    console.log('🔍 Fetching users by category using API client:', category);
    const response = await api.getUsersByCategory(category);
    
    if (response.success && response.data) {
      // Handle both array and paginated response
      const users = Array.isArray(response.data) ? response.data : response.data.data || [];
      console.log('    Users by category fetched:', users.length);
      return {
        success: true,
        data: users
      };
    } else {
      throw new Error(response.error || 'Failed to fetch users by category');
    }
  } catch (err: any) {
    console.error('  Failed to fetch users by category:', err);
    // Fallback to getUsersDirect with category filtering
    try {
      const users = await getUsersDirect();
      const filteredUsers = users.filter((user: any) => 
        user.category?.toLowerCase().includes(category.toLowerCase())
      );
      return { success: true, data: filteredUsers };
    } catch (fallbackErr) {
      console.error('  Fallback also failed:', fallbackErr);
      return { success: false, data: [], error: 'Failed to fetch users' };
    }
  }
};

const getUsersByLocation = async (location: string) => {
  try {
    console.log('🔍 Fetching users by location using API client:', location);
    const response = await api.getUsersByLocation(location);
    
    if (response.success && response.data) {
      // Handle both array and paginated response
      const users = Array.isArray(response.data) ? response.data : response.data.data || [];
      console.log('    Users by location fetched:', users.length);
      return {
        success: true,
        data: users
      };
    } else {
      throw new Error(response.error || 'Failed to fetch users by location');
    }
  } catch (err: any) {
    console.error('  Failed to fetch users by location:', err);
    // Fallback to getUsersDirect with location filtering
    try {
      const users = await getUsersDirect();
      const filteredUsers = users.filter((user: any) => 
        user.about?.location?.toLowerCase().includes(location.toLowerCase())
      );
      return { success: true, data: filteredUsers };
    } catch (fallbackErr) {
      console.error('  Fallback also failed:', fallbackErr);
      return { success: false, data: [], error: 'Failed to fetch users' };
    }
  }
};

  return {
    getUsersByRole,
    getUsersByCategory,
    getUsersByLocation,
  };
}
