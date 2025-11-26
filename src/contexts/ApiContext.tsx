import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - expo-constants types may not be available in all environments
import Constants from 'expo-constants';
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
  UpdateTaskStatusRequest,
  Notification,
  NotificationParams,
  NotificationType,
  CertificationTemplate,
  UserCertification,
  AcademyCertificationAuthorization,
  CreateCertificationTemplateRequest,
  UpdateCertificationTemplateRequest,
  CreateCertificationRequest,
  UpdateCertificationRequest,
  BulkAuthorizationRequest,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseStatus,
} from '../types';
import ReferenceDataService from '../services/ReferenceDataService';
import supabaseService from '../services/SupabaseService';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';

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
  getAccessToken: () => string;
  getBaseUrl: () => string;
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
  deleteTaskAssignment: (projectId: string, taskId: string, assignmentId: string) => Promise<any>;
  updateTaskAssignmentStatus: (projectId: string, taskId: string, assignmentId: string, status: 'accepted' | 'rejected') => Promise<any>;
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
  // Social media links management methods
  getUserSocialLinks: (userId?: string) => Promise<any>;
  addSocialLink: (linkData: { platform: string; url: string; is_custom?: boolean }) => Promise<any>;
  updateSocialLink: (linkId: string, updates: { platform?: string; url?: string; is_custom?: boolean }) => Promise<any>;
  deleteSocialLink: (linkId: string) => Promise<any>;
  // Profile picture management methods
  getUserProfilePictures: (userId: string) => Promise<any>;
  uploadProfilePicture: (file: any, isMain?: boolean) => Promise<any>;
  setMainProfilePicture: (userId: string, pictureId: string) => Promise<any>;
  deleteProfilePicture: (userId: string, pictureId: string) => Promise<any>;
  // File upload methods
  uploadFile: (file: { uri: string; type: string; name: string }) => Promise<any>;
  // Profile switching
  currentProfileType: 'user' | 'company';
  activeCompany: any | null;
  switchToUserProfile: () => void;
  switchToCompanyProfile: (companyId: string) => Promise<void>;
  getActiveCompany: () => any | null;
  // Company management methods
  getCompanyTypes: () => Promise<any>;
  getCompanyType: (code: string) => Promise<any>;
  getCompanyTypeServices: (code: string) => Promise<any>;
  createCompany: (companyData: any) => Promise<any>;
  getCompany: (companyId: string) => Promise<any>;
  updateCompany: (companyId: string, updates: any) => Promise<any>;
  uploadCompanyLogo: (companyId: string, file: { uri: string; type: string; name: string }) => Promise<any>;
  getUserCompanies: (userId: string) => Promise<any>;
  submitCompanyForApproval: (companyId: string) => Promise<any>;
  getCompanies: (params?: any) => Promise<any>;
  // Company services
  getAvailableServicesForCompany: (companyId: string) => Promise<any>;
  getCompanyServices: (companyId: string) => Promise<any>;
  addCompanyService: (companyId: string, serviceId: string) => Promise<any>;
  removeCompanyService: (companyId: string, serviceId: string) => Promise<any>;
  // Company members
  addCompanyMember: (companyId: string, memberData: any) => Promise<any>;
  getCompanyMembers: (companyId: string, params?: any) => Promise<any>;
  acceptInvitation: (companyId: string, userId: string) => Promise<any>;
  rejectInvitation: (companyId: string, userId: string) => Promise<any>;
  cancelInvitation: (companyId: string, userId: string) => Promise<any>;
  getPendingInvitations: (userId: string) => Promise<any>;
  updateCompanyMemberRole: (companyId: string, userId: string, role: string) => Promise<any>;
  removeCompanyMember: (companyId: string, userId: string) => Promise<any>;
  transferCompanyOwnership: (companyId: string, newOwnerId: string) => Promise<any>;
  leaveCompany: (companyId: string) => Promise<any>;
  // Company documents
  getCompanyDocuments: (companyId: string) => Promise<any>;
  addCompanyDocument: (companyId: string, documentData: { document_type: string; file_url: string; file_name?: string; description?: string }) => Promise<any>;
  deleteCompanyDocument: (companyId: string, documentId: string) => Promise<any>;
  // Notification methods
  getNotifications: (params?: NotificationParams) => Promise<any>;
  getUnreadNotificationCount: () => Promise<number>;
  markNotificationAsRead: (notificationId: string) => Promise<any>;
  markAllNotificationsAsRead: () => Promise<any>;
  deleteNotification: (notificationId: string) => Promise<any>;
  // Notification state
  notifications: Notification[];
  unreadNotificationCount: number;
  // Chat unread count
  unreadConversationCount: number;
  // Certification Template Management (Admin)
  getCertificationTemplates: (query?: { active?: boolean; category?: string }) => Promise<any>;
  getCertificationTemplate: (templateId: string) => Promise<any>;
  createCertificationTemplate: (templateData: CreateCertificationTemplateRequest) => Promise<any>;
  updateCertificationTemplate: (templateId: string, updates: UpdateCertificationTemplateRequest) => Promise<any>;
  deleteCertificationTemplate: (templateId: string) => Promise<any>;
  // Academy Authorization Management (Admin)
  authorizeAcademyForCertification: (academyId: string, templateId: string) => Promise<any>;
  revokeAcademyAuthorization: (academyId: string, templateId: string) => Promise<any>;
  bulkAuthorizeAcademies: (bulkData: BulkAuthorizationRequest) => Promise<any>;
  getAcademyAuthorizations: (academyId: string) => Promise<any>;
  // Certification Management (Academy/Company)
  getAuthorizedCertifications: (companyId: string) => Promise<any>;
  grantCertification: (companyId: string, certificationData: CreateCertificationRequest) => Promise<any>;
  getCompanyCertifications: (companyId: string) => Promise<any>;
  updateCertification: (companyId: string, certificationId: string, updates: UpdateCertificationRequest) => Promise<any>;
  revokeCertification: (companyId: string, certificationId: string) => Promise<any>;
  // User Certification Access
  getUserCertifications: (userId: string) => Promise<any>;
  // Course Management methods (v2.4.0)
  getAcademyCourses: (companyId: string, filters?: { status?: CourseStatus; category?: string }) => Promise<any>;
  createCourse: (companyId: string, courseData: CreateCourseRequest) => Promise<any>;
  getCourseById: (courseId: string, companyId?: string) => Promise<any>;
  updateCourse: (companyId: string, courseId: string, updates: UpdateCourseRequest) => Promise<any>;
  deleteCourse: (companyId: string, courseId: string) => Promise<any>;
  getPublicCourses: (filters?: { category?: string; company_id?: string; page?: number; limit?: number }) => Promise<any>;
  registerForCourse: (courseId: string) => Promise<any>;
  unregisterFromCourse: (courseId: string) => Promise<any>;
  getCourseRegistrations: (courseId: string) => Promise<any>;
  getMyRegisteredCourses: () => Promise<any>;
  // News/Blog methods (v2.4.0)
  getPublishedNews: (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest' }) => Promise<any>;
  getNewsPostBySlug: (slug: string) => Promise<any>;
  getNewsCategories: () => Promise<any>;
  getNewsTags: () => Promise<any>;
  // Chat/Messaging methods (v2.5.0)
  getConversations: (params?: { page?: number; limit?: number }) => Promise<any>;
  getConversationById: (conversationId: string) => Promise<any>;
  createConversation: (request: { conversation_type: 'user_user' | 'user_company' | 'company_company'; participant_ids: string[]; name?: string }) => Promise<any>;
  getMessages: (conversationId: string, params?: { page?: number; limit?: number; before?: string }) => Promise<any>;
  sendMessage: (conversationId: string, messageData: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number; reply_to_message_id?: string }) => Promise<any>;
  editMessage: (messageId: string, content: string) => Promise<any>;
  deleteMessage: (messageId: string) => Promise<any>;
  readMessage: (conversationId: string, messageId?: string) => Promise<any>;
  // Online status methods (Redis-powered)
  getOnlineStatus: (userId: string) => Promise<any>;
  getOnlineStatuses: (userIds: string[]) => Promise<any>;
}

