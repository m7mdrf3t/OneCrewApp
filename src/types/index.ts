// Type definitions for One Crew app
// Keep app-level types aligned with the canonical API client types.
import type { User as ApiUser } from 'onecrew-api-client';

export type User = ApiUser;

export interface NavigationState {
  name: string;
  data?: any;
}

export interface TabBarProps {
  active: string;
  onChange: (tab: string) => void;
  onProfilePress?: () => void;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilter?: () => void;
  onClose?: () => void;
}

export interface SectionCardProps {
  section: {
    key: string;
    title: string;
    items: Array<{ label: string; users?: number }>;
    userCount?: number;
  };
  onClick: () => void;
}

export interface ServiceCardProps {
  item: {
    label: string;
    users?: number;
  };
  onSelect: () => void;
}

export interface ProfileCardProps {
  profile: any;
  onSelect: () => void;
  onAddToTeam?: () => void;
  onAssignToProject?: () => void;
  onStartChat?: () => void;
  myTeam?: any[];
}

export interface ProjectCardProps {
  project: any;
  onSelect: () => void;
}

export interface HomePageProps {
  onServiceSelect: (serviceData: any, sectionKey: string) => void;
  onOpenFilter: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleTheme: () => void;
  theme: string;
  onNavigate: (pageName: string, data?: any) => void;
  user: User | null;
  onOpenMainMenu: () => void;
}

export interface ProjectsPageProps {
  onProjectSelect?: (project: any) => void;
  onAddNewProject?: () => void;
  onAddNewProjectEasy?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBack?: () => void;
  myTeam?: any[];
  onProfileSelect?: (profile: any) => void;
  onNavigateToProjectDetail?: (project: any) => void;
  onRefresh?: () => void;
  onNavigateToSignup?: () => void;
  onNavigateToLogin?: () => void;
  onProjectCreated?: (project: any) => void;
}

export interface ProfileDetailPageProps {
  profile: any;
  onBack: () => void;
  onAssignToProject: (profile: any) => void;
  onAddToTeam?: (profile: any) => void;
  myTeam?: any[];
  onStartChat?: (profile: any) => void;
  onMediaSelect?: (media: any) => void;
  isCurrentUser?: boolean;
}

// Task Management Types (from onecrew-api-client v2.1.0)
export interface Task {
  id: string;
  project_id: string;
  title: string;
  service?: string;
  timeline_text?: string;
  status: TaskStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'on_hold' | 'in_progress' | 'completed' | 'cancelled';
export type ProjectStatus = 'planning' | 'in_production' | 'completed' | 'on_hold' | 'cancelled';
export type TaskAssignmentStatus = 'pending' | 'accepted' | 'rejected';

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string | null;
  company_id: string | null;
  service_role: string;
  assigned_at: string;
  assigned_by: string;
  status?: TaskAssignmentStatus; // New field for pending/accept/reject workflow
  deleted_at?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image_url?: string;
    primary_role?: string;
  };
  company?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  assignment_type?: 'user' | 'company';
}

export interface TaskWithAssignments extends Task {
  assignments: TaskAssignment[];
  assigned_users: Array<{
    user_id: string;
    service_role: string;
    user: { name: string; image_url?: string };
  }>;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'admin' | 'supervisor' | 'member';
  added_at: string;
  added_by: string;
  last_activity?: string;
  users?: {
    name: string;
    image_url?: string;
    primary_role?: string;
  };
}

export interface ProjectWithDetails {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  delivery_date?: string;
  one_day_shoot: boolean;
  status: 'planning' | 'in_production' | 'completed' | 'on_hold' | 'cancelled';
  progress: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  tasks: TaskWithAssignments[];
  created_by_user?: {
    name: string;
    image_url?: string;
  };
}

// Guest Session Types
export interface GuestSessionData {
  sessionId: string;
  expiresAt: string;
  isActive: boolean;
}

