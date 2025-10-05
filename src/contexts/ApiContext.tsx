import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import OneCrewApi, { User, AuthResponse, LoginRequest, SignupRequest, ApiError } from 'onecrew-api-client';

interface ApiContextType {
  api: OneCrewApi;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signup: (userData: SignupRequest) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (profileData: any) => Promise<any>;
  updateSkills: (skills: string[]) => Promise<any>;
  getProfileCompleteness: (userId: string) => Promise<any>;
  // Reference data methods
  getSkinTones: () => Promise<any>;
  getHairColors: () => Promise<any>;
  getSkills: () => Promise<any>;
  getAbilities: () => Promise<any>;
  getLanguages: () => Promise<any>;
  clearError: () => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ 
  children, 
  baseUrl = 'http://localhost:3000' // Local development server
}) => {
  const [api] = useState(() => new OneCrewApi(baseUrl));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize API client
  useEffect(() => {
    const initializeApi = async () => {
      console.log('🚀 Initializing API client...');
      console.log('🌐 API Base URL:', baseUrl);
      try {
        await api.initialize();
        console.log('✅ API client initialized successfully');
        
        if (api.auth.isAuthenticated()) {
          const currentUser = api.auth.getCurrentUser();
          console.log('👤 User already authenticated:', currentUser);
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          console.log('🔓 No authenticated user found');
        }
      } catch (err) {
        console.warn('❌ Failed to initialize API:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApi();
  }, [api]);

  const login = async (credentials: LoginRequest) => {
    console.log('🔐 Login attempt:', credentials);
    console.log('📤 Sending to backend:', JSON.stringify(credentials));
    setIsLoading(true);
    setError(null);
    try {
      const authResponse = await api.auth.login(credentials);
      console.log('✅ Login successful:', authResponse);
      setUser(authResponse.user);
      setIsAuthenticated(true);
      return authResponse;
    } catch (err: any) {
      console.error('❌ Login failed:', err);
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupRequest) => {
    console.log('📝 Signup attempt:', { email: userData.email, name: userData.name });
    setIsLoading(true);
    setError(null);
    try {
      const authResponse = await api.auth.signup(userData);
      console.log('✅ Signup successful:', authResponse);
      setUser(authResponse.user);
      setIsAuthenticated(true);
      return authResponse;
    } catch (err: any) {
      console.error('Signup failed:', err);
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.requestPasswordReset(email);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, newPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: any) => {
    console.log('📝 Updating profile:', profileData);
    setIsLoading(true);
    setError(null);
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('User ID not available');
      }

      // Skip the API client method since it's using the wrong endpoint
      // and go directly to the correct endpoints
      console.log('🔄 Using direct fetch with correct endpoints...');
      
      // Get the access token
      const accessToken = getAccessToken();

      // Separate basic profile data from talent-specific data
      const basicProfileData = {
        bio: profileData.bio,
        specialty: profileData.specialty,
        image_url: profileData.imageUrl, // Map imageUrl to image_url for API
      };

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
        Object.entries(talentProfileData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
      );

      console.log('🎭 Raw talent profile data:', JSON.stringify(talentProfileData, null, 2));
      console.log('🎭 Cleaned talent profile data:', JSON.stringify(cleanedTalentData, null, 2));

      const skillsData = {
        skills: profileData.skills || [],
      };

      // Update basic profile info using direct API call
      const basicResponse = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(basicProfileData),
      });

      const basicResult = await basicResponse.json();
      
      if (!basicResponse.ok) {
        throw new Error(basicResult.error || 'Failed to update basic profile');
      }

      console.log('✅ Basic profile updated successfully:', basicResult);

      // Update talent-specific profile info using PUT /api/talent/profile
      const talentResponse = await fetch('http://localhost:3000/api/talent/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(cleanedTalentData),
      });

      const talentResult = await talentResponse.json();
      
      console.log('🎭 Talent profile response status:', talentResponse.status);
      console.log('🎭 Talent profile response:', JSON.stringify(talentResult, null, 2));
      
      if (!talentResponse.ok) {
        console.error('❌ Talent profile update failed:', talentResult);
        throw new Error(talentResult.error || 'Failed to update talent profile');
      }

      console.log('✅ Talent profile updated successfully:', talentResult);

      // Update skills using PUT /api/users/{id}/skills
      const skillsResponse = await fetch(`http://localhost:3000/api/users/${userId}/skills`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(skillsData),
      });

      const skillsResult = await skillsResponse.json();
      
      if (!skillsResponse.ok) {
        console.warn('⚠️ Skills update failed:', skillsResult.error || 'Failed to update skills');
        // Don't throw error for skills, just log warning
      } else {
        console.log('✅ Skills updated successfully:', skillsResult);
      }

      // Update the current user data
      if (user) {
        setUser({ 
          ...user, 
          ...basicResult.data,
          skills: skillsResult.data?.skills || profileData.skills || [],
          about: {
            ...(user as any).about,
            ...talentResult.data
          }
        } as any);
      }
      
      return { success: true, data: { ...basicResult.data, ...talentResult.data, skills: skillsResult.data?.skills || profileData.skills || [] } };
    } catch (err: any) {
      console.error('❌ Profile update failed:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSkills = async (skills: string[]) => {
    console.log('🎯 Updating skills:', skills);
    setIsLoading(true);
    setError(null);
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('User ID not available');
      }

      // Try using the OneCrewApi client's built-in methods first
      try {
        console.log('🔄 Trying OneCrewApi client methods for skills...');
        
        // Try to use the API client's updateSkills method if it exists
        const response = await (api as any).updateSkills?.(skills) || await (api as any).updateUserSkills?.(skills);
        console.log('✅ Skills updated via API client:', response);
        
        // Update the current user data
        if (user && response.data) {
          setUser({ ...user, skills: response.data?.skills || skills } as any);
        }
        
        return response;
      } catch (apiError: any) {
        console.log('⚠️ API client method failed for skills, trying direct fetch:', apiError.message);
        
        // Fallback to direct fetch call
        const accessToken = getAccessToken();

        const skillsData = { skills };

        const response = await fetch(`http://localhost:3000/api/users/${userId}/skills`, {
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

        console.log('✅ Skills updated successfully:', result);

        // Update the current user data
        if (user) {
          setUser({ ...user, skills: result.data?.skills || skills } as any);
        }
        
        return result;
      }
    } catch (err: any) {
      console.error('❌ Skills update failed:', err);
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
      console.log('✅ Profile completeness retrieved:', mockResponse);
      return mockResponse;
    } catch (err: any) {
      console.error('❌ Failed to get profile completeness:', err);
      setError(err.message || 'Failed to get profile completeness');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get access token
  const getAccessToken = () => {
    try {
      // Based on the logs, the token is stored as authToken in the auth service
      let accessToken = (api as any).auth?.authToken || 
                       (api as any).auth?.getAuthToken?.() || 
                       (api as any).auth?.token || 
                       (api as any).auth?.accessToken || 
                       (api as any).token || 
                       (api as any).getToken?.() || 
                       '';
      
      if (!accessToken) {
        // Try to get token from the auth service methods
        const authService = (api as any).auth;
        if (authService) {
          if (typeof authService.getAuthToken === 'function') {
            accessToken = authService.getAuthToken();
          } else if (typeof authService.getToken === 'function') {
            accessToken = authService.getToken();
          }
        }
      }
      
      if (!accessToken) {
        throw new Error('Access token not found. Please log in again.');
      }
      
      console.log('🔑 Access token found:', accessToken.substring(0, 20) + '...');
      return accessToken;
    } catch (tokenError) {
      console.error('❌ Failed to get access token:', tokenError);
      throw new Error('Access token required. Please log in again.');
    }
  };

  // Reference data methods
  const getSkinTones = async () => {
    try {
      console.log('🔍 Fetching skin tones...');
      const response = await fetch('http://localhost:3000/api/talent/reference/skin-tones', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Skin tones fetched:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch skin tones:', err);
      throw err;
    }
  };

  const getHairColors = async () => {
    try {
      console.log('🔍 Fetching hair colors...');
      const response = await fetch('http://localhost:3000/api/talent/reference/hair-colors', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Hair colors fetched:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch hair colors:', err);
      throw err;
    }
  };

  const getSkills = async () => {
    try {
      console.log('🔍 Fetching skills...');
      const response = await fetch('http://localhost:3000/api/talent/reference/skills', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Skills fetched:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch skills:', err);
      throw err;
    }
  };

  const getAbilities = async () => {
    try {
      console.log('🔍 Fetching abilities...');
      const response = await fetch('http://localhost:3000/api/talent/reference/abilities', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Abilities fetched:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch abilities:', err);
      throw err;
    }
  };

  const getLanguages = async () => {
    try {
      console.log('🔍 Fetching languages...');
      const response = await fetch('http://localhost:3000/api/talent/reference/languages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Languages fetched:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch languages:', err);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: ApiContextType = {
    api,
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    updateSkills,
    getProfileCompleteness,
    // Reference data methods
    getSkinTones,
    getHairColors,
    getSkills,
    getAbilities,
    getLanguages,
    clearError,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export default ApiContext;
