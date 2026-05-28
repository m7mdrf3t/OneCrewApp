import OneCrewApi, { User } from 'onecrew-api-client';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import performanceMonitor from '../services/PerformanceMonitor';
import { FilterParams } from '../components/FilterModal';

const DEFAULT_BASE_URL = 'https://onecrew-backend-staging-309236356616.us-central1.run.app';

interface UseProfileMethodsParams {
  api: OneCrewApi;
  user: User | null;
  setUser: (user: any) => void;
  getAccessToken: () => string;
  setIsLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  isAuthenticated: boolean;
}

export function useProfileMethods({
  api,
  user,
  setUser,
  getAccessToken,
  setIsLoading,
  setError,
  isAuthenticated,
}: UseProfileMethodsParams) {
  const baseUrl: string = (api as any).baseUrl || DEFAULT_BASE_URL;

const updateProfile = async (profileData: any) => {
  console.log('📝 Updating profile:', profileData);
  console.log('    Current user ID:', user?.id);
  setIsLoading(true);
  setError(null);
  try {
    const userId = user?.id;
    if (!userId) {
      console.error('  User ID not available, current user:', user);
      throw new Error('User ID not available. Please log in again.');
    }

    // Validate profile data before sending
    console.log('🔍 Validating profile data...');
    const validationErrors = validateProfileData(profileData);
    if (validationErrors.length > 0) {
      const errorMessage = `Profile validation failed:\n${validationErrors.join('\n')}`;
      console.error('  Profile validation failed:', validationErrors);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    console.log('    Profile data validation passed');

    // Skip the API client method since it's using the wrong endpoint
    // and go directly to the correct endpoints
    console.log('🔄 Using direct fetch with correct endpoints...');
    
    // Get the access token
    const accessToken = getAccessToken();

    // Separate basic profile data from talent-specific data
    // Note: social_links are handled separately via dedicated endpoints
    const basicProfileData: any = {
      bio: profileData.bio,
      // Only include specialty if it has a value (it's optional)
      ...(profileData.specialty && profileData.specialty.trim() ? { specialty: profileData.specialty.trim() } : {}),
      // Only include location_text if it has a value (it's optional)
      ...(profileData.location_text && profileData.location_text.trim() ? { location_text: profileData.location_text.trim() } : {}),
    };
    
    // Add image_url only if it has a valid value (don't send empty strings)
    const imageUrl = profileData.imageUrl;
    if (imageUrl && imageUrl.trim && imageUrl.trim() !== '') {
      basicProfileData.image_url = imageUrl.trim();
      console.log('📸 Including image_url in profile update');
    } else {
      console.log('📸 No image_url to include in profile update (empty or not provided)');
    }
    
    // Add cover_images only if they exist (don't send null/undefined)
    const coverImages = profileData.coverImages || profileData.cover_images;
    if (coverImages && Array.isArray(coverImages) && coverImages.length > 0) {
      basicProfileData.cover_images = coverImages;
      console.log('📸 Including cover images in profile update:', coverImages.length, 'images');
    } else {
      console.log('📸 No cover images to include in profile update');
    }

    // Clean and prepare talent profile data (excluding age, nationality, gender - these go to UserDetails)
    const talentProfileData = {
      height_cm: profileData.about?.height ? Number(profileData.about.height) : null,
      weight_kg: profileData.about?.weight ? Number(profileData.about.weight) : null,
      eye_color: profileData.about?.eyeColor || null,
      skin_tone: profileData.about?.skinTone || null,
      hair_color: profileData.about?.hairColor || null,
      location: profileData.about?.location || null,
      chest_cm: profileData.about?.chestCm ? Number(profileData.about.chestCm) : null,
      waist_cm: profileData.about?.waistCm ? Number(profileData.about.waistCm) : null,
      hips_cm: profileData.about?.hipsCm ? Number(profileData.about.hipsCm) : null,
      shoe_size_eu: profileData.about?.shoeSizeEu ? Number(profileData.about.shoeSizeEu) : null,
      reel_url: profileData.about?.reelUrl || null,
      union_member: Boolean(profileData.about?.unionMember),
      willing_to_travel: Boolean(profileData.about?.willingToTravel),
      dialects: Array.isArray(profileData.about?.dialects) ? profileData.about.dialects : [],
    };

    // Remove null/undefined values to avoid sending empty fields
    const cleanedTalentData = Object.fromEntries(
      Object.entries(talentProfileData).filter(([_, value]) => {
        // Keep boolean false values and empty arrays, but remove null/undefined/empty strings
        if (typeof value === 'boolean') return true;
        if (Array.isArray(value)) return true;
        return value !== null && value !== undefined && value !== '';
      })
    );

    console.log('🎭 Raw talent profile data:', JSON.stringify(talentProfileData, null, 2));
    console.log('🎭 Cleaned talent profile data:', JSON.stringify(cleanedTalentData, null, 2));

    const skillsData = {
      skills: profileData.skills || [],
    };

    // Update basic profile info using direct API call
    const basicResponse = await fetch(`${baseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(basicProfileData),
    });

    const basicResult = await basicResponse.json();
    
    console.log('📤 Profile update request sent to:', `PUT /api/users/${userId}`);
    console.log('📥 Profile update response status:', basicResponse.status);
    
    if (!basicResponse.ok) {
      console.error('  Basic profile update failed:', basicResult);
      if (basicResult.errors) {
        console.error('  Validation errors:', basicResult.errors);
        throw new Error(`Profile validation failed: ${Object.values(basicResult.errors).join(', ')}`);
      }
      throw new Error(basicResult.error || 'Failed to update basic profile');
    }

    console.log('    Basic profile updated successfully:', basicResult);

    // Only update talent profile if user is a talent AND there's meaningful data to send
    let talentResult = { data: {} };
    const userCategory = user?.category as string | undefined;
    const isTalent = userCategory?.toLowerCase() === 'talent';
    
    if (isTalent && Object.keys(cleanedTalentData).length > 0) {
      console.log('🎭 Updating talent profile with data:', cleanedTalentData);
      console.log('    User category is talent, proceeding with talent profile update');
      
      const talentResponse = await fetch(`${baseUrl}/api/talent/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(cleanedTalentData),
      });

      talentResult = await talentResponse.json();
      
      console.log('🎭 Talent profile response status:', talentResponse.status);
      console.log('🎭 Talent profile response:', JSON.stringify(talentResult, null, 2));
      
      if (!talentResponse.ok) {
        console.error('Talent profile update failed:', talentResult);
        if ((talentResult as any).errors) {
          console.error('Talent profile validation errors:', (talentResult as any).errors);
          // Show specific validation errors to user
          const errorMessages = Object.entries((talentResult as any).errors).map(([field, message]) => 
            `${field}: ${message}`
          ).join(', ');
          console.warn(`   Talent profile validation failed: ${errorMessages}`);
        }
        // Don't throw error, just log warning and continue
        console.warn('   Continuing without talent profile update');
      } else {
        console.log('    Talent profile updated successfully:', talentResult);
      }
    } else {
      if (!isTalent) {
        console.log('⏭️ Skipping talent profile update - user is not a talent (category: ' + (user?.category || 'unknown') + ')');
      } else {
        console.log('⏭️ Skipping talent profile update - no meaningful data to send');
      }
    }

    // Update skills using the correct API client methods
    // Always update skills, even if the array is empty (to clear all skills)
    try {
      console.log('🎯 Updating skills using API client methods...');
      console.log('🔍 Skills data to process:', skillsData.skills);
      
      // Get current user skills to see what needs to be removed
      let currentSkills: any[] = [];
      try {
        const currentSkillsResponse = await api.getUserSkills();
        currentSkills = currentSkillsResponse.data || [];
        console.log('🔍 Current user skills:', currentSkills);
      } catch (getSkillsError: any) {
        console.warn('   Failed to get current skills, assuming empty:', getSkillsError.message);
        currentSkills = [];
      }
      
      // Get available skills to find IDs
      const availableSkillsResponse = await api.getAvailableSkills();
      const availableSkills = availableSkillsResponse.data || [];
      console.log('🔍 Available skills count:', availableSkills.length);
      
      // Find skill IDs for the provided skill names
      // Skills can be either names or IDs - check both
      const skillIdsToAdd = (skillsData.skills || [])
          .map((skillInput: string) => {
            if (!skillInput || typeof skillInput !== 'string') {
              return null;
            }
            
            // Normalize input: trim and lowercase
            const normalizedInput = skillInput.trim().toLowerCase();
            
            // First check if it's already an ID
            const skillById = availableSkills.find((s: { id: string; name?: string }) => s.id === skillInput || s.id === normalizedInput);
            if (skillById) {
              return skillById.id;
            }
            
            // Then check if it's a name (with flexible matching)
            const skillByName = availableSkills.find((s: { id: string; name?: string }) => {
              if (!s.name) return false;
              const normalizedSkillName = s.name.trim().toLowerCase();
              // Exact match
              if (normalizedSkillName === normalizedInput) return true;
              // Also check if skill name contains the input or vice versa (for partial matches)
              return normalizedSkillName.includes(normalizedInput) || normalizedInput.includes(normalizedSkillName);
            });
            return skillByName?.id;
          })
          .filter(Boolean);
        
      console.log('🔍 Skill inputs:', skillsData.skills);
      console.log('🔍 Available skills sample:', availableSkills.slice(0, 3));
      console.log('🔍 Skill IDs to add:', skillIdsToAdd);
      
      // Get current skill IDs to remove ones not in the new list
      const currentSkillIds = currentSkills.map((skill: any) => 
        skill.skill_id || skill.id || skill.skill?.id
      ).filter(Boolean);
      
      const skillIdsToRemove = currentSkillIds.filter((skillId: string) => 
        !skillIdsToAdd.includes(skillId)
      );
      
      console.log('🔍 Current skill IDs:', currentSkillIds);
      console.log('🔍 Skill IDs to remove:', skillIdsToRemove);
      
      // Remove skills that are no longer selected
      const removePromises = skillIdsToRemove.map(skillId => 
        api.removeUserSkill(skillId).catch((err: unknown) => {
          console.warn(`   Failed to remove skill ${skillId}:`, err);
          return null;
        })
      );
      
      // Add new skills (only add ones not already present)
      const skillsToActuallyAdd = skillIdsToAdd.filter((skillId: string) => 
        !currentSkillIds.includes(skillId)
      );
      
      const addPromises = skillsToActuallyAdd.map((skillId: string) => 
        api.addUserSkill(skillId as string).catch((err: unknown) => {
          console.warn(`   Failed to add skill ${skillId}:`, err);
          return null;
        })
      );
      
      // Execute all operations
      const removeResults = await Promise.all(removePromises);
      const addResults = await Promise.all(addPromises);
      
      const successfulRemoves = removeResults.filter(Boolean);
      const successfulAdds = addResults.filter(Boolean);
      
      console.log('    Skills updated successfully:', {
        removed: successfulRemoves.length,
        added: successfulAdds.length,
        totalRequested: skillsData.skills.length,
        totalFound: skillIdsToAdd.length,
        alreadyExists: skillIdsToAdd.length - skillsToActuallyAdd.length
      });
      
      if (skillIdsToAdd.length === 0 && skillsData.skills.length > 0) {
        console.warn('   Warning: No skill IDs were found for the provided skill names. Available skills might not match.');
        console.warn('   Provided skills:', skillsData.skills);
        console.warn('   Available skill names (first 10):', availableSkills.slice(0, 10).map((s: { id: string; name?: string }) => s.name));
      }
    } catch (skillsError: any) {
      console.error('  Skills update failed:', skillsError);
      console.error('  Error details:', JSON.stringify(skillsError, null, 2));
      // Don't throw - allow profile update to continue
      console.warn('   Continuing without skills update - profile may not have skills saved');
    }

    // Update the current user data - ensure ID is preserved
    if (user) {
      const updatedUser = { 
        ...user, 
        id: user.id, // Ensure ID is preserved
        ...basicResult.data,
        coverImages: profileData.coverImages || profileData.cover_images || basicResult.data?.cover_images || basicResult.data?.coverImages || [],
        skills: profileData.skills || [],
        about: {
          ...(user as any).about,
          ...talentResult.data
        }
      };
      console.log('    Updated user data with preserved ID:', updatedUser.id);
      setUser(updatedUser as any);
    }
    
    return { 
      success: true, 
      data: { 
        ...basicResult.data, 
        ...talentResult.data, 
        coverImages: profileData.coverImages || profileData.cover_images || basicResult.data?.cover_images || basicResult.data?.coverImages || [],
        skills: profileData.skills || [] 
      } 
    };
  } catch (err: any) {
    console.error('  Profile update failed:', err);
    setError(err.message || 'Failed to update profile');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

const updateSkills = async (skills: string[]) => {
  console.log('🎯 Updating skills:', skills);
  console.log('    Current user ID:', user?.id);
  setIsLoading(true);
  setError(null);
  try {
    const userId = user?.id;
    if (!userId) {
      console.error('  User ID not available, current user:', user);
      throw new Error('User ID not available. Please log in again.');
    }

    // Use the correct API client methods
    try {
      console.log('🔄 Using API client methods...');
      
      // Get current user skills
      const currentSkillsResponse = await api.getUserSkills();
      const currentSkills = currentSkillsResponse.data || [];
      console.log('🔍 Current user skills:', currentSkills);
      
      // Get available skills to find IDs
      const availableSkillsResponse = await api.getAvailableSkills();
      const availableSkills = availableSkillsResponse.data || [];
      console.log('🔍 Available skills:', availableSkills);
      
      // Find skill IDs for the provided skill names
      const skillIdsToAdd = skills
        .map(skillName => {
          const skill = availableSkills.find((s: { id: string; name?: string }) => s.name?.toLowerCase() === skillName.toLowerCase());
          return skill?.id;
        })
        .filter(Boolean);
      
      console.log('🔍 Skill IDs to add:', skillIdsToAdd);
      
      // Add each skill individually
      const addPromises = skillIdsToAdd.map(skillId => 
        api.addUserSkill(skillId as string).catch((err: unknown) => {
          console.warn(`   Failed to add skill ${skillId}:`, err);
          return null;
        })
      );
      
      const results = await Promise.all(addPromises);
      const successfulAdds = results.filter(Boolean);
      
      console.log('    Skills added successfully:', successfulAdds.length);
      
      // Update the current user data
      if (user) {
        setUser({ ...user, skills: skills } as any);
      }
      
      return { success: true, data: { skills } };
    } catch (apiError: any) {
      console.log('   New skill methods failed, trying direct fetch:', apiError.message);
      
      // Fallback to direct fetch call
      const accessToken = getAccessToken();

      const skillsData = { skills };

      const response = await fetch(`${baseUrl}/api/users/${userId}/skills`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(skillsData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update skills');
      }

      console.log('    Skills updated successfully:', result);

      // Update the current user data - ensure ID is preserved
      if (user) {
        const updatedUser = { 
          ...user, 
          id: user.id, // Ensure ID is preserved
          skills: result.data?.skills || skills 
        };
        console.log('    Updated user skills with preserved ID:', updatedUser.id);
        setUser(updatedUser as any);
      }
      
      return result;
    }
  } catch (err: any) {
    console.error('  Skills update failed:', err);
    setError(err.message || 'Failed to update skills');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

const getProfileCompleteness = async (userId: string) => {
  console.log('📊 Getting profile completeness for user:', userId);
  setIsLoading(true);
  setError(null);
  try {
    // For now, return a mock response since the API method doesn't exist
    // In a real implementation, this would call the appropriate API endpoint
    const mockResponse = {
      success: true,
      data: {
        completeness: 75,
        missingFields: ['bio', 'specialty']
      }
    };
    console.log('    Profile completeness retrieved:', mockResponse);
    return mockResponse;
  } catch (err: any) {
    console.error('  Failed to get profile completeness:', err);
    setError(err.message || 'Failed to get profile completeness');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

const validateProfileData = (profileData: any) => {
  const errors: string[] = [];
  
  // Check required fields for basic profile
  if (!profileData.bio || profileData.bio.trim() === '') {
    errors.push('Bio is required');
  }
  
  // Note: specialty is now optional, no validation needed
  
  // Check talent-specific fields if user is talent
  if (profileData.about) {
    const about = profileData.about;
    
    // Check height if provided
    if (about.height && (isNaN(Number(about.height)) || Number(about.height) < 100 || Number(about.height) > 250)) {
      errors.push('Height must be between 100-250 cm');
    }
    
    // Check weight if provided
    if (about.weight && (isNaN(Number(about.weight)) || Number(about.weight) < 30 || Number(about.weight) > 300)) {
      errors.push('Weight must be between 30-300 kg');
    }
    
    // Check chest measurements if provided
    if (about.chestCm && (isNaN(Number(about.chestCm)) || Number(about.chestCm) < 50 || Number(about.chestCm) > 200)) {
      errors.push('Chest measurement must be between 50-200 cm');
    }
    
    // Check waist measurements if provided
    if (about.waistCm && (isNaN(Number(about.waistCm)) || Number(about.waistCm) < 40 || Number(about.waistCm) > 150)) {
      errors.push('Waist measurement must be between 40-150 cm');
    }
    
    // Check hips measurements if provided
    if (about.hipsCm && (isNaN(Number(about.hipsCm)) || Number(about.hipsCm) < 50 || Number(about.hipsCm) > 200)) {
      errors.push('Hips measurement must be between 50-200 cm');
    }
    
    // Check shoe size if provided
    if (about.shoeSizeEu && (isNaN(Number(about.shoeSizeEu)) || Number(about.shoeSizeEu) < 20 || Number(about.shoeSizeEu) > 60)) {
      errors.push('Shoe size must be between 20-60 EU');
    }
    
    // Check reel URL format if provided
    if (about.reelUrl && about.reelUrl.trim() !== '') {
      try {
        new URL(about.reelUrl);
      } catch {
        errors.push('Reel URL must be a valid URL');
      }
    }
  }
  
  return errors;
};

const fetchCompleteUserProfile = async (userId: string, userData?: any) => {
  const cacheKey = `complete-user-profile-${userId}`;
  return performanceMonitor.trackApiCall(
    'Fetch Complete User Profile',
    `${baseUrl}/api/users/${userId}`,
    'GET',
    () => rateLimiter.execute(cacheKey, async () => {
    try {
      console.log('    Fetching complete user profile for:', userId);
      const accessToken = getAccessToken();
      
      // First, fetch the user's basic info from users list
      let userBasicInfo = userData || null;
      if (!userBasicInfo || userBasicInfo.id !== userId) {
        // Fetch from users endpoint - search for this specific user
        try {
          const usersResponse = await fetch(`${baseUrl}/api/users?limit=1000`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const users = Array.isArray(usersData.data) ? usersData.data : (usersData.data?.data || []);
            userBasicInfo = users.find((u: any) => u.id === userId);
          } else if (usersResponse.status === 429) {
            console.warn('   Rate limited on fetchCompleteUserProfile (users list)');
            return userData || null;
          }
        } catch (err) {
          console.warn('   Failed to fetch user from users list:', err);
        }
      }
      
      // If still not found, return null
      if (!userBasicInfo || userBasicInfo.id !== userId) {
        console.warn(`   User ${userId} not found in users list`);
        return null;
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user details (about section)
      const userDetailsResponse = await fetch(`${baseUrl}/api/user-details/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      let userDetails = null;
      if (userDetailsResponse.ok) {
        const detailsData = await userDetailsResponse.json();
        userDetails = detailsData.data || detailsData;
      } else if (userDetailsResponse.status === 429) {
        console.warn('   Rate limited on fetchCompleteUserProfile (user details)');
      }

      // Add delay before next request
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch talent profile if user is talent
      let talentProfile = null;
      if (userBasicInfo?.category === 'talent') {
        try {
          const talentResponse = await fetch(`${baseUrl}/api/talent/profile?user_id=${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (talentResponse.ok) {
            const talentData = await talentResponse.json();
            talentProfile = talentData.data || talentData;
          } else if (talentResponse.status === 429) {
            console.warn('   Rate limited on fetchCompleteUserProfile (talent profile)');
          }
        } catch (err) {
          console.warn('   Failed to fetch talent profile:', err);
        }
      }

      // Combine user data with details and talent profile
      const completeUser = {
        ...userBasicInfo,
        id: userId, // Ensure ID matches the requested user
        about: userDetails || {},
        ...(talentProfile && { talentProfile })
      };

      return completeUser;
    } catch (err: any) {
      console.error('  Failed to fetch complete user profile:', err);
      // Return existing userData if available, otherwise null
      return userData || null;
    }
  }, { ttl: CacheTTL.MEDIUM, persistent: true })
  );
};

// Direct fetch method for getting users — accepts all FilterParams for comprehensive filtering
const getUsersDirect = async (params: FilterParams & {
  limit?: number; 
  page?: number;
} = {}) => {
  const cacheKey = `users-direct-${JSON.stringify(params)}`;
  return performanceMonitor.trackApiCall(
    'Get Users Direct',
    `${baseUrl}/api/users`,
    'GET',
    () => rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('👥 Fetching users with direct fetch...', params);
      
      // Debug: Check if user is authenticated
      console.log('🔍 Auth state check:', {
        isAuthenticated: (api as any).auth?.isAuthenticated?.(),
        hasToken: !!(api as any).auth?.getAuthToken?.(),
        hasUser: !!(api as any).auth?.getCurrentUser?.()
      });
      
      const accessToken = getAccessToken();
      
      const queryParams = new URLSearchParams();
      
      // Pagination params
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.page) queryParams.append('page', params.page.toString());
      
      // Basic filters
      if (params.search) queryParams.append('q', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.role) queryParams.append('role', params.role);
      if (params.location) queryParams.append('location', params.location);
      
      // Physical Attributes
      if (params.height !== undefined) queryParams.append('height', params.height.toString());
      if (params.height_min !== undefined) queryParams.append('height_min', params.height_min.toString());
      if (params.height_max !== undefined) queryParams.append('height_max', params.height_max.toString());
      if (params.weight !== undefined) queryParams.append('weight', params.weight.toString());
      if (params.weight_min !== undefined) queryParams.append('weight_min', params.weight_min.toString());
      if (params.weight_max !== undefined) queryParams.append('weight_max', params.weight_max.toString());
      if (params.age !== undefined) queryParams.append('age', params.age.toString());
      if (params.age_min !== undefined) queryParams.append('age_min', params.age_min.toString());
      if (params.age_max !== undefined) queryParams.append('age_max', params.age_max.toString());
      
      // Body Measurements
      if (params.chest_min !== undefined) queryParams.append('chest_min', params.chest_min.toString());
      if (params.chest_max !== undefined) queryParams.append('chest_max', params.chest_max.toString());
      if (params.waist_min !== undefined) queryParams.append('waist_min', params.waist_min.toString());
      if (params.waist_max !== undefined) queryParams.append('waist_max', params.waist_max.toString());
      if (params.hips_min !== undefined) queryParams.append('hips_min', params.hips_min.toString());
      if (params.hips_max !== undefined) queryParams.append('hips_max', params.hips_max.toString());
      if (params.shoe_size_min !== undefined) queryParams.append('shoe_size_min', params.shoe_size_min.toString());
      if (params.shoe_size_max !== undefined) queryParams.append('shoe_size_max', params.shoe_size_max.toString());
      
      // Appearance
      if (params.skin_tone) queryParams.append('skin_tone', params.skin_tone);
      if (params.hair_color) queryParams.append('hair_color', params.hair_color);
      if (params.eye_color) queryParams.append('eye_color', params.eye_color);
      
      // Personal Details
      if (params.gender) queryParams.append('gender', params.gender);
      if (params.nationality) queryParams.append('nationality', params.nationality);
      
      // Professional Preferences
      if (params.union_member !== undefined) queryParams.append('union_member', params.union_member.toString());
      if (params.willing_to_travel !== undefined) queryParams.append('willing_to_travel', params.willing_to_travel.toString());
      if (params.travel_ready !== undefined) queryParams.append('travel_ready', params.travel_ready.toString());
      
      // Additional filters
      if (params.accent) queryParams.append('accent', params.accent);
      if (params.skills && params.skills.length > 0) {
        params.skills.forEach(skill => queryParams.append('skills[]', skill));
      }
      if (params.languages && params.languages.length > 0) {
        params.languages.forEach(lang => queryParams.append('languages[]', lang));
      }
      
      const url = `${baseUrl}/api/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('🌐 Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          console.warn('   Rate limited on getUsersDirect');
          throw new Error('Rate limited. Please try again later.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('    Users fetched successfully:', result);
      return result;
    } catch (err: any) {
      console.error('  Failed to fetch users:', err);
      // If rate limited, return empty result
      if (err.message?.includes('429') || err.message?.includes('Rate limited')) {
        console.warn('   Rate limited on getUsersDirect, returning empty result');
        return { success: true, data: [] };
      }
      throw err;
    }
  }, { ttl: CacheTTL.SHORT }) // Users list changes frequently - 30s TTL for fresh data
  );
};

const debugAuthState = () => {
  console.log('🔍 Debug Auth State:');
  console.log('  - Context isAuthenticated:', isAuthenticated);
  console.log('  - Context user:', user ? `${user.name} (${user.email})` : 'null');
  console.log('  - API auth.isAuthenticated():', (api as any).auth?.isAuthenticated?.());
  console.log('  - API auth.getAuthToken():', (api as any).auth?.getAuthToken?.() ? 'exists' : 'null');
  console.log('  - API auth.getCurrentUser():', (api as any).auth?.getCurrentUser?.() ? 'exists' : 'null');
  console.log('  - API client headers:', (api as any).apiClient?.defaultHeaders);
  return {
    contextAuthenticated: isAuthenticated,
    contextUser: user,
    apiAuthenticated: (api as any).auth?.isAuthenticated?.(),
    hasToken: !!(api as any).auth?.getAuthToken?.(),
    hasUser: !!(api as any).auth?.getCurrentUser?.()
  };
};

const clearError = () => {
  setError(null);
};

const getProfileRequirements = () => {
  return {
    basic: {
      required: ['bio'],
      bio: {
        required: true,
        minLength: 10,
        description: 'A brief description about yourself'
      },
      specialty: {
        required: false,
        description: 'Your main area of expertise'
      }
    },
    talent: {
      measurements: {
        height: {
          required: false,
          min: 100,
          max: 250,
          unit: 'cm',
          description: 'Height in centimeters (100-250 cm)'
        },
        weight: {
          required: false,
          min: 30,
          max: 300,
          unit: 'kg',
          description: 'Weight in kilograms (30-300 kg)'
        },
        chest: {
          required: false,
          min: 50,
          max: 200,
          unit: 'cm',
          description: 'Chest measurement in centimeters (50-200 cm)'
        },
        waist: {
          required: false,
          min: 40,
          max: 150,
          unit: 'cm',
          description: 'Waist measurement in centimeters (40-150 cm)'
        },
        hips: {
          required: false,
          min: 50,
          max: 200,
          unit: 'cm',
          description: 'Hips measurement in centimeters (50-200 cm)'
        },
        shoeSize: {
          required: false,
          min: 20,
          max: 60,
          unit: 'EU',
          description: 'Shoe size in EU sizing (20-60 EU)'
        }
      },
      appearance: {
        eyeColor: {
          required: false,
          description: 'Your eye color'
        },
        hairColor: {
          required: false,
          description: 'Your hair color'
        },
        skinTone: {
          required: false,
          description: 'Your skin tone'
        }
      },
      other: {
        reelUrl: {
          required: false,
          format: 'URL',
          description: 'Link to your demo reel or portfolio'
        },
        unionMember: {
          required: false,
          type: 'boolean',
          description: 'Are you a union member?'
        },
        willingToTravel: {
          required: false,
          type: 'boolean',
          description: 'Are you willing to travel for work?'
        }
      }
    }
  };
};

  return {
    updateProfile,
    updateSkills,
    getProfileCompleteness,
    fetchCompleteUserProfile,
    getUsersDirect,
    debugAuthState,
    clearError,
    getProfileRequirements,
    validateProfileData,
  };
}