export interface ConvertGuestToUserRequest {
  sessionId: string;
  userData: {
    name: string;
    email: string;
    password: string;
    category: 'crew' | 'talent' | 'company';
    primary_role?: string;
  };
}

export interface GoogleAuthRequest {
  accessToken: string; // Supabase access token (changed from idToken)
  category?: 'crew' | 'talent' | 'company';
  primary_role?: string;
}

// Task Management Props
export interface ProjectDetailPageProps {
  project: ProjectWithDetails;
  onBack: () => void;
  onCreateTask: (taskData: CreateTaskRequest) => Promise<void>;
  onUpdateTask: (taskId: string, updates: UpdateTaskRequest) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAssignTask: (projectId: string, taskId: string, assignment: AssignTaskServiceRequest) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: UpdateTaskStatusRequest) => Promise<void>;
}

export interface TaskCardProps {
  task: TaskWithAssignments;
  onEdit: (task: TaskWithAssignments) => void;
  onDelete: (taskId: string) => void;
  onAssign: (task: TaskWithAssignments) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  canEdit: boolean;
}

export interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: CreateTaskRequest) => Promise<void>;
  projectMembers: ProjectMember[];
  editingTask?: TaskWithAssignments;
  projectId: string;
}

export interface CreateTaskRequest {
  title: string;
  service?: string;
  timeline_text?: string;
  status?: TaskStatus;
  sort_order?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  service?: string;
  timeline_text?: string;
  status?: TaskStatus;
  sort_order?: number;
  start_date?: string;
  due_date?: string;
  end_date?: string;
}

export interface AssignTaskServiceRequest {
  user_id?: string;
  company_id?: string;
  service_role: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

// Project Creation Types
export interface ProjectStage {
  id: string;
  name: string;
  description: string;
  order: number;
  startDate?: string;
  endDate?: string;
  isSelected: boolean;
}

export interface ProjectType {
  id: string;
  name: string;
  description: string;
}

export interface ProjectCreationData {
  title: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  budget?: number;
  status: ProjectStatus;
  stages: ProjectStage[];
  coverImageUrl?: string;
}

// UI-specific TaskAssignment extends API TaskAssignment with additional fields
export interface UITaskAssignment extends TaskAssignment {
  // Additional UI-specific fields
  userId?: string;
  userName?: string;
  userRole?: string;
  stageId?: string;
  stageName?: string;
  taskTitle?: string;
  inTime?: string;
  outTime?: string;
  location?: string;
  description?: string;
  // Keep `status` aligned with the underlying TaskAssignment status type
  status?: TaskAssignmentStatus;
  // If the UI needs to track the parent task's status (e.g., on_hold), use this field instead
  taskStatus?: TaskStatus;
  attendees?: string[];
  createdAt?: string;
}

export interface ProjectDashboardData {
  project: ProjectCreationData;
  assignments: UITaskAssignment[];
  stages: ProjectStage[];
  messages: any[];
  legalServices: any[];
}

// Modal Props
export interface ProjectCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectCreationData) => Promise<void>;
}

export interface TaskAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  stage: ProjectStage;
  onAssign: (assignment: TaskAssignment) => Promise<void>;
}

export interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: any) => void;
  preFilterRole?: string;
  preFilterService?: string;
}

export interface TaskDetailsFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<UITaskAssignment>) => Promise<void>;
  assignedUser?: any;
  stage: ProjectStage;
}

export interface ProjectDashboardProps {
  project: ProjectDashboardData;
  onUpdateProject: (data: ProjectDashboardData) => void;
  onBack: () => void;
}

// Portfolio and Social Media Types
export interface UserPortfolio {
  id: string;
  user_id: string;
  kind: 'image' | 'video';
  url: string;
  caption?: string;
  sort_order: number;
  created_at: string;
}

export interface SocialMediaLink {
  platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other';
  url: string;
  username?: string;
}

