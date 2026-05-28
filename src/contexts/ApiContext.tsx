import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { InteractionManager } from 'react-native';
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
import streamChatService from '../services/StreamChatService';
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
import { useProfileMethods } from '../hooks/useProfileMethods';
import { useNotificationMethods } from '../hooks/useNotificationMethods';
import { useAuthMethods } from '../hooks/useAuthMethods';
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

  // Forward-reference refs for cross-hook deps (populated after the relevant hook resolves)
  const _fetchCompleteUserProfileRef = useRef<(userId: string, userData?: any) => Promise<any>>(async () => null);
  const _getStreamChatTokenRef = useRef<(options?: { profile_type?: 'user' | 'company'; company_id?: string }) => Promise<any>>(async () => ({ success: false, data: null }));
  const _forceUnsubscribeNotificationsRef = useRef<() => void>(() => {});

  // Auth methods + getAccessToken (extracted)
  const {
    getAccessToken,
    handle401Error,
    testConnectivity,
    registerPushToken,
    initializeApi,
    login,
    signup,
    googleSignIn,
    appleSignIn,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    verifySignupOtp,
    verifyEmail,
    resendVerificationEmail,
    changePassword,
    requestAccountDeletion,
    restoreAccount,
    getAccountDeletionStatus,
  } = useAuthMethods({
    api,
    user,
    error,
    baseUrl,
    setUser,
    setIsAuthenticated,
    setIsLoading,
    setError,
    setCurrentProfileType,
    setActiveCompany,
    setNotifications,
    setUnreadNotificationCount,
    setUnreadConversationCount,
    isHandling401Ref,
    last401ErrorRef,
    recentLoginRef,
    stopHeartbeatRef,
    fetchCompleteUserProfileRef: _fetchCompleteUserProfileRef,
    getStreamChatTokenRef: _getStreamChatTokenRef,
    forceUnsubscribeNotificationsRef: _forceUnsubscribeNotificationsRef,
  });

  // Initialize API client (via useAuthMethods)
  useEffect(() => {
    initializeApi();
  }, [api]);

  // Profile data methods (extracted) — placed here so getAccessToken is in scope
  const {
    updateProfile,
    updateSkills,
    getProfileCompleteness,
    fetchCompleteUserProfile,
    getUsersDirect,
    debugAuthState,
    clearError,
    getProfileRequirements,
    validateProfileData,
  } = useProfileMethods({ api, user, setUser, getAccessToken, setIsLoading, setError, isAuthenticated });

  // Update forward-reference ref so auth methods (login, etc.) can call fetchCompleteUserProfile
  _fetchCompleteUserProfileRef.current = fetchCompleteUserProfile;

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

  // Update ref so useUserFilters fallback can call getUsersDirect
  _getUsersDirectRef.current = getUsersDirect;

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

  // Update forward-reference ref so auth methods (runPostAuthSetup) can call getStreamChatToken
  _getStreamChatTokenRef.current = getStreamChatToken;

  // Notification methods (extracted)
  const {
    applyNotificationCenterSnapshot,
    fetchNotificationsFromApi,
    refreshNotificationBadge,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useNotificationMethods({ api, notifications, setNotifications, setUnreadNotificationCount });

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

  // Update forward-reference ref so handle401Error / logout can call forceUnsubscribeNotifications
  _forceUnsubscribeNotificationsRef.current = forceUnsubscribeNotifications;

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

