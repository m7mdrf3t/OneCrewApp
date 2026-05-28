import OneCrewApi from 'onecrew-api-client';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';

interface UseTeamMethodsParams {
  api: OneCrewApi;
}

export function useTeamMethods({ api }: UseTeamMethodsParams) {

const getMyTeam = async () => {
  try {
    console.log('🔍 Fetching user personal team...');
    const response = await api.getMyTeam();
    
    if (response.success && response.data) {
      console.log('    Personal team fetched:', response.data);
      return {
        success: true,
        data: response.data
      };
    } else {
      throw new Error(response.error || 'Failed to fetch personal team');
    }
  } catch (err: any) {
    console.error('  Failed to fetch personal team:', err);
    return { success: false, data: null, error: 'Failed to fetch personal team' };
  }
};

const addToMyTeam = async (userId: string, role?: string) => {
  try {
    console.log('🔍 Adding user to personal team:', userId, role);
    const response = await api.addToMyTeam(userId, role);
    
    if (response.success && response.data) {
      console.log('    User added to personal team:', response.data);
      // Clear cache to force fresh data on next fetch
      await rateLimiter.clearCache('my-team-members');
      return {
        success: true,
        data: response.data
      };
    } else {
      throw new Error(response.error || 'Failed to add user to personal team');
    }
  } catch (err: any) {
    console.error('  Failed to add user to personal team:', err);
    return { success: false, data: null, error: 'Failed to add user to personal team' };
  }
};

const removeFromMyTeam = async (userId: string) => {
  try {
    console.log('🔍 Removing user from personal team:', userId);
    const response = await api.removeFromMyTeam(userId);
    
    if (response.success) {
      console.log('    User removed from personal team');
      // Clear cache to force fresh data on next fetch
      await rateLimiter.clearCache('my-team-members');
      return {
        success: true,
        data: null
      };
    } else {
      throw new Error(response.error || 'Failed to remove user from personal team');
    }
  } catch (err: any) {
    console.error('  Failed to remove user from personal team:', err);
    return { success: false, data: null, error: 'Failed to remove user from personal team' };
  }
};

const getMyTeamMembers = async () => {
  const cacheKey = 'my-team-members';
  return rateLimiter.execute(cacheKey, async () => {
    try {
      console.log('🔍 Fetching personal team members...');
      const response = await api.getMyTeamMembers();
      
      if (response.success && response.data) {
        console.log('    Personal team members fetched:', response.data.length);
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to fetch personal team members');
      }
    } catch (err: any) {
      // Handle rate limiting gracefully
      if (err.status === 429 || err.statusCode === 429 || err.message?.includes('429')) {
        console.warn('   Rate limited on getMyTeamMembers, returning empty result');
        return { success: true, data: [] };
      }
      console.error('  Failed to fetch personal team members:', err);
      return { success: false, data: [], error: 'Failed to fetch personal team members' };
    }
  }, { ttl: CacheTTL.MEDIUM, persistent: true }); // Team members change when users join/leave - 5min TTL with persistence
};

const getTeams = async (params?: { page?: number; limit?: number; search?: string }) => {
  try {
    const response = await api.getTeams(params);
    return response;
  } catch (error) {
    console.error('Failed to get teams:', error);
    throw error;
  }
};

const getTeamById = async (teamId: string) => {
  try {
    const response = await api.getTeamById(teamId);
    return response;
  } catch (error) {
    console.error('Failed to get team:', error);
    throw error;
  }
};

const createTeam = async (teamData: any) => {
  try {
    const response = await api.createTeam(teamData);
    return response;
  } catch (error) {
    console.error('Failed to create team:', error);
    throw error;
  }
};

const updateTeam = async (teamId: string, updates: any) => {
  try {
    const response = await api.updateTeam(teamId, updates);
    return response;
  } catch (error) {
    console.error('Failed to update team:', error);
    throw error;
  }
};

const deleteTeam = async (teamId: string) => {
  try {
    const response = await api.deleteTeam(teamId);
    return response;
  } catch (error) {
    console.error('Failed to delete team:', error);
    throw error;
  }
};

const joinTeam = async (teamData: { team_id: string; role?: string }) => {
  try {
    const response = await api.joinTeam(teamData);
    return response;
  } catch (error) {
    console.error('Failed to join team:', error);
    throw error;
  }
};

const leaveTeam = async (teamId: string) => {
  try {
    const response = await api.leaveTeam(teamId);
    return response;
  } catch (error) {
    console.error('Failed to leave team:', error);
    throw error;
  }
};

const addTeamMember = async (teamId: string, memberData: { user_id: string; role?: string }) => {
  try {
    const response = await api.addTeamMember(teamId, memberData);
    return response;
  } catch (error) {
    console.error('Failed to add team member:', error);
    throw error;
  }
};

const getTeamMembers = async (teamId: string) => {
  try {
    const response = await api.getTeamMembers(teamId);
    return response;
  } catch (error) {
    console.error('Failed to get team members:', error);
    throw error;
  }
};

  return {
    getMyTeam,
    addToMyTeam,
    removeFromMyTeam,
    getMyTeamMembers,
    getTeams,
    getTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
    joinTeam,
    leaveTeam,
    addTeamMember,
    getTeamMembers,
  };
}