// Backend UserSocialLink interface (matches backend structure)
export interface UserSocialLink {
  id: string;
  user_id: string;
  platform: string;
  url: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  image_url?: string;
  coverImages?: string[]; // Multiple cover images for profile hero section
  cover_images?: string[]; // Alternative field name for backward compatibility
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  location?: string;
  portfolio: UserPortfolio[];
  social_links: SocialMediaLink[];
  skills: string[];
  abilities: string[];
  languages: string[];
  created_at: string;
  updated_at: string;
}

export interface UserProfilePicture {
  id: string;
  user_id: string;
  url: string;
  is_main: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemProps {
  item: UserPortfolio;
  onEdit: (item: UserPortfolio) => void;
  onDelete: (itemId: string) => void;
  canEdit: boolean;
}

export interface PortfolioModalProps {
  visible: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<UserPortfolio, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onEditItem: (itemId: string, updates: Partial<UserPortfolio>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  portfolio: UserPortfolio[];
}

export interface SocialLinksModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (links: SocialMediaLink[]) => Promise<void>;
  socialLinks: SocialMediaLink[];
}

// Company Profile Types (from onecrew-api-client v2.1.0)
export type CompanySubcategory = 'production_house' | 'agency' | 'academy' | 'studio' | 'casting_agency' | 'management_company' | 'other';
export type CompanyApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type CompanyDocumentType = 'business_license' | 'registration_certificate' | 'tax_id' | 'accreditation' | 'contract' | 'other';
export type CompanyMemberRole = 'owner' | 'admin' | 'manager' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface Company {
  id: string;
  name: string;
  subcategory: CompanySubcategory;
  description?: string;
  bio?: string;
  logo_url?: string;
  website_url?: string;
  location_text?: string;
  email?: string;
  phone?: string;
  establishment_date?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  // v2.16.0: Structured location fields
  address?: string;
  city?: string;
  country?: string;
  // v2.16.0: Social media links
  social_media_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  default_course_design?: 'vertical' | 'horizontal' | 'large'; // v2.16.0: Default course design for academy
  visibility?: 'private' | 'published'; // Only for academies - controls who can see the academy
  approval_status: CompanyApprovalStatus;
  approval_reason?: string;
  approved_at?: string;
  approved_by?: string;
  documents_submitted_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  owner?: any; // User type
  members_count?: number;
  documents_count?: number;
  services_count?: number;
  services?: CompanyService[];
  company_type_info?: CompanyTypeReference;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: CompanyDocumentType;
  file_url: string;
  file_name?: string;
  file_size?: number;
  description?: string;
  uploaded_by: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  deleted_at?: string;
}

export interface CompanyMember {
  company_id: string;
  user_id: string;
  role: CompanyMemberRole;
  invited_by?: string;
  invitation_status: InvitationStatus;
  invited_at: string;
  accepted_at?: string;
  rejected_at?: string;
  joined_at: string;
  created_at: string;
  deleted_at?: string;
  user?: any; // User type
  company?: Company;
}

export interface AvailableCompanyService {
  id: string;
  name: string;
  description?: string;
  category?: string;
  applicable_types: CompanySubcategory[];
  icon_name?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CompanyService {
  company_id: string;
  service_id: string;
  created_at: string;
  deleted_at?: string;
  service?: AvailableCompanyService;
}

export interface CompanyTypeReference {
  code: CompanySubcategory;
  name: string;
  description: string;
  required_documents: CompanyDocumentType[];
  icon_name?: string;
  display_order: number;
}

export interface CreateCompanyRequest {
  name: string;
  subcategory: CompanySubcategory;
  description?: string;
  bio?: string;
  website_url?: string;
  location_text?: string;
  email?: string;
  phone?: string;
  establishment_date?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
}

// Notification Types (from onecrew-api-client)
export type NotificationType = 
  | 'company_invitation'
  | 'company_invitation_accepted'
  | 'company_invitation_rejected'
  | 'team_member_added'
  | 'team_member_removed'
  | 'user_liked'
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_completed'
  | 'project_created'
  | 'project_member_added'
  | 'project_member_removed'
  | 'certification_issued'
  | 'certification_expiring'
  | 'certification_expired'
  | 'message_received'
  | 'other';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface NotificationParams {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

// Certification Types (from onecrew-api-client)
export interface CertificationTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  default_expiration_days?: number;
  icon_name?: string;
  display_order: number;
  active: boolean;
  created_by_company_id?: string; // v2.8.0: Company that created this template
  is_system_template?: boolean; // v2.8.0: Whether this is a system template
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UserCertification {
  id: string;
  user_id: string;
  company_id: string;
  certification_template_id: string;
  certificate_url?: string;
  certificate_image_url?: string; // v2.16.0: Custom certificate image/template upload
  issued_at: string;
  issued_by: string;
  expiration_date?: string;
  verified: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user?: any;
  company?: Company;
  certification_template?: CertificationTemplate;
  issued_by_user?: any;
}

export interface AcademyCertificationAuthorization {
  company_id: string;
  certification_template_id: string;
  authorized_by: string;
  authorized_at: string;
  created_at: string;
  deleted_at?: string;
  company?: Company;
  certification_template?: CertificationTemplate;
  authorized_by_user?: any;
}

export interface CreateCertificationTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  default_expiration_days?: number;
  icon_name?: string;
  display_order?: number;
  active?: boolean;
}

export interface UpdateCertificationTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  default_expiration_days?: number;
  icon_name?: string;
  display_order?: number;
  active?: boolean;
}

export interface CreateCertificationRequest {
  user_id: string;
  certification_template_id: string;
  certificate_url?: string;
  certificate_image_url?: string; // v2.16.0: Custom certificate image/template upload
  expiration_date?: string;
  notes?: string;
}

export interface UpdateCertificationRequest {
  certificate_url?: string;
  certificate_image_url?: string; // v2.16.0: Custom certificate image/template upload
  expiration_date?: string;
  notes?: string;
  verified?: boolean;
}

export interface BulkAuthorizationRequest {
  company_ids: string[];
  certification_template_ids: string[];
}

// Course Management Types (from onecrew-api-client v2.4.0)
export type CourseStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export interface Course {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  price: number;
  total_seats: number;
  available_seats: number;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  category?: string;
  status: CourseStatus;
  primary_lecturer_id?: string;
  number_of_sessions?: number;
  design?: 'vertical' | 'horizontal' | 'large'; // v2.16.0: Course card design layout
  certification_template_id?: string; // v2.8.0: Certification template for this course
  auto_grant_certification?: boolean; // v2.8.0: Auto-grant certification on course completion
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  company?: Company;
  primary_lecturer?: User;
  certification_template?: CertificationTemplate; // v2.8.0: Certification template relation
}

export interface CourseWithDetails extends Course {
  instructors?: User[];
  registration_count?: number;
  is_registered?: boolean;
}

export interface CourseRegistration {
  id: string;
  course_id: string;
  user_id: string;
  registered_at: string;
  status: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  course?: Course;
  user?: User;
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  price?: number;
  total_seats: number;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  category?: string;
  status?: CourseStatus;
  instructor_ids?: string[];
  primary_lecturer_id?: string;
  number_of_sessions?: number;
  design?: 'vertical' | 'horizontal' | 'large'; // v2.16.0: Course card design layout
  // v2.8.0: Certification template (required)
  certification_template: {
    name: string;
    description?: string;
    category?: string;
    default_expiration_days?: number;
    icon_name?: string;
  };
  // v2.8.0: Auto-grant certification on course completion
  auto_grant_certification?: boolean;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  price?: number;
  total_seats?: number;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  category?: string;
  status?: CourseStatus;
  instructor_ids?: string[];
  primary_lecturer_id?: string | null; // v2.16.0: Can be set to null to remove
  number_of_sessions?: number | null; // v2.16.0: Can be set to null to remove
  design?: 'vertical' | 'horizontal' | 'large' | null; // v2.16.0: Course card design layout, can be null
}

// Course UI Component Props
export interface CourseCardProps {
  course: CourseWithDetails;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  showActions?: boolean;
}

export interface CourseManagementPageProps {
  companyId: string;
  onBack: () => void;
  onCourseSelect?: (course: CourseWithDetails) => void;
  readOnly?: boolean; // When true, renders in read-only mode without edit/create/delete actions
}

export interface CourseEditPageProps {
  courseId: string;
  companyId: string;
  onBack: () => void;
  onCourseUpdated?: () => void;
}

export interface CourseDetailPageProps {
  courseId: string;
  companyId?: string;
  onBack: () => void;
  onRegister?: () => void;
  onUnregister?: () => void;
  onNavigate?: (page: string, data?: any) => void;
}

export interface PublicCoursesPageProps {
  onBack: () => void;
  onCourseSelect: (course: CourseWithDetails) => void;
  filters?: {
    category?: string;
    company_id?: string;
  };
}

export interface CourseCreationModalProps {
  visible: boolean;
  companyId: string;
  onClose: () => void;
  onSubmit: (courseData: CreateCourseRequest) => Promise<void>;
}

// Chat/Messaging Types (from onecrew-api-client v2.5.0)
export type ChatConversationType = 'user_user' | 'user_company' | 'company_company';
export type ChatParticipantType = 'user' | 'company';
export type ChatSenderType = 'user' | 'company';
export type ChatMessageType = 'text' | 'image' | 'file' | 'system';

export interface ChatConversation {
  id: string;
  conversation_type: ChatConversationType;
  name?: string;
  last_message_at?: string;
  last_message_preview?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  participants?: ChatParticipant[];
  messages?: ChatMessage[];
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  participant_type: ChatParticipantType;
  participant_id: string;
  joined_at: string;
  left_at?: string;
  last_read_at?: string;
  muted_until?: string;
  created_at: string;
  deleted_at?: string;
  user?: any; // User type
  company?: Company;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: ChatSenderType;
  sender_id: string;
  sent_by_user_id?: string;
  content?: string;
  message_type: ChatMessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_message_id?: string;
  sent_at: string;
  edited_at?: string;
  deleted_at?: string;
  sender_user?: any; // User type
  sender_company?: Company;
  sent_by_user?: any; // User type
  reply_to_message?: ChatMessage;
  reads?: ChatMessageRead[];
}

export interface ChatMessageRead {
  id: string;
  message_id: string;
  participant_type: ChatParticipantType;
  participant_id: string;
  read_at: string;
}

export interface CreateConversationRequest {
  conversation_type: ChatConversationType;
  participant_ids: string[];
  name?: string;
}

export interface SendChatMessageRequest {
  content?: string;
  message_type?: ChatMessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_message_id?: string;
}

// Chat UI Component Props
export interface ConversationsListPageProps {
  onBack?: () => void;
  onConversationSelect?: (conversation: ChatConversation) => void;
}

export interface ChatPageProps {
  conversationId?: string;
  participant?: any; // User or Company for new conversations
  onBack: () => void;
  courseData?: CourseWithDetails; // Course data for auto-sending registration message
}

// StreamChat-related types
export interface StreamChatTokenResponse {
  token: string;
  user_id: string;
  api_key?: string; // Optional: API key from backend (if provided)
}

export interface MessageReaction {
  type: string;
  user_id: string;
  created_at: string;
}

export interface ThreadReply extends ChatMessage {
  parent_id: string;
}

export interface MessageSearchParams {
  query: string;
  conversation_id?: string;
  sender_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  id: string;
  conversation_id: string;
  content?: string;
  sender_id: string;
  sender_type: 'user' | 'company';
  sent_at: string;
  conversation?: {
    id: string;
    name?: string;
  };
}

export interface BanUserRequest {
  user_id: string;
  reason?: string;
  timeout?: number;
}

export interface MuteUserRequest {
  user_id: string;
  timeout?: number;
}

export interface UpdateChannelRequest {
  name?: string;
  image?: string;
  description?: string;
}
