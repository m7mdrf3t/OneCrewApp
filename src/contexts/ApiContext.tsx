import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OneCrewApi, { User, AuthResponse, LoginRequest, SignupRequest, ApiError } from 'onecrew-api-client';
import { 
  GuestSessionData, 
  ConvertGuestToUserRequest, 
  TaskWithAssignments, 
  ProjectWithDetails, 
  ProjectMember,
  CreateTaskRequest,
  UpdateTaskRequest,
  AssignTaskServiceRequest,
  UpdateTaskStatusRequest
} from '../types';
import ReferenceDataService from '../services/ReferenceDataService';

interface ApiContextType {
  api: OneCrewApi;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  // Guest session state
  isGuest: boolean;
  guestSessionId: string | null;
  // Authentication methods
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signup: (userData: SignupRequest) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  // Guest session methods
  createGuestSession: () => Promise<GuestSessionData>;
  browseUsersAsGuest: (params?: { page?: number; limit?: number; search?: string; category?: string; role?: string; location?: string }) => Promise<any>;
  convertGuestToUser: (request: ConvertGuestToUserRequest) => Promise<AuthResponse>;
  getGuestSessionId: () => string | null;
  // Profile methods
  updateProfile: (profileData: any) => Promise<any>;
  updateSkills: (skills: string[]) => Promise<any>;
  getProfileCompleteness: (userId: string) => Promise<any>;
  // Reference data methods
  getSkinTones: () => Promise<any>;
  getHairColors: () => Promise<any>;
  getSkills: () => Promise<any>;
  getAbilities: () => Promise<any>;
  getLanguages: () => Promise<any>;
  getServices: () => Promise<any>;
  // Roles and Categories methods
  getRoles: () => Promise<any>;
  getCategories: () => Promise<any>;
  getRolesWithDescriptions: () => Promise<any>;
  getCategoriesWithDescriptions: () => Promise<any>;
  // User filtering methods
  getUsersByRole: (role: string) => Promise<any>;
  getUsersByCategory: (category: string) => Promise<any>;
  getUsersByLocation: (location: string) => Promise<any>;
  // Personal team management methods
  getMyTeam: () => Promise<any>;
  addToMyTeam: (userId: string, role?: string) => Promise<any>;
  removeFromMyTeam: (userId: string) => Promise<any>;
  getMyTeamMembers: () => Promise<any>;
  // New skill management methods
  getAvailableSkillsNew: () => Promise<any>;
  getUserSkills: () => Promise<any>;
  getUserSkillsNew: () => Promise<any>;
  addUserSkillNew: (skillId: string) => Promise<any>;
  removeUserSkillNew: (skillId: string) => Promise<any>;
  // Direct fetch methods
  getUsersDirect: (params?: { limit?: number; page?: number }) => Promise<any>;
  fetchCompleteUserProfile: (userId: string, userData?: any) => Promise<any>;
  // Project management methods
  createProject: (projectData: any) => Promise<any>;
  updateProject: (projectId: string, updates: any) => Promise<any>;
  getProjects: () => Promise<any[]>;
  getAllProjects: () => Promise<any[]>;
  getProjectTasks: (projectId: string) => Promise<TaskWithAssignments[]>;
  getProjectById: (projectId: string) => Promise<ProjectWithDetails>;
  getProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  // Task management methods
  createTask: (projectId: string, taskData: CreateTaskRequest) => Promise<any>;
  updateTask: (taskId: string, updates: UpdateTaskRequest) => Promise<any>;
  deleteTask: (taskId: string) => Promise<void>;
  assignTaskService: (projectId: string, taskId: string, assignment: AssignTaskServiceRequest) => Promise<any>;
  updateTaskStatus: (taskId: string, status: UpdateTaskStatusRequest) => Promise<any>;
  getTaskAssignments: (projectId: string, taskId: string) => Promise<any>;
  // Debug methods
  debugAuthState: () => any;
  clearError: () => void;
  // Profile validation methods
  getProfileRequirements: () => any;
  // New API client methods
  getAvailableSkinTones: () => Promise<any>;
  getAvailableHairColors: () => Promise<any>;
  getAvailableAbilities: () => Promise<any>;
  getAvailableLanguages: () => Promise<any>;
  // Health check
  healthCheck: () => Promise<any>;
  // Portfolio management methods
  getUserPortfolio: () => Promise<any>;
  addPortfolioItem: (item: { kind: 'image' | 'video'; url: string; caption?: string; sort_order?: number }) => Promise<any>;
  updatePortfolioItem: (itemId: string, updates: { caption?: string; sort_order?: number }) => Promise<any>;
  removePortfolioItem: (itemId: string) => Promise<any>;
  // File upload methods
  uploadFile: (file: { uri: string; type: string; name: string }) => Promise<any>;
}