const ApiContext = createContext<ApiContextType | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ 
  children, 
  baseUrl = 'https://onecrewbe-production.up.railway.app' // Production serve
 //baseUrl = 'http://localhost:3000' // Local server
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
  // Profile switching state
  const [currentProfileType, setCurrentProfileType] = useState<'user' | 'company'>('user');
  const [activeCompany, setActiveCompany] = useState<any | null>(null);
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  // Real-time subscription state
  const [notificationChannelId, setNotificationChannelId] = useState<string | null>(null);
  // Chat unread count state
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  // Heartbeat state
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  // Test network connectivity - try multiple endpoints
  const testConnectivity = async () => {
    const endpointsToTry = [
      '/health',
      '/api/health',
      '/api',
      '/',
    ];

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`🔍 Testing connectivity to ${baseUrl}${endpoint}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        // If we get any response (even 404), it means the server is reachable
        if (response.status >= 200 && response.status < 500) {
          console.log(`✅ Connectivity confirmed via ${endpoint} (status: ${response.status})`);
          return true;
        }
        
        // Even 404 means server is reachable
        if (response.status === 404) {
          console.log(`✅ Server is reachable (404 on ${endpoint} - endpoint may not exist, but server is up)`);
          return true;
        }
      } catch (error: any) {
        // Network errors or timeouts
        if (error.name === 'AbortError') {
          console.warn(`⏱️ Timeout checking ${endpoint}`);
        } else {
          console.warn(`⚠️ Failed to connect to ${endpoint}:`, error.message);
        }
        // Continue to next endpoint
        continue;
      }
    }

    // If all endpoints failed, try to initialize the API directly as a fallback
    console.warn('⚠️ Direct health checks failed, but will try to initialize API anyway...');
    return null; // null means "unknown, try anyway"
  };

  // Initialize API client
  useEffect(() => {
    const initializeApi = async () => {
      console.log('🚀 Initializing API client...');
      console.log('🌐 API Base URL:', baseUrl);
      
      // Test connectivity (non-blocking - if it fails, we'll still try to initialize)
      const connectivityResult = await testConnectivity();
      if (connectivityResult !== true) {
        // Only warn if we got false (definite failure), not if it's null (unknown)
        if (connectivityResult === false) {
          console.warn('⚠️ Network connectivity test failed, but continuing with API initialization...');
          console.warn('⚠️ This may be a false positive if /health endpoint does not exist.');
        } else {
          console.warn('⚠️ Network connectivity test inconclusive, continuing with API initialization...');
        }
        // Don't block - let the API initialization try anyway
      }
      
      try {
        await api.initialize();
        console.log('✅ API client initialized successfully');
        
        // Verify chat service is available
        if (api.chat) {
          console.log('✅ Chat service is available');
          console.log('💬 Chat service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(api.chat)).filter(m => m !== 'constructor'));
        } else {
          console.warn('⚠️ Chat service is not available after initialization');
          console.warn('⚠️ API object keys:', Object.keys(api));
        }
        
        // Clear any previous connectivity errors since initialization succeeded
        if (error && error.includes('Cannot connect to server')) {
          setError(null);
        }
        
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
          
          // Restore profile type and active company from storage
          const savedProfileType = await AsyncStorage.getItem('currentProfileType');
          const savedCompanyId = await AsyncStorage.getItem('activeCompanyId');
          
          if (savedProfileType === 'company' && savedCompanyId) {
            try {
              const companyResponse = await api.getCompany(savedCompanyId);
              if (companyResponse.success && companyResponse.data) {
                setActiveCompany(companyResponse.data);
                setCurrentProfileType('company');
                console.log('✅ Restored company profile:', savedCompanyId);
              } else {
                // Company not found or access denied, switch to user profile
                await AsyncStorage.setItem('currentProfileType', 'user');
                await AsyncStorage.removeItem('activeCompanyId');
                setCurrentProfileType('user');
              }
            } catch (error) {
              console.warn('Failed to restore company profile:', error);
              await AsyncStorage.setItem('currentProfileType', 'user');
              await AsyncStorage.removeItem('activeCompanyId');
              setCurrentProfileType('user');
            }
          } else {
            setCurrentProfileType('user');
          }
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
        console.error(' No user data found in login response');
        throw new Error('Login response missing user data');
      }
      
      if (!token) {
        console.error(' No token found in login response');
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
      console.error('Login failed:', err);
      console.error('Error details:', {
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
      // Unsubscribe from real-time notifications
      if (notificationChannelId) {
        supabaseService.unsubscribe(notificationChannelId);
        setNotificationChannelId(null);
      }
      
      await api.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
      // Clear notification state
      setNotifications([]);
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Logout failed:', err);
      // Clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      setNotifications([]);
      setUnreadNotificationCount(0);
      
      // Unsubscribe from real-time notifications on error
      if (notificationChannelId) {
        supabaseService.unsubscribe(notificationChannelId);
        setNotificationChannelId(null);
      }
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
      // Note: social_links are handled separately via dedicated endpoints
      const basicProfileData: any = {
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
        console.error('❌ Basic profile update failed:', basicResult);
        if (basicResult.errors) {
          console.error('❌ Validation errors:', basicResult.errors);
          throw new Error(`Profile validation failed: ${Object.values(basicResult.errors).join(', ')}`);
        }
        throw new Error(basicResult.error || 'Failed to update basic profile');
      }

      console.log('✅ Basic profile updated successfully:', basicResult);

      // Only update talent profile if user is a talent AND there's meaningful data to send
      let talentResult = { data: {} };
      const userCategory = user?.category as string | undefined;
      const isTalent = userCategory?.toLowerCase() === 'talent';
      
      if (isTalent && Object.keys(cleanedTalentData).length > 0) {
        console.log('🎭 Updating talent profile with data:', cleanedTalentData);
        console.log('👤 User category is talent, proceeding with talent profile update');
        
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
            console.warn(`⚠️ Talent profile validation failed: ${errorMessages}`);
          }
          // Don't throw error, just log warning and continue
          console.warn('⚠️ Continuing without talent profile update');
        } else {
          console.log('✅ Talent profile updated successfully:', talentResult);
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
              if (!skillInput || typeof skillInput !== 'string') {
                return null;
              }
              
              // Normalize input: trim and lowercase
              const normalizedInput = skillInput.trim().toLowerCase();
              
              // First check if it's already an ID
              const skillById = availableSkills.find(s => s.id === skillInput || s.id === normalizedInput);
              if (skillById) {
                return skillById.id;
              }
              
              // Then check if it's a name (with flexible matching)
              const skillByName = availableSkills.find(s => {
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
          api.removeUserSkill(skillId).catch(err => {
            console.warn(`⚠️ Failed to remove skill ${skillId}:`, err);
            return null;
          })
        );
        
        // Add new skills (only add ones not already present)
        const skillsToActuallyAdd = skillIdsToAdd.filter((skillId: string) => 
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
          console.warn('⚠️ Available skill names (first 10):', availableSkills.slice(0, 10).map(s => s.name));
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
    const cacheKey = 'my-team-members';
    return rateLimiter.execute(cacheKey, async () => {
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
        // Handle rate limiting gracefully
        if (err.status === 429 || err.statusCode === 429 || err.message?.includes('429')) {
          console.warn('⚠️ Rate limited on getMyTeamMembers, returning empty result');
          return { success: true, data: [] };
        }
        console.error('❌ Failed to fetch personal team members:', err);
        return { success: false, data: [], error: 'Failed to fetch personal team members' };
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // Team members change when users join/leave - 5min TTL with persistence
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
    const cacheKey = `complete-user-profile-${userId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('👤 Fetching complete user profile for:', userId);
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
              console.warn('⚠️ Rate limited on fetchCompleteUserProfile (users list)');
              return userData || null;
            }
          } catch (err) {
            console.warn('⚠️ Failed to fetch user from users list:', err);
          }
        }
        
        // If still not found, return null
        if (!userBasicInfo || userBasicInfo.id !== userId) {
          console.warn(`⚠️ User ${userId} not found in users list`);
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
          console.warn('⚠️ Rate limited on fetchCompleteUserProfile (user details)');
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
              console.warn('⚠️ Rate limited on fetchCompleteUserProfile (talent profile)');
            }
          } catch (err) {
            console.warn('⚠️ Failed to fetch talent profile:', err);
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
        console.error('❌ Failed to fetch complete user profile:', err);
        // Return existing userData if available, otherwise null
        return userData || null;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true });
  };

  // Direct fetch method for getting users
  const getUsersDirect = async (params: { limit?: number; page?: number } = {}) => {
    const cacheKey = `users-direct-${params.limit || 'all'}-${params.page || 1}`;
    return rateLimiter.execute(cacheKey, async () => {
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
          // Handle rate limiting
          if (response.status === 429) {
            console.warn('⚠️ Rate limited on getUsersDirect');
            throw new Error('Rate limited. Please try again later.');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Users fetched successfully:', result);
        return result;
      } catch (err: any) {
        console.error('❌ Failed to fetch users:', err);
        // If rate limited, return empty result
        if (err.message?.includes('429') || err.message?.includes('Rate limited')) {
          console.warn('⚠️ Rate limited on getUsersDirect, returning empty result');
          return { success: true, data: [] };
        }
        throw err;
      }
    }, { ttl: CacheTTL.SHORT }); // Users list changes frequently - 30s TTL for fresh data
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

  // Social media links management methods
  const getUserSocialLinks = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    const cacheKey = userId ? `user-social-links-${userId}` : 'user-social-links';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('🔗 Fetching user social links...', userId ? `for user ${userId}` : 'for current user');
        const accessToken = getAccessToken();
        const url = userId 
          ? `${baseUrl}/api/social-links?user_id=${userId}`
          : `${baseUrl}/api/social-links`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error('❌ Failed to fetch social links:', result);
          throw new Error(result.error || 'Failed to fetch social links');
        }

        console.log('✅ Social links fetched successfully:', result.data?.length || 0, 'links');
        return result;
      } catch (error: any) {
        console.error('❌ Failed to fetch social links:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // Social links change when user updates profile - 5min TTL with persistence
  };

  const addSocialLink = async (linkData: { platform: string; url: string; is_custom?: boolean }) => {
    try {
      console.log('➕ Adding social link:', linkData);
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/social-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          platform: linkData.platform,
          url: linkData.url,
          is_custom: linkData.is_custom || false,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Failed to add social link:', result);
        throw new Error(result.error || 'Failed to add social link');
      }

      // Invalidate social links cache
      await rateLimiter.clearCache('user-social-links');
      
      console.log('✅ Social link added successfully:', result.data);
      return result;
    } catch (error: any) {
      console.error('❌ Failed to add social link:', error);
      throw error;
    }
  };

  const updateSocialLink = async (linkId: string, updates: { platform?: string; url?: string; is_custom?: boolean }) => {
    try {
      console.log('✏️ Updating social link:', linkId, updates);
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/social-links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Failed to update social link:', result);
        throw new Error(result.error || 'Failed to update social link');
      }

      // Invalidate social links cache
      await rateLimiter.clearCache('user-social-links');
      
      console.log('✅ Social link updated successfully:', result.data);
      return result;
    } catch (error: any) {
      console.error('❌ Failed to update social link:', error);
      throw error;
    }
  };

  const deleteSocialLink = async (linkId: string) => {
    try {
      console.log('🗑️ Deleting social link:', linkId);
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/social-links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Failed to delete social link:', result);
        throw new Error(result.error || 'Failed to delete social link');
      }

      // Invalidate social links cache
      await rateLimiter.clearCache('user-social-links');
      
      console.log('✅ Social link deleted successfully');
      return result;
    } catch (error: any) {
      console.error('❌ Failed to delete social link:', error);
      throw error;
    }
  };

  // Profile picture management methods
  const getUserProfilePictures = async (userId: string) => {
    try {
      console.log('🖼️ Fetching profile pictures for user:', userId);
      const response = await api.getUserProfilePictures(userId);
      console.log('✅ Profile pictures fetched successfully:', response.data?.length || 0, 'pictures');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch profile pictures:', error);
      throw error;
    }
  };

  const uploadProfilePicture = async (file: any, isMain: boolean = false) => {
    try {
      console.log('📤 Uploading profile picture, isMain:', isMain);
      const response = await api.uploadProfilePicture(file, isMain);
      console.log('✅ Profile picture uploaded successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to upload profile picture:', error);
      throw error;
    }
  };

  const setMainProfilePicture = async (userId: string, pictureId: string) => {
    try {
      console.log('⭐ Setting main profile picture:', pictureId, 'for user:', userId);
      const response = await api.setMainProfilePicture(userId, pictureId);
      console.log('✅ Main profile picture set successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to set main profile picture:', error);
      throw error;
    }
  };

  const deleteProfilePicture = async (userId: string, pictureId: string) => {
    try {
      console.log('🗑️ Deleting profile picture:', pictureId, 'for user:', userId);
      const response = await api.deleteProfilePicture(userId, pictureId);
      console.log('✅ Profile picture deleted successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to delete profile picture:', error);
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
      const response = await fetch(`${baseUrl}/api/media/upload`, {
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
      return { 
        success: true,
        data: uploadResponse 
      };
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
      const response = await api.updateProject(projectId, updates);
      if (response.success && response.data) {
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
      // Try getMyProjects first (returns projects where user is owner or member)
      let projects: any[] = [];
      try {
        const myProjectsResponse = await api.getMyProjects();
        if (myProjectsResponse.success && myProjectsResponse.data) {
          // Handle paginated response structure: response.data.data is the array
          if (Array.isArray(myProjectsResponse.data)) {
            projects = myProjectsResponse.data;
          } else if (myProjectsResponse.data.data && Array.isArray(myProjectsResponse.data.data)) {
            projects = myProjectsResponse.data.data;
          } else if ((myProjectsResponse.data as any).items && Array.isArray((myProjectsResponse.data as any).items)) {
            projects = (myProjectsResponse.data as any).items;
          }
        }
      } catch (err) {
        // Silently fail - will try fallback
      }
      
      // Fetch full project details to get members array
      const enrichedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const projectDetailsResponse = await api.getProjectById(project.id);
            if (projectDetailsResponse.success && projectDetailsResponse.data) {
              const fullProject = projectDetailsResponse.data;
              return {
                ...project,
                members: fullProject.members || [],
                description: fullProject.description || project.description,
                status: fullProject.status || project.status,
                type: fullProject.type || project.type,
              };
            }
          } catch (err) {
            // Silently fail - return project as-is
          }
          return project;
        })
      );
      
      return enrichedProjects;
    } catch (error) {
      console.error('❌ Failed to get all user projects:', error);
      throw error;
    }
  };

  const getProjectTasks = async (projectId: string): Promise<TaskWithAssignments[]> => {
    try {
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
      const response = await api.getProjectById(projectId);
      
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
      const response = await api.createTask(projectId, taskData);
      
      if (response.success && response.data) {
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
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Return in the format expected by components
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('❌ Failed to update task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/projects/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to delete task:', error);
      throw error;
    }
  };

  const assignTaskService = async (projectId: string, taskId: string, assignment: AssignTaskServiceRequest) => {
    try {
      console.log('📋 Assigning task service:', {
        projectId,
        taskId,
        service_role: assignment.service_role,
        user_id: assignment.user_id
      });
      
      // Validate required fields
      if (!assignment.user_id) {
        throw new Error('user_id is required for task assignment');
      }
      if (!assignment.service_role) {
        throw new Error('service_role is required for task assignment');
      }
      
      // Convert service_role to UserRole type
      const apiAssignment = {
        ...assignment,
        service_role: assignment.service_role as any, // Type assertion for now
      };
      
      const response = await api.assignTaskService(projectId, taskId, apiAssignment);
      
      if (response.success && response.data) {
        console.log('✅ Task assignment successful:', response.data);
        // Handle both array and single object response
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data && typeof response.data === 'object' && 'id' in response.data) {
          // Single assignment object - return as array with one element
          return [response.data];
        } else if ((response.data as any).data) {
          // Nested data property
          const nestedData = (response.data as any).data;
          return Array.isArray(nestedData) ? nestedData : [nestedData];
        } else {
          // Fallback: return empty array (shouldn't happen)
          console.warn('⚠️ Unexpected response.data format:', response.data);
          return [];
        }
      } else {
        const errorMessage = response.error || 'Failed to assign task service';
        console.error('❌ Assignment failed:', {
          error: errorMessage,
          response: response,
          assignment: apiAssignment
        });
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Failed to assign task service:', {
        error: error.message || error,
        errorDetails: error.response || error.data || error,
        projectId,
        taskId,
        assignment
      });
      
      // Provide more helpful error message
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        throw new Error('Server error: Unable to assign task service. Please try again or contact support.');
      }
      
      throw error;
    }
  };

  const deleteTaskAssignment = async (projectId: string, taskId: string, assignmentId: string) => {
    try {
      console.log('🗑️ Deleting task assignment:', {
        projectId,
        taskId,
        assignmentId,
        url: `${baseUrl}/api/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`
      });
      
      // Validate UUID format (per guide)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assignmentId)) {
        throw new Error(`Invalid UUID format: ${assignmentId}`);
      }
      
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`${baseUrl}/api/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      console.log('📥 Delete assignment response:', {
        status: response.status,
        ok: response.ok,
        data
      });
      
      // Handle specific HTTP status codes (per guide)
      if (response.status === 400) {
        const errorMessage = data.error || data.message || 'Invalid request';
        if (errorMessage.includes('UUID') || errorMessage.includes('Invalid')) {
          throw new Error(`Invalid UUID: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      } else if (response.status === 403) {
        throw new Error('You do not have permission to remove this assignment');
      } else if (response.status === 404) {
        // Assignment not found - might already be deleted (per guide)
        console.warn('⚠️ Assignment not found (404), may already be deleted');
        return {
          success: true,
          data: null,
          message: 'Assignment not found (may already be deleted)'
        };
      } else if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ HTTP Error deleting assignment:', {
          status: response.status,
          error: errorMessage,
          data
        });
        throw new Error(errorMessage);
      }
      
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Failed to delete assignment';
        console.error('❌ API Error deleting assignment:', {
          error: errorMessage,
          data
        });
        throw new Error(errorMessage);
      }
      
      console.log('✅ Assignment successfully deleted from backend');
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('❌ Failed to delete task assignment:', {
        error: error.message || error,
        projectId,
        taskId,
        assignmentId,
        stack: error.stack
      });
      throw error;
    }
  };

  const updateTaskAssignmentStatus = async (
    projectId: string, 
    taskId: string, 
    assignmentId: string, 
    status: 'accepted' | 'rejected'
  ) => {
    try {
      console.log('📋 Updating task assignment status:', { 
        projectId, 
        taskId, 
        assignmentId, 
        status 
      });
      const accessToken = getAccessToken();
      
      const url = `${baseUrl}/api/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`;
      console.log('🌐 Making request to:', url);
      console.log('📤 Request body:', JSON.stringify({ status }));
      console.log('📤 Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken?.substring(0, 20)}...`
      });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      console.log('✅ Response received:', JSON.stringify(data).substring(0, 200));
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ HTTP Error:', response.status, errorMessage);
        console.error('❌ Full error response:', JSON.stringify(data));
        throw new Error(errorMessage);
      }
      
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Failed to update assignment status';
        console.error('❌ API Error:', errorMessage);
        console.error('❌ Full error response:', JSON.stringify(data));
        throw new Error(errorMessage);
      }
      
      console.log('✅ Task assignment status updated successfully');
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('❌ Failed to update assignment status:', {
        error: error.message || error,
        projectId,
        taskId,
        assignmentId,
        status,
        stack: error.stack
      });
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: UpdateTaskStatusRequest) => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/projects/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(typeof status === 'object' ? status : { status }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Failed to update task status:', error);
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

  // Profile Switching Methods
  const switchToUserProfile = () => {
    setCurrentProfileType('user');
    setActiveCompany(null);
    AsyncStorage.setItem('currentProfileType', 'user');
    AsyncStorage.removeItem('activeCompanyId');
    console.log('✅ Switched to user profile');
  };

  const switchToCompanyProfile = async (companyId: string) => {
    try {
      // Verify user is owner of this company before allowing switch
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Get user's companies to check ownership
      const userCompaniesResponse = await getUserCompanies(user.id);
      if (userCompaniesResponse.success && userCompaniesResponse.data) {
        const responseData = userCompaniesResponse.data as any;
        const companies = Array.isArray(responseData) 
          ? responseData 
          : (responseData.data || []);
        
        // Find the company and check if user is owner
        const companyMember = companies.find((cm: any) => {
          const cmCompanyId = cm.companies?.id || cm.company_id || cm.id;
          return cmCompanyId === companyId;
        });
        
        if (!companyMember) {
          throw new Error('Company not found in your companies list');
        }
        
        const role = companyMember.role || companyMember.member?.role;
        if (role !== 'owner') {
          throw new Error('Only company owners can switch to company profiles');
        }
      }
      
      // Load and switch to company
      const companyResponse = await api.getCompany(companyId);
      if (companyResponse.success && companyResponse.data) {
        setActiveCompany(companyResponse.data);
        setCurrentProfileType('company');
        await AsyncStorage.setItem('currentProfileType', 'company');
        await AsyncStorage.setItem('activeCompanyId', companyId);
        console.log('✅ Switched to company profile:', companyId);
      } else {
        throw new Error('Failed to load company');
      }
    } catch (error) {
      console.error('Failed to switch to company profile:', error);
      throw error;
    }
  };

  const getActiveCompany = () => {
    return activeCompany;
  };

  // Company Management Methods
  const getCompanyTypes = async () => {
    try {
      const response = await api.getCompanyTypes();
      return response;
    } catch (error) {
      console.error('Failed to get company types:', error);
      throw error;
    }
  };

  const getCompanyType = async (code: string) => {
    try {
      const response = await api.getCompanyType(code as any);
      return response;
    } catch (error) {
      console.error('Failed to get company type:', error);
      throw error;
    }
  };

  const getCompanyTypeServices = async (code: string) => {
    try {
      const response = await api.getCompanyTypeServices(code as any);
      return response;
    } catch (error) {
      console.error('Failed to get company type services:', error);
      throw error;
    }
  };

  const createCompany = async (companyData: any) => {
    try {
      console.log('🏢 Creating company (quick create - bypasses profile completeness):', companyData);
      
      // Ensure required fields are present
      if (!companyData.name || !companyData.subcategory) {
        return {
          success: false,
          error: 'Company name and subcategory are required',
          data: null
        };
      }
      
      // Use quickCreateCompany instead of createCompany to bypass profile completeness requirement
      // According to the library, quickCreateCompany:
      // - Bypasses the profile completeness check
      // - Returns ApiResponse<Company> if successful
      // - Throw ApiError if status is not OK (404, 500, etc.)
      const response = await api.quickCreateCompany(companyData);
      
      // Handle successful response (should have success: true and data)
      if (response && response.success && response.data) {
        console.log('✅ Company created successfully:', response.data);
        
        // Clear the user companies cache so the new company appears immediately
        if (user?.id) {
          const cacheKey = `user-companies-${user.id}`;
          await rateLimiter.clearCache(cacheKey);
          console.log('🗑️ Cleared cache for user companies to show newly created company');
        }
        
        return response;
      }
      
      // Handle response with success: false (shouldn't happen per library design, but handle it)
      if (response && response.success === false) {
        console.error('Company creation failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to create company',
          data: null
        };
      }
      
      // Unexpected response format
      console.warn('⚠️ Unexpected response format:', response);
      return {
        success: false,
        error: 'Unexpected response from server',
        data: null
      };
    } catch (error: any) {
      console.error('Failed to create company:', error);
      
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        // Check for 404 - endpoint not found
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
            data: null
          };
        }
        
        // Other API errors (400, 500, etc.)
        return {
          success: false,
          error: error.message || `Server error (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Handle other error types
      const errorMessage = error?.message || String(error) || 'Failed to create company';
      
      // Check for endpoint not found in error message (fallback)
      if (errorMessage.includes('404') || 
          (errorMessage.includes('Route') && errorMessage.includes('not found')) ||
          errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
          data: null
        };
      }
      
      // Generic error response
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  };

  const getCompany = async (companyId: string) => {
    const cacheKey = `company-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCompany(companyId);
        return response;
      } catch (error) {
        console.error('Failed to get company:', error);
        throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // Company data changes rarely - 30min TTL with persistence
  };

  const updateCompany = async (companyId: string, updates: any) => {
    try {
      const response = await api.updateCompany(companyId, updates);
      if (response.success) {
        if (activeCompany?.id === companyId) {
          setActiveCompany(response.data);
        }
        // Invalidate company cache
        await rateLimiter.clearCache(`company-${companyId}`);
        await rateLimiter.clearCacheByPattern(`companies-`);
      }
      return response;
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  };

  const uploadCompanyLogo = async (companyId: string, file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading company logo:', file.name);
      console.log('🔍 File details:', {
        uri: file.uri,
        type: file.type,
        name: file.name,
        uriType: typeof file.uri,
      });
      
      // Ensure we have a proper file name
      const fileName = file.name || `company_logo_${Date.now()}.jpg`;
      // Ensure we have a proper MIME type
      const fileType = file.type || 'image/jpeg';
      
      // Handle React Native file URI - ensure it's in the correct format
      // For React Native, the URI might be file:// or content://
      let fileUri = file.uri;
      if (Platform.OS === 'android' && fileUri.startsWith('content://')) {
        // Android content URI - should work as is
        console.log('📱 Using Android content URI');
      } else if (fileUri.startsWith('file://')) {
        // File URI - should work as is
        console.log('📁 Using file URI');
      }
      
      const formData = new FormData();
      
      // Append file in React Native format
      // React Native FormData expects: { uri, type, name }
      formData.append('logo', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);
      
      formData.append('company_id', companyId);

      const accessToken = getAccessToken();
      
      console.log('🔍 FormData prepared:', {
        hasLogo: true,
        companyId: companyId,
        fileName: fileName,
        fileType: fileType,
      });
      
      const response = await fetch(`${baseUrl}/api/upload/company`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Don't set Content-Type - let fetch() handle it with proper boundary
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Company logo upload failed with status:', response.status);
        console.error('❌ Response:', result);
        console.error('❌ Full error details:', JSON.stringify(result, null, 2));
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
      }

      console.log('✅ Company logo uploaded successfully:', result);
      
      // Invalidate company cache to refresh with new logo
      await rateLimiter.clearCache(`company-${companyId}`);
      await rateLimiter.clearCacheByPattern(`companies-`);
      
      // Update active company if it matches
      if (activeCompany?.id === companyId && result.data?.url) {
        setActiveCompany({ ...activeCompany, logo_url: result.data.url });
      }
      
      return {
        success: true,
        data: {
          url: result.data?.url || result.url,
          filename: result.data?.filename || result.filename || fileName,
        },
        message: result.message || 'Company logo uploaded successfully',
      };
    } catch (error: any) {
      console.error('❌ Failed to upload company logo:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  };

  const getUserCompanies = async (userId: string) => {
    const cacheKey = `user-companies-${userId}`;
    // Use MEDIUM TTL instead of LONG since companies can change frequently when users are creating/managing them
    // This ensures newly created or updated companies appear within 5 minutes instead of 30 minutes
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getUserCompanies(userId);
        return response;
      } catch (error: any) {
        // Handle 403 (Unauthorized) - users can only view their own companies
        if (error.status === 403 || error.statusCode === 403 || error.message?.includes('403') || error.message?.includes('Unauthorized')) {
          console.warn('⚠️ Unauthorized to view companies for this user (403). Only showing companies for own profile.');
          return { success: true, data: [] };
        }
        // If rate limited, return empty result instead of throwing
        if (error.status === 429 || error.message?.includes('429')) {
          console.warn('⚠️ Rate limited on getUserCompanies, returning empty result');
          return { success: true, data: [] };
        }
        console.error('Failed to get user companies:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // User companies change when user joins/leaves - 5min TTL with persistence
  };

  const submitCompanyForApproval = async (companyId: string) => {
    try {
      // Use the correct endpoint: /api/companies/{id}/submit (not /submit-for-approval)
      // Access the underlying apiClient directly to use the correct endpoint
      const apiClient = (api as any).apiClient;
      let response;
      if (apiClient && typeof apiClient.post === 'function') {
        response = await apiClient.post(`/api/companies/${companyId}/submit`, {});
      } else {
        // Fallback: try the library method (will fail with 404, but we'll handle it)
        response = await api.submitCompanyForApproval(companyId);
      }
      
      // If successful, clear cache and update active company
      if (response.success && response.data) {
        if (activeCompany?.id === companyId) {
          setActiveCompany(response.data);
        }
        
        // Clear the user companies cache so the updated approval status appears immediately
        if (user?.id) {
          const cacheKey = `user-companies-${user.id}`;
          await rateLimiter.clearCache(cacheKey);
          console.log('🗑️ Cleared cache for user companies to show updated approval status');
        }
      }
      
      return response;
    } catch (error: any) {
      console.error('Failed to submit company for approval:', error);
      
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        // Check for 404 - endpoint not found
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Company approval submission endpoint is not yet available on the backend.',
            data: null
          };
        }
        
        // Check for 400 - validation error (e.g., documents required)
        if (error.statusCode === 400) {
          // Provide helpful message based on error content
          const errorMessage = error.message || '';
          if (errorMessage.toLowerCase().includes('document')) {
            return {
              success: false,
              error: 'Please upload at least one document before submitting for approval. Go to the Documents step and upload the required company documents.',
              data: null
            };
          }
          return {
            success: false,
            error: errorMessage || 'Validation error: Please check your company information and try again.',
            data: null
          };
        }
        
        // Other API errors (500, etc.)
        return {
          success: false,
          error: error.message || `Server error (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Handle other error types
      const errorMessage = error?.message || String(error) || 'Failed to submit company for approval';
      
      // Check for endpoint not found in error message (fallback)
      if (errorMessage.includes('404') || 
          (errorMessage.includes('Route') && errorMessage.includes('not found')) ||
          errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Company approval submission endpoint is not yet available on the backend.',
          data: null
        };
      }
      
      // Generic error response
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  };

  const getCompanies = async (params?: any) => {
    const cacheKey = `companies-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCompanies(params);
        return response;
      } catch (error: any) {
        // Handle rate limiting gracefully
        if (error.status === 429 || error.statusCode === 429 || error.message?.includes('429')) {
          console.warn('⚠️ Rate limited on getCompanies, returning empty result');
          return { success: true, data: [] };
        }
        console.error('Failed to get companies:', error);
        throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // Company listings change rarely - 30min TTL with persistence
  };

  // Company Services Methods
  const getAvailableServicesForCompany = async (companyId: string) => {
    try {
      const response = await api.getAvailableServicesForCompany(companyId);
      return response;
    } catch (error) {
      console.error('Failed to get available services for company:', error);
      throw error;
    }
  };

  const getCompanyServices = async (companyId: string) => {
    const cacheKey = `company-services-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCompanyServices(companyId);
        return response;
      } catch (error) {
        console.error('Failed to get company services:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM }); // Company services change when services are added/removed - 5min TTL
  };

  const addCompanyService = async (companyId: string, serviceId: string) => {
    try {
      const response = await api.addCompanyService(companyId, serviceId);
      if (response.success) {
        // Invalidate company services cache
        await rateLimiter.clearCache(`company-services-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to add company service:', error);
      throw error;
    }
  };

  const removeCompanyService = async (companyId: string, serviceId: string) => {
    try {
      const response = await api.removeCompanyService(companyId, serviceId);
      if (response.success) {
        // Invalidate company services cache
        await rateLimiter.clearCache(`company-services-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to remove company service:', error);
      throw error;
    }
  };

  // Company Members Methods
  const addCompanyMember = async (companyId: string, memberData: any) => {
    try {
      const response = await api.addCompanyMember(companyId, memberData);
      
      // Check if response indicates an error (even if no exception was thrown)
      if (response && !response.success && response.error) {
        const errorMsg = response.error || '';
        if (errorMsg.includes('duplicate key') || errorMsg.includes('company_members_pkey')) {
          console.warn('⚠️ Duplicate key error detected - member record may still exist');
          return {
            success: false,
            error: 'This user was previously a member. The record may still exist in the database. Please contact support or wait a moment before trying again.',
          };
        }
      }
      
      if (response.success) {
        // Invalidate company members cache - clear all variations
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
        // Also clear any cache with different parameter combinations
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}-`);
        console.log('🔄 Cleared company members cache after adding member');
      }
      return response;
    } catch (error: any) {
      console.error('❌ Failed to add company member:', error);
      
      // Check if error response contains the duplicate key error
      // Handle different error formats (ApiError, fetch error, etc.)
      let errorMsg = '';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error.error) {
        errorMsg = error.error;
      }
      
      // Try to parse JSON error if it's a string
      if (typeof errorMsg === 'string' && errorMsg.includes('{')) {
        try {
          const parsed = JSON.parse(errorMsg);
          errorMsg = parsed.error || errorMsg;
        } catch {
          // Not JSON, use as is
        }
      }
      
      if (errorMsg.includes('duplicate key') || errorMsg.includes('company_members_pkey')) {
        console.warn('⚠️ Duplicate key error detected - member record may still exist');
        return {
          success: false,
          error: 'This user was previously a member. The record may still exist in the database. Please contact support or wait a moment before trying again.',
        };
      }
      
      throw error;
    }
  };

  const getCompanyMembers = async (companyId: string, params?: any) => {
    const cacheKey = `company-members-${companyId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      // Always use direct apiClient to have better control over error handling
      // This prevents the library from logging errors before we can handle them
      const apiClient = (api as any).apiClient;
    
    if (!apiClient || typeof apiClient.get !== 'function') {
      // Fallback: try library method, but wrap it to catch errors early
      try {
        const response = await api.getCompanyMembers(companyId, params);
        if (response && response.success) {
          return response;
        }
        // If response has success: false, check if it's a 500 error
        if (response && response.success === false && response.error?.includes('500')) {
          console.warn('⚠️ Server error fetching members (500). Returning empty list.');
          return { success: true, data: [] };
        }
        return response;
      } catch (error: any) {
        // Handle errors from library method
        if (error.status === 500 || error.statusCode === 500 || error.message?.includes('500') || error.message?.includes('Failed to fetch members')) {
          console.warn('⚠️ Server error fetching members (500). Returning empty list.');
          return { success: true, data: [] };
        }
        throw error;
      }
    }
    
    try {
      // Build query string from params object
      let queryString = '';
      if (params) {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            queryParams.append(key, params[key].toString());
          }
        });
        queryString = queryParams.toString();
      }
      
      const url = `/api/companies/${companyId}/members${queryString ? '?' + queryString : ''}`;
      console.log('🔍 Fetching company members:', {
        companyId,
        url,
        params,
        queryString
      });
      
      // Use direct apiClient.get to have full control over error handling
      const response = await apiClient.get(url, {
        retries: 0 // Disable retries - we'll handle errors ourselves
      });
      
      console.log('✅ Company members response:', {
        success: response?.success,
        hasData: !!response?.data,
        dataType: Array.isArray(response?.data) ? 'array' : typeof response?.data,
        dataStructure: response?.data ? Object.keys(response.data) : 'no data'
      });
      
      // Handle successful response
      if (response && response.success) {
        return response;
      }
      
      // Handle response with success: false (from API)
      // This happens when the API returns an error response (like 500)
      if (response && response.success === false) {
        // Check if it's a 500 error or any server error
        const errorMessage = response.error || '';
        console.error('❌ API returned error response:', {
          success: response.success,
          error: errorMessage,
          fullResponse: JSON.stringify(response, null, 2)
        });
        
        if (errorMessage.includes('500') || 
            errorMessage.includes('Failed to fetch') || 
            errorMessage.includes('Server error') ||
            errorMessage.toLowerCase().includes('internal server error')) {
          // Return gracefully for server errors - don't propagate the error
          console.warn('⚠️ Server error from API response (500). Returning empty list.');
          console.warn('⚠️ This is likely a backend issue. Check backend logs for:', {
            endpoint: `/api/companies/${companyId}/members`,
            params: params,
            companyId
          });
          return { success: true, data: [] };
        }
        // For other errors (400, 401, etc.), return the response as-is
        return response;
      }
      
      // Unexpected response format
      return {
        success: false,
        error: 'Unexpected response from server',
        data: []
      };
    } catch (error: any) {
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        // Check for 404 - endpoint not found
        if (error.statusCode === 404) {
          console.warn('⚠️ Company members endpoint not found (404). Returning empty list.');
          return {
            success: true, // Return success with empty data
            data: []
          };
        }
        
        // For 500 errors or other server errors, return empty array gracefully
        if (error.statusCode === 500 || (error.statusCode && error.statusCode >= 500)) {
          console.error('❌ HTTP 500 Error fetching company members:', {
            companyId,
            params,
            errorMessage: error.message,
            statusCode: error.statusCode,
            fullError: JSON.stringify(error, null, 2)
          });
          console.warn('⚠️ Server error fetching members (500). Returning empty list.');
          console.warn('⚠️ POTENTIAL BACKEND ISSUES:');
          console.warn('   - Database query might be failing');
          console.warn('   - Invalid sort parameter (joined_at might not exist)');
          console.warn('   - Missing database relationships');
          console.warn('   - Company record might have issues');
          return {
            success: true, // Return success with empty data to avoid UI errors
            data: []
          };
        }
        
        // For 403 (Unauthorized) - user might not have permission
        if (error.statusCode === 403) {
          console.warn('⚠️ Unauthorized to view company members (403). Returning empty list.');
          return {
            success: true,
            data: []
          };
        }
      }
      
      // Check for error status in error object (from direct apiClient call)
      if (error.status === 500 || error.statusCode === 500 || error.message?.includes('500') || error.message?.includes('Failed to fetch members')) {
        console.warn('⚠️ Server error fetching members (500). Returning empty list.');
        return {
          success: true,
          data: []
        };
      }
      
      // For 404 - endpoint not found
      if (error.status === 404 || error.statusCode === 404) {
        console.warn('⚠️ Company members endpoint not found (404). Returning empty list.');
        return {
          success: true,
          data: []
        };
      }
      
      // For 403 - unauthorized
      if (error.status === 403 || error.statusCode === 403) {
        console.warn('⚠️ Unauthorized to view company members (403). Returning empty list.');
        return {
          success: true,
          data: []
        };
      }
      
      // Log other errors but still return gracefully
      console.warn('⚠️ Error fetching company members:', error.message || error);
      
      // For any other error, return empty array gracefully
      return {
        success: true, // Return success with empty data to prevent UI errors
        data: []
      };
    }
    }, { ttl: CacheTTL.MEDIUM }); // Company members change when users join/leave - 5min TTL
  };

  const acceptInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.acceptInvitation(companyId, userId);
      if (response.success) {
        // Invalidate company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
        // Invalidate user companies cache
        await rateLimiter.clearCache(`user-companies-${userId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  };

  const rejectInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.rejectInvitation(companyId, userId);
      return response;
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      throw error;
    }
  };

  const cancelInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.cancelInvitation(companyId, userId);
      return response;
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      throw error;
    }
  };

  const getPendingInvitations = async (userId: string) => {
    try {
      const response = await api.getPendingInvitations(userId);
      return response;
    } catch (error) {
      console.error('Failed to get pending invitations:', error);
      throw error;
    }
  };

  const updateCompanyMemberRole = async (companyId: string, userId: string, role: string) => {
    try {
      const response = await api.updateCompanyMemberRole(companyId, userId, role as any);
      return response;
    } catch (error) {
      console.error('Failed to update company member role:', error);
      throw error;
    }
  };

  const removeCompanyMember = async (companyId: string, userId: string) => {
    try {
      const response = await api.removeCompanyMember(companyId, userId);
      if (response.success) {
        // Invalidate company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to remove company member:', error);
      throw error;
    }
  };

  const transferCompanyOwnership = async (companyId: string, newOwnerId: string) => {
    try {
      const response = await api.transferCompanyOwnership(companyId, newOwnerId);
      if (response.success && activeCompany?.id === companyId) {
        setActiveCompany(response.data);
      }
      return response;
    } catch (error) {
      console.error('Failed to transfer company ownership:', error);
      throw error;
    }
  };

  const leaveCompany = async (companyId: string) => {
    try {
      const response = await api.leaveCompany(companyId);
      if (activeCompany?.id === companyId) {
        switchToUserProfile();
      }
      return response;
    } catch (error) {
      console.error('Failed to leave company:', error);
      throw error;
    }
  };

  // Company Documents Methods
  const getCompanyDocuments = async (companyId: string) => {
    try {
      const response = await api.getCompanyDocuments(companyId);
      return response;
    } catch (error) {
      console.error('Failed to get company documents:', error);
      throw error;
    }
  };

  const addCompanyDocument = async (companyId: string, documentData: { document_type: string; file_url: string; file_name?: string; description?: string }) => {
    try {
      // Use the apiClient directly to POST to /api/companies/{id}/documents
      const apiClient = (api as any).apiClient;
      if (apiClient && typeof apiClient.post === 'function') {
        const response = await apiClient.post(`/api/companies/${companyId}/documents`, documentData);
        return response;
      } else {
        throw new Error('API client not available');
      }
    } catch (error: any) {
      console.error('Failed to add company document:', error);
      
      // Handle ApiError
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message || `Failed to add document (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Return error response instead of throwing
      return {
        success: false,
        error: error?.message || 'Failed to add company document',
        data: null
      };
    }
  };

  const deleteCompanyDocument = async (companyId: string, documentId: string) => {
    try {
      const response = await api.deleteCompanyDocument(companyId, documentId);
      return response;
    } catch (error) {
      console.error('Failed to delete company document:', error);
      throw error;
    }
  };

  // Certification Template Management (Admin)
  const getCertificationTemplates = async (query?: { active?: boolean; category?: string }) => {
    const cacheKey = `certification-templates-${JSON.stringify(query || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCertificationTemplates(query);
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw new Error(response.error || 'Failed to get certification templates');
    } catch (error) {
      console.error('Failed to get certification templates:', error);
      throw error;
    }
    }, { ttl: CacheTTL.VERY_LONG, persistent: true }); // Certification templates are static reference data - 1hr TTL with persistence
  };

  const getCertificationTemplate = async (templateId: string) => {
    try {
      const response = await api.getCertificationTemplate(templateId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get certification template');
    } catch (error) {
      console.error('Failed to get certification template:', error);
      throw error;
    }
  };

  const createCertificationTemplate = async (templateData: CreateCertificationTemplateRequest) => {
    try {
      const response = await api.createCertificationTemplate(templateData);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to create certification template');
    } catch (error) {
      console.error('Failed to create certification template:', error);
      throw error;
    }
  };

  const updateCertificationTemplate = async (templateId: string, updates: UpdateCertificationTemplateRequest) => {
    try {
      const response = await api.updateCertificationTemplate(templateId, updates);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update certification template');
    } catch (error) {
      console.error('Failed to update certification template:', error);
      throw error;
    }
  };

  const deleteCertificationTemplate = async (templateId: string) => {
    try {
      const response = await api.deleteCertificationTemplate(templateId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to delete certification template');
    } catch (error) {
      console.error('Failed to delete certification template:', error);
      throw error;
    }
  };

  // Academy Authorization Management (Admin)
  const authorizeAcademyForCertification = async (academyId: string, templateId: string) => {
    try {
      const response = await api.authorizeAcademyForCertification(academyId, templateId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to authorize academy');
    } catch (error) {
      console.error('Failed to authorize academy:', error);
      throw error;
    }
  };

  const revokeAcademyAuthorization = async (academyId: string, templateId: string) => {
    try {
      const response = await api.revokeAcademyAuthorization(academyId, templateId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to revoke academy authorization');
    } catch (error) {
      console.error('Failed to revoke academy authorization:', error);
      throw error;
    }
  };

  const bulkAuthorizeAcademies = async (bulkData: BulkAuthorizationRequest) => {
    try {
      const response = await api.bulkAuthorizeAcademies(bulkData);
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw new Error(response.error || 'Failed to bulk authorize academies');
    } catch (error) {
      console.error('Failed to bulk authorize academies:', error);
      throw error;
    }
  };

  const getAcademyAuthorizations = async (academyId: string) => {
    try {
      const response = await api.getAcademyAuthorizations(academyId);
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw new Error(response.error || 'Failed to get academy authorizations');
    } catch (error) {
      console.error('Failed to get academy authorizations:', error);
      throw error;
    }
  };

  // Certification Management (Academy/Company)
  const getAuthorizedCertifications = async (companyId: string) => {
    const cacheKey = `authorized-certifications-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('🔍 API: Fetching authorized certifications for company:', companyId);
      const response = await api.getAuthorizedCertifications(companyId);
      console.log('🔍 API: Response received:', {
        success: response.success,
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
      });
      
      if (response.success && response.data) {
        const data = response.data as any;
        const result = Array.isArray(data) ? data : (data.data || []);
        console.log('✅ API: Returning authorized certifications:', result.length);
        return result;
      }
      
      console.warn('⚠️ API: Response indicates failure:', response.error);
      throw new Error(response.error || 'Failed to get authorized certifications');
    } catch (error: any) {
      console.error('❌ API: Failed to get authorized certifications:', {
        message: error.message,
        statusCode: error.statusCode,
        status: error.status
      });
      throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // Authorized certifications change rarely - 30min TTL with persistence
  };

  const grantCertification = async (companyId: string, certificationData: CreateCertificationRequest) => {
    try {
      const response = await api.grantCertification(companyId, certificationData);
      if (response.success && response.data) {
        // Invalidate certification caches
        await rateLimiter.clearCache(`company-certifications-${companyId}`);
        if (certificationData.user_id) {
          await rateLimiter.clearCache(`user-certifications-${certificationData.user_id}`);
        }
        return response.data;
      }
      throw new Error(response.error || 'Failed to grant certification');
    } catch (error) {
      console.error('Failed to grant certification:', error);
      throw error;
    }
  };

  const getCompanyCertifications = async (companyId: string) => {
    const cacheKey = `company-certifications-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCompanyCertifications(companyId);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get company certifications');
      } catch (error) {
        console.error('Failed to get company certifications:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM }); // Company certifications change when granted/revoked - 5min TTL
  };

  const updateCertification = async (companyId: string, certificationId: string, updates: UpdateCertificationRequest) => {
    try {
      const response = await api.updateCertification(companyId, certificationId, updates);
      if (response.success && response.data) {
        // Invalidate certification caches
        await rateLimiter.clearCache(`company-certifications-${companyId}`);
        if (response.data.user_id) {
          await rateLimiter.clearCache(`user-certifications-${response.data.user_id}`);
        }
        return response.data;
      }
      throw new Error(response.error || 'Failed to update certification');
    } catch (error) {
      console.error('Failed to update certification:', error);
      throw error;
    }
  };

  const revokeCertification = async (companyId: string, certificationId: string) => {
    try {
      const response = await api.revokeCertification(companyId, certificationId);
      if (response.success) {
        // Invalidate certification caches
        await rateLimiter.clearCache(`company-certifications-${companyId}`);
        // Note: We can't easily get userId from certificationId, so we clear all user certification caches
        // In production, you might want to fetch the certification first to get userId
        await rateLimiter.clearCacheByPattern(`user-certifications-`);
        return response;
      }
      throw new Error(response.error || 'Failed to revoke certification');
    } catch (error) {
      console.error('Failed to revoke certification:', error);
      throw error;
    }
  };

  // User Certification Access
  const getUserCertifications = async (userId: string) => {
    const cacheKey = `user-certifications-${userId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getUserCertifications(userId);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get user certifications');
      } catch (error: any) {
        console.error('Failed to get user certifications:', error);
        // If rate limited, return empty array instead of throwing
        if (error.status === 429 || error.message?.includes('429')) {
          console.warn('⚠️ Rate limited on getUserCertifications, returning empty array');
          return [];
        }
        throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // User certifications change when granted/revoked - 30min TTL with persistence
  };

  // Course Management Methods (v2.4.0)
  const getAcademyCourses = async (companyId: string, filters?: { status?: CourseStatus; category?: string }) => {
    const cacheKey = `academy-courses-${companyId}-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getAcademyCourses(companyId, filters);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get academy courses');
      } catch (error) {
        console.error('Failed to get academy courses:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Course lists change when courses are added/updated - 30s TTL
  };

  const createCourse = async (companyId: string, courseData: CreateCourseRequest) => {
    try {
      const response = await api.createCourse(companyId, courseData);
      if (response.success && response.data) {
        // Invalidate courses cache
        await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to create course');
    } catch (error: any) {
      console.error('Failed to create course:', error);
      return {
        success: false,
        error: error.message || 'Failed to create course',
      };
    }
  };

  const getCourseById = async (courseId: string, companyId?: string) => {
    const cacheKey = `course-${courseId}-${companyId || ''}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCourseById(courseId, companyId);
        if (response.success && response.data) {
          return {
            success: true,
            data: response.data,
          };
        }
        throw new Error(response.error || 'Failed to get course');
      } catch (error: any) {
        console.error('Failed to get course:', error);
        return {
          success: false,
          error: error.message || 'Failed to get course',
        };
      }
    }, { ttl: CacheTTL.SHORT }); // Individual course data changes when updated - 30s TTL
  };

  const updateCourse = async (companyId: string, courseId: string, updates: UpdateCourseRequest) => {
    try {
      const response = await api.updateCourse(companyId, courseId, updates);
      if (response.success && response.data) {
        // Invalidate courses cache
        await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to update course');
    } catch (error: any) {
      console.error('Failed to update course:', error);
      return {
        success: false,
        error: error.message || 'Failed to update course',
      };
    }
  };

  const deleteCourse = async (companyId: string, courseId: string) => {
    try {
      const response = await api.deleteCourse(companyId, courseId);
      if (response.success) {
        // Invalidate courses cache
        await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        return {
          success: true,
        };
      }
      throw new Error(response.error || 'Failed to delete course');
    } catch (error: any) {
      console.error('Failed to delete course:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete course',
      };
    }
  };

  const getPublicCourses = async (filters?: { category?: string; company_id?: string; page?: number; limit?: number }) => {
    const cacheKey = `public-courses-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getPublicCourses(filters);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get public courses');
      } catch (error) {
        console.error('Failed to get public courses:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Public course listings change when courses are published/updated - 30s TTL
  };

  const registerForCourse = async (courseId: string) => {
    try {
      const response = await api.registerForCourse(courseId);
      if (response.success && response.data) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to register for course');
    } catch (error: any) {
      console.error('Failed to register for course:', error);
      return {
        success: false,
        error: error.message || 'Failed to register for course',
      };
    }
  };

  const unregisterFromCourse = async (courseId: string) => {
    try {
      const response = await api.unregisterFromCourse(courseId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
        };
      }
      throw new Error(response.error || 'Failed to unregister from course');
    } catch (error: any) {
      console.error('Failed to unregister from course:', error);
      return {
        success: false,
        error: error.message || 'Failed to unregister from course',
      };
    }
  };

  const getCourseRegistrations = async (courseId: string) => {
    const cacheKey = `course-registrations-${courseId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCourseRegistrations(courseId);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get course registrations');
      } catch (error) {
        console.error('Failed to get course registrations:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Course registrations change frequently as users register/unregister - 30s TTL
  };

  const getMyRegisteredCourses = async () => {
    const cacheKey = 'my-registered-courses';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getMyRegisteredCourses();
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get registered courses');
      } catch (error) {
        console.error('Failed to get registered courses:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // My registered courses change when user registers/unregisters - 30s TTL
  };

  // News/Blog methods (v2.3.0)
  const getPublishedNews = async (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest' }) => {
    const cacheKey = `published-news-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('📰 Fetching published news...', filters);
        const response = await api.getPublishedNews(filters);
        console.log('✅ Published news fetched successfully:', response.data?.pagination?.total || 0, 'posts');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch published news:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // News posts change when published/updated - 5min TTL with persistence
  };

  const getNewsPostBySlug = async (slug: string) => {
    const cacheKey = `news-post-${slug}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('📰 Fetching news post by slug:', slug);
        const response = await api.getNewsPostBySlug(slug);
        console.log('✅ News post fetched successfully');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch news post:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // Individual news posts change when edited - 5min TTL with persistence
  };

  const getNewsCategories = async () => {
    const cacheKey = 'news-categories';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('📰 Fetching news categories...');
        const response = await api.getNewsCategories();
        console.log('✅ News categories fetched successfully:', response.data?.length || 0, 'categories');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch news categories:', error);
        throw error;
      }
    }, { ttl: CacheTTL.VERY_LONG, persistent: true }); // News categories are static reference data - 1hr TTL with persistence
  };

  const getNewsTags = async () => {
    const cacheKey = 'news-tags';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('📰 Fetching news tags...');
        const response = await api.getNewsTags();
        console.log('✅ News tags fetched successfully:', response.data?.length || 0, 'tags');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch news tags:', error);
        throw error;
      }
    }, { ttl: CacheTTL.VERY_LONG, persistent: true }); // News tags are static reference data - 1hr TTL with persistence
  };

  // Chat/Messaging methods (v2.5.0)
  // Real-time data - caching disabled for immediate updates
  const getConversations = async (params?: { page?: number; limit?: number }) => {
    const cacheKey = `conversations-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        console.log('💬 Fetching conversations...', params);
        const response = await api.chat.getConversations(params);
        if (response.success && response.data) {
          // Calculate unread count
          const conversations = response.data.data || response.data;
          if (Array.isArray(conversations)) {
            const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
            const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
            
            let unreadCount = 0;
            conversations.forEach((conv: any) => {
              if (conv.participants && Array.isArray(conv.participants)) {
                const participant = conv.participants.find((p: any) => 
                  p.participant_id === currentUserId && p.participant_type === currentUserType
                );
                
                if (participant && conv.last_message_at) {
                  const lastReadAt = participant.last_read_at ? new Date(participant.last_read_at).getTime() : 0;
                  const lastMessageAt = new Date(conv.last_message_at).getTime();
                  
                  // If last message is after last read, there are unread messages
                  if (lastMessageAt > lastReadAt) {
                    unreadCount++;
                  }
                } else if (conv.last_message_at && !participant?.last_read_at) {
                  // If there's a last message but no read timestamp, consider it unread
                  unreadCount++;
                }
              }
            });
            
            setUnreadConversationCount(unreadCount);
            console.log('💬 Unread conversations count:', unreadCount);
          }
        }
        console.log('✅ Conversations fetched successfully');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch conversations:', error);
        throw error;
      }
    }, { useCache: false }); // Disabled caching for real-time data
  };

  const getConversationById = async (conversationId: string) => {
    const cacheKey = `conversation-${conversationId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        console.log('💬 Fetching conversation:', conversationId);
        const response = await api.chat.getConversationById(conversationId);
        console.log('✅ Conversation fetched successfully');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch conversation:', error);
        throw error;
      }
    }, { useCache: false }); // Disabled caching for real-time data
  };

  const createConversation = async (request: { conversation_type: 'user_user' | 'user_company' | 'company_company'; participant_ids: string[]; name?: string }) => {
    try {
      console.log('💬 Creating conversation...', request);
      console.log('💬 API object:', api);
      console.log('💬 API.chat:', api.chat);
      console.log('💬 API keys:', Object.keys(api));
      
      // Check if chat service is available
      if (!api.chat) {
        console.error('❌ Chat service is undefined!');
        console.error('❌ API object:', api);
        console.error('❌ Available properties:', Object.keys(api));
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      
      // Ensure participant_ids is an array
      const requestData = {
        conversation_type: request.conversation_type,
        participant_ids: Array.isArray(request.participant_ids) ? request.participant_ids : [request.participant_ids],
        ...(request.name && { name: request.name }),
      };
      console.log('💬 Request data:', requestData);
      console.log('💬 Calling api.chat.createConversation...');
      const response = await api.chat.createConversation(requestData);
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for conversations
        console.log('✅ Conversation created successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to create conversation');
    } catch (error: any) {
      console.error('❌ Failed to create conversation:', error);
      throw error;
    }
  };

  // Real-time data - caching disabled for immediate updates
  const getMessages = async (conversationId: string, params?: { page?: number; limit?: number; before?: string }) => {
    const cacheKey = `messages-${conversationId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        console.log('💬 Fetching messages for conversation:', conversationId);
        const response = await api.chat.getMessages(conversationId, params);
        console.log('✅ Messages fetched successfully');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch messages:', error);
        throw error;
      }
    }, { useCache: false }); // Disabled caching for real-time data
  };

  const sendMessage = async (conversationId: string, messageData: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number; reply_to_message_id?: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Sending message to conversation:', conversationId);
      const response = await api.chat.sendMessage(conversationId, messageData);
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for real-time data
        console.log('✅ Message sent successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to send message');
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Editing message:', messageId);
      const response = await api.chat.editMessage(messageId, { content });
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for real-time data
        console.log('✅ Message edited successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to edit message');
    } catch (error: any) {
      console.error('❌ Failed to edit message:', error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Deleting message:', messageId);
      const response = await api.chat.deleteMessage(messageId);
      if (response.success) {
        // Cache invalidation not needed since caching is disabled for real-time data
        console.log('✅ Message deleted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to delete message');
    } catch (error: any) {
      console.error('❌ Failed to delete message:', error);
      throw error;
    }
  };

  const readMessage = async (conversationId: string, messageId?: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Marking message as read:', { conversationId, messageId });
      
      const accessToken = getAccessToken();
      
      // Try different endpoint patterns
      const endpoints = messageId 
        ? [
            `${baseUrl}/api/chat/messages/${messageId}/read`,
            `${baseUrl}/api/chat/messages/${messageId}/mark-read`,
          ]
        : [
            `${baseUrl}/api/chat/conversations/${conversationId}/read`,
            `${baseUrl}/api/chat/conversations/${conversationId}/mark-read`,
            `${baseUrl}/api/chat/conversations/${conversationId}/participants/me/read`,
          ];
      
      let lastError: Error | null = null;
      
      // Try each endpoint pattern
      for (const updateUrl of endpoints) {
        try {
          const fetchResponse = await fetch(updateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            console.log('✅ Message marked as read successfully');
            return { success: true, data };
          }
          
          // If 404, try next endpoint
          if (fetchResponse.status === 404) {
            continue;
          }
          
          // For other errors, try to parse and throw
          const data = await fetchResponse.json();
          throw new Error(data.error || `Failed to mark message as read: ${fetchResponse.statusText}`);
        } catch (error: any) {
          lastError = error;
          // If it's a 404, continue to next endpoint
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            continue;
          }
          // For other errors, throw immediately
          throw error;
        }
      }
      
      // If all endpoints failed with 404, the feature might not be implemented yet
      if (lastError) {
        console.warn('⚠️ Read message endpoint not found. This feature may not be implemented on the backend yet.');
        // Return success anyway to not break the app
        return { success: true, data: { message: 'Read status endpoint not available' } };
      }
      
      throw new Error('Failed to mark message as read: No valid endpoint found');
    } catch (error: any) {
      // Don't throw error if it's a 404 - just log and return success
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('Route')) {
        console.warn('⚠️ Read message endpoint not found. This feature may not be implemented on the backend yet.');
        return { success: true, data: { message: 'Read status endpoint not available' } };
      }
      console.error('❌ Failed to mark message as read:', error);
      throw error;
    }
  };

  // Notification methods
  const getNotifications = async (params?: NotificationParams) => {
    try {
      const response = await api.getNotifications(params);
      if (response.success && response.data) {
        // Handle paginated response
        let notificationsList: Notification[] = [];
        if (Array.isArray(response.data)) {
          notificationsList = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          notificationsList = response.data.data;
        } else if ((response.data as any).notifications && Array.isArray((response.data as any).notifications)) {
          notificationsList = (response.data as any).notifications;
        }
        setNotifications(notificationsList);
        return notificationsList;
      }
      throw new Error(response.error || 'Failed to get notifications');
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  };

  const getUnreadNotificationCount = async (): Promise<number> => {
    try {
      const response = await api.getUnreadNotificationCount();
      if (response.success && response.data) {
        const count = response.data.count || 0;
        setUnreadNotificationCount(count);
        return count;
      }
      return 0;
    } catch (error) {
      console.error('Failed to get unread notification count:', error);
      return 0;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success && response.data) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        // Update unread count
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
        return response.data;
      }
      throw new Error(response.error || 'Failed to mark notification as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      if (response.success) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotificationCount(0);
        return response;
      }
      throw new Error(response.error || 'Failed to mark all notifications as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await api.deleteNotification(notificationId);
      if (response.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadNotificationCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        return response;
      }
      throw new Error(response.error || 'Failed to delete notification');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  };

  // Heartbeat system for online status tracking (Redis-powered)
  const sendHeartbeat = async () => {
    try {
      if (!api.chat) {
        console.warn('⚠️ Chat service not available for heartbeat');
        return;
      }
      await api.chat.sendHeartbeat();
      console.log('✅ Heartbeat sent');
    } catch (error: any) {
      // Silently fail - heartbeat is not critical
      console.warn('⚠️ Heartbeat failed (non-critical):', error.message || error);
    }
  };

  const startHeartbeat = () => {
    // Clear any existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up interval for periodic heartbeats
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL);
    
    console.log('🟢 Heartbeat started (30s interval)');
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('🔴 Heartbeat stopped');
    }
  };

  // Load notifications and unread count on user login
  useEffect(() => {
    if (isAuthenticated && user) {
      getUnreadNotificationCount();
      getNotifications({ limit: 20, page: 1 });
      // Load conversations to calculate unread count
      getConversations({ page: 1, limit: 50 });
      
      // Cache warming: Pre-fetch frequently accessed data
      const warmCache = async () => {
        try {
          // Pre-fetch user's companies (with caching)
          if (user.id) {
            getUserCompanies(user.id);
            getUserCertifications(user.id);
            getMyTeamMembers();
          }
        } catch (error) {
          console.warn('Cache warming failed:', error);
        }
      };
      
      warmCache();
    }
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id]);

  // Manage heartbeat based on authentication state and app state
  useEffect(() => {
    if (!isAuthenticated || !user || !api.chat) {
      // Stop heartbeat if user is not authenticated
      stopHeartbeat();
      return;
    }

    // Handle app state changes for heartbeat management
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App is in foreground - start/resume heartbeat
        startHeartbeat();
      } else {
        // App is in background or inactive - stop heartbeat
        stopHeartbeat();
      }
    };

    // Set initial state based on current app state
    const currentAppState = AppState.currentState;
    if (currentAppState === 'active') {
      startHeartbeat();
    }

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup: stop heartbeat and remove listener
      stopHeartbeat();
      subscription.remove();
    };
  }, [isAuthenticated, user?.id, api.chat]);

  // Setup real-time subscription for notifications
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Initialize Supabase if not already initialized
      // Note: Supabase URL and key should be set via environment variables or config
      try {
        if (!supabaseService.isInitialized()) {
          // Try to initialize with credentials from app.json or environment variables
          const supabaseUrl = 
            Constants.expoConfig?.extra?.supabaseUrl || 
            process.env.SUPABASE_URL || 
            '';
          const supabaseKey = 
            Constants.expoConfig?.extra?.supabaseAnonKey || 
            process.env.SUPABASE_ANON_KEY || 
            '';
          
          if (supabaseUrl && supabaseKey) {
            supabaseService.initialize(supabaseUrl, supabaseKey);
            console.log('✅ Supabase initialized for real-time notifications');
          } else {
            console.warn('⚠️ Supabase credentials not configured. Real-time notifications will not work.');
            console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY in app.json extra section or as environment variables.');
          }
        }

        // Subscribe to notifications for this user
        if (supabaseService.isInitialized()) {
          const channelId = supabaseService.subscribeToNotifications(
            user.id,
            (newNotification: Notification) => {
              console.log('📨 New notification received via real-time:', newNotification);
              
              // Add new notification to the list
              setNotifications(prev => {
                // Check if notification already exists
                const exists = prev.find(n => n.id === newNotification.id);
                if (exists) {
                  return prev;
                }
                // Add to beginning of list
                return [newNotification, ...prev];
              });

              // Update unread count if notification is unread
              if (!newNotification.is_read) {
                setUnreadNotificationCount(prev => prev + 1);
              }

              // Refresh notifications list and count asynchronously to avoid race conditions
              setTimeout(() => {
              getNotifications({ limit: 20, page: 1 });
              getUnreadNotificationCount();
              }, 500);
            }
          );

          setNotificationChannelId(channelId);
          console.log('✅ Real-time notification subscription established');
        }
      } catch (error) {
        console.error('Failed to setup real-time notifications:', error);
      }
    }

    // Cleanup subscription on unmount or when user changes
    return () => {
      if (notificationChannelId) {
        supabaseService.unsubscribe(notificationChannelId);
        setNotificationChannelId(null);
        console.log('🔌 Unsubscribed from real-time notifications');
      }
    };
  }, [isAuthenticated, user?.id]);

  // Setup real-time subscription for chat conversations to update unread count
  useEffect(() => {
    if (isAuthenticated && user?.id && supabaseService.isInitialized()) {
      console.log('💬 Setting up real-time subscription for chat unread count updates');
      
      // Subscribe to conversation updates to refresh unread count when new messages arrive
      const channelId = supabaseService.subscribeToConversations(
        user.id,
        (updatedConversation: any) => {
          console.log('💬 Conversation updated via real-time (unread count update):', updatedConversation);
          // Update unread count based on the updated conversation
          // We'll recalculate when conversations are explicitly fetched, not on every update
          // This prevents unnecessary API calls and refreshes
        }
      );

      return () => {
        if (channelId) {
          supabaseService.unsubscribe(channelId);
          console.log('🔌 Unsubscribed from chat conversations for unread count');
        }
      };
    }
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id]);

  // Online status methods
  const getOnlineStatus = async (userId: string) => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/users/${userId}/online-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Failed to get online status:', error);
      throw error;
    }
  };

  const getOnlineStatuses = async (userIds: string[]) => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/users/online-statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_ids: userIds }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Failed to get online statuses:', error);
      throw error;
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
    getAccessToken,
    getBaseUrl: () => baseUrl,
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
    deleteTaskAssignment,
    updateTaskAssignmentStatus,
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
    // Social media links management methods
    getUserSocialLinks,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    // Profile picture management methods
    getUserProfilePictures,
    uploadProfilePicture,
    setMainProfilePicture,
    deleteProfilePicture,
    // File upload methods
    uploadFile,
    // Profile switching
    currentProfileType,
    activeCompany,
    switchToUserProfile,
    switchToCompanyProfile,
    getActiveCompany,
    // Company management methods
    getCompanyTypes,
    getCompanyType,
    getCompanyTypeServices,
    createCompany,
    getCompany,
    updateCompany,
    uploadCompanyLogo,
    getUserCompanies,
    submitCompanyForApproval,
    getCompanies,
    // Company services
    getAvailableServicesForCompany,
    getCompanyServices,
    addCompanyService,
    removeCompanyService,
    // Company members
    addCompanyMember,
    getCompanyMembers,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation,
    getPendingInvitations,
    updateCompanyMemberRole,
    removeCompanyMember,
    transferCompanyOwnership,
    leaveCompany,
    // Company documents
    getCompanyDocuments,
    addCompanyDocument,
    deleteCompanyDocument,
    // Notification methods
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    // Notification state
    notifications,
    unreadNotificationCount,
    // Chat unread count
    unreadConversationCount,
    // Certification Template Management (Admin)
    getCertificationTemplates,
    getCertificationTemplate,
    createCertificationTemplate,
    updateCertificationTemplate,
    deleteCertificationTemplate,
    // Academy Authorization Management (Admin)
    authorizeAcademyForCertification,
    revokeAcademyAuthorization,
    bulkAuthorizeAcademies,
    getAcademyAuthorizations,
    // Certification Management (Academy/Company)
    getAuthorizedCertifications,
    grantCertification,
    getCompanyCertifications,
    updateCertification,
    revokeCertification,
    // User Certification Access
    getUserCertifications,
    // Course Management methods (v2.4.0)
    getAcademyCourses,
    createCourse,
    getCourseById,
    updateCourse,
    deleteCourse,
    getPublicCourses,
    registerForCourse,
    unregisterFromCourse,
    getCourseRegistrations,
    getMyRegisteredCourses,
    // News/Blog methods (v2.4.0)
    getPublishedNews,
    getNewsPostBySlug,
    getNewsCategories,
    getNewsTags,
    // Chat/Messaging methods (v2.5.0)
    getConversations,
    getConversationById,
    createConversation,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    readMessage,
    // Online status methods
    getOnlineStatus,
    getOnlineStatuses,
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
