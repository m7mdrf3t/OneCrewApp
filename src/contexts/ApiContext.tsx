import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus, Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import pushNotificationService from '../services/PushNotificationService';
import streamChatService from '../services/StreamChatService';
import {
  registerPushToken as _registerPushToken,
  initPushTokenWithRetry,
} from '../services/pushNotificationUtils';
import { initializeGoogleSignIn, signInWithGoogle } from '../services/GoogleAuthService';
import { initializeAppleAuthentication, signInWithApple } from '../services/AppleAuthService';
import {
  buildLoginAuthError,
  clearAllAuthData as _clearAllAuthData,
  clearOAuthPendingState,
  clearOAuthPendingStateOnError,
  clearPasswordResetFlag,
  createCategoryRequiredError,
  extractAuthPayload,
  isCategoryRequiredError,
  parseAuthErrorResponse,
  parseAuthResponseJson,
  persistAuthSession,
  readOAuthPendingState,
} from '../services/authUtils';
import agendaService from '../services/AgendaService';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useUnreadConversationCount } from '../hooks/useUnreadConversationCount';
import { useCompanySync } from '../hooks/useCompanySync';
import { useNotificationSubscription } from '../hooks/useNotificationSubscription';
import { useProfileSwitch } from '../hooks/useProfileSwitch';
import { useCompanyMethods } from '../hooks/useCompanyMethods';
import { useCertificationMethods } from '../hooks/useCertificationMethods';
import { useNewsMethods } from '../hooks/useNewsMethods';
import { useProjectMethods } from '../hooks/useProjectMethods';
import { useChatMethods } from '../hooks/useChatMethods';
import { useReferenceData } from '../hooks/useReferenceData';
import { useUserFilters } from '../hooks/useUserFilters';
import { useTeamMethods } from '../hooks/useTeamMethods';
import { useSkillMethods } from '../hooks/useSkillMethods';
import { usePortfolioMethods } from '../hooks/usePortfolioMethods';
import { useGuestSession } from '../hooks/useGuestSession';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAgendaMethods } from '../hooks/useAgendaMethods';
import {
  countUnreadInAppNotifications,
  filterInAppNotifications,
  normalizeNotification,
  parseNotificationsFromResponse,
  shouldShowInNotificationCenter,
} from '../utils/inAppNotifications';
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
  getUserByIdDirect: (userId: string) => Promise<any>;
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
  getCompanies: (params?: { limit?: number; page?: number; /** Alias for `q` */ search?: string; /** onecrew-api-client uses `q` */ q?: string; category?: string; location?: string; subcategory?: string; approval_status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'; fields?: string[]; sort?: string; order?: 'asc' | 'desc' }) => Promise<any>;
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
  getUnreadConversationCount: () => Promise<number>;
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

// Resolve the API base URL from the environment variable baked in at build time.
// Set EXPO_PUBLIC_API_URL in .env (local dev) or in eas.json env per build profile.
// In production builds, a missing value throws immediately so misconfigured builds
// fail loudly rather than silently hitting the wrong backend.
const _envApiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!_envApiUrl) {
  if (__DEV__) {
    console.warn('\u26a0\ufe0f EXPO_PUBLIC_API_URL is not set. Add it to .env for local development.');
  } else {
    throw new Error('EXPO_PUBLIC_API_URL is required. Set it in eas.json env for each build profile.');
  }
}
const DEFAULT_API_URL = _envApiUrl ?? 'https://onecrew-backend-staging-309236356616.us-central1.run.app';

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  baseUrl = DEFAULT_API_URL,
}) => {
  const [api] = useState(() => {
    const apiClient = new OneCrewApi(baseUrl);
    
    // Override the base URL if it's using localhost
    if ((apiClient as any).baseUrl && (apiClient as any).baseUrl.includes('localhost:3000')) {
      (apiClient as any).baseUrl = baseUrl;
    }
    
    // Verify new methods are available
    if (typeof apiClient.getPendingCompanyMembers !== 'function') {
      console.warn('   getPendingCompanyMembers method not found on API instance. Package may need update or cache clear.');
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
  // Chat unread count state
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  // Social links refresh trigger (increments when social links are updated)
  const [socialLinksRefreshTrigger, setSocialLinksRefreshTrigger] = useState(0);
  // Escape-hatch ref so handle401Error / logout can stop the heartbeat before the hook unmounts
  const stopHeartbeatRef = useRef<() => void>(() => {});

  // Flag to prevent duplicate 401 handling
  const isHandling401Ref = useRef(false);
  const last401ErrorRef = useRef<number>(0);
  // Flag to track recent login to prevent immediate 401 handling after password reset + login
  const recentLoginRef = useRef<number>(0);
  const RECENT_LOGIN_WINDOW = 30000; // 30 seconds - don't handle 401s if user just logged in (increased for password reset scenarios)

  /**
   * Clear all authentication data from all possible storage locations.
   * Delegates to the shared authUtils helper, binding the current api instance.
   */
  const clearAllAuthData = () => _clearAllAuthData(api);

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

    // Check if this is a token invalidation error.
    // NOTE: Plain "unauthorized" is intentionally excluded — a generic 401 usually means the
    // token expired after long inactivity, not that it was explicitly revoked by the server.
    // Only signing out on explicit invalidation messages prevents unwanted logouts when the
    // app hasn't been opened for a while.
    if (error?.status === 401 || error?.statusCode === 401) {
      const isTokenInvalidated =
        errorMessage.toLowerCase().includes('token has been invalidated') ||
        errorMessage.toLowerCase().includes('invalidated') ||
        errorMessage.toLowerCase().includes('please sign in again') ||
        errorMessage.toLowerCase().includes('invalid token') ||
        errorMessage.toLowerCase().includes('token is invalid');

      if (isTokenInvalidated) {
        isHandling401Ref.current = true;
        last401ErrorRef.current = now;
        
        try {
          // Stop heartbeat
          stopHeartbeatRef.current();

          // Clear all auth data
          await clearAllAuthData();

          // Clear local state
          setIsAuthenticated(false);
          setUser(null);
          setNotifications([]);
          setUnreadNotificationCount(0);
          setUnreadConversationCount(0);

          // Unsubscribe from real-time notifications
          forceUnsubscribeNotifications();

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

  // Delegate wrapper: keeps ApiContext callers unchanged while impl lives in pushNotificationUtils
  const registerPushToken = (token: string) => _registerPushToken(api, token);

  // Initialize API client
  useEffect(() => {
    const initializeApi = async () => {
      // Test connectivity (non-blocking - if it fails, we'll still try to initialize)
      await testConnectivity();
      
      try {
        await api.initialize();
        console.log('    API client initialized successfully');
        
        // Verify chat service is available
        if (api.chat) {
          console.log('    Chat service is available');
          console.log('    Chat service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(api.chat)).filter(m => m !== 'constructor'));
        } else {
          console.warn('   Chat service is not available after initialization');
          console.warn('   API object keys:', Object.keys(api));
        }
        
        // Clear any previous connectivity errors since initialization succeeded
        if (error && error.includes('Cannot connect to server')) {
          setError(null);
        }
        
        // Initialize ReferenceDataService with the API
        ReferenceDataService.setApi(api);
        
        // Auth provider setup is not needed for first paint, so initialize it in the background
        InteractionManager.runAfterInteractions(() => {
          Promise.resolve()
            .then(async () => {
              await initializeGoogleSignIn();
              await initializeAppleAuthentication();
            })
            .catch((err) => {
              console.warn('⚠️ Failed to initialize social auth providers:', err);
            });
        });
        
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
                console.warn('   Failed to re-register token after refresh:', error);
              });
            }
          });
          
          // Register push token for already-authenticated user (retry: FCM often not ready until ~2s after app start)
          initPushTokenWithRetry(
            (token) => registerPushToken(token),
            () => api.auth.isAuthenticated(),
            4, 2_500, 2_500
          );
          
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

  const runPostAuthSetup = (userData: any, logRecentLogin: boolean = false) => {
    // Mark recent login FIRST to prevent immediate 401 handling (before setIsAuthenticated triggers API calls)
    recentLoginRef.current = Date.now();
    if (logRecentLogin) {
      console.log('    Recent login timestamp set - 401 handling will be skipped for', RECENT_LOGIN_WINDOW, 'ms');
    }

    // Update user state
    setUser(userData);
    setIsAuthenticated(true);

    // Set up token refresh callback for automatic re-registration
    pushNotificationService.setOnTokenRefreshCallback((newToken) => {
      if (api.auth.isAuthenticated()) {
        registerPushToken(newToken).catch((error) => {
          console.warn('   Failed to re-register token after refresh:', error);
        });
      }
    });

    // Register for push notifications after successful login (retry: FCM often not ready for ~2s)
    initPushTokenWithRetry(
      (token) => registerPushToken(token),
      () => api.auth.isAuthenticated(),
      4, 2_500, 500
    );

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

    // Initialize StreamChat (fire-and-forget; does not block the auth flow)
    ;(async () => {
      try {
        const streamTokenResponse = await getStreamChatToken({ profile_type: 'user' });
        if (streamTokenResponse.success && streamTokenResponse.data) {
          const { token: streamToken, user_id, api_key } = streamTokenResponse.data as any;
          await streamChatService.connectUser(
            user_id,
            streamToken,
            { name: userData.name, image: userData.image_url },
            api_key,
            'user'
          );
          console.log('    StreamChat initialized after sign-in');
        } else {
          console.error('  StreamChat token response failed:', streamTokenResponse);
        }
      } catch (streamError) {
        console.error('  Failed to initialize StreamChat:', streamError);
        // Non-critical — auth proceeds regardless
      }
    })();
  };

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
        throw buildLoginAuthError(response.status, responseText, response.statusText);
      }

      // Parse response as JSON
      const authResponse = parseAuthResponseJson(responseText);
      
      const { userData, token } = extractAuthPayload(authResponse);
      
      if (!userData) {
        console.error(' No user data found in login response');
        throw new Error('Login response missing user data');
      }
      
      if (!token) {
        console.error(' No token found in login response');
        throw new Error('Login response missing authentication token');
      }
      
      await clearAllAuthData();
      await clearPasswordResetFlag();
      await persistAuthSession(api as any, token, userData);
      console.log('    API client headers updated with new token');
      
      runPostAuthSetup(userData, true);
      
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
          console.error('  API client also failed:', apiErr);
          
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
          console.warn('   Library threw SecureStore error, but signup likely succeeded');
          
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
        console.error('   SecureStore error during signup - something tried to save data (this shouldn\'t happen)');
        console.error('   The library\'s signup() method should NOT save anything - token only comes after OTP verification');
        
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
      const { storedCategory, storedRole } = await readOAuthPendingState();
      
      // Use stored values if available, otherwise fall back to function parameters
      const finalCategory = storedCategory || category;
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
        const { errorMessage } = parseAuthErrorResponse(
          responseText,
          `HTTP ${response.status}: ${response.statusText}`
        );
        
        // Check if error is about missing category
        if (isCategoryRequiredError(errorMessage)) {
          throw createCategoryRequiredError();
        }
        
        throw new Error(errorMessage);
      }

      // Parse response
      const authResponse = parseAuthResponseJson(responseText);
      
      await clearOAuthPendingState();
      const { userData, token } = extractAuthPayload(authResponse);
      
      if (!userData) {
        throw new Error('Google Sign-In response missing user data');
      }
      
      if (!token) {
        throw new Error('Google Sign-In response missing authentication token');
      }
      
      await clearAllAuthData();
      await clearPasswordResetFlag();
      await persistAuthSession(api as any, token, userData);

      runPostAuthSetup(userData);
      
      return {
        user: userData,
        token: token,
      } as AuthResponse;
      
    } catch (err: any) {
      console.error('  Google Sign-In failed:', err);
      
      await clearOAuthPendingStateOnError(err);
      
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
      console.log('    Requesting Apple Sign-In via Supabase OAuth...');
      const accessToken = await signInWithApple();
      console.log('    Supabase access token received');
      
      // Step 2: Retrieve category and role from AsyncStorage (stored before OAuth)
      const { storedCategory, storedRole } = await readOAuthPendingState();
      console.log('📋 Retrieved from AsyncStorage:', {
        category: storedCategory || 'not found',
        role: storedRole || 'not found',
      });
      
      // Use stored values if available, otherwise fall back to function parameters
      const finalCategory = storedCategory || category;
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
            console.error('  API client returned unsuccessful response:', {
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
            console.error('  Missing user data or token in response');
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
          const { errorMessage } = parseAuthErrorResponse(
            responseText,
            `HTTP ${response.status}: ${response.statusText}`
          );
          
          // Check if error is about missing category
          if (isCategoryRequiredError(errorMessage)) {
            throw createCategoryRequiredError();
          }
          
          throw new Error(errorMessage);
        }

        // Parse response
        authResponse = parseAuthResponseJson(responseText);
        
        const extractedPayload = extractAuthPayload(authResponse);
        userData = extractedPayload.userData;
        token = extractedPayload.token;
      }
      
      if (!userData) {
        throw new Error('Apple Sign-In response missing user data');
      }
      
      if (!token) {
        throw new Error('Apple Sign-In response missing authentication token');
      }
      
      await clearOAuthPendingState();
      await clearAllAuthData();
      await clearPasswordResetFlag();
      await persistAuthSession(api as any, token, userData);

      runPostAuthSetup(userData);
      
      return {
        user: userData,
        token: token,
      } as AuthResponse;
      
    } catch (err: any) {
      console.error('  Apple Sign-In failed:', err);
      
      await clearOAuthPendingStateOnError(err);
      
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
        console.log('    StreamChat disconnected');
      } catch (streamError) {
        console.warn('   Failed to disconnect StreamChat (non-critical):', streamError);
      }
      
      // Unsubscribe from real-time notifications
      forceUnsubscribeNotifications();
      
      // Unregister push notification token from backend before clearing
      try {
        const currentToken = await pushNotificationService.getStoredToken();
        if (currentToken) {
          console.log('    Unregistering push token from backend...');
          await api.pushNotifications.unregisterDeviceToken(currentToken);
          console.log('    Push token unregistered from backend');
        }
      } catch (tokenError) {
        console.warn('   Failed to unregister push token (non-critical):', tokenError);
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
          console.log('   Logout API call failed due to invalid token (expected) - continuing with cleanup');
        } else {
          console.warn('   Logout API call failed (non-critical):', logoutError);
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
        console.error('  Error clearing auth data during logout:', clearError);
      }
      
      // Clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      setNotifications([]);
      setUnreadNotificationCount(0);
      
      // Unsubscribe from real-time notifications on error
      forceUnsubscribeNotifications();
      
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
        console.error(' ', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const response = await api.auth.requestPasswordReset(email);
      console.log('📧 API Response:', response);
      console.log('    Password reset OTP sent successfully');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to send reset email. Please try again.';
      console.error('  Password reset request failed:', err);
      console.error('  Error details:', {
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
        console.error(' ', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // The method exists in the API client source code, but may not be enumerable
      // Try multiple ways to call it
      let result;
      const authService = api.auth as any;
      
      // Method 1: Try calling directly (even if typeof says undefined, it might work)
      try {
        console.log('    Attempting to call authService.verifyResetOtp() directly');
        result = await authService.verifyResetOtp(email.trim().toLowerCase(), otpCode);
        console.log('    API client method call successful');
      } catch (directCallError: any) {
        console.log('   Direct call failed, trying via prototype:', directCallError.message);
        
        // Method 2: Try calling via prototype
        try {
          const prototype = Object.getPrototypeOf(authService);
          if (prototype && typeof prototype.verifyResetOtp === 'function') {
            console.log('    Calling via prototype');
            result = await prototype.verifyResetOtp.call(authService, email.trim().toLowerCase(), otpCode);
            console.log('    Prototype call successful');
          } else {
            throw new Error('Method not found on prototype');
          }
        } catch (prototypeError: any) {
          console.log('   Prototype call failed, using apiClient.post:', prototypeError.message);
          
          // Method 3: Use apiClient.post directly (this should work)
          const apiClient = authService?.apiClient || (api as any).apiClient;
          if (apiClient && typeof apiClient.post === 'function') {
            console.log('    Using apiClient.post directly');
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
              console.error('  apiClient.post failed:', apiClientError);
              
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
      console.log('    OTP verified successfully, reset token obtained');
      
      // Ensure result has resetToken
      if (!result || !result.resetToken) {
        throw new Error('Invalid response: resetToken not found');
      }
      
      return result; // Returns { resetToken: "..." }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Invalid or expired OTP code. Please try again.';
      console.error('  OTP verification failed:', err);
      console.error('  Error details:', {
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
      console.log('    Confirming password reset with reset token');
      
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
      console.log('    Password reset successfully:', responseData);
      
      // Password reset invalidates all sessions - clear auth state completely
      console.log('🧹 Clearing auth state after password reset...');
      
      // Stop heartbeat and background processes first
      stopHeartbeatRef.current();
      
      // Clear local auth state first
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear notifications and subscriptions
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadConversationCount(0);
      
      // Unsubscribe from real-time notifications
      forceUnsubscribeNotifications();
      
      // Clear push notification token
      await pushNotificationService.clearToken().catch(() => {});
      await pushNotificationService.setBadgeCount(0).catch(() => {});
      
      // Clear ALL authentication data from all storage locations
      await clearAllAuthData();
      
      // Set password reset flag to prevent token restoration on next app start
      try {
        await AsyncStorage.setItem('passwordResetFlag', 'true');
        console.log('    Password reset flag set - tokens will not be restored on next app start');
      } catch (err) {
        console.warn('   Failed to set password reset flag:', err);
      }
      
      // Try logout API call (may fail since token is invalidated, that's OK)
      try {
        await api.auth.logout().catch(() => {
          console.log('   Logout API call failed (expected - token already invalidated)');
        });
      } catch (err) {
        console.log('   Error during logout API call (non-critical):', err);
      }
      
      console.log('    Auth state cleared - user must sign in with new password');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to reset password';
      const statusCode = err.status || err.response?.status || err.statusCode;
      
      console.error('  Password reset confirmation failed:', err);
      console.error('  Error details:', {
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
        console.error(' ', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Try multiple ways to call verifySignupOtp (similar to verifyResetOtp)
      let authResponse: any;
      const authService = api.auth as any;
      
      // Method 1: Try calling directly
      try {
        if (typeof authService.verifySignupOtp === 'function') {
          console.log('    Attempting to call authService.verifySignupOtp() directly');
          authResponse = await authService.verifySignupOtp(email.trim().toLowerCase(), token);
          console.log('    API client method call successful');
        } else {
          throw new Error('Method not available directly');
        }
      } catch (directCallError: any) {
        console.log('   Direct call failed, trying via prototype:', directCallError.message);
        
        // Method 2: Try calling via prototype
        try {
          const prototype = Object.getPrototypeOf(authService);
          if (prototype && typeof prototype.verifySignupOtp === 'function') {
            console.log('    Calling via prototype');
            authResponse = await prototype.verifySignupOtp.call(authService, email.trim().toLowerCase(), token);
            console.log('    Prototype call successful');
          } else {
            throw new Error('Method not found on prototype');
          }
        } catch (prototypeError: any) {
          console.log('   Prototype call failed, using apiClient.post:', prototypeError.message);
          
          // Method 3: Use apiClient.post directly
          const apiClient = authService?.apiClient || (api as any).apiClient;
          if (apiClient && typeof apiClient.post === 'function') {
            console.log('    Using apiClient.post directly for verify-signup-otp');
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
              console.error('  apiClient.post failed:', apiClientError);
              
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
      
      console.log('    Signup OTP verified successfully:', authResponse);
      
      // IMPORTANT: Save the token and user data to SecureStore
      // This is the ONLY place where we save auth data - NOT during signup, ONLY after OTP verification
      if (authResponse.token || authResponse.access_token) {
        const token = authResponse.token || authResponse.access_token;
        const userData = authResponse.user;
        
        if (token && userData) {
          console.log('    Storing access token and user data after OTP verification');
          
          // Clear any existing tokens before storing new ones
          await clearAllAuthData();
          
          // Use the AuthService's setAuthData method to properly store the token
          if (typeof authService.setAuthData === 'function') {
            console.log('    Using AuthService.setAuthData to store token...');
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
            console.log('    API client headers updated with new token');
          }
          
          console.log('    Token has been saved to SecureStore');
        }
      }
      
      // Set user and authenticate after successful verification
      if (authResponse.user) {
        setUser(authResponse.user);
        setIsAuthenticated(true);
        console.log('    User authenticated after OTP verification - token is now saved');
        return authResponse;
      } else {
        throw new Error('User data not found in response');
      }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Invalid or expired OTP code. Please try again.';
      console.error('  Signup OTP verification failed:', err);
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
        console.log('    Account deletion requested successfully');
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
      console.error('  Account deletion request failed:', err);
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
        console.log('    Account restored successfully');
      } else {
        throw new Error('Failed to restore account');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore account';
      console.error('  Account restoration failed:', err);
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
        console.log('    Account deletion status retrieved');
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
      console.error('  Failed to get account deletion status:', err);
      // Don't set global error for read operations - let the component handle errors
      throw err;
    }
  }, [api]);

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
        console.log('    Token from AuthService.getAuthToken():', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      }
      
      // Fallback: Check API client's stored token
      if (!accessToken && (api as any).apiClient && (api as any).apiClient.defaultHeaders) {
        const authHeader = (api as any).apiClient.defaultHeaders['Authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          accessToken = authHeader.substring(7);
          console.log('    Token from API client headers:', accessToken.substring(0, 20) + '...');
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
        console.log('    Token from auth service properties:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      }
      
      if (!accessToken) {
        console.error('  No access token found in any location');
        throw new Error('Access token not found. Please log in again.');
      }
      
      console.log('    Access token found:', accessToken.substring(0, 20) + '...');
      return accessToken;
    } catch (tokenError) {
      console.error('  Failed to get access token:', tokenError);
      throw new Error('Access token required. Please log in again.');
    }
  };

  // Ref used to break forward reference: useUserFilters needs getUsersDirect
  // which is defined inline further below. Updated after getUsersDirect is defined.
  const _getUsersDirectRef = useRef<(...args: any[]) => Promise<any>>(async () => ({ success: true, data: [] }));

  // Reference data + roles/categories (extracted)
  const {
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
  } = useReferenceData({ api });

  // User filters (extracted) — getUsersDirect ref is updated after it's defined
  const {
    getUsersByRole,
    getUsersByCategory,
    getUsersByLocation,
  } = useUserFilters({ api, getUsersDirect: (...args: any[]) => _getUsersDirectRef.current(...args) });

  // Team management (extracted)
  const {
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
  } = useTeamMethods({ api });

  // Skill management (extracted)
  const {
    getAvailableSkillsNew,
    getUserSkills,
    getUserSkillsNew,
    addUserSkillNew,
    removeUserSkillNew,
  } = useSkillMethods({ api, user, setUser });

  // Fetch complete user profile data
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

  // Update ref so useUserFilters fallback can call getUsersDirect
  _getUsersDirectRef.current = getUsersDirect;

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

  // Portfolio, social links, profile pictures, file upload (extracted)
  const {
    getAvailableSkinTones,
    getAvailableHairColors,
    getAvailableAbilities,
    getAvailableLanguages,
    healthCheck,
    getUserPortfolio,
    addPortfolioItem,
    updatePortfolioItem,
    removePortfolioItem,
    getUserSocialLinks,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    getUserProfilePictures,
    uploadProfilePicture,
    setMainProfilePicture,
    deleteProfilePicture,
    uploadFile,
  } = usePortfolioMethods({ api, user, getAccessToken, setSocialLinksRefreshTrigger });

  // Guest session methods (extracted)
  const {
    createGuestSession,
    browseUsersAsGuest,
    convertGuestToUser,
    getGuestSessionId,
  } = useGuestSession({
    api,
    guestSessionId,
    setGuestSessionId,
    setIsGuest,
    setIsAuthenticated,
    setUser,
  });

  // Online status (extracted)
  const {
    getOnlineStatus,
    getOnlineStatuses,
  } = useOnlineStatus({ baseUrl, getAccessToken });

  // Agenda + booking (extracted)
  const {
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
  } = useAgendaMethods({ isAuthenticated, user, getAccessToken });

  // Project + task management methods (extracted)
  const {
    createProject,
    updateProject,
    getProjects,
    getMyProjects,
    getAllProjects,
    getMyOwnerProjects,
    getDeletedProjects,
    getProjectTasks,
    getProjectById,
    getProjectStats,
    restoreProject,
    getProjectMembers,
    getProjectMembersWithRoles,
    getProjectRoles,
    checkPendingAssignments,
    createTask,
    updateTask,
    deleteTask,
    assignTaskService,
    deleteTaskAssignment,
    updateTaskAssignmentStatus,
    updateTaskStatus,
    unassignTaskService,
    getTaskById,
    getTaskAssignments,
  } = useProjectMethods({ api, user, getAccessToken });

  // Chat + conversation methods (extracted)
  const {
    getUnreadConversationCount,
    getConversations,
    getConversationById,
    createConversation,
    getUserByIdDirect,
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
    getStreamChatToken,
    addReaction,
    removeReaction,
    getReactions,
    createThreadReply,
    getThreadReplies,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    searchMessages,
    searchInConversation,
    updateChannel,
    addMember,
    removeMember,
    getMembers,
    addModerator,
    removeModerator,
    banUser,
    unbanUser,
    muteUser,
    unmuteUser,
    flagMessage,
    getFlaggedMessages,
    translateMessage,
  } = useChatMethods({
    api,
    user,
    activeCompany,
    currentProfileType,
    getAccessToken,
    setUnreadConversationCount,
  });

  const NOTIFICATION_FETCH_LIMIT = 100;

  /** Parse API payload, keep in-app rows only, sync list + badge from the same data. */
  const applyNotificationCenterSnapshot = useCallback(
    (parsed: Notification[], options?: { updateList?: boolean; updateBadge?: boolean }) => {
      const inApp = filterInAppNotifications(parsed);
      const unreadInApp = inApp.filter((n) => !n.is_read);

      if (options?.updateList !== false) {
        setNotifications(inApp);
      }
      if (options?.updateBadge !== false) {
        setUnreadNotificationCount(unreadInApp.length);
      }

      if (__DEV__) {
        console.log('🔔 [Notifications] Snapshot applied:', {
          fetched: parsed.length,
          inApp: inApp.length,
          unreadInApp: unreadInApp.length,
          updateList: options?.updateList !== false,
          updateBadge: options?.updateBadge !== false,
        });
      }

      return { inApp, unreadCount: unreadInApp.length };
    },
    []
  );

  const fetchNotificationsFromApi = useCallback(
    async (params?: NotificationParams) => {
      const response = await api.getNotifications({
        limit: NOTIFICATION_FETCH_LIMIT,
        page: 1,
        ...params,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      return parseNotificationsFromResponse(response.data);
    },
    [api]
  );

  /** Badge only (boot) — does not overwrite the modal list until it is opened. */
  const refreshNotificationBadge = useCallback(async (): Promise<number> => {
    try {
      const parsed = await fetchNotificationsFromApi({ unread_only: true });
      const { unreadCount } = applyNotificationCenterSnapshot(parsed, {
        updateList: false,
        updateBadge: true,
      });
      return unreadCount;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || '';
      const isNetworkError =
        errorMessage.includes('Network error') ||
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('fetch failed') ||
        (error?.name === 'TypeError' && errorMessage.includes('Network'));

      if (isNetworkError) {
        console.warn('   Failed to refresh notification badge (network issue):', errorMessage);
        return 0;
      }

      console.error('Failed to refresh notification badge:', error);
      await handle401Error(error);
      return 0;
    }
  }, [api, applyNotificationCenterSnapshot, fetchNotificationsFromApi]);

  // Notification methods
  const getNotifications = async (params?: NotificationParams) => {
    try {
      const parsed = await fetchNotificationsFromApi(params);
      const { inApp } = applyNotificationCenterSnapshot(parsed, {
        updateList: true,
        // Unread tab: badge from this fetch. All tab: badge from dedicated unread fetch below.
        updateBadge: params?.unread_only === true,
      });

      if (!params?.unread_only) {
        await refreshNotificationBadge();
      }

      return inApp;
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      await handle401Error(error);
      throw error;
    }
  };

  const getUnreadNotificationCount = async (): Promise<number> => refreshNotificationBadge();

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response.success && response.data) {
        // Update local state
        setNotifications((prev) => {
          const updated = prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          );
          setUnreadNotificationCount(countUnreadInAppNotifications(updated));
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
          setUnreadNotificationCount(0);
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
        setNotifications((prev) => {
          const updated = prev.filter((n) => n.id !== notificationId);
          setUnreadNotificationCount(countUnreadInAppNotifications(updated));
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
        console.warn('   Chat service not available for heartbeat');
        return;
      }
      await api.chat.sendHeartbeat();
      console.log('    Heartbeat sent');
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
          console.warn('   Heartbeat failed due to token invalidation - clearing auth state');
          await handle401Error(error);
          return;
        }
      }
      // Silently fail for other errors - heartbeat is not critical
      console.warn('   Heartbeat failed (non-critical):', error.message || error);
    }
  };

  // Wire useHeartbeat — stop is forwarded through stopHeartbeatRef so handle401Error / logout
  // can call it before the hook's own cleanup runs.
  const { stop: _stopHeartbeat } = useHeartbeat({
    enabled: isAuthenticated && !!user && !!api.chat && isAppBootCompleted,
    onBeat: sendHeartbeat,
  });
  stopHeartbeatRef.current = _stopHeartbeat;

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
  // (handled by useHeartbeat hook — wired just above sendHeartbeat)

  // Company data sync: foreground refresh + pending-approval polling
  // (handled by useCompanySync hook)

  // Ref used to break circular dep: useCompanyMethods (needs switchToUserProfile)
  // ↔ useProfileSwitch (needs getUserCompanies from useCompanyMethods).
  // The ref is updated immediately after useProfileSwitch resolves, so any
  // user-triggered call to leaveCompany will always see the real function.
  const _switchToUserProfileRef = useRef<() => Promise<void>>(async () => {});

  const {
    getCompanyTypes,
    getCompanyType,
    getCompanyTypeServices,
    createCompany,
    quickCreateCompany,
    getCompany,
    updateCompany,
    updateAcademyVisibility,
    uploadCompanyLogo,
    uploadCoursePoster,
    uploadCertificateImage,
    getUserCompanies,
    submitCompanyForApproval,
    getCompanies,
    getAvailableServicesForCompany,
    getCompanyServices,
    addCompanyService,
    removeCompanyService,
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
    getCompanyDocuments,
    addCompanyDocument,
    deleteCompanyDocument,
  } = useCompanyMethods({
    api,
    user,
    activeCompany,
    currentProfileType,
    isAuthenticated,
    setActiveCompany,
    getAccessToken,
    handle401Error,
    switchToUserProfile: () => _switchToUserProfileRef.current(),
  });

  const {
    getCertificationTemplates,
    getCertificationTemplate,
    createCertificationTemplate,
    updateCertificationTemplate,
    deleteCertificationTemplate,
    authorizeAcademyForCertification,
    revokeAcademyAuthorization,
    bulkAuthorizeAcademies,
    getAcademyAuthorizations,
    getAuthorizedCertifications,
    grantCertification,
    getCompanyCertifications,
    updateCertification,
    revokeCertification,
    getUserCertifications,
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
  } = useCertificationMethods({ api, user, activeCompany, isAuthenticated });

  const {
    getPublishedNews,
    getNewsPostBySlug,
    getNewsCategories,
    getNewsTags,
    getAdminNewsPosts,
    getAdminNewsPostById,
    createNewsPost,
    updateNewsPost,
    deleteNewsPost,
    publishNewsPost,
    unpublishNewsPost,
    uploadNewsPhoto,
    uploadNewsThumbnail,
    likeNewsPost,
    unlikeNewsPost,
  } = useNewsMethods({ api, getAccessToken });

  useCompanySync({
    enabled: isAuthenticated && !!user && isAppBootCompleted,
    userId: user?.id,
    getUserCompanies,
  });

  // Setup real-time subscription for notifications
  // (handled by useNotificationSubscription hook)
  const { forceUnsubscribe: forceUnsubscribeNotifications } = useNotificationSubscription({
    isAuthenticated,
    userId: user?.id,
    setNotifications,
    setUnreadNotificationCount,
    refreshNotificationBadge,
    getUserCompanies,
  });

  const { switchToUserProfile, switchToCompanyProfile } = useProfileSwitch({
    user,
    activeCompany,
    currentProfileType,
    setActiveCompany,
    setCurrentProfileType,
    setUnreadConversationCount,
    getStreamChatToken,
    getUnreadConversationCount,
    getCompany,
    getUserCompanies,
  });

  // Keep the ref current so leaveCompany always delegates to the real implementation
  _switchToUserProfileRef.current = switchToUserProfile;

  // Calculate unread count from StreamChat channels
  // FIXED: Now filters channels based on current profile type (user vs company)
  const calculateStreamChatUnreadCount = useCallback(async (): Promise<number> => {
    try {
      let client: any;
      try {
        client = streamChatService.getClient();
      } catch {
        if (__DEV__) console.log('    [StreamChat] Client not available for unread count calculation');
        return 0;
      }
      const currentUserId = streamChatService.getCurrentUserId();
      if (!client || !currentUserId) {
        if (__DEV__) console.log('    [StreamChat] Client not available for unread count calculation');
        return 0;
      }
      const isConnected = streamChatService.isConnected();
      if (!isConnected) {
        if (__DEV__) console.log('    [StreamChat] Client not connected, skipping unread count calculation');
        return 0;
      }
      let connectionState: string | undefined;
      try { connectionState = (client as any)?.connectionState; } catch { connectionState = undefined; }
      if (connectionState === 'disconnected' || connectionState === 'offline') {
        if (__DEV__) console.log('    [StreamChat] Client connection state is disconnected/offline, skipping unread count');
        return 0;
      }
      
      // FIXED: Get current profile info to filter channels correctly
      const currentProfileId = currentProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      const currentProfileTypeForFilter = currentProfileType;
      
      if (!currentProfileId) {
        if (__DEV__) console.log('    [StreamChat] No current profile ID, skipping unread count calculation');
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
      
      const parseCount = (value: any): number => {
        const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
        return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      };

      // Primary fallback: sum unread message counts from currently watched channels.
      const unreadFromChannels = (channels || []).reduce((sum: number, channel: any) => {
        return sum + parseCount(channel?.state?.unreadCount);
      }, 0);
      if (unreadFromChannels > 0) {
        return unreadFromChannels;
      }

      // Secondary fallback: Stream aggregate unread count for the connected profile user.
      const unreadFromUser = parseCount((client as any)?.user?.total_unread_count);
      if (unreadFromUser > 0) {
        return unreadFromUser;
      }

      // Final fallback: snapshot from connectUser response.
      const initialUnread = streamChatService.getInitialUnreadCounts();
      return parseCount(initialUnread?.total_unread_count);
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
          console.log('    [StreamChat] Unread count calculation skipped - client not connected (expected during profile switch)');
        }
      } else {
        // Log other errors as warnings (not errors)
        if (__DEV__) {
          console.warn('   [StreamChat] Failed to calculate unread count:', error?.message || error);
        }
      }
      return 0; // Return 0 instead of throwing - this is non-critical
    }
  }, []);

  // Real-time StreamChat unread count tracking
  // (handled by useUnreadConversationCount hook)
  useUnreadConversationCount({
    isAuthenticated,
    userId: user?.id,
    currentProfileType,
    activeCompanyId: activeCompany?.id,
    getUnreadConversationCount,
    calculateStreamChatUnreadCount,
    getConversations,
    setUnreadConversationCount,
  });

  // =====================================================

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
    getUserByIdDirect,
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
    getUnreadConversationCount,
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