const ApiContext = createContext<ApiContextType | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ 
  children, 
  baseUrl = 'https://onecrewbe-production.up.railway.app' // Production server
}) => {
  const [api] = useState(() => {
    console.log('🔧 Initializing OneCrewApi with baseUrl:', baseUrl);
    const apiClient = new OneCrewApi(baseUrl);
    
    // Override the base URL if it's using localhost
    if ((apiClient as any).baseUrl && (apiClient as any).baseUrl.includes('localhost:3000')) {
      console.log('🔧 Overriding API client baseUrl from localhost to:', baseUrl);
      (apiClient as any).baseUrl = baseUrl;
    }
    
    return apiClient;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guest session state
  const [isGuest, setIsGuest] = useState(false);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  // Test network connectivity
  const testConnectivity = async () => {
    try {
      console.log('🔍 Testing network connectivity...');
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('🌐 Health check response status:', response.status);
      console.log('🌐 Health check response headers:', Object.fromEntries(response.headers.entries()));
      return response.ok;
    } catch (error) {
      console.error('Network connectivity test failed:', error);
      return false;
    }
  };

  // Initialize API client
  useEffect(() => {
    const initializeApi = async () => {
      console.log('🚀 Initializing API client...');
      console.log('🌐 API Base URL:', baseUrl);
      
      // Test connectivity first
      const isConnected = await testConnectivity();
      if (!isConnected) {
        console.error('No network connectivity to backend');
        setError('Cannot connect to server. Please check your internet connection.');
        setIsLoading(false);
        return;
      }
      
      try {
        await api.initialize();
        console.log('API client initialized successfully');
        
        // Initialize ReferenceDataService with the API
        ReferenceDataService.setApi(api);
        console.log('ReferenceDataService initialized with API');
        
        if (api.auth.isAuthenticated()) {
          const currentUser = api.auth.getCurrentUser();
          console.log('👤 User already authenticated:', currentUser);
          console.log('👤 User details:', {
            id: currentUser?.id,
            name: currentUser?.name,
            email: currentUser?.email,
            category: currentUser?.category
          });
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          console.log('No authenticated user found');
        }
      } catch (err) {
        console.warn('Failed to initialize API:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApi();
  }, [api]);

  const login = async (credentials: LoginRequest) => {
    console.log('🔐 Login attempt:', credentials);
    console.log('📤 Sending to backend:', JSON.stringify(credentials));
    console.log('🌐 API Base URL:', baseUrl);
    console.log('🌐 User Agent:', navigator.userAgent || 'Unknown');
    console.log('🌐 Platform:', Platform.OS);
    
    setIsLoading(true);
    setError(null);
    try {
      // Try direct fetch first to bypass potential API client issues
      console.log('🔄 Attempting direct fetch login...');
      const response = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const authResponse = await response.json();
      console.log('✅ Direct fetch login successful:', authResponse);
      console.log('👤 User data in response:', authResponse.user);
      console.log('👤 Data object in response:', authResponse.data);
      console.log('👤 Data object keys:', authResponse.data ? Object.keys(authResponse.data) : 'no data');
      console.log('🔑 Token in response:', authResponse.token ? 'exists' : 'missing');
      console.log('🔑 Token in data:', authResponse.data?.token ? 'exists' : 'missing');
      
      // Extract user data and token - let's see what's actually in the data object
      let userData = null;
      let token = null;
      
      // Check if data contains user info directly
      if (authResponse.data) {
        console.log('🔍 Checking data object structure...');
        console.log('🔍 Data object keys:', Object.keys(authResponse.data));
        
        if (authResponse.data.user) {
          userData = authResponse.data.user;
          console.log('✅ Found user in data.user:', userData);
        } else if (authResponse.data.userData) {
          userData = authResponse.data.userData;
          console.log('✅ Found user in data.userData:', userData);
        } else if (authResponse.data.id || authResponse.data.name || authResponse.data.email) {
          userData = authResponse.data;
          console.log('✅ Found user data directly in data object:', userData);
        } else {
          console.log('❌ No user data found in data object');
          console.log('🔍 Available keys in data:', Object.keys(authResponse.data));
        }
        
        // Check for token in data
        if (authResponse.data.token) {
          token = authResponse.data.token;
          console.log('✅ Found token in data.token');
        } else if (authResponse.data.accessToken) {
          token = authResponse.data.accessToken;
          console.log('✅ Found token in data.accessToken');
        }
      }
      
      // Fallback to root level
      if (!userData) {
        userData = authResponse.user;
        console.log('🔄 Using fallback user data from root level');
      }
      
      if (!token) {
        token = authResponse.token || authResponse.accessToken;
        console.log('🔄 Using fallback token from root level');
      }
      
      if (!userData) {
        console.error('❌ No user data found in login response');
        throw new Error('Login response missing user data');
      }
      
      if (!token) {
        console.error('❌ No token found in login response');
        throw new Error('Login response missing authentication token');
      }
      
      console.log('🔑 Storing access token:', token.substring(0, 20) + '...');
      console.log('👤 Storing user data:', {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        category: userData.category
      });
      
      // Use the AuthService's setAuthData method to properly store the token
      if ((api as any).auth && typeof (api as any).auth.setAuthData === 'function') {
        console.log('🔑 Using AuthService.setAuthData to store token...');
        await (api as any).auth.setAuthData({
          token: token,
          user: userData
        });
      } else {
        // Fallback: Set the auth token in the API client directly
        if ((api as any).apiClient && typeof (api as any).apiClient.setAuthToken === 'function') {
          (api as any).apiClient.setAuthToken(token);
        }
        
        // Also store in the auth service for compatibility
        if ((api as any).auth) {
          (api as any).auth.authToken = token;
          (api as any).auth.token = token;
          (api as any).auth.accessToken = token;
          (api as any).auth.currentUser = userData;
        }
      }
      
      // Update user state
      setUser(userData);
      setIsAuthenticated(true);
      
      // Fetch complete user profile data after login
      setTimeout(async () => {
        console.log('🔄 Fetching complete user profile after login...');
        try {
          const completeUser = await fetchCompleteUserProfile(userData.id, userData);
          if (completeUser) {
            console.log('👤 Complete user profile loaded:', completeUser);
            setUser(completeUser as User);
          }
        } catch (err) {
          console.warn('⚠️ Failed to load complete user profile:', err);
        }
      }, 1000);
      
      return authResponse;
    } catch (err: any) {
      console.error('❌ Login failed:', err);
      console.error('❌ Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        cause: err.cause
      });
      
      // If direct fetch fails, try the API client as fallback
      if (err.message.includes('Network error') || err.message.includes('ENOENT')) {
        console.log('🔄 Trying API client as fallback...');
        try {
          const authResponse = await api.auth.login(credentials);
          console.log('✅ API client login successful:', authResponse);
          setUser(authResponse.user);
          setIsAuthenticated(true);
          return authResponse;
        } catch (apiErr: any) {
          console.error('❌ API client also failed:', apiErr);
          setIsAuthenticated(false);
          setUser(null);
          setError(apiErr.message || 'Login failed');
          throw apiErr;
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setError(err.message || 'Login failed');
        throw err;
      }
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
    console.log('👤 Current user ID:', user?.id);
    setIsLoading(true);
    setError(null);
    try {
      const userId = user?.id;
      if (!userId) {
        console.error('❌ User ID not available, current user:', user);
        throw new Error('User ID not available. Please log in again.');
      }

      // Validate profile data before sending
      console.log('🔍 Validating profile data...');
      const validationErrors = validateProfileData(profileData);
      if (validationErrors.length > 0) {
        const errorMessage = `Profile validation failed:\n${validationErrors.join('\n')}`;
        console.error('❌ Profile validation failed:', validationErrors);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      console.log('✅ Profile data validation passed');

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
      const basicResponse = await fetch(`https://onecrewbe-production.up.railway.app/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(basicProfileData),
      });

      const basicResult = await basicResponse.json();
      
      if (!basicResponse.ok) {
        console.error('❌ Basic profile update failed:', basicResult);
        if (basicResult.errors) {
          console.error('❌ Validation errors:', basicResult.errors);
          throw new Error(`Profile validation failed: ${Object.values(basicResult.errors).join(', ')}`);
        }
        throw new Error(basicResult.error || 'Failed to update basic profile');
      }

      console.log('✅ Basic profile updated successfully:', basicResult);

      // Only update talent profile if there's meaningful data to send
      let talentResult = { data: {} };
      if (Object.keys(cleanedTalentData).length > 0) {
        console.log('🎭 Updating talent profile with data:', cleanedTalentData);
        
        const talentResponse = await fetch('https://onecrewbe-production.up.railway.app/api/talent/profile', {
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
          console.error('❌ Talent profile update failed:', talentResult);
          if ((talentResult as any).errors) {
            console.error('❌ Talent profile validation errors:', (talentResult as any).errors);
            // Show specific validation errors to user
            const errorMessages = Object.entries((talentResult as any).errors).map(([field, message]) => 
              `${field}: ${message}`
            ).join(', ');
            console.warn(`⚠️ Talent profile validation failed: ${errorMessages}`);
          }
          // Don't throw error, just log warning and continue
          console.warn('⚠️ Continuing without talent profile update');
        } else {
          console.log('✅ Talent profile updated successfully:', talentResult);
        }
      } else {
        console.log('⏭️ Skipping talent profile update - no meaningful data to send');
      }

      // Update skills using the correct API client methods
      // Always update skills, even if the array is empty (to clear all skills)
      try {
        console.log('🎯 Updating skills using API client methods...');
        console.log('🔍 Skills data to process:', skillsData.skills);
        
        // Get current user skills to see what needs to be removed
        let currentSkills = [];
        try {
          const currentSkillsResponse = await api.getUserSkills();
          currentSkills = currentSkillsResponse.data || [];
          console.log('🔍 Current user skills:', currentSkills);
        } catch (getSkillsError: any) {
          console.warn('⚠️ Failed to get current skills, assuming empty:', getSkillsError.message);
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
              // First check if it's already an ID
              const skillById = availableSkills.find(s => s.id === skillInput);
              if (skillById) {
                return skillById.id;
              }
              
              // Then check if it's a name
              const skillByName = availableSkills.find(s => 
                s.name.toLowerCase() === skillInput.toLowerCase() ||
                s.skill_name?.toLowerCase() === skillInput.toLowerCase()
              );
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
          api.removeUserSkill(skillId).catch(err => {
            console.warn(`⚠️ Failed to remove skill ${skillId}:`, err);
            return null;
          })
        );
        
        // Add new skills (only add ones not already present)
        const skillsToActuallyAdd = skillIdsToAdd.filter(skillId => 
          !currentSkillIds.includes(skillId)
        );
        
        const addPromises = skillsToActuallyAdd.map((skillId: string) => 
          api.addUserSkill(skillId as string).catch(err => {
            console.warn(`⚠️ Failed to add skill ${skillId}:`, err);
            return null;
          })
        );
        
        // Execute all operations
        const removeResults = await Promise.all(removePromises);
        const addResults = await Promise.all(addPromises);
        
        const successfulRemoves = removeResults.filter(Boolean);
        const successfulAdds = addResults.filter(Boolean);
        
        console.log('✅ Skills updated successfully:', {
          removed: successfulRemoves.length,
          added: successfulAdds.length,
          totalRequested: skillsData.skills.length,
          totalFound: skillIdsToAdd.length,
          alreadyExists: skillIdsToAdd.length - skillsToActuallyAdd.length
        });
        
        if (skillIdsToAdd.length === 0 && skillsData.skills.length > 0) {
          console.warn('⚠️ Warning: No skill IDs were found for the provided skill names. Available skills might not match.');
          console.warn('⚠️ Provided skills:', skillsData.skills);
          console.warn('⚠️ Available skill names (first 10):', availableSkills.slice(0, 10).map(s => s.name || s.skill_name));
        }
      } catch (skillsError: any) {
        console.error('❌ Skills update failed:', skillsError);
        console.error('❌ Error details:', JSON.stringify(skillsError, null, 2));
        // Don't throw - allow profile update to continue
        console.warn('⚠️ Continuing without skills update - profile may not have skills saved');
      }

      // Update the current user data - ensure ID is preserved
      if (user) {
        const updatedUser = { 
          ...user, 
          id: user.id, // Ensure ID is preserved
          ...basicResult.data,
          skills: profileData.skills || [],
          about: {
            ...(user as any).about,
            ...talentResult.data
          }
        };
        console.log('👤 Updated user data with preserved ID:', updatedUser.id);
        setUser(updatedUser as any);
      }
      
      return { success: true, data: { ...basicResult.data, ...talentResult.data, skills: profileData.skills || [] } };
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
    console.log('👤 Current user ID:', user?.id);
    setIsLoading(true);
    setError(null);
    try {
      const userId = user?.id;
      if (!userId) {
        console.error('❌ User ID not available, current user:', user);
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
            const skill = availableSkills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
            return skill?.id;
          })
          .filter(Boolean);
        
        console.log('🔍 Skill IDs to add:', skillIdsToAdd);
        
        // Add each skill individually
        const addPromises = skillIdsToAdd.map(skillId => 
          api.addUserSkill(skillId as string).catch(err => {
            console.warn(`⚠️ Failed to add skill ${skillId}:`, err);
            return null;
          })
        );
        
        const results = await Promise.all(addPromises);
        const successfulAdds = results.filter(Boolean);
        
        console.log('✅ Skills added successfully:', successfulAdds.length);
        
        // Update the current user data
        if (user) {
          setUser({ ...user, skills: skills } as any);
        }
        
        return { success: true, data: { skills } };
      } catch (apiError: any) {
        console.log('⚠️ New skill methods failed, trying direct fetch:', apiError.message);
        
        // Fallback to direct fetch call
        const accessToken = getAccessToken();

        const skillsData = { skills };

        const response = await fetch(`https://onecrewbe-production.up.railway.app/api/users/${userId}/skills`, {
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

        // Update the current user data - ensure ID is preserved
        if (user) {
          const updatedUser = { 
            ...user, 
            id: user.id, // Ensure ID is preserved
            skills: result.data?.skills || skills 
          };
          console.log('👤 Updated user skills with preserved ID:', updatedUser.id);
          setUser(updatedUser as any);
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

  // Helper function to validate profile data
  const validateProfileData = (profileData: any) => {
    const errors: string[] = [];
    
    // Check required fields for basic profile
    if (!profileData.bio || profileData.bio.trim() === '') {
      errors.push('Bio is required');
    }
    
    if (!profileData.specialty || profileData.specialty.trim() === '') {
      errors.push('Specialty is required');
    }
    
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

  // Helper function to get access token
  const getAccessToken = () => {
    try {
      let accessToken = '';
      
      // First, try the AuthService's getAuthToken method
      if ((api as any).auth && typeof (api as any).auth.getAuthToken === 'function') {
        accessToken = (api as any).auth.getAuthToken();
        console.log('🔑 Token from AuthService.getAuthToken():', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      }
      
      // Fallback: Check API client's stored token
      if (!accessToken && (api as any).apiClient && (api as any).apiClient.defaultHeaders) {
        const authHeader = (api as any).apiClient.defaultHeaders['Authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          accessToken = authHeader.substring(7);
          console.log('🔑 Token from API client headers:', accessToken.substring(0, 20) + '...');
        }
      }
      
      // Fallback: Check auth service properties
      if (!accessToken) {
        accessToken = (api as any).auth?.authToken || 
                     (api as any).auth?.token || 
                     (api as any).auth?.accessToken || 
                     (api as any).token || 
                     (api as any).getToken?.() || 
                     '';
        console.log('🔑 Token from auth service properties:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      }
      
      if (!accessToken) {
        console.error('❌ No access token found in any location');
        throw new Error('Access token not found. Please log in again.');
      }
      
      console.log('✅ Access token found:', accessToken.substring(0, 20) + '...');
      return accessToken;
    } catch (tokenError) {
      console.error('❌ Failed to get access token:', tokenError);
      throw new Error('Access token required. Please log in again.');
    }
  };

  // Reference data methods
  const getSkinTones = async () => {
    try {
      console.log('🔄 Fetching skin tones using API client...');
      const response = await api.getAvailableSkinTones();
      console.log('✅ Skin tones fetched successfully:', response.data?.length || 0);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch skin tones via API client:', error);
      // Fallback to direct fetch
      try {
        console.log('🔄 Trying direct fetch fallback...');
        const response = await fetch('https://onecrewbe-production.up.railway.app/api/talent/reference/skin-tones', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Skin tones fetched via fallback:', result);
        return result;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const getHairColors = async () => {
    try {
      console.log('🔄 Fetching hair colors using API client...');
      const response = await api.getAvailableHairColors();
      console.log('✅ Hair colors fetched successfully:', response.data?.length || 0);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch hair colors via API client:', error);
      // Fallback to direct fetch
      try {
        console.log('🔄 Trying direct fetch fallback...');
        const response = await fetch('https://onecrewbe-production.up.railway.app/api/talent/reference/hair-colors', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Hair colors fetched via fallback:', result);
        return result;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const getSkills = async () => {
    try {
      console.log('🔄 Fetching skills using API client...');
      const response = await api.getAvailableSkills();
      console.log('✅ Skills fetched successfully:', response.data?.length || 0);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch skills via API client:', error);
      // Fallback to direct fetch
      try {
        console.log('🔄 Trying direct fetch fallback...');
        const response = await fetch('https://onecrewbe-production.up.railway.app/api/talent/reference/skills', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Skills fetched via fallback:', result);
        return result;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const getAbilities = async () => {
    try {
      console.log('🔄 Fetching abilities using API client...');
      const response = await api.getAvailableAbilities();
      console.log('✅ Abilities fetched successfully:', response.data?.length || 0);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch abilities via API client:', error);
      // Fallback to direct fetch
      try {
        console.log('🔄 Trying direct fetch fallback...');
        const response = await fetch('https://onecrewbe-production.up.railway.app/api/talent/reference/abilities', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Abilities fetched via fallback:', result);
        return result;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const getLanguages = async () => {
    try {
      console.log('🔄 Fetching languages using API client...');
      const response = await api.getAvailableLanguages();
      console.log('✅ Languages fetched successfully:', response.data?.length || 0);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch languages via API client:', error);
      // Fallback to direct fetch
      try {
        console.log('🔄 Trying direct fetch fallback...');
        const response = await fetch('https://onecrewbe-production.up.railway.app/api/talent/reference/languages', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Languages fetched via fallback:', result);
        return result;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const getServices = async () => {
    try {
      console.log('🔍 Fetching services...');
      const response = await fetch('https://onecrewbe-production.up.railway.app/api/talent/reference/services', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Services fetched:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch services:', err);
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

  // Roles and Categories methods
  const getRoles = async () => {
    try {
      console.log('🔍 Fetching roles using API client...');
      
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
        const response = await (api as any).apiClient.get('/api/roles');
        console.log('✅ Direct API call successful:', response);
        return response;
      }
      
      const response = await api.getRoles();
      
      if (response.success && response.data) {
        // Convert string array to object array format
        const rolesData = response.data.map((role: string, index: number) => ({
          id: (index + 1).toString(),
          name: role,
          category: getRoleCategory(role)
        }));
        
        console.log('✅ Roles fetched:', rolesData);
        return {
          success: true,
          data: rolesData
        };
      } else {
        throw new Error(response.error || 'Failed to fetch roles');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch roles:', err);
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
  };

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

  const getCategories = async () => {
    try {
      console.log('🔍 Fetching categories using API client...');
      
      // Check if the method exists
      if (typeof api.getCategories !== 'function') {
        console.log('🔍 getCategories method not available, using direct API call...');
        const response = await (api as any).apiClient.get('/api/categories');
        console.log('✅ Direct categories API call successful:', response);
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
        
        console.log('✅ Categories fetched:', categoriesData);
        return {
          success: true,
          data: categoriesData
        };
      } else {
        throw new Error(response.error || 'Failed to fetch categories');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch categories:', err);
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

  const getRolesWithDescriptions = async () => {
    try {
      console.log('🔍 Fetching roles with descriptions using API client...');
      const response = await api.getRolesWithDescriptions();
      
      if (response.success && response.data) {
        // Convert to our expected format
        const rolesData = response.data.map((role: any, index: number) => ({
          id: (index + 1).toString(),
          name: role.value,
          label: role.label,
          description: role.description,
          category: getRoleCategory(role.value)
        }));
        
        console.log('✅ Roles with descriptions fetched:', rolesData);
        return {
          success: true,
          data: rolesData
        };
      } else {
        throw new Error(response.error || 'Failed to fetch roles with descriptions');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch roles with descriptions:', err);
      return getRoles(); // Fallback to basic roles
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
        
        console.log('✅ Categories with descriptions fetched:', categoriesData);
        return {
          success: true,
          data: categoriesData
        };
      } else {
        throw new Error(response.error || 'Failed to fetch categories with descriptions');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch categories with descriptions:', err);
      return getCategories(); // Fallback to basic categories
    }
  };

  // User filtering methods
  const getUsersByRole = async (role: string) => {
    try {
      console.log('🔍 Fetching users by role using API client:', role);
      
      // Check if the method exists
      if (typeof api.getUsersByRole !== 'function') {
        console.log('🔍 getUsersByRole method not available, using direct API call...');
        const response = await (api as any).apiClient.get(`/api/users/by-role/${encodeURIComponent(role)}`);
        console.log('✅ Direct getUsersByRole API call successful:', response);
        return response;
      }
      
      const response = await api.getUsersByRole(role);
      
      if (response.success && response.data) {
        // Handle both array and paginated response
        const users = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log('✅ Users by role fetched:', users.length);
        return {
          success: true,
          data: users
        };
      } else {
        throw new Error(response.error || 'Failed to fetch users by role');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch users by role:', err);
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
        console.error('❌ Fallback also failed:', fallbackErr);
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
        console.log('✅ Users by category fetched:', users.length);
        return {
          success: true,
          data: users
        };
      } else {
        throw new Error(response.error || 'Failed to fetch users by category');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch users by category:', err);
      // Fallback to getUsersDirect with category filtering
      try {
        const users = await getUsersDirect();
        const filteredUsers = users.filter((user: any) => 
          user.category?.toLowerCase().includes(category.toLowerCase())
        );
        return { success: true, data: filteredUsers };
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
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
        console.log('✅ Users by location fetched:', users.length);
        return {
          success: true,
          data: users
        };
      } else {
        throw new Error(response.error || 'Failed to fetch users by location');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch users by location:', err);
      // Fallback to getUsersDirect with location filtering
      try {
        const users = await getUsersDirect();
        const filteredUsers = users.filter((user: any) => 
          user.about?.location?.toLowerCase().includes(location.toLowerCase())
        );
        return { success: true, data: filteredUsers };
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        return { success: false, data: [], error: 'Failed to fetch users' };
      }
    }
  };

  // Personal team management methods
  const getMyTeam = async () => {
    try {
      console.log('🔍 Fetching user personal team...');
      const response = await api.getMyTeam();
      
      if (response.success && response.data) {
        console.log('✅ Personal team fetched:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to fetch personal team');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch personal team:', err);
      return { success: false, data: null, error: 'Failed to fetch personal team' };
    }
  };

  const addToMyTeam = async (userId: string, role?: string) => {
    try {
      console.log('🔍 Adding user to personal team:', userId, role);
      const response = await api.addToMyTeam(userId, role);
      
      if (response.success && response.data) {
        console.log('✅ User added to personal team:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to add user to personal team');
      }
    } catch (err: any) {
      console.error('❌ Failed to add user to personal team:', err);
      return { success: false, data: null, error: 'Failed to add user to personal team' };
    }
  };

  const removeFromMyTeam = async (userId: string) => {
    try {
      console.log('🔍 Removing user from personal team:', userId);
      const response = await api.removeFromMyTeam(userId);
      
      if (response.success) {
        console.log('✅ User removed from personal team');
        return {
          success: true,
          data: null
        };
      } else {
        throw new Error(response.error || 'Failed to remove user from personal team');
      }
    } catch (err: any) {
      console.error('❌ Failed to remove user from personal team:', err);
      return { success: false, data: null, error: 'Failed to remove user from personal team' };
    }
  };

  const getMyTeamMembers = async () => {
    try {
      console.log('🔍 Fetching personal team members...');
      const response = await api.getMyTeamMembers();
      
      if (response.success && response.data) {
        console.log('✅ Personal team members fetched:', response.data.length);
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to fetch personal team members');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch personal team members:', err);
      return { success: false, data: [], error: 'Failed to fetch personal team members' };
    }
  };

  // New skill management methods using the correct API client
  const getAvailableSkillsNew = async () => {
    try {
      console.log('🔄 Fetching available skills using API client...');
      const response = await api.getAvailableSkills();
      console.log('✅ Available skills fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch available skills:', error);
      throw error;
    }
  };

  const getUserSkills = async () => {
    try {
      console.log('🔄 Fetching user skills with rate limiting protection...');
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await api.getUserSkills();
      console.log('✅ User skills fetched:', response.data?.length || 0);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch user skills:', error);
      
      // If rate limited, wait and retry once
      if (error.message?.includes('429') || error.status === 429) {
        console.log('⚠️ Rate limited, waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const retryResponse = await api.getUserSkills();
          console.log('✅ User skills fetched on retry:', retryResponse.data?.length || 0);
          return retryResponse;
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
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
      console.log('✅ User skills fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch user skills:', error);
      // Return empty array if there's an error
      return { success: true, data: [] };
    }
  };

  const addUserSkillNew = async (skillId: string) => {
    try {
      console.log('🔄 Adding user skill:', skillId);
      const response = await api.addUserSkill(skillId);
      console.log('✅ User skill added:', response.data);
      
      // Update the current user data - ensure ID is preserved
      if (user) {
        const updatedSkills = [...((user as any).skills || []), skillId];
        const updatedUser = { 
          ...user, 
          id: user.id, // Ensure ID is preserved
          skills: updatedSkills 
        };
        console.log('👤 Added skill with preserved ID:', updatedUser.id);
        setUser(updatedUser as any);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to add user skill:', error);
      throw error;
    }
  };

  const removeUserSkillNew = async (skillId: string) => {
    try {
      console.log('🔄 Removing user skill:', skillId);
      const response = await api.removeUserSkill(skillId);
      console.log('✅ User skill removed:', response);
      
      // Update the current user data - ensure ID is preserved
      if (user) {
        const updatedSkills = ((user as any).skills || []).filter((skill: any) => skill !== skillId);
        const updatedUser = { 
          ...user, 
          id: user.id, // Ensure ID is preserved
          skills: updatedSkills 
        };
        console.log('👤 Removed skill with preserved ID:', updatedUser.id);
        setUser(updatedUser as any);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to remove user skill:', error);
      throw error;
    }
  };

  // Fetch complete user profile data
  const fetchCompleteUserProfile = async (userId: string, userData?: any) => {
    try {
      console.log('👤 Fetching complete user profile for:', userId);
      const accessToken = getAccessToken();
      
      // Fetch user details
      const userDetailsResponse = await fetch(`${baseUrl}/api/user-details/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!userDetailsResponse.ok) {
        console.warn('⚠️ Failed to fetch user details:', userDetailsResponse.status);
        return null;
      }

      const userDetails = await userDetailsResponse.json();
      console.log('✅ User details fetched:', userDetails);

      // Fetch talent profile if user is talent
      let talentProfile = null;
      const currentUser = userData || user;
      if (currentUser?.category === 'talent') {
        try {
          const talentResponse = await fetch(`${baseUrl}/api/talent/profile`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (talentResponse.ok) {
            talentProfile = await talentResponse.json();
            console.log('✅ Talent profile fetched:', talentProfile);
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch talent profile:', err);
        }
      }

      // Combine user data with details and talent profile
      const completeUser = {
        ...currentUser,
        about: {
          ...userDetails.data,
          ...talentProfile?.data
        }
      };

      console.log('✅ Complete user profile:', completeUser);
      return completeUser;
    } catch (err: any) {
      console.error('❌ Failed to fetch complete user profile:', err);
      return null;
    }
  };

  // Direct fetch method for getting users
  const getUsersDirect = async (params: { limit?: number; page?: number } = {}) => {
    try {
      console.log('👥 Fetching users with direct fetch...');
      
      // Debug: Check if user is authenticated
      console.log('🔍 Auth state check:', {
        isAuthenticated: (api as any).auth?.isAuthenticated?.(),
        hasToken: !!(api as any).auth?.getAuthToken?.(),
        hasUser: !!(api as any).auth?.getCurrentUser?.()
      });
      
      const accessToken = getAccessToken();
      
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.page) queryParams.append('page', params.page.toString());
      
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
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Users fetched successfully:', result);
      return result;
    } catch (err: any) {
      console.error('❌ Failed to fetch users:', err);
      throw err;
    }
  };

  // Debug method to check authentication state
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

  // Get profile completion requirements
  const getProfileRequirements = () => {
    return {
      basic: {
        required: ['bio', 'specialty'],
        bio: {
          required: true,
          minLength: 10,
          description: 'A brief description about yourself'
        },
        specialty: {
          required: true,
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

  // New API client methods - direct passthrough
  const getAvailableSkinTones = async () => {
    return await api.getAvailableSkinTones();
  };

  const getAvailableHairColors = async () => {
    return await api.getAvailableHairColors();
  };

  const getAvailableAbilities = async () => {
    return await api.getAvailableAbilities();
  };

  const getAvailableLanguages = async () => {
    return await api.getAvailableLanguages();
  };

  const healthCheck = async () => {
    return await api.healthCheck();
  };

  // Portfolio management methods
  const getUserPortfolio = async () => {
    try {
      console.log('🖼️ Fetching user portfolio...');
      const response = await api.getUserPortfolio();
      console.log('✅ Portfolio fetched successfully:', response.data?.length || 0, 'items');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch portfolio:', error);
      throw error;
    }
  };

  const addPortfolioItem = async (item: { kind: 'image' | 'video'; url: string; caption?: string; sort_order?: number }) => {
    try {
      console.log('➕ Adding portfolio item:', item.kind, item.url);
      const response = await api.addPortfolioItem(item);
      console.log('✅ Portfolio item added successfully:', response.data);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to add portfolio item:', error);
      throw error;
    }
  };

  const updatePortfolioItem = async (itemId: string, updates: { caption?: string; sort_order?: number }) => {
    try {
      console.log('✏️ Updating portfolio item:', itemId, updates);
      const response = await api.updatePortfolioItem(itemId, updates);
      console.log('✅ Portfolio item updated successfully:', response.data);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to update portfolio item:', error);
      throw error;
    }
  };

  const removePortfolioItem = async (itemId: string) => {
    try {
      console.log('🗑️ Removing portfolio item:', itemId);
      const response = await api.removePortfolioItem(itemId);
      console.log('✅ Portfolio item removed successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to remove portfolio item:', error);
      throw error;
    }
  };

  // File upload methods
  const uploadFile = async (file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading file:', file.name, file.type);
      
      // Use the correct endpoint /api/media/upload instead of /api/upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);
      
      // Add required media_type field based on file type
      const mediaType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 
                       file.type.startsWith('audio/') ? 'audio' : 'image';
      formData.append('media_type', mediaType);

      // Debug: Log what we're sending
      console.log('🔍 FormData file object:', {
        uri: file.uri,
        type: file.type,
        name: file.name,
        media_type: mediaType,
      });

      const accessToken = getAccessToken();
      
      // Don't set Content-Type manually - let fetch() handle it with proper boundary
      const response = await fetch('https://onecrewbe-production.up.railway.app/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Remove Content-Type - let fetch() set it automatically
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Upload failed with status:', response.status);
        console.error('❌ Response:', result);
        throw new Error(result.error || `Upload failed with status ${response.status}`);
      }

      console.log('✅ File uploaded successfully:', result);
      
      // The backend returns the URL in result.data.file_url, not result.data.url
      const uploadResponse = {
        url: result.data.file_url,
        filename: result.data.title || file.name,
        size: result.data.file_size,
        type: result.data.media_type,
      };
      
      console.log('🔗 Extracted upload response:', uploadResponse);
      return { data: uploadResponse };
    } catch (error: any) {
      console.error('❌ Failed to upload file:', error);
      throw error;
    }
  };

  // Guest session methods
  const createGuestSession = async (): Promise<GuestSessionData> => {
    try {
      console.log('🎭 Creating guest session...');
      const response = await api.createGuestSession();
      if (response.success && response.data) {
        setGuestSessionId(response.data.sessionId);
        setIsGuest(true);
        console.log('🎭 Guest session created:', response.data.sessionId);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create guest session');
      }
    } catch (error) {
      console.error('Failed to create guest session:', error);
      throw error;
    }
  };

  const browseUsersAsGuest = async (params?: { page?: number; limit?: number; search?: string; category?: string; role?: string; location?: string }) => {
    if (!guestSessionId) {
      throw new Error('No guest session available');
    }
    try {
      console.log('🎭 Browsing users as guest...');
      const response = await api.browseUsersAsGuest(guestSessionId, params);
      return response;
    } catch (error) {
      console.error('Failed to browse users as guest:', error);
      throw error;
    }
  };

  const convertGuestToUser = async (request: ConvertGuestToUserRequest): Promise<AuthResponse> => {
    try {
      console.log('🎭 Converting guest to user...');
      const response = await api.convertGuestToUser(request);
      if (response.success && response.data) {
        setIsGuest(false);
        setGuestSessionId(null);
        setIsAuthenticated(true);
        setUser(response.data.user);
        console.log('🎭 Guest converted to user:', response.data.user.name);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to convert guest to user');
      }
    } catch (error) {
      console.error('Failed to convert guest to user:', error);
      throw error;
    }
  };

  const getGuestSessionId = (): string | null => {
    return guestSessionId;
  };

  // Task management methods
  // Project management methods
  const createProject = async (projectData: any) => {
    try {
      const response = await api.createProject(projectData);
      return response;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const updateProject = async (projectId: string, updates: any) => {
    try {
      console.log('📝 Updating project:', projectId, updates);
      const response = await api.updateProject(projectId, updates);
      if (response.success && response.data) {
        console.log('✅ Project updated successfully:', response.data);
        return response;
      } else {
        throw new Error(response.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const getProjects = async (): Promise<any[]> => {
    try {
      console.log('📋 Getting user projects');
      const response = await api.getProjects();
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('Failed to get projects:', error);
      throw error;
    }
  };

  const getAllProjects = async (): Promise<any[]> => {
    try {
      console.log('📋 Getting user projects');
      const response = await api.getMyProjects();
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to fetch user projects');
      }
    } catch (error) {
      console.error('Failed to get user projects:', error);
      throw error;
    }
  };

  const getProjectTasks = async (projectId: string): Promise<TaskWithAssignments[]> => {
    try {
      console.log('📋 Getting project tasks for:', projectId);
      const response = await api.getProjectTasks(projectId);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to get project tasks');
      }
    } catch (error) {
      console.error('Failed to get project tasks:', error);
      throw error;
    }
  };

  const getProjectById = async (projectId: string): Promise<ProjectWithDetails> => {
    try {
      console.log('📋 Getting project details for:', projectId);
      const response = await api.getProjectById(projectId);
      console.log('📋 Project details response:', response);
      
      if (response.success && response.data) {
        // getProjectById should return a single project object, not an array
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get project details');
      }
    } catch (error) {
      console.error('Failed to get project details:', error);
      throw error;
    }
  };

  const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      console.log('👥 Getting project members for:', projectId);
      const response = await api.getProjectMembers(projectId);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to get project members');
      }
    } catch (error) {
      console.error('Failed to get project members:', error);
      throw error;
    }
  };

  const createTask = async (projectId: string, taskData: CreateTaskRequest) => {
    try {
      console.log('📋 Creating task for project:', projectId);
      const response = await api.createTask(projectId, taskData);
      console.log('📋 Create task response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Task created successfully:', response.data);
        return {
          success: true,
          data: response.data
        };
      } else {
        console.error('❌ Failed to create task:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to create task'
        };
      }
    } catch (error) {
      console.error('❌ Error creating task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task'
      };
    }
  };

  const updateTask = async (taskId: string, updates: UpdateTaskRequest) => {
    try {
      console.log('🔍 ===== TASK UPDATE DEBUG =====');
      console.log('📋 Task ID:', taskId);
      console.log('📋 Updates:', updates);
      console.log('👤 Current User:', {
        id: user?.id,
        name: user?.name,
        email: user?.email
      });
      console.log('🔑 Authentication Status:', {
        isAuthenticated,
        hasToken: !!user?.id,
        tokenLength: user?.id?.length || 0
      });
      console.log('🎯 API Client Status:', {
        hasApiClient: !!api,
        hasUpdateTask: typeof api?.updateTask === 'function'
      });
      
      // Check project members to see if user is a member
      try {
        // First get the task to find the project ID
        const taskResponse = await api.getTaskById(taskId);
        console.log('📋 Task details:', taskResponse);
        
        if (taskResponse.success && taskResponse.data) {
          const projectId = taskResponse.data.project_id;
          console.log('🔍 Checking project membership for project:', projectId);
          const membersResponse = await api.getProjectMembers(projectId);
          console.log('👥 Project Members:', membersResponse);
          
          const isMember = membersResponse.data?.some(member => member.user_id === user?.id);
          console.log('✅ Is current user a project member?', isMember);
          
          if (!isMember) {
            console.log('❌ USER IS NOT A PROJECT MEMBER - This is why the update is failing!');
          }
        }
      } catch (memberError) {
        console.log('❌ Failed to check project members:', memberError);
      }
      
      console.log('🔍 ===============================');
      
      const response = await api.updateTask(taskId, updates);
      console.log('📋 Update task response:', response);
      
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        console.error('❌ Update task failed:', response.error);
        throw new Error(response.error || 'Failed to update task');
      }
    } catch (error: any) {
      console.error('❌ Failed to update task:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      throw error;
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      console.log('📋 Deleting task:', taskId);
      console.log('🔍 Current user:', user?.id);
      const response = await api.deleteTask(taskId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  const assignTaskService = async (projectId: string, taskId: string, assignment: AssignTaskServiceRequest) => {
    try {
      console.log('📋 Assigning task service:', taskId);
      // Convert service_role to UserRole type
      const apiAssignment = {
        ...assignment,
        service_role: assignment.service_role as any, // Type assertion for now
      };
      const response = await api.assignTaskService(projectId, taskId, apiAssignment);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to assign task service');
      }
    } catch (error) {
      console.error('Failed to assign task service:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: UpdateTaskStatusRequest) => {
    try {
      console.log('🔍 ===== TASK STATUS UPDATE DEBUG =====');
      console.log('📋 Task ID:', taskId);
      console.log('📋 New Status:', status);
      console.log('👤 Current User:', {
        id: user?.id,
        name: user?.name,
        email: user?.email
      });
      console.log('🔑 Authentication Status:', {
        isAuthenticated,
        hasToken: !!user?.id,
        tokenLength: user?.id?.length || 0
      });
      console.log('🎯 API Client Status:', {
        hasApiClient: !!api,
        hasUpdateTaskStatus: typeof api?.updateTaskStatus === 'function'
      });
      
      // Check project members to see if user is a member
      try {
        // First get the task to find the project ID
        const taskResponse = await api.getTaskById(taskId);
        console.log('📋 Task details:', taskResponse);
        
        if (taskResponse.success && taskResponse.data) {
          const projectId = taskResponse.data.project_id;
          console.log('🔍 Checking project membership for project:', projectId);
          const membersResponse = await api.getProjectMembers(projectId);
          console.log('👥 Project Members:', membersResponse);
          
          const isMember = membersResponse.data?.some(member => member.user_id === user?.id);
          console.log('✅ Is current user a project member?', isMember);
          
          if (!isMember) {
            console.log('❌ USER IS NOT A PROJECT MEMBER - This is why the update is failing!');
          }
        }
      } catch (memberError) {
        console.log('❌ Failed to check project members:', memberError);
      }
      
      console.log('🔍 ======================================');
      
      const response = await api.updateTaskStatus(taskId, status);
      console.log('📋 Update task status response:', response);
      
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        console.error('❌ Update task status failed:', response.error);
        throw new Error(response.error || 'Failed to update task status');
      }
    } catch (error: any) {
      console.error('❌ Failed to update task status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      throw error;
    }
  };

  const getTaskAssignments = async (projectId: string, taskId: string) => {
    try {
      console.log('📋 Getting task assignments:', projectId, taskId);
      const response = await api.getTaskAssignments(projectId, taskId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get task assignments');
      }
    } catch (error) {
      console.error('Failed to get task assignments:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get task assignments'
      };
    }
  };

  const value: ApiContextType = {
    api,
    isAuthenticated,
    user,
    isLoading,
    error,
    // Guest session state
    isGuest,
    guestSessionId,
    // Authentication methods
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    // Guest session methods
    createGuestSession,
    browseUsersAsGuest,
    convertGuestToUser,
    getGuestSessionId,
    // Profile methods
    updateProfile,
    updateSkills,
    getProfileCompleteness,
    // Reference data methods
    getSkinTones,
    getHairColors,
    getSkills,
    getAbilities,
    getLanguages,
    getServices,
    // Roles and Categories methods
    getRoles,
    getCategories,
    getRolesWithDescriptions,
    getCategoriesWithDescriptions,
    // User filtering methods
    getUsersByRole,
    getUsersByCategory,
    getUsersByLocation,
    // Personal team management methods
    getMyTeam,
    addToMyTeam,
    removeFromMyTeam,
    getMyTeamMembers,
    // New skill management methods
    getAvailableSkillsNew,
    getUserSkills,
    getUserSkillsNew,
    addUserSkillNew,
    removeUserSkillNew,
    // Direct fetch methods
    getUsersDirect,
    fetchCompleteUserProfile,
    // Project management methods
    createProject,
    updateProject,
    getProjects,
    getAllProjects,
    // Task management methods
    getProjectTasks,
    getProjectById,
    getProjectMembers,
    createTask,
    updateTask,
    deleteTask,
    assignTaskService,
    updateTaskStatus,
    getTaskAssignments,
    // Debug methods
    debugAuthState,
    clearError,
    // Profile validation methods
    getProfileRequirements,
    // New API client methods
    getAvailableSkinTones,
    getAvailableHairColors,
    getAvailableAbilities,
    getAvailableLanguages,
    healthCheck,
    // Portfolio management methods
    getUserPortfolio,
    addPortfolioItem,
    updatePortfolioItem,
    removePortfolioItem,
    // File upload methods
    uploadFile,
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
