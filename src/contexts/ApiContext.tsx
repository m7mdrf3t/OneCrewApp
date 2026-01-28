import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus, Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - expo-constants types may not be available in all environments
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import OneCrewApi, { User, AuthResponse, LoginRequest, SignupRequest, ApiError, AssignTaskServiceRequest as ApiAssignTaskServiceRequest } from 'onecrew-api-client';
import { 
  GuestSessionData, 
  ConvertGuestToUserRequest, 
  GoogleAuthRequest,
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
import pushNotificationService from '../services/PushNotificationService';
import streamChatService from '../services/StreamChatService';
import { initializeGoogleSignIn, signInWithGoogle } from '../services/GoogleAuthService';
import { initializeAppleAuthentication, signInWithApple } from '../services/AppleAuthService';
import agendaService from '../services/AgendaService';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import { FilterParams } from '../components/FilterModal';
import performanceMonitor from '../services/PerformanceMonitor';
import {
  AgendaEvent,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
  BookingRequest,
  CreateBookingRequestRequest,
  RespondToBookingRequestRequest,
  GetAgendaEventsParams,
  GetBookingRequestsParams,
  AgendaEventAttendee,
} from '../types/agenda';

interface ApiContextType {
  api: OneCrewApi;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  // App boot coordination (used to defer non-critical work until after the JS splash finishes)
  isAppBootCompleted: boolean;
  setAppBootCompleted: (completed: boolean) => void;
  // Guest session state
  isGuest: boolean;
  guestSessionId: string | null;
  // Authentication methods
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signup: (userData: SignupRequest) => Promise<AuthResponse>;
  googleSignIn: (category?: 'crew' | 'talent' | 'company', primaryRole?: string) => Promise<AuthResponse>;
  appleSignIn: (category?: 'crew' | 'talent' | 'company', primaryRole?: string) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<void>;
  verifyResetOtp: (email: string, otpCode: string) => Promise<{ resetToken: string }>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<void>;
  verifyEmail: (email: string, token: string, type?: "signup" | "email_change") => Promise<void>;
  verifySignupOtp: (email: string, token: string) => Promise<AuthResponse>;
  resendVerificationEmail: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  // Account deletion methods
  requestAccountDeletion: (password: string) => Promise<{ expirationDate: string; daysRemaining: number }>;
  restoreAccount: () => Promise<void>;
  getAccountDeletionStatus: () => Promise<{ isPending: boolean; expirationDate?: string; daysRemaining?: number }>;
  // Support methods
  // Guest session methods
  createGuestSession: () => Promise<GuestSessionData>;
  browseUsersAsGuest: (params?: FilterParams & { page?: number; limit?: number }) => Promise<any>;
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
  getRoles: (options?: { category?: 'crew' | 'talent' | 'company' | 'guest' | 'custom'; active?: boolean }) => Promise<any>;
  getCategories: () => Promise<any>;
  getRolesWithDescriptions: (options?: { category?: 'crew' | 'talent' | 'company' | 'guest' | 'custom'; active?: boolean }) => Promise<any>;
  getCategoriesWithDescriptions: () => Promise<any>;
  createCustomRole: (data: { label: string; description?: string }) => Promise<any>;
  // User filtering methods
  getUsersByRole: (role: string) => Promise<any>;
  getUsersByCategory: (category: string) => Promise<any>;
  getUsersByLocation: (location: string) => Promise<any>;
  // Personal team management methods
  getMyTeam: () => Promise<any>;
  addToMyTeam: (userId: string, role?: string) => Promise<any>;
  removeFromMyTeam: (userId: string) => Promise<any>;
  getMyTeamMembers: () => Promise<any>;
  // Teams (shared teams, not the personal "my team" list)
  getTeams: (params?: { page?: number; limit?: number; search?: string }) => Promise<any>;
  getTeamById: (teamId: string) => Promise<any>;
  createTeam: (teamData: any) => Promise<any>;
  updateTeam: (teamId: string, updates: any) => Promise<any>;
  deleteTeam: (teamId: string) => Promise<any>;
  joinTeam: (teamData: { team_id: string; role?: string }) => Promise<any>;
  leaveTeam: (teamId: string) => Promise<any>;
  addTeamMember: (teamId: string, memberData: { user_id: string; role?: string }) => Promise<any>;
  getTeamMembers: (teamId: string) => Promise<any>;
  // New skill management methods
  getAvailableSkillsNew: () => Promise<any>;
  getUserSkills: () => Promise<any>;
  getUserSkillsNew: () => Promise<any>;
  addUserSkillNew: (skillId: string) => Promise<any>;
  removeUserSkillNew: (skillId: string) => Promise<any>;
  // Direct fetch methods
  getUsersDirect: (params?: FilterParams & { limit?: number; page?: number }) => Promise<any>;
  fetchCompleteUserProfile: (userId: string, userData?: any) => Promise<any>;
  // Project management methods
  createProject: (projectData: any) => Promise<any>;
  updateProject: (projectId: string, updates: any) => Promise<any>;
  getProjects: (filters?: {
    minimal?: boolean;
    created_by?: string;
    member_id?: string;
    role?: 'owner' | 'member' | 'viewer';
    status?: 'active' | 'deleted';
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => Promise<any[]>;
  getAllProjects: (filters?: {
    minimal?: boolean;
    role?: 'owner' | 'member' | 'viewer';
    is_owner?: boolean;
    status?: 'active' | 'deleted';
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => Promise<any[]>;
  getMyOwnerProjects: (filters?: {
    minimal?: boolean;
    search?: string;
    type?: string;
    status?: 'active' | 'deleted';
    page?: number;
    limit?: number;
  }) => Promise<any[]>;
  getDeletedProjects: () => Promise<any[]>;
  getMyProjects: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    include_deleted?: boolean;
    minimal?: boolean;
    role?: 'owner' | 'member' | 'viewer';
    access_level?: 'owner' | 'member' | 'viewer';
    is_owner?: boolean;
    search?: string;
    type?: string;
    sort_by?: 'created_at' | 'updated_at' | 'title';
    sort?: string;
    order?: 'asc' | 'desc';
    fields?: string[];
  }) => Promise<any[]>;
  getProjectStats: (projectId: string) => Promise<any>;
  restoreProject: (projectId: string) => Promise<any>;
  getProjectTasks: (projectId: string) => Promise<TaskWithAssignments[]>;
  getProjectById: (projectId: string) => Promise<ProjectWithDetails>;
  getProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  getProjectMembersWithRoles: (projectId: string) => Promise<ProjectMember[]>;
  getProjectRoles: (projectId: string) => Promise<any>;
  checkPendingAssignments: (projectId: string, userId: string) => Promise<{ hasPending: boolean; count?: number }>;
  // Task management methods
  createTask: (projectId: string, taskData: CreateTaskRequest) => Promise<any>;
  updateTask: (taskId: string, updates: UpdateTaskRequest) => Promise<any>;
  deleteTask: (taskId: string) => Promise<void>;
  assignTaskService: (projectId: string, taskId: string, assignment: AssignTaskServiceRequest) => Promise<any>;
  unassignTaskService: (projectId: string, taskId: string, assignmentId: string) => Promise<any>;
  deleteTaskAssignment: (projectId: string, taskId: string, assignmentId: string) => Promise<any>;
  updateTaskAssignmentStatus: (projectId: string, taskId: string, assignmentId: string, status: 'accepted' | 'rejected') => Promise<any>;
  updateTaskStatus: (taskId: string, status: UpdateTaskStatusRequest) => Promise<any>;
  getTaskById: (taskId: string) => Promise<any>;
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
  switchToUserProfile: () => Promise<void>;
  switchToCompanyProfile: (companyId: string) => Promise<void>;
  getActiveCompany: () => any | null;
  // Company management methods
  getCompanyTypes: () => Promise<any>;
  getCompanyType: (code: string) => Promise<any>;
  getCompanyTypeServices: (code: string) => Promise<any>;
  createCompany: (companyData: any) => Promise<any>;
  quickCreateCompany: (companyData: any) => Promise<any>;
  getCompany: (companyId: string, params?: { include?: ('members' | 'services' | 'documents' | 'certifications' | 'courses')[]; membersLimit?: number; membersPage?: number; fields?: string[] }) => Promise<any>;
  updateCompany: (companyId: string, updates: any) => Promise<any>;
  updateAcademyVisibility: (companyId: string, visibility: 'private' | 'published') => Promise<any>;
  uploadCompanyLogo: (companyId: string, file: { uri: string; type: string; name: string }) => Promise<any>;
  uploadCoursePoster: (courseId: string, file: { uri: string; type: string; name: string }) => Promise<any>; // v2.16.0
  uploadCertificateImage: (file: { uri: string; type: string; name: string }) => Promise<any>; // v2.16.0
  getUserCompanies: (userId: string, forceRefresh?: boolean) => Promise<any>;
  submitCompanyForApproval: (companyId: string) => Promise<any>;
  getCompanies: (params?: { limit?: number; page?: number; /** Alias for `q` */ search?: string; /** onecrew-api-client uses `q` */ q?: string; category?: string; location?: string; subcategory?: string; fields?: string[]; sort?: string; order?: 'asc' | 'desc' }) => Promise<any>;
  // Company services
  getAvailableServicesForCompany: (companyId: string) => Promise<any>;
  getCompanyServices: (companyId: string) => Promise<any>;
  addCompanyService: (companyId: string, serviceId: string) => Promise<any>;
  removeCompanyService: (companyId: string, serviceId: string) => Promise<any>;
  // Company members
  addCompanyMember: (companyId: string, memberData: any) => Promise<any>;
  getCompanyMembers: (companyId: string, params?: any) => Promise<any>;
  getPendingCompanyMembers: (companyId: string, params?: { page?: number; limit?: number; sort?: 'joined_at' | 'created_at' | 'role' | 'accepted_at'; order?: 'asc' | 'desc' }) => Promise<any>;
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
  socialLinksRefreshTrigger: number;
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
  registerUserForCourse: (courseId: string, userId: string) => Promise<any>;
  unregisterUserFromCourse: (courseId: string, userId: string) => Promise<any>;
  // Legacy alias for older UI naming
  unregisterUserForCourse: (courseId: string, userId: string) => Promise<any>;
  getCourseRegistrations: (courseId: string) => Promise<any>;
  getMyRegisteredCourses: () => Promise<any>;
  // v2.8.0: Course completion methods
  completeCourseRegistration: (courseId: string, userId: string) => Promise<any>;
  completeCourse: (courseId: string, autoGrantCertifications?: boolean) => Promise<any>;
  // News/Blog methods (v2.4.0)
  getPublishedNews: (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest' }) => Promise<any>;
  getNewsPostBySlug: (slug: string) => Promise<any>;
  getNewsCategories: () => Promise<any>;
  getNewsTags: () => Promise<any>;
  // News Admin methods (admin only)
  getAdminNewsPosts: (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest'; status?: 'draft' | 'published' }) => Promise<any>;
  getAdminNewsPostById: (id: string) => Promise<any>;
  createNewsPost: (data: any) => Promise<any>;
  updateNewsPost: (id: string, data: any) => Promise<any>;
  deleteNewsPost: (id: string) => Promise<any>;
  publishNewsPost: (id: string) => Promise<any>;
  unpublishNewsPost: (id: string) => Promise<any>;
  uploadNewsPhoto: (file: any, filename?: string) => Promise<any>;
  uploadNewsThumbnail: (file: any, filename?: string) => Promise<any>;
  // News like methods
  likeNewsPost: (postId: string) => Promise<any>;
  unlikeNewsPost: (postId: string) => Promise<any>;
  // Chat/Messaging methods (v2.5.0)
  getConversations: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    /**
     * onecrew-api-client v2.24.4+: server-side profile scoping for conversation lists
     */
    profile_type?: 'user' | 'company';
    company_id?: string;
  }) => Promise<any>;
  getConversationById: (conversationId: string) => Promise<any>;
  createConversation: (request: { conversation_type: 'user_user' | 'user_company' | 'company_company'; participant_ids: string[]; name?: string }) => Promise<any>;
  getMessages: (
    conversationId: string,
    params?: {
      page?: number;
      limit?: number;
      before?: string;
      /**
       * v2.24.3+ (backend-controlled hydration + payload reduction)
       * - 'none' disables hydration entirely
       * - array enables specific hydrations
       */
      include?: 'none' | Array<'sender_user' | 'sender_company' | 'sent_by_user' | 'reads'>;
      /**
       * v2.24.3+ filter messages by sender type
       */
      sender_type?: 'user' | 'company' | Array<'user' | 'company'>;
      /**
       * v2.24.3+ safe field selection (server-enforced whitelist)
       */
      sender_user_fields?: string[];
      sender_company_fields?: string[];
    }
  ) => Promise<any>;
  sendMessage: (conversationId: string, messageData: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number; reply_to_message_id?: string }) => Promise<any>;
  editMessage: (messageId: string, data: { content: string; conversation_id?: string }) => Promise<any>;
  deleteMessage: (messageId: string, conversationId: string) => Promise<any>;
  readMessage: (conversationId: string, messageId?: string, messageIds?: string[]) => Promise<any>;
  markMessageAsRead: (messageId: string, conversationId: string) => Promise<any>;
  markAllAsRead: (conversationId: string, messageIds?: string[]) => Promise<any>;
  leaveConversation: (conversationId: string) => Promise<any>;
  muteConversation: (conversationId: string, mutedUntil?: string) => Promise<any>;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => Promise<any>;
  // StreamChat token
  getStreamChatToken: (options?: { profile_type?: 'user' | 'company'; company_id?: string }) => Promise<any>;
  // Message reactions
  addReaction: (messageId: string, data: { reaction_type: string; conversation_id: string }) => Promise<any>;
  removeReaction: (messageId: string, reactionType: string, conversationId: string) => Promise<any>;
  getReactions: (messageId: string, conversationId: string) => Promise<any>;
  // Message threading
  createThreadReply: (parentMessageId: string, conversationId: string, data: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number }) => Promise<any>;
  getThreadReplies: (parentMessageId: string, conversationId: string, params?: { limit?: number }) => Promise<any>;
  // Message pinning
  pinMessage: (messageId: string, conversationId: string) => Promise<any>;
  unpinMessage: (messageId: string, conversationId: string) => Promise<any>;
  getPinnedMessages: (conversationId: string) => Promise<any>;
  // Message search
  searchMessages: (params: { query: string; conversation_id?: string; sender_id?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }) => Promise<any>;
  searchInConversation: (conversationId: string, params: { query: string; sender_id?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }) => Promise<any>;
  // Channel management
  updateChannel: (conversationId: string, data: { name?: string; image?: string; description?: string }) => Promise<any>;
  addMember: (conversationId: string, userId: string) => Promise<any>;
  removeMember: (conversationId: string, userId: string) => Promise<any>;
  getMembers: (conversationId: string) => Promise<any>;
  // Channel moderation
  addModerator: (conversationId: string, userId: string) => Promise<any>;
  removeModerator: (conversationId: string, userId: string) => Promise<any>;
  banUser: (conversationId: string, data: { user_id: string; reason?: string; timeout?: number }) => Promise<any>;
  unbanUser: (conversationId: string, userId: string) => Promise<any>;
  muteUser: (conversationId: string, data: { user_id: string; timeout?: number }) => Promise<any>;
  unmuteUser: (conversationId: string, userId: string) => Promise<any>;
  flagMessage: (messageId: string, conversationId: string) => Promise<any>;
  getFlaggedMessages: (params?: { limit?: number; offset?: number }) => Promise<any>;
  // Message translation
  translateMessage: (messageId: string, conversationId: string, targetLanguage: string) => Promise<any>;
  // Online status methods (Redis-powered)
  getOnlineStatus: (userId: string) => Promise<any>;
  getOnlineStatuses: (userIds: string[]) => Promise<any>;
  // Agenda methods (v2.9.0)
  getAgendaEvents: (params?: GetAgendaEventsParams) => Promise<AgendaEvent[]>;
  getAgendaEvent: (eventId: string) => Promise<AgendaEvent>;
  createAgendaEvent: (eventData: CreateAgendaEventRequest) => Promise<AgendaEvent>;
  updateAgendaEvent: (eventId: string, updates: UpdateAgendaEventRequest) => Promise<AgendaEvent>;
  deleteAgendaEvent: (eventId: string) => Promise<void>;
  getEventAttendees: (eventId: string) => Promise<AgendaEventAttendee[]>;
  addEventAttendee: (eventId: string, userId: string) => Promise<AgendaEventAttendee>;
  updateAttendeeStatus: (eventId: string, attendeeId: string, status: 'accepted' | 'declined') => Promise<AgendaEventAttendee>;
  removeEventAttendee: (eventId: string, attendeeId: string) => Promise<void>;
  getBookingRequests: (params?: GetBookingRequestsParams) => Promise<BookingRequest[]>;
  getBookingRequest: (requestId: string) => Promise<BookingRequest>;
  createBookingRequest: (requestData: CreateBookingRequestRequest) => Promise<BookingRequest>;
  respondToBookingRequest: (requestId: string, response: RespondToBookingRequestRequest) => Promise<BookingRequest>;
  cancelBookingRequest: (requestId: string) => Promise<void>;
}

const ApiContext = createContext<ApiContextType | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ 
  children, 
  // baseUrl = 'https://onecrew-backend-309236356616.us-central1.run.app' // Production server (Google Cloud)
   baseUrl = 'https://onecrew-backend-staging-309236356616.us-central1.run.app'
  //  'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app'  // Staging server
  // Local dev server URL (commented out - using staging instead)
  // baseUrl = Platform.OS === 'android' 
  //   ? 'http://10.0.2.2:3000' // Android emulator special IP for localhost
  //   : 'http://localhost:3000' // iOS simulator can use localhost directly
}) => {
  const [api] = useState(() => {
    const apiClient = new OneCrewApi(baseUrl);
    
    // Override the base URL if it's using localhost
    if ((apiClient as any).baseUrl && (apiClient as any).baseUrl.includes('localhost:3000')) {
      (apiClient as any).baseUrl = baseUrl;
    }
    
    // Verify new methods are available
    if (typeof apiClient.getPendingCompanyMembers !== 'function') {
      console.warn('⚠️ getPendingCompanyMembers method not found on API instance. Package may need update or cache clear.');
    }
    
    return apiClient;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAppBootCompleted, setIsAppBootCompleted] = useState(false);
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
  // Social links refresh trigger (increments when social links are updated)
  const [socialLinksRefreshTrigger, setSocialLinksRefreshTrigger] = useState(0);
  // Heartbeat state
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  // Flag to prevent duplicate 401 handling
  const isHandling401Ref = useRef(false);
  const last401ErrorRef = useRef<number>(0);
  // Flag to track recent login to prevent immediate 401 handling after password reset + login
  const recentLoginRef = useRef<number>(0);
  const RECENT_LOGIN_WINDOW = 30000; // 30 seconds - don't handle 401s if user just logged in (increased for password reset scenarios)

  /**
   * Clear all authentication data from all possible storage locations
   * This ensures no tokens persist after password reset or logout
   */
  const clearAllAuthData = async () => {
    try {
      // Clear AsyncStorage auth-related keys
      const authKeys = [
        'authToken',
        'authData',
        'accessToken',
        'token',
        'user',
        'currentUser',
      ];
      
      for (const key of authKeys) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (err) {
          console.warn(`⚠️ Failed to remove ${key} from AsyncStorage:`, err);
        }
      }

      // Clear API client's internal auth state
      if (api.auth) {
        try {
          if (typeof (api.auth as any).clearAuthData === 'function') {
            await (api.auth as any).clearAuthData();
          }
          if (typeof (api.auth as any).removeAuthToken === 'function') {
            await (api.auth as any).removeAuthToken();
          }
          // Clear any direct properties
          (api.auth as any).authToken = null;
          (api.auth as any).token = null;
          (api.auth as any).accessToken = null;
          (api.auth as any).currentUser = null;
        } catch (err) {
          console.warn('⚠️ Error clearing API auth state:', err);
        }
      }

      // Clear API client headers if they exist
      if ((api as any).apiClient) {
        try {
          if ((api as any).apiClient.defaultHeaders) {
            delete (api as any).apiClient.defaultHeaders['Authorization'];
          }
          if (typeof (api as any).apiClient.setAuthToken === 'function') {
            (api as any).apiClient.setAuthToken(null);
          }
        } catch (err) {
          console.warn('Error clearing API client headers:', err);
        }
      }

      console.log('✅ All authentication data cleared');
    } catch (err) {
      console.error('Error clearing auth data:', err);
    }
  };

  /**
   * Handle 401 errors by clearing auth state and forcing re-login
   */
  const handle401Error = async (error: any) => {
    const now = Date.now();
    const errorMessage = error?.message || error?.error || '';
    
    // Don't handle 401 if user just logged in (within RECENT_LOGIN_WINDOW)
    // This prevents false positives after password reset + login
    if (now - recentLoginRef.current < RECENT_LOGIN_WINDOW) {
      return;
    }
    
    // Prevent duplicate handling within 5 seconds
    if (isHandling401Ref.current || (now - last401ErrorRef.current < 5000)) {
      return;
    }

    // Check if this is a token invalidation error
    if (error?.status === 401 || error?.statusCode === 401) {
      const isTokenInvalidated = 
        errorMessage.toLowerCase().includes('token has been invalidated') ||
        errorMessage.toLowerCase().includes('invalidated') ||
        errorMessage.toLowerCase().includes('please sign in again') ||
        errorMessage.toLowerCase().includes('invalid token') ||
        errorMessage.toLowerCase().includes('token is invalid') ||
        errorMessage.toLowerCase().includes('unauthorized');

      if (isTokenInvalidated) {
        isHandling401Ref.current = true;
        last401ErrorRef.current = now;
        
        try {
          // Stop heartbeat
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }

          // Clear all auth data
          await clearAllAuthData();

          // Clear local state
          setIsAuthenticated(false);
          setUser(null);
          setNotifications([]);
          setUnreadNotificationCount(0);
          setUnreadConversationCount(0);

          // Unsubscribe from real-time notifications
          if (notificationChannelId) {
            supabaseService.unsubscribe(notificationChannelId);
            setNotificationChannelId(null);
          }

          // Clear push notification token
          await pushNotificationService.clearToken().catch(() => {});
          await pushNotificationService.setBadgeCount(0).catch(() => {});
        } catch (err) {
          console.error('Error during 401 handling:', err);
        } finally {
          isHandling401Ref.current = false;
        }
      }
    }
  };

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
          return true;
        }
        
        // Even 404 means server is reachable
        if (response.status === 404) {
          return true;
        }
      } catch (error: any) {
        // Network errors or timeouts - continue to next endpoint
        // Continue to next endpoint
        continue;
      }
    }

    // If all endpoints failed, try to initialize the API directly as a fallback
    return null; // null means "unknown, try anyway"
  };

  // Initialize API client
  useEffect(() => {
    const initializeApi = async () => {
      // Test connectivity (non-blocking - if it fails, we'll still try to initialize)
      await testConnectivity();
      
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
        
        // Initialize Google Sign-In
        try {
          await initializeGoogleSignIn();
          await initializeAppleAuthentication();
        } catch (err) {
          console.warn('⚠️ Failed to initialize Google Sign-In:', err);
          // Don't block app initialization if Google Sign-In fails
        }
        
        // Check if password was recently reset - if so, don't restore tokens
        const passwordResetFlag = await AsyncStorage.getItem('passwordResetFlag');
        if (passwordResetFlag === 'true') {
          // Clear any tokens that might have been restored by API client
          await clearAllAuthData();
          setIsAuthenticated(false);
          setUser(null);
        } else if (api.auth.isAuthenticated()) {
          const currentUser = api.auth.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Set up token refresh callback for automatic re-registration
          pushNotificationService.setOnTokenRefreshCallback((newToken) => {
            if (api.auth.isAuthenticated()) {
              registerPushToken(newToken).catch((error) => {
                console.warn('⚠️ Failed to re-register token after refresh:', error);
              });
            }
          });
          
          // Register push token for already-authenticated user
          setTimeout(async () => {
            try {
              const pushToken = await pushNotificationService.initialize();
              if (pushToken && api.auth.isAuthenticated()) {
                await registerPushToken(pushToken);
              }
            } catch (error) {
              console.error('❌ Failed to register push notifications for authenticated user:', error);
            }
          }, 1000);
          
          // Restore profile type and active company from storage
          const savedProfileType = await AsyncStorage.getItem('currentProfileType');
          const savedCompanyId = await AsyncStorage.getItem('activeCompanyId');
          
          if (savedProfileType === 'company' && savedCompanyId) {
            try {
              const companyResponse = await api.getCompany(savedCompanyId);
              if (companyResponse.success && companyResponse.data) {
                setActiveCompany(companyResponse.data);
                setCurrentProfileType('company');
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
    setIsLoading(true);
    setError(null);
    try {
      // Try direct fetch first to bypass potential API client issues
      const response = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      // Read response as text first (can only read body once)
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse as JSON, but fallback to text if it's not JSON
        let errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Not JSON, use text response as error message
        }
        
        // Check for account lockout errors
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes('lockout') || errorLower.includes('locked') || errorLower.includes('too many attempts')) {
          const lockoutError: any = new Error(errorMessage);
          lockoutError.code = 'ACCOUNT_LOCKOUT';
          lockoutError.lockoutDuration = errorData.lockoutDuration || errorData.lockout_duration || 3600; // Default 1 hour in seconds
          lockoutError.remainingTime = errorData.remainingTime || errorData.remaining_time;
          throw lockoutError;
        }
        
        // Check for account deletion errors - during grace period, users should still be able to login
        if (errorLower.includes('deleted') || errorLower.includes('deletion')) {
          const deletionError: any = new Error(
            'Your account is scheduled for deletion. You can still log in during the grace period to restore your account. Please contact support if you need assistance.'
          );
          deletionError.code = 'ACCOUNT_DELETION_PENDING';
          deletionError.isPending = true;
          // Include deletion info if available from backend
          if (errorData.expirationDate) {
            deletionError.expirationDate = errorData.expirationDate;
          }
          if (errorData.daysRemaining !== undefined) {
            deletionError.daysRemaining = errorData.daysRemaining;
          }
          throw deletionError;
        }
        
        // Normalize common authentication error messages for better UX
        if (errorLower.includes('invalid') && (errorLower.includes('email') || errorLower.includes('password') || errorLower.includes('credential'))) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorLower.includes('unauthorized') || response.status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        }
        
        const authError: any = new Error(errorMessage);
        authError.isAuthError = true;
        authError.statusCode = response.status;
        throw authError;
      }

      // Parse response as JSON
      let authResponse;
      try {
        authResponse = JSON.parse(responseText);
      } catch (parseError: any) {
        // If JSON parsing fails, it's likely a text error message
        console.error('❌ Failed to parse response as JSON:', responseText);
        throw new Error(responseText || 'Server returned invalid JSON response');
      }
      
      // Extract user data and token
      let userData = null;
      let token = null;
      
      // Check if data contains user info directly
      if (authResponse.data) {
        if (authResponse.data.user) {
          userData = authResponse.data.user;
        } else if (authResponse.data.userData) {
          userData = authResponse.data.userData;
        } else if (authResponse.data.id || authResponse.data.name || authResponse.data.email) {
          userData = authResponse.data;
        }
        
        // Check for token in data
        if (authResponse.data.token) {
          token = authResponse.data.token;
        } else if (authResponse.data.accessToken) {
          token = authResponse.data.accessToken;
        }
      }
      
      // Fallback to root level
      if (!userData) {
        userData = authResponse.user;
      }
      
      if (!token) {
        token = authResponse.token || authResponse.accessToken;
      }
      
      if (!userData) {
        console.error(' No user data found in login response');
        throw new Error('Login response missing user data');
      }
      
      if (!token) {
        console.error(' No token found in login response');
        throw new Error('Login response missing authentication token');
      }
      
      // Clear any existing tokens before storing new ones to ensure complete replacement
      await clearAllAuthData();
      
      // Clear password reset flag if it exists (user successfully logged in after reset)
      try {
        await AsyncStorage.removeItem('passwordResetFlag');
      } catch (err) {
        // Silent fail
      }
      
      // Use the AuthService's setAuthData method to properly store the token
      if ((api as any).auth && typeof (api as any).auth.setAuthData === 'function') {
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
      
      // CRITICAL: Ensure API client headers are updated immediately after storing token
      // This prevents race conditions where API calls are made before token is available
      if ((api as any).apiClient) {
        if (!(api as any).apiClient.defaultHeaders) {
          (api as any).apiClient.defaultHeaders = {};
        }
        (api as any).apiClient.defaultHeaders['Authorization'] = `Bearer ${token}`;
        console.log('✅ API client headers updated with new token');
      }
      
      // Also update auth service properties directly to ensure immediate availability
      if ((api as any).auth) {
        (api as any).auth.authToken = token;
        (api as any).auth.token = token;
        (api as any).auth.accessToken = token;
      }
      
      // Mark recent login FIRST to prevent immediate 401 handling (before setIsAuthenticated triggers API calls)
      recentLoginRef.current = Date.now();
      console.log('✅ Recent login timestamp set - 401 handling will be skipped for', RECENT_LOGIN_WINDOW, 'ms');
      
      // Update user state
      setUser(userData);
      setIsAuthenticated(true);
      
      // Initialize StreamChat after successful login
      try {
        const streamTokenResponse = await getStreamChatToken({ profile_type: 'user' });
        if (streamTokenResponse.success && streamTokenResponse.data) {
          const { token, user_id, api_key } = streamTokenResponse.data as any;
          
          // Log token response for debugging
          console.log('💬 StreamChat token response:', {
            hasToken: !!token,
            hasUserId: !!user_id,
            hasApiKey: !!api_key,
            userId: user_id,
            apiKeyPrefix: api_key ? api_key.substring(0, 10) + '...' : 'NOT PROVIDED',
          });
          
          // Use user_id from token response (backend knows the correct StreamChat user ID format)
          await streamChatService.connectUser(
            user_id, // Use user_id from token, not mapped OneCrew ID
            token,
            {
              name: userData.name,
              image: userData.image_url,
            },
            api_key, // Pass API key from backend if provided
            'user' // User type for tracking
          );
          console.log('✅ StreamChat initialized after login');
        } else {
          console.error('❌ StreamChat token response failed:', streamTokenResponse);
        }
      } catch (streamError) {
        console.error('❌ Failed to initialize StreamChat:', streamError);
        // Don't block login if StreamChat fails, but log the error
      }
      
      // Set up token refresh callback for automatic re-registration
      pushNotificationService.setOnTokenRefreshCallback((newToken) => {
        if (api.auth.isAuthenticated()) {
          registerPushToken(newToken).catch((error) => {
            console.warn('⚠️ Failed to re-register token after refresh:', error);
          });
        }
      });

      // Register for push notifications after successful login
      setTimeout(async () => {
        try {
          const pushToken = await pushNotificationService.initialize();
          if (pushToken && api.auth.isAuthenticated()) {
            await registerPushToken(pushToken);
          }
        } catch (error) {
          console.error('❌ Failed to register push notifications:', error);
        }
      }, 500);
      
      // Fetch complete user profile data after login
      setTimeout(async () => {
        try {
          const completeUser = await fetchCompleteUserProfile(userData.id, userData);
          if (completeUser) {
            setUser(completeUser as User);
          }
        } catch (err) {
          // Silent fail - profile will load on next refresh
        }
      }, 1000);
      
      return authResponse;
    } catch (err: any) {
      // Only log detailed error info for unexpected errors, not for normal auth failures
      if (!err.isAuthError && err.code !== 'ACCOUNT_LOCKOUT' && err.code !== 'ACCOUNT_DELETION_PENDING') {
        // For unexpected errors, log full details
        console.error('Login failed:', err);
      }
      
      // If direct fetch fails, try the API client as fallback
      if (err.message.includes('Network error') || err.message.includes('ENOENT')) {
        try {
          const authResponse = await api.auth.login(credentials);
          setUser(authResponse.user);
          setIsAuthenticated(true);
          return authResponse;
        } catch (apiErr: any) {
          console.error('❌ API client also failed:', apiErr);
          
          // Check for account lockout in API client error
          const errorLower = apiErr.message?.toLowerCase() || '';
          if (errorLower.includes('lockout') || errorLower.includes('locked') || errorLower.includes('too many attempts')) {
            const lockoutError: any = new Error(apiErr.message || 'Account locked due to too many failed login attempts');
            lockoutError.code = 'ACCOUNT_LOCKOUT';
            setIsAuthenticated(false);
            setUser(null);
            setError(lockoutError.message);
            throw lockoutError;
          }
          
          setIsAuthenticated(false);
          setUser(null);
          setError(apiErr.message || 'Login failed');
          throw apiErr;
        }
      } else {
        // Check for account lockout in direct fetch error
        if (err.code === 'ACCOUNT_LOCKOUT') {
          setIsAuthenticated(false);
          setUser(null);
          setError(err.message);
          throw err;
        }
        
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
    setIsLoading(true);
    setError(null);
    
    // CRITICAL: Ensure no auth data exists before signup
    // We will NOT save anything during signup - token only comes after OTP verification
    setIsAuthenticated(false);
    setUser(null);
    
    try {
      // Call the library's signup method
      // NOTE: The library's signup() method does NOT call setAuthData() - it explicitly avoids saving
      // because there's no token yet. Token will only be saved after verifySignupOtp() succeeds.
      // However, the library might try to save something internally and throw a SecureStore error
      // We'll catch that and handle it gracefully
      let authResponse: any;
      try {
        authResponse = await api.auth.signup(userData);
      } catch (libraryErr: any) {
        // If the library throws a SecureStore error, it means signup succeeded but saving failed
        // The response should be accessible from the library's internal state or error object
        if (libraryErr.message?.includes('SecureStore') || libraryErr.message?.includes('JSON-encoding')) {
          console.warn('⚠️ Library threw SecureStore error, but signup likely succeeded');
          
          // Try to get the response from various possible locations
          // The response structure from logs shows: {"data": {"message": "...", "user": {...}}}
          const possibleResponse = 
            libraryErr.response?.data?.data ||  // Nested data.data structure
            libraryErr.response?.data ||         // Direct data structure
            libraryErr.data?.data ||             // Error.data.data
            libraryErr.data ||                    // Error.data
            libraryErr.response ||                // Error.response
            libraryErr.signupResponse ||          // Custom property
            ((api as any).auth?.lastSignupResponse) ||  // Library internal state
            ((api as any).auth?.lastResponse) ||        // Library internal state
            ((api as any).auth?.response);              // Library internal state
          
          if (possibleResponse) {
            authResponse = possibleResponse;
          } else {
            // If we can't extract the response, but we know signup succeeded,
            // return a minimal success response to allow the flow to continue
            authResponse = {
              success: true,
              message: 'Registration successful. Please check your email for the OTP code to verify your account.',
              requiresEmailVerification: true,
              user: null // User data will be available after OTP verification
            };
          }
        } else {
          // Not a SecureStore error, rethrow
          throw libraryErr;
        }
      }
      
      // Ensure we're not authenticated (double-check)
      setIsAuthenticated(false);
      setUser(null);
      
      // Ensure no auth data is stored (the library shouldn't save anything, but be extra safe)
      try {
        await clearAllAuthData();
      } catch (clearErr) {
        // Silent fail
      }
      
      // Return response with requiresEmailVerification flag
      // The token will ONLY be retrieved and saved after verifySignupOtp() succeeds
      const response = {
        ...(authResponse.data || authResponse),
        requiresEmailVerification: true
      } as any;
      return response;
    } catch (err: any) {
      console.error('Signup failed:', err);
      setIsAuthenticated(false);
      setUser(null);
      
      // If it's a SecureStore error, it means something tried to save during signup
      // This shouldn't happen, but if it does, we'll handle it gracefully
      if (err.message?.includes('SecureStore') || err.message?.includes('JSON-encoding')) {
        console.error('⚠️ SecureStore error during signup - something tried to save data (this shouldn\'t happen)');
        console.error('⚠️ The library\'s signup() method should NOT save anything - token only comes after OTP verification');
        
        // Try to extract the response if signup actually succeeded
        // The response structure from logs shows: {"data": {"message": "...", "user": {...}}}
        const errorData = 
          (err as any).response?.data?.data ||  // Nested data.data structure
          (err as any).response?.data ||         // Direct data structure
          (err as any).data?.data ||             // Error.data.data
          (err as any).data ||                    // Error.data
          (err as any).response ||                // Error.response
          (err as any).signupResponse;            // Custom property
        
        // Also check if the library stored the response internally before throwing
        let signupResponse = null;
        try {
          // Check if the library has the response stored internally
          const authService = (api as any).auth;
          if (authService) {
            signupResponse = 
              authService.lastSignupResponse ||
              authService.lastResponse ||
              authService.response;
          }
        } catch (e) {
          // Ignore errors when checking internal state
        }
        
        const responseData = errorData || signupResponse;
        
        if (responseData) {
          setIsAuthenticated(false);
          setUser(null);
          // Clear any partial saves
          await clearAllAuthData();
          
          // Ensure the response has the correct structure
          const finalResponse = {
            ...(responseData.data || responseData),
            requiresEmailVerification: true,
            success: true
          } as any;
          
          return finalResponse;
        }
        
        // If we can't extract the response, still don't throw - signup likely succeeded
        // The user should check their email for the OTP
        setError('Signup completed but encountered an internal error. Please check your email for the verification code.');
        
        // Return a minimal success response to allow the flow to continue
        return {
          requiresEmailVerification: true,
          success: true,
          message: 'Registration successful. Please check your email for the OTP code to verify your account.'
        } as any;
      } else {
        setError(err.message || 'Signup failed');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignIn = async (category?: 'crew' | 'talent' | 'company', primaryRole?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Get Supabase access token via native Google Sign-In
      // (Native SDK gets Google ID token, then exchanges it with Supabase)
      const accessToken = await signInWithGoogle();
      
      // Step 2: Retrieve category and role from AsyncStorage (stored before OAuth)
      let storedCategory: string | null = null;
      let storedRole: string | null = null;
      try {
        storedCategory = await AsyncStorage.getItem('pending_category');
        storedRole = await AsyncStorage.getItem('pending_role');
      } catch (storageErr) {
        // Silent fail
      }
      
      // Use stored values if available, otherwise fall back to function parameters
      const finalCategory = (storedCategory as 'crew' | 'talent' | 'company' | null) || category;
      const finalRole = storedRole || primaryRole;
      
      // Step 3: Send Supabase access token to backend
      const requestBody: any = {
        accessToken: accessToken, // Backend expects Supabase access token
        ...(finalCategory && { category: finalCategory }),
        ...(finalRole && { primary_role: finalRole }),
      };
      
      const response = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Not JSON, use text response as error message
        }
        
        // Check if error is about missing category
        if (errorMessage.toLowerCase().includes('category') && errorMessage.toLowerCase().includes('required')) {
          // Return a special error that can be caught by the UI to show category selection
          const categoryError = new Error('CATEGORY_REQUIRED');
          (categoryError as any).code = 'CATEGORY_REQUIRED';
          throw categoryError;
        }
        
        throw new Error(errorMessage);
      }

      // Parse response
      let authResponse;
      try {
        authResponse = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error('❌ Failed to parse response as JSON:', responseText);
        throw new Error(responseText || 'Server returned invalid JSON response');
      }
      
      // Clear AsyncStorage after successful sign-in
      try {
        await AsyncStorage.removeItem('pending_category');
        await AsyncStorage.removeItem('pending_role');
      } catch (clearErr) {
        // Silent fail
      }
      
      // Extract user data and token
      let userData = null;
      let token = null;
      
      if (authResponse.data) {
        if (authResponse.data.user) {
          userData = authResponse.data.user;
        } else if (authResponse.data.userData) {
          userData = authResponse.data.userData;
        } else if (authResponse.data.id || authResponse.data.name || authResponse.data.email) {
          userData = authResponse.data;
        }
        
        if (authResponse.data.token) {
          token = authResponse.data.token;
        } else if (authResponse.data.accessToken) {
          token = authResponse.data.accessToken;
        }
      }
      
      // Fallback to root level
      if (!userData) {
        userData = authResponse.user;
      }
      
      if (!token) {
        token = authResponse.token || authResponse.accessToken;
      }
      
      if (!userData) {
        throw new Error('Google Sign-In response missing user data');
      }
      
      if (!token) {
        throw new Error('Google Sign-In response missing authentication token');
      }
      
      // Clear any existing tokens before storing new ones to ensure complete replacement
      await clearAllAuthData();
      
      // Clear password reset flag if it exists (user successfully signed in after reset)
      try {
        await AsyncStorage.removeItem('passwordResetFlag');
      } catch (err) {
        // Silent fail
      }
      
      // Store auth data using the same method as login
      if ((api as any).auth && typeof (api as any).auth.setAuthData === 'function') {
        await (api as any).auth.setAuthData({
          token: token,
          user: userData
        });
      } else {
        if ((api as any).apiClient && typeof (api as any).apiClient.setAuthToken === 'function') {
          (api as any).apiClient.setAuthToken(token);
        }
        
        if ((api as any).auth) {
          (api as any).auth.authToken = token;
          (api as any).auth.token = token;
          (api as any).auth.accessToken = token;
          (api as any).auth.currentUser = userData;
        }
      }
      
      // CRITICAL: Ensure API client headers are updated immediately after storing token
      // This prevents race conditions where API calls are made before token is available
      if ((api as any).apiClient) {
        if (!(api as any).apiClient.defaultHeaders) {
          (api as any).apiClient.defaultHeaders = {};
        }
        (api as any).apiClient.defaultHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      // Also update auth service properties directly to ensure immediate availability
      if ((api as any).auth) {
        (api as any).auth.authToken = token;
        (api as any).auth.token = token;
        (api as any).auth.accessToken = token;
      }
      
      // Mark recent login FIRST to prevent immediate 401 handling (before setIsAuthenticated triggers API calls)
      recentLoginRef.current = Date.now();
      
      // Update user state
      setUser(userData);
      setIsAuthenticated(true);
      
      // Set up token refresh callback for automatic re-registration
      pushNotificationService.setOnTokenRefreshCallback((newToken) => {
        if (api.auth.isAuthenticated()) {
          registerPushToken(newToken).catch((error) => {
            console.warn('⚠️ Failed to re-register token after refresh:', error);
          });
        }
      });

      // Register for push notifications after successful login
      setTimeout(async () => {
        try {
          const pushToken = await pushNotificationService.initialize();
          if (pushToken && api.auth.isAuthenticated()) {
            await registerPushToken(pushToken);
          }
        } catch (error) {
          console.error('❌ Failed to register push notifications:', error);
        }
      }, 500);
      
      // Fetch complete user profile data after login
      setTimeout(async () => {
        try {
          const completeUser = await fetchCompleteUserProfile(userData.id, userData);
          if (completeUser) {
            setUser(completeUser as User);
          }
        } catch (err) {
          // Silent fail - profile will load on next refresh
        }
      }, 1000);
      
      return {
        user: userData,
        token: token,
      } as AuthResponse;
      
    } catch (err: any) {
      console.error('❌ Google Sign-In failed:', err);
      
      // Clear AsyncStorage on error (unless it's a cancellation)
      if (!err?.message?.toLowerCase().includes('cancelled')) {
        try {
          await AsyncStorage.removeItem('pending_category');
          await AsyncStorage.removeItem('pending_role');
        } catch (clearErr) {
          console.warn('⚠️ Failed to clear AsyncStorage on error:', clearErr);
        }
      }
      
      // Don't set error state for category required - let UI handle it
      if (err.code === 'CATEGORY_REQUIRED') {
        throw err;
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message || 'Google Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const appleSignIn = async (category?: 'crew' | 'talent' | 'company', primaryRole?: string) => {
    console.log('🍎 Apple Sign-In attempt');
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Get Supabase access token via Apple OAuth
      console.log('📱 Requesting Apple Sign-In via Supabase OAuth...');
      const accessToken = await signInWithApple();
      console.log('✅ Supabase access token received');
      
      // Step 2: Retrieve category and role from AsyncStorage (stored before OAuth)
      let storedCategory: string | null = null;
      let storedRole: string | null = null;
      try {
        storedCategory = await AsyncStorage.getItem('pending_category');
        storedRole = await AsyncStorage.getItem('pending_role');
        console.log('📋 Retrieved from AsyncStorage:', {
          category: storedCategory || 'not found',
          role: storedRole || 'not found',
        });
      } catch (storageErr) {
        console.warn('⚠️ Failed to retrieve category/role from AsyncStorage:', storageErr);
      }
      
      // Use stored values if available, otherwise fall back to function parameters
      const finalCategory = (storedCategory as 'crew' | 'talent' | 'company' | null) || category;
      const finalRole = storedRole || primaryRole;
      
      // Step 3: Use API client method if available (v2.26.0+), otherwise fallback to direct fetch
      let authResponse: any;
      let userData: any = null;
      let token: string | null = null;
      
      // Check if the new API client method is available
      if (api.auth && typeof (api.auth as any).signInWithApple === 'function') {
        try {
          const response = await (api.auth as any).signInWithApple(accessToken, finalCategory, finalRole);
          
          // Handle different response formats:
          // 1. Wrapped format: { success: true, data: { user, token } }
          // 2. Direct format: { user, token }
          // 3. Error format: { success: false, message/error }
          
          if (!response) {
            throw new Error('No response received from Apple Sign-In');
          }
          
          // Check if it's an error response
          if (response.success === false || (response.error && !response.user)) {
            // Extract error message from response
            const errorMsg = response?.message || response?.error || response?.data?.error || 'Apple Sign-In failed';
            console.error('❌ API client returned unsuccessful response:', {
              success: response?.success,
              message: response?.message,
              error: response?.error,
              data: response?.data,
              fullResponse: JSON.stringify(response, null, 2),
            });
            
            // Create error with full details
            const error = new Error(errorMsg);
            (error as any).response = response;
            (error as any).code = response?.code;
            (error as any).originalResponse = response;
            throw error;
          }
          
          // Response is successful - extract data from either format
          authResponse = response;
          
          // Check if response has user/token directly (direct format)
          if (response.user && response.token) {
            userData = response.user;
            token = response.token;
          } 
          // Check if response has data wrapper (wrapped format)
          else if (response.data) {
            if (response.data.user) {
              userData = response.data.user;
            } else if (response.data.userData) {
              userData = response.data.userData;
            } else if (response.data.id || response.data.name || response.data.email) {
              userData = response.data;
            }
            
            if (response.data.token) {
              token = response.data.token;
            } else if (response.data.accessToken) {
              token = response.data.accessToken;
            }
          }
          // Check if response has success: true but data might be at root
          else if (response.success === true) {
            // Data might be at root level
            if (response.user) {
              userData = response.user;
            }
            if (response.token) {
              token = response.token;
            }
          }
          
          if (!userData || !token) {
            console.error('❌ Missing user data or token in response');
            throw new Error('Invalid response format: missing user data or token');
          }
        } catch (apiError: any) {
          // Extract error details from various possible error structures
          const errorDetails: any = {
            code: apiError?.code,
            message: apiError?.message,
            error: apiError?.error,
            status: apiError?.status,
            statusCode: apiError?.statusCode,
            response: apiError?.response,
          };
          
          // Try to extract from ApiError structure (onecrew-api-client)
          if (apiError?.response) {
            errorDetails.responseData = apiError.response;
            if (apiError.response.data) {
              errorDetails.responseError = apiError.response.data.error || apiError.response.data.message;
            }
          }
          
          // Try to extract from nested error structures
          if (apiError?.error) {
            if (typeof apiError.error === 'string') {
              errorDetails.errorMessage = apiError.error;
            } else if (apiError.error?.message) {
              errorDetails.errorMessage = apiError.error.message;
            }
          }
          
          // Build comprehensive error message
          const errorMessage = (
            errorDetails.responseError ||
            errorDetails.errorMessage ||
            apiError?.message ||
            apiError?.error ||
            (apiError?.response?.data?.error) ||
            (apiError?.response?.data?.message) ||
            'Apple Sign-In failed'
          ).toLowerCase();
          
          // If API client method fails, check for category required error
          // Check multiple possible error formats
          const hasCategoryError = 
            apiError?.code === 'CATEGORY_REQUIRED' ||
            errorMessage.includes('category') && errorMessage.includes('required') ||
            (errorDetails.responseError && 
             typeof errorDetails.responseError === 'string' && 
             errorDetails.responseError.toLowerCase().includes('category') &&
             errorDetails.responseError.toLowerCase().includes('required'));
          
          if (hasCategoryError) {
            const categoryError = new Error('CATEGORY_REQUIRED');
            (categoryError as any).code = 'CATEGORY_REQUIRED';
            throw categoryError;
          }
          
          // Check for foreign key constraint error on primary_role
          const hasRoleError = 
            errorMessage.includes('foreign key constraint') && 
            (errorMessage.includes('primary_role') || errorMessage.includes('primary role'));
          
          if (hasRoleError) {
            const roleError = new Error('INVALID_ROLE');
            (roleError as any).code = 'INVALID_ROLE';
            (roleError as any).message = 'The selected role is not valid. Please try selecting a different role or contact support.';
            throw roleError;
          }
          
          // Re-throw with better error message
          const finalErrorMessage = errorDetails.responseError || 
                                   errorDetails.errorMessage || 
                                   apiError?.message || 
                                   'Apple Sign-In failed';
          const finalError = new Error(finalErrorMessage);
          (finalError as any).code = apiError?.code;
          (finalError as any).originalError = apiError;
          throw finalError;
        }
      } else {
        // Fallback to direct fetch for older API client versions
        const requestBody: any = {
          accessToken: accessToken,
          ...(finalCategory && { category: finalCategory }),
          ...(finalRole && { primary_role: finalRole }),
        };
        
        const response = await fetch(`${baseUrl}/api/auth/apple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          let errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // Not JSON, use text response as error message
          }
          
          // Check if error is about missing category
          const errorMessageLower = errorMessage.toLowerCase();
          if (errorMessageLower.includes('category') && errorMessageLower.includes('required')) {
            // Return a special error that can be caught by the UI to show category selection
            const categoryError = new Error('CATEGORY_REQUIRED');
            (categoryError as any).code = 'CATEGORY_REQUIRED';
            throw categoryError;
          }
          
          throw new Error(errorMessage);
        }

        // Parse response
        try {
          authResponse = JSON.parse(responseText);
        } catch (parseError: any) {
          console.error('❌ Failed to parse response as JSON:', responseText);
          throw new Error(responseText || 'Server returned invalid JSON response');
        }
        
        // Extract user data and token from fetch response
        if (authResponse.data) {
          if (authResponse.data.user) {
            userData = authResponse.data.user;
          } else if (authResponse.data.userData) {
            userData = authResponse.data.userData;
          } else if (authResponse.data.id || authResponse.data.name || authResponse.data.email) {
            userData = authResponse.data;
          }
          
          if (authResponse.data.token) {
            token = authResponse.data.token;
          } else if (authResponse.data.accessToken) {
            token = authResponse.data.accessToken;
          }
        }
        
        // Fallback to root level
        if (!userData) {
          userData = authResponse.user;
        }
        
        if (!token) {
          token = authResponse.token || authResponse.accessToken;
        }
      }
      
      if (!userData) {
        throw new Error('Apple Sign-In response missing user data');
      }
      
      if (!token) {
        throw new Error('Apple Sign-In response missing authentication token');
      }
      
      // Clear AsyncStorage after successful sign-in
      try {
        await AsyncStorage.removeItem('pending_category');
        await AsyncStorage.removeItem('pending_role');
      } catch (clearErr) {
        // Silent fail
      }
      
      // Clear any existing tokens before storing new ones to ensure complete replacement
      await clearAllAuthData();
      
      // Clear password reset flag if it exists (user successfully signed in after reset)
      try {
        await AsyncStorage.removeItem('passwordResetFlag');
      } catch (err) {
        // Silent fail
      }
      
      // Store auth data using the same method as login
      if ((api as any).auth && typeof (api as any).auth.setAuthData === 'function') {
        await (api as any).auth.setAuthData({
          token: token,
          user: userData
        });
      } else {
        if ((api as any).apiClient && typeof (api as any).apiClient.setAuthToken === 'function') {
          (api as any).apiClient.setAuthToken(token);
        }
        
        if ((api as any).auth) {
          (api as any).auth.authToken = token;
          (api as any).auth.token = token;
          (api as any).auth.accessToken = token;
          (api as any).auth.currentUser = userData;
        }
      }
      
      // CRITICAL: Ensure API client headers are updated immediately after storing token
      // This prevents race conditions where API calls are made before token is available
      if ((api as any).apiClient) {
        if (!(api as any).apiClient.defaultHeaders) {
          (api as any).apiClient.defaultHeaders = {};
        }
        (api as any).apiClient.defaultHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      // Also update auth service properties directly to ensure immediate availability
      if ((api as any).auth) {
        (api as any).auth.authToken = token;
        (api as any).auth.token = token;
        (api as any).auth.accessToken = token;
      }
      
      // Mark recent login FIRST to prevent immediate 401 handling (before setIsAuthenticated triggers API calls)
      recentLoginRef.current = Date.now();
      
      // Update user state
      setUser(userData);
      setIsAuthenticated(true);
      
      // Set up token refresh callback for automatic re-registration
      pushNotificationService.setOnTokenRefreshCallback((newToken) => {
        if (api.auth.isAuthenticated()) {
          registerPushToken(newToken).catch((error) => {
            console.warn('⚠️ Failed to re-register token after refresh:', error);
          });
        }
      });

      // Register for push notifications after successful login
      setTimeout(async () => {
        try {
          const pushToken = await pushNotificationService.initialize();
          if (pushToken && api.auth.isAuthenticated()) {
            await registerPushToken(pushToken);
          }
        } catch (error) {
          console.error('❌ Failed to register push notifications:', error);
        }
      }, 500);
      
      // Fetch complete user profile data after login
      setTimeout(async () => {
        try {
          const completeUser = await fetchCompleteUserProfile(userData.id, userData);
          if (completeUser) {
            setUser(completeUser as User);
          }
        } catch (err) {
          // Silent fail - profile will load on next refresh
        }
      }, 1000);
      
      return {
        user: userData,
        token: token,
      } as AuthResponse;
      
    } catch (err: any) {
      console.error('❌ Apple Sign-In failed:', err);
      
      // Clear AsyncStorage on error (unless it's a cancellation)
      if (!err?.message?.toLowerCase().includes('cancelled')) {
        try {
          await AsyncStorage.removeItem('pending_category');
          await AsyncStorage.removeItem('pending_role');
        } catch (clearErr) {
          console.warn('⚠️ Failed to clear AsyncStorage on error:', clearErr);
        }
      }
      
      // Don't set error state for category required - let UI handle it
      if (err.code === 'CATEGORY_REQUIRED') {
        throw err;
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message || 'Apple Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear token refresh callback
    pushNotificationService.clearTokenRefreshCallback();
    setIsLoading(true);
    try {
      // Disconnect StreamChat
      try {
        await streamChatService.disconnectUser();
        console.log('✅ StreamChat disconnected');
      } catch (streamError) {
        console.warn('⚠️ Failed to disconnect StreamChat (non-critical):', streamError);
      }
      
      // Unsubscribe from real-time notifications
      if (notificationChannelId) {
        supabaseService.unsubscribe(notificationChannelId);
        setNotificationChannelId(null);
      }
      
      // Unregister push notification token from backend before clearing
      try {
        const currentToken = await pushNotificationService.getStoredToken();
        if (currentToken) {
          console.log('📱 Unregistering push token from backend...');
          await api.pushNotifications.unregisterDeviceToken(currentToken);
          console.log('✅ Push token unregistered from backend');
        }
      } catch (tokenError) {
        console.warn('⚠️ Failed to unregister push token (non-critical):', tokenError);
      }
      
      // Clear push notification token locally
      await pushNotificationService.clearToken();
      await pushNotificationService.setBadgeCount(0);
      
      // Try to call logout API, but don't fail if token is invalid
      try {
        await api.auth.logout();
      } catch (logoutError: any) {
        // If logout fails due to invalid token, that's expected - continue with cleanup
        const isInvalidToken = logoutError?.status === 401 || 
                              logoutError?.statusCode === 401 ||
                              (logoutError?.message || logoutError?.error || '').toLowerCase().includes('invalid token');
        if (isInvalidToken) {
          console.log('⚠️ Logout API call failed due to invalid token (expected) - continuing with cleanup');
        } else {
          console.warn('⚠️ Logout API call failed (non-critical):', logoutError);
        }
      }
      
      // Clear all auth data (including tokens from API client)
      await clearAllAuthData();
      
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      // Clear notification state
      setNotifications([]);
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Logout failed:', err);
      
      // Always clear all auth data, even on error
      try {
        await clearAllAuthData();
      } catch (clearError) {
        console.error('❌ Error clearing auth data during logout:', clearError);
      }
      
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
      
      // Try to unregister token even on error
      try {
        const currentToken = await pushNotificationService.getStoredToken();
        if (currentToken) {
          await api.pushNotifications.unregisterDeviceToken(currentToken);
        }
      } catch (tokenError) {
        // Ignore token unregistration errors during logout
      }
      
      // Clear push notification token even on error
      await pushNotificationService.clearToken();
      await pushNotificationService.setBadgeCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Request password reset (sends OTP to email)
  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📧 Requesting password reset OTP for:', email);
      console.log('📧 API client instance:', api);
      console.log('📧 API auth methods:', Object.keys(api.auth || {}));
      
      // Check if the method exists
      if (!api.auth || typeof api.auth.requestPasswordReset !== 'function') {
        const errorMsg = 'Password reset method not available. Please check API client version.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const response = await api.auth.requestPasswordReset(email);
      console.log('📧 API Response:', response);
      console.log('✅ Password reset OTP sent successfully');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to send reset email. Please try again.';
      console.error('❌ Password reset request failed:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP code and get reset token
  const verifyResetOtp = async (email: string, otpCode: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Verifying OTP code for:', email);
      console.log('🔐 API client instance:', api);
      console.log('🔐 API auth methods:', Object.keys(api.auth || {}));
      
      // Check if the method exists
      if (!api.auth) {
        const errorMsg = 'API auth object not available. Please check API client initialization.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // The method exists in the API client source code, but may not be enumerable
      // Try multiple ways to call it
      let result;
      const authService = api.auth as any;
      
      // Method 1: Try calling directly (even if typeof says undefined, it might work)
      try {
        console.log('✅ Attempting to call authService.verifyResetOtp() directly');
        result = await authService.verifyResetOtp(email.trim().toLowerCase(), otpCode);
        console.log('✅ API client method call successful');
      } catch (directCallError: any) {
        console.log('⚠️ Direct call failed, trying via prototype:', directCallError.message);
        
        // Method 2: Try calling via prototype
        try {
          const prototype = Object.getPrototypeOf(authService);
          if (prototype && typeof prototype.verifyResetOtp === 'function') {
            console.log('✅ Calling via prototype');
            result = await prototype.verifyResetOtp.call(authService, email.trim().toLowerCase(), otpCode);
            console.log('✅ Prototype call successful');
          } else {
            throw new Error('Method not found on prototype');
          }
        } catch (prototypeError: any) {
          console.log('⚠️ Prototype call failed, using apiClient.post:', prototypeError.message);
          
          // Method 3: Use apiClient.post directly (this should work)
          const apiClient = authService?.apiClient || (api as any).apiClient;
          if (apiClient && typeof apiClient.post === 'function') {
            console.log('✅ Using apiClient.post directly');
            try {
              const response = await apiClient.post('/api/auth/verify-reset-otp', {
                email: email.trim().toLowerCase(),
                token: otpCode
              });
              
              console.log('📥 apiClient.post response:', response);
              
              if (response.success && response.data) {
                result = { resetToken: response.data.resetToken || response.data.reset_token };
              } else {
                throw new Error(response.error || 'OTP verification failed');
              }
            } catch (apiClientError: any) {
              console.error('❌ apiClient.post failed:', apiClientError);
              
              // If 404, the backend route isn't deployed yet
              if (apiClientError.message?.includes('404') || apiClientError.message?.includes('not found')) {
                throw new Error('The OTP verification endpoint is not available on the deployed backend. The route exists in the backend code but needs to be deployed. Please contact your backend team to deploy the latest code with the /api/auth/verify-reset-otp endpoint.');
              }
              
              throw apiClientError;
            }
          } else {
            throw new Error('apiClient.post not available');
          }
        }
      }
      
      console.log('🔐 API Response:', result);
      console.log('✅ OTP verified successfully, reset token obtained');
      
      // Ensure result has resetToken
      if (!result || !result.resetToken) {
        throw new Error('Invalid response: resetToken not found');
      }
      
      return result; // Returns { resetToken: "..." }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Invalid or expired OTP code. Please try again.';
      console.error('❌ OTP verification failed:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Confirm password reset using reset token (not OTP code)
  const resetPassword = async (resetToken: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔑 Confirming password reset with reset token');
      
      // API client has a bug - it sends "token" instead of "resetToken"
      // Use direct API call with correct field name
      const apiBaseUrl = (api as any).baseUrl || baseUrl;
      const confirmUrl = `${apiBaseUrl}/api/auth/confirm-reset-password`;
      
      console.log('🌐 Making direct API call to:', confirmUrl);
      console.log('📤 Request payload:', { resetToken, newPassword });
      
      const response = await fetch(confirmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetToken: resetToken, // Backend expects resetToken, not token
          newPassword: newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('✅ Password reset successfully:', responseData);
      
      // Password reset invalidates all sessions - clear auth state completely
      console.log('🧹 Clearing auth state after password reset...');
      
      // Stop heartbeat and background processes first
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Clear local auth state first
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear notifications and subscriptions
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadConversationCount(0);
      
      // Unsubscribe from real-time notifications
      if (notificationChannelId) {
        supabaseService.unsubscribe(notificationChannelId);
        setNotificationChannelId(null);
      }
      
      // Clear push notification token
      await pushNotificationService.clearToken().catch(() => {});
      await pushNotificationService.setBadgeCount(0).catch(() => {});
      
      // Clear ALL authentication data from all storage locations
      await clearAllAuthData();
      
      // Set password reset flag to prevent token restoration on next app start
      try {
        await AsyncStorage.setItem('passwordResetFlag', 'true');
        console.log('✅ Password reset flag set - tokens will not be restored on next app start');
      } catch (err) {
        console.warn('⚠️ Failed to set password reset flag:', err);
      }
      
      // Try logout API call (may fail since token is invalidated, that's OK)
      try {
        await api.auth.logout().catch(() => {
          console.log('⚠️ Logout API call failed (expected - token already invalidated)');
        });
      } catch (err) {
        console.log('⚠️ Error during logout API call (non-critical):', err);
      }
      
      console.log('✅ Auth state cleared - user must sign in with new password');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to reset password';
      const statusCode = err.status || err.response?.status || err.statusCode;
      
      console.error('❌ Password reset confirmation failed:', err);
      console.error('❌ Error details:', {
        message: errorMessage,
        status: statusCode,
        response: err.response,
      });
      
      // Handle rate limiting (429)
      if (statusCode === 429 || errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('too many')) {
        const retryAfter = err.response?.headers?.['retry-after'] || err.retryAfter || 60;
        const minutes = Math.ceil(retryAfter / 60);
        const rateLimitError = `Too many password reset attempts. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again.`;
        setError(rateLimitError);
        throw new Error(rateLimitError);
      }
      
      // Handle token expiration/invalid errors
      if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
        const tokenError = 'The reset token has expired or is invalid. Please request a new password reset.';
        setError(tokenError);
        throw new Error(tokenError);
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignupOtp = async (email: string, token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Verifying signup OTP code for:', email);
      
      // Check if the method exists
      if (!api.auth) {
        const errorMsg = 'API auth object not available. Please check API client initialization.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Try multiple ways to call verifySignupOtp (similar to verifyResetOtp)
      let authResponse: any;
      const authService = api.auth as any;
      
      // Method 1: Try calling directly
      try {
        if (typeof authService.verifySignupOtp === 'function') {
          console.log('✅ Attempting to call authService.verifySignupOtp() directly');
          authResponse = await authService.verifySignupOtp(email.trim().toLowerCase(), token);
          console.log('✅ API client method call successful');
        } else {
          throw new Error('Method not available directly');
        }
      } catch (directCallError: any) {
        console.log('⚠️ Direct call failed, trying via prototype:', directCallError.message);
        
        // Method 2: Try calling via prototype
        try {
          const prototype = Object.getPrototypeOf(authService);
          if (prototype && typeof prototype.verifySignupOtp === 'function') {
            console.log('✅ Calling via prototype');
            authResponse = await prototype.verifySignupOtp.call(authService, email.trim().toLowerCase(), token);
            console.log('✅ Prototype call successful');
          } else {
            throw new Error('Method not found on prototype');
          }
        } catch (prototypeError: any) {
          console.log('⚠️ Prototype call failed, using apiClient.post:', prototypeError.message);
          
          // Method 3: Use apiClient.post directly
          const apiClient = authService?.apiClient || (api as any).apiClient;
          if (apiClient && typeof apiClient.post === 'function') {
            console.log('✅ Using apiClient.post directly for verify-signup-otp');
            try {
              const response = await apiClient.post('/api/auth/verify-signup-otp', {
                email: email.trim().toLowerCase(),
                token: token
              });
              
              console.log('📥 apiClient.post response:', response);
              
              if (response.success && response.data) {
                authResponse = response.data;
              } else {
                throw new Error(response.error || response.message || 'OTP verification failed');
              }
            } catch (apiClientError: any) {
              console.error('❌ apiClient.post failed:', apiClientError);
              
              // If 404, the backend route isn't deployed yet
              if (apiClientError.message?.includes('404') || apiClientError.message?.includes('not found')) {
                throw new Error('The signup OTP verification endpoint is not available on the deployed backend. Please contact your backend team to deploy the latest code with the /api/auth/verify-signup-otp endpoint.');
              }
              
              throw apiClientError;
            }
          } else {
            throw new Error('apiClient.post not available and verifySignupOtp method not found');
          }
        }
      }
      
      console.log('✅ Signup OTP verified successfully:', authResponse);
      
      // IMPORTANT: Save the token and user data to SecureStore
      // This is the ONLY place where we save auth data - NOT during signup, ONLY after OTP verification
      if (authResponse.token || authResponse.access_token) {
        const token = authResponse.token || authResponse.access_token;
        const userData = authResponse.user;
        
        if (token && userData) {
          console.log('🔑 Storing access token and user data after OTP verification');
          
          // Clear any existing tokens before storing new ones
          await clearAllAuthData();
          
          // Use the AuthService's setAuthData method to properly store the token
          if (typeof authService.setAuthData === 'function') {
            console.log('🔑 Using AuthService.setAuthData to store token...');
            await authService.setAuthData({
              token: token,
              user: userData
            });
          } else {
            // Fallback: Set the auth token in the API client directly
            if ((api as any).apiClient && typeof (api as any).apiClient.setAuthToken === 'function') {
              (api as any).apiClient.setAuthToken(token);
            }
            
            // Also store in the auth service for compatibility
            if (authService) {
              authService.authToken = token;
              authService.token = token;
              authService.accessToken = token;
              authService.currentUser = userData;
            }
          }
          
          // Update API client headers
          if ((api as any).apiClient) {
            if (!(api as any).apiClient.defaultHeaders) {
              (api as any).apiClient.defaultHeaders = {};
            }
            (api as any).apiClient.defaultHeaders['Authorization'] = `Bearer ${token}`;
            console.log('✅ API client headers updated with new token');
          }
          
          console.log('🔑 Token has been saved to SecureStore');
        }
      }
      
      // Set user and authenticate after successful verification
      if (authResponse.user) {
        setUser(authResponse.user);
        setIsAuthenticated(true);
        console.log('✅ User authenticated after OTP verification - token is now saved');
        return authResponse;
      } else {
        throw new Error('User data not found in response');
      }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Invalid or expired OTP code. Please try again.';
      console.error('❌ Signup OTP verification failed:', err);
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, token: string, type?: "signup" | "email_change") => {
    setIsLoading(true);
    setError(null);
    try {
      // New library version (v2.14.0) signature: verifyEmail(token: string, type?: 'signup' | 'email_change')
      // The email is not needed as a parameter - it's encoded in the token or handled by backend
      // Note: For signup verification, use verifySignupOtp instead
      await api.auth.verifyEmail(token, type);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify email';
      setError(errorMessage);
      
      // Handle token expiration
      if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
        throw new Error('The verification link has expired or is invalid. Please request a new verification email.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.resendVerificationEmail(email);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend verification email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      
      // Password change invalidates all sessions - log out user
      console.log('🔐 Password changed - invalidating session');
      await logout();
      
      // Show message that user needs to log in again
      Alert.alert(
        'Password Changed',
        'Your password has been changed successfully. Please sign in again with your new password.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError(errorMessage);
      
      // Handle current password mismatch
      if (errorMessage.toLowerCase().includes('current password') || errorMessage.toLowerCase().includes('incorrect password')) {
        throw new Error('Current password is incorrect. Please try again.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Account deletion methods (v2.17.0)
  const requestAccountDeletion = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🗑️ Requesting account deletion with grace period');
      const response = await api.requestAccountDeletion(password);
      
      if (response.success && response.data) {
        console.log('✅ Account deletion requested successfully');
        console.log('📅 Expiration date:', response.data.expirationDate);
        console.log('⏰ Days remaining:', response.data.daysRemaining);
        
        return {
          expirationDate: response.data.expirationDate,
          daysRemaining: response.data.daysRemaining,
        };
      } else {
        throw new Error('Failed to request account deletion');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to request account deletion';
      console.error('❌ Account deletion request failed:', err);
      setError(errorMessage);
      
      // Handle password mismatch
      if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('incorrect')) {
        throw new Error('Password is incorrect. Please try again.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const restoreAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('♻️ Restoring account from deletion');
      const response = await api.restoreAccount();
      
      if (response.success) {
        console.log('✅ Account restored successfully');
      } else {
        throw new Error('Failed to restore account');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore account';
      console.error('❌ Account restoration failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const getAccountDeletionStatus = useCallback(async () => {
    // Don't set global loading state for read operations - let the component handle its own loading
    try {
      console.log('📊 Checking account deletion status');
      const response = await api.getAccountDeletionStatus();
      
      if (response.success && response.data) {
        console.log('✅ Account deletion status retrieved');
        return {
          isPending: response.data.isPending,
          expirationDate: response.data.expirationDate,
          daysRemaining: response.data.daysRemaining,
        };
      } else {
        throw new Error('Failed to get account deletion status');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get account deletion status';
      console.error('❌ Failed to get account deletion status:', err);
      // Don't set global error for read operations - let the component handle errors
      throw err;
    }
  }, [api]);

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
            console.warn(`⚠️ Failed to remove skill ${skillId}:`, err);
            return null;
          })
        );
        
        // Add new skills (only add ones not already present)
        const skillsToActuallyAdd = skillIdsToAdd.filter((skillId: string) => 
          !currentSkillIds.includes(skillId)
        );
        
        const addPromises = skillsToActuallyAdd.map((skillId: string) => 
          api.addUserSkill(skillId as string).catch((err: unknown) => {
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
          console.warn('⚠️ Available skill names (first 10):', availableSkills.slice(0, 10).map((s: { id: string; name?: string }) => s.name));
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
          coverImages: profileData.coverImages || profileData.cover_images || basicResult.data?.cover_images || basicResult.data?.coverImages || [],
          skills: profileData.skills || [],
          about: {
            ...(user as any).about,
            ...talentResult.data
          }
        };
        console.log('👤 Updated user data with preserved ID:', updatedUser.id);
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
            const skill = availableSkills.find((s: { id: string; name?: string }) => s.name?.toLowerCase() === skillName.toLowerCase());
            return skill?.id;
          })
          .filter(Boolean);
        
        console.log('🔍 Skill IDs to add:', skillIdsToAdd);
        
        // Add each skill individually
        const addPromises = skillIdsToAdd.map(skillId => 
          api.addUserSkill(skillId as string).catch((err: unknown) => {
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
            console.log('✅ Direct API call successful:', response);
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
      console.error('❌ Failed to create custom role:', error);
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

  // Teams (shared teams list)
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
    return performanceMonitor.trackApiCall(
      'Fetch Complete User Profile',
      `${baseUrl}/api/users/${userId}`,
      'GET',
      () => rateLimiter.execute(cacheKey, async () => {
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
    }, { ttl: CacheTTL.MEDIUM, persistent: true })
    );
  };

  // Direct fetch method for getting users
  // Accepts all FilterParams to support comprehensive filtering
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
    }, { ttl: CacheTTL.SHORT }) // Users list changes frequently - 30s TTL for fresh data
    );
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
    return performanceMonitor.trackApiCall(
      'Health Check',
      `${baseUrl}/api/health`,
      'GET',
      () => api.healthCheck()
    );
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
    // CRITICAL: Always use the provided userId, never fall back to current user's ID
    // This ensures we fetch the correct user's social links, not the logged-in user's
    const targetUserId = userId; // Don't fall back to user?.id - this causes the bug!
    
    // Check if fetching for current user or another user
    const isCurrentUserRequest = !targetUserId || targetUserId === user?.id;
    
    // IMPORTANT: Only cache for current user's social links
    // For other users, always fetch fresh data to avoid showing wrong social links
    const fetchSocialLinks = async () => {
      try {
        console.log('🔗 Fetching user social links...', targetUserId ? `for user ${targetUserId}` : 'for current user (no cache)');
        const accessToken = getAccessToken();
        
        // Always include user_id parameter if provided, otherwise backend returns current user's links
        const url = targetUserId 
          ? `${baseUrl}/api/social-links?user_id=${targetUserId}`
          : `${baseUrl}/api/social-links`;
        
        console.log('🔗 API URL:', url);
        
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

        // DEBUG: Log the actual response data to verify backend is returning correct user's links
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          console.log('🔍 [DEBUG] Social links response data:', JSON.stringify(result.data, null, 2));
          const firstLink = result.data[0];
          if (firstLink.user_id) {
            console.log('🔍 [DEBUG] First link user_id:', firstLink.user_id, 'Expected:', targetUserId);
            if (firstLink.user_id !== targetUserId) {
              console.error('❌ [BUG DETECTED] Backend returned wrong user\'s social links!');
              console.error('   Expected user_id:', targetUserId);
              console.error('   Got user_id:', firstLink.user_id);
              console.error('   This is a BACKEND bug - the API is ignoring the user_id parameter');
            } else {
              console.log('✅ [DEBUG] Backend returned correct user\'s social links');
            }
          }
        }

        console.log('✅ Social links fetched successfully for user', targetUserId || 'current', ':', result.data?.length || 0, 'links');
        return result;
      } catch (error: any) {
        console.error('❌ Failed to fetch social links for user', targetUserId || 'current', ':', error);
        throw error;
      }
    };
    
    // Only cache for current user's own social links
    // For other users, always fetch fresh to avoid showing wrong data
    if (isCurrentUserRequest) {
      const cacheKey = 'user-social-links-current';
      return rateLimiter.execute(cacheKey, fetchSocialLinks, { ttl: CacheTTL.SHORT, persistent: false });
    } else {
      // NO CACHING for other users' social links - always fetch fresh!
      console.log('🔗 Fetching OTHER user social links (no cache) for:', targetUserId);
      return fetchSocialLinks();
    }
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

      // Invalidate all social links caches (for current user and any specific userId)
      await rateLimiter.clearCache('user-social-links');
      await rateLimiter.clearCacheByPattern('user-social-links');
      // Trigger refresh in components that display social links
      setSocialLinksRefreshTrigger(prev => prev + 1);
      
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

      // Invalidate all social links caches (for current user and any specific userId)
      await rateLimiter.clearCache('user-social-links');
      await rateLimiter.clearCacheByPattern('user-social-links');
      // Trigger refresh in components that display social links
      setSocialLinksRefreshTrigger(prev => prev + 1);
      
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

      // Invalidate all social links caches (for current user and any specific userId)
      await rateLimiter.clearCache('user-social-links');
      await rateLimiter.clearCacheByPattern('user-social-links');
      // Trigger refresh in components that display social links
      setSocialLinksRefreshTrigger(prev => prev + 1);
      
      console.log('✅ Social link deleted successfully');
      return result;
    } catch (error: any) {
      console.error('❌ Failed to delete social link:', error);
      throw error;
    }
  };

  // Profile picture management methods
  const getUserProfilePictures = async (userId: string) => {
    const cacheKey = `user-profile-pictures-${userId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('🖼️ Fetching profile pictures for user:', userId);
        const response = await api.getUserProfilePictures(userId);
        console.log('✅ Profile pictures fetched successfully:', response.data?.length || 0, 'pictures');
        return response;
      } catch (error: any) {
        console.error('❌ Failed to fetch profile pictures:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: false }); // Pictures change occasionally; cache briefly to speed profile loads
  };

  const uploadProfilePicture = async (file: any, isMain: boolean = false) => {
    try {
      console.log('📤 Uploading profile picture, isMain:', isMain);
      const response = await api.uploadProfilePicture(file, isMain);
      console.log('✅ Profile picture uploaded successfully');
      // Invalidate profile pictures cache (current user)
      const targetUserId = (response as any)?.data?.user_id || user?.id;
      if (targetUserId) {
        await rateLimiter.clearCache(`user-profile-pictures-${targetUserId}`);
      } else {
        await rateLimiter.clearCacheByPattern('user-profile-pictures-');
      }
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
      await rateLimiter.clearCache(`user-profile-pictures-${userId}`);
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
      await rateLimiter.clearCache(`user-profile-pictures-${userId}`);
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

  // Browse users as guest - accepts all FilterParams for comprehensive filtering
  const browseUsersAsGuest = async (params?: FilterParams & { page?: number; limit?: number }) => {
    if (!guestSessionId) {
      throw new Error('No guest session available');
    }
    try {
      console.log('🎭 Browsing users as guest...', params);
      // The underlying API client may only support basic params, but we pass all params
      // The backend should handle unsupported params gracefully
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

  const getProjects = async (filters?: {
    minimal?: boolean;
    created_by?: string;
    member_id?: string;
    role?: 'owner' | 'member' | 'viewer';
    status?: 'active' | 'deleted';
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get Projects',
      `${baseUrl}/api/projects`,
      'GET',
      async () => {
        try {
          // Use minimal=true by default for backward compatibility, but allow override
          const params = {
            minimal: filters?.minimal !== undefined ? filters.minimal : true,
            ...(filters?.created_by && { created_by: filters.created_by }),
            ...(filters?.member_id && { member_id: filters.member_id }),
            ...(filters?.role && { role: filters.role }),
            ...(filters?.status && { status: filters.status }),
            ...(filters?.search && { search: filters.search }),
            ...(filters?.type && { type: filters.type }),
            ...(filters?.page && { page: filters.page }),
            ...(filters?.limit && { limit: filters.limit }),
          };
          
          const response = await api.getProjects(params as any);
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
      }
    );
  };

  const getMyProjects = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    include_deleted?: boolean;
    minimal?: boolean;
    role?: 'owner' | 'member' | 'viewer';
    access_level?: 'owner' | 'member' | 'viewer';
    is_owner?: boolean;
    search?: string;
    type?: string;
    sort_by?: 'created_at' | 'updated_at' | 'title';
    sort?: string;
    order?: 'asc' | 'desc';
    fields?: string[];
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get My Projects',
      `${baseUrl}/api/projects/my`,
      'GET',
      async () => {
        try {
          const response = await api.getMyProjects(params);
          
          if (response.success && response.data) {
            let projects: any[] = [];
            
            // Handle paginated response structure
            if (Array.isArray(response.data)) {
              projects = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              projects = response.data.data;
            } else if ((response.data as any).items && Array.isArray((response.data as any).items)) {
              projects = (response.data as any).items;
            } else {
              console.warn('⚠️ Unexpected response structure from getMyProjects:', Object.keys(response.data));
              return [];
            }
            
            // Map project_members to members for consistency
            projects = projects.map((project: any) => ({
              ...project,
              members: project.project_members || project.members || [],
            }));
            
            return projects;
          } else {
            console.warn('⚠️ Backend returned unsuccessful response or no data');
            return [];
          }
        } catch (error) {
          console.error('❌ Failed to get my projects:', error);
          return [];
        }
      }
    );
  };

  const getAllProjects = async (filters?: {
    minimal?: boolean;
    role?: 'owner' | 'member' | 'viewer';
    is_owner?: boolean;
    status?: 'active' | 'deleted';
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get All Projects',
      `${baseUrl}/api/projects/all`,
      'GET',
      async () => {
        try {
          // Backend now includes project_members in the response, eliminating N+1 queries
          // No need to enrich each project with separate API calls
          let projects: any[] = [];
          try {
            // Use minimal=true by default for backward compatibility, but allow override
            // Apply server-side filtering parameters
            const params: any = {
              minimal: filters?.minimal !== undefined ? filters.minimal : true,
              ...(filters?.role && { role: filters.role }),
              ...(filters?.is_owner !== undefined && { is_owner: filters.is_owner }),
              ...(filters?.status && { status: filters.status }),
              ...(filters?.search && { search: filters.search }),
              ...(filters?.type && { type: filters.type }),
              ...(filters?.page && { page: filters.page }),
              ...(filters?.limit && { limit: filters.limit }),
            };
            
            // Use minimal=true to get lightweight project data (no tasks, minimal member info)
            // This significantly reduces network payload and improves performance
            const myProjectsResponse = await api.getMyProjects(params);
            
            console.log('📥 getMyProjects (minimal) response received:', {
              success: myProjectsResponse.success,
              hasData: !!myProjectsResponse.data,
              dataType: Array.isArray(myProjectsResponse.data) ? 'array' : typeof myProjectsResponse.data,
            });
            
            if (myProjectsResponse.success && myProjectsResponse.data) {
              // Handle paginated response structure: response.data.data is the array
              if (Array.isArray(myProjectsResponse.data)) {
                projects = myProjectsResponse.data;
                console.log(`📦 Found ${projects.length} projects in array response`);
              } else if (myProjectsResponse.data.data && Array.isArray(myProjectsResponse.data.data)) {
                projects = myProjectsResponse.data.data;
                console.log(`📦 Found ${projects.length} projects in paginated response (data.data)`);
              } else if ((myProjectsResponse.data as any).items && Array.isArray((myProjectsResponse.data as any).items)) {
                projects = (myProjectsResponse.data as any).items;
                console.log(`📦 Found ${projects.length} projects in items response`);
              } else {
                console.warn('⚠️ Unexpected response structure:', Object.keys(myProjectsResponse.data));
              }
              
              // Backend now returns minimal data (no tasks, lightweight members)
              // Map project_members/users to members for backward compatibility
              projects = projects.map((project: any) => {
                // Log raw project structure to understand what minimal endpoint returns
                if (projects.indexOf(project) === 0) {
                  console.log('🔍 Raw project from minimal endpoint:', {
                    id: project.id,
                    title: project.title,
                    has_project_members: !!project.project_members,
                    has_members: !!project.members,
                    has_users: !!project.users,
                    users_type: Array.isArray(project.users) ? 'array' : typeof project.users,
                    users_length: Array.isArray(project.users) ? project.users.length : 'N/A',
                    project_keys: Object.keys(project),
                  });
                }
                
                // Minimal endpoint may return members in different field names
                // Check: project_members, members, or users (for minimal endpoint)
                let members = project.project_members || project.members || [];
                
                // If members is empty but users exists, check if it's the members array
                // (minimal endpoint might use 'users' field for members)
                if (members.length === 0 && project.users && Array.isArray(project.users)) {
                  // Check if users array contains member objects (with role, user_id)
                  const firstUser = project.users[0];
                  if (firstUser && (firstUser.role || firstUser.user_id)) {
                    members = project.users;
                    console.log(`✅ Found members in 'users' field for project ${project.id}:`, members.length);
                  }
                }
                
                return {
                  ...project,
                  members,
                  // Ensure tasks is empty array for UI consistency (minimal endpoint doesn't include tasks)
                  tasks: [],
                };
              });
              
              console.log(`✅ Loaded ${projects.length} projects (minimal data from backend)`);
              
              // Debug: Log first project structure (should be lightweight)
              if (projects.length > 0) {
                console.log('📋 Sample project structure (minimal):', {
                  id: projects[0].id,
                  title: projects[0].title,
                  is_deleted: projects[0].is_deleted,
                  deleted_at: projects[0].deleted_at,
                  created_by: projects[0].created_by,
                  members_count: projects[0].members?.length || 0,
                  has_tasks: projects[0].tasks?.length > 0,
                  member_keys: projects[0].members?.[0] ? Object.keys(projects[0].members[0]) : [],
                });
              } else {
                console.warn('⚠️ No projects returned from backend - this might indicate:');
                console.warn('   1. All projects are soft-deleted');
                console.warn('   2. Backend filtering is too aggressive');
                console.warn('   3. User has no projects');
                console.warn('   4. Backend bug in getMyProjects()');
              }
            } else {
              console.warn('⚠️ Backend returned unsuccessful response or no data');
              console.log('Response summary:', {
                success: myProjectsResponse.success,
                hasData: !!myProjectsResponse.data,
                error: (myProjectsResponse as any).error,
              });
            }
          } catch (err) {
            console.error('❌ Failed to get my projects:', err);
            throw err;
          }
          
          return projects;
        } catch (error) {
          console.error('❌ Failed to get all user projects:', error);
          throw error;
        }
      }
    );
  };

  /**
   * Get owner projects for the current user (optimized endpoint).
   * Uses the onecrew-api-client's getMyOwnerProjects() method for server-side filtering.
   */
  const getMyOwnerProjects = async (filters?: {
    minimal?: boolean;
    search?: string;
    type?: string;
    status?: 'active' | 'deleted';
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get My Owner Projects',
      `${baseUrl}/api/projects/my/owner`,
      'GET',
      async () => {
        try {
          // Use minimal=true by default for backward compatibility
          const params: any = {
            minimal: filters?.minimal !== undefined ? filters.minimal : true,
            ...(filters?.search && { search: filters.search }),
            ...(filters?.type && { type: filters.type }),
            ...(filters?.status && { status: filters.status }),
            ...(filters?.page && { page: filters.page }),
            ...(filters?.limit && { limit: filters.limit }),
          };

          // Use getMyProjects with is_owner: true for server-side filtering
          // Note: getMyOwnerProjects may not be available in all API client versions
          const response = await api.getMyProjects({ ...params, is_owner: true } as any);
          
          if (response.success && response.data) {
            // Handle both array and paginated response
            let projects: any[] = [];
            if (Array.isArray(response.data)) {
              projects = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              projects = response.data.data;
            } else if ((response.data as any).items && Array.isArray((response.data as any).items)) {
              projects = (response.data as any).items;
            }
            
            // Normalize members field for backward compatibility
            projects = projects.map((project: any) => {
              let members = project.project_members || project.members || [];
              if (members.length === 0 && project.users && Array.isArray(project.users)) {
                const firstUser = project.users[0];
                if (firstUser && (firstUser.role || firstUser.user_id)) {
                  members = project.users;
                }
              }
              
              return {
                ...project,
                members,
                tasks: [],
              };
            });
            
            return projects;
          } else {
            throw new Error(response.error || 'Failed to fetch owner projects');
          }
        } catch (error) {
          console.error('Failed to get owner projects:', error);
          throw error;
        }
      }
    );
  };

  /**
   * Get deleted (soft-deleted) projects for the current user.
   * Uses the onecrew-api-client's getDeletedProjects() method.
   */
  const getDeletedProjects = async (): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get Deleted Projects',
      `${baseUrl}/api/projects/deleted`,
      'GET',
      async () => {
        try {
          // Use the API client's getDeletedProjects method
          const response = await api.getDeletedProjects();
          
          if (response.success && response.data) {
            let projects: any[] = [];
            
            // Handle paginated response structure
            if (Array.isArray(response.data)) {
              projects = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              projects = response.data.data;
            } else if ((response.data as any).items && Array.isArray((response.data as any).items)) {
              projects = (response.data as any).items;
            } else {
              console.warn('⚠️ Unexpected response structure from getDeletedProjects:', Object.keys(response.data));
              return [];
            }
            
            console.log(`✅ Loaded ${projects.length} deleted projects using API client`);
            
            // Map project_members to members for consistency
            projects = projects.map((project: any) => ({
              ...project,
              members: project.project_members || project.members || [],
            }));
            
            return projects;
          } else {
            console.warn('⚠️ Backend returned unsuccessful response or no data');
            console.log('Response:', response);
            return [];
          }
        } catch (error) {
          console.error('❌ Failed to get deleted projects:', error);
          // Return empty array instead of throwing - recycle bin can show empty state
          return [];
        }
      }
    );
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
    return performanceMonitor.trackApiCall(
      'Get Project By ID',
      `${baseUrl}/api/projects/${projectId}`,
      'GET',
      async () => {
        try {
          const response = await api.getProjectById(projectId);
      
          if (response.success && response.data) {
            // getProjectById should return a single project object, not an array
            return response.data;
          } else {
            const errorMessage = response.error || 'Failed to get project details';
            // Provide more context for access denied errors
            if (errorMessage.includes('Access denied') || errorMessage.includes('not a member')) {
              throw new Error(`Access denied: You do not have permission to view project ${projectId}. You must be the project owner or a member.`);
            }
            throw new Error(errorMessage);
          }
        } catch (error: any) {
          // Log error with more context
          if (error?.message?.includes('Access denied') || error?.message?.includes('403')) {
            console.error(`❌ Access denied for project ${projectId}:`, error.message);
          } else {
            console.error(`❌ Failed to get project details for ${projectId}:`, error);
          }
          throw error;
        }
      }
    );
  };

  const getProjectStats = async (projectId: string) => {
    try {
      console.log('📊 Getting project stats:', projectId);
      const response = await api.getProjectStats(projectId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to get project stats');
    } catch (error: any) {
      console.error('❌ Failed to get project stats:', error);
      throw error;
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      console.log('♻️ Restoring project:', projectId);
      const response = await api.restoreProject(projectId);
      
      if (response.success && response.data) {
        // Invalidate related caches
        await rateLimiter.clearCacheByPattern(`project-${projectId}`);
        await rateLimiter.clearCacheByPattern('projects');
        await rateLimiter.clearCacheByPattern('deleted-projects');
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to restore project');
    } catch (error: any) {
      console.error('❌ Failed to restore project:', error);
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

  const getProjectMembersWithRoles = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const response = await api.getProjectMembersWithRoles(projectId);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to get project members with roles');
      }
    } catch (error) {
      console.error('Failed to get project members with roles:', error);
      throw error;
    }
  };

  const getProjectRoles = async (projectId: string) => {
    try {
      const response = await api.getProjectRoles(projectId);
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to get project roles');
    } catch (error: any) {
      console.error('❌ Failed to get project roles:', error);
      throw error;
    }
  };

  /**
   * Check if a project has pending task assignments for a specific user.
   * This is optimized to use a lightweight endpoint if available, otherwise falls back
   * to checking tasks (less efficient but works with current backend).
   * 
   * @param projectId - The project ID to check
   * @param userId - The user ID to check pending assignments for
   * @returns Object with hasPending boolean and optional count
   */
  const checkPendingAssignments = async (
    projectId: string, 
    userId: string
  ): Promise<{ hasPending: boolean; count?: number }> => {
    return performanceMonitor.trackApiCall(
      'Check Pending Assignments',
      `${baseUrl}/api/projects/${projectId}/pending-assignments`,
      'GET',
      async () => {
        try {
          // Try lightweight endpoint first (if backend supports it)
          try {
            const token = await AsyncStorage.getItem('accessToken');
            const response = await fetch(
              `${baseUrl}/api/projects/${projectId}/pending-assignments?userId=${userId}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.hasPending !== undefined) {
                console.log(`✅ Using lightweight endpoint for pending check: ${projectId}`);
                return {
                  hasPending: data.hasPending || false,
                  count: data.count,
                };
              }
            }
          } catch (lightweightError) {
            // Endpoint doesn't exist yet, fall back to checking tasks
            console.log(`⚠️ Lightweight endpoint not available, using fallback for project ${projectId}`);
          }

          // Fallback: Check tasks (less efficient but works with current backend)
          // This will be replaced once backend implements the lightweight endpoint
          const tasks = await getProjectTasks(projectId);
          let pendingCount = 0;

          for (const task of tasks) {
            const assignments = task.assignments || [];
            const hasPending = assignments.some((assignment: any) => {
              const assignmentUserId = assignment.user_id || assignment.user?.id;
              const assignmentStatus = assignment.status || 'pending';
              return assignmentUserId === userId && assignmentStatus === 'pending';
            });
            
            if (hasPending) {
              pendingCount++;
            }
          }

          return {
            hasPending: pendingCount > 0,
            count: pendingCount,
          };
        } catch (error) {
          console.error(`Failed to check pending assignments for project ${projectId}:`, error);
          // Return false on error to prevent blocking UI
          return { hasPending: false, count: 0 };
        }
      }
    );
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

  const assignTaskService = async (projectId: string, taskId: string, assignment: AssignTaskServiceRequest | ApiAssignTaskServiceRequest) => {
    try {
      console.log('📋 Assigning task service:', {
        projectId,
        taskId,
        service_role: assignment.service_role,
        user_id: assignment.user_id,
        company_id: assignment.company_id
      });
      
      // Validate required fields
      // Either user_id OR company_id must be provided (not both)
      if (!assignment.user_id && !assignment.company_id) {
        throw new Error('Either user_id or company_id is required for task assignment');
      }
      if (!assignment.service_role) {
        throw new Error('service_role is required for task assignment');
      }
      
      // Build clean assignment object - remove undefined values and ensure XOR condition
      // Joi's .xor() requires exactly one of user_id or company_id, and undefined values break it
      const apiAssignment: any = {
        service_role: assignment.service_role as any,
      };
      
      // Only include user_id OR company_id (not both, and not undefined)
      if (assignment.company_id) {
        // Company assignment - only send company_id
        apiAssignment.company_id = assignment.company_id;
      } else if (assignment.user_id) {
        // User assignment - only send user_id
        apiAssignment.user_id = assignment.user_id;
      }
      
      // Log what we're sending
      console.log('📤 Sending assignment request:', {
        service_role: apiAssignment.service_role,
        user_id: apiAssignment.user_id || 'NOT INCLUDED',
        company_id: apiAssignment.company_id || 'NOT INCLUDED',
      });
      
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

  const unassignTaskService = async (projectId: string, taskId: string, assignmentId: string) => {
    try {
      console.log('📋 Unassigning task service:', projectId, taskId, assignmentId);
      const response = await api.unassignTaskService(projectId, taskId, assignmentId);
      
      if (response.success) {
        // Invalidate related caches
        await rateLimiter.clearCacheByPattern(`project-${projectId}`);
        await rateLimiter.clearCacheByPattern(`task-${taskId}`);
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to unassign task service');
    } catch (error: any) {
      console.error('❌ Failed to unassign task service:', error);
      throw error;
    }
  };

  const getTaskById = async (taskId: string) => {
    try {
      console.log('📋 Getting task by ID:', taskId);
      const response = await api.getTaskById(taskId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to get task');
    } catch (error: any) {
      console.error('❌ Failed to get task:', error);
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
  const switchToUserProfile = async () => {
    try {
      console.log('🔄 [ProfileSwitch] Switching to user profile...');
      
      // Clear conversation cache for the previous profile
      const previousProfileType = currentProfileType;
      const previousProfileId = previousProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      if (previousProfileId) {
        // Clear all conversation-related cache entries
        const cachePatterns = [
          `conversations-company-${previousProfileId}`,
          `conversations-user-${previousProfileId}`,
        ];
        for (const pattern of cachePatterns) {
          await rateLimiter.clearCache(pattern);
        }
      }
      
      // Update state first (synchronously)
      setCurrentProfileType('user');
      setActiveCompany(null);
      
      // Update AsyncStorage (non-blocking)
      AsyncStorage.setItem('currentProfileType', 'user').catch(err => {
        console.warn('⚠️ Failed to save profile type to storage:', err);
      });
      AsyncStorage.removeItem('activeCompanyId').catch(err => {
        console.warn('⚠️ Failed to remove company ID from storage:', err);
      });
      
      // Reconnect StreamChat with user profile (non-blocking, don't throw)
      if (user?.id) {
        // Use setTimeout to defer reconnection slightly, allowing state updates to propagate
        setTimeout(async () => {
          try {
            const streamTokenResponse = await getStreamChatToken({ profile_type: 'user' });
            if (streamTokenResponse.success && streamTokenResponse.data) {
              const { token, user_id, api_key } = streamTokenResponse.data as any;
              // Use user_id from token response (backend knows the correct StreamChat user ID format)
              await streamChatService.reconnectUser(
                user_id, // Use user_id from token, not mapped OneCrew ID
                token,
                {
                  name: user.name,
                  image: user.image_url,
                },
                api_key, // Pass API key from backend if provided
                'user' // User type for tracking
              );
              console.log('✅ StreamChat reconnected with user profile');
            }
          } catch (streamError: any) {
            // Don't throw - just log the error
            console.warn('⚠️ Failed to reconnect StreamChat (non-critical):', streamError?.message || streamError);
            // StreamChatProvider will handle reconnection automatically
          }
        }, 100); // Small delay to allow state updates
      }
      
      console.log('✅ Switched to user profile');
    } catch (error: any) {
      // CRITICAL: Never throw errors during profile switch - this can cause app restarts
      console.error('❌ Error switching to user profile (recovered):', error?.message || error);
      // Still update state even if there's an error
      setCurrentProfileType('user');
      setActiveCompany(null);
    }
  };

  const switchToCompanyProfile = async (companyId: string) => {
    try {
      // Verify user is owner or admin of this company before allowing switch
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // CRITICAL: Force refresh company list to ensure we have latest membership data
      // This prevents switching to companies the user no longer has access to
      console.log('🔄 [ProfileSwitch] Refreshing company list to verify membership...');
      const userCompaniesResponse = await getUserCompanies(user.id, true); // Force refresh
      
      // Extract company data from company list for fallback (name, logo_url)
      // This ensures avatar updates even if getCompany times out
      let fallbackCompanyData: { name?: string; logo_url?: string } = {};
      
      if (userCompaniesResponse.success && userCompaniesResponse.data) {
        const responseData = userCompaniesResponse.data as any;
        const companies = Array.isArray(responseData) 
          ? responseData 
          : (responseData.data || []);
        
        // Find the company and check if user is owner or admin
        const companyMember = companies.find((cm: any) => {
          const cmCompanyId = cm.companies?.id || cm.company_id || cm.id;
          return cmCompanyId === companyId;
        });
        
        if (!companyMember) {
          // User is not a member - don't switch, just return
          console.warn('⚠️ [ProfileSwitch] Company not found in user companies list - user may have lost access');
          throw new Error('Company not found in your companies list. You may no longer have access to this company.');
        }
        
        const role = companyMember.role || companyMember.member?.role;
        if (role !== 'owner' && role !== 'admin') {
          // User is not owner/admin - don't switch
          console.warn('⚠️ [ProfileSwitch] User is not owner/admin of company');
          throw new Error('Only company owners and admins can switch to company profiles');
        }
        
        // Extract company data from companyMember for fallback (name, logo_url)
        const companyFromList = companyMember.companies || companyMember;
        fallbackCompanyData = {
          name: companyFromList.name,
          logo_url: companyFromList.logo_url,
        };
        
        console.log('✅ [ProfileSwitch] Membership verified - user is', role, 'of company');
        console.log('📦 [ProfileSwitch] Fallback data available:', {
          hasName: !!fallbackCompanyData.name,
          hasLogo: !!fallbackCompanyData.logo_url
        });
      } else {
        // If we can't verify membership, don't switch
        console.warn('⚠️ [ProfileSwitch] Could not verify company membership');
        throw new Error('Could not verify company membership. Please try again.');
      }
      
      // Clear conversation cache for the previous profile
      const previousProfileType = currentProfileType;
      const previousProfileId = previousProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      if (previousProfileId) {
        // Clear all conversation-related cache entries
        const cachePatterns = [
          `conversations-company-${previousProfileId}`,
          `conversations-user-${previousProfileId}`,
        ];
        for (const pattern of cachePatterns) {
          await rateLimiter.clearCache(pattern);
        }
      }
      
      // OPTIMIZATION: Use company list data immediately, then enhance with getCompany in background
      // This ensures instant profile switch (< 100ms) while full data loads in background
      let companyData: any = {
        id: companyId,
        name: fallbackCompanyData.name,
        logo_url: fallbackCompanyData.logo_url,
        // Use company list data immediately - no waiting for getCompany
      };
      
      // Update state IMMEDIATELY with company list data (no waiting)
      setActiveCompany(companyData);
      setCurrentProfileType('company');
      
      // Update AsyncStorage (non-blocking)
      AsyncStorage.setItem('currentProfileType', 'company').catch(err => {
        console.warn('⚠️ Failed to save profile type to storage:', err);
      });
      AsyncStorage.setItem('activeCompanyId', companyId).catch(err => {
        console.warn('⚠️ Failed to save company ID to storage:', err);
      });
      
      console.log('✅ [ProfileSwitch] Profile switched immediately with company list data:', {
        companyId,
        hasName: !!companyData.name,
        hasLogo: !!companyData.logo_url
      });
      
      // Enhance company data in background (non-blocking)
      // Only fetch if we need additional fields beyond what company list provides
      (async () => {
        try {
          // Reduced timeout to 3 seconds for faster failover
          const getCompanyPromise = getCompany(companyId, {
            fields: ['id', 'name', 'logo_url', 'subcategory', 'approval_status']
          });
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 3000); // Reduced from 10s to 3s
          });
          
          const companyResponse = await Promise.race([getCompanyPromise, timeoutPromise]) as any;
          
          if (companyResponse.success && companyResponse.data) {
            // Enhance company data with fresh data from getCompany
            const enhancedData = companyResponse.data;
            // Always update to ensure we have the latest data, but preserve logo_url from company list if getCompany doesn't have it
            setActiveCompany({
              ...companyData, // Start with company list data (includes logo_url)
              ...enhancedData, // Merge fresh data from getCompany
              // Preserve logo_url from company list if getCompany doesn't return it
              logo_url: enhancedData.logo_url || companyData.logo_url,
              // Preserve name from company list if getCompany doesn't return it
              name: enhancedData.name || companyData.name,
            });
            console.log('✅ [ProfileSwitch] Company data enhanced with fresh data', {
              hasLogo: !!(enhancedData.logo_url || companyData.logo_url),
              hasName: !!(enhancedData.name || companyData.name),
            });
          }
        } catch (timeoutError: any) {
          // getCompany failed or timed out - that's OK, we already have company list data
          console.log('ℹ️ [ProfileSwitch] getCompany not available (using company list data):', timeoutError?.message || timeoutError);
          // Don't log as warning - this is expected and acceptable
        }
      })(); // Execute in background, don't wait
      
      // Reconnect StreamChat with company profile immediately (parallel with state update)
      // StreamChatProvider will also handle reconnection, but we do it here for faster response
      (async () => {
          try {
            console.log('🔄 [ProfileSwitch] Reconnecting StreamChat with company profile...');
            const streamTokenResponse = await getStreamChatToken({ 
              profile_type: 'company', 
              company_id: companyId 
            });
            if (streamTokenResponse.success && streamTokenResponse.data) {
              const { token, user_id, api_key } = streamTokenResponse.data as any;
              // Use user_id from token response (backend knows the correct StreamChat user ID format)
              await streamChatService.reconnectUser(
                user_id, // Use user_id from token, not mapped OneCrew ID
                token,
                {
                  name: companyData.name || 'Company', // Fallback if name not loaded
                  image: companyData.logo_url || undefined, // Only set if available
                },
                api_key, // Pass API key from backend if provided
                'company' // User type for tracking
              );
              console.log('✅ [ProfileSwitch] StreamChat reconnected with company profile', { 
                user_id,
                hasName: !!companyData.name,
                hasLogo: !!companyData.logo_url
              });
            }
          } catch (streamError: any) {
            // Check if error is about membership - this means user lost access
            const errorMessage = streamError?.message || streamError?.toString() || '';
            const isMembershipError = errorMessage.includes('must be a member') || 
                                     errorMessage.includes('member of this company') ||
                                     errorMessage.includes('not a member');
            
            if (isMembershipError) {
              // User lost access - revert to user profile
              console.warn('⚠️ [ProfileSwitch] User lost access to company - reverting to user profile');
              // Revert profile switch
              setCurrentProfileType('user');
              setActiveCompany(null);
              AsyncStorage.setItem('currentProfileType', 'user').catch(() => {});
              AsyncStorage.removeItem('activeCompanyId').catch(() => {});
              // Don't log as error - this is expected if user lost access
            } else {
              // Other errors - don't throw, just log
              console.warn('⚠️ Failed to reconnect StreamChat (non-critical):', streamError?.message || streamError);
            }
            // StreamChatProvider will handle reconnection automatically
          }
        })(); // Execute immediately, don't wait
    } catch (error: any) {
      // CRITICAL: Never throw errors during profile switch - this can cause app restarts
      const errorMessage = error?.message || error?.toString() || '';
      const isMembershipError = errorMessage.includes('not found in your companies') ||
                               errorMessage.includes('no longer have access') ||
                               errorMessage.includes('not owner/admin') ||
                               errorMessage.includes('Could not verify');
      
      if (isMembershipError) {
        // User doesn't have access - don't switch, stay on current profile
        console.warn('⚠️ [ProfileSwitch] Cannot switch to company - membership issue:', errorMessage);
        // Don't update state - stay on current profile
        // Clear any partial state
        if (activeCompany?.id === companyId) {
          // If we were already on this company, switch back to user
          setCurrentProfileType('user');
          setActiveCompany(null);
          AsyncStorage.setItem('currentProfileType', 'user').catch(() => {});
          AsyncStorage.removeItem('activeCompanyId').catch(() => {});
        }
      } else {
        // Other errors - log but don't block
        console.error('❌ Error switching to company profile (recovered):', errorMessage);
      }
      // Don't throw - let the UI handle the error gracefully
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

  const quickCreateCompany = async (companyData: any) => {
    try {
      console.log('🏢 Quick creating company (bypasses profile completeness):', companyData);
      
      // Ensure required fields are present
      if (!companyData.name || !companyData.subcategory) {
        return {
          success: false,
          error: 'Company name and subcategory are required',
          data: null
        };
      }
      
      // Use quickCreateCompany to bypass profile completeness requirement
      const response = await api.quickCreateCompany(companyData);
      
      // Handle successful response
      if (response && response.success && response.data) {
        console.log('✅ Company quick created successfully:', response.data);
        
        // Clear the user companies cache so the new company appears immediately
        if (user?.id) {
          const cacheKey = `user-companies-${user.id}`;
          await rateLimiter.clearCache(cacheKey);
          console.log('🗑️ Cleared cache for user companies to show newly created company');
        }
        
        return response;
      }
      
      // Handle response with success: false
      if (response && response.success === false) {
        console.error('Company quick creation failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to quick create company',
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
      console.error('Failed to quick create company:', error);
      
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
            data: null
          };
        }
        
        return {
          success: false,
          error: error.message || `Server error (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Handle other error types
      const errorMessage = error?.message || String(error) || 'Failed to quick create company';
      
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

  const getCompany = async (companyId: string, params?: { include?: ('members' | 'services' | 'documents' | 'certifications' | 'courses')[]; membersLimit?: number; membersPage?: number; fields?: string[] }) => {
    const cacheKey = `company-${companyId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        // Pass arrays directly to the API client - it handles conversion to query parameters
        // The API client library (v2.24.2+) safely handles undefined/null include/fields with Array.isArray() checks
        const response = await api.getCompany(companyId, params);
        return response;
      } catch (error: any) {
        // Check if error is a timeout - these are expected and should be handled gracefully
        const errorMessage = error?.message || error?.toString() || '';
        const isTimeout = errorMessage.includes('timeout') ||
                         errorMessage.includes('Request timeout') ||
                         errorMessage.includes('ETIMEDOUT') ||
                         error?.name === 'AbortError';
        
        if (isTimeout) {
          // Timeout errors are expected - log as warning and return minimal company data
          console.warn('⚠️ Failed to get company (timeout):', errorMessage);
          // Return minimal company data instead of throwing
          // This allows the app to continue working even if company details fail to load
          return {
            success: true,
            data: { id: companyId } // Minimal data - just ID
          };
        }
        
        // Other errors - log as error and throw
        console.error('❌ Failed to get company:', error);
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

  const updateAcademyVisibility = async (companyId: string, visibility: 'private' | 'published') => {
    try {
      // Validate that visibility is a valid value
      if (visibility !== 'private' && visibility !== 'published') {
        throw new Error('Invalid visibility value. Must be "private" or "published"');
      }

      console.log(`🎓 Updating academy visibility: ${companyId} -> ${visibility}`);
      
      // First, get the company to validate it's an academy
      const companyResponse = await api.getCompany(companyId);
      if (!companyResponse.success || !companyResponse.data) {
        throw new Error('Company not found');
      }

      const company = companyResponse.data;
      if (company.subcategory !== 'academy') {
        throw new Error('Visibility settings can only be applied to academies');
      }

      // Use PUT method directly (backend expects PUT, not PATCH)
      // Get access token for authenticated request
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required to update academy visibility');
      }

      const response = await fetch(`${baseUrl}/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Failed to update academy visibility');
      }
      
      // Update active company if it's the current one
      if (activeCompany?.id === companyId) {
        setActiveCompany({ ...activeCompany, visibility });
      }
      
      // Invalidate all company-related caches - clear ALL variations
      // The cache key format is: company-${companyId}-${JSON.stringify(params)}
      // So we need to clear by pattern to catch all variations
      await rateLimiter.clearCacheByPattern(`company-${companyId}`);
      await rateLimiter.clearCacheByPattern(`companies-`);
      await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
      await rateLimiter.clearCacheByPattern(`published-news-`);
      
      console.log(`✅ Academy visibility updated successfully: ${visibility}`);
      console.log(`🧹 Cleared rate limiter cache for company: ${companyId}`);
      return responseData;
    } catch (error: any) {
      console.error('❌ Failed to update academy visibility:', error);
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

  // v2.16.0: Upload course poster image
  const uploadCoursePoster = async (courseId: string, file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading course poster:', file.name);
      
      const fileName = file.name || `course_poster_${Date.now()}.jpg`;
      const fileType = file.type || 'image/jpeg';
      const fileUri = file.uri;
      
      const formData = new FormData();
      formData.append('poster', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);
      formData.append('course_id', courseId);

      const accessToken = getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/upload/course-poster`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Course poster upload failed with status:', response.status);
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
      }

      console.log('✅ Course poster uploaded successfully:', result);
      
      // Invalidate course cache
      await rateLimiter.clearCacheByPattern(`academy-courses-`);
      await rateLimiter.clearCacheByPattern(`course-${courseId}`);
      // Also clear company cache since course data affects company display
      await rateLimiter.clearCacheByPattern(`companies-`);
      
      return {
        success: true,
        data: {
          url: result.data?.url || result.url,
          filename: result.data?.filename || result.filename || fileName,
        },
        message: result.message || 'Course poster uploaded successfully',
      };
    } catch (error: any) {
      console.error('❌ Failed to upload course poster:', error);
      throw error;
    }
  };

  // v2.16.0: Upload certificate image/template
  const uploadCertificateImage = async (file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading certificate image:', file.name);
      
      const fileName = file.name || `certificate_image_${Date.now()}.jpg`;
      const fileType = file.type || 'image/jpeg';
      const fileUri = file.uri;
      
      const formData = new FormData();
      formData.append('certificate_image', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);

      const accessToken = getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/upload/certificate-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Certificate image upload failed with status:', response.status);
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
      }

      console.log('✅ Certificate image uploaded successfully:', result);
      
      return {
        success: true,
        data: {
          url: result.data?.url || result.url,
          filename: result.data?.filename || result.filename || fileName,
        },
        message: result.message || 'Certificate image uploaded successfully',
      };
    } catch (error: any) {
      console.error('❌ Failed to upload certificate image:', error);
      throw error;
    }
  };

  const getUserCompanies = async (userId: string, forceRefresh = false) => {
    const cacheKey = `user-companies-${userId}`;
    
    // If force refresh is requested, clear cache first
    if (forceRefresh) {
      await rateLimiter.clearCache(cacheKey);
      console.log('🔄 Force refresh: Cleared cache for user companies');
    }
    
    // Use SHORT TTL for company data to ensure approval status changes are reflected quickly
    // This reduces the delay from 5 minutes to 30 seconds for critical approval status updates
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
        
        // Network errors are expected in mobile apps - log as warning
        const errorMessage = error?.message || error?.toString() || '';
        const isNetworkError = errorMessage.includes('Network error') ||
                              errorMessage.includes('Network request failed') ||
                              errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('fetch failed') ||
                              error?.name === 'TypeError' && errorMessage.includes('Network');
        
        if (isNetworkError) {
          console.warn('⚠️ Failed to get user companies (network issue):', errorMessage);
          // Return empty result for network errors instead of throwing
          return { success: true, data: [] };
        }
        
        console.error('Failed to get user companies:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT, persistent: true }); // Use SHORT TTL (30s) to ensure approval status updates appear quickly
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

  const getCompanies = async (params?: {
    limit?: number;
    page?: number;
    /** Alias for `q` (kept for backwards compatibility across the app) */
    search?: string;
    /** onecrew-api-client uses `q` for search queries */
    q?: string;
    category?: string;
    location?: string;
    subcategory?: string;
    fields?: string[];
    sort?: string;
    order?: 'asc' | 'desc';
  }) => {
    // Include user ID in cache key since results differ by user (for private academies)
    // Backend filters private academies based on user permissions
    // Also include a timestamp component to force refresh when visibility changes
    const userId = getAccessToken() ? 'authenticated' : 'guest';
    const cacheKey = `companies-${userId}-${JSON.stringify(params || {})}`;
    return performanceMonitor.trackApiCall(
      'Get Companies',
      `${baseUrl}/api/companies`,
      'GET',
      () => rateLimiter.execute(cacheKey, async () => {
        try {
          // Build query parameters for the API
          const queryParams: any = {};
          if (params?.limit) queryParams.limit = params.limit;
          if (params?.page) queryParams.page = params.page;
          // onecrew-api-client expects `q` for search; keep `search` as a friendly alias
          if (params?.q) queryParams.q = params.q;
          else if (params?.search) queryParams.q = params.search;
          if (params?.category) queryParams.category = params.category;
          if (params?.location) queryParams.location = params.location;
          if (params?.subcategory) queryParams.subcategory = params.subcategory;
          if (params?.fields) queryParams.fields = params.fields.join(',');
          if (params?.sort) queryParams.sort = params.sort;
          if (params?.order) queryParams.order = params.order;
          
          const response = await api.getCompanies(Object.keys(queryParams).length > 0 ? queryParams : undefined);
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
      }, { ttl: CacheTTL.LONG, persistent: true }) // Company listings change rarely - 30min TTL with persistence
    );
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
      const maxRetries = 2;
      let lastError: any = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Add timeout handling - use direct fetch with timeout
          const token = getAccessToken();
          const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
          const url = `${baseUrl}/api/companies/${companyId}/services`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          try {
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
              throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
              return data;
            }
            throw new Error(data.error || 'Failed to get company services');
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
              throw new Error('Request timeout');
            }
            throw fetchError;
          }
        } catch (error: any) {
          lastError = error;
          const isTimeout = error?.message?.includes('timeout') || 
                           error?.message?.includes('Request timeout') || 
                           error?.message?.includes('ETIMEDOUT') ||
                           error?.name === 'AbortError';
          
          // If it's a timeout and we have retries left, retry
          if (isTimeout && attempt < maxRetries) {
            const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s
            console.warn(`⚠️ Request timeout for company services (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // If not a timeout, or no retries left, handle the error
          console.error('❌ Failed to get company services:', error);
          // Handle 401 errors
          await handle401Error(error);
          
          // For timeout errors after all retries, return empty result instead of throwing
          if (isTimeout) {
            console.warn('⚠️ Company services request timed out after retries, returning empty result');
            return { success: true, data: [] }; // Return empty array instead of throwing
          }
          
          throw error;
        }
      }
      
      // If we exhausted all retries, return empty result
      console.warn('⚠️ Company services request failed after all retries, returning empty result');
      return { success: true, data: [] };
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
        // Clear pending members cache since a new invitation was sent
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
        console.log('🔄 Cleared company members and pending members cache after adding member');
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

  const getPendingCompanyMembers = async (companyId: string, params?: {
    page?: number;
    limit?: number;
    sort?: 'joined_at' | 'created_at' | 'role' | 'accepted_at';
    order?: 'asc' | 'desc';
  }) => {
    const cacheKey = `company-pending-members-${companyId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        // Check if method exists (in case package wasn't updated or cached)
        if (typeof api.getPendingCompanyMembers !== 'function') {
          console.warn('⚠️ getPendingCompanyMembers method not available. Package may need to be updated or app restarted.');
          // Return empty list gracefully
          return {
            success: true,
            data: {
              data: [],
              pagination: {
                page: params?.page || 1,
                limit: params?.limit || 50,
                total: 0,
                totalPages: 0,
              },
            },
          };
        }
        
        // Cast params to match API client's expected type (API client may have outdated types)
        // The actual API accepts: joined_at, created_at, role, accepted_at
        const apiParams = params ? {
          ...params,
          sort: params.sort as any, // Cast to any to handle type mismatch with API client
        } : undefined;
        
        const response = await api.getPendingCompanyMembers(companyId, apiParams);
        return response;
      } catch (error: any) {
        // Handle 403 (unauthorized) gracefully - don't log as error
        if (error.status === 403 || error.statusCode === 403 || 
            error?.message?.includes('403') || error?.message?.includes('owner or admin')) {
          // Silently handle 403 - this is expected when user is not owner/admin
          return {
            success: true,
            data: {
              data: [],
              pagination: {
                page: params?.page || 1,
                limit: params?.limit || 50,
                total: 0,
                totalPages: 0,
              },
            },
          };
        }
        
        // Only log non-403 errors
        console.error('Failed to get pending company members:', error);
        
        // Handle 404 (endpoint not found) gracefully
        if (error.status === 404 || error.statusCode === 404) {
          console.warn('⚠️ Pending company members endpoint not found (404). Returning empty list.');
          return {
            success: true,
            data: {
              data: [],
              pagination: {
                page: params?.page || 1,
                limit: params?.limit || 50,
                total: 0,
                totalPages: 0,
              },
            },
          };
        }
        
        // For other errors, throw to let caller handle
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Pending members change more frequently - 2min TTL
  };

  const acceptInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.acceptInvitation(companyId, userId);
      if (response.success) {
        // Invalidate company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
        // Clear pending members cache since invitation was accepted
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
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
      if (response.success) {
        // Clear pending members cache since invitation was cancelled
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
        // Also clear company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
      }
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
        // Clear pending members cache in case a pending member was removed
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
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
        await switchToUserProfile();
      }
      return response;
    } catch (error) {
      console.error('Failed to leave company:', error);
      throw error;
    }
  };

  // Company Documents Methods
  const getCompanyDocuments = async (companyId: string) => {
    const maxRetries = 2;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout handling - use direct fetch with timeout
        const token = getAccessToken();
        const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
        const url = `${baseUrl}/api/companies/${companyId}/documents`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            return data;
          }
          throw new Error(data.error || 'Failed to get company documents');
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            throw new Error('Request timeout');
          }
          throw fetchError;
        }
      } catch (error: any) {
        lastError = error;
        const isTimeout = error?.message?.includes('timeout') || 
                         error?.message?.includes('Request timeout') || 
                         error?.message?.includes('ETIMEDOUT') ||
                         error?.name === 'AbortError';
        
        // If it's a timeout and we have retries left, retry
        if (isTimeout && attempt < maxRetries) {
          const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s
          console.warn(`⚠️ Request timeout for company documents (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If not a timeout, or no retries left, handle the error
        console.error('❌ Failed to get company documents:', error);
        
        // For timeout errors after all retries, return empty result instead of throwing
        if (isTimeout) {
          console.warn('⚠️ Company documents request timed out after retries, returning empty result');
          return { success: true, data: [] }; // Return empty array instead of throwing
        }
        
        throw error;
      }
    }
    
    // If we exhausted all retries, return empty result
    console.warn('⚠️ Company documents request failed after all retries, returning empty result');
    return { success: true, data: [] };
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
    // Validate companyId before making the request - return empty array if invalid instead of throwing
    if (!companyId || (typeof companyId === 'string' && companyId.trim() === '')) {
      console.warn('⚠️ getAcademyCourses called with invalid companyId, returning empty array');
      return [];
    }

    const cacheKey = `academy-courses-${companyId}-${JSON.stringify(filters || {})}`;
    return performanceMonitor.trackApiCall(
      'Get Academy Courses',
      `${baseUrl}/api/companies/${companyId}/courses`,
      'GET',
      () => rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getAcademyCourses(companyId, filters);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        // Check if it's a "Company not found" error
        if (response.error?.includes('Company not found') || response.error?.includes('404')) {
          console.warn(`⚠️ Company not found or not accessible: ${companyId}`);
          throw new Error(response.error || 'Company not found');
        }
        throw new Error(response.error || 'Failed to get academy courses');
      } catch (error: any) {
        // Log the error with more context
        if (error?.message?.includes('Company not found') || error?.message?.includes('404')) {
          console.warn(`⚠️ Company not found when fetching courses: ${companyId}`, error);
        } else {
          console.error('Failed to get academy courses:', error);
        }
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }) // Course lists change when courses are added/updated - 30s TTL
    );
  };

  const createCourse = async (companyId: string, courseData: CreateCourseRequest) => {
    // Validate companyId before making the request
    if (!companyId || (typeof companyId === 'string' && companyId.trim() === '')) {
      console.warn('⚠️ createCourse called with invalid companyId');
      return {
        success: false,
        error: 'Company ID is required',
      };
    }

    // Debug: Log authentication status
    console.log('🔍 [createCourse] Debug info:', {
      companyId,
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email,
      activeCompanyId: activeCompany?.id,
    });

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
      
      // Check for permission errors (403)
      if (response.error?.includes('Only company owner or admin') || 
          response.error?.includes('403') ||
          response.error?.includes('permission') ||
          response.error?.includes('not authorized')) {
        console.warn(`⚠️ Permission denied when creating course for company: ${companyId}`);
        return {
          success: false,
          error: 'You do not have permission to create courses. Only company owners and admins can create courses.',
        };
      }
      
      throw new Error(response.error || 'Failed to create course');
    } catch (error: any) {
      // Handle permission errors from API client
      if (error?.message?.includes('Only company owner or admin') || 
          error?.message?.includes('403') ||
          error?.message?.includes('permission') ||
          error?.message?.includes('not authorized')) {
        console.warn(`⚠️ Permission denied when creating course for company: ${companyId}`, error);
        return {
          success: false,
          error: 'You do not have permission to create courses. Only company owners and admins can create courses.',
        };
      }
      
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
        // Also clear company cache since course data affects company display
        await rateLimiter.clearCacheByPattern(`company-${companyId}`);
        await rateLimiter.clearCacheByPattern(`companies-`);
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

  const registerUserForCourse = async (courseId: string, userId: string) => {
    try {
      const response = await api.registerUserForCourse(courseId, userId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to register user for course');
    } catch (error: any) {
      console.error('Failed to register user for course:', error);
      return {
        success: false,
        error: error.message || 'Failed to register user for course',
      };
    }
  };

  const unregisterUserFromCourse = async (courseId: string, userId: string) => {
    try {
      const response = await api.unregisterUserFromCourse(courseId, userId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
        };
      }
      throw new Error(response.error || 'Failed to unregister user from course');
    } catch (error: any) {
      console.error('Failed to unregister user from course:', error);
      return {
        success: false,
        error: error.message || 'Failed to unregister user from course',
      };
    }
  };

  // Legacy alias for UI components that still use the old naming
  const unregisterUserForCourse = async (courseId: string, userId: string) => {
    return unregisterUserFromCourse(courseId, userId);
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

  // v2.8.0: Course completion methods
  const completeCourseRegistration = async (courseId: string, userId: string) => {
    try {
      const response = await api.completeCourseRegistration(courseId, userId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to complete course registration');
    } catch (error: any) {
      console.error('Failed to complete course registration:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete course registration',
      };
    }
  };

  const completeCourse = async (courseId: string, autoGrantCertifications?: boolean) => {
    try {
      const response = await api.completeCourse(courseId, autoGrantCertifications);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to complete course');
    } catch (error: any) {
      console.error('Failed to complete course:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete course',
      };
    }
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

  // News Admin methods (admin only)
  const getAdminNewsPosts = async (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest'; status?: 'draft' | 'published' }) => {
    const cacheKey = `admin-news-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('📰 [Admin] Fetching news posts...', filters);
        const response = await api.getAdminNewsPosts(filters);
        console.log('✅ [Admin] News posts fetched successfully');
        return response;
      } catch (error: any) {
        console.error('❌ [Admin] Failed to fetch news posts:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT, persistent: false });
  };

  const getAdminNewsPostById = async (id: string) => {
    const cacheKey = `admin-news-${id}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('📰 [Admin] Fetching news post by ID:', id);
        const response = await api.getAdminNewsPostById(id);
        console.log('✅ [Admin] News post fetched successfully');
        return response;
      } catch (error: any) {
        console.error('❌ [Admin] Failed to fetch news post:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT, persistent: false });
  };

  const createNewsPost = async (data: any) => {
    try {
      console.log('📰 [Admin] Creating news post...');
      const response = await api.createNewsPost(data);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern('admin-news');
        console.log('✅ [Admin] News post created successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to create news post');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to create news post:', error);
      throw error;
    }
  };

  const updateNewsPost = async (id: string, data: any) => {
    try {
      console.log('📰 [Admin] Updating news post:', id);
      const response = await api.updateNewsPost(id, data);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('✅ [Admin] News post updated successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to update news post');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to update news post:', error);
      throw error;
    }
  };

  const deleteNewsPost = async (id: string) => {
    try {
      console.log('📰 [Admin] Deleting news post:', id);
      const response = await api.deleteNewsPost(id);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('✅ [Admin] News post deleted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to delete news post');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to delete news post:', error);
      throw error;
    }
  };

  const publishNewsPost = async (id: string) => {
    try {
      console.log('📰 [Admin] Publishing news post:', id);
      const response = await api.publishNewsPost(id);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('✅ [Admin] News post published successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to publish news post');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to publish news post:', error);
      throw error;
    }
  };

  const unpublishNewsPost = async (id: string) => {
    try {
      console.log('📰 [Admin] Unpublishing news post:', id);
      const response = await api.unpublishNewsPost(id);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('✅ [Admin] News post unpublished successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unpublish news post');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to unpublish news post:', error);
      throw error;
    }
  };

  const uploadNewsPhoto = async (file: any, filename?: string) => {
    try {
      console.log('📰 [Admin] Uploading news photo...');
      const response = await api.uploadNewsPhoto(file, filename);
      if (response.success) {
        console.log('✅ [Admin] News photo uploaded successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to upload news photo');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to upload news photo:', error);
      throw error;
    }
  };

  const uploadNewsThumbnail = async (file: any, filename?: string) => {
    try {
      console.log('📰 [Admin] Uploading news thumbnail...');
      const response = await api.uploadNewsThumbnail(file, filename);
      if (response.success) {
        console.log('✅ [Admin] News thumbnail uploaded successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to upload news thumbnail');
    } catch (error: any) {
      console.error('❌ [Admin] Failed to upload news thumbnail:', error);
      throw error;
    }
  };

  // News like methods
  const likeNewsPost = async (postId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required to like posts');
      }

      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const response = await fetch(`${baseUrl}/api/news/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Invalidate news caches to ensure fresh data
        await rateLimiter.clearCacheByPattern('published-news-');
        await rateLimiter.clearCacheByPattern(`news-post-${postId}`);
        console.log('✅ News post liked successfully');
        return data;
      }

      throw new Error(data.error || data.message || 'Failed to like news post');
    } catch (error: any) {
      console.error('❌ Failed to like news post:', error);
      throw error;
    }
  };

  const unlikeNewsPost = async (postId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required to unlike posts');
      }

      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const response = await fetch(`${baseUrl}/api/news/${postId}/like`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Invalidate news caches to ensure fresh data
        await rateLimiter.clearCacheByPattern('published-news-');
        await rateLimiter.clearCacheByPattern(`news-post-${postId}`);
        console.log('✅ News post unliked successfully');
        return data;
      }

      throw new Error(data.error || data.message || 'Failed to unlike news post');
    } catch (error: any) {
      console.error('❌ Failed to unlike news post:', error);
      throw error;
    }
  };

  // Chat/Messaging methods (v2.5.0)
  // Real-time data - caching disabled for immediate updates
  const getConversations = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    /**
     * onecrew-api-client v2.24.4+: server-side profile scoping for conversation lists
     */
    profile_type?: 'user' | 'company';
    company_id?: string;
  }) => {
    // Include profile context in cache key to separate conversations by profile
    const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
    const cacheKey = `conversations-${currentUserType}-${currentUserId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        if (!api.chat) {
          throw new Error('Chat service is not available. Please ensure the API client is initialized.');
        }
        // Prefer server-side scoping to avoid mixing personal + company conversations.
        const scopedParams = {
          ...params,
          profile_type: params?.profile_type ?? (currentProfileType === 'company' ? 'company' : 'user'),
          ...(currentProfileType === 'company' && activeCompany?.id
            ? { company_id: params?.company_id ?? activeCompany.id }
            : {}),
        };
        console.log('💬 Fetching conversations...', scopedParams);
        const response = await api.chat.getConversations(scopedParams);
        if (response.success && response.data) {
          // Calculate unread count
          const rawConversations = response.data.data || response.data;
          if (Array.isArray(rawConversations)) {
            const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
            const currentUserType = currentProfileType === 'company' ? 'company' : 'user';

            let unreadCount = 0;
            let skippedNotParticipant = 0;
            rawConversations.forEach((conv: any) => {
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
                } else if (conv.last_message_at && participant && !participant.last_read_at) {
                  // If there's a last message but no read timestamp, consider it unread
                  // Only if participant exists (current profile is a participant)
                  unreadCount++;
                } else if (conv.last_message_at && !participant) {
                  // If there's a last message but current profile is not a participant, skip it
                  // This ensures we only count unread for conversations belonging to current profile
                  skippedNotParticipant++;
                }
              }
            });
            
            // Update from backend - this serves as initial value and fallback
            // StreamChat real-time updates will override this when available
            setUnreadConversationCount(unreadCount);
            if (__DEV__) {
              console.log('💬 Unread conversations count (from backend):', unreadCount, {
                streamChatConnected: streamChatService.isConnected(),
              });
            }
            
            if (__DEV__ && skippedNotParticipant > 0) {
              console.log('⚠️ Skipped unread-count for conversations not belonging to current profile:', {
                skipped: skippedNotParticipant,
                currentProfileType: currentUserType,
                currentProfileId: currentUserId,
              });
            }
          }
        }
        console.log('✅ Conversations fetched successfully');
        return response;
      } catch (error: any) {
        // Network errors are expected in mobile apps - log as warning
        const errorMessage = error?.message || error?.toString() || '';
        const isNetworkError = errorMessage.includes('Network error') ||
                              errorMessage.includes('Network request failed') ||
                              errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('fetch failed') ||
                              error?.name === 'TypeError' && errorMessage.includes('Network');
        
        if (isNetworkError) {
          console.warn('⚠️ Failed to fetch conversations (network issue):', errorMessage);
          // Return empty result for network errors instead of throwing
          return { success: true, data: [] };
        }
        
        console.error('❌ Failed to fetch conversations:', error);
        // Handle 401 errors
        await handle401Error(error);
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
      // Log profile context for verification
      const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
      console.log('💬 Creating conversation...', {
        ...request,
        currentProfileType: currentUserType,
        currentProfileId: currentUserId,
      });
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
      // CRITICAL: Pass company_id if on company profile so backend uses correct initiator
      const requestData = {
        conversation_type: request.conversation_type,
        participant_ids: Array.isArray(request.participant_ids) ? request.participant_ids : [request.participant_ids],
        ...(request.name && { name: request.name }),
        // Pass company_id explicitly when on company profile
        // This ensures backend uses company ID (not user ID) as initiator
        ...(currentProfileType === 'company' && activeCompany?.id && {
          company_id: activeCompany.id
        }),
      };
      console.log('💬 Request data:', requestData);
      console.log('💬 Profile context:', {
        currentProfileType,
        activeCompanyId: activeCompany?.id,
        passingCompanyId: currentProfileType === 'company' && activeCompany?.id,
      });
      
      // CRITICAL: Use direct fetch with longer timeout for createConversation
      // Backend needs time to sync users to StreamChat (can take 2-4 seconds)
      const token = getAccessToken();
      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const url = `${baseUrl}/api/chat/conversations`;
      
      console.log('💬 Making direct fetch call with extended timeout...');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Conversation created successfully');
          return data;
        }
        
        throw new Error(data.error || 'Failed to create conversation');
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          throw new Error('Request timeout - The server is taking longer than expected. Please try again.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ Failed to create conversation:', error);
      throw error;
    }
  };

  // Real-time data - caching disabled for immediate updates
  const getMessages = async (
    conversationId: string,
    params?: {
      page?: number;
      limit?: number;
      before?: string;
      include?: 'none' | Array<'sender_user' | 'sender_company' | 'sent_by_user' | 'reads'>;
      sender_type?: 'user' | 'company' | Array<'user' | 'company'>;
      sender_user_fields?: string[];
      sender_company_fields?: string[];
    }
  ) => {
    // Include profile context in cache key to separate messages by profile
    const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
    const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
    const cacheKey = `messages-${conversationId}-${currentUserType}-${currentUserId}-${JSON.stringify(params || {})}`;
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

  const editMessage = async (messageId: string, data: { content: string; conversation_id?: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Editing message:', messageId);
      const response = await api.chat.editMessage(messageId, data);
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

  const deleteMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Deleting message:', messageId, 'from conversation:', conversationId);
      const response = await api.chat.deleteMessage(messageId, conversationId);
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

  const readMessage = async (conversationId: string, messageId?: string, messageIds?: string[]) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      // Log profile context for verification
      const currentUserId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      const currentUserType = currentProfileType === 'company' ? 'company' : 'user';
      console.log('💬 Marking message as read:', { 
        conversationId, 
        messageId, 
        messageIds,
        profileType: currentUserType,
        profileId: currentUserId,
      });
      
      let response;
      
      if (messageId) {
        // Mark a single message as read using library method
        // markMessageAsRead(messageId: string, conversationId: string)
        response = await api.chat.markMessageAsRead(messageId, conversationId);
      } else {
        // Mark all messages in a conversation as read using library method
      // After marking as read, update unread count
        // markAllAsRead(conversationId: string, messageIds?: string[])
        response = await api.chat.markAllAsRead(conversationId, messageIds);
      }
      
      if (response.success) {
        console.log('✅ Message(s) marked as read successfully');
        return response;
      }
      
      throw new Error(response.error || 'Failed to mark message as read');
    } catch (error: any) {
      console.error('❌ Failed to mark message as read:', error);
      throw error;
    }
  };

  const markMessageAsRead = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Marking message as read:', messageId);
      const response = await api.chat.markMessageAsRead(messageId, conversationId);
      if (response.success) {
        console.log('✅ Message marked as read successfully');
        // Update unread count after marking as read
        if (streamChatService.isConnected()) {
          const newCount = await calculateStreamChatUnreadCount();
          setUnreadConversationCount(newCount);
        }
        return response;
      }
      throw new Error(response.error || 'Failed to mark message as read');
    } catch (error: any) {
      console.error('❌ Failed to mark message as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async (conversationId: string, messageIds?: string[]) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Marking all messages as read in conversation:', conversationId);
      const response = await api.chat.markAllAsRead(conversationId, messageIds);
      if (response.success) {
        console.log('✅ All messages marked as read successfully');
        // Update unread count after marking all as read
        if (streamChatService.isConnected()) {
          const newCount = await calculateStreamChatUnreadCount();
          setUnreadConversationCount(newCount);
        }
        return response;
      }
      throw new Error(response.error || 'Failed to mark all messages as read');
    } catch (error: any) {
      console.error('❌ Failed to mark all messages as read:', error);
      throw error;
    }
  };

  const leaveConversation = async (conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Leaving conversation:', conversationId);
      const response = await api.chat.leaveConversation(conversationId);
      if (response.success) {
        console.log('✅ Left conversation successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to leave conversation');
    } catch (error: any) {
      console.error('❌ Failed to leave conversation:', error);
      throw error;
    }
  };

  const muteConversation = async (conversationId: string, mutedUntil?: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Muting conversation:', conversationId, mutedUntil ? `until ${mutedUntil}` : 'indefinitely');
      const response = await api.chat.muteConversation(conversationId, mutedUntil);
      if (response.success) {
        console.log('✅ Conversation muted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to mute conversation');
    } catch (error: any) {
      console.error('❌ Failed to mute conversation:', error);
      throw error;
    }
  };

  const sendTypingIndicator = async (conversationId: string, isTyping: boolean) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      const response = await api.chat.sendTypingIndicator(conversationId, isTyping);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to send typing indicator');
    } catch (error: any) {
      console.error('❌ Failed to send typing indicator:', error);
      throw error;
    }
  };

  // StreamChat token
  // CRITICAL: Memoize this function to prevent infinite loops in StreamChatProvider
  // Without useCallback, this function is recreated on every render, causing StreamChatProvider's
  // useEffect to run repeatedly, which can cause flickering, restarts, and server overload
  const getStreamChatToken = useCallback(async (options?: { profile_type?: 'user' | 'company'; company_id?: string }) => {
    try {
      // Build query parameters if profile type is specified
      let queryParams = '';
      if (options?.profile_type === 'company' && options?.company_id) {
        queryParams = `?profile_type=company&company_id=${encodeURIComponent(options.company_id)}`;
      } else if (options?.profile_type === 'user') {
        queryParams = '?profile_type=user';
      }
      
      console.log('💬 Getting StreamChat token...', { 
        profile_type: options?.profile_type || 'user',
        company_id: options?.company_id,
        queryParams 
      });
      
      // Make direct HTTP call to support query parameters
      // The API client might not support query params, so we'll call the endpoint directly
      // Inline getAccessToken call to avoid dependency on unstable function reference
      let accessToken = '';
      try {
        if ((api as any).auth && typeof (api as any).auth.getAuthToken === 'function') {
          accessToken = (api as any).auth.getAuthToken();
        } else if ((api as any).getAuthToken && typeof (api as any).getAuthToken === 'function') {
          accessToken = (api as any).getAuthToken();
        }
      } catch (tokenError) {
        console.warn('⚠️ Failed to get access token:', tokenError);
      }
      
      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const url = `${baseUrl}/api/chat/token${queryParams}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get StreamChat token' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ StreamChat token retrieved successfully', {
          user_id: data.data?.user_id,
          profile_type: options?.profile_type || 'user',
        });
        return data;
      }
      throw new Error(data.error || 'Failed to get StreamChat token');
    } catch (error: any) {
      // Check error type to determine appropriate logging level
      const errorMessage = error?.message || error?.toString() || '';
      const errorName = error?.name || '';
      
      // Network errors are expected in mobile apps - log as warning
      const isNetworkError = errorMessage.includes('Network request failed') ||
                            errorMessage.includes('Network error') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('fetch failed') ||
                            errorName === 'TypeError' && errorMessage.includes('Network') ||
                            errorName === 'NetworkError';
      
      // Membership errors are expected if user lost access - log as warning
      const isMembershipError = errorMessage.includes('must be a member') || 
                               errorMessage.includes('member of this company') ||
                               errorMessage.includes('not a member');
      
      // Token expiration errors are expected (token refresh will handle it) - log as warning
      const isTokenError = errorMessage.includes('Invalid or expired token') ||
                          errorMessage.includes('expired token') ||
                          errorMessage.includes('token expired') ||
                          errorMessage.includes('invalid token');
      
      if (isNetworkError) {
        // Network issues are expected in mobile apps - log as warning (not error)
        console.warn('⚠️ Failed to get StreamChat token (network issue):', errorMessage);
      } else if (isTokenError) {
        // Token expiration is expected - token refresh will handle it
        console.warn('⚠️ Failed to get StreamChat token (token expired, will retry):', errorMessage);
      } else if (isMembershipError) {
        // User lost access - this is expected, log as warning
        console.warn('⚠️ Failed to get StreamChat token (membership issue):', errorMessage);
      } else {
        // Other errors (auth, server errors) - log as error
        console.error('❌ Failed to get StreamChat token:', error);
      }
      throw error;
    }
  }, [api]); // Only depend on api, which is a stable reference (OneCrewApi instance)

  // Message reactions
  const addReaction = async (messageId: string, data: { reaction_type: string; conversation_id: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Adding reaction to message:', messageId);
      const response = await api.chat.addReaction(messageId, data);
      if (response.success) {
        console.log('✅ Reaction added successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to add reaction');
    } catch (error: any) {
      console.error('❌ Failed to add reaction:', error);
      throw error;
    }
  };

  const removeReaction = async (messageId: string, reactionType: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Removing reaction from message:', messageId);
      const response = await api.chat.removeReaction(messageId, reactionType, conversationId);
      if (response.success) {
        console.log('✅ Reaction removed successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to remove reaction');
    } catch (error: any) {
      console.error('❌ Failed to remove reaction:', error);
      throw error;
    }
  };

  const getReactions = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Getting reactions for message:', messageId);
      const response = await api.chat.getReactions(messageId, conversationId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get reactions');
    } catch (error: any) {
      console.error('❌ Failed to get reactions:', error);
      throw error;
    }
  };

  // Message threading
  const createThreadReply = async (parentMessageId: string, conversationId: string, data: { content?: string; message_type?: 'text' | 'image' | 'file' | 'system'; file_url?: string; file_name?: string; file_size?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Creating thread reply to message:', parentMessageId);
      const response = await api.chat.createThreadReply(parentMessageId, conversationId, data);
      if (response.success) {
        console.log('✅ Thread reply created successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to create thread reply');
    } catch (error: any) {
      console.error('❌ Failed to create thread reply:', error);
      throw error;
    }
  };

  const getThreadReplies = async (parentMessageId: string, conversationId: string, params?: { limit?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Getting thread replies for message:', parentMessageId);
      const response = await api.chat.getThreadReplies(parentMessageId, conversationId, params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get thread replies');
    } catch (error: any) {
      console.error('❌ Failed to get thread replies:', error);
      throw error;
    }
  };

  // Message pinning
  const pinMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Pinning message:', messageId);
      const response = await api.chat.pinMessage(messageId, conversationId);
      if (response.success) {
        console.log('✅ Message pinned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to pin message');
    } catch (error: any) {
      console.error('❌ Failed to pin message:', error);
      throw error;
    }
  };

  const unpinMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Unpinning message:', messageId);
      const response = await api.chat.unpinMessage(messageId, conversationId);
      if (response.success) {
        console.log('✅ Message unpinned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unpin message');
    } catch (error: any) {
      console.error('❌ Failed to unpin message:', error);
      throw error;
    }
  };

  const getPinnedMessages = async (conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Getting pinned messages for conversation:', conversationId);
      const response = await api.chat.getPinnedMessages(conversationId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get pinned messages');
    } catch (error: any) {
      console.error('❌ Failed to get pinned messages:', error);
      throw error;
    }
  };

  // Message search
  const searchMessages = async (params: { query: string; conversation_id?: string; sender_id?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Searching messages:', params);
      const response = await api.chat.searchMessages(params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to search messages');
    } catch (error: any) {
      console.error('❌ Failed to search messages:', error);
      throw error;
    }
  };

  const searchInConversation = async (conversationId: string, params: { query: string; sender_id?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Searching messages in conversation:', conversationId);
      const response = await api.chat.searchInConversation(conversationId, params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to search in conversation');
    } catch (error: any) {
      console.error('❌ Failed to search in conversation:', error);
      throw error;
    }
  };

  // Channel management
  const updateChannel = async (conversationId: string, data: { name?: string; image?: string; description?: string }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Updating channel:', conversationId);
      const response = await api.chat.updateChannel(conversationId, data);
      if (response.success) {
        console.log('✅ Channel updated successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to update channel');
    } catch (error: any) {
      console.error('❌ Failed to update channel:', error);
      throw error;
    }
  };

  const addMember = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Adding member to channel:', conversationId);
      const response = await api.chat.addMember(conversationId, userId);
      if (response.success) {
        console.log('✅ Member added successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to add member');
    } catch (error: any) {
      console.error('❌ Failed to add member:', error);
      throw error;
    }
  };

  const removeMember = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Removing member from channel:', conversationId);
      const response = await api.chat.removeMember(conversationId, userId);
      if (response.success) {
        console.log('✅ Member removed successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to remove member');
    } catch (error: any) {
      console.error('❌ Failed to remove member:', error);
      throw error;
    }
  };

  const getMembers = async (conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Getting channel members:', conversationId);
      const response = await api.chat.getMembers(conversationId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get members');
    } catch (error: any) {
      console.error('❌ Failed to get members:', error);
      throw error;
    }
  };

  // Channel moderation
  const addModerator = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Adding moderator to channel:', conversationId);
      const response = await api.chat.addModerator(conversationId, userId);
      if (response.success) {
        console.log('✅ Moderator added successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to add moderator');
    } catch (error: any) {
      console.error('❌ Failed to add moderator:', error);
      throw error;
    }
  };

  const removeModerator = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Removing moderator from channel:', conversationId);
      const response = await api.chat.removeModerator(conversationId, userId);
      if (response.success) {
        console.log('✅ Moderator removed successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to remove moderator');
    } catch (error: any) {
      console.error('❌ Failed to remove moderator:', error);
      throw error;
    }
  };

  const banUser = async (conversationId: string, data: { user_id: string; reason?: string; timeout?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Banning user from channel:', conversationId);
      const response = await api.chat.banUser(conversationId, data);
      if (response.success) {
        console.log('✅ User banned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to ban user');
    } catch (error: any) {
      console.error('❌ Failed to ban user:', error);
      throw error;
    }
  };

  const unbanUser = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Unbanning user from channel:', conversationId);
      const response = await api.chat.unbanUser(conversationId, userId);
      if (response.success) {
        console.log('✅ User unbanned successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unban user');
    } catch (error: any) {
      console.error('❌ Failed to unban user:', error);
      throw error;
    }
  };

  const muteUser = async (conversationId: string, data: { user_id: string; timeout?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Muting user in channel:', conversationId);
      const response = await api.chat.muteUser(conversationId, data);
      if (response.success) {
        console.log('✅ User muted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to mute user');
    } catch (error: any) {
      console.error('❌ Failed to mute user:', error);
      throw error;
    }
  };

  const unmuteUser = async (conversationId: string, userId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Unmuting user in channel:', conversationId);
      const response = await api.chat.unmuteUser(conversationId, userId);
      if (response.success) {
        console.log('✅ User unmuted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unmute user');
    } catch (error: any) {
      console.error('❌ Failed to unmute user:', error);
      throw error;
    }
  };

  const flagMessage = async (messageId: string, conversationId: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Flagging message:', messageId);
      const response = await api.chat.flagMessage(messageId, conversationId);
      if (response.success) {
        console.log('✅ Message flagged successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to flag message');
    } catch (error: any) {
      console.error('❌ Failed to flag message:', error);
      throw error;
    }
  };

  const getFlaggedMessages = async (params?: { limit?: number; offset?: number }) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Getting flagged messages');
      const response = await api.chat.getFlaggedMessages(params);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to get flagged messages');
    } catch (error: any) {
      console.error('❌ Failed to get flagged messages:', error);
      throw error;
    }
  };

  // Message translation
  const translateMessage = async (messageId: string, conversationId: string, targetLanguage: string) => {
    try {
      if (!api.chat) {
        throw new Error('Chat service is not available. Please ensure the API client is initialized.');
      }
      console.log('💬 Translating message:', messageId, 'to', targetLanguage);
      const response = await api.chat.translateMessage(messageId, conversationId, targetLanguage);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to translate message');
    } catch (error: any) {
      console.error('❌ Failed to translate message:', error);
      throw error;
    }
  };

  // Push notification token registration (Firebase FCM)
  // Uses onecrew-api-client's pushNotifications.registerDeviceToken() method
  const registerPushToken = async (token: string) => {
    try {
      console.log('📱 [Backend] Registering FCM token with backend using API client...');
      console.log('📱 [Backend] Token (first 20 chars):', token.substring(0, 20) + '...');
      
      // Get platform
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      
      // Get device ID - use Device.modelName if available, otherwise generate one
      let deviceId = Device.modelName || undefined;
      if (!deviceId) {
        // Fallback: use stored device ID or generate one
        deviceId = await AsyncStorage.getItem('@onecrew:device_id') || undefined;
        if (!deviceId) {
          // Generate a simple device identifier as last resort
          deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          await AsyncStorage.setItem('@onecrew:device_id', deviceId);
          console.log('📱 [Backend] Generated new device ID:', deviceId);
        } else {
          console.log('📱 [Backend] Using stored device ID:', deviceId);
        }
      } else {
        console.log('📱 [Backend] Using device model name:', deviceId);
      }
      
      // Get app version
      const appVersion = Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || '1.0.0';

      
      // Register FCM token using onecrew-api-client
      await api.pushNotifications.registerDeviceToken(
        token,
        platform,
        deviceId,
        appVersion
      );
      
      console.log('✅ [Backend] Push token registered successfully via API client');
    } catch (error: any) {
      // Don't throw - push token registration is not critical for app functionality
      if (error?.stack) {
        console.error('❌ [Backend] Stack trace:', error.stack.substring(0, 300));
      }
    }
  };

  // Helper function to check if a notification is a message notification
  const isMessageNotification = (notification: Notification): boolean => {
    if (notification.type === 'message_received') {
      return true;
    }
    // Also check title pattern as fallback
    const titleLower = notification.title?.toLowerCase() || '';
    if (titleLower.includes('new message from') || titleLower.includes('message from')) {
      return true;
    }
    return false;
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
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      // Handle 401 errors
      await handle401Error(error);
      throw error;
    }
  };

  const getUnreadNotificationCount = async (): Promise<number> => {
    try {
      // Use backend lightweight count endpoint (avoids fetching full notifications list on app startup)
      const response = await api.getUnreadNotificationCount();
      if (response.success && response.data) {
        const rawCount = (response.data as any).count ?? 0;
        // We historically excluded message notifications from this badge; without a server-side filter,
        // we can only subtract message notifications that are currently loaded in memory.
        const loadedUnreadMessageNotifs = notifications.filter(n => !n.is_read && isMessageNotification(n)).length;
        const adjusted = Math.max(0, rawCount - loadedUnreadMessageNotifs);
        setUnreadNotificationCount(adjusted);
        return adjusted;
      }
      throw new Error(response.error || 'Failed to get unread notification count');
    } catch (error: any) {
      // Network errors are expected in mobile apps - log as warning
      const errorMessage = error?.message || error?.toString() || '';
      const isNetworkError = errorMessage.includes('Network error') ||
                            errorMessage.includes('Network request failed') ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('fetch failed') ||
                            error?.name === 'TypeError' && errorMessage.includes('Network');
      
      if (isNetworkError) {
        console.warn('⚠️ Failed to get unread notification count (network issue):', errorMessage);
        // Return 0 for network errors instead of throwing
        return 0;
      }
      
      console.error('Failed to get unread notification count:', error);
      // Handle 401 errors
      await handle401Error(error);
      return 0;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success && response.data) {
        // Update local state
        setNotifications(prev => {
          const updated = prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
          // Recalculate unread count excluding message notifications
          const unreadCount = updated.filter(n => !n.is_read && !isMessageNotification(n)).length;
          setUnreadNotificationCount(unreadCount);
          return updated;
        });
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
        setNotifications(prev => {
          const updated = prev.map(n => ({ ...n, is_read: true }));
          // Recalculate unread count (should be 0, but exclude messages just in case)
          const unreadCount = updated.filter(n => !n.is_read && !isMessageNotification(n)).length;
          setUnreadNotificationCount(unreadCount);
          return updated;
        });
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
        setNotifications(prev => {
          const updated = prev.filter(n => n.id !== notificationId);
          // Recalculate unread count excluding message notifications
          const unreadCount = updated.filter(n => !n.is_read && !isMessageNotification(n)).length;
          setUnreadNotificationCount(unreadCount);
          return updated;
        });
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
      // Handle 404 gracefully - endpoint might not exist on local dev server
      if (error?.status === 404 || 
          error?.statusCode === 404 ||
          error?.message?.includes('404') ||
          error?.message?.includes('not found') ||
          (error?.message?.includes('Route') && error?.message?.includes('not found'))) {
        // Silently ignore - heartbeat is optional for local dev
        return;
      }
      // Handle 401 errors - token invalidated, need to logout
      if (error?.status === 401 || error?.statusCode === 401) {
        const errorMessage = error?.message || error?.error || '';
        if (errorMessage.toLowerCase().includes('token has been invalidated') ||
            errorMessage.toLowerCase().includes('invalidated') ||
            errorMessage.toLowerCase().includes('please sign in again')) {
          console.warn('⚠️ Heartbeat failed due to token invalidation - clearing auth state');
          await handle401Error(error);
          return;
        }
      }
      // Silently fail for other errors - heartbeat is not critical
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

  // Load non-critical data after app boot (avoid blocking the JS splash/first render)
  useEffect(() => {
    if (!isAuthenticated || !user || !isAppBootCompleted) return;

    const task = InteractionManager.runAfterInteractions(() => {
      // Unread badges (lightweight endpoints)
      getUnreadNotificationCount();
      // Chat unread conversations count
      getConversations({ page: 1, limit: 50 });

      // Cache warming: pre-fetch frequently accessed data (non-blocking)
      setTimeout(() => {
        try {
          if (user.id) {
            getUserCompanies(user.id);
            getUserCertifications(user.id);
            getMyTeamMembers();
          }
        } catch (error) {
          console.warn('Cache warming failed:', error);
        }
      }, 250);
    });

    return () => task.cancel();
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id, isAppBootCompleted]);

  // Manage heartbeat based on authentication state and app state
  useEffect(() => {
    if (!isAuthenticated || !user || !api.chat || !isAppBootCompleted) {
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

  // Track app background time and refresh company data when app comes to foreground
  const appBackgroundTimeRef = useRef<number | null>(null);
  const companyPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || !isAppBootCompleted) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App is coming to foreground
        const now = Date.now();
        const timeInBackground = appBackgroundTimeRef.current 
          ? now - appBackgroundTimeRef.current 
          : 0;
        
        // If app was in background for more than 1 minute, force refresh company data
        // This ensures approval status changes are reflected quickly
        if (timeInBackground > 60000) {
          console.log(`🔄 App returned to foreground after ${Math.round(timeInBackground / 1000)}s - refreshing company data`);
          // Refresh company data in background (non-blocking) with force refresh
          InteractionManager.runAfterInteractions(() => {
            getUserCompanies(user.id, true).catch(err => {
              console.warn('Failed to refresh company data on app foreground:', err);
            });
          });
        }
        
        appBackgroundTimeRef.current = null;
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background - record the time
        appBackgroundTimeRef.current = Date.now();
      }
    };

    // Set initial state
    const currentAppState = AppState.currentState;
    if (currentAppState === 'active') {
      appBackgroundTimeRef.current = null;
    } else {
      appBackgroundTimeRef.current = Date.now();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?.id, isAppBootCompleted]);

  // Poll for pending company approval status changes
  useEffect(() => {
    if (!isAuthenticated || !user || !isAppBootCompleted) {
      if (companyPollingIntervalRef.current) {
        clearInterval(companyPollingIntervalRef.current);
        companyPollingIntervalRef.current = null;
      }
      return;
    }

    // Check if user has any pending companies
    const checkAndRefreshPendingCompanies = async () => {
      try {
        const response = await getUserCompanies(user.id);
        if (response.success && response.data) {
          const companiesList = Array.isArray(response.data)
            ? response.data
            : (response.data as any)?.data || [];
          
          // Check if any companies are pending approval
          const hasPendingCompanies = companiesList.some((company: any) => {
            const approvalStatus = company.approval_status || company.company?.approval_status;
            return approvalStatus === 'pending';
          });

          if (hasPendingCompanies) {
            // Force refresh to get latest approval status
            await getUserCompanies(user.id, true);
            console.log('🔄 Refreshed pending company approval status');
          }
        }
      } catch (error) {
        console.warn('Failed to check pending company status:', error);
      }
    };

    // Poll every 30 seconds if app is in foreground
    const startPolling = () => {
      if (companyPollingIntervalRef.current) {
        clearInterval(companyPollingIntervalRef.current);
      }
      
      // Initial check after 5 seconds
      setTimeout(checkAndRefreshPendingCompanies, 5000);
      
      // Then poll every 30 seconds
      companyPollingIntervalRef.current = setInterval(() => {
        const currentState = AppState.currentState;
        if (currentState === 'active') {
          checkAndRefreshPendingCompanies();
        }
      }, 30000);
    };

    // Handle app state changes for polling
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Resume polling when app comes to foreground
        startPolling();
      } else {
        // Stop polling when app goes to background
        if (companyPollingIntervalRef.current) {
          clearInterval(companyPollingIntervalRef.current);
          companyPollingIntervalRef.current = null;
        }
      }
    };

    // Start polling if app is active
    const currentAppState = AppState.currentState;
    if (currentAppState === 'active') {
      startPolling();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (companyPollingIntervalRef.current) {
        clearInterval(companyPollingIntervalRef.current);
        companyPollingIntervalRef.current = null;
      }
      subscription.remove();
    };
  }, [isAuthenticated, user?.id, isAppBootCompleted]);

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

              // Update unread count if notification is unread and not a message notification
              if (!newNotification.is_read && !isMessageNotification(newNotification)) {
                setUnreadNotificationCount(prev => prev + 1);
              }

              // Check if notification is related to company approval and refresh company data
              const notificationTitle = newNotification.title?.toLowerCase() || '';
              const notificationMessage = newNotification.message?.toLowerCase() || '';
              const isCompanyRelated = 
                notificationTitle.includes('company') || 
                notificationTitle.includes('approval') ||
                notificationMessage.includes('company') ||
                notificationMessage.includes('approval') ||
                newNotification.type === 'company_invitation' ||
                newNotification.type === 'company_invitation_accepted';
              
              if (isCompanyRelated) {
                console.log('🔄 Company-related notification received - refreshing company data');
                // Refresh company data in background (non-blocking)
                setTimeout(() => {
                  getUserCompanies(user.id, true).catch(err => {
                    console.warn('Failed to refresh company data after notification:', err);
                  });
                }, 1000);
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

  // Calculate unread count from StreamChat channels
  const calculateStreamChatUnreadCount = useCallback(async (): Promise<number> => {
    try {
      let client: any;
      try {
        client = streamChatService.getClient();
      } catch {
        if (__DEV__) console.log('💬 [StreamChat] Client not available for unread count calculation');
        return 0;
      }
      const currentUserId = streamChatService.getCurrentUserId();
      if (!client || !currentUserId) {
        if (__DEV__) console.log('💬 [StreamChat] Client not available for unread count calculation');
        return 0;
      }
      const isConnected = streamChatService.isConnected();
      if (!isConnected) {
        if (__DEV__) console.log('💬 [StreamChat] Client not connected, skipping unread count calculation');
        return 0;
      }
      let connectionState: string | undefined;
      try { connectionState = (client as any)?.connectionState; } catch { connectionState = undefined; }
      if (connectionState === 'disconnected' || connectionState === 'offline') {
        if (__DEV__) console.log('💬 [StreamChat] Client connection state is disconnected/offline, skipping unread count');
        return 0;
      }
      
      // Query all channels where current user is a member
      // Watch channels to ensure unreadCount is available
      const filters = {
        members: { $in: [currentUserId] },
        type: 'messaging',
      };

      // Query and watch channels to get accurate unread counts
      const channels = await client.queryChannels(
        filters,
        { last_message_at: -1 }, // Sort by last message
        { 
          watch: true, // Watch channels to get real-time unread counts
          presence: true,
          state: true, // Ensure state is included
        }
      );
      
      // Sum up unread counts from all channels
      let totalUnread = 0;
      const channelDetails: any[] = [];
      
      channels.forEach((channel: any) => {
        // Try multiple ways to get unread count
        // StreamChat stores unread count in channel.state.unreadCount
        // But we should also check channel.state.read for per-user unread
        let unreadCount = 0;
        
        if (channel.state?.unreadCount !== undefined) {
          // Primary method: use channel's unreadCount
          unreadCount = channel.state.unreadCount;
        } else if (channel.state?.read?.[currentUserId]) {
          // Fallback: calculate from read state
          const readState = channel.state.read[currentUserId];
          if (readState.unread_messages !== undefined) {
            unreadCount = readState.unread_messages;
          } else if (readState.last_read && channel.state.messages) {
            // Calculate unread by comparing last_read with messages
            const lastReadTime = new Date(readState.last_read).getTime();
            const unreadMessages = channel.state.messages.filter((msg: any) => {
              const msgTime = new Date(msg.created_at).getTime();
              return msgTime > lastReadTime && msg.user?.id !== currentUserId;
            });
            unreadCount = unreadMessages.length;
          }
        }
        
        totalUnread += unreadCount;
        
        if (unreadCount > 0) {
          channelDetails.push({
            channelId: channel.id,
            unreadCount,
            hasState: !!channel.state,
            hasUnreadCount: channel.state?.unreadCount !== undefined,
            hasRead: !!channel.state?.read?.[currentUserId],
          });
        }
      });

      if (__DEV__) {
        console.log('💬 [StreamChat] Calculated unread count:', {
          totalUnread,
          channelCount: channels.length,
          channelsWithUnread: channelDetails.length,
          channelDetails: channelDetails.slice(0, 5), // Log first 5 for debugging
        });
      }

      return totalUnread;
    } catch (error: any) {
      // CRITICAL: Don't log as error if it's just a connection issue
      // This happens during profile switching and is expected
      const isConnectionError = error?.message?.includes('tokens are not set') ||
                                error?.message?.includes('disconnect was called') ||
                                error?.message?.includes('connectUser wasn\'t called') ||
                                error?.message?.includes('Both secret');
      
      if (isConnectionError) {
        // This is expected during profile switching - don't log as error
        if (__DEV__) {
          console.log('💬 [StreamChat] Unread count calculation skipped - client not connected (expected during profile switch)');
        }
      } else {
        // Log other errors as warnings (not errors)
        if (__DEV__) {
          console.warn('⚠️ [StreamChat] Failed to calculate unread count:', error?.message || error);
        }
      }
      return 0; // Return 0 instead of throwing - this is non-critical
    }
  }, []);

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

  // Real-time StreamChat unread count tracking
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadConversationCount(0);
      return;
    }

    let isMounted = true;
    let client: any = null;

    const updateUnreadCount = async () => {
      try {
        // Try StreamChat first (real-time)
        if (streamChatService.isConnected()) {
          client = streamChatService.getClient();
          const streamChatCount = await calculateStreamChatUnreadCount();
          
          if (isMounted) {
            setUnreadConversationCount(streamChatCount);
            if (__DEV__) {
              console.log('💬 [UnreadCount] Updated from StreamChat:', streamChatCount);
            }
            return;
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('⚠️ [UnreadCount] StreamChat calculation failed, using backend fallback');
        }
      }

      // Fallback to backend if StreamChat not available
      // Try to get count from backend API
      try {
        if (isMounted) {
          // Call getConversations to trigger backend count calculation
          // This will update unreadConversationCount via the existing logic
          await getConversations({ limit: 1 }); // Minimal call just to trigger count
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('⚠️ [UnreadCount] Backend fallback also failed');
        }
      }
    };

    // BEST PRACTICE: Use initial unread counts from connectUser response (per Stream docs)
    // This is faster and more accurate than querying all channels
    const useInitialUnreadCounts = () => {
      if (streamChatService.isConnected()) {
        const initialCounts = streamChatService.getInitialUnreadCounts();
        if (initialCounts.total_unread_count > 0 || initialCounts.total_unread_count === 0) {
          if (isMounted) {
            setUnreadConversationCount(initialCounts.total_unread_count);
            if (__DEV__) {
              console.log('💬 [UnreadCount] Using initial counts from connectUser:', initialCounts);
            }
            return true;
          }
        }
      }
      return false;
    };

    // Try to use initial counts first (faster, per Stream best practices)
    const hasInitialCounts = useInitialUnreadCounts();

    // If no initial counts, calculate manually (fallback)
    let initialTimeout: NodeJS.Timeout | null = null;
    if (!hasInitialCounts) {
      initialTimeout = setTimeout(() => {
        updateUnreadCount();
      }, 1000); // Wait 1 second for StreamChat to be fully connected
    }

    // Set up real-time listeners if StreamChat is connected
    if (streamChatService.isConnected()) {
      client = streamChatService.getClient();
      
      // BEST PRACTICE: Listen to unread count events directly (per Stream docs)
      // This is more efficient than recalculating on every event
      const handleUnreadUpdate = (event: any) => {
        if (isMounted && event.total_unread_count !== undefined) {
          setUnreadConversationCount(event.total_unread_count);
          if (__DEV__) {
            console.log('💬 [UnreadCount] Updated from event:', event.total_unread_count);
          }
        }
      };
      
      const handleMessageNew = () => {
        if (isMounted) {
          updateUnreadCount();
        }
      };

      const handleChannelUpdated = (event: any) => {
        // Channel updated - could be read state change
        if (isMounted) {
          if (__DEV__ && event?.channel?.state?.unreadCount !== undefined) {
            console.log('💬 [UnreadCount] Channel updated, unreadCount:', event.channel.state.unreadCount);
          }
          updateUnreadCount();
        }
      };
      
      // Listen for read state changes specifically
      const handleReadStateChanged = () => {
        // When read state changes, unread count definitely changed
        if (isMounted) {
          if (__DEV__) {
            console.log('💬 [UnreadCount] Read state changed, updating count');
          }
          updateUnreadCount();
        }
      };

      const handleChannelDeleted = () => {
        if (isMounted) {
          updateUnreadCount();
        }
      };

      const handleChannelRead = () => {
        // When a channel is marked as read, update unread count immediately
        if (isMounted) {
          if (__DEV__) {
            console.log('💬 [UnreadCount] Channel marked as read, updating count');
          }
          updateUnreadCount();
        }
      };

      // BEST PRACTICE: Listen to unread count events directly (per Stream docs)
      // These events contain total_unread_count and unread_channels
      const unreadEventListeners = [
        client.on('notification.mark_read', (event: any) => {
          handleUnreadUpdate(event);
          handleChannelRead();
        }),
        client.on('notification.message_new', (event: any) => {
          handleUnreadUpdate(event);
          handleMessageNew();
        }),
        client.on('notification.mark_unread', handleUnreadUpdate),
      ];

      // Also listen to channel-level events (fallback if event doesn't have unread count)
      const channelEventListeners = [
        client.on('message.new', handleMessageNew),
        client.on('channel.updated', handleChannelUpdated),
        client.on('channel.deleted', handleChannelDeleted),
        client.on('notification.read', handleReadStateChanged),
      ];
      
      // Also listen to channel-specific read events
      // Note: StreamChat may fire 'notification.mark_read', 'notification.read', or channel state changes
      // when messages are marked as read

      // Also set up periodic refresh as backup (every 10 seconds for faster updates)
      const refreshInterval = setInterval(() => {
        if (isMounted && streamChatService.isConnected()) {
          updateUnreadCount();
        }
      }, 10000); // Check every 10 seconds

      return () => {
        isMounted = false;
        if (client) {
          // BEST PRACTICE: Unsubscribe from all listeners (per Stream docs)
          // Unsubscribe from unread count event listeners
          unreadEventListeners.forEach(listener => {
            try {
              listener.unsubscribe();
            } catch (error) {
              console.warn('⚠️ [UnreadCount] Error unsubscribing unread listener:', error);
            }
          });
          // Unsubscribe from channel event listeners
          channelEventListeners.forEach(listener => {
            try {
              listener.unsubscribe();
            } catch (error) {
              console.warn('⚠️ [UnreadCount] Error unsubscribing channel listener:', error);
            }
          });
        }
        clearInterval(refreshInterval);
        if (initialTimeout !== null) {
          clearTimeout(initialTimeout);
        }
      };
    }

    return () => {
      isMounted = false;
      if (initialTimeout !== null) {
        clearTimeout(initialTimeout);
      }
    };
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id, calculateStreamChatUnreadCount, getConversations]);

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

  // =====================================================

  // AGENDA METHODS
  // ====================================================


  // Initialize agenda service with access token when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = getAccessToken();
      if (token) {
        agendaService.setAccessToken(token);
      }
    }
  }, [isAuthenticated, user]);

  const getAgendaEvents = async (params?: GetAgendaEventsParams): Promise<AgendaEvent[]> => {
    try {
      return await agendaService.getEvents(params);
    } catch (error: any) {
      console.error('❌ Failed to get agenda events:', error);
      throw error;
    }
  };

  const getAgendaEvent = async (eventId: string): Promise<AgendaEvent> => {
    try {
      return await agendaService.getEvent(eventId);
    } catch (error: any) {
      console.error('❌ Failed to get agenda event:', error);
      throw error;
    }
  };

  const createAgendaEvent = async (eventData: CreateAgendaEventRequest): Promise<AgendaEvent> => {
    try {
      return await agendaService.createEvent(eventData);
    } catch (error: any) {
      console.error('❌ Failed to create agenda event:', error);
      throw error;
    }
  };

  const updateAgendaEvent = async (eventId: string, updates: UpdateAgendaEventRequest): Promise<AgendaEvent> => {
    try {
      return await agendaService.updateEvent(eventId, updates);
    } catch (error: any) {
      console.error('❌ Failed to update agenda event:', error);
      throw error;
    }
  };

  const deleteAgendaEvent = async (eventId: string): Promise<void> => {
    try {
      await agendaService.deleteEvent(eventId);
    } catch (error: any) {
      console.error('❌ Failed to delete agenda event:', error);
      throw error;
    }
  };

  const getEventAttendees = async (eventId: string): Promise<AgendaEventAttendee[]> => {
    try {
      return await agendaService.getEventAttendees(eventId);
    } catch (error: any) {
      console.error('❌ Failed to get event attendees:', error);
      throw error;
    }
  };

  const addEventAttendee = async (eventId: string, userId: string): Promise<AgendaEventAttendee> => {
    try {
      return await agendaService.addEventAttendee(eventId, userId);
    } catch (error: any) {
      console.error('❌ Failed to add event attendee:', error);
      throw error;
    }
  };

  const updateAttendeeStatus = async (eventId: string, attendeeId: string, status: 'accepted' | 'declined'): Promise<AgendaEventAttendee> => {
    try {
      return await agendaService.updateAttendeeStatus(eventId, attendeeId, status);
    } catch (error: any) {
      console.error('❌ Failed to update attendee status:', error);
      throw error;
    }
  };

  const removeEventAttendee = async (eventId: string, attendeeId: string): Promise<void> => {
    try {
      await agendaService.removeEventAttendee(eventId, attendeeId);
    } catch (error: any) {
      console.error('❌ Failed to remove event attendee:', error);
      throw error;
    }
  };

  const getBookingRequests = async (params?: GetBookingRequestsParams): Promise<BookingRequest[]> => {
    try {
      return await agendaService.getBookingRequests(params);
    } catch (error: any) {
      console.error('❌ Failed to get booking requests:', error);
      throw error;
    }
  };

  const getBookingRequest = async (requestId: string): Promise<BookingRequest> => {
    try {
      return await agendaService.getBookingRequest(requestId);
    } catch (error: any) {
      console.error('❌ Failed to get booking request:', error);
      throw error;
    }
  };

  const createBookingRequest = async (requestData: CreateBookingRequestRequest): Promise<BookingRequest> => {
    try {
      return await agendaService.createBookingRequest(requestData);
    } catch (error: any) {
      console.error('❌ Failed to create booking request:', error);
      throw error;
    }
  };

  const respondToBookingRequest = async (requestId: string, response: RespondToBookingRequestRequest): Promise<BookingRequest> => {
    try {
      return await agendaService.respondToBookingRequest(requestId, response);
    } catch (error: any) {
      console.error('❌ Failed to respond to booking request:', error);
      throw error;
    }
  };

  const cancelBookingRequest = async (requestId: string): Promise<void> => {
    try {
      await agendaService.cancelBookingRequest(requestId);
    } catch (error: any) {
      console.error('❌ Failed to cancel booking request:', error);
      throw error;
    }
  };

  const value: ApiContextType = {
    api,
    isAuthenticated,
    user,
    isLoading,
    error,
    isAppBootCompleted,
    setAppBootCompleted: setIsAppBootCompleted,
    // Guest session state
    isGuest,
    guestSessionId,
    // Authentication methods
    login,
    signup,
    googleSignIn,
    appleSignIn,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    verifyEmail,
    verifySignupOtp,
    resendVerificationEmail,
    changePassword,
    // Account deletion methods
    requestAccountDeletion,
    restoreAccount,
    getAccountDeletionStatus,
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
    createCustomRole,
    // User filtering methods
    getUsersByRole,
    getUsersByCategory,
    getUsersByLocation,
    // Personal team management methods
    getMyTeam,
    addToMyTeam,
    removeFromMyTeam,
    getMyTeamMembers,
    // Teams (shared teams list)
    getTeams,
    getTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
    joinTeam,
    leaveTeam,
    addTeamMember,
    getTeamMembers,
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
    getMyOwnerProjects,
    getDeletedProjects,
    getMyProjects,
    getProjectStats,
    restoreProject,
    // Task management methods
    getProjectTasks,
    getProjectById,
    getProjectMembers,
    getProjectMembersWithRoles,
    getProjectRoles,
    checkPendingAssignments,
    createTask,
    updateTask,
    deleteTask,
    assignTaskService,
    unassignTaskService,
    deleteTaskAssignment,
    updateTaskAssignmentStatus,
    updateTaskStatus,
    getTaskById,
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
    quickCreateCompany,
    getCompany,
    updateCompany,
    updateAcademyVisibility,
    uploadCompanyLogo,
    uploadCoursePoster, // v2.16.0
    uploadCertificateImage, // v2.16.0
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
    getPendingCompanyMembers,
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
    socialLinksRefreshTrigger,
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
    registerUserForCourse,
    unregisterUserFromCourse,
    unregisterUserForCourse,
    getCourseRegistrations,
    getMyRegisteredCourses,
    completeCourseRegistration,
    completeCourse,
    // News/Blog methods (v2.4.0)
    getPublishedNews,
    getNewsPostBySlug,
    getNewsCategories,
    getNewsTags,
    // News Admin methods (admin only)
    getAdminNewsPosts,
    getAdminNewsPostById,
    createNewsPost,
    updateNewsPost,
    deleteNewsPost,
    publishNewsPost,
    unpublishNewsPost,
    uploadNewsPhoto,
    uploadNewsThumbnail,
    // News like methods
    likeNewsPost,
    unlikeNewsPost,
    // Chat/Messaging methods (v2.5.0)
    getConversations,
    getConversationById,
    createConversation,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    readMessage,
    markMessageAsRead,
    markAllAsRead,
    leaveConversation,
    muteConversation,
    sendTypingIndicator,
    // StreamChat token
    getStreamChatToken,
    // Message reactions
    addReaction,
    removeReaction,
    getReactions,
    // Message threading
    createThreadReply,
    getThreadReplies,
    // Message pinning
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    // Message search
    searchMessages,
    searchInConversation,
    // Channel management
    updateChannel,
    addMember,
    removeMember,
    getMembers,
    // Channel moderation
    addModerator,
    removeModerator,
    banUser,
    unbanUser,
    muteUser,
    unmuteUser,
    flagMessage,
    getFlaggedMessages,
    // Message translation
    translateMessage,
    // Online status methods
    getOnlineStatus,
    getOnlineStatuses,
    // Agenda methods (v2.9.0)
    getAgendaEvents,
    getAgendaEvent,
    createAgendaEvent,
    updateAgendaEvent,
    deleteAgendaEvent,
    getEventAttendees,
    addEventAttendee,
    updateAttendeeStatus,
    removeEventAttendee,
    getBookingRequests,
    getBookingRequest,
    createBookingRequest,
    respondToBookingRequest,
    cancelBookingRequest,
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

