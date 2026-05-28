import OneCrewApi, { User } from 'onecrew-api-client';

interface UseSkillMethodsParams {
  api: OneCrewApi;
  user: User | null;
  setUser: (user: any) => void;
}

export function useSkillMethods({ api, user, setUser }: UseSkillMethodsParams) {

const getAvailableSkillsNew = async () => {
  try {
    console.log('🔄 Fetching available skills using API client...');
    const response = await api.getAvailableSkills();
    console.log('    Available skills fetched:', response.data?.length || 0);
    return response;
  } catch (error) {
    console.error('  Failed to fetch available skills:', error);
    throw error;
  }
};

const getUserSkills = async () => {
  try {
    console.log('🔄 Fetching user skills with rate limiting protection...');
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const response = await api.getUserSkills();
    console.log('    User skills fetched:', response.data?.length || 0);
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch user skills:', error);
    
    // If rate limited, wait and retry once
    if (error.message?.includes('429') || error.status === 429) {
      console.log('   Rate limited, waiting 2 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResponse = await api.getUserSkills();
        console.log('    User skills fetched on retry:', retryResponse.data?.length || 0);
        return retryResponse;
      } catch (retryError) {
        console.error('  Retry also failed:', retryError);
        return { success: true, data: [] };
      }
    }
    
    // Return empty array if there's an error
    return { success: true, data: [] };
  }
};

const getUserSkillsNew = async () => {
  try {
    console.log('🔄 Fetching user skills using API client...');
    const response = await api.getUserSkills();
    console.log('    User skills fetched:', response.data?.length || 0);
    return response;
  } catch (error) {
    console.error('  Failed to fetch user skills:', error);
    // Return empty array if there's an error
    return { success: true, data: [] };
  }
};

const addUserSkillNew = async (skillId: string) => {
  try {
    console.log('🔄 Adding user skill:', skillId);
    const response = await api.addUserSkill(skillId);
    console.log('    User skill added:', response.data);
    
    // Update the current user data - ensure ID is preserved
    if (user) {
      const updatedSkills = [...((user as any).skills || []), skillId];
      const updatedUser = { 
        ...user, 
        id: user.id, // Ensure ID is preserved
        skills: updatedSkills 
      };
      console.log('    Added skill with preserved ID:', updatedUser.id);
      setUser(updatedUser as any);
    }
    
    return response;
  } catch (error) {
    console.error('  Failed to add user skill:', error);
    throw error;
  }
};

const removeUserSkillNew = async (skillId: string) => {
  try {
    console.log('🔄 Removing user skill:', skillId);
    const response = await api.removeUserSkill(skillId);
    console.log('    User skill removed:', response);
    
    // Update the current user data - ensure ID is preserved
    if (user) {
      const updatedSkills = ((user as any).skills || []).filter((skill: any) => skill !== skillId);
      const updatedUser = { 
        ...user, 
        id: user.id, // Ensure ID is preserved
        skills: updatedSkills 
      };
      console.log('    Removed skill with preserved ID:', updatedUser.id);
      setUser(updatedUser as any);
    }
    
    return response;
  } catch (error) {
    console.error('  Failed to remove user skill:', error);
    throw error;
  }
};

  return {
    getAvailableSkillsNew,
    getUserSkills,
    getUserSkillsNew,
    addUserSkillNew,
    removeUserSkillNew,
  };
}
